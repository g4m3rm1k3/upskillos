---
title: A class in one file — protect an invariant
track: Start here — one file before classes
runtime: none
---

Explain why a class helps only after identifying an invalid state you want to prevent.

## Protect the face range

An ordinary int can hold 99 even though a die cannot. An **invariant** is a condition that should remain true: this die's face stays between 1 and 6. A class combines stored state with operations that enforce that condition. A struct could also have member functions; class members default to private, while struct members default to public.

Start in one scratch file. No header is required just because this is a class. `private` blocks callers from assigning directly to face. `public` gives callers an interface. The constructor `Die()` initializes each object's face. `getFace() const` promises not to modify ordinary members through this object; that trailing const differs from const on a parameter.

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
    bool accepted = first.setFace(99);
    Die second = first;
    second.setFace(2);
    const Die& view = first;
    std::cout << view.getFace() << " " << second.getFace()
              << " " << accepted << '\n';
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/class.cpp -o intro_check" label="Compile the example"
run "./intro_check" stdout="6 2 0" label="Observe the result"
```

```predict
question: Does changing second change first?
choice: No — second owns a copied integer member
choice: Yes — class variables are always references
answer: No — second owns a copied integer member
explain: This class has value semantics. Copying it copies its int; use a reference explicitly when you mean an alias.
```

## Read the interface as a contract

`Die() : face(1)` is a member initializer list; it initializes face before the constructor body runs. `Die second = first` copies the object. `const Die& view` aliases first through a read-only interface. Calling getFace through view is allowed; calling setFace through view is rejected. `std::cout` normally prints false as 0.

A **resource** is something requiring release, such as allocated storage or an open file. RAII ties a resource to an object's lifetime; destruction releases it automatically. Our int needs no custom destructor. Later, vector and string manage their own storage. Prefer those value-owning members over handwritten new/delete. The compiler-generated copy, move and destructor operations are often all you need: the Rule of Zero.

## Try it — Enforce the boundary

Add `first.face = 99;` and observe a compile error. Remove it. Try `view.setFace(2)` and observe another error. Remove it. Explain the difference: private protects the representation, while const limits mutation through a particular interface.

## Rejoin the original game lessons

Chapter 1 now rebuilds the one-file prototype with Die.h and Die.cpp. It changes the representation deliberately; preserve single_file.cpp as a comparison. You already know why a declaration, a definition, a const method and an include guard exist. Chapter 2 scales one die to a hand. Chapter 7 completes the rules and checks the final application.

## Your turn — Explain and change it

Write a one-file TurnCounter class with a private count, a const rollsUsed query, and a roll operation that refuses a fourth roll. Test its initial value, three successes and one rejection before moving it to a header/source pair.

```hints
nudge: Name the invariant before naming the class.
concept: The mutating operation must validate before changing state.
shape: Initialize count to zero; return false at three; otherwise increment. Explain which files must rebuild after changing the class declaration.
```
