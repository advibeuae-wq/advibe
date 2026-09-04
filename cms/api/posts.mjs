// Lists every post in site/blog/'s timeline — the CMS's "Blog Posts" tab.
// One file read (site/blog/index.html already has title/date/category/slug
// per post), no per-post fetch.
import { isAuthenticated } from "../lib/session.mjs";
import { getFile } from "../lib/github.mjs";
import { parseIndexTimeline } from "../lib/render.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }

  try {
    const file = await getFile("site/blog/index.html");
    if (!file) {
      res.status(500).json({ ok: false, error: "Could not read site/blog/index.html." });
      return;
    }
    res.status(200).json({ ok: true, posts: parseIndexTimeline(file.content) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
