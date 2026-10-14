---
title: 0.2 — Five dice and a value that must not change
runtime: cpp
console: true
run: main.cpp
teaches: const, arrays, indexing, for loop, bounds
experiments: Predict, trace, change, check
support: tests/face_points.cpp
---

### The story so far

main.cpp holds two fixed faces. One variable per die becomes clumsy as soon as we need to visit all five.

### What this lesson builds

Store a hand in an array, trace every loop iteration and distinguish const from a compile-time requirement.

## Store one hand {#store-hand}

**Build:** replace the two loose faces with a built-in array: consecutive objects of the same type.

```cpp file=main.cpp
#include <iostream>

int main() {
    const int diceCount = 5;
    int dice[diceCount] = {3, 1, 6, 6, 2};
    std::cout << "First: " << dice[0] << '\n';
    std::cout << "Last: " << dice[4] << '\n';
    return 0;
}
```

**Understand:** dice names the array, and dice[0] names its first int. The last index is 4, because five positions are numbered 0 through 4. The braces supply the initial faces in that order. `const int diceCount = 5` makes the bound read-only after initialization. It also qualifies as a constant expression here because its initializer is the literal 5.

```text
index     0   1   2   3   4
face      3   1   6   6   2
```

The indices are positions, not faces: dice[3] means the fourth die, whose face happens to be 6.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="First: 3\nLast: 2" label="Observe the result"
```

## Count two sixes {#step-1}

**Build:** visit every element, increasing a counter only when its face is six.

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

**Understand:** the three parts of for are initialization (`int i = 0`, once), condition (`i < diceCount`, before each pass) and advance (`++i`, after each pass). ++ adds one. The if condition uses == to compare; a single = would assign. Braces group the statements inside each operation.

| i | dice[i] | equals 6? | sixes after this pass |
|---:|---:|---|---:|
| 0 | 3 | no | 0 |
| 1 | 1 | no | 0 |
| 2 | 6 | yes | 1 |
| 3 | 6 | yes | 2 |
| 4 | 2 | no | 2 |
| 5 | not accessed | condition is false | 2 |

Notice that sixes is initialized before the loop. Putting `int sixes = 0` inside the loop would create a new counter on every pass.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Sixes: 2" label="Observe the result"
```

## Const is a restriction, not a calculation {#step-2}

**Understand:** const prohibits changing an object through that declaration after initialization. It does not by itself mean the value was calculated during compilation.

| Declaration | When known? | Later assignment through this name? |
|---|---|---|
| const int sides = 6 | compile time | rejected |
| const int saved = score | can be runtime | rejected |
| constexpr int sides = 6 | required to be compile time | rejected |

Here score means an ordinary existing int. A built-in array bound must be a constant expression. A runtime const cannot provide it; later we use vector when the number of players is chosen while running.

```predict
question: Changing score later changes const int saved = score too?
choice: No — saved is an independent copy
choice: Yes — const keeps the two values linked
answer: No — saved is an independent copy
explain: Const controls mutation; copying controls whether the objects are independent. Those are different questions.
```

## Try it — Two different failures {#step-3}

Add `diceCount = 6;` below its declaration and compile. The compiler must reject mutation of a const object. Remove the line and rebuild.

On paper change i < diceCount to i <= diceCount. The extra pass accesses dice[5], which is not an element. C++ does not promise a bounds exception here: this is **undefined behavior**, meaning the language places no requirements on the result. Do not run that experiment to try to find a reliable output. Restore the strict bound.

> **Engineer:** a successful compile does not prove valid memory access. Trace the first index, last index and stopping condition separately.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Sixes: 2" label="Observe the result"
```

## Read the acceptance cases {#acceptance-cases}

**Build:** a test program that calls your code with inputs you do not choose.

Define `int facePoints(int face, int wanted)`. A matching face contributes its value; a different face contributes zero. Both inputs are legal die faces (1–6). Unlike the guided counter, return points, not the number of matches.

The test is supplied so you can concentrate on the function. `expect(condition, caseNumber)` exits with status 1 when the condition is false; a comment beside each numbered case says what it checks. The test owns `main`; your practice source must define the requested function without another main. The declaration above the test's main tells its compiler the function's signature; the linker will connect it to your definition. You will study that boundary fully in the header lesson.

Use **Create provided file** here to create the test. Read the first case aloud as input → expected result. The test does not prove every possible input, so add a case of your own after it passes.

```cpp file=tests/face_points.cpp provided
#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
int facePoints(int face, int wanted);
int main() {
    expect(facePoints(6, 6) == 6, 1); // six scores six points
    expect(facePoints(3, 6) == 0, 2); // nonmatching face scores zero
    expect(facePoints(2, 2) == 2, 3); // not hardcoded to six
    expect(facePoints(1, 1) == 1, 4); // lower boundary
    std::cout << "PASS: face_points\n";
}
```

```check
file tests/face_points.cpp
```

## Your turn — Score one chosen face {#step-4}

**Build, on your own:** Define `int facePoints(int face, int wanted)`. A matching face contributes its value; a different face contributes zero. Both inputs are legal die faces (1–6). Unlike the guided counter, return points, not the number of matches.

Write **practice/face_points.cpp**. Do not change the supplied test to make it pass. Give this a real attempt before revealing hints. Compile and run the checks. Explain what each case rules out, then add a case of your own.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/face_points.cpp practice/face_points.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: face_points" label="All acceptance cases pass"
```

```hints
nudge: The guided if already asks the right kind of question.
concept: A function body can use if and return just as main does. Returning exits only that function.
shape: Compare face with wanted. Return face inside the matching branch, otherwise return zero.
```
