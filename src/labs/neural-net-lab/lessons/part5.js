// Part 5: training well. Momentum and Adam written by hand and raced on one valley (and checked
// against torch.optim), the learning rate, starting weights, overfitting and early stopping, and
// weight decay and dropout.
import { race, BEST_RATES } from '../engine/part5.js'
import { f, s, v } from './util.js'

export const PART5 = {
  id: 'part5', title: 'Part 5 · Training well', lessons: [
    {
      id: 'momentum', number: '5.1', title: 'Momentum: building up speed',
      goal: 'See why plain gradient descent crawls along a narrow valley, write momentum by hand, and say what its velocity does.',
      builds: ['gradient-descent', 'mnist-network'],
      blocks: [
        { md: `Lesson 1.3's loss landscape was a long, narrow valley: steep across, almost flat along. Real networks are full of such valleys, much worse ones. Plain gradient descent has a problem there. Its learning rate must be small enough not to bounce out of the **steep** direction, and that same small rate makes it crawl along the **flat** one.

To see it cleanly, take a valley made to order with two weights, 100 times steeper across than along:

$$L(w) = \\tfrac12\\,(w_1^2 + 100\\,w_2^2) \\qquad \\nabla L = (w_1,\\; 100\\,w_2)$$

**Momentum** borrows from physics: a ball rolling downhill keeps its speed. Keep a **velocity** that is mostly the old velocity plus the new slope, and step along the velocity:

$$\\mathbf v \\leftarrow \\beta\\,\\mathbf v + \\nabla L \\qquad \\mathbf w \\leftarrow \\mathbf w - \\eta\\,\\mathbf v$$

with $\\beta = 0.9$. Across the valley the slope flips sign every step, so those pushes cancel in the velocity; along the floor it always points the same way, so the velocity grows (up to 10 times the slope, since $1 + 0.9 + 0.81 + \\dots = 10$).` },
        {
          symbols: [
            ['\\nabla L', 'gradient of L', 'the slopes, one per weight', 'grad'],
            ['\\mathbf v', 'v (velocity)', 'a running total of past slopes, older ones fading by $\\beta$ each step', 'state["velocity"]'],
            ['\\beta', 'beta', 'how much of the velocity is kept each step: 0.9', 'beta'],
            ['\\eta', 'eta', 'the learning rate', 'rate'],
          ],
        },
        {
          code: {
            file: 'optimizers.py', from: 4, to: 25, notes: [
              ['return 0.5 * (w[0] ** 2 + 100 * w[1] ** 2)', ['The valley\'s height at $(w_1, w_2)$: lowest (0) at $(0, 0)$.'], { tex: 'L = \\tfrac12(w_1^2 + 100 w_2^2)', calc: q => [`0.5 × (${s(q.w[0])}² + 100 × ${s(q.w[1])}²)`, 0.5 * (q.w[0] ** 2 + 100 * q.w[1] ** 2)] }],
              ['return [w[0], 100 * w[1]]', ['Its slopes: the derivative of $\\frac12 w_1^2$ is $w_1$, of $50 w_2^2$ is $100 w_2$.'], { tex: '\\nabla L = (w_1,\\ 100\\,w_2)', calc: q => [`(${f(q.w[0])}, 100 × ${s(q.w[1])})`, [q.w[0], 100 * q.w[1]]] }],
              ['return [wi - rate * gi for wi, gi in zip(w, grad)]', ['Plain gradient descent, as in every lesson so far.'], { tex: 'w \\leftarrow w - \\eta\\,g', calc: q => [`w − ${f(q.rate)} × ${v(q.grad)}`, q.w.map((wi, i) => wi - q.rate * q.grad[i])] }],
              ['if "velocity" not in state:', ['The first step: no velocity yet.'], { logic: 'If this optimiser has no velocity stored yet (its first step), start it at zero for every weight.' }],
              ['state["velocity"] = [0.0] * len(w)', ['`state` is a dictionary the optimiser keeps between steps: its memory.']],
              ['state["velocity"] = [beta * v + g for v, g in zip(state["velocity"], grad)]', ['Keep 90% of the velocity and add this step\'s slope.'], { tex: '\\mathbf v \\leftarrow \\beta\\,\\mathbf v + \\nabla L', calc: q => [`0.9 × ${v(q.state.velocity)} + ${v(q.grad)}`, q.state.velocity.map((x, i) => q.beta * x + q.grad[i])] }],
              ['return [wi - rate * v for wi, v in zip(w, state["velocity"])]', ['Step along the velocity, not the slope.'], { tex: '\\mathbf w \\leftarrow \\mathbf w - \\eta\\,\\mathbf v' }],
            ],
          },
        },
        {
          code: {
            file: 'optimizers.py', fn: 'race', notes: [
              ['w = list(start)', ['Start at $(-9, 1.5)$: far along the valley and up its side.']],
              ['state = {}', ['An empty memory for the optimiser.']],
              ['path = [w]', ['Every position on the way.']],
              ['for i in range(steps):', ['60 steps.']],
              ['w = step(w, valley_gradient(w), state, rate)', ['`step` is whichever optimiser was passed in: functions are values in Python.']],
              ['path.append(w)', ['Keep the position.']],
              ['return path, valley(w)', ['The path and where it ended up.']],
            ],
          },
        },
        { figure: 'ValleyRace', caption: 'All three from the same start, each at about the best rate it can take. Slide through the steps; pick an optimiser to see its arithmetic at that step. Then push plain gradient descent\'s rate above 0.02.' },
        {
          predict: {
            prompt: 'After 60 steps, plain gradient descent (rate 0.019, the fastest that stays in the valley) ends with error 4.05. What error does momentum (rate 0.004) end with? (3 decimals)',
            answer: race('momentum', BEST_RATES.momentum).error, tolerance: 0.0005, compute: () => race('momentum', BEST_RATES.momentum).error,
            explain: '0.064: over 60 times lower. Plain gradient descent got $w_1$ only from −9 to about −2.8; momentum carried it nearly to the bottom.',
          },
        },
        { md: `In PyTorch: \`torch.optim.SGD(model.parameters(), lr=0.004, momentum=0.9)\`. Lesson 5.2 checks this hand-written version against it: identical to the last digit.` },
        { python: { program: 'race', label: 'Race the three optimisers in real Python' } },
        { note: '**Momentum**: $\\mathbf v \\leftarrow 0.9\\mathbf v + \\nabla L$, $\\mathbf w \\leftarrow \\mathbf w - \\eta\\mathbf v$. Slopes that keep pointing the same way add up into speed; slopes that flip back and forth cancel. Narrow valleys stop being slow.' },
      ],
    },

    {
      id: 'adam', number: '5.2', title: 'Adam: a step size for every weight',
      goal: 'Write Adam by hand, explain its two running averages and its bias correction, and check it against `torch.optim.Adam`.',
      builds: ['momentum'],
      blocks: [
        { md: `Momentum fixes the direction. **Adam** (Kingma and Ba, 2015, "adaptive moment estimation") also fixes the **size**: it gives every weight its own step size, by dividing that weight's average slope by the typical size of its slopes. A weight with huge slopes (the steep direction) and one with tiny slopes (the flat one) then both take steps of roughly the learning rate.

It keeps two running averages per weight:

$$m \\leftarrow \\beta_1 m + (1-\\beta_1)\\,g \\qquad v \\leftarrow \\beta_2 v + (1-\\beta_2)\\,g^2$$

$m$ is the average slope (momentum, as a weighted average); $v$ is the average **squared** slope, so $\\sqrt v$ is the typical size of the slope. Both start at 0, which makes them too small early on (after one step $m$ is only $0.1\\,g$), so each is divided by how much of the average has built up so far, the **bias correction**:

$$\\hat m = \\frac{m}{1 - \\beta_1^t} \\qquad \\hat v = \\frac{v}{1 - \\beta_2^t} \\qquad w \\leftarrow w - \\eta\\,\\frac{\\hat m}{\\sqrt{\\hat v} + \\epsilon}$$

with $\\beta_1 = 0.9$, $\\beta_2 = 0.999$, $\\epsilon = 10^{-8}$ (only there so it never divides by zero). If the slopes are steady, $\\hat m / \\sqrt{\\hat v} \\approx \\pm 1$: every weight moves about $\\eta$ per step, whatever its slope's size. That is why Adam is the usual first choice, and why it trained the browser figures so quickly.` },
        {
          symbols: [
            ['m', 'm', 'running average of the slope (the first moment)', 'state["m"]'],
            ['v', 'v', 'running average of the slope squared (the second moment)', 'state["v"]'],
            ['\\beta_1, \\beta_2', 'beta one, beta two', 'how slowly each average forgets: 0.9 and 0.999', 'beta1, beta2'],
            ['t', 't', 'how many steps so far', 'state["t"]'],
            ['\\hat m, \\hat v', 'm hat, v hat', 'the averages, bias-corrected', 'm_hat, v_hat'],
            ['\\epsilon', 'epsilon', 'a tiny number so we never divide by 0', 'eps'],
          ],
        },
        {
          code: {
            file: 'optimizers.py', fn: 'adam_step', notes: [
              ['if "m" not in state:', ['The first step?'], { logic: 'If Adam has no averages yet, start both at zero for every weight, and the step count at 0.' }],
              ['state["m"] = [0.0] * len(w)', ['Average slope, per weight.']],
              ['state["v"] = [0.0] * len(w)', ['Average squared slope, per weight.']],
              ['state["t"] = 0', ['Steps taken.']],
              ['state["t"] += 1', ['This step.']],
              ['t = state["t"]', ['…']],
              ['state["m"] = [beta1 * m + (1 - beta1) * g for m, g in zip(state["m"], grad)]', ['90% old average, 10% new slope.'], { tex: 'm \\leftarrow \\beta_1 m + (1 - \\beta_1)\\,g', calc: q => [`0.9 × ${v(q.state.m)} + 0.1 × ${v(q.grad)}`, q.state.m.map((m, i) => q.beta1 * m + (1 - q.beta1) * q.grad[i])] }],
              ['state["v"] = [beta2 * v + (1 - beta2) * g * g for v, g in zip(state["v"], grad)]', ['99.9% old, 0.1% new squared slope: a slow, steady measure of each slope\'s size.'], { tex: 'v \\leftarrow \\beta_2 v + (1 - \\beta_2)\\,g^2', calc: q => [`0.999 × ${v(q.state.v)} + 0.001 × ${v(q.grad)}²`, q.state.v.map((x, i) => q.beta2 * x + (1 - q.beta2) * q.grad[i] ** 2)] }],
              ['new_w = []', ['The new weights.']],
              ['for wi, m, v in zip(w, state["m"], state["v"]):', ['Each weight with its own averages.']],
              ['m_hat = m / (1 - beta1 ** t)', ['Bias correction: after step 1, $1 - 0.9 = 0.1$, so $\\hat m = m / 0.1 = g$ exactly.'], { tex: '\\hat m = m/(1 - \\beta_1^t)', calc: q => [`${f(q.m)} / (1 − 0.9^${q.t})`, q.m / (1 - q.beta1 ** q.t)] }],
              ['v_hat = v / (1 - beta2 ** t)', ['The same for $v$; it builds up much more slowly, so its correction lasts for thousands of steps.'], { tex: '\\hat v = v/(1 - \\beta_2^t)', calc: q => [`${f(q.v)} / (1 − 0.999^${q.t})`, q.v / (1 - q.beta2 ** q.t)] }],
              ['new_w.append(wi - rate * m_hat / (math.sqrt(v_hat) + eps))', ['The step: average slope divided by typical slope size, times the rate.'], { tex: 'w \\leftarrow w - \\eta\\,\\frac{\\hat m}{\\sqrt{\\hat v} + \\epsilon}', calc: q => [`${s(q.wi)} − ${f(q.rate)} × ${s(q.m_hat)} / (√${f(q.v_hat)} + 1e-8)`, q.wi - q.rate * q.m_hat / (Math.sqrt(q.v_hat) + q.eps)] }],
              ['return new_w', ['Every weight, moved by about the rate.']],
            ],
          },
        },
        {
          code: {
            file: 'optimizers.py', fn: 'race_all', notes: [
              ['results = {"sgd": race(sgd_step, 0.019), "momentum": race(momentum_step, 0.004), "adam": race(adam_step, 0.5)}', ['Each with about the best rate it can take, measured by trying many.']],
              ['for name, (path, error) in results.items():', ['Report each.']],
              ['print(name, "error after 60 steps", round(error, 6))', ['Measured: plain 4.05, momentum 0.064, Adam 0.126.']],
              ['return results', ['All three paths.']],
            ],
          },
        },
        {
          code: {
            file: 'optim_check.py', fn: 'check_against_torch', notes: [
              ['gaps = {}', ['The largest difference found, per optimiser.']],
              ['for name, step, make in (("momentum", momentum_step', ['Two pairs: the hand-written step, and a function making PyTorch\'s optimiser with the same settings.']],
              ['rate = 0.004 if name == "momentum" else 0.5', ['The same rates as the race.']],
              ['w = [-9.0, 1.5]', ['The hand-written one starts here…']],
              ['state = {}', ['…with an empty memory.']],
              ['weight = torch.tensor([-9.0, 1.5], dtype=torch.float64, requires_grad=True)', ['PyTorch\'s starts at the same place, in 64-bit floats like Python\'s.']],
              ['optimizer = make([weight])', ['`torch.optim.SGD(..., momentum=0.9)` or `torch.optim.Adam`.']],
              ['largest = 0.0', ['The worst gap so far.']],
              ['for i in range(steps):', ['20 steps of each.']],
              ['w = step(w, valley_gradient(w), state, rate)', ['By hand.']],
              ['loss = 0.5 * (weight[0] ** 2 + 100 * weight[1] ** 2)', ['PyTorch: the same valley as a tensor expression…']],
              ['optimizer.zero_grad()', ['…']],
              ['loss.backward()', ['…its slopes by autograd…']],
              ['optimizer.step()', ['…and torch.optim\'s step.']],
              ['largest = max(largest, max(abs(a - b) for a, b in zip(w, weight.tolist())))', ['Compare the two positions.']],
              ['gaps[name] = largest', ['…']],
              ['print(name, "largest difference', ['Measured: momentum 0.0 (identical), Adam 7.8 × 10⁻¹⁶ (the last digit). `torch.optim` does exactly this arithmetic.']],
              ['return gaps', ['Both.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'On Adam\'s first step, $m = 0.1\\,g$ and $v = 0.001\\,g^2$. After bias correction, what is $\\hat m / \\sqrt{\\hat v}$ for a weight whose slope is $g = 900$?',
            answer: 1, tolerance: 1e-6, compute: () => { const g = 900, m = 0.1 * g / (1 - 0.9), vv = 0.001 * g * g / (1 - 0.999); return m / Math.sqrt(vv) },
            explain: '$\\hat m = 0.1 \\cdot 900 / 0.1 = 900$, $\\hat v = 0.001 \\cdot 900^2 / 0.001 = 900^2$, so $\\hat m/\\sqrt{\\hat v} = 1$. Whatever the slope\'s size, Adam\'s first step is exactly the learning rate (in the slope\'s direction).',
          },
        },
        { note: '**Adam** keeps per weight an average slope $m$ and an average squared slope $v$, corrects both for starting at 0, and steps $\\eta\\,\\hat m/(\\sqrt{\\hat v} + \\epsilon)$: about $\\eta$ per step for every weight, steep or flat. Hand-written Adam equals `torch.optim.Adam` to the last digit.' },
      ],
    },

    {
      id: 'learning-rate', number: '5.3', title: 'Choosing the learning rate',
      goal: 'Recognise a learning rate that is too small, about right, or too large from the loss curve, search for one by factors, and know what a schedule is.',
      builds: ['adam'],
      blocks: [
        { md: `The learning rate is the setting that matters most. Too small, and training barely moves; too large, and each step overshoots, the loss jumps about or explodes; in between, there is usually a wide range that works. The loss curve tells you which:

- **flat and slow**: too small;
- **falling steadily, then levelling off**: about right;
- **jagged, rising, or "nan"** (not a number: the weights overflowed): too large.

Search by factors: try 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, and look at the curves. Typical starting points: about 0.01–0.1 for SGD, 0.001–0.003 for Adam.` },
        { figure: 'LearningRateFig', caption: 'The same network and data at four learning rates.' },
        { md: `Many training runs also **lower** the rate as they go (a **schedule**): large steps early to get close quickly, small steps later to settle. In PyTorch:

\`\`\`python
scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)
for epoch in range(30):
    ...                   # train one epoch
    scheduler.step()      # every 10 epochs, halve the learning rate
\`\`\`

Keras: \`keras.optimizers.schedules.ExponentialDecay\`, or the \`ReduceLROnPlateau\` callback, which halves the rate when the loss stops improving.` },
        {
          choice: {
            prompt: 'A run\'s loss falls for 50 steps, then starts jumping up and down around the same level. What do you try first?',
            options: [
              { text: 'A smaller learning rate (or one that shrinks over time)', why: 'Yes. Near the bottom, big steps keep jumping across it. Lowering the rate, or a schedule, lets it settle.' },
              { text: 'A larger learning rate', why: 'Larger steps would jump about more.' },
              { text: 'More hidden neurons', why: 'The jumping is about step size, not about what the network can represent.' },
              { text: 'Starting again with new random weights', why: 'The first 50 steps were going well; the problem appears near the bottom, where step size matters.' },
            ],
            answer: 0,
          },
        },
        { note: 'Read the loss curve: flat = rate too small, jagged or exploding = too large. Search by factors of about 3. Lower the rate as training goes on (a **schedule**) to settle near the bottom.' },
      ],
    },

    {
      id: 'initialisation', number: '5.4', title: 'Starting weights',
      goal: 'Explain why weights can\'t all start equal, and why random starting weights are scaled by about $1/\\sqrt{\\text{inputs}}$.',
      builds: ['adam', 'backprop'],
      blocks: [
        { md: `Every network in this lab started from small random weights, drawn in $\\pm 1/\\sqrt{\\text{inputs}}$ (PyTorch's default). Two experiments show why both "random" and "that size" matter.` },
        {
          code: {
            file: 'init_check.py', fn: 'same_start', notes: [
              ['model = nn.Sequential(nn.Linear(1, hidden), nn.Tanh(), nn.Linear(hidden, 1))', ['A small network: 1 → 4 → 1.']],
              ['with torch.no_grad():', ['Setting weights by hand: no gradients.']],
              ['for p in model.parameters():', ['Every weight and bias…']],
              ['p.fill_(0.5)', ['…set to 0.5.']],
              ['x = torch.linspace(-2, 2, 20).unsqueeze(1)', ['20 inputs evenly spaced from −2 to 2.']],
              ['y = torch.sin(x)', ['A curve to learn.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=0.1)', ['Plain gradient descent.']],
              ['for step in range(200):', ['200 steps.']],
              ['loss = ((model(x) - y) ** 2).mean()', ['…']],
              ['optimizer.zero_grad()', ['…']],
              ['loss.backward()', ['…']],
              ['optimizer.step()', ['…']],
              ['weights = model[0].weight.squeeze(1).tolist()', ['The four hidden neurons\' weights.']],
              ['print("hidden weights after 200 steps:", weights)', ['Measured: [0.72955, 0.72955, 0.72955, 0.72955]. They moved, but together.']],
              ['return weights', ['…']],
            ],
          },
        },
        { md: `Equal neurons compute equal outputs, so backpropagation gives them equal gradients, so they stay equal for ever: **symmetry**. Four neurons doing the work of one. Random starts break the symmetry, and each neuron can find its own job.

The **size** matters because signals pass through many layers. A layer sums its inputs times weights: with $n$ inputs of typical size 1 and weights of typical size $s$, the sum's typical size is about $s\\sqrt n$. Choosing $s \\approx 1/\\sqrt n$ keeps it near 1 layer after layer. Smaller, and the signal shrinks towards 0; larger, and tanh or sigmoid saturates at ±1, where their slope is almost 0 and gradients vanish.` },
        {
          code: {
            file: 'init_check.py', fn: 'signal_through_layers', notes: [
              ['torch.manual_seed(seed)', ['Repeatable.']],
              ['h = torch.randn(256, width)', ['256 random inputs of 64 numbers, each of typical size 1 (`randn`: normally distributed, spread 1).']],
              ['spreads = []', ['The typical size after each layer.']],
              ['for layer in range(layers):', ['8 layers.']],
              ['weights = torch.randn(width, width) * scale / width ** 0.5', ['Random weights of typical size scale/√64.']],
              ['h = torch.tanh(h @ weights)', ['`@` is matrix multiplication: every input row times the weight matrix, a layer for all 256 at once; then tanh.']],
              ['spreads.append(h.std().item())', ['The spread (standard deviation) of all the numbers now.']],
              ['print("scale", scale', ['Measured: scale 0.5 shrinks to 0.003 by layer 8 (the signal dies); 1.0 stays above 0.25; 3.0 sits at 0.84 (most tanh outputs pinned near ±1).']],
              ['return spreads', ['…']],
            ],
          },
        },
        { figure: 'InitFig', caption: 'The two experiments, in the browser.' },
        { md: `This is why PyTorch's \`nn.Linear\` starts its weights in $\\pm 1/\\sqrt{\\text{inputs}}$, and why other recipes exist for other activations: **Xavier** (Glorot) initialisation for tanh, **He** (Kaiming) for ReLU, which loses half its signal to the zeros and so uses weights $\\sqrt 2$ times bigger. Keras's \`Dense\` uses Glorot by default.` },
        { note: 'Start weights **random**, so neurons differ (equal starts stay equal), and of size about $1/\\sqrt{\\text{inputs}}$, so signals and gradients neither die nor saturate as they pass through many layers.' },
      ],
    },

    {
      id: 'overfitting', number: '5.5', title: 'Overfitting and early stopping',
      goal: 'Recognise overfitting from a training curve and a test curve, and stop training at the right moment.',
      builds: ['initialisation', 'fuel-economy'],
      blocks: [
        { md: `A network with thousands of weights can do more than learn the pattern: it can **memorise** the training examples, noise and all. Then its training error keeps falling while its error on new data rises. That is **overfitting**, and it is the central problem of machine learning: the goal is never the training data, it is the data you haven't seen.

To watch it happen: 30 points near $y = \\sin x$, each off by up to ±0.3 (lots of noise), and a large network, 1 → 64 → 64 → 1, 4,353 weights. Its "test" is the true curve itself, at 200 places.` },
        {
          code: {
            file: 'overfit.py', from: 8, to: 41, notes: [
              ['rng = random.Random(seed)', ['Repeatable.']],
              ['xs = [rng.uniform(-3, 3) for i in range(n)]', ['The inputs.']],
              ['ys = [math.sin(x) + rng.uniform(-noise, noise) for x in xs]', ['The curve plus noise (for the test points, noise 0: the truth).']],
              ['return torch.tensor(xs).unsqueeze(1), torch.tensor(ys).unsqueeze(1)', ['As n × 1 tensors.']],
              ['torch.manual_seed(seed)', ['Repeatable.']],
              ['x, y = noisy_points(30, seed, 0.3)', ['30 noisy points to learn from.']],
              ['test_x, test_y = noisy_points(200, seed + 100, 0.0)', ['200 points exactly on the curve: what we really want to get right.']],
              ['model = nn.Sequential(nn.Linear(1, 64), nn.ReLU(), nn.Dropout(dropout),', ['A big network. `nn.Dropout` is lesson 5.6\'s; with dropout = 0 it does nothing.']],
              ['optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=weight_decay)', ['Adam; `weight_decay` is also lesson 5.6\'s.']],
              ['train_history, test_history = [], []', ['Both errors, every step.']],
              ['for step in range(steps):', ['3,000 steps.']],
              ['model.train()', ['**Training mode**: switches dropout on (other layers, like batch normalisation, also behave differently while training).']],
              ['loss = ((model(x) - y) ** 2).mean()', ['The error on the 30 points.']],
              ['optimizer.zero_grad()', ['…']],
              ['loss.backward()', ['…']],
              ['optimizer.step()', ['…']],
              ['model.eval()', ['**Evaluation mode**: dropout off, for measuring.']],
              ['with torch.no_grad():', ['Measuring only.']],
              ['train_history.append(((model(x) - y) ** 2).mean().item())', ['The error on the training points.']],
              ['test_history.append(((model(test_x) - test_y) ** 2).mean().item())', ['The error on the true curve.']],
              ['best = min(range(steps), key=lambda i: test_history[i])', ['The step with the lowest test error: `min` with `key` finds which item gives the smallest value; `lambda i: …` is a tiny unnamed function.']],
              ['print("final train"', ['Measured (no cures): training error falls to 0.011 (below the noise\'s own 0.03), while the true-curve error is best, 0.016, at step 524 and then climbs to 0.035.']],
              ['return train_history, test_history, best', ['Both curves, and the best moment.']],
            ],
          },
        },
        { figure: 'OverfitFig', caption: 'Train with no cures first. The teal training curve keeps falling; the orange true-curve error turns and rises. The dashed orange line is the network at its best moment.' },
        { md: `The simplest cure is **early stopping**: keep data aside (a **validation set**, which plays the role of the true curve here), measure on it as you train, and keep the weights from the moment it was best. Keras has it built in: \`keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True)\` stops after 10 epochs without improvement and goes back to the best weights.

(Test data, in the strict sense, is touched only once, at the very end. If you use it to choose when to stop, it has become validation data, and you need fresh test data to report an honest score.)` },
        {
          choice: {
            prompt: 'Training error 0.001, validation error 0.4 and rising. What is happening?',
            options: [
              { text: 'Overfitting: the network is memorising the training examples instead of learning the pattern', why: 'Yes. A tiny training error with a large, rising validation error is overfitting\'s signature.' },
              { text: 'The learning rate is too small', why: 'A too-small rate would show in the training error too: it would still be high.' },
              { text: 'The network is too small', why: 'A network too small can\'t fit even the training data (underfitting): the training error would be high.' },
              { text: 'Nothing: a training error of 0.001 is excellent', why: 'Only the error on data the model hasn\'t trained on matters, and that one is bad.' },
            ],
            answer: 0,
          },
        },
        { note: '**Overfitting**: training error falling while error on new data rises: the model is learning the noise. Always watch a validation curve, and stop (or keep the weights) where it was best: **early stopping**.' },
      ],
    },

    {
      id: 'regularisation', number: '5.6', title: 'Weight decay and dropout',
      goal: 'Add weight decay and dropout by hand and in PyTorch, say what each discourages, and judge their effect honestly.',
      builds: ['overfitting'],
      blocks: [
        { md: `Two classic ways to make memorising harder. Both are called **regularisation**.

**Weight decay.** Overfit networks typically have large weights: sharp bends need big numbers. So add a small penalty for size to the loss, $\\frac{\\lambda}{2}\\sum w^2$. Its slope is $\\lambda w$, so every gradient gains $\\lambda w$ and every step pulls each weight slightly towards 0 (it "decays"):

$$g \\leftarrow g + \\lambda\\,w$$

That is exactly what \`weight_decay=λ\` does in \`torch.optim\` (and what this lab's engine does; its tests check it against PyTorch). (With Adam, \`torch.optim.AdamW\` applies the decay separately from Adam's scaling, which usually works better.)

**Dropout** (Srivastava et al., 2014). During training, each hidden neuron is switched off at random for each example, with probability $p$; the survivors are multiplied by $1/(1-p)$ so the total stays the same on average. The network can't rely on any single neuron (it may be gone), so it must spread what it learns across many: much harder to memorise one point with one neuron. When measuring (\`model.eval()\`), nothing is dropped.

$$h_k \\leftarrow h_k \\cdot \\begin{cases} 0 & \\text{with probability } p \\\\ \\frac{1}{1-p} & \\text{otherwise} \\end{cases}$$` },
        { figure: 'OverfitFig', caption: 'Now try weight decay 0.001, then dropout 0.2 and 0.5. Compare the error on the true curve at the end and at its best moment.' },
        { md: `Measured in Python (PyTorch, 3,000 steps; the browser's figure starts from different random weights but shows the same pattern):

| | error on the true curve, best moment | at the end |
|---|---|---|
| no cure | 0.016 (step 524) | 0.035 |
| weight decay 0.001 | 0.020 | **0.024** |
| dropout 0.2 | **0.014** (step 329) | 0.035 |

Weight decay keeps the network from drifting into wild bends: the end result is a third better. Dropout gives the best result of all, at its best moment, but by the end this small problem has overfit anyway. Neither is magic; on large networks and data sets both help a lot, and they are routinely combined with early stopping, which is the cheapest and most reliable of the three.` },
        { md: `In Keras:

\`\`\`python
model = keras.Sequential([
    layers.Dense(64, activation="relu", kernel_regularizer=keras.regularizers.l2(0.001)),   # weight decay
    layers.Dropout(0.2),
    layers.Dense(64, activation="relu"),
    layers.Dropout(0.2),
    layers.Dense(1),
])
\`\`\`

Keras switches dropout off by itself when predicting; in PyTorch you call \`model.eval()\`.` },
        { python: { program: 'overfit', label: 'Watch overfitting in real Python' } },
        { note: '**Weight decay** adds $\\lambda w$ to every gradient, pulling weights towards 0; **dropout** switches random hidden neurons off while training. Both make memorising harder; measure them honestly on validation data, and keep **early stopping** too.' },
      ],
    },
  ],
}
