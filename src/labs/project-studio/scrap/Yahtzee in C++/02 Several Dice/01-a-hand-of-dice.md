---
title: 2.1 — A Hand of Dice
track: Several Dice
runtime: none
support: tests/test_dice.cpp, tests/test_dice_total.cpp
---

One `Die` is not a game. Yahtzee uses five, and other dice games use other counts. In this lesson a `Dice` class holds any number of `Die` objects. It knows nothing about Yahtzee, so it can be reused. Press this lesson's support button to create the two test files.

## Describe Dice

Words first:

- **`std::vector<T>`**: a standard library class that holds a resizable sequence of values of type `T`, stored side by side in memory that the vector manages for you.
- **Template**: code written once for any type. The `<Die>` in `std::vector<Die>` picks the type, and the compiler generates a version of `vector` for `Die`.
- **`std::size_t`**: the unsigned integer type the library uses for sizes and positions. It cannot be negative. It lives in `<cstddef>`.

```cpp file=Dice.h
#ifndef DICE_H
#define DICE_H

#include <cstddef>
#include <vector>

#include "Die.h"

class Dice {
private:
    std::vector<Die> dice;

public:
    explicit Dice(std::size_t count);
    std::size_t size() const;
    int face(std::size_t i) const;
    void rollAll();
};

#endif
```

New lines:

- `#include <cstddef>` and `#include <vector>`: the header uses `std::size_t` and `std::vector`, so it includes both.
- `#include "Die.h"`: the class stores `Die` objects, so the compiler must know what a `Die` is.
- `std::vector<Die> dice;`: a data member. Every `Dice` object owns one vector of dice. The member `dice` and the class `Dice` are different names, because C++ is case sensitive.
- `explicit Dice(std::size_t count);`: the constructor takes how many dice to make. `explicit` stops `Dice d = 5;` from compiling, because a bare number silently turning into a `Dice` would be confusing.
- `std::size_t size() const;`: how many dice are held. `const`, because it only reads.
- `int face(std::size_t i) const;`: the face of die number `i`, counted from 0.
- `void rollAll();`: rolls every die. It changes the dice, so it is not `const`.

## Define Dice

Words first:

- **Member initializer list**: the part between a constructor's parameter list and its body, introduced by a colon. It builds the members before the body runs.

```cpp file=Dice.cpp
#include "Dice.h"

Dice::Dice(std::size_t count) : dice(count) {}

std::size_t Dice::size() const {
    return dice.size();
}

int Dice::face(std::size_t i) const {
    return dice[i].getFace();
}

void Dice::rollAll() {
    for (auto& d : dice) {
        d.roll();
    }
}
```

New lines:

- `Dice::Dice(std::size_t count) : dice(count) {}`: after the colon, `dice(count)` builds the member `dice` directly by calling `std::vector`'s constructor that makes `count` elements. Each element is built by calling `Die::Die()`, so every die gets a random face. The body `{}` is empty because the list already did everything. Without the list, `dice` would first be built empty and then assigned in the body, which is extra work.
- `dice.size()`: asks the vector how many elements it holds.
- `dice[i]`: `operator[]` gives element `i`. It does **not** check the index. An `i` past the end is undefined behavior. `dice.at(i)` checks and throws an exception instead.
- `.getFace()`: asks that one die for its face.
- `for (auto& d : dice) {`: a **range-based for**, which visits every element. `auto` means "work out the type from the initializer", which here is `Die`. The `&` makes `d` a reference to the real element inside the vector, not a copy.

```predict
question: In rollAll, you write `for (auto d : dice)` without the &. What happens when rollAll runs?
choice: The dice in the vector get new faces
choice: The dice in the vector keep their old faces
choice: A compile error
answer: The dice in the vector keep their old faces
explain: Without the &, d is a copy of each die. roll() changes the copy, and the copy is thrown away at the end of each pass. The dice inside the vector are never touched.
```

## Use it from main

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

#include "Dice.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);

    std::cout << "Faces:";
    for (std::size_t i = 0; i < dice.size(); i++) {
        std::cout << " " << dice.face(i);
    }
    std::cout << "\n";

    dice.rollAll();

    std::cout << "Rolled:";
    for (std::size_t i = 0; i < dice.size(); i++) {
        std::cout << " " << dice.face(i);
    }
    std::cout << "\n";

    return 0;
}
```

New lines:

- `Dice dice(5);`: calls the constructor with `5`. The `int` 5 converts to `std::size_t` as an ordinary argument. `explicit` only blocks conversions **to** `Dice`.
- `std::size_t i`: the loop counter has the same type as `dice.size()`. Comparing an `int` with an unsigned type converts the `int` to unsigned, which turns a negative number into a huge one. Matching the types avoids that.

Build it:

```bash
g++ -std=c++17 main.cpp Dice.cpp Die.cpp -o game
./game
```

```check
run "g++ -std=c++17 main.cpp Dice.cpp Die.cpp -o game" label="the Dice program builds" -- List all three .cpp files in the command.
run "./game" stdout="Rolled:" label="the dice are rolled and printed" -- Compare the output with the text in main.cpp.
run "g++ -std=c++17 tests/test_dice.cpp Dice.cpp Die.cpp -o test_dice" label="the Dice tests build" -- Press the lesson's support button if tests/test_dice.cpp is missing.
tests "./test_dice" require="Dice.RollAllChangesTheDiceThemselves" label="the Dice tests pass" -- If this fails, check that rollAll changes the dice inside the vector, not copies of them.
```

## Your turn: add them up

Add `int total() const` to `Dice`. It returns the sum of all the faces. Declare it in `Dice.h` and define it in `Dice.cpp`. The test file `tests/test_dice_total.cpp` is already in your project.

```check
run "g++ -std=c++17 tests/test_dice_total.cpp Dice.cpp Die.cpp -o test_dice_total" label="the total tests build" -- The declaration and the definition must match, including the trailing const.
tests "./test_dice_total" require="DiceTotal.MatchesTheSumOfFaces" label="the total tests pass" -- Add the face of every die. An empty Dice totals 0.
```

```hints
nudge: What does the function need to visit, and what does it keep as it goes?
concept: A running total is an int that starts at 0 and has each face added inside a loop. A `const` member function may read `dice` but not change it, so its loop variable must be a `const Die&`.
shape: Declare `int total() const;` under public. In Dice.cpp start `int sum = 0;`, loop over `dice` with `const Die& d`, add `d.getFace()`, and return `sum`.
answer: One way to write it:
~~~cpp
// Dice.h — inside the public: section
int total() const;

// Dice.cpp
int Dice::total() const {
    int sum = 0;
    for (const Die& d : dice) {
        sum += d.getFace();
    }
    return sum;
}
~~~
```
