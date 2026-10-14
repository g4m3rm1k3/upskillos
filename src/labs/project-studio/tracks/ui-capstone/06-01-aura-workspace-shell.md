---
title: 6.1 — The "Aura" Responsive Workspace Shell
track: CSS & Interface Engineering — Capstone Project
trackOrder: 45.51
runtime: none
---

Welcome to the Capstone. You have mastered spatial scale, modular typography, fluid `clamp()`, Flexbox distribution, 2D Grid, Subgrid, Container Queries, OKLCH perceptual colors, multi-layer diffuse shadows, dark mode elevation, interactive states, GPU-accelerated motion, and accessible forms.

Now, you will integrate everything into **Aura**: a studio-grade, production-ready productivity workspace.

You will build the application inside `aura-app/`.

### How to learn here

This capstone requires integrating all prior heuristics into a cohesive, high-performance web application. Build the application shell in this lesson, add the subgrid Kanban board in 6.2, and complete the production theme engine and audit in 6.3.

### The story so far

You have all the design tokens and layout tools. Now, you construct the master application shell that anchors the entire product.

```text
Spatial Tokens + 2D Shell Grid + Collapsible GPU Sidebar = Studio-Grade Application Frame
```

## Architect the production application shell

Create `aura-app/style.css` with the complete token foundation and application shell grid:

```css file=aura-app/style.css
:root {
  color-scheme: dark light;

  /* 4px/8px Spatial Scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* OKLCH Dark Surface Tokens */
  --color-canvas: oklch(13% 0.015 240);
  --color-surface: oklch(18% 0.02 240);
  --color-surface-card: oklch(22% 0.02 240);
  --color-surface-hover: oklch(26% 0.025 240);
  --color-border: oklch(25% 0.02 240);

  /* Typography */
  --color-text-primary: oklch(95% 0.01 240);
  --color-text-secondary: oklch(72% 0.015 240);
  --color-text-tertiary: oklch(50% 0.015 240);
  --color-brand: oklch(70% 0.20 245);
  --color-brand-glow: rgba(56, 189, 248, 0.15);

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

/* Master 2D Application Shell Grid */
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

/* Collapsed Sidebar State */
.aura-shell.sidebar-collapsed {
  grid-template-columns: 64px 1fr;
}

/* 1. Left Navigation Sidebar */
.aura-sidebar {
  grid-area: sidebar;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: 800;
  font-size: 1rem;
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
  flex: 0 0 auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-link:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.nav-link.active {
  background-color: var(--color-surface-hover);
  color: var(--color-brand);
  font-weight: 600;
}

/* 2. Top Navigation Bar */
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

.crumb-current {
  color: var(--color-text-primary);
  font-weight: 600;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.btn-icon {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

/* 3. Main Work Canvas */
.aura-canvas {
  grid-area: canvas;
  background-color: var(--color-canvas);
  padding: var(--space-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.canvas-title {
  font-size: 1.5rem;
  font-weight: 800;
}
```

```check
page aura-app/index.html "getComputedStyle(document.querySelector('.aura-shell')).display" "grid" server=static
page aura-app/index.html "document.querySelector('.aura-sidebar') !== null" "true" server=static
```

## Structure the shell markup

Create `aura-app/index.html`:

```html file=aura-app/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura · Workspace Shell</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="aura-shell" id="app-shell">
    <aside class="aura-sidebar">
      <div class="sidebar-header">
        <div class="brand-badge">
          <div class="brand-icon">A</div>
          <span class="brand-text">Aura Studio</span>
        </div>
        <button class="btn-icon" onclick="toggleSidebar()" title="Toggle Sidebar">☰</button>
      </div>

      <nav class="sidebar-nav">
        <a href="#board" class="nav-link active">Kanban Board</a>
        <a href="#backlog" class="nav-link">Sprint Backlog</a>
        <a href="#tokens" class="nav-link">Design Tokens</a>
        <a href="#settings" class="nav-link">Cluster Settings</a>
      </nav>
    </aside>

    <header class="aura-topbar">
      <div class="topbar-breadcrumbs">
        <span>Workspaces</span>
        <span>/</span>
        <span>Sprint 42</span>
        <span>/</span>
        <span class="crumb-current">Production Release</span>
      </div>

      <div class="topbar-actions">
        <button class="btn-icon">⚡ Deploy</button>
        <div style="width: 2rem; height: 2rem; border-radius: 9999px; background: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">JD</div>
      </div>
    </header>

    <main class="aura-canvas">
      <h1 class="canvas-title">Sprint 42: Production Polish</h1>
      <p style="color: var(--color-text-secondary); font-size: 0.875rem;">
        Master workspace shell initialized with collapsible 2D grid and internal scroll isolation.
      </p>
    </main>
  </div>

  <script>
    function toggleSidebar() {
      document.getElementById('app-shell').classList.toggle('sidebar-collapsed');
    }
  </script>
</body>
</html>
```

### Inspect the Shell Interaction

Open `aura-app/index.html` in your browser:
* Click the `☰` toggle button:
  * The sidebar transitions smoothly from `240px` down to `64px` using the CSS spring curve `grid-template-columns 0.25s var(--ease-spring)`.
  * The main canvas expands smoothly to fill the new free space without any layout jumps.

```check
page aura-app/index.html "document.querySelectorAll('.nav-link').length" "4" server=static
page aura-app/index.html "document.querySelector('.crumb-current').textContent" "Production Release" server=static
```

## Your turn: create an unboxed quick-stats pill

Add a quick stats container `<div class="quick-stats-row">` inside `.aura-canvas`.
Inside it, add two stat items with class `stat-pill`:
1. `Branch: release/v2.4`
2. `Coverage: 98.4%`

In `aura-app/style.css`, style `.quick-stats-row`:
* Use `display: flex`, `gap: var(--space-3)`.
* Give `.stat-pill` `background-color: var(--color-surface)`, `border: 1px solid var(--color-border)`, `padding: var(--space-1) var(--space-3)`, and `border-radius: var(--radius-full)`.

Save both files and verify.

```check
page aura-app/index.html "document.querySelectorAll('.stat-pill').length" "2" server=static
page aura-app/index.html "document.querySelector('.quick-stats-row') !== null" "true" server=static
```

```hints
nudge: Add a quick-stats-row div inside aura-canvas.
concept: Pill items reuse token padding and full border radius.
shape: Add div class="quick-stats-row" containing two div class="stat-pill" elements.
```

## Diagnose, explain and review

Open Developer Tools and inspect `.aura-shell`.
In the Elements panel, click the `grid` badge next to `.aura-shell` to reveal the grid overlay.
Click the sidebar toggle button and observe the grid tracks:
* Notice how the first column track dynamically interpolates between 240px and 64px.
* Notice that the canvas header does not jump, because `1fr` automatically handles the remaining available space.

Write in your learning journal:
1. Why does setting `grid-template-areas` make an application shell more stable than absolute positioning?
2. What allows the sidebar to smoothly animate width in a CSS Grid?
3. Why should the page body have `overflow: hidden` in application workspace layouts?

These checks establish that grid tracks, sidebar elements, and quick-stat DOM nodes are active, but do not prove that responsive drawer overlays on narrow mobile screens (320px) slide without clipping without mobile breakpoint tests.

### Explain it without the reference

Close this tab and explain:
* How the 2D shell grid separates the sidebar, topbar, and main canvas.
* How to smoothly collapse a sidebar in CSS Grid.
* Why application workspaces scroll panels internally rather than scrolling the body.
