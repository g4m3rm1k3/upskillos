# Generative models

Every model so far has learned to **describe** data: classify it, predict from it, compress it. A **generative model** learns to **produce** new data that looks like its training data: new faces, new sentences, new molecules. The last lesson's autoencoder came close: its decoder turns a short code into an image. But pick a random code and the decoder may produce nonsense, because nothing in its training said which codes are sensible; the codes of real digits sit in scattered clumps with gaps between them.

This lesson builds two classic generative models from scratch. The **variational autoencoder** (VAE) organises its codes so that they fill a simple, known shape, a standard bell curve, so any code drawn from that shape decodes to something plausible. The **generative adversarial network** (GAN) trains a generator against a critic in a two-player game. Each comes with its central idea worked out in NumPy: the KL penalty and the reparameterisation trick for the VAE, and the adversarial game, including its notorious instability, for the GAN.

## The variational autoencoder

A VAE changes two things in the autoencoder:

1. **The encoder outputs a distribution, not a point.** For each input, it gives a mean μ and a log-variance log σ² for every code dimension. The code is then **sampled**: z = μ + σ · ε, with ε drawn from a standard normal. So each digit maps to a small cloud of codes, and the decoder must rebuild the digit from anywhere in that cloud. Nearby codes are forced to decode to similar images, so the gaps between clumps fill in.
2. **A penalty pulls every cloud towards the standard normal** N(0, 1). The penalty is the **Kullback–Leibler divergence** (from the t-SNE lesson) between the encoder's normal distribution and N(0, 1), which for each code dimension has a simple formula:

\[
\text{KL} = -\tfrac12 \left(1 + \log \sigma^2 - \mu^2 - \sigma^2\right)
\]

It is zero exactly when μ = 0 and σ = 1, and grows as the cloud drifts away or changes size. The loss is the reconstruction error plus the total KL. The reconstruction term wants codes spread out and distinct; the KL term wants them all packed into N(0, 1). The balance gives a code space with no gaps, where the standard normal is a good description of where codes live. To **generate**, skip the encoder: draw z from N(0, 1) and decode it.

## The reparameterisation trick

Sampling is random, and you cannot backpropagate through "pick a random number". The trick is to move the randomness out of the way. Write z = μ + σ ⊙ ε, where ε is drawn from N(0, 1) **independently of the network**. Now z is an ordinary function of μ and σ, with ε treated as a fixed input, so gradients flow: ∂z/∂μ = 1 and ∂z/∂σ = ε. With log σ² as the encoder's output, ∂z/∂(log σ²) = ε · σ/2. This **reparameterisation trick** is what makes VAEs trainable by backpropagation.

Here is a VAE on the digits: encoder 64 → 64 → (μ, log σ²) with a 2-number code, decoder 2 → 64 → 64 with a sigmoid output, trained with the binary cross-entropy reconstruction loss (the pixels are between 0 and 1) plus the KL, using Adam:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

X = load_digits().data / 16
rng = np.random.default_rng(0)

def he(a, b):
    return rng.normal(0, np.sqrt(2 / a), (a, b))

P = {"W1": he(64, 64), "b1": np.zeros(64), "Wm": he(64, 2) * 0.1, "bm": np.zeros(2),
     "Wv": he(64, 2) * 0.1, "bv": np.zeros(2), "W2": he(2, 64), "b2": np.zeros(64),
     "W3": he(64, 64), "b3": np.zeros(64)}
first = {k: np.zeros_like(v) for k, v in P.items()}
second = {k: np.zeros_like(v) for k, v in P.items()}

def decode(z):
    return sigmoid(np.maximum(0, z @ P["W2"] + P["b2"]) @ P["W3"] + P["b3"])

t = 0
for epoch in range(1, 51):
    order = rng.permutation(len(X))
    total_rec = total_kl = 0.0
    for start in range(0, len(X), 64):
        x = X[order[start:start + 64]]
        n = len(x)
        z1 = x @ P["W1"] + P["b1"]
        h = np.maximum(0, z1)
        mu, logvar = h @ P["Wm"] + P["bm"], h @ P["Wv"] + P["bv"]
        eps = rng.normal(size=mu.shape)
        sd = np.exp(0.5 * logvar)
        z = mu + sd * eps
        z2 = z @ P["W2"] + P["b2"]
        h2 = np.maximum(0, z2)
        p = sigmoid(h2 @ P["W3"] + P["b3"])
        total_rec -= np.sum(x * np.log(p + 1e-9) + (1 - x) * np.log(1 - p + 1e-9))
        total_kl -= 0.5 * np.sum(1 + logvar - mu ** 2 - np.exp(logvar))

        d3 = (p - x) / n
        g = {"W3": h2.T @ d3, "b3": d3.sum(axis=0)}
        dh2 = d3 @ P["W3"].T * (z2 > 0)
        g["W2"], g["b2"] = z.T @ dh2, dh2.sum(axis=0)
        dz = dh2 @ P["W2"].T
        dmu = dz + mu / n
        dlogvar = dz * eps * 0.5 * sd + 0.5 * (np.exp(logvar) - 1) / n
        g["Wm"], g["bm"] = h.T @ dmu, dmu.sum(axis=0)
        g["Wv"], g["bv"] = h.T @ dlogvar, dlogvar.sum(axis=0)
        dh = (dmu @ P["Wm"].T + dlogvar @ P["Wv"].T) * (z1 > 0)
        g["W1"], g["b1"] = x.T @ dh, dh.sum(axis=0)
        t += 1
        for k in P:
            first[k] = 0.9 * first[k] + 0.1 * g[k]
            second[k] = 0.999 * second[k] + 0.001 * g[k] ** 2
            P[k] -= 0.003 * (first[k] / (1 - 0.9 ** t)) / (np.sqrt(second[k] / (1 - 0.999 ** t)) + 1e-8)
    if epoch in (1, 10, 50):
        print(f"epoch {epoch:>2}: reconstruction loss {total_rec / len(X):.1f} per image, KL {total_kl / len(X):.2f}")

codes = np.maximum(0, X @ P["W1"] + P["b1"]) @ P["Wm"] + P["bm"]
print("code means across the dataset:", codes.mean(axis=0).round(2), " spreads:", codes.std(axis=0).round(2))

grid = np.linspace(-2, 2, 9)
canvas = np.zeros((9 * 9, 9 * 9))
for row, z2_value in enumerate(grid[::-1]):
    for col, z1_value in enumerate(grid):
        image = decode(np.array([[z1_value, z2_value]])).reshape(8, 8)
        canvas[row * 9:row * 9 + 8, col * 9:col * 9 + 8] = image
fig, ax = plt.subplots(figsize=(5, 5))
ax.imshow(canvas, cmap="gray_r")
ax.set_title("decoded codes on a grid from −2 to 2", fontsize=9)
ax.axis("off")
plt.show()
```

```output
epoch  1: reconstruction loss 38.6 per image, KL 0.26
epoch 10: reconstruction loss 24.5 per image, KL 1.49
epoch 50: reconstruction loss 22.8 per image, KL 2.13
code means across the dataset: [0.1  0.06]  spreads: [1.   0.94]
```

The backward pass is the autoencoder's, with three additions. The reconstruction loss is binary cross-entropy with a sigmoid output, so the output signal is simply p − x (as in logistic regression). Each code dimension gets two gradients: through the decoder (`dz`, passed to μ unchanged and to log σ² times ε·σ/2) and from the KL penalty. Differentiating −½(1 + log σ² − μ² − σ²) gives μ for the mean and, since σ² = e^(log σ²), −½(1 − σ²) = (σ² − 1)/2 for the log-variance; each is divided by n because the loss is averaged over the batch, giving μ/n and (σ² − 1)/(2n). And the encoder's hidden layer receives the gradient from both the μ and the log σ² heads.

Over training the reconstruction loss falls (from about 39 to about 23 per image) while the KL rises to around 2: the codes are allowed to carry information, at a price. The codes of the whole dataset end up with mean about 0 and spread about 1 in each dimension, as the KL term encourages (it penalises μ² + σ² on average, which keeps the codes centred and of moderate size, though it does not pin down their spread exactly).

The picture is the payoff. Each cell is the decoder's output for one code on a 9 × 9 grid covering −2 to 2 in both directions. Moving across the grid, digits change smoothly from one kind into another: there are no blank or garbage regions, because every part of this space was used during training. Codes drawn from N(0, 1) almost always land in this region, so random draws give plausible (if blurry, at 8 × 8 and with 2 dimensions) new digits.

## Generative adversarial networks

A **GAN** takes a completely different route. Two networks play a game:

- a **generator** G turns random noise z into a fake example, G(z);
- a **discriminator** D looks at an example and outputs the probability that it is real.

D is trained to tell real from fake: logistic regression with real examples labelled 1 and the generator's output labelled 0. G is trained to fool D: its loss is −log D(G(z)), pushing D's verdict on its fakes towards "real". As D gets better at spotting fakes, G is pushed to produce better ones. If training reaches balance, G's outputs are indistinguishable from real data and D can only guess, outputting 0.5 everywhere.

GANs have no reconstruction loss and no explicit likelihood: the discriminator **is** the loss, learned on the fly. That is one reason GANs produce famously sharp images where VAEs give blurry ones, and also why they are famously hard to train. The game need not settle: the two players can chase each other round in circles.

Here is the smallest possible GAN. The real data is a bell curve with mean 4 and standard deviation 1.25. The generator has just two parameters: G(z) = a·z + b, with z from N(0, 1), so it can match the target exactly with b = 4 and |a| = 1.25. The discriminator is logistic regression on the features x and x²/10, enough to compare both the position and the spread of two bell curves. Before running, predict: will the generator's spread settle smoothly at 1.25?

```python type
import numpy as np
import matplotlib.pyplot as plt

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def features(x):
    return np.column_stack([x, x ** 2 / 10, np.ones_like(x)])

rng = np.random.default_rng(0)
a, b = 1.0, 0.0
w = np.zeros(3)
history = []
for step in range(1, 6001):
    real = rng.normal(4, 1.25, 128)
    fake = a * rng.normal(size=128) + b
    d_real, d_fake = sigmoid(features(real) @ w), sigmoid(features(fake) @ w)
    w -= 0.05 * (features(real).T @ (d_real - 1) + features(fake).T @ d_fake) / 128

    z = rng.normal(size=128)
    fake = a * z + b
    d_fake = sigmoid(features(fake) @ w)
    d_x = -(1 - d_fake) * (w[0] + 2 * w[1] * fake / 10)
    a -= 0.02 * np.mean(d_x * z)
    b -= 0.02 * np.mean(d_x)
    history.append((b, abs(a)))
    if step % 1000 == 0:
        print(f"step {step}: generator mean {b:.2f}, spread {abs(a):.2f}")

history = np.array(history)
fig, ax = plt.subplots(figsize=(6.5, 3.4))
ax.plot(history[:, 0], label="generator mean")
ax.plot(history[:, 1], label="generator spread")
ax.axhline(4, color="tab:blue", linestyle="--", linewidth=0.8)
ax.axhline(1.25, color="tab:orange", linestyle="--", linewidth=0.8)
ax.set_xlabel("training step")
ax.legend(fontsize=8)
plt.show()
```

```output
step 1000: generator mean 4.08, spread 0.25
step 2000: generator mean 4.22, spread 0.37
step 3000: generator mean 3.90, spread 1.58
step 4000: generator mean 3.81, spread 1.43
step 5000: generator mean 4.16, spread 0.83
step 6000: generator mean 4.07, spread 1.12
```

Each step first updates the discriminator, using the logistic regression gradient with real examples labelled 1 and fakes labelled 0, then the generator. The generator's gradient goes back **through the discriminator**: the loss −log D(x) has derivative −(1 − D(x)) with respect to D's score, the score changes with x at the rate w₀ + 2w₁x/10, and x = a·z + b gives the last factor (z for a, 1 for b).

The mean finds its way to about 4 within a few hundred steps and stays near it. The spread does not settle: it collapses to about 0.25 (the generator producing almost the same value every time), then overshoots to nearly 2, then swings back. The dashed lines mark the target. Each time the generator gets close, the discriminator's weights shift, and the generator's gradient points somewhere new. This circling, and the collapse to a narrow range of outputs (called **mode collapse** when it happens to an image generator, which then produces near-identical images), are the classic failures of GAN training. Practical GANs use careful architectures, balanced learning rates and modified losses to tame them.

## The bigger picture

VAEs and GANs, introduced in 2013 and 2014, began the modern era of generative modelling. Since then, **diffusion models**, which learn to remove noise one small step at a time (the denoising idea of the last lesson, repeated hundreds of times), have taken over image generation; and **autoregressive transformers**, which generate one token at a time from next-token probabilities like the character RNN, generate text, code and more. The ingredients are the ones in this series: a network, a loss that measures how real the output is, and backpropagation.

::: challenge The KL penalty [easy]
Write `kl_to_standard_normal(mu, logvar)` for arrays of shape `(n, k)`: the KL divergence of each example's normal distribution (means `mu`, log-variances `logvar`) from N(0, 1), summed over the k code dimensions and averaged over the n examples, using the lesson's formula.

```python starter
import numpy as np

def kl_to_standard_normal(mu, logvar):
    return 0.0

print(kl_to_standard_normal(np.zeros((3, 2)), np.zeros((3, 2))))
```

```python solution
import numpy as np

def kl_to_standard_normal(mu, logvar):
    per_dimension = -0.5 * (1 + logvar - mu ** 2 - np.exp(logvar))
    return float(per_dimension.sum(axis=1).mean())

print(kl_to_standard_normal(np.zeros((3, 2)), np.zeros((3, 2))))
```

```python test
import numpy as _np
assert "kl_to_standard_normal" in dir(), "Keep the function's name as kl_to_standard_normal."
assert _np.isclose(kl_to_standard_normal(_np.zeros((3, 2)), _np.zeros((3, 2))), 0.0), "A cloud that already is N(0, 1) (μ = 0, log σ² = 0) has zero KL."
assert _np.isclose(kl_to_standard_normal(_np.array([[2.0]]), _np.array([[0.0]])), 2.0), "Shifting the mean to 2 with σ = 1 gives KL = μ²/2 = 2."
assert kl_to_standard_normal(_np.array([[0.0]]), _np.array([[-3.0]])) > 0 and kl_to_standard_normal(_np.array([[0.0]]), _np.array([[3.0]])) > 0, "Shrinking or widening the cloud must also cost something."
_r = _np.random.default_rng(1)
_m, _v = _r.normal(size=(5, 3)), _r.normal(size=(5, 3))
_ref = _np.mean(_np.sum(-0.5 * (1 + _v - _m ** 2 - _np.exp(_v)), axis=1))
assert _np.isclose(kl_to_standard_normal(_m, _v), _ref), "Sum over the code dimensions, then average over the examples."
_mc_mu, _mc_lv = 0.7, -0.4
_s = _np.random.default_rng(2).normal(_mc_mu, _np.exp(0.5 * _mc_lv), 400000)
_q = -0.5 * _np.log(2 * _np.pi * _np.exp(_mc_lv)) - (_s - _mc_mu) ** 2 / (2 * _np.exp(_mc_lv))
_p = -0.5 * _np.log(2 * _np.pi) - _s ** 2 / 2
assert abs(kl_to_standard_normal(_np.array([[_mc_mu]]), _np.array([[_mc_lv]])) - _np.mean(_q - _p)) < 0.01, "The formula should agree with a direct Monte Carlo estimate of the KL divergence."
"SUCCESS: The price a VAE pays for each code: zero for a standard normal cloud, rising as it moves or changes size."
```

Hint: Compute `-0.5 * (1 + logvar - mu ** 2 - np.exp(logvar))` element by element, sum along `axis=1`, then take the mean.
:::

::: challenge The encoder's gradient [medium]
Put the VAE's two sources of gradient for the encoder's outputs together. For a batch of n examples, the encoder outputs `mu` and `logvar` (shape `(n, k)`), the code is z = μ + exp(½ log σ²)·ε with fixed noise `eps`, the decoder sends back a gradient `dz` for the codes, and the loss also includes the batch-averaged KL penalty, (1/n) Σ −½(1 + log σ² − μ² − σ²).

Write `encoder_grads(mu, logvar, eps, dz)` returning `(dmu, dlogvar)`: the total gradient of the loss for each output, combining the path through z with the KL term. The check compares your answer with numerical gradients of the objective Σ dz · z + KL, computed by the test, so derive both parts carefully.

```python starter
import numpy as np

def encoder_grads(mu, logvar, eps, dz):
    return np.zeros_like(mu), np.zeros_like(logvar)
```

```python solution
import numpy as np

def encoder_grads(mu, logvar, eps, dz):
    n = len(mu)
    sd = np.exp(0.5 * logvar)
    dmu = dz + mu / n
    dlogvar = dz * eps * 0.5 * sd + 0.5 * (np.exp(logvar) - 1) / n
    return dmu, dlogvar
```

```python test
import numpy as _np
assert "encoder_grads" in dir(), "Keep the function's name as encoder_grads."
_r = _np.random.default_rng(3)
_mu, _lv, _eps, _dz = (_r.normal(size=(5, 2)) for _ in range(4))
def _objective(m, lv):
    z = m + _np.exp(0.5 * lv) * _eps
    kl = _np.sum(-0.5 * (1 + lv - m ** 2 - _np.exp(lv))) / len(m)
    return _np.sum(_dz * z) + kl
_nm, _nl = _np.zeros_like(_mu), _np.zeros_like(_lv)
for _i in _np.ndindex(_mu.shape):
    _u, _d = _mu.copy(), _mu.copy(); _u[_i] += 1e-6; _d[_i] -= 1e-6
    _nm[_i] = (_objective(_u, _lv) - _objective(_d, _lv)) / 2e-6
    _u, _d = _lv.copy(), _lv.copy(); _u[_i] += 1e-6; _d[_i] -= 1e-6
    _nl[_i] = (_objective(_mu, _u) - _objective(_mu, _d)) / 2e-6
_gm, _gl = encoder_grads(_mu, _lv, _eps, _dz)
assert _np.allclose(_gm, _nm, atol=1e-6), "dmu is wrong. Through z it gets dz unchanged; the KL term adds μ / n."
assert not _np.allclose(_gl, _dz * _eps * 0.5 * _np.exp(0.5 * _lv), atol=1e-6), "dlogvar is missing the KL term's contribution."
assert _np.allclose(_gl, _nl, atol=1e-6), "dlogvar is wrong. Through z it gets dz × ε × σ / 2; the KL term adds (σ² − 1) / (2n)."
"SUCCESS: Two paths into each encoder output, reconstruction through the sample and the KL pull towards N(0, 1), combined into the gradient that trains the encoder."
```

Hint: Work out each part separately and add. Through z: ∂z/∂μ = 1 and ∂z/∂(log σ²) = ε·σ/2. From the KL, differentiate −½(1 + log σ² − μ² − e^(log σ²)) with respect to μ and to log σ², and divide by n.
:::

::: challenge The perfect discriminator [easy]
For a fixed generator, the best possible discriminator is known exactly: D*(x) = p_data(x) / (p_data(x) + p_gen(x)), the probability that an x of this value came from the real data rather than the generator, when both are equally common. Write `optimal_discriminator(x, data_mean, data_sd, gen_mean, gen_sd)` for normal distributions (use the normal density formula from the Naive Bayes lesson, or `scipy.stats.norm.pdf`).

Then, for real data N(4, 1.25²), store in `d_at_4` the optimal discriminator's output at x = 4 against a generator N(4, 0.25²) (the mode-collapsed generator from the lesson), and in `d_when_equal` its outputs at x = 2, 4 and 6 against a perfect generator N(4, 1.25²), as a NumPy array.

```python starter
import numpy as np

def optimal_discriminator(x, data_mean, data_sd, gen_mean, gen_sd):
    return np.full_like(np.asarray(x, dtype=float), 0.5)

d_at_4 = 0.0
d_when_equal = np.zeros(3)
print(d_at_4, d_when_equal)
```

```python solution
import numpy as np
from scipy.stats import norm

def optimal_discriminator(x, data_mean, data_sd, gen_mean, gen_sd):
    p_data = norm.pdf(x, data_mean, data_sd)
    p_gen = norm.pdf(x, gen_mean, gen_sd)
    return p_data / (p_data + p_gen)

d_at_4 = float(optimal_discriminator(4.0, 4, 1.25, 4, 0.25))
d_when_equal = optimal_discriminator(np.array([2.0, 4.0, 6.0]), 4, 1.25, 4, 1.25)
print(d_at_4, d_when_equal)
```

```python test
import numpy as _np
from scipy.stats import norm as _norm
assert "optimal_discriminator" in dir(), "Keep the function's name as optimal_discriminator."
_x = _np.array([-1.0, 0.0, 1.5, 3.0])
_pd, _pg = _norm.pdf(_x, 0.0, 1.0), _norm.pdf(_x, 1.0, 2.0)
assert _np.allclose(optimal_discriminator(_x, 0.0, 1.0, 1.0, 2.0), _pd / (_pd + _pg)), "D*(x) should be p_data / (p_data + p_gen), using normal densities with the given means and standard deviations."
assert _np.isclose(d_at_4, _norm.pdf(4, 4, 1.25) / (_norm.pdf(4, 4, 1.25) + _norm.pdf(4, 4, 0.25))), "d_at_4 is wrong."
assert d_at_4 < 0.5, "Where the collapsed generator piles up its samples, the best discriminator should say 'probably fake'."
assert _np.allclose(d_when_equal, 0.5), "When the generator matches the data exactly, the best discriminator can only say 0.5 everywhere."
f"SUCCESS: Against the collapsed generator, the best discriminator says 'real' with probability only {d_at_4:.2f} at x = 4, where the fakes crowd. Against a perfect generator it says 0.5 everywhere: the game's end point, where the critic can no longer tell."
```

Hint: `scipy.stats.norm.pdf(x, mean, sd)` gives the normal density. The rest is the formula; it works on arrays automatically.
:::

## What you learned

- A generative model produces new data like its training data. A plain autoencoder's decoder cannot, because its code space has gaps.
- A VAE's encoder outputs a mean and log-variance per code dimension; codes are sampled as z = μ + σε, and a KL penalty, −½(1 + log σ² − μ² − σ²), pulls each cloud towards N(0, 1). The code space fills in, and decoding draws from N(0, 1) generates new examples.
- The reparameterisation trick treats ε as a fixed input, so gradients reach μ (unchanged) and log σ² (times εσ/2); the KL penalty adds μ/n and (σ² − 1)/(2n).
- A GAN trains a generator to fool a discriminator that learns to tell real from fake; the generator's gradient flows back through the discriminator. The best discriminator is p_data/(p_data + p_gen), which is 0.5 everywhere when the generator is perfect.
- GAN training can circle instead of converging, and can collapse to a narrow range of outputs (mode collapse); the toy GAN's spread swung from 0.25 to nearly 2 around the target of 1.25.
- Diffusion models and autoregressive transformers are today's leading generators, built from the same ingredients.

The next lesson turns from networks back to probability: Bayesian inference, which treats the model's parameters themselves as uncertain, and updates a whole distribution over them as data arrives.
