// GET  — fetch one page's data-cms-tagged fields, grouped by section, for
//        the "Page Content" editor.
// POST — apply a batch of field edits and commit, one commit per save.
import { isAuthenticated, assertSafeOrigin } from "../../lib/session.mjs";
import { getFile, commitFiles } from "../../lib/github.mjs";
import { PAGES, parsePageFields, applyFieldUpdates, pageLabel } from "../../lib/content.mjs";

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

// Slugs are checked against the fixed PAGES allowlist — never built into a
// filesystem/API path directly — so there's no path-traversal surface here.
function resolvePath(slug) {
  const candidate = `site/${slug}.html`;
  return PAGES.some((p) => p.path === candidate) ? candidate : null;
}

export default async function handler(req, res) {
  const path = resolvePath(req.query.page);
  if (!path) {
    res.status(404).json({ ok: false, error: "Unknown page." });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }

  if (req.method === "GET") {
    try {
      const file = await getFile(path);
      if (!file) {
        res.status(404).json({ ok: false, error: `${path} not found in the repo.` });
        return;
      }
      const { groups } = parsePageFields(file.content);
      res.status(200).json({ ok: true, path, label: pageLabel(path), groups });
    } catch (err) {
      res.status(500).json({ ok: false, error: String((err && err.message) || err) });
    }
    return;
  }

  if (req.method === "POST") {
    if (!assertSafeOrigin(req)) {
      res.status(403).json({ ok: false, error: "Invalid origin." });
      return;
    }
    const body = readJsonBody(req);
    const updates = Array.isArray(body.updates) ? body.updates : [];
    if (updates.length === 0) {
      res.status(400).json({ ok: false, error: "No changes to save." });
      return;
    }
    try {
      const file = await getFile(path);
      if (!file) {
        res.status(404).json({ ok: false, error: `${path} not found in the repo.` });
        return;
      }
      const updatedHtml = applyFieldUpdates(file.content, updates);
      const { commitSha, commitUrl } = await commitFiles({
        files: [{ path, content: updatedHtml }],
        message: `Edit page content: ${path}`,
      });
      res.status(200).json({ ok: true, commitSha, commitUrl });
    } catch (err) {
      const message = String((err && err.message) || err);
      if (message.startsWith("CONCURRENT_UPDATE")) {
        res.status(409).json({ ok: false, error: "The repository changed while saving — please retry." });
        return;
      }
      res.status(400).json({ ok: false, error: message });
    }
    return;
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
}
