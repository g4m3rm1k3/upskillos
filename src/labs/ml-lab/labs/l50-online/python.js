export default {
  filename: 'online.py', packages: ['numpy'],
  title: 'Perceptron, Hedge and bandit algorithms with regret checks.',
  intro: 'Implement the online perceptron, the Hedge algorithm, and three bandit strategies (ε-greedy, UCB1, Thompson sampling). The checks verify the mistake bound, Hedge’s regret guarantee on an adversarial sequence, and the regret ordering of the bandit algorithms.',
  steps: [
    '`perceptron_mistakes(X, y)` → number of mistakes of the online perceptron (no bias) on the sequence.',
    '`hedge(L, eta)` → total expected loss of Hedge on a (T, N) loss matrix with entries in [0, 1].',
    '`run_bandit(means, policy, T, rng, eps=0.1)` → cumulative pseudo-regret Σ (μ* − μ_{aₜ}) for policy in {"eps", "ucb", "ts"} with Bernoulli rewards. UCB1 pulls each arm once first; Thompson uses Beta(1 + s, 1 + f).',
  ],
  hints: [
    ['Hedge in log space', 'Keep log-weights; p = exp(lw − max) / Σ exp(lw − max). Add p·ℓₜ to the loss, then lw −= η·ℓₜ.'],
    ['Thompson draw', '`rng.beta(1 + s, 1 + n - s)` for every arm, then `argmax`.'],
  ],
  starter: `import numpy as np

def perceptron_mistakes(X, y):
    raise NotImplementedError

def hedge(L, eta):
    raise NotImplementedError

def run_bandit(means, policy, T, rng, eps=0.1):
    raise NotImplementedError
`,
  solution: `import numpy as np

def perceptron_mistakes(X, y):
    w = np.zeros(X.shape[1])
    mistakes = 0
    for x, t in zip(X, y):
        if t * (w @ x) <= 0:
            w += t * x
            mistakes += 1
    return mistakes

def hedge(L, eta):
    lw = np.zeros(L.shape[1])
    total = 0.0
    for losses in L:
        p = np.exp(lw - lw.max())
        p /= p.sum()
        total += p @ losses
        lw -= eta * losses
    return float(total)

def run_bandit(means, policy, T, rng, eps=0.1):
    means = np.asarray(means)
    K = len(means)
    n, s = np.zeros(K), np.zeros(K)
    regret = 0.0
    for t in range(T):
        if policy == "ts":
            a = int(np.argmax(rng.beta(1 + s, 1 + n - s)))
        elif t < K:
            a = t
        elif policy == "ucb":
            a = int(np.argmax(s / n + np.sqrt(2 * np.log(t + 1) / n)))
        else:
            a = int(rng.integers(K)) if rng.random() < eps else int(np.argmax(s / n))
        r = rng.random() < means[a]
        n[a] += 1
        s[a] += r
        regret += means.max() - means[a]
    return regret
`,
  solutionNote: 'Each algorithm is a few lines; the guarantees come from how they balance trusting the past against hedging for the future.',
  checkSummary: 'The perceptron stays within (R/γ)² mistakes on a separable stream; Hedge’s regret stays below √(T ln N / 2) on an adversarial alternating sequence where follow-the-leader loses about T/2; and over long horizons UCB1 and Thompson sampling beat ε-greedy, whose regret keeps growing linearly.',
  checks: `
import numpy as np
rng = np.random.default_rng(50)
u = np.array([np.cos(0.6), np.sin(0.6)])
X = rng.normal(size=(6000, 2)) * 2
m = X @ u
keep = np.abs(m) >= 0.3
X, y = X[keep][:2000], np.sign(m[keep][:2000])
R = np.linalg.norm(X, axis=1).max()
M = perceptron_mistakes(X, y)
assert 0 < M <= (R / 0.3) ** 2, "mistake bound violated"
print(f"PASS: perceptron made {M} mistakes (bound {(R / 0.3) ** 2:.0f})")
T = 2000
L = np.array([[0.5, 0.0]] + [[0.0, 1.0] if t % 2 else [1.0, 0.0] for t in range(1, T)])
regret = hedge(L, np.sqrt(8 * np.log(2) / T)) - L.sum(0).min()
assert regret <= np.sqrt(T * np.log(2) / 2), "Hedge must stay within its regret bound"
print(f"PASS: Hedge regret {regret:.1f} on the adversarial sequence (bound {np.sqrt(T * np.log(2) / 2):.1f}; follow-the-leader loses about {T / 2:.0f})")
means = [0.2, 0.25, 0.3, 0.35, 0.5]
res = {p: np.mean([run_bandit(means, p, 20000, np.random.default_rng(s)) for s in range(6)]) for p in ("eps", "ucb", "ts")}
short = {p: np.mean([run_bandit(means, p, 5000, np.random.default_rng(s)) for s in range(6)]) for p in ("eps", "ucb")}
print("mean regret at 20,000 rounds:", {k: round(float(v), 1) for k, v in res.items()})
assert res["ts"] < res["ucb"] < res["eps"], "Thompson < UCB1 < epsilon-greedy over a long horizon"
assert res["eps"] / short["eps"] > 3 and res["ucb"] / short["ucb"] < 2, "epsilon-greedy grows linearly, UCB1 logarithmically"
print("PASS: bandit regret ordering and growth rates")
`,
}
