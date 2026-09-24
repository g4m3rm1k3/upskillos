export default {
  filename: 'interpret.py', packages: ['numpy'],
  title: 'Model-agnostic explanations, checked against models whose answers are known.',
  intro: 'Implement permutation importance, ICE curves, exact Shapley values and a local linear surrogate. Each method only calls `predict`, so it works for any model. The checks use models simple enough that the right explanation is known in closed form, including a model with an interaction and a feature the model ignores.',
  steps: [
    '`permutation_importance(predict, X, y, n_repeats=5, seed=0)` → array of the mean rise in mean squared error when each column is shuffled. `predict` maps an (n, d) array to n predictions.',
    '`ice_curves(predict, X, j, grid)` → an (n, len(grid)) array whose row i is the prediction for row i with feature j set to each grid value. The partial dependence is its column mean.',
    '`shapley_values(predict, x, background)` → exact interventional Shapley values for one input x: v(S) averages predict over the background rows with the features in S replaced by x’s values.',
    '`local_surrogate(predict, x, width, n=2000, seed=0)` → (intercept, slopes) of a weighted linear fit to predictions at z = x + standard normal noise, with weights exp(−‖z − x‖²/width²).',
  ],
  hints: [
    ['Enumerating coalitions', 'Loop over the integers 0 … 2^d − 1 and treat bit k as “feature k is known”. The weight of a coalition of size s that excludes j is s!(d − s − 1)!/d!.'],
    ['Weighted least squares', 'Multiply each row of [1, z − x] and each target by √w, then call np.linalg.lstsq.'],
  ],
  starter: `import numpy as np
from math import factorial

def permutation_importance(predict, X, y, n_repeats=5, seed=0):
    raise NotImplementedError

def ice_curves(predict, X, j, grid):
    raise NotImplementedError

def shapley_values(predict, x, background):
    raise NotImplementedError

def local_surrogate(predict, x, width, n=2000, seed=0):
    raise NotImplementedError
`,
  solution: `import numpy as np
from math import factorial

def permutation_importance(predict, X, y, n_repeats=5, seed=0):
    rng = np.random.default_rng(seed)
    base = np.mean((predict(X) - y) ** 2)
    out = np.zeros(X.shape[1])
    for j in range(X.shape[1]):
        rises = []
        for _ in range(n_repeats):
            Xp = X.copy()
            Xp[:, j] = rng.permutation(Xp[:, j])
            rises.append(np.mean((predict(Xp) - y) ** 2) - base)
        out[j] = np.mean(rises)
    return out

def ice_curves(predict, X, j, grid):
    out = np.zeros((len(X), len(grid)))
    for k, v in enumerate(grid):
        Xv = X.copy()
        Xv[:, j] = v
        out[:, k] = predict(Xv)
    return out

def shapley_values(predict, x, background):
    d = len(x)
    def value(S):
        B = background.copy()
        for k in range(d):
            if S >> k & 1:
                B[:, k] = x[k]
        return predict(B).mean()
    v = [value(S) for S in range(1 << d)]
    phi = np.zeros(d)
    for j in range(d):
        for S in range(1 << d):
            if S >> j & 1:
                continue
            s = bin(S).count("1")
            weight = factorial(s) * factorial(d - s - 1) / factorial(d)
            phi[j] += weight * (v[S | 1 << j] - v[S])
    return phi

def local_surrogate(predict, x, width, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    Z = x + rng.normal(size=(n, len(x)))
    w = np.exp(-np.sum((Z - x) ** 2, axis=1) / width ** 2)
    A = np.column_stack([np.ones(n), Z - x]) * np.sqrt(w)[:, None]
    coef = np.linalg.lstsq(A, predict(Z) * np.sqrt(w), rcond=None)[0]
    return coef[0], coef[1:]
`,
  solutionNote: 'None of these functions looks inside the model. That is their strength, since they work for any predictor, and their weakness: they query the model at inputs that may never occur in real data.',
  checkSummary: 'Permutation importance of a linear model matches 2β²Var(x) and is zero for an ignored feature; centred ICE curves coincide for an additive model and fan out for an interaction, and their mean is the partial dependence; Shapley values of a linear model equal β(x − mean of background), add up to the prediction minus the baseline, and split an interaction equally; a local surrogate recovers the slope of a smooth function at a point, and on a staircase-shaped model (like a tree ensemble) its explanation gets far noisier across seeds as the kernel narrows.',
  checks: `
import numpy as np
rng = np.random.default_rng(59)
beta = np.array([2.0, -1.0, 0.0])
sd = np.array([1.0, 3.0, 2.0])
X = rng.normal(size=(20000, 3)) * sd
lin = lambda A: A @ beta
imp = permutation_importance(lin, X, lin(X), n_repeats=2)
expected = 2 * beta ** 2 * sd ** 2
print("importance", np.round(imp, 2), "| expected 2*beta^2*var", expected)
assert np.allclose(imp, expected, rtol=0.05, atol=1e-9), "linear importance should be 2*beta^2*var(x)"
assert abs(imp[2]) < 1e-9, "a feature the model ignores has zero importance"
print("PASS: permutation importance of a linear model")

grid = np.linspace(-2, 2, 9)
Xs = rng.normal(size=(50, 2))
add = lambda A: np.sin(A[:, 0]) + A[:, 1] ** 2
ice = ice_curves(add, Xs, 0, grid)
c = ice - ice[:, :1]
assert ice.shape == (50, 9) and np.allclose(c, c[0]), "additive model: centred ICE curves coincide"
inter = lambda A: A[:, 0] * A[:, 1]
ice2 = ice_curves(inter, Xs, 0, grid)
slopes = (ice2[:, -1] - ice2[:, 0]) / 4
assert np.allclose(slopes, Xs[:, 1]), "interaction: each ICE slope equals the other feature"
assert np.allclose(ice2.mean(0), grid * Xs[:, 1].mean()), "PD is the average of the ICE curves"
print("PASS: ICE curves and partial dependence")

bg = rng.normal(size=(40, 3))
x = np.array([1.5, -0.5, 2.0])
phi = shapley_values(lin, x, bg)
assert np.allclose(phi, beta * (x - bg.mean(0))), "linear model: phi_j = beta_j * (x_j - background mean)"
assert abs(phi[2]) < 1e-12, "dummy axiom"
f3 = lambda A: 3 * A[:, 0] + A[:, 1] + 2 * A[:, 0] * A[:, 1] + 0 * A[:, 2]
zero = np.zeros((1, 3))
phi3 = shapley_values(f3, np.array([1.0, 2.0, 5.0]), zero)
print("phi with interaction", np.round(phi3, 3))
assert np.allclose(phi3, [3 + 2, 2 + 2, 0]), "the interaction 2ab = 4 is split equally"
assert np.isclose(phi3.sum(), f3(np.array([[1.0, 2.0, 5.0]]))[0] - f3(zero)[0]), "efficiency"
print("PASS: Shapley values (linearity, dummy, symmetry of the interaction, efficiency)")

smooth = lambda A: np.sin(A[:, 0]) + 0.5 * A[:, 1] ** 2
x0 = np.array([0.3, 1.0])
b0, slopes = local_surrogate(smooth, x0, width=0.3)
print("local slopes", np.round(slopes, 3), "| true gradient", np.round([np.cos(0.3), 1.0], 3))
assert np.allclose(slopes, [np.cos(0.3), 1.0], atol=0.05) and abs(b0 - smooth(x0[None])[0]) < 0.02
# A tree ensemble is a staircase: flat almost everywhere, with jumps.
stair = lambda A: np.floor(3 * A[:, 0]) / 3 + 0.5 * A[:, 1]
spread = lambda wd: np.std([local_surrogate(stair, x0, wd, n=200, seed=s)[1][0] for s in range(20)])
narrow, wide = spread(0.15), spread(1.5)
print(f"staircase model, slope spread over 20 seeds: narrow kernel {narrow:.3f}, wide kernel {wide:.3f}")
assert narrow > 5 * wide, "on a piecewise-constant model, narrow kernels give noisy explanations"
print("PASS: local surrogate (faithful for a smooth model; noisy on a staircase when the kernel is narrow)")
`,
}
