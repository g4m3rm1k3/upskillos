"""Records what the real Python programs produce, for engine/parity.test.js to compare with the
JavaScript engine. Plain Python only. Regenerate after changing any program in python/:

    python3 src/labs/math-for-ml/tools/make_parity.py
"""
import json
import math
import random
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

import algorithms  # noqa: E402
import calculus  # noqa: E402
import deep      # noqa: E402
import learners  # noqa: E402
import chance    # noqa: E402
import linalg    # noqa: E402
import matrices  # noqa: E402
import models    # noqa: E402
import optimise  # noqa: E402
import proof     # noqa: E402
import stats     # noqa: E402
import symbols   # noqa: E402
import theory    # noqa: E402


def main():
    xs = [2.0, 4.0, 9.0]
    out = {
        "symbols": {"predict": symbols.predict(2, 1, 3), "total": symbols.total(xs), "mean": symbols.mean(xs), "product": symbols.product(xs),
                    "compound": [symbols.compound(n) for n in (1, 2, 12, 365, 1000)], "exp": [symbols.exp_series(x) for x in (-2, 0, 1, 2.5)],
                    "sigmoid": [symbols.sigmoid(z) for z in (-4, -1, 0, 0.5, 3)], "tiny": list(symbols.logs_of_tiny([0.1] * 30)),
                    "argmin": symbols.argmin(lambda x: (x - 3) ** 2, [0, 1, 2, 3, 4, 5, 6]),
                    "members": sorted(symbols.members(range(1, 31), lambda x: x % 2 == 0 and x % 3 == 0)),
                    "interval": [symbols.in_interval(x, -2, 3, br) for br in ("[]", "[)", "(]", "()") for x in (-2, 0, 3, 3.5)],
                    "implies": [symbols.implies(p, q) for p in (True, False) for q in (True, False)],
                    "forall": [symbols.for_all([2, 4, 6], lambda x: x % 2 == 0), symbols.for_all([2, 5, 6], lambda x: x % 2 == 0)],
                    "exists": [symbols.exists([1, 3, 4], lambda x: x % 2 == 0), symbols.exists([1, 3, 5], lambda x: x % 2 == 0)],
                    "relu": [symbols.relu(z) for z in (-2.5, 0, 0.5, 3)], "clip": [symbols.clip(r, 0.8, 1.2) for r in (0.5, 0.8, 1.0, 1.37)],
                    "accuracy": symbols.accuracy([1, 0, 1, 1, 0], [1, 1, 1, 0, 0]), "bounds": list(symbols.sum_bounds([0.2, 0.9, 0.4, 0.7]))},
        "proof": {"counter": proof.first_counterexample(lambda n: proof.is_prime(n * n + n + 41), range(100)), "factor": [proof.smallest_factor(n) for n in (2, 9, 91, 97, 30031)],
                  "euclid": list(proof.euclid_step([2, 3, 5, 7, 11, 13])), "sums": [[proof.sum_to(n), proof.gauss(n)] for n in (0, 1, 10, 100)],
                  "geometric": [list(proof.geometric(r, n)) for r, n in ((0.9, 10), (0.5, 20), (2.0, 8))], "factorial": [proof.factorial(n) for n in (0, 1, 5, 10, 15)],
                  "arrangements": [proof.arrangements(10, k) for k in range(5)], "choose": [proof.choose(10, k) for k in range(-1, 12)], "pascal": proof.pascal(8),
                  "pmf": [proof.binomial_pmf(k, 5, 0.3) for k in range(6)], "collision": [proof.collision_chance(k, 365) for k in (1, 10, 23, 50)]},
        "calculus": {"shrinking": calculus.shrinking(calculus.height, 1.0), "derivative": [calculus.derivative(calculus.sigmoid, z) for z in (-1, 0, 0.5, 2)],
                     "slope": [calculus.sigmoid_slope(z) for z in (-1, 0, 0.5, 2)], "descend": calculus.descend(lambda x: 2 * (x - 3), 0.0, 0.1, 10),
                     "descend2d": calculus.descend_2d(0.0, 0.0), "area": [calculus.area(lambda x: x * x, 0, 1), calculus.area(lambda x: x * x, 0, 1, 10)]},
        "calc2": {"delta": [calculus.delta_for(lambda x: 3 * x + 1, 2, 7, e) for e in (0.5, 0.01)], "tanh": [[calculus.tanh(z), calculus.tanh_slope(z)] for z in (-2, 0, 0.5)],
                  "logit": [[calculus.logit(p), calculus.logit_slope(p)] for p in (0.2, 0.5, 0.8)], "second": calculus.second_derivative(lambda x: x ** 3, 2.0),
                  "poly": [calculus.integrate_poly([3.0, 2.0, 5.0]), calculus.definite_poly([0.0, 0.0, 1.0], 0.0, 1.0), calculus.eval_poly([1.0, -4.0, 0.0, 2.0], 1.5)],
                  "moments": [calculus.normal_moment(k) for k in (0, 1, 2)], "taylor": calculus.taylor([1.0, 1.0, 1.0, 1.0], 0.0, 0.5), "texp": [list(calculus.taylor_exp(x, n)) for x, n in ((1.0, 10), (-2.0, 6))]},
        "many": {"total": linalg.total_derivative(lambda p: [2 * p[0], 2 * p[1]], lambda t: [t * t, 3 * t], lambda t: [2 * t, 3.0], 1.5),
                 "jac": linalg.jacobian(lambda v: [v[0] * v[1], v[0] + v[1] ** 2], [1.0, 2.0]), "smj": linalg.softmax_jacobian([0.5, 0.3, 0.2]),
                 "hess": linalg.hessian(lambda v: v[0] ** 2 * v[1] + v[1] ** 3, [1.0, 2.0])},
        "areas": {"double": stats.double_integral(lambda x, y: x * y + 1, 0.0, 1.0, 0.0, 2.0, 50), "ring": stats.ring_sum(lambda r: math.exp(-r * r / 2), 10.0)},
        "matrices": {"solve": matrices.solve([[2.0, 1.0, -1.0], [-3.0, -1.0, 2.0], [-2.0, 1.0, 2.0]], [8.0, -11.0, -3.0]), "coords": matrices.coordinates([[1.0, 1.0], [1.0, -1.0]], [5.0, 1.0]),
                     "cost": [matrices.elimination_cost(n) for n in (1, 2, 3, 10)], "rank": [matrices.rank(A) for A in ([[1.0, 2.0], [2.0, 4.0]], [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0], [7.0, 8.0, 9.0]], [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])],
                     "det": [matrices.determinant(A) for A in ([[2.0, 1.0], [1.0, 3.0]], [[0.0, 1.0], [1.0, 0.0]], [[2.0, 1.0, -1.0], [-3.0, -1.0, 2.0], [-2.0, 1.0, 2.0]])],
                     "gs": matrices.gram_schmidt([[1.0, 1.0, 0.0], [1.0, 0.0, 1.0], [0.0, 1.0, 1.0]]), "refl": matrices.reflection([0.6, 0.8]),
                     "eigen": list(matrices.symmetric_eigen([[4.0, 1.0, 0.0], [1.0, 3.0, 1.0], [0.0, 1.0, 2.0]])), "chol": matrices.cholesky([[4.0, 2.0], [2.0, 3.0]]),
                     "svd": list(matrices.svd([[3.0, 0.0], [4.0, 5.0]])), "low": matrices.low_rank([[1.0, 2.0, 3.0], [2.0, 4.1, 6.0], [1.0, 1.0, 1.0]], 1),
                     "trace": matrices.trace([[1.0, 2.0], [3.0, 4.0]]), "fro": matrices.frobenius([[1.0, 2.0], [3.0, 4.0]]), "qgrad": matrices.quadratic_gradient([[1.0, 2.0], [0.0, 3.0]], [1.0, -1.0]),
                     "shape": list(matrices.shape([[[1, 2, 3], [4, 5, 6]]] * 4)), "bias": matrices.add_bias([[1.0, 2.0], [3.0, 4.0]], [10.0, 20.0])},
        "chance": {"ie": float(chance.inclusion_exclusion([lambda o: o[0] == 6, lambda o: o[1] == 6, lambda o: o[0] + o[1] == 7], [(x, y) for x in range(1, 7) for y in range(1, 7)])),
                   "indep": [chance.independent(lambda o: o[0] % 2 == 0, lambda o: o[0] + o[1] == 7, [(x, y) for x in range(1, 7) for y in range(1, 7)]), chance.independent(lambda o: o[0] == 6, lambda o: o[0] + o[1] == 12, [(x, y) for x in range(1, 7) for y in range(1, 7)])],
                   "poisson": [chance.poisson_pmf(k, 3.0) for k in range(6)], "exppdf": [chance.exponential_pdf(x, 2.0) for x in (-1.0, 0.0, 0.5, 2.0)],
                   "expsamples": [chance.sample_exponential(2.0, r) for r in [random.Random(4)] for _ in range(5)], "cat": [chance.sample_categorical([0.2, 0.5, 0.3], r) for r in [random.Random(5)] for _ in range(12)],
                   "marg": sorted(chance.marginal({(0, 0): 0.1, (0, 1): 0.3, (1, 0): 0.2, (1, 1): 0.4}, 0).items()), "cond": sorted(chance.conditional_given_y({(0, 0): 0.1, (0, 1): 0.3, (1, 0): 0.2, (1, 1): 0.4}, 1).items()),
                   "var": chance.variance([1.0, 2.0, 4.0, 7.0]), "cheb": chance.chebyshev_bound(1.5, 100, 0.25), "running": chance.running_means(20, 3), "sums": chance.standardized_sums(12, 10, 2),
                   "mvn": [chance.mvn_pdf([0.5, -0.2], [0.0, 0.0], [[2.0, 0.6], [0.6, 1.0]]), chance.mvn_pdf([1.0, 1.0], [1.0, 0.0], [[1.0, 0.0], [0.0, 1.0]])],
                   "trans": chance.transformed_density(lambda x: math.exp(-x * x / 2) / math.sqrt(2 * math.pi), math.log, lambda y: 1 / y, 2.0),
                   "mc": chance.monte_carlo(lambda x: x * x, lambda r: r.random(), 1000, 6), "imp": chance.importance(lambda x: x, lambda x: 2 * x if 0 <= x <= 1 else 0.0, lambda x: 1.0, lambda r: r.random(), 1000, 7),
                   "jensen": chance.jensen_gap(lambda x: x * x, [1.0, 2.0, 6.0]), "H": [chance.entropy_bits([0.5, 0.5]), chance.entropy_bits([0.7, 0.2, 0.1])],
                   "mi": chance.mutual_information({(0, 0): 0.4, (0, 1): 0.1, (1, 0): 0.1, (1, 1): 0.4}), "stat": chance.stationary([[0.9, 0.1], [0.5, 0.5]]),
                   "boot": list(chance.bootstrap_interval([3, 7, 1, 9, 4, 6, 2, 8], chance.mean, 400, 1)), "perm": chance.permutation_p_value([1, 2, 3, 4], [3, 4, 5, 6, 7], 400, 2),
                   "beta": list(chance.beta_binomial(1, 1, 7, 3))},
        "optimise": {"convex": [optimise.is_convex_on(lambda x: x * x, -3, 3), optimise.is_convex_on(math.sin, -3, 3), optimise.is_convex_on(abs, -2, 2)],
                     "descent": [list(optimise.descent_step(lambda x: x * x, lambda x: 2 * x, 3.0, eta, 2.0)) for eta in (0.25, 0.5, 0.9)],
                     "newton": optimise.newton(lambda x: 4 * (x - 2) ** 3 + 2 * x, lambda x: 12 * (x - 2) ** 2 + 2, 0.0, 6),
                     "fullgrad": optimise.full_gradient(1.0, [1.0, 2.0, 3.0], [2.0, 4.1, 5.9]), "sgd": optimise.sgd([1.0, 2.0, 3.0, 4.0, 5.0], [2.1, 3.9, 6.2, 7.8, 10.1], 0.01, 2, 3, 1),
                     "mom": optimise.momentum(lambda x: 2 * (x - 3), 0.0, 0.05, 0.9, 20), "sched": [optimise.cosine_schedule(t, 100, 0.1, 0.001, 10) for t in (0, 5, 10, 55, 100)],
                     "circle": list(optimise.best_on_circle(lambda p: (p[0] - 2) ** 2 + (p[1] - 1) ** 2, 360)), "kkt": [list(optimise.kkt_bounded(c, 1.0)) for c in (0.5, 3.0)],
                     "pgd": optimise.projected_gd(lambda x: 2 * (x - 3), lambda x: min(x, 1.0), 0.0, 0.2, 10), "dual": [optimise.dual_value(l) for l in (0.0, 1.0, 2.0, 3.0)]},
        "algorithms": {"growth": list(algorithms.growth(20)), "bounded": [algorithms.bounded_by(lambda n: 3 * n * n + 10 * n, lambda n: n * n, 4, 10, 500), algorithms.bounded_by(lambda n: n * n, lambda n: 100 * n, 1, 1, 500)],
                       "matmul": algorithms.matmul_cost(3, 4, 5), "attention": algorithms.attention_cost(6, 4), "merge": list(algorithms.merge_sort([5, 2, 9, 1, 5, 6, 3, 8])),
                       "search": [list(algorithms.binary_search(list(range(100)), t)) for t in (0, 37, 99, 150)], "eps": algorithms.machine_epsilon(), "frexp": [list(algorithms.float_parts(x)) for x in (6.0, 0.1, 1024.0, -3.5)],
                       "lse": [algorithms.logsumexp([1.0, 2.0, 3.0]), algorithms.logsumexp([1000.0, 1001.0]), algorithms.naive_logsumexp([1.0, 2.0, 3.0])], "onepass": algorithms.one_pass_variance([1.0, 2.0, 4.0, 7.0]),
                       "lcg": algorithms.lcg(1, 5), "edit": [algorithms.edit_distance("kitten", "sitting"), algorithms.edit_distance("", "abc"), algorithms.edit_distance("flaw", "lawn")],
                       "viterbi": algorithms.viterbi([0, 1, 1, 0], [0.6, 0.4], [[0.7, 0.3], [0.4, 0.6]], [[0.9, 0.1], [0.2, 0.8]]), "walks": algorithms.walks([[0, 1, 1], [1, 0, 0], [1, 1, 0]], 3),
                       "pagerank": algorithms.pagerank([[0, 1, 1], [1, 0, 0], [1, 1, 0]]), "gnn": algorithms.gnn_layer([[0, 1, 0], [1, 0, 1], [0, 1, 0]], [[1.0, 0.0], [3.0, 2.0], [0.0, 4.0]]),
                       "hash": [algorithms.poly_hash(w, 97) for w in ("cat", "dog", "transformer")], "trick": algorithms.hashing_trick(["a", "b", "a", "cat"], 5)},
        "learners": {"poly": learners.fit_poly([0.0, 1.0, 2.0, 3.0], [1.0, 2.0, 5.0, 10.0], 2), "bv": [list(learners.bias_variance(d, 30, 10, 0.3, 1)) for d in (1, 2, 5)],
                     "nb": learners.predict_naive_bayes(learners.train_naive_bayes([["free", "money"], ["meeting", "today"], ["free", "offer"], ["project", "today"]], ["spam", "ham", "spam", "ham"]), ["free", "money", "today"])[1],
                     "kmeans": [list(x) for x in learners.kmeans([[0.0, 0.0], [0.0, 1.0], [5.0, 5.0], [6.0, 5.0], [0.5, 0.2], [5.5, 6.0]], 2, 10, 3)],
                     "em": [list(x) for x in learners.em_gmm([0.1, 0.3, -0.2, 4.9, 5.2, 5.1, 0.0, 4.8], [0.0, 1.0], 15)],
                     "hinge": learners.hinge_loss([0.5, -0.2], 0.1, [[1.0, 2.0], [-1.0, 0.5], [2.0, -1.0]], [1, -1, 1], 0.1),
                     "svm": [list(learners.svm_sgd([[1.0, 2.0], [2.0, 3.0], [-1.0, -1.0], [-2.0, -1.0]], [1, 1, -1, -1], 0.1, 30, 2)[0])],
                     "gini": [learners.gini(["a", "a", "b"]), learners.label_entropy(["a", "a", "b", "b"])], "split": list(learners.best_split([1, 2, 3, 4, 5, 6], [0, 0, 1, 0, 1, 1]))},
        "theory": {"tt": [list(theory.train_and_test(d, 20, 60)) for d in (1, 3, 9)], "kfold": theory.k_fold_error(*theory.make_data(30, 0.2, random.Random(1)), 3, 5),
                   "tails": [theory.chebyshev_tail(200, 0.1), theory.hoeffding_tail(200, 0.1), theory.simulated_tail(60, 0.1, 0.5, 300, 2)], "need": theory.samples_needed(0.05, 0.05),
                   "gap": theory.finite_class_gap(1000, 500, 0.05), "erm": list(theory.erm_thresholds(40, 11, 30, 3)),
                   "patterns": [len(theory.threshold_patterns([3.0, 1.0, 2.0, 5.0])), len(theory.interval_patterns([3.0, 1.0, 2.0, 5.0])), len(theory.halfplane_patterns([(0, 0), (1, 0), (1, 1), (0, 1)], 72)), len(theory.halfplane_patterns([(0, 0), (2, 0), (1, 2), (1, 0.5)], 72))],
                   "sauer": [theory.sauer_bound(n, d) for n, d in ((4, 3), (10, 2), (50, 5))], "fit": theory.fit_first_p([[1.0, 2.0, 0.5], [0.3, -1.0, 2.0]], [1.0, -1.0], 3),
                   "fit2": theory.fit_first_p([[1.0, 2.0], [0.3, -1.0], [2.0, 0.5]], [1.0, -1.0, 0.5], 1), "dd": theory.double_descent(12, 5, 0.2, 3, 4),
                   "gd": theory.gd_least_squares([[1.0, 2.0, 0.5], [0.3, -1.0, 2.0]], [1.0, -1.0], 0.1, 200)},
        "deep": {"conv1d": deep.conv1d([1.0, 2.0, 3.0, 4.0, 5.0], [1.0, 0.0, -1.0]), "convm": deep.conv_matrix([1.0, 0.0, -1.0], 5), "conv2d": deep.conv2d([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0], [7.0, 8.0, 9.0]], [[1.0, 0.0], [0.0, -1.0]]),
                 "spread": deep.activation_spread(4, 20, math.sqrt(2), 5), "ln": deep.layer_norm([1.0, 2.0, 4.0, 9.0]), "bn": deep.batch_norm([[1.0, 10.0], [2.0, 20.0], [6.0, 30.0]]),
                 "drop": deep.dropout([1.0, 2.0, 3.0, 4.0, 5.0], 0.4, random.Random(8)), "rnn": deep.rnn_forward(0.5, 1.0, [1.0, 0.0, -1.0]), "bptt": [list(x) if isinstance(x, list) else x for x in deep.bptt(0.8, 1.2, [1.0, -0.5, 0.3, 0.0], 0.4)],
                 "pe": deep.sinusoidal_position(3, 8), "res": deep.residual_block([1.0, 2.0, 3.0], lambda v: [2 * a for a in v]), "nce": deep.info_nce([[0.9, 0.1, 0.0], [0.2, 0.8, 0.3], [0.1, 0.4, 0.7]], 0.2),
                 "kl": [deep.kl_to_standard_normal(m, lv) for m, lv in ((0.0, 0.0), (0.5, -0.3), (-1.0, 0.7))], "rep": deep.reparameterise(0.5, -0.3, 1.2),
                 "gan": [deep.gan_value([0.7, 0.4, 0.2], [0.5, 0.5, 0.0], [0.2, 0.3, 0.5]), deep.optimal_discriminator([0.5, 0.5, 0.0], [0.2, 0.3, 0.5])],
                 "diff": [deep.alpha_bar([0.02] * 50, 30), deep.noisy_sample(1.5, 30, [0.02] * 50, -0.7)],
                 "vi": deep.value_iteration([[[(0.8, 1), (0.2, 0)], [(1.0, 0)]], [[(1.0, 1)], [(0.5, 0), (0.5, 1)]]], [[0.0, 1.0], [2.0, 0.5]], 0.9, 100),
                 "sfg": deep.score_function_gradient([0.2, -0.1, 0.4], [1.0, 3.0, -2.0], 500, 4), "ppo": [deep.ppo_clip(r, a) for r, a in ((1.5, 2.0), (0.5, 2.0), (1.5, -1.0), (0.5, -1.0), (1.1, 1.0))]},
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
