# Lesson 22 — Positional Encoding

## Concept, in plain English

Look back at Lesson 20's `self_attention`: it computes scores from queries
and keys, and blends values by weight — nowhere does it use a token's
*position* in the sequence. Swap the order of the input tokens, and you'd get
the exact same set of outputs, just reordered along with the inputs. That
means, as built so far, a transformer literally cannot distinguish "dog bites
man" from "man bites dog" — same three tokens, same attention computation,
different meaning entirely. Positional encoding fixes this by adding
position-specific information directly into each token's embedding before
attention ever runs.

## The math

The scheme used in the original transformer paper adds a vector to each
token's embedding, built from sine and cosine waves of different
frequencies, one pair of values per position:

```
positional_encoding(position, dimension_index) =
    sin(position / 10000^(dimension_index / embedding_size))   if dimension_index is even
    cos(position / 10000^((dimension_index - 1) / embedding_size))  if dimension_index is odd
```

The intuition, not the full mathematical proof: each dimension of the
encoding oscillates at a different frequency (controlled by
`10000^(dimension_index/embedding_size)` in the denominator) — low
dimensions oscillate fast (changing a lot between adjacent positions), high
dimensions oscillate slowly (changing little even across many positions).
Together, the combination of all dimensions at a given position forms a
unique "fingerprint" for that position, one no other position exactly
shares, in a way that also preserves useful relative-distance information
between nearby positions.

Worked example, `embedding_size=4`, position `0`:

```
dim 0 (even): sin(0 / 10000^(0/4)) = sin(0) = 0
dim 1 (odd):  cos(0 / 10000^(0/4)) = cos(0) = 1
dim 2 (even): sin(0 / 10000^(2/4)) = sin(0) = 0
dim 3 (odd):  cos(0 / 10000^(2/4)) = cos(0) = 1
```

Position `0` always encodes to `[0, 1, 0, 1, ...]` regardless of
`embedding_size`, since `sin(0)=0` and `cos(0)=1` no matter what the
frequency is — a useful sanity check for your code.

## Type this — Cell 1 (new notebook)

```python
import math

def positional_encoding_value(position, dimension_index, embedding_size):
    frequency_exponent = (dimension_index - (dimension_index % 2)) / embedding_size
    angle = position / (10000 ** frequency_exponent)
    if dimension_index % 2 == 0:
        return math.sin(angle)
    else:
        return math.cos(angle)
```

Check against the hand example:

```python
[positional_encoding_value(0, d, 4) for d in range(4)]
```

You should get `[0.0, 1.0, 0.0, 1.0]`.

## Type this — Cell 2

Build the full encoding vector for a given position, and compute it for
several positions:

```python
def positional_encoding(position, embedding_size):
    return [positional_encoding_value(position, d, embedding_size) for d in range(embedding_size)]

for position in range(5):
    print(position, positional_encoding(position, embedding_size=4))
```

## What just happened

Position `0` should match your Cell 1 check. Watch how the values at each
position differ — the even dimensions (0, 2, using sine) and odd dimensions
(1, 3, using cosine) each trace out a smooth wave as position increases, at
different speeds per dimension, exactly as the math section described.

## Type this — Cell 3

Add the positional encoding directly onto a token's embedding — this is the
entire mechanism, nothing more:

```python
def add_vectors(vector_a, vector_b):
    return [a + b for a, b in zip(vector_a, vector_b)]

token_embeddings = [[1, 0, 0.5, 0.5], [0, 1, 0.5, 0.5], [1, 1, 0, 0]]

embeddings_with_position = [
    add_vectors(embedding, positional_encoding(position, embedding_size=4))
    for position, embedding in enumerate(token_embeddings)
]
embeddings_with_position
```

## What just happened

`embeddings_with_position` now carries both content (the original embedding)
and position (the added encoding) in one vector. Feed this into Lesson 21's
transformer block instead of the raw embeddings, and every downstream
computation (queries, keys, values, attention scores) is now sensitive to
position — two identical tokens (same embedding) at different positions
produce different queries and keys, because the added positional part
differs.

## Type this — Cell 4 — visualize it

```python
import matplotlib.pyplot as plt

embedding_size = 16
positions = range(50)
encodings = [positional_encoding(p, embedding_size) for p in positions]

plt.imshow([[value for value in encoding] for encoding in encodings], cmap="RdBu", aspect="auto")
plt.xlabel("dimension")
plt.ylabel("position")
plt.title("positional encoding heatmap")
```

## What just happened

Each row is one position's full encoding vector; columns further right
(higher dimension index) should look smoother/slower-changing than columns
on the left, visually confirming the "different frequencies per dimension"
claim from the math section.

## Checkpoint exercise

1. Take two identical embeddings (e.g. `[1, 0, 0.5, 0.5]` used twice) at
   positions `0` and `3`, run both through `add_vectors` with their
   respective positional encodings, and confirm the results differ — proof
   that identical content at different positions is no longer
   indistinguishable to the network.
2. Compute `dot_product` (retype from Lesson 20) between position `0`'s and
   position `1`'s encodings, then between position `0`'s and position `20`'s
   — nearby positions should be more similar (higher dot product) than
   distant ones, a property useful for attention to exploit.
3. In your own words, using Cell 4's heatmap as evidence: why would a fixed
   sine/cosine scheme (versus, say, just adding the raw position number `0,
   1, 2, 3...` directly to each embedding) avoid the exploding-magnitude
   problem a raw position number would cause for a very long sequence?

Next lesson is the course capstone: a tiny transformer, built entirely from
Lessons 19–22's pieces, trained on a toy sequence task with no
`nn.Transformer` shortcut. Say "next lesson" when ready.
