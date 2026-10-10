---
title: 2.1 — The Grid
track: The Map
runtime: none
---

The hero needs a world to walk around in. In **Dungeon Dash** the world is a **grid**: rows of characters, where `#` is a wall and `.` is open floor. In this lesson you store a small grid in memory and print it.

The player demo you wrote in lesson 1.3 has done its job, so you will replace it as you go. Your `player.h` and `player.cpp` stay in the project, because the hero comes back in lesson 2.3.

Build and run the game the same way as in chapter 1, after each step:

```
g++ -std=c++17 main.cpp game.cpp player.cpp -o game
./game
```

## Store one row

A row of the map is text, so it fits in a `std::string`: an ordered sequence of characters. Replace the player lines in `main.cpp` with a row:

```cpp file=main.cpp
#include <iostream>
#include <string>
#include "game.h"
#include "player.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    std::string row = "#....#";
    std::cout << row << std::endl;

    return 0;
}
```

- `#include <string>` brings in the `std::string` type.
- `std::string row = "#....#";` creates a variable named `row` that holds six characters: a wall, four floor tiles, and another wall.
- `std::cout << row` prints all six characters in one go.

```check
contains main.cpp "#include <string>" -- Add #include <string> at the top so std::string is available.
run "g++ -std=c++17 main.cpp game.cpp player.cpp -o game" label="the project builds" -- Build the three .cpp files together and fix the errors shown.
run "./game" stdout="#....#" label="the game prints the row" -- Create the row with std::string row = "#....#"; and print it with std::cout.
```

## Many rows: a vector of strings

One row is a line. A map is many rows stacked up. C++ has a type for "a list of things of the same type": `std::vector`. A `std::vector<std::string>` is a list where every item is a `std::string`. Replace the single row with a whole grid:

```cpp file=main.cpp
#include <iostream>
#include <string>
#include <vector>
#include "game.h"
#include "player.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    std::vector<std::string> grid = {
        "######",
        "#....#",
        "#....#",
        "######"
    };

    for (const std::string& line : grid) {
        std::cout << line << std::endl;
    }

    return 0;
}
```

- `#include <vector>` brings in `std::vector`.
- The text between the braces `{ ... }` is the starting contents of the vector: four strings, separated by commas, in order. The first string is the top row.
- `for (const std::string& line : grid)` is a **range-based for loop**. It runs the body once for each item in `grid`, from first to last. Each time round, `line` is that item.
- `std::string&` means `line` is a **reference**: another name for the string already inside `grid`, not a copy of it. `const` promises the loop won't change it. Together, `const std::string&` means "look at each row without copying it and without altering it".

```check
contains main.cpp "#include <vector>" -- Add #include <vector> at the top.
contains main.cpp "std::vector<std::string> grid" -- Declare the grid as std::vector<std::string> grid.
matches main.cpp "for\s*\(\s*const\s+std::string\s*&\s*\w+\s*:\s*grid\s*\)" -- Loop over the grid with for (const std::string& line : grid).
lacks main.cpp "std::string row" -- The single row is replaced by the grid. Remove the std::string row line.
run "g++ -std=c++17 main.cpp game.cpp player.cpp -o game" label="the project builds" -- Build the three .cpp files together and fix the errors shown.
run "./game" stdout="######\n#....#\n#....#\n######" label="the game prints the whole grid" -- Print every row of the grid, top row first, one per line.
```

## Pick out one tile

A tile has a position `(x, y)`:

- `x` counts **columns**, from the left.
- `y` counts **rows**, from the top.
- Both start at `0`, so the top-left tile is `(0, 0)`. Moving down makes `y` bigger.

To read one tile, first pick the row, then the character in it. Add this after the loop:

```cpp file=main.cpp
#include <iostream>
#include <string>
#include <vector>
#include "game.h"
#include "player.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    std::vector<std::string> grid = {
        "######",
        "#....#",
        "#....#",
        "######"
    };

    for (const std::string& line : grid) {
        std::cout << line << std::endl;
    }

    int x = 2;
    int y = 1;
    char tile = grid[y][x];
    std::cout << "Tile at (" << x << ", " << y << ") is " << tile << std::endl;

    return 0;
}
```

- `grid[y]` is the row at index `y`: a `std::string`.
- `[x]` on that string is the character at index `x`: a `char`, a single character.
- So `grid[y][x]` reads **row first, then column**. That is the opposite order from how we write `(x, y)`. It is the most common slip with grids.

```predict
question: What does the variable tile hold?
choice: a wall, #
choice: a floor, .
answer: a floor, .
explain: grid[1] is the second row, "#....#". Counting from 0, index 0 is '#', index 1 is '.', and index 2 is '.'.
```

```check
contains main.cpp "grid[y][x]" -- Read the tile with grid[y][x]: row first, then column.
run "g++ -std=c++17 main.cpp game.cpp player.cpp -o game" label="the project builds" -- Build the three .cpp files together and fix the errors shown.
run "./game" stdout="Tile at (2, 1) is ." label="the game prints the tile at (2, 1)" -- Set x to 2 and y to 1, read grid[y][x], and print it after the label text.
```

## How big is the grid?

Later code will need the grid's size. The number of rows is the number of items in the vector. The number of columns is the length of one row. Add both after the tile line:

```cpp file=main.cpp
#include <iostream>
#include <string>
#include <vector>
#include "game.h"
#include "player.h"

int main() {
    showTitle();
    showMenu();
    showHelp();

    std::vector<std::string> grid = {
        "######",
        "#....#",
        "#....#",
        "######"
    };

    for (const std::string& line : grid) {
        std::cout << line << std::endl;
    }

    int x = 2;
    int y = 1;
    char tile = grid[y][x];
    std::cout << "Tile at (" << x << ", " << y << ") is " << tile << std::endl;

    int height = static_cast<int>(grid.size());
    int width = static_cast<int>(grid[0].size());
    std::cout << "Rows: " << height << std::endl;
    std::cout << "Columns: " << width << std::endl;

    return 0;
}
```

- `grid.size()` is the number of items in the vector. Its type is `std::size_t`, a whole number that can never be negative.
- Our other numbers are `int`, which can be negative. Mixing the two kinds in comparisons causes surprises, so `static_cast<int>(...)` converts the size into a plain `int` on purpose.
- `grid[0].size()` is the length of the first row's string: the number of columns. This assumes every row is the same length.
- The **last** row has index `height - 1`, not `height`, because counting starts at 0.

```predict
question: What number does the "Columns" line print?
answer: 6
explain: Each row, such as "######", has six characters, so grid[0].size() is 6.
```

```check
matches main.cpp "int\s+height\s*=\s*static_cast<int>\(\s*grid\.size\(\)\s*\)" -- Set int height = static_cast<int>(grid.size());
matches main.cpp "int\s+width\s*=\s*static_cast<int>\(\s*grid\[0\]\.size\(\)\s*\)" -- Set int width = static_cast<int>(grid[0].size());
run "g++ -std=c++17 main.cpp game.cpp player.cpp -o game" label="the project builds" -- Build the three .cpp files together and fix the errors shown.
run "./game" stdout="Rows: 4\nColumns: 6" label="the game prints the grid's size" -- Print Rows: then the height, and on the next line Columns: then the width.
```

## Your turn: a bigger grid and its corner

Do two things in `main.cpp`:

1. Replace the grid with one that is **8 columns wide and 5 rows tall**. The outer ring is `#`. Everything inside is `.`.
2. After the `Columns` line, print one more line: `Bottom-right corner: ` followed by the tile in the bottom-right corner. Get it by using `height` and `width` in the indexes. Don't type the numbers 4 and 7.

Counting starts at 0, and the row index comes first.

```check
run "g++ -std=c++17 main.cpp game.cpp player.cpp -o game" label="the project builds" -- Build the three .cpp files together and fix the errors shown.
run "./game" stdout="########\n#......#\n#......#\n#......#\n########" label="the game prints the 8 by 5 grid" -- The grid needs 5 rows: a row of 8 #, three rows like #......#, then another row of 8 #.
run "./game" stdout="Rows: 5\nColumns: 8\nBottom-right corner: #" label="the game prints the bottom-right corner" -- After the Columns line, print Bottom-right corner: followed by the tile at the last row and last column.
lacks main.cpp "[4][7]" -- Don't type the numbers. Work the position out from height and width.
```

```hints
nudge: In a grid with 5 rows, what is the index of the last row? What about the last column in a row of 8?
concept: The last valid index is always the size minus 1. The row index goes in the first brackets and the column index in the second.
shape: Declare a char variable with grid[height - 1][width - 1], then print it after the label text.
answer: Add these lines after the Columns line:
~~~cpp
char corner = grid[height - 1][width - 1];
std::cout << "Bottom-right corner: " << corner << std::endl;
~~~
and use this grid:
~~~cpp
std::vector<std::string> grid = {
    "########",
    "#......#",
    "#......#",
    "#......#",
    "########"
};
~~~
```
