export default {
  filename: 'information.py', packages: ['numpy', 'scikit-learn'],
  title: 'Entropy, divergences, codes and mutual information.',
  intro: 'Implement the core information-theoretic quantities in bits, Huffman code lengths, and mutual information from a joint table and from samples. The checks use known values, compare with scikit-learn’s mutual_info_score, and test the estimator on dependence that correlation misses.',
  steps: [
    '`entropy(p)`, `cross_entropy(p, q)`, `kl(p, q)` in bits; terms with p = 0 contribute 0.',
    '`huffman_lengths(p)` → codeword length for each symbol (build the tree with a priority queue, e.g. `heapq`).',
    '`mutual_information(joint)` → I(X; Y) in bits from a table of joint counts or probabilities.',
    '`mi_binned(x, y, bins)` → plug-in estimate using equal-frequency bins (quantiles) on each axis.',
  ],
  hints: [
    ['Zero terms', '`np.where(p > 0, p * np.log2(p), 0)` avoids 0·log 0 warnings if you mask first: `p = p[p > 0]`.'],
    ['Huffman with heapq', 'Push (weight, id, [symbols]); pop two, add 1 to the length of every symbol in both, push the merged node.'],
    ['Quantile bins', '`edges = np.quantile(x, np.linspace(0, 1, bins + 1))`, then `np.digitize(x, edges[1:-1])`.'],
  ],
  starter: `import numpy as np

def entropy(p):
    raise NotImplementedError

def cross_entropy(p, q):
    raise NotImplementedError

def kl(p, q):
    raise NotImplementedError

def huffman_lengths(p):
    raise NotImplementedError

def mutual_information(joint):
    raise NotImplementedError

def mi_binned(x, y, bins):
    raise NotImplementedError
`,
  solution: `import heapq
import numpy as np

def entropy(p):
    p = np.asarray(p, dtype=float)
    p = p[p > 0]
    return float(-np.sum(p * np.log2(p)))

def cross_entropy(p, q):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    m = p > 0
    return float(-np.sum(p[m] * np.log2(q[m])))

def kl(p, q):
    return cross_entropy(p, q) - entropy(p)

def huffman_lengths(p):
    lengths = [0] * len(p)
    heap = [(w, i, [i]) for i, w in enumerate(p)]
    heapq.heapify(heap)
    counter = len(p)
    while len(heap) > 1:
        w1, _, s1 = heapq.heappop(heap)
        w2, _, s2 = heapq.heappop(heap)
        for i in s1 + s2:
            lengths[i] += 1
        heapq.heappush(heap, (w1 + w2, counter, s1 + s2))
        counter += 1
    return lengths

def mutual_information(joint):
    P = np.asarray(joint, dtype=float)
    P = P / P.sum()
    px, py = P.sum(1, keepdims=True), P.sum(0, keepdims=True)
    m = P > 0
    return float(np.sum(P[m] * np.log2(P[m] / (px @ py)[m])))

def mi_binned(x, y, bins):
    bx = np.digitize(x, np.quantile(x, np.linspace(0, 1, bins + 1))[1:-1])
    by = np.digitize(y, np.quantile(y, np.linspace(0, 1, bins + 1))[1:-1])
    J = np.zeros((bins, bins))
    np.add.at(J, (bx, by), 1)
    return mutual_information(J)
`,
  solutionNote: 'KL is just cross-entropy minus entropy, and mutual information is the KL between the joint and the product of the marginals — one idea, reused.',
  checkSummary: 'Known entropies and divergences, including asymmetry of KL; Huffman average length within one bit of the entropy and exact for dyadic probabilities; mutual information matches scikit-learn (converted from nats); and the binned estimator detects a U-shaped relation that correlation misses while staying near zero for independent data.',
  checks: `
import numpy as np
from sklearn.metrics import mutual_info_score
assert abs(entropy([0.5, 0.25, 0.125, 0.125]) - 1.75) < 1e-12 and abs(entropy([1, 0]) - 0) < 1e-12
assert abs(kl([0.5, 0.5], [0.9, 0.1]) - 0.7369655941662061) < 1e-9 and abs(kl([0.9, 0.1], [0.5, 0.5]) - 0.5310044064107189) < 1e-9
assert abs(cross_entropy([0.3, 0.7], [0.3, 0.7]) - entropy([0.3, 0.7])) < 1e-12
print("PASS: entropy, cross-entropy and KL (asymmetric)")
dy = [0.5, 0.25, 0.125, 0.125]
assert abs(np.dot(dy, huffman_lengths(dy)) - 1.75) < 1e-12
rng = np.random.default_rng(46)
for _ in range(20):
    p = rng.dirichlet(np.ones(6))
    avg = np.dot(p, huffman_lengths(p))
    assert entropy(p) - 1e-9 <= avg < entropy(p) + 1, "Huffman must be within one bit of the entropy"
print("PASS: Huffman coding meets the source-coding bound")
a = rng.integers(0, 3, 5000); b = (a + rng.integers(0, 2, 5000)) % 3
J = np.zeros((3, 3)); np.add.at(J, (a, b), 1)
assert abs(mutual_information(J) - mutual_info_score(a, b) / np.log(2)) < 1e-9, "must match scikit-learn (nats -> bits)"
print("PASS: mutual information matches scikit-learn")
x = rng.uniform(-2, 2, 3000)
y_u = x ** 2 + 0.3 * rng.normal(size=3000)
y_ind = rng.normal(size=3000)
print(f"U-shape: correlation {np.corrcoef(x, y_u)[0, 1]:.3f}, MI {mi_binned(x, y_u, 8):.3f} bits; independent: MI {mi_binned(x, y_ind, 8):.3f} bits")
assert abs(np.corrcoef(x, y_u)[0, 1]) < 0.1 and mi_binned(x, y_u, 8) > 0.8 and mi_binned(x, y_ind, 8) < 0.05
print("PASS: MI detects dependence that correlation misses")
`,
}
