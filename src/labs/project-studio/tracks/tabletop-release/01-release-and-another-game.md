---
title: 12.1 — Deliver something you can explain
runtime: none
---

### The story so far

You have a styled games collection, interchangeable dice presentation and a trained Pig opponent. Release work checks the whole experience.

### What this lesson builds

Build a portable site and independently specify the next game without breaking either existing game.

## Build before publishing

Run npm run build. Vite writes dist with relative asset paths because the build script uses --base=./. A build is local output, not publication. Serve dist using a static preview before uploading it anywhere. The script bundle for Three.js is substantial and loaded only when requested; inspect the network panel and confirm initial 2D play works before that module loads.

A successful build proves bundling, not game correctness, accessibility or visual quality. The learner chooses when and where to publish; this course never requires account credentials or automatic deployment.

```check
run "npm run build"
```

```predict
question: Does a production build prove the hold button works with a keyboard?
choice: No
choice: Yes
answer: No
explain: That is an interaction test requiring a browser and input review.
```

## Play the release checklist

Complete both games. Check Yahtzee zero versus empty, legal previews, a whole match and reset; Pig bust/bank/win, learned-policy selection and reset during an opponent delay. Test keyboard-only, a narrow viewport, 200% zoom, reduced motion and unavailable 3D. Start/cancel/restart training, save/load a model and reject malformed input. Confirm a 3D view switch does not leave extra canvases.

Explain one DOM event end to end; one CSS layout decision; how SVG coordinates map to a pip; how a chosen face reaches a 3D orientation; one Q update; the opponent-response boundary; and why evaluation does not train. Passing tests without these explanations is unfinished learning.



## Try it — Locate a third game’s boundary

Plan a third game such as Farkle. First write its rules and pure transition tests in a separate module. Reuse dice artwork and layout only where they fit. List which controller branches would grow. With a third real implementation, extract a small session adapter for current player, legal actions, applying an action, display data and disposal. Do not force a category scorecard into Pig or a bank action into Yahtzee. A shared host is useful when it removes demonstrated duplication, not because a BaseGame class sounds professional.



## Your turn — Register without rewriting games

Define solve(entries,id) returning the entry whose id matches, or null. This small registry lookup is the start of a future game selector. Do not change entries. Export the function as solve.

Write practice/01-release-and-another-game.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/01-release-and-another-game.mjs'; if (!((() => {const a=[{id:\\\"yahtzee\\\"},{id:\\\"pig\\\"}];return solve(a,\\\"pig\\\")===a[1] && solve(a,\\\"missing\\\")===null;})())) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: A missing game is a real boundary case.
concept: Return the matching record, not its position by assumption.
shape: Scan entries, compare ids and return null only after no match was found.
```
