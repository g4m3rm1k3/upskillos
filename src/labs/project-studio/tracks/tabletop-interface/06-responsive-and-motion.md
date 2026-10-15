---
title: 8.6 — Fit the player’s screen
runtime: none
---

### The story so far

The interface shell names its regions. Build its visual system incrementally in style.css.

### What this lesson builds

Explain each new visual treatment and judge it in context at more than one viewport.

## Apply the next layer

A media query conditionally applies a block of CSS; it does not create a separate mobile document. At max-width:800px the game and learning grids become one column, padding shrinks and decorative edition/intro notes disappear. Reading order remains the HTML order. The two game buttons flex equally after their desktop minimum width is removed.

The reduced-motion query disables transitions and animations with !important. Held state still has a border and label: motion is optional feedback. CSS motion preferences do not automatically stop a JavaScript animation loop, so the later Three.js show method reads the same preference. SVG scales inside its viewBox; a canvas also needs a synchronized drawing buffer, which the renderer will handle.

Test three widths deliberately: just above the breakpoint, just below it and 390px. Also zoom to 200%; long text must wrap rather than disappear. A narrow viewport is not identical to zoom, and a single screenshot cannot establish keyboard navigation.

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
.primary, .secondary, .quiet { border-radius: 7px; padding: 12px 18px; font-size: 12px; font-weight: 600; }
.primary { background: var(--ink); color: var(--white); border: 1px solid var(--ink); }
.primary span { margin-left: 18px; }
.secondary { background: #eee8d8; color: var(--ink); border: 1px solid #d6cfbc; }
.quiet { background: transparent; color: var(--muted); border: 1px solid var(--line); }
.status { min-height: 38px; font-size: 12px; line-height: 1.6; }
.learn-note { border-top: 1px solid var(--line); padding-top: 14px; font-size: 12px; line-height: 1.7; }
summary { cursor: pointer; font-weight: 600; }
.score-panel table { width: 100%; border-collapse: collapse; font-size: 12px; }
caption { text-align: left; color: var(--muted); font-size: 10px; margin-bottom: 14px; }
th { text-align: left; font-weight: 500; }
td { text-align: right; font-variant-numeric: tabular-nums; }
th, td { padding: 8px 3px; border-bottom: 1px solid #ecece3; }
thead { color: var(--muted); font-size: 10px; }
.score-choice { border: 1px solid #b6ceba; background: #eef4e9; color: #245741; border-radius: 5px; min-width: 45px; padding: 4px 7px; }
.total-row { font-weight: bold; font-size: 15px; }
.pig-guide { font-size: 13px; line-height: 1.8; }
.pig-guide strong { display: block; font: 64px Georgia, serif; margin: 14px 0; }
.learning-panel { margin: 26px 0; padding: 30px; border-radius: 14px; background: #e9eee3; border: 1px solid #d1dacb; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.learning-panel p { font-size: 12px; line-height: 1.8; max-width: 430px; }
.training-controls label, .policy-inspector label { font-size: 11px; display: block; margin-bottom: 10px; }
select, input[type="number"] { background: var(--white); border: 1px solid #b8c4b2; border-radius: 5px; padding: 8px; color: var(--ink); }
select { display: block; width: 100%; margin-top: 8px; }
input[type="file"] { display: block; margin-top: 8px; max-width: 100%; }
progress { width: 100%; accent-color: var(--ink); height: 6px; margin-top: 18px; }
.policy-inspector { grid-column: 1 / -1; border-top: 1px solid #cdd7c6; padding-top: 20px; }
.policy-inspector label { display: inline-block; margin-right: 20px; }
.policy-inspector input { width: 65px; margin-left: 8px; }
#policy-chart svg { display: block; width: 100%; max-width: 700px; height: 130px; }
footer { display: flex; justify-content: space-between; padding: 20px 0 35px; font-size: 10px; letter-spacing: .12em; color: var(--muted); }
@media (max-width: 800px) { .masthead { padding: 22px; } main { padding: 0 20px; } .game-layout, .learning-panel { grid-template-columns: 1fr; } .edition, .intro-note { display: none; } .game-tabs { gap: 16px; } .game-tabs button { min-width: 0; flex: 1; } .table-panel, .score-panel { padding: 20px; } .die { width: 55px; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
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


**Explore, then restore:** At 801px and 800px identify exactly which rules change. Temporarily remove the mobile min-width:0 from game buttons and look for overflow. Restore it, then emulate reduced motion and verify that selected-state feedback remains.

## Try it — Compare and explain

Review at 390px and a wide desktop width, 200% zoom, keyboard-only, and reduced-motion mode. Check for horizontal overflow, clipped labels, tiny buttons and disappearing feedback. Temporarily disable one relevant declaration in DevTools, describe the change, then restore it.



## Your turn — Style a results card

Create a separate results page with main, h1 and a Play again button. Apply a deliberate color/spacing variation related to this lesson, then test keyboard focus and a narrow window. Explain the declaration you changed. The automated check covers semantic controls only; the visual comparison is required evidence.

Write practice/06-responsive-and-motion.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



Give the base page border-box sizing and main width:100% with a max-width. Add a media query that reduces spacing below 600px and a reduced-motion rule that removes optional transitions. Review at 390px and 200% zoom; the base box-sizing check below cannot establish those media-query effects.

The added computed-style checks establish these specified properties, not aesthetic quality, responsive fit or keyboard focus. Inspect those manually as described.

```check
page practice/06-responsive-and-motion.html "document.querySelector('main button')?.textContent" "Play again"
page practice/06-responsive-and-motion.html "window.getComputedStyle(document.querySelector('main')).boxSizing" "border-box"
```

```hints
nudge: Choose a single visual role to vary.
concept: Keep semantics and keyboard access as you adjust appearance.
shape: Reuse the page shell, alter a small set of CSS declarations and describe their visible effects.
```
