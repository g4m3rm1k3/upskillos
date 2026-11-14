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
- **Language per concept.** A concept lesson uses the language that exposes the concept best and says why in one line. A project lesson uses its project's language. A **runway** (before a project first uses a language) translates known basics into the new syntax, then teaches only what is new.
- **Several projects grow side by side; there is no final project.** A project grows only when the current module justifies its next piece (the smallest increment). Projects: Kit (Python CLI tools), Blockfall (JavaScript, later TypeScript, falling-block game; never call it Tetris), Ledger (Python, tkinter, SQLite), Framework (C# full-stack web framework, templates and React), Board (C# app on Framework), Machine (C virtual machine), Toylang (Rust language), Store (Go key-value store), Netkit (Python network tools), Renderer (C++). Where each starts and grows: curriculum section 4.
- **Platform: Project Studio**, as the `swe` series.

## 3. Lesson workflow (do every step)

1. **Map.** Take the lesson's row from the module-to-lesson map (section 6). Every item in the module's Covers line belongs to exactly one lesson; add no topics.
2. **Specify before prose:** outcomes (observable, with a U/R/A/E tier), real prerequisites, 2 to 5 likely misconceptions, the project increment.
3. **Write and verify the code first, in a scratch folder** (the session's scratchpad, never the repo). Run every version a step shows, every command, every stated output, every prediction answer. Python: `python3 -m venv .venv` there and use `.venv/bin/python`.
4. **Write the lesson** at `src/labs/project-studio/tracks/swe-sNN-<stage>/SS-MM-LL-<slug>.md`. Required in it:
   - Frontmatter: `title`, `runtime`, `project` (section 4). The first lesson of a chapter also sets `track`.
   - An opening that gives a reason to care (a problem, a surprise), before any definition.
   - A concrete example before each general rule; one new idea per sentence where possible.
   - `predict` fences before results, with `verify:` where the answer is printable.
   - A diagnostic experiment: a deliberate failure, read from the evidence, then fixed.
   - Alternatives with their costs ("what else, and why not").
   - An independent task (`## Your turn: …`) with **no** file target and a `hints` fence (nudge, concept, shape, answer).
   - A "What these checks establish, and what they don't" paragraph.
   - A closing retrieval check and a summary that teaches, not a glossary.
5. **Validate** (section 5), then update the status table (section 7) and "Where Kit's code stands" (section 8).

## 4. Conventions

- **Series** `swe` in `src/labs/project-studio/series.js`, prefix `swe-`, one chapter (track) per stage: `swe-s01-ignition`, `swe-s02-…`. Add each new chapter to the series' `chapters` list. Its learner profile is in `learningProfile.js`.
- **Lesson file names** `SS-MM-LL-<slug>.md` (stage, module, lesson; two digits each). Runways use module `00` in the stage that first needs them (`01-00-01-python-runway.md`). **The file name is the lesson id and a progress key: never rename or renumber a published lesson.** Every `##` heading is a step whose id is its position, so never insert a `##` into a published lesson; use `## Title {#key}` for an added step.
- **Project folders:** `project: swe-kit` (also `swe-blockfall`, `swe-ledger`, `swe-framework`, `swe-board`, `swe-machine`, `swe-toylang`, `swe-store`, `swe-netkit`, `swe-renderer`). A concept lesson with no project leaves `project:` out and works in its chapter's folder.
- **Python commands:** checks and `verify:` lines write `.venv/Scripts/python` (the checker maps it to `.venv/bin/python` on macOS and Linux). Prose shows both, with a small Windows / macOS-or-Linux table the first time.
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
| 01-00-01 Python runway | the curriculum's Python runway | Kit: virtual environment, modules and packages, `pytest` |
| 01-01-01 What a file holds | information vs representation vs meaning; data vs instructions | Kit starts: `count` reports bytes, lines, characters; chooses an encoding |
| 01-01-02 Programs as functions | inputs, outputs, transformations; deterministic vs nondeterministic | Kit: `count` reads standard input; the counting separated from the input and output |
| 01-01-03 What "correct" means | algorithm vs program vs process; levels of a solution; what "correct" means | Kit: `count` gets a written definition of a word, checked against it |
| 01-01-04 Three models of a program | state; a program as a function, a state machine and a process | Kit: `count` streams its input through a word-boundary state machine; exit codes |
| 01-04-01 to 01-04-05 | names and objects, identity, aliasing; mutation and rebinding, side effects; copying and where state lives; invariants, encapsulation, value objects vs entities; reading unfamiliar code | Blockfall: the game-state aliasing bug and its fix (01-04-03) |
| 01-09-01 to 01-09-04 | what a test is, evidence vs claims, tautological tests; oracles, edge cases, regression; determinism, isolation, fixtures; red-green-refactor, test levels, over-mocking | Blockfall: rotation and line clearing as tested pure functions; Kit: tests for `count` |

**Pilot:** 01-01-01 to 01-01-04, the Python runway, 01-04, and the 01-09 Blockfall lesson. Each gets the standard's three reviews, including a walkthrough by someone who hasn't seen it, before the rest of stage 1 is written.

**Next lesson, 01-01-02 Programs as functions (planned):**
- Problem: `count` can't sit in a pipeline (`some-command | count`), because it only reads a named file.
- `count` reads standard input when no path is given (`sys.stdin.buffer.read()`), like `wc`.
- Pull the counting into a function, `count_bytes(data, encoding)`, that returns the counts and does no input or output; `main` reads, calls it, prints. A program as a function from input to output; the function is the part you can test.
- Deterministic vs nondeterministic: same input, same output. Contrast a version that also prints the time or a random sample, and what that does to checking it.
- Checks: `run` with `stdin="…"` (not shell `<` redirection: Windows checks run in PowerShell, which has no `<`).
- Independent task candidate: a `--json` output flag, or counting several files given as arguments; decide by which better serves the outcomes.

## 7. Status

| Lesson | State |
|---|---|
| 01-01-01 What a file holds | Written 2026-11-14. Code, commands and every stated output verified in a scratch folder (Python 3.13, macOS). Audit: no errors. Not yet: walkthrough test, a run on Windows, the three reviews |

**Open decisions (ask the owner before acting):**
- Lower stage 1's Evaluate targets (proposed: 1.4 to R; 1.8, 1.9 and 1.12 to A)?
- The pilot set above was proposed, not yet confirmed.

**Not built yet:** a walkthrough test for the `swe` track (`*.desktop.test.js`, drives every step against a real folder).

## 8. Where Kit's code stands

After 01-01-01 the learner's Kit folder holds `.venv/`, `make_samples.py`, `samples/hello.txt` ("héllo\n" as UTF-8, 7 bytes), `samples/latin1.txt` (the same in Latin-1, 6 bytes), and `kit/count.py`. The lesson's independent task ends with this `kit/count.py` (the hint ladder's answer); the next lesson starts from it:

```python
import sys

path = sys.argv[1]
if len(sys.argv) > 2:
    encoding = sys.argv[2]
else:
    encoding = "utf-8"

with open(path, "rb") as file:
    data = file.read()

print("bytes:", len(data))
print("lines:", data.count(b"\n"))

try:
    text = data.decode(encoding)
except UnicodeDecodeError:
    print("characters: not", encoding, "text")
else:
    print("characters:", len(text))
```

An unknown encoding name still crashes with `LookupError`; 01-01-01 leaves that for module 1.10.

## 9. Session routine

**Start:** `git pull`. Read this file. Check `git log --oneline -5` for work since the last update.

**End (before stopping, even mid-lesson):**
- Update section 7 (status), section 8 (Kit's code, and each other project's once it starts) and, if planned, the next lesson's notes in section 6.
- Record any new convention in section 4 and any new owner decision in section 2.
- Commit only when the owner asks, directly on `main` (never a branch); push only when asked.

## 10. Platform facts learned the hard way

- A check's `stdout="…"` passes when the output **contains** the text.
- Windows checks run in PowerShell: no `<` redirection, so use `stdin=`. macOS and Linux run the login shell.
- `verify:` in a predict fence is never shown; the track's walkthrough test runs it after the step and compares it with the answer.
- An independent task must not have a `file=` target (the audit fails it unless the lesson sets `reference: optional`). Put the answer in the hints fence.
- The editor's auto-indent is off by default (a toolbar checkbox), so learners type the indentation shown. The step diff ignores trailing whitespace but not indentation.
- In development, the dev server ignores learners' project folders (`scripts/vite-learner-projects.mjs`). A project folder inside the repository used to freeze the app after every new or deleted file.

## Platform changes made for this course

- 2026-11-14: lesson-level `project:` frontmatter (`parseTrack.js` validates its form; `projectKeyFor` in `series.js`; `index.jsx` resets open files when the folder changes).
- 2026-11-14: auto-indent toggle and explicit spaces in the editor; whitespace-tolerant diff; the dev server ignores project folders; in-page delete confirmation.
