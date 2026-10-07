# Recurrences

For a loop, the running time is easy to read: count the iterations, multiply by the cost of the body. A recursive function has no loop to count. Its cost is the work it does itself **plus the cost of its recursive calls**, and those calls have the same structure. Writing that down gives an equation in which the cost appears on both sides, a **recurrence**. Solving recurrences is how the running times of recursive algorithms (binary search, merge sort, fast exponentiation, the naive Fibonacci) are worked out, and this lesson shows the three ways to do it:

- **unrolling**: substitute the recurrence into itself until a pattern appears;
- the **recursion tree**: draw the calls as a tree and add up the work level by level;
- the **master theorem**: a ready-made answer for the common "divide into equal parts" shape.

Throughout, T(n) means the number of basic steps for an input of size n.

## Writing the recurrence

Read the recurrence straight off the code: how many recursive calls, on what size of input, and how much work outside them. Five shapes cover most recursive code:

- `total(items)` from the last lesson, with the slice replaced by an index, makes one call on n − 1 items and does constant work: T(n) = T(n − 1) + c.
- `power(x, n)` makes one call on n/2 and does constant work: T(n) = T(n/2) + c.
- A function that does a full pass over its input and then recurses on n − 1 items (like selection sort, in a later lesson): T(n) = T(n − 1) + cn.
- Merge sort sorts two halves and merges them in linear time: T(n) = 2T(n/2) + cn.
- The naive Fibonacci makes two calls, on n − 1 and n − 2: roughly T(n) = 2T(n − 1) + c.

Each needs a **base case** too, such as T(1) = 1. A recurrence can be evaluated exactly by filling in a table of T values from the smallest n upwards, so that every value it refers to is already known. That gives exact step counts to check answers against. Predict before running: as n doubles from 1,024 to 2,048, how will each count change?

```python type
def evaluate(rule, n):
    T = {1: 1}
    for m in range(2, n + 1):
        T[m] = rule(m, T)
    return T[n]

recurrences = {
    "T(n-1) + 1":   lambda m, T: T[m - 1] + 1,
    "T(n/2) + 1":   lambda m, T: T[m // 2] + 1,
    "T(n-1) + n":   lambda m, T: T[m - 1] + m,
    "2T(n/2) + n":  lambda m, T: 2 * T[m // 2] + m,
}
for name, rule in recurrences.items():
    a, b = evaluate(rule, 1024), evaluate(rule, 2048)
    print(f"T(n) = {name:<12} T(1024) = {a:>9,}   T(2048) = {b:>9,}   ratio {b / a:.2f}")
```

```output
T(n) = T(n-1) + 1   T(1024) =     1,024   T(2048) =     2,048   ratio 2.00
T(n) = T(n/2) + 1   T(1024) =        11   T(2048) =        12   ratio 1.09
T(n) = T(n-1) + n   T(1024) =   524,800   T(2048) = 2,098,176   ratio 4.00
T(n) = 2T(n/2) + n  T(1024) =    11,264   T(2048) =    24,576   ratio 2.18
```

Each `rule` takes m and the table so far and returns T(m); `m // 2` is n/2 rounded down. Filling the table **bottom-up** like this, instead of with a recursive function, avoids thousands of nested calls: the dynamic programming lessons use exactly this idea. (Deep recursion is risky in this browser's Python in particular: a few hundred levels of a decorated recursive function can exhaust the browser's own stack before Python's limit is reached.)

The ratios identify the growth: 2 for T(n − 1) + 1 (linear), barely above 1 for T(n/2) + 1 (it rises by one step: logarithmic), about 4 for T(n − 1) + n (quadratic), and a little over 2 for 2T(n/2) + n, which is n log n: doubling n doubles the n and adds one to the log. The rest of the lesson shows how to get these answers on paper.

## Unrolling

**Unrolling** substitutes the recurrence into itself until a pattern shows. For T(n) = T(n − 1) + c:

T(n) = T(n − 1) + c = T(n − 2) + 2c = T(n − 3) + 3c = … = T(1) + (n − 1)c,

which is O(n). For T(n) = T(n/2) + c, each step halves n, and after k steps n has become n/2ᵏ. That reaches 1 when k = log₂ n, so T(n) = T(1) + c·log₂ n = O(log n).

For T(n) = T(n − 1) + cn, unrolling gives cn + c(n − 1) + c(n − 2) + … + c·2 + T(1), an arithmetic series adding up to about cn²/2: O(n²). This is the "shrinking by one, doing a full pass each time" pattern, and it is the worst-case cost of the simple sorting algorithms.

For T(n) = 2T(n − 1) + c, every level **doubles** the number of calls: 1, 2, 4, …, 2ⁿ⁻¹ calls, so the total is at most about 2ⁿ: exponential. (The real Fibonacci count grows like 1.618ⁿ, since the second call is on n − 2, but that is still exponential.) That is why the naive Fibonacci needed hundreds of thousands of calls for n = 25.

## The recursion tree

Unrolling gets messy when a call makes several recursive calls. The **recursion tree** organises the same calculation: draw each call as a node, its recursive calls as its children, and write beside each node the work it does **outside** its recursive calls. The total cost is the sum over all nodes, best added up **level by level**.

For merge sort's T(n) = 2T(n/2) + n: the top call does n work. Its two children each do n/2, which is n in total. The four grandchildren each do n/4, again n in total. Every level does n work, and halving reaches size 1 after log₂ n levels, so the total is n·log₂ n. The code below builds the tree's levels for n = 16 and prints the work per level. Predict before running: how many levels, and how much work on each?

```python type
def tree_levels(n, branches, shrink, work):
    sizes = [n]
    level = 0
    while sizes:
        print(f"level {level}: {len(sizes):>3} calls of size {sizes[0]:>3}, work on this level {sum(work(s) for s in sizes):>4}")
        sizes = [shrink(s) for s in sizes for _ in range(branches) if s > 1]
        level += 1

print("merge sort, T(n) = 2T(n/2) + n:")
tree_levels(16, branches=2, shrink=lambda s: s // 2, work=lambda s: s)
print("binary search, T(n) = T(n/2) + 1:")
tree_levels(16, branches=1, shrink=lambda s: s // 2, work=lambda s: 1)
```

```output
merge sort, T(n) = 2T(n/2) + n:
level 0:   1 calls of size  16, work on this level   16
level 1:   2 calls of size   8, work on this level   16
level 2:   4 calls of size   4, work on this level   16
level 3:   8 calls of size   2, work on this level   16
level 4:  16 calls of size   1, work on this level   16
binary search, T(n) = T(n/2) + 1:
level 0:   1 calls of size  16, work on this level    1
level 1:   1 calls of size   8, work on this level    1
level 2:   1 calls of size   4, work on this level    1
level 3:   1 calls of size   2, work on this level    1
level 4:   1 calls of size   1, work on this level    1
```

`branches` is the number of recursive calls each call makes, `shrink` gives the size of each, and `work` the cost outside the recursive calls. Calls of size 1 are the base case and make no further calls.

Merge sort has 5 levels (sizes 16, 8, 4, 2, 1), each doing 16 work: 80 in total, which is n(log₂ n + 1). Binary search's "tree" is a single chain of 5 calls doing 1 work each: log₂ n + 1. The recursion tree also shows **where** the work is: spread evenly across levels for merge sort, which is why its answer has the log factor.

## The master theorem

Divide-and-conquer recurrences mostly share one shape: split into a subproblems of size n/b, and do O(nᵈ) work to split and combine:

T(n) = a·T(n/b) + O(nᵈ).

The recursion tree for this shape has a geometric pattern. Level k has aᵏ calls of size n/bᵏ, doing a total of about nᵈ·(a/bᵈ)ᵏ work. So the work per level grows, stays equal, or shrinks by a factor of a/bᵈ each level, and the **master theorem** reads off the answer by comparing d with log_b a:

- If d > log_b a (equivalently a < bᵈ), the work shrinks down the tree and the **top** level dominates: T(n) = O(nᵈ).
- If d = log_b a (a = bᵈ), every level does the same work, over log n levels: T(n) = O(nᵈ log n).
- If d < log_b a (a > bᵈ), the work grows down the tree and the **leaves** dominate: there are n^(log_b a) of them, so T(n) = O(n^(log_b a)).

Checking it on known cases: binary search has a = 1, b = 2, d = 0, and log₂ 1 = 0 = d, so O(log n). Merge sort has a = 2, b = 2, d = 1, and log₂ 2 = 1 = d, so O(n log n). Predict before running: what does the theorem say for a = 3, b = 2, d = 1 (Karatsuba's multiplication algorithm, which splits numbers in half but needs only three half-size multiplications instead of four)? The cell compares the predicted exponent with one measured by doubling.

```python type
import math
from functools import cache

def power_of_n(e):
    if abs(e - round(e)) < 1e-9:
        e = round(e)
        return "1" if e == 0 else "n" if e == 1 else f"n^{e}"
    return f"n^{e:.3f}"

def master(a, b, d):
    critical = math.log(a, b)
    if abs(d - critical) < 1e-9:
        return "O(log n)" if d == 0 else f"O({power_of_n(d)} log n)"
    return f"O({power_of_n(max(d, critical))})"

def measured_exponent(a, b, d, n=2**16):
    @cache
    def T(m):
        return 1 if m <= 1 else a * T(m // b) + m**d
    return math.log2(T(2 * n) / T(n))

for a, b, d, name in [(1, 2, 0, "binary search"), (2, 2, 1, "merge sort"), (3, 2, 1, "Karatsuba multiplication"),
                      (4, 2, 1, "schoolbook multiplication, split"), (2, 2, 2, "two halves, quadratic combine")]:
    print(f"{name:<34} a={a} b={b} d={d}: {master(a, b, d):<16} measured doubling exponent {measured_exponent(a, b, d):.3f}")
```

```output
binary search                      a=1 b=2 d=0: O(log n)         measured doubling exponent 0.082
merge sort                         a=2 b=2 d=1: O(n log n)       measured doubling exponent 1.082
Karatsuba multiplication           a=3 b=2 d=1: O(n^1.585)       measured doubling exponent 1.585
schoolbook multiplication, split   a=4 b=2 d=1: O(n^2)           measured doubling exponent 2.000
two halves, quadratic combine      a=2 b=2 d=2: O(n^2)           measured doubling exponent 2.000
```

`math.log(a, b)` is the logarithm of a to base b, and `power_of_n` just writes exponents tidily (n rather than n^1). The measured exponent is log₂(T(2n)/T(n)), as in the Big-O lesson's doubling experiment.

Karatsuba gives O(n^1.585), since log₂ 3 ≈ 1.585: genuinely faster than the O(n²) of splitting into four half-size multiplications, which is no better than schoolbook multiplication. Reducing the number of subproblems, not the work per level, is what changed the exponent. The measured exponents agree. A log factor shows up as a small extra in the exponent, which shrinks as n grows: about 0.08 for binary search's O(log n) and 1.08 for merge sort's O(n log n). The master theorem only covers equal-sized parts and polynomial extra work; for anything else, the recursion tree still works.

::: challenge Count the calls [easy]
Write `count_calls(n)` returning the exact number of calls the naive function below makes for input n (including the first call), by writing and evaluating its recurrence with `functools.cache`, not by running the function. Then set `calls_30` to `count_calls(30)` and `growth` to the class of the recurrence as one of `"O(n)"`, `"O(n^2)"`, `"O(2^n)"` or `"O(log n)"`.

```text
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

```python starter
from functools import cache

def count_calls(n):
    return 0

calls_30 = 0
growth = ""
print(count_calls(5), calls_30, growth)
```

```python solution
from functools import cache

@cache
def count_calls(n):
    if n < 2:
        return 1
    return 1 + count_calls(n - 1) + count_calls(n - 2)

calls_30 = count_calls(30)
growth = "O(2^n)"
print(count_calls(5), calls_30, growth)
```

```python test
assert "count_calls" in dir(), "Keep the function's name as count_calls."
def _fib_calls(_n):
    _c = [0]
    def _f(_m):
        _c[0] += 1
        return _m if _m < 2 else _f(_m - 1) + _f(_m - 2)
    _f(_n)
    return _c[0]
for _n in [0, 1, 2, 5, 12]:
    assert count_calls(_n) == _fib_calls(_n), f"For n = {_n} the function makes {_fib_calls(_n)} calls; count_calls gave {count_calls(_n)}. C(n) = 1 + C(n − 1) + C(n − 2), with C(0) = C(1) = 1."
assert calls_30 == 2692537, "calls_30 should be count_calls(30)."
assert growth == "O(2^n)", "Two calls on nearly the same size: the count roughly multiplies by 1.6 per step, exponential growth, so O(2^n) is the right family."
"SUCCESS: 2,692,537 calls for n = 30, from a recurrence evaluated in microseconds. (The exact growth is about 1.618^n, the golden ratio to the n: still exponential.)"
```

Hint: The call count C(n) is 1 (this call) plus the calls made by the two recursive calls: C(n) = 1 + C(n − 1) + C(n − 2), with C(0) = C(1) = 1. Decorate the function with `@cache`.
:::

::: challenge Apply the master theorem [medium]
Write `master_case(a, b, d)` returning which case of the master theorem applies to T(n) = aT(n/b) + O(nᵈ): the string `"top"` if d > log_b a, `"balanced"` if they are equal, or `"leaves"` if d < log_b a. Compare a with bᵈ rather than computing a logarithm, so the equality test is exact for whole numbers. Then write `master_exponent(a, b, d)` returning the exponent e in the answer O(nᵉ) (ignoring any log factor): d in the first two cases, log_b a in the third.

Use them to fill in `classes`, a dictionary from each algorithm name to `(case, exponent rounded to 3 decimal places)` for: "binary search" (1, 2, 0), "merge sort" (2, 2, 1), "Strassen" (7, 2, 2) and "slow split" (2, 2, 2).

```python starter
import math

def master_case(a, b, d):
    return ""

def master_exponent(a, b, d):
    return 0.0

classes = {}
print(classes)
```

```python solution
import math

def master_case(a, b, d):
    if a < b ** d:
        return "top"
    if a == b ** d:
        return "balanced"
    return "leaves"

def master_exponent(a, b, d):
    return math.log(a, b) if master_case(a, b, d) == "leaves" else d

classes = {name: (master_case(a, b, d), round(master_exponent(a, b, d), 3))
           for name, (a, b, d) in {"binary search": (1, 2, 0), "merge sort": (2, 2, 1),
                                   "Strassen": (7, 2, 2), "slow split": (2, 2, 2)}.items()}
print(classes)
```

```python test
assert "master_case" in dir() and "master_exponent" in dir(), "Keep both function names."
for (_a, _b, _d), _want in [((1, 2, 0), "balanced"), ((2, 2, 1), "balanced"), ((4, 2, 2), "balanced"), ((3, 3, 1), "balanced"),
                             ((7, 2, 2), "leaves"), ((3, 2, 1), "leaves"), ((2, 2, 2), "top"), ((1, 2, 1), "top")]:
    assert master_case(_a, _b, _d) == _want, f"master_case({_a}, {_b}, {_d}) should be {_want!r}: compare a = {_a} with b^d = {_b ** _d}."
assert abs(master_exponent(3, 2, 1) - 1.58496) < 1e-4 and master_exponent(2, 2, 2) == 2 and master_exponent(2, 2, 1) == 1, "The exponent is log_b a in the 'leaves' case and d otherwise."
assert classes == {"binary search": ("balanced", 0), "merge sort": ("balanced", 1), "Strassen": ("leaves", 2.807), "slow split": ("top", 2)}, f"Got {classes}."
"SUCCESS: Strassen's 7 half-size matrix products instead of 8 give O(n^2.807) instead of O(n^3); the slow split's quadratic combine step dominates its own recursion."
```

Hint: The three cases correspond to a < bᵈ, a = bᵈ and a > bᵈ. For the exponent in the leaves case, `math.log(a, b)`.
:::

::: challenge A three-way split [medium]
A function splits its input into **three** parts of size n/3, recurses on each, and then does work proportional to n to combine them, with T(1) = 1. Write `three_way(n)` evaluating T(n) = 3T(n // 3) + n with a memo table (write `3 * three_way(n // 3)`, one call, not three separate calls: without the memo table, three calls per level would mean billions of calls for n = 3²⁰), and use it to compute `ratio_big` = T(3²⁰) / T(3¹⁹). Then set `predicted` to the class the master theorem gives, as one of `"O(n)"`, `"O(n log n)"`, `"O(n^2)"`.

Finally, for exact powers of 3 the recurrence has the closed form T(n) = n(log₃ n + 1). Write `closed_form(k)` returning that value for n = 3ᵏ as an integer, and check it agrees with `three_way` for k from 0 to 12.

```python starter
from functools import cache

def three_way(n):
    return 0

def closed_form(k):
    return 0

ratio_big = 0.0
predicted = ""
print(three_way(27), closed_form(3))
```

```python solution
from functools import cache

@cache
def three_way(n):
    if n <= 1:
        return 1
    return 3 * three_way(n // 3) + n

def closed_form(k):
    return 3 ** k * (k + 1)

ratio_big = three_way(3 ** 20) / three_way(3 ** 19)
predicted = "O(n log n)"
assert all(three_way(3 ** k) == closed_form(k) for k in range(13))
print(three_way(27), closed_form(3))
```

```python test
assert "three_way" in dir() and "closed_form" in dir(), "Keep both function names."
assert three_way(1) == 1 and three_way(3) == 6 and three_way(27) == 108, f"T(1) = 1, T(3) = 3·1 + 3 = 6, T(27) = 108; got {three_way(1)}, {three_way(3)}, {three_way(27)}."
for _k in range(13):
    assert closed_form(_k) == three_way(3 ** _k), f"closed_form({_k}) should equal three_way(3^{_k}) = {three_way(3 ** _k)}."
assert abs(ratio_big - 3 ** 20 * 21 / (3 ** 19 * 20)) < 1e-9, "ratio_big should be T(3^20) / T(3^19)."
assert predicted == "O(n log n)", "a = 3, b = 3, d = 1: a = b^d, the balanced case, so O(n log n)."
f"SUCCESS: Tripling n multiplies T by {ratio_big:.3f}: a bit more than 3, the extra log factor. Each of the log₃ n + 1 levels does n work, exactly as the recursion tree says."
```

Hint: The base case is T(1) = 1; otherwise `3 * three_way(n // 3) + n`, decorated with `@cache`. For n = 3ᵏ, the closed form is `3**k * (k + 1)`. With a = 3, b = 3, d = 1 the theorem is in its balanced case.
:::

## What you learned

- The cost of recursive code satisfies a recurrence: the work done outside the recursive calls plus the cost of the calls themselves. Read it straight from the code.
- Unrolling solves simple recurrences: T(n − 1) + c is O(n), T(n/2) + c is O(log n), T(n − 1) + cn is O(n²), and 2T(n − 1) + c is O(2ⁿ).
- The recursion tree adds up the work level by level: merge sort's 2T(n/2) + n does n per level over log n levels, so O(n log n).
- The master theorem solves T(n) = aT(n/b) + O(nᵈ) by comparing a with bᵈ: top-heavy O(nᵈ), balanced O(nᵈ log n), or leaf-heavy O(n^(log_b a)). Fewer subproblems (Karatsuba, Strassen) lower the exponent.

The next lesson turns from how long code takes to whether it is right: proving loops correct with invariants.
