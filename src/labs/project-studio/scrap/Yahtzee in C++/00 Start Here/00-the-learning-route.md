---
title: 0.0 — A project you can explain
track: Start here — one file before classes
runtime: cpp
console: true
run: ready.cpp
teaches: terminal, source, executable, learning route
experiments: Predict, trace, change, check
---

### The story so far

You can read variables, if statements and loops in another language. C++ is new. We will use Yahtzee to learn how values, memory and program structure work.

### What this lesson builds

Choose a folder, find the compiler, and make a small program that proves your tools work. The first game will stay in one file.

## Choose the starting point {#step-1}

**Build:** your own project folder. In desktop Project Studio choose **Choose folder…**, create an empty folder named yahtzee, and select it. In the terminal run `pwd` (PowerShell: `Get-Location`) and check that it is this folder.

The **editor** changes source text. The **terminal** runs commands. A **compiler** translates C++ source into an executable; saving text alone does not run or compile it. Type `g++ --version`. If the command is missing, use Project Studio's C++ compiler installation control, then reopen the terminal. On macOS, an installed clang++ also works; use that name in place of g++ consistently.

In a browser you can read everything, but checks and the editor need the desktop app. Browser readers can follow with their own editor and terminal. Commands below use forward-slash paths and `./lesson`; on Windows, invoke the generated lesson.exe if necessary.

```check
run "g++ --version" label="The C++ compiler starts"
```

## Follow the concepts in order {#step-2}

**Understand:** the program will earn its structure.

| A problem you can see | What we add when needed |
|---|---|
| We need to calculate points | Values, conditions, loops and functions in main.cpp |
| A helper changes only its copy | A reference, with an explicit mutation contract |
| A selection can be absent or change targets | A pointer, checked before dereferencing |
| One source file has several jobs | Shared declarations in .h files and separately compiled definitions |
| An integer can hold an impossible die face | A class whose operations protect valid state |
| Two players need separate records | Value-owned scorecards and borrowed views |

The opening side labs live in scratch so you can break an example without breaking the game. Later chapters develop full scoring, turns, players and replay. Finish and Explain closes the Joker rules and tests the whole application.

**Module** here means a part with one responsibility, often a .h/.cpp pair. C++20 also has language modules using import. This C++17 course teaches headers and separate compilation first; the mechanisms are different.

> **Engineer:** add an abstraction when you can name the problem it solves. A class or extra file is not automatically an improvement.

## Learn by leaving evidence {#step-3}

Each step uses **Build** for the change, **Understand** for what happens with real values, and **Engineer** for the reason to choose that design. A green check is evidence of behavior, not a certificate of understanding.

Predict before executing. Trace the actual result. In **Your turn**, the required behavior and tests are given, but the implementation is yours. Hints reveal one rung at a time. Optional challenges live in separate scratch files. The Next button is never a mastery gate; return to unfinished work before claiming the milestone.

```predict
question: You save new source but run yesterday's executable. Which code runs?
choice: Yesterday's compiled code
choice: The newest text in the editor
answer: Yesterday's compiled code
explain: An executable is a separate file. Compiling is the step that turns source changes into a new executable.
```

## Read a complete tiny program first {#first-program}

Before writing an independent program, type this small worked example in scratch/welcome.cpp.

```cpp file=scratch/welcome.cpp
#include <iostream>
int main() {
    std::cout << "Hello, dice" << '\n';
    return 0;
}
```

Read it from the outside in. `#include <iostream>` makes standard stream declarations available to the compiler. `int main()` defines the function where this program begins: `int` is its integer result type and the empty parentheses mean no named parameters here. Braces enclose the statements that belong to it. `std::cout` names the standard output stream; `std::` selects a name from the standard-library namespace. `<<` sends the value on its right to that stream. Double quotes surround text; `'\n'` is one newline character. A semicolon ends a statement. `return 0;` ends main and reports success to the operating system; it does not print 0.

Build with `g++ -std=c++17 scratch/welcome.cpp -o welcome`, then run `./welcome`. `g++` names the compiler, `-std=c++17` selects the language version, the .cpp path is the source input, and `-o welcome` names the executable output. On Windows the output may be welcome.exe. Saving source and building an executable are separate actions.

```check
run "g++ -std=c++17 scratch/welcome.cpp -o welcome" label="Build the worked example"
run "./welcome" stdout="Hello, dice" label="The worked example prints its greeting"
```

Change the greeting, save, rebuild and run again. Explain why running without rebuilding still prints the previous greeting. Restore the shown text before checking this step. Now make your own greeting program in the next step.

## Your turn — Prove your tools work {#step-4}

Create ready.cpp containing a main function that prints `Ready to build Yahtzee` and returns success. Use the worked example above to choose the include, entry function, output statement and success result. The hints are available after your own attempt.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic ready.cpp -o ready" label="Build ready" -- Save the changed source, then read the first compiler diagnostic.
run "./ready" stdout="Ready to build Yahtzee" label="Observe the result"
```

```hints
nudge: The compiler needs an entry function named main.
concept: Include iostream to declare std::cout. A successful program returns 0.
shape: Use int main() { std::cout << "Ready to build Yahtzee\n"; return 0; } below #include <iostream>.
```
