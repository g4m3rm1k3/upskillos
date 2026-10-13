---
title: 2.3 — Always the Smallest First
runtime: python
support: tests/conftest.py
---

The last two lessons asked "is it there?" over and over. This one asks a different question over and over: **which is the smallest?** And it asks it while new items keep arriving.

That question is everywhere in this series. The tokenizer in Chapter 28 keeps merging whichever pair of tokens is most common, then counts again. A search for the best move keeps expanding whichever position looks most promising. A computer's scheduler keeps running whichever job is most urgent. Each needs a **priority queue**: something you can add items to, and always take the smallest one out of.

A plain list makes one of those two jobs slow. You'll measure that first. Then you'll build a **heap**, the structure behind every priority queue, and both jobs become O(log n).

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_heap.py**:

```python file=tests/test_heap.py provided
# Tests for frontier.heap (lesson 2.3): a priority queue, built by hand.
import heapq

import pytest

# The numbers 0 to 100, shuffled: going round a ring of 101 in steps of 37 visits each one once.
SHUFFLED = [(i * 37) % 101 for i in range(101)]


def follows_the_rule(heap):
    """No item is smaller than its parent."""
    from frontier.heap import parent
    return all(heap[parent(i)] <= heap[i] for i in range(1, len(heap)))


def test_positions_of_parents_and_children():
    from frontier.heap import left, parent, right
    assert [left(0), right(0)] == [1, 2]
    assert [left(2), right(2)] == [5, 6]
    assert [parent(1), parent(2), parent(5), parent(6)] == [0, 0, 2, 2]


def test_push_keeps_the_smallest_on_top():
    from frontier.heap import push
    heap = []
    for item in [7, 4, 9, 2, 6]:
        push(heap, item)
        assert heap[0] == min(heap)
        assert follows_the_rule(heap)


def test_layout_is_the_same_as_heapqs():
    from frontier.heap import push
    mine, theirs = [], []
    for item in SHUFFLED:
        push(mine, item)
        heapq.heappush(theirs, item)
    assert mine == theirs


def test_sift_down_moves_the_top_item_to_its_place():
    from frontier.heap import sift_down
    heap = [9, 2, 1, 3, 4, 5, 6]
    sift_down(heap, 0)
    assert heap == [1, 2, 5, 3, 4, 9, 6]


def test_pops_come_out_smallest_first():
    from frontier.heap import pop_smallest, push
    heap = []
    for item in SHUFFLED:
        push(heap, item)
    assert [pop_smallest(heap) for _ in range(101)] == list(range(101))
    assert heap == []
    with pytest.raises(IndexError):
        pop_smallest(heap)


def test_largest_k_come_out_largest_first():
    from frontier.heap import top_k
    assert top_k(SHUFFLED, 5) == [100, 99, 98, 97, 96]
    assert top_k([5, 5, 1], 2) == [5, 5]
    assert top_k([3, 1, 2], 10) == [3, 2, 1]
    assert top_k([3, 1, 2], 0) == []
```

In order:

- **`parent`, `left` and `right`** are three small sums on positions in a list. You'll see why a list can hold a tree.
- **`push(heap, item)`** adds an item, and afterwards the smallest is always at position 0. `follows_the_rule` checks the heap's one rule after every push.
- **The same layout as `heapq`:** `heapq` is Python's own heap. Your `push` has to leave the list in exactly the order Python's does.
- **`sift_down`** and **`pop_smallest`** take the smallest out. Popping everything gives the numbers back in order, and popping an empty heap is an error.
- **`top_k`** is your Your turn: the k largest numbers, using a heap.

```check
file tests/test_heap.py -- Click "Create provided tests/test_heap.py" above.
```

## The slow way

Start with what a list can do. Take out the smallest number, then the next smallest, until none are left. `min` finds the smallest, which means looking at every number. `index` finds where it is, and `pop(i)`, given a position, removes the item there and returns it. All three are O(n), and they run once per number, so the whole job should be O(n²).

The numbers come from `(i * 7919) % n`, the same trick as the tests' `SHUFFLED`. 7919 is a prime number, so stepping round a ring of n in steps of 7919 visits every number from 0 to n - 1 exactly once, in a scrambled order. The loop over a list of `(name, function)` pairs has only one pair for now; a second arrives later. Create `experiments/time_smallest.py`:

```python file=experiments/time_smallest.py
"""Taking the smallest out, over and over: a list against a heap."""
from frontier.bench import best_of, ratios


def by_list(numbers: list[int]) -> list[int]:
    """Every number, smallest first: min finds it, pop takes it out."""
    rest = list(numbers)
    return [rest.pop(rest.index(min(rest))) for _ in range(len(numbers))]


for name, smallest_first in [("list", by_list)]:
    times = []
    for n in [1000, 2000, 4000, 8000]:
        numbers = [(i * 7919) % n for i in range(n)]
        times.append(best_of(lambda: smallest_first(numbers), repeats=3))
    print(f"{name}: each doubling multiplies the time by", [round(x, 1) for x in ratios(times)])
```

`rest = list(numbers)` makes a copy, so taking numbers out of `rest` leaves the caller's list alone, and each of the three timed runs starts from the full list. Run it:

```powershell
.venv\Scripts\python experiments/time_smallest.py
```

The ratios come out near 4: twice the numbers, four times the time. That's O(n²). Keeping the list sorted doesn't rescue it. The smallest is then always at the front, but every new arrival has to be slotted into its place, and that shifts everything after it along: O(n) again, per item.

```check
run ".venv/Scripts/python experiments/time_smallest.py" stdout="list: each doubling" label="the experiment runs" -- Check the import: best_of and ratios from frontier.bench.
```

## A tree kept in a list

A heap is a **tree** drawn in a list. Position 0 is the top. Its two **children** are at positions 1 and 2. Position 1's children are at 3 and 4, position 2's at 5 and 6, and so on, filling each row from left to right before starting the next. No arrows or links are stored: a position's children are always at `2 * i + 1` and `2 * i + 2`, and its **parent** at `(i - 1) // 2`.

`//` is **floor division**: divide, then drop anything after the point, so `7 // 2` is 3. That's how positions 5 and 6 both get parent 2: `4 // 2` and `5 // 2` are both 2. Create `src/frontier/heap.py`:

```python file=src/frontier/heap.py
"""A priority queue built by hand: the smallest item is always at the front."""


def parent(i: int) -> int:
    return (i - 1) // 2


def left(i: int) -> int:
    return 2 * i + 1


def right(i: int) -> int:
    return 2 * i + 2
```

Three one-line sums are the whole tree: `left(2)` is 5, `right(2)` is 6, and `parent` of either is 2 again. A heap adds just **one rule**: no item is smaller than its parent. Follow any path up from any item and the values only get smaller, so the smallest item of all must be at the top, position 0. Reading it costs O(1).

The rule says nothing about left against right, or about one branch against another. That freedom is what makes a heap cheap to keep in order: much cheaper than keeping the whole list sorted.

```check
run ".venv/Scripts/python -m pytest -q tests/test_heap.py -k positions" label="parent, left and right" -- parent is (i - 1) // 2; left is 2 * i + 1; right is 2 * i + 2.
run ".venv/Scripts/python -m mypy --strict src/frontier/heap.py" stdout="Success" label="mypy --strict passes" -- Each function needs i: int and -> int.
```

## Push: sift up

To add an item, append it at the end of the list: the next free place in the bottom row. That can break the rule, if the new item is smaller than its parent. So swap the two. The item has moved up a row, and may still be smaller than its new parent, so keep going until it isn't, or until it reaches the top. This is called **sifting up**.

Swapping uses Python's **tuple assignment**: `a, b = b, a` works out both values on the right first, then stores them, so neither is lost. Add `push` at the end of `src/frontier/heap.py`:

```python file=src/frontier/heap.py
"""A priority queue built by hand: the smallest item is always at the front."""


def parent(i: int) -> int:
    return (i - 1) // 2


def left(i: int) -> int:
    return 2 * i + 1


def right(i: int) -> int:
    return 2 * i + 2


def push(heap: list[int], item: int) -> None:
    """Add item, then move it up until its parent is no bigger."""
    heap.append(item)
    i = len(heap) - 1
    while i > 0 and heap[i] < heap[parent(i)]:
        heap[i], heap[parent(i)] = heap[parent(i)], heap[i]
        i = parent(i)
```

`i` follows the new item as it climbs. The `while` stops in one of two ways: the item reached position 0 and has no parent, or its parent is no bigger. Only the items on that one path from the bottom to the top are ever touched; the rest of the heap is left alone.

```predict
question: Starting from an empty list, you push 5, then 3, then 8, then 1. What is the list afterwards?
choice: [1, 3, 5, 8]
choice: [1, 3, 8, 5]
choice: [5, 3, 8, 1]
answer: [1, 3, 8, 5]
explain: 5 goes in alone. 3 is smaller than its parent 5, so they swap: [3, 5]. 8 is bigger than its parent 3, so it stays: [3, 5, 8]. 1 lands at position 3, under 5: swap, giving [3, 1, 8, 5]; then 1 is under 3: swap again, giving [1, 3, 8, 5]. It follows the rule without being sorted: 8 sits before 5, and that's allowed because neither is the other's parent.
verify: script heap_after_pushes.py
```

Step through it in the figure, with other numbers. The circles are the tree, the table is the same items as the list, and each step is one comparison.

```figure
name: frontier/HeapSteps
caption: Each push appends at the end, then swaps upwards while the new item is smaller than its parent.
props: {"push": [6, 4, 9, 2, 7, 1, 8]}
```

The tests also compare your list with `heapq.heappush`, from Python's own `heapq` module. It uses the same method, so after the same pushes, both lists are identical.

```check
run ".venv/Scripts/python -m pytest -q tests/test_heap.py -k push" label="the smallest is always on top" -- Append the item, then swap it with its parent while it is smaller, moving i to parent(i) each time.
run ".venv/Scripts/python -m pytest -q tests/test_heap.py -k layout" label="the same list as heapq makes" -- Swap with the parent only while the item is smaller, and stop at position 0.
run ".venv/Scripts/python -m mypy --strict src/frontier/heap.py" stdout="Success" label="mypy --strict still passes" -- push returns nothing: -> None.
```

## Sift down

Taking the smallest out is the opposite trip. Position 0 has to be refilled, and the one item that can leave without leaving a gap is the last. So the last item moves to the top, where it is probably too big. It then **sifts down**: compare it with its *smaller* child and, if the child is smaller, swap them. Repeat until no child is smaller, or there are no children.

Why the smaller child? Whichever child moves up becomes the parent of the other, so it must be the smaller of the two. `while True` loops until a `return` ends the function. Add `sift_down` at the end of `src/frontier/heap.py`:

```python file=src/frontier/heap.py
"""A priority queue built by hand: the smallest item is always at the front."""


def parent(i: int) -> int:
    return (i - 1) // 2


def left(i: int) -> int:
    return 2 * i + 1


def right(i: int) -> int:
    return 2 * i + 2


def push(heap: list[int], item: int) -> None:
    """Add item, then move it up until its parent is no bigger."""
    heap.append(item)
    i = len(heap) - 1
    while i > 0 and heap[i] < heap[parent(i)]:
        heap[i], heap[parent(i)] = heap[parent(i)], heap[i]
        i = parent(i)


def sift_down(heap: list[int], i: int) -> None:
    """Move heap[i] down until neither child is smaller."""
    while True:
        child = left(i)
        if child >= len(heap):
            return
        if right(i) < len(heap) and heap[right(i)] < heap[child]:
            child = right(i)
        if heap[i] <= heap[child]:
            return
        heap[i], heap[child] = heap[child], heap[i]
        i = child
```

Trace the test's `[9, 2, 1, 3, 4, 5, 6]`. At position 0, the children are 2 and 1; the smaller is 1, on the right, and 9 is bigger, so they swap: `[1, 2, 9, 3, 4, 5, 6]`. At position 2, the children are 5 and 6; 9 swaps with 5: `[1, 2, 5, 3, 4, 9, 6]`. Position 5's left child would be at 11, past the end, so it stops. Had it swapped with the left child, 2, the top would hold 2 while 1 sat below it, breaking the rule.

```check
run ".venv/Scripts/python -m pytest -q tests/test_heap.py -k sift" label="sift_down moves the top item down to its place" -- Pick the smaller child (the right one if it exists and is smaller), swap only if it is smaller than heap[i], and stop when there's no left child.
run ".venv/Scripts/python -m mypy --strict src/frontier/heap.py" stdout="Success" label="mypy --strict still passes" -- sift_down returns nothing: -> None.
```

## Taking the smallest out

Now `pop_smallest` puts it together. Keep the top item to return it. The list's own `pop()`, given no position, removes the **last** item and returns it, which takes O(1) because nothing has to shift. If anything is left, the last item goes to the top and sifts down. Add it at the end of `src/frontier/heap.py`:

```python file=src/frontier/heap.py
"""A priority queue built by hand: the smallest item is always at the front."""


def parent(i: int) -> int:
    return (i - 1) // 2


def left(i: int) -> int:
    return 2 * i + 1


def right(i: int) -> int:
    return 2 * i + 2


def push(heap: list[int], item: int) -> None:
    """Add item, then move it up until its parent is no bigger."""
    heap.append(item)
    i = len(heap) - 1
    while i > 0 and heap[i] < heap[parent(i)]:
        heap[i], heap[parent(i)] = heap[parent(i)], heap[i]
        i = parent(i)


def sift_down(heap: list[int], i: int) -> None:
    """Move heap[i] down until neither child is smaller."""
    while True:
        child = left(i)
        if child >= len(heap):
            return
        if right(i) < len(heap) and heap[right(i)] < heap[child]:
            child = right(i)
        if heap[i] <= heap[child]:
            return
        heap[i], heap[child] = heap[child], heap[i]
        i = child


def pop_smallest(heap: list[int]) -> int:
    """Remove and return the smallest item."""
    smallest = heap[0]
    last = heap.pop()
    if heap:
        heap[0] = last
        sift_down(heap, 0)
    return smallest
```

The `if heap:` matters when one item is left: `pop()` has just removed it, and the list is empty, so there's no top to refill. On an empty heap, `heap[0]` raises `IndexError` straight away, just as `[].pop()` does. The tests expect exactly that.

```figure
name: frontier/HeapSteps
caption: Each pop takes the top, moves the last item up to replace it, and swaps it down with its smaller child.
props: {"push": [6, 4, 9, 2, 7, 1, 8], "pops": 3}
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_heap.py -k pops" label="pops come out smallest first" -- Keep heap[0], pop the last item, and if the heap isn't empty, put it at position 0 and sift it down.
run ".venv/Scripts/python -m mypy --strict src/frontier/heap.py" stdout="Success" label="mypy --strict still passes" -- pop_smallest returns an int: -> int.
```

## Measure it

How far can one push or pop travel? One row per swap, and every row holds twice as many items as the row above: 1, 2, 4, 8, … So n items fill only about log₂ n rows. That's the O(log n): a million items fit in 20 rows.

```predict
question: A heap holds 1000 numbers. At most how many swaps can a single push make?
choice: 9
choice: 500
choice: 999
answer: 9
explain: The rows hold 1, 2, 4, …, 256 items: 511 in the first nine rows. Positions 511 to 1022 make the tenth row, so the 1000th item, at position 999, starts there. Each swap climbs one row, so reaching the top takes at most 9 swaps: 999 → 499 → 249 → 124 → 61 → 30 → 14 → 6 → 2 → 0. That's about log₂ 1000, which is just under 10.
verify: script most_swaps.py
```

Now time the heap against the list. `by_heap` pushes every number in, then pops them all out: n pushes and n pops, each O(log n), so O(n log n) for the whole job. Add the import, `by_heap`, and the second pair in the loop to `experiments/time_smallest.py`:

```python file=experiments/time_smallest.py
"""Taking the smallest out, over and over: a list against a heap."""
from frontier.bench import best_of, ratios
from frontier.heap import pop_smallest, push


def by_list(numbers: list[int]) -> list[int]:
    """Every number, smallest first: min finds it, pop takes it out."""
    rest = list(numbers)
    return [rest.pop(rest.index(min(rest))) for _ in range(len(numbers))]


def by_heap(numbers: list[int]) -> list[int]:
    """Every number, smallest first: push them all, then pop them all."""
    heap: list[int] = []
    for number in numbers:
        push(heap, number)
    return [pop_smallest(heap) for _ in range(len(numbers))]


for name, smallest_first in [("list", by_list), ("heap", by_heap)]:
    times = []
    for n in [1000, 2000, 4000, 8000]:
        numbers = [(i * 7919) % n for i in range(n)]
        times.append(best_of(lambda: smallest_first(numbers), repeats=3))
    print(f"{name}: each doubling multiplies the time by", [round(x, 1) for x in ratios(times)])
```

`heap: list[int] = []` says what the empty list will hold, as `self.buckets` did last lesson. In `best_of`, mypy worked out `times` from the `append` that followed it; here the list is only passed to `push`, and mypy won't guess from that. Run it:

```powershell
.venv\Scripts\python experiments/time_smallest.py
```

The list's ratios stay near 4. The heap's come out a little over 2: twice the numbers, and each push or pop one row deeper. At 8000 numbers the heap was over ten times faster when this lesson was written, and the gap doubles with every doubling of n. Yet the list version calls `min`, `index` and `pop`, all written in C, while every step of the heap is your own Python. A better algorithm beats faster code once n is large enough.

```check
run ".venv/Scripts/python experiments/time_smallest.py" stdout="heap: each doubling" label="the experiment times both" -- Import push and pop_smallest from frontier.heap, and add ("heap", by_heap) to the loop's list.
```

## Your turn: the k largest

**Build, on your own:** a function `top_k(numbers, k)` at the end of `src/frontier/heap.py`. It returns the k largest numbers, largest first, as a list. If there are fewer than k numbers, it returns them all. Give it the hints `numbers: list[int]`, `k: int` and `-> list[int]`, and don't use `sorted`.

The trick is to keep a heap of **at most k** numbers: the k largest seen so far. Push each number in turn. Whenever the heap then holds more than k, pop the smallest: it can't be among the k largest, because k bigger ones are already there. At the end, pop everything out into a list, smallest first, and return it reversed. `values[::-1]` is `values` reversed: a slice with a step of -1, which walks from the end to the start.

Sorting all n numbers to keep k would cost O(n log n). This costs O(n log k), and holds only k numbers at a time. That last part matters when the numbers arrive one at a time and there are too many to keep, such as every word in a stream of text.

```hints
nudge: Start with an empty heap, annotated like `by_heap`'s. Inside the loop over numbers, push first, then check the length.
concept: After the loop, the heap holds the k largest. Pop it empty with a list comprehension over `range(len(heap))`, which gives them smallest first, then reverse that list with `[::-1]`.
answer: At the end of `src/frontier/heap.py`:
~~~python
def top_k(numbers: list[int], k: int) -> list[int]:
    """The k largest numbers, largest first, keeping only k at a time."""
    heap: list[int] = []
    for number in numbers:
        push(heap, number)
        if len(heap) > k:
            pop_smallest(heap)
    smallest_first = [pop_smallest(heap) for _ in range(len(heap))]
    return smallest_first[::-1]
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_heap.py -k largest" label="top_k gives the k largest, largest first" -- Push each number; when the heap holds more than k, pop the smallest. At the end, pop them all and reverse the list.
lacks src/frontier/heap.py "sorted" label="top_k uses the heap, not sorted" -- Keep a heap of at most k numbers instead of sorting them all.
run ".venv/Scripts/python -m pytest -q tests/test_heap.py" label="every heap test still passes" -- top_k only adds a function; if an older test fails, check what else changed.
run ".venv/Scripts/python -m mypy --strict src/frontier/heap.py" stdout="Success" label="mypy --strict still passes" -- top_k needs hints: numbers: list[int], k: int, -> list[int], and the empty heap needs list[int].
```

## Python's own, and onto GitHub

Python's `heapq` module is this lesson in C. `heapq.heappush(heap, item)` is your `push`, and `heapq.heappop(heap)` is your `pop_smallest`. `heapq.nlargest(k, values)` is your `top_k`. Like yours, they work on a plain list.

A heap can hold anything that `<` can compare, and that includes tuples. Tuples compare item by item: first items first, and only if those are equal, the second. So a `(count, word)` pair sorts by its count. Try it:

```powershell
.venv\Scripts\python -c "import heapq; print(heapq.nlargest(2, [(2, 'cat'), (5, 'the'), (3, 'sat')]))"
```

It prints `[(5, 'the'), (3, 'sat')]`: the two most common words, with their counts. Chapter 28's tokenizer uses pairs like these to find the most common pair of tokens.

Commit and push:

```powershell
git add .
git commit -m "Build a heap by hand"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  heap.py                parent, left, right, push, sift_down, pop_smallest, top_k
experiments/
  time_smallest.py       taking the smallest out over and over: a list against a heap
tests/
  test_heap.py
```

The rule from this lesson, in one line: **to ask "which is the smallest?" over and over while items arrive, use a heap.** A heap is a tree squeezed into a list. Next lesson, trees get their own nodes, and **recursion**, a function that calls itself, walks them.
