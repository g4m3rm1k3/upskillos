---
title: 7.2 — Tiles and Colors
runtime: none
support: tests/test_layout.cpp, tests/test_colors.cpp, tests/test_center.cpp
---

To draw the game, two questions need answers. **Where** on the screen does the tile `(3, 2)` go? And **what colour** is a wall? Neither needs SDL. They are plain maths and plain data, so you write them as ordinary functions and test them like the rest of the project. Only the last step of drawing, in lesson 7.3, touches SDL.

Click the button that creates the supporting test files before you start.

## Pixels and rectangles

A window is a grid of **pixels**, the tiny dots a screen is made of. Positions count from the **top-left corner**: `x` grows to the right and `y` grows **downwards**, the same directions as in the map. A rectangle is four numbers: `x` and `y` of its top-left corner, then its width `w` and height `h`.

If every tile is `tileSize` pixels square, tile `(column, row)` starts at `column * tileSize` across and `row * tileSize` down. Create `layout.h`:

```cpp file=layout.h
#pragma once

struct Rect {
    int x;
    int y;
    int w;
    int h;
};

inline bool operator==(const Rect& a, const Rect& b) {
    return a.x == b.x && a.y == b.y && a.w == b.w && a.h == b.h;
}
```

- `Rect` is a struct, like `Point` in lesson 4.1, with four members. `Rect{96, 64, 32, 32}` builds one.
- `operator==` teaches C++ what `==` means for two `Rect`s: all four members are equal. The tests use it to compare whole rectangles.
- `inline` is needed because this function is **defined in a header**. Without it, every `.cpp` file that includes the header would get its own copy, and the linker would complain about duplicates.

```predict
question: What is Rect{96, 64, 32, 32}.w?
answer: 32
explain: Members are filled in the order they are declared: x, y, w, h. The third value, 32, is the width.
tolerance: 0
```

```check
file layout.h -- Create a file called layout.h in the project folder.
matches layout.h "struct\s+Rect\s*\{" -- Define the type with struct Rect { ... };
matches layout.h "inline\s+bool\s+operator==\s*\(\s*const\s+Rect\s*&\s*\w+\s*,\s*const\s+Rect\s*&\s*\w+\s*\)" -- Write inline bool operator==(const Rect& a, const Rect& b) { ... }
```

## Read the layout tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_layout.cpp provided
#include "minitest.h"
#include "../layout.h"

TEST(LayoutTest, TheFirstTileIsAtTheCorner) {
    EXPECT_EQ(tileRect(0, 0, 32), (Rect{0, 0, 32, 32}));
}

TEST(LayoutTest, TilesAreSpacedByTheirSize) {
    EXPECT_EQ(tileRect(3, 2, 32), (Rect{96, 64, 32, 32}));
    EXPECT_EQ(tileRect(1, 1, 48), (Rect{48, 48, 48, 48}));
}

TEST(LayoutTest, NeighboursTouchWithoutOverlapping) {
    Rect a = tileRect(1, 0, 32);
    Rect b = tileRect(2, 0, 32);
    EXPECT_EQ(a.x + a.w, b.x);
}

TEST(LayoutTest, WindowWidthIsAllTheColumns) {
    EXPECT_EQ(windowWidth(10, 32), 320);
    EXPECT_EQ(windowWidth(12, 48), 576);
}

TEST(LayoutTest, WindowHeightIsTheRowsPlusTheHud) {
    EXPECT_EQ(windowHeight(6, 32, 40), 232);
    EXPECT_EQ(windowHeight(7, 48, 0), 336);
}
```

- The parentheses in `(Rect{0, 0, 32, 32})` stop the commas inside the braces from being read as separate macro arguments.
- The **HUD** (heads-up display) is a strip under the map for status information. In lesson 7.3 it shows a health bar. The window is as tall as the map plus the strip.

## Write the layout functions

Add the three declarations at the end of `layout.h`:

```cpp file=layout.h
#pragma once

struct Rect {
    int x;
    int y;
    int w;
    int h;
};

inline bool operator==(const Rect& a, const Rect& b) {
    return a.x == b.x && a.y == b.y && a.w == b.w && a.h == b.h;
}

Rect tileRect(int column, int row, int tileSize);
int windowWidth(int columns, int tileSize);
int windowHeight(int rows, int tileSize, int hudHeight);
```

## Define it in layout.cpp

Create `layout.cpp`:

```cpp file=layout.cpp
#include "layout.h"

Rect tileRect(int column, int row, int tileSize) {
    return Rect{column * tileSize, row * tileSize, tileSize, tileSize};
}

int windowWidth(int columns, int tileSize) {
    return columns * tileSize;
}

int windowHeight(int rows, int tileSize, int hudHeight) {
    return rows * tileSize + hudHeight;
}
```

Each function is one multiplication. Having them in one place means the rest of the program never repeats `x * tileSize`.

```check
matches layout.h "Rect\s+tileRect\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare Rect tileRect(int column, int row, int tileSize);
matches layout.h "int\s+windowHeight\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare int windowHeight(int rows, int tileSize, int hudHeight);
file layout.cpp -- Create a file called layout.cpp in the project folder.
run "g++ -std=c++17 -c layout.cpp -o layout.o" label="layout.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_layout.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp -o test_layout" label="tests/test_layout.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_layout" label="The layout maths is correct" -- A test failed. Read which one. Is x column * tileSize and y row * tileSize? Does the window height add the HUD once?
```

## A colour is four numbers

SDL wants a colour as four numbers from 0 to 255: red, green, blue, alpha (opacity). Bundle them as a struct, and map each map character to a colour. Create `colors.h`:

```cpp file=colors.h
#pragma once

struct Color {
    unsigned char r;
    unsigned char g;
    unsigned char b;
    unsigned char a;
};

inline bool operator==(const Color& a, const Color& b) {
    return a.r == b.r && a.g == b.g && a.b == b.b && a.a == b.a;
}

Color colorFor(char tile);
```

- `unsigned char` is a whole number from 0 to 255, exactly SDL's range, in one byte. A plain `int` would allow 300 or -5.
- `colorFor` takes the same characters the map and the renderer already use: `#` wall, `.` floor, `*` coin, `@` hero, `X` fallen hero, `E` enemy.

```check
file colors.h -- Create a file called colors.h in the project folder.
matches colors.h "struct\s+Color\s*\{" -- Define the type with struct Color { ... };
matches colors.h "unsigned\s+char\s+r\s*;" -- Give Color a member unsigned char r;
matches colors.h "Color\s+colorFor\s*\(\s*char\s+\w+\s*\)\s*;" -- Declare Color colorFor(char tile);
```

## Read the tests in tests/test_colors.cpp

Here are the tests, given to you:

```cpp file=tests/test_colors.cpp provided
#include "minitest.h"
#include <string>
#include "../colors.h"

TEST(ColorTest, TheMapColours) {
    EXPECT_EQ(colorFor('#'), (Color{90, 90, 120, 255}));
    EXPECT_EQ(colorFor('.'), (Color{30, 30, 40, 255}));
}

TEST(ColorTest, TheCharacterColours) {
    EXPECT_EQ(colorFor('*'), (Color{255, 200, 0, 255}));
    EXPECT_EQ(colorFor('@'), (Color{80, 200, 120, 255}));
    EXPECT_EQ(colorFor('X'), (Color{130, 130, 130, 255}));
    EXPECT_EQ(colorFor('E'), (Color{220, 60, 60, 255}));
}

TEST(ColorTest, EveryKnownTileLooksDifferent) {
    std::string tiles = "#.*@XE";
    for (std::size_t i = 0; i < tiles.size(); i++) {
        for (std::size_t j = i + 1; j < tiles.size(); j++) {
            EXPECT_FALSE(colorFor(tiles[i]) == colorFor(tiles[j]));
        }
    }
}

TEST(ColorTest, UnknownTilesAreBrightMagenta) {
    EXPECT_EQ(colorFor('Z'), (Color{255, 0, 255, 255}));
    EXPECT_EQ(colorFor('?'), (Color{255, 0, 255, 255}));
}
```

Bright magenta is a classic "something is wrong" colour in games. It is so ugly that a missing case can't hide.

## Define it in colors.cpp

Create `colors.cpp`:

```cpp file=colors.cpp
#include "colors.h"

Color colorFor(char tile) {
    switch (tile) {
        case '#':
            return Color{90, 90, 120, 255};
        case '.':
            return Color{30, 30, 40, 255};
        case '*':
            return Color{255, 200, 0, 255};
        case '@':
            return Color{80, 200, 120, 255};
        case 'X':
            return Color{130, 130, 130, 255};
        case 'E':
            return Color{220, 60, 60, 255};
        default:
            return Color{255, 0, 255, 255};
    }
}
```

It is the `switch` from lesson 3.1 on a `char`, returning a struct built with braces.

```predict
question: What does colorFor('x') return, with a lowercase x?
choice: The enemy colour, because x looks like E
choice: Bright magenta, because only an uppercase X is known
answer: Bright magenta, because only an uppercase X is known
explain: A char comparison is exact. 'x' and 'X' are different characters, so 'x' falls into default.
```

```check
file colors.cpp -- Create a file called colors.cpp in the project folder.
run "g++ -std=c++17 -c colors.cpp -o colors.o" label="colors.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_colors.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp -o test_colors" label="tests/test_colors.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_colors" label="The colours are right" -- A test failed. Read which one. Does every case return the exact numbers, and does default return bright magenta?
```

## Your turn: a smaller square, centred

Coins and characters should be drawn **smaller than their tile**, centred in it, so the grid stays visible around them. Add to `layout.h` and `layout.cpp`:

```
Rect centerRect(const Rect& outer, int size);
```

- It returns a square, `size` wide and tall, in the middle of `outer`.
- If the space left over is odd, the extra pixel goes on the **right and bottom**. Integer division drops the remainder, as in lesson 6.3.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_center.cpp provided
#include "minitest.h"
#include "../layout.h"

TEST(CenterTest, ASmallerSquareInTheMiddle) {
    EXPECT_EQ(centerRect(Rect{64, 32, 32, 32}, 16), (Rect{72, 40, 16, 16}));
}

TEST(CenterTest, TheSameSizeChangesNothing) {
    EXPECT_EQ(centerRect(Rect{0, 0, 48, 48}, 48), (Rect{0, 0, 48, 48}));
}

TEST(CenterTest, SizeZeroIsAPoint) {
    EXPECT_EQ(centerRect(Rect{10, 10, 20, 20}, 0), (Rect{20, 20, 0, 0}));
}

TEST(CenterTest, AnOddGapLeansLeftAndUp) {
    EXPECT_EQ(centerRect(Rect{0, 0, 33, 33}, 10), (Rect{11, 11, 10, 10}));
}

TEST(CenterTest, WorksForANonSquareOuterRectangle) {
    EXPECT_EQ(centerRect(Rect{0, 0, 100, 40}, 20), (Rect{40, 10, 20, 20}));
}
```

Your changes go in `layout.h` and `layout.cpp`. Don't change the tests.

```check
matches layout.h "Rect\s+centerRect\s*\(\s*const\s+Rect\s*&\s*\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare Rect centerRect(const Rect& outer, int size); in layout.h.
run "g++ -std=c++17 -c layout.cpp -o layout.o" label="layout.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_center.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp -o test_center" label="tests/test_center.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_center" label="centerRect passes its tests" -- A test failed. Read which one. Is the left edge outer.x plus half of the spare width? Is the height handled separately from the width?
run "g++ -std=c++17 tests/test_layout.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp stats.cpp layout.cpp colors.cpp -o test_layout" label="tests/test_layout.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_layout" label="The layout maths still passes" -- Your change broke an earlier test.
```

```hints
nudge: How much space is left over horizontally? Half of it goes on each side.
concept: Spare width is outer.w - size, and spare height is outer.h - size. The new rectangle starts that spare amount divided by 2 from the outer corner, and has the given size in both directions.
shape: return Rect{outer.x + (outer.w - size) / 2, outer.y + (outer.h - size) / 2, size, size};
answer: In layout.h, add:
~~~cpp
Rect centerRect(const Rect& outer, int size);
~~~
In layout.cpp, add:
~~~cpp
Rect centerRect(const Rect& outer, int size) {
    return Rect{outer.x + (outer.w - size) / 2,
                outer.y + (outer.h - size) / 2,
                size,
                size};
}
~~~
```
