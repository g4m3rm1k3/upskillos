---
title: 0.9 — A class earns its place
runtime: cpp
console: true
run: scratch/class.cpp
teaches: class, invariant, constructor, private, const method, value semantics
experiments: Predict, trace, change, check
---

### The story so far

The header lesson separated an existing function without changing its behavior. A class solves a different problem: keeping related state valid.

### What this lesson builds

Protect the die's face range in a class defined in one file, trace a copy versus a const reference, then build a guarded counter independently.

## Protect the face range {#step-1}

**Build:** start with a die that can only be read. An int alone can hold 99; a die must maintain an **invariant**, a condition that remains true: its face is between 1 and 6.

A **class** defines a type combining data with operations. Its members default to private, meaning outside code cannot access them directly. public labels the operations callers may use. A struct can also have methods; its members default to public instead.

```cpp file=scratch/class.cpp
#include <iostream>

class Die {
    int face = 1;
public:
    int getFace() const { return face; }
};

int main() {
    Die die;
    std::cout << "Face: " << die.getFace() << '\n';
    return 0;
}
```

**Understand:** Die die creates one object. Its face member initializes to 1. The dot calls a **member function** on that object. getFace() returns an int copy. The const after its parentheses promises not to change ordinary members through this object during the call. The semicolon after the class's closing brace is required.

No header is involved: a class and a file boundary are separate design choices.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/class.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Face: 1" label="Observe the result"
```

## Validate before changing the member {#validated-operation}

**Build:** give callers a single validated way to change face. `||` means logical or: the condition rejects a value below 1 or above 6. It stops evaluating as soon as one side is true. Contrast that with `&&` in readChoice, which needed every condition to succeed.

```cpp file=scratch/class.cpp
#include <iostream>

class Die {
    int face = 1;
public:
    bool setFace(int next) {
        if (next < 1 || next > 6) return false;
        face = next;
        return true;
    }
    int getFace() const { return face; }
};

int main() {
    Die die;
    die.setFace(6);
    bool accepted = die.setFace(99);
    std::cout << "Accepted: " << accepted << '\n';
    std::cout << "Face: " << die.getFace() << '\n';
    return 0;
}
```

**Understand:** the invalid path returns before the assignment. Calling setFace(6) succeeds; calling setFace(99) returns false and leaves 6 intact. std::cout prints bool as 0/1 by default.

| Request | Valid? | Stored face after request |
|---|---|---:|
| construction | yes | 1 |
| setFace(6) | yes | 6 |
| setFace(99) | no | 6 |

> **Engineer:** protecting an invariant requires every public mutating operation to preserve it. Private data alone is not enough if a public setter accepts anything.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/class.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Accepted: 0\nFace: 6" label="Observe the result"
```

## Initialize before the body runs {#constructor}

**Build:** express the initial state using a constructor.

```cpp file=scratch/class.cpp
#include <iostream>

class Die {
    int face;
public:
    Die() : face(1) {}
    bool setFace(int next) {
        if (next < 1 || next > 6) return false;
        face = next;
        return true;
    }
    int getFace() const { return face; }
};

int main() {
    Die die;
    die.setFace(6);
    bool accepted = die.setFace(99);
    std::cout << "Accepted: " << accepted << '\n';
    std::cout << "Face: " << die.getFace() << '\n';
    return 0;
}
```

A **constructor** runs when an object is created. It has the class's name and no return type. `Die() : face(1) {}` initializes face to 1 before its empty body runs. The colon introduces a member initializer list; it is not a base class here. Initialization is different from default-initializing a member and assigning later.

The previous default member initializer was also correct. This version prepares you for constructors that receive inputs and for members that must be initialized directly.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/class.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Face: 6" label="Observe the result"
```

## Read the interface as a contract {#step-2}

**Build:** compare an owned copy with a borrowed const view.

```predict
question: After changing second, what does view.getFace() read?
choice: 6 — view still refers to first
choice: 2 — all class values refer to one object
answer: 6 — view still refers to first
explain: This class owns an int. Its generated copy operation copies the member into a separate object.
```

```cpp file=scratch/class.cpp
#include <iostream>

class Die {
    int face;
public:
    Die() : face(1) {}
    bool setFace(int next) {
        if (next < 1 || next > 6) return false;
        face = next;
        return true;
    }
    int getFace() const { return face; }
};

int main() {
    Die first;
    first.setFace(6);
    Die second = first;
    second.setFace(2);
    const Die& view = first;
    std::cout << view.getFace() << " " << second.getFace() << '\n';
    return 0;
}
```

**Understand:** first and second own separate face integers. view is an alias for first, restricted to operations usable on a const object. A const method can be called through view; setFace cannot. This is **value semantics**, rather than the shared-object assignment you may know from Python.

Later vector and string members manage their own storage. Their destructors release owned resources when their lifetimes end; this lifetime-based resource management is RAII. Prefer those members over handwritten new/delete. If members already manage ownership, the generated copy, move and destructor operations often suffice: the Rule of Zero.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/class.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="6 2" label="Observe the result"
```

## Try it — Enforce the boundary {#step-3}

Try first.face = 99 and compile: private access is rejected. Remove it. Try view.setFace(2): a const object cannot call this mutating method. Remove it. These are different protections: private controls access to representation; const controls the permitted operations through one access path.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/class.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="6 2" label="Observe the result"
```

## Rejoin the original game lessons {#step-4}

You now have a preserved single-file game, a function split across source files, and a small class understood on its own. **One Die** starts the next implementation in main.cpp; your prototype stays in single_file.cpp. This is a deliberate second pass: the game grows around Die, Dice, Scorecard and Player instead of parallel raw arrays.

Before creating Die.h there, point to the same declaration, implementation and invariant roles in this example. The remaining chapters add full rules, input, rendering, players and replay; Finish and Explain tests the completed game.

## Read the acceptance cases {#acceptance-cases}

The next exercise puts a complete small class definition in a header, as the next chapter will. Define practice/TurnCounter.h with an include guard. It needs an initial zero, a bool roll() operation and an int rollsUsed() const query. The supplied test includes the header, so it needs no separately compiled implementation yet.

```cpp file=tests/counter.cpp provided
#include "../practice/TurnCounter.h"
#include <iostream>
int main() {
    TurnCounter turn;
    if (turn.rollsUsed() != 0) return 1;
    for (int i = 1; i <= 3; ++i) {
        if (!turn.roll() || turn.rollsUsed() != i) return 1;
    }
    if (turn.roll() || turn.rollsUsed() != 3) return 1;
    TurnCounter other;
    if (other.rollsUsed() != 0) return 1;
    const TurnCounter& view = turn;
    if (view.rollsUsed() != 3) return 1;
    std::cout << "PASS: counter\n";
    return 0;
}
```

## Your turn — Permit exactly three rolls {#step-5}

Build TurnCounter to the acceptance cases. Its invariant is 0 <= count <= 3. A fourth roll returns false without changing count. The const query returns the stored count. A new independent counter starts at zero.

Write down where you validate and where you mutate before typing. Then add a test that several rejected rolls still leave the count at three.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/counter.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: counter" label="Observe the result"
```

```hints
nudge: This is the same validate-before-assign pattern as Die.
concept: The query must work through a const reference. A rejected mutation must preserve the invariant.
shape: Use a private int initialized to zero. roll checks the limit before incrementing; rollsUsed returns the count with a trailing const.
```
