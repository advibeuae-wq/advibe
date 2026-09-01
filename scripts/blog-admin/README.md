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

Plain text in the body field, blank line = new paragraph. Two extras:

- A line starting with `## ` becomes a heading.
- A line starting with `> ` becomes a pull-quote / blockquote.
- `[text](url)` becomes a link, inline.

Everything else is HTML-escaped, so pasted text can't break the page.

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
   (same mini-markdown as the local tool: blank line = paragraph, `## ` =
   heading, `> ` = blockquote, `[text](url)` = link).
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
- No list of existing posts in the UI yet — you need the slug. It's visible
  in the timeline on `/blog/` or in `site/blog/index.html`.
- Category is fixed to "Blog" for every post (not a field in the Phase 1
  editor); read time is still auto-estimated from word count.
- Single admin, one shared password, no per-user accounts, no draft/PR review
  step — everything published lands straight on `main`. See
  `[[blog-system-architecture]]` in memory for what was deliberately deferred.
