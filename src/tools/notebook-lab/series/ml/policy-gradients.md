# Policy gradients

Every reinforcement learning method so far has learned **values** (how good a state or action is) and then acted by picking the best. **Policy gradient** methods skip the middle step: they learn the **policy** directly, as a function with parameters θ that outputs a probability for each action, and adjust θ by gradient ascent to make high-return behaviour more likely. This handles things value methods find awkward: continuous actions (output the mean and spread of a force, instead of taking a max over infinitely many actions), stochastic policies (sometimes the best play really is random, as in rock-paper-scissors), and smooth improvement (small changes to θ change behaviour a little, instead of flipping the argmax).

This lesson derives the simplest policy gradient algorithm, **REINFORCE**, trains a linear policy on CartPole with it, and adds a **baseline**, which reduces the noise in its gradient. Policy gradients are the ancestor of the methods used to train large language models from human feedback.

## The objective and its gradient

A policy πθ(a | s) gives the probability of action a in state s. The goal is to maximise the expected return, J(θ) = E[G], averaged over the episodes the policy produces. The trouble: the return depends on θ only through **which actions get sampled**, and sampling is not differentiable.

The **log-derivative trick** gets round it. For any function f and any distribution pθ, the gradient of the expectation can be rewritten as an expectation:

\[
\nabla_\theta \, \mathbb{E}_{a \sim p_\theta}[f(a)] = \mathbb{E}_{a \sim p_\theta}\big[f(a)\, \nabla_\theta \log p_\theta(a)\big]
\]

It comes from ∇p = p ∇log p, applied inside the sum over actions. The right-hand side can be **estimated by sampling**: draw actions, and average f(a) times the gradient of the log-probability of the action drawn. Applied to whole episodes, the probability of an episode's actions is a product of πθ(aₜ | sₜ) terms (the environment's own probabilities do not depend on θ, and drop out of the gradient), so its log is a sum. The result is the **policy gradient theorem** in its REINFORCE form:

\[
\nabla_\theta J \approx \sum_t G_t \, \nabla_\theta \log \pi_\theta(a_t \mid s_t)
\]

Each step's log-probability is weighted by the return that followed it, Gₜ. Read it as: **push up the probability of every action taken, in proportion to how well things went afterwards.** Actions followed by high returns become more likely; actions followed by low returns, less likely (relative to the others).

## A linear softmax policy

For CartPole, the simplest policy is linear: scores z = sW + b for the two actions, turned into probabilities with a softmax. The gradient of its log-probability is familiar from the softmax regression lesson: for the action taken, ∇_W log π(a | s) = s ⊗ (onehot(a) − π(· | s)), the outer product of the state with "the action taken minus the probabilities". It is the cross-entropy gradient with the sign flipped: REINFORCE is supervised learning on its own actions, with each example weighted by the return that followed.

## The baseline

The raw returns are all positive in CartPole (+1 per step), so every action gets its probability pushed up, just some more than others. The gradient estimate is correct on average but extremely noisy. Subtracting a **baseline** b from the return, (Gₜ − b), leaves the expected gradient unchanged (because E[∇log π] = 0: the probabilities always sum to 1) but can greatly reduce its variance: now actions that did better than usual are pushed up and those that did worse are pushed down. A simple baseline is the average return. The code uses a common practical shortcut instead: it standardises each episode's returns using that episode's own mean and standard deviation. That only approximates the theory (a baseline computed from the same episode depends slightly on its actions, and dividing by the standard deviation rescales the gradient), but it works well and is widely used; the variance challenge below shows the clean, constant baseline. Here both versions divide by the returns' standard deviation (to keep the step sizes comparable); the baseline version also subtracts their mean. Before running, predict which will learn faster.

```python type
import numpy as np

class CartPole:
    def __init__(self, seed=0):
        self.rng = np.random.default_rng(seed)

    def reset(self):
        self.state = self.rng.uniform(-0.05, 0.05, 4)
        self.steps = 0
        return self.state.copy()

    def step(self, action):
        x, x_dot, theta, theta_dot = self.state
        force = 10.0 if action == 1 else -10.0
        cos, sin = np.cos(theta), np.sin(theta)
        temp = (force + 0.05 * theta_dot ** 2 * sin) / 1.1
        theta_acc = (9.8 * sin - cos * temp) / (0.5 * (4 / 3 - 0.1 * cos ** 2 / 1.1))
        x_acc = temp - 0.05 * theta_acc * cos / 1.1
        self.state = np.array([x + 0.02 * x_dot, x_dot + 0.02 * x_acc, theta + 0.02 * theta_dot, theta_dot + 0.02 * theta_acc])
        self.steps += 1
        fell = abs(self.state[0]) > 2.4 or abs(self.state[2]) > 0.21
        return self.state.copy(), 1.0, fell or self.steps >= 200, fell

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

scale = np.array([2.4, 3.0, 0.21, 3.5])

def reinforce(baseline, episodes=400, lr=0.01, gamma=0.99, seed=0):
    rng, env = np.random.default_rng(seed), CartPole(seed)
    W, b = np.zeros((4, 2)), np.zeros(2)
    lengths = []
    for episode in range(episodes):
        state, trajectory = env.reset() / scale, []
        while True:
            probs = softmax(state @ W + b)
            action = int(rng.choice(2, p=probs))
            nxt, reward, done, _ = env.step(action)
            trajectory.append((state, action, reward, probs))
            state = nxt / scale
            if done:
                break
        G, returns = 0.0, []
        for _, _, reward, _ in reversed(trajectory):
            G = reward + gamma * G
            returns.append(G)
        returns = np.array(returns[::-1])
        weights = (returns - returns.mean() if baseline else returns) / (returns.std() + 1e-8)
        grad_W, grad_b = np.zeros_like(W), np.zeros_like(b)
        for (s, a, _, probs), weight in zip(trajectory, weights):
            direction = -probs
            direction[a] += 1
            grad_W += np.outer(s, direction) * weight
            grad_b += direction * weight
        W += lr * grad_W
        b += lr * grad_b
        lengths.append(len(trajectory))
    return np.array(lengths)

for use_baseline in [False, True]:
    lengths = reinforce(use_baseline)
    blocks = [round(lengths[i:i + 100].mean()) for i in range(0, 400, 100)]
    print(f"{'with baseline' if use_baseline else 'no baseline':<14} average episode length per 100 episodes: {blocks}")
```

```output
no baseline    average episode length per 100 episodes: [16, 33, 95, 113]
with baseline  average episode length per 100 episodes: [30, 111, 165, 175]
```

`direction` is onehot(a) − π(· | s): start from minus the probabilities and add 1 for the action taken. Multiplied by the state (for W) and by the episode's weight for that step, then summed over the episode, it is the REINFORCE gradient estimate. The update **adds** it (gradient ascent), since the aim is to increase the expected return. Note the plus sign: `W += lr * grad_W`.

Both versions learn to balance the pole for much longer than random pushing (about 23 steps), but the baseline version gets there much faster: in this run it averages over a hundred steps per episode in its second block of a hundred episodes, while the version without a baseline is still near 30, and it stays well ahead after that (175 against 113 in the last block). Policy gradient methods are notoriously noisy: rerun with other seeds (the `seed` argument) and the curves vary a lot, which is why practical methods work hard on variance reduction.

## Beyond REINFORCE

REINFORCE waits for whole episodes and uses noisy Monte Carlo returns, so it learns slowly. The methods used in practice keep the policy gradient but borrow from the earlier lessons:

- **Actor-critic** methods learn a value function (the **critic**) alongside the policy (the **actor**) and use it as the baseline, or replace the return Gₜ with the TD target r + γV(s'), so updates can happen every step with much less variance. The difference Gₜ − V(sₜ), or its TD version, is called the **advantage**: how much better the action was than expected.
- **PPO** (proximal policy optimisation) limits how far each update can move the policy, which makes training far more stable. It is a common default for robotics and games, and it is the algorithm used in **RLHF** (reinforcement learning from human feedback) to fine-tune language models, where the "return" is a reward model's score of the model's answer.
- For continuous actions, the policy outputs the parameters of a distribution (for example a normal distribution's mean and spread), samples an action, and the same log-derivative gradient applies.

::: challenge The log-policy gradient [easy]
For a linear softmax policy with scores z = sW + b, write `log_policy_gradient(s, a, W, b)` returning a tuple `(grad_W, grad_b)` of the gradient of log π(a | s): grad_W is the outer product of `s` with (onehot(a) − π), and grad_b is (onehot(a) − π).

```python starter
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

def log_policy_gradient(s, a, W, b):
    return np.zeros_like(W), np.zeros_like(b)
```

```python solution
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

def log_policy_gradient(s, a, W, b):
    direction = -softmax(s @ W + b)
    direction[a] += 1
    return np.outer(s, direction), direction
```

```python test
import numpy as _np
assert "log_policy_gradient" in dir(), "Keep the function's name as log_policy_gradient."
_r = _np.random.default_rng(0)
_s, _W, _b = _r.normal(size=4), _r.normal(size=(4, 3)), _r.normal(size=3)
def _logp(W, b, a):
    z = _s @ W + b; return z[a] - _np.log(_np.sum(_np.exp(z)))
for _a in range(3):
    _gW, _gb = log_policy_gradient(_s, _a, _W, _b)
    _nW = _np.zeros_like(_W)
    for _i in _np.ndindex(_W.shape):
        _u = _W.copy(); _u[_i] += 1e-6; _d = _W.copy(); _d[_i] -= 1e-6
        _nW[_i] = (_logp(_u, _b, _a) - _logp(_d, _b, _a)) / 2e-6
    _nb = _np.array([(_logp(_W, _b + 1e-6 * _e, _a) - _logp(_W, _b - 1e-6 * _e, _a)) / 2e-6 for _e in _np.eye(3)])
    assert _np.allclose(_gW, _nW, atol=1e-6) and _np.allclose(_gb, _nb, atol=1e-6), f"For action {_a}, your gradient does not match the numerical gradient of log π(a | s)."
assert _np.isclose(log_policy_gradient(_s, 1, _W, _b)[1].sum(), 0), "The bias gradient (onehot − π) always sums to 0."
"SUCCESS: The direction that makes the chosen action more likely: the state times (the action taken minus the probabilities)."
```

Hint: Compute the probabilities with `softmax(s @ W + b)`, negate them, add 1 at position `a`, and take the outer product with `s`.
:::

::: challenge The log-derivative trick [medium]
Check the trick numerically. A softmax policy over 3 actions has scores `theta` (so π = softmax(θ)), and each action has a fixed payoff `f = [1.0, 3.0, -2.0]`. The exact gradient of the expected payoff E[f] = Σ π(a) f(a) with respect to θ is ∇E = π ⊙ (f − E[f]).

Write `exact_gradient(theta, f)` returning that, and `sampled_gradient(theta, f, n, seed)` that estimates it by sampling: draw `n` actions with `rng.choice(3, size=n, p=pi)` (with `rng = np.random.default_rng(seed)`), and average f(a) × (onehot(a) − π) over the samples. Then store, for θ = [0.5, −0.2, 0.1], the largest absolute difference between the two with n = 100,000 and seed 0 in `gap`.

```python starter
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

def exact_gradient(theta, f):
    return np.zeros_like(theta)

def sampled_gradient(theta, f, n, seed):
    return np.zeros_like(theta)

f = np.array([1.0, 3.0, -2.0])
theta = np.array([0.5, -0.2, 0.1])
gap = 1.0
print(gap)
```

```python solution
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

def exact_gradient(theta, f):
    pi = softmax(theta)
    return pi * (f - pi @ f)

def sampled_gradient(theta, f, n, seed):
    rng = np.random.default_rng(seed)
    pi = softmax(theta)
    actions = rng.choice(3, size=n, p=pi)
    directions = np.eye(3)[actions] - pi
    return (f[actions][:, None] * directions).mean(axis=0)

f = np.array([1.0, 3.0, -2.0])
theta = np.array([0.5, -0.2, 0.1])
gap = float(np.abs(exact_gradient(theta, f) - sampled_gradient(theta, f, 100000, 0)).max())
print(gap)
```

```python test
import numpy as _np
assert "exact_gradient" in dir() and "sampled_gradient" in dir(), "Keep both function names."
_f = _np.array([1.0, 3.0, -2.0])
_t = _np.array([0.5, -0.2, 0.1])
def _E(th):
    e = _np.exp(th - th.max()); p = e / e.sum(); return p @ _f
_num = _np.array([(_E(_t + 1e-6 * e) - _E(_t - 1e-6 * e)) / 2e-6 for e in _np.eye(3)])
assert _np.allclose(exact_gradient(_t, _f), _num, atol=1e-8), "exact_gradient should be π ⊙ (f − E[f]), which matches the numerical gradient of E[f]."
_g = _np.random.default_rng(4)
_p = _np.exp(_t) / _np.exp(_t).sum()
_acts = _g.choice(3, size=500, p=_p)
_want = (_f[_acts][:, None] * (_np.eye(3)[_acts] - _p)).mean(axis=0)
assert _np.allclose(sampled_gradient(_t, _f, 500, 4), _want), "sampled_gradient should draw n actions with rng.choice(3, size=n, p=pi) and average f(a) × (onehot(a) − π)."
assert _np.isclose(gap, _np.abs(exact_gradient(_t, _f) - sampled_gradient(_t, _f, 100000, 0)).max()) and gap < 0.02, "gap should be small: with 100,000 samples the estimate is close to the exact gradient."
f"SUCCESS: Sampling actions and weighting the log-probability gradient by the payoff estimates the true gradient (largest error {gap:.4f} with 100,000 samples), without ever differentiating through the random choice."
```

Hint: `np.eye(3)[actions]` turns the sampled actions into one-hot rows; subtract `pi` from each row, multiply by `f[actions][:, None]`, and average over the rows.
:::

::: challenge Why baselines help [medium]
Measure the effect of a baseline on the gradient's noise, using the same 3-action setting. Write `estimator_variance(theta, f, baseline, n_estimates, batch, seed)` that computes `n_estimates` sampled gradient estimates, each from `batch` actions (drawn as in the previous challenge, with one generator `rng = np.random.default_rng(seed)` for everything), using weight (f(a) − baseline) instead of f(a), and returns the total variance: the sum over the 3 components of the variance of the estimates.

Store the results for θ = [0.5, −0.2, 0.1], payoffs `f = [10.0, 12.0, 7.0]` (all large and positive, like CartPole's returns), 500 estimates of batch 20 and seed 0, in `variance_none` (baseline 0) and `variance_mean` (baseline equal to the exact expected payoff, Σ π(a) f(a)).

```python starter
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

def estimator_variance(theta, f, baseline, n_estimates, batch, seed):
    return 0.0

f = np.array([10.0, 12.0, 7.0])
theta = np.array([0.5, -0.2, 0.1])
variance_none = 0.0
variance_mean = 0.0
print(variance_none, variance_mean)
```

```python solution
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

def estimator_variance(theta, f, baseline, n_estimates, batch, seed):
    rng = np.random.default_rng(seed)
    pi = softmax(theta)
    estimates = []
    for _ in range(n_estimates):
        actions = rng.choice(3, size=batch, p=pi)
        directions = np.eye(3)[actions] - pi
        estimates.append(((f[actions] - baseline)[:, None] * directions).mean(axis=0))
    return float(np.var(np.array(estimates), axis=0).sum())

f = np.array([10.0, 12.0, 7.0])
theta = np.array([0.5, -0.2, 0.1])
variance_none = estimator_variance(theta, f, 0.0, 500, 20, 0)
variance_mean = estimator_variance(theta, f, softmax(theta) @ f, 500, 20, 0)
print(variance_none, variance_mean)
```

```python test
import numpy as _np
assert "estimator_variance" in dir(), "Keep the function's name as estimator_variance."
def _ref(th, f, base, n, batch, seed):
    g = _np.random.default_rng(seed); e = _np.exp(th - th.max()); p = e / e.sum(); est = []
    for _ in range(n):
        a = g.choice(3, size=batch, p=p); est.append(((f[a] - base)[:, None] * (_np.eye(3)[a] - p)).mean(axis=0))
    return float(_np.var(_np.array(est), axis=0).sum())
_f = _np.array([10.0, 12.0, 7.0]); _t = _np.array([0.5, -0.2, 0.1])
assert _np.isclose(estimator_variance(_t, _f, 3.0, 40, 5, 2), _ref(_t, _f, 3.0, 40, 5, 2)), "estimator_variance differs from the expected computation on a small case. Use one generator for all the estimates, and the weight f(a) − baseline."
_p = _np.exp(_t) / _np.exp(_t).sum()
assert _np.isclose(variance_none, _ref(_t, _f, 0.0, 500, 20, 0)) and _np.isclose(variance_mean, _ref(_t, _f, _p @ _f, 500, 20, 0)), "variance_none and variance_mean should come from your function, with baselines 0 and Σ π f."
assert variance_mean < variance_none / 5, "Subtracting the mean payoff should cut the variance a lot."
f"SUCCESS: Same expected gradient, very different noise: total variance {variance_none:.2f} without a baseline, {variance_mean:.2f} with the mean payoff as baseline. When every payoff is large and positive, subtracting the average is what turns 'everything was good' into 'this was better than usual'."
```

Hint: Inside a loop over estimates, draw a batch of actions and compute one estimate as in the previous challenge, but with `(f[actions] - baseline)`. Stack the estimates and sum `np.var(..., axis=0)`.
:::

## What you learned

- Policy gradient methods learn a parameterised policy πθ(a | s) directly, by gradient ascent on the expected return; they handle continuous actions and stochastic policies naturally.
- The log-derivative trick, ∇E[f] = E[f ∇log p], turns the gradient of an expectation over sampled actions into something that can be estimated by sampling. REINFORCE weights each step's ∇log π(aₜ | sₜ) by the return Gₜ that followed.
- For a linear softmax policy, ∇log π(a | s) = s ⊗ (onehot(a) − π): supervised learning on the agent's own actions, weighted by how well they turned out.
- Subtracting a baseline from the returns keeps the gradient unbiased but cuts its variance; with it, REINFORCE learned CartPole much faster.
- Actor-critic methods use a learned value function as the baseline or TD target; PPO stabilises updates and is the classic algorithm used in RLHF for language models.

That completes the reinforcement learning part of the series. The last two lessons step back to the practical end of machine learning: interpreting and checking a trained model, and then carrying a whole problem from raw data to a model you can defend.
