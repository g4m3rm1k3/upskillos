// Part 3: one of several. Softmax, cross-entropy for many classes and its gradient, softmax
// regression by hand on the iris flowers, the same in PyTorch with CrossEntropyLoss, 8 × 8
// handwritten digits, and your own digit drawn on a pad.
import { softmax, crossEntropy, trainSoftmax, loadIris, predictSpecies, digitData } from '../engine/part3.js'
import { makeMLP, makeOptimizer, trainSteps, predictOne } from '../engine/mlp.js'
import { f, s, v } from './util.js'

const irisResult = () => { let last; for (const step of trainSoftmax()) last = step; const [r, l] = loadIris(); return r.filter((x, i) => predictSpecies(last.weights, last.biases, x)[0] === l[i]).length / r.length }
const digitsRight = hidden => {
  const d = digitData(0), net = makeMLP(64, hidden ? [{ units: hidden, activation: 'relu' }, { units: 10 }] : [{ units: 10 }], 0), opt = makeOptimizer(net, { kind: 'adam', rate: 0.01 })
  trainSteps(net, opt, d.X, d.Y, 150, 'ce')
  return d.Xtest.filter((x, i) => { const o = predictOne(net, x); return o.indexOf(Math.max(...o)) === d.testLabels[i] }).length
}

export const PART3 = {
  id: 'part3', title: 'Part 3 · One of several', lessons: [
    {
      id: 'softmax', number: '3.1', title: 'Softmax: scores into probabilities',
      goal: 'Turn one score per class into probabilities that add up to 1, by hand and with `softmax`, and say what adding to or scaling the scores does.',
      builds: ['probability-neuron'],
      blocks: [
        { md: `Part 2 answered yes or no with one neuron and sigmoid. Now the answer is **one of several**: which of three iris species, which of ten digits. The network gives one **score** per class (a layer with one neuron per class), and the scores must become probabilities: all positive, adding up to 1, the highest score getting the highest probability.

**Softmax** does it: raise $e$ to each score (always positive), then divide each by the total (so they add to 1):

$$p_c = \\frac{e^{z_c}}{\\sum_{k} e^{z_k}}$$

With two classes, softmax is exactly sigmoid of the difference of the two scores; it is sigmoid generalised to many classes.` },
        {
          symbols: [
            ['z_c', 'z c', 'the score (logit) of class $c$: neuron $c$\'s sum', 'scores[c]'],
            ['e^{z_c}', 'e to the z c', 'always positive; bigger scores get much bigger', 'math.exp(s)'],
            ['\\sum_k e^{z_k}', 'the sum over k of e to the z k', 'the total, for dividing', 'total'],
            ['p_c', 'p c', 'the probability of class $c$', 'probs[c]'],
          ],
        },
        {
          code: {
            file: 'softmax.py', fn: 'softmax', notes: [
              ['top = max(scores)', ['The largest score. Subtracting it from every score first changes nothing (next bullet) but keeps $e^z$ from overflowing: $e^{1000}$ is too big for a float, $e^{0}$ isn\'t.'], { calc: q => [`max(${v(q.scores)})`, Math.max(...q.scores)] }],
              ['powers = [math.exp(s - top) for s in scores]', ['$e^{z_c - \\max z}$ for each class. Dividing top and bottom of the softmax by $e^{\\max z}$ cancels, so the probabilities are the same.'], { tex: 'e^{z_c - \\max_k z_k}', calc: q => [`[${q.scores.map(z => `e^(${f(z)} − ${f(q.top)})`).join(', ')}]`, q.scores.map(z => Math.exp(z - q.top))] }],
              ['total = sum(powers)', ['The total.'], { calc: q => [q.powers.map(f).join(' + '), q.powers.reduce((a, b) => a + b, 0)] }],
              ['return [p / total for p in powers]', ['Each divided by the total: they add up to 1.'], { tex: 'p_c = \\frac{e^{z_c}}{\\sum_k e^{z_k}}', calc: q => [`[${q.powers.map(p => `${f(p)} / ${f(q.total)}`).join(', ')}]`, q.powers.map(p => p / q.total)] }],
            ],
          },
        },
        { figure: 'Softmax3Fig', caption: 'Three scores, three probabilities. Try the two buttons.' },
        {
          predict: {
            prompt: 'Scores $[2, 1, 0.1]$. What is the first probability? (4 decimals)',
            answer: softmax([2, 1, 0.1])[0], tolerance: 0.0001, compute: () => softmax([2, 1, 0.1])[0],
            explain: '$e^2 = 7.389$, $e^1 = 2.718$, $e^{0.1} = 1.105$; total 11.212; $7.389 / 11.212 = 0.659$. The others are 0.242 and 0.099.',
          },
        },
        {
          choice: {
            prompt: 'Every score goes up by 5. What happens to the probabilities?',
            options: [
              { text: 'Nothing: each $e^{z+5} = e^5 e^z$, and the $e^5$ cancels between top and bottom', why: 'Yes. Only differences between scores matter, which is exactly why subtracting the largest is allowed.' },
              { text: 'They all go up', why: 'They can\'t all go up: they always add up to 1.' },
              { text: 'The biggest one goes up', why: 'That happens when the scores are multiplied (spread apart), not when a constant is added.' },
              { text: 'They become equal', why: 'Equal probabilities need equal scores.' },
            ],
            answer: 0,
          },
        },
        { note: '**Softmax** $p_c = e^{z_c}/\\sum_k e^{z_k}$ turns one score per class into probabilities that add up to 1. Only the differences between scores matter; subtracting the largest keeps it from overflowing.' },
      ],
    },

    {
      id: 'multi-cross-entropy', number: '3.2', title: 'Cross-entropy for many classes',
      goal: 'Score a softmax output with the cross-entropy, derive its gradient $p - \\text{one-hot}$, and train softmax regression by hand on real flowers.',
      builds: ['softmax', 'cross-entropy'],
      blocks: [
        { md: `The loss is Part 2's idea again: minus the log of the probability given to the **true** class,

$$L = -\\log p_y$$

Only the true class's probability appears, but the others are in it too: they share the total of 1, so taking probability away from wrong classes raises $p_y$.

**The gradient** is as neat as in Part 2. Write the target as a **one-hot** list: 1 in the true class's place, 0 elsewhere ($[0, 1, 0]$ for class 1). Then for every score:

$$\\frac{\\partial L}{\\partial z_c} = p_c - \\text{target}_c$$

(The derivation: $L = -z_y + \\log\\sum_k e^{z_k}$; the slope of the log-sum in $z_c$ is $e^{z_c}/\\sum_k e^{z_k} = p_c$, and $-z_y$ adds $-1$ only for $c = y$.) The true class's score is pushed up by $1 - p_y$; every other score is pushed down by the probability it wrongly holds.` },
        {
          code: {
            file: 'softmax.py', from: 11, to: 21, notes: [
              ['return -math.log(probs[label])', ['Minus the log of the true class\'s probability.'], { tex: 'L = -\\log p_y', calc: q => [`−log(${f(q.probs[q.label])})`, -Math.log(q.probs[q.label])] }],
              ['row = [0.0] * n_classes', ['A list of zeros, one per class…']],
              ['row[label] = 1.0', ['…with a 1 in the true class\'s place.']],
              ['return row', ['The one-hot target: class 1 of 3 is `[0.0, 1.0, 0.0]`.']],
            ],
          },
        },
        { figure: 'CeGradientFig', caption: 'One flower, three scores: the loss and the slope for each score.' },
        { h: 'Softmax regression on real flowers' },
        { md: `**Fisher's iris data** (1936; UCI Machine Learning Repository, CC BY 4.0): 150 iris flowers of three species, 50 each, with the length and width of their petals and sepals in centimetres. Start with just the two petal measurements, so the whole thing can be drawn: one layer of three neurons, one per species, each with 2 weights and a bias. That model is **softmax regression**.` },
        {
          code: {
            file: 'iris.py', from: 10, to: 57, notes: [
              ['rows, labels = [], []', ['Measurements and species numbers.']],
              ['with open(os.path.join(HERE, "iris.csv"), encoding="utf-8") as handle:', ['The data file beside the program.']],
              ['for row in csv.DictReader(handle):', ['Each flower.']],
              ['rows.append([float(row[name]) for name in columns])', ['The chosen measurements, as numbers.']],
              ['labels.append(SPECIES.index(row["species"]))', ['The species as a number: `.index` finds its position in `SPECIES`, so setosa is 0, versicolor 1, virginica 2.']],
              ['return rows, labels', ['Both.']],
              ['return [sum(w * v for w, v in zip(row, x)) + b for row, b in zip(weights, biases)]', ['A layer with one neuron per species: each species\' weights times the measurements, plus its bias.'], { tex: 'z_c = \\mathbf w_c \\cdot \\mathbf x + b_c', calc: q => [`one score per species for ${v(q.x)}`, q.weights.map((row, c) => row.reduce((a, w, j) => a + w * q.x[j], 0) + q.biases[c])] }],
              ['rows, labels = load_iris()', ['150 flowers, petal length and width.']],
              ['n, k, m = len(rows), len(SPECIES), len(rows[0])', ['150 flowers, 3 species, 2 measurements.']],
              ['weights = [[0.0] * m for c in range(k)]', ['3 rows of 2 weights, all 0. (`[[0.0] * m] * k` would make 3 names for **one** list, a classic Python trap; the comprehension makes 3 separate lists.)']],
              ['biases = [0.0] * k', ['3 biases.']],
              ['history = []', ['The loss.']],
              ['for step in range(steps):', ['500 steps.']],
              ['grad_w = [[0.0] * m for c in range(k)]', ['The gradient, built up over the flowers.']],
              ['grad_b = [0.0] * k', ['…']],
              ['loss = 0.0', ['…']],
              ['for x, label in zip(rows, labels):', ['Each flower:']],
              ['probs = softmax(scores_for(weights, biases, x))', ['Three probabilities.'], { calc: q => [`softmax(scores of ${v(q.x)})`, softmax(q.weights.map((row, c) => row.reduce((a, w, j) => a + w * q.x[j], 0) + q.biases[c]))] }],
              ['loss += cross_entropy(probs, label) / n', ['Its share of the average loss.']],
              ['target = one_hot(label, k)', ['Its one-hot target.']],
              ['for c in range(k):', ['For each species\' neuron:']],
              ['slope = probs[c] - target[c]', ['$\\partial L/\\partial z_c = p_c - \\text{target}_c$.'], { tex: '\\frac{\\partial L}{\\partial z_c} = p_c - t_c', calc: q => [`${f(q.probs[q.c])} − ${q.target[q.c]}`, q.probs[q.c] - q.target[q.c]] }],
              ['grad_b[c] += slope / n', ['The bias\'s slope is the score\'s.']],
              ['for j in range(m):', ['Each weight of that neuron:']],
              ['grad_w[c][j] += slope * x[j] / n', ['…times its input, as always.'], { tex: '\\frac{\\partial L}{\\partial w_{c,j}} \\mathrel{+}= \\frac{(p_c - t_c)\\,x_j}{n}', calc: q => [`${f(q.grad_w[q.c][q.j])} + ${s(q.slope)} × ${f(q.x[q.j])} / ${q.n}`, q.grad_w[q.c][q.j] + q.slope * q.x[q.j] / q.n] }],
              ['for c in range(k):', ['Then one step for every number:']],
              ['biases[c] -= rate * grad_b[c]', ['…each bias…']],
              ['for j in range(m):', ['…']],
              ['weights[c][j] -= rate * grad_w[c][j]', ['…each weight.']],
              ['history.append(loss)', ['Keep the loss.']],
              ['return weights, biases, history', ['The trained layer.']],
              ['probs = softmax(scores_for(weights, biases, x))', ['For a flower you describe: the three probabilities…']],
              ['best = probs.index(max(probs))', ['…and the position of the largest, the **argmax**.']],
              ['return SPECIES[best], probs', ['The species\' name, and all three.']],
            ],
          },
        },
        { figure: 'IrisFig', caption: 'The 150 flowers by petal size. Train, and watch three regions form, one per species. Click to describe a flower of your own.' },
        {
          predict: {
            prompt: 'After 500 steps (rate 0.1), what fraction of the 150 flowers does it classify correctly? (3 decimals)',
            answer: irisResult(), tolerance: 0.0005, compute: irisResult,
            explain: '0.933: 140 of 150. Setosa is easy (small petals, far from the rest); the mistakes are all versicolor against virginica, which overlap. The loss falls from $\\ln 3 = 1.099$ (every species ⅓) to 0.389; more steps keep improving it.',
          },
        },
        { python: { program: 'iris_hand', label: 'Step through softmax regression in real Python' } },
        { note: 'Multi-class cross-entropy $L = -\\log p_y$, and its gradient for each score is $p_c - t_c$ with a **one-hot** target $t$. Softmax regression is one layer, one neuron per class, trained exactly like everything before.' },
      ],
    },

    {
      id: 'iris-pytorch', number: '3.3', title: 'Many classes in PyTorch (and Keras)',
      goal: 'Train a hidden-layer classifier with `nn.CrossEntropyLoss`, check it against the hand-written loss, read a confusion matrix, and write the same model in Keras.',
      builds: ['multi-cross-entropy', 'bending-boundary'],
      blocks: [
        { md: `PyTorch's \`nn.CrossEntropyLoss\` is softmax and cross-entropy in one, like \`BCEWithLogitsLoss\` for yes/no, and for the same reason (it never forms the probabilities, so it can't overflow). Two things differ from what you might expect:

- the model's last layer outputs raw **scores** (logits), no softmax;
- the targets are **class numbers** (\`tensor([0, 2, 1, …])\`), not one-hot lists: PyTorch picks out the true class's score itself.` },
        {
          code: {
            file: 'torch_iris.py', fn: 'check_cross_entropy', notes: [
              ['logits = torch.tensor([[2.0, 0.5, -1.0], [0.1, 0.2, 3.0]])', ['Two made-up rows of three scores.']],
              ['labels = torch.tensor([0, 1])', ['Their true classes, as numbers.']],
              ['with_torch = nn.CrossEntropyLoss()(logits, labels).item()', ['The average loss over the two rows.']],
              ['by_hand = 0.0', ['The same with lessons 3.1–3.2\'s functions:']],
              ['for scores, label in zip(logits.tolist(), labels.tolist()):', ['Each row and its class, as plain Python values.']],
              ['by_hand += cross_entropy(softmax(scores), label) / 2', ['Softmax, then −log of the true class.']],
              ['print("PyTorch:", with_torch, "by hand:", by_hand)', ['Measured: 1.5754564 both.']],
              ['return with_torch, by_hand', ['Both.']],
            ],
          },
        },
        {
          code: {
            file: 'torch_iris.py', fn: 'confusion_matrix', notes: [
              ['table = [[0] * n_classes for c in range(n_classes)]', ['A square table of zeros: one row per true class, one column per guess.']],
              ['for guess, label in zip(guesses, labels):', ['Each answer:']],
              ['table[label][guess] += 1', ['Count it in its row (truth) and column (guess). Right answers land on the diagonal.']],
              ['return table', ['The confusion matrix: Part 2\'s four counts, for any number of classes.']],
            ],
          },
        },
        {
          code: {
            file: 'torch_iris.py', fn: 'train_iris', notes: [
              ['torch.manual_seed(seed)', ['Repeatable.']],
              ['rows, labels = load_iris(("sepal_length", "sepal_width", "petal_length", "petal_width"))', ['All four measurements this time.']],
              ['x = torch.tensor(rows)', ['150 × 4.']],
              ['x = (x - x.mean(dim=0)) / x.std(dim=0)', ['Scaling, done with tensor operations: `mean(dim=0)` averages down each column (dimension 0 is the rows), giving 4 averages; subtracting a row of 4 from a 150 × 4 tensor subtracts it from every row (**broadcasting**). (Here all 150 flowers are used for training, so there is no test set to keep the statistics from.)'], { tex: "x' = (x - \\mu)/\\sigma" }],
              ['y = torch.tensor(labels)', ['150 class numbers.']],
              ['model = nn.Sequential(nn.Linear(4, hidden), nn.ReLU(), nn.Linear(hidden, len(SPECIES)))', ['4 → 8 → 3: three scores out.']],
              ['loss_fn = nn.CrossEntropyLoss()', ['Softmax plus cross-entropy, on the scores.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=rate)', ['Gradient descent.']],
              ['for step in range(steps):', ['1,000 steps.']],
              ['loss = loss_fn(model(x), y)', ['150 rows of scores against 150 class numbers.']],
              ['optimizer.zero_grad()', ['Clear.']],
              ['loss.backward()', ['Every slope: $p - \\text{one-hot}$ at the output, then back through ReLU.']],
              ['optimizer.step()', ['Step.']],
              ['with torch.no_grad():', ['Judging.']],
              ['guesses = model(x).argmax(dim=1).tolist()', ['`argmax(dim=1)`: in each row, the position of the largest score. The softmax isn\'t needed for that: the largest score has the largest probability.']],
              ['table = confusion_matrix(guesses, labels, len(SPECIES))', ['Count right and wrong, by species.']],
              ['print("loss", round(loss.item(), 4)', ['Measured: [[50, 0, 0], [0, 48, 2], [0, 1, 49]]: 147 of 150, the three mistakes between versicolor and virginica.']],
              ['return model, table', ['Model and table.']],
            ],
          },
        },
        { md: `In Keras, the softmax goes into the last layer, and the loss for class numbers is called **sparse** categorical cross-entropy (plain "categorical" expects one-hot lists):

\`\`\`python
model = keras.Sequential([
    layers.Dense(8, activation="relu", input_shape=(4,)),
    layers.Dense(3, activation="softmax"),          # probabilities out
])
model.compile(optimizer="sgd", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
model.fit(x, y, epochs=1000, batch_size=150)
\`\`\`

The Model Studio writes both versions for any network you build.` },
        {
          choice: {
            prompt: 'In PyTorch, why doesn\'t the classifier end in `nn.Softmax()`?',
            options: [
              { text: '`CrossEntropyLoss` applies softmax itself, from the raw scores, in a way that can\'t overflow; a softmax in the model would be applied twice', why: 'Yes. Add `torch.softmax(model(x), dim=1)` only when you want the probabilities themselves, after training.' },
              { text: 'Softmax isn\'t needed for classification', why: 'It is, for the loss: `CrossEntropyLoss` contains it.' },
              { text: 'PyTorch has no softmax', why: 'It has `nn.Softmax` and `torch.softmax`; you just don\'t put one before `CrossEntropyLoss`.' },
              { text: 'Because the classes are numbered', why: 'Numbered targets are about the loss\'s second argument, not about softmax.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'iris', label: 'Train the iris classifier in real Python' } },
        { note: '`nn.CrossEntropyLoss` = softmax + cross-entropy, on raw scores, with class numbers as targets. `argmax(dim=1)` gives each row\'s predicted class. A **confusion matrix** counts truth (rows) against guesses (columns). Keras: `Dense(k, activation="softmax")` and `sparse_categorical_crossentropy`.' },
      ],
    },

    {
      id: 'digits', number: '3.4', title: 'Handwritten digits',
      goal: 'Treat an image as a list of numbers, train a digit classifier, judge it on unseen digits, and read its mistakes in the confusion matrix.',
      builds: ['iris-pytorch'],
      blocks: [
        { md: `**Optical Recognition of Handwritten Digits** (Alpaydin and Kaynak, 1998; UCI Machine Learning Repository, CC BY 4.0). People wrote digits on forms; each digit was scanned into a 32 × 32 black-and-white bitmap, then cut into 8 × 8 blocks of 4 × 4 pixels, and each block's count of inked pixels (0 to 16) kept. So each digit is **64 numbers**, an 8 × 8 picture of how much ink fell where. This is the data set scikit-learn ships as \`load_digits\`: 1,797 digits.

To a network, an image is nothing special: 64 inputs, exactly like the 30 tumour measurements. One neuron per digit at the output, 10 scores, softmax.` },
        { figure: 'DigitGallery', caption: 'The first 40 digits. Click one to see its 64 numbers.' },
        {
          code: {
            file: 'digits.py', from: 12, to: 29, notes: [
              ['images, labels = [], []', ['The pictures and their digits.']],
              ['with open(os.path.join(HERE, "digits.csv"), encoding="utf-8") as handle:', ['The data file.']],
              ['for row in csv.DictReader(handle):', ['Each digit: columns p0 … p63 and digit.']],
              ['images.append([int(row[f"p{i}"]) / 16 for i in range(64)])', ['The 64 ink counts, divided by 16 so each is between 0 and 1: the same kind of scaling as before, done simply because the range is known. `f"p{i}"` is an **f-string**: `p0`, `p1`, …']],
              ['labels.append(int(row["digit"]))', ['Which digit it is: 0 to 9, a class number.']],
              ['return images, labels', ['1,797 of each.']],
              ['order = list(range(len(images)))', ['Positions to shuffle.']],
              ['random.Random(seed).shuffle(order)', ['Shuffle.']],
              ['n_test = int(len(order) * test_fraction)', ['359 digits for testing.']],
              ['test, train = order[:n_test], order[n_test:]', ['Split the positions.']],
              ['return ([images[i] for i in train]', ['1,438 to learn from, 359 to test.']],
            ],
          },
        },
        {
          code: {
            file: 'digits.py', fn: 'train_digits', notes: [
              ['torch.manual_seed(seed)', ['Repeatable.']],
              ['images, labels = load_digits()', ['All 1,797.']],
              ['(train_x, train_y), (test_x, test_y) = split(images, labels, seed=seed)', ['Train and test.']],
              ['x = torch.tensor(train_x)', ['1,438 × 64.']],
              ['y = torch.tensor(train_y)', ['1,438 class numbers.']],
              ['if hidden:', ['A hidden layer, or one layer.'], { logic: 'With hidden neurons, 64 → hidden → 10 with ReLU; with hidden = 0, softmax regression: 64 → 10 directly.' }],
              ['model = nn.Sequential(nn.Linear(64, hidden), nn.ReLU(), nn.Linear(hidden, 10))', ['64 → 32 → 10.']],
              ['model = nn.Linear(64, 10)', ['64 → 10: 650 weights.']],
              ['loss_fn = nn.CrossEntropyLoss()', ['As for the flowers.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=rate)', ['Gradient descent.']],
              ['for step in range(steps):', ['500 steps.']],
              ['loss = loss_fn(model(x), y)', ['All 1,438 digits at once.']],
              ['optimizer.zero_grad()', ['Clear.']],
              ['loss.backward()', ['Backpropagate.']],
              ['optimizer.step()', ['Step.']],
              ['with torch.no_grad():', ['Testing.']],
              ['guesses = model(torch.tensor(test_x)).argmax(dim=1).tolist()', ['The highest-scoring digit for each test image.']],
              ['table = confusion_matrix(guesses, test_y, 10)', ['A 10 × 10 table.']],
              ['right = sum(table[d][d] for d in range(10))', ['The diagonal: the right answers.']],
              ['print("test digits:", len(test_y)', ['Measured: one layer 339 of 359 (94.4%); 32 hidden 348 (96.9%); 32 hidden for 2,000 steps 352 (98.1%).']],
              ['return model, table', ['Model and table.']],
            ],
          },
        },
        { figure: 'DigitTrainer', caption: 'Train in your browser (with Adam, Part 5, so 150 steps are enough), then look at the confusion matrix and every digit it got wrong.' },
        {
          predict: {
            prompt: 'With 32 hidden neurons and 150 steps in the browser, how many of the 359 test digits does it get right?',
            answer: digitsRight(32), compute: () => digitsRight(32),
            explain: '349 (97.2%). One layer alone gets 339 (94.4%): a hidden layer helps, but less than you might expect, because 8 × 8 digits are already fairly easy to tell apart by where the ink is. Look at the mistakes: most are digits a person would hesitate over too.',
          },
        },
        { python: { program: 'digits', label: 'Train the digit classifier in real Python' } },
        { note: 'An image is a list of numbers: here 64 ink counts, scaled to 0–1. A digit classifier is the iris classifier with 64 inputs and 10 outputs. Judge it on unseen digits, and read the confusion matrix to see *which* digits it confuses.' },
      ],
    },

    {
      id: 'your-digit', number: '3.5', title: 'Your own digit, and what the model looks for',
      goal: 'Draw a digit, turn it into the model\'s 64 inputs exactly as the training data was made, read the prediction, and read a one-layer model\'s weights as pictures.',
      builds: ['digits'],
      blocks: [
        { md: `Now draw one yourself. Your drawing has to become 64 numbers **the same way the training digits did**, or the model is being asked about something it has never seen. The data set's recipe was: a 32 × 32 bitmap, the digit filling the box, cut into 4 × 4 blocks, inked pixels counted. The pad below does exactly that.

Then try it the wrong way: switch off "fit to the box" and draw a small digit in a corner. The 64 numbers look nothing like any training digit, and the model, which only knows training digits, guesses badly. This is the most common reason a model that tested well fails on real input: **the new input wasn't prepared like the training data**.` },
        { figure: 'DrawDigit', caption: 'Draw a digit filling most of the box. The middle picture is exactly what the model receives.' },
        {
          code: {
            file: 'digits.py', fn: 'predict_digit', notes: [
              ['with torch.no_grad():', ['Just predicting.']],
              ['probs = torch.softmax(model(torch.tensor([[p / 16 for p in pixels]])), dim=1)[0]', ['Your 64 counts scaled like the training data (÷ 16), as a one-row batch; the scores; softmax across the row (`dim=1`) for probabilities; `[0]` takes the single row.']],
              ['return int(probs.argmax()), probs.tolist()', ['The best guess and all ten probabilities.']],
            ],
          },
        },
        { h: 'What a one-layer model looks for' },
        { md: `In a one-layer model (64 → 10), digit $c$'s score is $\\sum_j w_{c,j}\\,x_j + b_c$: one weight per pixel. Draw those 64 weights as an 8 × 8 picture and you see what the model looks for: where ink raises that digit's score (positive weight) and where it lowers it (negative). It is a **template**, learned from the data.` },
        { figure: 'DigitWeights', caption: 'The ten neurons of a one-layer digit model, each weight drawn where its pixel is.' },
        {
          choice: {
            prompt: 'The digit model works well on the test set but badly on digits photographed with a phone. What is the most likely reason?',
            options: [
              { text: 'The photos aren\'t turned into 64 numbers the way the training data was (size, position, thickness, contrast), so they look unlike anything it learned from', why: 'Yes. Before blaming the model, prepare the new input exactly as the training data was prepared. Part 4 does this for full-size handwriting.' },
              { text: 'The model needs more hidden neurons', why: 'It did well on test digits prepared the right way; the problem is the input, not the model\'s size.' },
              { text: 'Phones can\'t take pictures of digits', why: 'They can; the pictures just need preparing.' },
              { text: 'The test set was too easy', why: 'The test digits were held back fairly. The difference is in how the new inputs were made.' },
            ],
            answer: 0,
          },
        },
        { note: 'Prepare new input **exactly** like the training data: the same size, position and scaling. A one-layer model\'s weights are readable templates: for each class, which inputs count for it and which against.' },
      ],
    },
  ],
}
