# Lesson 18 — Look Directly, Not Through a Chain: Attention

## What you'll learn
- Why forcing all of history through one evolving hidden state (Lesson 17's RNN) is a genuine bottleneck, and how attention lets any position look directly at any other position in a single computation — no chain of intermediate steps to survive.
- Softmax: a new construct generalizing sigmoid's single yes/no probability into a full probability distribution spread across many options at once.
- A real, well-documented, slightly surprising limitation: self-attention on its own has *no* notion of sequence order whatsoever — it's mathematically blind to position unless you explicitly inject that information.

## What you'll build
A self-attention mechanism, built from scratch, computing how strongly every position in a short sequence should attend to every other position — directly, in one step, regardless of distance — then a concrete demonstration that this exact mechanism genuinely cannot tell you what order the sequence originally came in.

---

## The question

Recall Lesson 17's trap precisely: information from an early timestep had to survive being multiplied through *every* intermediate timestep's hidden-state update to influence a much later one — and that repeated multiplication is exactly what caused the gradient (and, in a longer-running version, the *information itself*) to vanish. What if, instead, a later position could look **directly** at an earlier position's information, with nothing in between to pass through at all?

---

## 1. Predict

If position `2` in a sequence needs information from position `0`, and there's a **direct** computational connection between them — not routed through position `1`'s hidden state the way Lesson 17's RNN required — would you expect that information to degrade with distance, the way it did in Lesson 17's long-sequence trap? Why or why not?

---

## 2. Try it: one query, one key, one score

```python
import numpy as np

X = np.array([
    [1.0, 0.0],   # token 0: a "risky signal"-flavored vector
    [0.0, 1.0],   # token 1: a "normal signal"-flavored vector
    [1.0, 1.0],   # token 2: a mixed/ambiguous vector
])

query = X[2]
key = X[0]
score = np.dot(query, key)
print(f"raw compatibility score between token 2 and token 0: {score}")
```

### What this code does

- **`X`** — three short vectors, each representing one position in a sequence (a stand-in for word or event embeddings — where those vectors actually come from isn't the point of this lesson, only what's *done* with them once you have them).

- **`query = X[2]`, `key = X[0]`** — in attention terminology, a **query** represents "what is this position looking for," and a **key** represents "what does this other position have to offer." Here, both happen to just be the raw token vectors — a deliberate simplification explained fully in Section 3.

- **`np.dot(query, key)`** — an ordinary dot product, computing how *aligned* two vectors are: large and positive when they point in similar directions, near zero when unrelated, negative when they point in opposing directions. This single number is a **raw compatibility score** — "how relevant is token 0 to token 2's query."

### What happens

The score for `[1,1]` (token 2) against `[1,0]` (token 0) comes out to `1.0` — a nonzero, positive compatibility, purely because they share a component in the same direction. **This one dot product is the entire foundation of attention: a direct, single-step measure of how relevant one position is to another, computed without touching anything in between them.**

---

## 3. Why: query, key, value, and softmax

**The mechanism:** compute a compatibility score between *every* pair of positions (not just one, as in Section 2), turn those raw scores into a proper probability distribution using **softmax**, then use that distribution to compute a weighted average of every position's **value** — a third, separate representation of what that position actually contributes once it's been attended to.

```python
def softmax(z):
    shifted = z - np.max(z, axis=-1, keepdims=True)
    exp_z = np.exp(shifted)
    return exp_z / np.sum(exp_z, axis=-1, keepdims=True)

def self_attention(X):
    d = X.shape[1]
    Q, K, V = X, X, X   # simplification: using the raw vectors directly as Q, K, and V
    scores = (Q @ K.T) / np.sqrt(d)
    weights = softmax(scores)
    output = weights @ V
    return output, weights

output, weights = self_attention(X)
print(weights)
print(output)
```

### Code mechanics

- **`shifted = z - np.max(z, axis=-1, keepdims=True)`** — before exponentiating, subtract each row's own maximum value from every entry in that row. This doesn't change the final result at all (a property of softmax: shifting every input by the same constant leaves the output identical), but it prevents `np.exp` from being handed a large raw score that could overflow toward infinity — a numerical-safety trick in the same family as Lesson 2's `np.clip` and Lesson 9's Laplace smoothing, just specific to softmax.

- **`exp_z / np.sum(exp_z, axis=-1, keepdims=True)`** — **softmax**: exponentiate every score (making everything positive, and exaggerating differences — a slightly larger score becomes a *much* larger exponentiated value), then divide by the row's total, so each row sums to exactly `1.0`. Unlike `sigmoid`, which produces one probability for a single yes/no decision, softmax produces a **full probability distribution across as many options as there are columns** — here, "how much should this position attend to *each* of the other positions, as fractions that add up to one."

- **`Q, K, V = X, X, X`** — a deliberate simplification: a real transformer computes `Q`, `K`, and `V` as three *separate*, learned linear projections of `X` (`Q = X @ Wq`, and so on, with `Wq`, `Wk`, `Wv` trained via backpropagation exactly like every weight matrix in this series). Using the raw vectors directly for all three keeps this lesson's numbers hand-traceable, while preserving the actual mechanism — everything downstream of this line works identically whether `Q`/`K`/`V` are raw `X` or learned projections of it.

- **`scores = (Q @ K.T) / np.sqrt(d)`** — every query dotted against every key at once: `Q` is `(3, 2)`, `K.T` is `(2, 3)`, so `scores` is `(3, 3)` — a full grid of "how compatible is position `i`'s query with position `j`'s key," for every pair `(i, j)`. Dividing by `sqrt(d)` (here, `sqrt(2)`) is explained fully in Section 4.

- **`weights = softmax(scores)`** — applied row by row (`axis=-1`), turning each row of raw scores into a proper probability distribution — row `i` says exactly how much position `i` should attend to *every* position, including itself, summing to `1.0`.

- **`output = weights @ V`** — `weights` is `(3, 3)`, `V` is `(3, 2)`; the result is `(3, 2)` — for each position, a **weighted average** of every position's value vector, weighted by that row's attention distribution. Position `2`'s output row directly incorporates information from positions `0` and `1`, in a single matrix multiplication — no intermediate hidden state, no chain of updates to pass through.

### What happens

`weights`'s third row (position `2`, the "mixed" token) will show meaningfully large weight on *itself* and roughly comparable, smaller weight split between positions `0` and `1` — because `[1,1]` shares some direction with both. `output`'s rows are blended vectors, each pulling in a bit of every position's value, proportioned by relevance rather than by distance in the sequence.

### Mental model

```
RNN (Lesson 17): information from position 0 reaches position 5 only by
    surviving FIVE sequential multiplicative hops through the hidden state
        ↓
ATTENTION: information from position 0 reaches position 5 through ONE
    direct computation — a single dot product between position 5's
    query and position 0's key, with nothing in between to degrade it
        ↓
softmax turns raw compatibility scores into a genuine probability
    distribution — "how much of my output should come from each position"
        ↓
the output is a weighted average of every position's VALUE, weighted
    by that distribution
```

---

## 4. Change one thing

Here's exactly why the `/ np.sqrt(d)` scaling exists — demonstrated on a higher-dimensional example, where the effect becomes visible:

```diff
- scores = Q @ K.T
+ scores = (Q @ K.T) / np.sqrt(d)
```

```python
rng = np.random.RandomState(0)
Q_big = rng.normal(size=(3, 64))
K_big = rng.normal(size=(3, 64))

raw_scores = Q_big @ K_big.T
scaled_scores = raw_scores / np.sqrt(64)

print("raw softmax weights:   ", softmax(raw_scores)[0])
print("scaled softmax weights:", softmax(scaled_scores)[0])
```

**What changed:** whether the raw dot-product scores are divided by `sqrt(d)` (the embedding dimension) before being passed into softmax.

**What did not change:** the softmax function itself, and the fundamental "weighted average of values" mechanism downstream — scaling only touches the scores on their way *into* softmax.

**Why this matters, concretely:** with `d=64` (a much more realistic embedding size than this lesson's toy `d=2`), raw dot products between random vectors tend to have a much larger typical magnitude than they did in the small example — simply because summing `64` products, rather than `2`, tends to produce bigger numbers. Feeding those large raw scores into softmax pushes it toward an almost **one-hot** distribution — one position getting weight extremely close to `1.0`, everything else pushed toward `0`. This isn't just an accuracy concern: **softmax saturating this way has the exact same consequence as sigmoid saturating in Lessons 2, 13, 14, and 17 — its gradient becomes tiny, right where you'd most want the model to still be able to adjust its attention.** Dividing by `sqrt(d)` keeps the scores' typical magnitude roughly constant regardless of embedding dimension, preventing this dimension-dependent saturation — a small division, motivated by the exact same saturation-kills-gradients concern that's recurred throughout this entire series.

---

## 5. Put it in the project

```python
event_labels = ["normal", "spike", "normal"]
output, weights = self_attention(X)
for i, label in enumerate(event_labels):
    top_attended = np.argmax(weights[i])
    print(f"position {i} ({label}): attends most to position {top_attended} "
          f"({event_labels[top_attended]}), weight={weights[i][top_attended]:.3f}")
```

### Code walkthrough

- **`np.argmax(weights[i])`** — for each position's attention distribution (one row of `weights`), find which *other* position it weighted most heavily — a simple way to inspect, per position, "what is this attention mechanism actually looking at."

### Why this design: self-attention vs. cross-attention

**Problem:** this lesson's `Q`, `K`, and `V` all came from the *same* sequence, `X` — this specific arrangement is called **self-attention**.

**Available choices:** self-attention (queries, keys, and values all from one sequence — used here, and throughout a transformer's internal layers), or **cross-attention** (queries from one sequence, keys and values from a *different* sequence — used, for example, in translation, where a query from the sentence being generated attends to keys and values from the original sentence being translated).

**Selected choice:** self-attention, appropriate whenever you want every part of a single sequence to be able to incorporate context from every other part of that same sequence.

**Reason:** cross-attention requires two related sequences (source and target); self-attention needs only one, making it the natural building block for a single sequence's own internal representation.

**Cost / revisit condition:** cross-attention becomes necessary the moment a task genuinely involves relating two distinct sequences to each other, rather than relating one sequence to itself.

---

## 6. The trap

**Normal rule:** attention lets any position directly incorporate information from any other position, based on content relevance — a clear improvement over Lesson 17's RNN, which struggled specifically with *distance*.

**Apparently harmless variation** — the exact same tokens, just listed in a different order:

```python
X_reordered = X[[1, 0, 2]]   # swap positions 0 and 1; token 2 stays put
output_reordered, weights_reordered = self_attention(X_reordered)

print("original output:\n", output)
print("reordered output:\n", output_reordered)
```

**Surprising result:** `output_reordered` is **exactly** `output`, with rows `0` and `1` swapped — nothing more subtle happened. The attention mechanism computed, for the token that used to be called "position 1," the *exact same output vector* it computed before, just now sitting at index `0` instead of index `1`. **The self-attention computation has no idea the sequence order changed at all** — it produced the identical set of output vectors, purely relabeled.

**Exact reason:** every step of `self_attention` — the dot products in `scores`, the row-wise `softmax`, the final `weights @ V` — depends only on the *set* of vectors present and their *content*, never on their *position* in the array. Permuting the input rows permutes `Q`, `K`, and `V` identically, which permutes `scores`, `weights`, and `output` identically too — the entire computation is what's called **permutation-equivariant**: reorder the input, and the output reorders the exact same way, carrying no separate memory of what the original order was. Compare this directly to Lesson 17's RNN, which processed tokens in a strict, position-dependent sequence — swapping two inputs there would have produced a *genuinely different* hidden-state trajectory, not just a relabeled one.

**Project consequence:** in any task where order actually matters — "the spike happened *after* the reset" means something different from "the reset happened *after* the spike," even though both involve the same two events — plain self-attention, exactly as built in this lesson, **cannot tell these two orderings apart at all**. This isn't a rare edge case; it's a structural fact about the mechanism, true for every self-attention computation unless something *else* is done to inject position information. Real transformers fix this — deliberately, explicitly, not as an afterthought — which is exactly what the next section covers.

---

## 7. Under the hood

*(Optional — not required to use self-attention correctly.)*

**Positional encodings** are the standard fix for Section 6's trap: before attention is applied, a vector representing each position's *index* (0, 1, 2, ...) — either a fixed mathematical pattern or a separately learned embedding — is added directly to each token's vector, so that `X`'s rows are no longer position-blind by the time attention operates on them; permuting the *original* tokens no longer produces a merely-relabeled output, because each position now carries its own identity baked directly into its vector. Real transformers also use **multi-head attention**: running several independent attention computations in parallel, each with its own learned `Wq`, `Wk`, `Wv` projections, letting different "heads" specialize in attending to different kinds of relationships (one head might learn to track nearby positions, another might track long-range dependencies) — this lesson implemented a single, simplified, projection-free head, a known simplification in the same spirit as earlier lessons' flagged omissions (gating in Lesson 17, padding in Lesson 16).

---

## 8. Exercises

- **Predict:** for the `d=64` example in Section 4, would you expect the *unscaled* softmax weights to be closer to a uniform distribution (roughly equal weight everywhere) or closer to one-hot (almost all weight on a single position)? Reason from what large raw scores do to `exp(z)`'s relative magnitudes before checking the printed output.
- **Modify:** add proper learned-style `Wq`, `Wk`, `Wv` projection matrices (random `2×2` matrices, similar to how Lesson 13 initialized weight matrices) to `self_attention`, computing `Q = X @ Wq`, `K = X @ Wk`, `V = X @ Wv` instead of using raw `X` for all three, and confirm the mechanism still runs the same way with genuinely different `Q`, `K`, `V`.
- **Break:** reorder `X` so that *all three* tokens are permuted (not just two), and confirm `output`'s rows are still exactly the original output rows, just fully re-permuted to match — reinforcing that this isn't specific to swapping exactly two positions.
- **Repair:** add a simple positional encoding: create a `(3, 2)` array where each row is `[position_index, 0]` (a crude but illustrative stand-in for a real positional encoding), add it to `X` before calling `self_attention`, and confirm that the reordering test from Section 6 **no longer** produces a purely relabeled output — the position information is now baked into the vectors themselves, breaking the permutation-equivariance directly.

---

## What to remember

- Attention computes a direct, single-step compatibility score between every pair of positions, sidestepping the sequential, distance-dependent information decay that made Lesson 17's RNN struggle with long-range dependencies.
- Softmax turns raw scores into a genuine probability distribution across many options at once — a direct generalization of sigmoid's single yes/no probability — and, like sigmoid, it can saturate; the `/ sqrt(d)` scaling exists specifically to prevent that saturation as embedding dimension grows.
- Self-attention is permutation-equivariant: it has no built-in notion of sequence order at all, and will produce the same set of outputs (merely relabeled) for any reordering of the same input tokens, unless position information is explicitly injected beforehand.

## Next lesson

Every architecture across this half of the series — CNNs, RNNs, attention — can be scaled up to enormous size, with millions or billions of parameters. At that scale, overfitting (Lesson 3's concern, and Lesson 8's regularization response to it) becomes a much larger practical problem, and the classic fixes aren't always enough on their own. The next lesson covers dropout and batch normalization — two techniques built specifically for training very large networks without them simply memorizing their training data.
