"""Algorithms and computer-science maths, as programs that count their own work: growth rates, loop
costs, merge sort, binary search, floating point and machine epsilon, stable log-sum-exp, a linear
congruential generator, automatic differentiation in both directions, dynamic programming, graphs
and PageRank, and hashing."""
import math


def growth(n):
    """log₂ n, n, n log₂ n, n² and 2ⁿ side by side: how fast each grows."""
    return math.log2(n), n, n * math.log2(n), n * n, 2.0 ** n


def bounded_by(f, g, c, n0, upto=10000):
    """Is f(n) ≤ c·g(n) for every n from n0 to upto? Evidence for f = O(g), with witnesses c and n0."""
    for n in range(n0, upto + 1):
        if f(n) > c * g(n):
            return False
    return True


def matmul_cost(n, m, p):
    """Multiplications in an (n × m) times (m × p) product, counted by running the three loops."""
    count = 0
    for i in range(n):
        for j in range(p):
            for k in range(m):
                count += 1
    return count


def attention_cost(T, d):
    """Multiplications in one attention head: scores Q Kᵀ (T·T·d) plus weights times V (T·T·d)."""
    return matmul_cost(T, d, T) + matmul_cost(T, T, d)


def merge_sort(xs):
    """Sort by splitting in half, sorting each half, and merging: returns the sorted list and the comparisons made."""
    if len(xs) <= 1:
        return list(xs), 0
    mid = len(xs) // 2
    left, c1 = merge_sort(xs[:mid])
    right, c2 = merge_sort(xs[mid:])
    merged = []
    i = j = 0
    comparisons = c1 + c2
    while i < len(left) and j < len(right):
        comparisons += 1
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged += left[i:] + right[j:]
    return merged, comparisons


def binary_search(xs, target):
    """Find target in a sorted list by halving the search range: returns (index or −1, steps taken)."""
    lo, hi = 0, len(xs) - 1
    steps = 0
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


def machine_epsilon():
    """The gap between 1 and the next float: halve e until 1 + e/2 is no longer bigger than 1."""
    e = 1.0
    while 1.0 + e / 2 > 1.0:
        e /= 2
    return e


def float_parts(x):
    """x = mantissa × 2^exponent with the mantissa in [0.5, 1): how a float stores a number."""
    m, e = math.frexp(x)
    return m, e


def naive_logsumexp(zs):
    """log Σ e^z the obvious way: overflows to infinity for large scores."""
    try:
        return math.log(sum(math.exp(z) for z in zs))
    except OverflowError:
        return math.inf


def logsumexp(zs):
    """log Σ e^z stably: pull out the largest score m, so every remaining exponent is at most e⁰ = 1."""
    m = max(zs)
    return m + math.log(sum(math.exp(z - m) for z in zs))


def one_pass_variance(xs):
    """Var = E[x²] − (E[x])²: algebraically right, numerically fragile when the mean is large."""
    n = len(xs)
    s = sum(xs)
    s2 = sum(x * x for x in xs)
    return s2 / n - (s / n) ** 2


def lcg(seed, n, a=1103515245, c=12345, m=2 ** 31):
    """A linear congruential generator: x ← (a x + c) mod m, scaled to [0, 1). Deterministic given the seed."""
    x = seed
    out = []
    for _ in range(n):
        x = (a * x + c) % m
        out.append(x / m)
    return out


class Value:
    """A number that remembers how it was computed, so it can send gradients backwards (reverse-mode autodiff)."""

    def __init__(self, data, parents=(), local_grads=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.local_grads = local_grads

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data + other.data, (self, other), (1.0, 1.0))

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data * other.data, (self, other), (other.data, self.data))

    def exp(self):
        e = math.exp(self.data)
        return Value(e, (self,), (e,))

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
            for p, g in zip(v.parents, v.local_grads):
                p.grad += v.grad * g


class Dual:
    """A number a + b·ε with ε² = 0: carrying a value and its derivative forward together (forward-mode autodiff)."""

    def __init__(self, value, slope=0.0):
        self.value = value
        self.slope = slope

    def __add__(self, other):
        other = other if isinstance(other, Dual) else Dual(other)
        return Dual(self.value + other.value, self.slope + other.slope)

    def __mul__(self, other):
        other = other if isinstance(other, Dual) else Dual(other)
        return Dual(self.value * other.value, self.slope * other.value + self.value * other.slope)


def edit_distance(a, b):
    """The fewest insertions, deletions and substitutions turning a into b, by filling a table of subproblems."""
    D = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        D[i][0] = i
    for j in range(len(b) + 1):
        D[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + cost)
    return D[len(a)][len(b)]


def viterbi(observations, start, trans, emit):
    """The most likely hidden-state path for a hidden Markov model, by dynamic programming in log space."""
    n = len(start)
    best = [math.log(start[s]) + math.log(emit[s][observations[0]]) for s in range(n)]
    back = []
    for o in observations[1:]:
        step, choice = [], []
        for s in range(n):
            prev = max(range(n), key=lambda r: best[r] + math.log(trans[r][s]))
            step.append(best[prev] + math.log(trans[prev][s]) + math.log(emit[s][o]))
            choice.append(prev)
        best, back = step, back + [choice]
    state = max(range(n), key=lambda s: best[s])
    path = [state]
    for choice in reversed(back):
        state = choice[state]
        path.append(state)
    return path[::-1]


def walks(A, k):
    """(Aᵏ)[i][j]: the number of walks of exactly k steps from i to j in a graph with adjacency matrix A."""
    n = len(A)
    P = [[1 if i == j else 0 for j in range(n)] for i in range(n)]
    for _ in range(k):
        P = [[sum(P[i][m] * A[m][j] for m in range(n)) for j in range(n)] for i in range(n)]
    return P


def pagerank(A, d=0.85, iters=100):
    """A random surfer follows a random link with chance d, or jumps anywhere: the stationary distribution."""
    n = len(A)
    out = [sum(row) for row in A]
    r = [1.0 / n] * n
    for _ in range(iters):
        r = [(1 - d) / n + d * sum(r[i] * A[i][j] / out[i] for i in range(n) if out[i]) for j in range(n)]
    return r


def gnn_layer(A, H):
    """One graph-network step: each node takes the average of its own and its neighbours' features."""
    n = len(A)
    out = []
    for i in range(n):
        group = [i] + [j for j in range(n) if A[i][j]]
        out.append([sum(H[j][k] for j in group) / len(group) for k in range(len(H[0]))])
    return out


def poly_hash(s, m, base=31):
    """A rolling polynomial hash: treat the characters as digits in base 31, reduced mod m."""
    h = 0
    for ch in s:
        h = (h * base + ord(ch)) % m
    return h


def hashing_trick(words, m):
    """Turn a bag of words into a fixed-length count vector by hashing each word to one of m slots."""
    v = [0] * m
    for w in words:
        v[poly_hash(w, m)] += 1
    return v


def show_algorithms():
    """Each idea of the algorithms part, once."""
    print("growth at n = 20 (log n, n, n log n, n², 2ⁿ):", growth(20))
    print("multiplications in one attention head, T = 20 tokens, d = 8:", attention_cost(20, 8))
    print("merge sort comparisons for 8 items in reverse:", merge_sort([8, 7, 6, 5, 4, 3, 2, 1])[1])
    print("binary search for 700 in 0..999:", binary_search(list(range(1000)), 700))
    print("machine epsilon:", machine_epsilon(), " 0.1 + 0.2 =", 0.1 + 0.2)
    print("log-sum-exp of (1000, 1001), naive and stable:", naive_logsumexp([1000.0, 1001.0]), logsumexp([1000.0, 1001.0]))
    x = Value(2.0)
    y = x * x + x.exp()
    y.backward()
    print("d/dx (x² + eˣ) at 2 by reverse mode:", x.grad, " by forward mode:", (Dual(2.0, 1.0) * Dual(2.0, 1.0)).slope + math.exp(2.0))
    print("edit distance kitten → sitting:", edit_distance("kitten", "sitting"))
    print("PageRank of a 3-page web:", pagerank([[0, 1, 1], [1, 0, 0], [1, 1, 0]]))
