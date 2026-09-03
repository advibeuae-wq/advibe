// The "Brand Assets" panel: the handful of images reused on every page
// (logo, favicon, apple-touch-icon, default social-share image) that are
// deliberately NOT part of per-page content fields (see the codemod). GET
// lists the known slots; POST uploads a replacement and repoints it across
// every page that references it, in one atomic commit.
import { isAuthenticated, assertSafeOrigin } from "../lib/session.mjs";
import { getFile, commitFiles } from "../lib/github.mjs";
import { buildUploadPath } from "../lib/images.mjs";
import { BRAND_ASSETS, PAGES, readBrandAssetSrc, applyBrandAssetReplace } from "../lib/content.mjs";

// Every brand asset is guaranteed to appear on the homepage (the 12 service
// pages override og:image with their own photo, but the other three assets
// — logo, favicon, apple-touch-icon — are identical everywhere), so it's
// the canonical page to read "the current file" from.
const REFERENCE_PAGE = "site/index.html";

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
  if (!isAuthenticated(req)) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }

  if (req.method === "GET") {
    try {
      const ref = await getFile(REFERENCE_PAGE);
      const assets = BRAND_ASSETS.map((a) => ({
        id: a.id,
        label: a.label,
        src: ref ? readBrandAssetSrc(ref.content, a.id) : null,
      }));
      res.status(200).json({ ok: true, assets });
    } catch (err) {
      res.status(500).json({ ok: false, error: String((err && err.message) || err) });
    }
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!assertSafeOrigin(req)) {
    res.status(403).json({ ok: false, error: "Invalid origin." });
    return;
  }

  const body = readJsonBody(req);
  const asset = BRAND_ASSETS.find((a) => a.id === body.assetId);
  if (!asset) {
    res.status(400).json({ ok: false, error: "Unknown brand asset." });
    return;
  }

  try {
    const ref = await getFile(REFERENCE_PAGE);
    const oldSrc = ref ? readBrandAssetSrc(ref.content, asset.id) : null;
    if (!oldSrc) {
      res.status(500).json({ ok: false, error: `Could not find the current ${asset.label} on ${REFERENCE_PAGE}.` });
      return;
    }

    const { repoPath, publicPath, buffer } = buildUploadPath({
      originalName: body.filename,
      mimeType: body.mimeType,
      base64Data: body.dataBase64,
    });

    const files = [{ path: repoPath, content: body.dataBase64, encoding: "base64" }];
    let touchedPages = 0;
    for (const page of PAGES) {
      const existing = await getFile(page.path);
      if (!existing) continue;
      const updated = applyBrandAssetReplace(existing.content, asset.id, oldSrc, publicPath);
      if (updated !== existing.content) {
        files.push({ path: page.path, content: updated });
        touchedPages++;
      }
    }

    const { commitSha, commitUrl } = await commitFiles({
      files,
      message: `Replace brand asset: ${asset.label} (${touchedPages} page${touchedPages === 1 ? "" : "s"})`,
    });

    res.status(200).json({ ok: true, path: publicPath, touchedPages, commitSha, commitUrl, sizeBytes: buffer.length });
  } catch (err) {
    const message = String((err && err.message) || err);
    if (message.startsWith("CONCURRENT_UPDATE")) {
      res.status(409).json({ ok: false, error: "The repository changed while publishing — please retry." });
      return;
    }
    res.status(400).json({ ok: false, error: message });
  }
}
