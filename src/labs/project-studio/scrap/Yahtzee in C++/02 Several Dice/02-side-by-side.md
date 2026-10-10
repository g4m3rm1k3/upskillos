---
title: 2.2 — Side by Side
runtime: none
---

Each `Die` can already return one row of its picture. In this lesson `Dice` puts five dice next to each other in the terminal. The lesson also shows why `const` on member functions matters once objects are passed around.

## Draw the dice

Words first:

- **Const-correctness**: marking everything that does not change state as `const`, so the compiler can check it. A `const` object can only call `const` member functions.

Both files below contain `total()`, the function you wrote in the last lesson, in its usual form. If yours is spelled differently, keep yours.

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
    int total() const;
    void rollAll();
    void draw() const;
};

#endif
```

New line:

- `void draw() const;`: prints the dice. It does not change them, so it is `const`.


## Update Dice.cpp

```cpp file=Dice.cpp
#include <iostream>

#include "Dice.h"

Dice::Dice(std::size_t count) : dice(count) {}

std::size_t Dice::size() const {
    return dice.size();
}

int Dice::face(std::size_t i) const {
    return dice[i].getFace();
}

int Dice::total() const {
    int sum = 0;
    for (const Die& d : dice) {
        sum += d.getFace();
    }
    return sum;
}

void Dice::rollAll() {
    for (auto& d : dice) {
        d.roll();
    }
}

void Dice::draw() const {
    for (int r = 0; r < 5; r++) {
        for (const Die& d : dice) {
            std::cout << d.line(r);
        }
        std::cout << "\n";
    }
    for (std::size_t i = 0; i < dice.size(); i++) {
        std::cout << " *" << i + 1 << "* ";
    }
    std::cout << "\n";
}
```

New lines:

- `#include <iostream>`: `std::cout` is now used in this file.
- `for (int r = 0; r < 5; r++) {`: the outer loop counts the five text rows of a die: top edge, three pip rows, bottom edge.
- `for (const Die& d : dice) { std::cout << d.line(r); }`: the inner loop asks every die for row `r` and prints it with **no newline**. All the dice put their piece of row `r` on the same terminal line.
- `std::cout << "\n";`: only after every die has printed row `r` does the line end. That order, row on the outside and die on the inside, is what puts the dice next to each other.
- `const Die& d`: inside a `const` member function every member is treated as `const`. Here `dice` is a `const std::vector<Die>`, so its elements are `const Die`. A plain `Die&` would not compile.
- `d.line(r)`: allowed on a `const Die` only because `line` was declared `const` in lesson 1.3. Without that, GCC would say `passing 'const Die' as 'this' argument discards qualifiers`. **A `const` object can call only `const` functions**, so `const` spreads through every function it touches.
- `" *" << i + 1 << "* "`: `+` binds tighter than `<<`, so `i + 1` is added before it is printed. The label is five characters wide, the same as a die row, so each label sits under its die. The `+ 1` turns the 0-based position into the number a player counts from.

Analogy (helper only): think of printing a row of photos from a roll of film. You print the top strip of all five photos, then the middle strip of all five, and so on. You do not print one whole photo before starting the next.

```predict
question: You swap the two loops in draw(), so the die loop is outside and the row loop is inside, with the "\n" still after each row. What do you see?
choice: The five dice side by side, as before
choice: The dice stacked one above the other
choice: A compile error
answer: The dice stacked one above the other
explain: The first die now prints all five of its rows, one per line, before the second die starts. Each die finishes before the next begins, so they stack vertically.
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
    dice.rollAll();
    dice.draw();

    return 0;
}
```

```check
run "g++ -std=c++17 main.cpp Dice.cpp Die.cpp -o game" label="the drawing program builds" -- If the compiler mentions discards qualifiers, a function called on a const object is missing its const.
run "./game" stdout=" --- " label="the edges are drawn" -- Row 0 of every die is the top edge.
run "./game" stdout="*5*" label="five numbered labels are drawn" -- Print one label per die under the picture.
```

## Your turn: print the faces from a const reference

In `main.cpp`, above `main`, write a function `void printFaces(const Dice& dice)`. It prints `Faces: ` followed by every face with a space between them, for example `Faces: 3 1 6 6 2`, then a newline. Call it after `dice.draw();`. Use only `size()` and `face(i)`, because the parameter is `const`.

```check
run "g++ -std=c++17 main.cpp Dice.cpp Die.cpp -o game" label="the program builds" -- A const Dice can only call const member functions.
matches main.cpp "void[ ]+printFaces[ ]*[(][ ]*const[ ]+Dice[ ]*&" label="printFaces takes a const Dice reference" -- Write the parameter as const Dice& followed by a name.
contains main.cpp ".face(" label="faces are read with face()" -- Call face(i) for each position.
run "./game" stdout="Faces: " label="the faces line is printed" -- Print Faces: once, then a space and each face.
```

```hints
nudge: Why would you pass the Dice by const reference instead of by value?
concept: A copy of a Dice would copy its whole vector every call. `const Dice&` passes the original, read only. A read-only object can call only member functions marked const, and `size()` and `face()` are.
shape: Above main, write the function with a loop from 0 to `dice.size()`. Print a space and `dice.face(i)` each time, and a newline at the end. Call it from main.
answer: One way to write it:
~~~cpp
void printFaces(const Dice& dice) {
    std::cout << "Faces:";
    for (std::size_t i = 0; i < dice.size(); i++) {
        std::cout << " " << dice.face(i);
    }
    std::cout << "\n";
}

// in main, after dice.draw();
printFaces(dice);
~~~
```
