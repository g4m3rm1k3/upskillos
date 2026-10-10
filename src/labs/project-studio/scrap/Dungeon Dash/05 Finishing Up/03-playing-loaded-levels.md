---
title: 5.3 — Playing Loaded Levels
runtime: none
support: levels/level1.txt, levels/level2.txt, tests/test_parts.cpp, tests/test_level_game.cpp, tests/test_load.cpp, tests/test_describe.cpp
---

In lesson 5.2 you turned text into a `Level`. Now you make the game play one. Three things need to change:

1. `Map` must be buildable from a list of rows.
2. `Coins` must be buildable from a list of positions.
3. `Game` must be buildable from a whole `Level`.

Then you read a level from a file on disk, and `main` plays whichever file you pick.

Click the button that creates the supporting files before you start. It creates a `levels` folder with two levels in it, and the test files in `tests`.

From now on a test program is built from the test file plus **every** `.cpp` file in the project except `main.cpp`, because `Game` uses nearly all of them. Each test check below shows the full command; type the same command in the terminal to run the tests yourself.

## Read the level files

This is the first level. Read it, don't type it:

```text file=levels/level1.txt provided
############
#@...#....E#
#.##.#.##..#
#.*#...#.*.#
#.##.###.#.#
#....*.....#
############
```

It is 12 tiles wide and 7 tall, with three coins. The second file, `levels/level2.txt`, is a smaller, harder room: two coins in a long corridor and an enemy in the far corner. Open it and have a look. You can also copy one of these and make your own.

## Read the tests for maps and coins

The first two changes are tiny. Here are the tests, given to you:

```cpp file=tests/test_parts.cpp provided
#include "minitest.h"
#include <string>
#include <vector>
#include "../map.h"
#include "../coins.h"

TEST(MapRowsTest, UsesTheGivenRows) {
    std::vector<std::string> rows = {"#####", "#...#", "#####"};
    Map m(rows);
    EXPECT_EQ(m.getWidth(), 5);
    EXPECT_EQ(m.getHeight(), 3);
    EXPECT_EQ(m.getTile(1, 1), '.');
    EXPECT_TRUE(m.isWall(0, 0));
    EXPECT_FALSE(m.isWall(2, 1));
}

TEST(MapRowsTest, OutsideIsStillAWall) {
    std::vector<std::string> rows = {"#####", "#...#", "#####"};
    Map m(rows);
    EXPECT_TRUE(m.isWall(5, 1));
    EXPECT_TRUE(m.isWall(-1, 1));
    EXPECT_TRUE(m.isWall(1, 3));
}

TEST(MapRowsTest, TheDefaultMapIsUnchanged) {
    Map m;
    EXPECT_EQ(m.getWidth(), 10);
    EXPECT_EQ(m.getHeight(), 6);
}

TEST(CoinsFromTest, UsesTheGivenPositions) {
    std::vector<Point> spots = {{1, 1}, {3, 2}};
    Coins c(spots);
    EXPECT_EQ(c.remaining(), 2);
    EXPECT_TRUE(c.hasCoinAt(1, 1));
    EXPECT_TRUE(c.hasCoinAt(3, 2));
    EXPECT_FALSE(c.hasCoinAt(5, 4));
}

TEST(CoinsFromTest, CollectingStillWorks) {
    std::vector<Point> spots = {{1, 1}, {3, 2}};
    Coins c(spots);
    EXPECT_TRUE(c.collectAt(3, 2));
    EXPECT_EQ(c.remaining(), 1);
    EXPECT_FALSE(c.hasCoinAt(3, 2));
}

TEST(CoinsFromTest, TheDefaultCoinsAreUnchanged) {
    Coins c;
    EXPECT_EQ(c.remaining(), 5);
}
```

Both classes keep their old no-argument constructor, and they get a **second** constructor. The compiler picks the right one from the arguments, the same overloading idea as `renderMap` in lesson 4.1.

## A map from rows

Change `map.h`. The new constructor takes the rows:

```cpp file=map.h
#pragma once

#include <string>
#include <vector>

class Map {
public:
    Map();
    explicit Map(const std::vector<std::string>& levelRows);

    int getWidth() const;
    int getHeight() const;
    bool inBounds(int x, int y) const;
    char getTile(int x, int y) const;
    bool isWall(int x, int y) const;
    int countTiles(char tile) const;

private:
    std::vector<std::string> rows;
};
```

Then add the definition to `map.cpp`, below the first constructor:

```cpp
Map::Map(const std::vector<std::string>& levelRows) : rows(levelRows) {}
```

- `explicit` stops the compiler from turning a vector into a `Map` behind your back. You have to write `Map m(rows);`.
- `rows(levelRows)` in the initializer list **copies** the given rows into the map's own `rows`. The parameter has a different name, `levelRows`, so it doesn't hide the member.
- Everything else in the class keeps working. `getTile`, `isWall` and the rest only ever look at `rows`, so they don't care where the rows came from.

```check
matches map.h "explicit\s+Map\s*\(\s*const\s+std::vector<std::string>\s*&\s*\w+\s*\)\s*;" -- Declare explicit Map(const std::vector<std::string>& levelRows); in map.h.
matches map.cpp "Map::Map\s*\(\s*const\s+std::vector<std::string>\s*&\s*\w+\s*\)" -- Define Map::Map(const std::vector<std::string>& levelRows) : rows(levelRows) {} in map.cpp.
run "g++ -std=c++17 -c map.cpp -o map.o" label="map.cpp compiles" -- Fix the compiler errors shown.
```

## Coins from positions

Do the same for `Coins`. Change `coins.h`:

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
    explicit Coins(const std::vector<Point>& positions);

    bool hasCoinAt(int x, int y) const;
    int remaining() const;
    bool collectAt(int x, int y);

private:
    std::vector<Point> coins;
};
```

Add this to `coins.cpp`, below the first constructor:

```cpp
Coins::Coins(const std::vector<Point>& positions) : coins(positions) {}
```

It is the same pattern again: copy the argument into the member. With this, the tests for maps and coins can run.

```predict
question: Coins a; and Coins b(spots); where spots holds three Points. Which constructor does each call?
choice: a uses the one with no arguments, b uses the one that takes the vector
choice: Both use the one that takes the vector
choice: Both use the one with no arguments
answer: a uses the one with no arguments, b uses the one that takes the vector
explain: The compiler matches the arguments you wrote against the constructors' parameter lists. No arguments matches Coins(), and one vector matches the other.
```

```check
matches coins.h "explicit\s+Coins\s*\(\s*const\s+std::vector<Point>\s*&\s*\w+\s*\)\s*;" -- Declare explicit Coins(const std::vector<Point>& positions); in coins.h.
matches coins.cpp "Coins::Coins\s*\(\s*const\s+std::vector<Point>\s*&\s*\w+\s*\)" -- Define Coins::Coins(const std::vector<Point>& positions) : coins(positions) {} in coins.cpp.
run "g++ -std=c++17 -c coins.cpp -o coins.o" label="coins.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_parts.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_parts" label="tests/test_parts.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_parts" label="Maps and coins can be built from lists" -- A test failed. Read which one. Do you copy the argument into the member in the initializer list?
run "g++ -std=c++17 tests/test_map.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_map" label="tests/test_map.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_map" label="The default map still passes" -- Your changes broke the map tests. Check you didn't alter the first constructor.
run "g++ -std=c++17 tests/test_coins.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_coins" label="tests/test_coins.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_coins" label="The default coins still pass" -- Your changes broke the coin tests. Check you didn't alter the first constructor.
```

## Read the level game tests

Here are the tests for `Game`, given to you:

```cpp file=tests/test_level_game.cpp provided
#include "minitest.h"
#include <sstream>
#include <string>
#include "../game.h"

static Level levelFrom(const std::string& text) {
    std::istringstream in(text);
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(LevelGameTest, StartsWhereTheFileSays) {
    Game g(levelFrom("#####\n#@E*#\n#####\n"));
    EXPECT_EQ(g.getPlayer().getX(), 1);
    EXPECT_EQ(g.getPlayer().getY(), 1);
    EXPECT_EQ(g.getEnemy().getX(), 2);
    EXPECT_EQ(g.getEnemy().getY(), 1);
    EXPECT_EQ(g.getCoins().remaining(), 1);
    EXPECT_TRUE(g.getCoins().hasCoinAt(3, 1));
}

TEST(LevelGameTest, UsesTheLevelsMap) {
    Game g(levelFrom("#######\n#@...E#\n#*....#\n#######\n"));
    EXPECT_EQ(g.getMap().getWidth(), 7);
    EXPECT_EQ(g.getMap().getHeight(), 4);
    EXPECT_EQ(g.getMap().getTile(1, 1), '.');
    EXPECT_TRUE(g.getMap().isWall(0, 1));
}

TEST(LevelGameTest, CollectingTheLastCoinWins) {
    Game g(levelFrom("#######\n#@*..E#\n#######\n"));
    g.apply(Action::Right);
    EXPECT_EQ(g.getState(), GameState::Won);
    EXPECT_EQ(g.getCoins().remaining(), 0);
    EXPECT_EQ(g.getMessage(), "You found a coin!\n");
}

TEST(LevelGameTest, TheLevelsWallsBlock) {
    Game g(levelFrom("#######\n#@*..E#\n#######\n"));
    g.apply(Action::Up);
    EXPECT_EQ(g.getPlayer().getY(), 1);
    EXPECT_EQ(g.getMessage(), "A wall blocks the way.\n");
}

TEST(LevelGameTest, TheEnemyCatchesAHeroWhoStandsStill) {
    Game g(levelFrom("#####\n#@E*#\n#####\n"));
    g.apply(Action::None);
    EXPECT_EQ(g.getPlayer().getHealth(), 10);
    g.apply(Action::None);
    EXPECT_EQ(g.getPlayer().getHealth(), 7);
    EXPECT_EQ(g.getMessage(), "The enemy hits you!\n");
}
```

`levelFrom` is a helper that parses some text into a `Level`. The `Game g(...)` lines pass that `Level` straight to a new constructor, and `Game` must then play it like the built-in level.

## A game from a level

Change `game.h`. It includes `level.h` and gets a second constructor:

```cpp file=game.h
#pragma once

#include <string>
#include "coins.h"
#include "enemy.h"
#include "input.h"
#include "level.h"
#include "map.h"
#include "player.h"
#include "rules.h"

void showTitle();
void showMenu();
void showHelp();

class Game {
public:
    Game();
    explicit Game(const Level& level);

    void apply(Action action);

    bool isRunning() const;
    bool isOver() const;
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

Add the definition to `game.cpp`, below the first constructor:

```cpp
Game::Game(const Level& level)
    : map(level.rows),
      player(level.hero.x, level.hero.y),
      coins(level.coins),
      enemy(level.enemy.x, level.enemy.y),
      running(true),
      turn(0),
      state(GameState::Playing) {}
```

- Every member is built from the level this time, using the constructors you just added. `level.hero.x` reads the `x` inside the `hero` inside the `level`, one dot at a time.
- The list is in the same order as the members in the class.
- `apply` and everything else needed no change. They work on whatever the members hold.

```check
contains game.h "#include \"level.h\"" -- Include level.h in game.h.
matches game.h "explicit\s+Game\s*\(\s*const\s+Level\s*&\s*\w+\s*\)\s*;" -- Declare explicit Game(const Level& level); in game.h.
matches game.cpp "Game::Game\s*\(\s*const\s+Level\s*&\s*\w+\s*\)" -- Define Game::Game(const Level& level) : ... { } in game.cpp.
contains game.cpp "level.hero.x" -- Start the player at level.hero.x and level.hero.y.
run "g++ -std=c++17 -c game.cpp -o game.o" label="game.cpp compiles" -- Fix the compiler errors shown. Keep the initializer list in the same order as the members in the class.
run "g++ -std=c++17 tests/test_level_game.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_level_game" label="tests/test_level_game.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_level_game" label="Games can be built from levels" -- A test failed. Read which one. Does each member get its value from the level: map from rows, player from hero, coins from coins, enemy from enemy?
run "g++ -std=c++17 tests/test_game.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_game" label="tests/test_game.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_game" label="The built-in game still passes" -- Your changes broke an earlier test. Check you didn't alter the first constructor.
```

## Load a level from a file

A file on disk is also a stream, and `parseLevel` reads any stream. That is why it was written to take `std::istream&`. Add a second function to `level.h`:

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
bool loadLevelFile(const std::string& path, Level& level);
```

Then add `#include <fstream>` at the top of `level.cpp`, and this function at the end:

```cpp
bool loadLevelFile(const std::string& path, Level& level) {
    std::ifstream file(path);
    if (!file) {
        level = Level();
        level.error = "cannot open file";
        return false;
    }
    return parseLevel(file, level);
}
```

- `std::ifstream` is an **input file stream**: a stream that reads from a file. It comes from `<fstream>`. Creating it with a path opens that file.
- `if (!file)` is the same trick as `!(in >> key)`: a stream used as a condition is `false` when something went wrong. Here that means the file doesn't exist or can't be read.
- On failure, the function leaves a fresh `Level` with an error message, and returns `false`.
- `parseLevel(file, level)` works because an `std::ifstream` **is** an `std::istream`. Its result is passed straight back.
- The file closes by itself when `file` goes out of scope at the end of the function.
- A given test calls this with a path that doesn't exist. It is in `tests/test_load.cpp`:

```cpp
TEST(LoadTest, ANewFileNameFails) {
    Level level;
    EXPECT_FALSE(loadLevelFile("no/such/folder/level.txt", level));
    EXPECT_EQ(level.error, "cannot open file");
}

TEST(LoadTest, AFailedLoadLeavesAnEmptyLevel) {
    Level level;
    EXPECT_FALSE(loadLevelFile("no/such/folder/level.txt", level));
    EXPECT_TRUE(level.rows.empty());
    EXPECT_TRUE(level.coins.empty());
}
```

```predict
question: You call loadLevelFile("nope.txt", level) and no such file exists. What does it return?
choice: false
choice: true
answer: false
explain: The ifstream can't open the file, so `!file` is true. The function sets the error message and returns false before it reads anything.
```

```check
matches level.h "bool\s+loadLevelFile\s*\(\s*const\s+std::string\s*&\s*\w+\s*,\s*Level\s*&\s*\w+\s*\)\s*;" -- Declare bool loadLevelFile(const std::string& path, Level& level); in level.h.
contains level.cpp "#include <fstream>" -- Add #include <fstream> to level.cpp.
contains level.cpp "std::ifstream" -- Open the file with std::ifstream file(path);
contains level.cpp "cannot open file" -- Set level.error to cannot open file when the file can't be opened.
run "g++ -std=c++17 -c level.cpp -o level.o" label="level.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_load.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_load" label="tests/test_load.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_load" label="A missing file is reported" -- A test failed. Read which one. Do you return false with the exact message cannot open file when the file doesn't open?
run "g++ -std=c++17 tests/test_level.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_level" label="tests/test_level.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_level" label="Levels still parse" -- Your changes broke parseLevel. Check you didn't alter it.
```

## Choose a level in main

The player should be able to pick a level from the command line. `main` can receive the words typed after the program's name if it is written with two parameters:

```cpp file=main.cpp
#include <iostream>
#include <string>
#include "game.h"
#include "input.h"
#include "level.h"

int main(int argc, char* argv[]) {
    std::string path = "levels/level1.txt";
    if (argc > 1) {
        path = argv[1];
    }

    showTitle();
    showMenu();
    showHelp();

    Level level;
    Game game;
    if (loadLevelFile(path, level)) {
        game = Game(level);
        std::cout << "Loaded " << path << std::endl;
    } else {
        std::cout << "Could not load " << path << ": " << level.error << std::endl;
        std::cout << "Using the built-in level instead." << std::endl;
    }

    while (!game.isOver()) {
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

- `argc` is the **argument count**: how many words were on the command line, including the program's own name. `argv` is the **argument vector**: the words themselves, as plain C strings. `argv[0]` is the program's name, and `argv[1]` is the first extra word.
- Starting `game levels/level2.txt` in a terminal gives `argc` of 2 and `argv[1]` of `levels/level2.txt`. On Windows the program is `game` or `game.exe`. On macOS and Linux it is `./game`.
- `path = argv[1];` converts that C string into the `std::string` named `path`.
- With no extra word, the default is `levels/level1.txt`. Started as just `./game`, the program plays level 1.
- `Game game;` starts with the built-in level. On success, `game = Game(level);` **replaces** it with a game built from the file. A `Game` can be assigned like any other value.
- On failure, the built-in game stays in place and the player is told why. If you see `cannot open file`, check that the `levels` folder is in the project folder, next to `main.cpp`.

```predict
question: You start the program from a terminal with the command: game levels/level2.txt. What is argc?
answer: 2
explain: The program's own name counts as the first word, and levels/level2.txt is the second.
```

Build it. Now that `level.cpp` is part of the game, it has ten `.cpp` files:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o game
```

Play level 1 with `./game`. Then play level 2 by naming it: `./game levels/level2.txt`. Finally try a level that doesn't exist, such as `./game levels/nope.txt`, and see the built-in level take over.

```check
matches main.cpp "int\s+main\s*\(\s*int\s+argc\s*,\s*char\s*\*\s*argv\s*\[\s*\]\s*\)" -- Declare main as int main(int argc, char* argv[]).
contains main.cpp "#include \"level.h\"" -- Include level.h in main.cpp.
contains main.cpp "levels/level1.txt" -- Use levels/level1.txt as the default path.
contains main.cpp "loadLevelFile(path, level)" -- Load the level with loadLevelFile(path, level)
contains main.cpp "game = Game(level);" -- Replace the game with game = Game(level); when loading works.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o game" label="the whole project builds" -- Build all ten .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="Loaded levels/level1.txt" label="level 1 loads by default" -- Use levels/level1.txt as the default path. If it can't be opened, click the button that creates the provided files: it makes the levels folder.
run "./game" stdin="q\n" stdout="#@...#....E#" label="the game plays the loaded level" -- On success, replace the game with game = Game(level);
run "./game levels/level2.txt" stdin="q\n" stdout="Loaded levels/level2.txt" label="a level can be named on the command line" -- When argc > 1, set path = argv[1];
run "./game levels/nope.txt" stdin="q\n" stdout="Could not load levels/nope.txt: cannot open file\nUsing the built-in level instead." label="a missing level falls back to the built-in one" -- When loadLevelFile returns false, print the two lines and keep the built-in game.
```

## Your turn: describe the level

The player should know what they are about to play. Write a function that sums a level up as one line of text, and print it when the level loads:

```
std::string describeLevel(const Level& level);
```

It returns the width and the height, then the number of coins. For a 5-wide, 4-tall level with one coin it returns `5x4, 1 coin`. With two coins, the word is `coins`: `7x4, 2 coins`. Print `Loaded `, the path, a space, and the description in parentheses, like `Loaded levels/level1.txt (12x7, 3 coins)`. Replace the existing `Loaded` line in `main.cpp`.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_describe.cpp provided
#include "minitest.h"
#include <sstream>
#include <string>
#include "../level.h"

static Level levelFrom(const std::string& text) {
    std::istringstream in(text);
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(DescribeTest, OneCoin) {
    EXPECT_EQ(describeLevel(levelFrom("#####\n#@.*#\n#.E.#\n#####\n")), "5x4, 1 coin");
}

TEST(DescribeTest, TwoCoins) {
    EXPECT_EQ(describeLevel(levelFrom("#######\n#@..*.#\n#*..E.#\n#######\n")), "7x4, 2 coins");
}

TEST(DescribeTest, ThreeCoinsInOneRow) {
    EXPECT_EQ(describeLevel(levelFrom("#########\n#@*.*.*E#\n#########\n")), "9x3, 3 coins");
}
```

Your changes go in `level.h`, `level.cpp` and `main.cpp`. Don't change the tests.

```check
contains level.h "describeLevel" -- Declare std::string describeLevel(const Level& level); in level.h.
run "g++ -std=c++17 -c level.cpp -o level.o" label="level.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_describe.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_describe" label="tests/test_describe.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_describe" label="Levels are described correctly" -- A test failed. Read which one. Width comes from the length of a row and height from the number of rows. Is the word coin singular for exactly one?
run "g++ -std=c++17 tests/test_level.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o test_level" label="tests/test_level.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_level" label="Levels still parse" -- Your changes broke parseLevel. Check you didn't alter it.
matches main.cpp "describeLevel\(\s*level\s*\)" -- Print the description with describeLevel(level) in main.cpp.
contains main.cpp "Loaded " -- Keep the Loaded line, now with the description in parentheses.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp -o game" label="the whole project builds" -- Build all ten .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="Loaded levels/level1.txt (12x7, 3 coins)" label="level 1 is described" -- Print Loaded, the path, a space, then describeLevel(level) in parentheses.
run "./game levels/level2.txt" stdin="q\n" stdout="Loaded levels/level2.txt (10x7, 2 coins)" label="level 2 is described" -- Width is the length of a row, height the number of rows, then the number of coins.
```

```hints
nudge: Which numbers do you need? Where in a Level can you find each one?
concept: The height is the number of rows. The width is the length of one row. The coin count is the size of the coins vector. std::to_string turns a number into text, and an if / else chooses between coin and coins.
shape: Work out three ints with static_cast<int>(...size()), join them into a std::string with std::to_string and +, then add either " coin" or " coins" with +=.
answer: In level.h, add:
~~~cpp
std::string describeLevel(const Level& level);
~~~
In level.cpp, add:
~~~cpp
std::string describeLevel(const Level& level) {
    int width = static_cast<int>(level.rows[0].size());
    int height = static_cast<int>(level.rows.size());
    int coinCount = static_cast<int>(level.coins.size());

    std::string text = std::to_string(width) + "x" + std::to_string(height)
        + ", " + std::to_string(coinCount);
    if (coinCount == 1) {
        text += " coin";
    } else {
        text += " coins";
    }
    return text;
}
~~~
In main.cpp, change the success message to:
~~~cpp
std::cout << "Loaded " << path << " (" << describeLevel(level) << ")" << std::endl;
~~~
```
