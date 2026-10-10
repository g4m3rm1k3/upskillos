---
title: Styling 5 — Layout in a Line: Flexbox
runtime: none
---

So far everything on the portfolio sits in one column, each block under the last: that's the browser's **normal flow**. Layout is the art of breaking out of it on purpose: a name on the left and the menu on the right, buttons side by side, cards in rows. CSS has two layout systems built for this. **Flexbox**, this lesson, arranges things in **one line**, a row or a column. **Grid**, the next lesson, arranges them in rows and columns at once.

## The header in a row

The header should have your name on the left and the nav on the right, on one line, and the three nav links side by side. Make the header and the nav's list **flex containers**:

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

.card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  margin-bottom: var(--space-3);
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

- **`display: flex`** on an element makes it a **flex container**, and its children **flex items**. The items line up along the container's **main axis**, which is a row by default.
- **`justify-content`** spreads the items along the main axis. `space-between` pushes the first to the start and the last to the end, with the spare space between them: name left, nav right. Other values: `flex-start` (all at the start, the default), `center`, `flex-end`, `space-around`.
- **`align-items`** places the items along the **cross axis**, at right angles to the main one: here, up and down. `center` lines up the name's middle with the nav's middle, though they're different heights. (The default, `stretch`, makes them all as tall as the tallest.)
- **`nav ul`** is a flex container too, so its `li`s sit in a row. **`gap`** puts space *between* items only, never before the first or after the last, which is exactly what you want and what margins can't easily do.
- **`list-style: none`, `margin: 0`, `padding: 0`** remove the bullets and the indent the browser gives every list. It's still a list for screen readers, which is why it stays a `<ul>`.
- **`.name`** makes your name look like a logo rather than a link.

Before you refresh, predict:

```predict
question: The `nav ul` is now `display: flex`, with nothing else about direction. Where do its three links go?
choice: Side by side in a row
choice: Still one under another
choice: Into a grid of three columns
answer: Side by side in a row
explain: A flex container's main axis is a row unless you say otherwise (`flex-direction: column`). Each `li` is a flex item, placed one after the other along that row, with `gap` between them.
verify: page playground/site/index.html "(() => { const tops = [...document.querySelectorAll('nav li')].map((li) => Math.round(li.getBoundingClientRect().top)); return tops.every((t) => t === tops[0]) ? 'Side by side in a row' : 'Still one under another'; })()"
```

In DevTools' Elements tab, a small **flex** badge now sits next to `<header>` and `<ul>`. Click it: the page shows the container and its items outlined, and the space between them hatched.

```check
page playground/site/index.html "getComputedStyle(document.querySelector('header')).display" flex label="the header is a flex container"
page playground/site/index.html "(() => { const tops = [...document.querySelectorAll('nav li')].map((li) => Math.round(li.getBoundingClientRect().top)); return tops.every((t) => t === tops[0]); })()" true label="the nav links sit in one row"
page playground/site/index.html "(() => { const h = document.querySelector('header').getBoundingClientRect(); const n = document.querySelector('header nav').getBoundingClientRect(); return h.right - n.right < 20 && n.left > h.left + 100; })()" true label="the nav is at the right of the header"
page playground/site/index.html "getComputedStyle(document.querySelector('nav ul')).listStyleType" none label="the nav list has no bullets"
```

## An experiment: the flex lab

The best way to learn flexbox is to change one property at a time and watch. This step opens a lab page, `playground/css/flex-lab.html`:

```html file=playground/css/flex-lab.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Flex lab</title>
    <style>
      .row {
        display: flex;
        gap: 8px;
        width: 600px;
        padding: 8px;
        border: 2px dashed #9aa5b1;
      }

      .box {
        padding: 16px;
        border: 1px solid #2563eb;
        background: #dbeafe;
      }

      .grow {
        flex: 1;
      }
    </style>
  </head>
  <body>
    <div class="row">
      <div class="box">One</div>
      <div class="box grow">Two</div>
      <div class="box">Three</div>
    </div>
  </body>
</html>
```

```predict
question: Box Two has `flex: 1`; One and Three don't. How wide is Two?
choice: The same width as One and Three
choice: Wider: it takes all the space left over in the row
choice: Exactly a third of the row
answer: Wider: it takes all the space left over in the row
explain: Flex items start at the width of their content. `flex: 1` says "grow to fill whatever space is left over". Only Two can grow, so it takes all of it. Give One `flex: 1` too and they share the leftover equally; `flex: 2` on one item gives it twice the share.
verify: page playground/css/flex-lab.html "(() => { const [a, b] = document.querySelectorAll('.box'); return b.offsetWidth > a.offsetWidth * 2 ? 'Wider: it takes all the space left over in the row' : 'The same width as One and Three'; })()"
```

Open it (`start playground/css/flex-lab.html`) and experiment, refreshing after each change. Predict before every refresh:

1. Add `justify-content: center` to `.row`. Then remove `flex: 1` from `.grow`. What does `justify-content` do when there's no leftover space?
2. Add `align-items: flex-start` to `.row`, and put a long sentence in box Three. Then try `center` and `stretch`.
3. Add `flex-direction: column` to `.row`. Which axis does `justify-content` work along now?
4. Make the row `width: 200px` and add `flex-wrap: wrap`. What happens to Three?

Nothing is checked here but that the lab exists: it's your playground. The DevTools flex badge on `.row` gives you buttons for each property, which is a fast way to try values.

```check
page playground/css/flex-lab.html "document.querySelectorAll('.row > .box').length" 3 label="the lab page has a row of three boxes"
```

## Buttons that wrap

The two buttons sit in a paragraph, separated only by the space between words. Make that paragraph a flex container with a gap, and let it **wrap**:

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

.card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  margin-bottom: var(--space-3);
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

- **`flex-wrap: wrap`** lets items move onto a new line when they don't fit, instead of squeezing. On a narrow phone screen the second button drops under the first; the `gap` keeps space between the lines too.
- Without `wrap`, flex items shrink to fit their container, and text inside them squashes onto extra lines. For buttons, wrapping is almost always better.

```check
page playground/site/index.html "getComputedStyle(document.querySelector('.actions')).display" flex label="the buttons' paragraph is a flex container"
page playground/site/index.html "getComputedStyle(document.querySelector('.actions')).flexWrap" wrap label="the buttons wrap when they don't fit"
page playground/site/index.html "getComputedStyle(document.querySelector('.actions')).columnGap" 16px label="with a gap of --space-3 between them"
```

## Commit

```powershell
git add playground
git commit -m "Lay out the header and buttons with flexbox; a flex lab"
```

```check
git-tracked playground/css/flex-lab.html
git-clean
```

## Your turn: contact links in a row

The contact section's links are still a bulleted list. Lay them out in a row, as the nav's are: no bullets and no indent, `--space-4` between them, and wrapping onto a new line when the screen is too narrow. Keep it a `<ul>` in the HTML.

Commit when it's done.

```check
page playground/site/index.html "getComputedStyle(document.querySelector('#contact ul')).display" flex label="the contact list is a flex container" -- Write a rule for the list inside the contact section.
page playground/site/index.html "(() => { const tops = [...document.querySelectorAll('#contact li')].map((li) => Math.round(li.getBoundingClientRect().top)); return tops.every((t) => t === tops[0]); })()" true label="its links sit in one row"
page playground/site/index.html "getComputedStyle(document.querySelector('#contact ul')).listStyleType + ' ' + getComputedStyle(document.querySelector('#contact ul')).paddingLeft" "none 0px" label="no bullets and no indent"
page playground/site/index.html "getComputedStyle(document.querySelector('#contact ul')).columnGap + ' ' + getComputedStyle(document.querySelector('#contact ul')).flexWrap" "24px wrap" label="a gap of --space-4, and wrapping"
page playground/site/index.html "document.querySelector('#contact ul').tagName" UL label="it's still a list in the HTML"
git-clean -- Commit it: git commit -am "Put the contact links in a row"
```

```hints
nudge: The nav's list already looks like this. What's different is only which list the rule selects, and the wrapping.
concept: `#contact ul` selects the list inside the element whose id is `contact`. (Ids are fine for *finding* an element; a class would be better if other pages had contact lists too.) Every property you need is in the `nav ul` rule and the `.actions` rule.
shape: One new rule: `display`, `flex-wrap`, `gap`, then the three lines that remove the list's look.
answer: ~~~css
#contact ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
~~~
```
