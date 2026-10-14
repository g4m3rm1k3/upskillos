// Exercises for the linear-algebra additions: write each algorithm, then test it against an identity.
import { checks, py } from './checks.js'

const MM = py`def matmul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]

def transpose(A):
    return [list(col) for col in zip(*A)]
`

export const EXERCISES = {
  'span-basis': {
    prompt: py`Write \`independent2(u, v)\` for two vectors in the plane: true unless one is a multiple of the other (use $u_1v_2 - u_2v_1 \ne 0$). Then \`coords2(b1, b2, v)\`: the coefficients $(c_1, c_2)$ with $c_1\mathbf b_1 + c_2\mathbf b_2 = \mathbf v$, by eliminating one unknown by hand (or by the $2\times2$ inverse). Finally \`combine(cs, basis)\`: rebuild $\sum c_i\mathbf b_i$, so the checks can confirm the coordinates are right.`,
    starter: py`def independent2(u, v):
    ...

def coords2(b1, b2, v):
    ...

def combine(cs, basis):
    ...
`,
    solution: py`def independent2(u, v):
    return abs(u[0] * v[1] - u[1] * v[0]) > 1e-12

def coords2(b1, b2, v):
    d = b1[0] * b2[1] - b1[1] * b2[0]
    c1 = (v[0] * b2[1] - v[1] * b2[0]) / d
    c2 = (b1[0] * v[1] - b1[1] * v[0]) / d
    return c1, c2

def combine(cs, basis):
    out = [0.0] * len(basis[0])
    for c, b in zip(cs, basis):
        out = [o + c * x for o, x in zip(out, b)]
    return out
`,
    checks: checks(py`
expect(independent2([1, 2], [2, 4]), False, "independent2((1, 2), (2, 4))")
expect(independent2([1, 2], [2, 3]), True, "independent2((1, 2), (2, 3))")
expect(coords2([1, 1], [1, -1], [5, 1]), (3, 2), "coords2 in the basis (1, 1), (1, −1)")
for b1, b2, v in [([2, 1], [-1, 3], [4, 9]), ([0.5, 0], [0.3, 2], [-1, 7])]:
    expect(combine(coords2(b1, b2, v), [b1, b2]), v, f"rebuilding {v} from its coordinates")
`),
    hints: ['Solve $c_1b_{11} + c_2b_{21} = v_1$ and $c_1b_{12} + c_2b_{22} = v_2$: multiply to cancel $c_2$, and the determinant appears in the denominator.'],
  },

  'gaussian-elimination': {
    prompt: py`Write \`solve(A, b)\` for any square invertible system: elimination **with partial pivoting**, then back-substitution. The checks include a system whose first pivot is $10^{-20}$: without pivoting it gives garbage. Then write \`count_steps(n)\` by literally counting the multiply-and-subtract updates your elimination performs on the $n \times n$ matrix (not on $\mathbf b$), and compare with $\frac{n^3 - n}{3}$.`,
    starter: py`def solve(A, b):
    ...

def count_steps(n):
    ...
`,
    solution: py`def solve(A, b):
    n = len(A)
    M = [list(row) + [bi] for row, bi in zip(A, b)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for k in range(c, n + 1):
                M[r][k] -= f * M[c][k]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x

def count_steps(n):
    count = 0
    for c in range(n):
        for r in range(c + 1, n):
            for k in range(c, n):
                count += 1
    return count
`,
    checks: checks(py`
expect(solve([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3]), [2, 3, -1], "solve the 3 × 3 system", tol=1e-9)
expect(solve([[1e-20, 1], [1, 1]], [1, 2]), [1, 1], "solve with a tiny first pivot (needs pivoting)", tol=1e-9)
import random
rng = random.Random(4)
A = [[rng.uniform(-1, 1) for _ in range(6)] for _ in range(6)]
x_true = [rng.uniform(-3, 3) for _ in range(6)]
b = [sum(a * x for a, x in zip(row, x_true)) for row in A]
expect(solve(A, b), x_true, "solve a random 6 × 6 system", tol=1e-8)
for n in (1, 3, 10, 25):
    expect(count_steps(n), (n ** 3 - n) // 3, f"count_steps({n})")
`),
    hints: ['Before clearing column $c$, swap in the row (from $c$ down) with the largest $|M_{rc}|$.', 'Count one step per entry updated, for columns $c$ to $n - 1$ of each row below the pivot.'],
  },

  rank: {
    prompt: py`Write \`rank(A)\` by elimination with a tolerance (treat $|x| < 10^{-9}$ as zero), for matrices of **any** shape. Then \`null_vector(A)\` for a $3\times3$ matrix of rank 2: a nonzero $\mathbf x$ with $A\mathbf x = \mathbf 0$ (hint: the cross product of two independent rows is perpendicular to both, so it is sent to zero by every row). The checks confirm $\text{rank}(A) = \text{rank}(A^\top)$ on random low-rank matrices.`,
    starter: MM + py`
def rank(A):
    ...

def null_vector(A):
    ...
`,
    solution: MM + py`
def rank(A):
    M = [list(map(float, row)) for row in A]
    rows, cols = len(M), len(M[0])
    r = 0
    for c in range(cols):
        if r == rows:
            break
        p = max(range(r, rows), key=lambda i: abs(M[i][c]))
        if abs(M[p][c]) < 1e-9:
            continue
        M[r], M[p] = M[p], M[r]
        for i in range(r + 1, rows):
            f = M[i][c] / M[r][c]
            M[i] = [a - f * b for a, b in zip(M[i], M[r])]
        r += 1
    return r

def null_vector(A):
    for i in range(3):
        for j in range(i + 1, 3):
            u, v = A[i], A[j]
            x = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
            if any(abs(t) > 1e-9 for t in x):
                return x
    return None
`,
    checks: checks(py`
expect(rank([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), 2, "rank of 1 to 9")
expect(rank([[1, 0], [0, 1], [1, 1]]), 2, "rank of a 3 × 2 matrix")
expect(rank([[0, 0], [0, 0]]), 0, "rank of the zero matrix")
x = null_vector([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
assert x and any(abs(t) > 1e-9 for t in x), "null_vector should be nonzero"
expect([sum(a * t for a, t in zip(row, x)) for row in [[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [0, 0, 0], "A times the null vector", tol=1e-9)
import random
rng = random.Random(2)
for r_true in (1, 2, 3):
    B = [[rng.uniform(-1, 1) for _ in range(r_true)] for _ in range(5)]
    C = [[rng.uniform(-1, 1) for _ in range(4)] for _ in range(r_true)]
    A = matmul(B, C)
    expect(rank(A), r_true, f"rank of a 5 × 4 product through {r_true} dimensions")
    expect(rank(transpose(A)), rank(A), "rank of the transpose")
`),
    hints: ['Same loop as elimination, but skip a column (don\'t advance the row) when everything below is zero.', 'Cross product: $(u_2v_3 - u_3v_2,\\; u_3v_1 - u_1v_3,\\; u_1v_2 - u_2v_1)$.'],
  },

  'determinant-n': {
    prompt: py`Write \`det(A)\` by elimination (product of pivots, sign flip per swap), and \`det_cofactor(A)\` by the cofactor expansion along the first row: $\det A = \sum_j (-1)^j A_{0j}\det(A \text{ without row } 0 \text{ and column } j)$, recursively. The checks compare them, confirm $\det(AB) = \det A\det B$, and count how many $2\times2$ determinants the cofactor method computes for $n = 8$ against elimination's handful of steps.`,
    starter: MM + py`
def det(A):
    ...

calls = 0

def det_cofactor(A):
    global calls
    ...
`,
    solution: MM + py`
def det(A):
    M = [list(map(float, r)) for r in A]
    n, d = len(M), 1.0
    for c in range(n):
        p = max(range(c, n), key=lambda i: abs(M[i][c]))
        if M[p][c] == 0:
            return 0.0
        if p != c:
            M[c], M[p] = M[p], M[c]
            d = -d
        d *= M[c][c]
        for i in range(c + 1, n):
            f = M[i][c] / M[c][c]
            M[i] = [a - f * b for a, b in zip(M[i], M[c])]
    return d

calls = 0

def det_cofactor(A):
    global calls
    if len(A) == 2:
        calls += 1
        return A[0][0] * A[1][1] - A[0][1] * A[1][0]
    total = 0.0
    for j in range(len(A)):
        minor = [row[:j] + row[j + 1:] for row in A[1:]]
        total += (-1) ** j * A[0][j] * det_cofactor(minor)
    return total
`,
    checks: checks(py`
import random
rng = random.Random(9)
for n in (2, 3, 5):
    A = [[rng.randint(-4, 4) for _ in range(n)] for _ in range(n)]
    expect(det(A), det_cofactor(A), f"det compared with det_cofactor for n = {n}", tol=1e-9)
A = [[rng.uniform(-1, 1) for _ in range(4)] for _ in range(4)]
B = [[rng.uniform(-1, 1) for _ in range(4)] for _ in range(4)]
expect(det(matmul(A, B)), det(A) * det(B), "det(AB) compared with det A · det B", tol=1e-9)
expect(det([[1, 2], [2, 4]]), 0, "det of a singular matrix")
expect(det([[0, 1], [1, 0]]), -1, "det of a swap")
calls = 0
det_cofactor([[rng.randint(-2, 2) for _ in range(8)] for _ in range(8)])
expect(calls, 20160, "2 × 2 determinants computed by cofactors for n = 8 (8!/2)")
`),
    hints: ['The minor drops row 0 and column $j$: `[row[:j] + row[j + 1:] for row in A[1:]]`.', 'Cofactors at size $n$ make $n$ calls of size $n - 1$, so $n!/2$ calls of size 2.'],
  },

  orthogonality: {
    prompt: py`Write \`project(v, u)\` and \`gram_schmidt(vectors)\`. Then \`project_onto_span(v, vectors)\`: orthonormalise the vectors, then add the shadows $\sum_i(\mathbf q_i\cdot\mathbf v)\mathbf q_i$. The checks confirm the leftover $\mathbf v - \text{projection}$ is perpendicular to every original vector, and that the projection is the closest point of the span (it beats random points of the span).`,
    starter: py`import math

def dot(u, v):
    return sum(a * b for a, b in zip(u, v))

def project(v, u):
    ...

def gram_schmidt(vectors):
    ...

def project_onto_span(v, vectors):
    ...
`,
    solution: py`import math

def dot(u, v):
    return sum(a * b for a, b in zip(u, v))

def project(v, u):
    k = dot(v, u) / dot(u, u)
    return [k * a for a in u]

def gram_schmidt(vectors):
    basis = []
    for v in vectors:
        w = list(v)
        for q in basis:
            s = project(w, q)
            w = [a - b for a, b in zip(w, s)]
        n = math.sqrt(dot(w, w))
        basis.append([a / n for a in w])
    return basis

def project_onto_span(v, vectors):
    out = [0.0] * len(v)
    for q in gram_schmidt(vectors):
        c = dot(q, v)
        out = [o + c * a for o, a in zip(out, q)]
    return out
`,
    checks: checks(py`
expect(project([2, 3], [1, 1]), [2.5, 2.5], "project((2, 3), (1, 1))")
Q = gram_schmidt([[1, 1, 0, 1], [1, 0, 1, 0], [0, 2, 1, 1]])
for i in range(3):
    for j in range(3):
        expect(dot(Q[i], Q[j]), 1.0 if i == j else 0.0, f"q{i} · q{j}", tol=1e-12)
vs = [[1, 1, 0, 1], [1, 0, 1, 0]]
v = [3, -1, 2, 5]
p = project_onto_span(v, vs)
r = [a - b for a, b in zip(v, p)]
for w in vs:
    expect(dot(r, w), 0, "the leftover dotted with a spanning vector", tol=1e-9)
import random
rng = random.Random(1)
best = math.dist(v, p)
for _ in range(500):
    a, b = rng.uniform(-5, 5), rng.uniform(-5, 5)
    q = [a * x + b * y for x, y in zip(*vs)]
    assert math.dist(v, q) >= best - 1e-12, "a point of the span is closer than the projection"
`),
    hints: ['In an orthonormal basis, the coefficient along $\\mathbf q_i$ is just $\\mathbf q_i\\cdot\\mathbf v$.'],
  },

  'orthogonal-matrices': {
    prompt: py`Write \`rotation(theta)\` (a $2\times2$ rotation by \`theta\` radians), \`householder(u)\` $= I - 2\frac{\mathbf u\mathbf u^\top}{\mathbf u^\top\mathbf u}$ (normalising $\mathbf u$ for you), and \`is_orthogonal(Q)\`. Then **rotary embeddings in miniature**: \`rope_score(q, k, m, n, theta)\` rotates the 2D query by $m\theta$ and the key by $n\theta$ and returns their dot product. The checks confirm the score depends only on $m - n$.`,
    starter: MM + py`import math

def rotation(theta):
    ...

def householder(u):
    ...

def is_orthogonal(Q, tol=1e-9):
    ...

def rope_score(q, k, m, n, theta):
    ...
`,
    solution: MM + py`import math

def rotation(theta):
    c, s = math.cos(theta), math.sin(theta)
    return [[c, -s], [s, c]]

def householder(u):
    nn = sum(a * a for a in u)
    return [[(1.0 if i == j else 0.0) - 2 * u[i] * u[j] / nn for j in range(len(u))] for i in range(len(u))]

def is_orthogonal(Q, tol=1e-9):
    P = matmul(transpose(Q), Q)
    return all(abs(P[i][j] - (i == j)) < tol for i in range(len(P)) for j in range(len(P)))

def rope_score(q, k, m, n, theta):
    rq = [sum(a * b for a, b in zip(row, q)) for row in rotation(m * theta)]
    rk = [sum(a * b for a, b in zip(row, k)) for row in rotation(n * theta)]
    return sum(a * b for a, b in zip(rq, rk))
`,
    checks: checks(py`
expect(is_orthogonal(rotation(0.7)), True, "a rotation is orthogonal")
H = householder([1, 2, 2])
expect(is_orthogonal(H), True, "a Householder reflection is orthogonal")
expect([sum(a * b for a, b in zip(row, [1, 2, 2])) for row in H], [-1, -2, -2], "the reflection flips u itself", tol=1e-12)
expect(is_orthogonal([[1, 1], [0, 1]]), False, "a shear is not orthogonal")
q, k = [0.3, -1.2], [2.0, 0.5]
s1 = rope_score(q, k, 5, 2, 0.1)
expect(rope_score(q, k, 13, 10, 0.1), s1, "rope_score at positions (13, 10) vs (5, 2)", tol=1e-12)
expect(rope_score(q, k, 3, 0, 0.1), s1, "rope_score at positions (3, 0)", tol=1e-12)
assert abs(rope_score(q, k, 6, 2, 0.1) - s1) > 1e-3, "a different gap should give a different score"
`),
    hints: ['$(R_m\\mathbf q)\\cdot(R_n\\mathbf k) = \\mathbf q^\\top R_m^\\top R_n\\mathbf k = \\mathbf q^\\top R_{n-m}\\mathbf k$: only the difference survives.'],
  },

  spectral: {
    prompt: py`Implement the Jacobi eigenvalue method: \`jacobi(S, sweeps)\` returns \`(eigenvalues, Q)\` with eigenvectors as the **columns** of \`Q\`. Each rotation zeroes one off-diagonal pair $(p, q)$, using $\theta = \frac{S_{qq} - S_{pp}}{2S_{pq}}$, $t = \frac{\text{sign}(\theta)}{|\theta| + \sqrt{\theta^2 + 1}}$, $c = \frac{1}{\sqrt{t^2 + 1}}$, $s = tc$. The checks confirm $S = Q\Lambda Q^\top$, that $Q$ is orthogonal, and that the eigenvalues add to the trace.`,
    starter: MM + py`import math

def jacobi(S, sweeps=30):
    n = len(S)
    A = [list(map(float, r)) for r in S]
    Q = [[float(i == j) for j in range(n)] for i in range(n)]
    ...
`,
    solution: MM + py`import math

def jacobi(S, sweeps=30):
    n = len(S)
    A = [list(map(float, r)) for r in S]
    Q = [[float(i == j) for j in range(n)] for i in range(n)]
    for _ in range(sweeps):
        for p in range(n):
            for q in range(p + 1, n):
                if abs(A[p][q]) < 1e-15:
                    continue
                theta = (A[q][q] - A[p][p]) / (2 * A[p][q])
                t = (1.0 if theta >= 0 else -1.0) / (abs(theta) + math.sqrt(theta * theta + 1))
                c = 1 / math.sqrt(t * t + 1)
                s = t * c
                for k in range(n):
                    A[k][p], A[k][q] = c * A[k][p] - s * A[k][q], s * A[k][p] + c * A[k][q]
                for k in range(n):
                    A[p][k], A[q][k] = c * A[p][k] - s * A[q][k], s * A[p][k] + c * A[q][k]
                for k in range(n):
                    Q[k][p], Q[k][q] = c * Q[k][p] - s * Q[k][q], s * Q[k][p] + c * Q[k][q]
    return [A[i][i] for i in range(n)], Q
`,
    checks: checks(py`
import random
rng = random.Random(5)
B = [[rng.uniform(-1, 1) for _ in range(5)] for _ in range(5)]
S = [[B[i][j] + B[j][i] for j in range(5)] for i in range(5)]
vals, Q = jacobi(S)
L = [[vals[i] if i == j else 0.0 for j in range(5)] for i in range(5)]
expect(matmul(matmul(Q, L), transpose(Q)), S, "Q Λ Qᵀ compared with S", tol=1e-9)
expect(matmul(transpose(Q), Q), [[float(i == j) for j in range(5)] for i in range(5)], "QᵀQ", tol=1e-9)
expect(sum(vals), sum(S[i][i] for i in range(5)), "the sum of the eigenvalues compared with the trace", tol=1e-9)
expect(sorted(jacobi([[2, 1], [1, 2]])[0]), [1, 3], "eigenvalues of [[2, 1], [1, 2]]", tol=1e-12)
`),
    hints: ['Use simultaneous assignment (`a, b = …, …`) so each update uses the old values of both entries.', 'Rotate columns, then rows, then accumulate the same column rotation into $Q$.'],
  },

  'positive-definite': {
    prompt: py`Write \`cholesky(S)\` (return \`None\` when a diagonal leftover is $\le 0$), then \`is_positive_definite(S)\` using it. Then **sample a correlated Gaussian**: \`sample(mu, S, n, seed)\` draws $\mathbf z$ of independent standard normals (\`random.Random(seed).gauss(0, 1)\`) and returns $n$ samples $\boldsymbol\mu + L\mathbf z$. The checks measure the samples' covariance and compare it with $S$.`,
    starter: py`import math, random

def cholesky(S):
    ...

def is_positive_definite(S):
    ...

def sample(mu, S, n=20000, seed=0):
    ...
`,
    solution: py`import math, random

def cholesky(S):
    n = len(S)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = S[i][j] - sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                if s <= 0:
                    return None
                L[i][i] = math.sqrt(s)
            else:
                L[i][j] = s / L[j][j]
    return L

def is_positive_definite(S):
    return cholesky(S) is not None

def sample(mu, S, n=20000, seed=0):
    rng = random.Random(seed)
    L = cholesky(S)
    out = []
    for _ in range(n):
        z = [rng.gauss(0, 1) for _ in mu]
        out.append([m + sum(L[i][k] * z[k] for k in range(len(mu))) for i, m in enumerate(mu)])
    return out
`,
    checks: checks(py`
L = cholesky([[4, 2], [2, 3]])
expect(L, [[2, 0], [1, math.sqrt(2)]], "cholesky([[4, 2], [2, 3]])")
expect(is_positive_definite([[1, 2], [2, 1]]), False, "is_positive_definite([[1, 2], [2, 1]])")
expect(is_positive_definite([[2, -1, 0], [-1, 2, -1], [0, -1, 2]]), True, "is_positive_definite of the tridiagonal (2, −1)")
S = [[2.0, 0.8], [0.8, 1.0]]
xs = sample([1.0, -2.0], S)
m = [sum(x[i] for x in xs) / len(xs) for i in range(2)]
cov = [[sum((x[i] - m[i]) * (x[j] - m[j]) for x in xs) / len(xs) for j in range(2)] for i in range(2)]
expect(m, [1.0, -2.0], "the sample mean", tol=0.03)
expect(cov, S, "the sample covariance", tol=0.05)
`),
    hints: ['$S_{ij} = \\sum_k L_{ik}L_{jk}$: solve for the one unknown entry at a time, row by row.', 'If $\\mathbf z$ has covariance $I$, then $L\\mathbf z$ has covariance $LIL^\\top = S$.'],
  },

  svd: {
    prompt: py`Using the given \`jacobi\` (eigenvalues and eigenvector **columns**), write \`svd(A)\`: eigen-decompose $A^\top A$, set $\sigma_i = \sqrt{\lambda_i}$, $\mathbf u_i = A\mathbf v_i/\sigma_i$, sorted by $\sigma$ (largest first), keeping $\sigma > 10^{-10}$. Return \`(us, sigmas, vs)\` as lists of vectors. The checks rebuild $A = \sum\sigma_i\mathbf u_i\mathbf v_i^\top$, confirm the $\mathbf u_i$ are orthonormal, and that $\max_{\|\mathbf x\|=1}\|A\mathbf x\| = \sigma_1$.`,
    starter: MM + py`import math

def jacobi(S, sweeps=30):
    n = len(S)
    A = [list(map(float, r)) for r in S]
    Q = [[float(i == j) for j in range(n)] for i in range(n)]
    for _ in range(sweeps):
        for p in range(n):
            for q in range(p + 1, n):
                if abs(A[p][q]) < 1e-15:
                    continue
                th = (A[q][q] - A[p][p]) / (2 * A[p][q])
                t = (1.0 if th >= 0 else -1.0) / (abs(th) + math.sqrt(th * th + 1))
                c = 1 / math.sqrt(t * t + 1)
                s = t * c
                for k in range(n):
                    A[k][p], A[k][q] = c * A[k][p] - s * A[k][q], s * A[k][p] + c * A[k][q]
                for k in range(n):
                    A[p][k], A[q][k] = c * A[p][k] - s * A[q][k], s * A[p][k] + c * A[q][k]
                for k in range(n):
                    Q[k][p], Q[k][q] = c * Q[k][p] - s * Q[k][q], s * Q[k][p] + c * Q[k][q]
    return [A[i][i] for i in range(n)], Q

def svd(A):
    ...
`,
    solution: MM + py`import math

def jacobi(S, sweeps=30):
    n = len(S)
    A = [list(map(float, r)) for r in S]
    Q = [[float(i == j) for j in range(n)] for i in range(n)]
    for _ in range(sweeps):
        for p in range(n):
            for q in range(p + 1, n):
                if abs(A[p][q]) < 1e-15:
                    continue
                th = (A[q][q] - A[p][p]) / (2 * A[p][q])
                t = (1.0 if th >= 0 else -1.0) / (abs(th) + math.sqrt(th * th + 1))
                c = 1 / math.sqrt(t * t + 1)
                s = t * c
                for k in range(n):
                    A[k][p], A[k][q] = c * A[k][p] - s * A[k][q], s * A[k][p] + c * A[k][q]
                for k in range(n):
                    A[p][k], A[q][k] = c * A[p][k] - s * A[q][k], s * A[p][k] + c * A[q][k]
                for k in range(n):
                    Q[k][p], Q[k][q] = c * Q[k][p] - s * Q[k][q], s * Q[k][p] + c * Q[k][q]
    return [A[i][i] for i in range(n)], Q

def svd(A):
    vals, Q = jacobi(matmul(transpose(A), A))
    vs = transpose(Q)
    order = sorted(range(len(vals)), key=lambda i: -vals[i])
    us, sigmas, out_vs = [], [], []
    for i in order:
        sigma = math.sqrt(max(vals[i], 0.0))
        if sigma > 1e-10:
            v = vs[i]
            Av = [sum(a * b for a, b in zip(row, v)) for row in A]
            us.append([x / sigma for x in Av])
            sigmas.append(sigma)
            out_vs.append(v)
    return us, sigmas, out_vs
`,
    checks: checks(py`
us, s, vs = svd([[3, 0], [4, 5]])
expect(s, [math.sqrt(45), math.sqrt(5)], "singular values of [[3, 0], [4, 5]]", tol=1e-9)
import random
rng = random.Random(3)
A = [[rng.uniform(-2, 2) for _ in range(3)] for _ in range(4)]
us, s, vs = svd(A)
rebuilt = [[sum(s[k] * us[k][i] * vs[k][j] for k in range(len(s))) for j in range(3)] for i in range(4)]
expect(rebuilt, A, "Σ σᵢ uᵢ vᵢᵀ compared with A", tol=1e-9)
for i in range(len(us)):
    for j in range(len(us)):
        expect(sum(a * b for a, b in zip(us[i], us[j])), float(i == j), f"u{i} · u{j}", tol=1e-9)
best = 0
for _ in range(3000):
    x = [rng.gauss(0, 1) for _ in range(3)]
    n = math.sqrt(sum(t * t for t in x))
    Ax = [sum(a * t / n for a, t in zip(row, x)) for row in A]
    best = max(best, math.sqrt(sum(t * t for t in Ax)))
assert best <= s[0] + 1e-9 and best > 0.97 * s[0], f"the largest stretch found, {best:.4f}, should approach σ₁ = {s[0]:.4f} without passing it"
`),
    hints: ['The eigenvectors are the **columns** of `Q`; `transpose(Q)` gives them as a list.', 'Sort the indices by eigenvalue, largest first, and build each $\\mathbf u_i$ from $A\\mathbf v_i$.'],
  },

  'matrix-norms-trace': {
    prompt: py`Write \`trace(A)\` and \`frobenius(A)\`. Then test three identities on random matrices: \`trace_swap_gap(A, B)\` $= |\text{tr}(AB) - \text{tr}(BA)|$ (for a $3\times5$ $A$ and $5\times3$ $B$!), \`trace_trick_gap(A, x)\` $= |\mathbf x^\top A\mathbf x - \text{tr}(A\mathbf x\mathbf x^\top)|$, and \`expected_quadratic(A, Sigma, n, seed)\`: the average of $\mathbf x^\top A\mathbf x$ over $n$ samples $\mathbf x$ with covariance $\Sigma$ (sample as $L\mathbf z$ with the given \`cholesky\`). The checks compare it with $\text{tr}(A\Sigma)$.`,
    starter: MM + py`import math, random

def cholesky(S):
    n = len(S)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = S[i][j] - sum(L[i][k] * L[j][k] for k in range(j))
            L[i][j] = math.sqrt(s) if i == j else s / L[j][j]
    return L

def trace(A):
    ...

def frobenius(A):
    ...

def trace_swap_gap(A, B):
    ...

def trace_trick_gap(A, x):
    ...

def expected_quadratic(A, Sigma, n=40000, seed=0):
    ...
`,
    solution: MM + py`import math, random

def cholesky(S):
    n = len(S)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = S[i][j] - sum(L[i][k] * L[j][k] for k in range(j))
            L[i][j] = math.sqrt(s) if i == j else s / L[j][j]
    return L

def trace(A):
    return sum(A[i][i] for i in range(len(A)))

def frobenius(A):
    return math.sqrt(sum(a * a for row in A for a in row))

def trace_swap_gap(A, B):
    return abs(trace(matmul(A, B)) - trace(matmul(B, A)))

def trace_trick_gap(A, x):
    quad = sum(x[i] * A[i][j] * x[j] for i in range(len(x)) for j in range(len(x)))
    xxT = [[a * b for b in x] for a in x]
    return abs(quad - trace(matmul(A, xxT)))

def expected_quadratic(A, Sigma, n=40000, seed=0):
    rng = random.Random(seed)
    L = cholesky(Sigma)
    d = len(Sigma)
    total = 0.0
    for _ in range(n):
        z = [rng.gauss(0, 1) for _ in range(d)]
        x = [sum(L[i][k] * z[k] for k in range(d)) for i in range(d)]
        total += sum(x[i] * A[i][j] * x[j] for i in range(d) for j in range(d))
    return total / n
`,
    checks: checks(py`
expect(trace([[1, 2], [3, 4]]), 5, "trace([[1, 2], [3, 4]])")
expect(frobenius([[1, 2], [3, 4]]), math.sqrt(30), "frobenius([[1, 2], [3, 4]])")
rng = random.Random(8)
A = [[rng.uniform(-1, 1) for _ in range(5)] for _ in range(3)]
B = [[rng.uniform(-1, 1) for _ in range(3)] for _ in range(5)]
assert trace_swap_gap(A, B) < 1e-12, "tr(AB) and tr(BA) should agree even for a 3 × 5 and a 5 × 3"
M = [[rng.uniform(-1, 1) for _ in range(4)] for _ in range(4)]
assert trace_trick_gap(M, [1.0, -2.0, 0.5, 3.0]) < 1e-12, "the trace trick should hold exactly"
Sigma = [[2.0, 0.5, 0.0], [0.5, 1.0, 0.3], [0.0, 0.3, 1.5]]
A3 = [[1.0, 2.0, 0.0], [0.0, -1.0, 1.0], [0.5, 0.0, 2.0]]
expect(expected_quadratic(A3, Sigma), trace(matmul(A3, Sigma)), "the average of xᵀAx compared with tr(AΣ)", tol=0.05)
`),
    hints: ['$\\text{tr}(A\\mathbf x\\mathbf x^\\top)$: build the outer product $\\mathbf x\\mathbf x^\\top$ first.', 'If $\\mathbf z$ is standard normal, $L\\mathbf z$ has covariance $LL^\\top = \\Sigma$.'],
  },

  'low-rank': {
    prompt: py`Given \`svd(A)\` (returns \`us, sigmas, vs\`, largest first), write \`truncate(A, k)\` $= \sum_{i\le k}\sigma_i\mathbf u_i\mathbf v_i^\top$ and \`error(A, B)\` $= \|A - B\|_F$. The checks confirm the error equals $\sqrt{\sum_{i>k}\sigma_i^2}$, and then test **Eckart–Young**: 2000 random rank-$k$ matrices $XY$ (shapes $m\times k$ and $k\times n$) never get closer to $A$ than your truncation.`,
    starter: MM + py`import math, random

def svd(A):
    # power iteration with deflation: good enough for small matrices
    m, n = len(A), len(A[0])
    R = [list(map(float, r)) for r in A]
    us, ss, vs = [], [], []
    for _ in range(min(m, n)):
        v = [1.0 / math.sqrt(n)] * n
        for _ in range(500):
            Av = [sum(a * b for a, b in zip(row, v)) for row in R]
            AtAv = [sum(R[i][j] * Av[i] for i in range(m)) for j in range(n)]
            nn = math.sqrt(sum(t * t for t in AtAv))
            if nn < 1e-14:
                break
            v = [t / nn for t in AtAv]
        Av = [sum(a * b for a, b in zip(row, v)) for row in R]
        s = math.sqrt(sum(t * t for t in Av))
        if s < 1e-10:
            break
        u = [t / s for t in Av]
        us.append(u); ss.append(s); vs.append(v)
        R = [[R[i][j] - s * u[i] * v[j] for j in range(n)] for i in range(m)]
    return us, ss, vs

def truncate(A, k):
    ...

def error(A, B):
    ...
`,
    solution: MM + py`import math, random

def svd(A):
    m, n = len(A), len(A[0])
    R = [list(map(float, r)) for r in A]
    us, ss, vs = [], [], []
    for _ in range(min(m, n)):
        v = [1.0 / math.sqrt(n)] * n
        for _ in range(500):
            Av = [sum(a * b for a, b in zip(row, v)) for row in R]
            AtAv = [sum(R[i][j] * Av[i] for i in range(m)) for j in range(n)]
            nn = math.sqrt(sum(t * t for t in AtAv))
            if nn < 1e-14:
                break
            v = [t / nn for t in AtAv]
        Av = [sum(a * b for a, b in zip(row, v)) for row in R]
        s = math.sqrt(sum(t * t for t in Av))
        if s < 1e-10:
            break
        u = [t / s for t in Av]
        us.append(u); ss.append(s); vs.append(v)
        R = [[R[i][j] - s * u[i] * v[j] for j in range(n)] for i in range(m)]
    return us, ss, vs

def truncate(A, k):
    us, ss, vs = svd(A)
    B = [[0.0] * len(A[0]) for _ in A]
    for u, s, v in list(zip(us, ss, vs))[:k]:
        for i in range(len(A)):
            for j in range(len(A[0])):
                B[i][j] += s * u[i] * v[j]
    return B

def error(A, B):
    return math.sqrt(sum((a - b) ** 2 for ra, rb in zip(A, B) for a, b in zip(ra, rb)))
`,
    checks: checks(py`
A = [[4.0, 1.0, 0.5, 2.0], [1.0, 3.0, 1.0, 0.0], [0.5, 1.0, 2.0, 1.0], [2.0, 0.0, 1.0, 1.0], [1.0, 1.0, 1.0, 1.0]]
_, ss, _ = svd(A)
for k in (1, 2, 3):
    expect(error(A, truncate(A, k)), math.sqrt(sum(s * s for s in ss[k:])), f"error at rank {k} compared with the dropped singular values", tol=1e-7)
best = error(A, truncate(A, 2))
rng = random.Random(11)
for _ in range(2000):
    X = [[rng.gauss(0, 1) for _ in range(2)] for _ in range(5)]
    Y = [[rng.gauss(0, 1) for _ in range(4)] for _ in range(2)]
    assert error(A, matmul(X, Y)) >= best - 1e-9, "a random rank-2 matrix beat the truncated SVD"
`),
    hints: ['Entry $(i, j)$ of $\\sigma\\mathbf u\\mathbf v^\\top$ is $\\sigma u_iv_j$.'],
  },

  'matrix-calculus': {
    prompt: py`Write \`grad_quadratic(A, x)\` $= (A + A^\top)\mathbf x$, \`grad_bilinear(a, b)\` $= \mathbf a\mathbf b^\top$ (the gradient of $\mathbf a^\top W\mathbf b$ with respect to $W$), and \`grad_lsq(W, x, y)\` $= 2(W\mathbf x - \mathbf y)\mathbf x^\top$. Also write \`numerical_grad_W(f, W)\`: nudge each entry of $W$ and return the matrix of partial derivatives, **with $W$'s shape**. The checks compare all three formulas with it.`,
    starter: py`def grad_quadratic(A, x):
    ...

def grad_bilinear(a, b):
    ...

def grad_lsq(W, x, y):
    ...

def numerical_grad_W(f, W, h=1e-6):
    ...
`,
    solution: py`def grad_quadratic(A, x):
    n = len(x)
    return [sum((A[k][j] + A[j][k]) * x[j] for j in range(n)) for k in range(n)]

def grad_bilinear(a, b):
    return [[ai * bj for bj in b] for ai in a]

def grad_lsq(W, x, y):
    r = [sum(w * xi for w, xi in zip(row, x)) - yi for row, yi in zip(W, y)]
    return [[2 * ri * xj for xj in x] for ri in r]

def numerical_grad_W(f, W, h=1e-6):
    G = []
    for i in range(len(W)):
        row = []
        for j in range(len(W[0])):
            up = [list(r) for r in W]
            dn = [list(r) for r in W]
            up[i][j] += h
            dn[i][j] -= h
            row.append((f(up) - f(dn)) / (2 * h))
        G.append(row)
    return G
`,
    checks: checks(py`
A = [[1.0, 2.0, 0.0], [0.0, 3.0, -1.0], [4.0, 0.5, 2.0]]
x = [1.0, -1.0, 2.0]
quad = lambda X: sum(X[0][i] * A[i][j] * X[0][j] for i in range(3) for j in range(3))
expect(grad_quadratic(A, x), numerical_grad_W(quad, [x])[0], "grad_quadratic compared with nudging", tol=1e-6)
a, b = [1.0, 2.0], [3.0, -1.0, 0.5]
W = [[0.2, -0.3, 1.0], [0.5, 0.1, -0.7]]
bil = lambda M: sum(a[i] * M[i][j] * b[j] for i in range(2) for j in range(3))
expect(grad_bilinear(a, b), numerical_grad_W(bil, W), "grad_bilinear compared with nudging", tol=1e-6)
y = [1.0, -2.0]
lsq = lambda M: sum((sum(m * xi for m, xi in zip(row, b)) - yi) ** 2 for row, yi in zip(M, y))
expect(grad_lsq(W, b, y), numerical_grad_W(lsq, W), "grad_lsq compared with nudging", tol=1e-5)
expect(len(grad_lsq(W, b, y)), 2, "the gradient's number of rows (W's shape)")
`),
    hints: ['Entry $k$ of the quadratic\'s gradient is $\\sum_j (A_{kj} + A_{jk})x_j$.', '`numerical_grad_W` needs fresh copies of $W$ for each nudge: `[list(r) for r in W]`.'],
  },

  tensors: {
    prompt: py`Write \`shape(t)\` for nested lists, \`broadcast_shape(s, t)\`: the result shape of an elementwise operation between tensors of shapes \`s\` and \`t\` (tuples), or \`None\` if they clash (line up from the right; sizes must match or be 1; missing axes count as 1), and \`einsum_ij_jk(A, B)\` computing $C_{ik} = A_{ij}B_{jk}$ with three explicit loops. The checks also confirm attention score shapes.`,
    starter: py`def shape(t):
    ...

def broadcast_shape(s, t):
    ...

def einsum_ij_jk(A, B):
    ...
`,
    solution: py`def shape(t):
    dims = []
    while isinstance(t, list):
        dims.append(len(t))
        t = t[0]
    return tuple(dims)

def broadcast_shape(s, t):
    n = max(len(s), len(t))
    s = (1,) * (n - len(s)) + tuple(s)
    t = (1,) * (n - len(t)) + tuple(t)
    out = []
    for a, b in zip(s, t):
        if a == b or a == 1 or b == 1:
            out.append(max(a, b))
        else:
            return None
    return tuple(out)

def einsum_ij_jk(A, B):
    C = [[0.0] * len(B[0]) for _ in A]
    for i in range(len(A)):
        for j in range(len(B)):
            for k in range(len(B[0])):
                C[i][k] += A[i][j] * B[j][k]
    return C
`,
    checks: checks(py`
expect(shape([[[1, 2, 3], [4, 5, 6]]] * 4), (4, 2, 3), "shape of 4 × 2 × 3")
expect(shape(7), (), "shape of a plain number")
expect(broadcast_shape((8, 128, 64), (64,)), (8, 128, 64), "(8, 128, 64) with (64,)")
expect(broadcast_shape((8, 128, 64), (128, 1)), (8, 128, 64), "(8, 128, 64) with (128, 1)")
expect(broadcast_shape((8, 128, 64), (128,)), None, "(8, 128, 64) with (128,)")
expect(broadcast_shape((32, 3, 224, 224), (3, 1, 1)), (32, 3, 224, 224), "per-channel normalisation")
expect(einsum_ij_jk([[1, 2], [3, 4]], [[0, 1], [1, 0]]), [[2, 1], [4, 3]], "einsum ij,jk->ik")
`),
    hints: ['Pad the shorter shape with 1s on the **left**, then compare position by position.'],
  },
}
