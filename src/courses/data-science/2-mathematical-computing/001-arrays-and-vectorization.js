import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'b-01', slug: 'arrays-and-vectorization', track: 'B', order: 1,
  title: 'Arrays and Vectorization', subtitle: 'NumPy: Math on Whole Arrays',
  tags: ['numpy', 'array', 'vectorization', 'broadcasting', 'performance'],
  prereqs: ['a-13', 'a-14'], unlocks: ['b-02', 'b-03', 'b-04'],
  hook: {
    question: 'Why do data scientists compute on whole arrays instead of writing loops?',
    realWorldContext: 'A NumPy array lets one expression apply the same arithmetic to every number at once, running in fast compiled code. The price is that you must think in shapes: most array bugs are shape bugs, and some of them produce wrong answers without any error.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Explain how a NumPy array differs from a list. Translate a loop into one array expression and check they agree. Read an array\'s shape and use `axis` to summarise rows or columns. Predict the shape of a broadcast operation before running it — including the `(n,)` versus `(n, 1)` trap.',
        '**The smallest example.** The same operators mean different things for lists and arrays:',
        '| Expression | With a list `[1, 2, 3]` | With `np.array([1, 2, 3])` |\n|---|---|---|\n| `x * 2` | `[1, 2, 3, 1, 2, 3]` (repeat) | `[2, 4, 6]` (each item doubled) |\n| `x + x` | `[1, 2, 3, 1, 2, 3]` (join) | `[2, 4, 6]` (item by item) |\n| `x > 1` | TypeError | `[False, True, True]` |',
        'A list is a general container. An **array** is built for arithmetic: operators apply to every element, pairing elements by position. Doing an operation on all elements at once like this is called **vectorization**.',
      ),
      check(
        'With `a = np.array([1, 2])` and `b = np.array([3, 4])`, what is `a + b`?',
        ['[1, 2, 3, 4]', '[4, 6]', '10'],
        1,
        'Array `+` adds element by element: 1 + 3 and 2 + 4. The list version, `[1, 2] + [3, 4]`, would join them into `[1, 2, 3, 4]`.',
      ),
      notebook('Lists versus arrays', [
        demo(1, 'Stage 1 — Same operators, different meaning', [
          'Each pair applies one operator to a list and to an array holding the same numbers.',
        ], 'Predict every line from the table, then run. Then try list_ + 1 and read the error.', 'import numpy as np\nlist_ = [1, 2, 3]\narr = np.array([1, 2, 3])\nprint(list_ * 2, arr * 2)\nprint(list_ + list_, arr + arr)\nprint(arr > 1)', { expectOutput: ['[1, 2, 3, 1, 2, 3] [2 4 6]', '[1, 2, 3, 1, 2, 3] [2 4 6]', '[False  True  True]'] }),
        demo(2, 'Stage 2 — One type for the whole array', [
          'An array has one element type, its **dtype**. Mixing ints and floats gives a float array. Integer dtypes have a fixed size: `int32` holds values up to about 2.1 billion, and arithmetic past that limit **wraps around silently** instead of raising an error. The browser Python used here is 32-bit, so be alert to this with large counts; use `dtype=np.int64` or floats when values can be large.',
        ], 'Run and read each dtype. Why is the last result negative? Then change dtype=np.int32 to dtype=np.int64 and run again.', 'import numpy as np\nprint(np.array([1, 2, 3]).dtype.kind, np.array([1, 2.5]).dtype)\nbig = np.array([50000], dtype=np.int32)\nprint(big * 50000)   # 2.5 billion does not fit in int32', { expectOutput: ['i float64', '[-1794967296]'] }),
      ]),
      prose(
        '**From loops to array expressions.** Every vectorized expression has a loop it replaces. Knowing the pairs lets you check a vectorized version against a simple loop you trust:',
        '| Loop over a list | Array expression |\n|---|---|\n| `[x * 2 for x in xs]` | `arr * 2` |\n| `[x + y for x, y in zip(xs, ys)]` | `a + b` (same length) |\n| `sum(x ** 2 for x in xs)` | `(arr ** 2).sum()` |\n| `[x for x in xs if x > 3]` | `arr[arr > 3]` |\n| `sum(1 for x in xs if x > 3)` | `(arr > 3).sum()` |',
        'The last two use a **boolean mask**: `arr > 3` is an array of True/False, and `arr[mask]` keeps the elements where the mask is True. Summing a mask counts the Trues.',
      ),
      notebook('Loops and their vectorized versions', [
        demo(3, 'Stage 3 — Check vectorized against a loop', [
          'Each loop result is compared with its array expression. `np.allclose` compares arrays of floats with a small tolerance.',
        ], 'Run: every comparison should print True. Then add a pair of your own: the mean of the values above 2.', 'import numpy as np\nxs = [3, 1, 4, 1, 5]\narr = np.array(xs)\nprint([x * 2 for x in xs], arr * 2)\nprint(sum(x ** 2 for x in xs) == (arr ** 2).sum())\nprint([x for x in xs if x > 3], arr[arr > 3])\nprint(sum(1 for x in xs if x > 3) == (arr > 3).sum())', { expectOutput: ['[6, 2, 8, 2, 10] [ 6  2  8  2 10]', 'True', '[4, 5] [4 5]', 'True'] }),
        demo(4, 'Stage 4 — Why bother? Timing', [
          'The same sum of squares with a Python loop and with NumPy. Exact times depend on your computer, but the vectorized version is usually many times faster, because the loop runs in compiled code instead of the Python interpreter. Floats are used so the huge total cannot overflow.',
        ], 'Run twice; times vary. The totals must match.', 'import numpy as np, time\ndata = [float(i) for i in range(200_000)]\narr = np.array(data)\n\nstart = time.perf_counter()\ntotal_loop = 0.0\nfor x in data:\n    total_loop += x * x\nloop_s = time.perf_counter() - start\n\nstart = time.perf_counter()\ntotal_vec = (arr * arr).sum()\nvec_s = time.perf_counter() - start\n\nprint("same total:", np.isclose(total_loop, total_vec))\nprint(f"loop {loop_s*1000:.1f} ms, vectorized {vec_s*1000:.2f} ms")', { expectOutput: ['same total: True'] }),
      ]),
      prose(
        '**Shape and axes.** Arrays can have several dimensions. A table of 3 rows and 4 columns has **shape** `(3, 4)`: the number of rows first. Each dimension is an **axis**. Summaries take an `axis` argument that says which dimension to collapse:',
        '```text\nM = [[ 0,  1,  2,  3],     M.sum(axis=0) → [12, 15, 18, 21]   one value per column\n     [ 4,  5,  6,  7],     M.sum(axis=1) → [ 6, 22, 38]       one value per row\n     [ 8,  9, 10, 11]]     M.sum()       → 66                 one value overall\n```',
        '`axis=0` collapses the rows, leaving one result per column — for a data table with one row per observation and one column per feature, that gives per-feature summaries. `axis=1` collapses the columns, leaving one result per row.',
      ),
      check(
        '`M` has shape `(3, 4)`. What is the shape of `M.mean(axis=0)`?',
        ['(3,)', '(4,)', '(3, 4)'],
        1,
        'axis 0 (the 3 rows) is collapsed, leaving one mean for each of the 4 columns.',
      ),
      notebook('Shape and axes', [
        demo(5, 'Stage 5 — Shapes and axis summaries', [
          '`reshape` rearranges the same 12 numbers into 3 rows of 4.',
        ], 'Predict each printed shape and sum, then run. Then compute the mean of each row.', 'import numpy as np\nM = np.arange(12).reshape(3, 4)\nprint(M.shape, M.ndim)\nprint(M.sum(axis=0), M.sum(axis=0).shape)\nprint(M.sum(axis=1), M.sum(axis=1).shape)\nprint(M.sum())', { expectOutput: ['(3, 4) 2', '[12 15 18 21] (4,)', '[ 6 22 38] (3,)', '66'] }),
      ]),
      prose(
        '**Broadcasting.** Arrays of different shapes can still be combined, by a rule called **broadcasting**. Write the two shapes one above the other, **aligned on the right**, and compare each pair of dimensions: they must be equal, or one of them must be 1 (a missing dimension counts as 1). A size-1 dimension is then treated as if repeated to match — without copying data.',
        '| Shapes | Compare (right to left) | Result |\n|---|---|---|\n| `(3, 4)` and `(4,)` | 4 vs 4 ok; 3 vs missing ok | `(3, 4)`: the row is added to every row |\n| `(3, 4)` and `(3, 1)` | 4 vs 1 ok; 3 vs 3 ok | `(3, 4)`: each row gets its own value |\n| `(3, 4)` and `(3,)` | 4 vs 3 — **error** | ValueError |\n| `(3,)` and `(3, 1)` | 3 vs 1 ok; missing vs 3 ok | `(3, 3)` — **no error, but probably not what you meant** |',
        'The last row is the classic silent bug: a vector of 3 targets minus a column of 3 predictions gives a 3 × 3 table of every target minus every prediction, not 3 residuals. Any average of it is wrong, and nothing warns you.',
      ),
      check(
        '`y` has shape `(5,)` and `pred` has shape `(5, 1)`. What is the shape of `y - pred`?',
        ['(5,)', '(5, 1)', '(5, 5)', 'an error'],
        2,
        'Right-aligned: 5 vs 1 is fine, and the missing dimension vs 5 is fine, so both stretch to (5, 5). Flatten `pred` with `pred.ravel()` (or index `pred[:, 0]`) to get 5 residuals.',
      ),
      notebook('Broadcasting', [
        demo(6, 'Stage 6 — The right-aligned rule', [
          'The rows of the broadcasting table, in order.',
        ], 'Write the result shape (or "error") for each line before running. Then fix the last example so it gives 3 differences, using y_pred.ravel().', 'import numpy as np\nM = np.arange(12).reshape(3, 4)\nrow = np.array([10, 20, 30, 40])     # (4,)\ncol = np.array([[1], [2], [3]])      # (3, 1)\nprint((M + row).shape, (M * col).shape)\n\ntry:\n    M + np.array([1, 2, 3])          # (3, 4) with (3,)\nexcept ValueError as e:\n    print("ValueError:", e)\n\ny_true = np.array([1.0, 2.0, 3.0])          # (3,)\ny_pred = np.array([[1.5], [2.0], [2.5]])    # (3, 1)\nprint((y_true - y_pred).shape)               # silent (3, 3)', { expectOutput: ['(3, 4) (3, 4)', 'ValueError: operands could not be broadcast together', '(3, 3)'] }),
      ]),
      prose('**Practice.** Challenge 1 checks a vectorized computation against a loop. Challenge 2 makes a vectorized function safe for an edge case. Challenge 3 is a fresh shape task. Challenge 4 uses an axis.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Loop and vector agree', 'easy', {
          prompt: 'For the numbers 1 to 1000, compute the sum of their squares twice: loop_total with a for loop over range(1, 1001), and vec_total with one NumPy expression. They must agree with the formula n(n+1)(2n+1)/6.',
          instructions: 'Use `np.arange(1, 1001)` for the array. Square first, then sum.',
          code: 'import numpy as np\nloop_total = None\nvec_total = None',
          testCode: `expected = 1000 * 1001 * 2001 // 6
assert loop_total == expected, f"loop_total should be {expected}, got {loop_total}"
square_of_sum = np.arange(1, 1001).sum() ** 2   # computed the same (possibly overflowing) way
assert int(vec_total) not in (500500 ** 2, int(square_of_sum)), "That is the square of the sum. Square each element first, then sum: (arr ** 2).sum()"
assert int(vec_total) == expected, f"vec_total should be {expected}, got {vec_total}"
"SUCCESS: loop and vectorized versions agree: 333,833,500."`,
          hint: 'loop_total = 0\nfor i in range(1, 1001):\n    loop_total += i * i\nvec_total = (np.arange(1, 1001) ** 2).sum()',
          solution: 'import numpy as np\nloop_total = 0\nfor i in range(1, 1001):\n    loop_total += i * i\nvec_total = (np.arange(1, 1001) ** 2).sum()',
          misconceptions: [{ code: 'import numpy as np\nloop_total = 333833500\nvec_total = np.arange(1, 1001).sum() ** 2', feedback: 'That is the square of the sum' }],
        }),
        exercise(12, 2, 'Challenge 2 — Min-max scaling, safely', 'medium', {
          prompt: 'Write normalize(arr) returning (arr − min) / (max − min) with no loop. If every value is the same (max equals min), return an array of zeros of the same shape instead of dividing by zero.',
          instructions: 'Compute the spread first. `np.zeros_like(arr, dtype=float)` makes an array of zeros with arr\'s shape.',
          code: 'import numpy as np\n\ndef normalize(arr):\n    return (arr - arr.min()) / (arr.max() - arr.min())\n\nprint(normalize(np.array([10.0, 20.0, 30.0, 40.0, 50.0])))',
          testCode: `import numpy as np, warnings
assert np.allclose(normalize(np.array([10.0, 20.0, 30.0, 40.0, 50.0])), [0, 0.25, 0.5, 0.75, 1.0]), "Check the formula (x - min) / (max - min)"
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    flat = normalize(np.array([5.0, 5.0, 5.0]))
assert not np.isnan(flat).any(), "A constant array has max - min = 0, so the division gives nan. Return zeros when the spread is 0"
assert np.array_equal(flat, [0.0, 0.0, 0.0]), f"normalize of a constant array should be zeros, got {flat}"
"SUCCESS: scaling works, and a constant input no longer produces nan."`,
          hint: 'spread = arr.max() - arr.min()\nif spread == 0:\n    return np.zeros_like(arr, dtype=float)\nreturn (arr - arr.min()) / spread',
          solution: 'import numpy as np\n\ndef normalize(arr):\n    spread = arr.max() - arr.min()\n    if spread == 0:\n        return np.zeros_like(arr, dtype=float)\n    return (arr - arr.min()) / spread',
          misconceptions: [{ code: 'import numpy as np\ndef normalize(arr):\n    return (arr - arr.min()) / (arr.max() - arr.min())', feedback: 'Return zeros when the spread is 0' }],
        }),
        exercise(13, 3, 'Challenge 3 — Residuals with the right shape', 'medium', {
          prompt: 'A model returned its predictions as a column, shape (5, 1), but the targets y have shape (5,). First predict bad_shape, the shape of y - pred as written. Then compute residuals (y minus prediction, shape (5,)) and mse, their mean square.',
          instructions: 'Write bad_shape as a tuple before running anything. Then flatten pred with `.ravel()` before subtracting.',
          code: 'import numpy as np\ny = np.array([3.0, 5.0, 7.0, 9.0, 11.0])\npred = np.array([[2.5], [5.5], [7.0], [8.0], [11.5]])\n\nbad_shape = None\nresiduals = y - pred\nmse = (residuals ** 2).mean()',
          testCode: `import numpy as np
assert bad_shape == (5, 5), "Align (5,) and (5, 1) on the right: 5 vs 1 stretches, missing vs 5 stretches, giving (5, 5)"
assert residuals.shape != (5, 5), "residuals is a 5 x 5 table of every target minus every prediction. Flatten pred with pred.ravel() first"
assert residuals.shape == (5,), f"residuals should have shape (5,), got {residuals.shape}"
assert np.allclose(residuals, [0.5, -0.5, 0.0, 1.0, -0.5]), f"residuals should be y - prediction, got {residuals}"
assert abs(mse - 0.35) < 1e-9, f"mse should be 1.75 / 5 = 0.35, got {mse}"
"SUCCESS: 5 residuals and mse = 0.35 — not the mean of a 5 x 5 table."`,
          hint: 'bad_shape = (5, 5)\nresiduals = y - pred.ravel()',
          solution: 'import numpy as np\ny = np.array([3.0, 5.0, 7.0, 9.0, 11.0])\npred = np.array([[2.5], [5.5], [7.0], [8.0], [11.5]])\nbad_shape = (5, 5)\nresiduals = y - pred.ravel()\nmse = (residuals ** 2).mean()',
          misconceptions: [{ code: 'import numpy as np\ny = np.array([3.0, 5.0, 7.0, 9.0, 11.0])\npred = np.array([[2.5], [5.5], [7.0], [8.0], [11.5]])\nbad_shape = (5, 5)\nresiduals = y - pred\nmse = (residuals ** 2).mean()', feedback: 'Flatten pred with pred.ravel() first' }],
        }),
        exercise(14, 4, 'Challenge 4 — Per-feature means', 'medium', {
          prompt: 'X holds 4 observations (rows) of 3 features (columns). Compute feature_means, the mean of each column, and centered, X with each column\'s mean subtracted so every column has mean 0.',
          instructions: 'Which axis do you collapse to get one value per column? Then check the shapes line up for broadcasting when you subtract.',
          code: 'import numpy as np\nX = np.array([[1.0, 10.0, 100.0],\n              [2.0, 20.0, 300.0],\n              [3.0, 30.0, 200.0],\n              [6.0, 60.0, 400.0]])\nfeature_means = None\ncentered = None',
          testCode: `import numpy as np
assert feature_means is not None and np.shape(feature_means) != (4,), "That is one value per ROW (axis=1). Per-feature means collapse the rows: axis=0"
assert np.allclose(feature_means, [3.0, 30.0, 250.0]), f"feature_means should be [3, 30, 250], got {feature_means}"
assert centered.shape == (4, 3), "centered should keep X's shape (4, 3)"
assert np.allclose(centered.mean(axis=0), 0), "Each column of centered should have mean 0"
"SUCCESS: X.mean(axis=0) has shape (3,), which broadcasts across the 4 rows."`,
          hint: 'feature_means = X.mean(axis=0)\ncentered = X - feature_means',
          solution: 'import numpy as np\nX = np.array([[1.0, 10.0, 100.0], [2.0, 20.0, 300.0], [3.0, 30.0, 200.0], [6.0, 60.0, 400.0]])\nfeature_means = X.mean(axis=0)\ncentered = X - feature_means',
          misconceptions: [{ code: 'import numpy as np\nX = np.array([[1.0, 10.0, 100.0], [2.0, 20.0, 300.0], [3.0, 30.0, 200.0], [6.0, 60.0, 400.0]])\nfeature_means = X.mean(axis=1)\ncentered = X', feedback: 'collapse the rows: axis=0' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Array operators work element by element; list operators repeat and join.',
    'An array has one dtype; fixed-size integers wrap around silently past their limit.',
    'Every vectorized expression replaces a loop — check one against the other.',
    'Shape lists sizes per axis, rows first; axis=0 gives one result per column, axis=1 one per row.',
    'Broadcasting: align shapes on the right; each pair must match or contain a 1. (n,) with (n, 1) silently makes (n, n).',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'a = np.array([1, 2, 3]); b = a * 2 + 1. What is b?',
      options: ['[3, 5, 7]', '[2, 4, 6, 1]', '[1, 2, 3, 1, 2, 3, 1]'],
      correct: 0,
    },
    {
      id: 'q2', type: 'choice',
      text: 'What does a[a > 3] return for a = np.array([1, 4, 2, 5])?',
      options: ['[False, True, False, True]', '[4, 5] — the mask keeps elements where it is True', '2'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'X has shape (100, 5): 100 rows, 5 features. What shape is X.std(axis=0)?',
      options: ['(100,)', '(5,)', '(100, 5)'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'y has shape (10,) and p has shape (10, 1). Why is ((y - p) ** 2).mean() a bug?',
      options: [
        'It raises an error',
        'Broadcasting makes a (10, 10) table of every pairing, so the mean averages 100 wrong differences instead of 10 residuals',
        'Squaring is not allowed on arrays',
      ],
      correct: 1,
    },
  ],
}
