export default {
  filename: 'gnn.py', packages: ['numpy'],
  title: 'A graph convolutional network in NumPy.',
  intro: 'Implement the normalized adjacency, a two-layer GCN forward pass with its backward pass, and repeated propagation. The checks verify permutation equivariance, the gradients, over-smoothing, and that the trained GCN beats a features-only model on a graph with communities.',
  steps: [
    '`normalized_adjacency(A)` → D^(−1/2)(A + I)D^(−1/2).',
    '`gcn_forward(Ahat, X, W1, W2)` → `(logits, cache)` for logits = Ahat·relu(Ahat·X·W1)·W2.',
    '`gcn_backward(dlogits, cache)` → `(dW1, dW2)`.',
    '`propagate(Ahat, X, k)` → Ahatᵏ·X.',
  ],
  hints: [
    ['Backward through Â·H·W', 'If Z = Â·H·W then dW = (Â·H)ᵀ·dZ and dH = Âᵀ·dZ·Wᵀ (Â is symmetric).'],
    ['ReLU', 'Keep the pre-activation; pass gradients only where it is positive.'],
  ],
  starter: `import numpy as np

def normalized_adjacency(A):
    raise NotImplementedError

def gcn_forward(Ahat, X, W1, W2):
    raise NotImplementedError

def gcn_backward(dlogits, cache):
    raise NotImplementedError

def propagate(Ahat, X, k):
    raise NotImplementedError
`,
  solution: `import numpy as np

def normalized_adjacency(A):
    At = A + np.eye(len(A))
    d = At.sum(1)
    return At / np.sqrt(np.outer(d, d))

def gcn_forward(Ahat, X, W1, W2):
    AX = Ahat @ X
    Z1 = AX @ W1
    H = np.maximum(Z1, 0)
    AH = Ahat @ H
    return AH @ W2, (Ahat, AX, Z1, AH, W2)

def gcn_backward(dlogits, cache):
    Ahat, AX, Z1, AH, W2 = cache
    dW2 = AH.T @ dlogits
    dH = Ahat.T @ dlogits @ W2.T
    dZ1 = dH * (Z1 > 0)
    return AX.T @ dZ1, dW2

def propagate(Ahat, X, k):
    for _ in range(k):
        X = Ahat @ X
    return X
`,
  solutionNote: 'A GCN is two matrix products per layer; the graph enters only through Â, which is why the same weights work on any graph.',
  checkSummary: 'Â is symmetric with eigenvalues in (−1, 1]; the GCN is permutation equivariant; gradients match finite differences; repeated propagation shrinks the spread of features; and a GCN trained by gradient descent on 2 labels per community clearly beats a features-only softmax regression.',
  checks: `
import numpy as np
rng = np.random.default_rng(57)
n, k, d = 90, 3, 8
y = np.arange(n) % k
P = np.where(y[:, None] == y[None], 0.16, 0.012)
A = np.triu((rng.random((n, n)) < P).astype(float), 1); A = A + A.T
X = 0.6 * rng.normal(size=(k, d))[y] + 1.6 * rng.normal(size=(n, d))
Ah = normalized_adjacency(A)
ev = np.linalg.eigvalsh(Ah)
assert np.allclose(Ah, Ah.T) and ev.max() <= 1 + 1e-9 and ev.min() > -1
W1, W2 = rng.normal(size=(d, 16)) * 0.3, rng.normal(size=(16, k)) * 0.3
out, cache = gcn_forward(Ah, X, W1, W2)
perm = rng.permutation(n)
assert np.allclose(gcn_forward(Ah[perm][:, perm], X[perm], W1, W2)[0], out[perm]), "GCNs are permutation equivariant"
print("PASS: normalized adjacency and equivariance")
D = rng.normal(size=out.shape)
g1, g2 = gcn_backward(D, cache)
def num(M):
    G = np.zeros_like(M)
    for idx in [(0, 0), (3, 5), (7, 15)] if M.shape[1] == 16 else [(0, 0), (5, 1), (15, 2)]:
        M[idx] += 1e-6; a = np.sum(gcn_forward(Ah, X, W1, W2)[0] * D); M[idx] -= 2e-6; b = np.sum(gcn_forward(Ah, X, W1, W2)[0] * D); M[idx] += 1e-6
        G[idx] = (a - b) / 2e-6
    return G
for M, g in ((W1, g1), (W2, g2)):
    Gn = num(M); mask = Gn != 0
    assert np.allclose(g[mask], Gn[mask], atol=1e-5), "gradients must match finite differences"
print("PASS: GCN gradients")
spreads = [np.var(propagate(Ah, X, s), axis=0).sum() for s in (0, 4, 32)]
assert spreads[0] > spreads[1] > spreads[2] and spreads[2] < 0.05 * spreads[0]
print("PASS: over-smoothing", np.round(spreads, 3))
lab = np.concatenate([np.where(y == c)[0][:2] for c in range(k)])
unl = np.setdiff1d(np.arange(n), lab)
def softmax(Z): Z = Z - Z.max(1, keepdims=True); E = np.exp(Z); return E / E.sum(1, keepdims=True)
W1, W2 = rng.normal(size=(d, 16)) * 0.3, rng.normal(size=(16, k)) * 0.3
for _ in range(300):
    out, cache = gcn_forward(Ah, X, W1, W2)
    G = np.zeros_like(out); Pl = softmax(out[lab]); Pl[np.arange(len(lab)), y[lab]] -= 1; G[lab] = Pl / len(lab)
    g1, g2 = gcn_backward(G, cache); W1 -= 0.2 * (g1 + 5e-3 * W1); W2 -= 0.2 * (g2 + 5e-3 * W2)
acc_gcn = np.mean(gcn_forward(Ah, X, W1, W2)[0][unl].argmax(1) == y[unl])
Wm = np.zeros((d, k))
for _ in range(300):
    Pl = softmax(X[lab] @ Wm); Pl[np.arange(len(lab)), y[lab]] -= 1; Wm -= 0.2 * (X[lab].T @ Pl / len(lab) + 5e-3 * Wm)
acc_mlp = np.mean((X[unl] @ Wm).argmax(1) == y[unl])
print(f"2 labels per community: GCN {acc_gcn:.3f}, features only {acc_mlp:.3f}")
assert acc_gcn > acc_mlp + 0.25
print("PASS: the graph structure carries the signal")
`,
}
