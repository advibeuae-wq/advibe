# Client/brand logos — "Brands we've worked with"

This folder feeds the auto-scrolling logo marquee in the "Brands we've
worked with" section on the homepage and about page (`data-brand-strip`
mount point). The list is driven from one place — `site/js/brand-strip.js`
(`BRAND_LOGOS`) — not hardcoded in either HTML file.

## Current set

12 real client logos, each exported as a transparent-background PNG,
normalized to a consistent visual weight, and rendered at a flat off-white
silhouette via CSS (`filter: brightness(0) invert(1)` in `styles.css`) so
12 differently-branded marks read as one composed strip instead of a
clashing row of colors. Full color reveals on hover.

## Adding or replacing a logo

1. Get sign-off to display the client's logo publicly (standard practice —
   don't publish a client's mark without it).
2. Export/process the source into a transparent PNG:
   - Strip any flattened background color (most client-supplied logos
     arrive on solid white) so only the mark itself has alpha.
   - Crop to the mark's content bounding box, then scale so it fits inside
     roughly a **260×88px safe area on a 320×128px canvas** (2x-density —
     renders at 160×64 logical, matching `.brand-tile` in `styles.css`),
     preserving aspect ratio and centering on the canvas. This keeps every
     logo reading at the same visual size in the strip regardless of how
     tightly cropped the source was.
   - Since the display treatment is a monochrome silhouette (see above),
     source color fidelity doesn't matter — just a clean, accurate alpha
     shape.
3. Save it into this folder as `client-name.png` (kebab-case).
4. In `site/js/brand-strip.js`, add `{ file: "client-name.png", alt: "Client Name" }`
   to `BRAND_LOGOS` (or replace an existing entry). That's it — both pages
   sharing the `[data-brand-strip]` mount pick it up automatically, alt
   text included.
5. Delete the old logo file once nothing references it.

No build step — these are referenced directly by `<img>` tags, so a saved
file just works on refresh.
