---
title: 5 — Calling NumPy's C API
track: Writing C Extensions for Python
trackOrder: 12
runtime: cpp
console: true
---

NumPy exposes its own C API that lets you create, inspect, and manipulate `ndarray` objects from C code at native speed — with no Python overhead in the inner loop. This lesson walks through every step: initialising the API, converting Python objects to typed C arrays, reading their dimensions, writing a C loop over the data, and returning new arrays.

## Step 1 — Import NumPy's C API Headers

**This step:** set up your source file to use NumPy's C API correctly.

NumPy ships its C headers alongside the package. The critical header is `numpy/arrayobject.h`. You also need to call a special macro once per translation unit before using any NumPy C API function.

```c
/* numpy_ext.c */
#define PY_ARRAY_UNIQUE_SYMBOL MYEXT_ARRAY_API   /* unique name per extension */
#include <Python.h>
#include <numpy/arrayobject.h>
```

The `PY_ARRAY_UNIQUE_SYMBOL` definition is required when your extension spans multiple `.c` files so that each file has its own pointer to the NumPy function table. For single-file extensions it is optional but good practice.

Inside `PyInit_`, you must call `import_array()` **before** any other NumPy C API call:

```c
PyMODINIT_FUNC
PyInit_numpy_ext(void)
{
    import_array();   /* Initialises NumPy C API; returns NULL on failure.
                         In Python 3 the macro expands to a return on failure,
                         so this must be the very first thing after module creation
                         if you use the modern form. */

    PyObject *m = PyModule_Create(&numpy_ext_def);
    return m;
}
```

> **Important:** The `import_array()` macro in NumPy ≥ 1.7 expands to a statement that can contain a `return NULL`. Place it at the **top** of `PyInit_`, before any other code that could leak resources.

To find the include path at compile time:

```text
$ python3 -c "import numpy; print(numpy.get_include())"
/usr/lib/python3/dist-packages/numpy/core/include
```

Add that path with `-I` when compiling:

```text
$ gcc -shared -fPIC $(python3-config --includes --ldflags) \
      -I$(python3 -c "import numpy; print(numpy.get_include())") \
      -o numpy_ext$(python3-config --extension-suffix) \
      numpy_ext.c
```

## Step 2 — Convert a Python Object to a Contiguous ndarray: PyArray_FROM_OTF

**This step:** safely accept a Python object and coerce it into a well-typed, contiguous C array.

The most useful NumPy conversion function is:

```c
PyObject *arr = PyArray_FROM_OTF(obj, type_num, requirements);
```

- `obj` — any Python object (list, existing ndarray, etc.)
- `type_num` — the desired element type (e.g. `NPY_DOUBLE`, `NPY_INT32`)
- `requirements` — bitmask of flags (e.g. `NPY_ARRAY_IN_ARRAY`)

```c
static PyObject *
myext_sum(PyObject *self, PyObject *args)
{
    PyObject *input;
    if (!PyArg_ParseTuple(args, "O", &input))
        return NULL;

    /* Convert to a contiguous C-order array of doubles.
       NPY_ARRAY_IN_ARRAY = NPY_ARRAY_C_CONTIGUOUS | NPY_ARRAY_ALIGNED */
    PyObject *arr = PyArray_FROM_OTF(input, NPY_DOUBLE, NPY_ARRAY_IN_ARRAY);
    if (arr == NULL)
        return NULL;   /* TypeError or ValueError already set */

    /* ... do work ... */

    Py_DECREF(arr);
    return PyFloat_FromDouble(0.0);   /* placeholder */
}
```

Common `type_num` values:

| Constant | NumPy dtype | C type |
|---|---|---|
| `NPY_DOUBLE` | `float64` | `double` |
| `NPY_FLOAT` | `float32` | `float` |
| `NPY_INT32` | `int32` | `int32_t` |
| `NPY_INT64` | `int64` | `int64_t` |
| `NPY_BOOL` | `bool` | `npy_bool` |

Common requirement flags:

| Flag | Meaning |
|---|---|
| `NPY_ARRAY_IN_ARRAY` | C-contiguous + aligned (input — read-only use) |
| `NPY_ARRAY_OUT_ARRAY` | C-contiguous + aligned + writeable (output) |
| `NPY_ARRAY_INOUT_ARRAY` | In + out |
| `NPY_ARRAY_FORCECAST` | Allow unsafe dtype casts |

## Step 3 — Access the Raw Data Pointer: PyArray_DATA

**This step:** get a typed C pointer to the array's data buffer for use in loops.

Once you have a contiguous array, `PyArray_DATA` returns a `void *` pointer to the first element. Cast it to the appropriate C type:

```c
double *data = (double *)PyArray_DATA(arr);
```

Accessing element `i` is then just `data[i]` — identical to indexing a plain C array. This is why extensions can beat pure Python: there is no bounds-checking, no object allocation, and no interpreter overhead inside the loop.

```c
static PyObject *
myext_sum(PyObject *self, PyObject *args)
{
    PyObject *input;
    if (!PyArg_ParseTuple(args, "O", &input))
        return NULL;

    PyObject *arr = PyArray_FROM_OTF(input, NPY_DOUBLE, NPY_ARRAY_IN_ARRAY);
    if (arr == NULL)
        return NULL;

    Py_ssize_t n    = PyArray_SIZE(arr);          /* total number of elements */
    double    *data = (double *)PyArray_DATA(arr);

    double total = 0.0;
    for (Py_ssize_t i = 0; i < n; i++)
        total += data[i];

    Py_DECREF(arr);
    return PyFloat_FromDouble(total);
}
```

The `PyArray_SIZE` macro returns the *total* number of elements (product of all dimensions). Use it for 1-D arrays. For multi-dimensional arrays you want `PyArray_DIM` (next step).

## Step 4 — Read Dimensions and Strides

**This step:** query an array's shape and strides for multi-dimensional work.

```c
int        ndim  = PyArray_NDIM(arr);           /* number of dimensions */
npy_intp   rows  = PyArray_DIM(arr, 0);         /* size of dimension 0 */
npy_intp   cols  = PyArray_DIM(arr, 1);         /* size of dimension 1 */
npy_intp   str0  = PyArray_STRIDE(arr, 0);      /* byte stride for dim 0 */
npy_intp   str1  = PyArray_STRIDE(arr, 1);      /* byte stride for dim 1 */
```

For a C-contiguous 2-D `float64` array of shape `(R, C)`:
- `stride[0]` = `C * 8` bytes (jump by one row)
- `stride[1]` = `8` bytes (jump by one element)

Because `NPY_ARRAY_IN_ARRAY` guarantees C-contiguity, you can safely treat the buffer as a flat array of `rows * cols` doubles:

```c
/* Validate that we got a 2-D array */
if (PyArray_NDIM(arr) != 2) {
    PyErr_SetString(PyExc_ValueError, "expected a 2-D array");
    Py_DECREF(arr);
    return NULL;
}

npy_intp rows = PyArray_DIM(arr, 0);
npy_intp cols = PyArray_DIM(arr, 1);
double  *data = (double *)PyArray_DATA(arr);

/* Access element [r][c] in a contiguous array: */
double elem = data[r * cols + c];
```

## Step 5 — Write a C Loop Over the Array

**This step:** implement a complete function that sums rows of a 2-D array.

```c
/* row_sums(arr) -> 1-D array of row sums */
static PyObject *
myext_row_sums(PyObject *self, PyObject *args)
{
    PyObject *input;
    if (!PyArg_ParseTuple(args, "O", &input))
        return NULL;

    PyObject *arr = PyArray_FROM_OTF(input, NPY_DOUBLE, NPY_ARRAY_IN_ARRAY);
    if (arr == NULL) return NULL;

    if (PyArray_NDIM(arr) != 2) {
        PyErr_SetString(PyExc_ValueError, "expected a 2-D array");
        Py_DECREF(arr);
        return NULL;
    }

    npy_intp rows = PyArray_DIM(arr, 0);
    npy_intp cols = PyArray_DIM(arr, 1);
    double  *data = (double *)PyArray_DATA(arr);

    /* Allocate the output array (1-D, length = rows) */
    npy_intp out_dims[1] = {rows};
    PyObject *out = PyArray_SimpleNew(1, out_dims, NPY_DOUBLE);
    if (out == NULL) {
        Py_DECREF(arr);
        return NULL;
    }
    double *out_data = (double *)PyArray_DATA(out);

    /* The inner loop — pure C speed */
    for (npy_intp r = 0; r < rows; r++) {
        double s = 0.0;
        for (npy_intp c = 0; c < cols; c++)
            s += data[r * cols + c];
        out_data[r] = s;
    }

    Py_DECREF(arr);
    return out;   /* caller owns out */
}
```

## Step 6 — Return a New NumPy Array from C

**This step:** learn all the ways to allocate a fresh ndarray to return to Python.

Three common allocation functions:

```c
/* 1. PyArray_SimpleNew — allocates uninitialised memory */
npy_intp dims[2] = {3, 4};
PyObject *a = PyArray_SimpleNew(2, dims, NPY_DOUBLE);

/* 2. PyArray_ZEROS — allocates zero-initialised memory */
PyObject *b = PyArray_ZEROS(2, dims, NPY_DOUBLE, 0 /* C order */);

/* 3. PyArray_EMPTY — same as SimpleNew but more explicit */
PyObject *c = PyArray_EMPTY(2, dims, NPY_DOUBLE, 0);
```

All three return a new reference (you own it). If you return the array from your function, the caller takes ownership and you must not `Py_DECREF` it. If an error occurs after allocation, `Py_DECREF` the new array before returning `NULL`.

Convenience: wrapping an existing C buffer without copying (zero-copy):

```c
/* PyArray_SimpleNewFromData — wraps existing memory, does NOT copy.
   The buffer must outlive the array object. */
double buf[6] = {1, 2, 3, 4, 5, 6};
npy_intp dims[1] = {6};
PyObject *view = PyArray_SimpleNewFromData(1, dims, NPY_DOUBLE, buf);
/* WARNING: buf is on the stack here — never do this in production;
   the stack frame disappears when the function returns! */
```

For production zero-copy, pair `PyArray_SimpleNewFromData` with a custom destructor capsule — an advanced topic beyond this lesson.

## Step 7 — Challenge: Implement a C-Accelerated Moving Average

**This step:** write `moving_avg(arr, window)` that returns a 1-D float64 array.

The moving average at index `i` is the mean of elements `arr[i - window + 1 .. i]` (clamp at the left edge). For positions where a full window is unavailable, use whatever elements are available.

Expected Python interface:

```python
import numpy as np
import myext

x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
print(myext.moving_avg(x, 3))
# [1.   1.5  2.   3.   4. ]
```

Constraints:
- Parse `arr` with `PyArray_FROM_OTF(…, NPY_DOUBLE, NPY_ARRAY_IN_ARRAY)`.
- Parse `window` as a Python `int` with `PyArg_ParseTuple`.
- Validate: `window >= 1`, `arr` must be 1-D.
- Allocate output with `PyArray_SimpleNew`.
- All computation must be in a C loop — no calls back into NumPy Python functions.

```hints
nudge: For index i, sum elements from max(0, i - window + 1) to i (inclusive).
concept: Divide by the actual count used (not necessarily window).
shape: Use PyArray_DIM(arr, 0) for the length.
- Cast PyArray_DATA to double*.
```

```check
file myext.c
contains myext.c "moving_avg"
contains myext.c "PyArray_FROM_OTF"
contains myext.c "PyArray_SimpleNew"
contains myext.c "NPY_DOUBLE"
```
