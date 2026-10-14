---
title: 0.7 — A playable turn, one decision at a time
runtime: cpp
console: true
teaches: getline, stream parsing, bool, random seed, nested loops, holds
experiments: Predict, trace, change, check
support: tests/parse_choice.cpp
---

### The story so far

The game file can score a fixed hand. Scratch labs explained how helpers borrow or mutate data. We now return to main.cpp and add input and rerolls in small working steps.

### What this lesson builds

Play a Sixes practice turn: see the hand, keep chosen dice, stop early or use up to three rolls, then calculate the score. This is the small prototype before the full scorecard.

## Read one complete answer {#step-1}

**Build:** first read a line without interpreting it. std::string owns text. getline reads until Enter, removes the newline, and stores the remaining text in line.

```cpp file=scratch/input.cpp
#include <iostream>
#include <string>

int main() {
    std::string line;
    if (!std::getline(std::cin, line)) return 1;
    std::cout << "You typed: " << line << '\n';
    return 0;
}
```

**Understand:** std::cin is the input stream. getline returns a stream whose truth value reports whether reading succeeded. ! negates that condition. A blank line succeeds with an empty string; EOF means no more input. This distinction prevents endlessly retrying an exhausted stream.

Type 3abc and observe `You typed: 3abc`. At this stage we deliberately accept text because we have not parsed it yet. The checks supply input via stdin, so they do not wait for you to type.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/input.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdin="3abc\n" stdout="You typed: 3abc" label="Observe the result"
run "./lesson" stdin="" exit=1 label="EOF exits instead of looping"
```

## Accept a number only after the whole line is valid {#validate-line}

**Build:** parse the saved line through istringstream, an input stream backed by a string. Keep choice unchanged until validation succeeds.

`bool` is the true/false result type already used by the test helper: true will mean a valid answer was stored, false will mean input ended. `char` holds one character, so `char extra = ' ';` starts with a space character. `std::istringstream input(line)` constructs a stream that reads characters from line; the parentheses supply its initial text. `<sstream>` declares that type. `>>` extracts a formatted value from an input stream, whereas the earlier output `<<` inserts one. The loop keeps asking for whole lines until the stream reports no more input.

```cpp file=scratch/input.cpp
#include <iostream>
#include <sstream>
#include <string>

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
    int choice = -1;
    if (!readChoice(0, 1, choice)) return 1;
    std::cout << "Choice: " << choice << '\n';
    return 0;
}
```

**Understand:** input >> candidate attempts integer extraction. input >> extra attempts another non-whitespace character. The second attempt must fail: otherwise 1abc would be accepted as 1. && evaluates conditions left to right and stops at the first false condition. Only the valid path assigns through int& choice.

| Line | Integer extraction | Extra character? | Result for bounds 0–1 |
|---|---|---|---|
| 1 | succeeds | no | accepts 1 |
| 1abc | succeeds with 1 | a | rejects |
| 2 | succeeds | no | rejects out of range |
| blank | fails | not attempted | rejects |
| EOF | no line | not attempted | returns false |

This helper owns retries for invalid lines. Its caller decides how to end the game on EOF.

```predict
question: After invalid text, should the output reference keep its old value?
choice: Yes — validate the candidate before assigning
choice: No — set it to zero before every attempt
answer: Yes — validate the candidate before assigning
explain: Failure should not quietly overwrite the caller's state.
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/input.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdin="1abc\n2\n\n1\n" stdout="Choice: 1" label="Observe the result"
run "./lesson" stdin="" exit=1 label="Observe the result"
```

## Roll once before writing a turn loop {#first-roll}

**Build:** replace the fixed hand with one generated hand. Keep the already understood scoring rule.

```cpp file=main.cpp
#include <cstdlib>
#include <iostream>

int sixPoints(int face) {
    if (face == 6) return 6;
    return 0;
}

int main() {
    std::srand(7);
    int dice[5] = {};
    for (int i = 0; i < 5; ++i) dice[i] = std::rand() % 6 + 1;
    std::cout << "Dice:";
    int score = 0;
    for (int i = 0; i < 5; ++i) {
        std::cout << " " << dice[i];
        score += sixPoints(dice[i]);
    }
    std::cout << "\nSixes score: " << score << '\n';
    return 0;
}
```

**Understand:** cstdlib declares rand and srand. srand(7) chooses a repeatable sequence for this library; rand returns successive nonnegative integers. Remainder `% 6` maps them to 0–5 and +1 shifts to 1–6. This prototype mapping has a small bias; Finish and Explain replaces it with a uniform distribution. A seed is a starting state, not a promise that every compiler generates the same sequence.

`int dice[5] = {}` initializes all elements to zero. The loop assigns each real face before reading it. Run twice; on this build the results repeat. Do not change the seed inside the loop: that would repeatedly restart the generator.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Sixes score:" label="Observe the result"
```

## Represent the keep choices {#step-2}

**Build:** first prove holding with a controlled replacement face. bool stores true or false. held[i] answers whether die i must remain unchanged.

```cpp file=scratch/holding.cpp
#include <iostream>

int main() {
    int dice[5] = {3, 1, 6, 6, 2};
    bool held[5] = {false, false, true, true, false};
    for (int i = 0; i < 5; ++i) {
        if (!held[i]) dice[i] = 1;
    }
    for (int i = 0; i < 5; ++i) std::cout << dice[i] << " ";
    std::cout << '\n';
    return 0;
}
```

**Understand:** !held[i] is true only for an unheld die. The controlled example must print `1 1 6 6 1`: positions 2 and 3 retain their sixes while the others receive one. Using fixed replacements makes a broken holding rule visible every time; random dice might coincidentally keep the same face.

| Position shown to player | Array index | held | Face after this step |
|---:|---:|---|---:|
| 1 | 0 | false | 1 |
| 3 | 2 | true | 6 |
| 4 | 3 | true | 6 |

> **Engineer:** isolate a new branch with controlled data before mixing it with randomness and user input.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/holding.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="1 1 6 6 1" label="Observe the result"
```

## Count rolls separately from dice {#roll-loop}

**Build:** put the rolling work inside a turn loop. For now every die rerolls automatically.

```cpp file=main.cpp
#include <cstdlib>
#include <iostream>

int sixPoints(int face) {
    if (face == 6) return 6;
    return 0;
}

int main() {
    std::srand(7);
    int dice[5] = {};
    for (int roll = 1; roll <= 3; ++roll) {
        for (int i = 0; i < 5; ++i) dice[i] = std::rand() % 6 + 1;
        std::cout << "Roll " << roll << ":";
        for (int i = 0; i < 5; ++i) std::cout << " " << dice[i];
        std::cout << '\n';
    }
    int score = 0;
    for (int i = 0; i < 5; ++i) {
        score += sixPoints(dice[i]);
    }
    std::cout << "\nSixes score: " << score << '\n';
    return 0;
}
```

**Understand:** roll is the outer counter (1, 2, 3), and i is a separate inner counter (0 through 4). The inner loop completes before roll advances. Scoring stays after the outer loop so it scores the last hand once, not all intermediate hands.

Trace the start: roll=1, i=0…4; roll=2, i=0…4; roll=3, i=0…4; roll becomes 4, condition fails. The maximum number of rolls is a rule, not an array bound; using <= 3 here is correct because roll starts at 1.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Roll 3:" label="The third roll appears"
run "./lesson" without="Roll 4:" label="No fourth roll"
```

## Assemble and play {#step-3}

**Build:** reuse readChoice from scratch/input.cpp and the held array from the controlled experiment. These are known pieces; the new part is their order in one turn.

```cpp file=main.cpp
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

**Understand:** show the current hand, stop if this is roll 3, otherwise ask whether to continue. break exits the nearest enclosing loop. Here the early-stop break is inside the roll loop, before the later loop over keep choices. Each hold choice sets one bool for the next roll. On the next pass only unheld dice receive new faces.

Play ./lesson. Say 1 to reroll, then answer five 0/1 keep questions, then say 0 to stop after the next hand. Confirm the held faces survive. The checks also exercise immediate stop, exhausted input, malformed text and all three rolls.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdin="0\n" stdout="Sixes score:" label="Observe the result"
run "./lesson" stdin="1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n" stdout="Roll 3:" label="Observe the result"
run "./lesson" stdin="" exit=1 label="Observe the result"
run "./lesson" stdin="word\n2\n0\n" stdout="Sixes score:" label="Observe the result"
```

## Try it — Break holding, then restore it {#step-4}

In scratch/holding.cpp remove the !held[i] condition. All five values become 1, so you have a deterministic failing case. Restore it. The same mistake in the random game could appear to work if a die randomly repeated its old face.

Save a copy of main.cpp as single_file.cpp after this lesson; the next lesson supplies a snapshot if you need to recover it. Do not compile *.cpp: ready.cpp, single_file.cpp and main.cpp contain separate entry points.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/holding.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="1 1 6 6 1" label="Observe the result"
```

## Read the acceptance cases {#acceptance-cases}

**Build:** a test program that calls your code with inputs you do not choose.

Define `bool parseChoice(const std::string& line, int low, int high, int& value)` in practice/parse_choice.cpp. It checks one line and never prints or retries. Accept exactly one integer in the inclusive bounds, with surrounding whitespace allowed. On failure leave value unchanged. Include string and sstream in your source.

The test is supplied so you can concentrate on the function. `expect(condition, caseNumber)` exits with status 1 when the condition is false; a comment beside each numbered case says what it checks. The test owns `main`; your practice source must define the requested function without another main. The declaration above the test's main tells its compiler the function's signature; the linker will connect it to your definition. You will study that boundary fully in the header lesson.

Use **Create provided file** here to create the test. Read the first case aloud as input → expected result. The test does not prove every possible input, so add a case of your own after it passes.

```cpp file=tests/parse_choice.cpp provided
#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
#include <string>
bool parseChoice(const std::string& line, int low, int high, int& value);
int main() {
    int value = 9;
    expect(!parseChoice("1abc", 0, 1, value) && value == 9, 1); // reject trailing text atomically
    expect(!parseChoice("", 0, 1, value) && value == 9, 2); // reject blank
    expect(!parseChoice("2", 0, 1, value), 3); // reject above range
    expect(!parseChoice("-1", 0, 1, value), 4); // reject below range
    expect(parseChoice(" 1 ", 0, 1, value) && value == 1, 5); // whitespace accepted
    expect(parseChoice("0", 0, 1, value) && value == 0, 6); // zero is valid
    expect(parseChoice("6", 2, 6, value) && value == 6, 7); // bounds are parameters
    std::cout << "PASS: parse_choice\n";
}
```

```check
file tests/parse_choice.cpp
```

## Your turn — Separate parsing from asking {#step-5}

**Build, on your own:** Define `bool parseChoice(const std::string& line, int low, int high, int& value)` in practice/parse_choice.cpp. It checks one line and never prints or retries. Accept exactly one integer in the inclusive bounds, with surrounding whitespace allowed. On failure leave value unchanged. Include string and sstream in your source.

Write **practice/parse_choice.cpp**. Do not change the supplied test to make it pass. Give this a real attempt before revealing hints. Compile and run the checks. Explain what each case rules out, then add a case of your own.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/parse_choice.cpp practice/parse_choice.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: parse_choice" label="All acceptance cases pass"
```

```hints
nudge: Reuse the validation part of readChoice, leaving getline and its loop with the caller.
concept: Parsing and interaction have different responsibilities: one answers whether text is valid; the other decides how to retry.
shape: Build an istringstream from line. Validate into a local candidate, reject leftovers or out-of-range values, then assign value and return true.
```
