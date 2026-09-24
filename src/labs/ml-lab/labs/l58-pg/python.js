export default {
  filename: 'policy_gradient.py', packages: ['numpy'],
  title: 'Policy-gradient estimators, checked against exact gradients.',
  intro: 'Implement the score function of a logistic policy, returns-to-go, the REINFORCE estimator with an optional baseline, and the TD error. The checks compare Monte Carlo gradient estimates with the exact gradient on a problem where it can be computed, and measure the variance a baseline removes.',
  steps: [
    '`score(theta, phi, a)` → ∇_θ log π(a | s) = (a − σ(θ·φ))·φ for a two-action logistic policy.',
    '`returns_to_go(rewards, gamma)` → array G with G_t = Σ_{k≥t} γ^(k−t) r_k.',
    '`reinforce_estimate(episode, theta, gamma, baseline=None)` → Σₜ score·(Gₜ − b); an episode is a list of (phi, a, r); `baseline` is None or an array of b_t.',
    '`td_error(r, v, v_next, gamma, done)` → r + γ·v_next·(1 − done) − v.',
  ],
  hints: [
    ['Returns-to-go', 'Loop backwards: run = r_t + γ·run.'],
    ['Exact gradient for a one-step problem', 'With J = p·r₁ + (1 − p)·r₀ and p = σ(θ·φ), ∇J = p(1 − p)(r₁ − r₀)·φ.'],
  ],
  starter: `import numpy as np

def score(theta, phi, a):
    raise NotImplementedError

def returns_to_go(rewards, gamma):
    raise NotImplementedError

def reinforce_estimate(episode, theta, gamma, baseline=None):
    raise NotImplementedError

def td_error(r, v, v_next, gamma, done):
    raise NotImplementedError
`,
  solution: `import numpy as np

def score(theta, phi, a):
    p = 1 / (1 + np.exp(-theta @ phi))
    return (a - p) * phi

def returns_to_go(rewards, gamma):
    G = np.zeros(len(rewards))
    run = 0.0
    for t in range(len(rewards) - 1, -1, -1):
        run = rewards[t] + gamma * run
        G[t] = run
    return G

def reinforce_estimate(episode, theta, gamma, baseline=None):
    G = returns_to_go([r for _, _, r in episode], gamma)
    grad = np.zeros_like(theta, dtype=float)
    for t, (phi, a, _) in enumerate(episode):
        b = 0.0 if baseline is None else baseline[t]
        grad += score(theta, phi, a) * (G[t] - b)
    return grad

def td_error(r, v, v_next, gamma, done):
    return r + gamma * v_next * (1 - done) - v
`,
  solutionNote: 'The estimator never needs the environment’s equations — only the log-probability of the actions taken and the rewards that followed.',
  checkSummary: 'Score function against finite differences of log π; returns-to-go on a hand example; on a one-step problem with rewards 10 (right) and 4 (left) plus noise, the average REINFORCE estimate matches the exact gradient p(1 − p)(r₁ − r₀)φ both with and without a baseline, and the baseline cuts the variance several-fold; TD errors on hand values.',
  checks: `
import numpy as np
rng = np.random.default_rng(58)
theta = np.array([0.3, -0.5]); phi = np.array([1.0, 2.0])
for a in (0, 1):
    lp = lambda th: np.log(1 / (1 + np.exp(-th @ phi)) if a else 1 - 1 / (1 + np.exp(-th @ phi)))
    num = np.array([(lp(theta + 1e-6 * e) - lp(theta - 1e-6 * e)) / 2e-6 for e in np.eye(2)])
    assert np.allclose(score(theta, phi, a), num, atol=1e-6)
assert np.allclose(returns_to_go([1, 1, 1], 0.5), [1.75, 1.5, 1.0])
print("PASS: score function and returns-to-go")
p = 1 / (1 + np.exp(-theta @ phi))
exact = p * (1 - p) * (10 - 4) * phi
plain, based = [], []
for _ in range(40000):
    a = int(rng.random() < p); r = (10 if a else 4) + rng.normal()
    ep = [(phi, a, r)]
    plain.append(reinforce_estimate(ep, theta, 1.0))
    based.append(reinforce_estimate(ep, theta, 1.0, baseline=np.array([p * 10 + (1 - p) * 4])))
plain, based = np.array(plain), np.array(based)
print("exact", np.round(exact, 3), "| REINFORCE", np.round(plain.mean(0), 3), "| with baseline", np.round(based.mean(0), 3))
assert np.allclose(plain.mean(0), exact, atol=0.1) and np.allclose(based.mean(0), exact, atol=0.03), "both estimators are unbiased"
ratio = plain.var(0)[1] / based.var(0)[1]
assert ratio > 5, "the baseline should cut the variance several-fold"
print(f"PASS: unbiased estimates; baseline reduces variance by a factor of {ratio:.1f}")
assert abs(td_error(1, 10, 12, 0.95, 0) - 2.4) < 1e-12 and abs(td_error(1, 5, 5, 0.8, 0)) < 1e-12 and abs(td_error(1, 3, 99, 0.9, 1) + 2) < 1e-12
print("PASS: TD errors (terminal states have no future value)")
`,
}
