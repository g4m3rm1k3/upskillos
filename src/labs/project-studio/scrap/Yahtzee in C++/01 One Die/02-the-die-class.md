---
title: 1.2 — The Die Class
runtime: none
---

`main.cpp` is about to get crowded. In this lesson the die becomes its own type, split across two files: `Die.h` says what a die is, and `Die.cpp` says how it works. The split between those two files is one of the biggest differences between C++ and the languages you know.

## Describe a Die in a header

Words first:

- **Declaration**: states that a name exists and what its type or signature is, without giving a body.
- **Definition**: provides the body of a function, or the storage of a variable.
- **Translation unit**: one `.cpp` file after the preprocessor has pasted in everything it includes. The compiler works on one translation unit at a time.
- **Include guard**: three preprocessor lines that make a header's contents appear at most once per translation unit.
- **Class**: a type that bundles data (its **members**) with the functions that work on that data.
- **Constructor**: a member function with the class's own name and no return type. C++ runs it automatically whenever an object of the class is created.

Create `Die.h`.

```cpp file=Die.h
#ifndef DIE_H
#define DIE_H

class Die {
private:
    int face;

public:
    Die();
    int getFace() const;
};

#endif
```

Line by line:

- `#ifndef DIE_H` / `#define DIE_H` / `#endif`: the include guard. `#ifndef DIE_H` asks "is the name `DIE_H` already defined?" If not, the preprocessor continues and `#define DIE_H` defines it. If the same header is pulled in a second time, the name exists, so everything up to `#endif` is skipped. This matters because a class may be defined only once per translation unit, and two headers that both include `Die.h` would otherwise paste the class in twice. The name is arbitrary, but it must be the same on the first two lines and different from every other header's guard.
- `class Die {` ... `};`: defines a new type named `Die`. The `;` after the closing brace is required.
- `private:`: every member below this label, until the next label, can be used only by the class's own member functions. The compiler enforces this.
- `int face;`: a **data member**. Every `Die` object holds its own `int` named `face`.
- `public:`: members below this label can be used from anywhere.
- `Die();`: the constructor, declared but not defined. Its body goes in `Die.cpp`.
- `int getFace() const;`: a member function that returns an `int`. The `const` after the parentheses is a promise, checked by the compiler, that this function will not change the object it is called on. A `const` object can only call `const` member functions.

Analogy (helper only): the include guard is a sign-in sheet at a door. The first visitor signs and enters. Anyone arriving later sees the signature and walks past.

## Define the Die in a source file

Create `Die.cpp`.

```cpp file=Die.cpp
#include <cstdlib>

#include "Die.h"

Die::Die() {
    face = std::rand() % 6 + 1;
}

int Die::getFace() const {
    return face;
}
```

Line by line:

- `#include "Die.h"`: quotes mean "look in this file's own folder first". Your own headers use quotes and library headers use angle brackets. The `.cpp` includes its own header so the compiler sees the class and can check that every definition matches a declaration.
- `Die::Die() {`: `::` is the **scope resolution operator**. It means "the name on the right belongs to the thing on the left". The first `Die` is the class and the second `Die` is the constructor's name. Without `Die::` this would define an unrelated free function.
- `face = std::rand() % 6 + 1;`: sets the member. A member of type `int` is not initialized automatically, so without this line `face` would hold leftover bytes.
- `int Die::getFace() const {`: the signature must match the declaration exactly, including the trailing `const`. A mismatch is a compile error. Inside a `const` function `face` can be read but not assigned.

Analogy (helper only): a constructor is a vending machine being delivered. Nobody presses a button to stock it. That setup happens automatically the moment it is placed.

## Use it from main

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

#include "Die.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Die die;
    std::cout << "Die shows " << die.getFace() << "\n";

    return 0;
}
```

New lines:

- `Die die;`: creates one `Die` object named `die`. The constructor runs on this line and calls `std::rand()`. That is why `std::srand` sits on the line above it. Seeding afterwards would leave this first roll unseeded.
- `die.getFace()`: `.` calls a member function on this object. `getFace` is `public`, so `main` may call it. Writing `die.face` would not compile, because `face` is `private`.

## Build two files into one program

```bash
g++ -std=c++17 main.cpp Die.cpp -o game
./game
```

- Each `.cpp` file is compiled on its own into an **object file**: machine code where calls into other files are left as blank holes. The **linker** then fills each hole by finding a definition for it in some object file.
- `main.cpp` only saw `Die`'s declarations in `Die.h`, so it compiles fine on its own. The definitions in `Die.cpp` supply the code for the holes.

```predict
question: You build with `g++ -std=c++17 main.cpp -o game`, leaving out Die.cpp. What happens?
choice: A compile error saying Die was not declared
choice: A linker error saying undefined reference to Die::Die()
choice: The program runs and prints 0
answer: A linker error saying undefined reference to Die::Die()
explain: main.cpp includes Die.h, so the compiler has seen the declarations and compiles main.cpp without complaint. The call to the constructor is left as a hole. The linker looks for a definition of Die::Die() in the object files, finds none, and stops.
```

```check
file Die.h
file Die.cpp
run "g++ -std=c++17 main.cpp Die.cpp -o game" label="the two files build into one program" -- List both .cpp files in the command. A missing one gives 'undefined reference'.
run "./game" stdout="Die shows" label="the program prints the die" -- Run ./game and compare its output with the text in main.cpp.
```

## Your turn: roll the same die again

Add a public member function `void roll()` to `Die` that gives the die a new random face. Declare it in `Die.h` and define it in `Die.cpp`. Then change `main.cpp` to roll the same die ten times and print `Roll 1: N` through `Roll 10: N`, where `N` is the face.

```check
contains Die.h "roll" label="Die.h declares roll" -- Add the declaration inside the public: section of the class.
matches Die.cpp "void[ ]+Die::roll[ ]*[(][ ]*[)]" label="Die.cpp defines Die::roll" -- A function declared in the class and defined in Die.cpp needs the Die:: prefix in front of its name.
contains main.cpp ".roll(" label="main.cpp calls roll" -- Call it on the die with a dot.
run "g++ -std=c++17 main.cpp Die.cpp -o game" label="the program builds" -- Compare the signature in Die.h with the one in Die.cpp, character by character.
run "./game" stdout="Roll 1:" label="the first roll is printed" -- Print Roll, the number of the roll, a colon, then the face.
run "./game" stdout="Roll 10:" label="ten rolls are printed" -- A loop from 1 to 10 prints all ten lines.
```

```hints
nudge: Which file needs a new declaration, which needs a new definition, and which needs a loop?
concept: A member function is declared inside the class in the header and defined in the .cpp with `Die::` in front of its name. The new function does the same thing the constructor does.
shape: In Die.h add `void roll();` under public. In Die.cpp add `void Die::roll() { ... }` that assigns a new random face. In main.cpp loop from 1 to 10, call `die.roll()`, then print the roll number and `die.getFace()`.
answer: One way to write it:
~~~cpp
// Die.h — inside the public: section
void roll();

// Die.cpp
void Die::roll() {
    face = std::rand() % 6 + 1;
}

// main.cpp — replacing the single print
for (int i = 1; i <= 10; i++) {
    die.roll();
    std::cout << "Roll " << i << ": " << die.getFace() << "\n";
}
~~~
```
