---
title: Styling 7 — Every Screen Size
runtime: none
---

More than half the visits to most websites come from phones. A page that only works on a wide monitor is broken for most of its readers. **Responsive design** means one page that adapts to any screen: the cards already do, by themselves. This lesson makes the rest adapt too, and makes testing on small screens a habit.

## See it on a phone-sized screen

You don't need a phone to test. In DevTools, press **Ctrl+Shift+M** (**Cmd+Shift+M** on macOS): the **device toolbar** appears above the page. Choose a phone from the list, or type a width like `375`. Drag the edge to watch the page at every width in between.

This works because of a line the page has had since Styling 1:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Without it, phones assume a page was designed for a desktop: they draw it about 980px wide and shrink the result to fit, so everything is tiny and nothing you write for small screens ever applies. With it, the page is drawn at the phone's real width. Every page needs it, and forgetting it is the most common reason "my responsive CSS does nothing on my phone".

Look at the page at 400px wide, and predict:

```predict
question: At 400px wide, how many columns does the About section (`.split`, `1fr 2fr`) have?
choice: 1: it stacks, like the cards
choice: 2: it squeezes
answer: 2: it squeezes
explain: `1fr 2fr` asks for two columns at every width. The cards adapted because `auto-fit` decides how many columns fit; `.split` never decides anything, so on a phone the heading gets a third of 368px and the text squeezes into the rest. Changing the layout at a certain width is what media queries are for.
verify: page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('.split')).gridTemplateColumns.split(' ').length === 1 ? '1: it stacks, like the cards' : '2: it squeezes'; })()" server=static
```

The header has a problem too: at 400px, the name and the three links are crammed onto one line.

## Mobile first, with a media query

A **media query** applies rules only when a condition about the screen is true. You used one in Styling 4 (`prefers-color-scheme: dark`); the common one is about width:

```css
@media (min-width: 48rem) {
  /* applies only when the window is at least 48rem (768px) wide */
}
```

The professional habit is **mobile first**: write the base rules for a small screen, where most layouts are a simple column, and add media queries with **`min-width`** to change things as the screen gets wider. Small screens then get the simplest CSS, and every enhancement is something the bigger screen has room for.

Make the header a column by default, and a row from 48rem up:

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
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
}

@media (min-width: 48rem) {
  header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
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

- **`flex-direction: column`**: the main axis now runs down the page, so the name sits above the nav. `align-items: flex-start` puts both at the left (the cross axis is now horizontal). `gap` separates them.
- **`@media (min-width: 48rem)`** switches back to a row with the space between when there's room. Its rules come **after** the base rule, so with equal specificity they win (the cascade's tie-breaker, at work again).
- **Breakpoints in `rem`**: like font sizes, they then respect the reader's text size. 48rem (768px) is roughly where a tablet in portrait begins. Choose breakpoints where *your* layout breaks, by dragging the window, not from a list of devices.

```check
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('header')).flexDirection; })()" column server=static label="at 400px the header is a column"
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1000px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('header')).flexDirection; })()" row server=static label="at 1000px it's a row again"
```

## Type that scales with the screen

A 40px heading is fine on a monitor and overwhelming on a phone. Rather than a media query for every size, let the size **flow** between a minimum and a maximum:

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
  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);
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
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
}

@media (min-width: 48rem) {
  header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
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

- **`vw`** is a percentage of the viewport's width: `1vw` is 1% of it.
- **`clamp(min, preferred, max)`** uses the preferred value, but never less than the minimum or more than the maximum.
- So the `h1` is `1.5rem + 2.5vw`, growing smoothly with the screen, never smaller than 2rem (32px) and never bigger than 3rem (48px). The `rem` part keeps it growing with the reader's text size too.

```predict
question: In a window 1280 pixels wide, how big is the `h1`, in pixels?
answer: 48
explain: The preferred size is 1.5rem + 2.5vw = 24px + 2.5% of 1280px = 24 + 32 = 56px. That's above the maximum, so `clamp` gives 3rem: 48px. Below about 960px the preferred value takes over and the heading shrinks with the window.
verify: page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1280px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return parseFloat(f.contentWindow.getComputedStyle(f.contentDocument.querySelector('h1')).fontSize); })()" server=static
```

```check
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1280px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('h1')).fontSize; })()" 48px server=static label="at 1280px the h1 is its maximum, 48px"
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 600px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const size = parseFloat(f.contentWindow.getComputedStyle(f.contentDocument.querySelector('h1')).fontSize); return size >= 32 && size < 40; })()" true server=static label="at 400px it's smaller, and never below 32px"
```

## Nothing scrolls sideways

The one thing a responsive page must never do is make the reader scroll sideways. It happens when something refuses to shrink: a fixed `width`, a long unbroken word or URL, a wide image. Test it at the smallest width people really use, 320px, as well as at 400px and 768px. In the device toolbar, a page that's too wide shows a horizontal scrollbar, or white space down its right edge.

There's nothing new to type in this step: it's a check across sizes, the kind you'll run on every page you build from now on.

```check
page playground/site/index.html "(async () => { const widths = [320, 400, 768]; const results = []; for (const w of widths) { const f = document.createElement('iframe'); f.style.cssText = `width: ${w}px; height: 600px; border: 0`; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); results.push(f.contentDocument.documentElement.scrollWidth <= w); } return results.every(Boolean); })()" true server=static label="no sideways scrolling at 320px, 400px or 768px"
```

## Commit

```powershell
git commit -am "Make the portfolio responsive: a mobile-first header and fluid type"
```

```check
git-clean
```

## Your turn: stack the split on small screens

Make the About section mobile first: **one column** on screens narrower than 48rem, with the heading, then the paragraph, then the skills, one under another; and the two-column layout, with the skills in the second column, from 48rem up.

Check it in the device toolbar at 400px and at 1000px. Commit when it's done.

```check
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('.split')).gridTemplateColumns.split(' ').length; })()" 1 server=static label="at 400px the about section is one column" -- Make the base .split rule one column, and add the columns inside a min-width media query.
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const p = d.querySelector('#about p').getBoundingClientRect(); const s = d.querySelector('.skills').getBoundingClientRect(); return Math.abs(p.left - s.left) < 2 && s.top >= p.bottom - 1 && f.contentWindow.getComputedStyle(d.querySelector('.split')).gridTemplateColumns.split(' ').length === 1; })()" true server=static label="at 400px the skills sit under the paragraph, with no extra column" -- grid-column: 2 on a one-column grid makes a second column appear. Move it into the media query too.
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1000px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('.split')).gridTemplateColumns.split(' ').length; })()" 2 server=static label="at 1000px it's two columns again"
page playground/site/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1000px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const p = d.querySelector('#about p').getBoundingClientRect(); const s = d.querySelector('.skills').getBoundingClientRect(); return Math.abs(p.left - s.left) < 2; })()" true server=static label="at 1000px the skills are still in the second column"
git-clean -- Commit it: git commit -am "Stack the about section on small screens"
```

```hints
nudge: The header in this lesson is the pattern: a simple base rule, and the wider layout inside `@media (min-width: 48rem)`.
concept: A grid with no `grid-template-columns` has one column. But `grid-column: 2` on an item **creates** a second column if there isn't one, so the skills' placement has to move into the media query as well.
shape: The `.split` rule loses its `grid-template-columns`, and `.skills` loses its `grid-column`. Both come back inside one `@media (min-width: 48rem)` block placed after them.
answer: ~~~css
.split {
  display: grid;
  gap: var(--space-4);
  align-items: start;
}

@media (min-width: 48rem) {
  .split {
    grid-template-columns: 1fr 2fr;
  }

  .skills {
    grid-column: 2;
  }
}
~~~
And remove `grid-column: 2;` from the `.skills` rule.
```

## The styling section is done

You can now take a blank page to something that looks designed: meaningful HTML, rules you can predict, consistent space, a type scale, an accessible palette with a dark theme, layouts in one direction and in two, and a page that works on any screen. The next three lessons put that to work on a real interface, the spreadsheet.
