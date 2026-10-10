---
title: 2.3 — Drawing the Hero
runtime: none
support: tests/test_render.cpp, tests/test_dead.cpp
---

You have a `Map` and a `Player`, but they don't know about each other. In this lesson you write a **renderer**: a function that turns the map and the player into one picture, with the hero shown as `@`.

Click the button that creates the provided files before you start. It adds `tests/test_render.cpp` and `tests/test_dead.cpp`.

## Build a picture as a string

Printing straight to the screen is hard to test. So `renderMap` **returns** the whole picture as one `std::string`, and `main` prints it. Each map row becomes a line ending in `'\n'`, the character that starts a new line.

Read the tests first. They are given to you, so don't type them:

```cpp file=tests/test_render.cpp provided
#include "minitest.h"
#include <algorithm>
#include <string>
#include "../render.h"

TEST(RenderTest, OneLinePerRow) {
    Map m;
    Player p(1, 1);
    std::string out = renderMap(m, p);
    EXPECT_EQ(out.size(), 66u);
}

TEST(RenderTest, DrawsHeroAtPosition) {
    Map m;
    Player p(1, 1);
    std::string out = renderMap(m, p);
    EXPECT_EQ(out[12], '@');
}

TEST(RenderTest, DrawsExactlyOneHero) {
    Map m;
    Player p(4, 3);
    std::string out = renderMap(m, p);
    EXPECT_EQ(std::count(out.begin(), out.end(), '@'), 1);
}

TEST(RenderTest, DrawsWallsAndFloor) {
    Map m;
    Player p(1, 1);
    std::string out = renderMap(m, p);
    EXPECT_EQ(out.substr(0, 11), "##########\n");
}
```

Why 66 and 12? There are 6 rows, and each is 10 tiles plus the newline character: 6 × 11 = 66. The tile `(x, y)` sits at index `y * 11 + x`, so `(1, 1)` is at `1 * 11 + 1 = 12`.

- `66u` is the number 66 written as **unsigned** (the `u`), the same kind of number `size()` returns, so the two compare without a warning.
- `std::count(out.begin(), out.end(), '@')` comes from `<algorithm>`. It walks the string from its beginning to its end and counts the characters equal to `'@'`.
- `out.substr(0, 11)` is the part of the string that starts at index 0 and is 11 characters long: the first row and its newline.

## Declare the function in render.h

```cpp file=render.h
#pragma once

#include <string>
#include "map.h"
#include "player.h"

std::string renderMap(const Map& map, const Player& player);
```

- The function takes a `Map` and a `Player` and gives back a `std::string`.
- `const Map&` is a **reference to a constant**, as in lesson 2.1. The function can look at the map and player without copying them and without changing them. Only `const` member functions, such as `getTile` and `getX`, can be called on them. That is why we marked those `const`.
- This is a free function, not part of a class, so it has no `Render::` prefix later.

```check
file render.h -- Create a file called render.h in the project folder.
matches render.h "std::string\s+renderMap\s*\(\s*const\s+Map\s*&\s*\w+\s*,\s*const\s+Player\s*&\s*\w+\s*\)\s*;" -- Declare std::string renderMap(const Map& map, const Player& player);
```

## Draw the map first

Create `render.cpp`. Start with the map alone:

```cpp file=render.cpp
#include "render.h"

std::string renderMap(const Map& map, const Player& player) {
    std::string out;
    for (int y = 0; y < map.getHeight(); y++) {
        for (int x = 0; x < map.getWidth(); x++) {
            out += map.getTile(x, y);
        }
        out += '\n';
    }
    return out;
}
```

- `std::string out;` starts as an empty string.
- `out += map.getTile(x, y);` appends one `char` to the end of `out`. `+=` on a string means "add this on the end".
- `out += '\n';` ends the row. Unlike `std::endl`, this only adds the newline character.
- `return out;` hands the finished picture back.
- `player` isn't used yet. The next step uses it.

```check
file render.cpp -- Create a file called render.cpp in the project folder.
contains render.cpp "#include \"render.h\"" -- Include your own header with #include "render.h".
run "g++ -std=c++17 -c render.cpp -o render.o" label="render.cpp compiles" -- Fix the compiler errors shown. Check the function matches the declaration in render.h.
```

## Put the hero on the map

For each tile, check whether the hero is standing there. If so, draw `@`. Otherwise draw the tile as before:

```cpp file=render.cpp
#include "render.h"

std::string renderMap(const Map& map, const Player& player) {
    std::string out;
    for (int y = 0; y < map.getHeight(); y++) {
        for (int x = 0; x < map.getWidth(); x++) {
            if (x == player.getX() && y == player.getY()) {
                out += '@';
            } else {
                out += map.getTile(x, y);
            }
        }
        out += '\n';
    }
    return out;
}
```

The `if` is true for exactly one `(x, y)`: the one that matches both of the player's coordinates. `&&` means both must match. For every other tile the `else` branch draws the map as before.

The renderer uses `Map` and `Player`, so its test program needs all three `.cpp` files:

```
g++ -std=c++17 tests/test_render.cpp render.cpp map.cpp player.cpp -o test_render
./test_render
```

```check
run "g++ -std=c++17 tests/test_render.cpp render.cpp map.cpp player.cpp -o test_render" label="the rendering tests build" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_render" label="Rendering passes its tests" -- A test failed. Read which one. Does each row end in '\n'? Is the @ drawn instead of the tile, not as well as it?
```

## Show it in the game

Now `main` builds a map and a player, and prints the picture:

```cpp file=main.cpp
#include <iostream>
#include "game.h"
#include "map.h"
#include "player.h"
#include "render.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    Map map;
    Player player(1, 1);
    std::cout << renderMap(map, player);

    return 0;
}
```

`renderMap` already ends every row with `'\n'`, so `main` prints the string as it is. The hero starts at `(1, 1)`: one tile in from the top-left corner.

The game now has five `.cpp` files:

```
g++ -std=c++17 main.cpp game.cpp map.cpp player.cpp render.cpp -o game
./game
```

```predict
question: What is the second line of the map picture now?
choice: #@.......#
choice: #........@
choice: @........#
answer: #@.......#
explain: The second line is row y = 1. The hero is at x = 1, the second character, so the '@' replaces the first floor tile after the wall.
```

Now change `Player player(1, 1);` to `Player player(3, 2);`, build and run again. The hero is drawn on top of a wall. Nothing stops it yet. Chapter 3 fixes that, using `isWall`. Change it back to `(1, 1)` before you check your work.

```check
contains main.cpp "renderMap(map, player)" -- Print the picture with std::cout << renderMap(map, player);
lacks main.cpp "getTile" -- main shouldn't loop over tiles itself any more. renderMap does that.
run "g++ -std=c++17 main.cpp game.cpp map.cpp player.cpp render.cpp -o game" label="the whole project builds" -- Build all five .cpp files together and fix the errors shown.
run "./game" stdout="##########\n#@.......#\n" label="the hero is drawn at (1, 1)" -- Create the player with Player player(1, 1); and print renderMap(map, player).
```

## Your turn: a fallen hero

When the hero's health reaches `0`, draw it as `X` instead of `@`. Change `renderMap` in `render.cpp`. The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_dead.cpp provided
#include "minitest.h"
#include <string>
#include "../render.h"

TEST(DeadHeroTest, LivingHeroIsAt) {
    Map m;
    Player p(1, 1);
    p.takeDamage(9);
    EXPECT_EQ(renderMap(m, p)[12], '@');
}

TEST(DeadHeroTest, DeadHeroIsX) {
    Map m;
    Player p(1, 1);
    p.takeDamage(10);
    EXPECT_EQ(renderMap(m, p)[12], 'X');
}

TEST(DeadHeroTest, VeryDeadHeroIsStillOneX) {
    Map m;
    Player p(1, 1);
    p.takeDamage(25);
    std::string out = renderMap(m, p);
    EXPECT_EQ(out[12], 'X');
    EXPECT_EQ(out.find('@'), std::string::npos);
}
```

`std::string::npos` is the value `find` returns when the character isn't there at all. Build and run these tests like the rendering tests, with `test_dead` in place of `test_render`.

```check
run "g++ -std=c++17 tests/test_dead.cpp render.cpp map.cpp player.cpp -o test_dead" label="the fallen-hero tests build" -- Fix the compiler errors shown.
tests "./test_dead" label="The fallen hero is drawn as X" -- A test failed. Read which one. Is the hero drawn as X at exactly 0 health, and as @ at 1?
run "g++ -std=c++17 tests/test_render.cpp render.cpp map.cpp player.cpp -o test_render" label="the rendering tests still build" -- Fix the compiler errors shown.
tests "./test_render" label="Rendering still passes" -- Your change broke an earlier test. A living hero must still be drawn as @.
```

```hints
nudge: Which line of renderMap decides what to draw at the hero's tile?
concept: Inside the branch where the hero is standing, you need a second decision: is the health 0? player.getHealth() tells you.
shape: Put an if/else inside the hero branch: health 0 appends 'X', otherwise appends '@'.
answer: Replace the hero branch in renderMap with:
~~~cpp
if (x == player.getX() && y == player.getY()) {
    if (player.getHealth() == 0) {
        out += 'X';
    } else {
        out += '@';
    }
} else {
    out += map.getTile(x, y);
}
~~~
```
