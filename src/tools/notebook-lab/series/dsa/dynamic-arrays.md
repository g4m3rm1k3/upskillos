# Dynamic arrays

A Python list is a **dynamic array**: a fixed-size block of slots plus a count of how many are in use, which grows by moving to a bigger block when it runs out of room. The last two lessons analysed that design. This lesson **builds** one, as a class that behaves like a small list, so that every cost you have been told about becomes something you can see in the code.

Building data structures yourself is how you come to understand them: what each operation must do, which ones are cheap, and why. The same skills (a class with special methods, an internal representation hidden behind a clean interface, and checks that the structure stays consistent) carry through every structure in this series.

This lesson covers:

- the representation: a fixed block, a size and a capacity;
- indexing with bounds checks, including negative indices;
- `append` with doubling, and `pop` with shrinking;
- `insert` and why it is O(n), counted with a move counter;
- testing a structure against Python's own list.

## The representation

The class needs a block of memory with a fixed number of slots. Real arrays get one from the operating system; here, a Python list created at a fixed length, `[None] * capacity`, plays that role, and the class promises never to change its length: no `append`, no `pop`, no slicing on the block. Growing means making a new block and copying items across, one by one, exactly as a real dynamic array does.

Two numbers describe the state: `_capacity`, the number of slots in the block, and `_size`, how many of them hold items. Items always occupy slots 0 to `_size - 1`. The leading underscore is the Python convention for "internal: don't touch from outside the class". Predict before running: after appending 0 to 9 into an array that starts with capacity 1, what will the capacity be, and how many slots will be empty?

```python type
class DynamicArray:
    def __init__(self):
        self._capacity = 1
        self._size = 0
        self._block = [None] * self._capacity

    def __len__(self):
        return self._size

    def _resize(self, new_capacity):
        new_block = [None] * new_capacity
        for i in range(self._size):
            new_block[i] = self._block[i]
        self._block = new_block
        self._capacity = new_capacity

    def append(self, value):
        if self._size == self._capacity:
            self._resize(2 * self._capacity)
        self._block[self._size] = value
        self._size += 1

    def __repr__(self):
        items = ", ".join(repr(self._block[i]) for i in range(self._size))
        return f"DynamicArray([{items}])"

a = DynamicArray()
for i in range(10):
    a.append(i)
print(a, "length", len(a))
print("capacity", a._capacity, "block:", a._block)
```

```output
DynamicArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) length 10
capacity 16 block: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, None, None, None, None, None, None]
```

Reading `a._capacity` and `a._block` from outside the class breaks the underscore promise; it is done here only to look inside.

Ten items in a block of 16 slots: six are empty, waiting for future appends. The block had to grow four times (to 2, 4, 8 and 16 slots), each time copying everything, and the doubling rule keeps those copies to an amortised constant per append. `_resize` is the only method that makes a new block, so the growth rule lives in one place.

## Indexing, with bounds checks

Reading and writing items should look like a list's: `a[3]`, `a[-1]`, `a[0] = 5`. The special methods `__getitem__` and `__setitem__` make the square brackets work. Both must reject positions outside 0 to size − 1: the block may have spare slots beyond the size, and reading them would return stale `None`s, a silent bug. Negative indices count from the end, as in a list, so −1 means size − 1.

```python type
def _check_index(self, index):
    if index < 0:
        index += self._size
    if not 0 <= index < self._size:
        raise IndexError(f"index out of range for size {self._size}")
    return index

def __getitem__(self, index):
    return self._block[self._check_index(index)]

def __setitem__(self, index, value):
    self._block[self._check_index(index)] = value

DynamicArray._check_index = _check_index
DynamicArray.__getitem__ = __getitem__
DynamicArray.__setitem__ = __setitem__

a[0] = 100
print(a[0], a[3], a[-1])
for bad in [10, -11]:
    try:
        a[bad]
    except IndexError as error:
        print(f"a[{bad}] -> IndexError: {error}")
```

```output
100 3 9
a[10] -> IndexError: index out of range for size 10
a[-11] -> IndexError: index out of range for size 10
```

Assigning functions to the class after it is defined (`DynamicArray.__getitem__ = __getitem__`) adds them as methods, exactly as if they had been written inside the class. It lets this lesson grow the class one cell at a time; in a real program you would write them all inside the `class` block.

Index 10 is rejected even though the block has a slot 10: it is beyond the size. Both operations are O(1): an arithmetic check and one slot access, whatever the size.

## Iteration comes free

With `__len__` and `__getitem__` in place, Python can already loop over the array: a `for` loop over an object without `__iter__` calls `__getitem__` with 0, 1, 2, … until an `IndexError`. So the bounds check is doing double duty: it is what stops the loop. Predict before running: will `list(a)` and `sum(a)` work?

```python type
print(list(a))
print(sum(a), max(a), 7 in a)
```

```output
[100, 1, 2, 3, 4, 5, 6, 7, 8, 9]
145 100 True
```

They do. `in` also falls back to looping, which is O(n), as for a list. An explicit `__iter__` would be slightly faster and clearer, and the iterator lesson later in this series shows how to write one.

## Pop and insert

`pop()` removes and returns the last item: O(1), because nothing else moves. It should also give memory back when the array becomes mostly empty, shrinking at a quarter full (not half, to avoid the thrashing from the last lesson); that is the first challenge.

`insert(index, value)` is different. To put a value at position i, every item from i onwards must first move one slot to the right, starting from the end so that nothing is overwritten. Inserting at the front of an array of n items moves all n. The version below counts its moves. Predict before running: how many moves will inserting at the front, the middle and the end of a 1,000-item array take?

```python type
def insert(self, index, value):
    if index < 0:
        index += self._size
    index = max(0, min(index, self._size))
    if self._size == self._capacity:
        self._resize(2 * self._capacity)
    moves = 0
    for i in range(self._size, index, -1):
        self._block[i] = self._block[i - 1]
        moves += 1
    self._block[index] = value
    self._size += 1
    return moves

DynamicArray.insert = insert

big = DynamicArray()
for i in range(1000):
    big.append(i)
for where in ["front", "middle", "end"]:
    position = {"front": 0, "middle": len(big) // 2, "end": len(big)}[where]
    print(f"insert at the {where:<6} (index {position:>4}): {big.insert(position, -1)} moves")
```

```output
insert at the front  (index    0): 1000 moves
insert at the middle (index  500): 501 moves
insert at the end    (index 1002): 0 moves
```

`range(self._size, index, -1)` counts down from the size to just above the index, so each item moves right before the slot to its left is copied into its old place. As with Python's `list.insert`, an index past the end is clamped to the end rather than raising an error.

Inserting at the front moves all 1,000 items, the middle 501 (the array had grown by one), and the end none: insert is O(n − index), which is O(n) in the worst case. This is the cost behind `list.insert(0, x)` and `list.pop(0)`. (This `insert` returns the move count purely for the demonstration; `list.insert` returns `None`.)

## Testing against the real thing

A data structure has many ways to go wrong: off-by-one errors at the edges, stale slots, resizing that loses an item. A powerful test applies the **same random sequence of operations** to your structure and to Python's list, and checks that they always agree. Python's list is the oracle, the obviously-correct version from the first lesson.

```python type
import random

random.seed(0)
mine, reference = DynamicArray(), []
for step in range(5000):
    choice = random.random()
    if choice < 0.5:
        value = random.randint(0, 99)
        mine.append(value)
        reference.append(value)
    elif choice < 0.8 and len(reference) > 0:
        index = random.randint(-len(reference), len(reference) - 1)
        value = random.randint(0, 99)
        mine[index] = value
        reference[index] = value
    else:
        index = random.randint(-len(reference) - 2, len(reference) + 2)
        value = random.randint(0, 99)
        mine.insert(index, value)
        reference.insert(index, value)
    assert list(mine) == reference and len(mine) == len(reference), f"mismatch at step {step}"
print(f"5000 random operations, always matching Python's list; final length {len(mine)}, capacity {mine._capacity}")
```

```output
5000 random operations, always matching Python's list; final length 3516, capacity 4096
```

The insert indices deliberately include positions beyond both ends, where list's clamping behaviour is easy to get wrong. After every operation the whole contents are compared, so a bug would be caught at the first step where it shows, with the step number to reproduce it.

::: challenge Pop, with shrinking [easy]
Add a method `pop(self)` to `DynamicArray` that removes and returns the last item, raising `IndexError` if the array is empty. After removing, if the size is at most a quarter of the capacity and the capacity is more than 1, halve the capacity with `self._resize(self._capacity // 2)`. Also set the vacated slot to `None`, so the block does not keep a reference to the removed object.

```python starter
def pop(self):
    return None

DynamicArray.pop = pop

a = DynamicArray()
for i in range(8):
    a.append(i)
print(a.pop(), a, a._capacity)
```

```python solution
def pop(self):
    if self._size == 0:
        raise IndexError("pop from empty array")
    self._size -= 1
    value = self._block[self._size]
    self._block[self._size] = None
    if self._capacity > 1 and self._size <= self._capacity // 4:
        self._resize(self._capacity // 2)
    return value

DynamicArray.pop = pop

a = DynamicArray()
for i in range(8):
    a.append(i)
print(a.pop(), a, a._capacity)
```

```python test
_a = DynamicArray()
for _i in range(8):
    _a.append(_i)
assert _a.pop() == 7 and len(_a) == 7, "pop should return the last item (7) and reduce the length to 7."
assert _a._block[7] is None, "Set the vacated slot back to None."
assert _a._capacity == 8, "With 7 of 8 slots used, the capacity should stay 8."
for _ in range(5):
    _a.pop()
assert len(_a) == 2 and _a._capacity == 4, f"After popping down to 2 items (a quarter of 8), the capacity should halve to 4; it is {_a._capacity}."
assert list(_a) == [0, 1], "The remaining items should be [0, 1]."
_a.pop(); _a.pop()
assert len(_a) == 0 and _a._capacity >= 1, "Popping everything should leave an empty array with capacity at least 1."
try:
    _a.pop()
    assert False, "Popping an empty array should raise IndexError."
except IndexError:
    pass
_b = DynamicArray()
for _i in range(1000):
    _b.append(_i)
_out = [_b.pop() for _ in range(1000)]
assert _out == list(range(999, -1, -1)) and _b._capacity <= 2, "Popping 1,000 items should return them in reverse and shrink the capacity right down."
"SUCCESS: pop is O(1) amortised in both directions: doubling on the way up, halving at a quarter full on the way down."
```

Hint: Check for empty first. Decrease `_size`, read `_block[_size]`, set that slot to `None`. Then, if `_capacity > 1` and `_size <= _capacity // 4`, resize to half. Return the value.
:::

::: challenge Delete at an index [medium]
Add `__delitem__(self, index)` so that `del a[i]` removes the item at position i (negative indices allowed, `IndexError` if out of range, using `_check_index`). Every later item must shift one slot **left**, in the right order so nothing is overwritten; clear the last slot that was vacated, and decrease the size. You don't need to shrink.

Then check it: apply 3,000 random appends and deletions (deletion at a random valid index when the array is not empty) to a `DynamicArray` and a Python list, store `True` in `matches` if they always agreed.

```python starter
import random

def __delitem__(self, index):
    pass

DynamicArray.__delitem__ = __delitem__

matches = False
a = DynamicArray()
for v in "abcde":
    a.append(v)
del a[1]
print(a, matches)
```

```python solution
import random

def __delitem__(self, index):
    index = self._check_index(index)
    for i in range(index, self._size - 1):
        self._block[i] = self._block[i + 1]
    self._block[self._size - 1] = None
    self._size -= 1

DynamicArray.__delitem__ = __delitem__

random.seed(5)
mine, reference = DynamicArray(), []
matches = True
for _ in range(3000):
    if reference and random.random() < 0.4:
        index = random.randint(-len(reference), len(reference) - 1)
        del mine[index]
        del reference[index]
    else:
        value = random.randint(0, 9)
        mine.append(value)
        reference.append(value)
    if list(mine) != reference:
        matches = False

a = DynamicArray()
for v in "abcde":
    a.append(v)
del a[1]
print(a, matches)
```

```python test
_a = DynamicArray()
for _v in "abcde":
    _a.append(_v)
del _a[1]
assert list(_a) == ["a", "c", "d", "e"], f"Deleting index 1 from a, b, c, d, e should leave a, c, d, e; got {list(_a)}."
assert _a._block[4] is None, "Clear the slot vacated at the end (it would otherwise still refer to 'e')."
del _a[-1]
assert list(_a) == ["a", "c", "d"], "del a[-1] should remove the last item."
del _a[0]
assert list(_a) == ["c", "d"], "del a[0] should remove the first item."
for _bad in [2, -3]:
    try:
        del _a[_bad]
        assert False, f"del a[{_bad}] on a 2-item array should raise IndexError."
    except IndexError:
        pass
assert list(_a) == ["c", "d"], "A failed deletion must leave the array unchanged."
import random as _random
_rr = _random.Random(12); _m2, _l2 = DynamicArray(), []
for _ in range(1500):
    if _l2 and _rr.random() < 0.4:
        _ix = _rr.randint(-len(_l2), len(_l2) - 1); del _m2[_ix]; del _l2[_ix]
    else:
        _v = _rr.randint(0, 9); _m2.append(_v); _l2.append(_v)
    assert list(_m2) == _l2, "After random appends and deletions, your array differs from a Python list."
assert matches is True, "Set matches to True after checking random appends and deletions against a Python list (they should agree)."
"SUCCESS: Deletion shifts the tail left, mirroring insert: O(n − index), so del a[0] costs O(n) just as for a list."
```

Hint: Use `index = self._check_index(index)` first (it raises for bad indices before anything changes). Then copy `_block[i + 1]` into `_block[i]` for i from `index` up to `_size - 2`, set `_block[_size - 1] = None`, and decrease `_size`.
:::

## What you learned

- A dynamic array is a fixed block plus a size and a capacity; only the resize method replaces the block, and doubling keeps appends amortised O(1).
- `__len__`, `__getitem__` and `__setitem__` give an object list-like syntax; checking bounds against the size (not the capacity) prevents reading stale slots, and the `IndexError` also ends Python's fallback iteration.
- Appending and popping at the end are O(1) amortised; inserting or deleting at position i shifts every later item, O(n − i).
- Testing a structure against Python's own list on thousands of random operations, including edge positions, catches the off-by-one bugs that hand-picked tests miss.

The next lesson builds the alternative design: a linked list, where inserting at the front is O(1) but indexing is not.
