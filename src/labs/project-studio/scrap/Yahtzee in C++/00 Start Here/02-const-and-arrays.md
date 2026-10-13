---
title: Const — promises and five dice
track: Start here — one file before classes
runtime: none
---

Given a fixed hand, count sixes and distinguish a read-only value from a compile-time constant.

## Count two sixes

The hand 3, 1, 6, 6, 2 contains two sixes. Store it as five adjacent integers, then visit positions 0 through 4. `dice[i]` selects one element. `==` compares; `=` assigns. `++i` advances the loop counter. The condition `i < diceCount` stops before position 5, which is outside this array.

`const int diceCount = 5` promises that this name cannot be used to change the integer after initialization. Because its initializer is a constant expression, it can also supply this built-in array's size.

```cpp file=main.cpp
#include <iostream>

int main() {
    const int diceCount = 5;
    int dice[diceCount] = {3, 1, 6, 6, 2};
    int sixes = 0;
    for (int i = 0; i < diceCount; ++i) {
        if (dice[i] == 6) {
            ++sixes;
        }
    }
    std::cout << "Sixes: " << sixes << '\n';
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o intro_check" label="Compile the example"
run "./intro_check" stdout="Sixes: 2" label="Observe the result"
```

```predict
question: Could const int score = readScore() hold a value obtained at runtime?
choice: Yes — const alone does not mean compile-time
choice: No — every const value must be known while compiling
answer: Yes — const alone does not mean compile-time
explain: Assuming readScore is a declared function returning int, the initialized value can be read-only even when obtained at runtime.
```

## Const is a restriction, not a calculation

`const int x = 5` initializes x; a later `x = 6` is rejected. Initialization gives an object its first value; assignment changes an existing object. `constexpr int sides = 6` explicitly requires a constant-expression initializer. A runtime const value cannot be a standard built-in array bound. Later you will use a vector when the size is determined at runtime.

## Try it — Two different failures

Add `diceCount = 6;` and compile: the compiler rejects assignment to a const object. Remove the line. Do not run a deliberate out-of-bounds access: C++ does not reliably detect it. Accessing `dice[5]` has undefined behavior, meaning the language makes no promise about the result. A successful compile does not prove memory safety.

## Your turn — Explain and change it

Count fours in {4, 4, 1, 6, 2}, then in {1, 2, 3, 5, 6}. Expect 2 and 0. Also compute the sum without typing the expected total.

```hints
nudge: Use separate counters for separate questions.
concept: An accumulator starts at zero and adds each visited value.
shape: Keep the bound const, loop with i < diceCount, and compare each element to 4. Explain why <= would be wrong.
```
