---
title: 2 — Functions, Headers and Compilation Units
track: C for Python Programmers
trackOrder: 12
runtime: cpp
console: true
---

In Python, you define a function with `def` and import other modules with `import`. In C, these two concepts — defining reusable code and sharing it across files — involve a deeper mechanism: **declarations**, **definitions**, and the **C preprocessor**. Understanding this model is crucial because it's exactly how CPython itself is organized: hundreds of `.c` files, each compiled separately, linked together into one interpreter.

This lesson maps Python's import model to C's compilation model, and shows you how to split code across multiple files the same way CPython does.

## Step 1 — A C Function

**This step:** Write a simple C function and compare its structure to Python's `def` syntax.

Python function:
```python
def add(a, b):
    return a + b

result = add(3, 4)
print(result)
```

C function:
```c
int add(int a, int b) {
    return a + b;
}

int main(void) {
    int result = add(3, 4);
    printf("%d\n", result);
    return 0;
}
```

Key differences:

| Python `def`           | C function              |
|------------------------|-------------------------|
| No return type declared | Return type required (`int`, `double`, `void`, ...) |
| Parameter types inferred | Parameter types required |
| `return` optional (returns `None`) | `return` required for non-`void` |
| Can return anything | Can only return the declared type |

`void` is C's way of saying "this function returns nothing" — like a Python function that has no `return` statement (which implicitly returns `None`).

```c file=functions_basic.c
#include <stdio.h>

/* returns the larger of two ints — compare to Python's max(a, b) */
int max_of_two(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

/* void: no return value — like a Python function that only prints */
void greet(char *name) {
    printf("Hello, %s!\n", name);
}

int main(void) {
    int bigger = max_of_two(10, 7);
    printf("Bigger: %d\n", bigger);
    greet("Alice");
    return 0;
}
```

```check
file functions_basic.c
run "gcc -o functions_basic functions_basic.c && ./functions_basic" stdout="Bigger: 10" -- max_of_two(10, 7) should return 10
contains functions_basic.c "void greet"
```

## Step 2 — The Function Prototype: Why C Needs Declarations

**This step:** Understand why C requires function declarations (prototypes) before use, unlike Python.

In Python, the interpreter reads the whole file before executing, so you can call a function defined later in the file. In C, the **compiler processes the file top to bottom, one pass**. If it sees a function call before it has seen the function's definition, it doesn't know how many arguments it takes or what type it returns.

Try putting `main` before `add` without a prototype:

```c
/* This compiles with a warning/error in modern C — compiler doesn't know add yet */
int main(void) {
    int r = add(3, 4);  /* ERROR: add not declared yet */
    return 0;
}

int add(int a, int b) { return a + b; }
```

The solution is a **function prototype** (declaration) at the top:

```c
/* Prototype — tells the compiler: add exists, takes two ints, returns int */
int add(int a, int b);

int main(void) {
    int r = add(3, 4);   /* now the compiler is happy */
    return 0;
}

int add(int a, int b) {  /* definition — the actual implementation */
    return a + b;
}
```

A prototype is just the function signature followed by a semicolon — no body. Parameter names are optional in prototypes (the types are what matter):

```c
int add(int, int);    /* valid prototype — names omitted */
```

```c file=prototypes.c
#include <stdio.h>

/* prototypes — declarations before main */
double circle_area(double radius);
void   print_area(double radius);

int main(void) {
    print_area(5.0);
    print_area(2.5);
    return 0;
}

/* definitions — implementations after main */
double circle_area(double radius) {
    return 3.14159265 * radius * radius;
}

void print_area(double radius) {
    printf("Area of circle r=%.1f: %.4f\n", radius, circle_area(radius));
}
```

```check
file prototypes.c
run "gcc -o prototypes prototypes.c && ./prototypes" stdout="Area of circle r=5.0" -- Declare a prototype for circle_area before main
contains prototypes.c "double circle_area(double"
```

## Step 3 — Creating a Header File

**This step:** Create a `.h` header file that declares functions, enabling other `.c` files to use them.

In Python, a module is just a `.py` file. You `import` it and all its names become available. In C, sharing code between files requires two things:

1. A **header file** (`.h`) — contains declarations (prototypes, type definitions, constants)
2. A **source file** (`.c`) — contains the actual implementations (definitions)

The header is like a "table of contents" that tells any file importing it what functions exist and what their signatures are.

Create a math utility header:

```c file=mathutils.h
#ifndef MATHUTILS_H   /* include guard — prevents double-inclusion */
#define MATHUTILS_H

/* function declarations — only signatures, no bodies */
int    clamp(int value, int min, int max);
double lerp(double a, double b, double t);
int    is_prime(int n);

#endif /* MATHUTILS_H */
```

The `#ifndef / #define / #endif` block is called an **include guard**. If a file includes this header twice (directly or through other headers), the second inclusion is skipped. Python handles this automatically with its module system; C doesn't.

```check
file mathutils.h
contains mathutils.h "#ifndef MATHUTILS_H"
contains mathutils.h "#define MATHUTILS_H"
```

## Step 3b — The Implementation File

**This step:** Write `mathutils.c`, which gives the bodies for the functions `mathutils.h` declared.

Now create the implementation file:

```c file=mathutils.c
#include "mathutils.h"   /* use quotes for local headers */

int clamp(int value, int min, int max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

double lerp(double a, double b, double t) {
    return a + t * (b - a);
}

int is_prime(int n) {
    if (n < 2) return 0;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return 0;
    }
    return 1;
}
```

```check
file mathutils.c
contains mathutils.c "#include \"mathutils.h\""
contains mathutils.c "int clamp"
```

## Step 4 — #include and the Preprocessor

**This step:** Understand how `#include` works and compare it to Python's `import`.

Python's `import` is a runtime operation — Python finds the module file, executes it, and binds names. C's `#include` is a **compile-time text substitution** performed by the **preprocessor** before the compiler even sees the code.

When you write `#include "mathutils.h"`, the preprocessor literally replaces that line with the entire contents of `mathutils.h`. You can see this yourself:

```text
gcc -E mathutils.c   # -E: stop after preprocessing, show output
```

This is very different from Python's import:

| Python `import`                    | C `#include`                         |
|------------------------------------|--------------------------------------|
| Runtime operation                  | Compile-time text substitution       |
| Module executes once (cached)      | Header text copied into each file    |
| Names bound to module object       | Declarations merged into translation unit |
| Circular imports possible (carefully) | Include guards prevent double inclusion |

The preprocessor also handles:
- `#define PI 3.14159` — constants (like Python's `PI = 3.14159` at module level)
- `#ifdef / #endif` — conditional compilation (no Python equivalent)
- `#pragma once` — modern alternative to include guards (not standard but widely supported)

```c file=include_demo.c
#include <stdio.h>      /* angle brackets: system headers */
#include "mathutils.h"  /* quotes: local headers */

#define MAX_SIZE 100    /* preprocessor constant — replaced before compilation */
#define SQUARE(x) ((x) * (x))  /* macro — use with caution! */

int main(void) {
    printf("MAX_SIZE = %d\n", MAX_SIZE);
    printf("SQUARE(5) = %d\n", SQUARE(5));
    printf("clamp(150, 0, 100) = %d\n", clamp(150, 0, 100));
    printf("is_prime(17) = %d\n", is_prime(17));
    return 0;
}
```

```check
file include_demo.c
contains include_demo.c "#include \"mathutils.h\""
contains include_demo.c "#define MAX_SIZE"
```

## Step 5 — Multiple .c Files, One Program

**This step:** Compile a program spread across multiple `.c` files and see how the linker combines them.

In Python, splitting code into files is done automatically through the module system. In C, you compile each `.c` file separately into an **object file** (`.o`), then **link** the object files together into one executable.

```text
gcc -c mathutils.c -o mathutils.o     # compile only, no link
gcc -c include_demo.c -o include_demo.o
gcc mathutils.o include_demo.o -o demo  # link together
```

Or shorthand (gcc does it all):
```text
gcc mathutils.c include_demo.c -o demo
```

The compilation model:

```text
mathutils.c  --[compile]--> mathutils.o  \
                                          +--[link]--> demo
include_demo.c --[compile]--> include_demo.o /
```

Each `.c` file is a **translation unit** — it's compiled independently. The linker resolves cross-file references. This is why prototypes matter: `include_demo.c` needs to know `clamp`'s signature at compile time, even though its definition is in `mathutils.c`.

CPython itself is built this way: `Objects/listobject.c`, `Objects/dictobject.c`, `Python/ceval.c` — all compiled separately, linked together.

```c file=main_multifile.c
#include <stdio.h>
#include "mathutils.h"

int main(void) {
    printf("lerp(0, 100, 0.25) = %.1f\n", lerp(0.0, 100.0, 0.25));
    printf("is_prime(13) = %d\n",          is_prime(13));
    printf("is_prime(15) = %d\n",          is_prime(15));
    printf("clamp(-5, 0, 10) = %d\n",      clamp(-5, 0, 10));
    return 0;
}
```

```check
file main_multifile.c
run "gcc mathutils.c main_multifile.c -o multifile_demo && ./multifile_demo" stdout="lerp(0, 100, 0.25) = 25.0" -- Compile both .c files together with gcc
contains main_multifile.c "#include \"mathutils.h\""
```

## Step 6 — Challenge: Write a Math Utility Header

**This step:** Extend the `mathutils` library with two new functions declared in the header and implemented in the source file.

Add the following two functions to the math utility library:

1. `int factorial(int n)` — returns `n!` (factorial). Return 1 for `n <= 1`.
2. `double power(double base, int exp)` — returns `base` raised to `exp` (integer exponent). Handle negative exponents by returning `1.0 / power(base, -exp)`.

You must:
- Add the prototypes to `mathutils.h`
- Add the implementations to `mathutils.c`
- Write a `challenge.c` that tests both functions

```hints
nudge: Write `factorial` first: it needs only a loop and a running product.
concept: For `factorial`, start `result` at 1 and do `result *= i` for `i` from 2 to `n`. For `power`, a loop multiplying `base` into the result `exp` times works for positive exponents.
shape: For negative exponents, turn the problem into a positive one: `if (exp < 0) return 1.0 / power(base, -exp);`. Compile both files together: `gcc mathutils.c challenge.c -o challenge`.
```

```c file=challenge.c
#include <stdio.h>
#include "mathutils.h"

int main(void) {
    printf("factorial(5)     = %d\n",   factorial(5));
    printf("factorial(10)    = %d\n",   factorial(10));
    printf("power(2.0, 8)    = %.1f\n", power(2.0, 8));
    printf("power(3.0, -2)   = %.4f\n", power(3.0, -2));
    return 0;
}
```

```check
file challenge.c
file mathutils.h
file mathutils.c
contains mathutils.h "factorial"
contains mathutils.h "power"
contains mathutils.c "int factorial"
contains mathutils.c "double power"
run "gcc mathutils.c challenge.c -o challenge && ./challenge" stdout="factorial(5)     = 120" -- factorial(5) should be 120
```
