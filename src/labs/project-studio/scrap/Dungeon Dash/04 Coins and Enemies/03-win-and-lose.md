---
title: 4.3 — Win and Lose
runtime: none
support: tests/test_state.cpp, tests/test_message.cpp, tests/test_rank.cpp
---

Your game has coins, an enemy and a way to be hurt, but it never ends unless the player quits. In this lesson you add the two endings: **win** by collecting every coin, **lose** when health reaches 0. You also show a message and a rank.

The rules go in `rules.h` and `rules.cpp`, next to `tryMove`, and are tested like the others.

Click the button that creates the supporting test files before you start.

Each test check below builds its own test program: the test file plus the `.cpp` files it uses, never `main.cpp`, as in chapter 3. Type the same command in the terminal to run the tests yourself.

## Name the three states

At any moment the game is in one of three **states**: still being played, won, or lost. That is exactly the job for an enum, as with `Action` in lesson 3.1. Replace `rules.h`:

```cpp file=rules.h
#pragma once

#include <string>
#include "coins.h"
#include "map.h"
#include "player.h"

enum class GameState {
    Playing,
    Won,
    Lost
};

bool tryMove(const Map& map, Player& player, int dx, int dy);
int dash(const Map& map, Player& player, int dx, int dy);
GameState checkState(const Player& player, const Coins& coins);
std::string endMessage(GameState state);
```

- `tryMove` and `dash` stay as they are.
- `checkState` looks at the hero and the coins and says which state the game is in. Both are `const` references: it only looks.
- `endMessage` turns a state into the text to show the player. The header includes `<string>` for the return type.

```check
contains rules.h "#include <string>" -- Add #include <string> to rules.h.
contains rules.h "#include \"coins.h\"" -- Add #include "coins.h" to rules.h.
matches rules.h "enum\s+class\s+GameState" -- Define the enum with enum class GameState { ... };
matches rules.h "GameState\s+checkState\s*\(\s*const\s+Player\s*&\s*\w+\s*,\s*const\s+Coins\s*&\s*\w+\s*\)\s*;" -- Declare GameState checkState(const Player& player, const Coins& coins);
matches rules.h "std::string\s+endMessage\s*\(\s*GameState\s+\w+\s*\)\s*;" -- Declare std::string endMessage(GameState state);
```

## Read the state tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_state.cpp provided
#include "minitest.h"
#include "../rules.h"

TEST(StateTest, PlayingAtTheStart) {
    Player p(1, 1);
    Coins c;
    EXPECT_EQ(checkState(p, c), GameState::Playing);
}

TEST(StateTest, LostAtZeroHealth) {
    Player p(1, 1);
    Coins c;
    p.takeDamage(10);
    EXPECT_EQ(checkState(p, c), GameState::Lost);
}

TEST(StateTest, StillPlayingAtOneHealth) {
    Player p(1, 1);
    Coins c;
    p.takeDamage(9);
    EXPECT_EQ(checkState(p, c), GameState::Playing);
}

TEST(StateTest, WonWhenNoCoinsAreLeft) {
    Player p(1, 1);
    Coins c;
    c.collectAt(2, 1);
    c.collectAt(7, 1);
    c.collectAt(1, 3);
    c.collectAt(5, 4);
    c.collectAt(8, 4);
    EXPECT_EQ(checkState(p, c), GameState::Won);
}

TEST(StateTest, FourCoinsAreNotEnough) {
    Player p(1, 1);
    Coins c;
    c.collectAt(2, 1);
    c.collectAt(7, 1);
    c.collectAt(1, 3);
    c.collectAt(5, 4);
    EXPECT_EQ(checkState(p, c), GameState::Playing);
}

TEST(StateTest, LosingBeatsWinning) {
    Player p(1, 1);
    Coins c;
    c.collectAt(2, 1);
    c.collectAt(7, 1);
    c.collectAt(1, 3);
    c.collectAt(5, 4);
    c.collectAt(8, 4);
    p.takeDamage(10);
    EXPECT_EQ(checkState(p, c), GameState::Lost);
}
```

The last test is the interesting one. If the hero collects the last coin but dies in the same moment, the game counts it as a loss. A dead hero can't win.

## Decide the state

Add `checkState` to the end of `rules.cpp`. Keep your own `tryMove` and `dash` as they are. They are shown here as in lesson 3.3:

```cpp file=rules.cpp
#include "rules.h"

bool tryMove(const Map& map, Player& player, int dx, int dy) {
    int newX = player.getX() + dx;
    int newY = player.getY() + dy;

    if (map.isWall(newX, newY)) {
        return false;
    }

    player.move(dx, dy);
    return true;
}

int dash(const Map& map, Player& player, int dx, int dy) {
    int moved = 0;
    for (int i = 0; i < 2; i++) {
        if (!tryMove(map, player, dx, dy)) {
            return moved;
        }
        moved++;
    }
    return moved;
}

GameState checkState(const Player& player, const Coins& coins) {
    if (player.getHealth() == 0) {
        return GameState::Lost;
    }
    if (coins.remaining() == 0) {
        return GameState::Won;
    }
    return GameState::Playing;
}
```

- The function asks its questions **in order**, and `return` leaves it at the first answer.
- Health is checked first. That is what makes a loss beat a win.
- Only if the hero is alive does it ask whether any coins remain.
- If neither applies, the game goes on: `GameState::Playing`.

```predict
question: The hero has 0 health and there are 0 coins left. What does checkState return?
choice: GameState::Won
choice: GameState::Lost
choice: GameState::Playing
answer: GameState::Lost
explain: The health check comes first and returns at once. The coin check is never reached.
```

```check
matches rules.cpp "GameState\s+checkState\s*\(\s*const\s+Player\s*&\s*\w+\s*,\s*const\s+Coins\s*&\s*\w+\s*\)\s*\{" -- Define GameState checkState(const Player& player, const Coins& coins) { ... } in rules.cpp.
run "g++ -std=c++17 -c rules.cpp -o rules.o" label="rules.cpp compiles" -- Fix the compiler errors shown. Write the values as GameState::Lost, GameState::Won and GameState::Playing.
run "g++ -std=c++17 tests/test_state.cpp rules.cpp map.cpp player.cpp coins.cpp -o test_state" label="tests/test_state.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_state" label="checkState passes its tests" -- A test failed. Read which one. Do you check the health BEFORE the coins? Is the health test == 0?
run "g++ -std=c++17 tests/test_trymove.cpp rules.cpp map.cpp player.cpp coins.cpp -o test_trymove" label="tests/test_trymove.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_trymove" label="tryMove still passes" -- Your changes broke tryMove. Check you didn't alter it.
run "g++ -std=c++17 tests/test_dash.cpp rules.cpp map.cpp player.cpp coins.cpp -o test_dash" label="tests/test_dash.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_dash" label="dash still passes" -- Your changes broke dash. Check you didn't alter it.
```

## Read the message tests

```cpp file=tests/test_message.cpp provided
#include "minitest.h"
#include <string>
#include "../rules.h"

TEST(MessageTest, WonMessage) {
    EXPECT_EQ(endMessage(GameState::Won), "You collected every coin. You win!");
}

TEST(MessageTest, LostMessage) {
    EXPECT_EQ(endMessage(GameState::Lost), "The enemy got you. Game over.");
}

TEST(MessageTest, QuittingMessage) {
    EXPECT_EQ(endMessage(GameState::Playing), "Goodbye!");
}
```

If the loop ended while the state is still `Playing`, nobody won or lost, so the player must have pressed `Q`. That is why `Playing` gets the goodbye message.

## Write the messages

Add `endMessage` to the end of `rules.cpp`:

```cpp file=rules.cpp
#include "rules.h"

bool tryMove(const Map& map, Player& player, int dx, int dy) {
    int newX = player.getX() + dx;
    int newY = player.getY() + dy;

    if (map.isWall(newX, newY)) {
        return false;
    }

    player.move(dx, dy);
    return true;
}

int dash(const Map& map, Player& player, int dx, int dy) {
    int moved = 0;
    for (int i = 0; i < 2; i++) {
        if (!tryMove(map, player, dx, dy)) {
            return moved;
        }
        moved++;
    }
    return moved;
}

GameState checkState(const Player& player, const Coins& coins) {
    if (player.getHealth() == 0) {
        return GameState::Lost;
    }
    if (coins.remaining() == 0) {
        return GameState::Won;
    }
    return GameState::Playing;
}

std::string endMessage(GameState state) {
    switch (state) {
        case GameState::Won:
            return "You collected every coin. You win!";
        case GameState::Lost:
            return "The enemy got you. Game over.";
        case GameState::Playing:
            return "Goodbye!";
    }
    return "";
}
```

- This is the `switch` from lesson 3.1, now on an enum. Every state has a label, and each label returns, so no `break` is needed.
- A text in double quotes, such as `"Goodbye!"`, can be returned from a function whose return type is `std::string`. C++ converts it for you.
- `return "";` at the very end returns an empty string. The compiler can't be sure the `switch` covers every possible value of the enum, and a function that returns something must never run off its end. It is never reached in practice.

```predict
question: Why is there a return "" after the switch?
choice: The compiler can't be sure the switch handled every possible value, and the function must always return something
choice: Without it, the Won and Lost cases would fall through into each other
choice: It prints an empty line
answer: The compiler can't be sure the switch handled every possible value, and the function must always return something
explain: Each case already returns, so there is no fall-through. The final line is a safety net for the compiler.
```

```check
matches rules.cpp "std::string\s+endMessage\s*\(\s*GameState\s+\w+\s*\)\s*\{" -- Define std::string endMessage(GameState state) { ... } in rules.cpp.
matches rules.cpp "switch\s*\(\s*state\s*\)" -- Use switch (state) { ... } to choose the message.
run "g++ -std=c++17 -c rules.cpp -o rules.o" label="rules.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_message.cpp rules.cpp map.cpp player.cpp coins.cpp -o test_message" label="tests/test_message.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_message" label="endMessage passes its tests" -- A test failed. Read which one. The text must match exactly, including the full stops and the capital letters.
run "g++ -std=c++17 tests/test_state.cpp rules.cpp map.cpp player.cpp coins.cpp -o test_state" label="tests/test_state.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_state" label="checkState still passes" -- Your changes broke checkState. Check you didn't alter it.
```

## End the game

Now use both in `main`. The loop runs while the player hasn't quit **and** the game is still being played. After the loop, draw the final screen and the message:

```cpp file=main.cpp
#include <iostream>
#include "coins.h"
#include "enemy.h"
#include "game.h"
#include "input.h"
#include "map.h"
#include "player.h"
#include "render.h"
#include "rules.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    Map map;
    Player player(1, 1);
    Coins coins;
    Enemy enemy(8, 4);
    bool running = true;
    int turn = 0;
    GameState state = GameState::Playing;

    while (running && state == GameState::Playing) {
        std::cout << renderMap(map, player, coins, enemy);
        std::cout << "Steps: " << player.getSteps() << std::endl;
        std::cout << "Score: " << player.getScore() << std::endl;
        std::cout << "Coins left: " << coins.remaining() << std::endl;
        std::cout << "Health: " << player.getHealth() << std::endl;
        if (enemy.isNear(player, 2)) {
            std::cout << "The enemy is close!" << std::endl;
        }
        std::cout << "Move (W/A/S/D, H for help, Q to quit): ";
        Action action = readAction(std::cin);

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
            case Action::Help:
                showHelp();
                break;
            case Action::Quit:
                running = false;
                break;
            case Action::None:
                break;
        }

        if (blocked) {
            std::cout << "A wall blocks the way." << std::endl;
        }

        if (coins.collectAt(player.getX(), player.getY())) {
            player.addScore(10);
            std::cout << "You found a coin!" << std::endl;
        }

        turn++;
        if (turn % 2 == 0) {
            enemy.chase(map, player);
        }

        if (enemy.getX() == player.getX() && enemy.getY() == player.getY()) {
            player.takeDamage(3);
            std::cout << "The enemy hits you!" << std::endl;
        }

        state = checkState(player, coins);
    }

    std::cout << renderMap(map, player, coins, enemy);
    std::cout << "Steps: " << player.getSteps() << std::endl;
    std::cout << "Score: " << player.getScore() << std::endl;
    std::cout << endMessage(state) << std::endl;

    return 0;
}
```

- `GameState state = GameState::Playing;` is declared **before** the loop, because the code after the loop needs it. Variables declared inside the braces vanish when the pass ends.
- `running && state == GameState::Playing` is true only if **both** parts are true. The loop stops when either the player quits or the game is won or lost.
- `state = checkState(player, coins);` is the last thing in the pass. It looks at the world after the hero moved, collected a coin, and was hit.
- The final map is drawn **after** the loop, so a lost game shows the hero as `X`.
- `endMessage(state)` replaces the fixed "Goodbye!" line.

```predict
question: You press Q while the state is still Playing. What happens?
choice: The loop ends and the message is Goodbye!
choice: The loop keeps going, because the state is still Playing
choice: The loop ends and the message is Game over
answer: The loop ends and the message is Goodbye!
explain: Q sets running to false, so running && state == Playing is false and the loop stops. The state is still Playing, and endMessage turns that into Goodbye!.
```

Build it with the same command as in lesson 4.2:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game
./game
```

Play it twice: once collecting every coin, and once letting the enemy catch you.

```check
contains main.cpp "GameState state = GameState::Playing;" -- Declare GameState state = GameState::Playing; before the loop.
matches main.cpp "while\s*\(\s*running\s*&&\s*state\s*==\s*GameState::Playing\s*\)" -- Loop with while (running && state == GameState::Playing) { ... }
contains main.cpp "state = checkState(player, coins);" -- At the end of each pass, set state = checkState(player, coins);
contains main.cpp "endMessage(state)" -- After the loop, print endMessage(state).
lacks main.cpp "\"Goodbye!\"" -- Goodbye! now comes from endMessage. Remove the fixed line from main.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game" label="the whole project builds" -- Build all nine .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="Goodbye!" label="quitting says goodbye" -- After the loop, print endMessage(state).
run "./game" stdin="d\nd\nd\nd\nd\nd\ns\ns\ns\nd\na\na\na\na\na\na\na\nw\nq\n" stdout="You collected every coin. You win!" label="collecting every coin wins" -- At the end of each pass, set state = checkState(player, coins); and loop only while state == GameState::Playing.
run "./game" stdin="s\ns\nd\nd\nd\nd\nd\nx\nx\nx\nx\nx\nx\nx\nx\nq\n" stdout="#.....X..#" label="a lost game shows the fallen hero" -- After the loop, draw the final map with renderMap(map, player, coins, enemy).
run "./game" stdin="s\ns\nd\nd\nd\nd\nd\nx\nx\nx\nx\nx\nx\nx\nx\nq\n" stdout="The enemy got you. Game over." label="losing all health ends the game" -- Stop the loop when checkState returns GameState::Lost.
```

## Your turn: a rank

A winning score deserves a title. The best possible score is 50: five coins at 10 each. Add a function `rankFor` to `rules.h` and `rules.cpp`:

```
std::string rankFor(int score);
```

It returns:

- `"Gold"` for 50 or more
- `"Silver"` for 30 or more
- `"Bronze"` for 10 or more
- `"None"` for anything lower

Then in `main.cpp`, print `Rank: ` followed by `rankFor(player.getScore())` on the line **after** the final Score line, after the loop.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_rank.cpp provided
#include "minitest.h"
#include <string>
#include "../rules.h"

TEST(RankTest, FullScoreIsGold) {
    EXPECT_EQ(rankFor(50), "Gold");
}

TEST(RankTest, AboveFiftyIsStillGold) {
    EXPECT_EQ(rankFor(80), "Gold");
}

TEST(RankTest, JustBelowGoldIsSilver) {
    EXPECT_EQ(rankFor(49), "Silver");
}

TEST(RankTest, SilverStartsAtThirty) {
    EXPECT_EQ(rankFor(30), "Silver");
    EXPECT_EQ(rankFor(29), "Bronze");
}

TEST(RankTest, BronzeStartsAtTen) {
    EXPECT_EQ(rankFor(10), "Bronze");
    EXPECT_EQ(rankFor(9), "None");
}

TEST(RankTest, ZeroIsNone) {
    EXPECT_EQ(rankFor(0), "None");
}
```

Your changes go in `rules.h`, `rules.cpp` and `main.cpp`. Don't change the tests.

```check
contains rules.h "rankFor" -- Declare std::string rankFor(int score); in rules.h.
run "g++ -std=c++17 -c rules.cpp -o rules.o" label="rules.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_rank.cpp rules.cpp map.cpp player.cpp coins.cpp -o test_rank" label="tests/test_rank.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_rank" label="rankFor passes its tests" -- A test failed. Read which one. Is the comparison >= (not >)? Do you check the biggest score first?
run "g++ -std=c++17 tests/test_state.cpp rules.cpp map.cpp player.cpp coins.cpp -o test_state" label="tests/test_state.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_state" label="checkState still passes" -- Your changes broke checkState. Check you didn't alter it.
run "g++ -std=c++17 tests/test_message.cpp rules.cpp map.cpp player.cpp coins.cpp -o test_message" label="tests/test_message.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_message" label="endMessage still passes" -- Your changes broke endMessage. Check you didn't alter it.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game" label="the whole project builds" -- Build all nine .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="Score: 0\nRank: None\nGoodbye!" label="quitting at once ranks None" -- After the final Score line, print Rank: followed by rankFor(player.getScore()).
run "./game" stdin="d\nd\nd\nd\nd\nd\ns\ns\ns\nd\na\na\na\na\na\na\na\nw\nq\n" stdout="Score: 50\nRank: Gold\nYou collected every coin. You win!" label="a full score ranks Gold" -- Print the Rank line after the final Score line and before the end message.
```

```hints
nudge: You wrote an if / else if / else chain in lesson 3.1. Which score should it test first?
concept: The chain stops at the first true condition. Test the highest threshold first with >=, then the next, and finish with an else for everything lower. Each branch returns a string.
shape: if (score >= 50) { return "Gold"; } else if (score >= 30) { ... } and so on, ending with return "None";
answer: In rules.h, add:
~~~cpp
std::string rankFor(int score);
~~~
In rules.cpp, add:
~~~cpp
std::string rankFor(int score) {
    if (score >= 50) {
        return "Gold";
    } else if (score >= 30) {
        return "Silver";
    } else if (score >= 10) {
        return "Bronze";
    }
    return "None";
}
~~~
In main.cpp, add this line after the final Score line (the one after the loop):
~~~cpp
std::cout << "Rank: " << rankFor(player.getScore()) << std::endl;
~~~
```
