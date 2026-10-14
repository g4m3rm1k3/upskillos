// Part 1's foundations, added for reading papers fluently: sets and set-builder notation, logic and
// quantifiers, functions in pieces (absolute value, ReLU, clip, indicators, floor, mod), and
// inequalities. lessons/index.js places them inside Part 1.
import { members, inInterval, implies, forAll, relu, clip, accuracy, sumBounds } from '../engine/maths.js'

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export const FOUNDATIONS = [
  {
    id: 'sets', title: 'Sets: collections, membership and ℝⁿ',
    goal: 'Read $\\in$, $\\{x \\mid \\dots\\}$, $\\subseteq$, $\\cup$, $\\cap$, $\\setminus$, $\\mathbb R^n$, intervals like $(0, 1]$ and $f: A \\to B$, and write each in Python.',
    builds: ['functions'],
    blocks: [
      { md: `Papers describe **what kind of thing** each symbol is before saying anything about it: "$\\mathbf x \\in \\mathbb R^d$", "$y \\in \\{0, 1\\}$", "$\\sigma: \\mathbb R \\to (0, 1)$", "the dataset $\\mathcal D = \\{(\\mathbf x^{(i)}, y^{(i)})\\}_{i=1}^n$". All of that is the language of **sets**.

A **set** is a collection where only membership matters: is this thing in it or not? Order doesn't matter and nothing is in it twice, so $\\{3, 1, 2\\}$ and $\\{1, 2, 3, 3\\}$ are the same set. Python's \`set\` behaves exactly this way.

- $x \\in A$: "$x$ is in $A$" (an **element** or **member** of $A$). $x \\notin A$: it isn't. In Python, \`x in A\`.
- **Listing:** $\\{0, 1\\}$ is the set holding 0 and 1: a binary label. $\\{1, 2, \\dots, n\\}$ is the whole numbers from 1 to $n$.
- **Set-builder notation:** $\\{x \\in A \\mid x > 0\\}$ reads "the $x$ in $A$ **such that** $x > 0$" (some papers write a colon for the bar). It is a set comprehension: \`{x for x in A if x > 0}\`.
- $\\emptyset$: the **empty set**, with nothing in it.

**The number sets.** $\\mathbb N$ = the counting numbers $\\{0, 1, 2, \\dots\\}$ (some authors start at 1; papers usually say). $\\mathbb Z$ = all whole numbers, negatives too. $\\mathbb R$ = the **real numbers**: every point on the number line, fractions and $\\pi$ and $\\sqrt 2$ included. A computer's \`float\` is a finite stand-in for $\\mathbb R$: close enough for almost everything, and where it falls short comes later in the lab.

**Lists as sets.** $\\mathbb R^n$ is the set of all lists of $n$ real numbers, so $\\mathbf x \\in \\mathbb R^3$ says "$\\mathbf x$ is a list of 3 reals". $\\{0, 1\\}^n$ is all lists of $n$ bits. In general $A \\times B$ (the **product** of two sets) is all pairs $(a, b)$ with $a \\in A$ and $b \\in B$, and $\\mathbb R^2 = \\mathbb R \\times \\mathbb R$.

**Intervals** are sets of reals between two ends. A square bracket includes its end; a round one leaves it out:

$$[a, b] = \\{x \\mid a \\le x \\le b\\}, \\quad (a, b) = \\{x \\mid a < x < b\\}, \\quad [a, b) = \\{x \\mid a \\le x < b\\}$$

A probability lies in $[0, 1]$. The sigmoid's outputs lie in $(0, 1)$: never exactly 0 or 1, because $e^{-z}$ is always positive, so $1 + e^{-z}$ is always more than 1, and one over it is always below 1 and above 0.` },
      { md: `**Combining sets.** With $A$ and $B$ inside some universe $U$ of everything under discussion:

| Symbol | Read it | Means | Python |
|---|---|---|---|
| $A \\subseteq B$ | A is a subset of B | every member of $A$ is in $B$ | \`A <= B\` |
| $A \\cup B$ | A union B | in $A$ **or** $B$ (or both) | \`A \\| B\` |
| $A \\cap B$ | A intersect B | in $A$ **and** $B$ | \`A & B\` |
| $A \\setminus B$ | A minus B | in $A$ but **not** in $B$ | \`A - B\` |
| $A^c$ or $\\bar A$ | the complement of A | in $U$ but not in $A$ | \`U - A\` |
| $\\lvert A\\rvert$ | the size of A | how many members | \`len(A)\` |

"Or" and "and" are not a coincidence: in Part [[#part:part4]], an **event** is a set of outcomes, and "$A$ or $B$ happens" is the event $A \\cup B$.

**Functions between sets.** $f: A \\to B$ reads "$f$ takes each member of $A$ to a member of $B$": $A$ is its **domain** (allowed inputs), $B$ where its outputs live. A model $f_\\theta: \\mathbb R^d \\to \\mathbb R$ takes a list of $d$ measurements to one number. $\\sigma: \\mathbb R \\to (0, 1)$ says exactly what we argued above: any real in, a number strictly between 0 and 1 out. A function in lesson [[#functions]]'s sense is a rule; the arrow tells you what it can be given and what it gives back.` },
      { figure: 'SetsFig', caption: 'Pick two conditions on the numbers 1 to 30 and an operation. The highlighted numbers are the set; the set-builder line says the same thing in symbols.' },
      {
        code: {
          file: 'symbols.py', fn: 'members', notes: [
            ['def members(universe, condition):', ['`universe` is the set to choose from; `condition` is a test, a function returning `True` or `False`.']],
            ['return {x for x in universe if condition(x)}', ['A set comprehension: $\\{x \\in U \\mid \\text{condition}(x)\\}$ written as Python. The curly braces make a `set`, so repeats vanish and order is not kept.'], { tex: '\\{x \\in U \\mid \\text{condition}(x)\\}' }],
          ],
        },
      },
      {
        code: {
          file: 'symbols.py', fn: 'in_interval', notes: [
            ['def in_interval(x, a, b, brackets="[)"):', ['`brackets` is two characters, such as `"[)"` for $[a, b)$.']],
            ['left_ok = a <= x if brackets[0] == "[" else a < x', ['A square bracket on the left includes $a$ ($a \\le x$); a round one excludes it ($a < x$).']],
            ['right_ok = x <= b if brackets[1] == "]" else x < b', ['The same on the right.']],
            ['return left_ok and right_ok', ['$x$ is in the interval when both ends agree: an "and", so this is an intersection of two half-lines.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'How many members has $\\{x \\in \\{1, 2, \\dots, 20\\} \\mid x \\text{ is even and } x \\text{ is a multiple of } 3\\}$?',
          answer: 3, compute: () => members(range(1, 20), x => x % 2 === 0 && x % 3 === 0).length,
          explain: 'The set is $\\{6, 12, 18\\}$: the multiples of 6. "And" is an intersection: even numbers $\\cap$ multiples of 3.',
          misconceptions: [{ answer: 16, feedback: 'That counts numbers that are even **or** a multiple of 3: the union. The bar asks for both.' }],
        },
      },
      {
        predict: {
          prompt: 'How many **whole numbers** lie in the interval $[-2, 3)$?',
          answer: 5, compute: () => range(-10, 10).filter(x => inInterval(x, -2, 3, '[)')).length,
          explain: '$-2, -1, 0, 1, 2$. The square bracket includes $-2$; the round one excludes $3$.',
          misconceptions: [{ answer: 6, feedback: 'The round bracket on the right leaves 3 out.' }, { answer: 4, feedback: 'The square bracket on the left keeps $-2$ in.' }],
        },
      },
      {
        choice: {
          prompt: 'A paper defines $g: \\mathbb R^{784} \\to \\{0, 1, \\dots, 9\\}$. What is $g$?',
          options: [
            { text: 'Something that takes a list of 784 numbers and returns one digit, 0 to 9', why: 'Yes: the domain is lists of 784 reals (a 28×28 image, flattened), and every output is one of the ten digits. A digit classifier.' },
            { text: 'Something that takes a digit and returns 784 numbers', why: 'The arrow goes from the domain to the outputs: inputs are in $\\mathbb R^{784}$.' },
            { text: 'A list of 784 digits', why: '$\\mathbb R^{784}$ is the set its inputs come from; $g$ itself is a function.' },
          ],
          answer: 0,
        },
      },
      { note: 'A set: membership only. $\\in$ is "in"; $\\{x \\in A \\mid \\dots\\}$ is a comprehension; $\\cup$ or, $\\cap$ and, $\\setminus$ minus. $\\mathbb R^n$: lists of $n$ reals. $[\\;]$ includes an end, $(\\;)$ excludes it. $f: A \\to B$: inputs from $A$, outputs in $B$.' },
    ],
  },

  {
    id: 'logic', title: 'Logic: and, or, not, implies, for all, there exists',
    goal: 'Read $\\wedge$, $\\vee$, $\\neg$, $\\Rightarrow$, $\\Leftrightarrow$, $\\forall$ and $\\exists$, negate a statement correctly, and see why the order of $\\forall$ and $\\exists$ matters.',
    builds: ['sets'],
    blocks: [
      { md: `Definitions and theorems in papers are built from a handful of logical words. Each has an exact meaning, which is sometimes **not** its everyday meaning.

A **statement** is something that is either true or false: "$3 > 2$", "the loss went down", "$x \\in A$". Combine statements $p$ and $q$:

- **not** $p$, written $\\neg p$: true exactly when $p$ is false. Python \`not p\`.
- $p$ **and** $q$, written $p \\wedge q$: true when both are. Python \`p and q\`.
- $p$ **or** $q$, written $p \\vee q$: true when **at least one** is. Maths "or" is inclusive: both counts. Python \`p or q\`.
- $p$ **implies** $q$, written $p \\Rightarrow q$: "if $p$ then $q$".
- $p$ **if and only if** $q$ ("iff"), written $p \\Leftrightarrow q$: both are true or both are false; each implies the other.

**Implies** is the one to slow down on. Read $p \\Rightarrow q$ as a **promise**: "if you score 90, you get an A". The promise is broken only if you score 90 and **don't** get an A. If you didn't score 90, nothing was promised, so it can't have been broken: the statement counts as **true**. So $p \\Rightarrow q$ is false in exactly one case, $p$ true and $q$ false; it is the same as $\\neg p \\vee q$.

Two consequences papers rely on:

- The **converse** $q \\Rightarrow p$ is a different statement. "If it rained, the grass is wet" doesn't give "if the grass is wet, it rained" (sprinklers).
- The **contrapositive** $\\neg q \\Rightarrow \\neg p$ is the **same** statement: both are false in exactly the one case $p$ true, $q$ false. "If the grass is dry, it didn't rain." The truth table below lets you check every row.` },
      { figure: 'LogicFig', caption: 'Set $p$ and $q$, and watch every combination. $p \\Rightarrow q$ is false in exactly one row; the contrapositive matches it in every row; the converse does not.' },
      { md: `**Quantifiers** say how many things a statement is about.

- $\\forall x \\in A: P(x)$, "for all $x$ in $A$, $P(x)$": every member passes. One **counterexample** makes it false.
- $\\exists x \\in A: P(x)$, "there exists an $x$ in $A$ with $P(x)$": at least one member passes. One **example** makes it true.

They are loops that can stop early, as the code shows. And they swap under **not**:

$$\\neg\\,(\\forall x: P(x)) \\;=\\; \\exists x: \\neg P(x) \\qquad\\qquad \\neg\\,(\\exists x: P(x)) \\;=\\; \\forall x: \\neg P(x)$$

"Not every model beat the baseline" means "some model didn't". The same swap works for and/or (**De Morgan's laws**): $\\neg(p \\wedge q) = \\neg p \\vee \\neg q$ and $\\neg(p \\vee q) = \\neg p \\wedge \\neg q$. "Not (fast and accurate)" is "slow or inaccurate".

**Order matters** when both quantifiers appear. "$\\forall x \\in \\mathbb R\\; \\exists y \\in \\mathbb R: y > x$" says every number has a bigger one: true ($y = x + 1$). "$\\exists y \\in \\mathbb R\\; \\forall x \\in \\mathbb R: y > x$" says one number beats them all: false. Same symbols, different order, opposite truth. The precise definition of a limit, which papers use, is "for every $\\varepsilon > 0$ there exists $N$ such that…", and reading it needs exactly this.

Paper shorthand: "s.t." = such that; "w.l.o.g." = without loss of generality (a case that covers the others by symmetry); $\\exists!$ = there exists exactly one.` },
      {
        code: {
          file: 'symbols.py', fn: 'implies', notes: [
            ['def implies(p, q):', ['Two truth values.']],
            ['return (not p) or q', ['The promise is kept if $p$ didn\'t happen, or if $q$ did: $\\neg p \\vee q$.'], { tex: 'p \\Rightarrow q \\;=\\; \\neg p \\vee q' }],
          ],
        },
      },
      {
        code: {
          file: 'symbols.py', fn: 'for_all', notes: [
            ['def for_all(xs, claim):', ['$\\forall x \\in$ `xs`: `claim(x)`.']],
            ['for x in xs:', ['Check the members one at a time.']],
            ['if not claim(x):', ['A counterexample…']],
            ['return False', ['…settles it at once: false.']],
            ['return True', ['No counterexample anywhere: true. (For an empty list this is true too: nothing failed. "All" about nothing is vacuously true.)']],
          ],
        },
      },
      {
        code: {
          file: 'symbols.py', fn: 'exists', notes: [
            ['def exists(xs, claim):', ['$\\exists x \\in$ `xs`: `claim(x)`.']],
            ['for x in xs:', ['Search.']],
            ['if claim(x):', ['An example…']],
            ['return True', ['…settles it: true.']],
            ['return False', ['None found: false. Notice the mirror image of `for_all`: that is the $\\neg\\forall = \\exists\\neg$ swap in code.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Of the four combinations of true and false for $p$ and $q$, in how many is $p \\Rightarrow q$ **true**?',
          answer: 3, compute: () => [true, false].flatMap(p => [true, false].map(q => implies(p, q))).filter(Boolean).length,
          explain: 'Three. Only $p$ true, $q$ false breaks the promise.',
          misconceptions: [{ answer: 1, feedback: 'That is "and". When $p$ is false, $p \\Rightarrow q$ is true whatever $q$ is.' }, { answer: 2, feedback: 'That treats it as "iff". "If $p$ then $q$" makes no promise when $p$ is false.' }],
        },
      },
      {
        predict: {
          prompt: 'The claim "$\\forall x \\in \\{1, 2, \\dots, 10\\}: x^2 < 50$". Is it true (1) or false (0)?',
          answer: 0, compute: () => Number(forAll(range(1, 10), x => x * x < 50)),
          explain: 'False: $8^2 = 64$. One counterexample is enough. ("$\\exists x: x^2 < 50$" would be true.)',
        },
      },
      {
        choice: {
          prompt: 'What is the negation of "every model in the table beats the baseline on every dataset"?',
          options: [
            { text: 'Some model, on some dataset, does not beat the baseline', why: 'Yes. $\\neg\\forall m\\,\\forall d: B(m, d)$ = $\\exists m\\,\\exists d: \\neg B(m, d)$: each $\\forall$ flips to $\\exists$ and the claim gets a not.' },
            { text: 'No model beats the baseline on any dataset', why: 'That is far stronger. One failure is enough to make the original false.' },
            { text: 'Every model fails on some dataset', why: 'That flips one quantifier and leaves the other: $\\forall m\\,\\exists d$. The negation flips both.' },
          ],
          answer: 0,
        },
      },
      { note: '$\\neg$ not, $\\wedge$ and, $\\vee$ inclusive or. $p \\Rightarrow q$ is false only for $p$ true, $q$ false; its contrapositive is the same statement, its converse is not. $\\forall$ is a loop looking for a counterexample, $\\exists$ for an example; negation swaps them. Quantifier order matters.' },
    ],
  },

  {
    id: 'piecewise', title: 'Functions in pieces: |x|, max, ReLU, clip, 𝟙, floor and mod',
    goal: 'Evaluate and read absolute value, max and min, ReLU, clipping, the indicator $\\mathbb 1[\\cdot]$, floor, ceiling and mod, and recognise each in ML formulas.',
    builds: ['logic', 'composition'],
    blocks: [
      { md: `Many functions in ML follow **different rules in different places**. A piecewise definition lists the rules and when each applies:

$$|x| = \\begin{cases} x & \\text{if } x \\ge 0 \\\\ -x & \\text{if } x < 0 \\end{cases}$$

The big brace reads "whichever line's condition holds". That one is **absolute value**: the distance from 0, with the sign thrown away. So $|a - b|$ is the distance between $a$ and $b$, and $\\frac1n\\sum_i|\\hat y_i - y_i|$ is the **mean absolute error**.

- $\\max(a, b)$ and $\\min(a, b)$: the larger and smaller. $\\max_i x_i$: the largest of a list.
- $\\text{ReLU}(z) = \\max(0, z)$: zero for negative inputs, the input itself for positive ones. It is the activation function inside most deep networks: cheap, and (as Part [[#part:part2]] will show) its slope is simply 0 or 1.
- $\\text{clip}(x, a, b)$: $x$ forced into $[a, b]$; three pieces. **Gradient clipping** caps how big a training step can be; PPO, the algorithm used to fine-tune language models from feedback, clips a probability ratio into $[1 - \\epsilon, 1 + \\epsilon]$.
- $\\text{sign}(x)$: $+1$, $0$ or $-1$.

**The indicator** $\\mathbb 1[\\text{condition}]$ (also written $\\mathbb 1\\{\\cdot\\}$ or $\\mathbb I(\\cdot)$) is 1 when the condition is true and 0 when it is false. It turns a yes/no question into a number you can add up. So

$$\\text{accuracy} = \\frac1n\\sum_{i=1}^n \\mathbb 1[\\hat y_i = y_i]$$

counts the hits and divides by $n$. A one-hot label is $y_k = \\mathbb 1[k = c]$: 1 at the correct class $c$, 0 elsewhere.

**Rounding.** $\\lfloor x \\rfloor$ ("floor") is the largest whole number $\\le x$; $\\lceil x \\rceil$ ("ceiling") the smallest $\\ge x$. Floor goes **down**, even for negatives: $\\lfloor -2.5 \\rfloor = -3$. The number of batches of size $B$ needed for $n$ examples is $\\lceil n/B \\rceil$.

**Mod.** $a \\bmod n$ is the remainder after dividing by $n$: $17 \\bmod 5 = 2$. It wraps numbers around a circle of size $n$, which is how a hash table turns a big number into a slot, and how a training loop says "every 100th step" ($t \\bmod 100 = 0$). Python: \`math.floor\`, \`math.ceil\`, \`%\`.` },
      { figure: 'PiecewiseFig', caption: 'Pick a function and slide $x$. The highlighted line of the definition is the piece in charge; the graph shows the corners and jumps where pieces meet.' },
      {
        code: {
          file: 'symbols.py', fn: 'relu', notes: [
            ['def relu(z):', ['One input.']],
            ['if z > 0:', ['The positive piece.']],
            ['return z', ['Pass it through.']],
            ['return 0.0', ['Everything else becomes 0: $\\max(0, z)$.'], { tex: '\\text{ReLU}(z) = \\max(0, z)' }],
          ],
        },
      },
      {
        code: {
          file: 'symbols.py', fn: 'clip', notes: [
            ['def clip(x, low, high):', ['A number and the interval $[\\text{low}, \\text{high}]$.']],
            ['if x < low:', ['Piece 1: below the interval…']],
            ['return low', ['…lift it to the bottom end.']],
            ['if x > high:', ['Piece 2: above it…']],
            ['return high', ['…lower it to the top end.']],
            ['return x', ['Piece 3: already inside, leave it.']],
          ],
        },
      },
      {
        code: {
          file: 'symbols.py', fn: 'accuracy', notes: [
            ['def accuracy(predictions, labels):', ['Predicted and true labels, the same length.']],
            ['hits = 0', ['A running Σ.']],
            ['for p, y in zip(predictions, labels):', ['One example at a time.']],
            ['hits += 1 if p == y else 0', ['The indicator $\\mathbb 1[\\hat y_i = y_i]$: 1 for a hit, 0 for a miss.']],
            ['return hits / len(labels)', ['$\\frac1n\\sum_i \\mathbb 1[\\hat y_i = y_i]$: the fraction correct.'], { tex: '\\frac1n\\sum_{i=1}^n \\mathbb 1[\\hat y_i = y_i]' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Predictions $(1, 0, 1, 1, 0)$, true labels $(1, 1, 1, 0, 0)$. What is the accuracy $\\frac1n\\sum_i\\mathbb 1[\\hat y_i = y_i]$?',
          answer: 0.6, compute: () => accuracy([1, 0, 1, 1, 0], [1, 1, 1, 0, 0]),
          explain: 'Indicators $1, 0, 1, 0, 1$: three hits out of five, 0.6.',
        },
      },
      {
        predict: {
          prompt: 'PPO clips a ratio into $[0.8, 1.2]$. What is $\\text{clip}(1.37, 0.8, 1.2)$?',
          answer: 1.2, compute: () => clip(1.37, 0.8, 1.2),
          explain: '1.37 is above the top end, so it becomes 1.2. (0.5 would become 0.8; 1.05 stays 1.05.)',
        },
      },
      {
        predict: {
          prompt: 'What is $\\lfloor -2.5 \\rfloor + \\text{ReLU}(-4) + (17 \\bmod 5)$?',
          answer: -1, compute: () => Math.floor(-2.5) + relu(-4) + (17 % 5),
          explain: '$-3 + 0 + 2 = -1$. Floor goes down, to $-3$; ReLU of a negative is 0; 17 is 3 fives and 2 over.',
          misconceptions: [{ answer: 0, feedback: 'Floor rounds **down**, so $\\lfloor -2.5 \\rfloor = -3$, not $-2$.' }],
        },
      },
      { note: 'A piecewise function picks a rule by condition. $|x|$ distance from 0; ReLU $= \\max(0, z)$; clip forces into $[a, b]$; $\\mathbb 1[\\cdot]$ turns true/false into 1/0, so averages of indicators are fractions; $\\lfloor\\cdot\\rfloor$ down, $\\lceil\\cdot\\rceil$ up; mod is the remainder.' },
    ],
  },

  {
    id: 'inequalities', title: 'Inequalities: what keeps the order, and what flips it',
    goal: 'Manipulate $<$ and $\\le$ safely, say which operations keep or flip an inequality, prove $a^2 + b^2 \\ge 2ab$ and the triangle inequality, and bound a sum.',
    builds: ['piecewise', 'logarithms'],
    blocks: [
      { md: `Theory in ML papers is mostly **inequalities**: "the error is at most…", "this step never increases the loss", "with probability at least $1 - \\delta$…". You need to move them around without breaking them.

$a < b$: $a$ is less than $b$. $a \\le b$: less than or equal. $a \\ll b$: much less than (informal: "orders of magnitude"). They chain: $a \\le b$ and $b \\le c$ give $a \\le c$.

**The one idea behind every rule:** $a < b$ means exactly that $b - a$ is **positive**. Now check what each operation does to that gap.

1. **Add or subtract the same $c$:** the gap is $(b + c) - (a + c) = b - a$, unchanged. Order **kept**.
2. **Multiply by a positive $c$:** the gap becomes $cb - ca = c(b - a)$, positive times positive. Order **kept**.
3. **Multiply by a negative $c$:** $c(b - a)$ is negative times positive, **negative**: now $cb < ca$. Order **flipped**. Solving $-2x < 6$: divide by $-2$ and flip, $x > -3$.
4. **Apply an increasing function** (one whose graph always rises): bigger in, bigger out, so order **kept**. $e^x$, $\\ln x$ (for positive $x$), $\\sqrt x$ (for $x \\ge 0$) and $x^2$ (for $x \\ge 0$ only) are increasing. A **decreasing** function flips: $1/x$ for positive $x$, since $2 < 4$ but $\\frac12 > \\frac14$.

Rule 4 is behind one of the most-used moves in ML: because $\\ln$ is increasing, **whatever makes $L$ biggest also makes $\\ln L$ biggest**. So maximising a likelihood and maximising its logarithm pick the same parameters (Part [[#part:part4]] does it constantly), and the log is far easier to work with.` },
      { md: `**Two inequalities with one-line proofs.**

*Squares are never negative.* Any real number squared is $\\ge 0$. Apply it to $a - b$: $(a - b)^2 \\ge 0$. Multiply out: $a^2 - 2ab + b^2 \\ge 0$, and add $2ab$ to both sides (rule 1):

$$a^2 + b^2 \\ge 2ab$$

with equality only when $a = b$. A whole family of results in theory papers is this trick: write something as a square, then use "squares are $\\ge 0$".

*The triangle inequality:* $|a + b| \\le |a| + |b|$. A detour can't be shorter than the direct route. Proof: both sides are $\\ge 0$, so it is enough to compare their squares (rule 4: squaring is increasing on non-negatives). $|a + b|^2 = a^2 + 2ab + b^2$ and $(|a| + |b|)^2 = a^2 + 2|a||b| + b^2$. And $ab \\le |a||b|$ always (if $ab$ is negative it is below the positive $|a||b|$; if not, they are equal). So the left square is $\\le$ the right one. The same inequality holds for vector lengths, $\\|\\mathbf u + \\mathbf v\\| \\le \\|\\mathbf u\\| + \\|\\mathbf v\\|$ (Part [[#part:part3]]).

**Bounding a sum.** If every $x_i$ lies between $m$ and $M$, adding the $n$ inequalities $m \\le x_i \\le M$ gives

$$n\\,m \\;\\le\\; \\sum_{i=1}^n x_i \\;\\le\\; n\\,M$$

Crude, but it needs nothing except the extremes, and that is the point of a **bound**: a guarantee about the worst case that you can compute without knowing the details. Learning-theory results are bounds of exactly this kind, made sharper.` },
      { figure: 'InequalityFig', caption: 'Two numbers with $a < b$. Apply an operation to both and see whether the order is kept or flipped. Try multiplying by a negative, and squaring when one is negative.' },
      {
        code: {
          file: 'symbols.py', fn: 'sum_bounds', notes: [
            ['def sum_bounds(xs):', ['A list of numbers.']],
            ['n = len(xs)', ['$n$.']],
            ['return n * min(xs), total(xs), n * max(xs)', ['$n \\cdot \\min$, the sum, $n \\cdot \\max$: the sum always lands between the other two.'], { tex: 'n\\min_i x_i \\le \\sum_i x_i \\le n\\max_i x_i' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'The losses on four batches are $0.2, 0.9, 0.4, 0.7$. Without adding them, what upper bound on the total does $n \\cdot \\max$ give?',
          answer: 3.6, compute: () => sumBounds([0.2, 0.9, 0.4, 0.7])[2], tolerance: 1e-9,
          explain: '$4 \\times 0.9 = 3.6$. The true total is 2.2, inside $[0.8, 3.6]$.',
        },
      },
      {
        choice: {
          prompt: 'Solve $3 - 2x \\le 7$.',
          options: [
            { text: '$x \\ge -2$', why: 'Yes. Subtract 3: $-2x \\le 4$. Divide by $-2$, a negative, so flip: $x \\ge -2$.' },
            { text: '$x \\le -2$', why: 'Dividing by a negative number flips the inequality.' },
            { text: '$x \\ge 2$', why: 'Check the subtraction: $7 - 3 = 4$, and $4 / (-2) = -2$.' },
          ],
          answer: 0,
        },
      },
      {
        choice: {
          prompt: '$a < b$. Which conclusion is **not** safe?',
          options: [
            { text: '$a^2 < b^2$', why: 'Right, that one is not safe: squaring is increasing only on non-negative numbers. $-3 < 1$ but $9 > 1$.' },
            { text: '$e^a < e^b$', why: 'This one is safe: $e^x$ is increasing everywhere.' },
            { text: '$a - 5 < b - 5$', why: 'This one is safe: subtracting the same number keeps the gap.' },
          ],
          answer: 0,
        },
      },
      { note: '$a < b$ means $b - a > 0$. Adding keeps the order; multiplying by a positive keeps it, by a negative flips it; increasing functions ($e^x$, $\\ln$, $\\sqrt{\\;}$) keep it, so $\\arg\\max L = \\arg\\max \\ln L$. $(a - b)^2 \\ge 0$ gives $a^2 + b^2 \\ge 2ab$. $|a + b| \\le |a| + |b|$. $n\\min \\le \\sum \\le n\\max$.' },
    ],
  },
]
