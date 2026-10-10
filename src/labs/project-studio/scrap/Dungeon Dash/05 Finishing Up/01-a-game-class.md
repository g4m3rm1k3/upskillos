---
title: 5.1 — A Game Class
track: Finishing Up
runtime: none
support: tests/test_game.cpp, tests/test_view.cpp, tests/test_over.cpp
---

In lesson 4.3 you finished a playable game. But `main.cpp` is now about 90 lines that do three jobs at once: hold the world (the map, the hero, the coins, the enemy), apply the rules for one turn, and talk to the console.

In this lesson you give the first two jobs to a new class, `Game`. `main` keeps only the console part. A `Game` can be tested without a keyboard or a screen, just like `renderMap` and `readAction`. So the rules from chapters 3 and 4 get tested by tests that play whole turns.

Two small behaviour changes come with this move. Asking for help no longer costs a turn, and pressing Q ends the game at once.

Click the button that creates the supporting test files before you start.

From now on a test program is built from the test file plus **every** `.cpp` file in the project except `main.cpp`, because `Game` uses nearly all of them. Each test check below shows the full command; type the same command in the terminal to run the tests yourself.

## Read the turn tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_game.cpp provided
#include "minitest.h"
#include "../game.h"

static void idle(Game& g, int turns) {
    for (int i = 0; i < turns; i++) {
        g.apply(Action::None);
    }
}

TEST(GameTest, StartsReady) {
    Game g;
    EXPECT_TRUE(g.isRunning());
    EXPECT_EQ(g.getState(), GameState::Playing);
    EXPECT_EQ(g.getTurn(), 0);
    EXPECT_EQ(g.getMessage(), "");
    EXPECT_EQ(g.getPlayer().getX(), 1);
    EXPECT_EQ(g.getPlayer().getY(), 1);
    EXPECT_EQ(g.getCoins().remaining(), 5);
}

TEST(GameTest, WalkingOntoACoinCollectsIt) {
    Game g;
    g.apply(Action::Right);
    EXPECT_EQ(g.getPlayer().getX(), 2);
    EXPECT_EQ(g.getPlayer().getScore(), 10);
    EXPECT_EQ(g.getPlayer().getSteps(), 1);
    EXPECT_EQ(g.getCoins().remaining(), 4);
    EXPECT_EQ(g.getMessage(), "You found a coin!\n");
}

TEST(GameTest, AWallBlocksTheMove) {
    Game g;
    g.apply(Action::Left);
    EXPECT_EQ(g.getPlayer().getX(), 1);
    EXPECT_EQ(g.getPlayer().getSteps(), 0);
    EXPECT_EQ(g.getMessage(), "A wall blocks the way.\n");
    EXPECT_EQ(g.getTurn(), 1);
}

TEST(GameTest, QuitStopsTheGameButIsNotALoss) {
    Game g;
    g.apply(Action::Quit);
    EXPECT_FALSE(g.isRunning());
    EXPECT_EQ(g.getState(), GameState::Playing);
    EXPECT_EQ(g.getTurn(), 0);
}

TEST(GameTest, HelpCostsNothing) {
    Game g;
    g.apply(Action::Help);
    EXPECT_EQ(g.getTurn(), 0);
    EXPECT_EQ(g.getMessage(), "");
}

TEST(GameTest, DoingNothingCostsATurn) {
    Game g;
    g.apply(Action::None);
    EXPECT_EQ(g.getTurn(), 1);
    EXPECT_EQ(g.getPlayer().getX(), 1);
}

TEST(GameTest, TheEnemyMovesEverySecondTurn) {
    Game g;
    idle(g, 1);
    EXPECT_EQ(g.getEnemy().getX(), 8);
    idle(g, 1);
    EXPECT_EQ(g.getEnemy().getX(), 7);
    EXPECT_EQ(g.getEnemy().getY(), 4);
}

TEST(GameTest, TheMessageIsReplacedEachTurn) {
    Game g;
    g.apply(Action::Right);
    g.apply(Action::Right);
    EXPECT_EQ(g.getMessage(), "");
}

TEST(GameTest, StandingStillGetsYouHit) {
    Game g;
    idle(g, 19);
    EXPECT_EQ(g.getPlayer().getHealth(), 10);
    g.apply(Action::None);
    EXPECT_EQ(g.getPlayer().getHealth(), 7);
    EXPECT_EQ(g.getMessage(), "The enemy hits you!\n");
}

TEST(GameTest, LosingNeedsTwentyThreeTurnsOfStandingStill) {
    Game g;
    idle(g, 22);
    EXPECT_EQ(g.getState(), GameState::Playing);
    EXPECT_EQ(g.getPlayer().getHealth(), 1);
    g.apply(Action::None);
    EXPECT_EQ(g.getState(), GameState::Lost);
    EXPECT_EQ(g.getPlayer().getHealth(), 0);
}

TEST(GameTest, NothingHappensAfterTheGameEnds) {
    Game g;
    idle(g, 23);
    g.apply(Action::Right);
    EXPECT_EQ(g.getPlayer().getX(), 1);
    EXPECT_EQ(g.getTurn(), 23);
}
```

- `Game g;` creates a whole game: the built-in map, the hero at `(1, 1)`, five coins and the enemy at `(8, 4)`.
- `g.apply(Action::Right)` plays one whole turn: move, pick up a coin, enemy step, enemy hit and the win/lose check.
- `getMessage()` is the text of what happened in the last turn. Each event is one line that ends in `\n`.
- `idle` is a helper that plays `Action::None` several times. `static` means only this file can use it, as with `sign` in lesson 4.2.
- The numbers 19, 22 and 23 come from the chase rule. A hero who never moves is reached on turn 20, because the enemy takes ten steps and moves every second turn. It hits for 3 on turns 20, 21 and 22, leaving 1 health. Turn 23 brings health to 0.

## Declare the class

Replace `game.h`. The three `show` functions stay, and the class goes below them:

```cpp file=game.h
#pragma once

#include <string>
#include "coins.h"
#include "enemy.h"
#include "input.h"
#include "map.h"
#include "player.h"
#include "rules.h"

void showTitle();
void showMenu();
void showHelp();

class Game {
public:
    Game();

    void apply(Action action);

    bool isRunning() const;
    GameState getState() const;
    int getTurn() const;
    const std::string& getMessage() const;

    const Map& getMap() const;
    const Player& getPlayer() const;
    const Coins& getCoins() const;
    const Enemy& getEnemy() const;

    std::string render() const;
    std::string statusText() const;
    std::string summary() const;

private:
    Map map;
    Player player;
    Coins coins;
    Enemy enemy;
    bool running;
    int turn;
    GameState state;
    std::string message;
};
```

- The header includes everything its members and parameters need: the four world types, `Action` from `input.h`, and `GameState` from `rules.h`.
- `apply(Action action)` plays one turn. It changes the game, so it is not `const`.
- The getters only look, so they are `const`. `const Map& getMap() const;` returns a **reference** to the game's own map, read-only. Nothing is copied, and the caller can't change it.
- `render`, `statusText` and `summary` return text, and `main` will print it.
- The world is **private**. Nothing outside the class can change the hero without going through `apply`, which is how the rules stay in one place.
- The order of the private members matters, and the next step explains why.

```check
contains game.h "#pragma once" -- Start the header with #pragma once.
matches game.h "void\s+showHelp\s*\(\s*\)\s*;" -- Keep the three show functions: showTitle, showMenu and showHelp.
matches game.h "class\s+Game" -- Declare a class named Game.
matches game.h "void\s+apply\s*\(\s*Action\s+\w+\s*\)\s*;" -- Declare void apply(Action action);
matches game.h "std::string\s+render\s*\(\s*\)\s*const\s*;" -- Declare std::string render() const;
matches game.h "std::string\s+statusText\s*\(\s*\)\s*const\s*;" -- Declare std::string statusText() const;
matches game.h "std::string\s+summary\s*\(\s*\)\s*const\s*;" -- Declare std::string summary() const;
matches game.h "Map\s+map\s*;[\s\S]*Player\s+player\s*;[\s\S]*Coins\s+coins\s*;[\s\S]*Enemy\s+enemy\s*;" -- Declare the private members in this order: Map map; Player player; Coins coins; Enemy enemy;
```

## Build the world

Replace `game.cpp`. The three `show` functions stay as they were. Below them go the constructor and the getters:

```cpp file=game.cpp
#include "game.h"

#include <iostream>

void showTitle() {
    std::cout << "Welcome to Dungeon Dash!" << std::endl;
}

void showMenu() {
    std::cout << "1. Start" << std::endl;
    std::cout << "2. Quit" << std::endl;
    std::cout << "3. Help" << std::endl;
}

void showHelp() {
    std::cout << "Use W, A, S, D to move." << std::endl;
}

Game::Game()
    : player(1, 1), enemy(8, 4), running(true), turn(0), state(GameState::Playing) {}

bool Game::isRunning() const { return running; }
GameState Game::getState() const { return state; }
int Game::getTurn() const { return turn; }
const std::string& Game::getMessage() const { return message; }

const Map& Game::getMap() const { return map; }
const Player& Game::getPlayer() const { return player; }
const Coins& Game::getCoins() const { return coins; }
const Enemy& Game::getEnemy() const { return enemy; }
```

- The constructor's initializer list sets the members that need arguments: `Player` and `Enemy` have no constructor without arguments. `Map` and `Coins` are not listed, so their own no-argument constructors build the built-in level. `message` is not listed either, so it starts as an empty string.
- C++ builds members in the order they are **declared in the class**, not the order you write them in the list. That is why the order in `game.h` matters. Keep the two the same, or the compiler may warn.
- The `const` getters return the members. The reference-returning ones, such as `const Map& Game::getMap() const`, repeat the `&` and the `const` in the definition.

```predict
question: In class Game the members are declared in the order map, player, coins, enemy. The initializer list is written as enemy(8, 4), player(1, 1). Which one is constructed first?
choice: player, because it is declared first in the class
choice: enemy, because it is written first in the list
answer: player, because it is declared first in the class
explain: Members are always built in declaration order. The order of the list is ignored, which is why a list written in a different order can be misleading.
```

```check
contains game.cpp "#include \"game.h\"" -- Include your own header with #include "game.h".
matches game.cpp "Game::Game\s*\(\s*\)" -- Define the constructor as Game::Game() : ... { }
contains game.cpp "GameState::Playing" -- Start with state(GameState::Playing) in the initializer list.
matches game.cpp "bool\s+Game::isRunning\s*\(\s*\)\s*const" -- Define bool Game::isRunning() const { ... }
matches game.cpp "const\s+Player\s*&\s*Game::getPlayer\s*\(\s*\)\s*const" -- Define const Player& Game::getPlayer() const { ... }
run "g++ -std=c++17 -c game.cpp -o game.o" label="game.cpp compiles" -- Fix the compiler errors shown. Every function needs Game:: before its name.
```

## Play one turn

Now the heart of the class. Everything that was inside the `while` loop in `main`, except the printing, moves into `apply`. Add it to the end of `game.cpp`:

```cpp file=game.cpp
#include "game.h"

#include <iostream>

void showTitle() {
    std::cout << "Welcome to Dungeon Dash!" << std::endl;
}

void showMenu() {
    std::cout << "1. Start" << std::endl;
    std::cout << "2. Quit" << std::endl;
    std::cout << "3. Help" << std::endl;
}

void showHelp() {
    std::cout << "Use W, A, S, D to move." << std::endl;
}

Game::Game()
    : player(1, 1), enemy(8, 4), running(true), turn(0), state(GameState::Playing) {}

bool Game::isRunning() const { return running; }
GameState Game::getState() const { return state; }
int Game::getTurn() const { return turn; }
const std::string& Game::getMessage() const { return message; }

const Map& Game::getMap() const { return map; }
const Player& Game::getPlayer() const { return player; }
const Coins& Game::getCoins() const { return coins; }
const Enemy& Game::getEnemy() const { return enemy; }

void Game::apply(Action action) {
    message = "";
    if (!running || state != GameState::Playing || action == Action::Help) {
        return;
    }

    bool blocked = false;

    switch (action) {
        case Action::Up:
            blocked = !tryMove(map, player, 0, -1);
            break;
        case Action::Down:
            blocked = !tryMove(map, player, 0, 1);
            break;
        case Action::Left:
            blocked = !tryMove(map, player, -1, 0);
            break;
        case Action::Right:
            blocked = !tryMove(map, player, 1, 0);
            break;
        case Action::Quit:
            running = false;
            return;
        case Action::Help:
        case Action::None:
            break;
    }

    if (blocked) {
        message += "A wall blocks the way.\n";
    }

    if (coins.collectAt(player.getX(), player.getY())) {
        player.addScore(10);
        message += "You found a coin!\n";
    }

    turn++;
    if (turn % 2 == 0) {
        enemy.chase(map, player);
    }

    if (enemy.getX() == player.getX() && enemy.getY() == player.getY()) {
        player.takeDamage(3);
        message += "The enemy hits you!\n";
    }

    state = checkState(player, coins);
}
```

- `message = "";` clears the text from the last turn, so a quiet turn leaves an empty message.
- The early `return` leaves the function at once if the game has already ended, or if the action is `Help`. In both cases nothing happens, and no turn is counted.
- `!running || state != GameState::Playing || ...` is true if **any** part is true. `!=` means "is not equal to".
- The `switch` is the one from lesson 3.3. Names like `map` and `player` now mean the class's own members. `case Action::Quit:` sets the flag and returns on the spot, which is why pressing Q costs no turn.
- Every action has a label. `Help` and `None` do nothing in the switch, and `Help` never gets this far anyway. Listing all of them means a forgotten one stands out.
- `message += "...\n";` adds a line to the message. A turn can have several events, for example a coin and a hit, and each adds its own line.
- The rest is the code from `main`, in the same order: coin pickup, turn counter, enemy step every second turn, enemy hit, then the state check.

```predict
question: You call apply(Action::Quit) on a new game. What does getTurn() return afterwards?
answer: 0
explain: In the switch, the Quit label sets running to false and returns at once. The line turn++ is never reached.
```

```check
matches game.cpp "void\s+Game::apply\s*\(\s*Action\s+\w+\s*\)" -- Define void Game::apply(Action action) { ... }
contains game.cpp "message = \"\";" -- Start apply by clearing the old message: message = "";
contains game.cpp "tryMove(map, player" -- Move with tryMove(map, player, ...) so walls still block the hero.
contains game.cpp "state = checkState(player, coins);" -- End the turn with state = checkState(player, coins);
run "g++ -std=c++17 -c game.cpp -o game.o" label="game.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_game.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o test_game" label="tests/test_game.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_game" label="Game plays turns correctly" -- A test failed. Read which one. Do you clear the message first? Does Quit return before turn++? Does Help return before anything happens?
```

## Read the view tests

Next come three functions that turn the game into text. Here are the tests, given to you:

```cpp file=tests/test_view.cpp provided
#include "minitest.h"
#include <string>
#include "../game.h"
#include "../render.h"

static void idle(Game& g, int turns) {
    for (int i = 0; i < turns; i++) {
        g.apply(Action::None);
    }
}

TEST(ViewTest, RenderIsTheFourArgumentRenderMap) {
    Game g;
    EXPECT_EQ(g.render(), renderMap(g.getMap(), g.getPlayer(), g.getCoins(), g.getEnemy()));
}

TEST(ViewTest, StatusAtTheStart) {
    Game g;
    EXPECT_EQ(g.statusText(), "Steps: 0\nScore: 0\nCoins left: 5\nHealth: 10\n");
}

TEST(ViewTest, StatusAfterACoin) {
    Game g;
    g.apply(Action::Right);
    EXPECT_EQ(g.statusText(), "Steps: 1\nScore: 10\nCoins left: 4\nHealth: 10\n");
}

TEST(ViewTest, NoWarningWhileTheEnemyIsFar) {
    Game g;
    idle(g, 15);
    EXPECT_EQ(g.statusText().find("The enemy is close!"), std::string::npos);
}

TEST(ViewTest, WarnsWhenTheEnemyIsClose) {
    Game g;
    idle(g, 16);
    EXPECT_NE(g.statusText().find("The enemy is close!"), std::string::npos);
}

TEST(ViewTest, FallenHeroIsDrawnAsX) {
    Game g;
    idle(g, 23);
    EXPECT_EQ(g.render()[12], 'X');
}

TEST(ViewTest, SummaryAtTheStart) {
    Game g;
    EXPECT_EQ(g.summary(), g.render() + "Steps: 0\nScore: 0\nRank: None\nGoodbye!\n");
}

TEST(ViewTest, SummaryAfterLosing) {
    Game g;
    idle(g, 23);
    EXPECT_EQ(g.summary(), g.render() + "Steps: 0\nScore: 0\nRank: None\nThe enemy got you. Game over.\n");
}
```

The status text has one line per fact, and each line ends in `\n`. The warning line appears only when the enemy is within 2 tiles. The summary is the final picture, the steps, the score, the rank and the ending message.

## Describe the world in text

Add the three functions to the end of `game.cpp`. Add `#include <string>` and `#include "render.h"` at the top, below `#include <iostream>`. Keep everything else:

```cpp file=game.cpp
#include "game.h"

#include <iostream>
#include <string>
#include "render.h"

void showTitle() {
    std::cout << "Welcome to Dungeon Dash!" << std::endl;
}

void showMenu() {
    std::cout << "1. Start" << std::endl;
    std::cout << "2. Quit" << std::endl;
    std::cout << "3. Help" << std::endl;
}

void showHelp() {
    std::cout << "Use W, A, S, D to move." << std::endl;
}

Game::Game()
    : player(1, 1), enemy(8, 4), running(true), turn(0), state(GameState::Playing) {}

bool Game::isRunning() const { return running; }
GameState Game::getState() const { return state; }
int Game::getTurn() const { return turn; }
const std::string& Game::getMessage() const { return message; }

const Map& Game::getMap() const { return map; }
const Player& Game::getPlayer() const { return player; }
const Coins& Game::getCoins() const { return coins; }
const Enemy& Game::getEnemy() const { return enemy; }

void Game::apply(Action action) {
    message = "";
    if (!running || state != GameState::Playing || action == Action::Help) {
        return;
    }

    bool blocked = false;

    switch (action) {
        case Action::Up:
            blocked = !tryMove(map, player, 0, -1);
            break;
        case Action::Down:
            blocked = !tryMove(map, player, 0, 1);
            break;
        case Action::Left:
            blocked = !tryMove(map, player, -1, 0);
            break;
        case Action::Right:
            blocked = !tryMove(map, player, 1, 0);
            break;
        case Action::Quit:
            running = false;
            return;
        case Action::Help:
        case Action::None:
            break;
    }

    if (blocked) {
        message += "A wall blocks the way.\n";
    }

    if (coins.collectAt(player.getX(), player.getY())) {
        player.addScore(10);
        message += "You found a coin!\n";
    }

    turn++;
    if (turn % 2 == 0) {
        enemy.chase(map, player);
    }

    if (enemy.getX() == player.getX() && enemy.getY() == player.getY()) {
        player.takeDamage(3);
        message += "The enemy hits you!\n";
    }

    state = checkState(player, coins);
}

std::string Game::render() const {
    return renderMap(map, player, coins, enemy);
}

std::string Game::statusText() const {
    std::string text;
    text += "Steps: " + std::to_string(player.getSteps()) + "\n";
    text += "Score: " + std::to_string(player.getScore()) + "\n";
    text += "Coins left: " + std::to_string(coins.remaining()) + "\n";
    text += "Health: " + std::to_string(player.getHealth()) + "\n";
    if (enemy.isNear(player, 2)) {
        text += "The enemy is close!\n";
    }
    return text;
}

std::string Game::summary() const {
    std::string text = render();
    text += "Steps: " + std::to_string(player.getSteps()) + "\n";
    text += "Score: " + std::to_string(player.getScore()) + "\n";
    text += "Rank: " + rankFor(player.getScore()) + "\n";
    text += endMessage(state) + "\n";
    return text;
}
```

- `std::to_string(n)` turns a number into a `std::string`: `std::to_string(10)` is `"10"`. It lives in `<string>`.
- `"Steps: " + std::to_string(...)` works because one side is a `std::string`. Two plain literals can't be added: `"a" + "b"` is a compile error, because both are `const char[]`.
- The three functions are `const`. They build text and don't change the game.
- `render` just calls the four-argument `renderMap` from lesson 4.2, with the game's own members.
- `rankFor` and `endMessage` are the rules you wrote in lesson 4.3.

```predict
question: At the start of a game, how many lines does statusText() contain? Count each \n as ending a line.
answer: 4
explain: Steps, Score, Coins left and Health each get a line. The enemy is 10 tiles away at the start, so there is no warning line.
```

```check
contains game.cpp "#include \"render.h\"" -- Include render.h in game.cpp so renderMap is known.
matches game.cpp "std::string\s+Game::statusText\s*\(\s*\)\s*const" -- Define std::string Game::statusText() const { ... }
contains game.cpp "std::to_string" -- Turn numbers into text with std::to_string(...)
run "g++ -std=c++17 -c game.cpp -o game.o" label="game.cpp compiles" -- Fix the compiler errors shown. A plain literal can't be added to another plain literal. One side must be a std::string.
run "g++ -std=c++17 tests/test_view.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o test_view" label="tests/test_view.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_view" label="The text views are right" -- A test failed. Read which one. Is every line ended with \n? Is the warning only added when the enemy is within 2?
run "g++ -std=c++17 tests/test_game.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o test_game" label="tests/test_game.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_game" label="Game turns still pass" -- Your changes broke an earlier test. Check you didn't alter apply.
```

## Slim down main

Now `main` only reads and prints:

```cpp file=main.cpp
#include <iostream>
#include "game.h"
#include "input.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    Game game;

    while (game.isRunning() && game.getState() == GameState::Playing) {
        std::cout << game.render();
        std::cout << game.statusText();
        std::cout << "Move (W/A/S/D, H for help, Q to quit): ";
        Action action = readAction(std::cin);

        if (action == Action::Help) {
            showHelp();
        }

        game.apply(action);
        std::cout << game.getMessage();
    }

    std::cout << game.summary();
    return 0;
}
```

- `Game game;` replaces the four separate world variables and the flag, turn counter and state.
- The loop's condition asks the game, not local variables. It stops when the player quits or the game is won or lost.
- `Help` is the one action `main` handles itself, because only `main` prints to the console. It then still passes the action to `apply`, which ignores it.
- `game.getMessage()` is printed after each turn. It is empty on a quiet turn, so nothing shows.
- The old Rank and ending message lines are gone from `main`. `summary()` prints them.

```predict
question: You press H. What happens to the game's turn counter?
choice: It goes up by one
choice: It stays the same
answer: It stays the same
explain: main prints the help, and apply returns at once for Help, before turn++. Asking for help is free.
```

Play the game once. Collect a coin, then press `H`, then `Q`.

Build and run it with the same nine files as in lesson 4.3:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game
./game
```

```check
contains main.cpp "#include \"game.h\"" -- Include game.h in main.cpp.
contains main.cpp "Game game;" -- Create the game with Game game;
matches main.cpp "while\s*\(\s*game\.isRunning\(\)\s*&&\s*game\.getState\(\)\s*==\s*GameState::Playing\s*\)" -- Loop with while (game.isRunning() && game.getState() == GameState::Playing)
contains main.cpp "game.apply(action)" -- Play the turn with game.apply(action);
contains main.cpp "game.summary()" -- After the loop, print game.summary()
lacks main.cpp "tryMove" -- main shouldn't apply the rules itself any more. Game::apply does.
lacks main.cpp "Player player" -- main shouldn't hold the hero. The Game owns it.
lacks main.cpp "turn % 2" -- The enemy's timing lives in Game::apply now.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game" label="the whole project builds" -- Build all nine .cpp files together and fix the errors shown.
run "./game" stdin="d\nq\n" stdout="You found a coin!" label="coins are still collected" -- After game.apply(action), print game.getMessage().
run "./game" stdin="q\n" stdout="Rank: None\nGoodbye!" label="Q ends the game with the summary" -- After the loop, print game.summary().
run "./game" stdin="h\nh\nq\n" without="#....*.E*#" label="asking for help costs no turn" -- Game::apply must return at once for Action::Help, so the enemy doesn't move.
```

## Your turn: is it over?

The loop condition in `main` is long and asks the game two questions. Give `Game` one function that answers both:

- `bool isOver() const` is `true` when the player has quit **or** the game has been won or lost. Otherwise it is `false`.
- Change the `while` in `main.cpp` to use it.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_over.cpp provided
#include "minitest.h"
#include "../game.h"

TEST(OverTest, NotOverAtTheStart) {
    Game g;
    EXPECT_FALSE(g.isOver());
}

TEST(OverTest, OverAfterQuitting) {
    Game g;
    g.apply(Action::Quit);
    EXPECT_TRUE(g.isOver());
}

TEST(OverTest, HelpDoesNotEndTheGame) {
    Game g;
    g.apply(Action::Help);
    EXPECT_FALSE(g.isOver());
}

TEST(OverTest, NotOverWhileTheHeroIsAlive) {
    Game g;
    for (int i = 0; i < 22; i++) {
        g.apply(Action::None);
    }
    EXPECT_FALSE(g.isOver());
}

TEST(OverTest, OverWhenTheHeroIsDefeated) {
    Game g;
    for (int i = 0; i < 23; i++) {
        g.apply(Action::None);
    }
    EXPECT_TRUE(g.isOver());
}
```

Your changes go in `game.h`, `game.cpp` and `main.cpp`. Don't change the tests.

```check
matches game.h "bool\s+isOver\s*\(\s*\)\s*const\s*;" -- Declare bool isOver() const; in game.h.
run "g++ -std=c++17 -c game.cpp -o game.o" label="game.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_over.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o test_over" label="tests/test_over.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_over" label="isOver passes its tests" -- A test failed. Read which one. The game is over if the player quit OR the state is not Playing. Do you cover both?
run "g++ -std=c++17 tests/test_game.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o test_game" label="tests/test_game.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_game" label="Game turns still pass" -- Your changes broke an earlier test.
run "g++ -std=c++17 tests/test_view.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o test_view" label="tests/test_view.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_view" label="The text views still pass" -- Your changes broke an earlier test.
matches main.cpp "while\s*\(\s*!\s*game\.isOver\(\)\s*\)" -- Loop with while (!game.isOver()) { ... }
lacks main.cpp "getState()" -- main shouldn't ask for the state any more. isOver does that.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game" label="the whole project builds" -- Build all nine .cpp files together and fix the errors shown.
run "./game" stdin="d\nd\nd\nd\nd\nd\ns\ns\ns\nd\na\na\na\na\na\na\na\nw\nq\n" stdout="You collected every coin. You win!" label="the game still ends when every coin is collected" -- isOver must be true once checkState says the game is won.
run "./game" stdin="q\n" stdout="Goodbye!" label="the game still ends on Q" -- isOver must be true once the player has quit.
```

```hints
nudge: The game is over in two different situations. What are they, and which Game members tell you about each?
concept: running is false after Quit. state is not Playing after a win or a loss. Join the two questions with || so either one is enough, and use ! or != so each answers "has it stopped?".
shape: One line in game.cpp: return !running || state != GameState::Playing; then change the while condition in main to call it.
answer: In game.h, add to the public section:
~~~cpp
    bool isOver() const;
~~~
In game.cpp, add:
~~~cpp
bool Game::isOver() const {
    return !running || state != GameState::Playing;
}
~~~
In main.cpp, change the loop line to:
~~~cpp
while (!game.isOver()) {
~~~
```
