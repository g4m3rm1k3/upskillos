// Part 3: arrows and tables. Vectors, linear combinations, norms, the dot product, matrices acting
// on vectors and on the plane, matrix multiplication, the transpose, inverses and determinants,
// systems of equations, least squares, eigenvectors, and gradients of vector expressions.
import { add, scale, norm, dot, cosine, matvec, matmul, transpose, det2, inverse2, solve2, leastSquares, eigen2 } from '../engine/maths.js'
import { f } from './util.js'

const A = [[2, 1], [1, 3]]

export const PART3 = {
  id: 'part3', title: 'Part [[#part:part3]] · Arrows and tables: linear algebra', lessons: [
    {
      id: 'vectors', title: 'Vectors: lists that are also arrows',
      goal: 'Read $\\mathbf x \\in \\mathbb R^n$ and $x_i$, and see one vector as a list of numbers, a point and an arrow.',
      builds: ['gradient', 'subscripts'],
      blocks: [
        { md: `A house has a size (120 m²), a number of bedrooms (3) and an age (40 years). Keep those three numbers together, in order, and you have a **vector**:

$$\\mathbf x = (120,\\; 3,\\; 40)$$

A vector is just an ordered list of numbers. Its **entries** are $x_1 = 120$, $x_2 = 3$, $x_3 = 40$ (lesson [[#subscripts]]'s subscripts), and since it holds three real numbers we say $\\mathbf x \\in \\mathbb R^3$, "x is in R three". In ML, almost everything is a vector: one example's measurements, a word's embedding (300 numbers), an image (784 pixel values), the model's parameters θ, the gradient $\\nabla \\mathcal L$ (lesson [[#gradient]] already was one).

With two entries a vector can be **drawn**. $(3, 2)$ is the point 3 across and 2 up, or the **arrow** from the origin to that point. The arrow view is what makes the operations of this part visible: they are things you can do to arrows. Everything we see in 2D works the same way with 784 entries; we just can't draw it.

Notation varies: bold $\\mathbf x$, an arrow $\\vec x$, or plain $x$ when the paper has said $x \\in \\mathbb R^d$. Vectors are usually written as **columns**, $\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix}$; lesson [[#transpose]] says why that matters.` },
        {
          symbols: [
            ['\\mathbf x', 'bold x', 'a vector: an ordered list of numbers', 'x = [3, 2]'],
            ['x_i', 'x sub i', 'its $i$-th entry', 'x[i - 1]'],
            ['\\mathbb R^n', 'R n', 'the set of all lists of $n$ real numbers', ''],
            ['\\mathbf x \\in \\mathbb R^n', 'x in R n', '$\\mathbf x$ has $n$ entries: its **dimension** is $n$', 'len(x) == n'],
          ],
        },
        { figure: 'VectorFig', props: { mode: 'one' }, caption: 'Drag the tip: the list and the arrow are the same thing.' },
        {
          choice: {
            prompt: 'A greyscale image is 28 × 28 pixels, each a brightness. As one vector, which space is it in?',
            options: [
              { text: '$\\mathbb R^{784}$', why: 'Yes: $28 \\times 28 = 784$ numbers in a row. That is how MNIST digits enter a simple network.' },
              { text: '$\\mathbb R^{28}$', why: '28 is one row of pixels; there are 28 rows.' },
              { text: '$\\mathbb R^2$', why: 'The image is a 2D picture, but its data is 784 separate numbers.' },
            ],
            answer: 0,
          },
        },
        { note: 'A **vector** is an ordered list $\\mathbf x = (x_1, \\dots, x_n) \\in \\mathbb R^n$; in 2D it is also a point and an arrow. Data, parameters and gradients are all vectors.' },
      ],
    },

    {
      id: 'vector-arithmetic', title: 'Adding and scaling arrows',
      goal: 'Add vectors, multiply them by numbers, and form a linear combination.',
      builds: ['vectors'],
      blocks: [
        { md: `Two operations, both done **entry by entry**:

- **Addition:** $(1, 2) + (3, -1) = (4, 1)$. As arrows: put the second arrow's tail on the first one's tip; the sum goes from the start to the end. Walking 1 east 2 north, then 3 east 1 south, is the same as walking 4 east 1 north.
- **Scaling:** $3 \\times (1, 2) = (3, 6)$. The arrow gets 3 times longer, same direction. A negative number flips it round. A plain number like 3 is called a **scalar** (it scales).

Put them together and you get a **linear combination**: $a\\,\\mathbf u + b\\,\\mathbf v$. Mixing two directions in different amounts reaches every point of the plane (unless the two arrows point along the same line). The gradient step $\\theta - \\eta \\nabla \\mathcal L$ of lesson [[#gradient-descent-2d]] is a linear combination: one vector plus $-\\eta$ times another.` },
        {
          code: {
            file: 'linalg.py', fn: 'add', notes: [
              ['def add(u, v):', ['Two lists of the same length.']],
              ['return [a + b for a, b in zip(u, v)]', ['`zip` pairs up matching entries; the list comprehension adds each pair.'], { tex: '(\\mathbf u + \\mathbf v)_i = u_i + v_i' }],
            ],
          },
        },
        {
          code: {
            file: 'linalg.py', fn: 'scale', notes: [
              ['def scale(c, v):', ['A number and a vector.']],
              ['return [c * a for a in v]', ['Multiply every entry.'], { tex: '(c\\mathbf v)_i = c\\,v_i' }],
            ],
          },
        },
        { figure: 'VectorFig', props: { mode: 'combine' }, caption: 'Drag $\\mathbf u$ and $\\mathbf v$, and choose the amounts $a$ and $b$: the violet arrow is $a\\mathbf u + b\\mathbf v$.' },
        {
          predict: {
            prompt: 'What is the second entry of $2(1, 3) - (4, 1)$?',
            answer: add(scale(2, [1, 3]), scale(-1, [4, 1]))[1], compute: () => add(scale(2, [1, 3]), scale(-1, [4, 1]))[1],
            explain: '$2(1, 3) = (2, 6)$; minus $(4, 1)$ gives $(-2, 5)$. Second entry: 5.',
          },
        },
        { note: 'Vectors add and scale entry by entry. $a\\mathbf u + b\\mathbf v$ is a **linear combination**. A gradient step is one.' },
      ],
    },

    {
      id: 'norm', title: 'Length and distance: the norm',
      goal: 'Compute $\\|\\mathbf x\\|$ with Pythagoras in any dimension, the distance between two vectors, and the L1 norm.',
      builds: ['vector-arithmetic', 'powers'],
      blocks: [
        { md: `How long is the arrow $(3, 4)$? It is the long side of a right-angled triangle with sides 3 and 4, so by **Pythagoras** its length is $\\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$. The same works in any number of dimensions: square every entry, add, take the square root.

$$\\|\\mathbf x\\| = \\sqrt{x_1^2 + x_2^2 + \\dots + x_n^2} = \\sqrt{\\sum_{i=1}^n x_i^2}$$

This is the **norm** (or the **L2 norm**, written $\\|\\mathbf x\\|_2$). The **distance** between two vectors is the length of their difference, $\\|\\mathbf u - \\mathbf v\\|$: how far apart two data points are, which is how nearest-neighbour methods and clustering decide what is similar.

Squared norms are everywhere in ML because the square root disappears: $\\|\\mathbf x\\|^2 = \\sum x_i^2$. The total squared error of a model is $\\|\\hat{\\mathbf y} - \\mathbf y\\|^2$, and the "weight decay" penalty of Part [[#part:part5]] is $\\lambda\\|\\mathbf w\\|^2$. The **L1 norm**, $\\|\\mathbf x\\|_1 = \\sum |x_i|$ (add up the absolute values: the distance a taxi drives on a grid), is the other common one.` },
        {
          code: {
            file: 'linalg.py', fn: 'norm', notes: [
              ['def norm(v):', ['The length of the arrow.']],
              ['s = 0.0', ['Sum of squares so far.']],
              ['for a in v:', ['Each entry…']],
              ['s += a * a', ['…squared, added.'], { tex: 's \\mathrel{+}= x_i^2' }],
              ['return math.sqrt(s)', ['Square root: back to the original units.'], { tex: '\\|\\mathbf x\\| = \\sqrt{\\textstyle\\sum_i x_i^2}', calc: q => [`√${f(q.s)}`, Math.sqrt(q.s)] }],
            ],
          },
        },
        { figure: 'NormFig', caption: 'The arrow\'s length is the hypotenuse of the triangle its entries make.' },
        {
          predict: {
            prompt: 'What is $\\|(1, 2, 2)\\|$?',
            answer: norm([1, 2, 2]), compute: () => norm([1, 2, 2]),
            explain: '$\\sqrt{1 + 4 + 4} = \\sqrt 9 = 3$.',
            misconceptions: [{ answer: 9, feedback: 'That is $\\|\\mathbf x\\|^2$. Take the square root.' }, { answer: 5, feedback: '$1 + 2 + 2$ is the L1 norm; the usual norm squares first.' }],
          },
        },
        {
          predict: {
            prompt: 'How far apart are the points $(1, 1)$ and $(4, 5)$?',
            answer: norm([3, 4]), compute: () => norm(add([4, 5], scale(-1, [1, 1]))),
            explain: 'Their difference is $(3, 4)$, of length 5.',
          },
        },
        { note: '$\\|\\mathbf x\\| = \\sqrt{\\sum x_i^2}$ (Pythagoras), distance $= \\|\\mathbf u - \\mathbf v\\|$, $\\|\\mathbf x\\|^2 = \\sum x_i^2$, $\\|\\mathbf x\\|_1 = \\sum|x_i|$.' },
      ],
    },

    {
      id: 'dot-product', title: 'The dot product: the most important operation in ML',
      goal: 'Compute $\\mathbf u \\cdot \\mathbf v$ as a weighted sum and as $\\|\\mathbf u\\|\\|\\mathbf v\\|\\cos\\theta$, and use cosine similarity.',
      builds: ['norm', 'sigma'],
      blocks: [
        { md: `Multiply matching entries and add:

$$\\mathbf u \\cdot \\mathbf v = \\sum_{i=1}^n u_i v_i = u_1v_1 + u_2v_2 + \\dots + u_nv_n$$

That's the **dot product**, and it gives one number. If $\\mathbf w$ holds weights and $\\mathbf x$ holds an example's measurements, $\\mathbf w \\cdot \\mathbf x$ is a **weighted sum**: price per m² times size, plus value per bedroom times bedrooms, and so on. Lesson [[#symbols-welcome]]'s model with many inputs is exactly

$$\\hat y = \\mathbf w \\cdot \\mathbf x + b$$

A single neuron computes a dot product. A layer computes many. Attention (Part [[#part:part5]]) is built from them.

The dot product also has a **geometric** meaning:

$$\\mathbf u \\cdot \\mathbf v = \\|\\mathbf u\\|\\,\\|\\mathbf v\\|\\cos\\theta$$

where $\\theta$ (theta) is the angle between the arrows. **What cos is:** walk 1 unit from the origin at angle $\\theta$ to the horizontal axis. How far across you are is $\\cos\\theta$; how far up is $\\sin\\theta$. So $\\cos 0 = 1$ (straight across), $\\cos 90° = 0$ (straight up), $\\cos 180° = -1$ (straight back). The walk had length 1, so by Pythagoras $\\cos^2\\theta + \\sin^2\\theta = 1$. Walk a length $L$ instead and you are $L\\cos\\theta$ across and $L\\sin\\theta$ up.

**Why the formula holds.** Work out $\\|\\mathbf u - \\mathbf v\\|^2$ two ways.

*By algebra:* $\\|\\mathbf u - \\mathbf v\\|^2 = \\sum_i (u_i - v_i)^2 = \\sum_i u_i^2 - 2\\sum_i u_i v_i + \\sum_i v_i^2 = \\|\\mathbf u\\|^2 + \\|\\mathbf v\\|^2 - 2\\,\\mathbf u\\cdot\\mathbf v$.

*By geometry:* the arrows $\\mathbf u$ and $\\mathbf v$ from the origin, and the gap $\\mathbf u - \\mathbf v$ between their tips, form a triangle (in any number of dimensions, two arrows lie in one flat plane). Lay $\\mathbf u$ along the horizontal. The tip of $\\mathbf v$ is then $\\|\\mathbf v\\|\\cos\\theta$ across and $\\|\\mathbf v\\|\\sin\\theta$ up, and the tip of $\\mathbf u$ is $\\|\\mathbf u\\|$ across and 0 up. Pythagoras on the gap between the tips:

$$\\|\\mathbf u - \\mathbf v\\|^2 = (\\|\\mathbf u\\| - \\|\\mathbf v\\|\\cos\\theta)^2 + (\\|\\mathbf v\\|\\sin\\theta)^2 = \\|\\mathbf u\\|^2 - 2\\|\\mathbf u\\|\\|\\mathbf v\\|\\cos\\theta + \\|\\mathbf v\\|^2(\\cos^2\\theta + \\sin^2\\theta)$$

and the last bracket is 1. (This is the "law of cosines".) The two answers must agree, and comparing them term by term leaves $\\mathbf u\\cdot\\mathbf v = \\|\\mathbf u\\|\\|\\mathbf v\\|\\cos\\theta$.

So the dot product measures **how much two vectors point the same way**, times their lengths. In particular **$\\mathbf u \\cdot \\mathbf v = 0$ exactly when the arrows are at right angles** (for nonzero arrows). Dividing out the lengths leaves the **cosine similarity**, used to compare word embeddings and documents: 1 means the same direction, 0 unrelated.

(This finishes lesson [[#gradient]]'s argument in vector language. A small step $\\mathbf d$ changes $f$ by about $\\nabla f \\cdot \\mathbf d = \\|\\nabla f\\|\\|\\mathbf d\\|\\cos\\theta$, biggest when $\\theta = 0$, so uphill is along $\\nabla f$. Along a contour the change is 0, so the step is at right angles to $\\nabla f$.)` },
        {
          code: {
            file: 'linalg.py', fn: 'dot', notes: [
              ['def dot(u, v):', ['Two vectors of the same length.']],
              ['s = 0.0', ['Running total.']],
              ['for a, b in zip(u, v):', ['Matching entries, in pairs.']],
              ['s += a * b', ['Their product, added.'], { tex: 's \\mathrel{+}= u_i v_i' }],
              ['return s', ['$\\mathbf u \\cdot \\mathbf v$.']],
            ],
          },
        },
        {
          code: {
            file: 'linalg.py', fn: 'cosine', notes: [
              ['def cosine(u, v):', ['How aligned two vectors are.']],
              ['return dot(u, v) / (norm(u) * norm(v))', ['Rearranged from $\\mathbf u\\cdot\\mathbf v = \\|\\mathbf u\\|\\|\\mathbf v\\|\\cos\\theta$.'], { tex: '\\cos\\theta = \\frac{\\mathbf u\\cdot\\mathbf v}{\\|\\mathbf u\\|\\|\\mathbf v\\|}' }],
            ],
          },
        },
        { figure: 'DotFig', caption: 'Drag both arrows. The shadow of one on the other, times the other\'s length, is the dot product.' },
        {
          predict: {
            prompt: 'What is $(1, 2, 3) \\cdot (4, -5, 6)$?',
            answer: dot([1, 2, 3], [4, -5, 6]), compute: () => dot([1, 2, 3], [4, -5, 6]),
            explain: '$4 - 10 + 18 = 12$.',
          },
        },
        {
          predict: {
            prompt: 'Cosine similarity of $(1, 2)$ and $(2, 1)$?',
            answer: cosine([1, 2], [2, 1]), tolerance: 1e-9, compute: () => cosine([1, 2], [2, 1]),
            explain: 'Dot product $2 + 2 = 4$; both lengths $\\sqrt5$; $4 / 5 = 0.8$. Quite similar directions.',
          },
        },
        {
          choice: {
            prompt: 'Two vectors have dot product 0. What does that tell you?',
            options: [
              { text: 'They are at right angles (perpendicular), or one is zero', why: 'Yes. $\\cos 90° = 0$. In ML terms: they share nothing in common direction.' },
              { text: 'They are the same vector', why: 'A vector dotted with itself is $\\|\\mathbf v\\|^2$, which is positive unless $\\mathbf v = 0$.' },
            ],
            answer: 0,
          },
        },
        { note: '$\\mathbf u\\cdot\\mathbf v = \\sum u_iv_i = \\|\\mathbf u\\|\\|\\mathbf v\\|\\cos\\theta$: a weighted sum, and a measure of alignment. A neuron is $\\mathbf w\\cdot\\mathbf x + b$.' },
      ],
    },

    {
      id: 'matrices', title: 'Matrices: many dot products at once',
      goal: 'Read a matrix\'s shape and entries $A_{ij}$, and compute $A\\mathbf x$ row by row, as one layer of a neural network.',
      builds: ['dot-product'],
      blocks: [
        { md: `A **matrix** is a table of numbers with $m$ rows and $n$ columns: an $m \\times n$ matrix, $A \\in \\mathbb R^{m \\times n}$. Entry $A_{ij}$ is in row $i$, column $j$ (row first, always).

$$A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 3 \\end{pmatrix}, \\quad A_{12} = 1, \\; A_{22} = 3$$

Multiplying a matrix by a vector, $A\\mathbf x$, takes the **dot product of each row with $\\mathbf x$**:

$$A\\mathbf x = \\begin{pmatrix} 2 & 1 \\\\ 1 & 3 \\end{pmatrix}\\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix} = \\begin{pmatrix} 2\\cdot 3 + 1\\cdot 4 \\\\ 1\\cdot 3 + 3\\cdot 4 \\end{pmatrix} = \\begin{pmatrix} 10 \\\\ 15 \\end{pmatrix}$$

In symbols, $(A\\mathbf x)_i = \\sum_j A_{ij} x_j$. The shapes must fit: an $m \\times n$ matrix needs an $n$-entry vector, and gives back $m$ entries.

Now the payoff. A layer of $m$ neurons, each with its own weight vector over $n$ inputs, is $m$ dot products: stack the weight vectors as the rows of a matrix $W$, and the whole layer is

$$\\mathbf z = W\\mathbf x + \\mathbf b$$

That is why neural networks are "matrix multiplications": each layer is one.` },
        {
          code: {
            file: 'linalg.py', fn: 'matvec', notes: [
              ['def matvec(A, x):', ['`A` is a list of rows; each row is a list.']],
              ['return [dot(row, x) for row in A]', ['One dot product per row.'], { tex: '(A\\mathbf x)_i = \\sum_j A_{ij}x_j' }],
            ],
          },
        },
        { figure: 'MatVecFig', caption: 'Each output entry is one row of $A$ dotted with $\\mathbf x$. Pick a row to see its products; edit the numbers.' },
        {
          symbols: [
            ['A \\in \\mathbb R^{m\\times n}', 'A in R m by n', 'a table of $m$ rows and $n$ columns', 'A = [[…], …]'],
            ['A_{ij}', 'A i j', 'the entry in row $i$, column $j$', 'A[i - 1][j - 1]'],
            ['A\\mathbf x', 'A x', 'each row of $A$ dotted with $\\mathbf x$: a new vector', 'matvec(A, x)'],
            ['W\\mathbf x + \\mathbf b', 'W x plus b', 'a layer of neurons before its activation', 'layer(W, b, x)'],
          ],
        },
        {
          predict: {
            prompt: 'With $A$ as above, what is the second entry of $A\\,(1, -1)$?',
            answer: matvec(A, [1, -1])[1], compute: () => matvec(A, [1, -1])[1],
            explain: 'Row 2 is $(1, 3)$: $1 \\times 1 + 3 \\times (-1) = -2$.',
          },
        },
        {
          choice: {
            prompt: 'A layer maps 784 inputs to 128 neurons. What shape is $W$?',
            options: [
              { text: '$128 \\times 784$', why: 'Yes: one row of 784 weights per neuron. $W\\mathbf x$ then gives 128 numbers.' },
              { text: '$784 \\times 128$', why: 'Then $W\\mathbf x$ would need a 128-entry input. Rows are outputs, columns are inputs. (Some libraries store the transpose; lesson [[#transpose]].)' },
            ],
            answer: 0,
          },
        },
        { note: 'An $m\\times n$ matrix times an $n$-vector gives an $m$-vector: $(A\\mathbf x)_i = \\sum_j A_{ij}x_j$, one dot product per row. A layer is $W\\mathbf x + \\mathbf b$.' },
      ],
    },

    {
      id: 'transformations', title: 'Matrices move space',
      goal: 'See a $2\\times2$ matrix as a transformation of the plane, and read its columns as where the axes land.',
      builds: ['matrices'],
      blocks: [
        { md: `A matrix doesn't just turn one vector into another: it moves **every** point of the plane at once. Feed in a whole grid and watch where it goes: it may stretch, squash, rotate, shear or flip, but straight lines stay straight and the origin stays put. That is what "linear" means.

The secret to reading a matrix: its **columns are where the axes land**. $A\\,(1, 0)$ is the first column, and $A\\,(0, 1)$ is the second. Any other vector $(x, y) = x(1,0) + y(0,1)$ lands at $x \\times$ (column 1) $+ \\,y \\times$ (column 2): a linear combination of the columns.

- $\\begin{pmatrix} 2 & 0 \\\\ 0 & 1 \\end{pmatrix}$ stretches across by 2.
- $\\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix}$ rotates by 90°.
- $\\begin{pmatrix} 1 & 1 \\\\ 0 & 1 \\end{pmatrix}$ shears: slides each row sideways by its height.

A neural network's layers are transformations like these, followed by a bend (the activation), repeated. Stretching and folding space until the classes are easy to separate is, geometrically, what a network learns to do.` },
        { figure: 'TransformFig', caption: 'Choose a matrix or set its four entries. The grid, the unit square and the two axis arrows move together.' },
        {
          predict: {
            prompt: 'The matrix $\\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix}$ rotates by 90°. Where does $(3, 1)$ go? Give the **first** entry.',
            answer: matvec([[0, -1], [1, 0]], [3, 1])[0], compute: () => matvec([[0, -1], [1, 0]], [3, 1])[0],
            explain: '$(0 \\cdot 3 - 1 \\cdot 1,\\; 1 \\cdot 3 + 0 \\cdot 1) = (-1, 3)$: a quarter turn anticlockwise.',
          },
        },
        { note: 'A matrix transforms the whole space linearly: lines stay lines, the origin stays. Its **columns** are the images of the axis arrows.' },
      ],
    },

    {
      id: 'matrix-multiplication', title: 'Matrix times matrix: one after another',
      goal: 'Multiply two matrices row-by-column, check shapes, and explain why $AB \\ne BA$.',
      builds: ['transformations'],
      blocks: [
        { md: `Do transformation $B$, then transformation $A$. The combined move is again a matrix, written $AB$ (read right to left: $B$ acts first, as in $A(B\\mathbf x)$). Here is where its entries come from. Let $\\mathbf u = B\\mathbf x$. Each entry of $\\mathbf u$ is a row of $B$ dotted with $\\mathbf x$: $u_k = \\sum_j B_{kj}x_j$. Then $A$ acts on $\\mathbf u$: entry $i$ of the result is $\\sum_k A_{ik}u_k$. Substitute and regroup by $x_j$:

$$\\big(A(B\\mathbf x)\\big)_i = \\sum_k A_{ik}\\sum_j B_{kj}x_j = \\sum_j \\Big(\\sum_k A_{ik}B_{kj}\\Big)\\,x_j$$

(the regrouping is just adding the same products in a different order). The bracket is one fixed number for each pair $(i, j)$, so "do $B$, then $A$" is itself a matrix acting on $\\mathbf x$, with entries

$$(AB)_{ij} = \\sum_k A_{ik} B_{kj} = (\\text{row } i \\text{ of } A) \\cdot (\\text{column } j \\text{ of } B)$$

Equivalently, column $j$ of $AB$ is $A$ applied to column $j$ of $B$: where $B$ sends axis $j$, then moved on by $A$.

**Shapes:** an $m\\times n$ times an $n \\times p$ gives $m \\times p$. The inside numbers must match ($n$); the outside ones give the result.

**Order matters:** rotating then stretching is not the same as stretching then rotating, so in general $AB \\ne BA$. With $A = \\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}$ and $B = \\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}$ (which swaps the two coordinates), $AB$ swaps $A$'s columns but $BA$ swaps its rows.

A network applies $W_1$, then a bend, then $W_2$… If there were no bends, $W_2W_1$ would be **one** matrix: two linear layers are no more powerful than one. The activation functions between layers are what make depth useful.` },
        {
          code: {
            file: 'linalg.py', fn: 'matmul', notes: [
              ['def matmul(A, B):', ['$A$ is $m \\times n$, $B$ is $n \\times p$.']],
              ['columns = transpose(B)', ['$B$\'s columns, as rows (lesson [[#transpose]]), so each can be dotted.']],
              ['return [[dot(row, col) for col in columns] for row in A]', ['Row $i$ of $A$ dotted with column $j$ of $B$, for every $i$ and $j$: a list comprehension inside a list comprehension.'], { tex: '(AB)_{ij} = \\sum_k A_{ik}B_{kj}' }],
            ],
          },
        },
        { figure: 'MatMulFig', caption: 'Click an entry of the product: the row and column that make it light up.' },
        {
          predict: {
            prompt: 'With $A$ and $B$ above, what is the top-left entry of $AB$?',
            answer: matmul([[1, 2], [3, 4]], [[0, 1], [1, 0]])[0][0], compute: () => matmul([[1, 2], [3, 4]], [[0, 1], [1, 0]])[0][0],
            explain: 'Row 1 of $A$ is $(1, 2)$, column 1 of $B$ is $(0, 1)$: $0 + 2 = 2$.',
          },
        },
        {
          predict: {
            prompt: 'And the top-left entry of $BA$?',
            answer: matmul([[0, 1], [1, 0]], [[1, 2], [3, 4]])[0][0], compute: () => matmul([[0, 1], [1, 0]], [[1, 2], [3, 4]])[0][0],
            explain: 'Row 1 of $B$ is $(0, 1)$, column 1 of $A$ is $(1, 3)$: 3. Different: order matters.',
          },
        },
        { note: '$(AB)_{ij}$ = row $i$ of $A$ · column $j$ of $B$. $(m\\times n)(n\\times p) = m\\times p$. $AB$ means $B$ first, then $A$, and usually $AB \\ne BA$.' },
      ],
    },

    {
      id: 'transpose', title: 'The transpose: rows become columns',
      goal: 'Transpose a matrix, write the dot product as $\\mathbf u^\\top\\mathbf v$, and use $(AB)^\\top = B^\\top A^\\top$.',
      builds: ['matrix-multiplication'],
      blocks: [
        { md: `The **transpose** $A^\\top$ ("A transpose") flips a matrix across its diagonal: row $i$ becomes column $i$, so $(A^\\top)_{ij} = A_{ji}$. A $2\\times3$ matrix becomes $3\\times2$.

Why papers are full of ⊤: if vectors are columns ($n\\times1$ matrices), then $\\mathbf u^\\top$ is a row ($1\\times n$), and the matrix product $\\mathbf u^\\top \\mathbf v$ is $(1\\times n)(n \\times 1) = 1\\times1$: one number, the **dot product**. So you will see a neuron written as

$$\\hat y = \\mathbf w^\\top \\mathbf x + b$$

which is lesson [[#dot-product]]'s $\\mathbf w\\cdot\\mathbf x + b$ in matrix clothes. (The other order, $\\mathbf u\\mathbf v^\\top$, is $(n\\times1)(1\\times n)$: a whole $n\\times n$ table, the **outer product**. Backpropagation's weight gradients are outer products, Part [[#part:part5]].)

One rule to remember: $(AB)^\\top = B^\\top A^\\top$; transposing reverses the order. Check it entry by entry, using only "transposing swaps the two indices" and the multiplication rule:

$$\\big((AB)^\\top\\big)_{ij} = (AB)_{ji} = \\sum_k A_{jk}B_{ki} = \\sum_k (B^\\top)_{ik}(A^\\top)_{kj} = (B^\\top A^\\top)_{ij}$$

(the middle step only swaps the order of each product, $A_{jk}B_{ki} = B_{ki}A_{jk}$, and renames each entry by its transpose). Every entry agrees, so the matrices are equal. The shapes demand it too: if $A$ is $m\\times n$ and $B$ is $n\\times p$, then $(AB)^\\top$ is $p\\times m$, and only $B^\\top$ ($p\\times n$) times $A^\\top$ ($n\\times m$) has that shape. And a matrix with $A^\\top = A$ is **symmetric**, like our $\\begin{pmatrix}2&1\\\\1&3\\end{pmatrix}$; covariance matrices (Part [[#part:part4]]) always are.` },
        {
          code: {
            file: 'linalg.py', fn: 'transpose', notes: [
              ['def transpose(A):', ['Rows become columns.']],
              ['return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]', ['New row $j$ is old column $j$: entry $A_{ij}$ for every row $i$.'], { tex: '(A^\\top)_{ji} = A_{ij}' }],
            ],
          },
        },
        {
          predict: {
            prompt: '$A = \\begin{pmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\end{pmatrix}$. What is the entry in row 3, column 2 of $A^\\top$?',
            answer: transpose([[1, 2, 3], [4, 5, 6]])[2][1], compute: () => transpose([[1, 2, 3], [4, 5, 6]])[2][1],
            explain: '$(A^\\top)_{32} = A_{23} = 6$.',
          },
        },
        { note: '$(A^\\top)_{ij} = A_{ji}$. $\\mathbf u^\\top\\mathbf v$ is the dot product; $\\mathbf u\\mathbf v^\\top$ is the outer product. $(AB)^\\top = B^\\top A^\\top$.' },
      ],
    },

    {
      id: 'inverse', title: 'Undoing a matrix: the inverse and the determinant',
      goal: 'Use the identity and the inverse, compute a $2\\times2$ determinant and inverse, and say when no inverse exists.',
      builds: ['transpose'],
      blocks: [
        { md: `The **identity** matrix $I$ (ones on the diagonal, zeros elsewhere) does nothing: $I\\mathbf x = \\mathbf x$. It plays the role of the number 1.

The **inverse** $A^{-1}$ undoes $A$: $A^{-1}A = AA^{-1} = I$. If $A$ rotates by 30°, $A^{-1}$ rotates back. For a $2\\times2$ matrix there is a formula:

$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}^{-1} = \\frac{1}{ad - bc}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}$$

Swap the diagonal, negate the other two, divide by $ad - bc$. Don't take that on trust; multiply it out:

$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix} = \\begin{pmatrix} ad - bc & -ab + ba \\\\ cd - dc & -cb + da \\end{pmatrix} = (ad - bc)\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}$$

so dividing by $ad - bc$ leaves exactly $I$. That number is the **determinant**, $\\det A$, and it is how much $A$ scales **area**. The unit square's sides, the two axes, land on the columns $(a, c)$ and $(b, d)$, so the square becomes the parallelogram they span. Picture the usual case, all four numbers positive with $(a, c)$ the lower arrow: the parallelogram sits inside a rectangle $a + b$ wide and $c + d$ tall. Cut away the corners: two triangles of area $\\frac12 ac$, two of area $\\frac12 bd$, and two small rectangles $b \\times c$. What's left is

$$(a + b)(c + d) - ac - bd - 2bc = ad - bc$$

In other arrangements the same bookkeeping gives $ad - bc$ up to sign: a negative determinant means the transformation flips the plane over, like a mirror, and the area is $|\\det A|$. (The polygon-area exercise below checks this numerically for several matrices.)

If $\\det A = 0$, $A$ squashes the whole plane onto a line (or a point). Then many points land in the same place, and nothing can undo it: **no inverse**. The matrix is called **singular**. In ML this happens when features are redundant (one input is a multiple of another), and it is one reason Part [[#part:part5]] adds regularisation.` },
        {
          code: {
            file: 'linalg.py', fn: 'det2', notes: [
              ['def det2(A):', ['A 2×2 matrix.']],
              ['return A[0][0] * A[1][1] - A[0][1] * A[1][0]', ['$ad - bc$.'], { tex: '\\det A = ad - bc' }],
            ],
          },
        },
        {
          code: {
            file: 'linalg.py', fn: 'inverse2', notes: [
              ['def inverse2(A):', ['Only works when the determinant isn\'t 0.']],
              ['d = det2(A)', ['$ad - bc$.']],
              ['return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]]', ['Swap $a$ and $d$, negate $b$ and $c$, divide everything by $d$.'], { tex: 'A^{-1} = \\frac{1}{ad-bc}\\begin{pmatrix} d & -b \\\\ -c & a\\end{pmatrix}' }],
            ],
          },
        },
        { figure: 'TransformFig', props: { showInverse: true }, caption: 'The unit square\'s area changes by the determinant. Make the determinant 0 and watch the plane collapse onto a line.' },
        {
          predict: {
            prompt: 'What is $\\det\\begin{pmatrix} 2 & 1 \\\\ 1 & 3 \\end{pmatrix}$?',
            answer: det2(A), compute: () => det2(A),
            explain: '$2 \\times 3 - 1 \\times 1 = 5$: areas grow 5 times.',
          },
        },
        {
          predict: {
            prompt: 'And the top-left entry of its inverse?',
            answer: inverse2(A)[0][0], tolerance: 1e-9, compute: () => inverse2(A)[0][0],
            explain: '$d / \\det = 3 / 5 = 0.6$.',
          },
        },
        { note: '$I$ does nothing; $A^{-1}$ undoes $A$. $\\det A = ad - bc$ is the area scale. $\\det A = 0$: the plane collapses, no inverse.' },
      ],
    },

    {
      id: 'systems', title: 'Solving equations with matrices',
      goal: 'Write simultaneous equations as $A\\mathbf x = \\mathbf b$ and solve them with $\\mathbf x = A^{-1}\\mathbf b$.',
      builds: ['inverse'],
      blocks: [
        { md: `Two mystery numbers: twice the first plus the second is 3, and the first plus three times the second is 5.

$$2x_1 + x_2 = 3, \\qquad x_1 + 3x_2 = 5$$

The left sides are a matrix times a vector, so the whole puzzle is $A\\mathbf x = \\mathbf b$ with our familiar $A$ and $\\mathbf b = (3, 5)$. Multiply both sides by $A^{-1}$:

$$\\mathbf x = A^{-1}\\mathbf b$$

Geometrically: each equation is a line in the plane, and the solution is where they cross. If the lines are parallel ($\\det A = 0$), there is either no solution or infinitely many: the singular case again.

(Real software never forms $A^{-1}$ for big systems; it solves more cleverly. But the meaning is the same.)` },
        {
          code: {
            file: 'linalg.py', fn: 'solve2', notes: [
              ['def solve2(A, b):', ['Find $\\mathbf x$ with $A\\mathbf x = \\mathbf b$.']],
              ['return matvec(inverse2(A), b)', ['$A^{-1}\\mathbf b$.'], { tex: '\\mathbf x = A^{-1}\\mathbf b' }],
            ],
          },
        },
        { figure: 'SystemFig', caption: 'Each equation is a line; the solution is where they cross. Change the numbers.' },
        {
          predict: {
            prompt: 'Solve $2x_1 + x_2 = 3$, $x_1 + 3x_2 = 5$. What is $x_2$?',
            answer: solve2(A, [3, 5])[1], tolerance: 1e-9, compute: () => solve2(A, [3, 5])[1],
            explain: `$A^{-1}\\mathbf b = (0.6 \\cdot 3 - 0.2 \\cdot 5,\\; -0.2\\cdot3 + 0.4\\cdot5) = (0.8, 1.4)$. Check: $2(0.8) + 1.4 = 3$ ✓.`,
          },
        },
        { note: 'Simultaneous linear equations are $A\\mathbf x = \\mathbf b$, solved by $\\mathbf x = A^{-1}\\mathbf b$: where the lines (or planes) meet.' },
      ],
    },

    {
      id: 'least-squares', title: 'Least squares: the best answer to an impossible question',
      goal: 'Derive the normal equation $X^\\top X\\boldsymbol\\theta = X^\\top\\mathbf y$ and use it to fit a line through points no line passes through.',
      builds: ['systems', 'minimum'],
      blocks: [
        { md: `Three data points: $(0, 1)$, $(1, 3)$, $(2, 4)$. We want a line $y = wx + c$ through all three. That's three equations in two unknowns:

$$\\underbrace{\\begin{pmatrix} 0 & 1 \\\\ 1 & 1 \\\\ 2 & 1 \\end{pmatrix}}_{X} \\begin{pmatrix} w \\\\ c \\end{pmatrix} = \\underbrace{\\begin{pmatrix} 1 \\\\ 3 \\\\ 4 \\end{pmatrix}}_{\\mathbf y}$$

(Each row of $X$ is one point's $x$ with a 1 for the intercept.) The points aren't on one line, so there is no exact answer. Settle for the **best**: the $\\boldsymbol\\theta = (w, c)$ making the total squared miss smallest,

$$\\min_{\\boldsymbol\\theta}\\; \\|X\\boldsymbol\\theta - \\mathbf y\\|^2$$

Why the answer looks the way it does, geometrically: $X\\boldsymbol\\theta$ can only reach a flat slice of all possible 3-entry vectors (the combinations of $X$'s two columns). The closest point of that slice to $\\mathbf y$ is straight "below" it: the one where the miss is at right angles to the slice. Why closest? Suppose $\\mathbf p$ is a point of the slice whose miss $\\mathbf r = \\mathbf y - \\mathbf p$ is at right angles to every arrow lying in the slice, and $\\mathbf q$ is any other point of the slice. The arrow $\\mathbf s = \\mathbf p - \\mathbf q$ lies in the slice, so $\\mathbf r\\cdot\\mathbf s = 0$, and

$$\\|\\mathbf y - \\mathbf q\\|^2 = \\|\\mathbf r + \\mathbf s\\|^2 = \\|\\mathbf r\\|^2 + 2\\,\\mathbf r\\cdot\\mathbf s + \\|\\mathbf s\\|^2 = \\|\\mathbf r\\|^2 + \\|\\mathbf s\\|^2 \\ge \\|\\mathbf r\\|^2$$

(Pythagoras, in the dot-product form of lesson [[#dot-product]]). Every other point is at least as far away. So at the best $\\boldsymbol\\theta$ the miss $X\\boldsymbol\\theta - \\mathbf y$ is at right angles to both columns of $X$ (every arrow in the slice is a combination of them): its dot product with each column is 0. Writing "each column dotted with the miss is 0" as one matrix equation (lesson [[#transpose]]):

$$X^\\top(X\\boldsymbol\\theta - \\mathbf y) = \\mathbf 0 \\quad\\Longrightarrow\\quad X^\\top X\\,\\boldsymbol\\theta = X^\\top\\mathbf y$$

These are the **normal equations** ("normal" means perpendicular). $X^\\top X$ is a small square matrix ($2\\times2$ here, whatever the number of points), so we can solve it with lesson [[#systems]]: $\\boldsymbol\\theta = (X^\\top X)^{-1}X^\\top\\mathbf y$. Lesson [[#matrix-gradients]] reaches the same equation with calculus, and Part [[#part:part5]] recognises it as linear regression.` },
        {
          code: {
            file: 'linalg.py', fn: 'least_squares', notes: [
              ['def least_squares(xs, ys):', ['Points $(x_i, y_i)$; returns slope and intercept.']],
              ['X = [[x, 1.0] for x in xs]', ['One row per point: its $x$, and a 1 that multiplies the intercept.']],
              ['Xt = transpose(X)', ['$X^\\top$.']],
              ['return solve2(matmul(Xt, X), matvec(Xt, ys))', ['Solve $X^\\top X\\boldsymbol\\theta = X^\\top\\mathbf y$ for $\\boldsymbol\\theta = (w, c)$.'], { tex: '\\boldsymbol\\theta = (X^\\top X)^{-1}X^\\top\\mathbf y' }],
            ],
          },
        },
        { figure: 'LeastSquaresFig', caption: 'Drag the points. The line is the least-squares fit; the squares are the squared misses it makes as small as possible in total.' },
        {
          predict: {
            prompt: 'For the points $(0, 1)$, $(1, 3)$, $(2, 4)$, what is the slope $w$ of the least-squares line?',
            answer: leastSquares([0, 1, 2], [1, 3, 4])[0], tolerance: 1e-9, compute: () => leastSquares([0, 1, 2], [1, 3, 4])[0],
            explain: `$X^\\top X = \\begin{pmatrix}5&3\\\\3&3\\end{pmatrix}$, $X^\\top\\mathbf y = (11, 8)$; solving gives $w = 1.5$, $c = ${f(leastSquares([0, 1, 2], [1, 3, 4])[1])}$.`,
          },
        },
        { note: 'Too many equations: minimise $\\|X\\boldsymbol\\theta - \\mathbf y\\|^2$. The best $\\boldsymbol\\theta$ makes the miss perpendicular to $X$\'s columns: $X^\\top X\\boldsymbol\\theta = X^\\top\\mathbf y$.' },
      ],
    },

    {
      id: 'eigenvectors', title: 'Eigenvectors: directions a matrix only stretches',
      goal: 'Find the eigenvalues and eigenvectors of a $2\\times2$ matrix from $\\det(A - \\lambda I) = 0$, and say what they mean.',
      builds: ['least-squares'],
      blocks: [
        { md: `Most vectors get **turned** by a matrix: lesson [[#transformations]]'s grid showed arrows pointing new ways. But some special directions only get **stretched** (or shrunk, or flipped): the matrix sends the arrow to a multiple of itself.

$$A\\mathbf v = \\lambda\\mathbf v$$

$\\mathbf v$ is an **eigenvector** ("own vector", from German) and $\\lambda$ (lambda) its **eigenvalue**: the stretch factor. They are the matrix's natural axes. Along them, a complicated transformation is just multiplication by a number.

How to find them: $A\\mathbf v = \\lambda\\mathbf v$ means $(A - \\lambda I)\\mathbf v = \\mathbf 0$. For a non-zero $\\mathbf v$ to be squashed to zero, $A - \\lambda I$ must collapse the plane, so its determinant is 0:

$$\\det(A - \\lambda I) = (a - \\lambda)(d - \\lambda) - bc = 0$$

a quadratic in $\\lambda$. For $A = \\begin{pmatrix}2&1\\\\1&3\\end{pmatrix}$: $\\lambda^2 - 5\\lambda + 5 = 0$, so $\\lambda = \\frac{5 \\pm \\sqrt5}{2}$: ${f(eigen2(A)[0])}$ and ${f(eigen2(A)[1])}$. Then each $\\mathbf v$ comes from $(A - \\lambda I)\\mathbf v = \\mathbf 0$.

Where ML uses them: **PCA** (Part [[#part:part4]]) finds the directions in which data varies most, and they are the eigenvectors of the covariance matrix. Eigenvalues also govern gradient descent. Take lesson [[#gradient-descent-2d]]'s kind of bowl, $\\mathcal L = \\frac12(\\lambda_1 a^2 + \\lambda_2 b^2)$, whose curvature matrix is $\\begin{pmatrix}\\lambda_1&0\\\\0&\\lambda_2\\end{pmatrix}$, with eigenvalues $\\lambda_1, \\lambda_2$ along the two axes. Its partial derivatives are $\\lambda_1 a$ and $\\lambda_2 b$, so one step of gradient descent is

$$a \\leftarrow a - \\eta\\lambda_1 a = (1 - \\eta\\lambda_1)\\,a, \\qquad b \\leftarrow (1 - \\eta\\lambda_2)\\,b$$

Each step multiplies the distance along eigenvector $i$ by $1 - \\eta\\lambda_i$. Repeated multiplication shrinks toward 0 only if that factor lies strictly between $-1$ and $1$, which means $0 < \\eta < 2/\\lambda_i$. Past $1/\\lambda_i$ the factor is negative: each step overshoots to the other side, the zig-zag in lesson [[#gradient-descent-2d]]'s figure. Past $2/\\lambda_i$ the overshoots grow and it diverges. Every direction must shrink, so **the learning rate must be below 2 ÷ the largest eigenvalue**, and the smallest eigenvalue sets how slowly the gentle direction converges.

**What this took on trust:** a tilted bowl's curvature matrix is symmetric, and a symmetric matrix always has eigenvectors at right angles to each other (the *spectral theorem*). So rotating your view to line up with them turns every bowl into this axis-aligned one. The 2×2 case is lesson [[#pca]]'s picture; the general proof comes in the linear-algebra additions.` },
        {
          code: {
            file: 'linalg.py', fn: 'eigen2', notes: [
              ['def eigen2(A):', ['For a symmetric 2×2 matrix the roots are always real.']],
              ['trace = A[0][0] + A[1][1]', ['$a + d$, the **trace**.']],
              ['d = det2(A)', ['$ad - bc$.']],
              ['root = math.sqrt(trace * trace / 4 - d)', ['$\\det(A - \\lambda I) = \\lambda^2 - (\\text{trace})\\lambda + \\det A$; the quadratic formula\'s square root.'], { tex: '\\sqrt{(\\mathrm{tr}/2)^2 - \\det A}' }],
              ['return trace / 2 + root, trace / 2 - root', ['The two eigenvalues.'], { tex: '\\lambda = \\tfrac{\\mathrm{tr}}{2} \\pm \\sqrt{\\cdots}' }],
            ],
          },
        },
        {
          code: {
            file: 'linalg.py', fn: 'eigenvector2', notes: [
              ['def eigenvector2(A, lam):', ['The direction for eigenvalue `lam`.']],
              ['if abs(A[0][1]) > 1e-12:', ['The usual case.'], { logic: 'the off-diagonal entry b is not zero' }],
              ['v = [A[0][1], lam - A[0][0]]', ['The first row of $(A - \\lambda I)\\mathbf v = 0$ reads $(a - \\lambda)v_1 + bv_2 = 0$; $\\mathbf v = (b, \\lambda - a)$ solves it.']],
              ['v = [1.0, 0.0] if abs(lam - A[0][0]) < 1e-12 else [0.0, 1.0]', ['A diagonal matrix: the eigenvectors are the axes.']],
              ['return scale(1 / norm(v), v)', ['Scaled to length 1: only the direction matters.']],
            ],
          },
        },
        { figure: 'EigenFig', caption: 'Drag the arrow round. Usually $A\\mathbf v$ (violet) points elsewhere; along an eigenvector it lies on the same line.' },
        { python: { program: 'linalg', label: 'Run Part [[#part:part3]]\'s operations in real Python' } },
        {
          code: {
            file: 'linalg.py', fn: 'show_linalg', notes: [
              ['def show_linalg():', ['What the Python tab runs.']],
              ['u, v = [3.0, 4.0], [4.0, -3.0]', ['Two vectors at right angles.']],
              ['print("u + v:", add(u, v), " ‖u‖:", norm(u), " u·v:", dot(u, v))', ['Lessons [[#vector-arithmetic]]–[[#dot-product]].']],
              ['A = [[2.0, 1.0], [1.0, 3.0]]', ['The part\'s matrix.']],
              ['print("A u:", matvec(A, u), " det A:", det2(A), " A⁻¹:", inverse2(A))', ['Lessons [[#matrices]] and [[#inverse]].']],
              ['print("best line through (0,1), (1,3), (2,4):", least_squares([0, 1, 2], [1, 3, 4]))', ['Lesson [[#least-squares]].']],
              ['print("eigenvalues of A:", eigen2(A))', ['This lesson.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the larger eigenvalue of $\\begin{pmatrix}2&1\\\\1&3\\end{pmatrix}$? (3 decimals)',
            answer: eigen2(A)[0], tolerance: 0.0006, compute: () => eigen2(A)[0],
            explain: '$\\frac{5 + \\sqrt5}{2} \\approx 3.618$.',
          },
        },
        {
          predict: {
            prompt: 'What are the eigenvalues of $\\begin{pmatrix}3&0\\\\0&5\\end{pmatrix}$? Give the larger.',
            answer: 5, compute: () => eigen2([[3, 0], [0, 5]])[0],
            explain: 'A diagonal matrix just stretches each axis: by 3 and by 5. The axes are its eigenvectors.',
          },
        },
        { note: '$A\\mathbf v = \\lambda\\mathbf v$: along an eigenvector, the matrix only stretches, by its eigenvalue λ. Find λ from $\\det(A - \\lambda I) = 0$.' },
      ],
    },

    {
      id: 'matrix-gradients', title: 'Gradients of vector expressions',
      goal: 'Derive $\\nabla_{\\mathbf w}(\\mathbf w^\\top\\mathbf x) = \\mathbf x$ and $\\nabla_{\\boldsymbol\\theta}\\|X\\boldsymbol\\theta - \\mathbf y\\|^2 = 2X^\\top(X\\boldsymbol\\theta - \\mathbf y)$ from partial derivatives.',
      builds: ['eigenvectors', 'gradient'],
      blocks: [
        { md: `Papers write gradients of whole vector expressions in one line. Every one of them is just lesson [[#partial-derivatives]]'s partial derivatives, one per entry, collected into a vector. Two that come up constantly:

**1. A dot product.** $f(\\mathbf w) = \\mathbf w^\\top\\mathbf x = w_1x_1 + w_2x_2 + \\dots$. The partial derivative with respect to $w_j$ treats every other $w$ as fixed, leaving just $x_j$. Collect them:

$$\\nabla_{\\mathbf w}\\,(\\mathbf w^\\top\\mathbf x) = \\mathbf x$$

The gradient of a neuron's output with respect to its weights is its input.

**2. A squared error.** $L(\\boldsymbol\\theta) = \\|X\\boldsymbol\\theta - \\mathbf y\\|^2 = \\sum_i r_i^2$ where $r_i = (X\\boldsymbol\\theta)_i - y_i$ is point $i$'s miss. By the chain rule, $\\frac{\\partial L}{\\partial \\theta_j} = \\sum_i 2r_i \\frac{\\partial r_i}{\\partial \\theta_j} = \\sum_i 2 r_i X_{ij}$: column $j$ of $X$ dotted with the misses. All the columns at once is a transpose:

$$\\nabla_{\\boldsymbol\\theta}\\,\\|X\\boldsymbol\\theta - \\mathbf y\\|^2 = 2X^\\top(X\\boldsymbol\\theta - \\mathbf y)$$

Set it to zero (lesson [[#minimum]]) and you get $X^\\top X\\boldsymbol\\theta = X^\\top\\mathbf y$: lesson [[#least-squares]]'s normal equations, reached by calculus instead of geometry. Two completely different routes to the same answer is a good sign it is right.` },
        { figure: 'LeastSquaresFig', props: { showGradient: true }, caption: 'The same fit, with the gradient of the squared error at a line you choose. It is zero only at the least-squares line.' },
        {
          predict: {
            prompt: 'With $\\mathbf x = (2, -1, 5)$, what is the third entry of $\\nabla_{\\mathbf w}(\\mathbf w^\\top \\mathbf x)$?',
            answer: 5, compute: () => [2, -1, 5][2],
            explain: '$\\partial(w_1x_1 + w_2x_2 + w_3x_3)/\\partial w_3 = x_3 = 5$.',
          },
        },
        {
          predict: {
            prompt: 'For the points $(0,1), (1,3), (2,4)$ and the line $\\boldsymbol\\theta = (w, c) = (1, 1)$, what is the first entry of $2X^\\top(X\\boldsymbol\\theta - \\mathbf y)$?',
            answer: 2 * dot([0, 1, 2], [0 + 1 - 1, 1 + 1 - 3, 2 + 1 - 4]), compute: () => { const X = [[0, 1], [1, 1], [2, 1]], r = add(matvec(X, [1, 1]), scale(-1, [1, 3, 4])); return 2 * matvec(transpose(X), r)[0] },
            explain: 'Misses: $(1 - 1, 2 - 3, 3 - 4) = (0, -1, -1)$. Column 1 of $X$ is $(0, 1, 2)$: dot product $-3$, doubled: $-6$. Negative: increasing $w$ would reduce the error.',
          },
        },
        { note: '$\\nabla_{\\mathbf w}(\\mathbf w^\\top\\mathbf x) = \\mathbf x$. $\\nabla_{\\boldsymbol\\theta}\\|X\\boldsymbol\\theta - \\mathbf y\\|^2 = 2X^\\top(X\\boldsymbol\\theta - \\mathbf y)$; setting it to 0 gives the normal equations. Vector gradients are just many partial derivatives at once.' },
      ],
    },
  ],
}

