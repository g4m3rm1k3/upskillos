// Part 2: yes or no. A probability from a neuron (sigmoid), the cross-entropy loss and logistic
// regression by hand, drawing your own data, bending the boundary with a hidden layer (PyTorch's
// BCEWithLogitsLoss), real data (tumours), and judging a yes/no model with a threshold.
import { makeBlobs, predictProb, bce, trainLogistic, accuracy, confusion, scores, tumourData, sigmoid } from '../engine/part2.js'
import { makeMLP, makeOptimizer, trainSteps, predictOne } from '../engine/mlp.js'
import { f, s } from './util.js'

const [BP, BL] = makeBlobs()
const lastLogistic = () => { let last; for (const step of trainLogistic()) last = step; return last }
const tumourCounts = threshold => {
  const d = tumourData(null, 0), m = makeMLP(30, [{ units: 1 }], 0), opt = makeOptimizer(m, { rate: 0.1 })
  trainSteps(m, opt, d.X, d.Y, 1000, 'bce')
  return confusion(d.Xtest.map(x => sigmoid(predictOne(m, x)[0])), d.testLabels, threshold)
}

export const PART2 = {
  id: 'part2', title: 'Part 2 · Yes or no', lessons: [
    {
      id: 'probability-neuron', number: '2.1', title: 'A probability from a neuron',
      goal: 'Turn a neuron\'s sum into a probability with sigmoid, read the decision boundary as the line where the sum is 0, and say what the weights do to it.',
      builds: ['activations'],
      blocks: [
        { md: `Part 1 predicted a **number**. Many questions are **yes or no** instead: is this email spam, is this tumour harmful, is this point orange. The model should answer with a **probability**: "80% yes" is more useful than a bare "yes", and it can be wrong in an honest, measurable way.

A neuron's sum $z = w_1x_1 + w_2x_2 + b$ can be any number. Lesson 1.5's **sigmoid** squashes any number into 0 … 1:

$$p = \\sigma(z) = \\frac{1}{1 + e^{-z}}$$

Large positive $z$: $p$ near 1, "surely yes". Large negative: near 0, "surely no". $z = 0$: exactly $\\tfrac12$. So the **decision boundary**, where the model can't decide, is the set of points where $w_1x_1 + w_2x_2 + b = 0$: a straight line. Points on one side get more than 50%, on the other less, more confidently the further away.

This one-neuron model is called **logistic regression**. The data: 40 made-up points in two overlapping clouds, labelled 1 (orange) and 0 (teal).` },
        {
          symbols: [
            ['x_1, x_2', 'x one, x two', 'a point\'s two inputs: where it is on the plane', 'point[0], point[1]'],
            ['z', 'z', 'the neuron\'s sum, $w_1x_1 + w_2x_2 + b$, also called the **logit**', 'z'],
            ['\\sigma(z)', 'sigma of z', 'sigmoid: the sum squashed into a probability', 'sigmoid(z)'],
            ['p', 'p', 'the model\'s probability that the answer is 1', 'p'],
            ['y', 'y', 'the true answer: 1 or 0', 'label'],
          ],
        },
        {
          code: {
            file: 'points2d.py', fn: 'make_blobs', notes: [
              ['rng = random.Random(seed)', ['Repeatable random numbers.']],
              ['points, labels = [], []', ['The points (pairs of numbers) and their labels (0 or 1).']],
              ['for i in range(n):', ['40 points.']],
              ['label = i % 2', ['`%` is the remainder: 0, 1, 0, 1, … so half are each label.']],
              ['centre = 1.0 if label == 1 else -1.0', ['Orange points gather round (1, 1), teal round (−1, −1).']],
              ['points.append((centre + rng.uniform(-1.8, 1.8)', ['A point: the centre plus a random offset of up to 1.8 each way. The clouds overlap, so no line separates them perfectly.']],
              ['labels.append(label)', ['Its label.']],
              ['return points, labels', ['Both lists.']],
            ],
          },
        },
        {
          code: {
            file: 'logistic.py', from: 6, to: 14, notes: [
              ['return 1 / (1 + math.exp(-z))', ['Sigmoid.'], { tex: '\\sigma(z) = \\frac{1}{1 + e^{-z}}', calc: q => [`1 / (1 + e^${f(-q.z)})`, 1 / (1 + Math.exp(-q.z))] }],
              ['z = w[0] * point[0] + w[1] * point[1] + b', ['The neuron\'s sum, two inputs.'], { tex: 'z = w_1x_1 + w_2x_2 + b', calc: q => [`${s(q.w[0])} × ${s(q.point[0])} + ${s(q.w[1])} × ${s(q.point[1])} + ${s(q.b)}`, q.w[0] * q.point[0] + q.w[1] * q.point[1] + q.b] }],
              ['return sigmoid(z)', ['The probability that this point is a 1.']],
            ],
          },
        },
        { figure: 'SigmoidNeuronFig', caption: 'Drag the weights and bias. The black edge is the boundary $z = 0$; the shading is the probability. Click points to see their arithmetic.' },
        {
          predict: {
            prompt: 'With $w = (1, 1)$ and $b = 0$, what probability does the model give the point $(0.5, 0.5)$? (4 decimals)',
            answer: predictProb([1, 1], 0, [0.5, 0.5]), tolerance: 0.0001, compute: () => predictProb([1, 1], 0, [0.5, 0.5]),
            explain: '$z = 0.5 + 0.5 + 0 = 1$, so $p = 1/(1 + e^{-1}) = 0.7311$: 73% orange. The point is on the orange side of the line $x_1 + x_2 = 0$, but close to it.',
          },
        },
        {
          choice: {
            prompt: 'You double both weights and the bias: $w = (2, 2)$, $b = 0$ instead of $(1, 1)$, $0$. What changes?',
            options: [
              { text: 'The boundary stays where it is, but every probability gets more extreme: the model becomes more confident', why: 'Yes. $2x_1 + 2x_2 = 0$ is the same line as $x_1 + x_2 = 0$, but every $z$ is twice as big, so sigmoid pushes $p$ further from ½.' },
              { text: 'The boundary moves twice as far', why: 'The boundary is where $z = 0$, and multiplying $z$ by 2 doesn\'t change where it is 0.' },
              { text: 'Nothing at all', why: 'The line is unchanged, but the probabilities aren\'t: (0.5, 0.5) goes from 73% to 88%.' },
              { text: 'The boundary turns', why: 'Turning needs the weights to change in different proportions.' },
            ],
            answer: 0,
          },
        },
        { note: '**Logistic regression**: one neuron, $p = \\sigma(w_1x_1 + w_2x_2 + b)$, a probability of "yes". Its **decision boundary** $z = 0$ is a straight line; the size of the weights sets how confident it is.' },
      ],
    },

    {
      id: 'cross-entropy', number: '2.2', title: 'Cross-entropy: the loss for yes or no',
      goal: 'Score a probability with the cross-entropy, derive its gradient $(p - y)\\,x$, and train logistic regression by hand.',
      builds: ['probability-neuron', 'gradient-descent'],
      blocks: [
        { md: `To train, we need a loss. The squared error would work, a little, but there is a better one for probabilities. Ask: **what probability did the model give to what actually happened?** If the point is orange and the model said 90% orange, good; if it said 10%, bad. Take minus the logarithm of that probability:

$$L = -\\log p \\;\\;\\text{if } y = 1, \\qquad L = -\\log(1 - p) \\;\\;\\text{if } y = 0$$

or in one line, $L = -[\\,y\\log p + (1 - y)\\log(1 - p)\\,]$. This is the **binary cross-entropy**. A perfect answer ($p = 1$ for a real 1) costs $-\\log 1 = 0$. A confident wrong answer costs a lot: $-\\log 0.01 = 4.6$, and without limit as $p \\to 0$. Averaged over the points, it is the loss.` },
        { figure: 'BceFig', caption: 'The cross-entropy (red) against the squared error (dashed) as the probability given to the true answer changes.' },
        {
          code: {
            file: 'logistic.py', fn: 'bce', notes: [
              ['if label == 1:', ['Which probability did the true answer get?'], { logic: 'If the point really is a 1, score the probability the model gave to 1; otherwise score the probability it gave to 0, which is 1 − p.' }],
              ['return -math.log(p)', ['$-\\log p$: 0 when $p = 1$, large when $p$ is near 0. `math.log` is the natural logarithm.'], { tex: 'L = -\\log p', calc: q => [`−log(${f(q.p)})`, -Math.log(q.p)] }],
              ['return -math.log(1 - p)', ['$-\\log(1 - p)$ for a real 0.'], { tex: 'L = -\\log(1 - p)', calc: q => [`−log(1 − ${f(q.p)})`, -Math.log(1 - q.p)] }],
            ],
          },
        },
        {
          predict: {
            prompt: 'The point is orange ($y = 1$) and the model says $p = 0.1$. What is the cross-entropy? (3 decimals)',
            answer: bce(0.1, 1), tolerance: 0.0005, compute: () => bce(0.1, 1),
            explain: '$-\\log 0.1 = 2.303$. Had it said 0.9, the cost would be $-\\log 0.9 = 0.105$: twenty times less.',
            misconceptions: [{ answer: 0.105, tolerance: 0.001, feedback: 'That is the cost of $p = 0.9$. The model said 0.1 for a real orange: $-\\log 0.1$.' }],
          },
        },
        { h: 'A remarkably simple gradient' },
        { md: `Differentiate the cross-entropy through sigmoid, by the chain rule. Two facts: $\\sigma'(z) = \\sigma(z)(1 - \\sigma(z)) = p(1 - p)$, and $\\frac{d}{dp}(-\\log p) = -\\frac1p$. For $y = 1$:

$$\\frac{\\partial L}{\\partial z} = -\\frac{1}{p}\\cdot p(1 - p) = p - 1 = p - y$$

and the same works out for $y = 0$: $\\frac{1}{1-p}\\cdot p(1-p) = p = p - y$. Everything cancels to **$p - y$**: the predicted probability minus the truth. Then $z = w_1x_1 + w_2x_2 + b$ gives one more factor for each weight:

$$\\frac{\\partial L}{\\partial w_j} = (p - y)\\,x_j \\qquad \\frac{\\partial L}{\\partial b} = p - y$$

the same shape as Part 1's gradient for a line ($2(\\hat y - y)x$). This tidy cancellation is why sigmoid and cross-entropy are always used together.` },
        {
          code: {
            file: 'logistic.py', fn: 'train_logistic', notes: [
              ['points, labels = make_blobs(seed=seed)', ['The 40 points.']],
              ['w = [0.0, 0.0]', ['Two weights, starting at 0…']],
              ['b = 0.0', ['…and the bias: every point starts at $p = \\tfrac12$.']],
              ['n = len(points)', ['40.']],
              ['history = []', ['The loss at every step.']],
              ['for step in range(steps):', ['300 steps of gradient descent.']],
              ['grad_w = [0.0, 0.0]', ['The gradient, added up over the points.']],
              ['grad_b = 0.0', ['…']],
              ['loss = 0.0', ['…and the loss.']],
              ['for point, label in zip(points, labels):', ['Each point:']],
              ['p = predict_prob(w, b, point)', ['Its probability.'], { calc: q => [`sigmoid(${s(q.w[0])}×${s(q.point[0])} + ${s(q.w[1])}×${s(q.point[1])} + ${s(q.b)})`, predictProb(q.w, q.b, q.point)] }],
              ['loss += bce(p, label) / n', ['Its share of the average cross-entropy.']],
              ['grad_w[0] += (p - label) * point[0] / n', ['$(p - y)\\,x_1 / n$.'], { tex: '\\frac{\\partial L}{\\partial w_1} \\mathrel{+}= \\frac{(p - y)\\,x_1}{n}', calc: q => [`${f(q.grad_w[0])} + (${f(q.p)} − ${q.label}) × ${s(q.point[0])} / ${q.n}`, q.grad_w[0] + (q.p - q.label) * q.point[0] / q.n] }],
              ['grad_w[1] += (p - label) * point[1] / n', ['$(p - y)\\,x_2 / n$.'], { calc: q => [`${f(q.grad_w[1])} + (${f(q.p)} − ${q.label}) × ${s(q.point[1])} / ${q.n}`, q.grad_w[1] + (q.p - q.label) * q.point[1] / q.n] }],
              ['grad_b += (p - label) / n', ['$(p - y)/n$.'], { calc: q => [`${f(q.grad_b)} + (${f(q.p)} − ${q.label}) / ${q.n}`, q.grad_b + (q.p - q.label) / q.n] }],
              ['w[0] -= rate * grad_w[0]', ['Step every weight against its slope…'], { calc: q => [`${f(q.w[0])} − ${f(q.rate)} × ${s(q.grad_w[0])}`, q.w[0] - q.rate * q.grad_w[0]] }],
              ['w[1] -= rate * grad_w[1]', ['…']],
              ['b -= rate * grad_b', ['…and the bias.']],
              ['history.append(loss)', ['Keep the loss.']],
              ['return w, b, history', ['The trained neuron.']],
            ],
          },
        },
        {
          code: {
            file: 'logistic.py', fn: 'accuracy', notes: [
              ['correct = 0', ['A count.']],
              ['for point, label in zip(points, labels):', ['Each point:']],
              ['guess = 1 if predict_prob(w, b, point) >= 0.5 else 0', ['The model\'s answer: yes if it gives 50% or more.'], { logic: 'Answer 1 (orange) if the probability is at least one half, otherwise 0 (teal): that is, which side of the boundary the point is on.' }],
              ['if guess == label:', ['Right?']],
              ['correct += 1', ['Count it.']],
              ['return correct / len(points)', ['The fraction right.']],
            ],
          },
        },
        { figure: 'LogisticTrainer', caption: 'Logistic regression, one step at a time: the boundary swings into place and the loss falls. Then try learning rates up to 3: cross-entropy is gentle enough that large steps still work here.' },
        {
          predict: {
            prompt: 'After 300 steps at rate 0.5, what fraction of the 40 points does the model put on the right side?',
            answer: accuracy(lastLogistic().w, lastLogistic().b, BP, BL), tolerance: 1e-9, compute: () => accuracy(lastLogistic().w, lastLogistic().b, BP, BL),
            explain: '0.9: 36 of 40. The clouds overlap, so no straight line gets them all. The loss starts at $\\ln 2 = 0.693$ (every point at 50%) and ends near 0.18.',
          },
        },
        { note: '**Binary cross-entropy** $L = -[y\\log p + (1-y)\\log(1-p)]$ scores the probability given to what happened. With sigmoid, its gradient is simply $(p - y)$ times the input: train exactly as in Part 1.' },
      ],
    },

    {
      id: 'draw-your-own', number: '2.3', title: 'Draw your own data',
      goal: 'Make a data set by clicking, train on it, and find the shapes a single neuron can\'t separate.',
      builds: ['cross-entropy'],
      blocks: [
        { md: `Now you choose the data. Click to add points of either colour, and train. Start with one neuron (0 hidden neurons): whatever you draw, its boundary is a straight line. Then draw something no line can separate (the classic is **XOR**: orange in two opposite corners, teal in the other two) and add hidden neurons.

The figure trains with **Adam**, an improved gradient descent (Part 5 builds it by hand), so it settles in a second or two whatever you draw.` },
        { figure: 'DrawYourOwn', props: { initial: 'xor', initialHidden: 0 }, caption: 'Start: four corners, one neuron. Train it, then switch to 4 hidden neurons and train again. Then clear the points and draw your own.' },
        {
          choice: {
            prompt: 'One neuron trained on the four-corners (XOR) data gets about half the points right. Why?',
            options: [
              { text: 'Its boundary is a straight line, and no straight line puts both orange corners on one side and both teal corners on the other', why: 'Yes. A single neuron can only cut the plane in two with a line. XOR famously needs at least two lines combined, so a hidden layer.' },
              { text: 'It needs more training steps', why: 'No number of steps makes a straight line separate XOR.' },
              { text: 'The learning rate is wrong', why: 'The problem is what the model can represent, not how it is trained.' },
              { text: 'XOR data is random', why: 'It follows a simple rule: orange where $x_1$ and $x_2$ have the same sign.' },
            ],
            answer: 0,
          },
        },
        { note: 'A single neuron draws one straight boundary. Data that needs a bent or broken boundary (XOR, a ring, two moons) needs hidden neurons: each draws a line, and the output combines them.' },
      ],
    },

    {
      id: 'bending-boundary', number: '2.4', title: 'Bending the boundary: a hidden layer in PyTorch',
      goal: 'Train a hidden-layer classifier in PyTorch with `BCEWithLogitsLoss`, explain why the sigmoid goes in the loss, and read the same model in Keras.',
      builds: ['draw-your-own', 'pytorch-net'],
      blocks: [
        { md: `Two interleaved half-moons: a standard test that no straight line passes. Add a hidden layer of ReLU neurons (Part 1's hinges): in two dimensions each hidden neuron switches on along one line, and the output adds up those half-planes into a bent boundary.` },
        {
          code: {
            file: 'points2d.py', fn: 'make_moons', notes: [
              ['rng = random.Random(seed)', ['Repeatable.']],
              ['points, labels = [], []', ['The points and labels.']],
              ['for i in range(n):', ['100 points.']],
              ['label = i % 2', ['Alternating labels.']],
              ['angle = rng.uniform(0, math.pi)', ['A random angle along a half circle (0 to π radians, 180°).']],
              ['if label == 0:', ['Which moon?'], { logic: 'Teal points (label 0) go on the upper half circle; orange points on a lower half circle shifted right and down, so the two moons hook into each other.' }],
              ['x, y = math.cos(angle), math.sin(angle)', ['The upper moon: a point on the unit circle.']],
              ['x, y = 1 - math.cos(angle), 0.5 - math.sin(angle)', ['The lower moon: flipped and shifted.']],
              ['points.append((x + rng.uniform(-0.15, 0.15)', ['Plus a little noise.']],
              ['labels.append(label)', ['Its label.']],
              ['return points, labels', ['Both.']],
            ],
          },
        },
        { h: 'Logits, and why the sigmoid moves into the loss' },
        { md: `In PyTorch the network's last layer outputs the raw sum $z$, called the **logit**, with no sigmoid on it, and the loss is \`nn.BCEWithLogitsLoss\`: sigmoid and cross-entropy in one. Why not \`nn.Sigmoid()\` then a plain cross-entropy? Because computing $\\sigma(z)$ and then $\\log$ of it is fragile: for $z = 40$, $\\sigma(z)$ rounds to exactly 1.0, and $\\log(1 - 1.0)$ is $-\\infty$. Combined, the loss can be rewritten without ever forming $p$:

$$-[\\,y\\log\\sigma(z) + (1-y)\\log(1-\\sigma(z))\\,] = \\max(z, 0) - z\\,y + \\log(1 + e^{-|z|})$$

which is safe for any $z$. Same numbers, no overflow. To get probabilities afterwards, apply \`torch.sigmoid\` yourself.` },
        {
          code: {
            file: 'torch_classify.py', fn: 'check_loss', notes: [
              ['logits = torch.tensor([[2.0], [-1.0], [0.5], [-3.0]])', ['Four made-up raw outputs, one per point (a column: 4 rows of 1).']],
              ['labels = torch.tensor([[1.0], [1.0], [0.0], [0.0]])', ['Their true answers, as floats: the loss expects floats.']],
              ['with_torch = nn.BCEWithLogitsLoss()(logits, labels).item()', ['Make the loss object and call it at once: the average cross-entropy, computed from the logits.']],
              ['by_hand = 0.0', ['The same, by hand:']],
              ['for z, label in zip(logits.squeeze(1).tolist(), labels.squeeze(1).tolist()):', ['`.squeeze(1)` drops the column dimension, `.tolist()` gives plain Python numbers.']],
              ['by_hand += bce(sigmoid(z), label) / 4', ['Lesson 2.2\'s functions.']],
              ['print("PyTorch:", with_torch, "by hand:", by_hand)', ['Measured: 0.6157135 both (PyTorch in 32-bit floats differs in the 8th digit).']],
              ['return with_torch, by_hand', ['Both.']],
            ],
          },
        },
        {
          code: {
            file: 'torch_classify.py', fn: 'train_moons', notes: [
              ['torch.manual_seed(seed)', ['Repeatable starting weights.']],
              ['points, labels = make_moons(seed=seed)', ['The moons.']],
              ['x = torch.tensor(points)', ['100 × 2: one row per point.']],
              ['y = torch.tensor(labels, dtype=torch.float32).unsqueeze(1)', ['100 × 1 floats.']],
              ['if hidden:', ['A hidden layer, or not?'], { logic: 'If a number of hidden neurons is given, build 2 → hidden → 1 with ReLU; with hidden = 0, a single neuron (logistic regression).' }],
              ['model = nn.Sequential(nn.Linear(2, hidden), nn.ReLU(), nn.Linear(hidden, 1))', ['2 inputs → hidden ReLU neurons → 1 logit.']],
              ['model = nn.Linear(2, 1)', ['One neuron.']],
              ['loss_fn = nn.BCEWithLogitsLoss()', ['Sigmoid plus cross-entropy, on the logits.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=rate)', ['Plain gradient descent.']],
              ['history = []', ['The loss.']],
              ['for step in range(steps):', ['3,000 steps.']],
              ['logits = model(x)', ['100 raw outputs.']],
              ['loss = loss_fn(logits, y)', ['Their average cross-entropy.']],
              ['optimizer.zero_grad()', ['Clear.']],
              ['loss.backward()', ['Backpropagate: every slope ends up as $(p - y)$ times the chain back through ReLU.']],
              ['optimizer.step()', ['Step.']],
              ['history.append(loss.item())', ['Keep it.']],
              ['with torch.no_grad():', ['Judging.']],
              ['accuracy = ((model(x) > 0).float() == y).float().mean().item()', ['A logit above 0 means $p > \\tfrac12$: compare those guesses with the labels, as 1.0 or 0.0, and average.'], { logic: 'Guess orange wherever the raw output is positive (probability above one half); count the fraction of guesses equal to the true label.' }],
              ['print("hidden", hidden', ['Measured: 1 neuron 87%, 4 hidden 94%, 16 hidden 100%.']],
              ['return model, history, accuracy', ['All three.']],
            ],
          },
        },
        { figure: 'DrawYourOwn', props: { initial: 'moons', initialHidden: 16 }, caption: 'The moons, with 16 hidden neurons. Tick "show each hidden neuron\'s line" to see the lines the output combines; try 2, 3 and 4 hidden neurons.' },
        { md: `The same classifier in Keras puts the sigmoid in the last layer and names the loss:

\`\`\`python
model = keras.Sequential([
    layers.Dense(16, activation="relu", input_shape=(2,)),
    layers.Dense(1, activation="sigmoid"),           # outputs a probability
])
model.compile(optimizer="sgd", loss="binary_crossentropy", metrics=["accuracy"])
model.fit(x, y, epochs=3000, batch_size=100)
\`\`\`

Keras detects the sigmoid-then-cross-entropy pair and computes it the safe way internally; PyTorch makes you choose \`BCEWithLogitsLoss\` explicitly. Same maths.` },
        { python: { program: 'moons', label: 'Train the moons classifier in real Python' } },
        { note: 'A hidden layer bends the boundary: each ReLU neuron contributes a line, the output combines them. In PyTorch the last layer outputs a **logit** and `BCEWithLogitsLoss` applies sigmoid and cross-entropy together, safely; `torch.sigmoid(logit)` gives the probability.' },
      ],
    },

    {
      id: 'tumours', number: '2.5', title: 'Real data: is a tumour harmful?',
      goal: 'Load a real medical data set with 30 measurements, scale every column, train and test a classifier, and use it on a described case.',
      builds: ['bending-boundary', 'fuel-economy'],
      blocks: [
        { md: `The **Breast Cancer Wisconsin (Diagnostic)** data set (UCI Machine Learning Repository; Wolberg, Street and Mangasarian, 1995; CC BY 4.0): 569 tumours, each examined under a microscope, with 30 measurements of the cell nuclei in the image (their radius, texture, perimeter, area, smoothness and so on: the average, the spread and the worst value of each), and a diagnosis confirmed afterwards: **malignant** (harmful) or **benign**. 212 malignant, 357 benign.

It is a teaching data set, not a medical tool: real diagnosis uses far more than this, and a model is only as trustworthy as the data and the testing behind it. Exactly what the next lesson is about.` },
        {
          code: {
            file: 'tumours.py', fn: 'load_tumours', notes: [
              ['rows, labels = [], []', ['Measurements and labels.']],
              ['with open(os.path.join(HERE, "tumours.csv"), encoding="utf-8") as handle:', ['The data file beside this program.']],
              ['reader = csv.DictReader(handle)', ['Rows as dictionaries keyed by column name.']],
              ['names = columns or reader.fieldnames[1:]', ['`a or b` is `a` unless `a` is empty or None: the columns asked for, or all of them. `fieldnames[1:]` skips the first column, the diagnosis.']],
              ['for row in reader:', ['Each tumour.']],
              ['rows.append([float(row[name]) for name in names])', ['Its measurements, as numbers, in the chosen order.']],
              ['labels.append(1 if row["diagnosis"] == "M" else 0)', ['M (malignant) is 1, B (benign) is 0: the thing we want to detect is the 1.']],
              ['return rows, labels, names', ['Rows, labels and which columns they are.']],
            ],
          },
        },
        {
          code: {
            file: 'tumours.py', from: 27, to: 46, notes: [
              ['order = list(range(len(rows)))', ['The positions 0 … 568, to be shuffled (shuffling positions keeps each row with its label).']],
              ['random.Random(seed).shuffle(order)', ['Shuffle, repeatably.']],
              ['n_test = int(len(order) * test_fraction)', ['113 tumours for testing.']],
              ['test, train = order[:n_test], order[n_test:]', ['The first 113 positions for testing, the rest for training.']],
              ['return ([rows[i] for i in train], [labels[i] for i in train]), ([rows[i] for i in test]', ['Two pairs: training rows and labels, test rows and labels.']],
              ['stats = []', ['One (average, spread) per column.']],
              ['for column in zip(*rows):', ['`zip(*rows)` turns rows into columns (this is called transposing): each trip, one measurement across every tumour.']],
              ['mean = sum(column) / len(column)', ['Its average…'], { tex: '\\mu_j = \\frac1n\\sum_i x_{ij}' }],
              ['spread = (sum((v - mean) ** 2 for v in column) / len(column)) ** 0.5', ['…and spread.'], { tex: '\\sigma_j = \\sqrt{\\tfrac1n\\textstyle\\sum_i (x_{ij} - \\mu_j)^2}' }],
              ['stats.append((mean, spread))', ['Keep both.']],
              ['return stats', ['30 pairs.']],
              ['return torch.tensor([[(v - mean) / spread for v, (mean, spread) in zip(row, stats)] for row in rows])', ['Every measurement scaled by its own column\'s statistics. Essential here: areas run into the thousands while smoothness is about 0.1.'], { tex: "x'_{ij} = (x_{ij} - \\mu_j)/\\sigma_j" }],
            ],
          },
        },
        {
          code: {
            file: 'tumours.py', fn: 'train_tumours', notes: [
              ['torch.manual_seed(seed)', ['Repeatable.']],
              ['rows, labels, names = load_tumours(columns)', ['All 30 measurements, or the ones named.']],
              ['(train_x, train_y), (test_x, test_y) = split(rows, labels, seed=seed)', ['456 to learn from, 113 to test.']],
              ['stats = column_stats(train_x)', ['Statistics from the training tumours only.']],
              ['x = scale(train_x, stats)', ['Scaled inputs.']],
              ['y = torch.tensor(train_y, dtype=torch.float32).unsqueeze(1)', ['Labels as a column of floats.']],
              ['if hidden:', ['A hidden layer or one neuron.'], { logic: 'With hidden neurons asked for, a two-layer network; otherwise logistic regression on all the measurements.' }],
              ['model = nn.Sequential(nn.Linear(len(names), hidden), nn.ReLU(), nn.Linear(hidden, 1))', ['30 → hidden → 1.']],
              ['model = nn.Linear(len(names), 1)', ['30 → 1: one neuron with 30 weights.']],
              ['loss_fn = nn.BCEWithLogitsLoss()', ['Cross-entropy on logits.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=rate)', ['Gradient descent.']],
              ['for step in range(steps):', ['1,000 steps.']],
              ['loss = loss_fn(model(x), y)', ['Forward and loss.']],
              ['optimizer.zero_grad()', ['Clear.']],
              ['loss.backward()', ['Backpropagate.']],
              ['optimizer.step()', ['Step.']],
              ['with torch.no_grad():', ['Testing.']],
              ['probs = torch.sigmoid(model(scale(test_x, stats))).squeeze(1).tolist()', ['The test tumours\' logits, through sigmoid: a probability of malignant for each, as a plain list.']],
              ['counts = confusion(probs, test_y)', ['The four counts of the next lesson.']],
              ['accuracy, precision, recall = scores(*counts)', ['`*counts` passes the four counts as four arguments.']],
              ['print("test tumours:"', ['Measured, one neuron on all 30: 46 malignant caught, 5 missed, 1 false alarm, 61 benign right: 94.7%.']],
              ['return model, stats, probs, test_y, counts', ['Everything, for judging.']],
            ],
          },
        },
        { figure: 'TumourScatter', caption: 'Two of the 30 measurements, scaled, and the straight boundary one neuron learns between them. Then describe a tumour and ask.' },
        {
          predict: {
            prompt: 'Trained on all 30 measurements (one neuron, 1,000 steps), how many of the 51 malignant test tumours does the model miss at the usual 50% threshold?',
            answer: tumourCounts(0.5)[3], compute: () => tumourCounts(0.5)[3],
            explain: '5 of 51 malignant tumours are called benign, and 1 of 62 benign ones is called malignant: 94.7% right overall. With only two measurements (the figure) it misses 11. More of the right information helps more than a bigger model: a hidden layer of 16 on all 30 misses 4.',
          },
        },
        { python: { program: 'tumours', label: 'Train the tumour classifier in real Python' } },
        { note: 'Real yes/no data: name the thing to detect 1, scale **every** column with training statistics, keep a test set, train with cross-entropy, and report on the test set. Two measurements: 89% right; all 30: 95%.' },
      ],
    },

    {
      id: 'judging-yes-no', number: '2.6', title: 'Right and wrong, four ways',
      goal: 'Count true and false positives and negatives, compute accuracy, precision and recall, and choose a threshold for what a mistake costs.',
      builds: ['tumours'],
      blocks: [
        { md: `"94.7% right" hides what matters. For a tumour test, there are **two different mistakes**:

- a **false negative**: a malignant tumour called benign. Someone is told they are fine. Very costly.
- a **false positive**: a benign tumour called malignant. A scare and a further test. Costly, but much less.

So count the four kinds of answer separately, a **confusion matrix**, and summarise with two numbers:

$$\\text{precision} = \\frac{TP}{TP + FP} \\qquad \\text{recall} = \\frac{TP}{TP + FN}$$

**Precision**: of the tumours called malignant, how many were. **Recall**: of the malignant tumours, how many were caught. And the model doesn't have to say "malignant" at 50%: the **threshold** is our choice. Lowering it catches more cancers (higher recall) at the cost of more false alarms (lower precision).` },
        {
          symbols: [
            ['TP', 'true positive', 'called malignant, and it is', 'tp'],
            ['FP', 'false positive', 'called malignant, but benign', 'fp'],
            ['TN', 'true negative', 'called benign, and it is', 'tn'],
            ['FN', 'false negative', 'called benign, but malignant: the costly miss', 'fn'],
          ],
        },
        {
          code: {
            file: 'metrics.py', fn: 'confusion', notes: [
              ['tp = fp = tn = fn = 0', ['Four counters, all 0 (assigning one value to several names at once).']],
              ['for p, label in zip(probs, labels):', ['Each case: the model\'s probability and the truth.']],
              ['guess = 1 if p >= threshold else 0', ['The model\'s answer at this threshold.'], { logic: 'Call it a 1 (malignant) if the probability reaches the threshold, otherwise 0.' }],
              ['if guess == 1 and label == 1:', ['Said yes, and it is.'], { logic: 'Both the guess and the truth are 1: a true positive.' }],
              ['tp += 1', ['True positive.']],
              ['elif guess == 1 and label == 0:', ['Said yes, but it isn\'t.']],
              ['fp += 1', ['False positive.']],
              ['elif guess == 0 and label == 0:', ['Said no, and it isn\'t.']],
              ['tn += 1', ['True negative.']],
              ['fn += 1', ['Otherwise: said no, but it is. False negative.']],
              ['return tp, fp, tn, fn', ['The four counts.']],
            ],
          },
        },
        {
          code: {
            file: 'metrics.py', fn: 'scores', notes: [
              ['accuracy = (tp + tn) / (tp + fp + tn + fn)', ['The fraction right, either way.'], { tex: '\\frac{TP + TN}{TP + FP + TN + FN}', calc: q => [`(${q.tp} + ${q.tn}) / ${q.tp + q.fp + q.tn + q.fn}`, (q.tp + q.tn) / (q.tp + q.fp + q.tn + q.fn)] }],
              ['precision = tp / (tp + fp) if tp + fp else 0.0', ['Of the "yes" answers, the fraction right. (If there were none, 0 rather than dividing by zero.)'], { tex: '\\frac{TP}{TP + FP}', calc: q => [`${q.tp} / (${q.tp} + ${q.fp})`, q.tp + q.fp ? q.tp / (q.tp + q.fp) : 0] }],
              ['recall = tp / (tp + fn) if tp + fn else 0.0', ['Of the real yeses, the fraction found.'], { tex: '\\frac{TP}{TP + FN}', calc: q => [`${q.tp} / (${q.tp} + ${q.fn})`, q.tp + q.fn ? q.tp / (q.tp + q.fn) : 0] }],
              ['return accuracy, precision, recall', ['All three.']],
            ],
          },
        },
        { figure: 'ThresholdFig', caption: 'Every test tumour placed by the model\'s probability. Slide the threshold and watch the four counts.' },
        {
          predict: {
            prompt: 'Lower the threshold from 0.5 to 0.2. How many malignant test tumours are missed now?',
            answer: tumourCounts(0.2)[3], compute: () => tumourCounts(0.2)[3],
            explain: 'Down from 5 to 3, while false alarms go up from 1 to 4. Accuracy barely moves (94.7% to 93.8%), but recall rises from 0.90 to 0.94. For a cancer screen that is the better trade; for a spam filter (where a false positive loses a real email) you might go the other way.',
          },
        },
        {
          choice: {
            prompt: 'A test for a rare disease (1 person in 100 has it) says "healthy" to everyone. What are its accuracy and recall?',
            options: [
              { text: 'Accuracy 99%, recall 0%', why: 'Yes. It is right about the 99 healthy people and finds none of the sick ones. Accuracy alone would call it excellent.' },
              { text: 'Accuracy 1%, recall 100%', why: 'That is the test that says "sick" to everyone.' },
              { text: 'Accuracy 99%, recall 99%', why: 'Recall counts how many sick people were found: none.' },
              { text: 'Both 50%', why: 'With so few positives, the counts are lopsided, not balanced.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'tumours', label: 'Step through the counting in real Python' } },
        { note: 'Count four ways (**TP, FP, TN, FN**). **Precision** = TP / (TP + FP), **recall** = TP / (TP + FN). Accuracy hides which mistakes are made, and misleads when one answer is rare. Choose the **threshold** by what each mistake costs.' },
      ],
    },
  ],
}
