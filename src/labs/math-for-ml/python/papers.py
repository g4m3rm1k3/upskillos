"""Ten famous papers, each one's key equations as short programs: dropout as ridge regression, word2vec's
negative sampling and the number it learns, the VAE's estimators, Adam's step sizes and AdaMax, batch
normalisation's backward pass, residual connections and gradient flow, the Transformer's learning-rate
schedule and label smoothing, PPO's advantage estimates, DDPM's posterior and loss weights, and LoRA."""
import math
import random

from linalg import matvec
from matrices import solve


# ---- Dropout (Srivastava et al., 2014) ----

def dropout_loss_sampled(X, y, w, p, samples, seed=0):
    """The dropout loss ||y − (R∗X)w||², each input kept with probability p, averaged over random masks."""
    rng = random.Random(seed)
    total = 0.0
    for _ in range(samples):
        for row, target in zip(X, y):
            pred = sum(x * wj for x, wj in zip(row, w) if rng.random() < p)
            total += (target - pred) ** 2
    return total / samples


def dropout_loss_marginal(X, y, w, p):
    """Section 9.1's closed form: ||y − pXw||² + p(1 − p)||Γw||², where Γ² is the diagonal of XᵀX."""
    fit = sum((target - p * sum(x * wj for x, wj in zip(row, w))) ** 2 for row, target in zip(X, y))
    penalty = sum(wj * wj * sum(row[j] ** 2 for row in X) for j, wj in enumerate(w))
    return fit + p * (1 - p) * penalty


def dropout_ridge(X, y, p):
    """The weights that minimise the closed form: solve (p²XᵀX + p(1 − p)Γ²)w = pXᵀy."""
    D = len(X[0])
    G = [[sum(row[i] * row[j] for row in X) for j in range(D)] for i in range(D)]
    A = [[p * p * G[i][j] + (p * (1 - p) * G[i][i] if i == j else 0.0) for j in range(D)] for i in range(D)]
    b = [p * sum(row[i] * target for row, target in zip(X, y)) for i in range(D)]
    return solve(A, b)


# ---- word2vec (Mikolov et al., 2013) and InfoNCE (van den Oord et al., 2018) ----

def sigmoid(z):
    """σ(z) = 1/(1 + e^(−z))."""
    return 1 / (1 + math.exp(-z))


def negative_sampling(pos_score, neg_scores):
    """Eq. (4) for one pair, the expectation replaced by k drawn noise words: log σ(v′ᵀv) + Σ log σ(−v′ᵢᵀv)."""
    return math.log(sigmoid(pos_score)) + sum(math.log(sigmoid(-s)) for s in neg_scores)


def noise_distribution(counts, power=0.75):
    """P_n(w) ∝ U(w)^(3/4): the word counts raised to the power, then scaled to add up to 1."""
    raised = [c ** power for c in counts]
    total = sum(raised)
    return [r / total for r in raised]


def discard_probability(freq, t=1e-5):
    """Eq. (5): drop each occurrence of a word of frequency f with probability 1 − √(t/f), never below 0."""
    return max(0.0, 1 - math.sqrt(t / freq))


def pair_objective(x, n_pair, n_noise):
    """Every term of the objective that involves one (word, context) pair with score x: n_pair positive
    terms log σ(x) and, on average, n_noise negative terms log σ(−x)."""
    return n_pair * math.log(sigmoid(x)) + n_noise * math.log(sigmoid(-x))


def best_pair_score(n_pair, n_word, n_context, total, k):
    """Where pair_objective peaks when the noise is the plain word frequency: PMI(w, c) − log k."""
    return math.log(n_pair * total / (n_word * n_context)) - math.log(k)


def positive_posterior(ratios):
    """InfoNCE's eq. (5): the chance that sample i is the positive one, given each sample's p(x | c)/p(x)."""
    total = sum(ratios)
    return [r / total for r in ratios]


# ---- Auto-Encoding Variational Bayes (Kingma and Welling, 2013) ----

def log_normal(x, mean, var):
    """log N(x; mean, var)."""
    return -0.5 * math.log(2 * math.pi * var) - (x - mean) ** 2 / (2 * var)


def toy_elbo(x, mu, sigma):
    """Eq. (3) exactly, for the toy model z ~ N(0, 1), x | z ~ N(z, 1), with q(z) = N(μ, σ²)."""
    reconstruction = -0.5 * math.log(2 * math.pi) - ((x - mu) ** 2 + sigma ** 2) / 2
    kl = 0.5 * (sigma ** 2 + mu ** 2 - 1 - math.log(sigma ** 2))
    return reconstruction - kl


def estimator_a(x, mu, sigma, eps):
    """Eq. (6) with L = 1: log p(x, z) − log q(z) at the reparameterised sample z = μ + σε."""
    z = mu + sigma * eps
    return log_normal(z, 0, 1) + log_normal(x, z, 1) - log_normal(z, mu, sigma ** 2)


def estimator_b(x, mu, sigma, eps):
    """Eq. (7) with L = 1: the KL term exactly (appendix B), the reconstruction term from the sample."""
    z = mu + sigma * eps
    return -0.5 * (sigma ** 2 + mu ** 2 - 1 - math.log(sigma ** 2)) + log_normal(x, z, 1)


def mean_and_variance(values):
    """The average of some numbers, and their average squared distance from it."""
    mean = sum(values) / len(values)
    return mean, sum((v - mean) ** 2 for v in values) / len(values)


def estimator_spread(estimator, x, mu, sigma, n, seed=0):
    """The mean and variance of n single-sample estimates."""
    rng = random.Random(seed)
    return mean_and_variance([estimator(x, mu, sigma, rng.gauss(0, 1)) for _ in range(n)])


def gradient_estimates(mu, sigma, n, seed=0):
    """d/dμ of E[z²] for z ~ N(μ, σ²), which is exactly 2μ, estimated two ways from the same draws:
    section 2.2's score-function estimator f(z)·(z − μ)/σ², and the reparameterised 2(μ + σε)."""
    rng = random.Random(seed)
    score, reparam = [], []
    for _ in range(n):
        z = mu + sigma * rng.gauss(0, 1)
        score.append(z * z * (z - mu) / sigma ** 2)
        reparam.append(2 * z)
    return score, reparam


# ---- Adam (Kingma and Ba, 2015) ----

def adam_steps(grads, alpha=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
    """Algorithm 1 for one parameter, fed a given list of gradients: the step taken at each timestep."""
    m = v = 0.0
    steps = []
    for t, g in enumerate(grads, start=1):
        m = beta1 * m + (1 - beta1) * g
        v = beta2 * v + (1 - beta2) * g * g
        m_hat = m / (1 - beta1 ** t)
        v_hat = v / (1 - beta2 ** t)
        steps.append(-alpha * m_hat / (math.sqrt(v_hat) + eps))
    return steps


def adam_steps_reordered(grads, alpha=0.001, beta1=0.9, beta2=0.999, eps_hat=1e-8):
    """Section 2's faster order: both bias corrections folded into one step size α_t."""
    m = v = 0.0
    steps = []
    for t, g in enumerate(grads, start=1):
        m = beta1 * m + (1 - beta1) * g
        v = beta2 * v + (1 - beta2) * g * g
        alpha_t = alpha * math.sqrt(1 - beta2 ** t) / (1 - beta1 ** t)
        steps.append(-alpha_t * m / (math.sqrt(v) + eps_hat))
    return steps


def adamax_steps(grads, alpha=0.002, beta1=0.9, beta2=0.999):
    """Algorithm 2, AdaMax: the average of squared gradients replaced by a decaying maximum."""
    m = u = 0.0
    steps = []
    for t, g in enumerate(grads, start=1):
        m = beta1 * m + (1 - beta1) * g
        u = max(beta2 * u, abs(g))
        steps.append(-(alpha / (1 - beta1 ** t)) * m / u)
    return steps


# ---- Batch Normalization (Ioffe and Szegedy, 2015) ----

def bn_forward(xs, gamma, beta, eps=1e-5):
    """Algorithm 1 for one activation over a mini-batch: mean, variance, normalise, scale and shift."""
    m = len(xs)
    mu = sum(xs) / m
    var = sum((x - mu) ** 2 for x in xs) / m
    x_hat = [(x - mu) / math.sqrt(var + eps) for x in xs]
    return [gamma * h + beta for h in x_hat]


def bn_backward(xs, dys, gamma, eps=1e-5):
    """Section 3's six chain-rule equations, in the paper's order: from ∂ℓ/∂yᵢ to ∂ℓ/∂xᵢ, ∂ℓ/∂γ, ∂ℓ/∂β."""
    m = len(xs)
    mu = sum(xs) / m
    var = sum((x - mu) ** 2 for x in xs) / m
    x_hat = [(x - mu) / math.sqrt(var + eps) for x in xs]
    d_hat = [dy * gamma for dy in dys]
    d_var = sum(d * (x - mu) for d, x in zip(d_hat, xs)) * -0.5 * (var + eps) ** -1.5
    d_mu = sum(-d / math.sqrt(var + eps) for d in d_hat) + d_var * sum(-2 * (x - mu) for x in xs) / m
    dxs = [d / math.sqrt(var + eps) + d_var * 2 * (x - mu) / m + d_mu / m for d, x in zip(d_hat, xs)]
    return dxs, sum(dy * h for dy, h in zip(dys, x_hat)), sum(dys)


def bn_backward_compact(xs, dys, gamma, eps=1e-5):
    """The same ∂ℓ/∂xᵢ, simplified: (γ/(m·s))·(m·gᵢ − Σg − x̂ᵢ·Σ g x̂), where s = √(σ² + ε) and g = ∂ℓ/∂y."""
    m = len(xs)
    mu = sum(xs) / m
    s = math.sqrt(sum((x - mu) ** 2 for x in xs) / m + eps)
    x_hat = [(x - mu) / s for x in xs]
    g_sum, gx_sum = sum(dys), sum(g * h for g, h in zip(dys, x_hat))
    return [gamma / (m * s) * (m * g - g_sum - h * gx_sum) for g, h in zip(dys, x_hat)]


def bn_inference(batch_means, batch_vars, m, gamma, beta, eps=1e-5):
    """Algorithm 2's fixed layer for inference: the population mean and the unbiased variance from the
    training mini-batches, folded into one multiplication and one addition."""
    mean = sum(batch_means) / len(batch_means)
    var = m / (m - 1) * sum(batch_vars) / len(batch_vars)
    scale = gamma / math.sqrt(var + eps)
    return scale, beta - scale * mean


# ---- Deep Residual Learning (He et al., 2015; 2016) ----

def residual_unit(x, W1, W2):
    """Eq. (1) as the paper builds it (its Fig. 2): F = W₂σ(W₁x), then the output σ(F + x)."""
    hidden = [max(0.0, h) for h in matvec(W1, x)]
    return [max(0.0, f + a) for f, a in zip(matvec(W2, hidden), x)]


def random_matrix(n, scale, rng):
    """An n × n matrix of independent normal entries with standard deviation scale/√n."""
    return [[rng.gauss(0, scale / math.sqrt(n)) for _ in range(n)] for _ in range(n)]


def gradient_norm(depth, width, scale, residual, seed=0):
    """The length of ∂E/∂x₀ after a gradient of length 1 at the top is passed back through depth linear
    layers, plain (x ← Wx) or residual (x ← x + Wx)."""
    rng = random.Random(seed)
    layers = [random_matrix(width, scale, rng) for _ in range(depth)]
    g = [1 / math.sqrt(width)] * width
    for W in reversed(layers):
        back = [sum(W[i][j] * g[i] for i in range(width)) for j in range(width)]
        g = [a + b for a, b in zip(g, back)] if residual else back
    return math.sqrt(sum(a * a for a in g))


# ---- Attention Is All You Need (Vaswani et al., 2017) ----

def transformer_lrate(step, d_model=512, warmup=4000):
    """Eq. (3): rises in a straight line for the warmup steps, then falls as 1/√step."""
    return d_model ** -0.5 * min(step ** -0.5, step * warmup ** -1.5)


def smoothed_target(k, correct, eps=0.1):
    """Label smoothing with ε_ls = 0.1: the one-hot target mixed with the uniform distribution over k classes."""
    return [(1 - eps) * (1.0 if i == correct else 0.0) + eps / k for i in range(k)]


def cross_entropy(target, probs):
    """H(q, p) = −Σ q log p, skipping classes the target gives no weight."""
    return -sum(q * math.log(p) for q, p in zip(target, probs) if q > 0)


# ---- Proximal Policy Optimization (Schulman et al., 2017) ----

def td_errors(rewards, values, gamma):
    """Eq. (12) at every step: δ_t = r_t + γV(s_{t+1}) − V(s_t). values has one more entry: V(s_T)."""
    return [r + gamma * values[t + 1] - values[t] for t, r in enumerate(rewards)]


def gae(rewards, values, gamma=0.99, lam=0.95):
    """Eq. (11) for every t at once, computed backwards: Â_t = δ_t + γλ·Â_{t+1}, starting from 0."""
    deltas = td_errors(rewards, values, gamma)
    advantages = [0.0] * len(deltas)
    running = 0.0
    for t in reversed(range(len(deltas))):
        running = deltas[t] + gamma * lam * running
        advantages[t] = running
    return advantages


def gae_sum(rewards, values, gamma, lam, t):
    """Eq. (11) as a sum over the rest of the segment: Σ (γλ)^k δ_{t+k} for k = 0, …, T − t − 1."""
    deltas = td_errors(rewards, values, gamma)
    return sum((gamma * lam) ** k * deltas[t + k] for k in range(len(deltas) - t))


def segment_advantage(rewards, values, gamma, t):
    """Eq. (10): −V(s_t) + r_t + γr_{t+1} + … + γ^(T−t−1) r_{T−1} + γ^(T−t) V(s_T)."""
    T = len(rewards)
    return -values[t] + sum(gamma ** k * rewards[t + k] for k in range(T - t)) + gamma ** (T - t) * values[T]


def adapt_beta(beta, d, d_targ):
    """Section 4's rule: halve β if the KL came out well under target, double it if well over."""
    if d < d_targ / 1.5:
        return beta / 2
    if d > d_targ * 1.5:
        return beta * 2
    return beta


# ---- Denoising Diffusion Probabilistic Models (Ho et al., 2020) ----

def linear_betas(T=1000, first=1e-4, last=0.02):
    """Section 4's schedule: β₁, …, β_T rising in a straight line from 10⁻⁴ to 0.02 (β_t is betas[t − 1])."""
    return [first + (last - first) * i / (T - 1) for i in range(T)]


def alpha_bars(betas):
    """ᾱ_t = (1 − β₁)(1 − β₂)…(1 − β_t) for every t, as a running product."""
    out, prod = [], 1.0
    for b in betas:
        prod *= 1 - b
        out.append(prod)
    return out


def posterior(x0, xt, t, betas):
    """Eq. (7): the mean and variance of q(x_{t−1} | x_t, x₀), for t ≥ 2."""
    ab = alpha_bars(betas)
    beta, ab_t, ab_prev = betas[t - 1], ab[t - 1], ab[t - 2]
    mean = math.sqrt(ab_prev) * beta / (1 - ab_t) * x0 + math.sqrt(1 - beta) * (1 - ab_prev) / (1 - ab_t) * xt
    return mean, (1 - ab_prev) / (1 - ab_t) * beta


def posterior_by_bayes(x0, xt, t, betas):
    """The same posterior from Bayes' rule: multiply the two Gaussians in x_{t−1} and complete the square."""
    ab = alpha_bars(betas)
    beta, ab_prev = betas[t - 1], ab[t - 2]
    precision = (1 - beta) / beta + 1 / (1 - ab_prev)
    mean = (math.sqrt(1 - beta) * xt / beta + math.sqrt(ab_prev) * x0 / (1 - ab_prev)) / precision
    return mean, 1 / precision


def mean_from_noise(xt, noise, t, betas):
    """Eq. (11): the reverse step's mean written with the noise, (x_t − β_t/√(1 − ᾱ_t)·ε)/√α_t."""
    ab_t = alpha_bars(betas)[t - 1]
    beta = betas[t - 1]
    return (xt - beta / math.sqrt(1 - ab_t) * noise) / math.sqrt(1 - beta)


def loss_weight(t, betas, sigma2):
    """Eq. (12)'s weight on ‖ε − ε_θ‖² at step t: β_t²/(2σ_t² α_t (1 − ᾱ_t))."""
    ab_t = alpha_bars(betas)[t - 1]
    beta = betas[t - 1]
    return beta ** 2 / (2 * sigma2 * (1 - beta) * (1 - ab_t))


def prior_kl(x0, betas):
    """L_T for one coordinate, in nats: KL(N(√ᾱ_T x₀, 1 − ᾱ_T) ‖ N(0, 1))."""
    ab = alpha_bars(betas)[-1]
    return 0.5 * ((1 - ab) + ab * x0 * x0 - 1 - math.log(1 - ab))


# ---- LoRA (Hu et al., 2021) ----

def lora_forward(W0, B, A, x, alpha, r):
    """Eq. (3) with section 4.1's scaling: h = W₀x + (α/r)·BAx."""
    return [h + alpha / r * u for h, u in zip(matvec(W0, x), matvec(B, matvec(A, x)))]


def lora_merge(W0, B, A, alpha, r):
    """W = W₀ + (α/r)·BA: one ordinary matrix to deploy, so inference costs nothing extra."""
    return [[w + alpha / r * sum(B[i][s] * A[s][j] for s in range(r)) for j, w in enumerate(row)] for i, row in enumerate(W0)]


def lora_param_count(d, k, r):
    """Trainable numbers for one d × k matrix: full fine-tuning, and LoRA's B (d × r) plus A (r × k)."""
    return d * k, r * (d + k)


def lora_grads(B, A, x, grad_h, alpha, r):
    """Backpropagation through h = W₀x + (α/r)BAx: ∂ℓ/∂B = (α/r)·g(Ax)ᵀ and ∂ℓ/∂A = (α/r)·(Bᵀg)xᵀ."""
    Ax = matvec(A, x)
    Btg = [sum(B[i][s] * grad_h[i] for i in range(len(B))) for s in range(r)]
    dB = [[alpha / r * g * a for a in Ax] for g in grad_h]
    dA = [[alpha / r * u * xi for xi in x] for u in Btg]
    return dB, dA


def lora_train(target, inputs, r, rate, steps, seed=0):
    """Learn a layer's update ΔW = target by training only B and A (α = r, so the scale is 1): gradient
    descent on the mean squared error over the inputs. Returns the loss before each step."""
    rng = random.Random(seed)
    d, k = len(target), len(target[0])
    A = [[rng.gauss(0, 1 / math.sqrt(k)) for _ in range(k)] for _ in range(r)]
    B = [[0.0] * r for _ in range(d)]
    losses = []
    for _ in range(steps):
        loss, dB, dA = 0.0, [[0.0] * r for _ in range(d)], [[0.0] * k for _ in range(r)]
        for x in inputs:
            err = [u - v for u, v in zip(matvec(B, matvec(A, x)), matvec(target, x))]
            loss += sum(e * e for e in err) / len(inputs)
            gB, gA = lora_grads(B, A, x, [2 * e / len(inputs) for e in err], r, r)
            dB = [[a + b for a, b in zip(row, grow)] for row, grow in zip(dB, gB)]
            dA = [[a + b for a, b in zip(row, grow)] for row, grow in zip(dA, gA)]
        losses.append(loss)
        B = [[b - rate * g for b, g in zip(row, grow)] for row, grow in zip(B, dB)]
        A = [[a - rate * g for a, g in zip(row, grow)] for row, grow in zip(A, dA)]
    return losses


def show_papers():
    """One result from each paper, worked out once."""
    X, y = [[1.0, 2.0], [2.0, 0.5], [3.0, 3.0]], [5.0, 3.0, 9.0]
    print("dropout: sampled and closed-form loss:", dropout_loss_sampled(X, y, [1.0, 1.5], 0.8, 4000), dropout_loss_marginal(X, y, [1.0, 1.5], 0.8))
    print("word2vec: best score for a pair seen 50 times in 10⁶:", best_pair_score(50, 1000, 2000, 10 ** 6, 5))
    print("VAE: exact ELBO, and estimators A and B (mean, variance):", toy_elbo(1.0, 0.3, 0.9), estimator_spread(estimator_a, 1.0, 0.3, 0.9, 2000), estimator_spread(estimator_b, 1.0, 0.3, 0.9, 2000))
    print("Adam: steps for a constant gradient and a single spike:", adam_steps([1.0] * 3)[-1], adam_steps([0.0] * 999 + [1.0])[-1])
    print("batch norm: the paper's and the compact gradient:", bn_backward([1.0, 2.0, 4.0], [0.5, -1.0, 2.0], 1.5)[0], bn_backward_compact([1.0, 2.0, 4.0], [0.5, -1.0, 2.0], 1.5))
    print("ResNet: gradient size through 30 layers, plain and residual:", gradient_norm(30, 8, 0.5, False), gradient_norm(30, 8, 0.5, True))
    print("Transformer: learning rate at steps 1, 4000, 100000:", [transformer_lrate(s) for s in (1, 4000, 100000)])
    print("PPO: advantages with λ = 0.95:", gae([0.0, 0.0, 1.0], [0.5, 0.6, 0.9, 0.0]))
    print("DDPM: ᾱ at t = 1000, and the posterior at t = 500:", alpha_bars(linear_betas())[-1], posterior(0.8, 0.1, 500, linear_betas()))
    print("LoRA: trainable numbers for a 4096 × 4096 matrix at r = 8:", lora_param_count(4096, 4096, 8))
