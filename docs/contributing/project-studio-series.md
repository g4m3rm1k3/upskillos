# Write a Project Studio series

Project Studio is the part of UpSkillOS where a learner builds a real project in a real folder on their own computer, one lesson at a time. The desktop app shows the lesson beside an editor and a terminal, and **Check my work** runs checks against the learner's actual files: does this file exist, does this command print that, do the tests pass, is it committed.

This guide is everything you need to add a series of your own. A working one-lesson series to copy is in [docs/templates/project-studio-series/](../templates/project-studio-series/README.md).

## Where things live

Everything is under `src/labs/project-studio/`.

| What | Where | Notes |
|---|---|---|
| A chapter | `tracks/<series>-<chapter>/` | A folder. Its name is the chapter's key and the learner's project key, so never rename it once published. |
| A lesson | `tracks/<series>-<chapter>/<CC>-<LL>-<slug>.md` | One Markdown file. It is found automatically; there is no list to add it to. The file name is the learner's progress key, so never rename it once published either. Lessons sort by file name. |
| Supplied files | `tracks/<chapter>/support/` | Files the lesson gives the learner (starter code, sample data, a test helper). |
| Your turn answers | `tracks/<chapter>/answers/` | Never shown to learners. The walkthrough test writes them. |
| Prediction scripts | `tracks/<chapter>/verify/` | Optional. Long `verify:` commands, run by the walkthrough test. |
| Walkthrough | `tracks/<series>.walkthrough.js` | What a learner does at each step, and the wrong answers each check must reject. |
| Walkthrough test | `<series>.desktop.test.js` | A few lines that hand your walkthrough to the shared runner, `walkSeries.js`, which walks the whole series in a temporary folder, as a learner would. |
| Registration | `series.js`, `learningProfile.js` | The series' name and chapter names, and who it's for. |

## Try a lesson first, in your drafts folder

In the desktop app, Project Studio has an **Open drafts folder** button. It opens `Documents\UpSkillOS Drafts` on your computer. Any `.md` lesson you save there appears under the **Drafts** series as soon as you switch back to the app: no registration, no tests, no rebuild, and nothing in the repository changes. A folder inside it is a chapter of its own, and its `support/` folder holds the files its lessons' `support:` front matter names. A draft that can't be read shows up as a lesson saying what's wrong with it.

Drafts are for trying a lesson out. When it works, move it into the repository with the steps below.

## Paste lessons from somewhere else, in the scrap folder

Lessons written outside the repository, by an agent in the browser for example, can be pasted into `src/labs/project-studio/scrap/`. A top-level folder there is a series in the **Series** drop-down, and a folder inside it is a chapter in the **Chapter** drop-down. Scrap lessons are loaded apart from `tracks/`, so they never change a built-in lesson or its tests, and they work in the browser build as well as the desktop app. [scrap/_AGENT-PROMPT.md](../../src/labs/project-studio/scrap/_AGENT-PROMPT.md) is a prompt to give the agent, with the whole lesson format in it, and [scrap/README.md](../../src/labs/project-studio/scrap/README.md) says where each file goes.

## Make a series in six steps

1. **Copy the template.** Copy `docs/templates/project-studio-series/myseries-basics/` to `src/labs/project-studio/tracks/<your-series>-basics/` and `myseries.walkthrough.js` to `src/labs/project-studio/tracks/<your-series>.walkthrough.js`. Replace `myseries` everywhere in the copies with your series key, a short lowercase word such as `chess`.
2. **Register the series** in `series.js`: add an entry to `SERIES` (the Frontier entry is a good model).

   ```js
   {
     key: 'chess',
     label: 'Build a Chess Engine',
     prefix: 'chess-',
     sharedProject: true,          // every chapter works in one project folder
     chapters: [
       ['chess-basics', '01 · The Board'],
     ],
     planned: 'Chapter 1 is written. The rest is planned in docs/chess-series-plan.md.',
   },
   ```

   Any chapter folder whose name starts with the prefix joins the series, so later chapters only need a line in `chapters`.
3. **Say who it's for** in `learningProfile.js`: one line before the `profiles` table, like the Frontier line. `level` is `beginner`, `bridge` or `advanced`, `maturity` is `in-development` until someone has reviewed it, and `audience` (over 40 characters) says what a learner should already know. `lessonQuality.test.js` fails until this exists.
4. **Write the lessons** (the next section).
5. **Copy the walkthrough test.** Copy the template's `myseries.desktop.test.js` to `src/labs/project-studio/<your-series>.desktop.test.js`. It's three lines that hand your walkthrough to the shared runner:

   ```js
   import { walkSeries } from './walkSeries.js';
   import { WALKTHROUGH } from './tracks/chess.walkthrough.js';

   walkSeries({ name: 'Chess', prefix: 'chess-', walkthrough: WALKTHROUGH, envPrefix: 'CHESS' });
   ```

   Then fill in the walkthrough file as you write each step.
6. **Run the checks** (see [Check your series](#check-your-series)).

## A lesson file

````markdown
---
title: 1.1 — A Greeting Program
track: Build a Chess Engine — The Board
trackOrder: 40
runtime: python
support: tests/conftest.py
---

The introduction: what this lesson builds and why it matters.

## A step's title

Text, then at most one file, then text explaining it.

```python file=greet.py
...the whole file as it should be after this step...
```

```check
run "python greet.py Ada" stdout="Hello, Ada!" label="greet.py greets by name" -- Save the file, then run it.
```
````

### Front matter

| Key | Meaning |
|---|---|
| `title` | Shown in the lesson list. Number it: `1.1 — …`. |
| `track` | On the **first lesson of each chapter** only: the chapter's title. |
| `trackOrder` | On the first lesson of each chapter: a number that places the chapter among all chapters. Pick an unused range for your series (Frontier uses `15`, `15.01`, `15.02` …). |
| `runtime` | What the **Run** button does: `python`, `cpp`, `java`, `dotnet`, or `none` for lessons with nothing to run. |
| `run` | Optional: the file **Run** runs. Without it, Run runs the current step's file. |
| `support` | Optional: a comma-separated list of files in the chapter's `support/` folder. They are created in the learner's project when they click a step's **Create provided …** button. |

### Steps

Each `##` heading is a step. A step's position is its progress key, so to add a step to a published lesson without moving the others, give it a key of its own: `## Title {#my-key}`.

**A step shows at most one file**, as a fence with `file=`:

````markdown
```python file=src/game/board.py
...
```
````

Write the **whole file** as it should be after the step. The app compares it with the learner's file and shows only the lines to add, delete or indent, so a three-line change to a long file reads as three lines. Small changes to a second file (a line in `.gitignore`, say) go in the text.

A step that hands the learner a file to read, not type, marks it `provided`. The **Create provided …** button writes it, along with every file in `support:`:

````markdown
```python file=tests/test_board.py provided
...
```
````

### Checks

A ```` ```check ```` fence holds one check per line. Everything after ` -- ` is the hint shown when the check fails, and `label="…"` replaces the generated description.

| Check | Passes when |
|---|---|
| `file <path>` / `dir <path>` / `missing <path>` | The file or folder exists, or doesn't. |
| `contains <path> "<text>"` / `lacks <path> "<text>"` | The file has, or doesn't have, the text. |
| `matches <path> "<regex>"` | The file matches the regular expression. |
| `run "<command>" [stdout="…"] [without="…"] [stderr="…"] [stdin="…"] [exit=N] [timeout=S]` | The command exits with code 0 (or `exit=N`) and, if given, prints the `stdout` text, doesn't print the `without` text, and shows the `stderr` text. `stdin` is typed into it. It runs in the project folder and is stopped after 60 seconds (or `timeout=S`). |
| `tests "<program>" [require="…"]` | A GoogleTest-style test program passes (C++). |
| `git-repo`, `git-commits <n>`, `git-clean`, `git-tracked <path>`, `git-untracked <path>`, `git-ignored <path>` | The project's Git repository is in that state. |
| `git-branch <name>`, `git-has-branch <name>`, `git-no-branch <name>`, `git-merged <branch> [into]` | Branches. |
| `git-remote [name]`, `git-pushed`, `git-config <key>`, `git-message "<text>"`, `git-tag <name>` | Remotes, pushing, settings, commit messages and tags. |
| `page <html file> "<JavaScript expression>" <expected>` | The page, loaded in a browser, gives that value. |

Prefer checks of **behaviour** (`run`, tests) over checks of **text** (`contains`). A `contains` check passes on code that doesn't work, so use it only for what a run can't show, such as "the magic number has a name".

When a step comes with a test file, run one part of it per check with `pytest -k <word>`. The word must start the names of the tests it means (`test_<word>…`), appear in no other test name in that file, and not appear in the file's name. `pytest -k` matches any part of a name, so `-k top` would also run `test_stops_at_the_top`.

### Predictions

A ```` ```predict ```` fence asks the learner to commit to an answer before running something:

````markdown
```predict
question: What does `python greet.py` print with no name?
choice: Hello, !
choice: An IndexError
answer: An IndexError
explain: sys.argv has only the script's name in it, so sys.argv[1] doesn't exist.
verify: python -c "..."
```
````

`answer:` repeats the right choice's text. With no `choice:` lines and a number for `answer:`, it's a number question (`tolerance:` optional). `verify:` is never shown: the walkthrough test runs it after the step, and the **last line it prints** must be the answer. `verify: script name.py` runs `verify/name.py` from the chapter folder inside the project. Ask only about things that come out the same on every computer.

### Hints

A ```` ```hints ```` fence gives help one rung at a time: `nudge:`, `concept:`, `shape:` and `answer:`, in that order, any of them left out. A rung can run over several lines. Code inside a rung uses `~~~` fences, because a ```` ``` ```` would end the hints fence.

### Your turn

Every lesson ends with at least one step whose title starts **Your turn**. It asks the learner to build something on their own, after the lesson has taught everything it needs. It has checks and a `hints` fence, and it **shows no code**: no `file=` fence, unless it's a `provided` file such as a test. Its answer goes in the chapter's `answers/` folder.

### Figures

A ```` ```figure ```` fence puts an interactive component in the lesson: `name: <module>/<Export>`, `caption:` and one line of JSON `props:`. Components live in `figures/*.jsx` and are registered in `figures/index.js`.

## The walkthrough

`<series>.walkthrough.js` says what a learner does at each step, keyed by `"<chapter>/<lesson file name without .md>#<step title>"`. By default the walkthrough test types each step's file for you. An entry adds:

| Key | What it does |
|---|---|
| `run: [...]` | Commands the lesson tells the learner to type in the terminal. |
| `files: { path: content }` | Files the learner writes themselves, such as a Your turn answer: `answer('<chapter>', 'name.py')`. |
| `editFiles: { path: [[from, to], ...] }` | Small changes the text describes, made to a file as it is now. |
| `wrong: [...]` | Wrong answers. Each is tried on a copy of the project before the step, and every check whose index is in its `fails` list must **fail**. |

A wrong answer takes the same keys, plus `fails`, `edit: [[from, to]]` (the step's own file with one change), and `typeFile: true` (type the step's file after all). Give each check at least one wrong answer that it alone catches: a check that no wrong answer can fail isn't checking anything.

## Check your series

| Command | What it checks |
|---|---|
| `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"` | Every lesson parses; every check, prediction and hint is well formed; the series is registered and labelled. About 30 seconds. |
| `npx vitest run src/labs/project-studio/<series>.desktop.test.js` | The walkthrough: the whole series built from an empty folder, every check passing, every wrong answer caught, every prediction's `verify` printing its answer. Windows only, as the lessons' commands are PowerShell. |

A long series takes a while to walk. Set `<ENVPREFIX>_UNTIL=<lesson id>` to stop after a lesson, `<ENVPREFIX>_KEEP=<folder>` to keep the finished project, and `<ENVPREFIX>_START=<that folder>` with `<ENVPREFIX>_FROM=<lesson id>` to walk only the lessons from there on. A lesson id is `<chapter>/<file name without .md>`.

Then open the series in the desktop app and do a lesson yourself. The tests prove the checks are right; only a person can tell whether the lesson teaches.

## What a good lesson does

- **It builds one real project.** Each lesson leaves the learner's project working and a little bigger.
- **It explains before it asks.** Every idea a Your turn needs is taught in an earlier step.
- **Small steps.** A step changes a few lines and explains them, rather than handing over a whole file.
- **Predictions before running.** Asking "what will this print?" first makes the answer stick.
- **Checks catch wrong answers.** Write the wrong answers a learner is likely to try, and make sure a check fails on each.

[docs/lesson-writing-standard.md](../lesson-writing-standard.md) has the house style, and [docs/frontier-handoff.md](../frontier-handoff.md) shows how one series records its rules and progress between writing sessions.
