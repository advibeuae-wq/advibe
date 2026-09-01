/* Advibe Agency — Free Instant Ads Audit (free-ads-audit.html only)
   Client-side scoring engine + results reveal for the mini-audit tool.
   Loaded after js/main.js, which already owns the consultation modal,
   reveal-on-scroll, mobile nav, and footer year — this file only adds
   what's specific to the audit form. Formspree submission runs in the
   background after the score is already shown, so the result never
   waits on the network. */
(() => {
  "use strict";

  const form = document.getElementById("audit-form");
  if (!form) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const resultsSection = document.getElementById("audit-results");
  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreBandNoteEl = document.getElementById("score-band-note");
  const dialFill = document.getElementById("dial-fill");
  const flagsEl = document.getElementById("audit-flags");
  const pasteNotesEl = document.getElementById("audit-paste-notes");
  const errorEl = form.querySelector(".form-error");
  const submitBtn = form.querySelector(".form-submit");
  const submitLabel = submitBtn.querySelector(".btn-label");
  const retakeBtn = document.getElementById("audit-retake");
  const ctaBook = document.getElementById("audit-cta-book");

  const bars = {
    tracking: { fill: document.getElementById("bar-tracking"), value: document.getElementById("bar-tracking-value") },
    structure: { fill: document.getElementById("bar-structure"), value: document.getElementById("bar-structure-value") },
    budget: { fill: document.getElementById("bar-budget"), value: document.getElementById("bar-budget-value") },
  };

  /* ---------- Scoring ---------- */
  const WEIGHTS = { q1: 20, q2: 15, q3: 20, q4: 15, q5: 15, q6: 15 };
  const CATEGORIES = { tracking: ["q1", "q2"], structure: ["q3", "q4"], budget: ["q5", "q6"] };
  const ANSWER_MULT = { yes: 1, unsure: 0.5, no: 0 };
  const FLAG_TEXT = {
    q1: "Conversion tracking isn't confirmed — you may be optimizing on incomplete or missing data.",
    q2: "GA4 isn't fully linked — you're likely missing attribution across parts of the funnel.",
    q3: "Campaigns aren't segmented — high and low performers are sharing the same budget pool.",
    q4: "Landing pages may not match ad promises — this usually raises cost per result.",
    q5: "No exclusions in place — one of the most common sources of wasted spend.",
    q6: "Nobody's reviewing the account weekly — stale targeting quietly bleeds budget.",
  };

  function computeScore(answers) {
    let total = 0;
    let maxTotal = 0;
    const catScores = {};
    Object.keys(CATEGORIES).forEach((cat) => {
      let catPts = 0;
      let catMax = 0;
      CATEGORIES[cat].forEach((q) => {
        const w = WEIGHTS[q];
        catMax += w;
        catPts += w * (ANSWER_MULT[answers[q]] ?? 0);
      });
      catScores[cat] = Math.round((catPts / catMax) * 100);
      total += catPts;
      maxTotal += catMax;
    });
    return { score: Math.round((total / maxTotal) * 100), catScores };
  }

  function tierFor(pct) {
    if (pct >= 80) return "good";
    if (pct >= 55) return "mid";
    return "risk";
  }

  function bandFor(score) {
    if (score >= 80) {
      return { tier: "good", label: "Strong Foundation", note: "Your account has the fundamentals right. A full audit can still find the next 10–20% — book yours below." };
    }
    if (score >= 55) {
      return { tier: "mid", label: "Needs Work", note: "A few real gaps are likely costing you money every month. Here's where to start." };
    }
    return { tier: "risk", label: "High Risk — Leaking Budget", note: "Multiple foundational issues detected. This account is very likely wasting spend right now." };
  }

  function buildFlags(answers, spend, goal) {
    const flags = [];
    Object.keys(FLAG_TEXT).forEach((q) => {
      const a = answers[q];
      if (a === "no" || a === "unsure") flags.push({ severity: a === "no" ? 2 : 1, text: FLAG_TEXT[q] });
    });
    flags.sort((a, b) => b.severity - a.severity);
    const trimmed = flags.slice(0, 5);
    if (spend === "under-5k" && goal === "ecommerce") {
      trimmed.push({
        info: true,
        text: "At this budget, e-commerce accounts often need a longer learning phase to gather enough conversion data — worth discussing in your audit.",
      });
    }
    return trimmed;
  }

  function pasteNotes(text) {
    if (!text || !text.trim()) return [];
    const lower = text.toLowerCase();
    const notes = [];
    if (lower.includes("broad match")) notes.push("You mentioned Broad Match — often a spend leak without a solid negative keyword list.");
    if (lower.includes("advantage+") || lower.includes("advantage +")) notes.push("You mentioned Advantage+ — these campaigns lean hard on creative volume and exclusions to stay efficient.");
    if (lower.includes("quality score")) notes.push("You mentioned Quality Score — we'll dig into keyword and ad relevance in your full audit.");
    if (/https?:\/\//.test(text)) notes.push("Thanks for the link — we'll pull this up as part of your free full audit.");
    if (!notes.length) notes.push("Thanks for the extra context — we'll dig into this during your full audit.");
    return notes.slice(0, 2);
  }

  /* ---------- Rendering ---------- */
  const WARN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 16.5h.01"/><path d="M10.29 3.86L1.82 18a1.5 1.5 0 0 0 1.3 2.25h17.76a1.5 1.5 0 0 0 1.3-2.25L13.71 3.86a1.5 1.5 0 0 0-2.42 0z"/></svg>';
  const INFO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.3 2.3L16 9.5"/></svg>';

  function animateNumber(el, target, duration) {
    if (prefersReducedMotion) {
      el.textContent = target;
      return;
    }
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setDialProgress(pct) {
    const circumference = dialFill.getTotalLength();
    dialFill.style.strokeDasharray = String(circumference);
    dialFill.style.strokeDashoffset = String(circumference);
    if (prefersReducedMotion) {
      dialFill.style.strokeDashoffset = String(circumference * (1 - pct / 100));
      return;
    }
    // Force a reflow so the reset above is committed before the next
    // frame's target value, or the browser coalesces both writes and the
    // transition never plays — this matters for repeat submissions too.
    dialFill.getBoundingClientRect();
    requestAnimationFrame(() => {
      dialFill.style.strokeDashoffset = String(circumference * (1 - pct / 100));
    });
  }

  function setBarWidth(fillEl, valueEl, pct, tier) {
    fillEl.classList.remove("tier-good", "tier-mid", "tier-risk");
    fillEl.classList.add(`tier-${tier}`);
    valueEl.textContent = `${pct}%`;
    fillEl.style.width = "0%";
    if (prefersReducedMotion) {
      fillEl.style.width = `${pct}%`;
      return;
    }
    fillEl.getBoundingClientRect();
    requestAnimationFrame(() => {
      fillEl.style.width = `${pct}%`;
    });
  }

  function renderResults({ score, catScores, band, flags, notes }) {
    resultsSection.classList.remove("tier-good", "tier-mid", "tier-risk");
    resultsSection.classList.add(`tier-${band.tier}`);

    animateNumber(scoreNumberEl, score, 900);
    scoreBandEl.textContent = band.label;
    scoreBandNoteEl.textContent = band.note;
    setDialProgress(score);

    setBarWidth(bars.tracking.fill, bars.tracking.value, catScores.tracking, tierFor(catScores.tracking));
    setBarWidth(bars.structure.fill, bars.structure.value, catScores.structure, tierFor(catScores.structure));
    setBarWidth(bars.budget.fill, bars.budget.value, catScores.budget, tierFor(catScores.budget));

    flagsEl.innerHTML = flags
      .map((f) => `<div class="audit-flag${f.info ? " is-info" : ""}">${f.info ? INFO_ICON : WARN_ICON}<span>${f.text}</span></div>`)
      .join("");

    if (notes.length) {
      pasteNotesEl.hidden = false;
      pasteNotesEl.innerHTML = `<span class="audit-paste-label">From what you shared</span>${notes.map((n) => `<p>${n}</p>`).join("")}`;
    } else {
      pasteNotesEl.hidden = true;
      pasteNotesEl.innerHTML = "";
    }

    if (resultsSection.hidden) resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  /* ---------- Submit: score instantly, send the lead in the background ---------- */
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const answers = { q1: data.get("q1"), q2: data.get("q2"), q3: data.get("q3"), q4: data.get("q4"), q5: data.get("q5"), q6: data.get("q6") };
    const spend = data.get("spend");
    const goal = data.get("goal");

    const { score, catScores } = computeScore(answers);
    const band = bandFor(score);
    const flags = buildFlags(answers, spend, goal);
    const notes = pasteNotes(data.get("account_paste"));

    renderResults({ score, catScores, band, flags, notes });

    form.querySelector('[name="computed_score"]').value = String(score);
    form.querySelector('[name="score_band"]').value = band.label;
    form.querySelector('[name="_subject"]').value = `New Instant Ads Audit lead — score ${score}/100 (${band.label})`;

    submitBtn.disabled = true;
    submitLabel.textContent = "Sending your details…";
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Formspree request failed");
    } catch (err) {
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = "Get My Score →";
    }
  });

  /* ---------- Retake: jump back to the form, keep the results below ---------- */
  if (retakeBtn) {
    retakeBtn.addEventListener("click", () => {
      form.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      const firstField = form.querySelector("select, input, textarea");
      if (firstField) firstField.focus();
    });
  }

  /* ---------- Consultation modal pre-fill ----------
     js/main.js already wires this button's data-open-modal="consultation"
     click (registered first, since main.js loads before this file) —
     that listener resets the modal form. This listener is registered
     second on the same element, so it always runs after that reset and
     safely overwrites the fields with the visitor's own answers. */
  if (ctaBook) {
    ctaBook.addEventListener("click", () => {
      const name = form.querySelector('[name="name"]').value;
      const email = form.querySelector('[name="email"]').value;
      const cfName = document.getElementById("cf-name");
      const cfEmail = document.getElementById("cf-email");
      const cfMessage = document.getElementById("cf-message");
      if (cfName && name) cfName.value = name;
      if (cfEmail && email) cfEmail.value = email;
      if (cfMessage) {
        cfMessage.value = `Following up on my Instant Ads Audit — scored ${scoreNumberEl.textContent}/100 (${scoreBandEl.textContent}).`;
      }
    });
  }

  /* ---------- Initial dial state (empty ring, ready to animate in) ---------- */
  if (dialFill) {
    const circumference = dialFill.getTotalLength();
    dialFill.style.strokeDasharray = String(circumference);
    dialFill.style.strokeDashoffset = String(circumference);
  }
})();
