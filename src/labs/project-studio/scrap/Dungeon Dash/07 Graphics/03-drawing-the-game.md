---
title: 7.3 — Drawing the Game
runtime: none
support: tests/test_hud.cpp
---

Now you connect the pieces. `drawGame` takes a `Game` and paints it into a window: tiles from the map, coins, the enemy, the hero. This is the graphical sibling of `renderMap` from lesson 2.3, and it reads the game through the same `const` getters.

Click the button that creates the supporting test file before you start.

## Draw the map

SDL draws a filled rectangle with `SDL_RenderFillRect`. It wants an `SDL_Rect`, SDL's own version of your `Rect`, so a small helper converts. Create `view.h`:

```cpp file=view.h
#pragma once

#include <SDL.h>
#include "game.h"

const int kHudHeight = 40;

void drawGame(SDL_Renderer* renderer, const Game& game, int tileSize);
```

- `kHudHeight` is the height in pixels of the strip under the map. A `const int` at file level is private to each file that includes it, so it is safe in a header.
- The function takes the renderer as a pointer, the game as a `const` reference (it only looks), and the size of one tile in pixels.

## Define it in view.cpp

Create `view.cpp`:

```cpp file=view.cpp
#include "view.h"

#include "colors.h"
#include "layout.h"

static void fill(SDL_Renderer* renderer, const Rect& rect, const Color& color) {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
    SDL_Rect area{rect.x, rect.y, rect.w, rect.h};
    SDL_RenderFillRect(renderer, &area);
}

void drawGame(SDL_Renderer* renderer, const Game& game, int tileSize) {
    const Map& map = game.getMap();
    int columns = map.getWidth();
    int rows = map.getHeight();

    for (int y = 0; y < rows; y++) {
        for (int x = 0; x < columns; x++) {
            fill(renderer, tileRect(x, y, tileSize), colorFor(map.getTile(x, y)));
        }
    }

    Rect hud{0, rows * tileSize, columns * tileSize, kHudHeight};
    fill(renderer, hud, Color{15, 15, 22, 255});
}
```

- `fill` is `static`, so only this file can use it. It sets the drawing colour, converts the `Rect` into an `SDL_Rect` (the same four numbers in the same order), and fills it. `&area` passes the address, because SDL wants a pointer.
- The two loops are the ones from lesson 2.2. For each tile, `getTile` gives a character, `colorFor` gives its colour and `tileRect` gives its place.
- The map holds only walls and floor. The hero, coins and enemy aren't in it, so they are drawn in the next step.
- The HUD strip begins right under the last row, at `y = rows * tileSize`.

```check
file view.h -- Create a file called view.h in the project folder.
matches view.h "void\s+drawGame\s*\(\s*SDL_Renderer\s*\*\s*\w+\s*,\s*const\s+Game\s*&\s*\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare void drawGame(SDL_Renderer* renderer, const Game& game, int tileSize);
file view.cpp -- Create a file called view.cpp in the project folder.
contains view.cpp "SDL_RenderFillRect" -- Fill rectangles with SDL_RenderFillRect(renderer, &area);
contains view.cpp "tileRect(" -- Place each tile with tileRect(x, y, tileSize).
contains view.cpp "colorFor(" -- Colour each tile with colorFor(map.getTile(x, y)).
run "g++ -std=c++17 -c view.cpp $(sdl2-config --cflags) -o view.o" os=mac label="view.cpp compiles" -- Fix the compiler errors shown. Check that layout.h and colors.h are included.
run "g++ -std=c++17 -c view.cpp $(sdl2-config --cflags) -o view.o" os=linux label="view.cpp compiles" -- Fix the compiler errors shown. Check that layout.h and colors.h are included.
```

## Draw the people and the coins

Draw order matters: whatever is drawn later covers what was drawn earlier. So the order is floor, coins, enemy, hero. The hero is drawn last, so it sits on top of an enemy or a coin, as in lesson 4.2. Characters are drawn as three-quarters of a tile, and coins as half, using `centerRect` from lesson 7.2:

```cpp file=view.cpp
#include "view.h"

#include "colors.h"
#include "layout.h"

static void fill(SDL_Renderer* renderer, const Rect& rect, const Color& color) {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
    SDL_Rect area{rect.x, rect.y, rect.w, rect.h};
    SDL_RenderFillRect(renderer, &area);
}

void drawGame(SDL_Renderer* renderer, const Game& game, int tileSize) {
    const Map& map = game.getMap();
    int columns = map.getWidth();
    int rows = map.getHeight();

    for (int y = 0; y < rows; y++) {
        for (int x = 0; x < columns; x++) {
            Rect tile = tileRect(x, y, tileSize);
            fill(renderer, tile, colorFor(map.getTile(x, y)));
            if (game.getCoins().hasCoinAt(x, y)) {
                fill(renderer, centerRect(tile, tileSize / 2), colorFor('*'));
            }
        }
    }

    const Enemy& enemy = game.getEnemy();
    Rect enemyTile = tileRect(enemy.getX(), enemy.getY(), tileSize);
    fill(renderer, centerRect(enemyTile, tileSize * 3 / 4), colorFor('E'));

    const Player& player = game.getPlayer();
    char heroTile = '@';
    if (player.getHealth() == 0) {
        heroTile = 'X';
    }
    Rect heroRect = tileRect(player.getX(), player.getY(), tileSize);
    fill(renderer, centerRect(heroRect, tileSize * 3 / 4), colorFor(heroTile));

    Rect hud{0, rows * tileSize, columns * tileSize, kHudHeight};
    fill(renderer, hud, Color{15, 15, 22, 255});
}
```

- Inside the tile loop the coin is drawn straight after its tile. A coin never overlaps another tile, so the order within the loop is safe.
- `tileSize / 2` and `tileSize * 3 / 4` use integer division, so with a tile of 48 they give 24 and 36.
- The fallen hero uses the colour of `'X'`, grey, the same rule as lesson 2.3.
- The enemy and the hero are drawn after the whole loop, so they sit above every coin and floor tile.

```predict
question: The hero and the enemy stand on the same tile. Which colour do you see in the middle of that tile?
choice: The hero's green
choice: The enemy's red
answer: The hero's green
explain: Both squares are the same size and in the same place, and the hero is drawn after the enemy, so it covers it completely.
```

```check
contains view.cpp "centerRect(" -- Draw coins and characters with centerRect(...)
contains view.cpp "hasCoinAt(x, y)" -- Draw a coin where game.getCoins().hasCoinAt(x, y) is true.
contains view.cpp "getEnemy()" -- Draw the enemy with game.getEnemy().
contains view.cpp "getPlayer()" -- Draw the hero with game.getPlayer().
matches view.cpp "getEnemy\(\)[\s\S]*getPlayer\(\)" -- Draw the enemy BEFORE the hero, so the hero is on top.
run "g++ -std=c++17 -c view.cpp $(sdl2-config --cflags) -o view.o" os=mac label="view.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 -c view.cpp $(sdl2-config --cflags) -o view.o" os=linux label="view.cpp compiles" -- Fix the compiler errors shown.
```

## Show a level

Now `sdl_main.cpp` loads a level, sizes the window from it, and draws it every frame:

```cpp file=sdl_main.cpp
#define SDL_MAIN_HANDLED
#include <SDL.h>
#include <iostream>
#include <string>
#include "game.h"
#include "layout.h"
#include "level.h"
#include "sdl_window.h"
#include "view.h"

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
            } else if (event.type == SDL_KEYDOWN && event.key.keysym.sym == SDLK_ESCAPE) {
                running = false;
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

- The loading code is the same as in lesson 5.3. If the file can't be loaded, the built-in level stays.
- The window's size comes from the game's map, so a bigger level gives a bigger window.
- Each pass of the loop: handle events, clear, draw the game, present. Nothing moves yet. Lesson 7.4 adds the keyboard.

```check
contains sdl_main.cpp "#include \"view.h\"" -- Include view.h in sdl_main.cpp.
contains sdl_main.cpp "drawGame(window.renderer(), game, tileSize)" -- Draw each frame with drawGame(window.renderer(), game, tileSize);
matches sdl_main.cpp "windowWidth\(\s*game\.getMap\(\)\.getWidth\(\)\s*,\s*tileSize\s*\)" -- Size the window with windowWidth(game.getMap().getWidth(), tileSize)
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
```

Run it from the project folder, so `levels/level1.txt` is found. You should see the walls, three coins, the enemy in the top-right corner and the hero at the top-left.

## Your turn: a health bar

The HUD strip is empty. Draw a **health bar** in it: a grey bar for the full width, with a green bar on top whose width follows the hero's health. The width is a plain function, so it can be tested. Create `hud.h` and `hud.cpp`:

```
int barWidth(int value, int maxValue, int fullWidth);
```

- It returns how wide the filled part is: the same fraction of `fullWidth` as `value` is of `maxValue`.
- A `value` above `maxValue` fills the whole bar. A `value` below `0` gives `0`. A `maxValue` of `0` or less gives `0`.
- Whole pixels only. Multiply **before** you divide, or small values round to nothing.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_hud.cpp provided
#include "minitest.h"
#include "../hud.h"

TEST(HudTest, FullHealthFillsTheBar) {
    EXPECT_EQ(barWidth(10, 10, 100), 100);
}

TEST(HudTest, HalfHealthFillsHalf) {
    EXPECT_EQ(barWidth(5, 10, 100), 50);
    EXPECT_EQ(barWidth(3, 10, 100), 30);
}

TEST(HudTest, NoHealthIsAnEmptyBar) {
    EXPECT_EQ(barWidth(0, 10, 100), 0);
}

TEST(HudTest, TooMuchStopsAtFull) {
    EXPECT_EQ(barWidth(25, 10, 100), 100);
}

TEST(HudTest, NegativeStopsAtEmpty) {
    EXPECT_EQ(barWidth(-2, 10, 100), 0);
}

TEST(HudTest, WholePixelsOnly) {
    EXPECT_EQ(barWidth(1, 3, 100), 33);
}

TEST(HudTest, ABadMaximumGivesAnEmptyBar) {
    EXPECT_EQ(barWidth(5, 0, 100), 0);
    EXPECT_EQ(barWidth(5, -3, 100), 0);
}
```

Then in `view.cpp`, at the end of `drawGame`, draw the bar in the HUD:

- A grey back bar, `Color{50, 50, 60, 255}`, 10 pixels in from the left, 10 pixels below the map, 20 pixels tall, and `columns * tileSize - 20` pixels wide.
- A green bar on top, `Color{80, 200, 120, 255}`, same place and height, with the width from `barWidth(player.getHealth(), 10, fullWidth)`.

Your changes go in `hud.h`, `hud.cpp` and `view.cpp`. Don't change the tests.

```check
file hud.h -- Create a file called hud.h in the project folder.
matches hud.h "int\s+barWidth\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare int barWidth(int value, int maxValue, int fullWidth); in hud.h.
run "g++ -std=c++17 -c hud.cpp -o hud.o" label="hud.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_hud.cpp hud.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp -o test_hud" label="tests/test_hud.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_hud" label="barWidth passes its tests" -- A test failed. Read which one. Do you multiply value by fullWidth BEFORE dividing by maxValue? Do you clamp value to the range 0 to maxValue?
contains view.cpp "#include \"hud.h\"" -- Include hud.h in view.cpp.
contains view.cpp "barWidth(" -- Draw the filled part with barWidth(player.getHealth(), 10, fullWidth)
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp view.cpp layout.cpp colors.cpp hud.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the graphical game builds" -- Build all the .cpp files together and fix the errors shown.
```

```hints
nudge: Which test fails? If 1 out of 3 gives 0 instead of 33, look at the order of the multiplication and the division.
concept: value / maxValue is whole-number division, so 1 / 3 is 0. Multiply first: value * fullWidth / maxValue. Before that, handle the odd cases: a maxValue of 0 or less, a negative value, and a value above maxValue.
shape: Three early returns or clamps, then one line: return value * fullWidth / maxValue;
answer: hud.h:
~~~cpp
#pragma once

int barWidth(int value, int maxValue, int fullWidth);
~~~
hud.cpp:
~~~cpp
#include "hud.h"

int barWidth(int value, int maxValue, int fullWidth) {
    if (maxValue <= 0 || value <= 0) {
        return 0;
    }
    if (value >= maxValue) {
        return fullWidth;
    }
    return value * fullWidth / maxValue;
}
~~~
In view.cpp, add #include "hud.h" and, at the end of drawGame:
~~~cpp
    int fullWidth = columns * tileSize - 20;
    Rect back{10, rows * tileSize + 10, fullWidth, 20};
    fill(renderer, back, Color{50, 50, 60, 255});

    Rect bar{10, rows * tileSize + 10, barWidth(player.getHealth(), 10, fullWidth), 20};
    fill(renderer, bar, Color{80, 200, 120, 255});
~~~
```
