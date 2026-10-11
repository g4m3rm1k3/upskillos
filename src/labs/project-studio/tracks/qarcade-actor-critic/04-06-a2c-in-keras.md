---
title: 4.6 — A2C in Keras
runtime: python
run: keras_a2c.py
---

### The story so far

Lesson 4.4's `train_a2c(..., net=None)` (`a2c.py`) trains any network that, given observations, returns two things: the actor's two scores per observation, and the critic's one value per observation. Left as `None`, it makes lesson 4.3's PyTorch `ActorCritic`. Lesson 3.5 built networks in **Keras**, which here runs on the PyTorch backend, and showed what `fit` hides: forward, loss, backward, step.

### What this lesson asks

Your course or your reading may use Keras for A2C, so this lesson builds the same agent with a Keras network. Two things are new:

1. **A network with two outputs.** `keras.Sequential` is one chain, one output. An actor-critic needs two heads on one body, which takes Keras's **functional API**.
2. **A training step `fit` can't do.** `fit` needs a target for every output, but A2C's loss isn't "output versus target": the policy part multiplies log-probabilities by advantages. So A2C code in Keras always writes its own training step: run the model, compute the loss, get the slopes, apply them with an optimiser.

### How the pieces fit

```text
make_keras_actor_critic()      Keras functional model: obs -> body -> (2 scores, 1 value)
KerasActorCritic(model)        an adapter: makes the Keras model answer the way train_a2c expects
train_a2c(net=adapter)         lesson 4.4's loop, unchanged: on the PyTorch backend a Keras model IS a PyTorch module,
                               so PyTorch's Adam can train its knobs
keras_update(model, opt, ...)  the same update written the Keras way: Keras's own optimiser applies the slopes
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_keras_a2c.py** above.

```python file=tests/test_keras_a2c.py provided
# Tests for keras_a2c.py (lesson 4.6).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_keras_a2c.py
import numpy as np
import pytest
import torch

pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning:keras")


def test_model_has_a_body_and_two_heads():
    from keras_a2c import make_keras_actor_critic
    logits, value = make_keras_actor_critic()(torch.zeros(5, 4))
    assert tuple(logits.shape) == (5, 2) and tuple(value.shape) == (5, 1)


def test_model_is_a_pytorch_module_on_this_backend():
    from keras_a2c import make_keras_actor_critic
    model = make_keras_actor_critic()
    assert isinstance(model, torch.nn.Module) and len(list(model.parameters())) == 6


def test_adapter_speaks_the_actor_critic_language():
    from keras_a2c import KerasActorCritic, make_keras_actor_critic
    net = KerasActorCritic(make_keras_actor_critic())
    logits, values = net(torch.zeros(3, 4))
    assert tuple(logits.shape) == (3, 2) and tuple(values.shape) == (3,)
    logits, value = net(torch.zeros(4))
    assert tuple(logits.shape) == (2,) and value.dim() == 0, "one observation in, one answer out"


def test_adapter_lets_train_a2c_train_a_keras_network():
    from a2c import train_a2c
    from keras_a2c import KerasActorCritic, make_keras_actor_critic
    net = KerasActorCritic(make_keras_actor_critic())
    before = net.model.get_weights()[0].copy()
    train_a2c(net=net, total_steps=400, report_every=400, quiet=True)
    assert not np.array_equal(before, net.model.get_weights()[0])


def test_update_with_the_keras_optimiser_lowers_the_loss():
    from keras_a2c import keras_update, make_keras_actor_critic
    import keras
    keras.utils.set_random_seed(0)
    model = make_keras_actor_critic()
    optimiser = keras.optimizers.Adam(learning_rate=0.01)
    obs = torch.randn(16, 4)
    actions = torch.randint(0, 2, (16,))
    returns = torch.full((16,), 5.0)
    first = keras_update(model, optimiser, obs, actions, returns)
    for _ in range(30):
        last = keras_update(model, optimiser, obs, actions, returns)
    assert type(first) is float and last < first
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `model` | the Keras model gives 2 scores and 1 value per observation, and is a PyTorch module with 6 knob tensors | one head missing, or a backend other than PyTorch |
| `adapter` | the adapter returns the shapes `train_a2c` expects, for one observation and for many, and `train_a2c` really changes the Keras model's weights | a value of shape (n, 1) where (n,) is expected, which silently broadcasts into an (n, n) loss |
| `update` | an update with Keras's optimiser lowers the loss on a fixed batch | slopes computed but never applied |

The last `adapter` test's danger deserves a closer look. If `values` had shape (40, 1) and `returns` shape (40,), then `returns - values` wouldn't fail: NumPy and PyTorch **broadcast** it into a 40 × 40 table of every return minus every value, and the loss would quietly train on nonsense.

```check
file tests/test_keras_a2c.py -- Click "Create provided tests/test_keras_a2c.py" above.
```

## The network in Keras

Create `keras_a2c.py`:

```python file=keras_a2c.py
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import torch

from a2c import play_greedy, train_a2c
from actor_critic import a2c_loss


def make_keras_actor_critic(hidden=64):
    inputs = keras.Input((4,))
    body = keras.layers.Dense(hidden, activation="tanh")(inputs)
    logits = keras.layers.Dense(2)(body)
    value = keras.layers.Dense(1)(body)
    return keras.Model(inputs, [logits, value])
```

**The functional API.** Instead of listing layers in a `Sequential`, you call each layer **on** the output of the one before, like a function, and then tell `keras.Model` where the inputs and outputs are:

```text
inputs = keras.Input((4,))                            a placeholder: "4 numbers will come in here"
body   = Dense(64, activation="tanh")(inputs)         the body, applied to the inputs
logits = Dense(2)(body)                               the actor head, applied to the body
value  = Dense(1)(body)                               the critic head, applied to the SAME body
keras.Model(inputs, [logits, value])                  a model with one input and two outputs
```

Because both heads are called on the same `body`, they share it, exactly like lesson 4.3's `ActorCritic`. Calling the model returns a list of two tensors.

**`make_keras_actor_critic` against lesson 4.3's `ActorCritic`:**

| | PyTorch `ActorCritic` | Keras functional model |
|---|---|---|
| body | `nn.Sequential(nn.Linear(4, 64), nn.Tanh())` | `Dense(64, activation="tanh")` |
| actor head | `nn.Linear(64, 2)` | `Dense(2)` |
| critic head | `nn.Linear(64, 1)`, then `.squeeze(-1)` | `Dense(1)` (no squeeze: the adapter does it) |
| weights stored as | (outputs, inputs) | (inputs, outputs) (lesson 3.5) |

```check
run ".venv/Scripts/python -m pytest -q tests/test_keras_a2c.py -k model" label="the Keras functional model has a shared body and two heads, and is a PyTorch module" -- inputs = keras.Input((4,)); body = Dense(hidden, activation="tanh")(inputs); logits = Dense(2)(body); value = Dense(1)(body); return keras.Model(inputs, [logits, value]).
```

## An adapter

Add the adapter and a main block:

```python file=keras_a2c.py
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import torch

from a2c import play_greedy, train_a2c
from actor_critic import a2c_loss


def make_keras_actor_critic(hidden=64):
    inputs = keras.Input((4,))
    body = keras.layers.Dense(hidden, activation="tanh")(inputs)
    logits = keras.layers.Dense(2)(body)
    value = keras.layers.Dense(1)(body)
    return keras.Model(inputs, [logits, value])


class KerasActorCritic:
    def __init__(self, model):
        self.model = model

    def __call__(self, obs):
        leading = obs.shape[:-1]
        logits, value = self.model(obs.reshape(-1, 4))
        return logits.reshape(*leading, 2), value.reshape(leading)

    def parameters(self):
        return self.model.parameters()


if __name__ == "__main__":
    torch.set_num_threads(1)
    keras.utils.set_random_seed(0)
    net = KerasActorCritic(make_keras_actor_critic())
    _, curve = train_a2c(net=net)
    print("greedy, 20 new games:", play_greedy(net).mean())
```

`train_a2c` calls its network three ways: on one observation (shape (4,), in `play_greedy`), on 8 (shape (8, 4), while collecting moves), and on a whole rollout (shape (5, 8, 4), for the update). PyTorch's `ActorCritic` handles all three, because its layers work on the last dimension and keep the rest. A Keras model insists on exactly (batch, 4). So the adapter:

1. **Flattens everything but the last dimension:** `obs.reshape(-1, 4)`. `-1` means "however many it takes", so the total number of values stays the same: (5, 8, 4) becomes (40, 4), and (4,) becomes (1, 4).
2. **Runs the model**, getting (40, 2) scores and (40, 1) values.
3. **Puts the shape back:** `leading = obs.shape[:-1]` was (5, 8), so the scores become (5, 8, 2) and the values (5, 8). For one observation, `leading` is `()`, an empty shape, so the value becomes a single number.

- **`parameters()`** passes through to the Keras model's own. On the PyTorch backend a Keras model is a `torch.nn.Module` (the `model` tests check it), so `model.parameters()` yields its weights as PyTorch tensors, and `train_a2c`'s `torch.optim.Adam(net.parameters(), ...)` and `clip_grad_norm_` work on them unchanged.
- **This is an adapter**, the same idea as lesson 2.4's wrapper: an object that makes one thing look like what another expects, without changing either.

Predict, then run it with `.venv\Scripts\python keras_a2c.py`:

```predict
question: The same A2C, with the same settings, but a network built in Keras. What will its greedy score be over 20 new games after 200,000 steps?
answer: 500
tolerance: 0
explain: 500, the maximum. The network has the same shape as lesson 4.3's (64 tanh units, two heads), and Keras starts its knobs at different random values, so its learning curve differs, but it gets there: at 500 from 100,000 steps on. It took 72 seconds against about 25 for the PyTorch network: every call goes through Keras's own layer of checking and conversion first, and A2C makes tens of thousands of small calls.
verify: script keras_a2c_score.py
```

```text
  20000 steps: greedy score  24.4  (5 s)
  40000 steps: greedy score 233.0  (11 s)
  60000 steps: greedy score 447.4  (19 s)
  80000 steps: greedy score 117.0  (25 s)
 100000 steps: greedy score 500.0  (33 s)
 120000 steps: greedy score 500.0  (40 s)
 140000 steps: greedy score 500.0  (48 s)
 160000 steps: greedy score 500.0  (56 s)
 180000 steps: greedy score 500.0  (64 s)
 200000 steps: greedy score 500.0  (72 s)
greedy, 20 new games: 500.0
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_keras_a2c.py -k adapter" label="the adapter gives train_a2c the shapes it expects, and train_a2c trains the Keras model" -- leading = obs.shape[:-1]; logits, value = self.model(obs.reshape(-1, 4)); return logits.reshape(*leading, 2), value.reshape(leading).
```

## Your turn: an update with Keras's optimiser

**Build, on your own:** `keras_update(model, optimiser, obs, actions, returns)` in `keras_a2c.py`, between the adapter and the main block.

`train_a2c` trained the Keras model with PyTorch's Adam. Code written for Keras uses **Keras's** optimiser instead, in a hand-written training step. This is what `fit` does for one batch (lesson 3.5), written out, with A2C's loss in place of `mse`:

1. **Forward:** `logits, value = model(obs)`. The model gives values of shape (n, 1); the loss wants (n,): `value[..., 0]` takes the first (only) entry along the last dimension.
2. **Loss:** lesson 4.3's `a2c_loss(logits, values, actions, returns)`. It returns the loss and a dictionary of parts; you need the loss.
3. **Slopes:** `model.zero_grad()` clears last time's, then `loss.backward()` (the PyTorch backend's autograd, lesson 3.4).
4. **Apply them:** a Keras optimiser takes a list of slopes and the list of variables they belong to: `optimiser.apply(slopes, model.trainable_weights)`. Each Keras variable keeps its PyTorch tensor in `.value`, and that tensor's slope is in `.value.grad`, so the slopes are `[w.value.grad for w in model.trainable_weights]`.
5. **Return the loss as a plain float**, so the caller can watch it fall.

(If your course's code uses the TensorFlow backend, step 3 looks different: the forward pass and the loss go inside `with tf.GradientTape() as tape:`, and the slopes come from `tape.gradient(loss, model.trainable_weights)`. Steps 1, 2, 4 and 5 are the same.)

```hints
nudge: Five lines: forward, loss, clear the slopes, backward, apply. Then return the loss as a float.
concept: `logits, value = model(obs)`; `loss, parts = a2c_loss(logits, value[..., 0], actions, returns)`; `model.zero_grad()`; `loss.backward()`; `optimiser.apply([w.value.grad for w in model.trainable_weights], model.trainable_weights)`; `return float(loss)`.
answer: Add to `keras_a2c.py`, after the adapter:
~~~python
def keras_update(model, optimiser, obs, actions, returns):
    logits, value = model(obs)
    loss, parts = a2c_loss(logits, value[..., 0], actions, returns)
    model.zero_grad()
    loss.backward()
    optimiser.apply([w.value.grad for w in model.trainable_weights], model.trainable_weights)
    return float(loss)
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_keras_a2c.py -k update" label="keras_update computes the A2C loss, gets the slopes, and applies them with Keras's optimiser" -- logits, value = model(obs); loss, parts = a2c_loss(logits, value[..., 0], actions, returns); model.zero_grad(); loss.backward(); optimiser.apply([w.value.grad for w in model.trainable_weights], model.trainable_weights); return float(loss).
run ".venv/Scripts/python -m pytest -q tests/test_keras_a2c.py" label="all lesson 4.6 tests pass"
```

### What you have

A2C with a Keras network: a functional model with a shared body and two heads, an adapter that lets the PyTorch training loop use it unchanged, and a training step written the Keras way. Both libraries reach 500. Last lesson: turning these runs into an experiment you can write up.
