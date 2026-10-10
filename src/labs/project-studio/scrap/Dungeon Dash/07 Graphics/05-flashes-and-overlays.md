---
title: 7.5 — Flashes and Overlays
runtime: none
support: tests/test_flash.cpp, tests/test_overlay.cpp
---

With no text in the window, the player can't tell what just happened. In this lesson you add feedback that fades over time: a **red flash** when the enemy hits you, a **yellow flash** when you grab a coin, and a green or red tint over the whole window when the game ends.

To fade something you need **time**, so this lesson introduces measuring it. You keep the maths in a tested class, `Flash`, and SDL only draws the result.

Click the button that creates the supporting test files before you start.

## Measuring time

`SDL_GetTicks()` returns the number of **milliseconds** (thousandths of a second) since SDL started, as a `Uint32`, SDL's name for an unsigned 32-bit whole number. Each frame you subtract the previous reading from the current one. The result is how long the last frame took, the **elapsed time**, and every moving thing uses it:

```cpp
Uint32 now = SDL_GetTicks();
int elapsed = static_cast<int>(now - last);
last = now;
```

Because the animation depends on elapsed milliseconds, not on the number of frames, it looks the same on a slow computer and a fast one.

A **flash** starts at full strength and fades in a straight line to nothing over its duration. Here are the tests, given to you:

```cpp file=tests/test_flash.cpp provided
#include "minitest.h"
#include "../effects.h"

TEST(FlashTest, StartsQuiet) {
    Flash f;
    EXPECT_FALSE(f.active());
    EXPECT_EQ(f.alpha(100), 0);
}

TEST(FlashTest, StartsAtFullStrength) {
    Flash f;
    f.trigger(200);
    EXPECT_TRUE(f.active());
    EXPECT_EQ(f.alpha(100), 100);
}

TEST(FlashTest, FadesInAStraightLine) {
    Flash f;
    f.trigger(200);
    f.update(100);
    EXPECT_EQ(f.alpha(100), 50);
    f.update(50);
    EXPECT_EQ(f.alpha(100), 25);
}

TEST(FlashTest, EndsAndStaysEnded) {
    Flash f;
    f.trigger(200);
    f.update(500);
    EXPECT_FALSE(f.active());
    EXPECT_EQ(f.alpha(100), 0);
    f.update(500);
    EXPECT_EQ(f.alpha(100), 0);
}

TEST(FlashTest, TriggeringAgainRestarts) {
    Flash f;
    f.trigger(200);
    f.update(150);
    f.trigger(200);
    EXPECT_EQ(f.alpha(100), 100);
}

TEST(FlashTest, NegativeTimeIsIgnored) {
    Flash f;
    f.trigger(200);
    f.update(-50);
    EXPECT_EQ(f.alpha(100), 100);
}

TEST(FlashTest, ADurationOfZeroNeverStarts) {
    Flash f;
    f.trigger(0);
    EXPECT_FALSE(f.active());
    EXPECT_EQ(f.alpha(100), 0);
}
```

`alpha(maxAlpha)` is the current opacity: `maxAlpha` at the start, `0` when finished, in between in proportion to the time left.

## Declare the class

Create `effects.h`:

```cpp file=effects.h
#pragma once

class Flash {
public:
    Flash();

    void trigger(int durationMs);
    void update(int elapsedMs);

    bool active() const;
    int alpha(int maxAlpha) const;

private:
    int total;
    int remaining;
};
```

- `total` is the whole duration of the current flash and `remaining` is the time left.
- `trigger` starts or restarts a flash, `update` moves time forward, and the two getters only look.

```check
file effects.h -- Create a file called effects.h in the project folder.
matches effects.h "class\s+Flash" -- Declare a class named Flash.
matches effects.h "void\s+trigger\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare void trigger(int durationMs);
matches effects.h "void\s+update\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare void update(int elapsedMs);
matches effects.h "int\s+alpha\s*\(\s*int\s+\w+\s*\)\s*const\s*;" -- Declare int alpha(int maxAlpha) const;
```

## Write the class

Create `effects.cpp`:

```cpp file=effects.cpp
#include "effects.h"

Flash::Flash() : total(0), remaining(0) {}

void Flash::trigger(int durationMs) {
    if (durationMs <= 0) {
        total = 0;
        remaining = 0;
        return;
    }
    total = durationMs;
    remaining = durationMs;
}

void Flash::update(int elapsedMs) {
    if (elapsedMs <= 0) {
        return;
    }
    remaining -= elapsedMs;
    if (remaining < 0) {
        remaining = 0;
    }
}

bool Flash::active() const {
    return remaining > 0;
}

int Flash::alpha(int maxAlpha) const {
    if (total <= 0) {
        return 0;
    }
    return maxAlpha * remaining / total;
}
```

- A duration of 0 or less cancels any flash instead of starting one.
- `update` ignores zero and negative time, and never lets `remaining` go below `0`.
- `alpha` multiplies **before** dividing, the same rule as `barWidth` in lesson 7.3. With `maxAlpha` 100, `remaining` 100 and `total` 200 it computes `100 * 100 / 200`, which is 50.
- If `total` is `0` there has been no flash, and dividing by it would crash the program, so that case returns early.

```predict
question: A flash of 200 ms has had 150 ms pass, and its maximum opacity is 80. What does alpha(80) return?
answer: 20
explain: 50 ms are left out of 200. 80 * 50 / 200 = 20.
tolerance: 0
```

```check
file effects.cpp -- Create a file called effects.cpp in the project folder.
run "g++ -std=c++17 -c effects.cpp -o effects.o" label="effects.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_flash.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp effects.cpp -o test_flash" label="tests/test_flash.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_flash" label="Flashes fade correctly" -- A test failed. Read which one. Does remaining stop at 0? Do you multiply by remaining BEFORE dividing by total? Is a negative update ignored?
```

## A see-through layer

To draw a tinted rectangle over the whole window, SDL needs its **blend mode** switched on, so the alpha of a colour counts. Create `overlay.h` and `overlay.cpp`:

```cpp file=overlay.h
#pragma once

#include <SDL.h>
#include "colors.h"

void drawOverlay(SDL_Renderer* renderer, int width, int height, const Color& color);
```

## Define it in overlay.cpp

```cpp file=overlay.cpp
#include "overlay.h"

void drawOverlay(SDL_Renderer* renderer, int width, int height, const Color& color) {
    if (color.a == 0) {
        return;
    }

    SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND);
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
    SDL_Rect area{0, 0, width, height};
    SDL_RenderFillRect(renderer, &area);
    SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_NONE);
}
```

- A colour with alpha `0` is invisible, so the function skips the work.
- `SDL_BLENDMODE_BLEND` mixes the new colour with what is already on screen in proportion to its alpha. Alpha 255 hides what is below, and alpha 60 only tints it.
- The mode is switched back afterwards, so ordinary drawing stays solid.

```check
file overlay.h -- Create a file called overlay.h in the project folder.
matches overlay.h "void\s+drawOverlay\s*\(\s*SDL_Renderer\s*\*\s*\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*const\s+Color\s*&\s*\w+\s*\)\s*;" -- Declare void drawOverlay(SDL_Renderer* renderer, int width, int height, const Color& color);
file overlay.cpp -- Create a file called overlay.cpp in the project folder.
contains overlay.cpp "SDL_BLENDMODE_BLEND" -- Turn on blending with SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND);
run "g++ -std=c++17 -c overlay.cpp $(sdl2-config --cflags) -o overlay.o" os=mac label="overlay.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 -c overlay.cpp $(sdl2-config --cflags) -o overlay.o" os=linux label="overlay.cpp compiles" -- Fix the compiler errors shown.
```

## Use the flashes

Now `sdl_main.cpp` keeps two flashes, measures elapsed time, and starts a flash when the game's message mentions a hit or a coin. The game already writes those messages in `apply` (lesson 5.1). The drawing moves into one helper, `drawFrame`:

```cpp file=sdl_main.cpp
#define SDL_MAIN_HANDLED
#include <SDL.h>
#include <iostream>
#include <string>
#include "effects.h"
#include "game.h"
#include "keymap.h"
#include "layout.h"
#include "level.h"
#include "overlay.h"
#include "sdl_window.h"
#include "view.h"

static_assert(SDLK_UP == 1073741906 && SDLK_DOWN == 1073741905 &&
              SDLK_LEFT == 1073741904 && SDLK_RIGHT == 1073741903 &&
              SDLK_ESCAPE == 27,
              "keymap.cpp key numbers do not match SDL");

static bool mentions(const std::string& text, const char* word) {
    return text.find(word) != std::string::npos;
}

static void drawFrame(SDL_Renderer* renderer, const Game& game, int tileSize,
                      int width, int height, const Flash& hit, const Flash& coin) {
    SDL_SetRenderDrawColor(renderer, 20, 20, 30, 255);
    SDL_RenderClear(renderer);
    drawGame(renderer, game, tileSize);
    drawOverlay(renderer, width, height,
                Color{255, 0, 0, static_cast<unsigned char>(hit.alpha(120))});
    drawOverlay(renderer, width, height,
                Color{255, 220, 0, static_cast<unsigned char>(coin.alpha(80))});
    SDL_RenderPresent(renderer);
}

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
    Game start = game;

    const int tileSize = 48;
    int width = windowWidth(game.getMap().getWidth(), tileSize);
    int height = windowHeight(game.getMap().getHeight(), tileSize, kHudHeight);

    SdlWindow window("Dungeon Dash", width, height);
    if (!window.ok()) {
        std::cout << "Could not open a window: " << SDL_GetError() << std::endl;
        return 1;
    }

    Flash hitFlash;
    Flash coinFlash;
    Uint32 last = SDL_GetTicks();

    bool running = true;
    while (running) {
        Uint32 now = SDL_GetTicks();
        int elapsed = static_cast<int>(now - last);
        last = now;
        hitFlash.update(elapsed);
        coinFlash.update(elapsed);

        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) {
                running = false;
            } else if (event.type == SDL_KEYDOWN) {
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

                if (mentions(game.getMessage(), "hits")) {
                    hitFlash.trigger(400);
                }
                if (mentions(game.getMessage(), "coin")) {
                    coinFlash.trigger(250);
                }
            }
        }

        drawFrame(window.renderer(), game, tileSize, width, height, hitFlash, coinFlash);
        SDL_Delay(16);
    }

    return 0;
}
```

- `elapsed` is how many milliseconds the last frame took. Both flashes use it to advance.
- `static_cast<unsigned char>(...)` turns the opacity, an `int` from 0 to 120, into the `unsigned char` a `Color` holds. Without the cast, the braces refuse to narrow it silently.
- `text.find(word)` returns the position of `word` in `text`, or `std::string::npos` if it isn't there, as in lesson 2.3. So `!= npos` means "contains".
- The message is checked after every key event. A hit message is "The enemy hits you!" and a coin message is "You found a coin!". A turn that has neither leaves the flashes alone.
- A restart replaces the game with the saved copy, whose message is empty, so no flash starts.
- A flash's drawing is a full-window, see-through rectangle, drawn after the game, so it tints everything below.

```predict
question: The hero walks onto a coin. For how long, at most, does the yellow flash stay visible?
choice: 250 milliseconds
choice: 400 milliseconds
answer: 250 milliseconds
explain: A coin triggers coinFlash with a duration of 250. The red hitFlash, at 400, is a different object.
```

```check
contains sdl_main.cpp "#include \"effects.h\"" -- Include effects.h in sdl_main.cpp.
contains sdl_main.cpp "Flash hitFlash;" -- Create the flash with Flash hitFlash;
contains sdl_main.cpp "SDL_GetTicks()" -- Measure time with SDL_GetTicks()
contains sdl_main.cpp "hitFlash.update(elapsed)" -- Move time forward with hitFlash.update(elapsed);
contains sdl_main.cpp "hitFlash.trigger(400)" -- Start the red flash with hitFlash.trigger(400);
contains sdl_main.cpp "drawFrame(" -- Draw each frame with drawFrame(...)
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp effects.cpp overlay.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp effects.cpp overlay.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
```

Run it. Grab a coin and get hit by the enemy, and watch the fades.

## Your turn: the ending tint

When the game is **won**, tint the whole window green. When it's **lost**, tint it red, darker. Write the colour as a function in `effects.h` and `effects.cpp`, then use it in `drawFrame`:

```
Color overlayFor(GameState state);
```

- `GameState::Won` returns `Color{0, 200, 80, 110}`.
- `GameState::Lost` returns `Color{200, 0, 0, 140}`.
- `GameState::Playing` returns `Color{0, 0, 0, 0}`: invisible.

`GameState` comes from `rules.h` and `Color` from `colors.h`, so `effects.h` must include both.

In `drawFrame`, add one more `drawOverlay` call, after the two flashes, using `overlayFor(game.getState())`.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_overlay.cpp provided
#include "minitest.h"
#include "../effects.h"

TEST(OverlayTest, WinningIsGreen) {
    EXPECT_EQ(overlayFor(GameState::Won), (Color{0, 200, 80, 110}));
}

TEST(OverlayTest, LosingIsRed) {
    EXPECT_EQ(overlayFor(GameState::Lost), (Color{200, 0, 0, 140}));
}

TEST(OverlayTest, PlayingHasNoTint) {
    EXPECT_EQ(overlayFor(GameState::Playing), (Color{0, 0, 0, 0}));
}

TEST(OverlayTest, TheTintsAreSeeThrough) {
    EXPECT_LT(overlayFor(GameState::Won).a, 255);
    EXPECT_LT(overlayFor(GameState::Lost).a, 255);
}
```

Your changes go in `effects.h`, `effects.cpp` and `sdl_main.cpp`. Don't change the tests.

```check
contains effects.h "#include \"colors.h\"" -- Include colors.h in effects.h.
contains effects.h "#include \"rules.h\"" -- Include rules.h in effects.h, for GameState.
matches effects.h "Color\s+overlayFor\s*\(\s*GameState\s+\w+\s*\)\s*;" -- Declare Color overlayFor(GameState state); in effects.h.
run "g++ -std=c++17 -c effects.cpp -o effects.o" label="effects.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_overlay.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp effects.cpp -o test_overlay" label="tests/test_overlay.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_overlay" label="The ending tints are right" -- A test failed. Read which one. Are the numbers exact, and does Playing return alpha 0?
run "g++ -std=c++17 tests/test_flash.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp effects.cpp -o test_flash" label="tests/test_flash.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_flash" label="Flashes still pass" -- Your changes broke an earlier test.
contains sdl_main.cpp "overlayFor(game.getState())" -- Draw the ending tint with drawOverlay(renderer, width, height, overlayFor(game.getState()));
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp effects.cpp overlay.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp effects.cpp overlay.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
```

```hints
nudge: You wrote colorFor with a switch on a char in lesson 7.2. What changes if the switch is on a GameState?
concept: A switch on an enum class lists each value as GameState::Won and so on. Each label returns a Color built with braces. effects.h needs the includes for the two types it mentions.
shape: In effects.cpp, switch (state) with three cases, each returning a Color. In sdl_main.cpp's drawFrame, one more drawOverlay call at the end, before SDL_RenderPresent.
answer: In effects.h, add the includes at the top and the declaration at the end:
~~~cpp
#include "colors.h"
#include "rules.h"
~~~
~~~cpp
Color overlayFor(GameState state);
~~~
In effects.cpp, add:
~~~cpp
Color overlayFor(GameState state) {
    switch (state) {
        case GameState::Won:
            return Color{0, 200, 80, 110};
        case GameState::Lost:
            return Color{200, 0, 0, 140};
        default:
            return Color{0, 0, 0, 0};
    }
}
~~~
In sdl_main.cpp, inside drawFrame, add this just before SDL_RenderPresent(renderer);
~~~cpp
    drawOverlay(renderer, width, height, overlayFor(game.getState()));
~~~
```
