"""Arrows and tables: vectors and matrices as plain Python lists, every operation a loop you can read."""
import math


def add(u, v):
    """u + v: add matching entries."""
    return [a + b for a, b in zip(u, v)]


def scale(c, v):
    """c v: multiply every entry by the number c."""
    return [c * a for a in v]


def norm(v):
    """‖v‖: the length of the arrow, by Pythagoras: the square root of the sum of squares."""
    s = 0.0
    for a in v:
        s += a * a
    return math.sqrt(s)


def dot(u, v):
    """u · v = Σ u_i v_i: multiply matching entries and add."""
    s = 0.0
    for a, b in zip(u, v):
        s += a * b
    return s


def cosine(u, v):
    """cos θ = u · v / (‖u‖ ‖v‖): how much two arrows point the same way, from −1 to 1."""
    return dot(u, v) / (norm(u) * norm(v))


def matvec(A, x):
    """A x: one dot product per row of A. A neural-network layer before its activation."""
    return [dot(row, x) for row in A]


def transpose(A):
    """Aᵀ: rows become columns."""
    return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]


def matmul(A, B):
    """A B: entry (i, j) is row i of A dotted with column j of B. Doing B, then A."""
    columns = transpose(B)
    return [[dot(row, col) for col in columns] for row in A]


def det2(A):
    """The determinant of a 2×2 matrix: how much it scales areas (negative if it flips)."""
    return A[0][0] * A[1][1] - A[0][1] * A[1][0]


def inverse2(A):
    """The inverse of a 2×2 matrix: swap the diagonal, negate the rest, divide by the determinant."""
    d = det2(A)
    return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]]


def solve2(A, b):
    """Solve A x = b for x, by x = A⁻¹ b."""
    return matvec(inverse2(A), b)


def least_squares(xs, ys):
    """The best line y = w x + c through points that no line fits exactly: solve XᵀX θ = Xᵀ y."""
    X = [[x, 1.0] for x in xs]
    Xt = transpose(X)
    return solve2(matmul(Xt, X), matvec(Xt, ys))


def eigen2(A):
    """The eigenvalues of a symmetric 2×2 matrix: the λ that solve det(A − λI) = 0, a quadratic."""
    trace = A[0][0] + A[1][1]
    d = det2(A)
    root = math.sqrt(trace * trace / 4 - d)
    return trace / 2 + root, trace / 2 - root


def eigenvector2(A, lam):
    """A direction v with A v = λ v, for a symmetric 2×2 A, scaled to length 1."""
    if abs(A[0][1]) > 1e-12:
        v = [A[0][1], lam - A[0][0]]
    else:
        v = [1.0, 0.0] if abs(lam - A[0][0]) < 1e-12 else [0.0, 1.0]
    return scale(1 / norm(v), v)


def total_derivative(grad, path, velocity, t):
    """d/dt f(path(t)) by the multivariable chain rule: ∇f at the point, dotted with the path's velocity."""
    return dot(grad(path(t)), velocity(t))


def jacobian(f, x, h=1e-6):
    """J[i][j] = ∂fᵢ/∂xⱼ, built column by column: nudge input j and see how every output moves."""
    columns = []
    for j in range(len(x)):
        up = list(x)
        down = list(x)
        up[j] += h
        down[j] -= h
        columns.append([(a - b) / (2 * h) for a, b in zip(f(up), f(down))])
    return transpose(columns)


def softmax_jacobian(p):
    """The softmax's Jacobian, from its output p: entry (i, j) is pᵢ(𝟙[i = j] − pⱼ), the matrix diag(p) − p pᵀ."""
    return [[p[i] * ((1.0 if i == j else 0.0) - p[j]) for j in range(len(p))] for i in range(len(p))]


def hessian(f, x, h=1e-4):
    """H[i][j] = ∂²f/∂xᵢ∂xⱼ: the Jacobian of the gradient."""
    def grad(point):
        g = []
        for i in range(len(point)):
            up = list(point)
            down = list(point)
            up[i] += h
            down[i] -= h
            g.append((f(up) - f(down)) / (2 * h))
        return g
    return jacobian(grad, x, h)


def show_linalg():
    """Every operation of Part 3 on small examples."""
    u, v = [3.0, 4.0], [4.0, -3.0]
    print("u + v:", add(u, v), " ‖u‖:", norm(u), " u·v:", dot(u, v))
    A = [[2.0, 1.0], [1.0, 3.0]]
    print("A u:", matvec(A, u), " det A:", det2(A), " A⁻¹:", inverse2(A))
    print("best line through (0,1), (1,3), (2,4):", least_squares([0, 1, 2], [1, 3, 4]))
    print("eigenvalues of A:", eigen2(A))
