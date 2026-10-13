---
title: A playable single file — rolls, holds and input
track: Start here — one file before classes
runtime: none
---

Build a small Sixes practice game before adding the full scorecard. You get up to three rolls, choose which dice to keep, and score six points per six. This is a deliberately limited prototype, not yet full Yahtzee.

## Read one complete answer

Keep your earlier main.cpp. First add `#include <string>` and `#include <sstream>` at its top, and add the following function above main. A string stores text; getline reads an entire line. An istringstream lets you parse that saved line without leaving bad characters in the terminal input stream.

Read this function before using the complete snapshot below:

```cpp
bool readMask(int& mask) {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream input(line);
        int candidate = 0;
        char extra = ' ';
        if ((input >> candidate) && !(input >> extra)
            && candidate >= 0 && candidate <= 31) {
            mask = candidate;
            return true;
        }
        std::cout << "Enter a whole number from 0 to 31: ";
    }
    return false;
}
```

`>> candidate` attempts to read an integer. `>> extra` looks for any non-whitespace character left over. Rejecting that character prevents `3abc` from being accepted as 3. `&&` evaluates left to right and stops as soon as a condition fails. `!` negates success. We change the output reference only after all checks pass. End-of-input leaves the loop and returns false. It is different from a blank line, which is invalid input and gets another prompt.

## Represent the keep choices

Five switches can be stored in five bits of an integer. Assign weights 1, 2, 4, 8, 16 to dice positions 1–5. Add the weights for positions you want to keep. Positions 1 and 3 give mask 5. Zero keeps none; 31 keeps all and ends early. `mask & bit` is bitwise AND, not address-of or a reference declaration. It checks whether a particular switch is on. Parentheses make the comparison explicit.

This compact input is an exercise in representation. The later full game replaces it with a friendlier list of positions. Trace mask 5 against weights 1, 2, 4, 8, 16 before continuing.

```predict
question: With mask 5, which positions reroll?
choice: 2, 4 and 5
choice: 1 and 3
answer: 2, 4 and 5
explain: Bits 1 and 4 are set, preserving dice positions 1 and 3. The remaining positions reroll.
```

## Assemble and play

`std::srand(7)` selects a repeatable random sequence for debugging on your library. `rand() % 6 + 1` maps to faces 1–6 but has modulo bias; a later completion lesson replaces it with a uniform distribution. Different standard libraries need not produce the same sequence. This is not a secure random source.

`{}` initializes all array elements to zero. The first mask is zero, so every die is assigned a real face before printing. `bit *= 2` doubles the current weight. Each outer-loop iteration is one roll; each inner-loop iteration is one die. The final score is calculated after rolling ends.

```cpp file=main.cpp
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string>

int sixPoints(int face) {
    if (face == 6) return 6;
    return 0;
}

bool readMask(int& mask) {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream input(line);
        int candidate = 0;
        char extra = ' ';
        if ((input >> candidate) && !(input >> extra)
            && candidate >= 0 && candidate <= 31) {
            mask = candidate;
            return true;
        }
        std::cout << "Enter a whole number from 0 to 31: ";
    }
    return false;
}

int main() {
    std::srand(7);
    int dice[5] = {};
    int mask = 0;
    for (int roll = 1; roll <= 3; ++roll) {
        int bit = 1;
        for (int i = 0; i < 5; ++i) {
            if ((mask & bit) == 0) dice[i] = std::rand() % 6 + 1;
            bit *= 2;
        }
        std::cout << "Roll " << roll << ":";
        for (int i = 0; i < 5; ++i) std::cout << " " << dice[i];
        std::cout << '\n';
        if (roll < 3) {
            std::cout << "Keep mask (1,2,4,8,16; add positions; 31 stops): ";
            if (!readMask(mask)) return 1;
            if (mask == 31) break;
        }
    }
    int score = 0;
    for (int i = 0; i < 5; ++i) score += sixPoints(dice[i]);
    std::cout << "Sixes score: " << score << '\n';
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o intro_check" label="Compile the example"
```

Run `./intro_check` interactively. Try 5, then 31; positions 1 and 3 must retain their values on roll 2. Try `3abc`, -1, 32, and a blank line: each must reprompt. Send EOF (Ctrl-D in a Unix terminal, Ctrl-Z then Enter on Windows): the game must exit, not loop forever. These manual observations check interaction that the compile check cannot establish.

## Try it — Break holding, then restore it

Temporarily remove the `if ((mask & bit) == 0)` condition. All dice now reroll, even held ones. A random face can coincidentally remain unchanged, so test several times. Restore the condition. In later deterministic tests, use controlled hands instead of relying on chance to reveal a bug.

## Your turn — Explain and change it

Change the game to let the player score Twos or Sixes after the last roll. Reuse pointsFor from the function lesson. Reject other category choices and trailing text. Test a hand with no matching faces and one with several. Save the working original as single_file.cpp before chapter 1.

```hints
nudge: Separate reading a choice from computing a score.
concept: Input validation should not be buried in scoring functions.
shape: Adapt the whole-line parser for category 2 or 6; keep a candidate local until valid. Use a fixed hand while testing the rule, then restore rolling.
```
