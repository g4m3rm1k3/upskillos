---
title: 5 — malloc, free and Why Python Hides This
track: C for Python Programmers
trackOrder: 15
runtime: cpp
console: true
---

Python never asks you to allocate or free memory — you create objects and they disappear when nothing refers to them anymore. This feels magical, but CPython is doing explicit `malloc` and `free` calls underneath every object creation and destruction. Python's garbage collector (reference counting + cycle detection) automates what C makes you do by hand.

In this lesson, you'll manage memory yourself. You'll feel the responsibility that Python's memory manager carries on your behalf. You'll also understand why memory-related bugs (leaks, use-after-free, double-free) are C's most infamous hazard — and why Python was designed to eliminate them.

## Step 1 — Stack Memory: Automatic Allocation

**This step:** Observe how local variables live on the stack and are automatically reclaimed.

When you write `int x = 5;` inside a function, that variable lives on the **stack** — a fast, automatically managed region of memory. When the function returns, the stack frame is popped and all its variables vanish. No cleanup needed.

Python local variables work conceptually the same way, but the values (Python objects) live on the **heap**. The variable in Python is just a slot holding a pointer to a heap object.

```c
void demonstrate_stack(void) {
    int  a = 10;    /* stack-allocated */
    char b = 'X';   /* stack-allocated */
    /* When this function returns, a and b are gone automatically */
}
```

Stack characteristics:
- **Fast**: allocation/deallocation is just moving a stack pointer
- **Automatic**: lifetime is tied to the enclosing scope
- **Limited**: typically 1–8 MB total — don't put huge arrays here
- **LIFO**: last in, first out (like Python's call stack)

```c file=stack_demo.c
#include <stdio.h>

void show_frame(int depth) {
    int local = depth * 10;
    printf("Frame %d: local=%d at %p\n", depth, local, (void *)&local);

    if (depth < 3) {
        show_frame(depth + 1);
    }

    /* local is still valid here — we're back in this frame */
    printf("Back in frame %d: local still = %d\n", depth, local);
}

int main(void) {
    int x = 1;
    int y = 2;
    printf("main: x at %p, y at %p\n", (void *)&x, (void *)&y);
    printf("Stack grows toward lower addresses:\n");
    show_frame(1);
    return 0;
}
```

```check
file stack_demo.c
run "gcc -o stack_demo stack_demo.c && ./stack_demo" stdout="Back in frame 1" -- Recursive function demonstrating stack frames
contains stack_demo.c "show_frame(depth + 1)"
contains stack_demo.c "int local = depth"
```

## Step 2 — Heap Memory: malloc Allocates

**This step:** Use `malloc` to allocate memory on the heap that persists beyond a function's return.

The **heap** is memory you explicitly request from the operating system. It persists until you explicitly free it (or the program exits). This is where Python allocates all its objects.

```c
#include <stdlib.h>

int *p = (int *)malloc(sizeof(int));   /* allocate space for one int on the heap */
*p = 42;
printf("%d\n", *p);
free(p);   /* return memory to the OS */
```

`malloc` (memory allocate) takes a byte count and returns a `void *` (a generic pointer). You cast it to your desired type. The result: a pointer to usable memory on the heap.

`sizeof` is essential here: `malloc(sizeof(int))` allocates exactly the right number of bytes for one `int` regardless of platform. Don't hardcode `malloc(4)`.

For an array of N elements: `malloc(N * sizeof(element_type))`.

```c file=malloc_basic.c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    /* allocate a single int on the heap */
    int *single = (int *)malloc(sizeof(int));
    *single = 42;
    printf("Heap int: %d at %p\n", *single, (void *)single);

    /* allocate an array of 5 ints on the heap */
    int *arr = (int *)malloc(5 * sizeof(int));
    for (int i = 0; i < 5; i++) {
        arr[i] = i * i;   /* 0, 1, 4, 9, 16 */
    }

    printf("Heap array: ");
    for (int i = 0; i < 5; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");

    /* IMPORTANT: free when done */
    free(single);
    free(arr);

    printf("Memory freed successfully.\n");
    return 0;
}
```

```check
file malloc_basic.c
run "gcc -o malloc_basic malloc_basic.c && ./malloc_basic" stdout="Heap array: 0 1 4 9 16" -- Allocate a heap array and fill with squares
contains malloc_basic.c "#include <stdlib.h>"
contains malloc_basic.c "malloc("
contains malloc_basic.c "free(single)"
contains malloc_basic.c "free(arr)"
```

## Step 3 — Always Check for NULL After malloc

**This step:** Handle `malloc` failure by checking the return value for `NULL` before using the pointer.

`malloc` can fail — if the system runs out of memory, it returns `NULL`. Using a `NULL` pointer causes a segfault. Every `malloc` call should be followed by a `NULL` check.

In Python, you never think about this — if the system runs out of memory, Python raises `MemoryError`. CPython's allocator checks `malloc`'s return value and raises the error for you. In C, **you** are that check.

```c
int *p = (int *)malloc(sizeof(int));
if (p == NULL) {
    fprintf(stderr, "Error: malloc failed\n");
    return 1;   /* or exit(1) — signal failure to caller */
}
/* safe to use p */
```

A good pattern is a helper function that exits on allocation failure:

```c
int *safe_malloc(size_t n) {
    int *p = (int *)malloc(n);
    if (!p) { fprintf(stderr, "out of memory\n"); exit(1); }
    return p;
}
```

```c file=malloc_check.c
#include <stdio.h>
#include <stdlib.h>

/* Helper: allocate or die */
void *xmalloc(size_t size) {
    void *ptr = malloc(size);
    if (ptr == NULL) {
        fprintf(stderr, "Fatal: malloc(%zu) failed\n", size);
        exit(EXIT_FAILURE);
    }
    return ptr;
}

int main(void) {
    /* Normal allocation with check */
    int *arr = (int *)malloc(10 * sizeof(int));
    if (arr == NULL) {
        fprintf(stderr, "Allocation failed!\n");
        return 1;
    }

    for (int i = 0; i < 10; i++) {
        arr[i] = i + 1;
    }

    printf("Allocated OK: arr[9] = %d\n", arr[9]);
    free(arr);

    /* Using the safe helper */
    double *scores = (double *)xmalloc(5 * sizeof(double));
    scores[0] = 98.5;
    printf("scores[0] = %.1f\n", scores[0]);
    free(scores);

    printf("All allocations succeeded.\n");
    return 0;
}
```

```check
file malloc_check.c
run "gcc -o malloc_check malloc_check.c && ./malloc_check" stdout="All allocations succeeded." -- Check malloc return value for NULL before using the pointer
contains malloc_check.c "if (arr == NULL)"
contains malloc_check.c "xmalloc"
contains malloc_check.c "EXIT_FAILURE"
```

## Step 4 — calloc: Zeroed Memory

**This step:** Use `calloc` to allocate zero-initialized memory, and understand when to prefer it over `malloc`.

`malloc` returns uninitialized memory — it contains whatever bytes happened to be there before. This is fast but dangerous: reading before writing gives you garbage values.

`calloc` (clear-allocate) both allocates and **zeroes** the memory:

```c
/* malloc: fast, uninitialized */
int *a = (int *)malloc(100 * sizeof(int));    /* values undefined */

/* calloc: slightly slower, but zeroed */
int *b = (int *)calloc(100, sizeof(int));     /* all zeros guaranteed */
```

`calloc` takes two arguments: number of elements, and size of each element. It also checks for integer overflow in `n * size` — `malloc(n * size)` can overflow if `n` is huge.

CPython uses `calloc` (via `PyMem_Calloc`) when initializing object memory. Python `list` contents are zeroed (filled with `NULL` pointers) when the list is first allocated.

```c file=calloc_demo.c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 8;

    /* calloc: num_elements, element_size */
    int *arr = (int *)calloc(n, sizeof(int));
    if (!arr) { return 1; }

    printf("After calloc (all zeros):\n");
    for (int i = 0; i < n; i++) {
        printf("  arr[%d] = %d\n", i, arr[i]);
    }

    /* Now use the array */
    for (int i = 0; i < n; i++) {
        arr[i] = (i + 1) * 3;
    }

    printf("After filling:\n");
    for (int i = 0; i < n; i++) {
        printf("  arr[%d] = %d\n", i, arr[i]);
    }

    free(arr);
    return 0;
}
```

```check
file calloc_demo.c
run "gcc -o calloc_demo calloc_demo.c && ./calloc_demo" stdout="arr[0] = 0" -- Use calloc to get zero-initialized memory
contains calloc_demo.c "calloc(n, sizeof(int))"
contains calloc_demo.c "free(arr)"
```

## Step 5 — realloc: Growing an Allocation

**This step:** Use `realloc` to resize a heap allocation, analogous to Python's list growth.

Python lists grow automatically when you `append()`. Internally, CPython uses `realloc` to resize the underlying array when more space is needed.

`realloc` takes an existing pointer and a new size, returns a (possibly moved) pointer to the resized memory:

```c
int *arr = (int *)malloc(5 * sizeof(int));
/* ... use arr ... */

/* need more space — grow to 10 elements */
int *bigger = (int *)realloc(arr, 10 * sizeof(int));
if (bigger == NULL) {
    free(arr);   /* realloc failed; original still valid */
    return 1;
}
arr = bigger;   /* update the pointer — old arr may be invalid now */
```

**Critical rule**: if `realloc` succeeds, the old pointer **may be invalid** (realloc may have moved the memory). Always use the return value. Never use the old pointer after calling `realloc`.

```c file=realloc_demo.c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int  capacity = 4;
    int  length   = 0;
    int *arr      = (int *)malloc(capacity * sizeof(int));
    if (!arr) return 1;

    /* simulate Python list append with automatic growth */
    for (int value = 10; value <= 80; value += 10) {
        if (length == capacity) {
            capacity *= 2;   /* double like Python lists do */
            int *tmp = (int *)realloc(arr, capacity * sizeof(int));
            if (!tmp) { free(arr); return 1; }
            arr = tmp;
            printf("Grew to capacity %d\n", capacity);
        }
        arr[length++] = value;
    }

    printf("Final array (length=%d, capacity=%d):\n", length, capacity);
    for (int i = 0; i < length; i++) {
        printf("  %d\n", arr[i]);
    }

    free(arr);
    return 0;
}
```

```check
file realloc_demo.c
run "gcc -o realloc_demo realloc_demo.c && ./realloc_demo" stdout="Grew to capacity 8" -- Double capacity with realloc when length reaches capacity
contains realloc_demo.c "realloc(arr,"
contains realloc_demo.c "capacity *= 2"
contains realloc_demo.c "int *tmp"
```

## Step 6 — free: Always Free What You malloc

**This step:** Understand memory leaks and the discipline of matching every `malloc` with a `free`.

A **memory leak** occurs when you allocate memory and lose the pointer without freeing it. The allocation lives for the process lifetime, never reused. In a long-running server this causes ever-growing memory usage.

Python's reference counter calls `free` automatically when an object's reference count reaches zero. In C, you do it yourself. The rules:

1. Every `malloc`/`calloc`/`realloc` must have exactly one matching `free`
2. Never `free` the same pointer twice (double-free is undefined behavior — crash or security hole)
3. Never use a pointer after `free`-ing it (use-after-free — corruption or crash)
4. After freeing, set the pointer to `NULL` to make use-after-free detectable

```c file=free_discipline.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Returns heap-allocated string — CALLER must free! */
char *make_greeting(const char *name) {
    char  prefix[] = "Hello, ";
    int   total    = strlen(prefix) + strlen(name) + 2; /* +2: '!' and '\0' */
    char *result   = (char *)malloc(total);
    if (!result) return NULL;

    strcpy(result, prefix);
    strcat(result, name);
    strcat(result, "!");
    return result;
}

int main(void) {
    char *g1 = make_greeting("Alice");
    char *g2 = make_greeting("Bob");

    if (g1) printf("%s\n", g1);
    if (g2) printf("%s\n", g2);

    /* free both allocations */
    free(g1);
    g1 = NULL;   /* prevent use-after-free */
    free(g2);
    g2 = NULL;

    /* This would be a bug: */
    /* free(g1);  // double-free — undefined behavior */
    /* printf("%s\n", g1); // use-after-free — undefined behavior */

    printf("Memory cleaned up.\n");
    return 0;
}
```

```check
file free_discipline.c
run "gcc -o free_discipline free_discipline.c && ./free_discipline" stdout="Hello, Alice!" -- Build greeting strings on the heap and free them
contains free_discipline.c "free(g1)"
contains free_discipline.c "free(g2)"
contains free_discipline.c "g1 = NULL"
contains free_discipline.c "char *make_greeting"
```

## Step 7 — Challenge: Implement a Dynamic Array in C

**This step:** Build a simple dynamic array (like Python's list) using malloc and realloc.

Create a `DynArray` that supports:
- `dynarray_init(DynArray *da)` — initialize with capacity 4
- `dynarray_push(DynArray *da, int value)` — append, growing by 2x when full
- `dynarray_get(DynArray *da, int idx)` — return element at index
- `dynarray_free(DynArray *da)` — free the internal buffer

Use a struct (you'll learn more about structs in Lesson 6):

```c
typedef struct {
    int *data;
    int  length;
    int  capacity;
} DynArray;
```

```hints
nudge: `push` is the only function that has to make the array bigger. What should happen when `length == capacity`?
concept: When the array is full, call `realloc` with `capacity * 2`. Always check realloc's return value before updating `da->data`: if it returns NULL, the old block is still allocated and still yours.
shape: In `get`, optionally check `idx >= 0 && idx < da->length` before returning. In `free`, call `free(da->data)` and reset length and capacity to 0.
```

```c file=dynarray.c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;
    int  length;
    int  capacity;
} DynArray;

void dynarray_init(DynArray *da) {
    da->capacity = 4;
    da->length   = 0;
    da->data     = (int *)malloc(da->capacity * sizeof(int));
    if (!da->data) { fprintf(stderr, "init failed\n"); exit(1); }
}

void dynarray_push(DynArray *da, int value) {
    if (da->length == da->capacity) {
        da->capacity *= 2;
        int *tmp = (int *)realloc(da->data, da->capacity * sizeof(int));
        if (!tmp) { free(da->data); exit(1); }
        da->data = tmp;
    }
    da->data[da->length++] = value;
}

int dynarray_get(DynArray *da, int idx) {
    if (idx < 0 || idx >= da->length) {
        fprintf(stderr, "Index %d out of bounds\n", idx);
        exit(1);
    }
    return da->data[idx];
}

void dynarray_free(DynArray *da) {
    free(da->data);
    da->data     = NULL;
    da->length   = 0;
    da->capacity = 0;
}

int main(void) {
    DynArray da;
    dynarray_init(&da);

    for (int i = 1; i <= 10; i++) {
        dynarray_push(&da, i * i);
        printf("Pushed %2d  (len=%d, cap=%d)\n", i*i, da.length, da.capacity);
    }

    printf("\nAll elements:\n");
    for (int i = 0; i < da.length; i++) {
        printf("  da[%d] = %d\n", i, dynarray_get(&da, i));
    }

    dynarray_free(&da);
    printf("Done.\n");
    return 0;
}
```

```check
file dynarray.c
run "gcc -o dynarray dynarray.c && ./dynarray" stdout="da[9] = 100" -- The last element should be 10^2 = 100
contains dynarray.c "typedef struct"
contains dynarray.c "dynarray_push"
contains dynarray.c "realloc(da->data"
contains dynarray.c "dynarray_free"
```
