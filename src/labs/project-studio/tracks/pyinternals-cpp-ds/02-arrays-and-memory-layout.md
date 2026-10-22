---
title: 2 — Array Memory Layouts: How NumPy Slicing is O(1)
track: C++ Data Structures Powering Data Science
trackOrder: 13
runtime: cpp
console: true
---

When you slice a NumPy array with `a[1:3, :]`, no data is copied. NumPy returns a **view** — a new array header pointing into the same memory with adjusted strides. This O(1) trick is why NumPy slicing is blazing fast even for gigabyte arrays.

To understand it you need to understand how a 2D array is stored in a 1D block of memory, what **strides** are, and why the CPU cares about memory layout. This lesson builds that understanding in C++, which is exactly how NumPy's C++ source implements it.

## Step 1 — A 2D array in memory: row-major layout

**This step:** Visualise how a 2×3 matrix maps to a flat array using row-major (C) order.

A matrix looks 2D on paper, but memory is 1D. The question is *which order* the elements are stored in.

**Row-major** (C order, used by NumPy by default): row 0 first, then row 1:

```text
Matrix:        Memory (row-major):
  1  2  3      [1][2][3][4][5][6]
  4  5  6       ^row0^  ^row1^

Element [r][c] → memory index: r * ncols + c
```

**Column-major** (Fortran/F order): column 0 first, then column 1:

```text
Matrix:        Memory (column-major):
  1  2  3      [1][4][2][5][3][6]
  4  5  6       ^col0^ ^col1^ ^col2^

Element [r][c] → memory index: c * nrows + r
```

```cpp
#include <iostream>

int main() {
    // 2×3 matrix in a 1D C-array (row-major)
    double data[6] = {1, 2, 3, 4, 5, 6};
    const int nrows = 2, ncols = 3;

    std::cout << "Row-major layout:\n";
    for (int r = 0; r < nrows; ++r) {
        for (int c = 0; c < ncols; ++c)
            std::cout << data[r * ncols + c] << " ";
        std::cout << "\n";
    }
    // Shows: 1 2 3 / 4 5 6
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step1 step1.cpp"
run "./step1" stdout="1 2 3"
run "./step1" stdout="4 5 6"
```

This formula `r * ncols + c` is the simplest stride calculation. NumPy generalises it to N dimensions using a **stride array**.

## Step 2 — Implement a 2D array with a 1D buffer and strides in C++

**This step:** Build a `Matrix` class that uses explicit strides so you can later implement O(1) slicing.

A stride is the number of **bytes** (or elements) you skip in memory to advance by one position in a given dimension.

For a row-major `(nrows, ncols)` matrix of `double` (8 bytes each):
- Row stride: `ncols * sizeof(double)` bytes → advance one row
- Col stride: `sizeof(double)` bytes → advance one column

```cpp
#include <vector>
#include <iostream>
#include <stdexcept>

class Matrix {
public:
    int nrows, ncols;
    std::vector<double> buf;   // the 1D backing buffer
    int row_stride;            // elements to skip per row
    int col_stride;            // elements to skip per col

    Matrix(int r, int c) : nrows(r), ncols(c), buf(r * c, 0.0),
        row_stride(c), col_stride(1) {}

    double& at(int r, int c) {
        if (r < 0 || r >= nrows || c < 0 || c >= ncols)
            throw std::out_of_range("index out of range");
        return buf[r * row_stride + c * col_stride];
    }

    void print() const {
        for (int r = 0; r < nrows; ++r) {
            for (int c = 0; c < ncols; ++c)
                std::cout << const_cast<Matrix*>(this)->at(r, c) << " ";
            std::cout << "\n";
        }
    }
};

int main() {
    Matrix m(3, 4);
    // Fill with row*10 + col
    for (int r = 0; r < 3; ++r)
        for (int c = 0; c < 4; ++c)
            m.at(r, c) = r * 10 + c;

    m.print();
    std::cout << "Element [1][2]: " << m.at(1, 2) << "\n";  // 12
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step2 step2.cpp"
run "./step2" stdout="Element [1][2]: 12"
run "./step2" stdout="0 1 2 3"
```

Notice `row_stride` and `col_stride` are stored alongside the pointer — exactly what NumPy's `ndarray` struct stores: `data`, `shape`, `strides`, and `dtype`.

## Step 3 — Column-major layout: what Fortran (and LAPACK) use

**This step:** Understand column-major order and why LAPACK (used by NumPy's `linalg`) uses it.

NumPy's `np.linalg` calls LAPACK, which was written in Fortran. Fortran stores matrices in **column-major** order. When NumPy passes a row-major array to LAPACK it may need to transpose — or use `np.asfortranarray()` to avoid the copy.

```cpp
#include <vector>
#include <iostream>

// Column-major matrix: element [r][c] at index c*nrows + r
class FortranMatrix {
public:
    int nrows, ncols;
    std::vector<double> buf;

    FortranMatrix(int r, int c) : nrows(r), ncols(c), buf(r * c) {}

    double& at(int r, int c) { return buf[c * nrows + r]; }

    void print_memory_order() const {
        std::cout << "Memory order: ";
        for (double v : buf) std::cout << v << " ";
        std::cout << "\n";
    }
};

int main() {
    FortranMatrix m(2, 3);
    // Fill with sequential values row by row
    int v = 1;
    for (int r = 0; r < 2; ++r)
        for (int c = 0; c < 3; ++c)
            m.at(r, c) = v++;

    // Print the matrix (looks the same)
    for (int r = 0; r < 2; ++r) {
        for (int c = 0; c < 3; ++c)
            std::cout << m.at(r, c) << " ";
        std::cout << "\n";
    }
    // But memory layout is column-first:
    m.print_memory_order();   // 1 4 2 5 3 6  (column 0 then column 1 ...)
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step3 step3.cpp"
run "./step3" stdout="1 2 3"
run "./step3" stdout="Memory order: 1 4 2 5 3 6"
```

The raw memory `1 4 2 5 3 6` confirms column-major storage: both elements of column 0 (`1, 4`) come before column 1 (`2, 5`). This is why `np.asfortranarray()` exists — it reorders bytes so LAPACK doesn't have to.

## Step 4 — NumPy's stride trick: slicing without copying

**This step:** Implement O(1) row and column slices by adjusting the pointer and strides only.

A **view** shares memory with the original. Only the header (pointer offset, shape, strides) changes:

```cpp
#include <vector>
#include <iostream>

struct View {
    double* base;       // pointer into the shared buffer
    int nrows, ncols;
    int row_stride;     // elements to skip per row
    int col_stride;     // elements to skip per col

    double& at(int r, int c) {
        return base[r * row_stride + c * col_stride];
    }

    void print() {
        for (int r = 0; r < nrows; ++r) {
            for (int c = 0; c < ncols; ++c)
                std::cout << at(r, c) << " ";
            std::cout << "\n";
        }
    }
};

int main() {
    // 4×4 row-major matrix in a flat buffer
    std::vector<double> buf(16);
    for (int i = 0; i < 16; ++i) buf[i] = i;

    const int N = 4;
    // Full matrix view
    View full{buf.data(), N, N, N, 1};
    std::cout << "Full matrix:\n"; full.print();

    // Row slice: rows 1..2  — O(1): just move base pointer
    View row_slice{buf.data() + 1 * N, 2, N, N, 1};
    std::cout << "Rows 1-2:\n"; row_slice.print();

    // Column slice: every other column — O(1): change col_stride
    View col_stride_view{buf.data(), N, 2, N, 2};
    std::cout << "Every other column:\n"; col_stride_view.print();

    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step4 step4.cpp"
run "./step4" stdout="Full matrix:"
run "./step4" stdout="Rows 1-2:"
run "./step4" stdout="Every other column:"
```

This is **exactly** what `a[1:3, ::2]` does in NumPy: it adjusts `data`, `shape`, and `strides` in the array header — zero bytes are copied.

## Step 5 — Cache line effects: benchmark row vs column traversal

**This step:** Measure the speed difference between row-wise and column-wise iteration over a large matrix.

A CPU cache line is 64 bytes = 8 doubles. Row-major traversal reads a full cache line in order; column-major traversal skips `ncols * 8` bytes per access — a **cache miss** each time.

```cpp
#include <vector>
#include <iostream>
#include <chrono>

int main() {
    const int N = 2000;
    std::vector<double> mat(N * N, 1.0);

    // Row-wise traversal (cache-friendly for row-major)
    auto t0 = std::chrono::high_resolution_clock::now();
    double sum_row = 0;
    for (int r = 0; r < N; ++r)
        for (int c = 0; c < N; ++c)
            sum_row += mat[r * N + c];
    auto t1 = std::chrono::high_resolution_clock::now();

    // Column-wise traversal (cache-unfriendly for row-major)
    double sum_col = 0;
    for (int c = 0; c < N; ++c)
        for (int r = 0; r < N; ++r)
            sum_col += mat[r * N + c];
    auto t2 = std::chrono::high_resolution_clock::now();

    auto ms_row = std::chrono::duration_cast<std::chrono::microseconds>(t1-t0).count();
    auto ms_col = std::chrono::duration_cast<std::chrono::microseconds>(t2-t1).count();

    std::cout << "Row-wise:    " << ms_row << " us (sum=" << sum_row << ")\n";
    std::cout << "Column-wise: " << ms_col << " us (sum=" << sum_col << ")\n";
    std::cout << "Ratio: " << (double)ms_col / ms_row << "x slower\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -O2 -o step5 step5.cpp"
run "./step5" stdout="Row-wise:"
run "./step5" stdout="Column-wise:"
run "./step5" stdout="Ratio:"
```

On a typical laptop you'll see column-wise taking 3–10× longer. This is why `np.ascontiguousarray()` exists: before passing a transposed (Fortran-order) array into a SIMD kernel, NumPy makes it row-major so traversal is cache-friendly.

## Step 6 — Challenge: implement a matrix transpose using strides

**This step:** Implement `transpose()` as an O(1) operation by swapping strides — no data movement.

Extend the `View` struct from Step 4. A transpose swaps rows↔columns in the header only:
- Swap `nrows` ↔ `ncols`
- Swap `row_stride` ↔ `col_stride`

Requirements:
- `transpose()` must return a new `View` — the buffer must not be modified
- After transposing a 3×4 matrix, printing it should show 4 rows and 3 columns
- Demonstrate that modifying the transposed view modifies the original buffer

```cpp
// Starter code — fill in transpose()
struct View {
    double* base;
    int nrows, ncols;
    int row_stride, col_stride;

    double& at(int r, int c) {
        return base[r * row_stride + c * col_stride];
    }

    View transpose() {
        // TODO: return a View with swapped shape and strides
    }

    void print() {
        for (int r = 0; r < nrows; ++r) {
            for (int c = 0; c < ncols; ++c)
                std::cout << at(r, c) << " ";
            std::cout << "\n";
        }
    }
};
```

```hints
nudge: The `base` pointer does not change — the data starts at the same address.
concept: Swapping `row_stride` and `col_stride` and also `nrows` and `ncols` is all that's needed.
shape: To verify in-place sharing: set `t.at(0,0) = 99` then check `original.at(0,0)`.
```

```check
run "g++ -std=c++17 -O2 -o step6 step6.cpp"
run "./step6" stdout="99"
```

Congratulations — you've now built the mental model behind NumPy's entire array representation. In the next lesson you'll learn how C++ templates let NumPy support every `dtype` without duplicate code.
