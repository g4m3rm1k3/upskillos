# Lesson 1 — Learning the Hidden Constants Behind Big-O

## What you'll learn
- Big-O describes *shape* (linear, quadratic, etc.), not *speed*. You'll learn how to recover the actual constants — cost-per-element and fixed overhead — from real timing data.
- "Learning" is a loop: guess → measure error → adjust → repeat. You've probably typed this loop without naming it.
- How to read, not just run, a NumPy script: every operator, every function call, every loop, explained mechanically.

## What you'll build
A script that takes benchmark timings of a simple `O(n)` function (summing a list) at different input sizes, and *learns* — without you hardcoding it — the formula `time ≈ c * n + overhead`.

---

## The question

You know `sum(my_list)` is `O(n)`. That tells you the *shape* of the runtime curve as `n` grows — but it tells you nothing about the actual numbers. Is it 2 microseconds per element or 0.002? Is there a fixed startup cost?

You benchmark it yourself and get real numbers:

| n (list size) | measured time (µs) |
|---|---|
| 1,000  | 12  |
| 2,000  | 23  |
| 4,000  | 47  |
| 8,000  | 90  |
| 16,000 | 185 |
| 32,000 | 360 |
| 64,000 | 730 |

You want a formula, `time = c * n + overhead`, that predicts the time for *any* `n` — including sizes you never benchmarked. Nobody gave you `c` or `overhead`. You have to find them from the data.

---

## 1. Predict

Before writing anything: if `c` (cost per element) is too small, and you nudge it upward, does the *gap between predicted and measured time* get bigger or smaller?

Second question: `n` doubles from 32,000 to 64,000, and measured time roughly doubles too (360 → 730). What does that tell you about whether `overhead` is large or small compared to `c * n`?

---

## 2. Try it

```python
import numpy as np

n = np.array([1000, 2000, 4000, 8000, 16000, 32000, 64000], dtype=float)
t = np.array([12, 23, 47, 90, 185, 360, 730], dtype=float)

def mean_squared_error(c, overhead):
    predicted = c * n + overhead
    residual = predicted - t
    return np.mean(residual ** 2)

for c in [0.005, 0.01, 0.015, 0.02, 0.025]:
    print(f"c={c:<6} error={mean_squared_error(c, overhead=0):,.2f}")
```

### What this code does

Going construct by construct — nothing is skipped, nothing is summarized away:

- **`import numpy as np`** — an import statement. It loads the `numpy` module and binds it to the local name `np`. This happens once, when the interpreter first reaches this line; every later `np.something` is just attribute lookup on that already-loaded module object.

- **`n = np.array([1000, 2000, ...], dtype=float)`** — this is a function call, `np.array(...)`, with two arguments: a Python list literal (positional) and `dtype=float` (a keyword argument). `np.array` doesn't just store the list — it builds a new, fixed-size, homogeneously-typed C array in memory (a NumPy `ndarray`). `dtype=float` forces every element to be a 64-bit float, even though the literals `1000, 2000, ...` look like integers in the source. **Why written this way, not left to infer the type:** without `dtype=float`, NumPy would infer `int64` from the literals, and later arithmetic like `c * n` (where `c` is a Python float) would still promote to float — so here it's not strictly required, but it removes any ambiguity and matches `t`'s dtype for safe elementwise operations. If you changed it to `dtype=int`, `n` would silently still work in this particular script; the trap where this matters shows up later in Section 6.

- **`def mean_squared_error(c, overhead):`** — a function definition. `c` and `overhead` are parameters with no type annotation and no default value — Python resolves their types at call time, not at definition time (Python has no compile step that checks this). The function body doesn't run until the function is *called*; defining it just creates a function object bound to the name `mean_squared_error`.

- **`predicted = c * n + overhead`** — `n` is a NumPy array; `c` and `overhead` are plain Python floats. `c * n` triggers **broadcasting**: NumPy doesn't loop in Python — it multiplies every element of `n` by the scalar `c` inside compiled C code, producing a new array of the same shape. `+ overhead` then broadcasts again, adding the scalar to every element. The result, `predicted`, is a new array — `n` and `t` are untouched.

- **`residual = predicted - t`** — elementwise subtraction of two same-shape arrays (not broadcasting a scalar this time — both operands are full arrays). Each position in `residual` is `predicted[i] - t[i]`.

- **`return np.mean(residual ** 2)`** — `residual ** 2` squares every element (elementwise exponentiation, still no Python-level loop). `np.mean(...)` is a *reduction*: it collapses the whole array down to a single Python/NumPy scalar by summing all elements and dividing by the count. The function returns that one number — a measurement of "how wrong is this guess, on average."

- **`for c in [0.005, 0.01, 0.015, 0.02, 0.025]:`** — an ordinary Python `for` loop iterating over a list literal. Each iteration rebinds the name `c` to the next float in the list. This loop *does* run in the Python interpreter, once per value — five iterations total, five function calls to `mean_squared_error`.

- **`print(f"c={c:<6} error={mean_squared_error(c, overhead=0):,.2f}")`** — an f-string. `{c:<6}` means "format `c`, left-align it, pad to at least 6 characters wide" — purely cosmetic, for column alignment. `{mean_squared_error(c, overhead=0):,.2f}` does two things in one expression: it *calls* `mean_squared_error` with `overhead=0` (a keyword argument, fixing overhead at zero for this exploratory pass), then formats the returned number with `,` (thousands separator) and `.2f` (fixed to 2 decimal places).

### What happens

Run it, and the printed `error` values will drop as `c` increases from `0.005`, hit a low point somewhere in the middle of that list, then rise again toward `c=0.025`. That's the same valley shape from any regression problem — except now the x-axis is "microseconds per list element" instead of an arbitrary house-price slope.

---

## 3. Why gradient descent

You just found the valley by checking five hand-picked values of `c`. That's brute force, and it doesn't scale — real ML problems have thousands or millions of parameters, not one. You need to find the bottom of the valley *without* enumerating candidates.

**The mechanism:** at any specific `c`, you can ask "if I increase `c` by an infinitesimal amount, does the error go up or down, and how fast?" That question has a numeric answer called the **gradient** — literally the slope of the error curve at that point, not the slope of your line-fit. The gradient always points toward *increasing* error, so subtracting it moves you toward *decreasing* error.

```python
c, overhead = 0.0, 0.0
learning_rate = 0.000001
count = len(n)

for step in range(2000):
    predicted = c * n + overhead
    residual = predicted - t

    grad_c = (2 / count) * np.sum(residual * n)
    grad_overhead = (2 / count) * np.sum(residual)

    c -= learning_rate * grad_c
    overhead -= learning_rate * grad_overhead

    if step % 400 == 0:
        print(f"step {step:>4}  c={c:.6f}  overhead={overhead:.3f}  error={mean_squared_error(c, overhead):.2f}")

print(f"\nLearned model: time ≈ {c:.6f} * n + {overhead:.3f} µs")
print(f"Predicted time for n=100,000: {c*100000 + overhead:.1f} µs")
```

### Code mechanics

- **`c, overhead = 0.0, 0.0`** — tuple unpacking assignment: the right side `0.0, 0.0` is a two-element tuple, unpacked positionally into `c` and `overhead` in one statement. Equivalent to two separate assignment lines, just more compact. Both start at the worst possible guess: zero cost, zero overhead.

- **`learning_rate = 0.000001`** — notice this is far smaller than the `0.01` you might expect from a typical regression problem. **Why:** `n` ranges up to 64,000, and `grad_c` involves `residual * n` summed over the dataset — that produces *huge* numbers before you even multiply by the learning rate. A learning rate tuned for small inputs would blow this up instantly (see the trap in Section 6 for what "blow up" looks like).

- **`count = len(n)`** — `len()` on a NumPy array returns the number of elements along the first axis; here, `7` (the seven benchmark rows).

- **`for step in range(2000):`** — `range(2000)` produces the integers `0` through `1999` lazily (it doesn't build a list of 2000 items in memory); the loop body executes once per integer.

- **`grad_c = (2 / count) * np.sum(residual * n)`** — `residual * n` is elementwise multiplication of two arrays (same shape, no broadcasting needed here — both are length-7 arrays). `np.sum(...)` reduces that to one number. `(2 / count) * ...` scales it. This formula is the derivative of `mean_squared_error` with respect to `c` — you don't need to re-derive it, but you should recognize it's *the same shape as the loss function itself*, just differentiated.

- **`c -= learning_rate * grad_c`** — augmented assignment, shorthand for `c = c - learning_rate * grad_c`. This is the actual "learning" step: move `c` a small amount in the direction that reduces error.

- **`if step % 400 == 0:`** — `%` is the modulo operator; `step % 400 == 0` is `True` exactly on steps `0, 400, 800, 1200, 1600` — a way to print progress without printing on every single one of 2000 iterations.

### Execution trace (one iteration, in order)

```
1. predicted = c * n + overhead          → broadcast scalar c and overhead across all 7 elements of n
2. residual  = predicted - t             → elementwise difference, still 7 elements
3. grad_c        computed from residual and n  → single number
4. grad_overhead computed from residual        → single number
5. c        -= learning_rate * grad_c          → c is now slightly closer to the true cost-per-element
6. overhead -= learning_rate * grad_overhead   → overhead is now slightly closer to the true fixed cost
7. loop repeats with the UPDATED c and overhead
```

### Mental model

```
guess c and overhead (both zero — maximally wrong)
        ↓
measure squared error against real benchmark data
        ↓
compute the gradient (which direction makes error worse)
        ↓
step in the opposite direction, scaled by learning_rate
        ↓
repeat 2000 times
        ↓
c ≈ real cost per element, overhead ≈ real fixed cost
```

---

## 4. Change one thing

Here's the brute-force candidate loop from Section 2, rewritten to remove the Python `for` loop entirely:

```diff
- for c in [0.005, 0.01, 0.015, 0.02, 0.025]:
-     print(f"c={c:<6} error={mean_squared_error(c, overhead=0):,.2f}")
+ candidates = np.array([0.005, 0.01, 0.015, 0.02, 0.025])
+ errors = np.array([mean_squared_error(c, overhead=0) for c in candidates])
+ print(errors)
```

**What changed:** the five candidate values move from a plain Python `list` into a NumPy `array`. The list comprehension `[mean_squared_error(c, overhead=0) for c in candidates]` still technically loops in Python — five function calls still happen — but the *results* are collected directly into a NumPy array (`errors`) instead of being printed one at a time inside the loop body.

**What did not change:** the mathematical meaning is identical — you still compute `mean_squared_error` once per candidate `c`, and you still get five error values. The formula inside `mean_squared_error` wasn't touched at all.

**Runtime difference:** for five candidates, this makes no measurable difference — Python's per-call overhead is tiny at this scale. The *reason* this pattern matters is that if you had 5,000 candidates instead of 5, a true vectorized version (computing all 5,000 predictions in one NumPy call rather than 5,000 separate Python function calls) becomes dramatically faster, because each `mean_squared_error(c, ...)` call re-enters the Python interpreter, while a single call operating on a 5,000-element array runs entirely in compiled C. This lesson doesn't fully vectorize across candidates because you only ever need gradient descent's *one* running guess, not thousands of independent guesses — but recognizing when vectorization would help is itself part of thinking like an ML engineer instead of just calling a library.

---

## 5. Put it in the project

You already have the trained `c` and `overhead` from Section 3. The "project" here *is* the answer to the original question: extrapolate to input sizes you never benchmarked.

```python
for test_n in [500, 100000, 1000000]:
    estimate = c * test_n + overhead
    print(f"n={test_n:>9,}  estimated time: {estimate:,.1f} µs")
```

### Code walkthrough

- **`for test_n in [500, 100000, 1000000]:`** — iterating over a Python list of three plain integers (not a NumPy array — there's no need for vectorized math on just three values used one at a time in a `print`).
- **`estimate = c * test_n + overhead`** — this is now ordinary Python scalar arithmetic (`c` is a Python float, `test_n` is a Python int, no NumPy broadcasting involved) — the exact same formula shape as `predicted = c * n + overhead` earlier, just evaluated for one number instead of an array.
- **`{test_n:>9,}`** — right-align, pad to 9 characters, insert thousands separators — purely for readable output columns.

### Why this design: choosing the learning rate

**Problem:** `learning_rate = 0.000001` was chosen, not `0.01` (which worked fine in a smaller-numbers regression problem).

**Available choices:** a learning rate on the order of `0.01` (matches typical tutorials), a much smaller one like `0.000001`, or *rescaling the input data* instead of shrinking the learning rate (e.g., dividing `n` by 1000 before training, then adjusting the interpretation of `c` afterward).

**Selected choice (for this lesson):** shrink the learning rate directly, because it keeps the code and the interpretation of `c` (literally "microseconds per element") unchanged — the number you get out is exactly the number the question asked for.

**Reason / benefit:** correctness with minimal code changes; you can directly read `c` as "cost per element" without unscaling it afterward.

**Cost:** convergence is slower — you need more steps (`2000` here) than a well-scaled problem would need, because tiny gradient steps take longer to travel the same distance.

**Revisit condition:** if you add a feature with a *much* larger or smaller numeric range than `n` (say, mixing "input size" with "number of CPU cores," which only ranges 1–64), a single learning rate can no longer suit both scales well — that's when real ML pipelines switch to feature scaling instead of hand-tuning the learning rate. That's a future lesson.

---

## 6. The trap

**Normal rule (established above):** `residual = predicted - t`, and the gradient formulas (`grad_c`, `grad_overhead`) were derived assuming *that exact* sign convention. Subtracting `learning_rate * grad_c` from `c` moves downhill.

**Apparently equivalent code:**

```python
residual = t - predicted   # looks like it should just flip a sign somewhere harmlessly
```

**Surprising result:** if you make *only* this one change — flip `predicted - t` to `t - predicted` — and leave the `grad_c`/`grad_overhead` formulas and the `c -= learning_rate * grad_c` lines exactly as they were, training doesn't just converge to a different-but-valid answer. `c` and `overhead` diverge — the printed `error` gets *larger* every 400 steps instead of smaller, eventually overflowing.

**Exact reason:** `mean_squared_error`'s *return value* (which squares the residual) is unaffected by the sign flip — `(t - predicted)**2` equals `(predicted - t)**2`. But `grad_c = (2/count) * np.sum(residual * n)` is **not** squared — it's linear in `residual`. Flipping the sign of `residual` flips the sign of `grad_c` and `grad_overhead` too. `c -= learning_rate * grad_c` was derived to *subtract* a gradient that points toward higher error — with the sign flipped, you're now subtracting a gradient that points toward *lower* error, which means you're adding it. Every step now moves in the direction that makes things worse, and it compounds.

**Project consequence:** this is exactly the kind of bug that "looks like it works" — the code runs without a crash, the numbers just quietly get worse. If you ever refactor a training loop and error starts climbing instead of falling, check for a sign mismatch between how you defined the error and how you derived the gradient — before you suspect the learning rate or the data.

---

## 7. Under the hood

*(Optional — not required to use gradient descent correctly.)*

`np.sum(residual * n)` looks like two operations (`multiply`, then `sum`) but NumPy's internals can fuse elementwise operations and reductions into a single pass over memory in many cases, avoiding the cost of allocating and then re-reading an intermediate array. You don't need to know this to write correct NumPy code — but it's part of why "vectorize instead of loop in Python" is real advice and not just a style preference: it's not just fewer lines, it's genuinely operating at a different layer of the machine (compiled, contiguous-memory operations vs. the Python interpreter's per-object overhead).

---

## 8. Exercises

- **Predict:** if you doubled every value in `t` (imagine you'd measured in different time units) but changed nothing else, what would happen to the learned `c` and `overhead`? Reason it out, then test it.
- **Modify:** the model currently assumes a straight line, `c * n + overhead`. Real `sum()` performance is close to linear but not perfectly — modify `mean_squared_error` and the gradient formulas to fit `c * n + d * n**2 + overhead` instead (a very small quadratic term), and see whether the fit improves or the extra term stays near zero.
- **Break:** set `learning_rate = 0.0001` (100× larger than the working value) and run the training loop. What does `error` do by step 400? Explain why, referencing the actual magnitude of `n`.
- **Trace:** for a single iteration where `c = 0.01`, `overhead = 5`, and one benchmark row is `n=8000, t=90`, compute `predicted`, `residual` for that row, and describe (without running code) whether that row is pulling `grad_c` positive or negative.

---

## What to remember

- A model's parameters (`c`, `overhead`) start as bad guesses and get corrected by repeatedly measuring error and stepping opposite the gradient — that loop *is* "training," regardless of algorithm.
- The gradient formula and the error's sign convention are coupled — changing one without the other doesn't just shift the answer, it can flip descent into ascent.
- Learning rate has to be scaled to the actual magnitude of your input data — the same value that works for small numbers can explode when your inputs (like `n` up to 64,000) are large.

## Next lesson

You've now learned continuous constants — cost per element, fixed overhead. But a lot of CS questions are yes/no: "is this input size going to blow the time budget?" That's a classification problem, and it uses this exact same guess-measure-adjust loop with one change to how "wrongness" is measured — logistic regression.
