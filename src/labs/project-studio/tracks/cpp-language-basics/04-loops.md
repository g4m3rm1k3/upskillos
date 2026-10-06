---
title: 4 — Loops: Summarising a Stream of Numbers
track: C++ Foundations — Thinking in Types
runtime: cpp
reference: optional
console: true
---

Programs earn their keep by doing something many times. In this lesson you'll build `stats`, a tool that reads any amount of numbers and summarises them, like a tiny version of what a spreadsheet does with a column. Then you'll write a second program that prints a multiplication table.

You'll meet C++'s two workhorse loops:

```cpp
while (condition) {            // repeat as long as the condition is true
    // ...
}

for (int i = 0; i < n; ++i) {  // start; keep going while; after each pass
    // ...
}
```

Both programs are single files, so you'll compile them directly with `g++`, from the track folder:

```text
g++ -std=c++20 -Wall -Wextra stats/stats.cpp -o stats/stats
```

## Step 1 — Read until the input runs out

**This step: create `stats/stats.cpp`, which counts and adds up numbers until the input ends.**

You don't know in advance how many numbers there will be. So read in a loop **until input ends**:

```cpp
double value = 0;
while (std::cin >> value) {
    // use value
}
```

- `std::cin >> value` tries to read a number, and the expression itself counts as `true` if the read worked and `false` if it didn't, because the input ended or the next thing wasn't a number.
- So the loop body runs once per number.

Input "ends" when a file or pipe runs out, or, at the keyboard, when you press **Ctrl+Z then Enter** (Windows) or **Ctrl+D** (macOS, Linux).

```cpp
++count;
sum += value;
```

- `++count` adds one to `count`. `sum += value` is short for `sum = sum + value`.

For the input `3 5 10`, print:

```text
count: 3
sum: 18
```

Build, then try it: run `./stats/stats`, type numbers, and finish with Ctrl+Z Enter or Ctrl+D.

```cpp file=stats/stats.cpp
#include <iostream>

int main()
{
    int count = 0;
    double sum = 0;
    double value = 0;
    while (std::cin >> value) {
        ++count;
        sum += value;
    }
    std::cout << "count: " << count << '\n';
    std::cout << "sum: " << sum << '\n';
    return 0;
}
```

```check
contains stats/stats.cpp "while" label="stats.cpp uses a while loop"
run "g++ -std=c++20 -Wall -Wextra -Werror stats/stats.cpp -o stats/stats" -- Read the first error. Each statement ends with ;
run "./stats/stats" stdin="3 5 10\n" stdout="count: 3\nsum: 18" -- Inside the loop: add one to count, and add value to sum.
run "./stats/stats" stdin="1.5\n2.5\n" stdout="count: 2\nsum: 4" -- Numbers on separate lines work too: >> skips newlines.
```

## Step 2 — Smallest, largest, average, and nothing at all

**This step: also print the minimum, maximum and average, and handle empty input.**

```text
count: 3
sum: 18
min: 3
max: 10
average: 6
```

Two decisions every programmer has to make here:

1. **What does `min` start as?** Start it at `0`, and the input `3 5 10` reports a minimum of `0`, a number that never appeared. Start from the **first value read** instead: `if (count == 0 || value < min) min = value;`
2. **What if there are no numbers at all?** `sum / count` would be `0.0 / 0`, not a number. Real programs handle the empty case on purpose: print `no numbers` and stop.

- `||` means "or": the condition is true if either side is.

**Predict, then test** the edge cases before pressing Check: `7` alone, nothing at all, and `-2.5 4`.

> The habit to build: whenever you write a loop, ask *what happens with zero items? With one?*

```cpp file=stats/stats.cpp
#include <iostream>

int main()
{
    int count = 0;
    double sum = 0;
    double min = 0;
    double max = 0;
    double value = 0;
    while (std::cin >> value) {
        if (count == 0 || value < min)
            min = value;
        if (count == 0 || value > max)
            max = value;
        ++count;
        sum += value;
    }

    if (count == 0) {
        std::cout << "no numbers\n";
        return 0;
    }
    std::cout << "count: " << count << '\n';
    std::cout << "sum: " << sum << '\n';
    std::cout << "min: " << min << '\n';
    std::cout << "max: " << max << '\n';
    std::cout << "average: " << sum / count << '\n';
    return 0;
}
```

```check
run "g++ -std=c++20 -Wall -Wextra -Werror stats/stats.cpp -o stats/stats"
run "./stats/stats" stdin="3 5 10\n" stdout="min: 3\nmax: 10\naverage: 6"
run "./stats/stats" stdin="-2.5 4\n" stdout="min: -2.5\nmax: 4\naverage: 0.75" -- Don't start min and max at 0: start them from the first value.
run "./stats/stats" stdin="7\n" stdout="min: 7\nmax: 7\naverage: 7"
run "./stats/stats" stdin="" stdout="no numbers" label="empty input prints \"no numbers\"" -- After the loop, if count is 0, print no numbers instead of dividing by zero.
```

## Step 3 — Predict: counting iterations

**This step: predict, then check by experiment. No file changes.**

```cpp
for (int i = 1; i < 10; ++i) {
    std::cout << i << '\n';
}
```

- `int i = 1` runs once, before the loop.
- `i < 10` is tested **before** every pass; the loop stops as soon as it's false.
- `++i` runs after every pass.

**Predict:** how many lines does it print: 9, 10 or 11? Then test it in a scratch file.

### What happens

Nine: `i` takes the values 1 to 9. When `i` becomes 10, the condition is false before the body runs. When `a <= b` and incrementing stays within the integer range, a loop `for (int i = a; i < b; ++i)` runs `b - a` times. If `a > b`, the first condition is false and it runs zero times.

This **half-open range**, written [a, b), includes `a` and excludes `b`, and it's the convention everywhere in C++: positions `0` to `size() - 1`, iterators from `begin()` up to `end()`. It exists to make **off-by-one errors**, the most common loop bug, less likely. You met one in *C++ from Zero*: `i <= scores.size()`.

## Step 4 — Challenge: a multiplication table

**This step: no code is given. Create a second program, `stats/table.cpp`, that reads a number `n` and prints an n × n multiplication table.**

```text
$ ./stats/table
3
1 2 3
2 4 6
3 6 9
```

- Numbers are separated by single spaces, with no space at the end of a line.
- If `n` is missing, zero or negative, print `n must be a positive whole number` and return exit code `1` from `main`. A non-zero exit code is how command-line programs tell whoever ran them that something went wrong.

Before opening the optional reference, sketch the rows for n = 2. Predict where each space and newline belongs. Your first implementation should produce that small example before you generalise to n rows.

```hints
nudge: One row needs several products, but only one newline. Which action belongs after the inner loop?
concept: For row r and column c the value is r * c. Print a separating space before columns after the first, rather than after every value.
shape: Read and validate n first. Loop row from 1 through n; inside it loop col from 1 through n. Print a space when col > 1, then row * col. Print a newline after the inner loop.
```

The checks compile and inspect output fragments for n = 1, 3, 5 and 0. They do not reject all extra text or establish correct handling of every invalid input. Manually test missing input, a negative number, and a two-row table; inspect trailing spaces as well as the numbers. Integer extraction may accept the integer prefix of decimal input: rejecting that entire line is an optional parsing extension, not a behavior these checks establish.

You'll need a loop **inside** a loop: a **nested loop**. The outer loop goes through rows; for each row, the inner loop goes through columns.

```text
g++ -std=c++20 -Wall -Wextra stats/table.cpp -o stats/table
```

```cpp file=stats/table.cpp
#include <iostream>

int main()
{
    int n = 0;
    if (!(std::cin >> n) || n <= 0) {
        std::cout << "n must be a positive whole number\n";
        return 1;
    }
    for (int row = 1; row <= n; ++row) {
        for (int col = 1; col <= n; ++col) {
            if (col > 1)
                std::cout << ' ';
            std::cout << row * col;
        }
        std::cout << '\n';
    }
    return 0;
}
```

```check
run "g++ -std=c++20 -Wall -Wextra -Werror stats/table.cpp -o stats/table"
run "./stats/table" stdin="3\n" stdout="1 2 3\n2 4 6\n3 6 9" -- Print a space before every number except the first in a row, then '\n' after the inner loop.
run "./stats/table" stdin="1\n" stdout="1"
run "./stats/table" stdin="5\n" stdout="5 10 15 20 25"
run "./stats/table" stdin="0\n" exit=1 stdout="n must be a positive whole number" -- Check n before the loops, and return 1 from main.
```
