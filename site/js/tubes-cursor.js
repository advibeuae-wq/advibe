/**
 * Advibe Agency — site-wide TubesCursor background.
 *
 * Source component: a mouse-follow WebGL "tubes" cursor trail
 * (threejs-components' tubes1 cursor, loaded from its CDN build — the
 * same package the original React demo imports). This site is plain
 * HTML/CSS/vanilla JS, and the component itself has no real React state
 * beyond "click randomizes colors" and no props — there's nothing a
 * React/Tailwind/shadcn wrapper would buy here, so it's wired up directly:
 * one <canvas> (see index.html, right after <body>), this module to drive
 * it, and tubes-cursor.css for the fixed layout + per-section scrim.
 *
 * Behavior:
 * - Runs behind the ENTIRE page (fixed canvas, negative z-index — see
 *   tubes-cursor.css), not just one section.
 * - A dark scrim sits on top of the canvas; its opacity is driven by
 *   whichever section currently owns the vertical center of the
 *   viewport (see SCRIM_BY_ID below), so text-dense sections (FAQ, the
 *   case study) stay legible while lighter sections (the brands marquee,
 *   the final CTA) let the tubes read more vividly. The Hero section is
 *   deliberately excluded — it already has its own opaque background
 *   photo treatment and fully occludes this layer for free.
 * - Click anywhere on the page cycles the tube/light colors through a
 *   small set of curated, on-brand (gold/violet) combinations. The
 *   original demo uses fully random hex colors on every click; that's
 *   deliberately not reused here since brand guidelines rule out
 *   off-palette recoloring — a fixed rotation keeps the "click reacts"
 *   feel without ever landing on a clashing color.
 * - Skips initializing entirely under `prefers-reduced-motion: reduce`
 *   or a coarse/touch pointer (no persistent cursor to follow, and it's
 *   unnecessary GPU/battery cost on mobile) — the page then renders
 *   exactly as it would without this feature (see the [data-tubes="off"]
 *   rule in tubes-cursor.css).
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const canvas = document.getElementById("tubes-cursor-canvas");
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if (prefersReducedMotion || isCoarsePointer) {
    root.dataset.tubes = "off";
    return;
  }

  // How dark the scrim over the canvas is per section (0 = tubes fully
  // vivid, 1 = fully hidden). Sections not listed here (Hero, the
  // footer) simply never get a data-tubes-opacity attribute and are left
  // exactly as they were — Hero because it already has its own opaque
  // background, the footer because dense link/legal text benefits from
  // staying on a plain, fully solid surface.
  const DEFAULT_SCRIM = 0.82;

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const value = entry.target.dataset.tubesOpacity || DEFAULT_SCRIM;
          root.style.setProperty("--tubes-scrim", value);
        }
      });
    },
    // Fires when a section's edge crosses the vertical center of the
    // viewport — the standard "what section owns the middle of the
    // screen right now" trick, so the scrim eases between values as the
    // user scrolls rather than snapping at arbitrary thresholds.
    { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
  );

  document.querySelectorAll("[data-tubes-opacity]").forEach((el) => sectionObserver.observe(el));

  // Curated, on-brand color rotations (gold #DDAE5C/#F0CE84/#B0813A,
  // violet #9B7CF0/#5A34B8) — cycled on click instead of fully random hex.
  const COLOR_PRESETS = [
    { tubes: ["#DDAE5C", "#F0CE84", "#B0813A"], lights: ["#F0CE84", "#DDAE5C", "#9B7CF0", "#5A34B8"] },
    { tubes: ["#9B7CF0", "#5A34B8", "#DDAE5C"], lights: ["#9B7CF0", "#5A34B8", "#F0CE84", "#DDAE5C"] },
    { tubes: ["#DDAE5C", "#9B7CF0", "#F0CE84"], lights: ["#DDAE5C", "#9B7CF0", "#F0CE84", "#B0813A"] },
    { tubes: ["#B0813A", "#5A34B8", "#DDAE5C"], lights: ["#5A34B8", "#B0813A", "#9B7CF0", "#F0CE84"] },
  ];
  let presetIndex = 0;

  let app = null;

  // Small delay before init: the canvas needs its final layout size for
  // the library's internal geometry/camera setup, and initializing on
  // the same tick a page loads can race that (matches the upstream
  // demo's own workaround for a "Computed radius is NaN" init error).
  const initTimer = setTimeout(() => {
    import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js")
      .then((module) => {
        const TubesCursor = module.default;
        if (!canvas.isConnected) return;
        app = TubesCursor(canvas, {
          tubes: {
            colors: COLOR_PRESETS[0].tubes,
            lights: {
              intensity: 200,
              colors: COLOR_PRESETS[0].lights,
            },
          },
        });
      })
      .catch((err) => {
        console.error("[tubes-cursor] failed to load:", err);
        root.dataset.tubes = "off";
      });
  }, 100);

  window.addEventListener("click", () => {
    if (!app) return;
    presetIndex = (presetIndex + 1) % COLOR_PRESETS.length;
    const preset = COLOR_PRESETS[presetIndex];
    app.tubes.setColors(preset.tubes);
    app.tubes.setLightsColors(preset.lights);
  });

  window.addEventListener("beforeunload", () => {
    clearTimeout(initTimer);
    if (app && typeof app.dispose === "function") app.dispose();
  });
})();
