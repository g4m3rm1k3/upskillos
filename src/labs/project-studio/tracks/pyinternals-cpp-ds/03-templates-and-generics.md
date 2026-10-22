---
title: 3 — C++ Templates: How NumPy Supports All dtypes
track: C++ Data Structures Powering Data Science
trackOrder: 13
runtime: cpp
console: true
---

NumPy's `ndarray` can hold `float32`, `float64`, `int8`, `int16`, `int32`, `int64`, `complex128`, and more. If the NumPy team wrote a separate C function for each dtype, the codebase would be thousands of lines of copy-paste. Instead, they use **C++ templates**.

Templates are C++'s compile-time code generation mechanism. You write the logic once with a placeholder type `T`; the compiler stamps out type-specific versions automatically. This lesson teaches function templates, class templates, template specialisation, and `constexpr` — all through the NumPy/data-science lens.

## Step 1 — The type problem: writing `sum()` for every numeric type

**This step:** See the copy-paste pain that templates solve.

Without templates, supporting multiple types in C requires a function for each:

```c
/* C approach — four functions, same logic */
float  sum_float (const float*  a, int n) { float  s=0; for(int i=0;i<n;i++) s+=a[i]; return s; }
double sum_double(const double* a, int n) { double s=0; for(int i=0;i<n;i++) s+=a[i]; return s; }
int    sum_int   (const int*    a, int n) { int    s=0; for(int i=0;i<n;i++) s+=a[i]; return s; }
long   sum_long  (const long*   a, int n) { long   s=0; for(int i=0;i<n;i++) s+=a[i]; return s; }
```

NumPy's real dispatch table has ~20 dtypes. That's 20 copies of every operation. NumPy's C++ source avoids this with templates.

In Python, the same function handles any type automatically because Python is dynamically typed. Templates give C++ the same power at compile time:

```cpp
#include <iostream>

// Before templates: must explicitly call the right function
float  sum_float (const float*  a, int n) { float  s=0; for(int i=0;i<n;i++) s+=a[i]; return s; }
double sum_double(const double* a, int n) { double s=0; for(int i=0;i<n;i++) s+=a[i]; return s; }

int main() {
    float  fa[] = {1.f, 2.f, 3.f};
    double da[] = {1.0, 2.0, 3.0};
    std::cout << sum_float (fa, 3) << "\n";   // works
    std::cout << sum_double(da, 3) << "\n";   // works
    // No unified call — you must pick the right name manually
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step1 step1.cpp"
run "./step1" stdout="6"
```

The duplication is obvious. The next step eliminates it.

## Step 2 — Function templates: `template<typename T>`

**This step:** Replace all those copies with a single function template.

```cpp
#include <vector>
#include <iostream>

// One template, any numeric type
template <typename T>
T sum(const T* data, int n) {
    T total = T{};   // value-initialise: 0 for int, 0.0 for double
    for (int i = 0; i < n; ++i)
        total += data[i];
    return total;
}

// Also works with std::vector
template <typename T>
T vsum(const std::vector<T>& v) {
    return sum(v.data(), static_cast<int>(v.size()));
}

int main() {
    float  fa[] = {1.f, 2.f, 3.f};
    double da[] = {1.5, 2.5, 3.0};
    int    ia[] = {10, 20, 30};

    std::cout << "float sum:  " << sum(fa, 3) << "\n";  // 6
    std::cout << "double sum: " << sum(da, 3) << "\n";  // 7
    std::cout << "int sum:    " << sum(ia, 3) << "\n";  // 60

    std::vector<long> lv = {100L, 200L, 300L};
    std::cout << "long sum:   " << vsum(lv) << "\n";    // 600
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step2 step2.cpp"
run "./step2" stdout="float sum:  6"
run "./step2" stdout="double sum: 7"
run "./step2" stdout="int sum:    60"
run "./step2" stdout="long sum:   600"
```

The compiler sees `sum(fa, 3)` and instantiates `sum<float>`. It sees `sum(da, 3)` and instantiates `sum<double>`. The generated machine code is identical to the hand-written versions — no runtime overhead.

> **Python parallel:** In Python, `def sum(data):` works for any sequence of numbers via dynamic dispatch. Templates achieve the same flexibility at compile time, producing specialised, fast machine code for each type.

## Step 3 — Class templates: a generic array wrapper

**This step:** Create a class template `Array<T>` that wraps a contiguous buffer — a miniature NumPy ndarray.

```cpp
#include <vector>
#include <iostream>
#include <stdexcept>
#include <numeric>

template <typename T>
class Array {
public:
    std::vector<T> data;
    int size;

    explicit Array(int n, T fill = T{}) : data(n, fill), size(n) {}

    T& operator[](int i)       { return data[i]; }
    T  operator[](int i) const { return data[i]; }

    // Element-wise addition — returns same type
    Array<T> operator+(const Array<T>& other) const {
        if (size != other.size) throw std::runtime_error("size mismatch");
        Array<T> out(size);
        for (int i = 0; i < size; ++i) out[i] = data[i] + other.data[i];
        return out;
    }

    T sum() const {
        return std::accumulate(data.begin(), data.end(), T{});
    }

    double mean() const {
        return static_cast<double>(sum()) / size;
    }

    void print() const {
        for (int i = 0; i < size; ++i)
            std::cout << data[i] << (i+1<size ? " " : "\n");
    }
};

int main() {
    Array<double> a(4, 1.0);   // [1, 1, 1, 1]
    Array<double> b(4, 2.0);   // [2, 2, 2, 2]
    auto c = a + b;
    c.print();                 // 3 3 3 3
    std::cout << "mean: " << c.mean() << "\n";  // 3

    Array<int> iv(5);
    for (int i = 0; i < 5; ++i) iv[i] = i + 1;
    std::cout << "int sum: " << iv.sum() << "\n";  // 15
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step3 step3.cpp"
run "./step3" stdout="3 3 3 3"
run "./step3" stdout="mean: 3"
run "./step3" stdout="int sum: 15"
```

`Array<double>` and `Array<int>` are separate compiled classes with no shared runtime overhead. NumPy's internal `PyArrayObject` follows this same pattern, with dtype stored as a field rather than a template parameter (because Python needs runtime flexibility).

## Step 4 — Template specialisation for special cases

**This step:** Override the template for a specific type when the general logic doesn't fit.

Sometimes a generic template is wrong for one type. For example, summing `bool` values should count `true`s — but `bool + bool` in C++ wraps at 2. Template **specialisation** lets you write a type-specific override:

```cpp
#include <vector>
#include <iostream>

// Primary (generic) template
template <typename T>
T sum(const std::vector<T>& v) {
    T total = T{};
    for (auto x : v) total += x;
    return total;
}

// Full specialisation for bool — count true values
template <>
int sum<bool>(const std::vector<bool>& v) {
    int count = 0;
    for (bool b : v) count += b ? 1 : 0;
    return count;
}

int main() {
    std::vector<double> dv = {1.1, 2.2, 3.3};
    std::cout << "double sum: " << sum(dv) << "\n";  // 6.6

    std::vector<bool> bv = {true, false, true, true, false};
    std::cout << "true count: " << sum(bv) << "\n";  // 3 (not 1 from overflow)
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step4 step4.cpp"
run "./step4" stdout="double sum: 6.6"
run "./step4" stdout="true count: 3"
```

NumPy uses the same idea: the generic `ufunc` loop handles most dtypes, but `bool` and `complex128` have hand-written specialisations in the C++ source.

## Step 5 — `constexpr`: compile-time constants

**This step:** Use `constexpr` to compute values at compile time — the C++ equivalent of Python's compile-time constants.

`constexpr` tells the compiler: "this value is known at compile time — compute it during compilation, not at runtime."

```cpp
#include <iostream>
#include <array>

// constexpr function — computed at compile time if inputs are constant
constexpr int dtype_size(int dtype_code) {
    // Mimic NumPy dtype item sizes:
    // 0=int8, 1=int16, 2=int32, 3=int64, 4=float32, 5=float64
    constexpr int sizes[] = {1, 2, 4, 8, 4, 8};
    return sizes[dtype_code];
}

// constexpr variable — computed at compile time
constexpr int FLOAT64_SIZE  = dtype_size(5);  // 8
constexpr int FLOAT32_SIZE  = dtype_size(4);  // 4

// Compile-time power of 2 (useful for buffer sizing)
constexpr int pow2(int n) {
    return n == 0 ? 1 : 2 * pow2(n - 1);
}

int main() {
    std::cout << "float64 bytes: " << FLOAT64_SIZE << "\n";  // 8
    std::cout << "float32 bytes: " << FLOAT32_SIZE << "\n";  // 4

    // std::array size must be a compile-time constant
    constexpr int BUF_SIZE = pow2(10);   // 1024
    std::array<double, BUF_SIZE> buf{};
    std::cout << "buffer size: " << buf.size() << "\n";  // 1024
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step5 step5.cpp"
run "./step5" stdout="float64 bytes: 8"
run "./step5" stdout="float32 bytes: 4"
run "./step5" stdout="buffer size: 1024"
```

> **Python parallel:** Python has `__debug__` and `PYTHONOPTIMIZE`, but lacks compile-time evaluation. Python 3.12 added `@typing.final` for some static analysis, but nothing as powerful as `constexpr`. C++ `constexpr` allows zero-cost constants that are baked into the binary.

NumPy's C++ uses `constexpr` for alignment constants, SIMD lane widths, and dtype byte sizes — values that must be known at compile time to generate the fastest possible code.

## Step 6 — Challenge: template a `clip()` function like `np.clip`

**This step:** Write a function template `clip(v, low, high)` that works for `int`, `float`, and `double`.

`np.clip(a, 0.0, 1.0)` clamps every element between 0 and 1. Implement the C++ equivalent:

Requirements:
- `clip(value, low, high)` returns `low` if `value < low`, `high` if `value > high`, else `value`
- `clip_array(arr, low, high)` clips a `std::vector<T>` element-wise, returning a new vector
- Test with doubles `{-1.0, 0.5, 1.5, 2.0}` clipped to `[0.0, 1.0]` → should print `0 0.5 1 1`
- Test with ints `{-5, 3, 7, 10}` clipped to `[0, 5]` → should print `0 3 5 5`

```cpp
#include <vector>
#include <iostream>
#include <algorithm>

// TODO: implement clip<T> and clip_array<T>

int main() {
    std::vector<double> dv = {-1.0, 0.5, 1.5, 2.0};
    auto dc = clip_array(dv, 0.0, 1.0);
    for (double x : dc) std::cout << x << " ";
    std::cout << "\n";   // 0 0.5 1 1

    std::vector<int> iv = {-5, 3, 7, 10};
    auto ic = clip_array(iv, 0, 5);
    for (int x : ic) std::cout << x << " ";
    std::cout << "\n";   // 0 3 5 5
}
```

```hints
nudge: Use `std::max` and `std::min` — both are templated in `<algorithm>`.
concept: `clip(v, lo, hi)` = `std::max(lo, std::min(hi, v))`.
shape: The `clip_array` function template signature is `template<typename T> std::vector<T> clip_array(const std::vector<T>&, T, T)`.
```

```check
run "g++ -std=c++17 -O2 -o step6 step6.cpp"
run "./step6" stdout="0 0.5 1 1"
run "./step6" stdout="0 3 5 5"
```

You now understand how templates give NumPy its multi-dtype power without code duplication. The next lesson covers STL containers — the hash maps and sorted arrays that underpin pandas.
