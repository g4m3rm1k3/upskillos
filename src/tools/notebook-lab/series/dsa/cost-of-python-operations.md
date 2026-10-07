# The cost of Python operations

Big-O analysis counts steps, but in Python a single line can hide a lot of steps. `x in my_list` looks like one operation and is actually a loop over the whole list. `my_list.pop(0)` looks as cheap as `my_list.pop()` and is not. Code that looks linear can be quadratic because of one innocent-looking call inside a loop. To analyse Python code you need to know what its built-in operations cost.

This lesson covers:

- how a list is stored, and why that makes some list operations O(1) and others O(n);
- why dictionaries and sets answer "is this here?" in O(1) on average;
- strings and tuples, which can never be changed, so every "change" builds a copy;
- the hidden O(n) operations that most often make Python programs slow, and how to fix them.

## Lists: a row of slots

A Python list stores its items in one contiguous block of memory: slot 0, slot 1, slot 2, and so on. (Strictly, each slot holds a reference to an object stored elsewhere, but the slots themselves are in a row.) This layout decides every cost:

- **Indexing** `a[i]` is O(1): the position of slot i is computed directly from i.
- **Appending** `a.append(x)` and **popping from the end** `a.pop()` are O(1): only the last slot changes. (Appending occasionally has to move everything to a bigger block; the next lesson shows why that still averages out to O(1).)
- **Inserting or removing at the front** `a.insert(0, x)` or `a.pop(0)` is O(n): every later item has to shift one slot along.
- **Searching** `x in a`, `a.index(x)`, `a.count(x)` and `a.remove(x)` are O(n): the list has no idea where a value is, so it checks slot after slot.
- **Slicing** `a[i:j]` is O(j − i): it copies that many references into a new list.
- `len(a)` is O(1): the length is stored, not counted.

Predict before running: when the list grows from 10,000 to 40,000 items, how will the time for 1,000 `pop()` calls change, and the time for 1,000 `pop(0)` calls?

```python type
import timeit

for n in [10_000, 20_000, 40_000]:
    from_end = timeit.timeit("a.pop()", setup=f"a = list(range({n}))", number=1000)
    from_front = timeit.timeit("a.pop(0)", setup=f"a = list(range({n}))", number=1000)
    print(f"n = {n:>6,}: 1000 × pop() {from_end * 1000:6.2f} ms   1000 × pop(0) {from_front * 1000:6.2f} ms")
```

`timeit.timeit` can also take the code as strings: `setup` runs once to prepare, then the statement runs `number` times.

Popping from the end takes the same tiny time whatever the size. Popping from the front grows with n, roughly doubling each time n doubles, because each pop shifts all the remaining items. The shifting is done by a fast, low-level memory copy, so it takes a big list to notice, but at the scale of real data it adds up: a loop that empties a list of n items with `pop(0)` is O(n²) overall. The fix, `collections.deque`, is a structure built for fast removal at both ends; the queues lesson builds one.

## Dictionaries and sets: jump straight to the item

A dictionary or set does not search. It computes a number from the key, its **hash**, and uses it to jump almost directly to where the key would be stored. So looking up, inserting and deleting a key are all **O(1) on average**, whatever the size. (How this works, and what "on average" hides, is the subject of the hash tables lesson.)

The difference from a list's `in` is dramatic. Predict before running: how will the time to check 1,000 values grow for the list and for the set as the collection grows tenfold each time?

```python type
import timeit

for n in [1_000, 10_000, 100_000]:
    setup = f"data_list = list(range({n})); data_set = set(data_list); probes = list(range(0, 2 * {n}, max(1, {n} // 500)))[:1000]"
    in_list = timeit.timeit("for p in probes: p in data_list", setup=setup, number=1)
    in_set = timeit.timeit("for p in probes: p in data_set", setup=setup, number=1)
    print(f"n = {n:>7,}: 1000 lookups in a list {in_list * 1000:8.2f} ms   in a set {in_set * 1000:6.3f} ms")
```

The probes are spread so that about half are present and half absent; an absent value forces the list to check every item.

The list's time grows tenfold with each tenfold growth of n (O(n) per lookup); the set's stays flat (O(1)). At 100,000 items the set is tens of thousands of times faster. The cost of building the set, O(n) once, pays for itself as soon as you do more than a handful of lookups.

The other dictionary and set operations follow the same pattern: `d[key]`, `d.get(key)`, `key in d`, `d[key] = value`, `del d[key]`, `s.add(x)` and `s.discard(x)` are all O(1) on average. Looping over a dictionary or set is O(n), as you would expect. One caution: `value in d.values()` searches the values one by one, O(n), because the jump-by-hash trick only works for keys.

## Strings and tuples cannot change

Strings and tuples are **immutable**: once created, they never change. Every operation that seems to change one actually builds a new one, copying the parts it keeps. So `s + t` costs O(len(s) + len(t)), `s[1:]` copies all but one character, and `s.replace(...)`, `s.upper()` and friends build whole new strings.

That makes the pattern "build a result by adding a piece at a time" a trap. Each addition copies everything built so far: 1 + 2 + … + n pieces copied, O(n²) in total. Lists have the same trap with `a = a + [x]`, which builds a whole new list every time, unlike `a.append(x)`. Predict before running: how will each method's time change as n doubles?

```python type
import timeit

def build_by_concatenation(n):
    result = []
    for i in range(n):
        result = result + [i]
    return result

def build_by_append(n):
    result = []
    for i in range(n):
        result.append(i)
    return result

for n in [5_000, 10_000, 20_000]:
    slow = timeit.timeit(lambda: build_by_concatenation(n), number=1)
    fast = timeit.timeit(lambda: build_by_append(n), number=1)
    print(f"n = {n:>6,}: result = result + [i] {slow * 1000:7.1f} ms    append {fast * 1000:5.2f} ms")
```

Concatenation's time roughly quadruples each time n doubles, the O(n²) signature; append's merely doubles. For strings, the standard fix is to collect the pieces in a list and join them once at the end: `"".join(pieces)` computes the total length, makes one string and copies each piece once, O(total length).

You may notice that `text += piece` in a loop is often fast in CPython: the interpreter has a special trick that extends a string in place when nothing else refers to it. The trick is an implementation detail, it fails as soon as another name refers to the string, and other Python implementations do not have it, so `"".join` remains the reliable choice.

## Hidden quadratic loops

The costly patterns combine into a classic mistake: an O(n) operation inside a loop that runs n times. Each line looks harmless; the whole is O(n²). Here is a function that keeps the first occurrence of each value, written two ways. Predict before running: which grows quadratically, and why?

```python type
import random
import timeit

def unique_in_order_slow(items):
    result = []
    for item in items:
        if item not in result:
            result.append(item)
    return result

def unique_in_order_fast(items):
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result

random.seed(0)
for n in [2_000, 4_000, 8_000]:
    items = [random.randint(0, n) for _ in range(n)]
    assert unique_in_order_slow(items) == unique_in_order_fast(items)
    slow = timeit.timeit(lambda: unique_in_order_slow(items), number=1)
    fast = timeit.timeit(lambda: unique_in_order_fast(items), number=1)
    print(f"n = {n:>5,}: list membership {slow * 1000:7.1f} ms    set membership {fast * 1000:5.2f} ms")
```

`item not in result` searches the growing result list, O(n) each time, inside a loop of n items: O(n²). The fast version keeps a set alongside the list, only to answer "seen it?" in O(1), and keeps the list for the order. The `assert` confirms both give identical results before they are timed. The habit to build: when you see `in`, `.index`, `.count`, `.remove`, `pop(0)`, `insert(0, …)`, slicing or `+` on sequences **inside a loop**, ask what it costs.

::: challenge Items in common, fast [easy]
`common_items_slow(a, b)` returns the items of list `a` that also appear in list `b`, in `a`'s order (keeping repeats). It checks `item in b` for every item of `a`, which is O(len(a) × len(b)). Write `common_items(a, b)` giving exactly the same results in O(len(a) + len(b)).

```python starter
def common_items_slow(a, b):
    return [item for item in a if item in b]

def common_items(a, b):
    return []

print(common_items([3, 1, 4, 1, 5, 9], [1, 9, 2, 6]))
```

```python solution
def common_items_slow(a, b):
    return [item for item in a if item in b]

def common_items(a, b):
    lookup = set(b)
    return [item for item in a if item in lookup]

print(common_items([3, 1, 4, 1, 5, 9], [1, 9, 2, 6]))
```

```python test
import random as _random, time as _time
assert "common_items" in dir(), "Keep the function's name as common_items."
assert common_items([3, 1, 4, 1, 5, 9], [1, 9, 2, 6]) == [1, 1, 9], f"Expected [1, 1, 9] (a's order, repeats kept); got {common_items([3, 1, 4, 1, 5, 9], [1, 9, 2, 6])}."
assert common_items([], [1]) == [] and common_items([1, 2], []) == [], "Empty lists give an empty result."
_r = _random.Random(4)
for _ in range(200):
    _a = [_r.randint(0, 9) for _ in range(_r.randint(0, 8))]; _b = [_r.randint(0, 9) for _ in range(_r.randint(0, 8))]
    assert common_items(_a, _b) == [x for x in _a if x in _b], f"common_items({_a}, {_b}) should be {[x for x in _a if x in _b]}."
_a = list(range(0, 40_000, 2)); _b = list(range(0, 40_000, 3))
_start = _time.perf_counter(); _res = common_items(_a, _b); _elapsed = _time.perf_counter() - _start
assert len(_res) == 6_667, "Wrong result on the large lists."
assert _elapsed < 0.3, f"Two lists of 20,000 and about 13,000 items took {_elapsed:.1f} s: build a set from b once, then check membership in it."
f"SUCCESS: {_elapsed * 1000:.0f} ms for lists that would need billions of comparisons the slow way."
```

Hint: Build `set(b)` once, before the loop, and test membership in the set. Building it inside the comprehension would rebuild it for every item.
:::

::: challenge A round-robin scheduler [medium]
A computer shares its processor between jobs in **round-robin** order: the job at the front of the queue runs for at most `quantum` units of time; if it still needs more, it goes to the back of the queue with its remaining time; otherwise it is finished. Write `round_robin(jobs, quantum)` where `jobs` is a list of `(name, time_needed)` pairs in arrival order, returning the list of names in the order they **finish**.

Use `collections.deque` for the queue: `popleft()` and `append()` are both O(1), unlike a list's `pop(0)`.

```python starter
from collections import deque

def round_robin(jobs, quantum):
    return []

print(round_robin([("a", 3), ("b", 1), ("c", 5)], 2))
```

```python solution
from collections import deque

def round_robin(jobs, quantum):
    queue = deque(jobs)
    finished = []
    while queue:
        name, remaining = queue.popleft()
        if remaining > quantum:
            queue.append((name, remaining - quantum))
        else:
            finished.append(name)
    return finished

print(round_robin([("a", 3), ("b", 1), ("c", 5)], 2))
```

```python test
assert "round_robin" in dir(), "Keep the function's name as round_robin."
_got = round_robin([("a", 3), ("b", 1), ("c", 5)], 2)
assert _got == ["b", "a", "c"], f"a runs 2 (1 left, to the back), b runs 1 and finishes, c runs 2 (3 left), a finishes, c runs 2 then 1: expected ['b', 'a', 'c'], got {_got}."
assert round_robin([], 3) == [], "No jobs, no finishers."
assert round_robin([("x", 2), ("y", 2)], 2) == ["x", "y"], "A job needing exactly one quantum finishes on its first turn."
assert round_robin([("long", 10), ("short", 1)], 1) == ["short", "long"], "With quantum 1, the short job finishes on its first turn."
_jobs = [("j" + str(_i), _i % 7 + 1) for _i in range(30)]
def _ref(_js, _q):
    from collections import deque as _dq
    _qq = _dq(_js); _f = []
    while _qq:
        _n, _t = _qq.popleft()
        if _t > _q: _qq.append((_n, _t - _q))
        else: _f.append(_n)
    return _f
assert round_robin(_jobs, 3) == _ref(_jobs, 3), "Your order differs on a longer list of jobs."
_keep = [("a", 3)]; round_robin(_keep, 1)
assert _keep == [("a", 3)], "Don't change the caller's list of jobs."
assert "popleft" in _source, "Use a deque and its popleft() for the front of the queue."
"SUCCESS: Every step is O(1): popleft from the front, append to the back."
```

Hint: Copy the jobs into `deque(jobs)`. While the queue is not empty, `popleft()` a job; if its remaining time is more than the quantum, `append` it back with the quantum subtracted, otherwise add its name to the finished list.
:::

::: challenge A palindrome check without copies [medium]
`is_palindrome_slicing(text)` checks whether a string reads the same backwards by comparing the first and last characters and then recursing on `text[1:-1]`. Each slice copies almost the whole string, so it is O(n²) overall. Write `is_palindrome(text)` with two **indices**, one moving in from each end, which makes no copies and is O(n). Treat the text exactly as given (case and spaces count).

```python starter
def is_palindrome_slicing(text):
    if len(text) <= 1:
        return True
    return text[0] == text[-1] and is_palindrome_slicing(text[1:-1])

def is_palindrome(text):
    return False

print(is_palindrome("racecar"), is_palindrome("rocket"))
```

```python solution
def is_palindrome_slicing(text):
    if len(text) <= 1:
        return True
    return text[0] == text[-1] and is_palindrome_slicing(text[1:-1])

def is_palindrome(text):
    left, right = 0, len(text) - 1
    while left < right:
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome("racecar"), is_palindrome("rocket"))
```

```python test
assert "is_palindrome" in dir(), "Keep the function's name as is_palindrome."
for _w, _want in [("racecar", True), ("rocket", False), ("", True), ("a", True), ("ab", False), ("abba", True), ("abca", False), ("Aa", False)]:
    assert is_palindrome(_w) == _want, f"is_palindrome({_w!r}) should be {_want}."
_big = "ab" * 50_000 + "ba" * 50_000
assert is_palindrome(_big) is True and is_palindrome(_big + "x") is False, "Check long strings too."
_body = _source.split("def is_palindrome(")[1].split("\ndef ")[0] if "def is_palindrome(" in _source else ""
assert "[::-1]" not in _body and ":-1]" not in _body and "[1:" not in _body, "Use two indices instead of slicing: each slice is a copy."
"SUCCESS: Two indices, no copies: 200,000 characters checked in one pass (the slicing version would copy about 10 billion characters, and hit Python's recursion limit first)."
```

Hint: Start `left` at 0 and `right` at `len(text) - 1`. While `left < right`, compare `text[left]` with `text[right]`; return False on a mismatch, otherwise move both inwards.
:::

## What you learned

- Lists store items in a row: indexing, `append`, `pop()` and `len` are O(1); `pop(0)`, `insert(0, …)`, `in`, `index`, `count`, `remove` and slicing are O(n).
- Dictionaries and sets jump to a key by its hash, so lookup, insertion and deletion are O(1) on average; `in d.values()` is still O(n).
- Strings and tuples are immutable, so every change copies: build strings with `"".join` and lists with `append`, never by repeated `+`.
- An O(n) operation inside an O(n) loop is O(n²). Spot `in`, `pop(0)`, slicing and `+` inside loops, and replace them with a set, a deque, indices or a final join.

The next lesson explains the one claim this lesson took on trust: how `append` can be O(1) even though the list sometimes has to move everything to a bigger block.
