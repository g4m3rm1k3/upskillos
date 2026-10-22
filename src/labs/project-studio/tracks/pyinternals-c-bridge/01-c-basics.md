---
title: 1 — C from Python: Variables, Types and Control Flow
track: C for Python Programmers
trackOrder: 11
runtime: cpp
console: true
---

You already know how to program — you know loops, conditions, functions, and data structures. What C will teach you is what Python has been hiding: memory addresses, explicit types, and the raw machine beneath your code. Every Python object you've ever created is backed by a C struct. Every `for` loop you've written compiles (in CPython) to C loops like the ones you'll write here.

This lesson rewires your Python instincts for C. Expect friction at first — that friction is the gap between "managed runtime" and "bare metal" closing.

## Step 1 — Your First C Program

**This step:** Write and compile a C program that prints "Hello, world!" and compare it line-by-line to its Python equivalent.

In Python, printing is one line:

```python
print("Hello, world!")
```

In C, the same output requires a complete program structure:

```c
#include <stdio.h>

int main(void) {
    printf("Hello, world!\n");
    return 0;
}
```

Let's unpack each line:

- `#include <stdio.h>` — imports the standard I/O library (like `import sys` in Python). Without it, `printf` doesn't exist.
- `int main(void)` — every C program starts here. `int` is the return type (an integer). `main` is the required entry-point function name.
- `printf("Hello, world!\n")` — prints to stdout. The `\n` is a newline character (Python's `print` adds this automatically; C does not).
- `return 0;` — tells the OS the program succeeded. Non-zero means error.
- Every statement ends with a **semicolon** `;` — there are no colons or indentation rules enforcing blocks. Braces `{}` define scope.

Create this file:

```c file=hello.c
#include <stdio.h>

int main(void) {
    printf("Hello, world!\n");
    return 0;
}
```

```check
file hello.c
run "gcc -o hello hello.c && ./hello" stdout="Hello, world!" -- Make sure you have a newline at the end of your printf string with \n
```

## Step 2 — Typed Variables: int, double, char

**This step:** Declare variables with explicit types and understand why C requires this while Python does not.

Python uses dynamic typing — a variable is just a name that points to an object, and the object knows its own type:

```python
x = 42          # Python figures out this is an int
y = 3.14        # Python figures out this is a float
letter = 'A'    # Python figures out this is a str
```

In C, **every variable has a fixed type declared at creation**. The compiler needs this information to know how many bytes to allocate and how to interpret the bits:

```c
int    x      = 42;      // 4 bytes, whole numbers
double y      = 3.14;    // 8 bytes, floating point
char   letter = 'A';     // 1 byte, a single character
```

Common C types and their Python rough equivalents:

| C type     | Size     | Python equivalent  |
|------------|----------|--------------------|
| `int`      | 4 bytes  | `int` (small)      |
| `long`     | 8 bytes  | `int` (larger)     |
| `double`   | 8 bytes  | `float`            |
| `float`    | 4 bytes  | (less precise float)|
| `char`     | 1 byte   | single-char `str`  |
| `_Bool`    | 1 byte   | `bool`             |

Notice: in Python, `int` can be arbitrarily large. In C, `int` overflows silently at 2,147,483,647. This is a critical difference.

Also: in C, you can declare a variable without initializing it. **Always initialize your variables** — uninitialized C variables contain whatever bytes were in memory before, a common source of bugs.

```c file=variables.c
#include <stdio.h>

int main(void) {
    int    age    = 30;
    double height = 5.11;
    char   grade  = 'A';
    int    score  = 0;   /* always initialize */

    printf("Age: %d\n", age);
    printf("Height: %.2f\n", height);
    printf("Grade: %c\n", grade);
    printf("Score: %d\n", score);
    return 0;
}
```

```check
file variables.c
run "gcc -o variables variables.c && ./variables" stdout="Age: 30" -- Declare int age = 30 and print it
contains variables.c "double"
contains variables.c "char"
```

## Step 3 — printf and Format Specifiers

**This step:** Use `printf` with format specifiers to print different types, understanding why C needs them while Python's f-strings do not.

Python's f-strings are magical — they inspect the object at runtime and call its `__repr__` or `__str__` method:

```python
x = 42
y = 3.14
print(f"x={x}, y={y}")   # Python figures out the types automatically
```

In C, `printf` is a function that reads a format string at runtime. Because C has no runtime type information, **you must tell printf what type each argument is**:

```c
int    x = 42;
double y = 3.14;
printf("x=%d, y=%f\n", x, y);
```

The format specifiers:

| Specifier | Type     | Example output |
|-----------|----------|----------------|
| `%d`      | `int`    | `42`           |
| `%ld`     | `long`   | `1234567890`   |
| `%f`      | `double` | `3.140000`     |
| `%.2f`    | `double` | `3.14`         |
| `%c`      | `char`   | `A`            |
| `%s`      | `char *` | `hello`        |
| `%p`      | pointer  | `0x7fff...`    |

Using the wrong specifier for a type causes **undefined behavior** — the program may crash, print garbage, or appear to work while corrupting memory. Python never has this problem because it checks types at runtime.

```c file=printf_demo.c
#include <stdio.h>

int main(void) {
    int    count  = 7;
    double ratio  = 0.333333;
    char   symbol = '#';
    char   name[] = "Alice";

    printf("Count:  %d\n",    count);
    printf("Ratio:  %.4f\n",  ratio);
    printf("Symbol: %c\n",    symbol);
    printf("Name:   %s\n",    name);
    printf("Width:  %10d|\n", count);   /* right-aligned in 10 chars */
    return 0;
}
```

```check
file printf_demo.c
run "gcc -o printf_demo printf_demo.c && ./printf_demo" stdout="Count:  7" -- Use %d for the integer count variable
contains printf_demo.c "%.4f"
```

## Step 4 — scanf: Reading User Input

**This step:** Read input from the user with `scanf` and compare it to Python's `input()`.

Python's `input()` always returns a string, and you convert it:

```python
age = int(input("Enter your age: "))
name = input("Enter your name: ")
```

C's `scanf` reads and converts in one step, but it needs a **pointer** to where to store the value (more on pointers in Lesson 3 — for now, just remember the `&`):

```c
int age;
printf("Enter your age: ");
scanf("%d", &age);   /* &age means "address of age" — store the value HERE */
```

The `&` operator gives `scanf` the memory address of the variable so it can write the result directly into it. Without `&`, you'd be passing the value of an uninitialized variable as an address — a crash waiting to happen.

For strings, no `&` is needed because an array is already a pointer (you'll learn why in Lesson 4):

```c
char name[50];
printf("Enter your name: ");
scanf("%49s", name);   /* %49s: read up to 49 chars to prevent overflow */
```

```c file=scanf_demo.c
#include <stdio.h>

int main(void) {
    int  age;
    char name[50];

    printf("Enter your name: ");
    scanf("%49s", name);

    printf("Enter your age: ");
    scanf("%d", &age);

    printf("Hello, %s! You are %d years old.\n", name, age);
    return 0;
}
```

```check
file scanf_demo.c
contains scanf_demo.c "scanf"
contains scanf_demo.c "&age"
contains scanf_demo.c "%49s"
```

## Step 5 — if/else in C

**This step:** Write conditional logic in C and map it to Python's familiar syntax.

Python:
```python
x = 10
if x > 5:
    print("big")
elif x == 5:
    print("medium")
else:
    print("small")
```

C uses the same logic but with parentheses around conditions and braces instead of indentation:

```c
int x = 10;
if (x > 5) {
    printf("big\n");
} else if (x == 5) {
    printf("medium\n");
} else {
    printf("small\n");
}
```

Key differences from Python:
- Conditions must be in **parentheses** `(x > 5)` — not optional
- Blocks use **braces** `{}` — not indentation (though you should still indent for readability)
- `elif` becomes `else if` (two words)
- **No `True`/`False` keywords by default** — in C, `0` is false and any non-zero value is true. Include `<stdbool.h>` for `true`/`false`.
- **No `not`, `and`, `or`** — use `!`, `&&`, `||` instead

```c file=conditionals.c
#include <stdio.h>
#include <stdbool.h>

int main(void) {
    int  temperature = 22;
    bool is_raining  = false;

    if (temperature > 30) {
        printf("It's hot!\n");
    } else if (temperature > 20 && !is_raining) {
        printf("Nice day!\n");
    } else if (is_raining) {
        printf("Bring an umbrella.\n");
    } else {
        printf("Cool day.\n");
    }
    return 0;
}
```

```check
file conditionals.c
run "gcc -o conditionals conditionals.c && ./conditionals" stdout="Nice day!" -- Check your condition: temperature > 20 && !is_raining should be true
contains conditionals.c "&&"
contains conditionals.c "stdbool.h"
```

## Step 6 — for and while Loops

**This step:** Write C loops and understand how they compare to Python's iteration model.

Python's `for` loop iterates over any iterable:

```python
for i in range(5):
    print(i)
```

C's `for` loop is a three-part mechanical construct:

```c
for (int i = 0; i < 5; i++) {
    printf("%d\n", i);
}
```

The three parts: `(initializer; condition; increment)`. All three are optional but the semicolons are not. This is more verbose but also more flexible — you can control the counter precisely.

`while` is nearly identical to Python:

```python
# Python
n = 1
while n < 100:
    n *= 2
```

```c
// C
int n = 1;
while (n < 100) {
    n *= 2;
}
```

C also has `do { } while (condition)` — like `while` but always runs the body at least once. Python has no direct equivalent.

Important: C has no `for x in list` style. You index arrays manually. **This is why C is faster** — there's no iterator protocol overhead, just pointer arithmetic.

```c file=loops.c
#include <stdio.h>

int main(void) {
    /* for loop: sum 1 to 10 */
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum += i;
    }
    printf("Sum 1-10: %d\n", sum);

    /* while loop: count down */
    int n = 5;
    while (n > 0) {
        printf("Countdown: %d\n", n);
        n--;
    }

    /* do-while: always runs at least once */
    int x = 0;
    do {
        printf("do-while ran with x=%d\n", x);
        x++;
    } while (x < 1);

    return 0;
}
```

```check
file loops.c
run "gcc -o loops loops.c && ./loops" stdout="Sum 1-10: 55" -- Sum integers 1 through 10 with a for loop
contains loops.c "while"
contains loops.c "do {"
```

## Step 7 — Challenge: FizzBuzz in C

**This step:** Write a complete FizzBuzz program in C using everything from this lesson.

FizzBuzz rules: for numbers 1 to 30, print "Fizz" if divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if divisible by both, otherwise print the number.

In Python:
```python
for i in range(1, 31):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```

Translate this to C. Use a `for` loop, `if/else if/else`, `printf`, and the modulo operator `%`.

```hints
nudge: Which branch would 15 land in if you tested divisibility by 3 first? Check 15 before 3 or 5, just like in Python.
concept: The modulo operator in C is also `%`, same as Python: `i % 3 == 0` is true when `i` divides evenly by 3.
shape: Inside the loop, test `i % 15 == 0` first and print with `printf("FizzBuzz
")`, then `else if` for 3 and for 5, and in the final `else` print the number with `printf("%d
", i)`.
```

```c file=fizzbuzz.c
#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 30; i++) {
        if (i % 15 == 0) {
            printf("FizzBuzz\n");
        } else if (i % 3 == 0) {
            printf("Fizz\n");
        } else if (i % 5 == 0) {
            printf("Buzz\n");
        } else {
            printf("%d\n", i);
        }
    }
    return 0;
}
```

```check
file fizzbuzz.c
run "gcc -o fizzbuzz fizzbuzz.c && ./fizzbuzz" stdout="FizzBuzz" -- Make sure your output contains FizzBuzz (for multiples of 15)
contains fizzbuzz.c "% 15"
contains fizzbuzz.c "% 3"
contains fizzbuzz.c "% 5"
matches fizzbuzz.c "for\s*\(" label="for loop"
```
