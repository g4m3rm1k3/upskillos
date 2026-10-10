---
title: 6.2 — The Q-Table
runtime: none
support: tests/test_qtable.cpp, tests/test_qupdate.cpp, tests/test_qtable_extra.cpp
---

The agent needs a memory. Q-learning keeps it in a **table**. Each row is a state the agent has seen. Each column is an action. The number in a cell is the **Q-value**: how good it is to do that action in that state.

"How good" means a specific thing: the **total reward** the agent expects from now until the end of the episode, if it does this action and then plays well. So in the corridor, Right at the start is worth about 46, because it leads to the coin and the win. Waiting is worth less, because it wastes steps.

Click the button that creates the supporting test files before you start.

## A table of rows

Here is the table for three states and five actions. The row for state `s1` says that action 3 (Right) is best:

```text
state   Up    Down  Left  Right  Wait
s1      -1.0  -1.0  -1.0   4.5   -0.5
s2       0.0   0.0   0.0   0.0    0.0
s3       2.0  -3.0   0.0   1.0    0.0
```

- A new state starts with a row of zeros. That means "I know nothing yet".
- The **best action** in a state is the column with the highest number. If two columns tie, take the first.
- The agent acts by looking at its row and picking the best column.

In C++ this is a `std::map`. The **key** is the state text, and the **value** is a `std::vector<double>` with one number per action. A `std::map` keeps its keys sorted, which makes the saved file in lesson 6.5 tidy.

## How a number is learned

After every step the agent knows four things: the state `s` it was in, the action `a` it took, the reward `r` it got, and the new state `s'`. It uses them to improve one cell:

```text
target     = r + gamma * (best value in the row of s')
new Q(s,a) = old Q(s,a) + alpha * (target - old Q(s,a))
```

- The **target** is a better guess for Q(s,a): the reward you just got, plus what you expect from the next state.
- **gamma** (γ) is the **discount**, between 0 and 1. A reward later is worth a bit less than a reward now. With γ = 0.9, one step away is worth 90%.
- **alpha** (α) is the **learning rate**. The cell moves only a fraction of the way towards the target, so one lucky or unlucky step doesn't change everything. With α = 0.5 it moves halfway. With α = 1 it jumps all the way, and with α = 0 it never moves.
- If the episode ended on this step, there is no future, so the target is only `r`.

```predict
question: A cell holds 0. The agent gets reward 10, and the next state's row is all zeros. With alpha = 0.5 and gamma = 0.9, what is the cell afterwards?
answer: 5
explain: The target is 10 + 0.9 * 0 = 10. The cell moves halfway there: 0 + 0.5 * (10 - 0) = 5.
tolerance: 0.01
```

## Read the tests for the table

This file is given to you. Read it, don't type it:

```cpp file=tests/test_qtable.cpp provided
#include "minitest.h"
#include "../qtable.h"

TEST(QTableTest, StartsEmpty) {
    QTable q(5);
    EXPECT_EQ(q.actionCount(), 5);
    EXPECT_EQ(q.stateCount(), 0);
    EXPECT_DOUBLE_EQ(q.get("s", 2), 0.0);
}

TEST(QTableTest, SetAndGet) {
    QTable q(5);
    q.set("a", 1, 2.5);
    EXPECT_DOUBLE_EQ(q.get("a", 1), 2.5);
    EXPECT_DOUBLE_EQ(q.get("a", 0), 0.0);
    EXPECT_EQ(q.stateCount(), 1);
}

TEST(QTableTest, ReadingNeverAddsAState) {
    QTable q(5);
    q.get("a", 0);
    q.maxValue("a");
    q.bestAction("a");
    EXPECT_EQ(q.stateCount(), 0);
}

TEST(QTableTest, BadActionsAreIgnored) {
    QTable q(5);
    q.set("a", 7, 1.0);
    q.set("a", -1, 1.0);
    EXPECT_EQ(q.stateCount(), 0);
    EXPECT_DOUBLE_EQ(q.get("a", 7), 0.0);
    EXPECT_DOUBLE_EQ(q.get("a", -1), 0.0);
}

TEST(QTableTest, BestActionPicksTheHighest) {
    QTable q(5);
    q.set("a", 1, 2.0);
    q.set("a", 3, 4.0);
    EXPECT_EQ(q.bestAction("a"), 3);
}

TEST(QTableTest, TiesGoToTheFirstAction) {
    QTable q(5);
    q.set("a", 2, 1.0);
    q.set("a", 4, 1.0);
    EXPECT_EQ(q.bestAction("a"), 2);
}

TEST(QTableTest, UnseenStatesPickActionZero) {
    QTable q(5);
    EXPECT_EQ(q.bestAction("never seen"), 0);
    EXPECT_DOUBLE_EQ(q.maxValue("never seen"), 0.0);
}

TEST(QTableTest, NegativeValuesAreFine) {
    QTable q(5);
    for (int a = 0; a < 5; a++) {
        q.set("a", a, -10.0 + a);
    }
    EXPECT_EQ(q.bestAction("a"), 4);
    EXPECT_DOUBLE_EQ(q.maxValue("a"), -6.0);
}

TEST(QTableTest, MaxValueIsTheValueOfTheBestAction) {
    QTable q(5);
    q.set("a", 0, 3.0);
    q.set("a", 2, 7.5);
    EXPECT_DOUBLE_EQ(q.maxValue("a"), 7.5);
}
```

- Reading must **never** add a row. Only `set` does. Otherwise the table would fill up with states the agent only peeked at.
- An unseen state acts like a row of zeros.

## Declare the class

Create `qtable.h`:

```cpp file=qtable.h
#pragma once

#include <map>
#include <string>
#include <vector>

class QTable {
public:
    explicit QTable(int actionTotal);

    int actionCount() const;
    int stateCount() const;

    double get(const std::string& state, int action) const;
    void set(const std::string& state, int action, double value);

    double maxValue(const std::string& state) const;
    int bestAction(const std::string& state) const;

    void update(const std::string& state, int action, double reward,
                const std::string& nextState, bool done, double alpha, double gamma);

private:
    int actions;
    std::map<std::string, std::vector<double>> table;
};
```

- `std::map<std::string, std::vector<double>>` maps a state's text to its row of numbers.
- `get`, `maxValue` and `bestAction` only look, so they are `const`. `set` and `update` change the table.
- `update` takes the four facts from the step, plus `done`, `alpha` and `gamma`.

```check
file qtable.h -- Create a file called qtable.h in the project folder.
contains qtable.h "#pragma once" -- Start the header with #pragma once.
matches qtable.h "explicit\s+QTable\s*\(\s*int\s+\w+\s*\)\s*;" -- Declare explicit QTable(int actionTotal);
matches qtable.h "double\s+get\s*\(\s*const\s+std::string\s*&\s*\w+\s*,\s*int\s+\w+\s*\)\s*const\s*;" -- Declare double get(const std::string& state, int action) const;
matches qtable.h "void\s+set\s*\(\s*const\s+std::string\s*&\s*\w+\s*,\s*int\s+\w+\s*,\s*double\s+\w+\s*\)\s*;" -- Declare void set(const std::string& state, int action, double value);
matches qtable.h "int\s+bestAction\s*\(\s*const\s+std::string\s*&\s*\w+\s*\)\s*const\s*;" -- Declare int bestAction(const std::string& state) const;
matches qtable.h "std::map<std::string,\s*std::vector<double>>\s+table\s*;" -- Add a private member: std::map<std::string, std::vector<double>> table;
```

## Reading and writing cells

Create `qtable.cpp` with the constructor, `get` and `set`:

```cpp file=qtable.cpp
#include "qtable.h"

QTable::QTable(int actionTotal) : actions(actionTotal) {}

int QTable::actionCount() const { return actions; }

int QTable::stateCount() const {
    return static_cast<int>(table.size());
}

double QTable::get(const std::string& state, int action) const {
    if (action < 0 || action >= actions) {
        return 0.0;
    }
    auto found = table.find(state);
    if (found == table.end()) {
        return 0.0;
    }
    return found->second[action];
}

void QTable::set(const std::string& state, int action, double value) {
    if (action < 0 || action >= actions) {
        return;
    }
    std::vector<double>& row = table[state];
    if (row.empty()) {
        row.assign(actions, 0.0);
    }
    row[action] = value;
}
```

- `table.find(state)` looks for a key **without** adding one. It gives back an **iterator**, as `begin()` did in lesson 4.1. If the key isn't there, it gives back `table.end()`, the "one past the last" marker. So `found == table.end()` means "not found".
- `auto` tells the compiler to work out the type itself. The iterator's real type is long and not interesting.
- A map entry is a pair. `found->second` is the value, the row of numbers. `->` is the dot operator for an iterator. The key would be `found->first`.
- `table[state]` is different: on a map it **creates** an empty entry if the key is missing. That is what `set` wants.
- `std::vector<double>& row` is a reference to the row inside the map, so changes to `row` change the table itself.
- A new row is empty, so `row.assign(actions, 0.0)` fills it with `actions` zeros. Then `row[action] = value;` changes one cell.
- Both functions refuse an action outside `0` to `actions - 1`. Indexing outside a vector is undefined behaviour, as in lesson 2.2.

```check
file qtable.cpp -- Create a file called qtable.cpp in the project folder.
contains qtable.cpp "#include \"qtable.h\"" -- Include your own header with #include "qtable.h".
contains qtable.cpp "table.find(state)" -- Look for the row without adding one: table.find(state)
contains qtable.cpp "row.assign(actions, 0.0)" -- Fill a new row with zeros using row.assign(actions, 0.0);
run "g++ -std=c++17 -c qtable.cpp -o qtable.o" label="qtable.cpp compiles" -- Fix the compiler errors shown. Every function needs QTable:: before its name.
```

## Pick the best action

Now the two functions that look at a whole row. Add them to the end of `qtable.cpp`:

```cpp file=qtable.cpp
#include "qtable.h"

QTable::QTable(int actionTotal) : actions(actionTotal) {}

int QTable::actionCount() const { return actions; }

int QTable::stateCount() const {
    return static_cast<int>(table.size());
}

double QTable::get(const std::string& state, int action) const {
    if (action < 0 || action >= actions) {
        return 0.0;
    }
    auto found = table.find(state);
    if (found == table.end()) {
        return 0.0;
    }
    return found->second[action];
}

void QTable::set(const std::string& state, int action, double value) {
    if (action < 0 || action >= actions) {
        return;
    }
    std::vector<double>& row = table[state];
    if (row.empty()) {
        row.assign(actions, 0.0);
    }
    row[action] = value;
}

int QTable::bestAction(const std::string& state) const {
    int best = 0;
    for (int a = 1; a < actions; a++) {
        if (get(state, a) > get(state, best)) {
            best = a;
        }
    }
    return best;
}

double QTable::maxValue(const std::string& state) const {
    return get(state, bestAction(state));
}
```

- `bestAction` starts by assuming action 0 is the best. It then looks at the others, and changes its mind only when one is **strictly bigger** (`>`). That is why ties go to the first.
- An unseen state has all zeros, so action 0 wins. The agent starts out always picking Up. That is poor, but fine: lesson 6.3 adds exploring.
- `maxValue` is the value of the best action, so it just calls the other two functions.

```predict
question: A row holds -3, -1, -1, -2, -5 for actions 0 to 4. What does bestAction return?
answer: 1
explain: The highest value is -1. Actions 1 and 2 tie on it, and the first one wins because only a strictly bigger value changes the choice.
tolerance: 0
```

```check
matches qtable.cpp "int\s+QTable::bestAction\s*\(\s*const\s+std::string\s*&\s*\w+\s*\)\s*const" -- Define int QTable::bestAction(const std::string& state) const { ... }
matches qtable.cpp "double\s+QTable::maxValue\s*\(\s*const\s+std::string\s*&\s*\w+\s*\)\s*const" -- Define double QTable::maxValue(const std::string& state) const { ... }
run "g++ -std=c++17 -c qtable.cpp -o qtable.o" label="qtable.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_qtable.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp -o test_qtable" label="tests/test_qtable.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qtable" label="The table reads and writes correctly" -- A test failed. Read which one. Do you only change best when a value is strictly greater? Does reading ever add a row?
```

## Read the tests for learning

Here are the tests for `update`, given to you:

```cpp file=tests/test_qupdate.cpp provided
#include "minitest.h"
#include "../qtable.h"

TEST(QUpdateTest, MovesHalfwayToTheTarget) {
    QTable q(5);
    q.update("s", 3, 10.0, "t", false, 0.5, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 3), 5.0);
}

TEST(QUpdateTest, UsesTheBestNextValue) {
    QTable q(5);
    q.set("s", 3, 5.0);
    q.set("t", 1, 20.0);
    q.update("s", 3, 10.0, "t", false, 0.5, 0.9);
    EXPECT_NEAR(q.get("s", 3), 16.5, 1e-9);
}

TEST(QUpdateTest, DoneIgnoresTheFuture) {
    QTable q(5);
    q.set("t", 1, 20.0);
    q.update("s", 3, 10.0, "t", true, 0.5, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 3), 5.0);
}

TEST(QUpdateTest, NegativeRewardsLowerTheValue) {
    QTable q(5);
    q.update("s", 0, -1.0, "t", false, 0.5, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 0), -0.5);
}

TEST(QUpdateTest, AlphaOneJumpsToTheTarget) {
    QTable q(5);
    q.set("t", 2, 4.0);
    q.update("s", 0, 3.0, "t", false, 1.0, 0.5);
    EXPECT_DOUBLE_EQ(q.get("s", 0), 5.0);
}

TEST(QUpdateTest, AlphaZeroChangesNothing) {
    QTable q(5);
    q.set("s", 3, 7.0);
    q.update("s", 3, 100.0, "t", false, 0.0, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 3), 7.0);
}

TEST(QUpdateTest, OnlyOneCellChanges) {
    QTable q(5);
    q.update("s", 3, 10.0, "t", false, 0.5, 0.9);
    EXPECT_DOUBLE_EQ(q.get("s", 0), 0.0);
    EXPECT_DOUBLE_EQ(q.get("s", 4), 0.0);
    EXPECT_EQ(q.stateCount(), 1);
}

TEST(QUpdateTest, RepeatedUpdatesApproachTheTarget) {
    QTable q(5);
    for (int i = 0; i < 10; i++) {
        q.update("s", 0, 10.0, "t", true, 0.5, 0.9);
    }
    EXPECT_NEAR(q.get("s", 0), 9.990234375, 1e-9);
}
```

- In `UsesTheBestNextValue`: the target is `10 + 0.9 * 20 = 28`. The cell is `5`, so it moves to `5 + 0.5 * (28 - 5) = 16.5`.
- `OnlyOneCellChanges` also checks that the **next** state was not added to the table. Looking at it doesn't create it.
- The last test shows learning in action. Each update closes half the gap to 10, so after ten updates the value is within 1/1024 of the target.

## Learn from one step

Add `update` to the end of `qtable.cpp`:

```cpp file=qtable.cpp
#include "qtable.h"

QTable::QTable(int actionTotal) : actions(actionTotal) {}

int QTable::actionCount() const { return actions; }

int QTable::stateCount() const {
    return static_cast<int>(table.size());
}

double QTable::get(const std::string& state, int action) const {
    if (action < 0 || action >= actions) {
        return 0.0;
    }
    auto found = table.find(state);
    if (found == table.end()) {
        return 0.0;
    }
    return found->second[action];
}

void QTable::set(const std::string& state, int action, double value) {
    if (action < 0 || action >= actions) {
        return;
    }
    std::vector<double>& row = table[state];
    if (row.empty()) {
        row.assign(actions, 0.0);
    }
    row[action] = value;
}

int QTable::bestAction(const std::string& state) const {
    int best = 0;
    for (int a = 1; a < actions; a++) {
        if (get(state, a) > get(state, best)) {
            best = a;
        }
    }
    return best;
}

double QTable::maxValue(const std::string& state) const {
    return get(state, bestAction(state));
}

void QTable::update(const std::string& state, int action, double reward,
                    const std::string& nextState, bool done, double alpha, double gamma) {
    double future = 0.0;
    if (!done) {
        future = maxValue(nextState);
    }

    double target = reward + gamma * future;
    double old = get(state, action);
    set(state, action, old + alpha * (target - old));
}
```

This is the whole of Q-learning, in about ten lines:

- `future` is what the agent expects from the next state: the best value in its row. If the episode just ended, there is no next state, so `future` stays `0.0`.
- `target` is `reward + gamma * future`, the better guess for this cell.
- `old` is what the cell holds now, `target - old` is how wrong it was, and `alpha * (...)` is the fraction the cell moves. `set` writes the new value.
- The parameter is called `gamma` and the formula says γ. Don't confuse it with `actions`, which is a member.

```predict
question: A cell holds 5. The reward is 10, the next state's best value is 20, alpha is 0.5, gamma is 0.9, and the episode is not over. What is the cell afterwards?
answer: 16.5
explain: The target is 10 + 0.9 * 20 = 28. The cell moves halfway from 5 towards 28: 5 + 0.5 * 23 = 16.5.
tolerance: 0.01
```

```check
matches qtable.cpp "void\s+QTable::update\s*\(" -- Define void QTable::update(...) { ... }
contains qtable.cpp "if (!done)" -- Use the future value only if (!done).
contains qtable.cpp "gamma * future" -- Compute the target as reward + gamma * future.
run "g++ -std=c++17 -c qtable.cpp -o qtable.o" label="qtable.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_qupdate.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp -o test_qupdate" label="tests/test_qupdate.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qupdate" label="The update rule is correct" -- A test failed. Read which one. Is the target reward + gamma * future? Does the cell move by alpha * (target - old), not alpha * target?
run "g++ -std=c++17 tests/test_qtable.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp -o test_qtable" label="tests/test_qtable.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qtable" label="The table still passes" -- Your changes broke an earlier test.
```

## Your turn: what do you know?

Give `QTable` two more functions:

- `bool knows(const std::string& state) const` is `true` if the table has a row for that state. Reading with `get` doesn't count: only `set` or `update` adds a row.
- `void clear()` forgets everything. Afterwards `stateCount()` is `0`, and the table still has the same number of actions.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_qtable_extra.cpp provided
#include "minitest.h"
#include "../qtable.h"

TEST(QTableExtraTest, UnknownAtTheStart) {
    QTable q(5);
    EXPECT_FALSE(q.knows("a"));
}

TEST(QTableExtraTest, SettingMakesAStateKnown) {
    QTable q(5);
    q.set("a", 0, 1.0);
    EXPECT_TRUE(q.knows("a"));
    EXPECT_FALSE(q.knows("b"));
}

TEST(QTableExtraTest, ReadingDoesNotMakeAStateKnown) {
    QTable q(5);
    q.get("a", 0);
    EXPECT_FALSE(q.knows("a"));
}

TEST(QTableExtraTest, UpdatingMakesTheFirstStateKnownOnly) {
    QTable q(5);
    q.update("a", 1, 1.0, "b", false, 0.5, 0.9);
    EXPECT_TRUE(q.knows("a"));
    EXPECT_FALSE(q.knows("b"));
}

TEST(QTableExtraTest, ClearForgetsEverything) {
    QTable q(5);
    q.set("a", 0, 1.0);
    q.set("b", 1, 2.0);
    q.clear();
    EXPECT_EQ(q.stateCount(), 0);
    EXPECT_FALSE(q.knows("a"));
    EXPECT_DOUBLE_EQ(q.get("b", 1), 0.0);
    EXPECT_EQ(q.actionCount(), 5);
}
```

Your changes go in `qtable.h` and `qtable.cpp`. Don't change the tests.

```check
matches qtable.h "bool\s+knows\s*\(\s*const\s+std::string\s*&\s*\w+\s*\)\s*const\s*;" -- Declare bool knows(const std::string& state) const; in qtable.h.
matches qtable.h "void\s+clear\s*\(\s*\)\s*;" -- Declare void clear(); in qtable.h.
run "g++ -std=c++17 -c qtable.cpp -o qtable.o" label="qtable.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_qtable_extra.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp -o test_qtable_extra" label="tests/test_qtable_extra.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qtable_extra" label="knows and clear work" -- A test failed. Read which one. Does knows use find so that it adds nothing? Does clear empty the map?
run "g++ -std=c++17 tests/test_qtable.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp -o test_qtable" label="tests/test_qtable.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qtable" label="The table still passes" -- Your changes broke an earlier test.
run "g++ -std=c++17 tests/test_qupdate.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp -o test_qupdate" label="tests/test_qupdate.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_qupdate" label="The update rule still passes" -- Your changes broke an earlier test.
```

```hints
nudge: You already wrote code that asks "is this key in the map?" without adding it.
concept: table.find(state) gives table.end() when the key is missing. A vector, and a map, both have a clear() function that removes everything they hold.
shape: knows is one line comparing find's result with end(). clear is one line that calls clear() on the member.
answer: In qtable.h, add to the public section:
~~~cpp
    bool knows(const std::string& state) const;
    void clear();
~~~
In qtable.cpp, add:
~~~cpp
bool QTable::knows(const std::string& state) const {
    return table.find(state) != table.end();
}

void QTable::clear() {
    table.clear();
}
~~~
```
