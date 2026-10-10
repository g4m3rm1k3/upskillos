---
title: Styling 4 — Type and Colour
runtime: none
---

Most of a web page is text, so most of how a page looks is how its text looks: sizes that make the structure obvious at a glance, lines short enough to read, and colours that are calm, consistent and readable by everyone. This lesson gives the portfolio a type scale and a colour palette, and buttons that respond to the mouse and the keyboard.

## Sizes in rem, and a type scale

Headings should look like what they are: the `h1` biggest, each level smaller, body text comfortable. A **type scale** is a short set of sizes, each a fixed step bigger than the last, chosen once like the spacing scale. Change `playground/site/style.css` to this (the new rules are under `body`):

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
  font-size: 1rem;
  line-height: 1.6;
  color: #1f2933;
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

header {
  padding: var(--space-3);
}

main section {
  padding: var(--space-5) 0;
}
```

(Your rules from the last Your turn may sit somewhere else in your file, or be written a little differently. Keep yours if they pass.)

- **Sizes in `rem`.** People who find small text hard to read set a bigger default font size in their browser. Sizes in `rem` grow with that setting; sizes in `px` ignore it. So: `rem` for anything to do with text.
- **The scale** goes 1, 1.25, 1.75, 2.5: each step about 1.4 times the last. A clear, regular jump is what makes a heading look like a heading.
- **`line-height: 1.6`** puts space between lines of body text; long text set tight is tiring to read. Headings are short and big, so they get a tighter `1.2`. A `line-height` without a unit means "times this element's font size".
- **Margins only below.** Browsers give headings and paragraphs margins above *and* below, in sizes that vary by element. Setting every one to `0 0 var(--space-3)` makes the flow of text regular, and keeps space on the scale.
- **`max-width: 65ch`** keeps lines to about 65 characters. `ch` is the width of the character `0` in the current font. 45 to 75 characters is the range typographers have recommended for centuries.

Now an experiment on what `rem` buys you:

```predict
question: `h1` is `2.5rem`. A reader has set their browser's default text size to 20px instead of 16px. How big is the `h1`, in pixels?
answer: 50
explain: `rem` is relative to the root element's font size, which follows the reader's setting: 2.5 × 20 = 50. Written as `40px`, it would stay 40 whatever the reader needed.
verify: page playground/site/index.html "(() => { document.documentElement.style.fontSize = '20px'; return parseFloat(getComputedStyle(document.querySelector('h1')).fontSize); })()"
```

```check
page playground/site/index.html "getComputedStyle(document.querySelector('h1')).fontSize" 40px label="the h1 is 2.5rem (40px)"
page playground/site/index.html "getComputedStyle(document.querySelector('h2')).fontSize" 28px label="h2s are 1.75rem (28px)"
page playground/site/index.html "getComputedStyle(document.body).lineHeight" 25.6px label="body text has a line height of 1.6"
page playground/site/index.html "getComputedStyle(document.querySelector('#about p')).maxWidth !== 'none'" true label="paragraphs have a maximum width"
page playground/site/index.html "(() => { document.documentElement.style.fontSize = '20px'; return getComputedStyle(document.querySelector('h1')).fontSize; })()" 50px label="the h1 grows with the reader's text size (rem, not px)" -- Write the sizes in rem.
```

## A palette, as tokens

A good palette is small: a few **neutrals** (the page's background, a slightly different surface for cards, a border, the text, and a quieter text for less important things) and **one accent** colour for links and buttons. Every colour on the page comes from that list. Name them on `:root`, like the spacing:

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
```

- **`--color-text`** and **`--color-bg`** are the page's main pair. **`--color-surface`** is a shade off the background, for cards: just enough to separate them without a heavy border. **`--color-muted`** is for text that matters less, like the footer.
- **The accent** gets a stronger version for hover (next step) and a colour for text placed *on* it.
- **`footer`** now has its own rule: a thin top border, centred muted text. `text-align: center` centres the text inside the box.
- Nothing else names a colour any more: every rule reads a token. Changing the whole palette (or adding a dark one, in this lesson's Your turn) means changing `:root` only.

### Readable for everyone

Light grey text on white looks elegant in a design tool and is unreadable for many people: older eyes, a bright room, a cheap screen. The Web Content Accessibility Guidelines (**WCAG**) put a number on it: the **contrast ratio** between text and its background, from 1 : 1 (the same colour) to 21 : 1 (black on white). Body text needs at least **4.5 : 1**; large headings at least 3 : 1.

```predict
question: The light grey `#9aa5b1` on white looks fine on many screens. Is it enough for body text, at 4.5 : 1 or more?
choice: Yes, easily
choice: No, about 2.5 : 1
answer: No, about 2.5 : 1
explain: It's 2.50 : 1, well under the 4.5 : 1 that body text needs. This palette's muted grey, `#52606d`, is 6.46 : 1, and the main text colour is 14.76 : 1. The accent blue on white is 5.17 : 1, so links pass too.
verify: node -e "const l = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0); const r = (l('ffffff') + 0.05) / (l('9aa5b1') + 0.05); console.log(r >= 4.5 ? 'Yes, easily' : 'No, about 2.5 : 1')"
```

You don't calculate this by hand: in DevTools, click any colour swatch in the Styles pane, and the colour picker shows the contrast ratio against the background, with a tick or a cross.

```check
page playground/site/index.html "getComputedStyle(document.querySelector('.card')).backgroundColor" "rgb(245, 247, 250)" label="cards use the surface colour"
page playground/site/index.html "getComputedStyle(document.querySelector('footer')).color" "rgb(82, 96, 109)" label="the footer's text is muted"
page playground/site/index.html "getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()" "#2563eb" label="the accent is a token on :root"
page playground/site/index.html "getComputedStyle(document.querySelector('#contact a')).color" "rgb(37, 99, 235)" label="links use the accent"
```

## Buttons, hover and focus

The two links at the top, *See my projects* and *About me*, are the actions you most want a visitor to take. They have the class `button`, so give them a button's shape. Add these rules to the end of the file:

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
```

- **`display: inline-block`.** A link is an *inline* element: it flows inside a line of text, and padding above and below it doesn't push other things away. `inline-block` keeps it in the line but makes it a proper box, so its padding works.
- **`:hover`** is a **pseudo-class**: it matches an element only while something is true, here while the mouse is over it. A small change on hover tells people "this is clickable".
- **`.button.secondary`**, two classes with **no space**, means one element with both classes. (With a space, it would mean a `.secondary` *inside* a `.button`.) Its specificity is (0, 2, 0), so it beats `.button` and turns the second button into an outline.
- **`:focus-visible`** matches the element that has the keyboard's focus, when the browser judges a visible marker is needed (when you move with the **Tab** key, not when you click). People who can't use a mouse move through a page with Tab; without a visible focus, they're lost. Never remove the focus outline without replacing it. Press **Tab** a few times on the page to see it move.

```predict
question: The second button has both classes, `button` and `secondary`. Both rules set `background`. Which background does it get?
choice: The accent blue, from .button
choice: Transparent, from .button.secondary
answer: Transparent, from .button.secondary
explain: `.button.secondary` is (0, 2, 0) and `.button` is (0, 1, 0): the more specific rule wins, wherever it's written. So the secondary button is blue text and a blue border on no background, which is exactly what the `color` and inherited `border` give it.
verify: page playground/site/index.html "getComputedStyle(document.querySelector('.button.secondary')).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'Transparent, from .button.secondary' : 'The accent blue, from .button'"
```

```check
page playground/site/index.html "getComputedStyle(document.querySelector('.button')).backgroundColor" "rgb(37, 99, 235)" label="the main button is filled with the accent"
page playground/site/index.html "getComputedStyle(document.querySelector('.button')).color" "rgb(255, 255, 255)" label="its text is white"
page playground/site/index.html "getComputedStyle(document.querySelector('.button')).display" inline-block label="buttons are inline blocks"
page playground/site/index.html "getComputedStyle(document.querySelector('.button.secondary')).backgroundColor" "rgba(0, 0, 0, 0)" label="the secondary button has no fill"
page playground/site/index.html "(() => { const b = document.querySelector('.button'); b.focus(); return getComputedStyle(b).outlineStyle; })()" solid label="a focused button shows an outline"
```

## Commit

```powershell
git commit -am "Give the portfolio a type scale, a palette and buttons"
```

```check
git-clean
```

## Your turn: a dark theme

Many people set their computer to **dark mode**. A page can follow that setting with a **media query**, a block of rules that applies only when a condition is true:

```css
@media (prefers-color-scheme: dark) {
  /* rules here apply only in dark mode */
}
```

(Styling 7 uses media queries for screen sizes.) Because every colour on the page is a token, a dark theme only has to set the tokens again.

Add a dark theme. Inside the media query, redefine the colour tokens on `:root`, with six-digit hex colours like the light theme:

- a **dark background**, and a surface and border that are slightly lighter than it;
- **text and muted text** that both reach at least 4.5 : 1 against the background;
- an **accent** that reaches 4.5 : 1 against the background, and an **on-accent** colour that reaches 4.5 : 1 against the accent (a dark accent text on a light accent is fine).

To see it without changing your computer's settings: in DevTools press **Ctrl+Shift+P**, type `dark`, and choose *Emulate CSS prefers-color-scheme: dark*. Use the colour picker's contrast ratio to check your choices. Commit when it's done.

```check
page playground/site/index.html "(() => { let dark = null; for (const sheet of document.styleSheets) for (const rule of sheet.cssRules) if (rule.media && rule.media.mediaText.includes('prefers-color-scheme: dark')) for (const inner of rule.cssRules) if (inner.selectorText === ':root') dark = inner.style; return dark !== null && dark.getPropertyValue('--color-bg').trim() !== ''; })()" true server=static label="a dark media query sets --color-bg on :root" -- Put a :root rule that sets --color-bg inside @media (prefers-color-scheme: dark).
page playground/site/index.html "(() => { const lum = (hex) => { const h = hex.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0); }; let dark = null; for (const sheet of document.styleSheets) for (const rule of sheet.cssRules) if (rule.media && rule.media.mediaText.includes('prefers-color-scheme: dark')) for (const inner of rule.cssRules) if (inner.selectorText === ':root') dark = inner.style; return lum(dark.getPropertyValue('--color-bg')) < 0.1; })()" true server=static label="the dark background really is dark"
page playground/site/index.html "(() => { const lum = (hex) => { const h = hex.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0); }; const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }; let dark = null; for (const sheet of document.styleSheets) for (const rule of sheet.cssRules) if (rule.media && rule.media.mediaText.includes('prefers-color-scheme: dark')) for (const inner of rule.cssRules) if (inner.selectorText === ':root') dark = inner.style; const v = (n) => dark.getPropertyValue(n); return ratio(v('--color-text'), v('--color-bg')) >= 4.5 && ratio(v('--color-muted'), v('--color-bg')) >= 4.5; })()" true server=static label="text and muted text reach 4.5 : 1 on the dark background" -- Lighten --color-text and --color-muted in the dark theme until the colour picker shows a tick.
page playground/site/index.html "(() => { const lum = (hex) => { const h = hex.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0); }; const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }; let dark = null; for (const sheet of document.styleSheets) for (const rule of sheet.cssRules) if (rule.media && rule.media.mediaText.includes('prefers-color-scheme: dark')) for (const inner of rule.cssRules) if (inner.selectorText === ':root') dark = inner.style; const v = (n) => dark.getPropertyValue(n); return ratio(v('--color-accent'), v('--color-bg')) >= 4.5 && ratio(v('--color-on-accent'), v('--color-accent')) >= 4.5; })()" true server=static label="the accent reads on the background, and button text reads on the accent" -- The dark theme's accent usually needs to be lighter than the light theme's.
git-clean -- Commit it: git commit -am "Add a dark theme"
```

These checks read your dark tokens and compute their contrast, so they prove the theme is readable. Whether it's *pleasant* is for you to judge in the browser.

```hints
nudge: The light theme's `:root` lists eight colour tokens. The dark theme sets the same eight names, inside the media query.
concept: Rules inside `@media (prefers-color-scheme: dark)` apply only in dark mode, and come later in the file than the light `:root`, so with equal specificity they win (the tie-breaking law). Dark themes usually use a very dark blue-grey rather than pure black, light grey text rather than pure white, and a lighter, softer accent.
shape: `@media (prefers-color-scheme: dark) { :root { --color-text: …; --color-muted: …; --color-bg: …; …all eight… } }`, at the end of the file.
answer: ~~~css
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
~~~
```
