// Runnable notebook cells for Lab 03. Each lesson's notebook starts from the same
// four builds as the lesson text and the first three playground views.
const TABLE = {
  title: 'The four builds',
  prose: 'Size in GB, files in hundreds, time in minutes — the same table as the lesson and the playground. **Before running:** predict the shape of `X`.',
  code: `import numpy as np

size  = np.array([1., 2., 3., 4.])        # GB
files = np.array([1., 4., 2., 3.])        # hundreds of files
y     = np.array([6.2, 12.1, 12.8, 17.1]) # measured minutes: the target, kept out of X

X = np.column_stack([np.ones(4), size, files])   # columns: ones, size, files
w = np.array([1., 2., 2.])                        # [b, w1, w2]
print(X)
print("X.shape =", X.shape, "  w.shape =", w.shape, "  y.shape =", y.shape)`,
}

const MSE = {
  title: 'Helpers',
  prose: 'The loss and its gradient, exactly as in the lesson.',
  code: `def mse(w):
    e = X @ w - y
    return np.mean(e ** 2)

def grad(w):
    e = X @ w - y
    return 2 / len(y) * X.T @ e`,
}

export const notebooks = {
  'l03-design': {
    title: 'Lab 03.1 · Rows, columns and one prediction',
    intro: 'Build the design matrix, compute one row’s prediction by hand and with NumPy, and see which predictions move when one weight changes. Predict each output before you run the cell.',
    cells: [TABLE, {
      title: 'One row by hand, then with NumPy',
      prose: 'Row 2 (counting from 0) is build C. Both lines should print the same number.',
      code: `by_hand = 1 * 1 + 3 * 2 + 2 * 2      # 1·b + size·w1 + files·w2
print("by hand:", by_hand)
print("X[2] @ w:", X[2] @ w)
print("error for C (prediction − target):", X[2] @ w - y[2])`,
    }, {
      title: 'Change one weight',
      prose: '**Predict first:** if w2 (minutes per hundred files) rises by 1, which build’s prediction rises most, and by how much?',
      code: `before = X @ w
w_new = w.copy()
w_new[2] += 1                        # raise w2 by 1
change = X @ w_new - before
print("change in each prediction:", change)
print("files column:             ", X[:, 2])   # the same numbers — why?`,
    }, {
      title: 'The silent shape mistake',
      prose: 'A column of predictions, shape (4, 1), minus targets of shape (4,). Predict the result’s shape.',
      code: `pred_col = (X @ w).reshape(-1, 1)
print((pred_col - y).shape)          # broadcasting makes every pair
print((X @ w - y).shape)             # what we wanted`,
    }],
  },
  'l03-matmul': {
    title: 'Lab 03.2 · Matrix multiplication is many dot products',
    intro: 'Write `X @ w` as a loop once, check it matches, and see what the shape rule, `*` and the transpose do.',
    cells: [TABLE, {
      title: 'A loop over rows equals X @ w',
      prose: 'Each entry of `X @ w` is one row’s dot product with w.',
      code: `loop = np.array([sum(X[i, j] * w[j] for j in range(3)) for i in range(4)])
print("loop  :", loop)
print("X @ w :", X @ w)
print("equal:", np.allclose(loop, X @ w))`,
    }, {
      title: 'The shape rule',
      prose: 'Inner dimensions must match. **Predict** which of these three lines fails.',
      code: `print((X @ w).shape)           # (4, 3) @ (3,)
print((X.T @ y).shape)         # (3, 4) @ (4,)
try:
    X @ y                      # (4, 3) @ (4,)
except ValueError as err:
    print("error:", err)`,
    }, {
      title: '`*` is not `@`',
      prose: '`X * w` multiplies matching entries but never adds. Summing each row recovers `X @ w`.',
      code: `print(X * w)                   # shape (4, 3)
print((X * w).sum(axis=1))     # the same as X @ w`,
    }, {
      title: 'The transpose: one dot product per column',
      prose: '**Predict** `X.T @ [1, 1, 1, 1]` before running. What does each entry mean?',
      code: `print(X.T.shape)
print(X.T @ np.ones(4))        # column sums
print(X.T @ np.array([1., 0., 0., 1.]))`,
    }],
  },
  'l03-gradient': {
    title: 'Lab 03.3 · The gradient in matrix form',
    intro: 'Compute the gradient one column at a time, then as `Xᵀe`, check it with a nudge, and take gradient steps at a stable and an unstable learning rate.',
    cells: [TABLE, MSE, {
      title: 'One column at a time, then all at once',
      prose: 'Entry j is `2·mean(e·X[:, j])`. `X.T @ e` does every column in one line.',
      code: `e = X @ w - y
print("errors e:", e)
by_column = np.array([2 * np.mean(e * X[:, j]) for j in range(3)])
print("column by column:", by_column)
print("2/n · X.T @ e   :", grad(w))`,
    }, {
      title: 'Check one entry with a nudge',
      prose: 'The gradient predicts the change in MSE for a small change in one weight. Compare prediction and measurement, then try a smaller eps.',
      code: `eps = 0.01
u = np.array([0., 1., 0.])            # nudge w1 only
predicted = grad(w)[1] * eps
measured = mse(w + eps * u) - mse(w)
centered = (mse(w + eps * u) - mse(w - eps * u)) / (2 * eps)
print("predicted change:", predicted, "  measured:", measured)
print("centered estimate of the entry:", centered, "  formula:", grad(w)[1])`,
    }, {
      title: 'Gradient descent: a stable and an unstable rate',
      prose: '**Predict** which rate diverges. Then change `alpha` and find the boundary yourself (Lesson 03.8 derives it: about 0.066 here).',
      code: `for alpha in [0.02, 0.07]:
    w_k = w.copy()
    for step in range(60):
        w_k = w_k - alpha * grad(w_k)
    print(f"alpha={alpha}: w = {np.round(w_k, 3)},  MSE = {mse(w_k):.4g}")
print("least squares:", np.round(np.linalg.lstsq(X, y, rcond=None)[0], 3))`,
    }],
  },
  'l03-bowl': {
    title: 'Lab 03.4 · The loss as a bowl',
    intro: 'Evaluate the MSE on a grid of weights and find the lowest point, then check that the gradient is perpendicular to the contour it starts on.',
    cells: [{
      title: 'Centered data: two weights, one bowl',
      prose: 'Center both features so the best intercept is simply the mean of y. Then the loss depends only on (w1, w2).',
      code: `import numpy as np
size  = np.array([1., 2., 3., 4.])
files = np.array([1., 4., 2., 3.])
y     = np.array([6.2, 12.1, 12.8, 17.1])
Xc = np.column_stack([size - size.mean(), files - files.mean()])
yc = y - y.mean()

def J(w1, w2):
    return np.mean((Xc @ np.array([w1, w2]) - yc) ** 2)

grid = np.linspace(-1, 5, 61)
Z = np.array([[J(a, b) for a in grid] for b in grid])
i, k = np.unravel_index(Z.argmin(), Z.shape)
print("lowest grid point: w1 =", grid[k], " w2 =", grid[i], " MSE =", round(Z.min(), 4))
print("least squares     :", np.linalg.lstsq(Xc, yc, rcond=None)[0])`,
    }, {
      title: 'The gradient is perpendicular to the contour',
      prose: 'Walk a tiny bit along the contour (the direction perpendicular to the gradient): the loss barely changes. Walk along the gradient: it changes fast.',
      code: `w = np.array([0., 0.])
g = 2 / len(yc) * Xc.T @ (Xc @ w - yc)
along_contour = np.array([-g[1], g[0]]) / np.linalg.norm(g)
along_grad = g / np.linalg.norm(g)
h = 1e-3
print("change along contour :", J(*(w + h * along_contour)) - J(*w))
print("change along gradient:", J(*(w + h * along_grad)) - J(*w))`,
    }],
  },
  'l03-projection': {
    title: 'Lab 03.5 · Least squares is a projection',
    intro: 'Solve the normal equations stably, verify that the residual is orthogonal to every column, and see that adding a useless column never raises training error.',
    cells: [TABLE, {
      title: 'Solve, then check orthogonality',
      prose: 'At the least-squares solution, `X.T @ e` should be zero (up to rounding) — one zero per column.',
      code: `w_star, *_ = np.linalg.lstsq(X, y, rcond=None)
e = X @ w_star - y
print("w* =", w_star)
print("X.T @ e =", X.T @ e)          # sum of e, sum of e·size, sum of e·files
print("mean residual:", e.mean())`,
    }, {
      title: 'A random column can only lower training error',
      prose: '**Predict** whether training MSE goes up or down when a column of pure noise is added.',
      code: `rng = np.random.default_rng(0)
X_noise = np.column_stack([X, rng.normal(size=4)])
for name, M in [("original", X), ("with noise column", X_noise)]:
    w_hat, *_ = np.linalg.lstsq(M, y, rcond=None)
    print(f"{name:18s} training MSE = {np.mean((M @ w_hat - y) ** 2):.6f}")`,
    }],
  },
  'l03-rank': {
    title: 'Lab 03.6 · Rank and collinearity',
    intro: 'Build an exact duplicate column and a near duplicate, and compare what happens to rank, weights and predictions.',
    cells: [{
      title: 'An exact duplicate: rank drops, predictions do not care',
      prose: 'Size in MB and the same size in KB. Many weight pairs give identical predictions.',
      code: `import numpy as np
mb = np.array([1., 2., 3., 4., 5.])
kb = 1024 * mb
y = 2 * mb + np.array([0.1, -0.2, 0.0, 0.2, -0.1])
X = np.column_stack([np.ones(5), mb, kb])
print("rank:", np.linalg.matrix_rank(X), "of", X.shape[1], "columns")
for w in [np.array([0, 2, 0]), np.array([0, 0, 2 / 1024]), np.array([0, 1, 1 / 1024])]:
    print(w, "→ predictions", np.round(X @ w, 3))`,
    }, {
      title: 'A near duplicate: weights swing, predictions stay',
      prose: 'Refit on resampled rows. **Predict** which varies more across refits: the individual weights or the predictions.',
      code: `rng = np.random.default_rng(1)
n = 60
x1 = rng.normal(size=n)
x2 = x1 + 0.05 * rng.normal(size=n)        # nearly the same feature
y = 3 * x1 + 2 * x2 + rng.normal(size=n)
X = np.column_stack([np.ones(n), x1, x2])
fits = []
for _ in range(5):
    idx = rng.integers(0, n, n)
    fits.append(np.linalg.lstsq(X[idx], y[idx], rcond=None)[0])
for f in fits:
    print("w1 = %6.2f  w2 = %6.2f  w1 + w2 = %5.2f   prediction at x1=x2=1: %5.2f" % (f[1], f[2], f[1] + f[2], f @ [1, 1, 1]))`,
    }],
  },
  'l03-scaling': {
    title: 'Lab 03.7 · Units, step sizes and standardization',
    intro: 'Find the stable learning rate for one feature from mean(x²), watch it collapse when the units change, and standardize with training statistics.',
    cells: [{
      title: 'One feature: the stable rate is 1 / mean(x²)',
      prose: 'Each step multiplies the distance to the best w by (1 − 2α·mean(x²)). Here mean(x²) = 4.5, so the limit is 1/4.5 ≈ 0.222. **Predict** which of the three rates converge.',
      code: `import numpy as np
x = np.array([2., -2., 1., 3.])           # mean(x²) = (4 + 4 + 1 + 9) / 4
print("mean(x²) =", np.mean(x ** 2))
y = 2 * x
limit = 1 / np.mean(x ** 2)
for alpha in [0.5 * limit, 0.99 * limit, 1.05 * limit]:
    w = 0.0
    for _ in range(50):
        w -= alpha * 2 * np.mean(x * (w * x - y))
    print(f"alpha = {alpha:.4f}  →  w after 50 steps = {w:.4g}")`,
    }, {
      title: 'Change the units: the limit moves by a factor of a million',
      prose: 'The same feature in KB instead of MB (×1000).',
      code: `x_kb = 1000 * x
print("stable rate in MB:", 1 / np.mean(x ** 2))
print("stable rate in KB:", 1 / np.mean(x_kb ** 2))`,
    }, {
      title: 'Standardize with training statistics only',
      prose: 'Learn the mean and standard deviation on the training rows; reuse them unchanged on new rows.',
      code: `train = np.array([[40., 1200.], [55., 900.], [70., 2100.], [35., 700.]])
new   = np.array([[60., 1500.]])
m, s = train.mean(axis=0), train.std(axis=0)
z_train = (train - m) / s
z_new = (new - m) / s                     # never recompute m, s on new data
print("train means after scaling:", z_train.mean(axis=0).round(6), " stds:", z_train.std(axis=0))
print("new row, scaled:", z_new)`,
    }],
  },
  'l03-conditioning': {
    title: 'Lab 03.8 · Curvature, eigenvalues and κ',
    intro: 'Check the eigenvectors of a 2×2 curvature matrix by hand, then confirm that the stable rate is 1/λmax and that the flattest direction sets the speed.',
    cells: [{
      title: 'Eigenvectors of A = [[1, 0.9], [0.9, 1]]',
      prose: '**Predict** A @ (1, 1) and A @ (1, −1) before running.',
      code: `import numpy as np
A = np.array([[1., 0.9], [0.9, 1.]])
for v in [np.array([1., 1.]), np.array([1., -1.])]:
    print(v, "→", A @ v)
vals, vecs = np.linalg.eigh(A)
print("eigenvalues:", vals, "  kappa =", vals.max() / vals.min())`,
    }, {
      title: 'Gradient descent in each eigen-direction',
      prose: 'Start at distance 1 from the minimum along each eigenvector. The distance is multiplied by (1 − 2αλ) per step.',
      code: `alpha = 0.4
for lam in vals:
    factor = 1 - 2 * alpha * lam
    steps_for_10x = np.log(10) / -np.log(abs(factor))
    print(f"lambda = {lam:.2f}: factor per step {factor:+.2f}, about {steps_for_10x:.1f} steps per factor of 10")
print("stable while alpha <", 1 / vals.max())`,
    }],
  },
}
