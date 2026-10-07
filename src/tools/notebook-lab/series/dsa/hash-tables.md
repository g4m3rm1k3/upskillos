# Hash tables

Dictionaries and sets answer "is this key here, and what goes with it?" in O(1) on average, however many keys they hold. No amount of clever searching achieves that; the trick is not to search at all. A **hash table** computes, from the key itself, **where** in an array the key should be stored, and goes straight there. This lesson builds one, and in doing so explains the rules Python imposes on dictionary keys and the circumstances in which the O(1) promise breaks.

It covers:

- **hash functions**: turning any key into a number, then a slot index;
- **collisions**, when two keys want the same slot, handled by **chaining**;
- the **load factor**, and resizing to keep the chains short;
- what happens with a bad hash function;
- the rules for keys: equal keys need equal hashes, and keys must not change.

## From key to slot

A **hash function** turns a key into an integer, its **hash**. Python's built-in `hash()` does this for every immutable built-in type. The table then takes the hash modulo the number of slots (its **capacity**) to get a slot index. A good hash function spreads keys evenly over the slots. Predict before running: with six keys and eight slots, will any two keys share a slot?

```python type
for key in ["cat", "cab", 42, 43, (1, 2), 3.5]:
    print(f"{key!r:>8}: hash {hash(key):>22}   slot in a table of 8: {hash(key) % 8}")
```

Even six keys in eight slots produce at least one collision: 43 and 3.5 always share slot 3, so collisions have to be handled from the very start. Small integers hash to themselves, so 42 and 43 sit in neighbouring slots; that is fine, since a good spread is all that matters. String hashes change every time Python starts (a security measure called **hash randomisation**, which stops attackers from choosing keys that collide), so your string hashes differ from anyone else's, and from your own next run. On a desktop Python they also look completely random; this browser's Python uses a simpler string hash, which is why "cat" and "cab" get similar numbers here, though the `% 8` still usually sends them to different slots. The `% 8` turns any hash, including negative ones, into a slot from 0 to 7, because Python's `%` always returns a result with the sign of the divisor.

## Collisions and chaining

With more possible keys than slots, two keys will sometimes land in the same slot: a **collision**. Collisions are unavoidable; the question is how to handle them. **Separate chaining** makes each slot a small list (a **bucket**) of (key, value) pairs. To look a key up, go to its bucket and search just that bucket. As long as buckets stay short, that is O(1). Predict before running: Ann is put twice below, so what will the size be?

```python type
class ChainedHashMap:
    def __init__(self, capacity=8):
        self._buckets = [[] for _ in range(capacity)]
        self._size = 0

    def _bucket(self, key):
        return self._buckets[hash(key) % len(self._buckets)]

    def put(self, key, value):
        bucket = self._bucket(key)
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self._size += 1
        if self._size > 0.75 * len(self._buckets):
            self._resize(2 * len(self._buckets))

    def get(self, key, default=None):
        for k, v in self._bucket(key):
            if k == key:
                return v
        return default

    def _resize(self, new_capacity):
        old_items = [pair for bucket in self._buckets for pair in bucket]
        self._buckets = [[] for _ in range(new_capacity)]
        for key, value in old_items:
            self._bucket(key).append((key, value))

    def __len__(self):
        return self._size

ages = ChainedHashMap()
for name, age in [("Ann", 31), ("Ben", 25), ("Cat", 40), ("Ann", 32)]:
    ages.put(name, age)
print(ages.get("Ann"), ages.get("Ben"), ages.get("Zoe", "unknown"), "size", len(ages))
print("bucket lengths:", [len(b) for b in ages._buckets])
```

`[[] for _ in range(capacity)]` makes separate empty lists; `[[]] * capacity` would make eight references to **one** shared list, a classic bug.

Putting "Ann" a second time replaces her value rather than adding a duplicate, so the size is 3. The bucket lengths show where the three keys landed (this changes from run to run, because of hash randomisation). Notice that `put` and `get` compare keys with `==` after finding the bucket: the hash only narrows the search; equality decides.

## Load factor and resizing

The **load factor** is the number of keys divided by the number of buckets: the average bucket length. If the table never grew, adding n keys to 8 buckets would make buckets about n/8 long, and lookups O(n). So the table **resizes** when the load factor passes a threshold (0.75 here), doubling the buckets and re-inserting every key, because each key's slot depends on the capacity. By the amortised analysis lesson's argument, doubling keeps the cost O(1) per insertion on average. Predict before running: after inserting 100,000 keys, how long will the longest bucket be?

```python type
import random

table = ChainedHashMap()
random.seed(0)
keys = random.sample(range(10**9), 100_000)
for key in keys:
    table.put(key, True)

lengths = [len(b) for b in table._buckets]
print(f"{len(table):,} keys in {len(lengths):,} buckets: load factor {len(table) / len(lengths):.2f}")
print(f"average non-empty bucket {sum(lengths) / sum(1 for n in lengths if n):.2f}, longest {max(lengths)}")
print("how many buckets have each length:", {n: lengths.count(n) for n in sorted(set(lengths))})
```

```output
100,000 keys in 262,144 buckets: load factor 0.38
average non-empty bucket 1.20, longest 6
how many buckets have each length: {0: 178975, 1: 68380, 2: 12957, 3: 1636, 4: 183, 5: 12, 6: 1}
```

`random.sample(range(10**9), 100_000)` picks 100,000 different numbers without building the huge range.

The load factor stays below 0.75, and even with 100,000 keys the longest bucket holds only a handful. Most buckets have 0, 1 or 2 keys: the counts follow a well-known pattern (a Poisson distribution) for keys spread at random. So a lookup checks one or two pairs, whatever the table's size: O(1) on average.

Python's own `dict` uses a different collision strategy, **open addressing**: instead of buckets, a colliding key tries other slots in the same array in a fixed pseudo-random order until it finds a free one. It is more memory-efficient and faster in practice, and the second challenge builds a simple version.

## When hashing goes wrong

The O(1) promise depends entirely on the hash function spreading keys out. A bad hash function sends many keys to the same bucket, and the table degrades into a list. Here a class with a deliberately terrible `__hash__` (every object hashes to 1) is compared with one that hashes properly. Predict before running: how will inserting 2,000 of each compare?

```python type
import timeit

class BadKey:
    def __init__(self, n):
        self.n = n
    def __eq__(self, other):
        return isinstance(other, BadKey) and self.n == other.n
    def __hash__(self):
        return 1

class GoodKey(BadKey):
    def __hash__(self):
        return hash(self.n)

for cls in [GoodKey, BadKey]:
    seconds = timeit.timeit(lambda: {cls(i): i for i in range(2_000)}, number=1)
    print(f"{cls.__name__}: building a dict of 2,000 keys took {seconds * 1000:7.1f} ms")
```

`__eq__` and `__hash__` are the special methods a dictionary calls on keys. `GoodKey` inherits `__eq__` from `BadKey` and overrides only the hash.

With every hash equal, each new key collides with all previous ones and must be compared with each of them: insertion becomes O(n), building the dict O(n²), and it is hundreds of times slower. Attackers have exploited exactly this against web servers by sending request parameters chosen to collide, which is why Python randomises string hashes.

## The rules for keys

Two rules follow from how hash tables work, and Python's dictionaries depend on both:

1. **Equal keys must have equal hashes.** If `a == b`, then `hash(a) == hash(b)`. Otherwise two equal keys could land in different buckets and a lookup would miss. That is why `hash(1) == hash(1.0) == hash(True)`: they are equal, so they must hash alike, and they count as the same dictionary key. (Unequal keys may share a hash; that is just a collision.)
2. **A key's hash must not change while it is in the table.** The key was filed under its hash; if the hash changed, the key would be in the wrong bucket and could never be found. That is why lists, sets and dictionaries, which can change, are **unhashable**, while strings, numbers and tuples of them are fine.

```python type
d = {1: "one"}
d[1.0] = "one point zero"
d[True] = "true"
print(d)

try:
    {[1, 2]: "list key"}
except TypeError as error:
    print("TypeError:", error)
print({(1, 2): "a tuple works"})
```

```output
{1: 'true'}
TypeError: unhashable type: 'list'
{(1, 2): 'a tuple works'}
```

The first dictionary ends up with a single key, still the original `1`, whose value was overwritten twice: 1, 1.0 and True are equal. A list key is refused with `TypeError: unhashable type: 'list'`; a tuple of the same values works. When you define `__eq__` in your own class, Python sets `__hash__` to `None` (making instances unhashable) unless you also define a `__hash__` consistent with it, which the third challenge practises.

::: challenge Remove a key [easy]
Add `delete(self, key)` to `ChainedHashMap`: remove the key's pair from its bucket and return its value, decreasing the size, or raise `KeyError(key)` if the key is not present. Also add `__contains__(self, key)` so that `key in table` works.

```python starter
def delete(self, key):
    return None

def __contains__(self, key):
    return False

ChainedHashMap.delete = delete
ChainedHashMap.__contains__ = __contains__

t = ChainedHashMap()
t.put("a", 1)
t.put("b", 2)
print(t.delete("a"), "a" in t, "b" in t, len(t))
```

```python solution
def delete(self, key):
    bucket = self._bucket(key)
    for i, (k, v) in enumerate(bucket):
        if k == key:
            del bucket[i]
            self._size -= 1
            return v
    raise KeyError(key)

def __contains__(self, key):
    return any(k == key for k, _ in self._bucket(key))

ChainedHashMap.delete = delete
ChainedHashMap.__contains__ = __contains__

t = ChainedHashMap()
t.put("a", 1)
t.put("b", 2)
print(t.delete("a"), "a" in t, "b" in t, len(t))
```

```python test
import random as _random
_t = ChainedHashMap()
_t.put("a", 1); _t.put("b", 2)
assert _t.delete("a") == 1 and len(_t) == 1, "delete should return the value and reduce the size."
assert ("a" in _t) is False and ("b" in _t) is True, "__contains__ should reflect what is stored."
try:
    _t.delete("a")
    assert False, "Deleting a missing key should raise KeyError."
except KeyError:
    pass
_t.put("z", None)
assert "z" in _t, "A key whose value is None is still present: test for the key, not the value."
_r = _random.Random(0); _mine = ChainedHashMap(); _ref = {}
for _ in range(5000):
    _k = _r.randint(0, 300)
    if _r.random() < 0.4 and _k in _ref:
        assert _mine.delete(_k) == _ref.pop(_k), "delete returned the wrong value."
    else:
        _mine.put(_k, _k * 2); _ref[_k] = _k * 2
    assert len(_mine) == len(_ref), "Size out of step with a real dict."
assert all((_k in _mine) == (_k in _ref) for _k in range(301)), "Membership differs from a real dict after random operations."
"SUCCESS: Delete finds the bucket by hash, then the pair by equality: O(1) on average, like put and get."
```

Hint: Find the bucket with `self._bucket(key)`, loop with `enumerate` to find the pair whose key equals `key`, then `del bucket[i]`. For `__contains__`, check whether any pair in the bucket has that key.
:::

::: challenge Open addressing with linear probing [medium]
Build `ProbingHashMap` with a single array of slots (`None` for empty, or a `(key, value)` pair) and **linear probing**: a key starts at slot `hash(key) % capacity`; if that slot holds a different key, try the next slot, wrapping round with `%`, until finding the key or an empty slot. Implement `put(key, value)` (replacing the value if the key exists), `get(key, default=None)` and `__len__`. Start with capacity 8 and, before inserting a new key, double the capacity and re-insert everything if the table would become more than half full. (No deletion needed: deleting from a probing table needs special markers.)

```python starter
class ProbingHashMap:
    def __init__(self):
        self._slots = [None] * 8
        self._size = 0

    def put(self, key, value):
        pass

    def get(self, key, default=None):
        return default

    def __len__(self):
        return self._size

p = ProbingHashMap()
for i in range(20):
    p.put(i * 8, i)
print(p.get(64), p.get(3, "missing"), len(p))
```

```python solution
class ProbingHashMap:
    def __init__(self):
        self._slots = [None] * 8
        self._size = 0

    def _find(self, key):
        i = hash(key) % len(self._slots)
        while self._slots[i] is not None and self._slots[i][0] != key:
            i = (i + 1) % len(self._slots)
        return i

    def put(self, key, value):
        i = self._find(key)
        if self._slots[i] is not None:
            self._slots[i] = (key, value)
            return
        if self._size + 1 > len(self._slots) // 2:
            old = [pair for pair in self._slots if pair is not None]
            self._slots = [None] * (2 * len(self._slots))
            for k, v in old:
                self._slots[self._find(k)] = (k, v)
            i = self._find(key)
        self._slots[i] = (key, value)
        self._size += 1

    def get(self, key, default=None):
        pair = self._slots[self._find(key)]
        return default if pair is None else pair[1]

    def __len__(self):
        return self._size

p = ProbingHashMap()
for i in range(20):
    p.put(i * 8, i)
print(p.get(64), p.get(3, "missing"), len(p))
```

```python test
import random as _random
assert "ProbingHashMap" in dir(), "Keep the class name ProbingHashMap."
_p = ProbingHashMap()
for _i in range(20):
    _p.put(_i * 8, _i)
assert _p.get(64) == 8 and _p.get(3, "missing") == "missing" and len(_p) == 20, "Keys 0, 8, 16, … all start at the same slot when the capacity is 8: probing must still find each one."
_p.put(64, "new")
assert _p.get(64) == "new" and len(_p) == 20, "Putting an existing key replaces its value without changing the size."
assert len(_p._slots) >= 2 * len(_p), "The table should stay at most half full."
assert all(isinstance(_s, tuple) or _s is None for _s in _p._slots), "Use a single array of None or (key, value) pairs: no buckets."
_r = _random.Random(7); _mine = ProbingHashMap(); _ref = {}
for _ in range(5000):
    _k = _r.choice([_r.randint(0, 2000), "k" + str(_r.randint(0, 500)), (_r.randint(0, 9), _r.randint(0, 9))])
    _v = _r.random(); _mine.put(_k, _v); _ref[_k] = _v
assert len(_mine) == len(_ref) and all(_mine.get(_k) == _v for _k, _v in _ref.items()), "After random puts (ints, strings, tuples), every key should give its latest value."
assert _mine.get("absent") is None and _mine.get(-1, 0) == 0, "Missing keys give the default."
"SUCCESS: One flat array, keys stepping forward past collisions: the idea behind Python's own dict, which probes in a scrambled order instead of slot by slot."
```

Hint: A helper `_find(key)` that starts at `hash(key) % capacity` and steps forward (with wrap-around) while the slot is occupied by a **different** key returns either the key's slot or the empty slot where it belongs. `put` and `get` both use it. When resizing, re-insert each old pair at `_find(k)` in the new array.
:::

::: challenge A hashable point [medium]
Write a class `Point` with attributes `x` and `y` such that two points with the same coordinates are equal (`__eq__`), can be used interchangeably as dictionary keys and set members (`__hash__`, consistent with `__eq__`), and compare unequal to non-points. Make the coordinates read-only after creation, so a point's hash can never change: store them in `_x` and `_y` and expose `x` and `y` with `@property`.

```python starter
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

visited = {Point(0, 0), Point(1, 2), Point(0, 0)}
print(len(visited), Point(1, 2) in visited)
```

```python solution
class Point:
    def __init__(self, x, y):
        self._x = x
        self._y = y

    @property
    def x(self):
        return self._x

    @property
    def y(self):
        return self._y

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self._x, self._y) == (other._x, other._y)

    def __hash__(self):
        return hash((self._x, self._y))

    def __repr__(self):
        return f"Point({self._x}, {self._y})"

visited = {Point(0, 0), Point(1, 2), Point(0, 0)}
print(len(visited), Point(1, 2) in visited)
```

```python test
assert "Point" in dir(), "Keep the class name Point."
assert Point(1, 2) == Point(1, 2) and Point(1, 2) != Point(2, 1), "Points with the same coordinates are equal; different ones are not."
assert hash(Point(3, 4)) == hash(Point(3, 4)), "Equal points must have equal hashes."
assert len({Point(0, 0), Point(1, 2), Point(0, 0)}) == 2, "A set should keep one copy of equal points."
_d = {Point(5, 5): "treasure"}
assert _d.get(Point(5, 5)) == "treasure", "A new Point(5, 5) should find the value stored under an equal point."
assert Point(1, 2) != (1, 2) and Point(0, 0) != "origin", "A point should not equal a tuple or a string."
assert Point(2, 3).x == 2 and Point(2, 3).y == 3, "x and y should still be readable."
_pt = Point(1, 1)
try:
    _pt.x = 9
    assert False, "Assigning to x should fail: make it a read-only property."
except AttributeError:
    pass
_many = {Point(_i % 50, _i // 50) for _i in range(2500)}
assert len({hash(_q) for _q in _many}) > 2000, "The hash should spread different points out (hash the tuple of coordinates)."
"SUCCESS: Equal points hash alike and can't change: everything a dictionary needs from a key. (A frozen dataclass gives you all of this in one line.)"
```

Hint: `__eq__` should return `NotImplemented` for non-points and compare the coordinate tuples otherwise. `__hash__` can return `hash((self._x, self._y))`. A property without a setter raises `AttributeError` when assigned.
:::

## What you learned

- A hash table turns a key into a slot with `hash(key) % capacity` and goes straight there; the hash narrows the search and `==` decides.
- Collisions are unavoidable. Chaining keeps a small bucket per slot; open addressing probes other slots of one array, as Python's dict does.
- Resizing when the load factor passes a threshold keeps buckets short, so lookups and insertions are O(1) on average, amortised over the resizes. A bad hash function collapses this to O(n).
- Keys must hash consistently with equality, and their hashes must not change: so mutable lists and dicts are unhashable, and classes defining `__eq__` need a matching `__hash__`.

The next lesson puts dictionaries and sets to work on the patterns that come up constantly: counting, grouping, indexing and memo tables.
