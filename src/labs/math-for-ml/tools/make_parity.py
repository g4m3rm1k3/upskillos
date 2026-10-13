"""Records what the real Python programs produce, for engine/parity.test.js to compare with the
JavaScript engine. Plain Python only. Regenerate after changing any program in python/:

    python3 src/labs/math-for-ml/tools/make_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

import calculus  # noqa: E402
import linalg    # noqa: E402
import models    # noqa: E402
import stats     # noqa: E402
import symbols   # noqa: E402


def main():
    xs = [2.0, 4.0, 9.0]
    out = {
        "symbols": {"predict": symbols.predict(2, 1, 3), "total": symbols.total(xs), "mean": symbols.mean(xs), "product": symbols.product(xs),
                    "compound": [symbols.compound(n) for n in (1, 2, 12, 365, 1000)], "exp": [symbols.exp_series(x) for x in (-2, 0, 1, 2.5)],
                    "sigmoid": [symbols.sigmoid(z) for z in (-4, -1, 0, 0.5, 3)], "tiny": list(symbols.logs_of_tiny([0.1] * 30)),
                    "argmin": symbols.argmin(lambda x: (x - 3) ** 2, [0, 1, 2, 3, 4, 5, 6])},
        "calculus": {"shrinking": calculus.shrinking(calculus.height, 1.0), "derivative": [calculus.derivative(calculus.sigmoid, z) for z in (-1, 0, 0.5, 2)],
                     "slope": [calculus.sigmoid_slope(z) for z in (-1, 0, 0.5, 2)], "descend": calculus.descend(lambda x: 2 * (x - 3), 0.0, 0.1, 10),
                     "descend2d": calculus.descend_2d(0.0, 0.0), "area": [calculus.area(lambda x: x * x, 0, 1), calculus.area(lambda x: x * x, 0, 1, 10)]},
        "linalg": {"norm": linalg.norm([3.0, 4.0]), "dot": linalg.dot([1.0, 2.0, 3.0], [4.0, -5.0, 6.0]), "cosine": linalg.cosine([1.0, 2.0], [2.0, 1.0]),
                   "matmul": linalg.matmul([[1.0, 2.0], [3.0, 4.0]], [[0.0, 1.0], [1.0, 0.0]]), "inverse": linalg.inverse2([[2.0, 1.0], [1.0, 3.0]]),
                   "solve": linalg.solve2([[2.0, 1.0], [1.0, 3.0]], [3.0, 5.0]), "lsq": linalg.least_squares([0, 1, 2], [1, 3, 4]),
                   "eigen": linalg.eigen2([[2.0, 1.0], [1.0, 3.0]]), "eigvec": linalg.eigenvector2([[2.0, 1.0], [1.0, 3.0]], linalg.eigen2([[2.0, 1.0], [1.0, 3.0]])[0])},
        "stats": {"p7": stats.probability(lambda t: t == 7, stats.two_dice()), "dist": [[k, v] for k, v in stats.distribution(stats.two_dice()).items()],
                  "E": stats.expectation(stats.distribution(stats.two_dice())), "Var": stats.variance(stats.distribution(stats.two_dice())),
                  "bayes": stats.bayes(0.01, 0.9, 0.05), "pdf": [stats.normal_pdf(x, 1.0, 2.0) for x in (-1, 0, 1, 3)],
                  "means": stats.sample_means(10, 50, 3), "L": [stats.likelihood(p, [1, 1, 0, 1, 0, 1, 1, 0, 1, 1]) for p in (0.3, 0.5, 0.7)],
                  "logL": [stats.log_likelihood(p, [1, 1, 0, 1, 0, 1, 1, 0, 1, 1]) for p in (0.3, 0.5, 0.7)],
                  "cov": stats.covariance([1, 2, 3, 4, 5], [2, 3, 5, 4, 6]), "rho": stats.correlation([1, 2, 3, 4, 5], [2, 3, 5, 4, 6]),
                  "pca": list(stats.pca2([1, 2, 3, 4, 5], [2, 3, 5, 4, 6]))},
        "models": {"mse": models.mse(4.0, 48.0, models.HOURS, models.SCORES), "grad": models.mse_gradient(0.0, 0.0, models.HOURS, models.SCORES),
                   "fit": models.fit_line(models.HOURS, models.SCORES), "exact": models.exact_line(models.HOURS, models.SCORES),
                   "ridge": [models.ridge_line(models.HOURS, models.SCORES, lam) for lam in (0.0, 1.0, 10.0)], "bce": [models.bce(0.8, 1), models.bce(0.8, 0)],
                   "logistic": models.fit_logistic(models.STUDY, models.PASSED), "softmax": models.softmax([2.0, 1.0, 0.0]),
                   "ce": models.cross_entropy(models.softmax([2.0, 1.0, 0.0]), 1), "entropy": models.entropy([0.5, 0.25, 0.25]), "kl": models.kl([0.7, 0.3], [0.5, 0.5]),
                   "backprop": models.backprop(([[0.5, -0.3], [0.2, 0.8]], [0.1, -0.1], [1.0, -1.0], 0.2), [1.0, 2.0], 1.0),
                   "adam": models.adam(calculus.bowl_gradient, 0.0, 0.0, 0.1, 50),
                   "attention": models.attention([[1.0, 0.0], [1.0, 1.0]], [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]], [[10.0, 0.0], [0.0, 10.0], [5.0, 5.0]])},
    }
    with open(os.path.join(HERE, "..", "engine", "parity.json"), "w") as f:
        json.dump(out, f)


if __name__ == "__main__":
    main()
