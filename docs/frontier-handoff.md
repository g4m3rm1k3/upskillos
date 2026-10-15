# Frontier: session handoff

Start every Frontier writing session by reading this file, then the plan's chapter row for the chapter you're writing (`docs/frontier-ai-series-plan.md`). Don't re-read finished lessons unless a new one builds on their code: the *State of the project* section below says what exists.

At the end of a session, update this file (state, next steps, anything learned) and the plan's *Progress* table, then stop so the owner can clear the chat. **One whole chapter per session, then the handoff** (owner, 2026-10-14: a new session's ramp-up costs more than it saves to stop mid-chapter). A chapter's cold-reader audit is a session of its own, the one after the chapter is written, so it's read with fresh eyes.

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
- Kept projects in the session's scratchpad are lost when the session ends, so each session rebuilds one (about 26 minutes up to the end of Chapter 3). To stop that, point `FRONTIER_KEEP` at a folder outside the scratchpad and outside this repository (for example a `frontier-keep` folder beside it) and reuse it with `FRONTIER_START` next time (not yet tried). Measured on 2026-10-09: Chapter 0 alone takes about 435 s (`FRONTIER_UNTIL=frontier-setup/00-03` with `FRONTIER_KEEP`), lessons 1.1–1.2 about 235 s and 1.3 about 240 s. So: one run for Chapter 0 with `FRONTIER_KEEP`, a second from it for 1.1–1.3 (`FRONTIER_UNTIL=frontier-engineering/01-03`) with another `FRONTIER_KEEP`, then walk only the new lessons from that.
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

- **An `editFiles` match must not include a line ending** in a file git has checked out: on Windows, git rewrites it with `\r\n`, so a match on `'.mypy_cache/\n'` misses and the step fails before its checks run (4.5, 2026-10-14). Match the text alone (`'.mypy_cache/'` → `'.mypy_cache/\npictures/'`). The 0.2 and 1.3 `.gitignore` edits were changed the same way; for `\n` files the result is byte-for-byte the same, so they weren't re-walked. The 3.1 `breakpoint()\n` edits stay: the walkthrough writes `pairs.py` in that lesson, always with `\n`. The macOS scratch method can't catch this: only the Windows walk can.

## State of the project (what a learner has after the last written lesson)

After lesson 5.5 (written 2026-10-14; Chapter 5 complete), on top of the Chapter 4 tree below. No new packages.

```text
  src/frontier/
    guessing.py           guess_loss(w, data) (mean squared error); guess_slope(w, data) = 2 * (w - average)
    slopes.py             Function = Callable[[float], float]; nudge_slope(f, x, h=1e-6) (one way);
                          central_slope(f, x, h=1e-5) (both ways); slope_error(f, df, xs) (max |df - central|)
    chain.py              Piece = tuple[Function, Function]; forward(pieces, x) -> every value;
                          chain_slope(pieces, x) (reversed(range(len(pieces))), slope *= df(values[i]))
    gradients.py          Surface = Callable[[Vector], float]; partial(f, point, i, h=1e-5) (on .copy()s);
                          gradient(f, point, h=1e-5) -> np.array of partials
    descent.py            downhill(slope, start, rate, steps) -> list[float]; descend(grad, start, rate, steps) -> list[Vector]
  experiments/
    draw_loss.py          loss of 81 guesses (np.linspace) for 2, 3, 7: pictures/loss.png; "lowest loss 4.667 at w = 4.0"
    loss_slopes.py        slopes at 1, 4, 6: -6.000 / 0.000 / 4.000, and (5.2) "by rule" beside each
    nudge_sizes.py        x³ at 2, h = 1e-1 … 1e-15: one-way error (6h, then rounding) and both-ways error (h², best at 1e-5)
    slope_table.py        slopes of x², x³, x⁴ at 1, 2, 3 (the power rule)
    check_rules.py        three right rules "agrees", x³ with 3x "WRONG, largest gap 1.8e+01"
    inside.py             (3x + 1)² at 1: "whole 24.000, inside 3.000, outside at 4 8.000"
    backward_by_hand.py   times 3, plus 1, square from 1: values [1, 3, 4, 16], slopes backwards [24, 8, 8, 1]
    check_chain.py        square, ×3, +1, exp, square at 0.4: chain rule and nudged both 92.6303
    two_uses.py           (a + b) * b at (1, 2): along a 2.000, along b 5.000
    steepest.py           bowl x² + 10y² at (2, 1): gradient [4, 20]; rises along x 0.0401, y 0.2010, gradient's 0.2049
    roll_to_average.py    downhill from 0, rate 0.1: step 30 w = 3.9950
    learning_rates.py     rates 0.1 / 0.5 / 1.0 / 1.1: creep, land, bounce 0↔8, run off
    draw_descent.py       descend on the bowl from (-4, 1), rate 0.09, 30 steps, contour map: pictures/descent.png; height 0.000123
  tests/
    test_slopes.py        -k loss, nudge, central
    test_rules.py         -k error, guess
    test_chain.py         -k forward, backward
    test_many_inputs.py   -k partial, gradient
    test_walking.py       -k downhill, descend
```

Chapter 5 taught: parameters, loss, mean squared error, `**`; `np.linspace`; `ax.plot`, `ax.set_xlabel` / `set_ylabel`, `ax.contour` (contour lines, heights as a (len(ys), len(xs)) table), `marker="o"`; `min(zip(losses, ws))`; parabola; slope (rise over run), sign and size; forward difference and its error (≈ h × curvature), cancellation and rounding for tiny h; format specs `:<2`, `:.1e`, `:7.3f`; central difference (exact for parabolas, error ∝ h²); derivative, f′, df/dx; power rule (found by measuring, shown by algebra), constant, constant multiple and sum rules, e and `math.exp` as its own slope; gradient checking and its tolerance; the best guess under squared error is the average (slope = 0); the chain rule (outside slope at the inside's value × inside slope), pieces as (function, slope) pairs, forward pass keeping every value, backward pass multiplying (backpropagation named; Chapter 12 builds it), `reversed`, `*=`; partial derivatives (∂), nudging on `.copy()`s, two paths add (2.5's value used twice; Chapter 12's bug named), gradient ∇f, steepest ascent and its length, nudging's cost (two calls per input); gradient descent, learning rate, the factor 1 − 2 × rate (creep / land / bounce / diverge), `range(start, stop, step)`, `inf`/`nan` from a too-big rate, Chapter 18 named; descend on vectors without `-=`; `reshape(len(ys), 1)` as a column; the steepest direction setting the rate limit (zigzag). Figures `frontier/SlopeNudge` (5.1) and `frontier/DescentSteps` (5.5), rendered by figures.test.jsx, never seen in a browser.

After lesson 4.5 (written 2026-10-14; Chapter 4 complete), on top of the Chapter 3 tree below:

```text
  requirements.txt        also matplotlib==3.11.2 (first line, alphabetical)
  .gitignore              also pictures/
```


```text
  src/frontier/
    vectors.py            vocabulary (sorted set comprehension), count_vector(words, vocab) -> list[float] (tally),
                          dot (zip strict=True), length (math.sqrt), cosine (ValueError "a vector of zeros has no direction")
    arrays.py             Vector = npt.NDArray[np.float64]; cosine_array (float(norm(a) * norm(b)), float(a @ b) / lengths);
                          unit(v) -> v / size (ValueError on zeros)
    matrix.py             Matrix = npt.NDArray[np.float64]; text_vector(text, vocab) (unit of count_vector, unknown words left out);
                          text_matrix(texts) -> (matrix, vocab) (4.4: counts as one array, then unit_rows);
                          times_vector(m, v) (row @ v per row); times(a, b) (np.zeros, two loops, a[i] @ b[:, j]);
                          unit_rows(m) (norm axis=1 keepdims=True, np.any(lengths == 0) -> ValueError "a row of zeros");
                          center(m) = m - m.mean(axis=0)
    plots.py              from matplotlib.figure import Figure (no pyplot); heatmap(m, labels) (Figure(figsize=(6, 5),
                          layout="constrained"), add_subplot, imshow vmin 0 vmax 1, set_xticks/set_yticks(range, labels),
                          set_title "cosine similarity", colorbar); scatter(points, title) (figsize (5, 5), points[:, 0] / [:, 1])
  experiments/
    compare_sentences.py  four sentences vs the first: dot (:5.1f) and cosine (:.3f)
    array_basics.py       shape / dtype / v[0] / v[-1] / v[3:6] / v * 2 / v @ v / int64; a slice changing v, a .copy() not
    check_arrays.py       cosine_array vs cosine on 1000 default_rng(0) pairs of rng.random(100): "largest difference: ..."
    matrix_basics.py      2x3 matrix: shape, m[1], m[:, 2], m[1, 2], sum(axis=0) [5. 7. 9.], sum(axis=1)
    search_texts.py       five texts (3 animal, 2 stock market) vs "a cat on a mat": 0.401 / 0.134 / 0.714 / 0 / 0
    all_pairs.py          same texts: m (5, 18), m @ m.T rounded to 2 places, "by hand agrees: True"
    broadcasting.py       m * 10, + row (3,), + column (2, 1), + (2,) caught ValueError "could not be broadcast"
    keepdims.py           3x3 rows of length 5 / 10 / 2: flat (3,) vs kept (3, 1); lengths 0.721 4.045 1. vs 1. 1. 1.
    draw_similarity.py    heatmap of m @ m.T with labels cat/dog/chased/stock/markets -> pictures/similarity.png; "axes in the figure: 2"
    draw_centering.py     default_rng(0), 50 people = rng.random((50, 2)) * [40, 30] + [150, 50]; averages [171.2  67. ];
                          pictures/people.png and pictures/centered.png
  tests/
    test_vectors.py       -k vocabulary, counts, dot, length, cosine
    test_arrays.py        -k cosine, sizes, agreement, unit
    test_matrix.py        -k rows, question, product, multiply
    test_broadcasting.py  -k scale, center
    test_plots.py         -k heatmap, scatter (reads figures back: get_images, get_clim, get_xticklabels, collections[0].get_offsets)
```

Chapter 4 so far taught: vector, vocabulary, bag of words, set comprehension, `zip(strict=True)`, dot product (a · b in symbols), length ‖v‖ and Pythagoras, `math.sqrt`, the angle between arrows and its cosine (1 at 0°, 0 at 90°), cos θ = a · b / (‖a‖ ‖b‖), θ; `shape` (a one-item tuple `(7,)`), `dtype` (`float64`, `int64`, NumPy 2's default int everywhere), indexing `v[0]` / `v[-1]`, slicing, views and `.copy()`, `np.linalg.norm` (linalg, norm), `@` raising `ValueError` on mismatched sizes, `np.random.default_rng(seed)`, `rng.random(n)`, seeds, choosing a tolerance (well above rounding, well below a mistake), unit vectors (v / ‖v‖) and cosine as the dot of unit vectors. 4.3: matrix, shape `(rows, columns)`, `m[i]`, `m[:, j]`, `m[i, j]` (read and set), `axis=` (`sum(axis=0)` is one total per column), iterating a matrix gives rows, matrix times vector (each row dotted), matrix times matrix (entry i, j = row i of a · column j of b; columns of a = rows of b; answer (rows of a, columns of b)), `np.zeros((r, c))`, `np.allclose`, `.T` (transpose, a view), `np.round(x, 2)`; bag-of-words limits shown ("a"/"the" dominate; "market" ≠ "markets"), Chapter 29 named as the fix. 4.4: broadcasting rules (line up from the right; equal or 1; missing counts as 1; reused, not copied), a column `(n, 1)`, the error "operands could not be broadcast together", `keepdims=True` and the silent square-matrix bug, `lengths == 0` as a boolean array, `np.any`, `nan` from 0 / 0, refactor under existing tests, `.mean(axis=0)`, centering (Chapter 8 named), `-=` in place changes the caller's array. 4.5: Matplotlib (`Figure`, Axes, `add_subplot`, `imshow`, `vmin`/`vmax`, colour bar as its own Axes, `set_xticks(positions, labels)`, `set_title`, `savefig` with the format from the file ending, `layout="constrained"`, figsize in inches at 100 dpi), pyplot named and why it isn't used, `Path.mkdir(exist_ok=True)`, generated files in `.gitignore`, `Invoke-Item`, scatter plots, centering moves data without changing its shape. Figure `frontier/MatrixTimes` (4.3; click an answer entry to see its row and column; never seen in a browser yet, only rendered by figures.test.jsx).


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

Not yet taught (don't use without teaching): NumPy beyond the lists above (`reshape` only as `reshape(n, 1)`; no `argsort`, fancy indexing, `np.meshgrid`); Matplotlib beyond 5.5 (legends, several Axes in one figure, `set_aspect`, log scales, pyplot).

## Next: Chapter 5's audit (one session), then Chapter 6 (the session after)

Chapter 5 (`frontier-calculus`) is written (2026-10-14, on macOS). Lint 28 lessons, 0 problems; non-desktop Project Studio tests pass apart from the known macOS `projectChecks` git failure; the static `-k` rule checked by hand (0 problems).

1. **5.1 A Slope by Nudging**: `guessing.py` (`guess_loss`), `slopes.py` (`nudge_slope`, Your turn `central_slope`); `draw_loss.py`, `loss_slopes.py`, `nudge_sizes.py`; figure `frontier/SlopeNudge`. trackOrder 15.05.
2. **5.2 Slopes by Rule**: `slope_error`, Your turn `guess_slope`; `slope_table.py`, `check_rules.py`; `loss_slopes.py` gains a "by rule" column.
3. **5.3 The Chain Rule**: `chain.py` (`forward`, Your turn `chain_slope`); `inside.py`, `backward_by_hand.py`, `check_chain.py`.
4. **5.4 The Gradient**: `gradients.py` (`partial`, Your turn `gradient`); `two_uses.py`, `steepest.py`.
5. **5.5 Rolling Downhill**: `descent.py` (`downhill`, Your turn `descend`); `roll_to_average.py`, `learning_rates.py`, `draw_descent.py`; figure `frontier/DescentSteps`.

**Checked on macOS only.** `~/Testing/frontier-scratch/walk5.py` walked every lesson from the real walkthrough entries: each step's checks pass, each wrong answer fails its `fails` checks (git checks not run there), and each prediction's verify script prints its answer. **The Windows walkthrough hasn't run for Chapter 5.** On Windows: keep a project at the end of Chapter 4 (`FRONTIER_UNTIL=frontier-vectors/04-05`, `FRONTIER_KEEP`, background, `--timeout 1800`), then `FRONTIER_START=<kept> FRONTIER_FROM=frontier-calculus/05-01`. Every printed number the checks rely on is pure float arithmetic (the same on every IEEE machine) or rounded well clear of a boundary; `nudge_sizes.py`'s rows below 1e-8 are rounding and the lesson says they may differ, and no check reads them.

**Still for the owner, in the Studio:** look at 4.3's `MatrixTimes`, 5.1's `SlopeNudge` and 5.5's `DescentSteps` figures, and check that `Invoke-Item` opens 4.5's and 5.x's pictures.

**Next session:** Chapter 5's cold-reader audit only (`docs/audits/frontier-ch5-audit.md`). If it changes code, a check or an answer, re-walk the changed lessons with `walk5.py` (macOS; back up the scratch folder first) or the walkthrough (Windows).

**The session after:** Chapter 6 (`frontier-probability`), the whole chapter, then the handoff.

Lessons from writing Chapter 5:
- `-k` words collide **inside a file** too: `test_central_slope_default_nudge_is_accurate` was selected by `-k nudge`. The scratch walk caught it at once; the hand-run static rule (each `-k` word starts every name it selects) would have too.
- A wrong answer "did nothing" can't fail a mypy check on a file an earlier lesson already made pass (5.2's `slopes.py`): list only the test check.
- Don't print a value to more digits than two measurements agree on: the chain rule and `central_slope` differ in the 6th decimal of 92.63 (one part in a billion), so 5.3 prints 4.
- `10.0 ** -power` goes through the C library's `pow`, which may differ by one ulp between platforms; only rows dominated by truncation error (not rounding) are checked or quoted as fixed.
- Each experiment that repeats an earlier file's lines (`def bowl`, `fig = Figure(figsize=(6, 4) ...)`) costs no typed lines in the lint, so a long final experiment can still fit the 15-line limit.
- Measured (macOS, Python 3.13): forward-difference error for x³ at 2 is 6h down to h = 1e-8 (7.3e-8), then rounding (1.3 at 1e-15); central 1e-2 … 1e-8 for h = 1e-1 … 1e-4, best 2.1e-10 at 1e-5. Descent on x² + 10y² at rate 0.11 reaches y ≈ 237 after 30 steps.

Chapter 4's cold-reader audit is done (2026-10-14, `docs/audits/frontier-ch4-audit.md`): 6 findings, all fixed, prose plus one docstring in `answers/matrix-4.3.py`; no code, check or test behaviour changed, so nothing was re-walked.

Chapter 4 (`frontier-vectors`) is written and passes the walkthrough on Windows (2026-10-14: Chapters 0–3 with `FRONTIER_KEEP`, 23 tests, 1412 s; then 4.1–4.5 from that project, 10 tests, 494 s, peak about 681 MB):

1. **4.1 Words as Vectors**: `vectors.py` on lists; `compare_sentences.py` (dot 8 / 6 / 8 / 16, cosine 1.000 / 0.750 / 0.707 / 1.000); figure `frontier/WordArrows`.
2. **4.2 Arrays, Properly**: `arrays.py` (`Vector`, `cosine_array`, `unit`); `array_basics.py`, `check_arrays.py`.
3. **4.3 A Dataset as a Matrix**: `matrix.py` (`text_vector`, `text_matrix`, `times_vector`, Your turn `times`); `matrix_basics.py`, `search_texts.py`, `all_pairs.py`; figure `frontier/MatrixTimes`.
4. **4.4 Broadcasting**: `unit_rows`, `text_matrix` refactored onto it, Your turn `center`; `broadcasting.py`, `keepdims.py`.
5. **4.5 Seeing It**: Matplotlib 3.11.2 (Windows wheel 9.5 MB), `plots.py` (`heatmap`, Your turn `scatter`), `draw_similarity.py`, `draw_centering.py`; pictures checked by the files existing and by reading the figures back as data. Promises Chapter 5 that its curves are drawn with Matplotlib (`ax.plot` isn't taught yet: teach it there).

Lessons from Chapter 4's audit:
- Describe `axis=` one way across lessons: axis 0 adds the rows together (down each column), axis 1 works across each row. "Along the rows" meant opposite things in 4.3 and 4.4.
- Python 3.12+ `sum()` of floats compensates its rounding (measured: a plain loop doubles 4.2's largest difference). Don't explain a list-vs-NumPy difference as "left to right against blocks".
- Don't promise the next lesson a bigger scale than it uses ("a thousand texts" for a lesson with five).
- When supplied tests read results back through library methods, name every method in the test list, not only some.

Chapter 3 (`frontier-tools`) is written and audited: 3.1 finding a bug (pdb), 3.2 logging, 3.3 profiling and `functools.cache`, 3.4 vectorising with NumPy. Its cold-reader audit (2026-10-14, `docs/audits/frontier-ch3-audit.md`) found 7 problems, all prose, all fixed; lint 18 lessons, 0 problems; the walkthrough wasn't re-run (no code, check or answer changed).

Known unrelated failure (2026-10-14, on macOS): `projectChecks.test.js` › "git checks › follows a repository from init to push" fails at its first assertion (`git-repo` false right after `git init` in a temp folder). Not Frontier code. The owner's view: those checks are written for a new project folder (Windows, PowerShell), not this environment. Ignore it unless it fails on Windows too.

Working on macOS (2026-10-14 session):
- **The scratch project is kept** at `~/Testing/frontier-scratch` (outside this repository; its README says how to use it), up to date after 5.5. Walk new lessons with its `walk5.py`, which reads the real walkthrough entries. Reuse it; don't rebuild it. The walkthrough doesn't run, so each new lesson was checked by a scratch script: a `python3 -m venv` with the pinned `pytest`, `mypy` and `numpy`, the lesson's `file=` blocks written in order, each step's checks run (`PYTHONPATH=src`, `MYPYPATH=src`), and each wrong answer applied and its checks run. Set `PYTHONDONTWRITEBYTECODE=1`: rewriting a module within the same second let a stale `.pyc` make a wrong answer look like it passed.
- `scripts/frontier-safe-run.mjs` runs on macOS but reports peak memory as "about 0 MB", so its memory ceiling isn't measured there. Fine for tiny scripts; don't rely on it for anything bigger.

Lessons from Chapter 3's audit:
- Don't invite a learner to make a file in the project ("send the report to a file") in a lesson that ends with `git add .`: it gets committed.
- A Your turn's key technique (3.3's `dict(d)` copy) goes in the text before the hints, not only in `concept`.
- When a later lesson describes something an earlier one introduced differently (0.3's `@` as matrix multiplication, 3.4's `@` on two 1-D arrays), bridge the two explicitly.
- Do the arithmetic in passing claims (2 million operations at a billion a second is two thousandths, not one), and don't state a thin measured margin (0.067 s against 0.057 s) as a rule.

Chapter 2's audit (2026-10-13, `docs/audits/frontier-ch2-audit.md`) found 10 problems, all prose, all fixed. Lessons from it:
- Quote an error message only where it hasn't changed between Python versions. 3.14 rewrote the dict-key `TypeError` (`cannot use 'list' as a dict key (unhashable type: 'list')`); quote the shared tail or nothing.
- A Your turn requirement that, if missed, gives an unexplained error (2.2: `poly_hash` must sit above the class) belongs in the Build text, not only in a hint.
- Check measured claims against the measurements in this file ("hundreds" when the first rows were 70 and 75).

Lessons from writing Chapter 3:
- The Studio's terminal is a real one (xterm), and `run ... stdin="p counts\nc\n"` drives pdb: on 3.14 `breakpoint()` stops on its own line, and `(Pdb) {('the', 'cat'): 1}` is a checkable stdout.
- `git rm` refuses a file that was never committed ("did not match any files"); a learner deletes such a file with `Remove-Item`. The walkthrough caught this in 3.1.
- The static `-k` check (`walkSeries.js`) now reads every version of a test file: supplied, typed by the learner, or written by a walkthrough `files` answer (changed 2026-10-13; every walkSeries series' static check re-run, passing). Before, a learner-typed test file failed it.
- Under `python -m`, a module's `__name__` is `"__main__"`, so a log format with `%(name)s` would depend on how the command was started: 3.2's format leaves it out.
- NumPy 2.5's hints: `np.exp(array)` holds `dtype[Any]`, and dividing that by `np.sum(...)` is plain `Any`, which mypy `--strict` refuses to return. Annotate the result (`probabilities: npt.NDArray[np.float64] = ...`) and return that. A `float64` array divided by a Python `float` stays typed (`return v / size` passes; corrected 2026-10-14, 3.4's prose fixed to match). `float(np.sum(...))` and `float(xs @ xs)` pass.
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
