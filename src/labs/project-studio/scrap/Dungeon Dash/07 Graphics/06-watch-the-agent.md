---
title: 7.6 — Watch the Agent
runtime: none
support: tests/test_ticker.cpp, tests/test_ticker_speed.cpp
---

You taught an agent to play in chapter 06. Now you can **watch** it. The window can show the Q-learning agent playing with the table it saved in `qtable.txt`, one move at a time, restarting after each game.

A person presses keys when they like. The agent has to act on a **timer**, say once every 400 ms. In this lesson you build the timer, then a `--watch` mode for the window.

Before you start: run the console program with `--train` once (lesson 6.5), so `qtable.txt` exists. By default it trains on `levels/training.txt`, and watching uses the same level.

Click the button that creates the supporting test files before you start.

## A ticker

A **ticker** answers one question: "given that this many milliseconds passed, how many times should I act now?". It must **keep the leftover**. If the interval is 100 and the frames take 60 ms, the first frame has no tick, but the second reaches 120 ms and gives one tick, with 20 ms left over for next time. Here are the tests, given to you:

```cpp file=tests/test_ticker.cpp provided
#include "minitest.h"
#include "../timing.h"

TEST(TickerTest, NothingUntilTheIntervalPasses) {
    Ticker t(100);
    EXPECT_EQ(t.advance(50), 0);
    EXPECT_EQ(t.advance(50), 1);
}

TEST(TickerTest, LeftoverTimeIsKept) {
    Ticker t(100);
    EXPECT_EQ(t.advance(99), 0);
    EXPECT_EQ(t.advance(1), 1);
    EXPECT_EQ(t.advance(99), 0);
}

TEST(TickerTest, ALongGapGivesSeveralTicks) {
    Ticker t(100);
    EXPECT_EQ(t.advance(250), 2);
    EXPECT_EQ(t.advance(50), 1);
}

TEST(TickerTest, ZeroAndNegativeTimeGiveNothing) {
    Ticker t(100);
    EXPECT_EQ(t.advance(0), 0);
    EXPECT_EQ(t.advance(-10), 0);
    EXPECT_EQ(t.advance(100), 1);
}

TEST(TickerTest, ABadIntervalNeverTicks) {
    Ticker zero(0);
    Ticker negative(-5);
    EXPECT_EQ(zero.advance(1000), 0);
    EXPECT_EQ(negative.advance(1000), 0);
}

TEST(TickerTest, RemembersItsInterval) {
    Ticker t(250);
    EXPECT_EQ(t.getInterval(), 250);
}
```

## Declare it in timing.h

Create `timing.h`:

```cpp file=timing.h
#pragma once

class Ticker {
public:
    explicit Ticker(int intervalMs);

    int advance(int elapsedMs);
    int getInterval() const;

private:
    int interval;
    int stored;
};
```

## Define it in timing.cpp

Create `timing.cpp`:

```cpp file=timing.cpp
#include "timing.h"

Ticker::Ticker(int intervalMs) : interval(intervalMs), stored(0) {}

int Ticker::advance(int elapsedMs) {
    if (interval <= 0) {
        return 0;
    }
    if (elapsedMs > 0) {
        stored += elapsedMs;
    }

    int ticks = stored / interval;
    stored = stored % interval;
    return ticks;
}

int Ticker::getInterval() const { return interval; }
```

- `stored` is time that has passed but hasn't been turned into a tick yet.
- `stored / interval` is whole-number division: how many whole intervals fit. `stored % interval` is the remainder, as in lesson 4.2, and it is kept for next time.
- A bad interval would make `stored / interval` divide by zero, which crashes the program, so it returns `0` first.

```predict
question: A Ticker with interval 100 gets advance(250) and then advance(70). What does the second call return?
answer: 1
explain: The first call gives 2 ticks and keeps 50 ms. The second adds 70, making 120, which is one whole interval with 20 left.
tolerance: 0
```

```check
file timing.h -- Create a file called timing.h in the project folder.
matches timing.h "class\s+Ticker" -- Declare a class named Ticker.
matches timing.h "int\s+advance\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare int advance(int elapsedMs);
file timing.cpp -- Create a file called timing.cpp in the project folder.
run "g++ -std=c++17 -c timing.cpp -o timing.o" label="timing.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_ticker.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp effects.cpp timing.cpp -o test_ticker" label="tests/test_ticker.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_ticker" label="The ticker counts correctly" -- A test failed. Read which one. Do you keep the remainder in stored? Do you return 0 for a bad interval before dividing?
```

## Watch mode

`sdl_main.cpp` now has two modes, so each becomes a function. `runPlay` is the human game from lesson 7.5, unchanged, only moved into a function. `runWatch` is new. Read it slowly:

```cpp file=sdl_main.cpp
#define SDL_MAIN_HANDLED
#include <SDL.h>
#include <iostream>
#include <string>
#include "effects.h"
#include "env.h"
#include "game.h"
#include "keymap.h"
#include "layout.h"
#include "level.h"
#include "overlay.h"
#include "qtable.h"
#include "sdl_window.h"
#include "timing.h"
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
    drawOverlay(renderer, width, height, overlayFor(game.getState()));
    SDL_RenderPresent(renderer);
}

static void startFlashes(const Game& game, Flash& hit, Flash& coin) {
    if (mentions(game.getMessage(), "hits")) {
        hit.trigger(400);
    }
    if (mentions(game.getMessage(), "coin")) {
        coin.trigger(250);
    }
}

static int runPlay(const std::string& path) {
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
                startFlashes(game, hitFlash, coinFlash);
            }
        }

        drawFrame(window.renderer(), game, tileSize, width, height, hitFlash, coinFlash);
        SDL_Delay(16);
    }
    return 0;
}

static int runWatch(const std::string& path) {
    Level level;
    if (!loadLevelFile(path, level)) {
        std::cout << "Could not load " << path << ": " << level.error << std::endl;
        return 1;
    }

    QTable q(Env::actionCount());
    if (!loadQTableFile(q, "qtable.txt")) {
        std::cout << "Could not load qtable.txt. Run the console game with --train first." << std::endl;
        return 1;
    }

    Env env(level);

    const int tileSize = 48;
    int width = windowWidth(env.getGame().getMap().getWidth(), tileSize);
    int height = windowHeight(env.getGame().getMap().getHeight(), tileSize, kHudHeight);

    SdlWindow window("Dungeon Dash - watching the agent", width, height);
    if (!window.ok()) {
        std::cout << "Could not open a window: " << SDL_GetError() << std::endl;
        return 1;
    }

    Ticker stepTicker(400);
    Ticker pauseTicker(1500);
    Flash hitFlash;
    Flash coinFlash;

    std::string state = env.reset();
    bool done = false;
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
                if (actionForKey(event.key.keysym.sym) == Action::Quit) {
                    running = false;
                }
            }
        }

        if (!done) {
            int ticks = stepTicker.advance(elapsed);
            for (int i = 0; i < ticks && !done; i++) {
                StepResult result = env.step(q.bestAction(state));
                state = result.state;
                done = result.done;
                startFlashes(env.getGame(), hitFlash, coinFlash);
            }
        } else if (pauseTicker.advance(elapsed) > 0) {
            state = env.reset();
            done = false;
            pauseTicker = Ticker(1500);
        }

        drawFrame(window.renderer(), env.getGame(), tileSize, width, height, hitFlash, coinFlash);
        SDL_Delay(16);
    }
    return 0;
}

int main(int argc, char* argv[]) {
    std::string path = "levels/level1.txt";
    bool pathGiven = false;
    bool watching = false;

    for (int i = 1; i < argc; i++) {
        std::string word = argv[i];
        if (word == "--watch") {
            watching = true;
        } else {
            path = word;
            pathGiven = true;
        }
    }

    if (watching) {
        if (!pathGiven) {
            path = "levels/training.txt";
        }
        return runWatch(path);
    }
    return runPlay(path);
}
```

- `runWatch` uses the `Env` from chapter 06 as its game. `env.getGame()` gives the current `Game`, which the same `drawFrame` draws. The agent's play looks exactly like a human's.
- Each frame the ticker says how many agent moves are due. The `for` loop plays them: `q.bestAction(state)` picks the move, with **no exploring**, `env.step` plays it, and the new state replaces the old one.
- `i < ticks && !done` stops playing moves the moment the game ends, even if more ticks were due.
- When the game is over, the ticker for the pause counts 1500 ms. Then `env.reset()` starts a new game and the pause ticker is replaced with a fresh one, so the next pause starts from zero.
- Only Quit works in watch mode. A person has nothing to press.
- If your table was trained on a **different** level than the one you watch, its keys won't match. It then knows nothing, and the agent just picks Up. Watch the level you trained on.
- `main` now reads its words in a loop, like lesson 6.4. `--watch` picks watch mode, and any other word is a level path.

```predict
question: You run the program with no extra words. Which function does main call?
choice: runPlay("levels/level1.txt")
choice: runWatch("levels/training.txt")
answer: runPlay("levels/level1.txt")
explain: watching stays false without --watch, so main falls through to runPlay with the default path.
```

```check
contains sdl_main.cpp "#include \"timing.h\"" -- Include timing.h in sdl_main.cpp.
contains sdl_main.cpp "static int runWatch" -- Add static int runWatch(const std::string& path) { ... }
contains sdl_main.cpp "static int runPlay" -- Move the human game into static int runPlay(const std::string& path) { ... }
contains sdl_main.cpp "\"--watch\"" -- Switch watching on when an argument is "--watch".
contains sdl_main.cpp "stepTicker.advance(elapsed)" -- Count the agent's moves with stepTicker.advance(elapsed)
contains sdl_main.cpp "q.bestAction(state)" -- Let the agent choose with q.bestAction(state): no exploring.
contains sdl_main.cpp "loadQTableFile(q, \"qtable.txt\")" -- Load the table with loadQTableFile(q, "qtable.txt")
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp effects.cpp overlay.cpp timing.cpp env.cpp qtable.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp effects.cpp overlay.cpp timing.cpp env.cpp qtable.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
```

Build it, then run `game_sdl --watch` from the project folder, with `qtable.txt` and `levels/training.txt` in place. On Windows run `game_sdl --watch`. On macOS and Linux run `./game_sdl --watch`.

## Your turn: speed control

Watching at a fixed speed is slow when the agent is good, and too fast when you want to follow a mistake. Add speed control to `Ticker`:

- `void faster()` halves the interval. It never goes below **50** milliseconds.
- `void slower()` doubles the interval. It never goes above **1600** milliseconds.
- Both use whole-number maths. A halved 60 would be 30, so it stops at 50.

Then wire them in `runWatch`: when the key maps to `Action::Up`, call `stepTicker.faster()`. When it maps to `Action::Down`, call `stepTicker.slower()`. The arrow keys and `w` and `s` already map to those actions in lesson 7.4, so you don't need new key code.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_ticker_speed.cpp provided
#include "minitest.h"
#include "../timing.h"

TEST(TickerSpeedTest, FasterHalvesTheInterval) {
    Ticker t(400);
    t.faster();
    EXPECT_EQ(t.getInterval(), 200);
    t.faster();
    EXPECT_EQ(t.getInterval(), 100);
    t.faster();
    EXPECT_EQ(t.getInterval(), 50);
}

TEST(TickerSpeedTest, FasterStopsAtFifty) {
    Ticker t(50);
    t.faster();
    EXPECT_EQ(t.getInterval(), 50);
    Ticker u(60);
    u.faster();
    EXPECT_EQ(u.getInterval(), 50);
}

TEST(TickerSpeedTest, SlowerDoublesTheInterval) {
    Ticker t(400);
    t.slower();
    EXPECT_EQ(t.getInterval(), 800);
    t.slower();
    EXPECT_EQ(t.getInterval(), 1600);
}

TEST(TickerSpeedTest, SlowerStopsAtSixteenHundred) {
    Ticker t(1600);
    t.slower();
    EXPECT_EQ(t.getInterval(), 1600);
    Ticker u(1000);
    u.slower();
    EXPECT_EQ(u.getInterval(), 1600);
}

TEST(TickerSpeedTest, OddIntervalsUseWholeNumbers) {
    Ticker t(301);
    t.faster();
    EXPECT_EQ(t.getInterval(), 150);
}

TEST(TickerSpeedTest, TheTickerStillWorksAfterwards) {
    Ticker t(400);
    t.faster();
    EXPECT_EQ(t.advance(199), 0);
    EXPECT_EQ(t.advance(1), 1);
}
```

Your changes go in `timing.h`, `timing.cpp` and `sdl_main.cpp`. Don't change the tests.

```check
matches timing.h "void\s+faster\s*\(\s*\)\s*;" -- Declare void faster(); in timing.h.
matches timing.h "void\s+slower\s*\(\s*\)\s*;" -- Declare void slower(); in timing.h.
run "g++ -std=c++17 -c timing.cpp -o timing.o" label="timing.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_ticker_speed.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp effects.cpp timing.cpp -o test_ticker_speed" label="tests/test_ticker_speed.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_ticker_speed" label="Speed control works" -- A test failed. Read which one. Is a halved interval clamped UP to 50, and a doubled one clamped DOWN to 1600?
run "g++ -std=c++17 tests/test_ticker.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp keymap.cpp effects.cpp timing.cpp -o test_ticker" label="tests/test_ticker.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_ticker" label="The ticker still counts correctly" -- Your changes broke an earlier test.
contains sdl_main.cpp "stepTicker.faster()" -- Call stepTicker.faster() for Action::Up in runWatch.
contains sdl_main.cpp "stepTicker.slower()" -- Call stepTicker.slower() for Action::Down in runWatch.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp effects.cpp overlay.cpp timing.cpp env.cpp qtable.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp keymap.cpp effects.cpp overlay.cpp timing.cpp env.cpp qtable.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
```

```hints
nudge: Each function changes one member and then fixes it if it went too far. You did the same thing in Player::takeDamage in lesson 1.3.
concept: faster divides the interval by 2 and raises it to 50 if it fell below. slower multiplies by 2 and lowers it to 1600 if it went above. In runWatch, the event branch asks which action the key means, then calls the matching method.
shape: Two short functions with one if each. In runWatch, change the key branch to store Action action = actionForKey(...) and test it against Quit, Up and Down.
answer: In timing.h, add to the public section:
~~~cpp
    void faster();
    void slower();
~~~
In timing.cpp, add:
~~~cpp
void Ticker::faster() {
    interval = interval / 2;
    if (interval < 50) {
        interval = 50;
    }
}

void Ticker::slower() {
    interval = interval * 2;
    if (interval > 1600) {
        interval = 1600;
    }
}
~~~
In sdl_main.cpp, in runWatch, replace the SDL_KEYDOWN branch with:
~~~cpp
            } else if (event.type == SDL_KEYDOWN) {
                Action action = actionForKey(event.key.keysym.sym);
                if (action == Action::Quit) {
                    running = false;
                } else if (action == Action::Up) {
                    stepTicker.faster();
                } else if (action == Action::Down) {
                    stepTicker.slower();
                }
            }
~~~
```

## Where to go from here

You now have a graphical front end for a game, with the rules and the learner untouched. Ideas that use only what you know:

- **Text on screen.** SDL has a companion library, SDL_ttf, that draws text with a font file. It would show the score, the steps and the end message.
- **Sprites.** Replace the coloured squares with small pictures. SDL_image loads PNG files into textures that `SDL_RenderCopy` draws.
- **Smooth movement.** Keep a drawn position that glides towards the real tile over a few frames, using the same elapsed time as `Flash`.
- **Sound.** SDL's audio functions, or SDL_mixer, can play a sound on a coin or a hit, triggered where you start the flashes.
- **A level picker.** List the files in `levels/` and let the player choose with the arrow keys, like the console menu.
- **Show what the agent is thinking.** Colour each floor tile by the best Q-value the agent has for the hero standing there.

That finishes the graphics chapter. The game you wrote in the console now runs in a window, and you can watch the program you trained play it.
