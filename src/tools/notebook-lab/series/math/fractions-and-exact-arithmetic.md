# Fractions and exact arithmetic

The first lesson of the series used Python's `Fraction` to keep gear ratios exact. This lesson opens the box. A fraction is a pair of integers, and everything about it, from lowest terms to adding, comparing and printing as a decimal, comes down to integer arithmetic and one ancient algorithm. Exactness also has costs and limits: denominators can grow out of control, and some ratios cannot be made with the gears available. That last problem has a classic solution, the continued fraction. It finds the best fraction with limited numbers, and explains a workshop curiosity: why metric-cutting lathes carry a gear with 127 teeth.

This lesson covers:

- lowest terms and Euclid's algorithm for the greatest common divisor;
- adding fractions exactly, and why denominators grow;
- the hunting-tooth rule: common factors and even gear wear;
- decimals that terminate or repeat, and converting back;
- continued fractions and the best ratio with a limited number of teeth.

## Lowest terms and Euclid's algorithm

::: math
\[ \frac{a}{b} = \frac{a/g}{b/g}, \quad g = \gcd(a, b), \qquad \gcd(a, b) = \gcd(b,\; a \bmod b), \quad \gcd(a, 0) = a \]
- $\gcd$: the greatest common divisor, the largest integer dividing both
- any common divisor of $a$ and $b$ also divides $a - qb = a \bmod b$, and the reverse holds, so the pair can shrink without changing the answer
In code: `euclid(a, b)` repeats `a, b = b, a % b` and counts the steps
:::

A fraction is in **lowest terms** when the numerator and denominator have no common factor. To get there, divide both by their greatest common divisor. Factorising large numbers is slow, but Euclid found a shortcut around 300 BC. Any number that divides a and b also divides their difference, and so the remainder a mod b. The pair (a, b) can therefore be replaced by the smaller pair (b, a mod b) without changing the gcd. Repeating this until the remainder is zero leaves the gcd.

It is fast: the numbers at least halve every two steps, so the number of steps grows with the number of digits, not with the size. The slowest case, step for step, is a pair of consecutive Fibonacci numbers, where every quotient is 1.

Predict before running: how many steps for gcd(1071, 462), for the Fibonacci pair (987, 610), and for two ten-digit numbers?

```python
import math
from fractions import Fraction
import numpy as np

def euclid(a, b):
    steps = 0
    while b:
        a, b = b, a % b
        steps += 1
    return a, steps

for a, b in [(1071, 462), (987, 610), (1234567890, 987654321), (10 ** 12, 7)]:
    g, steps = euclid(a, b)
    print(f"gcd({a}, {b}) = {g} in {steps} steps (math.gcd: {math.gcd(a, b)})")
print("1071/462 in lowest terms:", Fraction(1071, 462))
```

gcd(1071, 462) = 21 after 3 steps (1071 → 462 → 147 → 21), so 1071/462 = 51/22. The Fibonacci pair needs 14 steps for its gcd of 1, the slow case. The ten-digit pair needs only 4, and a trillion with 7 just 2. `Fraction` runs exactly this algorithm every time it is created, which is why it is always in lowest terms.

## Exact sums and growing denominators

::: math
\[ \frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd} \;\text{(then reduce)}, \qquad H_n = \sum_{k=1}^{n} \frac{1}{k} = \frac{p_n}{q_n}, \qquad \operatorname{lcm}(a, b) = \frac{ab}{\gcd(a, b)} \]
- the reduced denominator of a sum is at most the least common multiple of the denominators
- $H_n$: the harmonic numbers; their denominators grow roughly like $e^n$
In code: `h += Fraction(1, k)`, printing the number of digits in `h.denominator`
:::

Adding fractions means bringing them to a common denominator: (ad + bc)/bd, then reducing. The smallest common denominator is the **least common multiple**, lcm(b, d) = bd/gcd(b, d). Sums of fractions with many different denominators therefore pile up their prime factors, and the result's denominator grows. This is the price of exactness. A float always takes 8 bytes. A fraction can need ever more digits, and every operation gets slower as it does.

Predict before running: the sum 1 + 1/2 + 1/3 + ... + 1/30. How many digits does its exact denominator have?

```python
h = Fraction(0)
for k in range(1, 31):
    h += Fraction(1, k)
    if k in (5, 10, 20, 30):
        print(f"H_{k} = {h}  ({len(str(h.denominator))}-digit denominator, ≈ {float(h):.6f})")
print("lcm(12, 18) =", math.lcm(12, 18), "= 12 × 18 / gcd(12, 18) =", 12 * 18 // math.gcd(12, 18))
```

H₅ = 137/60 is still friendly, but H₃₀ has a 13-digit denominator (2,329,089,562,800), and the digits keep growing with n. Exact arithmetic is the right tool for ratios that stay simple, like gear trains, scale factors and probabilities of small events. It is the wrong tool for long numerical computations such as simulations, where floats and error estimates are the practical choice.

## The hunting tooth

::: math
\[ \text{a given tooth pair meets again after } \frac{\operatorname{lcm}(N_1, N_2)}{N_2} \text{ turns of gear 2}, \qquad \text{each tooth meets } \frac{N_1}{\gcd(N_1, N_2)} \text{ different partners} \]
- $N_1$ and $N_2$: tooth counts of two meshing gears
- $\gcd(N_1, N_2) = 1$ (coprime counts): every tooth meets every tooth of the other gear, spreading wear evenly
In code: `math.lcm(n1, n2) // n2` and `n1 // math.gcd(n1, n2)` for several pairs
:::

In a meshing pair, number the teeth and follow one tooth of gear 2. It meets gear 1's teeth in order, and after one turn of gear 2 it has moved N₂ positions round gear 1. It returns to its first partner once the positions it has moved through add up to a whole number of turns of gear 1: after lcm(N₁, N₂) teeth have passed. If the counts share a factor, each tooth only ever meets a fraction of the other gear's teeth. A slightly damaged tooth then keeps hitting the same few partners and wears them unevenly.

Gear designers avoid this by choosing coprime tooth counts. The extra tooth that makes a pair coprime, such as 37 instead of 36, is called the **hunting tooth**.

Predict before running: a 12-tooth pinion drives a 36-tooth gear, or a 37-tooth one. How many partners does each pinion tooth meet?

```python
for n1, n2 in [(36, 12), (37, 12), (40, 25), (41, 25)]:
    g = math.gcd(n1, n2)
    print(f"{n1} and {n2} teeth: gcd {g}, a tooth pair repeats every {math.lcm(n1, n2) // n2} turns of the {n2}-tooth gear; "
          f"each {n2}-tooth gear tooth meets {n1 // g} of the {n1} teeth")
```

With 36 and 12 teeth (gcd 12), each pinion tooth meets only 3 of the 36 gear teeth, the same 3 every time. With 37 teeth the counts are coprime: a pair repeats only every 37 turns of the pinion, and every pinion tooth works against all 37 gear teeth. The ratio changes by under 3% (37/12 instead of 3), and the wear spreads evenly. The same reasoning sets bicycle chain and sprocket counts.

## Decimals that repeat

::: math
\[ \frac{p}{q} = \text{whole} + 0.d_1 d_2 d_3 \ldots, \qquad r_{i+1} = 10\,r_i \bmod q, \qquad d_{i+1} = \left\lfloor \frac{10\,r_i}{q} \right\rfloor \]
- long division keeps a remainder $r_i$ between 0 and $q - 1$; once a remainder repeats, so do the digits
- the expansion terminates exactly when $q$ (in lowest terms) has no prime factors other than 2 and 5
In code: `long_division(p, q)` records each remainder's position in a dictionary `seen`
:::

Divide p by q by long division. Each step multiplies the remainder by 10, takes the next digit, and keeps the new remainder. A remainder of 0 means the decimal terminates. Otherwise there are only q − 1 possible non-zero remainders, so one must come back. From then on, the digits repeat. So every fraction's decimal expansion either terminates or repeats, with a period below q. The reverse is also true: every repeating decimal is a fraction.

The expansion terminates exactly when q has no prime factors other than 2 and 5, the factors of 10. So 1/8 = 0.125, while 1/3 and 1/7 repeat for ever. This is why a decimal price like 0.10 can be exact in `Decimal`, while 1/3 can never be written exactly in decimal form, whatever the precision.

Predict before running: how long is the repeating part of 1/7, of 1/17 and of 1/97?

```python
def long_division(p, q):
    whole, r = divmod(p, q)
    seen, digits = {}, ""
    while r and r not in seen:
        seen[r] = len(digits)
        r *= 10
        digits += str(r // q)
        r %= q
    if r == 0:
        return whole, digits, ""
    start = seen[r]
    return whole, digits[:start], digits[start:]

for p, q in [(1, 8), (5, 12), (1, 7), (1, 13), (1, 17), (1, 97), (22, 7)]:
    whole, fixed, rep = long_division(p, q)
    shown = f"{whole}." + fixed + (f"({rep})" if rep else "")
    print(f"{p}/{q} = {shown[:60]}{'...' if len(shown) > 60 else ''}   repeating part: {len(rep)} digits")
```

1/8 terminates; 5/12 = 0.41(6) has a non-repeating start and then repeats one digit. 1/7 repeats with period 6, 1/17 with period 16 and 1/97 with period 96, the longest possible for those denominators (q − 1). 22/7, the famous approximation to π, has the same 6-digit cycle as 1/7. A repeating period of q − 1 happens when 10 generates every non-zero remainder modulo q, a fact from number theory that the discrete-mathematics block returns to.

## Continued fractions and the 127-tooth gear

::: math
\[ x = a_0 + \cfrac{1}{a_1 + \cfrac{1}{a_2 + \cfrac{1}{a_3 + \cdots}}} = [a_0; a_1, a_2, \ldots], \qquad \frac{h_n}{k_n} = \frac{a_n h_{n-1} + h_{n-2}}{a_n k_{n-1} + k_{n-2}} \]
- $a_0 = \lfloor x \rfloor$, then repeat on $1/(x - a_0)$; the truncations $h_n/k_n$ are the **convergents**
- every best approximation with a bounded denominator is a convergent or a **semiconvergent** (a mediant of two convergents, such as $\dfrac{h_{n-1} + h_n}{k_{n-1} + k_n}$)
In code: `cf_terms(x, n)` and `conv(terms)`; then a search over every tooth count up to 100
:::

Inch and metric threads differ by a factor 25.4 = 127/5 mm per inch. A lathe with an inch leadscrew can only cut exact metric threads through a gear ratio containing 127. Because 127 is prime, no smaller gears can make it: a 127-tooth gear is the textbook answer. Without one, what is the best substitute, a pair with at most 100 teeth whose ratio is closest to 127/100 = 1.27?

**Continued fractions** answer exactly this kind of question. Take the whole part, invert the remainder, and repeat: 1.27 = 1 + 1/(3 + 1/(1 + ...)). Stopping early gives the convergents. Each one is the best approximation for the size of its denominator, and their errors alternate in sign and shrink fast. For π the expansion [3; 7, 15, 1, 292, ...] gives 22/7, 333/106 and then 355/113. The large term 292 is why 355/113 is so astonishingly good: correct to 7 digits with a three-digit denominator.

Predict before running: is the best pair with at most 100 teeth one of the convergents of 1.27?

```python
def cf_terms(x, n):
    terms = []
    for _ in range(n):
        a = math.floor(x)
        terms.append(a)
        if x == a:
            break
        x = 1 / (x - a)
    return terms

def conv(terms):
    h_prev, h, k_prev, k = 0, 1, 1, 0
    out = []
    for a in terms:
        h_prev, h = h, a * h + h_prev
        k_prev, k = k, a * k + k_prev
        out.append(Fraction(h, k))
    return out

pi_terms = cf_terms(math.pi, 5)
print("π =", pi_terms, "->", [f"{c} (error {abs(float(c) - math.pi):.1e})" for c in conv(pi_terms)])

target = Fraction(127, 100)
terms = cf_terms(target, 20)
print("127/100 =", terms)
for c in conv(terms):
    print(f"  convergent {str(c):>8}: relative error {float(abs(c - target) / target):.6f}")

pairs = sorted((abs(Fraction(p, q) - target) / target, q, p) for q in range(20, 101) for p in range(20, 101))
for err, q, p in pairs[:4]:
    print(f"best pairs with 20-100 teeth: {p}/{q}, relative error {float(err):.6f}")
```

The convergents of 1.27 are 1, 4/3, 5/4, 14/11, 33/26, 47/37 and finally 127/100 itself. Their errors fall from 21% to 0.021% for 47/37, the substitute that lathe handbooks list. But the search over every pair up to 100 teeth finds something better: 80/63, with an error of 0.0125%. It is the semiconvergent (33 + 47)/(26 + 37), the mediant of two neighbouring convergents. It fills the gap that the convergent sequence jumps over, because 37 + 63 is still within the tooth limit. Continued fractions list every candidate; the bound on the teeth decides which one wins. Next come 47/37 and its double 94/74, which gives the same ratio. A 0.0125% ratio error makes a thread's pitch drift by 1.25 µm per 10 mm of length, which is fine for most work.

::: challenge Euclid and the hunting tooth [easy]
Write `gcd_steps(a, b)` for non-negative integers, not both zero: return `(g, steps)`, the greatest common divisor by Euclid's algorithm and the number of remainder steps (each replacement of (a, b) by (b, a mod b) is one step), as plain ints. Raise `ValueError` for negative numbers, non-integers or two zeros. Then write `hunting(n1, n2)` for two positive tooth counts: return `(partners, repeat_turns)` where `partners` is how many of gear 1's teeth each tooth of gear 2 meets, n1/gcd(n1, n2), and `repeat_turns` is the number of turns of gear 2 before the same pair of teeth meets again, lcm(n1, n2)/n2. Do not use `math.gcd` or `math.lcm` (use your own function).

```python starter
def gcd_steps(a, b):
    return (1, 0)

def hunting(n1, n2):
    return (1, 1)

print(gcd_steps(1071, 462), hunting(37, 12))
```

```python solution
def gcd_steps(a, b):
    if not isinstance(a, int) or not isinstance(b, int) or isinstance(a, bool) or isinstance(b, bool):
        raise ValueError("integers only")
    if a < 0 or b < 0 or (a == 0 and b == 0):
        raise ValueError("non-negative, not both zero")
    steps = 0
    while b:
        a, b = b, a % b
        steps += 1
    return a, steps

def hunting(n1, n2):
    if not isinstance(n1, int) or not isinstance(n2, int) or n1 < 1 or n2 < 1:
        raise ValueError("tooth counts must be positive integers")
    g = gcd_steps(n1, n2)[0]
    return n1 // g, n1 // g

print(gcd_steps(1071, 462), hunting(37, 12))
```

```python test
import ast
import inspect
for _n in ["gcd_steps", "hunting"]:
    assert _n in dir(), f"Define {_n}."
try:
    _src = inspect.getsource(gcd_steps) + inspect.getsource(hunting)
    _attrs = {_node.attr for _node in ast.walk(ast.parse(_src)) if isinstance(_node, ast.Attribute)}
    assert not (_attrs & {"gcd", "lcm"}), "Use your own Euclid's algorithm, not math.gcd or math.lcm."
except (OSError, TypeError):
    pass
assert gcd_steps(1071, 462) == (21, 3), f"gcd(1071, 462) = 21 in 3 steps; got {gcd_steps(1071, 462)}."
assert gcd_steps(987, 610) == (1, 14), "Consecutive Fibonacci numbers: 14 steps."
assert gcd_steps(462, 1071) == (21, 4), "With a < b the first step just swaps them: 4 steps."
assert gcd_steps(5, 0) == (5, 0) and gcd_steps(0, 7) == (7, 1), "gcd(a, 0) = a with no steps; gcd(0, b) takes one step."
assert all(type(_v) is int for _v in gcd_steps(10 ** 30, 7 ** 20)), "Plain ints, and big integers work."
for _bad in [(-4, 6), (0, 0), (4.0, 6), (True, 2)]:
    try:
        gcd_steps(*_bad)
        assert False, f"gcd_steps{_bad} should raise ValueError."
    except ValueError:
        pass
assert hunting(36, 12) == (3, 3), f"36 and 12 teeth: each pinion tooth meets 3 gear teeth; got {hunting(36, 12)}."
assert hunting(37, 12) == (37, 37), "Coprime counts: every tooth meets every tooth."
assert hunting(40, 25) == (8, 8) and hunting(12, 36) == (1, 1), "40/25 shares a factor 5; a 36-tooth gear driving a 12 meets one partner."
for _bad in [(0, 12), (12, -3)]:
    try:
        hunting(*_bad)
        assert False, f"hunting{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Euclid's remainders find the common factor fast, and a coprime pair of gears spreads its wear over every tooth."
```

Hint: Loop `while b:` replacing `a, b = b, a % b` and counting. lcm(n1, n2) = n1·n2/gcd, so lcm/n2 = n1/gcd: both answers turn out to be the same number.
:::

::: challenge Repeating decimals [medium]
Write `decimal_parts(p, q)` for integers p ≥ 0 and q > 0: return `(whole, fixed, repeating)` where `whole` is the integer part (an int), `fixed` is the string of decimal digits before the repeating block, and `repeating` is the string of the repeating block (empty if the decimal terminates). Use long division with remainders, and make the repeating block start as early as possible and be as short as possible: 1/6 is `(0, "1", "6")`, 1/7 is `(0, "", "142857")`, 1/8 is `(0, "125", "")`. Raise `ValueError` if q ≤ 0 or p < 0. Then write `parts_to_fraction(whole, fixed, repeating)`, the exact `Fraction` with that decimal expansion.

```python starter
from fractions import Fraction

def decimal_parts(p, q):
    return (p // q, "", "")

def parts_to_fraction(whole, fixed, repeating):
    return Fraction(whole)

print(decimal_parts(5, 12), parts_to_fraction(0, "41", "6"))
```

```python solution
from fractions import Fraction

def decimal_parts(p, q):
    if q <= 0 or p < 0:
        raise ValueError("need p >= 0 and q > 0")
    whole, r = divmod(p, q)
    seen, digits = {}, ""
    while r and r not in seen:
        seen[r] = len(digits)
        r *= 10
        digits += str(r // q)
        r %= q
    if r == 0:
        return whole, digits, ""
    return whole, digits[:seen[r]], digits[seen[r]:]

def parts_to_fraction(whole, fixed, repeating):
    value = Fraction(whole)
    if fixed:
        value += Fraction(int(fixed), 10 ** len(fixed))
    if repeating:
        value += Fraction(int(repeating), (10 ** len(repeating) - 1) * 10 ** len(fixed))
    return value

print(decimal_parts(5, 12), parts_to_fraction(0, "41", "6"))
```

```python test
from fractions import Fraction
for _n in ["decimal_parts", "parts_to_fraction"]:
    assert _n in dir(), f"Define {_n}."
assert decimal_parts(1, 6) == (0, "1", "6"), f"1/6 = 0.1(6); got {decimal_parts(1, 6)}."
assert decimal_parts(1, 7) == (0, "", "142857") and decimal_parts(1, 8) == (0, "125", ""), "1/7 and 1/8."
assert decimal_parts(22, 7) == (3, "", "142857") and decimal_parts(5, 12) == (0, "41", "6"), "22/7 and 5/12."
assert decimal_parts(6, 3) == (2, "", "") and decimal_parts(0, 9) == (0, "", ""), "Whole numbers have no decimal digits."
assert decimal_parts(1, 3) == (0, "", "3") and decimal_parts(7, 30) == (0, "2", "3"), "Shortest block, starting as early as possible."
_w, _f, _r = decimal_parts(1, 97)
assert len(_r) == 96 and _f == "", "1/97 repeats with period 96."
assert len(decimal_parts(1, 17)[2]) == 16 and decimal_parts(3, 70)[1:] == ("0", "428571"), "1/17 period 16; 3/70 = 0.0(428571)."
assert type(decimal_parts(5, 12)[0]) is int, "whole is an int."
for _bad in [(1, 0), (-1, 3)]:
    try:
        decimal_parts(*_bad)
        assert False, f"decimal_parts{_bad} should raise ValueError."
    except ValueError:
        pass
assert parts_to_fraction(0, "41", "6") == Fraction(5, 12) and isinstance(parts_to_fraction(0, "1", "6"), Fraction), "0.41(6) = 5/12."
assert parts_to_fraction(0, "", "9") == 1 and parts_to_fraction(3, "", "142857") == Fraction(22, 7), "0.(9) = 1; 3.(142857) = 22/7."
assert parts_to_fraction(2, "", "") == 2 and parts_to_fraction(0, "125", "") == Fraction(1, 8), "Terminating decimals."
for _p, _q in [(1, 6), (355, 113), (123, 456), (0, 5), (9, 9)]:
    assert parts_to_fraction(*decimal_parts(_p, _q)) == Fraction(_p, _q), f"Round trip for {_p}/{_q}."
"SUCCESS: Long division must revisit a remainder, so every fraction's decimal terminates or repeats, and every repeating decimal is a fraction."
```

Hint: Store each remainder's position in a dictionary; when a remainder comes back, the repeating block starts at its stored position. To convert back, a block of n repeating digits R is worth R/(10ⁿ − 1), shifted right by the number of fixed digits.
:::

::: challenge The best gear pair [hard]
Write `continued_fraction(x, max_terms=30)`: the terms [a₀, a₁, ...] of the continued fraction of a positive `Fraction` (or int) x, computed exactly with `Fraction` arithmetic, stopping when the remainder is zero or after `max_terms` terms; return a list of ints. Write `convergents(terms)`: the list of convergents as `Fraction`s, using the recurrence hₙ = aₙhₙ₋₁ + hₙ₋₂, kₙ = aₙkₙ₋₁ + kₙ₋₂. Then write `best_pair(target, max_teeth, min_teeth=1)`: the pair `(p, q)` of ints with min_teeth ≤ p, q ≤ max_teeth whose ratio p/q is closest to `target` (a positive Fraction or int); among equally close pairs, return the one with the smallest q. Raise `ValueError` if x or target is not positive, or min_teeth > max_teeth or min_teeth < 1. All comparisons must be exact (use `Fraction`, not floats).

```python starter
from fractions import Fraction

def continued_fraction(x, max_terms=30):
    return []

def convergents(terms):
    return []

def best_pair(target, max_teeth, min_teeth=1):
    return (1, 1)

print(continued_fraction(Fraction(127, 100)), best_pair(Fraction(127, 100), 100, 20))
```

```python solution
import math
from fractions import Fraction

def continued_fraction(x, max_terms=30):
    x = Fraction(x)
    if x <= 0:
        raise ValueError("x must be positive")
    terms = []
    while len(terms) < max_terms:
        a = math.floor(x)
        terms.append(int(a))
        if x == a:
            break
        x = 1 / (x - a)
    return terms

def convergents(terms):
    h_prev, h, k_prev, k = 0, 1, 1, 0
    out = []
    for a in terms:
        h_prev, h = h, a * h + h_prev
        k_prev, k = k, a * k + k_prev
        out.append(Fraction(h, k))
    return out

def best_pair(target, max_teeth, min_teeth=1):
    target = Fraction(target)
    if target <= 0:
        raise ValueError("target must be positive")
    if min_teeth < 1 or min_teeth > max_teeth:
        raise ValueError("need 1 <= min_teeth <= max_teeth")
    best = None
    for q in range(min_teeth, max_teeth + 1):
        centre = math.floor(target * q)
        for p in (centre, centre + 1):
            p = min(max(p, min_teeth), max_teeth)
            err = abs(Fraction(p, q) - target)
            if best is None or err < best[0]:
                best = (err, p, q)
    return best[1], best[2]

print(continued_fraction(Fraction(127, 100)), best_pair(Fraction(127, 100), 100, 20))
```

```python test
import math
from fractions import Fraction
for _n in ["continued_fraction", "convergents", "best_pair"]:
    assert _n in dir(), f"Define {_n}."
assert continued_fraction(Fraction(127, 100)) == [1, 3, 1, 2, 2, 1, 2], f"127/100 = [1; 3, 1, 2, 2, 1, 2]; got {continued_fraction(Fraction(127, 100))}."
assert continued_fraction(Fraction(5, 127)) == [0, 25, 2, 2] and continued_fraction(7) == [7], "Whole part 0, and an integer."
assert continued_fraction(Fraction(355, 113)) == [3, 7, 16], "355/113 = [3; 7, 16]."
assert all(type(_v) is int for _v in continued_fraction(Fraction(22, 7))), "Plain ints."
assert continued_fraction(Fraction(10 ** 20 + 1, 10 ** 20), max_terms=3) == [1, 10 ** 20], "Huge terms stay exact."
assert len(continued_fraction(Fraction(987, 610), max_terms=5)) == 5, "max_terms limits the length."
_c = convergents([1, 3, 1, 2, 2, 1, 2])
assert _c == [Fraction(1), Fraction(4, 3), Fraction(5, 4), Fraction(14, 11), Fraction(33, 26), Fraction(47, 37), Fraction(127, 100)], f"Convergents of 1.27; got {_c}."
assert all(isinstance(_v, Fraction) for _v in _c) and convergents([3, 7, 15, 1])[-1] == Fraction(355, 113), "Fractions; π's convergents reach 355/113."
assert best_pair(Fraction(127, 100), 100, 20) == (80, 63), f"With 20-100 teeth the best is 80/63; got {best_pair(Fraction(127, 100), 100, 20)}."
assert best_pair(Fraction(127, 100), 50) == (47, 37), "With at most 50 teeth, 47/37."
assert best_pair(Fraction(5, 127), 100) == (3, 76), "5/127 with at most 100 teeth: the semiconvergent 3/76."
assert best_pair(3, 10) == (3, 1) and best_pair(Fraction(1, 2), 10, 4) == (4, 8), "Ties go to the smallest q; min_teeth applies to both."
assert best_pair(10, 5) == (5, 1), "A target out of range gets the closest allowed pair."
_pi = Fraction(math.pi)
assert best_pair(_pi, 110) == (22, 7) and best_pair(_pi, 340) == (333, 106) and best_pair(_pi, 400) == (355, 113), "π: both numbers are limited, so 22/7 up to 110, 333/106 up to 340, 355/113 up to 400."
for _bad in [lambda: continued_fraction(0), lambda: best_pair(Fraction(-1, 2), 10), lambda: best_pair(1, 10, 11), lambda: best_pair(1, 10, 0)]:
    try:
        _bad()
        assert False, "Bad input should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Continued fractions list the candidate ratios, and an exact search with the tooth limits picks the winner: no 127-tooth gear needed for most work."
```

Hint: For the continued fraction, take `a = math.floor(x)`, append it, stop if x == a, else replace x by 1/(x − a), all with `Fraction`. For the best pair, for each q only the two numerators either side of target·q can be closest; clamp them into the allowed range and compare errors exactly.
:::

## What you learned

- Euclid's algorithm replaces (a, b) by (b, a mod b) until the remainder vanishes; it finds the gcd in a number of steps proportional to the number of digits, and puts fractions in lowest terms.
- Adding fractions needs a common denominator, the lcm at best; exact sums like the harmonic numbers grow ever longer denominators, the cost of exactness.
- Meshing gears with coprime tooth counts (a hunting tooth) make every tooth meet every other, spreading wear.
- Long division must revisit a remainder, so every fraction's decimal terminates (when the denominator has only factors 2 and 5) or repeats, and every repeating decimal is a fraction.
- Continued fractions give the convergents, the best approximations for their denominators; with a limit on the numbers allowed, the best choice is a convergent or a semiconvergent, as 80/63 shows for the 127/100 lathe ratio.

The next lesson looks at a different way to compare numbers: by how much they change, in percentages, relative changes and relative errors.
