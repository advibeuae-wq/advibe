// Uploads one image into site/images/ (or a subfolder) and returns its new
// path — used by the "Replace image" widget on a single page-content field
// and by the blog editor's featured-image picker. Never overwrites an
// existing file: see cms/lib/images.mjs for the cache-busting naming.
import { isAuthenticated, assertSafeOrigin } from "../../lib/session.mjs";
import { commitFiles } from "../../lib/github.mjs";
import { buildUploadPath } from "../../lib/images.mjs";

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
  try {
    const { repoPath, publicPath, buffer } = buildUploadPath({
      originalName: body.filename,
      mimeType: body.mimeType,
      base64Data: body.dataBase64,
      folder: body.folder,
    });

    await commitFiles({
      files: [{ path: repoPath, content: body.dataBase64, encoding: "base64" }],
      message: `Upload image: ${publicPath}`,
    });

    res.status(200).json({ ok: true, path: publicPath, sizeBytes: buffer.length });
  } catch (err) {
    const message = String((err && err.message) || err);
    if (message.startsWith("CONCURRENT_UPDATE")) {
      res.status(409).json({ ok: false, error: "The repository changed while uploading — please retry." });
      return;
    }
    res.status(400).json({ ok: false, error: message });
  }
}
