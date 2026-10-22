---
title: 2 — Parsing Arguments and Building Return Values
track: Writing C Extensions for Python
trackOrder: 12
runtime: cpp
console: true
---

In Lesson 1 you wrote functions that take no arguments and return a hardcoded string. Real extension functions must accept Python values, convert them to C types, do work, and package results back as Python objects. CPython provides two families of functions for this: `PyArg_Parse*` for unpacking incoming arguments and `Py_BuildValue` for packing results.

## Step 1 — PyArg_ParseTuple: Parsing Positional Arguments

**This step:** use `PyArg_ParseTuple` to extract C values from the `args` tuple.

Every function declared with `METH_VARARGS` receives its positional arguments as a single `PyObject *args` tuple. `PyArg_ParseTuple` walks that tuple and writes C values into the variables you point it at — exactly like `sscanf`, but for Python objects.

```c
#include <Python.h>

/* add(a, b) -> int */
static PyObject *
mymod_add(PyObject *self, PyObject *args)
{
    int a, b;

    /* "ii" = two Python ints -> two C ints.
       Returns 1 on success, 0 on failure (sets TypeError automatically). */
    if (!PyArg_ParseTuple(args, "ii", &a, &b))
        return NULL;   /* propagate the exception */

    return PyLong_FromLong(a + b);
}
```

The call pattern is always:

```c
if (!PyArg_ParseTuple(args, "<format>", &var1, &var2, ...))
    return NULL;
```

If the argument count or types do not match the format string, `PyArg_ParseTuple` sets a `TypeError` and returns `0`. Returning `NULL` from your function propagates that exception to Python.

**Python analogy:**
```python
def add(a: int, b: int) -> int:
    return a + b
```
The format string `"ii"` is the C equivalent of the type annotations `int, int`.

## Step 2 — Format Strings: i, d, s, n and More

**This step:** master the most-used format codes so you can parse any basic Python argument.

| Format code | C type written | Python type expected |
|---|---|---|
| `i` | `int` | `int` |
| `l` | `long` | `int` |
| `d` | `double` | `float` |
| `s` | `const char *` | `str` (UTF-8, NUL-terminated pointer into internal buffer — do **not** free) |
| `s#` | `const char *, Py_ssize_t` | `str` — also writes byte length |
| `n` | `Py_ssize_t` | `int` |
| `O` | `PyObject *` | any Python object (borrowed reference, no conversion) |
| `O!` | `PyObject *` | any object, but checks type; e.g. `O!`, `&PyList_Type`, `&mylist` |
| `p` | `int` (0 or 1) | any object — truth value |

```c
/* demonstrate several format codes */
static PyObject *
mymod_demo(PyObject *self, PyObject *args)
{
    int         ival;
    double      dval;
    const char *sval;
    Py_ssize_t  nval;
    PyObject   *oval;

    if (!PyArg_ParseTuple(args, "idsn0",
                          &ival, &dval, &sval, &nval, &oval))
        return NULL;

    /* Use the values... */
    (void)ival; (void)dval; (void)sval; (void)nval; (void)oval;

    Py_RETURN_NONE;
}
```

> **Important:** The `const char *` written by the `s` format code points directly into the Python string's internal buffer. It is valid only while the Python string object is alive. **Never free it, and never store it past the function call.**

## Step 3 — Py_BuildValue: Constructing Python Objects to Return

**This step:** use `Py_BuildValue` to create Python return values from C data.

`Py_BuildValue` is the mirror image of `PyArg_ParseTuple`. It takes a format string and C values and builds a Python object:

```c
/* Returns a Python float */
static PyObject *
mymod_sqrt(PyObject *self, PyObject *args)
{
    double x;
    if (!PyArg_ParseTuple(args, "d", &x))
        return NULL;

    if (x < 0.0) {
        PyErr_SetString(PyExc_ValueError, "sqrt requires non-negative input");
        return NULL;
    }

    /* Py_BuildValue("d", val) == PyFloat_FromDouble(val) */
    return Py_BuildValue("d", __builtin_sqrt(x));
}
```

`Py_BuildValue` format codes (return side):

| Format code | C type read | Python object created |
|---|---|---|
| `i` | `int` | `int` |
| `l` | `long` | `int` |
| `d` | `double` | `float` |
| `s` | `const char *` | `str` |
| `O` | `PyObject *` | that object (INCREFs it) |
| `N` | `PyObject *` | that object (does NOT INCREF — "steals") |
| `(ii)` | two `int` | `tuple` of two `int` |
| `[ii]` | two `int` | `list` of two `int` |
| `{ss}` | two pairs | `dict` |

Parentheses build tuples, brackets build lists, braces build dicts:

```c
/* return (x, y, label) */
return Py_BuildValue("(ids)", x_int, y_double, label_cstr);

/* return {"x": 1, "y": 2} */
return Py_BuildValue("{sisi}", "x", 1, "y", 2);
```

If the format string is `""` (empty), `Py_BuildValue` returns `Py_None` — but `Py_RETURN_NONE` is clearer and preferred.

## Step 4 — Keyword Arguments: PyArg_ParseTupleAndKeywords

**This step:** support keyword arguments the way Python functions do with `def f(a, b=0)`.

When a function is declared with `METH_VARARGS | METH_KEYWORDS` it receives a second `PyObject *kwargs` dict. Use `PyArg_ParseTupleAndKeywords` to parse both:

```c
/* power(base, exp=2) */
static PyObject *
mymod_power(PyObject *self, PyObject *args, PyObject *kwargs)
{
    double base;
    double exp = 2.0;  /* default value */

    /* Keyword names list — MUST be char*, not const char* in older Python */
    static char *kwlist[] = {"base", "exp", NULL};

    /* "d|d": one required double, pipe = rest are optional */
    if (!PyArg_ParseTupleAndKeywords(args, kwargs, "d|d", kwlist,
                                     &base, &exp))
        return NULL;

    double result = 1.0;
    for (int i = 0; i < (int)exp; i++) result *= base;

    return PyFloat_FromDouble(result);
}

/* In the method table, use METH_VARARGS | METH_KEYWORDS
   and cast to PyCFunction (the cast silences the compiler) */
static PyMethodDef mymod_methods[] = {
    {"power", (PyCFunction)mymod_power,
              METH_VARARGS | METH_KEYWORDS,
              "power(base, exp=2) -> float"},
    {NULL, NULL, 0, NULL}
};
```

The `|` in the format string marks the boundary between required and optional arguments. Arguments after `|` are only written if they are present in the call.

**Python analogy:**
```python
def power(base: float, exp: float = 2.0) -> float:
    return base ** exp
```

## Step 5 — Returning None: Py_RETURN_NONE

**This step:** use the correct idiom for functions that have no meaningful return value.

In Python, a function that falls off the end implicitly returns `None`. In C you must do so explicitly. There are three ways, in order of preference:

```c
/* Best: use the macro — it INCREFs None and returns it */
Py_RETURN_NONE;

/* Equivalent manual form (understand this, but don't write it) */
Py_INCREF(Py_None);
return Py_None;

/* WRONG — do not return NULL here; NULL signals an exception */
return NULL;
```

`Py_None` is a singleton. Every function that "returns None" actually increments its reference count and returns the same object. The macro `Py_RETURN_NONE` expands to exactly those two operations.

Similarly, the boolean singletons have their own macros:

```c
Py_RETURN_TRUE;   /* return True */
Py_RETURN_FALSE;  /* return False */
```

## Step 6 — Challenge: Accept *args and Return a Tuple

**This step:** write a function `stats(a, b, c, ...)` that accepts any number of integer positional arguments and returns a `(min, max, sum)` tuple.

Since the number of arguments is variable, do **not** use `PyArg_ParseTuple` with a fixed format. Instead, work with the `args` tuple directly using the sequence protocol:

```c
/* Hints on the API you'll need: */

Py_ssize_t n = PyTuple_GET_SIZE(args);      /* number of positional args */
PyObject  *item = PyTuple_GET_ITEM(args, i); /* borrow item at index i */
long val = PyLong_AsLong(item);             /* convert to C long;
                                               returns -1 and sets OverflowError
                                               or TypeError on failure */
/* Build the return tuple: */
return Py_BuildValue("(lll)", mn, mx, total);
```

Expected behaviour:

```python
import mymod
print(mymod.stats(3, 1, 4, 1, 5, 9))  # (1, 9, 23)
print(mymod.stats(7))                  # (7, 7, 7)
print(mymod.stats())                   # ValueError: need at least one argument
```

```hints
nudge: Loop i from 0 to PyTuple_GET_SIZE(args) - 1.
concept: Call PyLong_AsLong on each item; check for -1 + PyErr_Occurred() to detect conversion errors.
shape: Raise ValueError with PyErr_SetString if n == 0.
- Use Py_BuildValue("(lll)", min_val, max_val, sum_val) to build the result tuple.
```

```check
file stats_mod.c
contains stats_mod.c "PyTuple_GET_SIZE"
contains stats_mod.c "PyTuple_GET_ITEM"
contains stats_mod.c "PyLong_AsLong"
contains stats_mod.c "Py_BuildValue"
```
