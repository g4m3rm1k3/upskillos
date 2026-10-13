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

After lesson 3.4 (written 2026-10-13; Chapter 3 complete; walkthrough result in *Progress* in the plan). Chapter 0's files are unchanged except as noted. Chapter 2 and 3 lessons don't use branches: each ends with `git add .`, `git commit`, `git push` (checks `git-clean`, `git-pushed`).

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
    bench.py              best_of(fn, repeats=5) -> float (fastest of perf_counter timings), ratios(times)
    growth.py             unique_by_list (O(n²)), unique_by_dict (O(n)), same order of first appearance
    hashing.py            letter_sum, poly_hash (h = h * 31 + ord(c)), WordSet(buckets=8, hash_fn=poly_hash):
                          bucket(word), add (grows to 2x buckets when size > buckets), grow, __contains__, __len__
    heap.py               parent, left, right, push (sift up), sift_down, pop_smallest, top_k(numbers, k) (all list[int];
                          push gives the same list as heapq.heappush)
    tree.py               @dataclass Node(label, children = field(default_factory=list)); count, depth, labels (pre-order)
    tictactoe.py          EMPTY, LINES, winner, moves, play, other, @cache count_games (255168 from EMPTY),
                          @cache shared_outcomes (dicts shared, never changed), outcomes -> a copy (dict(...))
    graph.py              visit(graph, node, done, visiting, result), order(graph) (graph: dict[str, list[str]], node ->
                          what it needs; depth-first; ValueError("cycle through ...") on a cycle)
    floats.py             close(a, b, tolerance=1e-9) (relative), softmax_naive (math.exp, overflows), softmax (max subtracted)
    pairs.py              PairCounts = dict[tuple[str, str], int]; count_pairs(words, counts=None) (both 3.1 bugs fixed)
    fast.py               sum_of_squares_loop, sum_of_squares_numpy (float(np.sum(xs * xs))), softmax_numpy
                          (npt.NDArray[np.float64]; the division's result annotated, else mypy sees Any)
    textstats_cli.py      (3.2) also: logger = logging.getLogger(__name__); --verbose (store_true); basicConfig(
                          level=INFO if verbose else WARNING, format="%(levelname)s: %(message)s") first in main;
                          INFO "reading %s", "%d words, %d different"; WARNING when --top > unique words (60 in the sample)
  experiments/
    first_tensors.py      (lesson 0.3)
    time_unique.py        list vs dict unique words for n = 1000..8000, prints ratios per version
    time_lookup.py        1000 lookups in list / WordSet / set, n = 1000..8000, prints longest bucket
    time_smallest.py      by_list (min/index/pop) vs by_heap, n = 1000..8000, prints ratios per version
    backward_order.py     order of (a + b) * b's graph, and its reverse ("gradients, in the order: ['e', 'c', 'b', 'a']")
    profile_games.py      cProfile.Profile() as a with block on count_games(); pstats strip_dirs, sort_stats("tottime"), print_stats(8)
    distinct_positions.py walks the game tree keeping a set of boards: "5478 different boards"
    time_squares.py       a million numbers: loop vs np.sum(xs * xs) vs xs @ xs, and the list -> array conversion
                          (experiments/pairs_bug.py was made and deleted in 3.1, never committed)
  tests/
    conftest.py, test_info.py, test_torch_info.py   (Chapter 0)
    golden/sample.txt     the report as given in 1.1
    test_legacy_output.py runs python -m frontier.textstats_cli on the sample, compares with the golden file
    test_pieces.py, test_annotations.py              (1.2, 1.3)
    test_stats.py         -k dataclass, analyse, report
    test_cli.py           -k empty, prints, options, missing, blank, usage (runs the module with subprocess)
    test_bench.py         -k best, ratios
    test_growth.py        -k list, dict
    test_hashing.py       -k letters, bucket, membership, grow, poly
    test_heap.py          -k positions, push, layout, sift, pops, largest
    test_tree.py          -k nodes, count, depth, labels
    test_tictactoe.py     -k winner, moves, games, outcomes
    test_graph.py         -k needs, shared, unlisted, cycles
    test_floats.py        -k close, textbook, stable
    test_pairs.py         typed by the learner: -k calls, last
    test_logging.py       -k quiet, verbose, warning (subprocess, like test_cli.py)
    test_cache.py         -k counting, outcomes (counts winner calls with monkeypatch; < 10000)
    test_fast.py          -k loop, numpy, softmax
```

`textstats.py` and `tools/check_test_catches.py` were removed with `git rm` in 1.5.

Taught so far, besides Chapter 0's list: git (`init -b main`, `status`, `add`, `commit -m`, `log --oneline`, `diff`, `restore`, `switch -c`, `branch`, `merge` and fast-forwards, `branch -d`, `rm`, `remote add`, `push -u`); GitHub (an empty repository, sign-in on first push); characterisation tests and golden files; seeing a test fail before trusting it; `subprocess.run` (`cwd`, `capture_output`, `text`, `check`, `returncode`, `stdout`, `stderr`); `pathlib.Path` (`__file__`, `resolve`, `parent`, `/`, `mkdir`, `read_text`, `write_text`, encoding); `__name__ == "__main__"`; constants; truthiness; f-strings; `join`; generator expressions and list comprehensions; `lambda` and `key=`; `dict.get`; dictionary order; `max(key=)` and its tie rule; stable `sorted`; slicing; `list.index`; docstrings; editor rename (F2), Replace All, project search (Ctrl+Shift+F); type hints (`list[str]`, `dict[str, int]`, `tuple[str, int]`, `Iterable[str]`, `X | None`, a class as a type), mypy `--strict`; decorators and `@dataclass` (`__init__`, `__repr__`, `__eq__`, fields); default parameter values; keyword arguments; `with` blocks and context managers; exceptions (`raise`, `ValueError`, narrow `except ... as error`, `OSError` and `strerror`, why a bare `except:` is wrong, tracebacks, failing fast); stdout vs stderr, `print(file=sys.stderr)`, exit codes 0 / 1 / 2, `sys.exit(1)`; `argparse` (positional, `--options`, `type=int`, `default`, `help`, `Namespace`, `parse_args(argv)`); `python -m module`; `encoding="utf-8"` and why; pytest fixtures `capsys` and `tmp_path`, `pytest.raises(match=)`.

Chapter 2 so far: `time.perf_counter`, `time.sleep`; functions as values, `Callable[[...], ...]`; `_` as a loop name; `-> None`; f-string format specs (`{n:>5}`, `{x:.5f}`); big-O (O(1), O(log n), O(n), O(n log n), O(n²)), dropping constants and smaller terms, the doubling test, a loop hidden in `in`; `ord`; `%` (remainder); hash functions, collisions, buckets, growing and amortised O(1); `__contains__`, `__len__`; a comprehension with two `for`s; the `[[]] * n` trap; Python's `hash()` and its per-run randomisation; why lists can't be keys (unhashable), tuples can; `//`; tuple assignment for swaps; heaps (sift up / down, O(log n)), `heapq` (`heappush`, `heappop`, `nlargest`), list `pop()` / `pop(i)`, `[::-1]`, tuples compare item by item; trees, root, leaf, recursion, base case, call stack, `RecursionError`; `dataclasses.field(default_factory=list)` and a quoted forward type `list["Node"]`; `max(..., default=0)`; `extend`; pre-order; `enumerate`; chained comparisons; conditional expressions (`a if c else b`); graphs, topological order, depth-first search, a done set and a visiting set (cycles), set `add` / `remove`; `graphlib.TopologicalSorter`; a gradient's backward order as the reversed topological order (preview of Chapter 12); floats: binary storage, sign / exponent / fraction, `decimal.Decimal` for the exact value, `1e20` notation, about 16 significant digits (`1e16 + 1 - 1e16` is 0.0), comparing with a relative tolerance and `math.isclose`, `math.exp`, `OverflowError`, underflow to 0.0, `ZeroDivisionError`, softmax and the max-subtraction fix (NumPy's silent `inf` / `nan` mentioned, not shown; log-sum-exp promised for Chapter 13; 16-bit floats for Chapter 41).

Chapter 3: debugging as a method (reproduce, narrow down, guess, test; a test per bug, seen failing first); `breakpoint()` and pdb (`p`, `n`, `c`, `w`, `q`); the mutable-default trap and a `None` default with `is None`; a type alias (`PairCounts = ...`); `logging` (`getLogger(__name__)`, levels debug / info / warning / error, `%s` / `%d` arguments, `basicConfig(level=, format=)` only at the entry point, stderr); argparse `action="store_true"`; PowerShell `> $null` and `Remove-Item`; `cProfile` and `pstats` (ncalls, tottime, cumtime, `549946/1`, `<genexpr>`); memoising with `functools.cache`, `cache_info`, `cache_clear`, a cached result being the same object (copy with `dict(...)`); reading source with `inspect.getsource`; pytest's `monkeypatch.setattr`; why a Python loop is slow (24-byte float objects, 8-byte addresses); NumPy arrays (`np.array`, element-wise `*` and `-`, `np.sum`, `np.exp`, `.max()`, `.tolist()`, `.nbytes`, `np.zeros`), `npt.NDArray[np.float64]`; a middle array's memory cost (`np.sum(xs * xs)` against `xs @ xs`); converting a list costs more than the loop.

Not yet taught (don't use without teaching): NumPy beyond that list (shapes, indexing, broadcasting rules, `reshape`, `axis=`), Matplotlib.

## Next: the cold-reader audit of Chapter 3, then Chapter 4

Chapter 3 (`frontier-tools`) is written: 3.1 finding a bug (pdb), 3.2 logging, 3.3 profiling and `functools.cache`, 3.4 vectorising with NumPy. Next session: the cold-reader audit of Chapter 3 (findings to `docs/audits/frontier-ch3-audit.md` as you go, then fix), then Chapter 4 (`frontier-vectors`). 3.4's last paragraph promises Chapter 4 "the mathematics, with vectors and matrices, and NumPy properly".

Chapter 2's audit (2026-10-13, `docs/audits/frontier-ch2-audit.md`) found 10 problems, all prose, all fixed. Lessons from it:
- Quote an error message only where it hasn't changed between Python versions. 3.14 rewrote the dict-key `TypeError` (`cannot use 'list' as a dict key (unhashable type: 'list')`); quote the shared tail or nothing.
- A Your turn requirement that, if missed, gives an unexplained error (2.2: `poly_hash` must sit above the class) belongs in the Build text, not only in a hint.
- Check measured claims against the measurements in this file ("hundreds" when the first rows were 70 and 75).

Lessons from writing Chapter 3:
- The Studio's terminal is a real one (xterm), and `run ... stdin="p counts\nc\n"` drives pdb: on 3.14 `breakpoint()` stops on its own line, and `(Pdb) {('the', 'cat'): 1}` is a checkable stdout.
- `git rm` refuses a file that was never committed ("did not match any files"); a learner deletes such a file with `Remove-Item`. The walkthrough caught this in 3.1.
- The static `-k` check (`walkSeries.js`) now reads every version of a test file: supplied, typed by the learner, or written by a walkthrough `files` answer (changed 2026-10-13; every walkSeries series' static check re-run, passing). Before, a learner-typed test file failed it.
- Under `python -m`, a module's `__name__` is `"__main__"`, so a log format with `%(name)s` would depend on how the command was started: 3.2's format leaves it out.
- NumPy 2.5's hints make `array / number` `Any`, and mypy `--strict` refuses to return it. Annotate the result (`probabilities: npt.NDArray[np.float64] = ...`) and return that. `float(np.sum(...))` and `float(xs @ xs)` pass.
- Measured 2026-10-13 (the walk's guard, 2 threads): a million-number loop 0.057 s; `np.sum(xs * xs)` about 17x faster, `xs @ xs` about 400x; `np.array(list)` 0.067 s. `count_games()` 1.6 s, cached 0.03 s; `winner` calls 549,946 -> 5,478 (`hits=10690, misses=5478`).
- `inspect.getsource(functools.lru_cache)` ends at `_lru_cache_wrapper`, which is C: don't claim the learner can read the store's code.
- Walking: Chapters 0–2 with `FRONTIER_UNTIL=frontier-cs/02-06` and `FRONTIER_KEEP` took 1218 s; then `FRONTIER_START=<kept> FRONTIER_FROM=frontier-tools/03-01` walked 3.1–3.4 in 326 s. Next session: keep a project at the end of Chapter 3 the same way (`FRONTIER_UNTIL=frontier-tools/03-04`, about 26 minutes in the background), then walk Chapter 4's lessons from it.

Figures: `src/labs/project-studio/figures/frontier.jsx` (registered as `frontier/` in `figures/index.js`) has `GrowthCurves` (2.1), `HashBuckets` (2.2), `HeapSteps` (2.3), `TreeCount` (2.4), `GraphOrder` (2.5) and `FloatBits` (2.6: a float's 64 bits and its exact stored value, computed with `BigInt`). `figures.test.jsx` now renders every Frontier figure placed in a lesson.

Lessons learned in this chapter:
- **One file per step**, provided test files included: `checks.test.js` fails a step with two `file=` blocks. Two supplied test files need two steps.
- A timing can't be a prediction (it depends on the machine). Predict an operation count instead: `verify/list_comparisons.py` counts `==` calls with a `str` subclass.
- Before claiming what an experiment shows, run it once in a scratch folder with plain Python (no ML libraries, so no guard needed). Measured 2026-10-13: with `letter_sum`, `time_lookup.py`'s longest bucket is 70 / 75 / 223 / 497 for n = 1000..8000 and the WordSet time climbs; with `poly_hash` it is 6–7 and the time is flat (about 0.0015 s); the list goes 0.010 → 0.147 s.
- `experiments/` has existed since lesson 0.3 (`first_tensors.py`): check the *State* tree before calling something new.
- `-k` words are substrings: `-k bucket` matched a test named `..._buckets_...`. The desktop test's static check catches it in seconds, before any walking.
- Resuming (`FRONTIER_START`) now also brings back the GitHub stand-in: `walkSeries.js` keeps `../github.git` as `<KEEP folder>.github.git` and restores it (fixed 2026-10-13; before that, a resumed `git push` failed). The scratchpad's kept projects don't survive the session, so rebuild them: Chapters 0–1 with `FRONTIER_UNTIL=frontier-engineering/01-05` and `FRONTIER_KEEP` take about 13 minutes (run it in the background with `--timeout 1800`), then 2.1–2.2 from that about 6.
- A "did nothing" wrong answer can't fail a mypy check on a file that already passes, or a push check when nothing new was committed. Use "committed but did not push" to test the push.
- Wrapping a `question:` or `explain:` in quotes isn't YAML here: the quotes show up. Write them bare.
- A test file read in the first step must not give away a later prediction's answer: 2.3's push test uses different numbers from the prediction, and 2.4's tests count games only from mid-game positions.
- Make a wrong answer actually differ: a `sift_down` test where the left child is the smaller one can't catch "always swapped with the left child". Run each wrong answer in your head against the test's own numbers.
- Edits to `frontier.walkthrough.js` made through a Python heredoc turned `\n` into real line breaks, which broke the file. The non-desktop tests don't import it, so run `node --check src/labs/project-studio/tracks/frontier.walkthrough.js` after editing it.
- Measured 2026-10-13: Chapters 0–2.2 with `FRONTIER_UNTIL=frontier-cs/02-02` and `FRONTIER_KEEP` take 891 s (run in the background, `--timeout 1800`); 2.3–2.5 from that took 306 s. `count_games()` from the empty board takes about 1.6 s.
- `sum([0.1] * 10)` is exactly `1.0` on the Python here (3.12+ sums floats with compensation), so it can't show rounding; 2.6 uses `0.1 + 0.2` and `1e16 + 1 - 1e16` instead. `ZeroDivisionError`'s message changed between versions: never quote it.
- Measured 2026-10-13: the full walkthrough, Chapters 0–2 (19 tests), takes 1171 s in one background run with `--timeout 1800`, peak about 780 MB. That's simpler than kept projects while it stays under 30 minutes.
