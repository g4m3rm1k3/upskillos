---
title: 5.4 — Polish and Next Steps
runtime: none
support: tests/test_menu.cpp, tests/test_scoreboard.cpp
---

The game works, but it still starts straight into play, and the menu you wrote in lesson 1.1 only prints numbers. In this last lesson you make the menu real: **Start** plays a level and comes back to the menu, **Help** shows the help, and **Quit** leaves. Then you finish with a small class of your own.

Click the button that creates the supporting test files before you start.

From now on a test program is built from the test file plus **every** `.cpp` file in the project except `main.cpp`, because `Game` uses nearly all of them. Each test check below shows the full command; type the same command in the terminal to run the tests yourself.

## Read the menu tests

The menu works like `readAction` from lesson 3.1: it reads from any stream and gives back a name from an enum. The tests are given to you:

```cpp file=tests/test_menu.cpp provided
#include "minitest.h"
#include <sstream>
#include "../menu.h"

TEST(MenuTest, ReadsEachChoice) {
    std::istringstream one("1");
    std::istringstream two("2");
    std::istringstream three("3");
    EXPECT_EQ(readMenuChoice(one), MenuChoice::Start);
    EXPECT_EQ(readMenuChoice(two), MenuChoice::Quit);
    EXPECT_EQ(readMenuChoice(three), MenuChoice::Help);
}

TEST(MenuTest, OtherKeysAreUnknown) {
    std::istringstream x("x");
    std::istringstream nine("9");
    std::istringstream q("q");
    EXPECT_EQ(readMenuChoice(x), MenuChoice::Unknown);
    EXPECT_EQ(readMenuChoice(nine), MenuChoice::Unknown);
    EXPECT_EQ(readMenuChoice(q), MenuChoice::Unknown);
}

TEST(MenuTest, SkipsWhitespace) {
    std::istringstream in("  \n 1");
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Start);
}

TEST(MenuTest, ReadsOneChoiceAtATime) {
    std::istringstream in("132");
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Start);
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Help);
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Quit);
}

TEST(MenuTest, EndOfInputQuits) {
    std::istringstream in("");
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Quit);
}
```

Letters are not menu choices here: `q` is `Unknown`. Letters are for moving inside a game. Digits are for the menu.

## Name the menu choices

Create `menu.h`:

```cpp file=menu.h
#pragma once

#include <istream>

enum class MenuChoice {
    Start,
    Quit,
    Help,
    Unknown
};

MenuChoice readMenuChoice(std::istream& in);
```

This is the same shape as `Action` and `readAction` in `input.h`: an `enum class` with an `Unknown` value, so every key has an answer, and a function that reads from any stream.

```check
file menu.h -- Create a file called menu.h in the project folder.
contains menu.h "#pragma once" -- Start the header with #pragma once.
matches menu.h "enum\s+class\s+MenuChoice" -- Define the enum with enum class MenuChoice { ... };
matches menu.h "MenuChoice\s+readMenuChoice\s*\(\s*std::istream\s*&\s*\w+\s*\)\s*;" -- Declare MenuChoice readMenuChoice(std::istream& in);
```

## Read the choice

Create `menu.cpp`:

```cpp file=menu.cpp
#include "menu.h"

MenuChoice readMenuChoice(std::istream& in) {
    char key = ' ';
    if (!(in >> key)) {
        return MenuChoice::Quit;
    }

    switch (key) {
        case '1':
            return MenuChoice::Start;
        case '2':
            return MenuChoice::Quit;
        case '3':
            return MenuChoice::Help;
        default:
            return MenuChoice::Unknown;
    }
}
```

This is the same recipe as `readAction`. Read one non-whitespace character. If the read fails because nothing is left, quit. Otherwise a `switch` turns the character into a name.

Quitting when the input ends matters. Without it, a closed input would make the menu ask forever.

```check
file menu.cpp -- Create a file called menu.cpp in the project folder.
contains menu.cpp "#include \"menu.h\"" -- Include your own header with #include "menu.h".
run "g++ -std=c++17 -c menu.cpp -o menu.o" label="menu.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_menu.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp -o test_menu" label="tests/test_menu.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_menu" label="The menu reads choices correctly" -- A test failed. Read which one. Are the keys the digits 1, 2 and 3 (single quotes)? Does a failed read give Quit?
```

## Build the menu loop

`main` now has two jobs: play one level, and run the menu. Each gets its own function. Replace `main.cpp`:

```cpp file=main.cpp
#include <iostream>
#include <string>
#include "game.h"
#include "input.h"
#include "level.h"
#include "menu.h"

static void playLevel(const std::string& path) {
    Level level;
    Game game;
    if (loadLevelFile(path, level)) {
        game = Game(level);
        std::cout << "Loaded " << path << " (" << describeLevel(level) << ")" << std::endl;
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
}

int main(int argc, char* argv[]) {
    std::string path = "levels/level1.txt";
    if (argc > 1) {
        path = argv[1];
    }

    showTitle();

    bool running = true;
    while (running) {
        showMenu();
        MenuChoice choice = readMenuChoice(std::cin);

        switch (choice) {
            case MenuChoice::Start:
                playLevel(path);
                break;
            case MenuChoice::Help:
                showHelp();
                break;
            case MenuChoice::Quit:
                running = false;
                break;
            case MenuChoice::Unknown:
                std::cout << "Please choose 1, 2 or 3." << std::endl;
                break;
        }
    }

    std::cout << "Thanks for playing!" << std::endl;
    return 0;
}
```

- `playLevel` is the body of the old `main`. It loads a level, plays it until the game is over, and prints the summary. Its parameter is a `const std::string&`, as in lesson 5.3. `static` means only this file can use it, as in lesson 4.2.
- `main`'s loop is the same shape as the game loop: show the menu, read a choice, act on it, repeat until `running` is `false`.
- Every `MenuChoice` has a label in the `switch`, and each one ends in `break`.
- Each time the player picks **Start**, `playLevel` builds a **new** `Game`, so every game starts fresh.
- If the input closes while a game is on, `readAction` returns `Quit`, the game ends, and `readMenuChoice` returns `Quit` too. The program ends instead of looping forever.

```predict
question: You choose 1, play a level, and press Q. What do you see next?
choice: The menu again
choice: The program ends
answer: The menu again
explain: Q only ends playLevel. The menu loop in main is still running, so it shows the menu and asks again.
```

The game now has an eleventh `.cpp` file, `menu.cpp`:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp -o game
./game
```

Play it: start a game, quit it with `Q`, then choose `3`, then `9`, then `2`.

```check
contains main.cpp "#include \"menu.h\"" -- Include menu.h in main.cpp.
matches main.cpp "static\s+void\s+playLevel\s*\(\s*const\s+std::string\s*&\s*\w+\s*\)" -- Define static void playLevel(const std::string& path) { ... }
contains main.cpp "readMenuChoice(std::cin)" -- Read the choice with readMenuChoice(std::cin)
matches main.cpp "case\s+MenuChoice::Start\s*:\s*playLevel\(\s*path\s*\)" -- Start should call playLevel(path);
matches main.cpp "case\s+MenuChoice::Quit\s*:\s*running\s*=\s*false" -- Quit should set running = false;
contains main.cpp "Thanks for playing!" -- After the menu loop, print Thanks for playing!
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp -o game" label="the whole project builds" -- Build all eleven .cpp files together and fix the errors shown.
run "./game" stdin="3\n2\n" stdout="3. Help\nUse W, A, S, D to move." label="3 shows the help" -- Help should call showHelp();
run "./game" stdin="9\n2\n" stdout="Please choose 1, 2 or 3.\n1. Start" label="an unknown choice asks again" -- For MenuChoice::Unknown, print Please choose 1, 2 or 3. and let the loop show the menu again.
run "./game" stdin="1\nq\n2\n" stdout="Goodbye!\n1. Start" label="after a game the menu comes back" -- Start should call playLevel(path); and break; so the menu loop carries on.
run "./game" stdin="2\n" stdout="Thanks for playing!" label="2 quits" -- Quit should set running = false; and Thanks for playing! is printed after the loop.
```

## Where to go from here

You built a real project: separate headers and source files, classes, enums, structs, references, `const`, vectors, streams, file input and a test for nearly every rule. These are ideas for growing it. Each one uses only what you now know:

- **More enemies.** Keep a `std::vector<Enemy>` in `Game`. Chase with each one in a loop, and draw each one in `renderMap`.
- **Pickups.** A new tile such as `+` that heals the hero. It needs a new symbol in the level format, a new field in `Level`, and a new class like `Coins`.
- **A level list.** Put several level paths in a vector and move on to the next level after a win.
- **Saving the best score.** `std::ofstream` writes a file the way `std::ifstream` reads one. Save the best score and read it back on the next start.
- **A smarter enemy.** The chase rule gets stuck behind walls. Look up "breadth-first search" to find a path around them.
- **More tests.** Every new rule you add should arrive with its tests first, as it did in this project.

## Your turn: remember the best score

Your last job is a class of your own. A `Scoreboard` remembers the best score of the session, so the player can try to beat it.

Create `scoreboard.h` and `scoreboard.cpp`. The class must have:

- a constructor that takes no arguments. The best score starts at `0`,
- `bool record(int score)`. It returns `true` if `score` is **higher** than the best so far, and then remembers it. Otherwise it returns `false` and changes nothing,
- `int getBest() const`. It returns the best score.

Then wire it into `main.cpp`:

- Make `playLevel` return an `int`: the hero's final score, from `game.getPlayer().getScore()`.
- Create one `Scoreboard` in `main`, **before** the menu loop.
- After each game, record the score. If it is a new best, print `New best score: ` followed by the best.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_scoreboard.cpp provided
#include "minitest.h"
#include "../scoreboard.h"

TEST(ScoreboardTest, StartsAtZero) {
    Scoreboard s;
    EXPECT_EQ(s.getBest(), 0);
}

TEST(ScoreboardTest, AHigherScoreIsANewBest) {
    Scoreboard s;
    EXPECT_TRUE(s.record(30));
    EXPECT_EQ(s.getBest(), 30);
}

TEST(ScoreboardTest, ALowerScoreIsNot) {
    Scoreboard s;
    s.record(30);
    EXPECT_FALSE(s.record(10));
    EXPECT_EQ(s.getBest(), 30);
}

TEST(ScoreboardTest, AnEqualScoreIsNot) {
    Scoreboard s;
    s.record(30);
    EXPECT_FALSE(s.record(30));
    EXPECT_EQ(s.getBest(), 30);
}

TEST(ScoreboardTest, ZeroNeverBeatsTheStart) {
    Scoreboard s;
    EXPECT_FALSE(s.record(0));
    EXPECT_EQ(s.getBest(), 0);
}

TEST(ScoreboardTest, TheBestOnlyGoesUp) {
    Scoreboard s;
    s.record(10);
    s.record(50);
    s.record(20);
    s.record(40);
    EXPECT_EQ(s.getBest(), 50);
}
```

Your changes go in `scoreboard.h`, `scoreboard.cpp` and `main.cpp`. Don't change the tests. A member variable can't have the same name as a function, so give the variable a different name from `getBest`, for example `highest`.

`scoreboard.cpp` is the twelfth file in the game:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp -o game
./game
```

```check
file scoreboard.h -- Create a file called scoreboard.h in the project folder.
file scoreboard.cpp -- Create a file called scoreboard.cpp in the project folder.
matches scoreboard.h "class\s+Scoreboard" -- Declare a class named Scoreboard.
matches scoreboard.h "bool\s+record\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare bool record(int score); in scoreboard.h. It changes the scoreboard, so it isn't const.
matches scoreboard.h "int\s+getBest\s*\(\s*\)\s*const\s*;" -- Declare int getBest() const; in scoreboard.h.
run "g++ -std=c++17 -c scoreboard.cpp -o scoreboard.o" label="scoreboard.cpp compiles" -- Fix the compiler errors shown. Every function needs Scoreboard:: before its name.
run "g++ -std=c++17 tests/test_scoreboard.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp -o test_scoreboard" label="tests/test_scoreboard.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_scoreboard" label="The scoreboard works" -- A test failed. Read which one. Is the comparison > (strictly higher)? Does the best start at 0?
run "g++ -std=c++17 tests/test_menu.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp -o test_menu" label="tests/test_menu.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_menu" label="The menu still works" -- Your changes broke an earlier test.
matches main.cpp "Scoreboard\s+\w+\s*;" -- Create the scoreboard in main with Scoreboard board;
matches main.cpp "static\s+int\s+playLevel" -- Make playLevel return an int: static int playLevel(const std::string& path)
contains main.cpp ".record(" -- Record each score with board.record(...)
contains main.cpp "New best score: " -- Print New best score: when a score is a new best.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp -o game" label="the whole project builds" -- Build all twelve .cpp files together and fix the errors shown.
run "./game" stdin="1\ns\ns\nd\nq\n2\n" stdout="New best score: 10" label="a first score is a new best" -- After each game, record the score and print New best score: when record returns true.
run "./game" stdin="1\ns\ns\nd\nq\n1\nq\n2\n" stdout="Rank: None\nGoodbye!\n1. Start" label="a lower score is not a new best" -- Print the line only when board.record(...) returns true.
```

```hints
nudge: Look at Player's score from lesson 4.1. What data does a Scoreboard hold, and what are the only two ways to use it?
concept: Hold one private int. The constructor starts it at 0 in the initializer list. record compares the new score with it using >. If higher, it stores the new score and returns true. Otherwise it returns false.
shape: Write scoreboard.h with the class, scoreboard.cpp with three short definitions, then make playLevel end with return game.getPlayer().getScore(); and wrap board.record(playLevel(path)) in an if inside the Start case.
answer: scoreboard.h:
~~~cpp
#pragma once

class Scoreboard {
public:
    Scoreboard();

    bool record(int score);
    int getBest() const;

private:
    int highest;
};
~~~
scoreboard.cpp:
~~~cpp
#include "scoreboard.h"

Scoreboard::Scoreboard() : highest(0) {}

bool Scoreboard::record(int score) {
    if (score > highest) {
        highest = score;
        return true;
    }
    return false;
}

int Scoreboard::getBest() const { return highest; }
~~~
In main.cpp, add #include "scoreboard.h", change the function's first line to static int playLevel(const std::string& path), and end it with:
~~~cpp
    std::cout << game.summary();
    return game.getPlayer().getScore();
}
~~~
In main, create the scoreboard before the loop and change the Start case:
~~~cpp
    Scoreboard board;
    bool running = true;
~~~
~~~cpp
            case MenuChoice::Start:
                if (board.record(playLevel(path))) {
                    std::cout << "New best score: " << board.getBest() << std::endl;
                }
                break;
~~~
```
