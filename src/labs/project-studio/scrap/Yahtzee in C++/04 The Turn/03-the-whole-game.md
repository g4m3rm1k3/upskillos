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


## Update Game.cpp

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
