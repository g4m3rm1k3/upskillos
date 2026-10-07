# Matrices: a system in one object

Two equations in two unknowns can be solved by hand. A truss with forty members, a circuit with a hundred nodes or a factory plan with dozens of products cannot. Their equations have the same shape, though: each unknown is multiplied by a coefficient, the products are added, and the total must equal a known value. A **matrix** collects every coefficient into one rectangular table, so the whole system becomes a single equation, A x = b. This lesson introduces that notation, the matrix–vector product behind it, and Gaussian elimination, the systematic algorithm that solves A x = b for any number of unknowns. It also shows when a system cannot be solved, and how OpenMAT expresses the whole thing in one line.

This lesson covers:

- writing a linear system as A x = b;
- the matrix–vector product, as rows times x and as a combination of columns;
- a three-product production plan as a 3 × 3 system;
- Gaussian elimination and back substitution;
- singular matrices, the determinant and the rank;
- the same calculation in OpenMAT.

## A x = b

::: math
\[ A\mathbf{x} = \mathbf{b}, \qquad (A\mathbf{x})_i = \sum_{j=1}^{n} a_{ij}\,x_j, \qquad A\mathbf{x} = x_1 \mathbf{a}_1 + x_2 \mathbf{a}_2 + \dots + x_n \mathbf{a}_n \]
- $a_{ij}$: row $i$, column $j$; row $i$ holds equation $i$'s coefficients
- the product is also a combination of the columns $\mathbf{a}_j$, weighted by the $x_j$
In code: `matvec(A, x)` loops over rows; NumPy writes `A @ x`
:::


A system of m linear equations in n unknowns

\[ a_{11}x_1 + a_{12}x_2 + \dots + a_{1n}x_n = b_1, \quad \dots, \quad a_{m1}x_1 + \dots + a_{mn}x_n = b_m \]

is written as **A x = b**, where A is the m × n matrix of coefficients (row i holds equation i's coefficients, column j holds unknown j's), x is the column of unknowns and b the column of right-hand sides. The entry a_ij is in row i, column j.

The left side, A x, is the **matrix–vector product**. Its i-th entry multiplies row i of A by x element by element and adds the products, exactly the left-hand side of equation i. NumPy writes the product as `A @ x`. Predict before running: does the hand-written product agree with `@`?

```python type
import numpy as np

A = np.array([[2.0, 1, 3],
              [1, 2, 1],
              [3, 1, 2]])
x = np.array([10.0, 20, 15])

def matvec(A, x):
    rows, cols = A.shape
    out = np.zeros(rows)
    for i in range(rows):
        for j in range(cols):
            out[i] += A[i, j] * x[j]
    return out

print("row by row:", matvec(A, x), "  A @ x:", A @ x)
print("as columns:", x[0] * A[:, 0] + x[1] * A[:, 1] + x[2] * A[:, 2])
print("shape of A:", A.shape, " entry a_23 (row 2, column 3):", A[1, 2])
```

```output
row by row: [85. 65. 80.]   A @ x: [85. 65. 80.]
as columns: [85. 65. 80.]
shape of A: (3, 3)  entry a_23 (row 2, column 3): 1.0
```

NumPy counts rows and columns from 0, so the mathematical entry a₂₃ is `A[1, 2]`.

Both give (85, 65, 80). The third line shows a second, equally important reading: A x is a **combination of the columns** of A, with the entries of x as the weights. Solving A x = b therefore asks which combination of A's columns makes b. The linear algebra block builds on this column view.

## A production plan

::: math
\[ \begin{pmatrix} 2 & 1 & 3 \\ 1 & 2 & 1 \\ 3 & 1 & 2 \end{pmatrix} \begin{pmatrix} x_1 \\ x_2 \\ x_3 \end{pmatrix} = \begin{pmatrix} 85 \\ 65 \\ 80 \end{pmatrix} \]
- row $i$: hours each product needs on machine $i$; $b_i$: hours that machine has
- $x_j$: units of product $j$
In code: `np.linalg.solve(A, b)`, then `A @ plan` to check
:::


A workshop makes three products. Each unit needs time on three machines, in hours:

- product 1: lathe 2, mill 1, grinder 3;
- product 2: lathe 1, mill 2, grinder 1;
- product 3: lathe 3, mill 1, grinder 2.

This week the lathe has 85 hours, the mill 65 and the grinder 80. How many of each product use every machine fully? Each machine gives one equation; the coefficients of the lathe equation are the lathe hours per unit, which form the first **row** of A. That is exactly the A above, with b = (85, 65, 80). Predict before running: is the answer the x used above?

```python type
b = np.array([85.0, 65, 80])
plan = np.linalg.solve(A, b)
print("units of each product:", plan)
print("hours used per machine:", A @ plan, " available:", b)
b2 = np.array([90.0, 65, 80])
print("with 5 more lathe hours:", np.linalg.solve(A, b2).round(3))
```

```output
units of each product: [10. 20. 15.]
hours used per machine: [85. 65. 80.]  available: [85. 65. 80.]
with 5 more lathe hours: [ 8.125 19.375 18.125]
```

The plan is 10, 20 and 15 units, as expected, and it uses exactly the available hours. Five extra lathe hours change the answer to fractional units, including fewer of product 1. Real production planning also needs whole numbers and non-negative quantities; with more products than machines it becomes **optimisation**, which arrives in a later block. The linear system is still at its heart.

## Gaussian elimination

::: math
\[ R_i \leftarrow R_i - \frac{m_{ik}}{m_{kk}}\,R_k \;\;(i > k), \qquad x_i = \frac{b_i - \sum_{j > i} u_{ij} x_j}{u_{ii}} \]
- elimination zeroes column $k$ below the pivot $m_{kk}$, leaving an upper triangular matrix $U$
- back substitution solves the last row first, then works upwards
In code: `gauss_solve(A, b)` pivots with `np.argmax(np.abs(M[k:, k]))`, eliminates, then back-substitutes
:::


The algorithm behind `np.linalg.solve` is **Gaussian elimination**, the elimination of the previous lesson applied systematically. Work on the **augmented matrix** [A | b], the coefficients with the right-hand side as an extra column:

1. For each column k in turn, choose a **pivot** row: the row at or below k with the largest entry in column k (in absolute value). Swap it into row k. This is **partial pivoting**, which avoids dividing by zero or by tiny numbers.
2. For every row below k, subtract the multiple of row k that makes its column-k entry zero.
3. When every column is done, the matrix is **upper triangular**: zeros below the diagonal. The last equation has one unknown; solve it, substitute upwards, and solve each earlier equation for its one new unknown. This is **back substitution**.

Row operations (swapping rows, subtracting a multiple of one row from another) do not change the solutions, because each one turns true equations into true equations and can be undone. Predict before running: what does the triangular matrix look like for the production system?

```python type
def gauss_solve(A, b, show=False):
    M = np.column_stack([np.array(A, dtype=float), np.array(b, dtype=float)])
    n = len(M)
    for k in range(n):
        p = k + np.argmax(np.abs(M[k:, k]))
        M[[k, p]] = M[[p, k]]
        for i in range(k + 1, n):
            M[i] -= M[i, k] / M[k, k] * M[k]
    if show:
        print("upper triangular [U | c]:\n", M.round(4))
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (M[i, n] - M[i, i + 1:n] @ x[i + 1:]) / M[i, i]
    return x

print("solution:", gauss_solve(A, b, show=True))
```

```output
upper triangular [U | c]:
 [[ 3.      1.      2.     80.    ]
 [ 0.      1.6667  0.3333 38.3333]
 [ 0.      0.      1.6    24.    ]]
solution: [10. 20. 15.]
```

`M[[k, p]] = M[[p, k]]` swaps rows k and p. In back substitution, `M[i, i+1:n] @ x[i+1:]` adds up the terms of row i whose unknowns are already known.

Pivoting moves the row with the 3 to the top; after elimination every entry below the diagonal is zero (up to rounding), and back substitution recovers 10, 20 and 15. For n equations the elimination costs about n³/3 multiplications, so doubling the size makes the work eight times larger: a million-unknown system needs sparse methods that exploit mostly-zero matrices, a topic for the numerical block.

## Singular systems

::: math
\[ \det A = 0 \;\Longleftrightarrow\; \operatorname{rank} A < n \;\Longleftrightarrow\; A\mathbf{x} = \mathbf{b} \text{ has no unique solution} \]
- singular: one row or column is a combination of the others
- condition number $\kappa(A)$: around $10^{16}$ means singular to float precision
In code: `np.linalg.matrix_rank(S)` and `np.linalg.cond(S)`; do not trust `det` or `solve` alone
:::


When A's rows are not independent (one equation is a combination of the others), elimination produces a row of zeros in A: the system has no solution or infinitely many, like parallel lines in 2D. Such a matrix is **singular**. Two numbers detect it:

- the **determinant** det(A) is zero, the n-dimensional version of a₁b₂ − a₂b₁;
- the **rank**, the number of independent rows, is less than n.

In floating point the determinant of a singular matrix usually comes out as a tiny number, not exactly zero, and its size depends on the scale of the entries, so the rank (computed with a tolerance) or the condition number is the reliable test. Predict before running: if product 3's machine times were the sum of products 1 and 2, what would the solver say?

```python type
S = A.copy()
S[:, 2] = S[:, 0] + S[:, 1]
print("columns:\n", S)
print("det:", np.linalg.det(S), "  rank:", np.linalg.matrix_rank(S), "  condition number:", f"{np.linalg.cond(S):.1e}")
try:
    x_bad = np.linalg.solve(S, b)
    print("solve returned", x_bad, " residual", S @ x_bad - b)
except np.linalg.LinAlgError as err:
    print("solve refused:", err)
print("the original: det", round(np.linalg.det(A), 6), " rank", np.linalg.matrix_rank(A))
```

```output
columns:
 [[2. 1. 3.]
 [1. 2. 3.]
 [3. 1. 4.]]
det: -5.551115123125802e-16   rank: 2   condition number: 8.9e+16
solve returned [-2.16172782e+17 -2.16172782e+17  2.16172782e+17]  residual [43. 63. 48.]
the original: det -8.0  rank 3
```

If product 3 takes exactly the machine time of one product 1 plus one product 2, then any plan can swap one product 3 for one of each of the others and use the same hours. Hours alone cannot determine the plan. The determinant comes out as a rounding-sized number instead of exactly 0, the rank is 2, and the condition number is around 10¹⁶, the float precision limit. What `solve` does next depends on the build: some NumPy builds raise `LinAlgError`, while the one in this browser divides by a rounding-sized pivot and returns numbers around 10¹⁷ that do not even satisfy the equations: the residual is tens of hours. That is why a singularity check must not rely on the solver complaining. The original matrix has determinant −8 and rank 3.

## The same system in OpenMAT

::: math
\[ \mathbf{x} = A^{-1}\mathbf{b}, \qquad \text{residual } A\mathbf{x} - \mathbf{b} = \mathbf{0} \]
- OpenMAT writes the solve as a left division, without forming $A^{-1}$
- a residual of zeros confirms the plan
In code: `plan = A \ b`, then `check = A * plan - b`
:::


MATLAB-style notation was designed for exactly this. A matrix literal lists rows separated by semicolons, `A \ b` solves the system, and `det` and `rank` work as in NumPy. The cell runs on its own, sharing no variables with the Python cells. Predict before running: does OpenMAT find the same plan and the same determinant?

```openmat
A = [2 1 3; 1 2 1; 3 1 2];
b = [85; 65; 80];
plan = A \ b
d = det(A)
r = rank(A)
check = A * plan - b
```

`A * plan` is the matrix–vector product; in MATLAB-style notation `*` means the matrix product, and `.*` means element-by-element multiplication.

OpenMAT gives the same plan (10, 20, 15), determinant −8 and rank 3, and the check is zero to rounding. The Python code needed `np.array`, `np.linalg.solve` and `@`; the OpenMAT version reads almost like the mathematics. For the matrix-heavy lessons ahead, the lessons work in Python and show OpenMAT alongside where the notation helps.

::: challenge Matrix times vector [easy]
Write your own `matvec(A, x)` (it replaces the demo's version) that computes A x for a matrix given as a list of rows (lists of numbers) and a vector given as a list, returning a list of plain floats, using only loops and arithmetic: no NumPy. Raise `ValueError` if a row's length differs from the length of x, or if the rows have different lengths. Then write `residual(A, x, b)`, the largest absolute value of A x − b, as a float, using your `matvec`.

```python starter
def matvec(A, x):
    return [0.0 for row in A]

def residual(A, x, b):
    return 0.0

print(matvec([[2, 1, 3], [1, 2, 1], [3, 1, 2]], [10, 20, 15]))
```

```python solution
def matvec(A, x):
    if any(len(row) != len(x) for row in A):
        raise ValueError("every row must have one entry per unknown")
    return [float(sum(a * xi for a, xi in zip(row, x))) for row in A]

def residual(A, x, b):
    return float(max(abs(v - bi) for v, bi in zip(matvec(A, x), b)))

print(matvec([[2, 1, 3], [1, 2, 1], [3, 1, 2]], [10, 20, 15]))
```

```python test
import ast as _ast
for _n in ["matvec", "residual"]:
    assert _n in dir(), f"Define {_n}."
assert "def matvec" in _source, "Write your own matvec; the demo's version expects NumPy arrays."
_mods = {_x.value.id for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.Attribute) and isinstance(_x.value, _ast.Name)}
assert "np" not in _mods and "numpy" not in _mods and not any(isinstance(_x, _ast.MatMult) for _x in _ast.walk(_ast.parse(_source))), "Use loops and arithmetic, not NumPy or @."
assert matvec([[2, 1, 3], [1, 2, 1], [3, 1, 2]], [10, 20, 15]) == [85.0, 65.0, 80.0], "The production plan."
assert all(type(_v) is float for _v in matvec([[1, 2]], [3, 4])), "Return plain floats."
assert matvec([[1, 2]], [3, 4]) == [11.0] and matvec([[1], [2], [3]], [5]) == [5.0, 10.0, 15.0], "Non-square matrices."
for _bad in [([[1, 2], [3]], [1, 1]), ([[1, 2, 3]], [1, 1])]:
    try:
        matvec(*_bad)
        assert False, f"matvec{_bad} should raise ValueError."
    except ValueError:
        pass
assert residual([[2, 1, 3], [1, 2, 1], [3, 1, 2]], [10, 20, 15], [85, 65, 80]) == 0.0, "An exact solution has zero residual."
assert residual([[1, 0], [0, 1]], [1, 2], [1.5, 1]) == 1.0 and type(residual([[1]], [1], [1])) is float, "The largest absolute difference, as a float."
"SUCCESS: Row i of A dotted with x gives equation i's left-hand side; the residual says how well x satisfies all of them."
```

Hint: For each row, `sum(a * xi for a, xi in zip(row, x))`. For the residual, compare each entry of `matvec(A, x)` with b and take the largest absolute difference.
:::

::: challenge Triangular systems [medium]
Elimination ends with a triangular system, which is solved one unknown at a time. Write `back_substitute(U, c)` for an upper triangular n × n NumPy array U (zeros below the diagonal), solving from the last row upwards, and `forward_substitute(L, c)` for a lower triangular L (zeros above the diagonal), solving from the first row downwards. Both return NumPy arrays of floats and raise `ValueError` if any diagonal entry is exactly zero. Do not use `np.linalg`. Inputs may be lists or arrays.

```python starter
def back_substitute(U, c):
    return np.zeros(len(c))

def forward_substitute(L, c):
    return np.zeros(len(c))

print(back_substitute([[2, 1, 1], [0, 3, 2], [0, 0, 4]], [9, 13, 8]))
```

```python solution
def back_substitute(U, c):
    U, c = np.asarray(U, dtype=float), np.asarray(c, dtype=float)
    n = len(c)
    if np.any(np.diag(U) == 0):
        raise ValueError("a zero on the diagonal: no unique solution")
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (c[i] - U[i, i + 1:] @ x[i + 1:]) / U[i, i]
    return x

def forward_substitute(L, c):
    L, c = np.asarray(L, dtype=float), np.asarray(c, dtype=float)
    n = len(c)
    if np.any(np.diag(L) == 0):
        raise ValueError("a zero on the diagonal: no unique solution")
    x = np.zeros(n)
    for i in range(n):
        x[i] = (c[i] - L[i, :i] @ x[:i]) / L[i, i]
    return x

print(back_substitute([[2, 1, 1], [0, 3, 2], [0, 0, 4]], [9, 13, 8]))
```

```python test
import ast as _ast
for _n in ["back_substitute", "forward_substitute"]:
    assert _n in dir(), f"Define {_n}."
assert not any(isinstance(_x, _ast.Attribute) and _x.attr == "linalg" for _x in _ast.walk(_ast.parse(_source))), "Substitute yourself, without np.linalg."
assert np.allclose(back_substitute([[2, 1, 1], [0, 3, 2], [0, 0, 4]], [9, 13, 8]), [2, 3, 2]), f"Got {back_substitute([[2, 1, 1], [0, 3, 2], [0, 0, 4]], [9, 13, 8])}."
assert np.allclose(forward_substitute([[2, 0, 0], [1, 3, 0], [4, -1, 5]], [4, 11, 15]), [2, 3, 2]), "Lower triangular."
_rng = np.random.default_rng(41)
for _ in range(20):
    _n = int(_rng.integers(1, 9))
    _U = np.triu(_rng.normal(size=(_n, _n))) + np.eye(_n) * 3
    _x = _rng.normal(size=_n)
    assert np.allclose(back_substitute(_U, _U @ _x), _x) and np.allclose(forward_substitute(_U.T, _U.T @ _x), _x), "Random triangular systems."
for _f, _M in [(back_substitute, [[1, 2], [0, 0]]), (forward_substitute, [[0, 0], [1, 1]])]:
    try:
        _f(_M, [1, 1])
        assert False, f"{_f.__name__} with a zero diagonal entry should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A triangular system gives up its unknowns one at a time: the last step of every elimination."
```

Hint: In back substitution, row i is U[i, i] x[i] + (terms with later unknowns) = c[i]; the later unknowns are already known, so subtract them and divide by U[i, i]. Forward substitution is the same, starting at the top.
:::

::: challenge Gaussian elimination [hard]
Write `solve(A, b)` that solves A x = b for a square system by Gaussian elimination with **partial pivoting**, followed by back substitution, returning a NumPy array. Do not use `np.linalg`. Do not change the caller's arrays (work on a copy). Raise `ValueError` if A is not square, if b's length does not match, or if the matrix is singular: treat it as singular when the best available pivot in some column has absolute value below `1e-12` times the largest absolute entry of A. Then write `determinant(A)` using the same elimination: the determinant is the product of the pivots, with the sign flipped once for every row swap (it is 0.0 when a pivot is below the threshold). Inputs may be lists or arrays.

```python starter
def solve(A, b):
    return np.linalg.solve(A, b)

def determinant(A):
    return np.linalg.det(A)

print(solve([[0, 1], [1, 1]], [2, 3]))
```

```python solution
def _eliminate(A, b=None):
    M = np.array(A, dtype=float)
    if M.ndim != 2 or M.shape[0] != M.shape[1]:
        raise ValueError("A must be square")
    n = len(M)
    rhs = None if b is None else np.array(b, dtype=float)
    if rhs is not None and rhs.shape != (n,):
        raise ValueError("b must have one entry per row")
    scale = np.abs(M).max() if M.size else 0.0
    sign = 1.0
    for k in range(n):
        p = k + int(np.argmax(np.abs(M[k:, k])))
        if abs(M[p, k]) < 1e-12 * scale or scale == 0:
            return M, rhs, sign, False
        if p != k:
            M[[k, p]] = M[[p, k]]
            if rhs is not None:
                rhs[[k, p]] = rhs[[p, k]]
            sign = -sign
        for i in range(k + 1, n):
            f = M[i, k] / M[k, k]
            M[i, k:] -= f * M[k, k:]
            if rhs is not None:
                rhs[i] -= f * rhs[k]
    return M, rhs, sign, True

def solve(A, b):
    U, c, _, ok = _eliminate(A, b)
    if not ok:
        raise ValueError("the matrix is singular")
    n = len(c)
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (c[i] - U[i, i + 1:] @ x[i + 1:]) / U[i, i]
    return x

def determinant(A):
    U, _, sign, ok = _eliminate(A)
    if not ok:
        return 0.0
    return float(sign * np.prod(np.diag(U)))

print(solve([[0, 1], [1, 1]], [2, 3]))
```

```python test
import ast as _ast
for _n in ["solve", "determinant"]:
    assert _n in dir(), f"Define {_n}."
assert not any(isinstance(_x, _ast.Attribute) and _x.attr == "linalg" for _x in _ast.walk(_ast.parse(_source))), "Eliminate yourself, without np.linalg."
assert np.allclose(solve([[2, 1, 3], [1, 2, 1], [3, 1, 2]], [85, 65, 80]), [10, 20, 15]), "The production plan."
assert np.allclose(solve([[0, 1], [1, 1]], [2, 3]), [1, 2]), "A zero in the top-left corner needs a row swap."
_A = np.array([[1e-20, 1.0], [1.0, 1.0]])
try:
    _sol = solve(_A, [1.0, 2.0])
except ValueError:
    _sol = None
assert _sol is not None and np.allclose(_sol, [1.0, 1.0]), "A tiny pivot must be swapped away (partial pivoting picks the largest entry in the column), or rounding destroys the answer."
_Ac, _bc = np.array([[0.0, 2], [3, 1]]), np.array([4.0, 5])
solve(_Ac, _bc)
assert np.array_equal(_Ac, [[0, 2], [3, 1]]) and np.array_equal(_bc, [4, 5]), "Do not modify the caller's arrays."
_rng = np.random.default_rng(42)
for _ in range(30):
    _n = int(_rng.integers(1, 12))
    _M = _rng.normal(size=(_n, _n))
    _x = _rng.normal(size=_n)
    assert np.allclose(solve(_M, _M @ _x), _x, atol=1e-8), "Random systems."
    assert abs(determinant(_M) - np.linalg.det(_M)) < 1e-8 * max(1, abs(np.linalg.det(_M))), "The determinant must match."
for _bad in [([[1, 2], [2, 4]], [1, 2]), ([[1, 2, 3], [4, 5, 6], [5, 7, 9]], [1, 2, 3]), ([[1, 2, 3], [4, 5, 6]], [1, 2]), ([[1, 2], [3, 4]], [1, 2, 3])]:
    try:
        solve(*_bad)
        assert False, f"solve{_bad} should raise ValueError."
    except ValueError:
        pass
assert determinant([[2, 1, 3], [1, 2, 1], [3, 1, 2]]) == -8.0 or abs(determinant([[2, 1, 3], [1, 2, 1], [3, 1, 2]]) + 8) < 1e-12, "det = -8."
assert determinant([[0, 1], [1, 0]]) == -1.0 and determinant([[1, 2], [2, 4]]) == 0.0, "One swap flips the sign; singular gives 0.0."
"SUCCESS: Pivot, eliminate, back-substitute: the algorithm inside every linear solver, with the determinant as a by-product."
```

Hint: Copy A and b into float arrays. For each column k, find the row with the largest |entry| at or below k; if even that is below the threshold, the matrix is singular. Swap it up (in both A and b, counting swaps), then subtract multiples of row k from the rows below. Finish with back substitution. For the determinant, multiply the diagonal of the triangular result and apply the sign.
:::

## What you learned

- A linear system is A x = b: row i of A holds equation i's coefficients. A x is each row times x, or equally a combination of A's columns weighted by x.
- Problems such as production planning become square systems; `np.linalg.solve` (and `A \ b` in OpenMAT) solve them.
- Gaussian elimination with partial pivoting turns A into an upper triangular matrix using row operations, then back substitution finds the unknowns. The cost grows like n³.
- A singular matrix (dependent rows, determinant 0, rank below n) has no unique solution. In floating point, test with the rank or condition number rather than an exact zero determinant.
- The determinant is the product of the pivots, with a sign change for each row swap.

The next lesson uses matrices for something quite different: moving, rotating and scaling points.
