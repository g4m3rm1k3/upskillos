---
title: 2.4 — Sticky Scrollytelling, Overflow Traps and Responsive Pivots
track: CSS & Interface Engineering — Layout Intuition
trackOrder: 45.14
runtime: none
---

Have you ever wondered how premier engineering sites (like Stripe, Apple, or Linear) build those mesmerizing scrollytelling showcases: where narrative cards scroll smoothly down the left side while a high-fidelity interactive diagram, terminal, or graphic stays pinned on the right side, smoothly cross-fading and updating with every card you pass?

Most developers who try to build this pattern by hacking together `position: fixed` or heavy scroll listeners run into catastrophic bugs:
1. **The Pinned Element Flies Away:** You add `position: sticky; top: 2rem`, but the element scrolls off the page immediately.
2. **The "Silent Overflow" Trap:** An ancestor element three levels up has `overflow: hidden` or `overflow: auto`. The browser silently disables `position: sticky` with zero warnings in the console!
3. **The `align-items: stretch` Trap:** In CSS Grid or Flexbox, the default alignment is `stretch`. The sticky container automatically stretches to match the entire column height, leaving no remaining scroll room for the sticky pin to travel!
4. **The Mobile Format Change Dilemma:** Your desktop 2-column layout looks amazing. Then your product lead tests on mobile, and the side-by-side layout crushes the cards into unreadable slivers. How do you pivot the layout gracefully without rewriting your entire component?

In this lesson, you will master the physics of **`position: sticky`**, conquer the overflow trap, build an interactive scrollytelling stage with cross-fading graphics, and implement a responsive layout pivot that adapts when formatting requirements change.

Continue in `interface-studio/`, editing `workspace-app/`.

### The story so far

You have mastered Flexbox, 2D Grid, Subgrid, and Container Queries. Now, you will combine multi-column grid alignment with sticky coordinate mathematics to create a dynamic scrollytelling pattern.

```text
Scroll Position (Delta Y) → Sticky Bounding Box (Parent Restraint) → Active Card In View → Stage Cross-Fade
```

### The Mathematics of `position: sticky`

`position: sticky` is a hybrid of `relative` and `fixed` positioning:
* While the element's scroll offset is less than the declared threshold (e.g. `top: 24px`), the element behaves as `position: relative` in the normal document flow.
* Once the scroll container passes `top: 24px`, the element switches to `position: fixed` relative to its scrolling viewport.
* **Crucial constraint:** The sticky element can **never escape the bounding box of its immediate parent element**. When the parent element's bottom edge reaches the sticky element, the sticky element stops and scrolls away with its parent.

Therefore:
$$\text{Sticky Travel Distance} = \text{Parent Height} - \text{Sticky Element Height}$$

If your parent container is only as tall as the sticky element itself (e.g. due to `align-items: stretch` or an unconstrained grid cell), the travel distance is $0$, and sticky positioning will appear completely dead!

---

## Build the scrollytelling CSS layout and responsive pivot

To make scrollytelling work predictably, we enforce four foundational rules:
1. **Grid Column Alignment:** The 2-column parent (`.scrolly-grid`) must have `align-items: start`. This prevents the sticky column from stretching to the full height of the cards column.
2. **Card Travel Distance:** The left column (`.scrolly-cards`) contains tall vertical spacing between narrative beats, providing sufficient scroll distance for the reader.
3. **Stacked Stage Graphics:** The right column (`.scrolly-stage`) pins with `position: sticky; top: var(--space-6)`. Inside it, visual graphics are stacked using absolute positioning (`inset: var(--space-6)`), cross-fading via `opacity` and GPU-accelerated `transform: scale()`.
4. **Responsive Layout Pivot:** When the viewport drops below `860px` (or inside a narrow container), we pivot: the sticky stage pins to the top of the mobile viewport (`top: 0; z-index: 20; height: 220px`) while cards scroll underneath, or collapses into an inline accordion.

```predict
question: What happens to a position: sticky element if an ancestor element declares overflow: hidden?
choice: The sticky element turns into position: absolute and snaps to the top of the page
choice: The browser silently cancels sticky positioning, causing the element to scroll normally
answer: The browser silently cancels sticky positioning, causing the element to scroll normally
explain: position: sticky requires a scrolling ancestor context. overflow: hidden creates an unscrollable clipping boundary, breaking the sticky coordinate calculation.
```

Update `workspace-app/style.css` to add the scrollytelling design system:

```css file=workspace-app/style.css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  --color-canvas: #090d16;
  --color-surface: #131b2e;
  --color-surface-card: #1c2640;
  --color-surface-hover: #263354;
  --color-border: #263354;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-brand: #38bdf8;
  --color-brand-glow: rgba(56, 189, 248, 0.15);
  --color-accent: #818cf8;
  --color-success: #34d399;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  --font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* 2D Application Frame */
.app-shell {
  display: grid;
  grid-template-rows: 64px 1fr;
  grid-template-columns: 240px 1fr 280px;
  grid-template-areas:
    "nav     nav      nav"
    "sidebar main     inspector";
  height: 100vh;
  overflow: hidden;
}

.workspace-nav {
  grid-area: nav;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
}

.nav-brand-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.nav-logo {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--color-brand), var(--color-accent));
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff;
}

.nav-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.app-sidebar {
  grid-area: sidebar;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.app-main {
  grid-area: main;
  background-color: var(--color-canvas);
  padding: var(--space-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.app-inspector {
  grid-area: inspector;
  background-color: var(--color-surface);
  border-left: 1px solid var(--color-border);
  padding: var(--space-4);
}

/* -------------------------------------------------------------
   SCROLLYTELLING SHOWCASE ENGINE
   ------------------------------------------------------------- */
.scrolly-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.scrolly-header {
  margin-bottom: var(--space-4);
}

.scrolly-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-brand);
  background: var(--color-brand-glow);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}

.scrolly-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.scrolly-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  max-width: 58ch;
  margin-top: var(--space-1);
}

/* 1. Scrollytelling 2-Column Grid */
.scrolly-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-8);
  /* CRITICAL: align-items: start prevents the sticky stage column from stretching */
  align-items: start;
  position: relative;
}

/* 2. Scrolling Narrative Column */
.scrolly-cards {
  display: flex;
  flex-direction: column;
  gap: 32vh;
  padding-bottom: 25vh;
}

.scrolly-card {
  background: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  opacity: 0.35;
  transform: translateY(16px);
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.35s ease,
              box-shadow 0.35s ease;
  cursor: pointer;
}

.scrolly-card.is-active {
  opacity: 1;
  transform: translateY(0);
  border-color: var(--color-brand);
  box-shadow: 0 12px 32px var(--color-brand-glow);
}

.scrolly-card-step {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-brand);
  margin-bottom: var(--space-1);
}

.scrolly-card-heading {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.scrolly-card-body {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}

/* 3. Pinned Sticky Stage */
.scrolly-stage {
  position: sticky;
  top: var(--space-6);
  height: 420px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
}

/* Cross-fading Visual Layers inside the Stage */
.stage-graphic {
  position: absolute;
  inset: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  opacity: 0;
  transform: scale(0.92) translateY(12px);
  transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

.stage-graphic.is-active {
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}

.stage-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  font-size: 1.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.stage-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text-primary);
}

.stage-code {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  background: rgba(0, 0, 0, 0.4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  color: var(--color-brand);
  width: 100%;
  max-width: 320px;
  text-align: center;
}

/* 4. Responsive Layout Pivot: Graceful mobile degradation */
@media (max-width: 860px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-areas:
      "nav"
      "main";
  }
  .app-sidebar, .app-inspector {
    display: none;
  }
  .scrolly-grid {
    grid-template-columns: 1fr;
  }
  .scrolly-stage {
    position: sticky;
    top: 0;
    z-index: 20;
    height: 240px;
    background: rgba(19, 27, 46, 0.95);
    backdrop-filter: blur(8px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  }
  .scrolly-cards {
    gap: 16vh;
    padding-bottom: 15vh;
  }
}
```

### Why this works: The Sticky Parent Boundary

Look at line 144:
```css
.scrolly-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
}
```

If `align-items: start` is omitted, CSS Grid defaults to `align-items: stretch`. That causes the right-hand column container to stretch down to the bottom of the left column's cards. Then inside that stretched cell, the `.scrolly-stage` has the exact same height as its parent, giving it zero distance to travel, breaking the sticky effect!

Setting `align-items: start` keeps `.scrolly-stage` at its explicit height (`420px`), allowing it to float smoothly down the track of `.scrolly-grid` as the learner scrolls through the narrative cards.

```check
page workspace-app/index.html "getComputedStyle(document.querySelector('.scrolly-stage')).position" "sticky" server=static
page workspace-app/index.html "getComputedStyle(document.querySelector('.scrolly-grid')).alignItems" "start" server=static
```

---

## Wire the scrollytelling cards and sticky graphic stage

Now, update `workspace-app/index.html`. We add the 3 scrollytelling cards on the left, the pinned graphic stage on the right, and a lightweight `IntersectionObserver` that coordinates active states with zero layout lag:

```html file=workspace-app/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Studio · Sticky Scrollytelling</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app-shell">
    <header class="workspace-nav">
      <div class="nav-brand-group">
        <div class="nav-logo">A</div>
        <span class="nav-title">Aura Studio</span>
      </div>
      <span style="font-size: 0.75rem; color: #94a3b8;">Layout Engine · Scrollytelling</span>
    </header>

    <aside class="app-sidebar">
      <div style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem;">
        Pattern Index
      </div>
      <button style="text-align: left; background: rgba(56,189,248,0.1); border: 1px solid #38bdf8; color: #f8fafc; padding: 0.5rem; border-radius: 4px; font-size: 0.8125rem; font-weight: 600;">
        ⚡ Sticky Scrollytelling
      </button>
      <button style="text-align: left; background: none; border: none; color: #94a3b8; padding: 0.5rem; font-size: 0.8125rem;">
        ▦ Subgrid Card Deck
      </button>
      <button style="text-align: left; background: none; border: none; color: #94a3b8; padding: 0.5rem; font-size: 0.8125rem;">
        ⊞ 2D App Layout
      </button>
    </aside>

    <main class="app-main" id="main-scroll-container">
      <section class="scrolly-section">
        <header class="scrolly-header">
          <span class="scrolly-badge">Interaction Architecture</span>
          <h1 class="scrolly-title">Coordinate-Synced Scrollytelling</h1>
          <p class="scrolly-subtitle">
            Scroll down through the architectural narrative. As each card enters the focal viewport band, the pinned graphic stage on the right transitions automatically.
          </p>
        </header>

        <div class="scrolly-grid">
          <!-- Left Column: Narrative Cards -->
          <div class="scrolly-cards">
            <!-- Beat 1 -->
            <article class="scrolly-card is-active" data-stage="1">
              <div class="scrolly-card-step">01 / ARCHITECTURE</div>
              <h2 class="scrolly-card-heading">Global Design Tokens</h2>
              <p class="scrolly-card-body">
                We decouple color, spatial scale, and typography into primitive variables. When branding or requirements shift, modifying a single token cascades across the entire application instantly.
              </p>
            </article>

            <!-- Beat 2 -->
            <article class="scrolly-card" data-stage="2">
              <div class="scrolly-card-step">02 / SPATIAL RHYTHM</div>
              <h2 class="scrolly-card-heading">4px / 8px Baseline Grid</h2>
              <p class="scrolly-card-body">
                By snapping margins, paddings, and line-heights to multiples of 4 and 8, interfaces achieve natural optical harmony without arbitrary magic numbers or haphazard visual clutter.
              </p>
            </article>

            <!-- Beat 3 -->
            <article class="scrolly-card" data-stage="3">
              <div class="scrolly-card-step">03 / PERFORMANCE</div>
              <h2 class="scrolly-card-heading">GPU Compositor Offloading</h2>
              <p class="scrolly-card-body">
                Animations target strictly <code>transform</code> and <code>opacity</code>. By avoiding layout properties like <code>top</code> and <code>width</code>, transitions run smoothly at 120 FPS on dedicated GPU threads.
              </p>
            </article>
          </div>

          <!-- Right Column: Pinned Sticky Stage -->
          <aside class="scrolly-stage">
            <!-- Stage 1 Graphic -->
            <div class="stage-graphic is-active" id="stage-graphic-1">
              <div class="stage-icon" style="background: linear-gradient(135deg, #38bdf8, #818cf8);">🎨</div>
              <h3 class="stage-title">Token Matrix</h3>
              <div class="stage-code">var(--color-brand: #38bdf8)</div>
            </div>

            <!-- Stage 2 Graphic -->
            <div class="stage-graphic" id="stage-graphic-2">
              <div class="stage-icon" style="background: linear-gradient(135deg, #34d399, #059669);">📐</div>
              <h3 class="stage-title">Spatial Scale</h3>
              <div class="stage-code">padding: var(--space-4) /* 16px */</div>
            </div>

            <!-- Stage 3 Graphic -->
            <div class="stage-graphic" id="stage-graphic-3">
              <div class="stage-icon" style="background: linear-gradient(135deg, #f59e0b, #ef4444);">⚡</div>
              <h3 class="stage-title">Composite Acceleration</h3>
              <div class="stage-code">transform: translateZ(0)</div>
            </div>
          </aside>
        </div>
      </section>
    </main>

    <aside class="app-inspector">
      <h2 style="font-size: 0.875rem; font-weight: 600;">Scrolly Inspector</h2>
      <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem; line-height: 1.5;">
        As cards scroll into the viewport sweet spot (-25% top/bottom margin), the IntersectionObserver updates the active card class and synchronizes the sticky stage.
      </p>
      <div style="margin-top: 1rem; padding: 0.5rem; background: #090d16; border-radius: 4px; font-size: 0.75rem; color: #38bdf8; font-family: monospace;">
        position: sticky;<br>
        top: 1.5rem;<br>
        align-items: start;
      </div>
    </aside>
  </div>

  <script>
    // Coordinate card scrolling with stage visual transitions
    const cards = document.querySelectorAll('.scrolly-card');
    const graphics = document.querySelectorAll('.stage-graphic');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Deactivate previous cards and graphics
          cards.forEach(c => c.classList.remove('is-active'));
          graphics.forEach(g => g.classList.remove('is-active'));

          // Activate currently visible card and matched stage graphic
          entry.target.classList.add('is-active');
          const stageId = entry.target.getAttribute('data-stage');
          const targetGraphic = document.getElementById('stage-graphic-' + stageId);
          if (targetGraphic) {
            targetGraphic.classList.add('is-active');
          }
        }
      });
    }, {
      root: document.getElementById('main-scroll-container'),
      rootMargin: '-25% 0px -25% 0px',
      threshold: 0.2
    });

    cards.forEach(card => observer.observe(card));
  </script>
</body>
</html>
```

### Observe the Visual Win

Open `workspace-app/index.html` in your browser:
* Scroll the main content area downward.
* Watch how the right-hand stage stays securely anchored inside the viewport as the cards glide past.
* When Card 2 hits the center of the viewport, Card 1 dims, Card 2 lights up with an active cyan glow, and the stage graphic smoothly cross-fades into the green **Spatial Scale** diagram!
* Scroll down to Card 3: the stage transitions into the fiery **Composite Acceleration** diagram.
* Resize your browser window below `860px`: notice how the layout pivots into a mobile-friendly view with the sticky stage floating at the top of the screen!

```check
page workspace-app/index.html "document.querySelectorAll('.scrolly-card').length" "3" server=static
page workspace-app/index.html "document.querySelectorAll('.stage-graphic').length" "3" server=static
page workspace-app/index.html "document.querySelector('.scrolly-card.is-active') !== null" "true" server=static
```

---

## Your turn: add a fourth scrollytelling stage with interactive telemetry

Now extend the showcase with a 4th narrative beat:
1. Add a 4th card inside `<div class="scrolly-cards">`:
   - Give it class `scrolly-card telemetry-scrolly-card` and attribute `data-stage="4"`.
   - Set the step indicator to `04 / SYSTEM TELEMETRY`.
   - Set the heading to `Continuous Layout Auditing`.
   - Add a paragraph explaining that automated layout tests catch regressions and contrast violations before production deployment.
2. Add a corresponding 4th stage graphic inside `<aside class="scrolly-stage">`:
   - Give it class `stage-graphic` and id `stage-graphic-4`.
   - Inside it, place a `.stage-icon` with background `linear-gradient(135deg, #a855f7, #ec4899)` containing the emoji `📊`.
   - Add a `.stage-title` with `Automated Telemetry`.
   - Add a `.stage-code` displaying `vitest run --browser`.

Save `workspace-app/index.html` and reload your browser. Scroll down to verify that the fourth card activates and displays the new telemetry graphic.

```check
page workspace-app/index.html "document.querySelectorAll('.scrolly-card').length" "4" server=static
page workspace-app/index.html "document.querySelector('.telemetry-scrolly-card') !== null" "true" server=static
page workspace-app/index.html "document.getElementById('stage-graphic-4') !== null" "true" server=static
```

```hints
nudge: Add a fourth article with data-stage="4" inside scrolly-cards, and a fourth div with id="stage-graphic-4" inside scrolly-stage.
concept: The IntersectionObserver observes all elements with .scrolly-card automatically and links to the stage-graphic by matching data-stage with the element id.
shape: Add article class="scrolly-card telemetry-scrolly-card" data-stage="4", followed by div class="stage-graphic" id="stage-graphic-4".
```

---

## Diagnose, explain and review

### 🔬 Try This Experiment: Triggering the Overflow Trap

1. Open DevTools Elements panel.
2. Select `.app-main` or `.scrolly-section`.
3. In the Styles panel, temporarily add:
   ```css
   overflow-x: hidden;
   ```
4. Now scroll down through the cards.
5. **Notice what happened:** The sticky stage on the right stops sticking completely and rolls off the top of the screen!
6. Open your DevTools Console and run:
   ```javascript
   let el = document.querySelector('.scrolly-stage').parentElement;
   while (el) {
     const overflow = getComputedStyle(el).overflow;
     if (overflow !== 'visible') console.warn('Sticky killer found:', el, overflow);
     el = el.parentElement;
   }
   ```
   This one-liner is the industry-standard debugging script for instantly finding which ancestor element broke your sticky layout.
7. Uncheck `overflow-x: hidden` to restore sticky behavior.

Write in your journal:
1. Why does `position: sticky` stop sticking when an ancestor has `overflow: hidden`?
2. What role does `align-items: start` play on `.scrolly-grid`?
3. How does the responsive `@media (max-width: 860px)` rule allow you to pivot when product requirements change from desktop 2-column to mobile?

These checks establish that sticky positioning and stage attribute bindings are active in the DOM, but do not prove that high-latency GPU rasterization or mobile scroll hijacking behaves without testing across physical touch devices.

### Explain it without the reference

Close this tab and explain:
* The arithmetic of sticky travel distance ($\text{Parent Height} - \text{Element Height}$).
* Why `align-items: stretch` kills sticky movement in a CSS Grid row.
* How an `IntersectionObserver` with negative root margins creates an optical focal zone for activating narrative cards.
