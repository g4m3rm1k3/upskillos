---
title: 7.4 — The Keyboard
runtime: none
support: tests/test_keymap.cpp, tests/test_keys_extra.cpp
---

The game is drawn but it can't be played. In this lesson the keyboard drives the hero. You keep the same idea as `parseAction` in lesson 3.1: one small function turns a key into an `Action`, and the game only ever hears about actions. The new function takes SDL's **key code**, a number that names a key.

Click the button that creates the supporting test files before you start.

## Key codes

When a key goes down, SDL reports an event with `event.key.keysym.sym`. That value is a number:

- For letters and digits it is the **character code** of the character on the key, in **lowercase**: `'w'` is 119. SDL reports `w` whether or not Shift is held.
- For keys that make no character, such as the arrows, it is a special number: `1 << 30` plus a key number. `<<` shifts the bits of a number to the left, so `1 << 30` is 1073741824. The four arrow key numbers are Right 79, Left 80, Down 81 and Up 82.
- Escape is character 27.

The game's own key mapping is plain numbers, so it needs no SDL header and can be tested.

```predict
question: What number is the Up arrow key's code, which is (1 << 30) plus 82?
answer: 1073741906
explain: 1 << 30 is 1073741824, and adding 82 gives 1073741906.
tolerance: 0
```

## Read the tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_keymap.cpp provided
#include "minitest.h"
#include "../keymap.h"

TEST(KeymapTest, TheLetterKeys) {
    EXPECT_EQ(actionForKey('w'), Action::Up);
    EXPECT_EQ(actionForKey('s'), Action::Down);
    EXPECT_EQ(actionForKey('a'), Action::Left);
    EXPECT_EQ(actionForKey('d'), Action::Right);
}

TEST(KeymapTest, TheArrowKeys) {
    EXPECT_EQ(actionForKey(1073741906), Action::Up);
    EXPECT_EQ(actionForKey(1073741905), Action::Down);
    EXPECT_EQ(actionForKey(1073741904), Action::Left);
    EXPECT_EQ(actionForKey(1073741903), Action::Right);
}

TEST(KeymapTest, QuitAndEscape) {
    EXPECT_EQ(actionForKey('q'), Action::Quit);
    EXPECT_EQ(actionForKey(27), Action::Quit);
}

TEST(KeymapTest, TheHelpKey) {
    EXPECT_EQ(actionForKey('h'), Action::Help);
}

TEST(KeymapTest, OtherKeysDoNothing) {
    EXPECT_EQ(actionForKey('x'), Action::None);
    EXPECT_EQ(actionForKey(' '), Action::None);
    EXPECT_EQ(actionForKey(0), Action::None);
    EXPECT_EQ(actionForKey(-1), Action::None);
    EXPECT_EQ(actionForKey((1 << 30) + 4), Action::None);
}
```

## Write the key map

Create `keymap.h`:

```cpp file=keymap.h
#pragma once

#include "input.h"

Action actionForKey(int keycode);
```

## Define it in keymap.cpp

Create `keymap.cpp`:

```cpp file=keymap.cpp
#include "keymap.h"

namespace {

const int kSpecial = 1 << 30;
const int kRight = kSpecial + 79;
const int kLeft = kSpecial + 80;
const int kDown = kSpecial + 81;
const int kUp = kSpecial + 82;
const int kEscape = 27;

}

Action actionForKey(int keycode) {
    switch (keycode) {
        case 'w':
        case kUp:
            return Action::Up;
        case 's':
        case kDown:
            return Action::Down;
        case 'a':
        case kLeft:
            return Action::Left;
        case 'd':
        case kRight:
            return Action::Right;
        case 'q':
        case kEscape:
            return Action::Quit;
        case 'h':
            return Action::Help;
        default:
            return Action::None;
    }
}
```

- `namespace { ... }` with no name is an **anonymous namespace**: everything inside is private to this file, like `static`.
- The constants are named, so a reader sees `kUp`, not a long number. `const int` values built from constants can be used as `case` labels.
- `case 'w':` compares the `int` `keycode` with the character code of `w`, because a `char` converts to an `int` without any trouble.
- Two labels in a row share the code below them, as in lesson 3.1.
- Uppercase letters are not listed. SDL never reports them, because `sym` is the key's plain character.

```check
file keymap.h -- Create a file called keymap.h in the project folder.
matches keymap.h "Action\s+actionForKey\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare Action actionForKey(int keycode);
file keymap.cpp -- Create a file called keymap.cpp in the project folder.
contains keymap.cpp "1 << 30" -- Build the special-key base number with 1 << 30
run "g++ -std=c++17 -c keymap.cpp -o keymap.o" label="keymap.cpp compiles" -- Fix the compiler errors shown. Case labels must be constants.
run "g++ -std=c++17 tests/test_keymap.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp -o test_keymap" label="tests/test_keymap.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_keymap" label="Keys map to actions" -- A test failed. Read which one. Are the arrow numbers (1 << 30) plus 79, 80, 81 and 82? Does default return Action::None?
```

## Play with the keyboard

Now `sdl_main.cpp` turns each key press into a turn. A key that maps to `Action::None` isn't an action at all, so it doesn't cost a turn. The `static_assert` at the top is a safety net: it checks **while compiling** that SDL's real numbers match the ones in `keymap.cpp`.

```cpp file=sdl_main.cpp
#define SDL_MAIN_HANDLED
#include <SDL.h>
#include <iostream>
#include <string>
#include "game.h"
#include "keymap.h"
#include "layout.h"
#include "level.h"
#include "sdl_window.h"
#include "view.h"

static_assert(SDLK_UP == 1073741906 && SDLK_DOWN == 1073741905 &&
              SDLK_LEFT == 1073741904 && SDLK_RIGHT == 1073741903 &&
              SDLK_ESCAPE == 27,
              "keymap.cpp key numbers do not match SDL");

int main(int argc, char* argv[]) {
    std::string path = "levels/level1.txt";
    if (argc > 1) {
        path = argv[1];
    }

    Level level;
    Game game;
    if (loadLevelFile(path, level)) {
        game = Game(level);
    } else {
        std::cout << "Could not load " << path << ": " << level.error << std::endl;
        std::cout << "Using the built-in level instead." << std::endl;
    }

    const int tileSize = 48;
    int width = windowWidth(game.getMap().getWidth(), tileSize);
    int height = windowHeight(game.getMap().getHeight(), tileSize, kHudHeight);

    SdlWindow window("Dungeon Dash", width, height);
    if (!window.ok()) {
        std::cout << "Could not open a window: " << SDL_GetError() << std::endl;
        return 1;
    }

    bool running = true;
    while (running) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) {
                running = false;
            } else if (event.type == SDL_KEYDOWN) {
                int key = event.key.keysym.sym;
                Action action = actionForKey(key);
                if (action == Action::Quit) {
                    running = false;
                } else if (action != Action::None) {
                    game.apply(action);
                }
            }
        }

        SDL_SetRenderDrawColor(window.renderer(), 20, 20, 30, 255);
        SDL_RenderClear(window.renderer());
        drawGame(window.renderer(), game, tileSize);
        SDL_RenderPresent(window.renderer());
        SDL_Delay(16);
    }

    return 0;
}
```

- `static_assert(condition, "message")` is checked by the compiler. If the condition is false, the build fails with your message. `SDLK_UP` and the others are SDL's real constants, so any mistake in `keymap.cpp` shows up at once.
- `actionForKey(key)` replaces the Escape test from lesson 7.1. Escape is now `Action::Quit`.
- Every other action goes straight to `game.apply`, the very same function the console game uses. The rules, walls, coins, enemy and win and lose are all reused without a change.
- Holding a key makes SDL repeat it, so you can walk by holding an arrow.
- There is no text any more, so the game is over when the hero turns grey (lost) or the coins are gone (won). Lesson 7.5 adds visual feedback.

```predict
question: You press a key that actionForKey maps to Action::Help. What does the game do?
choice: It calls game.apply(Action::Help), which does nothing and costs no turn
choice: It shows the help text in the window
answer: It calls game.apply(Action::Help), which does nothing and costs no turn
explain: Help is not None and not Quit, so main passes it to apply. In lesson 5.1 apply returns at once for Help. There is no text in the window, so nothing is shown.
```

```check
contains sdl_main.cpp "#include \"keymap.h\"" -- Include keymap.h in sdl_main.cpp.
contains sdl_main.cpp "static_assert(" -- Add the static_assert that checks SDL's key numbers.
contains sdl_main.cpp "actionForKey(key)" -- Turn each key into an action with actionForKey(key)
contains sdl_main.cpp "game.apply(action)" -- Play the turn with game.apply(action);
lacks sdl_main.cpp "SDLK_ESCAPE)" -- Escape is handled by actionForKey now. Remove the direct SDLK_ESCAPE test.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown. If the static_assert fails, a number in keymap.cpp is wrong.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown. If the static_assert fails, a number in keymap.cpp is wrong.
```

Run it, walk the hero onto a coin, and let the enemy catch you. Watch the health bar shrink.

## Your turn: wait and restart

Two more keys, both as small tested functions in `keymap.h` and `keymap.cpp`:

- `bool isWaitKey(int keycode)` is `true` for the **space bar** (32) and the **full stop** `.` (46). Waiting is a real turn in which the hero does nothing, so the enemy still moves.
- `bool isRestartKey(int keycode)` is `true` for `r` only.

Then wire them into `sdl_main.cpp`:

- Save a copy of the freshly loaded game, right after loading: `Game start = game;`.
- On a restart key, put the saved copy back: `game = start;`.
- On a wait key, play `Action::None` with `game.apply`.
- Check for these two **before** you call `actionForKey`.

Copying the saved game is safe because `Game` is plain data, as you saw when you wrote `game = Game(level)` in lesson 5.3.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_keys_extra.cpp provided
#include "minitest.h"
#include "../keymap.h"

TEST(WaitKeyTest, SpaceAndFullStopWait) {
    EXPECT_TRUE(isWaitKey(' '));
    EXPECT_TRUE(isWaitKey('.'));
}

TEST(WaitKeyTest, OtherKeysDoNot) {
    EXPECT_FALSE(isWaitKey('w'));
    EXPECT_FALSE(isWaitKey('r'));
    EXPECT_FALSE(isWaitKey(0));
}

TEST(RestartKeyTest, OnlyRRestarts) {
    EXPECT_TRUE(isRestartKey('r'));
    EXPECT_FALSE(isRestartKey('R'));
    EXPECT_FALSE(isRestartKey(' '));
    EXPECT_FALSE(isRestartKey('w'));
}

TEST(KeysTest, TheNewKeysAreNotActions) {
    EXPECT_EQ(actionForKey(' '), Action::None);
    EXPECT_EQ(actionForKey('r'), Action::None);
}
```

Your changes go in `keymap.h`, `keymap.cpp` and `sdl_main.cpp`. Don't change the tests.

```check
matches keymap.h "bool\s+isWaitKey\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare bool isWaitKey(int keycode); in keymap.h.
matches keymap.h "bool\s+isRestartKey\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare bool isRestartKey(int keycode); in keymap.h.
run "g++ -std=c++17 -c keymap.cpp -o keymap.o" label="keymap.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_keys_extra.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp -o test_keys_extra" label="tests/test_keys_extra.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_keys_extra" label="The wait and restart keys work" -- A test failed. Read which one. Is the space 32 and the full stop 46, and only a lowercase r?
run "g++ -std=c++17 tests/test_keymap.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp -o test_keymap" label="tests/test_keymap.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_keymap" label="The key map still passes" -- Your changes broke an earlier test.
contains sdl_main.cpp "Game start = game;" -- Save the loaded game with Game start = game;
contains sdl_main.cpp "isRestartKey(key)" -- Check for the restart key with isRestartKey(key)
contains sdl_main.cpp "isWaitKey(key)" -- Check for the wait key with isWaitKey(key)
contains sdl_main.cpp "game = start;" -- Restart with game = start;
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
```

```hints
nudge: Where does the loop turn a key into an action? The new keys need to be tested before that line.
concept: isWaitKey and isRestartKey are one-line comparisons with character codes. In sdl_main, an if / else if chain asks first about restart, then about wait, and falls through to the old actionForKey code in the final else.
shape: Two small functions returning keycode == ... in keymap. In main: Game start = game; once, then restructure the KEYDOWN branch as if (isRestartKey(key)) { ... } else if (isWaitKey(key)) { ... } else { the old code }.
answer: In keymap.h, add:
~~~cpp
bool isWaitKey(int keycode);
bool isRestartKey(int keycode);
~~~
In keymap.cpp, add:
~~~cpp
bool isWaitKey(int keycode) {
    return keycode == ' ' || keycode == '.';
}

bool isRestartKey(int keycode) {
    return keycode == 'r';
}
~~~
In sdl_main.cpp, after the level is loaded (before the window is created) add:
~~~cpp
    Game start = game;
~~~
and replace the body of the SDL_KEYDOWN branch with:
~~~cpp
                int key = event.key.keysym.sym;
                if (isRestartKey(key)) {
                    game = start;
                } else if (isWaitKey(key)) {
                    game.apply(Action::None);
                } else {
                    Action action = actionForKey(key);
                    if (action == Action::Quit) {
                        running = false;
                    } else if (action != Action::None) {
                        game.apply(action);
                    }
                }
~~~
```
