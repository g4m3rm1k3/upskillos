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
