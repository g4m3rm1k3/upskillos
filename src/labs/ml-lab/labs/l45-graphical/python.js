export default {
  filename: 'hmm.py', packages: ['numpy'],
  title: 'Forward, forward–backward, Viterbi and Baum–Welch for hidden Markov models.',
  intro: 'Implement the core HMM algorithms with scaling so they work on long sequences. The checks compare every result with brute-force enumeration over all state sequences on a short example, and confirm Baum–Welch never lowers the likelihood.',
  steps: [
    '`forward(pi, A, B, obs)` → `(alpha, loglik)` where alpha[t] = P(z_t | x_1..t) (rows sum to 1) and loglik = log P(x_1..T).',
    '`posteriors(pi, A, B, obs)` → gamma with gamma[t] = P(z_t | x_1..T), using a scaled backward pass.',
    '`viterbi(pi, A, B, obs)` → the most probable state sequence as a list of ints (work in logs).',
    '`baum_welch_step(pi, A, B, obs)` → updated `(pi, A, B)` from expected counts.',
  ],
  hints: [
    ['Scaling', 'Normalize alpha at each step and keep the normalizers c_t; log-likelihood = Σ log c_t. Divide the backward messages by the same c_{t+1}.'],
    ['Expected transitions', 'ξ_t(i, j) ∝ alpha[t, i] · A[i, j] · B[j, obs[t+1]] · beta[t+1, j]; normalize each ξ_t to sum to 1.'],
  ],
  starter: `import numpy as np

def forward(pi, A, B, obs):
    raise NotImplementedError

def posteriors(pi, A, B, obs):
    raise NotImplementedError

def viterbi(pi, A, B, obs):
    raise NotImplementedError

def baum_welch_step(pi, A, B, obs):
    raise NotImplementedError
`,
  solution: `import numpy as np

def _forward(pi, A, B, obs):
    T, K = len(obs), len(pi)
    alpha, c = np.zeros((T, K)), np.zeros(T)
    a = pi * B[:, obs[0]]
    for t in range(T):
        if t:
            a = (alpha[t - 1] @ A) * B[:, obs[t]]
        c[t] = a.sum()
        alpha[t] = a / c[t]
    return alpha, c

def forward(pi, A, B, obs):
    alpha, c = _forward(pi, A, B, obs)
    return alpha, float(np.log(c).sum())

def _backward(A, B, obs, c):
    T, K = len(obs), A.shape[0]
    beta = np.ones((T, K))
    for t in range(T - 2, -1, -1):
        beta[t] = A @ (B[:, obs[t + 1]] * beta[t + 1]) / c[t + 1]
    return beta

def posteriors(pi, A, B, obs):
    alpha, c = _forward(pi, A, B, obs)
    g = alpha * _backward(A, B, obs, c)
    return g / g.sum(1, keepdims=True)

def viterbi(pi, A, B, obs):
    T, K = len(obs), len(pi)
    lA, lB = np.log(A), np.log(B)
    delta = np.log(pi) + lB[:, obs[0]]
    back = np.zeros((T, K), dtype=int)
    for t in range(1, T):
        scores = delta[:, None] + lA
        back[t] = scores.argmax(0)
        delta = scores.max(0) + lB[:, obs[t]]
    path = [int(delta.argmax())]
    for t in range(T - 1, 0, -1):
        path.insert(0, int(back[t][path[0]]))
    return path

def baum_welch_step(pi, A, B, obs):
    obs = np.asarray(obs)
    alpha, c = _forward(pi, A, B, obs)
    beta = _backward(A, B, obs, c)
    g = alpha * beta
    g /= g.sum(1, keepdims=True)
    xi = np.zeros_like(A)
    for t in range(len(obs) - 1):
        m = alpha[t][:, None] * A * (B[:, obs[t + 1]] * beta[t + 1])[None, :]
        xi += m / m.sum()
    A_new = xi / xi.sum(1, keepdims=True)
    B_new = np.stack([g[obs == k].sum(0) for k in range(B.shape[1])], axis=1) / g.sum(0)[:, None]
    return g[0], A_new, B_new
`,
  solutionNote: 'Forward and Viterbi are the same recursion with sum replaced by max; scaling (or logs) is what makes them usable beyond a few dozen steps.',
  checkSummary: 'Likelihood, filtered and smoothed marginals and the Viterbi path all match brute-force enumeration over every state sequence; the filter works on a 5,000-step sequence without underflow; and Baum–Welch increases the log-likelihood at every step.',
  checks: `
import numpy as np, itertools
pi = np.array([0.7, 0.2, 0.1])
A = np.array([[0.8, 0.15, 0.05], [0.2, 0.7, 0.1], [0.1, 0.3, 0.6]])
B = np.array([[0.7, 0.2, 0.1], [0.2, 0.6, 0.2], [0.1, 0.2, 0.7]])
obs = [0, 0, 1, 2, 2, 1]
T, K = len(obs), 3
joint = {}
for z in itertools.product(range(K), repeat=T):
    p = pi[z[0]] * B[z[0], obs[0]]
    for t in range(1, T):
        p *= A[z[t - 1], z[t]] * B[z[t], obs[t]]
    joint[z] = p
total = sum(joint.values())
alpha, ll = forward(pi, A, B, obs)
assert abs(ll - np.log(total)) < 1e-10, "log-likelihood must equal the brute-force sum"
filt3 = np.array([sum(p for z, p in joint.items() if z[3] == k) for k in range(K)])
sub = {}
for z in itertools.product(range(K), repeat=4):
    p = pi[z[0]] * B[z[0], obs[0]]
    for t in range(1, 4):
        p *= A[z[t - 1], z[t]] * B[z[t], obs[t]]
    sub[z[3]] = sub.get(z[3], 0) + p
f3 = np.array([sub[k] for k in range(K)]); f3 /= f3.sum()
assert np.allclose(alpha[3], f3), "filtered marginal at t = 3 must match brute force"
g = posteriors(pi, A, B, obs)
assert np.allclose(g[3], filt3 / total), "smoothed marginal must match brute force"
assert tuple(viterbi(pi, A, B, obs)) == max(joint, key=joint.get), "Viterbi must find the most probable sequence"
print("PASS: forward, smoothing and Viterbi match brute force")
rng = np.random.default_rng(45)
z = [0]; long_obs = []
for t in range(5000):
    if t: z.append(rng.choice(3, p=A[z[-1]]))
    long_obs.append(rng.choice(3, p=B[z[-1]]))
_, ll_long = forward(pi, A, B, long_obs)
assert np.isfinite(ll_long) and ll_long < 0, "scaling must prevent underflow"
p2, A2, B2 = np.full(3, 1 / 3), rng.dirichlet(np.ones(3) * 3, 3), rng.dirichlet(np.ones(3) * 3, 3)
lls = []
for _ in range(15):
    lls.append(forward(p2, A2, B2, long_obs[:1500])[1])
    p2, A2, B2 = baum_welch_step(p2, A2, B2, long_obs[:1500])
assert np.all(np.diff(lls) > -1e-6) and np.allclose(A2.sum(1), 1) and np.allclose(B2.sum(1), 1)
print(f"PASS: Baum-Welch is monotone ({lls[0]:.1f} -> {lls[-1]:.1f})")
`,
}
