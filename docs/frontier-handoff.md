# Frontier: session handoff

Start every Frontier writing session by reading this file, then the plan's chapter row for the chapter you're writing (`docs/frontier-ai-series-plan.md`). Don't re-read finished lessons unless a new one builds on their code: the *State of the project* section below says what exists.

At the end of a session, update this file (state, next steps, anything learned) and the plan's *Progress* table, then stop so the owner can clear the chat. **About two or three lessons, or one chapter, per session.** The owner wants small sessions, to save context and usage.

## Rules (from the owner)

- **Write in plan order, without review pauses.** The owner reviews by doing the lessons.
- **Never touch git** (no add, commit or push). Lessons may *teach* git. The agent never runs it on this repo.
- **Testing safely:** an unlimited PyTorch run once froze the owner's PC. Every Python run that imports NumPy, PyTorch or any ML library goes through `node scripts/frontier-safe-run.mjs` (GPU hidden, 2 threads, timeout, memory ceiling). One run at a time, in the foreground. Tiny configs only. No GPU unless the owner asks in that session. Downloads over 1 GB only with the owner's OK. Full rules: the plan's *Testing safely on the authoring machine*.
- **Don't run code whose result is obvious.** Verification goes to the checks a lesson actually depends on.
- **Lessons won't run on this machine.** Never size a lesson to this PC's GPU. Every check must pass on an ordinary CPU in seconds.
- **Project Studio features may be added** (for example, figures that show an algorithm's complexity) as long as the other series keep working. After any change outside `tracks/frontier-*`, run the non-desktop Project Studio tests (below).

## Lesson format (copied from Q-Arcade, which is the reference)

- One Markdown file per lesson: `src/labs/project-studio/tracks/frontier-<chapter>/<CC>-<LL>-<slug>.md`. The file name is the progress key, so never rename a published one.
- The first lesson of each chapter has `track:` and `trackOrder:` front matter. Chapter *n* uses `trackOrder: 15.<nn>` (Chapter 0 is `15`, Chapter 1 is `15.01`, Chapter 12 is `15.12`).
- `runtime: python`. Add `support: tests/conftest.py` when a lesson provides tests: the chapter's `support/tests/conftest.py` caps maths libraries at 2 threads. Copy it into each new chapter's `support/`.
- Steps are `##` headings. Each step shows at most one file (```` ```python file=path ````). Other changes are described in text, and the walkthrough makes them with `editFiles`.
- Checks: ```` ```check ```` with `file`, `contains`, `lacks`, `matches`, `run "<cmd>" [stdout="…"] label="…" -- hint`.
- pytest checks use `-k <word>`. The word must start every test name it selects (`test_<word>…`), appear in no other test name, and not appear in the test file's name. The desktop test enforces this.
- Predictions: ```` ```predict ```` with `question / choice / answer / explain / verify`. `verify` prints exactly the answer text as its last line. Ask only about deterministic things: a number that depends on the machine can't be a prediction.
- Every lesson has a **Your turn** step: checks, a `hints` block (nudge / concept / answer), no code shown, its answer in `answers/`, and wrong answers in the walkthrough.
- Teach everything a Your turn needs *before* it (lesson 0.3 teaches the five tensor operations before asking for `matmul_difference`).

## Walkthrough test: the traps found so far

- Wrong answers run on a copy of the project that **shares the real `.venv`** (a junction). The editable install in that `.venv` points at the real project's `src`, so the test puts the copy's `src` first on `PYTHONPATH`. That would also hide a missing install, so a wrong answer *about installing* sets `pythonPath: false`.
- A wrong answer must **never install into the shared `.venv`**. If it needs to install, it sets `copyVenv: true`.
- When one lesson fails partway, every later lesson fails with confusing errors (missing files). Fix the first failure and ignore the rest.
- Run it (about 8 minutes for Chapter 0; the first run downloads PyTorch):

  ```powershell
  node scripts/frontier-safe-run.mjs --timeout 590 --mem 4096 -- npx vitest run src/labs/project-studio/frontier.desktop.test.js
  ```

  The tool call's limit is 10 minutes, so as chapters are added, use `FRONTIER_KEEP=<scratch folder>` once, then `FRONTIER_START=<that folder> FRONTIER_FROM=<new lesson prefix>` to walk only the new lessons.
- Non-desktop Project Studio tests (format and registration, about 30 s):

  ```powershell
  npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"
  ```

## State of the project (what a learner has after the last written lesson)

After Chapter 0 (lessons 0.1–0.3, walkthrough passing on 2026-10-08):

```text
frontier/
  .gitignore              .venv/, __pycache__/, .pytest_cache/, *.egg-info/
  pyproject.toml          setuptools; name frontier; dependencies numpy>=2, torch>=2.6;
                          [project.scripts] frontier-info = "frontier.info:main"; src layout
  requirements.txt        numpy==2.5.3, pytest==9.1.1, torch==2.14.1
  experiments/first_tensors.py
  src/frontier/
    __init__.py           __version__ = "0.1.0"
    info.py               device(), environment() (python, system, numpy, torch, device), report(), main()
    selfcheck.py          matmul_difference(n, seed)
  tests/
    conftest.py           2 threads
    test_info.py          -k environment, report
    test_torch_info.py    -k device, versions, agreement
```

Taught so far: virtual environments and `sys.prefix`; `PATH`; `python -m pip`; pins vs ranges; wheels; `.gitignore`; packages, `__init__.py`, `sys.path`, the src layout; `pyproject.toml`; editable installs and `.pth` files; console-script entry points; reading pytest tests; threads; the CPU and CUDA builds of PyTorch; devices; tensors (`from_numpy`, `dtype`, `.to`, `@`, `.cpu().numpy()`); float32 vs float64; comparing against a reference with a tolerance.

Not yet taught (don't use without teaching): git, dataclasses, `argparse`, exceptions as design, type hints, the debugger, profiling, NumPy beyond `default_rng`, `standard_normal`, `@`, `abs` and `max`.

## Next: Chapter 1 · From Script to Software (`frontier-engineering`, `trackOrder: 15.01`)

Plan row: a supplied hacked-together text-statistics script (one long file, globals, copy-paste) refactored step by step into functions, modules, a dataclass and a command-line tool, without changing its output. Taught: naming and function design, type hints, dataclasses, exceptions on purpose, `argparse`, tests with `pytest` written first to pin the old behaviour, git (commits, branches, GitHub).

Design notes for it:

- The supplied script should be a believable hack, about 60–80 lines: it reads a text file, counts words and characters, finds the most common words, and prints a report. Give it real smells (globals, a copy-pasted block, magic numbers, one 50-line function, a bare `except`). Text statistics lead into the language-modelling chapters, so the code isn't throwaway: Chapter 26 counts characters the same way.
- The first lesson pins its current output with a **characterisation test** (run the script on a supplied text and compare with saved output), before changing anything.
- The package goes under `src/frontier/text/` (or `textstats.py`). Keep it inside the `frontier` package.
- Git: the learner runs git in their own project. The checks can use the existing `git-commits <min>` check kind and the "everything is pushed" check (`desktop/app/project-checks.cjs`). The agent still never runs git on this repo.
- About 4–5 lessons.

## After that: Chapter 2 needs figures

Chapter 2 (big-O, hashing, heaps, trees, graphs, floats) is where the owner wants visualisation of complexity. Lessons already support interactive figures: a ```` ```figure ```` fence with `name: <module>/<Export>`, `caption:` and one-line JSON `props:` (`src/labs/project-studio/figures.js`). The components live in `src/labs/project-studio/figures/*.jsx` and are registered in `figures/index.js` (see `aml.jsx` for examples). Add `figures/frontier.jsx` for this series, for example a growth-curve chart (n, n log n, n², measured points against theory), a hash-table bucket view, and a heap or tree you can step through. Check that `figures.test.jsx` still passes.
