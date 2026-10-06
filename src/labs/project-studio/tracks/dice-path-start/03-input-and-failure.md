---
title: A03 — Let the player supply a value
track: C++ Games — Start Here
trackOrder: 4
runtime: cpp
console: true
---

The scoreboard can calculate, but only for numbers written into its source. Now read a number while the program runs. The player can also type a word or close input, so a successful read must be checked before the number is used.

## Read a number during execution

`std::cin` is the standard input stream. `>> score` asks it to extract an integer into score. For this first experiment, type a valid number. On a terminal the program may wait for you to type it and press Enter. Do not type C++ or shell commands at that point.

```predict
question: With input 9, must you recompile to calculate for 4 next?
choice: No
choice: Yes
answer: No
explain: The executable reads new input each time it runs; its source need not change.
```


**Edit `explore/input.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/input.cpp
#include <iostream>
int main() {
    int score = 0;
    std::cin >> score;
    std::cout << "remaining=" << 12 - score << '\n';
    return 0;
}
```

Run once with nine and again with four: the results are three and eight. Initialization to zero happens before extraction, but it does not make a failed read valid. This intermediate program assumes valid numeric input; the next step removes that assumption.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/input.cpp -o lesson
./lesson
```

Type `9` and press Enter.

Expected output:

```text
remaining=3
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/input.cpp -o lesson"
run "./lesson" stdin="9\n" stdout="remaining=3\n"
```

## Stop when extraction fails

`if (condition)` runs its brace-enclosed body when the condition is true. A stream used as a condition reports whether extraction succeeded; `!` means not. Here the extra parentheses group the extraction before applying not.

`std::cerr` writes diagnostics to the error stream, separately from normal output. Returning 1 reports failure and ends main immediately, so the calculation below is skipped. This is your first guarded branch; the next lesson explores decisions in more detail.

**Edit `explore/input.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/input.cpp
#include <iostream>
int main() {
    int score = 0;
    if (!(std::cin >> score)) {
        std::cerr << "Expected an integer\n";
        return 1;
    }
    std::cout << "remaining=" << 12 - score << '\n';
    return 0;
}
```

| Input | Extraction succeeds? | Path |
|---|---|---|
| 9 | yes | print remaining=3, return 0 |
| cat | no | report error, return 1 |
| input ends before a number | no | report error, return 1 |

Closing input is called **end-of-file**, or EOF, even if no disk file is involved. In a terminal use Ctrl+Z then Enter on Windows, or Ctrl+D on an empty line on macOS/Linux. Check my work supplies input automatically.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/input.cpp -o lesson
./lesson
```

Type `9` and press Enter.

Expected output:

```text
remaining=3
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/input.cpp -o lesson"
run "./lesson" stdin="9\n" stdout="remaining=3\n"
```

## Check both paths

Run the safe program and type cat. It should report Expected an integer and stop without a remaining-points line. Run again with zero: zero is valid numeric input and prints twelve.

This reads an integer token, not a validated whole line: `12cats` can extract 12 and leave cats unread. Later command parsing will validate complete lines. Do not claim this program already rejects every malformed line.

The checks distinguish error output from normal output and check the exit status. A program that prints an error but returns success fails the intended contract.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/input.cpp -o lesson"
run "./lesson" stdin="cat\n" stderr="Expected an integer" exit=1 without="remaining="
run "./lesson" stdin="0\n" stdout="remaining=12\n"
run "./lesson" stdin="" stderr="Expected an integer" exit=1 without="remaining="
```

## Try it — Identify which program is waiting

Start ./lesson without typing input. It is your program waiting for a value, not the compiler hanging. Type four, then run again and end input instead. Explain the different paths.

Temporarily remove the guard and try a word. A computed output is not evidence of valid input. Restore the guard and rebuild before continuing.



## Your turn — Read a score and a pot

**No solution is shown.** Create `practice/input.cpp` yourself. Read two integers, a score and a pot, each between 0 and 12. For successfully extracted numbers print their sum with total=. If either extraction fails, print Expected two integers to the error stream, return 1 and print no total. Chaining `>>` reads the two fields in order. Complete-line validation is not required here.

| Input | Required output |
|---|---|
| 4 3 | total=7 |
| 2 6 | total=8 |
| cat | stderr="Expected two integers" exit=1 without="total=" |
| 4 | stderr="Expected two integers" exit=1 without="total=" |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/input.cpp -o lesson
./lesson
```

```hints
nudge: Both extractions must succeed before you calculate.
concept: The stream reflects a failure in either extraction of the chain.
shape: Guard the chained read, return on failure, then calculate and print the sum.
```


Explain why a valid zero and a failed read are different. Identify one malformed whole line this token-based parser can still accept.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/input.cpp -o lesson"
run "./lesson" stdin="4 3\n" stdout="total=7\n" without="total=8\n"
run "./lesson" stdin="2 6\n" stdout="total=8\n" without="total=7\n"
run "./lesson" stdin="cat\n" stderr="Expected two integers" exit=1 without="total="
run "./lesson" stdin="4\n" stderr="Expected two integers" exit=1 without="total="
```

