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

## The teaching lint: run it on every lesson you write

`node scripts/lint-frontier-lessons.mjs` checks every Frontier lesson against the rules above (`src/labs/project-studio/frontierLint.js`), and `frontierLint.test.js` fails on any new problem. It catches:

- **size:** a step where the learner types more than 15 new lines. Lines the learner already has, in any file, don't count: moving or copying code isn't typing.
- **explain:** a step that types 3 or more lines with fewer than 20 words before the code (what's about to be typed, and why) or fewer than 15 after it (tracing what it did; a prediction counts).
- **taught:** a library call, attribute, built-in or Python feature (comprehension, generator expression, f-string, `lambda`, `with`, `try`, decorator, type hint …) in typed code, or in a Your turn's answer, that no prose up to that point names. A name counts as taught when earlier prose writes it in backticks; a feature counts when the prose names it ("generator expression"). **A hint isn't teaching**: teach it in a step before the Your turn. The learner's own names and the basics the plan assumes (`ASSUMED` in the lint) are exempt.
- **your-turn:** shows its code, or lacks a check or any of the nudge / concept / answer rungs.
- **predict:** a lesson with no prediction.

It counts and matches text, so it can't tell a good explanation from a bad one: it catches the visible failures (dumps, skipped explanations, things used before they're taught). The cold-reader audit after each chapter covers the rest.

`frontierLint.baseline.json` holds known problems that are allowed for now, and it is empty: the 10 problems the lint found in Chapters 0–1 when it was added were all fixed on 2026-10-12 (walkthrough passing afterwards). Keep it empty. If a problem ever has to wait, list it there; the test fails once it's fixed until the entry is deleted, so the list can only shrink.

The full walkthrough (Chapters 0–1) now takes about 9½ minutes, longer than the 590-second limit below, so run it with `--timeout 1800`.

## Walkthrough test: the traps found so far

- Wrong answers run on a copy of the project that **shares the real `.venv`** (a junction). The editable install in that `.venv` points at the real project's `src`, so the test puts the copy's `src` first on `PYTHONPATH`. That would also hide a missing install, so a wrong answer *about installing* sets `pythonPath: false`.
- A wrong answer must **never install into the shared `.venv`**. If it needs to install, it sets `copyVenv: true`.
- When one lesson fails partway, every later lesson fails with confusing errors (missing files). Fix the first failure and ignore the rest.
- Run it (about 8 minutes for Chapter 0; the first run downloads PyTorch):

  ```powershell
  node scripts/frontier-safe-run.mjs --timeout 590 --mem 4096 -- npx vitest run src/labs/project-studio/frontier.desktop.test.js
  ```

  The tool call's limit is 10 minutes, so as chapters are added, use `FRONTIER_KEEP=<scratch folder>` once, then `FRONTIER_START=<that folder> FRONTIER_FROM=<new lesson prefix>` to walk only the new lessons. The prefix is the lesson id with its track, for example `FRONTIER_FROM=frontier-engineering/01-04`. The test re-points the kept `.venv`'s `__editable__*.pth` at the new copy's `src`, since the kept one names a folder that no longer exists.
- Kept projects live in the session's scratchpad, so each session rebuilds one. Measured on 2026-10-09: Chapter 0 alone takes about 435 s (`FRONTIER_UNTIL=frontier-setup/00-03` with `FRONTIER_KEEP`), lessons 1.1–1.2 about 235 s and 1.3 about 240 s. So: one run for Chapter 0 with `FRONTIER_KEEP`, a second from it for 1.1–1.3 (`FRONTIER_UNTIL=frontier-engineering/01-03`) with another `FRONTIER_KEEP`, then walk only the new lessons from that.
- Git runs in the walkthrough's temporary project (Chapter 1 on), with the owner's global `user.name` and `user.email`. The walkthrough never runs `git config --global`, and the agent never runs git in this repository.
- A wrong answer can type the step's file after all with `typeFile: true` (lesson 1.3: "did not update the tests" types the script but leaves the tests alone).
- `projectChecks.test.js` (its stdin test) can time out at 5 s when the whole non-desktop suite runs at once. It passes on its own. It isn't a Frontier failure.
- Non-desktop Project Studio tests (format and registration, about 30 s):

  ```powershell
  npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"
  ```

- An `edit=<file> mode=replace` fence writes its code as the **whole** file. Frontier shows the whole file in a `file=` fence instead; the lint counts only the changed lines.
- A wrong answer has to change what the checks can see. "Stopped rounding the average" didn't: the sample's average word length is exactly 4.34, so the report is the same either way.
- Wrong answers may use `run` (for example `git rm` alone, or a merge without a push).
- `{BARE}` only works in `isolatedGit` series, and Frontier isn't one (it uses the owner's Git identity). Its stand-in for GitHub is made by the walkthrough itself: `git init -q --bare ../github.git` beside the project, in the run's temporary folder (lesson 1.5).

## State of the project (what a learner has after the last written lesson)

After lesson 1.5, the end of Chapter 1 (written 2026-10-12; walkthrough result in *Progress* in the plan). Chapter 0's files are unchanged except as noted.

```text
frontier/                 a Git repository on branch main, clean, pushed to GitHub (remote origin, main tracks origin/main)
  .gitignore              .venv/, __pycache__/, .pytest_cache/, *.egg-info/, .mypy_cache/
  requirements.txt        mypy==2.4.0, numpy==2.5.3, pytest==9.1.1, torch==2.14.1
  pyproject.toml          [project.scripts] frontier-info, frontier-textstats = "frontier.textstats_cli:main"
  data/sample.txt         the supplied text (100 words, 9 non-blank lines, average word length exactly 4.34)
  tools/save_golden.py    runs python -m frontier.textstats_cli, writes tests/golden/sample.txt
  src/frontier/
    __init__.py, info.py, selfcheck.py   (Chapter 0)
    text.py               PUNCTUATION, count_lines, split_words, letters, tally, top; @dataclass TextStats
                          (lines, words, unique_words, longest_word, average_word_length, top_words,
                          top_letters); analyse(text, top_words=10, top_letters=5) -> TextStats, raises
                          ValueError("no words to count"); mypy --strict passes on text.py and textstats_cli.py
                          (not on Chapter 0's info.py and selfcheck.py, never written for strict mode)
    textstats_cli.py      format_report(stats) -> str (no final newline), parse_args(argv) (argparse:
                          path, --top, --letters), main(argv=None): OSError / ValueError -> one line on
                          stderr, exit 1; usage errors exit 2
  tests/
    conftest.py, test_info.py, test_torch_info.py   (Chapter 0)
    golden/sample.txt     the report as given in 1.1
    test_legacy_output.py runs python -m frontier.textstats_cli on the sample, compares with the golden file
    test_pieces.py, test_annotations.py              (1.2, 1.3)
    test_stats.py         -k dataclass, analyse, report
    test_cli.py           -k empty, prints, options, missing, blank, usage (runs the module with subprocess)
```

`textstats.py` and `tools/check_test_catches.py` were removed with `git rm` in 1.5.

Taught so far, besides Chapter 0's list: git (`init -b main`, `status`, `add`, `commit -m`, `log --oneline`, `diff`, `restore`, `switch -c`, `branch`, `merge` and fast-forwards, `branch -d`, `rm`, `remote add`, `push -u`); GitHub (an empty repository, sign-in on first push); characterisation tests and golden files; seeing a test fail before trusting it; `subprocess.run` (`cwd`, `capture_output`, `text`, `check`, `returncode`, `stdout`, `stderr`); `pathlib.Path` (`__file__`, `resolve`, `parent`, `/`, `mkdir`, `read_text`, `write_text`, encoding); `__name__ == "__main__"`; constants; truthiness; f-strings; `join`; generator expressions and list comprehensions; `lambda` and `key=`; `dict.get`; dictionary order; `max(key=)` and its tie rule; stable `sorted`; slicing; `list.index`; docstrings; editor rename (F2), Replace All, project search (Ctrl+Shift+F); type hints (`list[str]`, `dict[str, int]`, `tuple[str, int]`, `Iterable[str]`, `X | None`, a class as a type), mypy `--strict`; decorators and `@dataclass` (`__init__`, `__repr__`, `__eq__`, fields); default parameter values; keyword arguments; `with` blocks and context managers; exceptions (`raise`, `ValueError`, narrow `except ... as error`, `OSError` and `strerror`, why a bare `except:` is wrong, tracebacks, failing fast); stdout vs stderr, `print(file=sys.stderr)`, exit codes 0 / 1 / 2, `sys.exit(1)`; `argparse` (positional, `--options`, `type=int`, `default`, `help`, `Namespace`, `parse_args(argv)`); `python -m module`; `encoding="utf-8"` and why; pytest fixtures `capsys` and `tmp_path`, `pytest.raises(match=)`.

Not yet taught (don't use without teaching): the debugger, profiling, `logging`, NumPy beyond `default_rng`, `standard_normal`, `@`, `abs` and `max`.

## Next: Chapter 2 (`frontier-cs`), figures first

Chapter 2 (big-O, hashing, heaps, trees, graphs, floats) is where the owner wants visualisation of complexity. Lessons already support interactive figures: a ```` ```figure ```` fence with `name: <module>/<Export>`, `caption:` and one-line JSON `props:` (`src/labs/project-studio/figures.js`). The components live in `src/labs/project-studio/figures/*.jsx` and are registered in `figures/index.js` (see `aml.jsx` for examples). Add `figures/frontier.jsx` for this series, for example a growth-curve chart (n, n log n, n², measured points against theory), a hash-table bucket view, and a heap or tree you can step through. Check that `figures.test.jsx` still passes.
