---
title: 5.2 — Reading a Level
runtime: none
support: tests/test_level.cpp, tests/test_level_errors.cpp, tests/test_comments.cpp
---

Right now there is one level, and it lives inside `Map`, `Coins` and `main` as typed-in numbers. In this lesson you teach the project to read a level from **text**, so a level can be an ordinary file that anyone can edit. You write the **parser**: the function that reads the text and turns it into a `Level` value.

The next lesson plugs levels into the game. In this lesson the game doesn't change, and the checks cover only the new code.

A level is a block of text where each character is one tile:

```text
#######
#@..*.#
#*..E.#
#######
```

- `#` is a wall and `.` is floor.
- `@` is where the hero starts. A level has exactly one.
- `*` is a coin. A level has at least one.
- `E` is where the enemy starts. A level has exactly one.

The map itself keeps only walls and floor. The parser will turn `@`, `*` and `E` back into `.` and remember where they were.

Click the button that creates the supporting test files before you start.

From now on a test program is built from the test file plus **every** `.cpp` file in the project except `main.cpp`, because `Game` uses nearly all of them. Each test check below shows the full command; type the same command in the terminal to run the tests yourself.

## Describe a level

A level is several things at once: the rows, the hero's start, the coins' positions and the enemy's start. That is a bundle, so it is a struct, like `Point` in lesson 4.1. Create `level.h`:

```cpp file=level.h
#pragma once

#include <istream>
#include <string>
#include <vector>
#include "coins.h"

struct Level {
    std::vector<std::string> rows;
    Point hero{0, 0};
    std::vector<Point> coins;
    Point enemy{0, 0};
    std::string error;
};

bool parseLevel(std::istream& in, Level& level);
```

- `Point` comes from `coins.h`, which is why that header is included.
- `rows` holds the walls and floor only, one string per row, as the `Map` does.
- `Point hero{0, 0};` gives the member a starting value. Every new `Level` starts with its hero at `(0, 0)`.
- `error` holds the reason when reading fails. It is an empty string when everything is fine.
- `parseLevel` reads from **any** input stream, as `readAction` did in lesson 3.1. Tests can pass it text from a string.
- `Level& level` is a reference that is **not** `const`, as with `Player&` in `tryMove`. The function **fills in** the caller's `Level`. The `bool` result says whether it worked.

```predict
question: After Level level; how many items does level.coins.size() give?
answer: 0
explain: A vector with nothing added to it is empty. The vector members of a new Level start empty.
```

```check
file level.h -- Create a file called level.h in the project folder.
contains level.h "#pragma once" -- Start the header with #pragma once.
contains level.h "#include \"coins.h\"" -- Include coins.h, because Level uses Point.
matches level.h "struct\s+Level\s*\{" -- Define the type with struct Level { ... };
matches level.h "std::vector<std::string>\s+rows\s*;" -- Give Level a member std::vector<std::string> rows;
matches level.h "std::string\s+error\s*;" -- Give Level a member std::string error;
matches level.h "bool\s+parseLevel\s*\(\s*std::istream\s*&\s*\w+\s*,\s*Level\s*&\s*\w+\s*\)\s*;" -- Declare bool parseLevel(std::istream& in, Level& level);
```

## Read the level tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_level.cpp provided
#include "minitest.h"
#include <sstream>
#include <string>
#include "../level.h"

static const char* kSmall =
    "#####\n"
    "#@.*#\n"
    "#.E.#\n"
    "#####\n";

TEST(LevelTest, ParsesTheRows) {
    std::istringstream in(kSmall);
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    ASSERT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.rows[0], "#####");
    EXPECT_EQ(level.rows[3], "#####");
}

TEST(LevelTest, FindsTheHero) {
    std::istringstream in(kSmall);
    Level level;
    parseLevel(in, level);
    EXPECT_EQ(level.hero.x, 1);
    EXPECT_EQ(level.hero.y, 1);
}

TEST(LevelTest, FindsTheCoin) {
    std::istringstream in(kSmall);
    Level level;
    parseLevel(in, level);
    ASSERT_EQ(level.coins.size(), 1u);
    EXPECT_EQ(level.coins[0].x, 3);
    EXPECT_EQ(level.coins[0].y, 1);
}

TEST(LevelTest, FindsTheEnemy) {
    std::istringstream in(kSmall);
    Level level;
    parseLevel(in, level);
    EXPECT_EQ(level.enemy.x, 2);
    EXPECT_EQ(level.enemy.y, 2);
}

TEST(LevelTest, MarkersBecomeFloor) {
    std::istringstream in(kSmall);
    Level level;
    parseLevel(in, level);
    EXPECT_EQ(level.rows[1], "#...#");
    EXPECT_EQ(level.rows[2], "#...#");
}

TEST(LevelTest, CoinsAreReadTopToBottomThenLeftToRight) {
    std::istringstream in("#######\n#@..*.#\n#*..E.#\n#######\n");
    Level level;
    parseLevel(in, level);
    ASSERT_EQ(level.coins.size(), 2u);
    EXPECT_EQ(level.coins[0].x, 4);
    EXPECT_EQ(level.coins[0].y, 1);
    EXPECT_EQ(level.coins[1].x, 1);
    EXPECT_EQ(level.coins[1].y, 2);
}

TEST(LevelTest, WindowsLineEndingsAreFine) {
    std::istringstream in("#####\r\n#@.*#\r\n#.E.#\r\n#####\r\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    ASSERT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.rows[0], "#####");
    EXPECT_EQ(level.rows[1], "#...#");
}

TEST(LevelTest, BlankLinesAreSkipped) {
    std::istringstream in("\n#####\n\n#@.*#\n#.E.#\n#####\n\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    ASSERT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.hero.y, 1);
}

TEST(LevelTest, NoFinalNewlineIsFine) {
    std::istringstream in("#####\n#@.*#\n#.E.#\n#####");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    EXPECT_EQ(level.rows.size(), 4u);
}

TEST(LevelTest, ParsingTwiceStartsFresh) {
    Level level;
    std::istringstream first(kSmall);
    parseLevel(first, level);
    std::istringstream second(kSmall);
    parseLevel(second, level);
    EXPECT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.coins.size(), 1u);
}
```

- A **row** is a line of text. `#####` is a row of five tiles, and `y` counts rows from the top, as in the map.
- `std::istringstream in(text)` makes a stream that reads from a string, as in lesson 3.1.
- `ASSERT_EQ` is like `EXPECT_EQ`, but it stops the test at once if it fails. It guards the lines after it, which would read outside the vector.
- `4u` is a number written as unsigned, matching `size()`'s type.
- Windows ends each text line with two characters, `\r` and `\n`. A file written on Windows and read on another system keeps the `\r`, so the parser must remove it.

## Read the rows

Create `level.cpp`. The first version only collects the rows. It doesn't look for markers yet:

```cpp file=level.cpp
#include "level.h"

#include <string>

bool parseLevel(std::istream& in, Level& level) {
    level = Level();

    std::string line;
    while (std::getline(in, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (line.empty()) {
            continue;
        }
        if (!level.rows.empty() && line.size() != level.rows[0].size()) {
            level.error = "rows differ in length";
            return false;
        }
        level.rows.push_back(line);
    }

    if (level.rows.empty()) {
        level.error = "empty level";
        return false;
    }
    return true;
}
```

- `level = Level();` assigns a brand-new, empty `Level` over the caller's. That is why parsing twice doesn't pile up old data.
- `std::getline(in, line)` reads one whole line into `line`, up to the next `\n`, and throws the `\n` away. Used as a condition, it is `true` while a line was read and `false` at the end of the input, like `in >> key` in lesson 3.1.
- `line.back()` is the last character. `line.pop_back()` removes it. We only remove it if it is `'\r'`, and only if the line isn't empty.
- `continue;` jumps straight to the next pass of the loop, skipping the rest of the body. Blank lines are skipped this way.
- Every row must be as long as the first: `level.rows[0].size()`. The check only runs once there is a first row to compare with, which is why `!level.rows.empty()` comes first. `&&` stops at the first `false`, so `rows[0]` is never read from an empty vector.
- `level.rows.push_back(line);` adds a copy of `line` to the end of the vector.
- If nothing was read, the level is empty.

```predict
question: The text "#..#\r\n" is read by std::getline from an std::istringstream. How many characters does line hold right after getline, before the \r is removed?
answer: 5
explain: getline stops at the \n and discards it. It keeps the four visible characters and the \r, so there are 5.
```

```check
file level.cpp -- Create a file called level.cpp in the project folder.
contains level.cpp "#include \"level.h\"" -- Include your own header with #include "level.h".
contains level.cpp "std::getline" -- Read each line with std::getline(in, line)
contains level.cpp "push_back" -- Add each finished row with level.rows.push_back(line);
run "g++ -std=c++17 -c level.cpp -o level.o" label="level.cpp compiles" -- Fix the compiler errors shown. Check the function matches the declaration in level.h.
```

## Find the hero, the coins and the enemy

Now look at every character of every row. Change the loop body in `level.cpp`, so that the rows are pushed **after** the markers have been replaced:

```cpp file=level.cpp
#include "level.h"

#include <string>

bool parseLevel(std::istream& in, Level& level) {
    level = Level();

    std::string line;
    while (std::getline(in, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (line.empty()) {
            continue;
        }
        if (!level.rows.empty() && line.size() != level.rows[0].size()) {
            level.error = "rows differ in length";
            return false;
        }

        int y = static_cast<int>(level.rows.size());
        for (int x = 0; x < static_cast<int>(line.size()); x++) {
            char c = line[x];
            if (c == '@') {
                level.hero = Point{x, y};
                line[x] = '.';
            } else if (c == '*') {
                level.coins.push_back(Point{x, y});
                line[x] = '.';
            } else if (c == 'E') {
                level.enemy = Point{x, y};
                line[x] = '.';
            } else if (c != '#' && c != '.') {
                level.error = "unknown tile";
                return false;
            }
        }
        level.rows.push_back(line);
    }

    if (level.rows.empty()) {
        level.error = "empty level";
        return false;
    }
    return true;
}
```

- `y` is the number of rows already stored, which is the index this row will get. The first row gets `y = 0`.
- The inner loop walks `x` along the line, as in lesson 2.2. `line[x]` is the character at that column, and assigning `line[x] = '.'` changes it.
- `Point{x, y}` makes a `Point` with those two values, as in lesson 4.1.
- A hero or an enemy is remembered with a plain assignment. A coin is added to the vector with `push_back`. All three markers are replaced by `'.'`.
- A tile that is not a marker, a wall or a floor is an error. `c != '#' && c != '.'` is true only when **both** are different.
- The check for the row's width happens before the row's characters are looked at.

```predict
question: The second row of a level (y = 1) is "#@.*#". Which Point does the coin get?
choice: Point{3, 1}
choice: Point{1, 3}
choice: Point{4, 1}
answer: Point{3, 1}
explain: The coin is the fourth character, so x is 3 when counting from 0. The row is the second, so y is 1.
```

```check
contains level.cpp "push_back(Point" -- Add each coin with level.coins.push_back(Point{x, y});
contains level.cpp "level.hero = " -- Remember the hero's position in level.hero.
contains level.cpp "level.enemy = " -- Remember the enemy's position in level.enemy.
contains level.cpp "unknown tile" -- Set level.error to unknown tile for any other character.
run "g++ -std=c++17 -c level.cpp -o level.o" label="level.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_level.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_level" label="tests/test_level.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_level" label="Levels are read correctly" -- A test failed. Read which one. Do you replace the markers with '.' BEFORE pushing the row? Is y the row's index, counted from 0?
```

## Read the error tests

A level written by hand will often have a mistake. The parser should say **what** is wrong. Here are the tests, given to you:

```cpp file=tests/test_level_errors.cpp provided
#include "minitest.h"
#include <sstream>
#include <string>
#include "../level.h"

static std::string errorFor(const std::string& text) {
    std::istringstream in(text);
    Level level;
    if (parseLevel(in, level)) {
        return "";
    }
    return level.error;
}

TEST(LevelErrorTest, EmptyText) {
    EXPECT_EQ(errorFor(""), "empty level");
}

TEST(LevelErrorTest, OnlyBlankLines) {
    EXPECT_EQ(errorFor("\n\n"), "empty level");
}

TEST(LevelErrorTest, RowsOfDifferentLengths) {
    EXPECT_EQ(errorFor("#####\n#@.*#\n#.E#\n#####\n"), "rows differ in length");
}

TEST(LevelErrorTest, UnknownTile) {
    EXPECT_EQ(errorFor("#####\n#@x*#\n#.E.#\n#####\n"), "unknown tile");
}

TEST(LevelErrorTest, NoHero) {
    EXPECT_EQ(errorFor("#####\n#..*#\n#.E.#\n#####\n"), "need exactly one hero (@)");
}

TEST(LevelErrorTest, TwoHeroes) {
    EXPECT_EQ(errorFor("#####\n#@@*#\n#.E.#\n#####\n"), "need exactly one hero (@)");
}

TEST(LevelErrorTest, NoEnemy) {
    EXPECT_EQ(errorFor("#####\n#@.*#\n#...#\n#####\n"), "need exactly one enemy (E)");
}

TEST(LevelErrorTest, TwoEnemies) {
    EXPECT_EQ(errorFor("#####\n#@E*#\n#.E.#\n#####\n"), "need exactly one enemy (E)");
}

TEST(LevelErrorTest, NoCoins) {
    EXPECT_EQ(errorFor("#####\n#@..#\n#.E.#\n#####\n"), "need at least one coin (*)");
}

TEST(LevelErrorTest, AGoodLevelHasNoError) {
    EXPECT_EQ(errorFor("#####\n#@.*#\n#.E.#\n#####\n"), "");
}
```

The tests expect these exact messages. Two of them already exist from the last step: `rows differ in length`, `unknown tile` and `empty level`. The new ones are:

- `need exactly one hero (@)`
- `need exactly one enemy (E)`
- `need at least one coin (*)`

## Count what you found

To know how many heroes and enemies there were, count them as you go. Then check the counts after the loop. Change `level.cpp` like this:

```cpp file=level.cpp
#include "level.h"

#include <string>

bool parseLevel(std::istream& in, Level& level) {
    level = Level();

    int heroCount = 0;
    int enemyCount = 0;

    std::string line;
    while (std::getline(in, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (line.empty()) {
            continue;
        }
        if (!level.rows.empty() && line.size() != level.rows[0].size()) {
            level.error = "rows differ in length";
            return false;
        }

        int y = static_cast<int>(level.rows.size());
        for (int x = 0; x < static_cast<int>(line.size()); x++) {
            char c = line[x];
            if (c == '@') {
                level.hero = Point{x, y};
                heroCount++;
                line[x] = '.';
            } else if (c == '*') {
                level.coins.push_back(Point{x, y});
                line[x] = '.';
            } else if (c == 'E') {
                level.enemy = Point{x, y};
                enemyCount++;
                line[x] = '.';
            } else if (c != '#' && c != '.') {
                level.error = "unknown tile";
                return false;
            }
        }
        level.rows.push_back(line);
    }

    if (level.rows.empty()) {
        level.error = "empty level";
        return false;
    }
    if (heroCount != 1) {
        level.error = "need exactly one hero (@)";
        return false;
    }
    if (enemyCount != 1) {
        level.error = "need exactly one enemy (E)";
        return false;
    }
    if (level.coins.empty()) {
        level.error = "need at least one coin (*)";
        return false;
    }
    return true;
}
```

- `heroCount != 1` catches both **none** and **more than one** with a single test.
- Coins don't need a counter. The vector already knows: `level.coins.empty()` is `true` when nothing was added.
- The checks run in a fixed order, and `return false;` stops at the first problem. A level with neither a hero nor an enemy reports the missing hero.

```check
contains level.cpp "heroCount" -- Count the heroes with an int named heroCount.
contains level.cpp "enemyCount" -- Count the enemies with an int named enemyCount.
contains level.cpp "need exactly one hero (@)" -- Report need exactly one hero (@) when the hero count isn't 1.
contains level.cpp "level.coins.empty()" -- Check for no coins with level.coins.empty()
run "g++ -std=c++17 -c level.cpp -o level.o" label="level.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_level_errors.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_level_errors" label="tests/test_level_errors.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_level_errors" label="Mistakes are reported correctly" -- A test failed. Read which one. The message must match exactly. Is heroCount != 1 used, so zero and two both fail?
run "g++ -std=c++17 tests/test_level.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_level" label="tests/test_level.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_level" label="Good levels still parse" -- Your changes broke the reading of good levels. Check the counters are only added to, and that the rows are still pushed.
```

## Your turn: comments

Level designers like to write notes. Make lines that **start with a semicolon** comments, which the parser skips completely:

```text
; Level 1: the first room
#####
#@.*#
; the enemy waits in the middle
#.E.#
#####
```

- A comment line is skipped, just like a blank line. It doesn't count as a row.
- A semicolon **inside** a row is not a comment. It is an unknown tile.
- Windows line endings must still work on comment lines.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_comments.cpp provided
#include "minitest.h"
#include <sstream>
#include <string>
#include "../level.h"

TEST(CommentTest, CommentLinesAreSkipped) {
    std::istringstream in("; my first level\n#####\n#@.*#\n; the middle\n#.E.#\n#####\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    ASSERT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.rows[1], "#...#");
    EXPECT_EQ(level.hero.y, 1);
    EXPECT_EQ(level.enemy.y, 2);
}

TEST(CommentTest, ASemicolonInsideARowIsNotAComment) {
    std::istringstream in("#####\n#@;*#\n#.E.#\n#####\n");
    Level level;
    EXPECT_FALSE(parseLevel(in, level));
    EXPECT_EQ(level.error, "unknown tile");
}

TEST(CommentTest, CommentsWithWindowsLineEndings) {
    std::istringstream in("; note\r\n#####\r\n#@.*#\r\n#.E.#\r\n#####\r\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    EXPECT_EQ(level.rows.size(), 4u);
}

TEST(CommentTest, OnlyCommentsIsAnEmptyLevel) {
    std::istringstream in("; nothing here\n");
    Level level;
    EXPECT_FALSE(parseLevel(in, level));
    EXPECT_EQ(level.error, "empty level");
}

TEST(CommentTest, ALongCommentDoesNotBreakTheWidthCheck) {
    std::istringstream in("#####\n; a much longer comment than the rows\n#@.*#\n#.E.#\n#####\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    EXPECT_EQ(level.rows.size(), 4u);
}
```

Your change goes in `level.cpp`. Don't change the tests.

```check
run "g++ -std=c++17 -c level.cpp -o level.o" label="level.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_comments.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_comments" label="tests/test_comments.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_comments" label="Comments are skipped" -- A test failed. Read which one. Is the comment check done AFTER the \r is removed and BEFORE the row-width check?
run "g++ -std=c++17 tests/test_level.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_level" label="tests/test_level.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_level" label="Levels still parse" -- Your change broke the reading of normal levels.
run "g++ -std=c++17 tests/test_level_errors.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_level_errors" label="tests/test_level_errors.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_level_errors" label="Mistakes are still reported" -- Your change broke the error messages.
```

```hints
nudge: Which line of the loop already skips blank lines? What does a comment line have in common with a blank one?
concept: Both should be skipped with continue. The test has to happen after the trailing \r is removed, so a comment line from a Windows file is treated like any other, and before the width check, so a long comment doesn't count as a short row.
shape: Extend the condition that skips blank lines: line.empty() || line[0] == ';'. Check line.empty() first, so you never read line[0] of an empty string.
answer: In level.cpp, change the blank-line test to:
~~~cpp
        if (line.empty() || line[0] == ';') {
            continue;
        }
~~~
It must stay after the lines that remove the trailing \r and before the row-width check.
```
