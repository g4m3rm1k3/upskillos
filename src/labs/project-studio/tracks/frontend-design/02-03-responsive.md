---
title: 2.3 — Responsive layout, typography and images
track: Frontend Developer Bootcamp — Design a Responsive Café Site
trackOrder: 50.02
runtime: none
---

Outcome: build a layout that reflows instead of shrinking a desktop screenshot. **Flexbox** arranges a row or column; **Grid** arranges rows and columns together. Start with the narrow layout and introduce a breakpoint only when content needs more room.

### The story so far

The café now has readable typography and shared spacing. It still needs to work when the available space changes. Responsive design is not making every element proportionally smaller; it is choosing how the same content rearranges while preserving its meaning.

The new tools are Flexbox for a sequence, Grid for a layout, and a media query for a conditional rule. You will keep one HTML reading order across screen sizes.

## Let content determine the layout

### Shelf versus graph paper

Flexbox is like arranging objects on a shelf: place items along a main direction, distribute available space, and optionally wrap to another shelf. Grid is like graph paper: define tracks in both directions and place items into their cells. Either can solve many layouts; the analogy is a decision aid, not a rule that forbids overlap.

Navigation links form a sequence that may wrap, so Flexbox is a good first choice. Café content sections benefit from aligned columns, so Grid is a good first choice.

### Trace the narrow and wide cases

| Available width | Relevant rule | Result |
|---|---|---|
| Below 48rem | The base grid has no explicit two-column template | Sections stack in source order. |
| At least 48rem | `repeat(2, minmax(0, 1fr))` | Two equally flexible tracks share available space after gaps. |
| Either width | `grid-column: 1 / -1` on heading and introduction | Those elements span from the first grid line to the last. |

`fr` is a share of the remaining track space, not a fraction of the physical screen. A gap consumes space before those shares are divided.

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

### Why “minmax zero” and “min-width zero” appear

Long unbroken content has an intrinsic minimum size. A grid track whose minimum follows that content may refuse to shrink, even though you asked for equal columns. `minmax(0, 1fr)` permits the track to shrink; `min-width: 0` allows the item to accept the space it receives. Text wrapping still needs its own rule, which the independent exercise adds.

A breakpoint is where your content benefits from a different arrangement. 48rem is a starting hypothesis, not a law about tablets. Slowly resize until a heading, label or card becomes uncomfortable; choose a breakpoint that resolves that pressure. Check widths on both sides, including one pixel before and after.

### Images are layout participants

An image has intrinsic dimensions. `max-width: 100%` prevents it from exceeding its container, and `height: auto` preserves its aspect ratio. HTML width and height attributes reserve the right shape while the image downloads, reducing layout shifts. They do not prevent responsive CSS from scaling it.

Alternative text describes the image’s purpose in context. A meaningful photograph might need a concise description; a decorative texture should have empty alt. Repeating nearby text word for word can create needless screen-reader noise.

**Rule of thumb:** preserve readable content and logical order before chasing a particular device screenshot. Avoid CSS reordering that makes the visual sequence disagree with keyboard or screen-reader order. When a layout only works with short placeholder words, the design is not finished.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain why a fixed height can clip text at 200% zoom while a minimum height usually leaves room to grow. Then choose Flexbox or Grid for a navigation bar and a product-card layout, giving a reason that names the layout relationship rather than saying one tool is newer.
