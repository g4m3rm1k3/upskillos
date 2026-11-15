# Software Engineering course: handoff

**Every session on this course starts here.** This file is the single source of truth for decisions, conventions, workflow and status. Update it before a session ends (section 9).

## 1. Read, in this order

1. This file, all of it.
2. [software-engineering-curriculum.md](software-engineering-curriculum.md): only the stage and modules you are building (their **Covers**, **Why** and **Builds** lines), plus sections 1 and 4 the first time.
3. [lesson-quality-standard.md](lesson-quality-standard.md): how a lesson is written, reviewed and released.
4. [project-studio-lesson-standard.md](project-studio-lesson-standard.md): platform mechanics.
5. The platform's own source when a format question comes up: `src/labs/project-studio/parseTrack.js`, `checks.js`, `hints.js`, `predictions.js`.

**Do not read other courses' or tracks' lessons** for format or content, not even "just to check a convention". They were written against older standards. If a convention is missing, decide it, and record it in section 4 of this file.

History and the reasoning behind the decisions: [agent-architecture-course-audit.md](agent-architecture-course-audit.md). It is background, not instructions.

## 2. What the course is (owner decisions, 2026-11-14)

- **A software engineering course for anyone**, open source, generic in voice: no CAD/CAM or personal examples. It teaches computer science and engineering concepts deeply enough that a learner can design systems and steer whoever builds them, teammates or AI agents. It is not about agent tools: no instruction files, hooks or tool-specific controls.
- **Learners already program** in at least one language (variables, types, loops, functions, lists and dictionaries). Which language is not assumed. Never teach those basics.
- **Exhaustive, in depth tiers.** The whole curriculum map is in scope. Each module can be studied at U / R / A / E; the module's Target is "well enough" to move on, and deeper is the learner's choice.
- **Language per concept.** A concept lesson uses the language that exposes the concept best and says why in one line. A project lesson uses its project's language.
- **No runways (2026-11-14).** There are no runway lessons. A language idiom, tool or setup step (virtual environments, `pytest`, a syntax feature) is taught inline, in the lesson that first uses it, at the point of use.
- **One folder for the whole course (2026-11-14).** All projects live in one course folder, each in its own subfolder (`kit/`, `blockfall/`, …). The learner opens a terminal and `cd`s into the project they're working on, as in real work. No per-project Project Studio folders.
- **Several projects grow side by side; there is no final project.** A project grows only when the current module justifies its next piece (the smallest increment). Projects: Kit (Python CLI tools), Blockfall (JavaScript, later TypeScript, falling-block game; never call it Tetris), Ledger (Python, tkinter, SQLite), Framework (C# full-stack web framework, templates and React), Board (C# app on Framework), Machine (C virtual machine), Toylang (Rust language), Store (Go key-value store), Netkit (Python network tools), Renderer (C++). Where each starts and grows: curriculum section 4.
- **Platform: Project Studio**, as the `swe` series.
- **Build the whole series without review pauses (2026-11-14).** The owner can't do app walkthroughs for now and will fix lessons while going through them later. Write lesson after lesson in map order, as well as possible; record "not yet reviewed" in section 7 instead of waiting. This replaces the pilot gate in section 6: the three reviews still happen, later, when the owner can.

## 3. Lesson workflow (do every step)

1. **Map.** Take the lesson's row from the module-to-lesson map (section 6). Every item in the module's Covers line belongs to exactly one lesson; add no topics.
2. **Specify before prose:** outcomes (observable, with a U/R/A/E tier), real prerequisites, 2 to 5 likely misconceptions, the project increment.
3. **Write and verify the code first, in the build folder** `C:\Users\g4m3r\Documents\swe-course-build\` (never the repo; see its README). Its `swe/` is the course folder as it stands after the last finished lesson; leave it at the new lesson's end state. Put the lesson's code versions in `versions/<lesson>/` and its checker walk in `walks/`. Run every version a step shows, every command, every stated output, every prediction answer. Python: `python3 -m venv .venv` there and use `.venv/bin/python`.
4. **Write the lesson** at `src/labs/project-studio/tracks/swe-sNN-<stage>/SS-MM-LL-<slug>.md`. Required in it:
   - Frontmatter: `title`, `runtime`; no `project:` (section 4). The first lesson of a chapter also sets `track`.
   - An opening that gives a reason to care (a problem, a surprise), before any definition.
   - A concrete example before each general rule; one new idea per sentence where possible.
   - `predict` fences before results, with `verify:` where the answer is printable.
   - After every `file=` change, say to save and run it: the exact command (from inside the project folder) and what it prints. A check running it silently is not enough; the learner must see the result (owner feedback on 01-01-01, step 5). If a file the learner might also run is still expected to fail at this point, say so.
   - A diagnostic experiment: a deliberate failure, read from the evidence, then fixed.
   - Alternatives with their costs ("what else, and why not").
   - An independent task (`## Your turn: …`) with **no** file target and a `hints` fence (nudge, concept, shape, answer).
   - A "What these checks establish, and what they don't" paragraph.
   - A closing retrieval check and a summary that teaches, not a glossary.
5. **Validate** (section 5), then update the status table (section 7) and "Where Kit's code stands" (section 8).

## 4. Conventions

- **Series** `swe` in `src/labs/project-studio/series.js`, prefix `swe-`, one chapter (track) per stage: `swe-s01-ignition`, `swe-s02-…`. Add each new chapter to the series' `chapters` list. Its learner profile is in `learningProfile.js`.
- **Lesson file names** `SS-MM-LL-<slug>.md` (stage, module, lesson; two digits each). **The file name is the lesson id and a progress key: never rename or renumber a published lesson.** Every `##` heading is a step whose id is its position, so never insert a `##` into a published lesson; use `## Title {#key}` for an added step.
- **Project folders:** one course folder, `swe` (the series sets `sharedProject: true`; lessons set no `project:`). Inside it: `kit/`, `blockfall/`, `ledger/`, `framework/`, `board/`, `machine/`, `toylang/`, `store/`, `netkit/`, `renderer/`. Each project's files, `.venv` included, live in its subfolder; prose tells the learner to `cd` into it. Checks and `verify:` lines run from the course folder and have no working-folder option, so their command starts with `cd kit;` (`;` works in PowerShell and in POSIX shells), and `file` checks and `file=` targets name the path from the course folder (`kit/count.py`). Commands shown in prose are what the learner types inside `kit` (`.venv/bin/python count.py …`).
- **Python commands:** checks and `verify:` lines write `.venv/Scripts/python` (the checker maps it to `.venv/bin/python` on macOS and Linux). Prose shows both, with a small Windows / macOS-or-Linux table the first time.
- **Blockfall (decided 2026-11-14, 01-02-03):** `blockfall/index.html` plus classic scripts (`<script src="game.js">`, no ES modules, no Node, no build tool), opened straight from disk (`start` / `open` / `xdg-open index.html`) and reloaded after each change. Lessons set `runtime: none`. Checks are `page blockfall/index.html "expr" expected` without `server=`, so the page loads over `file://`; top-level `const`/`let`/functions are visible to the expression. Keys are simulated with `document.dispatchEvent(new KeyboardEvent('keydown', { key: … }))`. Teach the browser's developer console as the way to ask the running page questions. A dev server arrives in 1.6 (module scripts need one); a test runner for Blockfall's pure functions is decided in 1.9.
- **Verifying page checks outside the app:** `walks/page-eval-shim.mjs` in the build folder stands in for `desktop/app/page-eval.cjs` with headless Chromium (Playwright from this repo), passed to `runChecks` as `evalInPage`. It isn't Electron, so a difference between the two is possible; none seen so far.
- **One file per step:** a step's first `file=` fence is its complete target content, not a diff. Supply an exact sample file with a small script step (as 01-01-01's `make_samples.py` does), not by typing it in the editor: the parser strips a target's final newline, and editors choose bytes.

## 5. Validate a lesson

| Command | Must show |
|---|---|
| `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"` | All pass (a lesson that fails to parse fails `checks.test.js`) |
| `node scripts/audit-project-studio-lessons.mjs --write` then `--check` | Exit 0; the lesson has no errors (signals are a review queue) |
| `npm run facts` then `npm run catalog:check` | Current |
| `npm run typecheck` | Exit 0, if any `.js`/`.jsx`/`.ts` changed |

Report exactly what ran and what it printed. Kill leftover `vitest` processes afterwards; the machine is low on memory.

## 6. Module-to-lesson map

Every item in a module's **Covers** line is assigned to a lesson. Write the map for a stage before building it.

| Lesson | Teaches (Covers items) | Project increment |
|---|---|---|
| 01-01-01 What a file holds | information vs representation vs meaning; data vs instructions | Kit starts: `count` reports bytes, lines, characters; chooses an encoding |
| 01-01-02 Programs as functions | inputs, outputs, transformations; deterministic vs nondeterministic | Kit: `count` reads standard input; the counting separated from the input and output |
| 01-01-03 What "correct" means | algorithm vs program vs process; levels of a solution; what "correct" means | Kit: `count` gets a written definition of a word, checked against it (`check_counts.py`); the task redefines a line so a final unterminated run counts |
| 01-01-04 Three models of a program | state; a program as a function, a state machine and a process | Kit: `count` streams its input through a word-boundary state machine (`start`/`feed`/`finish`, `count_stream`); `check_counts.py` checks every table at piece sizes 1, 2, 3, 4096 and exits 1 on failure; the task adds `longest` |
| 01-02-01 Conditions are statements | propositions; AND, OR, NOT, XOR; truth tables; short-circuit evaluation; truthiness pitfalls in Python | Kit `filter` starts: `filter.py FILE --all … --none …`, a `matches` predicate; the task adds `--any` |
| 01-02-02 Rewriting conditions safely | implication, equivalence; logical equivalences; De Morgan's laws; simplification; flattening nested conditionals | Kit: `matches`' nested loops flattened to one expression, proved equal by checking every case |
| 01-02-03 Every and some | predicates and quantifiers (introduction); the set/logic correspondence | Blockfall starts: a page, a canvas, a board; the move check "every cell inside AND empty" as one predicate, negated with De Morgan into "some cell blocked" |
| 01-02-04 Normal forms and satisfiability | normal forms (CNF, DNF); SAT (introduction) | Kit: `filter`'s query is a normal form; a brute-force check that a query can match any line at all |
| 01-03-01 Place value | positional notation; binary, octal, hexadecimal; conversion; bytes as the unit | Kit `hexdump` |
| 01-03-02 Bits as switches | bitwise and, or, xor, not, shifts, masks; flags and bitfields; parity | Blockfall: each board row a bitmask; "row is full" one comparison |
| 01-03-03 Fixed width | unsigned vs two's complement; overflow and wraparound; fixed-width vs arbitrary precision (Python `int`); endianness (introduction) | Kit: `hexdump` reads 16- and 32-bit values both ways round |
| 01-04-01 Names and objects | names vs objects; values vs references; identity; aliasing (Python and JavaScript) | none (concept) |
| 01-04-02 Changing things | Written 2026-11-14; Blockfall gains a pure `dropped` and ArrowUp (hard drop). Walk `walks/walk-01-04-02.mjs` (page checks through the shim): all 14 checks and the 1 `verify:` answer pass; each `file=` target equals its verified version (`versions/01-04-02/`, made by `walks/mk-01-04-02.py`; the lesson is filled from `lesson.template.md` by `walks/fill-01-04-02.py`); every step's checks fail against the previous version; the "questions leave the state" check fails with the in-place `moved`; the task's in-place `dropped` is caught. Every stated console value evaluated (`walks/probe-01-04-02.mjs`): in-place `moved` gives 2 columns a press, `[8, 9, 10, 9]` after three, rows 34–35 after 25 Downs, `[true, false]`; `Object.freeze` silent in sloppy mode, `TypeError` in strict, shallow. Python 3.14's unhashable-key message checked by substring. Not run in Electron or by hand. Audit: no errors. Not yet: owner walkthrough, the three reviews |
| 01-04-03 Copies and where state lives | Written 2026-11-14; Blockfall's state becomes one object, with undo (`z`). Walk `walks/walk-01-04-03.mjs` (page checks through the shim): all 15 checks and the 1 `verify:` answer pass; each `file=` target equals its verified version (`versions/01-04-03/`, made by `walks/mk-01-04-03.py`, lesson filled by `walks/fill-01-04-03.py`); every step's checks fail against the previous version; caught in the task: `history.push(state)` and `history.push({ ...state })`. Every stated console value evaluated (`walks/probe-01-04-03.mjs`, `probe2-01-04-03.mjs`): the shallow undo is invisible at the first landing spot, and at the right edge the restored T can't move left (board[16] = 896); `saved.board === state.board` true, `saved.piece === state.piece` false; `typeof board` is the canvas; `history` as a top-level `const` doesn't clash with `window.history`. Not run in Electron or by hand. Audit: no errors. Not yet: owner walkthrough, the three reviews |
| 01-04-04 Invariants | Written 2026-11-14; Blockfall's state becomes a `Game` class with private fields, checked after every change. Walk `walks/walk-01-04-04.mjs` (page checks through the shim): all 16 checks pass; each `file=` target equals its verified version (`versions/01-04-04/`, steps 1–2 made by `walks/mk-01-04-04.py`, the class written by hand, lesson filled by `walks/fill-01-04-04.py`); every step's checks fail against the previous version; the replanted shallow undo is caught by step 2's `errors=none` play check; caught in the task: freezing only the arrays, freezing only in `newPiece`. Every stated console value evaluated (`walks/probe-01-04-04.mjs`), including the exact broken-rule messages, `game.#board` as a `SyntaxError` from page code, `JSON.stringify(game)` = `{}`, push on a frozen array throwing while property writes are ignored. Not run in Electron or by hand. Audit: no errors. Not yet: owner walkthrough, the three reviews |
| 01-04-05 Reading unfamiliar code | Written 2026-11-14; deconstruction, no project increment (Kit gains `levels.py`, `levels_plain.py`, `compare_levels.py` and `cases/`, and the task's `dense.py`, `plain.py`, `check_top.py`). Walk `walks/walk-01-04-05.mjs`: all 15 checks pass; each `file=` target equals its verified version (`versions/01-04-05/`); every step's checks fail before it; caught: an f-string left in the plain version, the missing minus in `print_order` (the 2-difference output in the lesson is real), and in the task no `lower` (275 differences), no `isalpha` (276), count-only sort (99), a list comprehension. Stated outputs (odd_levels, latin1 `UnicodeDecodeError`, `or`, `Counter`) all run on Windows 11, Python 3.14. Audit: no errors. Not yet: owner walkthrough, the three reviews |
| 01-05-01 Calls | Written 2026-11-14; Kit's first shared module, `kitargs.py`; `count` uses it, and the task moves `hexdump` onto it with `--json`. Walk `walks/walk-01-05-01.mjs`: all 19 checks and both `verify:` answers pass; each `file=` target equals its verified version (`versions/01-05-01/`; lesson filled from `lesson.template.md` by `walks/fill-01-05-01.py`); every step's checks fail before it; the trap's `__defaults__` = `(['a', 'b'],)` is real output; caught in the task: values as strings, `--json` read only from the last position, a private copy of `open_input`. Windows 11, Python 3.14. Audit: no errors. Not yet: owner walkthrough, the three reviews |
| 01-05-02 The call stack | Written 2026-11-14; Kit gains `tree` (recursive, catches `OSError` per folder) and the task's `tree_iter.py` (explicit stack). Walk `walks/walk-01-05-02.mjs`: all 20 checks pass; each `file=` target equals its verified version (`versions/01-05-02/`; lesson filled from `lesson.template.md`); every step's checks fail before it; caught in the task: pushing in sorted order (prints backwards), a recursive copy (the `ast` self-call check). `tree.py` and `tree_iter.py` give identical output on `sample_tree`, `samples`, `.`, a file, a missing path and a 95-deep folder. Measured on Windows 11, Python 3.14: recursion limit 1000, `nest.py 998` works and 999 fails, folders stop at 95 levels (`WinError 206`, LongPathsEnabled 0); traceback line numbers as stated. Audit: no errors. Not yet: owner walkthrough, the three reviews |
| 01-04-02 Changing things | mutable vs immutable; in-place change vs rebinding; side effects vs pure functions | Blockfall: a move function that changes its input, then one that doesn't |
| 01-04-03 Copies and where state lives | shallow vs deep copy; where state lives (global, closure, object) | Blockfall: the game-state aliasing bug (copying the board copies only the outer array) and its fix |
| 01-04-04 Invariants | invariants and encapsulation; value objects vs entities | Blockfall: the game-state object guards its invariants |
| 01-04-05 Reading unfamiliar code | entry points, following data; expanding dense code until the logic is visible | none (deconstruction of a provided program) |
| 01-05-01 Calls | parameters vs arguments; return values; evaluation order; scope and lifetime; default-argument traps | Kit: the shared `--json` and argument handling, a first shared module |
| 01-05-02 The call stack | call-stack frames; recursion and stack overflow; exceptions unwinding the stack | Kit `tree`, a recursive walker that hits the recursion limit |
| 01-05-03 Functions as values | first-class and higher-order functions; closures | Blockfall: the game loop; input handlers as closures |
| 01-05-04 Tracing with a debugger | tracing with a debugger | Blockfall: one frame traced in the browser's debugger |
| 01-06-01 Finding your way | shell navigation; absolute and relative paths; permissions basics; reading `--help` and man pages | none |
| 01-06-02 Streams and processes | stdin, stdout, stderr; pipes and redirects; environment variables; processes (`ps`, `kill`) | Kit: `filter … \| count` pipelines; exit codes through a pipe |
| 01-06-03 Text tools | `grep`, `find`, `sed`, `awk`-level tools; practical regular expressions | Kit `filter --regex` |
| 01-06-04 Tools around the code | editors, IDEs, language servers, linters, formatters; running tests from the command line | Kit: a linter and formatter run |
| 01-06-05 Packages and environments | package manager basics; isolated development environments | Kit packaged as a command-line package in its virtual environment; Blockfall from a local development server |
| 01-06-06 Scripts and safety | shell scripting basics; SSH basics; backups before risky operations; least-privilege habits; recognizing destructive commands and untrusted install scripts | Kit: a script that runs every tool's checks |
| 01-07-01 Reading documentation | guides vs references; changelogs and release notes; matching documentation to the installed version | Blockfall: canvas and keyboard behaviour checked against the reference |
| 01-07-02 Reading a standard | RFCs and standards; specifications | Kit `csv`, written from RFC 4180 |
| 01-07-03 Judging sources | source code as documentation; issue trackers; research papers; source reliability; verifying a claim against a primary source | none |
| 01-08-01 Commits as a graph | the commit graph (a DAG); blob, tree, commit; refs, HEAD, branches; `.gitignore`; commit hygiene | Both projects under version control, one piece per commit |
| 01-08-02 Reading a diff | reading a diff; the review checklist; remotes; pull requests | Review a provided diff that quietly weakens `check_counts.py` (tests proper come in 1.9) |
| 01-08-03 Changing history | merge vs rebase; conflicts; revert vs reset vs restore; stash; tags | none beyond commits |
| 01-08-04 Git as an investigation tool | `bisect`; `blame`; worktrees; hooks; removing committed secrets | Kit: bisect a planted regression |
| 01-09-01 to 01-09-04 | what a test is, assertions, evidence vs claims, tautological tests; oracles, boundaries and edge cases, regression tests, reproduction scripts; determinism, isolation, fixtures; red-green-refactor, unit / integration / end-to-end, judging a test, over-mocking | Blockfall: rotation and line clearing as tested pure functions; Kit: `pytest` tests for `count` and `filter`, with fixture files (`check_counts.py`'s tables become them) |
| 01-10-01 Errors that help | exceptions and tracebacks; error taxonomy; fail-fast vs fail-silent; where to catch an error; human-readable errors | Kit: clear errors and exit codes for missing files, bad input and unknown encodings (the `LookupError` 01-01-01 deferred) |
| 01-10-02 Debugging as science | reproduction and minimal reproduction; hypothesis and experiment; bisecting | Blockfall: the fast drop that passes through the floor |
| 01-10-03 Tools for failures | print vs logger vs debugger; breakpoints and watches; post-mortem debugging; retry vs crash; non-reproducible bugs | Kit: a logger instead of prints |
| 01-11-01 How a language model writes | tokens; the context window; attention (high level); next-token prediction and sampling; training vs inference; knowledge cutoffs; why hallucination happens | none (concept) |
| 01-11-02 Where models fail | limits of instruction following; long-context degradation; system vs user prompts; prompt injection; no memory unless provided; why the nearest example outweighs a rule | none (concept) |
| 01-11-03 Models that act | tool use and function calling; agent loops; retrieval; prompt caching (concept); non-determinism; cost and latency; model tiers | none (concept) |
| 01-12-01 Slices and plans | small vertical slices; acceptance criteria; plan before edit; options and choosing; read-only exploration first | Blockfall: the hold-piece feature specified and planned |
| 01-12-02 Steps you can check | one task per diff; checkpoint commits; test-first loop; review loop; demanding evidence; confident "done" claims | Blockfall: the hold piece delivered in checked slices |
| 01-12-03 Guard rails | least privilege; approval for destructive or irreversible actions; secrets and production data; verifying before deployment | none |

Python setup that a runway would have covered is taught inline where first needed: the virtual environment in 01-01-01, modules and packages when Kit first needs a second file, `pytest` in 01-09.

**Pilot:** 01-01-01 to 01-01-04, 01-04, and the 01-09 Blockfall lesson. Each gets the standard's three reviews, including a walkthrough by someone who hasn't seen it. Since 2026-11-14 the reviews come later and don't block writing (section 2).

**Modules 1.1 to 1.4 are done; 1.5 is in progress** (01-05-01 and 01-05-02 written). Next 01-05-03, then 01-05-04, then module 1.6.

**Next: 01-05-03 Functions as values (Blockfall: the game loop; input handlers as closures).** Covers: first-class and higher-order functions; closures. Notes:
- 01-05-02's closing line promises: "A function can be stored in a variable, passed to another function, and built inside one, remembering the names around it: a closure. Blockfall gets a game loop, and its key handlers become closures."
- Blockfall now (after 01-04-04): a `Game` class; the `keydown` handler is an `if`/`else if` chain calling `game.drop()`, `game.lockPiece()`, `game.undo()`, `game.move(dRow, dCol)`. First-class functions: replace the chain with a table `const ACTIONS = { ArrowLeft: () => game.move(0, -1), … }` and `ACTIONS[event.key]` (functions stored as values; `undefined` for other keys). Higher-order: a function that takes or returns a function, e.g. `every(ms, fn)` or `repeat`; JavaScript's own `map`/`some`/`every` (already used) and `setInterval(fn, ms)` are higher-order.
- Game loop: gravity, the piece moving down one row every so often. `setInterval(() => { game.move(1, 0); draw(); }, 800)`, or `requestAnimationFrame` with a timestamp (the curriculum's 1.2 idiom list names `requestAnimationFrame`; teach it here if used). A landed piece then needs locking automatically (after a delay, or at the next tick) or the player presses Space: decide and keep it simple; 1.9 tests it.
- Closures: a function made inside another that keeps using the outer function's local names after the outer one has returned, e.g. `makeKeyRepeat(key, ms)` or a `createTimer()` that keeps `last` private. Planted bug candidate: the classic loop closure, `for (var i …)` capturing one shared `i` (explain `var` vs `let`), or a closure capturing a value that later changes. Python side: `lambda` (01-04-05) and a closure in Kit (e.g. a `make_matcher(terms)` for `filter`), one paragraph.
- **Checks with time:** the app evaluates a page check as `(async () => (EXPR))()` and awaits it (`desktop/app/page-eval.cjs`), and the walk shim's `page.evaluate` awaits promises too, so a check can wait: `(async () => { await new Promise((r) => setTimeout(r, 1000)); return game.piece()[0].row; })()`. Keep waits short (a check has a timeout) and assert ranges, not exact rows, where timing varies; or make the loop's interval a constant the check can shorten.
- 01-05-02 taught: recursion, base case, frames and the call stack (LIFO), tracebacks as the stack ("most recent call last"), stack overflow and `RecursionError`, `sys.getrecursionlimit()` (1000; 998 nested lists fit, 999 don't, measured), `sys.setrecursionlimit` (named, with its danger), Windows' 260-character path limit (folders stopped at 95 levels, `WinError 206`), `os.listdir`/`os.path.join`/`os.path.isdir`/`os.path.dirname`/`os.path.basename`, `isinstance`, `raise`, `try`/`finally`, unwinding, `except OSError as error` and `error.strerror`, catching where you can carry on, an explicit stack with `append`/`pop`, `reversed`, `os.walk` and breadth-first (named), `ast` (checks only).

## 7. Status

| Lesson | State |
|---|---|
| 01-01-01 What a file holds | Written 2026-11-14. Code, commands and every stated output verified in a scratch folder (Python 3.13, macOS). Audit: no errors. Not yet: walkthrough test, a run on Windows, the three reviews |
| 01-01-02 Programs as functions | Written 2026-11-14. Every version of `count.py`, command and stated output verified on Windows 11, Python 3.14, in Windows PowerShell 5.1 (the app terminal's shell); the macOS pipe output (`b'hello\n'`, 6 bytes) is stated from the bytes, not run. All 13 checks run through the real checker against a scratch course folder: pass with the right code; the task's checks fail without `--json`; the import check fails without the `__main__` guard. Audit: no errors. Not yet: owner walkthrough in the app, the three reviews |
| 01-01-03 What "correct" means | Written 2026-11-14. Every file version, command, stated output and every `verify:` answer checked on Windows 11, Python 3.14, PowerShell 5.1 (`wc -w` agreement checked with Git Bash's GNU `wc` on four samples). All 12 checks run through the real checker against a scratch course folder, step by step: pass with the lesson's code; step 4's checks fail with the space-counting version; step 5's fail without `i == 0`; the task's fail before the task and with the `splitlines` shortcut, and pass with the hint answer. Audit: no errors, no signals. Not yet: owner walkthrough in the app, the three reviews |
| 01-01-04 Three models of a program | Written 2026-11-14. Code versions in the build folder, `versions/01-01-04/`; walk `walks/walk-01-01-04.mjs` runs all 20 checks step by step through the real checker on Windows 11, Python 3.14, PowerShell 5.1: all pass with the lesson's code; caught: the machine forgetting `in_word` (and the lesson's diagnostic output `got [1, 5, 3, 2, 1]` confirmed), per-piece decoding, no final decode, `main` without `count_stream`, no `sys.exit(1)`, and in the task both tempting mistakes; the task's checks fail before it and pass with the hint answer. Measured on that machine: 10 MB file, peaks 0.3 MB streaming vs 20.0 MB whole; 0.8 s vs 0.17 s. Audit: no errors, no signals. Not yet: owner walkthrough, the three reviews |
| 01-02-01 Conditions are statements | Written 2026-11-14. Walk `walks/walk-01-02-01.mjs` (build folder): all 13 checks pass with the lesson's code; caught: `find` left in either loop, the task's missing empty-group guard; the task's checks fail before it, pass with the hint answer. Stated outputs (truth table, `find` version keeping 1 of 3 error lines, `0 -1`, 4 "checked" lines, reversed-guard IndexError) confirmed. Audit: no errors, no signals. Not yet: owner walkthrough, the three reviews |
| 01-02-02 Rewriting conditions safely | Written 2026-11-14. Walk `walks/walk-01-02-02.mjs`: all 10 checks pass; caught: the wrong second choice in `show_rule.py` (2 differ lines, as stated), the flattened `matches` without the `--any` guard, both alert-task mistakes (`is_night and on_call`, the missing bracket). The `not all` mistake's 521 of 4096 differences and its first three differ lines confirmed. Audit: no errors, no signals. Not yet: owner walkthrough, the three reviews |
| 01-02-03 Every and some | Written 2026-11-14; Blockfall starts. Walk `walks/walk-01-02-03.mjs`, page checks in headless Chromium through the shim: all 15 checks pass; every `game.js` target equals its verified version; caught: unguarded `isFree` (TypeError), `.some(` in `canMove`, the `some` version against the De Morgan step, the task done with `every`. Stated behaviour of the `some` bug (slides to columns -2..0, sinks to row 20) confirmed. Not run in Electron or by hand in a browser. Audit: no errors, no signals. Not yet: owner walkthrough, the three reviews |
| 01-02-04 Normal forms and satisfiability | Written 2026-11-14. Walk `walks/walk-01-02-04.mjs`: all 12 checks pass; each `file=` target equals its verified version; caught: the set-intersection shortcut (misses `--all error --none err` and an all-forbidden `--any`), the task's empty-`--any` slip. Timings stated in the lesson measured on that machine (0.001 to 3.749 s, ×4 per term per group; fast under 0.0001 s). Audit: no errors, no signals. Not yet: owner walkthrough, the three reviews |
| 01-03-01 Place value | Written 2026-11-14; Kit `hexdump` starts. Walk `walks/walk-01-03-01.mjs`: all 14 checks pass and all 5 `verify:` answers match; each `file=` target equals its verified version; caught: the `hex()[2:]` version, no `ljust`, `<` for `~`, the task's missing zero case (15 differences, as stated), a `to_base` using `format`; the task's checks fail before it. Every dump shown in the lesson is real output (Windows 11, Python 3.14). Audit: no errors, no signals. Not yet: owner walkthrough, the three reviews |
| 01-03-02 Bits as switches | Written 2026-11-14; Blockfall rows become numbers. Walk `walks/walk-01-03-02.mjs`, page checks in headless Chromium through the shim: all 12 checks pass; each `game.js` target equals its verified version (`versions/01-03-02/`, made by `walks/mk-01-03-02.py`); every step's checks fail against the previous version; the unbracketed `isFree` gives `0` and 200 differences, as stated; caught in the task: `+=` (976), `^` (974), an unguarded Space. Every console value stated was evaluated (probe `walks/probe-01-03-02.mjs`), including the row-17 demo in "what these checks establish". Not run in Electron or by hand in a browser. Audit: no errors, no signals. Not yet: owner walkthrough, the three reviews |
| 01-03-03 Fixed width | Written 2026-11-14; Kit `hexdump` reads `u16le` … `s32be`. Walk `walks/walk-01-03-03.mjs`: all 22 checks and all 4 `verify:` answers pass with the lesson's code; each `file=` target equals its verified version (`versions/01-03-03/`); steps 4, 6 and 7 fail against their previous versions; caught: the planted `>` in `signed` (`128`, 1 of 256 wrong), `unsigned` without the reversal, `values_line` reading a partial value, `s16le` read unsigned; in the task the missing range check (8 differences, as stated), `>` (4), `int.to_bytes` inside; the `// %` alternative gives 0 differences. Every stated value evaluated (`walks/probe-01-03-03.py`; JavaScript facts in node 24). Windows 11, Python 3.14. Audit: no errors. Not yet: owner walkthrough, the three reviews |
| 01-04-01 Names and objects | Written 2026-11-14; concept, no project increment (Kit gains scratch files `board_bug.py`, `names.py`, `sharing.py`, task `grids.py`). Walk `walks/walk-01-04-01.mjs` (page checks through the shim): all 17 checks and all 4 `verify:` answers pass; each `file=` target equals its verified version (`versions/01-04-01/`); step 3's checks fail on the bug version; caught in the task: `[[fill] * cols] * rows`, `not in seen`, `id` in `distinct`. Console facts evaluated in headless Chromium (`board = []` TypeError, `s += 'c'`, `===` on arrays); Python facts in `walks/probe-01-04-01.py` (small-int caching, the `is` SyntaxWarning, `1000 is 1000` in one `-c` program `True`). Audit: no errors. Not yet: owner walkthrough, the three reviews |

01-02-03 got its missing `allow pasting` sentence on 2026-11-14 (inside the existing paste step; no new heading).

01-01-01 was moved to the one-folder layout on 2026-11-14 (setup step now makes `kit/` and `cd`s into it; checks start with `cd kit;`). Its check commands were run on Windows (Python 3.14) from a course folder and matched the lesson; the parsed lesson resolves to the `swe` folder. The owner stepped through it in the app: steps 5 and 7 now tell the learner to run the changed `count.py` and what it prints.

**Decided 2026-11-14:** stage 1's Targets lowered in the curriculum (1.4 to R; 1.8, 1.9 and 1.12 to A). Runways removed from the curriculum and the quality standard.

**Pilot gate lifted (2026-11-14):** the owner chose to build the full series now and review later (section 2).

**Not built yet:** a walkthrough test for the `swe` track (`*.desktop.test.js`, drives every step against a real folder).

## 8. Where Kit's code stands

The course folder holds `kit/`, and `kit/` holds `.venv/`, `make_samples.py`, `samples/hello.txt` ("héllo\n" as UTF-8, 7 bytes), `samples/latin1.txt` (the same in Latin-1, 6 bytes), `pieces.py`, `memory_check.py` (and maybe `big.txt`, 10 MB), `count.py` and `check_counts.py`. The build folder's `swe/kit/` holds exactly this end state. After 01-01-04, `kit/count.py` is the longest-line task's hint-ladder answer:

```python
import codecs
import json
import sys

# ASCII whitespace, the six bytes from the definition of a word.
WHITESPACE = b" \t\n\r\x0b\x0c"
NEWLINE = 10  # the value of the byte b"\n"
CHUNK_SIZE = 65536  # how many bytes to read at a time


# The counting as a state machine, fed one piece at a time.
def start(encoding):
    return {
        "bytes": 0,
        "newlines": 0,
        "words": 0,
        "in_word": False,
        "last": None,
        "line_length": 0,
        "longest": 0,
        "characters": 0,
        "decoder": codecs.getincrementaldecoder(encoding)(),
    }


def feed(state, chunk):
    in_word = state["in_word"]
    words = state["words"]
    for byte in chunk:
        if byte in WHITESPACE:
            in_word = False
        elif not in_word:
            in_word = True
            words += 1
    line_length = state["line_length"]
    longest = state["longest"]
    for byte in chunk:
        if byte == NEWLINE:
            longest = max(longest, line_length)
            line_length = 0
        else:
            line_length += 1
    last = state["last"]
    if chunk:
        last = chunk[-1]
    characters = state["characters"]
    decoder = state["decoder"]
    if decoder is not None:
        try:
            characters += len(decoder.decode(chunk))
        except UnicodeDecodeError:
            characters = None
            decoder = None
    return {
        "bytes": state["bytes"] + len(chunk),
        "newlines": state["newlines"] + chunk.count(b"\n"),
        "words": words,
        "in_word": in_word,
        "last": last,
        "line_length": line_length,
        "longest": longest,
        "characters": characters,
        "decoder": decoder,
    }


def finish(state):
    lines = state["newlines"]
    if state["last"] is not None and state["last"] != NEWLINE:
        lines += 1
    characters = state["characters"]
    if state["decoder"] is not None:
        try:
            characters += len(state["decoder"].decode(b"", final=True))
        except UnicodeDecodeError:
            characters = None
    return {
        "bytes": state["bytes"],
        "lines": lines,
        "words": state["words"],
        "characters": characters,
        "longest": max(state["longest"], state["line_length"]),
    }


# The counting as a function: all the bytes in, counts out.
def measure(data, encoding):
    return finish(feed(start(encoding), data))


# Read a stream a piece at a time, feeding each piece to the machine.
def count_stream(stream, encoding):
    state = start(encoding)
    while True:
        chunk = stream.read(CHUNK_SIZE)
        if not chunk:
            break
        state = feed(state, chunk)
    return finish(state)


# The program: read the input, count it, print the result.
def main():
    args = sys.argv[1:]
    as_json = "--json" in args
    args = [arg for arg in args if arg != "--json"]

    if len(args) > 1:
        encoding = args[1]
    else:
        encoding = "utf-8"

    if len(args) > 0 and args[0] != "-":
        with open(args[0], "rb") as file:
            counts = count_stream(file, encoding)
    else:
        counts = count_stream(sys.stdin.buffer, encoding)

    if as_json:
        print(json.dumps(counts))
        return
    print("bytes:", counts["bytes"])
    print("lines:", counts["lines"])
    print("words:", counts["words"])
    if counts["characters"] is None:
        print("characters: not", encoding, "text")
    else:
        print("characters:", counts["characters"])
    print("longest:", counts["longest"])


if __name__ == "__main__":
    main()
```

`kit/check_counts.py` is `versions/01-01-04/check_counts_end.py` in the build folder: `import sys`; tables `WORD_EXAMPLES` (8), `LINE_EXAMPLES` (7), `CHARACTER_EXAMPLES` (5), `LONGEST_EXAMPLES` (6); `SIZES = [1, 2, 3, 4096]`; `stream_counts(data, size)`; `check(name, examples)` compares `measure` and the machine at every size, prints `<name> passed: N of M`, returns the failures; ends `if failed > 0: sys.exit(1)`. Learners' tables may have extra rows.

**Kit after 01-02-04** (`count.py` and `check_counts.py` unchanged since 01-01-04): `make_log.py` and `samples/app.log` (six log lines, 122 bytes), `truth.py`, `short.py`, `show_rule.py`, `check_filter.py` (4096-case harness with `matches_loops` as reference), `alert.py` (task answer), `time_can_match.py`, `check_can_match.py`, and `filter.py` = `versions/01-02-04/filter_task.py` in the build folder: `matches` (flat `all`/`any` expression), `can_match` (brute force over subsets, `b"\0"` join), `can_match_fast` (used by `main`), `filter_lines`, `main` (`FILE` or `-`, then `--all` / `--any` / `--none` groups; exits 1 with "no line can ever match this query"; usage error with status 1).

**Kit after 01-03-01:** adds `hexdump.py` = `versions/01-03-01/hexdump.py` (`WIDTH = 16`, `FIRST_PRINTABLE`/`LAST_PRINTABLE` 0x20/0x7E, `shown(byte)`, `dump_line(offset, chunk)` → `format(offset, "08x")` + two spaces + hex padded with `ljust(WIDTH * 3 - 1)` + two spaces + text, `dump(stream)` with a `read(WIDTH)` loop, `main` taking `FILE` or `-`/nothing for standard input), `make_numbers.py` writing `samples/255.txt` (`b"255\n"`) and `samples/255.bin` (`bytes([255])`), and the task answer `bases.py` (`to_base(n, base)`, repeated division, `DIGITS`) with `check_bases.py` (61455 cases).

**Kit after 01-05-02:** adds `make_tree.py` (writes `sample_tree/`: 7 empty files in 7 folders including `empty/`), `tree.py` = `versions/01-05-02/tree_safe.py` (`tree(path, depth)` recursive, `try` around `sorted(os.listdir(path))` printing `[can't list PATH: strerror]`; `main` prints `ROOT/` then `tree(root, 1)`), `tree_iter.py` (task answer: `push_entries(stack, path, depth)` and `tree_iter(root)`), and scratch `frames.py`, `nest.py`.

**Kit after 01-05-01:** `kitargs.py` = `versions/01-05-01/kitargs.py` (`take_flag(args, flag, rest=None)` returns `(found, rest)`; `open_input(name)` returns `sys.stdin.buffer` for `-`/`None`, else `open(name, "rb")`). `count.py` = `versions/01-05-01/count.py`: `from kitargs import open_input, take_flag`; `main` uses `take_flag(sys.argv[1:], "--json")` and `with open_input(name) as stream`. `hexdump.py` = `versions/01-05-01/hexdump.py` (task answer): imports `json` and `kitargs`; `values_of(chunk, fmt)` returns ints and `values_line` joins them; `line_record(offset, chunk, fmt)`; `dump(stream, fmt, as_json)` prints one JSON list at the end with `--json`; `main` takes `--json` anywhere. `filter.py` still opens its file itself. Scratch: `order.py`.

**Kit after module 1.4:** `count.py`, `filter.py`, `hexdump.py` unchanged since 01-03-03. Scratch and concept files added: `board_bug.py`, `names.py`, `sharing.py`, `grids.py` (01-04-01), `change.py` (01-04-02), `copies.py` (01-04-03), `levels.py`, `levels_plain.py`, `compare_levels.py`, `cases/` (six logs), `dense.py`, `plain.py`, `check_top.py` (01-04-05). None is a Kit tool; later lessons can ignore them.

**Blockfall after 01-04-04:** `game.js` = `versions/01-04-04/game_task.js`. The helpers take the board as an argument (`isRowFull(board, row)`, `lock(board, cells)`, `isFree(board, row, col)`, `isBlocked`/`canMove(board, cells, dRow, dCol)`, `isLanded(board, cells)`, `dropped(board, cells)`); `newPiece` and `moved` return frozen arrays of frozen squares; `invariantProblems(s)` lists broken rules for `{ board, piece }`; `class Game` with `#board`, `#piece`, `#history`, `constructor`, `board()` (a copy), `piece()`, `move(dRow, dCol)`, `drop()`, `lockPiece()`, `undo()`, private `#check()` (`console.error("Broken rules: …")`); `const game = new Game()`; `draw()` reads `game.board()` and `game.piece()`; the `keydown` handler only picks a method. No global `state` any more.

**Blockfall after 01-04-03:** `game.js` = `versions/01-04-03/game_task.js`. Changes from 01-04-02: `newBoard()` returns a fresh starting board; `let state = { board: newBoard(), piece: newPiece() }` replaces the globals `board` and `piece` (every use is `state.board` / `state.piece`); `const history = []`; Space pushes `{ board: state.board.slice(), piece: state.piece }` before `lock`; `z` pops it back into `state` if the history isn't empty. Kit gains `copies.py` (scratch).

**Blockfall after 01-04-02:** `game.js` = `versions/01-04-02/game_task.js`. Changes from 01-03-02: `moved`'s comment says it's pure; `dropped(cells)` after `isLanded` (loop `canMove(result, 1, 0)` / `result = moved(result, 1, 0)`); the `keydown` handler starts with an `ArrowUp` case, `piece = dropped(piece)`. Kit gains `change.py` (scratch). Up from the start lands the T at rows 18,18,18,19; Up, Space, Up gives 825 991 and rows 16,16,16,17.

**Blockfall after 01-03-02:** `game.js` = `versions/01-03-02/game_task.js`. Changes from 01-02-03 (below): `board = new Array(ROWS).fill(0)`, one number per row, bit `c` = column `c` (`board[19] = 0b1111001111` = 975, `board[18] = 0b1100000001` = 769); `FULL = (1 << COLS) - 1` and `isRowFull(row)`; `countBits(n)` and `parity(n)` (console only); `isFree` ends `(board[row] & (1 << col)) === 0`; `newPiece()` returns a fresh T, `let piece = newPiece()`; `lock(cells)` ORs bits in; `draw` shades full rows `#eee`; the `keydown` handler locks a landed piece on `" "` and starts a new one. Dropping a T straight down and locking gives rows 18/19 = 825/991; the next T lands at rows 16–17.

**Blockfall after 01-02-03:** `blockfall/index.html` (canvas `#board`, 300×600, `<script src="game.js">`) and `blockfall/game.js` = `versions/01-02-03/game_task.js`: `ROWS`/`COLS`/`SIZE`, `board` (20 arrays of 10, bottom rows `[1,1,1,1,0,0,1,1,1,1]` and `[1,0,0,0,0,0,0,0,1,1]`), `let piece` (a T of `{row, col}` objects), `isFree`, `moved` (`map`), `isBlocked` (`some`), `canMove` (`!isBlocked`), `isLanded` (`some`), `drawSquare`, `draw` (orange when landed), a `keydown` handler for the three arrow keys. No falling, rotation or locking yet (game loop is 01-05-03; rotation and line clearing 01-09).

**Kit after 01-03-03:** `hexdump.py` = `versions/01-03-03/hexdump.py`: adds `FORMATS` (8 names → `(size, order, signed)`), `signed(value, bits)` (`>=` test), `unsigned(data, order)` (`(value << 8) | byte`, `data[::-1]` for little), `values_line(chunk, fmt)` (whole values only), `dump_line(offset, chunk, fmt)` and `dump(stream, fmt)` take a format (`None` = text column), `main` takes `FILE [FORMAT]` and exits 1 on an unknown format. `make_values.py` writes `samples/temps.bin` (16 bytes, s16le: 312 256 180 95 20 -5 -35 -60) and `samples/times.bin` (8 bytes, s32le: 2147483647 -2147483648). Task answer `pack.py` (`to_bytes(value, size, order)`, raises `ValueError`) and `check_pack.py` (197384 cases).

Taught so far, and usable without re-teaching (after 01-03-03, add: fixed width, wraparound and overflow, modulo 2ⁿ and `& (2**n - 1)` = `% 2**n`, `**`, `_` in number literals, Python precedence (arithmetic, shifts, `&`, comparisons), arbitrary precision, sign-magnitude (why not), two's complement and signed/unsigned ranges, `~x = -x - 1`, negate by flip-and-add-one, arithmetic vs logical shift (`>>`, JavaScript `>>>`), Python's infinite sign bits, boundary bugs (`>` vs `>=`), year 2038, `datetime` + `timedelta(seconds=…)`, overflow behaviour by language (table), big- vs little-endian, network byte order, `sys.byteorder`, `int.from_bytes`/`int.to_bytes` (and `signed=`), `data[::-1]`, tuple unpacking from a dictionary value, iterating a dict gives keys, `struct` (named), `raise ValueError` (task hints), `unittest.TestCase().assertRaises` (checks only). After 01-03-02, add: bitwise `&`, `|`, `^`, `~`, `<<`, `>>` (JavaScript, 32-bit; Python's have the same symbols), `&` vs `&&`, masks (test, set, clear, flip with `1 << n`), flags (Unix permission bits), bitfields (shift then mask; `#rrggbb`), operator precedence (`===` before `&` in JavaScript, not in Python), counting bits, parity and its limit (odd flips only), `x ^ k ^ k === x`, JavaScript `toString(2)`, `0b`/`0o`/`0x` literals in JavaScript, `new Array(n).fill(0)`, immediately called arrow functions in the console, Chrome/Firefox `allow pasting`, the 32-bit limits `1 << 31` negative and `1 << 32 === 1` (stated, not explained), `BigInt` (named only). After 01-03-01, add: positional notation and place value, base, bit, byte as 8 bits / two hex digits, binary/octal/hex and the `0b`/`0o`/`0x` literals, conversion both ways by hand (multiply-and-add; repeated division with `//` and `%`), grouping bits by 4 (hex) and 3 (octal), `format(n, spec)` with `b`/`o`/`x` and zero-padded widths, `hex()`, `int(text, base)`, `int(b"255")` parsing, offsets, printable ASCII 0x20–0x7e and `chr`, chained comparisons, `str.ljust`, `str.join`, `bytes([…])` and its 0–255 range, `bytes.hex(" ")` (verify only), `inspect.getsource` (checks only), hex dump tools `xxd`/`hexdump -C`/`od`/`Format-Hex` (named, not taught). After module 1.2, add: propositions, `and`/`or`/`not`, XOR as `!=`, truth tables, equivalence, short-circuit and guards, truthiness (falsy values), `in` on bytes, `sys.stdout.buffer.write`, `sys.exit("message")`, iterating a binary file by lines, De Morgan, double negation, distribution, implication (`not a or b`), contrapositive vs converse, exhaustive equivalence checks, tautological checks, `all`/`any`, generator expressions, `itertools.combinations`, sets and `&`, DNF/CNF, literals and clauses, satisfiability and brute-force search, exponential growth, `time.perf_counter`, `hasattr`; JavaScript: `const`/`let`, arrays, objects, `for` loops, `for … of`, functions, arrow functions, `map`/`every`/`some`, `===`, `&&`/`||`/`!`, canvas 2D `fillStyle`/`fillRect`, `addEventListener("keydown")`, `event.key`, `preventDefault`, the browser developer console. Before module 1.2: bytes vs text, encodings and decoding, `sys.argv`, `open(…, "rb")`, `try`/`except`/`else`, standard streams and pipes, `sys.stdin.buffer`, `-` for standard input, exit status (as an idea; never yet printed), `None`, `__name__ == "__main__"`, importing a function with `python -c`, list comprehensions (in the hint answer only: re-explain if a lesson needs one), `json.dumps`, determinism and hidden inputs, specifications as a sentence plus an example table, counterexamples, `bytes.split()` vs `split(b" ")`, indexing bytes gives an int and `int in bytes`, negative indexes (`data[-1]`), tuple unpacking in a `for`, truthiness of empty bytes (task hints only), `endswith`, bytecode and `dis` (seen, not studied), process ids, slices `data[i:j]` and `range` with a step, `chunk[-1]`, state and state machines (transition tables, `start`/`feed`/`finish`), incremental decoders (`codecs.getincrementaldecoder`, `final=True`), `read(n)` loops with `while True`/`break`, `tracemalloc` peaks, `sys.exit(1)` and reading `$LASTEXITCODE` / `echo $?`, the function / state machine / process models, `max`, `functools.reduce` (checks only, never shown).

An unknown encoding name still crashes with `LookupError`; 01-01-01 leaves that for module 1.10.

## 9. Session routine

**Start:** `git pull`. Read this file. Check `git log --oneline -5` for work since the last update.

**End (before stopping, even mid-lesson):**
- Update section 7 (status), section 8 (Kit's code, and each other project's once it starts) and, if planned, the next lesson's notes in section 6.
- Record any new convention in section 4 and any new owner decision in section 2.
- **Commit and push after each finished lesson** (owner decision 2026-11-14), directly on `main` (never a branch). Stage only this course's files: the lesson, this file, the regenerated `docs/generated/project-studio-lesson-review.*`, and any facts files `npm run facts` changed. Other sessions' uncommitted work stays out.
- **Don't stop to hand off** (owner, 2026-11-14): in a long or overnight run, keep going lesson after lesson; the conversation is summarized automatically. Keep this file current after each lesson instead.

## 10. Platform facts learned the hard way

- A check's `stdout="…"` passes when the output **contains** the text.
- On Windows, run `vitest` from `C:\…` with a capital drive letter (PowerShell `Set-Location "C:\Users\…"`). From the editor's lowercase `c:\…` every test file fails with "Cannot read properties of undefined (reading 'config')". Under full-suite load, `projectChecks.test.js` can time out; rerun it alone.
- Windows checks run in PowerShell: no `<` redirection, so use `stdin=`. macOS and Linux run the login shell.
- On Windows, `stdin=` text reaches the program through a PowerShell pipe and always ends in `\r\n`, so piped byte and character counts differ by platform. Check line or word counts on `stdin=`, and exact values through `python -c` or a named file.
- Windows PowerShell 5.1 (the app terminal's shell) re-encodes text between programs: `echo hello | python …` arrived as `b'\xef\xbb\xbfhello\r\n'` (10 bytes) on one Windows 11 machine. Never promise exact piped byte counts in prose; show the learner how to print the bytes.
- To test a lesson's checks for real: `runChecks` from `desktop/app/project-checks.cjs` with `parseLesson` steps, against a scratch course folder, writing each step's `file=` target in turn (01-01-02 was verified this way). Also run them against wrong code to see they fail.
- A `verify:` runs **after** the step's `file=` target is applied, so never put one on a prediction about the state the step replaces (01-05-01's mutable-default prediction asked about the trap version, and its step installs the fix). Text answers need `choice:` lines; a free answer must be a number.
- `verify:` in a predict fence is never shown; the track's walkthrough test runs it after the step and compares it with the answer.
- `scripts/check_latex.mjs` only reads `.js` lessons: on a Project Studio `.md` lesson it fails with "Unknown file extension". It isn't part of this course's validation.
- Bash heredocs in this environment lose backslashes, so a Python fix-up script written inline silently fails to match `b"\n"`. Write scratch scripts to files.
- An independent task must not have a `file=` target (the audit fails it unless the lesson sets `reference: optional`). Put the answer in the hints fence.
- The editor's auto-indent is off by default (a toolbar checkbox), so learners type the indentation shown. The step diff ignores trailing whitespace but not indentation.
- In development, the dev server ignores learners' project folders (`scripts/vite-learner-projects.mjs`). A project folder inside the repository used to freeze the app after every new or deleted file.

## Platform changes made for this course

- 2026-11-14: lesson-level `project:` frontmatter (`parseTrack.js` validates its form; `projectKeyFor` in `series.js`; `index.jsx` resets open files when the folder changes).
- 2026-11-14: auto-indent toggle and explicit spaces in the editor; whitespace-tolerant diff; the dev server ignores project folders; in-page delete confirmation.
- 2026-11-14: on Windows, a `run` check with `stdin=` now runs leading `cd folder;` commands before piping the input (it used to pipe the input into `cd`). `desktop/app/project-checks.cjs`; test in `projectChecks.test.js`.
- 2026-11-14: lesson maths renders correctly app-wide, and `check_latex.mjs` covers every lesson (commit `0c6ba0fd`).
