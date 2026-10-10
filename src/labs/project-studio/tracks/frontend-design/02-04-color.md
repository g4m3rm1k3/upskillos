---
title: 2.4 — Color, contrast and two intentional themes
track: Frontend Developer Bootcamp — Design a Responsive Café Site
trackOrder: 50.02
runtime: none
reference: optional
---

Outcome: define accessible light and dark palettes without inverting photos. Color roles are more stable than color names: --ink describes a purpose; --green does not. Use a neutral surface, readable text, one action color and restrained decoration. Pair status colors with words or icons that have labels.

## Define a second token set

Before trying this step, make a prediction.

```predict
question: Will replacing a shared surface token affect every rule that reads it?
choice: Yes
choice: No
answer: Yes
explain: Custom-property consumers use the current cascaded token value.
```

An attribute selector matches data-theme="dark" on html. color-scheme tells the browser which native form controls fit the page. In DevTools, edit the html element to add data-theme="dark" and then data-theme="light". No JavaScript is needed to inspect the two designs; automatic selection and a saved toggle follow after JavaScript foundations.

```css file=cafe/styles.css
/* Tokens name design decisions so one change can update the whole site. */
:root {
  --surface: #ffffff;
  --ink: #172b24;
  --accent: #176341;
  --space: 1.5rem;
  --radius: 0.75rem;
  font-family: system-ui, sans-serif;
  color: var(--ink);
  background: var(--surface);
  line-height: 1.6;
}
* { box-sizing: border-box; }
body { margin: 0; }
header, main, footer { max-width: 68rem; margin-inline: auto; padding: var(--space); }
h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; max-width: 18ch; }
h2 { line-height: 1.25; }
p { max-width: 65ch; }
a { color: var(--accent); text-underline-offset: 0.2em; }
a:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
section { border: 1px solid currentColor; border-radius: var(--radius); padding: var(--space); margin-block: var(--space); }
nav { display: flex; gap: 1rem; flex-wrap: wrap; }
main { display: grid; gap: 1rem; }
main > h1, main > p { grid-column: 1 / -1; }
section { margin: 0; min-width: 0; }
@media (min-width: 48rem) {
  main { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
img { max-width: 100%; height: auto; display: block; }
@media (prefers-reduced-motion: no-preference) {
  a { transition: color 150ms ease; }
}
section { overflow-wrap: anywhere; }
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface: #14251e;
  --ink: #f0f7f3;
  --accent: #9ee5bc;
}
:root[data-theme="light"] { color-scheme: light; }
button, input, select { font: inherit; }
button { min-height: 44px; padding: 0.5rem 1rem; cursor: pointer; }
```

```check
page cafe/index.html "(() => { document.documentElement.dataset.theme = 'dark'; return getComputedStyle(document.documentElement).backgroundColor; })()" "rgb(20, 37, 30)" server=static
```

## Your turn: give cards their own role

Add --card: #f1f6f3 to :root and override it with #213b30 in the dark selector. Set section background to var(--card). Check both palettes. Use browser contrast tooling: target at least 4.5:1 for normal text, 3:1 for large text and relevant non-text UI boundaries. These thresholds alone do not prove accessibility.

```check
page cafe/index.html "(() => { document.documentElement.dataset.theme = 'dark'; return getComputedStyle(document.querySelector('section')).backgroundColor; })()" "rgb(33, 59, 48)" server=static
```

```hints
nudge: Create a surface role separate from the page.
concept: A later selector can override a custom property in one theme.
shape: Define both values, then consume the token on sections.
```

## Diagnose, explain and review

Try a pale gray text color on white and inspect its contrast ratio, then restore --ink. Test focus rings, links, hover, active and disabled states in both themes. Never remove outlines without a visible replacement. Document one rejected palette and why it failed, rather than claiming that your favorite color must work.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
