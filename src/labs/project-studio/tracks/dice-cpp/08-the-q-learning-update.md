---
title: 8 — A value learns from a target
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

An estimate of 0.2 moves halfway toward 0.72: the correction is `0.5 * (0.72 - 0.2) = 0.26`, leaving 0.46. **Outcome:** implement and numerically test one Q-learning update, including terminal losses.

`old estimate → prediction error (target - old) → scaled correction → new estimate`

## Compute one correction before naming Q-learning

An estimate is 0.2. The next decision looks worth 0.8. With a discount of 0.9 and no immediate reward, the new evidence points to 0.72. Move halfway toward it instead of replacing the old estimate outright.

```figure
name: dice/UpdateTrace
caption: Change one setting and follow the calculation. Then implement the same arithmetic in C++.
```

First explore the controls. The figure illustrates the calculation; your own executable below is what you will build and check.

```predict
question: With alpha 0.5, does value become the target 0.72 immediately?
choice: No
choice: Yes
answer: No
explain: It moves halfway across the gap, from 0.2 to 0.46.
```

```cpp file=explore_update.cpp
#include <iostream>
int main() {
    double value = 0.2, next = 0.8;
    double alpha = 0.5, gamma = 0.9;
    double target = gamma * next;
    double error = target - value;
    value += alpha * error;
    std::cout << target << " " << error << " " << value << '\n';
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_update.cpp -o explore
./explore
```

Expected output:

```text
0.72 0.52 0.46
```

### How it works

| name | calculation | value |
|---|---|---|
| target | 0 + 0.9 * 0.8 | 0.72 |
| error | 0.72 - 0.2 | 0.52 |
| correction | 0.5 * 0.52 | 0.26 |
| new value | 0.2 + 0.26 | 0.46 |

Alpha controls the fraction of error used. Gamma controls how much future value counts; these are different roles. Adding the whole target repeatedly would accumulate values instead of correcting an estimate. After you have traced these statements, the Q-learning notation is just a compact name for the same update applied to a selected table cell.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_update.cpp -o explore"
run "./explore" stdout="0.72 0.52 0.46"
```

## Test one numeric update

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

The first assertion checks real arithmetic rather than a keyword. The second proves that only the selected action changes. An intentionally unindexable terminal successor proves that terminal updates do not read its Q-row.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

Set old roll value 0.2 and next best value 0.8. With gamma 0.9 the target is 0.72. Half the difference from 0.2 is 0.26.

**Edit `test_update.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_update.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table();
    Game before; before.pot = 2;
    Game next; next.pot = 3;
    q.at(state_id(before)) = {0.2, -0.3};
    q.at(state_id(next)) = {0.8, 0.4};
    update(q, before, Action::Roll, {next, 0.0, false}, 0.5, 0.9);
    assert(std::abs(q.at(state_id(before))[0] - 0.46) < 1e-12);
    assert(q.at(state_id(before))[1] == -0.3);
}
```

The new value must be approximately 0.46. The untouched bank value must remain -0.3. An absolute tolerance avoids confusing floating-point rounding with a faulty update.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_update.cpp "assert(q.at(state_id(before))[1] == -0.3);"
```

## Test a terminal loss

Give the terminal successor pot 99, outside the decision table. Correct terminal code never tries to encode it.

**Edit `test_update.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_update.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table();
    Game before; before.pot = 2;
    Game next; next.pot = 3;
    q.at(state_id(before)) = {0.2, -0.3};
    q.at(state_id(next)) = {0.8, 0.4};
    update(q, before, Action::Roll, {next, 0.0, false}, 0.5, 0.9);
    assert(std::abs(q.at(state_id(before))[0] - 0.46) < 1e-12);
    assert(q.at(state_id(before))[1] == -0.3);
    Game terminal; terminal.winner = 1; terminal.pot = 99;
    update(q, before, Action::Roll, {terminal, -1.0, true}, 0.5);
    assert(std::abs(q.at(state_id(before))[0] + 0.27) < 1e-12);
}
```

Halfway from 0.46 toward -1 is -0.27. This test catches both the wrong reward sign and accidentally bootstrapping after the game ends.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_update.cpp "assert(std::abs(q.at(state_id(before))[0] + 0.27) < 1e-12);"
```

## Test the legal bootstrap value

Create a successor with pot zero and a huge illegal bank estimate. Alpha 1 makes the new estimate equal the legal target.

**Edit `test_update.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_update.cpp
#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table();
    Game before; before.pot = 2;
    Game next; next.pot = 3;
    q.at(state_id(before)) = {0.2, -0.3};
    q.at(state_id(next)) = {0.8, 0.4};
    update(q, before, Action::Roll, {next, 0.0, false}, 0.5, 0.9);
    assert(std::abs(q.at(state_id(before))[0] - 0.46) < 1e-12);
    assert(q.at(state_id(before))[1] == -0.3);
    Game terminal; terminal.winner = 1; terminal.pot = 99;
    update(q, before, Action::Roll, {terminal, -1.0, true}, 0.5);
    assert(std::abs(q.at(state_id(before))[0] + 0.27) < 1e-12);
    Game empty;
    q.at(state_id(empty)) = {0.1, 99.0};
    update(q, before, Action::Bank, {empty, 0.0, false}, 1.0);
    assert(std::abs(q.at(state_id(before))[1] - 0.1) < 1e-12);
    std::cout << "update ok\n";
}
```

The selected bank cell in the previous state should become approximately 0.1. The action just taken may be Bank even though Bank is illegal at the successor; these are different states.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_update.cpp "std::cout << \"update ok\\n\";"
```

## Move an estimate toward a terminal reward

Start update with terminal outcomes only. This intermediate function uses reward as the whole target; do not use it for training yet. Borrow the old cell, then move partway from its value toward the target.

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
inline void update(Table& q, const Game& before, Action action,
                   const Transition& t, double alpha = 0.1, double gamma = 1.0) {
    if (!legal(before, action)) throw std::invalid_argument("illegal update");
    double target = t.reward;
    double& value = q.at(state_id(before)).at(column(action));
    value += alpha * (target - value);
}
#endif
```

For old 0.2, reward 1 and alpha 0.5, the error is 0.8, the correction is 0.4 and the new estimate is 0.6. `double& value` aliases the actual cell. Without the ampersand, only a local copy changes. Gamma is unused until we add the next-state estimate.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ agent.hpp"
```

## Bootstrap only when another decision exists

Append `update` before `#endif`. Alpha is the learning rate: the fraction of prediction error used. Gamma discounts future reward. The target is immediate reward plus gamma times the largest **legal** next value, unless the episode ended. A `double&` is an alias to the table cell: updating it updates the table. Without `&`, you change a temporary copy.

We just computed old + alpha * (target - old). In general the target is `reward + gamma * max_legal Q(next, action)`. This is Q-learning: its target uses the best next action even when its behavior explores. SARSA instead uses the next action actually chosen; that is a different algorithm.

```predict
question: A terminal loss has reward -1 and a hypothetical next value 99. What target do we use?
choice: -1
choice: 98
answer: -1
explain: There is no next decision after termination. Terminal updates use reward alone.
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
inline void update(Table& q, const Game& before, Action action,
                   const Transition& t, double alpha = 0.1, double gamma = 1.0) {
    if (!legal(before, action)) throw std::invalid_argument("illegal update");
    double target = t.reward;
    if (!t.done) target += gamma * best_value(q, t.next);
    double& value = q.at(state_id(before)).at(column(action));
    value += alpha * (target - value);
}
#endif
```

Add one conditional line before borrowing the old cell. A continuing transition gets gamma times the next legal maximum; a terminal one skips that access completely. Compute the target first so an update to the current row cannot influence its own successor lookup.

Procedure: 1. Start with reward. 2. Bootstrap from the legal next maximum only if nonterminal. 3. Borrow the selected old cell. 4. Add alpha times its error. `std::abs(error) < 1e-12` tests approximate equality because floating-point arithmetic is rounded.

For this episodic game, gamma 1 makes the return the final +1 or -1 outcome. A perfect estimate equals `2 * win_probability - 1`, so Q=0.4 corresponds to 70% wins under the continuation policy and fixed opponent. We do not claim our finite training produces perfect estimates. Constant alpha keeps adapting; it does not meet every diminishing-step convergence condition. **Debug:** adding the target directly causes values to accumulate instead of converge. **Transfer:** an intermediate checkpoint is not a terminal state just because you stopped a simulation there.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_update.cpp -o test_update"
run "./test_update" stdout="update ok"
```

## Try it

Set alpha to 0, 0.5 and 1 in explore_update.cpp. The new estimate stays old, lands halfway, or reaches the target. Then use target - value twice without recomputing error and explain why it is not two honest updates. Restore the original file.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Update after a terminal loss

**No solution is shown.** Create `practice_08.cpp` yourself. Read an old estimate and alpha, with alpha between 0 and 1. Print its updated value after a terminal loss of -1. There is no next-state value. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_08.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 0.2 0.5 | result=-0.4 |
| 0.6 1 | result=-1 |

```hints
nudge: Work out the target minus the old estimate first.
concept: A terminal transition never adds a future value.
shape: Read value and alpha, then add alpha times (-1 minus value).
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_08.cpp -o practice"
run "./practice" stdin="0.2 0.5\n" stdout="result=-0.4\n" without="result=-1\n"
run "./practice" stdin="0.6 1\n" stdout="result=-1\n" without="result=-0.4\n"
```

