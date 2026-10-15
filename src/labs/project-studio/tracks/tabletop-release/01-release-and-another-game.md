---
title: 12.1 — Deliver something you can explain
runtime: none
---

### The story so far

You have a styled games collection, interchangeable dice presentation and a trained Pig opponent. Release work checks the whole experience.

### What this lesson builds

Build a portable site and independently specify the next game without breaking either existing game.

## Build before publishing

Run npm run build from the learner project root. npm selects the build script in package.json; Vite follows module imports, bundles dependencies and writes dist. --base=./ makes asset paths relative so the output can live below a hosting subdirectory. The dynamic Three.js import remains a separately loaded chunk. A chunk-size warning is about transfer cost, not proof of a failed build.

To inspect the exact built output, run `npx vite preview --host 127.0.0.1` and open its printed local URL. This uses the installed Vite package. Do not test dist by double-clicking index.html: module loading needs an appropriate server origin. Stop preview with Ctrl+C. In the Network panel, reload with 3D off, then enable it and identify the additional module request. Inspect the worker too: its built path may be hashed, but training must still complete.

Building is local output, not publishing. No account, credentials or deployment is required. Keep source, package.json and the generated lockfile; dist is the release artifact, while node_modules is an installed dependency directory to recreate. A successful bundle does not establish keyboard behavior, game rules or statistical claims.

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


**Explore, then restore:** Temporarily break an import path in a scratch copy and observe a build error rather than a silent missing feature. Restore it and rebuild. Then verify both games on the production preview, not only the development server.

## Play the release checklist

Complete both games. Check Yahtzee zero versus empty, legal previews, a whole match and reset; Pig bust/bank/win, learned-policy selection and reset during an opponent delay. Test keyboard-only, a narrow viewport, 200% zoom, reduced motion and unavailable 3D. Start/cancel/restart training, save/load a model and reject malformed input. Confirm a 3D view switch does not leave extra canvases.

Explain one DOM event end to end; one CSS layout decision; how SVG coordinates map to a pip; how a chosen face reaches a 3D orientation; one Q update; the opponent-response boundary; and why evaluation does not train. Passing tests without these explanations is unfinished learning.



## Try it — Locate a third game’s boundary

Choose a candidate third game, but write its rules before extracting shared architecture. Specify players, state, legal actions, randomness, scoring, terminal conditions and ties. Work one legal and one illegal turn on paper. Only then write a pure module and tests. The next game must have its own concrete rules; “reuse all of Yahtzee” is not a specification.

List the current controller branches by responsibility: choose state, perform game-specific action, produce display data, schedule an opponent and release resources. A small adapter could expose currentPlayer(), legalActions(), act(action), view() and dispose(). Each is a contract, not an implemented engine in this lesson. Decide whether reset creates a new session or mutates one. Do not force a category card into Pig or a bank action into Yahtzee.

Use functions returning objects first if that is clearest. A class becomes useful when many instances share behavior and constructor invariants clarify ownership; it is not a badge of completion. Explain which duplication a proposed class removes before introducing it. A registry maps ids to factories or entries, keeping selection separate from game rules. The independent lookup task below teaches only that small boundary, not an entire third game.


Plan a third game such as Farkle. First write its rules and pure transition tests in a separate module. Reuse dice artwork and layout only where they fit. List which controller branches would grow. With a third real implementation, extract a small session adapter for current player, legal actions, applying an action, display data and disposal. Do not force a category scorecard into Pig or a bank action into Yahtzee. A shared host is useful when it removes demonstrated duplication, not because a BaseGame class sounds professional.




**Explore, then restore:** Write a transfer brief with two worked turns, one invalid action and a diagram of owned resources. Ask whether the proposed adapter can describe Yahtzee and Pig without changing their rules. Revise the contract when it cannot; preserve the separate rule tests.

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
