---
title: 6.1 — The Player Class
track: Players
runtime: none
support: tests/test_player.cpp, tests/test_player_summary.cpp
---

So far one person plays alone, and the scorecard is just a variable in `main`. A game with several people needs something that owns a name and a scorecard together. In this lesson a `Player` class does that. You see one class holding another, you use `std::move` in a real constructor, and you write two versions of one function that differ only by `const`.

Press this lesson's support button first. It creates two test files.

## Describe a Player

Words first:

- **Composition**: a class that has another class as one of its members. A `Player` _has a_ `Scorecard`.
- **Const overload**: two member functions with the same name and parameters, where one ends in `const` and the other does not. The compiler picks one by whether the object itself is `const`.

Create `Player.h`.

Line by line:

- `#include "Scorecard.h"`: the class stores a `Scorecard` **by value**, so the compiler must know its full definition to work out how big a `Player` is.
- `explicit Player(std::string name);`: the parameter has no `&`, on purpose. A `Player` keeps its name, so it needs its own copy anyway. A by-value parameter gives it one. If the caller passes a temporary, such as the text `"Ann"`, the text is built straight into the parameter and nothing is copied.
- `const std::string& name() const;`: returns a reference to the stored name, so no text is copied. It is only valid while the `Player` exists.
- `Scorecard& scorecard();` and `const Scorecard& scorecard() const;`: the same name twice. The only difference is the `const` after the parentheses. On a plain `Player` the first one runs and gives you a reference you can change the scorecard through. On a `const Player&` the second one runs and gives a read-only reference. One name serves both a function that records scores and a function that only reads them.
- `int finalScore() const;`: the total plus the upper bonus. The rule for a final score lives in one place.
- `std::string playerName;` and `Scorecard card;`: the private data. They are values, not pointers, so each `Player` owns its own scorecard. They are created and destroyed together with it. The name is `playerName` because `name` is already the name of a function.

```cpp file=Player.h
#ifndef PLAYER_H
#define PLAYER_H

#include <string>

#include "Scorecard.h"

class Player {
public:
    explicit Player(std::string name);

    const std::string& name() const;
    Scorecard& scorecard();
    const Scorecard& scorecard() const;
    int finalScore() const;

private:
    std::string playerName;
    Scorecard card;
};

#endif
```
## Define a Player

Create `Player.cpp`.

Line by line:

- `#include <utility>`: declares `std::move`.
- `: playerName(std::move(name)) {}`: the member initializer list. The parameter `name` is already a private copy, so `std::move(name)` lets `playerName` take its characters instead of copying them a second time. This is the move from lesson 5.3 in real use. After that line `name` is a moved-from string, and it is never used again.
- `card` is not in the list. A member that is not mentioned is default-constructed, so `Scorecard()` runs and builds 13 empty boxes. Members are always built in the order they are **declared** in the class, not the order of the list.
- The two `scorecard()` definitions: `const` goes after the parameter list again. Both return `card` itself, not a copy.
- `card.total() + card.upperBonus()`: the final score.
- `Player` declares no destructor and no copy or move functions. The compiler writes correct ones, because its members (a string and a scorecard) already know how to copy and move themselves. That is the rule of zero from lesson 5.3.

```cpp file=Player.cpp
#include <utility>

#include "Player.h"

Player::Player(std::string name) : playerName(std::move(name)) {}

const std::string& Player::name() const {
    return playerName;
}

Scorecard& Player::scorecard() {
    return card;
}

const Scorecard& Player::scorecard() const {
    return card;
}

int Player::finalScore() const {
    return card.total() + card.upperBonus();
}
```

```predict
question: A function takes `const Player& p` and calls p.scorecard(). Which version runs?
choice: The non-const one, because it is listed first
choice: The const one, because p is a const reference
choice: Neither, the call does not compile
answer: The const one, because p is a const reference
explain: The compiler looks at the const-ness of the object the function is called on. A const Player can only call const member functions, so the const version runs and returns a read-only Scorecard.
```

```predict
question: You write `Player b = a;`, then record a score in b's scorecard. Does a's scorecard change?
choice: Yes, a and b share one scorecard
choice: No, b got its own copy of the scorecard
choice: It depends on the score
answer: No, b got its own copy of the scorecard
explain: The Player is held by value and so is its Scorecard member. The compiler-written copy constructor copies the name and the whole scorecard, so the two players are independent.
```

## Add it to the build

Add `Player.cpp` to the end of `sources.txt`.

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
Player.cpp
```

## Use it in main

The game is still for one person, so `Game.h` and `Game.cpp` do not change. Only `main` does. Replace `main.cpp` with this.

New lines:

- `Player player("You");`: the text `"You"` builds a `std::string` for the constructor's parameter, and the constructor moves it into `playerName`.
- `player.scorecard()`: `player` is not const, so this is the non-const version. It returns a `Scorecard&` to the player's own scorecard, which `playGame` changes in place.
- `player.finalScore()`: the total plus the bonus.

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <string>

#include "Dice.h"
#include "Game.h"
#include "Input.h"
#include "Player.h"
#include "Turn.h"

int main(int argc, char* argv[]) {
    TurnOptions options;

    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--fast") {
            options.animate = false;
        } else if (arg == "--rolls") {
            int rolls = 0;
            if (i + 1 >= argc || !parseInt(argv[i + 1], rolls) || rolls < 1 || rolls > 3) {
                std::cerr << "--rolls needs a whole number from 1 to 3\n";
                return 2;
            }
            options.maxRolls = rolls;
            i++;
        }
    }

    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    Player player("You");

    if (!playGame(dice, player.scorecard(), options)) {
        std::cout << "\nInput ended before the game finished.\n";
        return 1;
    }
    std::cout << player.name() << " finished with " << player.finalScore() << " points.\n";
    return 0;
}
```

```bash
g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game
./game
```

```check
file Player.h
file Player.cpp
contains sources.txt "Player.cpp" label="Player.cpp is in sources.txt" -- Add a line with Player.cpp to sources.txt.
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="the game builds with Player" -- Read the first error. It names the file and the line.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="You finished with" label="the player's name and score are printed" -- Print the name and finalScore() after playGame returns.
run "g++ -std=c++17 -Wall -Wextra tests/test_player.cpp Player.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_player" label="the player tests build" -- Press the lesson's support button if tests/test_player.cpp is missing.
tests "./test_player" require="Player.PlayersDoNotShareScorecards" label="two players have separate scorecards" -- Each Player must hold its own Scorecard by value.
tests "./test_player" require="Player.FinalScoreIncludesTheUpperBonus" label="the final score includes the bonus" -- Add upperBonus() to total().
```

## Read the tests

One test shows why `Scorecard` is held by value:

```cpp
TEST(Player, PlayersDoNotShareScorecards) {
    Player a("A");
    Player b("B");
    a.scorecard().record(12, hand(1, 2, 3, 4, 6));
    EXPECT_EQ(a.scorecard().isScored(12), true);
    EXPECT_EQ(b.scorecard().isScored(12), false);
    EXPECT_EQ(b.finalScore(), 0);
}
```

- `hand(...)` is the same helper as in the scorecard tests. It builds the counts for a chosen hand.
- Box 12 is Chance. It is filled for `a` and still empty for `b`.
- Other tests check the copy behaviour from the prediction above, and that a `const Player&` can read its scorecard.

## Prefer owned values for ordinary state {#teaching-review}

**Try it yourself.** Trace a Player containing its own name and Scorecard. Copy the Player, change only the copy’s card, and compare both totals. Returning a borrowed name or scorecard view does not transfer ownership; identify the lifetime keeping each view valid. Keep the Rule of Zero instead of writing raw-pointer ownership by hand.

**Explain before continuing.** Why might one getter return const Scorecard& while another offers a mutable reference? Which callers should receive mutation permission?

Write down your prediction, observation and the reason for any difference. Restore deliberate faults before continuing. Passing supplied tests is evidence for their cases, not proof that every behavior or explanation is correct.

## Your turn: a one-line summary

Add `std::string summary() const` to `Player`. It returns the name, a colon and a space, the final score, and the word `points`, for example `Ada: 66 points`. Declare it in `Player.h` and define it in `Player.cpp`. Turn the number into text with `std::to_string`. The test file `tests/test_player_summary.cpp` is already in your project. The next lesson uses `summary()` to show the scores.

```check
matches Player.h "std::string[ ]+summary[ ]*[(][ ]*[)][ ]*const" label="Player.h declares summary as const" -- It changes nothing, so it ends with const.
run "g++ -std=c++17 -Wall -Wextra tests/test_player_summary.cpp Player.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_player_summary" label="the summary tests build" -- Declare the function in Player.h and define it in Player.cpp.
tests "./test_player_summary" require="PlayerSummary.ShowsNameAndScore" label="the summary shows name and score" -- Join the name, ": ", the number as text, and " points".
tests "./test_player_summary" require="PlayerSummary.WorksOnAConstPlayer" label="summary works on a const Player" -- A const object can only call const member functions, and finalScore is one.
```

```hints
nudge: Which three pieces of text do you join, and which one is a number?
concept: `std::to_string(n)` turns a number into a std::string. A std::string can be joined with `+` to another string or to a quoted text, so start the chain from the std::string member `playerName`.
shape: Return `playerName + ": " + std::to_string(finalScore()) + " points"`. The function does not change the player, so it is const.
answer: One way to write it:
~~~cpp
// Player.h — inside the public: section
std::string summary() const;

// Player.cpp
std::string Player::summary() const {
    return playerName + ": " + std::to_string(finalScore()) + " points";
}
~~~
```
