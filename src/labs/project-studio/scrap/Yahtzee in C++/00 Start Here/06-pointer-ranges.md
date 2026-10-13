---
title: Side lab — pointer ranges and lifetime
track: Start here — one file before classes
runtime: none
---

Traverse a built-in array safely and identify invalid pointer operations without executing them.

## Walk a range

The five values sum to 16. In this expression, the array name `dice` converts to a pointer to its first element. `dice + 5` is the permitted one-past-the-end pointer. It is a stopping marker, never a readable element. `++p` advances by one int, not one byte. Pointer arithmetic is defined only within the same array (including its one-past endpoint).

```cpp file=scratch/ranges.cpp
#include <iostream>

int main() {
    int dice[5] = {2, 4, 6, 1, 3};
    int* first = dice;
    int* end = dice + 5;
    int total = 0;
    for (int* p = first; p != end; ++p) {
        total += *p;
    }
    std::cout << "Total: " << total << '\n';
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/ranges.cpp -o intro_check" label="Compile the example"
run "./intro_check" stdout="Total: 16" label="Observe the result"
```

```predict
question: May the loop read *end after finishing?
choice: No — end marks a boundary, not an element
choice: Yes — the address was legal to construct
answer: No — end marks a boundary, not an element
explain: Constructing a one-past pointer is allowed; dereferencing it is not.
```

## A pointer does not remember the array size

`sizeof(dice) / sizeof(dice[0])` counts elements where dice is still an array. Inside `void f(int dice[])`, the parameter is adjusted to `int*`; sizeof would measure a pointer. Pass an explicit size or use `std::array<int, 5>` for a fixed-size value that retains its size. C++20's `std::span` is a later non-owning range option; it is not available in this C++17 project.

A pointer to a local variable dangles after that variable's lifetime ends. A pointer to a vector element may dangle when growing the vector reallocates its storage. Reserving capacity can reduce reallocations but does not make borrowing permanent. Keep the owner alive and avoid structural changes while borrowing. Later, ranking pointers are consumed while the player list remains stable.

## Try it — Diagnose on paper

Change the condition to `p <= end` on paper only. Which iteration would read an object that does not exist? Answer: the extra iteration at end. Restore `p != end` before compiling. Also explain why subtracting pointers into two unrelated arrays is invalid even if their printed addresses look close.

## Your turn — Explain and change it

Write a function that sums a pointer range [first, last). Test all five values, the middle three, and the empty range dice to dice. Expect 16, 11 and 0. State the caller obligation that both endpoints belong to the same array and are ordered.

```hints
nudge: The empty range takes zero loop iterations.
concept: A half-open range includes its first element and excludes its end marker.
shape: Use const int* parameters, accumulate while first != last, then increment first. Do not dereference last.
```
