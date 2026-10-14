---
title: 0.4 — A copy, an alias and a read-only view
runtime: cpp
console: true
run: scratch/references.cpp
teaches: reference, aliasing, const reference, lifetime
experiments: Predict, trace, change, check
support: tests/swap_faces.cpp
---

### The story so far

changedCopy could not change main's die. Sometimes that is the right contract; a reroll operation needs a different one.

### What this lesson builds

Trace copy and reference parameters, explain const references, and implement a mutation that affects its caller.

## Two names, one object {#step-1}

**Build:** put a copy and a reference beside the same die. Type scratch/references.cpp.

```predict
question: After alias = 6, what are die, copy and alias?
choice: 6 2 6
choice: 2 2 6
answer: 6 2 6
explain: alias is a second name for die, not a third integer. copy is an independent integer.
```

```cpp file=scratch/references.cpp
#include <iostream>

int main() {
    int die = 2;
    int copy = die;
    int& alias = die;
    alias = 6;
    std::cout << die << " " << copy << " " << alias << '\n';
    return 0;
}
```

**Understand:** the & after int is part of a reference declaration. A reference must bind to an object when initialized. Here `int& alias = die` gives die another name.

```text
before assignment        after alias = 6
die, alias -> [2]         die, alias -> [6]
copy       -> [2]         copy       -> [2]
```

Unlike a pointer introduced next, a reference does not reseat. `alias = copy` assigns copy's integer into die; it does not redirect alias to copy. Run it and explain the two objects using boxes, not three variable names.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/references.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="6 2 6" label="Observe the result"
```

## Let the caller grant mutation {#mutation-contract}

**Build:** move the mutation into a function. void means the function does not return a value.

```cpp file=scratch/references.cpp
#include <iostream>

void setSix(int& face) {
    face = 6;
}
int main() {
    int die = 2;
    setSix(die);
    std::cout << "After reference: " << die << '\n';
    return 0;
}
```

**Understand:** the parameter face binds to die for the call. `face = 6` changes the caller's integer. When the call ends the parameter name disappears, but die remains alive in main. The reference parameter must refer to a valid object; it is not an optional selection.

| Signature | Object inside call | Can change caller's int? |
|---|---|---|
| void setSix(int face) | independent copy | no |
| void setSix(int& face) | alias for caller's object | yes |

> **Engineer:** a mutable reference is a promise of possible side effects. Use it when changing the caller is the purpose, not as a default spelling for every parameter.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/references.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="After reference: 6" label="Observe the result"
```

## Trace lifetimes and return types {#step-2}

**Build:** compare a const copy and a const reference before discussing larger objects.

```cpp file=scratch/references.cpp
#include <iostream>

int main() {
    int die = 2;
    const int snapshot = die;
    const int& view = die;
    die = 5;
    std::cout << "snapshot=" << snapshot << " view=" << view << '\n';
    return 0;
}
```

**Understand:** snapshot owns its copied 2. view borrows die and prohibits writing through view, but die can still change through its original name. The result is snapshot=2 view=5. Read-only access is not a frozen snapshot.

A function taking const int& promises not to mutate through that parameter. For a small int, taking a value is normally simpler. Later a const Scorecard& avoids copying a whole scorecard when displaying it.

Never return a reference to a local variable: the object dies when the call ends, leaving the reference **dangling**. Returning the calculated int by value is safe. A reference does not own the referred-to object.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/references.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="snapshot=2 view=5" label="Observe the result"
```

## Try it — Let the compiler explain the contract {#step-3}

Try `view = 6;` and compile. The diagnostic concerns assignment through a const reference. Remove it. In the earlier setSix example, removing & compiles but stops changing the caller: one is a type-system rejection, the other a behavioral defect. Explain which test distinguishes them.

Return scratch/references.cpp to the const-copy/view example above and run its checks before continuing.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/references.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="snapshot=2 view=5" label="Observe the result"
```

## Read the acceptance cases {#acceptance-cases}

**Build:** a test program that calls your code with inputs you do not choose.

Define `void swapFaces(int& a, int& b)`. Exchange the caller's values. It must also work when both references name the same integer. A correct swap of 2 and 6 leaves 6 and 2.

The test is supplied so you can concentrate on the function. `expect(condition, caseNumber)` exits with status 1 when the condition is false; a comment beside each numbered case says what it checks. The test owns `main`; your practice source must define the requested function without another main. The declaration above the test's main tells its compiler the function's signature; the linker will connect it to your definition. You will study that boundary fully in the header lesson.

Use **Create provided file** here to create the test. Read the first case aloud as input → expected result. The test does not prove every possible input, so add a case of your own after it passes.

```cpp file=tests/swap_faces.cpp provided
#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
void swapFaces(int& a, int& b);
int main() {
    int a = 2, b = 6;
    swapFaces(a, b);
    expect(a == 6 && b == 2, 1); // exchange both values
    swapFaces(a, a);
    expect(a == 6, 2); // same object twice
    int c = 4, d = 1;
    swapFaces(c, d);
    expect(c == 1 && d == 4, 3); // different inputs
    std::cout << "PASS: swap_faces\n";
}
```

```check
file tests/swap_faces.cpp
```

## Your turn — Swap the actual faces {#step-4}

**Build, on your own:** Define `void swapFaces(int& a, int& b)`. Exchange the caller's values. It must also work when both references name the same integer. A correct swap of 2 and 6 leaves 6 and 2.

Write **practice/swap_faces.cpp**. Do not change the supplied test to make it pass. Give this a real attempt before revealing hints. Compile and run the checks. Explain what each case rules out, then add a case of your own.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/swap_faces.cpp practice/swap_faces.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: swap_faces" label="All acceptance cases pass"
```

```hints
nudge: Which original value is lost by the first assignment?
concept: A temporary integer preserves a value before another assignment overwrites it.
shape: Save a in a local int, assign b into a, then assign the saved value into b. Trace the aliased-input case too.
```
