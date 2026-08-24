# Advibe Agency — Master Website

Working home for Advibe Agency's brand identity and marketing site.

## Structure

```
brand/               Brand guidelines and logo files — source of truth for identity
  guidelines.md       Full brand guidelines (colors, type, spacing, voice, usage)
  logo/                Logo lockups (transparent, on-white, on-black, square)

site/                The landing page itself — static HTML/CSS/JS, no build step
  index.html
  css/
    tokens.css         Design tokens (color, type, spacing, radius) as CSS custom properties
    styles.css          All page styles
  js/
    main.js             Scroll reveals, count-up stats, mobile nav, FAQ accordion
  images/               Favicon and any site-specific image assets

archive/              Superseded reference material, kept for history
  original-wireframe-mockup.html   The original purple-themed wireframe (was named ".md")
  competitor-reference-digitalnexa.json   A scrape of a competitor's site, kept for reference only —
                                            not used for Advibe's brand or copy

.screenshots/         Disposable verification screenshots (gitignored, see CLAUDE.md)
```

## Working on the site

`site/index.html` is a plain static page — open it directly in a browser, no build step required.
Design tokens live in `site/css/tokens.css`; change a value there and it cascades everywhere.

## Brand source of truth

`brand/guidelines.md` is the reference for colors, type, spacing, logo usage, and voice.
The primary logo file is `brand/logo/advibe-logo-master.png` (transparent background, gold gradient).
