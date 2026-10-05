---
title: 6 — From Python dictionaries to a C++ table
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

For scores 2 and 3 with pot 4, the row number is `(2 * 12 + 3) * 12 + 4 = 328`. That row has two values: roll and bank. **Outcome:** map every decision state to a unique row and ignore illegal actions when reading its best value.

`(own, other, pot) → one row → [roll value, bank value]`

## Pack and unpack a state address

A vector needs one integer index, but the game has three state variables. Try a small address calculation and its inverse before storing any learned values.

```predict
question: If only pot increases by 1, how much does the address increase?
choice: 1
choice: 12
answer: 1
explain: Pot is the final offset, so adjacent pots occupy adjacent addresses.
```

```cpp file=explore_address.cpp
#include <iostream>
int main() {
    int own = 2, other = 3, pot = 4;
    int id = (own * 12 + other) * 12 + pot;
    std::cout << id << '\n';
    std::cout << id / 144 << " " << (id / 12) % 12 << " " << id % 12 << '\n';
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_address.cpp -o explore
./explore
```

Expected output:

```text
328
2 3 4
```

### How it works

| operation | result | meaning |
|---|---|---|
| 2 * 12 + 3 | 27 | select score pair |
| 27 * 12 + 4 | 328 | select pot within pair |
| 328 / 144 | 2 | recover own score |
| (328 / 12) % 12 | 3 | recover other score |
| 328 % 12 | 4 | recover pot |

Integer division drops the remainder; % keeps it. Each pot occupies its own slot within the score pair's block. Adding own + other instead would confuse scores (2,3) and (3,2).

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_address.cpp -o explore"
run "./explore" stdout="328\n2 3 4"
```

## Test every valid state address

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

The nested loops check every valid encoding for collisions. An enormous value in an illegal bank column must not affect `best_value`. This is stronger than checking table dimensions alone.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

Use three nested loops to enumerate own score, other score and legal pot. Mark each row number the first time it appears.

**Edit `test_table.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_table.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table();
    std::vector<bool> seen(STATES, false);
    for (int own = 0; own < TARGET; ++own)
        for (int other = 0; other < TARGET; ++other)
            for (int pot = 0; pot < TARGET - own; ++pot) {
            }
```

`seen[id]` must be false before marking it. A collision means two distinct situations would overwrite the same learned values. The pot loop ends at TARGET - own because reaching the target is terminal.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_table.cpp "for (int pot = 0; pot < TARGET - own; ++pot) {"
```

## Test one row by hand

Encode scores 2 and 3 with pot 4, then place two known values into that row. Work out the address on paper before reading the assertion.

**Edit `test_table.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_table.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table();
    std::vector<bool> seen(STATES, false);
    for (int own = 0; own < TARGET; ++own)
        for (int other = 0; other < TARGET; ++other)
            for (int pot = 0; pot < TARGET - own; ++pot) {
                Game g; g.score = {own, other}; g.pot = pot;
                int id = state_id(g);
                assert(id >= 0 && id < STATES && !seen[id]);
                seen[id] = true;
            }
    Game g; g.score = {2, 3}; g.pot = 4;
    assert(state_id(g) == 328);
    q.at(state_id(g)) = {-0.4, 0.7};
    assert(best_value(q, g) == 0.7);
}
```

(2 × 12 + 3) × 12 + 4 is 328. A best value of 0.7 means the bank column wins this comparison; it is not an observed win rate.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_table.cpp "assert(best_value(q, g) == 0.7);"
```

## Test that an illegal maximum is ignored

Put an absurd 99 in the bank column of an empty-pot state. The legal maximum must still be -0.4.

**Edit `test_table.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_table.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table();
    std::vector<bool> seen(STATES, false);
    for (int own = 0; own < TARGET; ++own)
        for (int other = 0; other < TARGET; ++other)
            for (int pot = 0; pot < TARGET - own; ++pot) {
                Game g; g.score = {own, other}; g.pot = pot;
                int id = state_id(g);
                assert(id >= 0 && id < STATES && !seen[id]);
                seen[id] = true;
            }
    Game g; g.score = {2, 3}; g.pot = 4;
    assert(state_id(g) == 328);
    q.at(state_id(g)) = {-0.4, 0.7};
    assert(best_value(q, g) == 0.7);
    Game empty;
    q.at(state_id(empty)) = {-0.4, 99.0};
    assert(best_value(q, empty) == -0.4);
    std::cout << "table ok\n";
}
```

A naive maximum over both columns passes most normal cases. This adversarial row distinguishes action legality from numerical size.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_table.cpp "std::cout << \"table ok\\n\";"
```

## Allocate two estimates for each address

Create `agent.hpp`. A Row is an array containing the two action values. A Table is a vector of rows. Start every estimate at zero; the program has not seen evidence for either action.

**Edit `agent.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=agent.hpp
#ifndef DICE_AGENT_HPP
#define DICE_AGENT_HPP
#include "env.hpp"
#include <vector>
#include <algorithm>
#include <cmath>
constexpr int STATES = TARGET * TARGET * TARGET;
using Row = std::array<double, 2>;
using Table = std::vector<Row>;
inline Table make_table() { return Table(STATES, Row{0.0, 0.0}); }
#endif
```

`Table(STATES, Row{0.0, 0.0})` fills the vector with copies of the zero row. STATES is 12 × 12 × 12: one dimension each for own score, other score and pot. Some combinations are impossible, but the rectangular layout keeps addressing simple. The vector owns and releases its memory automatically.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ agent.hpp"
```

## Encode one decision state

Add state_id. Validate the state first, then encode it. We only store decisions for player 0 before victory; a terminal pot can lie outside this table.

**Edit `agent.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=agent.hpp
#ifndef DICE_AGENT_HPP
#define DICE_AGENT_HPP
#include "env.hpp"
#include <vector>
#include <algorithm>
#include <cmath>
constexpr int STATES = TARGET * TARGET * TARGET;
using Row = std::array<double, 2>;
using Table = std::vector<Row>;
inline Table make_table() { return Table(STATES, Row{0.0, 0.0}); }
inline int state_id(const Game& g) {
    if (finished(g) || g.turn != 0 || g.score[0] < 0 || g.score[0] >= TARGET ||
        g.score[1] < 0 || g.score[1] >= TARGET || g.pot < 0 ||
        g.score[0] + g.pot >= TARGET)
        throw std::invalid_argument("not a decision state");
    return (g.score[0] * TARGET + g.score[1]) * TARGET + g.pot;
}
#endif
```

Think of a three-digit number with base 12. Scores 2 and 3 followed by pot 4 become (2 × 12 + 3) × 12 + 4 = 328. The first multiplication reserves a whole block for each own score. The second reserves a whole row for each opponent score. Adding scores without multiplication would create collisions.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ agent.hpp"
```

## Read the best legal value

Create `agent.hpp`. `using` gives a type an alias. `std::vector<Row>` owns a dynamic sequence of rows; unlike a Python list it stores one element type. `Row{0.0, 0.0}` is copied into every row by the vector constructor. Some rows are unreachable; a simple rectangular allocation is worth the small waste.

`.at(index)` checks bounds. `const Row&` borrows a row without copying. Such a reference must not outlive its vector or survive a reallocation; we never resize this table. `static_cast<int>` explicitly converts the action enum into its column.

```predict
question: At pot 0, roll has value -0.4 and bank has value 99. Which value is legal?
choice: -0.4
choice: 99
answer: -0.4
explain: Bank is unavailable. Both action selection and bootstrapping must mask it.
```


**Edit `agent.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=agent.hpp
#ifndef DICE_AGENT_HPP
#define DICE_AGENT_HPP
#include "env.hpp"
#include <vector>
#include <algorithm>
#include <cmath>
constexpr int STATES = TARGET * TARGET * TARGET;
using Row = std::array<double, 2>;
using Table = std::vector<Row>;
inline Table make_table() { return Table(STATES, Row{0.0, 0.0}); }
inline int state_id(const Game& g) {
    if (finished(g) || g.turn != 0 || g.score[0] < 0 || g.score[0] >= TARGET ||
        g.score[1] < 0 || g.score[1] >= TARGET || g.pot < 0 ||
        g.score[0] + g.pot >= TARGET)
        throw std::invalid_argument("not a decision state");
    return (g.score[0] * TARGET + g.score[1]) * TARGET + g.pot;
}
inline int column(Action action) { return static_cast<int>(action); }
inline double best_value(const Table& q, const Game& g) {
    const Row& row = q.at(state_id(g));
    return g.pot == 0 ? row[0] : std::max(row[0], row[1]);
}
#endif
```

column converts the scoped enum into an array index explicitly. best_value borrows a row with `const Row&`; it does not copy or change it. At pot zero, return roll even when the bank column is numerically larger. This action mask must agree with the game rules.

Procedure: 1. Multiply own score by the second dimension. 2. Add opponent score. 3. Multiply by the pot dimension. 4. Add pot. This is positional notation, like hours/minutes/seconds in a clock. Tests enumerate all valid states, including asymmetric scores so swapping players cannot hide. **Debug:** terminal states must not be indexed; the winning pot may already be outside the table. **Transfer:** adding remaining cards requires another dimension and quickly enlarges storage.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_table.cpp -o test_table"
run "./test_table" stdout="table ok"
```

## Try it

Change pot from 4 to 5 in explore_address.cpp and watch id grow by one. Change other from 3 to 4 instead: id grows by twelve. Restore the values, then try own + other in place of own * 12 + other and find the collision.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Recover the pot from a row number

**No solution is shown.** Create `practice_06.cpp` yourself. Read a valid encoded row number in the 12-by-12-by-12 table. Print only its pot component without constructing a Game. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_06.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 328 | result=4 |
| 145 | result=1 |

```hints
nudge: Pot is the offset inside one score-pair block.
concept: Division removes an offset; remainder retrieves it.
shape: Read the id and compute its remainder on division by 12.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_06.cpp -o practice"
run "./practice" stdin="328\n" stdout="result=4\n" without="result=1\n"
run "./practice" stdin="145\n" stdout="result=1\n" without="result=4\n"
```

