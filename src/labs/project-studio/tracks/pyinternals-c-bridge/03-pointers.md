---
title: 3 — Pointers: Addresses, Not Values
track: C for Python Programmers
trackOrder: 13
runtime: cpp
console: true
---

Here is the truth Python has been hiding from you: **every variable in Python is already a pointer**. When you write `x = [1, 2, 3]`, Python allocates a list object on the heap and stores its **memory address** in `x`. When you write `y = x`, you copy the address — both `x` and `y` point to the same list. You've been using pointers all along; Python just never showed you the addresses.

C does show you. In C, you explicitly work with memory addresses, which gives you power (and responsibility) that Python deliberately hides. This is the lesson that separates "can write C" from "understands what C actually is."

## Step 1 — The Address-of Operator: &x

**This step:** Use the `&` operator to see a variable's actual memory address.

Every variable you declare occupies memory. That memory has an **address** — a number representing its location in RAM. In Python, you can see this with `id()`:

```python
x = 42
print(id(x))   # something like 140234567890, Python's internal address
```

In C, the `&` operator gives you the address directly:

```c
int x = 42;
printf("Value:   %d\n",  x);   /* the value stored */
printf("Address: %p\n", &x);   /* the address where x lives */
```

The `%p` format specifier prints an address in hexadecimal, like `0x7ffd5a3c`. This address is the variable's actual location in the process's memory (the stack, in this case).

Key insight: when you pass a variable to a Python function and the function mutates a list, Python is passing the address of the list object. C makes this address visible and explicit.

```c file=address_of.c
#include <stdio.h>

int main(void) {
    int    a = 10;
    int    b = 20;
    double d = 3.14;
    char   c = 'Z';

    printf("a = %d  at address %p\n",  a,  (void *)&a);
    printf("b = %d  at address %p\n",  b,  (void *)&b);
    printf("d = %.2f at address %p\n", d,  (void *)&d);
    printf("c = %c  at address %p\n",  c,  (void *)&c);

    /* Notice: a and b are usually 4 bytes apart on the stack */
    printf("\nDifference between &b and &a: %td bytes\n",
           (char *)&a - (char *)&b);
    return 0;
}
```

```check
file address_of.c
run "gcc -o address_of address_of.c && ./address_of" stdout="at address 0x" -- Use %p to print addresses with &
contains address_of.c "&a"
contains address_of.c "&b"
```

## Step 2 — Declaring a Pointer: int *p

**This step:** Declare pointer variables that store memory addresses instead of values.

A **pointer** is a variable whose value is an address. Where `int x` stores an integer, `int *p` stores the address of an integer:

```c
int  x = 42;    /* x stores the integer 42 */
int *p = &x;    /* p stores the address of x */
```

Read `int *p` as: "`p` is a pointer to an `int`." The `*` is part of the type — it doesn't mean "dereference" here (that comes next).

```text
Memory layout:
  x: [ 42 ]  at 0x1000
  p: [0x1000] at 0x1008
```

The type of `p` (`int *`) tells the compiler:
1. `p` holds an address
2. The thing at that address is an `int`
3. How to do pointer arithmetic (add 4 bytes per step for `int *`)

Pointer size: on a 64-bit system, all pointers are 8 bytes regardless of what they point to (an address is an address). This is why Python objects all have the same overhead for their internal pointer fields.

```c file=pointer_declare.c
#include <stdio.h>

int main(void) {
    int    value   = 100;
    int   *p_int   = &value;

    double pi      = 3.14159;
    double *p_dbl  = &pi;

    char   letter  = 'K';
    char  *p_char  = &letter;

    printf("value=%d, pointer holds address %p\n", value, (void *)p_int);
    printf("pi=%.5f, pointer holds address %p\n",  pi,    (void *)p_dbl);
    printf("letter=%c, pointer holds address %p\n", letter, (void *)p_char);

    printf("\nSize of int:    %zu bytes\n", sizeof(int));
    printf("Size of int *:  %zu bytes\n",  sizeof(int *));
    printf("Size of double*:%zu bytes\n",  sizeof(double *));
    /* All pointer sizes are equal — they all hold addresses */
    return 0;
}
```

```check
file pointer_declare.c
run "gcc -o pointer_declare pointer_declare.c && ./pointer_declare" stdout="Size of int *:" -- Print the size of a pointer with sizeof
contains pointer_declare.c "int   *p_int"
contains pointer_declare.c "double *p_dbl"
```

## Step 3 — Dereferencing: *p Reads the Value

**This step:** Use the dereference operator `*` to read and write the value at the address a pointer holds.

Once you have a pointer, you can **dereference** it — follow the address to the actual value — using `*`:

```c
int  x = 42;
int *p = &x;

printf("%d\n", *p);   /* dereference: reads 42 from the address in p */
*p = 99;              /* dereference + assign: writes 99 to x's memory location */
printf("%d\n", x);    /* prints 99 — x was changed through p! */
```

The `*` operator now means something different from `int *p` in the declaration:
- In a **declaration** (`int *p`): "p is a pointer to int"
- On an **expression** (`*p`): "the value at the address stored in p"

This is exactly what Python does internally when it accesses an object: it follows the address stored in the variable slot to the actual object data. You're now seeing that mechanism directly.

```c file=deref.c
#include <stdio.h>

int main(void) {
    int  x = 10;
    int *p = &x;

    printf("x = %d\n",  x);      /* direct access */
    printf("*p = %d\n", *p);     /* through pointer — same value */
    printf("Are they equal? %d\n", x == *p);

    /* modify x through the pointer */
    *p = 99;
    printf("After *p = 99:\n");
    printf("x = %d\n",  x);      /* x changed! */
    printf("*p = %d\n", *p);

    /* double pointer: pointer to a pointer */
    int **pp = &p;
    printf("\n**pp = %d\n", **pp);  /* follow two indirections */
    return 0;
}
```

```check
file deref.c
run "gcc -o deref deref.c && ./deref" stdout="After *p = 99:" -- Dereference p and assign 99 to change x
contains deref.c "*p = 99"
contains deref.c "int **pp"
```

## Step 4 — Why Pointers? Passing by Reference

**This step:** Use pointers to modify variables inside a function, comparing this to Python's mutable objects.

Python has a subtlety: immutable objects (int, str, tuple) can't be modified through a reference, but mutable objects (list, dict) can:

```python
def try_modify(n, lst):
    n = 999        # doesn't affect caller's n — new int object
    lst.append(4)  # DOES affect caller's lst — same list object

x = 42
my_list = [1, 2, 3]
try_modify(x, my_list)
print(x)        # 42 — unchanged
print(my_list)  # [1, 2, 3, 4] — changed
```

In C, **everything is passed by value** — a copy of the argument is made. To modify the caller's variable, you pass a pointer:

```c
void try_modify(int n, int *p) {
    n = 999;   /* modifies local copy only */
    *p = 999;  /* modifies caller's variable through pointer */
}

int x = 42;
int y = 42;
try_modify(x, &y);
/* x unchanged, y is now 999 */
```

This is the mechanism Python uses for mutable objects: internally, lists are passed as `PyObject *` (a pointer), so functions can modify the list's contents.

```c file=pass_by_ref.c
#include <stdio.h>

/* pass by value — can't change caller's variable */
void double_value(int n) {
    n *= 2;   /* only changes local copy */
}

/* pass by pointer — CAN change caller's variable */
void double_via_pointer(int *p) {
    *p *= 2;  /* changes the variable at address p */
}

/* increment both a and b */
void increment_both(int *a, int *b) {
    (*a)++;
    (*b)++;
}

int main(void) {
    int x = 5;
    double_value(x);
    printf("After double_value: x = %d\n", x);  /* still 5 */

    double_via_pointer(&x);
    printf("After double_via_pointer: x = %d\n", x);  /* now 10 */

    int a = 3, b = 7;
    increment_both(&a, &b);
    printf("a = %d, b = %d\n", a, b);  /* 4, 8 */
    return 0;
}
```

```check
file pass_by_ref.c
run "gcc -o pass_by_ref pass_by_ref.c && ./pass_by_ref" stdout="After double_via_pointer: x = 10" -- Use *p *= 2 to double x through the pointer
contains pass_by_ref.c "int *p"
contains pass_by_ref.c "*p *= 2"
```

## Step 5 — Pointer Arithmetic and Arrays

**This step:** Perform arithmetic on pointers and understand how they step through memory.

Pointer arithmetic is not regular arithmetic — it's **scaled by the type size**. Adding 1 to an `int *` moves it forward 4 bytes (one `int`), not 1 byte:

```c
int arr[] = {10, 20, 30, 40, 50};
int *p = arr;   /* p points to arr[0] */

printf("%d\n", *p);       /* 10 */
printf("%d\n", *(p + 1)); /* 20 — moved 4 bytes forward */
printf("%d\n", *(p + 2)); /* 30 — moved 8 bytes forward */
```

This is how NumPy's indexing works under the hood — it uses strides (byte offsets) to navigate multi-dimensional arrays without copying data.

You can also subtract pointers to get the distance between them (in elements, not bytes):

```c
int *end = arr + 5;
printf("%td elements\n", end - arr);  /* 5 */
```

```c file=ptr_arithmetic.c
#include <stdio.h>

int main(void) {
    int  arr[] = {10, 20, 30, 40, 50};
    int *p     = arr;   /* points to first element */
    int  len   = 5;

    printf("Walking array with pointer arithmetic:\n");
    for (int i = 0; i < len; i++) {
        printf("  arr[%d] = %d  (via *(p+%d) = %d)\n",
               i, arr[i], i, *(p + i));
    }

    /* pointer as iterator */
    printf("\nSum using pointer iteration:\n");
    int sum = 0;
    for (int *q = arr; q < arr + len; q++) {
        sum += *q;
    }
    printf("  sum = %d\n", sum);

    /* pointer difference */
    int *first = &arr[0];
    int *last  = &arr[4];
    printf("\nDistance from first to last: %td elements\n", last - first);
    return 0;
}
```

```check
file ptr_arithmetic.c
run "gcc -o ptr_arithmetic ptr_arithmetic.c && ./ptr_arithmetic" stdout="sum = 150" -- Sum the array elements using pointer iteration
contains ptr_arithmetic.c "int *q = arr"
contains ptr_arithmetic.c "q < arr + len"
```

## Step 6 — NULL Pointers: C's None

**This step:** Use `NULL` to represent "no valid address," analogous to Python's `None`.

Python's `None` is a sentinel meaning "no value." C's `NULL` is a pointer value (usually `0` / `(void *)0`) meaning "points to nothing." Dereferencing `NULL` causes a **segmentation fault** — the OS kills your program for accessing invalid memory.

```c
int *p = NULL;   /* p points to nothing — like None */

if (p != NULL) {
    printf("%d\n", *p);  /* safe: only dereference if not NULL */
}
/* *p without the check = segfault = crash */
```

Always-check-for-NULL rules:
1. Any function that returns a pointer (`malloc`, `fopen`, etc.) can return `NULL` on failure — always check
2. Initialize pointers to `NULL` if they don't have a value yet
3. Set pointers to `NULL` after `free`-ing them (prevents use-after-free bugs)

```c file=null_ptr.c
#include <stdio.h>

/* function returns NULL on failure — compare to Python returning None */
int *find_in_array(int *arr, int len, int target) {
    for (int i = 0; i < len; i++) {
        if (arr[i] == target) {
            return &arr[i];   /* found: return address */
        }
    }
    return NULL;   /* not found: like Python's None */
}

int main(void) {
    int data[] = {5, 3, 8, 1, 9, 2};
    int len    = 6;

    int *result = find_in_array(data, len, 8);
    if (result != NULL) {
        printf("Found 8 at address %p, value = %d\n", (void *)result, *result);
    } else {
        printf("8 not found\n");
    }

    result = find_in_array(data, len, 99);
    if (result == NULL) {
        printf("99 not found (NULL returned)\n");
    }

    return 0;
}
```

```check
file null_ptr.c
run "gcc -o null_ptr null_ptr.c && ./null_ptr" stdout="Found 8" -- Return &arr[i] when found, NULL when not found
contains null_ptr.c "return NULL"
contains null_ptr.c "result != NULL"
```

## Step 7 — Challenge: Swap Two Ints Using Pointers

**This step:** Implement a `swap` function that exchanges two integers' values using pointers.

In Python, swapping is trivial:
```python
a, b = b, a
```

In C, a swap function must use pointers to modify the caller's variables. Without pointers, the function can only swap its local copies — the originals don't change.

Write a `swap(int *a, int *b)` function and a `main` that tests it. The function should exchange the values at the two addresses using a temporary variable.

```hints
nudge: As soon as you write `*a = *b`, the old value of `*a` is gone. Where can you keep it first?
concept: Keep it in a temporary variable that is local to `swap`. Don't use a global variable for it.
shape: Three lines: save `*a`, copy `*b` into `*a`, put the saved value into `*b`. Call it with the addresses of the two variables.
answer:
~~~c
int temp = *a;
*a = *b;
*b = temp;
~~~
Call it as `swap(&x, &y);`. Passing the addresses is what lets `swap` change the caller's `x` and `y` instead of copies of them.
```

```c file=swap.c
#include <stdio.h>

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main(void) {
    int x = 42;
    int y = 99;

    printf("Before: x=%d, y=%d\n", x, y);
    swap(&x, &y);
    printf("After:  x=%d, y=%d\n", x, y);

    /* test with more values */
    int m = 1, n = 2;
    swap(&m, &n);
    printf("Swapped: m=%d, n=%d\n", m, n);

    return 0;
}
```

```check
file swap.c
run "gcc -o swap swap.c && ./swap" stdout="After:  x=99, y=42" -- After swap, x should be 99 and y should be 42
contains swap.c "void swap(int *a, int *b)"
contains swap.c "int temp = *a"
contains swap.c "*a = *b"
contains swap.c "*b = temp"
```
