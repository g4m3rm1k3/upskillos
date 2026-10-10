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
