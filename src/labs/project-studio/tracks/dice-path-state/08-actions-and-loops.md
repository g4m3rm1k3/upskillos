---
title: A08 — A turn has named choices
track: C++ Games — State and Tests
trackOrder: 4.1
runtime: cpp
console: true
---

**Outcome:** Trace repeated updates and stop a recorded turn at the first bust.

**Recall before looking at code:** Which indices are valid in an array with two elements?

The rolls 3, 5, 1, 6 should leave no pot: the turn ends at the 1. A07 gave you collections; now process a sequence and stop at the correct time. First name a player’s choices so a number cannot silently mean two different things.

## Name the choices

An **enumeration** defines named alternatives. enum class Action makes a distinct type with Roll and Bank values. The :: qualifies the name: Bank belongs to Action. Use == to compare values. You cannot directly assign an ordinary integer to this Action variable. This avoids unclear conventions such as “does 1 mean bank or roll?”

**Edit `explore/actions.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/actions.cpp
#include <iostream>
enum class Action { Roll, Bank };
int main() {
    Action choice = Action::Bank;
    if (choice == Action::Bank) std::cout << "bank requested\n";
    return 0;
}
```

Action names a request. It does not make the request legal: a bank still requires a positive pot and an unfinished game.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/actions.cpp -o lesson
./lesson
```

Expected output:

```text
bank requested
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/actions.cpp -o lesson"
run "./lesson" stdout="bank requested\n"
```

## Repeat one operation over values

Create explore/turns.cpp. A **range-based for loop** runs its body once for each element. int face receives a copy of the next roll on each iteration. The colon separates the element declaration from the sequence. pot is an **accumulator**: a variable updated as values are processed. Declaring it outside the loop preserves the running total.

**Edit `explore/turns.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/turns.cpp
#include <iostream>
#include <array>

int main() {
    std::array<int, 4> rolls{3, 5, 1, 6};
    int pot = 0;
    for (int face : rolls) {
        pot += face;
        std::cout << "pot=" << pot << '\n';
    }
    return 0;
}
```

This first slice intentionally only sums: pot visits 3, 8, 9, 15. It is not yet the bust rule. Face is local to the loop body; pot remains available afterwards.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/turns.cpp -o lesson
./lesson
```

Expected output:

```text
pot=3
pot=8
pot=9
pot=15
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/turns.cpp -o lesson"
run "./lesson" stdout="pot=3\npot=8\npot=9\npot=15\n"
```

## A bust ends the loop

Add a branch before the addition. **break** exits the nearest enclosing loop immediately. On a bust we first discard the pot, then stop reading this sequence.

```predict
question: Will the trailing 6 be added?
choice: No
choice: Yes
answer: No
explain: break leaves the loop at the first 1; no next iteration begins.
```


**Edit `explore/turns.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/turns.cpp
#include <iostream>
#include <array>

int main() {
    std::array<int, 4> rolls{3, 5, 1, 6};
    int pot = 0;
    for (int face : rolls) {
        if (face == 1) {
            pot = 0;
            break;
        }
        pot += face;
        std::cout << "pot=" << pot << '\n';
    }
    std::cout << "final=" << pot << '\n';
    return 0;
}
```

| Face | Pot before | Operation | Pot after |
|---|---|---|---|
| 3 | 0 | add | 3 |
| 5 | 3 | add | 8 |
| 1 | 8 | reset, break | 0 |
| 6 | — | never visited | — |

The per-roll print is skipped on the bust because break comes before it. The print after the loop still runs.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/turns.cpp -o lesson
./lesson
```

Expected output:

```text
pot=3
pot=8
final=0
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/turns.cpp -o lesson"
run "./lesson" stdout="pot=3\npot=8\nfinal=0\n"
```

## Skipping is different from stopping

Create explore/positions.cpp. An **index loop** has initialization, a condition checked before each pass, and an update after each completed pass. ++index adds one. **continue** skips the remainder of this iteration, then performs the loop update and tests the condition again. This example reports positions of non-bust values; it is not a game turn.

**Edit `explore/positions.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/positions.cpp
#include <iostream>
#include <array>

int main() {
    std::array<int, 3> rolls{3, 1, 5};
    for (int index = 0; index < 3; ++index) {
        if (rolls.at(index) == 1) continue;
        std::cout << "position=" << index << '\n';
    }
    return 0;
}
```

Index 0 prints. Index 1 reaches continue, then increments to 2. Index 2 prints. Index 3 fails index < 3 before any access. <= would try an invalid position.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/positions.cpp -o lesson
./lesson
```

Expected output:

```text
position=0
position=2
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/positions.cpp -o lesson"
run "./lesson" stdout="position=0\nposition=2\n"
```

## Try it — Find the accumulator’s lifetime

Move int pot = 0; inside the range loop in turns.cpp. The final print can no longer see that name. Temporarily remove the final print and run: the first two printed pots are now 3 and 5 instead of 3 and 8. Each iteration starts a new accumulator. Restore both edits. Then change break to continue and predict the trailing 6 before running; restore break afterwards.



## Your turn — Stop a recorded turn

**No solution is shown.** Create `practice/recorded_turn.cpp` yourself. Read a count from 0 through 20 followed by that many die faces, each promised to be 1 through 6. Start the pot at zero. Add ordinary faces, but reset and stop at the first 1. Input after that bust belongs to an unused remainder and need not be consumed. Print only the final pot. This exercise has no score or target; it isolates a single bust rule.

| Input | Required output | Exit status |
|---|---|---|
| 4 3 5 1 6 | pot=0 | 0 |
| 0 | pot=0 | 0 |
| 3 2 4 6 | pot=12 | 0 |
| 3 1 5 6 | pot=0 | 0 |
| 2 5 2 | pot=7 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/recorded_turn.cpp -o lesson
./lesson
```

```hints
nudge: An empty sequence performs zero iterations.
concept: A bust both resets the total and ends the loop.
shape: Use count to bound repetition and break after the reset.
```


Trace count=4 and faces 3,5,1,6 with the code hidden. Explain which input remains unread and why no machine-learning algorithm is needed to implement this rule.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/recorded_turn.cpp -o lesson"
run "./lesson" stdin="4 3 5 1 6\n" stdout="pot=0\n"  without="pot=12\n"
run "./lesson" stdin="0\n" stdout="pot=0\n"  without="pot=12\n"
run "./lesson" stdin="3 2 4 6\n" stdout="pot=12\n"  without="pot=0\n"
run "./lesson" stdin="3 1 5 6\n" stdout="pot=0\n"  without="pot=12\n"
run "./lesson" stdin="2 5 2\n" stdout="pot=7\n"  without="pot=0\n"
```

