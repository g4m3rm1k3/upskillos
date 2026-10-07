# Training a network

You can now compute a network's forward pass, its gradients by backpropagation, and check them numerically. This lesson turns those pieces into a working training procedure and uses it to train a network that reads handwritten digits. Along the way it introduces the practical machinery that every neural network training run uses: **mini-batches**, **epochs**, careful **initialisation**, and **loss curves** for watching training as it happens and diagnosing what goes wrong.

The model is a network with 64 inputs (the pixels of an 8 × 8 digit), one hidden layer of 64 ReLU units, and a softmax output over the 10 digits, trained with the cross-entropy loss from the softmax regression lesson. Everything is plain NumPy, so nothing is hidden.

## The network in NumPy

The parameters live in a dictionary, so every part of the code can loop over them by name. The forward pass is the one from the network lessons; the backward pass uses the batch formulas from the backpropagation lesson. For softmax with cross-entropy, as for sigmoid with log loss, the output error signal is simply P − Y, with Y the one-hot labels.

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.2, random_state=0)
print(f"training {len(X_train)}, validation {len(X_val)}, test {len(X_test)}")

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed, hidden=64):
    rng = np.random.default_rng(seed)
    return {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
            "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}

def forward(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    H = np.maximum(0, Z1)
    return Z1, H, softmax(H @ params["W2"] + params["b2"])

def loss_and_accuracy(params, X, y):
    P = forward(params, X)[2]
    return -np.mean(np.log(P[np.arange(len(y)), y] + 1e-12)), (P.argmax(axis=1) == y).mean()

def gradients(params, X, y):
    Z1, H, P = forward(params, X)
    D2 = (P - np.eye(10)[y]) / len(X)
    D1 = (D2 @ params["W2"].T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}

params = init(0)
print("parameters:", sum(p.size for p in params.values()))
print("loss and accuracy before training: %.3f, %.3f" % loss_and_accuracy(params, X_val, y_val))
```

```output
training 1005, validation 252, test 540
parameters: 4810
loss and accuracy before training: 2.461, 0.063
```

The data is split three ways: **training** data to compute gradients on, **validation** data to watch during training and make decisions with, and **test** data, kept untouched until the very end. The weights start with He initialisation from the activation functions lesson (standard deviation √(2/n) for a layer with `n` inputs), and the biases at zero. The `+ 1e-12` inside the log guards against log(0).

Before training, the loss is 2.46, close to ln 10 ≈ 2.30, and the accuracy is 6%, which is chance level for ten classes: the untrained network spreads its probability roughly evenly over the ten digits. That initial check is worth doing on every network: if the starting loss is far from ln(number of classes), something is already wrong.

## Mini-batches and epochs

Plain gradient descent computes the gradient on **all** the training data before taking each step. That is wasteful: the average gradient over 1,000 examples is not much better a direction than the average over 32, but costs 30 times as much. **Mini-batch stochastic gradient descent** (SGD) takes a step after every small batch:

1. Shuffle the training examples.
2. Split them into batches of, say, 32.
3. For each batch: compute the gradient on that batch only, and step.

One pass through all the training data is an **epoch**. With 1,005 training examples and batches of 32, an epoch makes 32 steps instead of one. Each step's gradient is noisy, since it is estimated from a small sample, but the noise averages out over many steps, and in practice it even helps by jiggling training out of poor flat regions. Shuffling every epoch keeps the batches different each time.

Compare batch sizes with the same learning rate: full batches and batches of 32 for 30 epochs each, and single examples for only 5 epochs, because they are slow. Predict first: which will be furthest along?

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.2, random_state=0)

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed, hidden=64):
    rng = np.random.default_rng(seed)
    return {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
            "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}

def forward(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    H = np.maximum(0, Z1)
    return Z1, H, softmax(H @ params["W2"] + params["b2"])

def loss_and_accuracy(params, X, y):
    P = forward(params, X)[2]
    return -np.mean(np.log(P[np.arange(len(y)), y] + 1e-12)), (P.argmax(axis=1) == y).mean()

def gradients(params, X, y):
    Z1, H, P = forward(params, X)
    D2 = (P - np.eye(10)[y]) / len(X)
    D1 = (D2 @ params["W2"].T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}

def train(learning_rate, batch_size, epochs, seed=0):
    params = init(seed)
    rng = np.random.default_rng(seed)
    history = []
    for epoch in range(epochs):
        order = rng.permutation(len(X_train))
        for start in range(0, len(X_train), batch_size):
            batch = order[start:start + batch_size]
            grads = gradients(params, X_train[batch], y_train[batch])
            for name in params:
                params[name] -= learning_rate * grads[name]
        history.append((loss_and_accuracy(params, X_train, y_train), loss_and_accuracy(params, X_val, y_val)))
    return params, history

for batch_size in [len(X_train), 32, 1]:
    epochs = 5 if batch_size == 1 else 30
    params, history = train(0.1, batch_size, epochs)
    val_loss, val_accuracy = history[-1][1]
    print(f"batch size {batch_size:>4}, {epochs} epochs: validation loss {val_loss:.3f}, accuracy {val_accuracy:.3f}")
```

```output
batch size 1005, 30 epochs: validation loss 1.444, accuracy 0.746
batch size   32, 30 epochs: validation loss 0.122, accuracy 0.968
batch size    1, 5 epochs: validation loss 0.116, accuracy 0.964
```

`rng.permutation(n)` shuffles the row numbers, and `order[start:start + batch_size]` takes the next batch of them (the last batch may be smaller). The update loop runs over the parameter names, subtracting the learning rate times each gradient.

After 30 epochs, full-batch gradient descent (30 steps in total) has only reached 75% validation accuracy. Mini-batches of 32 (about 950 steps) reach 97%. Batches of a single example get to 96% in only 5 epochs (about 5,000 steps), but each step is the least efficient: one example at a time cannot use NumPy's fast matrix operations. On real hardware, batches of 32 to 512 hit the best balance between noisy cheap steps and fast parallel arithmetic.

## Learning rates and loss curves

The learning rate is the single most important setting. Watching the **loss curve**, the loss after every epoch, shows immediately whether it is right. Before running, predict which of these four rates will fail completely.

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.2, random_state=0)

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed, hidden=64):
    rng = np.random.default_rng(seed)
    return {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
            "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}

def forward(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    H = np.maximum(0, Z1)
    return Z1, H, softmax(H @ params["W2"] + params["b2"])

def loss_and_accuracy(params, X, y):
    P = forward(params, X)[2]
    return -np.mean(np.log(P[np.arange(len(y)), y] + 1e-12)), (P.argmax(axis=1) == y).mean()

def gradients(params, X, y):
    Z1, H, P = forward(params, X)
    D2 = (P - np.eye(10)[y]) / len(X)
    D1 = (D2 @ params["W2"].T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}

def train(learning_rate, batch_size, epochs, seed=0):
    params = init(seed)
    rng = np.random.default_rng(seed)
    history = []
    for epoch in range(epochs):
        order = rng.permutation(len(X_train))
        for start in range(0, len(X_train), batch_size):
            batch = order[start:start + batch_size]
            grads = gradients(params, X_train[batch], y_train[batch])
            for name in params:
                params[name] -= learning_rate * grads[name]
        history.append((loss_and_accuracy(params, X_train, y_train), loss_and_accuracy(params, X_val, y_val)))
    return params, history

fig, ax = plt.subplots(figsize=(6, 3.8))
for learning_rate in [0.01, 0.1, 1.0, 3.0]:
    params, history = train(learning_rate, 32, 30)
    val_losses = [val[0] for _, val in history]
    ax.plot(range(1, 31), val_losses, label=f"learning rate {learning_rate}")
    print(f"learning rate {learning_rate:>4}: validation accuracy after 30 epochs {history[-1][1][1]:.3f}")
ax.set_xlabel("epoch")
ax.set_ylabel("validation loss")
ax.set_ylim(0, 2.6)
ax.legend(fontsize=8)
plt.show()
```

```output
learning rate 0.01: validation accuracy after 30 epochs 0.925
learning rate  0.1: validation accuracy after 30 epochs 0.968
learning rate  1.0: validation accuracy after 30 epochs 0.984
learning rate  3.0: validation accuracy after 30 epochs 0.119
```

The four curves show the three classic shapes:

- **Too small** (0.01): the loss falls steadily but slowly; after 30 epochs, accuracy is only 0.925. More epochs would get there eventually.
- **About right** (0.1 and 1.0): the loss drops quickly, then levels off. Here 1.0 is the best of the four, at 0.984.
- **Too large** (3.0): the loss never comes down. Each step overshoots, the weights are thrown into a bad region (often with many ReLUs killed off), and accuracy stays at chance, about 0.1. Larger still and the loss becomes `nan` as numbers overflow.

The usual practical recipe: try rates spaced by factors of 3 or 10, pick the largest that trains smoothly, and watch the curves. The optimisers lesson adds methods that adapt the step size automatically.

## Overfitting, and when to stop

Train for longer and compare the training and validation loss, epoch by epoch, with learning rate 0.5 for 150 epochs. Predict before running: which of the two curves will eventually turn upward?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.2, random_state=0)

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed, hidden=64):
    rng = np.random.default_rng(seed)
    return {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
            "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}

def forward(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    H = np.maximum(0, Z1)
    return Z1, H, softmax(H @ params["W2"] + params["b2"])

def loss_and_accuracy(params, X, y):
    P = forward(params, X)[2]
    return -np.mean(np.log(P[np.arange(len(y)), y] + 1e-12)), (P.argmax(axis=1) == y).mean()

def gradients(params, X, y):
    Z1, H, P = forward(params, X)
    D2 = (P - np.eye(10)[y]) / len(X)
    D1 = (D2 @ params["W2"].T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}

params = init(0)
rng = np.random.default_rng(0)
train_losses, val_losses = [], []
for epoch in range(1, 151):
    order = rng.permutation(len(X_train))
    for start in range(0, len(X_train), 32):
        batch = order[start:start + 32]
        grads = gradients(params, X_train[batch], y_train[batch])
        for name in params:
            params[name] -= 0.5 * grads[name]
    train_losses.append(loss_and_accuracy(params, X_train, y_train)[0])
    val_losses.append(loss_and_accuracy(params, X_val, y_val)[0])
    if epoch == 40:
        print(f"test accuracy after 40 epochs: {loss_and_accuracy(params, X_test, y_test)[1]:.3f}")

best = int(np.argmin(val_losses))
print(f"lowest validation loss {val_losses[best]:.3f} at epoch {best + 1}; after 150 epochs: validation {val_losses[-1]:.3f}, training {train_losses[-1]:.4f}")
fig, ax = plt.subplots(figsize=(6, 3.5))
ax.plot(range(1, 151), train_losses, label="training loss")
ax.plot(range(1, 151), val_losses, label="validation loss")
ax.axvline(best + 1, color="grey", linestyle="--")
ax.set_xlabel("epoch")
ax.set_ylim(0, 0.4)
ax.legend()
plt.show()
```

```output
test accuracy after 40 epochs: 0.969
lowest validation loss 0.076 at epoch 25; after 150 epochs: validation 0.093, training 0.0012
```

The training loss falls to almost nothing (0.001), while the validation loss reaches its lowest point at about epoch 25 (0.076, the dashed line) and then **creeps upwards**, to 0.093 by epoch 150. The network is starting to memorise the training digits. The gap between the two curves, and especially validation loss rising while training loss keeps falling, is the signature of overfitting on a loss curve.

The simplest remedy is **early stopping**: keep the parameters from the epoch with the best validation loss, and stop once it has failed to improve for a while (the **patience**). You will write it in a challenge. The next-but-one lesson adds other tools against overfitting, such as weight decay and dropout.

## The final test

Validation data has guided every decision so far (batch size, learning rate, when to stop), so it is no longer an unbiased judge. That is what the test set was kept for. The run above printed it after 40 epochs, around the best validation point: a **test accuracy of about 0.969**. For comparison, softmax regression, the same model without the hidden layer, scored about 0.96 in its lesson. On these tiny 8 × 8 images a hidden layer adds only a little; on harder data, with more layers and the convolutions of the later lessons, the gap becomes enormous.

::: challenge Shuffled batches [easy]
Write `make_batches(n, batch_size, rng)` that returns a list of index arrays: shuffle the numbers 0 to n − 1 with `rng.permutation(n)`, then cut them into consecutive pieces of `batch_size` (the last piece may be smaller). Every index must appear exactly once.

```python starter
import numpy as np

def make_batches(n, batch_size, rng):
    return [np.arange(n)]

batches = make_batches(10, 4, np.random.default_rng(0))
print(batches)
```

```python solution
import numpy as np

def make_batches(n, batch_size, rng):
    order = rng.permutation(n)
    return [order[start:start + batch_size] for start in range(0, n, batch_size)]

batches = make_batches(10, 4, np.random.default_rng(0))
print(batches)
```

```python test
import numpy as _np
assert "make_batches" in dir(), "Keep the function's name as make_batches."
_b = make_batches(10, 4, _np.random.default_rng(0))
assert [len(x) for x in _b] == [4, 4, 2], f"10 examples in batches of 4 should give sizes [4, 4, 2], but got {[len(x) for x in _b]}."
assert sorted(_np.concatenate(_b).tolist()) == list(range(10)), "Every index from 0 to 9 should appear exactly once."
_want = _np.random.default_rng(0).permutation(10)
assert _np.array_equal(_np.concatenate(_b), _want), "The batches should be consecutive pieces of rng.permutation(n)."
assert not _np.array_equal(_np.concatenate(make_batches(50, 8, _np.random.default_rng(1))), _np.arange(50)), "The order should be shuffled."
assert [len(x) for x in make_batches(12, 4, _np.random.default_rng(2))] == [4, 4, 4], "When the batch size divides n exactly, all batches are full."
"SUCCESS: One epoch's worth of shuffled mini-batches."
```

Hint: `range(0, n, batch_size)` gives the start of each batch, and slicing past the end of an array simply stops at the end.
:::

::: challenge Early stopping [medium]
Write `train_early_stopping(lr, batch_size, max_epochs, patience, seed)` using the lesson's `init`, `gradients` and `loss_and_accuracy` (provided in the starter). Train as in the lesson's `train` function, with the same shuffling, and after each epoch compute the validation loss. Keep a **copy** of the parameters whenever the validation loss is the best so far (`{name: value.copy() for name, value in params.items()}`). Stop when the validation loss has not improved for `patience` epochs in a row, or after `max_epochs`. Return a tuple `(best_params, best_epoch, epochs_run)`, with epochs counted from 1.

Run it with learning rate 0.5, batch size 32, at most 150 epochs and patience 10, and store the results in `best_params`, `best_epoch` and `epochs_run`, and the test accuracy of `best_params` in `test_accuracy`.

```python starter
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.2, random_state=0)

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed, hidden=64):
    rng = np.random.default_rng(seed)
    return {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
            "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}

def forward(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    H = np.maximum(0, Z1)
    return Z1, H, softmax(H @ params["W2"] + params["b2"])

def loss_and_accuracy(params, X, y):
    P = forward(params, X)[2]
    return -np.mean(np.log(P[np.arange(len(y)), y] + 1e-12)), (P.argmax(axis=1) == y).mean()

def gradients(params, X, y):
    Z1, H, P = forward(params, X)
    D2 = (P - np.eye(10)[y]) / len(X)
    D1 = (D2 @ params["W2"].T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}

def train_early_stopping(lr, batch_size, max_epochs, patience, seed):
    return init(seed), 0, 0

best_params, best_epoch, epochs_run = train_early_stopping(0.5, 32, 150, 10, 0)
test_accuracy = loss_and_accuracy(best_params, X_test, y_test)[1]
print(best_epoch, epochs_run, test_accuracy)
```

```python solution
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.2, random_state=0)

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed, hidden=64):
    rng = np.random.default_rng(seed)
    return {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
            "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}

def forward(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    H = np.maximum(0, Z1)
    return Z1, H, softmax(H @ params["W2"] + params["b2"])

def loss_and_accuracy(params, X, y):
    P = forward(params, X)[2]
    return -np.mean(np.log(P[np.arange(len(y)), y] + 1e-12)), (P.argmax(axis=1) == y).mean()

def gradients(params, X, y):
    Z1, H, P = forward(params, X)
    D2 = (P - np.eye(10)[y]) / len(X)
    D1 = (D2 @ params["W2"].T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}

def train_early_stopping(lr, batch_size, max_epochs, patience, seed):
    params = init(seed)
    rng = np.random.default_rng(seed)
    best_loss, best_params, best_epoch, waited = np.inf, None, 0, 0
    for epoch in range(1, max_epochs + 1):
        order = rng.permutation(len(X_train))
        for start in range(0, len(X_train), batch_size):
            batch = order[start:start + batch_size]
            grads = gradients(params, X_train[batch], y_train[batch])
            for name in params:
                params[name] -= lr * grads[name]
        val_loss = loss_and_accuracy(params, X_val, y_val)[0]
        if val_loss < best_loss:
            best_loss, best_epoch, waited = val_loss, epoch, 0
            best_params = {name: value.copy() for name, value in params.items()}
        else:
            waited += 1
            if waited >= patience:
                break
    return best_params, best_epoch, epoch

best_params, best_epoch, epochs_run = train_early_stopping(0.5, 32, 150, 10, 0)
test_accuracy = loss_and_accuracy(best_params, X_test, y_test)[1]
print(best_epoch, epochs_run, test_accuracy)
```

```python test
import numpy as _np
assert "train_early_stopping" in dir(), "Keep the function's name as train_early_stopping."
def _ref(lr, bs, max_epochs, patience, seed):
    p = init(seed); r = _np.random.default_rng(seed)
    best, bp, be, wait = _np.inf, None, 0, 0
    for ep in range(1, max_epochs + 1):
        o = r.permutation(len(X_train))
        for s in range(0, len(X_train), bs):
            b = o[s:s + bs]; g = gradients(p, X_train[b], y_train[b])
            for k in p:
                p[k] -= lr * g[k]
        vl = loss_and_accuracy(p, X_val, y_val)[0]
        if vl < best:
            best, be, wait = vl, ep, 0
            bp = {k: v.copy() for k, v in p.items()}
        else:
            wait += 1
            if wait >= patience:
                break
    return bp, be, ep
_bp, _be, _er = _ref(0.5, 32, 150, 10, 0)
assert best_epoch == _be, f"The best validation loss comes at epoch {_be}, but best_epoch is {best_epoch}. Count epochs from 1, and shuffle exactly as train does: rng = np.random.default_rng(seed), then one rng.permutation per epoch."
assert epochs_run == _er, f"With patience 10, training should stop after epoch {_er}, but epochs_run is {epochs_run}."
assert all(_np.allclose(best_params[k], _bp[k]) for k in _bp), "best_params should be a copy of the parameters at the best epoch. Without .copy(), later updates change the saved arrays too."
_small = train_early_stopping(0.5, 32, 3, 10, 1)
assert _small[2] == 3, "With max_epochs 3, training should stop after 3 epochs."
_acc = loss_and_accuracy(_bp, X_test, y_test)[1]
assert _np.isclose(test_accuracy, _acc), f"test_accuracy should be {_acc:.3f}."
f"SUCCESS: The best validation loss came at epoch {_be}; training stopped at epoch {_er} instead of 150, and the saved network scores {_acc:.3f} on the test set."
```

Hint: Keep `best_loss`, `best_params`, `best_epoch` and a counter of epochs without improvement. After each epoch, either record a new best (and reset the counter) or add 1 to the counter and `break` when it reaches `patience`. The loop variable `epoch` holds the number of epochs run when the loop ends.
:::

::: challenge A second hidden layer [medium]
Extend the network to **two** hidden layers. Write `init2(seed, h1, h2)` (He initialisation for all three weight matrices, zero biases; draw them in the order W1, W2, W3 from one generator), `forward2(params, X)`, which returns the tuple `(Z1, H1, Z2, H2, P)` with the probabilities last, and `gradients2(params, X, y)` for 64 → h1 → h2 → 10 with ReLU hidden layers and a softmax output. The backward pass simply has one more step: the error signal for the second hidden layer passes back through `W2` and the first layer's ReLU.

The check compares your gradients with numerical ones on a small example, so make `gradients2` return a dictionary with keys `"W1"`, `"b1"`, `"W2"`, `"b2"`, `"W3"`, `"b3"`.

```python starter
import numpy as np

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init2(seed, h1, h2):
    return {}

def forward2(params, X):
    return None

def gradients2(params, X, y):
    return {}
```

```python solution
import numpy as np

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init2(seed, h1, h2):
    rng = np.random.default_rng(seed)
    return {"W1": rng.normal(0, np.sqrt(2 / 64), (64, h1)), "b1": np.zeros(h1),
            "W2": rng.normal(0, np.sqrt(2 / h1), (h1, h2)), "b2": np.zeros(h2),
            "W3": rng.normal(0, np.sqrt(2 / h2), (h2, 10)), "b3": np.zeros(10)}

def forward2(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    H1 = np.maximum(0, Z1)
    Z2 = H1 @ params["W2"] + params["b2"]
    H2 = np.maximum(0, Z2)
    return Z1, H1, Z2, H2, softmax(H2 @ params["W3"] + params["b3"])

def gradients2(params, X, y):
    Z1, H1, Z2, H2, P = forward2(params, X)
    D3 = (P - np.eye(10)[y]) / len(X)
    D2 = (D3 @ params["W3"].T) * (Z2 > 0)
    D1 = (D2 @ params["W2"].T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H1.T @ D2, "b2": D2.sum(axis=0),
            "W3": H2.T @ D3, "b3": D3.sum(axis=0)}
```

```python test
import numpy as _np
assert "init2" in dir() and "forward2" in dir() and "gradients2" in dir(), "Keep all three function names."
_p = init2(0, 5, 4)
assert {k: v.shape for k, v in _p.items()} == {"W1": (64, 5), "b1": (5,), "W2": (5, 4), "b2": (4,), "W3": (4, 10), "b3": (10,)}, "init2(0, 5, 4) should give W1 (64, 5), b1 (5,), W2 (5, 4), b2 (4,), W3 (4, 10), b3 (10,)."
_r = _np.random.default_rng(0)
assert _np.allclose(_p["W1"], _r.normal(0, _np.sqrt(2 / 64), (64, 5))) and _np.allclose(_p["W2"], _r.normal(0, _np.sqrt(2 / 5), (5, 4))), "Use He initialisation, √(2 / inputs), drawing W1, W2 then W3 from one generator."
_rr = _np.random.default_rng(3)
_X = _rr.normal(size=(6, 64))
_y = _rr.integers(0, 10, 6)
for _k in _p:
    _p[_k] = _p[_k] + _rr.normal(0, 0.1, _p[_k].shape)
def _loss(p):
    P = forward2(p, _X)[-1]
    return -_np.mean(_np.log(P[_np.arange(6), _y]))
_g = gradients2(_p, _X, _y)
for _k in ["W3", "b3", "W2", "b2", "W1", "b1"]:
    assert _k in _g and _g[_k].shape == _p[_k].shape, f"gradients2 should return '{_k}' with shape {_p[_k].shape}."
    for _trial in range(4):
        _idx = tuple(_rr.integers(0, s) for s in _p[_k].shape)
        _up = {k: v.copy() for k, v in _p.items()}; _up[_k][_idx] += 1e-6
        _dn = {k: v.copy() for k, v in _p.items()}; _dn[_k][_idx] -= 1e-6
        _num = (_loss(_up) - _loss(_dn)) / 2e-6
        assert _np.isclose(_g[_k][_idx], _num, atol=1e-6), f"The gradient for {_k} does not match the numerical one. The error signal passes back through each weight matrix (transposed) and each ReLU's derivative in turn."
"SUCCESS: One more layer is one more line of backward pass. Every deep network's backpropagation is this pattern, repeated."
```

Hint: Return all the intermediate values from `forward2`, since the backward pass needs them. The backward pass is: D3 = (P − Y)/n; D2 = (D3 W3ᵀ) ⊙ (Z2 > 0); D1 = (D2 W2ᵀ) ⊙ (Z1 > 0); each weight gradient is (that layer's input)ᵀ times its D.
:::

## What you learned

- Split data three ways: training (gradients), validation (decisions during training) and test (one final check). Check the starting loss: about ln(classes) for a fresh classifier.
- Mini-batch SGD shuffles each epoch and steps after every small batch; it reached 97% in 30 epochs where full-batch descent reached 75%.
- Loss curves diagnose the learning rate: too small is slow, too large never comes down (or becomes `nan`), and a good rate falls fast and levels off.
- Training loss falling while validation loss rises means overfitting; early stopping keeps the parameters from the best validation epoch.
- A 64 → 64 → 10 ReLU network trained from scratch reads unseen digits with about 97% accuracy.
- Each extra layer adds one step to the backward pass: pass the error back through the weights and the activation's derivative.

Plain SGD takes the same size step in every direction. The next lesson improves on it with momentum, RMSProp and Adam, which adapt their steps to the shape of the loss surface, and are what nearly every network is trained with today.
