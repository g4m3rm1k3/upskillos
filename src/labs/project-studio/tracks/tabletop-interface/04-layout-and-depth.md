---
title: 8.4 — A table with texture and depth
runtime: none
---

### The story so far

The interface shell names its regions. Build its visual system incrementally in style.css.

### What this lesson builds

Explain each new visual treatment and judge it in context at more than one viewport.

## Apply the next layer

Grid divides the game into two columns; minmax(0,1.6fr) permits the main panel to shrink without overflowing, while the score panel has a readable minimum. fr shares remaining space. align-items:start aligns panel tops. border-radius softens corners; box-shadow with inset darkens the felt inside its boundary. radial-gradient creates a subtle light falloff; transparent borders preserve space before a held border appears. opacity fades unavailable controls but must not be the sole state cue. position:relative establishes a positioning reference for the held label.

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
.game-tabs button[aria-pressed="true"] { color: var(--ink); border-bottom-color: var(--ink); }
.game-tabs small { display: block; font-size: 10px; font-weight: 400; margin-top: 5px; }
.game-layout { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr); gap: 24px; align-items: start; }
.table-panel, .score-panel { background: var(--white); border: 1px solid var(--line); border-radius: 14px; padding: 26px; }
.panel-heading { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
h2 { font-family: Georgia, serif; font-size: 27px; letter-spacing: -.025em; font-weight: 400; margin: 8px 0 14px; }
.view-toggle { font-size: 11px; white-space: nowrap; margin-top: 8px; }
.rule-note { font-size: 12px; line-height: 1.7; color: var(--muted); min-height: 42px; }
.players { display: flex; justify-content: center; gap: 50px; align-items: center; margin: 20px 0; }
.players div { text-align: center; min-width: 85px; }
.players div span { display: block; font-size: 9px; letter-spacing: .13em; }
.players strong { font-family: Georgia, serif; font-size: 38px; font-weight: 400; }
.versus { font: italic 16px Georgia, serif; color: var(--muted); }
.felt { background: radial-gradient(ellipse at 30% 10%, #2c6652, var(--felt)); color: #f6f1df; border: 7px solid #e3d7bb; border-radius: 14px; box-shadow: inset 0 2px 14px #0003; padding: 16px; }
.tray-caption { display: flex; justify-content: space-between; font-size: 9px; letter-spacing: .14em; opacity: .85; }
.dice-row { display: flex; gap: 10px; justify-content: center; padding: 30px 0 16px; }
.die { width: clamp(40px, 5vw, 70px); padding: 0; background: none; color: var(--ink); border: 2px solid transparent; border-radius: 16px; transition: transform 150ms; position: relative; }
.die svg { width: 100%; display: block; filter: drop-shadow(0 4px 2px #0003); }
.die rect { fill: #fff3d9; stroke: #ddcea9; stroke-width: 2; }
.die circle { fill: currentColor; }
.die[aria-pressed="true"] { border-color: #edc776; transform: translateY(-6px); }
.die .held-label { display: block; position: absolute; color: #f9d486; font-size: 8px; letter-spacing: .1em; width: 100%; bottom: -17px; }
.felt p { font-size: 11px; text-align: center; opacity: .9; margin-top: 18px; }
#canvas-host { height: 230px; width: 100%; }
#canvas-host canvas { width: 100%; height: 100%; display: block; }
.action-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 18px; }
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

Compare the felt with and without its gradient and inset shadow. Keep only effects that clarify the surface; shadows do not replace a visible held-state label. Temporarily disable one relevant declaration in DevTools, describe the change, then restore it.



## Your turn — Style a results card

Create a separate results page with main, h1 and a Play again button. Apply a deliberate color/spacing variation related to this lesson, then test keyboard focus and a narrow window. Explain the declaration you changed. The automated check covers semantic controls only; the visual comparison is required evidence.

Write practice/04-layout-and-depth.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/04-layout-and-depth.html "document.querySelector('main button')?.textContent" "Play again"
```

```hints
nudge: Choose a single visual role to vary.
concept: Keep semantics and keyboard access as you adjust appearance.
shape: Reuse the page shell, alter a small set of CSS declarations and describe their visible effects.
```
