# Optimisers

Plain gradient descent takes a step of the same size, the learning rate times the gradient, in every direction. That is a poor fit for the loss surfaces of real networks, which are full of long narrow valleys: steep across, gentle along. A step large enough to make progress along the valley overshoots across it, and a step small enough to be stable across it crawls along it. The learning rate lesson showed the symptom: a rate just a little too large and training falls apart.

This lesson builds the three improvements that almost every network is trained with today, each from a few lines of NumPy: **momentum**, which builds up speed in consistent directions; **RMSProp**, which gives each parameter its own step size; and **Adam**, which combines the two. It compares them on a narrow valley you can see, then on the digits network from the last lesson, and ends with **learning rate schedules**.

## A narrow valley

The function f(x, y) = ½(x² + 25y²) is a bowl 25 times steeper in the y direction than in x: a long, narrow valley along the x-axis, with its lowest point at (0, 0). Its gradient is (x, 25y). Gradient descent from (−10, 2) must travel a long way in x while not overshooting in y.

For a bowl like this, plain gradient descent becomes unstable once the learning rate exceeds 2 divided by the steepest curvature (the second derivative, which is 25 in the y direction), here 2/25 = 0.08: across the valley, every step overshoots by more than it corrects, and the zigzag grows. Predict before running: what happens at a rate of 0.081?

```python type
import numpy as np

def loss(p):
    return 0.5 * (p[0] ** 2 + 25 * p[1] ** 2)

def gradient(p):
    return np.array([p[0], 25 * p[1]])

def plain_descent(learning_rate, steps=300):
    p = np.array([-10.0, 2.0])
    for step in range(1, steps + 1):
        p = p - learning_rate * gradient(p)
        if loss(p) < 1e-3:
            return step, loss(p)
    return None, loss(p)

for learning_rate in [0.01, 0.03, 0.079, 0.081]:
    steps, final = plain_descent(learning_rate)
    reached = f"reached loss 0.001 after {steps} steps" if steps else f"after 300 steps the loss is {final:.3g}"
    print(f"learning rate {learning_rate}: {reached}")
```

```output
learning rate 0.01: after 300 steps the loss is 0.12
learning rate 0.03: reached loss 0.001 after 178 steps
learning rate 0.079: reached loss 0.001 after 214 steps
learning rate 0.081: after 300 steps the loss is 1.36e+08
```

With 0.01, the steps along x are so small that 300 are not enough. With 0.03 it takes 178 steps. With 0.079, just under the limit, the zigzag across the valley barely dies down and it takes even longer, 214 steps; and at 0.081 the zigzag grows until the loss is in the hundreds of millions. The step size is held hostage by the steepest direction.

## Momentum

Picture a heavy ball rolling down the valley. It does not respond to each gradient on its own: it **accumulates velocity**. Pushes that keep pointing the same way (along the valley) add up and build speed; pushes that alternate (across the valley) cancel out. That is **momentum**:

\[
v \leftarrow \beta v + g, \qquad w \leftarrow w - \eta \, v
\]

where `g` is the gradient, η (eta) the learning rate, and β, usually 0.9, controls how much of the old velocity is kept. The velocity is a running, decaying sum of past gradients: with β = 0.9, roughly the last ten. One consequence to keep in mind: when the gradient points the same way step after step, the velocity builds up to g/(1 − β), so the step becomes η/(1 − β), **ten times** larger than plain gradient descent's at the same η. Across the valley, where the gradient flips sign each step, the contributions cancel instead, which is why momentum can use a rate whose long-run step would be unstable for plain descent.

## RMSProp

A different fix: give every parameter its **own** step size, scaled down where gradients are large and up where they are small. RMSProp keeps a running average of each parameter's **squared** gradient, and divides the step by its square root:

\[
s \leftarrow \rho s + (1 - \rho) g^2, \qquad w \leftarrow w - \eta \, \frac{g}{\sqrt{s} + \epsilon}
\]

All the operations are element by element. ρ (rho) is usually 0.9, and ε, a tiny number such as 10⁻⁸, prevents division by zero. In the steep y direction, √s is large, so steps shrink; in the gentle x direction they grow. Dividing a gradient by its own typical size makes every parameter move at about the same rate, around η per step, whatever the scale of its gradients. (The name is from **r**oot **m**ean **s**quare.)

## Adam

**Adam** (adaptive moment estimation) does both: a momentum-like running average of the gradients, `m`, and an RMSProp-like running average of their squares, `v`, then steps by their ratio:

\[
m \leftarrow \beta_1 m + (1 - \beta_1) g, \qquad v \leftarrow \beta_2 v + (1 - \beta_2) g^2
\]
\[
\hat m = \frac{m}{1 - \beta_1^t}, \qquad \hat v = \frac{v}{1 - \beta_2^t}, \qquad w \leftarrow w - \eta \, \frac{\hat m}{\sqrt{\hat v} + \epsilon}
\]

with defaults β₁ = 0.9, β₂ = 0.999, ε = 10⁻⁸, and `t` the step number. The middle line is the **bias correction**: `m` and `v` start at zero, so for the first few steps they are much smaller than the true averages (after one step, `m` is only 0.1 g). Dividing by 1 − βᵗ, which is 0.1 after one step and approaches 1 later, corrects exactly for that.

Now all four on the valley, with the path each one takes:

```python type
import numpy as np
import matplotlib.pyplot as plt

def loss(p):
    return 0.5 * (p[0] ** 2 + 25 * p[1] ** 2)

def gradient(p):
    return np.array([p[0], 25 * p[1]])

def optimise(method, learning_rate, steps=300):
    p = np.array([-10.0, 2.0])
    velocity, mean, square = np.zeros(2), np.zeros(2), np.zeros(2)
    path, reached = [p.copy()], None
    for t in range(1, steps + 1):
        g = gradient(p)
        if method == "gradient descent":
            p = p - learning_rate * g
        elif method == "momentum":
            velocity = 0.9 * velocity + g
            p = p - learning_rate * velocity
        elif method == "RMSProp":
            square = 0.9 * square + 0.1 * g ** 2
            p = p - learning_rate * g / (np.sqrt(square) + 1e-8)
        elif method == "Adam":
            mean = 0.9 * mean + 0.1 * g
            square = 0.999 * square + 0.001 * g ** 2
            p = p - learning_rate * (mean / (1 - 0.9 ** t)) / (np.sqrt(square / (1 - 0.999 ** t)) + 1e-8)
        path.append(p.copy())
        if reached is None and loss(p) < 1e-3:
            reached = t
    return np.array(path), reached, loss(p)

x, y = np.meshgrid(np.linspace(-11, 2, 200), np.linspace(-2.5, 2.5, 200))
fig, axes = plt.subplots(2, 2, figsize=(10, 6), sharex=True, sharey=True)
for ax, (method, rate) in zip(axes.ravel(), [("gradient descent", 0.03), ("momentum", 0.03), ("RMSProp", 0.3), ("Adam", 0.3)]):
    path, reached, final = optimise(method, rate)
    ax.contour(x, y, 0.5 * (x ** 2 + 25 * y ** 2), levels=15, cmap="Greys", linewidths=0.5)
    ax.plot(path[:60, 0], path[:60, 1], ".-", markersize=3)
    ax.set_title(f"{method} (rate {rate}): loss < 0.001 at step {reached}, final loss {final:.1g}", fontsize=8)
plt.show()
```

The plots show the first 60 steps of each path over the contour lines of the valley:

- **Gradient descent** (best stable rate, 0.03) bounces across the valley at first, then creeps along it, reaching the target at step 178.
- **Momentum** at the same rate swings across a few times, but the swings cancel while speed builds along the valley: the target at step 83, about twice as fast.
- **RMSProp** heads almost straight for the minimum, since each direction's step has been rescaled to a similar size, and reaches the target first, at step 50. But then it cannot settle: with gradients divided by their own size, every step stays around η long, so it bounces around the bottom: after 300 steps its loss is 0.29, worse than when it first reached the target. This is why RMSProp and Adam are usually combined with a decreasing learning rate.
- **Adam** gets the benefits of both: a direct heading and smoothing momentum, reaching the target at step 87 and settling to essentially zero. The difference from RMSProp is in the squared-gradient average: RMSProp's ρ = 0.9 forgets within about ten steps, so near the bottom its tiny gradients are divided by their own tiny size and every step is rescaled back to about η. Adam's β₂ = 0.999 remembers the large early gradients for about a thousand steps, so √v̂ stays large while m shrinks, and the steps shrink with it.

## On a real network

Valleys in two dimensions are a cartoon. Here are the optimisers on the digits network from the last lesson for 10 epochs. To be fair to plain SGD, it gets its own best rate (0.5) as well as 0.1; remember that momentum at rate 0.1 takes steady steps of up to 0.1/(1 − 0.9) = 1.0. Before running, guess: will Adam's famous default learning rate of 0.001 do well here?

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.2, random_state=0)

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed, hidden=64):
    rng = np.random.default_rng(seed)
    return {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
            "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}

def forward(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    H = np.maximum(0, Z1)
    return Z1, H, softmax(H @ params["W2"] + params["b2"])

def validation_loss(params):
    P = forward(params, X_val)[2]
    return -np.mean(np.log(P[np.arange(len(y_val)), y_val] + 1e-12))

def gradients(params, X, y):
    Z1, H, P = forward(params, X)
    D2 = (P - np.eye(10)[y]) / len(X)
    D1 = (D2 @ params["W2"].T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}

def train(method, learning_rate, epochs=10, seed=0):
    params = init(seed)
    rng = np.random.default_rng(seed)
    first = {name: np.zeros_like(value) for name, value in params.items()}
    second = {name: np.zeros_like(value) for name, value in params.items()}
    t, losses = 0, []
    for epoch in range(epochs):
        order = rng.permutation(len(X_train))
        for start in range(0, len(X_train), 32):
            batch = order[start:start + 32]
            grads = gradients(params, X_train[batch], y_train[batch])
            t += 1
            for name in params:
                g = grads[name]
                if method == "SGD":
                    params[name] -= learning_rate * g
                elif method == "momentum":
                    first[name] = 0.9 * first[name] + g
                    params[name] -= learning_rate * first[name]
                elif method == "Adam":
                    first[name] = 0.9 * first[name] + 0.1 * g
                    second[name] = 0.999 * second[name] + 0.001 * g ** 2
                    m_hat = first[name] / (1 - 0.9 ** t)
                    v_hat = second[name] / (1 - 0.999 ** t)
                    params[name] -= learning_rate * m_hat / (np.sqrt(v_hat) + 1e-8)
        losses.append(validation_loss(params))
    return losses

for method, rate in [("SGD", 0.1), ("SGD", 0.5), ("momentum", 0.1), ("Adam", 0.001), ("Adam", 0.01)]:
    losses = train(method, rate)
    print(f"{method:<8} rate {rate:<5}: validation loss after epochs 1, 3, 10: {losses[0]:.3f}, {losses[2]:.3f}, {losses[-1]:.3f}")
```

```output
SGD      rate 0.1  : validation loss after epochs 1, 3, 10: 1.417, 0.569, 0.208
SGD      rate 0.5  : validation loss after epochs 1, 3, 10: 0.392, 0.336, 0.111
momentum rate 0.1  : validation loss after epochs 1, 3, 10: 0.305, 0.156, 0.077
Adam     rate 0.001: validation loss after epochs 1, 3, 10: 1.912, 1.090, 0.298
Adam     rate 0.01 : validation loss after epochs 1, 3, 10: 0.331, 0.156, 0.094
```

Each parameter needs its own running averages, so `first` and `second` are dictionaries of arrays shaped like the parameters, and `t` counts update steps (not epochs) for Adam's bias correction.

After 10 epochs, plain SGD at 0.1 reaches a validation loss of 0.21; at its better rate of 0.5, about 0.11. Momentum reaches 0.08 and Adam with rate 0.01 0.09. So the improved optimisers do win, but by less than the 0.1 comparison suggests: part of momentum's apparent advantage is simply its larger effective step. Adam with its default rate of 0.001 is the slowest of all here (0.30). That default suits large networks trained for a long time; on a small network with few steps, it is too timid. "Adam with default settings" is a good **starting point**, not a guarantee: the learning rate still needs checking.

## Learning rate schedules

A constant learning rate is a compromise: large steps make fast progress early, but near a minimum they bounce around it, as RMSProp did on the valley. A **schedule** changes the rate during training. Common choices:

- **Step decay**: divide the rate by 10 at a few fixed points, such as halfway and three-quarters through training.
- **Cosine decay**: lower the rate smoothly from its starting value to near zero along half a cosine curve, η_t = η·½(1 + cos(π t/T)) for step t of T.
- **Warm-up**: start with a tiny rate and increase it linearly over the first few hundred or thousand steps, before decaying. In the first steps, Adam's running averages are based on very few gradients and the weights are at their random starting values, so large steps can do damage; warm-up avoids it. Large transformer models are almost always trained with warm-up followed by cosine decay.

One last practical note: weight decay (the ridge penalty, which the next lesson adds to networks) interacts badly with Adam's per-parameter scaling if it is folded into the gradient. **AdamW**, the version used for most large models, applies weight decay as a separate step instead.

::: challenge One momentum step [easy]
Write `momentum_step(w, v, grad, lr, beta)` that returns the new weights and velocity as a tuple `(w, v)`, using v ← β·v + grad, then w ← w − lr·v. Do not change the arrays passed in.

Then run 100 steps of momentum with lr 0.03 and β 0.9 on the lesson's valley, starting from w = (−10, 2) and v = (0, 0) (the gradient of ½(x² + 25y²) is (x, 25y)), and store the final point in `final_w`.

```python starter
import numpy as np

def momentum_step(w, v, grad, lr, beta):
    return w, v

w, v = np.array([-10.0, 2.0]), np.zeros(2)
final_w = w
print(final_w)
```

```python solution
import numpy as np

def momentum_step(w, v, grad, lr, beta):
    v = beta * v + grad
    return w - lr * v, v

w, v = np.array([-10.0, 2.0]), np.zeros(2)
for _ in range(100):
    w, v = momentum_step(w, v, np.array([w[0], 25 * w[1]]), 0.03, 0.9)
final_w = w
print(final_w)
```

```python test
import numpy as _np
assert "momentum_step" in dir(), "Keep the function's name as momentum_step."
_w, _v = _np.array([1.0, 2.0]), _np.array([0.5, -0.5])
_nw, _nv = momentum_step(_w, _v, _np.array([0.2, 0.4]), 0.1, 0.9)
assert _np.allclose(_nv, [0.65, -0.05]), f"The new velocity should be 0.9 × [0.5, −0.5] + [0.2, 0.4] = [0.65, −0.05], but got {_nv}."
assert _np.allclose(_nw, [1.0 - 0.065, 2.0 + 0.005]), f"The new weights should be w − 0.1 × new velocity = [0.935, 2.005], but got {_nw}."
assert _np.array_equal(_w, [1.0, 2.0]) and _np.array_equal(_v, [0.5, -0.5]), "momentum_step changed the arrays passed in. Build new arrays instead of using -= or +=."
_W, _V = _np.array([-10.0, 2.0]), _np.zeros(2)
for _ in range(100):
    _V = 0.9 * _V + _np.array([_W[0], 25 * _W[1]])
    _W = _W - 0.03 * _V
assert _np.allclose(final_w, _W), f"After 100 momentum steps the point should be about {_W.round(4)}, but final_w is {final_w}."
"SUCCESS: After 100 steps momentum is essentially at the minimum; plain gradient descent at the same rate is still about 0.5 away along the valley."
```

Hint: Compute the new velocity first, then use it for the weights: `v = beta * v + grad` creates a new array (unlike `v *= beta`), so the caller's arrays stay unchanged.
:::

::: challenge Adam ignores the scale [medium]
Write `adam_step(w, m, v, grad, t, lr, beta1=0.9, beta2=0.999, eps=1e-8)` returning the new `(w, m, v)`, using the lesson's formulas (return `m` and `v` uncorrected; use the corrected m̂ and v̂ only for the step), with `t` the step number starting at 1.

Then demonstrate Adam's most useful property. For a single parameter starting at w = 0 with m = v = 0, apply 20 Adam steps with lr 0.1 and a **constant** gradient `g`, for each `g` in `[0.002, 2.0, 2000.0]`, and store in `adam_moved` a dictionary mapping each `g` to how far w has moved, |w|. Store in `sgd_moved` the same for 20 steps of plain gradient descent, w ← w − 0.1·g.

```python starter
import numpy as np

def adam_step(w, m, v, grad, t, lr, beta1=0.9, beta2=0.999, eps=1e-8):
    return w, m, v

adam_moved = {}
sgd_moved = {}
print(adam_moved, sgd_moved)
```

```python solution
import numpy as np

def adam_step(w, m, v, grad, t, lr, beta1=0.9, beta2=0.999, eps=1e-8):
    m = beta1 * m + (1 - beta1) * grad
    v = beta2 * v + (1 - beta2) * grad ** 2
    m_hat = m / (1 - beta1 ** t)
    v_hat = v / (1 - beta2 ** t)
    return w - lr * m_hat / (np.sqrt(v_hat) + eps), m, v

adam_moved, sgd_moved = {}, {}
for g in [0.002, 2.0, 2000.0]:
    w, m, v = 0.0, 0.0, 0.0
    for t in range(1, 21):
        w, m, v = adam_step(w, m, v, g, t, 0.1)
    adam_moved[g] = abs(w)
    sgd_moved[g] = abs(-20 * 0.1 * g)
print(adam_moved, sgd_moved)
```

```python test
import numpy as _np
assert "adam_step" in dir(), "Keep the function's name as adam_step."
def _ref(w, m, v, g, t, lr, b1=0.9, b2=0.999, eps=1e-8):
    m = b1 * m + (1 - b1) * g
    v = b2 * v + (1 - b2) * g ** 2
    return w - lr * (m / (1 - b1 ** t)) / (_np.sqrt(v / (1 - b2 ** t)) + eps), m, v
_r = _np.random.default_rng(0)
_w, _m, _v = _r.normal(size=3), _np.zeros(3), _np.zeros(3)
_W, _M, _V = _w.copy(), _m.copy(), _v.copy()
for _t in range(1, 6):
    _g = _r.normal(size=3)
    _w, _m, _v = adam_step(_w, _m, _v, _g, _t, 0.01)
    _W, _M, _V = _ref(_W, _M, _V, _g, _t, 0.01)
    assert _np.allclose(_w, _W) and _np.allclose(_m, _M) and _np.allclose(_v, _V), f"After step {_t}, your Adam differs from the lesson's formulas. Return m and v without bias correction, and step by lr × m̂ / (√v̂ + ε)."
assert sorted(adam_moved) == [0.002, 2.0, 2000.0] and sorted(sgd_moved) == [0.002, 2.0, 2000.0], "Both dictionaries should have the keys 0.002, 2.0 and 2000.0."
for _g in [0.002, 2.0, 2000.0]:
    _x, _mm, _vv = 0.0, 0.0, 0.0
    for _t in range(1, 21):
        _x, _mm, _vv = _ref(_x, _mm, _vv, _g, _t, 0.1)
    assert _np.isclose(adam_moved[_g], abs(_x)), f"adam_moved[{_g}] is wrong: run 20 Adam steps from w = m = v = 0 with that constant gradient."
    assert _np.isclose(sgd_moved[_g], 20 * 0.1 * _g), f"sgd_moved[{_g}] is wrong: plain gradient descent moves lr × g per step."
f"SUCCESS: Over a million-fold range of gradient sizes, Adam moved about {adam_moved[2.0]:.2f} every time; plain gradient descent moved from {sgd_moved[0.002]:.3f} to {sgd_moved[2000.0]:,.0f}. Adam's steps depend on the gradient's direction and consistency, not its scale, so one learning rate suits parameters whose gradients differ wildly in size."
```

Hint: Inside the loop over gradients, reset `w, m, v` to 0 and call `adam_step` 20 times with `t` from 1 to 20. With a constant gradient, plain descent moves exactly 20 × 0.1 × g.
:::

::: challenge Warm-up and cosine decay [medium]
Write `learning_rate(step, total_steps, base_rate, warmup_steps)`, a schedule for steps numbered from 0:

- during warm-up (step < warmup_steps), the rate rises linearly: base_rate × (step + 1) / warmup_steps;
- after it, cosine decay over the remaining steps: with progress = (step − warmup_steps) / (total_steps − warmup_steps), the rate is base_rate × ½(1 + cos(π × progress)).

Then store the rates for every step of a 1,000-step schedule with base rate 0.001 and 100 warm-up steps in a NumPy array `schedule`.

```python starter
import numpy as np

def learning_rate(step, total_steps, base_rate, warmup_steps):
    return base_rate

schedule = np.array([learning_rate(s, 1000, 0.001, 100) for s in range(1000)])
print(schedule[[0, 99, 100, 550, 999]])
```

```python solution
import numpy as np

def learning_rate(step, total_steps, base_rate, warmup_steps):
    if step < warmup_steps:
        return base_rate * (step + 1) / warmup_steps
    progress = (step - warmup_steps) / (total_steps - warmup_steps)
    return base_rate * 0.5 * (1 + np.cos(np.pi * progress))

schedule = np.array([learning_rate(s, 1000, 0.001, 100) for s in range(1000)])
print(schedule[[0, 99, 100, 550, 999]])
```

```python test
import numpy as _np
assert "learning_rate" in dir(), "Keep the function's name as learning_rate."
assert _np.isclose(learning_rate(0, 1000, 0.001, 100), 0.00001), "The first warm-up step should be base_rate × 1/100 = 1e-5."
assert _np.isclose(learning_rate(99, 1000, 0.001, 100), 0.001), "The last warm-up step should reach the full base rate."
assert _np.isclose(learning_rate(100, 1000, 0.001, 100), 0.001), "Cosine decay starts at the full base rate (progress 0)."
assert _np.isclose(learning_rate(550, 1000, 0.001, 100), 0.0005), "Halfway through the decay, the rate should be half the base rate."
assert learning_rate(999, 1000, 0.001, 100) < 1e-7, "By the last step the rate should be close to zero."
assert _np.isclose(learning_rate(100, 200, 0.1, 0), 0.05), "With no warm-up, the halfway step of 200 should have half the base rate."
assert len(schedule) == 1000 and _np.isclose(schedule.max(), 0.001), "schedule should hold all 1000 rates, peaking at 0.001."
assert (_np.diff(schedule[:100]) > 0).all() and (_np.diff(schedule[100:]) <= 0).all(), "The schedule should rise during warm-up and never rise after it."
"SUCCESS: The schedule used to train most large language models: a short linear warm-up, then a long cosine glide down to zero."
```

Hint: Handle the warm-up case first with an `if`, returning early. For the decay, `np.cos(np.pi * progress)` runs from 1 down to −1 as progress goes from 0 to 1, so ½(1 + cos) runs from 1 to 0.
:::

## What you learned

- Plain gradient descent uses one step size for every direction; in a narrow valley the steepest direction limits the rate (unstable above 2/curvature) and progress along the valley is slow (178 steps on the example).
- Momentum keeps a decaying sum of gradients, v ← βv + g: consistent directions build speed, oscillations cancel (83 steps).
- RMSProp divides each parameter's gradient by the root of its running mean square, giving every parameter a similar step size; with a fixed rate it hovers near the minimum.
- Adam combines both, with bias correction for the zero-started averages (m / (1 − β₁ᵗ), v / (1 − β₂ᵗ)); default β₁ = 0.9, β₂ = 0.999. Its steps do not depend on the gradient's scale.
- On the digits network momentum and Adam (rate 0.01) beat plain SGD; Adam's default rate 0.001 was too small for this short run. Always check the learning rate.
- Schedules change the rate during training: step decay, cosine decay, and warm-up at the start. AdamW applies weight decay separately from Adam's scaling.

The training curves of the last two lessons showed networks starting to memorise their training data. The next lesson collects the tools that keep large networks generalising: weight decay, dropout, early stopping and batch normalisation.
