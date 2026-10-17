---
title: 5.3 — Copies and Moves
runtime: none
---

Every C++ program makes copies, and most of the time they are harmless. Sometimes a copy is a wasted effort, and C++ lets you replace it with a **move**. In this lesson you build a small scratch program that counts every copy and move, and you run experiments until you can predict them. This is a scratch file, separate from the game.

## Observe one ordinary value {#copy-stage-value}

Start with this separate scratch program before the larger experiment. explicit blocks an implicit conversion from int to Noisy; the member initializer builds value before the constructor body. inline static copies is one class-wide counter, not one per object. In C++17 it can be defined here. get() const reads the stored value. Predict 7, then change only the constructor argument and rerun.

```cpp file=scratch/copy-stage.cpp
#include <iostream>
class Noisy {
public:
    inline static int copies = 0;
    explicit Noisy(int v) : value(v) {}
    int get() const { return value; }
private:
    int value;
};
int main() { Noisy a(7); std::cout << a.get() << "\n"; }
```

```check
run "g++ -std=c++17 -Wall -Wextra scratch/copy-stage.cpp -o copy_stage" label="Build one value"
run "./copy_stage" label="Read its stored value" stdout="7"
```

## Construct a second object {#copy-stage-copy}

Noisy b = a initializes a new b, so the copy constructor runs; this is not assignment into an existing b. const Noisy& other borrows the source without modifying it. Copy the int member and increment the shared counter. ++copies adds one. Predict the stored value and count before running. Both objects have separate int members; destroying one does not destroy the other.

```cpp file=scratch/copy-stage.cpp
#include <iostream>
class Noisy {
public:
    inline static int copies = 0;
    explicit Noisy(int v) : value(v) {}
    Noisy(const Noisy& other) : value(other.value) { ++copies; }
    int get() const { return value; }
private:
    int value;
};
int main() { Noisy a(7); Noisy b = a; std::cout << b.get() << " " << Noisy::copies << "\n"; }
```

```check
run "g++ -std=c++17 -Wall -Wextra scratch/copy-stage.cpp -o copy_stage" label="Build copy construction"
run "./copy_stage" label="One new copy contains seven" stdout="7 1"
```

## Permit a different constructor {#copy-stage-move}

Noisy&& is an rvalue reference in this ordinary constructor. std::move(a), declared in utility, lets overload resolution select it. The move constructor copies our tiny int and deliberately sets the source to -1; that marker is our chosen contract, not a universal moved-from value. noexcept promises no exception escapes this operation. The source is still alive. Predict 7, -1 and zero copies. Remove std::move temporarily to select the copy constructor, then restore it.

```cpp file=scratch/copy-stage.cpp
#include <iostream>
#include <utility>
class Noisy {
public:
    inline static int copies = 0;
    explicit Noisy(int v) : value(v) {}
    Noisy(const Noisy& other) : value(other.value) { ++copies; }
    Noisy(Noisy&& other) noexcept : value(other.value) { other.value = -1; }
    int get() const { return value; }
private:
    int value;
};
int main() { Noisy a(7); Noisy b = std::move(a); std::cout << b.get() << " " << a.get() << " " << Noisy::copies << "\n"; }
```

```check
run "g++ -std=c++17 -Wall -Wextra scratch/copy-stage.cpp -o copy_stage" label="Build move construction"
run "./copy_stage" label="Observe our explicit moved-from state" stdout="7 -1 0"
```

## Assign after construction {#copy-stage-assignment}

Now b already exists when b = a runs. operator= names the assignment operation; its Noisy& return refers to the receiving object. this is a pointer to that object, and *this dereferences it. Return the receiver so assignment has the usual chaining behavior. Compare this call with Noisy b = a. The later full experiment adds the analogous move assignment; each is instrumentation, not a reason to handwrite these operations for the game classes.

```cpp file=scratch/copy-stage.cpp
#include <iostream>
#include <utility>
class Noisy {
public:
    inline static int copies = 0;
    explicit Noisy(int v) : value(v) {}
    Noisy(const Noisy& other) : value(other.value) { ++copies; }
    Noisy(Noisy&& other) noexcept : value(other.value) { other.value = -1; }
    Noisy& operator=(const Noisy& other) {
        value = other.value;
        ++copies;
        return *this;
    }
    int get() const { return value; }
private:
    int value;
};
int main() { Noisy a(7); Noisy b(2); b = a; std::cout << b.get() << " " << Noisy::copies << "\n"; }
```

```check
run "g++ -std=c++17 -Wall -Wextra scratch/copy-stage.cpp -o copy_stage" label="Build copy assignment"
run "./copy_stage" label="Assign into an existing object" stdout="7 1"
```

## A class that counts

Words first:

- **Copy constructor**: runs when a new object is made as a copy of an existing one. Its parameter is `const T&`.
- **Move constructor**: runs when a new object is made by taking the contents of an object that is about to be thrown away. Its parameter is `T&&`.
- **`T&&` (rvalue reference)**: in this non-template example, a reference that can bind to a suitable temporary or to a value cast with std::move. A named rvalue-reference variable is itself an lvalue expression; its name alone does not perform a move.
- **`std::move(x)`**: does not move anything. It only says "treat `x` as something that may be taken from". The move happens in whichever constructor or function then receives it.
- **Moved-from object**: an object whose contents were taken. Its exact contract depends on the type. Standard-library objects generally remain valid but have an unspecified value unless a stronger guarantee is documented. Do not assume they are empty. Our demonstration class explicitly chooses -1.
- **Copy elision**: the compiler builds an object directly where it is needed instead of copying it. Since C++17 this is **guaranteed** when a function returns a temporary.

Create `copies.cpp` in a new folder `scratch/`, next to your project.

The class:

- `inline static int constructs = 0;`: three counters that belong to the class, not to any object. `inline` lets a `static` data member be defined right here in the class. Without it (before C++17) each one needed a separate definition in a `.cpp` file.
- `explicit Noisy(int v) : value(v) { constructs++; }`: an ordinary constructor. It counts itself.
- `Noisy(const Noisy& other)`: the copy constructor. It copies the value and adds 1 to `copies`.
- `Noisy(Noisy&& other) noexcept`: the move constructor. `Noisy&&` binds only to a temporary or to something wrapped in `std::move`. It takes the value, counts a move, and sets `other.value` to -1 to show that `other` has been emptied. `noexcept` promises it will never throw. That promise matters for containers such as `std::vector`, which can prefer copying during reallocation when moving might throw and copying is available. A move-only element can still require a potentially throwing move; guarantees depend on its operations.
- `operator=` in two forms: the same two ideas for assigning to an object that already exists. `return *this;` returns the object itself so that assignments can chain. `this` is a pointer to the object, and `*this` is the object.
- `static void reset()`: a static member function. It can be called as `Noisy::reset()` with no object.
- `report(...)` prints the counts and then zeroes them, so every experiment starts from zero.
- A real class that owns nothing special, like your `Scorecard`, should define **none** of these functions. The compiler writes correct ones. This is called the **rule of zero**. `Noisy` writes them only so that it can count.

The experiments in `main`:

- `takeByValue(Noisy n)` has no `&`. The argument is copied into `n`, or moved into it if you pass `std::move(...)`.
- `takeByConstRef(const Noisy& n)` makes no copy of any kind. This is why the project passes `const Counts&` and `const Scorecard&` everywhere.
- `Noisy c = makeNoisy(3);`: the function returns a temporary, and C++17 builds it directly in `c`. There is one construction and no copy and no move.
- `v.reserve(3);` makes room for three elements up front, so the vector never has to move its elements to a bigger block while the experiment runs.
- `v.push_back(a)` copies `a` into the vector. `v.push_back(std::move(c))` moves `c` in. `v.emplace_back(9)` passes `9` to the `Noisy` constructor and builds the element **inside** the vector, with no copy and no move.

```cpp file=scratch/copies.cpp
#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Noisy {
public:
    inline static int constructs = 0;
    inline static int copies = 0;
    inline static int moves = 0;

    explicit Noisy(int v) : value(v) {
        constructs++;
    }

    Noisy(const Noisy& other) : value(other.value) {
        copies++;
    }

    Noisy(Noisy&& other) noexcept : value(other.value) {
        moves++;
        other.value = -1;
    }

    Noisy& operator=(const Noisy& other) {
        value = other.value;
        copies++;
        return *this;
    }

    Noisy& operator=(Noisy&& other) noexcept {
        value = other.value;
        other.value = -1;
        moves++;
        return *this;
    }

    int get() const {
        return value;
    }

    static void reset() {
        constructs = 0;
        copies = 0;
        moves = 0;
    }

private:
    int value;
};

static void report(const std::string& label) {
    std::cout << label << ": constructs=" << Noisy::constructs
              << " copies=" << Noisy::copies
              << " moves=" << Noisy::moves << "\n";
    Noisy::reset();
}

static int takeByValue(Noisy n) {
    return n.get();
}

static int takeByConstRef(const Noisy& n) {
    return n.get();
}

static Noisy makeNoisy(int v) {
    return Noisy(v);
}

int main() {
    Noisy a(1);
    Noisy b(2);
    report("setup");

    takeByValue(a);
    report("by value, from a variable");

    takeByConstRef(a);
    report("by const reference");

    takeByValue(std::move(b));
    report("by value, with std::move");
    std::cout << "b now holds " << b.get() << "\n";

    Noisy c = makeNoisy(3);
    report("returned from a function");

    Noisy d = a;
    report("copy construction");

    Noisy e = std::move(d);
    report("move construction");
    std::cout << "e holds " << e.get() << "\n";

    Noisy x(10);
    Noisy y(20);
    Noisy::reset();
    y = x;
    report("copy assignment");
    y = std::move(x);
    report("move assignment");

    std::vector<Noisy> v;
    v.reserve(3);
    v.push_back(a);
    report("push_back of a variable");
    v.push_back(std::move(c));
    report("push_back with std::move");
    v.emplace_back(9);
    report("emplace_back");

    return 0;
}
```

```bash
g++ -std=c++17 -Wall -Wextra scratch/copies.cpp -o copies
./copies
```

```predict
question: takeByValue(a) is called with an ordinary variable. What does the report line say?
choice: copies=0 moves=0
choice: copies=1 moves=0
choice: copies=0 moves=1
answer: copies=1 moves=0
explain: The parameter n is a new object, and a variable on the right of the call is an lvalue, which cannot be taken from. So n is built by the copy constructor.
```

```predict
question: takeByValue(std::move(b)) is called. What does the report line say?
choice: copies=1 moves=0
choice: copies=0 moves=1
choice: copies=0 moves=0
answer: copies=0 moves=1
explain: std::move(b) makes b available to be taken from. The parameter n is built by the move constructor, which counts a move. Afterwards b holds -1.
```

```check
file scratch/copies.cpp
run "g++ -std=c++17 -Wall -Wextra scratch/copies.cpp -o copies" label="the experiment program builds" -- Check the move constructor takes Noisy&& and the copy constructor takes const Noisy&.
run "./copies" stdout="by value, from a variable: constructs=0 copies=1 moves=0" label="passing by value copies" -- A parameter without & is a new object.
run "./copies" stdout="by const reference: constructs=0 copies=0 moves=0" label="passing by const reference copies nothing" -- A reference is a second name for an existing object.
run "./copies" stdout="by value, with std::move: constructs=0 copies=0 moves=1" label="std::move turns the copy into a move" -- The move constructor runs when the argument is std::move(b).
run "./copies" stdout="returned from a function: constructs=1 copies=0 moves=0" label="returning a temporary builds it in place" -- C++17 guarantees there is no copy or move here.
run "./copies" stdout="emplace_back: constructs=1 copies=0 moves=0" label="emplace_back builds inside the vector" -- emplace_back passes its arguments to the constructor.
```

## Measure one operation at a time {#teaching-review}

**Try it yourself.** Reset counters immediately before each operation and report immediately after. Compare construction of a new object with assignment into an existing one. std::move is a cast that permits move overload selection; it cannot promise that every type will move or that the source becomes empty.

**Explain before continuing.** What does the declaration const Noisy& prevent? Why is adding std::move to every return not a sensible optimization rule? Which guarantees belong to our Noisy class and which to the language?

Write down your prediction, observation and the reason for any difference. Restore deliberate faults before continuing. Passing supplied tests is evidence for their cases, not proof that every behavior or explanation is correct.

## Your turn: a vector with no copies and no moves

At the end of `main`, before `return 0;`, build a `std::vector<Noisy>` named `three` that holds `Noisy` objects with the values 1, 2 and 3. Reserve room for three first. Then call `report("three emplaced");`. The report must show `constructs=3 copies=0 moves=0`. Note that `v.push_back(Noisy(1))` does not meet that goal, because the temporary has to be moved into the vector.

```check
run "g++ -std=c++17 -Wall -Wextra scratch/copies.cpp -o copies" label="the experiment program builds" -- Read the first error. It names the line.
run "./copies" stdout="three emplaced: constructs=3 copies=0 moves=0" label="three elements, no copies and no moves" -- Use reserve(3) and then emplace_back with the value. push_back(Noisy(1)) would show moves=3.
contains scratch/copies.cpp "emplace_back" label="emplace_back is used" -- It builds each element in place.
```

```hints
nudge: Which call builds an element inside the vector instead of building it elsewhere first?
concept: push_back takes an object that already exists, so a temporary must be moved in. emplace_back takes the constructor's arguments and builds the object in the vector's own memory. reserve stops the vector from having to move its elements into a bigger block.
shape: Declare `std::vector<Noisy> three;`, call `three.reserve(3);`, then `three.emplace_back(1);`, 2 and 3 on separate lines. Finish with the report line.
answer: One way to write it:
~~~cpp
std::vector<Noisy> three;
three.reserve(3);
three.emplace_back(1);
three.emplace_back(2);
three.emplace_back(3);
report("three emplaced");
~~~
```
