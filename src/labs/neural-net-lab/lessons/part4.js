// Part 4: your handwriting. MNIST and its file format, mini-batches and epochs, training on 60,000
// digits, preparing a drawing the way MNIST's digits were prepared, trying your own handwriting (and
// what a classifier can't know), and training classes you draw yourself.
import { toMnist, exampleDrawing, batches, PyRandom } from '../engine/part4.js'
import { f } from './util.js'

const ex = () => toMnist(exampleDrawing())

export const PART4 = {
  id: 'part4', title: 'Part 4 · Your handwriting', lessons: [
    {
      id: 'mnist', number: '4.1', title: 'MNIST: 70,000 handwritten digits',
      goal: 'Download MNIST, read its file format byte by byte, and hold its images as a tensor of brightnesses.',
      builds: ['your-digit'],
      blocks: [
        { md: `Part 3's digits were 8 × 8 ink counts. **MNIST** (LeCun, Cortes and Burges, 1998; CC BY-SA 3.0) is the classic full-size set: **70,000** handwritten digits, 60,000 for training and 10,000 for testing, each a **28 × 28 greyscale** image: 784 brightnesses. It was written by American Census Bureau staff and high-school students, and has been the first data set of almost every deep-learning course since.

Two new things come with size. The files are big (11 MB compressed), so they are downloaded once and kept. And they are stored in a compact binary format, **IDX**, that you can read with a dozen lines of Python, which is a good way to see that a file is just bytes.` },
        {
          code: {
            file: 'mnist.py', from: 8, to: 35, notes: [
              ['MIRROR = "https://ossci-datasets.s3.amazonaws.com/mnist/"', ['Where to fetch the files: the copy PyTorch\'s own `torchvision.datasets.MNIST` downloads from.']],
              ['CACHE = os.path.join(os.path.expanduser("~"), ".cache", "upskillos-mnist")', ['A folder in your home folder to keep them in, so they are downloaded only once. `expanduser("~")` is your home folder on any system.']],
              ['os.makedirs(CACHE, exist_ok=True)', ['Make the folder; `exist_ok=True` means "fine if it already exists".']],
              ['path = os.path.join(CACHE, name)', ['Where this file lives.']],
              ['if not os.path.exists(path):', ['Not downloaded yet?'], { logic: 'Only if the file isn\'t in the cache already, download it. Every later run reads the saved copy.' }],
              ['urllib.request.urlretrieve(MIRROR + name, path)', ['Download it, from Python\'s standard library: no extra package needed.']],
              ['return path', ['The file\'s place on disk.']],
              ['images_file, labels_file = FILES[split]', ['The two files for "train" or "test": images and labels are separate files.']],
              ['with gzip.open(download(images_file), "rb") as handle:', ['The files are gzip-compressed; `gzip.open` unpacks as it reads. `"rb"`: read bytes, not text.']],
              ['data = handle.read()', ['The whole file as one `bytes` object: 47 million bytes for the training images.']],
              ['magic, count, rows, cols = struct.unpack(">IIII", data[:16])', ['The **header**, the first 16 bytes: four whole numbers of 4 bytes each. `struct.unpack` turns bytes into numbers; `">IIII"` says four unsigned 32-bit integers, **big-endian** (most significant byte first, `>`). For the training images: magic 2051 (says "this is an image file"), count 60,000, rows 28, columns 28.']],
              ['with gzip.open(download(labels_file), "rb") as handle:', ['The labels file.']],
              ['labels = handle.read()[8:]', ['Its header is 8 bytes (magic and count); after that, one byte per digit: 5, 0, 4, 1, 9, …']],
              ['if limit:', ['Asked for fewer?'], { logic: 'If a limit was given, keep only that many digits (handy for quick runs).' }],
              ['count = min(count, limit)', ['…']],
              ['pixels = torch.frombuffer(bytearray(data[16:16 + count * rows * cols]), dtype=torch.uint8)', ['After the header, one byte per pixel, image after image, row by row: 0 is paper, 255 full ink. `torch.frombuffer` makes a tensor that reads those bytes directly, as unsigned 8-bit integers (`uint8`), with no Python loop over 47 million numbers.']],
              ['images = pixels.view(count, rows * cols).float() / 255', ['`view` reshapes the long row of bytes into 60,000 rows of 784; `.float() / 255` turns 0–255 into 0–1, the scaling every image model uses.'], { tex: 'x = \\text{byte} / 255' }],
              ['return images, torch.tensor(list(labels[:count]))', ['Images (60,000 × 784) and labels (60,000). `list(bytes)` gives the byte values as numbers.']],
            ],
          },
        },
        { figure: 'MnistGallery', caption: 'The first 48 training digits (the browser holds a 4,000-digit sample of MNIST), and the average of every digit of each kind.' },
        {
          predict: {
            prompt: 'MNIST\'s training images file holds 60,000 images of 28 × 28 pixels, one byte each, after its 16-byte header. How many bytes is it, unpacked?',
            answer: 16 + 60000 * 28 * 28, compute: () => 16 + 60000 * 784,
            explain: '$16 + 60{,}000 \\times 784 = 47{,}040{,}016$ bytes: 47 MB. Compressed, 9.9 MB: most pixels are 0, which compresses well.',
          },
        },
        { python: { program: 'mnist_load', label: 'Read MNIST in real Python, header and all' } },
        { note: 'MNIST: 60,000 + 10,000 digits, 28 × 28 bytes each (0–255). A file is bytes: a header read with `struct.unpack`, then the pixels, read straight into a tensor with `torch.frombuffer` and scaled to 0–1.' },
      ],
    },

    {
      id: 'mini-batches', number: '4.2', title: 'Mini-batches and epochs',
      goal: 'Split training data into shuffled mini-batches, count steps and epochs, and explain why small batches learn faster for the same work.',
      builds: ['mnist', 'train-a-net'],
      blocks: [
        { md: `Until now every step used **every** example: the gradient averaged over all 40 points, all 1,438 digits. With 60,000 images, one step would mean pushing all 60,000 through the network. Too slow, and wasteful: the average over 64 random images already points roughly the right way.

So shuffle the training set, cut it into groups of, say, 64 (**mini-batches**), and take one step per batch. 60,000 images make 938 batches, so **938 steps** where full-batch training would take 1. One pass through the whole training set is an **epoch**.

Each batch's gradient is a little noisy (a different 64 images point in slightly different directions), and that noise doesn't hurt; it often helps the network out of poor spots. This is what "stochastic" means in **stochastic gradient descent**: the "SGD" in \`torch.optim.SGD\`.` },
        {
          code: {
            file: 'mnist_net.py', fn: 'batches', notes: [
              ['order = list(range(n))', ['Every position, 0 to n − 1.']],
              ['rng.shuffle(order)', ['In a new random order every epoch, so batches are different each time.']],
              ['return [order[i:i + batch_size] for i in range(0, n, batch_size)]', ['`range(0, n, batch_size)` counts 0, 64, 128, …; each slice takes the next 64 positions. The last batch may be smaller (60,000 = 937 × 64 + 32).'], { calc: q => [`${q.n} positions in groups of ${q.batch_size}`, `${Math.ceil(q.n / q.batch_size)} batches`] }],
            ],
          },
        },
        {
          predict: {
            prompt: 'With 60,000 training images and batches of 64, how many steps does one epoch take?',
            answer: Math.ceil(60000 / 64), compute: () => batches(60000, 64, new PyRandom(0)).length,
            explain: '$60{,}000 / 64 = 937.5$, so 938 batches: 937 full ones and one of 32.',
            misconceptions: [{ answer: 937, feedback: 'The 32 images left over still make a (smaller) batch: 938.' }],
          },
        },
        { figure: 'BatchFig', caption: 'Three networks, each allowed to look at 9,000 images: in 3 big steps, in 36 steps of 256, or in 282 steps of 32.' },
        { md: `PyTorch has ready-made pieces for this, which do exactly what \`batches\` does:

\`\`\`python
from torch.utils.data import TensorDataset, DataLoader
loader = DataLoader(TensorDataset(x, y), batch_size=64, shuffle=True)
for epoch in range(2):
    for batch_x, batch_y in loader:      # one shuffled batch at a time
        loss = loss_fn(model(batch_x), batch_y)
        ...
\`\`\`

And Keras's \`fit(x, y, epochs=2, batch_size=64)\` is the same loop: the \`batch_size\` you have been passing all along. Until now it was the whole data set.` },
        {
          choice: {
            prompt: 'Why shuffle again before every epoch?',
            options: [
              { text: 'So the batches differ from epoch to epoch; otherwise the network sees the same groups in the same order every time, and their quirks repeat', why: 'Yes. A fixed order can, for example, end every epoch on the same unusual batch. Fresh batches keep the noise random.' },
              { text: 'Shuffling makes the images easier', why: 'The images are the same; only their grouping changes.' },
              { text: 'PyTorch requires it', why: '`shuffle=True` is a choice; for testing you leave it off.' },
              { text: 'To use fewer images per epoch', why: 'Every image is still used once per epoch.' },
            ],
            answer: 0,
          },
        },
        { note: 'A **mini-batch** is a few dozen shuffled examples; one optimiser step per batch. An **epoch** is one pass over all of them. Small batches give many cheap, slightly noisy steps: much faster learning for the same work. `DataLoader` and Keras\'s `batch_size` do exactly this.' },
      ],
    },

    {
      id: 'mnist-network', number: '4.3', title: 'Training on 60,000 digits',
      goal: 'Train a 784 → 128 → 10 network on MNIST with mini-batches, test it on 10,000 unseen digits, and say what more data buys.',
      builds: ['mini-batches'],
      blocks: [
        { added: true, kind: 'recall', note: 'Each MNIST image is 784 brightnesses in one row, so the training images are a tensor of shape `(60000, 784)` and the labels a tensor of 60,000 digits (lesson 4.1). Training takes one step per shuffled mini-batch of 64 (lesson 4.2). The last layer gives 10 raw scores, one per digit, and `nn.CrossEntropyLoss` does the softmax and the loss in one (lesson 3.3).' },
        { md: `Everything is in place: the digits as a tensor, batches, and Part 3's classifier, now with 784 inputs. One hidden layer of 128 neurons: $784 \\times 128 + 128 + 128 \\times 10 + 10 = 101{,}770$ weights.` },
        {
          code: {
            file: 'mnist_net.py', fn: 'train_mnist', notes: [
              ['torch.manual_seed(seed)', ['Repeatable starting weights…']],
              ['rng = random.Random(seed)', ['…and repeatable shuffles.']],
              ['x, y = load_mnist("train", limit)', ['60,000 × 784 images and their labels.']],
              ['test_x, test_y = load_mnist("test")', ['The 10,000 test digits, never trained on.']],
              ['model = nn.Sequential(nn.Linear(784, hidden), nn.ReLU(), nn.Linear(hidden, 10))', ['784 → 128 → 10.']],
              ['loss_fn = nn.CrossEntropyLoss()', ['As in Part 3.']],
              ['optimizer = torch.optim.SGD(model.parameters(), lr=rate)', ['Stochastic gradient descent, now truly stochastic: one step per random batch.']],
              ['history = []', ['Every batch\'s loss.']],
              ['accuracy = 0.0', ['The test accuracy, measured after each epoch.']],
              ['for epoch in range(epochs):', ['2 epochs: every image seen twice.']],
              ['for batch in batches(len(x), batch_size, rng):', ['938 batches per epoch.']],
              ['index = torch.tensor(batch)', ['The batch\'s 64 positions as a tensor…']],
              ['loss = loss_fn(model(x[index]), y[index])', ['…used to pick those rows out of the images and labels at once (**indexing with a tensor**): a 64 × 784 batch in, 64 × 10 scores out.']],
              ['optimizer.zero_grad()', ['Clear.']],
              ['loss.backward()', ['The gradient of this batch\'s average loss.']],
              ['optimizer.step()', ['One step.']],
              ['history.append(loss.item())', ['Keep it: the curve is jagged, because each batch differs.']],
              ['with torch.no_grad():', ['After each epoch, a test:']],
              ['accuracy = (model(test_x).argmax(dim=1) == test_y).float().mean().item()', ['All 10,000 test digits at once: the predicted digit, compared with the label (a tensor of True/False), as 1.0/0.0, averaged.'], { logic: 'For each test digit, is the highest-scoring class the true digit? The fraction of yeses is the accuracy.' }],
              ['print("epoch", epoch + 1', ['Measured: after epoch 1, 92.9%; after epoch 2, 94.1% (9 seconds in all on a laptop CPU).']],
              ['return model, history, accuracy', ['The model, its batch losses, its last test accuracy.']],
            ],
          },
        },
        { figure: 'MnistTrainer', caption: 'The same network in your browser, trained on the 3,000-digit sample (with Adam, Part 5). Then its 10 × 10 table, and some of its mistakes.' },
        { md: `Compare: trained on **3,000** digits (in the browser) the network gets about 88% of the test digits right; on all **60,000** (Python), 94% after two epochs, and around 98% with a longer run and a better optimiser. Same network, same code. **More examples of what the world looks like are usually worth more than a cleverer model.** The mistakes are telling too: most are digits a person would hesitate over.` },
        { python: { program: 'mnist', label: 'Train on all 60,000 digits in real Python' } },
        { note: 'MNIST with 784 → 128 → 10, mini-batches of 64, two epochs: 94% on 10,000 unseen digits. The code is Part 3\'s, plus a batch loop. And more data helps: the same network trained on 3,000 digits gets about 88%.' },
      ],
    },

    {
      id: 'prepare-drawing', number: '4.4', title: 'Making your drawing look like MNIST',
      goal: 'Prepare a drawing exactly as MNIST\'s digits were prepared: crop the ink, shrink it into 20 × 20, and centre it by its centre of mass in 28 × 28.',
      builds: ['mnist-network'],
      blocks: [
        { md: `Lesson 3.5's warning matters more now. MNIST's digits weren't just scanned: each was **cropped** to its ink, **shrunk** (keeping its shape) to fit a **20 × 20** box, which also softened its edges into greys, and **placed** in a 28 × 28 image so that its **centre of mass**, the balance point of the ink, sits at the centre. A drawing on a pad, at any size and anywhere, must go through the same steps, or the network sees something unlike anything it trained on.` },
        {
          code: {
            file: 'preprocess.py', from: 1, to: 31, notes: [
              ['rows = [r for r, row in enumerate(image) if any(v > 0 for v in row)]', ['Every row with any ink in it. `any(...)` is True if at least one item is.']],
              ['cols = [c for c in range(len(image[0])) if any(row[c] > 0 for row in image)]', ['Every column with ink.']],
              ['return rows[0], rows[-1], cols[0], cols[-1]', ['The first and last of each: the **ink box**. `[-1]` is a list\'s last item.']],
              ['height, width = len(image), len(image[0])', ['The cropped drawing\'s size.']],
              ['scale = max(height, width) / size', ['How many old pixels go into one new pixel, chosen so the **longer** side becomes 20: the shape is kept, a tall 1 stays thin.'], { calc: q => [`max(${q.height}, ${q.width}) / ${q.size}`, Math.max(q.height, q.width) / q.size] }],
              ['new_h, new_w = max(1, round(height / scale)), max(1, round(width / scale))', ['The new size: 20 on the long side.']],
              ['out = []', ['The smaller image.']],
              ['for r in range(new_h):', ['Each new row…']],
              ['row = []', ['…']],
              ['for c in range(new_w):', ['…each new pixel:']],
              ['r0, r1 = int(r * scale), max(int(r * scale) + 1, int((r + 1) * scale))', ['The block of old rows it covers (at least one).']],
              ['c0, c1 = int(c * scale), max(int(c * scale) + 1, int((c + 1) * scale))', ['…and old columns.']],
              ['cells = [image[i][j] for i in range(r0, min(r1, height)) for j in range(c0, min(c1, width))]', ['Every old pixel in that block.']],
              ['row.append(sum(cells) / len(cells))', ['Their average: a block half inked becomes 0.5 grey. This is where MNIST\'s soft edges come from.'], { tex: '\\text{new} = \\frac{1}{|B|}\\sum_{(i,j) \\in B} \\text{old}_{ij}' }],
              ['out.append(row)', ['…']],
              ['return out', ['At most 20 × 20.']],
              ['total = sum(sum(row) for row in image)', ['All the ink.']],
              ['row_mean = sum(r * v for r, row in enumerate(image) for v in row) / total', ['The average row, each pixel counted as much as its ink: where the ink balances top to bottom.'], { tex: '\\bar r = \\frac{\\sum_{r,c} r\\,v_{rc}}{\\sum_{r,c} v_{rc}}' }],
              ['col_mean = sum(c * v for row in image for c, v in enumerate(row)) / total', ['The same, left to right.'], { tex: '\\bar c = \\frac{\\sum_{r,c} c\\,v_{rc}}{\\sum_{r,c} v_{rc}}' }],
              ['return row_mean, col_mean', ['The centre of mass.']],
            ],
          },
        },
        {
          code: {
            file: 'preprocess.py', fn: 'to_mnist', notes: [
              ['top, bottom, left, right = ink_box(image)', ['1. Find the ink.']],
              ['crop = [row[left:right + 1] for row in image[top:bottom + 1]]', ['Cut it out: slices of rows, then of each row.']],
              ['small = shrink(crop, 20)', ['2. Shrink it to fit 20 × 20.']],
              ['row_mean, col_mean = centre_of_mass(small)', ['3. Its balance point…']],
              ['shift_r, shift_c = round(14 - row_mean - 0.5), round(14 - col_mean - 0.5)', ['…and how far to move it so the balance point lands at the middle of 28 × 28 (pixel $r$\'s centre is at $r + 0.5$, the image\'s centre at 14).'], { calc: q => [`round(14 − ${f(q.row_mean)} − 0.5), round(14 − ${f(q.col_mean)} − 0.5)`, `(${Math.round(14 - q.row_mean - 0.5)}, ${Math.round(14 - q.col_mean - 0.5)})`] }],
              ['out = [[0.0] * 28 for r in range(28)]', ['A blank 28 × 28 image.']],
              ['for r, row in enumerate(small):', ['Copy every pixel of the small image…']],
              ['for c, v in enumerate(row):', ['…']],
              ['if 0 <= r + shift_r < 28 and 0 <= c + shift_c < 28:', ['…to its shifted place, if that is inside the image.'], { logic: 'Only copy a pixel if its new position is within the 28 × 28 image (a very lopsided drawing can be pushed slightly off the edge).' }],
              ['out[r + shift_r][c + shift_c] = v', ['…']],
              ['return out', ['A 28 × 28 image prepared exactly like an MNIST digit.']],
            ],
          },
        },
        {
          code: {
            file: 'preprocess.py', fn: 'example', notes: [
              ['canvas = [[0.0] * 60 for r in range(60)]', ['A blank 60 × 60 drawing.']],
              ['for c in range(5, 30):', ['A thick bar along the top-left…']],
              ['for r in range(5, 9):', ['…4 rows thick…']],
              ['canvas[r][c] = 1.0', ['…of full ink.']],
              ['for step in range(25):', ['Then a slanting stroke down from its right end: a 7.']],
              ['for w in range(4):', ['4 pixels thick.']],
              ['canvas[8 + step][29 - step // 2 - w] = 1.0', ['One row down and half a column left each step. `//` is whole-number division.']],
              ['return to_mnist(canvas)', ['A small 7 in a corner, made MNIST-like.']],
            ],
          },
        },
        { figure: 'PreprocessFig', caption: 'Draw anywhere, any size. The three pictures are the three steps.' },
        {
          predict: {
            prompt: 'The example 7 (60 × 60 canvas, drawn in the top-left) is prepared like MNIST. How many of its 784 pixels end up with some ink?',
            answer: ex().flat().filter(x => x > 0).length, compute: () => ex().flat().filter(x => x > 0).length,
            explain: '108: 95 fully inked and 13 grey, where shrinking averaged ink with paper along the stroke\'s edges. The 7 was drawn 25 × 28 pixels in a corner; now it is 20 pixels tall in the middle, like every MNIST digit.',
          },
        },
        { python: { program: 'preprocess', label: 'Step through the preparation in real Python' } },
        { note: 'Prepare like MNIST: crop to the ink, shrink to fit 20 × 20 (averaging pixels, which makes soft grey edges), and place in 28 × 28 with the centre of mass in the middle. The lab\'s browser code and Python give the same image.' },
      ],
    },

    {
      id: 'try-handwriting', number: '4.5', title: 'Your handwriting, and what the model can\'t know',
      goal: 'Test the digit model on your own handwriting, see what preparation changes, read hidden neurons\' weights as pictures, and explain why a classifier names a digit even for a scribble.',
      builds: ['prepare-drawing'],
      blocks: [
        { md: `Now write. The model below is the one from lesson 4.3 (train it there, or here), and your drawing goes through lesson 4.4's steps. Untick "prepare it like MNIST" to feed it your raw drawing, shrunk to 28 × 28 but not cropped or centred, and watch how much worse it gets.` },
        { figure: 'DrawMnist', caption: 'Write a digit, large and clear. Then try a digit drawn small in a corner with and without preparation; then something that isn\'t a digit.' },
        { h: 'A model always answers' },
        { md: `Draw a heart, a letter A, a scribble. The model still says "8, 73% sure" or similar. Nothing is broken: softmax always shares out 100% among the ten classes it has, and nothing in the training ever showed it a non-digit, so it has no notion of "none of these". **A confident probability is not the same as being right**, especially on input unlike the training data.

Real systems handle this with an extra "other" class trained on non-digits, or by flagging inputs that look unlike the training data. Remember it whenever you read a model's percentage.` },
        { h: 'What the hidden neurons look for' },
        { figure: 'HiddenWeights', caption: 'The first layer\'s weights, one 28 × 28 picture per hidden neuron.' },
        { md: `In Part 3's one-layer model each output neuron was a whole-digit template. Hidden neurons are different: each responds to a **piece**: a stroke at an angle, a loop in the top half, ink on the left and none in the centre. The output layer then weighs which pieces are present. That is the "deep" in deep learning, in miniature: each layer builds on the features of the one before.` },
        {
          choice: {
            prompt: 'The model says "3, 96% sure" for a drawing of a cat. What does that tell you?',
            options: [
              { text: 'Little: the model only knows ten digits and must share 100% among them; on input unlike its training data, its confidence means nothing', why: 'Yes. Out-of-range input is the classic way confident models fail. The probability is only trustworthy for inputs like the ones it learned from.' },
              { text: 'The cat looks very like a 3', why: 'Maybe a little, but the 96% mostly reflects that "3" was the least bad of ten options it was forced to choose between.' },
              { text: 'The model is broken', why: 'It is doing exactly what it was built to do; it was never asked to recognise non-digits.' },
              { text: 'It needs more hidden neurons', why: 'A bigger digit model is still a digit model. It needs non-digit examples, or a way to say "unlike anything I know".' },
            ],
            answer: 0,
          },
        },
        { note: 'Your handwriting works when it is prepared like the training data. A classifier always picks one of its classes, confident or not, even for input that belongs to none. Hidden neurons learn **parts** (strokes, loops), which later layers combine.' },
      ],
    },

    {
      id: 'your-classes', number: '4.6', title: 'Classes of your own',
      goal: 'Collect your own labelled drawings, multiply them with small shifts (data augmentation), train a classifier on them, and use it.',
      builds: ['try-handwriting'],
      blocks: [
        { md: `Everything so far used someone else's data. Make your own: choose 2 to 5 classes (a tick, a cross and a circle; three letters; your initials against someone else's), draw a few examples of each, train, and use it.

A handful of drawings is very little data. A standard trick stretches it: **data augmentation**, making extra examples by changing each one in ways that shouldn't change its class. A tick moved 2 pixels to the left is still a tick. Here each drawing is also used shifted by up to 2 pixels in every direction: 25 versions of each. (Image models also use small rotations, zooms and changes of thickness.)

Each drawing is prepared like MNIST (lesson 4.4) before it is stored, so the model sees the same kind of input when you test it.` },
        { figure: 'YourClasses', caption: 'Name the classes, draw at least 3 examples of each (5 or more is better), train, then draw new ones to test it.' },
        {
          choice: {
            prompt: 'Your tick/cross model is perfect on your drawings but poor on a friend\'s. What is the best fix?',
            options: [
              { text: 'Add examples drawn by the friend (and others) to the training set', why: 'Yes. The model learned your handwriting: the training examples should cover the variety it will meet. Same lesson as 4.3: data beats cleverness.' },
              { text: 'Train for more epochs', why: 'It is already perfect on your drawings; more training fits them even more closely, not the friend\'s.' },
              { text: 'Use a bigger network', why: 'A bigger network learns your style even better. It still hasn\'t seen the friend\'s.' },
              { text: 'Turn augmentation off', why: 'Augmentation helps generalise; turning it off makes things worse.' },
            ],
            answer: 0,
          },
        },
        { note: 'Your own classifier: collect labelled examples, prepare them like the input you will test with, **augment** them (small shifts) to stretch a small data set, train, use. It knows only what your examples show it.' },
      ],
    },
  ],
}

