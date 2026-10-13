// Part 5: the big equations. Each assembled from Parts 1–4: linear regression's loss and gradient,
// ridge regression, logistic regression and binary cross-entropy, softmax and categorical
// cross-entropy, entropy and KL divergence, layers, backpropagation, momentum and Adam, attention.
import { HOURS, SCORES, STUDY, PASSED, mse, mseGradient, fitLine, exactLine, ridgeLine, bce, fitLogistic, softmax, crossEntropy, entropy, kl, sigmoid, tinyNet, backprop, adam, bowlGradient, attention } from '../engine/maths.js'
import { f } from './util.js'

const NET = [[[0.5, -0.3], [0.2, 0.8]], [0.1, -0.1], [1, -1], 0.2]
const grads = backprop(NET, [1, 2], 1)
const [lw, lb] = fitLogistic(STUDY, PASSED)

export const PART5 = {
  id: 'part5', title: 'Part 5 · The big equations', lessons: [
    {
      id: 'linear-regression', number: '5.1', title: 'Linear regression, read symbol by symbol',
      goal: 'Read $J(\\mathbf w, b) = \\frac1n\\sum_{i=1}^n(\\mathbf w^\\top\\mathbf x^{(i)} + b - y^{(i)})^2$ in full, and compute it.',
      builds: ['mle', 'matrix-gradients'],
      blocks: [
        { md: `Here is the first big equation, as a paper would write it:

$$J(\\mathbf w, b) = \\frac{1}{n}\\sum_{i=1}^{n}\\left(\\mathbf w^\\top\\mathbf x^{(i)} + b - y^{(i)}\\right)^2$$

You have met every piece. Reading from the inside out:

| Piece | Meaning | Lesson |
|---|---|---|
| $\\mathbf x^{(i)}$ | example $i$'s inputs, a vector | 1.3, 3.1 |
| $\\mathbf w^\\top\\mathbf x^{(i)} + b$ | the prediction $\\hat y^{(i)}$: a weighted sum plus a bias | 3.4, 3.8 |
| $\\hat y^{(i)} - y^{(i)}$ | the miss on example $i$ | 1.1 |
| $(\\cdots)^2$ | squared: positive, big misses punished | 1.5 |
| $\\frac1n\\sum_{i=1}^n$ | averaged over all $n$ examples | 1.4 |
| $J(\\mathbf w, b)$ | the loss, a function of the **parameters**, not the data | 1.2 |

So: **the average squared miss of the line's predictions**, the **mean squared error**. Lesson 4.11 showed why squared: it is maximum likelihood when the noise is Gaussian. Training means $\\arg\\min_{\\mathbf w, b} J$ (lesson 1.10).

Our data: hours studied (1 to 6) and test scores. Try the line $\\hat y = 4x + 48$: its predictions are 52, 56, 60, 64, 68, 72 against true scores 52, 55, 61, 64, 70, 71.` },
        {
          code: {
            file: 'models.py', fn: 'mse', notes: [
              ['def mse(w, b, xs, ys):', ['One input per example here, so $\\mathbf w^\\top\\mathbf x$ is just $wx$.']],
              ['total = 0.0', ['The Σ\'s running total.']],
              ['for x, y in zip(xs, ys):', ['Each example $i$.']],
              ['total += (w * x + b - y) ** 2', ['Its squared miss.'], { tex: '(\\hat y^{(i)} - y^{(i)})^2' }],
              ['return total / len(xs)', ['$\\frac1n$ of the sum.'], { tex: 'J = \\frac1n\\sum_i(\\hat y^{(i)} - y^{(i)})^2' }],
            ],
          },
        },
        { figure: 'RegressionFig', caption: 'Move the line by hand. Each square is one example\'s squared miss; $J$ is their average area.' },
        {
          predict: {
            prompt: 'For the line $\\hat y = 4x + 48$, what is $J$? (3 decimals)',
            answer: mse(4, 48, HOURS, SCORES), tolerance: 0.0006, compute: () => mse(4, 48, HOURS, SCORES),
            explain: 'Misses: 0, 1, −1, 0, −2, 1. Squares: 0, 1, 1, 0, 4, 1, total 7. Average: $7/6 \\approx 1.167$.',
          },
        },
        { note: 'Linear regression: $J(\\mathbf w, b) = \\frac1n\\sum_i(\\mathbf w^\\top\\mathbf x^{(i)} + b - y^{(i)})^2$, the mean squared error of a weighted sum. Every symbol came from Parts 1–4.' },
      ],
    },

    {
      id: 'regression-gradient', number: '5.2', title: 'Training it: the gradient, and the shortcut',
      goal: 'Derive $\\frac{\\partial J}{\\partial w} = \\frac2n\\sum_i(\\hat y_i - y_i)x_i$, train by gradient descent, and check it against the normal equations.',
      builds: ['linear-regression'],
      blocks: [
        { md: `To run gradient descent (lesson 2.17) we need $J$'s partial derivatives. Take one term, $(wx_i + b - y_i)^2$. Chain rule (lesson 2.12): outer function "square" has rate $2(\\cdot)$; inner $wx_i + b - y_i$ has rate $x_i$ with respect to $w$ and $1$ with respect to $b$. Average over the examples:

$$\\frac{\\partial J}{\\partial w} = \\frac{2}{n}\\sum_{i=1}^n (\\hat y_i - y_i)\\,x_i, \\qquad \\frac{\\partial J}{\\partial b} = \\frac{2}{n}\\sum_{i=1}^n (\\hat y_i - y_i)$$

Read it: each example pushes $w$ in proportion to **how wrong it is** times **how big its input is**. Then the update:

$$w \\leftarrow w - \\eta\\frac{\\partial J}{\\partial w}, \\qquad b \\leftarrow b - \\eta\\frac{\\partial J}{\\partial b}$$

For linear regression there is also a shortcut: the gradient is exactly lesson 3.13's $\\frac2n X^\\top(X\\boldsymbol\\theta - \\mathbf y)$, and setting it to zero gives lesson 3.11's normal equations, solvable in one step. Gradient descent and the normal equations must agree, and they do. (Big models have no such shortcut, which is why gradient descent rules ML.)` },
        {
          code: {
            file: 'models.py', fn: 'mse_gradient', notes: [
              ['def mse_gradient(w, b, xs, ys):', ['Both partial derivatives of $J$.']],
              ['gw = 0.0', ['$\\partial J/\\partial w$ so far.']],
              ['gb = 0.0', ['$\\partial J/\\partial b$ so far.']],
              ['for x, y in zip(xs, ys):', ['Each example…']],
              ['error = w * x + b - y', ['…its miss, $\\hat y_i - y_i$.'], { calc: q => [`${f(q.w)}×${f(q.x)} + ${f(q.b)} − ${f(q.y)}`, q.w * q.x + q.b - q.y] }],
              ['gw += 2 * error * x / len(xs)', ['The chain rule: $2(\\text{miss}) \\times x_i$, averaged.'], { tex: '\\frac{\\partial J}{\\partial w} \\mathrel{+}= \\frac2n(\\hat y_i - y_i)x_i' }],
              ['gb += 2 * error / len(xs)', ['The same with rate 1 for $b$.'], { tex: '\\frac{\\partial J}{\\partial b} \\mathrel{+}= \\frac2n(\\hat y_i - y_i)' }],
              ['return gw, gb', ['The gradient, $\\nabla J$.']],
            ],
          },
        },
        {
          code: {
            file: 'models.py', fn: 'fit_line', notes: [
              ['def fit_line(xs, ys, rate=0.02, steps=2000):', ['Gradient descent on $J$.']],
              ['w = 0.0', ['Start anywhere: a flat line at 0.']],
              ['b = 0.0', ['…and a bias of 0.']],
              ['for _ in range(steps):', ['2,000 steps.']],
              ['gw, gb = mse_gradient(w, b, xs, ys)', ['The gradient here.']],
              ['w = w - rate * gw', ['Step against it…'], { tex: 'w \\leftarrow w - \\eta\\,\\partial J/\\partial w', calc: q => [`${f(q.w)} − ${q.rate} × ${f(q.gw)}`, q.w - q.rate * q.gw] }],
              ['b = b - rate * gb', ['…in both coordinates.'], { calc: q => [`${f(q.b)} − ${q.rate} × ${f(q.gb)}`, q.b - q.rate * q.gb] }],
              ['return w, b', ['The fitted line.']],
            ],
          },
        },
        {
          code: {
            file: 'models.py', fn: 'exact_line', notes: [
              ['def exact_line(xs, ys):', ['The shortcut.']],
              ['return least_squares(xs, ys)', ['Lesson 3.11\'s normal equations.']],
            ],
          },
        },
        { figure: 'RegressionFig', props: { train: true }, caption: 'Gradient descent from a flat line, step by step. Watch $J$ fall and the line settle onto the normal-equation answer (dashed).' },
        { python: { program: 'regression', label: 'Train linear regression in real Python' } },
        {
          predict: {
            prompt: 'At the starting line $w = b = 0$, what is $\\partial J/\\partial w$?',
            answer: mseGradient(0, 0, HOURS, SCORES)[0], tolerance: 1e-9, compute: () => mseGradient(0, 0, HOURS, SCORES)[0],
            explain: 'Every prediction is 0, so each miss is $-y_i$: $\\frac26\\sum(-y_i x_i) = -\\frac26 \\times 1377 = -459$. Strongly negative: increase $w$.',
          },
        },
        {
          predict: {
            prompt: 'The exact least-squares slope for this data? (3 decimals)',
            answer: exactLine(HOURS, SCORES)[0], tolerance: 0.0006, compute: () => exactLine(HOURS, SCORES)[0],
            explain: `${f(exactLine(HOURS, SCORES)[0])} marks per extra hour. Gradient descent reaches ${f(fitLine(HOURS, SCORES)[0])} after 2,000 steps.`,
          },
        },
        { note: '$\\partial J/\\partial w = \\frac2n\\sum(\\hat y_i - y_i)x_i$: each example pushes by its miss times its input. Gradient descent and the normal equations land on the same line.' },
      ],
    },

    {
      id: 'regularisation', number: '5.3', title: 'Regularisation: the λ‖w‖² penalty',
      goal: 'Read $J + \\lambda\\|\\mathbf w\\|^2$, predict what increasing λ does, and see it as a Gaussian prior.',
      builds: ['regression-gradient', 'bayes'],
      blocks: [
        { md: `A model that fits its training data too eagerly can chase noise: huge weights balancing each other to hit every point exactly, and terrible predictions on new data (**overfitting**). A common cure is to charge for large weights:

$$J_\\lambda(\\mathbf w, b) = \\underbrace{\\frac1n\\sum_i(\\hat y_i - y_i)^2}_{\\text{fit the data}} + \\underbrace{\\lambda\\,\\|\\mathbf w\\|^2}_{\\text{keep weights small}}$$

$\\lambda$ (lambda) sets the price. At $\\lambda = 0$ it is ordinary least squares; as $\\lambda$ grows the weights shrink toward 0 and the line flattens toward the mean. This is **ridge regression**, also called **L2 regularisation** or, in neural networks, **weight decay** (because the penalty's gradient, $2\\lambda\\mathbf w$, shrinks every weight a little each step). The bias $b$ is usually not penalised.

The normal equations just gain a $\\lambda$ (times $n$, for our averaged loss) on the diagonal of $X^\\top X$, which also cures lesson 3.9's singular matrices: there is always an inverse.

A Bayesian reading (lesson 4.6): penalising $\\lambda\\|\\mathbf w\\|^2$ is the same as maximising the **posterior** with a Gaussian **prior** that says "weights are probably near zero". Regularisation is a prior belief, written as a loss.` },
        {
          code: {
            file: 'models.py', fn: 'ridge_line', notes: [
              ['def ridge_line(xs, ys, lam):', ['The normal equations with the penalty, solved by hand for one input.']],
              ['n = len(xs)', ['Number of examples.']],
              ['sxx = sum(x * x for x in xs)', ['$\\sum x_i^2$: a corner of $X^\\top X$.']],
              ['sx = sum(xs)', ['$\\sum x_i$.']],
              ['sxy = sum(x * y for x, y in zip(xs, ys))', ['$\\sum x_iy_i$: part of $X^\\top\\mathbf y$.']],
              ['sy = sum(ys)', ['$\\sum y_i$.']],
              ['det = (sxx + n * lam) * n - sx * sx', ['The determinant of $X^\\top X$ with $n\\lambda$ added to the weight\'s corner.'], { calc: q => [`(${f(q.sxx)} + ${q.n}×${f(q.lam)})×${q.n} − ${f(q.sx)}²`, (q.sxx + q.n * q.lam) * q.n - q.sx * q.sx] }],
              ['w = (n * sxy - sx * sy) / det', ['Lesson 3.9\'s 2×2 inverse, applied.']],
              ['b = ((sxx + n * lam) * sy - sx * sxy) / det', ['The intercept, from the same inverse.']],
              ['return w, b', ['The penalised line.']],
            ],
          },
        },
        { figure: 'RidgeFig', caption: 'Raise λ: the slope shrinks toward 0 and the line flattens toward the average score.' },
        {
          predict: {
            prompt: 'With $\\lambda = 10$, what is the ridge slope $w$? (3 decimals)',
            answer: ridgeLine(HOURS, SCORES, 10)[0], tolerance: 0.0006, compute: () => ridgeLine(HOURS, SCORES, 10)[0],
            explain: `${f(ridgeLine(HOURS, SCORES, 10)[0])}, down from ${f(exactLine(HOURS, SCORES)[0])}: the penalty has shrunk it a lot.`,
          },
        },
        { note: 'Ridge: minimise $J + \\lambda\\|\\mathbf w\\|^2$. Larger λ, smaller weights, less overfitting. Its gradient adds $2\\lambda\\mathbf w$ (weight decay). Bayesian view: a Gaussian prior on the weights.' },
      ],
    },

    {
      id: 'logistic-regression', number: '5.4', title: 'Logistic regression and cross-entropy',
      goal: 'Derive binary cross-entropy as a negative log-likelihood, and its gradient $(p - y)x$.',
      builds: ['regularisation', 'chain-rule', 'likelihood'],
      blocks: [
        { md: `Now predict a **yes/no**: will a student pass, given hours studied? A line can give any number; we want a probability. Pass the line through the sigmoid (lesson 1.8):

$$p = \\sigma(wx + b) = \\frac{1}{1 + e^{-(wx + b)}}$$

That is **logistic regression**. To train it, use maximum likelihood (lesson 4.11). Each example is like a coin flip with bias $p_i$: its probability is $p_i$ if $y_i = 1$ (passed) and $1 - p_i$ if $y_i = 0$. One expression covers both, because one of the two powers is always 0:

$$P(y_i) = p_i^{\\,y_i}(1 - p_i)^{1 - y_i}$$

Take the log, add over examples, and put a minus sign in front (so it's a loss to **minimise**):

$$\\mathcal L = -\\frac1n\\sum_{i=1}^{n}\\Big[y_i\\log p_i + (1 - y_i)\\log(1 - p_i)\\Big]$$

That is **binary cross-entropy**, the standard loss for yes/no classification. A confident wrong answer ($p = 0.01$ when $y = 1$) costs $-\\log 0.01 = 4.6$; a confident right one costs almost nothing.

Its gradient is beautifully simple. With $z = wx + b$, the chain rule gives $\\frac{\\partial\\mathcal L_i}{\\partial z} = -\\frac{y}{p}\\sigma'(z) + \\frac{1-y}{1-p}\\sigma'(z)$, and since $\\sigma' = p(1 - p)$ (lesson 2.12) everything cancels to

$$\\frac{\\partial \\mathcal L_i}{\\partial z} = p_i - y_i, \\qquad \\frac{\\partial \\mathcal L}{\\partial w} = \\frac1n\\sum_i (p_i - y_i)\\,x_i$$

Prediction minus truth, times input: the **same shape** as linear regression's gradient. This is no accident, and the same thing happens for softmax next lesson.` },
        {
          code: {
            file: 'models.py', fn: 'bce', notes: [
              ['def bce(p, y):', ['One example\'s loss.']],
              ['return -(y * math.log(p) + (1 - y) * math.log(1 - p))', ['When $y = 1$ only $-\\log p$ survives; when $y = 0$ only $-\\log(1 - p)$.'], { tex: '-[y\\log p + (1-y)\\log(1-p)]', calc: q => [`−(${q.y} log ${f(q.p)} + ${1 - q.y} log ${f(1 - q.p)})`, -(q.y * Math.log(q.p) + (1 - q.y) * Math.log(1 - q.p))] }],
            ],
          },
        },
        {
          code: {
            file: 'models.py', fn: 'fit_logistic', notes: [
              ['def fit_logistic(xs, ys, rate=0.1, steps=3000):', ['Gradient descent on the average cross-entropy.']],
              ['w = 0.0', ['Start: every probability 0.5.']],
              ['b = 0.0', ['…and a bias of 0.']],
              ['for _ in range(steps):', ['Each step…']],
              ['gw = 0.0', ['…add up the gradient over the examples.']],
              ['gb = 0.0', ['…for the bias too.']],
              ['for x, y in zip(xs, ys):', ['Each example.']],
              ['p = sigmoid(w * x + b)', ['Its predicted probability of passing.'], { tex: 'p_i = \\sigma(wx_i + b)' }],
              ['gw += (p - y) * x / len(xs)', ['Prediction minus truth, times input.'], { tex: '\\frac{\\partial\\mathcal L}{\\partial w} \\mathrel{+}= \\frac1n(p_i - y_i)x_i' }],
              ['gb += (p - y) / len(xs)', ['The same for the bias: rate 1.']],
              ['w = w - rate * gw', ['Step.']],
              ['b = b - rate * gb', ['…in both coordinates.']],
              ['return w, b', ['The fitted model.']],
            ],
          },
        },
        { figure: 'LogisticFig', caption: 'Passes (top) and fails (bottom) by hours studied, with the fitted sigmoid. Each example\'s bar is its cross-entropy: confident mistakes cost the most.' },
        {
          predict: {
            prompt: 'A model says $p = 0.8$. What is the cross-entropy if the true answer is $y = 0$? (3 decimals)',
            answer: bce(0.8, 0), tolerance: 0.0006, compute: () => bce(0.8, 0),
            explain: `$-\\log(1 - 0.8) = -\\log 0.2 = ${f(bce(0.8, 0))}$. If $y$ had been 1, only $-\\log 0.8 = ${f(bce(0.8, 1))}$.`,
          },
        },
        {
          predict: {
            prompt: `The trained model is $p = \\sigma(${f(lw)}x ${f(lb)})$. What probability does it give a student who studied 3 hours? (3 decimals)`,
            answer: sigmoid(lw * 3 + lb), tolerance: 0.0006, compute: () => { const [w, b] = fitLogistic(STUDY, PASSED); return sigmoid(w * 3 + b) },
            explain: `$z = ${f(lw)} \\times 3 ${f(lb)} = ${f(lw * 3 + lb)}$, and $\\sigma(${f(lw * 3 + lb)}) = ${f(sigmoid(lw * 3 + lb))}$.`,
          },
        },
        { note: 'Logistic regression $p = \\sigma(\\mathbf w^\\top\\mathbf x + b)$, trained on binary cross-entropy $-[y\\log p + (1-y)\\log(1-p)]$ = negative log-likelihood. Gradient: $(p - y)\\mathbf x$.' },
      ],
    },

    {
      id: 'softmax', number: '5.5', title: 'Softmax and cross-entropy: choosing among many',
      goal: 'Build softmax from $e^x$ and normalising, compute the cross-entropy against a label, and state its gradient $\\mathbf p - \\mathbf y$.',
      builds: ['logistic-regression', 'number-e'],
      blocks: [
        { md: `With $K$ classes (digits 0–9, or 50,000 possible next words), a model outputs one raw **score** per class, $z_1, \\dots, z_K$ (called **logits**). We need probabilities: positive, adding to 1. Two steps:

1. Make every score positive with $e^{z_k}$ (lesson 1.6: exponentials are always positive, and bigger scores stay bigger).
2. Divide by the total so they add to 1.

$$\\text{softmax}(\\mathbf z)_k = \\frac{e^{z_k}}{\\sum_{j=1}^{K} e^{z_j}}$$

Scores $(2, 1, 0)$ become probabilities $(0.665, 0.245, 0.090)$. The name: it is a "soft" version of argmax, picking the biggest but leaving some probability for the rest. With two classes it reduces to the sigmoid.

Training is maximum likelihood again: the loss is minus the log of the probability given to the **correct** class $c$,

$$\\mathcal L = -\\log \\text{softmax}(\\mathbf z)_c = -\\sum_k y_k \\log p_k$$

where $\\mathbf y$ is **one-hot**: 1 for the correct class, 0 elsewhere. This is **categorical cross-entropy**, the loss of nearly every classifier and language model. And its gradient with respect to the scores is, once more,

$$\\frac{\\partial \\mathcal L}{\\partial \\mathbf z} = \\mathbf p - \\mathbf y$$

predicted probabilities minus the one-hot truth.

A practical detail you'll meet in code: $e^{1000}$ overflows, so implementations subtract the largest score first. Since $e^{z - m}/\\sum e^{z_j - m} = e^{z}/\\sum e^{z_j}$ (the $e^{-m}$ cancels), the answer doesn't change.` },
        {
          code: {
            file: 'models.py', fn: 'softmax', notes: [
              ['def softmax(zs):', ['Scores in, probabilities out.']],
              ['top = max(zs)', ['The largest score, subtracted for safety.']],
              ['exps = [math.exp(z - top) for z in zs]', ['$e^{z_k - m}$: all positive, the largest exactly 1.']],
              ['s = sum(exps)', ['$\\sum_j e^{z_j - m}$.']],
              ['return [e / s for e in exps]', ['Each divided by the total.'], { tex: '\\frac{e^{z_k}}{\\sum_j e^{z_j}}' }],
            ],
          },
        },
        {
          code: {
            file: 'models.py', fn: 'cross_entropy', notes: [
              ['def cross_entropy(p, target):', ['`target` is the correct class\'s index.']],
              ['return -math.log(p[target])', ['Minus the log of the probability given to the right answer.'], { tex: '-\\log p_c' }],
            ],
          },
        },
        { figure: 'SoftmaxFig', caption: 'Drag the scores. Softmax keeps the order, makes everything positive and adds to 1. Pick the true class to see the loss and the gradient $\\mathbf p - \\mathbf y$.' },
        {
          predict: {
            prompt: 'Scores $(2, 1, 0)$; the correct class is the **second**. What is the cross-entropy? (3 decimals)',
            answer: crossEntropy(softmax([2, 1, 0]), 1), tolerance: 0.0006, compute: () => crossEntropy(softmax([2, 1, 0]), 1),
            explain: `softmax gives $p_2 = ${f(softmax([2, 1, 0])[1])}$, and $-\\log ${f(softmax([2, 1, 0])[1])} = ${f(crossEntropy(softmax([2, 1, 0]), 1))}$.`,
          },
        },
        {
          predict: {
            prompt: 'In the same example, what is the gradient $\\partial\\mathcal L/\\partial z_2$ (the correct class\'s score)? (3 decimals)',
            answer: softmax([2, 1, 0])[1] - 1, tolerance: 0.0006, compute: () => softmax([2, 1, 0])[1] - 1,
            explain: `$p_2 - 1 = ${f(softmax([2, 1, 0])[1] - 1)}$: negative, so gradient descent **raises** the correct score.`,
          },
        },
        { note: 'softmax$(\\mathbf z)_k = e^{z_k}/\\sum_j e^{z_j}$; categorical cross-entropy $-\\log p_{\\text{correct}}$; gradient $\\mathbf p - \\mathbf y$. Two classes: it is the sigmoid and binary cross-entropy.' },
      ],
    },

    {
      id: 'entropy-kl', number: '5.6', title: 'Entropy, cross-entropy and KL divergence',
      goal: 'Compute $H(p)$, $H(p, q)$ and $D_{KL}(p\\|q)$, and say why minimising cross-entropy minimises KL.',
      builds: ['softmax', 'expectation'],
      blocks: [
        { md: `Why is it called **cross-entropy**? Information theory gives the meaning.

The **surprise** of an event with probability $p$ is $-\\log p$: a certain event (probability 1) is no surprise; a one-in-a-million event is very surprising. The **entropy** of a distribution is its **expected** surprise (lesson 4.3):

$$H(p) = -\\sum_k p_k \\log p_k$$

A fair coin has entropy $\\log 2 = 0.693$ nats (or exactly 1 bit with base-2 logs); a coin that always lands heads has entropy 0. Entropy measures unpredictability.

**Cross-entropy** is the expected surprise when the truth is $p$ but you **believe** $q$:

$$H(p, q) = -\\sum_k p_k \\log q_k$$

With $p$ one-hot (the true label), this is exactly lesson 5.5's loss, $-\\log q_{\\text{correct}}$. Cross-entropy is never smaller than the entropy, and the gap is the **Kullback–Leibler divergence**:

$$D_{KL}(p \\,\\|\\, q) = H(p, q) - H(p) = \\sum_k p_k \\log\\frac{p_k}{q_k} \\;\\ge\\; 0$$

zero only when $q = p$. It measures how far a belief is from the truth (it is not a true distance: $D_{KL}(p\\|q) \\ne D_{KL}(q\\|p)$). Since $H(p)$ doesn't depend on the model, **minimising cross-entropy is minimising KL divergence** to the data. KL also appears directly in VAEs, in RL from human feedback, and in knowledge distillation.` },
        {
          code: {
            file: 'models.py', fn: 'entropy', notes: [
              ['def entropy(p):', ['A distribution as a list.']],
              ['return -sum(pi * math.log(pi) for pi in p if pi > 0)', ['Expected surprise. Terms with $p_i = 0$ are skipped: they contribute 0 (and $\\log 0$ is undefined).'], { tex: 'H(p) = -\\sum_k p_k\\log p_k' }],
            ],
          },
        },
        {
          code: {
            file: 'models.py', fn: 'kl', notes: [
              ['def kl(p, q):', ['Truth $p$, belief $q$.']],
              ['return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q) if pi > 0)', ['$\\sum p\\log(p/q)$.'], { tex: 'D_{KL}(p\\|q) = \\sum_k p_k\\log\\frac{p_k}{q_k}' }],
            ],
          },
        },
        { figure: 'EntropyFig', caption: 'Shape the true distribution $p$ and a belief $q$. Cross-entropy = entropy + KL, and KL is zero only when they match.' },
        {
          predict: {
            prompt: 'What is the entropy of $(0.5, 0.25, 0.25)$ in nats? (3 decimals)',
            answer: entropy([0.5, 0.25, 0.25]), tolerance: 0.0006, compute: () => entropy([0.5, 0.25, 0.25]),
            explain: '$-(0.5\\log 0.5 + 2 \\times 0.25\\log 0.25) = 0.347 + 0.693 = 1.040$.',
          },
        },
        {
          predict: {
            prompt: '$D_{KL}\\big((0.7, 0.3) \\,\\|\\, (0.5, 0.5)\\big)$? (3 decimals)',
            answer: kl([0.7, 0.3], [0.5, 0.5]), tolerance: 0.0006, compute: () => kl([0.7, 0.3], [0.5, 0.5]),
            explain: `$0.7\\log 1.4 + 0.3\\log 0.6 = 0.2355 - 0.1532 = ${f(kl([0.7, 0.3], [0.5, 0.5]))}$.`,
          },
        },
        { note: '$H(p) = -\\sum p\\log p$ (expected surprise). $H(p, q) = -\\sum p\\log q$. $D_{KL}(p\\|q) = H(p,q) - H(p) \\ge 0$. Minimising cross-entropy = minimising KL to the data.' },
      ],
    },

    {
      id: 'layers', number: '5.7', title: 'A neural network is composed functions',
      goal: 'Read $\\mathbf h = \\sigma(W\\mathbf x + \\mathbf b)$ and a two-layer network, and run one forward pass by hand.',
      builds: ['entropy-kl', 'matrices', 'composition'],
      blocks: [
        { md: `A **layer** is lesson 3.5's matrix product followed by an activation applied to every entry:

$$\\mathbf h = \\sigma(W\\mathbf x + \\mathbf b)$$

$W\\mathbf x$: each neuron's weighted sum (a dot product per row). $+\\,\\mathbf b$: each neuron's bias. $\\sigma(\\cdot)$: bend every entry (sigmoid here; ReLU, $\\max(0, z)$, is the modern default). Without the bend, stacked layers would collapse into one matrix (lesson 3.7).

A network **composes** layers (lesson 1.8):

$$\\hat y = \\mathbf w_2^\\top\\, \\sigma(W_1\\mathbf x + \\mathbf b_1) + b_2$$

Read inside out: the input $\\mathbf x$, through the hidden layer to $\\mathbf h$, then a final weighted sum. That's a whole neural network in one line, and every symbol is something you know. Deep networks are just more layers: $f_L(\\dots f_2(f_1(\\mathbf x)))$.

Our tiny network: 2 inputs, 2 hidden neurons, 1 output, with
$W_1 = \\begin{pmatrix}0.5 & -0.3\\\\0.2 & 0.8\\end{pmatrix}$, $\\mathbf b_1 = (0.1, -0.1)$, $\\mathbf w_2 = (1, -1)$, $b_2 = 0.2$, and input $\\mathbf x = (1, 2)$.` },
        {
          code: {
            file: 'models.py', fn: 'layer', notes: [
              ['def layer(W, b, x):', ['One layer.']],
              ['z = [zi + bi for zi, bi in zip(matvec(W, x), b)]', ['$W\\mathbf x + \\mathbf b$: weighted sums plus biases.'], { tex: '\\mathbf z = W\\mathbf x + \\mathbf b' }],
              ['return [sigmoid(zi) for zi in z]', ['The activation on every entry.'], { tex: '\\mathbf h = \\sigma(\\mathbf z)' }],
            ],
          },
        },
        {
          code: {
            file: 'models.py', fn: 'tiny_net', notes: [
              ['def tiny_net(params, x):', ['Two layers.']],
              ['W1, b1, w2, b2 = params', ['Unpack the four parameter groups.']],
              ['h = layer(W1, b1, x)', ['The hidden layer.']],
              ['return dot(w2, h) + b2, h', ['The output, $\\mathbf w_2^\\top\\mathbf h + b_2$, and $\\mathbf h$ (backpropagation needs it).'], { tex: '\\hat y = \\mathbf w_2^\\top\\mathbf h + b_2' }],
            ],
          },
        },
        { figure: 'NetworkFig', caption: 'The tiny network. Change the inputs and follow the numbers forward through every neuron.' },
        {
          predict: {
            prompt: 'Forward pass with $\\mathbf x = (1, 2)$: what is $h_1 = \\sigma(0.5 \\cdot 1 - 0.3 \\cdot 2 + 0.1)$?',
            answer: tinyNet(NET, [1, 2])[1][0], tolerance: 1e-9, compute: () => tinyNet(NET, [1, 2])[1][0],
            explain: '$0.5 - 0.6 + 0.1 = 0$, and $\\sigma(0) = 0.5$.',
          },
        },
        {
          predict: {
            prompt: 'And the output $\\hat y$? (4 decimals)',
            answer: tinyNet(NET, [1, 2])[0], tolerance: 0.00006, compute: () => tinyNet(NET, [1, 2])[0],
            explain: `$h_2 = \\sigma(0.2 + 1.6 - 0.1) = \\sigma(1.7) = ${f(tinyNet(NET, [1, 2])[1][1])}$; $\\hat y = 0.5 - ${f(tinyNet(NET, [1, 2])[1][1])} + 0.2 = ${f(tinyNet(NET, [1, 2])[0])}$.`,
          },
        },
        { note: 'Layer: $\\mathbf h = \\sigma(W\\mathbf x + \\mathbf b)$. Network: layers composed, $\\hat y = \\mathbf w_2^\\top\\sigma(W_1\\mathbf x + \\mathbf b_1) + b_2$. The bend between layers is what makes depth useful.' },
      ],
    },

    {
      id: 'backpropagation', number: '5.8', title: 'Backpropagation: the chain rule, run backwards',
      goal: 'Compute every weight\'s gradient in a two-layer network with the chain rule, and read $\\boldsymbol\\delta = (W^\\top\\boldsymbol\\delta\') \\odot \\sigma\'(\\mathbf z)$.',
      builds: ['layers', 'chain-rule'],
      blocks: [
        { md: `To train the network we need $\\frac{\\partial \\mathcal L}{\\partial w}$ for **every** weight. The loss is a long composition, so this is the chain rule (lesson 2.12), organised cleverly: start at the loss and work **backwards**, reusing each result. Take $\\mathcal L = (\\hat y - y)^2$ with target $y = 1$.

1. **Output.** $\\frac{\\partial\\mathcal L}{\\partial\\hat y} = 2(\\hat y - y)$. Call it $\\delta_y$.
2. **Output layer's weights.** $\\hat y = \\mathbf w_2^\\top\\mathbf h + b_2$, so $\\frac{\\partial\\hat y}{\\partial w_{2,k}} = h_k$ (lesson 3.13). Chain: $\\frac{\\partial\\mathcal L}{\\partial w_{2,k}} = \\delta_y\\, h_k$. And $\\frac{\\partial\\mathcal L}{\\partial b_2} = \\delta_y$.
3. **Back into the hidden layer.** $\\frac{\\partial\\hat y}{\\partial h_k} = w_{2,k}$, so $\\frac{\\partial\\mathcal L}{\\partial h_k} = \\delta_y w_{2,k}$.
4. **Through the activation.** $h_k = \\sigma(z_k)$ and $\\sigma' = \\sigma(1-\\sigma)$: $\\delta_k = \\frac{\\partial\\mathcal L}{\\partial z_k} = \\delta_y\\, w_{2,k}\\; h_k(1 - h_k)$.
5. **First layer's weights.** $z_k = \\sum_j W_{1,kj} x_j + b_{1,k}$, so $\\frac{\\partial\\mathcal L}{\\partial W_{1,kj}} = \\delta_k\\, x_j$ and $\\frac{\\partial\\mathcal L}{\\partial b_{1,k}} = \\delta_k$.

Every gradient is "the error signal arriving at a neuron" times "the input it saw". In matrix form, which is how papers write it, for any layer:

$$\\boldsymbol\\delta = (W^\\top\\boldsymbol\\delta_{\\text{next}}) \\odot \\sigma'(\\mathbf z), \\qquad \\frac{\\partial\\mathcal L}{\\partial W} = \\boldsymbol\\delta\\,\\mathbf x^\\top$$

$W^\\top$ sends the error back through the weights it came forward through; $\\odot$ means multiply entry by entry; $\\boldsymbol\\delta\\mathbf x^\\top$ is an outer product (lesson 3.8): one gradient per weight. One backward pass costs about as much as one forward pass, however many weights there are. That efficiency is what makes deep learning possible.` },
        {
          code: {
            file: 'models.py', fn: 'backprop', notes: [
              ['def backprop(params, x, y):', ['All gradients of $(\\hat y - y)^2$.']],
              ['W1, b1, w2, b2 = params', ['The parameters.']],
              ['y_hat, h = tiny_net(params, x)', ['A forward pass first: backprop needs $\\mathbf h$.']],
              ['d_y = 2 * (y_hat - y)', ['Step 1: $\\delta_y$.'], { tex: '\\delta_y = 2(\\hat y - y)', calc: q => [`2 × (${f(q.y_hat)} − ${f(q.y)})`, 2 * (q.y_hat - q.y)] }],
              ['g_w2 = [d_y * hi for hi in h]', ['Step 2: $\\delta_y h_k$ for each output weight.'], { tex: '\\partial\\mathcal L/\\partial w_{2,k} = \\delta_y h_k' }],
              ['g_b2 = d_y', ['The output bias: rate 1.']],
              ['d_h = [d_y * wi for wi in w2]', ['Step 3: the error sent back to each hidden neuron through its weight.'], { tex: '\\partial\\mathcal L/\\partial h_k = \\delta_y w_{2,k}' }],
              ['d_z = [dh * hi * (1 - hi) for dh, hi in zip(d_h, h)]', ['Step 4: through the sigmoid, $\\times\\,h(1 - h)$.'], { tex: '\\delta_k = \\delta_y w_{2,k} h_k(1-h_k)' }],
              ['g_W1 = [[dz * xj for xj in x] for dz in d_z]', ['Step 5: $\\delta_k x_j$ for every first-layer weight: an outer product.'], { tex: '\\partial\\mathcal L/\\partial W_1 = \\boldsymbol\\delta\\,\\mathbf x^\\top' }],
              ['g_b1 = d_z', ['Hidden biases.']],
              ['return g_W1, g_b1, g_w2, g_b2', ['Every gradient, in the same shapes as the parameters.']],
            ],
          },
        },
        { figure: 'NetworkFig', props: { backward: true }, caption: 'The backward pass: the error signal $\\delta$ flows from the output back through each weight. Every gradient is checked against a numerical slope.' },
        { python: { program: 'backprop', label: 'Step through backpropagation in real Python' } },
        {
          predict: {
            prompt: `With target $y = 1$, the output was $\\hat y = ${f(tinyNet(NET, [1, 2])[0])}$. What is $\\delta_y = 2(\\hat y - y)$? (4 decimals)`,
            answer: grads[3], tolerance: 0.00006, compute: () => backprop(NET, [1, 2], 1)[3],
            explain: `$2 \\times (${f(tinyNet(NET, [1, 2])[0])} - 1) = ${f(grads[3])}$: the output is too low.`,
          },
        },
        {
          predict: {
            prompt: 'What is $\\frac{\\partial\\mathcal L}{\\partial W_{1,12}}$, the gradient for the weight from input 2 to hidden neuron 1? (4 decimals)',
            answer: grads[0][0][1], tolerance: 0.00006, compute: () => backprop(NET, [1, 2], 1)[0][0][1],
            explain: `$\\delta_1 = \\delta_y \\times w_{2,1} \\times h_1(1 - h_1) = ${f(grads[3])} \\times 1 \\times 0.25 = ${f(grads[1][0])}$; times $x_2 = 2$: ${f(grads[0][0][1])}.`,
          },
        },
        { note: 'Backprop: chain rule from the loss backwards. $\\boldsymbol\\delta = (W^\\top\\boldsymbol\\delta_{\\text{next}})\\odot\\sigma\'(\\mathbf z)$, $\\partial\\mathcal L/\\partial W = \\boldsymbol\\delta\\mathbf x^\\top$: error at the neuron × input it saw.' },
      ],
    },

    {
      id: 'optimisers', number: '5.9', title: 'Momentum and Adam, read line by line',
      goal: 'Read the Adam update equations, explain each line (moving averages, bias correction, scaling), and compare it with plain gradient descent.',
      builds: ['backpropagation', 'gradient-descent-2d', 'variance'],
      blocks: [
        { md: `Plain gradient descent (lesson 2.17) has two weaknesses: in a long narrow valley it zig-zags across the steep direction while crawling along the shallow one, and one learning rate must suit every parameter. The Adam optimiser, used to train most modern networks, fixes both. Its paper writes it like this; every symbol is now readable:

$$\\begin{aligned}
\\mathbf g_t &= \\nabla_\\theta \\mathcal L(\\theta_{t-1}) \\\\
\\mathbf m_t &= \\beta_1\\mathbf m_{t-1} + (1 - \\beta_1)\\,\\mathbf g_t \\\\
\\mathbf v_t &= \\beta_2\\mathbf v_{t-1} + (1 - \\beta_2)\\,\\mathbf g_t^2 \\\\
\\hat{\\mathbf m}_t &= \\mathbf m_t/(1 - \\beta_1^t), \\quad \\hat{\\mathbf v}_t = \\mathbf v_t/(1 - \\beta_2^t) \\\\
\\theta_t &= \\theta_{t-1} - \\alpha\\,\\hat{\\mathbf m}_t / (\\sqrt{\\hat{\\mathbf v}_t} + \\epsilon)
\\end{aligned}$$

Line by line:

1. **The gradient** at step $t$ (subscripts now count time).
2. **Momentum.** $\\mathbf m$ is an **exponential moving average** of the gradients: 90% of the old average plus 10% of the new gradient ($\\beta_1 = 0.9$). Zig-zags cancel out in the average; steady directions build up, like a ball rolling downhill gathering speed.
3. **Second moment.** The same average of the **squared** gradients ($\\mathbf g^2$ entry by entry): roughly each parameter's typical gradient size squared, an uncentred variance (lesson 4.4).
4. **Bias correction.** Both averages start at 0, so early on they are too small. Dividing by $1 - \\beta^t$ fixes that (at $t = 1$, $\\mathbf m_1 = 0.1\\mathbf g$ and $1 - 0.9 = 0.1$, so $\\hat{\\mathbf m}_1 = \\mathbf g$ exactly).
5. **The step.** Momentum divided by the typical gradient size: each parameter's step is scaled to about $\\alpha$, whatever its own slopes are. Steep directions get damped, shallow ones boosted. $\\epsilon$ (about $10^{-8}$) avoids dividing by zero.` },
        {
          code: {
            file: 'models.py', fn: 'adam', notes: [
              ['def adam(grad, x, y, rate=0.1, steps=100, beta1=0.9, beta2=0.999, eps=1e-8):', ['Adam on a function of two parameters; `grad` gives its gradient.']],
              ['m = [0.0, 0.0]', ['$\\mathbf m_0 = 0$.']],
              ['v = [0.0, 0.0]', ['$\\mathbf v_0 = 0$.']],
              ['theta = [x, y]', ['The parameters.']],
              ['for t in range(1, steps + 1):', ['$t = 1, 2, \\dots$: counting from 1 makes the bias correction work.']],
              ['g = grad(theta[0], theta[1])', ['Line 1: $\\mathbf g_t$.']],
              ['for i in range(2):', ['Each parameter separately.']],
              ['m[i] = beta1 * m[i] + (1 - beta1) * g[i]', ['Line 2: momentum.'], { tex: 'm_t = \\beta_1 m_{t-1} + (1-\\beta_1)g_t' }],
              ['v[i] = beta2 * v[i] + (1 - beta2) * g[i] ** 2', ['Line 3: the squared gradients\' average.'], { tex: 'v_t = \\beta_2 v_{t-1} + (1-\\beta_2)g_t^2' }],
              ['m_hat = m[i] / (1 - beta1 ** t)', ['Line 4: bias correction.'], { tex: '\\hat m_t = m_t/(1 - \\beta_1^t)' }],
              ['v_hat = v[i] / (1 - beta2 ** t)', ['The same correction for $\\mathbf v$.']],
              ['theta[i] = theta[i] - rate * m_hat / (math.sqrt(v_hat) + eps)', ['Line 5: the scaled step.'], { tex: '\\theta_t = \\theta_{t-1} - \\alpha\\hat m_t/(\\sqrt{\\hat v_t} + \\epsilon)' }],
              ['return theta', ['Where it ended up.']],
            ],
          },
        },
        { figure: 'OptimiserFig', caption: 'Plain gradient descent and Adam racing down the same narrow valley from the same start.' },
        {
          predict: {
            prompt: 'At step $t = 1$ with gradient $g = -6$ and $\\beta_1 = 0.9$: what is $\\hat m_1$?',
            answer: -6, tolerance: 1e-9, compute: () => (0.1 * -6) / (1 - 0.9),
            explain: '$m_1 = 0.9 \\times 0 + 0.1 \\times (-6) = -0.6$; corrected: $-0.6 / 0.1 = -6$, the gradient itself.',
            misconceptions: [{ answer: -0.6, tolerance: 1e-9, feedback: 'That is $m_1$ before bias correction: divide by $1 - \\beta_1^1 = 0.1$.' }],
          },
        },
        {
          predict: {
            prompt: 'And Adam\'s **first step size**, $|\\hat m_1/\\sqrt{\\hat v_1}|$ times $\\alpha = 0.1$, ignoring ε?',
            answer: 0.1, tolerance: 1e-6, compute: () => { const t = adam(bowlGradient, 0, 0, 0.1, 1); return Math.abs(t[0]) },
            explain: '$\\hat v_1 = g^2$, so $\\hat m_1/\\sqrt{\\hat v_1} = g/|g| = \\pm 1$: the first step is exactly $\\alpha$ in every coordinate, however steep or shallow.',
          },
        },
        { note: 'Adam: momentum $\\mathbf m$ (average gradient) divided by $\\sqrt{\\mathbf v}$ (typical gradient size), both bias-corrected. Steps of about α per parameter; zig-zags averaged away.' },
      ],
    },

    {
      id: 'attention', number: '5.10', title: 'Attention: $\\text{softmax}(QK^\\top/\\sqrt d)\\,V$',
      goal: 'Build scaled dot-product attention from dot products, softmax and a weighted average, and explain the $\\sqrt d$.',
      builds: ['optimisers', 'softmax', 'dot-product'],
      blocks: [
        { md: `The equation at the heart of every Transformer (and so every large language model):

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d}}\\right) V$$

Built in four steps from things you know. Each word (token) has three vectors: a **query** $\\mathbf q$ ("what am I looking for?"), a **key** $\\mathbf k$ ("what do I contain?") and a **value** $\\mathbf v$ ("what do I pass on?"). Stack them as rows of matrices $Q$, $K$, $V$.

1. **Scores by dot product.** How well does query $i$ match key $j$? Their dot product $\\mathbf q_i \\cdot \\mathbf k_j$ (lesson 3.4: big when they point the same way). All of them at once is the matrix $QK^\\top$ (lesson 3.8): entry $(i, j)$ is $\\mathbf q_i^\\top \\mathbf k_j$.
2. **Scale by $\\sqrt d$.** With $d$-dimensional vectors of random-ish entries, a dot product is a sum of $d$ terms, so its **variance** grows like $d$ (lesson 4.9) and its typical size like $\\sqrt d$. Huge scores make softmax nearly one-hot, with almost zero gradient. Dividing by $\\sqrt d$ keeps the scores' spread about 1 whatever the dimension.
3. **Softmax each row** (lesson 5.5): query $i$'s scores become **attention weights**, positive and adding to 1: how much to attend to each word.
4. **Weighted average of values.** Multiply by $V$: each output is $\\sum_j \\text{weight}_{ij}\\,\\mathbf v_j$, a mix of the values, mostly from the best-matching keys.

That's it: a soft, learnable look-up. Each word gathers information from the words most relevant to it. In a real Transformer, $Q$, $K$ and $V$ are each the input times a learned matrix (lesson 3.5), trained by backpropagation (5.8) with Adam (5.9) on cross-entropy (5.5). Every piece of that sentence is now something you can read.` },
        {
          code: {
            file: 'models.py', fn: 'attention', notes: [
              ['def attention(Q, K, V):', ['Queries, keys, values: lists of vectors.']],
              ['d = len(K[0])', ['The key dimension.']],
              ['out = []', ['One output per query.']],
              ['for q in Q:', ['Each query…']],
              ['scores = [dot(q, k) / math.sqrt(d) for k in K]', ['…scored against every key, scaled by $\\sqrt d$.'], { tex: 's_j = \\mathbf q^\\top\\mathbf k_j/\\sqrt d' }],
              ['weights = softmax(scores)', ['Scores into attention weights.'], { tex: '\\mathbf a = \\text{softmax}(\\mathbf s)' }],
              ['out.append([sum(w * v[j] for w, v in zip(weights, V)) for j in range(len(V[0]))])', ['The weighted average of the values, entry by entry.'], { tex: '\\sum_j a_j\\mathbf v_j' }],
              ['return out', ['$\\text{softmax}(QK^\\top/\\sqrt d)V$.']],
            ],
          },
        },
        { figure: 'AttentionFig', caption: 'Three keys with their values, and one query you steer. The bars are the attention weights; the output is the weighted mix of values.' },
        { python: { program: 'models', label: 'Run Part 5\'s equations in real Python' } },
        {
          code: {
            file: 'models.py', fn: 'show_models', notes: [
              ['def show_models():', ['What the Python tab runs.']],
              ['print("line by gradient descent:", fit_line(HOURS, SCORES), " exact:", exact_line(HOURS, SCORES))', ['Lesson 5.2.']],
              ['print("ridge with λ = 1:", ridge_line(HOURS, SCORES, 1.0))', ['Lesson 5.3.']],
              ['print("logistic regression:", fit_logistic(STUDY, PASSED))', ['Lesson 5.4.']],
              ['print("softmax of [2, 1, 0]:", softmax([2.0, 1.0, 0.0]))', ['Lesson 5.5.']],
              ['print("attention:", attention([[1.0, 0.0]], [[1.0, 0.0], [0.0, 1.0]], [[10.0, 0.0], [0.0, 10.0]]))', ['This lesson.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Query $(1, 0)$; keys $(1, 0)$ and $(0, 1)$; $d = 2$. What attention weight goes to the **first** key? (3 decimals)',
            answer: softmax([1 / Math.SQRT2, 0])[0], tolerance: 0.0006, compute: () => attention([[1, 0]], [[1, 0], [0, 1]], [[1, 0], [0, 1]])[0][0],
            explain: `Scores: $1/\\sqrt2 = 0.707$ and $0$. Softmax: $e^{0.707}/(e^{0.707} + 1) = ${f(softmax([1 / Math.SQRT2, 0])[0])}$.`,
          },
        },
        {
          choice: {
            prompt: 'Why divide the scores by $\\sqrt d$?',
            options: [
              { text: 'Dot products of $d$-dimensional vectors grow like $\\sqrt d$; without scaling, softmax saturates and its gradients vanish', why: 'Yes. Scaling keeps the scores\' spread around 1, so the softmax stays soft and trainable.' },
              { text: 'To make the weights add to 1', why: 'Softmax already does that.' },
              { text: 'To average over the dimensions', why: 'That would divide by $d$; it divides by $\\sqrt d$ because standard deviation grows like the square root.' },
            ],
            answer: 0,
          },
        },
        { note: 'Attention: scores $QK^\\top$ (dot products), scaled by $\\sqrt d$ (variance control), softmaxed into weights, used to average $V$. A Transformer is this, with learned $Q$, $K$, $V$, stacked many times.' },
      ],
    },
  ],
}

