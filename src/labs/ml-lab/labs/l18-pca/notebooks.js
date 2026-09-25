// Lab 18 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The 2-D cloud uses the playground's recipe (35°, variance ratio 4, centred at (3, 2)) drawn with
// NumPy; the image lessons use scikit-learn's real 8×8 handwritten digits instead of generated ones.

const CLOUD = `import numpy as np

def cloud(n=150, angle=35, ratio=4, offset=(3, 2), seed=4):
    """The playground's elongated cloud: long axis at \`angle\` degrees, variance ratio \`ratio\`."""
    rng = np.random.default_rng(seed)
    a = np.deg2rad(angle)
    u, v = rng.normal(size=n) * np.sqrt(ratio), rng.normal(size=n)
    return np.column_stack([offset[0] + np.cos(a) * u - np.sin(a) * v, offset[1] + np.sin(a) * u + np.cos(a) * v])

X = cloud()
mean = X.mean(axis=0)
Xc = X - mean                                              # centred
n = len(X)`

export const extras = {
  'l18-projection': {
    formulaTex: '$$\\lVert u\\rVert = \\sqrt{u \\cdot u} = 1$$ $$\\operatorname{proj}_u(x) = (u \\cdot x)\\,u$$ $$\\lVert x\\rVert^2 = (u \\cdot x)^2 + \\lVert x - (u\\cdot x)\\,u\\rVert^2$$ $$z = u \\cdot (x - \\bar x)$$',
    mathCode: {
      rows: [
        ['$u \\cdot x$', 'u @ x', 'The coordinate of x along the unit direction u.'],
        ['$(u \\cdot x)\\,u$', '(u @ x) * u', 'The projection: the closest point to x on the line.'],
        ['$x - (u\\cdot x)u$', 'x - (u @ x) * u', 'The residual: perpendicular to u.'],
        ['$z = u \\cdot (x - \\bar x)$', '(X - X.mean(0)) @ u', 'One number per row after centring: d numbers become 1.'],
      ],
    },
    notebook: {
      title: 'Lab 18.1 · Projections',
      intro: 'Project the lesson’s point onto two directions, check that the residual is perpendicular and that squared length splits into kept plus lost.',
      cells: [{
        title: 'Project (3, 4)',
        prose: 'Onto the x-axis and onto the 45° direction. **Predict** the kept and lost parts of ‖x‖² = 25 for the x-axis.',
        code: `import numpy as np
x = np.array([3.0, 4.0])
for name, u in [("x-axis", np.array([1.0, 0.0])), ("45 degrees", np.array([1.0, 1.0]) / np.sqrt(2))]:
    z = u @ x                                   # coordinate along u
    proj = z * u
    resid = x - proj
    print(f"{name:10s}: ‖u‖ = {np.linalg.norm(u):.3f}   u·x = {z:.3f}   projection {np.round(proj, 3)}")
    print(f"            residual {np.round(resid, 3)}, residual·u = {resid @ u:.1e}   kept {z ** 2:.3f} + lost {resid @ resid:.3f} = {x @ x:.3f}")`,
        tryThis: 'Use u = (1, 1) without dividing by √2. Which printed number shows the mistake?',
      }],
    },
  },
  'l18-maxvar': {
    formulaTex: '$$\\Sigma = \\frac1n\\sum_i (x_i - \\bar x)(x_i - \\bar x)^\\top$$ $$\\operatorname{Var}(u \\cdot x) = u^\\top \\Sigma\\, u$$ $$\\max_{\\lVert u\\rVert = 1} u^\\top\\Sigma u \\ \\Rightarrow\\ \\Sigma u = \\lambda u$$',
    mathCode: {
      rows: [
        ['$(x_i - \\bar x)(x_i - \\bar x)^\\top$', 'np.outer(xc, xc)', 'One row’s contribution: a d × d matrix.'],
        ['$\\Sigma$', 'Xc.T @ Xc / n', 'The covariance matrix; np.cov(X.T, bias=True) gives the same.'],
        ['$u^\\top\\Sigma u$', 'u @ S @ u', 'The variance of the projections onto u.'],
        ['$\\Sigma u = \\lambda u$', 'lam, V = np.linalg.eigh(S)', 'Eigenvalues (ascending) and eigenvectors (columns) of a symmetric matrix.'],
      ],
    },
    notebook: {
      title: 'Lab 18.2 · The direction of greatest variance',
      intro: 'Build the covariance matrix as a sum and as a matrix product, scan every direction for its variance, and find the peak as the top eigenvector.',
      cells: [{
        title: 'The covariance matrix two ways',
        prose: 'The playground’s cloud. **Predict** the sign of the off-diagonal entry.',
        code: `${CLOUD}
S_loop = sum(np.outer(xc, xc) for xc in Xc) / n            # Σ as the lesson's sum
S = Xc.T @ Xc / n                                           # the same, as one product
print(np.round(S, 3))
print("loop equals product:", np.allclose(S_loop, S), "   equals np.cov(bias=True):", np.allclose(S, np.cov(X.T, bias=True)))`,
      }, {
        title: 'Scan directions, then solve for the peak',
        prose: '**Predict** the angle of the peak. The recipe puts the long axis at 35° with variances 4 and 1; a sample of 150 points lands near those values, not exactly on them.',
        code: `angles = np.arange(0, 180)
var = [np.array([np.cos(np.deg2rad(a)), np.sin(np.deg2rad(a))]) @ S @ np.array([np.cos(np.deg2rad(a)), np.sin(np.deg2rad(a))]) for a in angles]
best = angles[int(np.argmax(var))]
lam, V = np.linalg.eigh(S)                                  # ascending order
pc1 = V[:, -1]
pc1_angle = np.rad2deg(np.arctan2(pc1[1], pc1[0])) % 180
print(f"scan: peak at {best}°, variance {max(var):.3f}")
print(f"eigen: PC1 at {pc1_angle:.1f}°, λ₁ = {lam[-1]:.3f}; PC2 λ₂ = {lam[0]:.3f}; PC1·PC2 = {V[:, 0] @ V[:, 1]:.1e}")
print(f"variance at 90° from PC1: {V[:, 0] @ S @ V[:, 0]:.3f}   total {np.trace(S):.3f} = λ₁ + λ₂ = {lam.sum():.3f}")`,
        tryThis: 'Regenerate with n=100000: how close do the angle and eigenvalues get to 35°, 4 and 1? Then try ratio=1 (a round cloud) — is PC1 still meaningful?',
      }],
    },
  },
  'l18-centering': {
    formulaTex: '$$X_c = X - \\bar x$$ $$Z = \\frac{X - \\bar x}{s}$$',
    mathCode: {
      rows: [
        ['$X - \\bar x$', 'X - X_train.mean(axis=0)', 'Centre with the training mean.'],
        ['$(X - \\bar x)/s$', 'StandardScaler().fit(X_train).transform(X)', 'Standardize: PCA on the correlation matrix.'],
        ['uncentred', 'X.T @ X / n', '“Variance” around the origin: dominated by where the cloud sits.'],
        ['fit on training rows only', 'PCA().fit(X_train); .transform(X_test)', 'The mean, scale and directions are learned; the test set must not shape them.'],
      ],
    },
    notebook: {
      title: 'Lab 18.3 · Centering and scaling',
      intro: 'Compare PC1 with and without centering, see a large-unit feature take over, and fit the transform on training rows only.',
      cells: [{
        title: 'Forgetting to centre',
        prose: 'The same cloud, moved to (4, −3), so the direction of its mean differs from its long axis. **Predict** the direction of the uncentred PC1.',
        code: `${CLOUD}
X = cloud(offset=(4, -3)); mean = X.mean(axis=0)
def pc1_and_error(X, centre):
    m = X.mean(axis=0) if centre else np.zeros(2)
    M = (X - m).T @ (X - m) / len(X)
    lam, V = np.linalg.eigh(M); u = V[:, -1]
    recon = m + np.outer((X - m) @ u, u)                      # keep one coordinate, rebuild
    return np.rad2deg(np.arctan2(u[1], u[0])) % 180, np.mean(((X - recon) ** 2).sum(axis=1))
for centre in [True, False]:
    ang, err = pc1_and_error(X, centre)
    print(f"{'centred  ' if centre else 'uncentred'}: PC1 at {ang:5.1f}°   reconstruction error with 1 component {err:.3f}")
print(f"direction of the mean itself: {np.rad2deg(np.arctan2(mean[1], mean[0])) % 180:.1f}°")`,
      }, {
        title: 'Units, and fitting on training rows',
        prose: 'Size in bytes and duration in seconds, correlated. **Predict** PC1’s weights before and after standardizing.',
        code: `from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
rng = np.random.default_rng(9)
a = rng.normal(size=300); b = 0.6 * a + 0.8 * rng.normal(size=300)
F = np.column_stack([1000 * a + 5000, b + 30])             # bytes-like and seconds-like
train, test = F[:200], F[200:]
raw = PCA(1).fit(train)
std = make_pipeline(StandardScaler(), PCA(1)).fit(train)   # scaler and PCA fitted on training rows only
print("raw PC1 weights:", np.round(raw.components_[0], 4), "  explained share", round(raw.explained_variance_ratio_[0], 5))
print("standardized PC1 weights:", np.round(std[-1].components_[0], 3), "  explained share", round(std[-1].explained_variance_ratio_[0], 3))
Zt = std.transform(train)
print("training scores have mean", round(float(Zt.mean()), 12), "  test scores have mean", round(float(std.transform(test).mean()), 3), "(not exactly 0: the test set did not shape the transform)")`,
      }],
    },
  },
  'l18-svd': {
    formulaTex: '$$\\text{share}_j = \\frac{\\lambda_j}{\\sum_k \\lambda_k}$$ $$X_c = U S V^\\top, \\quad \\lambda_i = \\frac{s_i^2}{n}$$ $$\\frac1n\\sum_i \\lVert x_i - \\hat x_i\\rVert^2 = \\sum_{j > k}\\lambda_j$$',
    mathCode: {
      rows: [
        ['$X_c = U S V^\\top$', 'U, s, Vt = np.linalg.svd(Xc, full_matrices=False)', 'The SVD of the centred data.'],
        ['$\\lambda_i = s_i^2/n$', 's ** 2 / n', 'Eigenvalues of Σ from the singular values, without forming Σ.'],
        ['principal directions', 'Vt[:k]', 'Rows of Vᵀ; each is defined only up to sign.'],
        ['$\\hat x_i$', 'mean + (Xc @ Vt[:k].T) @ Vt[:k]', 'Reconstruction from k components.'],
        ['$\\sum_{j>k}\\lambda_j$', 'lam[k:].sum()', 'The reconstruction error: the dropped eigenvalues.'],
      ],
    },
    notebook: {
      title: 'Lab 18.4 · Explained variance and the SVD',
      intro: 'Compute explained shares, get the same components from the SVD as from the covariance matrix (up to sign), and check that reconstruction error equals the dropped eigenvalues on real digit images.',
      cells: [{
        title: 'Explained shares',
        prose: 'Eigenvalues 6, 3 and 1. **Predict** the share of PC1 and the running total after two.',
        code: `import numpy as np
lam = np.array([6.0, 3.0, 1.0])
share = lam / lam.sum()
print("shares", share, "  running total", np.cumsum(share))`,
      }, {
        title: 'The SVD gives the same components — up to sign',
        prose: '8×8 handwritten digits: 1,797 images, 64 pixels each (scikit-learn’s real digits; the playground uses generated ones). **Predict** whether the SVD’s directions equal the eigenvectors exactly.',
        code: `from sklearn.datasets import load_digits
D = load_digits().data                       # (1797, 64), pixel values 0–16
n = len(D); m = D.mean(axis=0); Dc = D - m
lam, V = np.linalg.eigh(Dc.T @ Dc / n); lam, V = lam[::-1], V[:, ::-1]      # largest first
U, s, Vt = np.linalg.svd(Dc, full_matrices=False)
print("eigenvalues from the SVD match:", np.allclose(s ** 2 / n, lam))
dots = np.array([Vt[j] @ V[:, j] for j in range(5)])
print("PC1–PC5 dot products (eigen · SVD):", np.round(dots, 6))
print("A component and its negative describe the same line: compare |dot| = 1, not the vectors themselves.")`,
      }, {
        title: 'Reconstruction error equals the dropped eigenvalues',
        prose: '**Predict** how many components keep 90% of the variance.',
        code: `for k in [2, 10, 20, 40]:
    recon = m + (Dc @ Vt[:k].T) @ Vt[:k]
    err = np.mean(((D - recon) ** 2).sum(axis=1))
    print(f"k = {k:2d}: explained {np.cumsum(lam)[k - 1] / lam.sum():.3f}   reconstruction error {err:8.3f}   dropped eigenvalues {lam[k:].sum():8.3f}")
print("components for 90%:", int(np.searchsorted(np.cumsum(lam) / lam.sum(), 0.9) + 1))
from sklearn.decomposition import PCA
print("scikit-learn agrees on the shares:", np.allclose(PCA().fit(D).explained_variance_ratio_, lam / lam.sum()))`,
      }],
    },
  },
  'l18-use': {
    formulaTex: '$$x \\approx \\bar x + \\sum_{j \\le k} z_j\\, v_j$$',
    mathCode: {
      rows: [
        ['$z_j$', '(x - mean) @ Vt[j]', 'The image’s coordinate along component j.'],
        ['$v_j$', 'Vt[j].reshape(8, 8)', 'A component drawn as an image: an “eigen-digit”.'],
        ['$\\bar x + \\sum_{j\\le k} z_j v_j$', 'mean + z[:k] @ Vt[:k]', 'Rebuild from k components: drops the small, noisy directions.'],
      ],
    },
    notebook: {
      title: 'Lab 18.5 · Using PCA — and when not to',
      intro: 'Denoise digits by reconstructing from a few components, use components as features for a classifier, and see a case where the highest-variance direction carries no signal.',
      cells: [{
        title: 'Denoising',
        prose: 'Noise is added to test digits; the components come from clean training digits. **Predict** whether k = 20 beats both k = 5 and all 64.',
        code: `import numpy as np
from sklearn.datasets import load_digits
D = load_digits().data; rng = np.random.default_rng(0)
train, test = D[:1400], D[1400:]
m = train.mean(axis=0); _, _, Vt = np.linalg.svd(train - m, full_matrices=False)
noisy = test + rng.normal(0, 4, test.shape)
print(f"noisy vs clean: error {np.mean(((noisy - test) ** 2).sum(axis=1)):.1f}")
for k in [5, 10, 20, 40, 64]:
    rebuilt = m + ((noisy - m) @ Vt[:k].T) @ Vt[:k]
    print(f"k = {k:2d}: rebuilt vs clean error {np.mean(((rebuilt - test) ** 2).sum(axis=1)):.1f}")`,
      }, {
        title: 'Components as features',
        prose: 'k-NN on all 64 pixels against k-NN on the first 10 components, fitted inside a pipeline. **Predict** the accuracy difference.',
        code: `from sklearn.neighbors import KNeighborsClassifier
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score
y = load_digits().target
for name, model in [("64 pixels", KNeighborsClassifier(5)), ("10 components", make_pipeline(PCA(10), KNeighborsClassifier(5)))]:
    print(f"{name:14s}: 5-fold accuracy {cross_val_score(model, D, y, cv=5).mean():.3f}")`,
      }, {
        title: 'The signal in the smallest direction',
        prose: 'Two classes that differ only along the low-variance axis. **Predict** the accuracy of a classifier on PC1 alone and on PC2 alone.',
        code: `from sklearn.linear_model import LogisticRegression
r = np.random.default_rng(1)
cls = r.integers(0, 2, 600)
P = np.column_stack([r.normal(0, 3, 600), r.normal(0, 0.3, 600) + np.where(cls == 1, 0.5, -0.5)])   # wide x1, narrow x2 carries the label
Z = PCA(2).fit_transform(P)
for j in [0, 1]:
    acc = cross_val_score(LogisticRegression(), Z[:, [j]], cls, cv=5).mean()
    print(f"PC{j + 1} only: accuracy {acc:.3f}")`,
      }],
    },
  },
}
