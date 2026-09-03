# Blog admin (local only)

A small dashboard for writing new posts on `site/blog/` without hand-editing HTML.
Dev-machine only — it doesn't talk to the internet or the live site. Nothing
goes live until you `git push` like any other change; the existing
`.github/workflows/deploy.yml` FTPs `site/` to Namecheap from there.

## Run it

```
node scripts/blog-admin/server.mjs
```

Then open http://localhost:4321 (set `PORT=xxxx` to use a different port).

## What it does on submit

1. Renders a new page at `site/blog/<slug>.html`, styled with the same
   header/footer/tokens as the rest of the site (see `site/css/blog.css`).
2. Adds it as the new featured entry at the top of the post timeline in
   `site/blog/index.html`, demoting the previous top post to a regular entry.
3. Adds a `<url>` entry to `site/sitemap.xml`.

Then you review the diff, and ship it the normal way:

```
git add site/blog site/sitemap.xml
git commit -m "Add blog post: <slug>"
git push
```

## Body syntax

Close enough to standard Markdown that pasting a ChatGPT/AI draft in as-is
works without manual cleanup. Blank line = new paragraph. Block-level:

- `# ` or `## ` becomes a heading. (Both map to the same `<h2>` — the page
  already has one `<h1>`, the post title, rendered separately.)
- `### ` becomes a sub-heading.
- `> ` becomes a pull-quote / blockquote.
- Consecutive lines starting with `- ` or `* ` become a bullet list.

Inline, usable anywhere above (headings, blockquotes, list items, paragraphs):

- `**bold**` becomes `<strong>`.
- `*italic*` becomes `<em>`. Requires no space right after the opening `*`,
  so it's never confused with a `- `/`* ` list marker.
- `[text](url)` becomes a link.

Everything else is HTML-escaped, so pasted text can't break the page.

Editing an existing post always reconstructs the *canonical* form — `## `
(never a bare `# `) and `- ` (never `* `) — regardless of which synonym was
originally typed. That distinction isn't preserved round-trip; the rendered
output is identical either way.

## Why this exists instead of WordPress

This site is static HTML with no build step and deploys via FTP on git push —
no PHP/MySQL, no server we control directly. A full WordPress install would
mean standing up and maintaining a second stack. This tool keeps posts as
plain files in the same repo, styled by the same design system, shipped by
the same pipeline. See `[[blog-system-architecture]]` in memory for the
fuller reasoning if this ever needs revisiting.

---

## Remote CMS (Phase 1) — publish from anywhere

The tool above only runs on your own machine. `cms/` is a separate,
remotely-hosted version of the same publishing flow — same rendering code,
same output HTML, same `site/blog/index.html` timeline and `sitemap.xml`
conventions — but reachable from a browser anywhere, with a login, and
committing straight to GitHub instead of writing to local disk.

```
You (browser, anywhere)
  → https://<cms-domain>/login    (password → httpOnly session cookie)
  → https://<cms-domain>/editor   (title / slug / image / SEO description / body)
  → POST /api/publish
  → GitHub Git Data API: one atomic commit touching
      site/blog/<slug>.html, site/blog/index.html, site/sitemap.xml
  → pushed straight to `main`
  → existing .github/workflows/deploy.yml (unchanged) FTPs site/ to Namecheap
```

### Where the shared code lives now

The template, mini-markdown renderer, and the `site/blog/index.html` /
`sitemap.xml` string-surgery all moved to **`cms/lib/render.mjs`** — the
canonical copy, imported by both this local server and `cms/api/publish.mjs`.
Nothing about the rendered output changed; `server.mjs` above now just
imports these functions instead of defining them inline.

### Layout

```
cms/
  lib/
    render.mjs     pure functions: template, mini-markdown, index/sitemap surgery
    github.mjs      GitHub Git Data API client (atomic multi-file commits)
    session.mjs      password check + signed httpOnly session cookie
  api/
    login.mjs        POST — password -> session cookie
    logout.mjs        POST — clears the session cookie
    me.mjs             GET — whether the current cookie is valid
    publish.mjs       POST — create or edit a post, one atomic commit
    edit/[slug].mjs    GET — fetch + parse an existing post for editing
  public/
    login.html
    editor.html
  package.json
  vercel.json
```

### Environment variables (set in the hosting platform, never in the repo)

| Variable | Purpose |
|---|---|
| `CMS_PASSWORD` | The one password that unlocks the dashboard. |
| `SESSION_SECRET` | Random string used to sign the session cookie (`openssl rand -hex 32`). |
| `GITHUB_TOKEN` | Fine-grained PAT, Contents: read & write, scoped to this one repo. Server-side only — never sent to the browser. |
| `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` | Optional — default to `advibeuae-wq` / `advibe` / `main`. |

### Publishing

1. Go to `/login`, sign in.
2. `/editor` — fill in Title, Slug (auto-filled from the title), optional
   Featured image URL (used for the social-share preview image only — the
   visual article template is unchanged) and SEO description, and the body
   (same body syntax as the local tool — see "Body syntax" above; close
   enough to standard Markdown to paste a ChatGPT/AI draft in unmodified).
3. **Publish** — one commit lands on `main`; the existing FTP Action takes it
   from there. The success message links the commit and the eventual live URL.

### Editing an existing post

Open `/editor?slug=<slug>` (or use the "Edit an existing post by slug" box on
the editor page). It fetches the live post from GitHub, reconstructs the
mini-markdown from its HTML, and lets you resave — same atomic-commit path,
updating the post file, its entry in the timeline (in place — position and
featured/non-featured status untouched), and its `sitemap.xml` `<lastmod>`.

**Limitations (documented, not silently papered over):**
- Editing works by reverse-parsing the generated HTML back into mini-markdown.
  That's reliable for posts this tool created, but a post hand-edited outside
  this flow may not parse back cleanly.
- The slug is locked once you're editing a post — renaming a published slug
  (moving the file, updating every link to it) isn't implemented in Phase 1.
- Category is fixed to "Blog" for every post (not a field in the Phase 1
  editor); read time is still auto-estimated from word count.
- Single admin, one shared password, no per-user accounts, no draft/PR review
  step — everything published lands straight on `main`. See
  `[[blog-system-architecture]]` in memory for what was deliberately deferred.

---

## Phase 2 — Blog Posts list, Page Content editor, image uploads

The dashboard at `/editor` now has three tabs, all reachable once signed in:

- **Blog Posts** — everything above, plus a list view (title, date, category,
  featured badge) fetched from `GET /api/posts`
  (`parseIndexTimeline` in `cms/lib/render.mjs`, reading the same
  `site/blog/index.html` timeline). "Edit" opens the existing edit flow — the
  gap called out above ("no list of existing posts") is closed. The featured
  image field also got an "Upload image" button next to the URL field
  (`POST /api/images/upload`), so it no longer requires already having a
  hosted image URL.

- **Page Content** — edits the visible text and photos on the 17 top-level
  marketing pages (`site/index.html`, `about.html`, the 12 service pages,
  etc.) without touching HTML. This works by string-surgery, the same
  approach as the blog editor, not a re-render:
  - `scripts/cms-tag-content.mjs` is a one-time (safely re-runnable) codemod
    that stamps a `data-cms="<id>"` attribute onto headings, paragraphs, list
    items, blockquotes, `.btn-label` spans, and content `<img>`s inside each
    page's `<main>` — never the hand-duplicated header/nav/footer/modal
    chrome, and never anything with markup the editor can't safely round-trip
    (a heading with a decorative `<span>` other than the one recognized
    accent case, a stat-bar sub-component, etc. — those are left untagged on
    purpose; see the script's own comments for the exact rule).
  - `cms/lib/content.mjs` reads (`parsePageFields`) and writes
    (`applyFieldUpdates`) those tagged fields — `GET/POST /api/pages/[page]`.
    Saving an image field also re-points a matching `<meta property="og:image">`
    if it was pointing at the same file (several service pages reuse their
    hero photo as their share image), and drops a stale `<source>`/webp pairing
    rather than leaving it pointing at bytes that no longer match its type.
  - Paragraph-type fields support the same mini-markdown as the blog body
    (`**bold**`, `*italic*`, `[text](url)`) plus one more token, `==highlight==`,
    for the one recurring `<span class="accent">` gold-highlight case (e.g.
    `index.html`'s hero headline).
  - **Not covered on purpose:** shared header/nav/footer/consultation-modal
    markup — every page hand-duplicates that chrome (no include/template
    step exists), so a "global" text edit there would mean 17 separate saves
    for one visible change. Worth revisiting only alongside introducing a
    real template step, not folded into this.

- **Brand Assets** — a separate panel (`GET/POST /api/brand-assets`) for the
  handful of images that *are* meant to change everywhere at once: the logo,
  favicon, apple-touch-icon, and the default social-share image. Uploading a
  replacement here re-points every page that currently references the old
  file, in one atomic commit. Deliberately excluded from per-page Page
  Content tagging for exactly that reason.

- **Image uploads** (`cms/lib/images.mjs`, used by both `/api/images/upload`
  and `/api/brand-assets`) never overwrite an existing filename — every
  upload gets a short content-hash suffix (`hero-dubai-a1c9f2.jpg`), capped
  at 4MB. That's a deliberate cache-busting + no-silent-collision choice: a
  page-scoped replace can never accidentally change what a *different* page
  shows just because it happened to reference the same old filename.

**Known gap:** the full click-Save-in-the-browser round trip (auth → GitHub
commit → FTP deploy) needs live `CMS_PASSWORD`/`SESSION_SECRET`/`GITHUB_TOKEN`
and hasn't been exercised end-to-end outside this repo's dev environment —
give it one real smoke test after deploying before relying on it daily.
