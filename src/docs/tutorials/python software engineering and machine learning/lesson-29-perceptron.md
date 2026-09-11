# Lesson 29 — The Perceptron: A Real Neuron, Built From Scratch

## Why now
This is genuinely the starting point for everything Keras does — a `Dense` layer is a stack of these, with a smoother activation function. Understanding one perceptron mechanically, including its real, famous limitation, is what makes a neural network stop looking like a black box and start looking like a specific, buildable idea.

## What you'll learn
- What a perceptron actually computes — a weighted sum, a threshold, nothing more
- The perceptron learning rule, traced step by step with real numbers, weight by weight
- Real proof that it learns AND correctly, converging in a handful of epochs
- A real, famous failure — XOR — that never converges, and exactly why

## What you'll build
A `Perceptron` class from scratch (no libraries beyond `numpy` for the arithmetic), trained on two classic tiny datasets: logical AND, and logical XOR.

## The question
A perceptron is meant to loosely model a biological neuron: it receives several inputs, weighs their importance, and fires or doesn't. What does that actually look like as code — and can literally anything be learned this way, or are there real limits?

## 1. Predict
Logical AND (`0,0→0`, `0,1→0`, `1,0→0`, `1,1→1`) and logical XOR (`0,0→0`, `0,1→1`, `1,0→1`, `1,1→0`) both have exactly 4 input/output pairs. Do you expect a perceptron trained the same way, with the same number of epochs, to learn both equally well?

## 2. Try it — the perceptron itself
```python
import numpy as np

def step(x):
    return 1 if x >= 0 else 0

class Perceptron:
    def __init__(self, n_inputs, lr=0.1):
        self.weights = np.zeros(n_inputs)
        self.bias = 0.0
        self.lr = lr

    def predict(self, x):
        z = np.dot(self.weights, x) + self.bias
        return step(z)

    def train(self, X, y, epochs=10):
        for epoch in range(epochs):
            errors = 0
            for xi, target in zip(X, y):
                pred = self.predict(xi)
                error = target - pred
                if error != 0:
                    errors += 1
                self.weights += self.lr * error * xi
                self.bias += self.lr * error
            print(f"epoch {epoch+1}: weights={self.weights}, bias={self.bias:.2f}, errors={errors}")
            if errors == 0:
                break
```

### What this code does
- `self.weights = np.zeros(n_inputs)`, `self.bias = 0.0` — a perceptron's entire learned state is just these numbers: one weight per input, plus one bias. Nothing else is stored, nothing else is "the model."
- `np.dot(self.weights, x) + self.bias` — the actual computation a perceptron performs: multiply each input by its corresponding weight, sum them all, add the bias. This is precisely the same operation `LinearRegression` did back in Lesson 13 (`slope × budget + intercept`, generalized to multiple weighted inputs) — a perceptron's raw computation *is* linear regression's, up to this point.
- `step(x)` — where a perceptron actually diverges from linear regression: instead of returning that weighted sum directly as a continuous prediction, it passes it through a **threshold**: `1` if the sum is `≥ 0`, otherwise `0`. This is what makes it a classifier — a hard yes/no decision, not a number.
- `error = target - pred` — how wrong the current prediction was: `0` (correct), `1` (predicted 0, should've been 1), or `-1` (predicted 1, should've been 0).
- `self.weights += self.lr * error * xi` — the **perceptron learning rule**: when a prediction is wrong, nudge every weight in the direction that would have made this specific example more likely to be classified correctly, scaled by `lr` (how big a step to take) and by `xi` (each input's own value, so inputs that were actually "on" for this example get adjusted more than inputs that were "off"). When `error` is `0` (correct prediction), nothing changes at all — no correction needed.

## 3. Real training — AND
```python
X_and = np.array([[0,0],[0,1],[1,0],[1,1]])
y_and = np.array([0,0,0,1])

p = Perceptron(2)
p.train(X_and, y_and, epochs=10)
print("final predictions:", [p.predict(x) for x in X_and])
```
Real output:
```
epoch 1: weights=[0.1 0.1], bias=0.00, errors=2
epoch 2: weights=[0.2 0.1], bias=-0.10, errors=3
epoch 3: weights=[0.2 0.1], bias=-0.20, errors=3
epoch 4: weights=[0.2 0.1], bias=-0.20, errors=0
final predictions: [0, 0, 0, 1]
```
By epoch 4, `errors=0` — the perceptron has found weights that classify all 4 examples correctly, and `final predictions` exactly match `y_and`. Notice errors didn't decrease smoothly (2 → 3 → 3 → 0) — the perceptron learning rule doesn't guarantee steady improvement each epoch, only that it will *eventually* find a correct solution, if one exists using a straight decision boundary (more on that condition next).

### Why this specific problem is learnable
With weights `[0.2, 0.1]` and bias `-0.20`, the decision boundary is the line where `0.2·x₁ + 0.1·x₂ - 0.20 = 0`. Every AND-true point (just `[1,1]`) falls on the positive side; every AND-false point falls on the negative side. **A single straight line can separate these two groups** — this is the actual condition under which a single perceptron can learn anything at all: the classes have to be *linearly separable*.

## 4. Why? — the mechanism, traced
### Code mechanics
Each weight update is a small, local correction: "this example was misclassified, so adjust every weight slightly toward correctly classifying it, in proportion to how much that input mattered for this example." Repeated across all 4 examples, across multiple epochs, these small corrections either converge toward a set of weights that gets everything right (if such weights exist — i.e., if the classes are linearly separable) — or they don't.

### Mental model
```
predict: weighted_sum(inputs) → threshold → 0 or 1
train:   for each wrong prediction →
             nudge each weight toward "this example, correctly classified"
         repeat until zero errors in a full pass (or give up after max epochs)
```

## 5. The real failure — XOR
```python
X_xor = np.array([[0,0],[0,1],[1,0],[1,1]])
y_xor = np.array([0,1,1,0])

p2 = Perceptron(2)
p2.train(X_xor, y_xor, epochs=20)
print("final predictions:", [p2.predict(x) for x in X_xor])
print("actual targets:   ", list(y_xor))
```
Real output:
```
epoch 1: weights=[-0.1  0. ], bias=-0.10, errors=3
epoch 2: weights=[-0.1  0. ], bias=0.00, errors=3
epoch 3: weights=[-0.1  0. ], bias=0.00, errors=4
epoch 4: weights=[-0.1  0. ], bias=0.00, errors=4
...
epoch 20: weights=[-0.1  0. ], bias=0.00, errors=4
final predictions: [1, 1, 0, 0]
actual targets:    [0, 1, 1, 0]
```
It never reaches `errors=0` — not at epoch 20, and (this is provable, not just "didn't happen to converge here") **not ever**, no matter how many epochs you run. The weights and bias actually stabilize into an oscillation after a few epochs, stuck at 4 wrong out of 4 by the end, having briefly done slightly better earlier and then regressed. The final predictions (`[1,1,0,0]`) get the *opposite* pattern of the correct answer on half the points.

### The exact reason — not a bug, a real mathematical limit
XOR's true points are `(0,1)` and `(1,0)`; its false points are `(0,0)` and `(1,1)`. Plot these four points: the two true points and two false points are arranged so that **no single straight line can separate them** — any line you draw either has both true points on the same side as a false point, or splits the true points from each other. This isn't a matter of finding better weights with more training — it's that a single perceptron's decision boundary is fundamentally always a straight line (or a flat plane, in higher dimensions), and XOR's structure genuinely requires a *non-straight* boundary to separate correctly. No amount of training changes what shape of boundary a single perceptron is capable of drawing.

## 6. Trap
**Normal rule:** if a perceptron isn't converging, more epochs (or a different learning rate) will eventually fix it.
**Apparently equivalent code:** running XOR for 1000 epochs instead of 20, or trying several different learning rates, expecting one of them to eventually succeed.
**Surprising result:** none of it works — not more epochs, not a different learning rate, not different random initial weights. The perceptron will oscillate or plateau on XOR forever, regardless of these hyperparameters.
**Exact reason:** these are all *tuning* knobs for a model whose fundamental capacity — what shape of decision boundary it's even capable of representing — is fixed at "a straight line." No amount of tuning changes that fixed capacity. This is a different category of problem than Lesson 14's underfitting/overfitting tuning issues — it's not "wrong settings," it's "wrong tool for this specific problem's actual structure."
**Project consequence**: this exact limitation — discovered and proven mathematically in the 1960s — is historically *why* neural networks with multiple layers exist at all. Stacking several perceptron-like units together, with a nonlinear activation function between layers (not just the hard step function), lets the combined network represent genuinely non-straight decision boundaries — which is precisely what a `keras.Sequential` model with more than one `Dense` layer is: multiple of exactly this kind of unit, stacked, specifically to escape the single-straight-line limit just measured here directly.

## Exercise
- **Predict:** Logical OR (`0,0→0`, `0,1→1`, `1,0→1`, `1,1→1`) — is it linearly separable, the same way AND is? Sketch (or reason through) whether one straight line can separate its true and false points before training a perceptron on it to check.
- **Modify:** Train a perceptron on OR and confirm it converges, reporting how many epochs it took compared to AND.
- **Break:** Try training the XOR perceptron with a much larger learning rate (e.g. `lr=2.0`) for 50 epochs. Does it converge now, or does the fundamental limitation still hold regardless of learning rate?
- **Repair:** Based on the previous exercise, write one sentence distinguishing a *tuning* problem (fixable with more epochs/different learning rate) from a *capacity* problem (not fixable that way at all) — which category does XOR's failure belong to?
- **Trace:** Using AND's actual epoch-by-epoch output, manually verify the epoch 1 → epoch 2 weight update: starting from `weights=[0.1, 0.1], bias=0.00`, and knowing `lr=0.1`, work out which specific example(s) must have been misclassified during epoch 2 to produce the resulting `weights=[0.2, 0.1], bias=-0.10`.

## What to remember
- A perceptron computes a weighted sum plus bias, then applies a hard threshold — the same core computation as linear regression, followed by a yes/no decision.
- The perceptron learning rule nudges weights toward correctly classifying whatever example was just gotten wrong — simple, local, and only guaranteed to converge if the data is linearly separable.
- XOR is not linearly separable — this is a real, provable limit on what a single perceptron can represent, not a tuning failure fixable with more epochs or a different learning rate.
- This exact historical limitation motivated multi-layer networks — the actual reason `Dense` layers get stacked in Keras, not an arbitrary design choice.

## Next lesson
From here directly to Keras: building a real multi-layer network (solving XOR, the exact problem a single perceptron just failed at, as concrete proof multiple layers actually overcome this limit), then moving to real movie data — with the construct-level explanation this whole series has used applied to `Sequential`, `Dense`, activation functions, `compile()`, and `fit()`, plus a real captured training run.
