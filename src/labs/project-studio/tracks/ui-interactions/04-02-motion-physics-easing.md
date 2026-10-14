---
title: 4.2 — Motion Physics, Cubic-Bezier Curves and Hardware Acceleration
track: CSS & Interface Engineering — Interaction Design and Micro-States
trackOrder: 45.32
runtime: none
---

Adding animation to a website can either make it feel like a polished, high-performance operating system or a sluggish, stuttering mess.

The two main pitfalls developers encounter with CSS motion are:
1. **Robotic Easing & Sluggish Durations:** Using `transition: all 0.5s linear`. Real objects in the physical universe never start and stop abruptly at constant speed. Furthermore, animations lasting longer than 300ms frustrate users by making the app feel slow.
2. **Layout Thrashing:** Animating properties like `width`, `height`, `top`, or `margin`. Every single millisecond of that transition forces the browser's CPU to recalculate page geometry and repaint pixels across the document, causing dropped frames (jank).

In this lesson, you will learn the **physics of UI motion**, **GPU hardware acceleration**, and how to craft spring-like **`cubic-bezier()`** easing curves.

Continue in `interface-studio/`, editing `component-kit/`.

### The story so far

In lesson 4.1, you engineered interactive component states. Now, you will master the physics of transition timing, GPU compositor layers, and accessible motion.

```text
CPU Layout Thrashing (top, left, width) ──► GPU Compositor Acceleration (transform, opacity)
Linear / Ease (Mechanical) ──► Custom Cubic-Bezier (Physical Deceleration)
```

## Master motion physics and compositor acceleration

### 1. The Perceived Performance Timing Rules

Human perception reacts to visual feedback within specific psychological thresholds:
* **0ms to 100ms:** Perceived as instantaneous.
* **150ms to 250ms:** The **golden window** for micro-interactions (dropdowns, button clicks, hover fades, modal entries). It feels responsive and snappy without being invisible.
* **Over 350ms:** Perceived as sluggish. Users will feel like the software is lagging.

### 2. GPU Hardware Acceleration vs Layout Thrashing

When animating elements, only two CSS properties run exclusively on the **GPU compositor thread**:
$$\text{transform} \quad\text{and}\quad \text{opacity}$$

* If you slide an element using `left: 100px`, the browser runs: **JavaScript → Style → Layout → Paint → Composite** on every single frame!
* If you slide an element using `transform: translateX(100px)`, the browser runs: **Composite only**. The element is rendered on its own GPU texture, bypassing layout and paint entirely. It stays pinned at 60fps/120fps even under heavy CPU load!

### 3. The Natural Deceleration Curve

`ease` and `linear` feel artificial. Real objects decelerate smoothly when coming to a stop.
The industry-standard deceleration curve is:
```css
/* Snappy entry: Fast launch, gentle deceleration */
transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
```

### 4. Accessible Motion: `prefers-reduced-motion`

Users with vestibular disorders or motion sensitivity can experience nausea from parallax and sliding animations. Always respect their operating system preference:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

```predict
question: Why does animating transform: translateY(-4px) achieve smooth 60fps performance while top: -4px often causes stuttering?
choice: Because transform is offloaded to the GPU compositor thread without triggering document layout recalculation
choice: Because transform automatically lowers the display resolution
answer: Because transform is offloaded to the GPU compositor thread without triggering document layout recalculation
explain: transform does not affect document geometry, so the browser can composite it entirely on the GPU without recalculating page layout or repainting pixels.
```

Update `component-kit/style.css` to add the motion engine and interactive drawer:

```css file=component-kit/style.css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --color-canvas: #0f172a;
  --color-surface: #1e293b;
  --color-surface-raised: #334155;
  --color-border: #334155;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-brand: #38bdf8;
  --color-brand-hover: #0284c7;

  /* Physics-based Easing Curves */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  /* Micro-Interaction Timing Tokens */
  --duration-instant: 100ms;
  --duration-snappy: 200ms;
  --duration-gentle: 300ms;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

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
  padding: var(--space-8);
  min-height: 100vh;
}

.kit-container {
  max-width: 48rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.kit-title {
  font-size: 1.75rem;
  font-weight: 800;
}

/* 1. Hardware-Accelerated Interactive Cards */
.motion-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.motion-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  cursor: pointer;
  will-change: transform; /* Signals GPU compositor layer preparation */

  /* Hardware-accelerated properties with custom cubic-bezier */
  transition:
    transform var(--duration-snappy) var(--ease-out-expo),
    box-shadow var(--duration-snappy) var(--ease-out-expo),
    border-color var(--duration-snappy) var(--ease-out-expo);
}

.motion-card:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: var(--color-brand);
  box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.35);
}

.motion-card:active {
  transform: translateY(-1px) scale(0.99);
  transition-duration: var(--duration-instant);
}

.card-icon {
  font-size: 1.5rem;
  color: var(--color-brand);
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
}

.card-text {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* 2. Slide-over Drawer: GPU Transform Translation */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-snappy) var(--ease-in-out);
  z-index: 50;
}

.drawer-panel {
  width: 20rem;
  height: 100%;
  background-color: var(--color-surface);
  border-left: 1px solid var(--color-border);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  /* Starts completely offscreen to the right using GPU transform */
  transform: translateX(100%);
  transition: transform var(--duration-gentle) var(--ease-out-expo);
}

/* When active, slide in smoothly */
.drawer-backdrop.is-open {
  opacity: 1;
  pointer-events: auto;
}

.drawer-backdrop.is-open .drawer-panel {
  transform: translateX(0);
}

/* 3. Respect User Accessibility Settings */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

```check
page component-kit/index.html "getComputedStyle(document.documentElement).getPropertyValue('--ease-out-expo').includes('cubic-bezier')" "true" server=static
page component-kit/index.html "document.querySelectorAll('.motion-card').length" "3" server=static
```

## Structure the interactive motion lab

Update `component-kit/index.html` with the motion cards and slide-over drawer:

```html file=component-kit/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Component Kit · Motion Physics</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="kit-container">
    <header>
      <h1 class="kit-title">Motion Physics & Easing Curves</h1>
      <p style="color: var(--color-text-muted);">
        Hardware-accelerated transforms powered by exponential cubic-bezier deceleration.
      </p>
    </header>

    <main>
      <section class="motion-card-grid">
        <article class="motion-card" onclick="openDrawer()">
          <span class="card-icon">⚡</span>
          <h2 class="card-title">GPU Transforms</h2>
          <p class="card-text">
            Translates and scales entirely on the GPU compositor thread with zero layout recalculation.
          </p>
        </article>

        <article class="motion-card" onclick="openDrawer()">
          <span class="card-icon">📈</span>
          <h2 class="card-title">Cubic Easing</h2>
          <p class="card-text">
            Natural deceleration curve (0.16, 1, 0.3, 1) starts fast and glides smoothly to rest.
          </p>
        </article>

        <article class="motion-card" onclick="openDrawer()">
          <span class="card-icon">🛡️</span>
          <h2 class="card-title">Reduced Motion</h2>
          <p class="card-text">
            Automatically silences transitions when the operating system requests reduced motion.
          </p>
        </article>
      </section>
    </main>
  </div>

  <!-- Slide-over Drawer Modal -->
  <div class="drawer-backdrop" id="drawer" onclick="closeDrawer(event)">
    <div class="drawer-panel" onclick="event.stopPropagation()">
      <h2 style="font-size: 1.25rem; font-weight: 700;">Inspector Drawer</h2>
      <p style="font-size: 0.875rem; color: var(--color-text-muted);">
        This drawer enters using transform: translateX(0) over 300ms, achieving smooth 60fps animations.
      </p>
      <button onclick="closeDrawer()" style="margin-top: auto; padding: 0.5rem; background: #38bdf8; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">
        Close Drawer
      </button>
    </div>
  </div>

  <script>
    function openDrawer() {
      document.getElementById('drawer').classList.add('is-open');
    }
    function closeDrawer(e) {
      document.getElementById('drawer').classList.remove('is-open');
    }
  </script>
</body>
</html>
```

### Test the 60fps Deceleration

Hover your cursor over the three cards:
* Notice how the card lifts by 4px (`translateY(-4px)`).
* Notice the deceleration curve: it launches instantly and floats into place like a physical card resting on air.
* Click any card: the slide-over drawer glides in from the right edge with silky smoothness!

```check
page component-kit/index.html "document.querySelector('.drawer-backdrop') !== null" "true" server=static
page component-kit/index.html "document.querySelector('.card-icon').textContent" "⚡" server=static
```

## Your turn: create an unboxed floating toast notification

Add a toast notification banner `<div class="toast-notification">` inside `body`.
In `component-kit/style.css`, style `.toast-notification`:
* Give it `position: fixed`, `bottom: var(--space-6)`, `left: 50%`, `transform: translateX(-50%) translateY(100px)`.
* Set `opacity: 0` and `transition: transform var(--duration-snappy) var(--ease-out-expo), opacity var(--duration-snappy) ease`.
* Add an active class `.toast-notification.is-visible` that changes `transform: translateX(-50%) translateY(0)` and `opacity: 1`.
* Add a simple `<p>` inside the toast: `All changes synced to cluster`.

Save both files and reload.

```check
page component-kit/index.html "document.querySelector('.toast-notification') !== null" "true" server=static
page component-kit/index.html "getComputedStyle(document.querySelector('.toast-notification')).position" "fixed" server=static
```

```hints
nudge: Create a div element with class toast-notification as a direct child of body.
concept: Fixed elements centered with left: 50% can be translated vertically on the Y axis for smooth entry.
shape: Add div class="toast-notification" with text, and in style.css set fixed position, transform, and is-visible class.
```

## Diagnose, explain and review

Open Developer Tools and inspect `.drawer-panel`.
In the Styles panel, change `transition: transform ...` to `transition: right 0.3s ease` and change the positioning from `transform: translateX(100%)` to `right: -320px`.
Open the Performance tab in DevTools and record a trace while opening the drawer:
* With `right`, the CPU triggers **Recalculate Style** and **Layout** repeatedly during the animation.
* Restore `transform`: the browser skips Layout and Paint entirely, executing only in the Compositor thread.

Write in your learning journal:
1. What are the only two CSS properties guaranteed to animate on the GPU compositor thread?
2. Why is `cubic-bezier(0.16, 1, 0.3, 1)` more natural to human eyes than `linear`?
3. What is the purpose of `@media (prefers-reduced-motion: reduce)`?

These checks establish that cubic-bezier variables, transform declarations, and toast DOM structures are active, but do not prove that high-refresh-rate 120Hz ProMotion displays maintain perfect frame delivery under extreme CPU throttling without dedicated profiling.

### Explain it without the reference

Close this tab and explain:
* Why animating `top`/`left` causes layout thrashing while `transform` runs on the GPU.
* The 150ms–250ms golden window for UI micro-interactions.
* How to implement `@media (prefers-reduced-motion)` for vestibular accessibility.
