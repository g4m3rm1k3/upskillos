// Part 1: predicting a number. Data and a model, one neuron and its error, gradient descent, a layer,
// activations, backpropagation by hand, training a network, the same in PyTorch (and Keras), and
// real data. Every number a predict block asks for is worked out by `compute` from the lab's engine.
import { makeLine, mse, gradients, fitLine, dense, ACTIVATIONS, backward, forward, trainNet } from '../engine/part1.js'
import { carData } from '../engine/cars.js'
import { f, s, v } from './util.js'

const [LX, LY] = makeLine()
const tiny = { w1: [1], b1: [-1], w2: [0.5], b2: 0 }

export const PART1 = {
  id: 'part1', title: 'Part 1 · Predicting a number', lessons: [
    {
      id: 'data-and-model', number: '1.1', title: 'Data, a model and a prediction',
      goal: 'Say what "learning from data" means, name the input, the output and the prediction, and fit a line to points by hand.',
      builds: [],
      blocks: [
        { h: 'What this lab is about' },
        { md: `A **neural network** is a function with many adjustable numbers in it. Show it examples (inputs together with the outputs you want) and it adjusts those numbers until its outputs match. Then give it an input it has never seen, and it makes a **prediction**.

This lab builds that from the ground up. Every piece (a neuron, a layer, ReLU, sigmoid, softmax, the error, backpropagation, gradient descent, momentum, Adam) is first written in plain Python that you can read line by line, then compared with the one line of PyTorch that does the same job, and checked to give the same numbers. Then you use it: each part ends with a model you can try on your own input.

1. **Predicting a number**: fuel economy from a car's weight and power.
2. **Yes or no**: is this point blue or orange; is this tumour harmful.
3. **One of several**: which flower; which digit.
4. **Your handwriting**: draw a digit, and draw your own classes.
5. **Training well**: momentum, Adam, overfitting.
6. **Pictures**: convolution.

It assumes basic Python: variables, \`for\`, functions and lists. The **Model Studio** tab lets you build and train networks of your own at any point.` },
        { h: 'Learning from examples' },
        { md: `Here is the smallest possible version of the problem. Twenty points, each an input $x$ and an output $y$. (They are made up, so we know the truth: they lie near the line $y = 2x + 1$, each nudged up or down by a random amount up to 1. A real data set comes in lesson 1.9.)

The task: find a rule that, given $x$, says what $y$ should be. Our rule will be a straight line,

$$\\hat y = w\\,x + b$$

where $\\hat y$ ("y hat") is the **prediction**, and $w$ and $b$ are two numbers we choose. That rule, with its adjustable numbers, is a **model**. Choosing the numbers so the predictions match the examples is **learning**, or **training**.` },
        {
          code: {
            file: 'data.py', fn: 'make_line', notes: [
              ['rng = random.Random(seed)', ['A random number generator of our own, started from `seed`. The same seed gives the same "random" numbers every time, so the same 20 points: the lab\'s figures make exactly these points too.']],
              ['xs, ys = [], []', ['Two empty lists, filled in together: `xs[i]` and `ys[i]` are point `i`.']],
              ['for i in range(n):', ['`n` points, 20 by default.']],
              ['x = rng.uniform(0, 5)', ['`uniform(a, b)`: a random number between a and b, any value equally likely.'], { tex: 'x \\sim U(0, 5)' }],
              ['y = 2 * x + 1 + rng.uniform(-1, 1)', ['The true line, plus **noise**: a random nudge of up to 1 either way. Real measurements are never exactly on a rule.'], { tex: 'y = 2x + 1 + \\varepsilon,\\quad \\varepsilon \\sim U(-1, 1)', calc: q => [`2 × ${f(q.x)} + 1 + noise`, 'between ' + f(2 * q.x) + ' and ' + f(2 * q.x + 2)] }],
              ['xs.append(x)', ['Keep the input…']],
              ['ys.append(y)', ['…and its output.']],
              ['return xs, ys', ['Both lists.']],
            ],
          },
        },
        { figure: 'HandFit', caption: 'Drag $w$ and $b$ until the line runs through the points. Each red line is one **miss**: prediction minus truth.' },
        {
          symbols: [
            ['x', 'x', 'the **input**: what the model is told', 'x, xs'],
            ['y', 'y', 'the **true output** for that input: what we want the model to say', 'y, ys'],
            ['\\hat y', 'y hat', 'the model\'s **prediction**', 'y_hat'],
            ['w', 'w', 'the **weight**: here the line\'s slope', 'w'],
            ['b', 'b', 'the **bias**: here the line\'s height where $x = 0$', 'b'],
          ],
        },
        {
          choice: {
            prompt: 'In this lab\'s words, what does "training" a model mean?',
            options: [
              { text: 'Adjusting the model\'s numbers (here $w$ and $b$) until its predictions match the examples\' outputs', why: 'Yes. The model\'s shape is fixed (a line); training chooses its numbers.' },
              { text: 'Writing the rule $y = 2x + 1$ into the program', why: 'That would be programming the answer. The model has to find it from the points alone; it never sees "2x + 1".' },
              { text: 'Collecting more data', why: 'Data is what training uses, not what it is.' },
              { text: 'Making the points lie exactly on the line', why: 'The points are what they are, noise and all. Training moves the line, not the points.' },
            ],
            answer: 0,
          },
        },
        { note: 'A **model** is a function with adjustable numbers; **training** chooses the numbers from examples of inputs $x$ and outputs $y$; then the model **predicts** $\\hat y$ for new inputs. Here: a line $\\hat y = wx + b$ with two numbers.' },
      ],
    },

    {
      id: 'one-neuron', number: '1.2', title: 'One neuron and its error',
      goal: 'Compute a neuron\'s prediction and its mean squared error over a set of points, and say why the errors are squared.',
      builds: ['data-and-model'],
      blocks: [
        { md: `The line $\\hat y = wx + b$ **is** a neuron: the simplest one, with one input. A neuron multiplies each input by a weight, adds them up, and adds a bias. With more inputs (lesson 1.4) it is $w_1x_1 + w_2x_2 + \\dots + b$.

To improve it, we need one number that says **how wrong** it is. For each point, the miss is $\\hat y - y$. Misses can be positive or negative, and simply adding them would let them cancel out, so square each one (always positive, and big misses count much more than small ones), then average:

$$L(w, b) = \\frac{1}{n}\\sum_{i=1}^{n} (\\hat y_i - y_i)^2 = \\frac{1}{n}\\sum_{i=1}^{n} (w x_i + b - y_i)^2$$

This is the **mean squared error**, MSE. It is called the **loss**: training means making it small.` },
        {
          symbols: [
            ['L', 'L', 'the **loss**: one number for how wrong the model is', 'mse(…), loss'],
            ['n', 'n', 'how many points', 'len(xs)'],
            ['\\sum_{i=1}^{n}', 'the sum, for i from 1 to n', 'add up the thing after it, once for each point', 'for x, y in zip(xs, ys)'],
            ['\\hat y_i - y_i', 'y hat i minus y i', 'point $i$\'s **miss**', 'error'],
          ],
        },
        {
          code: {
            file: 'neuron.py', from: 4, to: 15, notes: [
              ['return w * x + b', ['The neuron: weight times input, plus bias.'], { tex: '\\hat y = w x + b', calc: q => [`${s(q.w)} × ${s(q.x)} + ${s(q.b)}`, q.w * q.x + q.b] }],
              ['total = 0.0', ['A running sum, starting at 0.']],
              ['for x, y in zip(xs, ys):', ['`zip` walks the two lists together: each trip, `x` is a point\'s input and `y` its true output.']],
              ['error = predict(w, b, x) - y', ['This point\'s miss.'], { tex: 'e_i = \\hat y_i - y_i', calc: q => [`(${s(q.w)} × ${s(q.x)} + ${s(q.b)}) − ${s(q.y)}`, q.w * q.x + q.b - q.y] }],
              ['total += error ** 2', ['Add its square. `**` is Python\'s power: `error ** 2` is error × error.'], { tex: '\\text{total} \\mathrel{+}= e_i^2', calc: q => [`${f(q.total)} + ${s(q.error)}²`, q.total + q.error ** 2] }],
              ['return total / len(xs)', ['Divide by the number of points: the average squared miss.'], { tex: 'L = \\frac1n \\sum_i e_i^2', calc: q => [`${f(q.total)} / ${q.xs.length}`, q.total / q.xs.length] }],
            ],
          },
        },
        { figure: 'HandFit', props: { squares: true }, caption: 'The same points, each miss drawn as a square: its area **is** the squared miss. The loss is the average area. Shrink the squares.' },
        {
          predict: {
            prompt: 'With the true rule, $w = 2$ and $b = 1$, what is the mean squared error on these 20 points? (3 decimals)',
            answer: mse(2, 1, LX, LY), tolerance: 0.0005, compute: () => mse(2, 1, LX, LY),
            explain: 'About 0.336, not 0: the points were nudged off the line by noise. Each nudge is up to 1 either way, and the average square of such a nudge is $1/3$. No line can get rid of noise; the best a line can do here is slightly under that.',
            misconceptions: [{ answer: 0, feedback: 'The points don\'t lie exactly on $y = 2x + 1$: each was nudged by up to 1. So even the true rule misses a little.' }],
          },
        },
        {
          choice: {
            prompt: 'Why square the misses instead of just adding them?',
            options: [
              { text: 'So misses above and below the line can\'t cancel out, and big misses count far more than small ones', why: 'Yes. A line way too high on half the points and way too low on the others would have misses adding to 0. Squares are never negative.' },
              { text: 'Because squaring makes the numbers smaller', why: 'Squaring makes misses bigger than 1 bigger, not smaller.' },
              { text: 'Python requires it', why: 'It is a choice of what "wrong" means. Others exist (lesson 1.9 reports the average **absolute** miss, easier to read).' },
              { text: 'To make the loss negative when the model is good', why: 'Squares are never negative; the best possible loss is 0.' },
            ],
            answer: 0,
          },
        },
        { note: 'A **neuron** computes $w x + b$ (more inputs: $\\sum_j w_j x_j + b$). The **mean squared error** $L = \\frac1n\\sum_i(\\hat y_i - y_i)^2$ turns "how wrong" into one number. Training makes it small.' },
      ],
    },

    {
      id: 'gradient-descent', number: '1.3', title: 'Gradient descent',
      goal: 'Work out the loss\'s slope for $w$ and for $b$, step both against it, and choose a learning rate that neither crawls nor explodes.',
      builds: ['one-neuron'],
      blocks: [
        { md: `Sliding $w$ and $b$ by hand works for two numbers. A real network has thousands or millions, so we need a recipe.

Imagine the loss as a landscape: every pair $(w, b)$ is a place, and its height is the loss there. We stand somewhere and want to walk downhill. We can't see the whole landscape (that would mean trying every $(w, b)$), but we can measure the **slope** under our feet: how fast the loss changes if we nudge $w$ a little, and if we nudge $b$ a little. Those two slopes are the **partial derivatives**, $\\partial L/\\partial w$ and $\\partial L/\\partial b$ ("dee L by dee w"); together they are the **gradient**, $\\nabla L$, which points uphill. So step the other way:

$$w \\leftarrow w - \\eta\\,\\frac{\\partial L}{\\partial w} \\qquad b \\leftarrow b - \\eta\\,\\frac{\\partial L}{\\partial b}$$

$\\eta$ ("eta") is the **learning rate**: how big a step. Repeat until the ground is flat. That is **gradient descent**, and every network in this lab, and in the world, is trained by it or a variation of it (Part 5).` },
        { h: 'The two slopes, worked out' },
        { md: `For one point the loss is $(w x + b - y)^2$, a square of something. The **chain rule** says: the slope of a square $u^2$ is $2u$ times the slope of $u$ itself. Here $u = w x + b - y$:

- nudging $w$ changes $u$ at rate $x$ (that is what multiplies $w$), so $\\partial (u^2)/\\partial w = 2u \\cdot x$;
- nudging $b$ changes $u$ at rate 1, so $\\partial (u^2)/\\partial b = 2u$.

Average over the points:

$$\\frac{\\partial L}{\\partial w} = \\frac{1}{n}\\sum_i 2\\,(\\hat y_i - y_i)\\,x_i \\qquad \\frac{\\partial L}{\\partial b} = \\frac{1}{n}\\sum_i 2\\,(\\hat y_i - y_i)$$

Read them: if the predictions are too high ($\\hat y > y$), both slopes are positive, so the steps make $w$ and $b$ smaller, lowering the line. Points with large $x$ have more say over $w$.` },
        {
          code: {
            file: 'neuron.py', fn: 'gradients', notes: [
              ['grad_w = 0.0', ['The two slopes are sums, so start them at 0…']],
              ['grad_b = 0.0', ['…and add each point\'s share in the loop.']],
              ['for x, y in zip(xs, ys):', ['Each point in turn.']],
              ['error = predict(w, b, x) - y', ['This point\'s miss, $\\hat y_i - y_i$.'], { calc: q => [`(${s(q.w)} × ${s(q.x)} + ${s(q.b)}) − ${s(q.y)}`, q.w * q.x + q.b - q.y] }],
              ['grad_w += 2 * error * x / len(xs)', ['Its share of $\\partial L/\\partial w$: $2 e_i x_i / n$.'], { tex: '\\frac{\\partial L}{\\partial w} \\mathrel{+}= \\frac{2\\,e_i\\,x_i}{n}', calc: q => [`${f(q.grad_w)} + 2 × ${s(q.error)} × ${s(q.x)} / ${q.xs.length}`, q.grad_w + 2 * q.error * q.x / q.xs.length] }],
              ['grad_b += 2 * error / len(xs)', ['Its share of $\\partial L/\\partial b$: $2 e_i / n$.'], { tex: '\\frac{\\partial L}{\\partial b} \\mathrel{+}= \\frac{2\\,e_i}{n}', calc: q => [`${f(q.grad_b)} + 2 × ${s(q.error)} / ${q.xs.length}`, q.grad_b + 2 * q.error / q.xs.length] }],
              ['return grad_w, grad_b', ['The gradient: both slopes.']],
            ],
          },
        },
        {
          code: {
            file: 'neuron.py', fn: 'fit_line', notes: [
              ['xs, ys = make_line(seed=seed)', ['The 20 points of lesson 1.1.']],
              ['w, b = 0.0, 0.0', ['Start anywhere: here the flat line $\\hat y = 0$.']],
              ['history = []', ['The loss after every step, to watch it fall.']],
              ['for step in range(steps):', ['500 steps downhill.']],
              ['grad_w, grad_b = gradients(w, b, xs, ys)', ['Measure the slope where we stand.']],
              ['w = w - rate * grad_w', ['Step against it.'], { tex: 'w \\leftarrow w - \\eta\\,\\frac{\\partial L}{\\partial w}', calc: q => [`${s(q.w)} − ${f(q.rate)} × ${s(q.grad_w)}`, q.w - q.rate * q.grad_w] }],
              ['b = b - rate * grad_b', ['The same for the bias.'], { tex: 'b \\leftarrow b - \\eta\\,\\frac{\\partial L}{\\partial b}', calc: q => [`${s(q.b)} − ${f(q.rate)} × ${s(q.grad_b)}`, q.b - q.rate * q.grad_b] }],
              ['history.append(mse(w, b, xs, ys))', ['Record the new loss.']],
              ['return w, b, history', ['The fitted line, and how it got there.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'At the start, $w = b = 0$. What is $\\partial L/\\partial w$ there? (1 decimal)',
            answer: gradients(0, 0, LX, LY)[0], tolerance: 0.05, compute: () => gradients(0, 0, LX, LY)[0],
            explain: 'About −51. Every prediction is 0 while every $y$ is above 0, so every miss is negative, and multiplied by positive $x$ the slope is strongly negative: raising $w$ lowers the loss. The step $w - 0.02 \\times (-51)$ raises $w$ to about 1.02 at once.',
            misconceptions: [{ answer: -14.7, tolerance: 0.05, feedback: 'That is $\\partial L/\\partial b$. For $w$ each miss is also multiplied by its $x$.' }],
          },
        },
        { figure: 'LossLandscape', caption: 'The loss for every $(w, b)$, and gradient descent\'s path from the red start. Click to start elsewhere; raise the learning rate until it explodes.' },
        {
          predict: {
            prompt: 'After 500 steps with rate 0.02, what is $w$? (3 decimals)',
            answer: fitLine().w, tolerance: 0.0005, compute: () => fitLine().w,
            explain: 'About 2.110, and $b \\approx 0.810$. Not exactly 2 and 1: with only 20 noisy points, the line that fits **these** points best is a little different from the rule that made them. That is normal, and lesson 1.9 meets its consequence: judging a model on data it hasn\'t trained on.',
          },
        },
        { python: { program: 'line', label: 'Step through gradient descent in real Python, every sum worked out' } },
        { note: '**Gradient descent**: measure the loss\'s slope for every number (the gradient, by the chain rule), step each number a little against its slope, repeat. The **learning rate** sets the step: too small crawls, too big overshoots and explodes.' },
      ],
    },

    {
      id: 'a-layer', number: '1.4', title: 'A layer: many neurons at once',
      goal: 'Compute a layer\'s outputs by hand and with `dense`, write it as $W\\mathbf x + \\mathbf b$, and count its weights.',
      builds: ['one-neuron'],
      blocks: [
        { md: `One neuron draws one straight line. A **layer** is several neurons side by side, each looking at the same inputs with its own weights and bias, each giving one output. A layer with 3 neurons turns its inputs into 3 numbers.

With inputs $x_1, \\dots, x_m$, neuron $k$ computes

$$z_k = w_{k,1} x_1 + w_{k,2} x_2 + \\dots + w_{k,m} x_m + b_k$$

Stack the weights into a table with one row per neuron (a **matrix** $W$) and the whole layer is written

$$\\mathbf z = W\\mathbf x + \\mathbf b$$

That is all "matrix multiplication" means here: each row of $W$ times the inputs, added up. PyTorch's \`nn.Linear\` and Keras's \`Dense\` are exactly this.` },
        {
          symbols: [
            ['W', 'capital W', 'the layer\'s weights: one row per neuron, one column per input', 'weights'],
            ['w_{k,j}', 'w k j', 'neuron $k$\'s weight for input $j$', 'neuron_weights[j]'],
            ['\\mathbf b', 'bold b', 'one bias per neuron', 'biases'],
            ['\\mathbf z', 'bold z', 'one sum per neuron: the layer\'s output before any activation', 'outputs'],
          ],
        },
        {
          code: {
            file: 'layer.py', fn: 'dense', notes: [
              ['outputs = []', ['One output per neuron, to be filled in.']],
              ['for neuron_weights, bias in zip(weights, biases):', ['Each neuron in turn: its row of weights and its bias.']],
              ['total = bias', ['Start the sum at the bias…']],
              ['for w, x in zip(neuron_weights, inputs):', ['…then each input with its weight…']],
              ['total += w * x', ['…multiplied and added.'], { tex: 'z_k \\mathrel{+}= w_{k,j}\\,x_j', calc: q => [`${f(q.total)} + ${s(q.w)} × ${s(q.x)}`, q.total + q.w * q.x] }],
              ['outputs.append(total)', ['This neuron\'s $z_k$.']],
              ['return outputs', ['The layer\'s outputs: $W\\mathbf x + \\mathbf b$.'], { tex: '\\mathbf z = W\\mathbf x + \\mathbf b' }],
            ],
          },
        },
        {
          code: {
            file: 'layer.py', fn: 'show_layer', notes: [
              ['weights = [[1.5], [-0.5], [0.8]]', ['Three neurons, one input: a 3 × 1 table, one row per neuron.']],
              ['biases = [0.0, 1.0, -2.0]', ['One bias each.']],
              ['z = dense([x], weights, biases)', ['The layer, on the single input `x` (in a list, because a layer takes a list of inputs).'], { calc: q => [`dense([${f(q.x)}], …)`, dense([q.x], q.weights, q.biases)] }],
              ['return z, relu(z), sigmoid(z), tanh(z)', ['The sums, and what each activation (next lesson) makes of them.']],
            ],
          },
        },
        { figure: 'LayerFig', caption: 'Three neurons, one input. Change the weights and biases, slide $x$, and read each neuron\'s sum.' },
        {
          predict: {
            prompt: 'With weights $[[1.5], [-0.5], [0.8]]$, biases $[0, 1, -2]$ and $x = 2$, what is the **third** neuron\'s output $z_2$?',
            answer: dense([2], [[1.5], [-0.5], [0.8]], [0, 1, -2])[2], tolerance: 1e-9, compute: () => dense([2], [[1.5], [-0.5], [0.8]], [0, 1, -2])[2],
            explain: '$0.8 \\times 2 + (-2) = -0.4$. (The other two: $1.5 \\times 2 + 0 = 3$ and $-0.5 \\times 2 + 1 = 0$.)',
          },
        },
        {
          predict: {
            prompt: 'A layer takes 4 inputs and has 16 neurons. How many numbers (weights and biases) does it have?',
            answer: 4 * 16 + 16, compute: () => 4 * 16 + 16,
            explain: '$16 \\times 4 = 64$ weights (a 16 × 4 matrix) plus 16 biases: **80**. This is how networks get big: a layer from 784 inputs to 128 neurons has 100,480.',
            misconceptions: [{ answer: 64, feedback: 'That counts the weights only. Each of the 16 neurons also has a bias.' }],
          },
        },
        { python: { program: 'layer', label: 'Run one layer by hand in real Python' } },
        { note: 'A **layer** is neurons side by side: $\\mathbf z = W\\mathbf x + \\mathbf b$, one row of $W$ per neuron. It has (inputs × neurons) weights plus one bias per neuron. `nn.Linear(inputs, neurons)` in PyTorch, `Dense(neurons)` in Keras.' },
      ],
    },

    {
      id: 'activations', number: '1.5', title: 'Activations: why a network can bend',
      goal: 'Compute ReLU, sigmoid and tanh, explain why layers without them collapse into one straight line, and build a curve out of ReLU hinges.',
      builds: ['a-layer'],
      blocks: [
        { md: `Stack two layers and you might expect something more powerful than a line. It isn't. A layer computes $W_1\\mathbf x + \\mathbf b_1$; feed that into another:

$$W_2(W_1\\mathbf x + \\mathbf b_1) + \\mathbf b_2 = (W_2W_1)\\,\\mathbf x + (W_2\\mathbf b_1 + \\mathbf b_2)$$

That is a single layer again, with weights $W_2W_1$. Any number of stacked layers is still a straight line (a flat plane, with more inputs). To fit a curve, something between the layers must **bend**: a simple non-linear function applied to every neuron's output, the **activation**.` },
        {
          code: {
            file: 'layer.py', from: 14, to: 27, notes: [
              ['return [max(0.0, v) for v in values]', ['**ReLU** ("rectified linear unit"): negative numbers become 0, positive ones pass unchanged. A list comprehension applies it to every neuron\'s output.'], { tex: '\\text{ReLU}(z) = \\max(0, z)', calc: q => [`max(0, each of ${v(q.values)})`, q.values.map(x => Math.max(0, x))] }],
              ['return [1 / (1 + math.exp(-v)) for v in values]', ['**Sigmoid**: $e^{-z}$ is huge for very negative $z$ (so the result is near 0) and near 0 for very positive $z$ (result near 1). Part 2 uses it to make probabilities.'], { tex: '\\sigma(z) = \\frac{1}{1 + e^{-z}}', calc: q => [`1 / (1 + e^(−z)) for each of ${v(q.values)}`, q.values.map(x => 1 / (1 + Math.exp(-x)))] }],
              ['return [math.tanh(v) for v in values]', ['**Tanh** (hyperbolic tangent): an S-curve like sigmoid, but from −1 to 1.'], { tex: '\\tanh z = \\frac{e^z - e^{-z}}{e^z + e^{-z}}', calc: q => [`tanh of each of ${v(q.values)}`, q.values.map(Math.tanh)] }],
            ],
          },
        },
        { figure: 'ActivationFig', caption: 'Each activation and, dashed, its slope. The slope matters as much as the shape: backpropagation (next lesson) multiplies by it.' },
        {
          predict: {
            prompt: 'The layer of lesson 1.4 gave $\\mathbf z = [3, 0, -0.4]$. What is $\\sigma(0)$, the sigmoid of the middle one?',
            answer: ACTIVATIONS.sigmoid.f(0), tolerance: 1e-9, compute: () => ACTIVATIONS.sigmoid.f(0),
            explain: '$1/(1 + e^0) = 1/2$. Sigmoid sits exactly halfway at 0. (ReLU of the three gives $[3, 0, 0]$: the −0.4 is cut to 0.)',
          },
        },
        { h: 'A curve out of hinges' },
        { md: `Why does something as plain as ReLU make a network powerful? Take a network with one input, a hidden layer of ReLU neurons, and one output neuron that adds them up:

$$\\hat y = b_2 + \\sum_j w_{2,j}\\,\\text{ReLU}(w_{1,j}\\,x + b_{1,j})$$

Each term is a **hinge**: flat on one side of the point $x = -b_{1,j}/w_{1,j}$, a straight slope on the other. Add hinges with their corners in different places and you get a line that bends at each corner. With enough hinges, it can follow any curve as closely as you like. That is the whole secret, in one dimension.` },
        { figure: 'HingeBuilder', caption: 'Three hidden neurons, three hinges, one curve. Bend the black line onto the points by hand, then press the button for the weights gradient descent finds. Switch the activation off and no setting works.' },
        {
          choice: {
            prompt: 'A network has 5 layers of 100 neurons each, and no activations. What can it fit?',
            options: [
              { text: 'Only a straight line (a flat plane, with more inputs), however many layers it has', why: 'Yes. Without activations the layers multiply out into one layer. All that size buys nothing.' },
              { text: 'Any curve, because it has 500 neurons', why: 'Neurons only help if something bends between the layers. Without activations every layer is linear, and so is their combination.' },
              { text: 'A curve with 5 bends, one per layer', why: 'Bends come from activations; with none there are none.' },
              { text: 'Nothing: it won\'t run', why: 'It runs fine. It just can\'t be anything but linear.' },
            ],
            answer: 0,
          },
        },
        { note: 'An **activation** bends each neuron\'s output: **ReLU** $\\max(0, z)$, **sigmoid** $1/(1+e^{-z})$, **tanh**. Without one, stacked layers collapse into one straight line. With ReLU, each hidden neuron adds a hinge, and hinges add up to curves.' },
      ],
    },

    {
      id: 'backprop', number: '1.6', title: 'Backpropagation by hand',
      goal: 'Run a point forward through a 1 → hidden → 1 ReLU network keeping every number, then work its gradient back through it with the chain rule, and check one slope numerically.',
      builds: ['activations', 'gradient-descent'],
      blocks: [
        { md: `Gradient descent needs the loss's slope for **every** weight. For one neuron (lesson 1.3) we worked it out directly. For a network, the trick is to work **backwards**: the loss depends on $\\hat y$, which depends on the hidden outputs, which depend on the first layer's weights. The **chain rule** says the slopes along such a chain multiply:

$$\\frac{\\partial L}{\\partial w_{1,j}} = \\frac{\\partial L}{\\partial \\hat y}\\cdot\\frac{\\partial \\hat y}{\\partial h_j}\\cdot\\frac{\\partial h_j}{\\partial z_j}\\cdot\\frac{\\partial z_j}{\\partial w_{1,j}}$$

Each factor is something simple, and each was met already:

| factor | because | so it is |
|---|---|---|
| $\\partial L/\\partial \\hat y$ | $L = (\\hat y - y)^2$ | $2(\\hat y - y)$ |
| $\\partial \\hat y/\\partial h_j$ | $\\hat y = b_2 + \\sum_j w_{2,j} h_j$ | $w_{2,j}$ |
| $\\partial h_j/\\partial z_j$ | $h_j = \\text{ReLU}(z_j)$ | 1 if $z_j > 0$, else 0 |
| $\\partial z_j/\\partial w_{1,j}$ | $z_j = w_{1,j}x + b_{1,j}$ | $x$ |

Working from the output back, each step reuses the product so far. That is **backpropagation**: the forward pass computes and remembers every in-between number; the backward pass multiplies slopes from the loss back to every weight.` },
        {
          code: {
            file: 'tinynet.py', fn: 'init_net', notes: [
              ['rng = random.Random(seed)', ['Random starting weights, repeatable.']],
              ['w1 = [rng.uniform(-1, 1) for j in range(hidden)]', ['Hidden layer: one weight per hidden neuron (there is one input). PyTorch starts a layer\'s weights uniform in $\\pm 1/\\sqrt{\\text{inputs}}$, here $\\pm 1$.']],
              ['b1 = [rng.uniform(-1, 1) for j in range(hidden)]', ['One bias per hidden neuron.']],
              ['bound = 1 / math.sqrt(hidden)', ['The output neuron has `hidden` inputs, so its weights start within $\\pm 1/\\sqrt{\\text{hidden}}$: the more inputs, the smaller each weight, so the sum starts small.'], { calc: q => [`1 / √${q.hidden}`, 1 / Math.sqrt(q.hidden)] }],
              ['w2 = [rng.uniform(-bound, bound) for j in range(hidden)]', ['Output layer: one weight per hidden neuron.']],
              ['b2 = rng.uniform(-bound, bound)', ['And its bias.']],
              ['return {"w1": w1, "b1": b1, "w2": w2, "b2": b2}', ['A dictionary of the four parts, by name.']],
            ],
          },
        },
        {
          code: {
            file: 'tinynet.py', fn: 'forward', notes: [
              ['z = [w * x + b for w, b in zip(net["w1"], net["b1"])]', ['The hidden layer\'s sums, $z_j = w_{1,j}x + b_{1,j}$ (`dense` with one input).'], { tex: 'z_j = w_{1,j}\\,x + b_{1,j}', calc: q => [`w1·${f(q.x)} + b1 for each hidden neuron`, q.net.w1.map((w, j) => w * q.x + q.net.b1[j])] }],
              ['h = relu(z)', ['ReLU on each.'], { tex: 'h_j = \\max(0, z_j)', calc: q => [`ReLU of ${v(q.z)}`, q.z.map(t => Math.max(0, t))] }],
              ['y_hat = net["b2"]', ['The output neuron: start at its bias…']],
              ['for w, h_j in zip(net["w2"], h):', ['…and add each hidden output times its weight.']],
              ['y_hat += w * h_j', ['$\\hat y \\mathrel{+}= w_{2,j}h_j$.'], { calc: q => [`${f(q.y_hat)} + ${s(q.w)} × ${f(q.h_j)}`, q.y_hat + q.w * q.h_j] }],
              ['return y_hat, z, h', ['The prediction **and** the in-between numbers $z$ and $h$: the backward pass needs them.']],
            ],
          },
        },
        {
          code: {
            file: 'tinynet.py', fn: 'backward', notes: [
              ['d_y_hat = 2 * (y_hat - y)', ['$\\partial L/\\partial \\hat y$, the first factor of every chain.'], { tex: '\\frac{\\partial L}{\\partial \\hat y} = 2(\\hat y - y)', calc: q => [`2 × (${s(q.y_hat)} − ${s(q.y)})`, 2 * (q.y_hat - q.y)] }],
              ['grads = {"w1": [], "b1": [], "w2": [], "b2": d_y_hat}', ['$\\partial L/\\partial b_2$ is the same as $\\partial L/\\partial \\hat y$: $\\hat y$ grows exactly as fast as $b_2$.']],
              ['for j in range(len(h)):', ['Each hidden neuron in turn, back along its chain.']],
              ['grads["w2"].append(d_y_hat * h[j])', ['$\\partial L/\\partial w_{2,j} = \\partial L/\\partial \\hat y \\cdot h_j$: $w_{2,j}$ is multiplied by $h_j$ on the way to $\\hat y$.'], { tex: '\\frac{\\partial L}{\\partial w_{2,j}} = \\frac{\\partial L}{\\partial \\hat y}\\,h_j', calc: q => [`${s(q.d_y_hat)} × ${f(q.h[q.j])}`, q.d_y_hat * q.h[q.j]] }],
              ['d_h = d_y_hat * net["w2"][j]', ['One step further back: how the loss changes with this hidden output.'], { tex: '\\frac{\\partial L}{\\partial h_j} = \\frac{\\partial L}{\\partial \\hat y}\\,w_{2,j}', calc: q => [`${s(q.d_y_hat)} × ${s(q.net.w2[q.j])}`, q.d_y_hat * q.net.w2[q.j]] }],
              ['d_z = d_h if z[j] > 0 else 0.0', ['Back through ReLU: its slope is 1 where the neuron was on, 0 where it was off. An "off" neuron passes no gradient back, so this point can\'t change its weights.'], { tex: '\\frac{\\partial L}{\\partial z_j} = \\frac{\\partial L}{\\partial h_j}\\cdot\\mathbb 1[z_j > 0]', logic: 'If this neuron\'s sum was positive (ReLU passed it through), the gradient passes back unchanged; if it was zero or negative (ReLU cut it to 0), nothing passes back.', calc: q => [`${s(q.d_h)} if ${s(q.z[q.j])} > 0 else 0`, q.z[q.j] > 0 ? q.d_h : 0] }],
              ['grads["w1"].append(d_z * x)', ['Last step: $z_j = w_{1,j}x + b_{1,j}$, so its weight\'s slope is $\\partial L/\\partial z_j \\cdot x$…'], { tex: '\\frac{\\partial L}{\\partial w_{1,j}} = \\frac{\\partial L}{\\partial z_j}\\,x', calc: q => [`${s(q.d_z)} × ${s(q.x)}`, q.d_z * q.x] }],
              ['grads["b1"].append(d_z)', ['…and its bias\'s is $\\partial L/\\partial z_j$ itself.']],
              ['return grads', ['A slope for every one of the network\'s numbers.']],
            ],
          },
        },
        { figure: 'BackpropFig', caption: 'A 1 → 3 → 1 network and one point. **Forward** shows every number on the way to $\\hat y$; **Backward** shows every slope on the way back. The last line checks one slope without any calculus.' },
        {
          predict: {
            prompt: 'One hidden neuron: $w_1 = 1$, $b_1 = -1$, $w_2 = 0.5$, $b_2 = 0$. The point is $x = 2$, $y = 1$. Forward: $z = 1$, $h = 1$, $\\hat y = 0.5$. What is $\\partial L/\\partial w_1$?',
            answer: backward(tiny, 2, 1, forward(tiny, 2)).w1[0], tolerance: 1e-9, compute: () => backward(tiny, 2, 1, forward(tiny, 2)).w1[0],
            explain: '$\\partial L/\\partial \\hat y = 2(0.5 - 1) = -1$; $\\partial L/\\partial h = -1 \\times 0.5 = -0.5$; the neuron is on ($z = 1 > 0$) so $\\partial L/\\partial z = -0.5$; $\\partial L/\\partial w_1 = -0.5 \\times x = -1$. Negative: raising $w_1$ would raise $\\hat y$ towards 1.',
            misconceptions: [{ answer: -0.5, feedback: 'That is $\\partial L/\\partial z$ (and $\\partial L/\\partial b_1$). One more factor for $w_1$: it is multiplied by $x = 2$.' }],
          },
        },
        { note: '**Backpropagation**: run forward, keeping every in-between number; then go back, multiplying slopes (the chain rule): $\\partial L/\\partial \\hat y$, times the next weight, times the activation\'s slope, times the input. A neuron ReLU switched off passes nothing back.' },
      ],
    },

    {
      id: 'train-a-net', number: '1.7', title: 'Training a network',
      goal: 'Combine forward, backward and gradient descent into a training loop, train a network on a curve, and say what more hidden neurons and the learning rate change.',
      builds: ['backprop'],
      blocks: [
        { md: `Training is lesson 1.3's loop with lesson 1.6's gradients: for every point, forward then backward; average the gradients over the points; step every weight; repeat. The data are points near $y = \\sin x$, which no straight line fits.` },
        {
          code: {
            file: 'data.py', fn: 'make_curve', notes: [
              ['rng = random.Random(seed)', ['Repeatable random numbers.']],
              ['xs, ys = [], []', ['The points.']],
              ['for i in range(n):', ['40 of them.']],
              ['x = rng.uniform(-3, 3)', ['Inputs from −3 to 3.']],
              ['y = math.sin(x) + rng.uniform(-0.1, 0.1)', ['A curve, plus a little noise (up to 0.1).'], { tex: 'y = \\sin x + \\varepsilon' }],
              ['xs.append(x)', ['Keep both.']],
              ['ys.append(y)', ['…']],
              ['return xs, ys', ['The points.']],
            ],
          },
        },
        {
          code: {
            file: 'tinynet.py', from: 41, to: 70, notes: [
              ['n = len(xs)', ['The number of points.']],
              ['total = {"w1": [0.0] * len(net["w1"])', ['A dictionary shaped like the network, all zeros, to add every point\'s gradients into. `[0.0] * 8` is a list of eight zeros.']],
              ['loss = 0.0', ['The loss over all points, added up as we go.']],
              ['for x, y in zip(xs, ys):', ['Each point:']],
              ['y_hat, z, h = forward(net, x)', ['…forward…']],
              ['loss += (y_hat - y) ** 2 / n', ['…its share of the mean squared error…'], { calc: q => [`${f(q.loss)} + (${s(q.y_hat)} − ${s(q.y)})² / ${q.n}`, q.loss + (q.y_hat - q.y) ** 2 / q.n] }],
              ['grads = backward(net, x, y, y_hat, z, h)', ['…backward…']],
              ['for name in ("w1", "b1", "w2"):', ['…and its gradients added into the totals, divided by $n$ so the totals end up as averages.']],
              ['for j in range(len(net[name])):', ['Each number in that list.']],
              ['total[name][j] += grads[name][j] / n', ['Add this point\'s share.']],
              ['total["b2"] += grads["b2"] / n', ['And the output bias\'s.']],
              ['for name in ("w1", "b1", "w2"):', ['Now one step for every weight…']],
              ['for j in range(len(net[name])):', ['…each number in each list…']],
              ['net[name][j] -= rate * total[name][j]', ['…moved against its average slope: lesson 1.3\'s step, for every weight at once. `-=` changes the network in place.'], { tex: 'w \\leftarrow w - \\eta\\,\\frac{\\partial L}{\\partial w}', calc: q => [`${f(q.net[q.name][q.j])} − ${f(q.rate)} × ${s(q.total[q.name][q.j])}`, q.net[q.name][q.j] - q.rate * q.total[q.name][q.j]] }],
              ['net["b2"] -= rate * total["b2"]', ['And the output bias.']],
              ['return loss', ['The loss before this step.']],
              ['xs, ys = make_curve(seed=seed)', ['The curve\'s 40 points.']],
              ['net = init_net(hidden, seed)', ['A new network with random weights.']],
              ['history = []', ['The loss at every step.']],
              ['for step in range(steps):', ['2,000 steps.']],
              ['loss = train_step(net, xs, ys, rate)', ['One step of everything above.']],
              ['history.append(loss)', ['Keep the loss.']],
              ['return net, history', ['The trained network and its learning curve.']],
            ],
          },
        },
        { figure: 'CurveTrainer', caption: 'Train it. Try 1 hidden neuron (one hinge: hopeless), 3, 8 and 32. Then push the learning rate up until training goes wrong.' },
        {
          predict: {
            prompt: 'With 8 hidden neurons, rate 0.05 and 2,000 steps (seed 0), what is the loss at the last step? (4 decimals)',
            answer: trainNet().history.at(-1), tolerance: 0.00005, compute: () => trainNet().history.at(-1),
            explain: 'About 0.0049. The noise alone (up to ±0.1) has a mean square of about 0.0033, so the network has nearly reached the best possible fit. With 2 neurons it gets stuck near 0.019: two hinges can\'t follow a sine wave.',
          },
        },
        { python: { program: 'net', label: 'Step through training in real Python: forward, backward, step' } },
        { note: 'A **training loop**: for every point, forward and backward; average the gradients; step every weight against its slope; repeat. More hidden neurons means more hinges and a closer fit; a learning rate too large makes training jump about or blow up.' },
      ],
    },

    {
      id: 'pytorch-net', number: '1.8', title: 'The same network in PyTorch (and Keras)',
      goal: 'Build lesson 1.7\'s network with `nn.Sequential`, train it with PyTorch\'s loss, `backward` and optimiser, check it gives the hand-written numbers, and read the same model in Keras.',
      builds: ['train-a-net'],
      blocks: [
        { md: `Everything in lesson 1.7, the layer, ReLU, the loss, backpropagation and the step, has a PyTorch version:

| By hand (lessons 1.4–1.7) | PyTorch |
|---|---|
| \`dense\` with weights and biases | \`nn.Linear(inputs, neurons)\` |
| \`relu\` | \`nn.ReLU()\` |
| layers one after another | \`nn.Sequential(…)\` |
| \`forward(net, x)\` | \`model(x)\` |
| the mean squared error | \`((prediction - y) ** 2).mean()\` |
| \`backward\`, all of it | \`loss.backward()\` |
| \`net[name][j] -= rate * total[name][j]\` | \`optimizer.step()\` |

PyTorch works on **tensors**: arrays of numbers, like lists of lists, that remember how they were computed so \`backward()\` can work back through them. And it handles all 40 points at once: \`x\` is a 40 × 1 tensor, and \`model(x)\` gives 40 predictions in one call.` },
        {
          code: {
            file: 'torch_net.py', fn: 'make_model', notes: [
              ['return nn.Sequential(nn.Linear(1, hidden), nn.ReLU(), nn.Linear(hidden, 1))', ['1 input → `hidden` neurons → ReLU → 1 output: exactly `tinynet`\'s network. `nn.Sequential` runs the layers in order.'], { tex: '\\hat y = W_2\\,\\text{ReLU}(W_1 x + \\mathbf b_1) + b_2' }],
            ],
          },
        },
        {
          code: {
            file: 'torch_net.py', fn: 'copy_weights', notes: [
              ['with torch.no_grad():', ['Changing weights by hand isn\'t something to differentiate: switch gradient tracking off for these lines.']],
              ['model[0].weight.copy_(torch.tensor(net["w1"]).unsqueeze(1))', ['`model[0]` is the first layer. Its weight is a `hidden` × 1 matrix; `unsqueeze(1)` turns the list of 8 into 8 rows of 1. `copy_` (with the underscore) overwrites in place.']],
              ['model[0].bias.copy_(torch.tensor(net["b1"]))', ['The hidden biases.']],
              ['model[2].weight.copy_(torch.tensor([net["w2"]]))', ['`model[2]` is the output layer (`model[1]` is the ReLU, which has no weights): a 1 × `hidden` matrix.']],
              ['model[2].bias.copy_(torch.tensor([net["b2"]]))', ['Its bias.']],
            ],
          },
        },
        {
          code: {
            file: 'torch_net.py', fn: 'train_torch', notes: [
              ['xs, ys = make_curve(seed=seed)', ['The same 40 points.']],
              ['x = torch.tensor(xs).unsqueeze(1)', ['A 40 × 1 tensor: one row per point, one column per input.']],
              ['y = torch.tensor(ys).unsqueeze(1)', ['The true outputs, 40 × 1.']],
              ['model = make_model(hidden)', ['The network.']],
              ['copy_weights(model, init_net(hidden, seed))', ['Start from exactly the hand-made network\'s weights, so the two can be compared number for number.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=rate)', ['**SGD**, stochastic gradient descent: the plain step `weight -= lr * gradient`. `model.parameters()` hands it every weight and bias.']],
              ['history = []', ['The loss at every step.']],
              ['for step in range(steps):', ['The same 2,000 steps.']],
              ['prediction = model(x)', ['Forward, all 40 points at once: a 40 × 1 tensor.']],
              ['loss = ((prediction - y) ** 2).mean()', ['The mean squared error. PyTorch records every operation, ready for `backward`.'], { tex: 'L = \\frac1n\\sum_i (\\hat y_i - y_i)^2' }],
              ['optimizer.zero_grad()', ['Clear the previous step\'s gradients: PyTorch **adds** new gradients to old ones unless told to start from zero.']],
              ['loss.backward()', ['Backpropagation, all of lesson 1.6, for every weight: the results land in each weight\'s `.grad`.']],
              ['optimizer.step()', ['Every weight moved: `weight -= lr * weight.grad`.']],
              ['history.append(loss.item())', ['`.item()` turns a one-number tensor into a plain Python float.']],
              ['return model, history', ['The trained model and its curve.']],
            ],
          },
        },
        {
          code: {
            file: 'torch_net.py', fn: 'compare', notes: [
              ['xs, ys = make_curve(seed=seed)', ['The points.']],
              ['net = init_net(hidden, seed)', ['The hand-made network.']],
              ['by_hand = [train_step(net, xs, ys, 0.05) for step in range(steps)]', ['Train it by hand, keeping each step\'s loss.']],
              ['model, with_torch = train_torch(hidden, steps, 0.05, seed)', ['Train the PyTorch one from the same start.']],
              ['gap = max(abs(a - b) for a, b in zip(by_hand, with_torch))', ['The largest difference between the two loss histories.']],
              ['print("loss after", steps', ['Measured: both reach 0.0772334 after 200 steps; the largest gap is 6 × 10⁻⁸, from PyTorch computing in 32-bit floats and Python in 64-bit.']],
              ['return gap', ['The gap.']],
            ],
          },
        },
        { h: 'The same model in Keras' },
        { md: `Keras builds the identical network, and hides the training loop inside \`fit\`:

\`\`\`python
from tensorflow import keras
from keras import layers

model = keras.Sequential([
    layers.Dense(8, activation="relu", input_shape=(1,)),   # nn.Linear(1, 8) + nn.ReLU()
    layers.Dense(1),                                        # nn.Linear(8, 1)
])
model.compile(optimizer=keras.optimizers.SGD(learning_rate=0.05), loss="mse")
model.fit(x, y, epochs=2000, batch_size=40)                # the whole for-loop above
\`\`\`

- \`Dense(8, activation="relu")\` is \`nn.Linear\` followed by \`nn.ReLU\`: Keras puts the activation inside the layer. Keras works out the input size itself (here given by \`input_shape\`).
- \`compile\` chooses the loss and the optimiser.
- \`fit\` runs PyTorch's loop for you: forward, loss, zero the gradients, backward, step, \`epochs\` times. \`batch_size=40\` means all 40 points per step, as here; Part 5 explains smaller batches.

So the PyTorch loop is not extra work for nothing: it is \`fit\` opened up, and every line in it is something you have now written by hand.` },
        { python: { program: 'torch', label: 'Run the comparison in real Python: hand-made against PyTorch' } },
        { note: '`nn.Linear`, `nn.ReLU`, `nn.Sequential` build lesson 1.7\'s network; a training step is `loss = …`, `zero_grad()`, `loss.backward()`, `optimizer.step()`. From the same start, PyTorch gives the hand-written numbers. Keras\'s `Dense(…, activation=…)` and `fit` are the same pieces, with the loop hidden.' },
      ],
    },

    {
      id: 'fuel-economy', number: '1.9', title: 'Real data: predicting fuel economy',
      goal: 'Load and clean a real data set, scale its inputs, keep test data aside, train a network with two inputs, judge it on cars it never saw, and use it on a car you describe.',
      builds: ['pytorch-net'],
      blocks: [
        { md: `Time for real data: 398 cars sold in the US from 1970 to 1982, with their fuel economy in miles per gallon (the **Auto MPG** data set, from the UCI Machine Learning Repository, Quinlan 1993, CC BY 4.0). The task: predict a car's mpg from its weight and its horsepower. Two inputs this time, so the first layer is \`nn.Linear(2, 16)\`.

Real data brings three new steps, each of which matters as much as the network: **cleaning**, **scaling** and **testing**.` },
        {
          code: {
            file: 'cars.py', fn: 'load_cars', notes: [
              ['cars = []', ['One tuple per usable car.']],
              ['with open(os.path.join(HERE, "cars.csv"), encoding="utf-8") as handle:', ['Open the data file that sits next to this program (`HERE` is this file\'s folder). `with` closes it again afterwards.']],
              ['for row in csv.DictReader(handle):', ['`csv.DictReader` reads a CSV file row by row, each row a dictionary keyed by the column names in the first line: `row["mpg"]`.']],
              ['if row["horsepower"] == "?":', ['**Cleaning**: six cars have no horsepower recorded, written as "?" in the file.'], { logic: 'If this car\'s horsepower is unknown, skip it: a model can\'t learn from a number that isn\'t there.' }],
              ['continue', ['Skip to the next row.']],
              ['cars.append((row["name"], float(row["weight"])', ['Keep the name and three numbers. CSV gives text, so `float` turns `"3504."` into the number 3504.']],
              ['return cars', ['392 cars.']],
            ],
          },
        },
        { h: 'Keeping test data aside' },
        { md: `A model can do well on the data it trained on simply by fitting its quirks, and then fail on anything new. The only honest measure is data it has **never seen**. So before training, shuffle the cars and set a fifth aside: the **test set**. The model learns from the other four-fifths, the **training set**, and is judged on the test set once, at the end.` },
        {
          code: {
            file: 'cars.py', fn: 'split', notes: [
              ['shuffled = list(cars)', ['A copy, so the caller\'s list isn\'t reordered.']],
              ['random.Random(seed).shuffle(shuffled)', ['Shuffle in place, repeatably. (The file is in order of year; without shuffling, the test set would be all 1982 cars.)']],
              ['n_test = int(len(shuffled) * test_fraction)', ['A fifth: 78 of 392.'], { calc: q => [`int(${q.shuffled.length} × ${q.test_fraction})`, Math.trunc(q.shuffled.length * q.test_fraction)] }],
              ['return shuffled[n_test:], shuffled[:n_test]', ['Slices: everything from position 78 on for training, the first 78 for testing.']],
            ],
          },
        },
        { h: 'Scaling the inputs' },
        { md: `Weight is in thousands of pounds (1,600 to 5,100); horsepower in tens and hundreds (46 to 230). Fed in raw, the weight's huge numbers would dominate every sum, and its gradients would be thousands of times larger than horsepower's: lesson 1.3's long, narrow valley, much worse. The fix is to put every input on the same scale: subtract its average and divide by its **spread** (standard deviation), so each becomes "how many spreads above or below average":

$$x' = \\frac{x - \\mu}{\\sigma}$$

The averages and spreads come from the **training** cars only, and are then used for everything, test cars and your car included, so no information leaks from the test set.` },
        {
          symbols: [
            ['\\mu', 'mu', 'the average (mean) of a column, over the training cars', 'mean'],
            ['\\sigma', 'sigma', 'its spread (standard deviation): the typical distance from the average', 'spread'],
            ["x'", 'x prime', 'a scaled input: how many spreads from the average', 'scale(…)'],
          ],
        },
        {
          code: {
            file: 'cars.py', from: 30, to: 40, notes: [
              ['mean = sum(values) / len(values)', ['The average.'], { tex: '\\mu = \\frac1n\\sum_i x_i' }],
              ['spread = (sum((v - mean) ** 2 for v in values) / len(values)) ** 0.5', ['The average squared distance from the mean, then its square root (`** 0.5`): the standard deviation.'], { tex: '\\sigma = \\sqrt{\\tfrac1n\\textstyle\\sum_i (x_i - \\mu)^2}' }],
              ['return mean, spread', ['Both.']],
              ['(w_mean, w_spread), (h_mean, h_spread) = stats', ['Unpack the two pairs: weight\'s and horsepower\'s.']],
              ['return torch.tensor([[(weight - w_mean) / w_spread, (hp - h_mean) / h_spread]', ['For every car, a row of two scaled inputs. `for name, weight, hp, mpg in cars` unpacks each car\'s tuple.'], { tex: "x' = (x - \\mu)/\\sigma" }],
            ],
          },
        },
        {
          predict: {
            prompt: 'The training cars\' weights average 2996.2 lb with a spread of 845.8 lb. A car weighs 3,000 lb. What is its scaled weight? (3 decimals)',
            answer: (3000 - carData(0).stats[0][0]) / carData(0).stats[0][1], tolerance: 0.0005, compute: () => (3000 - carData(0).stats[0][0]) / carData(0).stats[0][1],
            explain: '$(3000 - 2996.2)/845.8 \\approx 0.004$: almost exactly average. A 3,846 lb car would be about 1, one spread heavier than average.',
          },
        },
        {
          code: {
            file: 'cars.py', fn: 'train_cars', notes: [
              ['torch.manual_seed(seed)', ['Seeds PyTorch\'s random numbers: its starting weights repeat.']],
              ['train, test = split(load_cars(), seed=seed)', ['Clean, shuffle, split: 314 cars to learn from, 78 to test.']],
              ['stats = (mean_and_spread([car[1] for car in train])', ['Averages and spreads of weight (`car[1]`) and horsepower (`car[2]`), **training cars only**.']],
              ['x = scale(train, stats)', ['The inputs, 314 × 2.']],
              ['y = torch.tensor([[car[3]] for car in train])', ['The targets: mpg, 314 × 1.']],
              ['model = nn.Sequential(nn.Linear(2, hidden), nn.ReLU(), nn.Linear(hidden, 1))', ['Two inputs now: 2 → 16 → 1.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=rate)', ['Plain gradient descent.']],
              ['for step in range(steps):', ['3,000 steps.']],
              ['loss = ((model(x) - y) ** 2).mean()', ['Forward and the mean squared error, in one line.']],
              ['optimizer.zero_grad()', ['Clear.']],
              ['loss.backward()', ['Backpropagate.']],
              ['optimizer.step()', ['Step.']],
              ['with torch.no_grad():', ['Judging, not training: no gradients.']],
              ['test_miss = (model(scale(test, stats)) - torch.tensor', ['On the 78 test cars: predictions minus truths, `.abs()` makes each miss positive, `.mean()` averages. Reported in mpg, which is easier to read than a squared error.'], { tex: '\\text{miss} = \\frac1{n_\\text{test}}\\sum |\\hat y_i - y_i|' }],
              ['print("trained on", len(train)', ['Measured: off by 3.25 mpg on average, on cars it never saw.']],
              ['return model, stats, test_miss', ['The model, the scaling it needs, and its test score.']],
            ],
          },
        },
        {
          code: {
            file: 'cars.py', fn: 'predict_mpg', notes: [
              ['with torch.no_grad():', ['Just predicting.']],
              ['return model(scale([("yours", weight, horsepower, 0.0)], stats)).item()', ['Your car as a one-car list (name and mpg are placeholders: only weight and horsepower are used), scaled with the **training** statistics, through the model.']],
            ],
          },
        },
        { figure: 'CarsFig', caption: 'Train a straight line and a 2 → 16 → 1 network on the same 314 cars, compare them on the 78 test cars, then describe a car and ask both.' },
        { md: `Measured (seed 0): the straight line misses the test cars by 3.42 mpg on average, the network by 3.25. The network wins, but only a little. Fuel economy really is close to a smooth curve in weight and power; the rest depends on things the model isn't told (engine design, aerodynamics, model year). **A network can only find what is in its inputs.** Lesson 1.9's real lesson is that the data matters more than the model.` },
        { python: { program: 'cars', label: 'Train the fuel-economy model in real Python' } },
        { note: 'Real data: **clean** it (skip missing values), keep a **test set** aside before training, **scale** each input to (value − mean) / spread using the training data\'s statistics, train, then judge on the test set in units people understand. And use it: scale a new input the same way and run it through the model.' },
      ],
    },
  ],
}
