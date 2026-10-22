---
title: 2 — How Python Manages Memory: Reference Counting
track: Python Internals — Inside CPython
trackOrder: 11
runtime: cpp
console: true
---

In Python you never call `free()` or worry about allocating memory — it all just works. The magic behind this is **reference counting**: every Python object carries an integer that tracks how many variables (or containers) refer to it. When that counter hits zero, the object is immediately freed. This lesson shows you exactly how that mechanism works, first from Python's own tools, then by implementing it yourself in C.

You'll also encounter reference counting's one weakness — cycles — and see how CPython's *cyclic garbage collector* handles them.

## Step 1 — Observe reference counting in Python with `sys.getrefcount`

**This step:** You use `sys.getrefcount` to watch a reference count change as variables are created and deleted.

```python
import sys

x = []
print(sys.getrefcount(x))   # 2 (x + argument to getrefcount)

y = x                        # second variable points to same list
print(sys.getrefcount(x))   # 3

z = [x, x]                  # two slots in z both point to same list
print(sys.getrefcount(x))   # 5  (x + y + z[0] + z[1] + argument)

del y
print(sys.getrefcount(x))   # 4

del z
print(sys.getrefcount(x))   # 2  (x + argument)
```

Each assignment that makes a new name refer to the same object increments the refcount. Each `del` (or variable going out of scope) decrements it.

```check
run "python -c \"import sys; x=[]; y=x; print(sys.getrefcount(x) >= 3)\"" stdout="True" -- Two references means count is at least 3 (including the getrefcount argument)
```

## Step 2 — Show what happens when refcount hits 0 (object deallocation)

**This step:** You use `__del__` to observe the exact moment an object is freed.

Python calls `__del__` on an object just before it is freed. This lets us watch deallocation happen in real time:

```python
class Watched:
    def __init__(self, name):
        self.name = name
        print(f"  BORN : {self.name}")

    def __del__(self):
        print(f"  FREED: {self.name}")

print("--- Creating a ---")
a = Watched("a")

print("--- Creating b that aliases a ---")
b = a

print("--- Deleting a (refcount goes 2→1, not freed yet) ---")
del a

print("--- Deleting b (refcount goes 1→0, freed NOW) ---")
del b

print("--- After del b ---")
```

Expected output (CPython):
```text
--- Creating a ---
  BORN : a
--- Creating b that aliases a ---
--- Deleting a (refcount goes 2→1, not freed yet) ---
--- Deleting b (refcount goes 1→0, freed NOW) ---
  FREED: a
--- After del b ---
```

Notice `FREED` prints *before* `--- After del b ---`. CPython frees memory *immediately* when the count hits zero — there is no delay.

```check
run "python -c \"\nclass W:\n    def __del__(self): print('freed')\nx = W()\ndel x\nprint('after')\n\"" stdout="freed" -- __del__ is called immediately when refcount hits 0 in CPython
```

## Step 3 — Write a manual reference-counted C struct

**This step:** You write a C struct that tracks its own reference count, just like CPython does.

```c file=refcount_basic.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ------------------------------------------------------------------
 * A hand-rolled reference-counted "object".
 * CPython's PyObject is essentially this, but much more elaborate.
 * ------------------------------------------------------------------ */

typedef struct {
    int   refcount;       /* reference count; starts at 1 on creation */
    char  data[64];       /* payload — in CPython this is ob_type + more */
} RcObject;

/* Allocate a new RcObject with refcount = 1 */
RcObject *rc_new(const char *data) {
    RcObject *obj = malloc(sizeof(RcObject));
    if (!obj) { perror("malloc"); exit(1); }
    obj->refcount = 1;
    strncpy(obj->data, data, sizeof(obj->data) - 1);
    printf("  ALLOC  '%s' @ %p  refcount=%d\n", obj->data, (void*)obj, obj->refcount);
    return obj;
}

/* Increment reference count (like Py_INCREF) */
void rc_incref(RcObject *obj) {
    obj->refcount++;
    printf("  INCREF '%s' @ %p  refcount=%d\n", obj->data, (void*)obj, obj->refcount);
}

/* Decrement reference count; free if it hits 0 (like Py_DECREF) */
void rc_decref(RcObject *obj) {
    obj->refcount--;
    printf("  DECREF '%s' @ %p  refcount=%d\n", obj->data, (void*)obj, obj->refcount);
    if (obj->refcount == 0) {
        printf("  FREE   '%s' @ %p\n", obj->data, (void*)obj);
        free(obj);
    }
}

int main(void) {
    printf("=== Creating object ===\n");
    RcObject *a = rc_new("hello");   /* refcount = 1 */

    printf("\n=== Second reference (like: b = a) ===\n");
    RcObject *b = a;
    rc_incref(b);                    /* refcount = 2 */

    printf("\n=== Drop first reference (like: del a) ===\n");
    rc_decref(a);                    /* refcount = 1 */

    printf("\n=== Drop second reference (like: del b) ===\n");
    rc_decref(b);                    /* refcount = 0 → freed */

    printf("\n=== Done ===\n");
    return 0;
}
```

```check
file refcount_basic.c
run "gcc refcount_basic.c -o refcount_basic && ./refcount_basic" stdout="FREE" -- The object should be freed when the last reference is dropped
contains refcount_basic.c "refcount == 0"
contains refcount_basic.c "free(obj)"
```

## Step 4 — Implement `Py_INCREF` / `Py_DECREF` as macros

**This step:** You turn the increment/decrement logic into C macros, matching the style of CPython's actual header files.

In CPython, `Py_INCREF` and `Py_DECREF` are not functions — they're macros (or inline functions in newer versions) for performance. The macro approach avoids function-call overhead for the most frequent operation in the entire runtime.

```c file=py_macros.c
#include <stdio.h>
#include <stdlib.h>

/* -------------------------------------------------------
 * Simplified PyObject header + Py_INCREF / Py_DECREF
 * mirroring CPython's Include/object.h
 * ------------------------------------------------------- */

typedef struct _object {
    long            ob_refcnt;
    struct _type   *ob_type;   /* simplified: just a pointer placeholder */
} PyObject;

/* tp_dealloc is the destructor stored in the type. Here we inline it. */
static void dealloc(PyObject *op) {
    printf("  [dealloc] freeing object @ %p\n", (void*)op);
    free(op);
}

/* Macros — identical in spirit to CPython's */
#define Py_INCREF(op)  do { ((PyObject*)(op))->ob_refcnt++; } while(0)
#define Py_DECREF(op)  do {                                  \
    if (--((PyObject*)(op))->ob_refcnt == 0)                 \
        dealloc((PyObject*)(op));                            \
} while(0)
#define Py_XDECREF(op) do { if ((op) != NULL) Py_DECREF(op); } while(0)

/* A concrete "object" that embeds PyObject as its first member */
typedef struct {
    PyObject base;   /* MUST be first */
    int      value;
} MyIntObject;

MyIntObject *int_new(int v) {
    MyIntObject *obj = malloc(sizeof(MyIntObject));
    obj->base.ob_refcnt = 1;
    obj->base.ob_type   = NULL;
    obj->value          = v;
    printf("  [new] MyIntObject(%d) @ %p  refcnt=%ld\n",
           v, (void*)obj, obj->base.ob_refcnt);
    return obj;
}

int main(void) {
    MyIntObject *x = int_new(42);

    printf("Before INCREF: refcnt=%ld\n", x->base.ob_refcnt);
    Py_INCREF(x);
    printf("After  INCREF: refcnt=%ld\n", x->base.ob_refcnt);

    Py_DECREF(x);
    printf("After  DECREF: refcnt=%ld\n", x->base.ob_refcnt);

    Py_DECREF(x);   /* this triggers dealloc */
    /* x is now a dangling pointer — don't use it! */
    printf("Object freed.\n");

    return 0;
}
```

```check
file py_macros.c
run "gcc py_macros.c -o py_macros && ./py_macros" stdout="dealloc" -- dealloc must run when refcount hits 0
contains py_macros.c "Py_INCREF"
contains py_macros.c "Py_DECREF"
contains py_macros.c "ob_refcnt == 0"
```

## Step 5 — Cyclic garbage: create a cycle in Python and break it

**This step:** You create a reference cycle in Python, confirm that `sys.getrefcount` stays above 0, and use `gc.collect()` to force collection.

Reference counting has one fatal flaw: **cycles**. If object A holds a reference to B and B holds a reference back to A, neither ever reaches refcount 0, even when no external code can reach them.

```python
import gc, sys

gc.disable()  # turn off the cyclic GC so we can observe the problem

class Node:
    def __init__(self, name):
        self.name = name
        self.friend = None
    def __del__(self):
        print(f"  freed: {self.name}")

a = Node("A")
b = Node("B")

# Create the cycle: A → B → A
a.friend = b
b.friend = a

print(f"refcount(a) before del: {sys.getrefcount(a)}")  # 3: a, b.friend, arg

del a
del b
# Both Node objects still exist! The cycle keeps refcounts > 0.

print("After del a and del b — objects NOT freed yet (cycle prevents it)")
print(f"Garbage count: {len(gc.garbage)}")

gc.enable()
collected = gc.collect()   # cycle detector runs
print(f"gc.collect() freed {collected} objects")
```

CPython's cyclic garbage collector (in `Modules/gcmodule.c`) runs periodically. It uses a tri-colour mark-and-sweep algorithm that can detect and break cycles that pure reference counting cannot handle.

```check
run "python -c \"\nimport gc\ngc.disable()\nclass N:\n    pass\na=N(); b=N(); a.x=b; b.x=a\ndel a; del b\ncollected=gc.collect()\nprint(collected >= 2)\n\"" stdout="True" -- gc.collect should find and free the cycle
```

## Step 6 — Challenge: implement a simple arena allocator in C

**This step:** You write an arena allocator — a block of pre-allocated memory carved up on demand — and understand why CPython uses one for small objects (obmalloc).

For small Python objects (≤ 512 bytes), CPython does **not** use `malloc`/`free` for each allocation. Instead, it manages memory through a custom allocator called **pymalloc** / **obmalloc**, which works like an arena: a large block of memory is allocated up-front, and individual object requests are served by bumping a pointer within it.

```c file=arena.c
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#define ARENA_SIZE (1024 * 4)  /* 4 KB arena — tiny for demo purposes */

typedef struct {
    uint8_t  buffer[ARENA_SIZE];  /* the raw memory block */
    size_t   used;                /* bytes used so far */
    size_t   count;               /* number of allocations made */
} Arena;

/* Initialise an arena */
void arena_init(Arena *a) {
    memset(a->buffer, 0, ARENA_SIZE);
    a->used  = 0;
    a->count = 0;
}

/* Bump-pointer allocation: O(1), no per-object overhead */
void *arena_alloc(Arena *a, size_t size) {
    /* Align to 8 bytes */
    size = (size + 7) & ~(size_t)7;
    if (a->used + size > ARENA_SIZE) {
        return NULL;   /* out of space */
    }
    void *ptr = a->buffer + a->used;
    a->used  += size;
    a->count++;
    return ptr;
}

/* Arenas are freed all at once — there is no per-object free */
void arena_reset(Arena *a) {
    printf("Arena reset: freed %zu allocations (%zu bytes used)\n",
           a->count, a->used);
    a->used  = 0;
    a->count = 0;
}

/* A tiny struct to allocate from the arena */
typedef struct { long ob_refcnt; int value; } TinyObj;

int main(void) {
    Arena arena;
    arena_init(&arena);

    printf("Allocating 10 TinyObjs from arena:\n");
    for (int i = 0; i < 10; i++) {
        TinyObj *obj = arena_alloc(&arena, sizeof(TinyObj));
        if (!obj) { printf("  Out of memory!\n"); break; }
        obj->ob_refcnt = 1;
        obj->value     = i * 10;
        printf("  obj[%d] @ offset %4zu  value=%d\n",
               i, (uint8_t*)obj - arena.buffer, obj->value);
    }

    printf("\nArena stats: %zu bytes used of %d\n", arena.used, ARENA_SIZE);
    arena_reset(&arena);
    return 0;
}
```

```hints
nudge: Notice how `arena_alloc` just adds `size` to `a->used` — it's nearly free compared to `malloc`. This is why Python object creation is so fast.
concept: CPython's obmalloc groups allocations by size class (8, 16, 24 … 512 bytes). Within each size class, it maintains a pool of pre-allocated blocks and a free-list. When a Python object is freed, its slot goes back onto the free-list — not back to the OS.
shape: The arena → pool → block hierarchy is the key structure. Arenas (256 KB each) contain pools (4 KB each), which contain fixed-size blocks. Objects of the same size share a pool.
```

```check
file arena.c
run "gcc arena.c -o arena && ./arena" stdout="Arena reset" -- Arena allocator should run and reset cleanly
contains arena.c "used += size"
contains arena.c "arena_reset"
```
