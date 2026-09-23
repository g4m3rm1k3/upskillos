# Lesson 21 — The Transformer Block

## Concept, in plain English

A full transformer block adds three ideas on top of Lesson 20's self-
attention, each justified by a concrete limitation of using self-attention
alone:

1. **Multiple heads** — one attention computation can only capture one kind
   of relationship between tokens at a time (e.g. "which earlier noun does
   this pronoun refer to"). Running several independent attention
   computations in parallel, each with its own weight matrices, lets the
   model track several kinds of relationships simultaneously.
2. **A feedforward layer** — attention only *mixes* information between
   tokens (weighted sums of values); it never transforms a single token's
   content non-linearly. A small `Layer`-style network (Lesson 9, with a ReLU
   in between) applied to each token independently adds that missing
   capability.
3. **Residual connections** — adding a layer's input back onto its output
   (`output = layer(input) + input`) so gradients have a direct path
   backward through the network even if a layer's own gradient happens to
   be small — a targeted fix for the vanishing-gradient problem from Lesson
   12, now applied structurally rather than by changing activation
   functions.

## The math

**Multi-head attention**: run Lesson 20's `self_attention` `h` times in
parallel, each with independently-weighted `weight_query`/`weight_key`/
`weight_value` matrices (typically each head working on a smaller slice of
the full embedding, so the combined compute cost stays similar to one big
head), then concatenate all heads' outputs together:

```
head_i_output = self_attention(queries_i, keys_i, values_i)  # one full set of weights per head
multi_head_output = concatenate(head_1_output, head_2_output, ..., head_h_output)
```

**Feedforward layer**, applied identically and independently to each token's
vector:

```
feedforward_output = weight_2 @ relu(weight_1 @ token_vector + bias_1) + bias_2
```

This is precisely Lesson 9's two-layer network shape (`Layer` → activation →
`Layer`), just applied once per token rather than once per whole input.

**Residual connection**, applied after both the attention step and the
feedforward step:

```
after_attention  = multi_head_output + original_embeddings
after_feedforward = feedforward_output + after_attention
```

## Type this — Cell 1 (new notebook)

Retype `dot_product`, `softmax`, `self_attention`, and `apply_weight_matrix`
from Lesson 20.

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

def apply_weight_matrix(weight_matrix, vector):
    return [dot_product(row, vector) for row in weight_matrix]

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

## Type this — Cell 2

Two attention heads, each with its own weight matrices — deliberately made
different this time, so each head genuinely computes something distinct:

```python
embeddings = [[1, 0], [0, 1], [1, 1], [0.5, 0.5]]

head_1_weights = {
    "query": [[0.9, 0.1], [0.1, 0.9]],
    "key": [[0.9, 0.1], [0.1, 0.9]],
    "value": [[1, 0], [0, 1]],
}
head_2_weights = {
    "query": [[0.2, 0.8], [0.8, 0.2]],
    "key": [[0.2, 0.8], [0.8, 0.2]],
    "value": [[0, 1], [1, 0]],
}

def run_attention_head(embeddings, head_weights):
    queries = [apply_weight_matrix(head_weights["query"], e) for e in embeddings]
    keys = [apply_weight_matrix(head_weights["key"], e) for e in embeddings]
    values = [apply_weight_matrix(head_weights["value"], e) for e in embeddings]
    return self_attention(queries, keys, values)

head_1_output = run_attention_head(embeddings, head_1_weights)
head_2_output = run_attention_head(embeddings, head_2_weights)
head_1_output, head_2_output
```

## Type this — Cell 3

Concatenate the two heads' outputs, token by token — each token now has a
4-number vector (2 numbers from each 2-dimensional head):

```python
def concatenate_heads(head_outputs):
    num_tokens = len(head_outputs[0])
    concatenated = []
    for token_index in range(num_tokens):
        combined = []
        for head_output in head_outputs:
            combined.extend(head_output[token_index])
        concatenated.append(combined)
    return concatenated

multi_head_output = concatenate_heads([head_1_output, head_2_output])
multi_head_output
```

## What just happened

Each token went from a 2-number vector to a 4-number vector, carrying
information from two independently-computed attention patterns at once. In a
real transformer this is followed by one more weight matrix (not shown here
for simplicity) that projects the concatenated result back down to the
original embedding size, so the block's output shape matches its input shape
— necessary since blocks get stacked many deep.

## Type this — Cell 4 — residual connection after attention

For this to add cleanly, reduce back to the original embedding size first —
a simple average of the two heads' outputs stands in for the real
projection matrix here, to keep the arithmetic simple:

```python
def add_vectors(vector_a, vector_b):
    return [a + b for a, b in zip(vector_a, vector_b)]

def average_pairs(vector):
    half = len(vector) // 2
    return [(vector[i] + vector[i + half]) / 2 for i in range(half)]

reduced_output = [average_pairs(token) for token in multi_head_output]
after_attention = [add_vectors(reduced, original) for reduced, original in zip(reduced_output, embeddings)]
after_attention
```

## What just happened

`after_attention` is each token's attention-mixed representation *plus* its
own original embedding, added element-wise. Even if the attention mechanism
somehow learned to contribute very little (a small gradient, exactly the
Lesson 12 failure mode), the original information still passes straight
through via this addition — that's the whole protective purpose of a
residual connection.

## Type this — Cell 5 — feedforward layer with its own residual

Retype Lesson 12's `sigmoid`/`relu`, or just `relu`:

```python
def relu(z):
    return max(0, z)

def feedforward(token_vector, weight_1, bias_1, weight_2, bias_2):
    hidden = [relu(x) for x in add_vectors(apply_weight_matrix(weight_1, token_vector), bias_1)]
    return add_vectors(apply_weight_matrix(weight_2, hidden), bias_2)

feedforward_weight_1 = [[0.5, 0.1], [0.1, 0.5], [0.3, 0.3]]
feedforward_bias_1 = [0, 0, 0]
feedforward_weight_2 = [[0.4, 0.4, 0.2], [0.2, 0.2, 0.6]]
feedforward_bias_2 = [0, 0]

feedforward_outputs = [feedforward(token, feedforward_weight_1, feedforward_bias_1, feedforward_weight_2, feedforward_bias_2) for token in after_attention]
after_feedforward = [add_vectors(ff_out, residual_in) for ff_out, residual_in in zip(feedforward_outputs, after_attention)]
after_feedforward
```

## What just happened

You've now built one complete transformer block, end to end: multi-head
self-attention, a residual connection, a per-token feedforward network, and
a second residual connection — every piece something you either derived by
hand (attention, feedforward) or justified conceptually (residuals) earlier
in this course.

## Checkpoint exercise

1. Stack the block: run `after_feedforward` back through Cells 2–5 as the new
   `embeddings` input, producing a second transformer block's output —
   real transformers stack many of these blocks (commonly a dozen or more).
2. Remove the residual connections (use `reduced_output` directly instead of
   `after_attention` in Cell 5, and `feedforward_outputs` directly as the
   final result) and compare the resulting numbers — not wrong, just a
   concrete look at what residuals are adding.
3. In your own words: why does adding more attention heads, each smaller,
   cost roughly the same total computation as one large head, rather than
   multiplying the cost by the number of heads? (Hint: compare the total
   number of weight entries across two 2-dimensional heads versus one
   4-dimensional head.)

Next lesson: positional encoding — why attention alone can't tell the
difference between "dog bites man" and "man bites dog," and the sine/cosine
scheme that fixes it. Say "next lesson" when ready.
