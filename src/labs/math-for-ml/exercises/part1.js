// Part 1 exercises: each turns the lesson's notation into a few lines of Python.
import { checks, py } from './checks.js'

export const EXERCISES = {
  'symbols-welcome': {
    prompt: py`Write \`predict(w, b, x)\`, which returns $\hat y = wx + b$. Then use it to fill \`scores\` with the predicted score for each number of hours in \`hours\`, with $w = 3$ and $b = 50$.`,
    starter: py`def predict(w, b, x):
    ...

hours = [1, 2, 3, 4]
scores = []   # one prediction per entry of hours
`,
    solution: py`def predict(w, b, x):
    return w * x + b

hours = [1, 2, 3, 4]
scores = [predict(3, 50, x) for x in hours]
`,
    checks: checks(py`
expect(predict(2.5, -1, 4), 9, "predict(2.5, -1, 4)")
expect(predict(0, 7, 100), 7, "predict(0, 7, 100)")
expect(predict(-2, 0, 5), -10, "predict(-2, 0, 5)")
expect(scores, [53, 56, 59, 62], "scores")
`),
    hints: ['Multiply before adding: `w * x + b`.', 'A list comprehension: `[predict(3, 50, x) for x in hours]`.'],
  },

  functions: {
    prompt: py`A function's graph is the set of all its input–output pairs. Write \`f(x)\` for $f(x) = x^2 - 2x$, then \`table(f, xs)\`, which returns the list of pairs $(x, f(x))$ as tuples, one for each \`x\` in \`xs\`. \`table\` must work for any function you pass it.`,
    starter: py`def f(x):
    ...

def table(f, xs):
    ...
`,
    solution: py`def f(x):
    return x ** 2 - 2 * x

def table(f, xs):
    return [(x, f(x)) for x in xs]
`,
    checks: checks(py`
expect(f(3), 3, "f(3)")
expect(f(0), 0, "f(0)")
expect(f(-1), 3, "f(-1)")
expect(table(f, [0, 1, 2]), [(0, 0), (1, -1), (2, 0)], "table(f, [0, 1, 2])")
expect(table(lambda x: 3 * x + 1, [1, 2]), [(1, 4), (2, 7)], "table(lambda x: 3 * x + 1, [1, 2])")
`),
    hints: ['`x ** 2` is $x^2$ in Python.', '`table` only calls the `f` it was given: `[(x, f(x)) for x in xs]`.'],
  },

  subscripts: {
    prompt: py`Maths counts examples from 1; Python counts from 0. Write \`example(i, xs, ys)\`, which returns the pair $(x_i, y_i)$ for the **maths** index $i$ (so \`example(1, …)\` is the first example). Then write \`last(xs)\`, which returns $x_n$.`,
    starter: py`def example(i, xs, ys):
    ...

def last(xs):
    ...
`,
    solution: py`def example(i, xs, ys):
    return xs[i - 1], ys[i - 1]

def last(xs):
    return xs[len(xs) - 1]
`,
    checks: checks(py`
xs, ys = [1, 2, 3, 4], [52, 55, 61, 64]
expect(example(1, xs, ys), (1, 52), "example(1, xs, ys)")
expect(example(3, xs, ys), (3, 61), "example(3, xs, ys)")
expect(example(4, xs, ys), (4, 64), "example(4, xs, ys)")
expect(last([2, 4, 9]), 9, "last([2, 4, 9])")
`),
    hints: ['Maths index $i$ is Python index `i - 1`.', '$n$ is `len(xs)`, so $x_n$ is `xs[len(xs) - 1]` (or `xs[-1]`).'],
  },

  sigma: {
    prompt: py`Write Σ as the loop it is. \`total(xs)\` returns $\sum_{i=1}^n x_i$ using a \`for\` loop (not the built-in \`sum\`). \`mean(xs)\` returns $\frac1n\sum_{i=1}^n x_i$. \`sse(w, b, xs, ys)\` returns the sum of squared errors $\sum_{i=1}^n (w x_i + b - y_i)^2$.`,
    starter: py`def total(xs):
    s = 0
    ...

def mean(xs):
    ...

def sse(w, b, xs, ys):
    ...
`,
    solution: py`def total(xs):
    s = 0
    for x in xs:
        s = s + x
    return s

def mean(xs):
    return total(xs) / len(xs)

def sse(w, b, xs, ys):
    s = 0
    for x, y in zip(xs, ys):
        s = s + (w * x + b - y) ** 2
    return s
`,
    checks: checks(py`
expect(total([2, 4, 9]), 15, "total([2, 4, 9])")
expect(total([]), 0, "total([]) (an empty sum)")
expect(mean([52, 55, 61, 64]), 58, "mean([52, 55, 61, 64])")
expect(sse(4, 48, [1, 2, 3, 4], [52, 55, 61, 64]), 2, "sse(4, 48, hours, scores)")
expect(sse(0, 0, [1, 2], [3, 4]), 25, "sse(0, 0, [1, 2], [3, 4])")
`),
    hints: ['Start a running total at 0 and add one term per pass of the loop.', 'For `sse`, loop over `zip(xs, ys)` so you have $x_i$ and $y_i$ together.'],
  },

  powers: {
    prompt: py`Write \`power(x, n)\` for any **whole number** $n$ (positive, zero or negative), using only multiplication and division in a loop, not \`**\`. $x^0 = 1$ (nothing multiplied), and $x^{-n} = 1/x^n$.`,
    starter: py`def power(x, n):
    ...
`,
    solution: py`def power(x, n):
    p = 1.0
    for _ in range(abs(n)):
        p = p * x
    return p if n >= 0 else 1 / p
`,
    checks: checks(py`
expect(power(2, 3), 8, "power(2, 3)")
expect(power(5, 0), 1, "power(5, 0)")
expect(power(2, -2), 0.25, "power(2, -2)")
expect(power(-3, 3), -27, "power(-3, 3)")
expect(power(1.5, 4), 1.5 ** 4, "power(1.5, 4)")
for a, b in [(2, 3), (-1, 4), (3, -5)]:
    expect(power(2, a) * power(2, b), power(2, a + b), f"power(2, {a}) * power(2, {b}) compared with power(2, {a + b})")
`),
    hints: ['Multiply `abs(n)` copies of `x` together, starting from 1.', 'If `n` is negative, return one over that product.'],
  },

  'number-e': {
    prompt: py`Write \`compound(n)\`, the growth of 1 after one year at 100% interest paid in $n$ slices: $\left(1 + \frac1n\right)^n$. Then write \`slices_needed(gap)\`: the smallest $n$ for which $e - \left(1 + \frac1n\right)^n$ is less than \`gap\`. (\`math.e\` is $e$.)`,
    starter: py`import math

def compound(n):
    ...

def slices_needed(gap):
    ...
`,
    solution: py`import math

def compound(n):
    return (1 + 1 / n) ** n

def slices_needed(gap):
    n = 1
    while math.e - compound(n) >= gap:
        n = n + 1
    return n
`,
    checks: checks(py`
expect(compound(1), 2, "compound(1)")
expect(compound(2), 2.25, "compound(2)")
expect(compound(12), (13 / 12) ** 12, "compound(12)")
assert compound(1000) < math.e, "compound(1000) should still be below e: it climbs toward e but never reaches it"
n = 1
while math.e - (1 + 1 / n) ** n >= 0.01:
    n += 1
expect(slices_needed(0.01), n, "slices_needed(0.01)")
expect(slices_needed(0.5), 2, "slices_needed(0.5)")
`),
    hints: ['Start at `n = 1` and count up while the gap is still too big.'],
  },

  logarithms: {
    prompt: py`Two parts.

1. \`doublings(x)\`: the smallest whole number $k$ with $2^k \ge x$ (for $x \ge 1$), found by repeated doubling in a loop. That is $\lceil \log_2 x \rceil$: a logarithm answers "what power?".
2. \`log_prob(ps)\`: the log of the product of the probabilities in \`ps\`, computed as $\sum_i \ln p_i$ with \`math.log\`. The checks multiply 2000 probabilities of 0.5, which underflows to 0.0 as a product; your sum of logs must still give the right answer.`,
    starter: py`import math

def doublings(x):
    ...

def log_prob(ps):
    ...
`,
    solution: py`import math

def doublings(x):
    k, v = 0, 1
    while v < x:
        v = v * 2
        k = k + 1
    return k

def log_prob(ps):
    return sum(math.log(p) for p in ps)
`,
    checks: checks(py`
expect(doublings(1), 0, "doublings(1)")
expect(doublings(8), 3, "doublings(8)")
expect(doublings(9), 4, "doublings(9)")
expect(doublings(1000), 10, "doublings(1000)")
ps = [0.5] * 2000
assert math.prod(ps) == 0.0, "(the product really does underflow)"
expect(log_prob(ps), -2000 * math.log(2), "log_prob([0.5] * 2000)")
expect(log_prob([0.2, 0.5]), math.log(0.1), "log_prob([0.2, 0.5])")
`),
    hints: ['Keep doubling `v` from 1 and count the doublings until `v >= x`.', 'The log of a product is the sum of the logs: $\\ln(ab) = \\ln a + \\ln b$.'],
  },

  composition: {
    prompt: py`Write \`compose(f, g)\`, which returns a **new function** that computes $f(g(x))$. Then build the sigmoid $\sigma(z) = \frac1{1 + e^{-z}}$ as a chain of four small functions, \`flip\`, \`exponentiate\`, \`add_one\` and \`one_over\`, joined with \`compose\`, and assign it to \`sigmoid\`.`,
    starter: py`import math

def compose(f, g):
    ...

def flip(z): return -z
def exponentiate(z): return math.exp(z)
def add_one(z): return 1 + z
def one_over(z): return 1 / z

sigmoid = None   # build it with compose
`,
    solution: py`import math

def compose(f, g):
    return lambda x: f(g(x))

def flip(z): return -z
def exponentiate(z): return math.exp(z)
def add_one(z): return 1 + z
def one_over(z): return 1 / z

sigmoid = compose(one_over, compose(add_one, compose(exponentiate, flip)))
`,
    checks: checks(py`
expect(compose(lambda x: x + 1, lambda x: 2 * x)(5), 11, "compose(add 1, double)(5)")
expect(compose(lambda x: 2 * x, lambda x: x + 1)(5), 12, "compose(double, add 1)(5): the order matters")
assert callable(sigmoid), "sigmoid should be a function built with compose"
expect(sigmoid(0), 0.5, "sigmoid(0)")
expect(sigmoid(2), 1 / (1 + math.exp(-2)), "sigmoid(2)")
for z in [-3, -0.5, 1, 4]:
    expect(sigmoid(-z), 1 - sigmoid(z), f"sigmoid(-{z}) compared with 1 - sigmoid({z})")
`),
    hints: ['`compose` returns `lambda x: f(g(x))`: `g` runs first.', 'The first operation is the innermost: `compose(one_over, compose(add_one, compose(exponentiate, flip)))`.'],
  },

  greek: {
    prompt: py`Papers write one step of training as $\theta \leftarrow \theta - \eta\,\nabla_\theta\mathcal L$: parameters θ (theta), learning rate η (eta), gradient ∇. Write \`step(theta, grad, eta)\` for lists \`theta\` and \`grad\` of the same length, returning the new parameter list. Then write \`is_probability(p)\`, true exactly when $p \in [0, 1]$.`,
    starter: py`def step(theta, grad, eta):
    ...

def is_probability(p):
    ...
`,
    solution: py`def step(theta, grad, eta):
    return [t - eta * g for t, g in zip(theta, grad)]

def is_probability(p):
    return 0 <= p <= 1
`,
    checks: checks(py`
expect(step([1.0, 2.0], [0.5, -1.0], 0.1), [0.95, 2.1], "step([1, 2], [0.5, -1], 0.1)")
expect(step([3.0], [0.0], 0.5), [3.0], "step([3], [0], 0.5) (a zero gradient changes nothing)")
for p, want in [(0, True), (1, True), (0.3, True), (-0.1, False), (1.2, False)]:
    expect(is_probability(p), want, f"is_probability({p})")
`),
    hints: ['Pair each parameter with its gradient entry: `zip(theta, grad)`.', 'Square brackets include their ends: $[0, 1]$ means $0 \\le p \\le 1$.'],
  },

  argmin: {
    prompt: py`Write \`argmin(f, xs)\`, which returns the input in \`xs\` that gives the smallest $f(x)$, and \`minimum(f, xs)\`, which returns that smallest value. Use a loop that remembers the best so far. If two inputs tie, return the first.`,
    starter: py`def argmin(f, xs):
    ...

def minimum(f, xs):
    ...
`,
    solution: py`def argmin(f, xs):
    best = xs[0]
    for x in xs[1:]:
        if f(x) < f(best):
            best = x
    return best

def minimum(f, xs):
    return f(argmin(f, xs))
`,
    checks: checks(py`
L = lambda x: (x - 3) ** 2 + 1
grid = [i / 10 for i in range(-20, 81)]
expect(argmin(L, grid), 3.0, "argmin(L, grid) for L(x) = (x - 3)^2 + 1")
expect(minimum(L, grid), 1.0, "minimum(L, grid)")
expect(argmin(lambda x: -x, [1, 5, 2]), 5, "argmin(lambda x: -x, [1, 5, 2]) (argmax of x)")
expect(argmin(lambda x: x * x, [-2, 2, 1, -1]), 1, "argmin(x², [-2, 2, 1, -1]) (first of a tie)")
`),
    hints: ['Start with `best = xs[0]` and replace it whenever a later `x` gives a strictly smaller `f(x)`.', '`minimum` is just $f$ evaluated at the argmin.'],
  },
  sets: {
    prompt: py`Write the set-builder definitions as Python sets over \`U = set(range(1, 31))\`: \`A\` $= \{x \in U \mid x \text{ is even}\}$ and \`B\` $= \{x \in U \mid x \bmod 3 = 0\}$ as comprehensions. Then compute \`both\` $= A \cap B$, \`either\` $= A \cup B$, \`only_a\` $= A \setminus B$ and \`not_a\` $= A^c$ (complement within $U$) using Python's set operators. Finally write \`interval(a, b, brackets)\`, returning a **function** that tests membership of the interval, so \`interval(0, 1, "(]")(1)\` is \`True\`.`,
    starter: py`U = set(range(1, 31))
A = None
B = None
both = None
either = None
only_a = None
not_a = None

def interval(a, b, brackets):
    ...
`,
    solution: py`U = set(range(1, 31))
A = {x for x in U if x % 2 == 0}
B = {x for x in U if x % 3 == 0}
both = A & B
either = A | B
only_a = A - B
not_a = U - A

def interval(a, b, brackets):
    def test(x):
        left = a <= x if brackets[0] == "[" else a < x
        right = x <= b if brackets[1] == "]" else x < b
        return left and right
    return test
`,
    checks: checks(py`
expect(sorted(both), [6, 12, 18, 24, 30], "sorted(both)")
expect(len(either), 20, "len(either)")
expect(len(only_a), 10, "len(only_a)")
expect(sorted(not_a)[:4], [1, 3, 5, 7], "the first members of not_a")
assert both <= A and both <= B, "A ∩ B should be a subset of both A and B"
assert len(either) == len(A) + len(B) - len(both), "|A ∪ B| should be |A| + |B| − |A ∩ B| (the overlap was counted twice)"
expect(interval(0, 1, "(]")(1), True, 'interval(0, 1, "(]")(1)')
expect(interval(0, 1, "(]")(0), False, 'interval(0, 1, "(]")(0)')
expect(interval(-2, 3, "[)")(-2), True, 'interval(-2, 3, "[)")(-2)')
expect(sum(1 for k in range(-10, 10) if interval(-2, 3, "[)")(k)), 5, "whole numbers in [-2, 3)")
`),
    hints: ['A set comprehension: `{x for x in U if x % 2 == 0}`.', 'Python\'s operators: `&` is ∩, `|` is ∪, `-` is ∖.', '`interval` returns an inner function (a closure) that remembers `a`, `b` and `brackets`.'],
  },

  logic: {
    prompt: py`Write \`implies(p, q)\`, \`for_all(xs, claim)\` and \`exists(xs, claim)\` with loops (not the built-ins \`all\`/\`any\`). Then write \`truth_table(f)\`: the list of \`f(p, q)\` for \`(p, q)\` in the order TT, TF, FT, FF. The checks use it to confirm that $p \Rightarrow q$ matches its contrapositive in every row but not its converse, and check De Morgan's law $\neg(\forall x: P) = \exists x: \neg P$ on some lists.`,
    starter: py`def implies(p, q):
    ...

def for_all(xs, claim):
    ...

def exists(xs, claim):
    ...

def truth_table(f):
    ...
`,
    solution: py`def implies(p, q):
    return (not p) or q

def for_all(xs, claim):
    for x in xs:
        if not claim(x):
            return False
    return True

def exists(xs, claim):
    for x in xs:
        if claim(x):
            return True
    return False

def truth_table(f):
    return [f(p, q) for p in (True, False) for q in (True, False)]
`,
    checks: checks(py`
expect(truth_table(implies), [True, False, True, True], "truth_table(implies)")
expect(truth_table(lambda p, q: implies(not q, not p)), truth_table(implies), "the contrapositive's column")
assert truth_table(lambda p, q: implies(q, p)) != truth_table(implies), "the converse should differ from p ⇒ q"
expect(for_all([], lambda x: x > 100), True, "for_all over an empty list (vacuously true)")
expect(exists([], lambda x: True), False, "exists over an empty list")
even = lambda x: x % 2 == 0
for xs in [[2, 4, 6], [2, 5, 6], [1, 3], []]:
    expect(not for_all(xs, even), exists(xs, lambda x: not even(x)), f"¬∀ compared with ∃¬ on {xs}")
`),
    hints: ['`for_all` returns `False` at the first counterexample; `exists` returns `True` at the first example.', 'Two nested loops in one comprehension: `for p in (True, False) for q in (True, False)`.'],
  },

  piecewise: {
    prompt: py`Write \`relu(z)\`, \`clip(x, low, high)\` and \`indicator(condition)\` (1 if true, else 0) with \`if\` statements, then use \`indicator\` to write \`accuracy(predictions, labels)\` as $\frac1n\sum_i\mathbb 1[\hat y_i = y_i]$, and \`one_hot(c, k)\`: the list $(\mathbb 1[j = c])_{j=0}^{k-1}$. Finally, \`batches(n, size)\`: how many batches of \`size\` are needed for \`n\` examples, $\lceil n/\text{size}\rceil$, **without** \`math.ceil\` (use \`//\` and \`%\`).`,
    starter: py`def relu(z):
    ...

def clip(x, low, high):
    ...

def indicator(condition):
    ...

def accuracy(predictions, labels):
    ...

def one_hot(c, k):
    ...

def batches(n, size):
    ...
`,
    solution: py`def relu(z):
    if z > 0:
        return z
    return 0.0

def clip(x, low, high):
    if x < low:
        return low
    if x > high:
        return high
    return x

def indicator(condition):
    return 1 if condition else 0

def accuracy(predictions, labels):
    return sum(indicator(p == y) for p, y in zip(predictions, labels)) / len(labels)

def one_hot(c, k):
    return [indicator(j == c) for j in range(k)]

def batches(n, size):
    return n // size + (1 if n % size else 0)
`,
    checks: checks(py`
expect([relu(z) for z in (-2, 0, 3.5)], [0, 0, 3.5], "relu at -2, 0, 3.5")
expect([clip(r, 0.8, 1.2) for r in (0.5, 1.0, 1.37)], [0.8, 1.0, 1.2], "clip into [0.8, 1.2]")
expect(accuracy([1, 0, 1, 1, 0], [1, 1, 1, 0, 0]), 0.6, "accuracy")
expect(one_hot(2, 4), [0, 0, 1, 0], "one_hot(2, 4)")
import math
for n, b in [(100, 32), (96, 32), (1, 10), (0, 5)]:
    expect(batches(n, b), math.ceil(n / b), f"batches({n}, {b})")
`),
    hints: ['`n // size` is $\\lfloor n/\\text{size}\\rfloor$; you need one more batch exactly when there is a remainder.'],
  },

  inequalities: {
    prompt: py`Test the rules of the lesson by brute force. Write \`order_kept(g, pairs)\`: true if \`g(a) < g(b)\` for **every** pair \`(a, b)\` in \`pairs\` (each pair has $a < b$). Then set \`kept\` to the names, from the dict \`OPS\`, of the operations that keep order on **all** of \`PAIRS\` (some pairs have negative numbers). Finally, write \`am_gm_gap(a, b)\` $= a^2 + b^2 - 2ab$; the checks confirm it is never negative.`,
    starter: py`import math

def order_kept(g, pairs):
    ...

PAIRS = [(-3, 1), (-2, -1), (0.5, 2), (1, 4), (-1, 0)]
OPS = {
    "add 5": lambda x: x + 5,
    "times 3": lambda x: 3 * x,
    "times -2": lambda x: -2 * x,
    "square": lambda x: x * x,
    "exp": math.exp,
    "cube": lambda x: x ** 3,
}
kept = None

def am_gm_gap(a, b):
    ...
`,
    solution: py`import math

def order_kept(g, pairs):
    return all(g(a) < g(b) for a, b in pairs)

PAIRS = [(-3, 1), (-2, -1), (0.5, 2), (1, 4), (-1, 0)]
OPS = {
    "add 5": lambda x: x + 5,
    "times 3": lambda x: 3 * x,
    "times -2": lambda x: -2 * x,
    "square": lambda x: x * x,
    "exp": math.exp,
    "cube": lambda x: x ** 3,
}
kept = sorted(name for name, g in OPS.items() if order_kept(g, PAIRS))

def am_gm_gap(a, b):
    return a * a + b * b - 2 * a * b
`,
    checks: checks(py`
expect(order_kept(lambda x: x + 1, [(1, 2)]), True, "order_kept(add 1, [(1, 2)])")
expect(order_kept(lambda x: -x, [(1, 2)]), False, "order_kept(negate, [(1, 2)])")
expect(sorted(kept), ["add 5", "cube", "exp", "times 3"], "kept")
import random
rng = random.Random(0)
for _ in range(200):
    a, b = rng.uniform(-10, 10), rng.uniform(-10, 10)
    assert am_gm_gap(a, b) >= -1e-9, f"am_gm_gap({a}, {b}) is negative"
expect(am_gm_gap(3, 3), 0, "am_gm_gap(3, 3) (equality when a = b)")
`),
    hints: ['Squaring breaks the order when negatives are involved: $(-3)^2 > 1^2$.', '$x^3$ is increasing everywhere, even for negatives.', '$a^2 + b^2 - 2ab = (a - b)^2$.'],
  },
}
