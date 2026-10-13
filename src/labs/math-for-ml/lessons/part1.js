// Part 1: reading the symbols. Letters for numbers, functions, subscripts, Σ and Π, powers, the
// number e, logarithms, composition (the sigmoid), the Greek-letter conventions, and argmin. Every
// number a predict block asks for is worked out by `compute` from engine/maths.js, which equals
// the Python programs.
import { predict, total, mean, product, compound, expSeries, sigmoid, logsOfTiny, argmin } from '../engine/maths.js'
import { f } from './util.js'

export const PART1 = {
  id: 'part1', title: 'Part 1 · Reading the symbols', lessons: [
    {
      id: 'symbols-welcome', number: '1.1', title: 'Letters that stand for numbers',
      goal: 'Read an expression like $\\hat y = wx + b$, work it out for given numbers, and say what each letter is for.',
      builds: [],
      blocks: [
        { h: 'What this lab is for' },
        { md: `Open almost any machine-learning article and you meet a wall of symbols: $\\theta$, $\\nabla_\\theta \\mathcal L$, $\\sum_{i=1}^n$, $\\mathbb E_{x\\sim p}$, $\\sigma(Wx + b)$, $\\text{softmax}(QK^\\top/\\sqrt d)$. None of them is hard. Each one is a short way of writing something you could say in a sentence, or do with a calculator, or write as three lines of Python. This lab teaches every one of them, from basic algebra, **one piece at a time**, and always shows how the big equations are **built** from the small pieces.

1. **Reading the symbols**: letters, functions, sums, powers, $e$, logarithms, and the Greek alphabet of ML.
2. **Change**: calculus, starting from a falling ball: slopes, derivatives, the chain rule, gradients, gradient descent.
3. **Arrows and tables**: linear algebra: vectors, dot products, matrices, least squares, eigenvectors.
4. **Chance and data**: probability and statistics: expectation, variance, Bayes, the bell curve, likelihood.
5. **The big equations**: linear and logistic regression, cross-entropy, softmax, backpropagation, Adam, attention, each assembled from Parts 1 to 4.
6. **Reading papers**: decoding real equations, symbol by symbol.

You need arithmetic and a little school algebra (what $2x + 1$ means). The **🔣 Symbol decoder** tab lists every symbol in the lab, how to say it, and where it is taught. Each lesson can also show the maths as a few lines of plain Python, for anyone who finds code easier to read; you can skip those.` },
        { h: 'A letter is a number we haven\'t chosen yet' },
        { md: `Suppose a café sells coffee for £3 a cup, and charges £1 for the takeaway cup whatever you order. The bill for 4 coffees is $3 \\times 4 + 1 = 13$. For 7 coffees, $3 \\times 7 + 1 = 22$. The **rule** is the same every time; only the number of coffees changes. So give that number a name, $x$:

$$\\text{bill} = 3x + 1$$

$x$ is a **variable**: a letter standing for a number that can change. Now make the price and the fee letters too, so the same rule works for any café: price $w$, fee $b$.

$$\\hat y = w\\,x + b$$

This is the most important formula in machine learning, and you have just built it. A machine-learning **model** is a rule like this with adjustable numbers in it. $w$ and $b$ are its **parameters**: numbers the model learns. $x$ is the **input** (what we know), and $\\hat y$ ("y hat") is the model's **prediction**. The hat means "an estimate of $y$": the true answer is plain $y$.` },
        {
          symbols: [
            ['x', 'x', 'the **input**: a number we know', 'x'],
            ['w', 'w (for "weight")', 'how much each unit of $x$ adds: a **parameter**', 'w'],
            ['b', 'b (for "bias")', 'a fixed amount added whatever $x$ is: a parameter', 'b'],
            ['\\hat y', 'y hat', 'the **prediction**', 'y_hat'],
            ['y', 'y', 'the **true** answer the prediction is compared with', 'y'],
          ],
        },
        { md: `Three writing habits to know straight away, because papers use them constantly:

- **Multiplication is invisible.** $wx$ means $w \\times x$. Sometimes it is written $w \\cdot x$ (a raised dot). $3x$ means $3 \\times x$.
- **Order of operations.** Powers first, then multiplication and division, then addition and subtraction; brackets override everything. So $wx + b$ means "multiply, then add", and $w(x + b)$ means "add, then multiply".
- **= and ≈.** $=$ means exactly equal; $\\approx$ means approximately equal. $\\pi \\approx 3.14$.` },
        { figure: 'PredictFig', caption: 'Move $w$, $b$ and $x$. The line is every prediction the rule makes; the dot is the one for your $x$.' },
        {
          code: {
            file: 'symbols.py', fn: 'predict', notes: [
              ['def predict(w, b, x):', ['A Python **function**: give it three numbers, it gives one back.']],
              ['return w * x + b', ['Python can\'t hide multiplication: `w * x` is $wx$.'], { tex: '\\hat y = wx + b', calc: q => [`${f(q.w)} × ${f(q.x)} + ${f(q.b)}`, q.w * q.x + q.b] }],
            ],
          },
        },
        {
          predict: {
            prompt: 'With $w = 2.5$, $b = -1$ and $x = 4$, what is $\\hat y = wx + b$?',
            answer: predict(2.5, -1, 4), compute: () => predict(2.5, -1, 4),
            explain: 'Multiply first: $2.5 \\times 4 = 10$. Then add $b$: $10 + (-1) = 9$.',
            misconceptions: [{ answer: 2.5 * 3, feedback: 'That adds $b$ to $x$ first, $2.5(4 - 1)$. Without brackets, multiply before adding.' }],
          },
        },
        {
          choice: {
            prompt: 'In $\\hat y = wx + b$, which letters does a machine-learning model **learn**?',
            options: [
              { text: '$w$ and $b$', why: 'Yes. They are the parameters. Learning means finding values of $w$ and $b$ that make $\\hat y$ close to $y$ for the examples we have.' },
              { text: '$x$', why: '$x$ is the input: it comes from the data, a new value every time we predict.' },
              { text: '$\\hat y$', why: '$\\hat y$ is worked out from the others: it is the output.' },
            ],
            answer: 0,
          },
        },
        { note: 'A **variable** is a letter for a number. A **model** is a rule with **parameters** ($w$, $b$) that turns an **input** ($x$) into a **prediction** ($\\hat y$). Multiplication is often invisible: $wx = w \\times x$.' },
      ],
    },

    {
      id: 'functions', number: '1.2', title: 'Functions: a rule from input to output',
      goal: 'Read and write $f(x)$ notation, evaluate a function, and see its graph as all its input–output pairs.',
      builds: ['symbols-welcome'],
      blocks: [
        { md: `A **function** is a machine: put a number in, get exactly one number out. Writing $f(x) = 3x + 1$ names the machine $f$ and says what it does to its input. $f(4)$ means "put 4 in": $f(4) = 3 \\times 4 + 1 = 13$. The brackets here do **not** mean multiplication: $f(4)$ is "f of 4", the output for input 4.

Why bother naming it? Because ML talks about whole machines: "the model $f$", "the loss $L$", "the activation $\\sigma$". And because we can then say things like $f(2) > f(1)$ without writing the rule each time.

The **graph** of a function is every input–output pair drawn as a point: across for the input, up for the output. For $f(x) = 3x + 1$ the points $(0, 1)$, $(1, 4)$, $(2, 7)$, … all lie on a straight line. That is why a function like $wx + b$ is called **linear**.` },
        {
          symbols: [
            ['f(x)', 'f of x', 'the output of the function $f$ when the input is $x$', 'f(x)'],
            ['f: \\mathbb R \\to \\mathbb R', 'f from R to R', 'f takes a real number and gives a real number. $\\mathbb R$ is the set of all real numbers', ''],
            ['f_\\theta(x)', 'f theta of x', 'a function with adjustable parameters $\\theta$: the usual way papers write a model', 'model(x)'],
          ],
        },
        { figure: 'FunctionMachine', caption: 'Pick a function, feed it an input, and watch the point land on its graph.' },
        { md: `Machine learning writes models as functions of the input **with** their parameters attached: $f_\\theta(x)$ or $f(x; \\theta)$, where $\\theta$ (the Greek letter theta) stands for **all** the parameters together. So $f_\\theta(x) = wx + b$ with $\\theta = (w, b)$. Changing $\\theta$ gives a different machine; learning is the search for a good $\\theta$.` },
        {
          predict: {
            prompt: 'If $g(x) = x^2 - 2x$, what is $g(5)$?',
            answer: 5 ** 2 - 2 * 5, compute: () => 5 ** 2 - 2 * 5,
            explain: 'Replace every $x$ with 5: $5^2 - 2 \\times 5 = 25 - 10 = 15$.',
          },
        },
        {
          choice: {
            prompt: 'A paper writes $f_\\theta(x)$. What does the small $\\theta$ tell you?',
            options: [
              { text: 'The function has adjustable parameters, collectively called θ, that will be learned', why: 'Yes. "The output of the model with parameters θ on input x."' },
              { text: 'Multiply f by θ', why: 'A subscript is a label, not a multiplication.' },
              { text: 'θ is the input', why: 'The input is in the brackets, $x$.' },
            ],
            answer: 0,
          },
        },
        { note: '$f(x)$ is "the output of $f$ for input $x$". A graph draws every pair $(x, f(x))$. A model is $f_\\theta(x)$: a function with parameters $\\theta$.' },
      ],
    },

    {
      id: 'subscripts', number: '1.3', title: 'Lists of numbers: subscripts and indexes',
      goal: 'Read $x_i$, $x_1, \\dots, x_n$ and $x^{(i)}$, and tell a subscript from a power.',
      builds: ['functions'],
      blocks: [
        { md: `Data comes in many examples, and each one needs a name. Calling them $x$, $x'$, $x''$ runs out fast. Instead, number them with a small **subscript**: $x_1, x_2, x_3, \\dots$. A list of $n$ numbers is $x_1, x_2, \\dots, x_n$, and "any one of them" is $x_i$, where $i$ is the **index**: the position in the list.

| $i$ | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| hours studied, $x_i$ | 1 | 2 | 3 | 4 |
| test score, $y_i$ | 52 | 55 | 61 | 64 |

So $x_3 = 3$ and $y_3 = 61$: the third student studied 3 hours and scored 61. $n$ is almost always the number of examples.

Two warnings. **Python counts from 0**: $x_1$ is \`xs[0]\` in code. And a raised number in **brackets**, $x^{(i)}$, is the same idea as $x_i$ (example number $i$) used when the subscript is needed for something else; without brackets, $x^2$ is a **power**, $x \\times x$ (lesson 1.5). Papers that use $x^{(i)}$ for the $i$-th example often use $x_j$ for its $j$-th measurement, so $x^{(3)}_2$ is "example 3, measurement 2".` },
        {
          symbols: [
            ['x_i', 'x sub i', 'the $i$-th number in the list $x$', 'xs[i - 1]'],
            ['n', 'n', 'how many examples', 'len(xs)'],
            ['x_1, \\dots, x_n', 'x one to x n', 'the whole list; the dots mean "and so on"', 'xs'],
            ['x^{(i)}', 'x superscript i (in brackets)', 'example number $i$: an index, **not** a power', 'X[i - 1]'],
            ['x^{(i)}_j', 'x i, j', 'example $i$, measurement $j$', 'X[i - 1][j - 1]'],
          ],
        },
        { figure: 'IndexFig', caption: 'Click a row: the same number in maths notation and in Python.' },
        {
          predict: {
            prompt: 'In the table above, what is $y_2 - y_1$?',
            answer: 55 - 52, compute: () => 55 - 52,
            explain: '$y_2 = 55$, $y_1 = 52$, so the difference is 3: the second student scored 3 more.',
          },
        },
        {
          choice: {
            prompt: 'What is $x^{(2)}$ in a paper that numbers its examples this way?',
            options: [
              { text: 'The second example', why: 'Yes. Brackets around a raised number mark an index.' },
              { text: '$x$ squared', why: 'Without brackets it would be. The brackets are there exactly to stop you reading it as a power.' },
            ],
            answer: 0,
          },
        },
        { note: '$x_i$: item $i$ of a list. $n$: how many. $x^{(i)}$: example $i$ (brackets = index, not power). Code counts from 0, maths usually from 1.' },
      ],
    },

    {
      id: 'sigma', number: '1.4', title: 'Σ: adding up a list',
      goal: 'Read and evaluate $\\sum_{i=1}^n x_i$ and $\\frac1n\\sum x_i$, use the sum rules, and see Σ as a loop.',
      builds: ['subscripts'],
      blocks: [
        { md: `Adding up a list happens all the time: total sales, total error, the average. Writing $x_1 + x_2 + \\dots + x_n$ is long, so mathematicians use a capital Greek S, **sigma**:

$$\\sum_{i=1}^{n} x_i \\;=\\; x_1 + x_2 + \\dots + x_n$$

Read it as: "the sum, for $i$ from 1 to $n$, of $x_i$". Below the Σ is where the index **starts**, above it where it **stops**, and to the right is **what to add** for each $i$. If you know any programming, this is a \`for\` loop with a running total.` },
        {
          code: {
            file: 'symbols.py', fn: 'total', notes: [
              ['def total(xs):', ['`xs` is the list $x_1, \\dots, x_n$.']],
              ['s = 0.0', ['The running total starts at 0: an empty sum is 0.']],
              ['for x in xs:', ['One trip per item: $i = 1, 2, \\dots, n$.']],
              ['s += x', ['Add this item. `s += x` means `s = s + x`.'], { tex: 's \\leftarrow s + x_i' }],
              ['return s', ['$\\sum_{i=1}^n x_i$.']],
            ],
          },
        },
        { md: `The **mean** (average) adds everything and divides by how many there are:

$$\\bar x = \\frac{1}{n}\\sum_{i=1}^{n} x_i$$

$\\bar x$, "x bar", is the usual name for an average (lesson 2.6's $\\bar v$ was an average velocity).` },
        {
          code: {
            file: 'symbols.py', fn: 'mean', notes: [
              ['def mean(xs):', ['The average.']],
              ['return total(xs) / len(xs)', ['Sum, divided by $n$ = `len(xs)`.'], { tex: '\\bar x = \\frac1n \\sum_i x_i' }],
            ],
          },
        },
        { figure: 'SigmaFig', caption: 'Step through a Σ one term at a time. The expression on the right can be anything with $i$ in it.' },
        { md: `The thing being added can be any expression with $i$ in it: $\\sum_{i=1}^3 i^2 = 1 + 4 + 9 = 14$, or the total squared error $\\sum_i (\\hat y_i - y_i)^2$ that Part 5 builds. Three rules let you move things around, and each is just ordinary arithmetic:

- **Constants come out:** $\\sum_i c\\,x_i = c\\sum_i x_i$ (multiply each term by $c$, or multiply the total: same).
- **Sums split:** $\\sum_i (x_i + y_i) = \\sum_i x_i + \\sum_i y_i$.
- **Adding a constant $n$ times:** $\\sum_{i=1}^n c = nc$.

Often the limits are dropped when they are obvious: $\\sum_i x_i$ means "over all $i$".

**Π** (capital pi) does the same with multiplication: $\\prod_{i=1}^n x_i = x_1 \\times x_2 \\times \\dots \\times x_n$. It appears in probability (Part 4), where independent chances multiply.` },
        {
          code: {
            file: 'symbols.py', fn: 'product', notes: [
              ['def product(xs):', ['Π: the same loop, multiplying.']],
              ['p = 1.0', ['An empty product is 1, not 0: multiplying by 1 changes nothing.']],
              ['for x in xs:', ['Each item.']],
              ['p *= x', ['`p *= x` means `p = p * x`.'], { tex: 'p \\leftarrow p \\times x_i' }],
              ['return p', ['$\\prod_i x_i$.']],
            ],
          },
        },
        {
          symbols: [
            ['\\sum_{i=1}^{n}', 'the sum for i from 1 to n', 'add up the expression after it, once for each $i$', 'for i in range(n): s += …'],
            ['\\bar x', 'x bar', 'the mean of the $x_i$', 'mean(xs)'],
            ['\\prod_{i=1}^{n}', 'the product for i from 1 to n', 'multiply them all', 'for …: p *= …'],
          ],
        },
        {
          predict: {
            prompt: 'For the list $x = (2, 4, 9)$, what is $\\frac13\\sum_{i=1}^3 x_i$?',
            answer: mean([2, 4, 9]), compute: () => mean([2, 4, 9]),
            explain: `$2 + 4 + 9 = 15$, and $15 / 3 = ${mean([2, 4, 9])}$: the mean.`,
            misconceptions: [{ answer: total([2, 4, 9]), feedback: 'That is the sum. The $\\frac13$ in front divides it by 3.' }],
          },
        },
        {
          predict: {
            prompt: 'What is $\\sum_{i=1}^{4} (2i + 1)$?',
            answer: [1, 2, 3, 4].reduce((s, i) => s + 2 * i + 1, 0), compute: () => [1, 2, 3, 4].reduce((s, i) => s + 2 * i + 1, 0),
            explain: '$3 + 5 + 7 + 9 = 24$. Or with the rules: $2\\sum i + \\sum 1 = 2 \\times 10 + 4 = 24$.',
          },
        },
        {
          predict: {
            prompt: `And $\\prod_{i=1}^{3} x_i$ for $x = (2, 4, 9)$?`,
            answer: product([2, 4, 9]), compute: () => product([2, 4, 9]),
            explain: '$2 \\times 4 \\times 9 = 72$.',
          },
        },
        { note: '$\\sum_{i=1}^n$ = add up, $\\prod_{i=1}^n$ = multiply up, for each index. A Σ is a `for` loop with a running total. The mean is $\\bar x = \\frac1n\\sum x_i$.' },
      ],
    },

    {
      id: 'powers', number: '1.5', title: 'Powers, roots and their rules',
      goal: 'Work with $x^n$, $\\sqrt x$, negative and fractional powers, and the three power rules.',
      builds: ['sigma'],
      blocks: [
        { md: `$x^3$ ("x cubed", "x to the 3") means $x \\times x \\times x$: three $x$s multiplied. The small raised number is the **exponent** or **power**. $x^2$ is "x squared": the area of a square with side $x$.

Counting the $x$s gives three rules, and everything else follows from them:

1. $x^a \\cdot x^b = x^{a+b}$: two $x$s times three $x$s is five $x$s.
2. $\\dfrac{x^a}{x^b} = x^{a-b}$: cancel matching $x$s.
3. $(x^a)^b = x^{ab}$: three copies of $x^2$ is $x^6$.

Now ask what other powers should mean so the rules keep working:

- **Power 0.** $x^a / x^a = 1$, and rule 2 says it is $x^{a-a} = x^0$. So $x^0 = 1$ (for $x \\ne 0$).
- **Negative powers.** $x^0 / x^a = x^{-a}$, so $x^{-a} = \\dfrac{1}{x^a}$. For example $2^{-3} = \\frac18$.
- **Fractional powers.** $(x^{1/2})^2 = x^{1} = x$ by rule 3, so $x^{1/2}$ is the number that squares to $x$: the **square root**, $\\sqrt x$.` },
        { figure: 'PowerFig', caption: 'Change the base and the power. The dots multiply out the definition; the rules say where it lands.' },
        { md: `Why does ML care? **Squaring** turns any difference into a positive number and punishes big errors far more than small ones: an error of 2 counts 4, an error of 10 counts 100. That is the "squared" in **mean squared error** (Part 5). And **square roots** undo squaring when we want the answer back in the original units: the length of an arrow (Part 3) and the standard deviation (Part 4) are both square roots of sums of squares.` },
        {
          predict: {
            prompt: 'Simplify $\\dfrac{2^5 \\times 2^3}{2^6}$ to a single number.',
            answer: 2 ** (5 + 3 - 6), compute: () => 2 ** 5 * 2 ** 3 / 2 ** 6,
            explain: 'Rules 1 and 2: $2^{5 + 3 - 6} = 2^2 = 4$.',
          },
        },
        {
          predict: {
            prompt: 'What is $9^{-1/2}$? (decimal)',
            answer: 9 ** -0.5, tolerance: 1e-6, compute: () => 9 ** -0.5,
            explain: '$9^{1/2} = 3$, and the minus sign means "one over": $\\frac13 \\approx 0.333$.',
            misconceptions: [{ answer: -3, feedback: 'A negative power isn\'t a negative number: it means one over.' }],
          },
        },
        { note: '$x^a x^b = x^{a+b}$, $x^a / x^b = x^{a-b}$, $(x^a)^b = x^{ab}$. Hence $x^0 = 1$, $x^{-a} = 1/x^a$, $x^{1/2} = \\sqrt x$. Squares make errors positive and punish big ones.' },
      ],
    },

    {
      id: 'number-e', number: '1.6', title: 'Growth and the number e',
      goal: 'Explain where $e \\approx 2.718$ comes from, and what $e^x$ means and looks like.',
      builds: ['powers'],
      blocks: [
        { md: `Put £1 in a bank that pays 100% interest a year. After a year you have £2. Now suppose the bank pays the interest in two halves: 50% after six months (£1.50), then 50% of **that** (£2.25). You earned interest on your interest. Pay it in 12 monthly slices: $(1 + \\tfrac1{12})^{12} \\approx 2.613$. Daily: $(1 + \\tfrac1{365})^{365} \\approx 2.7146$.

More slices help less and less, and the amount closes in on a fixed number:

$$\\left(1 + \\frac1n\\right)^n \\;\\to\\; e = 2.71828\\ldots \\quad\\text{as } n \\text{ grows}$$

That number is **e**, as fundamental as $\\pi$. It is what continuous growth looks like: growth where the amount is always growing in proportion to itself.` },
        {
          code: {
            file: 'symbols.py', fn: 'compound', notes: [
              ['def compound(n):', ['`n` slices of growth in a year.']],
              ['return (1 + 1 / n) ** n', ['`**` is Python\'s power: $(1 + 1/n)^n$.'], { tex: '(1 + 1/n)^n \\to e', calc: q => [`(1 + 1/${q.n})^${q.n}`, (1 + 1 / q.n) ** q.n] }],
            ],
          },
        },
        { figure: 'CompoundFig', caption: 'More, smaller slices of growth: the total creeps up toward $e$ and never passes it.' },
        { md: `$e^x$ (also written $\\exp(x)$) is $e$ to the power $x$: for whole numbers it is just $e \\times e \\times \\dots$, and the power rules fill in the rest. Its graph rises slowly for negative $x$, passes through $(0, 1)$ (because anything to the power 0 is 1), and then shoots up. Three facts you will use all the time:

- $e^x$ is **always positive**, however negative $x$ is. That is why softmax (Part 5) uses it to turn any score into something positive.
- $e^{a + b} = e^a e^b$ (power rule 1).
- Its slope at any point equals its height (lesson 2.11): the only function with that property.

There is another way to compute it, which is how calculators do it:

$$e^x = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\dots = \\sum_{k=0}^{\\infty} \\frac{x^k}{k!}$$

where $k! = 1 \\times 2 \\times \\dots \\times k$ ("k factorial", with $0! = 1$). The terms shrink so fast that 20 of them give $e^1$ to 15 digits.` },
        {
          code: {
            file: 'symbols.py', fn: 'exp_series', notes: [
              ['def exp_series(x, terms=20):', ['A Σ with 20 terms.']],
              ['s = 0.0', ['Running total.']],
              ['term = 1.0', ['The first term, $x^0/0! = 1$.']],
              ['for k in range(terms):', ['$k = 0, 1, \\dots, 19$.']],
              ['s += term', ['Add $x^k / k!$.']],
              ['term = term * x / (k + 1)', ['Turn $x^k/k!$ into the next term $x^{k+1}/(k+1)!$ by multiplying by $x/(k+1)$: no factorials needed.'], { calc: q => [`${f(q.term)} × ${f(q.x)} / ${q.k + 1}`, q.term * q.x / (q.k + 1)] }],
              ['return s', ['$e^x$.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is $(1 + \\frac{1}{12})^{12}$, monthly compounding? (3 decimals)',
            answer: compound(12), tolerance: 0.0006, compute: () => compound(12),
            explain: `${f(compound(12))}: already 96% of the way from 2 to $e$.`,
          },
        },
        {
          predict: {
            prompt: 'Using the series, what is $e^{-2}$? (4 decimals)',
            answer: expSeries(-2), tolerance: 0.00006, compute: () => expSeries(-2),
            explain: `${f(expSeries(-2))}, which is $1/e^2$: a negative power means one over.`,
          },
        },
        { note: '$e \\approx 2.718$ is the limit of $(1 + 1/n)^n$: continuous growth. $e^x$ is always positive, $e^0 = 1$, $e^{a+b} = e^a e^b$.' },
      ],
    },

    {
      id: 'logarithms', number: '1.7', title: 'Logarithms: undoing growth',
      goal: 'Read $\\log$ and $\\ln$ as "what power?", use the log rules, and see why ML adds logs instead of multiplying probabilities.',
      builds: ['number-e', 'sigma'],
      blocks: [
        { md: `$2^3 = 8$. Turn the question round: "2 to **what** power gives 8?" The answer, 3, is the **logarithm** of 8 to base 2: $\\log_2 8 = 3$. A logarithm answers "what power?".

ML almost always uses base $e$. The **natural logarithm** $\\ln x$ (often written plain $\\log x$ in ML papers) is the power you raise $e$ to, to get $x$:

$$\\ln x = y \\quad\\Longleftrightarrow\\quad e^y = x$$

So $\\ln$ undoes $\\exp$: $\\ln(e^x) = x$ and $e^{\\ln x} = x$. Its graph is $e^x$'s graph reflected in the diagonal. $\\ln 1 = 0$ (because $e^0 = 1$); it is negative for numbers below 1, and it only exists for positive numbers.

The power rules turn into log rules, and the first is the one that matters most:

1. $\\ln(ab) = \\ln a + \\ln b$: **logs turn multiplying into adding** (because $e^a e^b = e^{a+b}$).
2. $\\ln(a/b) = \\ln a - \\ln b$.
3. $\\ln(a^k) = k \\ln a$.` },
        { figure: 'LogFig', caption: '$e^x$ and $\\ln x$ are mirror images in the diagonal line $y = x$. Move the point and read both directions.' },
        { md: `Why ML loves logs: probabilities of many independent events **multiply** (Part 4), and multiplying many numbers below 1 makes something absurdly small. The chance that a model gets 30 independent answers right, each with probability 0.1, is $0.1^{30} = 10^{-30}$. A few thousand such factors and the number is too small for a computer to store: it rounds to 0. The log of the product, though, is a modest **sum**: $\\sum \\ln 0.1 = 30 \\times (-2.303) = -69.08$. And because $\\ln$ only ever goes up as its input goes up, the parameters that make the product biggest also make the log biggest. That is why papers maximise the **log**-likelihood, and why the loss functions of Part 5 have logs in them.` },
        {
          code: {
            file: 'symbols.py', fn: 'logs_of_tiny', notes: [
              ['def logs_of_tiny(ps):', ['A list of probabilities.']],
              ['return product(ps), total([math.log(p) for p in ps])', ['The product, and the sum of the logs. `math.log` is $\\ln$. `[math.log(p) for p in ps]` is a **list comprehension**: a new list with each $p$ replaced by $\\ln p$.'], { tex: '\\ln \\prod_i p_i = \\sum_i \\ln p_i' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is $\\ln(e^3)$?',
            answer: 3, compute: () => Math.log(Math.exp(3)), tolerance: 1e-9,
            explain: '$\\ln$ undoes $e^{(\\cdot)}$: the power was 3.',
          },
        },
        {
          predict: {
            prompt: 'Thirty probabilities of 0.1 each: what is the **sum** of their natural logs? (2 decimals)',
            answer: logsOfTiny(Array(30).fill(0.1))[1], tolerance: 0.006, compute: () => logsOfTiny(Array(30).fill(0.1))[1],
            explain: '$30 \\ln 0.1 = 30 \\times (-2.3026) = -69.08$: a perfectly ordinary number, where the product was $10^{-30}$.',
          },
        },
        {
          choice: {
            prompt: 'Why can a model maximise $\\ln L$ instead of $L$ and get the same best parameters?',
            options: [
              { text: '$\\ln$ always increases when its input increases, so the biggest $L$ has the biggest $\\ln L$', why: 'Yes. A function that never goes down doesn\'t change which input is best; it only changes the values.' },
              { text: 'Because $\\ln L = L$', why: 'They are very different numbers; only the location of the peak is the same.' },
            ],
            answer: 0,
          },
        },
        { note: '$\\ln x$ = the power of $e$ that gives $x$; it undoes $e^x$. $\\ln(ab) = \\ln a + \\ln b$: logs turn products into sums, which is why ML works with log-probabilities.' },
      ],
    },

    {
      id: 'composition', number: '1.8', title: 'Functions inside functions: the sigmoid',
      goal: 'Read $f(g(x))$, and build $\\sigma(z) = \\frac{1}{1 + e^{-z}}$ one operation at a time.',
      builds: ['logarithms', 'functions'],
      blocks: [
        { md: `Machines can be chained: the output of one becomes the input of the next. $f(g(x))$ means "do $g$ to $x$, then do $f$ to the result". It is called **composition**, sometimes written $(f \\circ g)(x)$. Order matters: with $g(x) = x + 1$ and $f(x) = 2x$, $f(g(3)) = 2 \\times 4 = 8$ but $g(f(3)) = 6 + 1 = 7$.

A neural network is nothing but composition: layer after layer, each one's output the next one's input (Part 5). Here is the most famous small composition in ML, the **sigmoid** (σ, lowercase sigma), built in four steps from a raw score $z$:

1. $-z$: flip the sign.
2. $e^{-z}$: always positive; huge when $z$ is very negative, tiny when $z$ is very positive.
3. $1 + e^{-z}$: always more than 1.
4. $\\dfrac{1}{1 + e^{-z}}$: one over that, so always between 0 and 1.

$$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$

Big positive $z$ gives nearly 1; big negative $z$ gives nearly 0; $z = 0$ gives exactly $\\frac12$. It turns any score into something that can be read as a probability, which is exactly what logistic regression needs (Part 5).` },
        { figure: 'SigmoidBuilder', caption: 'The sigmoid built step by step. Move $z$ and follow the number through each machine.' },
        {
          code: {
            file: 'symbols.py', fn: 'sigmoid', notes: [
              ['def sigmoid(z):', ['σ.']],
              ['return 1 / (1 + math.exp(-z))', ['`math.exp(-z)` is $e^{-z}$. Read inside out: flip, exponentiate, add 1, one over.'], { tex: '\\sigma(z) = \\frac{1}{1 + e^{-z}}', calc: q => [`1 / (1 + e^(−${f(q.z)}))`, 1 / (1 + Math.exp(-q.z))] }],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is $\\sigma(3)$? (3 decimals)',
            answer: sigmoid(3), tolerance: 0.0006, compute: () => sigmoid(3),
            explain: `$e^{-3} \\approx 0.0498$, so $\\sigma(3) = 1/1.0498 \\approx ${f(sigmoid(3))}$.`,
          },
        },
        {
          predict: {
            prompt: 'With $g(x) = x^2$ and $f(x) = x + 1$, what is $g(f(2))$?',
            answer: (2 + 1) ** 2, compute: () => (2 + 1) ** 2,
            explain: 'Inside first: $f(2) = 3$. Then $g(3) = 9$.',
            misconceptions: [{ answer: 5, feedback: 'That is $f(g(2)) = 4 + 1$. The inner function, $f$, goes first.' }],
          },
        },
        { note: '$f(g(x))$: apply $g$, then $f$. Networks are long compositions. $\\sigma(z) = 1/(1 + e^{-z})$ squashes any number into $(0, 1)$, with $\\sigma(0) = \\frac12$.' },
      ],
    },

    {
      id: 'greek', number: '1.9', title: 'The ML alphabet: Greek letters and conventions',
      goal: 'Recognise the Greek letters and set symbols ML papers use, and what each one usually stands for.',
      builds: ['composition'],
      blocks: [
        { md: `Papers reuse the same letters for the same jobs, so once you know the conventions, a new equation is half-read before you start. These are habits, not laws (a paper should define its symbols), but they hold surprisingly often.` },
        {
          symbols: [
            ['\\theta', 'theta', 'all the model\'s parameters together', 'params'],
            ['w,\\;W', 'w, capital W', 'weights: $w$ a list, $W$ a table (matrix)', 'w, W'],
            ['b', 'b', 'bias: the added constant', 'b'],
            ['\\eta,\\;\\alpha', 'eta, alpha', 'the learning rate: the step size of gradient descent', 'lr'],
            ['\\lambda', 'lambda', 'how strongly a penalty counts (regularisation), or an eigenvalue', 'lam'],
            ['\\sigma', 'sigma', 'the sigmoid function, **or** a standard deviation (context tells you)', 'sigmoid, std'],
            ['\\mu', 'mu', 'a mean (average)', 'mu'],
            ['\\epsilon,\\;\\varepsilon', 'epsilon', 'a tiny number, or random noise', 'eps'],
            ['\\mathcal L,\\;J,\\;\\ell', 'script L, J, little l', 'the loss: how wrong the model is', 'loss'],
            ['\\nabla', 'nabla, del', 'the gradient: the vector of slopes (Part 2)', 'grad'],
            ['\\partial', 'partial, "del"', 'a partial derivative (Part 2)', ''],
            ['\\mathbb E', 'expectation, E', 'average over chance (Part 4)', 'mean over samples'],
            ['\\mathbb R,\\; \\mathbb R^n', 'R, R n', 'the real numbers; lists of $n$ real numbers', 'float, list'],
            ['\\in', 'in, "is an element of"', '$x \\in \\mathbb R^3$: $x$ is a list of 3 real numbers', ''],
            ['\\forall', 'for all', '$\\forall i$: for every $i$', 'for i in …'],
            ['\\propto', 'proportional to', 'equal up to a constant factor', ''],
            [':=', 'is defined as', 'gives a name to the right-hand side', '='],
          ],
        },
        { md: `Two more habits:

- **Bold or capital letters are collections.** Lowercase plain $x$ is one number; bold $\\mathbf x$ or plain $x$ in a paper that says "$x \\in \\mathbb R^d$" is a list (a **vector**, Part 3); capital $X$ or $W$ is a table (a **matrix**).
- **Hats are estimates, stars are best values.** $\\hat y$ is a prediction, $\\hat\\theta$ estimated parameters; $\\theta^*$ is the best possible $\\theta$.

The **🔣 Symbol decoder** tab keeps all of these, and every symbol the later parts add, in one place.` },
        { python: { program: 'symbols', label: 'Run every Part 1 symbol in real Python' } },
        {
          code: {
            file: 'symbols.py', fn: 'show_symbols', notes: [
              ['def show_symbols():', ['Every Part 1 idea, worked out once.']],
              ['xs = [2.0, 4.0, 9.0]', ['A small list.']],
              ['print("prediction w x + b with w=2, b=1, x=3:", predict(2, 1, 3))', ['Lesson 1.1.']],
              ['print("sum:", total(xs), " mean:", mean(xs), " product:", product(xs))', ['Lesson 1.4.']],
              ['print("(1 + 1/n)^n for n = 1000:", compound(1000), " e =", math.e)', ['Lesson 1.6; `math.e` is $e$ itself.']],
              ['print("e^1 by the series:", exp_series(1))', ['The series.']],
              ['print("sigmoid(0):", sigmoid(0), " sigmoid(3):", sigmoid(3))', ['Lesson 1.8.']],
              ['print("argmin of (x - 3)^2 over 0..6:", argmin(lambda x: (x - 3) ** 2, [0, 1, 2, 3, 4, 5, 6]))', ['Lesson 1.10. `lambda x: …` is a function written in place.']],
            ],
          },
        },
        {
          choice: {
            prompt: 'A paper writes "$\\theta \\leftarrow \\theta - \\eta \\nabla_\\theta \\mathcal L$". Which reading fits the conventions?',
            options: [
              { text: 'Parameters ← parameters − learning rate × gradient of the loss', why: 'Yes. That is gradient descent, the update Part 2 builds. You can already read it.' },
              { text: 'Angle ← angle − efficiency × something', why: 'θ can mean an angle elsewhere, but next to η and a loss it is the parameters.' },
            ],
            answer: 0,
          },
        },
        { note: 'θ parameters, η/α learning rate, λ penalty strength, σ sigmoid or standard deviation, μ mean, $\\mathcal L$ loss, ∇ gradient, $\\mathbb E$ expectation, $\\in$ "is in". Hats estimate, stars are optimal.' },
      ],
    },

    {
      id: 'argmin', number: '1.10', title: 'min, max, argmin, argmax',
      goal: 'Tell the smallest value of a function from the input that gives it, and read the training objective $\\theta^* = \\arg\\min_\\theta \\mathcal L(\\theta)$.',
      builds: ['greek'],
      blocks: [
        { md: `Two different questions about a function: **how low does it go**, and **where**? For $L(x) = (x - 3)^2 + 1$:

- $\\min_x L(x) = 1$: the smallest **value**.
- $\\arg\\min_x L(x) = 3$: the **input** that gives it ("the argument of the minimum").

Machine learning almost always wants the second. "Training" is written

$$\\theta^* = \\arg\\min_{\\theta}\\; \\mathcal L(\\theta)$$

"$\\theta^*$ is the parameter setting that makes the loss smallest". We don't care what the smallest loss **is** nearly as much as **which parameters** reach it. $\\arg\\max$ is the same for the largest value: a classifier predicts $\\arg\\max_k p_k$, the class with the highest probability, not the probability itself.` },
        {
          code: {
            file: 'symbols.py', fn: 'argmin', notes: [
              ['def argmin(f, candidates):', ['Try every candidate input; `f` is the function being minimised.']],
              ['best = candidates[0]', ['The best input so far: the first.']],
              ['for c in candidates:', ['Each candidate…']],
              ['if f(c) < f(best):', ['…gives a smaller value?'], { logic: 'this input makes f smaller than the best so far' }],
              ['best = c', ['Remember the **input**, not the value.']],
              ['return best', ['The argmin. (`min(f(c) for c in candidates)` would return the value instead.)']],
            ],
          },
        },
        { figure: 'ArgminFig', caption: 'The lowest point of the curve: its height is the min, its position along the axis is the argmin.' },
        {
          predict: {
            prompt: 'For $L(x) = (x - 3)^2 + 1$, what is $\\arg\\min_x L(x)$?',
            answer: argmin(x => (x - 3) ** 2 + 1, [0, 1, 2, 3, 4, 5, 6]), compute: () => argmin(x => (x - 3) ** 2 + 1, [0, 1, 2, 3, 4, 5, 6]),
            explain: 'A square is never negative and is 0 only when $x = 3$; so the lowest point is at $x = 3$. The min **value** there is 1.',
            misconceptions: [{ answer: 1, feedback: 'That is the minimum **value**. argmin asks for the input.' }],
          },
        },
        {
          predict: {
            prompt: 'A classifier outputs probabilities $(0.2, 0.7, 0.1)$ for classes 1, 2, 3. What is $\\arg\\max_k p_k$?',
            answer: 2, compute: () => [0.2, 0.7, 0.1].indexOf(Math.max(0.2, 0.7, 0.1)) + 1,
            explain: 'Class 2: the position of the biggest probability, 0.7.',
          },
        },
        { note: '$\\min$/$\\max$ give a value; $\\arg\\min$/$\\arg\\max$ give the input that achieves it. Training: $\\theta^* = \\arg\\min_\\theta \\mathcal L(\\theta)$. Part 2 is about **how** to find it.' },
      ],
    },
  ],
}
