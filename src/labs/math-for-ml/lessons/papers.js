// Paper walkthroughs, first half: Dropout, word2vec (with InfoNCE), Auto-Encoding Variational Bayes, Adam and
// Batch Normalization. Each reads a real paper's key equations in its own notation, decodes them, and proves
// what the paper states without proof. Placed in the papers part by lessons/index.js, in publication order.
import {
  dropoutLossMarginal, dropoutRidge, bestPairScore, noiseDistribution, discardProbability, toyElbo, logNormal, estimatorSpread, estimatorA, estimatorB,
  gradientEstimates, meanAndVariance, adamSteps, bnBackwardCompact, bnBackward, bnInference,
  DROP_X, DROP_Y,
} from '../engine/maths.js'
import { f } from './util.js'

const B1 = 0.9, B2 = 0.999
const spikeStep = () => Math.abs(adamSteps([...Array(999).fill(0), 1], 1).at(-1))
const growthLimit = () => (1 - B1) / Math.sqrt(1 - B2) / Math.sqrt(1 - B1 * B1 / B2)

export const PAPERS1 = [
  {
    id: 'paper-dropout', title: 'Paper: Dropout (Srivastava et al., 2014)',
    goal: 'Read the dropout paper\'s model equations and its test-time rule, notice that its $p$ is the opposite of PyTorch\'s, and prove its section 9.1 claim that dropout on linear regression is ridge regression in disguise.',
    builds: ['dropout', 'regularisation', 'least-squares', 'variance', 'sums-of-variables', 'common-distributions', 'matrix-calculus'],
    blocks: [
      { md: `**The paper.** Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya Sutskever and Ruslan Salakhutdinov, "Dropout: A Simple Way to Prevent Neural Networks from Overfitting", *Journal of Machine Learning Research* 15 (2014). An earlier version appeared on arXiv in 2012. Lesson [[#dropout]] built the idea. This lesson reads the paper's own equations, where one letter means the opposite of what most code means, and proves a result the paper states without proof.

The walkthroughs in this part follow the papers in the order they first appeared (this one first circulated in 2012), and each one uses the method of lesson [[#reading-papers]]: find the output, name every symbol, spot the familiar shapes, check the sizes, then say it in a sentence and as code.

**Section 4: the model.** A standard layer computes, for each unit $i$ of layer $l + 1$:
$$z_i^{(l+1)} = \\mathbf w_i^{(l+1)}\\mathbf y^{(l)} + b_i^{(l+1)}, \\qquad y_i^{(l+1)} = f\\big(z_i^{(l+1)}\\big)$$
The superscript $(l)$ in brackets is a layer number, not a power (lesson [[#subscripts]]). The paper's typesetting drops the brackets once, printing $\\mathbf y^l$; read it as $\\mathbf y^{(l)}$. Small slips like this are common, and the cure is always the same: check against the definition. With dropout the layer becomes
$$r_j^{(l)} \\sim \\text{Bernoulli}(p), \\qquad \\tilde{\\mathbf y}^{(l)} = \\mathbf r^{(l)} * \\mathbf y^{(l)}, \\qquad z_i^{(l+1)} = \\mathbf w_i^{(l+1)}\\tilde{\\mathbf y}^{(l)} + b_i^{(l+1)}$$
Piece by piece:
- $r_j^{(l)} \\sim \\text{Bernoulli}(p)$: unit $j$ of layer $l$ gets its own coin, 1 with probability $p$ and 0 otherwise (lesson [[#common-distributions]]). **In this paper $p$ is the probability of keeping a unit.** PyTorch's \`nn.Dropout(p)\` uses $p$ for the probability of *dropping* one. Same letter, opposite meaning: the paper's $p = 0.8$ is PyTorch's \`p=0.2\`. Read a symbol's meaning from the paper in front of you, never from the library you know.
- $*$ is the element-wise product (most papers write $\\odot$). $\\tilde{\\mathbf y}$, "y tilde", is the thinned output: each unit either passes through or is zeroed.
- The last equation is the ordinary layer, fed the thinned outputs.

**Test time.** The paper keeps every unit and scales the weights: $W^{(l)}_{\\text{test}} = pW^{(l)}$. Why $p$: during training, unit $j$ contributes $r_jy_jw_{ij}$ to $z_i$, whose expected value is $p\\,y_jw_{ij}$, because $\\mathbb E[r_j] = p$ and expectation is linear (lesson [[#expectation]]). Multiplying the weights by $p$ hands the test network the training network's average input. Section 10 notes the equivalent form most code uses today, **inverted dropout**: multiply the kept units by $1/p$ during training and change nothing at test time. That is the version lesson [[#dropout]] derived.` },
      { md: `**Section 9.1: dropout is ridge regression in disguise.** The paper applies dropout to the inputs of linear regression. $X$ is the $N \\times D$ data matrix (one row per example), $\\mathbf y$ holds the targets, and $R$ is an $N \\times D$ matrix of independent Bernoulli($p$) keep-coins. The loss, averaged over the coins, is
$$\\mathbb E_{R}\\big[\\|\\mathbf y - (R * X)\\mathbf w\\|^2\\big]$$
and the paper says it "reduces to" $\\|\\mathbf y - pX\\mathbf w\\|^2 + p(1 - p)\\|\\Gamma\\mathbf w\\|^2$, where $\\Gamma = (\\text{diag}(X^\\top X))^{1/2}$. No proof is given. Here is one.

**One useful identity.** For any fixed number $y$ and random number $\\hat y$ with mean $m$: write $y - \\hat y = (y - m) - (\\hat y - m)$ and square:
$$(y - \\hat y)^2 = (y - m)^2 - 2(y - m)(\\hat y - m) + (\\hat y - m)^2$$
The middle term has expectation 0, because $\\mathbb E[\\hat y - m] = 0$. So $\\mathbb E[(y - \\hat y)^2] = (y - m)^2 + \\text{Var}(\\hat y)$: the miss of the average prediction, plus the prediction's spread.

**Apply it to example $n$.** Its prediction is $\\hat y_n = \\sum_j R_{nj}X_{nj}w_j$.
- *Its mean:* $\\mathbb E[\\hat y_n] = \\sum_j \\mathbb E[R_{nj}]X_{nj}w_j = p\\sum_j X_{nj}w_j = p\\,(X\\mathbf w)_n$.
- *Its variance:* the terms $R_{nj}X_{nj}w_j$ use different coins, so they are independent and their variances add (lesson [[#sums-of-variables]]). A constant $c$ times a random number has variance $c^2$ times as large (lesson [[#variance]]). A Bernoulli coin has $\\mathbb E[R^2] = \\mathbb E[R] = p$ (since $0^2 = 0$ and $1^2 = 1$), so $\\text{Var}(R) = p - p^2 = p(1 - p)$. Together: $\\text{Var}(\\hat y_n) = p(1 - p)\\sum_j X_{nj}^2w_j^2$.

**Add up the examples:**
$$\\mathbb E\\|\\mathbf y - (R * X)\\mathbf w\\|^2 = \\sum_n \\big(y_n - p(X\\mathbf w)_n\\big)^2 + p(1 - p)\\sum_j w_j^2\\sum_n X_{nj}^2$$
The first sum is $\\|\\mathbf y - pX\\mathbf w\\|^2$. In the second, $\\sum_n X_{nj}^2$ is entry $(j, j)$ of $X^\\top X$ (row $j$ of $X^\\top$ dotted with column $j$ of $X$), which is $\\Gamma_{jj}^2$. So the second sum is $\\sum_j (\\Gamma_{jj}w_j)^2 = \\|\\Gamma\\mathbf w\\|^2$. $\\blacksquare$

**What it means.** The first term is ordinary least squares (lesson [[#least-squares]]) for the scaled weights $p\\mathbf w$. The second is a ridge penalty (lesson [[#regularisation]]) in which weight $j$'s penalty is proportional to $\\sum_n X_{nj}^2$, the size of feature $j$: features with large values get their weights squeezed harder. Substitute the test-time weights $\\tilde{\\mathbf w} = p\\mathbf w$, so $\\mathbf w = \\tilde{\\mathbf w}/p$:
$$\\|\\mathbf y - X\\tilde{\\mathbf w}\\|^2 + \\frac{1 - p}{p}\\|\\Gamma\\tilde{\\mathbf w}\\|^2$$
The ridge strength is $\\lambda = (1 - p)/p$: zero when nothing is dropped ($p = 1$), and larger the more is dropped. On average, dropout on a linear model *is* ridge regression with a per-feature penalty.

**The best weights.** Set the gradient of the closed form to zero (lesson [[#matrix-calculus]]): $-2pX^\\top(\\mathbf y - pX\\mathbf w) + 2p(1 - p)\\Gamma^2\\mathbf w = \\mathbf 0$, which rearranges to the linear system
$$\\big(p^2X^\\top X + p(1 - p)\\Gamma^2\\big)\\mathbf w = pX^\\top\\mathbf y$$` },
      { figure: 'DropoutRidgeFig', caption: 'Five examples with two features. Slide $p$: the dots are the test-time weights $\\tilde{\\mathbf w} = p\\mathbf w$ that minimise the dropout loss, shrinking toward 0 as more is dropped; the dashed lines are plain least squares ($p = 1$). The table compares the loss averaged over 2000 random masks with the closed form.' },
      { figure: 'EquationAnatomy', props: { ids: ['dropout-ridge'] }, caption: 'Section 9.1\'s result, piece by piece.' },
      {
        code: {
          file: 'papers.py', fn: 'dropout_loss_sampled', notes: [
            ['def dropout_loss_sampled(', ['The data, a weight vector, the keep probability, how many random masks to average, and a seed.']],
            ['rng = random.Random(seed)', ['A repeatable random generator.']],
            ['total = 0.0', ['The running total of squared misses, over all masks and examples.']],
            ['for _ in range(samples):', ['One random mask $R$ per pass.']],
            ['for row, target in zip(X, y):', ['Each example: its features and its target.']],
            ['pred = sum(x * wj for x, wj in zip(row, w) if rng.random() < p)', ['Each feature is kept when its coin comes up (probability $p$) and dropped otherwise: $\\hat y_n = \\sum_j R_{nj}X_{nj}w_j$.']],
            ['total += (target - pred) ** 2', ['This example\'s squared miss under this mask.']],
            ['return total / samples', ['Average over masks: an estimate of $\\mathbb E_R\\|\\mathbf y - (R * X)\\mathbf w\\|^2$.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'dropout_loss_marginal', notes: [
            ['def dropout_loss_marginal(X, y, w, p):', ['The same loss, with no randomness.']],
            ['fit = sum(', ['$\\|\\mathbf y - pX\\mathbf w\\|^2$: least squares for the scaled weights.'], { tex: '\\sum_n \\big(y_n - p(X\\mathbf w)_n\\big)^2' }],
            ['penalty = sum(', ['$\\|\\Gamma\\mathbf w\\|^2 = \\sum_j w_j^2\\sum_n X_{nj}^2$.']],
            ['return fit + p * (1 - p) * penalty', ['The closed form proved above.'], { tex: '\\|\\mathbf y - pX\\mathbf w\\|^2 + p(1-p)\\|\\Gamma\\mathbf w\\|^2' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'dropout_ridge', notes: [
            ['def dropout_ridge(X, y, p):', ['The weights that minimise the closed form.']],
            ['D = len(X[0])', ['The number of features.']],
            ['G = [[sum(row[i] * row[j]', ['$X^\\top X$, entry by entry.']],
            ['A = [[p * p * G[i][j]', ['$p^2X^\\top X$, plus $p(1 - p)\\Gamma^2$ on the diagonal only ($\\Gamma^2$ is the diagonal of $X^\\top X$).']],
            ['b = [p * sum(row[i] * target', ['$pX^\\top\\mathbf y$.']],
            ['return solve(A, b)', ['Solve the linear system (lesson [[#gaussian-elimination]]).']],
          ],
        },
      },
      {
        predict: {
          prompt: 'For the figure\'s five examples, what is the closed-form dropout loss at $\\mathbf w = (1, 1.5)$ with $p = 0.5$? (3 decimals)',
          answer: dropoutLossMarginal(DROP_X, DROP_Y, [1, 1.5], 0.5), tolerance: 0.0005, compute: () => dropoutLossMarginal(DROP_X, DROP_Y, [1, 1.5], 0.5),
          explain: `${f(dropoutLossMarginal(DROP_X, DROP_Y, [1, 1.5], 0.5))}. Only half the inputs survive on average, so the predictions fall well short (the first term), and the coins add spread (the second).`,
        },
      },
      {
        predict: {
          prompt: 'With $p = 0.5$, what is the first test-time weight $\\tilde w_1 = p\\,w_1$? (3 decimals)',
          answer: 0.5 * dropoutRidge(DROP_X, DROP_Y, 0.5)[0], tolerance: 0.0005, compute: () => 0.5 * dropoutRidge(DROP_X, DROP_Y, 0.5)[0],
          explain: `${f(0.5 * dropoutRidge(DROP_X, DROP_Y, 0.5)[0])}, against ${f(dropoutRidge(DROP_X, DROP_Y, 1)[0])} for plain least squares: ridge with $\\lambda = (1 - p)/p = 1$ has shrunk it.`,
        },
      },
      {
        choice: {
          prompt: 'The paper uses $p = 0.8$ for the input units on MNIST. What is the same setting in PyTorch?',
          options: [
            { text: '`nn.Dropout(p=0.2)`', why: 'Right. The paper\'s $p$ is the chance of keeping a unit; PyTorch\'s is the chance of dropping one.' },
            { text: '`nn.Dropout(p=0.8)`', why: 'That would drop 80% of the inputs. Same letter, opposite meaning.' },
            { text: '`nn.Dropout(p=1.25)`', why: 'Not a probability. The $1/p$ rescaling of inverted dropout is done inside the layer.' },
          ],
          answer: 0,
        },
      },
      {
        choice: {
          prompt: 'Why does the dropout penalty squeeze the weight of a large-valued feature harder?',
          options: [
            { text: 'Dropping a large input changes the prediction a lot, so its weight adds a lot of variance: $\\text{Var}$ grows with $X_{nj}^2w_j^2$', why: 'Yes. The penalty is the prediction\'s variance under the coins, and a big feature makes a big jump when it is dropped.' },
            { text: 'Because large features are more likely to be dropped', why: 'Every feature is dropped with the same probability $1 - p$.' },
            { text: 'It doesn\'t: the penalty is the same for every weight', why: 'Weight $j$ is multiplied by $\\Gamma_{jj}^2 = \\sum_n X_{nj}^2$ in the penalty.' },
          ],
          answer: 0,
        },
      },
      { note: 'Dropout multiplies each unit by a Bernoulli($p$) coin, where the paper\'s $p$ is the keep probability. Test time uses $pW$ (or train with $1/p$ scaling). For linear regression, the expected dropout loss is exactly $\\|\\mathbf y - pX\\mathbf w\\|^2 + p(1-p)\\|\\Gamma\\mathbf w\\|^2$: ridge with strength $(1-p)/p$ per unit of feature size.' },
    ],
  },

  {
    id: 'paper-word2vec', title: 'Paper: word2vec and negative sampling (Mikolov et al., 2013)',
    goal: 'Read the skip-gram objective and negative sampling, prove that the trained scores equal the pointwise mutual information of word and context shifted by $\\log k$, and show that InfoNCE learns the same ratio.',
    builds: ['softmax', 'logistic-regression', 'mle', 'information', 'independence', 'bayes', 'entropy-kl', 'contrastive'],
    blocks: [
      { md: `**The paper.** Tomas Mikolov, Ilya Sutskever, Kai Chen, Greg Corrado and Jeffrey Dean, "Distributed Representations of Words and Phrases and their Compositionality", NeurIPS 2013 (arXiv:1310.4546). It is the second word2vec paper: an earlier one the same year introduced the skip-gram model, and this one made it fast with negative sampling. Its word vectors famously did arithmetic: vec("Madrid") − vec("Spain") + vec("France") lands closest to vec("Paris").

**Eq. (1): the skip-gram objective.** For a text of $T$ words $w_1, \\dots, w_T$, maximise
$$\\frac1T\\sum_{t=1}^T\\;\\sum_{-c \\le j \\le c,\\; j \\ne 0} \\log p(w_{t+j} \\mid w_t)$$
Output: an average log-probability, to make large (lesson [[#mle]]). Walk through the text; at each position $t$, look at each neighbour up to $c$ words away (skipping $j = 0$, the word itself), and add the log-probability of that neighbour given the centre word.

**Eq. (2): that probability, as a softmax.**
$$p(w_O \\mid w_I) = \\frac{\\exp\\big(v'^{\\top}_{w_O}v_{w_I}\\big)}{\\sum_{w=1}^W\\exp\\big(v'^{\\top}_{w}v_{w_I}\\big)}$$
Every word has two vectors: $v_w$ for when it is the centre (input, $I$) and $v'_w$ for when it is a neighbour (output, $O$). The score of a pair is a dot product (lesson [[#dot-product]]), and softmax over the whole vocabulary of $W$ words turns scores into probabilities (lesson [[#softmax]]). The paper's complaint: the gradient of $\\log p$ costs time proportional to $W$, which is $10^5$ to $10^7$.

**Eq. (4): negative sampling** replaces each $\\log p(w_O \\mid w_I)$ with
$$\\log\\sigma\\big(v'^{\\top}_{w_O}v_{w_I}\\big) + \\sum_{i=1}^k\\mathbb E_{w_i \\sim P_n(w)}\\Big[\\log\\sigma\\big(-v'^{\\top}_{w_i}v_{w_I}\\big)\\Big]$$
Two familiar shapes. The first term is logistic regression (lesson [[#logistic-regression]]) saying "this real pair is real": $\\sigma(\\text{score})$ is the probability of "real". The second draws $k$ **noise words** $w_i$ from a distribution $P_n$ and says each fake pair is fake, using $\\sigma(-s) = 1 - \\sigma(s)$. Each update now costs $k + 1$ dot products instead of $W$; the paper uses $k$ from 5 to 20 on small data and 2 to 5 on large.

**The noise distribution.** $P_n(w) = U(w)^{3/4}/Z$: the unigram distribution $U$ (each word's frequency), raised to the power $\\frac34$, divided by $Z$, the total, so it adds to 1. The paper found the power by experiment. Raising to $\\frac34$ flattens the distribution: a word 100 times as common becomes only $100^{3/4} \\approx 32$ times as likely to be drawn, so rare words get sampled as noise more often.

**Eq. (5): subsampling.** Each occurrence of word $w_i$ is thrown away with probability $P(w_i) = 1 - \\sqrt{t/f(w_i)}$, where $f$ is its frequency and $t \\approx 10^{-5}$. A word as common as "the" is mostly skipped; a word rarer than $t$ makes the formula negative, which means "never discard" (the code clips it at 0).

**What do the vectors compute?** The paper says only that it simplified a method called noise-contrastive estimation "as long as the vector representations retain their quality". What the trained scores mean was worked out a year later.` },
      { md: `**Theorem (Levy and Goldberg, 2014).** If every pair's score $x = v'^{\\top}_c v_w$ could be set freely, the objective would be largest at
$$x = \\log\\frac{\\#(w, c)\\cdot|D|}{\\#(w)\\,\\#(c)} - \\log k = \\text{PMI}(w, c) - \\log k$$
where $\\#(w, c)$ counts how often context $c$ appears around word $w$, $\\#(w)$ and $\\#(c)$ count each word's pairs, and $|D|$ is the total number of pairs. (The "set freely" assumption is an idealisation: with 300-dimensional vectors not every score can be chosen independently, so trained vectors approximate this.)

**Proof.** Collect every term of the summed objective that involves the pair $(w, c)$, using noise drawn in proportion to plain frequency, $P_n(c) = \\#(c)/|D|$:
- each time $c$ really appears around $w$ there is a term $\\log\\sigma(x)$: $\\#(w, c)$ of them;
- each time $w$ is the centre, $k$ noise words are drawn, and each is $c$ with probability $\\#(c)/|D|$, so on average $c$ is drawn as noise for $w$ a total of $n = k\\,\\#(w)\\#(c)/|D|$ times, each giving $\\log\\sigma(-x)$.

So the pair's share of the objective is $\\ell(x) = \\#(w, c)\\log\\sigma(x) + n\\log\\sigma(-x)$. Its slope uses $\\frac{d}{dx}\\log\\sigma(x) = \\frac{\\sigma(x)(1 - \\sigma(x))}{\\sigma(x)} = \\sigma(-x)$ (lesson [[#logistic-regression]]) and, by the chain rule, $\\frac{d}{dx}\\log\\sigma(-x) = -\\sigma(x)$:
$$\\ell'(x) = \\#(w, c)\\,\\sigma(-x) - n\\,\\sigma(x)$$
Set it to zero: $\\frac{\\sigma(x)}{\\sigma(-x)} = \\frac{\\#(w,c)}{n}$. And $\\frac{\\sigma(x)}{\\sigma(-x)} = \\frac{1 + e^{x}}{1 + e^{-x}} = e^x$ (multiply top and bottom of the middle fraction by $e^{x}$: the bottom becomes $e^x + 1$). Taking logs, $x = \\log\\frac{\\#(w,c)}{n} = \\log\\frac{\\#(w,c)|D|}{\\#(w)\\#(c)} - \\log k$. It is the maximum: $\\ell''(x) = -(\\#(w,c) + n)\\sigma(x)\\sigma(-x) < 0$, so $\\ell$ is concave (lesson [[#second-derivative]]). $\\blacksquare$

**Reading the answer.** With frequencies as probabilities, the first log is $\\log\\frac{P(w, c)}{P(w)P(c)}$, the **pointwise mutual information**: how much more often the two words occur together than they would if they were independent (lesson [[#independence]]). Averaging it over all pairs gives the mutual information of lesson [[#information]]. So skip-gram with negative sampling learns scores equal to PMI minus a constant: it is quietly factorising a table of PMI values into word vectors times context vectors. With the $\\frac34$-power noise, the same proof gives PMI against the smoothed context distribution.

**InfoNCE learns the same ratio.** Aäron van den Oord, Yazhe Li and Oriol Vinyals, "Representation Learning with Contrastive Predictive Coding" (arXiv:1807.03748, 2018), named the loss of lesson [[#contrastive]]. Their eq. (4): given a set $X$ of $N$ samples, one drawn from $p(x \\mid c)$ (the positive) and $N - 1$ from $p(x)$ (negatives),
$$\\mathcal L_N = -\\mathbb E_X\\left[\\log\\frac{f_k(x_{t+k}, c_t)}{\\sum_{x_j \\in X} f_k(x_j, c_t)}\\right]$$
Their eq. (5) asks: given the set, what is the true chance that sample $i$ is the positive? By Bayes' rule (lesson [[#bayes]]), with each slot equally likely to hold it beforehand,
$$p(d = i \\mid X, c) = \\frac{p(x_i \\mid c)\\prod_{l \\ne i}p(x_l)}{\\sum_{j=1}^N p(x_j \\mid c)\\prod_{l \\ne j}p(x_l)} = \\frac{p(x_i \\mid c)/p(x_i)}{\\sum_j p(x_j \\mid c)/p(x_j)}$$
(the second form divides top and bottom by $\\prod_l p(x_l)$). The loss is a cross-entropy against this true answer, and a cross-entropy is smallest when the prediction equals the truth, because $H(p, q) = H(p) + D_{KL}(p\\|q) \\ge H(p)$ (lesson [[#entropy-kl]]). So the best $f$ is proportional to $p(x \\mid c)/p(x)$, whose log is the PMI again. Word2vec and contrastive learning learn the same quantity.

**Read the ≈.** Lesson [[#contrastive]] took on trust that $\\log N - \\mathcal L_N$ is a lower bound on the mutual information. The CPC paper's appendix argues it, but its eq. (8) replaces a sum over the negatives by $N - 1$ times its expected value and writes $\\approx$. An approximation inside a derivation turns it into a heuristic. A rigorous proof came later (Poole, Ozair, van den Oord, Alemi and Tucker, "On Variational Bounds of Mutual Information", 2019). Whenever a proof contains $\\approx$, ask what the approximation costs.` },
      { figure: 'Word2VecFig', caption: 'One pair\'s share of the objective as its score varies, for a pair seen the chosen number of times among $10^6$, a word seen 1000 times and a context word seen 2000 times. The peak sits exactly at PMI $-\\log k$; more noise words per pair push it left.' },
      { figure: 'EquationAnatomy', props: { ids: ['neg-sampling'] }, caption: 'Eq. (4) of the paper, piece by piece.' },
      {
        code: {
          file: 'papers.py', fn: 'sigmoid', notes: [
            ['def sigmoid(z):', ['The logistic function.']],
            ['return 1 / (1 + math.exp(-z))', ['σ(z): a score turned into a probability (lesson [[#composition]]).']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'negative_sampling', notes: [
            ['def negative_sampling(pos_score, neg_scores):', ['The real pair\'s score $v\'^\\top_{w_O}v_{w_I}$ and the $k$ noise pairs\' scores.']],
            ['return math.log(sigmoid(pos_score)) + sum(math.log(sigmoid(-s)) for s in neg_scores)', ['"Real is real" plus "each fake is fake". The paper\'s expectation over noise words becomes the $k$ words actually drawn.'], { tex: '\\log\\sigma(s_+) + \\sum_{i=1}^k \\log\\sigma(-s_i)' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'noise_distribution', notes: [
            ['def noise_distribution(counts, power=0.75):', ['Word counts, and the paper\'s power $\\frac34$.']],
            ['raised = [c ** power for c in counts]', ['$U(w)^{3/4}$ for each word (counts work as well as frequencies, since the scale cancels).']],
            ['total = sum(raised)', ['$Z$.']],
            ['return [r / total for r in raised]', ['Divide by $Z$ so the probabilities add to 1.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'discard_probability', notes: [
            ['def discard_probability(freq, t=1e-5):', ['A word\'s frequency $f$ and the threshold $t$.']],
            ['return max(0.0, 1 - math.sqrt(t / freq))', ['Eq. (5), clipped at 0 for words rarer than $t$.'], { tex: 'P(w_i) = 1 - \\sqrt{t/f(w_i)}' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'pair_objective', notes: [
            ['def pair_objective(x, n_pair, n_noise):', ['A score, and how often this pair appears as real and (on average) as noise.']],
            ['return n_pair * math.log(sigmoid(x)) + n_noise * math.log(sigmoid(-x))', ['$\\ell(x)$ from the proof.'], { tex: '\\#(w,c)\\log\\sigma(x) + n\\log\\sigma(-x)' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'best_pair_score', notes: [
            ['def best_pair_score(n_pair, n_word, n_context, total, k):', ['The four counts and $k$.']],
            ['return math.log(n_pair * total / (n_word * n_context)) - math.log(k)', ['The theorem: PMI minus $\\log k$.'], { tex: '\\log\\frac{\\#(w,c)|D|}{\\#(w)\\#(c)} - \\log k' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'positive_posterior', notes: [
            ['def positive_posterior(ratios):', ['Each sample\'s density ratio $p(x \\mid c)/p(x)$.']],
            ['total = sum(ratios)', ['The denominator of eq. (5).']],
            ['return [r / total for r in ratios]', ['The true chance each sample is the positive one.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'A pair occurs 50 times among $10^6$ pairs; the word has 1000 pairs and the context word 2000. With $k = 5$, what score does training aim for? (4 decimals)',
          answer: bestPairScore(50, 1000, 2000, 1e6, 5), tolerance: 0.00006, compute: () => bestPairScore(50, 1000, 2000, 1e6, 5),
          explain: `PMI $= \\log\\frac{50 \\times 10^6}{1000 \\times 2000} = \\log 25$, minus $\\log 5$: $\\log 5 = ${f(bestPairScore(50, 1000, 2000, 1e6, 5))}$. The pair occurs 25 times as often as chance would give.`,
        },
      },
      {
        predict: {
          prompt: 'Three words occur 100, 10 and 1 times. What share of noise draws does the rarest get under $U^{3/4}$? (4 decimals)',
          answer: noiseDistribution([100, 10, 1])[2], tolerance: 0.00006, compute: () => noiseDistribution([100, 10, 1])[2],
          explain: `${f(noiseDistribution([100, 10, 1])[2])}, nearly three times its plain share $1/111 = ${f(1 / 111)}$.`,
        },
      },
      {
        predict: {
          prompt: 'A word makes up 2% of the text. With $t = 10^{-5}$, what fraction of its occurrences does eq. (5) throw away? (4 decimals)',
          answer: discardProbability(0.02), tolerance: 0.00006, compute: () => discardProbability(0.02),
          explain: `$1 - \\sqrt{10^{-5}/0.02} = ${f(discardProbability(0.02))}$: almost all of them. Frequent words carry little information about their neighbours, and skipping them also speeds training.`,
        },
      },
      {
        choice: {
          prompt: 'Why does word2vec use two vectors per word, $v_w$ and $v\'_w$?',
          options: [
            { text: 'A word plays two roles, as a centre word and as a context word, and with one vector a word\'s score with itself would be $\\|v\\|^2$, which can never be small', why: 'Yes. Words rarely appear right next to themselves, but $v^\\top v$ is always large for a large vector. Two vectors let a word\'s self-score be low. (Many uses keep only $v_w$ at the end.)' },
            { text: 'To double the number of parameters', why: 'More parameters is a side effect, not the reason.' },
            { text: 'Because softmax needs two inputs', why: 'Softmax takes a list of scores; each score is one dot product of two vectors.' },
          ],
          answer: 0,
        },
      },
      { note: 'Skip-gram maximises $\\log p(\\text{neighbour} \\mid \\text{word})$ with a softmax over the vocabulary; negative sampling replaces it with logistic regression against $k$ noise words from $U^{3/4}$. At its optimum each pair\'s score is PMI$(w, c) - \\log k$. InfoNCE\'s optimal score is $\\log p(x \\mid c)/p(x)$, the same ratio. An $\\approx$ inside a proof makes it a heuristic.' },
    ],
  },

  {
    id: 'paper-vae', title: 'Paper: Auto-Encoding Variational Bayes (Kingma and Welling, 2013)',
    goal: 'Read the VAE paper\'s notation and its two estimators of the ELBO, measure why the score-function gradient it rejects is so noisy, and test its claim that the second estimator has less variance.',
    builds: ['vae-elbo', 'policy-gradient-derivation', 'change-of-variables', 'integration-techniques', 'monte-carlo', 'variance', 'normal'],
    blocks: [
      { md: `**The paper.** Diederik P. Kingma and Max Welling, "Auto-Encoding Variational Bayes", ICLR 2014 (arXiv:1312.6114, December 2013). Lesson [[#vae-elbo]] derived its main result, the evidence lower bound, and the reparameterisation trick. This lesson reads the paper itself: its notation, the gradient estimator it rejects and why, and the two estimators it proposes.

**Notation first.** $\\mathbf x^{(i)}$ is data point $i$ (superscript in brackets: an index, lesson [[#subscripts]]). $p_{\\boldsymbol\\theta}$ is the **generative model**, with parameters $\\boldsymbol\\theta$: a prior $p_{\\boldsymbol\\theta}(\\mathbf z)$ over a hidden code $\\mathbf z$ and a decoder $p_{\\boldsymbol\\theta}(\\mathbf x \\mid \\mathbf z)$. $q_{\\boldsymbol\\phi}(\\mathbf z \\mid \\mathbf x)$ is the **recognition model** (the encoder), with its own parameters $\\boldsymbol\\phi$, approximating the true posterior $p_{\\boldsymbol\\theta}(\\mathbf z \\mid \\mathbf x)$. Two parameter sets, trained together.

**Eqs. (1)–(3)** are lesson [[#vae-elbo]]'s results in this notation: $\\log p_{\\boldsymbol\\theta}(\\mathbf x^{(i)}) = D_{KL}(q \\| p_{\\boldsymbol\\theta}(\\mathbf z \\mid \\mathbf x^{(i)})) + \\mathcal L(\\boldsymbol\\theta, \\boldsymbol\\phi; \\mathbf x^{(i)})$, so $\\mathcal L \\le \\log p$, and
$$\\mathcal L = -D_{KL}\\big(q_{\\boldsymbol\\phi}(\\mathbf z \\mid \\mathbf x^{(i)})\\,\\|\\,p_{\\boldsymbol\\theta}(\\mathbf z)\\big) + \\mathbb E_{q_{\\boldsymbol\\phi}(\\mathbf z \\mid \\mathbf x^{(i)})}\\big[\\log p_{\\boldsymbol\\theta}(\\mathbf x^{(i)} \\mid \\mathbf z)\\big]$$
A penalty for straying from the prior, plus how well codes drawn from $q$ reconstruct the data. The semicolon in $\\mathcal L(\\boldsymbol\\theta, \\boldsymbol\\phi; \\mathbf x^{(i)})$ separates what we tune (before it) from what is given (after it).

**Section 2.2: the estimator they reject.** We need $\\nabla_{\\boldsymbol\\phi}\\,\\mathbb E_{q_{\\boldsymbol\\phi}(\\mathbf z)}[f(\\mathbf z)]$, the gradient of an average whose *distribution* depends on $\\boldsymbol\\phi$. The log-derivative trick of lesson [[#policy-gradient-derivation]] gives
$$\\nabla_{\\boldsymbol\\phi}\\mathbb E_{q_{\\boldsymbol\\phi}}[f(\\mathbf z)] = \\mathbb E_{q_{\\boldsymbol\\phi}}\\big[f(\\mathbf z)\\,\\nabla_{\\boldsymbol\\phi}\\log q_{\\boldsymbol\\phi}(\\mathbf z)\\big]$$
estimated by averaging over samples. (The paper prints the subscript of $\\nabla$ as $q_{\\boldsymbol\\phi}(\\mathbf z)$ and drops a superscript $(l)$ in the sum: typesetting slips. The derivative is with respect to $\\boldsymbol\\phi$, as the left side says.) The paper says this "exhibits very high variance" and moves on. Let's measure it.

**A test case with exact answers.** Take $z \\sim \\mathcal N(\\mu, \\sigma^2)$ and $f(z) = z^2$. Then $\\mathbb E[z^2] = \\mu^2 + \\sigma^2$ (variance plus squared mean, lesson [[#variance]]), so the true gradient with respect to $\\mu$ is $2\\mu$.
- *Score function:* $\\log q = -\\frac{(z - \\mu)^2}{2\\sigma^2} + \\text{const}$, so $\\frac{\\partial}{\\partial\\mu}\\log q = \\frac{z - \\mu}{\\sigma^2}$, and one sample gives $z^2\\frac{z - \\mu}{\\sigma^2}$.
- *Reparameterised:* $z = \\mu + \\sigma\\varepsilon$ with $\\varepsilon \\sim \\mathcal N(0, 1)$, so $f = (\\mu + \\sigma\\varepsilon)^2$ and $\\frac{\\partial f}{\\partial\\mu} = 2(\\mu + \\sigma\\varepsilon) = 2z$.

Both average to $2\\mu$. Their spreads differ enormously. The reparameterised one is easy: $\\text{Var}(2\\mu + 2\\sigma\\varepsilon) = 4\\sigma^2$. For the score function at $\\mu = \\sigma = 1$, write $z = 1 + \\varepsilon$: the sample is $(1 + \\varepsilon)^2\\varepsilon = \\varepsilon + 2\\varepsilon^2 + \\varepsilon^3$. We need the normal's moments $\\mathbb E[\\varepsilon^k]$. Odd ones are 0 by symmetry. For even ones, integrate by parts (lesson [[#integration-techniques]]): the density $\\varphi$ has $\\varphi'(x) = -x\\varphi(x)$, so $\\mathbb E[\\varepsilon^k] = \\int x^{k-1}\\cdot x\\varphi(x)\\,dx = (k - 1)\\int x^{k-2}\\varphi(x)\\,dx = (k - 1)\\mathbb E[\\varepsilon^{k-2}]$. From $\\mathbb E[\\varepsilon^0] = 1$: $\\mathbb E[\\varepsilon^2] = 1$, $\\mathbb E[\\varepsilon^4] = 3$, $\\mathbb E[\\varepsilon^6] = 15$. Then
$$\\mathbb E\\big[(\\varepsilon + 2\\varepsilon^2 + \\varepsilon^3)^2\\big] = \\mathbb E[\\varepsilon^2] + 4\\mathbb E[\\varepsilon^4] + \\mathbb E[\\varepsilon^6] + 2\\mathbb E[\\varepsilon^4] = 1 + 12 + 15 + 6 = 34$$
(the cross terms $4\\varepsilon^3$ and $4\\varepsilon^5$ have mean 0). The mean is $\\mathbb E[2\\varepsilon^2] = 2$, so the variance is $34 - 4 = 30$, against 4 for the reparameterised estimator: about 7.5 times the noise, from one of the simplest functions there is. The score function only knows "this sample was good or bad", while the reparameterised gradient knows which way to move $z$.

**Section 2.4: why reparameterisation is allowed.** If $\\mathbf z = g_{\\boldsymbol\\phi}(\\boldsymbol\\varepsilon, \\mathbf x)$ maps noise to samples, then $q_{\\boldsymbol\\phi}(\\mathbf z \\mid \\mathbf x)\\prod_i dz_i = p(\\boldsymbol\\varepsilon)\\prod_i d\\varepsilon_i$: probability is conserved under a change of variables (lesson [[#change-of-variables]]). So $\\int q(\\mathbf z)f(\\mathbf z)\\,d\\mathbf z = \\int p(\\boldsymbol\\varepsilon)f(g_{\\boldsymbol\\phi}(\\boldsymbol\\varepsilon, \\mathbf x))\\,d\\boldsymbol\\varepsilon$, and now $\\boldsymbol\\phi$ sits inside $f$, where an ordinary gradient can reach it. The paper lists which distributions allow this: invertible CDFs, "location-scale" families like the Gaussian ($z = \\mu + \\sigma\\varepsilon$), and compositions.` },
      { md: `**Section 2.3: two estimators of the ELBO itself.** With $L$ samples $\\mathbf z^{(i,l)} = g_{\\boldsymbol\\phi}(\\boldsymbol\\varepsilon^{(l)}, \\mathbf x^{(i)})$:
$$\\widetilde{\\mathcal L}^A = \\frac1L\\sum_{l=1}^L \\log p_{\\boldsymbol\\theta}(\\mathbf x^{(i)}, \\mathbf z^{(i,l)}) - \\log q_{\\boldsymbol\\phi}(\\mathbf z^{(i,l)} \\mid \\mathbf x^{(i)}) \\quad\\text{(eq. 6)}$$
$$\\widetilde{\\mathcal L}^B = -D_{KL}\\big(q_{\\boldsymbol\\phi}(\\mathbf z \\mid \\mathbf x^{(i)})\\,\\|\\,p_{\\boldsymbol\\theta}(\\mathbf z)\\big) + \\frac1L\\sum_{l=1}^L\\log p_{\\boldsymbol\\theta}(\\mathbf x^{(i)} \\mid \\mathbf z^{(i,l)}) \\quad\\text{(eq. 7)}$$
A samples everything. B computes the KL exactly (appendix B, the closed form lesson [[#vae-elbo]] derived) and samples only the reconstruction. The paper says B "typically has less variance". Test it on a model where every quantity is known exactly.

**The toy model.** Prior $z \\sim \\mathcal N(0, 1)$, decoder $x \\mid z \\sim \\mathcal N(z, 1)$, one observation $x = 1$, and $q(z) = \\mathcal N(\\mu, \\sigma^2)$.
- $x$ is $z$ plus independent $\\mathcal N(0, 1)$ noise, so $x \\sim \\mathcal N(0, 2)$ (variances add, lesson [[#sums-of-variables]]): $\\log p(x) = \\log\\mathcal N(1; 0, 2)$.
- The true posterior: $p(z \\mid x) \\propto e^{-z^2/2}e^{-(x - z)^2/2}$. Expand the exponent: $-\\frac12(2z^2 - 2xz + x^2) = -(z - \\frac x2)^2 + \\text{const}$, a normal with mean $x/2$ and variance $\\frac12$.
- The exact ELBO: $\\mathbb E_q[\\log p(x \\mid z)] = -\\frac12\\log 2\\pi - \\frac12\\mathbb E_q[(x - z)^2] = -\\frac12\\log 2\\pi - \\frac12\\big((x - \\mu)^2 + \\sigma^2\\big)$, minus the KL to the prior, $\\frac12(\\sigma^2 + \\mu^2 - 1 - \\log\\sigma^2)$.

**What the experiment shows** (the figure below). Away from the posterior, with $q$ narrow and off-centre, B is far steadier: the KL term it computes exactly is the part that varies most. But at the true posterior, A has **zero** variance: there $\\log p(x, z) - \\log q(z) = \\log p(x) + \\log p(z \\mid x) - \\log q(z) = \\log p(x)$ for every sample, since $q = p(z \\mid x)$. B keeps its noise. So "typically" is an empirical word, and it is not always true: as training brings $q$ close to the posterior, A can be the better estimator. Later work built on exactly this observation (Roeder, Wu and Duvenaud, "Sticking the Landing", NeurIPS 2017, which drops the part of the gradient that is noisy at the optimum).

**Eq. (8): minibatches.** For $N$ data points, the paper estimates the full-data bound from a random minibatch of $M$: $\\mathcal L(\\boldsymbol\\theta, \\boldsymbol\\phi; \\mathbf X) \\simeq \\frac NM\\sum_{i=1}^M\\widetilde{\\mathcal L}(\\boldsymbol\\theta, \\boldsymbol\\phi; \\mathbf x^{(i)})$. Each drawn point has expected bound equal to the dataset's average, so $\\frac NM \\times M \\times$ average $= $ the total: unbiased, by linearity. With $M = 100$ the paper finds $L = 1$ sample per point is enough.

**Eq. (10): the VAE.** For a Gaussian encoder with $J$ latent dimensions, B becomes
$$\\mathcal L \\simeq \\frac12\\sum_{j=1}^J\\Big(1 + \\log\\big((\\sigma_j^{(i)})^2\\big) - (\\mu_j^{(i)})^2 - (\\sigma_j^{(i)})^2\\Big) + \\frac1L\\sum_{l=1}^L\\log p_{\\boldsymbol\\theta}(\\mathbf x^{(i)} \\mid \\mathbf z^{(i,l)}), \\quad \\mathbf z^{(i,l)} = \\boldsymbol\\mu^{(i)} + \\boldsymbol\\sigma^{(i)} \\odot \\boldsymbol\\varepsilon^{(l)}$$
Every piece is now familiar: the closed-form KL per dimension, a Monte Carlo average (lesson [[#monte-carlo]]), and the location-scale reparameterisation.` },
      { figure: 'VAEEstimatorFig', caption: 'The toy model with $x = 1$. The curve is the exact ELBO as $q$\'s mean varies; it touches $\\log p(x)$ only at the true posterior. The bars are the variances of 1000 single-sample estimates from eq. (6) (A) and eq. (7) (B).' },
      { figure: 'EquationAnatomy', props: { ids: ['sgvb'] }, caption: 'Eq. (7), the estimator the VAE uses.' },
      {
        code: {
          file: 'papers.py', fn: 'log_normal', notes: [
            ['def log_normal(x, mean, var):', ['A point, a mean and a variance.']],
            ['return -0.5 * math.log(2 * math.pi * var) - (x - mean) ** 2 / (2 * var)', ['The log of the normal density (lesson [[#normal]]).'], { tex: '-\\tfrac12\\log(2\\pi\\sigma^2) - \\frac{(x-\\mu)^2}{2\\sigma^2}' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'toy_elbo', notes: [
            ['def toy_elbo(x, mu, sigma):', ['The observation and $q$\'s mean and spread.']],
            ['reconstruction = -0.5 * math.log(2 * math.pi) - ((x - mu) ** 2 + sigma ** 2) / 2', ['$\\mathbb E_q[\\log p(x \\mid z)]$, using $\\mathbb E_q[(x - z)^2] = (x - \\mu)^2 + \\sigma^2$.']],
            ['kl = 0.5 * (sigma ** 2 + mu ** 2 - 1 - math.log(sigma ** 2))', ['Appendix B\'s KL to $\\mathcal N(0, 1)$, one dimension.']],
            ['return reconstruction - kl', ['Eq. (3).']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'estimator_a', notes: [
            ['def estimator_a(x, mu, sigma, eps):', ['One standard-normal draw $\\varepsilon$.']],
            ['z = mu + sigma * eps', ['The reparameterised sample.']],
            ['return log_normal(z, 0, 1) + log_normal(x, z, 1) - log_normal(z, mu, sigma ** 2)', ['$\\log p(z) + \\log p(x \\mid z) - \\log q(z)$: everything sampled.'], { tex: '\\log p(x, z) - \\log q(z)' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'estimator_b', notes: [
            ['def estimator_b(x, mu, sigma, eps):', ['The same draw.']],
            ['z = mu + sigma * eps', ['The same sample.']],
            ['return -0.5 * (sigma ** 2', ['Minus the exact KL, plus the sampled reconstruction.'], { tex: '-D_{KL}(q\\|p(z)) + \\log p(x \\mid z)' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'mean_and_variance', notes: [
            ['def mean_and_variance(values):', ['A list of numbers.']],
            ['mean = sum(values) / len(values)', ['Their average.']],
            ['return mean, sum((v - mean) ** 2 for v in values) / len(values)', ['And their average squared distance from it (lesson [[#variance]]).']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'estimator_spread', notes: [
            ['def estimator_spread(estimator, x, mu, sigma, n, seed=0):', ['Which estimator, the setting, and how many draws.']],
            ['rng = random.Random(seed)', ['Repeatable randomness.']],
            ['return mean_and_variance([estimator(x, mu, sigma, rng.gauss(0, 1)) for _ in range(n)])', ['$n$ single-sample estimates, summarised.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'gradient_estimates', notes: [
            ['def gradient_estimates(mu, sigma, n, seed=0):', ['The test case $\\frac{\\partial}{\\partial\\mu}\\mathbb E[z^2]$.']],
            ['rng = random.Random(seed)', ['Repeatable randomness.']],
            ['score, reparam = [], []', ['One list per estimator.']],
            ['for _ in range(n):', ['The same draws feed both.']],
            ['z = mu + sigma * rng.gauss(0, 1)', ['A sample from $\\mathcal N(\\mu, \\sigma^2)$.']],
            ['score.append(z * z * (z - mu) / sigma ** 2)', ['$f(z)\\,\\frac{\\partial}{\\partial\\mu}\\log q(z)$.']],
            ['reparam.append(2 * z)', ['$\\frac{\\partial}{\\partial\\mu}(\\mu + \\sigma\\varepsilon)^2 = 2z$.']],
            ['return score, reparam', ['Both lists.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'For $x = 1$ and $q = \\mathcal N(0.3, 0.9^2)$, how far below $\\log p(x)$ is the ELBO? (4 decimals)',
          answer: logNormal(1, 0, 2) - toyElbo(1, 0.3, 0.9), tolerance: 0.00006, compute: () => logNormal(1, 0, 2) - toyElbo(1, 0.3, 0.9),
          explain: `$\\log p(1) = ${f(logNormal(1, 0, 2))}$ and the ELBO is ${f(toyElbo(1, 0.3, 0.9))}, a gap of ${f(logNormal(1, 0, 2) - toyElbo(1, 0.3, 0.9))}: exactly $D_{KL}(q \\| p(z \\mid x))$ by eq. (1).`,
        },
      },
      {
        predict: {
          prompt: 'The exact variance of the score-function estimate of $\\frac{\\partial}{\\partial\\mu}\\mathbb E[z^2]$ at $\\mu = \\sigma = 1$?',
          answer: 30, compute: () => 30,
          explain: `$34 - 2^2 = 30$, from the normal moments 1, 3 and 15. Measured over 4000 draws: ${f(meanAndVariance(gradientEstimates(1, 1, 4000)[0])[1])}. The reparameterised estimate's variance is $4\\sigma^2 = 4$ (measured: ${f(meanAndVariance(gradientEstimates(1, 1, 4000)[1])[1])}).`,
        },
      },
      {
        predict: {
          prompt: 'At $q = \\mathcal N(1.5, 0.3^2)$, far from the posterior, what is the variance of 4000 estimates from estimator A? (3 decimals)',
          answer: estimatorSpread(estimatorA, 1, 1.5, 0.3, 4000)[1], tolerance: 0.0005, compute: () => estimatorSpread(estimatorA, 1, 1.5, 0.3, 4000)[1],
          explain: `${f(estimatorSpread(estimatorA, 1, 1.5, 0.3, 4000)[1])}, against ${f(estimatorSpread(estimatorB, 1, 1.5, 0.3, 4000)[1])} for B. Here the paper's "typically" holds by a factor of more than 20.`,
        },
      },
      {
        choice: {
          prompt: 'In $\\mathcal L(\\boldsymbol\\theta, \\boldsymbol\\phi; \\mathbf x^{(i)})$, which parameters belong to the encoder?',
          options: [
            { text: '$\\boldsymbol\\phi$: they define $q_{\\boldsymbol\\phi}(\\mathbf z \\mid \\mathbf x)$, the recognition model', why: 'Yes. $\\boldsymbol\\theta$ belongs to the generative model (prior and decoder).' },
            { text: '$\\boldsymbol\\theta$', why: '$\\boldsymbol\\theta$ is the decoder\'s, in $p_{\\boldsymbol\\theta}(\\mathbf x \\mid \\mathbf z)$.' },
            { text: '$\\mathbf x^{(i)}$', why: 'That is the data point, after the semicolon: given, not tuned.' },
          ],
          answer: 0,
        },
      },
      { note: 'The VAE paper rejects the score-function gradient ($\\mathbb E[f\\nabla\\log q]$; variance 30 against 4 in our test) for the reparameterised one, justified by a change of variables. Its estimator A samples everything; B computes the KL exactly. B is usually steadier, but A is exact when $q$ equals the posterior. Minibatches scale by $N/M$.' },
    ],
  },

  {
    id: 'paper-adam', title: 'Paper: Adam (Kingma and Ba, 2015)',
    goal: 'Read Algorithm 1 line by line, prove the faster ordering of section 2 and the step-size facts of section 2.1, find gradients that break one of its stated bounds, and derive AdaMax as a limit.',
    builds: ['optimisers', 'dot-product', 'limits-precise', 'logarithms', 'sgd', 'sigma'],
    blocks: [
      { md: `**The paper.** Diederik P. Kingma and Jimmy Lei Ba, "Adam: A Method for Stochastic Optimization", ICLR 2015 (arXiv:1412.6980). It is the default optimiser of deep learning. Lesson [[#optimisers]] derived its update and the bias correction of section 3; this lesson reads the rest.

**Algorithm 1, line by line.** The paper's pseudo-code, with $t$ counting steps:
- *Require* lines list the inputs: the stepsize $\\alpha$, decay rates $\\beta_1, \\beta_2 \\in [0, 1)$ (the bracket includes 0, the parenthesis excludes 1, lesson [[#sets]]), a stochastic objective $f(\\theta)$ and a starting point $\\theta_0$.
- $m_0 \\leftarrow 0$, $v_0 \\leftarrow 0$, $t \\leftarrow 0$: moving averages start at zero.
- $g_t \\leftarrow \\nabla_\\theta f_t(\\theta_{t-1})$: the gradient of step $t$'s objective $f_t$ (the loss on step $t$'s minibatch) at the current parameters.
- $m_t \\leftarrow \\beta_1 m_{t-1} + (1 - \\beta_1)g_t$ and $v_t \\leftarrow \\beta_2 v_{t-1} + (1 - \\beta_2)g_t^2$: moving averages of the gradient and of its square, $g_t^2 = g_t \\odot g_t$ element-wise.
- $\\hat m_t \\leftarrow m_t/(1 - \\beta_1^t)$, $\\hat v_t \\leftarrow v_t/(1 - \\beta_2^t)$: bias correction. Careful with the two kinds of superscript and subscript: in $\\beta_1^t$ the $t$ is a **power** ("with $\\beta_1^t$ we denote $\\beta_1$ to the power $t$", the caption says), while in $m_t$ the $t$ is an index.
- $\\theta_t \\leftarrow \\theta_{t-1} - \\alpha\\,\\hat m_t/(\\sqrt{\\hat v_t} + \\epsilon)$: the step. Defaults $\\alpha = 0.001$, $\\beta_1 = 0.9$, $\\beta_2 = 0.999$, $\\epsilon = 10^{-8}$.

**Two small slips in section 3,** worth noticing as practice. After its derivation, the paper says the error $\\zeta$ stays small because "the exponential decay rate $\\beta_1$ can (and should) be chosen" well: the average being discussed uses $\\beta_2$. And it says sparse gradients need "a small value of $\\beta_2$" to average over many gradients: averaging over many gradients needs $\\beta_2$ close to 1, so $1 - \\beta_2$ small. Read for meaning, and check each sentence against the equations.

**Section 2: a faster order.** Replace the last three lines by $\\alpha_t = \\alpha\\sqrt{1 - \\beta_2^t}/(1 - \\beta_1^t)$ and $\\theta_t \\leftarrow \\theta_{t-1} - \\alpha_t\\,m_t/(\\sqrt{v_t} + \\hat\\epsilon)$. Why it is the same: substitute the corrected moments,
$$\\alpha\\frac{\\hat m_t}{\\sqrt{\\hat v_t} + \\epsilon} = \\alpha\\frac{m_t/(1 - \\beta_1^t)}{\\sqrt{v_t}/\\sqrt{1 - \\beta_2^t} + \\epsilon} = \\alpha\\frac{\\sqrt{1 - \\beta_2^t}}{1 - \\beta_1^t}\\cdot\\frac{m_t}{\\sqrt{v_t} + \\epsilon\\sqrt{1 - \\beta_2^t}}$$
(multiply top and bottom by $\\sqrt{1 - \\beta_2^t}$). Identical when $\\hat\\epsilon = \\epsilon\\sqrt{1 - \\beta_2^t}$. With a fixed $\\hat\\epsilon$ the two differ only in the size of the tiny safety term, which is why the paper calls it the same algorithm "at the expense of clarity".` },
      { md: `**Section 2.1: how big is a step?** With $\\epsilon = 0$, the step is $\\Delta_t = \\alpha\\,\\hat m_t/\\sqrt{\\hat v_t}$. The paper states, without proof, two upper bounds: $|\\Delta_t| \\le \\alpha(1 - \\beta_1)/\\sqrt{1 - \\beta_2}$ when $(1 - \\beta_1) > \\sqrt{1 - \\beta_2}$, and $|\\Delta_t| \\le \\alpha$ otherwise, and adds that in common cases $|\\Delta_t| \\approx \\alpha$. Check what can be checked.

**A constant gradient gives exactly $\\alpha$.** If $g_i = g$ for every step, then $m_t = (1 - \\beta_1)g(1 + \\beta_1 + \\dots + \\beta_1^{t-1}) = g(1 - \\beta_1^t)$ by the geometric sum (lesson [[#induction]] proved it), so $\\hat m_t = g$; likewise $\\hat v_t = g^2$. So $\\Delta_t = \\alpha g/|g| = \\pm\\alpha$, from the very first step. That is the bias correction at work.

**Scale doesn't matter.** Multiply every gradient by $c > 0$: $\\hat m_t$ scales by $c$, $\\hat v_t$ by $c^2$, and $c/\\sqrt{c^2} = 1$. Adam's steps ignore the size of the loss, which is part of why one $\\alpha$ works for so many problems.

**A single spike.** If every gradient is 0 except $g_t$: $\\hat m_t = (1 - \\beta_1)g_t/(1 - \\beta_1^t)$ and $\\hat v_t = (1 - \\beta_2)g_t^2/(1 - \\beta_2^t)$, so
$$\\frac{|\\Delta_t|}{\\alpha} = \\frac{1 - \\beta_1}{\\sqrt{1 - \\beta_2}}\\cdot\\frac{\\sqrt{1 - \\beta_2^t}}{1 - \\beta_1^t}$$
which approaches the paper's first bound as $t$ grows. Note which case the defaults fall in: $1 - \\beta_1 = 0.1$ and $\\sqrt{1 - \\beta_2} \\approx 0.0316$, so the first case applies, and the bound is about $3.16\\alpha$, not $\\alpha$.

**Is it really a bound?** Write the averages as sums: $m_t = (1 - \\beta_1)\\sum_k \\beta_1^k g_{t-k}$ and $v_t = (1 - \\beta_2)\\sum_k \\beta_2^k g_{t-k}^2$. Lesson [[#dot-product]] showed $\\mathbf u \\cdot \\mathbf v = \\|\\mathbf u\\|\\|\\mathbf v\\|\\cos\\theta$, so $|\\mathbf u \\cdot \\mathbf v| \\le \\|\\mathbf u\\|\\|\\mathbf v\\|$ (the **Cauchy–Schwarz inequality**), with equality when the vectors point the same way. Take $u_k = \\beta_1^k/\\beta_2^{k/2}$ and $v_k = \\beta_2^{k/2}g_{t-k}$:
$$\\Big|\\sum_k \\beta_1^kg_{t-k}\\Big| \\le \\sqrt{\\sum_k\\Big(\\frac{\\beta_1^2}{\\beta_2}\\Big)^k}\\;\\sqrt{\\sum_k\\beta_2^kg_{t-k}^2}$$
Equality holds when $g_{t-k} \\propto (\\beta_1/\\beta_2)^k$: each gradient $\\beta_2/\\beta_1 \\approx 1.11$ times the one before, growing about 11% a step. Then, for large $t$ (where the corrections are near 1), the geometric sum gives
$$\\frac{|\\Delta_t|}{\\alpha} \\to \\frac{1 - \\beta_1}{\\sqrt{1 - \\beta_2}}\\cdot\\frac{1}{\\sqrt{1 - \\beta_1^2/\\beta_2}} \\approx 3.162 \\times 2.299 \\approx 7.27$$
So the first "upper bound" is not a bound over all gradient sequences: a gradient that keeps growing steadily for a few dozen steps (as it can when a loss starts to blow up) gets steps more than twice the stated limit. The paper's sentence describes the sparse case it had in mind correctly. The lesson for reading: a bound stated without proof covers the cases its authors imagined; test it on others.

**Convergence.** Section 4 proves a convergence guarantee. In 2018, Reddi, Kale and Kumar ("On the Convergence of Adam and Beyond", ICLR 2018) found a mistake in that proof and a simple convex problem on which Adam does not converge, and proposed a fix, AMSGrad. Adam remains the default in practice; its theory is subtler than the paper suggests.

**Section 7.1: AdaMax, a limit.** Replace the squared gradient by the $p$-th power: $v_t = \\beta_2^pv_{t-1} + (1 - \\beta_2^p)|g_t|^p$ (eq. 6), so $v_t^{1/p} = \\big((1 - \\beta_2^p)\\sum_i\\beta_2^{p(t-i)}|g_i|^p\\big)^{1/p}$, and let $p \\to \\infty$ (lesson [[#limits-precise]]). Two facts:
- $(1 - \\beta_2^p)^{1/p} \\to 1$: its log is $\\frac1p\\ln(1 - \\beta_2^p)$, and $\\ln(1 - \\beta_2^p) \\to \\ln 1 = 0$ while $\\frac1p \\to 0$.
- For non-negative $a_1, \\dots, a_t$ with largest value $M$: $M^p \\le \\sum_i a_i^p \\le tM^p$, so $M \\le (\\sum_i a_i^p)^{1/p} \\le t^{1/p}M$, and $t^{1/p} \\to 1$. The **$p$-norm tends to the maximum**.

With $a_i = \\beta_2^{t-i}|g_i|$: $u_t = \\max(\\beta_2^{t-1}|g_1|, \\dots, \\beta_2|g_{t-1}|, |g_t|)$ (eq. 11), which satisfies the one-line recursion $u_t = \\max(\\beta_2u_{t-1}, |g_t|)$ (eq. 12). Algorithm 2 steps by $(\\alpha/(1 - \\beta_1^t))\\,m_t/u_t$. The paper says $|\\Delta_t| \\le \\alpha$ here. Almost: $m_t/(1 - \\beta_1^t)$ is a weighted average of past gradients, and each $|g_{t-k}| \\le u_t/\\beta_2^k$, with equality when the gradient shrinks by a factor $\\beta_2$ every step. Such a sequence pushes the step to $\\frac{1 - \\beta_1}{1 - \\beta_1/\\beta_2} \\approx 1.009\\alpha$. Under 1% over: the same habit, in miniature. The exercise asks you to find both sequences.` },
      { figure: 'AdamStepFig', caption: 'Adam\'s step size in units of $\\alpha$ over the last 100 of 3100 steps, for different gradient sequences. A constant gradient steps exactly $\\alpha$ whatever its size; a lone spike approaches the paper\'s bound $(1 - \\beta_1)/\\sqrt{1 - \\beta_2} \\approx 3.16$ (orange); a gradient that grows 11% a step goes well past it.' },
      { figure: 'EquationAnatomy', props: { ids: ['adam', 'adamax'] }, caption: 'Algorithm 1\'s update and AdaMax\'s replacement for $v_t$.' },
      {
        code: {
          file: 'papers.py', fn: 'adam_steps', notes: [
            ['def adam_steps(grads,', ['A list of gradients for one parameter, and the paper\'s defaults.']],
            ['m = v = 0.0', ['$m_0 = v_0 = 0$.']],
            ['steps = []', ['The step $\\theta_t - \\theta_{t-1}$ taken at each timestep.']],
            ['for t, g in enumerate(grads, start=1):', ['$t = 1, 2, \\dots$ with $g_t$.']],
            ['m = beta1 * m + (1 - beta1) * g', ['The first moment.'], { tex: 'm_t = \\beta_1m_{t-1} + (1-\\beta_1)g_t' }],
            ['v = beta2 * v + (1 - beta2) * g * g', ['The second raw moment.'], { tex: 'v_t = \\beta_2v_{t-1} + (1-\\beta_2)g_t^2' }],
            ['m_hat = m / (1 - beta1 ** t)', ['Bias correction: $\\beta_1$ to the power $t$.']],
            ['v_hat = v / (1 - beta2 ** t)', ['The same for $v$.']],
            ['steps.append(-alpha * m_hat / (math.sqrt(v_hat) + eps))', ['The update.'], { tex: '-\\alpha\\,\\hat m_t/(\\sqrt{\\hat v_t} + \\epsilon)' }],
            ['return steps', ['Every step.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'adam_steps_reordered', notes: [
            ['def adam_steps_reordered(', ['The same inputs, with $\\hat\\epsilon$ in place of $\\epsilon$.']],
            ['m = v = 0.0', ['Start at zero.']],
            ['steps = []', ['The steps.']],
            ['for t, g in enumerate(grads, start=1):', ['Each timestep.']],
            ['m = beta1 * m + (1 - beta1) * g', ['Unchanged.']],
            ['v = beta2 * v + (1 - beta2) * g * g', ['Unchanged.']],
            ['alpha_t = alpha * math.sqrt(1 - beta2 ** t) / (1 - beta1 ** t)', ['Both corrections folded into the stepsize.'], { tex: '\\alpha_t = \\alpha\\sqrt{1-\\beta_2^t}/(1-\\beta_1^t)' }],
            ['steps.append(-alpha_t * m / (math.sqrt(v) + eps_hat))', ['The raw moments, no division by $1 - \\beta^t$.']],
            ['return steps', ['Every step.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'adamax_steps', notes: [
            ['def adamax_steps(grads, alpha=0.002', ['AdaMax\'s defaults: $\\alpha = 0.002$.']],
            ['m = u = 0.0', ['$m_0 = u_0 = 0$.']],
            ['steps = []', ['The steps.']],
            ['for t, g in enumerate(grads, start=1):', ['Each timestep.']],
            ['m = beta1 * m + (1 - beta1) * g', ['The first moment, as in Adam.']],
            ['u = max(beta2 * u, abs(g))', ['Eq. (12): the decaying maximum, the $p \\to \\infty$ limit of the $p$-norm average.'], { tex: 'u_t = \\max(\\beta_2u_{t-1}, |g_t|)' }],
            ['steps.append(-(alpha / (1 - beta1 ** t)) * m / u)', ['Only the first moment needs bias correction: $u_t$ is a maximum, not an average started at zero.']],
            ['return steps', ['Every step.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'The gradient is 0 for 999 steps, then 1 at step 1000. How big is Adam\'s step, in units of $\\alpha$? (4 decimals)',
          answer: spikeStep(), tolerance: 0.00006, compute: spikeStep,
          explain: `${f(spikeStep())}: $3.162 \\times \\sqrt{1 - 0.999^{1000}}/(1 - 0.9^{1000})$. Far from the "about $\\alpha$" of a typical step, but under the paper's bound of 3.162, which it reaches only as $t \\to \\infty$.`,
        },
      },
      {
        predict: {
          prompt: 'What limit does the step approach for gradients growing by $\\beta_2/\\beta_1$ each step, with the default $\\beta$s? (3 decimals)',
          answer: growthLimit(), tolerance: 0.0005, compute: growthLimit,
          explain: `$\\frac{0.1}{\\sqrt{0.001}} \\cdot \\frac{1}{\\sqrt{1 - 0.81/0.999}} = ${f(growthLimit())}$: more than twice the paper's first bound.`,
        },
      },
      {
        choice: {
          prompt: 'In $\\hat m_t = m_t/(1 - \\beta_1^t)$, what is the $t$ on $\\beta_1$?',
          options: [
            { text: 'A power: $\\beta_1$ multiplied by itself $t$ times', why: 'Yes. The caption of Algorithm 1 says so; on $m_t$ the same letter is an index.' },
            { text: 'An index: the value of $\\beta_1$ at step $t$', why: '$\\beta_1$ is a constant. On $m_t$ the subscript is an index, but on $\\beta_1^t$ the superscript is a power.' },
          ],
          answer: 0,
        },
      },
      { note: 'Algorithm 1: two moving averages, bias-corrected, then $\\alpha\\hat m/\\sqrt{\\hat v}$. The reordered form folds the corrections into $\\alpha_t$. A constant gradient steps exactly $\\alpha$; steps ignore the gradient\'s scale; a lone spike approaches $3.16\\alpha$; steadily growing gradients reach $7.27\\alpha$, past the stated bound. AdaMax is the $p \\to \\infty$ limit: $u_t = \\max(\\beta_2u_{t-1}, |g_t|)$.' },
    ],
  },

  {
    id: 'paper-batchnorm', title: 'Paper: Batch Normalization (Ioffe and Szegedy, 2015)',
    goal: 'Read Algorithm 1, derive the paper\'s six backward-pass equations with the multivariable chain rule, simplify them to one line, and fold the inference layer into a single multiply and add.',
    builds: ['normalisation', 'multivariable-chain', 'backpropagation', 'estimation', 'paper-adam'],
    blocks: [
      { md: `**The paper.** Sergey Ioffe and Christian Szegedy, "Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift", ICML 2015 (arXiv:1502.03167). Lesson [[#normalisation]] built the forward pass. The paper's real mathematical content is the backward pass, which it gives as six equations "before simplification".

**Algorithm 1.** Focus on one activation over a mini-batch $\\mathcal B = \\{x_{1 \\ldots m}\\}$ (the paper drops the activation's index $k$ "for clarity"):
$$\\mu_{\\mathcal B} = \\frac1m\\sum_{i=1}^m x_i, \\quad \\sigma_{\\mathcal B}^2 = \\frac1m\\sum_{i=1}^m(x_i - \\mu_{\\mathcal B})^2, \\quad \\hat x_i = \\frac{x_i - \\mu_{\\mathcal B}}{\\sqrt{\\sigma_{\\mathcal B}^2 + \\epsilon}}, \\quad y_i = \\gamma\\hat x_i + \\beta$$
Decode: the batch mean; the batch variance (dividing by $m$, not $m - 1$, so it is the biased version, lesson [[#estimation]]); normalise, with a small $\\epsilon$ against dividing by zero; then scale by $\\gamma$ and shift by $\\beta$, both learned. The subscripts in $\\text{BN}_{\\gamma,\\beta}$ name the parameters. The paper's point about $\\gamma$ and $\\beta$: setting $\\gamma = \\sqrt{\\text{Var}[x]}$ and $\\beta = \\mathbb E[x]$ would undo the normalisation, so the layer can represent the identity if that is best. And the warning that matters most for code: $\\text{BN}(x_i)$ **depends on the other examples in the batch**.

**The backward pass.** Given $\\partial\\ell/\\partial y_i$ from the layer above, we need $\\partial\\ell/\\partial x_i$, $\\partial\\ell/\\partial\\gamma$ and $\\partial\\ell/\\partial\\beta$. The difficulty: $x_i$ reaches the loss by three routes, directly through $\\hat x_i$, through $\\mu_{\\mathcal B}$ (which every $\\hat x_j$ uses), and through $\\sigma_{\\mathcal B}^2$. The multivariable chain rule (lesson [[#multivariable-chain]]) says: add the contributions of all routes. Write $s = \\sqrt{\\sigma_{\\mathcal B}^2 + \\epsilon}$.

1. $y_i = \\gamma\\hat x_i + \\beta$, so $\\frac{\\partial\\ell}{\\partial\\hat x_i} = \\frac{\\partial\\ell}{\\partial y_i}\\cdot\\gamma$.
2. $\\sigma_{\\mathcal B}^2$ enters every $\\hat x_i = (x_i - \\mu_{\\mathcal B})(\\sigma_{\\mathcal B}^2 + \\epsilon)^{-1/2}$, whose derivative in $\\sigma_{\\mathcal B}^2$ is $(x_i - \\mu_{\\mathcal B})\\cdot(-\\frac12)(\\sigma_{\\mathcal B}^2 + \\epsilon)^{-3/2}$ (power rule). Summing over $i$: $\\frac{\\partial\\ell}{\\partial\\sigma_{\\mathcal B}^2} = \\sum_i\\frac{\\partial\\ell}{\\partial\\hat x_i}(x_i - \\mu_{\\mathcal B})\\cdot\\frac{-1}{2}(\\sigma_{\\mathcal B}^2 + \\epsilon)^{-3/2}$.
3. $\\mu_{\\mathcal B}$ enters every $\\hat x_i$ (derivative $-1/s$) and also $\\sigma_{\\mathcal B}^2$ (derivative $\\frac1m\\sum_i -2(x_i - \\mu_{\\mathcal B})$): $\\frac{\\partial\\ell}{\\partial\\mu_{\\mathcal B}} = \\Big(\\sum_i\\frac{\\partial\\ell}{\\partial\\hat x_i}\\cdot\\frac{-1}{s}\\Big) + \\frac{\\partial\\ell}{\\partial\\sigma_{\\mathcal B}^2}\\cdot\\frac{\\sum_i -2(x_i - \\mu_{\\mathcal B})}{m}$. **That second term is always zero**: deviations from a mean add up to 0, since $\\sum_i(x_i - \\mu_{\\mathcal B}) = \\sum_i x_i - m\\mu_{\\mathcal B} = 0$. The paper writes it anyway, because it shows the chain rule mechanically.
4. $x_i$ itself: directly through $\\hat x_i$ (derivative $1/s$), through $\\sigma_{\\mathcal B}^2$ (derivative $2(x_i - \\mu_{\\mathcal B})/m$, holding $\\mu$ fixed, because $\\mu$'s route is counted separately) and through $\\mu_{\\mathcal B}$ (derivative $1/m$):
$$\\frac{\\partial\\ell}{\\partial x_i} = \\frac{\\partial\\ell}{\\partial\\hat x_i}\\cdot\\frac1s + \\frac{\\partial\\ell}{\\partial\\sigma_{\\mathcal B}^2}\\cdot\\frac{2(x_i - \\mu_{\\mathcal B})}{m} + \\frac{\\partial\\ell}{\\partial\\mu_{\\mathcal B}}\\cdot\\frac1m$$
5. and 6. $\\gamma$ and $\\beta$ touch every $y_i$: $\\frac{\\partial\\ell}{\\partial\\gamma} = \\sum_i\\frac{\\partial\\ell}{\\partial y_i}\\hat x_i$ and $\\frac{\\partial\\ell}{\\partial\\beta} = \\sum_i\\frac{\\partial\\ell}{\\partial y_i}$.

**Simplify.** Write $g_i = \\partial\\ell/\\partial y_i$, so $\\partial\\ell/\\partial\\hat x_i = \\gamma g_i$. Step 3 becomes $-\\frac\\gamma s\\sum_jg_j$. Step 2 becomes $-\\frac{\\gamma}{2s^3}\\sum_jg_j(x_j - \\mu_{\\mathcal B})$. Substitute into step 4, and use $(x_i - \\mu_{\\mathcal B})(x_j - \\mu_{\\mathcal B})/s^2 = \\hat x_i\\hat x_j$:
$$\\frac{\\partial\\ell}{\\partial x_i} = \\frac{\\gamma}{m\\,s}\\Big(m\\,g_i - \\sum_jg_j - \\hat x_i\\sum_jg_j\\hat x_j\\Big)$$
One line, exact even with $\\epsilon$. Two things follow. Summing over $i$: $\\sum_i\\partial\\ell/\\partial x_i = \\frac{\\gamma}{ms}(m\\sum g - m\\sum g - \\sum_i\\hat x_i\\sum g\\hat x) = 0$, because $\\sum_i\\hat x_i = 0$. Shifting the whole batch by a constant changes nothing after normalisation, so the gradient has no component in that direction. Similarly $\\sum_i\\hat x_i\\,\\partial\\ell/\\partial x_i = 0$ when $\\epsilon = 0$ (using $\\sum_i\\hat x_i^2 = m$): scaling the batch changes nothing either.

**Section 3.1: inference.** At test time the output should depend only on the input, so the batch statistics are replaced by population ones: $\\hat x = (x - \\mathbb E[x])/\\sqrt{\\text{Var}[x] + \\epsilon}$, with $\\text{Var}[x] = \\frac m{m-1}\\mathbb E_{\\mathcal B}[\\sigma_{\\mathcal B}^2]$. The factor $\\frac m{m-1}$ is Bessel's correction (lesson [[#estimation]]): each $\\sigma_{\\mathcal B}^2$ divides by $m$, so on average it underestimates the variance by the factor $\\frac{m-1}m$. Algorithm 2 then folds everything into one affine map:
$$y = \\frac{\\gamma}{\\sqrt{\\text{Var}[x] + \\epsilon}}\\,x + \\Big(\\beta - \\frac{\\gamma\\,\\mathbb E[x]}{\\sqrt{\\text{Var}[x] + \\epsilon}}\\Big)$$
one multiplication and one addition per activation, which can even be merged into the previous layer's weights. (The paper also mentions moving averages, which is what libraries keep during training.)

**Method versus explanation.** The title's explanation is that BN reduces "internal covariate shift", the drift of each layer's input distribution during training. Later work (Santurkar, Tsipras, Ilyas and Madry, "How Does Batch Normalization Help Optimization?", NeurIPS 2018) added random shifts after BN layers, found training barely suffered, and argued that BN helps mainly by making the loss surface smoother. A paper's method and its explanation are separate claims: the first can stand while the second changes.` },
      { figure: 'BatchNormGradFig', caption: 'A batch of four values with fixed $\\partial\\ell/\\partial y = (0.5, -1, 2, 0.1)$ and $\\gamma = 1.5$. Move the fourth value: the paper\'s six equations, the one-line form and a finite-difference measurement agree, and the gradients always add to 0.' },
      { figure: 'EquationAnatomy', props: { ids: ['bn-backward'] }, caption: 'The simplified backward pass, piece by piece.' },
      {
        code: {
          file: 'papers.py', fn: 'bn_forward', notes: [
            ['def bn_forward(xs, gamma, beta, eps=1e-5):', ['One activation\'s values over the batch, and the learned $\\gamma$, $\\beta$.']],
            ['m = len(xs)', ['The batch size.']],
            ['mu = sum(xs) / m', ['$\\mu_{\\mathcal B}$.']],
            ['var = sum((x - mu) ** 2 for x in xs) / m', ['$\\sigma^2_{\\mathcal B}$, dividing by $m$.']],
            ['x_hat = [(x - mu) / math.sqrt(var + eps) for x in xs]', ['Normalise.']],
            ['return [gamma * h + beta for h in x_hat]', ['Scale and shift.'], { tex: 'y_i = \\gamma\\hat x_i + \\beta' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'bn_backward', notes: [
            ['def bn_backward(xs, dys, gamma, eps=1e-5):', ['The batch and $\\partial\\ell/\\partial y_i$.']],
            ['m = len(xs)', ['Recompute the forward quantities…']],
            ['mu = sum(xs) / m', ['…the mean…']],
            ['var = sum((x - mu) ** 2 for x in xs) / m', ['…the variance…']],
            ['x_hat = [(x - mu) / math.sqrt(var + eps) for x in xs]', ['…and the normalised values.']],
            ['d_hat = [dy * gamma for dy in dys]', ['Equation 1: $\\partial\\ell/\\partial\\hat x_i$.']],
            ['d_var = sum(d * (x - mu)', ['Equation 2: $\\partial\\ell/\\partial\\sigma^2_{\\mathcal B}$.']],
            ['d_mu = sum(-d / math.sqrt(var + eps)', ['Equation 3: $\\partial\\ell/\\partial\\mu_{\\mathcal B}$, including the term that is always 0.']],
            ['dxs = [d / math.sqrt(var + eps) + d_var', ['Equation 4: three routes added.']],
            ['return dxs, sum(dy * h', ['Equations 5 and 6: $\\partial\\ell/\\partial\\gamma$ and $\\partial\\ell/\\partial\\beta$.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'bn_backward_compact', notes: [
            ['def bn_backward_compact(xs, dys, gamma, eps=1e-5):', ['The same, simplified.']],
            ['m = len(xs)', ['The batch size.']],
            ['mu = sum(xs) / m', ['The mean.']],
            ['s = math.sqrt(sum((x - mu) ** 2 for x in xs) / m + eps)', ['$s = \\sqrt{\\sigma^2_{\\mathcal B} + \\epsilon}$.']],
            ['x_hat = [(x - mu) / s for x in xs]', ['The normalised values.']],
            ['g_sum, gx_sum = sum(dys), sum(g * h', ['$\\sum_j g_j$ and $\\sum_j g_j\\hat x_j$, computed once.']],
            ['return [gamma / (m * s) * (m * g - g_sum - h * gx_sum)', ['The one-line gradient.'], { tex: '\\frac{\\gamma}{ms}\\big(mg_i - \\textstyle\\sum g - \\hat x_i\\sum g\\hat x\\big)' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'bn_inference', notes: [
            ['def bn_inference(batch_means, batch_vars, m, gamma, beta, eps=1e-5):', ['Statistics collected from training mini-batches of size $m$.']],
            ['mean = sum(batch_means) / len(batch_means)', ['$\\mathbb E[x]$: the average of the batch means.']],
            ['var = m / (m - 1) * sum(batch_vars) / len(batch_vars)', ['$\\text{Var}[x] = \\frac m{m-1}\\mathbb E_{\\mathcal B}[\\sigma^2_{\\mathcal B}]$.']],
            ['scale = gamma / math.sqrt(var + eps)', ['The multiplier.']],
            ['return scale, beta - scale * mean', ['And the offset: $y = \\text{scale}\\cdot x + \\text{offset}$.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'For the batch $(1, 2, 4, 7)$ with $\\partial\\ell/\\partial y = (0.5, -1, 2, 0.1)$ and $\\gamma = 1.5$, what is $\\partial\\ell/\\partial x_1$? (4 decimals)',
          answer: bnBackwardCompact([1, 2, 4, 7], [0.5, -1, 2, 0.1], 1.5)[0], tolerance: 0.00006, compute: () => bnBackwardCompact([1, 2, 4, 7], [0.5, -1, 2, 0.1], 1.5)[0],
          explain: `${f(bnBackwardCompact([1, 2, 4, 7], [0.5, -1, 2, 0.1], 1.5)[0])}, the same from the paper's six equations (${f(bnBackward([1, 2, 4, 7], [0.5, -1, 2, 0.1], 1.5)[0][0])}).`,
        },
      },
      {
        predict: {
          prompt: 'Training batches of size 8 had means 0.9, 1.1, 1.3 and variances 2, 2.5, 1.5. With $\\gamma = 1.2$, $\\beta = 0.1$, what is the inference layer\'s multiplier? (4 decimals)',
          answer: bnInference([0.9, 1.1, 1.3], [2, 2.5, 1.5], 8, 1.2, 0.1)[0], tolerance: 0.00006, compute: () => bnInference([0.9, 1.1, 1.3], [2, 2.5, 1.5], 8, 1.2, 0.1)[0],
          explain: `$\\text{Var}[x] = \\frac87 \\times 2 = ${f(16 / 7)}$, so the multiplier is $1.2/\\sqrt{${f(16 / 7)} + 10^{-5}} = ${f(bnInference([0.9, 1.1, 1.3], [2, 2.5, 1.5], 8, 1.2, 0.1)[0])}$ and the offset $${f(bnInference([0.9, 1.1, 1.3], [2, 2.5, 1.5], 8, 1.2, 0.1)[1])}$.`,
        },
      },
      {
        choice: {
          prompt: 'Why is $\\sum_i\\partial\\ell/\\partial x_i$ always zero?',
          options: [
            { text: 'Adding the same constant to every value in the batch leaves every $\\hat x_i$ unchanged, so the loss cannot change in that direction', why: 'Yes. The mean absorbs the shift. The sum of the gradient is the derivative along "shift everything".' },
            { text: 'Because $\\gamma$ is learned', why: 'The result holds for any $\\gamma$.' },
            { text: 'It isn\'t; it is only small', why: 'It is exactly zero: the one-line formula sums to $\\frac{\\gamma}{ms}(-\\sum_i\\hat x_i\\sum g\\hat x) = 0$.' },
          ],
          answer: 0,
        },
      },
      { note: 'BN normalises each activation with the batch\'s mean and (biased) variance, then applies $\\gamma\\hat x + \\beta$. Its backward pass adds three chain-rule routes; simplified, $\\partial\\ell/\\partial x_i = \\frac{\\gamma}{ms}(mg_i - \\sum g - \\hat x_i\\sum g\\hat x)$, which sums to 0. Inference uses population statistics with Bessel\'s $\\frac m{m-1}$, folded into one multiply and add. The "covariate shift" explanation was later questioned; the method stands.' },
    ],
  },
]
