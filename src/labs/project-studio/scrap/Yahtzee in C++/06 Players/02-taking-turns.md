---
title: 6.2 — Taking Turns
runtime: none
support: tests/test_players_game.cpp, tests/test_unique_names.cpp
---

With a `Player` class, a game can have several people. In this lesson the game asks how many are playing and what they are called, then lets them take turns until every scorecard is full. You work with a `std::vector` of your own class: filling it, looping over it by reference, and skipping entries.

Press this lesson's support button first. It creates two test files.

## Describe the game

Words first:

- **Round**: one turn for every player, in the order they were added.

Replace `Game.h` with this.

Line by line:

- `bool readPlayers(std::vector<Player>& players);`: asks who is playing and fills `players`. The vector is an output parameter, so the function writes into the caller's vector. It returns `false` if input ends first.
- `bool playGame(Dice& dice, std::vector<Player>& players, const TurnOptions& options);`: the vector of players replaces the single scorecard. It is non-const because turns change the players' scorecards.

```cpp file=Game.h
#ifndef GAME_H
#define GAME_H

#include <vector>

#include "Dice.h"
#include "Player.h"
#include "Turn.h"

bool readPlayers(std::vector<Player>& players);
bool playGame(Dice& dice, std::vector<Player>& players, const TurnOptions& options);

#endif
```
## Write the game

Replace `Game.cpp` with this.

```cpp file=Game.cpp
#include <iostream>
#include <string>
#include <utility>

#include "Game.h"
#include "Input.h"

static bool allFinished(const std::vector<Player>& players) {
    for (const Player& player : players) {
        if (!player.scorecard().allScored()) {
            return false;
        }
    }
    return true;
}

bool readPlayers(std::vector<Player>& players) {
    int count = 0;
    if (!askInt("How many players (1 to 4)? ", 1, 4, count)) {
        return false;
    }

    players.clear();
    players.reserve(static_cast<std::size_t>(count));
    for (int i = 1; i <= count; i++) {
        std::cout << "Name for player " << i << " (Enter for Player " << i << "): ";
        std::string line;
        if (!readLine(line)) {
            return false;
        }
        std::string name = trim(line);
        if (name.empty()) {
            name = "Player " + std::to_string(i);
        }
        players.emplace_back(std::move(name));
    }
    return true;
}

bool playGame(Dice& dice, std::vector<Player>& players, const TurnOptions& options) {
    while (!allFinished(players)) {
        for (Player& player : players) {
            if (player.scorecard().allScored()) {
                continue;
            }
            if (options.animate) {
                std::cout << "\n";
                for (const Player& other : players) {
                    std::cout << other.summary() << "\n";
                }
                std::cout << player.name() << ", press Enter to roll...";
                std::string line;
                if (!readLine(line)) {
                    return false;
                }
            } else {
                std::cout << "\n" << player.name() << "'s turn\n";
            }
            if (!playTurn(dice, player.scorecard(), options)) {
                return false;
            }
        }
    }

    std::cout << "Game over.\n";
    for (const Player& player : players) {
        std::cout << player.summary() << "\n";
    }
    return true;
}
```

`allFinished`:

- `static bool allFinished(...)`: private to this file. It takes `const std::vector<Player>&`, so there is no copy and no change.
- `for (const Player& player : players)`: `player` is a read-only reference to each element. Because it is const, `player.scorecard()` runs the **const** overload from the last lesson.

`readPlayers`:

- `askInt("How many players (1 to 4)? ", 1, 4, count)`: the helper from lesson 4.1 asks until the answer fits.
- `players.clear();`: empties the vector, in case it was filled before.
- `players.reserve(...)`: makes room for `count` players up front. Without it the vector may have to move its players into a bigger block as it grows. A `Player`'s compiler-written move is cheap, but it is still wasted work.
- `static_cast<std::size_t>(count)`: `reserve` takes an unsigned count.
- `std::string name = trim(line);`: removes stray spaces and a Windows `\r`.
- `"Player " + std::to_string(i)`: a quoted text plus a `std::string` is allowed. If nothing was typed the player is called `Player 1`, `Player 2` and so on.
- `players.emplace_back(std::move(name));`: `emplace_back` passes its arguments to `Player`'s constructor and builds the `Player` **inside** the vector, with no copy. `std::move(name)` hands the string over, because `name` is not used again. This also works with an `explicit` constructor. `push_back("Ann")` would not.

`playGame`:

- `while (!allFinished(players)) {`: keeps playing rounds until everyone's card is full. Every player starts empty and fills one box per turn, so they finish in the same round.
- `for (Player& player : players) {`: **with** the `&`, `player` is the real `Player` in the vector. Without it, `player` would be a copy and the scores would be recorded on the copy and thrown away.
- `if (player.scorecard().allScored()) { continue; }`: `continue` skips to the next player. A player whose card is already full cannot take a turn, and it would otherwise loop forever asking for a free box.
- `options.animate` branch: prints everyone's score line with `other.summary()` (the function from your last turn), then waits for the current player to press Enter. The variable is called `other` so that it does not hide `player`.
- Fast branch: prints whose turn it is, with no pause.
- `playTurn(dice, player.scorecard(), options)`: `player` is not const, so this is the non-const overload. The same `dice` object is shared by everyone, and each turn starts with `rollAll()`.
- The last lines print `Game over.` and every player's summary.

## Set up the players in main

Replace `main.cpp` with this.

New lines:

- `std::vector<Player> players;`: empty. `readPlayers(players)` fills it through the reference.
- A failure in either step prints a message and returns 1, the same exit status as before.

The test from lesson 4.3, `tests/test_game.cpp`, tests the old one-scorecard `playGame` and no longer compiles. Delete that file. The new tests are in `tests/test_players_game.cpp`.

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <string>
#include <vector>

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
    std::vector<Player> players;

    if (!readPlayers(players)) {
        std::cout << "\nInput ended before the game started.\n";
        return 1;
    }
    if (!playGame(dice, players, options)) {
        std::cout << "\nInput ended before the game finished.\n";
        return 1;
    }
    return 0;
}
```

```predict
question: Inside playGame you change `for (Player& player : players)` to `for (Player player : players)`, with no &. The game is played. What happens to the scorecards in the vector?
choice: They are filled in as before
choice: They stay empty, because each turn was recorded on a copy
choice: The program does not compile
answer: They stay empty, because each turn was recorded on a copy
explain: Without the &, player is a new Player copied from the element. playTurn records on that copy's scorecard, and the copy is thrown away at the end of each pass. The real players never change, so the game would also never finish.
```

```bash
g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game
./game
```

```check
missing tests/test_game.cpp label="the old game test is deleted" -- Delete tests/test_game.cpp. It tests the one-scorecard version of playGame.
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="the multi-player game builds" -- Game.h, Game.cpp and main.cpp must all use std::vector<Player>.
run "./game --fast" stdin="2\nAnn\nBo\n1\n1\n2\n2\n3\n3\n4\n4\n5\n5\n6\n6\n7\n7\n8\n8\n9\n9\n10\n10\n11\n11\n12\n12\n13\n13\n" stdout="Game over." label="two players finish a game" -- The turns alternate, so each box number is typed once for each player.
run "./game --fast" stdin="2\nAnn\nBo\n1\n1\n2\n2\n3\n3\n4\n4\n5\n5\n6\n6\n7\n7\n8\n8\n9\n9\n10\n10\n11\n11\n12\n12\n13\n13\n" stdout="Ann: " label="every player's score is printed" -- Print summary() for each player at the end.
run "./game --fast" stdin="1\n\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Player 1: " label="an empty name becomes Player 1" -- Use trim, and fall back to "Player " plus the number.
run "./game --fast" stdin="2\nAnn\n" exit=1 label="the program stops if the names run out" -- readPlayers returns false when readLine fails.
run "g++ -std=c++17 -Wall -Wextra tests/test_players_game.cpp Game.cpp Turn.cpp Input.cpp Player.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_players_game" label="the players tests build" -- Press the lesson's support button if tests/test_players_game.cpp is missing.
tests "./test_players_game" require="Players.PlayersTakeTurnsInOrder" label="players take turns in order" -- Loop over the players inside each round, and use Player&, not Player.
tests "./test_players_game" require="Players.AFinishedPlayerIsSkipped" label="a finished player is skipped" -- continue when the scorecard is already full.
```

## Read the tests

The support button created `tests/test_players_game.cpp`. It uses `FakeInput` from lesson 4.1 to type the answers. Two details:

```cpp
static std::string interleaved(int players) {
    std::string text;
    for (int box = 1; box <= 13; box++) {
        for (int p = 0; p < players; p++) {
            text += std::to_string(box) + "\n";
        }
    }
    return text;
}
```

- Turns alternate, so with two players the input must be `1, 1, 2, 2, ...`. This helper builds that text for any number of players.
- The rotation test types only `13` and `12` and then lets the input end. The game returns `false`, and the test checks that the first player scored box 13 (index 12) and the second scored box 12 (index 11).

## Locate the source of truth {#teaching-review}

**Try it yourself.** Draw two players with separate cards and one active-player position. Trace the first two turns and then a full round. Do not duplicate player totals in Game if Player already computes them; duplicated state needs synchronization and can disagree. Validate duplicate names at the boundary before starting gameplay.

**Explain before continuing.** Which test would reveal accidentally sharing one scorecard between players? Does vector growth invalidate a borrowed reference, and when should you obtain that reference?

Write down your prediction, observation and the reason for any difference. Restore deliberate faults before continuing. Passing supplied tests is evidence for their cases, not proof that every behavior or explanation is correct.

## Your turn: unique names

Change `readPlayers` so that two players cannot have the same name. If a name matches an earlier player's name, ignoring capital letters, print `That name is taken. Please choose another.` and ask for that same player's name again. This applies to the default `Player 2` too. Use `toLowerCopy` from `Input.h` to compare. If input ends while asking again, return `false`. The test file `tests/test_unique_names.cpp` is already in your project.

```check
run "g++ -std=c++17 -Wall -Wextra tests/test_unique_names.cpp Game.cpp Turn.cpp Input.cpp Player.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_unique_names" label="the unique-name tests build" -- Press the lesson's support button if tests/test_unique_names.cpp is missing.
tests "./test_unique_names" require="UniqueNames.CapitalLettersDoNotMakeANameNew" label="Ann and ANN count as the same name" -- Compare toLowerCopy of both names.
tests "./test_unique_names" require="UniqueNames.TheDefaultNameCanClashToo" label="a default name can clash too" -- Check the name after the empty-name fallback has been applied.
tests "./test_unique_names" require="UniqueNames.InputEndingWhileAskingAgainStopsTheSetup" label="the setup stops if input ends" -- readLine failing inside the retry must return false.
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="the game builds with the name check" -- Fix the compiler errors shown.
run "./game --fast" stdin="2\nAnn\nann\nBo\n1\n1\n2\n2\n3\n3\n4\n4\n5\n5\n6\n6\n7\n7\n8\n8\n9\n9\n10\n10\n11\n11\n12\n12\n13\n13\n" stdout="That name is taken." label="the game reports a repeated name" -- Print the message and ask for the same player's name again.
```

```hints
nudge: Which part of the loop runs again when a name is refused: the whole setup or just one player's question?
concept: Put a `while (true)` loop around the question for one player. Inside it, read and clean the name, check it against every player already in the vector, and either add the player and `break`, or print the message and let the loop ask again.
shape: Inside the for loop over players, start `while (true)`. Read the line (return false if it fails), trim it, apply the "Player N" default, then set `taken` to true if `toLowerCopy(other.name()) == toLowerCopy(name)` for any `other` already in `players`. If not taken, `emplace_back(std::move(name))` and `break`; otherwise print the message.
answer: One way to write the loop inside readPlayers:
~~~cpp
for (int i = 1; i <= count; i++) {
    while (true) {
        std::cout << "Name for player " << i << " (Enter for Player " << i << "): ";
        std::string line;
        if (!readLine(line)) {
            return false;
        }
        std::string name = trim(line);
        if (name.empty()) {
            name = "Player " + std::to_string(i);
        }

        bool taken = false;
        for (const Player& other : players) {
            if (toLowerCopy(other.name()) == toLowerCopy(name)) {
                taken = true;
            }
        }
        if (!taken) {
            players.emplace_back(std::move(name));
            break;
        }
        std::cout << "That name is taken. Please choose another.\n";
    }
}
return true;
~~~
```
