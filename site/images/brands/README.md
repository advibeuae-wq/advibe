# Client/brand logos — "Brands we've worked with"

This folder feeds the auto-scrolling logo marquee in the "Brands we've
worked with" section on the homepage (`site/index.html`, right after the
hero). `logo-01.svg` … `logo-08.svg` are placeholders — a dashed outline
with a generic "image" glyph — standing in until real client logos are
approved to publish.

## Adding a real logo

1. Get sign-off to display the client's logo publicly (standard practice —
   don't publish a client's mark without it).
2. Export a version that reads clearly on Advibe's dark background
   (`#0A0A0A`/`#141414`):
   - **SVG preferred** (crisp at any size, small file size). PNG with a
     transparent background is fine too.
   - If the source logo is dark-on-transparent (built for light
     backgrounds), you'll need a white/light variant — most brands provide
     one, or ask the client for their reversed/dark-mode lockup.
   - Roughly a **160×64px** logical box (matches the placeholder aspect
     ratio) — wider or narrower is fine, the tile sizes to content.
3. Save it into this folder, e.g. `client-name.svg`.
4. In `site/index.html`, find the `.brand-tile` for the placeholder slot
   you're replacing (there are two copies of each tile — the marquee track
   is the logo list duplicated once for a seamless loop, so **replace both
   copies**) and swap:
   ```html
   <div class="brand-tile">
     <img src="images/brands/logo-01.svg" alt="" loading="lazy">
   </div>
   ```
   for:
   ```html
   <div class="brand-tile">
     <img src="images/brands/client-name.svg" alt="Client Name" loading="lazy">
   </div>
   ```
   Give it real `alt` text (the client's name) — the placeholders use
   `alt=""` deliberately since they carry no real information yet.
5. Delete the placeholder file once nothing references it.

No build step — these are referenced directly by `<img>` tags, so a saved
file just works on refresh.
