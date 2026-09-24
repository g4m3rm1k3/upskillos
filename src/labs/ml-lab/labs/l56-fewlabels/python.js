export default {
  filename: 'few_labels.py', packages: ['numpy', 'scikit-learn'],
  title: 'Label propagation, active learning, pseudo-labels and InfoNCE.',
  intro: 'Implement graph-based label propagation, uncertainty sampling, confident pseudo-labelling and the InfoNCE contrastive loss with its gradient. The checks run them on two moons and verify the loss against brute force and finite differences.',
  steps: [
    '`label_propagation(X, y, k=10, sigma=0.3, alpha=0.99, iters=100)` → predicted labels for every row; y holds 0/1 for labelled points and −1 for unlabelled.',
    '`uncertainty_query(proba, labeled)` → index of the unlabelled point whose probability of class 1 is closest to 0.5 (`labeled` is a boolean mask).',
    '`pseudo_labels(proba, threshold)` → `(indices, labels)` of points with max(p, 1 − p) > threshold.',
    '`info_nce(Z, tau)` → `(loss, grad)` for 2N embeddings (rows already L2-normalized) where row i and row (i + N) mod 2N are positives; gradient with respect to Z.',
  ],
  hints: [
    ['The graph', 'Keep each point’s k nearest neighbours, symmetrize W, compute S = D^(−1/2) W D^(−1/2), iterate F ← αSF + (1 − α)Y.'],
    ['InfoNCE gradient', 'With logits L = ZZᵀ/τ (diagonal excluded) and softmax rows P: dL = (P − onehot(positive))/(2N); grad Z = (dL + dLᵀ) Z / τ.'],
  ],
  starter: `import numpy as np

def label_propagation(X, y, k=10, sigma=0.3, alpha=0.99, iters=100):
    raise NotImplementedError

def uncertainty_query(proba, labeled):
    raise NotImplementedError

def pseudo_labels(proba, threshold):
    raise NotImplementedError

def info_nce(Z, tau):
    raise NotImplementedError
`,
  solution: `import numpy as np

def label_propagation(X, y, k=10, sigma=0.3, alpha=0.99, iters=100):
    n = len(X)
    D2 = ((X[:, None] - X[None]) ** 2).sum(-1)
    W = np.zeros((n, n))
    nn = np.argsort(D2, axis=1)[:, 1:k + 1]
    for i in range(n):
        W[i, nn[i]] = np.exp(-D2[i, nn[i]] / (2 * sigma ** 2))
    W = np.maximum(W, W.T)
    d = W.sum(1)
    S = W / np.sqrt(np.outer(d, d))
    Y = np.zeros((n, 2))
    Y[y == 0, 0] = 1; Y[y == 1, 1] = 1
    F = Y.copy()
    for _ in range(iters):
        F = alpha * S @ F + (1 - alpha) * Y
    return F.argmax(1)

def uncertainty_query(proba, labeled):
    score = np.where(labeled, np.inf, np.abs(proba - 0.5))
    return int(np.argmin(score))

def pseudo_labels(proba, threshold):
    conf = np.maximum(proba, 1 - proba)
    idx = np.where(conf > threshold)[0]
    return idx, (proba[idx] >= 0.5).astype(int)

def info_nce(Z, tau):
    M = len(Z); N = M // 2
    L = Z @ Z.T / tau
    np.fill_diagonal(L, -np.inf)
    L = L - L.max(1, keepdims=True)
    P = np.exp(L); P /= P.sum(1, keepdims=True)
    pos = (np.arange(M) + N) % M
    loss = float(-np.mean(np.log(P[np.arange(M), pos])))
    G = P.copy(); G[np.arange(M), pos] -= 1; G /= M
    return loss, (G + G.T) @ Z / tau
`,
  solutionNote: 'Each method turns unlabelled data into signal in a different way: the graph, the model’s own confidence, or the structure of augmentations.',
  checkSummary: 'Label propagation with one label per moon beats a supervised classifier on the same two points; uncertainty sampling picks the point nearest 0.5 among unlabelled ones; pseudo-labels respect the threshold; InfoNCE matches a brute-force loop, has the right gradient (finite differences), and is lower when positives are aligned.',
  checks: `
import numpy as np
from sklearn.datasets import make_moons
from sklearn.linear_model import LogisticRegression
X, y_true = make_moons(300, noise=0.08, random_state=56)
pick = np.random.default_rng(1)
res = []
for _ in range(5):
    lab = [int(pick.choice(np.where(y_true == c)[0])) for c in (0, 1)]
    y = -np.ones(300, dtype=int); y[lab] = y_true[lab]
    res.append((np.mean(label_propagation(X, y) == y_true), np.mean(LogisticRegression().fit(X[lab], y_true[lab]).predict(X) == y_true)))
acc_lp, acc_sup = np.mean(res, axis=0)
print(f"one label per class, averaged over 5 random choices: label propagation {acc_lp:.3f}, supervised {acc_sup:.3f}")
assert acc_lp > 0.9 and acc_lp > acc_sup + 0.1
print("PASS: label propagation")
p = np.array([0.93, 0.58, 0.12, 0.47, 0.51]); mask = np.array([False, False, False, False, True])
assert uncertainty_query(p, mask) == 3, "0.51 is labelled; among the rest 0.47 is closest to 0.5"
idx, lbl = pseudo_labels(p, 0.8)
assert list(idx) == [0, 2] and list(lbl) == [1, 0]
print("PASS: uncertainty sampling and pseudo-labels")
rng = np.random.default_rng(56)
Z = rng.normal(size=(8, 5)); Z /= np.linalg.norm(Z, axis=1, keepdims=True)
loss, G = info_nce(Z, 0.5)
brute = 0
for i in range(8):
    logits = [Z[i] @ Z[j] / 0.5 for j in range(8) if j != i]
    pos = Z[i] @ Z[(i + 4) % 8] / 0.5
    brute += -(pos - np.log(np.sum(np.exp(logits)))) / 8
assert abs(loss - brute) < 1e-10
num = np.zeros_like(Z)
for a in range(8):
    for b in range(5):
        Zp = Z.copy(); Zp[a, b] += 1e-6; Zm = Z.copy(); Zm[a, b] -= 1e-6
        num[a, b] = (info_nce(Zp, 0.5)[0] - info_nce(Zm, 0.5)[0]) / 2e-6
assert np.allclose(G, num, atol=1e-6), "InfoNCE gradient must match finite differences"
aligned = np.vstack([Z[:4], Z[:4] + 0.01 * rng.normal(size=(4, 5))]); aligned /= np.linalg.norm(aligned, axis=1, keepdims=True)
assert info_nce(aligned, 0.5)[0] < loss
print(f"PASS: InfoNCE (loss {loss:.3f}; aligned positives {info_nce(aligned, 0.5)[0]:.3f})")
`,
}
