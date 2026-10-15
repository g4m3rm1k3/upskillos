---
title: 8.3 — A consistent visual language
runtime: none
---

### The story so far

The interface shell names its regions. Build its visual system incrementally in style.css.

### What this lesson builds

Explain each new visual treatment and judge it in context at more than one viewport.

## Start with shared roles {#base-style}

Style only the shared surface, text, sizing and focus behavior first. These declarations establish the palette and native-control baseline; the page still follows normal document flow. Open the shell, Tab through its controls and identify the focus outline before adding layout. Change --ink and observe inherited text, then restore it.

```css file=style.css
:root { color-scheme: light; --paper: #f7f3e9; --ink: #183e34; --muted: #607168; --line: #dcded2; --gold: #b08535; --felt: #194c3f; --white: #fffdf7; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: 'Avenir Next', Avenir, system-ui, sans-serif; }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: .45; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid var(--gold); outline-offset: 4px; }
[hidden] { display: none !important; }
```

```check
file style.css
```

## Align the masthead {#masthead-style}

Keep the shared rules and add only masthead, brand and main sizing. Flex aligns the masthead children, space-between separates them, and auto margins center the bounded page. Compare the alignment with the plain first stage. Temporarily remove display:flex and predict the change; restore it before continuing.

```css file=style.css
:root { color-scheme: light; --paper: #f7f3e9; --ink: #183e34; --muted: #607168; --line: #dcded2; --gold: #b08535; --felt: #194c3f; --white: #fffdf7; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: 'Avenir Next', Avenir, system-ui, sans-serif; }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: .45; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid var(--gold); outline-offset: 4px; }
[hidden] { display: none !important; }
.masthead { max-width: 1280px; margin: auto; padding: 28px 48px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); }
.brand { color: inherit; text-decoration: none; font-weight: 800; letter-spacing: .15em; font-size: 18px; }
.brand-mark { font-size: 28px; color: var(--gold); margin-right: 12px; }
.brand small { display: block; margin-left: 42px; font-size: 9px; letter-spacing: .25em; font-weight: 500; }
.edition { font-size: 10px; letter-spacing: .16em; }
main { max-width: 1280px; margin: auto; padding: 0 48px; }
```

```check
file style.css
```

## Apply the next layer

A **design token** names a visual role. --paper is a surface, --ink foreground text, --line a divider and --gold an accent. Define them on :root so descendants inherit them; var(--ink) reads the value. A mistyped variable without fallback makes that declaration invalid. color-scheme:light tells native controls our intended scheme. body margin:0 removes the browser's default page margin. font:inherit lets buttons and inputs use the surrounding typography.

A comma groups selectors with the same declarations; a space is a descendant relationship. .brand small selects small inside brand, not every small element. Color inherit reuses the parent's computed color. text-decoration:none removes an anchor's underline, so its other visual cues must still identify it. font-weight changes emphasis; letter-spacing adds space between letters. em units in spacing scale with the current font size, while vw is one percent of viewport width.

clamp(48px,6vw,78px) chooses a fluid heading size bounded by minimum and maximum. line-height:.98 is relative to font size, suitable for this display heading but too tight for long rules. :not(.eyebrow) excludes the small label from a broader paragraph style. The * rule applies box-sizing consistently. [hidden] with !important makes hiding win over component display rules; reserve this override for this explicit visibility contract.

```css file=style.css
:root { color-scheme: light; --paper: #f7f3e9; --ink: #183e34; --muted: #607168; --line: #dcded2; --gold: #b08535; --felt: #194c3f; --white: #fffdf7; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: 'Avenir Next', Avenir, system-ui, sans-serif; }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: .45; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid var(--gold); outline-offset: 4px; }
[hidden] { display: none !important; }
.masthead { max-width: 1280px; margin: auto; padding: 28px 48px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); }
.brand { color: inherit; text-decoration: none; font-weight: 800; letter-spacing: .15em; font-size: 18px; }
.brand-mark { font-size: 28px; color: var(--gold); margin-right: 12px; }
.brand small { display: block; margin-left: 42px; font-size: 9px; letter-spacing: .25em; font-weight: 500; }
.edition { font-size: 10px; letter-spacing: .16em; }
main { max-width: 1280px; margin: auto; padding: 0 48px; }
.intro { display: flex; align-items: center; justify-content: space-between; padding: 40px 0 32px; }
.eyebrow { font-size: 10px; letter-spacing: .17em; font-weight: 700; }
h1 { font-family: Georgia, serif; font-size: clamp(48px, 6vw, 78px); line-height: .98; margin: 16px 0; font-weight: 400; letter-spacing: -.055em; }
h1 em { color: #8d7038; font-weight: 400; }
.intro p:not(.eyebrow) { font-size: 13px; color: var(--muted); }
.intro-note { display: flex; gap: 20px; align-items: center; }
.intro-note span { font-family: Georgia, serif; font-size: 66px; color: #b5bdac; }
.intro-note p { line-height: 1.7; }
.game-tabs { display: flex; gap: 24px; margin-bottom: 22px; border-bottom: 1px solid var(--line); }
.game-tabs button { color: var(--muted); background: transparent; border: 0; border-bottom: 3px solid transparent; padding: 12px 0 16px; text-align: left; font-weight: 700; min-width: 210px; }
```

The file check establishes only that the stylesheet exists. It does not certify appearance. Use the browser's computed-style and layout panes to connect a visible effect to its declaration. The app becomes interactive once its controller is wired; the static shell already lets you inspect spacing and hierarchy.

```check
file style.css
```

```predict
question: Does changing a border or shadow change the game rules?
choice: No
choice: Yes
answer: No
explain: Presentation reads game state; rules live in JavaScript model modules.
```


**Explore, then restore:** Change only --paper and identify every affected region. Then change a component color directly and observe that it no longer follows the token. Restore it. Compare the heading at wide and narrow widths; explain which clamp bound applies.

## Try it — Compare and explain

Change --paper and --ink together to make a second coherent palette. Inspect button contrast and the score table, not just the title. Temporarily disable one relevant declaration in DevTools, describe the change, then restore it.



## Your turn — Style a results card

Create a separate results page with main, h1 and a Play again button. Apply a deliberate color/spacing variation related to this lesson, then test keyboard focus and a narrow window. Explain the declaration you changed. The automated check covers semantic controls only; the visual comparison is required evidence.

Write practice/03-design-tokens.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



Define --surface and --text on :root and use them for your results card. Choose your own colors, then change only --surface and observe its consumers. Keep a readable foreground/background pair.

The added computed-style checks establish these specified properties, not aesthetic quality, responsive fit or keyboard focus. Inspect those manually as described.

```check
page practice/03-design-tokens.html "document.querySelector('main button')?.textContent" "Play again"
page practice/03-design-tokens.html "window.getComputedStyle(document.documentElement).getPropertyValue('--surface').trim().length > 0" "true"
page practice/03-design-tokens.html "window.getComputedStyle(document.documentElement).getPropertyValue('--text').trim().length > 0" "true"
```

```hints
nudge: Choose a single visual role to vary.
concept: Keep semantics and keyboard access as you adjust appearance.
shape: Reuse the page shell, alter a small set of CSS declarations and describe their visible effects.
```
