# Heaps and priority queues

A queue serves items in arrival order. Many jobs need a different rule: serve the **most urgent** item next. A hospital emergency room, a computer scheduling processes by priority, a network router, a simulation processing events in time order, and Dijkstra's shortest-path algorithm later in this series all need a **priority queue**: a collection where you can add items with priorities, and always remove the one with the smallest (or largest) priority.

A sorted list makes removal easy but insertion O(n). An unsorted list makes insertion easy but finding the minimum O(n). A **heap** does both in O(log n), and it is stored in a plain list with no links, using the array layout from the binary trees lesson. This lesson covers:

- the heap property, and why it is weaker (and cheaper) than a BST's;
- inserting by **sifting up** and removing the minimum by **sifting down**;
- building a heap from n items in O(n), and **heapsort**;
- Python's `heapq` module, with ties and records;
- the classic heap problems: the k largest items and merging sorted streams.

## The heap property

A **min-heap** is a complete binary tree (every level full except the last, filled from the left) with the **heap property**: every node's value is less than or equal to its children's. So the smallest value is at the root, but there is no ordering between siblings or across subtrees, which is far weaker than a BST and therefore cheaper to maintain. Being complete, the tree fits in a list with the children of index i at 2i + 1 and 2i + 2, and its parent at (i − 1) // 2. A complete tree with n nodes has height ⌊log₂ n⌋, so any path from root to leaf is short.

**Inserting**: put the new item at the end of the list (the next free spot in the bottom level), then **sift up**: while it is smaller than its parent, swap them. **Removing the minimum**: take the root; move the **last** item into the root's place, then **sift down**: while it is larger than its smaller child, swap with that child. Each touches one path, O(log n). Predict before running: after pushing 5, 3, 8, 1, 9, 2, what list will the heap be?

```python type
class MinHeap:
    def __init__(self):
        self.items = []

    def push(self, value):
        self.items.append(value)
        i = len(self.items) - 1
        while i > 0:
            parent = (i - 1) // 2
            if self.items[i] >= self.items[parent]:
                break
            self.items[i], self.items[parent] = self.items[parent], self.items[i]
            i = parent

    def pop(self):
        if not self.items:
            raise IndexError("pop from an empty heap")
        smallest = self.items[0]
        last = self.items.pop()
        if self.items:
            self.items[0] = last
            self._sift_down(0)
        return smallest

    def _sift_down(self, i):
        n = len(self.items)
        while True:
            left, right, smallest = 2 * i + 1, 2 * i + 2, i
            if left < n and self.items[left] < self.items[smallest]:
                smallest = left
            if right < n and self.items[right] < self.items[smallest]:
                smallest = right
            if smallest == i:
                return
            self.items[i], self.items[smallest] = self.items[smallest], self.items[i]
            i = smallest

    def __len__(self):
        return len(self.items)

heap = MinHeap()
for v in [5, 3, 8, 1, 9, 2]:
    heap.push(v)
    print(f"push {v}: {heap.items}")
print("popping:", [heap.pop() for _ in range(len(heap))])
```

```output
push 5: [5]
push 3: [3, 5]
push 8: [3, 5, 8]
push 1: [1, 3, 8, 5]
push 9: [1, 3, 8, 5, 9]
push 2: [1, 3, 2, 5, 9, 8]
popping: [1, 2, 3, 5, 8, 9]
```

`_sift_down` compares with **both** children and swaps with the smaller, so that the new parent is no larger than either child.

The list is not sorted (it ends as [1, 3, 2, 5, 9, 8]), but every parent is no larger than its children, and the minimum is always at index 0. Pushing 1 sifted it from the end all the way up to the root. Popping repeatedly returns 1, 2, 3, 5, 8, 9: a priority queue that hands out items in increasing order.

## Building a heap in O(n), and heapsort

To turn a whole list into a heap, n pushes would cost O(n log n). There is a faster way, **heapify**: sift down every non-leaf node, starting from the last one and working back to the root. Most nodes are near the bottom, where sifting down is short: half the nodes are leaves (no work), a quarter sift at most one level, an eighth at most two. The total is n/4 · 1 + n/8 · 2 + n/16 · 3 + … < n swaps: O(n).

**Heapsort** then sorts in place: heapify into a **max**-heap, then repeatedly swap the maximum (the root) to the end of the list, shrink the heap by one, and sift the new root down. It is O(n log n) in the worst case with no extra memory, which is why introsort falls back on it when quicksort recurses too deeply. (It is not stable, and in practice slower than quicksort, because sifting jumps around the list.) Predict before running: how many swaps does heapify make on 100,000 items, compared with n?

```python type
import random

def sift_down_max(a, i, size, counter):
    while True:
        left, right, largest = 2 * i + 1, 2 * i + 2, i
        if left < size and a[left] > a[largest]:
            largest = left
        if right < size and a[right] > a[largest]:
            largest = right
        if largest == i:
            return
        a[i], a[largest] = a[largest], a[i]
        counter[0] += 1
        i = largest

def heapsort(a):
    build, sort = [0], [0]
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):
        sift_down_max(a, i, n, build)
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        sift_down_max(a, 0, end, sort)
    return build[0], sort[0]

random.seed(0)
data = [random.random() for _ in range(100_000)]
build_swaps, sort_swaps = heapsort(data)
print("sorted correctly:", data == sorted(data))
print(f"heapify: {build_swaps:,} swaps for n = 100,000;  sorting phase: {sort_swaps:,} swaps (n log2 n is about 1,660,964)")
```

```output
sorted correctly: True
heapify: 74,328 swaps for n = 100,000;  sorting phase: 1,400,430 swaps (n log2 n is about 1,660,964)
```

`range(n // 2 - 1, -1, -1)` runs over the non-leaf positions from the last one back to the root; positions from n // 2 onwards are leaves.

Heapify needs fewer swaps than there are items, confirming O(n); the sorting phase needs about n log₂ n, because each of the n removals sifts down a path of length up to log₂ n.

## Python's heapq

Python's `heapq` module provides a min-heap on an ordinary list: `heapq.heappush(h, x)`, `heapq.heappop(h)`, `heapq.heapify(h)` (the O(n) build), and `h[0]` to peek at the minimum. There is no max-heap; the usual trick is to push negated priorities. To store records, push **tuples**: tuples compare by their first item, then the second, and so on. If two priorities can tie and the next item cannot be compared (dictionaries, custom objects), add a counter as a tie-breaker, which also makes ties come out in insertion order. Predict before running: in what order will the tasks come out?

```python type
import heapq
import itertools

tasks = []
counter = itertools.count()
for priority, name in [(2, "write report"), (1, "fix outage"), (3, "tidy desk"), (1, "call client"), (2, "review code")]:
    heapq.heappush(tasks, (priority, next(counter), {"name": name}))

print("next up:", tasks[0][2]["name"])
while tasks:
    priority, _, task = heapq.heappop(tasks)
    print(priority, task["name"])

scores = [55, 91, 72, 38, 88, 64, 99, 47]
print("three largest:", heapq.nlargest(3, scores), " two smallest:", heapq.nsmallest(2, scores))
```

```output
next up: fix outage
1 fix outage
1 call client
2 write report
2 review code
3 tidy desk
three largest: [99, 91, 88]  two smallest: [38, 47]
```

`itertools.count()` produces 0, 1, 2, … on successive calls to `next`, giving every entry a unique tie-breaker, so Python never needs to compare two dictionaries (which would raise `TypeError`).

Priority 1 tasks come first, and between the two of them "fix outage" first, because it was added first. `heapq.nlargest(k, items)` and `nsmallest` use a heap internally, the subject of the first challenge.

## Merging sorted streams

The merge sort lesson merged k sorted lists in rounds. A heap does it in one pass: keep a heap holding the **front item of each list**; repeatedly pop the smallest, output it, and push the next item from the same list. The heap never holds more than k items, so each step is O(log k), and n items take O(n log k). `heapq.merge` does exactly this, lazily, so it works on streams far too large for memory, such as sorted log files from many servers. Predict before running: does `heapq.merge` need the lists to be the same length?

```python type
import heapq

server_logs = [
    [(1, "a: start"), (5, "a: request"), (9, "a: stop")],
    [(2, "b: start"), (3, "b: request"), (4, "b: request"), (10, "b: stop")],
    [(6, "c: start")],
]
for timestamp, message in heapq.merge(*server_logs):
    print(timestamp, message)
```

```output
1 a: start
2 b: start
3 b: request
4 b: request
5 a: request
6 c: start
9 a: stop
10 b: stop
```

`*server_logs` passes each list as a separate argument. `heapq.merge` returns an iterator, producing merged items only as they are asked for.

The events come out in time order across all three servers, and the lists can be any lengths. The same pattern, a heap of "the next candidate from each source", schedules events in simulations and finds shortest paths in Dijkstra's algorithm.

::: challenge The k largest [easy]
Write `k_largest(items, k)` returning the k largest values, largest first, using a **min-heap of size k**: push items onto a heap; whenever it holds more than k, pop the smallest. At the end the heap holds the k largest. That is O(n log k), much better than sorting when k is small. Use `heapq`; don't sort the whole input (sorting the k results at the end is fine).

```python starter
import heapq

def k_largest(items, k):
    return []

print(k_largest([55, 91, 72, 38, 88, 64, 99, 47], 3))
```

```python solution
import heapq

def k_largest(items, k):
    if k <= 0:
        return []
    heap = []
    for x in items:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return sorted(heap, reverse=True)

print(k_largest([55, 91, 72, 38, 88, 64, 99, 47], 3))
```

```python test
import random as _random
assert "k_largest" in dir(), "Keep the function's name as k_largest."
assert k_largest([55, 91, 72, 38, 88, 64, 99, 47], 3) == [99, 91, 88], f"Got {k_largest([55, 91, 72, 38, 88, 64, 99, 47], 3)}."
assert k_largest([1, 2], 5) == [2, 1] and k_largest([], 3) == [] and k_largest([4, 4, 4], 2) == [4, 4], "k larger than the list, empty input, and repeats."
_r = _random.Random(2)
for _ in range(300):
    _xs = [_r.randint(0, 50) for _ in range(_r.randint(0, 30))]; _k = _r.randint(1, 8)
    assert k_largest(_xs, _k) == sorted(_xs, reverse=True)[:_k], f"k_largest({_xs}, {_k}) is wrong."
_body = _source.split("def k_largest")[1].split("\ndef ")[0] if "def k_largest" in _source else ""
assert "heappush" in _body or "heappushpop" in _body or "heapreplace" in _body, "Use heapq to keep a heap of size k."
assert "sorted(items" not in _body and "nlargest" not in _body and "items.sort" not in _body, "Don't sort the whole input or call nlargest: keep a heap of size k."
"SUCCESS: The heap's root is the smallest of the best k so far: anything smaller is thrown away at once. O(n log k) time and O(k) memory, so it works on streams too."
```

Hint: For each item, `heappush` it; if the heap now has more than k items, `heappop` (removing the smallest). Finally return `sorted(heap, reverse=True)`.
:::

::: challenge A running median [medium]
Write a class `RunningMedian` with `add(x)` and `median()`, where `median()` returns the median of all values added so far (the middle value, or the mean of the two middle values for an even count) in O(1), and `add` is O(log n). Use **two heaps**: a max-heap `low` holding the smaller half (store negated values in a `heapq` list) and a min-heap `high` holding the larger half, with `low` allowed one more item than `high`. After each `add`, rebalance so the sizes differ by at most one and every value in `low` is at most every value in `high`.

```python starter
import heapq

class RunningMedian:
    def __init__(self):
        self.low = []
        self.high = []

    def add(self, x):
        pass

    def median(self):
        return 0

rm = RunningMedian()
print([(rm.add(x), rm.median())[1] for x in [5, 15, 1, 3, 8]])
```

```python solution
import heapq

class RunningMedian:
    def __init__(self):
        self.low = []
        self.high = []

    def add(self, x):
        if not self.low or x <= -self.low[0]:
            heapq.heappush(self.low, -x)
        else:
            heapq.heappush(self.high, x)
        if len(self.low) > len(self.high) + 1:
            heapq.heappush(self.high, -heapq.heappop(self.low))
        elif len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self):
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2

rm = RunningMedian()
print([(rm.add(x), rm.median())[1] for x in [5, 15, 1, 3, 8]])
```

```python test
import random as _random, statistics as _stats, time as _time
assert "RunningMedian" in dir(), "Keep the class name RunningMedian."
_rm = RunningMedian(); _got = []
for _x in [5, 15, 1, 3, 8]:
    _rm.add(_x); _got.append(_rm.median())
assert _got == [5, 10, 5, 4, 5], f"The medians after adding 5, 15, 1, 3, 8 are 5, 10, 5, 4, 5; got {_got}."
_r = _random.Random(3); _rm = RunningMedian(); _seen = []
for _ in range(500):
    _x = _r.randint(-100, 100); _rm.add(_x); _seen.append(_x)
    assert _rm.median() == _stats.median(_seen), f"After adding {len(_seen)} values the median should be {_stats.median(_seen)}, got {_rm.median()}."
    assert abs(len(_rm.low) - len(_rm.high)) <= 1, "Keep the two heaps' sizes within one of each other."
_big = RunningMedian(); _start = _time.perf_counter()
for _i in range(20_000):
    _big.add(_r.random())
    _big.median()
    if _time.perf_counter() - _start > 2:
        break
assert _time.perf_counter() - _start < 2, "20,000 adds and medians should be fast: O(log n) per add, O(1) per median, no sorting."
"SUCCESS: The two heap tops are the two middle values, so the median is always one or two peeks away: O(log n) per new value, on an endless stream."
```

Hint: Push x into `low` (as −x) if it is at most `low`'s largest (`-self.low[0]`), otherwise into `high`. Then, if `low` has more than one extra item, move its top to `high`; if `high` is bigger than `low`, move its top to `low`. The median is `low`'s top, or the average of both tops when the sizes are equal.
:::

::: challenge Schedule meetings in the fewest rooms [medium]
Each meeting is a `(start, end)` pair, occupying a room from start up to (not including) end. Write `rooms_needed(meetings)` returning the minimum number of rooms so that no two overlapping meetings share one. Process meetings in order of start time, keeping a min-heap of the **end times** of meetings currently using rooms: before placing a meeting, pop every end time that is at or before its start (those rooms are free again); then push its end time. The answer is the largest size the heap reaches.

```python starter
import heapq

def rooms_needed(meetings):
    return 0

print(rooms_needed([(9, 10), (9, 12), (10, 11), (11, 13), (12, 13)]))
```

```python solution
import heapq

def rooms_needed(meetings):
    ends = []
    most = 0
    for start, end in sorted(meetings):
        while ends and ends[0] <= start:
            heapq.heappop(ends)
        heapq.heappush(ends, end)
        most = max(most, len(ends))
    return most

print(rooms_needed([(9, 10), (9, 12), (10, 11), (11, 13), (12, 13)]))
```

```python test
import random as _random
assert "rooms_needed" in dir(), "Keep the function's name as rooms_needed."
assert rooms_needed([(9, 10), (9, 12), (10, 11), (11, 13), (12, 13)]) == 2, f"Two rooms suffice for this day; got {rooms_needed([(9, 10), (9, 12), (10, 11), (11, 13), (12, 13)])}."
assert rooms_needed([]) == 0 and rooms_needed([(1, 5)]) == 1, "No meetings need no rooms; one meeting needs one."
assert rooms_needed([(1, 4), (2, 5), (3, 6)]) == 3, "Three meetings all overlapping at time 3 need three rooms."
assert rooms_needed([(1, 2), (2, 3), (3, 4)]) == 1, "A meeting ending at 2 frees its room for one starting at 2."
assert rooms_needed([(5, 9), (1, 3), (2, 6)]) == 2, "Meetings may be given in any order."
_r = _random.Random(4)
for _ in range(300):
    _ms = []
    for _ in range(_r.randint(0, 10)):
        _s = _r.randint(0, 20); _ms.append((_s, _s + _r.randint(1, 6)))
    _want = max((sum(1 for s, e in _ms if s <= t < e) for t in range(30)), default=0)
    assert rooms_needed(_ms) == _want, f"rooms_needed({_ms}) should be {_want}."
"SUCCESS: The heap's root is always the room that frees up soonest. The answer equals the largest number of meetings in progress at any moment: O(n log n) to sort, then O(log n) per meeting."
```

Hint: Sort the meetings by start. For each one, pop while `ends[0] <= start`, then push its end and record the heap's size if it is the largest yet.
:::

## What you learned

- A min-heap is a complete binary tree where every parent is at most its children, stored in a list (children of i at 2i + 1 and 2i + 2). The minimum is at index 0.
- Push sifts up and pop sifts down, each O(log n); heapify builds a heap in O(n), and heapsort sorts in place in O(n log n).
- `heapq` gives a min-heap on a list; use negated priorities for a max-heap and a counter as a tie-breaker for records. `nlargest`, `nsmallest` and `merge` cover common jobs.
- Heaps answer "what is the best so far?": the k largest in O(n log k), a running median with two heaps, merging k sorted streams in O(n log k), and room allocation by earliest finishing time.

The next lesson builds a tree for strings: the trie, which finds every word with a given prefix.
