# Profiling and optimisation

When a program is too slow, the tempting move is to start rewriting whatever looks expensive. That is usually wasted work. Programs tend to spend most of their time in a small part of the code, and that part is rarely the one programmers guess. The discipline is simple to state: **measure first**, find where the time actually goes, fix that part, and measure again to confirm the fix worked. Everything else stays as readable as it was.

This lesson covers:

- timing code properly with `timeit` and `time.perf_counter`;
- **profiling** with `cProfile` to find where the time goes;
- the biggest wins: better algorithms and data structures, then avoiding repeated work;
- smaller wins: Python-level tricks, and moving loops into NumPy;
- how much any single fix can help (Amdahl's law), and when to stop.

## Timing, properly

`time.perf_counter()` around a block gives a quick timing, but a single run is noisy: other programs, caches and memory allocation all vary. `timeit` runs a statement many times and reports the total, and taking the **best** of several repeats filters out interference. Compare alternatives on the same input, in the same way. Predict before running: how much faster is checking membership in a set than in a list of 20,000 items?

```python type
import timeit, random

rng = random.Random(1)
part_numbers = [f"P{rng.randint(100000, 999999)}" for _ in range(20_000)]
as_list, as_set = part_numbers, set(part_numbers)
lookups = [f"P{rng.randint(100000, 999999)}" for _ in range(500)]

def best_of(statement, repeat=5, number=1):
    return min(timeit.repeat(statement, repeat=repeat, number=number))

t_list = best_of(lambda: sum(p in as_list for p in lookups))
t_set = best_of(lambda: sum(p in as_set for p in lookups))
print(f"500 lookups: list {t_list * 1000:.1f} ms, set {t_set * 1000:.3f} ms, about {t_list / t_set:,.0f} times faster")
```

`timeit.repeat` returns one total per repeat; `min` keeps the fastest, which is the least disturbed by anything else happening at the time.

The set is thousands of times faster here: each list lookup scans up to 20,000 items, while a set lookup goes straight to its hash slot, as the hash tables lesson showed. No amount of tuning the list version could close a gap that size. The data structure was the problem.

## Profiling: where does the time go?

Timing tells you **how long**. A **profiler** tells you **where**. `cProfile` records every function call while code runs: how many times each function was called, the time spent inside it (`tottime`), and the time including everything it called (`cumtime`). `pstats` sorts and prints the results. Here is a stock report that is slower than it should be. Predict before reading the profile: which function takes most of the time?

```python type
import cProfile, pstats, io

suppliers = [{"id": f"S{i}", "name": f"Supplier {i}"} for i in range(400)]
orders = [{"part": f"P{i}", "supplier": f"S{rng.randrange(400)}", "qty": rng.randint(1, 50), "price": rng.uniform(1, 90)} for i in range(6000)]

def supplier_name(supplier_id):
    for s in suppliers:
        if s["id"] == supplier_id:
            return s["name"]

def line_text(order):
    return f"{order['part']:<8}{supplier_name(order['supplier']):<14}{order['qty']:>4} @ {order['price']:7.2f}"

def stock_report(orders):
    report = ""
    for order in sorted(orders, key=lambda o: o["price"] * o["qty"], reverse=True):
        report += line_text(order) + "\n"
    return report

profiler = cProfile.Profile()
profiler.enable()
stock_report(orders)
profiler.disable()
out = io.StringIO()
pstats.Stats(profiler, stream=out).sort_stats("cumulative").print_stats(6)
print("\n".join(line for line in out.getvalue().splitlines() if line.strip())[:1200])
```

`print_stats(6)` limits the listing to the top 6 entries. `sort_stats("cumulative")` puts first the functions with the most time spent in them and in everything they call.

The profile points straight at `supplier_name`: it is called 6,000 times, and each call scans the supplier list. Formatting, sorting and string building, the things that look busy, take a small share. Without the profile, a natural guess would be the string concatenation. Fixing that would barely have helped.

## Fix the algorithm first

The biggest wins come from doing less work, not from doing the same work faster. Build a dictionary once, so each supplier lookup is a single step. While here, also replace repeated `+=` on a string with collecting lines and joining once. Then measure again, and check that the output is unchanged: an optimisation that changes the answer is a bug. Predict before running: how much of the speed-up comes from each change?

```python type
def stock_report_fast(orders):
    names = {s["id"]: s["name"] for s in suppliers}
    lines = []
    for o in sorted(orders, key=lambda o: o["price"] * o["qty"], reverse=True):
        lines.append(f"{o['part']:<8}{names[o['supplier']]:<14}{o['qty']:>4} @ {o['price']:7.2f}")
    return "\n".join(lines) + "\n"

def stock_report_dict_only(orders):
    names = {s["id"]: s["name"] for s in suppliers}
    report = ""
    for o in sorted(orders, key=lambda o: o["price"] * o["qty"], reverse=True):
        report += f"{o['part']:<8}{names[o['supplier']]:<14}{o['qty']:>4} @ {o['price']:7.2f}\n"
    return report

assert stock_report_fast(orders) == stock_report(orders) == stock_report_dict_only(orders)
t_slow = best_of(lambda: stock_report(orders), repeat=3)
t_dict = best_of(lambda: stock_report_dict_only(orders), repeat=3)
t_fast = best_of(lambda: stock_report_fast(orders), repeat=3)
print(f"original {t_slow * 1000:.0f} ms, dict lookup {t_dict * 1000:.0f} ms, dict + join {t_fast * 1000:.0f} ms")
```

The `assert` compares the outputs before any timing, so the faster versions are known to give exactly the same report.

The dictionary does almost all of the work. Joining instead of `+=` makes little difference here, because CPython is good at growing a string in place when nothing else refers to it. That is exactly why guessing is unreliable. The lesson's order of attack holds in general:

1. a better **algorithm or data structure** (an O(n²) scan becomes O(n));
2. **avoiding repeated work**: compute once outside the loop, cache results (`functools.cache`), stop early;
3. **constant factors**: built-ins and comprehensions instead of hand-written loops, fewer function calls in the hottest loop, local names instead of global or attribute lookups.

## Vectorising numeric work

For numeric loops, the largest constant-factor win is to move the loop out of Python entirely: NumPy runs whole-array operations in compiled code. Distances between many points are a typical case. Predict before running: how much faster is the NumPy version for 600 points?

```python type
import numpy as np, math

points = [(rng.uniform(0, 100), rng.uniform(0, 100)) for _ in range(600)]

def nearest_neighbour_loops(points):
    result = []
    for i, p in enumerate(points):
        best = math.inf
        for j, q in enumerate(points):
            if i != j:
                best = min(best, math.dist(p, q))
        result.append(best)
    return result

def nearest_neighbour_numpy(points):
    xy = np.array(points)
    diff = xy[:, None, :] - xy[None, :, :]
    d = np.sqrt((diff ** 2).sum(axis=2))
    np.fill_diagonal(d, np.inf)
    return d.min(axis=1)

slow, fast = nearest_neighbour_loops(points), nearest_neighbour_numpy(points)
print("same answers:", np.allclose(slow, fast))
t_loops = best_of(lambda: nearest_neighbour_loops(points), repeat=2)
t_numpy = best_of(lambda: nearest_neighbour_numpy(points), repeat=3)
print(f"loops {t_loops:.2f} s, NumPy {t_numpy * 1000:.1f} ms, about {t_loops / t_numpy:.0f} times faster")
```

`xy[:, None, :] - xy[None, :, :]` uses broadcasting (from the machine learning series) to subtract every point from every other point at once, giving a 600 × 600 × 2 array of differences.

Both compute 360,000 distances. NumPy does them in compiled loops and is several times faster here; the gap is larger when the Python version does more interpreted work per element, and smaller when, as here, NumPy must build large temporary arrays (600 × 600 × 2 differences). It is still O(n²): vectorising speeds up each step, but does not change how the work grows. For many thousands of points, a better **algorithm** (a spatial grid or a k-d tree, which `scipy.spatial` provides) wins again.

## How much can a fix help?

**Amdahl's law** puts a ceiling on any single optimisation. If a part of the program takes a fraction p of the total time and you make it s times faster, the whole program becomes `1 / ((1 − p) + p / s)` times faster. Making a part that takes 10% of the time infinitely fast saves at most 10%. That is the formal reason for profiling first: only a part with a large share of the time is worth much effort.

And know when to stop. Faster code is often longer, harder to read and harder to change. Optimise until the program is fast **enough** for its purpose, keep the slow, simple version as an oracle for tests (as the testing lesson suggested), and comment the fast version with why it is written that way.

::: challenge Amdahl's law [easy]
Write `overall_speedup(fraction, factor)`, returning how many times faster a whole program becomes when a part taking `fraction` of its run time (between 0 and 1) is made `factor` times faster, using Amdahl's law: `1 / ((1 - fraction) + fraction / factor)`. Raise `ValueError` if `fraction` is outside 0 to 1 or `factor` is not positive. Then write `best_target(parts, factor)`: `parts` is a dict from part name to fraction of run time, and the function returns the name of the part whose speeding-up by `factor` would give the largest overall speed-up (the first in the dict on a tie).

```python starter
def overall_speedup(fraction, factor):
    return factor

print(overall_speedup(0.1, 1000))
```

```python solution
def overall_speedup(fraction, factor):
    if not 0 <= fraction <= 1 or factor <= 0:
        raise ValueError("fraction must be in [0, 1] and factor positive")
    return 1 / ((1 - fraction) + fraction / factor)

def best_target(parts, factor):
    return max(parts, key=lambda name: overall_speedup(parts[name], factor))

print(round(overall_speedup(0.1, 1000), 3), best_target({"parse": 0.15, "lookup": 0.7, "format": 0.15}, 10))
```

```python test
for _n in ["overall_speedup", "best_target"]:
    assert _n in dir(), f"Define {_n}."
assert abs(overall_speedup(0.1, 1000) - 1.11) < 0.001, "Making 10% of the time 1,000 times faster saves barely 10%."
assert abs(overall_speedup(0.9, 10) - 1 / (0.1 + 0.09)) < 1e-9 and overall_speedup(1, 4) == 4 and overall_speedup(0, 50) == 1, "Check the formula, including the ends."
assert overall_speedup(0.5, 1) == 1, "A factor of 1 changes nothing."
for _bad in [(-0.1, 2), (1.1, 2), (0.5, 0), (0.5, -3)]:
    try:
        overall_speedup(*_bad)
        assert False, f"overall_speedup{_bad} should raise ValueError."
    except ValueError:
        pass
assert best_target({"parse": 0.15, "lookup": 0.7, "format": 0.15}, 10) == "lookup", "The biggest share gives the biggest win."
assert best_target({"a": 0.3, "b": 0.3}, 5) == "a", "On a tie, the first part."
"SUCCESS: Amdahl's law shows why profiling comes first: speeding up a small share of the time can never save much."
```

Hint: Check the inputs first, then return the formula. `best_target` is `max` over the dict's keys with a `key` that computes each part's overall speed-up; `max` keeps the first of equal values.
:::

::: challenge Fix the hot spot [medium]
`slow_summary(readings, sensors)` below works but is far too slow for a day's data. Profile it in your head (or with `cProfile`), then write `fast_summary(readings, sensors)` returning **exactly** the same result much faster. `readings` is a list of `(sensor_id, value)` pairs and `sensors` a list of dicts with `"id"` and `"zone"`. The result maps each zone to `(count, mean value rounded to 3 places, max value)` for the readings in that zone, ignoring readings from sensors not in the list, and sorted by zone name.

```python starter
def slow_summary(readings, sensors):
    zones = sorted(set(s["zone"] for s in sensors))
    result = {}
    for zone in zones:
        values = []
        for sensor_id, value in readings:
            for s in sensors:
                if s["id"] == sensor_id and s["zone"] == zone:
                    values.append(value)
        if values:
            result[zone] = (len(values), round(sum(values) / len(values), 3), max(values))
    return result

def fast_summary(readings, sensors):
    return slow_summary(readings, sensors)

print(fast_summary([("a", 1.0), ("b", 3.0), ("a", 2.0)], [{"id": "a", "zone": "north"}, {"id": "b", "zone": "south"}]))
```

```python solution
def slow_summary(readings, sensors):
    zones = sorted(set(s["zone"] for s in sensors))
    result = {}
    for zone in zones:
        values = []
        for sensor_id, value in readings:
            for s in sensors:
                if s["id"] == sensor_id and s["zone"] == zone:
                    values.append(value)
        if values:
            result[zone] = (len(values), round(sum(values) / len(values), 3), max(values))
    return result

def fast_summary(readings, sensors):
    zone_of = {}
    for s in sensors:
        zone_of.setdefault(s["id"], []).append(s["zone"])
    grouped = {}
    for sensor_id, value in readings:
        for zone in zone_of.get(sensor_id, ()):
            grouped.setdefault(zone, []).append(value)
    return {zone: (len(v), round(sum(v) / len(v), 3), max(v)) for zone, v in sorted(grouped.items())}

print(fast_summary([("a", 1.0), ("b", 3.0), ("a", 2.0)], [{"id": "a", "zone": "north"}, {"id": "b", "zone": "south"}]))
```

```python test
import random as _random, time as _time
assert "fast_summary" in dir(), "Keep the function's name as fast_summary."
_rng = _random.Random(12)
for _ in range(60):
    _sensors = [{"id": f"s{_i}", "zone": _rng.choice(["north", "south", "east"])} for _i in range(_rng.randint(0, 6))]
    _readings = [(f"s{_rng.randint(0, 8)}", round(_rng.uniform(-5, 40), 2)) for _ in range(_rng.randint(0, 30))]
    _want = slow_summary(_readings, _sensors)
    _got = fast_summary(_readings, _sensors)
    assert _got == _want and list(_got) == list(_want), f"fast_summary must give exactly slow_summary's result, in zone order; for {_readings[:4]}... expected {_want}, got {_got}."
_sensors = [{"id": f"s{_i}", "zone": f"zone{_i % 12:02d}"} for _i in range(300)]
_readings = [(f"s{_rng.randrange(330)}", _rng.uniform(10, 90)) for _ in range(400)]
_start = _time.perf_counter(); _r = fast_summary(_readings, _sensors); _el = _time.perf_counter() - _start
assert _r == slow_summary(_readings, _sensors), "Same answer on the medium case."
assert _el < 0.05, f"400 readings and 300 sensors took {_el:.2f} s: look each sensor up in a dict built once, and group in a single pass."
_readings = [(f"s{_rng.randrange(330)}", _rng.uniform(10, 90)) for _ in range(200_000)]
_start = _time.perf_counter(); fast_summary(_readings, _sensors); _el = _time.perf_counter() - _start
assert _el < 5, f"200,000 readings took {_el:.1f} s: one pass over the readings, with constant-time lookups."
"SUCCESS: The same summary, but each reading is looked up once in a dictionary instead of scanned against every sensor for every zone."
```

Hint: The slow version loops over zones × readings × sensors. Build a dict from sensor id to its zone (or zones, if an id appears twice) once, then make a single pass over the readings, appending each value to its zone's list. Finally build the result in sorted zone order.
:::

::: challenge Vectorise a moving window [hard]
A vibration monitor computes, for a signal of `n` samples, the **root-mean-square** (RMS) of every window of `w` consecutive samples: `sqrt(mean(x²))` over the window. That gives `n - w + 1` values. The pure-Python version below recomputes each window from scratch, costing O(n·w). Write `rms_windows_fast(signal, w)` with NumPy, returning a NumPy array with the same values (within `1e-9`), using a **running sum** of squares: compute `np.cumsum` of the squared signal once (with a 0 in front), and get each window's sum as a difference of two cumulative sums. Raise `ValueError` if `w` is not between 1 and `len(signal)`.

```python starter
import numpy as np, math

def rms_windows_slow(signal, w):
    return [math.sqrt(sum(x * x for x in signal[i:i + w]) / w) for i in range(len(signal) - w + 1)]

def rms_windows_fast(signal, w):
    return np.array(rms_windows_slow(signal, w))

print(rms_windows_fast([3.0, 4.0, 0.0, 5.0], 2))
```

```python solution
import numpy as np, math

def rms_windows_slow(signal, w):
    return [math.sqrt(sum(x * x for x in signal[i:i + w]) / w) for i in range(len(signal) - w + 1)]

def rms_windows_fast(signal, w):
    x = np.asarray(signal, dtype=float)
    if not 1 <= w <= len(x):
        raise ValueError("window must be between 1 and the signal length")
    sums = np.concatenate(([0.0], np.cumsum(x * x)))
    window_sums = sums[w:] - sums[:-w]
    return np.sqrt(np.maximum(window_sums, 0) / w)

print(rms_windows_fast([3.0, 4.0, 0.0, 5.0], 2))
```

```python test
import numpy as _np, random as _random, time as _time
assert "rms_windows_fast" in dir(), "Keep the function's name as rms_windows_fast."
_r = rms_windows_fast([3.0, 4.0, 0.0, 5.0], 2)
assert isinstance(_r, _np.ndarray) and _np.allclose(_r, [_np.sqrt(12.5), _np.sqrt(8), _np.sqrt(12.5)]), f"Got {_r}."
_rng = _random.Random(13)
for _ in range(40):
    _sig = [_rng.uniform(-2, 2) for _ in range(_rng.randint(1, 50))]
    _w = _rng.randint(1, len(_sig))
    assert _np.allclose(rms_windows_fast(_sig, _w), rms_windows_slow(_sig, _w), atol=1e-9), f"Wrong values for a window of {_w} over {len(_sig)} samples."
assert _np.allclose(rms_windows_fast([2.0, -2.0], 2), [2.0]) and len(rms_windows_fast([1.0] * 5, 1)) == 5, "Edge cases: one window, and windows of one sample."
for _bad in [0, 6, -1]:
    try:
        rms_windows_fast([1.0] * 5, _bad)
        assert False, f"A window of {_bad} over 5 samples should raise ValueError."
    except ValueError:
        pass
_mid = _np.random.default_rng(1).normal(size=20_000)
_start = _time.perf_counter(); rms_windows_fast(_mid, 200); _el = _time.perf_counter() - _start
assert _el < 0.5, f"20,000 samples with 200-sample windows took {_el:.2f} s: recomputing every window is O(n·w); use a cumulative sum."
_t = _np.linspace(0, 10, 200_000)
_sig = _np.sin(2 * _np.pi * 50 * _t) + 0.1 * _np.sin(2 * _np.pi * 400 * _t)
_start = _time.perf_counter(); _out = rms_windows_fast(_sig, 2_000); _el = _time.perf_counter() - _start
assert _out.shape == (198_001,) and abs(_out.mean() - _np.sqrt(0.5 + 0.005)) < 0.01, "The RMS of the test signal should be about 0.71."
assert _el < 0.5, f"200,000 samples with 2,000-sample windows took {_el:.2f} s: use a cumulative sum, not a sum per window."
"SUCCESS: A running sum turns an O(n·w) job into O(n), and NumPy does the O(n) part in compiled code: 198,001 windows in a fraction of a second."
```

Hint: Square the signal, take `np.cumsum`, and put a `0.0` in front with `np.concatenate`. The sum of window i is `sums[i + w] - sums[i]`, which for all windows at once is `sums[w:] - sums[:-w]`. Divide by `w` and take the square root. (Tiny negative values from rounding can appear, and `np.maximum(..., 0)` guards against them.)
:::

## What you learned

- Measure before optimising, and measure again after. Use `timeit` with the best of several repeats, and compare alternatives on the same input.
- `cProfile` and `pstats` show where time is spent, by calls and cumulative time. The hot spot is usually one place, and rarely the one you would guess.
- Fix the algorithm or data structure first (a list scan becomes a dict lookup), then avoid repeated work, then constant factors. Check that the optimised version gives exactly the same answers.
- NumPy moves numeric loops into compiled code. Running sums (`cumsum`) turn window computations from O(n·w) into O(n).
- Amdahl's law: speeding up a part that takes a fraction p of the time can never make the whole more than 1 / (1 − p) times faster. Stop when the program is fast enough, and keep the simple version as a test oracle.

The next lessons are projects that combine data structures, algorithms and design, starting with an LRU cache: a hash table and a linked list behind a clean interface.
