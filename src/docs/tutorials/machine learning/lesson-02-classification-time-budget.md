# Lesson 2 — Predicting Yes/No: Will This Call Blow the Time Budget?

## What you'll learn
- Why fitting a straight line to a yes/no label breaks down, mechanically — not just "it's wrong," but exactly what goes wrong in the numbers.
- What the sigmoid function is, construct by construct, and why it's the specific fix for that breakage.
- Why classification needs a different loss function (log-loss / cross-entropy) than regression's mean squared error, and how its gradient turns out to have a strangely familiar shape.

## What you'll build
A NumPy classifier that looks at an input size `n` and predicts the *probability* that a function call will exceed a 250-microsecond time budget — trained from real yes/no outcomes, no threshold hardcoded by you.

---

## The question

You're monitoring a service. Each call processes `n` items, and you've logged whether each call blew past your 250µs budget:

| n (input size) | exceeded budget? |
|---|---|
| 1,000  | no  |
| 5,000  | no  |
| 10,000 | no  |
| 15,000 | no  |
| 20,000 | no  |
| 20,000 | **yes** |
| 25,000 | yes |
| 30,000 | yes |
| 35,000 | yes |
| 40,000 | yes |

Notice `n=20,000` appears twice with different outcomes — system load jitter means there's no hard cutoff, just a *zone* where it becomes increasingly likely. You want a model that outputs "73% likely to exceed budget," not just a hard yes/no. That's a probability, and probabilities live strictly between 0 and 1 — which turns out to be the whole problem.

---

## 1. Predict

Before writing anything: if you used *last lesson's* exact tool — fit a straight line, `w * n + b`, directly to the 0/1 labels — what would the line predict for `n = 60,000`, far beyond your data? Would that number still make sense as "probability of exceeding budget"?

Second question: a straight line that fits `0`s and `1`s reasonably well in the middle of your data — does it necessarily still make sense at the *extremes* of `n`?

---

## 2. Try it (and watch it break)

```python
import numpy as np

n = np.array([1000, 5000, 10000, 15000, 20000, 20000, 25000, 30000, 35000, 40000], dtype=float)
exceeded = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1], dtype=float)

def linear_predict(w, b, x):
    return w * x + b

w, b = 0.00003, 0.1
for x in [1000, 20000, 40000, 90000]:
    print(f"n={x:>6}  linear output={linear_predict(w, b, x):.3f}")
```

### What this code does

- **`n = np.array([...], dtype=float)`** and **`exceeded = np.array([...], dtype=float)`** — same construct as Lesson 1: two fixed-size NumPy arrays. `exceeded` stores `0.0`/`1.0`, not Python `bool` — this matters because the arithmetic below (multiplication, subtraction) needs numeric types, and NumPy floats support that directly.

- **`def linear_predict(w, b, x):`** — a function definition with three parameters, none typed or defaulted. `w`, `b`, and `x` are just names until the function is called; Python doesn't check at definition time whether `x` will be a scalar or an array.

- **`return w * x + b`** — the exact same formula shape as Lesson 1's `predicted = c * n + overhead`, just renamed. If `x` is a plain Python number (as it is in the loop below), this is ordinary scalar arithmetic; if `x` were a NumPy array, the same line would broadcast, no code change required — that flexibility is why NumPy formulas are written this generically.

- **`w, b = 0.00003, 0.1`** — tuple-unpacking assignment, hand-picked here (not yet learned) just to demonstrate the *shape* of the problem before training anything.

- **`for x in [1000, 20000, 40000, 90000]:`** — a plain Python loop over a list of four hand-picked integers, including `90000` — deliberately outside the training data's range, to expose what happens when a linear model extrapolates.

### What happens

Run it, and you'll see numbers like `0.130`, `0.700`, `1.300`, `2.800` (exact values depend on `w`/`b`, but the shape is what matters). `2.800` is not a valid probability — probabilities cannot exceed `1`. Worse, nothing in the code *stops* this from happening; `w * x + b` has no ceiling and no floor. A straight line is mathematically incapable of staying inside `[0, 1]` for all inputs. This isn't a tuning problem you can fix by picking better `w` and `b` — it's a structural mismatch between the tool (an unbounded line) and the target (a bounded probability).

---

## 3. Why: squashing the line with sigmoid

**The mechanism:** instead of using `w*x + b` directly as the answer, treat it as a raw, unbounded "score," then pass that score through a function that squashes *any* real number into the open interval `(0, 1)`. That function is the **sigmoid**:

```python
def sigmoid(z):
    return 1 / (1 + np.exp(-z))
```

### Code mechanics

- **`def sigmoid(z):`** — one parameter, `z`, standing for "raw score" (the output of `w*x + b`) — deliberately renamed from `x` to signal it's not the original input anymore, it's the linear model's output.
- **`np.exp(-z)`** — `np.exp` computes `e` (≈2.71828) raised to the power of its argument, elementwise if `z` is an array. `-z` negates the score first. This is a function *call* wrapping a unary negation.
- **`1 + np.exp(-z)`** — scalar-plus-array (or scalar-plus-scalar) addition; when `z` is very large and positive, `np.exp(-z)` approaches `0`, so this approaches `1`. When `z` is very negative, `np.exp(-z)` explodes toward infinity, so this approaches infinity.
- **`1 / (...)`** — division. Combined with the two extremes above: as `z → +∞`, the whole expression → `1/1 = 1`. As `z → -∞`, it → `1/∞ = 0`. For `z = 0` exactly, it's `1/(1+1) = 0.5`. **That's the entire point of the formula** — it takes an unbounded input and guarantees an output strictly between 0 and 1, approaching but never reaching the endpoints.

**Why this specific form**, and not some other squashing function: sigmoid has a derivative that simplifies extremely cleanly (`sigmoid(z) * (1 - sigmoid(z))`), which is what makes the gradient formula below turn out so simple. That's not a coincidence — it's *why* sigmoid became the standard choice long before deep learning existed.

Now the loss function needs to change too. Mean squared error technically still computes a number for 0/1 labels, but it's the wrong number to descend — it treats "predicted 0.9, true 1" and "predicted 0.5, true 1" as differing by a small, similar-sized amount, when in classification terms the second is a genuinely uncertain, worse prediction. **Log-loss (cross-entropy)** penalizes confident-wrong predictions far more harshly:

```python
def log_loss(w, b):
    p = sigmoid(w * n + b)
    p = np.clip(p, 1e-10, 1 - 1e-10)
    return -np.mean(exceeded * np.log(p) + (1 - exceeded) * np.log(1 - p))
```

- **`p = sigmoid(w * n + b)`** — `w * n + b` broadcasts across the whole `n` array (as in Lesson 1); the result feeds into `sigmoid`, which also broadcasts elementwise — so `p` ends up as an array of ten probabilities, one per training example.
- **`p = np.clip(p, 1e-10, 1 - 1e-10)`** — `np.clip(array, low, high)` forces every element of `p` to stay within `[1e-10, 1 - 1e-10]`, elementwise, replacing any value outside that range with the nearest boundary. `1e-10` is scientific notation for `0.0000000001`. **Why this line exists at all** is explained fully in Section 6 — for now, treat it as a guard rail.
- **`exceeded * np.log(p)`** — elementwise multiplication of the true labels (`0`s and `1`s) by the natural log of the predicted probability. Where `exceeded` is `0`, this term is `0` regardless of `p` (zeroed out); where `exceeded` is `1`, this term equals `np.log(p)` exactly.
- **`(1 - exceeded) * np.log(1 - p)`** — the mirror image: active exactly where the true label is `0`.
- **Adding the two terms together** means, per example, *exactly one* of the two terms is nonzero — the formula automatically picks "reward being close to 1 when the label is 1" or "reward being close to 0 when the label is 0," per row, without an `if` statement.
- **`-np.mean(...)`** — average across all ten examples, then negate. Negation is needed because `np.log` of a number less than 1 is negative, and you want the *loss* (something to minimize) to be a positive number that shrinks as predictions improve.

Now the training loop — structurally identical to Lesson 1's, with one meaningful substitution:

```python
w, b = 0.0, 0.0
learning_rate = 0.0000005
count = len(n)

for step in range(5000):
    p = sigmoid(w * n + b)
    error = p - exceeded

    grad_w = (2 / count) * np.sum(error * n)
    grad_b = (2 / count) * np.sum(error)

    w -= learning_rate * grad_w
    b -= learning_rate * grad_b

    if step % 1000 == 0:
        print(f"step {step:>4}  w={w:.6f}  b={b:.4f}  loss={log_loss(w, b):.4f}")
```

### Execution trace (one iteration)

```
1. w * n + b               → raw linear score, one per training example (broadcast)
2. sigmoid(...)             → squashed into a probability p, still one per example
3. error = p - exceeded     → how far each predicted probability is from the true 0/1 label
4. grad_w, grad_b            → same summation shape as Lesson 1's gradients, but using p instead of a raw linear prediction
5. w, b updated              → nudged opposite the gradient
6. repeat
```

### Mental model

```
raw score = w*n + b            (unbounded, can be any real number)
        ↓ sigmoid
probability                    (bounded to (0, 1), interpretable as "% likely")
        ↓ compare to true label with log-loss
error signal                   (harshly penalizes confident wrong answers)
        ↓ gradient descent
w, b adjusted
```

---

## 4. Change one thing

Here's the actual, surprising discovery in this lesson — the diff between Lesson 1's gradient and this lesson's gradient:

```diff
- error = predicted - t              # predicted = c * n + overhead  (raw line)
+ error = p - exceeded               # p = sigmoid(w * n + b)        (squashed probability)

  grad_w = (2 / count) * np.sum(error * n)     # <- identical formula, both lessons
  grad_b = (2 / count) * np.sum(error)         # <- identical formula, both lessons
```

**What changed:** how `error` is computed — one uses a raw linear prediction, the other a sigmoid-squashed probability.

**What did not change:** the gradient formulas themselves, `(2/count) * sum(error * n)` and `(2/count) * sum(error)`, are *character-for-character identical* to Lesson 1's linear regression gradients.

**Why this is genuinely surprising:** log-loss and mean-squared-error are different formulas, sigmoid and a raw line are different functions — you'd expect their gradients to look nothing alike. They coincide because of that "cleanly simplifying derivative" mentioned in Section 3: when you work out the calculus for sigmoid combined with log-loss, most of the sigmoid's own derivative terms cancel out algebraically, leaving a gradient with the exact same shape as plain linear regression's. This is why logistic regression is often taught as "linear regression's predictions get renamed to probabilities" — the training mechanics really are that similar under the hood.

---

## 5. Put it in the project

```python
threshold = 0.5
for test_n in [12000, 20000, 27000, 60000]:
    probability = sigmoid(w * test_n + b)
    prediction = "EXCEEDS BUDGET" if probability >= threshold else "within budget"
    print(f"n={test_n:>6}  P(exceeds)={probability:.3f}  → {prediction}")
```

### Code walkthrough

- **`threshold = 0.5`** — a plain float, used as a cutoff.
- **`probability = sigmoid(w * test_n + b)`** — scalar version of the same formula trained above; `test_n` is a Python int here, not an array, so this is ordinary scalar math, not broadcasting.
- **`"EXCEEDS BUDGET" if probability >= threshold else "within budget"`** — a conditional expression (ternary), evaluating to one of two strings based on the comparison `probability >= threshold`.

### Why this design: choosing the threshold

**Problem:** the model outputs a probability, but a monitoring system needs a decision — alert or don't alert.

**Available choices:** `threshold = 0.5` (the "textbook default," treats false alarms and missed timeouts as equally costly), a lower threshold like `0.3` (alert more eagerly, catch more true timeouts at the cost of more false alarms), or a higher threshold like `0.8` (only alert when very confident, fewer false alarms but more missed timeouts).

**Selected choice (for a monitoring/alerting context):** a threshold below `0.5`, because missing a real timeout (a false negative) is usually more costly to a service than an unnecessary alert (a false positive) — you'd rather get paged and find nothing wrong than silently blow your SLA.

**Cost:** more false alarms, which has a real cost too (alert fatigue, people ignoring pages).

**Revisit condition:** if false alarms start eroding trust in the alerting system faster than missed timeouts hurt users, raise the threshold back toward `0.5` or higher. The 0.5 default is not "correct" — it's just the assumption that both mistakes cost the same, which is rarely true in a real system.

---

## 6. The trap

**Normal rule:** `log_loss` computes `np.log(p)` and `np.log(1 - p)`, and this works fine for any `p` strictly between `0` and `1`.

**Apparently equivalent code** — removing what looks like a defensive, unnecessary line:

```python
def log_loss_unsafe(w, b):
    p = sigmoid(w * n + b)
    # np.clip(...) removed — sigmoid already returns values in (0, 1), so why clip?
    return -np.mean(exceeded * np.log(p) + (1 - exceeded) * np.log(1 - p))
```

**Surprising result:** most of the time this runs fine. But if training pushes `w` and `b` to large enough magnitudes (which *does* happen if `learning_rate` is even slightly too high, or after enough steps on very separable data), `sigmoid(z)` for a strongly negative or positive `z` returns a floating-point value that *rounds to exactly* `0.0` or `1.0` — not close to it, actually indistinguishable from it at 64-bit float precision. `np.log(0.0)` then evaluates to `-inf`, and the loss print shows `nan` or `-inf` instead of a shrinking number.

**Exact reason:** mathematically, sigmoid's range is the *open* interval `(0, 1)` — it never truly reaches the endpoints. But floating-point numbers have finite precision; for a large enough `|z|`, `1/(1+np.exp(-z))` computes to a value so close to `0` or `1` that the nearest representable `float64` *is* `0.0` or `1.0` exactly. The math is right; the hardware's number representation is what breaks. `np.clip` isn't defensive paranoia — it's compensating for a real, specific floating-point limitation, not a logic bug in your code.

**Project consequence:** this is why the `np.clip` line existed in Section 3 without being explained yet — you needed to see the training loop work *before* understanding why the guard rail was load-bearing. If you ever see `loss: nan` appear partway through a training run that was working fine, suspect exactly this: a probability rounding to a hard `0` or `1`, not a conceptual error in your gradient math.

---

## 7. Under the hood

*(Optional — not required to use logistic regression correctly.)*

The reason sigmoid's derivative simplifies to `sigmoid(z) * (1 - sigmoid(z))` traces back to the chain rule applied to `1/(1+e^{-z})`. Combined with log-loss's own derivative, most terms cancel algebraically, which is *why* Section 4's diff looked so similar to Lesson 1's gradient — it's not a coincidence or an approximation, it's an exact algebraic result. This pairing (sigmoid + log-loss) isn't arbitrary; it's the specific combination chosen because the calculus works out this cleanly. Different squashing functions paired with the same loss don't generally simplify this nicely, which is part of why deep learning frameworks later needed automatic differentiation (mentioned briefly in Lesson 1) — once you stack many non-matching functions together, hand-deriving clean gradients like this stops being feasible.

---

## 8. Exercises

- **Predict:** if you set `threshold = 0.9` instead of `0.5` in Section 5, would `n=27000` (currently predicted to exceed budget) still trigger an alert? Reason from the probability value printed, then check.
- **Modify:** add an eleventh training example, `n=45000, exceeded=0` (imagine one unusually fast run at high load). Retrain and observe whether `w` and `b` change much — what does that tell you about how much influence one noisy data point has on this model?
- **Break:** change `learning_rate` from `0.0000005` to `0.00005` (100× larger) and rerun. Does `loss` behave like Lesson 1's divergence trap, or does it hit the `np.clip` guard rail first? Explain the difference you observe.
- **Trace:** for `test_n = 20000` (the ambiguous point where both outcomes were observed in training), walk through `w * test_n + b → sigmoid(...) → probability` using your trained `w` and `b`, and explain in one sentence why a probability near `0.5` here is actually the *correct*, honest answer rather than a failure of the model.

---

## What to remember

- A raw linear score has no upper or lower bound; a probability must stay in `(0, 1)` — sigmoid is the function that enforces that bound, not an arbitrary stylistic choice.
- Sigmoid paired with log-loss produces a gradient formula that's algebraically identical in shape to plain linear regression's — the same guess-measure-adjust loop, just with the definition of "error" changed.
- Floating-point precision means sigmoid can round to a hard `0.0` or `1.0` even though the true function never reaches those values — always guard `np.log` of a sigmoid output with `np.clip`, or expect `nan` eventually.

## Next lesson

Logistic regression draws one straight decision boundary through your data — great when the "exceeds budget" zone is a clean split. But some real problems don't split cleanly along one line at all: they need a model that can ask a *sequence* of yes/no questions and combine the answers. That's a decision tree — and it introduces an entirely different way of thinking about "learning" than anything based on gradients.
