# Amortised analysis

The last lesson claimed that `append` is O(1), with a caveat: a list stores its items in a fixed block of memory, and when the block is full, appending means allocating a bigger block and **copying every item** across. That copy is O(n). So how can `append` be O(1)?

The answer is that the expensive copies are **rare**, and they get rarer as the list grows, so their cost spread over all the appends is a constant per append. Making that argument precise is **amortised analysis**: bounding the total cost of a whole **sequence** of operations, rather than the worst single operation. This lesson covers:

- watching a Python list grow in jumps;
- the **aggregate method**: add up the total cost of n operations and divide by n;
- why growing by a constant **factor** works and growing by a constant **amount** does not;
- the **accounting method**: charge each cheap operation a little extra to pay for the expensive ones;
- a trap when shrinking, and what "amortised" does and does not promise.

## Watching a list grow

`sys.getsizeof` reports how many bytes an object occupies. For a list, that includes the block of slots, so it reveals the list's **capacity**: how many items it has room for, as opposed to its length, how many it holds. Predict before running: as items are appended one at a time, does the capacity grow by one each time?

```python type
import struct
import sys

pointer_size = struct.calcsize("P")
empty_size = sys.getsizeof([])

def capacity(a):
    return (sys.getsizeof(a) - empty_size) // pointer_size

a = []
growth_points = []
for i in range(200):
    before = capacity(a)
    a.append(i)
    if capacity(a) != before:
        growth_points.append((len(a), capacity(a)))
print("(length when the list grew, new capacity):")
print(growth_points)
```

```output
(length when the list grew, new capacity):
[(1, 4), (5, 8), (9, 16), (17, 24), (25, 32), (33, 40), (41, 52), (53, 64), (65, 76), (77, 92), (93, 108), (109, 128), (129, 148), (149, 172), (173, 200)]
```

`struct.calcsize("P")` is the size of one slot (a memory address) on this computer, so the formula works whether addresses take 4 bytes (as here, in the browser) or 8 (on most desktops).

The capacity jumps: 4, 8, 16, 24, 32, 40, 52, 64, 76, 92, … Between jumps, appends just fill empty slots, O(1) each. At a jump, every item is copied to the new block. CPython grows the capacity to roughly 1.125 times the needed size plus a few slots, so the jumps get further apart as the list grows. (The exact numbers are an implementation detail and differ between Python versions; the growth by a **factor** is what matters.)

## The aggregate method

To see why this averages out, count the work in a simple model: each append writes one item (cost 1), and when the array is full it first doubles its capacity, copying all current items (cost equal to their number). The **aggregate method** adds up the total cost of n appends and divides by n.

With doubling from capacity 1, copies happen when the array holds 1, 2, 4, 8, … items. For n appends, the copies cost at most 1 + 2 + 4 + … + n/2 + n, which is less than 2n. Adding the n writes, the total is under 3n: an average of less than **3 per append**, whatever n is. That is what "amortised O(1)" means. Predict before running: if each growth added a fixed 100 slots instead of doubling, what would the average cost per append look like as n grows?

```python type
def total_cost(n, grow):
    capacity, size, cost, biggest = 1, 0, 0, 0
    for _ in range(n):
        if size == capacity:
            cost += size
            biggest = max(biggest, size)
            capacity = grow(capacity)
        size += 1
        cost += 1
    return cost, biggest

for n in [1_000, 10_000, 100_000]:
    doubling, worst_d = total_cost(n, lambda c: 2 * c)
    adding, worst_a = total_cost(n, lambda c: c + 100)
    print(f"n = {n:>7,}: doubling {doubling / n:5.2f} per append (worst single copy {worst_d:>6,});"
          f"  +100 slots {adding / n:6.1f} per append")
```

```output
n =   1,000: doubling  2.02 per append (worst single copy    512);  +100 slots    5.5 per append
n =  10,000: doubling  2.64 per append (worst single copy  8,192);  +100 slots   50.5 per append
n = 100,000: doubling  2.31 per append (worst single copy 65,536);  +100 slots  500.5 per append
```

`grow` is a function passed in to choose the growth rule, so the same simulation compares both strategies.

With doubling, the average stays below 3 whatever n is, even though a single append occasionally copies tens of thousands of items. Growing by a fixed 100 slots copies the whole array every 100 appends, about n/100 copies of average size n/2, so the total is about n²/200: the average per append grows **linearly** with n, and the whole sequence is O(n²). Any constant growth factor above 1 gives amortised O(1); CPython's modest factor of about 1.125 wastes less memory than doubling and copies a little more often, a trade-off between space and time.

## The accounting method

The aggregate method needs the total cost worked out exactly. The **accounting method** is often easier: charge every operation a fixed **amortised cost**, possibly more than it really costs, and keep the surplus as **credit** to pay for expensive operations later. If the credit never goes negative, the total real cost is at most the total charged.

For the doubling array, charge **3** per append. One unit pays for writing the item. The other two are saved. When the array doubles from capacity m to 2m, the m/2 items appended since the last doubling have each saved 2 units, m in total, exactly enough to copy all m items. So the bank never goes negative. Checking this claim numerically, with a charge of 3 and then 2:

```python type
def lowest_balance(n, charge):
    capacity, size, balance, lowest = 1, 0, 0, 0
    for _ in range(n):
        balance += charge
        if size == capacity:
            balance -= size
            capacity *= 2
        balance -= 1
        size += 1
        lowest = min(lowest, balance)
    return lowest

for charge in [3, 2]:
    print(f"charge {charge} per append: lowest bank balance over 100,000 appends = {lowest_balance(100_000, charge)}")
```

```output
charge 3 per append: lowest bank balance over 100,000 appends = 0
charge 2 per append: lowest bank balance over 100,000 appends = -65534
```

A charge of 3 keeps the balance at zero or above throughout. A charge of 2 falls behind at every doubling and the debt keeps growing. The accounting method turns "trust me, it averages out" into a check that each operation pays its way.

## A second example: the binary counter

Amortised analysis applies far beyond arrays. A binary counter stored as a list of bits increments by flipping trailing 1s to 0 and the next 0 to 1. Incrementing 0111 to 1000 flips four bits; incrementing 1000 to 1001 flips one. The worst single increment of a k-bit counter flips k bits. Predict before running: what is the **average** number of flips per increment over many increments?

```python type
def increment(bits):
    flips = 0
    i = 0
    while i < len(bits) and bits[i] == 1:
        bits[i] = 0
        flips += 1
        i += 1
    if i < len(bits):
        bits[i] = 1
        flips += 1
    return flips

bits = [0] * 20
flips = [increment(bits) for _ in range(100_000)]
print(f"worst single increment: {max(flips)} flips; average over 100,000 increments: {sum(flips) / len(flips):.4f}")
```

```output
worst single increment: 17 flips; average over 100,000 increments: 1.9999
```

The bits are stored lowest first: `bits[0]` is the 1s place, `bits[1]` the 2s place, and so on.

The worst increment flips 17 bits, but the average is just under 2. Aggregate argument: bit 0 flips on every increment, bit 1 on every second, bit 2 on every fourth, so n increments make at most n + n/2 + n/4 + … < 2n flips. Amortised O(1) per increment.

## Shrinking, and what amortised promises

A list that grows should arguably also shrink when most of it is emptied, to give memory back. The obvious rule, "halve the capacity when the array is half full", has a trap: sitting right at the boundary, an append doubles the array and a pop halves it again, and alternating appends and pops makes **every** operation copy the whole array. The standard fix is to shrink only when the array is a **quarter** full, so that after any resize, many cheap operations must happen before the next one. The challenge below measures both.

Finally, what "amortised O(1)" does and does not promise:

- It **is** a guarantee: any sequence of n appends costs O(n) in total. Nothing is assumed about the input or about luck, which makes it different from an **average-case** bound.
- It is **not** a bound on any single operation. One append can still cost O(n). For most programs that is irrelevant, but in a system that must respond within a deadline (a game frame, an audio buffer), an occasional long pause can matter, and structures with worst-case O(1) operations are used instead.

::: challenge Copies for any growth factor [easy]
Write `copies_needed(n, factor)` returning the total number of item copies made by n appends to an array that starts with capacity 1 and, whenever it is full, grows to `max(capacity + 1, int(capacity * factor))` (copying all current items first). Then store in `per_append` a dictionary mapping each factor in `[1.5, 2, 4]` to the copies per append for n = 100,000.

```python starter
def copies_needed(n, factor):
    return 0

per_append = {}
print(copies_needed(10, 2), per_append)
```

```python solution
def copies_needed(n, factor):
    capacity, size, copies = 1, 0, 0
    for _ in range(n):
        if size == capacity:
            copies += size
            capacity = max(capacity + 1, int(capacity * factor))
        size += 1
    return copies

per_append = {f: copies_needed(100_000, f) / 100_000 for f in [1.5, 2, 4]}
print(copies_needed(10, 2), per_append)
```

```python test
assert "copies_needed" in dir(), "Keep the function's name as copies_needed."
assert copies_needed(10, 2) == 15, f"With doubling, 10 appends copy at sizes 1, 2, 4 and 8: 15 copies. Got {copies_needed(10, 2)}."
assert copies_needed(1, 2) == 0 and copies_needed(0, 2) == 0, "One append fits in the starting capacity, so no copies."
assert copies_needed(5, 1.5) == 1 + 2 + 3 + 4, "With factor 1.5 from capacity 1: int(1.5) = 1, so the max(capacity + 1, …) rule grows it to 2, then 3, then 4, then 6. Five appends copy 1 + 2 + 3 + 4 items."
assert copies_needed(1000, 1.0) == 1000 * 999 // 2, "A factor of 1 falls back to growing by one slot, copying every time: 0 + 1 + … + 999."
assert sorted(per_append) == [1.5, 2, 4], "per_append should have keys 1.5, 2 and 4."
assert all(abs(per_append[_f] - copies_needed(100_000, _f) / 100_000) < 1e-9 for _f in per_append), "per_append[f] should be copies_needed(100_000, f) / 100_000."
assert per_append[4] < per_append[2] < per_append[1.5] < 3, "Bigger factors should copy less per append, all under 3."
f"SUCCESS: Copies per append: {', '.join(f'factor {k}: {v:.2f}' for k, v in per_append.items())}. A bigger factor copies less but leaves more empty slots: time traded for space."
```

Hint: Track capacity, size and copies. Before each append, if `size == capacity`, add `size` to the copies and grow the capacity with the given rule. Then add one to the size.
:::

::: challenge Thrashing at the boundary [medium]
Simulate an array that doubles when full and **halves** its capacity when, after a pop, its size falls to `capacity * shrink_fraction` or below (never below capacity 1). Every resize copies the current items. Write `copies_for_operations(operations, shrink_fraction)` where `operations` is a list of `"push"` and `"pop"` strings applied to an array that starts empty with capacity 1, returning the total copies.

Then build the sequence `boundary` from the lesson's trap: 1,024 pushes followed by 1,000 repetitions of push, pop, pop, push. Store the copies for `shrink_fraction` 0.5 and 0.25 in `thrash_half` and `thrash_quarter`.

```python starter
def copies_for_operations(operations, shrink_fraction):
    return 0

boundary = []
thrash_half = 0
thrash_quarter = 0
print(thrash_half, thrash_quarter)
```

```python solution
def copies_for_operations(operations, shrink_fraction):
    capacity, size, copies = 1, 0, 0
    for op in operations:
        if op == "push":
            if size == capacity:
                copies += size
                capacity *= 2
            size += 1
        else:
            size -= 1
            if capacity > 1 and size <= capacity * shrink_fraction:
                copies += size
                capacity //= 2
    return copies

boundary = ["push"] * 1024 + ["push", "pop", "pop", "push"] * 1000
thrash_half = copies_for_operations(boundary, 0.5)
thrash_quarter = copies_for_operations(boundary, 0.25)
print(thrash_half, thrash_quarter)
```

```python test
assert "copies_for_operations" in dir(), "Keep the function's name as copies_for_operations."
assert copies_for_operations(["push"] * 5, 0.25) == 1 + 2 + 4, "Five pushes copy at sizes 1, 2 and 4."
assert copies_for_operations(["push"] * 4 + ["pop"] * 3, 0.25) == 1 + 2 + 1, "Push 4 (copies 1 + 2, capacity 4), then pops: at size 1 = 4 × 0.25 the capacity halves to 2, copying 1 item."
assert copies_for_operations(["push"] * 4 + ["pop"] * 2, 0.5) == 1 + 2 + 2, "With 0.5: at size 2 = 4 × 0.5 the capacity halves, copying 2 items."
assert copies_for_operations(["push", "pop"], 0.5) == 0, "Capacity never drops below 1, so pushing and popping one item copies nothing."
assert len(boundary) == 1024 + 4000 and boundary[1024:1028] == ["push", "pop", "pop", "push"], "boundary should be 1,024 pushes followed by 1,000 repetitions of push, pop, pop, push."
assert thrash_half == copies_for_operations(boundary, 0.5) and thrash_quarter == copies_for_operations(boundary, 0.25), "Store the two results for the boundary sequence."
assert thrash_half > 100 * thrash_quarter, "Halving at half full should copy vastly more than halving at a quarter full."
f"SUCCESS: Shrinking at half full copies {thrash_half:,} items; at a quarter full, {thrash_quarter:,}. The gap between the grow and shrink points is what keeps every resize rare."
```

Hint: For a push, grow first if full (copy `size` items, double), then add one. For a pop, subtract one, then if `capacity > 1` and `size <= capacity * shrink_fraction`, copy `size` items and halve the capacity.
:::

## What you learned

- A Python list's capacity grows in jumps by a constant factor; each jump copies everything, but jumps get rarer as the list grows.
- The aggregate method totals the cost of n operations: with doubling, n appends cost under 3n, so append is amortised O(1). Growing by a fixed amount instead gives O(n²) in total.
- The accounting method charges each operation a fixed amount and banks the surplus; a charge of 3 per append pays for every doubling. The binary counter averages under 2 flips per increment by the same reasoning.
- Shrink at a quarter full, not half, or alternating operations at the boundary copy every time. Amortised bounds are guarantees for whole sequences, not for any single operation.

The next lesson builds a growable array class from scratch, using exactly this doubling strategy.
