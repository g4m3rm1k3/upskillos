---
title: 1.1 — Hello, Game
track: Getting Started
runtime: none
---

In this lesson you write the first few lines of **Dungeon Dash**, a game that runs in the console (a text-only window). By the end it prints a title and a small menu. Every later lesson grows this same project.

You will need a folder for the project and a code editor. Create `main.cpp` inside the folder as you go.

## Write the first program

Every C++ program starts running at a function called `main`. Put this in `main.cpp`:

```cpp file=main.cpp
#include <iostream>

int main() {
    std::cout << "Welcome to Dungeon Dash!" << std::endl;
    return 0;
}
```

What each line does:

- `#include <iostream>` copies in the standard library's description of input and output. Without it the compiler doesn't know what `std::cout` is. The angle brackets `< >` mean "a header that comes with C++".
- `int main()` defines the function the program starts in. `int` means it gives back a whole number when it finishes.
- `std::cout` is the console's output stream. `<<` pushes a value into it. The text `"Welcome to Dungeon Dash!"` is a string literal, which has the type `const char[25]`: a fixed array of characters, the 24 you can see plus an invisible end marker.
- `std::endl` ends the line and sends the text to the screen.
- `return 0;` hands the number `0` back to the operating system. By convention, `0` means "finished with no error".

Save the file. C++ has to be **compiled** (turned into a program the computer can run) before it runs. In the terminal, compile it, then run the program it made:

```
g++ -std=c++17 main.cpp -o game
./game
```

- `g++` is the compiler. `-std=c++17` picks the version of the C++ language. `main.cpp` is the file to compile.
- `-o game` names the program it writes: `game` (on Windows, `game.exe`).
- `./game` runs that program from the current folder.

```check
file main.cpp -- Create a file called main.cpp in the project folder.
run "g++ -std=c++17 main.cpp -o game" label="main.cpp compiles" -- Fix the compiler errors shown. Check the semicolons and the << operators.
run "./game" stdout="Welcome to Dungeon Dash!" label="the game prints its title" -- Print the exact text Welcome to Dungeon Dash! with std::cout.
```

## Add a menu

A game needs a menu. Add two more lines that print the options:

```cpp file=main.cpp
#include <iostream>

int main() {
    std::cout << "Welcome to Dungeon Dash!" << std::endl;
    std::cout << "1. Start" << std::endl;
    std::cout << "2. Quit" << std::endl;
    return 0;
}
```

Each `std::cout << ... << std::endl;` prints one line. The lines run from top to bottom, in the order you wrote them.

Before you compile and run it, commit to an answer:

```predict
question: How many lines of text does this program print?
answer: 3
explain: There are three std::cout statements, and each one ends with std::endl, so each prints one line.
```

```check
run "g++ -std=c++17 main.cpp -o game" label="main.cpp still compiles" -- Fix the compiler errors shown.
run "./game" stdout="1. Start" label="the menu shows 1. Start" -- Add a line that prints 1. Start.
run "./game" stdout="2. Quit" label="the menu shows 2. Quit" -- Add a line that prints 2. Quit.
```

## Your turn: a third option

Add a third menu line that prints `3. Help`. Put it **after** the `2. Quit` line and before `return 0;`.

```check
run "g++ -std=c++17 main.cpp -o game" label="main.cpp compiles" -- Fix the compiler errors shown. Every statement ends with a semicolon.
run "./game" stdout="3. Help" label="the menu shows 3. Help" -- Add a std::cout line that prints 3. Help, then compile again.
matches main.cpp "2\. Quit[\s\S]*3\. Help" label="3. Help comes after 2. Quit" -- The 3. Help line should come after the 2. Quit line.
```

```hints
nudge: Look at how the "2. Quit" line is written. What would a line for "3. Help" look like?
concept: Each menu line is one statement: std::cout, then <<, then a string in double quotes, then << std::endl, then a semicolon.
shape: Copy the 2. Quit line, paste it just below, and change the text inside the quotes.
answer: The finished main function:
~~~cpp
int main() {
    std::cout << "Welcome to Dungeon Dash!" << std::endl;
    std::cout << "1. Start" << std::endl;
    std::cout << "2. Quit" << std::endl;
    std::cout << "3. Help" << std::endl;
    return 0;
}
~~~
```
