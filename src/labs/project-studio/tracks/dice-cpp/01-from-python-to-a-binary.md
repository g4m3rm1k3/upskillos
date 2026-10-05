---
title: 1 — A Python programmer meets the compiler
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
run: hello.cpp
---

You know Python functions, lists, dictionaries, loops and basic tests. You need no C++, game development or machine-learning experience. In this course you type **all** game, training, evaluation and test code yourself. There are no supplied game files or hidden framework helpers.

Open **Project Studio in the desktop app**, choose this track, and select a new empty folder named `dice-duel`. Keep that folder for the entire track. Use the terminal for interactive programs; the Run output pane is not an interactive input terminal. On Windows the commands below use PowerShell; on macOS/Linux use your normal shell.

We build a small Pig-like dice game. Two players race to **12**. A turn has an unbanked pot. Roll 2–6 to add to the pot; roll 1 to lose the pot and pass the turn. Bank a nonempty pot to add it to your permanent score and pass. Reaching 12 with score plus pot wins immediately. Banking zero is illegal. We deliberately choose a small target so a table can represent every decision.

First you play a rule-based opponent. Later the opponent learns which legal action has the best expected win/loss reward. No graphics library is needed. The eventual graphical sequel uses SDL3; it is a separate future project.

**Outcome:** compile a program and explain why integer division differs from Python's `/`.

`source.cpp → compiler → executable → terminal output`

## Find the compiler

Type `g++ --version` in the terminal. If it is missing, use **Install C++ compiler**, then close and reopen the terminal. C++ source must be compiled after every edit; running an old executable does not test new source.

Procedure: 1. Save source. 2. Compile. 3. Read the first error. 4. Run only after compilation succeeds. `-std=c++20` selects the language version; `-Wall -Wextra -pedantic` request diagnostics. `-o hello` names the executable (`hello.exe` on Windows).

```check
run "g++ --version"
```

## Print the rules and a probability

Create `hello.cpp`. `#include <iostream>` declares stream operations. `int main()` is the entry point and returns an integer exit status. Braces delimit its body. Each statement ends with `;`. `const int` declares an unchanging whole number; `double` stores a floating-point approximation. `std::` selects the standard-library namespace, like qualifying a Python name with its module. `std::cout << value` sends text to standard output. `\n` ends a line. Type the program, save, then compile and run it.

```predict
question: What does 1 / 6 print when both operands are integers?
choice: 0
choice: 0.166667
answer: 0
explain: C++ integer division discards the fractional part. Making an operand 1.0 selects floating-point division.
```


```cpp file=hello.cpp
#include <iostream>
int main() {
    const int target = 12;
    const double bust = 1.0 / 6.0;
    std::cout << "Dice Duel: first to " << target << '\n';
    std::cout << "integer " << 1 / 6 << " probability " << bust << '\n';
    return 0;
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o hello
./hello
```

Expect `Dice Duel: first to 12` and `integer 0 probability 0.166667`. Python integers grow as needed; C++ `int` has a bounded range. Our scores remain small. Make a missing-semicolon error, read the compiler location, repair it, and rebuild.

**Explain without the reference:** why did changing `1` to `1.0` change the result? A type controls which operation runs, not just how a variable is labelled.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o hello"
run "./hello" stdout="integer 0 probability 0.166667"
```

## Read a value instead of hard-coding the answer

The game needs values from a player, not just constants in the source. Here is the smallest numeric input experiment. Create explore_input.cpp, compile it, then run it and type 3 followed by Enter.

```predict
question: You change the input from 3 to 8 without editing the source. Must you recompile?
choice: No
choice: Yes
answer: No
explain: Compilation translates the instructions. The executable reads new data each time it runs.
```

```cpp file=explore_input.cpp
#include <iostream>
int main() {
    int pot = 0;
    std::cin >> pot;
    std::cout << pot + 4 << '\n';
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_input.cpp -o explore
./explore
```

Type 3 and press Enter.

Expected output:

```text
7
```

### How it works

`std::cin` is standard input. `>> pot` reads a whole-number token and stores it in pot. It is input extraction here; the `<<` on cout is output insertion. With input 3, pot becomes 3 and pot + 4 produces 7. Changing the input to 8 gives 12 without recompiling.

Unlike Python input(), numeric extraction converts directly into the declared type. This experiment assumes valid numeric input. The real game will read a whole string with getline so it can report malformed commands. All numeric practice prompts specify valid inputs.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_input.cpp -o explore"
run "./explore" stdout="7" stdin="3\n"
```

## Try it

In explore_input.cpp replace pot + 4 with pot / 4 and input 3. Predict why it prints 0. Change the divisor to 4.0 and compare. Restore the original before rerunning its checks.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Remaining points

**No solution is shown.** Create `practice_01.cpp` yourself. Read one integer score from standard input and print how many points remain to reach 12. Inputs are between 0 and 11. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_01.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 4 | result=8 |
| 9 | result=3 |

```hints
nudge: Store the score before calculating the difference.
concept: The target stays 12; the missing amount changes with the input.
shape: Extract one int, then print target minus score.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_01.cpp -o practice"
run "./practice" stdin="4\n" stdout="result=8\n" without="result=3\n"
run "./practice" stdin="9\n" stdout="result=3\n" without="result=8\n"
```

