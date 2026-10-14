---
title: 4.1 — The Complete State Matrix, :focus-visible and Focus Rings
track: CSS & Interface Engineering — Interaction Design and Micro-States
trackOrder: 45.31
runtime: none
---

The difference between a website that feels like a static brochure and an application that feels like a high-grade tool comes down to **state engineering**.

When developers build components quickly, they only style two states: Default and Hover.
* When a user clicks down, nothing happens (no `:active` tactile feedback).
* When a keyboard user tabs through the page, the developer used `outline: none` to remove "the ugly blue box", making the site completely unusable for people with motor impairments or power users who navigate with the keyboard.

In this lesson, you will learn the **7 interactive states** required for production components and how to craft WCAG 2.2 compliant focus rings using `:focus-visible` and `outline-offset`.

You will build an interactive component library in `component-kit/`.

### How to learn here

Test keyboard navigation with the Tab key, observe state feedback, and inspect pseudo-classes in Developer Tools.

### The story so far

In Chapter 3, you mastered color science and dark mode. Now, we bring interfaces to life by handling every possible user interaction state.

```text
Default → Hover → Active (Pressed) → Focus-Visible (Keyboard) → Disabled → Loading → Error
```

## Master the 7 interactive states

### 1. The 7 States of UI Elements

Every button, input, toggle, or link must handle up to 7 distinct states:
1. **Default:** Resting appearance.
2. **Hover:** Cursor hovers over the element (subtle background shift).
3. **Active (Pressed):** Mouse button held down or Spacebar pressed. Must provide tactile feedback (`transform: scale(0.98)` or a darker shade).
4. **Focus-Visible:** Element selected via keyboard Tab navigation.
5. **Disabled:** Element non-interactive (`pointer-events: none`, reduced opacity).
6. **Loading:** Asynchronous action in progress (spinner / disabled).
7. **Error / Invalid:** Validation failure (red tint, aria-invalid).

### 2. The Danger of `outline: none` and the Solution: `:focus-visible`

In the early days of CSS, clicking a button with a mouse created an ugly black or blue browser outline. Developers began writing:
```css
/* NEVER DO THIS - DESTROYS ACCESSIBILITY */
button:focus { outline: none; }
```
This destroyed keyboard navigation: users hitting the Tab key had no way to know which button was active.

CSS now provides **`:focus-visible`**:
* Clicking with a **mouse** does NOT trigger `:focus-visible`.
* Navigating with the **keyboard (Tab)** DOES trigger `:focus-visible`!

### 3. Crafting the Perfect Focus Ring

To ensure high-contrast visibility against both light and dark backgrounds, use **`outline-offset`**:
```css
.btn:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px; /* Leaves a 2px air gap around the element */
}
```
The 2px air gap prevents the focus ring from clipping against rounded corners or dark button backgrounds.

```predict
question: What is the primary advantage of :focus-visible over the traditional :focus pseudo-class?
choice: :focus-visible only activates when the user navigates via keyboard (Tab), suppressing outlines on mouse clicks
choice: :focus-visible makes elements automatically submit forms
answer: :focus-visible only activates when the user navigates via keyboard (Tab), suppressing outlines on mouse clicks
explain: :focus-visible distinguishes between mouse pointer activations and keyboard navigation, providing accessibility rings without cluttering mouse clicks.
```

Create `component-kit/style.css` with the complete state matrix:

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
  --color-border: #334155;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;

  --color-brand: #38bdf8;
  --color-brand-hover: #0284c7;
  --color-brand-active: #0369a1;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;

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
}

.kit-container {
  max-width: 48rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.kit-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.kit-title {
  font-size: 1.75rem;
  font-weight: 800;
}

.component-row {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}

/* THE PRODUCTION BUTTON: Complete 7-State Matrix */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-family);
  font-size: 0.875rem;
  font-weight: 600;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  line-height: 1;

  /* Snappy physical transition */
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.08s ease,
    box-shadow 0.15s ease;
}

/* 1. Default State */
.btn-primary {
  background-color: var(--color-brand);
  color: #0f172a;
}

/* 2. Hover State */
.btn-primary:hover:not(:disabled) {
  background-color: var(--color-brand-hover);
  color: #ffffff;
}

/* 3. Active / Pressed State (Tactile feedback) */
.btn-primary:active:not(:disabled) {
  background-color: var(--color-brand-active);
  transform: scale(0.97); /* Micro-compression gives physical click feel */
}

/* 4. Focus-Visible (High-contrast accessible ring) */
.btn:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 3px; /* Air gap */
}

/* 5. Disabled State */
.btn:disabled,
.btn[aria-disabled="true"] {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* 6. Ghost Secondary Variant */
.btn-ghost {
  background-color: transparent;
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.btn-ghost:hover:not(:disabled) {
  background-color: #334155;
}

.btn-ghost:active:not(:disabled) {
  background-color: #1e293b;
  transform: scale(0.97);
}
```

```check
page component-kit/index.html "getComputedStyle(document.querySelector('.btn-primary')).outlineOffset" "3px" server=static
page component-kit/index.html "document.querySelectorAll('.btn').length" "3" server=static
```

## Implement the interactive test suite

Create `component-kit/index.html` to test all button states:

```html file=component-kit/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Component Kit · Interaction States</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="kit-container">
    <header class="kit-header">
      <h1 class="kit-title">Interactive State Engineering</h1>
      <p style="color: var(--color-text-muted);">
        Test Default, Hover, Active, and Focus-Visible by clicking, holding, and pressing the Tab key.
      </p>
    </header>

    <main>
      <section class="component-row">
        <!-- Interactive Primary -->
        <button class="btn btn-primary">Primary Action</button>

        <!-- Interactive Secondary Ghost -->
        <button class="btn btn-ghost">Secondary Action</button>

        <!-- Disabled Button -->
        <button class="btn btn-primary" disabled>Disabled State</button>
      </section>
    </main>
  </div>
</body>
</html>
```

### Test Keyboard Focus with the Tab Key

Open `component-kit/index.html` in your browser:
1. Click on the background canvas.
2. Press the **Tab** key on your keyboard.
3. Notice the **Focus Ring**: a vibrant blue outline separated from the button by a crisp 3px air gap (`outline-offset: 3px`).
4. Now, click the first button with your mouse and hold the mouse button down: observe the micro-compression (`transform: scale(0.97)`), which provides tactile click feedback!

```check
page component-kit/index.html "document.querySelector('button[disabled]') !== null" "true" server=static
page component-kit/index.html "document.querySelector('.btn-primary').textContent" "Primary Action" server=static
```

## Your turn: create an unboxed destructive button

Add a fourth button to `.component-row`.
Give it the classes `btn btn-danger`.
In `component-kit/style.css`, add the rules for `.btn-danger`:
* Default: background `#ef4444` (red), color `#ffffff`.
* Hover: background `#dc2626`.
* Active: background `#b91c1c`, `transform: scale(0.97)`.
* Focus-Visible: `outline: 2px solid #ef4444`, `outline-offset: 3px`.

Save both files and test with mouse clicks and Tab keyboard navigation.

```check
page component-kit/index.html "document.querySelectorAll('.btn').length" "4" server=static
page component-kit/index.html "document.querySelector('.btn-danger') !== null" "true" server=static
```

```hints
nudge: Add a fourth button with class btn btn-danger inside component-row.
concept: Sibling button variants reuse the base .btn styles while overriding color and focus tokens.
shape: Add button class="btn btn-danger" with text Delete Project, and add .btn-danger hover, active, and focus-visible states in style.css.
```

## Diagnose, explain and review

Open Developer Tools and inspect the first `.btn-primary`.
In the Elements panel, look at the `:hov` button (Toggle element state) next to the Styles tab.
Check `:active`. Notice how the button stays visually compressed, simulating a physical keypress.
Next, check `:focus-visible`. Notice the high-contrast 3px outline offset ring.

Write in your learning journal:
1. Why does `transform: scale(0.97)` provide a more satisfying tactile click than changing background color alone?
2. What happens to keyboard accessibility if a developer removes outlines with `outline: none`?
3. How does `outline-offset` prevent focus rings from overlapping rounded button corners?

These checks establish that button states, disabled attributes, and pseudo-class rules are present in the DOM and stylesheet, but do not prove that screen readers announce accessibility aria states correctly without assistive technology testing.

### Explain it without the reference

Close this tab and explain:
* The 7 states of a production UI component.
* Why `:focus-visible` is superior to `:focus`.
* How `outline-offset` creates a professional air gap around focused elements.
