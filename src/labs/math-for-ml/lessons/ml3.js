// Machine-learning additions, part two: recurrent networks and backpropagation through time, the whole
// Transformer block, contrastive learning, VAEs and the ELBO, GANs, diffusion, the Bellman equations,
// the policy-gradient theorem and PPO.
import { bptt, sinusoidalPosition, residualBlock, infoNce, klToStandardNormal, reparameterise, ganValue, optimalDiscriminator, alphaBar, noisySample, valueIteration, scoreFunctionGradient, ppoClip } from '../engine/maths.js'
import { f } from './util.js'

const MDP_P = [[[[0.8, 1], [0.2, 0]], [[1, 0]]], [[[1, 1]], [[0.5, 0], [0.5, 1]]]], MDP_R = [[0, 1], [2, 0.5]]

export const ML3 = [
  {
    id: 'rnn-bptt', title: 'Recurrent networks and backpropagation through time',
    goal: 'Unroll a recurrent network into a deep graph, compute its gradient by backpropagation through time, and show why gradients vanish or explode as products of many factors.',
    builds: ['backpropagation', 'multivariable-chain', 'product-quotient'],
    blocks: [
      { md: `A **recurrent network** reads a sequence one step at a time, carrying a **hidden state** that summarises what it has seen:
$$h_t = \\tanh(w\\,h_{t-1} + u\\,x_t)$$
(one-number version; real ones use matrices $W$ and $U$ and vectors). The **same** $w$ and $u$ are used at every step.

**Unrolling.** Write out the steps and the network becomes a deep feed-forward graph: $h_0 \\to h_1 \\to \\dots \\to h_T$, one layer per time step, all sharing weights. Training it is ordinary backpropagation on that graph: **backpropagation through time** (BPTT).

**The gradient.** For a loss on the final state, $L = (h_T - y)^2$, go backward step by step. With $z_t = wh_{t-1} + ux_t$ and $\\tanh' = 1 - \\tanh^2$ (lesson [[#product-quotient]]):
$$\\frac{\\partial L}{\\partial z_t} = \\frac{\\partial L}{\\partial h_t}(1 - h_t^2), \\qquad \\frac{\\partial L}{\\partial h_{t-1}} = \\frac{\\partial L}{\\partial z_t}\\,w$$
Since $w$ is used at **every** step, its gradient adds the contributions of all of them (lesson [[#multivariable-chain]]: sum over paths): $\\frac{\\partial L}{\\partial w} = \\sum_t\\frac{\\partial L}{\\partial z_t}h_{t-1}$.

**Vanishing and exploding gradients.** Chain the backward step from the end to step $t$:
$$\\frac{\\partial L}{\\partial h_t} = \\frac{\\partial L}{\\partial h_T}\\prod_{s=t+1}^{T} w\\,(1 - h_s^2)$$
a product of $T - t$ factors. If they are typically below 1 (and $1 - h^2 \\le 1$ always), the product shrinks **exponentially** with the distance back: the loss can barely influence what the network did 50 steps earlier, so it can't learn long-range dependencies. If $|w|$ is large, the product can instead **explode**. (The same product of Jacobians appears in any very deep network, lesson [[#jacobian]].)

**The fixes.** Gradient **clipping** (lesson [[#piecewise]]: cap the gradient's size) tames explosions. **LSTMs** and GRUs keep a second state updated by **adding** rather than multiplying ($c_t = f_t\\odot c_{t-1} + i_t\\odot\\tilde c_t$), so the backward product has factors near 1 when the forget gate is open. Residual connections in Transformers (next lesson) use the same idea, and attention removes the long chain entirely by connecting every step to every other directly.` },
      { figure: 'BPTTFig', caption: 'An unrolled recurrent network over 12 steps. The bars show how much gradient from the final loss reaches each step. Slide $w$: below 1 the bars fade toward the start (vanishing); well above, they can grow (exploding).' },
      {
        code: {
          file: 'deep.py', fn: 'rnn_forward', notes: [
            ['def rnn_forward(w, u, xs, h0=0.0):', ['Shared weights, the input sequence, and a starting state.']],
            ['hs = [h0]', ['The state at every step.']],
            ['for x in xs:', ['Read one input at a time…']],
            ['hs.append(math.tanh(w * hs[-1] + u * x))', ['…mixing it with the previous state.'], { tex: 'h_t = \\tanh(wh_{t-1} + ux_t)' }],
            ['return hs', ['All the states.']],
          ],
        },
      },
      {
        code: {
          file: 'deep.py', fn: 'bptt', notes: [
            ['def bptt(w, u, xs, target):', ['Backpropagation through time for $L = (h_T - y)^2$.']],
            ['hs = rnn_forward(w, u, xs)', ['Forward pass, keeping every state.']],
            ['dh = 2 * (hs[-1] - target)', ['$\\partial L/\\partial h_T$.']],
            ['gw = gu = 0.0', ['Gradients of the shared weights, accumulated over steps.']],
            ['reach = []', ['How large $\\partial L/\\partial h_t$ is at each step.']],
            ['for t in range(len(xs), 0, -1):', ['Backward from the last step.']],
            ['dz = dh * (1 - hs[t] ** 2)', ['Through the tanh: $\\partial L/\\partial z_t$.']],
            ['gw += dz * hs[t - 1]', ['$w$\'s use at this step contributes $\\partial L/\\partial z_t\\cdot h_{t-1}$.']],
            ['gu += dz * xs[t - 1]', ['Likewise $u$.']],
            ['reach.append(abs(dh))', ['Record the gradient\'s size here.']],
            ['dh = dz * w', ['Pass it to the previous state: one more factor in the product.'], { tex: '\\tfrac{\\partial L}{\\partial h_{t-1}} = \\tfrac{\\partial L}{\\partial h_t}(1 - h_t^2)\\,w' }],
            ['return gw, gu, reach[::-1]', ['The weight gradients, and the gradient sizes in time order.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'RNN with $w = 0.8$, $u = 1.2$, inputs $1, -0.5, 0.3, 0$, target 0.4: what is $\\partial L/\\partial w$? (4 decimals)',
          answer: bptt(0.8, 1.2, [1, -0.5, 0.3, 0], 0.4)[0], tolerance: 0.00006, compute: () => bptt(0.8, 1.2, [1, -0.5, 0.3, 0], 0.4)[0],
          explain: `${f(bptt(0.8, 1.2, [1, -0.5, 0.3, 0], 0.4)[0])}: the sum of four steps' contributions.`,
        },
      },
      {
        predict: {
          prompt: 'If every backward factor $w(1 - h^2)$ were 0.5, what fraction of the final gradient would reach 20 steps back? (scientific notation)',
          answer: 0.5 ** 20, tolerance: 1e-8, compute: () => 0.5 ** 20,
          explain: '$0.5^{20} \\approx 9.5 \\times 10^{-7}$: effectively nothing. Long-range learning stalls.',
        },
      },
      { note: 'RNN: $h_t = \\tanh(wh_{t-1} + ux_t)$ with shared weights; unrolled, it is a deep network trained by BPTT, and shared weights add their per-step gradients. $\\partial L/\\partial h_t$ is a product of $T - t$ factors: vanishing or exploding. Clipping, LSTMs (additive memory), residuals and attention are the fixes.' },
    ],
  },

  {
    id: 'transformer-block', title: 'The Transformer block, piece by piece',
    goal: 'Assemble a Transformer block (pre-norm attention and MLP with residual connections), explain why positions must be added, derive the sinusoidal code\'s relative-offset property, and count a block\'s parameters ($\\approx 12d^2$).',
    builds: ['attention', 'normalisation', 'rnn-bptt', 'orthogonal-matrices', 'jacobian'],
    blocks: [
      { md: `Lesson [[#attention]] built one attention head. A **Transformer** stacks dozens of identical **blocks**, each of which, for a sequence of $T$ token vectors $\\mathbf x_t \\in \\mathbb R^d$:

$$\\mathbf x \\leftarrow \\mathbf x + \\text{MultiHeadAttention}\\big(\\text{LayerNorm}(\\mathbf x)\\big)$$
$$\\mathbf x \\leftarrow \\mathbf x + \\text{MLP}\\big(\\text{LayerNorm}(\\mathbf x)\\big)$$

Every symbol is something you have.
- **LayerNorm**: lesson [[#normalisation]].
- **Multi-head attention**: $h$ heads, each with its own $W^Q, W^K, W^V$ of size $d \\times \\frac dh$, run side by side; their outputs are concatenated and mixed by $W^O$ ($d \\times d$). Different heads can attend to different things.
- **MLP**: applied to each token separately: $W_2\\,\\text{GELU}(W_1\\mathbf x)$ with a hidden width of $4d$ (GELU is a smooth ReLU).

**Residual connections: the $\\mathbf x +$.** Each sub-layer only **adds** a correction to the running vector (the "residual stream"). Its Jacobian is $I + J_{\\text{sublayer}}$ (lesson [[#jacobian]]), so even if a sub-layer's own Jacobian is tiny, the identity carries the gradient straight through, the opposite of lesson [[#rnn-bptt]]'s vanishing product. That is what makes 100-layer networks trainable.

**Why positions must be added.** Attention compares every token with every other and averages: if you **permute** the input tokens, the outputs are permuted the same way and nothing else changes (each output depends on the set of keys and values, not their order). So "dog bites man" and "man bites dog" would look identical. The fix is to add a **position code** $\\mathbf p_t$ to each token's vector before the first block.

**The sinusoidal code** pairs up coordinates: pair $i$ is $(\\sin\\omega_it, \\cos\\omega_it)$ with frequencies $\\omega_i = 10000^{-2i/d}$, from fast to very slow. Why sines and cosines: by the angle-addition formulas, moving from position $t$ to $t + k$ **rotates** each pair by the angle $\\omega_ik$ (a rotation matrix, lesson [[#orthogonal-matrices]]), the same rotation whatever $t$ is. So relative offsets are a fixed linear operation the model can learn to use. **Rotary embeddings** (RoPE) apply that rotation to queries and keys directly, so dot products depend only on the offset.

**Counting parameters.** Attention: $W^Q, W^K, W^V, W^O$, four $d \\times d$ matrices: $4d^2$. MLP: $d \\times 4d$ and $4d \\times d$: $8d^2$. A block is about $12d^2$ (biases and norms are tiny). GPT-2 small has $d = 768$ and 12 blocks: $12 \\times 12 \\times 768^2 \\approx 85$ million, plus the token-embedding table; the reported total is 124 million.` },
      { figure: 'TransformerBlockFig', caption: 'The block as a diagram: the residual stream runs straight up; each sub-layer reads a normalised copy and adds its result back. Below, the sinusoidal position code: each row is a position, each column a coordinate, from fast to slow waves.' },
      {
        code: {
          file: 'deep.py', fn: 'sinusoidal_position', notes: [
            ['def sinusoidal_position(pos, d):', ['A position and the model width.']],
            ['out = []', ['The code, two coordinates at a time.']],
            ['for i in range(d // 2):', ['Each frequency…']],
            ['freq = 1 / 10000 ** (2 * i / d)', ['…$\\omega_i = 10000^{-2i/d}$, from 1 down to about $10^{-4}$…']],
            ['out += [math.sin(pos * freq), math.cos(pos * freq)]', ['…gives one $(\\sin, \\cos)$ pair: a point on a circle, turned by $\\omega_i$ per position.']],
            ['return out', ['$\\mathbf p_t \\in \\mathbb R^d$.']],
          ],
        },
      },
      {
        code: {
          file: 'deep.py', fn: 'residual_block', notes: [
            ['def residual_block(x, sublayer):', ['A token vector and any sub-layer (attention or MLP).']],
            ['y = sublayer(layer_norm(x))', ['The sub-layer reads a normalised copy…']],
            ['return [a + b for a, b in zip(x, y)]', ['…and its output is added to the stream.'], { tex: '\\mathbf x + f(\\text{LN}(\\mathbf x))' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Parameters in one Transformer block with $d = 1024$ (using $12d^2$)? (in millions, 2 decimals)',
          answer: 12 * 1024 * 1024 / 1e6, tolerance: 0.006, compute: () => 12 * 1024 * 1024 / 1e6,
          explain: '$12 \\times 1024^2 \\approx 12.58$ million: 4.19 in attention, 8.39 in the MLP.',
        },
      },
      {
        predict: {
          prompt: 'Check the rotation property: the dot product of position codes $\\mathbf p_3$ and $\\mathbf p_5$ (with $d = 8$) equals that of $\\mathbf p_{10}$ and $\\mathbf p_{12}$. Give it. (4 decimals)',
          answer: (() => { const a = sinusoidalPosition(3, 8), b = sinusoidalPosition(5, 8); return a.reduce((s, v, i) => s + v * b[i], 0) })(), tolerance: 0.00006,
          compute: () => { const a = sinusoidalPosition(10, 8), b = sinusoidalPosition(12, 8); return a.reduce((s, v, i) => s + v * b[i], 0) },
          explain: 'Each pair contributes $\\sin a\\sin b + \\cos a\\cos b = \\cos(a - b)$, which depends only on the offset: $\\sum_i\\cos(2\\omega_i)$ either way.',
        },
      },
      { note: 'Block: $\\mathbf x + \\text{MHA}(\\text{LN}(\\mathbf x))$, then $\\mathbf x + \\text{MLP}(\\text{LN}(\\mathbf x))$. Residuals give Jacobian $I + J$: gradients flow. Attention ignores order, so add position codes; sinusoidal pairs rotate by $\\omega k$ for an offset $k$. About $12d^2$ parameters per block.' },
    ],
  },

  {
    id: 'contrastive', title: 'Contrastive learning and the InfoNCE loss',
    goal: 'Train embeddings by pulling matching pairs together and pushing others apart, write InfoNCE as cross-entropy over a batch, and see the role of the temperature.',
    builds: ['softmax', 'dot-product', 'information'],
    blocks: [
      { md: `How do you learn useful embeddings without labels? **Contrastive learning**: make two views of the same thing (two crops of one photo; an image and its caption) land close together, and views of different things land apart.

**The set-up.** A batch of $N$ matching pairs $(\\mathbf a_i, \\mathbf b_i)$, embedded and normalised to length 1, so that their dot product is the cosine similarity (lesson [[#dot-product]]): $s_{ij} = \\mathbf a_i\\cdot\\mathbf b_j$. The matrix $S$ should have big numbers on its diagonal (the true pairs) and small ones elsewhere.

**InfoNCE.** For each $\\mathbf a_i$, treat "which of the $N$ $\\mathbf b$'s is my partner?" as an $N$-way classification, with logits $s_{ij}/\\tau$ and the correct class $j = i$. The loss is the usual softmax cross-entropy (lesson [[#softmax]]):

$$\\mathcal L = -\\frac1N\\sum_{i=1}^N\\log\\frac{e^{s_{ii}/\\tau}}{\\sum_{j=1}^N e^{s_{ij}/\\tau}}$$

Its gradient (the familiar $\\mathbf p - \\mathbf y$) raises $s_{ii}$ and lowers every $s_{ij}$ in proportion to how confusable it is: the **other examples in the batch are the negatives**, for free. Bigger batches give more negatives and a harder, more informative task. CLIP trains an image encoder and a text encoder this way on hundreds of millions of image–caption pairs, using the loss in both directions.

**Temperature.** $\\tau$ (often 0.07 or learned) scales the logits. Small $\\tau$ makes the softmax sharp: it focuses the loss on the hardest negatives. Large $\\tau$ spreads it evenly.

**Why "info".** The name comes from a result (**taken on trust** here) that $\\log N - \\mathcal L$ is a lower bound on the mutual information between the two views (lesson [[#information]]): minimising InfoNCE pushes the embeddings to keep what the two views share.` },
      { figure: 'ContrastiveFig', caption: 'A batch of image–caption pairs as a similarity matrix (darker = more similar). The loss looks across each row for the diagonal entry. Train: the diagonal brightens, the rest fades. Change the temperature to see the loss sharpen.' },
      {
        code: {
          file: 'deep.py', fn: 'info_nce', notes: [
            ['def info_nce(sim, tau=0.1):', ['An $N \\times N$ similarity matrix with the true pairs on the diagonal, and the temperature.']],
            ['total = 0.0', ['Sum over rows.']],
            ['for i, row in enumerate(sim):', ['Row $i$: which $\\mathbf b$ goes with $\\mathbf a_i$?']],
            ['logits = [s / tau for s in row]', ['Scale by the temperature.']],
            ['m = max(logits)', ['For a stable log-sum-exp (lesson [[#stability]])…']],
            ['lse = m + math.log(sum(math.exp(z - m) for z in logits))', ['…$\\log\\sum_j e^{s_{ij}/\\tau}$.']],
            ['total += lse - logits[i]', ['Cross-entropy with the diagonal as the right answer.']],
            ['return total / len(sim)', ['Average over the batch.'], { tex: '\\mathcal L = -\\frac1N\\sum_i\\log\\frac{e^{s_{ii}/\\tau}}{\\sum_j e^{s_{ij}/\\tau}}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'InfoNCE for $S = \\begin{pmatrix}0.9&0.1&0\\\\0.2&0.8&0.3\\\\0.1&0.4&0.7\\end{pmatrix}$ with $\\tau = 0.2$? (4 decimals)',
          answer: infoNce([[0.9, 0.1, 0], [0.2, 0.8, 0.3], [0.1, 0.4, 0.7]], 0.2), tolerance: 0.00006, compute: () => infoNce([[0.9, 0.1, 0], [0.2, 0.8, 0.3], [0.1, 0.4, 0.7]], 0.2),
          explain: `${f(infoNce([[0.9, 0.1, 0], [0.2, 0.8, 0.3], [0.1, 0.4, 0.7]], 0.2))}: low, since each diagonal entry wins its row, but row 3's partner competes with 0.4.`,
        },
      },
      {
        predict: {
          prompt: 'If every similarity were equal (an untrained model), what would InfoNCE be for a batch of $N = 256$? (3 decimals)',
          answer: Math.log(256), tolerance: 0.0006, compute: () => infoNce(Array.from({ length: 8 }, () => Array(8).fill(0.3)), 0.1) * Math.log(256) / Math.log(8),
          explain: '$\\log N = \\log 256 = 5.545$: a uniform guess among 256 partners.',
        },
      },
      { note: 'Contrastive learning: matching pairs close, others apart. InfoNCE = softmax cross-entropy over the batch, logits $s_{ij}/\\tau$, diagonal correct; the rest of the batch are the negatives. Small $\\tau$ focuses on hard negatives. $\\log N - \\mathcal L$ bounds the views\' mutual information.' },
    ],
  },

  {
    id: 'vae-elbo', title: 'Variational autoencoders and the ELBO',
    goal: 'Derive the evidence lower bound $\\log p(x) \\ge \\mathbb E_q[\\log p(x\\mid z)] - D_{KL}(q\\|p(z))$ from Jensen, compute the Gaussian KL in closed form, and use the reparameterisation trick to backpropagate through sampling.',
    builds: ['jensen', 'bayes', 'gmm-em', 'entropy-kl', 'multivariate-gaussian'],
    blocks: [
      { md: `A **variational autoencoder** (VAE) is a generative model: sample a code $z$ from a simple prior, $p(z) = \\mathcal N(0, I)$, then a **decoder** network turns it into data, $p_\\theta(x \\mid z)$. To train it by maximum likelihood we need $\\log p(x) = \\log\\int p_\\theta(x \\mid z)\\,p(z)\\,dz$: an integral over every possible code, which no one can compute.

**The ELBO.** Bring in an **encoder** network $q_\\phi(z \\mid x)$ that guesses which codes could have produced $x$. Multiply and divide inside the integral, and apply Jensen to the concave log (lesson [[#jensen]]), exactly as for EM (lesson [[#gmm-em]]):
$$\\log p(x) = \\log\\mathbb E_{q}\\!\\left[\\frac{p_\\theta(x \\mid z)\\,p(z)}{q_\\phi(z \\mid x)}\\right] \\;\\ge\\; \\mathbb E_q\\!\\left[\\log\\frac{p_\\theta(x \\mid z)\\,p(z)}{q_\\phi(z \\mid x)}\\right]$$
Split the log of the product:
$$\\text{ELBO} = \\underbrace{\\mathbb E_{q}[\\log p_\\theta(x \\mid z)]}_{\\text{reconstruct } x \\text{ from its code}} \\;-\\; \\underbrace{D_{KL}\\big(q_\\phi(z \\mid x)\\,\\|\\,p(z)\\big)}_{\\text{keep codes near the prior}}$$
(the second term is lesson [[#entropy-kl]]'s KL, by its definition). Maximise it over both networks: the first term makes codes informative, the second keeps the code space tidy so that sampling from the prior gives sensible outputs. How big is the gap? Bayes' rule (lesson [[#bayes]]) says $p_\\theta(x \\mid z)\\,p(z) = p(z \\mid x)\\,p(x)$, where $p(z \\mid x)$ is the true posterior over codes. Put that inside the bound's log: $\\mathbb E_q\\big[\\log\\frac{p(z \\mid x)\\,p(x)}{q(z \\mid x)}\\big] = \\log p(x) - \\mathbb E_q\\big[\\log\\frac{q(z \\mid x)}{p(z \\mid x)}\\big]$, since $\\log p(x)$ doesn't depend on $z$. So
$$\\log p(x) - \\text{ELBO} = D_{KL}\\big(q(z \\mid x)\\,\\|\\,p(z \\mid x)\\big) \\ge 0$$
exactly: the bound is tight when the encoder matches the true posterior, and training the encoder to raise the ELBO is training it to approximate that posterior.

**The KL in closed form.** For a one-number code, $q = \\mathcal N(\\mu, \\sigma^2)$ against $p = \\mathcal N(0, 1)$. Write out both log densities (lesson [[#normal]]) and take $\\mathbb E_q$ of their difference, using $\\mathbb E_q[(z - \\mu)^2] = \\sigma^2$ and $\\mathbb E_q[z^2] = \\sigma^2 + \\mu^2$:
$$D_{KL} = \\mathbb E_q\\!\\left[-\\ln\\sigma - \\frac{(z-\\mu)^2}{2\\sigma^2} + \\frac{z^2}{2}\\right] = -\\ln\\sigma - \\frac12 + \\frac{\\sigma^2 + \\mu^2}{2} = \\frac12\\big(\\sigma^2 + \\mu^2 - 1 - \\ln\\sigma^2\\big)$$
(the $\\sqrt{2\\pi}$ constants cancel). Zero exactly when $\\mu = 0$, $\\sigma = 1$. With many code dimensions, add one such term per dimension.

**The reparameterisation trick.** The first term needs a sample $z \\sim q$, and you can't backpropagate through "draw a random number". So draw the randomness separately, $\\varepsilon \\sim \\mathcal N(0, 1)$, and **compute** $z = \\mu + \\sigma\\varepsilon$ (the same idea as $\\boldsymbol\\mu + L\\mathbf z$ in lesson [[#multivariate-gaussian]]). Now $z$ is a differentiable function of $\\mu$ and $\\sigma$, and gradients flow into the encoder. Encoders output $\\log\\sigma^2$ rather than $\\sigma$ so it can be any real number.` },
      { figure: 'VAEFig', caption: 'An encoder\'s Gaussian $q(z\\mid x)$ against the prior $\\mathcal N(0, 1)$. Move $\\mu$ and $\\sigma$: the KL term (in the table) grows as $q$ drifts from the prior. Reparameterised samples $\\mu + \\sigma\\varepsilon$ fill in $q$.' },
      {
        code: {
          file: 'deep.py', fn: 'kl_to_standard_normal', notes: [
            ['def kl_to_standard_normal(mu, logvar):', ['The encoder\'s mean and $\\ln\\sigma^2$.']],
            ['return 0.5 * (math.exp(logvar) + mu * mu - 1 - logvar)', ['$\\frac12(\\sigma^2 + \\mu^2 - 1 - \\ln\\sigma^2)$, derived above.'], { tex: 'D_{KL} = \\tfrac12(\\sigma^2 + \\mu^2 - 1 - \\ln\\sigma^2)' }],
          ],
        },
      },
      {
        code: {
          file: 'deep.py', fn: 'reparameterise', notes: [
            ['def reparameterise(mu, logvar, eps):', ['Mean, $\\ln\\sigma^2$, and a standard normal draw.']],
            ['return mu + math.exp(0.5 * logvar) * eps', ['$z = \\mu + \\sigma\\varepsilon$, with $\\sigma = e^{\\frac12\\ln\\sigma^2}$: differentiable in $\\mu$ and $\\sigma$.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'KL from $\\mathcal N(0.5, e^{-0.3})$ to $\\mathcal N(0, 1)$ (so $\\mu = 0.5$, $\\ln\\sigma^2 = -0.3$)? (4 decimals)',
          answer: klToStandardNormal(0.5, -0.3), tolerance: 0.00006, compute: () => klToStandardNormal(0.5, -0.3),
          explain: `$\\frac12(e^{-0.3} + 0.25 - 1 + 0.3) = ${f(klToStandardNormal(0.5, -0.3))}$.`,
        },
      },
      {
        predict: {
          prompt: 'Reparameterise with $\\mu = 0.5$, $\\ln\\sigma^2 = -0.3$, $\\varepsilon = 1.2$: what is $z$? (4 decimals)',
          answer: reparameterise(0.5, -0.3, 1.2), tolerance: 0.00006, compute: () => reparameterise(0.5, -0.3, 1.2),
          explain: `$0.5 + e^{-0.15} \\times 1.2 = ${f(reparameterise(0.5, -0.3, 1.2))}$; $\\partial z/\\partial\\mu = 1$ and $\\partial z/\\partial\\sigma = \\varepsilon$.`,
        },
      },
      { note: 'ELBO $= \\mathbb E_q[\\log p(x\\mid z)] - D_{KL}(q(z\\mid x)\\|p(z)) \\le \\log p(x)$, by Jensen. Gaussian KL: $\\frac12(\\sigma^2 + \\mu^2 - 1 - \\ln\\sigma^2)$ per dimension. Reparameterise $z = \\mu + \\sigma\\varepsilon$ to backpropagate through sampling.' },
    ],
  },

  {
    id: 'gan', title: 'GANs: a two-player objective and its optimum',
    goal: 'Write the GAN objective, find the optimal discriminator $D^* = \\frac{p_{\\text{data}}}{p_{\\text{data}} + p_g}$ by calculus, and show the generator then minimises a Jensen–Shannon divergence.',
    builds: ['entropy-kl', 'minimum', 'logistic-regression'],
    blocks: [
      { md: `A **generative adversarial network** trains two networks against each other. A **generator** $G$ turns random noise into fake samples; a **discriminator** $D$ outputs the probability that a sample is real. $D$ is trained to tell real from fake, $G$ to fool it:

$$\\min_G\\max_D\\; V(D, G) = \\mathbb E_{x\\sim p_{\\text{data}}}[\\log D(x)] + \\mathbb E_{x\\sim p_g}[\\log(1 - D(x))]$$

For $D$, this is exactly the log-likelihood of a binary classifier (lesson [[#logistic-regression]]) with label 1 for real and 0 for fake.

**The best discriminator.** Fix $G$, so the fake distribution $p_g$ is fixed. $V$ is a sum (or integral) over points $x$ of $p_{\\text{data}}(x)\\log D(x) + p_g(x)\\log(1 - D(x))$, and $D(x)$ can be chosen separately at every point. Maximise $a\\log y + b\\log(1 - y)$ over $y \\in (0, 1)$: the derivative $\\frac ay - \\frac{b}{1-y}$ is zero at $y = \\frac{a}{a + b}$ (lesson [[#minimum]]; it is a maximum since the function curves down). So
$$D^*(x) = \\frac{p_{\\text{data}}(x)}{p_{\\text{data}}(x) + p_g(x)}$$
Where the data is twice as likely as the fakes, $D^* = \\frac23$.

**What the generator then minimises.** Substitute $D^*$. With $m = \\frac{p_{\\text{data}} + p_g}{2}$, the halfway mixture, each fraction is $\\frac{p}{2m}$:
$$V(D^*, G) = \\mathbb E_{p_{\\text{data}}}\\!\\left[\\log\\frac{p_{\\text{data}}}{2m}\\right] + \\mathbb E_{p_g}\\!\\left[\\log\\frac{p_g}{2m}\\right] = -\\log 4 + D_{KL}(p_{\\text{data}}\\|m) + D_{KL}(p_g\\|m)$$
The two KL terms (lesson [[#entropy-kl]]) together are twice the **Jensen–Shannon divergence**, $\\text{JS}(p, q) = \\frac12D_{KL}(p\\|m) + \\frac12D_{KL}(q\\|m)$, a symmetric, always finite cousin of KL that is zero exactly when $p = q$. So the generator's best move is $p_g = p_{\\text{data}}$, where $V = -\\log 4$ and $D^* = \\frac12$ everywhere: the discriminator can only guess.

**In practice** the inner maximisation is never finished; the two networks take alternating gradient steps, which can oscillate or collapse onto a few modes. And early on, when fakes are obviously fake, $\\log(1 - D(G(z)))$ is flat, so generators instead maximise $\\log D(G(z))$ (the "non-saturating" loss): same fixed point, stronger gradients.` },
      { figure: 'GANFig', caption: 'A data distribution and a generator\'s distribution over a few points, with the optimal discriminator $D^*$ (bars). Move the generator\'s probabilities toward the data: $V$ falls to $-\\log 4$ and $D^*$ flattens to ½.' },
      {
        code: {
          file: 'deep.py', fn: 'gan_value', notes: [
            ['def gan_value(d, p_data, p_gen):', ['The discriminator\'s outputs at a few points, and the two distributions.']],
            ['return sum(p * math.log(d[i]) for i, p in enumerate(p_data) if p > 0) + sum(q * math.log(1 - d[i]) for i, q in enumerate(p_gen) if q > 0)', ['$\\mathbb E_{\\text{data}}[\\log D] + \\mathbb E_g[\\log(1 - D)]$ as two weighted sums.']],
          ],
        },
      },
      {
        code: {
          file: 'deep.py', fn: 'optimal_discriminator', notes: [
            ['def optimal_discriminator(p_data, p_gen):', ['The two distributions.']],
            ['return [p / (p + q) if p + q > 0 else 0.5 for p, q in zip(p_data, p_gen)]', ['$D^* = \\frac{p}{p + q}$ at each point, from setting the derivative to zero.'], { tex: 'D^*(x) = \\frac{p_{\\text{data}}(x)}{p_{\\text{data}}(x) + p_g(x)}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Data puts probability 0.5 on a point where the generator puts 0.2. What is $D^*$ there? (4 decimals)',
          answer: optimalDiscriminator([0.5], [0.2])[0], tolerance: 0.00006, compute: () => optimalDiscriminator([0.5], [0.2])[0],
          explain: '$\\frac{0.5}{0.7} = 0.7143$.',
        },
      },
      {
        predict: {
          prompt: 'If $p_g = p_{\\text{data}}$, what is $V(D^*, G)$? (4 decimals)',
          answer: -Math.log(4), tolerance: 0.00006, compute: () => ganValue(optimalDiscriminator([0.2, 0.5, 0.3], [0.2, 0.5, 0.3]), [0.2, 0.5, 0.3], [0.2, 0.5, 0.3]),
          explain: '$-\\log 4 = -1.3863$: with $D^* = \\frac12$ everywhere, $\\log\\frac12 + \\log\\frac12$.',
        },
      },
      { note: 'GAN: $\\min_G\\max_D\\,\\mathbb E_{\\text{data}}\\log D + \\mathbb E_g\\log(1 - D)$. Pointwise calculus gives $D^* = p_{\\text{data}}/(p_{\\text{data}} + p_g)$; then $V = -\\log 4 + 2\\,\\text{JS}(p_{\\text{data}}\\|p_g)$, minimised when $p_g = p_{\\text{data}}$.' },
    ],
  },

  {
    id: 'diffusion', title: 'Diffusion models: adding noise, and learning to remove it',
    goal: 'Derive the closed form $x_t = \\sqrt{\\bar\\alpha_t}\\,x_0 + \\sqrt{1 - \\bar\\alpha_t}\\,\\varepsilon$ of the forward noising process by induction, and read the noise-prediction training loss.',
    builds: ['clt', 'sums-of-variables', 'induction', 'vae-elbo'],
    blocks: [
      { md: `Image generators like Stable Diffusion learn to turn pure noise into a picture by **undoing** a process that turns a picture into pure noise.

**The forward process.** Take a data point $x_0$ (an image, but one number is enough to follow the maths). For $t = 1, \\dots, T$, shrink it slightly and add a little Gaussian noise:
$$x_t = \\sqrt{1 - \\beta_t}\\;x_{t-1} + \\sqrt{\\beta_t}\\;\\varepsilon_t, \\qquad \\varepsilon_t \\sim \\mathcal N(0, 1) \\text{ independent}$$
with small $\\beta_t$ (the **noise schedule**). The shrink factor is chosen so that if $x_{t-1}$ has variance 1, so does $x_t$: $(1 - \\beta_t) + \\beta_t = 1$ (lesson [[#sums-of-variables]]: independent variances add, scaling by $c$ multiplies by $c^2$).

**Jumping straight to step $t$.** Let $\\alpha_t = 1 - \\beta_t$ and $\\bar\\alpha_t = \\alpha_1\\alpha_2\\cdots\\alpha_t$. Claim:
$$x_t = \\sqrt{\\bar\\alpha_t}\\;x_0 + \\sqrt{1 - \\bar\\alpha_t}\\;\\varepsilon, \\qquad \\varepsilon \\sim \\mathcal N(0, 1)$$
Induction (lesson [[#induction]]). For $t = 1$ it is the definition. Suppose it holds for $t - 1$. Then
$$x_t = \\sqrt{\\alpha_t}\\left(\\sqrt{\\bar\\alpha_{t-1}}\\,x_0 + \\sqrt{1 - \\bar\\alpha_{t-1}}\\,\\varepsilon'\\right) + \\sqrt{1 - \\alpha_t}\\,\\varepsilon_t = \\sqrt{\\bar\\alpha_t}\\,x_0 + \\underbrace{\\sqrt{\\alpha_t(1 - \\bar\\alpha_{t-1})}\\,\\varepsilon' + \\sqrt{1 - \\alpha_t}\\,\\varepsilon_t}_{\\text{two independent normals}}$$
A sum of independent normals is normal (its moment generating function, lesson [[#clt]], is a product of $e^{a s^2/2}$ and $e^{b s^2/2}$, which is $e^{(a+b)s^2/2}$), with variance $\\alpha_t(1 - \\bar\\alpha_{t-1}) + 1 - \\alpha_t = 1 - \\alpha_t\\bar\\alpha_{t-1} = 1 - \\bar\\alpha_t$. So the noise part is $\\sqrt{1 - \\bar\\alpha_t}\\,\\varepsilon$. $\\blacksquare$

As $t$ grows, $\\bar\\alpha_t \\to 0$: the signal fades and $x_T$ is pure $\\mathcal N(0, 1)$ noise, whatever $x_0$ was.

**Learning to reverse it.** A network $\\varepsilon_\\theta(x_t, t)$ is trained to **predict the noise** that was added. Pick a training image $x_0$, a random step $t$ and fresh noise $\\varepsilon$; form $x_t$ in one jump by the closed form; minimise
$$\\mathcal L = \\mathbb E_{x_0, t, \\varepsilon}\\big\\|\\varepsilon - \\varepsilon_\\theta(x_t, t)\\big\\|^2$$
Plain squared error, cheap because the closed form skips the $t$ steps. This loss is a simplified, reweighted form of a VAE-style ELBO (lesson [[#vae-elbo]]) for the whole chain; lesson [[#paper-ddpm]] proves it from the paper, step by step. To generate, start from noise $x_T$ and step backward, at each step using the predicted noise to estimate a slightly cleaner $x_{t-1}$.` },
      { figure: 'DiffusionFig', caption: 'A 2D dataset (a ring of points) noised forward. Slide $t$: the ring blurs into a round Gaussian cloud as $\\bar\\alpha_t$ (bar) falls from 1 to 0.' },
      {
        code: {
          file: 'deep.py', fn: 'alpha_bar', notes: [
            ['def alpha_bar(betas, t):', ['The noise schedule and a step.']],
            ['a = 1.0', ['Running product.']],
            ['for b in betas[:t]:', ['Steps $1..t$…']],
            ['a *= 1 - b', ['…each keeps a fraction $\\alpha_s = 1 - \\beta_s$ of the signal\'s variance.']],
            ['return a', ['$\\bar\\alpha_t = \\prod_{s\\le t}\\alpha_s$.'], { tex: '\\bar\\alpha_t = \\prod_{s=1}^t(1 - \\beta_s)' }],
          ],
        },
      },
      {
        code: {
          file: 'deep.py', fn: 'noisy_sample', notes: [
            ['def noisy_sample(x0, t, betas, eps):', ['Clean value, step, schedule, and a standard normal draw.']],
            ['a = alpha_bar(betas, t)', ['How much signal survives.']],
            ['return math.sqrt(a) * x0 + math.sqrt(1 - a) * eps', ['The closed form: one jump instead of $t$ steps.'], { tex: 'x_t = \\sqrt{\\bar\\alpha_t}x_0 + \\sqrt{1 - \\bar\\alpha_t}\\varepsilon' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'With $\\beta = 0.02$ at every step, what is $\\bar\\alpha_{30}$? (4 decimals)',
          answer: alphaBar(Array(50).fill(0.02), 30), tolerance: 0.00006, compute: () => alphaBar(Array(50).fill(0.02), 30),
          explain: `$0.98^{30} = ${f(alphaBar(Array(50).fill(0.02), 30))}$: about 55% of the signal's variance remains.`,
        },
      },
      {
        predict: {
          prompt: 'Noise $x_0 = 1.5$ to step 30 of that schedule with $\\varepsilon = -0.7$. What is $x_{30}$? (4 decimals)',
          answer: noisySample(1.5, 30, Array(50).fill(0.02), -0.7), tolerance: 0.00006, compute: () => noisySample(1.5, 30, Array(50).fill(0.02), -0.7),
          explain: `$\\sqrt{${f(alphaBar(Array(50).fill(0.02), 30))}} \\times 1.5 + \\sqrt{1 - ${f(alphaBar(Array(50).fill(0.02), 30))}} \\times (-0.7) = ${f(noisySample(1.5, 30, Array(50).fill(0.02), -0.7))}$.`,
        },
      },
      { note: 'Forward: $x_t = \\sqrt{1-\\beta_t}x_{t-1} + \\sqrt{\\beta_t}\\varepsilon_t$; by induction $x_t = \\sqrt{\\bar\\alpha_t}x_0 + \\sqrt{1-\\bar\\alpha_t}\\varepsilon$ (independent normal variances add). Train $\\varepsilon_\\theta$ to predict the noise: $\\mathbb E\\|\\varepsilon - \\varepsilon_\\theta(x_t, t)\\|^2$. Generate by denoising backward from pure noise.' },
    ],
  },

  {
    id: 'bellman-rl', title: 'Markov decision processes and the Bellman equations',
    goal: 'Define an MDP and a policy\'s value, derive the Bellman expectation and optimality equations from $G_t = r_t + \\gamma G_{t+1}$, and prove value iteration converges because the Bellman update is a $\\gamma$-contraction.',
    builds: ['markov-chains', 'dynamic-programming', 'expectation'],
    blocks: [
      { md: `**A Markov decision process** (MDP) is a Markov chain (lesson [[#markov-chains]]) with choices: in state $s$ an agent picks an action $a$, receives a reward $R(s, a)$, and moves to $s'$ with probability $P(s' \\mid s, a)$. A **policy** $\\pi(a \\mid s)$ says how it chooses. Its goal is a large **return**, the discounted sum of future rewards:
$$G_t = r_t + \\gamma r_{t+1} + \\gamma^2r_{t+2} + \\dots = r_t + \\gamma\\,G_{t+1}$$
with discount $0 \\le \\gamma < 1$ (lesson [[#induction]]'s geometric series keeps it finite: at most $\\frac{r_{\\max}}{1 - \\gamma}$).

**Values.** The **value** of a state under policy $\\pi$ is the expected return from there: $V^\\pi(s) = \\mathbb E_\\pi[G_t \\mid s_t = s]$. The **action value** $Q^\\pi(s, a)$ is the same after first taking action $a$.

**The Bellman expectation equation.** Take expectations of $G_t = r_t + \\gamma G_{t+1}$ given $s_t = s$; by linearity and the Markov property (what happens after $s_{t+1}$ depends only on $s_{t+1}$):
$$V^\\pi(s) = \\sum_a\\pi(a \\mid s)\\Big[R(s, a) + \\gamma\\sum_{s'}P(s' \\mid s, a)\\,V^\\pi(s')\\Big]$$
The value of a state is the expected immediate reward plus the discounted value of where you land.

**The Bellman optimality equation.** The best possible value picks the best action at every state (Bellman's principle, lesson [[#dynamic-programming]]):
$$V^*(s) = \\max_a\\Big[R(s, a) + \\gamma\\sum_{s'}P(s' \\mid s, a)\\,V^*(s')\\Big]$$
and acting greedily with respect to $V^*$ is optimal.

**Value iteration converges: a proof.** Call the right-hand side $(TV)(s)$ and repeat $V \\leftarrow TV$. For any two value tables $V$ and $U$, and any state, the bracketed terms for the same action differ by $\\gamma\\sum_{s'}P(s'\\mid s, a)(V(s') - U(s'))$, which is at most $\\gamma\\max_{s'}|V(s') - U(s')|$ in size (a weighted average can't exceed the largest entry). Taking the max over actions on both sides can't increase that gap (if $f(a) \\le g(a) + c$ for every $a$, then $\\max f \\le \\max g + c$). So
$$\\max_s|(TV)(s) - (TU)(s)| \\;\\le\\; \\gamma\\max_s|V(s) - U(s)|$$
$T$ is a **contraction**: it shrinks every distance by the factor $\\gamma$. Apply it to $V$ and $V^*$ (which satisfies $TV^* = V^*$): after $k$ iterations the error is at most $\\gamma^k$ times the initial error, which goes to 0. $\\blacksquare$ (The same argument shows $V^*$ is the **only** solution.) QMaze Lab's Q-learning is a sampled, one-step-at-a-time version of this update.` },
      { figure: 'ValueIterationFig', caption: 'A small grid world. Each sweep applies the Bellman optimality update to every cell; the values (shading) spread out from the goal, and the arrows show the greedy policy. The error to the final values shrinks by $\\gamma$ per sweep.' },
      {
        code: {
          file: 'deep.py', fn: 'value_iteration', notes: [
            ['def value_iteration(P, R, gamma, iters=200):', ['Transitions `P[s][a]` as lists of (probability, next state), rewards `R[s][a]`, the discount.']],
            ['V = [0.0] * len(P)', ['Start with every value at 0.']],
            ['for _ in range(iters):', ['Repeat the Bellman update…']],
            ['V = [max(R[s][a] + gamma * sum(p * V[s2] for p, s2 in P[s][a]) for a in range(len(P[s]))) for s in range(len(P))]', ['…for every state: best action\'s reward plus discounted expected next value.'], { tex: 'V(s) \\leftarrow \\max_a\\big[R(s,a) + \\gamma\\sum_{s\'}P(s\'\\mid s,a)V(s\')\\big]' }],
            ['return V', ['$V^*$, to within $\\gamma^{\\text{iters}}$ of the start\'s error.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'A two-state MDP (rewards $R = \\begin{pmatrix}0&1\\\\2&0.5\\end{pmatrix}$, $\\gamma = 0.9$; see the code\'s data). What is $V^*$ of state 1? (3 decimals)',
          answer: valueIteration(MDP_P, MDP_R, 0.9, 100)[1], tolerance: 0.0006, compute: () => valueIteration(MDP_P, MDP_R, 0.9, 100)[1],
          explain: `${f(valueIteration(MDP_P, MDP_R, 0.9, 100)[1])}: from state 1, taking action 0 collects 2 and stays, worth about $\\frac{2}{1 - 0.9} = 20$.`,
        },
      },
      {
        predict: {
          prompt: 'With $\\gamma = 0.9$, at most what fraction of the starting error remains after 50 sweeps of value iteration? (scientific notation)',
          answer: 0.9 ** 50, tolerance: 1e-5, compute: () => 0.9 ** 50,
          explain: '$0.9^{50} \\approx 0.0052$: the contraction factor compounds.',
        },
      },
      { note: 'MDP: states, actions, $P(s\'\\mid s,a)$, $R(s,a)$, discount $\\gamma$. $G_t = r_t + \\gamma G_{t+1}$ gives Bellman: $V^\\pi = $ expected reward $+ \\gamma\\,\\mathbb E V^\\pi(s\')$; optimal: max over actions. The update is a $\\gamma$-contraction, so value iteration converges to the unique $V^*$.' },
    ],
  },

  {
    id: 'policy-gradient-derivation', title: 'The policy-gradient theorem: the log-derivative trick',
    goal: 'Derive $\\nabla_\\theta J = \\mathbb E\\big[\\sum_t\\nabla\\log\\pi_\\theta(a_t\\mid s_t)\\,G_t\\big]$, see why the environment\'s dynamics drop out, and prove a baseline leaves it unbiased while cutting variance.',
    builds: ['bellman-rl', 'monte-carlo', 'exp-log-slopes'],
    blocks: [
      { md: `Value-based methods learn values and act greedily. **Policy-gradient** methods adjust a policy $\\pi_\\theta(a \\mid s)$ directly, by gradient ascent on the expected return $J(\\theta) = \\mathbb E_{\\tau\\sim\\pi_\\theta}[R(\\tau)]$, where $\\tau$ is a whole episode (trajectory) and $R(\\tau)$ its return. The difficulty: $\\theta$ changes **which** episodes happen, and the environment is a black box we can't differentiate.

**The log-derivative trick.** Write the expectation as a sum over trajectories and differentiate:
$$\\nabla_\\theta J = \\sum_\\tau\\nabla_\\theta p_\\theta(\\tau)\\,R(\\tau) = \\sum_\\tau p_\\theta(\\tau)\\,\\nabla_\\theta\\log p_\\theta(\\tau)\\,R(\\tau) = \\mathbb E_\\tau\\big[\\nabla_\\theta\\log p_\\theta(\\tau)\\,R(\\tau)\\big]$$
using $\\nabla\\log p = \\frac{\\nabla p}{p}$ (lesson [[#exp-log-slopes]] with the chain rule). The result is an **expectation**, so it can be estimated by Monte Carlo (lesson [[#monte-carlo]]): play episodes and average.

**The dynamics drop out.** A trajectory's probability is a product: $p_\\theta(\\tau) = p(s_0)\\prod_t\\pi_\\theta(a_t \\mid s_t)\\,P(s_{t+1} \\mid s_t, a_t)$. Its log is a sum, and only the policy terms depend on $\\theta$:
$$\\nabla_\\theta\\log p_\\theta(\\tau) = \\sum_t\\nabla_\\theta\\log\\pi_\\theta(a_t \\mid s_t)$$
The environment's unknown transition probabilities vanish from the gradient. You only need to differentiate your own policy.

**Causality.** An action can't affect rewards that came before it. Dropping those terms (their expectation is zero by the baseline argument below) replaces $R(\\tau)$ by the reward-to-go $G_t$:
$$\\nabla_\\theta J = \\mathbb E\\Big[\\sum_t\\nabla_\\theta\\log\\pi_\\theta(a_t \\mid s_t)\\,G_t\\Big]$$
That is **REINFORCE** (CartPole Lab): make actions that led to high returns more likely.

**Baselines.** For any $b(s)$ not depending on the action, $\\mathbb E_{a\\sim\\pi}[\\nabla\\log\\pi(a\\mid s)\\,b(s)] = b(s)\\sum_a\\pi(a\\mid s)\\frac{\\nabla\\pi(a\\mid s)}{\\pi(a\\mid s)} = b(s)\\,\\nabla\\sum_a\\pi(a\\mid s) = b(s)\\,\\nabla 1 = 0$. So subtracting a baseline from $G_t$ leaves the gradient **unbiased**, while it can greatly cut the variance. The usual choice is the value $V(s_t)$, giving the **advantage** $A_t = G_t - V(s_t)$: was this action better or worse than usual from here? That is an actor-critic method.` },
      { figure: 'PolicyGradientFig', caption: 'A three-armed bandit with a softmax policy. Each sampled action\'s $\\nabla\\log\\pi$, weighted by its reward, nudges the scores; the running average (teal) converges to the exact gradient (orange). Turn on a baseline: same average, much less scatter.' },
      {
        code: {
          file: 'deep.py', fn: 'score_function_gradient', notes: [
            ['def score_function_gradient(theta, rewards, n, seed=0):', ['Softmax scores for each action, each action\'s reward, and a sample count.']],
            ['rng = random.Random(seed)', ['Repeatable samples.']],
            ['m = max(theta)', ['Stable softmax…']],
            ['e = [math.exp(t - m) for t in theta]', ['…exponentials…']],
            ['pi = [v / sum(e) for v in e]', ['…the policy $\\pi$.']],
            ['g = [0.0] * len(theta)', ['The gradient estimate.']],
            ['for _ in range(n):', ['Sample $n$ actions:']],
            ['u, total, a = rng.random(), 0.0, len(pi) - 1', ['inverse-transform sampling (lesson [[#common-distributions]])…']],
            ['for i, p in enumerate(pi):', ['…walk the cumulative probabilities…']],
            ['total += p', ['…adding each action\'s probability…']],
            ['if u < total:', ['…until passing $u$…']],
            ['a = i', ['…that action.']],
            ['break', ['Stop the walk.']],
            ['for k in range(len(theta)):', ['For a softmax, $\\nabla_{\\theta_k}\\log\\pi(a) = \\mathbb 1[k = a] - \\pi_k$…']],
            ['g[k] += rewards[a] * ((1.0 if k == a else 0.0) - pi[k]) / n', ['…weighted by the reward and averaged.'], { tex: '\\nabla J \\approx \\frac1n\\sum r(a)\\,\\nabla\\log\\pi(a)' }],
            ['return g', ['An unbiased estimate of $\\nabla J$.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Three actions with rewards $1, 3, -2$ and a uniform policy ($\\theta = 0$): what is the exact gradient\'s second entry, $\\pi_2(r_2 - J)$? (4 decimals)',
          answer: (1 / 3) * (3 - 2 / 3), tolerance: 0.00006, compute: () => (1 / 3) * (3 - 2 / 3),
          explain: '$J = \\frac{1 + 3 - 2}{3} = \\frac23$; $\\frac13(3 - \\frac23) = 0.7778$. Raising the best action\'s score raises the expected reward most.',
        },
      },
      {
        predict: {
          prompt: 'The score-function estimate with 500 samples (seed 4, $\\theta = (0.2, -0.1, 0.4)$): its second entry? (3 decimals)',
          answer: scoreFunctionGradient([0.2, -0.1, 0.4], [1, 3, -2], 500, 4)[1], tolerance: 0.0006, compute: () => scoreFunctionGradient([0.2, -0.1, 0.4], [1, 3, -2], 500, 4)[1],
          explain: `${f(scoreFunctionGradient([0.2, -0.1, 0.4], [1, 3, -2], 500, 4)[1])}: a noisy estimate of the true value; more samples (or a baseline) tighten it.`,
        },
      },
      { note: '$\\nabla J = \\mathbb E[\\nabla\\log p_\\theta(\\tau)R(\\tau)]$ (log-derivative trick); dynamics drop out, leaving $\\sum_t\\nabla\\log\\pi(a_t\\mid s_t)G_t$ (REINFORCE). Baselines: $\\mathbb E[\\nabla\\log\\pi\\,b] = b\\nabla 1 = 0$, so subtracting $V(s)$ (advantage) is unbiased and lowers variance.' },
    ],
  },

  {
    id: 'ppo', title: 'PPO: a clipped objective for safe policy updates',
    goal: 'Build PPO\'s surrogate objective from importance sampling, read the clipped objective case by case, and see how it keeps each update close to the old policy.',
    builds: ['policy-gradient-derivation', 'monte-carlo', 'piecewise'],
    blocks: [
      { md: `Policy gradients use each batch of experience for **one** small step, because after the policy changes, the old data no longer comes from it. **Proximal Policy Optimisation** (PPO), the algorithm behind most RL from human feedback, reuses each batch for several steps, safely.

**Reusing old data: importance sampling.** The data was collected with the old policy $\\pi_{\\text{old}}$. Lesson [[#monte-carlo]]'s importance sampling corrects expectations under a new policy by weighting each sample with the **probability ratio**
$$r_t(\\theta) = \\frac{\\pi_\\theta(a_t \\mid s_t)}{\\pi_{\\text{old}}(a_t \\mid s_t)}$$
giving the **surrogate objective** $L(\\theta) = \\mathbb E_t[r_t(\\theta)A_t]$ (with $A_t$ the advantage from the last lesson). At $\\theta = \\theta_{\\text{old}}$ every ratio is 1, and $\\nabla r_t = \\frac{\\nabla\\pi_\\theta}{\\pi_{\\text{old}}} = \\nabla\\log\\pi_\\theta$ there, so $\\nabla L$ equals the policy gradient exactly. Further away, the ratios can become huge (lesson [[#monte-carlo]]'s warning) and the surrogate stops being trustworthy.

**The clip.** PPO limits how much the objective can gain from moving the ratio outside $[1 - \\epsilon, 1 + \\epsilon]$ (typically $\\epsilon = 0.2$):
$$L^{\\text{CLIP}}(\\theta) = \\mathbb E_t\\Big[\\min\\big(r_tA_t,\\; \\text{clip}(r_t, 1 - \\epsilon, 1 + \\epsilon)\\,A_t\\big)\\Big]$$
(clip from lesson [[#piecewise]]). Case by case:
- **$A_t > 0$** (a good action): the objective rises with $r_t$ only up to $1 + \\epsilon$, then goes flat. Once the action is made $1 + \\epsilon$ times as likely, there is no more reward for pushing.
- **$A_t < 0$** (a bad action): it improves by lowering $r_t$ only down to $1 - \\epsilon$, then goes flat.
- The **min** takes the more pessimistic of the clipped and unclipped values, so a change that makes things **worse** is never hidden by the clip: when $r_t$ has moved the wrong way, the unclipped term counts in full.

Where the objective is flat, its gradient is zero, so samples that have already moved far enough stop pulling. The policy can take several gradient steps on the same batch without drifting far from $\\pi_{\\text{old}}$: a cheap stand-in for a hard constraint on how far the policy moves. In RLHF, the reward also includes a penalty $\\beta\\,D_{KL}(\\pi_\\theta\\|\\pi_{\\text{ref}})$ that keeps the tuned language model close to the original one.` },
      { figure: 'PPOFig', caption: 'PPO\'s per-sample objective as a function of the ratio $r$, for a positive and a negative advantage. The clipped region is flat (no gradient); the min keeps the full penalty when the ratio moves the wrong way.' },
      {
        code: {
          file: 'deep.py', fn: 'ppo_clip', notes: [
            ['def ppo_clip(ratio, advantage, eps=0.2):', ['$r_t$, $A_t$ and the clip range.']],
            ['clipped = min(max(ratio, 1 - eps), 1 + eps)', ['$\\text{clip}(r, 1 - \\epsilon, 1 + \\epsilon)$.']],
            ['return min(ratio * advantage, clipped * advantage)', ['The pessimistic choice of the two.'], { tex: '\\min(rA,\\;\\text{clip}(r, 1\\!-\\!\\epsilon, 1\\!+\\!\\epsilon)A)' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'A good action ($A = 2$) whose ratio has reached $r = 1.5$, with $\\epsilon = 0.2$: what is the clipped objective?',
          answer: ppoClip(1.5, 2), tolerance: 1e-9, compute: () => ppoClip(1.5, 2),
          explain: '$\\min(3,\\; 1.2 \\times 2) = 2.4$: capped, and flat in $r$, so no further push.',
        },
      },
      {
        predict: {
          prompt: 'A bad action ($A = -1$) whose ratio wrongly rose to $r = 1.5$: what is the objective?',
          answer: ppoClip(1.5, -1), tolerance: 1e-9, compute: () => ppoClip(1.5, -1),
          explain: '$\\min(-1.5,\\; 1.2 \\times (-1)) = -1.5$: the unclipped, worse value counts, so the gradient still pushes the ratio back down.',
        },
      },
      { python: { program: 'deep', label: 'Run the deep-learning equations in real Python' } },
      {
        code: {
          file: 'deep.py', fn: 'show_deep', notes: [
            ['def show_deep():', ['One line per equation.']],
            ['print("convolution of 1..5 with (1, 0, -1):", conv1d([1, 2, 3, 4, 5], [1, 0, -1]))', ['Lesson [[#convolution]]: a steady slope gives a constant response.']],
            ['print("layer norm of (1, 2, 3):", layer_norm([1.0, 2.0, 3.0]))', ['Lesson [[#normalisation]]: mean 0, variance 1.']],
            ['print("InfoNCE of a confident 2 × 2 batch:", info_nce([[0.9, 0.1], [0.2, 0.8]]))', ['Lesson [[#contrastive]]: near 0 when the diagonal wins clearly.']],
            ['print("KL of N(1, 1) from N(0, 1):", kl_to_standard_normal(1.0, 0.0))', ['Lesson [[#vae-elbo]]: $\\frac12(1 + 1 - 1 - 0)$.']],
            ['print("ᾱ after two steps of β = 0.5:", alpha_bar([0.5, 0.5], 2))', ['Lesson [[#diffusion]]: $0.5 \\times 0.5$.']],
            ['print("the GAN\'s best discriminator:", optimal_discriminator([0.5, 0.5], [0.25, 0.75]))', ['Lesson [[#gan]]: $p/(p + q)$ at each point.']],
            ['print("PPO for r = 1.5, A = 2:", ppo_clip(1.5, 2.0))', ['This lesson: clipped to $1.2 \\times 2$.']],
          ],
        },
      },
      { note: 'Ratio $r_t = \\pi_\\theta/\\pi_{\\text{old}}$ (importance sampling); surrogate $\\mathbb E[r_tA_t]$ has the policy gradient at $\\theta_{\\text{old}}$. PPO: $\\min(r_tA_t, \\text{clip}(r_t, 1\\pm\\epsilon)A_t)$: flat once the ratio has moved $\\epsilon$ in the helpful direction, full penalty in the harmful one. RLHF adds a KL penalty to a reference model.' },
    ],
  },
]
