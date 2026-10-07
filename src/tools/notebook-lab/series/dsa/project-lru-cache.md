# Project: LRU cache

A CAD viewer renders drawing thumbnails, and each render takes a noticeable fraction of a second. Users flick back and forth between the same few drawings, so remembering recent renders would make the viewer feel instant. But memory is limited: the cache can hold, say, 100 thumbnails, so when it is full, one must go. Which one? The usual answer is the one used **least recently**: if a drawing has not been looked at for a while, it is the least likely to be wanted next. A cache with that eviction rule is an **LRU cache**, and it is one of the most widely used data structures in software, in web browsers, databases, operating systems, and Python's own `functools.lru_cache`.

This project builds one properly. It needs two data structures working together: a hash table for fast lookup by key, and a linked list that keeps keys in order of use. Both operations, `get` and `put`, must be O(1). It also needs a clean interface, invariant checks and a model-based test, bringing together much of this series.

This lesson covers:

- the requirements, and why a dictionary plus a list is too slow;
- the design: a dict of keys to nodes, and a doubly linked list in recency order;
- building it with sentinel nodes, and checking its invariants;
- testing it against a model, and Python's ready-made versions.

## Requirements, and a first attempt

The cache must support:

- `get(key)`: return the value and mark the key as just used, or return a default if absent;
- `put(key, value)`: store or update, marking the key as just used; if this makes the cache exceed its capacity, evict the least recently used key;
- `len(cache)` and `key in cache` (checking membership should **not** count as a use).

A first attempt keeps the values in a dict and the recency order in a list, moving a key to the end of the list on each use. Predict before running: as the capacity grows, what happens to the time per operation?

```python type
import time, random

class ListLRU:
    def __init__(self, capacity):
        self.capacity, self.values, self.order = capacity, {}, []
    def get(self, key, default=None):
        if key not in self.values:
            return default
        self.order.remove(key)
        self.order.append(key)
        return self.values[key]
    def put(self, key, value):
        if key in self.values:
            self.order.remove(key)
        self.values[key] = value
        self.order.append(key)
        if len(self.order) > self.capacity:
            oldest = self.order.pop(0)
            del self.values[oldest]

def time_ops(cache_class, capacity, ops=20_000, seed=1):
    rng = random.Random(seed)
    cache = cache_class(capacity)
    keys = [rng.randrange(capacity * 2) for _ in range(ops)]
    start = time.perf_counter()
    for k in keys:
        if cache.get(k) is None:
            cache.put(k, k * k)
    return (time.perf_counter() - start) / ops * 1e6

for capacity in [100, 1_000, 5_000]:
    print(f"capacity {capacity:>5}: {time_ops(ListLRU, capacity):6.1f} µs per operation")
```

`list.remove` searches the list and `list.pop(0)` shifts every remaining item, so both cost O(n) in the cache's size.

The time per operation grows with the capacity: the list version is O(n) per operation, so a large cache is slow exactly when it should be helping. The dictionary gives O(1) lookup, but keeping the **order** in a list costs O(n) for every move.

## The design: a hash map plus a doubly linked list

The fix is to keep the recency order in a structure where moving an item is O(1): a **doubly linked list**, in which each node knows its predecessor and successor, so a node can be unlinked and relinked without searching. The linked lists lesson built one. The dictionary then maps each key to its **node**, not just its value. A `get` finds the node through the dict in O(1), unlinks it in O(1), and relinks it at the front in O(1).

Two **sentinel** nodes, a fixed `head` and `tail` that hold no data, sit at the ends of the list. Every real node then always has a real predecessor and successor, so linking and unlinking need no special cases for "first" or "last" or "empty". The most recently used node lives just after `head`; the least recently used just before `tail`, ready to be evicted. Predict before running: in what order are the keys from most to least recent after these operations?

```python type
class Node:
    __slots__ = ("key", "value", "prev", "next")
    def __init__(self, key=None, value=None):
        self.key, self.value = key, value
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self._nodes = {}
        self._head, self._tail = Node(), Node()
        self._head.next, self._tail.prev = self._tail, self._head
        self.hits = self.misses = 0

    def _unlink(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_front(self, node):
        node.prev, node.next = self._head, self._head.next
        self._head.next.prev = node
        self._head.next = node

    def get(self, key, default=None):
        node = self._nodes.get(key)
        if node is None:
            self.misses += 1
            return default
        self.hits += 1
        self._unlink(node)
        self._push_front(node)
        return node.value

    def put(self, key, value):
        node = self._nodes.get(key)
        if node is not None:
            node.value = value
            self._unlink(node)
        else:
            node = Node(key, value)
            self._nodes[key] = node
        self._push_front(node)
        if len(self._nodes) > self.capacity:
            oldest = self._tail.prev
            self._unlink(oldest)
            del self._nodes[oldest.key]

    def __len__(self):
        return len(self._nodes)

    def __contains__(self, key):
        return key in self._nodes

    def keys_by_recency(self):
        node, out = self._head.next, []
        while node is not self._tail:
            out.append(node.key)
            node = node.next
        return out

cache = LRUCache(3)
for k in ["A", "B", "C"]:
    cache.put(k, k.lower())
cache.get("A")
cache.put("D", "d")
print("most to least recent:", cache.keys_by_recency(), " B evicted:", "B" not in cache)
print("hits:", cache.hits, "misses:", cache.misses)
for capacity in [100, 1_000, 5_000]:
    print(f"capacity {capacity:>5}: {time_ops(LRUCache, capacity):6.1f} µs per operation")
```

`__slots__` on `Node` saves memory per node, as in the flyweight lesson, which matters for a large cache.

Reading `A` moved it to the front, so when `D` arrived and the cache overflowed, `B`, the least recently used, was evicted. The order is now `D, A, C`. The time per operation now stays flat as the capacity grows: every operation is a dict lookup plus a few pointer changes.

## Checking the invariants

Pointer code is easy to get subtly wrong: a missed link, a node in the dict but not the list, a list that loops. A `_check` method states the invariants and verifies them: the forward and backward walks visit the same nodes in opposite orders, every node in the list is in the dict under its own key and vice versa, and the size never exceeds the capacity. Run it after every operation in tests. Predict before running: does a long random workload ever break an invariant?

```python type
def _check(self):
    forward, node = [], self._head.next
    while node is not self._tail:
        forward.append(node)
        assert len(forward) <= len(self._nodes), "list longer than the dict: a loop or a stray node"
        node = node.next
    backward, node = [], self._tail.prev
    while node is not self._head:
        backward.append(node)
        node = node.prev
    assert forward == backward[::-1], "forward and backward links disagree"
    assert len(forward) == len(self._nodes) <= self.capacity, "size mismatch or over capacity"
    for n in forward:
        assert self._nodes[n.key] is n, f"dict entry for {n.key!r} points elsewhere"

LRUCache._check = _check

rng = random.Random(7)
cache = LRUCache(5)
for step in range(3000):
    k = rng.randrange(12)
    if rng.random() < 0.5:
        cache.get(k)
    else:
        cache.put(k, step)
    cache._check()
print("3,000 random operations, invariants held; final order:", cache.keys_by_recency())
```

```output
3,000 random operations, invariants held; final order: [5, 1, 4, 2, 8]
```

Assigning a function to `LRUCache._check` adds it as a method to the existing class, a notebook convenience. In a real file it would sit inside the class.

The invariants held through 3,000 random operations. If a pointer bug crept in later, `_check` would report it at the very operation that caused it.

## Testing against a model, and the ready-made versions

Python's `collections.OrderedDict` remembers insertion order and can move a key to the end in O(1) with `move_to_end`, and remove the first with `popitem(last=False)`. That makes it an excellent **model** for a model-based test, as in the testing lesson: replay random operations on both and compare every answer. (Internally, `OrderedDict` is itself a dict plus a doubly linked list: the very design built above.) For memoising a **function**, the standard library's `functools.lru_cache` decorator does all of this, with statistics. Predict before running: does the cache ever disagree with the model?

```python type
from collections import OrderedDict
from functools import lru_cache

def model_test(capacity, ops, seed):
    rng = random.Random(seed)
    cache, model = LRUCache(capacity), OrderedDict()
    for step in range(ops):
        k = rng.randrange(capacity * 3)
        if rng.random() < 0.5:
            want = model.get(k)
            if k in model:
                model.move_to_end(k)
            if cache.get(k) != want:
                return f"get({k}) disagrees at step {step}"
        else:
            model[k] = step
            model.move_to_end(k)
            if len(model) > capacity:
                model.popitem(last=False)
            cache.put(k, step)
        if list(reversed(model)) != cache.keys_by_recency():
            return f"order disagrees at step {step}"
    return "agrees"

print([model_test(cap, 2000, seed) for cap, seed in [(1, 1), (3, 2), (10, 3), (50, 4)]])

@lru_cache(maxsize=128)
def render_thumbnail(drawing):
    time.sleep(0.001)
    return f"thumbnail of {drawing}"

for d in ["A", "B", "A", "C", "A", "B"]:
    render_thumbnail(d)
print(render_thumbnail.cache_info())
```

```output
['agrees', 'agrees', 'agrees', 'agrees']
CacheInfo(hits=3, misses=3, maxsize=128, currsize=3)
```

`reversed(model)` lists the model from most to least recent, because `OrderedDict` keeps the most recently moved key at the end.

The cache agrees with the model in every case, including the awkward capacity of 1. `lru_cache` reports 3 hits and 3 misses for the six renders: only the first sight of each drawing was rendered. When you need a cache in real code, reach for `lru_cache` or `OrderedDict`. When you need to understand, adapt or extend one (expiry times, size by bytes rather than count, a different eviction rule), you now know how it works inside.

::: challenge An LRU cache on OrderedDict [easy]
Write `SimpleLRU(capacity)` using `collections.OrderedDict`, with the same interface as the lesson's cache: `get(key, default=None)` (a hit marks the key as most recent), `put(key, value)` (inserting or updating marks it most recent, and evicts the least recent key if over capacity), `__len__`, `__contains__` (without changing recency) and `keys_by_recency()` (most recent first). Raise `ValueError` for a capacity below 1.

```python starter
from collections import OrderedDict

class SimpleLRU:
    def __init__(self, capacity):
        self.data = OrderedDict()

print("write SimpleLRU")
```

```python solution
from collections import OrderedDict

class SimpleLRU:
    def __init__(self, capacity):
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self._data = OrderedDict()

    def get(self, key, default=None):
        if key not in self._data:
            return default
        self._data.move_to_end(key)
        return self._data[key]

    def put(self, key, value):
        self._data[key] = value
        self._data.move_to_end(key)
        if len(self._data) > self.capacity:
            self._data.popitem(last=False)

    def __len__(self):
        return len(self._data)

    def __contains__(self, key):
        return key in self._data

    def keys_by_recency(self):
        return list(reversed(self._data))

c = SimpleLRU(2)
c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3)
print(c.keys_by_recency())
```

```python test
import random as _random
assert "SimpleLRU" in dir(), "Keep the class name SimpleLRU."
_c = SimpleLRU(2)
_c.put("a", 1); _c.put("b", 2)
assert _c.get("a") == 1 and _c.keys_by_recency() == ["a", "b"], "A hit makes the key most recent."
_c.put("c", 3)
assert "b" not in _c and len(_c) == 2 and _c.keys_by_recency() == ["c", "a"], "Over capacity: the least recent key, b, is evicted."
assert _c.get("b", "none") == "none" and _c.get("zz") is None, "Misses return the default."
_c.put("a", 10)
assert _c.get("a") == 10 and _c.keys_by_recency() == ["a", "c"], "Updating a key changes its value and recency."
"c" in _c
assert _c.keys_by_recency() == ["a", "c"], "Checking membership must not change recency."
for _bad in [0, -1]:
    try:
        SimpleLRU(_bad)
        assert False, "A capacity below 1 should raise ValueError."
    except ValueError:
        pass
_rng = _random.Random(3)
_mine, _ref = SimpleLRU(4), LRUCache(4)
for _i in range(2000):
    _k = _rng.randrange(10)
    if _rng.random() < 0.5:
        assert _mine.get(_k) == _ref.get(_k), f"get({_k}) disagrees with the lesson's cache at step {_i}."
    else:
        _mine.put(_k, _i); _ref.put(_k, _i)
    assert _mine.keys_by_recency() == _ref.keys_by_recency(), f"Recency order disagrees at step {_i}."
"SUCCESS: OrderedDict's move_to_end and popitem(last=False) give an LRU cache in a few lines, matching the hand-built one operation for operation."
```

Hint: `move_to_end(key)` makes a key the newest; `popitem(last=False)` removes the oldest. In `put`, assign, move to the end, then evict if over capacity. `keys_by_recency` is `list(reversed(self._data))`.
:::

::: challenge Your own memoising decorator [medium]
Write a decorator factory `memo(maxsize)` that caches a function's results in an LRU cache of at most `maxsize` entries, keyed by the function's positional arguments (assume they are hashable and there are no keyword arguments). Use the lesson's `LRUCache` (or `SimpleLRU`). The wrapped function must keep its name and docstring (`functools.wraps`) and gain a method `cache_info()` returning a dict `{"hits": h, "misses": m, "size": s, "maxsize": maxsize}`, and `cache_clear()`, which empties the cache and resets the counts. A function that returns `None` must still be cached.

```python starter
import functools

def memo(maxsize):
    def decorate(function):
        return function
    return decorate

@memo(maxsize=2)
def slow_square(x):
    return x * x

print(slow_square(4))
```

```python solution
import functools

def memo(maxsize):
    def decorate(function):
        missing = object()
        state = {"cache": LRUCache(maxsize), "hits": 0, "misses": 0}

        @functools.wraps(function)
        def wrapper(*args):
            result = state["cache"].get(args, missing)
            if result is not missing:
                state["hits"] += 1
                return result
            state["misses"] += 1
            result = function(*args)
            state["cache"].put(args, result)
            return result

        def cache_info():
            return {"hits": state["hits"], "misses": state["misses"], "size": len(state["cache"]), "maxsize": maxsize}

        def cache_clear():
            state.update(cache=LRUCache(maxsize), hits=0, misses=0)

        wrapper.cache_info, wrapper.cache_clear = cache_info, cache_clear
        return wrapper
    return decorate

@memo(maxsize=2)
def slow_square(x):
    """Square a number slowly."""
    return x * x

print([slow_square(n) for n in [2, 3, 2, 4, 3]], slow_square.cache_info())
```

```python test
assert "memo" in dir(), "Keep the name memo."
_calls = []
@memo(maxsize=2)
def _sq(x):
    """Square x."""
    _calls.append(x)
    return x * x
assert [_sq(_n) for _n in [2, 3, 2, 4, 3]] == [4, 9, 4, 16, 9], "Results must be correct."
assert _calls == [2, 3, 4, 3], f"With room for 2, 3 is evicted by 4 (2 was used more recently) and recomputed; computed {_calls}."
assert _sq.cache_info() == {"hits": 1, "misses": 4, "size": 2, "maxsize": 2}, f"Got {_sq.cache_info()}."
assert _sq.__name__ == "_sq" and _sq.__doc__ == "Square x.", "Keep the name and docstring with functools.wraps."
_sq.cache_clear()
assert _sq.cache_info() == {"hits": 0, "misses": 0, "size": 0, "maxsize": 2}, "cache_clear empties and resets."
_sq(2)
assert _calls[-1] == 2, "After clearing, results are recomputed."
_none_calls = []
@memo(maxsize=5)
def _nothing(x):
    _none_calls.append(x)
    return None
_nothing(1); _nothing(1); _nothing(1)
assert _none_calls == [1] and _nothing.cache_info()["hits"] == 2, "A None result is a real result and must be cached: use a sentinel, not None, to detect misses."
@memo(maxsize=3)
def _add(a, b):
    return a + b
assert _add(1, 2) == 3 and _add(2, 1) == 3 and _add.cache_info()["misses"] == 2, "Different arguments are different keys."
"SUCCESS: The decorator wraps any function in an LRU cache, keeps its identity, reports its statistics, and caches even None correctly."
```

Hint: Inside `decorate`, keep the cache and counters in a small dict (so the inner functions can update them). Look results up with a sentinel default, `cache.get(args, missing)`, so a cached `None` is still a hit. Attach `cache_info` and `cache_clear` as attributes of the wrapper.
:::

::: challenge An O(1) LFU cache [hard]
An **LFU** (least frequently used) cache evicts the key that has been used the **fewest** times, breaking ties by evicting the least recently used among those. Write `LFUCache(capacity)` with `get(key, default=None)` and `put(key, value)`, both O(1), plus `__len__`, `__contains__` (no effect on counts) and `frequency(key)` (the use count, or 0 if absent). A `put` of a new key gives it count 1. A `get` hit, or a `put` updating an existing key, adds 1 to its count. When a `put` of a new key would exceed the capacity, evict **before** inserting it.

For O(1), keep a dict from key to `(value, count)`, a dict from count to an `OrderedDict` of the keys with that count (in recency order), and the current minimum count. Moving a key from count c to c + 1 is then O(1). The minimum count only ever increases by 1 when its bucket empties during an increment, or resets to 1 when a new key arrives.

```python starter
from collections import OrderedDict, defaultdict

class LFUCache:
    def __init__(self, capacity):
        self.capacity = capacity

print("write LFUCache")
```

```python solution
from collections import OrderedDict, defaultdict

class LFUCache:
    def __init__(self, capacity):
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self._entries = {}
        self._buckets = defaultdict(OrderedDict)
        self._min_count = 0

    def _bump(self, key):
        value, count = self._entries[key]
        del self._buckets[count][key]
        if not self._buckets[count]:
            del self._buckets[count]
            if self._min_count == count:
                self._min_count = count + 1
        self._entries[key] = (value, count + 1)
        self._buckets[count + 1][key] = None

    def get(self, key, default=None):
        if key not in self._entries:
            return default
        self._bump(key)
        return self._entries[key][0]

    def put(self, key, value):
        if key in self._entries:
            self._entries[key] = (value, self._entries[key][1])
            self._bump(key)
            return
        if len(self._entries) >= self.capacity:
            victim, _ = self._buckets[self._min_count].popitem(last=False)
            if not self._buckets[self._min_count]:
                del self._buckets[self._min_count]
            del self._entries[victim]
        self._entries[key] = (value, 1)
        self._buckets[1][key] = None
        self._min_count = 1

    def __len__(self):
        return len(self._entries)

    def __contains__(self, key):
        return key in self._entries

    def frequency(self, key):
        return self._entries[key][1] if key in self._entries else 0

c = LFUCache(2)
c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3)
print("b" in c, c.frequency("a"), c.frequency("c"))
```

```python test
import random as _random, time as _time
assert "LFUCache" in dir(), "Keep the class name LFUCache."
_c = LFUCache(2)
_c.put("a", 1); _c.put("b", 2)
assert _c.get("a") == 1 and _c.frequency("a") == 2 and _c.frequency("b") == 1, "A hit adds one to the count."
_c.put("c", 3)
assert "b" not in _c and "a" in _c and "c" in _c, "b had the lowest count, so it is evicted."
_c.get("c")
_c.put("d", 4)
assert "a" not in _c and "c" in _c and "d" in _c, "a and c both have count 2; a is less recent, so a goes."
_c.put("d", 40)
assert _c.get("d") == 40 and _c.frequency("d") == 3, "Updating counts as a use."
_c.frequency("zz"); "c" in _c
assert _c.frequency("c") == 2, "frequency and `in` don't change counts."
def _model_run(_cap, _ops, _seed):
    _rng = _random.Random(_seed)
    _lfu, _vals, _cnt, _last, _t = LFUCache(_cap), {}, {}, {}, 0
    for _step in range(_ops):
        _k = _rng.randrange(_cap * 3)
        _t += 1
        if _rng.random() < 0.5:
            _want = _vals.get(_k)
            if _k in _vals:
                _cnt[_k] += 1; _last[_k] = _t
            assert _lfu.get(_k) == _want, f"get({_k}) wrong at step {_step}."
        else:
            if _k in _vals:
                _vals[_k] = _step; _cnt[_k] += 1; _last[_k] = _t
            else:
                if len(_vals) >= _cap:
                    _victim = min(_vals, key=lambda _x: (_cnt[_x], _last[_x]))
                    for _d in (_vals, _cnt, _last):
                        del _d[_victim]
                _vals[_k], _cnt[_k], _last[_k] = _step, 1, _t
            _lfu.put(_k, _step)
        assert set(_vals) == {_x for _x in range(_cap * 3) if _x in _lfu}, f"Different keys kept at step {_step}."
        assert all(_lfu.frequency(_x) == _cnt[_x] for _x in _vals), f"Counts differ at step {_step}."
for _cap, _seed in [(1, 1), (2, 2), (5, 3), (12, 4)]:
    _model_run(_cap, 1500, _seed)
_big = LFUCache(20_000)
_start = _time.perf_counter()
for _i in range(60_000):
    _big.put(_i % 30_000, _i)
    _big.get((_i * 7) % 30_000)
    if _time.perf_counter() - _start > 6:
        break
_el = _time.perf_counter() - _start
assert _el < 4, f"120,000 operations on a 20,000-entry cache took over {_el:.1f} s: every operation must be O(1), with no scanning for the minimum."
"SUCCESS: Buckets of keys by count, each an ordered dict, plus the minimum count, make every LFU operation O(1), and it matches a brute-force model step for step."
```

Hint: In `_bump(key)`, move the key from bucket `count` to bucket `count + 1` (appending it at the end, the most recent position), deleting the old bucket if it empties and raising `_min_count` if that bucket was the minimum. In `put` for a new key at capacity, `popitem(last=False)` from the minimum bucket gives the least recently used key among the least frequent.
:::

## What you learned

- An LRU cache keeps the most recently used items within a fixed capacity, evicting the least recently used. It needs O(1) lookup **and** O(1) reordering.
- A dict alone cannot order, and a list costs O(n) to reorder. A dict from keys to nodes of a doubly linked list gives both in O(1); sentinel nodes remove the special cases at the ends.
- An invariant check (links consistent both ways, dict and list in agreement, size within capacity), run after every operation in tests, catches pointer bugs where they happen. A model-based test against `OrderedDict` checks every answer.
- In practice, use `functools.lru_cache` for functions and `OrderedDict` (`move_to_end`, `popitem(last=False)`) for custom caches. Different eviction rules, such as LFU, follow the same idea of buckets that make each step O(1).

The next project builds a text editor with undo, combining the command and memento patterns over a gap buffer.
