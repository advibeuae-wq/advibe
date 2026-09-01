/* Advibe Agency — shared "Brands we've worked with" logo marquee.
   Single source of truth for the logo list: edit BRAND_LOGOS below and
   every page with a `[data-brand-strip]` mount point picks it up
   automatically — nothing else to touch, no markup to duplicate.
   Used by: index.html, about.html. */
(() => {
  "use strict";

  const BRAND_LOGOS = [
    { file: "armr-access.png", alt: "ARMR Access" },
    { file: "cooper-clinic.png", alt: "Cooper Health Clinic" },
    { file: "drplus.png", alt: "Dr. Plus Home Health Care Services" },
    { file: "health-247.png", alt: "Health 24/7" },
    { file: "lifenity-clinic.png", alt: "Lifenity Clinic" },
    { file: "med7-healthcare.png", alt: "Med7 Healthcare Group" },
    { file: "perfyra.png", alt: "Perfyra" },
    { file: "phoenix-star-clinic.png", alt: "Phoenix Star Clinic" },
    { file: "pro-plus-technical.png", alt: "Pro Plus Technical Services" },
    { file: "sobo-dxb.png", alt: "SOBO DXB" },
    { file: "vara23.png", alt: "Vara23" },
    { file: "wellness-healthcare.png", alt: "Wellness Healthcare" },
  ];

  function tile(logo, hidden) {
    const el = document.createElement("div");
    el.className = "brand-tile";
    if (hidden) el.setAttribute("aria-hidden", "true");
    const img = document.createElement("img");
    img.src = "images/brands/" + logo.file;
    // Duplicate copies are aria-hidden for the seamless loop — keep them
    // out of the accessibility tree entirely so a screen reader doesn't
    // announce each client name twice.
    img.alt = hidden ? "" : logo.alt;
    img.loading = "lazy";
    el.appendChild(img);
    return el;
  }

  function render(mount) {
    const track = document.createElement("div");
    track.className = "brands-marquee-track";
    BRAND_LOGOS.forEach((logo) => track.appendChild(tile(logo, false)));
    // Duplicate set, aria-hidden — makes the 50%-translate loop seamless.
    BRAND_LOGOS.forEach((logo) => track.appendChild(tile(logo, true)));
    mount.appendChild(track);
  }

  document.querySelectorAll("[data-brand-strip]").forEach(render);
})();
