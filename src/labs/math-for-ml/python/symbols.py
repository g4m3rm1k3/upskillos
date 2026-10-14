"""Reading maths as code: a prediction, sums, products, powers, the number e, logarithms and the sigmoid."""
import math


def predict(w, b, x):
    """The simplest model there is: a prediction y-hat = w x + b."""
    return w * x + b


def total(xs):
    """Σ x_i: add up every number in the list, one at a time."""
    s = 0.0
    for x in xs:
        s += x
    return s


def mean(xs):
    """(1/n) Σ x_i: the average of the list."""
    return total(xs) / len(xs)


def product(xs):
    """Π x_i: multiply every number in the list together."""
    p = 1.0
    for x in xs:
        p *= x
    return p


def compound(n):
    """(1 + 1/n)^n: one year of 100% growth, paid in n equal slices. As n grows it closes in on e."""
    return (1 + 1 / n) ** n


def exp_series(x, terms=20):
    """e^x as the sum 1 + x + x²/2! + x³/3! + …, built term by term."""
    s = 0.0
    term = 1.0
    for k in range(terms):
        s += term
        term = term * x / (k + 1)
    return s


def sigmoid(z):
    """σ(z) = 1 / (1 + e^(−z)): squashes any number into the range 0 to 1."""
    return 1 / (1 + math.exp(-z))


def logs_of_tiny(ps):
    """Multiplying many small probabilities shrinks toward 0; adding their logarithms does not."""
    return product(ps), total([math.log(p) for p in ps])


def argmin(f, candidates):
    """The input, among `candidates`, where f is smallest. min would give the smallest value instead."""
    best = candidates[0]
    for c in candidates:
        if f(c) < f(best):
            best = c
    return best


def members(universe, condition):
    """{x ∈ U | condition(x)}: set-builder notation, which is a set comprehension."""
    return {x for x in universe if condition(x)}


def in_interval(x, a, b, brackets="[)"):
    """Is x in the interval from a to b? A square bracket includes that end; a round one leaves it out."""
    left_ok = a <= x if brackets[0] == "[" else a < x
    right_ok = x <= b if brackets[1] == "]" else x < b
    return left_ok and right_ok


def implies(p, q):
    """p ⇒ q: a promise that is broken only when p is true and q is false."""
    return (not p) or q


def for_all(xs, claim):
    """∀x: claim(x). One counterexample is enough to make it false."""
    for x in xs:
        if not claim(x):
            return False
    return True


def exists(xs, claim):
    """∃x: claim(x). One example is enough to make it true."""
    for x in xs:
        if claim(x):
            return True
    return False


def relu(z):
    """ReLU(z) = max(0, z): a function in two pieces, and the most used activation in deep learning."""
    if z > 0:
        return z
    return 0.0


def clip(x, low, high):
    """x forced into [low, high]: three pieces. Gradient clipping and PPO's clipped ratio use it."""
    if x < low:
        return low
    if x > high:
        return high
    return x


def accuracy(predictions, labels):
    """(1/n) Σ 𝟙[ŷᵢ = yᵢ]: the indicator turns each comparison into 1 or 0, and the mean counts the hits."""
    hits = 0
    for p, y in zip(predictions, labels):
        hits += 1 if p == y else 0
    return hits / len(labels)


def sum_bounds(xs):
    """n·min ≤ Σ xᵢ ≤ n·max: a sum is squeezed between n copies of its smallest and of its largest term."""
    n = len(xs)
    return n * min(xs), total(xs), n * max(xs)


def show_symbols():
    """Each symbol of Part 1, worked out once."""
    xs = [2.0, 4.0, 9.0]
    print("prediction w x + b with w=2, b=1, x=3:", predict(2, 1, 3))
    print("sum:", total(xs), " mean:", mean(xs), " product:", product(xs))
    print("(1 + 1/n)^n for n = 1000:", compound(1000), " e =", math.e)
    print("e^1 by the series:", exp_series(1))
    print("sigmoid(0):", sigmoid(0), " sigmoid(3):", sigmoid(3))
    print("argmin of (x - 3)^2 over 0..6:", argmin(lambda x: (x - 3) ** 2, [0, 1, 2, 3, 4, 5, 6]))
