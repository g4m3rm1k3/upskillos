---
title: 5 — Talking to C from Python: ctypes
track: Python Internals — Inside CPython
trackOrder: 14
runtime: cpp
console: true
---

You've seen how CPython itself is built from C structs and C functions. Now you'll go the other direction: calling C code *from Python* without writing a full extension module. The `ctypes` standard library module lets you load compiled shared libraries (`.so` on Linux, `.dll` on Windows, `.dylib` on macOS) and call their functions directly. It's used extensively in the Python ecosystem — `ctypes` is how `pygame`, `Pillow`, and many other libraries call into C without Cython or CFFI.

By the end of this lesson you'll have written a C shared library from scratch, compiled it, and called it from Python — the same pattern used by real-world Python libraries.

## Step 1 — Load the C standard library with `ctypes`

**This step:** You load `libc` (the C standard library) with `ctypes.CDLL` and inspect what you get.

```python
import ctypes
import ctypes.util
import platform

# Find the C standard library for the current OS
if platform.system() == "Windows":
    libc = ctypes.CDLL("msvcrt")          # Microsoft C Runtime
elif platform.system() == "Darwin":
    libc = ctypes.CDLL("libc.dylib")      # macOS
else:
    libc_name = ctypes.util.find_library("c")
    libc = ctypes.CDLL(libc_name)         # Linux: usually "libc.so.6"

print(f"Loaded: {libc}")
print(f"Type  : {type(libc)}")

# You can access any exported C symbol as an attribute
# The time() function returns the current Unix timestamp
libc.time.restype = ctypes.c_long
libc.time.argtypes = [ctypes.c_void_p]
ts = libc.time(None)
print(f"time() from C: {ts}")

import time
print(f"time() from Python: {int(time.time())}")
```

`ctypes.CDLL` loads a shared library using the OS dynamic linker. Each function attribute (e.g., `libc.time`) is a `ctypes._FuncPtr` object. Setting `.restype` and `.argtypes` tells ctypes the C signature so it can marshal arguments and return values correctly.

```check
run "python -c \"\nimport ctypes, ctypes.util, platform\nif platform.system()=='Windows':\n    lib=ctypes.CDLL('msvcrt')\nelse:\n    lib=ctypes.CDLL(ctypes.util.find_library('c'))\nprint(lib is not None)\n\"" stdout="True" -- Should successfully load the C standard library
```

## Step 2 — Call `printf` from Python via `ctypes`

**This step:** You call the C `printf` function directly from Python, specifying its argument types manually.

```python
import ctypes
import ctypes.util
import platform

if platform.system() == "Windows":
    libc = ctypes.CDLL("msvcrt")
else:
    libc = ctypes.CDLL(ctypes.util.find_library("c"))

# Tell ctypes: printf returns int, takes a const char* + variadic args
libc.printf.restype  = ctypes.c_int
libc.printf.argtypes = [ctypes.c_char_p]   # first arg is format string

# Call it! Strings must be bytes (C strings are null-terminated bytes)
libc.printf(b"Hello from C's printf! Value: %d\n", ctypes.c_int(42))

# A more interesting example: call sprintf to format into a buffer
buf = ctypes.create_string_buffer(64)   # allocate 64 bytes
libc.sprintf(buf, b"Pi is approximately %.4f", ctypes.c_double(3.14159))
print(f"sprintf result: {buf.value.decode()}")
```

Notice how Python `str` objects need to be converted to `bytes` (via `b"..."`) before being passed to C functions. C strings are sequences of bytes terminated by a null `\0` character — there's no length field. Python's `str` is Unicode and works very differently.

```check
run "python -c \"\nimport ctypes, ctypes.util, platform\nif platform.system()=='Windows':\n    lib=ctypes.CDLL('msvcrt')\nelse:\n    lib=ctypes.CDLL(ctypes.util.find_library('c'))\nbuf=ctypes.create_string_buffer(32)\nlib.sprintf(buf, b'%d plus %d', ctypes.c_int(1), ctypes.c_int(2))\nprint(buf.value == b'1 plus 2')\n\"" stdout="True" -- sprintf should format into a ctypes buffer correctly
```

## Step 3 — Write your own C shared library

**This step:** You write a C source file with functions that you'll later call from Python.

Create `mylib.c` with a few functions of varying complexity:

```c file=mylib.c
/*
 * mylib.c — a small C library to be called from Python via ctypes.
 *
 * Compile (Linux/Mac):
 *   gcc -shared -fPIC -o mylib.so mylib.c
 *
 * Compile (Windows with MinGW):
 *   gcc -shared -o mylib.dll mylib.c
 */

#include <string.h>
#include <math.h>

/* --- Simple arithmetic --- */

/* Double a number */
double double_it(double x) {
    return x * 2.0;
}

/* Integer absolute value */
int abs_val(int x) {
    return x < 0 ? -x : x;
}

/* --- Array operations --- */

/* Sum an array of doubles (in-place C, no Python overhead per element) */
double array_sum(const double *arr, int n) {
    double total = 0.0;
    for (int i = 0; i < n; i++) {
        total += arr[i];
    }
    return total;
}

/* Scale an array in-place (multiplies every element by factor) */
void array_scale(double *arr, int n, double factor) {
    for (int i = 0; i < n; i++) {
        arr[i] *= factor;
    }
}

/* --- String operation --- */

/* Reverse a string in-place */
void reverse_string(char *s) {
    int len = (int)strlen(s);
    for (int i = 0; i < len / 2; i++) {
        char tmp   = s[i];
        s[i]       = s[len - 1 - i];
        s[len-1-i] = tmp;
    }
}

/* --- Fibonacci (to demonstrate non-trivial computation) --- */

long long fibonacci(int n) {
    if (n <= 1) return n;
    long long a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        long long c = a + b;
        a = b;
        b = c;
    }
    return b;
}
```

```check
file mylib.c
contains mylib.c "double_it"
contains mylib.c "array_sum"
contains mylib.c "array_scale"
contains mylib.c "fibonacci"
```

## Step 4 — Compile the shared library with `gcc -shared -fPIC`

**This step:** You compile `mylib.c` into a shared library that Python can load at runtime.

The key compiler flags for a shared library:
- **`-shared`**: produce a shared library (`.so`/`.dll`) instead of an executable
- **`-fPIC`**: Position-Independent Code — required on Linux so the library can be loaded at any memory address
- **`-lm`**: link against the math library (for `sqrt`, `sin`, etc.)

```text
# Linux / macOS:
gcc -shared -fPIC -o mylib.so mylib.c -lm

# Windows (MinGW):
gcc -shared -o mylib.dll mylib.c -lm

# macOS (explicit):
gcc -dynamiclib -o mylib.dylib mylib.c -lm
```

After compiling, verify the library exports the expected symbols:

```text
# Linux:
nm -D mylib.so | grep " T "    # T = exported (Text) symbols

# macOS:
nm -g mylib.dylib | grep " T "

# Windows:
dumpbin /EXPORTS mylib.dll
```

You should see `double_it`, `array_sum`, `array_scale`, `reverse_string`, and `fibonacci` in the output.

```check
run "gcc -shared -fPIC -o mylib.so mylib.c -lm && echo compiled" stdout="compiled" -- Shared library must compile successfully
```

## Step 5 — Call your C function from Python using `ctypes`

**This step:** You load `mylib.so` with `ctypes.CDLL`, set argument/return types, and call the functions.

```python
import ctypes
import os

# Load the shared library we just compiled
lib_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mylib.so")
lib = ctypes.CDLL(lib_path)

# --- double_it ---
lib.double_it.restype  = ctypes.c_double
lib.double_it.argtypes = [ctypes.c_double]
print(f"double_it(6.5) = {lib.double_it(6.5)}")    # 13.0

# --- fibonacci ---
lib.fibonacci.restype  = ctypes.c_longlong
lib.fibonacci.argtypes = [ctypes.c_int]
for n in [0, 1, 10, 20, 40]:
    print(f"fibonacci({n:2d}) = {lib.fibonacci(n)}")

# --- array_sum: passing a Python list as a C double array ---
import ctypes
data = [1.5, 2.5, 3.5, 4.5, 5.0]
n    = len(data)
# ctypes array type: (c_double * n) creates a C array of n doubles
arr  = (ctypes.c_double * n)(*data)   # copy Python list into C array

lib.array_sum.restype  = ctypes.c_double
lib.array_sum.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_int]
total = lib.array_sum(arr, n)
print(f"array_sum({data}) = {total}")    # 17.0

# --- array_scale: modifies array in-place ---
lib.array_scale.restype  = None
lib.array_scale.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_int, ctypes.c_double]
lib.array_scale(arr, n, 2.0)   # multiply every element by 2
result = list(arr)
print(f"array_scale(x2) = {result}")     # [3.0, 5.0, 7.0, 9.0, 10.0]
```

**The most important lesson here:** `ctypes` does *not* check types for you. If you pass a Python `int` where `c_double` is expected and forget to set `argtypes`, ctypes may silently pass garbage to C. Always set `.restype` and `.argtypes`.

```check
run "python -c \"\nimport ctypes, os\nlib=ctypes.CDLL('./mylib.so')\nlib.fibonacci.restype=ctypes.c_longlong\nlib.fibonacci.argtypes=[ctypes.c_int]\nprint(lib.fibonacci(10) == 55)\n\"" stdout="True" -- fibonacci(10) should return 55
```

## Step 6 — Pass a struct between Python and C

**This step:** You define a matching `ctypes.Structure` in Python and pass it to a C function that fills it in.

Add this to `mylib.c` (or create `mylib2.c`):

```c file=mylib2.c
#include <math.h>
#include <string.h>

/* A C struct that we'll share with Python */
typedef struct {
    double x;
    double y;
    double magnitude;   /* sqrt(x*x + y*y) */
    char   label[32];
} Vec2;

/* Fill in a Vec2's magnitude and label */
void vec2_compute(Vec2 *v) {
    v->magnitude = sqrt(v->x * v->x + v->y * v->y);
    snprintf(v->label, sizeof(v->label), "vec(%.2f, %.2f)", v->x, v->y);
}

/* Return the dot product of two Vec2 structs */
double vec2_dot(const Vec2 *a, const Vec2 *b) {
    return a->x * b->x + a->y * b->y;
}
```

And the matching Python-side struct:

```python
import ctypes

# Must match mylib2.c's Vec2 layout exactly — field order, types, and sizes
class Vec2(ctypes.Structure):
    _fields_ = [
        ("x",         ctypes.c_double),
        ("y",         ctypes.c_double),
        ("magnitude", ctypes.c_double),
        ("label",     ctypes.c_char * 32),   # fixed-size char array
    ]

lib2 = ctypes.CDLL("./mylib2.so")

lib2.vec2_compute.restype  = None
lib2.vec2_compute.argtypes = [ctypes.POINTER(Vec2)]

lib2.vec2_dot.restype  = ctypes.c_double
lib2.vec2_dot.argtypes = [ctypes.POINTER(Vec2), ctypes.POINTER(Vec2)]

v = Vec2(x=3.0, y=4.0)
lib2.vec2_compute(ctypes.byref(v))   # byref passes pointer without copying
print(f"Vec2: x={v.x}, y={v.y}, magnitude={v.magnitude}, label={v.label.decode()}")

u = Vec2(x=1.0, y=0.0)
lib2.vec2_compute(ctypes.byref(u))
dot = lib2.vec2_dot(ctypes.byref(u), ctypes.byref(v))
print(f"Dot product u·v = {dot}")   # 3.0
```

`ctypes.byref(v)` is like the C `&v` — it passes a pointer to the struct without copying it. `ctypes.POINTER(Vec2)` corresponds to `Vec2 *` in C.

```check
file mylib2.c
run "gcc -shared -fPIC -o mylib2.so mylib2.c -lm && echo compiled" stdout="compiled" -- mylib2 should compile cleanly
contains mylib2.c "Vec2"
contains mylib2.c "vec2_compute"
contains mylib2.c "vec2_dot"
```

## Step 7 — Challenge: wrap a C function that modifies an array in-place

**This step:** You write a C function that sorts a `double` array in-place and wrap it in Python with ctypes, returning the sorted result as a Python list.

```c file=inplace_sort.c
#include <stdlib.h>

/* Compare function for qsort */
static int cmp_double(const void *a, const void *b) {
    double da = *(const double*)a;
    double db = *(const double*)b;
    return (da > db) - (da < db);
}

/* Sort arr in-place (ascending). Uses C standard library qsort. */
void sort_doubles(double *arr, int n) {
    qsort(arr, (size_t)n, sizeof(double), cmp_double);
}
```

```python
import ctypes

lib = ctypes.CDLL("./inplace_sort.so")
lib.sort_doubles.restype  = None
lib.sort_doubles.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_int]

def py_sort(lst):
    n   = len(lst)
    arr = (ctypes.c_double * n)(*lst)
    lib.sort_doubles(arr, n)
    return list(arr)

data = [5.1, 2.3, 8.7, 1.0, 4.4]
print(f"Before: {data}")
print(f"After : {py_sort(data)}")
```

```hints
nudge: The pattern `(ctypes.c_double * n)(*lst)` creates a C array of `n` doubles initialised from the Python list `lst`. It copies the data into a contiguous block of memory that C can freely read and write.
concept: In NumPy, this same concept is used at massive scale. `numpy.ndarray` stores its data in a contiguous C array. When you call `numpy.sort()`, it passes the data pointer directly to a C/Fortran sorting routine — no Python object is created per element.
shape: The ownership model matters: `(c_double * n)(*lst)` is a ctypes-managed buffer. After `lib.sort_doubles` writes into it, reading back with `list(arr)` copies C values back into Python objects. Understand when data is in C-land vs Python-land.
```

```check
file inplace_sort.c
run "gcc -shared -fPIC -o inplace_sort.so inplace_sort.c && echo compiled" stdout="compiled" -- inplace_sort should compile
contains inplace_sort.c "qsort"
contains inplace_sort.c "sort_doubles"
```
