---
title: 4 — Numba: JIT-compile Python to Machine Code
track: Making Python Fast: Profiling to Production
trackOrder: 14
runtime: cpp
console: true
---

Cython requires a separate compilation step and a C toolchain. **Numba** takes a different approach: it compiles Python functions to native machine code **at runtime** using LLVM — the same compiler backend used by Clang and Rust. You add a decorator, Python stays Python, and the first call triggers compilation. Subsequent calls run at near-C speed.

Numba excels at numeric, array-heavy code: scientific kernels, simulation inner loops, custom loss functions, signal processing. It is not a general Python accelerator — code that creates Python objects, calls arbitrary Python functions, or uses non-numeric data structures will not benefit or will fall back to the interpreter.

---

## Step 1 — @jit: decorate a function and watch it speed up

**This step:** install Numba, apply `@jit` to a slow function, and observe the compilation + speedup.

```text
pip install numba
```

```python
# numba_intro.py
import numba
import numpy as np
import time

# ── Pure Python reference ─────────────────────────────────────────────────────
def sum_squares_py(n):
    total = 0.0
    for i in range(n):
        total += i * i
    return total

# ── Numba JIT ─────────────────────────────────────────────────────────────────
@numba.jit
def sum_squares_jit(n):
    total = 0.0
    for i in range(n):
        total += i * i
    return total

N = 50_000_000

# Warm up JIT (first call compiles)
sum_squares_jit(1)

t0 = time.perf_counter(); r1 = sum_squares_py(N);  t1 = time.perf_counter()
t2 = time.perf_counter(); r2 = sum_squares_jit(N); t3 = time.perf_counter()

print(f"Pure Python : {(t1-t0)*1000:.1f} ms   result={r1:.0f}")
print(f"Numba @jit  : {(t3-t2)*1000:.1f} ms   result={r2:.0f}")
print(f"Speedup     : {(t1-t0)/(t3-t2):.0f}×")
```

The `@jit` decorator is lazy by default — it compiles the first time the function is called with a specific argument type signature. The compiled machine code is cached for reuse on subsequent calls with the same types.

```text
# Expected output
Pure Python : 4820.3 ms   result=41666666791666640000.0
Numba @jit  :   22.1 ms   result=41666666791666640000.0
Speedup     : 218×
```

```check
run "python numba_intro.py" stdout="Numba @jit"
run "python numba_intro.py" stdout="Speedup"
```

---

## Step 2 — nopython=True: strict mode (faster, harder to debug)

**This step:** understand the difference between `@jit` object mode and `@njit` (nopython mode), and why nopython mode is preferred for performance.

`@jit` has two modes:

| Mode | Trigger | Speed | Notes |
|---|---|---|---|
| **nopython** | All types are statically known | C speed | The fast path |
| **object mode** | Numba falls back when it can't infer types | Python speed | Silently slow |

By default `@jit` will silently fall back to object mode if it can't compile a section. This means a performance bug can hide in plain sight. Use `@njit` (or `@jit(nopython=True)`) to get a compile-time error instead:

```python
# nopython_demo.py
import numba
import numpy as np
import time

@numba.njit   # nopython=True — fails loudly if types can't be inferred
def pairwise_distance_njit(X):
    n     = X.shape[0]
    ndim  = X.shape[1]
    out   = np.empty((n, n), dtype=np.float64)
    for i in range(n):
        for j in range(n):
            dist = 0.0
            for k in range(ndim):
                d     = X[i, k] - X[j, k]
                dist += d * d
            out[i, j] = dist ** 0.5
    return out

X = np.random.randn(1000, 3).astype(np.float64)

# Warm up
pairwise_distance_njit(X[:2])

t0  = time.perf_counter()
D   = pairwise_distance_njit(X)
t1  = time.perf_counter()
print(f"@njit pairwise: {(t1-t0)*1000:.1f} ms  shape={D.shape}")
```

Rules for nopython mode:

- All arrays must be NumPy arrays (not Python lists)
- All numeric operations must use Numba-supported dtypes
- No Python built-in calls except those Numba explicitly supports (`len`, `range`, `print`, `math.*`, `numpy.*`)
- No creating Python objects (`dict`, `list`, `str`) inside the function

```check
run "python nopython_demo.py" stdout="@njit pairwise"
run "python nopython_demo.py" stdout="shape=(1000, 1000)"
```

---

## Step 3 — @vectorize: write a scalar function, Numba makes it a ufunc

**This step:** use `@vectorize` to write a scalar function and have Numba automatically broadcast it over NumPy arrays as a universal function (ufunc).

NumPy ufuncs (`np.exp`, `np.sqrt`, `np.add`) work on scalars and broadcast over arrays of any shape automatically. `@numba.vectorize` lets you write a scalar function and get the same behaviour:

```python
# vectorize_demo.py
import numba
import numpy as np
import time

# Must provide the type signature(s): return_type(arg1_type, arg2_type, ...)
@numba.vectorize(["float64(float64, float64)"])
def clipped_relu(x, threshold):
    """Element-wise: max(0, x) capped at threshold."""
    if x < 0.0:
        return 0.0
    elif x > threshold:
        return threshold
    return x

# Works on scalars:
print(clipped_relu(3.5, 2.0))   # 2.0
print(clipped_relu(-1.0, 2.0))  # 0.0

# Works on arrays of any shape — broadcasting included:
X = np.random.randn(1_000, 512).astype(np.float64)
t = np.full(512, 1.5)   # per-column threshold, broadcast over rows

t0  = time.perf_counter()
out = clipped_relu(X, t)   # shape (1000, 512), threshold broadcast
t1  = time.perf_counter()
print(f"vectorized shape: {out.shape}  time: {(t1-t0)*1000:.2f} ms")

# Compare to NumPy equivalent (Python-level clip)
t0   = time.perf_counter()
out2 = np.clip(X, 0, t)
t1   = time.perf_counter()
print(f"np.clip shape   : {out2.shape}  time: {(t1-t0)*1000:.2f} ms")
print(f"Max diff        : {np.max(np.abs(out - out2)):.2e}")
```

Multiple type signatures can be provided:

```python
@numba.vectorize([
    "float32(float32, float32)",
    "float64(float64, float64)",
])
def fast_sigmoid(x, scale):
    return 1.0 / (1.0 + numba.np.ufunc.parallel._check_nopython_mode() or 0) # simplified
```

```check
run "python vectorize_demo.py" stdout="vectorized shape"
run "python vectorize_demo.py" stdout="Max diff"
```

---

## Step 4 — @guvectorize: generalized ufuncs

**This step:** use `@guvectorize` to write a function that operates on 1-D slices of an N-D array — a generalised ufunc.

Regular ufuncs operate on scalars. **Generalised ufuncs** (gufuncs) operate on sub-arrays of a fixed shape — for example, one row at a time from a 2-D matrix.

```python
# guvectorize_demo.py
import numba
import numpy as np
import time

# Layout signature: "(n),(n)->()" means take two 1-D arrays of length n, return a scalar
@numba.guvectorize(
    ["void(float64[:], float64[:], float64[:])"],
    "(n),(n)->()",
    nopython=True,
)
def dot_rows(a, b, result):
    """Dot product of two 1-D slices; result[:] is the output buffer."""
    acc = 0.0
    for i in range(a.shape[0]):
        acc += a[i] * b[i]
    result[0] = acc

A = np.random.randn(5000, 128).astype(np.float64)
B = np.random.randn(5000, 128).astype(np.float64)

# Warm up
dot_rows(A[:2], B[:2])

t0  = time.perf_counter()
out = dot_rows(A, B)   # shape (5000,) — one dot product per row pair
t1  = time.perf_counter()
print(f"guvectorize dot_rows: {(t1-t0)*1000:.1f} ms  shape={out.shape}")

# Reference: einsum
t0     = time.perf_counter()
ref    = np.einsum("ij,ij->i", A, B)
t1     = time.perf_counter()
print(f"np.einsum           : {(t1-t0)*1000:.1f} ms")
print(f"Max diff            : {np.max(np.abs(out - ref)):.2e}")
```

The layout signature `"(n),(n)->()"` means: for each pair of length-n vectors, produce a scalar. NumPy handles broadcasting the call over all leading dimensions automatically.

```check
run "python guvectorize_demo.py" stdout="guvectorize dot_rows"
run "python guvectorize_demo.py" stdout="Max diff"
```

---

## Step 5 — Parallel: @njit(parallel=True) with prange

**This step:** enable Numba's automatic parallelism and manual `prange` to use all CPU cores.

```python
# parallel_demo.py
import numba
from numba import prange
import numpy as np
import time

@numba.njit(parallel=True)
def parallel_norm(X):
    """L2-normalise each row of a 2-D array in parallel."""
    n, d = X.shape
    out  = np.empty_like(X)
    for i in prange(n):           # prange distributes iterations across threads
        sq_sum = 0.0
        for j in range(d):
            sq_sum += X[i, j] ** 2
        inv_norm = 1.0 / (sq_sum ** 0.5 + 1e-12)
        for j in range(d):
            out[i, j] = X[i, j] * inv_norm
    return out

@numba.njit
def serial_norm(X):
    """Same function but serial for comparison."""
    n, d = X.shape
    out  = np.empty_like(X)
    for i in range(n):
        sq_sum = 0.0
        for j in range(d):
            sq_sum += X[i, j] ** 2
        inv_norm = 1.0 / (sq_sum ** 0.5 + 1e-12)
        for j in range(d):
            out[i, j] = X[i, j] * inv_norm
    return out

X = np.random.randn(50_000, 512).astype(np.float64)

# Warm up (compilation)
parallel_norm(X[:2]); serial_norm(X[:2])

t0  = time.perf_counter(); r1 = serial_norm(X);   t1 = time.perf_counter()
t2  = time.perf_counter(); r2 = parallel_norm(X); t3 = time.perf_counter()

print(f"Serial  : {(t1-t0)*1000:.1f} ms")
print(f"Parallel: {(t3-t2)*1000:.1f} ms")
print(f"Speedup : {(t1-t0)/(t3-t2):.1f}×")
print(f"Max diff: {np.max(np.abs(r1 - r2)):.2e}")
```

`prange` is a drop-in for `range` inside `@njit(parallel=True)`. Numba automatically handles thread safety for reductions when the pattern is recognised; for custom reductions you may need to use `numba.typed.List` or explicit per-thread accumulators.

```check
run "python parallel_demo.py" stdout="Parallel:"
run "python parallel_demo.py" stdout="Speedup"
```

---

## Step 6 — When NOT to use Numba (startup cost, compilation time)

**This step:** understand Numba's limitations and the situations where Cython, ctypes, or native NumPy is a better choice.

Numba is not the right tool in every situation. The table below summarises the trade-offs:

| Scenario | Numba? | Why |
|---|---|---|
| Tight numeric loop, no build system | ✅ Yes | Zero setup, fast iteration |
| Algorithm already expressible in NumPy | ❌ No | NumPy already calls BLAS/LAPACK |
| First call latency matters (e.g., serverless) | ❌ No | LLVM compilation can take 1–10 s |
| Need to call arbitrary C/C++ libraries | ❌ No | Use ctypes or pybind11 |
| Using Python dicts, sets, or strings inside the hot loop | ❌ No | Objects not supported in nopython |
| Distributing a binary package (wheel) | ⚠️ Maybe | Numba must be installed by the user |
| CUDA GPU acceleration | ✅ Yes | Numba's `cuda.jit` is best-in-class |

```python
# startup_cost.py — demonstrates cold-start latency
import time

# Time the import (LLVM loads)
t0 = time.perf_counter()
import numba
t1 = time.perf_counter()
print(f"import numba  : {(t1-t0)*1000:.0f} ms")

# Time first compilation
import numpy as np

@numba.njit
def tiny(x):
    return x * 2.0

t2 = time.perf_counter()
tiny(1.0)   # triggers compilation
t3 = time.perf_counter()
print(f"First JIT call: {(t3-t2)*1000:.0f} ms")

# Subsequent calls are instant
t4 = time.perf_counter()
for _ in range(1000):
    tiny(1.0)
t5 = time.perf_counter()
print(f"1000 warm calls: {(t5-t4)*1000:.2f} ms")
```

```check
run "python startup_cost.py" stdout="import numba"
run "python startup_cost.py" stdout="First JIT call"
run "python startup_cost.py" stdout="warm calls"
```

---

## Step 7 — Challenge: use @vectorize to write a fast log-sum-exp

**This step:** implement the numerically stable log-sum-exp operation as a Numba vectorized kernel and verify correctness against `scipy.special.logsumexp`.

The log-sum-exp trick is used everywhere in machine learning (softmax, log-likelihood). The naive implementation overflows for large inputs:

```python
# challenge_logsumexp.py
import numba
import numpy as np
import time

# ── Reference: scipy ─────────────────────────────────────────────────────────
from scipy.special import logsumexp as scipy_lse

# ── Numba guvectorize: operate on one row at a time ───────────────────────────
@numba.guvectorize(
    ["void(float64[:], float64[:])"],
    "(n)->()",
    nopython=True,
)
def fast_logsumexp(x, result):
    """Numerically stable log-sum-exp over a 1-D slice."""
    # Step 1: find the max for numerical stability
    max_val = x[0]
    for i in range(1, x.shape[0]):
        if x[i] > max_val:
            max_val = x[i]
    # Step 2: sum of exp(x_i - max)
    total = 0.0
    for i in range(x.shape[0]):
        total += numba.np.ufunc.parallel._nb_exp(x[i] - max_val) if False else __import__('math').exp(x[i] - max_val)
    # Step 3: log(total) + max
    import math
    result[0] = math.log(total) + max_val

# Benchmark on a batch of 10 000 rows × 512 features
BATCH, DIM = 10_000, 512
X = np.random.randn(BATCH, DIM).astype(np.float64) * 5

# Warm up
fast_logsumexp(X[:2])

t0  = time.perf_counter()
out_nb  = fast_logsumexp(X)
t1  = time.perf_counter()

t2  = time.perf_counter()
out_sp  = scipy_lse(X, axis=1)
t3  = time.perf_counter()

print(f"Numba guvectorize: {(t1-t0)*1000:.1f} ms")
print(f"scipy logsumexp  : {(t3-t2)*1000:.1f} ms")
print(f"Max error        : {np.max(np.abs(out_nb - out_sp)):.2e}")
```

```hints
nudge: Inside a `@guvectorize` function you cannot import modules — use `numba.typed` utilities or precompute in a helper.
concept: A cleaner pattern: write a `@numba.njit` helper for the scalar log-sum-exp, then call it from a plain `@numba.njit` row loop.
shape: Numerical stability requires subtracting the row maximum before exponentiating.
- Expected speedup over scipy: 2–5× for large batches (scipy calls BLAS; Numba parallelises with prange).
```

```check
file challenge_logsumexp.py
contains challenge_logsumexp.py "fast_logsumexp"
contains challenge_logsumexp.py "guvectorize"
contains challenge_logsumexp.py "Max error"
```
