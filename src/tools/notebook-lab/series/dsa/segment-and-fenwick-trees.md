# Segment trees and Fenwick trees

A shop records each day's sales in a list. Managers ask questions like "what were total sales from day 120 to day 250?" and, at the same time, corrections keep arriving: "day 173 was actually 40 more". Two simple approaches each fail at one of the two jobs:

- Keep the plain list: an update is O(1), but a range sum adds up every day in the range, O(n).
- Keep **prefix sums** (running totals): a range sum is one subtraction, O(1), but an update changes every running total after that day, O(n).

With many queries **and** many updates, both are O(n) per operation somewhere. The structures in this lesson make **both** operations O(log n), by storing sums of carefully chosen blocks in a tree. They are the standard tools for range questions over changing data, used in databases, games (leaderboards) and competitive programming. This lesson covers:

- the problem, and the two simple approaches with their costs;
- the **segment tree**: a complete binary tree of block sums, stored in a list of size 2n;
- making it work for other operations, such as minimum and maximum;
- the **Fenwick tree** (binary indexed tree): a smaller, cleverer structure for sums.

## The two simple approaches

**Prefix sums** store, at position i, the sum of the first i values; then the sum of values from position lo up to (not including) hi is `prefix[hi] - prefix[lo]`. Predict before running: if 1 operation in 10 is an update, which approach wins on 2,000 values and 2,000 operations?

```python type
import random
import timeit

random.seed(0)
n = 2_000
sales = [random.randint(0, 100) for _ in range(n)]
operations = []
for _ in range(2_000):
    if random.random() < 0.1:
        operations.append(("update", random.randrange(n), random.randint(-20, 20)))
    else:
        lo = random.randrange(n)
        operations.append(("query", lo, random.randint(lo + 1, n)))

def plain_list(values, ops):
    a, answers = list(values), []
    for op, x, y in ops:
        if op == "update":
            a[x] += y
        else:
            answers.append(sum(a[x:y]))
    return answers

def prefix_sums(values, ops):
    prefix = [0]
    for v in values:
        prefix.append(prefix[-1] + v)
    answers = []
    for op, x, y in ops:
        if op == "update":
            for k in range(x + 1, len(prefix)):
                prefix[k] += y
        else:
            answers.append(prefix[y] - prefix[x])
    return answers

assert plain_list(sales, operations) == prefix_sums(sales, operations)
for f in [plain_list, prefix_sums]:
    print(f"{f.__name__:<12} {timeit.timeit(lambda: f(sales, operations), number=1) * 1000:7.1f} ms")
```

Ranges are half-open, `[lo, hi)`, as in Python slicing: `sum(a[x:y])` adds positions x up to y − 1.

Here the plain list is faster: its sums run in fast compiled code (`sum` over a slice), while every prefix-sum update is a Python loop over up to 2,000 entries. Change the mix and the winner changes. Neither is good at both, and the next structure is.

## The segment tree

A segment tree is a complete binary tree whose **leaves** are the values and whose every **internal node** holds the sum of its two children: so each node holds the sum of a contiguous block of the array. Stored in a list of size 2n (with n a power of two, padded with zeros), the leaves sit at positions n to 2n − 1, and node i has children 2i and 2i + 1: the same arithmetic as the heap layout, shifted to start at 1.

- **Update** position p: change its leaf, then walk up to the root, recomputing each parent as the sum of its children. That is log₂ n nodes.
- **Query** `[lo, hi)`: start with lo and hi at the leaf level and move both upwards. Whenever lo is a **right** child, its block is entirely inside the range but its parent's is not, so add it and step past it; similarly when hi's left neighbour is a left child. At most two nodes per level are added: O(log n).

Predict before running: how many tree nodes does a query over almost the whole array of 1,024 values add up?

```python type
class SegmentTree:
    def __init__(self, values):
        size = 1
        while size < len(values):
            size *= 2
        self.n = size
        self.tree = [0] * (2 * size)
        self.tree[size:size + len(values)] = values
        for i in range(size - 1, 0, -1):
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]

    def update(self, position, new_value):
        i = position + self.n
        self.tree[i] = new_value
        i //= 2
        while i >= 1:
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]
            i //= 2

    def query(self, lo, hi):
        total, used = 0, 0
        lo += self.n
        hi += self.n
        while lo < hi:
            if lo % 2 == 1:
                total += self.tree[lo]; lo += 1; used += 1
            if hi % 2 == 1:
                hi -= 1; total += self.tree[hi]; used += 1
            lo //= 2
            hi //= 2
        return total, used

values = list(range(1, 1025))
st = SegmentTree(values)
for lo, hi in [(0, 1024), (1, 1023), (100, 900), (500, 501)]:
    total, used = st.query(lo, hi)
    print(f"sum of [{lo}, {hi}): {total:>7,} (check {sum(values[lo:hi]):>7,}) from {used} tree nodes")
st.update(0, 1000)
print("after setting position 0 to 1000, total:", st.query(0, 1024)[0])
```

```output
sum of [0, 1024): 524,800 (check 524,800) from 1 tree nodes
sum of [1, 1023): 523,775 (check 523,775) from 18 tree nodes
sum of [100, 900): 400,400 (check 400,400) from 8 tree nodes
sum of [500, 501):     501 (check     501) from 1 tree nodes
after setting position 0 to 1000, total: 525799
```

Building the tree fills the leaves, then computes every internal node from the bottom up, O(n). `update` here **sets** a value; adding to a value is `update(p, current + delta)`.

The whole array is the root alone: 1 node. Dropping one value from each end needs 18 nodes, two per level at most, because the range no longer lines up with big blocks. A single position is 1 leaf. Every answer matches `sum`, and every operation touches O(log n) nodes: for a million values, about 20 for an update and at most about 40 for a query.

## Other operations

Nothing in the segment tree is specific to addition. Any operation that combines two blocks into one works, as long as it is **associative** (the grouping doesn't matter): minimum, maximum, greatest common divisor, product. Replace `+` with that operation and 0 with its **identity** (the value that changes nothing: infinity for minimum, minus infinity for maximum). The first challenge builds a range-maximum tree this way. A range **minimum** tree answers "what was the lowest temperature between day 30 and day 60?" under updates in O(log n), which prefix sums cannot do at all: there is no subtraction for minimums.

## The Fenwick tree

For sums specifically, a **Fenwick tree** (or binary indexed tree) does the same job in a list of only n + 1 numbers, with even shorter code. It stores, at position i (counting from 1), the sum of a block that **ends** at i and whose length is the **lowest set bit** of i, written `i & -i`: position 12 (binary 1100) holds a block of length 4, positions 9 to 12; position 7 (binary 111) a block of length 1.

- A **prefix sum** of the first i values adds the blocks ending at i, then at i minus its block length, and so on: `i -= i & -i` strips the lowest set bit each time, so at most log₂ n steps.
- An **update** at position i adds to every block that covers it: `i += i & -i` moves to the next one, again at most log₂ n steps.

The bit trick `i & -i` works because, in binary, −i is formed by flipping every bit of i and adding 1, which leaves exactly the lowest set bit in common. Predict before running: which positions does a prefix sum up to 13 visit, and which does an update at 5 visit, for n = 16?

```python type
class Fenwick:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)

    def add(self, i, delta, trace=False):
        path = []
        while i <= self.n:
            self.tree[i] += delta
            path.append(i)
            i += i & -i
        if trace:
            print("  update visits", path)

    def prefix_sum(self, i, trace=False):
        total, path = 0, []
        while i > 0:
            total += self.tree[i]
            path.append(i)
            i -= i & -i
        if trace:
            print("  prefix sum visits", path)
        return total

for i in [12, 7, 13, 5, 16]:
    print(f"i = {i:>2} = {i:05b} in binary: lowest set bit {i & -i}, so position {i} covers {i - (i & -i) + 1}..{i}")
f = Fenwick(16)
for pos in range(1, 17):
    f.add(pos, pos)
print("sum of 1..13 =", f.prefix_sum(13, trace=True))
f.add(5, 100, trace=True)
print("after adding 100 at position 5, sum of 1..13 =", f.prefix_sum(13))
```

```output
i = 12 = 01100 in binary: lowest set bit 4, so position 12 covers 9..12
i =  7 = 00111 in binary: lowest set bit 1, so position 7 covers 7..7
i = 13 = 01101 in binary: lowest set bit 1, so position 13 covers 13..13
i =  5 = 00101 in binary: lowest set bit 1, so position 5 covers 5..5
i = 16 = 10000 in binary: lowest set bit 16, so position 16 covers 1..16
  prefix sum visits [13, 12, 8]
sum of 1..13 = 91
  update visits [5, 6, 8, 16]
after adding 100 at position 5, sum of 1..13 = 191
```

`f"{i:05b}"` formats a number in binary, padded to 5 digits.

The prefix sum up to 13 (binary 1101) visits 13, 12 and 8: blocks 13..13, 9..12 and 1..8, which together cover 1..13 exactly, one block per set bit of 13. The update at 5 visits 5, 6, 8 and 16: every block whose range includes position 5. Both are O(log n), and the whole structure is one list and two short loops. The range sum `[lo, hi]` is `prefix_sum(hi) - prefix_sum(lo - 1)`, which the second challenge wraps up.

Segment trees are the more flexible of the two (any associative operation, and extensions such as updating whole ranges at once); Fenwick trees are smaller and faster for sums and counts.

::: challenge Range maximum [easy]
Write a class `MaxSegmentTree` like the lesson's `SegmentTree`, but where each internal node holds the **maximum** of its children, and `query(lo, hi)` returns just the maximum of positions `[lo, hi)` (not a pair). Pad unused leaves with `float("-inf")`, the identity for maximum, and start the query's result there too. Include `update(position, new_value)`.

```python starter
class MaxSegmentTree:
    def __init__(self, values):
        pass

    def update(self, position, new_value):
        pass

    def query(self, lo, hi):
        return 0

temps = [12, 15, 9, 21, 18, 7, 25, 14, 11]
mt = MaxSegmentTree(temps)
print(mt.query(0, 9), mt.query(1, 5), mt.query(7, 9))
```

```python solution
class MaxSegmentTree:
    def __init__(self, values):
        size = 1
        while size < len(values):
            size *= 2
        self.n = size
        self.tree = [float("-inf")] * (2 * size)
        self.tree[size:size + len(values)] = values
        for i in range(size - 1, 0, -1):
            self.tree[i] = max(self.tree[2 * i], self.tree[2 * i + 1])

    def update(self, position, new_value):
        i = position + self.n
        self.tree[i] = new_value
        i //= 2
        while i >= 1:
            self.tree[i] = max(self.tree[2 * i], self.tree[2 * i + 1])
            i //= 2

    def query(self, lo, hi):
        best = float("-inf")
        lo += self.n
        hi += self.n
        while lo < hi:
            if lo % 2 == 1:
                best = max(best, self.tree[lo]); lo += 1
            if hi % 2 == 1:
                hi -= 1; best = max(best, self.tree[hi])
            lo //= 2
            hi //= 2
        return best

temps = [12, 15, 9, 21, 18, 7, 25, 14, 11]
mt = MaxSegmentTree(temps)
print(mt.query(0, 9), mt.query(1, 5), mt.query(7, 9))
```

```python test
import random as _random
assert "MaxSegmentTree" in dir(), "Keep the class name MaxSegmentTree."
_t = MaxSegmentTree([12, 15, 9, 21, 18, 7, 25, 14, 11])
assert (_t.query(0, 9), _t.query(1, 5), _t.query(7, 9), _t.query(5, 6)) == (25, 21, 14, 7), "Wrong maxima on the temperature example."
_t.update(6, 0)
assert _t.query(0, 9) == 21, "After lowering position 6 from 25 to 0, the overall maximum is 21."
_neg = MaxSegmentTree([-5, -3, -9])
assert _neg.query(0, 3) == -3, "Negative values: the padding must not win (use -infinity, not 0)."
_r = _random.Random(1)
_vals = [_r.randint(-50, 50) for _ in range(37)]; _m = MaxSegmentTree(_vals)
for _ in range(500):
    if _r.random() < 0.3:
        _p = _r.randrange(37); _v = _r.randint(-50, 50); _vals[_p] = _v; _m.update(_p, _v)
    else:
        _lo = _r.randrange(37); _hi = _r.randint(_lo + 1, 37)
        assert _m.query(_lo, _hi) == max(_vals[_lo:_hi]), f"query({_lo}, {_hi}) should be {max(_vals[_lo:_hi])}."
"SUCCESS: Swap + for max and 0 for −infinity and the same tree answers range maxima under updates: something prefix sums cannot do at all."
```

Hint: Copy `SegmentTree`, replacing each `a + b` of children with `max(a, b)`, the zero padding with `float("-inf")`, and the running total with a running best that starts at `float("-inf")`.
:::

::: challenge Range sums with a Fenwick tree [medium]
Write a class `RangeSum` that wraps the lesson's `Fenwick` for a list of values indexed **from 0**: the constructor takes the initial list, `add(index, delta)` adds to one value, `set(index, value)` replaces one value, and `range_sum(lo, hi)` returns the sum of indices `lo` up to and including `hi`. Remember that `Fenwick` counts positions from 1, and keep your own copy of the current values so that `set` can compute the delta.

```python starter
class RangeSum:
    def __init__(self, values):
        pass

    def add(self, index, delta):
        pass

    def set(self, index, value):
        pass

    def range_sum(self, lo, hi):
        return 0

rs = RangeSum([5, 3, 7, 9, 6, 4, 1, 2])
print(rs.range_sum(2, 5))
rs.set(3, 0)
print(rs.range_sum(2, 5))
```

```python solution
class RangeSum:
    def __init__(self, values):
        self.values = list(values)
        self.fenwick = Fenwick(len(values))
        for i, v in enumerate(values):
            self.fenwick.add(i + 1, v)

    def add(self, index, delta):
        self.values[index] += delta
        self.fenwick.add(index + 1, delta)

    def set(self, index, value):
        self.add(index, value - self.values[index])

    def range_sum(self, lo, hi):
        return self.fenwick.prefix_sum(hi + 1) - self.fenwick.prefix_sum(lo)

rs = RangeSum([5, 3, 7, 9, 6, 4, 1, 2])
print(rs.range_sum(2, 5))
rs.set(3, 0)
print(rs.range_sum(2, 5))
```

```python test
import random as _random
assert "RangeSum" in dir(), "Keep the class name RangeSum."
_rs = RangeSum([5, 3, 7, 9, 6, 4, 1, 2])
assert _rs.range_sum(2, 5) == 26 and _rs.range_sum(0, 0) == 5 and _rs.range_sum(0, 7) == 37, "Sums of indices 2..5, 0..0 and 0..7 should be 26, 5 and 37."
_rs.set(3, 0)
assert _rs.range_sum(2, 5) == 17, "After setting index 3 to 0, indices 2..5 sum to 17."
_rs.add(7, 10)
assert _rs.range_sum(6, 7) == 13, "After adding 10 at index 7, indices 6..7 sum to 13."
_r = _random.Random(3); _vals = [_r.randint(-9, 9) for _ in range(50)]; _x = RangeSum(_vals)
for _ in range(1000):
    _c = _r.random()
    if _c < 0.2:
        _i = _r.randrange(50); _d = _r.randint(-5, 5); _vals[_i] += _d; _x.add(_i, _d)
    elif _c < 0.4:
        _i = _r.randrange(50); _v = _r.randint(-9, 9); _vals[_i] = _v; _x.set(_i, _v)
    else:
        _lo = _r.randrange(50); _hi = _r.randint(_lo, 49)
        assert _x.range_sum(_lo, _hi) == sum(_vals[_lo:_hi + 1]), f"range_sum({_lo}, {_hi}) should be {sum(_vals[_lo:_hi + 1])}."
"SUCCESS: Two prefix sums give any range, and each touches about log₂ n blocks. Translating between 0-based indices and the tree's 1-based positions is the only fiddly part."
```

Hint: Store `self.values` and a `Fenwick(len(values))`, adding each value at position `i + 1`. `range_sum(lo, hi)` is `prefix_sum(hi + 1) - prefix_sum(lo)`. `set` adds the difference between the new and current value.
:::

::: challenge Smaller numbers to the right [medium]
For each position in a list of whole numbers from 0 to `max_value`, count how many numbers **after** it are smaller. Write `smaller_to_the_right(nums, max_value)` in O(n log(max_value)) with a `Fenwick` tree over the **values**: walk the list from right to left; for each number x, the answer is how many already-seen numbers are below x, which is the prefix sum of counts for values 0 to x − 1; then record x by adding 1 at its value. (Use value v at Fenwick position v + 1.)

```python starter
def smaller_to_the_right(nums, max_value):
    return [0] * len(nums)

print(smaller_to_the_right([5, 2, 6, 1, 3], 6))
```

```python solution
def smaller_to_the_right(nums, max_value):
    seen = Fenwick(max_value + 1)
    result = [0] * len(nums)
    for i in range(len(nums) - 1, -1, -1):
        x = nums[i]
        result[i] = seen.prefix_sum(x)
        seen.add(x + 1, 1)
    return result

print(smaller_to_the_right([5, 2, 6, 1, 3], 6))
```

```python test
import random as _random, time as _time
assert "smaller_to_the_right" in dir(), "Keep the function's name as smaller_to_the_right."
assert smaller_to_the_right([5, 2, 6, 1, 3], 6) == [3, 1, 2, 0, 0], f"Expected [3, 1, 2, 0, 0], got {smaller_to_the_right([5, 2, 6, 1, 3], 6)}."
assert smaller_to_the_right([], 5) == [] and smaller_to_the_right([3, 3, 3], 3) == [0, 0, 0], "Equal values are not smaller."
_r = _random.Random(4)
for _ in range(200):
    _xs = [_r.randint(0, 20) for _ in range(_r.randint(0, 15))]
    _want = [sum(1 for y in _xs[i + 1:] if y < _xs[i]) for i in range(len(_xs))]
    assert smaller_to_the_right(_xs, 20) == _want, f"Wrong answer for {_xs}."
assert "Fenwick(" in _source, "Use a Fenwick tree over the values."
_big = [_r.randint(0, 10_000) for _ in range(3_000)]
_start = _time.perf_counter(); _res = smaller_to_the_right(_big, 10_000); _el = _time.perf_counter() - _start
assert _el < 1.0, f"3,000 numbers took {_el:.1f} s: use the Fenwick tree, not a scan of the rest of the list for each number."
f"SUCCESS: Summed up, these counts are the list's inversions ({sum(_res):,} for 3,000 random numbers), found in O(n log m) instead of O(n²)."
```

Hint: Create `Fenwick(max_value + 1)`. Loop i from the end: `result[i] = seen.prefix_sum(x)` counts seen values at positions 1..x, which are values 0..x − 1; then `seen.add(x + 1, 1)`.
:::

## What you learned

- Plain lists make range sums O(n); prefix sums make updates O(n). Segment and Fenwick trees make both O(log n).
- A segment tree stores block sums in a complete binary tree of size 2n; updates walk up one path, and a range query adds at most two nodes per level.
- Any associative operation with an identity works in a segment tree: minimum, maximum, gcd, product.
- A Fenwick tree stores, at position i, a block of length `i & -i`; prefix sums strip the lowest set bit and updates add it, both O(log n) in a list of n + 1 numbers. Over values instead of positions, it counts things like inversions.

That completes the trees. The next part of the series moves to graphs, starting with how to represent them.
