# Case study widget — React/TypeScript/Tailwind/shadcn build

`site/` is a plain static HTML + CSS + vanilla JS site — it has **no** React,
TypeScript, Tailwind, or shadcn setup, and this folder does not turn it into
one. This is a small, self-contained Vite project whose only job is to
compile the `EarbudShowcase` "after" demo (originally a shadcn/Next.js-style
component) into a static JS/CSS bundle that the static site can load with a
plain `<script>`/`<link>` tag, no build step required at request time.

## Why this exists

The component you're given
(`src/components/ui/spatial-product-showcase.tsx`) is TSX, uses Tailwind
utility classes, and imports `framer-motion` + `lucide-react`. None of that
runs in a browser as-is — it needs a bundler and a TypeScript/JSX
compiler first. Since the target site isn't a React app, the pragmatic
choice was to isolate the whole toolchain here instead of converting the
site to Next.js.

## Structure (shadcn conventions, Vite flavor)

```
react-src/
├─ components.json        # shadcn config (aliases, tailwind paths)
├─ tailwind.config.js      # content globs + preflight disabled (see below)
├─ postcss.config.js
├─ tsconfig.json           # "@/*" -> "./src/*"
├─ vite.config.ts          # builds an IIFE bundle to ../case-study-widget/
├─ index.html              # dev-only preview shell (`npm run dev`)
└─ src/
   ├─ components/ui/spatial-product-showcase.tsx   # pasted as-is
   ├─ demo.tsx             # given demo wrapper
   ├─ lib/utils.ts         # shadcn's `cn()` helper
   ├─ main.tsx             # mounts <DemoOne/> into #advibe-case-study-widget-root
   └─ index.css            # @tailwind base/components/utilities
```

## Building

```bash
cd site/react-src
npm install
npm run build
```

This writes `../case-study-widget/case-study-widget.js` and
`case-study-widget.css` (fixed filenames, no hash) — those two files are
what `site/index.html` actually links to. Re-run `npm run build` and
re-deploy the static site whenever you change anything in `src/`.

`npm run dev` serves `index.html` here for iterating on the component in
isolation with hot reload, independent of the static site.

## Non-obvious things a future edit could break

- **`define: { 'process.env.NODE_ENV': ... }` in `vite.config.ts` is
  required.** React reads `process.env.NODE_ENV` directly; Vite only
  inlines that automatically for an app-mode build, not for `build.lib`
  (IIFE) builds. Without it the bundle throws `process is not defined` the
  instant it runs in a browser — no `process` global exists client-side.
- **Tailwind preflight is off** (`corePlugins.preflight` in
  `tailwind.config.js`). The compiled CSS is loaded on the same page as the
  static site's own global CSS; preflight would reset the whole page's
  base typography/box-sizing/button styles, not just the widget's subtree.
- **The host page, not this component, scopes `position: fixed`.** The
  component has two `fixed`-positioned children (an ambient background
  gradient and the floating Left/Right switcher) that were written
  assuming the component owns the full viewport. Embedded in a page
  section, `site/css/case-study.css` gives `#advibe-case-study-widget-root`
  `transform: translateZ(0); contain: layout paint;` so those children
  become scoped to that box instead of the real browser viewport. If you
  ever mount this component somewhere else, that container needs the same
  treatment or the gradient/switcher will overlay the entire page.
- **The component's own `min-h-screen` is overridden by the host page**
  (`#advibe-case-study-widget-root > div` in `case-study.css`) back to a
  fixed height, and that height is tiered by viewport width to match where
  the component's own `md:` (768px) breakpoint flips it from a stacked
  column to a side-by-side row — the stacked layout needs much more
  vertical room. If you change the component's copy length, image sizes,
  or breakpoint, re-check those numbers (see the comment above the rule).

## Known limitation: the demo product images

`spatial-product-showcase.tsx` points at
`https://ik.imagekit.io/kqmrslzuq/SOUND/left-earbud.png` (and
`right-earbud.png`) — the component author's own public ImageKit demo
account. During testing this returned `429 Too Many Requests` under
repeated automated hits. It's a fine placeholder to develop against, but
it's a third party's asset host with no uptime/rate-limit guarantee — swap
in real, self-hosted product photography (matching the `image` field shape
in `PRODUCT_DATA`) before this goes live for a real client.
