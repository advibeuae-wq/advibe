/**
 * Shared image-upload helpers — used by both cms/api/images/upload.mjs (a
 * single page-content image field) and cms/api/brand-assets.mjs (a sitewide
 * asset replaced across every page). No fs/http here; buildUploadPath just
 * decides a repo path and hands back the decoded buffer for size checks —
 * committing it is the caller's job via cms/lib/github.mjs.
 */

import crypto from "node:crypto";

// Comfortably under Vercel's request body ceiling once base64 overhead
// (~33%) and JSON framing are accounted for.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function slugifyBase(name) {
  const base = String(name || "")
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "image";
}

/**
 * Decodes and validates an uploaded image, and returns a collision-safe,
 * cache-busting repo path for it. Every upload gets a short content-hash
 * suffix and is written as a NEW file — it never overwrites an existing
 * filename in place, so replacing an image on one page can't silently
 * change what another page (still pointing at the old file) shows.
 *
 * folder is relative to site/ — e.g. "images" (default) or "images/services".
 */
export function buildUploadPath({ originalName, mimeType, base64Data, folder = "images" }) {
  const ext = EXT_BY_MIME[mimeType];
  if (!ext) throw new Error(`Unsupported image type: ${mimeType || "(none given)"}`);
  if (!base64Data) throw new Error("No file data received.");

  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length === 0) throw new Error("The uploaded file is empty.");
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Image is too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB) — please keep uploads under ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`
    );
  }

  const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 8);
  const filename = `${slugifyBase(originalName)}-${hash}.${ext}`;
  const cleanFolder = String(folder || "images").replace(/^\/+|\/+$/g, "") || "images";

  return {
    repoPath: `site/${cleanFolder}/${filename}`,
    publicPath: `${cleanFolder}/${filename}`,
    buffer,
  };
}
