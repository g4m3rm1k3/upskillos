---
title: 3.1 — Reading Input
track: Moving Around
runtime: none
support: tests/test_parse.cpp, tests/test_read.cpp, tests/test_help.cpp
---

A game has to listen. In this lesson you read a key from the player and turn it into an **action**: W, A, S, D to move and Q to quit. By the end, the game reads one action and says what it was. Moving the hero is lesson 3.2.

Click the button that creates the provided files before you start. It adds three test files to `tests/`.

## Read one character

`std::cin` is the console's input **stream**: a source of characters that arrive one after another. It is the partner of `std::cout`. The operator `>>` pulls a value out of a stream and stores it in a variable. The variable's type decides how much is read, and a `char` takes one character.

Replace the end of `main` so it reads a key:

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

    char key = ' ';
    std::cout << "Move (W/A/S/D, Q to quit): ";
    std::cin >> key;
    std::cout << "You typed: " << key << std::endl;

    return 0;
}
```

- `char key = ' ';` creates a `char` holding a space. We give it a value on purpose. If the read fails, `key` would otherwise hold junk, and reading a variable that was never given a value is undefined behaviour.
- `std::cin >> key;` waits until the player types something and presses Enter. It skips **whitespace** (spaces, tabs and new lines), then stores the first other character in `key`.
- Anything else the player typed stays in the stream, waiting for the next read.

Build and run it as before. This time the program stops and waits for you:

```
g++ -std=c++17 main.cpp game.cpp map.cpp player.cpp render.cpp -o game
./game
```

Commit to an answer before you run it. You will type `wasd` and press Enter:

```predict
question: What does the program print on its last line?
choice: You typed: w
choice: You typed: wasd
choice: You typed: d
answer: You typed: w
explain: key is a char, so it holds one character. The >> operator takes the first one, w, and leaves "asd" waiting in the stream.
```

```check
matches main.cpp "std::cin\s*>>\s*key\s*;" -- Read the key with std::cin >> key;
contains main.cpp "char key = ' ';" -- Declare the variable as char key = ' '; so it has a value even if the read fails.
run "g++ -std=c++17 main.cpp game.cpp map.cpp player.cpp render.cpp -o game" label="the project builds" -- Build the five .cpp files together and fix the errors shown.
run "./game" stdin="wasd\n" stdout="You typed: w" label="typing wasd reads only the w" -- Read one char with std::cin >> key; and print You typed: followed by it.
```

## Name the actions

The game shouldn't compare characters like `'w'` and `'W'` all over the place. Instead, translate a key into an **action** once, in one place. The rest of the game then talks about actions.

A fixed list of named choices is called an **enum** (short for enumeration). Create `input.h`:

```cpp file=input.h
#pragma once

enum class Action {
    None,
    Up,
    Down,
    Left,
    Right,
    Quit
};

Action parseAction(char key);
```

- `enum class Action { ... };` defines a new type called `Action`. A value of this type is always one of the six names listed. The semicolon after the closing brace is required.
- You write a value with the type's name in front: `Action::Up`. The word `class` makes the names **scoped**, so this `Up` can't clash with any other `Up` in your program. `Action` is also a separate type, so you can't mix it up with a plain number by accident.
- `None` means "the player typed something we don't understand". It guarantees there is always an answer.
- `Action parseAction(char key);` declares a function that takes a `char` and gives back an `Action`. This is only the declaration. The body comes in a moment.

```check
file input.h -- Create a file called input.h in the project folder.
contains input.h "#pragma once" -- Start the header with #pragma once.
matches input.h "enum\s+class\s+Action" -- Define the enum with enum class Action { ... };
matches input.h "Action\s+parseAction\s*\(\s*char\s+\w+\s*\)\s*;" -- Declare Action parseAction(char key);
```

## Read the tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_parse.cpp provided
#include "minitest.h"
#include "../input.h"

TEST(ParseTest, LowercaseKeys) {
    EXPECT_EQ(parseAction('w'), Action::Up);
    EXPECT_EQ(parseAction('a'), Action::Left);
    EXPECT_EQ(parseAction('s'), Action::Down);
    EXPECT_EQ(parseAction('d'), Action::Right);
    EXPECT_EQ(parseAction('q'), Action::Quit);
}

TEST(ParseTest, UppercaseKeys) {
    EXPECT_EQ(parseAction('W'), Action::Up);
    EXPECT_EQ(parseAction('A'), Action::Left);
    EXPECT_EQ(parseAction('S'), Action::Down);
    EXPECT_EQ(parseAction('D'), Action::Right);
    EXPECT_EQ(parseAction('Q'), Action::Quit);
}

TEST(ParseTest, OtherKeysDoNothing) {
    EXPECT_EQ(parseAction('x'), Action::None);
    EXPECT_EQ(parseAction('1'), Action::None);
    EXPECT_EQ(parseAction(' '), Action::None);
}
```

Both cases of each letter must work, because players leave Caps Lock on. Any key the game doesn't know must give `Action::None`, including digits and the space.

When an `EXPECT_EQ` on two actions fails, the message shows each action as its **number**: its position in the enum list, counting from 0. So `None` is 0, `Up` is 1, `Down` is 2, and so on.

## Turn keys into actions

Create `input.cpp`:

```cpp file=input.cpp
#include "input.h"

Action parseAction(char key) {
    switch (key) {
        case 'w':
        case 'W':
            return Action::Up;
        case 's':
        case 'S':
            return Action::Down;
        case 'a':
        case 'A':
            return Action::Left;
        case 'd':
        case 'D':
            return Action::Right;
        case 'q':
        case 'Q':
            return Action::Quit;
        default:
            return Action::None;
    }
}
```

- `switch (key)` looks at the value of `key` and jumps to the `case` label that matches it. A label ends with a colon.
- Two labels in a row, such as `case 'w':` and `case 'W':`, share the code below them. Either key runs it.
- `return` leaves the function at once with that value. That is why no `break` is needed here.
- `default:` runs when no label matches. Because it returns `Action::None`, every possible `key` gets an answer.

Build the test program from the test file and `input.cpp`, and run it:

```
g++ -std=c++17 tests/test_parse.cpp input.cpp -o test_parse
./test_parse
```

```check
file input.cpp -- Create a file called input.cpp in the project folder.
contains input.cpp "#include \"input.h\"" -- Include your own header with #include "input.h".
run "g++ -std=c++17 tests/test_parse.cpp input.cpp -o test_parse" label="the parsing tests build" -- Fix the compiler errors shown. Every case label ends with a colon. If a test file is missing, click the button that creates the provided files.
tests "./test_parse" label="parseAction passes its tests" -- A test failed. Read which one. Does every key have both an uppercase and a lowercase label, and does default return Action::None?
```

## Read from any stream

`parseAction` handles a key you already have. Now you need a function that reads one from the player. Add a second declaration to `input.h`:

```cpp file=input.h
#pragma once

#include <istream>

enum class Action {
    None,
    Up,
    Down,
    Left,
    Right,
    Quit
};

Action parseAction(char key);
Action readAction(std::istream& in);
```

- `#include <istream>` brings in `std::istream`, the type of "anything you can read characters from": the keyboard, a file, or a piece of text in memory. `std::cin` is an `std::istream`.
- `std::istream& in` is a reference, as in lesson 2.1: the function reads from the caller's own stream, not a copy. It isn't `const`, because reading changes the stream by moving it forward.
- Why not just use `std::cin` inside the function? Because tests can then feed it text from a string and need no keyboard.
- `readAction` reads one key and returns its action. When there is no input left at all, it returns `Action::Quit`. That stops the game from looping forever if the player closes the input (Ctrl+D on macOS and Linux, Ctrl+Z then Enter on Windows).

```check
matches input.h "Action\s+readAction\s*\(\s*std::istream\s*&\s*\w+\s*\)\s*;" -- Declare Action readAction(std::istream& in);
contains input.h "#include <istream>" -- Add #include <istream> so std::istream is known.
```

## Read the tests for reading

Another given file:

```cpp file=tests/test_read.cpp provided
#include "minitest.h"
#include <sstream>
#include "../input.h"

TEST(ReadTest, ReadsOneKey) {
    std::istringstream in("w");
    EXPECT_EQ(readAction(in), Action::Up);
}

TEST(ReadTest, SkipsWhitespace) {
    std::istringstream in("  \n d");
    EXPECT_EQ(readAction(in), Action::Right);
}

TEST(ReadTest, ReadsKeysOneAtATime) {
    std::istringstream in("wasd");
    EXPECT_EQ(readAction(in), Action::Up);
    EXPECT_EQ(readAction(in), Action::Left);
    EXPECT_EQ(readAction(in), Action::Down);
    EXPECT_EQ(readAction(in), Action::Right);
}

TEST(ReadTest, EndOfInputQuits) {
    std::istringstream in("");
    EXPECT_EQ(readAction(in), Action::Quit);
}
```

`std::istringstream` (from `<sstream>`) is an input stream that reads from a string instead of the keyboard. So `in` behaves like `std::cin` would if the player had typed that text. Each call to `readAction` must take exactly **one** key and leave the rest.

## Write readAction

Add the function to the end of `input.cpp`. Keep `parseAction` as it is:

```cpp file=input.cpp
#include "input.h"

Action parseAction(char key) {
    switch (key) {
        case 'w':
        case 'W':
            return Action::Up;
        case 's':
        case 'S':
            return Action::Down;
        case 'a':
        case 'A':
            return Action::Left;
        case 'd':
        case 'D':
            return Action::Right;
        case 'q':
        case 'Q':
            return Action::Quit;
        default:
            return Action::None;
    }
}

Action readAction(std::istream& in) {
    char key = ' ';
    if (!(in >> key)) {
        return Action::Quit;
    }
    return parseAction(key);
}
```

- `in >> key` is the same operator you used with `std::cin`, and it works on any stream. The whole expression's value is the stream itself.
- A stream used as a condition is `true` if the last read worked and `false` if it failed. `!` flips that, so the `if` body runs when the read failed, for example because nothing is left. The extra parentheses make `!` apply to the whole read.
- If the read worked, `key` holds a character. `parseAction(key)` turns it into an action, and `return` hands that back.

```predict
question: A stream holds only the text "x". What do two calls in a row, readAction(in) and then readAction(in) again, return?
choice: None, then None
choice: None, then Quit
choice: Quit, then Quit
answer: None, then Quit
explain: The first call reads x, which is no known key, so parseAction gives None. Nothing is left, so the second read fails and readAction returns Quit.
```

Build and run the reading tests the same way, with `test_read` in place of `test_parse`.

```check
run "g++ -std=c++17 tests/test_read.cpp input.cpp -o test_read" label="the reading tests build" -- Fix the compiler errors shown. Define Action readAction(std::istream& in) { ... } in input.cpp.
tests "./test_read" label="readAction passes its tests" -- A test failed. Read which one. Do you skip whitespace, read only one key per call, and return Quit when the read fails?
run "g++ -std=c++17 tests/test_parse.cpp input.cpp -o test_parse" label="the parsing tests still build" -- Fix the compiler errors shown.
tests "./test_parse" label="parseAction still passes" -- Your changes broke parseAction. Check you didn't alter it.
```

## Use it in main

Swap the raw `std::cin` read for `readAction`:

```cpp file=main.cpp
#include <iostream>
#include "game.h"
#include "input.h"
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

    std::cout << "Move (W/A/S/D, Q to quit): ";
    Action action = readAction(std::cin);

    if (action == Action::Quit) {
        std::cout << "Goodbye!" << std::endl;
    } else if (action == Action::None) {
        std::cout << "I don't know that key." << std::endl;
    } else {
        std::cout << "That is a move." << std::endl;
    }

    return 0;
}
```

- `readAction(std::cin)` passes the keyboard stream to the function. The result is stored in `action`, a variable of type `Action`.
- `==` compares two `Action` values and gives a `bool`. The `if / else if / else` chain runs exactly one of its three branches.
- This is temporary. The game asks once and then stops. Lesson 3.2 repeats it in a loop.

The game now has a sixth `.cpp` file, `input.cpp`:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp -o game
./game
```

```check
lacks main.cpp "char key" -- main shouldn't read characters itself any more. readAction does that.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp -o game" label="the whole project builds" -- Build all six .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="Goodbye!" label="Q says goodbye" -- Read the action with readAction(std::cin) and print Goodbye! when it is Action::Quit.
run "./game" stdin="x\n" stdout="I don't know that key." label="an unknown key is reported" -- Print I don't know that key. when the action is Action::None.
run "./game" stdin="D\n" stdout="That is a move." label="a move key is recognised" -- Print That is a move. for every other action.
```

## Your turn: a help key

Add a new action, `Help`, for the keys `h` and `H`. The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_help.cpp provided
#include "minitest.h"
#include <sstream>
#include "../input.h"

TEST(HelpTest, HKeyIsHelp) {
    EXPECT_EQ(parseAction('h'), Action::Help);
    EXPECT_EQ(parseAction('H'), Action::Help);
}

TEST(HelpTest, OtherKeysAreUnchanged) {
    EXPECT_EQ(parseAction('w'), Action::Up);
    EXPECT_EQ(parseAction('q'), Action::Quit);
    EXPECT_EQ(parseAction('x'), Action::None);
}

TEST(HelpTest, ReadsHelpFromAStream) {
    std::istringstream in("h");
    EXPECT_EQ(readAction(in), Action::Help);
}
```

Your changes go in `input.h` and `input.cpp`. Don't change the tests. Build and run them like the others, with `test_help`. Nothing in `main.cpp` uses `Help` yet. Lesson 3.2 does.

```check
run "g++ -std=c++17 tests/test_help.cpp input.cpp -o test_help" label="the help tests build" -- Add Help to the Action list in input.h, then fix the compiler errors shown.
tests "./test_help" label="The help key works" -- A test failed. Read which one. Does both h and H return Action::Help?
run "g++ -std=c++17 tests/test_parse.cpp input.cpp -o test_parse" label="the parsing tests still build" -- Fix the compiler errors shown.
tests "./test_parse" label="The other keys still work" -- Your change broke an earlier test. Check you only added labels and didn't change the others.
run "g++ -std=c++17 tests/test_read.cpp input.cpp -o test_read" label="the reading tests still build" -- Fix the compiler errors shown.
tests "./test_read" label="Reading still works" -- Your change broke readAction. Check you didn't alter it.
```

```hints
nudge: Where does the game list every action it knows? Where does it decide which key means which action?
concept: A new action needs a new name in the enum, and parseAction needs labels that return it. Handle both letter cases.
shape: Add Help to the end of the enum list. In the switch, add case 'h': and case 'H': above the default label, returning Action::Help.
answer: In input.h, the enum becomes:
~~~cpp
enum class Action {
    None,
    Up,
    Down,
    Left,
    Right,
    Quit,
    Help
};
~~~
In input.cpp, add these labels inside the switch, before default:
~~~cpp
        case 'h':
        case 'H':
            return Action::Help;
~~~
```
