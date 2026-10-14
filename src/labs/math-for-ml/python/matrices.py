"""More linear algebra, every algorithm a loop you can read: coordinates in a basis, Gaussian
elimination, rank, determinants, projections and Gram–Schmidt, orthogonal matrices, the spectral
theorem by Jacobi rotations, positive definiteness by Cholesky, the SVD, low-rank approximation,
the trace and the Frobenius norm, and tensors with broadcasting."""
import math

from linalg import dot, norm, transpose, matmul, matvec


def row_reduce(A, tol=1e-12):
    """Row echelon form by elimination, for a matrix of any shape: the reduced rows and the pivot columns."""
    M = [list(row) for row in A]
    rows, cols = len(M), len(M[0])
    pivots = []
    r = 0
    for c in range(cols):
        if r == rows:
            break
        best = max(range(r, rows), key=lambda i: abs(M[i][c]))
        if abs(M[best][c]) < tol:
            continue
        M[r], M[best] = M[best], M[r]
        for i in range(r + 1, rows):
            factor = M[i][c] / M[r][c]
            M[i] = [a - factor * p for a, p in zip(M[i], M[r])]
        pivots.append(c)
        r += 1
    return M, pivots


def solve(A, b):
    """Solve A x = b for a square invertible A: eliminate on [A | b], then substitute back from the last row."""
    M, _ = row_reduce([list(row) + [bi] for row, bi in zip(A, b)])
    n = len(A)
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / M[i][i]
    return x


def coordinates(basis, v):
    """The coefficients c with c₁b₁ + … + cₙbₙ = v: solve the system whose columns are the basis vectors."""
    return solve(transpose(basis), v)


def elimination_cost(n):
    """Multiply-and-subtract steps that elimination performs on an n × n matrix: (n³ − n)/3."""
    count = 0
    for c in range(n):
        count += (n - c - 1) * (n - c)
    return count


def rank(A):
    """The number of pivots: how many independent rows (and columns) the matrix really has."""
    return len(row_reduce(A)[1])


def determinant(A):
    """det A by elimination: the product of the pivots, with a sign flip for every row swap."""
    M = [list(row) for row in A]
    n = len(M)
    d = 1.0
    for c in range(n):
        best = max(range(c, n), key=lambda i: abs(M[i][c]))
        if M[best][c] == 0:
            return 0.0
        if best != c:
            M[c], M[best] = M[best], M[c]
            d = -d
        d *= M[c][c]
        for i in range(c + 1, n):
            factor = M[i][c] / M[c][c]
            M[i] = [a - factor * p for a, p in zip(M[i], M[c])]
    return d


def project(v, u):
    """The shadow of v on the line through u: (v·u / u·u) u."""
    k = dot(v, u) / dot(u, u)
    return [k * a for a in u]


def gram_schmidt(vectors):
    """Independent vectors in, perpendicular unit vectors out, spanning the same space."""
    basis = []
    for v in vectors:
        w = list(v)
        for q in basis:
            shadow = project(w, q)
            w = [a - b for a, b in zip(w, shadow)]
        length = norm(w)
        basis.append([a / length for a in w])
    return basis


def is_orthogonal(Q, tol=1e-9):
    """Whether QᵀQ = I: every column has length 1 and every pair of columns is perpendicular."""
    QtQ = matmul(transpose(Q), Q)
    n = len(QtQ)
    return all(abs(QtQ[i][j] - (1.0 if i == j else 0.0)) < tol for i in range(n) for j in range(n))


def reflection(u):
    """The mirror across the plane perpendicular to the unit vector u: I − 2 u uᵀ."""
    n = len(u)
    return [[(1.0 if i == j else 0.0) - 2 * u[i] * u[j] for j in range(n)] for i in range(n)]


def symmetric_eigen(S, sweeps=30):
    """Eigenvalues (largest first) and unit eigenvectors of a symmetric matrix, by Jacobi rotations."""
    n = len(S)
    A = [list(row) for row in S]
    V = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
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
                    akp, akq = A[k][p], A[k][q]
                    A[k][p] = c * akp - s * akq
                    A[k][q] = s * akp + c * akq
                for k in range(n):
                    apk, aqk = A[p][k], A[q][k]
                    A[p][k] = c * apk - s * aqk
                    A[q][k] = s * apk + c * aqk
                for k in range(n):
                    vkp, vkq = V[k][p], V[k][q]
                    V[k][p] = c * vkp - s * vkq
                    V[k][q] = s * vkp + c * vkq
    pairs = sorted(zip([A[i][i] for i in range(n)], transpose(V)), key=lambda pair: -pair[0])
    return [lam for lam, _ in pairs], [vec for _, vec in pairs]


def quadratic_form(S, v):
    """vᵀ S v: the number a symmetric matrix assigns to a direction."""
    return dot(v, matvec(S, v))


def cholesky(S):
    """S = L Lᵀ with L lower-triangular. It succeeds exactly when S is positive definite; otherwise None."""
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


def svd(A):
    """A = Σ σᵢ uᵢ vᵢᵀ: vᵢ are eigenvectors of AᵀA, σᵢ the square roots of its eigenvalues, and uᵢ = A vᵢ / σᵢ."""
    values, vectors = symmetric_eigen(matmul(transpose(A), A))
    us, sigmas, vs = [], [], []
    for lam, v in zip(values, vectors):
        sigma = math.sqrt(max(lam, 0.0))
        if sigma > 1e-10:
            sigmas.append(sigma)
            vs.append(v)
            us.append([a / sigma for a in matvec(A, v)])
    return us, sigmas, vs


def low_rank(A, k):
    """The best rank-k approximation of A: keep the k largest terms σᵢ uᵢ vᵢᵀ of the SVD."""
    us, sigmas, vs = svd(A)
    B = [[0.0] * len(A[0]) for _ in A]
    for u, s, v in list(zip(us, sigmas, vs))[:k]:
        for i in range(len(A)):
            for j in range(len(A[0])):
                B[i][j] += s * u[i] * v[j]
    return B


def trace(A):
    """tr A: the sum of the diagonal."""
    return sum(A[i][i] for i in range(len(A)))


def frobenius(A):
    """‖A‖_F: the length of A treated as one long vector of all its entries."""
    return math.sqrt(sum(a * a for row in A for a in row))


def quadratic_gradient(A, x):
    """The gradient of xᵀ A x, derived entry by entry: (A + Aᵀ) x."""
    return [a + b for a, b in zip(matvec(A, x), matvec(transpose(A), x))]


def shape(t):
    """The shape of a nested list: (2, 3) for 2 rows of 3, (4, 2, 3) for 4 of those."""
    dims = []
    while isinstance(t, list):
        dims.append(len(t))
        t = t[0]
    return tuple(dims)


def add_bias(rows, b):
    """Broadcasting: add the vector b to every row, as X + b does in NumPy or PyTorch."""
    return [[x + bi for x, bi in zip(row, b)] for row in rows]


def batch_matmul(As, Bs):
    """A batch of matrix products, one per pair: shapes (B, m, n) and (B, n, p) give (B, m, p)."""
    return [matmul(A, B) for A, B in zip(As, Bs)]


def show_matrices():
    """Each tool of the linear-algebra additions on a small example."""
    A = [[2.0, 1.0, -1.0], [-3.0, -1.0, 2.0], [-2.0, 1.0, 2.0]]
    print("solve A x = (8, -11, -3):", solve(A, [8.0, -11.0, -3.0]))
    print("rank of a matrix with a repeated row:", rank([[1.0, 2.0], [2.0, 4.0]]), " det A:", determinant(A))
    print("Gram–Schmidt on (1, 1, 0), (1, 0, 1):", gram_schmidt([[1.0, 1.0, 0.0], [1.0, 0.0, 1.0]]))
    S = [[4.0, 1.0, 0.0], [1.0, 3.0, 1.0], [0.0, 1.0, 2.0]]
    print("eigenvalues of S:", symmetric_eigen(S)[0], " Cholesky works:", cholesky(S) is not None)
    print("singular values of [[3, 0], [4, 5]]:", svd([[3.0, 0.0], [4.0, 5.0]])[1])
    print("trace and Frobenius norm of S:", trace(S), frobenius(S))
