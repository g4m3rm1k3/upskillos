# Queues and deques

A **queue** is the fair counterpart of a stack: the first item added is the first one removed, **first in, first out** (FIFO), like people waiting in line. Items join at the **back** (enqueue) and leave from the **front** (dequeue). Queues appear wherever work must be handled in arrival order: print jobs, web requests waiting for a server, messages between programs, and the frontier of breadth-first search, one of the most important graph algorithms.

A **deque** (pronounced "deck", short for double-ended queue) generalises both: items can be added and removed at **either** end in O(1). Python's `collections.deque` is the tool to reach for, and this lesson shows both how to use it and how such a structure works inside. It covers:

- why a Python list makes a poor queue;
- the **circular buffer**: a fixed array used as a ring, giving O(1) at both ends;
- `collections.deque` and its extras: `maxlen` and `rotate`;
- simulating a queue to answer a practical question.

## Why not a list?

A list's `append` is a fine way to join the back, but leaving from the front with `pop(0)` shifts every remaining item: O(n). A queue that processes n items that way does O(n²) work. The lesson on Python's costs measured it; the fix is a structure designed for removal at the front. One idea is a linked list (the previous lesson's doubly linked list with a sentinel does everything in O(1)). Another, faster in practice, keeps the items in an array but lets the front **move**.

## The circular buffer

Picture the array's slots arranged in a ring. Keep an index `_front` pointing at the first item and a count `_size`. Dequeuing reads the slot at `_front` and moves `_front` one step on; nothing shifts. Enqueuing writes at position `(_front + _size) % capacity`: the `%` (remainder) makes positions wrap round from the last slot to slot 0, reusing the space freed at the start. When the ring is full, it grows like a dynamic array: copy the items, in queue order, into a block twice the size. Predict before running: after the operations below, which slot will hold "f"?

```python type
class ArrayQueue:
    def __init__(self, capacity=4):
        self._block = [None] * capacity
        self._front = 0
        self._size = 0

    def __len__(self):
        return self._size

    def enqueue(self, item):
        if self._size == len(self._block):
            self._grow()
        back = (self._front + self._size) % len(self._block)
        self._block[back] = item
        self._size += 1

    def dequeue(self):
        if self._size == 0:
            raise IndexError("dequeue from an empty queue")
        item = self._block[self._front]
        self._block[self._front] = None
        self._front = (self._front + 1) % len(self._block)
        self._size -= 1
        return item

    def _grow(self):
        old = self._block
        self._block = [None] * (2 * len(old))
        for i in range(self._size):
            self._block[i] = old[(self._front + i) % len(old)]
        self._front = 0

q = ArrayQueue(4)
for item in "abcd":
    q.enqueue(item)
print("dequeued:", q.dequeue(), q.dequeue())
q.enqueue("e")
q.enqueue("f")
print("block:", q._block, " front index:", q._front, " size:", len(q))
q.enqueue("g")
print("after growing:", q._block, " front index:", q._front)
print("in order:", [q.dequeue() for _ in range(len(q))])
```

```output
dequeued: a b
block: ['e', 'f', 'c', 'd']  front index: 2  size: 4
after growing: ['c', 'd', 'e', 'f', 'g', None, None, None]  front index: 0
in order: ['c', 'd', 'e', 'f', 'g']
```

`_grow` copies the items starting from `_front` and wrapping round, so in the new block they sit in queue order from slot 0.

After two dequeues, slots 0 and 1 are free and the front is at slot 2. "e" and "f" wrap round into slots 0 and 1, so the block reads e, f, c, d while the queue order is c, d, e, f. Adding "g" fills the ring, so it grows to 8 slots and unwraps. Every operation is O(1), amortised for the occasional growth. This is how the ring buffers inside operating systems and network cards work, and many queue libraries; hardware versions usually have a fixed size and either refuse or overwrite when full. `collections.deque` takes a different route to the same O(1) ends: it links fixed-size blocks of items together.

## collections.deque

In real code, use `collections.deque`. It supports `append` and `pop` at the right end, `appendleft` and `popleft` at the left, all O(1), plus `len`, iteration and `in`. As a queue, use `append` to join and `popleft` to leave. Predict before running: how will the time to process 50,000 items compare between `list.pop(0)` and `deque.popleft()`?

```python type
from collections import deque
import timeit

def drain_list(n):
    q = list(range(n))
    while q:
        q.pop(0)

def drain_deque(n):
    q = deque(range(n))
    while q:
        q.popleft()

for n in [25_000, 50_000, 100_000]:
    t_list = timeit.timeit(lambda: drain_list(n), number=1)
    t_deque = timeit.timeit(lambda: drain_deque(n), number=1)
    print(f"n = {n:>7,}: list.pop(0) {t_list * 1000:7.1f} ms   deque.popleft() {t_deque * 1000:5.1f} ms")
```

The deque's time grows in proportion to n (O(1) per item), while the list's grows faster (O(n) per item, so O(n²) in total), and the gap widens with every doubling. One caution: indexing a deque in the middle, `d[i]`, is O(n) (it is built from linked blocks), so a deque is for working at the ends, not for random access.

## maxlen and rotate

Two features make deques especially handy. With `maxlen`, a deque keeps only the most recent items: appending to a full deque silently drops an item from the other end. That is exactly a "last N events" buffer. And `rotate(k)` moves the last k items to the front (or, with negative k, the first items to the back), which models taking turns. Predict before running: what will `recent` hold after the loop, and what does rotating by −2 do?

```python type
from collections import deque

recent = deque(maxlen=3)
for event in ["login", "view", "click", "click", "logout"]:
    recent.append(event)
print("last three events:", list(recent))

players = deque(["Ann", "Ben", "Cat", "Dan"])
players.rotate(-2)
print("after rotate(-2):", list(players))
players.rotate(1)
print("after rotate(1): ", list(players))
```

```output
last three events: ['click', 'click', 'logout']
after rotate(-2): ['Cat', 'Dan', 'Ann', 'Ben']
after rotate(1):  ['Ben', 'Cat', 'Dan', 'Ann']
```

`rotate(-2)` takes two players from the front and puts them at the back: Cat, Dan, Ann, Ben. `rotate(1)` moves the last one to the front: Ben, Cat, Dan, Ann. Rotation costs O(k), not O(n).

## A queue simulation

Queues are also a way of **modelling** systems: customers at a counter, requests at a server. A small simulation can answer questions that are hard to work out on paper, such as how long people wait when the server is nearly as busy as it can be. Here customers arrive at random (on average one every `mean_gap` minutes), one server takes 4 minutes per customer, and the queue holds each customer's arrival time. Predict before running: if customers arrive on average every 5 minutes, so the server is busy 80% of the time, will the average wait be about a minute, or much more?

```python type
import random
from collections import deque

def average_wait(mean_gap, service_time=4.0, customers=20_000, seed=0):
    rng = random.Random(seed)
    clock, next_arrival, server_free_at = 0.0, 0.0, 0.0
    waiting = deque()
    waits = []
    arrived = 0
    while arrived < customers or waiting:
        if arrived < customers and (not waiting or next_arrival <= server_free_at):
            clock = next_arrival
            waiting.append(clock)
            arrived += 1
            next_arrival = clock + rng.expovariate(1 / mean_gap)
        else:
            clock = max(server_free_at, waiting[0])
            waits.append(clock - waiting.popleft())
            server_free_at = clock + service_time
    return sum(waits) / len(waits)

for gap in [10, 6, 5, 4.5]:
    print(f"a customer every {gap:>4} minutes on average (server busy {4 / gap:.0%}): average wait {average_wait(gap):6.1f} minutes")
```

```output
a customer every   10 minutes on average (server busy 40%): average wait    1.3 minutes
a customer every    6 minutes on average (server busy 67%): average wait    3.8 minutes
a customer every    5 minutes on average (server busy 80%): average wait    7.6 minutes
a customer every  4.5 minutes on average (server busy 89%): average wait   16.0 minutes
```

`rng.expovariate(1 / mean_gap)` draws a random gap from the exponential distribution, the standard model for independent arrivals. The loop handles whichever event comes first: the next arrival joining the back, or the server taking the customer at the front.

At 40% busy, the wait is well under 2 minutes. At 80%, it is around 8 minutes, and at 89%, around 16: the wait does not grow in proportion to how busy the server is, it **explodes** as the server approaches full capacity, because any burst of arrivals builds a queue that the server has little spare time to clear. That is why systems are run with headroom, and the queue is the structure that lets you see it.

::: challenge A moving average [easy]
Write a class `MovingAverage` whose constructor takes `size`, and whose method `add(value)` records a new value and returns the average of the last `size` values (or of all values so far, if there are fewer). Use a `deque` with `maxlen` and keep a running total, so each `add` is O(1) even for a large window: subtract the value that is about to fall out before appending.

```python starter
from collections import deque

class MovingAverage:
    def __init__(self, size):
        pass

    def add(self, value):
        return 0.0

m = MovingAverage(3)
print([m.add(v) for v in [3, 6, 9, 12]])
```

```python solution
from collections import deque

class MovingAverage:
    def __init__(self, size):
        self._window = deque(maxlen=size)
        self._total = 0.0

    def add(self, value):
        if len(self._window) == self._window.maxlen:
            self._total -= self._window[0]
        self._window.append(value)
        self._total += value
        return self._total / len(self._window)

m = MovingAverage(3)
print([m.add(v) for v in [3, 6, 9, 12]])
```

```python test
import time as _time
assert "MovingAverage" in dir(), "Keep the class name MovingAverage."
_m = MovingAverage(3)
_got = [_m.add(_v) for _v in [3, 6, 9, 12]]
assert all(abs(_a - _b) < 1e-9 for _a, _b in zip(_got, [3, 4.5, 6, 9])), f"For window 3 and values 3, 6, 9, 12 the averages are 3, 4.5, 6, 9; got {_got}."
_one = MovingAverage(1)
assert [_one.add(_v) for _v in [5, 7, 2]] == [5, 7, 2], "A window of 1 returns each value itself."
_big = MovingAverage(50_000)
_start = _time.perf_counter()
for _i in range(100_000):
    _last = _big.add(_i)
    if _time.perf_counter() - _start > 2:
        break
_elapsed = _time.perf_counter() - _start
assert _elapsed < 2, f"Adding values took over 2 s before finishing: keep a running total instead of summing the window each time."
assert abs(_last - (sum(range(50_000, 100_000)) / 50_000)) < 1e-6, "The average over a large window is wrong."
assert _elapsed < 2, f"100,000 adds with a window of 50,000 took {_elapsed:.1f} s: keep a running total instead of summing the window each time."
"SUCCESS: A running total plus a bounded deque: O(1) per value whatever the window size."
```

Hint: Store `deque(maxlen=size)` and a `total`. In `add`, if the deque is already full, subtract `self._window[0]` (the value about to be dropped) from the total; then append and add the new value. Divide by the current length.
:::

::: challenge A queue from two stacks [medium]
A queue can be built from two stacks (Python lists used only with `append` and `pop()`): push new items onto an `inbox` stack; to dequeue, pop from an `outbox` stack, and only when the outbox is empty, move **everything** from the inbox to the outbox (which reverses it into queue order). Write `TwoStackQueue` with `enqueue(item)`, `dequeue()` (raising `IndexError` when empty), `__len__`, and an attribute `moves` counting items transferred from inbox to outbox.

Each item is moved at most once, so n operations cost O(n) in total: amortised O(1), by the aggregate method from the amortised analysis lesson.

```python starter
class TwoStackQueue:
    def __init__(self):
        self.moves = 0

    def enqueue(self, item):
        pass

    def dequeue(self):
        return None

    def __len__(self):
        return 0

q = TwoStackQueue()
for x in [1, 2, 3]:
    q.enqueue(x)
print(q.dequeue(), q.dequeue(), len(q), q.moves)
```

```python solution
class TwoStackQueue:
    def __init__(self):
        self._inbox = []
        self._outbox = []
        self.moves = 0

    def enqueue(self, item):
        self._inbox.append(item)

    def dequeue(self):
        if not self._outbox:
            while self._inbox:
                self._outbox.append(self._inbox.pop())
                self.moves += 1
        if not self._outbox:
            raise IndexError("dequeue from an empty queue")
        return self._outbox.pop()

    def __len__(self):
        return len(self._inbox) + len(self._outbox)

q = TwoStackQueue()
for x in [1, 2, 3]:
    q.enqueue(x)
print(q.dequeue(), q.dequeue(), len(q), q.moves)
```

```python test
import random as _random
from collections import deque as _deque
assert "TwoStackQueue" in dir(), "Keep the class name TwoStackQueue."
_q = TwoStackQueue()
try:
    _q.dequeue()
    assert False, "Dequeuing an empty queue should raise IndexError."
except IndexError:
    pass
for _x in [1, 2, 3]:
    _q.enqueue(_x)
assert _q.dequeue() == 1 and _q.moves == 3, "The first dequeue moves all 3 items to the outbox and returns 1."
_q.enqueue(4)
assert _q.dequeue() == 2 and _q.moves == 3, "While the outbox still has items, nothing more is moved."
assert _q.dequeue() == 3 and _q.dequeue() == 4 and _q.moves == 4 and len(_q) == 0, "4 is moved only once the outbox is empty."
_r = _random.Random(3); _mine = TwoStackQueue(); _ref = _deque(); _ops = 0
for _ in range(20_000):
    _ops += 1
    if _ref and _r.random() < 0.5:
        assert _mine.dequeue() == _ref.popleft(), "Order differs from a real queue."
    else:
        _v = _r.random(); _mine.enqueue(_v); _ref.append(_v)
    assert len(_mine) == len(_ref), "__len__ should count items in both stacks."
assert _mine.moves <= _ops, f"{_mine.moves} moves for {_ops} operations: each item should be moved at most once."
f"SUCCESS: {_mine.moves:,} moves over {_ops:,} operations: each item crosses from inbox to outbox once, so the queue is amortised O(1)."
```

Hint: `dequeue`: if the outbox is empty, pop every item from the inbox and append it to the outbox (counting moves). Then, if the outbox is still empty, raise `IndexError`; otherwise pop it.
:::

::: challenge Who is left standing? [medium]
In the Josephus game, n people stand in a circle numbered 1 to n. Counting starts at person 1; every k-th person is eliminated, and counting continues from the next person, until everyone is gone. Write `elimination_order(n, k)` returning the list of numbers in the order they are eliminated, using a `deque` and `rotate`: rotate so that the k-th person is at the front, then `popleft` them.

```python starter
from collections import deque

def elimination_order(n, k):
    return []

print(elimination_order(7, 3))
```

```python solution
from collections import deque

def elimination_order(n, k):
    circle = deque(range(1, n + 1))
    order = []
    while circle:
        circle.rotate(-(k - 1))
        order.append(circle.popleft())
    return order

print(elimination_order(7, 3))
```

```python test
assert "elimination_order" in dir(), "Keep the function's name as elimination_order."
assert elimination_order(7, 3) == [3, 6, 2, 7, 5, 1, 4], f"For n = 7, k = 3 the order is 3, 6, 2, 7, 5, 1, 4; got {elimination_order(7, 3)}."
assert elimination_order(5, 1) == [1, 2, 3, 4, 5], "With k = 1, people leave in order."
assert elimination_order(1, 4) == [1] and elimination_order(0, 2) == [], "One person is eliminated alone; no people, no eliminations."
assert elimination_order(4, 2) == [2, 4, 3, 1], "For n = 4, k = 2: 2, 4, 3, 1."
assert elimination_order(41, 3)[-1] == 31, "The classic case: with 41 people and k = 3, the survivor is number 31."
assert "rotate" in _source, "Use deque.rotate to bring the k-th person to the front."
"SUCCESS: rotate(-(k - 1)) skips k − 1 people to the back, and popleft removes the k-th: the circle is a deque."
```

Hint: Start with `deque(range(1, n + 1))`. Repeatedly `rotate(-(k - 1))`, which sends the first k − 1 people to the back, then `popleft()` the person now at the front.
:::

## What you learned

- A queue is first in, first out: enqueue at the back, dequeue at the front. A list's `pop(0)` makes that O(n) per item.
- A circular buffer keeps a moving front index and wraps positions with `%`, giving O(1) at both ends, with doubling when full.
- `collections.deque` gives O(1) `append`, `appendleft`, `pop` and `popleft`; `maxlen` keeps the last N items and `rotate` models turn-taking. Indexing its middle is O(n).
- Queue simulations show that waiting times explode as a server approaches full capacity. A queue can also be built from two stacks, amortised O(1) per operation.

The next lesson builds the structure behind Python's dictionaries and sets: the hash table.
