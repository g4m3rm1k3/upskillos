---
title: 6.2 — Dynamic Subgrid Kanban and Detail Inspector
track: CSS & Interface Engineering — Capstone Project
trackOrder: 45.52
runtime: none
---

Kanban boards are notoriously difficult to build cleanly in CSS:
* Columns must scroll vertically while the board as a whole scrolls horizontally if there are many columns.
* Task cards have variable title lengths, yet priority tags, assignees, and comment counts must align horizontally.
* Clicking a card should smoothly open a contextual slide-over Inspector panel without breaking the board layout.

In this lesson, you will build a **production Kanban board** utilizing **CSS Subgrid**, horizontal scrolling containers, and an interactive Inspector panel.

Continue in `interface-studio/`, editing `aura-app/`.

### The story so far

In lesson 6.1, you constructed the 2D workspace shell. Now, you will build the primary workload interface: an interactive Kanban board.

```text
Horizontal Board Container → Vertical Column Tracks → Subgrid Cards (Aligned Baselines)
```

## Construct the Subgrid Kanban board

```predict
question: Why is subgrid declared on the card rather than on the column container?
choice: The card is the child element that needs to participate in the parent column's row tracks
choice: It forces the parent column to convert into an inline-flex element
answer: The card is the child element that needs to participate in the parent column's row tracks
explain: The parent column establishes the grid tracks, and the child card declares grid-template-rows: subgrid to lock its internal items (title, tags, actions) directly into those tracks.
```

Update `aura-app/style.css` to add the Kanban board and card rules:

```css file=aura-app/style.css
:root {
  color-scheme: dark light;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --color-canvas: oklch(13% 0.015 240);
  --color-surface: oklch(18% 0.02 240);
  --color-surface-card: oklch(22% 0.02 240);
  --color-surface-hover: oklch(26% 0.025 240);
  --color-border: oklch(25% 0.02 240);
  --color-border-subtle: oklch(20% 0.015 240);

  --color-text-primary: oklch(95% 0.01 240);
  --color-text-secondary: oklch(72% 0.015 240);
  --color-text-tertiary: oklch(50% 0.015 240);
  --color-brand: oklch(70% 0.20 245);
  --color-brand-tint: rgba(56, 189, 248, 0.12);
  --color-warning: oklch(75% 0.18 75);
  --color-warning-tint: rgba(245, 158, 11, 0.12);

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
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

.aura-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 3.5rem 1fr;
  grid-template-areas:
    "sidebar topbar"
    "sidebar canvas";
  height: 100vh;
  transition: grid-template-columns 0.25s var(--ease-spring);
}

.aura-shell.sidebar-collapsed {
  grid-template-columns: 64px 1fr;
}

.aura-sidebar {
  grid-area: sidebar;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: 800;
}

.brand-icon {
  width: 2rem;
  height: 2rem;
  background-color: var(--color-brand);
  color: #090d16;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-link {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
}

.nav-link.active {
  background-color: var(--color-surface-hover);
  color: var(--color-brand);
  font-weight: 600;
}

.aura-topbar {
  grid-area: topbar;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.topbar-breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.aura-canvas {
  grid-area: canvas;
  background-color: var(--color-canvas);
  padding: var(--space-6);
  overflow-x: auto; /* Board scrolls horizontally */
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* 1. Kanban Board Horizontal Flow */
.kanban-board {
  display: flex;
  gap: var(--space-6);
  height: 100%;
  align-items: flex-start;
  padding-bottom: var(--space-4);
}

.kanban-column {
  width: 20rem;
  min-width: 20rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
}

.column-title {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.column-count {
  font-size: 0.75rem;
  background-color: var(--color-surface-hover);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}

/* 2. Subgrid Card Stack */
.column-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
  padding-right: var(--space-1);
}

.kanban-card {
  background-color: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.kanban-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-brand);
  box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.4);
}

.card-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  align-self: flex-start;
  text-transform: uppercase;
}

.tag-brand {
  background-color: var(--color-brand-tint);
  color: var(--color-brand);
}

.tag-warning {
  background-color: var(--color-warning-tint);
  color: var(--color-warning);
}

.card-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--color-text-primary);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-2);
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}
```

```check
page aura-app/index.html "document.querySelectorAll('.kanban-column').length" "2" server=static
page aura-app/index.html "document.querySelectorAll('.kanban-card').length" "3" server=static
```

## Structure the Kanban markup

Update `aura-app/index.html` with the Kanban board:

```html file=aura-app/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura · Subgrid Kanban</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="aura-shell" id="app-shell">
    <aside class="aura-sidebar">
      <div class="brand-badge">
        <div class="brand-icon">A</div>
        <span>Aura Studio</span>
      </div>
      <nav class="sidebar-nav">
        <a href="#board" class="nav-link active">Kanban Board</a>
        <a href="#backlog" class="nav-link">Sprint Backlog</a>
        <a href="#tokens" class="nav-link">Design Tokens</a>
      </nav>
    </aside>

    <header class="aura-topbar">
      <div class="topbar-breadcrumbs">
        <span>Aura Core</span> / <span style="color: #f8fafc; font-weight: 600;">Active Sprint</span>
      </div>
    </header>

    <main class="aura-canvas">
      <section class="kanban-board">
        <!-- Column 1: In Progress -->
        <div class="kanban-column">
          <div class="column-header">
            <span class="column-title">In Progress</span>
            <span class="column-count">2</span>
          </div>
          <div class="column-cards">
            <article class="kanban-card">
              <span class="card-tag tag-brand">Layout</span>
              <h3 class="card-title">Migrate workspace cards to CSS Subgrid alignment</h3>
              <div class="card-footer">
                <span>Task-104</span>
                <span>Assignee: JD</span>
              </div>
            </article>

            <article class="kanban-card">
              <span class="card-tag tag-warning">Color</span>
              <h3 class="card-title">Refactor color tokens to OKLCH perceptual space</h3>
              <div class="card-footer">
                <span>Task-108</span>
                <span>Assignee: MK</span>
              </div>
            </article>
          </div>
        </div>

        <!-- Column 2: Review -->
        <div class="kanban-column">
          <div class="column-header">
            <span class="column-title">Ready for Review</span>
            <span class="column-count">1</span>
          </div>
          <div class="column-cards">
            <article class="kanban-card">
              <span class="card-tag tag-brand">A11y</span>
              <h3 class="card-title">Verify :focus-visible outlines meet WCAG 2.2 AA</h3>
              <div class="card-footer">
                <span>Task-112</span>
                <span>Assignee: JD</span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  </div>
</body>
</html>
```

### Inspect the Horizontal Board Architecture

Open `aura-app/index.html` in your browser:
* The Kanban board columns stand side-by-side with crisp 20rem widths.
* Each column's card stack scrolls independently if cards overflow vertically.
* Hovering over any card lifts it smoothly with `translateY(-2px)` and highlights the brand border.

```check
page aura-app/index.html "document.querySelectorAll('.card-tag').length" "3" server=static
page aura-app/index.html "document.querySelector('.column-count').textContent" "2" server=static
```

## Your turn: create a "Done" column with an unboxed card

Add a third column inside `<section class="kanban-board">`.
Give it:
1. A column header with title `Done` and count `1`.
2. A card inside `.column-cards` with `<span class="card-tag tag-brand">Deploy</span>`.
3. A title: `Automated zero-layout-shift verification suite`.
4. A card footer with `Task-099` and `Assignee: Core`.

Save both files and reload.

```check
page aura-app/index.html "document.querySelectorAll('.kanban-column').length" "3" server=static
page aura-app/index.html "document.querySelectorAll('.kanban-card').length" "4" server=static
```

```hints
nudge: Add a third kanban-column div inside kanban-board.
concept: Sibling columns participate in the horizontal flex flow.
shape: Add div class="kanban-column" with column-header and column-cards containing one kanban-card article.
```

## Diagnose, explain and review

Open Developer Tools and inspect `.kanban-column`.
In the Styles panel, remove `min-width: 20rem` and set `flex: 1`.
Observe what happens when you add 5 columns:
* The columns get crushed horizontally into skinny, unreadable ribbons.
* Restore `min-width: 20rem` and `flex: 0 0 auto`: the columns preserve their optimal reading widths and trigger comfortable horizontal scrolling.

Write in your learning journal:
1. Why must Kanban columns declare an explicit `min-width`?
2. How does combining `overflow-x: auto` on the canvas with `overflow-y: auto` on columns prevent page-level jitter?
3. How do semantic tags like `tag-brand` and `tag-warning` communicate status without visual noise?

These checks establish that Kanban columns, card counts, and tag classes exist in the document, but do not prove that HTML5 Drag and Drop or touch swipe interactions operate smoothly without pointer scripting.

### Explain it without the reference

Close this tab and explain:
* How to structure a multi-column Kanban board with horizontal scrolling.
* Why individual columns should scroll vertically while the board scrolls horizontally.
* How card lift transforms and diffuse shadows provide tactile hover feedback.
