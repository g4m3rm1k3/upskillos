---
title: 6.3 — Production Polish, Theme Engine and Accessibility Audit
track: CSS & Interface Engineering — Capstone Project
trackOrder: 45.53
runtime: none
---

Congratulations on reaching the final lesson of **CSS & Interface Engineering Mastery**.

You started with a blank folder and the frustrating reality of "hacked-together developer UIs." Across these chapters, you transformed that frustration into deep, systematic mastery:
1. **The Spatial Grid:** Replacing arbitrary pixel guesses with the 4px/8px mathematical rhythm.
2. **Typographic Hierarchy:** Constraining measure to 65ch, optical line-heights, and negative display tracking.
3. **Fluid Layouts:** Mathematical `clamp()` functions instead of brittle breakpoint tangles.
4. **Layout Intuition:** Flexbox distribution, the `min-width: 0` trap, 2D CSS Grid, and Subgrid row locks.
5. **Color & Depth Physics:** OKLCH perceptual lightness, multi-layer diffuse shadows, and dark mode surface luminance.
6. **Interaction & Forms:** The 7-state matrix, `:focus-visible` rings, GPU compositor motion, and zero-shift forms.

In this finale, you will apply the **Production Polish Checklist**, complete the dual-theme engine for the Aura application, and execute an accessibility and design audit.

Finish your capstone in `aura-app/`.

### The story so far

You have built the shell and the Kanban board. Now, you complete the theme engine, keyboard navigation shortcuts, and production polish.

```text
The Interface Engineering Journey:
Arbitrary Guesswork ──► Systematic Heuristics ──► Production-Grade Studio Polish
```

## Execute the production theme engine

Update `aura-app/style.css` to add the full dual-theme token overrides:

```css file=aura-app/style.css
:root {
  color-scheme: dark light;

  /* Spatial Scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* DARK THEME (Default) */
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

  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.35);

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --font-family: system-ui, -apple-system, sans-serif;
}

/* LIGHT THEME OVERRIDES */
[data-theme="light"] {
  --color-canvas: oklch(98% 0.005 240);
  --color-surface: oklch(100% 0 0);
  --color-surface-card: oklch(99% 0.005 240);
  --color-surface-hover: oklch(95% 0.01 240);
  --color-border: oklch(90% 0.01 240);
  --color-border-subtle: oklch(94% 0.005 240);

  --color-text-primary: oklch(20% 0.02 240);
  --color-text-secondary: oklch(46% 0.02 240);
  --color-text-tertiary: oklch(65% 0.015 240);
  --color-brand: oklch(56% 0.22 250);
  --color-brand-tint: rgba(37, 99, 235, 0.08);

  --shadow-card:
    0 1px 3px 0 rgba(15, 23, 42, 0.05),
    0 4px 10px -2px rgba(15, 23, 42, 0.06);
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
  transition: background-color 0.2s ease, color 0.2s ease;
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

.nav-link:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.nav-link.active {
  background-color: var(--color-surface-hover);
  color: var(--color-brand);
  font-weight: 600;
}

.nav-link:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
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

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.btn-theme-toggle {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  cursor: pointer;
}

.btn-theme-toggle:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

.aura-canvas {
  grid-area: canvas;
  background-color: var(--color-canvas);
  padding: var(--space-6);
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

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
  box-shadow: var(--shadow-card);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.kanban-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-brand);
}

.kanban-card:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

.card-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  align-self: flex-start;
  text-transform: uppercase;
  background-color: var(--color-brand-tint);
  color: var(--color-brand);
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
page aura-app/index.html "getComputedStyle(document.documentElement).colorScheme" "dark light" server=static
page aura-app/index.html "document.querySelector('.btn-theme-toggle') !== null" "true" server=static
```

## Deploy the complete production application

Update `aura-app/index.html` with the theme toggle button and full application structure:

```html file=aura-app/index.html
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura · Production Workspace</title>
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
        <a href="#board" class="nav-link active" tabindex="0">Kanban Board</a>
        <a href="#backlog" class="nav-link" tabindex="0">Sprint Backlog</a>
        <a href="#tokens" class="nav-link" tabindex="0">Design Tokens</a>
      </nav>
    </aside>

    <header class="aura-topbar">
      <div class="topbar-breadcrumbs">
        <span>Aura Core</span> / <span style="font-weight: 600;">Production Release</span>
      </div>

      <div class="topbar-actions">
        <button class="btn-theme-toggle" onclick="toggleTheme()" id="theme-btn">
          Theme: Dark
        </button>
      </div>
    </header>

    <main class="aura-canvas">
      <section class="kanban-board">
        <div class="kanban-column">
          <div class="column-header">
            <span class="column-title">Ready for Ship</span>
          </div>
          <div class="column-cards">
            <article class="kanban-card" tabindex="0">
              <span class="card-tag">Architecture</span>
              <h3 class="card-title">CSS & Interface Engineering Mastery Completed</h3>
              <div class="card-footer">
                <span>Release-1.0</span>
                <span>Audit: 100% Pass</span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      document.getElementById('theme-btn').textContent = 'Theme: ' + (isDark ? 'Light' : 'Dark');
    }
  </script>
</body>
</html>
```

### The Production Polish Audit

Open `aura-app/index.html` in your browser and run through the audit:
1. **The Spatial Check:** Every padding, gap, and margin adheres to `--space-1` through `--space-8`.
2. **The Contrast Check:** Click **Theme: Dark** to toggle between Light and Dark mode. Both modes maintain readable contrast against their surfaces.
3. **The Keyboard Check:** Press the **Tab** key to navigate through the sidebar links, the theme toggle, and the Kanban card. Every interactive item receives a sharp focus ring.
4. **The Layout Check:** Smoothly resize the browser window. The layout adapts continuously with zero horizontal clipping on the main shell.

```check
page aura-app/index.html "document.querySelector('.kanban-card') !== null" "true" server=static
page aura-app/index.html "document.getElementById('theme-btn').textContent.includes('Theme:')" "true" server=static
```

## Your turn: create an unboxed audit badge

Add an audit indicator `<div class="audit-badge">` inside `.topbar-breadcrumbs`, right next to `Production Release`.
In `aura-app/style.css`, style `.audit-badge`:
* Use `display: inline-flex`, `align-items: center`, `gap: var(--space-1)`.
* Give it a green background tint, green text, and a checkmark `✓ WCAG 2.2 Verified`.

Save both files and verify the audit badge appears in the top bar.

```check
page aura-app/index.html "document.querySelector('.audit-badge') !== null" "true" server=static
page aura-app/index.html "document.querySelector('.audit-badge').textContent.includes('WCAG')" "true" server=static
```

```hints
nudge: Add an audit-badge element inside topbar-breadcrumbs.
concept: Status badges in breadcrumbs provide immediate environmental context.
shape: Add span class="audit-badge" with text ✓ WCAG 2.2 Verified inside topbar-breadcrumbs.
```

## Diagnose, explain and review

Open Developer Tools and inspect `aura-app/index.html`.
Run Lighthouse or Accessibility inspection:
* Note that all buttons and links have visible text or labels.
* Notice that color contrast meets WCAG AA standards in both Light and Dark themes.
* Notice that no arbitrary pixel margins or heavy black boxes remain.

Write in your final learning journal entry:
1. What was the single most impactful design heuristic you learned in this series?
2. How does building on design tokens prevent visual debt from accumulating over time?
3. What is the difference between designing with decorative guesswork versus designing with spatial mathematics?

These checks establish that the complete capstone shell, theme toggle, and Kanban board elements are rendered, but do not replace direct human peer review, end-user usability testing, and cross-browser visual verification on real mobile devices.

### Explain it without the reference

Close this tab and deliver a 2-minute architectural walkthrough:
* How you eliminated "box-itis" using the 4px/8px spatial grid and Gestalt proximity.
* How Flexbox and CSS Grid divide responsibilities between 1D components and 2D application views.
* How OKLCH and surface luminance govern professional dark mode design.
* How hardware acceleration and accessible focus states make an interface feel responsive and alive.
