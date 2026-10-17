# Dynamic Programming course: audit, plan and status

The course at `src/courses/dynamic-programming/` (31 lessons in 8 chapters, `#/course/dynamic-programming`) is being rebuilt so that what it teaches is true and its challenges really test the learner. Asked for on 2026-10-17 ("add dynamic programming lessons and make sure its teaching and challenges are legit").

Read this file first when resuming, and update **Where we stopped**.

## What the audit found (2026-10-17)

Measured by running every notebook cell in an isolated VM (a 2-second timeout per cell), and by reading.

- **No challenge is checked.** The 71 challenges are `js` cells in a `JSNotebook`: the learner can edit them and reveal a solution, but nothing grades the attempt. The PASS/FAIL lines are part of the learner's own editable code, and their expected values were never checked independently of the solution next to them.
- **3 reference solutions fail their own tests** (dp1-005 cell 4, dp7-001 cell 1, dp7-003 cell 2); 1 has no tests.
- **4 starter cells throw or hang.** dp7-002's second challenge is an infinite loop: pressing Run on the stub hangs the page.
- **The quizzes give their answers away.** In 122 of 124 questions the right option is the longest one by a factor of 1.5 or more; it is usually the only one with an explanation attached.
- **Numbers in the prose are wrong.** Lesson 1.1 says naive `fib(50)` takes "over a trillion" calls (and later ">2 trillion"); it takes 2·F(51) − 1 = 40,730,022,147. It says `fib(6)` calls `fib(2)` eight times; it is F(5) = 5. It says a problem "has a DP solution if and only if" it has overlapping subproblems and optimal substructure, which is not a theorem.
- **Most of the lesson standard is missing.** Lessons have hook, intuition, notebook and quiz only: no worked examples, written challenges, misconceptions, debugging, transfer prompts, mastery level, spiral links or checkpoints ([docs/lesson-writing-standard.md](lesson-writing-standard.md)). Quizzes use `correct: index`, not `answer: string`, and have 4 questions, not 6.
- **The repository's checkers all pass**, which is the point: `validate-lesson-schema`, `check_js_cells` (138 cells parse), `check_latex` and `check_python_cells` (97 Python cells run) confirm that code parses and runs, never that it is right.
- `src/courses/dynamic-programming/viz/ScienceNotebook.jsx` is an unused copy: `VizFrame` loads `courses/geometry/viz/ScienceNotebook.jsx`.

## How a challenge is made legitimate

1. **The learner edits and runs it.** Challenges are `ScienceNotebook` `coding` cells (editor, Run, Reset, Show solution). That component also had a bug for every course: the first Run showed nothing, because the output frame was not mounted yet when its code was set. Fixed on 2026-10-17.
2. **Hidden tests run off the page's thread.** A cell's `tests` (JavaScript source) runs after the learner's code in a Web Worker that the sandboxed frame starts; the frame draws each result line, sends the verdict to the page (`{ type: 'sn_verdict', pass, message }`), and terminates the worker after 5 seconds with the cell's `timeoutMessage`. A plain iframe was not enough: in Chromium a sandboxed frame shares the page's thread, so a slow recursion froze the whole page (measured; the worker keeps the page answering in 2 ms).
3. **Tests check against an independent answer.** Each `tests` compares the learner's function with a brute-force reference written differently from the intended solution (full enumeration, or plain recursion on small inputs), on fixed edge cases plus seeded random cases. Hard-coding the examples cannot pass.
4. **A message names what is wrong**, with the failing input, the expected and the actual value, and never the fix.
5. **`dp-challenges.test.js` proves it**: for every coding cell, `solutionCode + tests` passes and `startCode + tests` fails, each in a VM with a timeout.

## The lesson standard applied here

Every rebuilt lesson has every field of [docs/lesson-writing-standard.md](lesson-writing-standard.md): concrete-first intuition with a numbered procedure callout, a warning and a prediction moment; a notebook whose demo cells say what to watch for; math (the recurrence derived and argued correct); rigor (four paragraphs); three worked examples; three written challenges with teaching walkthroughs; misconceptions, transfer prompts and debugging (two or more each); mastery, semantics, spiral and checkpoints; assessment; and a quiz of six or more questions with `answer` strings, hints, a detection question, a near-miss distractor, and options of similar length. Every number in the prose is computed, not estimated, and a test checks the ones that can be checked.

Lesson ids, slugs and file names stay as they are (ids are progress keys). New lessons take the next free number in a chapter, or a new chapter.

## Plan

1. Infrastructure: `tests` and the verdict in `ScienceNotebook`'s coding cell; `check()` returning `{ pass }` honoured; `dp-challenges.test.js` and a quiz/structure test over rebuilt lessons.
2. Rebuild chapter 1 (foundations), lesson by lesson. 1.1 also teaches the design method (state, recurrence, base cases, order, answer), which every later lesson uses.
3. Rebuild chapters 2–8 the same way.
4. New lessons, after the rebuild: reconstructing the optimal choice from the table (1.7); then a new chapter for classic DP the course lacks (shortest paths as DP: Bellman–Ford and Floyd–Warshall; linear recurrences by matrix power; sum over subsets; the convex hull trick). The final list is settled when chapter 1 is done, by what the rebuilt lessons actually leave out.

Size: about one session per two to three lessons, so roughly twelve to fifteen sessions for the rebuild and three to four for the new lessons. The bottleneck is verification: every number and every test reference is computed and checked.

## Where we stopped

2026-10-17, session 1:

- **Audit** done (above); every existing checker passes, which is why it was needed.
- **Infrastructure** done. `courses/geometry/viz/ScienceNotebook.jsx` coding cells take `tests` (worker, verdict, timeout) and `timeoutMessage`; `check()` may return `{ pass, message }`. Two bugs fixed there for every course: the first Run showed nothing (the frame was not mounted when its code was set), and inline `code` in cell text rendered as full-width blocks (react-markdown 10 dropped the `inline` flag). `challengeKit.js` holds the hidden-test kit; `dp-challenges.test.js` runs every challenge (solution passes, stub fails) and checks rebuilt lessons against the standard.
- **Lesson 1.1 rebuilt** (`dp1-001`): stairs, the six-step design procedure, call counts proved and computed, three graded challenges (memoize, bottom-up with any step set, the cache-key bug), Python lab with asserts, every standard section. Mutation-tested: naive recursion, ways(0) = 0, hard-coded answers, downward loop, loops swapped (combinations), memo inside the function, colliding key `n + k` all fail with a specific message. Seen in a real browser.
- Found, not fixed (outside this course): the lesson page never shows `misconceptions`, `transferPrompts` or `debugging` (only the Lesson Builder reads them), for every lesson that has them. `three-js` 5.3's coding cell does not parse (stub and solution) and its keyword `check()` passes the untouched stub; the first-Run fix makes the syntax error visible.

**Next: lesson 1.2** (`dp1-002`, 1D patterns), the same way: compute every number first, write to the standard, three graded challenges with brute-force references, mutation-test them, add the id to `REBUILT`, look at it in a browser.
