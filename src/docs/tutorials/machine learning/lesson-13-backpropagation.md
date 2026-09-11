# Lesson 13 — Assigning Blame Across Layers: Backpropagation

## What you'll learn
- How to stack Lesson 12's single neuron into a network with a hidden layer — and, for the first time in this series, actually solve XOR.
- The chain rule, applied mechanically: how "the output was wrong by this much" turns into "each hidden neuron was responsible for this much of that."
- A trap specific to networks with hidden layers, that never showed up once in eleven single-layer lessons: initializing every weight to zero, which worked perfectly well before, now permanently freezes the network.

## What you'll build
A 2-layer neural network — one hidden layer of two neurons, trained via backpropagation from scratch — that solves the exact XOR problem Lesson 12 mathematically proved a single perceptron cannot.

---

## The question

Recall Lesson 12's trap precisely:

| x1 | x2 | XOR |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

A single neuron draws one straight line, and no straight line separates this data — proven, not just observed. If each individual neuron is still only capable of drawing one straight line, how could *combining several of them* possibly do better?

---

## 1. Predict

If one hidden neuron roughly computes "is at least one input on?" (OR) and a second hidden neuron roughly computes "are both inputs on?" (AND), and a third, final neuron combines their two answers — could that final neuron express "OR is true, but AND is false" using nothing but its own straight-line logic on the *two hidden neurons' outputs*? Check by hand whether that combination matches the XOR table above for all four input pairs.

---

## 2. Try it: a hand-built network that already solves XOR

Before training anything, look at what a *working* solution actually looks like — concrete numbers, chosen by hand:

```python
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)

W1 = np.array([[20, 20], [20, 20]], dtype=float)   # hidden unit 1: OR-ish; hidden unit 2: AND-ish
b1 = np.array([-10, -30], dtype=float)

W2 = np.array([[20], [-20]], dtype=float)           # output: (hidden1) AND NOT (hidden2)
b2 = -10.0

hidden = sigmoid(X @ W1 + b1)
output = sigmoid(hidden @ W2 + b2)
print(hidden)
print(output.flatten())
```

### What this code does

- **`W1 = np.array([[20, 20], [20, 20]])`, `b1 = np.array([-10, -30])`** — `W1` has shape `(2, 2)`: **rows are input features, columns are hidden units.** Column 0 (weights `[20, 20]`, bias `-10`) computes a large positive score whenever *either* input is `1`, and a large negative score only when both are `0` — after `sigmoid`, this behaves almost like OR. Column 1 (same weights, bias `-30`) needs *both* inputs to be `1` before the score turns positive — after `sigmoid`, this behaves almost like AND. These specific large weight magnitudes (`20`, `30`) are chosen deliberately to push `sigmoid`'s output close to a hard `0` or `1`, making the intended logic unambiguous in the printed results.

- **`hidden = sigmoid(X @ W1 + b1)`** — `X` is `(4, 2)`, `W1` is `(2, 2)`; `X @ W1` produces `(4, 2)` — for every one of the 4 input rows, both hidden units' raw scores at once. Adding `b1` (broadcasting across all 4 rows) and applying `sigmoid` elementwise gives `hidden`, a `(4, 2)` array: each row is one input pair's two hidden-unit activations.

- **`W2 = np.array([[20], [-20]])`, `b2 = -10.0`** — shape `(2, 1)`: one weight connecting each hidden unit to the single output. The positive weight on hidden unit 1 (OR-ish) and negative weight on hidden unit 2 (AND-ish) implement "OR is true AND AND is false" — exactly XOR's logical definition.

- **`output = sigmoid(hidden @ W2 + b2)`** — `hidden` is `(4, 2)`, `W2` is `(2, 1)`; `hidden @ W2` gives `(4, 1)`, the final raw score per input row, then `sigmoid` turns it into a probability.

### What happens

`hidden`'s printed rows will show each input pair's two hidden activations sitting near `0` or `1` (approximating OR and AND respectively), and `output`, printed after flattening, should closely match `[0, 1, 1, 0]` — real, working XOR — using nothing but two layers of the exact same `sigmoid(w·x + b)` unit from every earlier lesson. **Nobody trained this network — these weights were chosen by hand, specifically to demonstrate that a solution exists.** The rest of this lesson is about finding weights like these automatically.

---

## 3. Why: propagate the error backward, layer by layer

**The mechanism:** run a *forward pass* (input → hidden → output, exactly like Section 2), measure how wrong the final output was, then work **backward**: first figure out how much the output layer's weights contributed to that wrongness, then use *that* to figure out how much each hidden neuron contributed, one layer further back. This backward attribution of blame is what "backpropagation" literally means.

```python
np.random.seed(1)
y = np.array([0, 1, 1, 0], dtype=float)

W1 = np.random.uniform(-1, 1, size=(2, 2))
b1 = np.zeros(2)
W2 = np.random.uniform(-1, 1, size=(2, 1))
b2 = 0.0
learning_rate = 1.0

for epoch in range(10000):
    z1 = X @ W1 + b1
    a1 = sigmoid(z1)
    z2 = a1 @ W2 + b2
    a2 = sigmoid(z2).flatten()

    delta2 = ((a2 - y) / len(y)).reshape(-1, 1)
    grad_W2 = a1.T @ delta2
    grad_b2 = np.sum(delta2)

    delta1 = (delta2 @ W2.T) * (a1 * (1 - a1))
    grad_W1 = X.T @ delta1
    grad_b1 = np.sum(delta1, axis=0)

    W2 -= learning_rate * grad_W2
    b2 -= learning_rate * grad_b2
    W1 -= learning_rate * grad_W1
    b1 -= learning_rate * grad_b1

print(sigmoid(sigmoid(X @ W1 + b1) @ W2 + b2).flatten())
```

### Code mechanics

- **`W1 = np.random.uniform(-1, 1, size=(2, 2))`, `b1 = np.zeros(2)`** — `W1` starts as small **random** values, not zero — Section 6 demonstrates exactly why this choice matters here, in a way it never did in any single-layer lesson.

- **`z1 = X @ W1 + b1`, `a1 = sigmoid(z1)`** — the forward pass through the hidden layer, batched across all 4 rows at once, structurally identical to Section 2.

- **`delta2 = ((a2 - y) / len(y)).reshape(-1, 1)`** — `a2 - y` is **exactly Lesson 2's `error = p - exceeded`** — the same sigmoid-plus-log-loss simplification applies here too, at the output layer, regardless of how many layers come before it. Dividing by `len(y)` folds the "average over samples" step directly into `delta2`, so later matrix products don't need a separate `/ n_samples`. `.reshape(-1, 1)` turns a flat `(4,)` array into a `(4, 1)` column, needed to line up correctly for the matrix multiplication below.

- **`grad_W2 = a1.T @ delta2`** — `a1.T` is `(2, 4)`, `delta2` is `(4, 1)`; the result is `(2, 1)`, matching `W2`'s shape exactly. This computes, for each hidden unit, how strongly its activation (across all 4 samples) lines up with the output's error — a direct matrix generalization of Lesson 1 and 2's `sum(error * feature)`.

- **`delta1 = (delta2 @ W2.T) * (a1 * (1 - a1))`** — **this line is backpropagation's core idea, in one expression.** `delta2 @ W2.T` takes the single output error and *spreads it back* across both hidden units, weighted by `W2` — a hidden unit connected to the output by a *large* weight gets blamed for a *large* share of the error; one connected by a near-zero weight gets blamed for almost none of it. `(a1 * (1 - a1))` is `sigmoid`'s derivative, reusing the activation value directly (as first noted in Lesson 2's "under the hood") rather than recomputing it from `z1` — this scales each hidden unit's assigned blame by how *sensitive* that unit's own output currently is: a hidden unit whose activation is already near `0` or `1` (saturated, on the flat part of the sigmoid curve) gets almost no blame, regardless of how connected it is, because nudging its weights right now would barely change its output anyway.

- **`grad_W1 = X.T @ delta1`** — `X.T` is `(2, 4)`, `delta1` is `(4, 2)`; the result is `(2, 2)`, matching `W1`. Each entry answers: "for this specific input feature feeding into this specific hidden unit, how much would adjusting that one connection reduce the overall error."

### Execution trace (one training step)

```
FORWARD:
  X → (W1, b1) → z1 → sigmoid → a1 → (W2, b2) → z2 → sigmoid → a2

BACKWARD (in exactly the reverse order):
  compare a2 to y → delta2 (output layer's own error, Lesson 2's formula again)
  use delta2 and W2 to compute grad_W2, grad_b2 (how to adjust the OUTPUT layer)
  spread delta2 backward through W2, scale by hidden layer's own sensitivity → delta1
  use delta1 and X to compute grad_W1, grad_b1 (how to adjust the HIDDEN layer)

UPDATE:
  every weight and bias, in every layer, adjusted opposite its own gradient
```

### Mental model

```
forward: input flows through layer 1, then layer 2, producing a final answer
        ↓
compare final answer to the truth → that's the output layer's error
        ↓
send that error BACKWARD through the same connections it came forward
    through, weakening or strengthening it based on connection strength
    and how sensitive each earlier neuron currently is
        ↓
now EVERY layer has its own local error signal, and can update using
    the exact same "step opposite the gradient" rule from Lesson 1
```

---

## 4. Change one thing

Here's exactly what's new about backpropagation, isolated from what you already knew from Lesson 2:

```diff
- error = p - exceeded                          # Lesson 2: single layer, nothing to propagate further
- grad_w = (2 / count) * np.sum(error * n)

+ delta2 = (a2 - y) / len(y)                     # output layer error — SAME shape as Lesson 2's
+ grad_W2 = a1.T @ delta2                        # SAME idea as Lesson 2's grad_w

+ delta1 = (delta2 @ W2.T) * (a1 * (1 - a1))     # <-- genuinely new: propagate error BACKWARD through W2
+ grad_W1 = X.T @ delta1
```

**What changed:** an entirely new step — `delta2 @ W2.T` — that didn't exist in any single-layer lesson, because single-layer models have no earlier layer to send blame backward *to*.

**What did not change:** the output layer's own error formula is character-for-character the same discovery from Lesson 2 (sigmoid + log-loss's clean derivative), and both `grad_W2` and `grad_W1` are computed by the same "multiply the relevant activations by the relevant error signal" pattern established all the way back in Lesson 1.

**Why this is the entire idea of backpropagation:** every layer's gradient computation looks *locally* identical to a single-layer model's — the only genuinely new machinery is the one line that takes a later layer's error and turns it into an earlier layer's error, by running the forward connections in reverse. Stack ten layers instead of two, and you'd repeat that same backward-propagation line nine more times, once per layer boundary — the mechanism doesn't fundamentally change, only how many times it repeats.

---

## 5. Put it in the project

```python
predictions = sigmoid(sigmoid(X @ W1 + b1) @ W2 + b2).flatten()
for row, true_label, pred in zip(X, y, predictions):
    print(f"input={row}  true={int(true_label)}  predicted={pred:.3f}")

print("\nhidden layer activations (the network's own internal representation):")
print(sigmoid(X @ W1 + b1))
```

### Code walkthrough

Print the hidden activations for all four inputs and look closely: inputs `(0,0)` and `(1,1)` — both labeled `0` — should produce hidden activations that land *close together* in this new 2-number space, and `(0,1)`/`(1,0)` — both labeled `1` — should land close together in a *different* region, even though in the **original** input space, `(0,0)` and `(1,1)` are just as far apart from each other as `(0,1)` and `(1,0)` are. **The hidden layer has learned a new representation of the input, specifically one where XOR — impossible to separate with a line in the original space — becomes separable by the simple linear output neuron.** This is the core idea behind every deep network: each layer reshapes the data into a space where the *next* layer's simple linear tool becomes sufficient.

### Why this design: choosing hidden layer size

**Problem:** this network used exactly 2 hidden neurons. Why not 1, or 10?

**Available choices:** 1 hidden neuron, 2 (used here), or more.

**Selected choice:** 2 — and this is not an arbitrary round number. With only 1 hidden neuron, the network reduces to "one nonlinearity feeding one more nonlinearity," which is still fundamentally limited to expressing something close to a single decision boundary — insufficient to combine two genuinely different logical conditions (like OR and AND) the way Section 2's hand-built solution required. XOR specifically needs at least 2 hidden units to represent the two separate lines that, combined, produce its shape.

**Cost:** more hidden neurons than needed adds more parameters to train (slower, and on tiny datasets, more prone to simply memorizing rather than generalizing — the same overfitting concern from Lessons 3 and 5, now appearing in a new architecture).

**Revisit condition:** for a more complex pattern than XOR, needing more hidden units (or more layers) is often necessary — there's no universal "right" hidden layer size, only "enough to represent the pattern, and not much more than that."

---

## 6. The trap

**Normal rule, true throughout Lessons 1, 2, 5, 8, and 12:** starting every weight at exactly `0` worked perfectly well — it's simply the most neutral possible starting point.

**Apparently reasonable choice for this network too** — since zero initialization was always safe before:

```python
W1_zero = np.zeros((2, 2))
b1_zero = np.zeros(2)
W2_zero = np.zeros((2, 1))
b2_zero = 0.0

for epoch in range(10000):
    z1 = X @ W1_zero + b1_zero
    a1 = sigmoid(z1)
    z2 = a1 @ W2_zero + b2_zero
    a2 = sigmoid(z2).flatten()

    delta2 = ((a2 - y) / len(y)).reshape(-1, 1)
    grad_W2 = a1.T @ delta2
    grad_b2 = np.sum(delta2)
    delta1 = (delta2 @ W2_zero.T) * (a1 * (1 - a1))
    grad_W1 = X.T @ delta1
    grad_b1 = np.sum(delta1, axis=0)

    W2_zero -= learning_rate * grad_W2
    b2_zero -= learning_rate * grad_b2
    W1_zero -= learning_rate * grad_W1
    b1_zero -= learning_rate * grad_b1

    if epoch % 2000 == 0:
        loss = -np.mean(y * np.log(a2 + 1e-10) + (1 - y) * np.log(1 - a2 + 1e-10))
        print(f"epoch {epoch}: loss={loss:.6f}, W1={W1_zero.ravel()}")
```

**Surprising result:** `loss` never moves from its starting value — approximately `0.693` (which is exactly `ln(2)`, the loss of predicting `0.5` for everyone) — for all 10,000 epochs. `W1_zero` stays at `[0, 0, 0, 0]` on every single printed line. The network never learns anything at all, no matter how long it trains.

**Exact reason:** with every weight at `0`, both hidden units compute `sigmoid(0) = 0.5` for *every single input row*, regardless of what `X` actually is — the hidden layer is completely blind to the input from the very first forward pass. Now trace the backward pass: `delta2` for this exact dataset (`y = [0, 1, 1, 0]`, `a2 = 0.5` for all four rows) works out to values that, summed, mean `grad_b2` comes out to exactly `0` too. Worse, `delta1 = (delta2 @ W2_zero.T) * (...)`, and `W2_zero` is *also* `0` — so `delta1` is `0` for both hidden units, on every row, always. With `delta1` uniformly zero, `grad_W1` is `0` too. **Every gradient in the entire network is exactly zero, forever** — not "very small," genuinely `0.0`, an exact mathematical fixed point that gradient descent can never escape from on its own. This is called the **symmetry problem**: with identical starting weights, every hidden unit computes identical outputs and receives identical (in this case, zero) gradients, so they can never differentiate from one another — a single "effective" hidden unit is being computed twice, not two different ones.

**Project consequence:** this failure mode never appeared once in eleven single-layer lessons, because a single neuron has no siblings to be symmetric *with*. The moment a network has more than one unit in the same layer, initializing them identically — most simply, at zero — removes any mechanism for them to ever become different from each other. This is exactly why real neural network libraries default to small **random** initialization (as Section 3 used) rather than zero: it's not a minor style choice, it's the specific fix for a failure mode that only exists once you stack neurons side by side.

---

## 7. Under the hood

*(Optional — not required to build or train a small network correctly.)*

A result called the **universal approximation theorem** states that a network with just one hidden layer, given *enough* hidden neurons, can approximate any continuous function to arbitrary precision — suggesting, in principle, that you'd never need more than one hidden layer. In practice, deeper networks (more layers, each reasonably sized) tend to represent complex patterns far more efficiently than one enormously wide hidden layer, which is a large part of why "deep" learning uses many layers rather than one very wide one. This lesson used `sigmoid` at every layer to stay consistent with Lesson 2 — real networks very often use a different activation function in hidden layers than in the output layer, for reasons directly related to a specific weakness of sigmoid that becomes serious once you stack many layers together, which is exactly the subject of the next lesson.

---

## 8. Exercises

- **Predict:** in the trained (non-zero-initialized) network, would you expect the two hidden units' final weight vectors (the two columns of `W1`) to end up identical, similar, or clearly different from each other? Reason from Section 6's symmetry explanation before checking.
- **Modify:** change the hidden layer size from 2 to 4 neurons (adjust `W1`'s shape to `(2, 4)`, `b1`'s shape to `4`, and `W2`'s shape to `(4, 1)` accordingly) and retrain. Does it still solve XOR? Print all 4 hidden units' activations for each input and see whether any pair of them ended up computing nearly the same thing despite random initialization.
- **Break:** in the correctly-initialized network from Section 3, set `b1 = np.zeros(2)` but leave `W1` randomly initialized (a partial, not total, symmetric start). Does the network still get stuck the way the fully-zero version did, or does it still manage to learn? Explain using the same reasoning from Section 6 about what specifically needs to be identical for symmetry to persist.
- **Trace:** using the exact zero-initialized trap network, compute `a1`, `delta2`, and `delta1` by hand for just the first input row `(0, 0)` (true label `0`), confirming each value matches the "surprising result" described in Section 6.

---

## What to remember

- Backpropagation's only genuinely new idea, beyond everything in the classic-ML half of this series, is one line: take a later layer's error and multiply it backward through that layer's weights to compute an earlier layer's error — everything else reuses gradient patterns already established since Lesson 1.
- A trained hidden layer doesn't just pass data through — it reshapes it into a new representation where a pattern that was impossible for a single line (like XOR) becomes separable by a simple linear output neuron.
- Zero initialization, safe in every single-layer lesson in this series, becomes a permanent, exact dead end the moment a layer contains more than one neuron — random initialization exists specifically to break that symmetry.

## Next lesson

This lesson used `sigmoid` at every layer, purely because it was the function you already knew from Lesson 2. Sigmoid has a specific, serious weakness once you stack many layers — a problem called vanishing gradients — that this lesson's 2-layer network was too shallow to expose. The next lesson covers the activation functions real deep networks actually use, and exactly what problem each one is solving.
