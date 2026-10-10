---
title: 4.1 — Coins and Score
track: Coins and Enemies
runtime: none
support: tests/test_coins.cpp, tests/test_coin_render.cpp, tests/test_score.cpp
---

The map is empty. In this lesson you scatter five coins around it, draw them as `*`, let the hero pick them up by walking over them, and keep score.

Coins are not part of the map's text. A coin can disappear, and the map never changes, so the coins get their own class.

Click the button that creates the supporting test files before you start.

Each test check below builds its own test program: the test file plus the `.cpp` files it uses, never `main.cpp`, as in chapter 3. Type the same command in the terminal to run the tests yourself.

## A position as a struct

Every coin has a position: an `x` and a `y` that belong together. C++ has a way to bundle values into one new type: a **struct**. Create `coins.h`:

```cpp file=coins.h
#pragma once

struct Point {
    int x;
    int y;
};
```

- `struct Point { ... };` defines a new type called `Point` with two `int` members. The semicolon after the closing brace is required.
- A struct is like the class you wrote in lesson 1.3, except its members are public unless you say otherwise. That suits plain bundles of data.
- You create one with braces, giving the values in the order the members are listed: `Point p{3, 2};` sets `x` to 3 and `y` to 2.
- You read a member with a dot: `p.x`, `p.y`.

```predict
question: After Point p{3, 2}; what is the value of p.y?
answer: 2
explain: The braces fill the members in the order they were declared. x is first, so it gets 3, and y is second, so it gets 2.
```

```check
file coins.h -- Create a file called coins.h in the project folder.
contains coins.h "#pragma once" -- Start the header with #pragma once.
matches coins.h "struct\s+Point\s*\{" -- Define the type with struct Point { ... };
matches coins.h "int\s+x\s*;" -- Give Point an int member named x.
matches coins.h "int\s+y\s*;" -- Give Point an int member named y.
matches coins.h "\}\s*;" -- A struct ends with }; The semicolon is required.
```

## Read the tests

The `Coins` class has to keep a list of positions, say whether there is a coin on a tile, and remove a coin when it is collected. The tests are given to you. Read them, don't type them:

```cpp file=tests/test_coins.cpp provided
#include "minitest.h"
#include "../coins.h"

TEST(CoinsTest, StartsWithFiveCoins) {
    Coins c;
    EXPECT_EQ(c.remaining(), 5);
}

TEST(CoinsTest, FindsCoinsAtTheirPositions) {
    Coins c;
    EXPECT_TRUE(c.hasCoinAt(2, 1));
    EXPECT_TRUE(c.hasCoinAt(7, 1));
    EXPECT_TRUE(c.hasCoinAt(1, 3));
    EXPECT_TRUE(c.hasCoinAt(5, 4));
    EXPECT_TRUE(c.hasCoinAt(8, 4));
}

TEST(CoinsTest, NoCoinOnOtherTiles) {
    Coins c;
    EXPECT_FALSE(c.hasCoinAt(1, 1));
    EXPECT_FALSE(c.hasCoinAt(3, 2));
    EXPECT_FALSE(c.hasCoinAt(2, 7));
    EXPECT_FALSE(c.hasCoinAt(-1, -1));
}

TEST(CoinsTest, CollectingRemovesTheCoin) {
    Coins c;
    EXPECT_TRUE(c.collectAt(2, 1));
    EXPECT_EQ(c.remaining(), 4);
    EXPECT_FALSE(c.hasCoinAt(2, 1));
}

TEST(CoinsTest, CollectingNothingChangesNothing) {
    Coins c;
    EXPECT_FALSE(c.collectAt(1, 1));
    EXPECT_EQ(c.remaining(), 5);
}

TEST(CoinsTest, ACoinCanOnlyBeCollectedOnce) {
    Coins c;
    EXPECT_TRUE(c.collectAt(7, 1));
    EXPECT_FALSE(c.collectAt(7, 1));
    EXPECT_EQ(c.remaining(), 4);
}

TEST(CoinsTest, OtherCoinsStayWhenOneIsCollected) {
    Coins c;
    c.collectAt(1, 3);
    EXPECT_TRUE(c.hasCoinAt(2, 1));
    EXPECT_TRUE(c.hasCoinAt(7, 1));
    EXPECT_TRUE(c.hasCoinAt(5, 4));
    EXPECT_TRUE(c.hasCoinAt(8, 4));
    EXPECT_EQ(c.remaining(), 4);
}

TEST(CoinsTest, CanCollectEveryCoin) {
    Coins c;
    c.collectAt(2, 1);
    c.collectAt(7, 1);
    c.collectAt(1, 3);
    c.collectAt(5, 4);
    c.collectAt(8, 4);
    EXPECT_EQ(c.remaining(), 0);
}
```

- A new `Coins` has five coins, all on floor tiles of the map.
- `collectAt(x, y)` returns `true` if it found a coin there and removed it, and `false` if there was nothing to collect.
- The last two tests catch a classic mistake: removing the wrong coin, or breaking the list when one is removed.

## Declare the Coins class

Replace `coins.h` with the full class. The `Point` struct stays at the top:

```cpp file=coins.h
#pragma once

#include <vector>

struct Point {
    int x;
    int y;
};

class Coins {
public:
    Coins();

    bool hasCoinAt(int x, int y) const;
    int remaining() const;
    bool collectAt(int x, int y);

private:
    std::vector<Point> coins;
};
```

- `std::vector<Point>` is the vector from lesson 2.1. A vector can hold any type, not only strings: here it holds `Point` values.
- `hasCoinAt` and `remaining` only look, so they are `const`.
- `collectAt` **changes** the list of coins, so it is not `const`. The compiler would refuse to compile a `const` function that removes an item.

```predict
question: Why is collectAt not marked const?
choice: It changes the list of coins
choice: It returns a bool
choice: It takes two ints
answer: It changes the list of coins
explain: const promises that the object stays the same. Removing a coin changes the object, so collectAt cannot make that promise.
```

```check
contains coins.h "#include <vector>" -- Add #include <vector> at the top.
matches coins.h "class\s+Coins" -- Declare a class named Coins.
matches coins.h "Coins\s*\(\s*\)\s*;" -- Declare a constructor that takes nothing: Coins();
matches coins.h "bool\s+hasCoinAt\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*const\s*;" -- Declare bool hasCoinAt(int x, int y) const;
matches coins.h "int\s+remaining\s*\(\s*\)\s*const\s*;" -- Declare int remaining() const;
matches coins.h "bool\s+collectAt\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare bool collectAt(int x, int y); with no const, because it changes the coins.
matches coins.h "std::vector<Point>\s+coins\s*;" -- Add a private member: std::vector<Point> coins;
```

## Place the coins and look for one

Create `coins.cpp` with the constructor and the two functions that only look:

```cpp file=coins.cpp
#include "coins.h"

Coins::Coins() {
    coins = { {2, 1}, {7, 1}, {1, 3}, {5, 4}, {8, 4} };
}

bool Coins::hasCoinAt(int x, int y) const {
    for (const Point& coin : coins) {
        if (coin.x == x && coin.y == y) {
            return true;
        }
    }
    return false;
}

int Coins::remaining() const {
    return static_cast<int>(coins.size());
}
```

- Each inner `{2, 1}` is one `Point`, with the `x` first and the `y` second. The outer braces are the list of five.
- `for (const Point& coin : coins)` is the range-based loop from lesson 2.1. `coin` looks at each `Point` in turn without copying it.
- `coin.x == x && coin.y == y` is true only when **both** coordinates match. Inside the function, `x` and `y` are the parameters. `coin.x` and `coin.y` are the coin's own values.
- `return true;` leaves the function as soon as a match is found. `return false;` is **after** the loop: it is reached only when no coin matched. Putting `return false;` inside the loop would stop after the first coin, which is a very common bug.
- `remaining` is the vector's size, converted to an `int`, as in lesson 2.1.

```predict
question: You call hasCoinAt(7, 1). The coins are listed in the order (2,1), (7,1), (1,3), (5,4), (8,4). How many coins does the loop look at before it returns?
answer: 2
explain: The first coin, (2,1), doesn't match. The second, (7,1), does, so the function returns true at once and the other three are never looked at.
```

```check
file coins.cpp -- Create a file called coins.cpp in the project folder.
contains coins.cpp "#include \"coins.h\"" -- Include your own header with #include "coins.h".
matches coins.cpp "Coins::Coins\s*\(\s*\)" -- Define the constructor as Coins::Coins() { ... }
run "g++ -std=c++17 -c coins.cpp -o coins.o" label="coins.cpp compiles" -- Fix the compiler errors shown. Every function needs Coins:: before its name.
```

## Collect a coin

Now the function that changes the list. Add it at the end of `coins.cpp`:

```cpp file=coins.cpp
#include "coins.h"

Coins::Coins() {
    coins = { {2, 1}, {7, 1}, {1, 3}, {5, 4}, {8, 4} };
}

bool Coins::hasCoinAt(int x, int y) const {
    for (const Point& coin : coins) {
        if (coin.x == x && coin.y == y) {
            return true;
        }
    }
    return false;
}

int Coins::remaining() const {
    return static_cast<int>(coins.size());
}

bool Coins::collectAt(int x, int y) {
    for (int i = 0; i < remaining(); i++) {
        if (coins[i].x == x && coins[i].y == y) {
            coins.erase(coins.begin() + i);
            return true;
        }
    }
    return false;
}
```

- This loop uses a counter `i`, not the range-based form, because `erase` needs to know **which** item to remove.
- `coins[i]` is the item at index `i`.
- `coins.begin()` is an **iterator**: an object that points at one item of the vector, here the first. Adding `i` moves it along `i` items. `coins.erase(...)` removes the item it points at, and every item after it moves down one place.
- After an `erase`, the indexes of the remaining coins have changed. That is why the function returns **straight away**. Carrying on round the loop would skip a coin.

```predict
question: The list is (2,1), (7,1), (1,3), (5,4), (8,4). You collect the coin at (7,1). Which coin is now at coins[1]?
choice: (7,1), because erase does nothing to the indexes
choice: (1,3), because the later coins moved down one place
choice: (2,1), because the list restarted
answer: (1,3), because the later coins moved down one place
explain: erase removes the second item and closes the gap. The old third item, (1,3), slides into index 1.
```

```check
contains coins.cpp "coins.erase(" -- Remove the coin with coins.erase(...)
matches coins.cpp "bool\s+Coins::collectAt\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)" -- Define bool Coins::collectAt(int x, int y) { ... }
run "g++ -std=c++17 -c coins.cpp -o coins.o" label="coins.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_coins.cpp coins.cpp -o test_coins" label="tests/test_coins.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_coins" label="Coins pass their tests" -- A test failed. Read which one. Does hasCoinAt return false only AFTER the loop? Does collectAt return right after the erase?
```

## Read the drawing tests

To see the coins you need a drawing function that knows about them. Here are the tests, given to you:

```cpp file=tests/test_coin_render.cpp provided
#include "minitest.h"
#include <algorithm>
#include <string>
#include "../render.h"

TEST(CoinRenderTest, DrawsCoinsAsStars) {
    Map m;
    Player p(1, 1);
    Coins c;
    std::string out = renderMap(m, p, c);
    EXPECT_EQ(out[1 * 11 + 2], '*');
    EXPECT_EQ(out[4 * 11 + 8], '*');
}

TEST(CoinRenderTest, DrawsEveryCoin) {
    Map m;
    Player p(1, 1);
    Coins c;
    std::string out = renderMap(m, p, c);
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 5);
}

TEST(CoinRenderTest, HeroIsDrawnOverACoin) {
    Map m;
    Player p(2, 1);
    Coins c;
    std::string out = renderMap(m, p, c);
    EXPECT_EQ(out[1 * 11 + 2], '@');
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 4);
}

TEST(CoinRenderTest, CollectedCoinsDisappear) {
    Map m;
    Player p(1, 1);
    Coins c;
    c.collectAt(2, 1);
    std::string out = renderMap(m, p, c);
    EXPECT_EQ(out[1 * 11 + 2], '.');
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 4);
}

TEST(CoinRenderTest, PictureKeepsItsSize) {
    Map m;
    Player p(1, 1);
    Coins c;
    EXPECT_EQ(renderMap(m, p, c).size(), 66u);
}
```

- These tests call `renderMap` with **three** arguments. You already have `renderMap` with two. C++ lets two functions share a name as long as their parameter lists differ. This is **overloading**, and the compiler picks the right one from the arguments you pass.
- As in lesson 2.3, the tile `(x, y)` is at index `y * 11 + x`. Each row is 10 tiles plus the newline.
- The hero is drawn **over** a coin, never the other way round.

## Draw the coins

Add the new overload to `render.cpp`. Keep the first function as it is:

```cpp file=render.cpp
#include "render.h"

std::string renderMap(const Map& map, const Player& player) {
    std::string out;
    for (int y = 0; y < map.getHeight(); y++) {
        for (int x = 0; x < map.getWidth(); x++) {
            if (x == player.getX() && y == player.getY()) {
                if (player.getHealth() == 0) {
                    out += 'X';
                } else {
                    out += '@';
                }
            } else {
                out += map.getTile(x, y);
            }
        }
        out += '\n';
    }
    return out;
}

std::string renderMap(const Map& map, const Player& player, const Coins& coins) {
    std::string out = renderMap(map, player);
    int rowLength = map.getWidth() + 1;

    for (int y = 0; y < map.getHeight(); y++) {
        for (int x = 0; x < map.getWidth(); x++) {
            if (coins.hasCoinAt(x, y)) {
                int index = y * rowLength + x;
                if (out[index] == '.') {
                    out[index] = '*';
                }
            }
        }
    }
    return out;
}
```

Also add two things to `render.h`: the include, and the declaration of the new overload:

```cpp
#include "coins.h"

std::string renderMap(const Map& map, const Player& player, const Coins& coins);
```

- The new function starts from the **finished picture** of the old one: map plus hero. It then overwrites the coin tiles.
- `rowLength` is the width plus one for the `'\n'`, so `y * rowLength + x` is the index of tile `(x, y)` in the string.
- `out[index] = '*';` replaces one character. `out[index]` on a string gives the character at that index, and you can assign to it.
- It only replaces a `'.'`. If the hero is standing there, the character is `'@'` (or `'X'`), so it is left alone. This is why the hero is drawn over a coin.

```check
contains render.h "#include \"coins.h\"" -- Add #include "coins.h" to render.h.
matches render.h "std::string\s+renderMap\s*\(\s*const\s+Map\s*&\s*\w+\s*,\s*const\s+Player\s*&\s*\w+\s*,\s*const\s+Coins\s*&\s*\w+\s*\)\s*;" -- Declare std::string renderMap(const Map& map, const Player& player, const Coins& coins); in render.h.
contains render.cpp "const Coins& coins" -- Define the overload that takes const Coins& coins.
run "g++ -std=c++17 -c render.cpp -o render.o" label="render.cpp compiles" -- Fix the compiler errors shown. The overload must match its declaration in render.h.
run "g++ -std=c++17 tests/test_coin_render.cpp render.cpp map.cpp player.cpp coins.cpp -o test_coin_render" label="tests/test_coin_render.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_coin_render" label="Coins are drawn correctly" -- A test failed. Read which one. Is the index y * (width + 1) + x? Do you only replace a '.', so the hero stays on top?
run "g++ -std=c++17 tests/test_render.cpp render.cpp map.cpp player.cpp coins.cpp -o test_render" label="tests/test_render.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_render" label="The two-argument renderMap still works" -- Your changes broke an earlier test. Check you didn't alter the first renderMap.
run "g++ -std=c++17 tests/test_dead.cpp render.cpp map.cpp player.cpp coins.cpp -o test_dead" label="tests/test_dead.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_dead" label="The fallen hero is still drawn as X" -- Your changes broke an earlier test. Check you didn't alter the first renderMap.
```

## Pick up coins in the game

Create the coins in `main`, draw them, show how many are left, and collect one when the hero stands on it:

```cpp file=main.cpp
#include <iostream>
#include "coins.h"
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
    bool running = true;

    while (running) {
        std::cout << renderMap(map, player, coins);
        std::cout << "Steps: " << player.getSteps() << std::endl;
        std::cout << "Coins left: " << coins.remaining() << std::endl;
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
            std::cout << "You found a coin!" << std::endl;
        }
    }

    std::cout << "Goodbye!" << std::endl;
    return 0;
}
```

- `renderMap(map, player, coins)` picks the three-argument overload.
- `coins.collectAt(...)` is used as the condition of an `if`. It returns `true` exactly when a coin was there and has been removed, so the message prints only when something was picked up.
- The pickup runs **after** the move. So the hero collects a coin on the same pass it steps onto it.

```predict
question: The hero starts at (1, 1) and there is a coin at (2, 1). You press D once. What does the next screen's "Coins left" line say?
choice: Coins left: 5
choice: Coins left: 4
answer: Coins left: 4
explain: D moves the hero right onto (2, 1). The pickup check runs in the same pass, so the coin is removed before the next screen is drawn.
```

The game now has an eighth `.cpp` file, `coins.cpp`:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp -o game
./game
```

Run it and collect all five. Then press `Q`.

```check
contains main.cpp "#include \"coins.h\"" -- Include coins.h in main.cpp.
contains main.cpp "Coins coins;" -- Create the coins with Coins coins;
contains main.cpp "renderMap(map, player, coins)" -- Draw with the three-argument renderMap(map, player, coins).
matches main.cpp "if\s*\(\s*coins\.collectAt\(\s*player\.getX\(\)\s*,\s*player\.getY\(\)\s*\)\s*\)" -- Collect with if (coins.collectAt(player.getX(), player.getY())) { ... }
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp -o game" label="the whole project builds" -- Build all eight .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="#@*....*.#" label="the coins are drawn" -- Draw with the three-argument renderMap(map, player, coins).
run "./game" stdin="d\nq\n" stdout="You found a coin!" label="stepping on a coin collects it" -- After the move, collect with if (coins.collectAt(player.getX(), player.getY())) { ... }
run "./game" stdin="d\nq\n" stdout="Coins left: 4" label="a collected coin is gone" -- Print Coins left: followed by coins.remaining() after the Steps line.
```

## Your turn: keep score

Each coin should be worth 10 points. Add a score to the hero, following the same pattern as `steps` in lesson 3.2:

- `Player` gets `int getScore() const` and `void addScore(int points)`. The score starts at `0`.
- In `main.cpp`, when a coin is collected, add `10` points.
- `main.cpp` prints one line, `Score: ` followed by the score, **directly after the Steps line**, on every pass.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_score.cpp provided
#include "minitest.h"
#include "../player.h"

TEST(ScoreTest, StartsAtZero) {
    Player p(0, 0);
    EXPECT_EQ(p.getScore(), 0);
}

TEST(ScoreTest, PointsAddUp) {
    Player p(0, 0);
    p.addScore(10);
    p.addScore(5);
    EXPECT_EQ(p.getScore(), 15);
}

TEST(ScoreTest, MovingAndDamageDoNotChangeTheScore) {
    Player p(0, 0);
    p.move(1, 0);
    p.takeDamage(2);
    EXPECT_EQ(p.getScore(), 0);
}

TEST(ScoreTest, ScoringChangesNothingElse) {
    Player p(3, 3);
    p.addScore(10);
    EXPECT_EQ(p.getHealth(), 10);
    EXPECT_EQ(p.getSteps(), 0);
    EXPECT_EQ(p.getX(), 3);
    EXPECT_EQ(p.getY(), 3);
}
```

Your changes go in `player.h`, `player.cpp` and `main.cpp`. Don't change the tests.

```check
contains player.h "getScore" -- Declare int getScore() const; in player.h.
contains player.h "addScore" -- Declare void addScore(int points); in player.h.
matches player.cpp "score\(\s*0\s*\)" -- Start the score at 0 in the constructor's initializer list.
run "g++ -std=c++17 -c player.cpp -o player.o" label="player.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_score.cpp player.cpp -o test_score" label="tests/test_score.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_score" label="Score works" -- A test failed. Read which one. Does the score start at 0, and does only addScore change it?
run "g++ -std=c++17 tests/test_player.cpp player.cpp -o test_player" label="tests/test_player.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_player" label="Position tests still pass" -- Your changes broke the position tests. Check the constructor still sets x and y.
run "g++ -std=c++17 tests/test_health.cpp player.cpp -o test_health" label="tests/test_health.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_health" label="Health tests still pass" -- Your changes broke the health tests. Check health still starts at 10.
run "g++ -std=c++17 tests/test_steps.cpp player.cpp -o test_steps" label="tests/test_steps.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_steps" label="Step tests still pass" -- Your changes broke the step tests. Check steps still start at 0.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp -o game" label="the whole project builds" -- Build all eight .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="Steps: 0\nScore: 0\nCoins left: 5" label="the Score line follows the Steps line" -- Print Score: followed by player.getScore() directly after the Steps line.
run "./game" stdin="d\nq\n" stdout="Steps: 1\nScore: 10\nCoins left: 4" label="a coin is worth 10 points" -- When a coin is collected, call player.addScore(10).
```

```hints
nudge: You already added steps to Player in lesson 3.2. What changes if you do the same thing for score?
concept: score is another private int. It is set to 0 in the initializer list, getScore returns it, and addScore adds the points to it. In main, addScore goes inside the if that collects the coin.
shape: Add int score; after steps in the private section, declare getScore and addScore, add score(0) at the end of the initializer list, define the two functions, then add the two lines to main.
answer: In player.h, add to the public section and the private section:
~~~cpp
    int getScore() const;
    void addScore(int points);
~~~
~~~cpp
    int score;
~~~
In player.cpp, change the constructor and add the two functions:
~~~cpp
Player::Player(int startX, int startY) : x(startX), y(startY), health(10), steps(0), score(0) {}

int Player::getScore() const { return score; }

void Player::addScore(int points) {
    score += points;
}
~~~
In main.cpp, add this line right after the Steps line:
~~~cpp
std::cout << "Score: " << player.getScore() << std::endl;
~~~
and change the pickup so it reads:
~~~cpp
if (coins.collectAt(player.getX(), player.getY())) {
    player.addScore(10);
    std::cout << "You found a coin!" << std::endl;
}
~~~
```
