---
title: Functions — inputs, copies and results
track: Start here — one file before classes
runtime: none
---

Given one die, compute its Sixes contribution using a small function in the same file.

## Extract a rule without creating a header

A six contributes six points; every other face contributes zero. `int sixPoints(int face)` declares a function that accepts an integer and returns an integer. Its body defines the calculation. The parameter `face` gets a copy of the argument's value. `return` leaves this function immediately. `score += x` means add x to score.

```cpp file=main.cpp
#include <iostream>

int sixPoints(int face) {
    if (face == 6) return 6;
    return 0;
}

int main() {
    int dice[5] = {3, 1, 6, 6, 2};
    int score = 0;
    for (int i = 0; i < 5; ++i) {
        score += sixPoints(dice[i]);
    }
    std::cout << "Score: " << score << '\n';
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o intro_check" label="Compile the example"
run "./intro_check" stdout="Score: 12" label="Observe the result"
```

```predict
question: If sixPoints assigns face = 1, does the caller's array change?
choice: No — face is a local copy
choice: Yes — arguments always share storage
answer: No — face is a local copy
explain: A value parameter is a separate object. The function can change that copy without changing the array element.
```

## Try it — Return is not print

Temporarily replace `return 6` with `std::cout << 6;`. The function now falls through to `return 0`, so the program prints stray sixes and calculates the wrong score. Restore the return. Pure scoring functions return answers; the user interface decides how to display them.

## Your turn — Explain and change it

Write pointsFor(int face, int wanted) and score both Twos and Sixes. Test a matching face and a nonmatching face separately.

```hints
nudge: Which constant in sixPoints should become a parameter?
concept: Returning a result lets another function reuse it without terminal output.
shape: Return face when face == wanted; otherwise return zero. Keep the function above main.
```
