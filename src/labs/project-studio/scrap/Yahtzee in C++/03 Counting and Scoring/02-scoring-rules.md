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
