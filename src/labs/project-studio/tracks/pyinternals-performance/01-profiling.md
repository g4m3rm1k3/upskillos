---
title: 1 — Finding the Slow Part: cProfile, line_profiler and perf
track: Making Python Fast: Profiling to Production
trackOrder: 14
runtime: cpp
console: true
---

Before you optimise a single line of code you must **measure**. Guessing which part of a program is slow is almost always wrong — and fixing the wrong part wastes time while the real bottleneck stays untouched. This lesson equips you with the full professional toolkit: `cProfile` for function-level timing, `pstats` for filtering results, `line_profiler` for per-line detail, `memory_profiler` for allocations, and `perf` + flame graphs for system-level insight.

The workflow is always the same:

1. Profile with a real workload
2. Find the hotspot
3. Optimise only the hotspot
4. Profile again to confirm the gain

Skipping step 1 is the most common performance mistake in data science.

---

## Step 1 — cProfile: profile a Python program from the command line

**This step:** run cProfile on an existing Python script without changing any source code.

Python ships with `cProfile`, a deterministic profiler that hooks every function call and records how long each one takes. Because it is built in, no install is needed.

```python
# slow_pipeline.py  — a deliberately slow data pipeline
import time, random, math

def load_data(n=500_000):
    return [random.random() for _ in range(n)]

def normalize(data):
    total = sum(data)
    return [x / total for x in data]   # Python loop — slow

def compute_entropy(probs):
    return -sum(p * math.log(p + 1e-12) for p in probs)

def run():
    data  = load_data()
    probs = normalize(data)
    h     = compute_entropy(probs)
    print(f"Entropy: {h:.4f}")

if __name__ == "__main__":
    run()
```

Run with cProfile directly from the terminal — **no code changes needed**:

```text
python -m cProfile -s cumulative slow_pipeline.py
```

The `-s cumulative` flag sorts by cumulative time (the most useful default). You will see a table listing every function called during the run.

```check
run "python -m cProfile -s cumulative slow_pipeline.py" stdout="ncalls"
run "python -m cProfile -s cumulative slow_pipeline.py" stdout="cumtime"
run "python -m cProfile -s cumulative slow_pipeline.py" stdout="Entropy:"
```

---

## Step 2 — Read cProfile output: cumtime, tottime, ncalls

**This step:** interpret what the three key cProfile columns mean and identify the dominant function.

The cProfile table has five important columns:

| Column | Meaning |
|---|---|
| `ncalls` | How many times the function was called |
| `tottime` | Time spent *inside* the function only (excluding callees) |
| `cumtime` | Time spent in the function **plus** all functions it calls |
| `percall` (tottime) | `tottime / ncalls` |
| `percall` (cumtime) | `cumtime / ncalls` |

**Rule of thumb:** sort by `cumtime` to find the expensive call chains; sort by `tottime` to find leaf functions that do real work.

Example output (abbreviated):

```text
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.001    0.001    2.341    2.341 slow_pipeline.py:1(<module>)
        1    0.000    0.000    2.340    2.340 slow_pipeline.py:14(run)
        1    0.512    0.512    1.623    1.623 slow_pipeline.py:9(compute_entropy)
        1    0.701    0.701    0.701    0.701 slow_pipeline.py:6(normalize)
   500000    0.110    0.000    0.110    0.000 {built-in method math.log}
```

In this example `compute_entropy` owns 1.6 s of the 2.3 s total — it is the hotspot. The 500 000 calls to `math.log` (one per element in the pure-Python generator) are responsible.

In C or C++ you would use `gprof` or `perf` in the same spirit:

```text
# C equivalent of cProfile
gcc -pg -O2 -o myapp myapp.c
./myapp
gprof myapp gmon.out | less
```

Python makes this automatic; C requires a recompile with `-pg`.

---

## Step 3 — pstats: sort and filter profile results

**This step:** save profile data to a file and explore it programmatically with `pstats`.

Running directly with `-m cProfile` floods the terminal. For larger programs, save to a binary file and query with `pstats`:

```python
# profile_runner.py
import cProfile, pstats, io

def main():
    pr = cProfile.Profile()
    pr.enable()

    # ── code under test ──────────────────────────────────
    from slow_pipeline import run
    run()
    # ─────────────────────────────────────────────────────

    pr.disable()

    stream = io.StringIO()
    ps = pstats.Stats(pr, stream=stream)

    # Sort by cumulative time, show top 15 functions
    ps.sort_stats("cumulative")
    ps.print_stats(15)

    print(stream.getvalue())

if __name__ == "__main__":
    main()
```

Useful `pstats` methods:

```python
ps.sort_stats("tottime")       # sort by self time
ps.sort_stats("ncalls")        # sort by call count
ps.print_stats("pipeline")     # filter to filenames matching "pipeline"
ps.print_callers("normalize")  # who called normalize?
ps.print_callees("run")        # what does run call?
ps.dump_stats("profile.prof")  # save for SnakeViz or other tools
```

You can also view `.prof` files in **SnakeViz** (a browser-based flame graph viewer):

```text
pip install snakeviz
python -m cProfile -o profile.prof slow_pipeline.py
snakeviz profile.prof
```

```check
run "python profile_runner.py" stdout="cumtime"
run "python profile_runner.py" stdout="Entropy:"
```

---

## Step 4 — line_profiler: per-line timing with @profile

**This step:** install `line_profiler` and decorate a function to get timing for every single line.

`cProfile` tells you *which function* is slow. `line_profiler` tells you *which line inside that function* is slow — essential when one function contains a mixture of fast and slow paths.

```text
pip install line_profiler
```

Add `@profile` to the function you want to inspect (no import needed — `kernprof` injects it):

```python
# slow_pipeline_lp.py
import math, random

def load_data(n=500_000):
    return [random.random() for _ in range(n)]

@profile
def compute_entropy(probs):
    result = 0.0
    for p in probs:                        # ← line_profiler shows this
        result -= p * math.log(p + 1e-12)  # ← and this individually
    return result

def run():
    data  = load_data()
    total = sum(data)
    probs = [x / total for x in data]
    h     = compute_entropy(probs)
    print(f"Entropy: {h:.4f}")

if __name__ == "__main__":
    run()
```

Run with `kernprof`:

```text
kernprof -l -v slow_pipeline_lp.py
```

Output (example):

```text
Line #  Hits        Time  Per Hit   % Time  Line Contents
==========================================================
     9       1       1.2      1.2      0.0      result = 0.0
    10  500001  312456.0      0.6     42.1      for p in probs:
    11  500000  429801.0      0.9     57.9          result -= p * math.log(p + 1e-12)
    12       1       0.5      0.5      0.0      return result
```

Now you know: 58 % of the function's time is the `math.log` call per element — a perfect target for NumPy vectorisation.

```check
file slow_pipeline_lp.py
contains slow_pipeline_lp.py "@profile"
contains slow_pipeline_lp.py "compute_entropy"
```

---

## Step 5 — memory_profiler: tracking allocations

**This step:** use `memory_profiler` to track RSS memory usage line-by-line.

Speed is only half the story — a data pipeline that exhausts RAM is just as broken as a slow one.

```text
pip install memory_profiler
```

```python
# memory_demo.py
from memory_profiler import profile as mprofile
import numpy as np

@mprofile
def build_matrices(n=5000):
    A = np.random.rand(n, n)          # n² floats × 8 bytes
    B = np.random.rand(n, n)
    C = A @ B                          # another n² allocation
    return C.sum()

if __name__ == "__main__":
    result = build_matrices()
    print(f"Result: {result:.2f}")
```

Run with:

```text
python -m memory_profiler memory_demo.py
```

Output shows the **incremental** (`MiB` column) and **total** RSS at every line:

```text
Line #    Mem usage    Increment  Line Contents
================================================
     5   68.3 MiB     68.3 MiB   @mprofile
     6                           def build_matrices(n=5000):
     7  258.8 MiB    190.5 MiB       A = np.random.rand(n, n)
     8  449.3 MiB    190.5 MiB       B = np.random.rand(n, n)
     9  639.8 MiB    190.5 MiB       C = A @ B
    10  639.8 MiB      0.0 MiB       return C.sum()
```

Key insight: `A @ B` creates a **temporary** matrix the same size as A and B. For large `n`, this can trigger an out-of-memory kill. The fix (covered in lesson 2) is in-place operations or `np.einsum`.

```check
file memory_demo.py
contains memory_demo.py "@mprofile"
contains memory_demo.py "build_matrices"
```

---

## Step 6 — Reading a flame graph

**This step:** understand what a flame graph shows and how to read it without generating one live.

A **flame graph** is a stacked bar chart of call stacks sampled at regular intervals (typically every 1 ms with `perf` or every 10 ms with `py-spy`):

```text
  ┌──────────────────────────────────────────────────────────────┐
  │                        run (100%)                            │
  ├─────────────────────────────┬────────────────────────────────┤
  │    compute_entropy (68%)    │      normalize (29%)           │
  ├──────────────┬──────────────┤                                │
  │  math.log    │  arithmetic  │                                │
  │   (42%)      │   (26%)      │                                │
  └──────────────┴──────────────┴────────────────────────────────┘
                      (time →)
```

Reading rules:

- **Width = time.** A wide bar is slow.
- **Height = call depth.** Tall stacks are deeply nested; not necessarily slow.
- **Flat tops = leaf work.** A wide flat bar at the top of a stack means that function is doing real CPU work.
- **Look for wide flat bars** — those are your targets.

Generate flame graphs for Python with **py-spy** (no code changes):

```text
pip install py-spy
py-spy record -o flame.svg -- python slow_pipeline.py
```

Or use Linux `perf` for C extensions:

```text
perf record -F 99 -g -- python slow_pipeline.py
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
```

The key lesson: a function that appears wide but is under another wide function is only *relatively* expensive. Fix the outermost wide bar first.

---

## Step 7 — Challenge: find the hotspot in a slow data pipeline

**This step:** profile a provided pipeline, identify the bottleneck, and report which function and which line consumes the most time.

Below is a more realistic pipeline with several candidates for the hotspot. Your job is to **profile it and identify the slowest function and the slowest line inside it** without running it first and guessing.

```python
# challenge_pipeline.py
import math, random, statistics

def generate_samples(n=200_000):
    return [random.gauss(0, 1) for _ in range(n)]

def bucket(samples, nbuckets=500):
    lo, hi = min(samples), max(samples)
    width   = (hi - lo) / nbuckets
    buckets = [0] * nbuckets
    for s in samples:
        idx = int((s - lo) / width)
        idx = min(idx, nbuckets - 1)
        buckets[idx] += 1
    return buckets, lo, width

def smooth(counts, window=11):
    result = []
    half   = window // 2
    for i in range(len(counts)):
        start = max(0, i - half)
        end   = min(len(counts), i + half + 1)
        result.append(sum(counts[start:end]) / (end - start))
    return result

def entropy_of_histogram(counts):
    total  = sum(counts)
    probs  = [c / total for c in counts if c > 0]
    return -sum(p * math.log(p) for p in probs)

def run():
    samples          = generate_samples()
    counts, lo, w    = bucket(samples)
    smoothed         = smooth(counts)
    h                = entropy_of_histogram(smoothed)
    print(f"Histogram entropy: {h:.4f}")

if __name__ == "__main__":
    run()
```

Steps:

1. Run with `cProfile` and sort by `cumtime`. Which function is at the top?
2. Add `@profile` to that function and run with `kernprof -l -v`. Which line dominates?
3. Run `memory_profiler` on `smooth()`. How much extra memory does the sliding window allocate?

```hints
nudge: The `smooth` function has O(n × window) behaviour — it recomputes `sum()` from scratch for every output element.
concept: `generate_samples` calls `random.gauss` 200 000 times in a Python loop — expensive, but probably not the worst.
shape: Look at `tottime`, not just `cumtime`, to find the function doing real work.
```

```check
file challenge_pipeline.py
contains challenge_pipeline.py "generate_samples"
contains challenge_pipeline.py "smooth"
contains challenge_pipeline.py "entropy_of_histogram"
```
