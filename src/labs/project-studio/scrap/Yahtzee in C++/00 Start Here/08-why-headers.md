---
title: Why .h files exist — split a function before a class
track: Start here — one file before classes
runtime: none
---

Move a known function into a separate translation unit and distinguish a compiler error from a linker error.

## First preserve the working game

Copy main.cpp to single_file.cpp. Compile single_file.cpp alone and play once. Now make a tiny independent build in scratch so we can study file boundaries without changing the game.

A **declaration** gives the compiler a function name, parameter types and return type. A **definition** supplies its body. Until now, putting the definition above main gave the compiler both at once. The compiler cannot guess a function's signature from another source file.

## Give callers the declaration

Create scratch/points.h. The extension `.h` is a convention, not special execution behavior. This header contains the common declaration that callers and the implementation must agree on.

```cpp file=scratch/points.h
#ifndef YAHTZEE_POINTS_H
#define YAHTZEE_POINTS_H

int sixPoints(int face);

#endif
```

The include guard prevents repeated inclusion within one translation unit. A translation unit is a source file after preprocessing includes. The guard is not a program-wide switch and does not prevent multiple definitions across separate source files.

## Give the linker one definition

```cpp file=scratch/points.cpp
#include "points.h"

int sixPoints(int face) {
    if (face == 6) return 6;
    return 0;
}
```

Including our own header catches a mismatched definition early. Quoted includes search relative to the including file first. Standard library headers conventionally use angle brackets. Headers can contain type definitions and templates too; they are not restricted to function declarations.

## Use the declaration from a different source

```cpp file=scratch/header_main.cpp
#include <iostream>
#include "points.h"

int main() {
    std::cout << "Points: " << sixPoints(6) << '\n';
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/header_main.cpp scratch/points.cpp -o intro_check" label="Compile the example"
run "./intro_check" stdout="Points: 6" label="Observe the result"
```

```predict
question: What happens if you compile and link header_main.cpp alone?
choice: Linking fails because sixPoints has no linked definition
choice: It runs because the header contains the implementation
answer: Linking fails because sixPoints has no linked definition
explain: The declaration allows compilation. points.cpp supplies the body needed at link time.
```

## Build the two stages yourself

Run these commands from the project root:

```bash
g++ -std=c++17 -c scratch/header_main.cpp -o scratch/header_main.o
g++ -std=c++17 -c scratch/points.cpp -o scratch/points.o
g++ scratch/header_main.o scratch/points.o -o header_demo
./header_demo
```

`-c` stops before linking. An object file contains compiled code and references the linker must resolve. Rebuild points.o after changing points.cpp, then relink. Changing points.h may require rebuilding both objects. Never include points.cpp from the caller or compile the header as an additional source.

## Try it — Three errors with different causes

Remove the include from header_main.cpp: compilation cannot find the declaration. Restore it and omit points.cpp from the combined build: linking cannot find the definition. Finally put a non-inline function body in the header while retaining its body in points.cpp: the duplicate definition is an error. Restore the declaration-only header and rebuild successfully. Templates and inline functions have different definition rules; do not use them just to hide a mistaken file split.

## Your turn — Explain and change it

Split pointsFor(int face, int wanted) into these files instead. Make two callers in separate source files, only one with main, and call the rule from both. Verify 6/6 gives 6 and 3/6 gives 0.

```hints
nudge: Which file needs the body, and which files only need the signature?
concept: A header shares declarations; linking supplies the single ordinary function definition.
shape: Declare in points.h, define in points.cpp, include the header from both callers, and compile all three source files.
```
