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

## 3. Lesson workflow (do every step)

1. **Map.** Take the lesson's row from the module-to-lesson map (section 6). Every item in the module's Covers line belongs to exactly one lesson; add no topics.
2. **Specify before prose:** outcomes (observable, with a U/R/A/E tier), real prerequisites, 2 to 5 likely misconceptions, the project increment.
3. **Write and verify the code first, in a scratch folder** (the session's scratchpad, never the repo). Run every version a step shows, every command, every stated output, every prediction answer. Python: `python3 -m venv .venv` there and use `.venv/bin/python`.
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
| 01-01-03 What "correct" means | algorithm vs program vs process; levels of a solution; what "correct" means | Kit: `count` gets a written definition of a word, checked against it |
| 01-01-04 Three models of a program | state; a program as a function, a state machine and a process | Kit: `count` streams its input through a word-boundary state machine; exit codes |
| 01-04-01 to 01-04-05 | names and objects, identity, aliasing; mutation and rebinding, side effects; copying and where state lives; invariants, encapsulation, value objects vs entities; reading unfamiliar code | Blockfall: the game-state aliasing bug and its fix (01-04-03) |
| 01-09-01 to 01-09-04 | what a test is, evidence vs claims, tautological tests; oracles, edge cases, regression; determinism, isolation, fixtures; red-green-refactor, test levels, over-mocking | Blockfall: rotation and line clearing as tested pure functions; Kit: tests for `count` |

Python setup that a runway would have covered is taught inline where first needed: the virtual environment in 01-01-01, modules and packages when Kit first needs a second file, `pytest` in 01-09.

**Pilot:** 01-01-01 to 01-01-04, 01-04, and the 01-09 Blockfall lesson. Each gets the standard's three reviews, including a walkthrough by someone who hasn't seen it, before the rest of stage 1 is written.

**Next lesson, 01-01-03 What "correct" means (planned):**
- Problem: add a word count, and find there's no single right answer. Ask how many words `don't stop—now` or `e-mail  me` holds: `str.split()`, `wc -w` and a person can disagree. A program can't be correct until "word" is defined.
- Write the specification first, as a sentence plus a table of examples with expected counts (a word is a maximal run of bytes that aren't ASCII whitespace, which matches `wc -w` for ASCII). Then implement it in `measure` with `data.split()`, adding a `"words"` key (the `--json` output gains it for free: point that out).
- Levels of a solution: problem (count words), algorithm (count the places where a non-space follows a space or the start), program (the Python), process (one run on one input). The same algorithm can be two programs; show `split()` and an explicit loop give the same counts. Leave the streaming state machine for 01-01-04.
- What "correct" means: meets its specification on every input in its domain. Example runs are evidence, not proof; one counterexample proves it incorrect. Diagnostic experiment: a plausible wrong implementation (`data.count(b" ") + 1`) passes the obvious example and fails on double spaces, a trailing newline and an empty input.
- Algorithm vs program vs process belongs here; keep it concrete (the process is the run you can watch, with its own input and exit status).
- Checks: piped input reaches the program with a CRLF ending on Windows, so check word and line counts, not byte counts, on `stdin=`; and `measure` called through `python -c` for exact values.
- Independent task candidate: change the specification (e.g. only runs containing a letter count as words, so `-` and `—` alone aren't words): update the example table first, then the code.

## 7. Status

| Lesson | State |
|---|---|
| 01-01-01 What a file holds | Written 2026-11-14. Code, commands and every stated output verified in a scratch folder (Python 3.13, macOS). Audit: no errors. Not yet: walkthrough test, a run on Windows, the three reviews |
| 01-01-02 Programs as functions | Written 2026-11-14. Every version of `count.py`, command and stated output verified on Windows 11, Python 3.14, in Windows PowerShell 5.1 (the app terminal's shell); the macOS pipe output (`b'hello\n'`, 6 bytes) is stated from the bytes, not run. All 13 checks run through the real checker against a scratch course folder: pass with the right code; the task's checks fail without `--json`; the import check fails without the `__main__` guard. Audit: no errors. Not yet: owner walkthrough in the app, the three reviews |

01-01-01 was moved to the one-folder layout on 2026-11-14 (setup step now makes `kit/` and `cd`s into it; checks start with `cd kit;`). Its check commands were run on Windows (Python 3.14) from a course folder and matched the lesson; the parsed lesson resolves to the `swe` folder. The owner stepped through it in the app: steps 5 and 7 now tell the learner to run the changed `count.py` and what it prints.

**Decided 2026-11-14:** stage 1's Targets lowered in the curriculum (1.4 to R; 1.8, 1.9 and 1.12 to A). Runways removed from the curriculum and the quality standard.

**Open decision (ask the owner before acting):**
- The pilot set: the owner dropped the runway and didn't object to the rest; confirm when the owner next reviews.

**Not built yet:** a walkthrough test for the `swe` track (`*.desktop.test.js`, drives every step against a real folder).

## 8. Where Kit's code stands

The course folder holds `kit/`, and `kit/` holds `.venv/`, `make_samples.py`, `samples/hello.txt` ("héllo\n" as UTF-8, 7 bytes), `samples/latin1.txt` (the same in Latin-1, 6 bytes), and `count.py`. After 01-01-02, `kit/count.py` (path from the course folder) is the `--json` task's hint-ladder answer; 01-01-03 starts from it:

```python
import json
import sys


# The counting: bytes in, counts out. It reads nothing and prints nothing.
def measure(data, encoding):
    try:
        characters = len(data.decode(encoding))
    except UnicodeDecodeError:
        characters = None
    return {"bytes": len(data), "lines": data.count(b"\n"), "characters": characters}


# The program: read the input, call measure, print the result.
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
            data = file.read()
    else:
        data = sys.stdin.buffer.read()

    counts = measure(data, encoding)
    if as_json:
        print(json.dumps(counts))
        return
    print("bytes:", counts["bytes"])
    print("lines:", counts["lines"])
    if counts["characters"] is None:
        print("characters: not", encoding, "text")
    else:
        print("characters:", counts["characters"])


if __name__ == "__main__":
    main()
```

Taught so far, and usable without re-teaching: bytes vs text, encodings and decoding, `sys.argv`, `open(…, "rb")`, `try`/`except`/`else`, standard streams and pipes, `sys.stdin.buffer`, `-` for standard input, exit status, `None`, `__name__ == "__main__"`, importing a function with `python -c`, list comprehensions (in the hint answer only: re-explain if a lesson needs one), `json.dumps`, determinism and hidden inputs.

An unknown encoding name still crashes with `LookupError`; 01-01-01 leaves that for module 1.10.

## 9. Session routine

**Start:** `git pull`. Read this file. Check `git log --oneline -5` for work since the last update.

**End (before stopping, even mid-lesson):**
- Update section 7 (status), section 8 (Kit's code, and each other project's once it starts) and, if planned, the next lesson's notes in section 6.
- Record any new convention in section 4 and any new owner decision in section 2.
- Commit only when the owner asks, directly on `main` (never a branch); push only when asked.

## 10. Platform facts learned the hard way

- A check's `stdout="…"` passes when the output **contains** the text.
- On Windows, run `vitest` from `C:\…` with a capital drive letter (PowerShell `Set-Location "C:\Users\…"`). From the editor's lowercase `c:\…` every test file fails with "Cannot read properties of undefined (reading 'config')". Under full-suite load, `projectChecks.test.js` can time out; rerun it alone.
- Windows checks run in PowerShell: no `<` redirection, so use `stdin=`. macOS and Linux run the login shell.
- On Windows, `stdin=` text reaches the program through a PowerShell pipe and always ends in `\r\n`, so piped byte and character counts differ by platform. Check line or word counts on `stdin=`, and exact values through `python -c` or a named file.
- Windows PowerShell 5.1 (the app terminal's shell) re-encodes text between programs: `echo hello | python …` arrived as `b'\xef\xbb\xbfhello\r\n'` (10 bytes) on one Windows 11 machine. Never promise exact piped byte counts in prose; show the learner how to print the bytes.
- To test a lesson's checks for real: `runChecks` from `desktop/app/project-checks.cjs` with `parseLesson` steps, against a scratch course folder, writing each step's `file=` target in turn (01-01-02 was verified this way). Also run them against wrong code to see they fail.
- `verify:` in a predict fence is never shown; the track's walkthrough test runs it after the step and compares it with the answer.
- An independent task must not have a `file=` target (the audit fails it unless the lesson sets `reference: optional`). Put the answer in the hints fence.
- The editor's auto-indent is off by default (a toolbar checkbox), so learners type the indentation shown. The step diff ignores trailing whitespace but not indentation.
- In development, the dev server ignores learners' project folders (`scripts/vite-learner-projects.mjs`). A project folder inside the repository used to freeze the app after every new or deleted file.

## Platform changes made for this course

- 2026-11-14: lesson-level `project:` frontmatter (`parseTrack.js` validates its form; `projectKeyFor` in `series.js`; `index.jsx` resets open files when the folder changes).
- 2026-11-14: auto-indent toggle and explicit spaces in the editor; whitespace-tolerant diff; the dev server ignores project folders; in-page delete confirmation.
- 2026-11-14: on Windows, a `run` check with `stdin=` now runs leading `cd folder;` commands before piping the input (it used to pipe the input into `cd`). `desktop/app/project-checks.cjs`; test in `projectChecks.test.js`.
- 2026-11-14: lesson maths renders correctly app-wide, and `check_latex.mjs` covers every lesson (commit `0c6ba0fd`).
