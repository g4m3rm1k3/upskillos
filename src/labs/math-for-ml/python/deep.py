"""Deep learning and reinforcement learning, each equation as a short program: convolution as a sum
and as a matrix, initialisation's variance argument, layer and batch normalisation, inverted dropout,
a recurrent network with backpropagation through time, sinusoidal positions and a residual block,
the InfoNCE loss, the VAE's KL term and reparameterisation, the GAN optimum, the diffusion forward
process, value iteration, the score-function gradient, and PPO's clipped objective."""
import math
import random


def conv1d(x, k):
    """Slide the kernel along the signal: out[i] = Σⱼ k[j] x[i + j] (what deep-learning libraries call convolution)."""
    n = len(x) - len(k) + 1
    return [sum(k[j] * x[i + j] for j in range(len(k))) for i in range(n)]


def conv_matrix(k, n):
    """The same operation as a matrix: each row is the kernel shifted one place right."""
    rows = n - len(k) + 1
    return [[k[j - i] if 0 <= j - i < len(k) else 0.0 for j in range(n)] for i in range(rows)]


def conv2d(img, k):
    """Two-dimensional sliding window: each output is the kernel dotted with one patch of the image."""
    h, w = len(img) - len(k) + 1, len(img[0]) - len(k[0]) + 1
    return [[sum(k[a][b] * img[i + a][j + b] for a in range(len(k)) for b in range(len(k[0]))) for j in range(w)] for i in range(h)]


def activation_spread(depth, width, scale, seed=0):
    """Push a random input through `depth` ReLU layers whose weights have standard deviation scale/√width; record each layer's output spread."""
    rng = random.Random(seed)
    h = [rng.gauss(0, 1) for _ in range(width)]
    spreads = []
    for _ in range(depth):
        W = [[rng.gauss(0, scale / math.sqrt(width)) for _ in range(width)] for _ in range(width)]
        h = [max(0.0, sum(w * v for w, v in zip(row, h))) for row in W]
        spreads.append(math.sqrt(sum(v * v for v in h) / width))
    return spreads


def layer_norm(x, eps=1e-5):
    """Normalise one example's features to mean 0 and variance 1."""
    m = sum(x) / len(x)
    v = sum((a - m) ** 2 for a in x) / len(x)
    return [(a - m) / math.sqrt(v + eps) for a in x]


def batch_norm(batch, eps=1e-5):
    """Normalise each feature across the batch to mean 0 and variance 1."""
    cols = list(zip(*batch))
    out_cols = []
    for col in cols:
        m = sum(col) / len(col)
        v = sum((a - m) ** 2 for a in col) / len(col)
        out_cols.append([(a - m) / math.sqrt(v + eps) for a in col])
    return [list(row) for row in zip(*out_cols)]


def dropout(x, p, rng):
    """Inverted dropout: zero each entry with probability p, and scale survivors by 1/(1 − p) so the expectation is unchanged."""
    return [0.0 if rng.random() < p else a / (1 - p) for a in x]


def rnn_forward(w, u, xs, h0=0.0):
    """A one-number recurrent network: hₜ = tanh(w hₜ₋₁ + u xₜ)."""
    hs = [h0]
    for x in xs:
        hs.append(math.tanh(w * hs[-1] + u * x))
    return hs


def bptt(w, u, xs, target):
    """Backpropagation through time for L = (h_T − target)²: returns dL/dw, dL/du, and how strongly the loss reaches back to each step."""
    hs = rnn_forward(w, u, xs)
    dh = 2 * (hs[-1] - target)
    gw = gu = 0.0
    reach = []
    for t in range(len(xs), 0, -1):
        dz = dh * (1 - hs[t] ** 2)
        gw += dz * hs[t - 1]
        gu += dz * xs[t - 1]
        reach.append(abs(dh))
        dh = dz * w
    return gw, gu, reach[::-1]


def sinusoidal_position(pos, d):
    """The Transformer's position code: sines and cosines of pos at geometrically spaced frequencies."""
    out = []
    for i in range(d // 2):
        freq = 1 / 10000 ** (2 * i / d)
        out += [math.sin(pos * freq), math.cos(pos * freq)]
    return out


def residual_block(x, sublayer):
    """Pre-norm residual: x + sublayer(layer_norm(x)). The identity path lets signals and gradients pass straight through."""
    y = sublayer(layer_norm(x))
    return [a + b for a, b in zip(x, y)]


def info_nce(sim, tau=0.1):
    """InfoNCE for a batch whose matching pairs are on the diagonal: average cross-entropy of picking the right partner."""
    total = 0.0
    for i, row in enumerate(sim):
        logits = [s / tau for s in row]
        m = max(logits)
        lse = m + math.log(sum(math.exp(z - m) for z in logits))
        total += lse - logits[i]
    return total / len(sim)


def kl_to_standard_normal(mu, logvar):
    """KL(N(μ, σ²) ‖ N(0, 1)) = ½ (σ² + μ² − 1 − ln σ²), in closed form."""
    return 0.5 * (math.exp(logvar) + mu * mu - 1 - logvar)


def reparameterise(mu, logvar, eps):
    """z = μ + σ ε with ε ~ N(0, 1): the randomness moves into ε, so z is differentiable in μ and σ."""
    return mu + math.exp(0.5 * logvar) * eps


def gan_value(d, p_data, p_gen):
    """V(D, G) = E_data[log D] + E_gen[log(1 − D)] over a few discrete points."""
    return sum(p * math.log(d[i]) for i, p in enumerate(p_data) if p > 0) + sum(q * math.log(1 - d[i]) for i, q in enumerate(p_gen) if q > 0)


def optimal_discriminator(p_data, p_gen):
    """The best D for a fixed generator: D*(x) = p_data(x) / (p_data(x) + p_gen(x))."""
    return [p / (p + q) if p + q > 0 else 0.5 for p, q in zip(p_data, p_gen)]


def alpha_bar(betas, t):
    """ᾱₜ = Π (1 − βₛ) for s ≤ t: how much of the original signal survives t noising steps."""
    a = 1.0
    for b in betas[:t]:
        a *= 1 - b
    return a


def noisy_sample(x0, t, betas, eps):
    """Jump straight to step t: xₜ = √ᾱₜ x₀ + √(1 − ᾱₜ) ε."""
    a = alpha_bar(betas, t)
    return math.sqrt(a) * x0 + math.sqrt(1 - a) * eps


def value_iteration(P, R, gamma, iters=200):
    """Bellman optimality: V(s) ← maxₐ [R(s, a) + γ Σ P(s′|s, a) V(s′)], repeated until it settles."""
    V = [0.0] * len(P)
    for _ in range(iters):
        V = [max(R[s][a] + gamma * sum(p * V[s2] for p, s2 in P[s][a]) for a in range(len(P[s]))) for s in range(len(P))]
    return V


def score_function_gradient(theta, rewards, n, seed=0):
    """Estimate ∇ E[r] for a softmax policy over actions by averaging r(a) ∇ log π(a) over sampled actions."""
    rng = random.Random(seed)
    m = max(theta)
    e = [math.exp(t - m) for t in theta]
    pi = [v / sum(e) for v in e]
    g = [0.0] * len(theta)
    for _ in range(n):
        u, total, a = rng.random(), 0.0, len(pi) - 1
        for i, p in enumerate(pi):
            total += p
            if u < total:
                a = i
                break
        for k in range(len(theta)):
            g[k] += rewards[a] * ((1.0 if k == a else 0.0) - pi[k]) / n
    return g


def ppo_clip(ratio, advantage, eps=0.2):
    """PPO's per-sample objective: min(r A, clip(r, 1 − ε, 1 + ε) A)."""
    clipped = min(max(ratio, 1 - eps), 1 + eps)
    return min(ratio * advantage, clipped * advantage)


def show_deep():
    """Each deep-learning and reinforcement-learning equation, once."""
    print("convolution of 1..5 with (1, 0, -1):", conv1d([1, 2, 3, 4, 5], [1, 0, -1]))
    print("layer norm of (1, 2, 3):", layer_norm([1.0, 2.0, 3.0]))
    print("InfoNCE of a confident 2 × 2 batch:", info_nce([[0.9, 0.1], [0.2, 0.8]]))
    print("KL of N(1, 1) from N(0, 1):", kl_to_standard_normal(1.0, 0.0))
    print("ᾱ after two steps of β = 0.5:", alpha_bar([0.5, 0.5], 2))
    print("the GAN's best discriminator:", optimal_discriminator([0.5, 0.5], [0.25, 0.75]))
    print("PPO for r = 1.5, A = 2:", ppo_clip(1.5, 2.0))
