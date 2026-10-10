---
title: 1.1 — First Build
track: One Die
runtime: none
---

In this series you build Yahtzee for the terminal in C++, one small piece per lesson. Every lesson ends with a program that builds and runs. You already know variables, loops and functions from other languages, so these lessons spend their words on what is specific to C++: how a program is built, how it handles memory and copies, and what each keyword promises.

This lesson builds one file that rolls a die and then rolls five. You will meet the compile step, standard library headers and the random number functions.

## Roll one die

Words first:

- **Preprocessor**: a text-processing step that runs before the compiler. It acts on every line that starts with `#`.
- **Header**: a file that lists names (functions, types) that are defined elsewhere, so your code is allowed to use them.
- **Namespace**: a named area for names. `std` is the namespace of the standard library. `std::name` means "the `name` inside `std`".
- **Pointer**: a variable that holds a memory address instead of a value.

Create `main.cpp` in your project folder and type this in.

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    int face = std::rand() % 6 + 1;
    std::cout << "You rolled a " << face << "\n";

    return 0;
}
```

Line by line:

- `#include <cstdlib>`: the preprocessor replaces this line with the whole text of the header `cstdlib`. That header declares `std::rand` and `std::srand`. Angle brackets mean "search the compiler's standard library folders". Without the include, the compiler stops with an error such as `'rand' is not a member of 'std'`.
- `#include <ctime>`: declares `std::time`, which reads the clock.
- `#include <iostream>`: declares `std::cout`, the standard output stream, which is your terminal.
- `int main() {`: the entry point. The operating system starts your program by running this function. `int` is the type of the value it hands back to the operating system.
- `std::time(nullptr)`: returns the current time as a `std::time_t`, an integer type that on most systems counts seconds since 1 January 1970. Its parameter is a pointer. `nullptr` is the pointer that holds no address. Passing it means "do not also store the result at some address, just return it".
- `static_cast<unsigned>(...)`: converts a value to `unsigned`, an integer type that cannot be negative. `std::srand` takes an `unsigned`. The cast makes the conversion visible instead of letting the compiler do it silently.
- `std::srand(...)`: sets the starting point of the random sequence. The same seed always produces the same sequence. The clock gives a different seed on every run.
- `int face = std::rand() % 6 + 1;`: `std::rand()` returns an `int` from 0 up to `RAND_MAX`. The standard guarantees `RAND_MAX` is at least 32767. `% 6` is the remainder after dividing by 6, so it gives 0 to 5. `+ 1` shifts that to 1 to 6. `%` binds tighter than `+`, so the remainder is taken first. Low faces are very slightly more likely, because 32768 does not divide evenly by 6. That is invisible in a dice game.
- `std::cout << "You rolled a " << face << "\n";`: `<<` sends the value on its right into the stream on its left and gives that same stream back. That is why several `<<` can be chained. `"\n"` is a newline. `std::endl` would also flush the output buffer, which is slower and not needed here.
- `return 0;`: status 0 tells the operating system "finished successfully".

Analogy (helper only): the seed is a starting position in one very long, fixed list of random-looking numbers. `srand` picks where to start reading and each `rand` call reads the next number. The same starting position gives the same numbers.

## Build and run it

Open a terminal in your project folder and run:

```bash
g++ -std=c++17 main.cpp -o game
./game
```

- `g++`: the GNU C++ compiler. One command runs three stages: preprocessing, compiling to machine code, and **linking**, which joins pieces of machine code into one program.
- `-std=c++17`: use the 2017 edition of the language, so everyone compiles under the same rules.
- `main.cpp`: the source file to compile.
- `-o game`: name the finished program `game` (Windows adds `.exe`).
- `./game`: run the program that is in the current folder.

```check
file main.cpp
run "g++ -std=c++17 main.cpp -o game" label="main.cpp compiles" -- Read the first error: it gives a line number and what the compiler expected.
run "./game" stdout="You rolled a" label="the program prints a roll" -- Run ./game yourself and compare its output with the text in main.cpp.
```

## Predict: no seed

Commit to an answer first.

```predict
question: You delete the `std::srand` line, rebuild, and run the program three times. What do you see?
choice: A different number each run
choice: The same number every run
choice: A compile error
answer: The same number every run
explain: Without srand the generator starts from the same default seed on every run, so it produces the same sequence. The number itself differs between compilers, but one build repeats it on every run.
```

Now try it: delete the line, rebuild, run three times, then **put the line back**.

## Five dice in an array

Words first:

- **Undefined behavior**: when a program does something the language gives no meaning to, such as reading outside an array, the standard places no requirements on the result. The program may crash, print garbage, or appear to work.

Replace the body of `main` so it fills and prints five dice.

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    const int NUM_DICE = 5;
    int dice[NUM_DICE];

    for (int i = 0; i < NUM_DICE; i++) {
        dice[i] = std::rand() % 6 + 1;
    }

    std::cout << "Dice:";
    for (int i = 0; i < NUM_DICE; i++) {
        std::cout << " " << dice[i];
    }
    std::cout << "\n";

    return 0;
}
```

New lines:

- `const int NUM_DICE = 5;`: `const` means the compiler refuses any later assignment to `NUM_DICE`. A `const int` set from a literal is also a **compile-time constant**, a value the compiler knows while compiling. A plain C++ array needs its size to be one.
- `int dice[NUM_DICE];`: five `int` values stored side by side in memory. The array is a local variable with no initializer, so the five values are leftover bytes until you assign them.
- `dice[i] = ...`: indexes run from 0 to 4. C++ does **not** check them. `dice[5]` compiles and reads memory outside the array, which is undefined behavior.
- `std::cout << " " << dice[i];`: prints a space and then one value. The first loop fills the array and the second prints it.

An array can also be given its values when it is declared:

```cpp
int a[3] = {7, 8, 9};   // a[0] is 7, a[1] is 8, a[2] is 9
int b[3] = {7};         // b[0] is 7, the rest are set to 0
```

```check
run "g++ -std=c++17 main.cpp -o game" label="the program builds"
run "./game" stdout="Dice:" label="five dice are printed" -- Print the word Dice: once, then a space and each value.
```

## Your turn: count the sixes in a fixed hand

Add to `main`, before `return 0;`. Declare a second array named `hand` that holds `3, 1, 6, 6, 2`, and print it as `Hand: 3 1 6 6 2`. Then count how many elements equal 6 and print `Sixes: 2`. The count must come from a loop, not from typing the digit yourself.

```check
run "g++ -std=c++17 main.cpp -o game" label="the program builds" -- Read the first error: it names the line.
run "./game" stdout="Hand: 3 1 6 6 2" label="the hand is printed from the array" -- Print Hand: once, then a space and each value as the loop visits it.
run "./game" stdout="Sixes: 2" label="two sixes are counted" -- Use a variable that starts at 0 and goes up by one each time an element equals 6.
lacks main.cpp "Sixes: 2" label="the count is computed, not typed" -- Print the variable that holds the count. Do not write the digit yourself.
lacks main.cpp "Hand: 3 1 6 6 2" label="the hand is printed from the array, not typed" -- Print the elements with a loop.
```

```hints
nudge: Who decides how many sixes there are: you, or a loop?
concept: A counter is an int that starts at 0 and is increased inside a loop when a condition holds. An array gets its values at declaration with braces: `int hand[NUM_DICE] = {3, 1, 6, 6, 2};`.
shape: Declare `hand` with its five values and `sixes` set to 0. In one loop over `hand`, print each element and add 1 to `sixes` when the element is 6. Print the count after the loop.
answer: One way to write it:
~~~cpp
int hand[NUM_DICE] = {3, 1, 6, 6, 2};
int sixes = 0;

std::cout << "Hand:";
for (int i = 0; i < NUM_DICE; i++) {
    std::cout << " " << hand[i];
    if (hand[i] == 6) {
        sixes++;
    }
}
std::cout << "\nSixes: " << sixes << "\n";
~~~
```
