# Lesson 15 — Descending Smarter: Momentum and Adam

## What you'll learn
- Why plain gradient descent — used completely unchanged in every lesson since Lesson 1 — genuinely struggles on "ravine"-shaped loss surfaces: steep in one direction, shallow in another, forcing an uncomfortable compromise on the learning rate.
- Momentum: accumulating a running memory of past gradients to smooth out oscillation and accelerate movement that's been consistent in direction.
- Adam: momentum combined with a per-parameter adaptive step size, plus a specific correction term whose omission causes real, precisely-derivable instability in the first few steps of training.

## What you'll build
A side-by-side comparison of plain gradient descent, momentum, and Adam on a deliberately lopsided loss surface — then Adam applied to Lesson 13's XOR network, converging in a small fraction of the epochs plain gradient descent needed.

---

## The question

Consider a simple loss surface: `f(w1, w2) = w1² + 10·w2²`. It's shaped like a narrow ravine — steep walls in the `w2` direction, a shallow, gentle slope in the `w1` direction. Starting from `w = [5, 5]`, you need a single learning rate that works for *both* directions at once, using the exact same update rule from every earlier lesson: `w -= learning_rate * gradient`.

---

## 1. Predict

The `w2` direction is ten times steeper than `w1`. If you pick a learning rate small enough to avoid diverging in the steep `w2` direction, what does that same, necessarily-small learning rate do to how quickly `w1` — the shallow direction — actually makes progress toward zero?

---

## 2. Try it: watching the zig-zag

```python
import numpy as np

def grad(w):
    return np.array([2 * w[0], 20 * w[1]])

def plain_gd(start, learning_rate, steps):
    w = np.array(start, dtype=float)
    trajectory = [w.copy()]
    for _ in range(steps):
        w = w - learning_rate * grad(w)
        trajectory.append(w.copy())
    return np.array(trajectory)

path = plain_gd([5.0, 5.0], learning_rate=0.09, steps=8)
for i, w in enumerate(path):
    print(f"step {i}: w1={w[0]:.4f}  w2={w[1]:.4f}")
```

### What this code does

- **`grad(w)`** — `f(w1, w2) = w1² + 10·w2²` has partial derivatives `2·w1` (with respect to `w1`) and `20·w2` (with respect to `w2`, since the derivative of `10·w2²` is `20·w2`) — this function returns both at once as a 2-element array, exactly the same gradient-formula pattern from every earlier lesson, just for a synthetic surface instead of a real loss function.

- **`w = w - learning_rate * grad(w)`** — the exact same update rule used in Lessons 1, 2, 5, 8, 12, and 13, unchanged.

### What happens

Watch the `w2` column specifically: with `learning_rate=0.09`, each step's `w2` value **flips sign** relative to the previous one (`5.0 → -4.0 → 3.2 → -2.56 → ...`), shrinking in magnitude but oscillating back and forth across zero rather than moving smoothly toward it — this is the zig-zag. Meanwhile `w1` shrinks steadily but only slowly (`5.0 → 4.1 → 3.36 → ...`), because the same learning rate that's already close to the edge of instability for the steep `w2` direction is far too conservative for the shallow `w1` direction. **You cannot fix this by choosing a different single learning rate** — any value small enough to stop `w2` from diverging is, by the same token, too small to make `w1` move quickly.

---

## 3. Why: remember which way you were already moving

**Momentum's mechanism:** instead of stepping purely by the *current* gradient, maintain a running "velocity" — an exponentially-weighted average of recent gradients — and step by *that* instead.

```python
def momentum_gd(start, learning_rate, beta, steps):
    w = np.array(start, dtype=float)
    velocity = np.zeros_like(w)
    trajectory = [w.copy()]
    for _ in range(steps):
        g = grad(w)
        velocity = beta * velocity + g
        w = w - learning_rate * velocity
        trajectory.append(w.copy())
    return np.array(trajectory)

path_m = momentum_gd([5.0, 5.0], learning_rate=0.09, beta=0.8, steps=8)
for i, w in enumerate(path_m):
    print(f"step {i}: w1={w[0]:.4f}  w2={w[1]:.4f}")
```

### Code mechanics

- **`velocity = np.zeros_like(w)`** — starts at zero, same shape as `w`; this accumulates across steps rather than being recomputed from scratch each time.

- **`velocity = beta * velocity + g`** — the *new* velocity is a blend of the *old* velocity (scaled by `beta`, here `0.8`) and the *current* gradient `g`. Because `w2`'s gradient alternates sign step to step (as seen in Section 2), blending it with the previous, oppositely-signed velocity causes **partial cancellation** — the oscillation gets damped rather than fully repeated. Because `w1`'s gradient keeps the *same* sign every step (it's steadily shrinking toward zero, not oscillating), blending doesn't cancel anything there — instead, the contributions **accumulate**, effectively increasing `w1`'s step size over time.

- **`w = w - learning_rate * velocity`** — steps by the smoothed velocity instead of the raw gradient.

### What happens

Comparing `path_m` to `path`: `w2`'s zig-zag is visibly damped — smaller sign flips, or none at all after the first step — while `w1` shrinks toward zero noticeably faster than in the plain version, using the **exact same `learning_rate`** in both runs. The single hyperparameter `beta` is doing real, measurable work: damping the direction that was oscillating, accelerating the direction that was consistent.

**Adam** builds on this same idea, adding a *second* running average — this time of the *squared* gradient — used to scale each parameter's step individually:

```python
def adam(start, learning_rate, steps, beta1=0.9, beta2=0.999, eps=1e-8):
    w = np.array(start, dtype=float)
    m = np.zeros_like(w)
    v = np.zeros_like(w)
    trajectory = [w.copy()]
    for t in range(1, steps + 1):
        g = grad(w)
        m = beta1 * m + (1 - beta1) * g
        v = beta2 * v + (1 - beta2) * g ** 2
        m_hat = m / (1 - beta1 ** t)
        v_hat = v / (1 - beta2 ** t)
        w = w - learning_rate * m_hat / (np.sqrt(v_hat) + eps)
        trajectory.append(w.copy())
    return np.array(trajectory)

path_a = adam([5.0, 5.0], learning_rate=0.5, steps=8)
for i, w in enumerate(path_a):
    print(f"step {i}: w1={w[0]:.4f}  w2={w[1]:.4f}")
```

- **`m = beta1 * m + (1 - beta1) * g`** — momentum again (a running average of the gradient itself), just written with an explicit `(1 - beta1)` weighting on the new term instead of adding it unweighted as the earlier `momentum_gd` did — a common, equivalent formulation.

- **`v = beta2 * v + (1 - beta2) * g ** 2`** — a *second* running average, this time of the gradient **squared** — always positive, tracking roughly how *large* (regardless of sign) this parameter's gradient has typically been recently. `w2`'s gradient has consistently large magnitude (it's the steep direction); `w1`'s has consistently small magnitude.

- **`w = w - learning_rate * m_hat / (np.sqrt(v_hat) + eps)`** — dividing the step by `sqrt(v_hat)` means a parameter with a *large* typical gradient magnitude (like `w2`) gets its step size shrunk, while a parameter with a *small* typical gradient magnitude (like `w1`) gets its step size scaled *up* — **automatically, per-parameter**, without you needing to hand-tune separate learning rates for each direction the way plain gradient descent implicitly required. `eps` (a tiny constant) prevents division by exactly zero if `v_hat` ever rounds to `0`.

- **`m_hat = m / (1 - beta1 ** t)`, `v_hat = v / (1 - beta2 ** t)`** — the **bias correction** terms; exactly what these are correcting for, and why skipping them is a real mistake, is the subject of Section 6.

### Mental model

```
PLAIN GD:     step size determined ENTIRELY by the current gradient
              → same effective step size in every direction, every time

MOMENTUM:     step direction blended with recent history
              → oscillating directions get damped, consistent directions
                get accelerated

ADAM:         momentum (direction smoothing) PLUS per-parameter step-size
              scaling based on typical gradient magnitude
              → steep directions get smaller steps automatically,
                shallow directions get larger steps automatically
```

---

## 4. Change one thing

The entire difference between plain gradient descent and momentum is one accumulating variable and one extra line:

```diff
  def gd_step(w, learning_rate):
      g = grad(w)
-     w = w - learning_rate * g
+     velocity = beta * velocity + g
+     w = w - learning_rate * velocity
      return w
```

**What changed:** the step now uses `velocity` — a value that persists and accumulates *across* calls — instead of using only the gradient computed *this* call.

**What did not change:** `grad(w)` is computed identically either way; the fundamental "step opposite the gradient" idea is completely unchanged — momentum doesn't compute a different gradient, it just remembers and blends previous ones before stepping.

**Why this small change has a large effect:** every earlier lesson's training loop was **memoryless** — each step's update depended only on the current gradient, with no notion of "which direction have I generally been moving in." Momentum is the first optimizer in this series with state that persists across steps beyond the parameters themselves, and that persistent state is precisely what lets it distinguish "this direction keeps flipping sign, dampen it" from "this direction keeps agreeing with itself, trust it more."

---

## 5. Put it in the project

Apply Adam to Lesson 13's actual XOR network, replacing its plain gradient descent update:

```python
def sigmoid(z):
    return 1 / (1 + np.exp(-z))

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([0, 1, 1, 0], dtype=float)

rng = np.random.RandomState(1)
W1 = rng.uniform(-1, 1, size=(2, 2))
b1 = np.zeros(2)
W2 = rng.uniform(-1, 1, size=(2, 1))
b2 = 0.0

params = {"W1": W1, "b1": b1, "W2": W2, "b2": b2}
m = {k: np.zeros_like(v) for k, v in params.items()}
v = {k: np.zeros_like(v) for k, v in params.items()}
beta1, beta2, eps, learning_rate = 0.9, 0.999, 1e-8, 0.05

for t in range(1, 501):
    z1 = X @ params["W1"] + params["b1"]
    a1 = sigmoid(z1)
    z2 = a1 @ params["W2"] + params["b2"]
    a2 = sigmoid(z2).flatten()

    delta2 = ((a2 - y) / len(y)).reshape(-1, 1)
    grads = {
        "W2": a1.T @ delta2,
        "b2": np.sum(delta2),
    }
    delta1 = (delta2 @ params["W2"].T) * (a1 * (1 - a1))
    grads["W1"] = X.T @ delta1
    grads["b1"] = np.sum(delta1, axis=0)

    for key in params:
        m[key] = beta1 * m[key] + (1 - beta1) * grads[key]
        v[key] = beta2 * v[key] + (1 - beta2) * grads[key] ** 2
        m_hat = m[key] / (1 - beta1 ** t)
        v_hat = v[key] / (1 - beta2 ** t)
        params[key] -= learning_rate * m_hat / (np.sqrt(v_hat) + eps)

    if t % 100 == 0:
        loss = -np.mean(y * np.log(a2 + 1e-10) + (1 - y) * np.log(1 - a2 + 1e-10))
        print(f"step {t}: loss={loss:.6f}")
```

### Code walkthrough

- **`params = {"W1": W1, "b1": b1, "W2": W2, "b2": b2}`, matching `m` and `v` dictionaries** — bundling every trainable array into dictionaries, keyed by name, lets the Adam update loop (`for key in params:`) apply the exact same formula uniformly to every parameter — weight matrices and bias vectors alike — without writing four nearly-identical blocks of Adam bookkeeping by hand.

### What happens

This XOR network, which needed `10,000` plain-gradient-descent epochs in Lesson 13 to reliably converge, typically reaches a comparably low loss within a few hundred Adam steps — a substantial, directly observable speedup from switching only the optimizer, with the forward and backward pass code completely untouched.

### Why this design: choosing beta1, beta2, and eps

**Problem:** Adam introduces three new hyperparameters beyond `learning_rate`.

**Available choices:** hand-tune all three per problem, or use the values used throughout this lesson.

**Selected choice:** `beta1=0.9`, `beta2=0.999`, `eps=1e-8` — the defaults recommended in Adam's original paper.

**Reason:** these specific values were chosen empirically to work reasonably well across a very wide range of problems, and in practice are rarely changed — unlike `learning_rate`, which still typically needs problem-specific tuning even when using Adam.

**Cost:** treating these as "safe to ignore" defaults is usually fine, but Section 6 shows that at least one detail connected to them — bias correction — is not optional, even though it's easy to mistake for a minor implementation footnote.

**Revisit condition:** for training that seems unstable specifically in its very first several steps (as opposed to instability throughout), double-check that bias correction hasn't been accidentally dropped, before assuming `beta1`/`beta2`/`eps` themselves need adjusting.

---

## 6. The trap

**Normal rule:** with proper bias correction, Adam's early steps should be comparably sized to its later steps — no special instability specific to the start of training.

**Apparently harmless simplification** — since `m_hat` and `v_hat` are described as a "correction," it's tempting to treat them as a minor refinement, skippable for a first working version:

```python
def adam_no_correction(start, learning_rate, steps, beta1=0.9, beta2=0.999, eps=1e-8):
    w = np.array(start, dtype=float)
    m, v = np.zeros_like(w), np.zeros_like(w)
    trajectory = [w.copy()]
    for t in range(1, steps + 1):
        g = grad(w)
        m = beta1 * m + (1 - beta1) * g
        v = beta2 * v + (1 - beta2) * g ** 2
        w = w - learning_rate * m / (np.sqrt(v) + eps)   # NOTE: m, v used directly, no bias correction
        trajectory.append(w.copy())
    return np.array(trajectory)

path_uncorrected = adam_no_correction([5.0, 5.0], learning_rate=0.5, steps=5)
for i, w in enumerate(path_uncorrected):
    print(f"step {i}: w1={w[0]:.4f}  w2={w[1]:.4f}")
```

**Surprising result:** the first few steps move **dramatically** further than the corrected version does for the same `learning_rate` — often enough to visibly overshoot the minimum in just one or two steps, an instability that has nothing to do with `learning_rate` itself being poorly chosen.

**Exact reason, worked out precisely:** at `t=1`, both `m` and `v` start at `0`, so after one update: `m = (1 - beta1) · g₁` and `v = (1 - beta2) · g₁²`. The *uncorrected* step becomes approximately `m / sqrt(v) ≈ (1 - beta1) / sqrt(1 - beta2)`, **regardless of `g₁`'s actual magnitude** — with the standard defaults, that's `0.1 / sqrt(0.001) ≈ 3.16`. This means the very first uncorrected step effectively multiplies the intended learning rate by roughly `3`, purely because `m` and `v` both start at zero and haven't yet "warmed up" to reflect the true gradient statistics. The bias-correction terms exist specifically to counteract this: `m / (1 - beta1^t)` and `v / (1 - beta2^t)` both divide by a factor that's small at `t=1` (inflating the tiny early `m` and `v` back up to a realistic scale) and approaches `1` as `t` grows (leaving later steps essentially unaffected) — precisely undoing the zero-initialization bias where it matters most: right at the start.

**Project consequence:** this is exactly the kind of bug that "mostly works" — training often still converges eventually, because the bias only meaningfully affects the first handful of steps, and things settle down as `t` grows. But those first few oversized steps can push parameters into a much worse starting region, occasionally destabilizing training entirely (especially in a network more sensitive than this lesson's tiny toy problem). Never treat Adam's bias correction as optional polish — it's directly counteracting a specific, derivable mathematical artifact of starting both moving averages at exactly zero.

---

## 7. Under the hood

*(Optional — not required to use momentum or Adam correctly.)*

Exponentially-weighted running averages — the core mechanism behind both `m` (momentum) and `v` (Adam's second moment) — show up far beyond machine learning: TCP's round-trip-time estimation for setting retransmission timeouts, and smoothing noisy metrics in monitoring/alerting systems (the same "monitoring calls" domain this series has used throughout), both use essentially the identical `running_average = beta * running_average + (1 - beta) * new_value` formula, for exactly the same reason — reacting to recent data while damping out noise from any single measurement. Other real optimizers (RMSprop, Nesterov-accelerated momentum) are variations on the same underlying theme — some form of remembering recent gradient history, some form of adapting step size — rather than fundamentally different ideas from momentum and Adam.

---

## 8. Exercises

- **Predict:** for the ravine surface, if you increased momentum's `beta` from `0.8` toward `0.99`, would you expect the `w2` oscillation to be damped more aggressively, or would you expect the risk of overshooting the minimum entirely (accumulating too much velocity) to increase? Consider both effects before answering.
- **Modify:** run `adam` on the ravine surface (not just the XOR network) and compare its `w1`/`w2` trajectory directly against both `plain_gd`'s and `momentum_gd`'s from Sections 2–3, using a step count where all three are shown.
- **Break:** in the XOR-with-Adam training loop, set `beta2=0.5` (far below the standard `0.999`) and observe whether training becomes less stable. Connect what you observe back to what `v` (and therefore the per-parameter step scaling) represents.
- **Trace:** using the exact bias-correction math from Section 6, compute by hand what the correction factor `1 / (1 - beta2^t)` evaluates to at `t=1`, `t=10`, and `t=100` with `beta2=0.999`, and confirm numerically that the correction's effect becomes negligible as `t` grows — explaining precisely why this trap is specific to *early* training, not training in general.

---

## What to remember

- Plain gradient descent forces a single learning rate to serve every direction in the loss landscape at once — on a lopsided ("ravine") surface, that means an uncomfortable tradeoff between instability in the steep direction and crawling slowness in the shallow one.
- Momentum breaks that tradeoff by remembering recent gradients: oscillating directions partially cancel out over time, consistent directions accumulate and accelerate — using persistent state across steps for the first time in this series.
- Adam adds automatic per-parameter step-size scaling on top of momentum, but its bias-correction terms aren't optional cleanup — skipping them causes a precisely derivable, real overshoot in the first several training steps, because both moving averages start at zero and haven't yet reflected the true gradient statistics.

## Next lesson

Every network built so far treated its input as a flat list of independent numbers, with no notion of position or neighborhood. Images have a specific structure that a plain fully-connected network completely ignores — nearby pixels are related, and the same pattern (an edge, a curve) can appear anywhere in the image. Re-learning that pattern separately at every possible location wastes enormous numbers of parameters. That's exactly what convolutional layers are built to fix — the subject of the next lesson.
