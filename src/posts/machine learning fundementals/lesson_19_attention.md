# Lesson 19 — Attention as "Weighted Lookup"

## Concept, in plain English

Before any code: imagine a lookup table. You have a query ("what do I want to
know?"), a set of keys (labels on entries in the table), and a set of values
(the actual content of each entry). A normal dictionary lookup finds the
*one* key that exactly matches your query and returns its value. Attention
generalizes this: instead of an exact match, it measures *how similar* your
query is to *every* key, turns those similarities into weights (numbers that
sum to 1), and returns a weighted blend of *all* the values — mostly drawn
from the values whose keys were most similar, but with some contribution
from everything.

This "query, key, value" framing is the entire conceptual core of the
transformer architecture. Everything else in Phase D is implementation
detail on top of this one idea.

## The math

Similarity between a query and a key, here, is just a dot product — the same
operation from Lesson 3, reused once again:

```
similarity_score = query · key
```

Turning a list of similarity scores into weights that sum to `1` is
**softmax** — mentioned briefly in Lesson 18, derived properly now:

```
softmax(scores)_i = e^(scores_i) / sum(e^(scores_j) for all j)
```

Worked example, three similarity scores `[2, 1, 0]`:

```
e^2 ≈ 7.389, e^1 ≈ 2.718, e^0 = 1
sum ≈ 11.107
weights ≈ [7.389/11.107, 2.718/11.107, 1/11.107] ≈ [0.665, 0.245, 0.090]
```

Notice the weights sum to `1.0` and the highest score got the highest
weight, but the other two still contribute something — nothing is a hard
cutoff, which is exactly the "soft," blended lookup attention is named for.

The final attention output is the weighted sum of the values using these
weights:

```
attention_output = sum(weight_i * value_i for each i)
```

## Type this — Cell 1 (new notebook)

```python
import math

def dot_product(vector_a, vector_b):
    total = 0
    for a, b in zip(vector_a, vector_b):
        total = total + a * b
    return total

def softmax(scores):
    exp_scores = [math.exp(score) for score in scores]
    total = sum(exp_scores)
    return [exp_score / total for exp_score in exp_scores]
```

Check `softmax` against the hand example:

```python
softmax([2, 1, 0])
```

You should get approximately `[0.665, 0.245, 0.090]`, summing to `1.0`.

## Type this — Cell 2

A tiny, concrete lookup scenario: 3 "table entries," each with a key (what
kind of thing it is) and a value (what it contains) — represented as plain
number vectors so you can compute with them directly:

```python
keys = [[1, 0], [0, 1], [1, 1]]
values = [[10, 0], [0, 20], [5, 5]]
query = [1, 0.2]
```

Compute similarity between the query and every key:

```python
similarity_scores = [dot_product(query, key) for key in keys]
similarity_scores
```

## Type this — Cell 3

Turn scores into weights, then blend the values:

```python
attention_weights = softmax(similarity_scores)
attention_weights
```

```python
def weighted_sum_of_vectors(weights, vectors):
    result = [0] * len(vectors[0])
    for weight, vector in zip(weights, vectors):
        for i in range(len(vector)):
            result[i] = result[i] + weight * vector[i]
    return result

attention_output = weighted_sum_of_vectors(attention_weights, values)
attention_output
```

## What just happened

`query = [1, 0.2]` is most similar to `keys[0] = [1, 0]` (both point mostly
in the same direction), so `attention_weights[0]` should be the largest of
the three, and `attention_output` should lean heavily toward `values[0] =
[10, 0]` while still picking up small contributions from the other two
values. This is a real, working attention computation — three lines of code,
built from dot products and softmax you already had.

## Type this — Cell 4

Change the query to favor a different key and watch the output shift
accordingly — no new code, just new inputs, to build intuition:

```python
query_favoring_second_key = [0.2, 1]
scores_2 = [dot_product(query_favoring_second_key, key) for key in keys]
weights_2 = softmax(scores_2)
weighted_sum_of_vectors(weights_2, values)
```

## What just happened

This output should lean toward `values[1] = [0, 20]` instead, since the new
query is more aligned with `keys[1] = [0, 1]`. Nothing about the mechanism
changed between Cell 3 and Cell 4 — only the query — which is the entire
point: attention is a general-purpose "look up the most relevant information"
operation, reusable for any query you hand it.

## Checkpoint exercise

1. Add a fourth key/value pair to the table (made-up numbers) and rerun Cell
   3's computation with the original query — confirm the code needs zero
   changes, only new data, same as earlier lessons' generalization pattern.
2. By hand, construct a query that would produce roughly *equal* weights
   across all three keys (hint: a query with very small magnitude, e.g.
   `[0.01, 0.01]`, produces small similarity scores close to each other,
   which softmax turns into nearly uniform weights) — confirm your
   prediction by running it.
3. In your own words: why is softmax a better choice here than just
   normalizing the raw scores by dividing each by their sum? (Hint: try
   `similarity_scores = [-1, 0, 5]` — think about what dividing by a sum
   containing a negative number would produce, versus what
   exponentiating first guarantees.)

Next lesson computes a full self-attention pass entirely by hand on a tiny
4-token example, matching your code's numbers to paper-worked ones exactly,
the same rigor Lesson 10 used for backpropagation. Say "next lesson" when
ready.
