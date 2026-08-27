(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = mobileNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((open) => {
        if (open !== item) {
          open.classList.remove("open");
          open.querySelector(".faq-question").setAttribute("aria-expanded", "false");
        }
      });
      item.classList.toggle("open", !isOpen);
      question.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Count-up numbers ---------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.countTo);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = prefix + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const countEls = document.querySelectorAll("[data-count-to]");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    countEls.forEach((el) => {
      const target = parseFloat(el.dataset.countTo);
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
      el.textContent = (el.dataset.prefix || "") + target.toFixed(decimals) + (el.dataset.suffix || "");
    });
  } else {
    const countObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    countEls.forEach((el) => countObserver.observe(el));
  }

  /* ---------- Bar chart fill (results section) ---------- */
  const barFills = document.querySelectorAll(".bar-fill");
  if (barFills.length) {
    const barObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.width = entry.target.dataset.width;
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    barFills.forEach((el) => barObserver.observe(el));
  }

  /* ---------- Case study: Before/After toggle ---------- */
  const compareTabs = document.querySelectorAll(".compare-toggle button");
  if (compareTabs.length) {
    compareTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        compareTabs.forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");

        const panelId = tab.getAttribute("aria-controls");
        document.querySelectorAll(".compare-panel").forEach((panel) => {
          panel.classList.toggle("active", panel.id === panelId);
        });
      });
    });
  }

  /* ---------- Hero: Campaign Pulse scroll-scrub video ----------
     Video playback position is mapped to scroll progress, so the chart
     animates from an underperforming baseline to the 4.8x ROAS result.
     On wide viewports the card is already visible at load, so progress
     is anchored to absolute page scroll (load = pain point, scrolling
     the hero reveals the fix). On narrow viewports the card sits below
     the fold, so progress instead tracks the card's own transit into
     view, or the "load = pain point" moment would never be seen and the
     reveal would already be finished before the card scrolls into
     frame. Reduced-motion users get the resolved end frame with no
     scroll coupling. */
  const pulseVideo = document.getElementById("pulse-video");
  const pulseCard = document.querySelector(".pulse-video-card");
  if (pulseVideo && pulseCard) {
    if (prefersReducedMotion) {
      pulseVideo.addEventListener("loadedmetadata", () => {
        pulseVideo.currentTime = pulseVideo.duration;
      });
    } else {
      const seek = pulseVideo.fastSeek
        ? (t) => pulseVideo.fastSeek(t)
        : (t) => { pulseVideo.currentTime = t; };
      let rafId = null;
      let lastTime = -1;
      let scrubMode = "page";
      let pageScrubDistance = 0;

      const setupScrubGeometry = () => {
        const rect = pulseCard.getBoundingClientRect();
        const cardTopFromPageTop = rect.top + window.scrollY;
        if (cardTopFromPageTop < window.innerHeight) {
          scrubMode = "page";
          pageScrubDistance = Math.max(320, window.innerHeight * 0.6);
        } else {
          scrubMode = "transit";
        }
      };

      const scrub = () => {
        rafId = null;
        if (!(pulseVideo.readyState >= 1) || !pulseVideo.duration) return;
        let progress;
        if (scrubMode === "page") {
          progress = Math.min(1, Math.max(0, window.scrollY / pageScrubDistance));
        } else {
          const rect = pulseCard.getBoundingClientRect();
          progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight * 0.9)));
        }
        const t = progress * pulseVideo.duration;
        if (Math.abs(t - lastTime) > 0.001) {
          seek(t);
          lastTime = t;
        }
      };

      setupScrubGeometry();
      window.addEventListener(
        "scroll",
        () => {
          if (!rafId) rafId = requestAnimationFrame(scrub);
        },
        { passive: true }
      );
      window.addEventListener("resize", setupScrubGeometry, { passive: true });
      pulseVideo.addEventListener("loadedmetadata", scrub);
    }
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.querySelector("[data-current-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Consultation modal ---------- */
  const modal = document.getElementById("consultation-modal");
  if (modal) {
    const openTriggers = document.querySelectorAll('[data-open-modal="consultation"]');
    const closeBtn = modal.querySelector(".modal-close");
    const card = modal.querySelector(".modal-card");
    const modalBody = modal.querySelector(".modal-body");
    const successEl = modal.querySelector(".modal-success");
    const form = modal.querySelector("#consultation-form");
    const errorEl = modal.querySelector(".form-error");
    const submitBtn = form.querySelector(".form-submit");
    const submitLabel = submitBtn.querySelector(".btn-label");
    let lastFocused = null;

    const openModal = (event) => {
      if (event) event.preventDefault();
      lastFocused = document.activeElement;
      modalBody.hidden = false;
      successEl.hidden = true;
      errorEl.hidden = true;
      form.reset();
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      const firstField = form.querySelector("input, textarea");
      const focusFirstField = () => { if (firstField) firstField.focus(); };
      // The browser focuses the clicked trigger as part of its own default
      // handling for the click, which can land after this listener returns
      // and steal focus back — a fixed delay can't reliably outrun it. The
      // card's open transition is guaranteed to finish after that settles,
      // so move focus there instead of racing it.
      card.addEventListener("transitionend", function onOpened(e) {
        if (e.target !== card || e.propertyName !== "transform") return;
        card.removeEventListener("transitionend", onOpened);
        focusFirstField();
      });
      focusFirstField();
    };

    const closeModal = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    };

    openTriggers.forEach((trigger) => trigger.addEventListener("click", openModal));
    closeBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (!modal.classList.contains("open")) return;
      if (event.key === "Escape") {
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        modal.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitLabel.textContent = "Sending…";
      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Formspree request failed");
        modalBody.hidden = true;
        successEl.hidden = false;
        successEl.focus?.();
      } catch (err) {
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitLabel.textContent = "Send message";
      }
    });
  }

  /* ---------- Contact page: inline form (contact.html only) ----------
     Same Formspree endpoint and submit/success pattern as the
     consultation modal above, just without any of the modal's
     open/close/focus-trap behavior — this form lives on the page. */
  const pageForm = document.getElementById("contact-page-form");
  if (pageForm) {
    const formWrap = pageForm.closest(".contact-form-wrap");
    const successEl = formWrap.querySelector(".modal-success");
    const errorEl = pageForm.querySelector(".form-error");
    const submitBtn = pageForm.querySelector(".form-submit");
    const submitLabel = submitBtn.querySelector(".btn-label");

    pageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitLabel.textContent = "Sending…";
      try {
        const response = await fetch(pageForm.action, {
          method: "POST",
          body: new FormData(pageForm),
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Formspree request failed");
        pageForm.hidden = true;
        successEl.hidden = false;
        successEl.focus?.();
      } catch (err) {
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitLabel.textContent = "Send message";
      }
    });
  }
})();
