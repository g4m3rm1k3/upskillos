# Lesson 14 — Same Building Block, Different Wiring: Activation Functions

## What you'll learn
- Why `sigmoid` — perfectly fine in Lesson 13's 2-layer network — becomes a genuine liability once a network gets deep, demonstrated with real measured numbers, not just asserted as a rule.
- ReLU, the modern default for hidden layers, and precisely why its derivative avoids the exact shrinkage that sigmoid's causes.
- ReLU's own distinct failure mode — a neuron that gets permanently stuck outputting zero, and can never recover through gradient descent alone, no matter how much more training happens.

## What you'll build
A diagnostic script that measures the actual gradient magnitude at every layer of a deep, 6-layer-transition network — turning "vanishing gradients" into a number you watch shrink with your own eyes, comparing sigmoid directly against ReLU.

---

## The question

Lesson 13's 2-layer sigmoid network trained without any trouble. What happens if, instead of one hidden layer, you stack five hidden layers, all using sigmoid, and try to backpropagate an error all the way from the output back to the very first layer?

---

## 1. Predict

`sigmoid`'s derivative, `a * (1 - a)`, reaches its *largest possible value* — `0.25` — only when `a = 0.5`, and is smaller everywhere else. Backpropagation, at every single layer boundary, **multiplies** the propagating error signal by a term like this. If you multiply a number by something no larger than `0.25`, six separate times in a row (once per layer boundary in a 6-transition network), what's the largest that final product could possibly be, relative to where it started — even in the best case, before accounting for real activations rarely sitting exactly at `0.5`?

---

## 2. Try it: measuring gradient size, layer by layer

```python
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def sigmoid_deriv(a):
    return a * (1 - a)

def forward_pass(x, weights, biases, hidden_activation):
    a = x
    activations = [a]
    for i, (w, b) in enumerate(zip(weights, biases)):
        z = a @ w + b
        is_output = (i == len(weights) - 1)
        a = sigmoid(z) if is_output else hidden_activation(z)
        activations.append(a)
    return activations

def backward_pass(activations, weights, y, hidden_activation_deriv):
    grad_norms = []
    delta = activations[-1] - y
    for i in reversed(range(len(weights))):
        grad_w = np.outer(activations[i], delta)
        grad_norms.append((i, np.linalg.norm(grad_w)))
        if i > 0:
            deriv = hidden_activation_deriv(activations[i])
            delta = (weights[i] @ delta) * deriv
    grad_norms.reverse()
    return grad_norms

rng = np.random.RandomState(3)
layer_sizes = [3, 4, 4, 4, 4, 4, 1]
weights = [rng.uniform(-0.5, 0.5, size=(layer_sizes[i], layer_sizes[i+1])) for i in range(len(layer_sizes) - 1)]
biases = [np.zeros(layer_sizes[i+1]) for i in range(len(layer_sizes) - 1)]

x = np.array([0.5, -0.3, 0.8])
y = np.array([1.0])

activations = forward_pass(x, weights, biases, sigmoid)
grad_norms = backward_pass(activations, weights, y, sigmoid_deriv)
for layer_index, norm in grad_norms:
    print(f"layer {layer_index}: gradient magnitude = {norm:.8f}")
```

### What this code does

- **`layer_sizes = [3, 4, 4, 4, 4, 4, 1]`** — 3 input features, 5 hidden layers of 4 neurons each, 1 output — meaning **6 weight matrices**, one per boundary between consecutive layers, deliberately deep enough for a shrinking pattern to become visible.

- **`weights = [rng.uniform(...) for i in range(len(layer_sizes) - 1)]`** — a list comprehension building one weight matrix per layer transition, each shaped `(layer_sizes[i], layer_sizes[i+1])` — this generalizes Lesson 13's two separate, hardcoded `W1`, `W2` variables into a single list that works for any number of layers, not just two.

- **`forward_pass`** — loops through every weight/bias pair in order; **`is_output = (i == len(weights) - 1)`** ensures only the *last* transition uses `sigmoid` unconditionally (needed for a 0–1 prediction), while every other layer uses whatever `hidden_activation` was passed in — this is what lets the same function test both sigmoid-everywhere and ReLU-in-hidden-layers without rewriting the loop.

- **`np.outer(activations[i], delta)`** — for a **single** input example (not a batch, unlike Lesson 13), the **outer product** of two 1D vectors produces a 2D matrix: every element of `activations[i]` multiplied by every element of `delta`, arranged into a grid matching that layer's weight matrix shape exactly. This is the single-example equivalent of Lesson 13's `a1.T @ delta2` — batched matrix multiplication and single-example outer product compute the same underlying idea, just shaped differently depending on whether you're processing one example or many at once.

- **`np.linalg.norm(grad_w)`** — a single scalar summarizing the overall *magnitude* of an entire gradient matrix (technically the square root of the sum of its squared entries) — useful here purely to compare "how big is the gradient at this layer" across layers, without needing to inspect every individual entry.

- **`delta = (weights[i] @ delta) * deriv`** — the same backward-propagation idea from Lesson 13's `delta2 @ W2.T`, adapted to single-example vectors: `weights[i] @ delta` is now an ordinary matrix-vector product (not `.T @` on a batch), propagating the error one layer further back, then scaled by that layer's own local sensitivity, `deriv`.

### What happens

The printed gradient magnitudes will be **dramatically larger** near `layer 5` (closest to the output, where the error signal starts) than near `layer 0` (the very first layer, furthest from where the error was measured) — often by two or more orders of magnitude, even for this small, only-moderately-deep network. This is **vanishing gradients**, measured directly: the error signal genuinely shrinks as it's propagated backward through each additional sigmoid layer, and the earliest layers receive a gradient too small to learn from at any reasonable pace.

---

## 3. Why: multiplying small numbers, many times, in a row

**The mechanism** is exactly what Section 1 predicted, made concrete: at every layer boundary, backpropagation multiplies the propagating error by that layer's activation derivative. For `sigmoid`, that derivative is *never larger than* `0.25`, and is often much smaller (a neuron whose activation is near `0` or `1` — "saturated" — has a derivative near `0` specifically). Multiplying several such factors together, layer after layer, compounds the shrinkage multiplicatively, the same way repeatedly multiplying by `0.25` shrinks a number toward zero far faster than subtracting a fixed amount would.

**ReLU** sidesteps this specific problem:

```python
def relu(z):
    return np.maximum(0, z)

def relu_deriv(a):
    return (a > 0).astype(float)

activations_relu = forward_pass(x, weights, biases, relu)
grad_norms_relu = backward_pass(activations_relu, weights, y, relu_deriv)
for layer_index, norm in grad_norms_relu:
    print(f"layer {layer_index}: gradient magnitude = {norm:.8f}")
```

### Code mechanics

- **`np.maximum(0, z)`** — elementwise: any positive input passes through completely unchanged; any zero or negative input becomes exactly `0`. Unlike `sigmoid`, this function has **no upper bound** and no smooth squashing — it's a simple, hard cutoff at zero.

- **`(a > 0).astype(float)`** — ReLU's derivative: exactly `1` wherever the neuron's output was positive (meaning the raw input `z` was positive too, since ReLU passes positive values through unchanged), and exactly `0` wherever the output was `0`. **This is the crucial difference from sigmoid: for any "active" neuron (positive output), the derivative is exactly `1`, not some fraction less than `1`.** Multiplying an error signal by `1`, many times in a row, doesn't shrink it at all.

### What happens

Comparing the two printed sets of gradient magnitudes side by side: the sigmoid version shows a steep decline from `layer 5` down to `layer 0`; the ReLU version shows gradient magnitudes that stay much more comparable across all six layers — assuming, as the trap in Section 6 explores, that the ReLU neurons involved are actually "alive" (outputting something positive) in the first place.

### Mental model

```
SIGMOID:  each layer's backward pass multiplies the error by AT MOST 0.25
              → after several layers, the signal has shrunk toward zero,
                exponentially in the number of layers
                
RELU:     each layer's backward pass multiplies the error by EXACTLY 1
              (for active neurons) or EXACTLY 0 (for inactive ones)
              → active neurons pass the error signal through completely
                undiminished, no matter how many layers deep
```

---

## 4. Change one thing

The entire difference between the two experiments above is a single function passed as an argument:

```diff
- activations = forward_pass(x, weights, biases, sigmoid)
- grad_norms = backward_pass(activations, weights, y, sigmoid_deriv)
+ activations = forward_pass(x, weights, biases, relu)
+ grad_norms = backward_pass(activations, weights, y, relu_deriv)
```

**What changed:** which function computes each hidden layer's activation, and which function computes that activation's derivative during the backward pass.

**What did not change:** `forward_pass` and `backward_pass` themselves — the loop structure, the outer-product gradient formula, the backward-propagation line — are identical in both runs; neither function contains the word "sigmoid" or "relu" anywhere in its own body, only in the argument passed to it.

**Why this matters practically:** switching an entire network's hidden-layer behavior is, mechanically, a one-line change — the actual training loop, gradient computation, and update rule don't need to know or care which activation function is in use. This is exactly why real deep learning frameworks treat activation functions as swappable, composable building blocks rather than something baked into the training code itself.

---

## 5. Put it in the project

```python
def train(x, y, layer_sizes, hidden_activation, hidden_activation_deriv, epochs=2000, learning_rate=0.5, seed=3):
    rng = np.random.RandomState(seed)
    weights = [rng.uniform(-0.5, 0.5, size=(layer_sizes[i], layer_sizes[i+1])) for i in range(len(layer_sizes) - 1)]
    biases = [np.zeros(layer_sizes[i+1]) for i in range(len(layer_sizes) - 1)]

    for epoch in range(epochs):
        activations = forward_pass(x, weights, biases, hidden_activation)
        delta = activations[-1] - y
        for i in reversed(range(len(weights))):
            grad_w = np.outer(activations[i], delta)
            grad_b = delta
            if i > 0:
                deriv = hidden_activation_deriv(activations[i])
                delta = (weights[i] @ delta) * deriv
            weights[i] -= learning_rate * grad_w
            biases[i] -= learning_rate * grad_b
        if epoch % 500 == 0:
            loss = np.mean((activations[-1] - y) ** 2)
            print(f"epoch {epoch}: loss={loss:.6f}")
    return weights, biases

print("training with sigmoid hidden layers:")
train(x, y, layer_sizes, sigmoid, sigmoid_deriv)
print("\ntraining with relu hidden layers:")
train(x, y, layer_sizes, relu, relu_deriv)
```

### Code walkthrough

This reuses the exact `forward_pass`/`backward_pass` structure, now wrapped in a real training loop across many epochs (as in every earlier training-loop lesson), applying the update immediately per layer within the same backward loop rather than collecting all gradients first — a minor structural variation, functionally equivalent to computing every gradient first and updating afterward.

### Why this design: choosing activations per layer

**Problem:** which activation function goes where in a network.

**Available choices:** sigmoid everywhere (Lesson 13's approach), ReLU in every hidden layer with sigmoid only at the output (this lesson's approach), or other alternatives like `tanh`.

**Selected choice:** ReLU for hidden layers, sigmoid reserved for the output layer.

**Reason:** ReLU's non-shrinking gradient for active neurons makes deep networks actually trainable at reasonable depths; sigmoid's *output range* (a smooth `0` to `1`) is still exactly what's needed at the very last layer, to produce something interpretable as a probability, matching Lesson 2's original reason for choosing it there.

**Cost:** Section 6 shows ReLU isn't free of problems either — just a different one than sigmoid's.

**Revisit condition:** for extremely deep networks (dozens or hundreds of layers), even ReLU's gradient flow needs further help — techniques like residual connections and normalization layers exist specifically to keep gradients healthy at depths well beyond what activation function choice alone can fix; that's beyond this lesson's scope.

---

## 6. The trap

**Normal rule:** an "active" ReLU neuron (currently outputting something positive) passes gradient through with a derivative of exactly `1`, avoiding sigmoid's shrinkage entirely.

**Apparently harmless initialization choice** — biases start at `0` in every example so far in this lesson; what if, for one specific hidden layer, the bias happens to start (or drift, during training) strongly negative?

```python
bad_bias_layer = 1   # pick one hidden layer to sabotage
weights_bad = [w.copy() for w in weights]
biases_bad = [b.copy() for b in biases]
biases_bad[bad_bias_layer] = np.full(layer_sizes[bad_bias_layer + 1], -10.0)

activations_bad = forward_pass(x, weights_bad, biases_bad, relu)
print(f"layer {bad_bias_layer + 1} activations: {activations_bad[bad_bias_layer + 1]}")

grad_norms_bad = backward_pass(activations_bad, weights_bad, y, relu_deriv)
for layer_index, norm in grad_norms_bad:
    print(f"layer {layer_index}: gradient magnitude = {norm:.8f}")
```

**Surprising result:** the printed activations for the sabotaged layer are all exactly `0.0` — every neuron in that layer is completely inactive for this input. Following through the gradient magnitudes, `layer bad_bias_layer` (and every layer *before* it, since the error can no longer flow backward through a dead layer) show a gradient magnitude of **exactly `0.0`**, not just small — meaning `weights_bad[bad_bias_layer]` and everything before it would receive **zero update**, no matter how many further training steps ran, or what the input happened to be — as long as that layer's raw input stays negative.

**Exact reason:** `relu_deriv(a) = (a > 0).astype(float)` returns exactly `0` for any neuron whose activation is `0`. With `delta = (weights[i] @ delta) * deriv`, multiplying by an exact `0` derivative zeroes out that neuron's contribution to the backward pass completely — and because that gradient is exactly `0`, the weights feeding *into* that dead neuron (and any earlier layer, since the error can't propagate through a zeroed-out layer at all) never change. If a large enough negative bias, or an unlucky combination of weights, pushes a ReLU neuron's input negative for essentially all realistic inputs, the neuron can become **permanently dead** — this is precisely the "dying ReLU" problem, and it's qualitatively different from sigmoid's vanishing gradient: sigmoid shrinks *gradually*, across many layers, cumulatively; a dead ReLU neuron's gradient drops to *exactly* zero *abruptly*, for that one neuron alone, and stays there indefinitely.

**Project consequence:** unlike vanishing gradients (a property of overall network depth), dying ReLU can strike individual neurons at any depth, often due to nothing more exotic than an unlucky weight initialization or an overly large learning rate pushing a neuron's bias sharply negative during training. It's a real, commonly-encountered issue in practice — worth checking for directly (are a suspicious number of a layer's activations exactly `0.0` across many different inputs?) rather than assuming ReLU is a strictly safer choice than sigmoid in every respect.

---

## 7. Under the hood

*(Optional — not required to choose or use activation functions correctly.)*

Variants like **Leaky ReLU** (which allows a small nonzero slope, like `0.01`, for negative inputs instead of a hard `0`) and **ELU** exist specifically to patch the dying ReLU problem, by ensuring the derivative is never *exactly* zero even for negative inputs — trading away some of plain ReLU's simplicity for more resilience against permanently dead neurons. `tanh` (a rescaled sigmoid ranging from `-1` to `1` instead of `0` to `1`) was a common hidden-layer choice before ReLU became the default; being **zero-centered** (unlike sigmoid, whose output is always positive) gives it a real, specific advantage for gradient descent's convergence behavior — but `tanh` still saturates and still suffers from the same fundamental vanishing-gradient shrinkage as sigmoid, just with a larger maximum derivative (`1.0` instead of `0.25`), so it delays the vanishing-gradient problem rather than eliminating it the way ReLU's unbounded, non-saturating positive region does.

---

## 8. Exercises

- **Predict:** for a 3-layer-transition network (half as deep as this lesson's 6-transition example), would you expect sigmoid's vanishing-gradient effect (comparing layer-0 gradient magnitude to the last layer's) to be roughly half as severe, or much more than half as severe, given that the shrinkage compounds multiplicatively rather than additively?
- **Modify:** add a `tanh` and `tanh_deriv` pair (`np.tanh(z)` and `1 - a**2`) to the diagnostic script, and compare its layer-by-layer gradient magnitudes against both sigmoid's and ReLU's for the same network and input.
- **Break:** in the dying ReLU trap, change `bad_bias_layer`'s bias from `-10.0` to `-0.1` instead. Is the layer still fully dead (all activations exactly `0`), partially dead, or fully alive? Explain what's different about a mildly negative bias versus a strongly negative one.
- **Repair:** implement Leaky ReLU (`np.where(z > 0, z, 0.01 * z)`) and its derivative (`np.where(a > 0, 1.0, 0.01)`), and rerun the exact dying-ReLU trap scenario from Section 6 with it instead of plain ReLU. Confirm the gradient at the sabotaged layer is now small but nonzero, rather than exactly zero — and explain why that small nonzero value is enough to let the dead-seeming neuron eventually recover, given enough training steps.

---

## What to remember

- Backpropagation multiplies an activation function's derivative at every layer boundary — sigmoid's derivative never exceeds `0.25`, so stacking many sigmoid layers causes the gradient reaching early layers to shrink multiplicatively, often to a genuinely unusable size.
- ReLU's derivative is exactly `1` for any active (positive-output) neuron, letting gradient pass through many layers without the sigmoid-style shrinkage — which is the specific, measurable reason it's the modern default for hidden layers.
- ReLU trades vanishing gradients for a different, more abrupt failure: a neuron whose input is negative for essentially every training example gets an exact zero gradient and can become permanently unable to update, regardless of how much further training happens.

## Next lesson

Every training loop in this series, from Lesson 1 through this one, has used the exact same update rule: subtract `learning_rate` times the gradient, nothing more. That plain rule works, but it's often needlessly slow, or unstable in ways a smarter update could avoid. The next lesson covers the optimizers real deep learning training actually uses — momentum and Adam — and exactly what problem each one is solving that plain gradient descent leaves on the table.
