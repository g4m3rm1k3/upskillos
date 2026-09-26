# Design Pattern: Strategy — Implemented Three Ways

*Phase 4 — Inheritance & Polymorphism, Taught via a Real Need*
*First pattern taught, because it falls directly out of "I want interchangeable behavior."*

---

## The need, stated plainly

Suppose you're sorting a `MyVector` of numbers, and you want the *comparison logic* itself to be swappable — sometimes ascending, sometimes descending, sometimes by absolute value, decided by whoever calls the sort, without rewriting the sort function itself for every variation. This is "interchangeable behavior," and it's a need that recurs constantly in real software: the *what* (sort the data) stays fixed, while the *how* (what counts as "in order") needs to vary independently.

The **Strategy pattern**'s entire idea: define a family of interchangeable behaviors behind one common interface, so the code that *uses* the behavior doesn't need to know or care which specific one it's using. You already have every tool this pattern needs — Phase 4 has been building toward this the whole time. Let's implement it three genuinely different ways and compare them honestly.

## Version 1: Inheritance + virtual

The direct application of everything from Lessons 4.1–4.3: an abstract base class defining the required interface, concrete classes implementing specific strategies.

```cpp
#include <iostream>

class Comparator {
public:
    virtual ~Comparator() {}
    virtual bool compare(int a, int b) = 0;   // pure virtual, Lesson 4.3
};

class Ascending : public Comparator {
public:
    bool compare(int a, int b) override {
        return a < b;
    }
};

class Descending : public Comparator {
public:
    bool compare(int a, int b) override {
        return a > b;
    }
};

// A simple bubble sort accepting ANY Comparator — the sort logic never changes
void sortWithStrategy(int* data, int size, Comparator& strategy) {
    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size - i - 1; j++) {
            if (strategy.compare(data[j + 1], data[j])) {
                std::swap(data[j], data[j + 1]);
            }
        }
    }
}

int main() {
    int data[] = {5, 2, 8, 1, 9};

    Ascending asc;
    sortWithStrategy(data, 5, asc);
    for (int i = 0; i < 5; i++) std::cout << data[i] << " ";
    std::cout << std::endl;

    Descending desc;
    sortWithStrategy(data, 5, desc);
    for (int i = 0; i < 5; i++) std::cout << data[i] << " ";
    std::cout << std::endl;

    return 0;
}
```

Notice `sortWithStrategy` takes `Comparator&` — the same "program to the base class, not the derived types" idea from Lesson 4.1, now applied to *behavior* rather than *data*. Every new sort order you ever want is a new class implementing `compare()` — `sortWithStrategy` itself never changes, ever, no matter how many strategies you add later.

## Version 2: `std::function`

Instead of a class hierarchy, hold the behavior itself as a first-class value — a function, stored, passed around, and called, without needing any inheritance machinery at all:

```cpp
#include <iostream>
#include <functional>

bool ascendingFn(int a, int b) { return a < b; }
bool descendingFn(int a, int b) { return a > b; }

void sortWithStrategy(int* data, int size, std::function<bool(int, int)> strategy) {
    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size - i - 1; j++) {
            if (strategy(data[j + 1], data[j])) {
                std::swap(data[j], data[j + 1]);
            }
        }
    }
}

int main() {
    int data[] = {5, 2, 8, 1, 9};

    sortWithStrategy(data, 5, ascendingFn);
    for (int i = 0; i < 5; i++) std::cout << data[i] << " ";
    std::cout << std::endl;

    sortWithStrategy(data, 5, descendingFn);
    for (int i = 0; i < 5; i++) std::cout << data[i] << " ";
    std::cout << std::endl;

    return 0;
}
```

`std::function<bool(int, int)>` reads as "a callable thing that takes two `int`s and returns a `bool`" — it doesn't care whether that callable is a plain function, a lambda (next version), or something else entirely, as long as the shape matches. No class hierarchy at all — `sortWithStrategy` now takes a *value*, not an object implementing an interface. This is a genuine preview of Phase 11's "functional-style C++," arriving here early because it's a direct, real alternative solution to a problem you already understand deeply from the inheritance side.

## Version 3: Lambdas

Same `std::function`-based `sortWithStrategy`, but the strategies themselves are written inline, at the call site, with no separate named function or class needed at all:

```cpp
#include <iostream>
#include <functional>

void sortWithStrategy(int* data, int size, std::function<bool(int, int)> strategy) {
    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size - i - 1; j++) {
            if (strategy(data[j + 1], data[j])) {
                std::swap(data[j], data[j + 1]);
            }
        }
    }
}

int main() {
    int data[] = {5, 2, 8, 1, 9};

    sortWithStrategy(data, 5, [](int a, int b) { return a < b; });   // ascending, inline
    for (int i = 0; i < 5; i++) std::cout << data[i] << " ";
    std::cout << std::endl;

    sortWithStrategy(data, 5, [](int a, int b) { return a > b; });   // descending, inline
    for (int i = 0; i < 5; i++) std::cout << data[i] << " ";
    std::cout << std::endl;

    int threshold = 5;
    sortWithStrategy(data, 5, [threshold](int a, int b) {   // CAPTURES threshold from the surrounding scope
        return std::abs(a - threshold) < std::abs(b - threshold);
    });
    for (int i = 0; i < 5; i++) std::cout << data[i] << " ";
    std::cout << std::endl;

    return 0;
}
```

`[](int a, int b) { return a < b; }` is a **lambda** — an anonymous, inline function. The `[]` at the front is the *capture list*: `[threshold]` in the third example means this lambda captures the local variable `threshold` from its surrounding scope and can use it inside its body — something a plain function (Version 2) structurally cannot do without an extra parameter or a global variable. This capturing ability is the concrete reason lambdas exist as their own language feature rather than just being sugar for writing small named functions.

## Comparing all three, honestly

| | Inheritance + virtual | `std::function` + named functions | Lambdas |
|---|---|---|---|
| New strategy requires | A whole new class | A whole new named function | A few lines, inline, at the call site |
| Can capture surrounding local state | No — would need to add fields and a constructor to the class | No — a plain function can't see local variables from where it's called | **Yes** — capture list, directly |
| Runtime cost | One vtable indirection (Lesson 4.2) | Small — `std::function` has its own internal indirection, generally comparable | Same as `std::function`, when stored in one; can be faster if the compiler inlines a lambda directly |
| Best for | A family of strategies known ahead of time, especially with shared state/behavior beyond just the one function (multiple methods, fields) | A strategy that's just "one function," reused in several places, given a clear name | A strategy needed once, locally, where writing a whole class or named function would be needless ceremony |
| Extending later without touching existing code | Yes — new derived class, `sortWithStrategy` untouched (this is Phase 10's Open/Closed idea, arriving properly later) | Yes — new function, `sortWithStrategy` untouched | Yes — new lambda at whatever new call site needs it |

There's no universally "correct" choice among these three — that's the actual lesson, not a cop-out. A large, established codebase with several well-known, reusable strategies that carry their own internal state often favors the inheritance version, because a class can hold fields and multiple related methods together (Lesson 2.2's whole point). A one-off, local piece of custom behavior — "just this once, sort by distance from this particular threshold" — is exactly what lambdas exist for, and writing a whole named class for it would be real, unnecessary ceremony.

## Try it yourself

**1. Build all three versions above and confirm they all produce identical sorted output** for the same input data and equivalent strategies.

**2. Add a fourth strategy to each version — "sort by even numbers first, then odd"** — and count how many lines of *new* code each approach required, and whether any *existing* code needed to change. This is a direct, hands-on check of the "extending without touching existing code" row in the table above.

**3. Write a lambda that captures a variable by reference (`[&threshold]` instead of `[threshold]`) and modifies it from inside the lambda's body**, then confirm the change is visible outside the lambda afterward. This connects directly back to Lesson 1.3 — capturing by reference inside a lambda is exactly the same "shared box, not a copy" idea, applied to a lambda's captured variables instead of a function's parameters.

**4. Measure a real performance difference (optional, more advanced).** Time all three versions sorting a large array (10,000+ elements) many times, using the `<chrono>` technique from Phase 3. In most modern compilers with `-O2`, the differences will likely be small — but confirming that directly, rather than assuming it, is good practice, and ties back to Lesson 3.3's habit of measuring rather than guessing.

## What this cost / bought us

The Strategy pattern itself costs nothing conceptually new — every tool it uses (abstract classes, `virtual`, first-class functions, lambdas) you already had. What it bought you is a name and a recognizable shape for something you'll want repeatedly: **whenever a piece of behavior needs to vary independently of the code that uses it, and you want to add new variations without modifying that surrounding code, you're looking at a Strategy.** You'll meet this exact shape again — the Command pattern (Phase 6) is a close cousin, the Visitor pattern (Phase 7) applies a related idea to tree operations, and the whole Phase 10 Template Method comparison revisits this "define the skeleton, plug in the varying part" idea from a different angle entirely.

---

**Phase 4 is complete.** Inheritance, virtual dispatch, abstract classes, object slicing, composition, and your first design pattern, implemented and compared three genuinely different ways.

**Next up: Phase 5 — Linked Structures = OOP + Memory, Fused.** Your array intuition (Phases 1–3) and your object intuition (Phase 2–4) merge for the first time — starting with Lesson 5.1, singly linked lists, built with raw pointers first, exactly the way `MyVector` started with raw memory before anything else.
