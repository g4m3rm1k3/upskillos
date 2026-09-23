# Lesson 20 — Self-Attention, By Hand

## Concept, in plain English

Lesson 19's table had queries, keys, and values as three separate, given
things. Self-attention asks a sharper question: what if the *same* sequence
provides all three? Each token in a sentence generates its own query ("what
am I looking for, contextually?"), its own key ("what do I represent, so
others can find me?"), and its own value ("what information do I actually
carry?") — then every token attends to every other token, including itself,
using exactly Lesson 19's mechanism. This is the operation that lets a
transformer understand that "it" in a sentence refers back to an earlier
noun: each token's query can find the most relevant earlier token's key.

## The math

Each token starts as a plain embedding vector (for this lesson, made-up small
numbers standing in for a real word embedding). To get a query, key, and
value from it, multiply by three separate learned weight matrices — this is
just Lesson 9's `Layer` applied three times to the same input:

```
query_i = weight_matrix_query @ embedding_i
key_i   = weight_matrix_key   @ embedding_i
value_i = weight_matrix_value @ embedding_i
```

Then, for every token `i`, attention against every token `j` (Lesson 19's
mechanism, applied token-by-token):

```
score_ij = query_i · key_j
weights_i = softmax([score_i1, score_i2, ..., score_in])
output_i = sum(weights_i[j] * value_j for all j)
```

One detail Lesson 19 skipped: real transformers divide scores by
`sqrt(key_dimension)` before softmax, to stop dot products from growing too
large as vectors get longer (large scores push softmax into a near-one-hot,
near-zero-gradient regime, the same flattening problem Lesson 12 diagnosed
for sigmoid). We'll include this scaling here since it's standard.

## Worked numeric example — 2 tokens, 2-dimensional embeddings, to keep it hand-checkable

Embeddings: `token_1 = [1, 0]`, `token_2 = [0, 1]`. For simplicity, use
identity-like weight matrices so queries/keys/values equal the embeddings
themselves (`query_1 = [1, 0]`, `key_1 = [1, 0]`, `value_1 = [1, 0]`, and
likewise for token 2) — this isolates the attention math from the weight
math, which you already know from Lesson 9.

```
score_11 = query_1 · key_1 = [1,0]·[1,0] = 1
score_12 = query_1 · key_2 = [1,0]·[0,1] = 0
scaled (divide by sqrt(2) ≈ 1.414): [0.707, 0]
weights_1 = softmax([0.707, 0]) ≈ [0.669, 0.331]
output_1 = 0.669*[1,0] + 0.331*[0,1] ≈ [0.669, 0.331]
```

Token 1 attends mostly to itself (as expected — its query matches its own
key most closely) but pulls in some of token 2's value too.

## Type this — Cell 1 (new notebook)

Retype `dot_product` and `softmax` from Lesson 19.

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

## Type this — Cell 2

The two-token example from the worked math, checking your code against it
before scaling to four tokens:

```python
queries = [[1, 0], [0, 1]]
keys = [[1, 0], [0, 1]]
values = [[1, 0], [0, 1]]

key_dimension = 2
scores_for_token_1 = [dot_product(queries[0], key) / math.sqrt(key_dimension) for key in keys]
scores_for_token_1
```

```python
weights_for_token_1 = softmax(scores_for_token_1)
weights_for_token_1
```

You should see approximately `[0.669, 0.331]`, matching the hand-worked
example.

## Type this — Cell 3

Wrap this into a full self-attention function, computing every token's
output against every other token:

```python
def self_attention(queries, keys, values):
    key_dimension = len(keys[0])
    outputs = []
    for query in queries:
        scores = [dot_product(query, key) / math.sqrt(key_dimension) for key in keys]
        weights = softmax(scores)
        output = [0] * len(values[0])
        for weight, value in zip(weights, values):
            for i in range(len(value)):
                output[i] = output[i] + weight * value[i]
        outputs.append(output)
    return outputs
```

Check against your hand work:

```python
self_attention(queries, keys, values)
```

The first row should match `[0.669, 0.331]` from Cell 2; work out the second
row by hand yourself before running it, using the same pattern with
`queries[1]`.

## Type this — Cell 4 — four tokens, with real (non-identity) weight matrices

```python
embeddings = [[1, 0], [0, 1], [1, 1], [0.5, 0.5]]

weight_query = [[0.9, 0.1], [0.1, 0.9]]
weight_key = [[0.9, 0.1], [0.1, 0.9]]
weight_value = [[1, 0], [0, 1]]

def apply_weight_matrix(weight_matrix, vector):
    return [dot_product(row, vector) for row in weight_matrix]

token_queries = [apply_weight_matrix(weight_query, embedding) for embedding in embeddings]
token_keys = [apply_weight_matrix(weight_key, embedding) for embedding in embeddings]
token_values = [apply_weight_matrix(weight_value, embedding) for embedding in embeddings]

self_attention(token_queries, token_keys, token_values)
```

## What just happened

`apply_weight_matrix` is exactly Lesson 9's `Layer.forward`, minus the bias
and activation — a plain linear transformation. `weight_query`/`weight_key`
being identical here is a simplification for hand-checking; in a real,
trained transformer, all three weight matrices are learned independently via
backprop and end up different, each specialized for its role (queries learn
to represent "what to look for," keys learn to represent "what I offer").

## Checkpoint exercise

1. By hand, work out `score_34` (token 3's query against token 4's key)
   using the `weight_query`/`weight_key` matrices above and the
   `embeddings` list, then confirm it against
   `dot_product(token_queries[2], token_keys[3])`.
2. Change `weight_value` to `[[2, 0], [0, 2]]` (doubling every value) and
   confirm every output in `self_attention`'s result doubles too — a
   sanity check that values scale linearly through the weighted sum, while
   the *weights themselves* (which depend only on queries and keys) stay
   unchanged.
3. In your own words: why does dividing by `sqrt(key_dimension)` matter more
   as embeddings get larger (say, 512-dimensional, typical of a real
   transformer) than it did in this 2-dimensional toy example? (Tie the
   answer to how a dot product's typical magnitude grows as more terms are
   summed into it.)

Next lesson assembles self-attention into a full transformer block — adding
multiple attention "heads," a feedforward layer, and residual connections.
Say "next lesson" when ready.
