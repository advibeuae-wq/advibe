import { isAuthenticated, assertSafeOrigin } from "../lib/session.mjs";
import { getFile, commitFiles } from "../lib/github.mjs";
import {
  slugify,
  renderBody,
  renderPostPage,
  applyIndexInsert,
  applySitemapInsert,
  deriveDek,
  wordCount,
  todayParts,
  SITE_ORIGIN,
} from "../lib/render.mjs";

// Not collected in the Phase 1 editor UI (see EDITOR UI spec) — every post
// gets this category pill for now. Add a category field later if needed.
const DEFAULT_CATEGORY = "Blog";

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }
  if (!assertSafeOrigin(req)) {
    res.status(403).json({ ok: false, error: "Invalid origin." });
    return;
  }

  const body = readJsonBody(req);
  const title = String(body.title || "").trim();
  const bodyRaw = String(body.body || "");
  const mode = body.mode === "edit" ? "edit" : "create";
  const imageUrl = String(body.imageUrl || "").trim();
  const description = String(body.description || "").trim();

  if (!title) {
    res.status(400).json({ ok: false, error: "Title is required." });
    return;
  }
  if (!bodyRaw.trim()) {
    res.status(400).json({ ok: false, error: "Body is required." });
    return;
  }

  const slug = slugify(body.slug || title);
  if (!slug) {
    res.status(400).json({ ok: false, error: "Could not derive a valid URL slug — set one explicitly." });
    return;
  }

  const postPath = `site/blog/${slug}.html`;

  try {
    const existing = await getFile(postPath);

    if (mode === "create" && existing) {
      res.status(409).json({
        ok: false,
        error: `site/blog/${slug}.html already exists — pick a different slug, or open it for editing instead.`,
      });
      return;
    }
    if (mode === "edit" && !existing) {
      res.status(404).json({ ok: false, error: `No existing post at site/blog/${slug}.html to edit.` });
      return;
    }

    const bodyHtml = renderBody(bodyRaw);
    const dek = description || deriveDek(bodyHtml);
    const readTime = `${Math.max(1, Math.round(wordCount(bodyHtml) / 200))} min read`;
    const { iso: dateISO, label: dateLabel } = todayParts();
    const category = DEFAULT_CATEGORY;

    const postHtml = renderPostPage({
      title,
      description: dek,
      category,
      dateISO,
      dateLabel,
      readTime,
      dek,
      bodyHtml,
      slug,
      image: imageUrl || undefined,
    });

    const indexFile = await getFile("site/blog/index.html");
    const sitemapFile = await getFile("site/sitemap.xml");
    if (!indexFile || !sitemapFile) {
      throw new Error("Could not read site/blog/index.html or site/sitemap.xml from the repo.");
    }

    const updatedIndex = applyIndexInsert(
      indexFile.content,
      { title, dek, category, dateISO, dateLabel, readTime, slug },
      { mode }
    );
    const updatedSitemap = applySitemapInsert(sitemapFile.content, { slug, dateISO }, { mode });

    const { commitSha, commitUrl } = await commitFiles({
      files: [
        { path: postPath, content: postHtml },
        { path: "site/blog/index.html", content: updatedIndex },
        { path: "site/sitemap.xml", content: updatedSitemap },
      ],
      message: `${mode === "edit" ? "Edit" : "Add"} blog post: ${slug}`,
    });

    res.status(200).json({
      ok: true,
      mode,
      slug,
      commitSha,
      commitUrl,
      liveUrl: `${SITE_ORIGIN}/blog/${slug}.html`,
    });
  } catch (err) {
    const message = String((err && err.message) || err);
    if (message.startsWith("CONCURRENT_UPDATE")) {
      res.status(409).json({ ok: false, error: "The repository changed while publishing — please retry." });
      return;
    }
    res.status(500).json({ ok: false, error: message });
  }
}
