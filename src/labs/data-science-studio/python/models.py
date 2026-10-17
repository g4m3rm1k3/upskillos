"""Part 8 of Data Science Studio: models from data. Least squares for one input, then for several
in matrix form, solved by Gaussian elimination; reading a model; categories as columns; gradient
descent on the same loss; overfitting, ridge and cross-validation; logistic regression and its log
loss; and a column that leaks the answer. Plain Python, every sum a loop.
"""
import math

from data import Rng
from samples import day_of_year
from summary import mean, std, total


def least_squares(xs, ys):
    """The line y = a + b x with the smallest squared error, from the two normal equations: b is the
    sum of (x - mean x)(y - mean y) over the sum of (x - mean x) squared, and the line goes through
    the point of the two means. Returns [slope, intercept], as fit_line does."""
    mx, my = mean(xs), mean(ys)
    sxy = total([(x - mx) * (y - my) for x, y in zip(xs, ys)])
    sxx = total([(x - mx) ** 2 for x in xs])
    slope = sxy / sxx
    return [slope, my - slope * mx]


def weekday(date):
    """0 for Monday to 6 for Sunday, for a date of 2025 written YYYY-MM-DD. 1 January 2025 was a
    Wednesday, day 2 of the week, and each day after moves one on."""
    return (day_of_year(date) + 2) % 7


def design_matrix(rows, columns):
    """One row per data row: a 1 first, which the intercept multiplies, then the named columns as
    numbers."""
    return [[1.0] + [float(row[c]) for c in columns] for row in rows]


def transpose(m):
    """Rows become columns: the entry in row i, column j moves to row j, column i."""
    return [[m[i][j] for i in range(len(m))] for j in range(len(m[0]))]


def mat_mul(a, b):
    """The matrix product: the entry in row i, column j is row i of a times column j of b, added up."""
    out = []
    for i in range(len(a)):
        row = []
        for j in range(len(b[0])):
            s = 0.0
            for k in range(len(b)):
                s += a[i][k] * b[k][j]
            row.append(s)
        out.append(row)
    return out


def normal_equations(X, y):
    """The two sides of the normal equations, X^T X w = X^T y: the matrix X^T X and the list X^T y."""
    Xt = transpose(X)
    return [mat_mul(Xt, X), [row[0] for row in mat_mul(Xt, [[v] for v in y])]]


def solve(A, b):
    """w with A w = b, by Gaussian elimination. For each column: swap up the row with the largest
    entry there (the pivot), and take a multiple of it from every row below, so the column is 0
    under the pivot. Then solve from the last row up. None when a pivot is 0 (to within rounding):
    then one column can be made from the others, and there is no single answer."""
    n = len(A)
    M = [list(A[i]) + [b[i]] for i in range(n)]
    scale = max(abs(v) for row in A for v in row)
    for c in range(n):
        p = c
        for r in range(c + 1, n):
            if abs(M[r][c]) > abs(M[p][c]):
                p = r
        if abs(M[p][c]) <= 1e-12 * scale:
            return None
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for k in range(c, n + 1):
                M[r][k] -= f * M[c][k]
    w = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = M[i][n]
        for k in range(i + 1, n):
            s -= M[i][k] * w[k]
        w[i] = s / M[i][i]
    return w


def fit(X, y):
    """The least-squares weights: the normal equations, solved."""
    A, b = normal_equations(X, y)
    return solve(A, b)


def predict(X, w):
    """Each row's prediction: its inputs times the weights, added up."""
    return [total([x * v for x, v in zip(row, w)]) for row in X]


def r_squared(ys, predictions):
    """The share of the variation of y around its mean that the predictions account for: 1 minus
    the squared residuals over the squared distances from the mean."""
    m = mean(ys)
    left = total([(y - p) ** 2 for y, p in zip(ys, predictions)])
    spread = total([(y - m) ** 2 for y in ys])
    return 1 - left / spread


def one_hot(values, categories):
    """One column per category: 1 where the value is that category, 0 elsewhere. A list of rows,
    one per value."""
    return [[1.0 if v == c else 0.0 for c in categories] for v in values]


def standardise(column):
    """The column in standard units, with the mean and standard deviation used, so a weight found
    in standard units can be turned back: [values, mean, sd]."""
    m, s = mean(column), std(column)
    return [[(x - m) / s for x in column], m, s]


def gradient_descent(X, y, rate, steps):
    """Least squares by walking downhill: start with every weight 0 and, at each step, move the
    weights against the gradient of the mean squared error, 2/n X^T (X w - y), times the rate."""
    n, k = len(X), len(X[0])
    w = [0.0] * k
    for _ in range(steps):
        errors = [total([x * v for x, v in zip(row, w)]) - t for row, t in zip(X, y)]
        grad = [2 / n * total([errors[i] * X[i][j] for i in range(n)]) for j in range(k)]
        w = [w[j] - rate * grad[j] for j in range(k)]
    return w


def polynomial(xs, degree):
    """The design matrix of a curve: 1, x, x squared, up to x to the power degree, one row per x."""
    return [[x ** k for k in range(degree + 1)] for x in xs]


def rmse(ys, predictions):
    """The root mean squared error: the typical size of a miss, in the units of y."""
    return math.sqrt(mean([(y - p) ** 2 for y, p in zip(ys, predictions)]))


def ridge(X, y, lam):
    """Least squares with a penalty of lam times the sum of the squared weights, the intercept (the
    first weight) not penalised: the normal equations with lam added along the diagonal of X^T X,
    except its first entry."""
    A, b = normal_equations(X, y)
    for j in range(1, len(A)):
        A[j][j] += lam
    return solve(A, b)


def k_folds(n, k, seed):
    """The row numbers 0 to n - 1, shuffled with one generator, then dealt into k folds like cards:
    fold f gets every k-th row of the shuffled order, starting from place f."""
    rng = Rng(seed)
    order = list(range(n))
    for i in range(n - 1):
        j = i + rng.below(n - i)
        order[i], order[j] = order[j], order[i]
    return [order[f::k] for f in range(k)]


def group_folds(groups):
    """One fold per group: the row numbers with each group value, in the order the values first
    appear, so that a whole group is always held out together."""
    folds = {}
    for i, g in enumerate(groups):
        folds.setdefault(g, []).append(i)
    return list(folds.values())


def cross_validate(X, y, folds, lam=0.0):
    """The error on rows the model never saw: for each fold, fit (ridge, with lam) on every other
    row, predict the fold, and pool the squared misses of every fold into one root mean square."""
    squares, count = 0.0, 0
    for fold in folds:
        held = set(fold)
        train = [i for i in range(len(X)) if i not in held]
        w = ridge([X[i] for i in train], [y[i] for i in train], lam)
        for i in fold:
            squares += (total([x * v for x, v in zip(X[i], w)]) - y[i]) ** 2
            count += 1
    return math.sqrt(squares / count)


def sigmoid(z):
    """1 / (1 + e to the -z): any number squashed into a chance between 0 and 1."""
    return 1 / (1 + math.exp(-z))


def log_loss(ys, ps):
    """The mean of minus the log of the chance the model gave to what really happened: -log p for a
    yes (1), -log(1 - p) for a no (0)."""
    return mean([-math.log(p) if y == 1 else -math.log(1 - p) for y, p in zip(ys, ps)])


def logistic_fit(X, y, rate, steps):
    """Logistic regression by gradient descent on the log loss: start at 0 and, at each step, move
    each weight by the rate times the mean of (p - y) times its input, where p is the sigmoid of the
    row times the weights."""
    n, k = len(X), len(X[0])
    w = [0.0] * k
    for _ in range(steps):
        gaps = [sigmoid(total([x * v for x, v in zip(row, w)])) - t for row, t in zip(X, y)]
        w = [w[j] - rate * total([gaps[i] * X[i][j] for i in range(n)]) / n for j in range(k)]
    return w


def threshold_accuracy(xs, ys):
    """The best accuracy any single cut on x can reach, predicting 1 on one side and 0 on the
    other, either way round. A column that reaches 1.0 alone separates the answers perfectly: a
    reason to ask when its value is known."""
    pairs = sorted(zip(xs, ys))
    n = len(pairs)
    ones = total([y for _, y in pairs])
    best = max(ones, n - ones) / n
    below = 0
    for k in range(n - 1):
        below += pairs[k][1]
        if pairs[k][0] == pairs[k + 1][0]:
            continue
        left, right = k + 1, n - k - 1
        best = max(best, ((left - below) + (ones - below)) / n, (below + (right - ones + below)) / n)
    return best
