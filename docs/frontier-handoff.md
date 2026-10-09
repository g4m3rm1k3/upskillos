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

  The tool call's limit is 10 minutes, so as chapters are added, use `FRONTIER_KEEP=<scratch folder>` once, then `FRONTIER_START=<that folder> FRONTIER_FROM=<new lesson prefix>` to walk only the new lessons. The prefix is the lesson id with its track, for example `FRONTIER_FROM=frontier-engineering/01-04`. The test re-points the kept `.venv`'s `__editable__*.pth` at the new copy's `src`, since the kept one names a folder that no longer exists.
- Kept projects live in the session's scratchpad, so each session rebuilds one. Measured on 2026-10-09: Chapter 0 alone takes about 435 s (`FRONTIER_UNTIL=frontier-setup/00-03` with `FRONTIER_KEEP`), lessons 1.1–1.2 about 235 s and 1.3 about 240 s. So: one run for Chapter 0 with `FRONTIER_KEEP`, a second from it for 1.1–1.3 (`FRONTIER_UNTIL=frontier-engineering/01-03`) with another `FRONTIER_KEEP`, then walk only the new lessons from that.
- Git runs in the walkthrough's temporary project (Chapter 1 on), with the owner's global `user.name` and `user.email`. The walkthrough never runs `git config --global`, and the agent never runs git in this repository.
- A wrong answer can type the step's file after all with `typeFile: true` (lesson 1.3: "did not update the tests" types the script but leaves the tests alone).
- `projectChecks.test.js` (its stdin test) can time out at 5 s when the whole non-desktop suite runs at once. It passes on its own. It isn't a Frontier failure.
- Non-desktop Project Studio tests (format and registration, about 30 s):

  ```powershell
  npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"
  ```

## State of the project (what a learner has after the last written lesson)

After lesson 1.3 (walkthrough passing on 2026-10-09). Chapter 0's files are unchanged except as noted.

```text
frontier/                 a Git repository on branch main, clean; 1.1 made two commits, 1.2 and 1.3 one each (merged branches)
  .gitignore              .venv/, __pycache__/, .pytest_cache/, *.egg-info/, .mypy_cache/
  requirements.txt        mypy==2.4.0, numpy==2.5.3, pytest==9.1.1, torch==2.14.1
  textstats.py            the program: TOP_WORDS = 10, TOP_LETTERS = 5, print_top(title, counts, n),
                          print_report(path) (still a bare except: + sys.exit(), still prints as it
                          computes), main() under if __name__ == "__main__"
  data/sample.txt         the supplied text (100 words, 9 non-blank lines)
  tools/save_golden.py    runs textstats.py, writes tests/golden/sample.txt
  tools/check_test_catches.py   supplied; used only by lesson 1.1's check
  src/frontier/
    __init__.py, info.py, selfcheck.py   (Chapter 0)
    text.py               PUNCTUATION, count_lines, split_words, letters, tally(items: Iterable[str]),
                          top(counts, n), all type-hinted; mypy --strict passes
  tests/
    conftest.py           2 threads
    test_info.py, test_torch_info.py     (Chapter 0)
    golden/sample.txt     the report as given
    test_legacy_output.py learner-written: runs textstats.py on data/sample.txt, compares with the golden file
    test_pieces.py        -k lines, split, letters, tally, top (imports frontier.text)
    test_annotations.py   -k count, split, letters, tally, top (get_type_hints)
```

Taught so far, besides Chapter 0's list: git (`init -b main`, `status`, `add`, `commit -m`, `log --oneline`, `diff`, `restore`, `switch -c`, `branch`, `merge` and fast-forwards, `branch -d`); characterisation tests and golden files; seeing a test fail before trusting it; `subprocess.run` (`cwd`, `capture_output`, `text`, `check`); `pathlib.Path` (`__file__`, `resolve`, `parent`, `/`, `mkdir`, `read_text`, `write_text`, encoding); `__name__ == "__main__"`; constants; truthiness of strings; generator expressions and list comprehensions; `dict.get`; dictionary order; `max(key=)` and its tie rule; stable `sorted`; slicing `[:n]`; docstrings; editor rename (F2) and Replace All; type hints (`list[str]`, `dict[str, int]`, `tuple[str, int]`, `Iterable[str]` from `collections.abc`, variable hints); hints aren't enforced at run time; mypy `--strict`.

Not yet taught (don't use without teaching): dataclasses, `with open(...)`, exceptions as design (`raise`, narrow `except`, exit codes, stderr), `argparse`, GitHub and remotes, the debugger, profiling, NumPy beyond `default_rng`, `standard_normal`, `@`, `abs` and `max`.

## Next: lessons 1.4 and 1.5 (Chapter 1 · From Script to Software, `frontier-engineering`)

Lessons 1.1–1.3 are written: `01-01-pin-the-old-behaviour`, `01-02-small-functions-with-names`, `01-03-a-module-with-types`. Each lesson since 1.2 works on a branch and merges it into `main` at the end. Keep that habit, more briefly each time. Every step ends with `tests/test_legacy_output.py` passing: the report must not change.

**1.4 · A dataclass, and computing apart from printing** (planned):

- A `@dataclass` `TextStats` in `frontier/text.py`: lines, words, unique_words, longest_word, average_word_length, top_words and top_letters (`list[tuple[str, int]]`). Teach what the decorator writes for you (`__init__`, `__repr__`, `__eq__`), and that equality makes it easy to test.
- `analyse(text: str, top_words: int = 10, top_letters: int = 5) -> TextStats` prints nothing. `format_report(stats: TextStats) -> str` returns the exact report text. `print_report` becomes reading the file plus `print(format_report(analyse(text)))`. `print` adds the final newline, so `format_report` returns the text without it.
- `with open(path) as f:` replaces open/read/close. Keep the bare `except:` and the default encoding until 1.5, so the output really is unchanged.
- Tests: a provided test file comparing `analyse("...")` with a whole `TextStats(...)`. Mind the `-k` rule: a test name's leading word must not appear in the file's name. Your turn: `format_report`, checked by the characterisation test and a unit test.

**1.5 · Errors on purpose, and a real command** (planned):

- Replace the bare `except:` with narrow exceptions. Decide the behaviour on bad input on purpose, and say so in the lesson, because this *does* change it (never on the sample): a missing file prints `textstats: can't read <path>: <reason>` to **stderr** and exits with code 1. Empty text: `analyse` raises `ValueError("no words to count")` instead of crashing in `max` or with `ZeroDivisionError`. Read with `encoding="utf-8"`, and say why (the Windows default isn't UTF-8).
- `argparse` in a module such as `frontier/textstats_cli.py`: `frontier-textstats PATH [--top N] [--letters N]`, a `[project.scripts]` entry, then install again. argparse exits with code 2 on a usage error, which makes a good prediction.
- The characterisation test switches to running the command, `textstats.py` is deleted (`git rm`), and `tools/save_golden.py` runs the command too.
- GitHub: create an empty repository (on the website or with `gh repo create`), then `git remote add origin` and `git push -u origin main`. Checks: `git-remote origin` and `git-pushed`. In the walkthrough, `origin` is a bare repository in the temporary folder (`git init --bare`), so nothing reaches GitHub.

## After that: Chapter 2 needs figures

Chapter 2 (big-O, hashing, heaps, trees, graphs, floats) is where the owner wants visualisation of complexity. Lessons already support interactive figures: a ```` ```figure ```` fence with `name: <module>/<Export>`, `caption:` and one-line JSON `props:` (`src/labs/project-studio/figures.js`). The components live in `src/labs/project-studio/figures/*.jsx` and are registered in `figures/index.js` (see `aml.jsx` for examples). Add `figures/frontier.jsx` for this series, for example a growth-curve chart (n, n log n, n², measured points against theory), a hash-table bucket view, and a heap or tree you can step through. Check that `figures.test.jsx` still passes.
