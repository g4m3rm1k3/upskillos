---
title: 2.6 — Solution: A Page from a Design
runtime: none
teaches: flex columns
uses: working from a brief, css grid, media queries, flexbox
---

This lesson builds the designer's own version of the Gridwise pricing page, in a separate folder, `playground/pricing-reference`, so your version stays exactly as you made it. When it's done, open the two side by side and compare.

**If your page passed every check, you don't have to type this one.** Read each step's explanation, compare the decision with yours, and type only the parts you'd like to have done differently. If your page didn't pass, typing this version, step by step, shows where yours went another way.

## A page to fill

This step opens `playground/pricing-reference/index.html`. It's the usual start, from memory by now:

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
  </body>
</html>
```

- **The title** names the page first and the product second, *Pricing — Gridwise*, so a row of browser tabs shows *Pricing* where it can be read. Small, but it's the first thing a designer would notice.
- **The viewport line** is there from the first line written, because forgetting it is the most common reason a responsive page isn't (Styling 7).
- **The stylesheet is linked already**, though it doesn't exist yet. The browser quietly ignores a missing stylesheet, so the page still opens, unstyled, while you write the HTML. Writing all the HTML before any CSS is the order the challenge recommended: structure first.

```check
page playground/pricing-reference/index.html "document.title" "Pricing — Gridwise" label="the page's title"
```

## The header

The product's name and the nav, as on the portfolio:

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
  </body>
</html>
```

- **`class="site-header"`, rather than styling the `header` element itself.** A page can have more than one `header` element: an article is allowed one of its own. Styling the page's header by a class keeps its rules from catching any others that appear later.
- **`class="brand"`** is the product name. It's a link, as on most sites, so clicking the name takes you home.
- **The links go to `#`** because the brief didn't give their pages. A link to `#` is a placeholder that goes nowhere; on a real site, it's the first thing a reviewer would ask about.

```check
page playground/pricing-reference/index.html "document.querySelectorAll('body > header nav ul li a').length" 3 label="a header with a nav of three links"
```

## Main, the intro and the footer

The page's own content, starting with its one heading, and the footer with the small print:

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
    </main>
    <footer>
      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>
    </footer>
  </body>
</html>
```

- **The intro is a `section` with a class and no `id`.** Nothing links to it, so it doesn't need an `id`; the class is for styling, to centre it later.
- **The `h1` says what the page offers, not what it is.** *Simple, honest pricing* rather than *Pricing*: the brief gave the words, and a designer chose them to make a promise.
- **The footer's small print** is honest about the product being made up. Footers are where pages say the things that matter legally and matter less to most readers.

```check
page playground/pricing-reference/index.html "document.querySelectorAll('body > header, header nav, body > main, body > footer').length === 4 && document.querySelectorAll('h1').length === 1" true label="1. a header with a nav, a main, a footer, and one h1" -- The brief's Structure section lists the landmarks.
```

## One plan

Each plan is an `article`: it stands on its own, and a screen-reader user can jump from plan to plan. Start the plans' section with the first:

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
      </section>
    </main>
    <footer>
      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>
    </footer>
  </body>
</html>
```

- **`<span class="amount">`**: a `span` is the inline version of a `div`, a wrapper that means nothing. It exists only so the number can be styled bigger than the words around it, while the sentence *$0 per month* stays one sentence for a screen reader.
- **The features are a list**, because they are one: a screen reader announces how many there are.
- **The button is a link (`<a>`)** because it goes somewhere: to sign up. HTML's `<button>` element is for doing something *on* the page, like submitting a form. Choose by what it does, not by how it should look; CSS decides the look.

```check
page playground/pricing-reference/index.html "document.querySelectorAll('main article.plan').length >= 1" true label="the first plan is an article"
```

## The featured plan

The middle plan, the one the business most wants people to choose:

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
      </section>
    </main>
    <footer>
      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>
    </footer>
  </body>
</html>
```

- **Two classes, `plan featured`**: it's a plan like the others, and also featured. The tests find it by `featured`, the hook the brief asked for, and the styling uses the same class.
- **The badge comes first**, before the heading, so it's read before the plan's name: *Most popular, Team*. It's a `p`, not a heading, because it doesn't start a section; it describes the one it's in.
- **Its button has no `secondary` class**: it's the one filled button on the page, so it's the one the eye goes to.

```check
page playground/pricing-reference/index.html "document.querySelectorAll('.plan.featured .badge').length" 1 label="the featured plan has its badge"
```

## The third plan

The last plan. Try it without looking at the other two: same elements, different words.

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

The third plan's first feature is *Everything in Team*. That's how pricing pages keep lists short and comparable: each plan lists only what it adds. Its button says *Contact sales*, not *Buy*, because businesses usually want to talk before they pay, and the brief said so.

With the HTML complete, open the page: unstyled, but every part of the brief is there, and the structure checks pass before any CSS. That's the point of writing it first.

```check
page playground/pricing-reference/index.html "(() => { const plans = [...document.querySelectorAll('main article.plan')]; return plans.length === 3 && plans.every((p) => p.querySelector('h2') && p.querySelector('.price') && p.querySelectorAll('ul > li').length >= 3 && p.querySelector('a.button')); })()" true label="2. three plans, each an article with an h2, a price, three or more features and a button"
page playground/pricing-reference/index.html "(() => { const f = document.querySelectorAll('.plan.featured'); return f.length === 1 && f[0] === document.querySelectorAll('.plan')[1] && f[0].textContent.includes('Most popular'); })()" true label="3. the middle plan, and only it, is featured, and says Most popular"
```

## A reset and spacing

This step opens the stylesheet, `playground/pricing-reference/style.css`. Begin as every stylesheet in this course has:

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
}
```

- **`box-sizing: border-box`** for every element, so a width always includes padding and border (Styling 3). Without it, the plans' padding would make them wider than their grid columns.
- **Four spaces, `--space-2` to `--space-5`.** The portfolio had five; this page never needs the smallest. A token nobody uses is noise, so the scale holds exactly what the design uses, and nothing else.
- **`rem` throughout**, so spacing grows with the reader's text size, as type does.

```check
page playground/pricing-reference/index.html "getComputedStyle(document.querySelector('main')).boxSizing" border-box label="every element uses border-box"
```

## Colour tokens

The same palette as your portfolio, plus one new token:

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
```

- **The colours** are the portfolio's. They passed the contrast rules there, against white and against the surface colour, so they'll pass here: reusing a checked palette is faster and safer than inventing one.
- **`--radius`** is new. The plans, the badge and the buttons all have rounded corners, and the design wants them consistent, so the size is a token like any other.
- **Blank lines separate the groups** of tokens: spacing, colour, shape. Small things like that make a file quick to scan.

```check
page playground/pricing-reference/index.html "[...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule.selectorText === ':root' && [...rule.style].filter((name) => name.startsWith('--')).length >= 3))" true server=static label="12. at least three design tokens on :root"
```

## The body

The body's font, line spacing and colours:

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
```

- **`margin: 0`** removes the browser's 8px around the page, as on the portfolio: the header's border will run edge to edge.
- **`line-height: 1.6`** for comfortable body text (Styling 4).
- **`color` and `background` from the tokens**, so a dark theme later would only need new values for the tokens.

```check
page playground/pricing-reference/index.html "getComputedStyle(document.body).color" "rgb(31, 41, 51)" label="the body text is --color-text"
```

## Headings

The two heading levels the page uses:

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
```

- **Shared rules first** (`h1, h2`): a tight line height for big text, and space below only, from the scale.
- **The `h1` is fluid** with `clamp` (Styling 7): it grows with the window between 2rem and 3rem, so it's big on a monitor and still fits on a phone.
- **No `h3` rule**, because the page has no `h3`. Styling only what exists keeps the stylesheet honest about the page.

```check
page playground/pricing-reference/index.html "getComputedStyle(document.querySelector('h2')).fontSize" 24px label="plan names are 1.5rem"
```

## Paragraphs, links and focus

The last base rules:

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

- **Paragraphs** get space below only, like headings, so text flows evenly.
- **Links** use the accent, so they're recognisable without an underline being the only clue.
- **`:focus-visible` comes now, with the base styles**, not at the end of the work. Keyboard focus is the thing most often forgotten, and writing it early is how you make sure it never is.

```check
page playground/pricing-reference/index.html "[...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => (rule.selectorText ?? '').includes(':focus-visible')))" true server=static label="11. the page styles keyboard focus with :focus-visible"
```

## The header in a row

A flex row with the brand on the left and the nav on the right:

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
```

- **`display: flex` with `justify-content: space-between`** puts the brand at the start and the nav at the end (Styling 5).
- **`flex-wrap: wrap`** is the difference from the portfolio. On a 320px screen the brand and three links don't fit on one line, so the nav simply wraps under the brand, and `gap` spaces them in both directions. Letting things wrap is often all the responsiveness a small component needs, with no media query.
- **A bottom border** separates the header from the content, in the border token.
- **`.brand`** looks like a logo: bigger, bolder, no underline, the text colour.

```check
page playground/pricing-reference/index.html "getComputedStyle(document.querySelector('.site-header')).flexWrap" wrap label="the header wraps when it must"
```

## The nav

The nav's list as a row, and its links as plain bold text:

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

- **The list becomes a row** with `display: flex` and a gap, and the three usual lines remove its bullets and indent. It's still a `<ul>` for screen readers.
- **The selectors start with `.site-header`**, so these rules can't reach a list anywhere else on the page: the plans have lists too, and they must keep their bullets.
- **The links take the text colour** and lose their underline: in a nav, position says "link" clearly enough.

```check
page playground/pricing-reference/index.html "getComputedStyle(document.querySelector('.site-header ul')).listStyleType" none label="the nav list has no bullets"
```

## The column

The centred column for the content, and a centred intro:

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
```

- **`main` is the column**: at most 70rem, as the brief says, centred by `auto` margins, with padding so nothing touches the edges of a small screen (Styling 3).
- **The intro is centred** with `text-align: center`: a short heading and one sentence read well centred. Longer text never does, because each line starts in a different place.
- **The intro's sentence is muted**, in `--color-muted`: it supports the heading, it doesn't compete with it.
- **Space below the intro**, from the scale, separates it from the plans.

```check
page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1400px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const m = d.querySelector('main').getBoundingClientRect(); return m.width <= 1120 && Math.abs(m.left - (d.documentElement.clientWidth - m.right)) < 2; })()" true server=static label="7. at 1400px the content is a centred column no wider than 70rem"
```

## The plans: mobile first

A grid for the plans, with columns only when there's room:

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

- **`.plans`** has **no columns** set, so it's one column: the phone layout. The `min-width: 60rem` query adds three equal columns when there's room.
- **Why 60rem?** Drag the window: below about 960px, three plans get too narrow for their prices to sit on one line. That's where this layout breaks, so that's the breakpoint. (Yours might break somewhere else. A breakpoint belongs to the layout, not to a device.)
- **Why not `auto-fit`** (Styling 6)? It might show two plans side by side and the third alone below. A pricing page should show all its plans together, or one at a time, so they can be compared.

```check
page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1100px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const r = [...d.querySelectorAll('.plan')].map((p) => p.getBoundingClientRect()); return Math.abs(r[0].top - r[1].top) < 2 && Math.abs(r[1].top - r[2].top) < 2 && r[0].right <= r[1].left && r[1].right <= r[2].left; })()" true server=static label="4. at 1100px the plans sit side by side"
page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const r = [...d.querySelectorAll('.plan')].map((p) => p.getBoundingClientRect()); return r[1].top >= r[0].bottom - 1 && r[2].top >= r[1].bottom - 1; })()" true server=static label="5. at 400px they stack, one under another"
```

## Plans as cards

Each plan as a card, and the trick that lines up the buttons:

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
```

- **A card**: padding, a border, rounded corners from the token, and the surface colour, as on the portfolio.
- **Each plan is a flex column** (`flex-direction: column`), so its badge, heading, price, list and button stack.
- **Its feature list has `flex: 1`**: the list grows to fill whatever space is left in the plan. Grid items in a row are stretched to the same height, so the plans are equal; the lists absorb the difference; and the buttons, after the lists, end up level along the bottom, though Free has three features and the others four.

```predict
question: Without `flex: 1` on the feature lists, where would the three buttons be, at 1100px wide?
choice: Level along the bottom of the plans, as now
choice: Right under each list, at different heights
answer: Right under each list, at different heights
explain: The plans would still be stretched to equal heights by the grid, but each plan's content would stack from the top: Free's shorter list would put its button higher than the others, and the empty space would collect at the bottom of the plan instead.
verify: page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1100px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; d.querySelectorAll('.plan ul').forEach((u) => (u.style.flex = 'none')); const b = [...d.querySelectorAll('.plan .button')].map((x) => x.getBoundingClientRect().bottom); return Math.max(...b) - Math.min(...b) < 2 ? 'Level along the bottom of the plans, as now' : 'Right under each list, at different heights'; })()" server=static
```

```check
page playground/pricing-reference/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1100px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const b = [...d.querySelectorAll('.plan .button')].map((x) => x.getBoundingClientRect().bottom); return Math.max(...b) - Math.min(...b) < 2; })()" true server=static label="at 1100px the three buttons line up"
```

## The featured plan stands out

The brief says the featured plan must stand out:

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
```

- **`.featured`** gets a 2px border in the accent colour. It stands out by colour and weight, without a different size or layout that would make the plans harder to compare side by side.
- **`.badge`** is a pill: accent background, text-on-accent colour, small bold text, and `border-radius: 999px`, a radius so big that the ends are fully round whatever the badge's height.
- **`align-self: flex-start`** stops the badge stretching across the whole plan. Flex items stretch across the cross axis by default, and in a column the cross axis is the width.

```check
page playground/pricing-reference/index.html "(() => { const plans = document.querySelectorAll('.plan'); return getComputedStyle(plans[1]).borderTopColor !== getComputedStyle(plans[0]).borderTopColor; })()" true label="8. the featured plan's border is a different colour from the others"
```

## Prices

The number is what people compare, so it's the biggest thing in each plan:

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

- **`.price`** is muted: *per month* and *per person* matter, but less than the number.
- **`.amount`** is dark, 2rem and bold, the boldest thing in the plan after the name.
- One element, two levels of importance: exactly what the `span` in the HTML was for.

```check
page playground/pricing-reference/index.html "getComputedStyle(document.querySelector('.amount')).fontSize" 32px label="the amount is 2rem"
```

## Buttons

The buttons, filling their plans' width:

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
```

- **`display: block`** makes each button as wide as its plan: a big, easy target, on a phone especially.
- **`text-align: center`** centres the words in that width.
- **Semi-bold text and no underline** (`font-weight: 600`, `text-decoration: none`) make it read as a control, not as a link in the middle of a sentence.
- **The colours** are the accent and the text-on-accent token, 5.17 : 1, with a 2px border in the same colour so that outlined and filled buttons are exactly the same size.

```check
page playground/pricing-reference/index.html "(() => { const rgb = (s) => s.match(/[0-9.]+/g).slice(0, 3).map(Number); const lum = (c) => c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }; const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; }; return [...document.querySelectorAll('.button')].every((b) => ratio(getComputedStyle(b).color, bg(b)) >= 4.5); })()" true label="10. every button's text reaches 4.5 : 1"
```

## States, and the quieter buttons

Hover, and the outlined secondary buttons:

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
```

- **`:hover`** darkens the button to the stronger accent: a small change that says "clickable".
- **`.button.secondary`** (more specific than `.button`) removes the fill and colours the text with the accent: an outline. The featured plan's filled button is now the one the eye goes to.
- **Their text is the accent on the plan's surface**: 4.82 : 1, just above the line. When a check is that close, it's worth knowing, because one shade lighter would fail it.

```check
page playground/pricing-reference/index.html "(() => { const rgb = (s) => s.match(/[0-9.]+/g).slice(0, 3).map(Number); const lum = (c) => c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }; const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; }; return [...document.querySelectorAll('main h1, main h2, main p, main li, main a')].every((el) => ratio(getComputedStyle(el).color, bg(el)) >= 4.5); })()" true label="9. all text in main reaches 4.5 : 1 against its background" -- Check each colour pair with the DevTools colour picker.
```

## The footer

The footer is the portfolio's:

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

Padding from the scale, a border to separate it, muted centred text. With that, the page is complete.

The last check is the one that catches what the others can't see: nothing may scroll sideways at any width, from a small phone to a wide monitor.

```check
page playground/pricing-reference/index.html "(async () => { const ok = []; for (const w of [320, 400, 768, 1100]) { const f = document.createElement('iframe'); f.style.cssText = `width: ${w}px; height: 800px; border: 0`; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); ok.push(f.contentDocument.documentElement.scrollWidth <= w); } return ok.every(Boolean); })()" true server=static label="6. nothing scrolls sideways at 320, 400, 768 or 1100px"
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
