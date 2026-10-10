---
title: 1.3 — Tumbling and Drawing
runtime: none
support: tests/minitest.h, tests/test_die.cpp, tests/test_die_opposite.cpp
---

A real die does not jump to a random face while it rolls. It tumbles over an edge onto a neighbouring face. In this lesson `Die` learns to tumble and to draw itself as text. You also meet unit tests, small programs that check your classes for you.

Press this lesson's support button first. It creates `tests/minitest.h` and the two test files in your project.

## More ways to build and change a Die

Words first:

- **Overloading**: several functions may share a name if their parameter lists differ. The compiler picks one by looking at the arguments.
- **`explicit`**: placed on a constructor that takes one argument, it stops the compiler from using that constructor for silent conversions. Without it, `Die d = 4;` would quietly build a `Die`. With it you must write `Die d(4);`.
- **Reference**: another name for an object that already exists. `Die&` is a reference to a `Die`. Passing one hands the function the original object, not a copy.
- **`const Die&`**: a reference through which the function promises not to modify the object. It is the usual way to pass a class object that you only want to read.

```cpp file=Die.h
#ifndef DIE_H
#define DIE_H

#include <string>

class Die {
private:
    int face;

public:
    Die();
    explicit Die(int startFace);
    void roll();
    void tumbleStep();
    int getFace() const;
    bool sameFace(const Die& other) const;
    std::string line(int r) const;
};

#endif
```

New lines:

- `#include <string>`: this header's declarations use `std::string`, so the header includes what it needs. A header should never rely on the file that includes it to have included something first.
- `explicit Die(int startFace);`: a second constructor, overloading the first. `Die d;` picks the first because there are no arguments. `Die d(4);` picks this one.
- `void tumbleStep();`: moves the die to a face next to its current face.
- `bool sameFace(const Die& other) const;`: two separate promises. The `const` in the parameter says "I will not modify `other`". The `const` after the parentheses says "I will not modify the die I am called on". The `&` means the other die is not copied.
- `std::string line(int r) const;`: returns one row of the die's picture as text. Row 0 is the top edge, rows 1 to 3 are the pips, row 4 is the bottom edge.


## Update Die.cpp

```cpp file=Die.cpp
#include <cstdlib>
#include <string>

#include "Die.h"

static const char* const pip[7][3] = {
    {"   ", "   ", "   "},
    {"   ", " o ", "   "},
    {"o  ", "   ", "  o"},
    {"o  ", " o ", "  o"},
    {"o o", "   ", "o o"},
    {"o o", " o ", "o o"},
    {"o o", "o o", "o o"},
};

static const int adjacent[4][4] = {
    {0, 0, 0, 0},
    {2, 3, 4, 5},
    {1, 3, 4, 6},
    {1, 2, 5, 6},
};

Die::Die() {
    face = std::rand() % 6 + 1;
}

Die::Die(int startFace) {
    face = (startFace >= 1 && startFace <= 6) ? startFace : 1;
}

void Die::roll() {
    face = std::rand() % 6 + 1;
}

void Die::tumbleStep() {
    int row = (face > 3) ? 7 - face : face;
    face = adjacent[row][std::rand() % 4];
}

int Die::getFace() const {
    return face;
}

bool Die::sameFace(const Die& other) const {
    return face == other.face;
}

std::string Die::line(int r) const {
    if (r == 0 || r == 4) {
        return " --- ";
    }
    return std::string("|") + pip[face][r - 1] + "|";
}
```

New lines:

- `static const char* const pip[7][3]`: read it right to left. `pip` is an array of 7 arrays of 3 items. Each item is a `const` pointer (`* const`: the pointer cannot be re-pointed) to a `const char` (the characters cannot be changed). A string literal such as `"o o"` is stored as read-only characters, and the pointer holds the address of the first one.
- `static` on a name outside any class means it is private to this `.cpp` file. No other file can see or collide with `pip`. This is called **internal linkage**.
- Row 0 of `pip` is filler. It makes `pip[face]` line up with faces 1 to 6.
- `adjacent`: on a real die opposite faces add up to 7. A face can tumble to every face except itself and its opposite, which is four faces. The pairs 1 and 6, 2 and 5, 3 and 4 share the same four neighbours, so only three rows are stored, in rows 1 to 3.
- `face = (startFace >= 1 && startFace <= 6) ? startFace : 1;`: the ternary keeps the value if it is a real face and otherwise uses 1. This is why `face` is `private`. No code outside the class can put a die into an impossible state.
- `int row = (face > 3) ? 7 - face : face;`: folds faces 4, 5, 6 onto rows 3, 2, 1.
- `face = adjacent[row][std::rand() % 4];`: picks one of the four neighbours.
- `other.face`: allowed even though `face` is private. Access control works per class, not per object, so one `Die` may read another `Die`'s private members.
- `std::string("|") + pip[face][r - 1] + "|"`: `r - 1` converts the row number (1 to 3) into a `pip` index (0 to 2). The first piece must be wrapped in `std::string(...)`. Writing `"|" + pip[...]` would try to add two raw pointers, and C++ has no `+` for that, so it would not compile. `std::string + const char*` is defined.

## Draw a tumbling die

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

#include "Die.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Die die;
    for (int step = 0; step < 6; step++) {
        for (int r = 0; r < 5; r++) {
            std::cout << die.line(r) << "\n";
        }
        std::cout << "\n";
        die.tumbleStep();
    }

    return 0;
}
```

New lines:

- The inner loop asks the die for rows 0 to 4 and prints each one. The die returns text and `main` decides what to do with it. The `Die` class never prints anything itself.
- `die.tumbleStep();` after each picture turns the die onto a neighbouring face.

```check
run "g++ -std=c++17 main.cpp Die.cpp -o game" label="the drawing program builds" -- Die.h and Die.cpp must declare and define every function main.cpp calls.
run "./game" stdout=" --- " label="the die edges are drawn" -- Row 0 and row 4 of line() return the edge text.
```

## Read the tests

A test program checks your class without any help from `main.cpp`. The support button created this file. Read it before you build it.

```cpp file=tests/test_die.cpp provided
#include "minitest.h"
#include "../Die.h"

#include <cstdlib>

TEST(Die, StartsInRange) {
    std::srand(1);
    for (int i = 0; i < 500; i++) {
        Die d;
        EXPECT_EQ(d.getFace() >= 1 && d.getFace() <= 6, true);
    }
}

TEST(Die, RollStaysInRange) {
    Die d;
    for (int i = 0; i < 500; i++) {
        d.roll();
        EXPECT_EQ(d.getFace() >= 1 && d.getFace() <= 6, true);
    }
}

TEST(Die, TumbleNeverRepeatsOrFlipsToOpposite) {
    Die d;
    for (int i = 0; i < 1000; i++) {
        int before = d.getFace();
        d.tumbleStep();
        int after = d.getFace();
        EXPECT_EQ(after != before, true);
        EXPECT_EQ(after != 7 - before, true);
        EXPECT_EQ(after >= 1 && after <= 6, true);
    }
}

TEST(Die, SameFaceComparesFaces) {
    Die a(3);
    Die b(3);
    Die c(4);
    EXPECT_EQ(a.sameFace(b), true);
    EXPECT_EQ(a.sameFace(c), false);
}

TEST(Die, DrawsEdges) {
    Die d(1);
    EXPECT_EQ(d.line(0), " --- ");
    EXPECT_EQ(d.line(4), " --- ");
}

TEST(Die, DrawsOneAndSix) {
    Die one(1);
    EXPECT_EQ(one.line(2), "| o |");
    Die six(6);
    EXPECT_EQ(six.line(1), "|o o|");
}
```

How to read it:

- `#include "minitest.h"`: a small test helper written for this series. `TEST(Group, Name)` defines one test. `EXPECT_EQ(actual, expected)` records a failure, with its line number, when the two values differ.
- `#include "../Die.h"`: the test file lives in `tests/`, and `..` means "one folder up".
- `minitest.h` also supplies `main`. A program may contain only one `main`, which is why the test program is built from the test file plus `Die.cpp`, and **not** from `main.cpp`.
- `Die a(3);`: uses the new constructor to make a die with a known face, which random dice cannot give you.

Build and run it:

```bash
g++ -std=c++17 tests/test_die.cpp Die.cpp -o test_die
./test_die
```

```predict
question: Suppose tumbleStep were written as `face = std::rand() % 6 + 1;`. Which test would fail?
choice: Die.StartsInRange
choice: Die.TumbleNeverRepeatsOrFlipsToOpposite
choice: Die.DrawsEdges
answer: Die.TumbleNeverRepeatsOrFlipsToOpposite
explain: A fully random face repeats the old face about one time in six and lands on the opposite face about one time in six, so over 1000 steps the test catches it. The other two tests never call tumbleStep.
```

```check
run "g++ -std=c++17 tests/test_die.cpp Die.cpp -o test_die" label="the Die tests build" -- The test calls every function in Die.h, so each one needs a definition in Die.cpp.
tests "./test_die" require="Die.TumbleNeverRepeatsOrFlipsToOpposite" label="the Die tests pass" -- Each failing test prints the line of the test file that failed.
```

## Your turn: opposite faces

Add `bool isOpposite(const Die& other) const` to `Die`. It returns `true` when the two dice show opposite faces, meaning faces that add up to 7. Declare it in `Die.h` and define it in `Die.cpp`. The support button already created `tests/test_die_opposite.cpp`.

```check
run "g++ -std=c++17 tests/test_die_opposite.cpp Die.cpp -o test_die_opposite" label="the opposite tests build" -- The declaration in Die.h and the definition in Die.cpp must match exactly, including both const words.
tests "./test_die_opposite" require="DieOpposite.AllPairs" label="the opposite tests pass" -- Opposite faces add up to 7. A die is not opposite to itself.
```

```hints
nudge: What is true about the two faces when they are opposite?
concept: Opposite faces add up to 7. A member function can read another object's private members when that object has the same class, as sameFace does with `other.face`.
shape: Declare the function in Die.h under public with the same two const words as sameFace. In Die.cpp return whether `face + other.face` equals 7.
answer: One way to write it:
~~~cpp
// Die.h — inside the public: section
bool isOpposite(const Die& other) const;

// Die.cpp
bool Die::isOpposite(const Die& other) const {
    return face + other.face == 7;
}
~~~
```
