# Lab quality standard: the best of every lab

Every new lab, and every lab being rebuilt, takes the best idea from each lab that came before it. This page lists those ideas, where each one lives in the code (copy it, don't reinvent it), and the bar each must meet. It was written on 2026-10-17 from a review of the Linear Algebra, Book of Nature, QMaze, Data Science Studio and Dynamic Programming labs.

The owner's words, which this standard serves: a lab must **really teach and challenge**, cover **all** its topics, and be **very visual and hands-on**: "animations and step through, click this, watch, type", and "run, not just check", so a learner can print what is happening while solving.

## The checklist

A lab meets the standard when every lesson can tick each line, or the lab's doc says why a line doesn't apply.

| # | Idea | Bar | Copy it from |
|---|---|---|---|
| 1 | **Try before telling** | A lesson opens with a question the learner attempts (play with it, guess, count by hand) before any explanation. | Book of Nature's six beats: hook, play, predict, reveal, try it, keep (`src/labs/book-of-nature/MomentPlayer.jsx`) |
| 2 | **Watch it run** | Every algorithm can be watched step by step: play, pause, step back and forward, scrub, change speed. Each step says what changed and why, in words, beside the picture. | DP lab `TableTrace.jsx` (table fills, arrows from the cells read) and `CallTree.jsx` (recursion tree, call stack); QMaze figures |
| 3 | **Do it yourself, then compare** | The learner produces the next step before it is revealed (types the next cell, picks the next move). A wrong answer gets feedback naming the likely slip, not just "wrong". A harder mode removes the scaffolding. | DP "You fill it" (`diagnose()` in `TableTrace.jsx`); QMaze/Data Science `predict` blocks with `misconceptions` |
| 4 | **Change the input** | Every visual takes the learner's own input (typed or dragged) and a random one ("Surprise me"), and is recomputed, never canned. Bad input gets a message, not a broken picture. | DP `INPUTS` (`tables.js`) + `traceInputs.js`; Linear Algebra's draggable Explore figures |
| 5 | **Real code, explained line by line** | The lab's actual source is shown with a note on the lines that matter, and every maths symbol is mapped to the variable that holds it. | QMaze/Data Science `code` and `mathCode` blocks (`src/labs/qmaze-lab/Blocks.jsx`) |
| 6 | **Write it, run it, print, then check** | The learner writes the code. **Run** runs it as written and shows everything it prints and what it returns, with no grading; **Run & check** grades it on hidden cases. A failing case can be sent straight to Run. Errors name the learner's line. | DP `Practice` in `Lesson.jsx` + `runtime/checks.js` (`runJavaScriptScratch`, `runPythonScratch`); Data Science `WriteIt.jsx` |
| 7 | **Checks that can't be fooled** | Expected answers come from an independent method (brute force, enumeration, a closed formula), never from the solution being taught. Random inputs as well as fixed ones, so hard-coding fails. | DP `core-oracles.js` and `tables.test.js` (random inputs through the real input parser); Linear Algebra's seeded problem draws (`practice/`) |
| 8 | **Step through your own code** | Harder problems offer "Open in CodeLens" (or a Real Python tab) on the learner's own code, with the chosen input, and a way back to the same place. | DP `codelens.js`; Project Studio `codeLensHandoff.js`; QMaze/Data Science `PythonTab.jsx` |
| 9 | **Hints that don't give it away** | Hints come one at a time: an observation, a question, a tiny test case. Revealing an answer is allowed but recorded as assisted. | DP challenge hints; Linear Algebra `assisted` passes (`ProblemSet.jsx`) |
| 10 | **Remember and review** | Progress is saved per lesson. Quiz items come back on a spaced schedule; a mastery map shows explored, practised, proved, retained. | Linear Algebra `review.js` (Leitner boxes) and `MasteryMap` in `Study.jsx` |
| 11 | **Every number is computed** | No number in a lesson is typed by hand when it can be computed; a test checks the ones that are typed. | QMaze `predict.compute`; DP `trees.test.js` (the Fibonacci call counts the lessons quote) |
| 12 | **Seen in a real browser** | A `tools/browser-check.mjs` opens every lesson, uses the interactive parts, screenshots them and reports page errors; reused every session. | Data Science and DP `tools/browser-check.mjs` |
| 13 | **Usable by everyone** | Keyboard works (arrow keys step), colour is never the only signal, motion respects `prefers-reduced-motion`, narrow windows scroll inside the figure, not the page. | DP `trace.css` |

## How the labs compare (2026-10-17)

| | Try first | Watch | Do it | Own input | Code notes | Run + check | Oracle checks | CodeLens | Review |
|---|---|---|---|---|---|---|---|---|---|
| Book of Nature | ✓ | ✓ | ✓ | partly | – | – | – | – | – |
| QMaze | partly | ✓ | ✓ | ✓ | ✓ | Python tab | ✓ | Python tab | – |
| Data Science Studio | partly | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Python tab | – |
| Linear Algebra | partly | ✓ | ✓ | ✓ | – | ✓ | seeded draws | – | ✓ |
| Dynamic Programming | ✓ (87 full lessons) | ✓ (42 lessons) | ✓ | ✓ | to do | ✓ | ✓ | ✓ | to do |

What the DP lab still needs to meet the standard everywhere is in [dynamic-programming-lab.md](dynamic-programming-lab.md#plan).
