# Recurrent networks

Text, speech, music, sensor readings and prices are **sequences**: their meaning depends on order, and they come in any length. "The dog bit the man" and "the man bit the dog" contain the same words. To predict the next word of a sentence, a model needs to remember what came earlier, possibly much earlier. The networks so far take a fixed-size input all at once; none of them has a memory.

A **recurrent neural network** (RNN) reads a sequence one step at a time and carries a **hidden state**, a vector that summarises everything read so far. At each step it combines the new input with the previous hidden state to make the next one. The same weights are used at every step, just as a convolution uses the same filter at every position. This lesson builds an RNN from scratch, trains it to write text one character at a time with **backpropagation through time**, and then shows the problem that limits it: gradients that vanish over long sequences.

## The recurrent step

At step `t`, with input xₜ and previous hidden state hₜ₋₁, an RNN computes:

\[
h_t = \tanh(x_t W_x + h_{t-1} W_h + b), \qquad y_t = h_t W_y + c
\]

W_x maps the input into the hidden space, W_h maps the old hidden state into the new one (this is the recurrence, the memory), and W_y produces an output from the hidden state, for instance scores for the next character. The initial state h₋₁ is usually all zeros. The same W_x, W_h, W_y, b and c are used at every step, so an RNN can process sequences of any length with a fixed number of parameters.

Drawn out step by step, an RNN applied to a sequence of length T looks like a T-layer network in which every layer shares the same weights. This is called **unrolling** it in time, and it is the key to training it.

## A character-level language model

A **language model** predicts what comes next. A character-level model reads text one character at a time and, at each step, outputs a probability for every possible next character, with a softmax over the hidden state's scores. Trained on some text, it learns spelling, words and short phrases; run on its own, feeding each sampled character back in as the next input, it **generates** text.

Characters are fed in as one-hot vectors. Multiplying a one-hot vector by W_x simply picks out one row of W_x, so the code uses `Wx[character]` directly. The training text here is tiny, so that the network can learn it in a few seconds:

```python type
import numpy as np

text = "the cat sat on the mat. the dog sat on the log. the cat saw the dog. the dog saw the cat. "
chars = sorted(set(text))
index = {c: i for i, c in enumerate(chars)}
data = np.array([index[c] for c in text])
V, H = len(chars), 48
print(f"{len(text)} characters of text, {V} distinct characters: {''.join(chars)!r}")

rng = np.random.default_rng(0)
params = {"Wx": rng.normal(0, 0.1, (V, H)), "Wh": rng.normal(0, 0.1, (H, H)), "b": np.zeros(H),
          "Wy": rng.normal(0, 0.1, (H, V)), "c": np.zeros(V)}

def generate(h, first, length, seed=1):
    r = np.random.default_rng(seed)
    out, x = [first], index[first]
    for _ in range(length):
        h = np.tanh(params["Wx"][x] + h @ params["Wh"] + params["b"])
        scores = h @ params["Wy"] + params["c"]
        probs = np.exp(scores - scores.max())
        probs /= probs.sum()
        x = r.choice(V, p=probs)
        out.append(chars[x])
    return "".join(out)

print("untrained:", repr(generate(np.zeros(H), "t", 60)))
```

```output
90 characters of text, 15 distinct characters: ' .acdeghlmnostw'
untrained: 'thwawdgsgl ohdodgagcdodhwwoldawh.momt hg mslcshhoasnoaoa.tstg'
```

`r.choice(V, p=probs)` picks a character at random according to the predicted probabilities, so generation is a little different each run. Untrained, with random weights, the network produces gibberish.

## Backpropagation through time

Training the unrolled network is ordinary backpropagation, applied to the unrolled graph, and called **backpropagation through time** (BPTT). Go forward through the sequence, storing every hidden state; then go backwards from the last step to the first. At each step the gradient arriving at hₜ has **two** sources: the loss at step `t` itself (through W_y), and the gradient passed back from step t + 1 (through W_h). Because the weights are shared, each weight's gradient is the **sum** of its gradients from every step.

For long texts, the sequence is cut into chunks of, say, 20 characters (**truncated** BPTT): gradients flow back at most 20 steps, but the hidden state is carried forward from one chunk into the next, so memory can still persist longer.

Two practical additions. Gradients through many steps can occasionally explode, so each one is **clipped** to the range −5 to 5. And the update uses **Adagrad**, a simple ancestor of RMSProp: each parameter's step is divided by the square root of the sum of all its past squared gradients.

```python type
import numpy as np

text = "the cat sat on the mat. the dog sat on the log. the cat saw the dog. the dog saw the cat. "
chars = sorted(set(text))
index = {c: i for i, c in enumerate(chars)}
data = np.array([index[c] for c in text])
V, H = len(chars), 48
rng = np.random.default_rng(0)
params = {"Wx": rng.normal(0, 0.1, (V, H)), "Wh": rng.normal(0, 0.1, (H, H)), "b": np.zeros(H),
          "Wy": rng.normal(0, 0.1, (H, V)), "c": np.zeros(V)}

def loss_and_gradients(inputs, targets, h_start):
    hs, probs, loss = {-1: h_start}, {}, 0.0
    for t in range(len(inputs)):
        hs[t] = np.tanh(params["Wx"][inputs[t]] + hs[t - 1] @ params["Wh"] + params["b"])
        scores = hs[t] @ params["Wy"] + params["c"]
        e = np.exp(scores - scores.max())
        probs[t] = e / e.sum()
        loss -= np.log(probs[t][targets[t]])
    grads = {name: np.zeros_like(value) for name, value in params.items()}
    dh_from_later = np.zeros(H)
    for t in reversed(range(len(inputs))):
        d_scores = probs[t].copy()
        d_scores[targets[t]] -= 1
        grads["Wy"] += np.outer(hs[t], d_scores)
        grads["c"] += d_scores
        dh = d_scores @ params["Wy"].T + dh_from_later
        d_pre = dh * (1 - hs[t] ** 2)
        grads["Wx"][inputs[t]] += d_pre
        grads["Wh"] += np.outer(hs[t - 1], d_pre)
        grads["b"] += d_pre
        dh_from_later = d_pre @ params["Wh"].T
    return loss / len(inputs), grads, hs[len(inputs) - 1]

def generate(h, first, length, seed=1):
    r = np.random.default_rng(seed)
    out, x = [first], index[first]
    for _ in range(length):
        h = np.tanh(params["Wx"][x] + h @ params["Wh"] + params["b"])
        scores = h @ params["Wy"] + params["c"]
        p = np.exp(scores - scores.max())
        x = r.choice(V, p=p / p.sum())
        out.append(chars[x])
    return "".join(out)

seq_length, learning_rate = 20, 0.1
memory = {name: np.zeros_like(value) for name, value in params.items()}
position, h = 0, np.zeros(H)
for step in range(1, 1001):
    if position + seq_length + 1 > len(data):
        position, h = 0, np.zeros(H)
    inputs = data[position:position + seq_length]
    targets = data[position + 1:position + seq_length + 1]
    loss, grads, h = loss_and_gradients(inputs, targets, h)
    position += seq_length
    for name in params:
        np.clip(grads[name], -5, 5, out=grads[name])
        memory[name] += grads[name] ** 2
        params[name] -= learning_rate * grads[name] / np.sqrt(memory[name] + 1e-8)
    if step in (1, 100, 500, 1000):
        print(f"step {step:>4}: loss {loss:.3f}  sample: {generate(np.zeros(H), 't', 60)!r}")
```

```output
step    1: loss 2.684  sample: 'thw wahogh nheleaacadmdawtol.awg.lsht ma.htaemhelammm.o  sota'
step  100: loss 0.147  sample: 'the log. the dog sat on the lot. the cat she the cnt. the dog'
step  500: loss 0.010  sample: 'the cat sat on the log. the cat saw the dog. the dog saw the '
step 1000: loss 0.003  sample: 'the cat sat on the log. the cat saw the dog. the dog saw the '
```

The targets are the inputs shifted by one character: at every position the network is asked for the next character. In the backward loop, `dh` adds the two sources of gradient for hₜ: from this step's prediction (`d_scores @ Wy.T`) and from the following step (`dh_from_later`). `d_pre` passes it through the tanh, then it is split three ways: into W_x (only the row for this step's character), into W_h (with the previous hidden state as the input) and into the bias, and finally `d_pre @ Wh.T` becomes the gradient for the previous step. The `+=` everywhere implements the sum over steps for shared weights.

Read the samples as training goes on. After 100 steps the network already produces words and the rhythm of the sentences, with mistakes: "the cat she the cnt". By step 500 the samples are made of correct sentences from the text. But look closely: "the cat sat on the log". In the training text it is the **dog** that sat on the log. To get this right, the network must connect "log" with the "dog" about fifteen characters earlier. Here that is impossible for a reason worth knowing: training cuts the text into 20-character chunks, and "dog" and "log" fall in different chunks, so truncated backpropagation never passes any gradient from the one to the other. The network has no way to learn that the animal matters, and indeed it ignores it, predicting "m" or "l" with roughly equal odds after either animal. By step 1,000 the printed loss is tiny (it is the loss on the last chunk only, not the whole text), yet the mix-up is still there. Truncation caps how far back a network can learn; the next section shows that even without truncation, plain RNNs struggle to reach far back.

## Vanishing gradients through time

Why is long-range memory hard? Backpropagating from step T to step 0 multiplies the gradient by one factor per step, each involving W_h and the tanh's derivative (at most 1). It is the same product of many factors that made deep sigmoid networks fail in the activation functions lesson, except that here the depth is the length of the sequence, and the same matrix W_h appears in every factor. If those factors tend to shrink a vector, the gradient from far-back steps vanishes exponentially; if they tend to stretch it, it explodes (which clipping limits, but cannot turn into useful learning).

Measure it directly on a small RNN: how much does a tiny change in the first hidden state still affect the hidden state `T` steps later? Before running, predict how the effect changes as T grows from 1 to 40.

```python type
import numpy as np

rng = np.random.default_rng(0)
H = 32
Wh = rng.normal(0, 0.9 / np.sqrt(H), (H, H))
inputs = rng.normal(0, 1, (40, H))

h = np.zeros(H)
jacobian = np.eye(H)
for t in range(1, 41):
    h = np.tanh(inputs[t - 1] + h @ Wh)
    jacobian = jacobian @ (Wh * (1 - h ** 2))
    if t in (1, 5, 10, 20, 40):
        print(f"after {t:>2} steps, sensitivity to the starting state: {np.linalg.norm(jacobian):.2e}")
```

```output
after  1 steps, sensitivity to the starting state: 3.23e+00
after  5 steps, sensitivity to the starting state: 3.61e-01
after 10 steps, sensitivity to the starting state: 2.16e-02
after 20 steps, sensitivity to the starting state: 4.78e-05
after 40 steps, sensitivity to the starting state: 1.38e-10
```

`jacobian` holds, for every pair of units, how much a change in the starting state's unit `i` changes the current state's unit `j`: each step multiplies it by W_h, with each column scaled by that step's tanh derivative 1 − h². (`np.linalg.norm` of a matrix is the square root of the sum of its squared entries, a measure of overall size.) The sensitivity roughly halves with every step: after 10 steps it is about 0.02, after 20 about 5 × 10⁻⁵, and after 40 around 10⁻¹⁰. To gradient descent, an event 40 steps back is all but invisible, so the network can hardly learn to use it.

(The 0.9 scale of W_h was chosen for this demonstration; other weights shrink or grow at other rates, but the exponential trend is the same.) This is why plain RNNs in practice rarely learn to use information more than a few dozen steps back. The next lesson's LSTM and GRU fix it by giving the network a separate memory path along which information, and gradients, can travel many steps almost unchanged.

::: challenge The forward pass over a sequence [easy]
Write `rnn_forward(xs, h0, Wx, Wh, b)` for a sequence of input **vectors** `xs` (shape `(T, input_size)`) and a starting hidden state `h0` (length `hidden_size`). Return the array of all hidden states, shape `(T, hidden_size)`, using hₜ = tanh(xₜ W_x + hₜ₋₁ W_h + b).

```python starter
import numpy as np

def rnn_forward(xs, h0, Wx, Wh, b):
    return np.zeros((len(xs), len(h0)))
```

```python solution
import numpy as np

def rnn_forward(xs, h0, Wx, Wh, b):
    states = []
    h = h0
    for x in xs:
        h = np.tanh(x @ Wx + h @ Wh + b)
        states.append(h)
    return np.array(states)
```

```python test
import numpy as _np
assert "rnn_forward" in dir(), "Keep the function's name as rnn_forward."
_r = _np.random.default_rng(0)
_xs, _h0 = _r.normal(size=(6, 3)), _r.normal(size=4)
_Wx, _Wh, _b = _r.normal(size=(3, 4)), _r.normal(size=(4, 4)), _r.normal(size=4)
_out = rnn_forward(_xs, _h0, _Wx, _Wh, _b)
assert _np.shape(_out) == (6, 4), f"With 6 steps and 4 hidden units the result should have shape (6, 4), not {_np.shape(_out)}."
_h = _h0
for _t in range(6):
    _h = _np.tanh(_xs[_t] @ _Wx + _h @ _Wh + _b)
    assert _np.allclose(_out[_t], _h), f"Hidden state {_t} is wrong. Each state must use the previous one: h_t = tanh(x_t Wx + h_(t−1) Wh + b), starting from h0."
_zero = rnn_forward(_xs, _h0, _Wx, _np.zeros((4, 4)), _b)
assert _np.allclose(_zero, _np.tanh(_xs @ _Wx + _b)), "With Wh = 0 there is no memory, and each state depends only on its own input."
"SUCCESS: One set of weights, applied step after step, carrying a memory forward."
```

Hint: Loop over the inputs, updating one hidden state variable and appending it to a list; `np.array(states)` stacks them.
:::

::: challenge Clip by total norm [medium]
The lesson clipped each gradient entry to [−5, 5], which can change a gradient's direction. The more common method, **clipping by global norm**, scales **all** the gradients down by the same factor whenever their combined size is too large, keeping the direction. Write `clip_by_norm(grads, max_norm)`: compute the total norm, the square root of the sum of squares of every entry of every array in the dictionary `grads`; if it exceeds `max_norm`, return a new dictionary with every array multiplied by `max_norm / total`; otherwise return the gradients unchanged. Also return the total norm, as a tuple `(clipped, total)`.

```python starter
import numpy as np

def clip_by_norm(grads, max_norm):
    return grads, 0.0

grads = {"W": np.array([[3.0, 0.0], [0.0, 4.0]]), "b": np.array([12.0])}
clipped, total = clip_by_norm(grads, 6.5)
print(total, clipped)
```

```python solution
import numpy as np

def clip_by_norm(grads, max_norm):
    total = float(np.sqrt(sum(np.sum(g ** 2) for g in grads.values())))
    if total > max_norm:
        scale = max_norm / total
        return {name: g * scale for name, g in grads.items()}, total
    return grads, total

grads = {"W": np.array([[3.0, 0.0], [0.0, 4.0]]), "b": np.array([12.0])}
clipped, total = clip_by_norm(grads, 6.5)
print(total, clipped)
```

```python test
import numpy as _np
assert "clip_by_norm" in dir(), "Keep the function's name as clip_by_norm."
_g = {"W": _np.array([[3.0, 0.0], [0.0, 4.0]]), "b": _np.array([12.0])}
_c, _t = clip_by_norm(_g, 6.5)
assert _np.isclose(_t, 13.0), f"The total norm is √(9 + 16 + 144) = 13, but got {_t}. Combine every entry of every array."
assert _np.allclose(_c["W"], [[1.5, 0.0], [0.0, 2.0]]) and _np.allclose(_c["b"], [6.0]), "With total 13 and max 6.5, every gradient should be halved."
assert _np.isclose(_np.sqrt(sum(_np.sum(v ** 2) for v in _c.values())), 6.5), "After clipping, the total norm should equal max_norm."
assert _np.array_equal(_g["b"], [12.0]), "Don't change the original arrays: return new ones."
_small, _ts = clip_by_norm(_g, 20.0)
assert _np.isclose(_ts, 13.0) and all(_np.array_equal(_small[k], _g[k]) for k in _g), "When the total is below max_norm, return the gradients unchanged."
_ratio = _c["W"][1, 1] / _c["W"][0, 0]
assert _np.isclose(_ratio, 4 / 3), "Clipping by norm keeps the direction: the gradients keep their proportions to each other."
"SUCCESS: Exploding gradients tamed without changing which way the step points; this is what libraries' clip_grad_norm does."
```

Hint: The total is `np.sqrt` of the sum, over the dictionary's values, of `np.sum(g ** 2)`. Build the clipped dictionary with a comprehension.
:::

::: challenge Backpropagation through time by hand [medium]
Take the smallest RNN there is: one hidden unit, hₜ = tanh(w·hₜ₋₁ + u·xₜ), starting from h₋₁ = 0, with the loss simply the last state, L = h_T (the final hₜ). Write `bptt(xs, w, u)` returning `(dL_dw, dL_du, dL_dx0)` by backpropagation through time: run forward storing every hₜ, then go backwards with a running gradient `dh` (starting at 1 for the last state). At each step, `d_pre = dh * (1 - h_t ** 2)`; add `d_pre * h_(t−1)` to the gradient for `w` and `d_pre * x_t` to the gradient for `u`; then pass `dh = d_pre * w` back to the previous step. The gradient for the first input, x₀, is the `d_pre` at the first step times `u`.

Then use `bptt` to measure how much the **first** input matters: store, in `influence`, a dictionary mapping each length T in `[5, 20, 50]` to dL/dx₀ for the sequence `np.ones(T)`, with `w = 0.5` and `u = 0.8`.

```python starter
import numpy as np

def bptt(xs, w, u):
    return 0.0, 0.0, 0.0

influence = {}
print(influence)
```

```python solution
import numpy as np

def bptt(xs, w, u):
    hs = [0.0]
    for x in xs:
        hs.append(np.tanh(w * hs[-1] + u * x))
    dw, du, dh = 0.0, 0.0, 1.0
    for t in reversed(range(len(xs))):
        d_pre = dh * (1 - hs[t + 1] ** 2)
        dw += d_pre * hs[t]
        du += d_pre * xs[t]
        dh = d_pre * w
    return dw, du, d_pre * u

influence = {T: bptt(np.ones(T), 0.5, 0.8)[2] for T in [5, 20, 50]}
print(bptt(np.array([1.0, -0.5, 2.0]), 0.8, 0.3), influence)
```

```python test
import numpy as _np
assert "bptt" in dir(), "Keep the function's name as bptt."
def _L(xs, w, u):
    h = 0.0
    for x in xs:
        h = _np.tanh(w * h + u * x)
    return h
for _xs, _w, _u in [(_np.array([1.0, -0.5, 2.0]), 0.8, 0.3), (_np.array([0.3, 0.9, -1.2, 0.4, 0.1]), -1.1, 0.7)]:
    _out = bptt(_xs, _w, _u)
    assert len(_out) == 3, "bptt should return three gradients: (dL_dw, dL_du, dL_dx0)."
    _dw, _du, _dx = _out
    _nw = (_L(_xs, _w + 1e-6, _u) - _L(_xs, _w - 1e-6, _u)) / 2e-6
    _nu = (_L(_xs, _w, _u + 1e-6) - _L(_xs, _w, _u - 1e-6)) / 2e-6
    _x1 = _xs.copy(); _x1[0] += 1e-6
    _x2 = _xs.copy(); _x2[0] -= 1e-6
    _nx = (_L(_x1, _w, _u) - _L(_x2, _w, _u)) / 2e-6
    assert _np.isclose(_dw, _nw, atol=1e-7) and _np.isclose(_du, _nu, atol=1e-7), f"bptt gives dw, du = ({_dw:.6f}, {_du:.6f}) but the numerical gradients are ({_nw:.6f}, {_nu:.6f}). Sum the contributions from every step, and pass dh = d_pre * w back."
    assert _np.isclose(_dx, _nx, atol=1e-7), f"dL/dx0 should be about {_nx:.6f}, but bptt gives {_dx:.6f}. It is the first step's d_pre times u."
def _exact(T, w, u):
    hs = [0.0]
    for _ in range(T):
        hs.append(_np.tanh(w * hs[-1] + u))
    g = u
    for t in range(1, T + 1):
        g *= 1 - hs[t] ** 2
    return g * w ** (T - 1)
assert sorted(influence) == [5, 20, 50], "influence should have keys 5, 20 and 50."
for _T in [5, 20, 50]:
    assert _np.isclose(influence[_T], _exact(_T, 0.5, 0.8), rtol=1e-6, atol=0), f"influence[{_T}] should be dL/dx0 from bptt for np.ones({_T}) with w = 0.5 and u = 0.8."
f"SUCCESS: The first input's influence on the last state: {influence[5]:.1e} after 5 steps, {influence[20]:.1e} after 20, {influence[50]:.1e} after 50. Each step multiplies it by w times a tanh slope, so it vanishes exponentially."
```

Hint: Store the states in a list starting with 0.0, so `hs[t]` is the state before step `t` and `hs[t + 1]` the state after it. In the backward loop, use `hs[t + 1]` for the tanh derivative and `hs[t]` as the input to `w`. After the loop, `d_pre` holds the first step's value, so return `d_pre * u` as the third result.
:::

## What you learned

- An RNN reads a sequence step by step, updating a hidden state hₜ = tanh(xₜW_x + hₜ₋₁W_h + b) with the same weights at every step, so it handles any length.
- A character-level language model predicts each next character with a softmax over the hidden state; sampling from it, feeding each choice back in, generates text.
- Backpropagation through time unrolls the network over the sequence; each step's hidden-state gradient combines its own loss and the next step's gradient, and shared weights sum their gradients over steps. Truncated BPTT limits how far back gradients go.
- Gradients are clipped (by value, or better by global norm) to stop explosions.
- The gradient reaching early steps is a product of one factor per step, so it vanishes or explodes exponentially; a plain RNN's sensitivity to its start fell to about 10⁻¹⁰ after 40 steps. In practice plain RNNs remember only about 10 steps.

The next lesson adds gates: small learned switches that let an LSTM or GRU decide what to keep, what to forget and what to output, and give gradients a protected path through time.
