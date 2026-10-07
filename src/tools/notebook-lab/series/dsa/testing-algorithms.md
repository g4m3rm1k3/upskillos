# Testing algorithms

Algorithms fail in ways that hand-picked examples rarely catch: an off-by-one at the boundary of a binary search, a heap that breaks only after a particular sequence of pushes and pops, a sort that loses a duplicate. You choose examples you thought of, and bugs live in the cases you did not think of. Python from Zero showed one remedy: compare a clever function against a slow, obviously correct one on many random inputs. This lesson builds that into a full toolkit, the same techniques the challenge tests in this series have used all along.

This lesson covers:

- why example tests miss bugs, and random tests against an **oracle** catch them;
- **properties**: facts that must hold for every input, used when no oracle exists;
- **shrinking**: turning a large failing random input into the smallest one that still fails;
- **invariant checks** and **model-based tests** for data structures, driven by random sequences of operations.

## Examples miss what you didn't think of

Here is a binary search for "the first index whose value is at least the target" with a subtle bug. It passes a reasonable set of hand-written tests. Predict before running: how many random trials does it take to find a failing case?

```python type
import random, bisect

def lower_bound(values, target):
    lo, hi = 0, len(values) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if values[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

examples = [([1, 3, 5, 7], 5, 2), ([1, 3, 5, 7], 1, 0), ([2, 2, 2], 2, 0), ([1, 3, 5, 7], 4, 2)]
print("example tests pass:", all(lower_bound(v, t) == want for v, t, want in examples))

rng = random.Random(1)
for trial in range(1, 1001):
    values = sorted(rng.randint(0, 9) for _ in range(rng.randint(0, 6)))
    target = rng.randint(-1, 10)
    expected = bisect.bisect_left(values, target)
    if lower_bound(values, target) != expected:
        print(f"trial {trial}: lower_bound({values}, {target}) = {lower_bound(values, target)}, expected {expected}")
        break
```

```output
example tests pass: True
trial 8: lower_bound([0, 3, 6, 6], 10) = 3, expected 4
```

`bisect.bisect_left` from the standard library is the **oracle**: a trusted implementation of the same function. An oracle can also be a slow brute-force version, such as scanning the list for the first index.

The bug is that `hi` starts at the last index instead of one past it, so a target larger than everything returns the last index instead of `len(values)`. None of the hand-picked examples had a target above every value. Random inputs found one within a few trials, and the printed case shows exactly what went wrong. Random testing does not need you to imagine the bug, only to describe the inputs. (The generator includes empty lists, where `lower_bound` happens to be right: always make generators produce the edge cases.)

## Properties: when there is no oracle

Often there is no trusted second implementation, for example when you are writing the only version of a new algorithm. You can still test **properties**: statements that must be true for every input. Good kinds of property:

- **Output checks**: a sort's output is in order **and** is a rearrangement of the input (same items, same counts). Both are needed: an "in order" check alone passes for a function that returns `[]`.
- **Round trips**: decoding an encoding gives back the original. `decode(encode(x)) == x`.
- **Invariance (metamorphic relations)**: changing the input in a known way changes the output in a known way. Shuffling the input must not change a sort's output; adding the same constant to every edge weight must not change which path is shortest when all paths have the same number of edges; in a directed graph, the distance from a to b must equal the distance from b to a in the graph with every edge reversed.

Here run-length encoding is tested with a round trip and a minimality property, with no oracle anywhere. Predict before running: which property catches the bug?

```python type
from collections import Counter

def rle_encode(text):
    out = []
    for ch in text:
        if out and out[-1][0] == ch:
            out[-1][1] += 1
        else:
            out.append([ch, 1])
    return [(ch, n) for ch, n in out]

def rle_decode(pairs):
    return "".join(ch * n for ch, n in pairs)

def buggy_encode(text):
    out = []
    for ch in text:
        if out and out[-1][0] == ch and out[-1][1] < 9:
            out[-1][1] += 1
        else:
            out.append([ch, 1])
    return [(ch, n) for ch, n in out]

def check_properties(encode, trials=500, seed=2):
    rng = random.Random(seed)
    for _ in range(trials):
        text = "".join(rng.choice("aab") * rng.randint(1, 12) for _ in range(rng.randint(0, 5)))
        pairs = encode(text)
        if rle_decode(pairs) != text:
            return f"round trip fails for {text!r}"
        if any(a[0] == b[0] for a, b in zip(pairs, pairs[1:])):
            return f"not minimal for {text!r}: {pairs}"
    return "all properties hold"

print("correct encoder:", check_properties(rle_encode))
print("buggy encoder:  ", check_properties(buggy_encode))
```

```output
correct encoder: all properties hold
buggy encoder:   not minimal for 'aaaaaaaaaaaabbbbb': [('a', 9), ('a', 3), ('b', 5)]
```

The buggy encoder caps runs at 9 (perhaps for a one-digit file format) and starts a new pair after that.

The round trip still holds for the buggy version, because two pairs of the same character decode to the same text. But the minimality property, "no two neighbouring pairs share a character", catches it. One property is rarely enough: each checks one aspect, and bugs hide in the aspects nobody checked.

## Shrinking a failing case

A random failure is often large and noisy: a 40-item list where 2 items matter. **Shrinking** reduces it automatically. Repeatedly try smaller variants (drop an item, replace a number by a smaller one), and keep any variant that still fails, until nothing smaller fails. Libraries such as Hypothesis do this with great sophistication, but the core idea is a short loop. Predict before running: what is the smallest list that breaks this "remove duplicates" function?

```python type
def dedupe(values):
    out = []
    for i, v in enumerate(values):
        if i == 0 or v != values[i - 1]:
            out.append(v)
    return out

def fails(values):
    return dedupe(values) != list(dict.fromkeys(values))

def shrink(values, still_fails):
    current = list(values)
    improved = True
    while improved:
        improved = False
        for i in range(len(current)):
            candidate = current[:i] + current[i + 1:]
            if still_fails(candidate):
                current, improved = candidate, True
                break
        else:
            for i, v in enumerate(current):
                if v != 0:
                    candidate = current[:i] + [v // 2] + current[i + 1:]
                    if still_fails(candidate):
                        current, improved = candidate, True
                        break
    return current

rng = random.Random(5)
while True:
    big = [rng.randint(0, 50) for _ in range(40)]
    if fails(big):
        break
print("random failure:", big)
print("shrunk to:     ", shrink(big, fails))
```

```output
random failure: [39, 16, 47, 22, 50, 44, 47, 41, 33, 1, 29, 49, 15, 41, 3, 10, 7, 23, 30, 15, 24, 34, 6, 36, 15, 0, 46, 13, 26, 17, 11, 49, 24, 10, 48, 4, 8, 39, 39, 28]
shrunk to:      [24, 49, 24]
```

`dict.fromkeys(values)` keeps the first occurrence of each value in order, making it a handy oracle for "remove duplicates, keep order".

`dedupe` only removes duplicates that are **next to each other**. The shrinker reduced 40 random numbers to a three-item list in which a value reappears after a different one. That is the bug in its simplest form, and much easier to reason about than the original. Always shrink before debugging.

## Invariants and model-based tests

Data structures have **invariants**, conditions that must hold between operations (the invariants lesson met them for loops). In a heap, each parent is no larger than its children; in a binary search tree, keys are ordered. A `_check()` method that verifies the invariant, called after every operation in tests, catches corruption at the operation that caused it, not ten operations later when an answer comes out wrong.

**Model-based testing** goes further. Generate a random **sequence of operations**, apply it both to the structure under test and to a simple **model** (a plain Python list queried with `min()`, standing in for a heap), and compare every answer. Combined with shrinking the operation sequence, this finds and minimises bugs that only appear after a particular history. Predict before running: how short is the shrunk sequence that breaks the buggy heap?

```python type
class Heap:
    def __init__(self, sift_bug=False):
        self.a, self.sift_bug = [], sift_bug
    def push(self, x):
        self.a.append(x)
        i = len(self.a) - 1
        while i > 0 and self.a[(i - 1) // 2] > self.a[i]:
            self.a[i], self.a[(i - 1) // 2] = self.a[(i - 1) // 2], self.a[i]
            i = (i - 1) // 2
    def pop(self):
        top, last = self.a[0], self.a.pop()
        if self.a:
            self.a[0] = last
            i = 0
            while True:
                kids = [k for k in (2 * i + 1, 2 * i + 2) if k < len(self.a)]
                if self.sift_bug:
                    kids = kids[:1]
                if not kids:
                    break
                k = min(kids, key=lambda k: self.a[k])
                if self.a[k] >= self.a[i]:
                    break
                self.a[i], self.a[k] = self.a[k], self.a[i]
                i = k
        return top
    def _check(self):
        for i in range(1, len(self.a)):
            assert self.a[(i - 1) // 2] <= self.a[i], f"heap order broken at index {i}: {self.a}"

def run_ops(ops, heap_factory):
    heap, model = heap_factory(), []
    for op in ops:
        if op == "pop":
            if not model:
                continue
            got, want = heap.pop(), min(model)
            model.remove(want)
            if got != want:
                return f"pop gave {got}, expected {want}"
        else:
            heap.push(op)
            model.append(op)
        try:
            heap._check()
        except AssertionError as error:
            return str(error)
    return None

def random_ops(rng, n):
    return [rng.choice(["pop", rng.randint(0, 20)]) for _ in range(n)]

rng = random.Random(8)
buggy = lambda: Heap(sift_bug=True)
for attempt in range(200):
    ops = random_ops(rng, 30)
    if run_ops(ops, buggy):
        break
print("failing sequence of", len(ops), "operations")
current = list(ops)
while True:
    for i in range(len(current)):
        candidate = current[:i] + current[i + 1:]
        if run_ops(candidate, buggy):
            current = candidate
            break
    else:
        break
print("shrunk to:", current, "->", run_ops(current, buggy))
print("correct heap passes 300 random sequences:", all(run_ops(random_ops(rng, 30), Heap) is None for _ in range(300)))
```

```output
failing sequence of 30 operations
shrunk to: [8, 3, 9, 16, 8, 7, 'pop'] -> heap order broken at index 2: [8, 9, 7, 16, 8]
correct heap passes 300 random sequences: True
```

The buggy heap only ever compares a parent with its **left** child when sifting down, so a smaller right child is missed. The shrink loop here only removes operations (numbers inside a sequence of operations should not be halved blindly).

The shrunk sequence is a handful of pushes and a pop: just enough to make the right child the smaller one. The invariant check names the broken index the moment it happens. The correct heap passes hundreds of random histories. This combination (random operation sequences, a simple model, invariant checks after each step, and shrinking) is how serious data-structure libraries are tested.

::: challenge A counterexample finder [easy]
Write `find_counterexample(function, oracle, make_input, trials=1000, seed=0)`. It creates a `random.Random(seed)`, then up to `trials` times calls `make_input(rng)` to get an argument tuple, and compares `function(*args)` with `oracle(*args)`. It returns the first `args` tuple where they differ, or `None` if all trials agree. If either function **raises** for some input while the other does not, that also counts as a difference. If both raise, they agree.

```python starter
import random

def find_counterexample(function, oracle, make_input, trials=1000, seed=0):
    return None

print(find_counterexample(max, lambda xs: sorted(xs)[-1], lambda rng: ([rng.randint(0, 9) for _ in range(3)],)))
```

```python solution
import random

def find_counterexample(function, oracle, make_input, trials=1000, seed=0):
    rng = random.Random(seed)
    for _ in range(trials):
        args = make_input(rng)
        outcomes = []
        for f in (function, oracle):
            try:
                outcomes.append(("value", f(*args)))
            except Exception:
                outcomes.append(("raised", None))
        if outcomes[0] != outcomes[1]:
            return args
    return None

print(find_counterexample(max, lambda xs: sorted(xs)[-1], lambda rng: ([rng.randint(0, 9) for _ in range(3)],)))
```

```python test
import bisect as _bisect
assert "find_counterexample" in dir(), "Keep the function's name as find_counterexample."
_gen = lambda rng: ([rng.randint(-5, 5) for _ in range(rng.randint(0, 6))],)
assert find_counterexample(sum, lambda xs: sum(sorted(xs)), _gen) is None, "Two equal functions: no counterexample."
def _bad_abs_sum(xs):
    return sum(x for x in xs if x > 0) - sum(x for x in xs if x < -1)
_found = find_counterexample(_bad_abs_sum, lambda xs: sum(abs(x) for x in xs), _gen)
assert isinstance(_found, tuple) and _bad_abs_sum(*_found) != sum(abs(x) for x in _found[0]), f"Return the input tuple where they differ; got {_found!r}."
_mx = find_counterexample(max, lambda xs: sorted(xs)[-1] if xs else None, _gen)
assert _mx == ([],), f"max([]) raises but the oracle returns None: that is a difference; got {_mx!r}."
assert find_counterexample(max, lambda xs: sorted(xs)[-1], _gen) is None, "Both raise on an empty list: they agree."
_first = find_counterexample(_bad_abs_sum, lambda xs: sum(abs(x) for x in xs), _gen, seed=3)
assert find_counterexample(_bad_abs_sum, lambda xs: sum(abs(x) for x in xs), _gen, seed=3) == _first, "The same seed must give the same result."
_calls = []
def _slow(xs):
    _calls.append(1)
    return 0
find_counterexample(_slow, lambda xs: 0, _gen, trials=25)
assert len(_calls) == 25, "Run exactly `trials` trials when nothing fails."
"SUCCESS: A seeded random search compares any function with any oracle, treats crashes as differences, and stops at the first counterexample."
```

Hint: Make the generator with `random.Random(seed)`. For each trial, run both functions inside `try`/`except Exception`, recording either `("value", result)` or `("raised", None)`, and return the arguments as soon as the two records differ.
:::

::: challenge A list shrinker [medium]
Write `shrink(values, fails)`, which takes a list of non-negative integers for which `fails(values)` is True, and returns a list for which it is still True that none of the following steps can make smaller, by repeating them until neither helps:

- **remove** one item, trying positions from the start;
- **reduce** one item to a smaller value, trying for each position (from the start) first `0` and then half its value (`v // 2`).

Keep the first change that still fails, and start again from the new list. Return the final list. Never try the same value twice for one position (when `v` is 1, `0` and `v // 2` are the same), and never change the caller's list.

```python starter
def shrink(values, fails):
    return values

print(shrink([9, 40, 7, 3], lambda xs: sum(xs) > 20))
```

```python solution
def shrink(values, fails):
    current = list(values)
    while True:
        for i in range(len(current)):
            candidate = current[:i] + current[i + 1:]
            if fails(candidate):
                current = candidate
                break
        else:
            for i, v in enumerate(current):
                changed = False
                for smaller in dict.fromkeys((0, v // 2)):
                    if smaller < v:
                        candidate = current[:i] + [smaller] + current[i + 1:]
                        if fails(candidate):
                            current, changed = candidate, True
                            break
                if changed:
                    break
            else:
                return current

print(shrink([9, 40, 7, 3], lambda xs: sum(xs) > 20))
```

```python test
assert "shrink" in dir(), "Keep the function's name as shrink."
_orig = [9, 40, 7, 3]
_r = shrink(_orig, lambda xs: sum(xs) > 20)
assert _r == [40], f"Sum over 20: removing items leaves [40], and neither 0 nor 40 // 2 = 20 still fails, so the shrinker stops there (a local minimum, not 21); got {_r}."
assert _orig == [9, 40, 7, 3], "Do not change the caller's list."
assert shrink([5, 1, 8, 1, 3], lambda xs: len(xs) >= 2 and xs[0] > xs[1]) == [1, 0], "First item bigger than the second: [1, 0]."
assert shrink([4, 7, 7, 2], lambda xs: len(xs) != len(set(xs))) == [7, 7], "Any duplicate: [7, 7], since changing either 7 alone removes the duplicate."
assert shrink([3, 9, 12], lambda xs: True) == [], "If everything fails, the empty list is smallest."
assert shrink([8], lambda xs: len(xs) == 1 and xs[0] % 2 == 0) == [0], "Try 0 before halving: an even single item shrinks to [0]."
def _dedupe(xs):
    return [v for i, v in enumerate(xs) if i == 0 or v != xs[i - 1]]
_r = shrink([12, 30, 5, 30, 7, 30, 1], lambda xs: _dedupe(xs) != list(dict.fromkeys(xs)))
assert _r == [30, 0, 30], f"A value reappearing after another: [30, 0, 30]; got {_r}."
_seen = []
def _spy(xs):
    _seen.append(tuple(xs))
    return xs == [1]
shrink([1], _spy)
assert _seen.count((0,)) == 1, "When v is 1, 0 and v // 2 are the same value: try it once, not twice."
"SUCCESS: Random failures shrink to their essence: the smallest list that still shows the bug, found automatically."
```

Hint: Loop forever. First try removing each position; on the first success, update and restart. If no removal works, try for each position the values `0` and `v // 2`, each once (they are equal when `v` is 1, and `dict.fromkeys((0, v // 2))` gives them without repeats; skip any that are not smaller than `v`); on success, update and restart. If nothing works, return the list.
:::

::: challenge Model-based testing of a queue [hard]
Write `test_queue(make_queue, trials=200, length=40, seed=0)`, a model-based tester for queue classes. Each trial generates a random list of operations: an operation is either `("put", n)` with n from 0 to 99, or `("get",)`. It applies them to `make_queue()` (an object with `put(x)`, `get()` and `__len__`, where `get` on an empty queue raises `IndexError`) and to a model, a `collections.deque`, used first-in first-out. After **every** operation, compare `len(queue)` with the model's length. For `get`, compare the returned value (or that both raise `IndexError`). Any exception other than the expected `IndexError` counts as a failure. On the first failing trial, **shrink** the operation list by removing operations one at a time (trying from the start, keeping any removal that still fails, until no removal fails), and return that minimal list. Return `None` if every trial passes.

```python starter
import random
from collections import deque

def test_queue(make_queue, trials=200, length=40, seed=0):
    return None

print("write test_queue")
```

```python solution
import random
from collections import deque

def _fails(ops, make_queue):
    queue, model = make_queue(), deque()
    try:
        for op in ops:
            if op[0] == "put":
                queue.put(op[1])
                model.append(op[1])
            else:
                if model:
                    if queue.get() != model.popleft():
                        return True
                else:
                    try:
                        queue.get()
                        return True
                    except IndexError:
                        pass
            if len(queue) != len(model):
                return True
    except Exception:
        return True
    return False

def test_queue(make_queue, trials=200, length=40, seed=0):
    rng = random.Random(seed)
    for _ in range(trials):
        ops = [("put", rng.randint(0, 99)) if rng.random() < 0.6 else ("get",) for _ in range(length)]
        if _fails(ops, make_queue):
            current = ops
            while True:
                for i in range(len(current)):
                    candidate = current[:i] + current[i + 1:]
                    if _fails(candidate, make_queue):
                        current = candidate
                        break
                else:
                    return current
    return None

class GoodQueue:
    def __init__(self): self.d = deque()
    def put(self, x): self.d.append(x)
    def get(self):
        if not self.d: raise IndexError("empty")
        return self.d.popleft()
    def __len__(self): return len(self.d)

print(test_queue(GoodQueue))
```

```python test
from collections import deque as _deque
assert "test_queue" in dir(), "Keep the function's name as test_queue."
class _Good:
    def __init__(self): self.d = _deque()
    def put(self, x): self.d.append(x)
    def get(self):
        if not self.d: raise IndexError("empty")
        return self.d.popleft()
    def __len__(self): return len(self.d)
assert test_queue(_Good) is None, "A correct queue passes."
class _Stack(_Good):
    def get(self):
        if not self.d: raise IndexError("empty")
        return self.d.pop()
_r = test_queue(_Stack)
assert _r is not None and len(_r) == 3 and [_o[0] for _o in _r] == ["put", "put", "get"] and _r[0][1] != _r[1][1], f"A LIFO 'queue' shrinks to two different puts then a get; got {_r}."
class _Ring:
    def __init__(self): self.buf, self.head, self.n = [None] * 4, 0, 0
    def put(self, x):
        self.buf[(self.head + self.n) % 4] = x
        self.n = min(self.n + 1, 4)
    def get(self):
        if not self.n: raise IndexError("empty")
        x = self.buf[self.head]; self.head = (self.head + 1) % 4; self.n -= 1
        return x
    def __len__(self): return self.n
_r = test_queue(_Ring)
assert _r is not None and [_o[0] for _o in _r].count("put") == 5 and len(_r) <= 6, f"A fixed-size ring that overwrites when full needs 5 puts to show its bug; got {_r}."
class _NoneOnEmpty(_Good):
    def get(self):
        return self.d.popleft() if self.d else None
assert test_queue(_NoneOnEmpty) == [("get",)], "Returning None instead of raising on empty is a failure, and shrinks to a single get."
class _Crashy(_Good):
    def __len__(self):
        if len(self.d) > 6: raise RuntimeError("overflow")
        return len(self.d)
_r = test_queue(_Crashy)
assert _r is not None and len(_r) == 7 and all(_o[0] == "put" for _o in _r), f"Unexpected exceptions are failures; the minimal case is 7 puts; got {_r}."
assert test_queue(_Stack, seed=4) == test_queue(_Stack, seed=4), "Results are reproducible for a given seed."
"SUCCESS: Random operation histories, a simple model, checks after every step and shrinking turn subtle data-structure bugs into tiny, readable test cases."
```

Hint: Write a helper `_fails(ops, make_queue)` that replays operations on a fresh queue and a `deque` model, returning True at the first mismatch (wrong value, wrong length, a missing `IndexError` on empty, or any unexpected exception). In `test_queue`, generate operations with the seeded generator; on the first failing list, repeatedly remove the first operation whose removal still fails, until none does.
:::

## What you learned

- Hand-picked examples test the cases you imagined. Random inputs compared against an oracle (a library function or a slow, obviously correct version) find the ones you did not.
- Without an oracle, test properties: output checks (sorted **and** a rearrangement), round trips, and metamorphic relations. Use several properties, because each checks one aspect.
- Shrinking reduces a large random failure to the smallest input that still fails, by removing items and reducing values until nothing smaller fails.
- Invariant checks after every operation catch data-structure corruption at its source. Model-based tests replay random operation sequences against a simple model and compare every answer.
- Seed the random generator so every failure is reproducible.

The next lesson measures before optimising: profiling Python code, finding the part that actually matters, and speeding it up.
