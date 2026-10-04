# Trigonometric identities notebook verification

Verified 2026-10-04. Content: `src/tools/notebook-lab/series/math/trig-identities.md`. Existing manifest id and title were preserved; file discovery makes the lesson available automatically.

## Automated checks

- `node scripts/check_notebook_series.mjs math-trig-identities` printed `ok   math-trig-identities (Mathematics Through Computation 79)` and `1/1 lessons passed`. Every demo executed in Pyodide, every starter failed its challenge test, and every reference solution passed.
- Parsed the Markdown with `parseLesson`, passed the resulting object to `checkLessonLatex`, and exited nonzero on any errors. The Node check printed `PASS: parsed notebook LaTeX renders without errors`.
- `node scripts/check-docs.mjs` printed `✓ Contributor docs checked: 9 file(s), links, paths and commands all exist.`
- `git diff --check` reported no whitespace errors, with Git line-ending conversion warnings for the regenerated inventory and project-facts files.

`npm` and `npx` were not on this shell's PATH, so `npm run facts` and `npx vite --host 127.0.0.1 --port 5173 --strictPort` initially printed “The term … is not recognized.” The facts script's constituent commands were then executed directly:

- `node src/scripts/build-lesson-titles.js`: `✓ Lesson titles built: 1344 lessons`.
- `node scripts/build-lesson-ids.mjs`: `✓ Lesson id map built: 1344 lessons`.
- `node scripts/generate-project-facts.mjs`: `✓ Project facts written: 44 courses, 1344 lessons, 55 labs, 15 games.` It also reported the existing 14 content problems in the generated inventory.
- `node scripts/generate-project-facts.mjs --check`: `✓ Project facts are current (44 courses, 1344 lessons, 55 labs, 15 games).` The same existing content-problem warning remained. Regeneration produced no substantive catalog diff.

An attempted `node node_modules/vitest/vitest.mjs run src/tools/notebook-lab/lessonFormat.test.js src/tools/notebook-lab/series.test.js` printed `No test files found, exiting with code 1`; those test files do not exist. It also printed existing Vite esbuild/oxc deprecation warnings. This is not counted as a passing test. The executable notebook-series checker above is the applicable content validation.

## Browser check

Started Vite with `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort` and opened `#/notebook-lab?lesson=math-trig-identities`. Initial navigation timed out and showed a blank page; reloading after startup loaded the notebook. The server warned about stale Browserslist data and a broad Tailwind content pattern.

Confirmed the sidebar entry is available, the authored prose, math boxes, code editors and challenges reach the page, and Run all executes the demos. Inspected the rendered amplitude-phase plot. The rendered page had no `.katex-error` elements, and all plot images had nonzero natural dimensions.

Representative browser outputs:

```text
Largest residual of squared identity: 2.220446049250313e-16
Squared identity within 1e-12: True
Successive rotations (mm): [  0. 120.]
Mean squared displacement (mm^2): 4.5
Amplitude: 5.000 mm; phase: 53.130 degrees
Predicted output frequencies (Hz): 2 22
theta=1e-08: direct=0.000000000000e+00, half-angle=5.000000000000e-15, estimate=5.000000000000e-15 mm
```

Challenge grading was verified by the Pyodide checker; browser Run all intentionally skips challenges. No production build or full test suite was run for this content-only addition.
