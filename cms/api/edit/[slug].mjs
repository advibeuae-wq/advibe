import { isAuthenticated } from "../../lib/session.mjs";
import { getFile } from "../../lib/github.mjs";
import { parsePostPage } from "../../lib/render.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }

  const slug = req.query.slug;
  if (!slug) {
    res.status(400).json({ ok: false, error: "Missing slug." });
    return;
  }

  try {
    const file = await getFile(`site/blog/${slug}.html`);
    if (!file) {
      res.status(404).json({ ok: false, error: "Post not found." });
      return;
    }
    const parsed = parsePostPage(file.content);
    res.status(200).json({ ok: true, slug, ...parsed });
  } catch (err) {
    res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
