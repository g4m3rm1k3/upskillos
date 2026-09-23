export default {
  filename: 'pca.py', packages: ['numpy'],
  title: 'PCA with the singular value decomposition.',
  intro: 'Implement PCA the way libraries do: center the training data, take its SVD, keep the top k right singular vectors, and use them to transform and reconstruct. The checks compare your components with an eigen-decomposition of the covariance matrix and verify the key identities of this lab.',
  steps: [
    '`pca_fit(X, k)` → `(mean, components, explained_variance, explained_ratio)`: `components` has shape `(k, d)` with orthonormal rows; variances are `s² / n` for the kept singular values; ratios divide by the total variance.',
    '`transform(X, mean, components)` → `(n, k)` coordinates.',
    '`inverse_transform(Z, mean, components)` → `(n, d)` reconstructions.',
    '`reconstruction_error(X, mean, components)` → mean over rows of the squared reconstruction error.',
  ],
  hints: [
    ['SVD', '`U, s, Vt = np.linalg.svd(Xc, full_matrices=False)`; the rows of `Vt` are the principal directions, already sorted by decreasing `s`.'],
    ['Total variance', '`(s ** 2).sum() / n` equals `Xc.var(axis=0).sum()`.'],
    ['Transform', '`(X - mean) @ components.T` and back with `Z @ components + mean`.'],
  ],
  starter: `import numpy as np

def pca_fit(X, k):
    raise NotImplementedError

def transform(X, mean, components):
    raise NotImplementedError

def inverse_transform(Z, mean, components):
    raise NotImplementedError

def reconstruction_error(X, mean, components):
    raise NotImplementedError
`,
  solution: `import numpy as np

def pca_fit(X, k):
    mean = X.mean(axis=0)
    Xc = X - mean
    U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
    variances = s ** 2 / len(X)
    return mean, Vt[:k], variances[:k], variances[:k] / variances.sum()

def transform(X, mean, components):
    return (X - mean) @ components.T

def inverse_transform(Z, mean, components):
    return Z @ components + mean

def reconstruction_error(X, mean, components):
    R = inverse_transform(transform(X, mean, components), mean, components)
    return float(np.mean(np.sum((X - R) ** 2, axis=1)))
`,
  solutionNote: 'The SVD of the centered data gives the principal directions directly, without forming the covariance matrix. The mean learned on training data is reused unchanged by transform and inverse_transform.',
  checkSummary: 'Shapes and orthonormal components; agreement (up to sign) with the top eigenvectors of the covariance matrix and eigenvalues equal to the explained variances; decreasing ratios that sum to 1 with all components; exact reconstruction with all components; reconstruction error equal to the sum of dropped eigenvalues; and invariance of the components to adding a constant offset (centering).',
  checks: `
import numpy as np
_rng = np.random.default_rng(0)
_Z = _rng.normal(size=(200, 4)) * [3.0, 2.0, 1.0, 0.3]
_R = np.linalg.qr(_rng.normal(size=(4, 4)))[0]
_X = _Z @ _R.T + [5, -2, 7, 1]
_m, _C, _v, _r = pca_fit(_X, 2)
assert _C.shape == (2, 4) and _v.shape == (2,) and _r.shape == (2,)
np.testing.assert_allclose(_C @ _C.T, np.eye(2), atol=1e-10, err_msg="Components must be orthonormal")
_cov = np.cov(_X.T, bias=True); _ev, _evec = np.linalg.eigh(_cov); _ev, _evec = _ev[::-1], _evec[:, ::-1]
np.testing.assert_allclose(_v, _ev[:2], rtol=1e-9, err_msg="Explained variances must equal the top eigenvalues")
for _j in range(2):
    assert abs(abs(_C[_j] @ _evec[:, _j]) - 1) < 1e-8, "Components must match covariance eigenvectors up to sign"
print("PASS: SVD components match the covariance eigen-decomposition")
_mA, _CA, _vA, _rA = pca_fit(_X, 4)
assert np.all(np.diff(_rA) <= 1e-12) and abs(_rA.sum() - 1) < 1e-12
np.testing.assert_allclose(inverse_transform(transform(_X, _mA, _CA), _mA, _CA), _X, atol=1e-9, err_msg="All components must reconstruct exactly")
assert abs(reconstruction_error(_X, _m, _C) - _ev[2:].sum()) < 1e-8, "Error must equal the sum of dropped eigenvalues"
print("PASS: explained ratios, exact full reconstruction, error = dropped variance")
_m2, _C2, _, _ = pca_fit(_X + 1000, 2)
assert all(abs(abs(_C2[j] @ _C[j]) - 1) < 1e-8 for j in range(2)), "Adding an offset must not change centered PCA"
assert transform(_X[:5], _m, _C).shape == (5, 2)
print("PASS: centering makes PCA invariant to offsets")
`,
}
