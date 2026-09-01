#!/usr/bin/env node
/**
 * Advibe Agency — local blog dashboard.
 *
 * Dev-machine-only publishing tool: run it, fill in the form, it writes a
 * new static page into site/blog/, adds it to site/blog/index.html's post
 * timeline, and adds it to site/sitemap.xml. Nothing here talks to the
 * internet or the live site — you still `git add && git commit && git push`
 * yourself, which is what the existing FTP-deploy GitHub Action ships live.
 *
 * The rendering logic (template, mini-markdown, index/sitemap surgery) now
 * lives in cms/lib/render.mjs, shared with the remote CMS in cms/ — see
 * README.md for that workflow. This script is just the local, no-auth,
 * create-only front end for the same functions.
 *
 * Run:  node scripts/blog-admin/server.mjs
 * Then open the URL it prints (defaults to http://localhost:4321).
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  slugify,
  escapeHtml,
  renderBody,
  renderPostPage,
  applyIndexInsert,
  applySitemapInsert,
  wordCount,
  todayParts,
} from "../../cms/lib/render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BLOG_DIR = path.join(ROOT, "site/blog");
const INDEX_FILE = path.join(BLOG_DIR, "index.html");
const SITEMAP_FILE = path.join(ROOT, "site/sitemap.xml");
const PORT = process.env.PORT ? Number(process.env.PORT) : 4321;

// ---------- site/blog/index.html + site/sitemap.xml, on local disk ----------
// Thin fs wrappers around the shared, pure applyIndexInsert/applySitemapInsert
// — this tool only ever creates new posts, so mode is always "create".

function insertIntoIndex(entry) {
  const html = fs.readFileSync(INDEX_FILE, "utf-8");
  const updated = applyIndexInsert(html, entry, { mode: "create" });
  fs.writeFileSync(INDEX_FILE, updated);
}

function insertIntoSitemap(entry) {
  const xml = fs.readFileSync(SITEMAP_FILE, "utf-8");
  const updated = applySitemapInsert(xml, entry, { mode: "create" });
  fs.writeFileSync(SITEMAP_FILE, updated);
}

// ---------- HTTP server ----------

const FORM_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Advibe Blog — New Post</title>
<style>
  :root {
    --bg: #0A0A0A; --bg-elevated: #141414; --border: rgba(255,255,255,.08);
    --text: #F2EFEA; --text-muted: #A8A29A; --gold-400: #DDAE5C; --gold-300: #F0CE84;
  }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font: 16px/1.6 -apple-system, "Nunito Sans", sans-serif; margin: 0; padding: 48px 24px 96px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  h1 { font-family: "Montserrat", sans-serif; font-size: 28px; margin-bottom: 4px; }
  .sub { color: var(--text-muted); margin-bottom: 32px; font-size: 14px; }
  label { display: block; font-weight: 700; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); margin: 24px 0 8px; }
  input, textarea { width: 100%; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 12px 14px; font: inherit; }
  textarea { min-height: 260px; font-family: "JetBrains Mono", monospace; font-size: 14px; resize: vertical; }
  .hint { color: var(--text-muted); font-size: 13px; margin-top: 6px; }
  button { margin-top: 32px; background: linear-gradient(90deg, #B0813A, var(--gold-300)); border: none; color: #201200; font-weight: 700; padding: 14px 28px; border-radius: 999px; font-size: 15px; cursor: pointer; }
  button:hover { filter: brightness(1.05); }
  .row { display: flex; gap: 16px; }
  .row > div { flex: 1; }
  .error { background: rgba(232,153,140,.12); border: 1px solid #E8998C; color: #E8998C; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>New blog post</h1>
    <p class="sub">Writes a static page into site/blog/, adds it to the post timeline and sitemap.xml. Nothing goes live until you git add / commit / push.</p>
    __ERROR__
    <form method="POST" action="/publish">
      <label for="title">Title</label>
      <input id="title" name="title" required placeholder="Why we're starting a blog">

      <label for="slug">URL slug (optional — derived from title if left blank)</label>
      <input id="slug" name="slug" placeholder="why-were-starting-a-blog">

      <div class="row">
        <div>
          <label for="category">Category</label>
          <input id="category" name="category" required placeholder="Studio Notes">
        </div>
        <div>
          <label for="readTime">Read time (optional — auto-estimated)</label>
          <input id="readTime" name="readTime" placeholder="3 min read">
        </div>
      </div>

      <label for="dek">Dek (one-line summary, shown on the index and in search results)</label>
      <input id="dek" name="dek" required maxlength="200" placeholder="A short note on why this exists.">

      <label for="body">Body</label>
      <textarea id="body" name="body" required placeholder="Paste Markdown from ChatGPT/AI directly, or write plain paragraphs separated by a blank line.

## A heading

### A sub-heading

- A bullet
- Another bullet

&gt; A pull-quote / blockquote.

**Bold**, *italic*, and [a link](https://example.com) all work inline."></textarea>
      <p class="hint">Blank line = new paragraph. "# " or "## " becomes a heading, "### " a sub-heading, "&gt; " a blockquote, "- " or "* " a bullet list. Inline: **bold**, *italic*, [text](url).</p>

      <button type="submit">Generate post</button>
    </form>
  </div>
</body>
</html>`;

function renderForm(error) {
  return FORM_PAGE.replace(
    "__ERROR__",
    error ? `<p class="error">${escapeHtml(error)}</p>` : ""
  );
}

function renderSuccess({ slug, files }) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>Post published</title>
<style>
  body { background:#0A0A0A; color:#F2EFEA; font:16px/1.6 -apple-system,sans-serif; max-width:640px; margin:64px auto; padding:0 24px; }
  h1 { color:#DDAE5C; } code { background:#141414; padding:2px 6px; border-radius:4px; }
  ol { padding-left: 20px; } a { color:#DDAE5C; }
</style></head>
<body>
  <h1>Post written ✓</h1>
  <p>Files changed:</p>
  <ol>${files.map((f) => `<li><code>${escapeHtml(f)}</code></li>`).join("")}</ol>
  <p>Preview it locally, then ship it the same way as any other change:</p>
  <ol>
    <li><code>git add site/blog site/sitemap.xml</code></li>
    <li><code>git commit -m "Add blog post: ${escapeHtml(slug)}"</code></li>
    <li><code>git push</code></li>
  </ol>
  <p>The existing GitHub Action FTPs <code>site/</code> live on push to <code>main</code>.</p>
  <p><a href="/">← Write another post</a></p>
</body>
</html>`;
}

function parseFormBody(body) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderForm());
    return;
  }

  if (req.method === "POST" && req.url === "/publish") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        const fields = parseFormBody(raw);
        const title = (fields.title || "").trim();
        const category = (fields.category || "").trim();
        const dek = (fields.dek || "").trim();
        const bodyRaw = fields.body || "";
        if (!title || !category || !dek || !bodyRaw.trim()) {
          throw new Error("Title, category, dek, and body are all required.");
        }

        const slug = slugify(fields.slug || title);
        if (!slug) throw new Error("Couldn't derive a URL slug from that title — set one explicitly.");

        const destPath = path.join(BLOG_DIR, `${slug}.html`);
        if (fs.existsSync(destPath)) {
          throw new Error(`site/blog/${slug}.html already exists — pick a different slug.`);
        }

        const { iso: dateISO, label: dateLabel } = todayParts();
        const bodyHtml = renderBody(bodyRaw);
        const readTime = (fields.readTime || "").trim() || `${Math.max(1, Math.round(wordCount(bodyHtml) / 200))} min read`;

        const page = renderPostPage({
          title, description: dek, category, dateISO, dateLabel, readTime, dek, bodyHtml, slug,
        });

        fs.writeFileSync(destPath, page);
        insertIntoIndex({ title, dek, category, dateISO, dateLabel, readTime, slug });
        insertIntoSitemap({ slug, dateISO });

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          renderSuccess({
            slug,
            files: [`site/blog/${slug}.html`, "site/blog/index.html", "site/sitemap.xml"],
          })
        );
      } catch (err) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderForm(err.message));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Advibe blog dashboard running at http://localhost:${PORT}`);
  console.log("Local only — Ctrl+C to stop. Nothing here touches the live site until you git push.");
});
