# Lesson 12 — The Smallest Learning Machine: The Perceptron

## What you'll learn
- Every algorithm in the classic-ML half of this series was a specific, hand-designed shape — a line, a tree, a distance, a probability table. Deep learning instead starts from one tiny reusable unit and builds everything by combining copies of it. This lesson is that unit, in its original 1958 form.
- A training style genuinely different from every gradient-based lesson so far: update immediately after each single mistake, rather than computing one aggregate gradient across the whole dataset.
- A real, historically pivotal trap: a lone perceptron provably cannot learn XOR — the exact same pattern that broke greedy decision trees in Lesson 3 — and this specific limitation shaped decades of AI research funding and direction.

## What you'll build
A perceptron, trained with its original mistake-driven learning rule, that separates safe from risky calls — and then the exact same algorithm, applied to a pattern it is mathematically incapable of learning, so you can see the failure directly rather than take it on faith.

---

## The question

Reuse Lesson 8's cleanly separable data — six safe calls, six risky ones, separated by a wide gap in `n` and `threads`. SVM found the widest-margin line through gradient descent on hinge loss. Is there an even simpler rule — one that does nothing at all when it's already right, and only reacts when it's wrong?

---

## 1. Predict

If a learning rule only changes its weights when it makes a mistake, and does absolutely nothing when it's already correct, would you expect it to eventually stop changing entirely — assuming a perfect separating line exists somewhere? What would you expect to happen instead if no perfect separating line exists at all?

---

## 2. Try it: one mistake, one update

```python
import numpy as np

n = np.array([1000, 1200, 1500, 1800, 2000, 2500, 20000, 22000, 24000, 25000, 27000, 30000], dtype=float)
threads = np.array([1, 2, 1, 1, 2, 2, 8, 9, 10, 8, 9, 10], dtype=float)
risky = np.array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], dtype=float)

X = np.column_stack([n, threads])
means, stds = X.mean(axis=0), X.std(axis=0)
X = (X - means) / stds
y = 2 * risky - 1   # -1 / +1, same convention as Lesson 8's SVM

w = np.zeros(2)
b = 0.0
learning_rate = 0.1

point, label = X[6], y[6]   # the first "risky" point
score = point @ w + b
prediction = 1 if score >= 0 else -1
print(f"prediction={prediction}, true label={label}")

if prediction != label:
    w = w + learning_rate * label * point
    b = b + learning_rate * label
print(f"updated w={w}, b={b:.3f}")
```

### What this code does

- **`w = np.zeros(2)`**, **`b = 0.0`** — starting weights of exactly zero, same as every earlier gradient-based lesson's initialization.

- **`score = point @ w + b`**, **`prediction = 1 if score >= 0 else -1`** — the same linear score formula from every earlier lesson, but the output here is a **hard decision** — exactly `1` or `-1` — with no probability anywhere in sight. Compare this to Lesson 2's `sigmoid(score)`, which produced a smooth number between `0` and `1`: the perceptron never computes anything like a confidence level, only a side.

- **`if prediction != label:`** — the entire learning signal is this one comparison. If the prediction already matches the true label, **nothing below this line executes at all** — no update, no adjustment, not even a small one.

- **`w = w + learning_rate * label * point`** — the **perceptron learning rule**: when wrong, nudge `w` in the direction of `label * point`. If the true label is `+1` and this point was wrongly classified as `-1`, adding a positive multiple of `point` to `w` pushes the score for *this exact point* upward on the next attempt — directly, mechanically correcting the specific mistake just made.

- **`b = b + learning_rate * label`** — the same idea applied to the bias term.

### What happens

With `w` starting at zero, the very first point checked is very likely to be misclassified (a score of exactly `0`, using the `>= 0` convention, predicts `+1`, matching by coincidence — but generally an untrained model with zero weights on any non-trivial dataset will often get a first prediction wrong). The `if` branch fires, and `w`, `b` move by one specific, concrete step, directly caused by this one point's specific values.

---

## 3. Why: learn only from your mistakes, one at a time

**The mechanism:** repeatedly loop over the training data. For each individual point, predict, and immediately correct if wrong — updating `w`, `b` right then, before even looking at the next point. Keep looping over the full dataset (each full pass is called an **epoch**) until an entire pass produces zero mistakes.

```python
def perceptron_train(X, y, learning_rate=0.1, max_epochs=50):
    w = np.zeros(X.shape[1])
    b = 0.0
    for epoch in range(max_epochs):
        mistakes = 0
        for i in range(len(y)):
            score = X[i] @ w + b
            prediction = 1 if score >= 0 else -1
            if prediction != y[i]:
                w = w + learning_rate * y[i] * X[i]
                b = b + learning_rate * y[i]
                mistakes += 1
        if mistakes == 0:
            print(f"converged after {epoch} epochs")
            return w, b
    print(f"did not converge within {max_epochs} epochs — {mistakes} mistakes on the last pass")
    return w, b

w, b = perceptron_train(X, y)
```

### Code mechanics

- **`X.shape[1]`** — the number of columns in `X` (here, `2`: `n` and `threads`), used so `w` starts with exactly one weight per feature, regardless of how many features the data actually has.

- **`for epoch in range(max_epochs):`** outer loop, **`for i in range(len(y)):`** inner loop — this is a genuinely different training structure than every earlier gradient-based lesson. Lessons 1, 2, 5, and 8 each computed **one aggregate gradient across the entire dataset**, then took a single step. Here, `w` and `b` can change **multiple times within a single epoch** — once per mistake, immediately, using only that one point's information. This point-by-point update style is called **online learning** (updating from one example at a time), in contrast to the **batch learning** used throughout the rest of this series (computing a gradient from the whole dataset before updating).

- **`mistakes = 0` ... `mistakes += 1` ... `if mistakes == 0:`** — the convergence check: if an entire pass through all 12 points produces zero corrections, the model has stopped changing and training stops early, returning the current `w`, `b` immediately rather than running all `max_epochs` regardless.

### Execution trace (early training, conceptual)

```
epoch 0:
  point 0 (safe):  correctly predicted already (weights are catching on)  → no update
  point 1 (safe):  correctly predicted                                    → no update
  ...
  point 6 (risky): WRONG — w, b updated using point 6's values directly
  point 7 (risky): now correctly predicted, thanks to the update from point 6 → no update
  ...
  mistakes this epoch: some nonzero number

epoch 1:
  fewer mistakes than epoch 0, since w, b already reflect some of what was learned
  ...

eventually: an entire epoch passes with mistakes == 0 → training stops
```

### Mental model

```
see one point
        ↓
predict its side using the CURRENT w, b
        ↓
wrong?  → nudge w, b directly toward fixing THIS point, right now
right?  → do absolutely nothing, move to the next point
        ↓
repeat over the whole dataset, epoch after epoch
        ↓
stop the moment an entire epoch produces zero mistakes
```

---

## 4. Change one thing

Put the perceptron's update rule directly next to Lesson 8's SVM subgradient update — the perceptron turns out to be almost exactly SVM with two specific pieces removed:

```diff
- violating = margins < 1                                          # SVM (Lesson 8)
- grad_w = lam * w - (X[violating].T @ y[violating]) / n_samples
- w -= learning_rate * grad_w

+ if prediction != y[i]:                                            # Perceptron (this lesson)
+     w = w + learning_rate * y[i] * X[i]
```

**What changed:** SVM checks `margin < 1` — wrong, *or* right but without enough safety buffer. The perceptron checks only `prediction != y[i]` — plainly wrong, full stop, no margin requirement at all. SVM's update also includes `lam * w`, a term that actively shrinks `w` to prefer a *wide* margin; the perceptron's update has no such term — nothing here ever discourages `w` from growing, and nothing here prefers one valid separating line over another.

**What did not change:** both rules only touch `w`, `b` in response to specific points, both leave already-comfortably-correct points completely alone, and both are, structurally, "step opposite the direction that would fix a specific kind of wrongness."

**Why this matters:** the perceptron will happily stop the moment it finds **any** line that gets every point on the correct side — even one that passes uncomfortably close to one of the classes, with zero safety margin. SVM's extra machinery (the margin requirement, the `lam * w` regularization) is specifically what makes it keep adjusting *past* "merely correct" toward "correct with the widest possible buffer." The perceptron is, in a very real sense, an earlier, simpler ancestor of the same idea — correct classification without any notion of "correct with room to spare."

---

## 5. Put it in the project

```python
def predict(w, b, query, means, stds):
    scaled = (query - means) / stds
    score = scaled @ w + b
    return 1 if score >= 0 else 0

test_cases = np.array([[3000, 2], [18000, 7], [2200, 1]])
for case in test_cases:
    result = predict(w, b, case, means, stds)
    print(f"n={case[0]:>6} threads={case[1]:>2}  → {'RISKY' if result else 'safe'}")
```

### Why this design: learning rate barely matters here — a genuinely different story than every earlier lesson

**Problem:** `learning_rate=0.1` was chosen above. In Lessons 1, 2, 5, and 8, picking a learning rate too large caused outright divergence — a real risk you had to actively manage.

**A precise, checkable fact about the perceptron:** starting from `w = 0`, `b = 0`, the *sequence of which points get misclassified at each step* does not depend on the specific positive value of `learning_rate` at all — only on the data itself. This is because every update multiplies the *entire* accumulated `w`, `b` trajectory by the same constant factor throughout training; since the prediction rule only checks the **sign** of `score = X[i] @ w + b`, and multiplying both `w` and `b` by any positive number never flips a sign, the exact same points are right or wrong at the exact same steps regardless of whether `learning_rate` is `0.1` or `10.0`. Only the final *magnitude* of `w`, `b` scales with the learning rate — not whether, or how quickly (in epochs), training converges.

**Available choices:** any positive `learning_rate` — genuinely, for this specific algorithm, with this specific zero initialization.

**Selected choice:** `0.1`, chosen essentially arbitrarily, which is defensible precisely because it provably doesn't change the training dynamics.

**Cost / revisit condition:** this convenient fact depends on starting from `w = 0`; with a different (e.g., random) initialization, learning rate would matter again the way it does in every other gradient-based lesson in this series. It's also specific to the plain perceptron update — the moment you add anything like SVM's margin or regularization term back in, this scale-invariance breaks, because those terms interact with the *absolute* size of `w`, not just its sign.

---

## 6. The trap

**Normal rule:** given enough epochs, `perceptron_train` should converge — reach zero mistakes — whenever a straight line can separate the two classes.

**Apparently ordinary dataset — the exact XOR pattern from Lesson 3:**

```python
xor_X = np.array([[-1, -1], [-1, 1], [1, -1], [1, 1]], dtype=float)
xor_y = np.array([-1, 1, 1, -1], dtype=float)   # label = XOR of the two inputs' signs

w_xor, b_xor = perceptron_train(xor_X, xor_y, learning_rate=0.1, max_epochs=20)
```

**Surprising result:** the printed message reports **"did not converge"** even after all 20 epochs, and — if you print `mistakes` each epoch — the count never settles at `0`; it oscillates, sometimes going up, sometimes down, indefinitely. This isn't a matter of needing more epochs — running `max_epochs=10000` produces the exact same non-convergence.

**Exact reason:** XOR's four points are **not linearly separable** — this is the identical fact from Lesson 3's decision tree trap (splitting on either feature alone yields zero information gain) and the identical fact from Lesson 8's SVM trap (no `w`, `b` can achieve margin `≥ 1` for every point). A perceptron's entire mechanism assumes *some* `w`, `b` exists that gets every point on the correct side of a straight line — when that assumption is false, there is no stopping point for the mistake-driven update rule to settle into; fixing one point's error necessarily breaks another point that was previously correct, forever, in a cycle.

**Project consequence, and why this trap mattered historically:** this exact limitation — proven rigorously by Marvin Minsky and Seymour Papert in their 1969 book *Perceptrons* — showed that a single perceptron cannot represent XOR, a genuinely simple-looking function. This result is widely credited with significantly cooling research funding and interest in neural networks for over a decade (part of what's now called the "AI winter"), because it was mistakenly read by many at the time as a fundamental limitation of neural approaches in general — rather than, as it actually was, a limitation specific to a *single* neuron with no hidden layers.

---

## 7. Under the hood

*(Optional — not required to use a perceptron correctly.)*

The formal **Perceptron Convergence Theorem** (Novikoff, 1962) guarantees that if the data genuinely is linearly separable, the perceptron will make at most a *finite*, boundable number of mistakes before converging — the bound depends on the margin the best possible separator would have and the scale of the input points, but critically not on the learning rate, consistent with Section 5's observation. The eventual fix for the XOR limitation wasn't a smarter single neuron — it was **connecting several neurons together in layers**, feeding one neuron's output into the next layer's input, which turns out to be able to represent XOR and far more complex patterns. That idea is the entire subject of the next lesson.

---

## 8. Exercises

- **Predict:** on the main (separable) safe/risky dataset, would you expect `perceptron_train` to converge in *more*, *fewer*, or about the *same* number of epochs as SVM's gradient descent took to stabilize in Lesson 8? Consider that the perceptron stops at the first valid separator it finds, while SVM keeps refining toward the widest margin.
- **Modify:** print the final `w`, `b` learned by the perceptron on the main dataset, and compare the resulting separating line's position to Lesson 8's SVM boundary. Does the perceptron's line sit closer to one class than SVM's did?
- **Break:** on the XOR dataset, print the actual sequence of `mistakes` per epoch for the first 10 epochs. Confirm it doesn't monotonically decrease the way a converging model's would — look specifically for it to go back up after going down.
- **Repair:** this isn't fixable by tuning `perceptron_train` itself (as the trap explains, no `w`, `b` can solve XOR with a single linear unit) — instead, add a third feature to `xor_X` computed as the product of the first two features (`x1 * x2`), and confirm that a perceptron trained on this three-feature version *does* converge. Explain, in one sentence, why multiplying the two original features together made a previously impossible pattern linearly separable.

---

## What to remember

- The perceptron learns entirely from mistakes: correct predictions produce zero update, wrong predictions produce a direct, specific correction — a genuinely different training rhythm (online, one point at a time) than every gradient-based lesson before it.
- For this specific algorithm, starting from zero weights, the learning rate changes only the scale of the learned weights, not whether or how the training dynamics unfold — a rare and specific exception to the learning-rate cautionary tales of every earlier lesson.
- A single perceptron cannot learn XOR, or anything else that isn't linearly separable — not a bug to patch, but a hard mathematical ceiling on what one neuron alone can represent, and the exact historical motivation for stacking neurons into layers.

## Next lesson

A single neuron can only ever draw one straight line. What if you wired several neurons together — one layer's output feeding directly into the next layer's input? Individually, each neuron is exactly as limited as this lesson's — but combined, a network of them can represent XOR, and shapes far more complex than any single line. The catch: training a whole network means figuring out how to assign blame for a mistake across every neuron, in every layer, at once. That's backpropagation.
