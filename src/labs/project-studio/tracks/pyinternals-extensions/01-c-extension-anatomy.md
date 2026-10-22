---
title: 1 — Anatomy of a C Extension Module
track: Writing C Extensions for Python
trackOrder: 12
runtime: cpp
console: true
---

When you `import math` in Python, CPython loads a compiled shared library — a `.so` file on Linux/macOS or a `.pyd` on Windows. That library is written in C (or C++), and it exposes Python-callable functions through a rigid ABI that CPython defines. This lesson dissects every piece of that ABI so you can write your own importable extension from scratch.

By the end you will have a working module that Python can import and call, built with nothing but the Python C API headers and a C compiler.

## Step 1 — What a C Extension Actually Is

**This step:** understand what CPython expects to find when it opens a shared library.

In Python, when you write:

```python
import mymod
```

CPython searches `sys.path` for `mymod.so` (or `mymod.cpython-311-x86_64-linux-gnu.so`, etc.). Once it finds the file it calls `dlopen()` on it (or `LoadLibrary()` on Windows) and then immediately looks for a **single exported symbol** named `PyInit_mymod`. If that symbol is missing, the import fails with `ImportError`.

That entry-point function must:
1. Create a module object.
2. Register functions (and optionally types, constants, sub-modules).
3. Return the module object.

Everything else in your `.c` file is private implementation detail. Python only ever calls `PyInit_<name>`.

```text
mymod.so
├── (private C functions)
├── PyMethodDef  method_table[]   ← function registry
├── PyModuleDef  module_def       ← module metadata
└── PyInit_mymod()                ← the ONE exported symbol
```

The module name in `PyInit_<name>` must **exactly match** the filename stem. A mismatch produces `ImportError: dynamic module does not define module export function`.

## Step 2 — The PyObject* Type

**This step:** learn the universal pointer that represents every Python object in C.

In Python every value — an `int`, a `str`, a `list`, a custom class instance — is an object. In C, every one of those objects is represented as a pointer to a `PyObject` struct:

```c
/* Simplified from cpython/object.h */
typedef struct _object {
    Py_ssize_t ob_refcnt;   /* reference count */
    PyTypeObject *ob_type;  /* pointer to the type */
} PyObject;
```

The actual data (the integer value, the string bytes, etc.) lives in a *sub-struct* that begins with these two fields. Because C guarantees that the first member of a struct is at offset zero, you can cast any Python object pointer to `PyObject*` safely.

```c
#include <Python.h>

/* PyLong_New returns PyObject*, not "long*" */
PyObject *num = PyLong_FromLong(42);

/* You cast to the concrete type only when you need internal data */
long val = PyLong_AsLong(num);
```

**Python analogy:** In Python every variable is a reference to an object. In C every variable is a `PyObject *` pointer to that same object.

The `Python.h` header brings in the entire C API. It must be included **before** any standard library headers.

## Step 3 — Define a Method with PyMethodDef

**This step:** fill in a `PyMethodDef` array that maps Python function names to C functions.

Every function you want Python to call must have this exact C signature:

```c
static PyObject *my_func(PyObject *self, PyObject *args);
```

- `self` — the module object (for module-level functions) or the instance (for methods).
- `args` — a `PyTuple` containing all positional arguments.
- Return value — a `PyObject*` on success, `NULL` on error.

You then list every exported function in a **null-terminated array** of `PyMethodDef`:

```c file=snippets/step3.c
```

```c
#include <Python.h>

/* A simple function: returns the string "hello" */
static PyObject *
mymod_hello(PyObject *self, PyObject *args)
{
    return PyUnicode_FromString("hello from C!");
}

/* A function that does nothing and returns None */
static PyObject *
mymod_noop(PyObject *self, PyObject *args)
{
    Py_RETURN_NONE;
}

/*
 * Method table — MUST end with a {NULL, NULL, 0, NULL} sentinel.
 * Fields: name, C function, flags, docstring
 *
 * METH_NOARGS  — function takes no arguments
 * METH_VARARGS — function receives args as a tuple (most common)
 * METH_O       — function receives exactly one PyObject* argument
 */
static PyMethodDef mymod_methods[] = {
    {"hello", mymod_hello, METH_NOARGS,  "Return a greeting string."},
    {"noop",  mymod_noop,  METH_NOARGS,  "Do nothing, return None."},
    {NULL, NULL, 0, NULL}   /* sentinel */
};
```

```check
contains snippets/step3.c "static PyMethodDef"
contains snippets/step3.c "METH_NOARGS"
contains snippets/step3.c "NULL, NULL, 0, NULL"
```

## Step 4 — The Module Definition Struct PyModuleDef

**This step:** create the `PyModuleDef` that describes the module to CPython.

```c
static struct PyModuleDef mymod_def = {
    PyModuleDef_HEAD_INIT,  /* always this literal — initialises internal fields */
    "mymod",                /* module name (matches filename stem) */
    "A minimal example C extension.",  /* module docstring, or NULL */
    -1,                     /* per-interpreter module state size;
                               -1 means "no state, use global variables" */
    mymod_methods           /* pointer to our method table */
};
```

`PyModuleDef_HEAD_INIT` is a macro that fills in bookkeeping fields that CPython manages internally. You always write it literally — never replace it with `0` or `NULL`.

The `size` field (`-1`) controls whether CPython allocates extra memory for per-interpreter state. For most simple extensions `-1` is correct. Positive values are used in advanced "multi-phase init" scenarios covered in PEP 489.

**Python analogy:** Think of `PyModuleDef` as the class body of a module — it declares the module's name, docstring, and the functions it provides.

## Step 5 — The Init Function: PyMODINIT_FUNC

**This step:** write the `PyInit_` entry point that Python calls when the module is imported.

```c
PyMODINIT_FUNC
PyInit_mymod(void)
{
    return PyModule_Create(&mymod_def);
}
```

`PyMODINIT_FUNC` is a macro that expands to the correct return type and, on Windows, the `__declspec(dllexport)` attribute that makes the symbol visible from the DLL. Always use the macro — never write `PyObject *` by hand here.

`PyModule_Create` allocates a new module object, registers all methods from the `PyMethodDef` table, sets the docstring, and returns the module. If it fails (out of memory, etc.) it returns `NULL` — and returning `NULL` from `PyInit_` signals to CPython that the import failed.

Putting it all together into one compilable file:

```c
/* mymod.c — complete minimal C extension */
#include <Python.h>

static PyObject *
mymod_hello(PyObject *self, PyObject *args)
{
    return PyUnicode_FromString("hello from C!");
}

static PyMethodDef mymod_methods[] = {
    {"hello", mymod_hello, METH_NOARGS, "Return a greeting."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef mymod_def = {
    PyModuleDef_HEAD_INIT,
    "mymod",
    NULL,
    -1,
    mymod_methods
};

PyMODINIT_FUNC
PyInit_mymod(void)
{
    return PyModule_Create(&mymod_def);
}
```

To compile manually (Linux/macOS):

```text
$ gcc -O2 -shared -fPIC \
      $(python3-config --includes --ldflags) \
      -o mymod$(python3-config --extension-suffix) \
      mymod.c
$ python3 -c "import mymod; print(mymod.hello())"
hello from C!
```

```check
run "python -c \"import mymod; print(mymod.hello())\"" stdout="hello from C!"
```

## Step 6 — Challenge: Export a Constant from Your Module

**This step:** extend the module init function to add an integer constant that Python code can read as `mymod.VERSION`.

Adding a constant is done inside `PyInit_`, after `PyModule_Create` but before returning the module:

```c
PyMODINIT_FUNC
PyInit_mymod(void)
{
    PyObject *m = PyModule_Create(&mymod_def);
    if (m == NULL)
        return NULL;

    /* PyModule_AddIntConstant(module, name, value) */
    if (PyModule_AddIntConstant(m, "VERSION", 1) < 0) {
        Py_DECREF(m);
        return NULL;
    }

    return m;
}
```

Other useful `PyModule_Add*` helpers:

| Helper | Python type added |
|---|---|
| `PyModule_AddIntConstant` | `int` |
| `PyModule_AddStringConstant` | `str` |
| `PyModule_AddObject` | any `PyObject*` (steals reference) |
| `PyModule_AddObjectRef` | any `PyObject*` (does NOT steal reference — safer) |

> **Note:** Always check the return value of every `PyModule_Add*` call. If it returns `-1`, an error has been set and you must `Py_DECREF` the partially-constructed module and return `NULL`.

**Your challenge:** Write `constmod.c` that exports:
- A function `greet(name)` returning `f"Hello, {name}!"` (just hardcode any name for now — argument parsing is Lesson 2).
- An integer constant `MAGIC = 42`.
- A string constant `AUTHOR = "me"`.

Verify with:

```python
import constmod
print(constmod.MAGIC)    # 42
print(constmod.AUTHOR)   # me
print(constmod.greet())  # Hello, world!
```

```hints
nudge: Use PyModule_AddIntConstant and PyModule_AddStringConstant in PyInit_.
concept: For greet(), ignore args for now and return PyUnicode_FromString("Hello, world!").
shape: Always check every PyModule_Add* return value; clean up with Py_DECREF(m) on failure.
```

```check
file constmod.c
contains constmod.c "PyModule_AddIntConstant"
contains constmod.c "PyModule_AddStringConstant"
contains constmod.c "PyMODINIT_FUNC"
```
