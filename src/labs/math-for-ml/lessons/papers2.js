// Paper walkthroughs, second half: Deep Residual Learning, Attention Is All You Need, Proximal Policy
// Optimization, Denoising Diffusion Probabilistic Models and LoRA.
import {
  residualUnit, gradientNorm, transformerLrate, smoothedTarget, crossEntropyOf, gae, segmentAdvantage, tdErrors, adaptBeta,
  linearBetas, alphaBars, ddpmPosterior, lossWeight, priorKl, loraParamCount, loraTrain,
  PPO_R, PPO_V, LORA_TARGET, LORA_INPUTS,
} from '../engine/maths.js'
import { f } from './util.js'

const VOCAB = 37000
const floor = () => { const q = smoothedTarget(VOCAB, 0); return crossEntropyOf(q, q) }
const BETAS = linearBetas()

export const PAPERS2 = [
  {
    id: 'paper-resnet', title: 'Paper: Deep Residual Learning (He et al., 2015)',
    goal: 'Read the degradation argument and the residual block, separate what the paper claims about gradients from what it does not, and derive how gradient size grows through plain and residual stacks.',
    builds: ['backpropagation', 'initialisation', 'rnn-bptt', 'jacobian', 'sums-of-variables', 'induction', 'generalisation', 'jensen'],
    blocks: [
      { md: `**The paper.** Kaiming He, Xiangyu Zhang, Shaoqing Ren and Jian Sun, "Deep Residual Learning for Image Recognition", CVPR 2016 (arXiv:1512.03385, December 2015). Its 152-layer network won first place in the ILSVRC 2015 ImageNet classification task, and its residual connection is now in nearly every deep network, including the Transformer block of lesson [[#transformer-block]].

**The problem: degradation.** Stacking more layers onto a working network made it *worse*, and not from overfitting: the deeper network had higher **training** error. (Overfitting is low training error with high test error, lesson [[#generalisation]].) The paper's argument that this should not happen is a small proof by construction: take the shallower trained network, add layers that compute the identity, and you have a deeper network with exactly the same training error. So the best deeper network is at least as good. The solvers simply fail to find it.

**Eq. (1): the residual block.**
$$\\mathbf y = \\mathcal F(\\mathbf x, \\{W_i\\}) + \\mathbf x$$
Decode: $\\mathbf x$ is the block's input, $\\mathcal F$ the **residual** function its layers compute, here two layers $\\mathcal F = W_2\\sigma(W_1\\mathbf x)$ with $\\sigma$ = ReLU and biases left out "for simplifying notations". The $+\\mathbf x$ is the shortcut. The text adds a detail the equation hides: a second ReLU is applied *after* the addition, so the block outputs $\\sigma(\\mathbf y)$. **Eq. (2)** handles a change of size, $\\mathbf y = \\mathcal F(\\mathbf x) + W_s\\mathbf x$, with a projection $W_s$ used only where dimensions differ.

**The hypothesis.** "If an identity mapping were optimal, it would be easier to push the residual to zero than to fit an identity mapping by a stack of nonlinear layers." Check it on the block: with $W_2 = 0$, $\\mathcal F = \\mathbf 0$ and the block outputs $\\sigma(\\mathbf x) = \\mathbf x$ for the non-negative inputs that come out of a previous ReLU. All-zero weights give the identity, a point near where weight decay and small initialisations already push. A plain block must instead arrange $W_2\\sigma(W_1\\mathbf x) = \\mathbf x$ exactly.

**What the paper does not claim.** It is often said that residual connections fix vanishing gradients (lesson [[#rnn-bptt]]). This paper explicitly says the degradation is "unlikely to be caused by vanishing gradients": its plain networks use batch normalisation, and the authors "verify that the backward propagated gradients exhibit healthy norms". They conjecture instead that deep plain networks have "exponentially low convergence rates". The gradient argument came in a follow-up.

**The follow-up.** He, Zhang, Ren and Sun, "Identity Mappings in Deep Residual Networks", ECCV 2016 (arXiv:1603.05027). Drop the ReLU after the addition, so $\\mathbf x_{l+1} = \\mathbf x_l + \\mathcal F(\\mathbf x_l)$ (their eq. 3). Unroll it (their eq. 4):
$$\\mathbf x_L = \\mathbf x_l + \\sum_{i=l}^{L-1}\\mathcal F(\\mathbf x_i, \\mathcal W_i)$$
any deeper unit is any shallower unit plus a sum of residuals. Differentiate (their eq. 5):
$$\\frac{\\partial\\mathcal E}{\\partial\\mathbf x_l} = \\frac{\\partial\\mathcal E}{\\partial\\mathbf x_L}\\left(1 + \\frac{\\partial}{\\partial\\mathbf x_l}\\sum_{i=l}^{L-1}\\mathcal F(\\mathbf x_i, \\mathcal W_i)\\right)$$
Read the "1" with care: $\\mathbf x$ is a vector, so $\\partial\\mathbf x_L/\\partial\\mathbf x_l$ is a Jacobian matrix (lesson [[#jacobian]]) and the 1 is the identity matrix $I$. The gradient at the top reaches layer $l$ directly through $I$, whatever the weights. In a plain network, $\\mathbf x_L = W_{L-1}\\cdots W_l\\mathbf x_l$ (ignoring BN and ReLU), and the gradient must pass through every $W^\\top$.

**How big, on average? A derivation.** Take linear layers of width $n$ with independent weights of mean 0 and variance $s^2/n$ (lesson [[#initialisation]]). Backpropagation sends a gradient $\\mathbf g$ down through a plain layer as $W^\\top\\mathbf g$ and through a residual layer as $\\mathbf g + W^\\top\\mathbf g$. The layer's $W$ is independent of $\\mathbf g$, which depends only on the layers above. Then
$$\\mathbb E\\|W^\\top\\mathbf g\\|^2 = \\sum_j\\mathbb E\\Big(\\sum_iW_{ij}g_i\\Big)^2 = \\sum_j\\sum_i\\frac{s^2}{n}g_i^2 = s^2\\|\\mathbf g\\|^2$$
(the cross terms $\\mathbb E[W_{ij}W_{kj}]$ for $i \\ne k$ are 0, by independence and zero mean, lesson [[#sums-of-variables]]), and $\\mathbb E\\|\\mathbf g + W^\\top\\mathbf g\\|^2 = \\|\\mathbf g\\|^2 + 2\\,\\mathbb E[\\mathbf g^\\top W^\\top\\mathbf g] + s^2\\|\\mathbf g\\|^2 = (1 + s^2)\\|\\mathbf g\\|^2$, since $\\mathbb E[W] = 0$ kills the middle term. By induction over $L$ layers (lesson [[#induction]]):
$$\\text{plain: } \\mathbb E\\|\\mathbf g_0\\|^2 = s^{2L}\\|\\mathbf g_L\\|^2, \\qquad \\text{residual: } \\mathbb E\\|\\mathbf g_0\\|^2 = (1 + s^2)^L\\|\\mathbf g_L\\|^2$$
A plain stack is exponentially sensitive to $s$: it needs $s = 1$ exactly, which is what careful initialisation arranges. A residual stack with small weights stays near 1 at any depth. (With large weights it grows, which is why real residual branches are kept small.) The follow-up's section 3 makes the same point the other way round: scale the shortcut, $h(\\mathbf x) = \\lambda\\mathbf x$, and the direct path picks up a factor $\\prod\\lambda_i$, exponentially large or small. The shortcut must be a clean identity.` },
      { figure: 'ResNetGradFig', caption: 'The length of $\\partial E/\\partial\\mathbf x_0$ after a unit gradient passes down through linear layers of width 8, one random network per depth. Orange: plain ($\\mathbf x \\leftarrow W\\mathbf x$); violet: residual ($\\mathbf x \\leftarrow \\mathbf x + W\\mathbf x$). Dashed: $\\sqrt{\\mathbb E\\|\\mathbf g\\|^2}$ from the derivation. Values below $10^{-12}$ are off the bottom of the plot. Single runs sit below the dashed lines, increasingly with depth: the average of $\\|\\mathbf g\\|^2$ is pulled up by rare large runs, while a typical run is smaller (Jensen, lesson [[#jensen]]).' },
      { figure: 'EquationAnatomy', props: { ids: ['resnet'] }, caption: 'The follow-up\'s eq. (5), piece by piece.' },
      {
        code: {
          file: 'papers.py', fn: 'residual_unit', notes: [
            ['def residual_unit(x, W1, W2):', ['An input and the two layers\' weights (biases omitted, as in the paper).']],
            ['hidden = [max(0.0, h) for h in matvec(W1, x)]', ['$\\sigma(W_1\\mathbf x)$.']],
            ['return [max(0.0, f + a) for f, a in zip(matvec(W2, hidden), x)]', ['$\\mathcal F = W_2\\sigma(W_1\\mathbf x)$, plus the shortcut, then the second ReLU.'], { tex: '\\sigma(\\mathcal F(\\mathbf x) + \\mathbf x)' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'random_matrix', notes: [
            ['def random_matrix(n, scale, rng):', ['Size, spread and a random generator.']],
            ['return [[rng.gauss(0, scale / math.sqrt(n))', ['Entries with variance $s^2/n$: so $s = 1$ keeps a plain layer\'s output size steady (lesson [[#initialisation]]).']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'gradient_norm', notes: [
            ['def gradient_norm(depth, width, scale, residual, seed=0):', ['Depth, width, the weights\' scale, and plain or residual.']],
            ['rng = random.Random(seed)', ['Repeatable randomness.']],
            ['layers = [random_matrix(width, scale, rng) for _ in range(depth)]', ['One random matrix per layer.']],
            ['g = [1 / math.sqrt(width)] * width', ['A gradient of length 1 at the top.']],
            ['for W in reversed(layers):', ['Backpropagate from the top layer down.']],
            ['back = [sum(W[i][j] * g[i]', ['$W^\\top\\mathbf g$: through the layer\'s weights.']],
            ['g = [a + b for a, b in zip(g, back)] if residual else back', ['Residual: $\\mathbf g + W^\\top\\mathbf g$, the "1 +" of eq. (5). Plain: $W^\\top\\mathbf g$ only.']],
            ['return math.sqrt(sum(a * a for a in g))', ['The length that arrives at the bottom.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Through 30 plain layers with weight scale $s = 0.5$ (the figure\'s network with seed 0), how long is the gradient that arrives? (give log₁₀, 2 decimals)',
          answer: Math.log10(gradientNorm(30, 8, 0.5, false)), tolerance: 0.006, compute: () => Math.log10(gradientNorm(30, 8, 0.5, false)),
          explain: `$10^{${f(Math.log10(gradientNorm(30, 8, 0.5, false)))}}$: gone. The residual stack with the same weights delivers ${f(gradientNorm(30, 8, 0.5, true))}.`,
        },
      },
      {
        predict: {
          prompt: 'With $W_2 = 0$, what does the residual unit output for $\\mathbf x = (1, 0.5, 2)$? Give the sum of the outputs.',
          answer: residualUnit([1, 0.5, 2], [[0.2, -0.1, 0.4], [0.3, 0.5, -0.2]], [[0, 0], [0, 0], [0, 0]]).reduce((s, v) => s + v, 0),
          compute: () => residualUnit([1, 0.5, 2], [[0.2, -0.1, 0.4], [0.3, 0.5, -0.2]], [[0, 0], [0, 0], [0, 0]]).reduce((s, v) => s + v, 0),
          explain: 'The output is $(1, 0.5, 2)$ itself, summing to 3.5: with the residual weights at zero, the block is the identity, whatever $W_1$ is.',
        },
      },
      {
        choice: {
          prompt: 'The 56-layer plain network has higher *training* error than the 20-layer one. Why isn\'t that overfitting?',
          options: [
            { text: 'Overfitting means fitting the training data too well; here the deeper network fits it worse, so the optimiser is failing', why: 'Yes. More capacity can only lower the best achievable training error (the identity construction), so higher training error points at optimisation.' },
            { text: 'Because the test error is lower', why: 'Both training and test error were higher for the deeper plain network.' },
            { text: 'Because the networks use batch normalisation', why: 'BN is why the authors rule out vanishing gradients, not why it isn\'t overfitting.' },
          ],
          answer: 0,
        },
      },
      { note: 'Residual block: $\\mathbf y = \\mathcal F(\\mathbf x) + \\mathbf x$; zero residual weights give the identity. The original paper attributes the degradation of deep plain nets to optimisation, not vanishing gradients. The follow-up\'s $\\partial\\mathbf x_L/\\partial\\mathbf x_l = I + \\dots$ gives a direct gradient path; on average $\\|\\mathbf g\\|^2$ scales by $s^2$ per plain layer and $(1 + s^2)$ per residual layer.' },
    ],
  },

  {
    id: 'paper-transformer', title: 'Paper: Attention Is All You Need (Vaswani et al., 2017)',
    goal: 'Read the Transformer paper\'s equations with their shapes, count multi-head attention\'s parameters and Table 1\'s costs, derive where the learning-rate schedule peaks, and work out what label smoothing does to the loss.',
    builds: ['attention', 'transformer-block', 'big-o', 'entropy-kl', 'paper-adam', 'paper-resnet'],
    blocks: [
      { md: `**The paper.** Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser and Illia Polosukhin, "Attention Is All You Need", NeurIPS 2017 (arXiv:1706.03762). It introduced the Transformer for translation; every large language model descends from it. Lessons [[#attention]] and [[#transformer-block]] built the pieces. This lesson reads the paper's own equations and numbers.

**Conventions first.** The paper multiplies row vectors on the left: $xW$, where earlier lessons wrote $W\\mathbf x$ with column vectors. Each position's vector is a *row* of $Q$, $K$ or $V$. Neither convention is wrong; check which one a paper uses before checking shapes, since every matrix is transposed between the two.

**Eq. (1): scaled dot-product attention**, exactly lesson [[#attention]]'s formula:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\Big(\\frac{QK^T}{\\sqrt{d_k}}\\Big)V$$
Footnote 4 is the $\\sqrt{d_k}$ argument derived there: if $q$'s and $k$'s components are independent with mean 0 and variance 1, then $q \\cdot k$ has variance $d_k$.

**Multi-head attention, with shapes.** $\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O$, where $\\text{head}_i = \\text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$, with $W_i^Q, W_i^K \\in \\mathbb R^{d_{\\text{model}} \\times d_k}$, $W_i^V \\in \\mathbb R^{d_{\\text{model}} \\times d_v}$ and $W^O \\in \\mathbb R^{hd_v \\times d_{\\text{model}}}$. Check the shapes with $n$ positions: $Q$ is $n \\times d_{\\text{model}}$, so $QW_i^Q$ is $n \\times d_k$; each head outputs $n \\times d_v$; concatenating $h$ heads side by side gives $n \\times hd_v$; times $W^O$ gives $n \\times d_{\\text{model}}$ again. The paper uses $h = 8$ and $d_k = d_v = d_{\\text{model}}/h = 64$ with $d_{\\text{model}} = 512$.

**"The total computational cost is similar to that of single-head attention with full dimensionality."** Count the weights: each head has three $d_{\\text{model}} \\times d_k$ matrices, so $h \\cdot 3d_{\\text{model}}d_k = 3d_{\\text{model}}^2$ in all (since $hd_k = d_{\\text{model}}$), plus $W^O$'s $hd_v \\cdot d_{\\text{model}} = d_{\\text{model}}^2$. Total $4d_{\\text{model}}^2$, whatever $h$ is: splitting into heads is free.

**Eq. (2): the feed-forward network.** $\\text{FFN}(x) = \\max(0, xW_1 + b_1)W_2 + b_2$: a two-layer ReLU network (lesson [[#layers]]) applied to each position separately, with inner size $d_{ff} = 2048 = 4d_{\\text{model}}$.

**Two places to read carefully.** The original block is **post-norm**: each sub-layer's output is $\\text{LayerNorm}(x + \\text{Sublayer}(x))$, the residual of lesson [[#paper-resnet]] followed by normalisation. Lesson [[#transformer-block]] built the **pre-norm** form, $x + \\text{Sublayer}(\\text{LayerNorm}(x))$, which most later models use because it trains more stably when deep. Same pieces, different order. And the decoder masks attention to future positions "by setting to $-\\infty$" their scores before the softmax: $e^{-\\infty} = 0$, so they get exactly zero weight. (Code uses a large negative number.)

**Table 1: why attention.** Per layer, self-attention costs $O(n^2 \\cdot d)$ and a recurrent layer $O(n \\cdot d^2)$ (lesson [[#big-o]]). Count them: $QK^\\top$ is an $(n \\times d)$ times $(d \\times n)$ product, $n \\cdot n$ dot products of length $d$; a recurrent layer does $n$ steps, each a $d \\times d$ matrix times a vector. So attention is cheaper when $n < d$, "which is most often the case" for sentences, the paper says. Two more columns matter more. *Sequential operations:* attention's positions are all computed at once ($O(1)$ steps in sequence), while a recurrence must take $n$ steps one after another, which is slow on parallel hardware. *Maximum path length:* any two positions are one attention step apart, against up to $n$ recurrent steps, the long chains along which lesson [[#rnn-bptt]]'s gradients vanish.` },
      { md: `**Eq. (3): the learning-rate schedule.** Training used Adam with $\\beta_1 = 0.9$, $\\beta_2 = 0.98$, $\\epsilon = 10^{-9}$ (not the defaults of lesson [[#paper-adam]]) and a learning rate that changes every step:
$$lrate = d_{\\text{model}}^{-0.5}\\cdot\\min\\big(step\\_num^{-0.5},\\; step\\_num\\cdot warmup\\_steps^{-1.5}\\big)$$
The underscores are just long variable names. Read the $\\min$: two curves, and the rate follows whichever is lower. The second, $step\\_num \\cdot warmup\\_steps^{-1.5}$, is a straight line rising from 0. The first, $step\\_num^{-0.5}$, falls like $1/\\sqrt{step}$. They cross where $step^{-0.5} = step \\cdot warmup^{-1.5}$; multiply both sides by $step^{0.5}$: $1 = step^{1.5}warmup^{-1.5}$, so $step = warmup$. Before that the line is lower (warm-up); after it, the decaying curve. The peak is at $step = warmup\\_steps$, where
$$lrate_{\\max} = d_{\\text{model}}^{-0.5}\\cdot warmup\\_steps^{-0.5} = \\frac{1}{\\sqrt{d_{\\text{model}}\\cdot warmup\\_steps}}$$
With $d_{\\text{model}} = 512$ and $warmup\\_steps = 4000$: $1/\\sqrt{2{,}048{,}000} \\approx 7.0 \\times 10^{-4}$. The paper gives no reason for the warm-up. A common explanation, later studied (Liu et al., "On the Variance of the Adaptive Learning Rate and Beyond", 2020), is that Adam's $\\hat v_t$ is estimated from very few gradients in the first steps, so its steps are unreliable until the averages settle.

**Label smoothing, $\\epsilon_{ls} = 0.1$.** Instead of a one-hot target, train against $q = (1 - \\epsilon)\\,\\text{one-hot} + \\epsilon/K$ over $K$ classes: 0.9 of the probability on the correct token, the rest spread evenly. The paper: "This hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score." Work out why. The cross-entropy against $q$ splits as $H(q, p) = H(q) + D_{KL}(q \\| p) \\ge H(q)$ (lesson [[#entropy-kl]]), with equality only at $p = q$. So the best possible model puts exactly $1 - \\epsilon + \\epsilon/K$ on the correct token and never more. Perplexity is $e^{\\text{cross-entropy}}$ measured against the real one-hot targets, so even a model that is always right can score no better than $e^{-\\log(1 - \\epsilon + \\epsilon/K)} \\approx 1.11$ per token: it is "more unsure" by design. Accuracy only asks which token gets the *most* probability, and 0.9 is still the most, so nothing is lost there, while the softer target keeps the logits from growing without limit.

**Weight sharing.** Section 3.4 also shares one matrix between the two embedding layers and the output layer, and multiplies the embeddings by $\\sqrt{d_{\\text{model}}}$: details, but ones you need to reproduce the parameter count.` },
      { figure: 'TransformerScheduleFig', caption: 'Eq. (3) over 100,000 steps. The rate rises in a straight line, peaks exactly at $step = warmup\\_steps$, then falls as $1/\\sqrt{step}$. Changing $d_{\\text{model}}$ rescales the whole curve.' },
      { figure: 'EquationAnatomy', props: { ids: ['attention', 'multihead', 'lrate'] }, caption: 'Eq. (1), multi-head attention and eq. (3).' },
      {
        code: {
          file: 'papers.py', fn: 'transformer_lrate', notes: [
            ['def transformer_lrate(step, d_model=512, warmup=4000):', ['The step number and the paper\'s settings.']],
            ['return d_model ** -0.5 * min(step ** -0.5, step * warmup ** -1.5)', ['Eq. (3), as written.'], { tex: 'd^{-0.5}\\min(s^{-0.5}, s\\,w^{-1.5})' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'smoothed_target', notes: [
            ['def smoothed_target(k, correct, eps=0.1):', ['The number of classes, the correct one, and $\\epsilon_{ls}$.']],
            ['return [(1 - eps) * (1.0 if i == correct else 0.0) + eps / k for i in range(k)]', ['$(1 - \\epsilon)\\,\\text{one-hot} + \\epsilon/K$: the correct class gets $1 - \\epsilon + \\epsilon/K$, every other class $\\epsilon/K$.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'cross_entropy', notes: [
            ['def cross_entropy(target, probs):', ['A target distribution and the model\'s.']],
            ['return -sum(q * math.log(p) for q, p in zip(target, probs) if q > 0)', ['$H(q, p)$ (lesson [[#entropy-kl]]); classes with $q = 0$ contribute nothing.'], { tex: 'H(q, p) = -\\sum_k q_k\\log p_k' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the peak learning rate with $d_{\\text{model}} = 512$ and $warmup\\_steps = 4000$? (give it × 1000, 4 decimals)',
          answer: 1000 * transformerLrate(4000), tolerance: 0.00006, compute: () => 1000 * transformerLrate(4000),
          explain: `$1/\\sqrt{512 \\times 4000} = ${f(transformerLrate(4000))}$. By step 100,000 it has fallen to ${f(transformerLrate(100000))}, a fifth of the peak ($\\sqrt{4000/100000} = 0.2$).`,
        },
      },
      {
        predict: {
          prompt: 'With $\\epsilon_{ls} = 0.1$ over the paper\'s 37,000-token vocabulary, what is the smallest possible cross-entropy against the smoothed target, $H(q)$? (3 decimals, in nats)',
          answer: floor(), tolerance: 0.0005, compute: floor,
          explain: `${f(floor())} nats: the correct token contributes $-0.9\\log 0.9 \\approx 0.095$, and the 0.1 spread over 37,000 tokens contributes $0.1 \\times \\log(370{,}000) \\approx 1.28$. A model trained this way never drives its training loss below this.`,
        },
      },
      {
        choice: {
          prompt: 'Why does label smoothing hurt perplexity but not accuracy?',
          options: [
            { text: 'The best model gives the correct token only $1 - \\epsilon + \\epsilon/K$, which caps the probability perplexity measures, but that is still the largest probability, so the predicted token is unchanged', why: 'Yes. Perplexity depends on how much probability the right answer gets; accuracy only on which answer gets the most.' },
            { text: 'Smoothing changes which token the model predicts', why: 'The correct token keeps by far the largest share (0.9 against $\\epsilon/K$), so the argmax is unchanged.' },
            { text: 'Perplexity is measured on the smoothed targets', why: 'It is measured on the real (one-hot) targets, which is why the capped confidence costs perplexity.' },
          ],
          answer: 0,
        },
      },
      { note: 'Attention: $\\text{softmax}(QK^\\top/\\sqrt{d_k})V$, in row-vector convention. Multi-head attention has $4d_{\\text{model}}^2$ weights for any $h$. The original block is post-norm. Self-attention costs $O(n^2d)$ against $O(nd^2)$ but runs in $O(1)$ sequential steps with $O(1)$ path length. The schedule peaks at $step = warmup$ with $1/\\sqrt{d_{\\text{model}}\\,warmup}$. Label smoothing caps confidence at $1 - \\epsilon + \\epsilon/K$.' },
    ],
  },

  {
    id: 'paper-ppo', title: 'Paper: Proximal Policy Optimization (Schulman et al., 2017)',
    goal: 'Read PPO\'s objectives from the policy gradient to the combined loss, prove that the clipped objective is a lower bound, find and fix the exponent typo in its advantage formulas, and derive generalised advantage estimation.',
    builds: ['ppo', 'policy-gradient-derivation', 'bellman-rl', 'bias-variance', 'induction', 'information'],
    blocks: [
      { md: `**The paper.** John Schulman, Filip Wolski, Prafulla Dhariwal, Alec Radford and Oleg Klimov, "Proximal Policy Optimization Algorithms" (arXiv:1707.06347, 2017). It is the workhorse of deep reinforcement learning and was used to fine-tune language models from human feedback. Lesson [[#ppo]] read its clipped objective case by case; this lesson reads the whole paper.

**Eqs. (1)–(2).** $\\hat g = \\hat{\\mathbb E}_t\\big[\\nabla_\\theta\\log\\pi_\\theta(a_t \\mid s_t)\\hat A_t\\big]$ is the policy gradient of lesson [[#policy-gradient-derivation]] with an advantage estimate $\\hat A_t$ in place of the return. The hat on $\\hat{\\mathbb E}_t$ means an **empirical** average over a finite batch of timesteps, not a true expectation. Eq. (2), $L^{PG}(\\theta) = \\hat{\\mathbb E}_t[\\log\\pi_\\theta(a_t \\mid s_t)\\hat A_t]$, is a loss written so that automatic differentiation of it produces $\\hat g$. The paper warns that taking many steps on $L^{PG}$ with the same data leads to "destructively large policy updates".

**Eqs. (3)–(6): from TRPO to a ratio.** TRPO maximises $\\hat{\\mathbb E}_t[\\frac{\\pi_\\theta(a_t \\mid s_t)}{\\pi_{\\theta_{\\text{old}}}(a_t \\mid s_t)}\\hat A_t]$ subject to an average KL divergence (lesson [[#entropy-kl]]) of at most $\\delta$. Write the **probability ratio** $r_t(\\theta) = \\pi_\\theta(a_t \\mid s_t)/\\pi_{\\theta_{\\text{old}}}(a_t \\mid s_t)$, so $r_t(\\theta_{\\text{old}}) = 1$, and $L^{CPI}(\\theta) = \\hat{\\mathbb E}_t[r_t(\\theta)\\hat A_t]$ (eq. 6; CPI for "conservative policy iteration", the paper that proposed it).

**Eq. (7): the clipped objective.** $L^{CLIP}(\\theta) = \\hat{\\mathbb E}_t\\big[\\min\\big(r_t\\hat A_t,\\; \\text{clip}(r_t, 1 - \\epsilon, 1 + \\epsilon)\\hat A_t\\big)\\big]$ with $\\epsilon = 0.2$. Two claims the paper makes in words, now proved:
- *"A lower bound (i.e., a pessimistic bound) on the unclipped objective":* $\\min(a, b) \\le a$, so each term is at most $r_t\\hat A_t$, and averaging keeps the inequality: $L^{CLIP} \\le L^{CPI}$.
- *"$L^{CLIP}(\\theta) = L^{CPI}(\\theta)$ to first order around $\\theta_{\\text{old}}$":* near $r = 1$, which is strictly inside $[1 - \\epsilon, 1 + \\epsilon]$, the clip does nothing, so both terms equal $r_t\\hat A_t$ in a whole neighbourhood. Same value and same gradient at $\\theta_{\\text{old}}$: they agree to first order (in fact exactly, until some $r_t$ leaves the interval).

**Section 4: the adaptive KL penalty.** The alternative objective $L^{KLPEN} = \\hat{\\mathbb E}_t[r_t\\hat A_t - \\beta\\,\\text{KL}[\\pi_{\\theta_{\\text{old}}}, \\pi_\\theta]]$ (eq. 8) adjusts $\\beta$ after each update from the measured KL $d$: if $d < d_{\\text{targ}}/1.5$, halve $\\beta$; if $d > 1.5\\,d_{\\text{targ}}$, double it. The paper reports that this did worse than clipping and keeps it as a baseline.

**Eq. (9): the combined objective.** With a network shared between policy and value function:
$$L_t^{CLIP+VF+S}(\\theta) = \\hat{\\mathbb E}_t\\big[L_t^{CLIP}(\\theta) - c_1L_t^{VF}(\\theta) + c_2S[\\pi_\\theta](s_t)\\big]$$
It is *maximised*, so the value loss $L^{VF} = (V_\\theta(s_t) - V_t^{\\text{targ}})^2$ enters with a minus sign, and the **entropy bonus** $S$ (lesson [[#information]]) with a plus, rewarding policies that keep exploring. (In the paper's MuJoCo experiments the networks are separate, so $c_1$ is irrelevant, and there is no entropy bonus.)` },
      { md: `**Eqs. (10)–(12): advantage estimates over a segment.** Each actor runs $T$ steps (much shorter than an episode), and the advantage at step $t$ must use only those steps. With the **TD error** $\\delta_t = r_t + \\gamma V(s_{t+1}) - V(s_t)$ (eq. 12; the bootstrapped one-step error of lesson [[#bellman-rl]]), the paper writes
$$\\hat A_t = -V(s_t) + r_t + \\gamma r_{t+1} + \\cdots + \\gamma^{T-t+1}r_{T-1} + \\gamma^{T-t}V(s_T) \\quad\\text{(10)}$$
$$\\hat A_t = \\delta_t + (\\gamma\\lambda)\\delta_{t+1} + \\cdots + (\\gamma\\lambda)^{T-t+1}\\delta_{T-1} \\quad\\text{(11)}$$
**Check the exponents.** In (10), $r_{t+k}$ is $k$ steps after $r_t$ and carries $\\gamma^k$. So $r_{T-1}$, which is $T - 1 - t$ steps after $r_t$, needs $\\gamma^{T-t-1}$, not $\\gamma^{T-t+1}$. The very next term confirms it: $V(s_T)$ is one step later still, with $\\gamma^{T-t}$. Exponents must go up by one per step, and $T - t + 1$ followed by $T - t$ goes *down*. The same holds for (11): the last term is $(\\gamma\\lambda)^{T-t-1}\\delta_{T-1}$. The printed $+1$ is a typo for $-1$ (and the doubled "$\\cdots + \\cdots$" in (11) is a typesetting slip). Every widely used implementation computes the corrected version. This is the most useful reading habit there is: count the steps and check the indices.

**What GAE is, proved.** Write (11) correctly as $\\hat A_t = \\sum_{k=0}^{T-t-1}(\\gamma\\lambda)^k\\delta_{t+k}$.
- *$\\lambda = 0$:* only $k = 0$ survives (as $0^0 = 1$): $\\hat A_t = \\delta_t$, the one-step estimate. It leans entirely on $V$: low variance, but biased wherever $V$ is wrong.
- *$\\lambda = 1$ gives (10).* Expand $\\sum_k\\gamma^k\\delta_{t+k} = \\sum_k\\gamma^kr_{t+k} + \\sum_k\\gamma^{k+1}V(s_{t+k+1}) - \\sum_k\\gamma^kV(s_{t+k})$. In the last two sums each $\\gamma^jV(s_{t+j})$ for $1 \\le j \\le T - t - 1$ appears once with $+$ and once with $-$, so they cancel (the sum **telescopes**), leaving $-V(s_t) + \\gamma^{T-t}V(s_T)$. That is exactly (10): the real rewards to the end of the segment, plus a guess for what comes after. Unbiased if that last guess is, but noisy.
- *In between,* $\\lambda$ trades bias against variance (lesson [[#bias-variance]]); the paper uses $\\gamma = 0.99$, $\\lambda = 0.95$.
- *Computing it:* splitting off the $k = 0$ term gives $\\hat A_t = \\delta_t + \\gamma\\lambda\\hat A_{t+1}$, with $\\hat A_T = 0$. One backward pass computes every advantage in $O(T)$ time, instead of a separate sum for each $t$. (By induction from $t = T - 1$ down, the recursion and the sum agree, lesson [[#induction]].)

**Algorithm 1.** For each iteration, each of $N$ actors runs $\\pi_{\\theta_{\\text{old}}}$ for $T$ steps and computes $\\hat A_1, \\dots, \\hat A_T$; then the surrogate is optimised for $K$ epochs with minibatches of size $M \\le NT$; then $\\theta_{\\text{old}} \\leftarrow \\theta$. Reusing each batch for several epochs is exactly what plain $L^{PG}$ couldn't do safely and what the clip allows.` },
      { figure: 'GAEFig', caption: 'A six-step segment with rewards $(0, 0, 1, 0, 0, 2)$ and value estimates $(0.5, 0.6, 0.9, 0.4, 0.7, 1.5)$, bootstrapping from $V(s_6) = 0.8$, $\\gamma = 0.99$. At $\\lambda = 0$ each advantage is its own TD error; at $\\lambda = 1$ it is eq. (10).' },
      { figure: 'EquationAnatomy', props: { ids: ['gae'] }, caption: 'Eq. (11), corrected, piece by piece.' },
      {
        code: {
          file: 'papers.py', fn: 'td_errors', notes: [
            ['def td_errors(rewards, values, gamma):', ['$T$ rewards and $T + 1$ values: the last is $V(s_T)$.']],
            ['return [r + gamma * values[t + 1] - values[t]', ['Eq. (12) at every step.'], { tex: '\\delta_t = r_t + \\gamma V(s_{t+1}) - V(s_t)' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'gae', notes: [
            ['def gae(rewards, values, gamma=0.99, lam=0.95):', ['The segment and the paper\'s $\\gamma$, $\\lambda$.']],
            ['deltas = td_errors(rewards, values, gamma)', ['Every $\\delta_t$.']],
            ['advantages = [0.0] * len(deltas)', ['Room for every $\\hat A_t$.']],
            ['running = 0.0', ['$\\hat A_T = 0$: nothing after the segment.']],
            ['for t in reversed(range(len(deltas))):', ['From the last step back to the first.']],
            ['running = deltas[t] + gamma * lam * running', ['The recursion.'], { tex: '\\hat A_t = \\delta_t + \\gamma\\lambda\\hat A_{t+1}' }],
            ['advantages[t] = running', ['Store it.']],
            ['return advantages', ['All $T$ advantages in one pass.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'gae_sum', notes: [
            ['def gae_sum(rewards, values, gamma, lam, t):', ['One advantage, straight from eq. (11).']],
            ['deltas = td_errors(rewards, values, gamma)', ['Every $\\delta$.']],
            ['return sum((gamma * lam) ** k * deltas[t + k] for k in range(len(deltas) - t))', ['$k$ runs from 0 to $T - t - 1$: the corrected exponents.'], { tex: '\\sum_{k=0}^{T-t-1}(\\gamma\\lambda)^k\\delta_{t+k}' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'segment_advantage', notes: [
            ['def segment_advantage(rewards, values, gamma, t):', ['Eq. (10), the $\\lambda = 1$ case.']],
            ['T = len(rewards)', ['The segment length.']],
            ['return -values[t] + sum(gamma ** k * rewards[t + k] for k in range(T - t)) + gamma ** (T - t) * values[T]', ['Minus the baseline, the discounted rewards to the end ($\\gamma^{T-t-1}$ on the last one), and the bootstrap $\\gamma^{T-t}V(s_T)$.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'adapt_beta', notes: [
            ['def adapt_beta(beta, d, d_targ):', ['The current penalty, the measured KL and the target.']],
            ['if d < d_targ / 1.5:', ['The policy moved too little…']],
            ['return beta / 2', ['…so penalise moving less.']],
            ['if d > d_targ * 1.5:', ['It moved too much…']],
            ['return beta * 2', ['…so penalise it more.']],
            ['return beta', ['Close enough: keep $\\beta$.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'For the figure\'s segment with $\\gamma = 0.99$ and $\\lambda = 0.95$, what is $\\hat A_0$? (4 decimals)',
          answer: gae(PPO_R, PPO_V, 0.99, 0.95)[0], tolerance: 0.00006, compute: () => gae(PPO_R, PPO_V, 0.99, 0.95)[0],
          explain: `${f(gae(PPO_R, PPO_V, 0.99, 0.95)[0])}. With $\\lambda = 0$ it would be $\\delta_0 = ${f(tdErrors(PPO_R, PPO_V, 0.99)[0])}$; with $\\lambda = 1$, eq. (10)'s ${f(segmentAdvantage(PPO_R, PPO_V, 0.99, 0))}.`,
        },
      },
      {
        predict: {
          prompt: 'And with $\\lambda = 1$, computed by the backward recursion? (4 decimals)',
          answer: gae(PPO_R, PPO_V, 0.99, 1)[0], tolerance: 0.00006, compute: () => gae(PPO_R, PPO_V, 0.99, 1)[0],
          explain: `${f(gae(PPO_R, PPO_V, 0.99, 1)[0])}, equal to eq. (10) computed directly (${f(segmentAdvantage(PPO_R, PPO_V, 0.99, 0))}): the telescoping proof, in numbers. Using the misprinted exponent $\\gamma^{T-t+1}$ on $r_5$ would give ${f(segmentAdvantage(PPO_R, PPO_V, 0.99, 0) - 0.99 ** 5 * 2 + 0.99 ** 7 * 2)} instead.`,
        },
      },
      {
        choice: {
          prompt: 'The target KL is 0.01 and an update measured $d = 0.02$. What does section 4\'s rule do to $\\beta = 1$?',
          options: [
            { text: 'Doubles it to 2', why: `Yes: $0.02 > 1.5 \\times 0.01$. (adapt_beta gives ${adaptBeta(1, 0.02, 0.01)}.)` },
            { text: 'Halves it to 0.5', why: 'Halving happens when the policy moved too little: $d < d_{\\text{targ}}/1.5$.' },
            { text: 'Leaves it at 1', why: '$0.02$ is outside the band $[0.0067, 0.015]$, so it changes.' },
          ],
          answer: 0,
        },
      },
      { note: 'PPO: $\\hat{\\mathbb E}_t$ is a batch average; $r_t = \\pi_\\theta/\\pi_{\\text{old}}$; $L^{CLIP} \\le L^{CPI}$ with equality near $r = 1$; the combined objective subtracts the value loss and adds an entropy bonus. In eqs. (10)–(11) the last exponents should be $T - t - 1$. GAE: $\\hat A_t = \\sum_k(\\gamma\\lambda)^k\\delta_{t+k} = \\delta_t + \\gamma\\lambda\\hat A_{t+1}$, which is $\\delta_t$ at $\\lambda = 0$ and, by telescoping, the segment return minus $V(s_t)$ at $\\lambda = 1$.' },
    ],
  },

  {
    id: 'paper-ddpm', title: 'Paper: Denoising Diffusion Probabilistic Models (Ho et al., 2020)',
    goal: 'Derive DDPM\'s loss from the variational bound, step by step: split the bound into KL terms, compute the forward posterior by completing the square, rewrite its mean with the noise, and show the noise-prediction loss is the bound with its weights changed.',
    builds: ['diffusion', 'paper-vae', 'vae-elbo', 'bayes', 'conditional', 'markov-chains', 'normal', 'entropy-kl'],
    blocks: [
      { md: `**The paper.** Jonathan Ho, Ajay Jain and Pieter Abbeel, "Denoising Diffusion Probabilistic Models", NeurIPS 2020 (arXiv:2006.11239). It made diffusion models competitive with GANs for images, and image generators since descend from it. Lesson [[#diffusion]] derived the forward process's closed form and read the training loss, but took on trust that the loss is a reweighted form of the variational bound. This lesson proves it.

**Notation.** $\\mathbf x_{0:T}$ means the whole sequence $\\mathbf x_0, \\mathbf x_1, \\dots, \\mathbf x_T$. $\\mathcal N(\\mathbf x; \\boldsymbol\\mu, \\Sigma)$ is the normal density *evaluated at* $\\mathbf x$ (the variable comes first, before the semicolon). $:=$ means "is defined as". $q$ is the fixed forward (noising) process; $p_\\theta$ is the learned reverse (denoising) process.

**Eqs. (1)–(2): the two chains.** Reverse: $p_\\theta(\\mathbf x_{0:T}) = p(\\mathbf x_T)\\prod_{t=1}^Tp_\\theta(\\mathbf x_{t-1} \\mid \\mathbf x_t)$, starting from $p(\\mathbf x_T) = \\mathcal N(\\mathbf 0, I)$, each step Gaussian with learned mean $\\boldsymbol\\mu_\\theta(\\mathbf x_t, t)$. Forward: $q(\\mathbf x_{1:T} \\mid \\mathbf x_0) = \\prod_{t=1}^Tq(\\mathbf x_t \\mid \\mathbf x_{t-1})$ with $q(\\mathbf x_t \\mid \\mathbf x_{t-1}) = \\mathcal N(\\mathbf x_t; \\sqrt{1 - \\beta_t}\\,\\mathbf x_{t-1}, \\beta_tI)$. Both are Markov chains (lesson [[#markov-chains]]): each step depends only on the one before.

**Eq. (3): the bound.** This is a latent-variable model with latents $\\mathbf x_{1:T}$, so the ELBO of lesson [[#vae-elbo]] applies, with the fixed $q$ playing the encoder:
$$\\mathbb E[-\\log p_\\theta(\\mathbf x_0)] \\le \\mathbb E_q\\Big[-\\log\\frac{p_\\theta(\\mathbf x_{0:T})}{q(\\mathbf x_{1:T} \\mid \\mathbf x_0)}\\Big] = \\mathbb E_q\\Big[-\\log p(\\mathbf x_T) - \\sum_{t \\ge 1}\\log\\frac{p_\\theta(\\mathbf x_{t-1} \\mid \\mathbf x_t)}{q(\\mathbf x_t \\mid \\mathbf x_{t-1})}\\Big] =: L$$
The second form just writes both products out; the log of a product is a sum of logs. **Eq. (4)**, with $\\alpha_t = 1 - \\beta_t$ and $\\bar\\alpha_t = \\prod_{s \\le t}\\alpha_s$, is lesson [[#diffusion]]'s closed form $q(\\mathbf x_t \\mid \\mathbf x_0) = \\mathcal N(\\sqrt{\\bar\\alpha_t}\\mathbf x_0, (1 - \\bar\\alpha_t)I)$.

**Eq. (5): the bound as KL divergences** (the paper's appendix A, eqs. 17–22, credited to Sohl-Dickstein et al. 2015). Four steps.

*Step 1.* Split off the $t = 1$ term: $-\\log\\frac{p_\\theta(\\mathbf x_0 \\mid \\mathbf x_1)}{q(\\mathbf x_1 \\mid \\mathbf x_0)}$.

*Step 2.* For $t > 1$, turn each forward step around with Bayes' rule (lesson [[#bayes]]), everything conditioned on $\\mathbf x_0$. Because the chain is Markov, knowing $\\mathbf x_0$ as well as $\\mathbf x_{t-1}$ tells nothing more about $\\mathbf x_t$, so $q(\\mathbf x_t \\mid \\mathbf x_{t-1}) = q(\\mathbf x_t \\mid \\mathbf x_{t-1}, \\mathbf x_0)$, and Bayes gives
$$q(\\mathbf x_t \\mid \\mathbf x_{t-1}) = \\frac{q(\\mathbf x_{t-1} \\mid \\mathbf x_t, \\mathbf x_0)\\,q(\\mathbf x_t \\mid \\mathbf x_0)}{q(\\mathbf x_{t-1} \\mid \\mathbf x_0)}$$
Why condition on $\\mathbf x_0$? Without it, the reversed step $q(\\mathbf x_{t-1} \\mid \\mathbf x_t)$ would depend on the unknown data distribution. With it, it is a Gaussian we can write down (eq. 7, below).

*Step 3.* Substitute. Each $t > 1$ term becomes $-\\log\\frac{p_\\theta(\\mathbf x_{t-1} \\mid \\mathbf x_t)}{q(\\mathbf x_{t-1} \\mid \\mathbf x_t, \\mathbf x_0)} - \\log\\frac{q(\\mathbf x_{t-1} \\mid \\mathbf x_0)}{q(\\mathbf x_t \\mid \\mathbf x_0)}$. The second pieces **telescope**: summed over $t = 2, \\dots, T$ they give $-\\log\\frac{q(\\mathbf x_1 \\mid \\mathbf x_0)}{q(\\mathbf x_T \\mid \\mathbf x_0)}$, since every middle factor appears once on top and once below. The $\\log q(\\mathbf x_1 \\mid \\mathbf x_0)$ that remains cancels the one from step 1, and the $\\log q(\\mathbf x_T \\mid \\mathbf x_0)$ joins $-\\log p(\\mathbf x_T)$ (appendix eq. 21):
$$L = \\mathbb E_q\\Big[-\\log\\frac{p(\\mathbf x_T)}{q(\\mathbf x_T \\mid \\mathbf x_0)} - \\sum_{t > 1}\\log\\frac{p_\\theta(\\mathbf x_{t-1} \\mid \\mathbf x_t)}{q(\\mathbf x_{t-1} \\mid \\mathbf x_t, \\mathbf x_0)} - \\log p_\\theta(\\mathbf x_0 \\mid \\mathbf x_1)\\Big]$$
*Step 4.* An expected log-ratio $\\mathbb E_q[\\log\\frac{q}{p}]$ is a KL divergence (lesson [[#entropy-kl]]). Averaging over $\\mathbf x_{t-1}$ first, with $\\mathbf x_t$ and $\\mathbf x_0$ held fixed, turns each middle term into $D_{KL}(q(\\mathbf x_{t-1} \\mid \\mathbf x_t, \\mathbf x_0) \\| p_\\theta(\\mathbf x_{t-1} \\mid \\mathbf x_t))$. So
$$L = \\mathbb E_q\\Big[\\underbrace{D_{KL}(q(\\mathbf x_T \\mid \\mathbf x_0) \\| p(\\mathbf x_T))}_{L_T} + \\sum_{t > 1}\\underbrace{D_{KL}(q(\\mathbf x_{t-1} \\mid \\mathbf x_t, \\mathbf x_0) \\| p_\\theta(\\mathbf x_{t-1} \\mid \\mathbf x_t))}_{L_{t-1}}\\underbrace{-\\log p_\\theta(\\mathbf x_0 \\mid \\mathbf x_1)}_{L_0}\\Big]$$
Each $L_{t-1}$ compares two Gaussians, so it has a closed form: no noisy sampling of the whole chain.` },
      { md: `**Eqs. (6)–(7): the forward posterior, by completing the square.** Each coordinate behaves the same way (the covariances are multiples of $I$), so work with one number. By Bayes, $q(x_{t-1} \\mid x_t, x_0) \\propto q(x_t \\mid x_{t-1})\\,q(x_{t-1} \\mid x_0)$ as a function of $x_{t-1}$.
- The first factor: $\\exp\\big(-\\frac{(x_t - \\sqrt{\\alpha_t}x_{t-1})^2}{2\\beta_t}\\big) = \\exp\\big(-\\frac{\\alpha_t}{2\\beta_t}(x_{t-1} - x_t/\\sqrt{\\alpha_t})^2\\big)$: a bump in $x_{t-1}$ with **precision** (1 / variance) $a = \\alpha_t/\\beta_t$, centred at $x_t/\\sqrt{\\alpha_t}$.
- The second: by eq. (4), a bump with precision $b = 1/(1 - \\bar\\alpha_{t-1})$, centred at $\\sqrt{\\bar\\alpha_{t-1}}x_0$.

**Lemma.** $e^{-\\frac a2(u - m_1)^2}e^{-\\frac b2(u - m_2)^2} \\propto e^{-\\frac{a+b}2(u - m)^2}$ with $m = \\frac{am_1 + bm_2}{a + b}$. *Proof:* the exponent is $-\\frac12[(a + b)u^2 - 2(am_1 + bm_2)u] + \\text{const} = -\\frac{a+b}2(u - m)^2 + \\text{const}$, by completing the square. **Precisions add; the mean is the precision-weighted average.**

So the posterior is normal with precision $a + b = \\frac{\\alpha_t(1 - \\bar\\alpha_{t-1}) + \\beta_t}{\\beta_t(1 - \\bar\\alpha_{t-1})}$. The top simplifies: $\\alpha_t - \\alpha_t\\bar\\alpha_{t-1} + 1 - \\alpha_t = 1 - \\bar\\alpha_t$, using $\\alpha_t\\bar\\alpha_{t-1} = \\bar\\alpha_t$. So the variance is
$$\\tilde\\beta_t = \\frac{1 - \\bar\\alpha_{t-1}}{1 - \\bar\\alpha_t}\\beta_t$$
and the mean is $\\tilde\\beta_t\\big(\\frac{\\alpha_t}{\\beta_t}\\cdot\\frac{x_t}{\\sqrt{\\alpha_t}} + \\frac{\\sqrt{\\bar\\alpha_{t-1}}x_0}{1 - \\bar\\alpha_{t-1}}\\big)$, which multiplies out to eq. (7):
$$\\tilde{\\boldsymbol\\mu}_t(\\mathbf x_t, \\mathbf x_0) = \\frac{\\sqrt{\\bar\\alpha_{t-1}}\\beta_t}{1 - \\bar\\alpha_t}\\mathbf x_0 + \\frac{\\sqrt{\\alpha_t}(1 - \\bar\\alpha_{t-1})}{1 - \\bar\\alpha_t}\\mathbf x_t$$

**Eq. (8): KL between Gaussians.** For one coordinate, $D_{KL}(\\mathcal N(m_1, v_1) \\| \\mathcal N(m_2, v_2))$: average $\\log q - \\log p$ under $q$. $\\mathbb E_q[\\log q] = -\\frac12\\log(2\\pi v_1) - \\frac12$, and $\\mathbb E_q[\\log p] = -\\frac12\\log(2\\pi v_2) - \\frac{v_1 + (m_1 - m_2)^2}{2v_2}$ (because $\\mathbb E_q[(x - m_2)^2] = v_1 + (m_1 - m_2)^2$). Subtract:
$$D_{KL} = \\frac12\\log\\frac{v_2}{v_1} + \\frac{v_1 + (m_1 - m_2)^2}{2v_2} - \\frac12$$
With $p_\\theta$'s variance fixed at $\\sigma_t^2$ (section 3.2 tries $\\sigma_t^2 = \\beta_t$ and $\\sigma_t^2 = \\tilde\\beta_t$), only the mean depends on $\\theta$: $L_{t-1} = \\mathbb E_q\\big[\\frac1{2\\sigma_t^2}\\|\\tilde{\\boldsymbol\\mu}_t(\\mathbf x_t, \\mathbf x_0) - \\boldsymbol\\mu_\\theta(\\mathbf x_t, t)\\|^2\\big] + C$. That is eq. (8).

**Eqs. (9)–(10): rewrite the target with the noise.** Eq. (4) says $\\mathbf x_t = \\sqrt{\\bar\\alpha_t}\\mathbf x_0 + \\sqrt{1 - \\bar\\alpha_t}\\boldsymbol\\epsilon$, so $\\mathbf x_0 = (\\mathbf x_t - \\sqrt{1 - \\bar\\alpha_t}\\boldsymbol\\epsilon)/\\sqrt{\\bar\\alpha_t}$. Substitute into $\\tilde{\\boldsymbol\\mu}_t$, using $\\sqrt{\\bar\\alpha_{t-1}}/\\sqrt{\\bar\\alpha_t} = 1/\\sqrt{\\alpha_t}$:
- the coefficient of $\\mathbf x_t$ is $\\frac{\\beta_t}{(1 - \\bar\\alpha_t)\\sqrt{\\alpha_t}} + \\frac{\\sqrt{\\alpha_t}(1 - \\bar\\alpha_{t-1})}{1 - \\bar\\alpha_t} = \\frac{\\beta_t + \\alpha_t - \\bar\\alpha_t}{(1 - \\bar\\alpha_t)\\sqrt{\\alpha_t}} = \\frac{1}{\\sqrt{\\alpha_t}}$ (as $\\beta_t + \\alpha_t = 1$);
- the coefficient of $\\boldsymbol\\epsilon$ is $-\\frac{\\beta_t\\sqrt{1 - \\bar\\alpha_t}}{(1 - \\bar\\alpha_t)\\sqrt{\\alpha_t}} = -\\frac{\\beta_t}{\\sqrt{\\alpha_t}\\sqrt{1 - \\bar\\alpha_t}}$.
$$\\tilde{\\boldsymbol\\mu}_t = \\frac{1}{\\sqrt{\\alpha_t}}\\Big(\\mathbf x_t - \\frac{\\beta_t}{\\sqrt{1 - \\bar\\alpha_t}}\\boldsymbol\\epsilon\\Big)$$
**Eq. (11)** then *chooses* the model's form to match: $\\boldsymbol\\mu_\\theta(\\mathbf x_t, t) = \\frac{1}{\\sqrt{\\alpha_t}}\\big(\\mathbf x_t - \\frac{\\beta_t}{\\sqrt{1 - \\bar\\alpha_t}}\\boldsymbol\\epsilon_\\theta(\\mathbf x_t, t)\\big)$, a network $\\boldsymbol\\epsilon_\\theta$ that predicts the noise. The difference of means is then $\\frac{\\beta_t}{\\sqrt{\\alpha_t}\\sqrt{1 - \\bar\\alpha_t}}(\\boldsymbol\\epsilon_\\theta - \\boldsymbol\\epsilon)$, and squaring gives **eq. (12)**:
$$L_{t-1} - C = \\mathbb E_{\\mathbf x_0, \\boldsymbol\\epsilon}\\Big[\\frac{\\beta_t^2}{2\\sigma_t^2\\alpha_t(1 - \\bar\\alpha_t)}\\big\\|\\boldsymbol\\epsilon - \\boldsymbol\\epsilon_\\theta(\\sqrt{\\bar\\alpha_t}\\mathbf x_0 + \\sqrt{1 - \\bar\\alpha_t}\\boldsymbol\\epsilon, t)\\big\\|^2\\Big]$$

**Eq. (14): the simplified loss.** $L_{\\text{simple}} = \\mathbb E_{t, \\mathbf x_0, \\boldsymbol\\epsilon}\\big[\\|\\boldsymbol\\epsilon - \\boldsymbol\\epsilon_\\theta(\\sqrt{\\bar\\alpha_t}\\mathbf x_0 + \\sqrt{1 - \\bar\\alpha_t}\\boldsymbol\\epsilon, t)\\|^2\\big]$ with $t$ uniform on $1, \\dots, T$. **Now the claim is proved**: for $t > 1$, every term of the bound is $\\|\\boldsymbol\\epsilon - \\boldsymbol\\epsilon_\\theta\\|^2$ times the weight $\\frac{\\beta_t^2}{2\\sigma_t^2\\alpha_t(1 - \\bar\\alpha_t)}$ plus a constant, and $L_{\\text{simple}}$ keeps the terms and sets every weight to 1. The remaining pieces, as the paper states: $L_T$ has no parameters (the $\\beta_t$ are fixed), so it drops out; and the $t = 1$ term corresponds to $L_0$ with the paper's discrete decoder (eq. 13) approximated by the Gaussian density times the bin width. The figure shows what the reweighting does: with the paper's schedule the true weights are largest at small $t$, so $L_{\\text{simple}}$ *down-weights* the easy, nearly noise-free steps, which, the paper reports, improves sample quality.

**Section 4's settings.** $T = 1000$, $\\beta_t$ rising linearly from $10^{-4}$ to $0.02$, chosen so that $L_T \\approx 0$: the paper reports about $10^{-5}$ bits per dimension.` },
      { figure: 'DDPMWeightFig', caption: 'The weight eq. (12) puts on $\\|\\boldsymbol\\epsilon - \\boldsymbol\\epsilon_\\theta\\|^2$ at each step $t$, for the paper\'s linear schedule, on a log scale. $L_{\\text{simple}}$ uses weight 1 everywhere (orange). The true bound weights the first steps far more than the middle ones.' },
      { figure: 'EquationAnatomy', props: { ids: ['ddpm'] }, caption: 'Eq. (12), piece by piece.' },
      {
        code: {
          file: 'papers.py', fn: 'linear_betas', notes: [
            ['def linear_betas(T=1000, first=1e-4, last=0.02):', ['The paper\'s schedule.']],
            ['return [first + (last - first) * i / (T - 1) for i in range(T)]', ['Equal steps from $\\beta_1 = 10^{-4}$ to $\\beta_T = 0.02$; the list is indexed from 0, so $\\beta_t$ is betas[t − 1].']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'alpha_bars', notes: [
            ['def alpha_bars(betas):', ['The schedule.']],
            ['out, prod = [], 1.0', ['The results, and the running product.']],
            ['for b in betas:', ['Each $\\beta_t$ in turn.']],
            ['prod *= 1 - b', ['Multiply in $\\alpha_t = 1 - \\beta_t$.']],
            ['out.append(prod)', ['$\\bar\\alpha_t$.']],
            ['return out', ['Every $\\bar\\alpha_t$.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'posterior', notes: [
            ['def posterior(x0, xt, t, betas):', ['Clean and noisy values, and the step.']],
            ['ab = alpha_bars(betas)', ['All the $\\bar\\alpha$.']],
            ['beta, ab_t, ab_prev = betas[t - 1], ab[t - 1], ab[t - 2]', ['$\\beta_t$, $\\bar\\alpha_t$ and $\\bar\\alpha_{t-1}$.']],
            ['mean = math.sqrt(ab_prev) * beta', ['Eq. (7)\'s mean.'], { tex: '\\tilde\\mu_t = \\frac{\\sqrt{\\bar\\alpha_{t-1}}\\beta_t}{1-\\bar\\alpha_t}x_0 + \\frac{\\sqrt{\\alpha_t}(1-\\bar\\alpha_{t-1})}{1-\\bar\\alpha_t}x_t' }],
            ['return mean, (1 - ab_prev) / (1 - ab_t) * beta', ['And $\\tilde\\beta_t$.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'posterior_by_bayes', notes: [
            ['def posterior_by_bayes(x0, xt, t, betas):', ['The same posterior, from the lemma.']],
            ['ab = alpha_bars(betas)', ['All the $\\bar\\alpha$.']],
            ['beta, ab_prev = betas[t - 1], ab[t - 2]', ['$\\beta_t$ and $\\bar\\alpha_{t-1}$.']],
            ['precision = (1 - beta) / beta + 1 / (1 - ab_prev)', ['Precisions add: $\\alpha_t/\\beta_t + 1/(1 - \\bar\\alpha_{t-1})$.']],
            ['mean = (math.sqrt(1 - beta) * xt / beta', ['The precision-weighted centres: $\\frac{\\alpha_t}{\\beta_t}\\cdot\\frac{x_t}{\\sqrt{\\alpha_t}} = \\frac{\\sqrt{\\alpha_t}x_t}{\\beta_t}$, plus $\\frac{\\sqrt{\\bar\\alpha_{t-1}}x_0}{1 - \\bar\\alpha_{t-1}}$, divided by the total precision.']],
            ['return mean, 1 / precision', ['Variance = 1 / precision.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'mean_from_noise', notes: [
            ['def mean_from_noise(xt, noise, t, betas):', ['A noisy value and the noise that made it.']],
            ['ab_t = alpha_bars(betas)[t - 1]', ['$\\bar\\alpha_t$.']],
            ['beta = betas[t - 1]', ['$\\beta_t$.']],
            ['return (xt - beta / math.sqrt(1 - ab_t) * noise) / math.sqrt(1 - beta)', ['Eqs. (10)–(11).'], { tex: '\\frac{1}{\\sqrt{\\alpha_t}}\\Big(x_t - \\frac{\\beta_t}{\\sqrt{1-\\bar\\alpha_t}}\\epsilon\\Big)' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'loss_weight', notes: [
            ['def loss_weight(t, betas, sigma2):', ['The step and the reverse variance $\\sigma_t^2$.']],
            ['ab_t = alpha_bars(betas)[t - 1]', ['$\\bar\\alpha_t$.']],
            ['beta = betas[t - 1]', ['$\\beta_t$.']],
            ['return beta ** 2 / (2 * sigma2 * (1 - beta) * (1 - ab_t))', ['Eq. (12)\'s weight.'], { tex: '\\frac{\\beta_t^2}{2\\sigma_t^2\\alpha_t(1-\\bar\\alpha_t)}' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'prior_kl', notes: [
            ['def prior_kl(x0, betas):', ['One clean coordinate.']],
            ['ab = alpha_bars(betas)[-1]', ['$\\bar\\alpha_T$.']],
            ['return 0.5 * ((1 - ab) + ab * x0 * x0 - 1 - math.log(1 - ab))', ['The Gaussian KL above with $m_1 = \\sqrt{\\bar\\alpha_T}x_0$, $v_1 = 1 - \\bar\\alpha_T$, $m_2 = 0$, $v_2 = 1$.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'With the paper\'s schedule, what is $\\bar\\alpha_{1000}$? (give it × 10⁵, 3 decimals)',
          answer: 1e5 * alphaBars(BETAS).at(-1), tolerance: 0.0005, compute: () => 1e5 * alphaBars(BETAS).at(-1),
          explain: `$\\bar\\alpha_{1000} = ${f(alphaBars(BETAS).at(-1))}$: almost no signal is left, so $q(\\mathbf x_T \\mid \\mathbf x_0)$ is almost exactly $\\mathcal N(0, 1)$. For a pixel at the edge of the range ($x_0 = 1$), $L_T = ${f(priorKl(1, BETAS))}$ nats $= ${f(priorKl(1, BETAS) / Math.LN2)}$ bits, the same order as the paper's $10^{-5}$ bits per dimension (a typical pixel is nearer 0, giving less).`,
        },
      },
      {
        predict: {
          prompt: 'At $t = 500$, with $x_0 = 0.8$ and $x_t = 0.1$, what is the posterior mean $\\tilde\\mu_t$? (4 decimals)',
          answer: ddpmPosterior(0.8, 0.1, 500, BETAS)[0], tolerance: 0.00006, compute: () => ddpmPosterior(0.8, 0.1, 500, BETAS)[0],
          explain: `${f(ddpmPosterior(0.8, 0.1, 500, BETAS)[0])}, with variance $\\tilde\\beta_{500} = ${f(ddpmPosterior(0.8, 0.1, 500, BETAS)[1])}$. One step back from heavy noise mostly trusts $x_t$, nudged toward $x_0$.`,
        },
      },
      {
        predict: {
          prompt: 'With $\\sigma_t^2 = \\beta_t$, what weight does the true bound give step $t = 1000$? (4 decimals)',
          answer: lossWeight(1000, BETAS, BETAS[999]), tolerance: 0.00006, compute: () => lossWeight(1000, BETAS, BETAS[999]),
          explain: `${f(lossWeight(1000, BETAS, BETAS[999]))}, against ${f(lossWeight(2, BETAS, BETAS[1]))} at $t = 2$. $L_{\\text{simple}}$ gives both weight 1, shifting effort toward the noisier steps.`,
        },
      },
      {
        choice: {
          prompt: 'Why does the derivation condition the reversed step on $\\mathbf x_0$?',
          options: [
            { text: 'Without $\\mathbf x_0$, $q(\\mathbf x_{t-1} \\mid \\mathbf x_t)$ depends on the unknown data distribution; with it, it is a Gaussian with a closed form', why: 'Yes. Conditioning on the clean image makes the backward step tractable, and the telescoping sum then reorganises the bound into these tractable pieces.' },
            { text: 'Because the reverse process uses $\\mathbf x_0$ when generating', why: 'Generation starts from noise and never sees $\\mathbf x_0$; only training does.' },
            { text: 'To make the chain Markov', why: 'The forward chain is Markov already; that fact is what lets us add $\\mathbf x_0$ to the condition for free.' },
          ],
          answer: 0,
        },
      },
      { note: 'DDPM\'s loss, derived: the ELBO (eq. 3) telescopes into KLs (eq. 5); the forward posterior is Gaussian by completing the square (eq. 7); a Gaussian KL with fixed variance is a squared distance between means (eq. 8); writing $\\mathbf x_0$ through the noise makes that distance $\\frac{\\beta_t}{\\sqrt{\\alpha_t(1-\\bar\\alpha_t)}}\\|\\boldsymbol\\epsilon - \\boldsymbol\\epsilon_\\theta\\|$ (eq. 12). $L_{\\text{simple}}$ is the same sum with every weight set to 1.' },
    ],
  },

  {
    id: 'paper-lora', title: 'Paper: LoRA (Hu et al., 2021)',
    goal: 'Read LoRA\'s fine-tuning objectives and its low-rank update, count the parameters it saves, derive its gradients and why one factor starts at zero, and watch the rank cap what fine-tuning can learn.',
    builds: ['low-rank', 'rank', 'matrix-calculus', 'backpropagation', 'mle', 'paper-transformer'],
    blocks: [
      { md: `**The paper.** Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang and Weizhu Chen, "LoRA: Low-Rank Adaptation of Large Language Models", ICLR 2022 (arXiv:2106.09685, 2021). It is the standard way to fine-tune a large model on modest hardware. Lesson [[#low-rank]] previewed the idea; this lesson reads the paper.

**Eq. (1): full fine-tuning.**
$$\\max_\\Phi\\sum_{(x,y) \\in \\mathcal Z}\\;\\sum_{t=1}^{|y|}\\log P_\\Phi(y_t \\mid x, y_{<t})$$
Decode: $\\mathcal Z$ is the task's dataset of (context, target) pairs, both token sequences. $|y|$ is the target's length, and $y_{<t}$ means its tokens before position $t$. So: maximise the log-probability the model gives each target token, given the context and the target so far. Maximum likelihood (lesson [[#mle]]) for next-token prediction. Fine-tuning starts from the pre-trained weights $\\Phi_0$ and learns a change $\\Delta\\Phi$ as large as the model itself, 175 billion numbers for GPT-3, for every task.

**Eq. (2)** keeps the same objective but makes the change a function of a much smaller set of parameters: $\\Delta\\Phi = \\Delta\\Phi(\\Theta)$ with $|\\Theta| \\ll |\\Phi_0|$.

**Eq. (3): the low-rank update.** For one pre-trained weight matrix $W_0 \\in \\mathbb R^{d \\times k}$, frozen,
$$h = W_0x + \\Delta Wx = W_0x + BAx, \\qquad B \\in \\mathbb R^{d \\times r},\\; A \\in \\mathbb R^{r \\times k},\\; r \\ll \\min(d, k)$$
Check the shapes: $Ax$ is $r$ numbers, $B(Ax)$ is $d$, matching $W_0x$. The update $BA$ is a $d \\times k$ matrix of **rank at most $r$**: every column of $BA$ is $B$ times a column of $A$, a combination of $B$'s $r$ columns (lesson [[#rank]]). Compute it as $B(Ax)$, never forming $BA$, and it costs $r(d + k)$ multiplications instead of $dk$.

**The count.** Trainable numbers: $dk$ for full fine-tuning against $r(d + k)$ for LoRA. For a $4096 \\times 4096$ matrix at $r = 8$, that is 16,777,216 against 65,536, a factor of 256. The paper's headline factor of 10,000 is for GPT-3 175B with $r = 4$, adapting only the query and value projections $W_q$ and $W_v$ of each attention layer (lesson [[#paper-transformer]]), which shrinks a checkpoint from 350 GB to 35 MB.

**Initialisation: why $B = 0$.** $A$ starts random (Gaussian) and $B$ starts at zero, so $\\Delta W = BA = 0$: training begins exactly at the pre-trained model. The gradients show what happens next. With $h = W_0x + \\frac\\alpha rB(Ax)$ and $\\mathbf g = \\partial\\ell/\\partial h$, the rule for $u = Mv$ (lesson [[#matrix-calculus]]: $\\partial\\ell/\\partial M = \\frac{\\partial\\ell}{\\partial u}v^\\top$ and $\\partial\\ell/\\partial v = M^\\top\\frac{\\partial\\ell}{\\partial u}$), applied twice, gives
$$\\frac{\\partial\\ell}{\\partial B} = \\frac\\alpha r\\,\\mathbf g\\,(Ax)^\\top, \\qquad \\frac{\\partial\\ell}{\\partial A} = \\frac\\alpha r\\,(B^\\top\\mathbf g)\\,x^\\top$$
At the start $B = 0$, so $\\partial\\ell/\\partial A = 0$: only $B$ moves on the first step. From the second step on, $B \\ne 0$ and $A$ moves too. The alternatives fail: both zero would give both gradients zero forever, and both random would make $\\Delta W \\ne 0$ at the start, so training would begin from a damaged model.

**The scale $\\alpha/r$.** The paper scales $\\Delta Wx$ by $\\alpha/r$ and sets $\\alpha$ to the first $r$ it tries, without tuning, so that changing $r$ later needs no new learning rate. Fixed numbers like this are worth noticing when reproducing a paper.

**No added latency.** For deployment, compute $W = W_0 + \\frac\\alpha rBA$ once: one ordinary matrix, as fast as the original. To switch tasks, subtract one $BA$ and add another.

**Section 7: is the update really low-rank?** The paper trains with $r = 8$ and $r = 64$ and compares the subspaces their $A$ matrices use, with eq. (4): $\\phi(A_{r=8}, A_{r=64}, i, j) = \\frac{\\|U^{i\\top}_{A_{r=8}}U^j_{A_{r=64}}\\|_F^2}{\\min(i, j)} \\in [0, 1]$, where $U^i$ holds the top $i$ singular vectors (lesson [[#svd]]). For orthonormal columns, $\\|U^\\top V\\|_F^2$ adds up the squared cosines between every pair of directions, at most $\\min(i, j)$, so dividing gives a number from 0 (no overlap) to 1 (one subspace inside the other). Finding that the top few directions overlap strongly, the paper argues that the useful update has very low "intrinsic rank".

**What the rank costs.** If the update you need has rank greater than $r$, LoRA cannot represent it. The best it can do is the best rank-$r$ approximation, with error $\\sqrt{\\sum_{i > r}\\sigma_i^2}$ (lesson [[#low-rank]]). The figure trains $B$ and $A$ by gradient descent to reproduce a rank-2 update with singular values 1 and 0.5.` },
      { figure: 'LoRAFig', caption: 'Learning a rank-2 update $\\Delta W$ (singular values 1 and 0.5) on four inputs, training only $B$ and $A$. Rank 1 stops exactly at the best rank-1 error, $\\sigma_2^2/4 = 0.0625$ (orange); rank 2 or more reaches zero.' },
      { figure: 'EquationAnatomy', props: { ids: ['lora'] }, caption: 'Eq. (3), piece by piece.' },
      {
        code: {
          file: 'papers.py', fn: 'lora_forward', notes: [
            ['def lora_forward(W0, B, A, x, alpha, r):', ['The frozen matrix, the two factors, an input, and the scale.']],
            ['return [h + alpha / r * u for h, u in zip(matvec(W0, x), matvec(B, matvec(A, x)))]', ['$W_0x$ plus $\\frac\\alpha rB(Ax)$, computed right to left so $BA$ is never formed.'], { tex: 'h = W_0x + \\tfrac{\\alpha}{r}BAx' }],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'lora_merge', notes: [
            ['def lora_merge(W0, B, A, alpha, r):', ['For deployment.']],
            ['return [[w + alpha / r * sum(B[i][s] * A[s][j]', ['Entry $(i, j)$ of $W_0 + \\frac\\alpha rBA$: one ordinary matrix.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'lora_param_count', notes: [
            ['def lora_param_count(d, k, r):', ['The matrix\'s shape and the rank.']],
            ['return d * k, r * (d + k)', ['Full: $dk$. LoRA: $B$\'s $dr$ plus $A$\'s $rk$.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'lora_grads', notes: [
            ['def lora_grads(B, A, x, grad_h, alpha, r):', ['The factors, the input, and $\\mathbf g = \\partial\\ell/\\partial h$ from the layer above.']],
            ['Ax = matvec(A, x)', ['The forward pass\'s middle value.']],
            ['Btg = [sum(B[i][s] * grad_h[i]', ['$B^\\top\\mathbf g$: the gradient sent back into $Ax$.']],
            ['dB = [[alpha / r * g * a for a in Ax] for g in grad_h]', ['$\\frac\\alpha r\\,\\mathbf g(Ax)^\\top$: an outer product.']],
            ['dA = [[alpha / r * u * xi for xi in x] for u in Btg]', ['$\\frac\\alpha r(B^\\top\\mathbf g)x^\\top$: zero whenever $B = 0$.']],
            ['return dB, dA', ['Both gradients.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'lora_train', notes: [
            ['def lora_train(target, inputs, r, rate, steps, seed=0):', ['A target update to learn, inputs, the rank, and gradient-descent settings.']],
            ['rng = random.Random(seed)', ['Repeatable randomness.']],
            ['d, k = len(target), len(target[0])', ['The update\'s shape.']],
            ['A = [[rng.gauss(0, 1 / math.sqrt(k))', ['$A$ random, as in the paper.']],
            ['B = [[0.0] * r for _ in range(d)]', ['$B = 0$, so $BA = 0$ at the start.']],
            ['losses = []', ['The loss at each step.']],
            ['for _ in range(steps):', ['Each gradient-descent step.']],
            ['loss, dB, dA = 0.0', ['Reset the loss and the gradient totals.']],
            ['for x in inputs:', ['Each input in turn.']],
            ['err = [u - v for u, v in zip(matvec(B, matvec(A, x)), matvec(target, x))]', ['$BAx - \\Delta W^*x$ ($\\alpha = r$, so the scale is 1; $W_0x$ cancels from both sides).']],
            ['loss += sum(e * e for e in err) / len(inputs)', ['The mean squared error.']],
            ['gB, gA = lora_grads(B, A, x, [2 * e / len(inputs) for e in err], r, r)', ['$\\mathbf g = 2\\,\\text{err}/n$, the derivative of the squared error, passed back through the factors.']],
            ['dB = [[a + b for a, b in zip(row, grow)] for row, grow in zip(dB, gB)]', ['Add this input\'s gradient for $B$…']],
            ['dA = [[a + b for a, b in zip(row, grow)] for row, grow in zip(dA, gA)]', ['…and for $A$.']],
            ['losses.append(loss)', ['Record the loss before stepping.']],
            ['B = [[b - rate * g for b, g in zip(row, grow)] for row, grow in zip(B, dB)]', ['Step $B$ downhill…']],
            ['A = [[a - rate * g for a, g in zip(row, grow)] for row, grow in zip(A, dA)]', ['…and $A$. $W_0$ never changes.']],
            ['return losses', ['The training curve.']],
          ],
        },
      },
      {
        code: {
          file: 'papers.py', fn: 'show_papers', notes: [
            ['def show_papers():', ['One line per paper.']],
            ['X, y = [[1.0, 2.0], [2.0, 0.5], [3.0, 3.0]], [5.0, 3.0, 9.0]', ['Three examples for the dropout check.']],
            ['print("dropout:', ['Sampled and closed-form dropout loss: close, not equal (4000 masks).']],
            ['print("word2vec:', ['PMI minus $\\log k$.']],
            ['print("VAE:', ['The exact ELBO and both estimators\' means and variances.']],
            ['print("Adam:', ['A constant gradient\'s step ($\\alpha$) and a lone spike\'s (about $2.5\\alpha$).']],
            ['print("batch norm:', ['The six equations and the one-line form agree.']],
            ['print("ResNet:', ['Gradient sizes through 30 layers.']],
            ['print("Transformer:', ['Eq. (3) before, at and after the peak.']],
            ['print("PPO:', ['Advantages for a three-step segment.']],
            ['print("DDPM:', ['$\\bar\\alpha_{1000}$ and one posterior.']],
            ['print("LoRA:', ['Trainable numbers, full against LoRA.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'How many times fewer trainable numbers does LoRA need for a $4096 \\times 4096$ matrix at $r = 8$?',
          answer: loraParamCount(4096, 4096, 8)[0] / loraParamCount(4096, 4096, 8)[1], compute: () => loraParamCount(4096, 4096, 8)[0] / loraParamCount(4096, 4096, 8)[1],
          explain: `$4096^2 / (8 \\times 8192) = ${f(loraParamCount(4096, 4096, 8)[0])}/${f(loraParamCount(4096, 4096, 8)[1])} = ${f(loraParamCount(4096, 4096, 8)[0] / loraParamCount(4096, 4096, 8)[1])}$.`,
        },
      },
      {
        predict: {
          prompt: 'In the figure, what loss does rank 1 settle at after 200 steps? (4 decimals)',
          answer: loraTrain(LORA_TARGET, LORA_INPUTS, 1, 0.5, 200, 1).at(-1), tolerance: 0.00006, compute: () => loraTrain(LORA_TARGET, LORA_INPUTS, 1, 0.5, 200, 1).at(-1),
          explain: `${f(loraTrain(LORA_TARGET, LORA_INPUTS, 1, 0.5, 200, 1).at(-1))}: the best rank-1 approximation leaves the second singular value, $0.5^2 = 0.25$, spread over 4 inputs. Gradient descent found the Eckart–Young optimum by itself.`,
        },
      },
      {
        choice: {
          prompt: 'At the first step of training, why does $A$ not change?',
          options: [
            { text: 'Its gradient is $\\frac\\alpha r(B^\\top\\mathbf g)x^\\top$ and $B = 0$', why: 'Yes. Only $B$ moves first; after one step $B \\ne 0$ and $A$ learns too.' },
            { text: 'Because $A$ is frozen', why: 'Only $W_0$ is frozen. $A$ and $B$ are both trained.' },
            { text: 'Because the loss is zero at the start', why: 'The loss is not zero: the pre-trained model is not yet good at the task. $\\Delta W = 0$ just means training starts from the pre-trained model.' },
          ],
          answer: 0,
        },
      },
      { md: `**Reading the next paper.** Across these walkthroughs, the same habits did most of the work: name every symbol from the paper itself (dropout's $p$; Adam's two kinds of superscript), check shapes and conventions ($xW$ or $W\\mathbf x$), count steps to check indices (PPO's exponents), and ask of every claim whether it is proved, measured or assumed (Adam's bounds; the $\\approx$ in CPC; batch norm's explanation). Every equation in them was built from the pieces in this lab, and so is the next one you read.` },
      { note: 'LoRA freezes $W_0$ and learns $\\Delta W = BA$ of rank $\\le r$: $r(d + k)$ numbers instead of $dk$. $B$ starts at zero so training starts at the pre-trained model; $\\partial\\ell/\\partial B = \\frac\\alpha r\\mathbf g(Ax)^\\top$ and $\\partial\\ell/\\partial A = \\frac\\alpha r(B^\\top\\mathbf g)x^\\top$. Merge $W_0 + \\frac\\alpha rBA$ for free inference. A rank-$r$ update can do no better than the best rank-$r$ approximation.' },
    ],
  },
]
