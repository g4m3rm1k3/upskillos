// Exercises for the algorithms part: every algorithm counts its own work, and every numerical trick
// is checked against the failure it prevents.
import { checks, py } from './checks.js'

export const EXERCISES = {
  'big-o': {
    prompt: py`Write \`find_witnesses(f, g, cs, n0s, upto)\`: search the candidate constants \`cs\` and starting points \`n0s\` (in order) for the first pair with $f(n) \le c\,g(n)$ for all $n_0 \le n \le$ \`upto\`, returning \`(c, n0)\` or \`None\`. Then \`rank_growth(fs, n)\`: the names of the functions in \`fs\` (a dict name → function) sorted by their value at a large \`n\`.`,
    starter: py`import math

def find_witnesses(f, g, cs, n0s, upto=2000):
    ...

def rank_growth(fs, n):
    ...
`,
    solution: py`import math

def find_witnesses(f, g, cs, n0s, upto=2000):
    for c in cs:
        for n0 in n0s:
            if all(f(n) <= c * g(n) for n in range(n0, upto + 1)):
                return c, n0
    return None

def rank_growth(fs, n):
    return sorted(fs, key=lambda name: fs[name](n))
`,
    checks: checks(py`
expect(find_witnesses(lambda n: 3 * n * n + 10 * n, lambda n: n * n, [1, 2, 3, 4], [1, 5, 10]), (4, 10), "witnesses for 3n² + 10n = O(n²)")
expect(find_witnesses(lambda n: n * n, lambda n: 100 * n, [1, 2, 5], [1, 10]), None, "n² is not O(n)")
# With c = 100 a check up to 2000 would pass: n² ≤ 10⁴ n until n = 10⁴. A finite check is evidence, never proof.
expect(find_witnesses(lambda n: n * n, lambda n: 100 * n, [100], [1]), (100, 1), "a finite check fooled by a big constant")
fs = {"n²": lambda n: n * n, "2ⁿ": lambda n: 2.0 ** n, "n log n": lambda n: n * math.log2(n), "log n": math.log2, "n": lambda n: n}
expect(rank_growth(fs, 64), ["log n", "n", "n log n", "n²", "2ⁿ"], "rank_growth at n = 64")
`),
    hints: ['`all(f(n) <= c * g(n) for n in range(n0, upto + 1))` checks one candidate pair.'],
  },

  'loop-costs': {
    prompt: py`Write \`matmul(A, B)\` with three loops that also **counts** its multiplications, returning \`(C, count)\`; check the count is $nmp$. Then write \`training_flops(params, tokens)\` by the $6ND$ rule, and \`context_ratio(T1, T2, d)\`: how many times more attention work the longer context needs.`,
    starter: py`def matmul(A, B):
    ...

def training_flops(params, tokens):
    ...

def context_ratio(T1, T2, d=64):
    ...
`,
    solution: py`def matmul(A, B):
    n, m, p = len(A), len(B), len(B[0])
    C = [[0.0] * p for _ in range(n)]
    count = 0
    for i in range(n):
        for j in range(p):
            for k in range(m):
                C[i][j] += A[i][k] * B[k][j]
                count += 1
    return C, count

def training_flops(params, tokens):
    return 6 * params * tokens

def context_ratio(T1, T2, d=64):
    return (2 * T2 * T2 * d) / (2 * T1 * T1 * d)
`,
    checks: checks(py`
C, count = matmul([[1, 2, 3], [4, 5, 6]], [[1, 0], [0, 1], [1, 1]])
expect(C, [[4, 5], [10, 11]], "the product")
expect(count, 2 * 3 * 2, "the multiplication count n·m·p")
expect(matmul([[1.0] * 7 for _ in range(5)], [[1.0] * 4 for _ in range(7)])[1], 140, "count for 5 × 7 times 7 × 4")
expect(training_flops(7e9, 2e12), 8.4e22, "training_flops for 7B parameters on 2T tokens")
expect(context_ratio(2048, 8192), 16, "attention work, 2048 → 8192 tokens")
`),
    hints: ['Increment the counter in the innermost loop.', 'Attention is $2T^2d$; the ratio cancels the $2d$.'],
  },

  recurrences: {
    prompt: py`Write \`merge_sort(xs)\` returning \`(sorted, comparisons)\`. Then \`master(a, b, c)\`: classify $T(n) = aT(n/b) + n^c$ as \`"top"\`, \`"even"\` or \`"bottom"\` from $a/b^c$, and \`solve_recurrence(a, b, c, n)\`: compute $T(n)$ directly by recursion with $T(1) = 1$. The checks confirm merge sort stays under $n\log_2 n$ comparisons and the recurrence values grow as the master theorem says.`,
    starter: py`import math, random

def merge_sort(xs):
    ...

def master(a, b, c):
    ...

def solve_recurrence(a, b, c, n):
    ...
`,
    solution: py`import math, random

def merge_sort(xs):
    if len(xs) <= 1:
        return list(xs), 0
    mid = len(xs) // 2
    left, c1 = merge_sort(xs[:mid])
    right, c2 = merge_sort(xs[mid:])
    out, i, j, comps = [], 0, 0, c1 + c2
    while i < len(left) and j < len(right):
        comps += 1
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:], comps

def master(a, b, c):
    r = a / b ** c
    return "top" if r < 1 else "even" if r == 1 else "bottom"

def solve_recurrence(a, b, c, n):
    if n <= 1:
        return 1
    return a * solve_recurrence(a, b, c, n // b) + n ** c
`,
    checks: checks(py`
rng = random.Random(0)
xs = [rng.random() for _ in range(1024)]
s, comps = merge_sort(xs)
expect(s, sorted(xs), "merge_sort's output")
assert comps <= 1024 * 10, f"comparisons {comps} should be at most n log₂ n = 10240"
expect([master(2, 2, 1), master(1, 2, 1), master(4, 2, 1), master(7, 2, 2)], ["even", "top", "bottom", "bottom"], "master theorem cases")
r = solve_recurrence(2, 2, 1, 2 ** 12) / solve_recurrence(2, 2, 1, 2 ** 11)
assert 2.0 < r < 2.3, f"merge sort's T(2n)/T(n) should be a little over 2 (n log n), got {r:.3f}"
r = solve_recurrence(4, 2, 1, 2 ** 12) / solve_recurrence(4, 2, 1, 2 ** 11)
expect(r, 4, "T(2n)/T(n) for 4T(n/2) + n (n²)", tol=0.01)
`),
    hints: ['The ratio $a/b^c$: below 1 the top level dominates, equal to 1 every level costs the same, above 1 the leaves dominate.'],
  },

  'logs-in-algorithms': {
    prompt: py`Write \`binary_search(xs, target)\` returning \`(index or -1, steps)\`, then \`max_steps(n)\`: the worst case over all targets (present or not) in \`list(range(n))\`, found by trying them all. The checks compare it with $\lfloor\log_2 n\rfloor + 1$. Finally, \`sort_lower_bound(n)\` $= \lceil\log_2(n!)\rceil$: the comparisons any comparison sort needs in the worst case.`,
    starter: py`import math

def binary_search(xs, target):
    ...

def max_steps(n):
    ...

def sort_lower_bound(n):
    ...
`,
    solution: py`import math

def binary_search(xs, target):
    lo, hi, steps = 0, len(xs) - 1, 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        if xs[mid] == target:
            return mid, steps
        if xs[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1, steps

def max_steps(n):
    xs = list(range(n))
    return max(binary_search(xs, t)[1] for t in [x + d for x in range(-1, n) for d in (0, 0.5)])

def sort_lower_bound(n):
    return math.ceil(math.log2(math.factorial(n)))
`,
    checks: checks(py`
xs = list(range(0, 200, 2))
expect(binary_search(xs, 64)[0], 32, "binary_search finds 64")
expect(binary_search(xs, 65)[0], -1, "binary_search for a missing value")
for n in (1, 7, 8, 100, 1000):
    expect(max_steps(n), math.floor(math.log2(n)) + 1, f"max_steps({n})")
expect(sort_lower_bound(8), 16, "sort_lower_bound(8)")
assert sort_lower_bound(1000) > 1000 * math.log2(1000 / 2) / 2, "the lower bound should be of order n log n"
`),
    hints: ['Try targets between the items too (x + 0.5): unsuccessful searches can take the most steps.', '`math.factorial(n)` is exact for any size; `math.log2` accepts big integers.'],
  },

  'floating-point': {
    prompt: py`Write \`machine_epsilon()\` by halving, \`next_float_gap(x)\`: the gap between $x$ and the next float above it, using \`math.frexp\` (the gap is $2^{e - 53}$ when $x = m \times 2^e$ with $m \in [0.5, 1)$), and \`float16_round(x)\`: round $x$ to the nearest number with 10 mantissa bits (ignore range limits). The checks compare with \`math.ulp\` and show why float16 can't store 1024.5.`,
    starter: py`import math

def machine_epsilon():
    ...

def next_float_gap(x):
    ...

def float16_round(x):
    ...
`,
    solution: py`import math

def machine_epsilon():
    e = 1.0
    while 1.0 + e / 2 > 1.0:
        e /= 2
    return e

def next_float_gap(x):
    m, e = math.frexp(x)
    return 2.0 ** (e - 53)

def float16_round(x):
    m, e = math.frexp(x)
    scale = 2.0 ** 11
    return round(m * scale) / scale * 2.0 ** e
`,
    checks: checks(py`
expect(machine_epsilon(), 2.0 ** -52, "machine_epsilon()")
for x in (1.0, 3.7, 1024.0, 1e-5, 6.02e23):
    expect(next_float_gap(x), math.ulp(x), f"next_float_gap({x})")
assert 0.1 + 0.2 != 0.3 and abs(0.1 + 0.2 - 0.3) < 4 * machine_epsilon(), "0.1 + 0.2 differs from 0.3 by about one ulp"
expect(float16_round(1024.5), 1024, "float16 can't hold 1024.5")
expect(float16_round(1.0 + 2 ** -10), 1.0 + 2 ** -10, "1 + 2⁻¹⁰ is a float16 number")
expect(float16_round(0.1), 0.0999755859375, "0.1 in float16")
`),
    hints: ['With $m \\in [0.5, 1)$, 11 bits of $m$ correspond to the leading 1 plus 10 mantissa bits.', '`math.ulp(x)` is Python\'s built-in "unit in the last place".'],
  },

  stability: {
    prompt: py`Write \`logsumexp(zs)\`, \`log_softmax(zs)\` (as $z_k - \text{LSE}$), and \`stable_sigmoid(z)\` using the two-branch form. Also write \`two_pass_variance(xs)\`. The checks feed huge logits (where the naive formulas produce \`inf\` or \`nan\`) and huge data (where the one-pass variance collapses).`,
    starter: py`import math

def logsumexp(zs):
    ...

def log_softmax(zs):
    ...

def stable_sigmoid(z):
    ...

def two_pass_variance(xs):
    ...
`,
    solution: py`import math

def logsumexp(zs):
    m = max(zs)
    return m + math.log(sum(math.exp(z - m) for z in zs))

def log_softmax(zs):
    lse = logsumexp(zs)
    return [z - lse for z in zs]

def stable_sigmoid(z):
    if z >= 0:
        return 1 / (1 + math.exp(-z))
    e = math.exp(z)
    return e / (1 + e)

def two_pass_variance(xs):
    m = sum(xs) / len(xs)
    return sum((x - m) ** 2 for x in xs) / len(xs)
`,
    checks: checks(py`
expect(logsumexp([1000.0, 1001.0]), 1001 + math.log(1 + math.exp(-1)), "logsumexp of huge scores")
expect(logsumexp([-1000.0, -1001.0]), -1000 + math.log(1 + math.exp(-1)), "logsumexp of very negative scores")
ls = log_softmax([1000.0, 0.0, -1000.0])
expect(ls[0], 0.0, "log-probability of the dominant class", tol=1e-12)
expect(ls[1], -1000.0, "log-probability of the middle class", tol=1e-9)
expect(stable_sigmoid(-800), 0.0, "stable_sigmoid(−800)")
expect(stable_sigmoid(800), 1.0, "stable_sigmoid(800)")
expect(stable_sigmoid(0.3), 1 / (1 + math.exp(-0.3)), "stable_sigmoid(0.3)")
xs = [1e9 + 1, 1e9 + 2, 1e9 + 3]
expect(two_pass_variance(xs), 2 / 3, "two-pass variance of large numbers", tol=1e-6)
`),
    hints: ['For $z < 0$, $\\frac{1}{1 + e^{-z}} = \\frac{e^z}{1 + e^z}$: multiply top and bottom by $e^z$.'],
  },

  'random-numbers': {
    prompt: py`Write \`lcg(seed, n, a, c, m)\`, then \`period(a, c, m, seed)\`: how many steps until the state first repeats. Then show the danger of a weak generator: \`lattice_lines(a, m)\` returns the number of distinct values of $(u_{k+1} - a\,u_k) \bmod 1$ over a full period of the generator with $c = 1$ (each value is one straight line the pairs fall on). And confirm Python's \`random.Random(seed)\` reproduces itself.`,
    starter: py`import random

def lcg(seed, n, a, c, m):
    ...

def period(a, c, m, seed=1):
    ...

def lattice_lines(a, m):
    ...
`,
    solution: py`import random

def lcg(seed, n, a, c, m):
    x, out = seed, []
    for _ in range(n):
        x = (a * x + c) % m
        out.append(x / m)
    return out

def period(a, c, m, seed=1):
    seen = {}
    x, step = seed, 0
    while x not in seen:
        seen[x] = step
        x = (a * x + c) % m
        step += 1
    return step - seen[x]

def lattice_lines(a, m):
    us = lcg(1, m, a, 1, m)
    return len({round((v - a * u) % 1.0, 9) for u, v in zip(us, us[1:])})
`,
    checks: checks(py`
expect(lcg(1, 3, 1103515245, 12345, 2 ** 31)[0], (1103515245 + 12345) % 2 ** 31 / 2 ** 31, "the first LCG number")
expect(period(65, 1, 2048), 2048, "a full-period generator")
expect(period(1, 3, 9), 3, "c shares a factor with m: a short period")
assert lattice_lines(65, 2048) <= 70, "the pairs of a small LCG fall on few lines"
a = [random.Random(42).random() for _ in range(3)]
b = [random.Random(42).random() for _ in range(3)]
expect(a, b, "the same seed gives the same numbers")
`),
    hints: ['Record the step at which each state first appears; the period is the gap when one comes back.', '$u_{k+1} - a u_k$ differs from $c/m$ by a whole number, so mod 1 it takes only a few values: the lines.'],
  },

  autodiff: {
    prompt: py`Build a tiny autodiff engine. Complete \`Value\` with \`__add__\`, \`__mul__\`, \`tanh\` (local derivative $1 - \tanh^2$) and \`backward\` (topological order, then accumulate \`grad += child.grad * local\`). Then use it: a single neuron $y = \tanh(w_1x_1 + w_2x_2 + b)$; the checks compare every gradient with a numerical one, including a value used twice.`,
    starter: py`import math

class Value:
    def __init__(self, data, parents=(), local=()):
        self.data, self.grad, self.parents, self.local = data, 0.0, parents, local

    def __add__(self, other):
        ...

    def __mul__(self, other):
        ...

    def tanh(self):
        ...

    def backward(self):
        ...
`,
    solution: py`import math

class Value:
    def __init__(self, data, parents=(), local=()):
        self.data, self.grad, self.parents, self.local = data, 0.0, parents, local

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data + other.data, (self, other), (1.0, 1.0))

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data * other.data, (self, other), (other.data, self.data))

    def tanh(self):
        t = math.tanh(self.data)
        return Value(t, (self,), (1 - t * t,))

    def backward(self):
        order, seen = [], set()
        def visit(v):
            if id(v) not in seen:
                seen.add(id(v))
                for p in v.parents:
                    visit(p)
                order.append(v)
        visit(self)
        self.grad = 1.0
        for v in reversed(order):
            for p, g in zip(v.parents, v.local):
                p.grad += v.grad * g
`,
    checks: checks(py`
def neuron(w1, w2, b, x1, x2):
    return math.tanh(w1 * x1 + w2 * x2 + b)
vals = dict(w1=0.7, w2=-1.3, b=0.2, x1=1.5, x2=0.4)
V = {k: Value(v) for k, v in vals.items()}
y = (V["w1"] * V["x1"] + V["w2"] * V["x2"] + V["b"]).tanh()
y.backward()
expect(y.data, neuron(**vals), "the neuron's output")
for k in vals:
    up, dn = dict(vals), dict(vals)
    up[k] += 1e-6
    dn[k] -= 1e-6
    expect(V[k].grad, (neuron(**up) - neuron(**dn)) / 2e-6, f"∂y/∂{k}", tol=1e-6)
x = Value(3.0)
z = x * x * x + x * 2.0
z.backward()
expect(x.grad, 3 * 9 + 2, "d/dx (x³ + 2x) at 3: x used four times")
`),
    hints: ['`tanh`\'s local derivative is $1 - \\tanh^2$, computed from the output.', 'Visit parents before the node itself, then walk the list backwards so each node\'s gradient is complete before it is passed on.'],
  },

  'dynamic-programming': {
    prompt: py`Write \`edit_distance(a, b)\` with the table, then \`fib_calls(n)\`: how many calls the **naive** recursive Fibonacci makes for $F(n)$ (count them), against \`fib_dp(n)\`, which fills a table in $n$ steps. Finally \`min_cost_path(grid)\`: the cheapest path from the top-left to the bottom-right moving only right or down, summing the cells (a small Bellman equation).`,
    starter: py`def edit_distance(a, b):
    ...

def fib_calls(n):
    ...

def fib_dp(n):
    ...

def min_cost_path(grid):
    ...
`,
    solution: py`def edit_distance(a, b):
    D = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    return D[-1][-1]

def fib_calls(n):
    count = 0
    def fib(k):
        nonlocal count
        count += 1
        return k if k < 2 else fib(k - 1) + fib(k - 2)
    fib(n)
    return count

def fib_dp(n):
    f = [0, 1]
    for k in range(2, n + 1):
        f.append(f[-1] + f[-2])
    return f[n]

def min_cost_path(grid):
    R, C = len(grid), len(grid[0])
    best = [[0] * C for _ in range(R)]
    for i in range(R):
        for j in range(C):
            if i == 0 and j == 0:
                best[i][j] = grid[0][0]
            else:
                up = best[i - 1][j] if i > 0 else float("inf")
                left = best[i][j - 1] if j > 0 else float("inf")
                best[i][j] = grid[i][j] + min(up, left)
    return best[-1][-1]
`,
    checks: checks(py`
expect(edit_distance("kitten", "sitting"), 3, "kitten → sitting")
expect(edit_distance("", "abc"), 3, "empty → abc")
expect(edit_distance("intention", "execution"), 5, "intention → execution")
expect(fib_dp(30), 832040, "fib_dp(30)")
expect(fib_calls(20), 21891, "calls made by naive recursion for F(20)")
expect(min_cost_path([[1, 3, 1], [1, 5, 1], [4, 2, 1]]), 7, "the cheapest path through the grid")
`),
    hints: ['Use `nonlocal count` inside the inner function to update the counter.', 'The best cost into a cell is its own cost plus the cheaper of the best costs above and to the left.'],
  },

  graphs: {
    prompt: py`Write \`mat_pow(A, k)\` and check it counts walks by comparing with \`count_walks(A, i, j, k)\`, a brute-force recursive count. Then \`pagerank(A, d, iters)\` and \`gnn_mean(A, H)\` (each node averages itself and its neighbours). The checks confirm PageRank adds to 1, and that two rounds of message passing let information travel two hops.`,
    starter: py`def mat_pow(A, k):
    ...

def count_walks(A, i, j, k):
    ...

def pagerank(A, d=0.85, iters=100):
    ...

def gnn_mean(A, H):
    ...
`,
    solution: py`def mat_pow(A, k):
    n = len(A)
    P = [[int(i == j) for j in range(n)] for i in range(n)]
    for _ in range(k):
        P = [[sum(P[i][m] * A[m][j] for m in range(n)) for j in range(n)] for i in range(n)]
    return P

def count_walks(A, i, j, k):
    if k == 0:
        return int(i == j)
    return sum(count_walks(A, m, j, k - 1) for m in range(len(A)) if A[i][m])

def pagerank(A, d=0.85, iters=100):
    n = len(A)
    out = [sum(r) for r in A]
    r = [1 / n] * n
    for _ in range(iters):
        r = [(1 - d) / n + d * sum(r[i] * A[i][j] / out[i] for i in range(n) if out[i]) for j in range(n)]
    return r

def gnn_mean(A, H):
    n = len(A)
    out = []
    for i in range(n):
        group = [i] + [j for j in range(n) if A[i][j]]
        out.append([sum(H[j][f] for j in group) / len(group) for f in range(len(H[0]))])
    return out
`,
    checks: checks(py`
A = [[0, 1, 1, 0], [1, 0, 0, 1], [1, 1, 0, 0], [0, 0, 1, 0]]
for k in (1, 2, 3, 4):
    P = mat_pow(A, k)
    for i in range(4):
        for j in range(4):
            expect(P[i][j], count_walks(A, i, j, k), f"walks {i}→{j} of length {k}")
r = pagerank(A)
expect(sum(r), 1, "PageRank adds to 1", tol=1e-9)
line = [[0, 1, 0], [1, 0, 1], [0, 1, 0]]
H = [[1.0], [0.0], [0.0]]
one = gnn_mean(line, H)
two = gnn_mean(line, one)
expect(one[2][0], 0, "after one round, node 3 hasn't heard from node 1")
assert two[2][0] > 0, "after two rounds it has"
`),
    hints: ['A walk of length $k$ from $i$ is one edge $i \\to m$ followed by a walk of length $k - 1$ from $m$.'],
  },

  hashing: {
    prompt: py`Write \`poly_hash(s, m)\` (base 31, Horner's rule), then a tiny hash table: \`build_table(keys, m)\` returning \`m\` lists (buckets), and \`lookup(table, key)\` searching only the right bucket. Finally \`average_others(keys, m)\`: the average, over keys, of how many **other** keys share its bucket; the checks compare it with $\frac{n-1}{m}$.`,
    starter: py`import random

def poly_hash(s, m, base=31):
    ...

def build_table(keys, m):
    ...

def lookup(table, key):
    ...

def average_others(keys, m):
    ...
`,
    solution: py`import random

def poly_hash(s, m, base=31):
    h = 0
    for ch in s:
        h = (h * base + ord(ch)) % m
    return h

def build_table(keys, m):
    table = [[] for _ in range(m)]
    for k in keys:
        table[poly_hash(k, m)].append(k)
    return table

def lookup(table, key):
    return key in table[poly_hash(key, len(table))]

def average_others(keys, m):
    table = build_table(keys, m)
    return sum(len(table[poly_hash(k, m)]) - 1 for k in keys) / len(keys)
`,
    checks: checks(py`
expect(poly_hash("cat", 97), (99 * 31 * 31 + 97 * 31 + 116) % 97, "poly_hash('cat', 97)")
rng = random.Random(5)
keys = list({"".join(rng.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(8)) for _ in range(2000)})
T = build_table(keys, 4001)
expect(all(lookup(T, k) for k in keys[:200]), True, "every stored key is found")
expect(lookup(T, "notakey!"), False, "a missing key is not found")
expect(average_others(keys, 4001), (len(keys) - 1) / 4001, "average others per bucket", tol=0.15)
`),
    hints: ['Each key\'s bucket holds the key itself plus the others; subtract 1.'],
  },
}
