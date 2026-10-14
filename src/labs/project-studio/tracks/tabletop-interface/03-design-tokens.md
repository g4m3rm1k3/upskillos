---
title: 8.3 — A consistent visual language
runtime: none
---

### The story so far

The interface shell names its regions. Build its visual system incrementally in style.css.

### What this lesson builds

Explain each new visual treatment and judge it in context at more than one viewport.

## Apply the next layer

CSS custom properties begin with -- and are defined on :root, the document root. var(--ink) reads a role such as ink rather than repeating a hex color. color-scheme tells native controls which appearance is intended. A font stack provides local choices and a generic fallback; no font download is required. font-weight changes emphasis; letter-spacing opens small uppercase labels; text-decoration removes the brand underline. clamp(min, preferred, max) makes the title fluid within limits. em is italic emphasis in HTML, styled separately. In the masthead flex alignment centers items vertically and space-between separates them. A grouped selector applies the same declaration to several elements. [hidden] with !important ensures layout declarations cannot accidentally reveal hidden UI.

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

## Try it — Compare and explain

Change --paper and --ink together to make a second coherent palette. Inspect button contrast and the score table, not just the title. Temporarily disable one relevant declaration in DevTools, describe the change, then restore it.



## Your turn — Style a results card

Create a separate results page with main, h1 and a Play again button. Apply a deliberate color/spacing variation related to this lesson, then test keyboard focus and a narrow window. Explain the declaration you changed. The automated check covers semantic controls only; the visual comparison is required evidence.

Write practice/03-design-tokens.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/03-design-tokens.html "document.querySelector('main button')?.textContent" "Play again"
```

```hints
nudge: Choose a single visual role to vary.
concept: Keep semantics and keyboard access as you adjust appearance.
shape: Reuse the page shell, alter a small set of CSS declarations and describe their visible effects.
```
