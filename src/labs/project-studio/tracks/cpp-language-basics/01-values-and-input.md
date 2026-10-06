---
title: 1 — Values, Types and a First Calculator
track: C++ Foundations — Thinking in Types
trackOrder: 5
runtime: cpp
reference: optional
console: true
---

This track teaches the core of the C++ language by building small, real tools: a calculator, a statistics program, a word counter, a grade book and an inventory. Each tool lives in its own folder inside this track's project folder, and each is built with the CMake you learned in *C++ from Zero*.

**Prerequisites:** You can run a Python script using variables, arithmetic and decisions. Complete the C++ tools chapter first: you must be able to compile a small program and run CMake. If those commands fail, return to that chapter before changing the calculator. This lesson teaches typed values and input; you will design an expression calculator independently in Step 6.

Choose a **new empty folder** for this track. You'll run every command from that folder. When a program reads from the keyboard, run it in the terminal and type: the **Run** button can't type for you.

This first lesson starts the calculator. Along the way you'll meet the idea that most separates C++ from Python: **every value has a type, fixed before the program runs.**

## Step 1 — The calculator's build file

**This step: create the supplied `calculator/CMakeLists.txt` and read it.**

Click **Create provided calculator/CMakeLists.txt** above. It's the build file you wrote in *C++ from Zero*, for a program called `calculator`:

```cmake
add_executable(calculator main.cpp)
```

- One **target**, `calculator`, built from one source file, `main.cpp`. You'll write that file in the next step.
- The rest sets the language version (C++20) and turns on warnings, as before.

```cmake file=calculator/CMakeLists.txt provided
cmake_minimum_required(VERSION 3.20)
project(calculator LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(calculator main.cpp)

if(MSVC)
    target_compile_options(calculator PRIVATE /W4)
else()
    target_compile_options(calculator PRIVATE -Wall -Wextra -Wpedantic)
endif()
```

```check
file calculator/CMakeLists.txt
```

## Step 2 — Variables have types

**This step: create `calculator/main.cpp`, store two numbers in variables, and print their sum.**

In Python a name can refer to anything: `x = 5`, then later `x = "five"`. In C++ every variable is declared with a **type**, and it keeps that type for its whole life. The compiler uses the type to decide how much memory the variable needs and which operations make sense.

```cpp
double a = 7.5;
```

- `double` is the type: a floating-point number, with about 15 significant digits.
- `a` is the variable's name.
- `= 7.5` **initialises** it: gives it its first value. Always initialise. An uninitialised `int x;` inside a function has no value you may safely read in this C++20 program; reading it causes undefined behavior. Initialising it prevents that bug.

| Type | Holds | Example |
|---|---|---|
| `int` | whole numbers, roughly ±2.1 billion | `42`, `-7` |
| `double` | floating-point numbers | `7.5`, `-0.001` |
| `bool` | `true` or `false` | `true` |
| `char` | one character | `'x'` (single quotes) |
| `std::string` | text, from `<string>` | `"hello"` (double quotes) |

Write `main.cpp` so it stores `7.5` and `2.5` in two `double` variables and prints:

```text
7.5 + 2.5 = 10
```

Print the **variables**, not a literal line of text: the next step feeds in different numbers.

```cpp
std::cout << a << " + " << b << " = " << a + b << '\n';
```

- Each `<<` sends one value to the output. Numbers are printed as numbers, and text between quotes is printed as it is.
- `a + b` is computed first, then printed. `'\n'` is a single newline character.

Then configure (once) and build, from the track folder:

```text
cmake -S calculator -B calculator/build -G "MinGW Makefiles"     (Windows)
cmake -S calculator -B calculator/build                          (macOS, Linux)
cmake --build calculator/build
./calculator/build/calculator
```

```cpp file=calculator/main.cpp
#include <iostream>

int main()
{
    double a = 7.5;
    double b = 2.5;
    std::cout << a << " + " << b << " = " << a + b << '\n';
    return 0;
}
```

```check
matches calculator/main.cpp "\bdouble\s+\w+\s*(=|\{)" label="main.cpp declares a double variable"
file calculator/build/CMakeCache.txt label="calculator/build has been configured" -- Run the configure command for your system, from the track folder.
run "cmake --build calculator/build" -- Read the first error. Every statement ends with ;
run "./calculator/build/calculator" stdout="7.5 + 2.5 = 10" -- Print a, then " + ", then b, then " = ", then a + b.
```

## Step 3 — Reading input

**This step: read the two numbers from the keyboard instead.**

`std::cout` is the output stream. `std::cin` is the **input** stream, and `>>` reads from it into a variable:

```cpp
double a = 0;
double b = 0;
std::cout << "Enter two numbers: ";
std::cin >> a >> b;
```

- `>>` skips spaces and newlines, then reads characters for as long as they fit the variable's type.
- **The variable's type decides how the input is read.** Reading into a `double` accepts `1.5`; reading into an `int` would stop at the `.`.
- The variables still start at `0`, so they have a known value even if reading fails.

Rebuild, run `./calculator/build/calculator` in the terminal, and type `3 4` then Enter:

```text
Enter two numbers: 3 4
3 + 4 = 7
```

The check types the input for you, more than once, with different numbers.

```cpp file=calculator/main.cpp
#include <iostream>

int main()
{
    double a = 0;
    double b = 0;
    std::cout << "Enter two numbers: ";
    std::cin >> a >> b;
    std::cout << a << " + " << b << " = " << a + b << '\n';
    return 0;
}
```

```check
contains calculator/main.cpp "std::cin" label="main.cpp reads from std::cin"
run "cmake --build calculator/build"
run "./calculator/build/calculator" stdin="3 4\n" stdout="3 + 4 = 7"
run "./calculator/build/calculator" stdin="1.5 -0.5\n" stdout="1.5 + -0.5 = 1" -- Use double, not int: the input has a decimal point.
```

## Step 4 — Predict: integer division

**This step: predict, then test. No changes to the calculator.**

Before you add the other operators, a question that catches every Python programmer once:

```cpp
int a = 7;
int b = 2;
std::cout << a / b;
```

**Predict:** does it print `3.5`, `3`, `4`, or refuse to compile? Decide, then test it: create a scratch file `scratch.cpp` with a `main` that does exactly this, and build it with `g++ -std=c++20 scratch.cpp -o scratch`.

### What happens

It prints `3`. When **both** operands are `int`, `/` is **integer division**: the fractional part is thrown away (rounded toward zero). For these positive operands, Python's `//` also gives `3`. For negative results the rules differ: C++ `-7 / 2` gives `-3` (toward zero), whereas Python `-7 // 2` gives `-4` (toward negative infinity). Predict both, then test them in your scratch file and Python terminal. The *types* of the operands decide which division happens, not the values.

To get `3.5`, at least one operand must be floating-point: `7.0 / 2`, or `static_cast<double>(a) / b`. `static_cast<T>(x)` is C++'s explicit, searchable way to convert a value to another type.

Your calculator uses `double`, so its `/` will be ordinary division.

## Step 5 — All four operations

**This step: print the sum, difference, product and quotient.**

For the input `3 4`, the program prints:

```text
Enter two numbers: 3 4
3 + 4 = 7
3 - 4 = -1
3 * 4 = 12
3 / 4 = 0.75
```

- `-` subtracts, `*` multiplies, `/` divides.
- Because `a` and `b` are `double`s, `3 / 4` is `0.75`, not `0`.

**Try it:** what does it print for `1 0`? Floating-point division by zero is defined to give `inf` (infinity), and `0 / 0` gives `nan` ("not a number"). Integer division by zero is undefined behaviour and usually crashes. The challenge fixes this properly.

```cpp file=calculator/main.cpp
#include <iostream>

int main()
{
    double a = 0;
    double b = 0;
    std::cout << "Enter two numbers: ";
    std::cin >> a >> b;
    std::cout << a << " + " << b << " = " << a + b << '\n';
    std::cout << a << " - " << b << " = " << a - b << '\n';
    std::cout << a << " * " << b << " = " << a * b << '\n';
    std::cout << a << " / " << b << " = " << a / b << '\n';
    return 0;
}
```

```check
run "cmake --build calculator/build"
run "./calculator/build/calculator" stdin="3 4\n" stdout="3 - 4 = -1"
run "./calculator/build/calculator" stdin="3 4\n" stdout="3 * 4 = 12"
run "./calculator/build/calculator" stdin="3 4\n" stdout="3 / 4 = 0.75" -- With double variables, / is ordinary division.
```

## Step 6 — Challenge: an expression calculator

**This step: design your own solution before opening the optional full reference. Replace the four fixed lines with a calculator that reads one expression, like `3 * 4`, and evaluates it.**

| Input | The output must include |
|---|---|
| `3 * 4` | `3 * 4 = 12` |
| `10 / 4` | `10 / 4 = 2.5` |
| `7 - 10` | `7 - 10 = -3` |
| `1 / 0` | `Error: division by zero` |
| `2 % 3` | `Unknown operator: %` |

You'll need two new tools.

A **`char`** holds a single character. `std::cin >> a >> op >> b;` reads `3 * 4` into three variables, skipping the spaces between them.

A way to choose. `if` / `else if` / `else`:

```cpp
if (op == '+') {
    result = a + b;
} else if (op == '-') {
    result = a - b;
} else {
    // none of the above
}
```

- `==` compares. A single `=` would *assign*: a classic bug, and `-Wall` warns about it.
- Characters are written in single quotes: `'+'`.

Or `switch`, which suits choosing between fixed values:

```cpp
switch (op) {
case '+':
    result = a + b;
    break;      // without break, execution "falls through" into the next case
default:
    // anything else
    break;
}
```

Check for division by zero **before** dividing. First write pseudocode: the steps in ordinary words, without C++ punctuation. Choose either an if chain or a switch, and explain why it suits four known operators. You do not need both.

Before running, predict the route through your branches for `1 / 0` and `2 % 3`. After running, compare the output with that route. If it differs, trace the first branch that changed your expectation.

```hints
nudge: Separate reading an expression, selecting the operation, and printing the result. Which of those stages is failing?
concept: Store the two operands as double and the operator as char. Comparison uses ==; an if chain or switch selects exactly one operation.
shape: Read a, op and b. Handle +, -, * and / separately. In the / branch reject b == 0 before dividing. Use a final branch for unknown operators; print a result only after a valid operation.
```

The automated checks build the program and look for output fragments for five expressions. They do not prove every operator works, that input is valid, or that you understand the branches. Add manual cases for addition, negative operands, zero divided by a nonzero number, and invalid text. Record the input, expected result and observed result. Invalid-input handling is an optional extension; the reference includes it, but it is not required by these checks.

After the required cases pass, independently add a message for invalid input in your own implementation. Hint: examine whether extraction into the three variables succeeded before using them. Keep this extension separate in your learning notes so you can distinguish required behavior from extra work.

```cpp file=calculator/main.cpp
#include <iostream>

int main()
{
    double a = 0;
    double b = 0;
    char op = ' ';
    if (!(std::cin >> a >> op >> b)) {
        std::cout << "Error: expected an expression like 3 * 4\n";
        return 1;
    }

    double result = 0;
    switch (op) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/':
        if (b == 0) {
            std::cout << "Error: division by zero\n";
            return 0;
        }
        result = a / b;
        break;
    default:
        std::cout << "Unknown operator: " << op << '\n';
        return 0;
    }
    std::cout << a << ' ' << op << ' ' << b << " = " << result << '\n';
    return 0;
}
```

```check
run "cmake --build calculator/build"
run "./calculator/build/calculator" stdin="3 * 4\n" stdout="3 * 4 = 12" -- Read a, then a char for the operator, then b.
run "./calculator/build/calculator" stdin="10 / 4\n" stdout="10 / 4 = 2.5"
run "./calculator/build/calculator" stdin="7 - 10\n" stdout="7 - 10 = -3"
run "./calculator/build/calculator" stdin="1 / 0\n" stdout="Error: division by zero" -- Check b before dividing.
run "./calculator/build/calculator" stdin="2 % 3\n" stdout="Unknown operator: %" -- The else (or default) case handles every other character.
```
