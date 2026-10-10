---
title: 3.3 — Walls
runtime: none
support: tests/test_trymove.cpp, tests/test_dash.cpp
---

In lesson 3.2 pressing `W` walked the hero straight into the wall. The `Map` already knows which tiles are walls: `isWall` from lesson 2.2 has said so all along, and it even treats everything outside the grid as a wall. In this lesson you use it. Before the hero moves, look at the tile it is about to step on. If that tile is a wall, don't move.

Click the button that creates the provided files before you start. It adds `tests/test_trymove.cpp` and `tests/test_dash.cpp`. This lesson needs the step count from lesson 3.2's Your turn, so finish that first.

## Read the tests

This function is the rule "you can't walk into a wall". It is called `tryMove`. It tries to move the hero and **tells you whether it did**. The tests are given to you:

```cpp file=tests/test_trymove.cpp provided
#include "minitest.h"
#include "../rules.h"

TEST(TryMoveTest, MovesOntoFloor) {
    Map m;
    Player p(2, 1);
    EXPECT_TRUE(tryMove(m, p, 1, 0));
    EXPECT_EQ(p.getX(), 3);
    EXPECT_EQ(p.getY(), 1);
}

TEST(TryMoveTest, WallBlocksTheMove) {
    Map m;
    Player p(1, 1);
    EXPECT_FALSE(tryMove(m, p, -1, 0));
    EXPECT_EQ(p.getX(), 1);
    EXPECT_EQ(p.getY(), 1);
}

TEST(TryMoveTest, InteriorWallBlocks) {
    Map m;
    Player p(3, 1);
    EXPECT_FALSE(tryMove(m, p, 0, 1));
    EXPECT_EQ(p.getY(), 1);
}

TEST(TryMoveTest, BottomEdgeBlocks) {
    Map m;
    Player p(8, 4);
    EXPECT_FALSE(tryMove(m, p, 0, 1));
    EXPECT_EQ(p.getY(), 4);
}

TEST(TryMoveTest, BlockedMoveIsNotAStep) {
    Map m;
    Player p(1, 1);
    tryMove(m, p, -1, 0);
    EXPECT_EQ(p.getSteps(), 0);
    tryMove(m, p, 1, 0);
    EXPECT_EQ(p.getSteps(), 1);
}
```

The test map is the one from lesson 2.2. The little wall block sits at `x` from 3 to 6 on row 2. A blocked move must change nothing at all: not the position, and not the step count you added in lesson 3.2.

## Declare tryMove in rules.h

Create `rules.h`. This is where the rules of the game will live:

```cpp file=rules.h
#pragma once

#include "map.h"
#include "player.h"

bool tryMove(const Map& map, Player& player, int dx, int dy);
```

- `const Map& map` is a reference to a constant, as in lesson 2.3. The function may look at the map but not change it.
- `Player& player` is a reference that is **not** `const`. It means "the caller's own player", and the function is allowed to change it.
- The result is a `bool`: `true` if the hero moved, `false` if it was blocked.

```predict
question: Suppose the declaration had no & after Player, like this: bool tryMove(const Map& map, Player player, int dx, int dy). The hero is at (2, 1) and you call tryMove(map, hero, 1, 0). What is the hero's x afterwards?
choice: 3
choice: 2
answer: 2
explain: Without &, the function gets a copy of the hero. The copy moves to x = 3, but the copy is thrown away when the function ends, so the real hero never changes.
```

```check
file rules.h -- Create a file called rules.h in the project folder.
contains rules.h "#pragma once" -- Start the header with #pragma once.
matches rules.h "bool\s+tryMove\s*\(\s*const\s+Map\s*&\s*\w+\s*,\s*Player\s*&\s*\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare bool tryMove(const Map& map, Player& player, int dx, int dy); Player needs a & but no const.
```

## Write tryMove

Create `rules.cpp`:

```cpp file=rules.cpp
#include "rules.h"

bool tryMove(const Map& map, Player& player, int dx, int dy) {
    int newX = player.getX() + dx;
    int newY = player.getY() + dy;

    if (map.isWall(newX, newY)) {
        return false;
    }

    player.move(dx, dy);
    return true;
}
```

- First work out where the hero **would** land, without moving it: `newX` and `newY`.
- `map.isWall(newX, newY)` asks the map about that tile. Outside the grid also counts as a wall, so the hero can never leave the map.
- If it is a wall, `return false;` leaves the function at once. `move` is never called, so nothing changes and no step is counted.
- Otherwise the tile is free. `player.move(dx, dy)` does the move, which also counts the step, and `return true;` reports success.

The rules use `Map` and `Player`, so the test program needs `rules.cpp`, `map.cpp` and `player.cpp`:

```
g++ -std=c++17 tests/test_trymove.cpp rules.cpp map.cpp player.cpp -o test_trymove
./test_trymove
```

```check
file rules.cpp -- Create a file called rules.cpp in the project folder.
contains rules.cpp "#include \"rules.h\"" -- Include your own header with #include "rules.h".
contains rules.cpp "isWall" -- Use map.isWall(...) to look at the tile the hero is moving onto.
run "g++ -std=c++17 tests/test_trymove.cpp rules.cpp map.cpp player.cpp -o test_trymove" label="the tryMove tests build" -- Fix the compiler errors shown. Check the function matches the declaration in rules.h. If a test file is missing, click the button that creates the provided files.
tests "./test_trymove" label="tryMove passes its tests" -- A test failed. Read which one. Do you check the NEW position (current plus dx and dy), not the current one? Do you return before calling move?
```

## Use it in main

Replace each direct `player.move` with `tryMove`, and tell the player when a wall is in the way:

```cpp file=main.cpp
#include <iostream>
#include "game.h"
#include "input.h"
#include "map.h"
#include "player.h"
#include "render.h"
#include "rules.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    Map map;
    Player player(1, 1);
    bool running = true;

    while (running) {
        std::cout << renderMap(map, player);
        std::cout << "Steps: " << player.getSteps() << std::endl;
        std::cout << "Move (W/A/S/D, H for help, Q to quit): ";
        Action action = readAction(std::cin);

        bool blocked = false;

        switch (action) {
            case Action::Up:
                blocked = !tryMove(map, player, 0, -1);
                break;
            case Action::Down:
                blocked = !tryMove(map, player, 0, 1);
                break;
            case Action::Left:
                blocked = !tryMove(map, player, -1, 0);
                break;
            case Action::Right:
                blocked = !tryMove(map, player, 1, 0);
                break;
            case Action::Help:
                showHelp();
                break;
            case Action::Quit:
                running = false;
                break;
            case Action::None:
                break;
        }

        if (blocked) {
            std::cout << "A wall blocks the way." << std::endl;
        }
    }

    std::cout << "Goodbye!" << std::endl;
    return 0;
}
```

- `tryMove` returns `true` when the hero moved. `!tryMove(...)` flips that, so `blocked` becomes `true` exactly when the hero did **not** move.
- `bool blocked = false;` is declared inside the loop, so it starts as `false` again on every pass.
- The message is printed after the update, so it appears just above the next map.
- `main` no longer calls `player.move` at all. The rule lives in `rules.cpp`, and `main` only decides which action to try.

The game now has seven `.cpp` files:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp -o game
./game
```

```predict
question: The hero is at (1, 1) and you press W. What does the Steps line say on the next screen?
choice: Steps: 1
choice: Steps: 0
answer: Steps: 0
explain: (1, 0) is a wall, so tryMove returns false before it calls move, and move is where steps are counted.
```

Run it. Try to walk through the outer wall, then around the block of walls in the middle. Press `Q` when you're done.

```check
lacks main.cpp "player.move(" -- main shouldn't move the hero directly any more. tryMove does that after checking for walls.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp -o game" label="the whole project builds" -- Build all seven .cpp files together and fix the errors shown.
run "./game" stdin="w\nq\n" stdout="A wall blocks the way.\n##########\n#@.......#" label="the top wall stops the hero" -- Up should set blocked = !tryMove(map, player, 0, -1); and print A wall blocks the way. when blocked is true.
run "./game" stdin="w\nq\n" without="Steps: 1" label="a blocked move is not a step" -- Call tryMove, not player.move, so a blocked move changes nothing.
run "./game" stdin="d\nd\ns\nq\n" stdout="Steps: 2\nMove (W/A/S/D, H for help, Q to quit): A wall blocks the way." label="the block of walls stops the hero" -- Down should set blocked = !tryMove(map, player, 0, 1);
run "./game" stdin="s\ns\ns\ns\nq\n" stdout="#@.......#\n##########\nSteps: 3\nMove (W/A/S/D, H for help, Q to quit): A wall blocks the way." label="the bottom wall stops the hero" -- Down should use tryMove, like Up.
run "./game" stdin="a\nq\n" stdout="A wall blocks the way." label="the left wall stops the hero" -- Left should set blocked = !tryMove(map, player, -1, 0);
```

## Your turn: a dash

Add a second rule to `rules.h` and `rules.cpp`: a **dash**. It moves the hero up to **two** tiles in one direction, one tile at a time, and stops before a wall.

```
int dash(const Map& map, Player& player, int dx, int dy);
```

It returns how many tiles the hero actually moved: `0`, `1` or `2`. Build it from `tryMove`, so the wall rule lives in one place. The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_dash.cpp provided
#include "minitest.h"
#include "../rules.h"

TEST(DashTest, TwoTilesOnOpenFloor) {
    Map m;
    Player p(1, 3);
    EXPECT_EQ(dash(m, p, 1, 0), 2);
    EXPECT_EQ(p.getX(), 3);
    EXPECT_EQ(p.getY(), 3);
}

TEST(DashTest, StopsBeforeAWall) {
    Map m;
    Player p(7, 3);
    EXPECT_EQ(dash(m, p, 1, 0), 1);
    EXPECT_EQ(p.getX(), 8);
}

TEST(DashTest, BlockedAtOnceMovesNothing) {
    Map m;
    Player p(8, 3);
    EXPECT_EQ(dash(m, p, 1, 0), 0);
    EXPECT_EQ(p.getX(), 8);
}

TEST(DashTest, WorksDownTheMap) {
    Map m;
    Player p(1, 1);
    EXPECT_EQ(dash(m, p, 0, 1), 2);
    EXPECT_EQ(p.getY(), 3);
}

TEST(DashTest, InteriorWallStopsTheDash) {
    Map m;
    Player p(3, 1);
    EXPECT_EQ(dash(m, p, 0, 1), 0);
    EXPECT_EQ(p.getY(), 1);
}

TEST(DashTest, EachTileCountsAsAStep) {
    Map m;
    Player p(1, 3);
    dash(m, p, 1, 0);
    EXPECT_EQ(p.getSteps(), 2);
}
```

Your changes go in `rules.h` and `rules.cpp`. Don't change the tests. Build and run them like the `tryMove` tests, with `test_dash`. Nothing in `main.cpp` calls `dash`. It is a ready-made rule you could give its own key later.

```check
run "g++ -std=c++17 tests/test_dash.cpp rules.cpp map.cpp player.cpp -o test_dash" label="the dash tests build" -- Declare int dash(const Map& map, Player& player, int dx, int dy); in rules.h and define it in rules.cpp.
tests "./test_dash" label="Dash passes its tests" -- A test failed. Read which one. Do you move one tile at a time, and stop as soon as one step is blocked?
run "g++ -std=c++17 tests/test_trymove.cpp rules.cpp map.cpp player.cpp -o test_trymove" label="the tryMove tests still build" -- Fix the compiler errors shown.
tests "./test_trymove" label="tryMove still passes" -- Your changes broke tryMove. Check you didn't alter it.
```

```hints
nudge: You already have a function that moves one tile and reports whether it worked. How many times should you call it?
concept: Count the tiles that moved in an int. Use a for loop that runs twice, and call tryMove each time. If a call returns false, return the count so far straight away.
shape: int moved = 0; for (int i = 0; i < 2; i++) { if (!tryMove(...)) { return moved; } moved++; } return moved;
answer: In rules.h, add:
~~~cpp
int dash(const Map& map, Player& player, int dx, int dy);
~~~
In rules.cpp, add:
~~~cpp
int dash(const Map& map, Player& player, int dx, int dy) {
    int moved = 0;
    for (int i = 0; i < 2; i++) {
        if (!tryMove(map, player, dx, dy)) {
            return moved;
        }
        moved++;
    }
    return moved;
}
~~~
```
