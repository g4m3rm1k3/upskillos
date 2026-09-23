# Lesson 10 — Backpropagation, Derived

## Concept, in plain English

Lesson 2 found the derivative of error with respect to `slope` and
`intercept` directly, because both fed straight into the prediction. In a
network with a hidden layer, the hidden weights *don't* directly touch the
final error — they influence the hidden neuron's output, which influences the
output neuron's input, which influences the prediction, which influences the
error. Backpropagation is the chain rule applied across that whole chain: it
computes each weight's effect on the final error by multiplying together the
effect of each link, working backward from the error to the weight.

This lesson does the full derivation on paper first, on the smallest network
that actually needs it — one input, one hidden neuron, one output neuron,
two weights total. Go slowly; everything in Phase B and Phase C depends on
genuinely following this once.

## The math — the tiny network

```
input --w1--> hidden_neuron --sigmoid--> hidden_output --w2--> output_neuron --sigmoid--> prediction
```

Forward pass, as equations:

```
hidden_input  = w1 * input
hidden_output = sigmoid(hidden_input)
final_input   = w2 * hidden_output
prediction    = sigmoid(final_input)
error         = (actual_y - prediction) ** 2
```

**We want `d(error)/d(w2)` first** — this one is direct, exactly like Lesson
2, since `w2` feeds straight into `final_input`:

```
d(error)/d(w2) = d(error)/d(prediction) * d(prediction)/d(final_input) * d(final_input)/d(w2)
```

Three pieces, each one an ordinary derivative you can look up or derive:
- `d(error)/d(prediction) = 2 * (actual_y - prediction) * (-1)` — same as
  Lesson 2's squared-error derivative.
- `d(prediction)/d(final_input) = sigmoid(final_input) * (1 - sigmoid(final_input))`
  — this is sigmoid's own derivative, a fact worth memorizing: it has this
  unusually clean form in terms of its own output.
- `d(final_input)/d(w2) = hidden_output` — since `final_input = w2 *
  hidden_output`, this is just Lesson 2's "derivative of `slope * x` with
  respect to `slope` is `x`," with `hidden_output` standing in for `x`.

Multiply the three together — that's the chain rule, literally "chain the
links together by multiplying."

**Now `d(error)/d(w1)`** — this is the genuinely new part. `w1` doesn't touch
`error` directly; it only affects `error` *through* `hidden_output`. So we
reuse the first two pieces above (they're unchanged — `error` and
`prediction` don't care how `hidden_output` was produced) and extend the
chain two links further:

```
d(error)/d(w1) = d(error)/d(prediction) * d(prediction)/d(final_input)
                * d(final_input)/d(hidden_output) * d(hidden_output)/d(hidden_input) * d(hidden_input)/d(w1)
```

Two new pieces:
- `d(final_input)/d(hidden_output) = w2` — since `final_input = w2 *
  hidden_output`, same "derivative of `slope * x` w.r.t. `x` is `slope`"
  pattern, now viewed from the other side.
- `d(hidden_output)/d(hidden_input) = sigmoid(hidden_input) * (1 -
  sigmoid(hidden_input))` — sigmoid's derivative again, this time at the
  hidden neuron.
- `d(hidden_input)/d(w1) = input` — same pattern as `d(final_input)/d(w2) =
  hidden_output` above, one layer earlier.

**The key insight, stated plainly:** `d(error)/d(w1)` reuses every single
piece from `d(error)/d(w2)`'s first two terms, then multiplies on more terms
for the extra distance back to `w1`. This is exactly why it's called
*back*propagation — you compute the error's derivative at the output first,
then walk backward, reusing and extending it at each earlier layer, rather
than recomputing everything from scratch for every weight.

## Worked numeric example

`input = 1`, `actual_y = 1`, `w1 = 0.5`, `w2 = 0.5`:

```
hidden_input  = 0.5 * 1 = 0.5
hidden_output = sigmoid(0.5) ≈ 0.6225
final_input   = 0.5 * 0.6225 ≈ 0.3112
prediction    = sigmoid(0.3112) ≈ 0.5772
```

`d(error)/d(prediction) = 2 * (1 - 0.5772) * (-1) ≈ -0.8456`
`d(prediction)/d(final_input) = 0.5772 * (1 - 0.5772) ≈ 0.2440`
`d(final_input)/d(w2) = hidden_output ≈ 0.6225`

```
d(error)/d(w2) ≈ -0.8456 * 0.2440 * 0.6225 ≈ -0.1285
```

For `w1`, reuse the first two numbers above, then extend:
`d(final_input)/d(hidden_output) = w2 = 0.5`
`d(hidden_output)/d(hidden_input) = 0.6225 * (1 - 0.6225) ≈ 0.2350`
`d(hidden_input)/d(w1) = input = 1`

```
d(error)/d(w1) ≈ -0.8456 * 0.2440 * 0.5 * 0.2350 * 1 ≈ -0.02427
```

Keep these two numbers (`≈ -0.1285` and `≈ -0.02427`) — you'll check your code
against them directly.

## Type this — Cell 1 (new notebook)

```python
import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def sigmoid_derivative(z):
    s = sigmoid(z)
    return s * (1 - s)
```

Check `sigmoid_derivative` against the hand work above:

```python
sigmoid_derivative(0.5)
```

You should get approximately `0.2350`.

## Type this — Cell 2

The forward pass, keeping every intermediate value (you need them all for
backward pass, not just the final prediction):

```python
def forward_pass(input_value, w1, w2):
    hidden_input = w1 * input_value
    hidden_output = sigmoid(hidden_input)
    final_input = w2 * hidden_output
    prediction = sigmoid(final_input)
    return hidden_input, hidden_output, final_input, prediction
```

Check against the worked example:

```python
forward_pass(input_value=1, w1=0.5, w2=0.5)
```

You should see values matching `0.5, 0.6225..., 0.3112..., 0.5772...`.

## Type this — Cell 3

The backward pass — typed in the exact order you derived it on paper, each
line labeled with which link it corresponds to:

```python
def backward_pass(input_value, actual_y, w1, w2):
    hidden_input, hidden_output, final_input, prediction = forward_pass(input_value, w1, w2)

    d_error_d_prediction = 2 * (actual_y - prediction) * (-1)
    d_prediction_d_final_input = sigmoid_derivative(final_input)
    d_final_input_d_w2 = hidden_output

    d_error_d_w2 = d_error_d_prediction * d_prediction_d_final_input * d_final_input_d_w2

    d_final_input_d_hidden_output = w2
    d_hidden_output_d_hidden_input = sigmoid_derivative(hidden_input)
    d_hidden_input_d_w1 = input_value

    d_error_d_w1 = (d_error_d_prediction * d_prediction_d_final_input
                    * d_final_input_d_hidden_output * d_hidden_output_d_hidden_input * d_hidden_input_d_w1)

    return d_error_d_w1, d_error_d_w2
```

## Type this — Cell 4

Check against your two hand-computed numbers:

```python
backward_pass(input_value=1, actual_y=1, w1=0.5, w2=0.5)
```

You should get approximately `(-0.02427, -0.1285)`, matching your paper work.
If these don't match, stop and recheck line by line against the math section
above before continuing — everything else in this course builds on this
function being correct.

## What just happened

`backward_pass` is not "new math" beyond ordinary derivatives you already
knew — it's the same chain-rule multiplication you did in Lesson 2, applied
twice, with the second application reusing the first application's early
terms. Notice `d_error_d_prediction` and `d_prediction_d_final_input` appear
in *both* final formulas — that shared prefix is exactly what makes
backpropagation efficient: compute it once, reuse it for every earlier
weight.

## Type this — Cell 5

Use the gradients to take one gradient descent step, same update rule as
every previous lesson:

```python
def train_step(input_value, actual_y, w1, w2, learning_rate):
    d_error_d_w1, d_error_d_w2 = backward_pass(input_value, actual_y, w1, w2)
    new_w1 = w1 - learning_rate * d_error_d_w1
    new_w2 = w2 - learning_rate * d_error_d_w2
    return new_w1, new_w2
```

```python
train_step(input_value=1, actual_y=1, w1=0.5, w2=0.5, learning_rate=0.5)
```

## Checkpoint exercise

1. By hand, extend the derivation for a *second* input feature into the
   hidden neuron (i.e. `hidden_input = w1a * input_a + w1b * input_b`). Write
   out `d(error)/d(w1a)` and `d(error)/d(w1b)` — notice they only differ in
   their very last term (`input_a` vs `input_b`), same pattern as Lesson 3's
   per-feature gradients.
2. Call `train_step` in a loop, 100 times, feeding its output `w1, w2` back
   in as input each time, and print `forward_pass(...)`'s `prediction` every
   20 steps. Watch it climb toward `1.0` (the `actual_y` in this example).
3. In one sentence, explain to yourself why we computed
   `d_error_d_prediction` and `d_prediction_d_final_input` only *once* and
   reused them, instead of recomputing them inside the `w1` calculation —
   this efficiency is the entire practical reason backprop is used instead of
   computing every weight's gradient from scratch.

Lesson 11 assembles everything from Lessons 8–10 into one clean training loop
on a real toy dataset. Say "next lesson" when ready.
