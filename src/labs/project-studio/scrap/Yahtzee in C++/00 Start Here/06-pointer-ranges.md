---
title: 0.6 — Walk a hand without crossing its boundary
runtime: cpp
console: true
run: scratch/ranges.cpp
teaches: pointer arithmetic, half-open range, array decay, lifetime
experiments: Predict, trace, change, check
support: tests/count_range.cpp
---

### The story so far

Pointers can name individual dice. The built-in array also lets a pointer move between its elements, with strict limits.

### What this lesson builds

Trace a half-open range, sum an empty range safely and explain why a pointer does not carry an array length.

## An address can mark a position {#positions}

**Build:** compare the first and next element without a loop.

```cpp file=scratch/ranges.cpp
#include <iostream>

int main() {
    int dice[5] = {2, 4, 6, 1, 3};
    int* first = dice;
    std::cout << *first << " " << *(first + 1) << '\n';
    return 0;
}
```

**Understand:** here the array expression dice converts to a pointer to its first element. This conversion is often called **array-to-pointer decay**. first + 1 advances by one int element, not one byte. *(first + 1) names the same element as dice[1]. Pointer arithmetic is defined only within the same array, including the one-past endpoint.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/ranges.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="2 4" label="Observe the result"
```

## Walk a range {#step-1}

**Build:** give a function the first included position and the first excluded position.

```cpp file=scratch/ranges.cpp
#include <iostream>

int sumRange(const int* first, const int* last) {
    int total = 0;
    for (const int* p = first; p != last; ++p) {
        total += *p;
    }
    return total;
}
int main() {
    int dice[5] = {2, 4, 6, 1, 3};
    std::cout << "Total: " << sumRange(dice, dice + 5) << '\n';
    std::cout << "Middle: " << sumRange(dice + 1, dice + 4) << '\n';
    std::cout << "Empty: " << sumRange(dice, dice) << '\n';
    return 0;
}
```

**Understand:** [first, last) is a **half-open range**: include first, stop before last. p is a local pointer copy, so incrementing it does not change the caller's pointer. const int* permits moving p but prohibits writing through it.

| Call | Visited indices | Sum |
|---|---|---:|
| sumRange(dice, dice + 5) | 0, 1, 2, 3, 4 | 16 |
| sumRange(dice + 1, dice + 4) | 1, 2, 3 | 11 |
| sumRange(dice, dice) | none | 0 |

The caller must supply an ordered range in one array. The function cannot recover a valid size from arbitrary pointer values. A one-past pointer may be formed and compared but not dereferenced.

```predict
question: In the empty-range call, is *first ever evaluated?
choice: No — the loop condition fails immediately
choice: Yes — every range includes its first element
answer: No — the loop condition fails immediately
explain: The condition is checked before the body. Equal endpoints encode zero elements.
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/ranges.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Total: 16\nMiddle: 11\nEmpty: 0" label="Observe the result"
```

## A pointer does not remember the array size {#step-2}

In the declaring scope, sizeof(dice) measures this whole array. Inside a parameter written int dice[], the parameter type is adjusted to int*: sizeof then measures the pointer. Do not calculate an array length from that pointer.

Later, std::array<int, 5> preserves a fixed size in its type and vector owns a runtime-sized sequence. You need to understand borrowing even when these containers manage storage for you.

A borrow lasts only as long as its target remains alive at the same valid location. Appending to a vector can reallocate its storage and invalidate pointers into the old storage. Reserving capacity reduces reallocations but does not make every future operation safe. Ranking in the multiplayer chapter borrows only while the player list stays stable.

## Try it — Diagnose on paper {#step-3}

Write the loop with p <= last on paper. Mark the extra iteration that dereferences the one-past endpoint. Do not execute it: undefined behavior has no dependable output to compare. Repair it to p != last.

Next draw two separate arrays. Subtracting a pointer into one from a pointer into the other is not a valid way to count their combined elements, even if the printed addresses happen to be close.

> **Engineer:** a pointer interface carries obligations its type cannot fully express. Document those obligations, or choose a container/range abstraction that expresses more of them.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/ranges.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Empty: 0" label="Observe the result"
```

## Read the acceptance cases {#acceptance-cases}

**Build:** a test program that calls your code with inputs you do not choose.

Define `int countFace(const int* first, const int* last, int wanted)`. Return the number of matching values in the ordered range [first,last) of one live array. Do not change the elements. The empty range returns zero.

The test is supplied so you can concentrate on the function. `expect(condition, caseNumber)` exits with status 1 when the condition is false; a comment beside each numbered case says what it checks. The test owns `main`; your practice source must define the requested function without another main. The declaration above the test's main tells its compiler the function's signature; the linker will connect it to your definition. You will study that boundary fully in the header lesson.

Use **Create provided file** here to create the test. Read the first case aloud as input → expected result. The test does not prove every possible input, so add a case of your own after it passes.

```cpp file=tests/count_range.cpp provided
#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
int countFace(const int* first, const int* last, int wanted);
int main() {
    const int dice[] = {6, 2, 6, 6, 1};
    expect(countFace(dice, dice + 5, 6) == 3, 1); // whole hand
    expect(countFace(dice + 1, dice + 4, 6) == 2, 2); // middle subrange
    expect(countFace(dice, dice, 6) == 0, 3); // empty range
    expect(countFace(dice, dice + 5, 4) == 0, 4); // missing face
    expect(countFace(dice, dice + 1, 6) == 1, 5); // one element
    std::cout << "PASS: count_range\n";
}
```

```check
file tests/count_range.cpp
```

## Your turn — Count a face within a borrowed range {#step-4}

**Build, on your own:** Define `int countFace(const int* first, const int* last, int wanted)`. Return the number of matching values in the ordered range [first,last) of one live array. Do not change the elements. The empty range returns zero.

Write **practice/count_range.cpp**. Do not change the supplied test to make it pass. Give this a real attempt before revealing hints. Compile and run the checks. Explain what each case rules out, then add a case of your own.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/count_range.cpp practice/count_range.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: count_range" label="All acceptance cases pass"
```

```hints
nudge: Keep sumRange's boundary logic and change what the body accumulates.
concept: Dereferencing reads the current int; incrementing advances the pointer. Those operations have separate jobs.
shape: Start a count at zero, loop while p != last, increment count only for *p == wanted, then advance p.
```
