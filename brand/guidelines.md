# Advibe Agency — Brand Guidelines

Version 1.0 — August 2026

Advibe Agency FZ-LLC · Performance marketing agency serving Dubai & the UAE
VUET1006 Compass Building, Ras Al Khaimah, UAE
+971 50 139 0421 · connect@advibeagency.me

---

## 1. Brand idea

Advibe exists because most agencies sell activity — posts, ads, "engagement" — and hope it adds up
to revenue. Advibe sells the number going up. Every visual and verbal choice below reinforces one
idea: **we treat your ad spend like data, not vibes.**

That idea is already sitting in the logo: the "i" in Advibe is an ascending arrow. It is the one
piece of brand equity that already exists and everything else should orbit it — literally, in
layout (an ascending line motif) and figuratively (numbers, proof, and reporting language over
adjectives).

**Personality:** confident, analytical, direct. Warm rather than corporate-cold — this is a
relationship-driven Dubai SME market, not enterprise SaaS. Never hypey, never generic-startup.

**What Advibe is not:** a "we post pretty content" agency, a stock-photo agency, a purple-gradient
SaaS clone. Avoid decorative stock portraits entirely — they don't represent real clients or real
team members and read as filler. Let real numbers and real typography carry the visual weight.

---

## 2. Logo

Primary lockup: **Advibe** (bold geometric wordmark, gold gradient) with **AGENCY** set below in
a wide-tracked caption weight. The upward arrow is built into the "i" — never redraw or straighten
it into a plain dot.

| File | Use |
|---|---|
| `logo/advibe-logo-master.png` | Primary lockup, transparent background. Default choice for dark backgrounds (site header, decks, dark social). |
| `logo/advibe-logo-on-black-square.png` | Square, baked-in black background. App icons, social profile photos, favicon source. |
| `logo/advibe-logo-on-white.png` | Wide lockup on white. Light-mode contexts, print, partner co-branding. |
| `logo/advibe-logo-on-white-square.jpg` | Square on white. Square-format light contexts only. |

**Clear space:** minimum clear space around the lockup equals the cap-height of the "A" on all
sides. Don't let text, edges, or other marks inside that space.

**Minimum size:** 120px wide on screen, 25mm in print. Below that the arrowhead in the "i" starts
to lose definition.

**Don't:**
- Don't recolor the wordmark outside the defined gold gradient (§3) — no flat black, no white-only
  on dark backgrounds, no violet fill.
- Don't place it on a busy photograph or a mid-tone that kills contrast with the gold.
- Don't stretch, skew, rotate, or add a drop shadow/outer glow.
- Don't separate "Advibe" from "AGENCY" or resize them independently.

---

## 3. Color

Two roles, kept deliberately unequal: **gold carries growth** (logo, primary CTAs, positive
metrics, headline accents). **Violet carries depth** (secondary accents, hover glows, data
visualization's second series, night-Dubai-skyline mood). Violet should read as a supporting
color throughout — if a page feels purple before it feels gold, dial it back.

### Foundation (near-black, not pure black — warmer, more premium)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0A0A` | Page background |
| `--bg-elevated` | `#141414` | Cards, panels |
| `--bg-elevated-2` | `#1C1C1C` | Nested cards, hover states |
| `--border` | `rgba(255,255,255,0.08)` | Hairline dividers, card borders |
| `--border-strong` | `rgba(255,255,255,0.16)` | Emphasized dividers, focus rings' outer edge |

### Text

| Token | Hex | Use |
|---|---|---|
| `--text` | `#F2EFEA` | Headlines, primary body |
| `--text-muted` | `#A8A29A` | Secondary body, captions |
| `--text-faint` | `#6B6660` | Disabled, tertiary labels |

### Gold — primary accent

| Token | Hex | Use |
|---|---|---|
| `--gold-300` | `#F0CE84` | Light end of gradient, hover states, small text on dark |
| `--gold-400` | `#DDAE5C` | Default accent — links, icons, stat highlights |
| `--gold-600` | `#B0813A` | Dark end of gradient, pressed states |
| `--gold-gradient` | `linear-gradient(90deg, #B0813A 0%, #F0CE84 100%)` | Logo, primary CTA fill, headline underlines |

### Violet — secondary accent

| Token | Hex | Use |
|---|---|---|
| `--violet-400` | `#9B7CF0` | Secondary tags, secondary data series, links on hover |
| `--violet-600` | `#5A34B8` | Deep fills, gradient partner to gold in large decorative areas only |
| `--violet-glow` | `rgba(139, 92, 246, 0.25)` | Ambient glow behind cards on hover — subtle, never a solid fill on body copy |

### Semantic

| Token | Hex | Use |
|---|---|---|
| `--positive` | `--gold-400` | "This number is good" (ROAS up, sales up) |
| `--negative` | `#E8998C` | Errors and true negatives only — muted terracotta-red, never the loud red of the old wireframe |

**Contrast rule:** body text must hit 4.5:1 against its background at all times. `--text-muted` on
`--bg` is the minimum-contrast pairing already checked against this — don't introduce a lower-contrast
combination without rechecking.

**Dark mode is the only mode.** Advibe's brand is dark by design (matches the logo's native
presentation and Dubai-night-skyline mood) — this is not a "dark mode variant of a light site," it's
the site.

---

## 4. Typography

| Role | Typeface | Notes |
|---|---|---|
| Display / headings | **Montserrat**, 600–700 | Geometric, bold, matches the wordmark's letterforms. Tight tracking (-0.02em) at large sizes. |
| Body | **Nunito Sans**, 400/700 | Humanist, warm counterpoint to Montserrat's geometry. Keeps the brand from reading cold. |
| Data / numerals | **JetBrains Mono**, 500–700 | Every stat, metric, price, and percentage on the site uses this face, tabular-nums, always. This is the brand's signature typographic move — it's what makes a number look like a live readout instead of a claim. |

### Scale (desktop → mobile)

| Token | Desktop | Mobile | Line-height | Weight |
|---|---|---|---|---|
| `--fs-display` | 64px | 40px | 1.1 | 700 |
| `--fs-h2` | 42px | 32px | 1.2 | 700 |
| `--fs-h3` | 24px | 22px | 1.3 | 600 |
| `--fs-body-lg` | 18px | 17px | 1.6 | 400 |
| `--fs-body` | 16px | 16px | 1.6 | 400 |
| `--fs-caption` | 12px | 12px | 1.4 | 700, uppercase, 0.1em tracking |
| `--fs-data-lg` | 40px | 32px | 1.1 | 700 (JetBrains Mono) |
| `--fs-data` | 20px | 18px | 1.2 | 600 (JetBrains Mono) |

Body measure (line length) stays between 45–75 characters — never let a paragraph run full-bleed
on desktop.

---

## 5. Spacing & layout

8px base unit. Only use values from this scale: `4, 8, 16, 24, 32, 48, 64, 96, 120, 160`.

- Section padding: 120px desktop / 64px mobile (top and bottom)
- Gutter: 24px
- Max content width: 1280px, centered
- Grid: 12-column desktop, single column mobile, 24px gutters

---

## 6. Radius & elevation

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 8px | Chips, tags, small inputs |
| `--radius-md` | 12px | Cards |
| `--radius-lg` | 20px | Large panels, the hero stat card |
| `--radius-full` | 999px | Pill buttons only |

No drop-shadows for elevation — use the near-black surface steps (`--bg` → `--bg-elevated` →
`--bg-elevated-2`) plus a 1px `--border` hairline. A soft `--violet-glow` is permitted on hover only.

---

## 7. Motion

Subtle, purposeful, never decorative for its own sake:

- Micro-interactions (button hover, link underline): 150–200ms, `ease-out`
- Section reveals on scroll: 400–500ms, `ease-out`, 12px translate-up, opacity fade
- Stat count-ups: numbers animate from 0 to their final value once, when scrolled into view
- Respect `prefers-reduced-motion: reduce` — disable count-ups, translate reveals, and the hero
  sparkline animation; content still appears, just without motion.

---

## 8. Voice & copy

- **Lead with the number, not the adjective.** "Cut ad spend 55% while lifting sales 125–150%" beats
  "we deliver amazing results."
- **Second person, direct address.** "Your ad spend," "your account" — not "clients'."
- **No filler CTAs.** "Book a Free Consultation," "See Our Results" — never "Learn More" alone.
- **Admit the timeline.** Advibe says PPC results take 2–3 months, out loud, in the FAQ. Confidence
  reads as credibility here, not hedging.
- **UAE-specific, not generic-global.** Say Dubai, UAE, AED — don't launder the copy into
  placeless SaaS English.

---

## 9. Imagery

No stock photography of people. This is a deliberate departure from the earlier wireframe, which
used generic AI-portrait imagery that didn't represent any real client, team member, or result —
and read as filler on close inspection.

In its place: the brand's own data. Ascending line charts, tabular metric readouts, delta chips
(▲ 12.4%), thin gold/violet gradient strokes, faint grid backgrounds evoking an ads-manager
dashboard. If a future page needs human photography (team headshots, office photos), use real
photos of real people only — never AI-generated or licensed stock standing in for the team.

---

## 10. Accessibility floor

WCAG 2.1 AA minimum. Semantic HTML, visible focus rings in `--gold-400` on every interactive
element, alt text on every meaningful image (empty `alt=""` for decorative SVGs), full keyboard
operability, `prefers-reduced-motion` respected throughout.
