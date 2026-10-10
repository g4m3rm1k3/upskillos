---
title: 1.3 — The Player Class
runtime: none
support: tests/minitest.h, tests/test_player.cpp, tests/test_health.cpp
---

A game needs a hero. In this lesson you write a `Player` **class**, a type that bundles data (where the hero is) with the functions that work on it. You will check it with automated tests instead of by eye.

## Read the tests first

Click the button that creates the provided files. It puts three files in a `tests` folder in your project:

- `tests/minitest.h` is a small testing tool. You don't need to read it yet. It gives you `TEST` and `EXPECT_EQ` (below), and its own `main` function that runs every test and reports each one as `OK` or `FAILED`.
- `tests/test_player.cpp` holds the tests for this part of the lesson.
- `tests/test_health.cpp` holds the tests for the Your turn at the end.

A **test** is a small program that uses your code and checks the results. Writing the tests first tells you exactly what the class must do. This file is given to you. Read it, don't type it:

```cpp file=tests/test_player.cpp provided
#include "minitest.h"
#include "../player.h"

TEST(PlayerTest, StartsAtGivenPosition) {
    Player p(4, 7);
    EXPECT_EQ(p.getX(), 4);
    EXPECT_EQ(p.getY(), 7);
}

TEST(PlayerTest, MoveChangesPosition) {
    Player p(2, 3);
    p.move(1, -1);
    EXPECT_EQ(p.getX(), 3);
    EXPECT_EQ(p.getY(), 2);
}
```

- `#include "../player.h"`: `..` means "the folder above", so this reaches out of `tests/` to the `player.h` you are about to write.
- `TEST(PlayerTest, StartsAtGivenPosition)` defines one test. The first name groups tests and the second names this one.
- `EXPECT_EQ(a, b)` checks that `a` equals `b`. If not, the test fails and shows both values.
- So a `Player` needs a constructor taking two ints (`x` and `y`), getters `getX()` and `getY()`, and a `move(dx, dy)` that **adds** to the position.

## Declare the class in player.h

```cpp file=player.h
#pragma once

class Player {
public:
    Player(int startX, int startY);

    int getX() const;
    int getY() const;
    void move(int dx, int dy);

private:
    int x;
    int y;
};
```

- `class Player { ... };` defines a new type. The semicolon after the closing brace is required.
- `public:` members can be used by any code. `private:` members can only be used inside the class's own functions. Keeping `x` and `y` private means other code can't change them by accident. It has to go through `move`.
- `Player(int startX, int startY);` is the **constructor**. It has the class's name and no return type, and it runs when a `Player` is created.
- `const` after `getX()` promises that the function doesn't change the player. Both `x` and `y` are `int`, a whole number.

```check
file player.h -- Create a file called player.h in the project folder.
contains player.h "class Player" -- Declare a class named Player.
matches player.h "Player\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare a constructor that takes two ints.
matches player.h "void\s+move\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare void move(int dx, int dy);
```

## Define the class in player.cpp

```cpp file=player.cpp
#include "player.h"

Player::Player(int startX, int startY) : x(startX), y(startY) {}

int Player::getX() const { return x; }
int Player::getY() const { return y; }

void Player::move(int dx, int dy) {
    x += dx;
    y += dy;
}
```

- `Player::` in front of a name says "this function belongs to the Player class".
- `: x(startX), y(startY)` is the **initializer list**. It sets the members to their starting values as the object is created. The empty `{}` is the constructor's body, because there is nothing left to do.
- `x += dx;` means `x = x + dx;`. Moving by `(1, -1)` adds 1 to `x` and subtracts 1 from `y`.

Now build a **test program**: the test file together with your `player.cpp`, but not `main.cpp`, because `minitest.h` supplies its own `main`. Then run it:

```
g++ -std=c++17 tests/test_player.cpp player.cpp -o test_player
./test_player
```

Each test prints a `[ RUN ]` line when it starts and `[ OK ]` or `[ FAILED ]` when it ends.

```check
run "g++ -std=c++17 tests/test_player.cpp player.cpp -o test_player" label="the position tests build" -- Fix the compiler errors shown. Every function in player.cpp needs Player:: before its name. If minitest.h is missing, click the button that creates the provided files.
tests "./test_player" label="Player passes its position tests" -- A test failed. Compare the expected and actual values it shows with what your constructor, getters and move do.
```

## Use the player in main

Create a player, move it, and print where it ends up:

```cpp file=main.cpp
#include <iostream>
#include "game.h"
#include "player.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    Player player(2, 3);
    player.move(1, -1);
    std::cout << "Player is at (" << player.getX() << ", " << player.getY() << ")" << std::endl;

    return 0;
}
```

`Player player(2, 3);` creates one `Player` whose constructor receives `2` and `3`. `player.move(1, -1);` calls the member function on that object. `<iostream>` is back because `main` prints again.

The game is now three `.cpp` files. Build them all together, then run it:

```
g++ -std=c++17 main.cpp game.cpp player.cpp -o game
./game
```

Commit to an answer before you run it:

```predict
question: What does the last line of output say?
choice: Player is at (2, 3)
choice: Player is at (3, 2)
choice: Player is at (1, 4)
answer: Player is at (3, 2)
explain: The player starts at (2, 3). move(1, -1) adds 1 to x, giving 3, and adds -1 to y, giving 2.
```

```check
contains main.cpp "#include \"player.h\"" -- Include player.h in main.cpp.
run "g++ -std=c++17 main.cpp game.cpp player.cpp -o game" label="the whole project builds" -- Build all three .cpp files together and fix the errors shown.
run "./game" stdout="Player is at (3, 2)" label="the game prints the player's position" -- Create the player at (2, 3), move it by (1, -1), then print its position.
```

## Your turn: give the hero health

Extend `Player` so it has health. The tests are in a provided file, `tests/test_health.cpp`. Read them, then make them pass:

```cpp file=tests/test_health.cpp provided
#include "minitest.h"
#include "../player.h"

TEST(HealthTest, StartsAtTen) {
    Player p(0, 0);
    EXPECT_EQ(p.getHealth(), 10);
}

TEST(HealthTest, DamageReducesHealth) {
    Player p(0, 0);
    p.takeDamage(4);
    EXPECT_EQ(p.getHealth(), 6);
}

TEST(HealthTest, HealthStopsAtZero) {
    Player p(0, 0);
    p.takeDamage(25);
    EXPECT_EQ(p.getHealth(), 0);
}
```

Your changes go in `player.h` and `player.cpp`. Don't change the tests. Build and run them the same way as the position tests:

```
g++ -std=c++17 tests/test_health.cpp player.cpp -o test_health
./test_health
```

```check
run "g++ -std=c++17 tests/test_health.cpp player.cpp -o test_health" label="the health tests build" -- Declare int getHealth() const; and void takeDamage(int amount); in player.h, and define both in player.cpp.
tests "./test_health" label="Health tests pass" -- A test failed. Read which one: does health start at 10, go down by the damage, and never drop below 0?
run "g++ -std=c++17 tests/test_player.cpp player.cpp -o test_player" label="the position tests still build" -- Fix the compiler errors shown.
tests "./test_player" label="Position tests still pass" -- Your health changes broke the position tests. Check that the constructor still sets x and y.
```

```hints
nudge: Which test fails? Read its name and the two values it shows.
concept: Health is another private member, set in the initializer list like x and y. takeDamage subtracts from it, and an if statement stops it going below zero.
shape: Add a private int health; declare getHealth and takeDamage in the header; set health(10) in the constructor's initializer list; subtract in takeDamage, then reset to 0 if it went negative.
answer: In player.h, add inside the class:
~~~cpp
public:
    int getHealth() const;
    void takeDamage(int amount);

private:
    int health;
~~~
In player.cpp, change the constructor and add the two functions:
~~~cpp
Player::Player(int startX, int startY) : x(startX), y(startY), health(10) {}

int Player::getHealth() const { return health; }

void Player::takeDamage(int amount) {
    health -= amount;
    if (health < 0) {
        health = 0;
    }
}
~~~
```
