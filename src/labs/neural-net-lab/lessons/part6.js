// Part 6: pictures. Convolution by hand, a convolution layer (many filters, ReLU, pooling), a small
// CNN in PyTorch, what convolution buys (digits moved sideways), and saving, loading and using a model.
import { convolve, KERNELS } from '../engine/cnn.js'
import { f, s } from './util.js'

const tiny = [[0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]]

export const PART6 = {
  id: 'part6', title: 'Part 6 · Pictures', lessons: [
    {
      id: 'convolution', number: '6.1', title: 'Convolution: a filter slid over a picture',
      goal: 'Compute a convolution by hand, read what a filter detects, and say why one small filter is used at every place in the picture.',
      builds: ['your-classes'],
      blocks: [
        { md: `Lesson 4.5's hidden neurons each had 784 weights, one per pixel: a neuron that learned "a stroke at the top left" knows nothing about the same stroke at the bottom right. But a stroke is a stroke wherever it is. Pictures call for a different layer.

A **filter** (or **kernel**) is a small grid of weights, here 3 × 3. Lay it over a 3 × 3 patch of the picture, multiply each pair of overlapping numbers, add them up: one output number. Then slide it one pixel along and do it again, over every position. The result is a new picture, a **feature map**, saying how strongly the patch at each place matches the filter's pattern. That operation is **convolution**:

$$\\text{out}[r][c] = \\sum_{i=0}^{2}\\sum_{j=0}^{2} \\text{image}[r+i][c+j] \\cdot \\text{kernel}[i][j]$$

A 3 × 3 filter fits $28 - 3 + 1 = 26$ positions across a 28-pixel row, so a 28 × 28 picture gives a 26 × 26 map. And the **same 9 weights** are used everywhere: one pattern-detector, swept over the whole picture.` },
        {
          symbols: [
            ['\\text{kernel}[i][j]', 'kernel i j', 'the filter\'s 9 weights', 'kernel'],
            ['\\text{image}[r+i][c+j]', 'image r plus i, c plus j', 'the pixel under the filter\'s position $(i, j)$ when the filter sits at $(r, c)$', 'image[r + i][c + j]'],
            ['\\text{out}[r][c]', 'out r c', 'how well the patch at $(r, c)$ matches the filter', 'total'],
          ],
        },
        {
          code: {
            file: 'conv.py', from: 3, to: 23, notes: [
              ['"vertical edges": [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],', ['Negative on the left, positive on the right: large where the picture gets brighter (more ink) from left to right, a vertical edge. (This one is the **Sobel** filter, from 1968.)']],
              ['"horizontal edges": [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],', ['The same, turned: top to bottom.']],
              ['"blur": [[1 / 9, 1 / 9, 1 / 9]', ['All nine equal: the average of the patch, a blur.']],
              ['k = len(kernel)', ['The filter\'s size: 3.']],
              ['out = []', ['The feature map.']],
              ['for r in range(len(image) - k + 1):', ['Every row the filter fits at: 0 to 25 for a 28-row picture.']],
              ['row = []', ['…']],
              ['for c in range(len(image[0]) - k + 1):', ['Every column it fits at.']],
              ['total = 0.0', ['One output number:']],
              ['for i in range(k):', ['every row of the filter…']],
              ['for j in range(k):', ['…every column…']],
              ['total += image[r + i][c + j] * kernel[i][j]', ['…the pixel under it times the weight, added up.'], { tex: '\\text{out}[r][c] \\mathrel{+}= \\text{image}[r+i][c+j]\\cdot\\text{kernel}[i][j]', calc: q => [`${f(q.total)} + ${f(q.image[q.r + q.i][q.c + q.j])} × ${s(q.kernel[q.i][q.j])}`, q.total + q.image[q.r + q.i][q.c + q.j] * q.kernel[q.i][q.j]] }],
              ['row.append(total)', ['…']],
              ['out.append(row)', ['…']],
              ['return out', ['26 × 26 for a 28 × 28 picture and a 3 × 3 filter.']],
            ],
          },
        },
        { figure: 'ConvFig', caption: 'A real test digit and a filter. Click to move the window and see its arithmetic; edit the filter\'s numbers and watch the map change.' },
        {
          predict: {
            prompt: 'A 4 × 4 picture: two columns of paper (0) then two of ink (1), every row `[0, 0, 1, 1]`. With the "vertical edges" filter, what is the output at row 0, column 0 (the filter covering the first three columns)?',
            answer: convolve(tiny, KERNELS['vertical edges'])[0][0], compute: () => convolve(tiny, KERNELS['vertical edges'])[0][0],
            explain: 'Each row under the filter is $[0, 0, 1]$; the filter\'s right column is $[1, 2, 1]$ and its left column multiplies zeros: $1 + 2 + 1 = 4$. At column 1 the patch is $[0, 1, 1]$ in every row: left $0$, right $1+2+1$, so 4 again; a plain area (all ink, or all paper) would give 0.',
          },
        },
        { md: `(Strictly, mathematics calls this operation **cross-correlation**; true convolution flips the kernel first. Deep learning uses the name convolution for the unflipped version, and PyTorch's \`Conv2d\` computes exactly what \`convolve\` does: the lab's tests check it.)` },
        { python: { program: 'filters', label: 'Run the filters in real Python' } },
        { note: '**Convolution**: slide a small filter over the picture, multiply-and-add at every place. One filter, a few weights, a whole picture: it finds its pattern wherever the pattern is. 28 × 28 with a 3 × 3 filter gives 26 × 26.' },
      ],
    },

    {
      id: 'conv-layer', number: '6.2', title: 'A convolution layer: filters, ReLU and pooling',
      goal: 'Follow a picture through filtering, ReLU and max pooling, compute each stage\'s size, and count a convolution layer\'s weights.',
      builds: ['convolution'],
      blocks: [
        { md: `A **convolution layer** has many filters (say 8), each with its own 9 weights and a bias, each giving its own feature map. The maps then pass through **ReLU** (lesson 1.5, on every number), and then through **pooling**: each 2 × 2 block of the map is replaced by its largest number. Pooling halves the width and height (26 × 26 → 13 × 13), keeps the strongest responses, and makes the result care less about exactly which pixel the pattern was in.

Sizes and weights for 8 filters of 3 × 3 on one 28 × 28 picture:

| stage | size | weights |
|---|---|---|
| picture | 1 × 28 × 28 | |
| convolution | 8 × 26 × 26 | $8 \\times 9 + 8 = 80$ |
| ReLU | 8 × 26 × 26 | |
| 2 × 2 max pooling | 8 × 13 × 13 | |

80 weights for the whole layer, against 100,480 for a plain layer from 784 inputs to 128 neurons.` },
        {
          code: {
            file: 'conv.py', from: 25, to: 49, notes: [
              ['return [[max(0.0, v) for v in row] for row in image]', ['ReLU on every number: a list comprehension inside a list comprehension, one per row.']],
              ['out = []', ['The pooled picture.']],
              ['for r in range(0, len(image) - size + 1, size):', ['Rows 0, 2, 4, …: blocks don\'t overlap.']],
              ['row = []', ['…']],
              ['for c in range(0, len(image[0]) - size + 1, size):', ['Columns 0, 2, 4, …']],
              ['row.append(max(image[r + i][c + j] for i in range(size) for j in range(size)))', ['The largest of the block\'s 4 numbers.'], { tex: '\\text{pool}[r][c] = \\max_{i,j<2} \\text{map}[2r+i][2c+j]' }],
              ['out.append(row)', ['…']],
              ['return out', ['Half as wide and half as tall.']],
              ['digit = example()', ['Lesson 4.4\'s 7, prepared like MNIST.']],
              ['maps = {}', ['One result per filter.']],
              ['for name, kernel in KERNELS.items():', ['Each filter:']],
              ['maps[name] = max_pool(relu_map(convolve(digit, kernel)))', ['filter, then ReLU, then pool: one channel of a convolution layer.']],
              ['print({name: (len(m), len(m[0])) for name, m in maps.items()})', ['Each result is 13 × 13. A **dictionary comprehension** builds `{name: size}`.']],
              ['return maps', ['The three maps.']],
            ],
          },
        },
        { figure: 'PoolFig', caption: 'A digit through one filter, ReLU and pooling.' },
        {
          predict: {
            prompt: 'A convolution layer with 16 filters of 5 × 5 on a one-channel picture. How many weights and biases?',
            answer: 16 * 25 + 16, compute: () => 16 * 25 + 16,
            explain: '$16 \\times 25 + 16 = 416$. The size of the picture doesn\'t matter: the same filters are used at every place.',
          },
        },
        {
          predict: {
            prompt: 'A 28 × 28 picture, a 5 × 5 filter, then 2 × 2 max pooling. How wide is the result?',
            answer: Math.floor((28 - 5 + 1) / 2), compute: () => Math.floor((28 - 5 + 1) / 2),
            explain: '$28 - 5 + 1 = 24$ positions, halved by pooling: 12.',
            misconceptions: [{ answer: 14, feedback: 'That pools the original 28. The filter fits only $28 - 5 + 1 = 24$ positions first.' }],
          },
        },
        { note: 'A **convolution layer**: several filters (each a few weights and a bias), each making a feature map; then ReLU; then **max pooling**, which keeps the strongest response in each 2 × 2 block and halves the size. Its weight count depends on the filters, not on the picture.' },
      ],
    },

    {
      id: 'cnn', number: '6.3', title: 'A convolutional network in PyTorch',
      goal: 'Build a CNN with `nn.Conv2d`, `nn.MaxPool2d` and `nn.Flatten`, train it on MNIST, and compare it with the plain network.',
      builds: ['conv-layer', 'mnist-network'],
      blocks: [
        { md: `A **convolutional neural network** (CNN; LeCun et al., 1989, for exactly this job: reading handwritten digits) is a convolution layer (or several) followed by ordinary layers. The convolution part finds local patterns; the dense part combines them into an answer. Ours: 8 filters → ReLU → pooling → **flatten** the 8 × 13 × 13 = 1,352 numbers into one row → a dense layer to 10 scores.

PyTorch wants pictures as **N × channels × height × width**: here N × 1 × 28 × 28 (one channel: grey; a colour photo has 3: red, green, blue).` },
        {
          code: {
            file: 'cnn.py', from: 10, to: 38, notes: [
              ['return nn.Sequential(', ['The CNN, layer by layer:']],
              ['nn.Conv2d(1, 8, kernel_size=3),', ['1 channel in, 8 filters out, each 3 × 3: lesson 6.2\'s layer, 80 weights.']],
              ['nn.ReLU(),', ['ReLU on all 8 maps.']],
              ['nn.MaxPool2d(2),', ['2 × 2 max pooling: 8 × 13 × 13.']],
              ['nn.Flatten(),', ['8 × 13 × 13 into one row of 1,352.']],
              ['nn.Linear(8 * 13 * 13, 10),', ['A dense layer to 10 scores: 13,530 weights. Total 13,610.']],
              ['return nn.Sequential(nn.Flatten(), nn.Linear(784, 128), nn.ReLU(), nn.Linear(128, 10))', ['Lesson 4.3\'s plain network (with `Flatten` first, so both take the same N × 1 × 28 × 28 pictures): 101,770 weights.']],
              ['rng = random.Random(seed)', ['For shuffling.']],
              ['loss_fn = nn.CrossEntropyLoss()', ['As before.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=rate)', ['As before.']],
              ['for epoch in range(epochs):', ['One epoch.']],
              ['for batch in batches(len(images), batch_size, rng):', ['Lesson 4.2\'s batches.']],
              ['index = torch.tensor(batch)', ['…']],
              ['loss = loss_fn(model(images[index]), labels[index])', ['A batch of 64 pictures, 64 × 1 × 28 × 28.']],
              ['optimizer.zero_grad()', ['…']],
              ['loss.backward()', ['Backpropagation through the dense layer, the flatten, the pooling (only each block\'s largest number gets a gradient), ReLU and the filters. Each filter weight\'s gradient adds up its contribution at all 676 places it was used.']],
              ['optimizer.step()', ['…']],
              ['return model', ['Trained.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many weights does `nn.Linear(8 * 13 * 13, 10)` have, biases included?',
            answer: 8 * 13 * 13 * 10 + 10, compute: () => 8 * 13 * 13 * 10 + 10,
            explain: '$1{,}352 \\times 10 + 10 = 13{,}530$. With the convolution\'s 80, the whole CNN has 13,610 weights: about 7.5 times fewer than the plain network\'s 101,770.',
          },
        },
        { figure: 'LearnedFilters', caption: 'Train a CNN in the browser (and a plain network, for the next lesson). Then look at its 8 learned filters and what each finds in a digit.' },
        { md: `Keras, for comparison:

\`\`\`python
model = keras.Sequential([
    layers.Conv2D(8, kernel_size=3, activation="relu", input_shape=(28, 28, 1)),
    layers.MaxPooling2D(2),
    layers.Flatten(),
    layers.Dense(10, activation="softmax"),
])
\`\`\`

(Keras puts the channels last: 28 × 28 × 1. PyTorch puts them first: 1 × 28 × 28.)` },
        { note: 'A **CNN**: convolution layers (`Conv2d` + ReLU + `MaxPool2d`) find local patterns, `Flatten` lines them up, dense layers decide. PyTorch pictures are N × channels × height × width. Far fewer weights than a plain network, because each filter is shared across the picture.' },
      ],
    },

    {
      id: 'what-convolution-buys', number: '6.4', title: 'What convolution buys',
      goal: 'Measure a CNN against a plain network on accuracy, size and digits moved sideways, and say where one convolution layer\'s help runs out.',
      builds: ['cnn'],
      blocks: [
        { md: `Two claims to test: a CNN does at least as well with far fewer weights, and it copes better when the digit isn't exactly where the training digits were. To test the second, move every test digit a few pixels to the right (\`torch.roll\`) and measure again.` },
        {
          code: {
            file: 'cnn.py', from: 41, to: 62, notes: [
              ['with torch.no_grad():', ['Measuring.']],
              ['moved = torch.roll(images, shifts=shift, dims=3)', ['Shift every picture `shift` pixels right along dimension 3, the width (dimensions: 0 picture, 1 channel, 2 height, 3 width). What falls off the right edge comes back on the left; MNIST\'s edges are empty, so nothing visible wraps.']],
              ['return (model(moved).argmax(dim=1) == labels).float().mean().item()', ['The fraction right.']],
              ['torch.manual_seed(seed)', ['Repeatable.']],
              ['x, y = load_mnist("train")', ['All 60,000.']],
              ['test_x, test_y = load_mnist("test")', ['All 10,000.']],
              ['x = x.view(-1, 1, 28, 28)', ['Rows of 784 back into pictures: N × 1 × 28 × 28. `-1` means "work this one out".']],
              ['test_x = test_x.view(-1, 1, 28, 28)', ['The same.']],
              ['results = {}', ['Per network: weights and three accuracies.']],
              ['for name, model in (("dense", make_dense()), ("cnn", make_cnn())):', ['Both networks, trained the same way.']],
              ['train(model, x, y, epochs=epochs, seed=seed)', ['One epoch each.']],
              ['weights = sum(p.numel() for p in model.parameters())', ['`numel()`: how many numbers a tensor holds. Summed over all of them.']],
              ['results[name] = [weights] + [round(accuracy(model, test_x, test_y, shift), 4) for shift in (0, 2, 4)]', ['Accuracy as is, and moved 2 and 4 pixels.']],
              ['print(name, "weights", weights', ['Measured: plain 101,770 weights, 92.9% / 69.3% / 24.1%; CNN 13,610 weights, 94.6% / 76.6% / 36.1%.']],
              ['return results', ['Both.']],
            ],
          },
        },
        { figure: 'ShiftFig', caption: 'The two networks trained in the previous lesson\'s figure, on test digits moved sideways.' },
        { md: `Measured in Python on all of MNIST:

| | weights | as is | moved 2 pixels | moved 4 pixels |
|---|---|---|---|---|
| plain 784 → 128 → 10 | 101,770 | 92.9% | 69.3% | 24.1% |
| CNN, 8 filters | 13,610 | **94.6%** | **76.6%** | **36.1%** |

The CNN is more accurate with 7.5 times fewer weights, and holds up better when digits move. But one convolution layer and one pooling only tolerate small moves; 4 pixels defeats it too. Real image networks stack several convolution-and-pooling stages (each sees a larger area and cares less about position), and train with shifted copies (lesson 4.6's augmentation) as well.` },
        {
          choice: {
            prompt: 'Why does the plain network fall apart when digits move 2 pixels?',
            options: [
              { text: 'Each of its weights belongs to one pixel position, so the same stroke two pixels over meets entirely different weights', why: 'Yes. It learned "ink at these positions", not "this shape". The CNN\'s filters meet the stroke wherever it is.' },
              { text: 'It has too few weights', why: 'It has 7.5 times more than the CNN.' },
              { text: 'Moving a digit changes its label', why: 'A 7 moved right is still a 7; the label is the same.' },
              { text: 'It was trained for too short a time', why: 'Longer training on centred digits only makes it better at centred digits.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'cnn', label: 'Compare the two networks on all of MNIST in real Python' } },
        { note: 'Convolution shares each filter across the picture: far fewer weights, better accuracy, and some tolerance to where things are. One layer only tolerates small moves; deeper stacks and augmentation go further.' },
      ],
    },

    {
      id: 'save-load', number: '6.5', title: 'Saving, loading and using a model',
      goal: 'Save a trained model\'s weights to a file, load them into a new model, check it answers identically, and use it.',
      builds: ['what-convolution-buys'],
      blocks: [
        { md: `A trained model is its architecture (the code that builds the layers) plus its weights (the numbers training found). To use it tomorrow, or in another program, save the weights; to use them, build the same architecture and load them in.

In PyTorch the weights live in the **state dict**: a dictionary from each parameter's name (\`0.weight\`, \`0.bias\`, \`4.weight\`, …) to its tensor.` },
        {
          code: {
            file: 'save_load.py', fn: 'save_and_load', notes: [
              ['torch.manual_seed(seed)', ['Repeatable.']],
              ['x, y = load_mnist("train", limit)', ['6,000 digits: enough for a quick model.']],
              ['test_x, test_y = load_mnist("test", 1000)', ['1,000 to test.']],
              ['x, test_x = x.view(-1, 1, 28, 28), test_x.view(-1, 1, 28, 28)', ['As pictures.']],
              ['model = train(make_cnn(), x, y, seed=seed)', ['Train a CNN.']],
              ['path = os.path.join(tempfile.gettempdir(), "digit_cnn.pt")', ['Where to save: the system\'s temporary folder. `.pt` is PyTorch\'s usual ending.']],
              ['torch.save(model.state_dict(), path)', ['**Save** the weights: every tensor, by name, in one file (57 KB here).']],
              ['fresh = make_cnn()', ['A brand-new CNN with random weights: the same architecture, built by the same code.']],
              ['fresh.load_state_dict(torch.load(path))', ['**Load**: read the file and copy every saved tensor into the parameter with the same name. If the architectures differ, PyTorch refuses, naming the missing or unexpected parameters.']],
              ['fresh.eval()', ['Evaluation mode for using it (lesson 5.5).']],
              ['with torch.no_grad():', ['Just predicting.']],
              ['same = torch.equal(model(test_x), fresh(test_x))', ['Do the two models give exactly the same outputs for 1,000 test digits? `torch.equal` is True only if every number matches.']],
              ['print("saved to", path', ['Measured: identical, and 84.9% right (a quick model: one epoch on 6,000 digits).']],
              ['return same, accuracy(fresh, test_x, test_y)', ['Both checks.']],
            ],
          },
        },
        { figure: 'SaveLoadFig', caption: 'Save the CNN you trained in this browser as a file (its weights, as JSON), load it back (here, or another day), and use it on your own drawing.' },
        { md: `In Keras, the whole model (architecture and weights together) goes into one file:

\`\`\`python
model.save("digit_cnn.keras")
model = keras.models.load_model("digit_cnn.keras")
\`\`\`

And to use a model anywhere: prepare the input exactly as the training data was (Part 4), run it through the model in evaluation mode, and read the class with the highest score, along with its probability, remembering lesson 4.5: a probability is only meaningful for inputs like the ones the model learned from.

That is the whole path this lab has followed: data, a model, a loss, gradients, an optimiser, judging on unseen data, and using the result, from one neuron fitting a line to a convolutional network reading your handwriting. Every piece is now something you have written by hand.` },
        { python: { program: 'save_load', label: 'Save and load a model in real Python' } },
        { note: 'Save a model\'s **weights** (`torch.save(model.state_dict(), path)`); to use them, build the same architecture and `load_state_dict(torch.load(path))`. Then: `eval()`, prepare the input like the training data, predict.' },
      ],
    },
  ],
}
