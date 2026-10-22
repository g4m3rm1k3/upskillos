---
title: 1 — Why C++ Instead of C for Data Science Libraries
track: C++ Data Structures Powering Data Science
trackOrder: 13
runtime: cpp
console: true
---

You've used NumPy to add two arrays in a single line. You've loaded a gigabyte CSV into pandas in seconds. You may have even trained a neural network in PyTorch. But have you wondered what language is doing all that heavy lifting underneath Python?

The answer is **C++** — not plain C, and not Python. NumPy's core (`numpy/core/src/multiarray`), pandas' internals, scikit-learn's hot paths, and PyTorch's tensor engine (ATen) are all written in C++. This track explains *why*, and teaches you the C++ features that make those libraries possible.

In this lesson you'll learn what C++ adds over C that specifically matters for data science libraries: templates, RAII, `std::vector`, operator overloading, and namespaces.

## Step 1 — What NumPy, pandas, and scikit-learn actually use

**This step:** Explore where C++ lives in the Python data-science stack.

When you run `import numpy`, Python loads a shared library (`.so` on Linux, `.pyd` on Windows). That library was compiled from C++. Here's the rough call chain for `np.add(a, b)`:

```text
Python bytecode  →  CPython C API  →  NumPy pybind11/C extension
    →  C++ template dispatch  →  SIMD kernel (AVX2 / SSE4)
```

Plain **C** could handle the CPython extension boundary, but the moment you need:

- A function that works on `float32`, `float64`, `int32`, and `int64` without copy-pasting code → you need **templates**
- Automatic cleanup of heap-allocated buffers even if an exception is thrown → you need **RAII**
- Writing `a + b` for a custom array class → you need **operator overloading**

None of those exist in C. That's why the scientific Python ecosystem chose C++.

```cpp
// A tiny taste: this is conceptually how NumPy's ufunc dispatch works.
// The real code is more complex, but the pattern is the same.
template <typename T>
void add_arrays(const T* a, const T* b, T* out, std::size_t n) {
    for (std::size_t i = 0; i < n; ++i)
        out[i] = a[i] + b[i];
}
// One function, works for float, double, int, long — no copy-paste.
```

In Python terms, this is like writing:

```python
def add_arrays(a, b):          # Python is dynamically typed —
    return [x + y for x, y in zip(a, b)]  # one function, any type
```

C++ templates give you the same flexibility *at compile time*, so the CPU sees fully specialised, type-safe machine code.

## Step 2 — `std::vector<double>` vs Python list — in-memory layout

**This step:** Understand why `std::vector` is a key data-science primitive.

In Python, a list stores **pointers** to heap-allocated Python objects:

```text
Python list: [ptr→PyObject(1.0), ptr→PyObject(2.0), ptr→PyObject(3.0)]
              ↑ each object has a refcount, type pointer, and value
```

Every element lives somewhere else in memory. Iterating the list means chasing 64-bit pointers all over the heap — bad for CPU cache.

`std::vector<double>` stores values **contiguously**:

```text
std::vector<double>: [1.0][2.0][3.0][4.0]  ← packed 8 bytes each
                      ↑ one allocation, values side-by-side
```

This is exactly how NumPy's `ndarray` stores data. The SIMD hardware can load 4 doubles at once from a single cache line (64 bytes = 8 doubles).

```cpp file=step2.cpp
```

```cpp
#include <vector>
#include <iostream>

int main() {
    std::vector<double> v = {1.0, 2.0, 3.0, 4.0, 5.0};

    // Size and capacity
    std::cout << "size:     " << v.size()     << "\n";  // 5
    std::cout << "capacity: " << v.capacity() << "\n";  // ≥5

    // Contiguous in memory — pointer arithmetic works
    double* raw = v.data();
    for (std::size_t i = 0; i < v.size(); ++i)
        std::cout << raw[i] << " ";
    std::cout << "\n";

    // Push doubles back — vector grows automatically (amortised O(1))
    v.push_back(6.0);
    std::cout << "new size: " << v.size() << "\n";

    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step2 step2.cpp"
run "./step2" stdout="size:     5"
run "./step2" stdout="6.0"
```

> **Python parallel:** `list.append()` is also amortised O(1) for the same reason — Python lists over-allocate by ~12.5 % when they grow.

## Step 3 — Templates: write a function that works on any numeric type

**This step:** Write your first function template and see how it replaces copy-pasted C functions.

In C you'd write `sum_float`, `sum_double`, `sum_int` separately. C++ templates let the compiler generate those for you:

```cpp
#include <vector>
#include <iostream>

// T is a placeholder type — the compiler fills it in at call sites
template <typename T>
T sum(const std::vector<T>& v) {
    T total = T{};   // zero-initialise: 0 for int, 0.0 for double
    for (const T& x : v)
        total += x;
    return total;
}

int main() {
    std::vector<double> d = {1.5, 2.5, 3.0};
    std::vector<int>    i = {1, 2, 3, 4};

    std::cout << "double sum: " << sum(d) << "\n";  // 7
    std::cout << "int sum:    " << sum(i) << "\n";  // 10
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step3 step3.cpp"
run "./step3" stdout="double sum: 7"
run "./step3" stdout="int sum:    10"
```

The compiler instantiates `sum<double>` and `sum<int>` separately — each is a fully optimised, type-specific function. Python achieves the same dynamism at runtime via duck typing; templates achieve it at compile time.

## Step 4 — RAII: the C++ pattern behind Python context managers

**This step:** Understand RAII and see how it maps to Python's `with` statement.

In Python, `with open('file') as f:` guarantees the file is closed when the block exits — even if an exception is thrown. That's **context managers**.

C++ achieves the same with **RAII** (Resource Acquisition Is Initialization): a resource is tied to an object's lifetime. When the object goes out of scope, its **destructor** runs automatically.

```cpp
#include <iostream>
#include <fstream>

// std::ifstream is RAII: file opens in the constructor,
// closes in the destructor — no explicit close() needed.
void read_header(const std::string& path) {
    std::ifstream file(path);   // constructor opens the file
    if (!file) {
        std::cerr << "Cannot open " << path << "\n";
        return;   // destructor closes the file here automatically
    }
    std::string line;
    std::getline(file, line);
    std::cout << "First line: " << line << "\n";
}   // destructor closes the file here automatically

int main() {
    // Write a temp file then read it
    {
        std::ofstream out("temp.csv");
        out << "col_a,col_b\n1,2\n3,4\n";
    }   // out destroyed here — file flushed and closed

    read_header("temp.csv");
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step4 step4.cpp"
run "./step4" stdout="First line: col_a,col_b"
```

NumPy's memory buffers, PyTorch's CUDA tensors, and pandas' memory-mapped files all rely on RAII. When the C++ object holding a GPU buffer is destroyed, the destructor calls `cudaFree` — just like Python's `__exit__` calls `file.close()`.

## Step 5 — Operator overloading (how NumPy's `+` is really C++ `operator+`)

**This step:** Implement `operator+` for a tiny array class, mirroring what NumPy does.

When you write `a + b` in Python for two NumPy arrays, Python calls `a.__add__(b)`. In C++, the same concept is **operator overloading**:

```cpp
#include <vector>
#include <iostream>
#include <stdexcept>

struct Vec {
    std::vector<double> data;

    Vec(std::initializer_list<double> il) : data(il) {}

    // Overload + so Vec + Vec works element-wise
    Vec operator+(const Vec& other) const {
        if (data.size() != other.data.size())
            throw std::runtime_error("size mismatch");
        Vec result = *this;
        for (std::size_t i = 0; i < data.size(); ++i)
            result.data[i] += other.data[i];
        return result;
    }

    void print() const {
        for (double x : data) std::cout << x << " ";
        std::cout << "\n";
    }
};

int main() {
    Vec a = {1.0, 2.0, 3.0};
    Vec b = {4.0, 5.0, 6.0};
    Vec c = a + b;   // calls operator+
    c.print();       // 5 7 9
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step5 step5.cpp"
run "./step5" stdout="5 7 9"
```

NumPy's real `operator+` dispatches to a SIMD kernel, but the overloading mechanism is identical to this example. The Python `__add__` and C++ `operator+` are the same idea in two languages.

## Step 6 — Challenge: template a statistics function

**This step:** Write a `mean<T>()` function template that works for both `int` and `double` vectors.

Requirements:
- Accept a `const std::vector<T>&`
- Return a `double` regardless of input type (integer mean should still be a decimal)
- Print the mean of `{1, 2, 3, 4, 5}` (int) and `{1.5, 2.5, 3.5}` (double)

```cpp
#include <vector>
#include <iostream>

// TODO: write the mean<T> template here

int main() {
    std::vector<int>    vi = {1, 2, 3, 4, 5};
    std::vector<double> vd = {1.5, 2.5, 3.5};

    std::cout << "int mean:    " << mean(vi) << "\n";   // 3
    std::cout << "double mean: " << mean(vd) << "\n";   // 2.5
    return 0;
}
```

```hints
nudge: The return type should be `double`, not `T`.
concept: Use `static_cast<double>` when summing so integer division is avoided.
shape: `T total = T{};` zero-initialises for any numeric type.
```

```check
run "g++ -std=c++17 -O2 -o step6 step6.cpp"
run "./step6" stdout="int mean:    3"
run "./step6" stdout="double mean: 2.5"
```

You've now seen the four pillars that make C++ the language of data science libraries: **templates** (generic code), **RAII** (automatic resource management), **operator overloading** (natural math syntax), and **`std::vector`** (contiguous, cache-friendly storage). The next lesson dives deeper into how array memory layout makes NumPy's O(1) slicing possible.
