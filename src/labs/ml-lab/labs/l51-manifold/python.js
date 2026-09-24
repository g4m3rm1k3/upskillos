export default {
  filename: 'manifold.py', packages: ['numpy', 'scikit-learn'],
  title: 'Whitening, FastICA, t-SNE’s perplexity calibration and classical MDS.',
  intro: 'Implement the building blocks of three nonlinear methods. The checks compare FastICA with scikit-learn, verify that each point’s neighbour distribution has the requested perplexity, and confirm classical MDS reproduces pairwise distances.',
  steps: [
    '`whiten(X)` → centred data with identity covariance (use the eigendecomposition of the covariance).',
    '`fastica(Z, n_components, seed, iters=500)` → rows of an orthonormal unmixing matrix W for whitened Z, by deflation with g = tanh.',
    '`conditional_p(D2, perplexity)` → matrix of p(j | i) (rows sum to 1, zero diagonal) with each row’s σᵢ found by binary search so 2^H(Pᵢ) equals the perplexity.',
    '`classical_mds(D, k)` → k-dimensional coordinates from a distance matrix via double centring.',
  ],
  hints: [
    ['Binary search on β = 1/(2σ²)', 'If the row entropy is too high, increase β (narrower); too low, decrease it. Compare entropies in nats with log(perplexity).'],
    ['Double centring', 'B = −½·H·D²·H with H = I − 11ᵀ/n; coordinates = eigenvectors × √eigenvalues (largest first).'],
  ],
  starter: `import numpy as np

def whiten(X):
    raise NotImplementedError

def fastica(Z, n_components, seed, iters=500):
    raise NotImplementedError

def conditional_p(D2, perplexity):
    raise NotImplementedError

def classical_mds(D, k):
    raise NotImplementedError
`,
  solution: `import numpy as np

def whiten(X):
    C = X - X.mean(0)
    vals, vecs = np.linalg.eigh(np.cov(C.T, bias=True))
    return C @ vecs / np.sqrt(vals)

def fastica(Z, n_components, seed, iters=500):
    rng = np.random.default_rng(seed)
    W = []
    for _ in range(n_components):
        w = rng.normal(size=Z.shape[1]); w /= np.linalg.norm(w)
        for _ in range(iters):
            g = np.tanh(Z @ w)
            new = (Z * g[:, None]).mean(0) - (1 - g ** 2).mean() * w
            for u in W:
                new -= (new @ u) * u
            new /= np.linalg.norm(new)
            done = abs(abs(new @ w) - 1) < 1e-10
            w = new
            if done:
                break
        W.append(w)
    return np.array(W)

def conditional_p(D2, perplexity):
    n = len(D2)
    P = np.zeros((n, n))
    target = np.log(perplexity)
    for i in range(n):
        lo, hi, beta = 0.0, np.inf, 1.0
        d = np.delete(D2[i], i)
        for _ in range(100):
            p = np.exp(-(d - d.min()) * beta)
            p /= p.sum()
            H = -np.sum(p[p > 0] * np.log(p[p > 0]))
            if abs(H - target) < 1e-6:
                break
            if H > target:
                lo = beta
                beta = beta * 2 if hi == np.inf else (beta + hi) / 2
            else:
                hi = beta
                beta = (beta + lo) / 2
        P[i, np.arange(n) != i] = p
    return P

def classical_mds(D, k):
    n = len(D)
    H = np.eye(n) - np.ones((n, n)) / n
    B = -0.5 * H @ (D ** 2) @ H
    vals, vecs = np.linalg.eigh(B)
    idx = np.argsort(vals)[::-1][:k]
    return vecs[:, idx] * np.sqrt(np.maximum(vals[idx], 0))
`,
  solutionNote: 'Each method replaces “variance” with a different notion of what to keep: independence, neighbour probabilities, or distances.',
  checkSummary: 'Whitened data have identity covariance; FastICA separates a sine and a sawtooth (|correlation| > 0.99) and agrees with scikit-learn’s FastICA; every row of the neighbour distribution has the requested perplexity; and classical MDS reproduces the pairwise distances of 3D points and matches PCA up to sign.',
  checks: `
import numpy as np
from sklearn.decomposition import FastICA, PCA
t = np.arange(1000)
S = np.column_stack([np.sin(t / 8), ((t / 13) % 2) - 1])
X = S @ np.array([[1, 0.6], [0.45, 1]]).T
Z = whiten(X)
assert np.allclose(np.cov(Z.T, bias=True), np.eye(2), atol=1e-8)
W = fastica(Z, 2, seed=3)
Y = Z @ W.T
C = np.abs(np.corrcoef(Y.T, S.T)[:2, 2:])
assert max(C[0, 0] + C[1, 1], C[0, 1] + C[1, 0]) / 2 > 0.99, "ICA should recover the sources"
Ys = FastICA(2, random_state=0, whiten="unit-variance").fit_transform(X)
Cs = np.abs(np.corrcoef(Y.T, Ys.T)[:2, 2:])
assert max(Cs[0, 0] + Cs[1, 1], Cs[0, 1] + Cs[1, 0]) / 2 > 0.99, "should agree with scikit-learn's FastICA up to order and sign"
print("PASS: whitening and FastICA")
rng = np.random.default_rng(51)
P3 = rng.normal(size=(60, 5)) * [3, 1, 1, 0.5, 0.2]
D2 = ((P3[:, None] - P3[None]) ** 2).sum(-1)
Pc = conditional_p(D2, 15)
H = -np.sum(np.where(Pc > 0, Pc * np.log(np.where(Pc > 0, Pc, 1)), 0), axis=1)
assert np.allclose(Pc.sum(1), 1) and np.allclose(np.diag(Pc), 0) and np.allclose(np.exp(H), 15, atol=1e-3), "each row must have perplexity 15"
print("PASS: perplexity calibration")
Q = rng.normal(size=(40, 3))
D = np.sqrt(((Q[:, None] - Q[None]) ** 2).sum(-1))
E = classical_mds(D, 3)
assert np.allclose(np.sqrt(((E[:, None] - E[None]) ** 2).sum(-1)), D, atol=1e-8), "MDS must reproduce Euclidean distances"
E2 = classical_mds(D, 2); Pp = PCA(2).fit_transform(Q)
assert np.allclose(np.abs(E2), np.abs(Pp), atol=1e-8), "classical MDS on Euclidean distances equals PCA up to sign"
print("PASS: classical MDS (equals PCA on Euclidean distances)")
`,
}
