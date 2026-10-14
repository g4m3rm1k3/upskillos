---
title: 2.3 — Subgrid Alignment and Container Queries
track: CSS & Interface Engineering — Layout Intuition
trackOrder: 45.13
runtime: none
---

Two of the most frustrating problems developers face in web layout are:
1. **Misaligned Card Actions:** You create a 3-column card grid. Card 1 has a short title and 2 lines of text. Card 2 has a long title and 5 lines of text. The bottom "Learn More" buttons sit at completely different vertical positions across the cards, looking crooked and amateur.
2. **Context-Blind Media Queries:** You build a card that switches to a horizontal layout at `min-width: 768px`. It looks great in the main content area. But when you place the same card inside a narrow 260px sidebar, the media query still triggers because the *browser window* is 1200px wide, causing the card to blow up horizontally inside the narrow sidebar!

Modern CSS solves these two fundamental issues with **Subgrid** and **Container Queries (`@container`)**.

Continue in `interface-studio/`, editing `workspace-app/`.

### The story so far

You have a 2D application shell. Now, you will master two cutting-edge features that make reusable components truly modular and pixel-aligned.

```text
Misaligned Card Rows → grid-template-rows: subgrid → Shared Vertical Rhythm
Window Breakpoints → container-type: inline-size + @container → Component-Owned Responsiveness
```

## Align nested elements with subgrid

### How Subgrid Solves Misaligned Cards

Previously in CSS Grid, a grid item's children lived in their own isolated layout context. If card 1 had more text than card 2, card 1's title grew tall while card 2's stayed short. The buttons at the bottom were never aligned.

With `subgrid`, a child card can declare:
```css
.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3; /* Header, Body, Footer */
}
```
Now, all card titles across the row share the exact same row track, all card bodies share the middle row track, and **all action buttons align on the exact same baseline across every card**!

### Container Queries: Component-Owned Responsiveness

Instead of listening to the global viewport, a container defines itself as a responsive boundary:
```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 450px) {
  .subgrid-card {
    /* Switches to horizontal layout only when ITS CONTAINER is wide enough */
  }
}
```

```predict
question: Why does subgrid allow buttons in adjacent cards to align horizontally, even when their text lengths differ?
choice: It forces all card paragraphs to be truncated with text-overflow: ellipsis
choice: It allows the cards' internal rows to inherit and lock into the parent grid's row tracks
answer: It allows the cards' internal rows to inherit and lock into the parent grid's row tracks
explain: Subgrid allows child elements to participate directly in the tracks of the parent grid. All titles take the height of the tallest title in that row, aligning the buttons below them.
```

Update `workspace-app/style.css` to implement Subgrid and Container Query cards:

```css file=workspace-app/style.css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --color-canvas: #090d16;
  --color-surface: #131b2e;
  --color-surface-card: #1c2640;
  --color-surface-hover: #263354;
  --color-border: #263354;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-brand: #38bdf8;
  --color-brand-glow: rgba(56, 189, 248, 0.15);

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  --font-family: system-ui, -apple-system, sans-serif;
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
  height: 100vh;
  overflow: hidden;
}

/* App Shell Grid */
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr 260px;
  grid-template-rows: 3.5rem 1fr;
  grid-template-areas:
    "nav     nav     nav"
    "sidebar main    inspector";
  height: 100vh;
}

.workspace-nav {
  grid-area: nav;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.nav-logo {
  width: 2rem;
  height: 2rem;
  background-color: var(--color-brand);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #090d16;
}

.nav-title {
  font-size: 0.875rem;
  font-weight: 600;
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

/* 1. Container Query Boundary: The parent element defines inline-size */
.component-container {
  container-type: inline-size;
  container-name: feed;
}

/* 2. Parent Subgrid Definition */
.subgrid-card-deck {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  /* 3 distinct rows: Header (auto), Body (1fr), Footer (auto) */
  grid-auto-rows: auto 1fr auto;
  gap: var(--space-4);
}

/* 3. The Subgrid Card: Spans 3 rows and uses subgrid */
.subgrid-card {
  grid-row: span 3;
  display: grid;
  grid-template-rows: subgrid;
  background-color: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  gap: var(--space-3);
}

.card-title-row {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.25;
}

.card-body-text {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.card-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.btn-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

/* 4. Container Query Mutation: When the container exceeds 600px */
@container feed (min-width: 600px) {
  .subgrid-card-deck {
    gap: var(--space-6);
  }
}
```

```check
page workspace-app/index.html "getComputedStyle(document.querySelector('.component-container')).containerType" "inline-size" server=static
page workspace-app/index.html "getComputedStyle(document.querySelector('.subgrid-card')).gridRow.includes('span 3')" "true" server=static
```

## Implement the Subgrid card layout

Update `workspace-app/index.html` to add the subgrid cards:

```html file=workspace-app/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Studio · Subgrid Alignment</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app-shell">
    <header class="workspace-nav">
      <div class="nav-brand-group">
        <div class="nav-logo">A</div>
        <span class="nav-title">Aura Studio</span>
      </div>
    </header>

    <aside class="app-sidebar">
      <span style="font-size: 0.75rem; color: #94a3b8;">Workspace Navigation</span>
    </aside>

    <main class="app-main">
      <div class="component-container">
        <section class="subgrid-card-deck">
          <!-- Card 1: Short text -->
          <article class="subgrid-card">
            <h2 class="card-title-row">Component Token Spec</h2>
            <p class="card-body-text">
              Atomic definitions for color, radius, and elevation tokens.
            </p>
            <div class="card-action-bar">
              <span style="font-size: 0.75rem; color: #94a3b8;">Status: Active</span>
              <button class="btn-card">Inspect</button>
            </div>
          </article>

          <!-- Card 2: Extremely long text -->
          <article class="subgrid-card">
            <h2 class="card-title-row">
              Global Responsive Fluid Scale Engine with Continuous Viewport Interpolation
            </h2>
            <p class="card-body-text">
              Calculates clamp mathematical functions to scale typography, margins, and gutters across all display categories from 320px to 4K without media query fragmentation or abrupt layout shifts.
            </p>
            <div class="card-action-bar">
              <span style="font-size: 0.75rem; color: #94a3b8;">Status: In Review</span>
              <button class="btn-card">Inspect</button>
            </div>
          </article>
        </section>
      </div>
    </main>

    <aside class="app-inspector">
      <h2 style="font-size: 0.875rem; font-weight: 600;">Subgrid Inspector</h2>
      <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem;">
        Notice that Card 1 and Card 2 action bars stay perfectly locked on the exact same horizontal baseline despite the massive text difference.
      </p>
    </aside>
  </div>
</body>
</html>
```

### Observe the Visual Win

Look at the bottom action bars in your browser:
* Card 1 has only 1 line of title and 2 lines of description.
* Card 2 has 2 lines of title and 5 lines of description.
* Because both cards use `grid-row: span 3` and `grid-template-rows: subgrid`, Card 1's title track stretches to match Card 2's title track, and Card 1's body track stretches to match Card 2's body track.
* **The buttons sit on the exact same horizontal baseline across the entire screen!**

```check
page workspace-app/index.html "document.querySelectorAll('.subgrid-card').length" "2" server=static
page workspace-app/index.html "document.querySelectorAll('.btn-card').length" "2" server=static
```

## Your turn: create an unboxed stats card

Add a third article inside `<section class="subgrid-card-deck">`.
Give it the class `subgrid-card stats-subgrid-card`.
Inside this card, provide:
1. A `<h2 class="card-title-row">` with the text `Performance Benchmark`.
2. A `<p class="card-body-text">` explaining that Subgrid avoids complex JavaScript height calculation hacks (`offsetHeight`).
3. A `<div class="card-action-bar">` containing a status span `99.9% Pass` and a button `<button class="btn-card">Run Tests</button>`.

Save both files and reload. Confirm that all three cards share identical row baselines.

```check
page workspace-app/index.html "document.querySelectorAll('.subgrid-card').length" "3" server=static
page workspace-app/index.html "document.querySelector('.stats-subgrid-card') !== null" "true" server=static
```

```hints
nudge: Add a third article element inside subgrid-card-deck.
concept: Sibling cards with the same span 3 subgrid rules automatically align to the row's tallest cell.
shape: Add article class="subgrid-card stats-subgrid-card" with card-title-row, card-body-text, and card-action-bar.
```

## Diagnose, explain and review

Open Developer Tools and inspect `.subgrid-card`.
In the Styles panel, toggle off `grid-template-rows: subgrid`.
Observe what happens:
* Without subgrid, each card collapses to its own internal content height.
* Card 1's button jumps upward, creating a jagged, uneven, amateur appearance across the grid.
* Re-enable `grid-template-rows: subgrid`: the buttons instantly snap back into uniform horizontal alignment.

Write in your journal:
1. Why does `grid-template-rows: subgrid` succeed at card alignment where Flexbox fails?
2. What is the fundamental difference between `@media` and `@container`?
3. What CSS property must be placed on the parent to turn it into a queryable container?

These checks establish that subgrid row spanning and container query types are parsed by the browser engine, but do not prove that browser compatibility fallbacks or legacy rendering engines operate identically without automated cross-browser testing.

### Explain it without the reference

Close this tab and explain:
* How Subgrid solves the misaligned button row problem.
* Why `container-type: inline-size` allows components to be dropped into sidebars, dialogs, or main pages without breaking.
* The syntax structure of `@container` queries.
