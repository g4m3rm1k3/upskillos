---
title: 3 — Cython: Python with C Types
track: Making Python Fast: Profiling to Production
trackOrder: 14
runtime: cpp
console: true
---

NumPy vectorisation works when your algorithm can be expressed as array operations. But some algorithms are inherently iterative — graph traversal, dynamic programming, adaptive simulations — and no broadcasting trick will help. For these, **Cython** lets you write Python-like code and compile it to C, adding static types where the profiler shows it matters.

Cython is the most mature path for speeding up CPython code. It is used in NumPy itself, scikit-learn, pandas, and dozens of other scientific libraries. You get:

- Static typing (`cdef int`, `cdef double`) to eliminate boxing
- Direct access to NumPy arrays at C speed via **typed memoryviews**
- GIL release (`nogil`) to enable true parallelism
- OpenMP parallel loops via `prange`
- An annotation mode that shows which lines still touch Python objects

---

## Step 1 — Install Cython and write a .pyx file

**This step:** install Cython, write a minimal `.pyx` file, and compile it with a `setup.py`.

```text
pip install cython numpy
```

Cython files end in `.pyx`. They look like Python but accept C type declarations:

```python file=cython_intro/hello_cy.pyx
# hello_cy.pyx — a minimal Cython module
def greet(name):
    """Ordinary Python function — no speedup yet."""
    return f"Hello, {name}!"

def add_ints(int a, int b):
    """Typed arguments: a and b are C ints, no boxing."""
    return a + b
```

```check
file cython_intro/hello_cy.pyx
contains cython_intro/hello_cy.pyx "def add_ints"
contains cython_intro/hello_cy.pyx "int a"
```

## Step 1b — Build it with setup.py

**This step:** write the `setup.py` that compiles `hello_cy.pyx` into a module Python can import.

Build with a `setup.py`:

```python file=cython_intro/setup.py
# setup.py
from setuptools import setup
from Cython.Build import cythonize
import numpy as np

setup(
    ext_modules=cythonize(
        "hello_cy.pyx",
        compiler_directives={"language_level": "3"},
    ),
    include_dirs=[np.get_include()],
)
```

Compile and test:

```text
cd cython_intro
python setup.py build_ext --inplace
python -c "import hello_cy; print(hello_cy.greet('world')); print(hello_cy.add_ints(3, 4))"
```

This produces a `.so` (Linux/macOS) or `.pyd` (Windows) file that Python imports like any other module. Under the hood, Cython generated C code and the system compiler compiled it.

```check
file cython_intro/setup.py
contains cython_intro/setup.py "cythonize"
```

---

## Step 2 — cdef int x: static types eliminate boxing

**This step:** add `cdef` type declarations to a computation-heavy function and measure the speedup.

In CPython every `int` is a heap-allocated `PyObject` with reference counting. A `cdef int` in Cython is a plain C `int` on the stack — 8 bytes vs ~28 bytes, no malloc, no ref count.

```python file=cython_intro/typed_sum.pyx
# typed_sum.pyx
import time

def python_sum(int n):
    """Typed argument but loop variable is still a Python int."""
    total = 0
    for i in range(n):
        total += i
    return total

def cython_sum(int n):
    """All variables declared as C types — fully static inner loop."""
    cdef long long total = 0
    cdef int i
    for i in range(n):
        total += i
    return total
```

```python
# bench_typed.py
import time
from typed_sum import python_sum, cython_sum

N = 100_000_000

t0 = time.perf_counter(); r1 = python_sum(N);  t1 = time.perf_counter()
t2 = time.perf_counter(); r2 = cython_sum(N);  t3 = time.perf_counter()

print(f"python_sum : {(t1-t0)*1000:.0f} ms  result={r1}")
print(f"cython_sum : {(t3-t2)*1000:.0f} ms  result={r2}")
print(f"Speedup    : {(t1-t0)/(t3-t2):.0f}×")
```

The Cython version compiles to essentially:

```c
long long total = 0;
int i;
for (i = 0; i < n; i++) {
    total += i;
}
return PyLong_FromLongLong(total);   // box the result only once, at the end
```

The Python-object boxing overhead disappears from the inner loop.

```check
file cython_intro/typed_sum.pyx
contains cython_intro/typed_sum.pyx "cdef long long total"
contains cython_intro/typed_sum.pyx "cdef int i"
```

---

## Step 3 — Typed memoryviews: access NumPy arrays at C speed

**This step:** use a typed memoryview (`double[:]`) to iterate over a NumPy array in a Cython loop without Python overhead.

A **typed memoryview** is a C-level pointer to a buffer (NumPy array, `array.array`, or any object implementing the buffer protocol). Accessing `mv[i]` compiles to a direct memory read — no Python object creation per element.

```python file=cython_intro/fast_dot.pyx
# fast_dot.pyx
import numpy as np
cimport numpy as cnp

def dot_python(a, b):
    """Pure Python — each element access creates a Python float."""
    total = 0.0
    for i in range(len(a)):
        total += a[i] * b[i]
    return total

def dot_cython(double[:] a, double[:] b):
    """Typed memoryview — element access compiles to a raw memory load."""
    cdef double total = 0.0
    cdef int    i, n  = a.shape[0]
    for i in range(n):
        total += a[i] * b[i]
    return total
```

```python
# bench_dot.py
import numpy as np, time
from fast_dot import dot_python, dot_cython

N = 2_000_000
a = np.random.randn(N)
b = np.random.randn(N)

t0 = time.perf_counter(); r1 = dot_python(a, b); t1 = time.perf_counter()
t2 = time.perf_counter(); r2 = dot_cython(a, b); t3 = time.perf_counter()
t4 = time.perf_counter(); r3 = np.dot(a, b);     t5 = time.perf_counter()

print(f"Python loop : {(t1-t0)*1000:.1f} ms")
print(f"Cython mv   : {(t3-t2)*1000:.1f} ms")
print(f"np.dot      : {(t5-t4)*1000:.1f} ms  (BLAS baseline)")
print(f"Cython vs Py: {(t1-t0)/(t3-t2):.0f}×")
```

Cython typed memoryviews support multi-dimensional arrays too:

```python
def sum_rows(double[:, :] matrix):   # 2-D contiguous view
    cdef int i, j, m = matrix.shape[0], n = matrix.shape[1]
    cdef double total = 0.0
    for i in range(m):
        for j in range(n):
            total += matrix[i, j]
    return total
```

```check
file cython_intro/fast_dot.pyx
contains cython_intro/fast_dot.pyx "double[:] a"
contains cython_intro/fast_dot.pyx "cdef double total"
```

---

## Step 4 — nogil: release the GIL for parallel loops

**This step:** mark a Cython function `nogil` so it can run in a thread pool without GIL contention.

The Global Interpreter Lock (GIL) prevents multiple Python threads from running Python bytecode simultaneously. But a Cython function that holds no Python objects can **release the GIL**, enabling true thread-level parallelism.

```python file=cython_intro/nogil_demo.pyx
# nogil_demo.pyx
import numpy as np
from cython.parallel cimport prange

def process_chunks(double[:] data, int chunk_size):
    """Process chunks of data; each chunk is GIL-free."""
    cdef int n      = data.shape[0]
    cdef int n_chunks = n // chunk_size
    cdef double[:] out = np.empty(n_chunks, dtype=np.float64)

    cdef int c, i
    cdef double acc

    for c in range(n_chunks):
        acc = 0.0
        with nogil:                          # release GIL for this block
            for i in range(chunk_size):
                acc += data[c * chunk_size + i]
        out[c] = acc / chunk_size
    return np.asarray(out)
```

Inside a `with nogil:` block you **must not** touch any Python object. Allowed: C integers, C doubles, typed memoryviews, C pointers. Not allowed: Python lists, dicts, strings, function calls that may call back into Python.

This is identical to the threading model you use in C:

```c
// C equivalent: worker thread acquires no Python lock
void* worker(void* arg) {
    double* data = ((thread_args*)arg)->data;
    // ... pure C computation, no Python objects ...
    return NULL;
}
```

```check
file cython_intro/nogil_demo.pyx
contains cython_intro/nogil_demo.pyx "with nogil"
contains cython_intro/nogil_demo.pyx "prange"
```

---

## Step 5 — prange: OpenMP-powered parallel for

**This step:** replace `range` with `prange` inside a `nogil` block to get OpenMP parallelism automatically.

`prange` is Cython's parallel range. Cython compiles it to an OpenMP `#pragma omp parallel for` — the loop iterations are distributed across CPU cores with zero Python involvement.

```python file=cython_intro/parallel_sum.pyx
# parallel_sum.pyx
# distutils: extra_compile_args = -fopenmp
# distutils: extra_link_args = -fopenmp
import numpy as np
from cython.parallel cimport prange

def parallel_row_sum(double[:, :] matrix):
    """Sum each row in parallel using OpenMP."""
    cdef int m   = matrix.shape[0]
    cdef int n   = matrix.shape[1]
    cdef double[:] out = np.empty(m, dtype=np.float64)
    cdef int i, j
    cdef double acc

    for i in prange(m, nogil=True):    # OpenMP parallel loop
        acc = 0.0
        for j in range(n):
            acc += matrix[i, j]
        out[i] = acc
    return np.asarray(out)
```

Update `setup.py` to enable OpenMP:

```python
from setuptools import setup, Extension
from Cython.Build import cythonize
import numpy as np

ext = Extension(
    "parallel_sum",
    ["parallel_sum.pyx"],
    extra_compile_args=["-fopenmp"],   # GCC/Clang
    extra_link_args=["-fopenmp"],
    include_dirs=[np.get_include()],
)
setup(ext_modules=cythonize(ext, compiler_directives={"language_level": "3"}))
```

Note for Windows: use `/openmp` instead of `-fopenmp` with MSVC.

```python
# bench_parallel.py
import numpy as np, time
from parallel_sum import parallel_row_sum

M, N = 10_000, 10_000
mat  = np.random.randn(M, N)

t0 = time.perf_counter(); r1 = mat.sum(axis=1);         t1 = time.perf_counter()
t2 = time.perf_counter(); r2 = parallel_row_sum(mat);   t3 = time.perf_counter()

print(f"NumPy serial  : {(t1-t0)*1000:.1f} ms")
print(f"Cython prange : {(t3-t2)*1000:.1f} ms")
print(f"Max err       : {np.max(np.abs(r1 - r2)):.2e}")
```

```check
file cython_intro/parallel_sum.pyx
contains cython_intro/parallel_sum.pyx "prange"
contains cython_intro/parallel_sum.pyx "nogil=True"
```

---

## Step 6 — Profiling Cython: cProfile + annotate HTML

**This step:** profile compiled Cython code with cProfile and use Cython's annotation to find residual Python overhead.

Cython code is profiled with `cProfile` like any Python code — you just need one extra compiler directive:

```python
# cython: profile=True   ← add to the top of your .pyx file
```

Then run normally:

```text
python -m cProfile -s cumulative bench_dot.py
```

Cython also generates an **annotation HTML** file that colour-codes every line: yellow = Python overhead still present, white = pure C. Generate it with:

```text
cython -a fast_dot.pyx
```

Open `fast_dot.html` in a browser. Lines that touch Python objects appear yellow; `cdef` typed inner loops appear white (no Python overhead).

Reading the annotation:

```text
+01: def dot_cython(double[:] a, double[:] b):
 02:     cdef double total = 0.0      ← white: pure C
 03:     cdef int i, n = a.shape[0]  ← white
 04:     for i in range(n):          ← white: C loop
 05:         total += a[i] * b[i]   ← white: C memory access
 06:     return total                ← yellow: boxing result into Python float
```

The only remaining Python call is boxing the return value — unavoidable but happens only once.

```check
file cython_intro/fast_dot.pyx
contains cython_intro/fast_dot.pyx "dot_cython"
```

---

## Step 7 — Challenge: Cythonize a slow function from lesson 1

**This step:** take the `smooth` function from the lesson 1 challenge pipeline and rewrite it as a Cython function with typed memoryviews.

The original Python version:

```python
def smooth(counts, window=11):
    result = []
    half   = window // 2
    for i in range(len(counts)):
        start = max(0, i - half)
        end   = min(len(counts), i + half + 1)
        result.append(sum(counts[start:end]) / (end - start))
    return result
```

Your Cython version should:

1. Accept a `double[:]` typed memoryview for `counts`
2. Use `cdef int` for all loop variables and indices
3. Use `cdef double` for the accumulator
4. Return a `np.ndarray`

```python file=cython_intro/fast_smooth.pyx
# fast_smooth.pyx — starter template
import numpy as np
cimport numpy as cnp

def smooth_cy(double[:] counts, int window=11):
    cdef int n    = counts.shape[0]
    cdef int half = window // 2
    cdef double[:] result = np.empty(n, dtype=np.float64)
    cdef int i, start, end, width
    cdef double acc

    for i in range(n):
        start = max(0, i - half)
        end   = min(n, i + half + 1)
        width = end - start
        acc   = 0.0
        for j in range(start, end):
            acc += counts[j]
        result[i] = acc / width

    return np.asarray(result)
```

Benchmark it against the pure Python version and confirm the result is identical.

```hints
nudge: Compile with `python setup.py build_ext --inplace` then `import fast_smooth`.
concept: Run `cython -a fast_smooth.pyx` and check that the inner loop is white (no Python).
shape: Expected speedup vs pure Python: 50–150× depending on window size.
- For even more speed: add `# cython: boundscheck=False, wraparound=False` at the top of the file.
```

```check
file cython_intro/fast_smooth.pyx
contains cython_intro/fast_smooth.pyx "double[:] counts"
contains cython_intro/fast_smooth.pyx "cdef double acc"
contains cython_intro/fast_smooth.pyx "smooth_cy"
```
