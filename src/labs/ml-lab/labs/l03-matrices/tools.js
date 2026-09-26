import { MATH_LINKS } from '../../kit/mathLinks.js'
import { saveOpenMatDocument } from '../../kit/openmat.js'

// Tasks in OpenMAT, the app's MATLAB-style tool, on the same four builds as the lessons. Every value in the
// comparison tables was produced by running these exact scripts in OpenMAT (Chromium) and the lesson's
// cells in Python; packages/openmat/src/__tests__/engine.test.ts checks the matrix-product numbers.
export const MATVEC_SCRIPT = `% ML Lab 03.2 · Matrix multiplication is many dot products: the four builds from the lesson.
% OpenMAT uses MATLAB syntax. Python (NumPy) equivalents are in the comments.
% Rows of X are builds A, B, C, D; columns are ones (for the bias), size in GB, hundreds of files.
% Indexing starts at 1 here: X(3,2) is build C's size; in Python that is X[2, 1].
X = [1 1 1; 1 2 4; 1 3 2; 1 4 3]   % np.column_stack([np.ones(4), size, files])
w = [1; 2; 2]                      % [b; w1; w2]        np.array([1., 2., 2.])
C = X * diag(w)                    % contributions: column j times w(j)   X * w  (NumPy broadcasting)
yhat = X * w                       % predictions: one dot product per row   X @ w
sum(C, 2)                          % each row of C added up: the same numbers   (X * w).sum(axis=1)
X(3,:) * w                         % build C alone: row 3 times w   X[2] @ w
`

export const LSQ_SCRIPT = `% ML Lab 03.5 · Least squares is a projection: the four builds from the lesson.
% OpenMAT uses MATLAB syntax. Python (NumPy) equivalents are in the comments.
% Indexing starts at 1 here: X(2,3) is row 2, column 3; in Python that is X[1, 2].
gb    = [1; 2; 3; 4];            % size in GB          np.array([1., 2., 3., 4.])
files = [1; 4; 2; 3];            % hundreds of files   np.array([1., 4., 2., 3.])
y     = [6.2; 12.1; 12.8; 17.1]; % minutes             np.array([6.2, 12.1, 12.8, 17.1])
X = [ones(4,1) gb files]         % np.column_stack([np.ones(4), size, files])
w = X \\ y                        % least-squares weights: np.linalg.lstsq(X, y, rcond=None)[0]
yhat = X * w                     % predictions: X @ w   (* is the matrix product; .* is entry by entry)
r = y - yhat                     % residuals (the lesson's e = X @ w - y is -r)
X' * r                           % X.T @ r: one number per column, all zero up to rounding
`

const SYNTAX = 'OpenMAT writes a matrix row by row: spaces separate entries and `;` starts a new row. `*` is the matrix product (Python’s `@`) and `.*` multiplies entry by entry (Python’s `*`). Indexing starts at 1: `X(3,2)` is Python’s `X[2, 1]`. A column like `[1; 2; 2]` is stored and printed as a plain list, just as NumPy’s `np.array([1., 2., 2.])` has shape (3,).'

export const tools = {
  matvec: {
    toolName: 'OpenMAT',
    href: '/openmat',
    buttonLabel: 'Put this script in OpenMAT and open it in a new tab',
    prepare: () => saveOpenMatDocument('ml-lab-03-2-matrix-product.m', MATVEC_SCRIPT),
    title: 'The weighted sums, in OpenMAT',
    why: `The same four builds and weights w = [1, 2, 2], in a second tool with different notation. Seeing the contributions as their own table makes the row/column meaning concrete: **each row of X is one build, each column one input**, and a prediction is its row of contributions added up. ${SYNTAX}`,
    steps: [
      'Press the button: it saves the script as a new OpenMAT tab (your other OpenMAT scripts are not changed) and opens OpenMAT.',
      'Press **Run** (or Ctrl/Cmd + Enter). Read the results under **Console** or **Workspace**.',
      '`C = X * diag(w)` is the table of contributions: column j of X times weight j. Row 3 (build C) is `[1, 6, 4]`.',
      '`sum(C, 2)` adds up each row; `X * w` does the same in one product. Check that both give the predictions in the table below.',
      'Change `w` to `[0; 1; 1]` and run again: build B’s prediction becomes 6, as in the question above.',
    ],
    compare: [
      ['Build C’s contributions', '1×1, 3×2, 2×2 = 1, 6, 4', '`(X * w)[2]` → `[1. 6. 4.]`', '`C(3,:)` → `[1, 6, 4]`'],
      ['Build C’s prediction', '1 + 6 + 4 = 11', '`(X @ w)[2]` → `11.0`', '`X(3,:) * w` → `11`'],
      ['All four predictions', '5, 13, 11, 15', '`X @ w` → `[ 5. 13. 11. 15.]`', '`X * w` → `[5, 13, 11, 15]`'],
    ],
    after: `For the rule behind all of this — matrix multiplication as one dot product per row — see the Linear Algebra course’s lesson “${MATH_LINKS['la.matmul'].title}” under **Go deeper** at the top of this lesson.`,
  },
  lsq: {
    toolName: 'OpenMAT',
    href: '/openmat',
    buttonLabel: 'Put this script in OpenMAT and open it in a new tab',
    prepare: () => saveOpenMatDocument('ml-lab-03-5-least-squares.m', LSQ_SCRIPT),
    title: 'The least-squares fit, in OpenMAT',
    why: `OpenMAT solves the same problem with MATLAB’s backslash, \`X \\ y\`, which — like \`np.linalg.lstsq\` — solves least squares through a factorization of X instead of inverting XᵀX. The weights, predictions and residuals should agree with the Python above to the digits OpenMAT prints. ${SYNTAX}`,
    steps: [
      'Press the button: it saves the script as a new OpenMAT tab and opens OpenMAT. Your other OpenMAT scripts are not changed.',
      'Press **Run**. Compare `w`, `yhat` and `r` with the table below (Console or Workspace).',
      'The last line, `X\' * r`, is Python’s `X.T @ r`: one number per column. Expect values around 1e-14 — zero up to rounding, the orthogonality of this lesson.',
      'Change one measured time in `y` (say 12.8 to 14) and run again: `w` changes, but `X\' * r` is still zero. Orthogonality holds for any data; only the weights depend on it.',
    ],
    tolerance: 'to the digits OpenMAT prints; Xᵀ(y − ŷ) is zero up to rounding',
    compare: [
      ['Weights w*', 'solve XᵀXw = Xᵀy', '`[2.157143 2.928571 1.028571]`', '`w = [2.15714, 2.92857, 1.02857]`'],
      ['Predictions ŷ = Xw*', 'one dot product per row', '`[ 6.114286 12.128571 13. 16.957143]`', '`yhat = [6.11429, 12.1286, 13, 16.9571]`'],
      ['Residuals y − ŷ', 'y minus ŷ', '`[ 0.085714 -0.028571 -0.2 0.142857]`', '`r = [0.0857143, -0.0285714, -0.2, 0.142857]`'],
      ['Xᵀ(y − ŷ)', '0 in every column', 'about 1e-15', 'about 1e-14'],
    ],
  },
}
