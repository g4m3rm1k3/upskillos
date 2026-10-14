"""Classical learners, each as a short program: polynomial fits for the bias–variance trade-off, naive
Bayes with add-one smoothing, k-means, a Gaussian mixture fitted by EM, a linear SVM trained on the
hinge loss, and the impurity measures and best split of a decision tree."""
import math
import random

from matrices import solve


def fit_poly(xs, ys, degree):
    """Least-squares polynomial: solve the normal equations for the coefficients of 1, x, x², …"""
    X = [[x ** p for p in range(degree + 1)] for x in xs]
    XtX = [[sum(r[i] * r[j] for r in X) for j in range(degree + 1)] for i in range(degree + 1)]
    Xty = [sum(r[i] * y for r, y in zip(X, ys)) for i in range(degree + 1)]
    return solve(XtX, Xty)


def poly_value(coeffs, x):
    """c₀ + c₁x + c₂x² + …"""
    return sum(c * x ** p for p, c in enumerate(coeffs))


def bias_variance(degree, trials=200, n=12, noise=0.3, seed=0):
    """Fit many datasets from y = x² − x + noise; at test points, measure the average fit's squared bias and the fits' variance."""
    rng = random.Random(seed)
    truth = lambda x: x * x - x
    tests = [i / 10 for i in range(-10, 11)]
    preds = [[] for _ in tests]
    for _ in range(trials):
        xs = [rng.uniform(-1, 1) for _ in range(n)]
        ys = [truth(x) + rng.gauss(0, noise) for x in xs]
        c = fit_poly(xs, ys, degree)
        for k, t in enumerate(tests):
            preds[k].append(poly_value(c, t))
    bias2 = sum((sum(p) / len(p) - truth(t)) ** 2 for p, t in zip(preds, tests)) / len(tests)
    var = sum(sum((v - sum(p) / len(p)) ** 2 for v in p) / len(p) for p in preds) / len(tests)
    return bias2, var


def train_naive_bayes(docs, labels):
    """Count words per class, with add-one smoothing, and the class frequencies: everything naive Bayes needs."""
    vocab = sorted({w for d in docs for w in d})
    classes = sorted(set(labels))
    prior = {c: labels.count(c) / len(labels) for c in classes}
    likelihood = {}
    for c in classes:
        counts = {w: 1 for w in vocab}
        for d, l in zip(docs, labels):
            if l == c:
                for w in d:
                    counts[w] += 1
        total = sum(counts.values())
        likelihood[c] = {w: counts[w] / total for w in vocab}
    return prior, likelihood


def predict_naive_bayes(model, doc):
    """Pick the class with the highest log P(class) + Σ log P(word | class), skipping unseen words."""
    prior, likelihood = model
    scores = {}
    for c in prior:
        scores[c] = math.log(prior[c]) + sum(math.log(likelihood[c][w]) for w in doc if w in likelihood[c])
    return max(scores, key=scores.get), scores


def kmeans(points, k, iters=20, seed=0):
    """Alternate: assign each point to its nearest centre, then move each centre to its points' mean. Returns centres, labels and the objective after each step."""
    rng = random.Random(seed)
    order = list(range(len(points)))
    rng.shuffle(order)
    centres = [list(points[i]) for i in order[:k]]
    history = []
    labels = [0] * len(points)
    for _ in range(iters):
        labels = [min(range(k), key=lambda c: sum((a - b) ** 2 for a, b in zip(p, centres[c]))) for p in points]
        for c in range(k):
            members = [p for p, l in zip(points, labels) if l == c]
            if members:
                centres[c] = [sum(col) / len(members) for col in zip(*members)]
        history.append(sum(sum((a - b) ** 2 for a, b in zip(p, centres[l])) for p, l in zip(points, labels)))
    return centres, labels, history


def normal(x, mu, var):
    """The one-dimensional normal density."""
    return math.exp(-(x - mu) ** 2 / (2 * var)) / math.sqrt(2 * math.pi * var)


def em_gmm(xs, mus, iters=30):
    """Fit a mixture of normals in 1D by EM: soft assignments (E), then weighted means, variances and weights (M)."""
    k = len(mus)
    mus = list(mus)
    vars_ = [1.0] * k
    weights = [1.0 / k] * k
    history = []
    for _ in range(iters):
        resp = []
        for x in xs:
            p = [weights[j] * normal(x, mus[j], vars_[j]) for j in range(k)]
            s = sum(p)
            resp.append([v / s for v in p])
        for j in range(k):
            nj = sum(r[j] for r in resp)
            mus[j] = sum(r[j] * x for r, x in zip(resp, xs)) / nj
            vars_[j] = max(sum(r[j] * (x - mus[j]) ** 2 for r, x in zip(resp, xs)) / nj, 1e-6)
            weights[j] = nj / len(xs)
        history.append(sum(math.log(sum(weights[j] * normal(x, mus[j], vars_[j]) for j in range(k))) for x in xs))
    return mus, vars_, weights, history


def hinge_loss(w, b, X, y, lam):
    """The SVM objective: λ/2 ‖w‖² plus the average of max(0, 1 − y (w·x + b))."""
    margins = [yi * (sum(wj * xj for wj, xj in zip(w, x)) + b) for x, yi in zip(X, y)]
    return lam / 2 * sum(wj * wj for wj in w) + sum(max(0.0, 1 - m) for m in margins) / len(X)


def svm_sgd(X, y, lam=0.01, epochs=200, seed=0):
    """Train a linear SVM by subgradient descent on the hinge loss, with step size 1/(λ t)."""
    rng = random.Random(seed)
    w = [0.0] * len(X[0])
    b = 0.0
    t = 0
    order = list(range(len(X)))
    for _ in range(epochs):
        rng.shuffle(order)
        for i in order:
            t += 1
            eta = 1 / (lam * t)
            margin = y[i] * (sum(wj * xj for wj, xj in zip(w, X[i])) + b)
            w = [wj * (1 - eta * lam) for wj in w]
            if margin < 1:
                w = [wj + eta * y[i] * xj for wj, xj in zip(w, X[i])]
                b += eta * y[i] * 0.1
    return w, b


def gini(labels):
    """Gini impurity: the chance two random picks (with replacement) have different labels, 1 − Σ pₖ²."""
    n = len(labels)
    return 1 - sum((labels.count(c) / n) ** 2 for c in set(labels))


def label_entropy(labels):
    """Entropy of the labels, in bits."""
    n = len(labels)
    return -sum((labels.count(c) / n) * math.log2(labels.count(c) / n) for c in set(labels))


def best_split(xs, ys):
    """The threshold on one feature that most reduces entropy (largest information gain)."""
    base = label_entropy(ys)
    best = (None, 0.0)
    for t in sorted(set(xs))[:-1]:
        left = [y for x, y in zip(xs, ys) if x <= t]
        right = [y for x, y in zip(xs, ys) if x > t]
        after = (len(left) * label_entropy(left) + len(right) * label_entropy(right)) / len(ys)
        if base - after > best[1]:
            best = (t, base - after)
    return best


def show_learners():
    """Each classical learner, once."""
    print("bias² and variance of a straight-line fit:", bias_variance(1, trials=20))
    model = train_naive_bayes([["free", "money"], ["meeting", "today"]], ["spam", "ham"])
    print("naive Bayes on 'free offer':", predict_naive_bayes(model, ["free", "offer"])[0])
    print("best split of 1..6 labelled 0,0,0,1,1,1:", best_split([1, 2, 3, 4, 5, 6], [0, 0, 0, 1, 1, 1]))
    print("Gini and entropy of a 50/50 group:", gini([0, 1]), label_entropy([0, 1]))
    print("k-means centres of four points:", kmeans([[0, 0], [0, 1], [5, 5], [5, 6]], 2, iters=3)[0])
    print("hinge loss of w = (1, 1), b = 0:", hinge_loss([1.0, 1.0], 0.0, [[1, 1], [-1, -1]], [1, -1], 0.1))
