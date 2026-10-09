# Project Studio series template

A complete one-lesson series, to copy and rename. The guide that explains every part is [docs/contributing/project-studio-series.md](../../contributing/project-studio-series.md).

| File | Copy to |
|---|---|
| `myseries-basics/` (the lesson and its `answers/`) | `src/labs/project-studio/tracks/<your-series>-basics/` |
| `myseries.walkthrough.js` | `src/labs/project-studio/tracks/<your-series>.walkthrough.js` |
| `myseries.desktop.test.js` | `src/labs/project-studio/<your-series>.desktop.test.js` |

Then replace `myseries` (and `MYSERIES`, `My Series`) with your series in the copies, and register the series in `series.js` and `learningProfile.js`. The guide's six steps go through each of these.

The lesson shows each part a lesson can have: front matter, a step with a file, a prediction with its `verify` command, a check, and a **Your turn** with hints, an answer in `answers/` and wrong answers in the walkthrough.
