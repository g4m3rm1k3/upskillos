# Lesson 16 — Sequences: Recurrent Networks

## Concept, in plain English

Every network so far takes a fixed-size input and treats every position as
independent — swap two pixels in Lesson 15's image and the convolution result
changes, but there's no notion of "this came before that" the way there is in
a sentence or a time series. A recurrent network (RNN) processes a sequence
one element at a time and carries a **hidden state** forward — a running
summary of everything seen so far — updating it at each step. That hidden
state is the entire new idea this lesson.

## The math

At each timestep `t`, an RNN combines the new input with the *previous*
hidden state to produce a *new* hidden state:

```
hidden_state_t = tanh( (weights_input @ input_t) + (weights_hidden @ hidden_state_{t-1}) + bias )
```

Compare this to Lesson 9's layer formula — it's the same weighted-sum-plus-
activation shape, just with *two* weighted sums added together instead of
one: one from the current input, one from the previous hidden state. This is
the only structurally new idea in the formula; everything else (dot products,
tanh, bias) you've already built.

Worked example, simplified to single numbers (not vectors) for clarity:
`weights_input=0.5`, `weights_hidden=0.8`, `bias=0`, `hidden_state_0=0`
(starting state, before seeing anything), sequence `[1, 1]`:

```
hidden_state_1 = tanh(0.5*1 + 0.8*0 + 0) = tanh(0.5) ≈ 0.4621
hidden_state_2 = tanh(0.5*1 + 0.8*0.4621 + 0) = tanh(0.8697) ≈ 0.7014
```

Notice `hidden_state_2` used `hidden_state_1`'s value — each step's output
depends on every step that came before it, chained through the hidden state,
which is exactly what lets an RNN "remember" earlier parts of a sequence.

## Type this — Cell 1 (new notebook)

```python
import math

def tanh(z):
    return math.tanh(z)
```

The single-number version from the worked example, to build intuition before
generalizing to vectors:

```python
def rnn_step_scalar(input_value, previous_hidden_state, weight_input, weight_hidden, bias):
    return tanh(weight_input * input_value + weight_hidden * previous_hidden_state + bias)
```

Check against the hand example:

```python
hidden_state = 0
hidden_state = rnn_step_scalar(1, hidden_state, weight_input=0.5, weight_hidden=0.8, bias=0)
print(hidden_state)
hidden_state = rnn_step_scalar(1, hidden_state, weight_input=0.5, weight_hidden=0.8, bias=0)
print(hidden_state)
```

You should see approximately `0.4621` then `0.7014`.

## What just happened

Look closely at how you called this twice: the second call's
`previous_hidden_state` argument was the *first* call's return value. That
manual chaining, done by hand here, is exactly what an RNN automates in a
loop — process one element, keep the result, feed it into processing the
next element.

## Type this — Cell 2

Wrap the loop itself, processing an entire sequence and returning every
hidden state (not just the final one — useful for inspecting what the
network "knew" at each point):

```python
def run_rnn_scalar(sequence, weight_input, weight_hidden, bias, starting_hidden_state=0):
    hidden_state = starting_hidden_state
    all_hidden_states = []
    for input_value in sequence:
        hidden_state = rnn_step_scalar(input_value, hidden_state, weight_input, weight_hidden, bias)
        all_hidden_states.append(hidden_state)
    return all_hidden_states
```

```python
run_rnn_scalar([1, 1], weight_input=0.5, weight_hidden=0.8, bias=0)
```

## Type this — Cell 3 — a concrete task: does this sequence sum past a threshold?

A tiny task where order-independent networks would need to see the whole
sequence at once, but an RNN can track a running total naturally: does a
sequence of numbers cross `5` in cumulative sum at any point?

```python
sequences = [[1, 1, 1], [3, 3, 3], [5, 0, 0], [1, 2, 1]]
cumulative_over_threshold = [[1 if sum(seq[:i+1]) > 5 else 0 for i in range(len(seq))] for seq in sequences]
cumulative_over_threshold
```

Look at this by hand before moving on — for `[3, 3, 3]`, cumulative sums are
`3, 6, 9`, so the label sequence is `[0, 1, 1]`. This is exactly the kind of
"depends on everything before it" pattern a hidden state is built for.

## Type this — Cell 4 — now with PyTorch

```python
import torch
import torch.nn as nn

rnn_layer = nn.RNN(input_size=1, hidden_size=8, batch_first=True)
```

`input_size=1` because each timestep is a single number; `hidden_size=8`
means the hidden state is a vector of 8 numbers instead of your scalar
example — same formula as Cell 1, just with vectors and matrices instead of
single numbers, the same generalization Lesson 9 made from one neuron to a
layer.

```python
sequence_tensor = torch.tensor([[1.0], [1.0], [1.0]]).unsqueeze(0)
output, final_hidden_state = rnn_layer(sequence_tensor)
output.shape, final_hidden_state.shape
```

## What just happened

`output` contains the hidden state at *every* timestep (shape: 1 sequence ×
3 timesteps × 8 hidden numbers); `final_hidden_state` is just the last one.
This mirrors your `run_rnn_scalar`'s full list versus its final entry —
PyTorch keeps both available because different tasks need different things:
classifying an entire sequence usually only needs the final hidden state,
while labeling every timestep (like Cell 3's task) needs all of them.

## Checkpoint exercise

1. Extend `rnn_step_scalar` and `run_rnn_scalar` by hand to track a running
   sum directly (no weights needed — just `running_sum = running_sum +
   input_value`), and compare its behavior against Cell 3's
   `cumulative_over_threshold` — this is the non-learned version of the
   pattern an RNN is meant to *learn* on its own from examples.
2. Build a small model: `nn.RNN(input_size=1, hidden_size=8)` followed by
   `nn.Linear(8, 1)` applied to every timestep's output, train it on Cell 3's
   sequences and labels to predict `cumulative_over_threshold`, and check
   its predictions against the true labels.
3. In your own words: why would flattening a sequence into one long vector
   (Lesson 13's approach for images) work poorly here, if the sequences
   could be different lengths? (Tie the answer to `run_rnn_scalar`'s loop
   working on a sequence of *any* length, unlike `SimpleNetwork`'s fixed
   `num_inputs`.)

Next lesson: overfitting, caused deliberately, then dropout and weight decay
introduced as concrete fixes tied back to the loss function math. Say "next
lesson" when ready.
