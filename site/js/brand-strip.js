/* Advibe Agency — shared "Brands we've worked with" logo marquee.
   Single source of truth for the logo list: edit BRAND_LOGOS below and
   every page with a `[data-brand-strip]` mount point picks it up
   automatically — nothing else to touch, no markup to duplicate.
   Used by: index.html, about.html. */
(() => {
  "use strict";

  const BRAND_LOGOS = [
    "logo-01.svg",
    "logo-02.svg",
    "logo-03.svg",
    "logo-04.svg",
    "logo-05.svg",
    "logo-06.svg",
    "logo-07.svg",
    "logo-08.svg",
  ];

  function tile(file, hidden) {
    const el = document.createElement("div");
    el.className = "brand-tile";
    if (hidden) el.setAttribute("aria-hidden", "true");
    const img = document.createElement("img");
    img.src = "images/brands/" + file;
    img.alt = "";
    img.loading = "lazy";
    el.appendChild(img);
    return el;
  }

  function render(mount) {
    const track = document.createElement("div");
    track.className = "brands-marquee-track";
    BRAND_LOGOS.forEach((file) => track.appendChild(tile(file, false)));
    // Duplicate set, aria-hidden — makes the 50%-translate loop seamless.
    BRAND_LOGOS.forEach((file) => track.appendChild(tile(file, true)));
    mount.appendChild(track);
  }

  document.querySelectorAll("[data-brand-strip]").forEach(render);
})();
