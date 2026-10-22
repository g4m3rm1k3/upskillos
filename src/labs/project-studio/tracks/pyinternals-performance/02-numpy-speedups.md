---
title: 2 — NumPy Best Practices: Vectorize Everything
track: Making Python Fast: Profiling to Production
trackOrder: 14
runtime: cpp
console: true
---

Now that you know how to *find* the slow part, the first and cheapest tool to reach for is **NumPy**. NumPy's array operations are implemented in C and execute in a tight loop with no Python interpreter overhead between elements. Moving work from Python loops into NumPy calls is often a 50–200× speedup with zero build steps and no new dependencies.

This lesson covers the canonical patterns: vectorisation, broadcasting, pre-allocation, `np.einsum`, contiguous memory, and in-place operations. Each pattern has a measurable cost when ignored and a measurable gain when applied.

---

## Step 1 — Python loop vs NumPy vectorization: time the difference

**This step:** benchmark a Python loop against an equivalent NumPy expression to build intuition for the magnitude of the speed difference.

A Python `for` loop over a list processes one element at a time through the full CPython interpreter: bytecode fetch, stack push, type check, arithmetic, stack pop — for every element. NumPy replaces all of that with a single C function call.

```python
# bench_loop.py
import numpy as np
import time

N = 5_000_000

# ── Python list loop ──────────────────────────────────────────────────────────
data  = list(range(N))
start = time.perf_counter()
result_py = [x * 2.5 + 1.0 for x in data]
t_py = time.perf_counter() - start
print(f"Python loop : {t_py*1000:.1f} ms")

# ── NumPy vectorised ──────────────────────────────────────────────────────────
arr   = np.arange(N, dtype=np.float64)
start = time.perf_counter()
result_np = arr * 2.5 + 1.0
t_np = time.perf_counter() - start
print(f"NumPy vector: {t_np*1000:.1f} ms")

print(f"Speedup     : {t_py / t_np:.0f}×")
```

Typical output on a modern laptop:

```text
Python loop : 612.4 ms
NumPy vector:   6.1 ms
Speedup     : 100×
```

The C analogy: a Python loop is like writing `for (int i=0; i<N; i++) result[i] = data[i] * 2.5 + 1.0;` in C but paying Python's per-iteration overhead. NumPy compiles that loop at install time and runs it at full CPU speed.

```check
run "python bench_loop.py" stdout="Speedup"
run "python bench_loop.py" stdout="ms"
```

---

## Step 2 — Broadcasting: no loops, no temporaries

**This step:** apply NumPy broadcasting to eliminate explicit loops over multiple dimensions.

**Broadcasting** is NumPy's mechanism for applying an operation between arrays of different shapes by implicitly expanding the smaller one — without allocating a temporary full-size copy.

```python
# broadcasting_demo.py
import numpy as np
import time

# Subtract the per-column mean from a 2-D matrix — a common preprocessing step.
M, N = 10_000, 1_000
X    = np.random.randn(M, N).astype(np.float32)

# ── Slow: Python loop ─────────────────────────────────────────────────────────
start = time.perf_counter()
X_slow = X.copy()
for j in range(N):
    X_slow[:, j] -= X_slow[:, j].mean()   # one column at a time
t_loop = time.perf_counter() - start

# ── Fast: broadcasting ────────────────────────────────────────────────────────
start = time.perf_counter()
col_mean = X.mean(axis=0)       # shape (N,)
X_fast   = X - col_mean         # shape (M,N) - shape (N,) → broadcasts over M
t_bcast  = time.perf_counter() - start

print(f"Loop       : {t_loop*1000:.1f} ms")
print(f"Broadcast  : {t_bcast*1000:.1f} ms")
print(f"Max diff   : {np.max(np.abs(X_slow - X_fast)):.2e}")  # should be ~0
```

Broadcasting shape rules (memorise these):

```text
Shape (M, N) op Shape (   N)   →  (M, N)   # row broadcast
Shape (M, N) op Shape (M, 1)   →  (M, N)   # column broadcast
Shape (M, 1) op Shape (1, N)   →  (M, N)   # outer product, no loop
```

```check
run "python broadcasting_demo.py" stdout="Broadcast"
run "python broadcasting_demo.py" stdout="Max diff"
```

---

## Step 3 — Pre-allocating output with np.empty / np.zeros

**This step:** avoid repeated small allocations inside a loop by pre-allocating a fixed output buffer.

Every time you call `np.zeros(...)` or `np.array(...)` inside a hot loop, NumPy requests memory from the OS allocator, zeros it (for `zeros`), and hands it to Python's garbage collector at the end of the iteration. For small arrays repeated millions of times this overhead dominates.

```python
# prealloc_demo.py
import numpy as np
import time

N_ROWS   = 100_000
ROW_SIZE = 256

# ── Allocate inside the loop ──────────────────────────────────────────────────
start = time.perf_counter()
results_bad = []
for i in range(N_ROWS):
    row = np.zeros(ROW_SIZE, dtype=np.float32)  # allocation every iteration
    row[:] = i * 0.001
    results_bad.append(row)
t_bad = time.perf_counter() - start

# ── Pre-allocate one big buffer ───────────────────────────────────────────────
start  = time.perf_counter()
buf    = np.empty((N_ROWS, ROW_SIZE), dtype=np.float32)  # one allocation
scales = np.arange(N_ROWS, dtype=np.float32) * 0.001
buf[:] = scales[:, np.newaxis]                           # vectorised fill
t_good = time.perf_counter() - start

print(f"In-loop alloc  : {t_bad*1000:.1f} ms")
print(f"Pre-allocated  : {t_good*1000:.1f} ms")
print(f"Speedup        : {t_bad/t_good:.1f}×")
```

C programmers recognise this immediately: calling `malloc` / `calloc` in a tight inner loop is the same anti-pattern — you always pre-allocate buffers and reuse them.

```python
# Also useful: np.empty_like to pre-allocate with matching dtype/shape
out = np.empty_like(some_array)
np.multiply(some_array, 2.0, out=out)   # result written to out, no temp
```

```check
run "python prealloc_demo.py" stdout="Pre-allocated"
run "python prealloc_demo.py" stdout="Speedup"
```

---

## Step 4 — np.einsum: the universal reduction

**This step:** use `np.einsum` to express multi-dimensional contractions without intermediate allocations.

`np.einsum` (Einstein summation) is a mini-language for expressing any combination of element-wise multiplication and summation over any set of axes — **without creating intermediate arrays**. It is both expressive and fast.

```python
# einsum_demo.py
import numpy as np
import time

A = np.random.randn(512, 256).astype(np.float32)
B = np.random.randn(256, 128).astype(np.float32)

# ── Standard matmul (for reference) ──────────────────────────────────────────
t0     = time.perf_counter()
C_mm   = A @ B
t_mm   = time.perf_counter() - t0

# ── einsum matmul ─────────────────────────────────────────────────────────────
t0     = time.perf_counter()
C_ein  = np.einsum("ij,jk->ik", A, B)
t_ein  = time.perf_counter() - t0

print(f"matmul  : {t_mm*1e6:.0f} µs")
print(f"einsum  : {t_ein*1e6:.0f} µs")
print(f"Max err : {np.max(np.abs(C_mm - C_ein)):.2e}")

# Common einsum patterns:
v1 = np.random.randn(1000).astype(np.float32)
v2 = np.random.randn(1000).astype(np.float32)

dot        = np.einsum("i,i->",    v1, v2)          # dot product
outer      = np.einsum("i,j->ij",  v1, v2[:500])    # outer product (no loop)
batch_diag = np.einsum("...ii->...i", np.random.randn(32, 64, 64))  # batch diagonal
trace      = np.einsum("ii->",     np.random.randn(64, 64))         # matrix trace

print(f"\nDot product : {dot:.4f}")
print(f"Outer shape : {outer.shape}")
print(f"Batch diag  : {batch_diag.shape}")
print(f"Trace       : {trace:.4f}")
```

`np.einsum("ij,jk->ik", A, B)` is read: "for every `i` and `k`, sum over `j` the product `A[i,j] * B[j,k]`". This maps exactly to the Einstein convention used in physics and machine learning literature.

```check
run "python einsum_demo.py" stdout="matmul"
run "python einsum_demo.py" stdout="Outer shape"
```

---

## Step 5 — Ensuring contiguous memory: np.ascontiguousarray

**This step:** understand why non-contiguous arrays cause cache misses and how to detect and fix them.

NumPy arrays can be **non-contiguous** — the elements are in memory but not in the expected C row-major order. Slicing a 2-D array along the first axis (`A[::2, :]`) is contiguous; slicing along columns (`A[:, ::2]`) is not.

```python
# contiguous_demo.py
import numpy as np
import time

A = np.random.randn(4000, 4000).astype(np.float32)

# Transpose makes a non-contiguous view (columns are now "rows" in memory)
T = A.T   # shape (4000, 4000), C_CONTIGUOUS = False

print(f"A contiguous: {A.flags['C_CONTIGUOUS']}")   # True
print(f"T contiguous: {T.flags['C_CONTIGUOUS']}")   # False

# ── Sum over non-contiguous array ─────────────────────────────────────────────
t0    = time.perf_counter()
s_nc  = T.sum(axis=1)
t_nc  = time.perf_counter() - t0

# ── Make contiguous first ─────────────────────────────────────────────────────
T_c   = np.ascontiguousarray(T)   # copies data into row-major order
t0    = time.perf_counter()
s_c   = T_c.sum(axis=1)
t_c   = time.perf_counter() - t0

print(f"\nNon-contiguous sum: {t_nc*1000:.1f} ms")
print(f"Contiguous sum    : {t_c*1000:.1f} ms")
```

Why does this matter in C? The same reason cache lines exist:

```c
// Non-contiguous: every access strides across 4000 floats = 16 KB
// → cache miss on almost every element
for (int i = 0; i < N; i++)
    sum += T_ptr[i * stride];   // stride >> cache line width

// Contiguous: sequential — hardware prefetcher fills cache lines ahead of you
for (int i = 0; i < N; i++)
    sum += T_c_ptr[i];          // ~sequential = fast
```

Use `np.ascontiguousarray` before passing arrays to C extensions or Cython functions — it is a no-op if the array is already contiguous.

```check
run "python contiguous_demo.py" stdout="A contiguous: True"
run "python contiguous_demo.py" stdout="T contiguous: False"
```

---

## Step 6 — In-place operations: +=, *=, np.add(out=...)

**This step:** use in-place NumPy operations to eliminate temporary array allocations in hot loops.

Every binary NumPy expression (`A + B`, `A * 2.5`) allocates a fresh output array. In a loop or inside a function called millions of times, those temporaries add up to significant GC pressure.

```python
# inplace_demo.py
import numpy as np
import time

N  = 10_000_000
A  = np.ones(N, dtype=np.float64)
B  = np.ones(N, dtype=np.float64) * 0.5

# ── Expression creates temporaries ────────────────────────────────────────────
REPS = 20
t0   = time.perf_counter()
for _ in range(REPS):
    C = A * B + A           # two temporaries per iteration
t_temp = time.perf_counter() - t0

# ── In-place with pre-allocated output buffer ─────────────────────────────────
out  = np.empty(N, dtype=np.float64)
t0   = time.perf_counter()
for _ in range(REPS):
    np.multiply(A, B, out=out)   # A*B → out  (no temp)
    np.add(out, A, out=out)      # out+A → out (no temp)
t_inplace = time.perf_counter() - t0

print(f"With temporaries  : {t_temp*1000:.1f} ms")
print(f"In-place (out=)   : {t_inplace*1000:.1f} ms")
print(f"Speedup           : {t_temp/t_inplace:.2f}×")

# Also works for augmented assignment operators — NumPy detects in-place intent:
A += B       # in-place, no temporary
A *= 2.0     # in-place
np.sqrt(A, out=A)   # in-place square root
print("\nIn-place ops applied successfully")
```

```check
run "python inplace_demo.py" stdout="In-place"
run "python inplace_demo.py" stdout="Speedup"
```

---

## Step 7 — Challenge: rewrite a nested loop as a single broadcasting expression

**This step:** take a Python nested loop that computes a distance matrix and replace it with a single broadcasting expression — no loops, no intermediate lists.

```python
# challenge_distance.py
import numpy as np
import time

np.random.seed(42)
N = 2000   # number of 2-D points
points = np.random.randn(N, 2).astype(np.float32)

# ── Slow: Python nested loop ───────────────────────────────────────────────────
start = time.perf_counter()
dist_slow = np.empty((N, N), dtype=np.float32)
for i in range(N):
    for j in range(N):
        dx = points[i, 0] - points[j, 0]
        dy = points[i, 1] - points[j, 1]
        dist_slow[i, j] = (dx*dx + dy*dy) ** 0.5
t_slow = time.perf_counter() - start
print(f"Nested loop: {t_slow:.2f} s")

# ── Your task: replace the two for-loops with broadcasting ────────────────────
# Hint: points[:, np.newaxis, :] has shape (N, 1, 2)
#       points[np.newaxis, :, :] has shape (1, N, 2)
#       Subtracting them gives shape (N, N, 2) — the full difference matrix.
start = time.perf_counter()
# TODO: compute dist_fast using broadcasting (no Python loops)
diff      = points[:, np.newaxis, :] - points[np.newaxis, :, :]  # (N,N,2)
dist_fast = np.sqrt((diff**2).sum(axis=2))                        # (N,N)
t_fast    = time.perf_counter() - start
print(f"Broadcasting: {t_fast*1000:.1f} ms")
print(f"Speedup     : {t_slow/t_fast:.0f}×")
print(f"Max error   : {np.max(np.abs(dist_slow - dist_fast)):.2e}")
```

Expected output (approximate):

```text
Nested loop : 8.40 s
Broadcasting:  9.3 ms
Speedup     : 903×
Max error   : 1.19e-07
```

```hints
nudge: Shape (N, 1, 2) minus shape (1, N, 2) broadcasts to (N, N, 2).
concept: `.sum(axis=2)` reduces the last axis (x, y components) to get squared distances.
shape: `np.sqrt(...)` or `** 0.5` gives the final Euclidean distance.
- For even larger N, look at `scipy.spatial.distance.cdist` which uses BLAS internally.
```

```check
file challenge_distance.py
contains challenge_distance.py "dist_fast"
contains challenge_distance.py "broadcasting"
contains challenge_distance.py "Speedup"
```
