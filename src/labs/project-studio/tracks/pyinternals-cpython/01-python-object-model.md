---
title: 1 — Every Python Object is a C Struct
track: Python Internals — Inside CPython
trackOrder: 10
runtime: cpp
console: true
---

You already know that in Python, *everything is an object* — integers, strings, functions, even `None`. But have you ever wondered what that actually means at the machine level? Under the hood, every Python object is a C struct stored in memory, and CPython (the reference implementation written in C) manages those structs for you automatically. In this lesson you'll peel back that abstraction: you'll inspect live Python objects using `sys` and `ctypes`, then read and re-create the actual C struct that Python uses to represent every object in existence.

This is the foundation for everything else in this track. Once you understand `PyObject`, reference counting, the GIL, and bytecode all click into place.

## Step 1 — Inspect a Python object's refcount with `sys.getrefcount`

**This step:** You use `sys.getrefcount` to see the reference count of a live Python object, then use `ctypes` to read the raw C integer from the object's memory address.

In Python, every object has an internal reference count — an integer stored at the very start of the object's memory block. CPython increments this counter every time a new variable points to the object and decrements it when a reference is dropped. When the count hits zero, the object is freed.

The `sys` module exposes this counter:

```python
import sys

x = "hello"
print(sys.getrefcount(x))   # e.g. 2  (x + the argument to getrefcount)
```

> **Why 2 and not 1?** Passing `x` to `getrefcount` creates a *temporary* reference inside the function call, so the count is always at least 1 higher than you'd expect.

Now let's go lower. `ctypes` lets you interpret raw memory. The first field of every CPython object is `ob_refcnt`, a C `ssize_t` at offset 0. You can read it directly:

```python
import ctypes, sys

x = [1, 2, 3]
addr = id(x)               # id() returns the memory address in CPython
refcnt = ctypes.c_ssize_t.from_address(addr).value
print(f"refcount via ctypes: {refcnt}")
print(f"refcount via sys   : {sys.getrefcount(x)}")
```

The `ctypes` value will be 1 less than `sys.getrefcount` because `from_address` doesn't create an extra Python reference the way passing `x` to a function does.

```check
run "python -c \"import sys; x = []; print(sys.getrefcount(x) >= 2)\"" stdout="True" -- sys.getrefcount returns at least 2 when called with a local variable
```

## Step 2 — Read the PyObject C struct definition

**This step:** You read the actual CPython source definition of `PyObject` and understand each field.

Every single Python object — whether it's an integer, a list, a class, or a generator — begins with these two fields in memory:

```c
/* From: Include/object.h in the CPython source */

typedef struct _object {
    Py_ssize_t ob_refcnt;   /* reference count — how many references exist */
    PyTypeObject *ob_type;  /* pointer to the type (e.g. &PyLong_Type) */
} PyObject;
```

That's it. Just a 64-bit signed integer and a pointer. On a 64-bit system, `PyObject` is 16 bytes.

The `ob_type` pointer tells CPython *what kind of object this is*. It points to a `PyTypeObject` (also a C struct), which contains function pointers for operations like `tp_repr`, `tp_hash`, `tp_call`, `tp_richcompare`, and so on. Python's "methods" are literally C function pointers stored inside the type struct.

For integers specifically, CPython uses a larger struct that *extends* `PyObject`:

```c
/* From: Include/cpython/longintrepr.h */

typedef struct _PyLongObject {
    PyObject ob_base;       /* MUST be first — the common PyObject header */
    Py_ssize_t ob_size;     /* number of "digits" (CPython uses base 2^30) */
    uint32_t ob_digit[1];   /* the actual digit array (variable length) */
} PyLongObject;
```

This is why `sys.getsizeof(0)` returns 28 bytes on a 64-bit system, while `sys.getsizeof(10**30)` returns more — larger integers need more digits in the `ob_digit` array.

```python
import sys
for n in [0, 1, 2**30, 2**60, 2**90]:
    print(f"{n!r:15} → {sys.getsizeof(n)} bytes")
```

```check
run "python -c \"import sys; print(sys.getsizeof(0) >= 24)\"" stdout="True" -- A Python int takes at least 24 bytes due to the PyObject header
```

## Step 3 — Create a minimal C struct that mirrors `PyObject`

**This step:** You write a C file that defines a struct matching CPython's `PyObject` header and prints the size and offset of each field.

Create the file `pyobject_mirror.c`:

```c file=pyobject_mirror.c
#include <stdio.h>
#include <stddef.h>   /* for offsetof */
#include <stdint.h>   /* for int64_t  */

/*
 * A minimal mirror of CPython's PyObject.
 * In real CPython, Py_ssize_t is a signed 64-bit int on 64-bit systems.
 */
typedef int64_t  Py_ssize_t;
typedef void*    PyTypeObject_ptr;  /* simplified: just a void pointer */

typedef struct {
    Py_ssize_t      ob_refcnt;   /* reference count */
    PyTypeObject_ptr ob_type;    /* pointer to the type object */
} MyPyObject;

/*
 * A minimal mirror of PyLongObject (small integer version).
 * Real CPython's layout is more complex, but this captures the idea.
 */
typedef struct {
    MyPyObject  ob_base;    /* MUST be first — embeds the common header */
    Py_ssize_t  ob_size;    /* number of digits */
    uint32_t    ob_digit[1]; /* digit storage */
} MyPyLongObject;

int main(void) {
    printf("=== MyPyObject layout ===\n");
    printf("sizeof(MyPyObject)          = %zu bytes\n", sizeof(MyPyObject));
    printf("offsetof ob_refcnt          = %zu\n", offsetof(MyPyObject, ob_refcnt));
    printf("offsetof ob_type            = %zu\n", offsetof(MyPyObject, ob_type));

    printf("\n=== MyPyLongObject layout ===\n");
    printf("sizeof(MyPyLongObject)      = %zu bytes\n", sizeof(MyPyLongObject));
    printf("offsetof ob_base            = %zu\n", offsetof(MyPyLongObject, ob_base));
    printf("offsetof ob_size            = %zu\n", offsetof(MyPyLongObject, ob_size));
    printf("offsetof ob_digit           = %zu\n", offsetof(MyPyLongObject, ob_digit));

    /* Demonstrate that ob_base is at offset 0 — this is CRITICAL.
     * CPython casts PyLongObject* to PyObject* freely, which is only safe
     * because ob_base is guaranteed to be the first member.
     */
    MyPyLongObject lng = { {3, NULL}, 1, {42} };
    MyPyObject *as_obj = (MyPyObject *)&lng;  /* safe cast */
    printf("\nCast PyLongObject -> PyObject:\n");
    printf("  ob_refcnt = %lld\n", (long long)as_obj->ob_refcnt);

    return 0;
}
```

```check
file pyobject_mirror.c
run "gcc pyobject_mirror.c -o pyobject_mirror && ./pyobject_mirror" stdout="sizeof(MyPyObject)" -- Compile and run the struct layout program
contains pyobject_mirror.c "ob_refcnt"
contains pyobject_mirror.c "ob_type"
contains pyobject_mirror.c "offsetof"
```

## Step 4 — Write a C program that lays out a struct and prints `sizeof()` values

**This step:** You extend the program to compare struct sizes against Python's `sys.getsizeof()` values and understand why they match.

The `sizeof` operator in C is the equivalent of Python's `sys.getsizeof()`. Let's build a program that prints sizes for multiple struct types and compare them to Python:

```c file=sizeof_demo.c
#include <stdio.h>
#include <stdint.h>

/* Minimal PyObject mirror */
typedef struct { int64_t refcnt; void *type; } Obj;

/* PyFloatObject stores a C double */
typedef struct { Obj base; double ob_fval; } FloatObj;

/* PyListObject has a pointer to an array of PyObject* */
typedef struct {
    Obj      base;
    int64_t  ob_size;    /* number of items currently in the list */
    void   **ob_item;    /* pointer to array of PyObject* pointers */
    int64_t  allocated;  /* allocated slots (may be > ob_size) */
} ListObj;

int main(void) {
    printf("C struct sizes (compare with Python's sys.getsizeof):\n");
    printf("  Obj (PyObject header) : %zu bytes\n", sizeof(Obj));
    printf("  FloatObj (PyFloat)    : %zu bytes\n", sizeof(FloatObj));
    printf("  ListObj  (PyList, 0)  : %zu bytes\n", sizeof(ListObj));
    printf("\n");
    printf("Run in Python:\n");
    printf("  import sys\n");
    printf("  sys.getsizeof(0.0)  # should be close to %zu + overhead\n", sizeof(FloatObj));
    printf("  sys.getsizeof([])   # should be close to %zu + overhead\n", sizeof(ListObj));
    return 0;
}
```

```check
file sizeof_demo.c
run "gcc sizeof_demo.c -o sizeof_demo && ./sizeof_demo" stdout="FloatObj" -- Compile and run the sizeof demo
contains sizeof_demo.c "double ob_fval"
```

## Step 5 — Challenge: why can `id(x) == id(y)` be true when `x is not y`?

**This step:** You reason about object identity, memory reuse, and the `id()` function's contract in CPython.

In Python, `id(obj)` is documented as returning "an integer guaranteed to be unique and constant for the object during its lifetime." The key phrase is *during its lifetime*.

```python
# Create an integer, capture its id, then let it be collected
a = 1000     # not a small int (CPython caches -5..256)
addr_a = id(a)
del a        # refcount → 0, object is freed, memory returned to pool

b = 1001     # CPython may reuse the same memory block
addr_b = id(b)

# On CPython, this is often True!
print(addr_a == addr_b)  # True (same address, different objects, different times)
```

This is **not** a bug — it's correct behavior. The two objects never *co-existed*, so there's no ambiguity. The C memory allocator is simply reusing the same block.

```hints
nudge: Try this with small integers (0–256) — CPython *interns* them, so you'll always get the same address for the same value. Use larger integers to see reuse.
concept: Object identity (`is`) checks if two variables point to the *same C struct in memory right now*. `id()` returns that address as an integer. If the first object is gone before the second is created, the address can be recycled.
shape: The key insight is that `id()` uniqueness is only guaranteed for the *lifetime* of an object, not across the entire run of a program.
```

```check
run "python -c \"x = object(); y = object(); print(type(x) == type(y))\"" stdout="True" -- Both are object instances sharing the same type
```
