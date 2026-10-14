// Part 3 exercises: linear algebra with plain lists, so every operation is a loop you wrote yourself.
import { checks, py } from './checks.js'

// Helpers the lessons have already built, given to exercises that need them.
const DOT = py`def dot(u, v):
    return sum(a * b for a, b in zip(u, v))

def matvec(A, x):
    return [dot(row, x) for row in A]

def transpose(A):
    return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]

def matmul(A, B):
    return [[dot(row, col) for col in transpose(B)] for row in A]
`

export const EXERCISES = {
  vectors: {
    prompt: py`A vector is a list of numbers, a point, and an arrow. Write \`arrow(p, q)\`: the vector that carries point \`p\` to point \`q\` (each entry: end minus start). Write \`move(p, v)\`: where you land if you start at \`p\` and follow arrow \`v\`. And \`dimension(v)\`: the $n$ in $\mathbf v \in \mathbb R^n$.`,
    starter: py`def arrow(p, q):
    ...

def move(p, v):
    ...

def dimension(v):
    ...
`,
    solution: py`def arrow(p, q):
    return [b - a for a, b in zip(p, q)]

def move(p, v):
    return [a + b for a, b in zip(p, v)]

def dimension(v):
    return len(v)
`,
    checks: checks(py`
expect(arrow([1, 2], [4, 6]), [3, 4], "arrow([1, 2], [4, 6])")
expect(move([1, 2], [3, 4]), [4, 6], "move([1, 2], [3, 4])")
p, q = [0.5, -1, 2], [3, 3, -3]
expect(move(p, arrow(p, q)), q, "move(p, arrow(p, q))")
expect(dimension([1, 2, 3, 4, 5]), 5, "dimension of a 5-entry vector")
`),
    hints: ['Arrow from `p` to `q`: `q[i] - p[i]` in each position.'],
  },

  'vector-arithmetic': {
    prompt: py`Write \`combo(coeffs, vectors)\`: the linear combination $c_1\mathbf v_1 + c_2\mathbf v_2 + \dots$. Then write \`reach(target)\`: the two numbers $(a, b)$ with $a\,(1, 1) + b\,(1, -1) = $ \`target\`. Work them out by hand from the two equations for the two entries.`,
    starter: py`def combo(coeffs, vectors):
    ...

def reach(target):
    ...
`,
    solution: py`def combo(coeffs, vectors):
    out = [0.0] * len(vectors[0])
    for c, v in zip(coeffs, vectors):
        out = [o + c * x for o, x in zip(out, v)]
    return out

def reach(target):
    x, y = target
    return (x + y) / 2, (x - y) / 2
`,
    checks: checks(py`
expect(combo([2, 3], [[1, 0], [0, 1]]), [2, 3], "combo([2, 3], [e1, e2])")
expect(combo([1, -1, 0.5], [[1, 2], [3, 4], [2, 2]]), [-1, -1], "combo([1, -1, 0.5], …)")
for t in [[5, 1], [0, 4], [-2, -6]]:
    a, b = reach(t)
    expect(combo([a, b], [[1, 1], [1, -1]]), t, f"combo(reach({t}), [(1, 1), (1, -1)])")
`),
    hints: ['Start from a zero vector and add `c * v` for each pair.', 'Entry by entry: $a + b = x$ and $a - b = y$. Add the equations, then subtract them.'],
  },

  norm: {
    prompt: py`Write \`distance(u, v)\` (the length of $\mathbf u - \mathbf v$, by Pythagoras), \`l1(v)\` ($\sum_i |v_i|$, the "taxicab" length), and \`nearest(query, points)\`: the point closest to \`query\`. Nearest-neighbour search like this is how an embedding database finds similar items.`,
    starter: py`import math

def distance(u, v):
    ...

def l1(v):
    ...

def nearest(query, points):
    ...
`,
    solution: py`import math

def distance(u, v):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(u, v)))

def l1(v):
    return sum(abs(a) for a in v)

def nearest(query, points):
    return min(points, key=lambda p: distance(query, p))
`,
    checks: checks(py`
expect(distance([0, 0], [3, 4]), 5, "distance([0, 0], [3, 4])")
expect(distance([1, 2, 3], [1, 2, 3]), 0, "distance from a point to itself")
expect(distance([1, 1, 1, 1], [0, 0, 0, 0]), 2, "distance in 4 dimensions")
expect(l1([3, -4]), 7, "l1([3, -4])")
expect(nearest([1, 1], [[5, 5], [0, 2], [2, -3]]), [0, 2], "nearest([1, 1], …)")
`),
    hints: ['$\\|\\mathbf u - \\mathbf v\\| = \\sqrt{\\sum_i (u_i - v_i)^2}$.', '`min(points, key=…)` picks the point with the smallest key.'],
  },

  'dot-product': {
    prompt: py`Write \`dot(u, v)\`, \`cosine(u, v)\` ($\frac{\mathbf u\cdot\mathbf v}{\|\mathbf u\|\|\mathbf v\|}$) and \`most_similar(word, vectors)\`: given a dict of word vectors, return the **other** word whose vector has the highest cosine with \`word\`'s. The tiny "embeddings" in the checks have dimensions you could name (royal, female, food).`,
    starter: py`import math

def dot(u, v):
    ...

def cosine(u, v):
    ...

def most_similar(word, vectors):
    ...
`,
    solution: py`import math

def dot(u, v):
    return sum(a * b for a, b in zip(u, v))

def cosine(u, v):
    return dot(u, v) / math.sqrt(dot(u, u) * dot(v, v))

def most_similar(word, vectors):
    others = [w for w in vectors if w != word]
    return max(others, key=lambda w: cosine(vectors[word], vectors[w]))
`,
    checks: checks(py`
expect(dot([1, 2, 3], [4, 5, 6]), 32, "dot([1, 2, 3], [4, 5, 6])")
expect(cosine([1, 0], [0, 5]), 0, "cosine of perpendicular arrows")
expect(cosine([2, 2], [5, 5]), 1, "cosine of arrows pointing the same way")
expect(cosine([1, 0], [-3, 0]), -1, "cosine of opposite arrows")
words = {"king": [0.9, 0.1, 0.0], "queen": [0.9, 0.9, 0.0], "woman": [0.1, 0.9, 0.0], "bread": [0.0, 0.1, 0.9]}
expect(most_similar("king", words), "queen", "most_similar('king')")
expect(most_similar("woman", words), "queen", "most_similar('woman')")
expect(most_similar("bread", words), "woman", "most_similar('bread')")
`),
    hints: ['$\\|\\mathbf u\\| = \\sqrt{\\mathbf u \\cdot \\mathbf u}$.', 'Leave `word` itself out: its cosine with itself is always 1.'],
  },

  matrices: {
    prompt: py`Write \`layer(W, b, x)\`, which computes $W\mathbf x + \mathbf b$ (one dot product per row of $W$, then add $\mathbf b$). If the shapes don't fit, raise \`ValueError\`: every row of $W$ must have as many entries as $\mathbf x$, and $\mathbf b$ as many as $W$ has rows. Also write \`shape(W)\`, returning \`(rows, columns)\`.`,
    starter: py`def shape(W):
    ...

def layer(W, b, x):
    ...
`,
    solution: py`def shape(W):
    return len(W), len(W[0])

def layer(W, b, x):
    m, n = shape(W)
    if len(x) != n or len(b) != m:
        raise ValueError(f"W is {m}×{n}, x has {len(x)} entries, b has {len(b)}")
    return [sum(w * xi for w, xi in zip(row, x)) + bi for row, bi in zip(W, b)]
`,
    checks: checks(py`
W = [[1, 2, 0], [0, -1, 3]]
expect(shape(W), (2, 3), "shape(W)")
expect(layer(W, [0.5, -1], [1, 1, 1]), [3.5, 1], "layer(W, [0.5, -1], [1, 1, 1])")
for bad_b, bad_x, what in [([0, 0], [1, 1], "x too short"), ([0, 0, 0], [1, 1, 1], "b too long")]:
    try:
        layer(W, bad_b, bad_x)
    except ValueError:
        pass
    else:
        raise AssertionError(f"layer should raise ValueError when {what}")
`),
    hints: ['Row $i$ of the output is row $i$ of $W$ dotted with $\\mathbf x$, plus $b_i$.', 'Compare `len(x)` with the number of columns and `len(b)` with the number of rows before computing.'],
  },

  transformations: {
    prompt: py`A $2\times2$ matrix's columns are where the axes land. Write \`rotation(degrees)\`, the matrix that turns the plane anticlockwise by that angle: its first column is where $(1, 0)$ goes, $(\cos\theta, \sin\theta)$, and its second is where $(0, 1)$ goes. Write \`apply(A, points)\` to move a list of points. Then set \`shear\` to the matrix that keeps $(1, 0)$ fixed and sends $(0, 1)$ to $(1, 1)$.`,
    starter: py`import math

def matvec(A, x):
    return [sum(a * b for a, b in zip(row, x)) for row in A]

def rotation(degrees):
    ...

def apply(A, points):
    ...

shear = None
`,
    solution: py`import math

def matvec(A, x):
    return [sum(a * b for a, b in zip(row, x)) for row in A]

def rotation(degrees):
    t = math.radians(degrees)
    return [[math.cos(t), -math.sin(t)], [math.sin(t), math.cos(t)]]

def apply(A, points):
    return [matvec(A, p) for p in points]

shear = [[1, 1], [0, 1]]
`,
    checks: checks(py`
expect(apply(rotation(90), [[1, 0], [0, 1]]), [[0, 1], [-1, 0]], "rotating the axes by 90°", tol=1e-12)
expect(apply(rotation(180), [[2, 3]]), [[-2, -3]], "rotating (2, 3) by 180°", tol=1e-12)
r = apply(rotation(37), [[3, 4]])[0]
expect(math.hypot(*r), 5, "the length of (3, 4) after rotating: rotations keep lengths")
expect(apply(shear, [[1, 0], [0, 1], [2, 2]]), [[1, 0], [1, 1], [4, 2]], "apply(shear, …)")
`),
    hints: ['Columns are where the axes land, so entry $(i, j)$ is coordinate $i$ of where axis $j$ goes.', 'For the shear, write the two landing points as the two columns.'],
  },

  'matrix-multiplication': {
    prompt: py`Write \`matmul(A, B)\` with the row-by-column rule, raising \`ValueError\` if $A$'s column count differs from $B$'s row count. The checks confirm that $(AB)\mathbf x = A(B\mathbf x)$: multiplying matrices **is** doing one transformation after another. Then set \`P\` and \`Q\` to two $2\times2$ matrices with $PQ \ne QP$.`,
    starter: py`def matvec(A, x):
    return [sum(a * b for a, b in zip(row, x)) for row in A]

def matmul(A, B):
    ...

P = None
Q = None
`,
    solution: py`def matvec(A, x):
    return [sum(a * b for a, b in zip(row, x)) for row in A]

def matmul(A, B):
    if len(A[0]) != len(B):
        raise ValueError(f"{len(A)}×{len(A[0])} times {len(B)}×{len(B[0])}: inner sizes differ")
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]

P = [[0, -1], [1, 0]]
Q = [[1, 0], [0, -1]]
`,
    checks: checks(py`
A, B = [[1, 2], [3, 4], [5, 6]], [[1, 0, 2], [0, 1, -1]]
expect(matmul(A, B), [[1, 2, 0], [3, 4, 2], [5, 6, 4]], "matmul(A, B) for 3×2 times 2×3")
expect(matmul(B, A), [[11, 14], [-2, -2]], "matmul(B, A) for 2×3 times 3×2")
for x in [[1, -1, 2], [0.5, 3, 0]]:
    expect(matvec(matmul(A, B), x), matvec(A, matvec(B, x)), f"(AB)x compared with A(Bx) for x = {x}")
try:
    matmul(A, A)
except ValueError:
    pass
else:
    raise AssertionError("matmul(A, A) for 3×2 times 3×2 should raise ValueError")
assert P and Q and matmul(P, Q) != matmul(Q, P), "pick P and Q with PQ ≠ QP (try a rotation and a flip)"
`),
    hints: ['Entry $(i, j)$ is $\\sum_k A_{ik}B_{kj}$: row $i$ of $A$ with column $j$ of $B$.', 'Rotate then flip is not flip then rotate: try `[[0, -1], [1, 0]]` and `[[1, 0], [0, -1]]`.'],
  },

  transpose: {
    prompt: py`Write \`transpose(A)\` and \`outer(u, v)\`, the matrix $\mathbf u\mathbf v^\top$ whose entry $(i, j)$ is $u_i v_j$. The checks then confirm, on random matrices, that $(AB)^\top = B^\top A^\top$ and that $\mathbf u^\top\mathbf v$ (a $1\times1$ matrix) holds the dot product.`,
    starter: DOT.replace(/def transpose[\s\S]*?\n\n/, '') + py`
def transpose(A):
    ...

def outer(u, v):
    ...
`,
    solution: DOT.replace(/def transpose[\s\S]*?\n\n/, '') + py`
def transpose(A):
    return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]

def outer(u, v):
    return [[a * b for b in v] for a in u]
`,
    checks: checks(py`
import random
expect(transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]], "transpose of a 2×3 matrix")
expect(outer([1, 2], [3, 4, 5]), [[3, 4, 5], [6, 8, 10]], "outer([1, 2], [3, 4, 5])")
def mm(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]
rng = random.Random(1)
A = [[rng.randint(-3, 3) for _ in range(3)] for _ in range(2)]
B = [[rng.randint(-3, 3) for _ in range(4)] for _ in range(3)]
expect(transpose(mm(A, B)), mm(transpose(B), transpose(A)), "(AB)ᵀ compared with BᵀAᵀ")
u, v = [1, 2, 3], [4, -5, 6]
expect(mm([u], transpose([v])), [[dot(u, v)]], "uᵀv as a 1×1 matrix")
`),
    hints: ['Column $j$ of $A$ becomes row $j$ of $A^\\top$.', 'For `outer`, one row per entry of `u`.'],
  },

  inverse: {
    prompt: py`Write \`inverse2(A)\` for a $2\times2$ matrix, raising \`ValueError\` when the determinant is 0 (when the matrix squashes the plane flat, nothing can undo it). Then write \`shoelace(points)\`, the area of a polygon from its corners in order: $\frac12\left|\sum_i (x_i y_{i+1} - x_{i+1} y_i)\right|$, wrapping round to the first corner. The checks transform the unit square and confirm its area becomes $|\det A|$.`,
    starter: py`def det2(A):
    return A[0][0] * A[1][1] - A[0][1] * A[1][0]

def inverse2(A):
    ...

def shoelace(points):
    ...
`,
    solution: py`def det2(A):
    return A[0][0] * A[1][1] - A[0][1] * A[1][0]

def inverse2(A):
    d = det2(A)
    if d == 0:
        raise ValueError("determinant is 0: no inverse")
    return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]]

def shoelace(points):
    s = 0
    for i in range(len(points)):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % len(points)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2
`,
    checks: checks(py`
def mm(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
for A in [[[2, 1], [1, 3]], [[0, -1], [1, 0]], [[4, 7], [2, 6]]]:
    expect(mm(A, inverse2(A)), [[1, 0], [0, 1]], f"A · inverse2(A) for A = {A}", tol=1e-12)
try:
    inverse2([[1, 2], [2, 4]])
except ValueError:
    pass
else:
    raise AssertionError("inverse2([[1, 2], [2, 4]]) should raise ValueError: its rows are parallel")
expect(shoelace([[0, 0], [1, 0], [1, 1], [0, 1]]), 1, "shoelace of the unit square")
square = [[0, 0], [1, 0], [1, 1], [0, 1]]
for A in [[[2, 1], [1, 3]], [[3, 0], [0, -2]], [[1, 2], [2, 4]]]:
    image = [[A[0][0] * x + A[0][1] * y, A[1][0] * x + A[1][1] * y] for x, y in square]
    expect(shoelace(image), abs(det2(A)), f"the area of the square after A = {A}")
`),
    hints: ['Swap the diagonal, negate the off-diagonal, divide everything by the determinant.', 'In `shoelace`, the corner after the last is `points[0]`: use `(i + 1) % len(points)`.'],
  },

  systems: {
    prompt: py`Three apples and two pears cost 13; one apple and four pears cost 11. Write the system as \`A\` and \`b\` (so $A\mathbf x = \mathbf b$ with $\mathbf x = $ (apple price, pear price)), solve it with the given \`solve2\`, and store the answer in \`prices\`. Then write \`residual(A, x, b)\`, the list $A\mathbf x - \mathbf b$, which is all zeros exactly when $\mathbf x$ solves the system.`,
    starter: py`def solve2(A, b):
    d = A[0][0] * A[1][1] - A[0][1] * A[1][0]
    inv = [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]]
    return [inv[0][0] * b[0] + inv[0][1] * b[1], inv[1][0] * b[0] + inv[1][1] * b[1]]

A = None
b = None
prices = None

def residual(A, x, b):
    ...
`,
    solution: py`def solve2(A, b):
    d = A[0][0] * A[1][1] - A[0][1] * A[1][0]
    inv = [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]]
    return [inv[0][0] * b[0] + inv[0][1] * b[1], inv[1][0] * b[0] + inv[1][1] * b[1]]

A = [[3, 2], [1, 4]]
b = [13, 11]
prices = solve2(A, b)

def residual(A, x, b):
    return [sum(a * xi for a, xi in zip(row, x)) - bi for row, bi in zip(A, b)]
`,
    checks: checks(py`
expect(A, [[3, 2], [1, 4]], "A (one row per equation, one column per unknown)")
expect(b, [13, 11], "b")
expect(prices, [3, 2], "prices")
expect(residual(A, prices, b), [0, 0], "residual at the solution", tol=1e-12)
expect(residual(A, [1, 1], b), [-8, -6], "residual at a wrong guess (1, 1)")
`),
    hints: ['Row 1 is the first sentence: 3 apples + 2 pears = 13.', 'Each residual entry is a row of $A$ dotted with $\\mathbf x$, minus that entry of $\\mathbf b$.'],
  },

  'least-squares': {
    prompt: py`Fit $y = wx + c$ by least squares: build $X$ (rows \`[x, 1]\`), form $X^\top X$ and $X^\top\mathbf y$ with the helpers, solve, and return \`(w, c)\` from \`fit_line(xs, ys)\`. Then write \`residuals(xs, ys, w, c)\`, the misses $y_i - (wx_i + c)$. The checks confirm the property the normal equations encode: the misses add to zero **and** are uncorrelated with $x$ ($\sum_i x_i r_i = 0$): the error is perpendicular to every column of $X$.`,
    starter: DOT + py`
def solve2(A, b):
    d = A[0][0] * A[1][1] - A[0][1] * A[1][0]
    return [(A[1][1] * b[0] - A[0][1] * b[1]) / d, (A[0][0] * b[1] - A[1][0] * b[0]) / d]

def fit_line(xs, ys):
    ...

def residuals(xs, ys, w, c):
    ...
`,
    solution: DOT + py`
def solve2(A, b):
    d = A[0][0] * A[1][1] - A[0][1] * A[1][0]
    return [(A[1][1] * b[0] - A[0][1] * b[1]) / d, (A[0][0] * b[1] - A[1][0] * b[0]) / d]

def fit_line(xs, ys):
    X = [[x, 1.0] for x in xs]
    Xt = transpose(X)
    w, c = solve2(matmul(Xt, X), matvec(Xt, ys))
    return w, c

def residuals(xs, ys, w, c):
    return [y - (w * x + c) for x, y in zip(xs, ys)]
`,
    checks: checks(py`
xs, ys = [1, 2, 3, 4, 5, 6], [52, 55, 61, 64, 70, 71]
w, c = fit_line(xs, ys)
mx, my = sum(xs) / 6, sum(ys) / 6
w_ref = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
expect(w, w_ref, "w")
expect(c, my - w_ref * mx, "c")
r = residuals(xs, ys, w, c)
expect(sum(r), 0, "the sum of the residuals", tol=1e-9)
expect(sum(x * ri for x, ri in zip(xs, r)), 0, "Σ xᵢ rᵢ", tol=1e-9)
expect(fit_line([0, 1, 2], [1, 3, 5]), (2, 1), "fit_line through three points on y = 2x + 1")
`),
    hints: ['`Xt = transpose(X)`, then `solve2(matmul(Xt, X), matvec(Xt, ys))`.', 'Return a tuple: `return w, c`.'],
  },

  eigenvectors: {
    prompt: py`**Power iteration** finds the direction a matrix stretches most: start from any vector, multiply by $A$ again and again, and rescale to length 1 each time. Write \`power_iteration(A, steps)\`, and \`stretch(A, v)\`, the factor $\mathbf v^\top A\mathbf v$ for a unit vector (its eigenvalue, if $\mathbf v$ is an eigenvector). Check against the lesson: $\begin{pmatrix}2&1\\1&2\end{pmatrix}$ has eigenvalues 3 and 1.`,
    starter: py`import math

def matvec(A, x):
    return [sum(a * b for a, b in zip(row, x)) for row in A]

def power_iteration(A, steps=100):
    v = [1.0] * len(A)
    ...

def stretch(A, v):
    ...
`,
    solution: py`import math

def matvec(A, x):
    return [sum(a * b for a, b in zip(row, x)) for row in A]

def power_iteration(A, steps=100):
    v = [1.0] * len(A)
    for _ in range(steps):
        v = matvec(A, v)
        n = math.sqrt(sum(a * a for a in v))
        v = [a / n for a in v]
    return v

def stretch(A, v):
    return sum(a * b for a, b in zip(v, matvec(A, v)))
`,
    checks: checks(py`
A = [[2, 1], [1, 2]]
v = power_iteration(A)
s = 1 / math.sqrt(2)
expect([abs(x) for x in v], [s, s], "power_iteration(A) (up to sign)", tol=1e-9)
expect(stretch(A, v), 3, "stretch(A, v)", tol=1e-9)
expect(matvec(A, v), [3 * x for x in v], "A v compared with 3 v", tol=1e-9)
B = [[4, 1, 0], [1, 3, 1], [0, 1, 2]]
w = power_iteration(B, 500)
lam = stretch(B, w)
expect(matvec(B, w), [lam * x for x in w], "B w compared with λ w for a 3×3 matrix", tol=1e-9)
`),
    hints: ['Each step: `v = matvec(A, v)`, then divide by its length.', 'For a unit vector, $\\mathbf v^\\top(A\\mathbf v)$ is just a dot product.'],
  },

  'matrix-gradients': {
    prompt: py`Write \`loss(X, theta, y)\` $= \|X\boldsymbol\theta - \mathbf y\|^2$ and \`loss_gradient(X, theta, y)\` $= 2X^\top(X\boldsymbol\theta - \mathbf y)$, using the helpers. The checks compare your formula with partial derivatives estimated one parameter at a time. Then use the gradient for 2000 steps of descent with rate 0.01 from $\boldsymbol\theta = \mathbf 0$ and store the result in \`theta_hat\`.`,
    starter: DOT + py`
def loss(X, theta, y):
    ...

def loss_gradient(X, theta, y):
    ...

X = [[1, 1], [2, 1], [3, 1], [4, 1]]
y = [3, 5, 7, 9]
theta_hat = None
`,
    solution: DOT + py`
def loss(X, theta, y):
    r = [p - t for p, t in zip(matvec(X, theta), y)]
    return dot(r, r)

def loss_gradient(X, theta, y):
    r = [p - t for p, t in zip(matvec(X, theta), y)]
    return [2 * g for g in matvec(transpose(X), r)]

X = [[1, 1], [2, 1], [3, 1], [4, 1]]
y = [3, 5, 7, 9]
theta_hat = [0.0, 0.0]
for _ in range(2000):
    g = loss_gradient(X, theta_hat, y)
    theta_hat = [t - 0.01 * gi for t, gi in zip(theta_hat, g)]
`,
    checks: checks(py`
expect(loss(X, [2, 1], y), 0, "loss at the exact fit θ = (2, 1)")
expect(loss(X, [0, 0], y), 164, "loss at θ = (0, 0)")
for th in [[0, 0], [1.5, -2], [3, 0.5]]:
    num = []
    for i in range(2):
        up, dn = list(th), list(th)
        up[i] += 1e-6
        dn[i] -= 1e-6
        num.append((loss(X, up, y) - loss(X, dn, y)) / 2e-6)
    expect(loss_gradient(X, th, y), num, f"loss_gradient at θ = {th}", tol=1e-5)
expect(theta_hat, [2, 1], "theta_hat", tol=1e-4)
`),
    hints: ['First the residual $\\mathbf r = X\\boldsymbol\\theta - \\mathbf y$; the loss is $\\mathbf r \\cdot \\mathbf r$.', 'The gradient is $2X^\\top\\mathbf r$: `matvec(transpose(X), r)`, doubled.'],
  },
}
