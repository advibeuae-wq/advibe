/**
 * Advibe Agency — shared blog rendering logic.
 *
 * Canonical home for every pure, framework-free function used to turn a
 * title/body/etc into the site's static blog HTML. Used by BOTH:
 *   - scripts/blog-admin/server.mjs   (local, dev-machine-only tool)
 *   - cms/api/*.mjs                   (remote CMS, Vercel functions)
 *
 * No fs/http here on purpose — every function takes strings in, returns
 * strings out, so callers decide how to persist (local disk vs GitHub API).
 *
 * The HTML this produces must stay byte-for-byte compatible with the
 * existing hand-authored pages in site/blog/ — see
 * site/blog/welcome-to-the-advibe-blog.html for the reference markup this
 * mirrors. Do not change visual structure here without updating that page
 * (and site/css/blog.css) to match.
 */

export const SITE_ORIGIN = "https://advibeagency.me";
export const DEFAULT_OG_IMAGE = "../images/og-image-base.png";

// ---------- small string helpers ----------

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function unescapeHtml(str) {
  return String(str)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- body <-> mini-markup ----------

/** Tiny body markup: blank-line paragraphs, "## " headings, "### " sub-headings,
 *  "> " blockquotes, [text](url) links. Everything else is escaped, so pasted
 *  text can't break the page. */
export function renderBody(raw) {
  const blocks = String(raw || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Escape link label/url and the surrounding plain text separately, from
  // the raw (unescaped) source — escaping the whole block first and then
  // matching [label](url) against the already-escaped text would run url
  // through escapeAttr twice whenever it contains "&" (e.g. "?x=1&y=2"),
  // corrupting it into "&amp;amp;y=2".
  const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const linkify = (text) => {
    let result = "";
    let lastIndex = 0;
    for (const m of text.matchAll(linkRe)) {
      result += escapeHtml(text.slice(lastIndex, m.index));
      const [, label, url] = m;
      result += `<a href="${escapeAttr(url)}">${escapeHtml(label)}</a>`;
      lastIndex = m.index + m[0].length;
    }
    result += escapeHtml(text.slice(lastIndex));
    return result;
  };

  return blocks
    .map((block) => {
      if (block.startsWith("### ")) return `<h3>${linkify(block.slice(4).trim())}</h3>`;
      if (block.startsWith("## ")) return `<h2>${linkify(block.slice(3).trim())}</h2>`;
      if (block.startsWith("> ")) return `<blockquote>${linkify(block.slice(2).trim())}</blockquote>`;
      return `<p>${linkify(block)}</p>`;
    })
    .join("\n\n        ");
}

/** Reverse of renderBody: given the inner HTML of <article class="post-article">
 *  (only ever containing <p>/<h2>/<h3>/<blockquote> with plain text or <a>
 *  inside — the only tags renderBody ever emits), recover the original mini-markup
 *  source well enough to re-populate the editor for a clean edit. Not a
 *  general HTML-to-text converter — relies on the markup being our own. */
export function unrenderBody(articleInnerHtml) {
  const blocks = [];
  const re = /<(h2|h3|p|blockquote)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(String(articleInnerHtml || "")))) {
    const [, tag, innerRaw] = m;
    const withMarkdownLinks = innerRaw
      .trim()
      .replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/g, (_, url, label) => `[${label}](${url})`);
    const text = unescapeHtml(withMarkdownLinks);
    if (tag === "h2") blocks.push(`## ${text}`);
    else if (tag === "h3") blocks.push(`### ${text}`);
    else if (tag === "blockquote") blocks.push(`> ${text}`);
    else blocks.push(text);
  }
  return blocks.join("\n\n");
}

export function wordCount(html) {
  return (html.replace(/<[^>]+>/g, " ").match(/\S+/g) || []).length;
}

/** First-paragraph summary, used as a fallback when no SEO description is given. */
export function deriveDek(bodyHtml, maxLen = 160) {
  const firstP = (bodyHtml.match(/<p>([\s\S]*?)<\/p>/) || [, ""])[1];
  const text = unescapeHtml(firstP.replace(/<a href="[^"]*">([\s\S]*?)<\/a>/g, "$1")).trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function todayParts() {
  const d = new Date();
  const iso = d.toISOString().slice(0, 10);
  const label = `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return { iso, label };
}

// ---------- full post page (mirrors site/blog/welcome-to-the-advibe-blog.html) ----------

export function renderPostPage({ title, description, category, dateISO, dateLabel, readTime, dek, bodyHtml, slug, image }) {
  const canonical = `${SITE_ORIGIN}/blog/${slug}.html`;
  const titleEsc = escapeHtml(title);
  const descEsc = escapeAttr(description);
  const ogImage = escapeAttr(image || DEFAULT_OG_IMAGE);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-13QTKV72WV"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-13QTKV72WV');
</script>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleEsc} — Advibe Agency</title>
<meta name="description" content="${descEsc}">
<meta property="og:title" content="${titleEsc} — Advibe Agency">
<meta property="og:description" content="${descEsc}">
<meta property="og:type" content="article">
<meta property="og:image" content="${ogImage}">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/png" href="../images/favicon-32.png">
<link rel="apple-touch-icon" href="../images/apple-touch-icon.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@400;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">

<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/styles.css">
<link rel="stylesheet" href="../css/blog.css">
<link rel="stylesheet" href="../css/tubes-cursor.css">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": ${JSON.stringify(title)},
  "description": ${JSON.stringify(description)},
  "datePublished": "${dateISO}",
  "dateModified": "${dateISO}",
  "url": "${canonical}",
  "mainEntityOfPage": "${canonical}",
  "author": { "@type": "Person", "name": "Abdul Rahim Edavazhikkal", "jobTitle": "Founder & Digital Growth Partner" },
  "publisher": { "@id": "${SITE_ORIGIN}/#organization" }
}
</script>
</head>
<body>

<!-- Site-wide TubesCursor background — see js/tubes-cursor.js and css/tubes-cursor.css. -->
<div id="tubes-cursor-viewport" aria-hidden="true">
  <canvas id="tubes-cursor-canvas"></canvas>
</div>
<div id="tubes-cursor-scrim" aria-hidden="true"></div>

<a href="#main" class="visually-hidden-focusable" style="position:absolute;left:-9999px;top:0;background:var(--gold-400);color:#201200;padding:12px 20px;z-index:200;border-radius:8px;">Skip to content</a>

<header class="site-header">
  <div class="container">
    <a href="../index.html" class="logo" aria-label="Advibe Agency home">
      <img src="../images/advibe-logo.png" alt="Advibe Agency">
    </a>
    <nav class="main-nav" aria-label="Primary">
      <ul>
        <li><a href="../index.html">Home</a></li>
        <li><a href="../about.html">About</a></li>
        <li><a href="../services.html">Services</a></li>
        <li><a href="index.html" class="active">Blog</a></li>
        <li><a href="../index.html#results">Results</a></li>
        <li><a href="../contact.html">Contact</a></li>
      </ul>
    </nav>
    <div class="header-actions">
      <a href="tel:+971501390421" class="btn btn-secondary btn-header-secondary">Book Demo</a>
      <a href="../index.html#contact" class="btn btn-primary">Get Started</a>
      <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
  </div>
</header>

<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile">
  <ul>
    <li><a href="../index.html">Home</a></li>
    <li><a href="../about.html">About</a></li>
    <li><a href="../services.html">Services</a></li>
    <li><a href="index.html" class="active">Blog</a></li>
    <li><a href="../index.html#results">Results</a></li>
    <li><a href="../contact.html">Contact</a></li>
  </ul>
  <a href="../index.html#contact" class="btn btn-primary">Get Started</a>
</nav>

<main id="main">

  <section class="page-hero">
    <div class="container">
      <a href="index.html" class="post-back reveal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        Back to the blog
      </a>
      <div class="post-meta reveal" style="justify-content: center;">
        <time datetime="${dateISO}">${dateLabel}</time>
        <span class="post-category">${escapeHtml(category)}</span>
        <span>${escapeHtml(readTime)}</span>
      </div>
      <h1 class="reveal">${titleEsc}</h1>
      <p class="lede reveal">${escapeHtml(dek)}</p>
    </div>
  </section>

  <section class="section-border-top" data-tubes-opacity="0.85">
    <div class="container">
      <article class="post-article reveal">
        ${bodyHtml}
      </article>

      <div class="post-byline reveal">
        <img src="../images/abdul-rahim-founder.jpg" alt="Abdul Rahim Edavazhikkal" class="post-byline-photo">
        <div class="post-byline-info">
          <span class="post-byline-name">Abdul Rahim Edavazhikkal</span>
          <span class="post-byline-role">Founder &amp; Digital Growth Partner, Advibe Agency</span>
        </div>
      </div>
    </div>
  </section>

</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-card">
      <div class="footer-grid">
        <div class="footer-brand">
          <img src="../images/advibe-logo.png" alt="Advibe Agency">
          <p>We build campaigns that convert, sites that perform, and results you can actually measure.</p>
          <div class="footer-socials">
            <a href="#" aria-label="Advibe Agency on Facebook">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 8h2V5h-2a4 4 0 0 0-4 4v2H9v3h2v7h3v-7h2.5l.5-3H14V9a1 1 0 0 1 1-1z"/></svg>
            </a>
            <a href="#" aria-label="Advibe Agency on Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="16.2" cy="7.8" r="0.6" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="#" aria-label="Advibe Agency on TikTok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M13 3a5.5 5.5 0 0 0 5 5"/></svg>
            </a>
            <a href="#" aria-label="Advibe Agency on LinkedIn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="4" height="11"/><circle cx="5" cy="5" r="1.6"/><path d="M11 20v-8M11 12.5a3 3 0 0 1 6 0V20"/></svg>
            </a>
            <a href="#" aria-label="Advibe Agency reviews on Google">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.4 5 5.5.6-4.1 3.7 1.2 5.4L12 15.5l-4.9 2.7 1.2-5.4-4.1-3.7 5.5-.6z"/></svg>
            </a>
          </div>
        </div>

        <nav class="footer-col" aria-label="Quick links">
          <h3>Quick Links</h3>
          <a href="../index.html">Home</a>
          <a href="../about.html">About</a>
          <a href="../services.html">Services</a>
          <a href="index.html">Blog</a>
          <a href="../index.html#results">Results</a>
          <a href="../contact.html">Contact</a>
        </nav>

        <nav class="footer-col" aria-label="Services">
          <h3>Services</h3>
          <a href="../google-ads.html">Google Ads</a>
          <a href="../meta-ads.html">Meta Ads</a>
          <a href="../tiktok-ads.html">TikTok Ads</a>
          <a href="../linkedin-ads.html">LinkedIn Ads</a>
          <a href="../seo.html">SEO</a>
          <a href="../social-media-management.html">Social Media Management</a>
          <a href="../branding-identity.html">Branding &amp; Identity</a>
          <a href="../web-design-development.html">Web Design &amp; Development</a>
          <a href="../landing-page-cro.html">Landing Page Design &amp; CRO</a>
          <a href="../analytics-tracking-setup.html">Analytics &amp; Tracking Setup</a>
          <a href="../content-creative-production.html">Content &amp; Creative Production</a>
          <a href="../email-sms-marketing.html">Email &amp; SMS Marketing</a>
        </nav>

        <div class="footer-col footer-contact-col">
          <h3>Studio &amp; Contact</h3>
          <span class="footer-eyebrow">Advibe Agency FZ-LLC</span>
          <address>VUET1006 Compass Building, Ras Al Khaimah, UAE</address>
          <a href="tel:+971501390421">+971 50 139 0421</a>
          <a href="mailto:connect@advibeagency.me">connect@advibeagency.me</a>
          <a href="../index.html#contact" class="btn btn-primary">Get Started</a>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="footer-copyright">© <span data-current-year>2026</span> Advibe Agency FZ-LLC. All rights reserved.</p>
        <p class="footer-quote">"Stop guessing. Start measuring."</p>
        <nav class="footer-legal" aria-label="Legal">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </nav>
      </div>
    </div>
  </div>
</footer>

<script type="module" src="../js/tubes-cursor.js"></script>
<script src="../js/main.js"></script>
</body>
</html>
`;
}

/** Reverse of renderPostPage: pull the editable fields back out of an
 *  existing generated post page, for the edit flow. Relies on the exact
 *  markup renderPostPage produces above. */
export function parsePostPage(html) {
  const title = unescapeHtml((html.match(/<h1 class="reveal">([\s\S]*?)<\/h1>/) || [, ""])[1].trim());
  const dek = unescapeHtml((html.match(/<p class="lede reveal">([\s\S]*?)<\/p>/) || [, ""])[1].trim());
  const category = unescapeHtml((html.match(/<span class="post-category">([\s\S]*?)<\/span>/) || [, ""])[1].trim());
  const readTime = unescapeHtml(
    (html.match(/<span class="post-category">[\s\S]*?<\/span>\s*<span>([\s\S]*?)<\/span>/) || [, ""])[1].trim()
  );
  const dateISO = (html.match(/<time datetime="([^"]*)"/) || [, ""])[1];
  const imageMatch = html.match(/<meta property="og:image" content="([^"]*)">/);
  const image = imageMatch ? unescapeHtml(imageMatch[1]) : "";
  const articleMatch = html.match(/<article class="post-article reveal">([\s\S]*?)<\/article>/);
  const body = articleMatch ? unrenderBody(articleMatch[1]) : "";

  return {
    title,
    dek,
    category,
    readTime,
    dateISO,
    imageUrl: image === DEFAULT_OG_IMAGE ? "" : image,
    body,
  };
}

// ---------- site/blog/index.html + site/sitemap.xml string surgery ----------

/**
 * mode "create": prepend a new featured entry, demote whatever was featured.
 * mode "edit": update the existing entry for `slug` in place (position and
 * featured/non-featured status untouched); falls back to "create" behavior
 * if no existing entry is found for that slug.
 */
export function applyIndexInsert(html, { title, dek, category, dateISO, dateLabel, readTime, slug }, { mode } = {}) {
  const timelineMatch = html.match(/(<ol class="post-timeline">)([\s\S]*?)(<\/ol>)/);
  if (!timelineMatch) {
    throw new Error('Could not find <ol class="post-timeline"> in blog/index.html — was it edited by hand?');
  }
  const [, openTag, inner, closeTag] = timelineMatch;

  const entryBody = `<span class="post-entry-marker" aria-hidden="true"></span>
          <div class="post-meta">
            <time datetime="${dateISO}">${dateLabel}</time>
            <span class="post-category">${escapeHtml(category)}</span>
            <span>${escapeHtml(readTime)}</span>
          </div>
          <h2><a href="${slug}.html">${escapeHtml(title)}</a></h2>
          <p class="post-dek">${escapeHtml(dek)}</p>`;

  if (mode === "edit") {
    // Segment into individual <li>...</li> entries first, then find the one
    // for this slug, rather than one regex spanning open-tag to close-tag —
    // a lazy [\s\S]*? bridging that whole distance would happily skip over
    // OTHER entries' boundaries and collapse two <li>s into one.
    const items = inner.match(/<li class="[^"]*">[\s\S]*?<\/li>/g) || [];
    const targetHref = `href="${slug}.html"`;
    const existingLi = items.find((li) => li.includes(targetHref));
    if (existingLi) {
      const existingClass = (existingLi.match(/<li class="([^"]*)">/) || [, ""])[1];
      const newLi = `<li class="${existingClass}">\n          ${entryBody}\n        </li>`;
      const replaced = inner.replace(existingLi, newLi);
      return html.replace(timelineMatch[0], `${openTag}${replaced}${closeTag}`);
    }
    // No existing entry for this slug (shouldn't normally happen) — fall
    // through and insert it as a new one instead of silently dropping it.
  }

  const newEntry = `        <li class="post-entry post-entry-featured reveal">\n          ${entryBody}\n        </li>`;
  const demotedInner = inner.replace(
    /<li class="post-entry post-entry-featured reveal">/,
    '<li class="post-entry reveal">'
  );
  const newInner = `\n${newEntry}\n${demotedInner.replace(/^\n+/, "")}`;
  return html.replace(timelineMatch[0], `${openTag}${newInner}${closeTag}`);
}

/**
 * mode "create": append a new <url> entry.
 * mode "edit": update the <lastmod> of the existing entry for `slug`; falls
 * back to appending if no existing entry is found.
 */
export function applySitemapInsert(xml, { slug, dateISO }, { mode } = {}) {
  const loc = `${SITE_ORIGIN}/blog/${slug}.html`;

  if (mode === "edit") {
    const urlRe = new RegExp(
      `<url>\\s*<loc>${escapeRegExp(loc)}<\\/loc>\\s*<lastmod>[^<]*<\\/lastmod>([\\s\\S]*?)<\\/url>`
    );
    if (urlRe.test(xml)) {
      return xml.replace(urlRe, `<url>\n    <loc>${loc}</loc>\n    <lastmod>${dateISO}</lastmod>$1</url>`);
    }
    // Fall through to append if this post somehow isn't in the sitemap yet.
  }

  const entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${dateISO}</lastmod>\n    <priority>0.5</priority>\n  </url>\n`;
  return xml.replace("</urlset>", `${entry}</urlset>`);
}
