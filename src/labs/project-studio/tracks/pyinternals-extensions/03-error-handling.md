---
title: 3 — Raising Python Exceptions from C
track: Writing C Extensions for Python
trackOrder: 12
runtime: cpp
console: true
---

In Python, you raise exceptions with the `raise` statement. In a C extension there is no `raise` keyword — instead, you **set** an error indicator that CPython reads after your function returns. Getting error handling right is the difference between a safe extension and one that crashes or silently corrupts state.

## Step 1 — How Python Exceptions Work in C: Returning NULL

**This step:** understand the two-part contract that all C API error handling follows.

CPython maintains a **per-thread error indicator** consisting of three values:

- The exception **type** (e.g. `PyExc_ValueError`)
- The exception **value** (the message string object)
- A **traceback** object

When a C function wants to raise an exception it does two things:

1. **Sets** the error indicator (with `PyErr_SetString` or similar).
2. **Returns `NULL`** from the function.

CPython checks the return value. If it is `NULL` it knows an exception is active and propagates it up the call stack — exactly as Python's `raise` propagates through `try/except` blocks.

```c
static PyObject *
mymod_fail(PyObject *self, PyObject *args)
{
    /* 1. Set the error indicator */
    PyErr_SetString(PyExc_RuntimeError, "something went wrong");

    /* 2. Return NULL to signal failure */
    return NULL;
}
```

**Golden rule:** Every function that returns `PyObject *` must return either a valid, non-NULL pointer **or** `NULL` with the error indicator set. Never both, never neither.

```c
/* WRONG — raises nothing, returns NULL: CPython will likely crash or misbehave */
return NULL;

/* WRONG — sets error, returns a value: CPython ignores the error and the caller
   receives a garbage value */
PyErr_SetString(PyExc_ValueError, "oops");
return Py_None;
```

## Step 2 — PyErr_SetString with Built-in Exceptions

**This step:** raise the standard Python exceptions from C.

`PyErr_SetString(exception_type, message)` sets the error indicator and creates the exception value from a C string:

```c
#include <Python.h>

static PyObject *
mymod_divide(PyObject *self, PyObject *args)
{
    double a, b;
    if (!PyArg_ParseTuple(args, "dd", &a, &b))
        return NULL;

    if (b == 0.0) {
        PyErr_SetString(PyExc_ZeroDivisionError, "division by zero");
        return NULL;
    }

    return PyFloat_FromDouble(a / b);
}
```

The most common built-in exception objects:

| C symbol | Python exception |
|---|---|
| `PyExc_ValueError` | `ValueError` |
| `PyExc_TypeError` | `TypeError` |
| `PyExc_RuntimeError` | `RuntimeError` |
| `PyExc_ZeroDivisionError` | `ZeroDivisionError` |
| `PyExc_OverflowError` | `OverflowError` |
| `PyExc_MemoryError` | `MemoryError` |
| `PyExc_IndexError` | `IndexError` |
| `PyExc_KeyError` | `KeyError` |
| `PyExc_NotImplementedError` | `NotImplementedError` |
| `PyExc_StopIteration` | `StopIteration` |
| `PyExc_OSError` | `OSError` |

**Python analogy:**
```python
raise ZeroDivisionError("division by zero")
```
becomes in C:
```c
PyErr_SetString(PyExc_ZeroDivisionError, "division by zero");
return NULL;
```

## Step 3 — PyErr_Format for Formatted Messages

**This step:** raise exceptions with dynamic, formatted messages using `PyErr_Format`.

`PyErr_Format` works like `printf` but sets the exception message instead of printing:

```c
static PyObject *
mymod_index_check(PyObject *self, PyObject *args)
{
    int index, size;
    if (!PyArg_ParseTuple(args, "ii", &index, &size))
        return NULL;

    if (index < 0 || index >= size) {
        /* %d, %s, %R (repr), %S (str) are supported */
        PyErr_Format(PyExc_IndexError,
                     "index %d is out of range [0, %d)",
                     index, size);
        return NULL;
    }

    Py_RETURN_NONE;
}
```

Supported format codes in `PyErr_Format`:

| Code | Meaning |
|---|---|
| `%d` | C `int` |
| `%ld` | C `long` |
| `%zd` | `Py_ssize_t` |
| `%s` | C `const char *` |
| `%U` | `PyObject *` unicode object |
| `%R` | `repr()` of a `PyObject *` |
| `%S` | `str()` of a `PyObject *` |

> **Tip:** Prefer `PyErr_Format` over manually constructing a message string — it is safe, it handles the reference counting internally, and it cannot overflow a buffer.

## Step 4 — Checking Errors from Other C API Calls

**This step:** detect when a C API function itself has set an error and propagate it correctly.

Many C API functions return `NULL` (for pointer-returning functions) or `-1` (for int-returning functions) when they fail, having already set the error indicator. The correct pattern is to check the return value and return `NULL` immediately:

```c
static PyObject *
mymod_upper(PyObject *self, PyObject *args)
{
    PyObject *input_str;
    if (!PyArg_ParseTuple(args, "O!", &PyUnicode_Type, &input_str))
        return NULL;

    /* PyObject_CallMethod returns NULL on failure, error already set */
    PyObject *result = PyObject_CallMethod(input_str, "upper", NULL);
    if (result == NULL)
        return NULL;   /* propagate — don't call PyErr_SetString again */

    return result;
}
```

A common mistake is to call `PyErr_SetString` *after* a C API function has already set its own (more specific) error. That **overwrites** the original error with a less informative one. Only set an error if the C API has not already done so.

To check if an error is currently set without clearing it:

```c
if (PyErr_Occurred()) {
    /* An error is set. We can add context, wrap it, or just propagate. */
    return NULL;
}
```

## Step 5 — Clearing Errors: PyErr_Clear

**This step:** learn when and how to intentionally suppress an exception.

Sometimes you want to *attempt* an operation and fall back gracefully if it fails — just like Python's `try/except`:

```python
# Python
try:
    val = int(x)
except (TypeError, ValueError):
    val = 0
```

In C:

```c
static PyObject *
mymod_safe_int(PyObject *self, PyObject *args)
{
    PyObject *obj;
    if (!PyArg_ParseTuple(args, "O", &obj))
        return NULL;

    long result = PyLong_AsLong(obj);
    if (result == -1 && PyErr_Occurred()) {
        /* Conversion failed — clear the error and fall back to 0 */
        PyErr_Clear();
        result = 0;
    }

    return PyLong_FromLong(result);
}
```

> **Warning:** Only call `PyErr_Clear()` when you have a concrete, deliberate fallback plan. Clearing an error and then returning `NULL` leaves CPython without an active exception — that is undefined behaviour. Either handle the error or propagate it.

`PyErr_Fetch` and `PyErr_Restore` let you save and restore the error indicator if you need to do cleanup work while an error is pending — but for most extensions `PyErr_Clear` is all you need.

## Step 6 — Defining a Custom Exception Type

**This step:** create and export a module-specific exception class, just like Python libraries do.

```c
/* Module-level variable to hold the custom exception type */
static PyObject *MyModError;

PyMODINIT_FUNC
PyInit_mymod(void)
{
    PyObject *m = PyModule_Create(&mymod_def);
    if (m == NULL)
        return NULL;

    /* PyErr_NewException("module.ClassName", base, dict)
       base = NULL -> inherits from Exception
       dict = NULL -> no extra class attributes */
    MyModError = PyErr_NewException("mymod.MyModError", NULL, NULL);
    if (MyModError == NULL) {
        Py_DECREF(m);
        return NULL;
    }

    /* Add to the module so Python code can catch it:
       except mymod.MyModError: ... */
    Py_INCREF(MyModError);
    if (PyModule_AddObject(m, "MyModError", MyModError) < 0) {
        Py_DECREF(MyModError);
        Py_DECREF(m);
        return NULL;
    }

    return m;
}

/* Using the custom exception */
static PyObject *
mymod_risky(PyObject *self, PyObject *args)
{
    int code;
    if (!PyArg_ParseTuple(args, "i", &code))
        return NULL;

    if (code != 0) {
        PyErr_Format(MyModError, "operation failed with code %d", code);
        return NULL;
    }

    Py_RETURN_NONE;
}
```

From Python:
```python
import mymod
try:
    mymod.risky(42)
except mymod.MyModError as e:
    print(f"Caught: {e}")   # Caught: operation failed with code 42
```

## Step 7 — Challenge: Wrap a C Function That Returns an Error Code

**This step:** bridge a C-style error-code API to Python exceptions.

Many C libraries use the pattern "return 0 on success, return a negative error code on failure." Your task is to write an extension function `process(data, mode)` that:

1. Parses a string `data` and integer `mode`.
2. Calls a (simulated) C library function:

```c
/* Pretend this comes from a third-party C library */
static int lib_process(const char *data, int mode, char *out_buf, size_t buf_len)
{
    if (data == NULL)  return -1;  /* invalid argument */
    if (mode < 0)      return -2;  /* bad mode */
    if (buf_len < 10)  return -3;  /* buffer too small */
    snprintf(out_buf, buf_len, "OK:%s:%d", data, mode);
    return 0;
}
```

3. Maps error codes to appropriate Python exceptions:
   - `-1` → `ValueError("invalid argument")`
   - `-2` → `ValueError("bad mode: <mode>")`
   - `-3` → `RuntimeError("internal buffer too small")`
4. On success, returns the output string.

```hints
nudge: Declare a char out_buf[256] on the stack.
concept: Call lib_process and check its return value with a switch statement.
shape: Use PyErr_SetString or PyErr_Format for each error code.
- On success, return PyUnicode_FromString(out_buf).
```

```check
file process_mod.c
contains process_mod.c "lib_process"
contains process_mod.c "PyErr_SetString"
contains process_mod.c "PyErr_Format"
contains process_mod.c "PyUnicode_FromString"
```
