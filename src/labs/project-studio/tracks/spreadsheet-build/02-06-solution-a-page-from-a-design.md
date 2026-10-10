---
title: 2.6 — Solution: A Page from a Design
runtime: none
---

This lesson builds the designer's own version of the Gridwise pricing page, in a separate folder, `playground/pricing-reference`, so your version stays exactly as you made it. When it's done, open the two side by side and compare.

**If your page passed every check, you don't have to type this one.** Read each step's explanation, compare the decision with yours, and type only the parts you'd like to have done differently. If your page didn't pass, typing this version, step by step, shows where yours went another way.

## The HTML

This step opens `playground/pricing-reference/index.html`:

```html file=playground/pricing-reference/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pricing — Gridwise</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="#">Gridwise</a>
      <nav>
        <ul>
          <li><a href="#">Features</a></li>
          <li><a href="#">Pricing</a></li>
          <li><a href="#">Sign in</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <section class="intro">
        <h1>Simple, honest pricing</h1>
        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>
      </section>
      <section class="plans">
        <article class="plan">
          <h2>Free</h2>
          <p class="price"><span class="amount">$0</span> per month</p>
          <ul>
            <li>3 workbooks</li>
            <li>Formulas and charts</li>
            <li>Export to CSV</li>
          </ul>
          <a class="button secondary" href="#">Start free</a>
        </article>
        <article class="plan featured">
          <p class="badge">Most popular</p>
          <h2>Team</h2>
          <p class="price"><span class="amount">$8</span> per person, per month</p>
          <ul>
            <li>Unlimited workbooks</li>
            <li>Live collaboration</li>
            <li>Version history</li>
            <li>Shared templates</li>
          </ul>
          <a class="button" href="#">Try Team free</a>
        </article>
        <article class="plan">
          <h2>Business</h2>
          <p class="price"><span class="amount">$20</span> per person, per month</p>
          <ul>
            <li>Everything in Team</li>
            <li>Permissions by role</li>
            <li>Audit log</li>
            <li>Priority support</li>
          </ul>
          <a class="button secondary" href="#">Contact sales</a>
        </article>
      </section>
    </main>
    <footer>
      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>
    </footer>
  </body>
</html>
```

The decisions:

- **An `article` per plan**: each one stands on its own, which is what `article` means. A screen reader user can jump from plan to plan.
- **The badge comes first** inside the featured plan, before its heading, so it's read before the plan's name: *Most popular, Team*. It's a `p`, not a heading: it doesn't start a section.
- **`<span class="amount">`**: a `span` is the inline version of a `div`, a meaningless wrapper. It exists only so the number can be styled bigger than the words around it.
- **Buttons are links (`<a>`)** because they go somewhere: to sign up, to contact sales. HTML's `<button>` element is for doing something *on* the page, like submitting a form. Choosing by what it does, not by how it looks, is semantics again.
- **`site-header`, not just `header`,** as a class: a page can have more than one `header` element (an article can have its own), so styling the page's header by class keeps the rule from catching the others.

```check
page playground/pricing-reference/index.html "document.querySelectorAll('body > header, header nav, body > main, body > footer').length === 4 && document.querySelectorAll('h1').length === 1" true label="1. a header with a nav, a main, a footer, and one h1" -- The brief's Structure section lists the landmarks.
page playground/pricing-reference/index.html "(() => { const plans = [...document.querySelectorAll('main article.plan')]; return plans.length === 3 && plans.every((p) => p.querySelector('h2') && p.querySelector('.price') && p.querySelectorAll('ul > li').length >= 3 && p.querySelector('a.button')); })()" true label="2. three plans, each an article with an h2, a price, three or more features and a button"
page playground/pricing-reference/index.html "(() => { const f = document.querySelectorAll('.plan.featured'); return f.length === 1 && f[0] === document.querySelectorAll('.plan')[1] && f[0].textContent.includes('Most popular'); })()" true label="3. the middle plan, and only it, is featured, and says Most popular"
```

## Tokens and base styles

This step opens the stylesheet, `playground/pricing-reference/style.css`:

```css file=playground/pricing-reference/style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
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

  --radius: 0.75rem;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

h1,
h2 {
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}

h1 {
  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);
}

h2 {
  font-size: 1.5rem;
}

p {
  margin: 0 0 var(--space-3);
}

a {
  color: var(--color-accent);
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
```

The same palette as your portfolio: it passed the contrast rules there, so it will here. A new token, `--radius`, keeps the plans' corners consistent. The `h1` is fluid from the start (Styling 7). `:focus-visible` comes early, so keyboard focus is never forgotten.

```check
page playground/pricing-reference/index.html "[...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => (rule.selectorText ?? '').includes(':focus-visible')))" true server=static label="11. the page styles keyboard focus with :focus-visible"
page playground/pricing-reference/index.html "[...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule.selectorText === ':root' && [...rule.style].filter((name) => name.startsWith('--')).length >= 3))" true server=static label="12. at least three design tokens on :root"
```

## The header

```css file=playground/pricing-reference/style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
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

  --radius: 0.75rem;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

h1,
h2 {
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}

h1 {
  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);
}

h2 {
  font-size: 1.5rem;
}

p {
  margin: 0 0 var(--space-3);
}

a {
  color: var(--color-accent);
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.site-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.brand {
  color: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
}

.site-header ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-header nav a {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}
```

A flex row with `space-between`, as on the portfolio, plus `flex-wrap: wrap`. On a 320px screen the brand and the three links don't fit on one line: instead of a media query, the nav simply wraps under the brand. `gap` spaces them in both directions. Letting things wrap is often all the "responsive" a small component needs.

## The plans: mobile first

```css file=playground/pricing-reference/style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
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

  --radius: 0.75rem;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

h1,
h2 {
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}

h1 {
  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);
}

h2 {
  font-size: 1.5rem;
}

p {
  margin: 0 0 var(--space-3);
}

a {
  color: var(--color-accent);
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.site-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.brand {
  color: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
}

.site-header ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-header nav a {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

main {
  max-width: 70rem;
  margin: 0 auto;
  padding: var(--space-5) var(--space-3);
}

.intro {
  margin-bottom: var(--space-5);
  text-align: center;
}

.intro p {
  color: var(--color-muted);
}

.plans {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 60rem) {
  .plans {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

- **`main`** is the centred column: 70rem at most, `auto` margins, padding for small screens.
- **`.plans`** is a grid with **no columns** set, so it's one column: the phone layout. The `min-width: 60rem` query adds three equal columns when there's room.
- **Why 60rem?** Drag the window: below about 960px, three plans get too narrow for their prices to sit on one line. That's where this layout breaks, so that's the breakpoint. (Your page might break somewhere else; a breakpoint belongs to the layout, not to a device.)
- `auto-fit` (Styling 6) would also work, but it might show two plans side by side and the third alone below: a pricing page should show all its plans together, or one at a time.

```check
page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1100px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const r = [...d.querySelectorAll('.plan')].map((p) => p.getBoundingClientRect()); return Math.abs(r[0].top - r[1].top) < 2 && Math.abs(r[1].top - r[2].top) < 2 && r[0].right <= r[1].left && r[1].right <= r[2].left; })()" true server=static label="4. at 1100px the plans sit side by side"
page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const r = [...d.querySelectorAll('.plan')].map((p) => p.getBoundingClientRect()); return r[1].top >= r[0].bottom - 1 && r[2].top >= r[1].bottom - 1; })()" true server=static label="5. at 400px they stack, one under another"
page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1400px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const m = d.querySelector('main').getBoundingClientRect(); return m.width <= 1120 && Math.abs(m.left - (d.documentElement.clientWidth - m.right)) < 2; })()" true server=static label="7. at 1400px the content is a centred column no wider than 70rem"
```

## Plans that line up

```css file=playground/pricing-reference/style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
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

  --radius: 0.75rem;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

h1,
h2 {
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}

h1 {
  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);
}

h2 {
  font-size: 1.5rem;
}

p {
  margin: 0 0 var(--space-3);
}

a {
  color: var(--color-accent);
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.site-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.brand {
  color: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
}

.site-header ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-header nav a {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

main {
  max-width: 70rem;
  margin: 0 auto;
  padding: var(--space-5) var(--space-3);
}

.intro {
  margin-bottom: var(--space-5);
  text-align: center;
}

.intro p {
  color: var(--color-muted);
}

.plans {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 60rem) {
  .plans {
    grid-template-columns: repeat(3, 1fr);
  }
}

.plan {
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.plan ul {
  flex: 1;
  margin: 0 0 var(--space-4);
  padding-left: var(--space-4);
}

.featured {
  border: 2px solid var(--color-accent);
}

.badge {
  align-self: flex-start;
  margin: 0 0 var(--space-2);
  padding: 0 var(--space-3);
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 0.875rem;
  font-weight: 600;
}

.price {
  color: var(--color-muted);
}

.amount {
  color: var(--color-text);
  font-size: 2rem;
  font-weight: 700;
}
```

- **Each plan is a flex column**, and its feature list has **`flex: 1`**: the list grows to fill whatever space is left in the plan. Grid items in a row are stretched to the same height, so the plans are equal; the lists absorb the difference; and the buttons, after the lists, end up level along the bottom, though Free has three features and the others four.
- **`.featured`** gets a 2px accent border: it stands out by colour and weight, without a different layout that would make the plans harder to compare.
- **`.badge`** is a pill: `align-self: flex-start` stops it stretching across the plan (flex items stretch across the cross axis by default), and `border-radius: 999px` rounds its ends fully.
- **`.price`** is muted, and **`.amount`** big and dark: the number is what people compare.

```predict
question: Without `flex: 1` on the feature lists, where would the three buttons be, at 1100px wide?
choice: Level along the bottom of the plans, as now
choice: Right under each list, at different heights
answer: Right under each list, at different heights
explain: The plans would still be stretched to equal heights by the grid, but each plan's content would stack from the top: Free's shorter list would put its button higher than the others, and the empty space would collect at the bottom of the plan instead.
verify: page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1100px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; d.querySelectorAll('.plan ul').forEach((u) => (u.style.flex = 'none')); const b = [...d.querySelectorAll('.plan .button')].map((x) => x.getBoundingClientRect().bottom); return Math.max(...b) - Math.min(...b) < 2 ? 'Level along the bottom of the plans, as now' : 'Right under each list, at different heights'; })()" server=static
```

```check
page playground/pricing-reference/index.html "(() => { const plans = document.querySelectorAll('.plan'); return getComputedStyle(plans[1]).borderTopColor !== getComputedStyle(plans[0]).borderTopColor; })()" true label="8. the featured plan's border is a different colour from the others"
page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1100px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const b = [...d.querySelectorAll('.plan .button')].map((x) => x.getBoundingClientRect().bottom); return Math.max(...b) - Math.min(...b) < 2; })()" true server=static label="at 1100px the three buttons line up"
```

## Buttons and the footer

```css file=playground/pricing-reference/style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
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

  --radius: 0.75rem;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

h1,
h2 {
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}

h1 {
  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);
}

h2 {
  font-size: 1.5rem;
}

p {
  margin: 0 0 var(--space-3);
}

a {
  color: var(--color-accent);
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.site-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.brand {
  color: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
}

.site-header ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-header nav a {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

main {
  max-width: 70rem;
  margin: 0 auto;
  padding: var(--space-5) var(--space-3);
}

.intro {
  margin-bottom: var(--space-5);
  text-align: center;
}

.intro p {
  color: var(--color-muted);
}

.plans {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 60rem) {
  .plans {
    grid-template-columns: repeat(3, 1fr);
  }
}

.plan {
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.plan ul {
  flex: 1;
  margin: 0 0 var(--space-4);
  padding-left: var(--space-4);
}

.featured {
  border: 2px solid var(--color-accent);
}

.badge {
  align-self: flex-start;
  margin: 0 0 var(--space-2);
  padding: 0 var(--space-3);
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 0.875rem;
  font-weight: 600;
}

.price {
  color: var(--color-muted);
}

.amount {
  color: var(--color-text);
  font-size: 2rem;
  font-weight: 700;
}

.button {
  display: block;
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-accent);
  border-radius: 0.5rem;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 600;
  text-align: center;
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

footer {
  padding: var(--space-4) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-muted);
  text-align: center;
}
```

The buttons are `display: block`, so each fills its plan's width: a big, easy target, on a phone especially. The secondary buttons are outlined, so the featured plan's filled button is the one the eye goes to. The footer is the portfolio's.

```check
page playground/pricing-reference/index.html "(async () => { const ok = []; for (const w of [320, 400, 768, 1100]) { const f = document.createElement('iframe'); f.style.cssText = `width: ${w}px; height: 800px; border: 0`; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); ok.push(f.contentDocument.documentElement.scrollWidth <= w); } return ok.every(Boolean); })()" true server=static label="6. nothing scrolls sideways at 320, 400, 768 or 1100px"
page playground/pricing-reference/index.html "(() => { const rgb = (s) => s.match(/[0-9.]+/g).slice(0, 3).map(Number); const lum = (c) => c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }; const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; }; return [...document.querySelectorAll('main h1, main h2, main p, main li')].every((el) => ratio(getComputedStyle(el).color, bg(el)) >= 4.5); })()" true label="9. all text in main reaches 4.5 : 1 against its background" -- Check each colour pair with the DevTools colour picker.
page playground/pricing-reference/index.html "(() => { const rgb = (s) => s.match(/[0-9.]+/g).slice(0, 3).map(Number); const lum = (c) => c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }; const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; }; return [...document.querySelectorAll('.button')].every((b) => ratio(getComputedStyle(b).color, bg(b)) >= 4.5); })()" true label="10. every button's text reaches 4.5 : 1"
```

## Compare

Open both pages side by side, at a few widths: `start playground/pricing/index.html` and `start playground/pricing-reference/index.html`. Look for:

- **Decisions the brief left open**: the breakpoint, the colours, how the featured plan stands out, where the buttons sit. Neither version is wrong because it differs; ask which reads better, and why.
- **Anything the tests missed**: spacing that's inconsistent, a heading that's too big on a phone, a hover state that's missing.
- **Code you'd write differently now**: shorter selectors, a token you didn't have.

Commit the reference, and push:

```powershell
git add playground/pricing-reference
git commit -m "Add the reference pricing page"
git push
```

```check
git-tracked playground/pricing-reference/style.css
git-clean
git-pushed
```

## Your turn: buttons that line up, on your page

Add a fifth feature to the **Business** plan on **your** page (`playground/pricing`): *Single sign-on*. Then make sure that at 1100px wide your three buttons sit level along the bottom of their plans, whatever the lengths of the lists. If yours already do, the fifth feature proves it.

Commit and push.

```check
page playground/pricing/index.html "document.querySelectorAll('.plan')[2].querySelectorAll('ul > li').length >= 5" true label="your Business plan has five features" -- Add <li>Single sign-on</li> to the Business plan's list.
page playground/pricing/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1100px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const b = [...d.querySelectorAll('.plan .button')].map((x) => x.getBoundingClientRect().bottom); return Math.max(...b) - Math.min(...b) < 2; })()" true server=static label="at 1100px your three buttons line up"
git-clean -- Commit it: git commit -am "Line up the plan buttons"
git-pushed
```

```hints
nudge: Make each plan a column whose last item stays at the bottom. Which part of the plan should absorb the extra height?
concept: Grid stretches items in a row to the same height. Inside each plan, a flex column with `flex: 1` on one child makes that child grow to take the leftover space, pushing everything after it to the bottom.
shape: `.plan` gets `display: flex` and `flex-direction: column`; the plan's list gets `flex: 1`. If your plans aren't equal heights, check that nothing sets `align-items` on the grid.
answer: ~~~css
.plan {
  display: flex;
  flex-direction: column;
}

.plan ul {
  flex: 1;
}
~~~
```
