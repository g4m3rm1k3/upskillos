export default {
  // Was 'la8-001', the PCA lesson's id (chapter 8), by mistake. Other lessons already linked here
  // as 'la5-001'. Saved progress is copied over by the one-time split in
  // src/context/progressMigration.ts (src/data/lessonIdSplits.json).
  id: 'la5-001',
  slug: 'numpy-scipy-intro',
  chapter: 'la5',
  order: 1,
  title: 'Introduction to NumPy & SciPy for Linear Algebra',
  subtitle: 'The same math you have learned — now automated with the tools used at NASA, Google, and every data science team.',
  tags: ['numpy', 'scipy', 'python', 'coding', 'applied linear algebra', 'computational'],
  aliases: 'numpy scipy python linalg solve eig svd qr rank determinant matrix array broadcasting',

  hook: {
    question: "You can now solve 3×3 systems by hand. But a real power grid has 100,000 unknowns. How do engineers solve it?",
    realWorldContext: "NumPy (Numerical Python) and SciPy (Scientific Python) are the engines behind TensorFlow, PyTorch, scikit-learn, and virtually every modern scientific computation. They compile down to BLAS/LAPACK — the same Fortran libraries NASA used in the 1970s, now running at near-hardware speed. This lesson bridges your theoretical understanding to the professional tooling you will use every day.",
  },

  intuition: {
    prose: [
      '**Why code matters here:** Every concept in this course — RREF, eigenvalues, SVD, least squares — is a single function call in NumPy. The point of this lesson is not to skip the math but to solidify it. When you type `np.linalg.svd(A)` you should know exactly what $U$, $\\Sigma$, and $V$ mean and why they exist.',
      '**NumPy arrays vs. Python lists:** A Python list `[1, 2, 3]` is a general-purpose container. A NumPy `ndarray` is a typed, memory-contiguous block that supports SIMD vectorization. Operations like `A @ b` dispatch to BLAS, making even 1000×1000 matrix multiplications fast.',
      '**Broadcasting:** NumPy\'s most powerful concept. When you write `A * 2`, it multiplies every element by 2 without a loop. When shapes are compatible, NumPy automatically expands dimensions to make operations work. This is the same concept as scalar-matrix multiplication in linear algebra — fully generalized.',
      '**SciPy adds what NumPy leaves out:** `scipy.linalg` has routines like `lu_factor`, `lu_solve`, `cho_factor`, `cho_solve`, and `lstsq` that are optimized for specific matrix structures. You pick the right tool based on whether your matrix is symmetric, positive definite, banded, or sparse.',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'The NumPy ↔ Theory Translation Table',
        body: '| Theory | NumPy |\n|---|---|\n| $A\\mathbf{x}=\\mathbf{b}$ | `np.linalg.solve(A, b)` |\n| Eigenvalues $\\lambda$ | `np.linalg.eigvals(A)` |\n| Full eigen decomp | `np.linalg.eig(A)` |\n| SVD | `np.linalg.svd(A)` |\n| Rank | `np.linalg.matrix_rank(A)` |\n| Determinant | `np.linalg.det(A)` |\n| Inverse $A^{-1}$ | `np.linalg.inv(A)` |\n| Least squares | `np.linalg.lstsq(A, b)` |\n| QR | `np.linalg.qr(A)` |',
      },
      {
        type: 'sequencing',
        title: 'Chapter 8 — Computational Linear Algebra',
        body: '**Previous chapters:** All the theory — vectors, matrices, eigen, SVD, projections.\n**This chapter:** Python & OpenMAT implementations of every algorithm.\n**Future:** Markov chains, PCA, linear ODEs, signal processing.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'NumPy & SciPy: Linear Algebra Toolkit',
        mathBridge: 'Run each cell to see the Python equivalent of the theory. Every function name links back to a specific algorithm from earlier chapters.',
        caption: 'Full Python 3 environment via Pyodide WebAssembly.',
        initialProps: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'NumPy array fundamentals',
              prose: ['Create arrays, inspect shape, and perform element-wise vs. matrix operations. Note the difference between `*` (element-wise) and `@` (matrix product).'],
              code: `import numpy as np

# 1D vector and 2D matrix
v = np.array([1, 2, 3])
A = np.array([[4, -1, 0],
              [-1, 4, -1],
              [0, -1, 3]])

print("v shape:", v.shape)
print("A shape:", A.shape)
print("A @ v  =", A @ v)        # matrix-vector product
print("v * v  =", v * v)        # element-wise square
print("v.T @ v =", v @ v)       # dot product (v is 1D)`,
              status: 'idle',
            },
            {
              id: 2,
              cellTitle: 'Solving Ax = b (the workhorse)',
              prose: ['`np.linalg.solve` uses LU factorization internally. It is faster and more numerically stable than computing $A^{-1}b$. Only use `inv(A)` when you truly need the inverse matrix itself.'],
              code: `import numpy as np

A = np.array([[4., -1., 0.],
              [-1., 4., -1.],
              [0., -1., 3.]])
b = np.array([15., 10., 10.])

x = np.linalg.solve(A, b)
print("Solution x =", x)
print("Residual A@x - b =", A @ x - b)   # should be ~0

# NEVER do: x = np.linalg.inv(A) @ b  (slower, less stable)`,
              status: 'idle',
            },
            {
              id: 3,
              cellTitle: 'Eigenvalues and eigenvectors',
              prose: ['`eig` returns eigenvalues `vals` and a matrix `vecs` whose **columns** are the eigenvectors. Verify $Av = \\lambda v$ for the first pair.'],
              code: `import numpy as np

A = np.array([[6., 2.],
              [2., 3.]])

vals, vecs = np.linalg.eig(A)
print("Eigenvalues:", vals)
print("Eigenvectors (columns):\n", vecs)

# Verify A v1 = lambda1 * v1
v1 = vecs[:, 0]
print("A @ v1     =", A @ v1)
print("lambda1*v1 =", vals[0] * v1)`,
              status: 'idle',
            },
            {
              id: 4,
              cellTitle: 'Singular Value Decomposition',
              prose: ['SVD factors any matrix $A = U\\Sigma V^\\top$. The singular values on $\\Sigma$\'s diagonal tell you rank (how many are nonzero) and condition number (max/min ratio).'],
              code: `import numpy as np

A = np.array([[3., 1., 1.],
              [-1., 3., 1.]])

U, s, Vt = np.linalg.svd(A)
print("U =\n", U)
print("singular values =", s)
print("Vt =\n", Vt)
print("rank =", np.linalg.matrix_rank(A))
print("cond =", np.linalg.cond(A))

# Reconstruct A from its SVD
Sigma = np.zeros_like(A, dtype=float)
np.fill_diagonal(Sigma, s)
print("Reconstruction error:", np.linalg.norm(A - U @ Sigma @ Vt))`,
              status: 'idle',
            },
            {
              id: 5,
              cellTitle: 'QR and Least Squares',
              prose: ['`linalg.qr` returns the QR factorization. `linalg.lstsq` finds the best-fit solution to an overdetermined system — this is what regression is under the hood.'],
              code: `import numpy as np

# QR factorization
A = np.array([[1., 1.], [1., 2.], [1., 3.], [1., 4.]])
Q, R = np.linalg.qr(A)
print("Q =\n", Q)
print("R =\n", R)
print("Q.T @ Q (should be I):\n", np.round(Q.T @ Q, 6))

# Least squares fit to y = c0 + c1*x
y = np.array([1.1, 2.0, 2.9, 3.95])
coeffs, res, rank, sv = np.linalg.lstsq(A, y, rcond=None)
print("\nLeast squares coeffs:", coeffs)`,
              status: 'idle',
            },
          ]
        }
      },
      {
        id: 'OpenMatNotebook',
        title: 'OpenMAT: Same Algorithms, MATLAB Syntax',
        mathBridge: 'Run the same computations in OpenMAT\'s MATLAB-like syntax. Use the "Open in OpenMAT" button to explore further in the full studio.',
        caption: 'MATLAB-like cells using the in-browser mathjs engine.',
        initialProps: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Solve Ax = b',
              prose: ['Backslash operator A\\b is the OpenMAT/MATLAB idiom for solving linear systems.'],
              code: `A = [4 -1 0; -1 4 -1; 0 -1 3];
b = [15; 10; 10];
x = A \ b
residual = A*x - b`,
            },
            {
              id: 2,
              cellTitle: 'Eigenvalues, SVD, Rank',
              prose: ['OpenMAT uses the same function names as MATLAB: eig, svd, rank, cond.'],
              code: `A = [3 1 1; -1 3 1];
[U, S, V] = svd(A)
rank(A)
cond(A)

% Verify reconstruction
disp('Reconstruction error:')
norm(A - U*S*V')`,
            },
          ]
        }
      },
    ],
  },

  math: {
    prose: [
      '**Array shapes and the broadcasting rules.** In NumPy, a vector `v` of shape `(n,)` is neither a row nor a column vector — it is a 1D array. When you write `A @ v` where `A` is `(m, n)` and `v` is `(n,)`, NumPy treats `v` as a column, producing shape `(m,)`. When you write `v @ A`, it treats `v` as a row. To make this explicit, use `v.reshape(-1, 1)` for a column or `v.reshape(1, -1)` for a row.',
      '**LU vs. direct solve.** `np.linalg.solve(A, b)` computes the LU factorization once (with partial pivoting) and then solves two triangular systems. For the same matrix $A$ with many right-hand sides $b_1, b_2, \\ldots$, use `scipy.linalg.lu_factor(A)` once and `scipy.linalg.lu_solve(lu, bi)` for each $b_i$ — this reuses the factorization and is much faster.',
      '**SVD and low-rank approximations.** The thin SVD returned by `np.linalg.svd(A, full_matrices=False)` gives $U \\in \\mathbb{R}^{m \\times r}$, $\\Sigma \\in \\mathbb{R}^r$, $V^\\top \\in \\mathbb{R}^{r \\times n}$ where $r = \\min(m, n)$. A rank-$k$ approximation is $A_k = U[:, :k] \\cdot \\text{diag}(\\Sigma[:k]) \\cdot V[:k, :]$. This is the mathematical foundation of image compression and PCA.',
      '**Condition number and numerical stability.** `np.linalg.cond(A)` returns $\\kappa(A) = \\|A\\| \\|A^{-1}\\| = \\sigma_{\\max} / \\sigma_{\\min}$. If $\\kappa(A) \\approx 10^k$, you lose roughly $k$ digits of precision in the solution. $\\kappa > 10^{12}$ is typically too ill-conditioned to solve reliably in double precision.',
    ],
    callouts: [
      {
        type: 'warning',
        title: 'Never Invert a Matrix to Solve a System',
        body: 'Computing `np.linalg.inv(A) @ b` is both slower and less numerically stable than `np.linalg.solve(A, b)`. The `solve` function uses the same LU factorization but without explicitly forming $A^{-1}$. Only compute the inverse when you genuinely need the matrix $A^{-1}$ (e.g., to examine it or multiply by it multiple times with different vectors).',
      },
      {
        type: 'insight',
        title: 'scipy.linalg vs. numpy.linalg',
        body: '`scipy.linalg` generally supersedes `numpy.linalg` for serious work:\n- More factorizations: Cholesky, Schur, polar\n- Structured solvers: banded, triangular, Toeplitz\n- Better error messages\n- `scipy.sparse.linalg` for large sparse systems\n\nUse `numpy.linalg` for quick experiments; use `scipy.linalg` in production code.',
      },
    ],
    visualizations: [],
  },

  rigor: {
    prose: [
      '**Floating-point arithmetic.** All NumPy/SciPy computations use IEEE 754 double precision (64-bit floats). Machine epsilon is $\\varepsilon_{\\text{mach}} \\approx 2.2 \\times 10^{-16}$. This means `A @ np.linalg.inv(A)` will not be exactly the identity matrix — residuals on the order of $10^{-14}$ are normal and expected.',
      '**BLAS levels.** Linear algebra routines are classified by the ratio of arithmetic operations to memory reads: Level 1 (vector-vector, $O(n)$ ops), Level 2 (matrix-vector, $O(n^2)$), Level 3 (matrix-matrix, $O(n^3)$). High-performance libraries like OpenBLAS and Intel MKL optimize Level 3 operations to approach the theoretical peak of the hardware. NumPy links to these libraries, so `A @ B` for large matrices runs at near-hardware speed.',
    ],
    callouts: [
      {
        type: 'proof',
        title: 'Why solve is better than inv',
        body: 'Solving $A\\mathbf{x} = \\mathbf{b}$ via LU requires $O(n^3/3)$ multiplications for the factorization and $O(n^2)$ for the triangular solves.\n\nComputing $A^{-1}$ also costs $O(n^3)$ but with a larger constant (roughly $3\\times$ more work) and introduces additional rounding error at each step of the inversion algorithm.\n\nCondition: $\\|\\mathbf{x} - \\hat{\\mathbf{x}}\\| / \\|\\mathbf{x}\\| \\leq \\kappa(A) \\cdot \\varepsilon_{\\text{mach}}$ for both methods, but the constant hidden in the $\\leq$ is smaller for `solve`.',
      },
    ],
    visualizations: [],
  },

  walkthroughs: [
    {
      id: 'wt-la5-001-array-mechanics',
      title: 'From Python List to NumPy Array: What Changes and Why',
      prereqs: ['Python lists', 'Matrix multiplication'],
      problem: 'Trace through what happens when you write `A @ v` for a NumPy matrix and vector, and explain why `A * v` gives a different result.',
      steps: [
        {
          label: 'Create the array and inspect its shape',
          strategy: 'Before doing any operation, check the shape. NumPy shape is always `(rows, cols)` for 2D arrays. Shape mismatches are the most common NumPy error.',
          explanation: '`np.array([[1,2],[3,4]])` creates a 2D array with shape `(2,2)`. `np.array([5,6])` creates a 1D array with shape `(2,)` — not `(2,1)`. This distinction matters: `A @ v` works but `A @ v.reshape(2,1)` gives shape `(2,1)` not `(2,)`. NumPy 1D arrays are neither row nor column vectors until you say so.',
          math: 'A.\\text{shape} = (2,2),\\quad v.\\text{shape} = (2,)',
          gotcha: 'A 1D array `[5,6]` has shape `(2,)`, NOT `(1,2)` or `(2,1)`. NumPy treats it as a flat vector and silently broadcasts it to whichever shape the operation needs. This is convenient but hides bugs when you expect a specific orientation.',
        },
        {
          label: 'The `@` operator: matrix multiplication (dot product)',
          strategy: '`A @ v` dispatches to BLAS `dgemv` — a highly optimised matrix-vector multiply. It follows the rule: (m×n) @ (n,) → (m,).',
          explanation: '`A @ v` computes $A\\mathbf{v}$ exactly as defined in linear algebra: row 0 of $A$ dotted with $v$ gives output[0], row 1 dotted with $v$ gives output[1]. For `A=[[1,2],[3,4]]` and `v=[5,6]`: output[0] = 1×5+2×6 = 17, output[1] = 3×5+4×6 = 39.',
          math: 'A @ v = \\begin{bmatrix}1\\cdot5+2\\cdot6\\\\3\\cdot5+4\\cdot6\\end{bmatrix} = \\begin{bmatrix}17\\\\39\\end{bmatrix}',
        },
        {
          label: 'The `*` operator: element-wise multiplication',
          strategy: '`A * v` is NOT matrix multiplication. It broadcasts `v` across each ROW of `A` and multiplies element-by-element.',
          explanation: 'NumPy broadcasts `v=[5,6]` (shape `(2,)`) to match `A` shape `(2,2)` by treating it as `[[5,6],[5,6]]`. Then multiplies entry-by-entry: `[[1×5,2×6],[3×5,4×6]] = [[5,12],[15,24]]`. This is the Hadamard (entry-wise) product, not the matrix product.',
          math: 'A * v = \\begin{bmatrix}1\\cdot5&2\\cdot6\\\\3\\cdot5&4\\cdot6\\end{bmatrix} = \\begin{bmatrix}5&12\\\\15&24\\end{bmatrix}',
          gotcha: 'In MATLAB, `A * B` is matrix multiplication and `A .* B` is element-wise. NumPy reverses this: `*` is element-wise, `@` is matrix. Every MATLAB-to-Python port has this bug at least once.',
        },
        {
          label: 'Connect to theory: `A @ A.T` computes $AA^\\top$',
          strategy: '`A.T` is the transpose — no data is copied, just the strides change. So `A @ A.T` computes $AA^\\top$ and is always symmetric positive semidefinite.',
          explanation: '`A.T` returns a view (not a copy) of `A` with axes swapped. `A @ A.T` then gives the Gram matrix $AA^\\top$. For our example: eigenvalues of $AA^\\top$ are the squares of the singular values of $A$ — this is how NumPy\'s `svd` and `eigh` connect internally.',
          math: 'A @ A.T = AA^\\top = \\begin{bmatrix}5&11\\\\11&25\\end{bmatrix}',
        },
      ],
    },
    {
      id: 'wt-la5-001-solve-not-inv',
      title: 'Why `solve(A, b)` Beats `inv(A) @ b`',
      prereqs: ['LU factorization', 'Condition number', 'Triangular solves'],
      problem: 'Show that `np.linalg.solve(A, b)` and `np.linalg.inv(A) @ b` give the same mathematical answer, then explain why `solve` is always preferred in practice.',
      steps: [
        {
          label: 'What `inv(A) @ b` actually does (two passes)',
          strategy: 'Computing `inv(A)` requires forming an $n\\times n$ matrix of results. Then `@ b` multiplies each row by `b`. This is two $O(n^3)$ operations.',
          explanation: '`np.linalg.inv(A)` computes $A^{-1}$ by LU-factoring $A$ and then solving $n$ systems with $n$ different right-hand sides (one per column of $I$). That\'s $O(n^3)$ to factor plus $n \\times O(n^2)$ = $O(n^3)$ to back-solve. Then `@ b` is another $O(n^2)$. Total: $2\\times O(n^3)$.',
          math: '\\text{inv(A) @ b}: 2 \\times O(n^3)',
        },
        {
          label: 'What `solve(A, b)` actually does (one pass)',
          strategy: '`solve` LU-factors $A$ once ($O(n^3)$), then solves two triangular systems for $b$ ($O(n^2)$). It never forms $A^{-1}$ at all.',
          explanation: 'Internally: `np.linalg.solve(A, b)` calls LAPACK `dgesv`, which computes the LU factorization $PA = LU$ and then solves $L\\mathbf{y}=P\\mathbf{b}$ (forward substitution, $O(n^2)$) and $U\\mathbf{x}=\\mathbf{y}$ (back substitution, $O(n^2)$). Total: $O(n^3) + O(n^2) \\approx O(n^3)$ — half the work of `inv`.',
          math: '\\text{solve(A, b)}: O(n^3) + O(n^2)',
        },
        {
          label: 'The stability argument: `inv` accumulates more rounding error',
          strategy: 'Every arithmetic operation introduces a rounding error of size $\\varepsilon_{\\text{machine}} \\approx 10^{-16}$. More operations = more accumulated error. `inv` performs $\\sim 2n^3/3$ extra operations vs `solve`.',
          explanation: 'For an ill-conditioned matrix (large $\\kappa(A)$), the extra operations in forming $A^{-1}$ amplify rounding errors $\\kappa$ times more than necessary. With `solve`, the error in the solution is bounded by $\\kappa \\cdot \\varepsilon_{\\text{machine}}$. With `inv`, it can be $\\kappa^2 \\cdot \\varepsilon_{\\text{machine}}$ in the worst case.',
          math: '\\text{solve error} \\approx \\kappa \\varepsilon_{\\text{mach}};\\quad \\text{inv error} \\lesssim \\kappa^2 \\varepsilon_{\\text{mach}}',
          gotcha: 'The one valid use case for `inv(A)` is when you need to solve $AX = B$ for many different right-hand sides $B$ in non-sequential code (e.g., passing the inverse to another function). Even then, prefer `lu_factor` + `lu_solve` over `inv` — it\'s the same idea but explicit about what\'s happening.',
        },
      ],
    },
  ],

  examples: [
    {
      id: 'la8-001-ex1',
      title: 'Solving the Power Grid',
      problem: 'A 4-node DC power grid has the nodal admittance matrix $Y = \\begin{bmatrix} 3 & -1 & -1 & -1 \\\\ -1 & 3 & -1 & -1 \\\\ -1 & -1 & 3 & -1 \\\\ -1 & -1 & -1 & 3 \\end{bmatrix}$ and injection vector $\\mathbf{b} = [2, 0, -1, -1]^\\top$ (in per-unit). Solve for the voltage vector $\\mathbf{v}$.',
      solution: '```python\nimport numpy as np\nY = np.array([[3,-1,-1,-1],[-1,3,-1,-1],[-1,-1,3,-1],[-1,-1,-1,3]], dtype=float)\nb = np.array([2.,0.,-1.,-1.])\nv = np.linalg.solve(Y, b)\nprint(v)  # → [0.75, 0.25, -0.25, -0.75]\n```',
      steps: [
        'Set up $Y$ and $\\mathbf{b}$ as NumPy arrays.',
        'Call `np.linalg.solve(Y, b)` — LU factorization with partial pivoting runs in $O(n^3) = O(64)$ operations.',
        'Verify: `Y @ v - b` should be near zero (machine epsilon level).',
      ],
    },
    {
      id: 'la8-001-ex2',
      title: 'Image Compression via Rank-k SVD',
      problem: 'Given a 4×4 grayscale image matrix $A$, compute its SVD and form the best rank-2 approximation. What fraction of the Frobenius norm is captured?',
      solution: 'A rank-$k$ approximation $A_k = \\sum_{i=1}^k \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^\\top$ captures $(\\sum_{i=1}^k \\sigma_i^2) / (\\sum_{i=1}^r \\sigma_i^2)$ of the squared Frobenius norm (energy).',
      steps: [
        'Compute `U, s, Vt = np.linalg.svd(A, full_matrices=False)`.',
        'Form `A2 = U[:,:2] @ np.diag(s[:2]) @ Vt[:2,:]`.',
        'Compute `np.sum(s[:2]**2) / np.sum(s**2)` — the energy ratio.',
      ],
    },
  ],

  challenges: [
    {
      id: 'la8-001-ch1',
      title: 'Reuse LU for multiple RHS',
      difficulty: 'medium',
      challengeType: 'write',
      prompt: 'Use `scipy.linalg.lu_factor` and `scipy.linalg.lu_solve` to solve the system $A\\mathbf{x}_i = \\mathbf{b}_i$ for three different right-hand sides $\\mathbf{b}_1, \\mathbf{b}_2, \\mathbf{b}_3$ with a single factorization of $A$. Then verify each residual.',
      hint: 'Call `lu, piv = scipy.linalg.lu_factor(A)` once, then `scipy.linalg.lu_solve((lu, piv), b)` three times.',
    },
    {
      id: 'la8-001-ch2',
      title: 'Low-rank image approximation',
      difficulty: 'hard',
      challengeType: 'write',
      prompt: 'For the matrix $A = \\begin{bmatrix} 4&3&2&1\\\\3&4&3&2\\\\2&3&4&3\\\\1&2&3&4 \\end{bmatrix}$: (a) Compute the thin SVD. (b) Form the rank-1 and rank-2 approximations. (c) Plot the relative energy captured vs. rank. (d) Report the condition number.',
      hint: 'Use `np.linalg.svd(A, full_matrices=False)`. Energy captured = `np.cumsum(s**2) / np.sum(s**2)`.',
    },
  ],

  semantics: {
    core: [
      { symbol: '\\mathtt{np.linalg.solve}(A, b)', meaning: 'Solves Ax=b using LU factorization — faster and more numerically stable than computing inv(A) then multiplying' },
      { symbol: '\\mathtt{np.linalg.eig}(A)', meaning: 'Returns eigenvalues and eigenvectors of A; use eigh for symmetric matrices (guaranteed real, more efficient)' },
      { symbol: '\\mathtt{np.linalg.svd}(A)', meaning: 'Returns U, s, Vt where A = U @ diag(s) @ Vt; full_matrices=False gives the economy (thin) decomposition' },
      { symbol: '\\mathtt{np.linalg.cond}(A)', meaning: 'Condition number κ(A) = σ_max/σ_min — measures how much the solution amplifies input errors; cond > 1e12 means ill-conditioned' },
      { symbol: '\\mathtt{np.linalg.matrix\\_rank}(A)', meaning: 'Number of linearly independent rows/columns; uses SVD with a tolerance to identify near-zero singular values' },
    ],
    rulesOfThumb: [
      'Use solve(A, b) not inv(A) @ b — same math, half the work and better stability.',
      'Check cond(A) before trusting a solution; cond > 1/eps means answers may have no correct digits.',
      'svd with full_matrices=False is the economy form — columns of U match rows of Vt, size min(m,n).',
      'eigh is twice as fast as eig for symmetric matrices and always returns real eigenvalues.',
      'Singular values squared equal eigenvalues of AᵀA — the two decompositions are linked.',
    ],
  },
  spiral: {
    recoveryPoints: ['la3-001-eigenvectors', 'la4-004-svd'],
    futureLinks: ['la8-004-pca', 'la9-004-floating-point'],
  },
  mentalModel: [
    'Every theoretical operation you learned has a one-line NumPy equivalent.',
    'solve is faster and more stable than inv — use it for systems.',
    'Condition number measures how much the solution amplifies errors in b.',
    'SVD singular values measure the energy in each rank-1 direction.',
    'SciPy adds structured solvers that exploit matrix properties.',
  ],
  checkpoints: ['read-intuition', 'run-numpy-cells', 'verify-residuals'],
  assessment: { questions: [] },
  quiz: [
    {
      id: 'la8-001-q1',
      question: 'What does `np.linalg.solve(A, b)` do internally?',
      options: ['Computes A⁻¹ and multiplies by b', 'Performs LU factorization with partial pivoting then solves triangular systems', 'Uses the Gram-Schmidt process', 'Computes the SVD and uses the pseudoinverse'],
      answer: 1,
      explanation: 'np.linalg.solve uses LAPACK\'s dgesv, which computes the LU factorization PA=LU and then solves Ly=Pb, Ux=y — two triangular solves.'
    },
    {
      id: 'la8-001-q2',
      question: 'If the condition number κ(A) ≈ 10⁸ in double precision (which has ~16 significant digits), about how many correct digits do you expect in the solution?',
      options: ['16', '8', '24', '0'],
      answer: 1,
      explanation: 'You lose roughly log₁₀(κ) digits of precision. With κ≈10⁸ and 16 available digits, you expect roughly 16-8=8 reliable digits.'
    },
    {
      id: 'la8-001-q3',
      question: 'Which NumPy operation gives a matrix product (as opposed to element-wise multiplication)?',
      options: ['A * B', 'A @ B', 'A ** B', 'A / B'],
      answer: 1,
      explanation: 'The @ operator (PEP 465, Python 3.5+) is the matrix multiplication operator. A * B gives element-wise multiplication.'
    },
  ]
};
