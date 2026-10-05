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

### Read a rule, then calculate a box

`main { max-width: 56rem; ... }` contains a selector, braces, and declarations. The selector chooses main elements. Each declaration has a property, colon, value and semicolon. CSS does not execute these declarations like consecutive Java assignments; the browser combines matching rules and computes style/layout for elements.

A box consists of content, padding around content, a border, and margin outside the border. `box-sizing: border-box` makes a specified width include padding and border. For a 200px-wide box with 10px padding on each side and 1px borders, content gets 178px. Without border-box, a content width of 200px would produce an outside border width of 222px. The universal selector `*` applies this sizing rule to all elements selected here.

`rem` measures relative to the root element's font size. At a 16px root font, 56rem is 896px and 1.5rem is 24px. A user changing the root size changes these derived lengths. `max-width` caps growth rather than forcing that width on a narrow screen. `margin: 3rem auto` sets vertical margins to 3rem and lets the two horizontal margins divide available space, centering the capped block.

`font-family: system-ui, sans-serif` is a fallback list of fonts. The six hexadecimal digits in `#172033` encode red, green and blue intensity in pairs. `font: inherit` makes controls take their parent's font settings instead of keeping a separate browser control font. Inheritance is property-specific; padding does not automatically inherit because text color does.

### Let layout respond to content

`display: grid` makes the form a grid container. `grid-template-columns: 1fr auto` creates two tracks: one receives available fractional space, the other sizes automatically from its content. `gap` separates tracks. `grid-column: 1 / -1` places the label from the first grid line to the last, spanning both columns. The slash separates start and end line positions; -1 counts backward from the end.

The comma in `input, button` selects both kinds of element. `button:disabled` narrows the match to disabled buttons; `:focus-visible` matches elements whose current focus should be visibly indicated. `outline` draws a focus indicator without taking layout space; outline-offset separates it from the control's edge.

The `@media` block applies its contained rules only when the viewport is at most 36rem wide. Its later form declaration replaces the earlier two-column template with one track. Its main margin changes only the margin; the earlier padding still applies. This is the **cascade**: among these equal-specificity author declarations, a later applicable declaration wins for the same property.

**Predict and inspect:** at a 16px root font, 36rem is 576px. Compare a viewport just above and below that width. The input and button should stack below the breakpoint. In developer tools, inspect grid tracks and computed margin rather than inferring the rule from appearance alone. Then disable the media rule temporarily and explain the resulting cramped layout; restore it.

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

### Record a reproducible observation

At your inspected viewport, start with no mouse interaction. Press Tab until Task title receives focus, type a title, and press Enter. Record whether the focus indicator is visible and where focus moves afterward. Browser zoom changes the available layout space; test a narrow viewport and increased text size separately so you can identify which constraint caused overflow.

Use computed styles to inspect foreground and background colors rather than estimating contrast by eye. For layout failure, name the element and boundary—for example, the form exceeds the main element's content width—then identify the rule responsible. Do not change random margins until the page happens to fit one screenshot.

Your decision note should compare a list and a table against actual work: scanning a title and state on a phone versus comparing many numeric fields side by side. Revisit the choice when that workflow changes, not just when a fashionable component library becomes available.

Create `decisions/005-interface.md`. Record a keyboard path from the page heading to adding a task, the feedback expected on success and failure, and the smallest viewport you inspected. Compare a dense table with a task list: a table helps compare fields; a list fits changing content and narrow screens. Neither is universally superior.

A design system becomes useful when multiple screens repeat components and visual decisions. Introducing one now could reduce typing while concealing the HTML and CSS you are learning. Later, evaluate a component library for semantics, keyboard behavior, styling flexibility, maintenance and bundle cost.

```check
file decisions/005-interface.md
```
