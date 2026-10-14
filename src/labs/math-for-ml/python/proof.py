"""Proof and counting: why checking examples is not proof, Euclid's primes, sums proved by induction,
counting arrangements and choices, Pascal's triangle, the binomial theorem, and collisions."""


def first_counterexample(claim, candidates):
    """The first candidate where the claim fails, or None. Finding one disproves a "for all"; finding none proves nothing."""
    for c in candidates:
        if not claim(c):
            return c
    return None


def smallest_factor(n):
    """The smallest number above 1 that divides n (n itself when n is prime)."""
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n


def is_prime(n):
    """A prime is a whole number above 1 whose only divisors are 1 and itself."""
    return n > 1 and smallest_factor(n) == n


def euclid_step(primes):
    """Multiply the primes, add 1, and find a prime factor of the result: it is never in the list."""
    q = 1
    for p in primes:
        q *= p
    q += 1
    return q, smallest_factor(q)


def sum_to(n):
    """1 + 2 + … + n, added one at a time."""
    s = 0
    for i in range(1, n + 1):
        s += i
    return s


def gauss(n):
    """The same sum from the formula n(n + 1)/2, proved by induction."""
    return n * (n + 1) // 2


def geometric(r, n):
    """1 + r + r² + … + r^(n−1), added one at a time, beside the formula (1 − rⁿ)/(1 − r)."""
    s = 0.0
    term = 1.0
    for _ in range(n):
        s += term
        term *= r
    return s, (1 - r ** n) / (1 - r)


def factorial(n):
    """n! = n × (n − 1) × … × 1: the number of orders for n different things. 0! = 1."""
    p = 1
    for k in range(2, n + 1):
        p *= k
    return p


def arrangements(n, k):
    """Ordered choices of k things from n: n × (n − 1) × … × (n − k + 1)."""
    p = 1
    for j in range(k):
        p *= n - j
    return p


def choose(n, k):
    """C(n, k): unordered choices of k things from n. Ordered choices, divided by the k! orders of each."""
    if k < 0 or k > n:
        return 0
    return arrangements(n, k) // factorial(k)


def pascal(rows):
    """Pascal's triangle: each entry is the sum of the two above it, C(n, k) = C(n−1, k−1) + C(n−1, k)."""
    triangle = [[1]]
    for n in range(1, rows):
        above = triangle[-1]
        row = [1]
        for k in range(1, n):
            row.append(above[k - 1] + above[k])
        row.append(1)
        triangle.append(row)
    return triangle


def binomial_pmf(k, n, p):
    """P(exactly k successes in n tries): C(n, k) ways, each with chance p^k (1 − p)^(n − k)."""
    return choose(n, k) * p ** k * (1 - p) ** (n - k)


def collision_chance(k, m):
    """The chance that k items dropped at random into m slots share a slot (the birthday problem)."""
    all_different = 1.0
    for i in range(k):
        all_different *= (m - i) / m
    return 1 - all_different


def show_proof():
    """Each idea of the proof-and-counting part, worked out once."""
    print("n² + n + 41 prime for every n? first failure:", first_counterexample(lambda n: is_prime(n * n + n + 41), range(100)))
    print("Euclid with 2, 3, 5, 7, 11, 13:", euclid_step([2, 3, 5, 7, 11, 13]))
    print("1 + … + 100 by adding:", sum_to(100), " by the formula:", gauss(100))
    print("1 + 0.9 + … + 0.9^9, and the formula:", geometric(0.9, 10))
    print("10! =", factorial(10), "  arrangements of 3 from 10:", arrangements(10, 3), "  C(10, 3) =", choose(10, 3))
    print("Pascal's row 6:", pascal(7)[6])
    print("P(3 heads in 5 fair flips) =", binomial_pmf(3, 5, 0.5))
    print("23 people, 365 days: chance of a shared birthday =", collision_chance(23, 365))
