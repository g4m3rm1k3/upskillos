---
title: 6 — Writing a Minimal C Extension Module
track: Python Internals — Inside CPython
trackOrder: 15
runtime: cpp
console: true
---

In the previous lesson you called pre-compiled C functions from Python via `ctypes`. That's powerful but limited: you can't create real Python objects, raise Python exceptions, or participate in Python's type system. For that, you need a **C extension module** — a shared library compiled specifically against CPython's C API. This is how NumPy, `lxml`, `Pillow`, and thousands of other packages expose their high-performance C internals to Python code with a perfectly native Python interface.

In this final lesson you'll build a complete, working Python module from scratch in C, learn the anatomy of the extension API, and understand how CPython loads and executes it.

## Step 1 — The anatomy of a C extension module

**This step:** You read the minimum skeleton of a C extension module and understand each piece before writing any code.

A C extension module has three required components:

```c
/* 1. Method table: declares Python-callable C functions */
static PyMethodDef MyMethods[] = {
    {"function_name", c_function, METH_VARARGS, "docstring"},
    {NULL, NULL, 0, NULL}   /* sentinel — marks end of array */
};

/* 2. Module definition struct */
static struct PyModuleDef mymodule = {
    PyModuleDef_HEAD_INIT,  /* always this first */
    "mymodule",             /* module name */
    "Module docstring",     /* module docstring (or NULL) */
    -1,                     /* -1 = no per-module state */
    MyMethods
};

/* 3. Module init function — called by Python when 'import mymodule' runs */
PyMODINIT_FUNC PyInit_mymodule(void) {
    return PyModule_Create(&mymodule);
}
```

Python finds the init function by looking for the symbol `PyInit_<modulename>`. The name **must** match exactly — it's how `import` finds the entry point in the `.so` file after loading it with `dlopen`.

Compare this to a Python module:
- Method table → the module's `__dict__` of functions
- `PyModuleDef` → the module object itself
- `PyInit_*` → the module's top-level code that runs on import

```check
run "python -c \"import sys; print('c_extension_demo' not in sys.modules)\"" stdout="True" -- Module not yet imported
```

## Step 2 — Define a C function callable from Python

**This step:** You write the C implementation of a Python-callable function and understand the `(PyObject *self, PyObject *args)` signature.

Every Python-callable C function has this exact signature, regardless of how many arguments it takes from Python:

```c
static PyObject *
my_function(PyObject *self, PyObject *args) {
    /* ... */
}
```

- `self` is the module object (for module-level functions) or the instance (for methods). Usually unused at this stage.
- `args` is a `PyObject*` pointing to a tuple containing all positional arguments.
- Return value: a `PyObject*`. You must **never** return `NULL` without setting a Python exception first.

Let's write our first complete extension file:

```c file=greetmodule.c
/*
 * greetmodule.c — "Hello, World" of C extension modules.
 *
 * Build (see Step 5 for proper build system):
 *   Linux/Mac:
 *     gcc -shared -fPIC -o greetmodule.so greetmodule.c \
 *         $(python3-config --includes --ldflags)
 */

#define PY_SSIZE_T_CLEAN   /* use Py_ssize_t for '#' format codes */
#include <Python.h>

/*
 * greet.hello(name) -> str
 * Returns "Hello, <name>!" as a Python string.
 */
static PyObject *
greet_hello(PyObject *self, PyObject *args) {
    const char *name;   /* C string; we'll parse it from args */

    /* Parse the argument tuple.
     * "s" = expect one Python str, store as const char* */
    if (!PyArg_ParseTuple(args, "s", &name))
        return NULL;   /* parsing failed; exception already set */

    /* Build a Python str return value.
     * "s" = format a C string into a Python str */
    return Py_BuildValue("s", name);   /* simplified — just echo for now */
}

/*
 * greet.add(a, b) -> int
 * Adds two Python integers and returns the result.
 */
static PyObject *
greet_add(PyObject *self, PyObject *args) {
    int a, b;

    /* "ii" = two Python ints, stored as C ints */
    if (!PyArg_ParseTuple(args, "ii", &a, &b))
        return NULL;

    /* "i" = convert C int to Python int */
    return Py_BuildValue("i", a + b);
}

/* Method table */
static PyMethodDef GreetMethods[] = {
    {"hello", greet_hello, METH_VARARGS, "Return the name passed in."},
    {"add",   greet_add,   METH_VARARGS, "Add two integers."},
    {NULL, NULL, 0, NULL}
};

/* Module definition */
static struct PyModuleDef greetmodule = {
    PyModuleDef_HEAD_INIT, "greet", "A simple greeting module.", -1, GreetMethods
};

/* Init function */
PyMODINIT_FUNC PyInit_greet(void) {
    return PyModule_Create(&greetmodule);
}
```

```check
file greetmodule.c
contains greetmodule.c "PyMODINIT_FUNC"
contains greetmodule.c "PyModule_Create"
contains greetmodule.c "PyMethodDef"
contains greetmodule.c "PyInit_greet"
```

## Step 3 — Parse arguments with `PyArg_ParseTuple`

**This step:** You study the most common `PyArg_ParseTuple` format codes and write a function that uses several of them.

`PyArg_ParseTuple` is roughly the C equivalent of Python's argument unpacking. Its format string uses single-character codes:

| Format | C type | Python type |
|--------|--------|-------------|
| `i`    | `int`  | `int`       |
| `l`    | `long` | `int`       |
| `d`    | `double` | `float`  |
| `s`    | `const char *` | `str` |
| `y`    | `const char *` | `bytes` |
| `O`    | `PyObject *` | any object |
| `O!`   | `PyObject *` + type check | specific type |
| `\|`   | marks start of optional arguments | |

```c file=argparse_demo.c
#define PY_SSIZE_T_CLEAN
#include <Python.h>

/*
 * demo.describe(name, age, height, is_student=False) -> str
 *
 * Shows: required str, required int, required double, optional bool.
 */
static PyObject *
demo_describe(PyObject *self, PyObject *args) {
    const char *name;
    int         age;
    double      height;
    int         is_student = 0;   /* default value for optional arg */

    /* "|" separates required from optional args */
    if (!PyArg_ParseTuple(args, "sid|p", &name, &age, &height, &is_student))
        return NULL;

    /* Build a Python tuple: (str, int, float, bool) */
    return Py_BuildValue("(sidb)",
                         name, age, height,
                         is_student ? 1 : 0);
}

static PyMethodDef DemoMethods[] = {
    {"describe", demo_describe, METH_VARARGS, "Describe a person."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef demomodule = {
    PyModuleDef_HEAD_INIT, "demo", NULL, -1, DemoMethods
};

PyMODINIT_FUNC PyInit_demo(void) {
    return PyModule_Create(&demomodule);
}
```

```check
file argparse_demo.c
contains argparse_demo.c "PyArg_ParseTuple"
contains argparse_demo.c "sid|p"
contains argparse_demo.c "Py_BuildValue"
```

## Step 4 — Return values with `Py_BuildValue`

**This step:** You practise building different Python return types from C using `Py_BuildValue` and the special macros.

`Py_BuildValue` is the mirror of `PyArg_ParseTuple` — it converts C values into Python objects. Format codes are the same, plus:

| Format | Creates |
|--------|---------|
| `(ii)` | tuple of two ints |
| `[ii]` | list of two ints |
| `{ss}` | dict with str key and str value |
| `N`    | an existing `PyObject*` (steals reference) |
| `O`    | an existing `PyObject*` (increments refcount) |

Special macros for common returns:
```c
Py_RETURN_NONE;             /* return None */
Py_RETURN_TRUE;             /* return True */
Py_RETURN_FALSE;            /* return False */
return PyLong_FromLong(42); /* return int 42 */
return PyFloat_FromDouble(3.14);  /* return float */
return PyUnicode_FromString("hi"); /* return str */
```

Example showing multiple return types:

```c file=return_demo.c
#define PY_SSIZE_T_CLEAN
#include <Python.h>

/* Returns a dict: {"name": name, "squared": n*n} */
static PyObject *
make_info(PyObject *self, PyObject *args) {
    const char *name;
    long n;
    if (!PyArg_ParseTuple(args, "sl", &name, &n))
        return NULL;

    /* Build a Python dict */
    return Py_BuildValue("{s:s, s:l}", "name", name, "squared", n * n);
}

/* Returns a list of squares */
static PyObject *
squares(PyObject *self, PyObject *args) {
    int limit;
    if (!PyArg_ParseTuple(args, "i", &limit))
        return NULL;

    PyObject *list = PyList_New(limit);   /* allocate list of 'limit' slots */
    if (!list) return NULL;               /* allocation failed → OOM */

    for (int i = 0; i < limit; i++) {
        PyObject *item = PyLong_FromLong((long)(i * i));
        if (!item) {
            Py_DECREF(list);    /* clean up before returning NULL */
            return NULL;
        }
        PyList_SET_ITEM(list, i, item);   /* steals reference to item */
    }
    return list;   /* caller owns the new reference */
}

static PyMethodDef ReturnMethods[] = {
    {"make_info", make_info, METH_VARARGS, "Return a dict."},
    {"squares",   squares,   METH_VARARGS, "Return list of squares."},
    {NULL, NULL, 0, NULL}
};
static struct PyModuleDef returnmodule = {
    PyModuleDef_HEAD_INIT, "return_demo", NULL, -1, ReturnMethods
};
PyMODINIT_FUNC PyInit_return_demo(void) { return PyModule_Create(&returnmodule); }
```

```check
file return_demo.c
contains return_demo.c "PyList_New"
contains return_demo.c "PyLong_FromLong"
contains return_demo.c "Py_DECREF"
contains return_demo.c "PyList_SET_ITEM"
```

## Step 5 — Write `setup.py` / `pyproject.toml` and build with pip

**This step:** You write the build system file that lets `pip install .` compile and install your extension module.

The standard way to build a C extension is with Python's `setuptools`. Create this directory layout:

```text
mygreet/
├── greetmodule.c          (from Step 2)
├── setup.py               (classic approach)
└── pyproject.toml         (modern approach — preferred)
```

**`setup.py`** (classic, still widely used):

```python
from setuptools import setup, Extension

module = Extension(
    "greet",                    # module name — must match PyInit_greet
    sources=["greetmodule.c"],  # C source files
    extra_compile_args=["-O2"], # optimisation flags
)

setup(
    name="greet",
    version="0.1",
    description="A simple greeting C extension",
    ext_modules=[module],
)
```

**`pyproject.toml`** (modern standard, PEP 517/518):

```text
[build-system]
requires = ["setuptools", "wheel"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "greet"
version = "0.1"

[tool.setuptools]
ext-modules = [{name = "greet", sources = ["greetmodule.c"]}]
```

Build and install in development mode (editable install):
```text
pip install -e .
```

Or just build without installing:
```text
python setup.py build_ext --inplace
```

This compiles `greetmodule.c` using the same compiler and flags that CPython itself was built with (found via `python3-config`), so the ABI matches exactly.

```check
file greetmodule.c
contains greetmodule.c "PyInit_greet"
```

## Step 6 — Challenge: add error handling with `PyErr_SetString`

**This step:** You add proper Python exception raising to your C extension so it behaves like a real Python function when given bad input.

In Python, you raise exceptions with `raise ValueError("message")`. In C, you set the exception *and then return NULL*:

```c file=safe_greet.c
#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <string.h>

/*
 * safe_divide(a, b) -> float
 * Raises ZeroDivisionError if b == 0.
 * Raises TypeError if either argument is not a number.
 */
static PyObject *
safe_divide(PyObject *self, PyObject *args) {
    double a, b;

    if (!PyArg_ParseTuple(args, "dd", &a, &b))
        return NULL;   /* TypeError already set by PyArg_ParseTuple */

    if (b == 0.0) {
        /* Raise ZeroDivisionError — equivalent to:
         *   raise ZeroDivisionError("division by zero") */
        PyErr_SetString(PyExc_ZeroDivisionError, "division by zero");
        return NULL;
    }

    return PyFloat_FromDouble(a / b);
}

/*
 * safe_hello(name) -> str
 * Raises ValueError if name is empty.
 */
static PyObject *
safe_hello(PyObject *self, PyObject *args) {
    const char *name;

    if (!PyArg_ParseTuple(args, "s", &name))
        return NULL;

    if (strlen(name) == 0) {
        PyErr_SetString(PyExc_ValueError, "name must not be empty");
        return NULL;
    }

    /* Format "Hello, <name>!" using PyUnicode_FromFormat — like sprintf for Python strs */
    return PyUnicode_FromFormat("Hello, %s!", name);
}

/*
 * checked_index(lst, i) -> object
 * Raises IndexError if i is out of range.
 */
static PyObject *
checked_index(PyObject *self, PyObject *args) {
    PyObject *lst;
    int idx;

    if (!PyArg_ParseTuple(args, "O!i", &PyList_Type, &lst, &idx))
        return NULL;   /* TypeError if lst is not a list */

    Py_ssize_t size = PyList_GET_SIZE(lst);
    if (idx < 0 || idx >= (int)size) {
        PyErr_Format(PyExc_IndexError,
                     "list index %d out of range [0, %zd)", idx, size);
        return NULL;
    }

    PyObject *item = PyList_GET_ITEM(lst, idx);
    Py_INCREF(item);   /* caller needs a reference */
    return item;
}

static PyMethodDef SafeMethods[] = {
    {"safe_divide",   safe_divide,   METH_VARARGS, "Divide, raising ZeroDivisionError if b=0."},
    {"safe_hello",    safe_hello,    METH_VARARGS, "Greet, raising ValueError if name is empty."},
    {"checked_index", checked_index, METH_VARARGS, "Index a list safely."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef safemodule = {
    PyModuleDef_HEAD_INIT, "safe_greet", "Error-handling C extension demo.", -1, SafeMethods
};

PyMODINIT_FUNC PyInit_safe_greet(void) {
    return PyModule_Create(&safemodule);
}
```

The golden rules of C extension error handling:
1. **Return `NULL` to signal an error** — never return a Python object if an exception is set.
2. **`PyArg_ParseTuple` returns 0 on failure** and has already set the exception — just `return NULL`.
3. **Never ignore a NULL return** from any CPython API call — check every allocation.
4. **`Py_XDECREF` vs `Py_DECREF`**: use `Py_XDECREF` when the pointer might be NULL.

```hints
nudge: The invariant is: "an exception is set if and only if the function returns NULL." Violating this (returning NULL without setting an exception, or returning a value with an exception set) will cause bizarre crashes deep in the interpreter.
concept: `PyExc_ZeroDivisionError`, `PyExc_ValueError`, `PyExc_TypeError`, `PyExc_IndexError` etc. are global `PyObject*` variables defined in `Objects/exceptions.c`. They're the same objects you'd get from `builtins.ZeroDivisionError` in Python.
shape: The error propagation model is: C function sets exception + returns NULL → caller sees NULL → caller also returns NULL (possibly after cleanup) → ... → the eval loop catches the NULL, sees an active exception, and raises it to Python code.
```

```check
file safe_greet.c
contains safe_greet.c "PyErr_SetString"
contains safe_greet.c "PyExc_ZeroDivisionError"
contains safe_greet.c "PyExc_ValueError"
contains safe_greet.c "return NULL"
contains safe_greet.c "PyUnicode_FromFormat"
```
