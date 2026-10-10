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


## Update Terminal.cpp

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


## Update Dice.cpp

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
