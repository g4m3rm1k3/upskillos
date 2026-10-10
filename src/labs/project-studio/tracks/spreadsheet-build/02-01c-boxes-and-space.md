---
title: Styling 3 — Boxes and Space
runtime: none
---

Ask a designer what separates a page that looks professional from one that looks hacked together, and the most common answer is **space**: consistent gaps, generous margins, text that never touches an edge. This lesson is about where space comes from in CSS, and how to keep it consistent.

## Four boxes inside each other

The browser draws every element as a rectangle made of four layers, from the inside out:

```text
┌───────────────── margin ─────────────────┐
│  ┌────────────── border ──────────────┐  │
│  │  ┌─────────── padding ─────────┐   │  │
│  │  │          content            │   │  │
│  │  └─────────────────────────────┘   │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

- **content**: the text or child elements;
- **padding**: space *inside* the border, between it and the content (it takes the element's background colour);
- **border**: the line around it, which can be zero wide;
- **margin**: space *outside* the border, pushing neighbours away (always transparent).

This is the **box model**, and nearly every "why is there a gap here?" question is answered by finding which of the four it is. DevTools draws the four boxes for any element you click: at the bottom of the Styles pane, or in the **Computed** tab.

The properties take one to four values, going clockwise from the top: `padding: 20px` is all four sides; `padding: 10px 20px` is top and bottom 10, left and right 20; `padding: 1px 2px 3px 4px` is top, right, bottom, left.

Give the project cards a box. Add this rule to the end of `playground/site/style.css`:

```css file=playground/site/style.css
body {
  font-family: system-ui, sans-serif;
  color: #1f2933;
}

a {
  color: #2563eb;
}

nav a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.card {
  width: 300px;
  padding: 20px;
  border: 2px solid #e4e7eb;
}
```

`.card` selects every element with the class `card`: the three `<article>`s. Before you refresh, work this out:

```predict
question: The card has `width: 300px`, `padding: 20px` and a 2px border. How wide is it on the screen, in pixels, from the outside of one border to the outside of the other?
answer: 344
explain: By default, `width` sets the width of the **content** only. Padding and border are added outside it: 20 + 2 on each side, so 300 + 2 × 22 = 344. (Margin isn't counted: it's space outside the box.)
verify: page playground/site/index.html "document.querySelector('.card').offsetWidth"
```

```check
page playground/site/index.html "document.querySelector('.card').offsetWidth" 344 label="each card is 344px wide on screen"
```

## box-sizing: border-box

"Width means the content's width" sounds logical and is miserable in practice: every time you change a card's padding, its outside size changes, and layouts that depended on it break. So almost every site in the world starts its stylesheet with this rule. Add it at the top:

```css file=playground/site/style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  color: #1f2933;
}

a {
  color: #2563eb;
}

nav a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.card {
  width: 300px;
  padding: 20px;
  border: 2px solid #e4e7eb;
}
```

- **`*`** selects every element. (Its specificity is zero, so any other rule beats it.)
- **`*::before, *::after`** select the extra boxes CSS can add before and after an element's content. You won't use them yet; including them means every box on the page follows the same rule.
- **`box-sizing: border-box`** makes `width` mean the width **including** padding and border. The padding then eats into the content instead of growing the box.

```predict
question: With `box-sizing: border-box`, how wide is the card on screen now?
answer: 300
explain: `width` now includes the padding and the border, so the outside of the box is exactly 300px, and the content shrinks to 300 − 44 = 256px to make room.
verify: page playground/site/index.html "document.querySelector('.card').offsetWidth"
```

```check
page playground/site/index.html "document.querySelector('.card').offsetWidth" 300 label="each card is now exactly 300px wide"
page playground/site/index.html "getComputedStyle(document.querySelector('p')).boxSizing" border-box label="every element uses border-box"
```

## A spacing scale

Designers don't pick spacing one element at a time. They choose a short list of sizes (a **scale**) and use only those, so gaps repeat across the page and the eye reads it as orderly. Five sizes cover most pages.

CSS lets you name values once and use them everywhere, with **custom properties** (also called *CSS variables*): a name starting with `--`, set like any property, and read with `var(--name)`.

```css file=playground/site/style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 3rem;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  color: #1f2933;
}

a {
  color: #2563eb;
}

nav a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.card {
  padding: var(--space-4);
  border: 1px solid #e4e7eb;
  border-radius: 0.5rem;
  margin-bottom: var(--space-3);
}
```

- **`:root`** selects the page's outermost element, `<html>`. Custom properties set there are inherited by every element, so every rule can read them. They're the page's **design tokens**: the named decisions a design is built from.
- **`rem`** is a size relative to the root element's font size, which is 16px unless the reader has changed it, so `1rem` is 16px and `3rem` is 48px. Styling 4 explains why sizes in `rem` are kinder than pixels.
- **`body { margin: 0; }`** removes the 8px margin the browser puts around every page. You'll set the page's space yourself, from the scale.
- The card loses its fixed width (Styling 6 lays the cards out), keeps padding from the scale, gets a thinner border, rounded corners (**`border-radius`**), and a margin to separate it from the next card.

Change `--space-4` to `3rem` and refresh: every card's padding grows at once. Change it back. That's the point of tokens: one decision, written once.

```check
page playground/site/index.html "getComputedStyle(document.querySelector('.card')).paddingTop" 24px label="cards are padded by --space-4 (1.5rem, 24px)"
page playground/site/index.html "getComputedStyle(document.querySelector('.card')).borderTopLeftRadius" 8px label="cards have rounded corners"
page playground/site/index.html "getComputedStyle(document.body).marginTop" 0px label="the body has no margin"
page playground/site/index.html "getComputedStyle(document.documentElement).getPropertyValue('--space-5').trim()" 3rem label="the scale is on :root"
```

## A readable column

On a wide screen the text runs from one edge of the window to the other. Long lines are hard to read: the eye loses its place going back to the start of the next line. Hold the content to a column, and centre it:

```css file=playground/site/style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 3rem;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  color: #1f2933;
}

a {
  color: #2563eb;
}

nav a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 0 var(--space-3);
}

.card {
  padding: var(--space-4);
  border: 1px solid #e4e7eb;
  border-radius: 0.5rem;
  margin-bottom: var(--space-3);
}
```

- **`max-width: 60rem`**, not `width`: on a wide screen `main` is 960px, and on a narrow one it simply fills the screen. `width` would force 960px on a phone and make the page scroll sideways.
- **`margin: 0 auto`**: 0 top and bottom, `auto` left and right. A block with a limited width and `auto` side margins is centred: the browser shares the leftover space equally.
- **`padding: 0 var(--space-3)`** keeps the text off the screen's edges when the window is narrower than 60rem.

Make the window narrow and wide, and watch the column.

```check
page playground/site/index.html "document.querySelector('main').getBoundingClientRect().width <= 960" true label="main is at most 60rem (960px) wide"
page playground/site/index.html "(() => { const r = document.querySelector('main').getBoundingClientRect(); return Math.abs(r.left - (document.documentElement.clientWidth - r.right)) < 2; })()" true label="main is centred"
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentDocument.querySelector('main').getBoundingClientRect().width <= 400; })()" true server=static label="on a screen 400px wide, main fits the screen" -- max-width, not width: a fixed width doesn't shrink on a small screen.
```

That last check loads your page inside a 400px-wide frame, like a phone's screen, and measures `main` there. Styling 7 makes testing on small screens a habit.

## Commit

```powershell
git commit -am "Give the portfolio a box model, a spacing scale and a column"
```

```check
git-clean
```

## Your turn: room to breathe

The sections run into each other, and the header's text touches the edge of the window. Using only sizes from the scale:

- give every section in `main` space above and below it of `--space-5`, and no extra space at the sides (`main` already has that);
- give the `header` padding of `--space-3` on all four sides.

Refresh and compare: the page should already look calmer. Commit when it's done.

```check
page playground/site/index.html "[...document.querySelectorAll('main > section')].every((s) => getComputedStyle(s).paddingTop === '48px' && getComputedStyle(s).paddingBottom === '48px')" true label="every section has 48px (--space-5) above and below"
page playground/site/index.html "[...document.querySelectorAll('main > section')].every((s) => getComputedStyle(s).paddingLeft === '0px')" true label="no extra space at the sides of sections"
page playground/site/index.html "['Top', 'Right', 'Bottom', 'Left'].every((side) => getComputedStyle(document.querySelector('header'))['padding' + side] === '16px')" true label="the header has 16px (--space-3) on every side"
contains playground/site/style.css "var(--space-5)" label="the sections' space comes from the scale" -- Use var(--space-5), not 48px or 3rem.
git-clean -- Commit it: git commit -am "Give the sections room"
```

The checks measure the space. Whether the page now *feels* better is your judgement, and training that judgement is the real exercise: try `--space-4` instead of `--space-5` for the sections, and see which you prefer.

```hints
nudge: Two new rules: one for the sections, one for the header. Which part of the box model is it, padding or margin?
concept: Padding is space inside the element, which keeps a background with it if one is added later; for space around content, it's the usual choice. The shorthand with two values is top-and-bottom, then left-and-right. `main section` selects sections inside `main`.
shape: `main section { padding: <top and bottom> <sides>; }` and `header { padding: <all four>; }`, with `var(--space-…)` values.
answer: ~~~css
header {
  padding: var(--space-3);
}

main section {
  padding: var(--space-5) 0;
}
~~~
```
