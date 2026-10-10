- **Project:** a terminal Yahtzee game in C++, built with `g++` across several files and classes.
- **Learner starts from:** knows programming in general, has written some C++ before, but has forgotten its specific mechanics (headers, references, `const`, copies, the build).
- **Series folder:** `Yahtzee in C++`.

## Plan

**01 One Die**

- 1.1 First Build: compile one file, roll a die, fill an array.
- 1.2 The Die Class: `Die.h` and `Die.cpp`, constructors, the linker.
- 1.3 Tumbling and Drawing: overloading, `explicit`, `const Die&`, first unit tests.

**02 Several Dice**

- 2.1 A Hand of Dice: `Dice` wrapping `std::vector<Die>`, member initializer lists.
- 2.2 Side by Side: `const` member functions, drawing rows across dice.
- 2.3 Animation and Holding: `Terminal.h/.cpp`, `#ifdef`, `std::vector<bool>`, undefined behaviour.

**03 Counting and Scoring** (next chat)

- 3.1 Counting Faces
- 3.2 Scoring Rules
- 3.3 The Scorecard Class

**04 The Turn** (next chat)

- 4.1 Reading Input Safely
- 4.2 One Turn
- 4.3 The Whole Game

**05 Cleaner C++** (next chat)

- 5.1 Named Categories with `enum class`
- 5.2 Copies, References and Moves
- 5.3 Splitting `main`

**06 Players** (next chat)

- 6.1 The Player Class
- 6.2 Taking Turns
- 6.3 Winners and Play Again

This reply writes chapters 01 and 02, with their test files.

`Yahtzee in C++/01 One Die/01-first-build.md`

````markdown
---
title: 1.1 — First Build
track: One Die
runtime: none
---

In this series you build Yahtzee for the terminal in C++, one small piece per lesson. Every lesson ends with a program that builds and runs. You already know variables, loops and functions from other languages, so these lessons spend their words on what is specific to C++: how a program is built, how it handles memory and copies, and what each keyword promises.

This lesson builds one file that rolls a die and then rolls five. You will meet the compile step, standard library headers and the random number functions.

## Roll one die

Words first:

- **Preprocessor**: a text-processing step that runs before the compiler. It acts on every line that starts with `#`.
- **Header**: a file that lists names (functions, types) that are defined elsewhere, so your code is allowed to use them.
- **Namespace**: a named area for names. `std` is the namespace of the standard library. `std::name` means "the `name` inside `std`".
- **Pointer**: a variable that holds a memory address instead of a value.

Create `main.cpp` in your project folder and type this in.

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    int face = std::rand() % 6 + 1;
    std::cout << "You rolled a " << face << "\n";

    return 0;
}
```

Line by line:

- `#include <cstdlib>`: the preprocessor replaces this line with the whole text of the header `cstdlib`. That header declares `std::rand` and `std::srand`. Angle brackets mean "search the compiler's standard library folders". Without the include, the compiler stops with an error such as `'rand' is not a member of 'std'`.
- `#include <ctime>`: declares `std::time`, which reads the clock.
- `#include <iostream>`: declares `std::cout`, the standard output stream, which is your terminal.
- `int main() {`: the entry point. The operating system starts your program by running this function. `int` is the type of the value it hands back to the operating system.
- `std::time(nullptr)`: returns the current time as a `std::time_t`, an integer type that on most systems counts seconds since 1 January 1970. Its parameter is a pointer. `nullptr` is the pointer that holds no address. Passing it means "do not also store the result at some address, just return it".
- `static_cast<unsigned>(...)`: converts a value to `unsigned`, an integer type that cannot be negative. `std::srand` takes an `unsigned`. The cast makes the conversion visible instead of letting the compiler do it silently.
- `std::srand(...)`: sets the starting point of the random sequence. The same seed always produces the same sequence. The clock gives a different seed on every run.
- `int face = std::rand() % 6 + 1;`: `std::rand()` returns an `int` from 0 up to `RAND_MAX`. The standard guarantees `RAND_MAX` is at least 32767. `% 6` is the remainder after dividing by 6, so it gives 0 to 5. `+ 1` shifts that to 1 to 6. `%` binds tighter than `+`, so the remainder is taken first. Low faces are very slightly more likely, because 32768 does not divide evenly by 6. That is invisible in a dice game.
- `std::cout << "You rolled a " << face << "\n";`: `<<` sends the value on its right into the stream on its left and gives that same stream back. That is why several `<<` can be chained. `"\n"` is a newline. `std::endl` would also flush the output buffer, which is slower and not needed here.
- `return 0;`: status 0 tells the operating system "finished successfully".

Analogy (helper only): the seed is a starting position in one very long, fixed list of random-looking numbers. `srand` picks where to start reading and each `rand` call reads the next number. The same starting position gives the same numbers.

## Build and run it

Open a terminal in your project folder and run:

```bash
g++ -std=c++17 main.cpp -o game
./game
```

- `g++`: the GNU C++ compiler. One command runs three stages: preprocessing, compiling to machine code, and **linking**, which joins pieces of machine code into one program.
- `-std=c++17`: use the 2017 edition of the language, so everyone compiles under the same rules.
- `main.cpp`: the source file to compile.
- `-o game`: name the finished program `game` (Windows adds `.exe`).
- `./game`: run the program that is in the current folder.

```check
file main.cpp
run "g++ -std=c++17 main.cpp -o game" label="main.cpp compiles" -- Read the first error: it gives a line number and what the compiler expected.
run "./game" stdout="You rolled a" label="the program prints a roll" -- Run ./game yourself and compare its output with the text in main.cpp.
```

## Predict: no seed

Commit to an answer first.

```predict
question: You delete the `std::srand` line, rebuild, and run the program three times. What do you see?
choice: A different number each run
choice: The same number every run
choice: A compile error
answer: The same number every run
explain: Without srand the generator starts from the same default seed on every run, so it produces the same sequence. The number itself differs between compilers, but one build repeats it on every run.
```

Now try it: delete the line, rebuild, run three times, then **put the line back**.

## Five dice in an array

Words first:

- **Undefined behavior**: when a program does something the language gives no meaning to, such as reading outside an array, the standard places no requirements on the result. The program may crash, print garbage, or appear to work.

Replace the body of `main` so it fills and prints five dice.

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    const int NUM_DICE = 5;
    int dice[NUM_DICE];

    for (int i = 0; i < NUM_DICE; i++) {
        dice[i] = std::rand() % 6 + 1;
    }

    std::cout << "Dice:";
    for (int i = 0; i < NUM_DICE; i++) {
        std::cout << " " << dice[i];
    }
    std::cout << "\n";

    return 0;
}
```

New lines:

- `const int NUM_DICE = 5;`: `const` means the compiler refuses any later assignment to `NUM_DICE`. A `const int` set from a literal is also a **compile-time constant**, a value the compiler knows while compiling. A plain C++ array needs its size to be one.
- `int dice[NUM_DICE];`: five `int` values stored side by side in memory. The array is a local variable with no initializer, so the five values are leftover bytes until you assign them.
- `dice[i] = ...`: indexes run from 0 to 4. C++ does **not** check them. `dice[5]` compiles and reads memory outside the array, which is undefined behavior.
- `std::cout << " " << dice[i];`: prints a space and then one value. The first loop fills the array and the second prints it.

An array can also be given its values when it is declared:

```cpp
int a[3] = {7, 8, 9};   // a[0] is 7, a[1] is 8, a[2] is 9
int b[3] = {7};         // b[0] is 7, the rest are set to 0
```

```check
run "g++ -std=c++17 main.cpp -o game" label="the program builds"
run "./game" stdout="Dice:" label="five dice are printed" -- Print the word Dice: once, then a space and each value.
```

## Your turn: count the sixes in a fixed hand

Add to `main`, before `return 0;`. Declare a second array named `hand` that holds `3, 1, 6, 6, 2`, and print it as `Hand: 3 1 6 6 2`. Then count how many elements equal 6 and print `Sixes: 2`. The count must come from a loop, not from typing the digit yourself.

```check
run "g++ -std=c++17 main.cpp -o game" label="the program builds" -- Read the first error: it names the line.
run "./game" stdout="Hand: 3 1 6 6 2" label="the hand is printed from the array" -- Print Hand: once, then a space and each value as the loop visits it.
run "./game" stdout="Sixes: 2" label="two sixes are counted" -- Use a variable that starts at 0 and goes up by one each time an element equals 6.
lacks main.cpp "Sixes: 2" label="the count is computed, not typed" -- Print the variable that holds the count. Do not write the digit yourself.
lacks main.cpp "Hand: 3 1 6 6 2" label="the hand is printed from the array, not typed" -- Print the elements with a loop.
```

```hints
nudge: Who decides how many sixes there are: you, or a loop?
concept: A counter is an int that starts at 0 and is increased inside a loop when a condition holds. An array gets its values at declaration with braces: `int hand[NUM_DICE] = {3, 1, 6, 6, 2};`.
shape: Declare `hand` with its five values and `sixes` set to 0. In one loop over `hand`, print each element and add 1 to `sixes` when the element is 6. Print the count after the loop.
answer: One way to write it:
~~~cpp
int hand[NUM_DICE] = {3, 1, 6, 6, 2};
int sixes = 0;

std::cout << "Hand:";
for (int i = 0; i < NUM_DICE; i++) {
    std::cout << " " << hand[i];
    if (hand[i] == 6) {
        sixes++;
    }
}
std::cout << "\nSixes: " << sixes << "\n";
~~~
```
````

`Yahtzee in C++/01 One Die/02-the-die-class.md`

````markdown
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
````

`Yahtzee in C++/01 One Die/03-tumbling-and-drawing.md`

````markdown
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
````

`Yahtzee in C++/01 One Die/support/tests/minitest.h`

```cpp
#ifndef MINITEST_H
#define MINITEST_H

// A tiny test helper for this series.
//   TEST(Group, Name) { ... }   defines one test
//   EXPECT_EQ(actual, expected) records a failure when the two differ
// It also supplies main(), so include it in exactly one .cpp file per test program.

#include <iostream>
#include <string>
#include <vector>

namespace minitest {

struct Case {
    std::string group;
    std::string name;
    void (*run)();
};

inline std::vector<Case>& registry() {
    static std::vector<Case> cases;
    return cases;
}

inline int& failuresInCurrentTest() {
    static int count = 0;
    return count;
}

struct Registrar {
    Registrar(const char* group, const char* name, void (*run)()) {
        registry().push_back({group, name, run});
    }
};

}  // namespace minitest

#define TEST(Group, Name)                                                  \
    static void Group##_##Name##_body();                                   \
    static minitest::Registrar Group##_##Name##_registrar(                 \
        #Group, #Name, Group##_##Name##_body);                             \
    static void Group##_##Name##_body()

#define EXPECT_EQ(actual, expected)                                        \
    do {                                                                   \
        auto minitest_a = (actual);                                        \
        auto minitest_e = (expected);                                      \
        if (!(minitest_a == minitest_e)) {                                 \
            ++minitest::failuresInCurrentTest();                           \
            std::cout << "  " << __FILE__ << ":" << __LINE__               \
                      << ": expected " << #actual << " to equal "          \
                      << minitest_e << " but it was " << minitest_a        \
                      << "\n";                                             \
        }                                                                  \
    } while (0)

int main() {
    auto& cases = minitest::registry();
    std::cout << "[==========] Running " << cases.size() << " tests.\n";

    int failedTests = 0;
    for (const auto& c : cases) {
        std::string fullName = c.group + "." + c.name;
        std::cout << "[ RUN      ] " << fullName << "\n";
        minitest::failuresInCurrentTest() = 0;
        c.run();
        if (minitest::failuresInCurrentTest() == 0) {
            std::cout << "[       OK ] " << fullName << "\n";
        } else {
            std::cout << "[  FAILED  ] " << fullName << "\n";
            ++failedTests;
        }
    }

    std::cout << "[==========] " << cases.size() << " tests ran.\n";
    if (failedTests == 0) {
        std::cout << "[  PASSED  ] " << cases.size() << " tests.\n";
        return 0;
    }
    std::cout << "[  FAILED  ] " << failedTests << " tests.\n";
    return 1;
}

#endif
```

`Yahtzee in C++/01 One Die/support/tests/test_die.cpp`

```cpp
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

`Yahtzee in C++/01 One Die/support/tests/test_die_opposite.cpp`

```cpp
#include "minitest.h"
#include "../Die.h"

TEST(DieOpposite, OnePairsWithSix) {
    Die one(1);
    Die six(6);
    EXPECT_EQ(one.isOpposite(six), true);
    EXPECT_EQ(six.isOpposite(one), true);
}

TEST(DieOpposite, ADieIsNotOppositeItself) {
    Die three(3);
    Die alsoThree(3);
    EXPECT_EQ(three.isOpposite(alsoThree), false);
}

TEST(DieOpposite, NeighboursAreNotOpposite) {
    Die two(2);
    Die three(3);
    EXPECT_EQ(two.isOpposite(three), false);
}

TEST(DieOpposite, AllPairs) {
    for (int f = 1; f <= 6; f++) {
        Die a(f);
        Die b(7 - f);
        EXPECT_EQ(a.isOpposite(b), true);
    }
}
```

`Yahtzee in C++/02 Several Dice/01-a-hand-of-dice.md`

````markdown
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
````

`Yahtzee in C++/02 Several Dice/02-side-by-side.md`

````markdown
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
````

`Yahtzee in C++/02 Several Dice/03-animation-and-holding.md`

````markdown
---
title: 2.3 — Animation and Holding
runtime: none
support: tests/test_dice_animate.cpp, tests/test_animate_result.cpp
---

In Yahtzee a player keeps some dice and rolls the rest. In this lesson `Dice` animates a roll in which only the dice you do not hold tumble, and slows down as it finishes. The operating-system code lives in its own small file, so no other file needs to know about Windows. Press the support button to create the two test files.

## Isolate the operating system

Words first:

- **Macro**: a name the preprocessor replaces with other text, or tests for. `_WIN32` is a macro the compiler defines when it builds for Windows.
- **Conditional compilation**: `#ifdef NAME` keeps the lines up to `#else` only when the macro `NAME` exists, and `#else` keeps its lines only when it does not. The compiler never sees the removed lines.

```cpp file=Terminal.h
#ifndef TERMINAL_H
#define TERMINAL_H

void clearScreen();
void sleepMs(int ms);

#endif
```

New lines:

- Two free functions, declared only. The rest of the program calls them and never mentions Windows.

```cpp file=Terminal.cpp
#include <cstdlib>

#ifdef _WIN32
#include <windows.h>
#else
#include <chrono>
#include <thread>
#endif

#include "Terminal.h"

void clearScreen() {
#ifdef _WIN32
    std::system("cls");
#else
    std::system("clear");
#endif
}

void sleepMs(int ms) {
#ifdef _WIN32
    Sleep(static_cast<DWORD>(ms));
#else
    std::this_thread::sleep_for(std::chrono::milliseconds(ms));
#endif
}
```

New lines:

- `#ifdef _WIN32 ... #else ... #endif`: on Windows the compiler sees only the `windows.h` lines, and elsewhere only the `chrono` and `thread` lines. `Sleep` is never seen on other systems, and `std::this_thread` is never seen on Windows.
- `std::system("cls")`: hands the text to the operating system's command interpreter, which clears the terminal. The command is `cls` on Windows and `clear` elsewhere.
- `Sleep(...)`: a Windows function that pauses for a number of milliseconds. It takes a `DWORD`, a Windows type for an unsigned 32-bit integer, hence the `static_cast`.
- `std::this_thread::sleep_for(std::chrono::milliseconds(ms))`: the standard C++ way to pause the current thread. `std::chrono::milliseconds(ms)` is a value that carries its unit, so you cannot mix up milliseconds and seconds.

## Animate with a hold list

Words first:

- **`std::vector<bool>`**: a vector of true/false values. The library gives this one type a special implementation that packs each value into a single bit. As a result `v[i]` returns a small proxy object, not a real `bool&`. Reading and assigning with `[i]` works normally, but `for (auto& b : v)` does not compile.

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
    void animate(const std::vector<bool>& hold);
};

#endif
```

New line:

- `void animate(const std::vector<bool>& hold);`: `hold[i]` being `true` means die `i` stays still. The parameter is a reference, so the list is not copied, and `const`, so `animate` cannot change it. `animate` is not `const` itself, because it changes the dice.

```cpp file=Dice.cpp
#include <iostream>

#include "Dice.h"
#include "Terminal.h"

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

void Dice::animate(const std::vector<bool>& hold) {
    bool anyFree = false;
    for (std::size_t i = 0; i < dice.size(); i++) {
        if (!hold[i]) {
            anyFree = true;
        }
    }
    if (!anyFree) {
        return;
    }

    for (int frame = 0; frame < 15; frame++) {
        for (std::size_t i = 0; i < dice.size(); i++) {
            if (!hold[i]) {
                dice[i].tumbleStep();
            }
        }
        clearScreen();
        draw();
        sleepMs(50 + frame * 15);
    }
}
```

New lines:

- `#include "Terminal.h"`: `clearScreen` and `sleepMs` are used here.
- `bool anyFree = false;` and the loop below it: checks whether at least one die is free to move. `!hold[i]` reads "die `i` is not held".
- `if (!anyFree) { return; }`: if every die is held there is nothing to animate. The function stops at once, with no flash and no wait.
- `for (int frame = 0; frame < 15; frame++) {`: the animation has 15 frames.
- `dice[i].tumbleStep();`: each free die turns once per frame. Held dice are skipped, so they keep their face.
- `clearScreen(); draw();`: wipes the terminal and draws the current faces. `draw()` is a call to another member function on the same object.
- `sleepMs(50 + frame * 15);`: the pause grows as `frame` grows, from 50 ms on the first frame to 260 ms on the last. The long pauses at the end make the roll slow down, like a real die coming to rest. The whole animation takes about 2.3 seconds.
- `hold[i]` is **not** checked against the list's size. If `hold` is shorter than `dice`, that read is undefined behavior.

Analogy (helper only): the growing pause is a ball rolling to a stop. Early frames change quickly and later ones wait longer, until it settles.

```predict
question: Your Dice holds 5 dice but you pass animate a hold list with only 3 entries. What happens?
choice: A compile error
choice: An exception with a clear error message
choice: Undefined behavior: it may crash, give odd results, or appear to work
answer: Undefined behavior: it may crash, give odd results, or appear to work
explain: operator[] does not check the index. Reading hold[3] reads memory beyond the list, and the language gives that no defined meaning. Compilers do not catch it either, which is why callers must pass matching sizes.
```

## Use it from main

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <vector>

#include "Dice.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    std::vector<bool> hold(5, false);

    dice.animate(hold);

    hold[0] = true;
    hold[2] = true;
    hold[4] = true;
    dice.animate(hold);

    return 0;
}
```

New lines:

- `std::vector<bool> hold(5, false);`: this constructor makes 5 elements, each set to `false`, so nothing is held yet.
- `hold[0] = true;`: assigns through the proxy. Dice 1, 3 and 5 (positions 0, 2, 4) are held for the second animation.

Build everything, including the new file:

```bash
g++ -std=c++17 main.cpp Dice.cpp Die.cpp Terminal.cpp -o game
./game
```

```check
run "g++ -std=c++17 main.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the animation program builds" -- List all four .cpp files in the command.
run "g++ -std=c++17 tests/test_dice_animate.cpp Dice.cpp Die.cpp Terminal.cpp -o test_dice_animate" label="the animation tests build" -- The test needs Terminal.cpp too, because Dice.cpp calls it.
tests "./test_dice_animate" require="DiceAnimate.HeldDiceNeverChange" label="held dice stay still" -- A held die must not call tumbleStep.
```

## Your turn: report whether anything moved

Change `animate` so it returns `bool`. It returns `true` when it ran the animation and `false` when every die was held and it returned early. Change the declaration in `Dice.h` and the definition in `Dice.cpp`. The test `tests/test_animate_result.cpp` is already in your project.

```check
run "g++ -std=c++17 tests/test_animate_result.cpp Dice.cpp Die.cpp Terminal.cpp -o test_animate_result" label="the result tests build" -- The return type must change in both Dice.h and Dice.cpp.
tests "./test_animate_result" require="AnimateResult.ReturnsFalseWhenEverythingIsHeld" label="animate reports whether it ran" -- Return false at the early return and true after the frames.
```

```hints
nudge: Where does animate stop early, and where does it finish normally?
concept: A declaration and its definition must agree on the return type. A function whose return type is bool must return a value on every path.
shape: Change `void` to `bool` in both files. Make the early return give back false and add a return of true after the frame loop.
answer: One way to write it:
~~~cpp
// Dice.h
bool animate(const std::vector<bool>& hold);

// Dice.cpp
bool Dice::animate(const std::vector<bool>& hold) {
    // ... anyFree check unchanged ...
    if (!anyFree) {
        return false;
    }

    for (int frame = 0; frame < 15; frame++) {
        // ... unchanged ...
    }
    return true;
}
~~~
```
````

`Yahtzee in C++/02 Several Dice/support/tests/test_dice.cpp`

```cpp
#include "minitest.h"
#include "../Dice.h"

#include <cstdlib>

TEST(Dice, HoldsRequestedCount) {
    Dice three(3);
    Dice five(5);
    EXPECT_EQ(three.size(), 3u);
    EXPECT_EQ(five.size(), 5u);
}

TEST(Dice, FacesStartInRange) {
    std::srand(7);
    Dice d(5);
    for (std::size_t i = 0; i < d.size(); i++) {
        EXPECT_EQ(d.face(i) >= 1 && d.face(i) <= 6, true);
    }
}

TEST(Dice, RollAllChangesTheDiceThemselves) {
    // With 60 dice, a real roll changes most of them. A roll that only
    // changes copies would change none.
    std::srand(3);
    Dice d(60);
    int before[60];
    for (std::size_t i = 0; i < d.size(); i++) {
        before[i] = d.face(i);
    }
    d.rollAll();
    int changed = 0;
    for (std::size_t i = 0; i < d.size(); i++) {
        if (d.face(i) != before[i]) {
            changed++;
        }
        EXPECT_EQ(d.face(i) >= 1 && d.face(i) <= 6, true);
    }
    EXPECT_EQ(changed > 0, true);
}
```

`Yahtzee in C++/02 Several Dice/support/tests/test_dice_total.cpp`

```cpp
#include "minitest.h"
#include "../Dice.h"

#include <cstdlib>

TEST(DiceTotal, MatchesTheSumOfFaces) {
    std::srand(11);
    Dice d(5);
    for (int round = 0; round < 50; round++) {
        d.rollAll();
        int expected = 0;
        for (std::size_t i = 0; i < d.size(); i++) {
            expected += d.face(i);
        }
        EXPECT_EQ(d.total(), expected);
    }
}

TEST(DiceTotal, WorksForOneDie) {
    Dice one(1);
    EXPECT_EQ(one.total(), one.face(0));
}

TEST(DiceTotal, NoDiceTotalZero) {
    Dice none(0);
    EXPECT_EQ(none.total(), 0);
}
```

`Yahtzee in C++/02 Several Dice/support/tests/test_dice_animate.cpp`

```cpp
#include "minitest.h"
#include "../Dice.h"

#include <cstdlib>
#include <vector>

TEST(DiceAnimate, HeldDiceNeverChange) {
    std::srand(21);
    Dice d(5);
    std::vector<bool> hold(5, false);
    hold[0] = true;
    hold[2] = true;
    hold[4] = true;

    int before0 = d.face(0);
    int before2 = d.face(2);
    int before4 = d.face(4);

    d.animate(hold);

    EXPECT_EQ(d.face(0), before0);
    EXPECT_EQ(d.face(2), before2);
    EXPECT_EQ(d.face(4), before4);
}

TEST(DiceAnimate, EverythingHeldReturnsImmediately) {
    Dice d(5);
    std::vector<bool> hold(5, true);
    int before[5];
    for (int i = 0; i < 5; i++) {
        before[i] = d.face(i);
    }
    d.animate(hold);
    for (int i = 0; i < 5; i++) {
        EXPECT_EQ(d.face(i), before[i]);
    }
}
```

`Yahtzee in C++/02 Several Dice/support/tests/test_animate_result.cpp`

```cpp
#include "minitest.h"
#include "../Dice.h"

#include <vector>

TEST(AnimateResult, ReturnsFalseWhenEverythingIsHeld) {
    Dice d(5);
    std::vector<bool> hold(5, true);
    EXPECT_EQ(d.animate(hold), false);
}

TEST(AnimateResult, ReturnsTrueWhenSomethingMoves) {
    Dice d(5);
    std::vector<bool> hold(5, false);
    EXPECT_EQ(d.animate(hold), true);
}
```

I'm checking the last pieces (the game's `main` and its command-line options) before I write up chapters 03 and 04.Chapters 03 and 04 are below. I compiled them together with chapters 01–02 using g++ 13 on Linux. Every test program passes, and I ran the finished game with `--fast`, `--rolls` and closed input. I could not run the Windows branch of `Terminal.cpp`.

`Yahtzee in C++/03 Counting and Scoring/01-counting-faces.md`

````markdown
---
title: 3.1 — Counting Faces
track: Counting and Scoring
runtime: none
support: tests/test_counting.cpp, tests/test_highest_count.cpp
---

Almost every Yahtzee category starts with the same question: how many dice show each face? Three of a kind asks whether any face appears three times. A full house asks for one face that appears three times and another that appears twice. In this lesson you build one table of counts that every scoring rule will read. You also meet `std::array`, the fixed-size container that replaces C's raw arrays.

Press this lesson's support button first. It creates two test files in `tests/`.

## Describe the table

Words first:

- **`std::array<T, N>`**: a standard library type that holds exactly `N` values of type `T`, stored side by side. The size is part of the type, so `std::array<int, 7>` and `std::array<int, 6>` are different types.
- **Type alias**: a second name for a type that already exists. `using Counts = std::array<int, 7>;` makes `Counts` mean exactly that type. No new type is created.
- **Overloading**: two functions may share a name if their parameter types differ. You met this in lesson 1.3.

Create `Scoring.h`.

```cpp file=Scoring.h
#ifndef SCORING_H
#define SCORING_H

#include <array>
#include <vector>

#include "Dice.h"

using Counts = std::array<int, 7>;

Counts countFaces(const std::vector<int>& faces);
Counts countFaces(const Dice& dice);
int sumFromCounts(const Counts& counts);

#endif
```

Line by line:

- `#ifndef SCORING_H` / `#define SCORING_H` / `#endif`: the include guard from lesson 1.2, with a name that no other header uses.
- `#include <array>`: declares `std::array`. `#include <vector>` declares `std::vector`, which one of the functions below uses. `#include "Dice.h"` is there because the second `countFaces` takes a `Dice`.
- `using Counts = std::array<int, 7>;`: `Counts` is seven `int` values. Slot 0 is never used. Slots 1 to 6 are the faces, so `counts[3]` is the number of dice showing a 3. That is why there are seven slots and not six.
- Unlike a raw array (`int a[7]`), a `std::array` can be copied with `=`, passed to a function by value, and returned from a function. It also knows its own size (`counts.size()` is 7).
- `Counts countFaces(const std::vector<int>& faces);`: reads a list of face values and returns the table. This version exists so the code can be tested with chosen faces. A `Dice` rolls at random, so a test could never know which faces it holds.
- `Counts countFaces(const Dice& dice);`: the same name with a different parameter type. The compiler chooses between the two by looking at the argument. A `Dice` can never be mistaken for a `std::vector<int>`, and `Dice`'s constructor is `explicit`, so a bare number cannot silently turn into a `Dice` either.
- `const std::vector<int>&` and `const Dice&`: references that cannot be used to change the object. Nothing is copied, and the function promises to only read.
- `int sumFromCounts(const Counts& counts);`: adds up the value of all the dice, using only the table. Scoring rules will need the total often.

## Fill the table

Words first:

- **Value initialization**: writing `{}` after a variable's name, as in `Counts counts{};`, sets every number inside it to 0.
- **Copy elision**: the compiler may build a returned object directly in the caller's variable, so nothing is copied at all.

Create `Scoring.cpp`.

```cpp file=Scoring.cpp
#include "Scoring.h"

Counts countFaces(const std::vector<int>& faces) {
    Counts counts{};
    for (int face : faces) {
        if (face >= 1 && face <= 6) {
            counts[face]++;
        }
    }
    return counts;
}

Counts countFaces(const Dice& dice) {
    std::vector<int> faces;
    for (std::size_t i = 0; i < dice.size(); i++) {
        faces.push_back(dice.face(i));
    }
    return countFaces(faces);
}

int sumFromCounts(const Counts& counts) {
    int total = 0;
    for (int face = 1; face <= 6; face++) {
        total += face * counts[face];
    }
    return total;
}
```

Line by line:

- `Counts countFaces(const std::vector<int>& faces) {`: the signature matches the header exactly.
- `Counts counts{};`: a local variable. A local `std::array<int, 7>` with no initializer holds leftover bytes, the same rule as a local `int dice[5]`. The empty braces set all seven numbers to 0, so the loop below starts counting from zero.
- `for (int face : faces) {`: a range-based for. `int face` is a copy of each element. That is fine for an `int`, which is tiny. For a large type you would write `const auto&` to avoid copies.
- `if (face >= 1 && face <= 6) {`: a guard. `counts[face]` on a `std::array` is **not** bounds-checked. A face of 9 would write outside the array, which is undefined behavior. Faces outside 1 to 6 are skipped instead.
- `counts[face]++;`: adds 1 to that slot.
- `return counts;`: returns the table by value. In practice the compiler builds it directly in the caller's variable. Even if it were copied, seven `int`s are cheap.
- `std::vector<int> faces;`: an empty list. `faces.push_back(...)` adds one value to its end, and the vector grows as needed.
- `dice.size()` and `dice.face(i)`: the public functions of `Dice`. The class keeps its dice private, so these are the only way to read them.
- `return countFaces(faces);`: `faces` is a `std::vector<int>`, so the first overload runs. The Dice version does no counting of its own.
- `total += face * counts[face];`: a face value times how many dice show it. Faces 2, 2, 6, 6, 6 give `2*2 + 6*3 = 22`.

```predict
question: You change `Counts counts{};` to `Counts counts;` and rebuild. Which statement is true?
choice: counts always starts at 0 anyway
choice: The compiler refuses to build it
choice: The starting values are not defined, so the program may work or print nonsense
answer: The starting values are not defined, so the program may work or print nonsense
explain: Only global and static variables are zeroed automatically. A local std::array of ints holds whatever was in that memory before, and the language says nothing about it. The compiler does not refuse, which is why the empty braces matter.
```

## Print the table

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

#include "Dice.h"
#include "Scoring.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    dice.draw();

    Counts counts = countFaces(dice);
    for (int face = 1; face <= 6; face++) {
        std::cout << "Face " << face << ": " << counts[face] << "\n";
    }
    std::cout << "Total: " << sumFromCounts(counts) << "\n";

    return 0;
}
```

New lines:

- `Counts counts = countFaces(dice);`: `dice` is a `Dice`, so the second overload runs. The returned table goes into `counts`.
- `counts[face]`: the number of dice showing that face. The loop starts at 1 because slot 0 is unused.
- `sumFromCounts(counts)`: the total of the five dice.

Build and run it. The command now lists five `.cpp` files:

```bash
g++ -std=c++17 main.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game
./game
```

```check
file Scoring.h
file Scoring.cpp
run "g++ -std=c++17 main.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the counting program builds" -- List all five .cpp files in the command.
run "./game" stdout="Face 6:" label="a count is printed for every face" -- Loop from 1 to 6 and print the count of each face.
run "./game" stdout="Total:" label="the total is printed" -- Print sumFromCounts(counts) after the loop.
```

## Read the tests

The support button created `tests/test_counting.cpp`. One test shows the idea:

```cpp
TEST(Counting, CountsEachFace) {
    Counts c = countFaces(std::vector<int>{3, 3, 5, 6, 1});
    EXPECT_EQ(c[1], 1);
    EXPECT_EQ(c[3], 2);
    EXPECT_EQ(c[6], 1);
}
```

- `std::vector<int>{3, 3, 5, 6, 1}`: builds a list of five chosen faces. The braces list the values. This calls the first overload and needs no dice at all.
- Because the faces are chosen, the expected counts are known. A test with random dice could not say what the answer should be.
- Other tests check that slot 0 stays 0 and that impossible faces such as 0, 7 or -2 are ignored.

The test program links `Dice.cpp`, `Die.cpp` and `Terminal.cpp` too, because `Scoring.cpp` calls into `Dice`.

```bash
g++ -std=c++17 tests/test_counting.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_counting
./test_counting
```

```check
run "g++ -std=c++17 tests/test_counting.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_counting" label="the counting tests build" -- Press the lesson's support button if tests/test_counting.cpp is missing.
tests "./test_counting" require="Counting.IgnoresImpossibleFaces" label="the counting tests pass" -- A face outside 1 to 6 must never touch the table.
```

## Your turn: the biggest count

Add `int highestFaceCount(const Counts& counts)` to the project. It returns the largest number in slots 1 to 6, which is how many dice show the most common face. Declare it in `Scoring.h` and define it in `Scoring.cpp`. Slot 0 must be ignored. The test file `tests/test_highest_count.cpp` is already in your project. The next lesson uses this function.

```check
matches Scoring.h "int[ ]+highestFaceCount[ ]*[(][ ]*const[ ]+Counts[ ]*&" label="Scoring.h declares highestFaceCount" -- Take a const Counts& and return an int.
run "g++ -std=c++17 tests/test_highest_count.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_highest_count" label="the highest-count tests build" -- The declaration and the definition must match exactly.
tests "./test_highest_count" require="Highest.SlotZeroIsIgnored" label="the highest-count tests pass" -- Start the loop at face 1. Slot 0 is never a face.
```

```hints
nudge: What do you need to remember while you look at all six counts one after another?
concept: A "largest so far" variable starts at 0 and is replaced whenever a count is bigger than it. The counts you care about are in slots 1 to 6.
shape: Declare the function in Scoring.h. In Scoring.cpp start `int highest = 0;`, loop `face` from 1 to 6, and update `highest` when `counts[face]` is larger. Return it.
answer: One way to write it:
~~~cpp
// Scoring.h
int highestFaceCount(const Counts& counts);

// Scoring.cpp
int highestFaceCount(const Counts& counts) {
    int highest = 0;
    for (int face = 1; face <= 6; face++) {
        if (counts[face] > highest) {
            highest = counts[face];
        }
    }
    return highest;
}
~~~
```
````

`Yahtzee in C++/03 Counting and Scoring/02-scoring-rules.md`

````markdown
---
title: 3.2 — Scoring Rules
runtime: none
support: tests/test_scoring.cpp, tests/test_two_pairs.cpp
---

With the table of counts in hand, each Yahtzee category becomes a small function: counts in, points out. None of them read the keyboard or print anything. In this lesson you write all of them and test them against hands you choose.

Press this lesson's support button first. It creates two test files.

## Say what the rules are

Words first:

- **`constexpr`**: marks a value the compiler works out while compiling. It is a stronger form of `const`.
- **Pure function**: a function whose result depends only on its arguments, and which changes nothing and prints nothing. Pure functions are the easiest kind to test.

Replace `Scoring.h` with this. It adds the point values and the rule functions to what you already wrote. The `highestFaceCount` line is the function you wrote in the last lesson.

```cpp file=Scoring.h
#ifndef SCORING_H
#define SCORING_H

#include <array>
#include <vector>

#include "Dice.h"

using Counts = std::array<int, 7>;

constexpr int FULL_HOUSE_POINTS = 25;
constexpr int SMALL_STRAIGHT_POINTS = 30;
constexpr int LARGE_STRAIGHT_POINTS = 40;
constexpr int YAHTZEE_POINTS = 50;

Counts countFaces(const std::vector<int>& faces);
Counts countFaces(const Dice& dice);
int sumFromCounts(const Counts& counts);
int highestFaceCount(const Counts& counts);

int scoreUpper(const Counts& counts, int face);
int scoreOfAKind(const Counts& counts, int needed);
int scoreFullHouse(const Counts& counts);
int scoreSmallStraight(const Counts& counts);
int scoreLargeStraight(const Counts& counts);
int scoreYahtzee(const Counts& counts);
int scoreChance(const Counts& counts);

#endif
```

New lines:

- `constexpr int FULL_HOUSE_POINTS = 25;`: a named constant. A name in the rule code says what the number means, and the value lives in one place. `constexpr` implies `const`.
- A `const` or `constexpr` variable at file level has **internal linkage**. Every `.cpp` file that includes this header gets its own private copy. That is safe for constants. A plain non-const variable defined in a header would be defined once per file and cause a "multiple definition" linker error.
- Each `score...` function takes `const Counts&` and returns the points as an `int`. `scoreUpper` also takes which face to score. `scoreOfAKind` also takes how many matching dice are needed.

## The simple rules

Replace `Scoring.cpp` with this version. It keeps your counting code and adds the rules that need no new technique. The full house and the straights come in the next step.

```cpp file=Scoring.cpp
#include "Scoring.h"

Counts countFaces(const std::vector<int>& faces) {
    Counts counts{};
    for (int face : faces) {
        if (face >= 1 && face <= 6) {
            counts[face]++;
        }
    }
    return counts;
}

Counts countFaces(const Dice& dice) {
    std::vector<int> faces;
    for (std::size_t i = 0; i < dice.size(); i++) {
        faces.push_back(dice.face(i));
    }
    return countFaces(faces);
}

int sumFromCounts(const Counts& counts) {
    int total = 0;
    for (int face = 1; face <= 6; face++) {
        total += face * counts[face];
    }
    return total;
}

int highestFaceCount(const Counts& counts) {
    int highest = 0;
    for (int face = 1; face <= 6; face++) {
        if (counts[face] > highest) {
            highest = counts[face];
        }
    }
    return highest;
}

int scoreUpper(const Counts& counts, int face) {
    if (face < 1 || face > 6) {
        return 0;
    }
    return counts[face] * face;
}

int scoreOfAKind(const Counts& counts, int needed) {
    if (highestFaceCount(counts) >= needed) {
        return sumFromCounts(counts);
    }
    return 0;
}

int scoreYahtzee(const Counts& counts) {
    return highestFaceCount(counts) == 5 ? YAHTZEE_POINTS : 0;
}

int scoreChance(const Counts& counts) {
    return sumFromCounts(counts);
}
```

New lines:

- `scoreUpper`: the "Ones" to "Sixes" rule. It returns how many dice show `face`, times `face`. The first `if` rejects a face that does not exist before `counts[face]` is read. That matters because `[]` does not check its index. `||` stops at the first true part.
- `scoreOfAKind`: if the most common face appears at least `needed` times, the score is the total of all five dice. Otherwise it is 0. It reuses `highestFaceCount` and `sumFromCounts` instead of repeating a loop.
- `scoreYahtzee`: `condition ? a : b` is the ternary operator. It is an expression that produces `a` when the condition is true and `b` when it is false, so it can sit directly after `return`.
- `scoreChance`: no condition, just the total.

If your own `highestFaceCount` passed its tests, keep yours. The version above is shown so that this file is complete.

```check
run "g++ -std=c++17 main.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the program still builds" -- main.cpp is unchanged from the last lesson. Check the new lines for typos.
```

## Full house and the straights

Words first:

- **Static function**: a function marked `static` outside a class is visible only inside its own `.cpp` file. Use it for helpers that nobody else should call.

Replace `Scoring.cpp` again. The new parts sit between `scoreOfAKind` and `scoreYahtzee`.

```cpp file=Scoring.cpp
#include "Scoring.h"

Counts countFaces(const std::vector<int>& faces) {
    Counts counts{};
    for (int face : faces) {
        if (face >= 1 && face <= 6) {
            counts[face]++;
        }
    }
    return counts;
}

Counts countFaces(const Dice& dice) {
    std::vector<int> faces;
    for (std::size_t i = 0; i < dice.size(); i++) {
        faces.push_back(dice.face(i));
    }
    return countFaces(faces);
}

int sumFromCounts(const Counts& counts) {
    int total = 0;
    for (int face = 1; face <= 6; face++) {
        total += face * counts[face];
    }
    return total;
}

int highestFaceCount(const Counts& counts) {
    int highest = 0;
    for (int face = 1; face <= 6; face++) {
        if (counts[face] > highest) {
            highest = counts[face];
        }
    }
    return highest;
}

int scoreUpper(const Counts& counts, int face) {
    if (face < 1 || face > 6) {
        return 0;
    }
    return counts[face] * face;
}

int scoreOfAKind(const Counts& counts, int needed) {
    if (highestFaceCount(counts) >= needed) {
        return sumFromCounts(counts);
    }
    return 0;
}

int scoreFullHouse(const Counts& counts) {
    bool hasThree = false;
    bool hasTwo = false;
    for (int face = 1; face <= 6; face++) {
        if (counts[face] == 3) {
            hasThree = true;
        }
        if (counts[face] == 2) {
            hasTwo = true;
        }
    }
    return (hasThree && hasTwo) ? FULL_HOUSE_POINTS : 0;
}

static bool hasRun(const Counts& counts, int start, int length) {
    if (start < 1 || start + length - 1 > 6) {
        return false;
    }
    for (int face = start; face < start + length; face++) {
        if (counts[face] == 0) {
            return false;
        }
    }
    return true;
}

int scoreSmallStraight(const Counts& counts) {
    for (int start = 1; start <= 3; start++) {
        if (hasRun(counts, start, 4)) {
            return SMALL_STRAIGHT_POINTS;
        }
    }
    return 0;
}

int scoreLargeStraight(const Counts& counts) {
    for (int start = 1; start <= 2; start++) {
        if (hasRun(counts, start, 5)) {
            return LARGE_STRAIGHT_POINTS;
        }
    }
    return 0;
}

int scoreYahtzee(const Counts& counts) {
    return highestFaceCount(counts) == 5 ? YAHTZEE_POINTS : 0;
}

int scoreChance(const Counts& counts) {
    return sumFromCounts(counts);
}
```

New lines:

- `scoreFullHouse`: two flags start false. One loop over the faces sets `hasThree` when some face appears exactly 3 times and `hasTwo` when some face appears exactly 2 times. A five-of-a-kind hand sets neither, so it scores 0. This game does not count it as a full house.
- `static bool hasRun(...)`: asks "do `length` faces in a row, starting at `start`, all appear at least once?" `static` keeps it private to this file, and it is not declared in `Scoring.h`.
- `if (start < 1 || start + length - 1 > 6) { return false; }`: a run that starts below 1 or ends above 6 cannot exist. This guard also keeps the loop from reading beyond `counts[6]`.
- `for (int face = start; face < start + length; face++)`: visits exactly `length` faces. A `counts[face]` of 0 means that face is missing, so the whole run fails at once.
- `scoreSmallStraight`: tries the three windows 1-4, 2-5 and 3-6. The first run found returns 30 right away, so `return` inside a loop ends the whole function.
- `scoreLargeStraight`: the same idea with a length of 5. It has two windows, 1-5 and 2-6.

```predict
question: The hand is 1, 2, 3, 4, 5. What does scoreSmallStraight return for it?
choice: 0
choice: 30
choice: 40
answer: 30
explain: The window 1-4 is present, so the loop returns 30 on its first pass. Each category is scored on its own. A large straight also contains a small one, and the player decides which box to use.
```

## Print every rule

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

#include "Dice.h"
#include "Scoring.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    dice.draw();
    Counts counts = countFaces(dice);

    std::cout << "Ones: " << scoreUpper(counts, 1) << "\n";
    std::cout << "Sixes: " << scoreUpper(counts, 6) << "\n";
    std::cout << "Three of a kind: " << scoreOfAKind(counts, 3) << "\n";
    std::cout << "Four of a kind: " << scoreOfAKind(counts, 4) << "\n";
    std::cout << "Full house: " << scoreFullHouse(counts) << "\n";
    std::cout << "Small straight: " << scoreSmallStraight(counts) << "\n";
    std::cout << "Large straight: " << scoreLargeStraight(counts) << "\n";
    std::cout << "Yahtzee: " << scoreYahtzee(counts) << "\n";
    std::cout << "Chance: " << scoreChance(counts) << "\n";

    return 0;
}
```

New lines:

- Each line asks one rule about the same hand. The numbers differ run to run because the dice are random.
- `scoreOfAKind(counts, 3)` and `scoreOfAKind(counts, 4)` are the same function called with different `needed` values. That is why `needed` is a parameter.

```check
run "g++ -std=c++17 main.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the scoring program builds" -- List all five .cpp files in the command.
run "./game" stdout="Full house:" label="the full house rule is printed" -- Print Full house: and the value of scoreFullHouse(counts).
run "./game" stdout="Chance:" label="the chance rule is printed" -- Print Chance: and the value of scoreChance(counts).
```

## Read the tests

The support button created `tests/test_scoring.cpp`. It starts with a small helper:

```cpp
static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}
```

- `hand(2, 2, 3, 3, 3)` builds the table for a chosen hand in one short call. The test file uses it everywhere.
- `static` keeps the helper private to the test file, for the same reason as `hasRun`.

Each rule is then checked against hands where the right answer is known. For example `scoreFullHouse(hand(2, 2, 2, 2, 3))` must be 0, because four of one face and one of another is not a full house.

```bash
g++ -std=c++17 tests/test_scoring.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_scoring
./test_scoring
```

```check
run "g++ -std=c++17 tests/test_scoring.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_scoring" label="the scoring tests build" -- Every rule declared in Scoring.h needs a definition in Scoring.cpp.
tests "./test_scoring" require="Scoring.SmallStraight" label="the scoring tests pass" -- A small straight is four faces in a row. Check all three windows.
tests "./test_scoring" require="Scoring.FullHouse" label="the full house tests pass" -- Three of one face and two of another. Five of a kind is not a full house here.
```

## Your turn: two pairs

Add a house rule `int scoreTwoPairs(const Counts& counts)`. It returns 20 when at least two different faces each appear at least twice, and 0 otherwise. A full house therefore also scores, because both of its faces repeat. Four of one face does not, because only one face repeats. Add a named constant `TWO_PAIRS_POINTS` for the 20 in `Scoring.h`. The test file `tests/test_two_pairs.cpp` is already in your project. The game will not use this rule. It is practice for what you just learned.

```check
contains Scoring.h "TWO_PAIRS_POINTS" label="the 20 is a named constant" -- Write constexpr int TWO_PAIRS_POINTS = 20; with the other point values.
run "g++ -std=c++17 tests/test_two_pairs.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_two_pairs" label="the two pairs tests build" -- Declare scoreTwoPairs in Scoring.h and define it in Scoring.cpp.
tests "./test_two_pairs" require="TwoPairs.FourOfAKindIsOnlyOneFace" label="the two pairs tests pass" -- Count how many different faces repeat. Two or more scores 20.
```

```hints
nudge: What are you counting while you look at the six faces: dice, or faces?
concept: This is the same shape as highestFaceCount, but you count how many slots hold 2 or more instead of finding the largest one.
shape: Start a counter at 0. For each face from 1 to 6, add 1 when `counts[face] >= 2`. Return the named constant when the counter reaches 2, and 0 otherwise.
answer: One way to write it:
~~~cpp
// Scoring.h
constexpr int TWO_PAIRS_POINTS = 20;
int scoreTwoPairs(const Counts& counts);

// Scoring.cpp
int scoreTwoPairs(const Counts& counts) {
    int repeatedFaces = 0;
    for (int face = 1; face <= 6; face++) {
        if (counts[face] >= 2) {
            repeatedFaces++;
        }
    }
    return repeatedFaces >= 2 ? TWO_PAIRS_POINTS : 0;
}
~~~
```
````

`Yahtzee in C++/03 Counting and Scoring/03-the-scorecard-class.md`

````markdown
---
title: 3.3 — The Scorecard Class
runtime: none
support: tests/test_scorecard.cpp, tests/test_upper_bonus.cpp
---

The scoring rules are functions. A game also needs memory: which boxes are filled, what each holds, and what is left. In this lesson a `Scorecard` class owns the 13 categories. You meet a constant that belongs to a class, a check that stops the build, and copying a `std::vector` of structs.

Press this lesson's support button first. It creates two test files.

## Describe the scorecard

Words first:

- **Sentinel value**: a value that can never be real data, used to mean "nothing here yet". A Yahtzee score is never negative, so -1 can mean "not scored".
- **Static member**: a member marked `static` belongs to the class itself, not to each object. There is one copy for the whole program.

Create `Scorecard.h`.

```cpp file=Scorecard.h
#ifndef SCORECARD_H
#define SCORECARD_H

#include <cstddef>
#include <string>
#include <vector>

#include "Scoring.h"

struct Category {
    std::string name;
    int score;
};

class Scorecard {
public:
    static constexpr int UNSCORED = -1;
    static constexpr std::size_t CATEGORY_COUNT = 13;
    static constexpr int UPPER_BONUS_THRESHOLD = 63;
    static constexpr int UPPER_BONUS_POINTS = 35;

    Scorecard();

    std::size_t size() const;
    const std::string& name(std::size_t i) const;
    bool isScored(std::size_t i) const;
    int score(std::size_t i) const;
    bool record(std::size_t i, const Counts& counts);
    bool allScored() const;
    int total() const;
    std::vector<Category> preview(const Counts& counts) const;

private:
    std::vector<Category> categories;
};

#endif
```

Line by line:

- `struct Category { std::string name; int score; };`: a plain bundle of one text and one number. A struct's members are public, so `c.score` works directly.
- `public:` comes first in this class, with the data under `private:` at the bottom. Both orders are legal. Putting the interface first means a reader sees what the class offers before how it works inside.
- `static constexpr int UNSCORED = -1;`: one constant for the class. `static` means all scorecards share it. `constexpr` means the compiler knows the value while compiling. Code outside writes it as `Scorecard::UNSCORED`. Since C++17 a `static constexpr` member needs no separate definition in a `.cpp` file.
- `CATEGORY_COUNT`, `UPPER_BONUS_THRESHOLD` and `UPPER_BONUS_POINTS`: more class constants. The two bonus constants are used in your turn at the end of this lesson.
- `Scorecard();`: the constructor. It fills in the 13 categories.
- `const std::string& name(std::size_t i) const;`: returns a **reference** to the name stored inside the object, so no text is copied. The reference is only safe while the `Scorecard` exists. Keeping it after the scorecard is gone would be a dangling reference.
- `bool isScored(std::size_t i) const;` and `int score(std::size_t i) const;`: read one box. `const`, so they work on a read-only scorecard.
- `bool record(std::size_t i, const Counts& counts);`: fills box `i` using the current counts. It returns `true` if the box was written and `false` if it was refused. It changes the object, so it is not `const`.
- `std::vector<Category> preview(const Counts& counts) const;`: returns a **copy** of the categories with every empty box showing what it would score. The real scorecard is not touched.
- `std::vector<Category> categories;`: the private data. Outside code cannot clear it or put a box into a state the class does not allow.

## Define the scorecard

Words first:

- **`static_assert`**: a check made while compiling. If its condition is false, the compiler stops and shows your message.
- **`sizeof`**: the number of bytes a variable or type takes.

Create `Scorecard.cpp`.

```cpp file=Scorecard.cpp
#include "Scorecard.h"

static int potentialFor(std::size_t index, const Counts& counts) {
    switch (index) {
        case 0: return scoreUpper(counts, 1);
        case 1: return scoreUpper(counts, 2);
        case 2: return scoreUpper(counts, 3);
        case 3: return scoreUpper(counts, 4);
        case 4: return scoreUpper(counts, 5);
        case 5: return scoreUpper(counts, 6);
        case 6: return scoreOfAKind(counts, 3);
        case 7: return scoreOfAKind(counts, 4);
        case 8: return scoreFullHouse(counts);
        case 9: return scoreSmallStraight(counts);
        case 10: return scoreLargeStraight(counts);
        case 11: return scoreYahtzee(counts);
        case 12: return scoreChance(counts);
        default: return 0;
    }
}

Scorecard::Scorecard() {
    const char* const names[] = {
        "Ones", "Twos", "Threes", "Fours", "Fives", "Sixes",
        "Three of a kind", "Four of a kind", "Full house",
        "Small straight", "Large straight", "Yahtzee", "Chance",
    };
    static_assert(sizeof(names) / sizeof(names[0]) == CATEGORY_COUNT,
                  "one name is needed for every category");

    categories.reserve(CATEGORY_COUNT);
    for (std::size_t i = 0; i < CATEGORY_COUNT; i++) {
        categories.push_back(Category{names[i], UNSCORED});
    }
}

std::size_t Scorecard::size() const {
    return categories.size();
}

const std::string& Scorecard::name(std::size_t i) const {
    return categories[i].name;
}

bool Scorecard::isScored(std::size_t i) const {
    return categories[i].score != UNSCORED;
}

int Scorecard::score(std::size_t i) const {
    return categories[i].score;
}

bool Scorecard::record(std::size_t i, const Counts& counts) {
    if (i >= categories.size() || categories[i].score != UNSCORED) {
        return false;
    }
    categories[i].score = potentialFor(i, counts);
    return true;
}

bool Scorecard::allScored() const {
    for (const Category& c : categories) {
        if (c.score == UNSCORED) {
            return false;
        }
    }
    return true;
}

int Scorecard::total() const {
    int sum = 0;
    for (const Category& c : categories) {
        if (c.score != UNSCORED) {
            sum += c.score;
        }
    }
    return sum;
}

std::vector<Category> Scorecard::preview(const Counts& counts) const {
    std::vector<Category> shown = categories;
    for (std::size_t i = 0; i < shown.size(); i++) {
        if (shown[i].score == UNSCORED) {
            shown[i].score = potentialFor(i, counts);
        }
    }
    return shown;
}
```

Line by line:

- `static int potentialFor(...)`: a file-private helper that turns a box number into a call to the right rule. The order here must match the order of the names below. Nothing but your care keeps the two lists in step. Chapter 5 replaces this with something the compiler can check.
- `switch (index) {`: jumps to the `case` whose value equals `index`. `index` is a `std::size_t` and the labels are plain numbers, which the compiler converts. Every case ends in `return`, so no case can fall through into the next one. `default:` handles any other index.
- `const char* const names[] = { ... };`: an array of pointers to text. With empty brackets the compiler counts the entries itself. The trailing comma after `"Chance"` is allowed.
- `static_assert(sizeof(names) / sizeof(names[0]) == CATEGORY_COUNT, "...");`: `sizeof(names)` is the total bytes of the array and `sizeof(names[0])` is the bytes of one entry. Dividing gives the number of entries. If someone forgets a name, the **build fails** with your message. Without the check, a missing name would leave a null pointer, and turning one into a `std::string` is undefined behavior.
- `categories.reserve(CATEGORY_COUNT);`: asks the vector to set aside room for 13 entries up front. It adds no elements.
- `Category{names[i], UNSCORED}`: braces fill the struct's fields in order. The `const char*` converts to a `std::string`, which copies the characters.
- `Scorecard::UNSCORED` inside a member function can be written as just `UNSCORED`.
- `record`: `i >= categories.size()` is checked first. `||` stops as soon as one side is true, so `categories[i]` is never read for an index that does not exist. This is the same short-circuit order as `isOpen` in the Tetris project. A box that already has a score is refused, so a score cannot be overwritten.
- `for (const Category& c : categories)`: a reference to each box, with no copy, and read-only because `allScored` and `total` are `const`.
- `std::vector<Category> shown = categories;`: this copies the vector and every `Category` in it, including each `std::string`. `shown` and `categories` share nothing afterwards. Writing into `shown[i].score` cannot change the real scorecard.
- `return shown;`: returns the copy by value. The compiler hands it over without copying again.
- `name(i)`, `isScored(i)` and `score(i)` do not check `i`. They are meant to be called with a valid index. Only `record` checks, because it is the function that changes data.

```predict
question: preview writes a potential score into shown[6]. After the call returns, what does isScored(6) say?
choice: true, the box is now scored
choice: false, because preview worked on a copy
choice: The program does not compile
answer: false, because preview worked on a copy
explain: shown is a separate vector built by copying categories. The write lands in the copy, and the real box 6 still holds UNSCORED.
```

## Try it

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <vector>

#include "Dice.h"
#include "Scorecard.h"
#include "Scoring.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    dice.draw();
    Counts counts = countFaces(dice);

    Scorecard card;
    std::vector<Category> menu = card.preview(counts);
    for (std::size_t i = 0; i < menu.size(); i++) {
        std::cout << i + 1 << ". " << menu[i].name << ": " << menu[i].score << "\n";
    }

    card.record(12, counts);
    std::cout << "Recorded Chance. Total: " << card.total() << "\n";

    return 0;
}
```

New lines:

- `card.preview(counts)` returns a copy of the 13 boxes, each showing what it would score for this hand.
- `i + 1`: players count from 1, the vector from 0.
- `card.record(12, counts);`: box 12 is Chance. Its result, `true`, is ignored. The next line prints the total, which equals the sum of the dice.

```bash
g++ -std=c++17 main.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game
./game
```

```check
file Scorecard.h
file Scorecard.cpp
run "g++ -std=c++17 main.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the scorecard program builds" -- List all six .cpp files in the command.
run "./game" stdout="13. Chance:" label="the thirteenth category is Chance" -- The names must be in the same order as the switch cases.
run "./game" stdout="Recorded Chance. Total:" label="a category is recorded" -- Call record(12, counts) and then print the total.
run "g++ -std=c++17 tests/test_scorecard.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_scorecard" label="the scorecard tests build" -- Press the lesson's support button if tests/test_scorecard.cpp is missing.
tests "./test_scorecard" require="Scorecard.RecordsAScoreOnlyOnce" label="the scorecard tests pass" -- record must refuse a box that already has a score.
```

## Your turn: the upper bonus

In real Yahtzee, a player whose Ones to Sixes add up to 63 or more earns 35 extra points. Add `int upperBonus() const` to `Scorecard`. It adds the scores of the first six categories (indexes 0 to 5) that have been scored, ignoring empty boxes and the lower categories. It returns `UPPER_BONUS_POINTS` when that sum is at least `UPPER_BONUS_THRESHOLD`, and 0 otherwise. Declare it in `Scorecard.h` and define it in `Scorecard.cpp`. The two constants are already in the header. The test file `tests/test_upper_bonus.cpp` is already in your project. The finished game uses this function.

```check
matches Scorecard.h "int[ ]+upperBonus[ ]*[(][ ]*[)][ ]*const" label="Scorecard.h declares upperBonus as const" -- It changes nothing, so it ends with const.
run "g++ -std=c++17 tests/test_upper_bonus.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_upper_bonus" label="the bonus tests build" -- The declaration and definition must match, including the trailing const.
tests "./test_upper_bonus" require="UpperBonus.SixtyTwoEarnsNothing" label="the bonus tests pass" -- 63 or more earns the bonus. 62 does not. Empty boxes count as 0.
tests "./test_upper_bonus" require="UpperBonus.LowerCategoriesDoNotCount" label="only the upper six count" -- Loop over indexes 0 to 5 only.
```

```hints
nudge: Which boxes belong to the upper section, and what do empty boxes hold?
concept: Empty boxes hold -1, so adding them would subtract points. Check each box with `!= UNSCORED` before adding. The upper section is indexes 0 to 5 of `categories`.
shape: Add `int upperBonus() const;` under public. In Scorecard.cpp loop `i` from 0 to 5, add `categories[i].score` when it is not UNSCORED, then compare the sum with the threshold constant.
answer: One way to write it:
~~~cpp
// Scorecard.h — inside the public: section
int upperBonus() const;

// Scorecard.cpp
int Scorecard::upperBonus() const {
    int upper = 0;
    for (std::size_t i = 0; i < 6; i++) {
        if (categories[i].score != UNSCORED) {
            upper += categories[i].score;
        }
    }
    return upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0;
}
~~~
```
````

`Yahtzee in C++/03 Counting and Scoring/support/tests/test_counting.cpp`

```cpp
#include "minitest.h"
#include "../Scoring.h"

#include <cstdlib>
#include <vector>

TEST(Counting, CountsEachFace) {
    Counts c = countFaces(std::vector<int>{3, 3, 5, 6, 1});
    EXPECT_EQ(c[1], 1);
    EXPECT_EQ(c[2], 0);
    EXPECT_EQ(c[3], 2);
    EXPECT_EQ(c[4], 0);
    EXPECT_EQ(c[5], 1);
    EXPECT_EQ(c[6], 1);
}

TEST(Counting, SlotZeroStaysZero) {
    Counts c = countFaces(std::vector<int>{1, 2, 3, 4, 5});
    EXPECT_EQ(c[0], 0);
}

TEST(Counting, IgnoresImpossibleFaces) {
    Counts c = countFaces(std::vector<int>{0, 7, -2, 4, 100});
    int counted = 0;
    for (int i = 0; i < 7; i++) {
        counted += c[i];
    }
    EXPECT_EQ(c[4], 1);
    EXPECT_EQ(counted, 1);
}

TEST(Counting, NoDiceMeansAllZero) {
    Counts c = countFaces(std::vector<int>{});
    for (int i = 0; i < 7; i++) {
        EXPECT_EQ(c[i], 0);
    }
}

TEST(Counting, SumFromCountsAddsTheFaces) {
    Counts c = countFaces(std::vector<int>{2, 2, 6, 6, 6});
    EXPECT_EQ(sumFromCounts(c), 22);
}

TEST(Counting, DiceOverloadMatchesTheVectorOverload) {
    std::srand(4);
    Dice d(5);
    std::vector<int> faces;
    for (std::size_t i = 0; i < d.size(); i++) {
        faces.push_back(d.face(i));
    }
    Counts fromDice = countFaces(d);
    Counts fromVector = countFaces(faces);
    for (int i = 0; i < 7; i++) {
        EXPECT_EQ(fromDice[i], fromVector[i]);
    }
}
```

`Yahtzee in C++/03 Counting and Scoring/support/tests/test_highest_count.cpp`

```cpp
#include "minitest.h"
#include "../Scoring.h"

#include <vector>

TEST(Highest, AllDifferentGivesOne) {
    EXPECT_EQ(highestFaceCount(countFaces(std::vector<int>{1, 2, 3, 4, 5})), 1);
}

TEST(Highest, PairGivesTwo) {
    EXPECT_EQ(highestFaceCount(countFaces(std::vector<int>{2, 2, 3, 4, 5})), 2);
}

TEST(Highest, FiveOfAKindGivesFive) {
    EXPECT_EQ(highestFaceCount(countFaces(std::vector<int>{6, 6, 6, 6, 6})), 5);
}

TEST(Highest, NoDiceGivesZero) {
    Counts c{};
    EXPECT_EQ(highestFaceCount(c), 0);
}

TEST(Highest, SlotZeroIsIgnored) {
    Counts c{};
    c[0] = 9;
    c[4] = 2;
    EXPECT_EQ(highestFaceCount(c), 2);
}
```

`Yahtzee in C++/03 Counting and Scoring/support/tests/test_scoring.cpp`

```cpp
#include "minitest.h"
#include "../Scoring.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(Scoring, UpperSectionCountsOneFace) {
    Counts c = hand(1, 1, 3, 4, 1);
    EXPECT_EQ(scoreUpper(c, 1), 3);
    EXPECT_EQ(scoreUpper(c, 3), 3);
    EXPECT_EQ(scoreUpper(c, 6), 0);
}

TEST(Scoring, UpperSectionRejectsImpossibleFaces) {
    Counts c = hand(1, 1, 3, 4, 1);
    EXPECT_EQ(scoreUpper(c, 0), 0);
    EXPECT_EQ(scoreUpper(c, 7), 0);
}

TEST(Scoring, ThreeOfAKindScoresAllDice) {
    Counts c = hand(4, 4, 4, 2, 6);
    EXPECT_EQ(scoreOfAKind(c, 3), 20);
    EXPECT_EQ(scoreOfAKind(c, 4), 0);
}

TEST(Scoring, FourOfAKindAlsoCountsAsThree) {
    Counts c = hand(5, 5, 5, 5, 1);
    EXPECT_EQ(scoreOfAKind(c, 4), 21);
    EXPECT_EQ(scoreOfAKind(c, 3), 21);
}

TEST(Scoring, FullHouse) {
    EXPECT_EQ(scoreFullHouse(hand(2, 2, 3, 3, 3)), 25);
    EXPECT_EQ(scoreFullHouse(hand(2, 2, 2, 2, 3)), 0);
    EXPECT_EQ(scoreFullHouse(hand(5, 5, 5, 5, 5)), 0);
    EXPECT_EQ(scoreFullHouse(hand(1, 2, 3, 4, 5)), 0);
}

TEST(Scoring, SmallStraight) {
    EXPECT_EQ(scoreSmallStraight(hand(1, 2, 3, 4, 6)), 30);
    EXPECT_EQ(scoreSmallStraight(hand(2, 3, 4, 5, 5)), 30);
    EXPECT_EQ(scoreSmallStraight(hand(3, 4, 5, 6, 6)), 30);
    EXPECT_EQ(scoreSmallStraight(hand(1, 2, 3, 4, 5)), 30);
    EXPECT_EQ(scoreSmallStraight(hand(1, 2, 3, 5, 6)), 0);
}

TEST(Scoring, LargeStraight) {
    EXPECT_EQ(scoreLargeStraight(hand(1, 2, 3, 4, 5)), 40);
    EXPECT_EQ(scoreLargeStraight(hand(2, 3, 4, 5, 6)), 40);
    EXPECT_EQ(scoreLargeStraight(hand(1, 2, 3, 4, 6)), 0);
    EXPECT_EQ(scoreLargeStraight(hand(1, 3, 4, 5, 6)), 0);
}

TEST(Scoring, Yahtzee) {
    EXPECT_EQ(scoreYahtzee(hand(3, 3, 3, 3, 3)), 50);
    EXPECT_EQ(scoreYahtzee(hand(3, 3, 3, 3, 4)), 0);
}

TEST(Scoring, ChanceIsTheSum) {
    EXPECT_EQ(scoreChance(hand(1, 2, 3, 4, 6)), 16);
}
```

`Yahtzee in C++/03 Counting and Scoring/support/tests/test_two_pairs.cpp`

```cpp
#include "minitest.h"
#include "../Scoring.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(TwoPairs, TwoSeparatePairsScoreTwenty) {
    EXPECT_EQ(scoreTwoPairs(hand(2, 2, 5, 5, 6)), 20);
}

TEST(TwoPairs, FullHouseHasTwoFacesThatRepeat) {
    EXPECT_EQ(scoreTwoPairs(hand(3, 3, 3, 5, 5)), 20);
}

TEST(TwoPairs, FourOfAKindIsOnlyOneFace) {
    EXPECT_EQ(scoreTwoPairs(hand(2, 2, 2, 2, 6)), 0);
}

TEST(TwoPairs, OnePairIsNotEnough) {
    EXPECT_EQ(scoreTwoPairs(hand(1, 2, 3, 4, 4)), 0);
}

TEST(TwoPairs, NothingRepeatsScoresZero) {
    EXPECT_EQ(scoreTwoPairs(hand(1, 2, 3, 4, 5)), 0);
}
```

`Yahtzee in C++/03 Counting and Scoring/support/tests/test_scorecard.cpp`

```cpp
#include "minitest.h"
#include "../Scorecard.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(Scorecard, StartsEmpty) {
    Scorecard s;
    EXPECT_EQ(s.size(), 13u);
    EXPECT_EQ(s.total(), 0);
    EXPECT_EQ(s.allScored(), false);
    for (std::size_t i = 0; i < s.size(); i++) {
        EXPECT_EQ(s.isScored(i), false);
    }
    EXPECT_EQ(s.score(0), Scorecard::UNSCORED);
}

TEST(Scorecard, NamesAreInOrder) {
    Scorecard s;
    EXPECT_EQ(s.name(0), "Ones");
    EXPECT_EQ(s.name(5), "Sixes");
    EXPECT_EQ(s.name(11), "Yahtzee");
    EXPECT_EQ(s.name(12), "Chance");
}

TEST(Scorecard, RecordsAScoreOnlyOnce) {
    Scorecard s;
    EXPECT_EQ(s.record(0, hand(1, 1, 3, 4, 1)), true);
    EXPECT_EQ(s.score(0), 3);
    EXPECT_EQ(s.isScored(0), true);
    EXPECT_EQ(s.record(0, hand(1, 1, 1, 1, 1)), false);
    EXPECT_EQ(s.score(0), 3);
}

TEST(Scorecard, RejectsAnIndexThatDoesNotExist) {
    Scorecard s;
    EXPECT_EQ(s.record(13, hand(1, 2, 3, 4, 5)), false);
    EXPECT_EQ(s.record(100, hand(1, 2, 3, 4, 5)), false);
    EXPECT_EQ(s.total(), 0);
}

TEST(Scorecard, TotalAddsOnlyScoredCategories) {
    Scorecard s;
    s.record(12, hand(1, 2, 3, 4, 6));
    s.record(11, hand(2, 2, 2, 2, 2));
    EXPECT_EQ(s.total(), 66);
}

TEST(Scorecard, PreviewShowsPotentialsWithoutChangingTheCard) {
    Scorecard s;
    s.record(0, hand(1, 1, 3, 4, 1));
    std::vector<Category> shown = s.preview(hand(4, 4, 4, 2, 6));
    EXPECT_EQ(shown.size(), 13u);
    EXPECT_EQ(shown[0].score, 3);
    EXPECT_EQ(shown[6].score, 20);
    EXPECT_EQ(shown[12].score, 20);
    EXPECT_EQ(s.isScored(6), false);
    EXPECT_EQ(s.isScored(12), false);
}

TEST(Scorecard, AllScoredAfterThirteenRecords) {
    Scorecard s;
    for (std::size_t i = 0; i < s.size(); i++) {
        s.record(i, hand(1, 2, 3, 4, 5));
    }
    EXPECT_EQ(s.allScored(), true);
}
```

`Yahtzee in C++/03 Counting and Scoring/support/tests/test_upper_bonus.cpp`

```cpp
#include "minitest.h"
#include "../Scorecard.h"

static Counts only(int face, int count) {
    Counts c{};
    c[face] = count;
    return c;
}

TEST(UpperBonus, NothingScoredMeansNoBonus) {
    Scorecard s;
    EXPECT_EQ(s.upperBonus(), 0);
}

TEST(UpperBonus, SixtyThreeEarnsThirtyFive) {
    Scorecard s;
    for (int face = 1; face <= 6; face++) {
        s.record(static_cast<std::size_t>(face - 1), only(face, 3));
    }
    EXPECT_EQ(s.upperBonus(), 35);
}

TEST(UpperBonus, SixtyTwoEarnsNothing) {
    Scorecard s;
    s.record(0, only(1, 2));
    for (int face = 2; face <= 6; face++) {
        s.record(static_cast<std::size_t>(face - 1), only(face, 3));
    }
    EXPECT_EQ(s.upperBonus(), 0);
}

TEST(UpperBonus, LowerCategoriesDoNotCount) {
    Scorecard s;
    for (int face = 1; face <= 5; face++) {
        s.record(static_cast<std::size_t>(face - 1), only(face, 3));
    }
    s.record(11, only(6, 5));
    s.record(12, only(6, 5));
    EXPECT_EQ(s.upperBonus(), 0);
}
```

`Yahtzee in C++/04 The Turn/01-reading-input-safely.md`

````markdown
---
title: 4.1 — Reading Input Safely
track: The Turn
runtime: none
support: tests/fakeinput.h, tests/test_input.cpp, tests/test_yesno.cpp
---

A game that crashes or loops forever when someone types `abc` is not finished. In this lesson all keyboard reading moves into one file, `Input`. You meet how C++ input streams fail, how to read whole lines, and how to test code that normally waits for a keyboard.

Press this lesson's support button first. It creates three files in `tests/`.

## Describe the input functions

Words first:

- **Stream**: an object you read characters from (`std::cin`) or write characters to (`std::cout`).
- **Failure state**: a stream remembers when a read went wrong, for example when it expected a number and found a letter. Once it has failed, later reads do nothing until it is cleared.
- **Output parameter**: a non-const reference parameter that the function writes a result into. It lets a function hand back more than the one value it returns.

Create `Input.h`.

```cpp file=Input.h
#ifndef INPUT_H
#define INPUT_H

#include <cstddef>
#include <string>
#include <vector>

std::string trim(const std::string& text);
std::string toLowerCopy(std::string text);
std::vector<bool> parseKeepers(const std::string& line, std::size_t count);
bool parseInt(const std::string& line, int& value);
bool readLine(std::string& line);
bool askInt(const std::string& prompt, int low, int high, int& value);

#endif
```

Line by line:

- `std::string trim(const std::string& text);`: removes spaces, tabs and line-ending characters from both ends. Windows can leave a `\r` at the end of a typed line, and without trimming `"a\r"` would not equal `"a"`.
- `std::string toLowerCopy(std::string text);`: the parameter has **no** `&`. That is deliberate. The caller's string is copied into `text`, the function changes the copy, and returns it. When a function needs its own copy anyway, taking the parameter by value is the simplest way to get one.
- `std::vector<bool> parseKeepers(const std::string& line, std::size_t count);`: turns what the player typed ("1 3 5" or "a") into one true or false per die. It is pure. Nothing is read from the keyboard here, so it can be tested with plain text.
- `bool parseInt(const std::string& line, int& value);`: the `int&` is an output parameter. The function returns `true` or `false` for success and writes the number into the caller's variable only on success.
- `bool readLine(std::string& line);`: reads one line from the keyboard into `line`. It returns `false` when input has ended.
- `bool askInt(const std::string& prompt, int low, int high, int& value);`: asks until the player gives a whole number from `low` to `high`. It returns `false` only if input ends first.

## Define them

Words first:

- **`std::string::npos`**: a constant equal to the largest possible `std::size_t`. String search functions return it to mean "not found".
- **Narrowing / sign conversion**: changing a number's type can change its meaning. An `int` of -1 converted to `std::size_t` becomes a gigantic positive number.

Create `Input.cpp`.

```cpp file=Input.cpp
#include <cctype>
#include <iostream>
#include <sstream>

#include "Input.h"

std::string trim(const std::string& text) {
    const char* whitespace = " \t\r\n";
    std::size_t first = text.find_first_not_of(whitespace);
    if (first == std::string::npos) {
        return "";
    }
    std::size_t last = text.find_last_not_of(whitespace);
    return text.substr(first, last - first + 1);
}

std::string toLowerCopy(std::string text) {
    for (char& c : text) {
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    }
    return text;
}

std::vector<bool> parseKeepers(const std::string& line, std::size_t count) {
    std::vector<bool> kept(count, false);
    std::string cleaned = toLowerCopy(trim(line));

    if (cleaned == "a") {
        kept.assign(count, true);
        return kept;
    }

    std::stringstream numbers(cleaned);
    int number = 0;
    while (numbers >> number) {
        if (number >= 1 && static_cast<std::size_t>(number) <= count) {
            kept[static_cast<std::size_t>(number) - 1] = true;
        }
    }
    return kept;
}

bool parseInt(const std::string& line, int& value) {
    std::stringstream numbers(trim(line));
    int parsed = 0;
    char extra = 0;
    if (!(numbers >> parsed)) {
        return false;
    }
    if (numbers >> extra) {
        return false;
    }
    value = parsed;
    return true;
}

bool readLine(std::string& line) {
    return static_cast<bool>(std::getline(std::cin, line));
}

bool askInt(const std::string& prompt, int low, int high, int& value) {
    while (true) {
        std::cout << prompt;
        std::string line;
        if (!readLine(line)) {
            return false;
        }
        int parsed = 0;
        if (parseInt(line, parsed) && parsed >= low && parsed <= high) {
            value = parsed;
            return true;
        }
        std::cout << "Please type a whole number from " << low << " to " << high << ".\n";
    }
}
```

`trim`:

- `const char* whitespace = " \t\r\n";`: a pointer to a read-only text of the four characters to remove: space, tab, carriage return, newline. The pointer can change, but the characters cannot.
- `text.find_first_not_of(whitespace)`: the position of the first character that is **not** in that set, or `std::string::npos` if there is none.
- `if (first == std::string::npos) { return ""; }`: the text is empty or only whitespace. Returning `""` converts to an empty `std::string`.
- `text.find_last_not_of(whitespace)`: the position of the last character to keep.
- `text.substr(first, last - first + 1)`: a new string that starts at `first` and is `last - first + 1` characters long. Both positions are unsigned and `last >= first`, so the subtraction cannot wrap.

`toLowerCopy`:

- `for (char& c : text)`: `c` is a reference to each character inside the copy, so assigning to `c` changes `text`.
- `std::tolower` takes an `int` that must hold a value of `unsigned char` (or the special value `EOF`). Plain `char` is signed on many systems, so a character with a negative value passed straight in is undefined behavior. The cast `static_cast<unsigned char>(c)` makes the value safe. The result is an `int`, so it is cast back to `char`.

`parseKeepers`:

- `std::vector<bool> kept(count, false);`: `count` entries, all `false`.
- `toLowerCopy(trim(line))`: trims first and lowercases the result, so `" A \r"` becomes `"a"`.
- `kept.assign(count, true);`: replaces the contents with `count` copies of `true`, then returns early.
- `std::stringstream numbers(cleaned);`: lets you pull numbers out of text with `>>`.
- `while (numbers >> number) {`: each `>>` reads the next whole number. If it cannot, the stream enters its failure state and the loop ends. The condition is true only while reads succeed. A word stops it: for `"1 x 3"` only the 1 is read.
- `number >= 1 && static_cast<std::size_t>(number) <= count`: the first test comes first on purpose. A negative `number` is rejected before it is converted. Converted to `std::size_t`, -1 would become huge.
- `kept[static_cast<std::size_t>(number) - 1] = true;`: players count from 1, the vector from 0. The write goes through `std::vector<bool>`'s proxy, which is why `kept[i] = true` works.

`parseInt`:

- `int parsed = 0; char extra = 0;`: both start with a value, since a failed read leaves them unchanged.
- `if (!(numbers >> parsed)) { return false; }`: no whole number at the start means failure.
- `if (numbers >> extra) { return false; }`: reading into a `char` skips spaces and succeeds if anything at all is left. So `"12abc"` and `"3 4"` are rejected.
- `value = parsed;`: written only after both checks pass. On failure the caller's variable is untouched.

`readLine` and `askInt`:

- `std::getline(std::cin, line)` returns the stream itself. `static_cast<bool>(...)` asks "did the last read work?" It is `false` when input has ended (Ctrl+D on macOS and Linux, Ctrl+Z then Enter on Windows) or has failed.
- That check matters. If input ends, every later read fails at once. A loop that ignores it would print its prompt forever.
- `askInt` loops until the answer fits. `parseInt(line, parsed) && parsed >= low && parsed <= high` checks the text, then the range. `&&` stops at the first false part.
- `value = parsed;` is the only write to the caller's variable.

```predict
question: The player types 5 and presses Enter. Your code reads it with `std::cin >> n`. What is left waiting in the input?
choice: Nothing, everything was read
choice: Only the newline from the Enter key
choice: The digit 5 again
answer: Only the newline from the Enter key
explain: The >> operator reads the 5 and stops. The newline stays. A getline right after it would return an empty line immediately. That is why this project reads whole lines with getline and parses them itself.
```

## Try it

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <string>
#include <vector>

#include "Dice.h"
#include "Input.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    dice.draw();

    std::string line;
    std::cout << "Dice to keep (for example 1 3 5, a for all): ";
    if (!readLine(line)) {
        std::cout << "\nNo input.\n";
        return 1;
    }
    std::vector<bool> kept = parseKeepers(line, dice.size());

    std::cout << "Kept:";
    for (std::size_t i = 0; i < kept.size(); i++) {
        if (kept[i]) {
            std::cout << " " << i + 1;
        }
    }
    std::cout << "\n";

    int number = 0;
    if (!askInt("Pick a number from 1 to 13: ", 1, 13, number)) {
        std::cout << "\nNo input.\n";
        return 1;
    }
    std::cout << "Picked " << number << "\n";

    return 0;
}
```

New lines:

- `if (!readLine(line)) { ... return 1; }`: end of input stops the program with exit status 1, which tells the operating system something went wrong.
- `parseKeepers(line, dice.size())`: the list is as long as the number of dice, not a fixed 5.
- `kept[i]` read inside an `if`: reading a `std::vector<bool>` element works as normal.
- `askInt("...", 1, 13, number)`: `number` is passed where `int& value` is expected, so `askInt` writes the answer straight into it.

```bash
g++ -std=c++17 main.cpp Input.cpp Dice.cpp Die.cpp Terminal.cpp -o game
./game
```

```check
file Input.h
file Input.cpp
run "g++ -std=c++17 main.cpp Input.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the input program builds" -- List all five .cpp files in the command.
run "./game" stdin="1 3\n7\n" stdout="Kept: 1 3" label="numbers are parsed into kept dice" -- parseKeepers sets entry number-1 to true.
run "./game" stdin="a\n7\n" stdout="Kept: 1 2 3 4 5" label="a keeps every die" -- Compare the trimmed, lowercased text with "a" before parsing numbers.
run "./game" stdin="\nabc\n99\n13\n" stdout="Picked 13" label="bad answers are asked again" -- askInt must loop until the answer is a whole number in range.
run "./game" stdin="\nabc\n99\n13\n" stdout="Please type a whole number from 1 to 13." label="a bad answer prints a hint" -- Print the hint inside the loop before asking again.
run "./game" stdin="" exit=1 label="the program stops when input ends" -- readLine returns false at the end of input, and main returns 1.
```

## Read the tests

Normally code that reads `std::cin` cannot be tested, because the test would wait for a keyboard. The support button created `tests/fakeinput.h`. It swaps what `std::cin` reads from.

```cpp file=tests/fakeinput.h provided
#ifndef FAKEINPUT_H
#define FAKEINPUT_H

#include <iostream>
#include <sstream>
#include <string>

// While a FakeInput exists, std::cin reads from the text you give it
// instead of from the keyboard. When it goes out of scope, the keyboard
// is put back.
class FakeInput {
private:
    std::istringstream stream;
    std::streambuf* original;

public:
    explicit FakeInput(const std::string& text)
        : stream(text), original(std::cin.rdbuf(stream.rdbuf())) {}

    ~FakeInput() {
        std::cin.rdbuf(original);
    }

    FakeInput(const FakeInput&) = delete;
    FakeInput& operator=(const FakeInput&) = delete;
};

#endif
```

How it works:

- `std::istringstream stream;`: a stream that reads from a string in memory.
- `std::streambuf* original;`: a pointer to the buffer `std::cin` was using. A stream does its reading through a buffer object, and `rdbuf()` gets or replaces it.
- `: stream(text), original(std::cin.rdbuf(stream.rdbuf()))`: the member initializer list. `stream` is built from the text. Then `std::cin.rdbuf(...)` makes `std::cin` use the string's buffer and **returns the previous buffer**, which is saved in `original`. Members are initialized in the order they are declared, and `stream` is declared first, which is why this order is safe.
- `~FakeInput() { std::cin.rdbuf(original); }`: a **destructor**. C++ runs it automatically when the object goes out of scope. It puts the keyboard back. The test cannot forget to, and it still happens if the test ends early. This is the idea called RAII: tie cleaning up to an object's lifetime.
- `FakeInput(const FakeInput&) = delete;`: `= delete` forbids a function from existing. Copying a `FakeInput` would give two objects that both try to restore the keyboard, so copying is turned into a compile error.

A test then reads like this:

```cpp
TEST(Input, AskIntAsksAgainUntilTheAnswerFits) {
    FakeInput in("abc\n99\n0\n7\n");
    int v = -1;
    EXPECT_EQ(askInt("? ", 1, 13, v), true);
    EXPECT_EQ(v, 7);
}
```

`askInt` sees `abc`, then `99`, then `0` (all rejected), and accepts `7`.

```bash
g++ -std=c++17 tests/test_input.cpp Input.cpp -o test_input
./test_input
```

```check
run "g++ -std=c++17 tests/test_input.cpp Input.cpp -o test_input" label="the input tests build" -- Press the lesson's support button if the tests folder is missing files.
tests "./test_input" require="Input.AskIntGivesUpWhenInputEnds" label="the input tests pass" -- askInt must return false when readLine fails, and leave the value alone.
tests "./test_input" require="Input.ParseIntRejectsEverythingElse" label="parseInt rejects bad text" -- Reject trailing characters, and write the value only on success.
```

## Your turn: yes or no

Add `bool parseYesNo(const std::string& line, bool& yes)` to `Input`. It accepts `y` or `yes` (answer true) and `n` or `no` (answer false), in any mix of upper and lower case, with spaces around. It returns `true` when it understood the answer and `false` otherwise. On failure it must leave `yes` unchanged. Declare it in `Input.h` and define it in `Input.cpp`, and use the helpers already there. The test file `tests/test_yesno.cpp` is already in your project.

```check
matches Input.h "bool[ ]+parseYesNo[ ]*[(][ ]*const[ ]+std::string[ ]*&[^,]*,[ ]*bool[ ]*&" label="Input.h declares parseYesNo" -- Take a const std::string& and a bool&, and return bool.
run "g++ -std=c++17 tests/test_yesno.cpp Input.cpp -o test_yesno" label="the yes/no tests build" -- Declare the function in Input.h and define it in Input.cpp.
tests "./test_yesno" require="YesNo.AcceptsYes" label="yes answers are understood" -- Trim and lowercase first, then compare with y and yes.
tests "./test_yesno" require="YesNo.LeavesTheAnswerAloneOnFailure" label="a failed parse leaves the answer alone" -- Write to yes only inside the branches that return true.
```

```hints
nudge: Which two helpers in Input.cpp already clean up the text for you?
concept: trim removes the edges and toLowerCopy removes the case differences. After both, only four exact words matter: y, yes, n and no. The output parameter is written only when you are about to return true.
shape: Declare the function in Input.h. In Input.cpp make `std::string word = toLowerCopy(trim(line));`. If it is y or yes, set `yes = true` and return true. If it is n or no, set `yes = false` and return true. Otherwise return false.
answer: One way to write it:
~~~cpp
// Input.h
bool parseYesNo(const std::string& line, bool& yes);

// Input.cpp
bool parseYesNo(const std::string& line, bool& yes) {
    std::string word = toLowerCopy(trim(line));
    if (word == "y" || word == "yes") {
        yes = true;
        return true;
    }
    if (word == "n" || word == "no") {
        yes = false;
        return true;
    }
    return false;
}
~~~
```
````

`Yahtzee in C++/04 The Turn/02-one-turn.md`

````markdown
---
title: 4.2 — One Turn
runtime: none
support: tests/test_dice_free.cpp, tests/test_turn.cpp
---

A turn is the heart of Yahtzee: roll, look at the options, then either score a category or keep some dice and roll the rest, up to three rolls. In this lesson one function, `playTurn`, does that using everything built so far. You also give a function an options struct with default values, and you test a whole turn with typed-in answers.

Press this lesson's support button first. It creates two test files. `tests/fakeinput.h` from the last lesson is used again.

## Roll only the free dice

The animation already knows how to leave held dice alone. A turn that runs without animation needs the same ability. Add one function to `Dice`. It uses the `animate` that returns `bool` from your last turn in lesson 2.3.

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
    void rollFree(const std::vector<bool>& hold);
    void draw() const;
    bool animate(const std::vector<bool>& hold);
};

#endif
```

New line:

- `void rollFree(const std::vector<bool>& hold);`: gives every die that is **not** held a brand-new random face, at once, with no animation. `hold[i]` being true means die `i` stays as it is, the same meaning as in `animate`.

```cpp file=Dice.cpp
#include <iostream>

#include "Dice.h"
#include "Terminal.h"

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

void Dice::rollFree(const std::vector<bool>& hold) {
    for (std::size_t i = 0; i < dice.size(); i++) {
        if (!hold[i]) {
            dice[i].roll();
        }
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

bool Dice::animate(const std::vector<bool>& hold) {
    bool anyFree = false;
    for (std::size_t i = 0; i < dice.size(); i++) {
        if (!hold[i]) {
            anyFree = true;
        }
    }
    if (!anyFree) {
        return false;
    }

    for (int frame = 0; frame < 15; frame++) {
        for (std::size_t i = 0; i < dice.size(); i++) {
            if (!hold[i]) {
                dice[i].tumbleStep();
            }
        }
        clearScreen();
        draw();
        sleepMs(50 + frame * 15);
    }
    return true;
}
```

New lines:

- `for (std::size_t i = 0; i < dice.size(); i++) {`: an index loop rather than a range-for, because the loop needs the position `i` to look up `hold[i]`.
- `if (!hold[i]) { dice[i].roll(); }`: `dice[i]` is the real die inside the vector, so `roll()` changes it. `hold[i]` is not bounds-checked, so `hold` must be at least as long as `dice`.

```check
run "g++ -std=c++17 tests/test_dice_free.cpp Dice.cpp Die.cpp Terminal.cpp -o test_dice_free" label="the rollFree tests build" -- Declare rollFree in Dice.h and define it in Dice.cpp.
tests "./test_dice_free" require="DiceFree.HeldDiceKeepTheirFaces" label="held dice keep their faces" -- Skip any die whose hold entry is true.
```

## Describe the turn

Words first:

- **Default member initializer**: a value written next to a member in a struct (`bool animate = true;`) that the member gets whenever nothing else sets it.
- **Default argument**: a value written in a function's declaration (`= TurnOptions()`) that is used when the caller leaves that argument out.

```cpp file=Turn.h
#ifndef TURN_H
#define TURN_H

#include "Dice.h"
#include "Scorecard.h"

struct TurnOptions {
    bool animate = true;
    int maxRolls = 3;
};

bool playTurn(Dice& dice, Scorecard& scorecard, const TurnOptions& options = TurnOptions());

#endif
```

Line by line:

- `struct TurnOptions { bool animate = true; int maxRolls = 3; };`: settings for a turn. A struct with no constructor has no uninitialized members here, because both members carry a default. `TurnOptions options;` gives `animate` true and `maxRolls` 3. Tests turn the animation off with `options.animate = false;`.
- `bool playTurn(Dice& dice, Scorecard& scorecard, ...)`: `Dice&` and `Scorecard&` are **non-const** references, because the turn changes both: it rolls the dice and writes a score. The return value says whether the turn finished: `true` if a category was scored, `false` if input ran out.
- `const TurnOptions& options = TurnOptions()`: the options are only read, so a const reference. If the caller passes nothing, `TurnOptions()` builds a temporary object with all defaults, which lives until the call ends. A default argument is written in the declaration only, never again in the definition.

## Write the turn

```cpp file=Turn.cpp
#include <iostream>
#include <string>
#include <vector>

#include "Input.h"
#include "Scoring.h"
#include "Terminal.h"
#include "Turn.h"

static void showMenu(const Scorecard& scorecard, const Counts& counts) {
    std::vector<Category> shown = scorecard.preview(counts);
    for (std::size_t i = 0; i < shown.size(); i++) {
        std::cout << "*" << i + 1 << "* " << shown[i].name << ": " << shown[i].score;
        if (scorecard.isScored(i)) {
            std::cout << " (taken)";
        }
        std::cout << "\n";
    }
}

bool playTurn(Dice& dice, Scorecard& scorecard, const TurnOptions& options) {
    std::vector<bool> kept(dice.size(), false);
    dice.rollAll();
    if (options.animate) {
        dice.animate(kept);
    }
    int rollsUsed = 1;

    while (true) {
        Counts counts = countFaces(dice);
        if (options.animate) {
            clearScreen();
        }
        dice.draw();
        showMenu(scorecard, counts);

        bool canReroll = rollsUsed < options.maxRolls;
        int lowest = canReroll ? 0 : 1;
        std::string prompt = canReroll ? "Pick a category, or 0 to reroll: " : "Pick a category: ";

        int choice = 0;
        if (!askInt(prompt, lowest, static_cast<int>(scorecard.size()), choice)) {
            return false;
        }

        if (choice == 0) {
            std::cout << "Dice to keep (for example 1 3 5, a for all, Enter for none): ";
            std::string line;
            if (!readLine(line)) {
                return false;
            }
            kept = parseKeepers(line, dice.size());
            if (options.animate) {
                dice.animate(kept);
            } else {
                dice.rollFree(kept);
            }
            rollsUsed++;
        } else {
            std::size_t index = static_cast<std::size_t>(choice) - 1;
            if (scorecard.record(index, counts)) {
                std::cout << "You scored " << scorecard.score(index)
                          << " in " << scorecard.name(index) << "\n";
                return true;
            }
            std::cout << "That category is already scored.\n";
        }
    }
}
```

`showMenu`:

- `static void showMenu(...)`: private to this file, like the helpers before it.
- `scorecard.preview(counts)`: a copy of the 13 boxes. Empty boxes hold what they would score for this hand. Scored boxes hold their real score.
- `scorecard.isScored(i)` tells the two apart so scored boxes get ` (taken)`.

`playTurn`, the start:

- `std::vector<bool> kept(dice.size(), false);`: nothing is held at the start.
- `dice.rollAll();` gives every die a fresh random face. The same `Dice` is reused all game, so without this a new turn would start with the last turn's faces.
- `if (options.animate) { dice.animate(kept); }`: the tumbling effect. Tests switch it off.
- `int rollsUsed = 1;`: the first roll has already happened.

The loop:

- `while (true) {`: runs until a `return` inside it. Every path out of the loop returns a `bool`.
- `Counts counts = countFaces(dice);`: rebuilt on every pass, because the dice may have changed.
- `if (options.animate) { clearScreen(); }` then `dice.draw();` and `showMenu(...)`: wipe the screen, draw the dice, list the 13 boxes.
- `bool canReroll = rollsUsed < options.maxRolls;`: with the default of 3, a reroll is offered while `rollsUsed` is 1 or 2.
- `int lowest = canReroll ? 0 : 1;`: when rerolling is allowed, 0 is a valid answer. When it is not, 0 is rejected and the lowest answer is 1.
- `askInt(prompt, lowest, static_cast<int>(scorecard.size()), choice)`: asks until the answer fits. `scorecard.size()` is unsigned, so it is cast to `int` for the parameter. If input ends, `askInt` returns `false` and the turn returns `false`.

The two branches:

- `if (choice == 0) {`: asks which dice to keep, reads the whole line, and turns it into `kept` with `parseKeepers`. `kept = parseKeepers(...)` assigns the returned vector over the old one. C++ moves the contents out of the returned temporary, so no element is copied one by one. Chapter 5 explains moves.
- `dice.animate(kept)` or `dice.rollFree(kept)`: the animated or the instant way to reroll the free dice. Held dice never change. `rollsUsed++` spends a roll.
- `else {`: a category was chosen. `static_cast<std::size_t>(choice) - 1` converts to an unsigned index. The cast comes first so the subtraction is done on unsigned numbers. Here `choice` is at least 1, so it cannot wrap below zero.
- `if (scorecard.record(index, counts)) {`: `record` refuses a box that already has a score, and then the turn prints a message and asks again.

```predict
question: With the default options (maxRolls is 3), how many times in one turn can the player answer 0 to reroll?
choice: 1
choice: 2
choice: 3
answer: 2
explain: The first roll already counts, so rollsUsed starts at 1. A reroll is offered while rollsUsed is below 3, which is when it is 1 and when it is 2. After the second reroll rollsUsed is 3 and the prompt only offers categories.
```

## Play one turn

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

#include "Dice.h"
#include "Scorecard.h"
#include "Turn.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    Scorecard scorecard;

    if (!playTurn(dice, scorecard)) {
        std::cout << "\nInput ended.\n";
        return 1;
    }
    std::cout << "Total so far: " << scorecard.total() << "\n";
    return 0;
}
```

New lines:

- `playTurn(dice, scorecard)`: the third argument is left out, so the default options are used, with animation on and three rolls.
- The program plays one turn, prints the total, and ends.

```bash
g++ -std=c++17 main.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game
./game
```

```check
run "g++ -std=c++17 main.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the turn program builds" -- List all eight .cpp files in the command.
run "./game" stdin="13\n" stdout="You scored" label="a turn ends when a category is chosen" -- Choose 13 (Chance) at the first prompt.
run "./game" stdin="13\n" stdout="Total so far:" label="the total is printed after the turn" -- Print scorecard.total() after playTurn returns.
run "./game" stdin="" exit=1 label="the program stops when input ends" -- playTurn returns false at the end of input and main returns 1.
```

## Read the tests

Chance scores the total of the dice, whatever they are. That makes a whole turn testable even though the dice are random. The support button created `tests/test_turn.cpp`. One test:

```cpp
TEST(Turn, ChanceScoresTheDiceTotal) {
    std::srand(5);
    Dice dice(5);
    Scorecard card;
    FakeInput in("13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.score(12), dice.total());
}
```

- `quiet()` is a helper in the test file that returns a `TurnOptions` with `animate` set to false, so the test does not wait for the animation.
- `FakeInput in("13\n");` types "13" and Enter for the turn. Box 13 is Chance, stored at index 12.
- Whichever faces were rolled, the Chance score must equal `dice.total()`.

Other tests type `abc`, `99` and `-4` before a valid answer, reroll with `0`, run out of rolls, try to score the same box twice, and end the input early. The last one checks that `playTurn` returns `false` and scores nothing.

```bash
g++ -std=c++17 tests/test_turn.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_turn
./test_turn
```

```check
run "g++ -std=c++17 tests/test_turn.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_turn" label="the turn tests build" -- Turn.cpp needs Input.cpp, Scorecard.cpp, Scoring.cpp, Dice.cpp, Die.cpp and Terminal.cpp too.
tests "./test_turn" require="Turn.ACategoryCannotBeScoredTwice" label="a scored category is refused" -- record returns false for a box that already has a score. The turn must ask again.
tests "./test_turn" require="Turn.EndOfInputStopsTheTurn" label="the turn stops when input ends" -- Every askInt or readLine that fails must make playTurn return false.
```

## Your turn: show the roll number

Change the prompt in `Turn.cpp` so that it starts with the roll number, for example `Roll 1 of 3. Pick a category, or 0 to reroll: ` and on the last roll `Roll 3 of 3. Pick a category: `. Build the start of the text from `rollsUsed` and `options.maxRolls`. Convert each number to text with `std::to_string`.

```check
matches Turn.cpp "std::to_string" label="numbers are converted with std::to_string" -- std::to_string(7) gives the text "7". It is declared in <string>.
run "g++ -std=c++17 main.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the program builds" -- Read the first error. It names the line.
run "./game" stdin="13\n" stdout="Roll 1 of 3. Pick a category, or 0 to reroll: " label="the first prompt shows the roll number" -- Join "Roll ", the number, " of ", the maximum and ". " in front of the old prompt.
tests "./test_turn" require="Turn.ThreeRollsAreAllowed" label="the turn tests still pass" -- Only the prompt text should change, not how rolls are counted.
```

```hints
nudge: The pieces are text and numbers. What do you need to turn the numbers into text, and how do you join pieces of text?
concept: `std::to_string(n)` turns a number into a `std::string`. `std::string + std::string` and `std::string + const char*` join text. A text in quotes on its own is a `const char*`, so start each addition from a `std::string`.
shape: Build `std::string prefix = "Roll " + std::to_string(rollsUsed) + " of " + std::to_string(options.maxRolls) + ". ";` then make the prompt from `prefix` plus the old text. The first `+` works because the left side is a const char* and the right side is a std::string.
answer: One way to write it:
~~~cpp
std::string prefix = "Roll " + std::to_string(rollsUsed) + " of " +
                     std::to_string(options.maxRolls) + ". ";
std::string prompt = prefix + (canReroll ? "Pick a category, or 0 to reroll: "
                                         : "Pick a category: ");
~~~
```
````

`Yahtzee in C++/04 The Turn/03-the-whole-game.md`

````markdown
---
title: 4.3 — The Whole Game
runtime: none
support: tests/test_game.cpp
---

You can play one turn. A game is thirteen of them, one for each box, followed by a final score. In this lesson a `playGame` function runs the turns, and `main` shrinks to a few lines of wiring. You also learn how a C++ program receives command-line arguments and returns an exit status.

Press this lesson's support button first. It creates `tests/test_game.cpp`.

## Play until the card is full

Words first:

- **Exit status**: the number `main` returns. 0 means success, and any other number means something went wrong.

```cpp file=Game.h
#ifndef GAME_H
#define GAME_H

#include "Dice.h"
#include "Scorecard.h"
#include "Turn.h"

bool playGame(Dice& dice, Scorecard& scorecard, const TurnOptions& options);

#endif
```

Line by line:

- The header includes the three headers whose types appear in the declaration.
- `bool playGame(...)`: returns `true` if the game was played to the end and `false` if input ran out first. The options are passed on to every turn.

```cpp file=Game.cpp
#include <iostream>
#include <string>

#include "Game.h"
#include "Input.h"

bool playGame(Dice& dice, Scorecard& scorecard, const TurnOptions& options) {
    while (!scorecard.allScored()) {
        if (!playTurn(dice, scorecard, options)) {
            return false;
        }
        if (options.animate && !scorecard.allScored()) {
            std::cout << "Press Enter to continue...";
            std::string line;
            if (!readLine(line)) {
                return false;
            }
        }
    }

    int bonus = scorecard.upperBonus();
    std::cout << "Game over.\n";
    std::cout << "Upper bonus: " << bonus << "\n";
    std::cout << "Final score: " << scorecard.total() + bonus << "\n";
    return true;
}
```

Line by line:

- `while (!scorecard.allScored()) {`: keep playing turns until every box holds a score. Each turn fills exactly one box, so the loop runs 13 times.
- `if (!playTurn(...)) { return false; }`: if a turn could not finish because input ended, the game cannot finish either.
- `if (options.animate && !scorecard.allScored()) {`: pause for Enter between turns, but only when the game is animated (that is, played by a person), and not after the last turn. Fast mode and tests skip the pause.
- `scorecard.upperBonus()`: the function you wrote in lesson 3.3. The bonus is added to the total only here. `total()` itself stays the plain sum of the boxes.
- `scorecard.total() + bonus`: the final score.

## Command-line arguments

Words first:

- **`argc` and `argv`**: how C++ hands a program its command-line words. `argc` is the number of words, counting the program's own name. `argv` is an array of that many pointers, each to the characters of one word.

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <string>

#include "Dice.h"
#include "Game.h"
#include "Scorecard.h"
#include "Turn.h"

int main(int argc, char* argv[]) {
    TurnOptions options;

    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--fast") {
            options.animate = false;
        }
    }

    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    Scorecard scorecard;

    if (!playGame(dice, scorecard, options)) {
        std::cout << "\nInput ended before the game finished.\n";
        return 1;
    }
    return 0;
}
```

Line by line:

- `int main(int argc, char* argv[]) {`: the second form of `main`. For `./game --fast`, `argc` is 2. `argv[0]` is the program's own name (as you typed it) and `argv[1]` is `"--fast"`. Each entry is a `char*`, a pointer to the first character of a text. That is the same type as the entries of `pip` in lesson 1.3.
- `for (int i = 1; i < argc; i++) {`: starts at 1 to skip the program's own name.
- `std::string arg = argv[i];`: builds a `std::string` by copying the characters. Do this before comparing. `argv[i] == "--fast"` would compare **addresses**, not text, and would be false even for a matching word. `std::string`'s `==` compares the characters.
- `options.animate = false;`: the flag turns the animation and the pauses off. The game then runs as fast as you can type.
- `return 1;` when input ends: the exit status 1. `return 0;` is a normal end.

```predict
question: You run `./game --fast`. What value does argc hold inside main?
choice: 1
choice: 2
choice: 3
answer: 2
explain: argc counts every word, including the program's own name. "./game" and "--fast" are two words.
```

Build the finished game. The command lists nine files, so copy it carefully:

```bash
g++ -std=c++17 main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game
./game
```

Play one animated turn to see it, then try fast mode by typing the numbers 1 to 13, one per turn:

```bash
./game --fast
```

```check
run "g++ -std=c++17 main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the whole game builds" -- List all nine .cpp files in the command.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="thirteen turns end the game" -- Each turn fills one box. The loop ends when allScored is true.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Final score:" label="the final score is printed" -- Print total() plus the bonus.
run "./game --fast" stdin="1\n2\n" exit=1 label="the game stops when input ends" -- playGame returns false when a turn cannot finish, and main returns 1.
```

## Read the tests

The support button created `tests/test_game.cpp`. It plays complete games with typed answers:

```cpp
TEST(Game, ThirteenTurnsFinishTheGame) {
    std::srand(12);
    Dice dice(5);
    Scorecard card;
    FakeInput in("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n");
    EXPECT_EQ(playGame(dice, card, quiet()), true);
    EXPECT_EQ(card.allScored(), true);
}
```

- Each line of the typed input picks one box, so 13 turns fill 13 boxes.
- The dice are random, so the test checks the shape of the game and not a particular score.
- The second test types only two answers and checks that the game returns `false` with two boxes filled.

```bash
g++ -std=c++17 tests/test_game.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_game
./test_game
```

```check
run "g++ -std=c++17 tests/test_game.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_game" label="the game tests build" -- The test links every .cpp file except main.cpp.
tests "./test_game" require="Game.ThirteenTurnsFinishTheGame" label="a full game finishes" -- The loop must run until every category is scored.
tests "./test_game" require="Game.StopsWhenTheInputEnds" label="a short game reports failure" -- Return false, and do not print the final score.
```

## Your turn: choose the number of rolls

Add the option `--rolls N` to `main`. `N` must be a whole number from 1 to 3 and sets `options.maxRolls`. Use `parseInt` from `Input.h`, and remember to skip the number's own place in `argv`. If the option is missing its number, or the number is not a whole number from 1 to 3, print `--rolls needs a whole number from 1 to 3` to `std::cerr` and return 2 from `main`. `std::cerr` is a second output stream for errors. It is kept separate from `std::cout`, so errors can be shown or saved on their own. A game with `--rolls 1` offers no reroll at all.

```check
run "g++ -std=c++17 main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the program builds" -- main.cpp needs #include "Input.h" for parseInt.
run "./game --fast --rolls 3" stdin="1\n" stdout="or 0 to reroll" label="three rolls offer a reroll" -- With maxRolls 3 the first prompt mentions rerolling.
run "./game --fast --rolls 1" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" without="or 0 to reroll" label="one roll never offers a reroll" -- Store the number in options.maxRolls before the game starts.
run "./game --rolls abc" exit=2 stderr="--rolls needs a whole number from 1 to 3" label="a bad number is refused" -- Print the message to std::cerr and return 2.
run "./game --rolls 9" exit=2 stderr="--rolls needs a whole number from 1 to 3" label="a number out of range is refused" -- Reject values below 1 and above 3.
run "./game --rolls" exit=2 stderr="--rolls needs a whole number from 1 to 3" label="a missing number is refused" -- Check that i + 1 is still below argc before reading argv[i + 1].
```

```hints
nudge: Which argument holds the number: the one after --rolls, or --rolls itself?
concept: Inside the loop, `argv[i]` is the option and `argv[i + 1]` is its value, but only if `i + 1 < argc`. After you use the value, add 1 to `i` so the loop does not read the number as an option. `parseInt` takes a `const std::string&`, and a `char*` converts to one.
shape: Add an `else if (arg == "--rolls")` branch. Declare `int rolls = 0;`. If `i + 1 >= argc`, or `parseInt(argv[i + 1], rolls)` fails, or `rolls` is outside 1 to 3, print the message to `std::cerr` and `return 2;`. Otherwise set `options.maxRolls = rolls;` and `i++;`.
answer: One way to write it, added after the --fast branch:
~~~cpp
// at the top of main.cpp
#include "Input.h"

// inside the for loop in main
} else if (arg == "--rolls") {
    int rolls = 0;
    if (i + 1 >= argc || !parseInt(argv[i + 1], rolls) || rolls < 1 || rolls > 3) {
        std::cerr << "--rolls needs a whole number from 1 to 3\n";
        return 2;
    }
    options.maxRolls = rolls;
    i++;
}
~~~
```
````

`Yahtzee in C++/04 The Turn/support/tests/fakeinput.h`

```cpp
#ifndef FAKEINPUT_H
#define FAKEINPUT_H

#include <iostream>
#include <sstream>
#include <string>

// While a FakeInput exists, std::cin reads from the text you give it
// instead of from the keyboard. When it goes out of scope, the keyboard
// is put back.
class FakeInput {
private:
    std::istringstream stream;
    std::streambuf* original;

public:
    explicit FakeInput(const std::string& text)
        : stream(text), original(std::cin.rdbuf(stream.rdbuf())) {}

    ~FakeInput() {
        std::cin.rdbuf(original);
    }

    FakeInput(const FakeInput&) = delete;
    FakeInput& operator=(const FakeInput&) = delete;
};

#endif
```

`Yahtzee in C++/04 The Turn/support/tests/test_input.cpp`

```cpp
#include "minitest.h"
#include "fakeinput.h"
#include "../Input.h"

#include <string>
#include <vector>

static std::string bits(const std::vector<bool>& v) {
    std::string text;
    for (std::size_t i = 0; i < v.size(); i++) {
        text += v[i] ? '1' : '0';
    }
    return text;
}

TEST(Input, TrimRemovesBothEnds) {
    EXPECT_EQ(trim("  a b \r\n"), "a b");
    EXPECT_EQ(trim("x"), "x");
    EXPECT_EQ(trim("   "), "");
    EXPECT_EQ(trim(""), "");
}

TEST(Input, ToLowerCopyChangesLettersOnly) {
    EXPECT_EQ(toLowerCopy("AbC 12!"), "abc 12!");
}

TEST(Input, ToLowerCopyLeavesTheOriginalAlone) {
    std::string original = "HELLO";
    std::string lowered = toLowerCopy(original);
    EXPECT_EQ(original, "HELLO");
    EXPECT_EQ(lowered, "hello");
}

TEST(Input, KeepersByNumber) {
    EXPECT_EQ(bits(parseKeepers("1 3 5", 5)), "10101");
    EXPECT_EQ(bits(parseKeepers("2", 5)), "01000");
}

TEST(Input, KeepersAll) {
    EXPECT_EQ(bits(parseKeepers("a", 5)), "11111");
    EXPECT_EQ(bits(parseKeepers("A", 5)), "11111");
    EXPECT_EQ(bits(parseKeepers("  a \r", 5)), "11111");
}

TEST(Input, KeepersNone) {
    EXPECT_EQ(bits(parseKeepers("", 5)), "00000");
    EXPECT_EQ(bits(parseKeepers("   ", 5)), "00000");
}

TEST(Input, KeepersIgnoreNumbersOutOfRange) {
    EXPECT_EQ(bits(parseKeepers("0 6 -1 99 2", 5)), "01000");
}

TEST(Input, KeepersStopAtTheFirstWord) {
    EXPECT_EQ(bits(parseKeepers("1 x 3", 5)), "10000");
}

TEST(Input, KeepersFollowTheDiceCount) {
    EXPECT_EQ(bits(parseKeepers("1 6", 6)), "100001");
    EXPECT_EQ(bits(parseKeepers("a", 3)), "111");
}

TEST(Input, ParseIntAcceptsWholeNumbers) {
    int v = 0;
    EXPECT_EQ(parseInt("42", v), true);
    EXPECT_EQ(v, 42);
    EXPECT_EQ(parseInt(" 7 \r", v), true);
    EXPECT_EQ(v, 7);
    EXPECT_EQ(parseInt("-5", v), true);
    EXPECT_EQ(v, -5);
}

TEST(Input, ParseIntRejectsEverythingElse) {
    int v = 99;
    EXPECT_EQ(parseInt("abc", v), false);
    EXPECT_EQ(parseInt("12abc", v), false);
    EXPECT_EQ(parseInt("3 4", v), false);
    EXPECT_EQ(parseInt("", v), false);
    EXPECT_EQ(v, 99);
}

TEST(Input, ReadLineReadsOneLineAtATime) {
    FakeInput in("first\nsecond\n");
    std::string line;
    EXPECT_EQ(readLine(line), true);
    EXPECT_EQ(line, "first");
    EXPECT_EQ(readLine(line), true);
    EXPECT_EQ(line, "second");
    EXPECT_EQ(readLine(line), false);
}

TEST(Input, AskIntAsksAgainUntilTheAnswerFits) {
    FakeInput in("abc\n99\n0\n7\n");
    int v = -1;
    EXPECT_EQ(askInt("? ", 1, 13, v), true);
    EXPECT_EQ(v, 7);
}

TEST(Input, AskIntGivesUpWhenInputEnds) {
    FakeInput in("abc\n");
    int v = -1;
    EXPECT_EQ(askInt("? ", 1, 13, v), false);
    EXPECT_EQ(v, -1);
}
```

`Yahtzee in C++/04 The Turn/support/tests/test_yesno.cpp`

```cpp
#include "minitest.h"
#include "../Input.h"

TEST(YesNo, AcceptsYes) {
    bool yes = false;
    EXPECT_EQ(parseYesNo("y", yes), true);
    EXPECT_EQ(yes, true);
    yes = false;
    EXPECT_EQ(parseYesNo("YES", yes), true);
    EXPECT_EQ(yes, true);
    yes = false;
    EXPECT_EQ(parseYesNo(" Yes \r", yes), true);
    EXPECT_EQ(yes, true);
}

TEST(YesNo, AcceptsNo) {
    bool yes = true;
    EXPECT_EQ(parseYesNo("n", yes), true);
    EXPECT_EQ(yes, false);
    yes = true;
    EXPECT_EQ(parseYesNo("No", yes), true);
    EXPECT_EQ(yes, false);
    yes = true;
    EXPECT_EQ(parseYesNo("NO", yes), true);
    EXPECT_EQ(yes, false);
}

TEST(YesNo, RejectsOtherWords) {
    bool yes = true;
    EXPECT_EQ(parseYesNo("maybe", yes), false);
    EXPECT_EQ(parseYesNo("yess", yes), false);
    EXPECT_EQ(parseYesNo("", yes), false);
    EXPECT_EQ(parseYesNo("y n", yes), false);
}

TEST(YesNo, LeavesTheAnswerAloneOnFailure) {
    bool yes = true;
    EXPECT_EQ(parseYesNo("nope", yes), false);
    EXPECT_EQ(yes, true);
    yes = false;
    EXPECT_EQ(parseYesNo("nope", yes), false);
    EXPECT_EQ(yes, false);
}
```

`Yahtzee in C++/04 The Turn/support/tests/test_dice_free.cpp`

```cpp
#include "minitest.h"
#include "../Dice.h"

#include <cstdlib>
#include <vector>

TEST(DiceFree, HeldDiceKeepTheirFaces) {
    std::srand(13);
    Dice d(60);
    std::vector<bool> hold(60, false);
    int before[60];
    for (std::size_t i = 0; i < d.size(); i++) {
        before[i] = d.face(i);
        hold[i] = (i % 2 == 0);
    }
    d.rollFree(hold);
    for (std::size_t i = 0; i < d.size(); i++) {
        if (hold[i]) {
            EXPECT_EQ(d.face(i), before[i]);
        }
        EXPECT_EQ(d.face(i) >= 1 && d.face(i) <= 6, true);
    }
}

TEST(DiceFree, FreeDiceGetNewFaces) {
    std::srand(17);
    Dice d(60);
    std::vector<bool> hold(60, false);
    int before[60];
    for (std::size_t i = 0; i < d.size(); i++) {
        before[i] = d.face(i);
    }
    d.rollFree(hold);
    int changed = 0;
    for (std::size_t i = 0; i < d.size(); i++) {
        if (d.face(i) != before[i]) {
            changed++;
        }
    }
    EXPECT_EQ(changed > 0, true);
}

TEST(DiceFree, EverythingHeldChangesNothing) {
    Dice d(5);
    std::vector<bool> hold(5, true);
    int before[5];
    for (std::size_t i = 0; i < d.size(); i++) {
        before[i] = d.face(i);
    }
    d.rollFree(hold);
    for (std::size_t i = 0; i < d.size(); i++) {
        EXPECT_EQ(d.face(i), before[i]);
    }
}
```

`Yahtzee in C++/04 The Turn/support/tests/test_turn.cpp`

```cpp
#include "minitest.h"
#include "fakeinput.h"
#include "../Turn.h"

#include <cstdlib>

static TurnOptions quiet() {
    TurnOptions options;
    options.animate = false;
    return options;
}

TEST(Turn, ChanceScoresTheDiceTotal) {
    std::srand(5);
    Dice dice(5);
    Scorecard card;
    FakeInput in("13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.isScored(12), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, BadAnswersAreAskedAgain) {
    std::srand(6);
    Dice dice(5);
    Scorecard card;
    FakeInput in("abc\n99\n-4\n13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, ARerollKeepsTheTurnGoing) {
    std::srand(7);
    Dice dice(5);
    Scorecard card;
    FakeInput in("0\n1 2 3 4 5\n13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, ThreeRollsAreAllowed) {
    std::srand(8);
    Dice dice(5);
    Scorecard card;
    FakeInput in("0\n1 2\n0\n\n13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, RerollsAreLimitedByTheOptions) {
    std::srand(9);
    Dice dice(5);
    Scorecard card;
    TurnOptions options = quiet();
    options.maxRolls = 1;
    FakeInput in("0\n13\n");
    EXPECT_EQ(playTurn(dice, card, options), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, ACategoryCannotBeScoredTwice) {
    std::srand(10);
    Dice dice(5);
    Scorecard card;
    int first = 0;
    {
        FakeInput in("13\n");
        EXPECT_EQ(playTurn(dice, card, quiet()), true);
        first = card.score(12);
    }
    {
        FakeInput in("13\n7\n");
        EXPECT_EQ(playTurn(dice, card, quiet()), true);
    }
    EXPECT_EQ(card.score(12), first);
    EXPECT_EQ(card.isScored(6), true);
}

TEST(Turn, EndOfInputStopsTheTurn) {
    Dice dice(5);
    Scorecard card;
    FakeInput in("");
    EXPECT_EQ(playTurn(dice, card, quiet()), false);
    EXPECT_EQ(card.total(), 0);
    EXPECT_EQ(card.isScored(12), false);
}
```

`Yahtzee in C++/04 The Turn/support/tests/test_game.cpp`

```cpp
#include "minitest.h"
#include "fakeinput.h"
#include "../Game.h"

#include <cstdlib>

static TurnOptions quiet() {
    TurnOptions options;
    options.animate = false;
    return options;
}

TEST(Game, ThirteenTurnsFinishTheGame) {
    std::srand(12);
    Dice dice(5);
    Scorecard card;
    FakeInput in("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n");
    EXPECT_EQ(playGame(dice, card, quiet()), true);
    EXPECT_EQ(card.allScored(), true);
}

TEST(Game, StopsWhenTheInputEnds) {
    std::srand(14);
    Dice dice(5);
    Scorecard card;
    FakeInput in("1\n2\n");
    EXPECT_EQ(playGame(dice, card, quiet()), false);
    EXPECT_EQ(card.allScored(), false);
    EXPECT_EQ(card.isScored(0), true);
    EXPECT_EQ(card.isScored(1), true);
    EXPECT_EQ(card.isScored(2), false);
}
```

Yes, two chapters remain. Chapter 05 is *Cleaner C++* and chapter 06 is *Players*. I'm adjusting chapter 05 first. `main` is already about 30 lines, so "splitting main" no longer teaches anything. It becomes four lessons: named categories, a table of rules, copies and moves, and compiling in pieces. I'm compiling the new code before writing it up.Chapter 05 is below. Everything in it compiled with `-Wall -Wextra -Wpedantic` and without warnings. The tests pass, and the finished game still plays a full round with `--fast`.

`Yahtzee in C++/05 Cleaner C++/01-named-categories.md`
````markdown
---
title: 5.1 — Named Categories
track: Cleaner C++
runtime: none
support: tests/test_category_ids.cpp, tests/test_upper_section.cpp
---

The scorecard works, but it is held together by numbers. Box 12 is Chance because a list of names and a `switch` were written in the same order, and nothing checks that they stay in step. In this lesson each category gets a name the compiler understands, and the compiler warns you when you forget one.

Press this lesson's support button first. It creates two test files.

## Give each category a name

Words first:

- **Enumeration**: a type whose values are a fixed list of named constants. Each name is an **enumerator**.
- **Scoped enumeration** (`enum class`): an enumeration whose enumerators live inside the type's name and never convert to a number or from one by accident.
- **Underlying type**: the integer type an enumeration is stored as. You can choose it with `: type` after the name.

Replace `Scorecard.h` with this.

```cpp file=Scorecard.h
#ifndef SCORECARD_H
#define SCORECARD_H

#include <cstddef>
#include <string>
#include <vector>

#include "Scoring.h"

enum class CategoryId : std::size_t {
    Ones,
    Twos,
    Threes,
    Fours,
    Fives,
    Sixes,
    ThreeOfAKind,
    FourOfAKind,
    FullHouse,
    SmallStraight,
    LargeStraight,
    Yahtzee,
    Chance,
    Count
};

struct Category {
    std::string name;
    int score;
};

class Scorecard {
public:
    static constexpr int UNSCORED = -1;
    static constexpr std::size_t CATEGORY_COUNT = static_cast<std::size_t>(CategoryId::Count);
    static constexpr int UPPER_BONUS_THRESHOLD = 63;
    static constexpr int UPPER_BONUS_POINTS = 35;

    Scorecard();

    std::size_t size() const;
    const std::string& name(std::size_t i) const;
    const std::string& name(CategoryId id) const;
    bool isScored(std::size_t i) const;
    bool isScored(CategoryId id) const;
    int score(std::size_t i) const;
    int score(CategoryId id) const;
    bool record(std::size_t i, const Counts& counts);
    bool record(CategoryId id, const Counts& counts);
    bool allScored() const;
    int total() const;
    int upperBonus() const;
    std::vector<Category> preview(const Counts& counts) const;

private:
    std::vector<Category> categories;
};

#endif
```

New lines:

- `enum class CategoryId : std::size_t {`: a new type named `CategoryId`. Each enumerator gets the next whole number, starting at 0. `Ones` is 0, `Twos` is 1, and `Chance` is 12. `: std::size_t` makes the underlying type `std::size_t`, the same type the vector uses for positions.
- Scoped means the enumerators are written `CategoryId::Chance`, and a bare `Chance` does not exist. A plain `enum` would put `Ones` and `Chance` into the surrounding scope, where they could collide with other names.
- There is no automatic conversion in either direction. `int x = CategoryId::Ones;` does not compile, and neither does `CategoryId id = 3;`. A box can no longer be mixed up with an arbitrary number by accident.
- `Count`: a last enumerator that is not a category. Because the numbering starts at 0, its value is the number of real categories, which is 13. This is a common habit, and it means the count updates itself when a category is added above it.
- `static_cast<std::size_t>(CategoryId::Count)`: the explicit way to turn an enumerator into its number. `CATEGORY_COUNT` is still `constexpr`, so it can be used wherever the compiler needs a constant, such as `static_assert`.
- `const std::string& name(CategoryId id) const;`: a second function with the same name as `name(std::size_t i)`. The compiler picks by argument type. A plain number such as `0` cannot convert to `CategoryId`, so `scorecard.name(0)` still calls the index version. The menu loop needs the index versions because it walks through positions.
- The same pairing is added for `isScored`, `score` and `record`.

## Use the names inside

Words first:

- **`switch` over an enumeration**: when every enumerator has its own `case` and there is no `default`, the compiler can tell you if one is missing.

Replace `Scorecard.cpp` with this.

```cpp file=Scorecard.cpp
#include "Scorecard.h"

static std::size_t indexOf(CategoryId id) {
    return static_cast<std::size_t>(id);
}

static int potentialFor(CategoryId id, const Counts& counts) {
    switch (id) {
        case CategoryId::Ones: return scoreUpper(counts, 1);
        case CategoryId::Twos: return scoreUpper(counts, 2);
        case CategoryId::Threes: return scoreUpper(counts, 3);
        case CategoryId::Fours: return scoreUpper(counts, 4);
        case CategoryId::Fives: return scoreUpper(counts, 5);
        case CategoryId::Sixes: return scoreUpper(counts, 6);
        case CategoryId::ThreeOfAKind: return scoreOfAKind(counts, 3);
        case CategoryId::FourOfAKind: return scoreOfAKind(counts, 4);
        case CategoryId::FullHouse: return scoreFullHouse(counts);
        case CategoryId::SmallStraight: return scoreSmallStraight(counts);
        case CategoryId::LargeStraight: return scoreLargeStraight(counts);
        case CategoryId::Yahtzee: return scoreYahtzee(counts);
        case CategoryId::Chance: return scoreChance(counts);
        case CategoryId::Count: return 0;
    }
    return 0;
}

Scorecard::Scorecard() {
    const char* const names[] = {
        "Ones", "Twos", "Threes", "Fours", "Fives", "Sixes",
        "Three of a kind", "Four of a kind", "Full house",
        "Small straight", "Large straight", "Yahtzee", "Chance",
    };
    static_assert(sizeof(names) / sizeof(names[0]) == CATEGORY_COUNT,
                  "one name is needed for every category");

    categories.reserve(CATEGORY_COUNT);
    for (std::size_t i = 0; i < CATEGORY_COUNT; i++) {
        categories.push_back(Category{names[i], UNSCORED});
    }
}

std::size_t Scorecard::size() const {
    return categories.size();
}

const std::string& Scorecard::name(std::size_t i) const {
    return categories[i].name;
}

const std::string& Scorecard::name(CategoryId id) const {
    return name(indexOf(id));
}

bool Scorecard::isScored(std::size_t i) const {
    return categories[i].score != UNSCORED;
}

bool Scorecard::isScored(CategoryId id) const {
    return isScored(indexOf(id));
}

int Scorecard::score(std::size_t i) const {
    return categories[i].score;
}

int Scorecard::score(CategoryId id) const {
    return score(indexOf(id));
}

bool Scorecard::record(std::size_t i, const Counts& counts) {
    if (i >= categories.size() || categories[i].score != UNSCORED) {
        return false;
    }
    categories[i].score = potentialFor(static_cast<CategoryId>(i), counts);
    return true;
}

bool Scorecard::record(CategoryId id, const Counts& counts) {
    return record(indexOf(id), counts);
}

bool Scorecard::allScored() const {
    for (const Category& c : categories) {
        if (c.score == UNSCORED) {
            return false;
        }
    }
    return true;
}

int Scorecard::total() const {
    int sum = 0;
    for (const Category& c : categories) {
        if (c.score != UNSCORED) {
            sum += c.score;
        }
    }
    return sum;
}

int Scorecard::upperBonus() const {
    int upper = 0;
    for (std::size_t i = 0; i < 6; i++) {
        if (categories[i].score != UNSCORED) {
            upper += categories[i].score;
        }
    }
    return upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0;
}

std::vector<Category> Scorecard::preview(const Counts& counts) const {
    std::vector<Category> shown = categories;
    for (std::size_t i = 0; i < shown.size(); i++) {
        if (shown[i].score == UNSCORED) {
            shown[i].score = potentialFor(static_cast<CategoryId>(i), counts);
        }
    }
    return shown;
}
```

Line by line, only the new parts:

- `static std::size_t indexOf(CategoryId id)`: the one place that turns a `CategoryId` into a position. `static` keeps it private to this file.
- `static int potentialFor(CategoryId id, ...)`: now takes the enumeration, not a number.
- `switch (id) {` with one `case` per enumerator and **no `default`**: this is on purpose. When you build with `-Wall`, the compiler warns `enumeration value 'Threes' not handled in switch` if someone adds a category and forgets its `case`. Writing a `default:` would silence that warning, so it is left out.
- `case CategoryId::Count: return 0;`: `Count` is not a real category, but it is an enumerator, so the switch is complete only if it is listed.
- `return 0;` after the switch: an enumeration with a fixed underlying type can hold any value of that type, such as `static_cast<CategoryId>(99)`. If that ever arrives, execution leaves the switch, and this line gives a defined result.
- `potentialFor(static_cast<CategoryId>(i), counts)`: turns a position into an enumerator. The conversion from number to enumeration is always explicit. In `record`, the bounds check above it has already guaranteed that `i` is a real position.
- `bool Scorecard::record(CategoryId id, ...) { return record(indexOf(id), counts); }`: the new overloads only convert and hand over to the index version. The logic stays in one place. `CategoryId::Count` becomes 13, which `record` rejects because it is not below `categories.size()`.

```predict
question: You add a 14th enumerator `Bonus` before Count, but forget to add its case in potentialFor. You build with -Wall. What happens?
choice: A compile error stops the build
choice: A warning names the enumerator that is not handled
choice: Nothing at all, the compiler stays silent
answer: A warning names the enumerator that is not handled
explain: A switch over an enumeration without a default is checked by -Wswitch, which -Wall switches on. It reports every enumerator without a case. It is a warning, not an error, so read the build output.
```

```predict
question: Existing code calls `card.record(3, counts)` with a plain number. Which function runs now that a CategoryId overload exists?
choice: record(CategoryId, ...), because 3 means Fours
choice: record(std::size_t, ...), because a number does not convert to CategoryId
choice: Neither: the call is ambiguous and does not compile
answer: record(std::size_t, ...), because a number does not convert to CategoryId
explain: An enum class never converts from an int by itself. Only the size_t overload can accept the 3, so the compiler picks it. This is why the old calls and the old tests kept working.
```

## Check that the game still plays

Build with warnings switched on:

```bash
g++ -std=c++17 -Wall -Wextra main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game
```

- `-Wall`: turns on the compiler's common warnings. The name is a little misleading, because it is not all of them.
- `-Wextra`: turns on a few more. A clean build prints nothing.

```check
run "g++ -std=c++17 -Wall -Wextra main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the game builds with warnings on" -- Read the first message. It names the file and the line.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="the game still plays to the end" -- The index versions of record, name and score are unchanged.
run "g++ -std=c++17 tests/test_category_ids.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_category_ids" label="the category tests build" -- Press the lesson's support button if tests/test_category_ids.cpp is missing.
tests "./test_category_ids" require="CategoryIds.NamesMatchTheIds" label="every id has the right name" -- The names must be listed in the same order as the enumerators.
tests "./test_category_ids" require="CategoryIds.CountIsNotACategory" label="Count is refused" -- record(CategoryId::Count, ...) must return false and change nothing.
```

## Your turn: which boxes are upper?

`upperBonus` still contains the loop `i < 6`, a number that only works because the upper boxes happen to come first. Fix that.

Add a free function `bool isUpperSection(CategoryId id)` to `Scorecard`. Declare it in `Scorecard.h` after the enumeration, and define it in `Scorecard.cpp`. It returns `true` for the six upper categories and `false` for every other enumerator, including `Count`. Write it as a `switch` that lists **every** enumerator and has no `default`. Then change `upperBonus` to loop over all boxes and use `isUpperSection(static_cast<CategoryId>(i))` instead of the number 6. The test file `tests/test_upper_section.cpp` is already in your project.

```check
matches Scorecard.h "bool[ ]+isUpperSection[ ]*[(][ ]*CategoryId" label="Scorecard.h declares isUpperSection" -- Take a CategoryId and return bool.
lacks Scorecard.cpp "i < 6" label="the magic number 6 is gone from upperBonus" -- Loop up to categories.size() and ask isUpperSection about each position.
run "g++ -std=c++17 -Wall -Wextra tests/test_upper_section.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_upper_section" label="the upper-section tests build" -- A free function declared in the header needs a definition in Scorecard.cpp.
tests "./test_upper_section" require="UpperSection.TheRestAreNot" label="the lower boxes are not upper" -- Return false for the seven other enumerators, Count included.
tests "./test_upper_section" require="UpperSection.BonusStillCountsOnlyTheUpperBoxes" label="the bonus still works" -- upperBonus must add only boxes for which isUpperSection is true.
```

```hints
nudge: Which question does the bonus ask about each box, and who should answer it?
concept: A switch that lists every enumerator can group several cases onto one return. Cases that share a body are written one under another with no code between them.
shape: In isUpperSection write six case labels (Ones to Sixes) followed by `return true;`, then the other seven (ThreeOfAKind to Count) followed by `return false;`, then `return false;` after the switch. In upperBonus loop `i` over every box and add its score when the box is upper and scored.
answer: One way to write it:
~~~cpp
// Scorecard.h — after the enum class
bool isUpperSection(CategoryId id);

// Scorecard.cpp
bool isUpperSection(CategoryId id) {
    switch (id) {
        case CategoryId::Ones:
        case CategoryId::Twos:
        case CategoryId::Threes:
        case CategoryId::Fours:
        case CategoryId::Fives:
        case CategoryId::Sixes:
            return true;
        case CategoryId::ThreeOfAKind:
        case CategoryId::FourOfAKind:
        case CategoryId::FullHouse:
        case CategoryId::SmallStraight:
        case CategoryId::LargeStraight:
        case CategoryId::Yahtzee:
        case CategoryId::Chance:
        case CategoryId::Count:
            return false;
    }
    return false;
}

// Scorecard.cpp — the loop inside upperBonus
for (std::size_t i = 0; i < categories.size(); i++) {
    if (isUpperSection(static_cast<CategoryId>(i)) && categories[i].score != UNSCORED) {
        upper += categories[i].score;
    }
}
~~~
```
````

`Yahtzee in C++/05 Cleaner C++/02-a-table-of-rules.md`
````markdown
---
title: 5.2 — A Table of Rules
runtime: none
support: tests/test_rule_table.cpp, tests/test_best_choice.cpp
---

Early in this series you tried to keep the scoring functions in a list and loop over them, and it did not work: the functions took different arguments, and a C++ list needs one signature. Lambdas fix that. In this lesson the names and the rules move into one table, and the `switch` and the separate list of names disappear.

Press this lesson's support button first. It creates two test files.

## One table, one place

Words first:

- **Lambda**: a small function written in the middle of other code, with no name: `[](int x) { return x * 2; }`.
- **Capture list**: the square brackets at the start of a lambda. They list the outside variables the lambda may use. `[]` means none.
- **`std::function<R(Args)>`**: a standard type that can hold any callable thing (a function, a lambda) that takes `Args` and returns `R`. You call it like a function.
- **Anonymous namespace**: `namespace { ... }` makes everything inside visible only to the current `.cpp` file.

Replace `Scorecard.cpp` with this. It includes the `isUpperSection` function you wrote in the last lesson.

```cpp file=Scorecard.cpp
#include <functional>

#include "Scorecard.h"

namespace {

struct Rule {
    const char* name;
    std::function<int(const Counts&)> score;
};

const Rule& ruleAt(std::size_t index) {
    static const Rule table[] = {
        {"Ones", [](const Counts& c) { return scoreUpper(c, 1); }},
        {"Twos", [](const Counts& c) { return scoreUpper(c, 2); }},
        {"Threes", [](const Counts& c) { return scoreUpper(c, 3); }},
        {"Fours", [](const Counts& c) { return scoreUpper(c, 4); }},
        {"Fives", [](const Counts& c) { return scoreUpper(c, 5); }},
        {"Sixes", [](const Counts& c) { return scoreUpper(c, 6); }},
        {"Three of a kind", [](const Counts& c) { return scoreOfAKind(c, 3); }},
        {"Four of a kind", [](const Counts& c) { return scoreOfAKind(c, 4); }},
        {"Full house", scoreFullHouse},
        {"Small straight", scoreSmallStraight},
        {"Large straight", scoreLargeStraight},
        {"Yahtzee", scoreYahtzee},
        {"Chance", scoreChance},
    };
    static_assert(sizeof(table) / sizeof(table[0]) == Scorecard::CATEGORY_COUNT,
                  "one rule is needed for every category");
    return table[index];
}

std::size_t indexOf(CategoryId id) {
    return static_cast<std::size_t>(id);
}

}  // namespace

bool isUpperSection(CategoryId id) {
    switch (id) {
        case CategoryId::Ones:
        case CategoryId::Twos:
        case CategoryId::Threes:
        case CategoryId::Fours:
        case CategoryId::Fives:
        case CategoryId::Sixes:
            return true;
        case CategoryId::ThreeOfAKind:
        case CategoryId::FourOfAKind:
        case CategoryId::FullHouse:
        case CategoryId::SmallStraight:
        case CategoryId::LargeStraight:
        case CategoryId::Yahtzee:
        case CategoryId::Chance:
        case CategoryId::Count:
            return false;
    }
    return false;
}

Scorecard::Scorecard() {
    categories.reserve(CATEGORY_COUNT);
    for (std::size_t i = 0; i < CATEGORY_COUNT; i++) {
        categories.push_back(Category{ruleAt(i).name, UNSCORED});
    }
}

std::size_t Scorecard::size() const {
    return categories.size();
}

const std::string& Scorecard::name(std::size_t i) const {
    return categories[i].name;
}

const std::string& Scorecard::name(CategoryId id) const {
    return name(indexOf(id));
}

bool Scorecard::isScored(std::size_t i) const {
    return categories[i].score != UNSCORED;
}

bool Scorecard::isScored(CategoryId id) const {
    return isScored(indexOf(id));
}

int Scorecard::score(std::size_t i) const {
    return categories[i].score;
}

int Scorecard::score(CategoryId id) const {
    return score(indexOf(id));
}

bool Scorecard::record(std::size_t i, const Counts& counts) {
    if (i >= categories.size() || categories[i].score != UNSCORED) {
        return false;
    }
    categories[i].score = ruleAt(i).score(counts);
    return true;
}

bool Scorecard::record(CategoryId id, const Counts& counts) {
    return record(indexOf(id), counts);
}

bool Scorecard::allScored() const {
    for (const Category& c : categories) {
        if (c.score == UNSCORED) {
            return false;
        }
    }
    return true;
}

int Scorecard::total() const {
    int sum = 0;
    for (const Category& c : categories) {
        if (c.score != UNSCORED) {
            sum += c.score;
        }
    }
    return sum;
}

int Scorecard::upperBonus() const {
    int upper = 0;
    for (std::size_t i = 0; i < categories.size(); i++) {
        if (isUpperSection(static_cast<CategoryId>(i)) && categories[i].score != UNSCORED) {
            upper += categories[i].score;
        }
    }
    return upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0;
}

std::vector<Category> Scorecard::preview(const Counts& counts) const {
    std::vector<Category> shown = categories;
    for (std::size_t i = 0; i < shown.size(); i++) {
        if (shown[i].score == UNSCORED) {
            shown[i].score = ruleAt(i).score(counts);
        }
    }
    return shown;
}
```

Line by line, only the new parts:

- `#include <functional>`: declares `std::function`.
- `namespace { ... }`: an anonymous namespace. Everything inside is private to this file, and that includes **types**. The keyword `static` cannot be put on a `struct`. If two `.cpp` files each defined a different `struct Rule`, the program would break in a way the compiler does not report. An anonymous namespace rules that out. `indexOf` moved inside it, so it no longer needs `static`.
- `struct Rule { const char* name; std::function<int(const Counts&)> score; };`: one row of the table. `name` points at the category's text. `score` holds anything that can be called with a `const Counts&` and returns an `int`. You call it like a function: `rule.score(counts)`. A `std::function` stores its callable behind a layer that hides the exact type, which costs a little time per call. Here the cost does not matter.
- `static const Rule table[] = { ... };` inside `ruleAt`: a variable inside a function that is marked `static` is built **once**, the first time the function runs, and then lives until the program ends. A table at file level would be built when the program starts, in an order across files that C++ does not fix. A `Scorecard` made in another file before the table existed would read garbage. Building on first use avoids that. Since C++11 this build is also safe if two threads arrive at once.
- `[](const Counts& c) { return scoreUpper(c, 1); }`: a lambda. `[]` is the capture list, empty here because the lambda uses nothing from outside. `(const Counts& c)` is its parameter list. `{ return ...; }` is its body. The return type is worked out from the `return`, which is `int`. This lambda is the fix for the problem from lesson 3.1: `scoreUpper` needs two arguments but every row of the table must take one, so the lambda fills in the face and presents one argument to the table.
- `{"Full house", scoreFullHouse}`: no lambda is needed here. `scoreFullHouse` already takes one `const Counts&` and returns an `int`, so the function name converts to a `std::function` directly.
- `static_assert(...)`: the same compile-time guard as before, now covering names and rules together. A missing row stops the build.
- `return table[index];`: not checked. It is only reached with an index below 13, because the constructor's loop, `record` and `preview` all guarantee that.
- `Category{ruleAt(i).name, UNSCORED}`: the constructor reads the name from the table. There is no second list of names to keep in step.
- `ruleAt(i).score(counts)`: finds row `i` and calls its function. This replaces the whole `potentialFor` switch. Name and rule for one category now sit on the same line.

The order of the rows still has to match the order of the enumerators in `CategoryId`. The tests below check that.

## What a lambda remembers

Words first:

- **Capture by value**: `[x]` copies `x` into the lambda at the moment the lambda is created.
- **Capture by reference**: `[&x]` lets the lambda use the original `x`. It is only safe while that original still exists.

```cpp
int bonus = 10;
auto addBonus = [bonus](int x) { return x + bonus; };
bonus = 99;
std::cout << addBonus(1) << "\n";
```

- `auto addBonus = ...`: every lambda has its own unnamed type, so `auto` is the way to hold one in a variable.
- `[bonus]` copies the 10 into the lambda when it is created. Changing `bonus` afterwards does not change the copy.

```predict
question: What does the code above print?
choice: 11
choice: 100
choice: It does not compile
answer: 11
explain: The capture [bonus] copied 10 when addBonus was created, so addBonus(1) is 1 + 10. With [&bonus] the lambda would use the original variable and print 100. A reference capture is dangerous if the lambda is kept after the variable is gone.
```

## Read the tests

The support button created `tests/test_rule_table.cpp`. Its job is to catch a row in the wrong place:

```cpp
static void checkHand(const Counts& c) {
    Scorecard s;
    std::vector<Category> shown = s.preview(c);
    for (std::size_t i = 0; i < Scorecard::CATEGORY_COUNT; i++) {
        EXPECT_EQ(shown[i].score, expectedFor(static_cast<CategoryId>(i), c));
    }
}
```

- `expectedFor` is a helper inside the test file. It calls the scoring functions directly, using a `switch` over `CategoryId`.
- For several hands, every row of the table must give the same number as the direct call. If the rows for Fours and Fives were swapped, a hand with different counts of those faces would fail.

```check
run "g++ -std=c++17 -Wall -Wextra main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the game builds with warnings on" -- The struct Rule and ruleAt must be inside the anonymous namespace.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="the game still plays to the end" -- record and preview must call ruleAt(i).score(counts).
run "g++ -std=c++17 -Wall -Wextra tests/test_rule_table.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_rule_table" label="the rule table tests build" -- Press the lesson's support button if tests/test_rule_table.cpp is missing.
tests "./test_rule_table" require="RuleTable.PreviewMatchesTheRulesForAFullHouse" label="the rows are in the right order" -- Every row must sit at the position of its CategoryId.
tests "./test_rule_table" require="RuleTable.RecordWritesTheSameScoreThatPreviewShowed" label="record agrees with preview" -- Both must call the same row of the table.
lacks Scorecard.cpp "potentialFor" label="the old switch is gone" -- Replace every call to potentialFor with ruleAt(i).score(counts).
```

## Your turn: the best box

Add `CategoryId bestChoice(const Counts& counts) const` to `Scorecard`. It returns the unscored box that would score the most points for these counts. If several boxes tie, it returns the one with the lowest position. If every box is already scored, it returns `CategoryId::Count`. Declare it in `Scorecard.h` and define it in `Scorecard.cpp`. The test file `tests/test_best_choice.cpp` is already in your project. Use `preview`. You do not need to call any rule directly.

```check
matches Scorecard.h "CategoryId[ ]+bestChoice[ ]*[(][ ]*const[ ]+Counts[ ]*&[^)]*[)][ ]*const" label="Scorecard.h declares bestChoice as const" -- It changes nothing, so it ends with const.
run "g++ -std=c++17 -Wall -Wextra tests/test_best_choice.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_best_choice" label="the best-choice tests build" -- Declare the function in Scorecard.h and define it in Scorecard.cpp.
tests "./test_best_choice" require="BestChoice.SkipsBoxesThatAreAlreadyScored" label="scored boxes are skipped" -- Preview shows real scores for scored boxes. Check isScored before comparing.
tests "./test_best_choice" require="BestChoice.TiesGoToTheLowestBox" label="ties go to the lowest box" -- Replace the best only when a score is strictly larger.
tests "./test_best_choice" require="BestChoice.EvenZeroPointsPicksALegalBox" label="a box worth zero is still a legal choice" -- Start the best score below zero so that a score of 0 still counts.
tests "./test_best_choice" require="BestChoice.FullCardGivesCount" label="a full card gives Count" -- Start with best set to CategoryId::Count and never change it if nothing qualifies.
```

```hints
nudge: What do you need to remember while you walk through the 13 boxes one after another?
concept: Keep two variables: the best category so far and its score. Start the score at -1, which is below any real score, and start the category at `CategoryId::Count` as the "nothing yet" answer. Use `>` and not `>=` so that an earlier box wins a tie.
shape: Call `preview(counts)`. Loop over every position. Skip it if `isScored(i)`. Otherwise, if its previewed score is bigger than the best so far, remember that score and `static_cast<CategoryId>(i)`. Return the best category.
answer: One way to write it:
~~~cpp
// Scorecard.h — inside the public: section
CategoryId bestChoice(const Counts& counts) const;

// Scorecard.cpp
CategoryId Scorecard::bestChoice(const Counts& counts) const {
    std::vector<Category> shown = preview(counts);
    CategoryId best = CategoryId::Count;
    int bestScore = -1;
    for (std::size_t i = 0; i < shown.size(); i++) {
        if (!isScored(i) && shown[i].score > bestScore) {
            bestScore = shown[i].score;
            best = static_cast<CategoryId>(i);
        }
    }
    return best;
}
~~~
```
````

`Yahtzee in C++/05 Cleaner C++/03-copies-and-moves.md`
````markdown
---
title: 5.3 — Copies and Moves
runtime: none
---

Every C++ program makes copies, and most of the time they are harmless. Sometimes a copy is a wasted effort, and C++ lets you replace it with a **move**. In this lesson you build a small scratch program that counts every copy and move, and you run experiments until you can predict them. This is a scratch file, separate from the game.

## A class that counts

Words first:

- **Copy constructor**: runs when a new object is made as a copy of an existing one. Its parameter is `const T&`.
- **Move constructor**: runs when a new object is made by taking the contents of an object that is about to be thrown away. Its parameter is `T&&`.
- **`T&&` (rvalue reference)**: a reference that binds to a temporary value, or to something you marked with `std::move`.
- **`std::move(x)`**: does not move anything. It only says "treat `x` as something that may be taken from". The move happens in whichever constructor or function then receives it.
- **Moved-from object**: an object whose contents were taken. It is still alive and may be destroyed or assigned to, but its value is no longer meaningful.
- **Copy elision**: the compiler builds an object directly where it is needed instead of copying it. Since C++17 this is **guaranteed** when a function returns a temporary.

Create `copies.cpp` in a new folder `scratch/`, next to your project.

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

The class:

- `inline static int constructs = 0;`: three counters that belong to the class, not to any object. `inline` lets a `static` data member be defined right here in the class. Without it (before C++17) each one needed a separate definition in a `.cpp` file.
- `explicit Noisy(int v) : value(v) { constructs++; }`: an ordinary constructor. It counts itself.
- `Noisy(const Noisy& other)`: the copy constructor. It copies the value and adds 1 to `copies`.
- `Noisy(Noisy&& other) noexcept`: the move constructor. `Noisy&&` binds only to a temporary or to something wrapped in `std::move`. It takes the value, counts a move, and sets `other.value` to -1 to show that `other` has been emptied. `noexcept` promises it will never throw. That promise matters for containers such as `std::vector`, which only move their elements when moving cannot fail.
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
````

`Yahtzee in C++/05 Cleaner C++/04-compiling-in-pieces.md`
````markdown
---
title: 5.4 — Compiling in Pieces
runtime: none
---

You have typed a nine-file `g++` command many times. This lesson looks at what that command does, so you can build faster and read the errors. You turn each `.cpp` file into an object file by itself, then link them. You also put the file list in a file so you never retype it.

## The stages

Words first:

- **Preprocessing**: the text step. `#include` pastes the named file in, and `#define` and `#ifdef` act on the text.
- **Compiling**: translating one preprocessed `.cpp` file into machine code. The result is an **object file**.
- **Object file**: machine code for one `.cpp` file. Calls to functions in other files are left as blank holes.
- **Linking**: joining object files into one program, filling each hole with the address of a definition.

The preprocessor's output can be seen. Run this and count the lines:

```bash
g++ -std=c++17 -E Die.cpp -o Die.i
```

- `-E`: stop after preprocessing and write the text out.
- `Die.cpp` is about 60 lines, but `Die.i` is around 25,000. Almost all of that is the standard library headers that `<string>` and `<cstdlib>` paste in. The compiler reads all of it for every `.cpp` file.

## Compile each file alone

Make a folder for the object files, then compile one file:

```bash
mkdir obj
g++ -std=c++17 -Wall -Wextra -c Die.cpp -o obj/Die.o
```

- `mkdir obj`: creates the folder. The command is the same on Windows, macOS and Linux.
- `-c`: compile only. Do not link. The result is an object file.
- `-o obj/Die.o`: the name of the output. The `.o` extension is a convention.

Compile the other eight the same way, then link all nine:

```bash
g++ obj/main.o obj/Game.o obj/Turn.o obj/Input.o obj/Scorecard.o obj/Scoring.o obj/Dice.o obj/Die.o obj/Terminal.o -o game_obj
```

- With only `.o` files on the line, `g++` does no compiling. It runs the linker and nothing else.
- Leave one object file out, such as `obj/Terminal.o`, and the link fails. You see lines like `undefined reference to 'clearScreen()'`. The compiler was happy with every file, and the hole could not be filled.

```predict
question: You change one line inside Die.cpp. How many of the nine object files must be rebuilt, before you link again?
choice: All nine
choice: Only Die.o
choice: None, linking is enough
answer: Only Die.o
explain: Each .cpp file compiles on its own. Die.o is the only object built from Die.cpp, so it is the only one that goes out of date. The other eight object files are still correct. This is the reason to build in pieces on a large project. (If you change a header, every .cpp file that includes it, directly or through other headers, has to be rebuilt.)
```

## One file for the list

Typing nine names is a chore, and a typo gives an error. `g++` can read options and file names from a text file when you write `@` in front of its name. Create `sources.txt`.

```text file=sources.txt
main.cpp
Game.cpp
Turn.cpp
Input.cpp
Scorecard.cpp
Scoring.cpp
Dice.cpp
Die.cpp
Terminal.cpp
```

Line by line:

- One file name per line. `g++` treats the lines as if you had typed them on the command line. This works the same way on every system.
- It is called a response file.

Build with it:

```bash
g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game
./game
```

- `-Wpedantic`: warns about anything that is not standard C++, such as an extension only some compilers accept. A clean build prints nothing.
- When you add a tenth `.cpp` file, add one line to `sources.txt` and nothing else changes.

```check
file sources.txt
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="the game builds from sources.txt" -- Every line of sources.txt must name a file that exists in this folder.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="the game still plays to the end" -- Nothing in the game changed. Only the build did.
```

## Your turn: build from object files

Build the game from object files, without using `sources.txt`:

1. Make a folder named `obj`.
2. Compile each of the nine `.cpp` files with `-c` into `obj/`, one object file per source file, named after it (`obj/Game.o` and so on).
3. Link the nine object files into a program named `game_obj`.

```check
dir obj label="the obj folder exists" -- mkdir obj
file obj/main.o label="main.o exists" -- g++ -std=c++17 -c main.cpp -o obj/main.o
file obj/Game.o label="Game.o exists" -- g++ -std=c++17 -c Game.cpp -o obj/Game.o
file obj/Turn.o label="Turn.o exists" -- g++ -std=c++17 -c Turn.cpp -o obj/Turn.o
file obj/Input.o label="Input.o exists" -- g++ -std=c++17 -c Input.cpp -o obj/Input.o
file obj/Scorecard.o label="Scorecard.o exists" -- g++ -std=c++17 -c Scorecard.cpp -o obj/Scorecard.o
file obj/Scoring.o label="Scoring.o exists" -- g++ -std=c++17 -c Scoring.cpp -o obj/Scoring.o
file obj/Dice.o label="Dice.o exists" -- g++ -std=c++17 -c Dice.cpp -o obj/Dice.o
file obj/Die.o label="Die.o exists" -- g++ -std=c++17 -c Die.cpp -o obj/Die.o
file obj/Terminal.o label="Terminal.o exists" -- g++ -std=c++17 -c Terminal.cpp -o obj/Terminal.o
run "./game_obj --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="game_obj plays to the end" -- Link with: g++ obj/main.o obj/Game.o obj/Turn.o obj/Input.o obj/Scorecard.o obj/Scoring.o obj/Dice.o obj/Die.o obj/Terminal.o -o game_obj
```

```hints
nudge: Which flag stops g++ before it links, and what does it need to be told about the output name?
concept: `-c` compiles one source file into one object file, and `-o` names the result. A command that lists only .o files links them into a program.
shape: Run nine commands of the form `g++ -std=c++17 -c NAME.cpp -o obj/NAME.o`, one for each source file. Then run one command that lists the nine .o files and ends with `-o game_obj`.
answer: The commands:
~~~bash
mkdir obj
g++ -std=c++17 -c main.cpp -o obj/main.o
g++ -std=c++17 -c Game.cpp -o obj/Game.o
g++ -std=c++17 -c Turn.cpp -o obj/Turn.o
g++ -std=c++17 -c Input.cpp -o obj/Input.o
g++ -std=c++17 -c Scorecard.cpp -o obj/Scorecard.o
g++ -std=c++17 -c Scoring.cpp -o obj/Scoring.o
g++ -std=c++17 -c Dice.cpp -o obj/Dice.o
g++ -std=c++17 -c Die.cpp -o obj/Die.o
g++ -std=c++17 -c Terminal.cpp -o obj/Terminal.o
g++ obj/main.o obj/Game.o obj/Turn.o obj/Input.o obj/Scorecard.o obj/Scoring.o obj/Dice.o obj/Die.o obj/Terminal.o -o game_obj
~~~
```
````

`Yahtzee in C++/05 Cleaner C++/support/tests/test_category_ids.cpp`
````cpp
#include "minitest.h"
#include "../Scorecard.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(CategoryIds, CountMatchesTheCard) {
    Scorecard s;
    EXPECT_EQ(static_cast<std::size_t>(CategoryId::Count), 13u);
    EXPECT_EQ(Scorecard::CATEGORY_COUNT, 13u);
    EXPECT_EQ(s.size(), static_cast<std::size_t>(CategoryId::Count));
}

TEST(CategoryIds, NamesMatchTheIds) {
    Scorecard s;
    EXPECT_EQ(s.name(CategoryId::Ones), "Ones");
    EXPECT_EQ(s.name(CategoryId::Sixes), "Sixes");
    EXPECT_EQ(s.name(CategoryId::ThreeOfAKind), "Three of a kind");
    EXPECT_EQ(s.name(CategoryId::FourOfAKind), "Four of a kind");
    EXPECT_EQ(s.name(CategoryId::FullHouse), "Full house");
    EXPECT_EQ(s.name(CategoryId::SmallStraight), "Small straight");
    EXPECT_EQ(s.name(CategoryId::LargeStraight), "Large straight");
    EXPECT_EQ(s.name(CategoryId::Yahtzee), "Yahtzee");
    EXPECT_EQ(s.name(CategoryId::Chance), "Chance");
}

TEST(CategoryIds, RecordByIdAndByIndexAgree) {
    Scorecard s;
    EXPECT_EQ(s.record(CategoryId::Chance, hand(1, 2, 3, 4, 6)), true);
    EXPECT_EQ(s.score(12), 16);
    EXPECT_EQ(s.score(CategoryId::Chance), 16);
    EXPECT_EQ(s.isScored(CategoryId::Chance), true);
    EXPECT_EQ(s.isScored(CategoryId::Yahtzee), false);
}

TEST(CategoryIds, CountIsNotACategory) {
    Scorecard s;
    EXPECT_EQ(s.record(CategoryId::Count, hand(1, 2, 3, 4, 5)), false);
    EXPECT_EQ(s.total(), 0);
}

TEST(CategoryIds, EachIdScoresItsOwnRule) {
    Scorecard s;
    Counts sixes = hand(6, 6, 6, 6, 6);
    s.record(CategoryId::Yahtzee, sixes);
    s.record(CategoryId::Sixes, sixes);
    s.record(CategoryId::Ones, sixes);
    EXPECT_EQ(s.score(CategoryId::Yahtzee), 50);
    EXPECT_EQ(s.score(CategoryId::Sixes), 30);
    EXPECT_EQ(s.score(CategoryId::Ones), 0);
}
````

`Yahtzee in C++/05 Cleaner C++/support/tests/test_upper_section.cpp`
````cpp
#include "minitest.h"
#include "../Scorecard.h"

TEST(UpperSection, TheFirstSixAreUpper) {
    EXPECT_EQ(isUpperSection(CategoryId::Ones), true);
    EXPECT_EQ(isUpperSection(CategoryId::Twos), true);
    EXPECT_EQ(isUpperSection(CategoryId::Threes), true);
    EXPECT_EQ(isUpperSection(CategoryId::Fours), true);
    EXPECT_EQ(isUpperSection(CategoryId::Fives), true);
    EXPECT_EQ(isUpperSection(CategoryId::Sixes), true);
}

TEST(UpperSection, TheRestAreNot) {
    EXPECT_EQ(isUpperSection(CategoryId::ThreeOfAKind), false);
    EXPECT_EQ(isUpperSection(CategoryId::FourOfAKind), false);
    EXPECT_EQ(isUpperSection(CategoryId::FullHouse), false);
    EXPECT_EQ(isUpperSection(CategoryId::SmallStraight), false);
    EXPECT_EQ(isUpperSection(CategoryId::LargeStraight), false);
    EXPECT_EQ(isUpperSection(CategoryId::Yahtzee), false);
    EXPECT_EQ(isUpperSection(CategoryId::Chance), false);
    EXPECT_EQ(isUpperSection(CategoryId::Count), false);
}

TEST(UpperSection, BonusStillCountsOnlyTheUpperBoxes) {
    Scorecard s;
    Counts threes{};
    for (int face = 1; face <= 6; face++) {
        threes.fill(0);
        threes[face] = 3;
        s.record(static_cast<std::size_t>(face - 1), threes);
    }
    EXPECT_EQ(s.upperBonus(), 35);

    Scorecard t;
    Counts five{};
    five[6] = 5;
    t.record(CategoryId::Yahtzee, five);
    t.record(CategoryId::Chance, five);
    EXPECT_EQ(t.upperBonus(), 0);
}
````

`Yahtzee in C++/05 Cleaner C++/support/tests/test_rule_table.cpp`
````cpp
#include "minitest.h"
#include "../Scorecard.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

static int expectedFor(CategoryId id, const Counts& c) {
    switch (id) {
        case CategoryId::Ones: return scoreUpper(c, 1);
        case CategoryId::Twos: return scoreUpper(c, 2);
        case CategoryId::Threes: return scoreUpper(c, 3);
        case CategoryId::Fours: return scoreUpper(c, 4);
        case CategoryId::Fives: return scoreUpper(c, 5);
        case CategoryId::Sixes: return scoreUpper(c, 6);
        case CategoryId::ThreeOfAKind: return scoreOfAKind(c, 3);
        case CategoryId::FourOfAKind: return scoreOfAKind(c, 4);
        case CategoryId::FullHouse: return scoreFullHouse(c);
        case CategoryId::SmallStraight: return scoreSmallStraight(c);
        case CategoryId::LargeStraight: return scoreLargeStraight(c);
        case CategoryId::Yahtzee: return scoreYahtzee(c);
        case CategoryId::Chance: return scoreChance(c);
        case CategoryId::Count: return -999;
    }
    return -999;
}

static void checkHand(const Counts& c) {
    Scorecard s;
    std::vector<Category> shown = s.preview(c);
    for (std::size_t i = 0; i < Scorecard::CATEGORY_COUNT; i++) {
        EXPECT_EQ(shown[i].score, expectedFor(static_cast<CategoryId>(i), c));
    }
}

TEST(RuleTable, PreviewMatchesTheRulesForAFullHouse) {
    checkHand(hand(2, 2, 3, 3, 3));
}

TEST(RuleTable, PreviewMatchesTheRulesForAStraight) {
    checkHand(hand(1, 2, 3, 4, 5));
    checkHand(hand(2, 3, 4, 5, 6));
}

TEST(RuleTable, PreviewMatchesTheRulesForYahtzee) {
    checkHand(hand(4, 4, 4, 4, 4));
}

TEST(RuleTable, PreviewMatchesTheRulesForNothingSpecial) {
    checkHand(hand(1, 1, 2, 5, 6));
}

TEST(RuleTable, RecordWritesTheSameScoreThatPreviewShowed) {
    Scorecard s;
    Counts c = hand(5, 5, 5, 2, 2);
    std::vector<Category> shown = s.preview(c);
    for (std::size_t i = 0; i < s.size(); i++) {
        EXPECT_EQ(s.record(i, c), true);
        EXPECT_EQ(s.score(i), shown[i].score);
    }
}
````

`Yahtzee in C++/05 Cleaner C++/support/tests/test_best_choice.cpp`
````cpp
#include "minitest.h"
#include "../Scorecard.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(BestChoice, FiveOfAKindPicksYahtzee) {
    Scorecard s;
    EXPECT_EQ(s.bestChoice(hand(6, 6, 6, 6, 6)) == CategoryId::Yahtzee, true);
}

TEST(BestChoice, SkipsBoxesThatAreAlreadyScored) {
    Scorecard s;
    Counts sixes = hand(6, 6, 6, 6, 6);
    s.record(CategoryId::Yahtzee, sixes);
    EXPECT_EQ(s.bestChoice(sixes) == CategoryId::Sixes, true);
}

TEST(BestChoice, TiesGoToTheLowestBox) {
    Scorecard s;
    Counts sixes = hand(6, 6, 6, 6, 6);
    s.record(CategoryId::Yahtzee, sixes);
    CategoryId best = s.bestChoice(sixes);
    EXPECT_EQ(static_cast<std::size_t>(best), 5u);
}

TEST(BestChoice, AStraightPicksTheLargeStraight) {
    Scorecard s;
    EXPECT_EQ(s.bestChoice(hand(1, 2, 3, 4, 5)) == CategoryId::LargeStraight, true);
}

TEST(BestChoice, EvenZeroPointsPicksALegalBox) {
    Scorecard s;
    Counts any = hand(1, 2, 3, 4, 5);
    for (std::size_t i = 0; i < s.size(); i++) {
        if (i != 10 && i != 11) {
            s.record(i, any);
        }
    }
    EXPECT_EQ(s.bestChoice(hand(1, 1, 2, 2, 3)) == CategoryId::LargeStraight, true);
}

TEST(BestChoice, FullCardGivesCount) {
    Scorecard s;
    Counts any = hand(1, 2, 3, 4, 5);
    for (std::size_t i = 0; i < s.size(); i++) {
        s.record(i, any);
    }
    EXPECT_EQ(s.bestChoice(any) == CategoryId::Count, true);
}
````

CONTINUE FROM: Yahtzee in C++/06 Players/01-the-player-class.md
