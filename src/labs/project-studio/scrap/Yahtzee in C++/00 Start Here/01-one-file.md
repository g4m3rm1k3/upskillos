---
title: One file — values before machinery
track: Start here — one file before classes
runtime: none
---

Given two fixed dice, compute their total and explain the difference between editing a source file and running a compiled program.

## Make a result you can predict

Six plus two is eight. Start with these known faces so a surprising result is a programming issue rather than randomness.

`#include <iostream>` makes standard input/output declarations available. `std::cout` is the output stream. `<<` sends a value into that stream; `'\n'` is one newline character. `int` stores a whole number. `main` is the entry function; braces enclose its body. A semicolon ends a statement. `return 0` reports success to the system.

```cpp file=main.cpp
#include <iostream>

int main() {
    int first = 6;
    int second = 2;
    int total = first + second;
    std::cout << "Total: " << total << '\n';
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o intro_check" label="Compile the example"
run "./intro_check" stdout="Total: 8" label="Observe the result"
```

The compiler translates source code and links an executable named `intro_check`. `-std=c++17` selects the language version. `-Wall -Wextra -Wpedantic` enable useful diagnostics. Run `./intro_check` after compiling. A successful compile usually prints nothing.

```predict
question: Change first to 3 but do not rebuild. What does the old executable print?
choice: Total: 8
choice: Total: 5
answer: Total: 8
explain: The executable still contains the previous program. Saving source does not rebuild it.
```

## Try it — Find the first diagnostic

Remove the semicolon after `int first = 6`. Build and read the first error, which may point at the following line. Restore the semicolon, rebuild, then run. Error locations are clues; the cause can be just before them.

## Your turn — Explain and change it

Change the faces to 1 and 5. Predict 6, rebuild and verify it. Add a third face and explain why changing first after calculating total does not automatically recalculate total.

```hints
nudge: Follow statement order.
concept: Assignment stores a value now; it does not make a spreadsheet formula.
shape: Assign first, second and third, then calculate total from all three. Repeat the calculation after changing a face.
```
