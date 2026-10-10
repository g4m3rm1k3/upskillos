---
title: 3.2 — The Game Loop
runtime: none
support: tests/test_steps.cpp
---

At the moment the game reads one key and stops. A real game keeps going. Almost every game has the same heartbeat: **draw** the world, **read** what the player did, **update** the world, and **repeat** until the player quits. That is the **game loop**. In this lesson you build it, so the hero can walk around.

You will see a problem when you try it. The hero walks through walls. Lesson 3.3 fixes that.

Click the button that creates the provided file before you start. It adds `tests/test_steps.cpp`.

## Repeat until quit

A `while` loop runs its body again and again for as long as its condition is `true`. The condition is checked before each pass. Here the condition will be a **flag**: a `bool` variable that says whether the game should carry on.

Replace everything after `Player player(1, 1);` in `main.cpp`:

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
    bool running = true;

    while (running) {
        std::cout << renderMap(map, player);
        std::cout << "Move (W/A/S/D, H for help, Q to quit): ";
        Action action = readAction(std::cin);

        if (action == Action::Quit) {
            running = false;
        }
    }

    std::cout << "Goodbye!" << std::endl;
    return 0;
}
```

- `bool running = true;` creates the flag. `bool` is the yes/no type from lesson 2.2.
- `while (running) { ... }` checks `running`. If it is `true`, the body runs, and then the check happens again. When it is `false`, the program skips to the first line after the closing brace.
- Setting `running = false` doesn't stop the body halfway. The rest of that pass still runs first. Here nothing follows the `if`, so it makes no difference yet.
- `Action action` is declared **inside** the braces, so it exists only for one pass. It is created fresh each time round.
- Each pass prints another map under the last one. Scroll up to see the earlier ones.
- If the input ends, `readAction` returns `Quit`, so the loop can't spin forever.

Build and run it, using the same command as at the end of lesson 3.1:

```
g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp -o game
./game
```

Press `x` and then Enter in the running game, and see what happens:

```predict
question: You type x and press Enter. What happens?
choice: The game quits
choice: The map is drawn again, unchanged
choice: The game prints an error message
answer: The map is drawn again, unchanged
explain: x becomes Action::None. Only Action::Quit sets running to false, so the loop goes round again and draws the same map.
```

Press `Q` and Enter to leave.

```check
contains main.cpp "bool running = true;" -- Create the flag with bool running = true;
matches main.cpp "while\s*\(\s*running\s*\)" -- Loop with while (running) { ... }
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp -o game" label="the project builds" -- Build the six .cpp files together and fix the errors shown.
run "./game" stdin="x\nq\n" stdout="Q to quit): ##########" label="an unknown key draws the map again" -- Put the drawing, the prompt and readAction inside while (running) { ... }.
run "./game" stdin="q\n" stdout="Goodbye!" label="Q ends the game" -- Set running = false; when the action is Action::Quit, and print Goodbye! after the loop.
```

## Move the hero

Now the **update** part. Replace the `if` with a `switch` that handles every action:

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
    bool running = true;

    while (running) {
        std::cout << renderMap(map, player);
        std::cout << "Move (W/A/S/D, H for help, Q to quit): ";
        Action action = readAction(std::cin);

        switch (action) {
            case Action::Up:
                player.move(0, -1);
                break;
            case Action::Down:
                player.move(0, 1);
                break;
            case Action::Left:
                player.move(-1, 0);
                break;
            case Action::Right:
                player.move(1, 0);
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
    }

    std::cout << "Goodbye!" << std::endl;
    return 0;
}
```

- A `switch` works on an `enum` too. Each label names one value, such as `case Action::Up:`.
- The two numbers in `player.move(dx, dy)` say how far to move across and down. Left is `-1` in `x`, and Right is `+1`. Rows are counted from the **top**, so Up makes `y` **smaller**: `move(0, -1)`.
- `break;` leaves the `switch`. Without it, the program would fall through into the next label's code too. That is a classic bug.
- In `parseAction` you didn't need `break`, because `return` already left the function.
- `case Action::None: break;` does nothing on purpose. Listing every action means a missing one stands out.
- `Action::Help` calls `showHelp()` from lesson 1.2, and so uses the action you added in lesson 3.1.

```predict
question: The hero starts at (1, 1). You press W once. Where is the hero now?
choice: (1, 0)
choice: (1, 2)
choice: (0, 1)
answer: (1, 0)
explain: W is Up, which is move(0, -1). Rows are counted down from the top, so going up makes y smaller: 1 + -1 = 0.
```

Build and run the game, and press `W` then Enter. The `@` jumps into the top wall row. Nothing stops it. Try walking around a bit, then press `Q`.

```check
matches main.cpp "switch\s*\(\s*action\s*\)" -- Use switch (action) { ... } to handle each action.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp -o game" label="the project builds" -- Build the six .cpp files together and fix the errors shown. Every case needs a break; at the end.
run "./game" stdin="d\nq\n" stdout="#.@......#" label="D moves the hero right" -- Right should call player.move(1, 0);
run "./game" stdin="s\nq\n" stdout="#........#\n#@.####..#" label="S moves the hero down" -- Down should call player.move(0, 1); and end with break;
run "./game" stdin="a\nq\n" stdout="@........#" label="A moves the hero left, into the wall" -- Left should call player.move(-1, 0);
run "./game" stdin="w\nq\n" stdout="#@########" label="W moves the hero up, into the wall" -- Up should call player.move(0, -1). Rows count from the top, so up makes y smaller.
run "./game" stdin="h\nq\n" stdout="Q to quit): Use W, A, S, D to move." label="H shows the help" -- Help should call showHelp(); and end with break;
```

## Your turn: count the steps

A game likes to keep score of what you did. Make the hero remember how many times it has moved:

- `Player` gets a function `int getSteps() const` that returns the count. It starts at `0`.
- Every call to `move` adds `1` to the count. Taking damage does not.
- `main.cpp` prints one line, `Steps: ` followed by the count, **directly after the line that draws the map**, on every pass of the loop.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_steps.cpp provided
#include "minitest.h"
#include "../player.h"

TEST(StepsTest, StartsAtZero) {
    Player p(0, 0);
    EXPECT_EQ(p.getSteps(), 0);
}

TEST(StepsTest, EachMoveAddsOne) {
    Player p(5, 5);
    p.move(1, 0);
    p.move(0, -1);
    p.move(-1, 0);
    EXPECT_EQ(p.getSteps(), 3);
}

TEST(StepsTest, MoveStillChangesPosition) {
    Player p(5, 5);
    p.move(2, -3);
    EXPECT_EQ(p.getX(), 7);
    EXPECT_EQ(p.getY(), 2);
}

TEST(StepsTest, DamageIsNotAStep) {
    Player p(5, 5);
    p.takeDamage(3);
    EXPECT_EQ(p.getSteps(), 0);
}
```

Your changes go in `player.h`, `player.cpp` and `main.cpp`. Don't change the tests. The tests use only `Player`, so build them from the test file and `player.cpp`:

```
g++ -std=c++17 tests/test_steps.cpp player.cpp -o test_steps
./test_steps
```

```check
run "g++ -std=c++17 tests/test_steps.cpp player.cpp -o test_steps" label="the step tests build" -- Declare int getSteps() const; in player.h and define it in player.cpp.
tests "./test_steps" label="Steps are counted" -- A test failed. Read which one. Does steps start at 0, and does only move add to it?
run "g++ -std=c++17 tests/test_player.cpp player.cpp -o test_player" label="the position tests still build" -- Fix the compiler errors shown.
tests "./test_player" label="Position tests still pass" -- Your changes broke the position tests. Check the constructor still sets x and y.
run "g++ -std=c++17 tests/test_health.cpp player.cpp -o test_health" label="the health tests still build" -- Fix the compiler errors shown.
tests "./test_health" label="Health tests still pass" -- Your changes broke the health tests. Check health still starts at 10.
run "g++ -std=c++17 main.cpp game.cpp input.cpp map.cpp player.cpp render.cpp -o game" label="the whole project builds" -- Build all six .cpp files together and fix the errors shown.
run "./game" stdin="q\n" stdout="##########\nSteps: 0\nMove" label="the Steps line follows the map" -- Print Steps: and player.getSteps() on its own line, right after the line that prints renderMap(map, player).
run "./game" stdin="d\nd\nq\n" stdout="Steps: 2" label="each move adds a step" -- Add 1 to the count inside Player::move.
```

```hints
nudge: Which function runs every time the hero moves? That is where the counting belongs.
concept: steps is another private int, like health. It is set to 0 in the constructor's initializer list, move adds 1 to it, and getSteps returns it, just as getX returns x.
shape: Add int steps; after health in the private section, declare getSteps, add steps(0) at the end of the initializer list, put steps++; inside move, and print the line in main right after renderMap.
answer: In player.h, add to the public section and the private section:
~~~cpp
    int getSteps() const;
~~~
~~~cpp
    int steps;
~~~
In player.cpp, change the constructor and move, and add getSteps:
~~~cpp
Player::Player(int startX, int startY) : x(startX), y(startY), health(10), steps(0) {}

int Player::getSteps() const { return steps; }

void Player::move(int dx, int dy) {
    x += dx;
    y += dy;
    steps++;
}
~~~
In main.cpp, add this line right after the line that prints renderMap(map, player):
~~~cpp
std::cout << "Steps: " << player.getSteps() << std::endl;
~~~
```
