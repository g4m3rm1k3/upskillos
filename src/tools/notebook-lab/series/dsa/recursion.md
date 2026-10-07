# Recursion

A **recursive** function is one that calls itself. That sounds circular, and it would be, except that each call works on a **smaller** version of the problem, until the problem is so small that the answer is obvious. Many problems are naturally described this way: the size of a folder is the size of its files plus the sizes of its subfolders; to sort a list, sort each half and merge them; to list every arrangement of some letters, pick a first letter and arrange the rest. Writing the code the same way the problem is described is what makes recursion powerful.

This lesson covers:

- the two parts of every recursive function: the **base case** and the **recursive case**;
- what actually happens on the call stack, traced step by step;
- "recursive thinking": trusting the smaller call instead of tracing it;
- recursion on nested structures and branching recursion that generates possibilities;
- the pitfalls: missing base cases, Python's depth limit and repeated work.

## Base case and recursive case

The factorial of n, written n!, is 1 × 2 × … × n, so 5! = 120. It can also be defined in terms of itself: n! = n × (n − 1)!, with 0! = 1. That definition is already a recursive function:

- the **base case**, n = 0, is answered directly, with no further call;
- the **recursive case** reduces the problem (n) to a smaller one (n − 1) and builds the answer from its result.

To see what happens, this version prints each call indented by its depth. Predict before running: in what order will the "returns" lines appear?

```python type
def factorial(n, depth=0):
    indent = "    " * depth
    print(f"{indent}factorial({n}) called")
    if n == 0:
        result = 1
    else:
        result = n * factorial(n - 1, depth + 1)
    print(f"{indent}factorial({n}) returns {result}")
    return result

factorial(4)
```

```output
factorial(4) called
    factorial(3) called
        factorial(2) called
            factorial(1) called
                factorial(0) called
                factorial(0) returns 1
            factorial(1) returns 1
        factorial(2) returns 2
    factorial(3) returns 6
factorial(4) returns 24
24
```

`depth` is an extra argument used only for the indentation; each call passes `depth + 1` to the next.

The calls go **down** to the base case, factorial(0), and only then do the returns come back **up**, innermost first: 1, 1, 2, 6, 24. While factorial(0) runs, the four calls above it are all paused, each waiting for its inner call to return so it can do its multiplication. Each paused call is a **frame** on the call stack (from the stacks lesson), holding its own n. That is how four different values of n can exist at once without interfering.

## Trusting the recursion

Tracing every call is useful once, to see the mechanism. To **write** recursive functions, a different habit works better, sometimes called the "recursive leap of faith": assume the function already works for smaller inputs, and ask only how to build the answer for this input from the smaller answer. Then check that the base case is right and that every call really is smaller.

For example, to sum a list: the sum of an empty list is 0 (base case), and the sum of any other list is its first item plus the sum of the rest (trusting the recursive call to get the rest right). To reverse a string: an empty string reverses to itself; otherwise, reverse everything after the first character, then put the first character at the end. Predict before running: what will `power(2, 10)` print, and how many calls does it make?

```python type
def total(items):
    if not items:
        return 0
    return items[0] + total(items[1:])

def reverse(text):
    if text == "":
        return ""
    return reverse(text[1:]) + text[0]

calls = 0
def power(x, n):
    global calls
    calls += 1
    if n == 0:
        return 1
    half = power(x, n // 2)
    return half * half if n % 2 == 0 else half * half * x

print(total([3, 1, 4, 1, 5]), reverse("stressed"))
print(power(2, 10), "using", calls, "calls")
calls = 0
print(power(3, 1000) % 1000, "(last three digits of 3^1000) using", calls, "calls")
```

```output
14 desserts
1024 using 5 calls
1 (last three digits of 3^1000) using 11 calls
```

`total` and `reverse` slice their inputs, which copies (O(n) each time), so they are O(n²); they are here to show the thinking, and the costs lesson's warning about slicing still applies.

`power` is the interesting one. It does not reduce n by one each time: it uses x^n = (x^(n/2))², with an extra factor of x when n is odd. Halving n each call means only about log₂ n calls: 5 calls for n = 10 and 11 for n = 1,000, against 1,000 multiplications done one at a time. This is **fast exponentiation**, and the "solve half, then combine" shape returns in binary search, merge sort and divide and conquer.

## Recursion on nested structures

Recursion fits naturally when the **data** is recursive: a folder contains folders, a comment thread contains replies with their own replies, a JSON document contains lists of objects containing lists. The shape of the code follows the shape of the data. Here a folder tree is nested dictionaries (a folder is a dictionary; a file is a number of bytes). Predict before running: what is the total size, and how deep is the deepest file?

```python type
tree = {
    "readme.txt": 120,
    "src": {"main.py": 2_000, "utils": {"text.py": 800, "maths.py": 650}},
    "data": {"raw": {"big.csv": 50_000}, "clean.csv": 12_000},
    "empty": {},
}

def folder_size(folder):
    size = 0
    for name, item in folder.items():
        if isinstance(item, dict):
            size += folder_size(item)
        else:
            size += item
    return size

def deepest(folder, depth=1):
    depths = [deepest(item, depth + 1) if isinstance(item, dict) else depth for item in folder.values()]
    return max(depths, default=0)

def show(folder, indent=0):
    for name, item in folder.items():
        if isinstance(item, dict):
            print("    " * indent + name + "/")
            show(item, indent + 1)
        else:
            print("    " * indent + f"{name} ({item:,} bytes)")

show(tree)
print("total size:", f"{folder_size(tree):,}", "bytes; deepest file at level", deepest(tree))
```

```output
readme.txt (120 bytes)
src/
    main.py (2,000 bytes)
    utils/
        text.py (800 bytes)
        maths.py (650 bytes)
data/
    raw/
        big.csv (50,000 bytes)
    clean.csv (12,000 bytes)
empty/
total size: 65,570 bytes; deepest file at level 3
```

`max(depths, default=0)` gives 0 for an empty folder, which has no files at any depth.

The total is 65,570 bytes, and the deepest files sit three levels down (in src/utils and data/raw). None of these functions knows how deep the tree is; each handles one level and trusts the recursive call with the rest. A loop-based version would need an explicit stack, as the stacks lesson showed.

## Branching recursion: generating possibilities

When a function calls itself **more than once**, the calls form a tree, and the function can explore many possibilities. To list every ordering (**permutation**) of some items: for each choice of first item, list every ordering of the remaining items and put the choice in front. Predict before running: how many orderings do 4 items have, and how many for 10?

```python type
def permutations(items):
    if len(items) <= 1:
        return [list(items)]
    result = []
    for i, first in enumerate(items):
        rest = items[:i] + items[i + 1:]
        for ordering in permutations(rest):
            result.append([first] + ordering)
    return result

orders = permutations(["a", "b", "c"])
print(len(orders), ["".join(o) for o in orders])
print("4 items:", len(permutations([1, 2, 3, 4])), "orderings")

import math
print("10 items:", f"{math.factorial(10):,}", "orderings; 20 items:", f"{math.factorial(20):,}")
```

```output
6 ['abc', 'acb', 'bac', 'bca', 'cab', 'cba']
4 items: 24 orderings
10 items: 3,628,800 orderings; 20 items: 2,432,902,008,176,640,000
```

`items[:i] + items[i + 1:]` is the list without item i.

Three items give 3! = 6 orderings and four give 24. The counts grow as n!, faster even than 2ⁿ: 10 items have 3,628,800 orderings, and 20 have about 2.4 × 10¹⁸, beyond any computer. Branching recursion is the tool for searching through possibilities, and the backtracking lesson shows how to **prune** branches that cannot succeed so the search stays feasible.

## Pitfalls

Three things go wrong with recursion, and each has a clear symptom:

1. **A missing or unreachable base case.** If the input never reaches the base case (say, factorial(−1), which steps −2, −3, … away from 0), the calls never stop. Python stops them at its **recursion limit**, about 1,000 frames, with a `RecursionError`.
2. **Too deep for Python, even when correct.** A correct recursion on a list of 10,000 items, one call per item, also hits the limit. Python does not optimise "tail calls" the way some languages do, so in Python, recursion that goes one level per item is for small inputs; use a loop or an explicit stack for long ones. Recursion that halves the problem (depth log n) is always fine.
3. **Repeated work.** Branching recursion can solve the same subproblem many times, as the plain stair-climbing function did in the previous lesson (about 250,000 calls for n = 25). A memo table fixes it.

```python type
import sys

def countdown(n):
    if n == 0:
        return "liftoff"
    return countdown(n - 1)

print(countdown(500))
for bad in [-1, 5_000]:
    try:
        countdown(bad)
    except RecursionError:
        print(f"countdown({bad}): RecursionError after about {sys.getrecursionlimit()} levels")
```

```output
liftoff
countdown(-1): RecursionError after about 1000 levels
countdown(5000): RecursionError after about 1000 levels
```

countdown(−1) never reaches 0; countdown(5,000) would, but needs 5,001 nested calls. `sys.setrecursionlimit` can raise the limit, but each frame uses real memory and a very deep recursion can crash the interpreter outright, so rewriting as a loop is the better fix.

::: challenge Digit sum [easy]
Write a **recursive** function `digit_sum(n)` returning the sum of the decimal digits of a non-negative integer `n`: `digit_sum(4096)` is 4 + 0 + 9 + 6 = 19. Use `n % 10` (the last digit) and `n // 10` (the number without its last digit), with a base case for single-digit numbers. Don't convert to a string, and don't use a loop.

```python starter
def digit_sum(n):
    return 0

print(digit_sum(4096))
```

```python solution
def digit_sum(n):
    if n < 10:
        return n
    return n % 10 + digit_sum(n // 10)

print(digit_sum(4096))
```

```python test
import ast as _ast
assert "digit_sum" in dir(), "Keep the function's name as digit_sum."
for _n, _want in [(4096, 19), (0, 0), (7, 7), (10, 1), (999, 27), (10**20 + 5, 6)]:
    assert digit_sum(_n) == _want, f"digit_sum({_n}) should be {_want}, got {digit_sum(_n)}."
_fn = [_x for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.FunctionDef) and _x.name == "digit_sum"][0]
assert any(isinstance(_c, _ast.Call) and getattr(_c.func, "id", None) == "digit_sum" for _c in _ast.walk(_fn)), "digit_sum should call itself."
assert not any(isinstance(_x, (_ast.For, _ast.While)) for _x in _ast.walk(_fn)), "Use recursion instead of a loop."
assert "str(" not in _source, "Work with % and //, not by converting to a string."
"SUCCESS: The last digit plus the digit sum of the rest, down to a single digit: one call per digit, so the depth is only the number of digits."
```

Hint: If `n < 10`, the answer is `n` itself. Otherwise it is `n % 10` plus `digit_sum(n // 10)`.
:::

::: challenge Flatten a nested list [medium]
Write a recursive function `flatten(nested)` that takes a list whose items are numbers, strings or further lists (nested to any depth) and returns a single flat list of all the non-list items, in order. Strings are items, not lists to open up.

```python starter
def flatten(nested):
    return []

print(flatten([1, [2, [3, "four"]], [], [[5]]]))
```

```python solution
def flatten(nested):
    result = []
    for item in nested:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result

print(flatten([1, [2, [3, "four"]], [], [[5]]]))
```

```python test
assert "flatten" in dir(), "Keep the function's name as flatten."
assert flatten([1, [2, [3, "four"]], [], [[5]]]) == [1, 2, 3, "four", 5], f"Got {flatten([1, [2, [3, 'four']], [], [[5]]])}."
assert flatten([]) == [] and flatten([[], [[]]]) == [], "Empty lists contribute nothing."
assert flatten(["ab", ["cd"]]) == ["ab", "cd"], "Strings are items: don't split them into characters."
assert flatten([[[[[[7]]]]]]) == [7], "Any depth of nesting should work."
_orig = [1, [2, 3]]
flatten(_orig)
assert _orig == [1, [2, 3]], "Don't change the input list."
"SUCCESS: Each call handles one level and trusts the recursive call with any list inside: the shape of the code follows the shape of the data."
```

Hint: Loop over the items. If an item is a list (`isinstance(item, list)`), extend the result with `flatten(item)`; otherwise append the item.
:::

::: challenge All subsets [medium]
Write a recursive function `subsets(items)` returning a list of all subsets of the list `items`, each subset a list keeping the items' original order. Use the "include or exclude" idea: the subsets of `items` are the subsets of `items[1:]`, plus each of those with `items[0]` added at the front. Return the subsets **without** the first item before those **with** it, so `subsets([1, 2])` is `[[], [2], [1], [1, 2]]`.

Then set `count_20` to the number of subsets of a 20-item list, **without** generating them, and write the reason in a comment.

```python starter
def subsets(items):
    return []

count_20 = 0
print(subsets([1, 2, 3]))
```

```python solution
def subsets(items):
    if not items:
        return [[]]
    without_first = subsets(items[1:])
    with_first = [[items[0]] + s for s in without_first]
    return without_first + with_first

count_20 = 2 ** 20  # each item is either in or out: 2 choices per item
print(subsets([1, 2, 3]))
```

```python test
import itertools as _it
assert "subsets" in dir(), "Keep the function's name as subsets."
assert subsets([]) == [[]], "The empty list has exactly one subset: the empty list."
assert subsets([1, 2]) == [[], [2], [1], [1, 2]], f"subsets([1, 2]) should be [[], [2], [1], [1, 2]]; got {subsets([1, 2])}."
_got = subsets(["a", "b", "c", "d"])
assert len(_got) == 16, f"Four items have 16 subsets; got {len(_got)}."
_want = sorted(list(_c) for _r in range(5) for _c in _it.combinations(["a", "b", "c", "d"], _r))
assert sorted(_got) == _want, "Some subsets are missing, repeated, or out of order inside."
assert count_20 == 1_048_576, "Each of the 20 items is either in or out: 2 × 2 × … × 2 = 2^20 = 1,048,576."
"SUCCESS: Each item doubles the number of subsets (in or out), so n items give 2^n: branching recursion generates them all, and 2^n is why such searches must be small or pruned."
```

Hint: Base case: the empty list's only subset is `[[]]`. Otherwise compute `rest = subsets(items[1:])`, then return `rest + [[items[0]] + s for s in rest]`.
:::

## What you learned

- A recursive function has a base case answered directly and a recursive case that reduces the problem and builds on the smaller answer. Every call must move towards the base case.
- Each call gets its own frame on the call stack; calls go down to the base case and results come back up.
- Write recursion by trusting the smaller call ("the leap of faith"), especially on recursive data like nested folders and lists. Halving the problem, as in fast exponentiation, needs only log n calls.
- Branching recursion generates possibilities (n! orderings, 2ⁿ subsets). Python's recursion limit (about 1,000) and repeated subproblems are the main pitfalls; use loops for long linear recursions and memo tables for repeated work.

The next lesson shows how to work out the running time of recursive code, using recurrences.
