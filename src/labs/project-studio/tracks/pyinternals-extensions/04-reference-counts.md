---
title: 4 — Reference Counting in C Extensions
track: Writing C Extensions for Python
trackOrder: 12
runtime: cpp
console: true
---

CPython manages object lifetimes with reference counting — a counter embedded in every `PyObject` that tracks how many things currently "hold" that object. When the counter reaches zero, the object is immediately destroyed. In C extensions *you* are responsible for keeping those counts correct. Getting them wrong produces the two most dreaded bugs in extension writing: **memory leaks** (refcount too high — objects never freed) and **use-after-free crashes** (refcount too low — objects destroyed while still in use).

## Step 1 — Every Python Object Has a Refcount

**This step:** understand what `ob_refcnt` is and when CPython changes it automatically.

```c
typedef struct _object {
    Py_ssize_t ob_refcnt;   /* 1 when first created */
    PyTypeObject *ob_type;
    /* ... type-specific data follows */
} PyObject;
```

The refcount starts at 1 when an object is created. CPython increments it:
- When an object is stored in a container (list, dict, tuple, …).
- When an object is bound to a name in a frame.
- When any C code calls `Py_INCREF`.

CPython decrements it:
- When an object is removed from a container.
- When a name goes out of scope.
- When any C code calls `Py_DECREF`.

When the count reaches 0, `Py_DECREF` immediately calls `tp_dealloc` to destroy the object and free its memory.

You can inspect the count from Python (for testing only — never rely on it in real code):

```python
import sys
x = "hello"
sys.getrefcount(x)   # 3: x, the argument to getrefcount, and the string intern table
```

In C:

```c
PyObject *s = PyUnicode_FromString("hello");  /* refcount = 1 */
Py_INCREF(s);                                 /* refcount = 2 */
Py_DECREF(s);                                 /* refcount = 1 */
Py_DECREF(s);                                 /* refcount = 0 → destroyed! */
/* s is now a dangling pointer — never use it again */
```

## Step 2 — Borrowed References: Don't INCREF When You Borrow

**This step:** recognise functions that return borrowed references and know not to own them.

A **borrowed reference** is a `PyObject *` whose refcount you did *not* increment and are *not* responsible for decrementing. It is valid only as long as the owner object is alive.

The most common source of borrowed references: tuple and list **item accessors**.

```c
static PyObject *
mymod_first(PyObject *self, PyObject *args)
{
    PyObject *lst;
    if (!PyArg_ParseTuple(args, "O!", &PyList_Type, &lst))
        return NULL;

    if (PyList_GET_SIZE(lst) == 0) {
        PyErr_SetString(PyExc_ValueError, "list is empty");
        return NULL;
    }

    /* PyList_GET_ITEM returns a BORROWED reference.
       We must NOT Py_DECREF it. We must NOT store it past the list's lifetime.
       We DO need to Py_INCREF it if we return it (returning "gives" a reference
       to the caller, so we must own one to give). */
    PyObject *item = PyList_GET_ITEM(lst, 0);
    Py_INCREF(item);    /* now we own a reference we can return */
    return item;
}
```

**Rule of thumb:**
- `PyList_GET_ITEM`, `PyTuple_GET_ITEM`, `PyDict_GetItem` → **borrowed**.
- `PyList_GetItem` (with bounds check), `PyObject_GetItem` → also **borrowed**.
- `PyList_GetItemRef` (Python 3.13+) → **new** (you own it).

**Python analogy:** Borrowing is like reading a value from a list without assigning it:
```python
first = my_list[0]   # first holds a reference — Python handles refcounting silently
```

## Step 3 — New References: You Own Them, You Must DECREF

**This step:** recognise functions that return new (owned) references and always release them.

A **new reference** is a `PyObject *` whose refcount was incremented for you by the function that returned it. You are responsible for eventually decrementing it.

```c
static PyObject *
mymod_demo_new(PyObject *self, PyObject *args)
{
    /* PyUnicode_FromString creates a new object: refcount = 1, you own it */
    PyObject *s = PyUnicode_FromString("hello");
    if (s == NULL)
        return NULL;

    /* PyObject_Repr also returns a new reference */
    PyObject *r = PyObject_Repr(s);
    Py_DECREF(s);   /* done with s — release it */
    if (r == NULL)
        return NULL;

    /* We return r — the caller now owns it; we do NOT Py_DECREF(r) here */
    return r;
}
```

C API functions that always return **new** references:
- All `Py*_From*` constructors (`PyLong_FromLong`, `PyUnicode_FromString`, …)
- `PyObject_Repr`, `PyObject_Str`, `PyObject_Call`
- `Py_BuildValue`, `PyTuple_Pack`
- `PyList_New`, `PyDict_New`, `PyTuple_New`

The documentation marks each function as either "Return value: New reference" or "Return value: Borrowed reference".

## Step 4 — Py_XDECREF for Possibly-NULL Pointers

**This step:** use the safe variant of DECREF that handles NULL gracefully.

In real code, cleanup paths often deal with pointers that might be `NULL` — because the object was never created (due to an earlier error). `Py_DECREF(NULL)` is **undefined behaviour** (it will crash). Use `Py_XDECREF` instead:

```c
static PyObject *
mymod_build_pair(PyObject *self, PyObject *args)
{
    PyObject *a = NULL, *b = NULL, *result = NULL;

    a = PyLong_FromLong(1);
    if (a == NULL) goto error;

    b = PyLong_FromLong(2);
    if (b == NULL) goto error;

    result = PyTuple_Pack(2, a, b);
    /* PyTuple_Pack INCREFs a and b, so we release our owns: */
    Py_DECREF(a);
    Py_DECREF(b);
    return result;   /* caller owns result */

error:
    /* Py_XDECREF is safe even if the pointer is NULL */
    Py_XDECREF(a);
    Py_XDECREF(b);
    return NULL;
}
```

Similarly, `Py_XINCREF` is the NULL-safe version of `Py_INCREF`. Use `Py_XINCREF` when a variable might legitimately be `NULL` (e.g. an optional object that defaults to `None`).

The macro expansions are:
```c
#define Py_XDECREF(op) do { if ((op) != NULL) Py_DECREF(op); } while (0)
#define Py_XINCREF(op) do { if ((op) != NULL) Py_INCREF(op); } while (0)
```

> **Tip:** Initialise all `PyObject *` locals to `NULL` at the top of every function. Then you can safely call `Py_XDECREF` on all of them in the error path without worrying about which ones were successfully created.

## Step 5 — Reference Leaks: A Common C Extension Bug

**This step:** see what a reference leak looks like and how to detect it.

A **reference leak** occurs when you INCREF (or receive a new reference) and never DECREF. The object's refcount is permanently inflated and it is never freed:

```c
/* BUGGY function — leaks 'tmp' on every call */
static PyObject *
mymod_leaky(PyObject *self, PyObject *args)
{
    /* tmp is a new reference — we own it */
    PyObject *tmp = PyList_New(0);
    if (tmp == NULL)
        return NULL;

    /* We do some work, then forget to Py_DECREF(tmp)! */

    Py_RETURN_NONE;
    /* tmp leaks here — its refcount stays at 1 forever */
}
```

Fixed:
```c
static PyObject *
mymod_fixed(PyObject *self, PyObject *args)
{
    PyObject *tmp = PyList_New(0);
    if (tmp == NULL)
        return NULL;

    /* ... do work ... */

    Py_DECREF(tmp);    /* release before returning */
    Py_RETURN_NONE;
}
```

Tools for finding leaks:
- **`sys.gettotalrefcount()`** (only in Python debug builds — `python3-dbg`)
- **`tracemalloc`** (Python stdlib)
- **Valgrind** with the CPython suppression file
- **`-fsanitize=address`** with a debug Python build

Leaks in extension code accumulate silently in long-running processes and eventually exhaust memory. Test with `tracemalloc` snapshots around repeated calls to your function.

## Step 6 — The "Steal" Convention

**This step:** understand functions that steal a reference, so you don't double-free.

Some C API functions **steal** the reference you pass in: they take ownership and will eventually DECREF it for you. If you DECREF after calling them, you create a double-free crash.

```c
/* PyTuple_SET_ITEM steals the reference to 'item' */
PyObject *tup = PyTuple_New(2);
PyObject *item0 = PyLong_FromLong(10);  /* new ref, refcount=1 */
PyObject *item1 = PyLong_FromLong(20);  /* new ref, refcount=1 */

PyTuple_SET_ITEM(tup, 0, item0);   /* tup now owns item0 — do NOT Py_DECREF(item0) */
PyTuple_SET_ITEM(tup, 1, item1);   /* tup now owns item1 — do NOT Py_DECREF(item1) */

return tup;   /* caller owns tup */
```

Compare with `PyTuple_Pack`, which does **not** steal:
```c
/* PyTuple_Pack INCREFs each item — you still own your refs */
PyObject *tup = PyTuple_Pack(2, item0, item1);
Py_DECREF(item0);   /* you must still release yours */
Py_DECREF(item1);
return tup;
```

Other common steal functions:
- `PyList_SET_ITEM(list, i, item)` — steals `item`
- `PyModule_AddObject(mod, name, val)` — steals `val` **only on success** (use `PyModule_AddObjectRef` to avoid this footgun)

The documentation labels stealing functions explicitly: "This function steals a reference to *value*."

## Step 7 — Challenge: Find the Refcount Bug

**This step:** audit a buggy function, identify the refcount error, and fix it.

Study this function carefully:

```c
/* Returns a list of n copies of the given string */
static PyObject *
mymod_repeat(PyObject *self, PyObject *args)
{
    const char *text;
    int n;

    if (!PyArg_ParseTuple(args, "si", &text, &n))
        return NULL;

    PyObject *lst = PyList_New(n);
    if (lst == NULL)
        return NULL;

    for (int i = 0; i < n; i++) {
        PyObject *s = PyUnicode_FromString(text);
        if (s == NULL) {
            Py_DECREF(lst);
            return NULL;
        }
        PyList_SET_ITEM(lst, i, s);
        Py_DECREF(s);                /* (A) */
    }

    return lst;
}
```

There is exactly one refcount bug in this function. Your tasks:

1. **Identify** which line is wrong and explain why.
2. **Fix** the function.
3. **Write** a Python test that would crash or exhibit incorrect behaviour with the buggy version (hint: try accessing the list items after the call).

```hints
nudge: PyList_SET_ITEM steals the reference to s.
concept: If you then Py_DECREF(s), the refcount drops to zero and the string is freed while it is still in the list.
shape: Remove line (A) — SET_ITEM already took ownership.
- The crash often manifests as a segfault when printing the returned list, because the freed string memory is accessed.
```

```check
file repeat_mod.c
contains repeat_mod.c "PyList_SET_ITEM"
contains repeat_mod.c "PyUnicode_FromString"
```
