// Machine-learning additions, part one, placed inside the big-equations part by lessons/index.js:
// the bias–variance decomposition, naive Bayes, decision trees, k-means, Gaussian mixtures and EM,
// support vector machines, initialisation, normalisation, dropout and convolution.
import { biasVariance, trainNaiveBayes, predictNaiveBayes, kmeans, emGmm, hingeLoss, gini, labelEntropy, bestSplit, activationSpread, layerNorm, dropout, PyRandom, conv1d, convMatrix } from '../engine/maths.js'
import { f } from './util.js'

const DOCS = [['free', 'money'], ['meeting', 'today'], ['free', 'offer'], ['project', 'today']], LABELS = ['spam', 'ham', 'spam', 'ham']
const POINTS = [[0, 0], [0, 1], [5, 5], [6, 5], [0.5, 0.2], [5.5, 6]]

export const ML2 = [
  {
    id: 'bias-variance', title: 'Underfitting and overfitting: the bias–variance decomposition',
    goal: 'Derive expected test error $=$ bias² $+$ variance $+$ noise, and use it to explain why too simple and too flexible models both fail.',
    builds: ['regression-gradient', 'estimation'],
    blocks: [
      { md: `Train the same kind of model on a different random training set and you get a slightly different model. That wobble, and how far its average sits from the truth, explain every case of underfitting and overfitting.

**Set-up.** The truth is $y = f(x) + \\varepsilon$ with noise $\\varepsilon$ of mean 0 and variance $\\sigma^2$, independent of everything. A training set $D$ produces a fitted model $\\hat f_D$. At a test input $x$, average the squared error over both the training set and the new noise. Write $\\bar f(x) = \\mathbb E_D[\\hat f_D(x)]$ for the **average model**.

**The decomposition.** Split the error into three pieces and expand:
$$y - \\hat f_D = \\underbrace{\\varepsilon}_{\\text{noise}} + \\underbrace{f - \\bar f}_{\\text{bias}} + \\underbrace{\\bar f - \\hat f_D}_{\\text{wobble}}$$
Square and take expectations. The cross terms vanish: $\\varepsilon$ has mean 0 and is independent of the training set; $f - \\bar f$ is a fixed number; and the wobble has mean 0 by the definition of $\\bar f$ (exactly lesson [[#estimation]]'s argument). What remains:

$$\\mathbb E\\big[(y - \\hat f_D(x))^2\\big] = \\underbrace{\\big(f(x) - \\bar f(x)\\big)^2}_{\\text{bias}^2} + \\underbrace{\\mathbb E_D\\big[(\\hat f_D(x) - \\bar f(x))^2\\big]}_{\\text{variance}} + \\underbrace{\\sigma^2}_{\\text{noise}}$$

**Reading it.**
- **Bias**: the model family can't express the truth even on average. A straight line fitted to a curve misses systematically: **underfitting**.
- **Variance**: the fit chases the particular training points. A degree-8 polynomial through 12 noisy points swings wildly between datasets: **overfitting**.
- **Noise**: nothing can remove it; it is the floor.

More flexible models trade bias for variance. Regularisation (lesson [[#regularisation]]) and averaging many models (lesson [[#sums-of-variables]]: averaging independent fits divides variance) buy back variance at the cost of a little bias. The classical picture is a U-shaped test error as flexibility grows; lesson [[#double-descent]] shows how today's huge networks escape the right side of the U.` },
      { figure: 'BiasVarianceFitFig', caption: 'Many training sets drawn from the same curve (grey dashed); one polynomial fit per set (thin lines) and their average (thick). Raise the degree: the average fits better (less bias) but the fits scatter more (more variance).' },
      {
        code: {
          file: 'learners.py', fn: 'fit_poly', notes: [
            ['def fit_poly(xs, ys, degree):', ['Least squares with features $1, x, x^2, \\dots$.']],
            ['X = [[x ** p for p in range(degree + 1)] for x in xs]', ['One row of powers per point.']],
            ['XtX = [[sum(r[i] * r[j] for r in X) for j in range(degree + 1)] for i in range(degree + 1)]', ['$X^\\top X$.']],
            ['Xty = [sum(r[i] * y for r, y in zip(X, ys)) for i in range(degree + 1)]', ['$X^\\top\\mathbf y$.']],
            ['return solve(XtX, Xty)', ['Lesson [[#least-squares]]\'s normal equations, by elimination.']],
          ],
        },
      },
      {
        code: {
          file: 'learners.py', fn: 'poly_value', notes: [
            ['def poly_value(coeffs, x):', ['Coefficients and a point.']],
            ['return sum(c * x ** p for p, c in enumerate(coeffs))', ['$\\sum_p c_px^p$.']],
          ],
        },
      },
      {
        code: {
          file: 'learners.py', fn: 'bias_variance', notes: [
            ['def bias_variance(degree, trials=200, n=12, noise=0.3, seed=0):', ['The experiment behind the decomposition.']],
            ['rng = random.Random(seed)', ['Repeatable datasets.']],
            ['truth = lambda x: x * x - x', ['The true $f$.']],
            ['tests = [i / 10 for i in range(-10, 11)]', ['Test inputs from $-1$ to 1.']],
            ['preds = [[] for _ in tests]', ['Each test point collects one prediction per training set.']],
            ['for _ in range(trials):', ['Many training sets…']],
            ['xs = [rng.uniform(-1, 1) for _ in range(n)]', ['…random inputs…']],
            ['ys = [truth(x) + rng.gauss(0, noise) for x in xs]', ['…noisy targets…']],
            ['c = fit_poly(xs, ys, degree)', ['…one fit each…']],
            ['for k, t in enumerate(tests):', ['…recorded at every test point.']],
            ['preds[k].append(poly_value(c, t))', ['$\\hat f_D(x)$.']],
            ['bias2 = sum((sum(p) / len(p) - truth(t)) ** 2 for p, t in zip(preds, tests)) / len(tests)', ['$(\\bar f - f)^2$, averaged over test points.']],
            ['var = sum(sum((v - sum(p) / len(p)) ** 2 for v in p) / len(p) for p in preds) / len(tests)', ['The fits\' spread around $\\bar f$, averaged over test points.']],
            ['return bias2, var', ['The two learnable parts of the error.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Fitting straight lines (degree 1) to $y = x^2 - x$ + noise (30 datasets of 10 points, seed 1): what is the squared bias? (3 decimals)',
          answer: biasVariance(1, 30, 10, 0.3, 1)[0], tolerance: 0.0006, compute: () => biasVariance(1, 30, 10, 0.3, 1)[0],
          explain: `${f(biasVariance(1, 30, 10, 0.3, 1)[0])}: a line can't bend, so even the average line misses. Degree 2 has bias ${f(biasVariance(2, 30, 10, 0.3, 1)[0])}.`,
        },
      },
      {
        predict: {
          prompt: 'Same experiment at degree 5: what is the variance? (3 decimals)',
          answer: biasVariance(5, 30, 10, 0.3, 1)[1], tolerance: 0.0006, compute: () => biasVariance(5, 30, 10, 0.3, 1)[1],
          explain: `${f(biasVariance(5, 30, 10, 0.3, 1)[1])}, against ${f(biasVariance(2, 30, 10, 0.3, 1)[1])} at degree 2: the flexible fit chases each dataset's noise.`,
        },
      },
      { note: 'Expected test error = bias² + variance + noise; the cross terms vanish because noise and wobble average to zero. Too simple: bias (underfitting). Too flexible: variance (overfitting). Regularisation and averaging trade one for the other.' },
    ],
  },

  {
    id: 'naive-bayes', title: 'Naive Bayes: Bayes\' rule with a bold assumption',
    goal: 'Classify with $P(c \\mid \\mathbf w) \\propto P(c)\\prod_i P(w_i \\mid c)$, say what the "naive" independence assumption buys and costs, and see add-one smoothing as a prior.',
    builds: ['bayes', 'independence', 'map', 'logarithms'],
    blocks: [
      { md: `A spam filter must compute $P(\\text{spam} \\mid \\text{the words of an email})$. Bayes' rule (lesson [[#bayes]]) turns it around:

$$P(c \\mid w_1, \\dots, w_n) = \\frac{P(c)\\,P(w_1, \\dots, w_n \\mid c)}{P(w_1, \\dots, w_n)} \\;\\propto\\; P(c)\\,P(w_1, \\dots, w_n \\mid c)$$

The denominator is the same for every class, so to pick the most likely class we can drop it. The hard part is $P(w_1, \\dots, w_n \\mid c)$: the chance of this **exact combination** of words, which no training set could estimate directly.

**The naive assumption.** Pretend the words are **independent given the class** (lesson [[#independence]], applied within each class). Then the joint probability factors:
$$P(c \\mid \\mathbf w) \\propto P(c)\\prod_{i=1}^n P(w_i \\mid c)$$
and each $P(w \\mid c)$ is just a word count within the class. Products of many small numbers underflow (lesson [[#logarithms]]), so compare **log** scores: $\\log P(c) + \\sum_i\\log P(w_i \\mid c)$. Pick the class with the highest.

The assumption is false ("free" and "money" go together), and the probabilities it produces are badly over-confident. Yet the **ranking** of classes is often right, it trains with one pass of counting, and it needs very little data. It remains a strong baseline for text.

**Add-one smoothing.** A word never seen in spam during training would get $P(w \\mid \\text{spam}) = 0$, and a single such word would veto spam forever ($\\log 0 = -\\infty$). Adding 1 to every word's count is exactly lesson [[#map]]'s pseudo-counts: a prior that says every word is possible. It is the MAP estimate under a uniform Dirichlet prior (the many-outcome version of the Beta).` },
      { figure: 'NaiveBayesFig', caption: 'Type words into a message: each word adds its log-probability ratio to the score, nudging toward spam (orange) or not (teal). The prior sets the starting point.' },
      {
        code: {
          file: 'learners.py', fn: 'train_naive_bayes', notes: [
            ['def train_naive_bayes(docs, labels):', ['Documents (lists of words) and their classes.']],
            ['vocab = sorted({w for d in docs for w in d})', ['Every word seen.']],
            ['classes = sorted(set(labels))', ['Every class.']],
            ['prior = {c: labels.count(c) / len(labels) for c in classes}', ['$P(c)$: how often each class occurs.']],
            ['likelihood = {}', ['$P(w \\mid c)$ for each class.']],
            ['for c in classes:', ['For each class…']],
            ['counts = {w: 1 for w in vocab}', ['…start every word at 1: add-one smoothing.']],
            ['for d, l in zip(docs, labels):', ['Go through the training documents…']],
            ['if l == c:', ['…of this class…']],
            ['for w in d:', ['…and count…']],
            ['counts[w] += 1', ['…each word.']],
            ['total = sum(counts.values())', ['All counts in the class.']],
            ['likelihood[c] = {w: counts[w] / total for w in vocab}', ['Turn counts into probabilities.']],
            ['return prior, likelihood', ['The whole model: a table of counts.']],
          ],
        },
      },
      {
        code: {
          file: 'learners.py', fn: 'predict_naive_bayes', notes: [
            ['def predict_naive_bayes(model, doc):', ['A trained model and a new document.']],
            ['prior, likelihood = model', ['Unpack.']],
            ['scores = {}', ['One log score per class.']],
            ['for c in prior:', ['For each class:']],
            ['scores[c] = math.log(prior[c]) + sum(math.log(likelihood[c][w]) for w in doc if w in likelihood[c])', ['$\\log P(c) + \\sum_i\\log P(w_i\\mid c)$; words never seen in training are skipped.'], { tex: '\\log P(c) + \\sum_i \\log P(w_i \\mid c)' }],
            ['return max(scores, key=scores.get), scores', ['The best class, and all scores.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Trained on four tiny emails (spam: "free money", "free offer"; ham: "meeting today", "project today"), what is $P(\\text{free} \\mid \\text{spam})$ with add-one smoothing? (4 decimals)',
          answer: trainNaiveBayes(DOCS, LABELS)[1].spam.free, tolerance: 0.00006, compute: () => trainNaiveBayes(DOCS, LABELS)[1].spam.free,
          explain: 'The 6-word vocabulary starts at 1 each; spam adds free ×2, money, offer: free has $1 + 2 = 3$ of $6 + 4 = 10$: 0.3.',
        },
      },
      {
        predict: {
          prompt: 'Classify "free money today". Give the spam score minus the ham score (log scale; positive means spam). (3 decimals)',
          answer: (() => { const s = predictNaiveBayes(trainNaiveBayes(DOCS, LABELS), ['free', 'money', 'today'])[1]; return s.spam - s.ham })(), tolerance: 0.0006,
          compute: () => { const s = predictNaiveBayes(trainNaiveBayes(DOCS, LABELS), ['free', 'money', 'today'])[1]; return s.spam - s.ham },
          explain: `${f((() => { const s = predictNaiveBayes(trainNaiveBayes(DOCS, LABELS), ['free', 'money', 'today'])[1]; return s.spam - s.ham })())}: "free" and "money" outweigh "today".`,
        },
      },
      { note: 'Naive Bayes: $P(c\\mid\\mathbf w) \\propto P(c)\\prod_i P(w_i\\mid c)$, assuming words independent given the class; compare log scores. Over-confident probabilities, often good rankings, trivially fast. Add-one smoothing is a prior.' },
    ],
  },

  {
    id: 'trees', title: 'Decision trees: impurity, entropy and information gain',
    goal: 'Grow a tree by choosing splits that most reduce entropy (information gain, a mutual information) or Gini impurity, and see why averaging many trees helps.',
    builds: ['information', 'entropy-kl', 'sums-of-variables'],
    blocks: [
      { md: `A **decision tree** asks a sequence of yes/no questions about the input ("is the income above 40k?", "is the age below 25?") and reads a prediction off the leaf it lands in. Training chooses the questions.

**Purity.** A good split sends the labels into groups that are each as uniform as possible. Two standard measures of how mixed a group's labels are:
- **Entropy** (lesson [[#information]]): $H = -\\sum_k p_k\\log_2 p_k$ bits, 0 for a pure group, 1 for a 50/50 binary mix.
- **Gini impurity**: $G = 1 - \\sum_k p_k^2$, the chance that two labels drawn at random (with replacement) from the group differ.

**Information gain.** A split divides $n$ examples into a left group of $n_L$ and a right group of $n_R$. The entropy after it is the size-weighted average, and the gain is the drop:
$$\\text{IG} = H(\\text{parent}) - \\left(\\frac{n_L}{n}H(\\text{left}) + \\frac{n_R}{n}H(\\text{right})\\right)$$
This is exactly the **mutual information** between the label and the split's answer (lesson [[#information]]: uncertainty about $Y$ removed by learning the answer). Training greedily picks, at each node, the feature and threshold with the largest gain, then recurses on each side until groups are pure or small.

**Trees overfit.** A deep tree can isolate every training point: zero training error, huge variance (lesson [[#bias-variance]]). Remedies: limit depth, or average many trees.

**Random forests and boosting.**
- A **random forest** trains many trees on resampled data (lesson [[#estimation]]'s bootstrap) with random subsets of features, and averages their predictions. Averaging $T$ predictions each with variance $\\sigma^2$ and pairwise correlation $\\rho$ gives variance $\\rho\\sigma^2 + \\frac{1 - \\rho}{T}\\sigma^2$ (lesson [[#sums-of-variables]] with the covariances included): randomising the features lowers $\\rho$, which is the point.
- **Gradient boosting** adds small trees one at a time, each fitted to the current errors (the negative gradient of the loss): gradient descent in the space of functions. On tables of mixed features it is still often the strongest method.` },
      { figure: 'TreeSplitFig', caption: 'Labelled points along one feature. Slide the threshold: the bar charts show each side\'s label mix, and the information gain and Gini decrease are plotted for every threshold; the best split is their peak.' },
      {
        code: {
          file: 'learners.py', fn: 'gini', notes: [
            ['def gini(labels):', ['A group\'s labels.']],
            ['n = len(labels)', ['Its size.']],
            ['return 1 - sum((labels.count(c) / n) ** 2 for c in set(labels))', ['$1 - \\sum_k p_k^2$.'], { tex: 'G = 1 - \\sum_k p_k^2' }],
          ],
        },
      },
      {
        code: {
          file: 'learners.py', fn: 'label_entropy', notes: [
            ['def label_entropy(labels):', ['A group\'s labels.']],
            ['n = len(labels)', ['Its size.']],
            ['return -sum((labels.count(c) / n) * math.log2(labels.count(c) / n) for c in set(labels))', ['$-\\sum_k p_k\\log_2 p_k$.']],
          ],
        },
      },
      {
        code: {
          file: 'learners.py', fn: 'best_split', notes: [
            ['def best_split(xs, ys):', ['One feature and the labels.']],
            ['base = label_entropy(ys)', ['$H(\\text{parent})$.']],
            ['best = (None, 0.0)', ['No split yet, no gain.']],
            ['for t in sorted(set(xs))[:-1]:', ['Try each distinct value as a threshold (the largest would leave the right side empty).']],
            ['left = [y for x, y in zip(xs, ys) if x <= t]', ['Labels answering "yes".']],
            ['right = [y for x, y in zip(xs, ys) if x > t]', ['And "no".']],
            ['after = (len(left) * label_entropy(left) + len(right) * label_entropy(right)) / len(ys)', ['Size-weighted entropy after the split.']],
            ['if base - after > best[1]:', ['A bigger gain…']],
            ['best = (t, base - after)', ['…becomes the best so far.']],
            ['return best', ['The threshold and its information gain.'], { tex: '\\text{IG} = H(Y) - H(Y \\mid \\text{split})' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the Gini impurity of labels $a, a, b$? (4 decimals)',
          answer: gini(['a', 'a', 'b']), tolerance: 0.00006, compute: () => gini(['a', 'a', 'b']),
          explain: '$1 - (2/3)^2 - (1/3)^2 = 4/9 = 0.4444$.',
        },
      },
      {
        predict: {
          prompt: 'Feature values 1–6 with labels $0, 0, 1, 0, 1, 1$: what is the best split\'s information gain in bits? (4 decimals)',
          answer: bestSplit([1, 2, 3, 4, 5, 6], [0, 0, 1, 0, 1, 1])[1], tolerance: 0.00006, compute: () => bestSplit([1, 2, 3, 4, 5, 6], [0, 0, 1, 0, 1, 1])[1],
          explain: `Threshold ${bestSplit([1, 2, 3, 4, 5, 6], [0, 0, 1, 0, 1, 1])[0]}: gain ${f(bestSplit([1, 2, 3, 4, 5, 6], [0, 0, 1, 0, 1, 1])[1])} of the parent's 1 bit. No single threshold separates them perfectly.`,
        },
      },
      { note: 'Trees split to reduce impurity: entropy (gain = mutual information between label and split) or Gini $1 - \\sum p^2$. Greedy, top-down. Deep trees overfit; forests average decorrelated trees (variance $\\rho\\sigma^2 + \\frac{1-\\rho}{T}\\sigma^2$); boosting fits trees to the residual gradient.' },
    ],
  },

  {
    id: 'k-means', title: 'k-means: clustering as minimising an objective',
    goal: 'Write k-means as minimising the within-cluster squared distance, prove each of its two steps can only lower that objective, and say why it stops at a local minimum.',
    builds: ['norm', 'minimum', 'sigma'],
    blocks: [
      { md: `**Clustering**: group unlabelled points so that points in a group are close. k-means makes that precise with an objective. Choose $k$ centres $\\boldsymbol\\mu_1, \\dots, \\boldsymbol\\mu_k$ and an assignment $c(i)$ of each point to a centre, to minimise the total squared distance from points to their centres:

$$J = \\sum_{i=1}^n \\big\\|\\mathbf x_i - \\boldsymbol\\mu_{c(i)}\\big\\|^2$$

Minimising over both at once is hard (it is NP-hard in general: no known fast method). **Lloyd's algorithm** alternates two easy steps:

1. **Assign**: with the centres fixed, put each point with its nearest centre.
2. **Update**: with the assignments fixed, move each centre to the mean of its points.

**Neither step can raise $J$.**
- Assign: $J$ is a sum with one term per point, and each term is at its smallest when the point goes to its nearest centre. Changing nothing else, that can't increase the sum.
- Update: for one cluster, $\\sum_{i}\\|\\mathbf x_i - \\boldsymbol\\mu\\|^2$ is a bowl in $\\boldsymbol\\mu$ (a sum of squares). Its gradient is $-2\\sum_i(\\mathbf x_i - \\boldsymbol\\mu)$, zero exactly at $\\boldsymbol\\mu = \\frac{1}{n_c}\\sum_i\\mathbf x_i$, the mean (lesson [[#minimum]]'s method, one coordinate at a time). The mean is the best centre for those points.

**So it must stop.** $J$ never increases, and there are only finitely many ways to assign $n$ points to $k$ clusters. If an assignment step changes anything it strictly lowers $J$ (ties aside), so no assignment can recur, and the algorithm stops after finitely many steps. But it stops at a **local** minimum: a stable arrangement that a different start might beat. In practice: run it from several random starts and keep the best $J$ (or use the "k-means++" start, which spreads the initial centres out).

**In ML.** Vector quantisation (turning continuous vectors into a codebook of $k$ entries, used by VQ-VAEs and audio tokenisers), colour compression, and as the "hard" limit of the next lesson's Gaussian mixtures.` },
      { figure: 'KMeansFig', caption: 'Step through Lloyd\'s algorithm: assign each point to its nearest centre (colours), then move each centre to its points\' mean. The objective $J$ (below) never goes up. Re-seed to land in a different local minimum.' },
      {
        code: {
          file: 'learners.py', fn: 'kmeans', notes: [
            ['def kmeans(points, k, iters=20, seed=0):', ['Points, the number of clusters, rounds, and a seed.']],
            ['rng = random.Random(seed)', ['Repeatable starts.']],
            ['order = list(range(len(points)))', ['Indices of the points…']],
            ['rng.shuffle(order)', ['…in random order…']],
            ['centres = [list(points[i]) for i in order[:k]]', ['…and the first $k$ become the starting centres.']],
            ['history = []', ['$J$ after each round.']],
            ['labels = [0] * len(points)', ['Assignments.']],
            ['for _ in range(iters):', ['Alternate:']],
            ['labels = [min(range(k), key=lambda c: sum((a - b) ** 2 for a, b in zip(p, centres[c]))) for p in points]', ['Step 1: each point to its nearest centre.']],
            ['for c in range(k):', ['Step 2, cluster by cluster:']],
            ['members = [p for p, l in zip(points, labels) if l == c]', ['its points…']],
            ['if members:', ['(an empty cluster keeps its centre)']],
            ['centres[c] = [sum(col) / len(members) for col in zip(*members)]', ['…and their mean.']],
            ['history.append(sum(sum((a - b) ** 2 for a, b in zip(p, centres[l])) for p, l in zip(points, labels)))', ['$J$: never larger than the round before.'], { tex: 'J = \\sum_i \\|\\mathbf x_i - \\boldsymbol\\mu_{c(i)}\\|^2' }],
            ['return centres, labels, history', ['Centres, clusters, and the objective\'s path.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'k-means with $k = 2$ on six points (two obvious groups), seed 3: what is the final objective $J$? (4 decimals)',
          answer: kmeans(POINTS, 2, 10, 3)[2].at(-1), tolerance: 0.00006, compute: () => kmeans(POINTS, 2, 10, 3)[2].at(-1),
          explain: `${f(kmeans(POINTS, 2, 10, 3)[2].at(-1))}: the total squared distance of the points to their group means.`,
        },
      },
      {
        predict: {
          prompt: 'The best centre for the points $(0, 0)$, $(0, 1)$, $(0.5, 0.2)$: what is its $y$-coordinate? (4 decimals)',
          answer: 0.4, tolerance: 0.00006, compute: () => (0 + 1 + 0.2) / 3,
          explain: 'The mean, $\\frac{0 + 1 + 0.2}{3} = 0.4$: where the sum of squared distances is smallest.',
        },
      },
      { note: 'k-means minimises $J = \\sum_i\\|\\mathbf x_i - \\boldsymbol\\mu_{c(i)}\\|^2$ by alternating nearest-centre assignment and mean updates; each step can only lower $J$ (the mean minimises a sum of squares), so it stops, at a local minimum. Restart several times.' },
    ],
  },

  {
    id: 'gmm-em', title: 'Gaussian mixtures and the EM algorithm',
    goal: 'Model data as a mixture of Gaussians, compute soft responsibilities by Bayes\' rule, update by weighted maximum likelihood, and prove with Jensen that EM never lowers the likelihood.',
    builds: ['k-means', 'jensen', 'mle', 'bayes'],
    blocks: [
      { md: `k-means makes **hard** choices: each point belongs to exactly one cluster. A **Gaussian mixture** makes soft ones, and gives a proper probability model of the data:

$$p(x) = \\sum_{j=1}^k \\pi_j\\,\\mathcal N(x;\\, \\mu_j, \\sigma_j^2)$$

Read it as a two-step story: pick a component $j$ with probability $\\pi_j$, then draw $x$ from that bell curve. We see $x$ but not which component made it.

**Why it's hard.** The log-likelihood $\\sum_i\\log\\sum_j\\pi_j\\mathcal N(x_i; \\mu_j, \\sigma_j^2)$ has a log of a sum, and setting its derivative to zero has no closed-form solution.

**The EM algorithm** alternates two easy steps:
- **E-step**: for each point, the **responsibility** of each component, its posterior probability by Bayes' rule (lesson [[#bayes]]): $r_{ij} = \\dfrac{\\pi_j\\mathcal N(x_i; \\mu_j, \\sigma_j^2)}{\\sum_l\\pi_l\\mathcal N(x_i; \\mu_l, \\sigma_l^2)}$.
- **M-step**: refit each component by **weighted** maximum likelihood (lesson [[#mle]], with each point counted $r_{ij}$ times): $\\mu_j = \\frac{\\sum_i r_{ij}x_i}{\\sum_i r_{ij}}$, $\\sigma_j^2 = \\frac{\\sum_i r_{ij}(x_i - \\mu_j)^2}{\\sum_i r_{ij}}$, $\\pi_j = \\frac1n\\sum_i r_{ij}$.

If every responsibility were 0 or 1 and the variances fixed and equal, this would be exactly k-means.

**Why the likelihood never falls.** For one point, multiply and divide inside the sum by any distribution $q_j$ over components, and use Jensen (lesson [[#jensen]]: $\\log$ is concave, so $\\log\\mathbb E \\ge \\mathbb E\\log$):
$$\\log p(x) = \\log\\sum_j q_j\\frac{\\pi_j\\mathcal N_j(x)}{q_j} \;\\ge\; \\sum_j q_j\\log\\frac{\\pi_j\\mathcal N_j(x)}{q_j} =: B(\\theta, q)$$
The bound is **exact** when $q$ is the responsibilities (then every ratio $\\frac{\\pi_j\\mathcal N_j}{q_j}$ equals $p(x)$, so there's nothing for Jensen to lose). So: the E-step sets $q$ to make the bound touch the log-likelihood at the current $\\theta$; the M-step maximises the bound over $\\theta$ (it is the weighted MLE). Then $L(\\theta_{\\text{new}}) \\ge B(\\theta_{\\text{new}}, q) \\ge B(\\theta_{\\text{old}}, q) = L(\\theta_{\\text{old}})$. $\\blacksquare$ The same "push up a lower bound" idea is the ELBO of variational autoencoders (lesson [[#vae-elbo]]).` },
      { figure: 'GMMFig', caption: 'Points along a line and a two-component mixture. Each EM step recolours the points by responsibility (soft colours), then refits the bells. The log-likelihood climbs and never drops.' },
      {
        code: {
          file: 'learners.py', fn: 'normal', notes: [
            ['def normal(x, mu, var):', ['One bell curve.']],
            ['return math.exp(-(x - mu) ** 2 / (2 * var)) / math.sqrt(2 * math.pi * var)', ['$\\mathcal N(x; \\mu, \\sigma^2)$ (lesson [[#normal]]).']],
          ],
        },
      },
      {
        code: {
          file: 'learners.py', fn: 'em_gmm', notes: [
            ['def em_gmm(xs, mus, iters=30):', ['Data and starting means.']],
            ['k = len(mus)', ['Number of components.']],
            ['mus = list(mus)', ['Copy.']],
            ['vars_ = [1.0] * k', ['Start with unit variances…']],
            ['weights = [1.0 / k] * k', ['…and equal weights.']],
            ['history = []', ['Log-likelihood after each step.']],
            ['for _ in range(iters):', ['Alternate:']],
            ['resp = []', ['E-step: responsibilities.']],
            ['for x in xs:', ['For each point…']],
            ['p = [weights[j] * normal(x, mus[j], vars_[j]) for j in range(k)]', ['…prior × likelihood for each component…']],
            ['s = sum(p)', ['…their total, $p(x)$…']],
            ['resp.append([v / s for v in p])', ['…divided out: the posterior $r_{ij}$ (Bayes).']],
            ['for j in range(k):', ['M-step, component by component:']],
            ['nj = sum(r[j] for r in resp)', ['its effective number of points…']],
            ['mus[j] = sum(r[j] * x for r, x in zip(resp, xs)) / nj', ['…weighted mean…']],
            ['vars_[j] = max(sum(r[j] * (x - mus[j]) ** 2 for r, x in zip(resp, xs)) / nj, 1e-6)', ['…weighted variance (kept away from 0, where a bell can collapse onto one point)…']],
            ['weights[j] = nj / len(xs)', ['…and its share of the data.']],
            ['history.append(sum(math.log(sum(weights[j] * normal(x, mus[j], vars_[j]) for j in range(k))) for x in xs))', ['The log-likelihood: never lower than the step before.'], { tex: 'L(\\theta) = \\sum_i\\log\\sum_j\\pi_j\\mathcal N(x_i;\\mu_j,\\sigma_j^2)' }],
            ['return mus, vars_, weights, history', ['The fitted mixture and its climb.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'EM on eight points clustered near 0 and near 5, starting means 0 and 1: where does the second mean end up? (3 decimals)',
          answer: emGmm([0.1, 0.3, -0.2, 4.9, 5.2, 5.1, 0, 4.8], [0, 1], 15)[0][1], tolerance: 0.0006, compute: () => emGmm([0.1, 0.3, -0.2, 4.9, 5.2, 5.1, 0, 4.8], [0, 1], 15)[0][1],
          explain: `${f(emGmm([0.1, 0.3, -0.2, 4.9, 5.2, 5.1, 0, 4.8], [0, 1], 15)[0][1])}: it walks over to the cluster near 5 and settles on its mean.`,
        },
      },
      {
        predict: {
          prompt: 'Did the log-likelihood ever decrease over those 15 steps? (1 for yes, 0 for no)',
          answer: 0, compute: () => { const h = emGmm([0.1, 0.3, -0.2, 4.9, 5.2, 5.1, 0, 4.8], [0, 1], 15)[3]; return Number(h.some((v, i) => i > 0 && v < h[i - 1] - 1e-9)) },
          explain: 'Never, as the Jensen argument guarantees.',
        },
      },
      { note: 'Mixture $p(x) = \\sum_j\\pi_j\\mathcal N(x;\\mu_j,\\sigma_j^2)$. E-step: responsibilities by Bayes; M-step: weighted MLE. Jensen gives a lower bound that the E-step makes tight and the M-step raises, so the likelihood never falls. Hard responsibilities give k-means.' },
    ],
  },

  {
    id: 'svm', title: 'Support vector machines: margins and the hinge loss',
    goal: 'Derive the margin $1/\\|\\mathbf w\\|$ from the distance to a hyperplane, set up the max-margin problem, relax it to the hinge loss, and connect its dual to kernels.',
    builds: ['duality', 'logistic-regression', 'orthogonality'],
    blocks: [
      { md: `Logistic regression draws a boundary that makes the training labels likely. An SVM draws the boundary that stays as **far** as possible from both classes: the widest street between them.

**Distance to a boundary.** A linear classifier predicts with the sign of $\\mathbf w^\\top\\mathbf x + b$; its boundary is the hyperplane $\\mathbf w^\\top\\mathbf x + b = 0$, and $\\mathbf w$ is perpendicular to it. The distance from a point to the hyperplane is the length of its shadow along $\\mathbf w$ (lesson [[#orthogonality]]): $\\frac{|\\mathbf w^\\top\\mathbf x + b|}{\\|\\mathbf w\\|}$.

**The max-margin problem.** Scaling $\\mathbf w$ and $b$ by the same factor doesn't move the boundary, so fix the scale by asking that the closest points have $y_i(\\mathbf w^\\top\\mathbf x_i + b) = 1$ (labels $y_i = \\pm1$). Then the **margin**, the distance to the closest points, is $\\frac{1}{\\|\\mathbf w\\|}$. Maximising it means minimising $\\|\\mathbf w\\|$:
$$\\min_{\\mathbf w, b}\;\\tfrac12\\|\\mathbf w\\|^2 \\quad\\text{subject to}\\quad y_i(\\mathbf w^\\top\\mathbf x_i + b) \\ge 1 \\text{ for all } i$$
a convex problem with inequality constraints (lessons [[#convexity]] and [[#kkt]]).

**Soft margins and the hinge loss.** Real data overlaps, so let points violate the margin at a price. The cheapest violation for point $i$ is $\\max(0,\\, 1 - y_if(\\mathbf x_i))$, the **hinge loss**: zero for points safely on the right side, growing linearly as they intrude. The objective becomes
$$\\frac\\lambda2\\|\\mathbf w\\|^2 + \\frac1n\\sum_i\\max\\big(0,\; 1 - y_i(\\mathbf w^\\top\\mathbf x_i + b)\\big)$$
Compare logistic regression's loss $\\log(1 + e^{-yf})$: both punish wrong or unsure predictions, but the hinge loss is **exactly zero** beyond the margin, so most points stop mattering.

**Training.** The hinge has a corner, so use a **subgradient** (any slope between the two sides at the corner) in SGD (lesson [[#sgd]]): for a point inside the margin, step toward $y_i\\mathbf x_i$; for every point, shrink $\\mathbf w$ a little (the $\\lambda$ term).

**The dual and kernels.** Lesson [[#duality]] derived this problem's dual: only the **support vectors** (points on or inside the margin) get nonzero multipliers, and the data enters only through dot products, which a kernel can replace to draw curved boundaries.` },
      { figure: 'SVMFig', caption: 'Two classes and a linear boundary with its margin (the street). Drag the angle and offset: the hinge loss counts only points inside the street or on the wrong side. Train to find the widest street; the support vectors are circled.' },
      {
        code: {
          file: 'learners.py', fn: 'hinge_loss', notes: [
            ['def hinge_loss(w, b, X, y, lam):', ['Weights, bias, data, ±1 labels, and $\\lambda$.']],
            ['margins = [yi * (sum(wj * xj for wj, xj in zip(w, x)) + b) for x, yi in zip(X, y)]', ['$y_if(\\mathbf x_i)$: positive and $\\ge 1$ means safely right.']],
            ['return lam / 2 * sum(wj * wj for wj in w) + sum(max(0.0, 1 - m) for m in margins) / len(X)', ['$\\frac\\lambda2\\|\\mathbf w\\|^2$ plus the average hinge.'], { tex: '\\tfrac\\lambda2\\|\\mathbf w\\|^2 + \\tfrac1n\\sum_i\\max(0, 1 - y_if(\\mathbf x_i))' }],
          ],
        },
      },
      {
        code: {
          file: 'learners.py', fn: 'svm_sgd', notes: [
            ['def svm_sgd(X, y, lam=0.01, epochs=200, seed=0):', ['Subgradient SGD with the step $\\frac{1}{\\lambda t}$ (the "Pegasos" schedule).']],
            ['rng = random.Random(seed)', ['Repeatable order.']],
            ['w = [0.0] * len(X[0])', ['Start at zero.']],
            ['b = 0.0', ['And no offset.']],
            ['t = 0', ['Step counter.']],
            ['order = list(range(len(X)))', ['Example indices.']],
            ['for _ in range(epochs):', ['Passes over the data…']],
            ['rng.shuffle(order)', ['…in random order.']],
            ['for i in order:', ['Each example:']],
            ['t += 1', ['next step…']],
            ['eta = 1 / (lam * t)', ['…with a shrinking step size (lesson [[#sgd]]).']],
            ['margin = y[i] * (sum(wj * xj for wj, xj in zip(w, X[i])) + b)', ['How safely it is classified.']],
            ['w = [wj * (1 - eta * lam) for wj in w]', ['The $\\lambda$ term\'s gradient: shrink $\\mathbf w$.']],
            ['if margin < 1:', ['Inside the street or wrong:']],
            ['w = [wj + eta * y[i] * xj for wj, xj in zip(w, X[i])]', ['the hinge\'s subgradient pushes $\\mathbf w$ toward $y_i\\mathbf x_i$…']],
            ['b += eta * y[i] * 0.1', ['…and nudges the offset (more gently, since $b$ is not regularised).']],
            ['return w, b', ['The trained boundary.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'For $\\mathbf w = (0.5, -0.2)$, $b = 0.1$, $\\lambda = 0.1$ and the points $(1, 2)$ label $+1$, $(-1, 0.5)$ label $-1$, $(2, -1)$ label $+1$: what is the SVM objective? (4 decimals)',
          answer: hingeLoss([0.5, -0.2], 0.1, [[1, 2], [-1, 0.5], [2, -1]], [1, -1, 1], 0.1), tolerance: 0.00006,
          compute: () => hingeLoss([0.5, -0.2], 0.1, [[1, 2], [-1, 0.5], [2, -1]], [1, -1, 1], 0.1),
          explain: `Margins $0.2$, $0.5$, $1.3$; hinges $0.8$, $0.5$, $0$; average $0.4333$, plus $0.05 \\times 0.29$: ${f(hingeLoss([0.5, -0.2], 0.1, [[1, 2], [-1, 0.5], [2, -1]], [1, -1, 1], 0.1))}.`,
        },
      },
      {
        predict: {
          prompt: 'A boundary has $\\|\\mathbf w\\| = 4$ with the closest points at $y(\\mathbf w^\\top\\mathbf x + b) = 1$. How wide is the margin on each side?',
          answer: 0.25, tolerance: 1e-9, compute: () => 1 / 4,
          explain: '$1/\\|\\mathbf w\\| = 0.25$: halving $\\|\\mathbf w\\|$ would double it.',
        },
      },
      { python: { program: 'learners', label: 'Run the classical learners in real Python' } },
      {
        code: {
          file: 'learners.py', fn: 'show_learners', notes: [
            ['def show_learners():', ['One line per learner.']],
            ['print("bias² and variance of a straight-line fit:", bias_variance(1, trials=20))', ['Lesson [[#bias-variance]], with few datasets so it runs quickly.']],
            ['model = train_naive_bayes([["free", "money"], ["meeting", "today"]], ["spam", "ham"])', ['Lesson [[#naive-bayes]]: two documents…']],
            ['print("naive Bayes on \'free offer\':", predict_naive_bayes(model, ["free", "offer"])[0])', ['…and a new one, classified by its words.']],
            ['print("best split of 1..6 labelled 0,0,0,1,1,1:", best_split([1, 2, 3, 4, 5, 6], [0, 0, 0, 1, 1, 1]))', ['Lesson [[#trees]]: a perfect split, a full bit of information.']],
            ['print("Gini and entropy of a 50/50 group:", gini([0, 1]), label_entropy([0, 1]))', ['The two impurities at their largest for two classes.']],
            ['print("k-means centres of four points:", kmeans([[0, 0], [0, 1], [5, 5], [5, 6]], 2, iters=3)[0])', ['Lesson [[#k-means]]: two obvious clusters.']],
            ['print("hinge loss of w = (1, 1), b = 0:", hinge_loss([1.0, 1.0], 0.0, [[1, 1], [-1, -1]], [1, -1], 0.1))', ['This lesson: both points have margin 2, so only the $\\frac\\lambda2\\|\\mathbf w\\|^2$ term is left.']],
          ],
        },
      },
      { note: 'Distance to the boundary: $|\\mathbf w^\\top\\mathbf x + b|/\\|\\mathbf w\\|$; with the closest points at 1, margin $1/\\|\\mathbf w\\|$. Max margin: min $\\frac12\\|\\mathbf w\\|^2$ s.t. $y_if(\\mathbf x_i) \\ge 1$. Soft margin: hinge loss $\\max(0, 1 - yf)$ + $\\frac\\lambda2\\|\\mathbf w\\|^2$. The dual uses only dot products: kernels.' },
    ],
  },

  {
    id: 'initialisation', title: 'Initialising weights: the variance argument',
    goal: 'Derive how a layer scales its inputs\' variance, show ReLU halves the second moment, and get He ($2/n$) and Xavier ($2/(n_{\\text{in}} + n_{\\text{out}})$) initialisation from keeping variance steady.',
    builds: ['sums-of-variables', 'layers', 'independence'],
    blocks: [
      { md: `A deep network multiplies its input by one weight matrix after another. If each layer makes the signal a little bigger, after 50 layers it explodes; a little smaller, and it vanishes to nothing, and so do the gradients flowing back. The scale of the random starting weights decides which. Here is how to choose it.

**One layer's effect on variance.** A neuron computes $z = \\sum_{j=1}^{n} w_jh_j$ from $n$ inputs. At initialisation, let the weights be independent with mean 0 and variance $\\sigma_w^2$, and independent of the inputs. Each term $w_jh_j$ has mean $\\mathbb E[w_j]\\mathbb E[h_j] = 0$ and variance $\\mathbb E[w_j^2h_j^2] = \\mathbb E[w_j^2]\\,\\mathbb E[h_j^2] = \\sigma_w^2\\,\\mathbb E[h^2]$ (expectations of independent products factor, lesson [[#sums-of-variables]]). The $n$ terms are independent, so variances add:
$$\\mathrm{Var}(z) = n\\,\\sigma_w^2\\,\\mathbb E[h^2]$$

**ReLU halves the second moment.** If $z$ is symmetric around 0, then $h = \\max(0, z)$ is $z$ half the time and 0 the other half: $\\mathbb E[h^2] = \\frac12\\mathbb E[z^2] = \\frac12\\mathrm{Var}(z)$.

**Keeping it steady.** Chain the two: the next layer's pre-activation variance is $n\\,\\sigma_w^2\\cdot\\frac12\\mathrm{Var}(z_{\\text{prev}})$. It stays the same from layer to layer exactly when $n\\sigma_w^2/2 = 1$:
$$\\sigma_w^2 = \\frac{2}{n} \\qquad\\text{(He initialisation, for ReLU)}$$
Smaller and the signal shrinks by a constant factor per layer (exponentially with depth); bigger and it grows exponentially.

For activations that are roughly linear near 0 (tanh), the factor $\\frac12$ is absent and the rule is $\\sigma_w^2 = \\frac1n$. The backward pass multiplies gradients by the transposed weights (lesson [[#jacobian]]), which scales by $n_{\\text{out}}$ instead of $n_{\\text{in}}$; **Xavier/Glorot** initialisation compromises with $\\sigma_w^2 = \\frac{2}{n_{\\text{in}} + n_{\\text{out}}}$. Every deep-learning library uses one of these by default.` },
      { figure: 'InitFig', caption: 'A random input pushed through 30 ReLU layers of width 64. Each bar is a layer\'s output spread. Slide the weight scale: below $\\sqrt2$ the signal dies, above it explodes; at $\\sqrt2$ (He) it holds steady.' },
      {
        code: {
          file: 'deep.py', fn: 'activation_spread', notes: [
            ['def activation_spread(depth, width, scale, seed=0):', ['Weights get standard deviation $\\text{scale}/\\sqrt{\\text{width}}$, so scale $= \\sqrt2$ is He.']],
            ['rng = random.Random(seed)', ['Repeatable weights.']],
            ['h = [rng.gauss(0, 1) for _ in range(width)]', ['A random input with spread 1.']],
            ['spreads = []', ['One spread per layer.']],
            ['for _ in range(depth):', ['Each layer:']],
            ['W = [[rng.gauss(0, scale / math.sqrt(width)) for _ in range(width)] for _ in range(width)]', ['fresh random weights with variance $\\text{scale}^2/n$…']],
            ['h = [max(0.0, sum(w * v for w, v in zip(row, h))) for row in W]', ['…then $\\text{ReLU}(W\\mathbf h)$…']],
            ['spreads.append(math.sqrt(sum(v * v for v in h) / width))', ['…and the root-mean-square of the outputs.']],
            ['return spreads', ['How the signal\'s size evolves with depth.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'A layer has 256 inputs and ReLU activations. What weight standard deviation does He initialisation give? (4 decimals)',
          answer: Math.sqrt(2 / 256), tolerance: 0.00006, compute: () => Math.sqrt(2 / 256),
          explain: '$\\sqrt{2/256} = 0.0884$.',
        },
      },
      {
        predict: {
          prompt: 'With weight scale 1 instead of $\\sqrt2$ (so $\\sigma_w^2 = 1/n$), by roughly what factor does the second moment shrink per ReLU layer?',
          answer: 0.5, tolerance: 1e-9, compute: () => 1 / 2,
          explain: '$n \\cdot \\frac1n \\cdot \\frac12 = \\frac12$: after 30 layers the signal\'s variance is $2^{-30} \\approx 10^{-9}$ of what it was.',
        },
      },
      { note: '$\\mathrm{Var}(z) = n\\sigma_w^2\\mathbb E[h^2]$; ReLU gives $\\mathbb E[h^2] = \\frac12\\mathrm{Var}(z)$. Steady signals need $\\sigma_w^2 = 2/n$ (He, ReLU), $1/n$ (tanh), or $2/(n_{\\text{in}} + n_{\\text{out}})$ (Xavier, balancing the backward pass).' },
    ],
  },

  {
    id: 'normalisation', title: 'Batch and layer normalisation',
    goal: 'Write batch and layer normalisation as "subtract the mean, divide by the standard deviation" over different axes, see why the learned scale and shift are needed, and know where each is used.',
    builds: ['initialisation', 'variance', 'tensors'],
    blocks: [
      { md: `Good initialisation keeps signals well-scaled at the **start** of training; normalisation keeps them that way **throughout**, by explicitly standardising activations inside the network.

**The core operation** is the one from lesson [[#normal]]'s $z$-score: subtract the mean, divide by the standard deviation, so the values have mean 0 and variance 1:
$$\\hat x = \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}}$$
($\\epsilon$, about $10^{-5}$, avoids dividing by zero.) The two methods differ only in **which numbers** $\\mu$ and $\\sigma^2$ are computed over (lesson [[#tensors]]'s axes, for activations of shape (batch, features)):

- **Batch normalisation**: for each feature, over the **batch**. Every feature gets mean 0, variance 1 across the examples in the batch.
- **Layer normalisation**: for each example, over its **features**. Every example's activation vector gets mean 0, variance 1.

**Then a learned scale and shift.** Forcing mean 0 and variance 1 would limit what the layer can express, so each feature gets two learned parameters: $y = \\gamma\\hat x + \\beta$. If standardising turns out to hurt, the network can learn $\\gamma = \\sigma$, $\\beta = \\mu$ and undo it; usually it learns something in between.

**Why it helps.** It keeps every layer's inputs in a stable range as the earlier layers' weights change, so the loss surface is better conditioned (lesson [[#gd-convergence]]): larger learning rates work and training is faster and less sensitive to initialisation.

**Which, where.**
- Batch norm depends on the other examples in the batch: at test time it uses running averages of $\\mu$ and $\\sigma^2$ collected during training, and it struggles with small batches and with sequences of varying length. It is standard in convolutional networks.
- Layer norm treats each example on its own, works the same in training and test, and suits sequences. It is in every Transformer (next lessons). **RMSNorm**, used by many recent language models, skips subtracting the mean and divides by $\\sqrt{\\text{mean of } x^2}$: cheaper and about as good.` },
      { figure: 'LayerNormFig', caption: 'A batch of activations (rows: examples, columns: features). Batch norm standardises each column; layer norm each row. Toggle between them and watch which averages become 0.' },
      {
        code: {
          file: 'deep.py', fn: 'layer_norm', notes: [
            ['def layer_norm(x, eps=1e-5):', ['One example\'s feature vector.']],
            ['m = sum(x) / len(x)', ['Its mean over features…']],
            ['v = sum((a - m) ** 2 for a in x) / len(x)', ['…and variance.']],
            ['return [(a - m) / math.sqrt(v + eps) for a in x]', ['Standardised. (A real layer then applies $\\gamma\\hat x + \\beta$.)'], { tex: '\\hat x = \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}}' }],
          ],
        },
      },
      {
        code: {
          file: 'deep.py', fn: 'batch_norm', notes: [
            ['def batch_norm(batch, eps=1e-5):', ['A batch: one row per example.']],
            ['cols = list(zip(*batch))', ['Turn it into columns: one per feature.']],
            ['out_cols = []', ['Standardised columns.']],
            ['for col in cols:', ['For each feature…']],
            ['m = sum(col) / len(col)', ['…its mean across the batch…']],
            ['v = sum((a - m) ** 2 for a in col) / len(col)', ['…and variance…']],
            ['out_cols.append([(a - m) / math.sqrt(v + eps) for a in col])', ['…and standardise.']],
            ['return [list(row) for row in zip(*out_cols)]', ['Back to rows.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Layer-normalise $(1, 2, 4, 9)$. What is the first entry? (4 decimals)',
          answer: layerNorm([1, 2, 4, 9])[0], tolerance: 0.00006, compute: () => layerNorm([1, 2, 4, 9])[0],
          explain: `Mean 4, variance $\\frac{9 + 4 + 0 + 25}{4} = 9.5$: $(1 - 4)/\\sqrt{9.5} = ${f(layerNorm([1, 2, 4, 9])[0])}$.`,
        },
      },
      {
        choice: {
          prompt: 'A Transformer processes one sentence at a time at inference. Why does it use layer norm rather than batch norm?',
          options: [
            { text: 'Layer norm uses only that example\'s own features, so it behaves the same with a batch of one and at any sequence length', why: 'Yes: batch norm\'s statistics come from other examples, which aren\'t there.' },
            { text: 'Layer norm has more parameters', why: 'Both have a scale and shift per feature.' },
            { text: 'Batch norm can\'t be differentiated', why: 'It can; it is used everywhere in vision models.' },
          ],
          answer: 0,
        },
      },
      { note: 'Normalisation: $\\hat x = (x - \\mu)/\\sqrt{\\sigma^2 + \\epsilon}$, then learned $\\gamma\\hat x + \\beta$. Batch norm: statistics per feature over the batch (convnets). Layer norm: per example over features (Transformers). RMSNorm drops the mean.' },
    ],
  },

  {
    id: 'dropout', title: 'Dropout: training an ensemble by zeroing at random',
    goal: 'Show inverted dropout keeps each activation\'s expectation unchanged, explain why that lets test time use the whole network, and read dropout as averaging exponentially many sub-networks.',
    builds: ['expectation', 'bias-variance', 'layers'],
    blocks: [
      { md: `**Dropout**: during training, set each activation to zero independently with probability $p$ (often 0.1 to 0.5), a fresh random pattern for every example and step. At test time, use every unit.

**Keeping the expectation.** Zeroing units shrinks the next layer's input on average, so the network would see bigger signals at test time than in training. **Inverted dropout** fixes that by scaling the survivors: each activation $a$ becomes
$$\\tilde a = \\begin{cases} 0 & \\text{with probability } p \\\\ \\frac{a}{1-p} & \\text{with probability } 1 - p\\end{cases}$$
Its expectation (lesson [[#expectation]]) is $p \\cdot 0 + (1 - p)\\frac{a}{1-p} = a$: on average, exactly the original. So at test time, using all units with no scaling gives the network the same expected input as in training.

**Why it regularises.** A unit can't rely on any particular other unit being present, so the network can't build fragile co-adaptations (one neuron cancelling another's quirks). Each training step trains a different random **sub-network**; with $n$ droppable units there are $2^n$ of them, all sharing weights. Using the full network at test time approximates averaging all their predictions: an ensemble, which lowers variance (lesson [[#bias-variance]]). The approximation is exact for a single linear layer (by the expectation argument) and only approximate through non-linearities.

**Where it's used.** Fully connected layers and Transformers (on attention weights and residual branches). It is often turned down or off in very large language models trained on enormous data, where overfitting matters less than in small-data settings.` },
      { figure: 'DropoutFig', caption: 'A small network with dropout: each press draws a new random mask (greyed units are dropped, survivors scaled up). The running average of the output over many masks converges to the full network\'s output.' },
      {
        code: {
          file: 'deep.py', fn: 'dropout', notes: [
            ['def dropout(x, p, rng):', ['Activations, drop probability, and a random generator.']],
            ['return [0.0 if rng.random() < p else a / (1 - p) for a in x]', ['Each entry: zeroed with probability $p$, otherwise scaled by $\\frac{1}{1-p}$. Expectation unchanged.'], { tex: '\\mathbb E[\\tilde a] = (1 - p)\\frac{a}{1-p} = a' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'With $p = 0.4$, what does a surviving activation of 3 become?',
          answer: 5, tolerance: 1e-9, compute: () => 3 / (1 - 0.4),
          explain: '$3/0.6 = 5$; and $0.6 \\times 5 + 0.4 \\times 0 = 3$ on average.',
        },
      },
      {
        predict: {
          prompt: 'Average the dropped-out version of the activation 2.0 over 20,000 random masks with $p = 0.3$ (seed 1). (2 decimals)',
          answer: 2, tolerance: 0.03, compute: () => { const rng = new PyRandom(1); let s = 0; for (let i = 0; i < 20000; i++) s += dropout([2], 0.3, rng)[0]; return s / 20000 },
          explain: 'About 2.00: the expectation is preserved, so no rescaling is needed at test time.',
        },
      },
      { note: 'Inverted dropout: zero with probability $p$, scale survivors by $1/(1-p)$, so $\\mathbb E[\\tilde a] = a$; test time uses all units unchanged. It trains $2^n$ weight-sharing sub-networks and approximates their ensemble average.' },
    ],
  },

  {
    id: 'convolution', title: 'Convolution: a sum, a matrix, and a shared filter',
    goal: 'Compute a convolution as a sliding dot product, write it as a sparse matrix with repeated weights, prove it is translation-equivariant, and compute output sizes and parameter counts.',
    builds: ['dot-product', 'matrix-multiplication', 'loop-costs'],
    blocks: [
      { md: `Images, audio and text have structure that repeats across positions: an edge is an edge wherever it appears. A **convolution** looks for the same pattern everywhere with the same small set of weights, the **kernel** (or filter).

**As a sum.** Slide a kernel $k$ of length $m$ along a signal $x$ and take a dot product at each position (lesson [[#dot-product]]):
$$y_i = \\sum_{j=0}^{m-1} k_j\\,x_{i+j}$$
(Mathematicians' convolution flips the kernel, $\\sum_j k_jx_{i-j}$; deep-learning libraries skip the flip, which is technically *cross-correlation*, and call it convolution anyway. Since the kernel is learned, the difference doesn't matter.) The kernel $(1, 0, -1)$ responds to a rising or falling edge; $(\\frac13, \\frac13, \\frac13)$ blurs. In two dimensions, the kernel is a small grid slid across an image.

**As a matrix.** The same operation is multiplication by a matrix whose rows are the kernel shifted one place at a time: mostly zeros, with the same $m$ numbers repeated on a band. So a convolution **is** a linear layer (lesson [[#matrix-multiplication]]), but one with two constraints: each output looks only at a small window (**sparse connections**), and every window uses the same weights (**weight sharing**). A fully connected layer from 1000 inputs to 1000 outputs has $10^6$ weights; a convolution with a kernel of 9 has 9.

**Translation equivariance.** Shift the input one place, $x'_i = x_{i-1}$, and the output shifts too: $y'_i = \\sum_j k_jx'_{i+j} = \\sum_j k_jx_{i-1+j} = y_{i-1}$. Detect a feature, move it, and its detection moves with it. That built-in assumption is why convolutional networks need far less data for images than fully connected ones.

**Sizes.** With input length $n$, kernel $m$, **padding** $q$ zeros on each side and **stride** $s$ (moving the window $s$ places at a time), the output length is $\\left\\lfloor\\frac{n + 2q - m}{s}\\right\\rfloor + 1$. Stacking layers grows each output's **receptive field**, the input region it depends on: two layers of kernel 3 see 5 inputs; $L$ layers see $2L + 1$.` },
      { figure: 'ConvolutionSlideFig', caption: 'A kernel sliding along a signal: each output is the dot product under the window. Below, the same operation as a banded matrix. Shift the input and the output shifts with it.' },
      {
        code: {
          file: 'deep.py', fn: 'conv1d', notes: [
            ['def conv1d(x, k):', ['A signal and a kernel.']],
            ['n = len(x) - len(k) + 1', ['Positions where the kernel fits entirely ("valid" padding).']],
            ['return [sum(k[j] * x[i + j] for j in range(len(k))) for i in range(n)]', ['The window\'s dot product at each position.'], { tex: 'y_i = \\sum_j k_j\\,x_{i+j}' }],
          ],
        },
      },
      {
        code: {
          file: 'deep.py', fn: 'conv_matrix', notes: [
            ['def conv_matrix(k, n):', ['The kernel and the input length.']],
            ['rows = n - len(k) + 1', ['One row per output.']],
            ['return [[k[j - i] if 0 <= j - i < len(k) else 0.0 for j in range(n)] for i in range(rows)]', ['Row $i$ holds the kernel starting at column $i$: a band of shared weights, zeros elsewhere.']],
          ],
        },
      },
      {
        code: {
          file: 'deep.py', fn: 'conv2d', notes: [
            ['def conv2d(img, k):', ['An image and a 2D kernel.']],
            ['h, w = len(img) - len(k) + 1, len(img[0]) - len(k[0]) + 1', ['The output size: where the kernel fits.']],
            ['return [[sum(k[a][b] * img[i + a][j + b] for a in range(len(k)) for b in range(len(k[0]))) for j in range(w)] for i in range(h)]', ['Each output: the kernel dotted with one patch.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Convolve $x = (1, 2, 3, 4, 5)$ with $k = (1, 0, -1)$. What is the first output?',
          answer: conv1d([1, 2, 3, 4, 5], [1, 0, -1])[0], compute: () => conv1d([1, 2, 3, 4, 5], [1, 0, -1])[0],
          explain: '$1 \\cdot 1 + 0 \\cdot 2 - 1 \\cdot 3 = -2$; every output is $-2$, since the signal rises steadily.',
        },
      },
      {
        predict: {
          prompt: 'How many nonzero entries are in the matrix form of that convolution (kernel length 3 on 5 inputs)?',
          answer: convMatrix([1, 0.5, -1], 5).flat().filter(v => v !== 0).length, compute: () => convMatrix([1, 0.5, -1], 5).flat().filter(v => v !== 0).length,
          explain: '3 outputs × 3 kernel entries = 9 nonzeros out of 15, and only 3 distinct values.',
        },
      },
      {
        predict: {
          prompt: 'Input length 32, kernel 5, padding 2, stride 2: what is the output length?',
          answer: 16, compute: () => Math.floor((32 + 4 - 5) / 2) + 1,
          explain: '$\\lfloor(32 + 4 - 5)/2\\rfloor + 1 = 15 + 1 = 16$: stride 2 halves the length.',
        },
      },
      { note: 'Convolution: $y_i = \\sum_j k_jx_{i+j}$, a sliding dot product. As a matrix: banded, with shared weights. Shift in, shift out (translation equivariance). Output length $\\lfloor(n + 2q - m)/s\\rfloor + 1$; receptive fields grow with depth.' },
    ],
  },
]
