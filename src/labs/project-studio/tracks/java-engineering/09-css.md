---
title: CSS — layout, states and accessible feedback
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

CSS rules select elements and assign property values. The cascade resolves competing declarations; inheritance passes some properties from ancestors. We use the browser's layout system instead of manually positioning every element.

## Establish a readable layout

Border-box includes padding and borders inside the specified size. The main width is capped but can shrink. `rem` scales with the root font size. Grid allocates remaining space to the input and intrinsic space to the button; the label spans all columns. The media query switches the form to one column on narrow viewports.

Pseudo-classes select interaction states. Focus-visible preserves an obvious keyboard location. Disabled styling communicates an in-flight request later; it is not a substitute for an accessible status message. Rules describe layout constraints rather than exact screen coordinates.

Resize to a narrow viewport, zoom to 200%, and use only the keyboard. Inspect computed styles to explain where a property came from. Record overflow or contrast problems rather than assuming a nice screenshot proves usability.

Type this fragment yourself. Start an empty file at `web/style.css`:

```css edit=web/style.css mode=replace
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #172033; background: #f4f6fa; }
main { max-width: 56rem; margin: 3rem auto; padding: 1.5rem; }
form { display: grid; grid-template-columns: 1fr auto; gap: .75rem; }
label { grid-column: 1 / -1; font-weight: 600; }
input, button { font: inherit; padding: .7rem; border: 1px solid #657087; border-radius: .4rem; }
button { cursor: pointer; background: #173e8f; color: white; }
button:disabled { opacity: .65; cursor: wait; }
:focus-visible { outline: 3px solid #b45309; outline-offset: 3px; }
ul { padding: 0; list-style: none; }
li { background: white; margin: .75rem 0; padding: 1rem; border: 1px solid #cbd2df; }
@media (max-width: 36rem) {
  main { margin: 0 auto; }
  form { grid-template-columns: 1fr; }
}
```

```check
file web/style.css
```

## Choose what to measure

Create `decisions/005-interface.md`. Record a keyboard path from the page heading to adding a task, the feedback expected on success and failure, and the smallest viewport you inspected. Compare a dense table with a task list: a table helps compare fields; a list fits changing content and narrow screens. Neither is universally superior.

A design system becomes useful when multiple screens repeat components and visual decisions. Introducing one now could reduce typing while concealing the HTML and CSS you are learning. Later, evaluate a component library for semantics, keyboard behavior, styling flexibility, maintenance and bundle cost.

```check
file decisions/005-interface.md
```
