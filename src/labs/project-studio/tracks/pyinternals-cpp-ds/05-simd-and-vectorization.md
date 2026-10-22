---
title: 5 — SIMD Vectorization: Why NumPy Beats a Python Loop by 100×
track: C++ Data Structures Powering Data Science
trackOrder: 13
runtime: cpp
console: true
---

You've probably heard: "Don't write Python loops over arrays — use NumPy." The reason is simple: a Python loop can do ~10 million iterations per second; NumPy can process ~1 billion elements per second on the same hardware. That's a 100× gap — sometimes more.

This lesson explains the full picture: why Python loops are slow (bytecode, reference counting, dynamic dispatch), what **SIMD** is, how the C++ compiler auto-vectorises loops with `-O2`, what alignment and `__restrict__` do, and how NumPy exploits all of this.

## Step 1 — Python loop vs NumPy: time them

**This step:** Establish the baseline by understanding the Python execution overhead (conceptually) and see a C++ equivalent.

A Python loop over 10 million floats is slow for three reasons:

1. **Bytecode interpretation:** Each iteration goes through CPython's eval loop (~50–100 ns overhead per step)
2. **Reference counting:** Every float read/write touches the object's `ob_refcnt` field
3. **Dynamic dispatch:** `a[i] + b[i]` calls `float.__add__` → CPython dispatches through the type system

```python
# Python: ~10 M iterations/sec
import time
n = 10_000_000
a = [1.0] * n
b = [2.0] * n
t = time.perf_counter()
c = [a[i] + b[i] for i in range(n)]  # pure Python
print(f"Python: {time.perf_counter()-t:.3f}s")

# NumPy: ~1 B elements/sec (calls C++ SIMD kernel)
import numpy as np
a_np = np.ones(n, dtype=np.float64)
b_np = np.full(n, 2.0)
t = time.perf_counter()
c_np = a_np + b_np
print(f"NumPy:  {time.perf_counter()-t:.4f}s")
```

In C++, the equivalent tight loop (with `-O2`) gets auto-vectorised. Let's time it:

```cpp
#include <vector>
#include <iostream>
#include <chrono>

int main() {
    const int N = 10'000'000;
    std::vector<double> a(N, 1.0), b(N, 2.0), c(N);

    auto t0 = std::chrono::high_resolution_clock::now();

    // The compiler vectorises this with -O2
    for (int i = 0; i < N; ++i)
        c[i] = a[i] + b[i];

    auto t1 = std::chrono::high_resolution_clock::now();
    double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();

    std::cout << "C++ add: " << ms << " ms\n";
    std::cout << "c[0]=" << c[0] << " c[N-1]=" << c[N-1] << "\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step1 step1.cpp"
run "./step1" stdout="C++ add:"
run "./step1" stdout="c[0]=3"
run "./step1" stdout="c[N-1]=3"
```

The C++ version completes in a few milliseconds. The NumPy equivalent is similar — because NumPy calls the same kind of auto-vectorised C++ kernel internally.

## Step 2 — What SIMD is: processing 4 or 8 floats in one instruction

**This step:** Understand SIMD conceptually and which instruction sets NumPy targets.

**SIMD** stands for *Single Instruction, Multiple Data*. Modern CPUs have wide registers:

```text
Scalar add (x87/SSE scalar):
  [a0] + [b0] → [c0]                          (1 double per instruction)

SSE2 (128-bit register, 2 doubles):
  [a0][a1] + [b0][b1] → [c0][c1]              (2 doubles per instruction)

AVX (256-bit register, 4 doubles):
  [a0][a1][a2][a3] + [b0][b1][b2][b3] → [c0][c1][c2][c3]  (4 doubles)

AVX-512 (512-bit, 8 doubles):
  [a0]...[a7] + [b0]...[b7] → [c0]...[c7]    (8 doubles per instruction)
```

NumPy's configure step checks for AVX2, AVX-512, SSE4.2 and selects the widest available. At runtime `np.add` dispatches to the appropriate SIMD kernel.

You don't have to write SIMD intrinsics by hand — the compiler does it for you when:
1. Optimisation is enabled (`-O2` or `-O3`)
2. The loop is simple (no data dependencies, no function calls)
3. The data is aligned and non-aliasing

```text
NumPy's dtype dispatch flow:
np.add(a, b)
  → ufunc dispatch (Python/C boundary)
  → type resolution (float64 kernel)
  → innerloop: add_avx2_double(a.data, b.data, out.data, n)
               └─ compiled with -march=native -O3 -ffast-math
```

## Step 3 — Write a C++ dot product that auto-vectorises with `-O2`

**This step:** Write a loop that the compiler turns into SIMD instructions.

```cpp
#include <vector>
#include <iostream>
#include <chrono>
#include <random>

double dot_product(const double* a, const double* b, int n) {
    double sum = 0.0;
    // This loop has no cross-iteration dependency on *a or *b,
    // so the compiler can process 4 elements per AVX instruction.
    for (int i = 0; i < n; ++i)
        sum += a[i] * b[i];
    return sum;
}

int main() {
    const int N = 8'000'000;
    std::vector<double> a(N), b(N);

    std::mt19937_64 rng(42);
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    for (int i = 0; i < N; ++i) { a[i] = dist(rng); b[i] = dist(rng); }

    auto t0 = std::chrono::high_resolution_clock::now();
    double result = dot_product(a.data(), b.data(), N);
    auto t1 = std::chrono::high_resolution_clock::now();

    double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    std::cout << "dot product: " << result << "\n";
    std::cout << "time: " << ms << " ms\n";
    std::cout << "throughput: " << (2.0 * N / ms / 1e6) << " GFLOP/s\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step3 step3.cpp"
run "./step3" stdout="dot product:"
run "./step3" stdout="time:"
run "./step3" stdout="throughput:"
```

> To see the assembly and verify SIMD instructions were generated, run:
> `g++ -std=c++17 -O2 -S -o step3.s step3.cpp && grep -i vmulpd step3.s`
> `vmulpd` is the AVX packed double-multiply instruction. If it appears, the loop was vectorised.

## Step 4 — Alignment: why NumPy uses `aligned_alloc`

**This step:** Understand why aligned memory makes SIMD faster and how NumPy ensures it.

AVX instructions that load 32 bytes are fastest when the data address is a multiple of 32 bytes. Misaligned loads incur a penalty (or crash on older hardware).

NumPy allocates buffers with 64-byte alignment (matching a CPU cache line):

```cpp
#include <cstdlib>
#include <cstdint>
#include <iostream>
#include <new>

int main() {
    const int N = 1024;

    // Standard allocation — no alignment guarantee
    double* unaligned = new double[N];
    std::cout << "unaligned address: " << (uintptr_t)unaligned % 64
              << " bytes off 64-byte boundary\n";

    // Aligned allocation — 64-byte boundary (NumPy uses this)
    double* aligned = static_cast<double*>(
        std::aligned_alloc(64, N * sizeof(double)));
    if (!aligned) throw std::bad_alloc();

    std::cout << "aligned address mod 64: " << (uintptr_t)aligned % 64 << "\n";  // 0

    // Use the buffer
    for (int i = 0; i < N; ++i) aligned[i] = static_cast<double>(i);
    double sum = 0;
    for (int i = 0; i < N; ++i) sum += aligned[i];
    std::cout << "sum: " << sum << "\n";

    std::free(aligned);
    delete[] unaligned;
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step4 step4.cpp"
run "./step4" stdout="aligned address mod 64: 0"
run "./step4" stdout="sum:"
```

NumPy's `numpy/core/src/multiarray/alloc.c` uses `PyDataMem_NEW` which wraps `_aligned_malloc` on Windows and `posix_memalign` on Linux — both guarantee 64-byte alignment. This is why NumPy arrays are safe to pass directly to SIMD intrinsics.

## Step 5 — The `restrict` keyword: no aliasing = better vectorization

**This step:** Tell the compiler that two pointers don't alias, enabling more aggressive SIMD.

A key barrier to auto-vectorisation is **aliasing**: the compiler doesn't know if `a` and `out` point to the same memory. If they do, changing `out[0]` changes what `a[1]` reads — so the loop can't be parallelised.

The C99 `__restrict__` keyword (and C++ extension) promises the compiler: "these pointers don't overlap."

```cpp
#include <vector>
#include <iostream>
#include <chrono>

// Without restrict: compiler assumes a and out might alias
void scale_no_restrict(const double* a, double* out, double factor, int n) {
    for (int i = 0; i < n; ++i)
        out[i] = a[i] * factor;
}

// With __restrict__: compiler knows no aliasing → better vectorisation
void scale_restrict(const double* __restrict__ a,
                    double*       __restrict__ out,
                    double factor, int n) {
    for (int i = 0; i < n; ++i)
        out[i] = a[i] * factor;
}

int main() {
    const int N = 10'000'000;
    std::vector<double> a(N, 2.5), out(N);

    auto bench = [&](auto fn, const char* name) {
        auto t0 = std::chrono::high_resolution_clock::now();
        fn(a.data(), out.data(), 3.0, N);
        auto t1 = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(t1-t0).count();
        std::cout << name << ": " << ms << " ms, out[0]=" << out[0] << "\n";
    };

    bench(scale_no_restrict, "no restrict");
    bench(scale_restrict,    "restrict   ");
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step5 step5.cpp"
run "./step5" stdout="no restrict:"
run "./step5" stdout="restrict   :"
run "./step5" stdout="out[0]=7.5"
```

NumPy's ufunc inner loops mark all array pointers with `__restrict__`, which is one reason NumPy consistently outperforms naive C loops. The compiler generates stores and loads without defensive reload barriers.

## Step 6 — Challenge: write an auto-vectorising element-wise exp approximation

**This step:** Write a fast element-wise approximation of `exp(x)` that the compiler can vectorise.

The standard `std::exp` is not always vectorised (it calls a library function). A polynomial approximation of `e^x` for `x ∈ [-1, 1]` can be:

$$e^x \approx 1 + x + \frac{x^2}{2} + \frac{x^3}{6} + \frac{x^4}{24}$$

Requirements:
- Write `void fast_exp(const double* __restrict__ in, double* __restrict__ out, int n)` that applies this approximation element-wise
- The loop must have no function calls (so the compiler can vectorise it)
- Test on `{0.0, 0.5, -0.5, 1.0, -1.0}` and compare to `std::exp` output
- Print the max absolute error

```cpp
#include <vector>
#include <iostream>
#include <cmath>
#include <algorithm>

void fast_exp(const double* __restrict__ in,
              double*       __restrict__ out, int n) {
    // TODO: implement polynomial approximation (degree 4)
    // No std::exp allowed inside this function
}

int main() {
    std::vector<double> x = {0.0, 0.5, -0.5, 1.0, -1.0};
    std::vector<double> out(x.size()), ref(x.size());

    fast_exp(x.data(), out.data(), x.size());
    for (int i = 0; i < (int)x.size(); ++i) ref[i] = std::exp(x[i]);

    double max_err = 0;
    for (int i = 0; i < (int)x.size(); ++i) {
        double err = std::abs(out[i] - ref[i]);
        max_err = std::max(max_err, err);
        std::cout << "x=" << x[i] << " approx=" << out[i]
                  << " ref=" << ref[i] << "\n";
    }
    std::cout << "max_error: " << max_err << "\n";
}
```

```hints
nudge: Use `1.0 + x + x*x/2.0 + x*x*x/6.0 + x*x*x*x/24.0` — all multiplication, no branches.
concept: Precompute `x2 = x[i]*x[i]` and `x3 = x2*x[i]` to avoid redundant multiplications.
shape: The max absolute error for |x| ≤ 1 should be around 0.01 (degree-4 Maclaurin).
- To confirm vectorisation: `g++ -O2 -S step6.cpp -o step6.s && grep vmulpd step6.s`
```

```check
run "g++ -std=c++17 -O2 -o step6 step6.cpp"
run "./step6" stdout="x=0"
run "./step6" stdout="max_error:"
```

You've now seen the full picture of why NumPy is fast: Python loop overhead, SIMD instruction sets, compiler auto-vectorisation, aligned allocation, and pointer aliasing. The final lesson takes you inside PyTorch's C++ engine to see how all of this comes together in a real framework.
