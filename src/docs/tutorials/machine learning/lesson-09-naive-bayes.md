# Lesson 9 — Guilty by Association: Naive Bayes

## What you'll learn
- A completely different foundation for "learning": no boundary, no distance, no trees — just counting how often things co-occur, and applying one theorem from probability.
- What "naive" actually means in Naive Bayes — a specific, usually-false assumption that the algorithm makes anyway, and why that's a deliberate, honest tradeoff rather than an oversight.
- Two real numerical traps: one from probabilities hitting exactly zero, and a subtler one from the naive assumption breaking down when features aren't actually independent.

## What you'll build
A Naive Bayes classifier, built from scratch, that reads a short log message and predicts whether it describes a normal event or an incident — trained by nothing more than counting which words showed up in which kind of message before.

---

## The question

You have ten past log lines, already tagged by an on-call engineer:

| message | label |
|---|---|
| "connection timeout error retrying" | incident |
| "request completed successfully" | normal |
| "disk write failed error" | incident |
| "cache hit returning cached value" | normal |
| "retry attempt failed timeout" | incident |
| "response sent ok" | normal |
| "warning slow query detected" | incident |
| "health check passed ok" | normal |
| "connection reset error" | incident |
| "request processed successfully ok" | normal |

A new log line comes in: `"cache lookup error timeout"`. You want to auto-triage it — but notice it contains `"cache"` (which so far has only ever appeared in *normal* messages) **and** `"error"`, `"timeout"` (words that have only ever appeared in *incident* messages). The evidence is mixed. You need a principled way to combine it.

---

## 1. Predict

If you just counted, informally, how many "incident-flavored" words versus "normal-flavored" words appear in `"cache lookup error timeout"`, which way would you lean? Now consider: should the model completely dismiss the `"incident"` possibility just because `"cache"` — a single, previously normal-only word — showed up?

---

## 2. Try it (and watch counting alone break)

```python
import numpy as np

messages = [
    "connection timeout error retrying",
    "request completed successfully",
    "disk write failed error",
    "cache hit returning cached value",
    "retry attempt failed timeout",
    "response sent ok",
    "warning slow query detected",
    "health check passed ok",
    "connection reset error",
    "request processed successfully ok",
]
labels = np.array([1, 0, 1, 0, 1, 0, 1, 0, 1, 0])   # 1 = incident, 0 = normal

word_counts = {0: {}, 1: {}}
class_totals = {0: 0, 1: 0}

for message, label in zip(messages, labels):
    for word in message.split():
        word_counts[label][word] = word_counts[label].get(word, 0) + 1
        class_totals[label] += 1

def word_likelihood_raw(word, cls):
    return word_counts[cls].get(word, 0) / class_totals[cls]

for word in ["cache", "error", "timeout"]:
    print(f"{word:>8}  P(word|normal)={word_likelihood_raw(word, 0):.3f}  P(word|incident)={word_likelihood_raw(word, 1):.3f}")
```

### What this code does

- **`for message, label in zip(messages, labels):`** — `zip` pairs up two sequences positionally, so each loop iteration gets one message alongside its matching label, without manually indexing into both lists.

- **`for word in message.split():`** — `str.split()` with no argument splits on whitespace, turning `"connection timeout error retrying"` into the list `["connection", "timeout", "error", "retrying"]`. This is the entire "tokenization" step — no punctuation handling, no stemming, deliberately the simplest possible version.

- **`word_counts[label][word] = word_counts[label].get(word, 0) + 1`** — `word_counts` is a dictionary of dictionaries: the outer key is the class (`0` or `1`), the inner key is a specific word. **`.get(word, 0)`** looks up `word` in the inner dictionary, returning `0` if it's never been seen before, instead of raising an error the way `word_counts[label][word]` alone would on a first occurrence. This is the standard pattern for "increment a count that might not exist yet."

- **`class_totals[label] += 1`** — a running total of *how many words total* (not how many messages) have been seen for this class — needed to turn raw counts into probabilities.

- **`word_likelihood_raw(word, cls)`** — `word_counts[cls].get(word, 0) / class_totals[cls]` is literally "what fraction of all words seen in this class were this specific word" — a direct frequency, no probability theory beyond counting yet.

### What happens

`"cache"` has appeared only in normal messages (label `0`), never in any incident message (label `1`) — so `word_likelihood_raw("cache", 1)` prints `0.000` exactly. That single `0` is about to cause a problem: Naive Bayes combines word evidence by **multiplying** likelihoods together, and multiplying anything by `0` produces `0`, no matter how strong the other evidence is. A message containing `"cache"` would have its entire incident-class score forced to exactly zero — even if every other word in the message screamed "incident" — purely because one word happened to be unseen for that class in this small training set.

---

## 3. Why: Bayes' theorem, the naive assumption, and Laplace smoothing

**The mechanism** rests on Bayes' theorem: the probability of a class *given* the words you observed is proportional to the probability of the class occurring at all (the **prior**), times the probability of seeing those specific words *given* that class (the **likelihood**):

```
P(class | words) ∝ P(class) × P(words | class)
```

**The "naive" part:** computing `P(words | class)` exactly would require knowing how every word's appearance depends on every other word's appearance in that class — an enormous amount of information you don't have from ten short messages. Naive Bayes sidesteps this entirely by **assuming each word's presence is independent of every other word's, given the class** — so `P(words | class)` simplifies to just multiplying each individual word's likelihood together: `P(word1|class) × P(word2|class) × ...`. **This assumption is almost always literally false** — `"timeout"` and `"retry"` really do tend to show up together for real reasons, not by chance — but the assumption is a deliberate simplification made because it works surprisingly well in practice, not because anyone believes it's technically accurate. Naming it "naive" is refreshingly honest about that tradeoff.

**Laplace smoothing** fixes Section 2's zero-probability problem: instead of a raw fraction, add a small constant (`alpha`, typically `1`) to every count, and add `alpha × vocabulary_size` to the denominator to keep everything a valid probability that still sums to 1 across the vocabulary:

```python
vocabulary = set()
for message in messages:
    for word in message.split():
        vocabulary.add(word)
vocab_size = len(vocabulary)

def word_likelihood_smoothed(word, cls, alpha=1):
    count = word_counts[cls].get(word, 0)
    return (count + alpha) / (class_totals[cls] + alpha * vocab_size)

prior = {cls: np.mean(labels == cls) for cls in [0, 1]}

def classify(message, alpha=1):
    log_scores = {}
    for cls in prior:
        log_score = np.log(prior[cls])
        for word in message.split():
            log_score += np.log(word_likelihood_smoothed(word, cls, alpha))
        log_scores[cls] = log_score
    predicted = max(log_scores, key=log_scores.get)
    return predicted, log_scores

result, scores = classify("cache lookup error timeout")
print(result, scores)
```

### Code mechanics

- **`vocabulary = set(); ... vocabulary.add(word)`** — a `set` automatically discards duplicates; after the loop, `vocabulary` contains every distinct word seen across *all* training messages, regardless of class. `vocab_size` is used identically in every smoothing calculation, so every word (seen or not) gets a consistent, nonzero floor probability.

- **`(count + alpha) / (class_totals[cls] + alpha * vocab_size)`** — even when `count = 0` (a word never seen for this class), this no longer evaluates to `0` — with `alpha=1`, it becomes `1 / (class_totals[cls] + vocab_size)`, small but never exactly zero. This one line is the entire fix for Section 2's failure.

- **`prior = {cls: np.mean(labels == cls) for cls in [0, 1]}`** — a dictionary comprehension; `labels == cls` produces a boolean array, and `np.mean` of that gives the fraction of training messages belonging to each class — five out of ten each here, so both priors are `0.5`.

- **`log_score = np.log(prior[cls])`**, then **`log_score += np.log(word_likelihood_smoothed(...))`** for each word — instead of *multiplying* probabilities together directly, this *adds* their logarithms. `np.log(a * b) == np.log(a) + np.log(b)` is a basic logarithm identity — summing logs and comparing the sums produces the exact same ranking as multiplying the original probabilities and comparing those, because `np.log` is a strictly increasing function (bigger input always gives bigger output), so it never changes *which* class ends up ahead.

- **`max(log_scores, key=log_scores.get)`** — `log_scores` is a small dictionary like `{0: -14.2, 1: -13.8}`. `max(dictionary, key=dictionary.get)` returns whichever **key** has the largest associated **value** — here, whichever class has the higher combined log-score — without you needing to manually compare the two numbers yourself.

### Mental model

```
start from how common each class is overall (the prior)
        ↓
for each word in the new message, ask "how much more/less likely does
    this word make each class" — using counts from training, smoothed
    so no single word can force a probability to exactly zero
        ↓
combine all that evidence by ADDING log-probabilities (equivalent to
    multiplying the original probabilities, just numerically safer)
        ↓
whichever class ends up with the higher total wins
```

---

## 4. Change one thing

Here's exactly what would happen if Section 3 multiplied raw probabilities directly instead of summing their logs — demonstrated, not just claimed:

```python
def classify_raw_multiply(message, alpha=1):
    scores = {}
    for cls in prior:
        score = prior[cls]
        for word in message.split():
            score *= word_likelihood_smoothed(word, cls, alpha)
        scores[cls] = score
    return scores

long_message = " ".join(["error", "timeout", "retry", "failed"] * 15)  # 60 words
print(classify_raw_multiply(long_message))
print(classify(long_message)[1])
```

```diff
- score = prior[cls]
- score *= word_likelihood_smoothed(word, cls, alpha)     # multiply ~60 small numbers together
+ log_score = np.log(prior[cls])
+ log_score += np.log(word_likelihood_smoothed(word, cls, alpha))   # add ~60 logs together
```

**What changed:** whether probabilities are combined by repeated multiplication or by summing their logarithms.

**What did not change:** the underlying word likelihoods, the prior, and — mathematically — which class *should* win; log-space and direct-multiplication are supposed to agree on the ranking, always.

**Surprising result:** for `long_message` (60 words, each individual likelihood well under `1`), `classify_raw_multiply` prints `{0: 0.0, 1: 0.0}` — both scores have **underflowed to exactly zero** in floating point, because multiplying 60 numbers each smaller than `1` together produces a number far too small for a 64-bit float to represent (it rounds down to `0.0` long before the true mathematical product would matter). With both classes tied at `0.0`, the comparison is meaningless — you've lost the ability to tell which class was actually favored. `classify`'s log-based version, on the same message, still produces two distinguishable (large negative) numbers, because summing 60 moderate-sized negative numbers never runs out of floating-point range the way multiplying 60 small positive fractions does. This is why real implementations always work in log-space, not as a style preference.

---

## 5. Put it in the project

```python
test_messages = [
    "cache lookup error timeout",
    "request accepted successfully",
    "retry failed connection reset",
]
for message in test_messages:
    predicted, scores = classify(message)
    label = "INCIDENT" if predicted == 1 else "normal"
    gap = abs(scores[1] - scores[0])
    print(f'"{message}"  → {label}  (log-score gap: {gap:.2f})')
```

The `gap` between the two classes' log-scores is a rough stand-in for confidence: a small gap means the message's word evidence was nearly balanced between classes (like `"cache lookup error timeout"`, mixing signals from both), while a large gap means the words overwhelmingly pointed one way.

### Why this design: choosing alpha

**Problem:** `word_likelihood_smoothed` used `alpha=1` throughout — the standard "add-one" smoothing.

**Available choices:** `alpha=1` (the common default), a smaller `alpha` like `0.1` (trusts the observed counts more, gives less of a floor to unseen words), or a larger `alpha` (spreads probability mass more evenly, trusting counts less).

**Selected choice:** `alpha=1`, appropriate for a small training set where you can't yet be confident that a word's absence from one class is meaningful rather than just an artifact of having only ten examples.

**Cost:** with `alpha=1` and very little training data, a word that's genuinely *never* going to appear in normal messages (a truly incident-specific error code, say) still gets treated almost as if it might — smoothing trades away some sharpness in exchange for never letting one small sample completely rule anything out.

**Revisit condition:** as the training set grows into thousands of labeled messages, a smaller `alpha` becomes reasonable, since counts become statistically trustworthy on their own and need less artificial padding.

---

## 6. The trap

**Normal rule:** each additional word of genuine evidence should shift the log-score gap by a roughly comparable amount, since each word contributes its own `log(likelihood)` term independently.

**Apparently harmless, realistic variation** — a real incident log often repeats the same error line multiple times (a stack trace printed several times, a retry loop logging the same failure each attempt); classify a message reflecting that:

```python
single_mention = "error timeout during processing"
repeated_mention = "error timeout error timeout error timeout during processing"

_, scores_single = classify(single_mention)
_, scores_repeated = classify(repeated_mention)

print(f"single:   gap = {abs(scores_single[1] - scores_single[0]):.2f}")
print(f"repeated: gap = {abs(scores_repeated[1] - scores_repeated[0]):.2f}")
```

**Surprising result:** the log-score gap for `repeated_mention` isn't just "a bit larger" than `single_mention`'s — it grows dramatically, disproportionately more than three extra words' worth of genuinely *new* information would justify. The model's confidence in "incident" swings far more sharply than the actual informativeness of the message changed.

**Exact reason:** the naive independence assumption from Section 3 says each word's presence is independent evidence, given the class — but `"error"` appearing for the third time in the same message is **not** three independent pieces of evidence; it's the same underlying event (one error condition) mentioned repeatedly. Naive Bayes has no way to detect this — it dutifully multiplies (adds, in log-space) another `log(P("error"|class))` term for every single occurrence, treating each repetition as if it were freshly, independently informative. The math is executing exactly as designed; the *assumption* the design rests on is what's failing here.

**Project consequence:** feeding Naive Bayes text with naturally repeated or highly correlated tokens (repeated stack trace lines, near-duplicate log entries, copy-pasted error blocks) will systematically produce overconfident, poorly calibrated scores — not necessarily *wrong* classifications, but scores that look far more certain than the actual evidence supports. In a real triage system, deduplicating repeated lines (or capping how many times a single word can contribute) before classifying is a common, practical mitigation — not because the classifier is broken, but because its core assumption is being violated more severely than usual.

---

## 7. Under the hood

*(Optional — not required to use Naive Bayes correctly.)*

Naive Bayes is often called a **generative** model — it explicitly models `P(words | class)`, i.e., "what does a typical message from this class look like," and only derives `P(class | words)` afterward via Bayes' theorem. This is a genuinely different philosophy from every earlier lesson in this series (linear/logistic regression, trees, SVM), which are **discriminative** models — they go straight for "given these features, what's the boundary or score," without ever trying to model what a typical example of each class looks like generatively. Despite its independence assumption being almost always technically false, Naive Bayes remains a real, still-used baseline for text classification, in part because classification only requires getting the *ranking* between classes right, not perfectly calibrated probabilities — and the independence assumption, while wrong, tends to distort every class's score in a roughly similar way, often leaving the ranking intact even when the raw numbers aren't trustworthy.

---

## 8. Exercises

- **Predict:** for the message `"successfully completed request"`, which class do you expect `classify` to favor, and roughly how large a log-score gap, given that every one of those three words has only ever appeared in normal-labeled training messages?
- **Modify:** add a `most_informative_words` function that, for each word in the vocabulary, prints the ratio `word_likelihood_smoothed(word, 1) / word_likelihood_smoothed(word, 0)` — a rough measure of how strongly each word points toward "incident" versus "normal." Which words have the most extreme ratios?
- **Break:** classify a message containing a word that appears in *neither* class during training (e.g., `"kubernetes"`). Confirm that, thanks to smoothing, this doesn't crash or force a score to zero — then explain, using the smoothing formula, exactly what probability an entirely unseen word receives for each class, and why it's nonzero but still fairly small.
- **Repair:** modify `classify` so that repeated words within a single message are only counted **once** (hint: turn `message.split()` into a `set` before looping), and re-run the Section 6 trap comparison. Confirm the log-score gap between `single_mention` and `repeated_mention` becomes identical, and explain in one sentence why that specific fix addresses this specific trap.

---

## What to remember

- Naive Bayes replaces geometry and distance entirely with counting: a prior probability per class, and a likelihood per word per class, combined through Bayes' theorem.
- "Naive" names a real, usually-false assumption (features are independent given the class) made on purpose, because the simplification is often good enough for correct classification even when its individual probability estimates aren't perfectly calibrated.
- Two numerical safeguards are essential, not optional: Laplace smoothing prevents any single unseen word from forcing a probability to exactly zero, and log-space arithmetic prevents multiplying many small probabilities together from silently underflowing to zero.

## Next lesson

Naive Bayes treated every distinct word as its own feature — fine for ten short messages, but real vocabularies run into the thousands, and most words in any given message are irrelevant noise for classification purposes. Before some algorithms can even train efficiently, you need a way to compress a large, mostly-redundant feature space down to the handful of dimensions that actually carry meaningful information. That's dimensionality reduction — and it starts with PCA.
