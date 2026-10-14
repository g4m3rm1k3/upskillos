// Proof-and-counting exercises: search for counterexamples, build the objects a proof talks about, and
// check every counting formula against brute-force enumeration.
import { checks, py } from './checks.js'

export const EXERCISES = {
  proof: {
    prompt: py`Fermat guessed that every number $F_n = 2^{2^n} + 1$ is prime. Write \`smallest_factor(n)\` (trial division up to $\sqrt n$), \`is_prime(n)\`, and \`first_counterexample(claim, candidates)\`. Then search $n = 0, 1, 2, \dots$ for the first $n$ where $F_n$ is **not** prime and store it in \`fermat_fails_at\`, with its smallest factor in \`fermat_factor\`. (Fermat checked $n = 0$ to $4$; all prime.)`,
    starter: py`def smallest_factor(n):
    ...

def is_prime(n):
    ...

def first_counterexample(claim, candidates):
    ...

fermat_fails_at = None
fermat_factor = None
`,
    solution: py`def smallest_factor(n):
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n

def is_prime(n):
    return n > 1 and smallest_factor(n) == n

def first_counterexample(claim, candidates):
    for c in candidates:
        if not claim(c):
            return c
    return None

fermat_fails_at = first_counterexample(lambda n: is_prime(2 ** (2 ** n) + 1), range(7))
fermat_factor = smallest_factor(2 ** (2 ** fermat_fails_at) + 1)
`,
    checks: checks(py`
expect([smallest_factor(n) for n in (2, 9, 91, 97)], [2, 3, 7, 97], "smallest_factor of 2, 9, 91, 97")
expect([is_prime(n) for n in (0, 1, 2, 15, 41)], [False, False, True, False, True], "is_prime of 0, 1, 2, 15, 41")
expect(first_counterexample(lambda n: n < 5, range(10)), 5, "first_counterexample(n < 5)")
expect(first_counterexample(lambda n: n < 50, range(10)), None, "first_counterexample when nothing fails")
expect(fermat_fails_at, 5, "fermat_fails_at")
expect(fermat_factor, 641, "fermat_factor")
`),
    hints: ['Only test divisors $d$ with $d \\times d \\le n$.', '$F_5 = 2^{32} + 1 = 4294967297$; trial division finds its factor quickly because it is small.'],
  },

  contradiction: {
    prompt: py`Two experiments that match the lesson's proofs. (1) Write \`euclid_step(primes)\` returning \`(Q, smallest prime factor of Q)\`, and \`new_prime_every_time(k)\`: for each list of the first $j$ primes, $j = 1, \dots, k$, check the factor is **not** in the list; return true if it never is. (2) Write \`closest_fraction(limit)\`: the fraction $a/b$ with $1 \le b \le$ \`limit\` whose square is closest to 2, as \`(a, b)\`. The checks confirm no fraction has square exactly 2.`,
    starter: py`def smallest_factor(n):
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n

FIRST_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

def euclid_step(primes):
    ...

def new_prime_every_time(k):
    ...

def closest_fraction(limit):
    ...
`,
    solution: py`def smallest_factor(n):
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n

FIRST_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

def euclid_step(primes):
    q = 1
    for p in primes:
        q *= p
    q += 1
    return q, smallest_factor(q)

def new_prime_every_time(k):
    for j in range(1, k + 1):
        q, d = euclid_step(FIRST_PRIMES[:j])
        if d in FIRST_PRIMES[:j]:
            return False
    return True

def closest_fraction(limit):
    best = (1, 1)
    for b in range(1, limit + 1):
        for a in (int(b * 1.4142135623730951), int(b * 1.4142135623730951) + 1):
            if abs(a * a - 2 * b * b) / (b * b) < abs(best[0] ** 2 - 2 * best[1] ** 2) / best[1] ** 2:
                best = (a, b)
    return best
`,
    checks: checks(py`
expect(euclid_step([2, 3, 5, 7, 11, 13]), (30031, 59), "euclid_step([2, 3, 5, 7, 11, 13])")
expect(euclid_step([2]), (3, 3), "euclid_step([2])")
expect(new_prime_every_time(8), True, "new_prime_every_time(8)")
a, b = closest_fraction(100)
expect((a, b), (140, 99), "closest_fraction(100)")
assert a * a != 2 * b * b, "a fraction with square exactly 2 would contradict the proof"
expect(a / b, math.sqrt(2), "a / b compared with √2", tol=1e-4)
`),
    hints: ['For each $b$, the best $a$ is next to $b\\sqrt 2$: try the whole numbers just below and just above.', 'Compare how far $a^2/b^2$ is from 2, so different $b$ are measured the same way.'],
  },

  induction: {
    prompt: py`Induction proves formulas; code can check them on many cases and catch a wrong formula fast. Write \`sum_of_squares(n)\` by a loop and \`squares_formula(n)\` $= \frac{n(n+1)(2n+1)}{6}$, and \`geometric_sum(r, n)\` by a loop with \`geometric_formula(r, n)\` $= \frac{1 - r^n}{1 - r}$. Then fill \`first_mismatch\` with the first $n$ in \`range(200)\` where the two square-sum versions disagree, or \`None\`.`,
    starter: py`def sum_of_squares(n):
    ...

def squares_formula(n):
    ...

def geometric_sum(r, n):
    ...

def geometric_formula(r, n):
    ...

first_mismatch = "not computed"
`,
    solution: py`def sum_of_squares(n):
    s = 0
    for i in range(1, n + 1):
        s += i * i
    return s

def squares_formula(n):
    return n * (n + 1) * (2 * n + 1) // 6

def geometric_sum(r, n):
    s, term = 0.0, 1.0
    for _ in range(n):
        s += term
        term *= r
    return s

def geometric_formula(r, n):
    return (1 - r ** n) / (1 - r)

first_mismatch = next((n for n in range(200) if sum_of_squares(n) != squares_formula(n)), None)
`,
    checks: checks(py`
expect([sum_of_squares(n) for n in (0, 1, 2, 10)], [0, 1, 5, 385], "sum_of_squares of 0, 1, 2, 10")
expect(squares_formula(10), 385, "squares_formula(10)")
expect(first_mismatch, None, "first_mismatch")
for r, n in [(0.5, 10), (0.9, 50), (3.0, 6), (-0.5, 7)]:
    expect(geometric_sum(r, n), geometric_formula(r, n), f"geometric sum with r = {r}, n = {n}")
expect(geometric_sum(0.99, 3000), 100, "1 + 0.99 + 0.99² + … (3000 terms)", tol=1e-9)
`),
    hints: ['`next((… for … if …), None)` returns the first match or `None`.', 'Use `//` in the formula: $n(n+1)(2n+1)$ is always divisible by 6, so the answer stays a whole number.'],
  },

  counting: {
    prompt: py`Write \`count_outcomes(options)\`: the number of outcomes for a sequence of choices with \`options[i]\` options each (product rule). Then write \`all_orders(items)\`, **recursively**, returning a list of every ordering of the list \`items\` (each as a list): choose the first item in every possible way, then order the rest. The checks compare its length with $n!$ and confirm there are no repeats.`,
    starter: py`def count_outcomes(options):
    ...

def all_orders(items):
    ...
`,
    solution: py`def count_outcomes(options):
    total = 1
    for n in options:
        total *= n
    return total

def all_orders(items):
    if len(items) <= 1:
        return [list(items)]
    out = []
    for i, first in enumerate(items):
        rest = items[:i] + items[i + 1:]
        for order in all_orders(rest):
            out.append([first] + order)
    return out
`,
    checks: checks(py`
expect(count_outcomes([4, 3, 5]), 60, "count_outcomes([4, 3, 5])")
expect(count_outcomes([2] * 10), 1024, "count_outcomes([2] * 10) (subsets of 10 things)")
expect(count_outcomes([]), 1, "count_outcomes([]) (no choices: one outcome)")
expect(sorted(map(tuple, all_orders(["A", "B", "C"]))), [("A", "B", "C"), ("A", "C", "B"), ("B", "A", "C"), ("B", "C", "A"), ("C", "A", "B"), ("C", "B", "A")], "all_orders(A, B, C)")
for n in range(6):
    orders = all_orders(list(range(n)))
    expect(len(orders), math.factorial(n), f"len(all_orders of {n} items)")
    assert len(set(map(tuple, orders))) == len(orders), "an ordering appears twice"
`),
    hints: ['The product of an empty list of numbers is 1.', 'Base case: zero or one item has exactly one order. Step: each item can go first, followed by every order of the others.'],
  },

  combinations: {
    prompt: py`Write \`choose(n, k)\` **without factorials**, multiplying $\frac{n}{1}\cdot\frac{n-1}{2}\cdots\frac{n-k+1}{k}$ one factor at a time with whole-number arithmetic (multiply first, then \`//\`: each partial product is itself a binomial coefficient, so the division is always exact). Then write \`subsets(items, k)\`, recursively listing every \`k\`-element subset (as lists, in the original order), using Pascal's split: subsets that include the first item, and subsets that don't.`,
    starter: py`def choose(n, k):
    ...

def subsets(items, k):
    ...
`,
    solution: py`def choose(n, k):
    if k < 0 or k > n:
        return 0
    c = 1
    for j in range(1, k + 1):
        c = c * (n - k + j) // j
    return c

def subsets(items, k):
    if k == 0:
        return [[]]
    if len(items) < k:
        return []
    first, rest = items[0], items[1:]
    with_first = [[first] + s for s in subsets(rest, k - 1)]
    without_first = subsets(rest, k)
    return with_first + without_first
`,
    checks: checks(py`
expect(choose(52, 5), 2598960, "choose(52, 5)")
expect(choose(10, 0), 1, "choose(10, 0)")
expect(choose(5, 7), 0, "choose(5, 7)")
expect(choose(60, 30), math.comb(60, 30), "choose(60, 30) (stays exact)")
expect(subsets(["a", "b", "c"], 2), [["a", "b"], ["a", "c"], ["b", "c"]], "subsets(a, b, c; 2)")
for n in range(7):
    for k in range(n + 1):
        expect(len(subsets(list(range(n)), k)), choose(n, k), f"len(subsets) for n = {n}, k = {k}")
        if 0 < k < n:
            expect(choose(n, k), choose(n - 1, k - 1) + choose(n - 1, k), f"Pascal's rule at n = {n}, k = {k}")
`),
    hints: ['After step $j$ the running value is $\\binom{n-k+j}{j}$, a whole number, so `c * (n - k + j) // j` is exact.', 'Base cases: choosing 0 gives one subset (the empty one); fewer items than $k$ gives none.'],
  },

  binomial: {
    prompt: py`Write \`expand(n)\`: the coefficients of $(1 + x)^n$, lowest power first, by **multiplying polynomials**: start from \`[1]\` and multiply by $(1 + x)$ $n$ times (multiplying by $1 + x$ adds the list to itself shifted one place). The checks compare with Pascal's row. Then write \`binomial_pmf(k, n, p)\` and \`binomial_mean(n, p)\` $= \sum_k k\,P(k)$; the checks confirm the probabilities add to 1 and the mean is $np$.`,
    starter: py`import math

def expand(n):
    ...

def binomial_pmf(k, n, p):
    ...

def binomial_mean(n, p):
    ...
`,
    solution: py`import math

def expand(n):
    coeffs = [1]
    for _ in range(n):
        coeffs = [a + b for a, b in zip(coeffs + [0], [0] + coeffs)]
    return coeffs

def binomial_pmf(k, n, p):
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k)

def binomial_mean(n, p):
    return sum(k * binomial_pmf(k, n, p) for k in range(n + 1))
`,
    checks: checks(py`
expect(expand(0), [1], "expand(0)")
expect(expand(4), [1, 4, 6, 4, 1], "expand(4)")
expect(expand(10), [math.comb(10, k) for k in range(11)], "expand(10)")
expect(binomial_pmf(3, 5, 0.5), 0.3125, "binomial_pmf(3, 5, 0.5)")
for n, p in [(5, 0.3), (20, 0.9), (1, 0.5)]:
    expect(sum(binomial_pmf(k, n, p) for k in range(n + 1)), 1, f"total probability for n = {n}, p = {p}")
    expect(binomial_mean(n, p), n * p, f"binomial_mean({n}, {p})")
`),
    hints: ['$(c_0 + c_1x + \\dots)(1 + x)$: the new coefficient of $x^j$ is $c_j + c_{j-1}$.', 'Pad with a zero on each side: `zip(coeffs + [0], [0] + coeffs)`.'],
  },

  pigeonhole: {
    prompt: py`Write \`collision_chance(k, m)\` with the lesson's product, and \`items_for_even_odds(m)\`: the smallest $k$ with at least a 50% chance of a collision. Then **simulate**: \`simulated_chance(k, m, trials, seed)\` drops $k$ items into $m$ slots uniformly at random (\`random.Random(seed).randrange(m)\`), \`trials\` times, and returns the fraction of trials with a collision. The checks compare simulation with the formula.`,
    starter: py`import random

def collision_chance(k, m):
    ...

def items_for_even_odds(m):
    ...

def simulated_chance(k, m, trials=4000, seed=0):
    ...
`,
    solution: py`import random

def collision_chance(k, m):
    all_different = 1.0
    for i in range(k):
        all_different *= (m - i) / m
    return 1 - all_different

def items_for_even_odds(m):
    k = 1
    while collision_chance(k, m) < 0.5:
        k += 1
    return k

def simulated_chance(k, m, trials=4000, seed=0):
    rng = random.Random(seed)
    hits = 0
    for _ in range(trials):
        seen = set()
        for _ in range(k):
            slot = rng.randrange(m)
            if slot in seen:
                hits += 1
                break
            seen.add(slot)
    return hits / trials
`,
    checks: checks(py`
expect(items_for_even_odds(365), 23, "items_for_even_odds(365)")
expect(collision_chance(1, 10), 0, "collision_chance(1, 10)")
expect(collision_chance(11, 10), 1, "collision_chance(11, 10) (pigeonhole: certain)")
for k, m in [(23, 365), (40, 1000), (5, 20)]:
    sim, exact = simulated_chance(k, m), collision_chance(k, m)
    assert abs(sim - exact) < 0.03, f"simulated_chance({k}, {m}) = {sim:.3f}, but the formula gives {exact:.3f}"
`),
    hints: ['A `set` of slots seen so far makes "already taken?" a quick check.', 'Stop the inner loop at the first collision with `break`, and count that trial once.'],
  },
}
