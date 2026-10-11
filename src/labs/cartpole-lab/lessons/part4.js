// Part 4: learning a policy. One neuron and gradient descent, softmax and a linear policy, the
// policy gradient derived, REINFORCE in plain Python, PyTorch's tensors and autograd, and REINFORCE
// with a network.
import { gradients, softmax, scoresOf, trainLinear } from '../engine/linear.js'
import { finish } from '../../qmaze-lab/engine/tabular.js'
import { f, s, v } from './util.js'

const linearRun = () => finish(trainLinear({ episodes: 300, seed: 0 }))
const mean = a => a.reduce((x, y) => x + y, 0) / a.length

export const PART4 = {
  id: 'part4', title: 'Part 4 · Learning a policy', lessons: [
    {
      id: 'gradient-descent', number: '4.1', title: 'One neuron and gradient descent',
      goal: 'Fit a line by gradient descent: work out a loss\'s slopes by hand, step against them, and choose a learning rate.',
      builds: ['reading-the-table'],
      blocks: [
        { md: `A table stores one number per row and learns each alone. A **function** computes its answer from the four real numbers with a handful of adjustable numbers, its **parameters** or **weights**, and changing a weight changes the answer for *every* state at once. That is generalising.

To learn with a function you need one tool: **gradient descent**. Learn it first on the smallest possible function, one **neuron** with one input:

$$\\hat y = w\\,x + b$$

a straight line with slope $w$ (the **weight**) and height $b$ (the **bias**). Given four points that lie on $y = 2x + 1$, find $w$ and $b$ without being told.` },
        { h: 'A number for "how wrong"' },
        { md: `First measure how wrong a guess is. For each point the **error** is prediction minus truth, $\\hat y_i - y_i$. Square it (so misses either way count, and big misses count a lot), and average over the points. That is the **loss**, the mean squared error:

$$L(w, b) = \\frac{1}{N}\\sum_{i=1}^{N} (w x_i + b - y_i)^2$$

Learning means making $L$ small.` },
        { h: 'Which way is downhill?' },
        { md: `Picture $L$ as a landscape over all possible $(w, b)$. From where we stand, which way is down? The **slope** in each direction tells us: the **partial derivative** $\\partial L / \\partial w$ says how much $L$ grows when $w$ is nudged up (holding $b$ still). By the chain rule (the derivative of $u^2$ is $2u$ times the derivative of $u$):

$$\\frac{\\partial L}{\\partial w} = \\frac{1}{N}\\sum_i 2\\,(w x_i + b - y_i)\\,x_i \\qquad \\frac{\\partial L}{\\partial b} = \\frac{1}{N}\\sum_i 2\\,(w x_i + b - y_i)$$

Together they are the **gradient**, $\\nabla L$: the uphill direction. So step the other way, a little:

$$w \\leftarrow w - \\eta\\,\\frac{\\partial L}{\\partial w} \\qquad b \\leftarrow b - \\eta\\,\\frac{\\partial L}{\\partial b}$$

$\\eta$ (eta) is the **learning rate**. Repeat. That is gradient descent, and it is how every neural network in the world is trained.` },
        {
          code: {
            file: 'neuron.py', from: 1, to: 29, notes: [
              ['return w * x + b', ['The neuron: $\\hat y = wx + b$.'], { tex: '\\hat y = w x + b', calc: x => [`${s(x.w)} × ${s(x.x)} + ${s(x.b)}`, x.w * x.x + x.b] }],
              ['grad_w = 0.0', ['The two slopes are sums, so start them at 0…']],
              ['grad_b = 0.0', ['…and add one point\'s share at a time.']],
              ['for x, y in zip(XS, YS):', ['Each point: its input and its true output.']],
              ['error = predict(w, b, x) - y', ['Prediction minus truth.'], { tex: 'e_i = \\hat y_i - y_i', calc: x => [`(${s(x.w)} × ${s(x.x)} + ${s(x.b)}) − ${s(x.y)}`, x.w * x.x + x.b - x.y] }],
              ['grad_w += 2 * error * x / len(XS)', ['This point\'s share of $\\partial L/\\partial w$: $2 e_i x_i / N$.'], { tex: '\\frac{\\partial L}{\\partial w} \\mathrel{+}= \\frac{2 e_i x_i}{N}', calc: x => [`${f(x.grad_w)} + 2 × ${s(x.error)} × ${s(x.x)} / 4`, x.grad_w + 2 * x.error * x.x / 4] }],
              ['grad_b += 2 * error / len(XS)', ['Its share of $\\partial L/\\partial b$: $2 e_i / N$ (the bias\'s "input" is always 1).'], { tex: '\\frac{\\partial L}{\\partial b} \\mathrel{+}= \\frac{2 e_i}{N}', calc: x => [`${f(x.grad_b)} + 2 × ${s(x.error)} / 4`, x.grad_b + 2 * x.error / 4] }],
              ['return grad_w, grad_b', ['The gradient: both slopes.']],
              ['w, b = 0.0, 0.0', ['Start anywhere: here at 0, 0.']],
              ['for step in range(steps):', ['200 steps downhill.']],
              ['grad_w, grad_b = gradients(w, b)', ['Which way is uphill, from here?']],
              ['w = w - rate * grad_w', ['Step against the slope.'], { tex: 'w \\leftarrow w - \\eta\\,\\partial L/\\partial w', calc: x => [`${s(x.w)} − ${f(x.rate)} × ${s(x.grad_w)}`, x.w - x.rate * x.grad_w] }],
              ['b = b - rate * grad_b', ['And for the bias.'], { tex: 'b \\leftarrow b - \\eta\\,\\partial L/\\partial b', calc: x => [`${s(x.b)} − ${f(x.rate)} × ${s(x.grad_b)}`, x.b - x.rate * x.grad_b] }],
              ['return w, b', ['After 200 steps: $w = 2.00006$, $b = 0.99988$. The line was found.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'At the start, $w = 0$ and $b = 0$, with the points $(0, 1), (1, 3), (2, 5), (3, 7)$. What is $\\partial L / \\partial w$?',
            answer: gradients(0, 0)[0], compute: () => gradients(0, 0)[0],
            explain: 'Every prediction is 0, so the errors are $-1, -3, -5, -7$. $\\partial L/\\partial w = \\frac{2}{4}(-1 \\cdot 0 - 3 \\cdot 1 - 5 \\cdot 2 - 7 \\cdot 3) = \\frac{2}{4}(-34) = -17$. Negative: raising $w$ lowers the loss, so the step $w - \\eta(-17)$ raises $w$.',
            misconceptions: [{ answer: -8, feedback: 'That is $\\partial L / \\partial b$. For $w$ each error is multiplied by its $x$.' }],
          },
        },
        { figure: 'NeuronFig', caption: 'Step, and watch the line close in. Then push the rate past 0.14: the steps overshoot and the loss explodes. Too small, and it crawls.' },
        { python: { program: 'neuron', label: 'Step through gradient descent in real Python' } },
        { note: '**Gradient descent**: measure wrongness with a loss, work out its slope for every parameter (the gradient), step each parameter a little against its slope, repeat. The learning rate sets the step: too big overshoots, too small crawls.' },
      ],
    },

    {
      id: 'softmax-policy', number: '4.2', title: 'Scores, softmax and a linear policy',
      goal: 'Turn weights and a state into a score per push with a dot product, turn scores into probabilities with softmax, and sample a push.',
      builds: ['gradient-descent'],
      blocks: [
        { md: `Parts 3 learned **values** and acted greedily on them. Now learn the **policy itself**: a function that, given the state, gives a probability for each push,

$$\\pi(a \\mid s) = \\text{the probability of pushing } a \\text{ in state } s$$

($\\pi$ is the usual letter for a policy.) The simplest such function: give each push a **score** that is a weighted sum of the four numbers, its own 4 weights times the state:

$$z_a = w_{a,1} x + w_{a,2} \\dot x + w_{a,3} \\theta + w_{a,4} \\dot\\theta = \\mathbf{w}_a \\cdot \\mathbf{s}$$

That sum of products is a **dot product**. Two pushes, 4 weights each: 8 weights describe the whole policy.` },
        {
          code: {
            file: 'linear_policy.py', fn: 'scores_of', notes: [
              ['return [sum(w * v for w, v in zip(row, state)) for row in weights]', ['Two loops in one line. Outer: `for row in weights`, one score per push. Inner: `zip(row, state)` pairs each weight with its number, `w * v` multiplies them and `sum` adds the four products.'], { tex: 'z_a = \\mathbf w_a \\cdot \\mathbf s = \\sum_i w_{a,i}\\,s_i', calc: x => [`[${x.weights.map(row => row.map((w, i) => `${f(w)}×${s(x.state[i])}`).join(' + ')).join(',  ')}]`, scoresOf(x.weights, x.state)] }],
            ],
          },
        },
        { md: `Scores can be any numbers; probabilities must be positive and add up to 1. **Softmax** converts: raise $e$ to each score (always positive), then divide by the total (so they add to 1):

$$\\pi(a \\mid s) = \\frac{e^{z_a}}{\\sum_b e^{z_b}}$$

A higher score gets a higher probability, but never exactly 0 or 1: the policy always explores a little, all by itself. And adding the same number to every score changes nothing, which the code uses to stay safe: it subtracts the largest score first, so $e^{\\text{big}}$ can never overflow.` },
        {
          code: {
            file: 'linear_policy.py', fn: 'softmax', notes: [
              ['top = max(scores)', ['The largest score.']],
              ['powers = [math.exp(s - top) for s in scores]', ['$e^{z_a - \\max z}$: the largest becomes $e^0 = 1$, the rest smaller. Same probabilities, no overflow.'], { tex: 'e^{z_a - \\max_b z_b}', calc: x => [`[${x.scores.map(z => `e^(${f(z)} − ${f(x.top)})`).join(', ')}]`, x.scores.map(z => Math.exp(z - x.top))] }],
              ['total = sum(powers)', ['Their sum.'], { calc: x => [x.powers.map(f).join(' + '), x.powers.reduce((a, b) => a + b, 0)] }],
              ['return [p / total for p in powers]', ['Each divided by the total: probabilities that add up to 1.'], { tex: '\\pi(a\\mid s) = \\frac{e^{z_a}}{\\sum_b e^{z_b}}', calc: x => [`[${x.powers.map(p => `${f(p)} / ${f(x.total)}`).join(', ')}]`, x.powers.map(p => p / x.total)] }],
            ],
          },
        },
        { figure: 'SoftmaxFig', caption: 'Move the scores. Equal scores: ½ each. A difference of 1: about 0.73 against 0.27. A difference of 5: about 0.993.' },
        {
          predict: {
            prompt: 'Scores are $[1, 0]$. What is $\\pi(\\text{left})$, the first probability? (4 decimals)',
            answer: softmax([1, 0])[0], tolerance: 0.0001, compute: () => softmax([1, 0])[0],
            explain: '$e^1 / (e^1 + e^0) = 2.7183 / 3.7183 = 0.7311$.',
          },
        },
        { md: `To act, **sample** from the probabilities: draw a random number $u$ between 0 and 1, push left if $u < \\pi(\\text{left})$, else right. The training loop does exactly that (lesson 4.4).

With all 8 weights at zero, both scores are 0 and $\\pi = \\tfrac12$ each: the untrained policy is a coin toss.` },
        {
          choice: {
            prompt: 'Weights: left $[0, 0, -1, -2]$, right $[0, 0, 1, 2]$. In which state is pushing right most likely?',
            options: [
              { text: '$\\theta = 0.05$, $\\dot\\theta = 0.5$: leaning right and tipping right', why: 'Yes: score(right) $= 0.05 + 1.0 = 1.05$, score(left) $= -1.05$, so π(right) $= e^{1.05}/(e^{1.05}+e^{-1.05}) \\approx 0.89$. These weights encode "lean ahead".' },
              { text: '$\\theta = 0.05$, $\\dot\\theta = -0.5$', why: 'Score(right) $= 0.05 - 1.0 = -0.95$: tipping back left, so left is likelier.' },
              { text: '$\\theta = 0$, $\\dot\\theta = 0$', why: 'Both scores are 0: exactly ½.' },
              { text: '$x = 2$, $\\theta = 0$', why: 'The $x$ weights are 0: the cart\'s position doesn\'t affect the scores at all.' },
            ],
            answer: 0,
          },
        },
        { note: 'A **linear policy**: scores $z_a = \\mathbf w_a \\cdot \\mathbf s$, probabilities $\\pi(a\\mid s) = \\text{softmax}(z)_a$. 8 weights for the whole policy, and every weight affects every state: that is generalisation.' },
      ],
    },

    {
      id: 'policy-gradient', number: '4.3', title: 'The policy gradient',
      goal: 'Derive the REINFORCE gradient with the log-derivative trick, compute $\\partial \\log\\pi / \\partial w$ for a linear softmax policy, and explain the baseline.',
      builds: ['softmax-policy', 'return-discount'],
      blocks: [
        { md: `We want weights that make the expected return large. Call it $J(\\mathbf w)$, the average return the policy earns. Gradient descent needs $\\nabla J$, but $J$ depends on the weights only through which pushes get chosen, and on physics we can't differentiate. How can we get its gradient?

**The log-derivative trick.** Take any random choice $a$ with probability $p(a)$ and a payoff $f(a)$. The expected payoff is $\\sum_a p(a) f(a)$, so its gradient is $\\sum_a \\nabla p(a)\\, f(a)$. Now use $\\nabla p = p\\,\\nabla \\log p$ (the chain rule: $\\nabla \\log p = \\nabla p / p$):

$$\\nabla \\sum_a p(a) f(a) = \\sum_a p(a)\\, f(a)\\, \\nabla \\log p(a) = \\mathbb{E}\\left[\\, f(a)\\, \\nabla \\log p(a) \\,\\right]$$

An **average over choices actually made**: play, see the payoff, multiply by $\\nabla \\log p$ of what was chosen. No need to know how the payoff arises. Applied to a whole game, each push $a_t$ is judged by the return that followed it, $G_t$:

$$\\nabla J = \\mathbb{E}\\left[\\sum_t G_t\\, \\nabla_{\\mathbf w} \\log \\pi(a_t \\mid s_t)\\right]$$

That is the **policy gradient theorem** in its simplest form, and **REINFORCE** (Williams, 1992) uses it directly: play a game, then step the weights *up* this gradient (ascent: we want more return).` },
        { h: 'The slope of log π, worked out' },
        { md: `For softmax, $\\log \\pi(a \\mid s) = z_a - \\log \\sum_b e^{z_b}$. Differentiate with respect to score $z_k$:

$$\\frac{\\partial \\log \\pi(a\\mid s)}{\\partial z_k} = \\mathbb{1}[k = a] - \\pi(k \\mid s)$$

($\\mathbb 1[k = a]$ is 1 if $k$ is the action taken, else 0.) For the action taken: $1 - \\pi(a)$, positive: raise its score. For the other: $-\\pi(k)$, negative: lower it. And since $z_k = \\mathbf w_k \\cdot \\mathbf s$, the chain rule gives one more factor, the state:

$$\\frac{\\partial \\log \\pi(a\\mid s)}{\\partial w_{k,i}} = \\big(\\mathbb{1}[k = a] - \\pi(k\\mid s)\\big)\\, s_i$$

Every symbol here is a number the program already has.` },
        { h: 'The baseline' },
        { md: `In CartPole every $G_t$ is positive (rewards are all +1), so raw REINFORCE pushes **every** action up, the good ones just a bit more. It works, but slowly and noisily. Subtract a **baseline** $b$, here the game's average return, and use the **advantage** $G_t - b$ instead: better-than-average steps go up, worse ones down.

It doesn't bias the gradient: $\\sum_a \\pi(a)\\,\\nabla\\log\\pi(a) = \\sum_a \\nabla\\pi(a) = \\nabla 1 = 0$, so subtracting a constant subtracts zero on average. It only removes noise.` },
        {
          code: {
            file: 'linear_policy.py', fn: 'reinforce_step', notes: [
              ['baseline = sum(returns) / len(returns)', ['The average return over the game\'s steps.'], { tex: 'b = \\frac1T\\sum_t G_t', calc: x => [`sum of ${x.returns.length} returns / ${x.returns.length}`, x.returns.reduce((a, c) => a + c, 0) / x.returns.length] }],
              ['for state, action, probs, G in zip(states, actions, chances, returns):', ['Every step of the game: what was seen, what was done, the probabilities the policy gave **then**, and the return that followed.']],
              ['advantage = G - baseline', ['How much better than this game\'s average this step\'s future was.'], { tex: 'A_t = G_t - b', calc: x => [`${f(x.G)} − ${f(x.baseline)}`, x.G - x.baseline] }],
              ['for a in range(len(weights)):', ['Each push\'s row of weights.']],
              ['slope = (1.0 if a == action else 0.0) - probs[a]', ['$\\partial \\log\\pi(a_t)/\\partial z_a$: $1 - \\pi$ for the push made, $-\\pi$ for the other.'], { tex: '\\mathbb 1[a = a_t] - \\pi(a\\mid s_t)', logic: 'For the push that was made: 1 minus its probability (raise it). For the other push: minus its probability (lower it).', calc: x => [`${x.a === x.action ? '1.0' : '0.0'} − ${f(x.probs[x.a])}`, (x.a === x.action ? 1 : 0) - x.probs[x.a]] }],
              ['for i in range(len(state)):', ['Each of the 4 numbers.']],
              ['weights[a][i] += rate * advantage * slope * state[i] / len(states)', ['Gradient **ascent**: `+=`. Rate × advantage × $\\partial\\log\\pi/\\partial w_{a,i}$, averaged over the game\'s steps.'], { tex: 'w_{a,i} \\mathrel{+}= \\eta\\,\\frac{A_t\\,(\\mathbb 1[a=a_t]-\\pi_a)\\,s_i}{T}', calc: x => [`${f(x.weights[x.a][x.i])} + ${f(x.rate)} × ${s(x.advantage)} × ${s(x.slope)} × ${s(x.state[x.i])} / ${x.states.length}`, x.weights[x.a][x.i] + x.rate * x.advantage * x.slope * x.state[x.i] / x.states.length] }],
              ['return baseline', ['For showing.']],
            ],
          },
        },
        { figure: 'PolicyGradientFig', caption: 'One step on one move. Positive advantage: the action taken becomes likelier in this state. Negative: less likely. The two rows of weights always move by opposite amounts.' },
        {
          predict: {
            prompt: 'The policy gave $\\pi = [0.3, 0.7]$ and the agent pushed **left** (action 0). What is the slope $\\partial \\log\\pi(a_t)/\\partial z_1$ for the **right** push\'s score?',
            answer: -0.7, tolerance: 1e-9, compute: () => (1 === 0 ? 1 : 0) - softmax([Math.log(0.3), Math.log(0.7)])[1],
            explain: 'Right was not the action taken: $0 - \\pi(\\text{right}) = -0.7$. (For left: $1 - 0.3 = 0.7$. The two always add up to 0.)',
            misconceptions: [{ answer: 0.3, feedback: 'That is $1 - \\pi(\\text{right})$, the slope if right had been taken. It wasn\'t: use $0 - \\pi(\\text{right})$.' }],
          },
        },
        {
          mathCode: [
            ['J(\\mathbf w)', '(not computed)', 'the expected return: what we want to increase'],
            ['G_t', 'returns[t]', 'the return after step $t$'],
            ['b', 'baseline', 'the average return, subtracted'],
            ['\\mathbb 1[a = a_t] - \\pi(a\\mid s_t)', 'slope', '$\\partial\\log\\pi(a_t\\mid s_t)/\\partial z_a$'],
            ['\\eta\\,A_t\\,\\partial\\log\\pi/\\partial w_{a,i}', 'rate * advantage * slope * state[i]', 'one step\'s share of the update'],
          ],
        },
        { note: 'The **policy gradient**: $\\nabla J = \\mathbb E[\\sum_t A_t \\nabla \\log\\pi(a_t\\mid s_t)]$, from the log-derivative trick. For a linear softmax policy, $\\partial\\log\\pi/\\partial w_{k,i} = (\\mathbb 1[k=a]-\\pi_k)\\,s_i$. A baseline removes noise without bias.' },
      ],
    },

    {
      id: 'reinforce-plain', number: '4.4', title: 'REINFORCE in plain Python',
      goal: 'Read `train_linear` as play-a-game-then-update, train it in the browser, and read the learned weights as a rule.',
      builds: ['policy-gradient'],
      blocks: [
        { md: `REINFORCE needs the whole game before it can update (each $G_t$ depends on everything after step $t$). So: play a game, sampling pushes from the policy and remembering everything; then work out the returns; then one update. No libraries beyond \`math\` and \`random\`.` },
        {
          code: {
            file: 'linear_policy.py', fn: 'train_linear', notes: [
              ['rng = random.Random(seed)', ['Random numbers for sampling pushes.']],
              ['env = CartPole()', ['The real world, all four real numbers: no slots any more.']],
              ['weights = [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]]', ['8 weights, all 0: a coin-toss policy to start.']],
              ['lengths = []', ['The learning curve.']],
              ['for episode in range(episodes):', ['One game, then one update, 300 times.']],
              ['state, info = env.reset(seed=seed if episode == 0 else None)', ['Start a game.']],
              ['states, actions, chances, rewards = [], [], [], []', ['Four empty lists, to remember the game.']],
              ['done = False', ['The usual loop.']],
              ['while not done:', ['Play to the end.']],
              ['probs = softmax(scores_of(weights, state))', ['The policy\'s probabilities in this state.'], { tex: '\\pi(\\cdot\\mid s) = \\text{softmax}(\\mathbf W \\mathbf s)', calc: x => [`softmax(scores of ${v(x.state)})`, softmax(scoresOf(x.weights, x.state))] }],
              ['action = 0 if rng.random() < probs[0] else 1', ['**Sample**: left with probability π(left).'], { logic: 'Draw a random number between 0 and 1: if it is below π(left), push left; otherwise push right. So each push is chosen with exactly its probability.' }],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['Act.']],
              ['states.append(state)', ['Remember what was seen…']],
              ['actions.append(action)', ['…what was done…']],
              ['chances.append(probs)', ['…the probabilities used (the gradient needs them)…']],
              ['rewards.append(reward)', ['…and what it paid.']],
              ['state = next_state', ['Move on.']],
              ['done = terminated or truncated', ['Over?']],
              ['returns = all_returns(rewards, gamma)', ['Lesson 1.5\'s backwards walk: $G_t$ for every step.']],
              ['reinforce_step(weights, states, actions, chances, returns, rate)', ['One update from the whole game (lesson 4.3).']],
              ['lengths.append(len(rewards))', ['This game\'s length.']],
              ['return weights, lengths', ['The learned policy and the curve.']],
            ],
          },
        },
        { figure: 'LinearTrainer', caption: 'The same program in the browser, with Python\'s random numbers. Train it, then watch the greedy policy (always the likelier push) play a new game.' },
        {
          predict: {
            prompt: 'Train for 300 games with seed 0. What is the average length of the **last 50** games? (2 decimals)',
            answer: mean(linearRun().lengths.slice(-50)), tolerance: 0.005, compute: () => mean(linearRun().lengths.slice(-50)),
            explain: 'About 371, up from 54 in the first 50 games. A policy of 8 numbers, learned from "+1 per step" with nothing but `math.exp` and a random generator.',
          },
        },
        { md: `Now read the weights. After 300 games (seed 0) the right row minus the left row is about

$$2 \\times (-0.01,\\ 0.51,\\ 1.62,\\ 2.82) \\quad\\text{for}\\quad (x,\\ \\dot x,\\ \\theta,\\ \\dot\\theta)$$

so the policy prefers right when $1.62\\,\\theta + 2.82\\,\\dot\\theta + 0.51\\,\\dot x > 0$. Divide by 1.62: $\\theta + 1.74\\,\\dot\\theta + 0.32\\,\\dot x > 0$. That is **"lean ahead"**, looking further ahead than ours (1.74 against 0.25) and also using the cart's speed. Found by trial and error from the reward alone, and readable because the policy is linear.` },
        { python: { program: 'linear', label: 'Step through REINFORCE in real Python, every weight update worked out' } },
        { note: '**REINFORCE**: play a whole game sampling from π, compute $G_t$ backwards, then step every weight by $\\eta\\,A_t\\,\\partial\\log\\pi(a_t\\mid s_t)/\\partial w$. With a linear policy the learned weights read as a rule, and it is "lean ahead".' },
      ],
    },

    {
      id: 'pytorch', number: '4.5', title: 'PyTorch: tensors and autograd',
      goal: 'Use PyTorch tensors, let autograd compute gradients, check them against the hand-derived ones, and know what `backward`, `.grad` and `no_grad` do.',
      builds: ['gradient-descent'],
      blocks: [
        { md: `Deriving gradients by hand is fine for 8 weights and a softmax. For a network with thousands of weights and several layers it is slow and error-prone. **PyTorch** does it for you.

**Tensors** are PyTorch's arrays, like NumPy's:

\`\`\`python
import torch
x = torch.tensor([0.0, 1.0, 2.0, 3.0])     # a 1-D tensor of 4 floats
x * 2 + 1                                   # works on every element: tensor([1., 3., 5., 7.])
torch.tensor((0.02, -0.4, 0.05, 0.3))       # a CartPole state as a tensor
\`\`\`

**Autograd**: mark a tensor with \`requires_grad=True\` and PyTorch records every operation done with it. Then \`.backward()\` on a final single number works back through the record with the chain rule and stores $\\partial(\\text{that number})/\\partial(\\text{tensor})$ in the tensor's \`.grad\`.` },
        {
          code: {
            file: 'torch_neuron.py', fn: 'autograd_check', notes: [
              ['weight = torch.tensor(w, requires_grad=True)', ['A tensor holding one number, with recording turned on: PyTorch will be able to say how the loss depends on it.']],
              ['bias = torch.tensor(b, requires_grad=True)', ['The same for the bias.']],
              ['xs = torch.tensor(XS)', ['The 4 inputs as a tensor. No `requires_grad`: they are data, not something to learn.']],
              ['ys = torch.tensor(YS)', ['The 4 true outputs.']],
              ['predictions = weight * xs + bias', ['All 4 predictions at once: the single number `weight` multiplies each element (**broadcasting**). PyTorch records the multiply and the add.'], { tex: '\\hat y_i = w x_i + b' }],
              ['loss = ((predictions - ys) ** 2).mean()', ['Errors, squared, averaged: one number, the same loss as lesson 4.1.'], { tex: 'L = \\frac1N \\sum_i (\\hat y_i - y_i)^2' }],
              ['loss.backward()', ['**Autograd**: walk back through every recorded operation, applying the chain rule, and leave $\\partial L/\\partial w$ in `weight.grad` and $\\partial L/\\partial b$ in `bias.grad`.']],
              ['by_hand = gradients(w, b)', ['Lesson 4.1\'s formulas, for comparison.']],
              ['print("autograd:", weight.grad.item(), bias.grad.item())', ['`.item()` turns a one-number tensor into a plain Python float.']],
              ['print("by hand: ", by_hand[0], by_hand[1])', ['Measured: autograd $-14.400002$, $-7.1$; by hand $-14.4$, $-7.1$. The tiny difference is because PyTorch computes in 32-bit floats.']],
              ['return weight.grad.item(), bias.grad.item(), by_hand', ['Both, to compare.']],
            ],
          },
        },
        { md: `Three more pieces you'll meet in every PyTorch program:

- **\`nn.Linear(4, 32)\`**: a layer holding a 32 × 4 weight matrix and 32 biases; called on a state it computes 32 dot products plus biases at once, $W\\mathbf s + \\mathbf b$. Lesson 4.2's scores were \`nn.Linear(4, 2)\` without a bias.
- **Optimisers**: \`opt = torch.optim.Adam(net.parameters(), lr=0.01)\`. \`opt.zero_grad()\` clears old gradients (they **add up** otherwise), \`loss.backward()\` fills them, \`opt.step()\` moves every weight. **Adam** is gradient descent with two refinements: it keeps a running average of each gradient (momentum) and scales each weight's step by how large its gradients usually are.
- **\`with torch.no_grad():\`**: switch recording off, for computations that won't be differentiated (playing a game, computing a target). Faster, and it keeps targets from being trained.` },
        {
          choice: {
            prompt: 'A program calls `loss.backward()` twice (for two batches) and `opt.step()` once, with no `zero_grad` in between. What happens?',
            options: [
              { text: 'The two batches\' gradients are added together in `.grad`, and the step uses their sum', why: 'Yes: `.grad` accumulates. That is why every training loop calls `zero_grad()` before `backward()`.' },
              { text: 'The second gradient replaces the first', why: 'PyTorch adds to `.grad`; it never replaces it unless you zero it.' },
              { text: 'PyTorch raises an error', why: 'Calling backward twice on two different losses is allowed; the gradients accumulate.' },
              { text: 'Nothing changes until `zero_grad`', why: '`step` uses whatever `.grad` holds.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'autograd', label: 'Run the autograd check in real Python' } },
        { note: '**Tensors** are arrays; **autograd** records operations on tensors with `requires_grad=True`, and `loss.backward()` fills every `.grad` by the chain rule. A training step is `zero_grad()`, `backward()`, `step()`. Autograd agrees with the hand-derived gradient.' },
      ],
    },

    {
      id: 'reinforce-torch', number: '4.6', title: 'REINFORCE with a network',
      goal: 'Replace the linear policy by a small neural network in PyTorch, write REINFORCE as a loss to minimise, and compare the two.',
      builds: ['reinforce-plain', 'pytorch'],
      blocks: [
        { md: `A linear policy can only draw a straight boundary through the four numbers. A **neural network** can bend it: a **hidden layer** of 32 units, each a dot product of the state followed by a squashing function, then a final linear layer for the two scores:

$$\\mathbf h = \\tanh(W_1 \\mathbf s + \\mathbf b_1) \\qquad \\mathbf z = W_2 \\mathbf h + \\mathbf b_2$$

$\\tanh$ squashes any number into $(-1, 1)$. Without it, two linear layers would just be one linear layer; with it, the network can represent curved rules. 4 × 32 + 32 + 32 × 2 + 2 = **226 weights**, and autograd handles every one.

REINFORCE as a **loss to minimise**: PyTorch's optimisers go downhill, and we want to go up $\\sum_t A_t \\log\\pi(a_t\\mid s_t)$, so minimise its negative:

$$L = -\\frac{1}{T}\\sum_t A_t \\log\\pi(a_t\\mid s_t)$$

Its gradient is exactly minus lesson 4.3's. Here the advantages are the returns **normalised**: minus their mean (the baseline) and divided by their spread, so every game's update has a similar size.` },
        {
          code: {
            file: 'reinforce.py', fn: 'PolicyNet.__init__', notes: [
              ['super().__init__()', ['`PolicyNet` is a kind of `nn.Module` (the class line says so); this runs `nn.Module`\'s own setup first, which every PyTorch network must do.']],
              ['self.layers = nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))', ['`nn.Sequential` chains layers: 4 numbers → 32 (tanh) → 2 scores. PyTorch starts the weights at small random values.'], { tex: '\\mathbf z = W_2 \\tanh(W_1 \\mathbf s + \\mathbf b_1) + \\mathbf b_2' }],
            ],
          },
        },
        {
          code: {
            file: 'reinforce.py', fn: 'PolicyNet.forward', notes: [
              ['return self.layers(states)', ['`forward` is what runs when the network is called: `net(x)` runs `net.forward(x)`.']],
            ],
          },
        },
        {
          code: {
            file: 'reinforce.py', fn: 'train_reinforce', notes: [
              ['torch.manual_seed(seed)', ['Seeds PyTorch\'s random numbers: the starting weights and the sampled pushes repeat.']],
              ['env = CartPole()', ['The real world.']],
              ['net = PolicyNet()', ['The network, random weights.']],
              ['optimizer = torch.optim.Adam(net.parameters(), lr=lr)', ['Adam, over all 226 weights.']],
              ['lengths = []', ['The curve.']],
              ['for episode in range(episodes):', ['Game, then update.']],
              ['state, info = env.reset(seed=seed if episode == 0 else None)', ['Start a game.']],
              ['log_probs, rewards = [], []', ['Remember $\\log\\pi(a_t\\mid s_t)$ (as tensors, still connected to the weights) and the rewards.']],
              ['done = False', ['The loop.']],
              ['while not done:', ['Play to the end.']],
              ['policy = Categorical(logits=net(torch.tensor(state)))', ['The state as a tensor, through the network: two scores (**logits**). `Categorical` is PyTorch\'s probability distribution over choices; given logits, it applies softmax itself.'], { tex: '\\pi(\\cdot\\mid s) = \\text{softmax}(\\mathbf z)' }],
              ['action = policy.sample()', ['Sample a push, as lesson 4.4 did by hand.']],
              ['state, reward, terminated, truncated, info = env.step(action.item())', ['`.item()` turns the sampled tensor into a plain int for the world.']],
              ['log_probs.append(policy.log_prob(action))', ['$\\log\\pi(a_t\\mid s_t)$, recorded by autograd: the loss will be differentiated through it.']],
              ['rewards.append(reward)', ['What it paid.']],
              ['done = terminated or truncated', ['Over?']],
              ['returns = torch.tensor(all_returns(rewards, gamma))', ['Every $G_t$, as a tensor.']],
              ['advantages = (returns - returns.mean()) / (returns.std() + 1e-8)', ['Normalised: subtract the mean (the baseline), divide by the standard deviation (the spread); `1e-8` avoids dividing by zero.'], { tex: 'A_t = \\frac{G_t - \\bar G}{\\sigma_G}' }],
              ['loss = -(torch.stack(log_probs) * advantages).mean()', ['`torch.stack` makes one tensor of the $T$ log-probabilities. The loss is minus the average of $A_t \\log\\pi$.'], { tex: 'L = -\\frac1T\\sum_t A_t \\log\\pi(a_t\\mid s_t)' }],
              ['optimizer.zero_grad()', ['Clear last game\'s gradients.']],
              ['loss.backward()', ['Autograd: $\\partial L/\\partial w$ for all 226 weights, through softmax, the layers and tanh.']],
              ['optimizer.step()', ['One Adam step downhill on $L$, which is uphill on return.']],
              ['lengths.append(len(rewards))', ['The curve.']],
              ['return net, lengths', ['Network and curve.']],
            ],
          },
        },
        { figure: 'Measured', props: { method: 'reinforce' }, caption: 'Measured in Python: three seeds, 300 games each.' },
        { md: `Compared with the linear policy (lesson 4.4, about 371 in its last 50 games), the network climbs further in the same 300 games. It pays for it: each step runs a network, so training takes over a minute in Python, against under a second for 8 weights.

Both share REINFORCE's weakness: **one update per game**, and that update is noisy, because one game's returns are one sample. Part 5 fixes both with a critic.` },
        { python: { program: 'reinforce', label: 'Step through REINFORCE in PyTorch, watching the network change' } },
        { note: 'REINFORCE in PyTorch: `Categorical(logits=net(state))` to sample, keep `log_prob` of each push, and minimise $-\\text{mean}(A_t \\log\\pi)$ with `zero_grad`, `backward`, `step`. A hidden layer lets the policy bend; autograd makes the extra weights free to train.' },
      ],
    },
  ],
}
