---
title: 0.8 — Split the working game: why headers exist
runtime: none
teaches: declaration, definition, header, translation unit, linking, include guard
experiments: Predict, trace, change, check
---

### The story so far

single_file.cpp is the complete practice turn. main.cpp still contains both scoring and terminal interaction. We can now separate those responsibilities while keeping behavior.

### What this lesson builds

Move sixPoints into its own source, share its declaration through a header, and reproduce both compiler and linker errors.

## First preserve the working game {#step-1}

**Build:** preserve the last working single-file program. This snapshot is supplied as a backup, not a second implementation to type. Keep your own equivalent version if you already saved it.

```cpp file=single_file.cpp provided
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string>

int sixPoints(int face) {
    if (face == 6) return 6;
    return 0;
}

bool readChoice(int low, int high, int& choice) {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream input(line);
        int candidate = 0;
        char extra = ' ';
        if ((input >> candidate) && !(input >> extra)
            && candidate >= low && candidate <= high) {
            choice = candidate;
            return true;
        }
        std::cout << "Enter a whole number from " << low << " to " << high << ": ";
    }
    return false;
}

int main() {
    std::srand(7);
    int dice[5] = {};
    bool held[5] = {};
    for (int roll = 1; roll <= 3; ++roll) {
        for (int i = 0; i < 5; ++i) {
            if (!held[i]) dice[i] = std::rand() % 6 + 1;
        }
        std::cout << "Roll " << roll << ":";
        for (int i = 0; i < 5; ++i) std::cout << " " << dice[i];
        std::cout << '\n';
        if (roll == 3) break;
        int again = 0;
        std::cout << "Roll again? (0=no, 1=yes): ";
        if (!readChoice(0, 1, again)) return 1;
        if (again == 0) break;
        for (int i = 0; i < 5; ++i) {
            int keep = 0;
            std::cout << "Keep die " << i + 1 << "? (0/1): ";
            if (!readChoice(0, 1, keep)) return 1;
            held[i] = keep == 1;
        }
    }
    int score = 0;
    for (int i = 0; i < 5; ++i) {
        score += sixPoints(dice[i]);
    }
    std::cout << "\nSixes score: " << score << '\n';
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic single_file.cpp -o single_file" label="Build single_file" -- Save the changed source, then read the first compiler diagnostic.
run "./single_file" stdin="0\n" stdout="Sixes score:" label="Observe the result"
```

A **refactor** changes structure without changing behavior. The backup lets us compare the old and new program with the same seeded sequence and input. Compile it on its own; never link its main into the new game.

## Give callers the declaration {#step-2}

**Build:** create points.h. It tells other source files how to call the function without repeating its implementation.

A **declaration** introduces the name and type: sixPoints accepts int and returns int. A **definition** supplies the body. A header is a source-text file included during preprocessing; it is not a program that runs first. `.h` is a convention.

```cpp file=points.h
#ifndef YAHTZEE_POINTS_H
#define YAHTZEE_POINTS_H

int sixPoints(int face);

#endif
```

**Understand:** #ifndef tests whether a preprocessor name has been defined. #define sets it; #endif closes the conditional. Including this header twice in one translation unit includes the declaration text once. A **translation unit** is one source file after its includes are processed. Each separately compiled .cpp starts its own preprocessing state.

Headers can also contain class definitions, templates and inline definitions. They are not restricted to declarations. Our ordinary non-inline function will have one program-wide definition in points.cpp.

```check
file points.h
```

## Give the linker one definition {#step-3}

**Build:** move the known function body into points.cpp. Include our own header to let the compiler detect a mismatched signature.

```cpp file=points.cpp
#include "points.h"

int sixPoints(int face) {
    if (face == 6) return 6;
    return 0;
}
```

The quoted include searches relative to this source file first. Standard-library headers conventionally use angle brackets. At this checkpoint main.cpp still has its old definition, so compile points.cpp to an object only; do not link both copies yet. `-c` stops before linking. The resulting .o contains compiled code and references to be resolved later.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic -c points.cpp -o points.o" label="The definition compiles independently"
```

## Use the declaration from a different source {#step-4}

**Build:** replace the old function body in main.cpp with its header include. The loop still calls sixPoints exactly as before.

```cpp file=main.cpp
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string>

#include "points.h"

bool readChoice(int low, int high, int& choice) {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream input(line);
        int candidate = 0;
        char extra = ' ';
        if ((input >> candidate) && !(input >> extra)
            && candidate >= low && candidate <= high) {
            choice = candidate;
            return true;
        }
        std::cout << "Enter a whole number from " << low << " to " << high << ": ";
    }
    return false;
}

int main() {
    std::srand(7);
    int dice[5] = {};
    bool held[5] = {};
    for (int roll = 1; roll <= 3; ++roll) {
        for (int i = 0; i < 5; ++i) {
            if (!held[i]) dice[i] = std::rand() % 6 + 1;
        }
        std::cout << "Roll " << roll << ":";
        for (int i = 0; i < 5; ++i) std::cout << " " << dice[i];
        std::cout << '\n';
        if (roll == 3) break;
        int again = 0;
        std::cout << "Roll again? (0=no, 1=yes): ";
        if (!readChoice(0, 1, again)) return 1;
        if (again == 0) break;
        for (int i = 0; i < 5; ++i) {
            int keep = 0;
            std::cout << "Keep die " << i + 1 << "? (0/1): ";
            if (!readChoice(0, 1, keep)) return 1;
            held[i] = keep == 1;
        }
    }
    int score = 0;
    for (int i = 0; i < 5; ++i) {
        score += sixPoints(dice[i]);
    }
    std::cout << "\nSixes score: " << score << '\n';
    return 0;
}
```

**Understand:** main.cpp compiles using the declaration. points.cpp compiles using the definition. Linking both joins the call to its body. The header does not copy the .cpp into its callers, and should never contain `#include "points.cpp"`.

```predict
question: Compile and link main.cpp alone now. Which stage fails?
choice: Linking — sixPoints has no linked definition
choice: Compilation — the declaration is missing
answer: Linking — sixPoints has no linked definition
explain: points.h makes the call type-check. points.cpp must still contribute the actual function body.
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp points.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdin="0\n" stdout="Sixes score:" label="Observe the result"
```

## Build the two stages yourself {#step-5}

Run these commands separately from the project root:

```bash
g++ -std=c++17 -c main.cpp -o main.o
g++ -std=c++17 -c points.cpp -o points.o
g++ main.o points.o -o lesson
./lesson
```

Changing only points.cpp means rebuilding points.o and relinking. Changing points.h means recompiling every source that includes it, directly or indirectly. Build tools later automate that dependency tracking.

> **Engineer:** separate files express dependencies. A header should expose what callers need, not all the implementation detail you can fit into it.

```check
run "g++ -std=c++17 -c main.cpp -o main.o"
run "g++ -std=c++17 -c points.cpp -o points.o"
run "g++ main.o points.o -o lesson"
run "./lesson" stdin="0\n" stdout="Sixes score:" label="Observe the result"
```

## Try it — Three errors with different causes {#step-6}

Remove the points.h include from main.cpp: compiling cannot see the declaration. Restore it. Link only main.o: the linker cannot find the body. Restore points.o to the command. Finally, on paper put the same non-inline body in the header and points.cpp: the definition would be duplicated. Guards do not solve multiple definitions in separate translation units.

Finish by rebuilding the valid two-file program. Compare it with single_file for the same answers. The lesson checks run both; explain why equal observed behavior matters more than how many files we have.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp points.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdin="0\n" stdout="Sixes score:" label="Observe the result"
```

## Read the acceptance cases {#acceptance-cases}

**Build:** provide a new rule through a header and implementation. The consumer deliberately includes the header twice; a class definition added later would need the same guard discipline. The test needs only the declaration to compile, then your source supplies the body at link time.

```cpp file=tests/header_consumer.cpp provided
#include "../practice/pair.h"
#include "../practice/pair.h"
#include <iostream>
int main() {
    if (pairPoints(4, 4) != 8 || pairPoints(2, 5) != 0 || pairPoints(1, 1) != 2) return 1;
    std::cout << "PASS: header_consumer\n";
    return 0;
}
```

## Your turn — Split your pair rule {#step-7}

Create practice/pair.h with a guard and the declaration `int pairPoints(int first, int second);`. Create practice/pair.cpp with the implementation from lesson 0.3 and an include of its own header. The supplied consumer must build using only the public header and link against the implementation.

This is your earlier code in a different organization. Explain where each name becomes known and where its instructions come from.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/header_consumer.cpp practice/pair.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: header_consumer" label="Observe the result"
```

```hints
nudge: Start by moving the body you already tested.
concept: The header declares the call; the source defines it. Including the implementation would defeat separate compilation.
shape: Put the guard around the declaration. Include pair.h in pair.cpp and write the ordinary function body below it. Compile both .cpp files, not the header.
```
