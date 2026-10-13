"""The big equations of machine learning, built from Parts 1–4: regression, cross-entropy, softmax, backpropagation, Adam and attention."""
import math
from linalg import dot, least_squares, matvec, transpose
from symbols import mean, sigmoid

HOURS = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
SCORES = [52.0, 55.0, 61.0, 64.0, 70.0, 71.0]
STUDY = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
PASSED = [0, 0, 0, 1, 0, 1, 0, 1, 1, 1]


def mse(w, b, xs, ys):
    """J(w, b) = (1/n) Σ (ŷ_i − y_i)²: the mean squared error of the line ŷ = w x + b."""
    total = 0.0
    for x, y in zip(xs, ys):
        total += (w * x + b - y) ** 2
    return total / len(xs)


def mse_gradient(w, b, xs, ys):
    """∂J/∂w = (2/n) Σ (ŷ_i − y_i) x_i and ∂J/∂b = (2/n) Σ (ŷ_i − y_i), by the chain rule."""
    gw = 0.0
    gb = 0.0
    for x, y in zip(xs, ys):
        error = w * x + b - y
        gw += 2 * error * x / len(xs)
        gb += 2 * error / len(xs)
    return gw, gb


def fit_line(xs, ys, rate=0.02, steps=2000):
    """Gradient descent on the mean squared error: θ ← θ − η ∇J, `steps` times."""
    w = 0.0
    b = 0.0
    for _ in range(steps):
        gw, gb = mse_gradient(w, b, xs, ys)
        w = w - rate * gw
        b = b - rate * gb
    return w, b


def exact_line(xs, ys):
    """The same line in one step, from the normal equation XᵀX θ = Xᵀ y (Part 3)."""
    return least_squares(xs, ys)


def ridge_line(xs, ys, lam):
    """Ridge regression: minimise J + λ w², which adds n λ to one corner of XᵀX before solving."""
    n = len(xs)
    sxx = sum(x * x for x in xs)
    sx = sum(xs)
    sxy = sum(x * y for x, y in zip(xs, ys))
    sy = sum(ys)
    det = (sxx + n * lam) * n - sx * sx
    w = (n * sxy - sx * sy) / det
    b = ((sxx + n * lam) * sy - sx * sxy) / det
    return w, b


def bce(p, y):
    """Binary cross-entropy: −[y log p + (1 − y) log(1 − p)]. The negative log-likelihood of one yes/no answer."""
    return -(y * math.log(p) + (1 - y) * math.log(1 - p))


def fit_logistic(xs, ys, rate=0.1, steps=3000):
    """Logistic regression: p = σ(w x + b), trained on the average cross-entropy, whose gradient is (p − y) x."""
    w = 0.0
    b = 0.0
    for _ in range(steps):
        gw = 0.0
        gb = 0.0
        for x, y in zip(xs, ys):
            p = sigmoid(w * x + b)
            gw += (p - y) * x / len(xs)
            gb += (p - y) / len(xs)
        w = w - rate * gw
        b = b - rate * gb
    return w, b


def softmax(zs):
    """softmax(z)_i = e^(z_i) / Σ_j e^(z_j): any scores into probabilities. Subtracting the max changes nothing but avoids overflow."""
    top = max(zs)
    exps = [math.exp(z - top) for z in zs]
    s = sum(exps)
    return [e / s for e in exps]


def cross_entropy(p, target):
    """−log p_target: the cross-entropy against a one-hot answer."""
    return -math.log(p[target])


def entropy(p):
    """H(p) = −Σ p_i log p_i: how unpredictable a distribution is, in nats."""
    return -sum(pi * math.log(pi) for pi in p if pi > 0)


def kl(p, q):
    """KL(p ‖ q) = Σ p_i log(p_i / q_i): the extra cost of using q when the truth is p. Never negative."""
    return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q) if pi > 0)


def layer(W, b, x):
    """One layer: h = σ(W x + b), a sigmoid applied to every entry."""
    z = [zi + bi for zi, bi in zip(matvec(W, x), b)]
    return [sigmoid(zi) for zi in z]


def tiny_net(params, x):
    """A two-layer network: h = σ(W1 x + b1), ŷ = w2 · h + b2."""
    W1, b1, w2, b2 = params
    h = layer(W1, b1, x)
    return dot(w2, h) + b2, h


def backprop(params, x, y):
    """The gradient of (ŷ − y)² for every weight, by the chain rule from the output backwards."""
    W1, b1, w2, b2 = params
    y_hat, h = tiny_net(params, x)
    d_y = 2 * (y_hat - y)
    g_w2 = [d_y * hi for hi in h]
    g_b2 = d_y
    d_h = [d_y * wi for wi in w2]
    d_z = [dh * hi * (1 - hi) for dh, hi in zip(d_h, h)]
    g_W1 = [[dz * xj for xj in x] for dz in d_z]
    g_b1 = d_z
    return g_W1, g_b1, g_w2, g_b2


def adam(grad, x, y, rate=0.1, steps=100, beta1=0.9, beta2=0.999, eps=1e-8):
    """Adam on a 2-input loss: moving averages of the gradient (m) and of its square (v), bias-corrected."""
    m = [0.0, 0.0]
    v = [0.0, 0.0]
    theta = [x, y]
    for t in range(1, steps + 1):
        g = grad(theta[0], theta[1])
        for i in range(2):
            m[i] = beta1 * m[i] + (1 - beta1) * g[i]
            v[i] = beta2 * v[i] + (1 - beta2) * g[i] ** 2
            m_hat = m[i] / (1 - beta1 ** t)
            v_hat = v[i] / (1 - beta2 ** t)
            theta[i] = theta[i] - rate * m_hat / (math.sqrt(v_hat) + eps)
    return theta


def attention(Q, K, V):
    """softmax(Q Kᵀ / √d) V: each query takes a weighted average of the values, weighted by how well it matches each key."""
    d = len(K[0])
    out = []
    for q in Q:
        scores = [dot(q, k) / math.sqrt(d) for k in K]
        weights = softmax(scores)
        out.append([sum(w * v[j] for w, v in zip(weights, V)) for j in range(len(V[0]))])
    return out


def show_models():
    """Part 5's equations, each on its small example."""
    print("line by gradient descent:", fit_line(HOURS, SCORES), " exact:", exact_line(HOURS, SCORES))
    print("ridge with λ = 1:", ridge_line(HOURS, SCORES, 1.0))
    print("logistic regression:", fit_logistic(STUDY, PASSED))
    print("softmax of [2, 1, 0]:", softmax([2.0, 1.0, 0.0]))
    print("attention:", attention([[1.0, 0.0]], [[1.0, 0.0], [0.0, 1.0]], [[10.0, 0.0], [0.0, 10.0]]))
