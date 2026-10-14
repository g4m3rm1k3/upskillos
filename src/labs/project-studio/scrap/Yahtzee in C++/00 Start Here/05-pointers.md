---
title: 0.5 — Selecting a die: pointers and absence
runtime: cpp
console: true
run: scratch/pointers.cpp
teaches: pointer, address-of, dereference, nullptr, pointer const
experiments: Predict, trace, change, check
support: tests/set_selected.cpp
---

### The story so far

A reference binds to a required object. A game selection may point at one die, move to another or be empty.

### What this lesson builds

Read and write through a pointer, distinguish its value from its target, and guard an optional selection.

## Follow a selection {#step-1}

**Build:** select a by storing its address, then change the selected integer.

A **pointer** is an object whose value can designate another object. `int* selected` declares a pointer to int. In the expression `&a`, & takes the address of a. In `*selected`, * dereferences the pointer: it names the designated int. This is different from & in a reference declaration and from * in multiplication. Read the context before naming the operator.

```cpp file=scratch/pointers.cpp
#include <iostream>

int main() {
    int a = 2;
    int b = 5;
    int* selected = &a;
    *selected = 6;
    std::cout << a << " " << b << '\n';
    return 0;
}
```

**Understand:** there are now three objects: integer a, integer b and the pointer selected. The pointer stores an address, not a copy of a's integer. Writing *selected changes a. We do not print raw addresses because their digits vary by run; the relationship is what matters.

```text
selected [address of a] ----> a [6]
                             b [5]
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/pointers.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="6 5" label="Observe the result"
```

## Move the arrow or change its target {#reseat}

**Build:** reassign selected, then write through it again.

```predict
question: After selected = &b; *selected = 3; what are a and b?
choice: 6 3
choice: 3 5
answer: 6 3
explain: The first statement moves the pointer to b. The second changes b. a keeps its previous 6.
```

```cpp file=scratch/pointers.cpp
#include <iostream>

int main() {
    int a = 2;
    int b = 5;
    int* selected = &a;
    *selected = 6;
    selected = &b;
    *selected = 3;
    std::cout << a << " " << b << '\n';
    return 0;
}
```

| Statement | selected designates | a | b |
|---|---|---:|---:|
| int* selected = &a | a | 2 | 5 |
| *selected = 6 | a | 6 | 5 |
| selected = &b | b | 6 | 5 |
| *selected = 3 | b | 6 | 3 |

A pointer variable can be reseated; the reference from the previous lesson cannot. A pointer parameter passed by value copies the address, so it can still mutate the original pointee. Reassigning the parameter itself changes only its local pointer copy.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/pointers.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="6 3" label="Observe the result"
```

## An empty selection is a real state {#absence}

**Build:** represent no selected die with nullptr, and check before dereferencing.

```cpp file=scratch/pointers.cpp
#include <iostream>

int main() {
    int a = 2;
    int b = 5;
    int* selected = &a;
    *selected = 6;
    selected = &b;
    *selected = 3;
    std::cout << a << " " << b << '\n';
    selected = nullptr;
    if (selected != nullptr) {
        std::cout << *selected << '\n';
    }
    return 0;
}
```

**Understand:** nullptr means there is no designated object. It is not an integer zero stored in a hidden die. Comparing a pointer with nullptr is valid; dereferencing nullptr is undefined behavior. A pointer with an ended target lifetime may still compare unequal to nullptr, so a null check alone cannot prove a borrow remains valid.

> **Engineer:** use a pointer when absence or reseating is part of the interface. Use a reference for a required existing object. Neither syntax by itself specifies ownership.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/pointers.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="6 3" label="Observe the result"
```

## Read the const in each position {#step-2}

Read from the pointee outward. Const before the star restricts the int reached through it; const after the star restricts the pointer object.

| Declaration | Reseat p? | Assign through *p? |
|---|---|---|
| int* p = &a | yes | yes |
| const int* p = &a | yes | no |
| int* const p = &a | no | yes |
| const int* const p = &a | no | no |

`const int*` does not make a originally declared as int immutable through every name. It limits this access path. Neither pointer form keeps a alive. These locals own their storage; never delete a pointer to them. We do not need dynamic allocation to point at an existing die.

## Try it — Read the direction of an assignment {#step-3}

Replace *selected = 6 with selected = &b in the first part. Predict 2 3, then run. Restore the original assignment. Add a separate const int* view = &a and try *view = 4: compilation must reject it. Remove both experimental lines before continuing.

Explain why replacing the star with an ampersand is not a stylistic choice: the left-hand object being assigned is different.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/pointers.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="6 3" label="Observe the result"
```

## Read the acceptance cases {#acceptance-cases}

**Build:** a test program that calls your code with inputs you do not choose.

Define `bool setSelected(int* selected, int value)`. Return false for nullptr or a value outside 1–6, without changing any die. Otherwise change the selected int and return true. This combines the null check with the die invariant.

The test is supplied so you can concentrate on the function. `expect(condition, caseNumber)` exits with status 1 when the condition is false; a comment beside each numbered case says what it checks. The test owns `main`; your practice source must define the requested function without another main. The declaration above the test's main tells its compiler the function's signature; the linker will connect it to your definition. You will study that boundary fully in the header lesson.

Use **Create provided file** here to create the test. Read the first case aloud as input → expected result. The test does not prove every possible input, so add a case of your own after it passes.

```cpp file=tests/set_selected.cpp provided
#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
bool setSelected(int* selected, int value);
int main() {
    int a = 2, b = 5;
    expect(setSelected(&a, 6), 1); // valid selection accepted
    expect(a == 6 && b == 5, 2); // only selected die changes
    expect(!setSelected(nullptr, 3), 3); // absent selection rejected
    expect(!setSelected(&a, 0) && a == 6, 4); // below range does not mutate
    expect(!setSelected(&a, 7) && a == 6, 5); // above range does not mutate
    expect(setSelected(&b, 1) && b == 1, 6); // lower valid boundary
    std::cout << "PASS: set_selected\n";
}
```

```check
file tests/set_selected.cpp
```

## Your turn — Change only a valid selection {#step-4}

**Build, on your own:** Define `bool setSelected(int* selected, int value)`. Return false for nullptr or a value outside 1–6, without changing any die. Otherwise change the selected int and return true. This combines the null check with the die invariant.

Write **practice/set_selected.cpp**. Do not change the supplied test to make it pass. Give this a real attempt before revealing hints. Compile and run the checks. Explain what each case rules out, then add a case of your own.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/set_selected.cpp practice/set_selected.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: set_selected" label="All acceptance cases pass"
```

```hints
nudge: List every reason to reject before the assignment.
concept: The copied pointer still designates the original int. Returning false should leave that int alone.
shape: Check nullptr and both numeric bounds first. Only the accepted path assigns through *selected.
```
