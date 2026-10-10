---
title: 1.2 — Header Files
runtime: none
---

`main.cpp` will get crowded fast. In this lesson you move the menu code out into its own pair of files, `game.h` and `game.cpp`, and call it from `main.cpp`. This is the pattern for the rest of the project.

## Why two files?

C++ splits a piece of code into two parts:

- A **declaration** says that a function exists, and what it takes and returns. Example: `void showTitle();`. It is the promise.
- A **definition** is the function's body, the code that runs. It is the delivery.

A **header file** (`.h`) holds declarations. A **source file** (`.cpp`) holds definitions. Any file that wants to call the function includes the header.

## Declare the functions in game.h

Create `game.h`:

```cpp file=game.h
#pragma once

void showTitle();
void showMenu();
```

- `#pragma once` tells the compiler to read this file only once, even if several files include it. Without it, including the header twice would declare everything twice and cause errors.
- `void showTitle();` declares a function named `showTitle`. `void` means it gives back nothing. The empty `()` means it takes nothing. The semicolon ends the declaration. There is no body here.

```check
file game.h -- Create a file called game.h in the project folder.
contains game.h "#pragma once" -- Start the header with #pragma once.
matches game.h "void\s+showTitle\s*\(\s*\)\s*;" -- Declare void showTitle(); with a semicolon and no body.
matches game.h "void\s+showMenu\s*\(\s*\)\s*;" -- Declare void showMenu(); with a semicolon and no body.
```

## Define the functions in game.cpp

Create `game.cpp`. The printing code you wrote in `main.cpp` moves here:

```cpp file=game.cpp
#include <iostream>
#include "game.h"

void showTitle() {
    std::cout << "Welcome to Dungeon Dash!" << std::endl;
}

void showMenu() {
    std::cout << "1. Start" << std::endl;
    std::cout << "2. Quit" << std::endl;
    std::cout << "3. Help" << std::endl;
}
```

- `#include <iostream>` is needed because this file now uses `std::cout`.
- `#include "game.h"` uses double quotes, which means "a header from this project, not from the standard library". Including your own header lets the compiler check that the definitions match the declarations.
- `void showTitle() { ... }` is the definition: the same name and signature as the declaration, but with a body in braces.

You can compile just this one file to check it, without making a program yet. `-c` means "compile only": it writes `game.o`, an **object file** holding the compiled functions, and stops there.

```
g++ -std=c++17 -c game.cpp -o game.o
```

```check
file game.cpp -- Create a file called game.cpp in the project folder.
contains game.cpp "#include \"game.h\"" -- Include your own header with #include "game.h" (double quotes).
run "g++ -std=c++17 -c game.cpp -o game.o" label="game.cpp compiles" -- Fix the compiler errors shown. The function names must match game.h exactly.
```

## Call them from main.cpp

Now `main.cpp` shrinks to two calls:

```cpp file=main.cpp
#include "game.h"

int main() {
    showTitle();
    showMenu();
    return 0;
}
```

`showTitle();` calls the function, which runs its body and then comes back. `main.cpp` doesn't need `<iostream>` any more because it prints nothing itself.

There are now two `.cpp` files, so the compiler needs both. Each `.cpp` file is compiled separately, then the **linker** joins the results into one program. Build and run it:

```
g++ -std=c++17 main.cpp game.cpp -o game
./game
```

```predict
question: Suppose main.cpp includes game.h and calls showTitle(), but you compile only main.cpp and forget game.cpp. What happens?
choice: A linker error: showTitle is declared but has no definition
choice: A compiler error: showTitle is not declared
choice: It runs and prints nothing
answer: A linker error: showTitle is declared but has no definition
explain: The header is enough to keep the compiler happy, because it has seen the promise. The linker then looks for the body, finds none, and stops. Try it: g++ -std=c++17 main.cpp -o game
```

```check
lacks main.cpp "std::cout" -- main.cpp should no longer print anything itself. Move the printing into game.cpp.
contains main.cpp "#include \"game.h\"" -- Include game.h in main.cpp.
run "g++ -std=c++17 main.cpp game.cpp -o game" label="the project builds" -- Build both .cpp files together. Check the names match between game.h, game.cpp and main.cpp.
run "./game" stdout="Welcome to Dungeon Dash!" label="the title still prints" -- Call showTitle() from main.
run "./game" stdout="3. Help" label="the menu still prints" -- Call showMenu() from main.
```

## Your turn: a help screen

Add a third function, `showHelp`, to the project:

- It takes nothing and returns nothing, like the other two.
- It prints exactly this line: `Use W, A, S, D to move.`
- `main` calls it **after** `showMenu();`.

Remember both halves: a declaration in the header and a definition in the source file.

```check
matches game.h "void\s+showHelp\s*\(\s*\)\s*;" -- Declare void showHelp(); in game.h.
run "g++ -std=c++17 main.cpp game.cpp -o game" label="the project builds" -- Build both .cpp files together and fix the errors shown.
run "./game" stdout="Use W, A, S, D to move." label="the help line prints" -- showHelp should print exactly: Use W, A, S, D to move.
matches main.cpp "showMenu\(\);[\s\S]*showHelp\(\);" label="showHelp is called after showMenu" -- Call showHelp(); in main.cpp after showMenu();
```

```hints
nudge: Which two files need to know that showHelp exists? Which one needs its body?
concept: The header holds the declaration (the promise). The .cpp file holds the definition (the body). main.cpp just calls it.
shape: Copy how showTitle is handled in all three files, and change the name and the printed text.
answer: In game.h, add the declaration:
~~~cpp
void showHelp();
~~~
In game.cpp, add the definition:
~~~cpp
void showHelp() {
    std::cout << "Use W, A, S, D to move." << std::endl;
}
~~~
In main.cpp, add the call after showMenu():
~~~cpp
showHelp();
~~~
```
