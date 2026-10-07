# Bit manipulation

Every integer is stored as a row of bits, and Python lets a program work on those bits directly. That sounds like a low-level curiosity, but it gives three practical things. A handful of yes/no **flags** can be packed into one number. A **set** of small integers can become one integer, with union and intersection each a single operation. And a few classic **tricks** answer questions like "is this a power of two?" or "which item appears an odd number of times?" in constant time and memory. The Fenwick tree and the bitmask DP lessons already used some of this; here it gets a proper foundation.

This lesson covers:

- reading integers in binary, and the six bitwise operators;
- flags and masks: packing, testing, setting and clearing bits;
- tricks with the lowest set bit, and stepping through all subsets of a mask;
- XOR, the operator that cancels pairs;
- bitsets: one large integer used as a fast set, applied to the subset-sum problem.

## Integers in binary

Bit i of an integer stands for 2 to the power i, counting from 0 on the right. `bin(n)` shows the bits, `int(text, 2)` reads them back, and `n.bit_count()` counts the 1s. Python integers have no fixed width: they grow as needed, so bit 1,000 is as easy to use as bit 3.

The operators work bit by bit. `a & b` (and) keeps a 1 where **both** have one, `a | b` (or) where **either** has one, and `a ^ b` (exclusive or, **XOR**) where **exactly one** has one. `a << k` shifts every bit k places left, multiplying by 2ᵏ; `a >> k` shifts right, dividing by 2ᵏ and dropping the remainder. `~a` flips every bit. Because Python integers are unbounded, it is defined as −a − 1 rather than as a fixed-width pattern. Predict before running: what are `12 & 10`, `12 | 10` and `12 ^ 10`?

```python type
a, b = 12, 10
print(f"a      = {a:>3}  {a:08b}")
print(f"b      = {b:>3}  {b:08b}")
for name, value in [("a & b", a & b), ("a | b", a | b), ("a ^ b", a ^ b), ("a << 2", a << 2), ("a >> 2", a >> 2)]:
    print(f"{name:<6} = {value:>3}  {value:08b}")
print("~a =", ~a, " (that is -a - 1)")
print("bits set in 2025:", bin(2025), "->", (2025).bit_count(), "ones;  int('11111101001', 2) =", int("11111101001", 2))
```

```output
a      =  12  00001100
b      =  10  00001010
a & b  =   8  00001000
a | b  =  14  00001110
a ^ b  =   6  00000110
a << 2 =  48  00110000
a >> 2 =   3  00000011
~a = -13  (that is -a - 1)
bits set in 2025: 0b11111101001 -> 8 ones;  int('11111101001', 2) = 2025
```

The format `{a:08b}` prints a number in binary, padded with zeros to 8 digits.

`12` is `1100` and `10` is `1010`. They share only bit 3, so `12 & 10` is 8. Together they cover bits 1, 2 and 3, so `12 | 10` is 14. Bits 1 and 2 differ, so `12 ^ 10` is 6. Shifting left by 2 multiplies by 4 (48); shifting right by 2 divides by 4 (3).

## Flags and masks

Unix file permissions are a famous use of bits. Each file has a read, write and execute permission for its owner, its group and everyone else: nine yes/no flags, stored as nine bits of one number. A **mask** is a number with 1s exactly at the bits of interest. Four moves cover almost everything:

- test a flag: `value & FLAG` is non-zero;
- set it: `value | FLAG`;
- clear it: `value & ~FLAG` (and with everything **except** the flag);
- toggle it: `value ^ FLAG`.

Masks combine with `|`, so `OWNER_READ | OWNER_WRITE` is one mask holding two flags. Predict before running: what does `rwxr-xr-x` look like as a number, and what is left after removing every write permission?

```python type
OWNER_READ, OWNER_WRITE, OWNER_EXEC = 0o400, 0o200, 0o100
GROUP_READ, GROUP_WRITE, GROUP_EXEC = 0o040, 0o020, 0o010
OTHER_READ, OTHER_WRITE, OTHER_EXEC = 0o004, 0o002, 0o001
ALL_WRITE = OWNER_WRITE | GROUP_WRITE | OTHER_WRITE

def show(mode):
    letters = "rwxrwxrwx"
    return "".join(letters[i] if mode & (1 << (8 - i)) else "-" for i in range(9))

mode = OWNER_READ | OWNER_WRITE | OWNER_EXEC | GROUP_READ | GROUP_EXEC | OTHER_READ | OTHER_EXEC
print(show(mode), oct(mode), bin(mode))
print("can the group write?", bool(mode & GROUP_WRITE))
print("read-only for everyone:", show(mode & ~ALL_WRITE), oct(mode & ~ALL_WRITE))
print("let the group write:   ", show(mode | GROUP_WRITE), oct(mode | GROUP_WRITE))
print("toggle other exec:     ", show(mode ^ OTHER_EXEC), oct(mode ^ OTHER_EXEC))
```

```output
rwxr-xr-x 0o755 0b111101101
can the group write? False
read-only for everyone: r-xr-xr-x 0o555
let the group write:    rwxrwxr-x 0o775
toggle other exec:      rwxr-xr-- 0o754
```

`0o755` is an **octal** literal (base 8). Each octal digit is exactly three bits, which is why permissions are written in octal: one digit per owner, group and others.

`rwxr-xr-x` is 0o755, the familiar `chmod 755`. Clearing all write bits leaves 0o555. Nine flags fit in one integer, and testing any of them is one `&`.

## The lowest set bit

Subtracting 1 from a number flips its lowest set bit to 0 and every 0 below it to 1: 12 (`1100`) minus 1 is 11 (`1011`). So `x & (x - 1)` is x with its lowest set bit **cleared**. Two classic uses follow:

- x is a power of two exactly when it has one set bit, that is, when `x > 0 and x & (x - 1) == 0`;
- clearing the lowest bit repeatedly, counting the steps, counts the 1s in as many steps as there are 1s (**Kernighan's** method).

The Fenwick tree lesson used the partner trick: `x & -x` **isolates** the lowest set bit.

The same idea steps through every **subset** of a mask. Starting from `sub = mask`, the line `sub = (sub - 1) & mask` produces the next smaller subset: subtracting 1 borrows from the lowest set bit, and `& mask` throws away any bits outside the mask. This visits all 2ᵏ subsets of a mask with k bits, and nothing else, which bitmask DP uses constantly. Predict before running: how many subsets does the mask `0b10110` have?

```python type
def is_power_of_two(x):
    return x > 0 and x & (x - 1) == 0

def count_ones(x):
    steps = 0
    while x:
        x &= x - 1
        steps += 1
    return steps

print([x for x in range(1, 70) if is_power_of_two(x)])
print("ones in 2025:", count_ones(2025), "  lowest set bit of 2024:", 2024 & -2024)

mask = 0b10110
subsets, sub = [], mask
while True:
    subsets.append(f"{sub:05b}")
    if sub == 0:
        break
    sub = (sub - 1) & mask
print(len(subsets), "subsets of", f"{mask:05b}:", subsets)
```

```output
[1, 2, 4, 8, 16, 32, 64]
ones in 2025: 8   lowest set bit of 2024: 8
8 subsets of 10110: ['10110', '10100', '10010', '10000', '00110', '00100', '00010', '00000']
```

The mask has three set bits, so it has 2³ = 8 subsets, from itself down to 0, each produced in O(1). Looping over 0 to `mask` and testing each number instead would visit 23 numbers here, and far more for a wide, sparse mask.

## XOR cancels pairs

XOR has two properties that make it unusually useful: `x ^ x == 0` and `x ^ 0 == x`, and the order of XORs does not matter. So XOR-ing a list of numbers cancels every value that appears an **even** number of times, and leaves the XOR of the values appearing an odd number of times. If every value appears twice except one, the XOR of the whole list **is** that one value. That takes one pass and one integer of memory, where counting would need a dictionary. Predict before running: which ticket number is missing its pair?

```python type
from functools import reduce
import operator, random

tickets = [4021, 7730, 1288, 4021, 9013, 1288, 7730]
print("unpaired ticket:", reduce(operator.xor, tickets))

rng = random.Random(1)
values = rng.sample(range(10**6), 50_000)
missing = values.pop(rng.randrange(len(values)))
received = values[:] + values[:]
received.append(missing)
rng.shuffle(received)
found = 0
for v in received:
    found ^= v
print("among", len(received), "numbers the unpaired one is", found, "->", found == missing)
```

```output
unpaired ticket: 9013
among 99999 numbers the unpaired one is 171160 -> True
```

`reduce(operator.xor, tickets)` XORs the list together from left to right.

9013 is the only ticket without a partner. The same cancellation is behind **parity** bits and the simple checksums used to detect a corrupted byte: XOR all the data together, and a single flipped bit changes the result.

## Bitsets: a large integer as a fast set

Because Python integers can be any width, one integer can stand for a set of whole numbers from 0 up to millions: bit v is 1 when v is in the set. `|` is union and `&` is intersection, both processed many bits at a time inside the interpreter, so they are far faster than looping over a Python `set`.

The **subset-sum** question shows the payoff: which totals can be made by choosing some of these weights, each at most once? Keep a bitset `reachable` whose bit t is 1 when total t is possible. Start with only bit 0 (the empty choice). For each weight w, every reachable total t also makes t + w reachable. Shifting the whole bitset left by w moves every bit t to t + w in one operation, so `reachable |= reachable << w` handles one weight. Predict before running: how much faster is the bitset than the same idea with a Python set?

```python type
import time

def reachable_with_set(weights, limit):
    reachable = {0}
    for w in weights:
        reachable |= {t + w for t in reachable if t + w <= limit}
    return reachable

def reachable_with_bits(weights, limit):
    reachable = 1
    keep = (1 << (limit + 1)) - 1
    for w in weights:
        reachable = (reachable | (reachable << w)) & keep
    return reachable

rng = random.Random(2)
weights = [rng.randint(100, 2000) for _ in range(80)]
limit = 20_000

start = time.perf_counter(); as_set = reachable_with_set(weights, limit); t_set = time.perf_counter() - start
start = time.perf_counter(); as_bits = reachable_with_bits(weights, limit); t_bits = time.perf_counter() - start
print(f"set:    {len(as_set):,} totals reachable in {t_set * 1000:.0f} ms")
print(f"bitset: {as_bits.bit_count():,} totals reachable in {t_bits * 1000:.1f} ms")
print("same totals:", as_set == {t for t in range(limit + 1) if as_bits >> t & 1})
print("is 12,345 reachable?", bool(as_bits >> 12345 & 1))
```

`keep` is a mask of `limit + 1` ones; `& keep` drops totals above the limit so the integer stays bounded.

Both find the same set of reachable totals, but the bitset does each weight's work with one shift, one or and one and. Each of those processes the whole 20,001-bit integer in machine-sized chunks, inside fast C code, instead of one Python step per total. The speed-up is typically a hundredfold or more. The idea scales: bitsets are how fast implementations handle sieves, graph reachability and set-heavy dynamic programming.

::: challenge The lonely sensor [easy]
A factory's sensors each report twice per cycle, so every sensor ID appears exactly twice in the log, except one faulty sensor that reported only once. Write `faulty_sensor(log)` returning that ID. Use XOR so the function needs only one running integer: no dictionaries, sets, `Counter` or sorting.

```python starter
def faulty_sensor(log):
    return 0

print(faulty_sensor([31, 7, 12, 7, 31]))
```

```python solution
def faulty_sensor(log):
    result = 0
    for sensor in log:
        result ^= sensor
    return result

print(faulty_sensor([31, 7, 12, 7, 31]))
```

```python test
import random as _random
assert "faulty_sensor" in dir(), "Keep the function's name as faulty_sensor."
assert faulty_sensor([31, 7, 12, 7, 31]) == 12, "31 and 7 appear twice; 12 appears once."
assert faulty_sensor([5]) == 5, "A log with one entry: that sensor is the faulty one."
assert faulty_sensor([0, 9, 9]) == 0, "Sensor 0 can be the faulty one too."
_rng = _random.Random(11)
for _ in range(100):
    _ids = _rng.sample(range(1, 10**9), _rng.randint(1, 60))
    _odd = _ids.pop()
    _log = _ids + _ids + [_odd]
    _rng.shuffle(_log)
    assert faulty_sensor(_log) == _odd, f"Expected {_odd} for a log of {len(_log)} entries."
_code = _source.replace(" ", "")
for _banned in ["dict(", "set(", "Counter", "sort", "{}", ".count("]:
    assert _banned not in _code, f"Solve it with XOR and one running value, without {_banned.strip('(')}."
assert "^" in _source, "Use the XOR operator ^."
"SUCCESS: Every pair cancels to 0 under XOR, so only the unpaired ID survives: one pass, one integer of memory."
```

Hint: Start `result = 0` and do `result ^= sensor` for every entry. Pairs cancel, because `x ^ x == 0`, and the order does not matter.
:::

::: challenge Possible loads [medium]
A crane can lift any combination of the crates on the dock, each at most once. Write `possible_loads(weights, limit)` returning a sorted list of every total weight from 0 to `limit` that some combination of crates adds up to exactly. Use a bitset: one integer whose bit t means "total t is possible", updated with a shift for each crate. A Python set of totals, or a list of True/False values, will be too slow on the largest test.

```python starter
def possible_loads(weights, limit):
    return []

print(possible_loads([3, 5, 9], 20))
```

```python solution
def possible_loads(weights, limit):
    reachable = 1
    keep = (1 << (limit + 1)) - 1
    for w in weights:
        reachable = (reachable | (reachable << w)) & keep
    bits = bin(reachable)[2:][::-1]
    return [t for t, bit in enumerate(bits) if bit == "1"]

print(possible_loads([3, 5, 9], 20))
```

```python test
import itertools as _it, random as _random, time as _time
assert "possible_loads" in dir(), "Keep the function's name as possible_loads."
assert possible_loads([3, 5, 9], 20) == [0, 3, 5, 8, 9, 12, 14, 17], f"From 3, 5 and 9: 0, 3, 5, 8, 9, 12, 14, 17; got {possible_loads([3, 5, 9], 20)}."
assert possible_loads([], 10) == [0] and possible_loads([4], 3) == [0], "No crates, or crates too heavy: only the empty load, 0."
assert possible_loads([2, 2, 2], 10) == [0, 2, 4, 6], "Each crate at most once: three 2s reach 6, not more."
_rng = _random.Random(12)
for _ in range(100):
    _ws = [_rng.randint(1, 15) for _ in range(_rng.randint(0, 8))]
    _lim = _rng.randint(0, 50)
    _want = sorted({sum(_c) for _k in range(len(_ws) + 1) for _c in _it.combinations(_ws, _k) if sum(_c) <= _lim})
    assert possible_loads(_ws, _lim) == _want, f"For crates {_ws} and limit {_lim}: expected {_want}."
_ws = [_rng.randint(50, 900) for _ in range(150)]
_start = _time.perf_counter(); _got = possible_loads(_ws, 100_000); _el = _time.perf_counter() - _start
_bits = 1
for _w in _ws:
    _bits = (_bits | (_bits << _w)) & ((1 << 100_001) - 1)
assert _got == [_t for _t, _b in enumerate(bin(_bits)[2:][::-1]) if _b == "1"], "The large test's totals are wrong."
assert _el < 0.5, f"150 crates with a limit of 100,000 took {_el:.1f} s. A set or list does up to 15 million Python steps; a bitset does 150 shifts."
"SUCCESS: One shift per crate moves every possible total up by its weight at once: 150 integer operations instead of millions of Python steps."
```

Hint: `reachable = 1` means only total 0 is possible. For each weight w: `reachable = (reachable | (reachable << w)) & keep`, where `keep = (1 << (limit + 1)) - 1`. To read the answer out, either test `reachable >> t & 1` for every t, or (simpler and quicker) take `bin(reachable)[2:]`, the bits as text with the most significant first, reverse it, and list the positions holding `"1"`.
:::

::: challenge The smallest crew [hard]
A job needs a list of skills, and each available worker has some of them. Write `smallest_crew(required, workers)` returning a list of indices into `workers` for a crew whose skills together cover every required skill, using as **few** workers as possible. `required` is a list of skill names (at most 12) and `workers` a list of sets of skill names. If no crew can cover the skills, return `None`; if nothing is required, return `[]`. Turn each worker's skills into a bitmask over the required skills. Then let `best[mask]` be the smallest crew found so far whose combined skills are exactly `mask`. Grow it worker by worker: adding a worker to a crew changes the mask to `mask | worker_mask`.

```python starter
def smallest_crew(required, workers):
    return None

required = ["weld", "wire", "plumb", "paint"]
workers = [{"weld"}, {"wire", "plumb"}, {"weld", "paint"}, {"paint", "plumb"}]
print(smallest_crew(required, workers))
```

```python solution
def smallest_crew(required, workers):
    index = {skill: i for i, skill in enumerate(required)}
    full = (1 << len(required)) - 1
    masks = []
    for skills in workers:
        m = 0
        for s in skills:
            if s in index:
                m |= 1 << index[s]
        masks.append(m)
    best = {0: []}
    for w, wm in enumerate(masks):
        if wm == 0:
            continue
        for mask, crew in list(best.items()):
            new = mask | wm
            if new not in best or len(crew) + 1 < len(best[new]):
                best[new] = crew + [w]
    return best.get(full)

required = ["weld", "wire", "plumb", "paint"]
workers = [{"weld"}, {"wire", "plumb"}, {"weld", "paint"}, {"paint", "plumb"}]
print(smallest_crew(required, workers))
```

```python test
import itertools as _it, random as _random, time as _time
assert "smallest_crew" in dir(), "Keep the function's name as smallest_crew."
def _smallest_size(_req, _ws):
    for _k in range(len(_ws) + 1):
        for _c in _it.combinations(range(len(_ws)), _k):
            if set(_req) <= set().union(*(_ws[_i] for _i in _c)):
                return _k
    return None
def _check(_req, _ws):
    _r = smallest_crew(list(_req), [set(_w) for _w in _ws])
    _want = _smallest_size(_req, _ws)
    if _want is None:
        assert _r is None, f"No crew covers {_req} with workers {_ws}: return None. Got {_r}."
        return
    assert isinstance(_r, list) and all(isinstance(_i, int) and 0 <= _i < len(_ws) for _i in _r), f"Return a list of worker indices; got {_r!r}."
    assert len(set(_r)) == len(_r), f"Each worker can be in the crew once; got {_r}."
    _covered = set().union(*(_ws[_i] for _i in _r)) if _r else set()
    assert set(_req) <= _covered, f"Crew {_r} misses skills {sorted(set(_req) - _covered)}."
    assert len(_r) == _want, f"Crew {_r} has {len(_r)} workers, but {_want} can cover {_req}."
_check(["weld", "wire", "plumb", "paint"], [{"weld"}, {"wire", "plumb"}, {"weld", "paint"}, {"paint", "plumb"}])
_check([], [{"weld"}]); _check(["weld"], [{"wire"}]); _check(["a", "b"], [{"a", "b", "c"}])
_skills = [f"s{_i}" for _i in range(8)]
_rng = _random.Random(13)
for _ in range(100):
    _req = _rng.sample(_skills, _rng.randint(1, 6))
    _ws = [set(_rng.sample(_skills, _rng.randint(0, 3))) for _ in range(_rng.randint(1, 9))]
    _check(_req, _ws)
_skills = [f"t{_i}" for _i in range(12)]
_ws = [{_s} for _s in _skills] + [{_rng.choice(_skills)} for _ in range(8)]
_rng.shuffle(_ws)
_start = _time.perf_counter(); _r = smallest_crew(_skills, _ws); _el = _time.perf_counter() - _start
assert _r is not None and len(_r) == 12 and set(_skills) <= set().union(*(_ws[_i] for _i in _r)), "20 one-skill workers covering 12 skills: the smallest crew has 12."
assert _el < 0.3, f"20 workers took {_el:.1f} s. Trying crews of every size means hundreds of thousands of crews; there are only 4,096 skill masks, so keep the best crew for each."
def _opt_size(_req, _ws):
    _idx = {_s: _i for _i, _s in enumerate(_req)}
    _ms = [sum(1 << _idx[_s] for _s in _w if _s in _idx) for _w in _ws]
    _size = {0: 0}
    for _m in _ms:
        for _k, _v in list(_size.items()):
            if _size.get(_k | _m, 99) > _v + 1:
                _size[_k | _m] = _v + 1
    return _size.get((1 << len(_req)) - 1)
_ws = [set(_rng.sample(_skills, _rng.randint(1, 3))) for _ in range(60)]
_start = _time.perf_counter(); _r = smallest_crew(_skills, _ws); _el = _time.perf_counter() - _start
assert _r is not None and set(_skills) <= set().union(*(_ws[_i] for _i in _r)), "The large crew must cover all 12 skills."
assert len(_r) == _opt_size(_skills, _ws), f"A crew of {len(_r)} is not the smallest: {_opt_size(_skills, _ws)} workers can cover all 12 skills."
assert _el < 2, f"60 workers and 12 skills took {_el:.1f} s. There are only 4,096 skill masks; grow a table of the best crew for each."
"SUCCESS: Skills became bits, a crew's skills became the OR of its workers' masks, and a table over the 4,096 possible masks found the smallest crew."
```

Hint: Map each required skill to a bit position. A worker's mask ORs together the bits of the skills they have (ignore skills not required). Start with `best = {0: []}`. For each worker, loop over a **copy** of the current entries, `list(best.items())`, and offer `crew + [w]` to `best[mask | worker_mask]` when it is new or smaller. The answer is `best.get(full)`, with `full = (1 << len(required)) - 1`.
:::

## What you learned

- An integer is a row of bits. `&`, `|` and `^` combine numbers bit by bit; `<<` and `>>` shift by powers of two; `~x` is −x − 1 in Python.
- Flags live in masks: test with `&`, set with `|`, clear with `& ~`, toggle with `^`. Unix permissions are nine flags in one number.
- `x & (x - 1)` clears the lowest set bit (powers of two, counting ones). `x & -x` isolates it. `sub = (sub - 1) & mask` steps through exactly the subsets of a mask.
- XOR cancels pairs, so the XOR of a list is the XOR of its values that appear an odd number of times.
- One large integer can be a set of small numbers, with whole-set operations done in fast machine-sized chunks. A shift per weight solves subset sum many times faster than a Python set.

The next lesson searches text: finding a pattern in a long string without comparing it from scratch at every position, using the KMP algorithm and rolling hashes.
