// Part 6 exercises: turning an equation from a paper into code, the last step of the reading method.
import { checks, py } from './checks.js'

export const EXERCISES = {
  'reading-papers': {
    prompt: py`Translate the general training objective into code, one piece per symbol:
$$\mathcal J(\theta) = \frac1n\sum_{i=1}^n \ell\big(f_\theta(x_i),\, y_i\big) + \lambda\,\|\theta\|^2$$
Write \`objective(theta, data, f, loss, lam)\`, where \`theta\` is a list of parameters, \`data\` a list of \`(x, y)\` pairs, \`f(theta, x)\` the model and \`loss(prediction, y)\` the per-example loss. The checks plug in two different models and losses: the same code must serve both, as the equation does.`,
    starter: py`def objective(theta, data, f, loss, lam):
    ...
`,
    solution: py`def objective(theta, data, f, loss, lam):
    average = sum(loss(f(theta, x), y) for x, y in data) / len(data)
    penalty = lam * sum(t * t for t in theta)
    return average + penalty
`,
    checks: checks(py`
line = lambda th, x: th[0] * x + th[1]
square = lambda p, y: (p - y) ** 2
data = [(1, 52), (2, 55), (3, 61), (4, 64)]
expect(objective([4, 48], data, line, square, 0), 0.5, "objective for a line with squared error, λ = 0")
expect(objective([4, 48], data, line, square, 0.01), 0.5 + 0.01 * (16 + 48 * 48), "the same with λ = 0.01")
sig = lambda th, x: 1 / (1 + math.exp(-(th[0] * x + th[1])))
bce = lambda p, y: -(y * math.log(p) + (1 - y) * math.log(1 - p))
expect(objective([0, 0], [(1, 0), (2, 1)], sig, bce, 0), math.log(2), "objective for logistic regression at θ = 0")
`),
    hints: ['$\\frac1n\\sum_i$ is an average over `data`; $\\|\\theta\\|^2$ is the sum of squares of `theta`.'],
  },

  'decode-practice': {
    prompt: py`Two pieces of the policy gradient $\mathbb E\left[\sum_t\nabla_\theta\log\pi_\theta(a_t\mid s_t)\,G_t\right]$.

1. \`returns(rewards, gamma)\`: $G_t = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \dots$ for every $t$, computed **backwards** in one pass using $G_t = r_t + \gamma G_{t+1}$.
2. For a softmax policy over actions with scores θ (no state), $\nabla_\theta\log\pi(a) = \mathbf e_a - \boldsymbol\pi$ (the softmax-cross-entropy result, sign flipped). Write \`score(theta, a)\` for it and \`expected_gradient(theta, rewards)\` $= \sum_a \pi(a)\,\nabla\log\pi(a)\,r_a$. The checks confirm it equals the true gradient of the expected reward $\sum_a \pi(a) r_a$: the "log-derivative trick" at the heart of REINFORCE.`,
    starter: py`import math

def softmax(zs):
    top = max(zs)
    e = [math.exp(z - top) for z in zs]
    return [x / sum(e) for x in e]

def returns(rewards, gamma):
    ...

def score(theta, a):
    ...

def expected_gradient(theta, rewards):
    ...
`,
    solution: py`import math

def softmax(zs):
    top = max(zs)
    e = [math.exp(z - top) for z in zs]
    return [x / sum(e) for x in e]

def returns(rewards, gamma):
    G = 0.0
    out = []
    for r in reversed(rewards):
        G = r + gamma * G
        out.append(G)
    return out[::-1]

def score(theta, a):
    pi = softmax(theta)
    return [(1 if k == a else 0) - p for k, p in enumerate(pi)]

def expected_gradient(theta, rewards):
    pi = softmax(theta)
    g = [0.0] * len(theta)
    for a, r in enumerate(rewards):
        s = score(theta, a)
        for k in range(len(theta)):
            g[k] += pi[a] * s[k] * r
    return g
`,
    checks: checks(py`
expect(returns([1, 1, 1], 1), [3, 2, 1], "returns([1, 1, 1], 1)")
expect(returns([0, 0, 10], 0.9), [8.1, 9, 10], "returns([0, 0, 10], 0.9)")
expect(returns([], 0.9), [], "returns of an empty episode")
expect(score([0, 0], 0), [0.5, -0.5], "score([0, 0], 0)")
J = lambda th: sum(p * r for p, r in zip(softmax(th), [1.0, 3.0, -2.0]))
for th in [[0, 0, 0], [0.5, -1, 2]]:
    true = []
    for k in range(3):
        up, dn = list(th), list(th)
        up[k] += 1e-6
        dn[k] -= 1e-6
        true.append((J(up) - J(dn)) / 2e-6)
    expect(expected_gradient(th, [1.0, 3.0, -2.0]), true, f"expected_gradient at θ = {th}", tol=1e-6)
`),
    hints: ['Walk the rewards from the end: `for r in reversed(rewards)`, then reverse the list you built.', '$\\mathbf e_a$ is the one-hot vector for action $a$.'],
  },
}
