---
title: Styling 6 — Rows and Columns: Grid
runtime: none
---

Flexbox lines things up in one direction. **Grid** lays them out in two at once: columns *and* rows, where everything in a column lines up with everything above and below it. Card galleries, page layouts with a sidebar, and forms with labels in one column and inputs in the next are grid's job.

## Cards in a grid

The three project cards are stacked. Put them side by side in three equal columns:

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

  --color-text: #1f2933;
  --color-muted: #52606d;
  --color-bg: #ffffff;
  --color-surface: #f5f7fa;
  --color-border: #e4e7eb;
  --color-accent: #2563eb;
  --color-accent-strong: #1d4ed8;
  --color-on-accent: #ffffff;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

h1,
h2,
h3 {
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}

h1 {
  font-size: 2.5rem;
}

h2 {
  font-size: 1.75rem;
}

h3 {
  font-size: 1.25rem;
}

p {
  margin: 0 0 var(--space-3);
  max-width: 65ch;
}

a {
  color: var(--color-accent);
}

nav a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.name {
  color: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
}

nav ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 0 var(--space-3);
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
}

main section {
  padding: var(--space-5) 0;
}

footer {
  padding: var(--space-4) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-muted);
  text-align: center;
}

.button {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-accent);
  border-radius: 0.5rem;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 600;
  text-decoration: none;
}

.button:hover {
  background: var(--color-accent-strong);
  border-color: var(--color-accent-strong);
}

.button.secondary {
  background: transparent;
  color: var(--color-accent);
}

.button.secondary:hover {
  background: var(--color-surface);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

#contact ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #e4e7eb;
    --color-muted: #9aa5b1;
    --color-bg: #111827;
    --color-surface: #1f2937;
    --color-border: #374151;
    --color-accent: #60a5fa;
    --color-accent-strong: #93c5fd;
    --color-on-accent: #111827;
  }
}
```

- **`display: grid`** makes `.cards` a **grid container**; its children (the cards) are **grid items**, placed one per cell, left to right, then on to the next row.
- **`grid-template-columns`** lists the columns' widths. **`fr`** means "a fraction of the free space": `1fr 1fr 1fr` is three equal columns, and **`repeat(3, 1fr)`** is the same thing, written once.
- **`gap`** works as in flexbox, between columns and between rows.
- The card's **`margin-bottom` is gone.** In a grid (or a flex container), `gap` spaces the items, so the items themselves don't need margins. Spacing belongs to the layout, not to the things inside it, and then a card looks the same wherever you put it.

```check
page playground/site/index.html "getComputedStyle(document.querySelector('.cards')).display" grid label="the cards' container is a grid"
page playground/site/index.html "getComputedStyle(document.querySelector('.cards')).gridTemplateColumns.split(' ').length" 3 label="with three columns"
page playground/site/index.html "(() => { const tops = [...document.querySelectorAll('.card')].map((c) => Math.round(c.getBoundingClientRect().top)); return tops.every((t) => t === tops[0]); })()" true label="the cards sit side by side"
page playground/site/index.html "getComputedStyle(document.querySelector('.card')).marginBottom" 0px label="the cards have no margin of their own"
```

## Columns that fit the screen

Three columns are right on a wide screen and hopeless on a phone: each card would be a sliver. Instead of a fixed number of columns, ask for **as many as fit**:

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

  --color-text: #1f2933;
  --color-muted: #52606d;
  --color-bg: #ffffff;
  --color-surface: #f5f7fa;
  --color-border: #e4e7eb;
  --color-accent: #2563eb;
  --color-accent-strong: #1d4ed8;
  --color-on-accent: #ffffff;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

h1,
h2,
h3 {
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}

h1 {
  font-size: 2.5rem;
}

h2 {
  font-size: 1.75rem;
}

h3 {
  font-size: 1.25rem;
}

p {
  margin: 0 0 var(--space-3);
  max-width: 65ch;
}

a {
  color: var(--color-accent);
}

nav a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.name {
  color: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
}

nav ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 0 var(--space-3);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--space-4);
}

.card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
}

main section {
  padding: var(--space-5) 0;
}

footer {
  padding: var(--space-4) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-muted);
  text-align: center;
}

.button {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-accent);
  border-radius: 0.5rem;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 600;
  text-decoration: none;
}

.button:hover {
  background: var(--color-accent-strong);
  border-color: var(--color-accent-strong);
}

.button.secondary {
  background: transparent;
  color: var(--color-accent);
}

.button.secondary:hover {
  background: var(--color-surface);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

#contact ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #e4e7eb;
    --color-muted: #9aa5b1;
    --color-bg: #111827;
    --color-surface: #1f2937;
    --color-border: #374151;
    --color-accent: #60a5fa;
    --color-accent-strong: #93c5fd;
    --color-on-accent: #111827;
  }
}
```

Read `repeat(auto-fit, minmax(16rem, 1fr))` from the inside out:

- **`minmax(16rem, 1fr)`**: each column is at least 16rem (256px) wide, and at most an equal share of the free space.
- **`repeat(auto-fit, …)`**: make as many of those columns as fit in the container.

So the browser fits as many 16rem columns as it can, then stretches them to fill the row. On a wide screen that's three; on a phone, one. The layout adapts with no extra rules.

```predict
question: On a phone-sized screen, 400 pixels wide, how many columns of cards are there?
answer: 1
explain: `main` is 400px minus its padding (16px each side): 368px. Two columns need 2 × 256px plus the 24px gap, which is 536px: too wide. So only one column fits, and it stretches to the full 368px.
verify: page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('.cards')).gridTemplateColumns.split(' ').length; })()" server=static
```

Drag your browser window narrower and wider, and watch the cards reflow from three columns to two to one.

```check
page playground/site/index.html "getComputedStyle(document.querySelector('.cards')).gridTemplateColumns.split(' ').length" 3 label="three columns on a wide screen"
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 700px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('.cards')).gridTemplateColumns.split(' ').length; })()" 2 server=static label="two on a 700px screen"
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('.cards')).gridTemplateColumns.split(' ').length; })()" 1 server=static label="one on a 400px screen"
```

## An experiment: the grid lab

Grid items don't have to take one cell each. This step opens `playground/css/grid-lab.html`:

```html file=playground/css/grid-lab.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Grid lab</title>
    <style>
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 120px);
        gap: 8px;
      }

      .item {
        padding: 16px;
        border: 1px solid #2563eb;
        background: #dbeafe;
      }

      .wide {
        grid-column: span 2;
      }
    </style>
  </head>
  <body>
    <div class="grid">
      <div class="item wide">One</div>
      <div class="item">Two</div>
      <div class="item">Three</div>
      <div class="item">Four</div>
    </div>
  </body>
</html>
```

`grid-column: span 2` makes an item cover two columns instead of one.

```predict
question: The grid has three columns. One spans two of them. Where does Three go?
choice: On the first row, after Two
choice: At the start of the second row
answer: At the start of the second row
explain: One takes columns 1 and 2, Two takes column 3, and the first row is full. Items fill the grid left to right, row by row, so Three starts the second row, and Four goes next to it.
verify: page playground/css/grid-lab.html "(() => { const items = document.querySelectorAll('.item'); return items[2].getBoundingClientRect().top > items[1].getBoundingClientRect().top ? 'At the start of the second row' : 'On the first row, after Two'; })()"
```

Open it and experiment. Predict before each refresh:

1. Give Four `grid-column: 1 / -1`. Lines between columns are numbered from 1, and `-1` is the last line, so this means "from the first line to the last": the whole row.
2. Give Two `grid-row: span 2`. What happens to the cells around it?
3. Replace the columns with `200px 1fr` and make the window wider: which column grows?
4. Name areas. Replace the `.grid` rule's columns with this, and give One, Two, Three and Four `grid-area: head`, `side`, `body` and `foot`:

   ```css
   grid-template-columns: 120px 1fr;
   grid-template-areas:
     "head head"
     "side body"
     "foot foot";
   ```

   That's a whole page layout (a header across the top, a sidebar, the content, a footer), drawn in text. DevTools' grid badge can show the area names on the page.

```check
page playground/css/grid-lab.html "getComputedStyle(document.querySelector('.grid')).display" grid label="the lab page has a grid"
```

## Two columns: a split section

The About section's heading sits above its paragraph, and on a wide screen there's a lot of empty space beside them. A common design puts the heading in a narrow column on the left and the text in a wide column on the right.

First, give the section a class, so the layout is reusable: in `index.html`, change `<section id="about">` to:

```html
<section id="about" class="split">
```

Then the rule:

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

  --color-text: #1f2933;
  --color-muted: #52606d;
  --color-bg: #ffffff;
  --color-surface: #f5f7fa;
  --color-border: #e4e7eb;
  --color-accent: #2563eb;
  --color-accent-strong: #1d4ed8;
  --color-on-accent: #ffffff;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

h1,
h2,
h3 {
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}

h1 {
  font-size: 2.5rem;
}

h2 {
  font-size: 1.75rem;
}

h3 {
  font-size: 1.25rem;
}

p {
  margin: 0 0 var(--space-3);
  max-width: 65ch;
}

a {
  color: var(--color-accent);
}

nav a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.name {
  color: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
}

nav ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 0 var(--space-3);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--space-4);
}

.card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
}

main section {
  padding: var(--space-5) 0;
}

.split {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-4);
  align-items: start;
}

footer {
  padding: var(--space-4) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-muted);
  text-align: center;
}

.button {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-accent);
  border-radius: 0.5rem;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 600;
  text-decoration: none;
}

.button:hover {
  background: var(--color-accent-strong);
  border-color: var(--color-accent-strong);
}

.button.secondary {
  background: transparent;
  color: var(--color-accent);
}

.button.secondary:hover {
  background: var(--color-surface);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

#contact ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #e4e7eb;
    --color-muted: #9aa5b1;
    --color-bg: #111827;
    --color-surface: #1f2937;
    --color-border: #374151;
    --color-accent: #60a5fa;
    --color-accent-strong: #93c5fd;
    --color-on-accent: #111827;
  }
}
```

- **`1fr 2fr`**: two columns, the second twice as wide as the first.
- **`align-items: start`** puts each item at the top of its cell. Without it, items **stretch** to the height of their row, which you'd notice the moment one got a background.
- The `id` stays, for the nav's `#about` link: ids are for finding, classes are for styling.

**Grid or flexbox?** Use flexbox when you have a line of things that should take the space they need (a nav, buttons, tags). Use grid when you want columns, so that things line up across rows (cards, page layouts, a form). Many layouts use both: a grid of cards, each card a flex column inside.

```check
contains playground/site/index.html "class=\"split\"" -- Add class="split" to the about section.
page playground/site/index.html "getComputedStyle(document.querySelector('#about')).gridTemplateColumns.split(' ').length" 2 label="the about section has two columns"
page playground/site/index.html "(() => { const h = document.querySelector('#about h2').getBoundingClientRect(); const p = document.querySelector('#about p').getBoundingClientRect(); return h.right <= p.left && Math.abs(h.top - p.top) < 4; })()" true label="the heading is on the left, level with the text"
```

## Commit

```powershell
git add playground
git commit -m "Lay out the cards and the about section with grid; a grid lab"
```

```check
git-tracked playground/css/grid-lab.html
git-clean
```

## Your turn: a grid of skills

Add a list of your skills to the About section, after the paragraph: a `<ul class="skills">` with at least four `<li>`s (HTML, CSS, Git, Python…).

Then style it:

- the skills form a grid of equal tags, as many to a row as fit, each at least `8rem` wide, with `--space-2` between them;
- the list sits in the **second** column, under the paragraph, not in the first column under the heading;
- no bullets, no indent.

Make each tag look like a tag if you like (a border, rounded ends): that part is yours to design. Commit when it's done.

```check
page playground/site/index.html "document.querySelectorAll('#about ul.skills > li').length >= 4" true label="the about section has a skills list of at least four items" -- Add <ul class="skills"> with four or more <li> after the paragraph.
page playground/site/index.html "getComputedStyle(document.querySelector('.skills')).display" grid label="the skills list is a grid"
page playground/site/index.html "getComputedStyle(document.querySelector('.skills')).gridTemplateColumns.split(' ').length > 1" true label="with more than one skill to a row on a wide screen"
page playground/site/index.html "(() => { const p = document.querySelector('#about p').getBoundingClientRect(); const s = document.querySelector('.skills').getBoundingClientRect(); return Math.abs(p.left - s.left) < 2 && s.top >= p.bottom - 1; })()" true label="it sits in the second column, under the paragraph" -- A grid item can be told which column to go in.
page playground/site/index.html "getComputedStyle(document.querySelector('.skills')).listStyleType + ' ' + getComputedStyle(document.querySelector('.skills')).paddingLeft" "none 0px" label="no bullets and no indent"
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: Two grids are involved: the section's (where does the list go?) and the list's own (how are its items laid out?).
concept: The cards used `repeat(auto-fit, minmax(…, 1fr))`; `auto-fill` is the same, except that it keeps empty columns instead of stretching the items when there are only a few. A grid item placed with `grid-column: 2` goes in column 2. Without that, the section's grid puts the list in the next free cell: column 1, row 2, under the heading.
shape: The HTML: `<ul class="skills">` with `<li>`s, after the `<p>`. The CSS: one `.skills` rule with `display: grid`, `grid-template-columns`, `gap`, `grid-column` and the three lines that remove the list's look; optionally a `.skills li` rule for the tags.
answer: ~~~html
        <ul class="skills">
          <li>HTML</li>
          <li>CSS</li>
          <li>JavaScript</li>
          <li>Python</li>
          <li>Git</li>
          <li>Testing</li>
        </ul>
~~~
~~~css
.skills {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: var(--space-2);
  grid-column: 2;
  margin: 0;
  padding: 0;
  list-style: none;
}

.skills li {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  text-align: center;
}
~~~
```
