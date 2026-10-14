---
title: 2.2 — 2D Grid Architecture, auto-fit and minmax()
track: CSS & Interface Engineering — Layout Intuition
trackOrder: 45.12
runtime: none
---

Flexbox is designed for 1-dimensional layouts (a single row OR a single column). When developers try to build complex 2-dimensional layouts—like an application shell with a sidebar, top bar, main canvas, and inspector panel—using only Flexbox, their markup becomes a convoluted maze of nested container divs and fragile percentage widths (`width: calc(33.33% - 1rem)`).

CSS Grid was created specifically to solve 2-dimensional layouts from first principles.

In this lesson, you will learn how to architect a complete application layout using **CSS Grid, `grid-template-areas`**, and the responsive formula: **`repeat(auto-fit, minmax(...))`**.

Continue in `interface-studio/`, editing `workspace-app/`.

### The story so far

In lesson 2.1, you mastered Flexbox distribution for the top navigation bar. Now, you will build the complete 2D application workspace surrounding it.

```text
1D Flow (Flexbox) for Components → 2D Structural Grid for Application Views & Dashboards
```

## Architect the 2D workspace grid

### 1. `auto-fit` vs `auto-fill` with `minmax()`

The single most powerful responsive formula in CSS is:
```css
grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
```
* `minmax(260px, 1fr)`: A column cannot shrink below `260px`. Any extra space expands up to `1fr` (fraction of free space).
* `auto-fit`: Calculates how many 260px columns fit on screen. If you have 2 items on a wide 1200px screen, `auto-fit` **expands the two items to fill the entire width**, eliminating ugly empty gutters!
* `auto-fill`: Conversely, reserves ghost slots for potential future items, leaving empty space on the right.

### 2. Structural Application Shell with Named Areas

Instead of hacking margins, you can define your application layout as an ASCII-like map using `grid-template-areas`:
```css
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "nav     nav     nav"
    "sidebar main    inspector";
}
```
Any child element can then be assigned directly to its area:
```css
.workspace-nav { grid-area: nav; }
.app-sidebar   { grid-area: sidebar; }
.app-main      { grid-area: main; }
.app-inspector { grid-area: inspector; }
```

```predict
question: What does auto-fit do differently than auto-fill when there are fewer grid items than available column slots?
choice: auto-fit drops the extra column tracks and stretches existing items to fill the row
choice: auto-fit forces all items to wrap onto separate rows
answer: auto-fit drops the extra column tracks and stretches existing items to fill the row
explain: auto-fit collapses empty column tracks so the existing items expand across the full width, whereas auto-fill preserves empty tracks.
```

Update `workspace-app/style.css` to build the complete grid application shell:

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
  overflow: hidden; /* App viewports scroll internally, not the body */
}

/* 1. Complete App Shell Grid */
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr 260px;
  grid-template-rows: 3.5rem 1fr;
  grid-template-areas:
    "nav     nav     nav"
    "sidebar main    inspector";
  height: 100vh;
}

/* Top Navigation Area */
.workspace-nav {
  grid-area: nav;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.nav-brand-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 0 0 auto;
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

.nav-search-container {
  flex: 1 1 0%;
  min-width: 0;
  max-width: 28rem;
}

.search-input {
  width: 100%;
  background-color: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  outline: none;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 0 0 auto;
}

.user-avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-full);
  background-color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* 2. Left Sidebar */
.app-sidebar {
  grid-area: sidebar;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow-y: auto;
}

.sidebar-heading {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
}

.sidebar-item.active {
  background-color: var(--color-surface-hover);
  color: var(--color-brand);
}

/* 3. Main Work Canvas: Scrollable Grid Container */
.app-main {
  grid-area: main;
  background-color: var(--color-canvas);
  padding: var(--space-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.canvas-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.canvas-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.canvas-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* 4. Responsive Card Matrix with auto-fit & minmax */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
}

.metric-card {
  background-color: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.metric-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-text-primary);
}

/* 5. Right Inspector Panel */
.app-inspector {
  grid-area: inspector;
  background-color: var(--color-surface);
  border-left: 1px solid var(--color-border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}

.inspector-title {
  font-size: 0.875rem;
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-2);
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.property-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.property-value {
  font-size: 0.8125rem;
  font-weight: 600;
}
```

```check
page workspace-app/index.html "getComputedStyle(document.querySelector('.app-shell')).display" "grid" server=static
page workspace-app/index.html "getComputedStyle(document.querySelector('.app-shell')).gridTemplateAreas.includes('sidebar')" "true" server=static
```

## Construct the multi-panel markup

Update `workspace-app/index.html` to declare the four grid areas:

```html file=workspace-app/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Studio · Application Workspace</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app-shell">
    <header class="workspace-nav">
      <div class="nav-brand-group">
        <div class="nav-logo">A</div>
        <span class="nav-title">Aura Studio</span>
      </div>
      <div class="nav-search-container">
        <input type="search" class="search-input" placeholder="Jump to command (Cmd+K)...">
      </div>
      <div class="nav-actions">
        <div class="user-avatar">JD</div>
      </div>
    </header>

    <aside class="app-sidebar">
      <span class="sidebar-heading">Navigation</span>
      <a href="#overview" class="sidebar-item active">Overview</a>
      <a href="#components" class="sidebar-item">Components</a>
      <a href="#tokens" class="sidebar-item">Design Tokens</a>
      <a href="#analytics" class="sidebar-item">Telemetry</a>
    </aside>

    <main class="app-main">
      <div class="canvas-header">
        <h1 class="canvas-title">Interface Engineering Overview</h1>
        <p class="canvas-subtitle">System metrics, active component allocations, and spatial geometry.</p>
      </div>

      <section class="dashboard-grid">
        <article class="metric-card">
          <span class="metric-title">Active Tokens</span>
          <div class="metric-value">148</div>
        </article>
        <article class="metric-card">
          <span class="metric-title">Render Latency</span>
          <div class="metric-value">2.4ms</div>
        </article>
        <article class="metric-card">
          <span class="metric-title">Contrast Ratio</span>
          <div class="metric-value">8.4:1</div>
        </article>
      </section>
    </main>

    <aside class="app-inspector">
      <h2 class="inspector-title">Inspector</h2>
      <div class="property-group">
        <span class="property-label">Selected Node</span>
        <span class="property-value">.dashboard-grid</span>
      </div>
      <div class="property-group">
        <span class="property-label">Grid Mode</span>
        <span class="property-value">auto-fit (minmax: 240px)</span>
      </div>
      <div class="property-group">
        <span class="property-label">Layout Dimension</span>
        <span class="property-value">2D Simultaneous</span>
      </div>
    </aside>
  </div>
</body>
</html>
```

### Inspect Internal Scroll Regions

Notice line 35 of `style.css`:
```css
body {
  height: 100vh;
  overflow: hidden;
}
```
In real modern web apps (like VS Code, Figma, Slack, Linear), the browser window itself does not scroll. Instead, the grid assigns `overflow-y: auto` to independent panels (`.app-sidebar`, `.app-main`, `.app-inspector`). The sidebar and inspector stay pinned in place while the central canvas scrolls effortlessly!

```check
page workspace-app/index.html "document.querySelectorAll('.metric-card').length" "3" server=static
page workspace-app/index.html "document.querySelector('.app-inspector') !== null" "true" server=static
```

## Your turn: create a spans-all status bar

Add a bottom status bar `<footer class="app-statusbar">` to the workspace.
Update `.app-shell` in `workspace-app/style.css` so that:
1. `grid-template-rows` becomes `3.5rem 1fr 1.75rem` (header, content, status bar).
2. `grid-template-areas` includes a bottom row `"status status status"` spanning across all three columns.
3. `.app-statusbar` has `grid-area: status`, subtle border-top, background color `var(--color-surface)`, and displays `Status: Online · UTF-8 · 60fps`.

Save both files and verify the layout.

```check
page workspace-app/index.html "document.querySelector('.app-statusbar') !== null" "true" server=static
page workspace-app/index.html "getComputedStyle(document.querySelector('.app-statusbar')).gridArea.includes('status')" "true" server=static
```

```hints
nudge: Add a third row to the grid-template-areas property in style.css.
concept: Named grid areas can be repeated across columns to create an element that spans the full row.
shape: In style.css, update grid-template-rows and grid-template-areas to add status across all three columns, then add footer class="app-statusbar" in index.html.
```

## Diagnose, explain and review

Open Developer Tools and inspect `.dashboard-grid`.
In the Styles panel, change `repeat(auto-fit, minmax(240px, 1fr))` to `repeat(auto-fill, minmax(240px, 1fr))`.
Observe the difference:
* With `auto-fill`, when your window is wide, the 3 cards stop expanding and leave empty ghost columns on the right.
* With `auto-fit`, the 3 cards expand gracefully to consume the entire horizontal space.

Write in your journal:
1. Why does `grid-template-areas` make application shells cleaner to maintain than nested flexbox divs?
2. What is the practical difference between `auto-fit` and `auto-fill`?
3. How do independent `overflow-y: auto` containers prevent the entire page body from jumping during scroll?

These checks establish that CSS Grid template areas and dashboard metric cards are rendered, but do not prove that drag-to-resize splitters or responsive collapsible sidebars operate properly without specialized scripting.

### Explain it without the reference

Close this tab and explain:
* When to choose CSS Grid over Flexbox.
* How `repeat(auto-fit, minmax(240px, 1fr))` creates responsive multi-column layouts without media queries.
* How `grid-template-areas` maps ASCII strings to visual page regions.
