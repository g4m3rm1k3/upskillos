---
title: 2.2 — The Map Class
runtime: none
support: tests/test_map.cpp, tests/test_count.cpp
---

A loose `grid` inside `main` won't survive for long. Soon the player, the coins and the enemies all need to ask "what is at this tile?". In this lesson you wrap the grid in a `Map` class with its own header and source file, and check it with tests.

Click the button that creates the provided files before you start. It adds `tests/test_map.cpp` and `tests/test_count.cpp`. `tests/minitest.h` is already in your project from lesson 1.3.

## Read the tests first

This file is given to you. Read it, don't type it:

```cpp file=tests/test_map.cpp provided
#include "minitest.h"
#include "../map.h"

TEST(MapTest, HasExpectedSize) {
    Map m;
    EXPECT_EQ(m.getWidth(), 10);
    EXPECT_EQ(m.getHeight(), 6);
}

TEST(MapTest, BordersAreWalls) {
    Map m;
    EXPECT_EQ(m.getTile(0, 0), '#');
    EXPECT_EQ(m.getTile(9, 5), '#');
    EXPECT_TRUE(m.isWall(0, 3));
}

TEST(MapTest, InteriorIsFloor) {
    Map m;
    EXPECT_EQ(m.getTile(1, 1), '.');
    EXPECT_FALSE(m.isWall(1, 1));
}

TEST(MapTest, InteriorWallBlock) {
    Map m;
    EXPECT_TRUE(m.isWall(3, 2));
    EXPECT_TRUE(m.isWall(6, 2));
    EXPECT_FALSE(m.isWall(2, 2));
}

TEST(MapTest, InBoundsOnlyInsideTheGrid) {
    Map m;
    EXPECT_TRUE(m.inBounds(9, 5));
    EXPECT_FALSE(m.inBounds(-1, 0));
    EXPECT_FALSE(m.inBounds(10, 0));
    EXPECT_FALSE(m.inBounds(0, 6));
}

TEST(MapTest, OutsideCountsAsWall) {
    Map m;
    EXPECT_EQ(m.getTile(99, 99), '#');
    EXPECT_TRUE(m.isWall(-1, -1));
}
```

- `Map m;` creates a `Map` with no arguments, so the class needs a constructor that takes nothing.
- `EXPECT_TRUE(x)` and `EXPECT_FALSE(x)` check that a `bool` (a value that is `true` or `false`) is true or false.
- The map is 10 wide and 6 tall, with a ring of walls and a small block of wall inside.
- Anything **outside** the map counts as a wall. That rule will keep the hero from walking off the edge.

## Declare the class in map.h

```cpp file=map.h
#pragma once

#include <string>
#include <vector>

class Map {
public:
    Map();

    int getWidth() const;
    int getHeight() const;
    bool inBounds(int x, int y) const;
    char getTile(int x, int y) const;
    bool isWall(int x, int y) const;

private:
    std::vector<std::string> rows;
};
```

- The header includes `<string>` and `<vector>` because the class's own member, `rows`, uses them. Anyone who includes `map.h` gets them too.
- `Map();` is the constructor. It takes no arguments.
- `bool` is the type for yes/no answers. `inBounds` answers "is this position inside the grid?".
- `rows` is the grid from lesson 2.1, now private. Other code has to ask the class questions instead of reaching in.

```check
file map.h -- Create a file called map.h in the project folder.
contains map.h "class Map" -- Declare a class named Map.
matches map.h "Map\s*\(\s*\)\s*;" -- Declare a constructor that takes nothing: Map();
matches map.h "bool\s+isWall\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*const\s*;" -- Declare bool isWall(int x, int y) const;
matches map.h "std::vector<std::string>\s+rows\s*;" -- Add a private member: std::vector<std::string> rows;
```

## Build the grid and measure it

Create `map.cpp`. The constructor fills `rows` with the level, and the size functions measure it:

```cpp file=map.cpp
#include "map.h"

Map::Map() {
    rows = {
        "##########",
        "#........#",
        "#..####..#",
        "#........#",
        "#........#",
        "##########"
    };
}

int Map::getWidth() const {
    return static_cast<int>(rows[0].size());
}

int Map::getHeight() const {
    return static_cast<int>(rows.size());
}

bool Map::inBounds(int x, int y) const {
    return x >= 0 && x < getWidth() && y >= 0 && y < getHeight();
}
```

- `rows = { ... };` replaces the contents of the vector with the listed strings.
- `getWidth` and `getHeight` are the size code from lesson 2.1. They are marked `const` because they only look at the map.
- `&&` means "and": the whole expression is `true` only if all four comparisons are `true`. The valid `x` values are `0` up to `getWidth() - 1`, which is why the test is `x < getWidth()` and not `<=`.

Compile just this file to check it, as you did with `game.cpp` in lesson 1.2:

```
g++ -std=c++17 -c map.cpp -o map.o
```

```check
file map.cpp -- Create a file called map.cpp in the project folder.
contains map.cpp "#include \"map.h\"" -- Include your own header with #include "map.h".
matches map.cpp "Map::Map\s*\(\s*\)" -- Define the constructor as Map::Map() { ... }
run "g++ -std=c++17 -c map.cpp -o map.o" label="map.cpp compiles" -- Fix the compiler errors shown. Every function needs Map:: before its name.
```

## Read tiles safely

Now the two functions that look at a tile. The key line is the bounds check:

```cpp file=map.cpp
#include "map.h"

Map::Map() {
    rows = {
        "##########",
        "#........#",
        "#..####..#",
        "#........#",
        "#........#",
        "##########"
    };
}

int Map::getWidth() const {
    return static_cast<int>(rows[0].size());
}

int Map::getHeight() const {
    return static_cast<int>(rows.size());
}

bool Map::inBounds(int x, int y) const {
    return x >= 0 && x < getWidth() && y >= 0 && y < getHeight();
}

char Map::getTile(int x, int y) const {
    if (!inBounds(x, y)) {
        return '#';
    }
    return rows[y][x];
}

bool Map::isWall(int x, int y) const {
    return getTile(x, y) == '#';
}
```

- The `[ ]` operator on a vector or string does **not** check the index. Reading `rows[y][x]` outside the grid is **undefined behaviour**: the program might show a junk character, crash, or seem fine today and break tomorrow.
- So `getTile` first asks `inBounds`. `!` means "not": if the position is outside the grid, it returns `'#'` straight away and never touches `rows`.
- Single quotes `'#'` make a `char`. Double quotes `"#"` would make a string.
- `isWall` is a one-liner: it compares the tile with `'#'`, and `==` gives a `bool`.

Now build the test program from the test file and `map.cpp`, and run it:

```
g++ -std=c++17 tests/test_map.cpp map.cpp -o test_map
./test_map
```

```predict
question: On this 10-wide map, what does getTile(10, 0) return?
choice: '#', because anything outside the map counts as a wall
choice: '.', because the row ends in floor
choice: Whatever happens to be in memory; the program might crash
answer: '#', because anything outside the map counts as a wall
explain: x = 10 fails inBounds (valid x values are 0 to 9), so getTile returns '#' before it ever indexes the string.
```

```check
run "g++ -std=c++17 tests/test_map.cpp map.cpp -o test_map" label="the map tests build" -- Fix the compiler errors shown. Define char Map::getTile(int x, int y) const and bool Map::isWall(int x, int y) const. If a test file is missing, click the button that creates the provided files.
tests "./test_map" label="Map passes its tests" -- A test failed. Read which one, and compare the expected and actual values with what your function returns. Check the bounds test and the '#' for outside positions.
```

## Use the Map in main

`main.cpp` can now ask the `Map` instead of holding a grid. Replace everything after `showHelp();`:

```cpp file=main.cpp
#include <iostream>
#include "game.h"
#include "map.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    Map map;
    for (int y = 0; y < map.getHeight(); y++) {
        for (int x = 0; x < map.getWidth(); x++) {
            std::cout << map.getTile(x, y);
        }
        std::cout << std::endl;
    }

    return 0;
}
```

- `Map map;` creates a map, and the constructor builds the level.
- The two loops are **nested**. The outer one walks `y` down the rows. For each row, the inner one walks `x` across the columns. `x++` adds 1 to `x`.
- `std::cout << map.getTile(x, y);` prints a `char` as a character. Nothing is printed between tiles, so a row comes out as one line.
- After each row's inner loop finishes, `std::endl` starts a new line.

The game now has a fourth `.cpp` file to build:

```
g++ -std=c++17 main.cpp game.cpp map.cpp player.cpp -o game
./game
```

```predict
question: What is the third line of the map picture (the row with y = 2)?
choice: ##########
choice: #........#
choice: #..####..#
answer: #..####..#
explain: Rows are counted from 0, so y = 2 is the third string in the constructor: the one with the block of walls in the middle.
```

```check
contains main.cpp "#include \"map.h\"" -- Include map.h in main.cpp.
lacks main.cpp "std::vector<std::string>" -- main shouldn't hold a grid any more. The Map class owns it.
run "g++ -std=c++17 main.cpp game.cpp map.cpp player.cpp -o game" label="the project builds" -- Build all four .cpp files together and fix the errors shown.
run "./game" stdout="##########\n#........#\n#..####..#" label="the game prints the map" -- Create the map with Map map; and print every tile, one row per line.
```

## Your turn: count the tiles

Add a function to `Map` that counts how many tiles of a given kind the map has. It is called `countTiles`, takes a `char`, and returns an `int`. The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_count.cpp provided
#include "minitest.h"
#include "../map.h"

TEST(CountTest, CountsWalls) {
    Map m;
    EXPECT_EQ(m.countTiles('#'), 32);
}

TEST(CountTest, CountsFloor) {
    Map m;
    EXPECT_EQ(m.countTiles('.'), 28);
}

TEST(CountTest, UnknownTileIsZero) {
    Map m;
    EXPECT_EQ(m.countTiles('Z'), 0);
}
```

Your changes go in `map.h` and `map.cpp`. Don't change the tests. Build and run them like the map tests, with `test_count` in place of `test_map`.

```check
run "g++ -std=c++17 tests/test_count.cpp map.cpp -o test_count" label="the counting tests build" -- Declare int countTiles(char tile) const; in map.h and define it in map.cpp.
tests "./test_count" label="Counting tests pass" -- A test failed. Read which one. Does your loop visit every row and every column, and no more?
run "g++ -std=c++17 tests/test_map.cpp map.cpp -o test_map" label="the map tests still build" -- Fix the compiler errors shown.
tests "./test_map" label="Map tests still pass" -- Your changes broke an earlier test. Check you didn't alter the constructor or the other functions.
```

```hints
nudge: What do you have to look at to count tiles? How did main visit every tile?
concept: Visit every (x, y) with two nested loops, and add 1 to a counter whenever getTile(x, y) equals the tile you were asked about.
shape: Declare int count = 0; loop y from 0 to getHeight(), loop x from 0 to getWidth(), if the tile matches then count++; return count.
answer: In map.h, add to the public section:
~~~cpp
int countTiles(char tile) const;
~~~
In map.cpp, add:
~~~cpp
int Map::countTiles(char tile) const {
    int count = 0;
    for (int y = 0; y < getHeight(); y++) {
        for (int x = 0; x < getWidth(); x++) {
            if (getTile(x, y) == tile) {
                count++;
            }
        }
    }
    return count;
}
~~~
```
