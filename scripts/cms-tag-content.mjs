#!/usr/bin/env node
/**
 * One-time (but safely re-runnable) codemod that stamps `data-cms="<id>"`
 * onto the elements in site/*.html that the CMS's "Page Content" editor
 * (cms/lib/content.mjs) is allowed to edit.
 *
 * Run from the repo root:
 *   node scripts/cms-tag-content.mjs [--dry-run]
 *
 * Only ever ADDS a data-cms="..." attribute — never touches text, other
 * attributes, or structure. Skips anything already tagged, so running it
 * again after a page is hand-edited (or a new page added to PAGES) only
 * tags what's new.
 *
 * Scope, matching cms/lib/content.mjs's contract:
 *  - Only inside <main id="main">…</main> — header/nav/footer/consultation
 *    modal are hand-duplicated chrome on every page, out of scope here.
 *  - Tags: h1–h4, p, li, blockquote, <span class="btn-label">, <img>.
 *  - A text element is tagged only if, after removing the inline markup the
 *    editor already round-trips (<a>, <strong>, <em>,
 *    <span class="accent">), nothing else is nested inside it — anything
 *    left over (stat-bar spans, step-number badges, etc.) is structural,
 *    not freeform copy, and is skipped.
 *  - <img> is tagged unless its src is one of the sitewide brand assets
 *    (logo/favicon/apple-touch-icon/og-image-base) — those are edited once,
 *    everywhere, through the separate Brand Assets panel.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PAGES, BRAND_ASSETS } from "../cms/lib/content.mjs";
import { slugify } from "../cms/lib/render.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");

const TAGGABLE = new Set(["h1", "h2", "h3", "h4", "p", "li", "blockquote", "img", "span"]);
const SHARED_IMAGE_SRCS = new Set(BRAND_ASSETS.map((a) => a.src));

// Recognized inline markup, stripped before checking for leftover structure.
const INLINE_STRIP_RE =
  /<a href="[^"]*">[\s\S]*?<\/a>|<strong>[\s\S]*?<\/strong>|<em>[\s\S]*?<\/em>|<span class="accent">[\s\S]*?<\/span>/g;

let idCounter = 0; // fallback disambiguator, only used if a slug+tag pair somehow still collides

function tagPage(html, pagePath) {
  const mainStart = html.indexOf('<main id="main">');
  const mainCloseTag = "</main>";
  const mainEnd = html.indexOf(mainCloseTag, mainStart);
  if (mainStart === -1 || mainEnd === -1) {
    return { html, stats: null, error: `Could not find <main id="main">…</main> in ${pagePath}` };
  }
  const mainInnerStart = mainStart + '<main id="main">'.length;
  const before = html.slice(0, mainInnerStart);
  const main = html.slice(mainInnerStart, mainEnd);
  const after = html.slice(mainEnd);

  const stats = { tagged: 0, alreadyTagged: 0, skippedStructural: 0, skippedSharedImage: 0, byTag: {} };

  // One sweep: comments (to track the current section slug) and candidate
  // tags, merged in document order. Comment *ranges* are also used to throw
  // out any tag-shaped match that's actually just text inside a developer
  // comment (e.g. "<!-- swap with a real <img> once... -->") rather than a
  // live element — matchAll has no notion of "inside a comment" on its own.
  const commentRanges = [];
  const events = [];
  for (const m of main.matchAll(/<!--([\s\S]*?)-->/g)) {
    events.push({ type: "comment", index: m.index, text: m[1].trim() });
    commentRanges.push([m.index, m.index + m[0].length]);
  }
  const insideComment = (i) => commentRanges.some(([start, end]) => i >= start && i < end);
  for (const m of main.matchAll(/<(h1|h2|h3|h4|p|li|blockquote|img|span)\b([^>]*)>/g)) {
    if (insideComment(m.index)) continue;
    events.push({ type: "tag", index: m.index, end: m.index + m[0].length, tag: m[1].toLowerCase(), attrs: m[2] });
  }
  events.sort((a, b) => a.index - b.index);

  let slug = "top";
  const counters = new Map();
  let cursor = 0;
  let out = "";

  for (const ev of events) {
    if (ev.type === "comment") {
      slug = slugify(ev.text).split("-").slice(0, 4).join("-") || "section";
      continue;
    }

    const { tag, attrs, index, end } = ev;
    // Copy everything up to this tag untouched first (handles both the
    // "skip" and "tag" cases uniformly).
    if (index < cursor) continue; // inside an already-emitted region (shouldn't happen for our tag set)

    if (/\bdata-cms="/.test(attrs)) {
      stats.alreadyTagged++;
      continue; // leave as-is; cursor stays, copied verbatim in the final flush
    }

    let eligible = false;
    let closeIdx = -1;
    let inner = "";

    if (tag === "span") {
      eligible = /\bclass="btn-label"/.test(attrs);
      if (eligible) closeIdx = main.indexOf("</span>", end);
    } else if (tag === "img") {
      const srcMatch = attrs.match(/\bsrc="([^"]*)"/);
      const src = srcMatch ? srcMatch[1] : "";
      if (SHARED_IMAGE_SRCS.has(src)) {
        stats.skippedSharedImage++;
        continue;
      }
      eligible = true;
    } else {
      closeIdx = main.indexOf(`</${tag}>`, end);
      if (closeIdx === -1) {
        eligible = false;
      } else {
        inner = main.slice(end, closeIdx);
        const stripped = inner.replace(INLINE_STRIP_RE, "");
        eligible = !/<[a-zA-Z]/.test(stripped);
      }
    }

    if (!eligible) {
      if (tag !== "span") stats.skippedStructural++;
      continue;
    }

    const counterKey = `${slug}|${tag}`;
    const n = (counters.get(counterKey) || 0) + 1;
    counters.set(counterKey, n);
    let id = `${slug}-${tag}-${n}`;
    idCounter++; // reserved for future collision-breaking if ever needed

    // Emit: text before this tag, then the tag with data-cms inserted,
    // then (for text tags) the untouched inner content + close tag.
    out += main.slice(cursor, index);
    out += `<${tag}${attrs} data-cms="${id}">`;
    if (tag !== "img") {
      out += inner + `</${tag}>`;
      cursor = closeIdx + `</${tag}>`.length;
    } else {
      cursor = end;
    }

    stats.tagged++;
    stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
  }
  out += main.slice(cursor);

  return { html: before + out + after, stats };
}

function main() {
  console.log(DRY_RUN ? "Dry run — no files will be written.\n" : "Tagging pages…\n");
  let totalTagged = 0;

  for (const { path: relPath, label } of PAGES) {
    const filePath = path.join(REPO_ROOT, relPath);
    const original = readFileSync(filePath, "utf-8");
    const { html: updated, stats, error } = tagPage(original, relPath);

    if (error) {
      console.error(`✗ ${relPath} — ${error}`);
      continue;
    }

    const changed = updated !== original;
    console.log(
      `${changed ? "✓" : "·"} ${label.padEnd(28)} tagged +${stats.tagged}` +
        (stats.alreadyTagged ? `  already-tagged ${stats.alreadyTagged}` : "") +
        (stats.skippedStructural ? `  skipped-structural ${stats.skippedStructural}` : "") +
        (stats.skippedSharedImage ? `  skipped-shared-image ${stats.skippedSharedImage}` : "") +
        `  (${Object.entries(stats.byTag).map(([t, n]) => `${t}:${n}`).join(" ")})`
    );
    totalTagged += stats.tagged;

    if (changed && !DRY_RUN) writeFileSync(filePath, updated, "utf-8");
  }

  console.log(`\n${totalTagged} field(s) tagged across ${PAGES.length} pages.`);
}

main();
