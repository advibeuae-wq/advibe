// Lists the 17 top-level marketing pages the "Page Content" editor can open.
import { isAuthenticated } from "../../lib/session.mjs";
import { PAGES } from "../../lib/content.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }

  res.status(200).json({
    ok: true,
    pages: PAGES.map((p) => ({ slug: p.path.replace(/^site\//, "").replace(/\.html$/, ""), label: p.label })),
  });
}
