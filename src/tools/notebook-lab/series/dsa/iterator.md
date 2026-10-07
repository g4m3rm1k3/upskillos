# Iterator

The **iterator** pattern gives a way to go through the items of a collection one at a time **without exposing how the collection is stored**. In many languages it is a pattern you build by hand. In Python it is part of the language: every `for` loop asks its iterable for an iterator with `iter()` and pulls items with `next()`, and generator functions write iterators for you. Python from Zero covered those mechanics. This lesson is about using them as a **design** tool.

Three design ideas follow from the pattern. Code that loops over a collection should not depend on its internal layout. One collection can offer **several** traversals: by bin, by part, only the low-stock items. And because iterators are lazy, traversals can be combined into pipelines that never build the whole result.

This lesson covers:

- the problem: loops that depend on a collection's internal structure;
- iterables that offer several traversals, and the trap of handing out a used-up iterator;
- traversing trees without recursion, using an explicit stack;
- composing iterators with `itertools`, the standard library's iterator algebra.

## The problem: loops that know the layout

A stores system keeps parts in bins on racks: a dict of racks, each a dict of bins, each a list of `(part, quantity)` pairs. Report code loops through that structure directly. Predict before reading on: what happens to these loops if the stores move to a flat database table keyed by bin code?

```python type
stores = {
    "A": {"A1": [("bolt M8", 120), ("nut M8", 300)], "A2": [("washer", 40)]},
    "B": {"B1": [("bolt M10", 8)], "B2": [], "B3": [("pin 4mm", 15), ("clip", 3)]},
}

total = 0
for rack, bins in stores.items():
    for bin_code, contents in bins.items():
        for part, qty in contents:
            total += qty
print("total items:", total)

low = []
for rack, bins in stores.items():
    for bin_code, contents in bins.items():
        for part, qty in contents:
            if qty < 10:
                low.append((bin_code, part, qty))
print("low stock:", low)
```

```output
total items: 486
low stock: [('B1', 'bolt M10', 8), ('B3', 'clip', 3)]
```

Both reports repeat three nested loops that encode the storage layout. Change the layout and every report breaks. The reports only ever wanted "each stocked item, with its bin", but they had to know how racks, bins and contents were nested to get it.

## Several traversals of one collection

Hide the layout inside a class and offer **traversals** as methods. Each method is a generator yielding exactly what callers want. The class itself is iterable through `__iter__`, which gives the most common traversal. Callers loop over items; only the class knows about racks. Each call creates a **fresh** iterator, so the collection can be traversed any number of times. Predict before running: what goes wrong in the last two lines?

```python type
class Stores:
    def __init__(self, layout):
        self._layout = layout

    def __iter__(self):
        for bins in self._layout.values():
            for bin_code, contents in bins.items():
                for part, qty in contents:
                    yield bin_code, part, qty

    def low_stock(self, threshold=10):
        return ((b, p, q) for b, p, q in self if q < threshold)

    def empty_bins(self):
        for bins in self._layout.values():
            for bin_code, contents in bins.items():
                if not contents:
                    yield bin_code

s = Stores(stores)
print("total items:", sum(qty for _, _, qty in s))
print("low stock:", list(s.low_stock()))
print("empty bins:", list(s.empty_bins()))

low = s.low_stock()
print("first pass:", len(list(low)), "items   second pass:", len(list(low)), "items")
```

```output
total items: 486
low stock: [('B1', 'bolt M10', 8), ('B3', 'clip', 3)]
empty bins: ['B2']
first pass: 2 items   second pass: 0 items
```

`low_stock` returns a generator expression built on `self`, so it reuses the main traversal instead of repeating the nested loops.

The `Stores` object can be looped over as often as you like, because `__iter__` starts a new generator each time. But `low_stock()` returns a **generator**, which is an iterator, not a re-iterable collection: once consumed, it is empty. So the second pass sees nothing, with no error. That is the most common iterator bug. Either keep the iterable (`s`) and call the traversal again, or turn the result into a list when it must be used twice. If the stores move to a database, only `Stores` changes: every report keeps working.

## Traversing a tree without recursion

The composite lesson walked trees recursively. That is the natural way to write it, but each level of a tree uses a level of Python's call stack, so very deep trees hit the recursion limit (about 1,000). An iterator can instead keep an **explicit stack**, a list of nodes still to visit. Pop a node, yield it, push its children. That gives a depth-first walk with no recursion at all, and since it is a generator, the walk is lazy: it stops the moment the caller stops asking. Swapping the stack for a queue gives breadth-first order. Predict before running: does the walk survive a 3,000-level-deep tree?

```python type
from collections import deque

class Node:
    def __init__(self, name, *children):
        self.name, self.children = name, list(children)

def depth_first(root):
    stack = [root]
    while stack:
        node = stack.pop()
        yield node
        stack.extend(reversed(node.children))

def breadth_first(root):
    queue = deque([root])
    while queue:
        node = queue.popleft()
        yield node
        queue.extend(node.children)

plant = Node("plant", Node("hall 1", Node("line A"), Node("line B")), Node("hall 2", Node("line C")))
print("depth first:  ", [n.name for n in depth_first(plant)])
print("breadth first:", [n.name for n in breadth_first(plant)])

deep = Node("level 0")
node = deep
for i in range(1, 3000):
    child = Node(f"level {i}")
    node.children.append(child)
    node = child
print("deepest:", sum(1 for _ in depth_first(deep)), "nodes walked")
print("first match:", next(n.name for n in depth_first(deep) if n.name.endswith("42")))
```

```output
depth first:   ['plant', 'hall 1', 'line A', 'line B', 'hall 2', 'line C']
breadth first: ['plant', 'hall 1', 'hall 2', 'line A', 'line B', 'line C']
deepest: 3000 nodes walked
first match: level 42
```

`reversed(node.children)` pushes the children so that the first child is popped first, keeping the same order a recursive walk would give.

The 3,000-level tree walks without trouble, where a recursive walk would hit `RecursionError` at about 1,000. And finding the first node ending in 42 stops after 43 nodes, because `next` takes one match and the generator is never asked for more.

## Composing iterators

Because every iterator speaks the same two-method protocol, small iterator tools combine into pipelines. The `itertools` module is a toolbox of them. A few of the most useful:

- `itertools.chain(a, b)`: all of `a`, then all of `b`;
- `itertools.islice(it, n)`: the first n items (also `islice(it, start, stop)`);
- `itertools.takewhile(pred, it)`: items while the condition holds;
- `itertools.pairwise(it)`: each item with the next, `(a, b), (b, c), ...`;
- `itertools.groupby(it, key)`: runs of consecutive items with the same key;
- `itertools.count(start)`: an endless counter.

A sensor stream is a natural fit: it may be endless, and the pipeline processes one reading at a time. Predict before running: how many readings does this pipeline pull from the endless stream?

```python type
import itertools, math

def sensor():
    for t in itertools.count():
        yield t, round(20 + 5 * math.sin(t / 3) + (8 if t in (11, 12, 13) else 0), 1)

pulled = []
def tapped(stream):
    for item in stream:
        pulled.append(item)
        yield item

readings = itertools.islice(tapped(sensor()), 30)
jumps = ((t1, round(v1 - v0, 1)) for (t0, v0), (t1, v1) in itertools.pairwise(readings) if abs(v1 - v0) > 3)
print("big jumps:", list(itertools.islice(jumps, 2)))
print("readings pulled from the sensor:", len(pulled))

warm = [(t, v) for t, v in itertools.islice(sensor(), 40)]
runs = [(hot, len(list(group))) for hot, group in itertools.groupby(warm, key=lambda tv: tv[1] > 22)]
print("runs of warm (True) and cool (False) readings:", runs)
```

```output
big jumps: [(11, 6.5), (14, -8.4)]
readings pulled from the sensor: 15
runs of warm (True) and cool (False) readings: [(False, 2), (True, 7), (False, 2), (True, 3), (False, 7), (True, 7), (False, 11), (True, 1)]
```

`tapped` is a pass-through generator that records every reading it hands on, so we can count what the pipeline actually asked for.

The pipeline found the two big jumps (into and out of the spike) and pulled only the readings it needed to find them: 15 from an endless sensor, not 30. `groupby` turned 40 readings into runs of warm and cool, which is how alarm systems turn noisy readings into "it was hot from 11:02 to 11:09". Each tool knows nothing about sensors; they just consume and produce iterators.

::: challenge A re-iterable parts list [easy]
Write a class `PartsList(lines)` that stores a list of order lines, each a dict with `"part"`, `"qty"` and `"unit_price"`, and offers:

- `__iter__`: yields `(part, qty)` pairs, so the object can be looped over any number of times;
- `expensive(limit)`: yields the parts whose line total (`qty × unit_price`) is more than `limit`, in order;
- `__len__`: the number of lines.

Keep the stored list private (an underscore name), and make sure that neither changing the list passed to the constructor nor editing one of its dicts afterwards can change the parts list.

```python starter
class PartsList:
    def __init__(self, lines):
        self.lines = lines

print("write PartsList")
```

```python solution
class PartsList:
    def __init__(self, lines):
        self._lines = [dict(line) for line in lines]

    def __iter__(self):
        for line in self._lines:
            yield line["part"], line["qty"]

    def expensive(self, limit):
        for line in self._lines:
            if line["qty"] * line["unit_price"] > limit:
                yield line["part"]

    def __len__(self):
        return len(self._lines)

order = PartsList([{"part": "bearing", "qty": 4, "unit_price": 6.5}, {"part": "bolt", "qty": 100, "unit_price": 0.4}])
print(list(order), list(order), list(order.expensive(30)))
```

```python test
assert "PartsList" in dir(), "Keep the class name PartsList."
_src = [{"part": "bearing", "qty": 4, "unit_price": 6.5}, {"part": "bolt", "qty": 100, "unit_price": 0.4}, {"part": "motor", "qty": 1, "unit_price": 120.0}]
_p = PartsList(_src)
assert list(_p) == [("bearing", 4), ("bolt", 100), ("motor", 1)], f"Iterating yields (part, qty); got {list(_p)}."
assert list(_p) == list(_p), "The parts list can be looped over again and again."
assert len(_p) == 3, "len counts the lines."
assert list(_p.expensive(30)) == ["bolt", "motor"], "Lines over 30: bolts (40.0) and the motor (120.0)."
_gen = _p.expensive(0)
assert iter(_gen) is _gen, "expensive should return an iterator (a generator)."
_src.append({"part": "extra", "qty": 1, "unit_price": 1})
_src[0]["qty"] = 999
assert len(_p) == 3 and list(_p)[0] == ("bearing", 4), "Changing the original list or its dicts afterwards must not change the parts list: copy each line's dict, not just the list."
assert all(_n.startswith("_") for _n in vars(_p)), "Keep the stored lines in an underscore attribute."
"SUCCESS: Callers loop over parts as often as they like without knowing how the lines are stored, and extra traversals are just more generator methods."
```

Hint: Copy the lines in `__init__` (a new list of new dicts). `__iter__` and `expensive` are generator methods using `yield`; each call starts afresh.
:::

::: challenge A batching iterator by hand [medium]
Write a class `Batches(iterable, size)` that is itself an **iterator**: it must implement `__iter__` (returning `self`) and `__next__`, **without** using `yield`. Each `next()` returns a list of the next `size` items from the source, the last batch possibly shorter, and raises `StopIteration` when the source is used up (never yielding an empty list). It must be lazy: it pulls items from the source only as each batch is requested, so it works on endless sources. `size` must be a positive integer, else raise `ValueError` at construction.

```python starter
class Batches:
    def __init__(self, iterable, size):
        self._source = iter(iterable)
        self._size = size

print("write __iter__ and __next__")
```

```python solution
class Batches:
    def __init__(self, iterable, size):
        if not isinstance(size, int) or size < 1:
            raise ValueError("size must be a positive integer")
        self._source = iter(iterable)
        self._size = size

    def __iter__(self):
        return self

    def __next__(self):
        batch = []
        for _ in range(self._size):
            try:
                batch.append(next(self._source))
            except StopIteration:
                break
        if not batch:
            raise StopIteration
        return batch

print(list(Batches(range(7), 3)))
```

```python test
import itertools as _it
assert "Batches" in dir(), "Keep the class name Batches."
assert list(Batches(range(7), 3)) == [[0, 1, 2], [3, 4, 5], [6]], "Batches of 3, the last shorter."
assert list(Batches(range(6), 3)) == [[0, 1, 2], [3, 4, 5]] and list(Batches([], 4)) == [], "No empty batch at the end, and nothing from an empty source."
_b = Batches("abcde", 2)
assert iter(_b) is _b and next(_b) == ["a", "b"], "Batches is its own iterator."
assert next(_b) == ["c", "d"] and next(_b) == ["e"], "next continues where it left off."
for _ in range(2):
    try:
        next(_b)
        assert False, "An exhausted Batches raises StopIteration."
    except StopIteration:
        pass
_pulled = []
def _endless():
    for _i in _it.count():
        _pulled.append(_i)
        yield _i
_lazy = Batches(_endless(), 4)
assert next(_lazy) == [0, 1, 2, 3] and next(_lazy) == [4, 5, 6, 7] and len(_pulled) == 8, f"Pull only what each batch needs; pulled {len(_pulled)} items."
for _bad in [0, -2, 2.5]:
    try:
        Batches([1], _bad)
        assert False, f"size {_bad!r} should raise ValueError."
    except ValueError:
        pass
assert "__next__" in vars(Batches) and "__iter__" in vars(Batches), "Implement the iterator protocol yourself."
assert not (Batches.__next__.__code__.co_flags & 0x20), "__next__ must not be a generator function (no yield)."
"SUCCESS: Two methods, __iter__ returning self and __next__ raising StopIteration at the end, make an object work with for loops, list(), islice and everything else."
```

Hint: Store `iter(iterable)`. In `__next__`, call `next(self._source)` up to `size` times, stopping early on `StopIteration`; if the batch is empty, raise `StopIteration` yourself.
:::

::: challenge Traversals of a deep folder tree [hard]
Write a class `Folder(name)` with `files` (a list of `(filename, size)` tuples) and `subfolders` (a list of `Folder`), and methods `add_file(filename, size)` and `add_folder(folder)` that return `self` for chaining (`add_folder` returns the parent). Then give it three traversals, all as generator methods that use an explicit stack or queue and **no recursion**, because folder trees here can be thousands of levels deep:

- `walk()`: yields `(path, folder)` for every folder, depth first, parent before children, children in the order added; a path is the folder names joined with `"/"` from the starting folder;
- `all_files()`: yields `(path_of_file, size)` for every file, in `walk` order, files within a folder in the order added, the file's path being its folder's path plus `"/" + filename`;
- `level_order()`: yields `(depth, folder_name)` breadth first, starting at depth 0.

```python starter
class Folder:
    def __init__(self, name):
        self.name, self.files, self.subfolders = name, [], []

print("write the methods")
```

```python solution
from collections import deque

class Folder:
    def __init__(self, name):
        self.name, self.files, self.subfolders = name, [], []

    def add_file(self, filename, size):
        self.files.append((filename, size))
        return self

    def add_folder(self, folder):
        self.subfolders.append(folder)
        return self

    def walk(self):
        stack = [(self.name, self)]
        while stack:
            path, folder = stack.pop()
            yield path, folder
            for child in reversed(folder.subfolders):
                stack.append((f"{path}/{child.name}", child))

    def all_files(self):
        for path, folder in self.walk():
            for filename, size in folder.files:
                yield f"{path}/{filename}", size

    def level_order(self):
        queue = deque([(0, self)])
        while queue:
            depth, folder = queue.popleft()
            yield depth, folder.name
            for child in folder.subfolders:
                queue.append((depth + 1, child))

root = Folder("jobs").add_file("index.txt", 2).add_folder(Folder("2026").add_file("j1.nc", 40)).add_folder(Folder("old"))
print([p for p, _ in root.walk()], list(root.all_files()), list(root.level_order()))
```

```python test
for _n in ["Folder"]:
    assert _n in dir(), f"Define {_n}."
_root = (Folder("jobs").add_file("index.txt", 2)
         .add_folder(Folder("2026").add_file("j1.nc", 40).add_folder(Folder("may").add_file("j2.nc", 55)))
         .add_folder(Folder("old").add_file("x.nc", 9)))
assert [_p for _p, _ in _root.walk()] == ["jobs", "jobs/2026", "jobs/2026/may", "jobs/old"], f"Depth first, parent first, in order added; got {[_p for _p, _ in _root.walk()]}."
assert list(_root.all_files()) == [("jobs/index.txt", 2), ("jobs/2026/j1.nc", 40), ("jobs/2026/may/j2.nc", 55), ("jobs/old/x.nc", 9)], f"Got {list(_root.all_files())}."
assert list(_root.level_order()) == [(0, "jobs"), (1, "2026"), (1, "old"), (2, "may")], f"Breadth first with depths; got {list(_root.level_order())}."
assert sum(_s for _, _s in _root.all_files()) == 106, "Totals come from the traversal."
_deep = Folder("d0")
_node = _deep
for _i in range(1, 3000):
    _child = Folder(f"d{_i}")
    _node.add_folder(_child)
    _node = _child
_node.add_file("bottom.txt", 1)
assert sum(1 for _ in _deep.walk()) == 3000, "A 3,000-level tree must walk without recursion."
assert list(_deep.all_files())[0][0].endswith("d2999/bottom.txt") and max(_d for _d, _ in _deep.level_order()) == 2999, "Files and depths deep in the tree."
_visited = []
class _Spy(Folder):
    @property
    def files(self):
        _visited.append(self.name)
        return self.__dict__["files"]
    @files.setter
    def files(self, value):
        self.__dict__["files"] = value
_wide = _Spy("w")
for _i in range(50):
    _wide.add_folder(_Spy(f"c{_i}").add_file("f", 1))
_visited.clear()
next(_wide.all_files())
assert len(_visited) <= 3, f"all_files should be lazy: finding the first file looked inside {len(_visited)} folders."
"SUCCESS: Three traversals over one tree, all lazy and all safe at any depth, and callers never touch the subfolder lists."
```

Hint: For `walk`, start a stack with `(name, self)`; pop, yield, then push the children reversed with their extended paths. `all_files` can loop over `self.walk()`. For `level_order`, use a `deque` of `(depth, folder)` with `popleft`.
:::

## What you learned

- The iterator pattern separates going through a collection from how it is stored. Code that loops over items survives any change of layout.
- A collection can offer several traversals as generator methods. An iterable returns a fresh iterator from each `__iter__`; an iterator, such as a generator, is used up after one pass, and reusing it silently gives nothing.
- An explicit stack (depth first) or queue (breadth first) traverses trees of any depth without recursion, lazily.
- The iterator protocol is two methods: `__iter__` returning the iterator and `__next__` raising `StopIteration` at the end.
- `itertools` (`chain`, `islice`, `takewhile`, `pairwise`, `groupby`, `count`) composes iterators into lazy pipelines that work even on endless streams.

The next lesson passes a request along a chain of handlers until one deals with it: the chain of responsibility.
