# Lesson 23 — Capstone: A Tiny Transformer From Scratch

## Concept, in plain English

Every piece is already built: self-attention (Lesson 20), the transformer
block (Lesson 21), positional encoding (Lesson 22). This lesson assembles
them into one PyTorch model — using tensor operations instead of Python
loops, since PyTorch needs `autograd` to train it, but the exact same
formulas — and trains it on a task specifically chosen to need attention: **does
this sequence's first token match its last token?** A plain feedforward
network sees this as unrelated positions; attention can solve it directly, by
having the last position's query find the first position's key.

## Type this — Cell 1 (new notebook)

```python
import torch
import torch.nn as nn
import math
```

The task data — sequences of small integers (a tiny "vocabulary" of 5
possible token values), label `1` if first and last token match, `0`
otherwise:

```python
import random

def make_example():
    sequence_length = 6
    sequence = [random.randint(0, 4) for _ in range(sequence_length)]
    if random.random() < 0.5:
        sequence[-1] = sequence[0]
        label = 1
    else:
        if sequence[-1] == sequence[0]:
            sequence[-1] = (sequence[0] + 1) % 5
        label = 0
    return sequence, label

training_examples = [make_example() for _ in range(2000)]
test_examples = [make_example() for _ in range(200)]
```

## Type this — Cell 2

An embedding layer (turns each integer token into a learned vector — this is
new: every previous lesson's "embedding" was made up by hand; here it's a
trainable lookup table, one row per possible token value) plus positional
encoding as a fixed (non-trainable) buffer, built with the exact formula from
Lesson 22:

```python
def build_positional_encoding(sequence_length, embedding_size):
    encoding = torch.zeros(sequence_length, embedding_size)
    for position in range(sequence_length):
        for dimension_index in range(embedding_size):
            frequency_exponent = (dimension_index - (dimension_index % 2)) / embedding_size
            angle = position / (10000 ** frequency_exponent)
            if dimension_index % 2 == 0:
                encoding[position, dimension_index] = math.sin(angle)
            else:
                encoding[position, dimension_index] = math.cos(angle)
    return encoding
```

## Type this — Cell 3

The self-attention step, this time using PyTorch matrix operations across an
entire batch at once — this is Lesson 20's `self_attention` function, the
same formula, rewritten so PyTorch's `@` handles many sequences simultaneously
instead of your hand-written per-token loop:

```python
class SelfAttention(nn.Module):
    def __init__(self, embedding_size):
        super().__init__()
        self.query_projection = nn.Linear(embedding_size, embedding_size)
        self.key_projection = nn.Linear(embedding_size, embedding_size)
        self.value_projection = nn.Linear(embedding_size, embedding_size)
        self.embedding_size = embedding_size

    def forward(self, embeddings):
        queries = self.query_projection(embeddings)
        keys = self.key_projection(embeddings)
        values = self.value_projection(embeddings)

        scores = queries @ keys.transpose(-2, -1) / math.sqrt(self.embedding_size)
        weights = torch.softmax(scores, dim=-1)
        return weights @ values
```

`keys.transpose(-2, -1)` swaps the last two dimensions so the matrix
multiplication computes every query's dot product against every key at
once — the batched equivalent of Lesson 20's `for query in queries:` loop.
`torch.softmax(scores, dim=-1)` applies your hand-written `softmax` formula
along the last dimension, one row (one token's set of scores) at a time.

## Type this — Cell 4

The full transformer block: attention, residual, feedforward, residual —
identical structure to Lesson 21, in PyTorch layers:

```python
class TransformerBlock(nn.Module):
    def __init__(self, embedding_size):
        super().__init__()
        self.attention = SelfAttention(embedding_size)
        self.feedforward = nn.Sequential(
            nn.Linear(embedding_size, embedding_size * 2),
            nn.ReLU(),
            nn.Linear(embedding_size * 2, embedding_size),
        )

    def forward(self, embeddings):
        after_attention = self.attention(embeddings) + embeddings
        after_feedforward = self.feedforward(after_attention) + after_attention
        return after_feedforward
```

## Type this — Cell 5

The full model: embed tokens, add positional encoding, run through one
transformer block, then classify using the *last* token's final
representation (the position whose query needs to have found the first
token's key to solve this task):

```python
class TinyTransformer(nn.Module):
    def __init__(self, vocabulary_size, embedding_size, sequence_length):
        super().__init__()
        self.token_embedding = nn.Embedding(vocabulary_size, embedding_size)
        self.register_buffer("positional_encoding", build_positional_encoding(sequence_length, embedding_size))
        self.transformer_block = TransformerBlock(embedding_size)
        self.output_layer = nn.Linear(embedding_size, 1)

    def forward(self, token_sequences):
        embeddings = self.token_embedding(token_sequences) + self.positional_encoding
        block_output = self.transformer_block(embeddings)
        last_token_representation = block_output[:, -1, :]
        return self.output_layer(last_token_representation)
```

## Type this — Cell 6

Prepare tensors and train:

```python
training_sequences = torch.tensor([example[0] for example in training_examples])
training_labels = torch.tensor([[float(example[1])] for example in training_examples])
test_sequences = torch.tensor([example[0] for example in test_examples])
test_labels = torch.tensor([[float(example[1])] for example in test_examples])

model = TinyTransformer(vocabulary_size=5, embedding_size=16, sequence_length=6)
loss_function = nn.BCEWithLogitsLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

for epoch in range(200):
    predictions = model(training_sequences)
    loss = loss_function(predictions, training_labels)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    if epoch % 20 == 0:
        print(epoch, loss.item())
```

`BCEWithLogitsLoss` combines Lesson 4's sigmoid and log-loss into one
numerically stable function — same math you derived by hand, one call.

## Type this — Cell 7

Evaluate on held-out data:

```python
model.eval()
with torch.no_grad():
    test_predictions = model(test_sequences)
    predicted_labels = (torch.sigmoid(test_predictions) > 0.5).float()
    accuracy = (predicted_labels == test_labels).float().mean().item()
accuracy
```

## What just happened

If training worked, accuracy should land high (this task, while it needs
attention, isn't a hard one for a transformer to solve) — direct evidence
your from-scratch-derived attention mechanism, now expressed in PyTorch
tensors, learned to connect a sequence's last position back to its first
purely from examples, with nobody telling it "look at position 0."

## Checkpoint exercise

1. Build a `SimpleNetwork`-style plain feedforward baseline (flatten the
   6-token sequence, one hidden layer, one output) trained on the same
   task, and compare its accuracy against `TinyTransformer` — a direct,
   honest measurement of what attention specifically bought you here.
2. Pick one correctly-classified test example, run its embeddings through
   `model.transformer_block.attention` directly (add a version of
   `SelfAttention.forward` that also returns `weights`), and inspect whether
   the last token's attention weight is indeed highest toward the first
   token's position — direct evidence the mechanism learned what the task
   was designed to require.
3. Change the task to something attention can't trivially solve with one
   block — e.g. "do the first *two* tokens sum to the same value as the last
   *two* tokens" — retrain, and see how accuracy and required training time
   change. This is a genuine research-style experiment, not a scripted
   exercise: there's no single correct outcome to check against, only what
   you observe.

That closes all four phases: classical ML, neural networks from scratch,
deep learning with PyTorch, and attention/transformers — 23 lessons, each
building on real math you derived and checked by hand before trusting a
library to do it faster. From here, the roadmap's remaining direction is
your own: extending this transformer to generate sequences rather than just
classify them, or applying anything in Phases A–D to a dataset of your own
choosing.
