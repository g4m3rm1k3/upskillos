---
title: 4.2 — An Enemy That Chases
runtime: none
support: tests/test_enemy.cpp, tests/test_enemy_render.cpp, tests/test_near.cpp
---

A dungeon needs danger. In this lesson you add an **enemy**, drawn as `E`. Every second turn it takes one step toward the hero, and when it stands on the hero's tile it hits for 3 damage.

The chasing rule is simple, and it is the same rule you will test:

1. Work out how far away the hero is, across and down.
2. Step along the **longer** distance first. If they are equal, step across first.
3. If that step is a wall, try the other direction.
4. If both are blocked, stay put.

Click the button that creates the supporting test files before you start.

Each test check below builds its own test program: the test file plus the `.cpp` files it uses, never `main.cpp`, as in chapter 3. Type the same command in the terminal to run the tests yourself.

## Read the tests

The tests are given to you. Read them, don't type them:

```cpp file=tests/test_enemy.cpp provided
#include "minitest.h"
#include "../enemy.h"

TEST(EnemyTest, StartsAtGivenPosition) {
    Enemy e(8, 4);
    EXPECT_EQ(e.getX(), 8);
    EXPECT_EQ(e.getY(), 4);
}

TEST(EnemyTest, StepsAcrossWhenTheHeroIsFartherAcross) {
    Map m;
    Player p(2, 4);
    Enemy e(8, 4);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 7);
    EXPECT_EQ(e.getY(), 4);
}

TEST(EnemyTest, StepsUpWhenTheHeroIsFartherUp) {
    Map m;
    Player p(1, 1);
    Enemy e(1, 4);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 1);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, LongerDistanceGoesFirst) {
    Map m;
    Player p(7, 1);
    Enemy e(8, 4);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 8);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, EqualDistancesGoAcrossFirst) {
    Map m;
    Player p(7, 3);
    Enemy e(8, 4);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 7);
    EXPECT_EQ(e.getY(), 4);
}

TEST(EnemyTest, StaysOnTheHero) {
    Map m;
    Player p(3, 3);
    Enemy e(3, 3);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 3);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, FallsBackToTheOtherDirection) {
    Map m;
    Player p(4, 1);
    Enemy e(3, 3);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 4);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, StaysPutWhenBothWaysAreBlocked) {
    Map m;
    Player p(4, 1);
    Enemy e(4, 3);
    e.chase(m, p);
    EXPECT_EQ(e.getX(), 4);
    EXPECT_EQ(e.getY(), 3);
}

TEST(EnemyTest, NeverWalksIntoAWall) {
    Map m;
    Player p(8, 1);
    Enemy e(1, 4);
    for (int i = 0; i < 20; i++) {
        e.chase(m, p);
        EXPECT_FALSE(m.isWall(e.getX(), e.getY()));
    }
}

TEST(EnemyTest, ReachesTheHeroOnOpenFloor) {
    Map m;
    Player p(8, 4);
    Enemy e(1, 4);
    for (int i = 0; i < 7; i++) {
        e.chase(m, p);
    }
    EXPECT_EQ(e.getX(), 8);
    EXPECT_EQ(e.getY(), 4);
}
```

- `e.chase(m, p)` moves the enemy one step. The map and the hero are only looked at, so they are passed as `const` references.
- The block of wall on row 2 is the interesting part. Two tests put the enemy right below it.
- Read `FallsBackToTheOtherDirection` and `StaysPutWhenBothWaysAreBlocked` slowly. They are rule 3 and rule 4.

## Declare the Enemy class

```cpp file=enemy.h
#pragma once

#include "map.h"
#include "player.h"

class Enemy {
public:
    Enemy(int startX, int startY);

    int getX() const;
    int getY() const;
    void chase(const Map& map, const Player& player);

private:
    bool tryStep(const Map& map, int dx, int dy);

    int x;
    int y;
};
```

- The header includes `map.h` and `player.h` because `chase` mentions both types.
- `tryStep` is a **private function**. Only `Enemy`'s own code can call it. It tries one step and reports whether it happened, like `tryMove` in lesson 3.3.
- `chase` isn't `const`: it moves the enemy.

```check
file enemy.h -- Create a file called enemy.h in the project folder.
contains enemy.h "class Enemy" -- Declare a class named Enemy.
matches enemy.h "Enemy\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare a constructor that takes two ints.
matches enemy.h "void\s+chase\s*\(\s*const\s+Map\s*&\s*\w+\s*,\s*const\s+Player\s*&\s*\w+\s*\)\s*;" -- Declare void chase(const Map& map, const Player& player);
matches enemy.h "bool\s+tryStep\s*\(\s*const\s+Map\s*&\s*\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare a private bool tryStep(const Map& map, int dx, int dy);
```

## Step toward the hero

Create `enemy.cpp`. This first version ignores walls, so you can see the direction logic on its own:

```cpp file=enemy.cpp
#include "enemy.h"

#include <cstdlib>

static int sign(int n) {
    if (n > 0) {
        return 1;
    }
    if (n < 0) {
        return -1;
    }
    return 0;
}

Enemy::Enemy(int startX, int startY) : x(startX), y(startY) {}

int Enemy::getX() const { return x; }
int Enemy::getY() const { return y; }

bool Enemy::tryStep(const Map& map, int dx, int dy) {
    if (dx == 0 && dy == 0) {
        return false;
    }
    x += dx;
    y += dy;
    return true;
}

void Enemy::chase(const Map& map, const Player& player) {
    int dx = player.getX() - x;
    int dy = player.getY() - y;
    int stepX = sign(dx);
    int stepY = sign(dy);

    if (std::abs(dx) >= std::abs(dy)) {
        if (tryStep(map, stepX, 0)) {
            return;
        }
        tryStep(map, 0, stepY);
    } else {
        if (tryStep(map, 0, stepY)) {
            return;
        }
        tryStep(map, stepX, 0);
    }
}
```

- `dx` and `dy` are how far the hero is across and down. They are negative when the hero is to the left or above.
- `sign` turns any number into `-1`, `0` or `1`: the direction of one step. `static` on a free function means only this file can use it.
- `std::abs` from `<cstdlib>` drops the minus sign: `std::abs(-3)` is `3`. We compare the distances, ignoring direction.
- If the across distance is at least as big, we try the horizontal step first. `>=` is what makes a tie go across.
- `tryStep` returns `true` if it moved. `if (tryStep(...)) { return; }` ends the function after a successful step. Only when it fails does the code try the other direction.
- Asking for a step of `(0, 0)` returns `false`. That covers the enemy standing on the hero: both directions fail and it stays.

```predict
question: The enemy is at (8, 4) and the hero is at (7, 1). Which way does the enemy step first?
choice: Left, to (7, 4)
choice: Up, to (8, 3)
answer: Up, to (8, 3)
explain: dx is -1 and dy is -3. The distance down is bigger (3 against 1), so the vertical step comes first.
```

```check
file enemy.cpp -- Create a file called enemy.cpp in the project folder.
contains enemy.cpp "#include \"enemy.h\"" -- Include your own header with #include "enemy.h".
contains enemy.cpp "std::abs" -- Compare the distances with std::abs(...). Add #include <cstdlib>.
matches enemy.cpp "void\s+Enemy::chase\s*\(\s*const\s+Map\s*&\s*\w+\s*,\s*const\s+Player\s*&\s*\w+\s*\)" -- Define void Enemy::chase(const Map& map, const Player& player) { ... }
run "g++ -std=c++17 -c enemy.cpp -o enemy.o" label="enemy.cpp compiles" -- Fix the compiler errors shown. Every member function needs Enemy:: before its name.
```

## Respect the walls

Add the wall check to `tryStep`. This is the only change:

```cpp file=enemy.cpp
#include "enemy.h"

#include <cstdlib>

static int sign(int n) {
    if (n > 0) {
        return 1;
    }
    if (n < 0) {
        return -1;
    }
    return 0;
}

Enemy::Enemy(int startX, int startY) : x(startX), y(startY) {}

int Enemy::getX() const { return x; }
int Enemy::getY() const { return y; }

bool Enemy::tryStep(const Map& map, int dx, int dy) {
    if (dx == 0 && dy == 0) {
        return false;
    }
    if (map.isWall(x + dx, y + dy)) {
        return false;
    }
    x += dx;
    y += dy;
    return true;
}

void Enemy::chase(const Map& map, const Player& player) {
    int dx = player.getX() - x;
    int dy = player.getY() - y;
    int stepX = sign(dx);
    int stepY = sign(dy);

    if (std::abs(dx) >= std::abs(dy)) {
        if (tryStep(map, stepX, 0)) {
            return;
        }
        tryStep(map, 0, stepY);
    } else {
        if (tryStep(map, 0, stepY)) {
            return;
        }
        tryStep(map, stepX, 0);
    }
}
```

- `map.isWall(x + dx, y + dy)` looks at the tile the enemy **would** step onto, the same idea as `tryMove` in lesson 3.3. If it is a wall, the step doesn't happen.
- Because `chase` tries the other direction when the first fails, the enemy can slide around a corner.
- It isn't clever, though. If the hero is straight above a wall and the enemy straight below it, both tries fail and the enemy stays stuck. The tests include that case. Players can use it to escape.

```predict
question: The enemy is at (4, 3), directly below the block of wall, and the hero is at (4, 1), directly above it. What does chase do?
choice: The enemy walks around the block
choice: The enemy stays at (4, 3)
choice: The enemy walks into the wall at (4, 2)
answer: The enemy stays at (4, 3)
explain: dx is 0 and dy is -2, so the vertical step is tried first and (4, 2) is a wall. The fallback is a horizontal step of 0, which is no step at all.
```

```check
contains enemy.cpp "isWall" -- Check the target tile with map.isWall(x + dx, y + dy) in tryStep.
run "g++ -std=c++17 -c enemy.cpp -o enemy.o" label="enemy.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_enemy.cpp enemy.cpp map.cpp player.cpp -o test_enemy" label="tests/test_enemy.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_enemy" label="The enemy chases correctly" -- A test failed. Read which one. Does a tie go across first (>=)? Do you check the NEW position for a wall, not the current one?
```

## Read the drawing tests

Another given file. The enemy is drawn as `E`, over coins and floor, but never over the hero:

```cpp file=tests/test_enemy_render.cpp provided
#include "minitest.h"
#include <algorithm>
#include <string>
#include "../render.h"

TEST(EnemyRenderTest, DrawsTheEnemyAsE) {
    Map m;
    Player p(1, 1);
    Coins c;
    Enemy e(8, 3);
    std::string out = renderMap(m, p, c, e);
    EXPECT_EQ(out[3 * 11 + 8], 'E');
    EXPECT_EQ(std::count(out.begin(), out.end(), 'E'), 1);
}

TEST(EnemyRenderTest, CoinsAreStillDrawn) {
    Map m;
    Player p(1, 1);
    Coins c;
    Enemy e(8, 3);
    std::string out = renderMap(m, p, c, e);
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 5);
}

TEST(EnemyRenderTest, EnemyIsDrawnOverACoin) {
    Map m;
    Player p(1, 1);
    Coins c;
    Enemy e(8, 4);
    std::string out = renderMap(m, p, c, e);
    EXPECT_EQ(out[4 * 11 + 8], 'E');
    EXPECT_EQ(std::count(out.begin(), out.end(), '*'), 4);
}

TEST(EnemyRenderTest, HeroIsDrawnOverTheEnemy) {
    Map m;
    Player p(5, 3);
    Coins c;
    Enemy e(5, 3);
    std::string out = renderMap(m, p, c, e);
    EXPECT_EQ(out[3 * 11 + 5], '@');
    EXPECT_EQ(std::count(out.begin(), out.end(), 'E'), 0);
}

TEST(EnemyRenderTest, PictureKeepsItsSize) {
    Map m;
    Player p(1, 1);
    Coins c;
    Enemy e(8, 3);
    EXPECT_EQ(renderMap(m, p, c, e).size(), 66u);
}
```

This is a fourth `renderMap`, with four arguments. The same overloading idea as lesson 4.1.

## Draw the enemy

Add a function to `render.cpp` that starts from the three-argument picture, as that one started from the two-argument picture:

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

std::string renderMap(const Map& map, const Player& player, const Coins& coins, const Enemy& enemy) {
    std::string out = renderMap(map, player, coins);

    int index = enemy.getY() * (map.getWidth() + 1) + enemy.getX();
    bool onMap = map.inBounds(enemy.getX(), enemy.getY());

    if (onMap && (out[index] == '.' || out[index] == '*')) {
        out[index] = 'E';
    }
    return out;
}
```

Also add the include and the declaration to `render.h`:

```cpp
#include "enemy.h"

std::string renderMap(const Map& map, const Player& player, const Coins& coins, const Enemy& enemy);
```

- `||` means "or": the tile may be floor `'.'` or a coin `'*'`. Anything else on that tile, the hero's `'@'` or `'X'`, is left alone.
- The parentheses matter. `onMap && (a || b)` means "on the map, and one of the two". Without them, `&&` binds tighter than `||` and the meaning changes.
- `&&` stops as soon as its left side is `false`. If the enemy were off the map, `onMap` is `false` and `out[index]` is never evaluated. Indexing outside a string is undefined behaviour, as in lesson 2.2.

```predict
question: The hero and the enemy are on the same tile. What does that tile show?
choice: @
choice: E
answer: @
explain: The picture already has '@' on that tile before the enemy is drawn. The enemy is only drawn over '.' or '*', so the hero stays on top.
```

```check
contains render.h "#include \"enemy.h\"" -- Add #include "enemy.h" to render.h.
contains render.h "const Enemy&" -- Declare the four-argument renderMap in render.h, with a const Enemy& parameter.
contains render.cpp "const Enemy& enemy" -- Define the overload that takes const Enemy& enemy.
run "g++ -std=c++17 -c render.cpp -o render.o" label="render.cpp compiles" -- Fix the compiler errors shown. The overload must match its declaration in render.h.
run "g++ -std=c++17 tests/test_enemy_render.cpp render.cpp map.cpp player.cpp coins.cpp enemy.cpp -o test_enemy_render" label="tests/test_enemy_render.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_enemy_render" label="The enemy is drawn correctly" -- A test failed. Read which one. Do you only draw E over '.' or '*', so the hero stays on top?
run "g++ -std=c++17 tests/test_coin_render.cpp render.cpp map.cpp player.cpp coins.cpp enemy.cpp -o test_coin_render" label="tests/test_coin_render.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_coin_render" label="Coins are still drawn" -- Your changes broke an earlier test. Check you didn't alter the other renderMap functions.
run "g++ -std=c++17 tests/test_render.cpp render.cpp map.cpp player.cpp coins.cpp enemy.cpp -o test_render" label="tests/test_render.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_render" label="The two-argument renderMap still works" -- Your changes broke an earlier test.
```

## Put the enemy in the game

The enemy moves every second turn, and hurts the hero when they share a tile:

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

    while (running) {
        std::cout << renderMap(map, player, coins, enemy);
        std::cout << "Steps: " << player.getSteps() << std::endl;
        std::cout << "Score: " << player.getScore() << std::endl;
        std::cout << "Coins left: " << coins.remaining() << std::endl;
        std::cout << "Health: " << player.getHealth() << std::endl;
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
    }

    std::cout << "Goodbye!" << std::endl;
    return 0;
}
```

- `turn` counts passes through the loop. `turn++` adds 1.
- `%` is the **remainder** operator: `turn % 2` is what is left when you divide by 2. It is `0` for even numbers and `1` for odd ones. So `turn % 2 == 0` is true on every second pass, and the enemy is slower than the hero. That leaves the player a chance to escape.
- The enemy moves **after** the hero. A hero who steps away is not hit, unless the enemy catches up in the same pass.
- The hit check runs on every pass. If the hero stands still on the enemy's tile, it takes 3 damage every pass. Health can reach `0`, and then the hero is drawn as `X` (lesson 2.3). Nothing ends the game yet. Lesson 4.3 does that.

The game now has a ninth `.cpp` file, `enemy.cpp`:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game
./game
```

```predict
question: On which passes through the loop does the enemy take its step?
choice: Every pass
choice: Passes 2, 4, 6 and so on
choice: Passes 1, 3, 5 and so on
answer: Passes 2, 4, 6 and so on
explain: turn is increased to 1 on the first pass, and 1 % 2 is 1, not 0. On the second pass turn is 2, and 2 % 2 is 0, so the enemy moves.
```

```check
contains main.cpp "#include \"enemy.h\"" -- Include enemy.h in main.cpp.
contains main.cpp "Enemy enemy(8, 4);" -- Create the enemy with Enemy enemy(8, 4);
matches main.cpp "renderMap\(\s*map\s*,\s*player\s*,\s*coins\s*,\s*enemy\s*\)" -- Draw with the four-argument renderMap(map, player, coins, enemy).
matches main.cpp "turn\s*%\s*2\s*==\s*0" -- Move the enemy only when turn % 2 == 0.
contains main.cpp "enemy.chase(map, player)" -- Call enemy.chase(map, player) to move the enemy.
contains main.cpp "player.takeDamage(3)" -- Damage the hero with player.takeDamage(3) when they share a tile.
contains main.cpp "Health: " -- Print a Health line after the Coins left line.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game" label="the whole project builds" -- Build all nine .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="#....*..E#" label="the enemy is drawn" -- Create the enemy with Enemy enemy(8, 4); and draw with renderMap(map, player, coins, enemy).
run "./game" stdin="x\nq\n" without="#....*.E*#" label="the enemy waits on the first pass" -- Move the enemy only when turn % 2 == 0, after turn++.
run "./game" stdin="x\nx\nq\n" stdout="#....*.E*#" label="the enemy steps on the second pass" -- Call enemy.chase(map, player) when turn % 2 == 0.
run "./game" stdin="s\ns\nd\nd\nd\nd\nd\nx\nx\nx\nx\nx\nx\nx\nx\nq\n" stdout="The enemy hits you!" label="the enemy hits the hero" -- When the enemy and the hero share a tile, call player.takeDamage(3) and print The enemy hits you!
run "./game" stdin="s\ns\nd\nd\nd\nd\nd\nx\nx\nx\nx\nx\nx\nx\nx\nq\n" stdout="Health: 7" label="a hit costs 3 health" -- Print Health: followed by player.getHealth() after the Coins left line.
```

## Your turn: sense the danger

Warn the player when the enemy gets close.

- `Enemy` gets `bool isNear(const Player& player, int range) const`. It is `true` when the total distance to the hero is `range` or less. The **total distance** is the steps across plus the steps down, whichever way they point.
- `main.cpp` prints `The enemy is close!` when `enemy.isNear(player, 2)` is true. Print it **directly after the Health line**, on every pass.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_near.cpp provided
#include "minitest.h"
#include "../enemy.h"

TEST(NearTest, SameTileIsNear) {
    Enemy e(3, 3);
    Player p(3, 3);
    EXPECT_TRUE(e.isNear(p, 0));
}

TEST(NearTest, ExactRangeCounts) {
    Enemy e(1, 1);
    Player p(3, 2);
    EXPECT_TRUE(e.isNear(p, 3));
}

TEST(NearTest, OneTooFarIsNotNear) {
    Enemy e(1, 1);
    Player p(3, 2);
    EXPECT_FALSE(e.isNear(p, 2));
}

TEST(NearTest, WorksInEveryDirection) {
    Enemy e(5, 3);
    Player left(3, 3);
    Player up(5, 1);
    Player diagonal(6, 4);
    EXPECT_TRUE(e.isNear(left, 2));
    EXPECT_TRUE(e.isNear(up, 2));
    EXPECT_TRUE(e.isNear(diagonal, 2));
    EXPECT_FALSE(e.isNear(diagonal, 1));
}

TEST(NearTest, NegativeDifferencesStillCount) {
    Enemy e(8, 4);
    Player p(1, 1);
    EXPECT_TRUE(e.isNear(p, 10));
    EXPECT_FALSE(e.isNear(p, 9));
}
```

Your changes go in `enemy.h`, `enemy.cpp` and `main.cpp`. Don't change the tests.

```check
contains enemy.h "isNear" -- Declare bool isNear(const Player& player, int range) const; in enemy.h.
run "g++ -std=c++17 -c enemy.cpp -o enemy.o" label="enemy.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_near.cpp enemy.cpp map.cpp player.cpp -o test_near" label="tests/test_near.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_near" label="isNear works" -- A test failed. Read which one. Did you add the two distances together after taking std::abs of each? Is the comparison <=?
run "g++ -std=c++17 tests/test_enemy.cpp enemy.cpp map.cpp player.cpp -o test_enemy" label="tests/test_enemy.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_enemy" label="The enemy still chases correctly" -- Your changes broke the chase tests. Check you didn't alter the other functions.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp -o game" label="the whole project builds" -- Build all nine .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="Health: 10\nMove" label="no warning while the enemy is far away" -- Print the warning only when enemy.isNear(player, 2) is true.
run "./game" stdin="s\ns\nd\nd\nd\nd\nd\nq\n" stdout="Health: 10\nThe enemy is close!\nMove" label="a warning when the enemy is close" -- After the Health line, print The enemy is close! when enemy.isNear(player, 2) is true, before the game reads a key.
```

```hints
nudge: The chase function already works out how far away the hero is. What numbers did it use?
concept: Take the difference across and the difference down. std::abs removes the minus sign from each, so a hero to the left counts the same as one to the right. Add the two and compare the sum with range.
shape: int distance = std::abs(...) + std::abs(...); return distance <= range; and in main, wrap a std::cout line in an if.
answer: In enemy.h, add to the public section:
~~~cpp
    bool isNear(const Player& player, int range) const;
~~~
In enemy.cpp, add:
~~~cpp
bool Enemy::isNear(const Player& player, int range) const {
    int distance = std::abs(player.getX() - x) + std::abs(player.getY() - y);
    return distance <= range;
}
~~~
In main.cpp, add this right after the Health line:
~~~cpp
if (enemy.isNear(player, 2)) {
    std::cout << "The enemy is close!" << std::endl;
}
~~~
```
