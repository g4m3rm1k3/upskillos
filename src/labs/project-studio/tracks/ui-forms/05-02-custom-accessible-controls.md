---
title: 5.2 — Accessible Custom Switches, Checkboxes and Radios
track: CSS & Interface Engineering — Form UX and Data Density
trackOrder: 45.42
runtime: none
---

Every design engineer eventually wants custom toggle switches and sleek checkbox controls. But the way most developers build them creates an accessibility disaster:
* They create a `<div>` styled like a toggle switch with a JavaScript `onclick` handler.
* Screen readers have no idea it is a checkbox.
* Keyboard users cannot focus it with the Tab key or flip it with the Spacebar.
* It does not submit its value when an HTML `<form>` is sent.

The professional standard is to build **custom styled controls on top of real semantic HTML `<input>` elements** using pure CSS.

In this lesson, you will learn how to build accessible custom switches and checkboxes with native keyboard support, zero JavaScript, and complete form interoperability.

Continue in `interface-studio/`, editing `settings-matrix/`.

### The story so far

In lesson 5.1, you engineered stable form layouts. Now, you will build custom interactive toggle switches without sacrificing accessibility.

```text
Native Semantic <input type="checkbox"> ──► CSS :checked + Pseudo-elements ──► 100% Keyboard & A11y
```

## Build accessible toggle switches with pure CSS

### 1. The Visually-Hidden Semantic Pattern

Do not use `display: none` on the native `<input>`! If you set `display: none`, the browser removes the element from keyboard Tab navigation entirely.

Instead, keep the `<input>` inside a `<label>`, visually hide it or place it behind a custom slider, and style a custom visual track using the `:checked` pseudo-class:

```css
.switch-track {
  width: 2.75rem; /* 44px hit track */
  height: 1.5rem;  /* 24px */
  background-color: var(--color-border);
  border-radius: 9999px;
  position: relative;
  transition: background-color 0.2s ease;
}

.switch-thumb {
  width: 1.125rem;
  height: 1.125rem;
  background-color: #ffffff;
  border-radius: 9999px;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* When the native hidden checkbox is checked, slide thumb on GPU */
.switch-input:checked + .switch-track {
  background-color: var(--color-brand);
}

.switch-input:checked + .switch-track .switch-thumb {
  transform: translateX(1.25rem);
}

/* Keyboard accessibility focus ring */
.switch-input:focus-visible + .switch-track {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}
```

```predict
question: Why must custom toggle switches be built on top of native input elements rather than generic div tags?
choice: To preserve native keyboard Spacebar toggling, screen-reader semantics, and form submission without JavaScript
choice: Because CSS cannot style div elements with background colors
answer: To preserve native keyboard Spacebar toggling, screen-reader semantics, and form submission without JavaScript
explain: Native inputs automatically handle focus, keypresses (Space), ARIA roles, and form value serialization natively without fragile custom scripting.
```

Update `settings-matrix/style.css` to add the custom switch and control rules:

```css file=settings-matrix/style.css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --color-canvas: #090d16;
  --color-surface: #131b2e;
  --color-surface-hover: #1c2640;
  --color-border: #263354;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-brand: #38bdf8;
  --color-danger: #f87171;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
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
  padding: var(--space-8) var(--space-4);
}

.form-container {
  max-width: 34rem;
  margin: 0 auto;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.form-title {
  font-size: 1.25rem;
  font-weight: 700;
}

/* Setting Toggle Row */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border);
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.setting-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.setting-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* 1. Accessible Native Switch Label Wrapper */
.switch-label {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

/* Native input hidden visually but accessible to Tab and Space */
.switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Visual Track */
.switch-track {
  width: 2.75rem;
  height: 1.5rem;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  position: relative;
  transition: background-color 0.2s ease;
}

/* Visual Thumb */
.switch-thumb {
  width: 1.125rem;
  height: 1.125rem;
  background-color: #ffffff;
  border-radius: var(--radius-full);
  position: absolute;
  top: 3px;
  left: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Checked State */
.switch-input:checked + .switch-track {
  background-color: var(--color-brand);
}

.switch-input:checked + .switch-track .switch-thumb {
  transform: translateX(1.25rem);
}

/* Keyboard Focus Ring */
.switch-input:focus-visible + .switch-track {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}
```

```check
page settings-matrix/index.html "document.querySelectorAll('.switch-input').length" "2" server=static
page settings-matrix/index.html "getComputedStyle(document.querySelector('.switch-track')).width" "44px" server=static
```

## Structure the settings switch panel

Update `settings-matrix/index.html` to add the switch settings:

```html file=settings-matrix/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Settings · Accessible Custom Controls</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="form-container">
    <header>
      <h1 class="form-title">Telemetry & Automated Defenses</h1>
      <p style="font-size: 0.8125rem; color: var(--color-text-muted);">
        Accessible custom switches with 100% native Spacebar and Tab keyboard functionality.
      </p>
    </header>

    <main>
      <!-- Setting 1: Rate Limiting -->
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-title">Autonomous Rate Limiter</span>
          <span class="setting-desc">Block suspicious volumetric API bursts instantly.</span>
        </div>
        <label class="switch-label">
          <input type="checkbox" class="switch-input" checked>
          <span class="switch-track">
            <span class="switch-thumb"></span>
          </span>
        </label>
      </div>

      <!-- Setting 2: Two-Factor Enforce -->
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-title">Hardware Key Requirement</span>
          <span class="setting-desc">Enforce FIDO2 WebAuthn keys for administrative routes.</span>
        </div>
        <label class="switch-label">
          <input type="checkbox" class="switch-input">
          <span class="switch-track">
            <span class="switch-thumb"></span>
          </span>
        </label>
      </div>
    </main>
  </div>
</body>
</html>
```

### Test Keyboard and Screen Reader Accessibility

Open `settings-matrix/index.html` in your browser:
1. Click the canvas and press the **Tab** key until the first switch is focused:
   * Notice the bright blue focus ring around the track (`outline-offset: 2px`).
2. Press the **Spacebar** on your keyboard:
   * The thumb slides effortlessly back and forth using hardware-accelerated transforms!
3. Notice that there is **zero JavaScript** powering this toggle. It is 100% accessible HTML and CSS.

```check
page settings-matrix/index.html "document.querySelectorAll('.switch-input:checked').length" "1" server=static
page settings-matrix/index.html "document.querySelector('.setting-title').textContent" "Autonomous Rate Limiter" server=static
```

## Your turn: create an unboxed audit logging switch

Add a third setting item inside `<main>`.
Give it:
1. A `.setting-title` stating `Detailed Audit Logging`.
2. A `.setting-desc` stating `Capture full IP telemetry and signature hashes for every mutation.`
3. A switch label with `<input type="checkbox" class="switch-input">` that starts unchecked.

Save both files and test clicking and tabbing into the new switch.

```check
page settings-matrix/index.html "document.querySelectorAll('.setting-item').length" "3" server=static
page settings-matrix/index.html "document.querySelectorAll('.switch-input').length" "3" server=static
```

```hints
nudge: Add a third setting-item div below the second setting.
concept: Reusing switch-label and switch-input gives the third setting identical keyboard and toggle mechanics.
shape: Add div class="setting-item" containing setting-info and switch-label with input, track, and thumb.
```

## Diagnose, explain and review

Open Developer Tools and inspect `.switch-input`.
In the Elements panel, look at the computed accessibility tree:
* Notice that the browser identifies the element as role: **checkbox** and correctly exposes its checked state (`checked: true` / `false`).
* If you had built this with a `div`, the accessibility tree would read it as a generic text container!

Write in your learning journal:
1. Why must the native checkbox never be hidden with `display: none`?
2. How does the adjacent sibling selector (`+`) allow a hidden input to control a visual track?
3. What keyboard key natively toggles HTML checkbox inputs?

These checks establish that custom switch tracks, thumb elements, and checked input attributes are active, but do not prove that voice control software or high-contrast operating system themes preserve custom switch boundaries without manual accessibility testing.

### Explain it without the reference

Close this tab and explain:
* How to style a custom toggle switch using a native checkbox and CSS `+`.
* Why `transform: translateX()` is used for the thumb motion instead of `left`.
* How keyboard users interact with custom switch controls.
