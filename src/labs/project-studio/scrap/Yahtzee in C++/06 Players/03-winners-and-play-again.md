---
title: 6.3 — Winners and Play Again
runtime: none
support: tests/test_ranking.cpp, tests/test_ask_yesno.cpp, tests/test_join_names.cpp
---

The game ends with a list of scores, and nobody has said who won. In this lesson the players are ranked, the winner or winners are announced, and the group can play again with the same names. You also meet raw pointers for the first time, and a sort with your own comparison rule.

Press this lesson's support button first. It creates three test files.

## Rank the players

Words first:

- **Pointer**: a variable that holds the address of an object instead of the object. `const Player*` is a pointer to a `Player` that cannot be changed through it.
- **Address-of (`&`)**: placed in front of an existing variable in an expression, `&player` gives the address of that variable. This is a different job from the `&` that follows a type to make a reference.
- **`->`**: reaches a member through a pointer. `a->finalScore()` means the same as `(*a).finalScore()`.
- **Stable sort**: a sort that keeps items that compare equal in their original order.

Create `Ranking.h`.

```cpp file=Ranking.h
#ifndef RANKING_H
#define RANKING_H

#include <vector>

#include "Player.h"

std::vector<const Player*> rankPlayers(const std::vector<Player>& players);
std::vector<const Player*> winnersOf(const std::vector<Player>& players);

#endif
```

Line by line:

- `std::vector<const Player*>`: a list of pointers to read-only players. The result **points at** the real players. It does not copy them.
- `rankPlayers` returns all the players, best score first. `winnersOf` returns the player or players with the top score. Both take the players as a `const` reference, so they cannot change anything.

## Define Ranking.cpp

Create `Ranking.cpp`.

```cpp file=Ranking.cpp
#include <algorithm>

#include "Ranking.h"

std::vector<const Player*> rankPlayers(const std::vector<Player>& players) {
    std::vector<const Player*> order;
    order.reserve(players.size());
    for (const Player& player : players) {
        order.push_back(&player);
    }
    std::stable_sort(order.begin(), order.end(),
                     [](const Player* a, const Player* b) {
                         return a->finalScore() > b->finalScore();
                     });
    return order;
}

std::vector<const Player*> winnersOf(const std::vector<Player>& players) {
    std::vector<const Player*> order = rankPlayers(players);
    std::vector<const Player*> winners;
    for (const Player* player : order) {
        if (player->finalScore() != order.front()->finalScore()) {
            break;
        }
        winners.push_back(player);
    }
    return winners;
}
```

`rankPlayers`:

- `#include <algorithm>`: declares `std::stable_sort`.
- Why pointers: sorting the `std::vector<Player>` itself would move real players around, and it would change the seating order that the game relies on. A list of pointers can be reordered while the players stay where they are. Each pointer is one machine word, so it is cheap to move.
- `order.push_back(&player);`: `player` is a `const Player&` for each element. `&player` is the address of that element, so the pointer points into the original vector.
- `order.begin()` and `order.end()`: iterators, objects that mark the first element and the place just after the last one. `std::stable_sort` sorts the range between them.
- `[](const Player* a, const Player* b) { return a->finalScore() > b->finalScore(); }`: a lambda, the comparison rule. It returns `true` when `a` should come **before** `b`. Using `>` puts the higher score first. `a->finalScore()` follows the pointer to the player and calls the function.
- The rule must say `>` and not `>=`. A comparison that answers "yes, a comes first" for two equal items breaks the sort's rules and can crash it, which is undefined behavior.
- `stable_sort` keeps players with equal scores in the order they were seated, so a tie never reshuffles anybody. Plain `std::sort` makes no such promise.

`winnersOf`:

- It ranks first. Then it collects players from the front until it meets one whose score differs from the first player's score. `break` leaves the loop at that point.
- `order.front()` is the first (best) element. It is only evaluated inside the loop, and the loop only runs when `order` has elements. Calling `front()` on an empty vector is undefined behavior.
- With no players, both functions return an empty list.

The pointers are valid only while the `players` vector exists and is not resized. They are used right away and then dropped, so that is fine here.

Add `Ranking.cpp` as a new line at the end of `sources.txt`.

```predict
question: Ann has 16 points, Bo has 30 and Cy has 16, seated in that order. What order does rankPlayers return?
choice: Bo, Ann, Cy
choice: Bo, Cy, Ann
choice: Ann, Cy, Bo
answer: Bo, Ann, Cy
explain: Bo has the highest score, so Bo comes first. Ann and Cy tie, and stable_sort keeps tied players in their original order, so Ann stays ahead of Cy.
```

## Ask yes or no

Add this line to `Input.h`, after `askInt`:

```cpp
bool askYesNo(const std::string& prompt, bool& yes);
```

Add this function to the end of `Input.cpp`:

```cpp
bool askYesNo(const std::string& prompt, bool& yes) {
    while (true) {
        std::cout << prompt;
        std::string line;
        if (!readLine(line)) {
            return false;
        }
        if (parseYesNo(line, yes)) {
            return true;
        }
        std::cout << "Please type y or n.\n";
    }
}
```

- It has the same shape as `askInt`. The prompt is printed again until the answer is understood.
- `parseYesNo` is the function you wrote in lesson 4.1. It accepts `y`, `yes`, `n` and `no` in any case, and writes `yes` only when it understood.
- `bool& yes` is an output parameter. At the end of input the function returns `false` and leaves `yes` alone.

## Start a new game

Add this line to `Player.h`, under `summary`:

```cpp
void startNewGame();
```

Add this function to the end of `Player.cpp`:

```cpp
void Player::startNewGame() {
    card = Scorecard();
}
```

- `Scorecard()` builds a brand-new scorecard with 13 empty boxes. It is a temporary object.
- Assigning a temporary to `card` **moves** its contents in, so no box is copied one by one. The old boxes are released. The name is not touched, so the same players can play again.

## Print the results

Replace `Game.cpp` with this. It keeps the unique-name check from your last turn. If yours differs, keep yours and change only `playGame` and the new `printResults`.

```cpp file=Game.cpp
#include <iostream>
#include <string>
#include <utility>

#include "Game.h"
#include "Input.h"
#include "Ranking.h"

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
}

static void printResults(const std::vector<Player>& players) {
    std::cout << "Game over.\n";

    std::vector<const Player*> order = rankPlayers(players);
    for (std::size_t i = 0; i < order.size(); i++) {
        std::cout << i + 1 << ". " << order[i]->summary() << "\n";
    }

    std::vector<const Player*> winners = winnersOf(players);
    if (winners.empty()) {
        return;
    }
    if (winners.size() == 1) {
        std::cout << "Winner: " << winners[0]->name()
                  << " with " << winners[0]->finalScore() << " points\n";
    } else {
        std::cout << "Tie between ";
        for (std::size_t i = 0; i < winners.size(); i++) {
            if (i > 0) {
                std::cout << ", ";
            }
            std::cout << winners[i]->name();
        }
        std::cout << " with " << winners[0]->finalScore() << " points\n";
    }
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

    printResults(players);
    return true;
}
```

New lines:

- `static void printResults(...)`: private to this file. It prints `Game over.`, then the ranked list, then the winner line.
- `order[i]->summary()`: `order[i]` is a pointer, so the call uses `->`. `i + 1` makes the place start at 1.
- `if (winners.empty()) { return; }`: the game always has 1 to 4 players, so this cannot happen. The guard keeps `winners[0]` from ever being read on an empty list.
- One winner gets `Winner: ... with N points`. Several winners get a hand-written loop that puts `, ` between the names. Your turn at the end of this lesson replaces that loop with something neater.
- `playGame` now ends with `printResults(players);` instead of printing the summaries itself.

## Play again

Replace `main.cpp` with this.

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
    bool again = true;
    while (again) {
        if (!playGame(dice, players, options)) {
            std::cout << "\nInput ended before the game finished.\n";
            return 1;
        }
        if (!askYesNo("Play again? (y/n): ", again)) {
            return 0;
        }
        if (again) {
            for (Player& player : players) {
                player.startNewGame();
            }
        }
    }
    return 0;
}
```

New lines:

- `bool again = true; while (again) {`: plays a game, asks, and repeats while the answer is yes.
- `if (!askYesNo("Play again? (y/n): ", again)) { return 0; }`: `again` is passed where `bool& yes` is expected, so the helper writes the answer into it. If input ends at this prompt, the game itself finished properly, so the program leaves quietly with status 0.
- `for (Player& player : players) { player.startNewGame(); }`: a **reference**, so each real player gets a fresh scorecard. The names and the vector stay as they are.

```bash
g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game
./game
```

```check
file Ranking.h
file Ranking.cpp
contains sources.txt "Ranking.cpp" label="Ranking.cpp is in sources.txt" -- Add a line with Ranking.cpp to sources.txt.
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="the finished game builds" -- Check Input.h, Player.h and the new Ranking files for a missing declaration.
run "./game --fast" stdin="1\nAnn\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\nn\n" stdout="Winner: Ann with" label="the winner is announced" -- Print the winner line when winnersOf has exactly one player.
run "./game --fast" stdin="1\nAnn\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\nn\n" stdout="1. Ann: " label="the ranking is printed" -- Print the place, a dot and summary() for each ranked player.
run "./game --fast" stdin="2\nAnn\nBo\n1\n1\n2\n2\n3\n3\n4\n4\n5\n5\n6\n6\n7\n7\n8\n8\n9\n9\n10\n10\n11\n11\n12\n12\n13\n13\nn\n" stdout="2. " label="two players give two ranked lines" -- The ranking has one line per player.
run "./game --fast" stdin="1\nAnn\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\nmaybe\nn\n" stdout="Please type y or n." label="an unclear answer is asked again" -- askYesNo prints a hint and asks again.
run "./game --fast" stdin="1\nAnn\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\ny\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\nn\n" without="Please type y or n." label="a second game really starts" -- startNewGame must give every player an empty scorecard.
run "./game --fast" stdin="1\nAnn\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" exit=0 label="the program leaves quietly if input ends at the prompt" -- When askYesNo returns false, return 0 from main.
run "g++ -std=c++17 -Wall -Wextra tests/test_ranking.cpp Ranking.cpp Player.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_ranking" label="the ranking tests build" -- Press the lesson's support button if tests/test_ranking.cpp is missing.
tests "./test_ranking" require="Ranking.TiesKeepTheSeatingOrder" label="ties keep the seating order" -- Use std::stable_sort, not std::sort.
tests "./test_ranking" require="Ranking.TheRankingPointsAtTheRealPlayers" label="the ranking points at the real players" -- Push &player for each element. Do not copy the players.
tests "./test_ranking" require="Winners.ATieForFirstGivesEveryoneWhoTied" label="a tie gives several winners" -- Collect players from the front while their score equals the first one's.
tests "./test_ranking" require="NewGame.KeepsTheNameAndClearsTheCard" label="a new game keeps the name and clears the card" -- Assign a new Scorecard() to card.
run "g++ -std=c++17 -Wall -Wextra tests/test_ask_yesno.cpp Input.cpp -o test_ask_yesno" label="the yes/no tests build" -- Declare askYesNo in Input.h and define it in Input.cpp.
tests "./test_ask_yesno" require="AskYesNo.GivesUpWhenInputEnds" label="askYesNo stops at the end of input" -- Return false when readLine fails, and leave yes alone.
```

## Read the tests

The support button created `tests/test_ranking.cpp`. It builds players with known scores. Chance scores the total of the dice, so a hand with the wanted total gives exactly that many points:

```cpp
TEST(Ranking, TheRankingPointsAtTheRealPlayers) {
    std::vector<Player> players = table(16, 30, 5);
    std::vector<const Player*> order = rankPlayers(players);
    EXPECT_EQ(order[0] == &players[1], true);
    EXPECT_EQ(players[0].name(), "Ann");
}
```

- `table(16, 30, 5)` is a helper in the test file that builds three players, Ann, Bo and Cy, with those scores.
- `order[0] == &players[1]` compares two **addresses**. It is true only if the first ranked pointer points at the real Bo in the original vector, so the test proves nothing was copied.
- The next line proves the original order was not disturbed by the ranking.

```bash
g++ -std=c++17 tests/test_ranking.cpp Ranking.cpp Player.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_ranking
./test_ranking
```

## Your turn: joining names

A tie between three players currently reads `Tie between Ann, Bo, Cy with 40 points`. Make it read like English: `Ann, Bo and Cy`, with two names as `Ann and Bo`, and one name alone.

Add `std::string joinNames(const std::vector<const Player*>& players)` to `Ranking`. Declare it in `Ranking.h` (it needs `#include <string>`) and define it in `Ranking.cpp`. An empty list gives an empty text. Then replace the hand-written loop in `printResults` with `joinNames(winners)`. The test file `tests/test_join_names.cpp` is already in your project.

```check
matches Ranking.h "std::string[ ]+joinNames[ ]*[(][ ]*const[ ]+std::vector<const[ ]+Player[ ]*[*]>[ ]*&" label="Ranking.h declares joinNames" -- Take a const std::vector<const Player*>& and return std::string.
run "g++ -std=c++17 -Wall -Wextra tests/test_join_names.cpp Ranking.cpp Player.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_join_names" label="the join tests build" -- Declare the function in Ranking.h and define it in Ranking.cpp.
tests "./test_join_names" require="JoinNames.ThreeNamesUseCommasThenAnd" label="three names read Ann, Bo and Cy" -- Put ", " between names, except before the last one, which gets " and ".
tests "./test_join_names" require="JoinNames.NobodyGivesAnEmptyText" label="no names give an empty text" -- Start from an empty std::string and add to it.
contains Game.cpp "joinNames(" label="the results use joinNames" -- Replace the loop that prints the tied names with joinNames(winners).
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="the game still builds" -- Game.cpp includes Ranking.h, so it sees joinNames.
```

```hints
nudge: Which separator comes before the name at position i, and how do you know you are at the last position?
concept: Build the text with `+=` in a loop. The first name has no separator. The last name gets " and ". Every name in between gets ", ". The last position is the one where `i + 1 == players.size()`. Names are reached through pointers, so use `->`.
shape: Start `std::string text;`. For each index `i`: if `i > 0`, append " and " when `i + 1 == players.size()` and ", " otherwise. Then append `players[i]->name()`. Return `text`.
answer: One way to write it:
~~~cpp
// Ranking.h — add #include <string> and
std::string joinNames(const std::vector<const Player*>& players);

// Ranking.cpp
std::string joinNames(const std::vector<const Player*>& players) {
    std::string text;
    for (std::size_t i = 0; i < players.size(); i++) {
        if (i > 0) {
            text += (i + 1 == players.size()) ? " and " : ", ";
        }
        text += players[i]->name();
    }
    return text;
}

// Game.cpp — the else branch of printResults
std::cout << "Tie between " << joinNames(winners)
          << " with " << winners[0]->finalScore() << " points\n";
~~~
```
