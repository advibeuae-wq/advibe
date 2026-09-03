/**
 * Advibe Agency — page-content editor (the CMS's "Page Content" tab).
 *
 * Same pure-function shape as render.mjs: every function takes an HTML
 * string in and returns data or an HTML string out, so the caller (an API
 * route, backed by cms/lib/github.mjs) decides how to persist it. No fs/http
 * here on purpose.
 *
 * How addressing works: scripts/cms-tag-content.mjs (run once, re-runnable)
 * walks each site/*.html page and stamps a `data-cms="<id>"` attribute onto
 * elements that are safe, unambiguous copy fields — headings, paragraphs,
 * list items, blockquotes, `.btn-label` spans, and content `<img>`s. That
 * attribute is the ONLY thing this module relies on to find and rewrite a
 * field; it's inert to the site's own CSS/JS. See the codemod for exactly
 * which elements get tagged and which are deliberately skipped (nav/footer/
 * modal chrome, decorative sub-component spans, and the handful of images
 * shared across every page — those go through the separate "Brand Assets"
 * flow below, applyBrandAssetReplace).
 */

import { escapeRegExp, escapeAttr, inlineFormat, unInlineFormat } from "./render.mjs";

// ---------- the 17 top-level marketing pages ----------

export const PAGES = [
  { path: "site/index.html", label: "Home" },
  { path: "site/about.html", label: "About" },
  { path: "site/services.html", label: "Services" },
  { path: "site/contact.html", label: "Contact" },
  { path: "site/free-ads-audit.html", label: "Free Ads Audit" },
  { path: "site/google-ads.html", label: "Google Ads" },
  { path: "site/meta-ads.html", label: "Meta Ads" },
  { path: "site/tiktok-ads.html", label: "TikTok Ads" },
  { path: "site/linkedin-ads.html", label: "LinkedIn Ads" },
  { path: "site/seo.html", label: "SEO" },
  { path: "site/social-media-management.html", label: "Social Media Management" },
  { path: "site/branding-identity.html", label: "Branding & Identity" },
  { path: "site/web-design-development.html", label: "Web Design & Development" },
  { path: "site/landing-page-cro.html", label: "Landing Page Design & CRO" },
  { path: "site/analytics-tracking-setup.html", label: "Analytics & Tracking Setup" },
  { path: "site/content-creative-production.html", label: "Content & Creative Production" },
  { path: "site/email-sms-marketing.html", label: "Email & SMS Marketing" },
];

export function pageLabel(path) {
  return (PAGES.find((p) => p.path === path) || {}).label || path;
}

// ---------- friendly hints per tag, shown next to each field in the UI ----------

const TAG_HINTS = {
  h1: "Heading (H1)",
  h2: "Heading (H2)",
  h3: "Sub-heading (H3)",
  h4: "Sub-heading (H4)",
  p: "Paragraph",
  li: "List item",
  blockquote: "Quote",
  span: "Button / label text",
  img: "Image",
};

// ---------- reading fields out of a page ----------

const FIELD_TAG_RE = /<([a-zA-Z0-9]+)([^>]*\bdata-cms="([a-zA-Z0-9_-]+)"[^>]*)>/g;
const COMMENT_RE = /<!--([\s\S]*?)-->/g;

function findAttr(attrsStr, name) {
  const m = attrsStr.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : "";
}

/**
 * Parses every data-cms-tagged element in `html`, in document order, and
 * groups consecutive fields under the nearest preceding HTML comment (every
 * page already has one right before each <section> — see the codemod).
 * Returns { groups: [{ label, fields: [...] }] }.
 */
export function parsePageFields(html) {
  const comments = [];
  for (const m of html.matchAll(COMMENT_RE)) {
    comments.push({ index: m.index, text: m[1].trim() });
  }
  function nearestGroupLabel(fieldIndex) {
    let label = "Other";
    for (const c of comments) {
      if (c.index < fieldIndex) label = c.text;
      else break;
    }
    return label;
  }

  const groupsByLabel = new Map();
  const order = [];

  for (const m of html.matchAll(FIELD_TAG_RE)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const id = m[3];
    const matchEnd = m.index + m[0].length;

    let field;
    if (tag === "img") {
      field = {
        id,
        tag,
        kind: "image",
        hint: TAG_HINTS.img,
        src: findAttr(attrs, "src"),
        alt: findAttr(attrs, "alt"),
      };
    } else {
      const closeTag = `</${tag}>`;
      const closeIdx = html.indexOf(closeTag, matchEnd);
      const inner = closeIdx === -1 ? "" : html.slice(matchEnd, closeIdx);
      field = {
        id,
        tag,
        kind: "text",
        hint: TAG_HINTS[tag] || tag,
        value: unInlineFormat(inner.trim()),
      };
    }

    const label = nearestGroupLabel(m.index);
    if (!groupsByLabel.has(label)) {
      groupsByLabel.set(label, { label, fields: [] });
      order.push(label);
    }
    groupsByLabel.get(label).fields.push(field);
  }

  return { groups: order.map((label) => groupsByLabel.get(label)) };
}

// ---------- writing fields back into a page ----------

function locateTaggedTag(html, id) {
  const re = new RegExp(`<([a-zA-Z0-9]+)([^>]*\\bdata-cms="${escapeRegExp(id)}"[^>]*)>`);
  const m = re.exec(html);
  if (!m) return null;
  return { tag: m[1].toLowerCase(), attrs: m[2], matchStart: m.index, matchEnd: m.index + m[0].length };
}

function setAttr(attrsStr, name, value) {
  const re = new RegExp(`\\b${name}="[^"]*"`);
  const escaped = `${name}="${escapeAttr(value)}"`;
  return re.test(attrsStr) ? attrsStr.replace(re, escaped) : `${attrsStr} ${escaped}`;
}

/**
 * Applies a batch of field edits to `html` and returns the updated HTML.
 * `updates`: [{ id, value }] for text fields, [{ id, src, alt }] for image
 * fields (either src or alt may be omitted to leave it unchanged).
 *
 * Image fields get one extra sync, both handled here rather than in the UI
 * so every caller gets them for free:
 *  - if the old src is also the page's <meta property="og:image">, that
 *    meta tag is repointed too (several service pages reuse their hero photo
 *    as their social-share image — they'd otherwise silently go stale).
 *  - if the tagged <img> is the fallback of a <picture> with a <source
 *    srcset> sibling (only site/index.html + site/about.html's hero photo
 *    today), that <source> is removed rather than left pointing at the old
 *    file — this drops the webp variant for a replaced photo until someone
 *    re-encodes and re-adds one by hand, which is safer than shipping a
 *    <source type="image/webp"> whose bytes aren't actually webp.
 */
export function applyFieldUpdates(html, updates) {
  let result = html;

  for (const u of updates) {
    const found = locateTaggedTag(result, u.id);
    if (!found) throw new Error(`No element with data-cms="${u.id}" found.`);

    if (found.tag === "img") {
      const oldSrc = findAttr(found.attrs, "src");
      let attrs = found.attrs;
      if (u.src !== undefined) attrs = setAttr(attrs, "src", u.src);
      if (u.alt !== undefined) attrs = setAttr(attrs, "alt", u.alt);
      const newTag = `<img${attrs}>`;
      result = result.slice(0, found.matchStart) + newTag + result.slice(found.matchEnd);

      if (u.src !== undefined && u.src !== oldSrc) {
        const ogRe = new RegExp(`(<meta property="og:image" content=")${escapeRegExp(oldSrc)}(")`);
        result = result.replace(ogRe, `$1${escapeAttr(u.src)}$2`);

        // Drop a <source srcset="..." type="image/webp"> immediately before
        // this <img> (a <picture> fallback pairing) — its bytes would no
        // longer match its declared type once the img is repointed.
        const before = result.slice(0, found.matchStart);
        const sm = before.match(/<source\b[^>]*>(\s*)$/);
        if (sm) {
          const sourceTagOnly = sm[0].slice(0, sm[0].length - sm[1].length);
          const cutStart = before.length - sm[0].length;
          result = result.slice(0, cutStart) + result.slice(cutStart + sourceTagOnly.length);
        }
      }
    } else {
      const closeTag = `</${found.tag}>`;
      const closeIdx = result.indexOf(closeTag, found.matchEnd);
      if (closeIdx === -1) throw new Error(`Could not find closing ${closeTag} for data-cms="${u.id}".`);
      const newInner = inlineFormat(String(u.value ?? ""));
      result = result.slice(0, found.matchEnd) + newInner + result.slice(closeIdx);
    }
  }

  return result;
}

// ---------- Brand Assets: the handful of images shared across every page ----------

/**
 * Logical slots for images reused site-wide, deliberately NOT covered by
 * per-page data-cms tagging (see the codemod) so a replace here is the one
 * place a swap is meant to apply everywhere at once. Each slot is located
 * structurally (the specific tag/attribute it lives in), not by a fixed
 * filename — a filename constant would go stale the moment someone replaces
 * it once (uploads are always a new, hash-suffixed file; see
 * cms/lib/images.mjs), so every read re-derives "the current file" from the
 * page itself.
 */
export const BRAND_ASSETS = [
  { id: "logo", label: "Site logo", pattern: /<a[^>]*class="logo"[^>]*>\s*<img src="([^"]*)"/ },
  { id: "favicon", label: "Favicon", pattern: /<link rel="icon" type="image\/png" href="([^"]*)"/ },
  { id: "appleTouchIcon", label: "Apple touch icon", pattern: /<link rel="apple-touch-icon" href="([^"]*)"/ },
  { id: "ogImage", label: "Default social-share image", pattern: /<meta property="og:image" content="([^"]*)"/ },
];

/** Reads the current src for a brand asset off of one page (site/index.html
 *  is the natural choice — it's guaranteed to carry all four, including the
 *  default og:image the 12 service pages don't use). Returns null if this
 *  page doesn't have that asset (e.g. asking for "ogImage" on a page that
 *  overrides it with its own photo isn't meaningful here — always read from
 *  a page known to carry the shared default). */
export function readBrandAssetSrc(html, assetId) {
  const asset = BRAND_ASSETS.find((a) => a.id === assetId);
  if (!asset) return null;
  const m = html.match(asset.pattern);
  return m ? m[1] : null;
}

/** Replaces every literal occurrence of `oldSrc` with `newSrc` across `html`
 *  (one page's worth — the caller loops PAGES, reading oldSrc once via
 *  readBrandAssetSrc and passing it to every page so pages that reference a
 *  *different* image under the same asset id — e.g. a service page's own
 *  og:image — simply don't match and are left untouched). */
export function applyBrandAssetReplace(html, assetId, oldSrc, newSrc) {
  if (!BRAND_ASSETS.some((a) => a.id === assetId)) throw new Error(`Unknown brand asset "${assetId}".`);
  const re = new RegExp(escapeRegExp(oldSrc), "g");
  return html.replace(re, newSrc);
}
