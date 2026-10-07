# Gradient descent

Least squares has an exact formula, but it is the exception. Most models, from logistic regression to neural networks, have no formula for their best parameters. What they all have is a loss you can compute and a gradient that points uphill. **Gradient descent** needs nothing more, which is why it is the workhorse that trains nearly every model in modern machine learning.

You met the basic loop in the calculus lessons. This lesson looks at it properly, because in practice it goes wrong in several ways: the step size (the **learning rate**) can be too small, making training crawl, or too large, making it blow up; badly scaled features can make it zigzag; and on large datasets, computing the full gradient every step is too slow. Understanding these failures, and their standard fixes, is most of what "training a model" means day to day.

## The algorithm

Starting from some initial parameters θ (theta, standing for all of the model's parameters at once), repeat:

\[
\theta \leftarrow \theta - \eta \, \nabla L(\theta)
\]

where ∇L is the gradient of the loss and η (eta) is the **learning rate**, the size of each step relative to the gradient. Each step moves the parameters a little downhill. The learning rate is the most important setting in training, and it is not learned; you choose it. A setting like this, chosen by you rather than learned from data, is called a **hyperparameter**. (The polynomial degree in the "what learning is" lesson was one too.)

## Choosing the learning rate

The simplest possible loss shows what the learning rate does: `L(θ) = θ²`, whose gradient is `2θ` and whose minimum is at 0. Predict what happens with each of these four learning rates before running the cell:

```python type
import numpy as np
import matplotlib.pyplot as plt

def descend(lr, steps=20, start=5.0):
    theta = start
    path = [theta]
    for _ in range(steps):
        theta = theta - lr * 2 * theta
        path.append(theta)
    return np.array(path)

fig, axes = plt.subplots(1, 4, figsize=(14, 3), sharey=True)
for ax, lr in zip(axes, [0.02, 0.3, 0.9, 1.05]):
    path = descend(lr)
    ax.plot(path, "o-", markersize=3)
    ax.axhline(0, color="gray", lw=0.8)
    ax.set_title(f"learning rate {lr}")
    ax.set_xlabel("step")
axes[0].set_ylabel("θ")
axes[0].set_ylim(-12, 12)
plt.show()
```

- **0.02, too small**: every step goes the right way, but so slowly that after 20 steps θ is still far from 0.
- **0.3, about right**: θ falls quickly and settles at 0.
- **0.9, too large**: each step overshoots the minimum and lands on the other side. It still converges, but by bouncing back and forth.
- **1.05, far too large**: each overshoot is bigger than the last, and θ flies off to infinity. This is **divergence**, and when it happens in real training the loss becomes `inf` or `nan` within a few steps.

Here the arithmetic shows exactly why. Each step multiplies θ by `(1 − 2η)`. If that factor is between −1 and 1, θ shrinks towards 0; once `η > 1`, the factor is below −1 and θ grows. For a steeper bowl the safe range is smaller: the more sharply the loss curves, the smaller the learning rate must be. In practice you find a good learning rate by trying values spaced by factors of about 3 or 10 (0.001, 0.003, 0.01, ...) and watching the loss.

## Watch the loss

The most important habit in training is to plot the loss after every step, called the **training curve**. It tells you at a glance which situation you are in: too slow, healthy, or diverging.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
x = rng.uniform(-1, 1, 100)
y = 3 * x + 2 + rng.normal(0, 0.3, 100)

def train(lr, steps=100):
    w, b, losses = 0.0, 0.0, []
    for _ in range(steps):
        error = w * x + b - y
        losses.append(np.mean(error ** 2))
        w -= lr * 2 * np.mean(error * x)
        b -= lr * 2 * np.mean(error)
    return losses

fig, ax = plt.subplots()
for lr in [0.01, 0.1, 0.5, 1.2]:
    ax.plot(train(lr), label=f"lr = {lr}")
ax.set_yscale("log")
ax.set_ylim(0.05, 100)
ax.set_xlabel("step")
ax.set_ylabel("training loss (MSE)")
ax.legend()
plt.show()
```

The loss is on a logarithmic scale, the usual choice for training curves because losses often shrink by factors of ten. A curve that is still sloping steeply downwards at the end means the learning rate is too small, or training was too short. A curve that falls quickly and then flattens is healthy; the flat part is the minimum. A curve that shoots upwards means the learning rate is too large. The loss of about 0.09 where the good curves flatten is the noise in the data (standard deviation 0.3, squared), which no line can remove.

## Why feature scaling matters

Gradient descent struggles when features are on very different scales. Suppose one feature is measured in thousands (a house's area in square feet, say) and the loss is very steep in that parameter's direction but shallow in another. The loss surface is then a long, narrow valley: the gradient points mostly across the valley rather than along it, so the steps zigzag from wall to wall while making slow progress along the floor. And the learning rate must be small enough for the steep direction, which makes it far too small for the shallow one.

```python type
import numpy as np

rng = np.random.default_rng(1)
area = rng.uniform(500, 3000, 200)
price = 0.1 * area + 50 + rng.normal(0, 10, 200)

def train(x, y, lr, steps):
    w, b = 0.0, 0.0
    for _ in range(steps):
        error = w * x + b - y
        w -= lr * 2 * np.mean(error * x)
        b -= lr * 2 * np.mean(error)
    return w, b, np.mean((w * x + b - y) ** 2)

w, b, loss = train(area, price, 2e-7, 1000)
print(f"raw feature, lr 2e-7:        w = {w:.4f}, b = {b:.3f}, loss = {loss:.1f}")
z = (area - area.mean()) / area.std()
w, b, loss = train(z, price, 0.1, 1000)
print(f"standardised feature, lr 0.1: w = {w:.4f}, b = {b:.3f}, loss = {loss:.1f}")
```

```output
raw feature, lr 2e-7:        w = 0.1239, b = 0.003, loss = 417.8
standardised feature, lr 0.1: w = 69.3687, b = 226.146, loss = 80.7
```

With the raw feature, the learning rate must be tiny (about 2e-7) to avoid diverging along the steep `w` direction, and after 1,000 steps the intercept `b` has barely moved, so the loss is still large. With the feature standardised (mean 0, standard deviation 1, as in the indexing lesson), both directions have similar steepness, a learning rate of 0.1 is safe, and training converges in far fewer steps. The fitted `w` is different because the feature's units changed, but the predictions are just as good. This is why features are standardised before gradient-based training almost as a rule.

## When to stop

Gradient descent never lands exactly on the minimum; it gets closer and closer. So you need a rule for when to stop. The common choices:

- a **fixed number of steps**, chosen by watching training curves;
- stop when the **loss stops improving**, say by less than a tiny amount over several steps;
- stop when the **gradient is tiny**, since the gradient is zero at the bottom.

A later lesson adds a fourth, important one: stop when the loss on held-out **validation** data stops improving, a technique called early stopping, which also guards against overfitting.

## Stochastic and mini-batch gradient descent

Each step so far computed the gradient using **every** training example. With a million examples, that is a million predictions per step, which is slow. But the gradient is an **average** over the examples, and from the estimation lesson you know that an average can be estimated well from a random sample. So instead of the whole dataset, each step uses a small random **mini-batch** of examples, say 32. The step direction is a little noisy, but each step is thousands of times cheaper, so you can take far more of them.

- **Batch gradient descent**: every step uses all the data.
- **Stochastic gradient descent** (SGD): every step uses a single example.
- **Mini-batch gradient descent**: every step uses a small batch, typically 16 to 256. This is what nearly everyone uses, and people often call it "SGD" anyway.

One pass through the whole dataset is called an **epoch**. At the start of each epoch the data is shuffled, then cut into batches, and one step is taken per batch.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(2)
n = 1000
x = rng.uniform(-1, 1, n)
y = 3 * x + 2 + rng.normal(0, 0.3, n)

def minibatch_sgd(batch_size, lr=0.1, epochs=3, seed=0):
    order_rng = np.random.default_rng(seed)
    w, b, losses = 0.0, 0.0, []
    for _ in range(epochs):
        order = order_rng.permutation(n)
        for start in range(0, n, batch_size):
            batch = order[start:start + batch_size]
            error = w * x[batch] + b - y[batch]
            w -= lr * 2 * np.mean(error * x[batch])
            b -= lr * 2 * np.mean(error)
            losses.append(np.mean((w * x + b - y) ** 2))
    return w, b, losses

fig, ax = plt.subplots()
for batch_size in [1000, 32, 1]:
    w, b, losses = minibatch_sgd(batch_size, lr=0.1 if batch_size > 1 else 0.02)
    epochs_done = np.arange(1, len(losses) + 1) * min(batch_size, n) / n
    ax.plot(epochs_done, losses, label=f"batch size {batch_size}: w = {w:.2f}, b = {b:.2f}")
ax.set_yscale("log")
ax.set_xlabel("epochs (passes through the data)")
ax.set_ylabel("full training loss")
ax.legend(fontsize=8)
plt.show()
```

The x-axis counts epochs, so all three runs are compared for the same amount of computation. The full-batch run takes only 3 steps in 3 epochs (one per epoch), so it barely gets started. The mini-batch run takes about 32 steps per epoch and is already close to the answer after one epoch, with a slightly jittery curve. Batch size 1 takes 1,000 steps per epoch and is noisier still, which is why it needs a smaller learning rate. For the same amount of computation (3 passes through the data), the mini-batches get much further. The noise has a hidden benefit too: in complicated models it helps training escape poor regions of the loss surface.

## More than one valley

For linear regression the loss is a single smooth bowl, so gradient descent reaches the same bottom from any starting point. A loss shaped like a single bowl, with no other dips, is called **convex**. Many models, including neural networks, have losses that are not convex: they have several valleys, and gradient descent finds whichever one it happens to roll into.

```python type
import numpy as np
import matplotlib.pyplot as plt

def f(x):
    return x ** 4 - 3 * x ** 2 + x

def grad(x):
    return 4 * x ** 3 - 6 * x + 1

grid = np.linspace(-2.2, 2.2, 300)
fig, ax = plt.subplots()
ax.plot(grid, f(grid), color="gray")
for start in [-2.0, 0.5, 2.0]:
    x = start
    for _ in range(100):
        x -= 0.01 * grad(x)
    ax.plot(x, f(x), "o", markersize=9, label=f"start {start} → ends at {x:.2f}, loss {f(x):.2f}")
ax.legend(fontsize=8)
plt.show()
```

Starting on the left, gradient descent finds the deeper valley; starting on the right, it gets stuck in the shallower one. A minimum like that, lowest nearby but not overall, is a **local minimum**, and the deepest one is the **global minimum**. In practice, for large neural networks, poor local minima turn out to be less of a problem than you might fear, but it is why results can depend on the random starting point, and why training is often repeated with different random seeds.

::: challenge The largest safe learning rate [easy]
For the loss `L(θ) = a θ²` with gradient `2aθ`, each gradient descent step multiplies θ by `(1 − 2aη)`. Write a function `run(a, lr, steps=50, start=1.0)` that performs `steps` gradient descent steps from `start` and returns the final θ. Then, for `a = 5`, find the largest learning rate in the list `[0.01, 0.05, 0.1, 0.15, 0.19, 0.21, 0.3]` for which the final θ after 50 steps has a smaller absolute value than the start, and store it in `largest_safe`.

```python starter
def run(a, lr, steps=50, start=1.0):
    return start

largest_safe = 0.0
print(largest_safe)
```

```python solution
def run(a, lr, steps=50, start=1.0):
    theta = start
    for _ in range(steps):
        theta = theta - lr * 2 * a * theta
    return theta

candidates = [0.01, 0.05, 0.1, 0.15, 0.19, 0.21, 0.3]
largest_safe = max(lr for lr in candidates if abs(run(5, lr)) < 1.0)
print(largest_safe)
```

```python test
import numpy as _np
assert "run" in dir(), "Keep the function's name as run."
assert _np.isclose(run(1, 0.25, steps=1, start=4.0), 2.0), "One step with a = 1 and lr = 0.25 from 4 gives 4 − 0.25 × 2 × 4 = 2."
assert _np.isclose(run(5, 0.1, steps=3), 0.0), "With a = 5 and lr = 0.1 each step multiplies by 1 − 2×5×0.1 = 0, landing on 0."
assert abs(run(5, 0.21)) > 1, "With a = 5, lr = 0.21 should diverge: the factor is 1 − 2.1 = −1.1."
assert largest_safe == 0.19, f"The factor 1 − 10η stays between −1 and 1 up to η = 0.2, so the largest safe rate in the list is 0.19, but largest_safe is {largest_safe}."
"SUCCESS: Steeper bowls need smaller steps: here anything above 1/a = 0.2 diverges."
```

Hint: The loop body is one line: `theta = theta - lr * 2 * a * theta`. Then check each candidate learning rate and keep the largest whose final value is smaller in size than 1.
:::

::: challenge Train a line by gradient descent [medium]
Write a function `train_line(x, y, lr, steps)` that fits `ŷ = w x + b` by full-batch gradient descent on the mean squared error, starting from `w = b = 0`, and returns `(w, b)`. The feature `x` may be on any scale, so inside the function:

1. standardise it, `z = (x − mean) / std`, and run gradient descent on `z`;
2. convert the result back to the original units before returning: if `ŷ = w_z z + b_z`, then `w = w_z / std` and `b = b_z − w_z × mean / std`.

The returned line should match the exact least squares line.

```python starter
import numpy as np

def train_line(x, y, lr, steps):
    return 0.0, 0.0

rng = np.random.default_rng(3)
x = rng.uniform(1000, 5000, 100)
y = 0.02 * x + 7 + rng.normal(0, 3, 100)
print(train_line(x, y, 0.1, 500), np.polyfit(x, y, 1))
```

```python solution
import numpy as np

def train_line(x, y, lr, steps):
    mean, std = x.mean(), x.std()
    z = (x - mean) / std
    w_z, b_z = 0.0, 0.0
    for _ in range(steps):
        error = w_z * z + b_z - y
        w_z -= lr * 2 * np.mean(error * z)
        b_z -= lr * 2 * np.mean(error)
    return w_z / std, b_z - w_z * mean / std

rng = np.random.default_rng(3)
x = rng.uniform(1000, 5000, 100)
y = 0.02 * x + 7 + rng.normal(0, 3, 100)
print(train_line(x, y, 0.1, 500), np.polyfit(x, y, 1))
```

```python test
import numpy as _np
assert "train_line" in dir(), "Keep the function's name as train_line."
_rng = _np.random.default_rng(4)
for _lo, _hi, _w, _b in [(1000, 5000, 0.02, 7), (0, 1, -4, 2), (-300, 300, 1.5, -20)]:
    _x = _rng.uniform(_lo, _hi, 80)
    _y = _w * _x + _b + _rng.normal(0, 1, 80)
    _got = train_line(_x, _y, 0.1, 1000)
    assert _np.allclose(_got, _np.polyfit(_x, _y, 1), rtol=1e-4, atol=1e-4), f"For x from {_lo} to {_hi} the least squares line is {tuple(_np.polyfit(_x, _y, 1).round(5))}, but train_line returned {tuple(_np.round(_got, 5))}. Standardise, train, then convert back."
"SUCCESS: Gradient descent reached the exact least squares line, whatever the scale of the feature."
```

Hint: Train `w_z` and `b_z` exactly as in the lesson's loop, but on `z`. To convert back, substitute `z = (x − mean) / std` into `w_z z + b_z` and collect the terms in `x` and the constant terms.
:::

::: challenge Mini-batch SGD [easy]
Write a function `sgd_line(x, y, lr, epochs, batch_size, seed)` that fits `ŷ = w x + b` by mini-batch gradient descent, starting from `w = b = 0` and returning `(w, b)`. To make results checkable, follow the lesson's procedure exactly:

- create `rng = np.random.default_rng(seed)` once;
- at the start of **each** epoch, `order = rng.permutation(len(x))`;
- take batches `order[start:start + batch_size]` for `start` in `range(0, len(x), batch_size)`;
- for each batch, compute the error on that batch and update `w` then `b` (both using the same error).

```python starter
import numpy as np

def sgd_line(x, y, lr, epochs, batch_size, seed):
    return 0.0, 0.0

rng = np.random.default_rng(5)
x = rng.uniform(-1, 1, 500)
y = -2 * x + 0.5 + rng.normal(0, 0.2, 500)
print(sgd_line(x, y, 0.1, 5, 32, 0))
```

```python solution
import numpy as np

def sgd_line(x, y, lr, epochs, batch_size, seed):
    rng = np.random.default_rng(seed)
    w, b = 0.0, 0.0
    for _ in range(epochs):
        order = rng.permutation(len(x))
        for start in range(0, len(x), batch_size):
            batch = order[start:start + batch_size]
            error = w * x[batch] + b - y[batch]
            w -= lr * 2 * np.mean(error * x[batch])
            b -= lr * 2 * np.mean(error)
    return w, b

rng = np.random.default_rng(5)
x = rng.uniform(-1, 1, 500)
y = -2 * x + 0.5 + rng.normal(0, 0.2, 500)
print(sgd_line(x, y, 0.1, 5, 32, 0))
```

```python test
import numpy as _np
assert "sgd_line" in dir(), "Keep the function's name as sgd_line."
def _ref(x, y, lr, epochs, bs, seed):
    r = _np.random.default_rng(seed)
    w = b = 0.0
    for _ in range(epochs):
        o = r.permutation(len(x))
        for s in range(0, len(x), bs):
            bt = o[s:s + bs]
            e = w * x[bt] + b - y[bt]
            w -= lr * 2 * _np.mean(e * x[bt])
            b -= lr * 2 * _np.mean(e)
    return w, b
_rng = _np.random.default_rng(5)
_x = _rng.uniform(-1, 1, 500)
_y = -2 * _x + 0.5 + _rng.normal(0, 0.2, 500)
for _args in [(0.1, 5, 32, 0), (0.05, 2, 1, 1), (0.1, 3, 500, 2), (0.1, 1, 64, 3)]:
    _want = _ref(_x, _y, *_args)
    _got = sgd_line(_x, _y, *_args)
    assert _np.allclose(_got, _want), f"With lr, epochs, batch_size, seed = {_args} the result should be {tuple(round(v, 5) for v in _want)}, but got {tuple(_np.round(_got, 5))}. Follow the procedure exactly: one generator, a new permutation each epoch."
_w, _b = sgd_line(_x, _y, 0.1, 5, 32, 0)
assert abs(_w + 2) < 0.1 and abs(_b - 0.5) < 0.1, "After 5 epochs the line should be close to w = −2, b = 0.5."
"SUCCESS: The training loop behind nearly every neural network, in miniature."
```

Hint: Two nested loops: epochs on the outside, batches on the inside. Index `x` and `y` with the batch's positions to get that batch's examples.
:::

## What you learned

- Gradient descent repeats θ ← θ − η∇L(θ). The learning rate η is a hyperparameter: chosen by you, not learned.
- Too small a learning rate crawls; a good one converges quickly; too large bounces or diverges to infinity. Steeper losses need smaller learning rates.
- Plot the training loss, usually on a log scale, to see which case you are in.
- Features on very different scales make a narrow valley and force a tiny learning rate; standardising features fixes it.
- Stop after a set number of steps, when the loss stops improving, or when the gradient is tiny.
- Mini-batch gradient descent estimates the gradient from a small random batch each step: noisier, far cheaper, and the standard method. One pass through the data is an epoch; shuffle every epoch.
- Convex losses have one bowl; non-convex losses can trap gradient descent in a local minimum, so the starting point matters.

With gradient descent and standardised features in hand, the next lesson moves from one feature to many: multiple regression, written with matrices so that one line of NumPy handles any number of features.
