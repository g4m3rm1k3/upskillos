---
title: 7 — Explore without cheating
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

With exploration probability 0.2 and two legal actions, an inferior action is selected about 0.1 of the time: only half of exploratory choices pick it. **Outcome:** implement epsilon-greedy selection and random tie-breaking.

`epsilon coin → random legal action OR best legal value → random tie if needed`

## Count the two paths to the best action

Suppose Bank is uniquely best and both actions are legal. Of every 100 choices in expectation, 80 exploit and 20 explore. How many explorations still choose Bank?

```figure
name: dice/EpsilonSplit
caption: Change one setting and follow the calculation. Then implement the same arithmetic in C++.
```

First explore the controls. The figure illustrates the calculation; your own executable below is what you will build and check.

```predict
question: With epsilon 0.2, is the worse action chosen with probability 0.2?
choice: No
choice: Yes
answer: No
explain: Only half the exploratory choices pick the worse action, giving 0.1.
```

```cpp file=explore_epsilon.cpp
#include <iostream>
int main() {
    double epsilon = 0.2;
    double worse = epsilon / 2.0;
    double best = (1.0 - epsilon) + epsilon / 2.0;
    std::cout << worse << " " << best << '\n';
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_epsilon.cpp -o explore
./explore
```

Expected output:

```text
0.1 0.9
```

### How it works

Half the 20 exploratory choices select Bank, so its total is 80 + 10 = 90. Roll receives the other 10. This counts two disjoint routes to Bank: exploitation and exploration. The probabilities add to one.

The formula describes a long-run expectation, not an exact finite sample. A tie needs a separate rule: if neither action is better, give each half the choices. At pot zero the only legal action is Roll, regardless of epsilon.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_epsilon.cpp -o explore"
run "./explore" stdout="0.1 0.9"
```

## Test forced moves and exploitation

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

The tests check forced rolls, exploitation, exploration and ties independently. Loose frequency bounds detect gross mistakes without claiming an exact random count.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

At pot zero, even full exploration must roll. Then give a nonempty-pot state a strictly better bank value and turn exploration off.

**Edit `test_policy.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_policy.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table(); std::mt19937 rng(11);
    Game g;
    for (int i = 0; i < 100; ++i) assert(choose(q, g, 1.0, rng) == Action::Roll);
    g.pot = 3; q.at(state_id(g)) = {-0.5, 0.2};
    for (int i = 0; i < 100; ++i) assert(choose(q, g, 0.0, rng) == Action::Bank);
}
```

The same function must enforce both requirements. Random exploration is never permission to choose an illegal action.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_policy.cpp "for (int i = 0; i < 100; ++i) assert(choose(q, g, 0.0, rng) == Action::Bank);"
```

## Test exploration separately

Set epsilon to 1 and count rolls across 1000 choices. The two actions should both appear despite bank having the higher value.

**Edit `test_policy.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_policy.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table(); std::mt19937 rng(11);
    Game g;
    for (int i = 0; i < 100; ++i) assert(choose(q, g, 1.0, rng) == Action::Roll);
    g.pot = 3; q.at(state_id(g)) = {-0.5, 0.2};
    for (int i = 0; i < 100; ++i) assert(choose(q, g, 0.0, rng) == Action::Bank);
    int exploratory_rolls = 0;
    for (int i = 0; i < 1000; ++i)
        exploratory_rolls += choose(q, g, 1.0, rng) == Action::Roll;
    assert(exploratory_rolls > 300 && exploratory_rolls < 700);
}
```

The 300–700 bounds are deliberately broad. This is a smoke test for selecting both actions, not a demand for exactly 500 rolls.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_policy.cpp "assert(exploratory_rolls > 300 && exploratory_rolls < 700);"
```

## Test ties without exploration

Make both values zero, set epsilon to zero and count choices again. This exercises the tie branch, not the exploration branch.

**Edit `test_policy.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_policy.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table(); std::mt19937 rng(11);
    Game g;
    for (int i = 0; i < 100; ++i) assert(choose(q, g, 1.0, rng) == Action::Roll);
    g.pot = 3; q.at(state_id(g)) = {-0.5, 0.2};
    for (int i = 0; i < 100; ++i) assert(choose(q, g, 0.0, rng) == Action::Bank);
    int exploratory_rolls = 0;
    for (int i = 0; i < 1000; ++i)
        exploratory_rolls += choose(q, g, 1.0, rng) == Action::Roll;
    assert(exploratory_rolls > 300 && exploratory_rolls < 700);
    q.at(state_id(g)) = {0.0, 0.0};
    int ties = 0;
    for (int i = 0; i < 1000; ++i) ties += choose(q, g, 0.0, rng) == Action::Roll;
    assert(ties > 300 && ties < 700);
    std::cout << "policy ok\n";
}
```

Always taking column 0 would produce 1000 rolls and fail. Separate this case from exploration so one working random branch cannot hide a broken one.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_policy.cpp "std::cout << \"policy ok\\n\";"
```

## Choose the best legal action first

Append choose before the closing guard. Start with greedy selection only: at pot zero force Roll; otherwise compare the row and return the larger action. The exploration parameters are unused until the next edits.

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
inline Action choose(const Table& q, const Game& g, double epsilon,
                     std::mt19937& choices) {
    if (g.pot == 0) return Action::Roll;
    const Row& row = q.at(state_id(g));
    return row[0] > row[1] ? Action::Roll : Action::Bank;
}
#endif
```

With row {-0.5, 0.2}, Bank wins the comparison. With {0.2, 0.2}, this temporary version falls through to Bank because `>` is false. That arbitrary tie preference is the next problem to remove. Unused-parameter warnings at this intermediate stage are expected.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ agent.hpp"
```

## Give tied actions equal treatment

Insert the equality branch before the greater-than comparison. If both values are equal, draw an integer 0 or 1 and map it to the action.

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
inline Action choose(const Table& q, const Game& g, double epsilon,
                     std::mt19937& choices) {
    if (g.pot == 0) return Action::Roll;
    const Row& row = q.at(state_id(g));
    if (row[0] == row[1])
        return std::uniform_int_distribution<int>(0, 1)(choices) == 0
            ? Action::Roll : Action::Bank;
    return row[0] > row[1] ? Action::Roll : Action::Bank;
}
#endif
```

A fresh table contains ties everywhere. Always choosing one side would embed a preference unsupported by experience. Tie randomness remains even when epsilon is zero: both actions are equally greedy. The choices engine advances independently of the dice engine.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ agent.hpp"
```

## Explore before comparing estimates

Append `choose` before `#endif` in `agent.hpp`. Epsilon is the probability of exploration, between 0 and 1. A uniform real draw in `[0,1)` falls below epsilon that fraction of the time. Exploration can still select the best action. At a tie, use a fair choice even when epsilon is zero.

```predict
question: Epsilon is 0.2 and bank is uniquely best. How often is roll chosen in expectation?
choice: 0.1
choice: 0.2
answer: 0.1
explain: Exploration happens 0.2 of the time, then chooses roll half of those times.
```

Type the highlighted changes yourself in the named file. The comparison below updates against your saved work; green lines are additions and red lines are deletions.

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
inline Action choose(const Table& q, const Game& g, double epsilon,
                     std::mt19937& choices) {
    if (g.pot == 0) return Action::Roll;
    if (std::uniform_real_distribution<double>(0.0, 1.0)(choices) < epsilon)
        return std::uniform_int_distribution<int>(0, 1)(choices) == 0
            ? Action::Roll : Action::Bank;
    const Row& row = q.at(state_id(g));
    if (row[0] == row[1])
        return std::uniform_int_distribution<int>(0, 1)(choices) == 0
            ? Action::Roll : Action::Bank;
    return row[0] > row[1] ? Action::Roll : Action::Bank;
}
#endif
```

Insert the exploration branch after the forced-roll case and before reading the row. First draw the epsilon coin. If it succeeds, choose either legal action and return immediately. Otherwise continue to greedy selection. Exploration may also choose the best action; it does not mean deliberately choosing the worse one.

There are two random engines in the eventual trainer: one for dice, one for policy choices. Changing epsilon must not directly consume the die engine. Different policies still take different numbers of rolls; equal seeds do not guarantee identical trajectories.

**Worked expectation:** at pot 6, ignoring victory for this local calculation, the next unbanked pot is 0, 8, 9, 10, 11 or 12. Their average is 50/6, about 8.33. That is not automatically the best match-winning move: banked scores and the opponent matter. **Misconception:** a zero Q-table contains no evidence that roll is better. Always picking the first maximum embeds an accidental roll preference. **Challenge:** measure exploration over 100 and 10000 choices, and explain why neither count must equal its expectation.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_policy.cpp -o test_policy"
run "./test_policy" stdout="policy ok"
```

## Try it

Set epsilon to 0, 0.5 and 1 in explore_epsilon.cpp. Write down the two probabilities each time. At epsilon 1 the best action still occurs half the time; explain why exploration is not the same as choosing badly.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Probability of choosing the best action

**No solution is shown.** Create `practice_07.cpp` yourself. Read epsilon as a real number between 0 and 1. Assume two legal actions and a unique best action. Print the probability of selecting that best action. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_07.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 0.2 | result=0.9 |
| 1 | result=0.5 |

```hints
nudge: The best action can be selected during exploration too.
concept: Add the exploitation probability to half the exploration probability.
shape: Read epsilon; print one minus epsilon plus epsilon divided by two.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_07.cpp -o practice"
run "./practice" stdin="0.2\n" stdout="result=0.9\n" without="result=0.5\n"
run "./practice" stdin="1\n" stdout="result=0.5\n" without="result=0.9\n"
```

