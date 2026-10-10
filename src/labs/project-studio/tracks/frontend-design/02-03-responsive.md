---
title: 2.3 — Responsive layout, typography and images
track: Frontend Developer Bootcamp — Design a Responsive Café Site
trackOrder: 50.02
runtime: none
reference: optional
---

Outcome: build a layout that reflows instead of shrinking a desktop screenshot. **Flexbox** arranges a row or column; **Grid** arranges rows and columns together. Start with the narrow layout and introduce a breakpoint only when content needs more room.

## Let content determine the layout

Before trying this step, make a prediction.

```predict
question: Will a long navigation row wrap with flex-wrap: wrap?
choice: Yes
choice: No
answer: Yes
explain: Wrapping permits another row when the items do not fit.
```

The navigation wraps instead of overflowing. minmax(0, 1fr) lets a column shrink below long content’s intrinsic width. Headline and introduction span the full grid. At 48rem the sections become two columns. Resize continuously, not only at named phone presets. Respect reduced motion; animation should explain a change, not obstruct it.

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
```

```check
page cafe/index.html "getComputedStyle(document.querySelector('nav')).flexWrap" "wrap" server=static
```

## Your turn: give long addresses somewhere to break

Add overflow-wrap: anywhere to the section rule (or a new section rule). Put an unusually long URL in the page temporarily; verify no horizontal scrolling at 320 CSS pixels, then remove the test text. Choose a second breakpoint only if your own content requires it.

```check
page cafe/index.html "getComputedStyle(document.querySelector('section')).overflowWrap" "anywhere" server=static
```

```hints
nudge: The box can shrink while its text still refuses to wrap.
concept: overflow-wrap controls emergency breaks in long words.
shape: Apply the property to section content and test a real long string.
```

## Diagnose, explain and review

Remove the viewport meta tag temporarily on a phone-size browser emulation: the browser may use a wider layout viewport and shrink the page. Restore it. Test at 320, 768 and 1280 CSS pixels, 200% zoom and enlarged text. For real photos set intrinsic width/height to reserve space, descriptive alt for meaningful images, empty alt for decoration, and srcset/sizes for alternate resolutions. Do not use images of text. Review hierarchy by squinting: the primary heading and next action should still stand out.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
