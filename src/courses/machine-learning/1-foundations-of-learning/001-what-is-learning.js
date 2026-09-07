// Chapter ML1 — Lesson 1: What Learning Actually Is
//
// TEACHES:
//   The supervised learning problem stated formally: (H, L, D).
//   True risk vs. empirical risk, and why the gap between them IS the subject.
//   Empirical Risk Minimization as the algorithm behind almost every method.
//   The Bayes-optimal predictor and the irreducible error floor.
//   k-nearest-neighbours as the first concrete hypothesis class, built from scratch.
//
// DOES NOT TEACH (reserved for later):
//   Uniform convergence / VC dimension (Chapter 5)
//   Gradient-based optimization (Chapter 3) — kNN has no training step at all
//   Bias-variance decomposition (Chapter 5) — needs squared-loss machinery

export default {
  // ── Identity ───────────────────────────────────────────────────────────────
  id: 'ml1-001',
  slug: 'what-is-learning',
  chapter: 'ml1',
  order: 1,
  title: 'What Learning Actually Is',
  subtitle: 'Before any algorithm: the three things you choose, the one thing you never see, and the gap that every method in this course exists to close.',
  tags: ['risk', 'empirical risk', 'ERM', 'generalization', 'bayes error', 'knn', 'overfitting'],
  aliases: 'supervised learning setup hypothesis class loss function true risk empirical risk minimization generalization gap bayes optimal classifier nearest neighbours curse of dimensionality',
  timeToComplete: 45,
  coreConcept: 'Learning is choosing a hypothesis class H, a loss L, and then minimizing empirical risk on a finite sample as a proxy for the true risk you actually care about but can never compute. Every algorithm in this course is a different answer to "how do I make that proxy trustworthy?"',
  prerequisites: [],
  nextLesson: 'the-bayes-optimal-predictor',

  // ── Hook ───────────────────────────────────────────────────────────────────
  hook: {
    question: 'A program that memorizes every answer it has ever been shown scores 100% on its own study material. Why is that not learning — and how would you prove it is not, using only numbers?',
    realWorldContext:
      'You have logged 5,000 machining runs: spindle load, feed rate, RPM, tool age, and whether the tool failed mid-cut. You want a rule that tells you whether run number 5,001 is going to break a cutter. ' +
      'Here is the trap that swallows most first attempts. You can write a rule that is perfect on all 5,000 logged runs in about ten seconds: store the table, and when asked about a run, look it up. Zero errors. It is also completely worthless, because run 5,001 is not in the table. ' +
      'The entire discipline of machine learning grows out of that single gap — between performance on data you have and performance on data you do not. This lesson makes that gap a precise mathematical object, proves why it must exist, and then measures it on a dataset where we know the exact right answer in advance.',
    previewVisualizationId: 'PythonNotebook',
  },

  // ── Intuition ──────────────────────────────────────────────────────────────
  intuition: {
    blocks: [
      {
        type: 'prose',
        paragraphs: [
          '**Learning is not "finding patterns."** That phrase is the reason so many people study machine learning for a year and still cannot tell you what a model *is*. Let us replace it with something you can compute with.',
          'Supervised learning starts with three deliberate choices and one permanent limitation. The three choices are yours to make; the limitation is the reason the subject is hard.',
          '**Choice 1 — the hypothesis class $\\mathcal{H}$.** This is the set of candidate rules you are willing to consider. Not "all possible rules" — a specific, restricted set. Straight lines. Depth-4 decision trees. Neural networks with a fixed architecture. When you pick a model type, this is literally the only thing you are picking: *which rules am I allowed to return?*',
          '**Choice 2 — the loss $L(y, \\hat{y})$.** A number saying how bad it is to predict $\\hat{y}$ when the truth was $y$. This is where your engineering judgement enters the mathematics. Predicting "no tool failure" when the tool does fail costs you a scrapped part and possibly a spindle; predicting "failure" when nothing happens costs you an unnecessary tool change. Those are not equally bad, and the loss is where you say so.',
          '**Choice 3 — the data.** A finite sample $S = \\{(x_1, y_1), \\dots, (x_n, y_n)\\}$ drawn independently from some distribution $\\mathcal{D}$ over (input, output) pairs.',
        ],
      },
      {
        type: 'prose',
        paragraphs: [
          '**And the limitation: you never see $\\mathcal{D}$.** Not once, not ever, not even in principle. $\\mathcal{D}$ is the distribution of *all machining runs that could ever happen* — the ones you logged, the ones you will log next year, the ones on the machine you have not bought yet. You get $n$ samples from it and nothing more.',
          'This matters because the quantity you actually care about is defined in terms of $\\mathcal{D}$. For a candidate rule $h$, the **true risk** is the average loss over the whole distribution:',
          '$$R(h) \\;=\\; \\mathbb{E}_{(x,y) \\sim \\mathcal{D}}\\big[\\, L(y,\\, h(x)) \\,\\big]$$',
          'That is the number that decides whether your tool-failure predictor is worth deploying. It is also, by construction, **uncomputable**. The expectation is over a distribution you cannot access. You will never evaluate $R(h)$ for any $h$, in any project, for the rest of your career.',
        ],
      },
      {
        type: 'prose',
        paragraphs: [
          '**So we compute the thing we can.** Replace the expectation over $\\mathcal{D}$ with an average over the sample you happen to hold. That is the **empirical risk**:',
          '$$\\hat{R}_S(h) \\;=\\; \\frac{1}{n}\\sum_{i=1}^{n} L\\big(y_i,\\, h(x_i)\\big)$$',
          'Look carefully at what changed. The expectation $\\mathbb{E}_{(x,y)\\sim\\mathcal{D}}$ became a finite average $\\frac{1}{n}\\sum_{i=1}^n$. Everything else is identical. The empirical risk is a *sample estimate* of the true risk — and unlike $R(h)$, you can evaluate it in a loop.',
          '**Now the whole subject in one sentence:** we minimize $\\hat{R}_S$ because we can, we want $R$ minimized because it is what matters, and machine learning is the study of when the first gets you the second.',
        ],
      },
      {
        type: 'prose',
        paragraphs: [
          '**Empirical Risk Minimization (ERM).** Having named the proxy, the obvious algorithm is to minimize it over your hypothesis class:',
          '$$\\hat{h} \\;=\\; \\arg\\min_{h \\in \\mathcal{H}} \\; \\hat{R}_S(h)$$',
          'Read that as an instruction: *among the rules I am willing to consider, return the one that made the fewest mistakes on the data I have.* Linear regression is ERM with squared loss over linear functions. Logistic regression is ERM with log loss over linear functions. Training a neural network by backpropagation is (approximate) ERM with whatever loss you chose over whatever architecture you built. Chapters 2 through 11 of this course are, almost without exception, variations on this single line.',
          '**Before reading on, predict:** the lookup-table rule from the hook achieves $\\hat{R}_S(h) = 0$ — a perfect score on the proxy. What does ERM do when handed a hypothesis class rich enough to contain that table? Answer it before continuing.',
          '**ERM returns the table.** It has no choice: the table is a member of $\\mathcal{H}$, its empirical risk is zero, and zero is the minimum. ERM did exactly what it was told and produced something useless. This is not a bug in ERM — it is proof that ERM alone is an incomplete specification of learning, and the missing ingredient is a constraint on $\\mathcal{H}$. Hold that thought; we are about to watch it happen numerically.',
        ],
      },
      {
        type: 'prose',
        paragraphs: [
          '**A first hypothesis class: $k$-nearest neighbours.** We need something concrete, and $k$-NN is the most honest learner there is, because it wears the memorization problem on the outside.',
          'The rule: *to predict the label at a query point $x$, find the $k$ training points nearest to $x$ and take the majority vote of their labels.* That is the entire algorithm. There is no training step — the "model" is the training set itself.',
          '$k$-NN is perfect for this lesson because the knob $k$ moves it continuously between the two failure modes. At $k=1$ it is exactly the lookup table: the nearest neighbour of a training point is itself, at distance zero, so it reproduces every training label perfectly and $\\hat{R}_S = 0$. At $k=n$ every query averages the entire dataset and it predicts the majority class no matter what you ask. Somewhere between those extremes is the useful region, and we are going to find it by measurement rather than by assertion.',
        ],
      },
      {
        type: 'viz',
        id: 'PythonNotebook',
        title: 'Build the Whole Thing From Scratch',
        mathBridge: 'Five cells. Cell 1 constructs a dataset whose Bayes error we can compute in closed form — so for once we know the true answer. Cell 2 implements $k$-NN in vectorized NumPy, twice, and checks both against scikit-learn. Cell 3 measures $\\hat{R}_S$ and $R$ separately across $k$ and shows you the gap. Cell 4 destroys the model with pure noise. Cell 5 is yours to write.',
        caption: 'Run every cell in order — later cells depend on names bound in earlier ones.',
        initialProps: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'A dataset with a known right answer',
              prose: [
                'Almost every ML tutorial evaluates a model without knowing what score a *perfect* model would get. That makes the number meaningless — is 84% good? You cannot say. So we build a dataset where the best achievable accuracy is known exactly, in closed form, before we run anything.',
                'The construction: two classes, equally likely. Class 1 is drawn from a Gaussian centred at $+\\mu$, class 0 from a Gaussian centred at $-\\mu$, both with covariance $\\sigma^2 I$. The clouds overlap, so no rule — however clever, however much data — can separate them perfectly. That overlap is **irreducible error**, and it is a property of $\\mathcal{D}$, not of any model.',
                '`rng.integers(0, 2, size=n)` draws the labels first (equal priors, $\\mathbb{P}(Y{=}1) = \\mathbb{P}(Y{=}0) = 1/2$), then each point is drawn from the Gaussian belonging to its label. This is *generative* sampling: we simulate $\\mathcal{D}$ directly, which is exactly why we know its properties. In a real project $\\mathcal{D}$ is nature and you get only the sample.',
                '`np.where(y[:, None] == 1, MU, -MU)` picks the correct centre per point. `y[:, None]` reshapes the labels from shape `(n,)` to `(n, 1)`, which broadcasts against `MU` of shape `(2,)` to produce an `(n, 2)` array of centres — one row per sample. Broadcasting replaces a Python loop over 400 points with a single vectorized operation.',
                '**Why `.astype(np.intp)` on the labels.** This notebook runs in your browser under WebAssembly, which is a **32-bit** target — so NumPy\'s platform integer `np.intp` is `int32` here, while `rng.integers()` hands back `int64` regardless. `np.bincount` and fancy indexing both want `intp`, and NumPy refuses the `int64 → int32` narrowing as unsafe rather than silently truncating. On a normal 64-bit desktop the same code runs fine, because there `intp` *is* `int64` and no cast is needed. Casting to `np.intp` is correct on both. Filing this away now: "works on my machine, fails on the target" is very often a word-size or dtype assumption, and it is the kind of bug that never appears in the mathematics.',
                'For two Gaussians with shared covariance $\\sigma^2 I$ and equal priors, the Bayes error rate is $\\Phi(-\\|\\mu\\|/\\sigma)$, where $\\Phi$ is the standard normal CDF. We derive this from scratch in the Rigor tab. With $\\|\\mu\\| = 1$ and $\\sigma = 1$ it is $\\Phi(-1) \\approx 0.1587$. **No classifier can do better than 15.87% error on this problem.** Write that number down; every result below is measured against it.',
              ],
              code: `import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

rng = np.random.default_rng(0)

MU    = np.array([1.0, 0.0])   # class 1 centred at +MU, class 0 at -MU
SIGMA = 1.0
N     = 400

def sample(n, rng, noise_dims=0):
    """Draw n points from D. Extra noise_dims carry no information about y."""
    # .astype(np.intp): rng.integers gives int64, but this notebook runs on
    # wasm32 where the platform integer is 32-bit. np.bincount and fancy
    # indexing want intp, and NumPy refuses the int64 -> int32 narrowing.
    y = rng.integers(0, 2, size=n).astype(np.intp)       # labels first
    centres = np.where(y[:, None] == 1, MU, -MU)         # (n, 2)
    X = centres + SIGMA * rng.standard_normal((n, 2))    # (n, 2)
    if noise_dims > 0:
        junk = SIGMA * rng.standard_normal((n, noise_dims))
        X = np.hstack([X, junk])
    return X, y

X, y = sample(N, rng)

# The exact error rate of the best possible classifier on this distribution.
bayes_error = norm.cdf(-np.linalg.norm(MU) / SIGMA)

print("X.shape =", X.shape, "  y.shape =", y.shape)
print("class counts:", np.bincount(y))
print(f"Bayes error rate = {bayes_error:.4f}   <-- nothing can beat this")

fig, ax = plt.subplots(figsize=(6, 5))
ax.scatter(*X[y == 0].T, s=18, alpha=0.7, label="class 0", color="steelblue")
ax.scatter(*X[y == 1].T, s=18, alpha=0.7, label="class 1", color="darkorange")
ax.axvline(0, color="k", ls="--", lw=1.5, label="Bayes boundary (x=0)")
ax.set_title(f"Two overlapping Gaussians — Bayes error {bayes_error:.1%}")
ax.set_xlabel("feature 1"); ax.set_ylabel("feature 2")
ax.legend(); ax.set_aspect("equal"); ax.grid(alpha=0.3)
plt.tight_layout(); plt.show()`,
            },
            {
              id: 2,
              cellTitle: 'k-NN from scratch — the obvious way, then the way you would ship',
              prose: [
                'Writing the algorithm yourself is the point. You will never really believe a generalization gap you have not produced with your own code. We write it twice, because the difference between the two versions is exactly the difference between understanding an algorithm and being able to deploy it.',
                '**Version 1 — broadcasting.** `X_query[:, None, :] - X_train[None, :, :]` has shapes `(q, 1, d)` minus `(1, n, d)`, which broadcasts to `(q, n, d)`: the difference vector between *every* query point and *every* training point, with no loops. This is the single most important NumPy idiom in the course, and it is the clearest possible statement of what the algorithm does.',
                "It is also unshippable. That intermediate array holds $q \\times n \\times d$ floats. For 20,000 queries against 400 training points in 2 dimensions that is 128 MB — allocated all at once, to compute a `(20000, 400)` result that only needs 64 MB. The tensor is pure overhead, and it grows with $d$, so it explodes exactly when you add features.",
                '**Version 2 — the expansion trick.** Expand the squared norm:\n$$\\|a - b\\|^2 = (a-b)^\\top(a-b) = \\|a\\|^2 + \\|b\\|^2 - 2\\,a^\\top b$$\nEvery term is now computable without ever forming a difference. $\\|a\\|^2$ is one vector of length $q$, $\\|b\\|^2$ one vector of length $n$, and $a^\\top b$ is a single matrix product `Q @ X_train.T` of shape `(q, n)`. Peak memory drops from $O(qnd)$ to $O(qn)$ — **independent of the number of features** — and the matrix product runs through BLAS instead of a NumPy broadcast loop.',
                'Combined with query batching (`batch=1024`), peak memory becomes $O(\\text{batch} \\times n)$: a few megabytes regardless of how big the query set or the feature count grows. This is how every production nearest-neighbour implementation computes distances, including scikit-learn\'s.',
                '**One numerical caveat, and it is a real one.** The expansion subtracts two large nearly-equal quantities, so catastrophic cancellation can produce tiny negative "squared distances" (around $-10^{-13}$) for points that are nearly identical. Here it is harmless — we only ever compare distances, and the ordering survives — but if you were to take a square root you would get `nan`. Knowing which optimizations are safe *for your use of the result* is the engineering skill; the identity is just algebra.',
                '`np.argpartition(d2, kth=k-1, axis=1)[:, :k]` finds the $k$ smallest distances **without sorting**: quickselect in $O(n)$ rather than $O(n \\log n)$ for a full `argsort`. The returned indices are unordered, which is irrelevant — a majority vote does not care about the order of the votes.',
                '`(votes.sum(axis=1) * 2 > k)` is the majority test written to avoid floating-point division: the sum of 0/1 labels exceeds $k/2$ exactly when twice the sum exceeds $k$. We require odd $k$ so a tie is impossible.',
                '**The cost structure is the real lesson.** $k$-NN inverts the usual arrangement. Training is $O(1)$ — you store the array. Prediction is $O(nd)$ *per query*, and memory is $O(nd)$ forever, because the training set is the model. Compare a linear model: training is expensive once, then prediction is a single dot product and the data is discarded. This distinction, far more often than accuracy, is what decides whether $k$-NN can be deployed at all.',
              ],
              code: `import numpy as np

def knn_naive(X_train, y_train, X_query, k):
    """Version 1: clear, and allocates a (q, n, d) tensor. Small inputs only."""
    diff  = X_query[:, None, :] - X_train[None, :, :]   # (q, n, d)  <-- the problem
    d2    = np.einsum('qnd,qnd->qn', diff, diff)        # (q, n) squared distances
    nn    = np.argpartition(d2, kth=k - 1, axis=1)[:, :k]
    return (y_train[nn].sum(axis=1) * 2 > k).astype(np.intp)

def knn_predict(X_train, y_train, X_query, k, batch=1024):
    """Version 2: ||a-b||^2 = ||a||^2 + ||b||^2 - 2 a.b, batched. Memory O(batch*n)."""
    k    = min(k, len(X_train))                          # argpartition needs kth < n
    tr2  = np.einsum('nd,nd->n', X_train, X_train)       # ||x_i||^2, shape (n,)
    out  = np.empty(len(X_query), dtype=np.intp)         # intp: 32-bit here, 64-bit natively
    for s in range(0, len(X_query), batch):
        Q   = X_query[s:s + batch]
        q2  = np.einsum('qd,qd->q', Q, Q)                # ||x||^2, shape (b,)
        d2  = q2[:, None] + tr2[None, :] - 2.0 * (Q @ X_train.T)   # (b, n)
        nn  = np.argpartition(d2, kth=k - 1, axis=1)[:, :k]
        out[s:s + batch] = (y_train[nn].sum(axis=1) * 2 > k).astype(np.intp)
    return out

# --- Do the two versions agree, and do they match the reference? ----------
from sklearn.neighbors import KNeighborsClassifier

X_new, y_new = sample(200, rng)
print(f"{'k':>3} {'v1 vs v2':>10} {'vs sklearn':>12}")
print("-" * 27)
for k in (1, 5, 15):
    v1  = knn_naive(X, y, X_new, k)
    v2  = knn_predict(X, y, X_new, k)
    ref = KNeighborsClassifier(n_neighbors=k).fit(X, y).predict(X_new)
    print(f"{k:>3} {(v1 == v2).mean():>10.4f} {(v2 == ref).mean():>12.4f}")

# --- What the tensor would have cost --------------------------------------
q, n, d = 20_000, len(X), X.shape[1]
print(f"\\nFor q={q:,} queries against n={n} points in d={d}:")
print(f"  v1 peak intermediate: {q * n * d * 8 / 1e6:>8.1f} MB   (q*n*d floats)")
print(f"  v2 peak intermediate: {1024 * n * 8 / 1e6:>8.1f} MB   (batch*n floats)")

# --- The k=1 claim, verified rather than asserted ------------------------
print("\\nk=1 empirical risk on the TRAINING set:",
      1 - (knn_predict(X, y, X, k=1) == y).mean())
print("(zero, because each point is its own nearest neighbour at distance 0)")`,
            },
            {
              id: 3,
              cellTitle: 'The generalization gap, measured',
              prose: [
                'Now we compute both quantities from the theory — $\\hat{R}_S(h)$ and $R(h)$ — and put them on the same axes. This plot is the reason the lesson exists.',
                '$\\hat{R}_S(h)$ is easy: evaluate the classifier on the same data it was built from. That is `1 - accuracy` on `X, y`.',
                '$R(h)$ is genuinely uncomputable, so we do the next best thing and estimate it on 8,000 *fresh* samples drawn from the same $\\mathcal{D}$. Because those points were never seen during fitting, the estimate is unbiased (proved in the Rigor tab), and with 8,000 of them its standard error is about $\\sqrt{0.16 \\cdot 0.84 / 8000} \\approx 0.004$ — tight enough to read the curve honestly. **This is a luxury of simulation.** In a real project the held-out test set is your only access to $R$, which is why spending it carelessly is the most expensive mistake in applied ML.',
                'Read the output in this order. First, at $k=1$ the training error is exactly $0$ and the test error is the worst on the chart — the lookup table, caught in the act. Second, as $k$ grows the two curves converge and the test error falls to a minimum near the Bayes rate. Third, at large $k$ both rise together as the model becomes too rigid to represent the boundary.',
                'The vertical distance between the two curves is the **generalization gap**, $R(h) - \\hat{R}_S(h)$. Notice that it is *large exactly where the training error is small*. Training error is not a mild underestimate of test error — it is most misleading precisely when it looks best.',
              ],
              code: `import numpy as np
import matplotlib.pyplot as plt

# A large fresh sample stands in for the unreachable expectation over D.
X_test, y_test = sample(8_000, rng)

ks = [1, 3, 5, 9, 15, 25, 41, 65, 101, 161, 251, 399]
train_err, test_err = [], []

for k in ks:
    train_err.append(1 - (knn_predict(X, y, X,      k) == y).mean())
    test_err .append(1 - (knn_predict(X, y, X_test, k) == y_test).mean())

print(f"{'k':>5} {'emp. risk':>12} {'true risk':>12} {'gap':>9}")
print("-" * 41)
for k, tr, te in zip(ks, train_err, test_err):
    print(f"{k:>5} {tr:>12.4f} {te:>12.4f} {te - tr:>9.4f}")
print(f"\\nBayes error (unbeatable floor) = {bayes_error:.4f}")

fig, ax = plt.subplots(figsize=(7, 5))
ax.plot(ks, train_err, "o-", color="steelblue",  label="empirical risk (training)")
ax.plot(ks, test_err,  "s-", color="darkorange", label="true risk (estimated)")
ax.axhline(bayes_error, color="crimson", ls="--", lw=1.5, label="Bayes error (floor)")
ax.fill_between(ks, train_err, test_err, alpha=0.15, color="gray",
                label="generalization gap")
ax.set_xscale("log")
ax.set_xlabel("k  (log scale)   left = flexible, right = rigid")
ax.set_ylabel("0-1 loss")
ax.set_title("The gap is widest exactly where training error looks best")
ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout(); plt.show()

best = ks[int(np.argmin(test_err))]
print(f"Best k by true risk: {best}   (test error {min(test_err):.4f} "
      f"vs Bayes {bayes_error:.4f})")`,
            },
            {
              id: 4,
              cellTitle: 'Breaking it with information-free features',
              prose: [
                'This experiment separates two things that get confused constantly: a problem being *hard*, and a learner being *bad at it*.',
                'We append extra coordinates filled with pure Gaussian noise, statistically independent of $y$. The first two coordinates are untouched. Therefore the Bayes error is **unchanged at 15.87%** — the optimal rule simply ignores the junk dimensions, so the problem is exactly as solvable as it was. (The Rigor-tab derivation makes this explicit: the formula $\\Phi(-\\|\\mu\\|/\\sigma)$ contains no $d$.)',
                'But $k$-NN collapses, because "nearest" is computed over all $d$ coordinates and the noise dimensions dominate the distance. In $d$ dimensions, the squared distance between two points accumulates $d - 2$ terms of pure noise and only 2 terms of signal. The signal is drowned.',
                'This is the **curse of dimensionality**, and there is a clean way to see it. Consider training points spread over a unit hypercube in $d$ dimensions. To capture a fraction $r$ of them in a small sub-cube, that cube needs edge length $e = r^{1/d}$. For $r = 0.01$ and $d = 10$: $e = 0.01^{1/10} \\approx 0.63$. To find the nearest 1% of your data you must reach across 63% of the range of *every* feature. Those points are not "near" in any meaningful sense — the word "neighbourhood" has quietly stopped meaning anything.',
                '**Each measurement is averaged over 5 independent draws.** A single draw produces a visibly bumpy curve — at these sample sizes the trial-to-trial variation is comparable to the effect we are trying to see, and an unaveraged plot can even show the error *falling* as dimensions are added. That is noise, not a finding. Averaging is not cosmetic here; it is the difference between measuring the trend and measuring one sample of it. Expect one or two adjacent points to still sit out of order — five trials reduces the noise, it does not abolish it, and the honest reading of this plot is the overall climb from about $0.16$ to about $0.23$, not any single pairwise comparison.',
                '**Watch the first row.** With no noise dimensions the reported error comes out at roughly $0.158$ — a hair *below* the Bayes rate of $0.1587$, which the Rigor tab proves is impossible. Nothing is broken: this cell selects $k$ using the very test set it then reports, so the reported number is optimistically biased exactly as the warning callout describes, and the finite test set gives it about $\\pm 0.007$ of room to exploit. This is the "you cannot beat $R^*$" alarm from the Debugging tab firing on real numbers, in a case where we can see precisely why. In a project you would not have the Bayes rate available to catch it.',
                '**The distinction to carry forward:** the excess risk $R(\\hat{h}) - R^*$ splits into *approximation error* (your class $\\mathcal{H}$ cannot express the good rule) plus *estimation error* (it can, but $n$ samples were not enough to find it). Here approximation error is zero — $k$-NN can express the right boundary — and every bit of the damage is estimation error. Diagnosing which one you are suffering from determines whether you should buy more data or change the model, and it is the most valuable judgement in applied ML.',
              ],
              code: `import numpy as np
import matplotlib.pyplot as plt

TRIALS = 5          # average out trial-to-trial noise, or the trend is unreadable
dims    = [0, 2, 5, 10, 20, 50, 100]
results = []

for extra in dims:
    per_trial = []
    for t in range(TRIALS):
        Xtr, ytr = sample(N,     rng, noise_dims=extra)
        Xte, yte = sample(2_500, rng, noise_dims=extra)
        # Give k-NN every advantage: pick the best k using the TEST set itself.
        # (Deliberately dishonest -- see the warning callout in the Intuition tab.
        #  It is why row 1 lands just BELOW the supposedly unbeatable Bayes rate.)
        errs = [1 - (knn_predict(Xtr, ytr, Xte, k) == yte).mean()
                for k in (5, 15, 41, 101)]
        per_trial.append(min(errs))
    results.append(np.mean(per_trial))

print(f"{'total dims':>11} {'best kNN error':>16} {'Bayes error':>13}")
print("-" * 43)
for extra, err in zip(dims, results):
    print(f"{extra + 2:>11} {err:>16.4f} {bayes_error:>13.4f}")

# How wide must a neighbourhood be to hold 1% of the data?
print("\\nEdge length of a sub-cube holding 1% of a unit hypercube:")
for d in (1, 2, 5, 10, 50, 100):
    e = 0.01 ** (1 / d)
    verdict = "a real neighbourhood" if e < 0.3 else "the whole feature range"
    print(f"  d={d:>3}   edge = {e:.3f}   ({verdict})")

fig, ax = plt.subplots(figsize=(7, 5))
ax.plot([d + 2 for d in dims], results, "o-", color="darkorange",
        label="best achievable k-NN error")
ax.axhline(bayes_error, color="crimson", ls="--", lw=1.5,
           label="Bayes error — unchanged by noise")
ax.set_xlabel("total feature dimensions (2 informative + noise)")
ax.set_ylabel("0-1 loss")
ax.set_title("The problem got no harder. The learner got much worse.")
ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout(); plt.show()`,
            },
            {
              id: 'c1',
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Regression k-NN and a loss that is not 0-1',
              difficulty: 'medium',
              prompt:
                'Everything above used 0-1 loss and classification. The formalism does not care — change $L$ and $\\mathcal{Y}$ and it all still holds.\n\n' +
                'Write `knn_regress(X_train, y_train, X_query, k)` that returns the **mean** of the $k$ nearest neighbours\' targets instead of a majority vote, and evaluate it with squared loss $L(y, \\hat{y}) = (y - \\hat{y})^2$.\n\n' +
                'Then answer, in code:\n' +
                '1. What is the empirical risk at $k=1$? Explain the number you get.\n' +
                '2. Sweep $k$ and find where true risk is minimized.\n' +
                '3. As $k \\to n$, what constant does the prediction converge to? Prove it to yourself by printing both.\n\n' +
                'Target: $y = \\sin(2x) + \\varepsilon$ with $\\varepsilon \\sim \\mathcal{N}(0, 0.3^2)$. The irreducible error here is exactly $0.3^2 = 0.09$ — that is this problem\'s Bayes risk under squared loss.',
              code: `import numpy as np

rng2  = np.random.default_rng(7)
NOISE = 0.3

def sample_reg(n, rng):
    x = rng.uniform(-3, 3, size=(n, 1))
    y = np.sin(2 * x[:, 0]) + NOISE * rng.standard_normal(n)
    return x, y

Xtr, ytr = sample_reg(150,   rng2)
Xte, yte = sample_reg(4_000, rng2)

def knn_regress(X_train, y_train, X_query, k, batch=1024):
    # The distance machinery is identical to knn_predict in Cell 2.
    # Only the last line changes: average the neighbours instead of voting.
    ...

# 1. empirical risk at k=1  (use mean squared error)
# 2. sweep k, find the minimizer of true risk on (Xte, yte)
# 3. limit as k -> n: compare knn_regress(..., k=len(Xtr)) against ytr.mean()
`,
              hint: 'Copy knn_predict and change the final line from the majority vote to y_train[nn].mean(axis=1); the output array must be dtype=float, not int. At k=1 the empirical risk is 0 for exactly the reason it was 0 in classification — each training point is its own nearest neighbour. As k -> n every query averages the whole training set, so the prediction converges to the constant ytr.mean() for every input, and the true risk converges to the variance of y plus the squared bias of that constant.',
            },
          ],
        },
      },
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Lesson 1 of Chapter 1 — Foundations of Learning',
        body: '**Previous:** (start of course). Assumes the Python and Linear Algebra courses — specifically NumPy arrays, broadcasting, vector norms, and expectation.\n**This lesson:** The formal learning problem. Risk, empirical risk, ERM, the generalization gap, and $k$-NN as a first hypothesis class.\n**Next:** The Bayes-Optimal Predictor — deriving the best possible rule for any loss, and what the irreducible floor is made of.',
      },
      {
        type: 'definition',
        title: 'The Supervised Learning Problem (state this from memory)',
        body: 'Given a hypothesis class $\\mathcal{H}$, a loss $L : \\mathcal{Y} \\times \\mathcal{Y} \\to \\mathbb{R}_{\\geq 0}$, and a sample $S \\sim \\mathcal{D}^n$, find $h \\in \\mathcal{H}$ making the **true risk** small:\n$$R(h) = \\mathbb{E}_{(x,y)\\sim\\mathcal{D}}\\big[L(y, h(x))\\big]$$\nYou may only use the **empirical risk**:\n$$\\hat{R}_S(h) = \\frac{1}{n}\\sum_{i=1}^n L(y_i, h(x_i))$$\nEvery method in this course is a strategy for making the second a trustworthy stand-in for the first.',
      },
      {
        type: 'insight',
        title: 'Why the restriction to $\\mathcal{H}$ is the whole game',
        body: 'It is tempting to think a bigger hypothesis class is strictly better — more rules to choose from, so surely a better one is available. The lookup table refutes this. If $\\mathcal{H}$ contains every possible function, ERM will always return a memorizer, because memorizers achieve zero empirical risk and nothing beats zero.\n\nSo the restriction is not a regrettable limitation you accept for computational reasons. **It is the mechanism by which learning happens at all.** Choosing $\\mathcal{H}$ is choosing what you refuse to consider, and that refusal is what forces the algorithm to find structure instead of storage.',
      },
      {
        type: 'procedure',
        title: 'Procedure: Diagnose Any Trained Model in Three Numbers',
        body: 'Whenever a model underperforms, get these three numbers before changing anything:\n\nStep 1. Compute $\\hat{R}_S(\\hat{h})$ — error on the training data.\nStep 2. Compute $R(\\hat{h})$ — error on held-out data never used for fitting or selection.\nStep 3. Estimate or bound $R^*$ — the irreducible floor (label noise, sensor precision, genuine ambiguity).\n\nThen read the two gaps:\n\n• $R(\\hat{h}) - \\hat{R}_S(\\hat{h})$ **large** → estimation error. You are overfitting. Get more data, shrink $\\mathcal{H}$, or regularize.\n• $\\hat{R}_S(\\hat{h}) - R^*$ **large** → approximation error. You are underfitting. Your class cannot express the answer; more data will not help at all.\n\nThese call for opposite remedies, which is why guessing between them wastes so much time.',
      },
      {
        type: 'warning',
        title: 'The Most Expensive Mistake in Applied ML',
        body: 'The unbiasedness of held-out error (proved in the Rigor tab) holds **only for a hypothesis chosen independently of that data**. The moment you look at test-set performance and use it to pick $k$, pick an architecture, or decide to train longer, the test set has entered the selection process and its error is no longer an unbiased estimate of $R$ — it is optimistic, exactly like training error, just less obviously so.\n\nThis is why Cell 4 is deliberately labelled as *giving $k$-NN every advantage*: it selects $k$ using the test set, which inflates the reported performance. Legitimate practice needs three splits — train (fit), validation (select), test (report once).',
      },
      {
        type: 'insight',
        title: 'Stop and Think: Where Did the "Learning" Happen in $k$-NN?',
        body: '$k$-NN has no training step. No parameters are estimated, no optimization runs, nothing is fitted. It stores the data and does all its work at prediction time.\n\nSo is it learning? By our definition, unambiguously yes: it defines a hypothesis class (all rules expressible as $k$-neighbourhood votes over the sample), and it selects a member of that class using data. Nothing in the formalism requires an iterative fitting procedure. This matters because it shows the definition is about *the relationship between data and hypothesis*, not about gradient descent — and it is why the same theory covers decision trees, kernel machines, and transformers without modification.',
      },
      {
        type: 'strategy',
        title: 'Reading Any New Algorithm: Three Questions',
        body: 'For the rest of this course, when you meet an unfamiliar method, do not ask "what does it do?" Ask:\n\n**1. What is $\\mathcal{H}$?** Which rules can it possibly return? (Linear functions? Piecewise-constant regions? Compositions of affine maps and nonlinearities?)\n**2. What is $L$?** What is it treating as an error, and with what relative weight?\n**3. How does it search $\\mathcal{H}$?** Closed-form solution, greedy construction, gradient descent, or no search at all?\n\nEvery algorithm in Chapters 2–11 is fully specified by those three answers. This is the difference between learning fifty algorithms and learning one framework instantiated fifty ways.',
      },
    ],
  },

  // ── Math ───────────────────────────────────────────────────────────────────
  math: {
    prose: [
      '**Setup and notation.** Let $\\mathcal{X}$ be the input space and $\\mathcal{Y}$ the output space. A sample is a pair $(x, y) \\in \\mathcal{X} \\times \\mathcal{Y}$ drawn from a fixed but unknown joint distribution $\\mathcal{D}$. Note carefully that $\\mathcal{D}$ is a distribution over *pairs*, not over inputs with a deterministic label attached — this is what lets the same $x$ carry different labels on different occasions, which is exactly the situation in the tool-failure problem and the reason a nonzero error floor exists.',
      '**Loss.** A loss function $L : \\mathcal{Y} \\times \\mathcal{Y} \\to \\mathbb{R}_{\\geq 0}$ scores a prediction against a truth. The two we use immediately:\n$$L_{0\\text{-}1}(y, \\hat{y}) = \\mathbb{1}[y \\neq \\hat{y}] \\qquad L_{\\text{sq}}(y, \\hat{y}) = (y - \\hat{y})^2$$\nThe indicator $\\mathbb{1}[\\cdot]$ is $1$ when its argument is true and $0$ otherwise. Under $L_{0\\text{-}1}$, risk is precisely the probability of a mistake — a fact we use constantly.',
      '**True risk (generalization error).** For a fixed hypothesis $h : \\mathcal{X} \\to \\mathcal{Y}$,\n$$R(h) \\;=\\; \\mathbb{E}_{(x,y)\\sim\\mathcal{D}}\\big[L(y, h(x))\\big].$$\nUnder 0-1 loss this simplifies, because the expectation of an indicator is the probability of the event it indicates:\n$$R_{0\\text{-}1}(h) = \\mathbb{E}\\big[\\mathbb{1}[y \\neq h(x)]\\big] = \\mathbb{P}_{(x,y)\\sim\\mathcal{D}}\\big[h(x) \\neq y\\big].$$',
      '**Empirical risk.** Given $S = \\{(x_i,y_i)\\}_{i=1}^n$ drawn i.i.d. from $\\mathcal{D}$,\n$$\\hat{R}_S(h) \\;=\\; \\frac{1}{n}\\sum_{i=1}^n L(y_i, h(x_i)).$$\nThe i.i.d. assumption is doing real work here and is not a formality. It fails, silently and destructively, whenever your data has temporal structure (consecutive machining runs on a wearing tool are correlated), grouping (many samples per part), or drift (last year\'s process is not this year\'s). Most real-world "the model worked in testing and failed in production" stories are violations of this one line.',
      '**Empirical Risk Minimization.** The ERM hypothesis is $\\hat{h}_S = \\arg\\min_{h \\in \\mathcal{H}} \\hat{R}_S(h)$, with ties broken arbitrarily. Note that $\\hat{h}_S$ is a *random variable*: it is a function of the random sample $S$. Draw a different sample and you get a different hypothesis. Almost every subtlety in learning theory traces back to this dependence.',
      '**The Bayes-optimal predictor.** Among *all* measurable functions — not merely those in $\\mathcal{H}$ — one minimizes the true risk. Under 0-1 loss it is\n$$h^*(x) = \\arg\\max_{c \\in \\mathcal{Y}} \\; \\mathbb{P}(Y = c \\mid X = x),$$\nand its risk $R^* = R(h^*)$ is the **Bayes risk**, the irreducible floor. Proved in the Rigor tab.',
      '**The excess risk decomposition.** For any learned $\\hat{h} \\in \\mathcal{H}$, add and subtract $\\inf_{h\\in\\mathcal{H}} R(h)$:\n$$\\underbrace{R(\\hat{h}) - R^*}_{\\text{excess risk}} \\;=\\; \\underbrace{\\Big(R(\\hat{h}) - \\inf_{h\\in\\mathcal{H}} R(h)\\Big)}_{\\text{estimation error}} \\;+\\; \\underbrace{\\Big(\\inf_{h\\in\\mathcal{H}} R(h) - R^*\\Big)}_{\\text{approximation error}}$$\nApproximation error is the price of restricting to $\\mathcal{H}$ — it would persist with infinite data. Estimation error is the price of having only $n$ samples — it vanishes as $n \\to \\infty$ for well-behaved classes. Enlarging $\\mathcal{H}$ decreases the first term and increases the second. That tension is the bias–variance tradeoff, which we formalize under squared loss in Chapter 5.',
      '**The $k$-NN hypothesis, precisely.** Given $S$ and a query $x$, let $\\pi_1(x), \\dots, \\pi_n(x)$ index the training points sorted by increasing $\\|x - x_{\\pi_i(x)}\\|_2$. Then\n$$h_{k,S}(x) \\;=\\; \\arg\\max_{c \\in \\mathcal{Y}} \\; \\sum_{i=1}^{k} \\mathbb{1}\\big[y_{\\pi_i(x)} = c\\big].$$\nFor regression under squared loss the vote is replaced by an average, $h_{k,S}(x) = \\frac{1}{k}\\sum_{i=1}^k y_{\\pi_i(x)}$ — which, as Challenge 1 asks you to discover, is not an arbitrary substitution but the minimizer of squared loss over a local neighbourhood.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Empirical Risk is Unbiased — For a Fixed Hypothesis',
        body: 'If $h$ is chosen **independently of $S$**, and $S \\sim \\mathcal{D}^n$ i.i.d., then\n$$\\mathbb{E}_S\\big[\\hat{R}_S(h)\\big] = R(h).$$\nThe emphasised clause is the entire content of the theorem. Remove it and the conclusion is false — see the companion theorem on the optimism of ERM.',
      },
      {
        type: 'theorem',
        title: 'ERM is Optimistically Biased',
        body: 'Let $\\hat{h}_S = \\arg\\min_{h\\in\\mathcal{H}} \\hat{R}_S(h)$. Then\n$$\\mathbb{E}_S\\big[\\hat{R}_S(\\hat{h}_S)\\big] \\;\\leq\\; \\inf_{h \\in \\mathcal{H}} R(h).$$\nThe training error of the *selected* hypothesis is, in expectation, at least as good as the true risk of the *best* hypothesis in the class. Training error therefore cannot be used to estimate generalization — not approximately, not with a correction factor, not at all. It is biased downward by construction.',
      },
      {
        type: 'theorem',
        title: 'Cover & Hart (1967) — the 1-NN Asymptotic Bound',
        body: 'For binary classification under mild regularity conditions, as $n \\to \\infty$ the risk of the 1-nearest-neighbour rule satisfies\n$$R^* \\;\\leq\\; R_{1\\text{NN}} \\;\\leq\\; 2R^*(1 - R^*) \\;\\leq\\; 2R^*.$$\nA remarkable result: the crudest conceivable learner, with no training and no parameters, is asymptotically within a factor of two of the theoretical optimum. It is also a caution — "asymptotically" is doing heavy lifting, and Cell 4 shows how brutally the required $n$ grows with dimension.',
      },
      {
        type: 'insight',
        title: 'Why We Never Take the Square Root of a Distance',
        body: '$k$-NN needs to know which points are nearest, not how far away they are. Since $t \\mapsto \\sqrt{t}$ is strictly increasing on $[0,\\infty)$, the ordering of $\\|a - b\\|_2^2$ is identical to the ordering of $\\|a - b\\|_2$. Skipping the root removes one transcendental operation per pair — for a query against $n = 10^6$ training points, a measurable saving with no change whatsoever in output.\n\nRecognising when a monotone transformation can be dropped is a recurring optimization throughout this course. You will meet it again when we maximize log-likelihood instead of likelihood, and when we subtract the max before exponentiating in softmax.',
      },
    ],
    visualizations: [],
  },

  // ── Rigor ──────────────────────────────────────────────────────────────────
  rigor: {
    prose: [
      '**Theorem 1 (Unbiasedness of empirical risk for a fixed $h$).** Let $h$ be fixed independently of $S$, and let $S = \\{(x_i,y_i)\\}_{i=1}^n \\sim \\mathcal{D}^n$ i.i.d. Then $\\mathbb{E}_S[\\hat{R}_S(h)] = R(h)$.',
      '*Proof.* By linearity of expectation, which holds without any independence assumption:\n$$\\mathbb{E}_S\\big[\\hat{R}_S(h)\\big] = \\mathbb{E}_S\\left[\\frac{1}{n}\\sum_{i=1}^n L(y_i, h(x_i))\\right] = \\frac{1}{n}\\sum_{i=1}^n \\mathbb{E}\\big[L(y_i, h(x_i))\\big].$$\nEach $(x_i,y_i)$ is distributed as $\\mathcal{D}$, and $h$ is a fixed function, so $L(y_i, h(x_i))$ is a fixed function of a $\\mathcal{D}$-distributed pair. Hence every term equals $\\mathbb{E}_{(x,y)\\sim\\mathcal{D}}[L(y,h(x))] = R(h)$, giving $\\frac{1}{n} \\cdot n \\cdot R(h) = R(h)$. $\\blacksquare$',
      '**Where the proof breaks for $\\hat{h}_S$.** The step "each term equals $R(h)$" requires $h$ to be non-random with respect to $S$. If $h = \\hat{h}_S$, then $h$ depends on the very same $(x_i, y_i)$ appearing inside the loss, and $L(y_i, \\hat{h}_S(x_i))$ is no longer a fixed function of a $\\mathcal{D}$-distributed pair. Locating the precise line where a proof fails is more instructive than the proof itself: it tells you exactly which experimental protocols are safe. Any hypothesis selected without consulting a given dataset may be honestly evaluated on it; any hypothesis selected using it may not.',
      '**Theorem 2 (Optimism of ERM).** With $\\hat{h}_S = \\arg\\min_{h\\in\\mathcal{H}}\\hat{R}_S(h)$, we have $\\mathbb{E}_S[\\hat{R}_S(\\hat{h}_S)] \\leq \\inf_{h\\in\\mathcal{H}} R(h)$.',
      '*Proof.* Fix any $g \\in \\mathcal{H}$. Since $\\hat{h}_S$ minimizes empirical risk over $\\mathcal{H}$, we have $\\hat{R}_S(\\hat{h}_S) \\leq \\hat{R}_S(g)$ pointwise, for every realization of $S$. Expectation is monotone, so $\\mathbb{E}_S[\\hat{R}_S(\\hat{h}_S)] \\leq \\mathbb{E}_S[\\hat{R}_S(g)]$. But $g$ is fixed and independent of $S$, so Theorem 1 applies and gives $\\mathbb{E}_S[\\hat{R}_S(g)] = R(g)$. Therefore $\\mathbb{E}_S[\\hat{R}_S(\\hat{h}_S)] \\leq R(g)$ for every $g \\in \\mathcal{H}$, and taking the infimum over $g$ yields the claim. $\\blacksquare$',
      '**Reading Theorem 2.** It says something stronger than "training error is too low." It says the expected training error of whatever you selected sits below the true risk of the single best hypothesis your class contains — a target you could not beat even with infinite data. So training error does not merely underestimate $R(\\hat{h}_S)$; it underestimates the best possible risk in $\\mathcal{H}$. This is why Cell 3 shows $\\hat{R}_S = 0$ at $k=1$ while the Bayes floor is $0.1587$: zero is not just optimistic, it is below a quantity nothing can go below.',
      '**Theorem 3 (Bayes optimality under 0-1 loss).** Define $h^*(x) = \\arg\\max_{c} \\mathbb{P}(Y = c \\mid X = x)$. Then $R(h^*) \\leq R(h)$ for every measurable $h : \\mathcal{X} \\to \\mathcal{Y}$.',
      '*Proof.* Condition on $X$ and use the tower property, $\\mathbb{E}[Z] = \\mathbb{E}_X[\\mathbb{E}[Z \\mid X]]$:\n$$R(h) = \\mathbb{P}(h(X) \\neq Y) = \\mathbb{E}_X\\big[\\mathbb{P}(Y \\neq h(X) \\mid X)\\big] = \\mathbb{E}_X\\big[1 - \\mathbb{P}(Y = h(X) \\mid X)\\big].$$\nThe outer expectation is over $X$ alone, and the integrand depends on $h$ only through the single value $h(x)$ at that same $x$. So we may minimize the integrand **separately at each $x$**, with no interaction between different inputs. At a given $x$, minimizing $1 - \\mathbb{P}(Y = h(x) \\mid X = x)$ means maximizing $\\mathbb{P}(Y = h(x)\\mid X=x)$ over the choice of $h(x) \\in \\mathcal{Y}$, whose maximizer is by definition $h^*(x)$. A pointwise minimizer of the integrand minimizes the integral, so $h^*$ minimizes $R$. $\\blacksquare$',
      '**The resulting floor.** Substituting $h^*$ gives the Bayes risk\n$$R^* = \\mathbb{E}_X\\Big[1 - \\max_{c} \\mathbb{P}(Y = c \\mid X)\\Big].$$\nIt is zero only when $\\max_c \\mathbb{P}(Y=c\\mid X=x) = 1$ for almost every $x$ — that is, when the label is a deterministic function of the input. Any genuine ambiguity, sensor noise, or unmeasured variable makes $R^* > 0$, and **no amount of data or model capacity reduces it**, because it is a property of $\\mathcal{D}$ and does not mention $\\mathcal{H}$ anywhere.',
      '**Derivation of the $\\Phi(-\\|\\mu\\|/\\sigma)$ figure used in the notebook.** Let $Y$ be uniform on $\\{0,1\\}$ and $X \\mid Y{=}1 \\sim \\mathcal{N}(\\mu, \\sigma^2 I)$, $X \\mid Y{=}0 \\sim \\mathcal{N}(-\\mu, \\sigma^2 I)$ in $\\mathbb{R}^d$. With equal priors, $\\arg\\max_c \\mathbb{P}(Y=c\\mid X=x)$ is the class whose density at $x$ is larger. Taking the log-ratio of the two Gaussian densities, the quadratic terms $\\|x\\|^2$ and the normalizing constants cancel because the covariances are equal, leaving the linear function $\\frac{2}{\\sigma^2}\\,\\mu^\\top x$. So $h^*(x) = \\mathbb{1}[\\mu^\\top x > 0]$ — a hyperplane through the origin with normal $\\mu$.',
      'Now compute its error. By symmetry the two classes contribute equally, so condition on $Y = 1$, where $X = \\mu + \\sigma Z$ with $Z \\sim \\mathcal{N}(0, I)$. An error occurs when $\\mu^\\top X \\leq 0$, i.e. $\\mu^\\top\\mu + \\sigma\\,\\mu^\\top Z \\leq 0$. Since $\\mu^\\top Z \\sim \\mathcal{N}(0, \\|\\mu\\|^2)$, write $\\mu^\\top Z = \\|\\mu\\| W$ with $W \\sim \\mathcal{N}(0,1)$. The condition becomes $\\|\\mu\\|^2 + \\sigma\\|\\mu\\| W \\leq 0$, i.e. $W \\leq -\\|\\mu\\|/\\sigma$. Hence\n$$R^* = \\Phi\\!\\left(-\\frac{\\|\\mu\\|}{\\sigma}\\right).$$\nWith $\\|\\mu\\| = 1$, $\\sigma = 1$: $R^* = \\Phi(-1) \\approx 0.1587$. Observe that $d$ never appears — which is precisely why adding noise dimensions in Cell 4 leaves $R^*$ untouched while destroying $k$-NN.',
      '**The curse of dimensionality, quantified.** Suppose training points are uniform on the unit cube $[0,1]^d$. To capture an expected fraction $r$ of them, a sub-cube must have volume $r$, hence edge length $e(r,d) = r^{1/d}$. For $r = 0.01$: $e = 0.01$ at $d=1$, $e \\approx 0.63$ at $d = 10$, and $e \\approx 0.955$ at $d = 100$. In a hundred dimensions, the "neighbourhood" containing the nearest 1% of your data spans 95.5% of the range of every single feature. The locality assumption that justifies $k$-NN — that nearby points have similar labels — has not become slightly strained; it has become vacuous, because nothing is nearby.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Bayes Risk',
        body: 'R^* = \\mathbb{E}_X\\Big[1 - \\max_{c \\in \\mathcal{Y}} \\mathbb{P}(Y = c \\mid X)\\Big]',
      },
      {
        type: 'insight',
        title: 'Why the Bayes Proof Works: Pointwise Minimization',
        body: 'The move that makes Theorem 3 trivial is worth isolating, because you will use it repeatedly. Once the risk is written as $\\mathbb{E}_X[\\,g(h(X), X)\\,]$, the choice of $h$ at one input has no effect on the integrand at any other input. A global optimization over functions therefore decouples into independent scalar optimizations, one per point.\n\nThe same manoeuvre gives the optimal predictor for **any** loss: under squared loss it yields the conditional mean $h^*(x) = \\mathbb{E}[Y \\mid X = x]$; under absolute loss, the conditional median. Chapter 2 opens by proving the squared-loss case — and it is why linear regression is best understood as an attempt to approximate a conditional expectation.',
      },
      {
        type: 'warning',
        title: 'The i.i.d. Assumption Is Load-Bearing, and It Usually Fails',
        body: 'Theorems 1 and 2 both require $S \\sim \\mathcal{D}^n$ **independently and identically distributed**. In the machining context this is violated in at least three routine ways: consecutive runs share a progressively worn tool (temporal correlation), many samples come off the same bar of stock (grouping), and the process drifts between the training window and deployment (distribution shift).\n\nUnder any of these, a held-out split drawn by random shuffling leaks information between train and test, and the test estimate is optimistic despite being "held out." The fix is structural, not statistical: split by time, or by group, so that the split respects the dependence. Chapter 12 treats this properly — but the failure is worth recognising now, because it is the single most common reason a model that validated well dies in production.',
      },
    ],
    visualizations: [],
  },

  // ── Examples ───────────────────────────────────────────────────────────────
  examples: [
    {
      id: 'ml1-001-ex1',
      title: 'Computing Empirical Risk by Hand',
      problem: 'A classifier $h$ is evaluated on the sample $S = \\{(x_1, 1), (x_2, 0), (x_3, 1), (x_4, 1), (x_5, 0)\\}$ and produces predictions $h(x_1) = 1$, $h(x_2) = 0$, $h(x_3) = 0$, $h(x_4) = 1$, $h(x_5) = 1$. Compute $\\hat{R}_S(h)$ under 0-1 loss.',
      steps: [
        {
          strategyTitle: 'Step 1: Evaluate the loss on each sample individually',
          expression: 'L_{0\\text{-}1}(y_i, h(x_i)) = \\mathbb{1}[y_i \\neq h(x_i)]',
          annotation: 'The 0-1 loss is an indicator: it contributes exactly $1$ when the prediction differs from the truth and $0$ when they agree. Compare each pair in turn — $(1,1) \\to 0$, $(0,0) \\to 0$, $(1,0) \\to 1$, $(1,1) \\to 0$, $(0,1) \\to 1$. There is no partial credit; a confident wrong answer and a barely-wrong answer both score 1.',
          hints: ['Write the two rows out and compare column by column. Do not try to do this in your head — the whole reason empirical risk is useful is that it is mechanical.'],
        },
        {
          strategyTitle: 'Step 2: Sum the per-sample losses',
          expression: '\\sum_{i=1}^{5} L(y_i, h(x_i)) = 0 + 0 + 1 + 0 + 1 = 2',
          annotation: 'Two of the five predictions are wrong: sample 3 (truth 1, predicted 0) and sample 5 (truth 0, predicted 1). Note that these are different *kinds* of error — a false negative and a false positive — and 0-1 loss deliberately refuses to distinguish them. If that asymmetry matters in your application, 0-1 loss is the wrong choice and you must encode the difference in $L$.',
          hints: [],
        },
        {
          strategyTitle: 'Step 3: Divide by n',
          expression: '\\hat{R}_S(h) = \\frac{1}{n}\\sum_{i=1}^{n} L(y_i, h(x_i)) = \\frac{2}{5} = 0.4',
          annotation: 'The $\\frac{1}{n}$ makes the quantity an *average* rather than a total, so it can be compared across datasets of different sizes. Under 0-1 loss this average has a direct reading: $0.4$ is the observed misclassification rate, and it estimates $\\mathbb{P}(h(X) \\neq Y)$.',
          hints: ['Empirical risk under 0-1 loss is always exactly $1 - \\text{accuracy}$. Here accuracy is $3/5 = 0.6$, so risk is $0.4$.'],
        },
      ],
      conclusion: '$\\hat{R}_S(h) = 0.4$. This says nothing yet about $R(h)$ — if these five points were used to *select* $h$, Theorem 2 says $0.4$ is optimistically biased and the true risk is likely higher.',
    },
    {
      id: 'ml1-001-ex2',
      title: 'Bayes Risk When the Label Is Genuinely Random',
      problem: 'A sensor reports a single binary feature $x \\in \\{0, 1\\}$. The joint distribution is: $\\mathbb{P}(X{=}0) = 0.6$, and given $X{=}0$ the tool fails with probability $0.2$; $\\mathbb{P}(X{=}1) = 0.4$, and given $X{=}1$ the tool fails with probability $0.7$. Find the Bayes classifier and the Bayes risk.',
      steps: [
        {
          strategyTitle: 'Step 1: Apply the Bayes rule pointwise at each input',
          expression: 'h^*(x) = \\arg\\max_{c \\in \\{0,1\\}} \\mathbb{P}(Y = c \\mid X = x)',
          annotation: 'Theorem 3 lets us decide independently at each $x$, so handle $x = 0$ and $x = 1$ as two separate one-line problems. At $x=0$: $\\mathbb{P}(Y{=}1 \\mid X{=}0) = 0.2$ and $\\mathbb{P}(Y{=}0\\mid X{=}0) = 0.8$, so the maximizer is $c = 0$. At $x=1$: $\\mathbb{P}(Y{=}1\\mid X{=}1) = 0.7$ against $0.3$, so the maximizer is $c = 1$.',
          hints: ['With only two classes, "argmax of the conditional" is just "predict the majority class within that input value" — pick whichever conditional probability exceeds $0.5$.'],
        },
        {
          strategyTitle: 'Step 2: Compute the conditional error at each input',
          expression: '1 - \\max_c \\mathbb{P}(Y = c \\mid X = x)',
          annotation: 'Even the optimal rule is wrong sometimes, and the formula says exactly how often. At $x=0$ it predicts $0$ and is wrong with probability $0.2$. At $x=1$ it predicts $1$ and is wrong with probability $0.3$. These residual errors cannot be removed by any classifier, because at a given $x$ the label is genuinely random — the information required to do better is simply not present in $x$.',
          hints: ['The conditional error is always $\\min(p, 1-p)$ for binary problems, where $p = \\mathbb{P}(Y{=}1\\mid X{=}x)$.'],
        },
        {
          strategyTitle: 'Step 3: Average over the marginal distribution of X',
          expression: 'R^* = \\mathbb{E}_X\\big[1 - \\max_c \\mathbb{P}(Y=c\\mid X)\\big] = 0.6(0.2) + 0.4(0.3)',
          annotation: 'The outer expectation weights each input by how often it occurs, using the marginal $\\mathbb{P}(X=x)$ — not a plain average of $0.2$ and $0.3$. Inputs you rarely see contribute little to your overall error even if the model does badly on them, which is exactly why a rare-but-critical failure mode needs a loss function that says so rather than 0-1 loss.',
          hints: ['$0.6 \\times 0.2 = 0.12$ and $0.4 \\times 0.3 = 0.12$.'],
        },
        {
          strategyTitle: 'Step 4: Evaluate',
          expression: 'R^* = 0.12 + 0.12 = 0.24',
          annotation: 'The best achievable error rate is 24%. If you build a model on this sensor and report 22% test error, you have not beaten the Bayes rate — you have made an error in your evaluation, most likely leakage between the training and test data.',
          hints: ['Treat any measured error meaningfully below a known Bayes rate as a bug report, not a result.'],
        },
      ],
      conclusion: 'The Bayes classifier predicts $0$ when $x=0$ and $1$ when $x=1$, achieving $R^* = 0.24$. Adding a second, informative sensor would lower $R^*$ — because it changes $\\mathcal{D}$. Changing the model cannot.',
    },
  ],

  // ── Walkthroughs ───────────────────────────────────────────────────────────
  walkthroughs: [
    {
      id: 'wt-ml1-001-optimism',
      title: 'Why Training Error Cannot Be Trusted — The Proof, Line by Line',
      prereqs: ['Linearity of expectation', 'Monotonicity of expectation'],
      problem: 'Prove that $\\mathbb{E}_S[\\hat{R}_S(\\hat{h}_S)] \\leq \\inf_{h\\in\\mathcal{H}} R(h)$, where $\\hat{h}_S$ is the ERM solution.',
      steps: [
        {
          label: 'Fix an arbitrary competitor before touching the data',
          strategy: 'Introduce a hypothesis that does not depend on $S$, so the unbiasedness theorem will apply to it later.',
          explanation: 'Let $g$ be any fixed member of $\\mathcal{H}$, chosen in advance and independently of the sample. This is the whole trick of the proof: we cannot reason about $\\hat{h}_S$ directly because it is entangled with $S$, so we compare it against something that is not. Choosing the comparison object first, and only then drawing the data, is a pattern that recurs throughout learning theory.',
          math: 'g \\in \\mathcal{H}, \\quad g \\text{ independent of } S',
        },
        {
          label: 'Use the definition of ERM — pointwise, for every possible sample',
          strategy: 'The minimizer beats every competitor on the objective it minimizes.',
          explanation: 'By definition $\\hat{h}_S$ minimizes $\\hat{R}_S$ over $\\mathcal{H}$, and $g \\in \\mathcal{H}$, so $\\hat{R}_S(\\hat{h}_S) \\leq \\hat{R}_S(g)$. This inequality holds for *every realization* of $S$, not merely on average — it is a deterministic statement about two numbers, true once the sample is drawn whatever it happens to be. That strength is what lets us take expectations in the next step.',
          math: '\\hat{R}_S(\\hat{h}_S) \\leq \\hat{R}_S(g) \\quad \\text{for every } S',
          gotcha: 'This is the only place the ERM assumption is used. If your algorithm does not actually minimize empirical risk — early-stopped gradient descent, for instance — the inequality is not guaranteed, though something similar usually holds in practice.',
        },
        {
          label: 'Take expectations over the draw of S',
          strategy: 'If $A \\leq B$ always, then $\\mathbb{E}[A] \\leq \\mathbb{E}[B]$.',
          explanation: 'Monotonicity of expectation converts the pointwise inequality into one about averages. Nothing subtle happens here, but note what we have gained: the right-hand side now involves only $g$, which is independent of $S$, so the previous theorem becomes applicable to it. The left side still involves the entangled $\\hat{h}_S$ — and we never need to analyse it further.',
          math: '\\mathbb{E}_S\\big[\\hat{R}_S(\\hat{h}_S)\\big] \\leq \\mathbb{E}_S\\big[\\hat{R}_S(g)\\big]',
        },
        {
          label: 'Apply unbiasedness to the fixed competitor',
          strategy: 'Theorem 1 applies to $g$ precisely because $g$ was fixed in step 1.',
          explanation: 'Since $g$ does not depend on $S$, Theorem 1 gives $\\mathbb{E}_S[\\hat{R}_S(g)] = R(g)$ exactly. This is the payoff for the seemingly pedantic care in step 1. Had we tried to apply Theorem 1 to $\\hat{h}_S$ instead, the proof of Theorem 1 would have failed at the step where it claims each term equals $R(h)$.',
          math: '\\mathbb{E}_S\\big[\\hat{R}_S(\\hat{h}_S)\\big] \\leq R(g)',
          gotcha: 'Students often try to "fix" the bias with a correction factor. The inequality shows why that cannot work in general: the size of the bias depends on how rich $\\mathcal{H}$ is, which is exactly the thing you do not know.',
        },
        {
          label: 'Take the infimum over all competitors',
          strategy: 'The bound holds for every $g$, so it holds for the best one.',
          explanation: 'The left-hand side does not mention $g$ at all, and the inequality is valid for every $g \\in \\mathcal{H}$. Therefore it survives taking the infimum of the right-hand side over $\\mathcal{H}$, yielding the theorem. Read the final statement carefully: the expected *training* error of your fitted model is bounded above by the *true* risk of the best model in your class — a quantity it should intuitively be worse than, not better.',
          math: '\\mathbb{E}_S\\big[\\hat{R}_S(\\hat{h}_S)\\big] \\leq \\inf_{h\\in\\mathcal{H}} R(h) \\qquad \\blacksquare',
        },
        {
          label: 'Check it against the notebook',
          strategy: 'A theorem you have not seen fire on real numbers is a theorem you do not own.',
          explanation: 'In Cell 3, at $k=1$: $\\hat{R}_S(\\hat{h}_S) = 0$, while the Bayes floor is $R^* = 0.1587$ and therefore $\\inf_{h\\in\\mathcal{H}} R(h) \\geq 0.1587$. The theorem predicted $0 \\leq \\inf_h R(h)$, and the measurement confirms it with a great deal of room to spare. The gap between $0$ and $0.1587$ is the optimism, made visible.',
          math: '0 = \\hat{R}_S(\\hat{h}_S) \\;\\leq\\; \\inf_{h\\in\\mathcal{H}} R(h), \\qquad R^* = 0.1587',
        },
      ],
    },
  ],

  // ── Challenges ─────────────────────────────────────────────────────────────
  challenges: [
    {
      id: 'ml1-001-ch1',
      difficulty: 'easy',
      problem: 'A hypothesis class $\\mathcal{H}$ contains exactly one hypothesis: the constant function $h(x) = 0$ for all $x$. On a distribution where $\\mathbb{P}(Y = 1) = 0.3$ regardless of $x$, what is $R(h)$, what is $R^*$, and how does the excess risk split into approximation and estimation error?',
      hint: 'With only one hypothesis available, ERM has no choice to make — so how large can the estimation error be? Then find the Bayes rule for a distribution where $Y$ is independent of $X$.',
      walkthrough: [
        { expression: 'R(h) = \\mathbb{P}(h(X) \\neq Y) = \\mathbb{P}(Y = 1) = 0.3', annotation: 'The rule always predicts 0, so it errs exactly when $Y = 1$, which happens with probability $0.3$.' },
        { expression: 'h^*(x) = \\arg\\max_c \\mathbb{P}(Y = c \\mid X = x) = 0, \\quad R^* = 0.3', annotation: 'Since $Y$ is independent of $X$, the conditional $\\mathbb{P}(Y{=}1\\mid X{=}x) = 0.3 < 0.5$ at every $x$, so the Bayes rule also predicts 0 everywhere. The features carry no information whatsoever.' },
        { expression: '\\text{estimation} = R(\\hat{h}) - \\inf_{h\\in\\mathcal{H}} R(h) = 0.3 - 0.3 = 0', annotation: 'With $|\\mathcal{H}| = 1$, the ERM solution IS the best hypothesis in the class no matter what sample is drawn. Estimation error is exactly zero — there is nothing to estimate.' },
        { expression: '\\text{approximation} = \\inf_{h\\in\\mathcal{H}} R(h) - R^* = 0.3 - 0.3 = 0', annotation: 'The single hypothesis happens to coincide with the Bayes rule, so approximation error vanishes too. The model is optimal despite being trivial.' },
      ],
      answer: '$R(h) = R^* = 0.3$, with zero approximation error and zero estimation error. The lesson: a 30% error rate here is not a failure — it is the theoretical optimum, and the model is already perfect. Reporting "70% accuracy" as a disappointment would be a misreading. This is why estimating $R^*$ before optimizing is worth the effort.',
    },
    {
      id: 'ml1-001-ch2',
      difficulty: 'medium',
      problem: 'You train a model and observe $\\hat{R}_S(\\hat{h}) = 0.02$ and held-out error $0.19$. You know from the physics of the sensor that $R^* \\approx 0.15$. Diagnose the model and state what you would change. Then repeat the diagnosis for a second model with $\\hat{R}_S(\\hat{h}) = 0.31$ and held-out error $0.33$.',
      hint: 'Use the two gaps from the diagnostic procedure: $R - \\hat{R}_S$ measures estimation error, and $\\hat{R}_S - R^*$ measures approximation error. They point to opposite remedies.',
      walkthrough: [
        { expression: '\\text{Model A: } R - \\hat{R}_S = 0.19 - 0.02 = 0.17', annotation: 'A very large generalization gap. The model reproduces its training data almost perfectly but transfers poorly — the signature of high estimation error, i.e. overfitting.' },
        { expression: '\\text{Model A: } \\hat{R}_S - R^* = 0.02 - 0.15 = -0.13 < 0', annotation: 'Training error is *below* the irreducible floor. By Theorem 2 this is expected and is not a contradiction — but it is proof that $\\hat{R}_S$ is measuring memorization, not skill. A number below $R^*$ is always a red flag on training data and a bug on test data.' },
        { expression: '\\text{Model A remedy: shrink } \\mathcal{H} \\text{ or increase } n', annotation: 'Regularize, reduce capacity, or gather more data. Note that the true risk $0.19$ is only $0.04$ above the floor, so the achievable gain is at most 4 points — worth knowing before spending a month on it.' },
        { expression: '\\text{Model B: } R - \\hat{R}_S = 0.33 - 0.31 = 0.02', annotation: 'A tiny gap: the model generalizes almost perfectly from its training data. Estimation error is negligible, so more data will change essentially nothing.' },
        { expression: '\\text{Model B: } \\hat{R}_S - R^* = 0.31 - 0.15 = 0.16', annotation: 'A large approximation error. The hypothesis class simply cannot express a good rule for this problem — it is underfitting, and it is doing so consistently rather than erratically.' },
        { expression: '\\text{Model B remedy: enlarge } \\mathcal{H}', annotation: 'Use a more expressive model, add interaction features, or engineer better inputs. Gathering more data would be close to a total waste of effort here.' },
      ],
      answer: 'Model A is overfitting (estimation error 0.17) and needs regularization or more data, though only 4 points remain available. Model B is underfitting (approximation error 0.16) and needs a richer hypothesis class; more data would be wasted. The remedies are opposites — which is why the three-number diagnosis is worth doing before changing anything.',
    },
    {
      id: 'ml1-001-ch3',
      difficulty: 'hard',
      problem: 'Prove that for 1-NN on a training set with distinct inputs $x_i$, $\\hat{R}_S(h_{1,S}) = 0$ under 0-1 loss — and then explain precisely why this does *not* contradict Theorem 3, which says no rule can beat $R^*$.',
      hint: 'Compute the nearest neighbour of a training point $x_j$ within the training set itself. Then ask which of the two risks — empirical or true — Theorem 3 actually constrains.',
      walkthrough: [
        { expression: '\\pi_1(x_j) = \\arg\\min_{i} \\|x_j - x_i\\|_2', annotation: 'To evaluate empirical risk we query the model at each training point $x_j$, and the model searches the training set for the closest point.' },
        { expression: '\\|x_j - x_j\\|_2 = 0 \\leq \\|x_j - x_i\\|_2 \\;\\; \\forall i', annotation: 'The point $x_j$ is a member of the training set, and its distance to itself is $0$, the minimum possible value of a norm. With distinct inputs the minimizer is unique, so $\\pi_1(x_j) = j$.' },
        { expression: 'h_{1,S}(x_j) = y_{\\pi_1(x_j)} = y_j', annotation: '1-NN returns the label of the single nearest neighbour, which is the point itself. So the prediction equals the stored label exactly.' },
        { expression: '\\hat{R}_S(h_{1,S}) = \\frac{1}{n}\\sum_{j=1}^n \\mathbb{1}[y_j \\neq y_j] = \\frac{1}{n}\\sum_{j=1}^n 0 = 0', annotation: 'Every term of the sum vanishes. Empirical risk is exactly zero, for any dataset, regardless of how noisy the labels are — including a dataset whose labels were assigned by coin flip.' },
        { expression: 'R^* \\leq R(h) \\;\\; \\forall h, \\quad \\text{but Theorem 3 says nothing about } \\hat{R}_S', annotation: 'Here is the resolution. Theorem 3 bounds the **true risk** $R(h) = \\mathbb{E}_{\\mathcal{D}}[\\cdot]$, an expectation over the full distribution. $\\hat{R}_S$ is an average over $n$ specific points that the hypothesis was built from. These are different quantities, and only the first is constrained.' },
        { expression: 'R(h_{1,S}) \\geq R^* = 0.1587 \\;\\text{ while }\\; \\hat{R}_S(h_{1,S}) = 0', annotation: 'Confirmed numerically in Cell 3: at $k=1$ the measured true risk is well above the Bayes floor while training error sits at zero. Both facts hold simultaneously with no contradiction — and the distance between them is precisely the quantity this lesson exists to make you distrust.' },
      ],
      answer: 'Each training point is its own nearest neighbour at distance zero, so 1-NN reproduces every training label and $\\hat{R}_S = 0$ identically. There is no contradiction with Theorem 3 because that theorem lower-bounds the *true* risk $R(h)$, an expectation over $\\mathcal{D}$, whereas $\\hat{R}_S$ averages over the very sample used to construct $h$. Zero empirical risk is evidence of memorization, and carries no information at all about $R$.',
    },
  ],

  // ── Semantic Layer ─────────────────────────────────────────────────────────
  semantics: {
    core: [
      { symbol: '\\mathcal{D}', meaning: 'The unknown joint distribution over (input, output) pairs. Never observed; only sampled from. Everything you actually care about is defined as an expectation over it.' },
      { symbol: 'S = \\{(x_i, y_i)\\}_{i=1}^n', meaning: 'The training sample — $n$ pairs drawn i.i.d. from $\\mathcal{D}$. Your entire window onto $\\mathcal{D}$.' },
      { symbol: '\\mathcal{H}', meaning: 'The hypothesis class — the restricted set of rules the algorithm is permitted to return. Choosing a model type IS choosing $\\mathcal{H}$.' },
      { symbol: 'L(y, \\hat{y})', meaning: 'The loss function — the cost of predicting $\\hat{y}$ when the truth is $y$. Where engineering priorities enter the mathematics.' },
      { symbol: 'R(h) = \\mathbb{E}_{\\mathcal{D}}[L(y, h(x))]', meaning: 'True risk (generalization error) — what you want to minimize, and what you can never compute.' },
      { symbol: '\\hat{R}_S(h) = \\tfrac{1}{n}\\sum_i L(y_i, h(x_i))', meaning: 'Empirical risk — the computable sample average that stands in for $R(h)$.' },
      { symbol: '\\hat{h}_S = \\arg\\min_{h \\in \\mathcal{H}} \\hat{R}_S(h)', meaning: 'The ERM solution. A random variable, because it is a function of the random sample $S$.' },
      { symbol: 'h^*, \\; R^*', meaning: 'The Bayes-optimal predictor and Bayes risk — the best achievable rule over ALL functions, and its error. A property of $\\mathcal{D}$ alone; no model or dataset size can improve it.' },
      { symbol: '\\mathbb{1}[\\,\\cdot\\,]', meaning: 'The indicator function: 1 when the condition holds, 0 otherwise. Its expectation is the probability of the condition.' },
      { symbol: 'R(\\hat{h}) - \\hat{R}_S(\\hat{h})', meaning: 'The generalization gap. Large when overfitting; the central object of Chapter 5.' },
    ],
  },

  // ── Spiral ─────────────────────────────────────────────────────────────────
  spiral: {
    recoveryPoints: [
      { lessonId: 'la1-001', label: 'Vectors and Magnitude', note: 'The distance $\\|x - x_i\\|_2$ at the heart of $k$-NN is exactly the vector magnitude from Linear Algebra Lesson 1, applied to a difference of vectors.' },
      { lessonId: 'py-0-2-values', label: 'Python Values and Types', note: 'The notebook cells assume comfort with NumPy arrays and broadcasting. If `X[:, None, :] - X[None, :, :]` is opaque, revisit array shapes before continuing.' },
    ],
    futureLinks: [
      { lessonId: 'ml1-002', label: 'The Bayes-Optimal Predictor', note: 'We proved the 0-1 case here. Next lesson derives the optimal predictor for any loss — and shows that squared loss gives the conditional mean, which is what linear regression is really approximating.' },
      { lessonId: 'ml2-001', label: 'Least Squares, Four Ways', note: 'The first hypothesis class with an actual training step. ERM over linear functions with squared loss has a closed-form solution.' },
      { lessonId: 'ml5-001', label: 'Bias-Variance Decomposition', note: 'The estimation/approximation split introduced here becomes an exact algebraic identity under squared loss, splitting excess risk into bias, variance, and noise.' },
    ],
  },

  // ── Assessment ─────────────────────────────────────────────────────────────
  assessment: {
    questions: [
      {
        id: 'ml1-001-assess-1',
        type: 'choice',
        text: 'Which quantity can you actually compute in a real project?',
        options: [
          'The true risk $R(h)$',
          'The empirical risk $\\hat{R}_S(h)$',
          'The Bayes risk $R^*$',
          'The distribution $\\mathcal{D}$',
        ],
        answer: 'The empirical risk $\\hat{R}_S(h)$',
        hint: '$R(h)$ and $R^*$ are both expectations over $\\mathcal{D}$, which is never observed. Only the finite sample average is computable — which is precisely why the gap between them is the subject of the field.',
      },
      {
        id: 'ml1-001-assess-2',
        type: 'choice',
        text: 'A model reports 0% training error on a dataset with known Bayes risk $R^* = 0.12$. What does this tell you?',
        options: [
          'The model has beaten the Bayes rate — an excellent result',
          'The model is memorizing; training error carries no information about $R(h)$',
          'The Bayes risk was computed incorrectly',
          'The model must be using a larger hypothesis class than needed',
        ],
        answer: 'The model is memorizing; training error carries no information about $R(h)$',
        hint: 'Theorem 2 says $\\mathbb{E}[\\hat{R}_S(\\hat{h}_S)] \\leq \\inf_h R(h)$ — training error below $R^*$ is exactly what the theory predicts, not a contradiction. It is also not an achievement.',
      },
      {
        id: 'ml1-001-assess-3',
        type: 'choice',
        text: 'You add 50 columns of pure random noise to your feature matrix. What happens to the Bayes risk $R^*$?',
        options: [
          'It increases, because the problem is now harder',
          'It decreases, because there is more information available',
          'It is unchanged — $R^*$ depends only on $\\mathcal{D}$, and the optimal rule ignores uninformative features',
          'It becomes undefined in high dimensions',
        ],
        answer: 'It is unchanged — $R^*$ depends only on $\\mathcal{D}$, and the optimal rule ignores uninformative features',
        hint: 'This is the exact experiment in Cell 4. The Bayes rule conditions on $X$ and the noise columns carry no information about $Y$, so $\\mathbb{P}(Y \\mid X)$ is unaffected. $k$-NN degrades badly, but that is estimation error, not a harder problem.',
      },
      {
        id: 'ml1-001-assess-4',
        type: 'choice',
        text: 'The gap $\\hat{R}_S(\\hat{h}) - R^*$ is large while $R(\\hat{h}) - \\hat{R}_S(\\hat{h})$ is near zero. What should you do?',
        options: [
          'Collect more training data',
          'Add regularization to reduce overfitting',
          'Use a more expressive hypothesis class',
          'Reduce the number of features',
        ],
        answer: 'Use a more expressive hypothesis class',
        hint: 'A small generalization gap with high training error is underfitting — high approximation error. Your class cannot express a good rule, so more data or more regularization will not help. You need a bigger $\\mathcal{H}$.',
      },
      {
        id: 'ml1-001-assess-5',
        type: 'choice',
        text: 'Why does Theorem 1 (unbiasedness) fail when applied to the ERM solution $\\hat{h}_S$?',
        options: [
          'Because the loss function is not convex',
          'Because $\\hat{h}_S$ depends on $S$, so $L(y_i, \\hat{h}_S(x_i))$ is not a fixed function of a $\\mathcal{D}$-distributed pair',
          'Because the sample size $n$ is finite',
          'Because 0-1 loss is not differentiable',
        ],
        answer: 'Because $\\hat{h}_S$ depends on $S$, so $L(y_i, \\hat{h}_S(x_i))$ is not a fixed function of a $\\mathcal{D}$-distributed pair',
        hint: 'Trace the proof: the step "each term equals $R(h)$" requires $h$ to be non-random with respect to $S$. That independence is the load-bearing assumption, and selecting $h$ using $S$ destroys it.',
      },
    ],
  },

  // ── Mental Model ───────────────────────────────────────────────────────────
  mentalModel: [
    'Learning = choose $\\mathcal{H}$, choose $L$, minimize $\\hat{R}_S$ over $\\mathcal{H}$, hope $R$ follows.',
    'You minimize empirical risk because you can. You want true risk minimized because it matters. The whole field is about when the first delivers the second.',
    'Restricting $\\mathcal{H}$ is not a limitation — it is the mechanism. Unrestricted ERM always returns a lookup table.',
    'Bayes risk $R^*$ is a property of the data distribution, not of your model. No algorithm and no amount of data goes below it.',
    'Excess risk = estimation error (finite $n$) + approximation error (restricted $\\mathcal{H}$). They have opposite remedies, so diagnose before you act.',
    'Training error below the Bayes rate is a symptom of memorization, never an achievement.',
    'Any hypothesis chosen using a dataset may not be honestly evaluated on that dataset — and that includes choosing $k$.',
  ],

  // ── Misconceptions ─────────────────────────────────────────────────────────
  misconceptions: [
    {
      falseBelief: 'A model with lower training error is a better model.',
      whyStudentsThinkIt: 'Every other kind of test in education and engineering works this way — a lower measured error means a better result. The intuition transfers directly, and nothing about the phrase "training error" signals that it is measuring something other than quality.',
      correctionExample: 'In Cell 3, $k=1$ achieves the *lowest possible* training error ($0.0000$) and simultaneously the *worst* true risk on the entire sweep. Training error and quality are anti-correlated across most of that range.',
      contrastCase: 'Training error is informative in exactly one direction: if it is high, the model is definitely underfitting (approximation error is large). Low training error is uninformative, because both an excellent model and a lookup table produce it.',
    },
    {
      falseBelief: 'With enough data and a big enough model, error can be driven to zero.',
      whyStudentsThinkIt: 'Marketing around deep learning emphasises scale as the answer to everything, and in problems with near-deterministic labels (image classification on clean data) the residual error genuinely is very small — which makes the general claim look plausible.',
      correctionExample: 'The Bayes risk $R^* = \\mathbb{E}_X[1 - \\max_c \\mathbb{P}(Y{=}c\\mid X)]$ contains no reference to $\\mathcal{H}$ or $n$. On the Cell 1 distribution it equals $0.1587$, and a model with infinite capacity trained on infinite data still errs 15.87% of the time.',
      contrastCase: 'What *does* lower $R^*$ is changing $\\mathcal{D}$ — measuring a new variable, using a better sensor, reducing genuine process variability. That is an engineering intervention on the data-generating process, not a modelling one. Recognising which of the two your problem needs is worth more than any algorithm in this course.',
    },
    {
      falseBelief: 'A held-out test set always gives an honest estimate of generalization error.',
      whyStudentsThinkIt: 'The train/test split is taught as a ritual that guarantees honesty, and the words "held out" suggest the data is untouched. The unbiasedness result is real — but its precondition is rarely stated as forcefully as its conclusion.',
      correctionExample: 'Theorem 1 requires $h$ to be independent of the evaluation data. If you compute test error for $k \\in \\{1,3,\\dots,399\\}$ and report the best, you have selected using the test set, and the reported number is optimistically biased exactly like training error. Cell 4 does this deliberately and says so in a comment.',
      contrastCase: 'The honest protocol needs three splits: train (fit parameters), validation (select $k$, architecture, stopping point), test (evaluate once, then stop). A test set consulted twice is a validation set — and one consulted a hundred times is training data.',
    },
  ],

  // ── Transfer Prompts ───────────────────────────────────────────────────────
  transferPrompts: [
    {
      situation: 'A stakeholder asks whether 88% accuracy on your tool-failure model is good enough to deploy.',
      competingTechniques: 'Compare against a published benchmark on a different dataset vs. estimate $R^*$ for your own distribution and compare against that',
      whyThisTechniqueWins: 'Accuracy is meaningless without a floor. If $R^* \\approx 0.12$ then 88% accuracy is optimal and further modelling is wasted effort; if $R^* \\approx 0.02$ then you are leaving ten points on the table. A benchmark from someone else\'s dataset tells you nothing, because $R^*$ is a property of *your* $\\mathcal{D}$.',
    },
    {
      situation: 'Your model does well in backtesting on historical machining logs and badly after deployment.',
      competingTechniques: 'Retrain on more historical data vs. check whether the i.i.d. assumption holds across the train/deploy boundary',
      whyThisTechniqueWins: 'Every theorem in this lesson assumes $S \\sim \\mathcal{D}^n$ i.i.d. and that deployment draws from the same $\\mathcal{D}$. Tool wear, seasonal material changes, and process drift all break it. More data from the old distribution does not fix a distribution that has moved — it just makes you more confident about the wrong thing.',
    },
    {
      situation: 'You must choose between $k$-NN and a linear model for an embedded controller with 64 KB of memory.',
      competingTechniques: 'Pick whichever has lower validation error vs. account for the cost structure alongside the error',
      whyThisTechniqueWins: '$k$-NN stores the entire training set ($O(nd)$ memory, forever) and pays $O(nd)$ per prediction. A linear model stores $d+1$ floats and pays $O(d)$. On constrained hardware $k$-NN may be inadmissible at any accuracy, and knowing this before running experiments saves the whole detour.',
    },
  ],

  // ── Debugging ──────────────────────────────────────────────────────────────
  debugging: [
    {
      commonError: 'Reported test accuracy is higher than the known Bayes-optimal accuracy.',
      symptom: 'A result that looks like a breakthrough — e.g. 91% accuracy when $R^* = 0.12$ caps you at 88%.',
      whyItHappened: 'Almost always data leakage: the same rows appear in both splits, a feature was computed using the target, or normalization statistics were fitted on the full dataset before splitting. Beating $R^*$ is impossible, so the measurement is wrong.',
      repairStrategy: 'Check for duplicate rows across splits first. Then audit every feature for target leakage. Then confirm that all preprocessing (scaling, imputation, encoding) is fitted on training data only and merely applied to test data.',
    },
    {
      commonError: 'Validation error is much better than production error, despite a clean train/validation split.',
      symptom: 'Model performance drops sharply and consistently on deployment, not erratically.',
      whyItHappened: 'The i.i.d. assumption fails across the split. Random shuffling of temporally ordered or grouped data puts near-duplicates on both sides — consecutive runs on the same tool, multiple samples from one workpiece — so the validation set is effectively partly training data.',
      repairStrategy: 'Split by the unit of independence, not by row: split by time (all validation data strictly after all training data), or by group (all rows from a given part or tool in the same split). Expect the validation error to get worse; that is the point.',
    },
    {
      commonError: 'k-NN gives near-random predictions on a dataset with many features.',
      symptom: 'Accuracy hovers near the majority-class rate no matter which $k$ is chosen.',
      whyItHappened: 'Curse of dimensionality. Distance is summed over all $d$ coordinates, so uninformative features dominate and the nearest neighbours are effectively random points. This is estimation error — the problem itself is unchanged.',
      repairStrategy: 'Reduce dimensionality before applying a distance-based method: select informative features, or project with PCA (Chapter 9). Alternatively switch to a model that learns which features matter — trees and $L_1$-penalized linear models both do this natively, whereas $k$-NN weights every feature equally by construction.',
    },
    {
      commonError: 'np.argpartition raises "kth(=k) out of bounds".',
      symptom: 'The k-NN implementation crashes when $k$ approaches the training set size.',
      whyItHappened: '`argpartition` requires `kth < n` along the partition axis. Passing $k = n$, or a $k$ larger than the number of training points, exceeds the valid index range.',
      repairStrategy: 'Clamp with `k = min(k, len(X_train))` as `knn_predict` does in Cell 2, and note that $k = n$ makes the model a constant predictor anyway — the majority class of the whole training set, independent of the query.',
    },
    {
      commonError: "TypeError: Cannot cast array data from dtype('int64') to dtype('int32') according to the rule 'safe'.",
      symptom: 'Raised by `np.bincount`, or by using an integer array as an index, in the browser notebook — while the identical code runs without complaint on a desktop Python install.',
      whyItHappened: 'The browser runs NumPy under WebAssembly, a 32-bit target, so `np.intp` (the platform integer) is `int32`. But `rng.integers()` returns `int64` regardless of platform. Functions that require `intp` refuse the `int64 → int32` narrowing rather than silently truncating your data. On a 64-bit desktop `intp` *is* `int64`, so no cast is required and the bug is invisible.',
      repairStrategy: 'Cast label and index arrays with `.astype(np.intp)` at the point of creation, as `sample()` does in Cell 1. `np.intp` resolves to the correct width on each platform, so the same source is right in both places — whereas hard-coding `np.int32` breaks on desktop and `np.int64` breaks in the browser.',
    },
    {
      commonError: 'The browser tab freezes or the kernel dies when predicting on a large query set.',
      symptom: 'An out-of-memory failure inside the distance computation, scaling with the number of features.',
      whyItHappened: 'The broadcasting form `X_query[:, None, :] - X_train[None, :, :]` allocates a $q \\times n \\times d$ intermediate — 128 MB for 20,000 queries against 400 points in 2 dimensions, and it grows linearly with every feature you add.',
      repairStrategy: 'Use the expansion $\\|a-b\\|^2 = \\|a\\|^2 + \\|b\\|^2 - 2a^\\top b$ so the largest array is $q \\times n$ regardless of $d$, and process queries in batches so peak memory is $O(\\text{batch} \\times n)$. Both are implemented in `knn_predict` in Cell 2.',
    },
  ],

  // ── Mastery ────────────────────────────────────────────────────────────────
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Given any described learning setup, write down $\\mathcal{H}$, $L$, $R(h)$, and $\\hat{R}_S(h)$ explicitly, and compute the empirical risk from a table of predictions and truths.',
    explainVerbally: 'Explain, without notation, why minimizing training error is not the same as learning, and why restricting the hypothesis class is what makes learning possible at all.',
    detectIncorrectApplication: 'Spot the three classic evaluation failures on sight: reporting test error after selecting on the test set, treating training error as evidence of quality, and random-shuffling data that has temporal or group structure.',
    transferToUnfamiliar: 'Given a novel problem with an unknown Bayes rate, design a protocol that estimates or bounds $R^*$ (repeat measurements, inter-annotator agreement, sensor precision) before committing effort to model selection.',
  },

  // ── Checkpoints ────────────────────────────────────────────────────────────
  checkpoints: [
    { id: 'cp-ml1-001-1', label: 'State the supervised learning problem from memory: $\\mathcal{H}$, $L$, $R$, $\\hat{R}_S$', type: 'read' },
    { id: 'cp-ml1-001-2', label: 'Run Cell 1 and record the Bayes error rate', type: 'lab' },
    { id: 'cp-ml1-001-3', label: 'Run Cell 2 — verify both implementations match sklearn, and that k=1 gives zero training error', type: 'lab' },
    { id: 'cp-ml1-001-4', label: 'Run Cell 3 and identify the k where the generalization gap is widest', type: 'lab' },
    { id: 'cp-ml1-001-5', label: 'Run Cell 4 and explain why the Bayes error did not move', type: 'lab' },
    { id: 'cp-ml1-001-6', label: 'Complete Challenge 1 — write knn_regress and find its irreducible error', type: 'challenge' },
    { id: 'cp-ml1-001-7', label: 'Read the proof that ERM is optimistically biased, line by line', type: 'read' },
    { id: 'cp-ml1-001-8', label: 'Complete Challenge 3 — prove 1-NN has zero empirical risk without contradicting Theorem 3', type: 'challenge' },
  ],

  // ── Final Quiz ─────────────────────────────────────────────────────────────
  quiz: [
    {
      id: 'ml1-001-quiz-1',
      type: 'choice',
      text: 'What exactly are you choosing when you decide to "use a linear model"?',
      options: [
        'The loss function $L$',
        'The hypothesis class $\\mathcal{H}$',
        'The distribution $\\mathcal{D}$',
        'The Bayes risk $R^*$',
      ],
      answer: 'The hypothesis class $\\mathcal{H}$',
      hints: ['Choosing a model type is choosing which rules the algorithm is allowed to return. The loss is a separate choice, and $\\mathcal{D}$ and $R^*$ are not yours to choose at all.'],
      reviewSection: 'Intuition tab — the three choices',
    },
    {
      id: 'ml1-001-quiz-2',
      type: 'choice',
      text: 'Why can the true risk $R(h)$ never be computed?',
      options: [
        'It requires solving an intractable optimization problem',
        'It is an expectation over $\\mathcal{D}$, which is never observed — only sampled from',
        'It requires infinite floating-point precision',
        'It can be computed, but only for convex losses',
      ],
      answer: 'It is an expectation over $\\mathcal{D}$, which is never observed — only sampled from',
      hints: ['$R(h) = \\mathbb{E}_{(x,y)\\sim\\mathcal{D}}[L(y,h(x))]$. The obstacle is not computational difficulty; the distribution itself is inaccessible in principle.'],
      reviewSection: 'Intuition tab — the limitation',
    },
    {
      id: 'ml1-001-quiz-3',
      type: 'choice',
      text: 'Why does 1-NN achieve exactly zero empirical risk on any training set with distinct inputs?',
      options: [
        'Because it perfectly learns the underlying pattern',
        'Because each training point is its own nearest neighbour at distance zero',
        'Because 0-1 loss cannot exceed 1',
        'Because the training set is always linearly separable',
      ],
      answer: 'Because each training point is its own nearest neighbour at distance zero',
      hints: ['When the model is queried at $x_j$, it searches the training set — which contains $x_j$ itself, at distance $0$. It returns $y_j$, so the loss on that point is $0$. This holds even for randomly assigned labels.'],
      reviewSection: 'Challenge 3',
    },
    {
      id: 'ml1-001-quiz-4',
      type: 'choice',
      text: 'A model has training error 0.04, test error 0.06, and the Bayes rate is 0.05. What is the correct diagnosis?',
      options: [
        'Severe overfitting — regularize immediately',
        'Severe underfitting — use a bigger model',
        'The model is close to optimal; there is little left to gain',
        'The test set has leaked into training',
      ],
      answer: 'The model is close to optimal; there is little left to gain',
      hints: ['The generalization gap is $0.06 - 0.04 = 0.02$ (small), and the test error $0.06$ sits just $0.01$ above the Bayes floor $0.05$. Both error sources are nearly exhausted — further effort has a ceiling of one percentage point.'],
      reviewSection: 'Intuition tab — Procedure: Diagnose Any Trained Model',
    },
    {
      id: 'ml1-001-quiz-5',
      type: 'choice',
      text: 'Adding 50 noise features leaves the Bayes risk unchanged but wrecks $k$-NN. Which error term increased?',
      options: [
        'Approximation error — the class can no longer express a good rule',
        'Estimation error — the class can express it, but $n$ samples are no longer enough to find it',
        'Bayes risk — the problem became harder',
        'None; the effect is purely computational',
      ],
      answer: 'Estimation error — the class can express it, but $n$ samples are no longer enough to find it',
      hints: ['$k$-NN with enough data can still represent the correct boundary, so approximation error is unchanged. What broke is the ability to find good neighbours from a finite sample in high dimensions — a finite-$n$ problem, hence estimation error.'],
      reviewSection: 'Notebook Cell 4 and the excess risk decomposition',
    },
    {
      id: 'ml1-001-quiz-6',
      type: 'choice',
      text: 'You select $k$ by picking the value with the lowest error on your held-out set, then report that error as your generalization estimate. What is wrong?',
      options: [
        'Nothing — this is standard practice',
        'The hypothesis was selected using that data, so the estimate is optimistically biased',
        'You should have used a larger value of $k$',
        'Held-out error is always biased regardless of how it is used',
      ],
      answer: 'The hypothesis was selected using that data, so the estimate is optimistically biased',
      hints: ['Theorem 1 requires the hypothesis to be independent of the evaluation data. Selecting $k$ on that set makes the final model depend on it, and the same optimism that afflicts training error now applies. You need a third, untouched split to report from.'],
      reviewSection: 'Rigor tab — where the proof breaks',
    },
  ],
};
