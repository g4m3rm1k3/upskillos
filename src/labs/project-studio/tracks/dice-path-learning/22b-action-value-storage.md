---
title: A22b — Store separate estimates for Roll and Bank
track: C++ Games — Learn from Decisions
trackOrder: 4.4
runtime: cpp
console: true
---

**Outcome:** Store separate action estimates, preserve neighboring cells, and query only legal choices without exposing mutable storage.

**Recall before looking at code:** Which three numbers identify a row, and why is an empty-pot Bank not a choice?

At observation 2,3,4, imagine an estimate of -0.5 for Roll and 0.25 for Bank. Those are deliberately assigned demonstration values, not results of training. We want two cells in row 328, with all neighboring rows unchanged. A Q-value, or action value, estimates future accumulated reward for one observation and first action under the learning formulation. It is neither the current pot nor an immediate die average.

## Give the two numbers a meaning

With our terminal rewards and no discount yet, the return (accumulated reward over the remaining episode) is +1 for a win or -1 for a loss. Its expected value is probability of winning minus probability of losing when episodes finish. An estimate of 0.25 is therefore not a 25% win probability. Future lessons teach the correction rule and discounting. Here we only store numbers and inspect legal candidates.

```predict
question: An unvisited cell begins at zero. Does that prove its action wins half the matches?
choice: No
choice: Yes
answer: No
explain: Zero is our initialization choice, not measured evidence.
```


| Row | Roll, column 0 | Bank, column 1 |
|---|---|---|
| 328: own 2, other 3, pot 4 | -0.5 | 0.25 |
| 329: own 2, other 3, pot 5 | 0 | 0 |

The **table** is a collection of rows; each row holds one estimate per named action. These columns do not make actions legal. At pot zero, Bank still has a reserved cell but Game rejects that action.

## Name a concrete row type and copy it

Create explore/q_row.cpp. The using declaration gives an existing type another name: QRow means exactly `std::array<double, 2>`. It creates no object. The template arguments between angle brackets supply the element type double and fixed size two. The two braces initialize the two cells. copy is a distinct array.

**Edit `explore/q_row.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/q_row.cpp
#include <array>
#include <iostream>
using QRow = std::array<double, 2>;
int main() {
    QRow row{0.0, 0.0};
    QRow copy = row;
    copy.at(0) = -0.5;
    std::cout << "original=" << row.at(0) << " copy=" << copy.at(0) << '\n';
    return 0;
}
```

Run the checks. Expect original=0 copy=-0.5. Writing a copied row would silently lose a table update. This is the A06 copy experiment with an entire row.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_row.cpp -o q_row"
run "./q_row" stdout="original=0 copy=-0.5"
```

## Use a reference when the stored row must change

Add & to the declaration in explore/q_row.cpp. Despite the old name copy, the variable now aliases row. Predict both printed values before running; then explain why naming a variable copy does not decide its storage behavior.

**Edit `explore/q_row.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/q_row.cpp
#include <array>
#include <iostream>
using QRow = std::array<double, 2>;
int main() {
    QRow row{0.0, 0.0};
    QRow& copy = row;
    copy.at(0) = -0.5;
    std::cout << "original=" << row.at(0) << " copy=" << copy.at(0) << '\n';
    return 0;
}
```

Expect original=-0.5 copy=-0.5. The method that writes our table will need a reference; the public query will return a number by value.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_row.cpp -o q_row"
run "./q_row" stdout="original=-0.5 copy=-0.5"
```

## Measure a search before choosing storage {#count-search-work}

Suppose we store only previously seen row IDs in a list. Finding a requested ID can compare entries one at a time. This algorithm is **linear search**. Create explore/search_work.cpp and count comparisons explicitly; this counts an operation, not elapsed seconds.

**Edit `explore/search_work.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/search_work.cpp
#include <iostream>
#include <vector>
int main() {
    std::vector<int> ids{0, 1, 2, 3};
    int wanted = 3;
    int comparisons = 0;
    for (int id : ids) {
        ++comparisons;
        if (id == wanted) break;
    }
    std::cout << "comparisons=" << comparisons << '\n';
    return 0;
}
```

Expect comparisons=4 for the last entry. Search for zero, then for absent ID nine. Predict one and four comparisons respectively. Append IDs four through seven and search for seven: the worst case doubles to eight. Restore the four-entry list and wanted=3. The amount of worst-case search work grows with the list length.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/search_work.cpp -o search_work"
run "./search_work" stdout="comparisons=4"
```

## Compare an address lookup with a scan {#direct-versus-search}

Here each stored ID equals its position, so a validated ID can directly select its slot. Add the direct read after the scan in explore/search_work.cpp. That shortcut would be wrong for a compact list {7, 19, 80}: ID nineteen is not position nineteen.

**Edit `explore/search_work.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/search_work.cpp
#include <iostream>
#include <vector>
int main() {
    std::vector<int> ids{0, 1, 2, 3};
    int wanted = 3;
    int comparisons = 0;
    for (int id : ids) {
        ++comparisons;
        if (id == wanted) break;
    }
    std::cout << "comparisons=" << comparisons << '\n';
    if (wanted < 0 || wanted >= 4) return 1;
    std::cout << "direct=" << ids.at(wanted) << '\n';
    return 0;
}
```

Expect direct=3 after comparisons=4. **Time complexity** describes how operation count grows with input size. For n entries, a scan may inspect n: O(n). A direct array/vector lookup needs a bounded amount of indexing work: O(1). These labels describe lookup, not constructing or copying the vector; zero-initializing n rows still does O(n) work. O(1) does not mean one CPU instruction.

**Space complexity** describes storage growth. A direct table reserves every address, even unused ones. A compact list reserves only recorded entries, but our simple search must scan them. Neither choice always wins.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/search_work.cpp -o search_work"
run "./search_work" stdout="comparisons=4\ndirect=3"
```

## Defend a representation and its boundary {#representation-decision}

Before reading our choice, write two candidate designs: a table with every possible row, and a list of only visited rows searched one at a time. Which fits a small fixed address range queried repeatedly? Which fits ten visited IDs spread across a billion possible IDs? State one cost of your choice for each case.

For Dice Duel we choose direct storage: the fixed target gives a small bounded range, and repeated lookup is simple. Each address owns two values. If every coordinate range doubled, there would be 2 × 2 × 2 = 8 times as many rows. That growth explains why the same design may fail for a larger observation. We use a vector to create the rows at construction and keep them owned by the agent; it never grows in this lesson. A fixed array could also work here. Neither container is an architecture by itself.

Responsibility trace: Game owns legality; Observation translates a decision into coordinates; QAgent owns estimates. A proposal to let the UI edit raw rows bypasses those boundaries. A proposal to make rowIndex roll dice mixes addressing with changing the game. Explain which component should change if the visual display changes, and which if the observation gains a coordinate. Keep this short decision note for the next independent task.

## Build three rows before building the game table {#three-row-experiment}

Create explore/three_rows.cpp. The vector constructor takes a count, three, and an initial row to copy into each position. size() reports how many rows exist. First .at(1) selects a row; then .at(0) selects its first number. chosen borrows row one.

```predict
question: Does writing row one also change row two?
choice: No
choice: Yes
answer: No
explain: The constructor copies the row value into separate elements; it does not store three aliases.
```


**Edit `explore/three_rows.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/three_rows.cpp
#include <array>
#include <vector>
#include <iostream>
using QRow = std::array<double, 2>;
int main() {
    std::vector<QRow> rows(3, QRow{0.0, 0.0});
    std::cout << "rows=" << rows.size() << '\n';
    QRow& chosen = rows.at(1);
    chosen.at(0) = -0.5;
    std::cout << "chosen=" << rows.at(1).at(0) << '\n';
    std::cout << "neighbor=" << rows.at(2).at(0) << '\n';
    return 0;
}
```

Expect rows=3, chosen=-0.5 and neighbor=0. Draw three boxes with two cells each and follow the two selections. Change the count to four and read row three. Restore three. This experiment explains the mechanism before the production constructor scales it up.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/three_rows.cpp -o three_rows"
run "./three_rows" stdout="rows=3\nchosen=-0.5\nneighbor=0"
```

## Translate actions independently of table storage {#action-column-experiment}

Create explore/action_columns.cpp. A named action and a numeric column are different types of information. This function explicitly translates Roll to zero and Bank to one. It needs Game.hpp for the enum declaration but calls no Game method, so its build needs no Game.cpp.

**Edit `explore/action_columns.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/action_columns.cpp
#include <iostream>
#include <stdexcept>
#include "dice/Game.hpp"
int column(dice::Action action) {
    if (action == dice::Action::Roll) return 0;
    if (action == dice::Action::Bank) return 1;
    throw std::invalid_argument("unknown action");
}
int main() {
    std::cout << column(dice::Action::Roll) << "," << column(dice::Action::Bank) << '\n';
    return 0;
}
```

Expect 0,1. Swap the two return values, predict the output, then restore. This isolates a mapping bug from an observation-address bug.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/action_columns.cpp -o action_columns"
run "./action_columns" stdout="0,1"
```

## Keep a representation helper inside its source file {#source-local-helper}

Wrap column in namespace { ... } in explore/action_columns.cpp. This is an **unnamed namespace**: names inside it belong to this translation unit. The main in this same source can still call column. Another source cannot link to this helper as a shared public function. QAgent callers should depend on named actions, not its private column numbering.

**Edit `explore/action_columns.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/action_columns.cpp
#include <iostream>
#include <stdexcept>
#include "dice/Game.hpp"
namespace {
int column(dice::Action action) {
    if (action == dice::Action::Roll) return 0;
    if (action == dice::Action::Bank) return 1;
    throw std::invalid_argument("unknown action");
}
}
int main() {
    std::cout << column(dice::Action::Roll) << "," << column(dice::Action::Bank) << '\n';
    return 0;
}
```

Recompile and run: output is still 0,1. This edit changes the helper’s visibility, not the algorithm. Later the QAgent source will own this helper for the same reason.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/action_columns.cpp -o action_columns"
run "./action_columns" stdout="0,1"
```

## Give the table one owner

Create include/learning/QAgent.hpp. `std::vector<QRow>` holds rows whose element type is our array alias. It is a nested container: choose a row, then a column. QAgent owns the vector as a private member and will initialize it in its constructor. value is a const query returning a double copy.

**Edit `include/learning/QAgent.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/learning/QAgent.hpp
#ifndef LEARNING_QAGENT_HPP
#define LEARNING_QAGENT_HPP
#include <array>
#include <vector>
#include "learning/Observation.hpp"
namespace learning {
using QRow = std::array<double, 2>;
class QAgent {
private:
    std::vector<QRow> rows_;
public:
    QAgent();
    double value(const Observation& seen, dice::Action action) const;
};
}
#endif
```

Ownership: each QAgent owns its vector, which owns its row values. Ordinary member destruction releases that storage automatically. Copying a QAgent copies its rows independently. A local reference used during a method call borrows one row; none escapes through this interface. The vector will not resize in this lesson.

```check
file include/learning/QAgent.hpp
```

## Initialize all rows and read one checked cell

First create src/learning/QAgent.cpp with only the constructor. The colon initializes rows_ before the empty constructor body runs, revisiting A11. Its count-and-value arguments are the same as the three-row experiment; the count is now the product of the three coordinate widths.

**Edit `src/learning/QAgent.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/QAgent.cpp
#include "learning/QAgent.hpp"
learning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}
```

This is the construction half of the milestone. Compile to an object. value is declared but not defined yet, so do not link a caller that uses it until the next step.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/learning/QAgent.cpp -o q_agent.o"
```

## Combine the already-tested row and column selections {#checked-query-integration}

Add the source-local column helper from the action experiment, then define value below the constructor. Read rows_.at(rowIndex(seen)).at(column(action)) from left to right: compute the validated address, select its row, translate the action, then select its cell.

**Edit `src/learning/QAgent.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/QAgent.cpp
#include "learning/QAgent.hpp"
#include <stdexcept>
namespace {
int column(dice::Action action) {
    if (action == dice::Action::Roll) return 0;
    if (action == dice::Action::Bank) return 1;
    throw std::invalid_argument("unknown action");
}
}
learning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}
double learning::QAgent::value(const Observation& seen, dice::Action action) const {
    return rows_.at(rowIndex(seen)).at(column(action));
}
```

Each operation has now run separately. The const method returns a double copy. Compile this definition, then use the next caller to observe both initialized values together.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/learning/QAgent.cpp -o q_agent.o"
```

## Observe initial estimates

Create explore/q_probe.cpp. Query both columns of the same observation. The two zeros mean no experience has been written; no simulation ran during construction.

**Edit `explore/q_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/q_probe.cpp
#include <iostream>
#include "learning/QAgent.hpp"
int main() {
    learning::QAgent agent;
    learning::Observation seen{2, 3, 4};
    std::cout << "roll=" << agent.value(seen, dice::Action::Roll) << '\n';
    std::cout << "bank=" << agent.value(seen, dice::Action::Bank) << '\n';
    return 0;
}
```

Compile and run with the checks below. Expect roll=0 and bank=0.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="roll=0\nbank=0"
```

## Declare a deliberate storage operation

Add store to QAgent’s public declarations. This is an explicit write operation for experiments and the later learning code, not an automatic learning algorithm. For now the caller supplies a finite numeric estimate; there is no model-file loader or arbitrary numeric input here. Observation and action validation must happen before mutation.

**Edit `include/learning/QAgent.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/learning/QAgent.hpp
#ifndef LEARNING_QAGENT_HPP
#define LEARNING_QAGENT_HPP
#include <array>
#include <vector>
#include "learning/Observation.hpp"
namespace learning {
using QRow = std::array<double, 2>;
class QAgent {
private:
    std::vector<QRow> rows_;
public:
    QAgent();
    void store(const Observation& seen, dice::Action action, double estimate);
    double value(const Observation& seen, dice::Action action) const;
};
}
#endif
```

The existing read-only probe remains runnable. A play caller will use const queries; it cannot mutate through their returned values.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="roll=0\nbank=0"
```

## Write the actual row instead of a temporary copy

Append store in src/learning/QAgent.cpp. QRow& row refers to the selected stored array, just as the tiny experiment did. column validates the action before the assignment. Rejected coordinates or actions therefore leave all cells unchanged.

**Edit `src/learning/QAgent.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/QAgent.cpp
#include "learning/QAgent.hpp"
#include <stdexcept>
namespace {
int column(dice::Action action) {
    if (action == dice::Action::Roll) return 0;
    if (action == dice::Action::Bank) return 1;
    throw std::invalid_argument("unknown action");
}
}
learning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}
double learning::QAgent::value(const Observation& seen, dice::Action action) const {
    return rows_.at(rowIndex(seen)).at(column(action));
}
void learning::QAgent::store(const Observation& seen, dice::Action action, double estimate) {
    QRow& row = rows_.at(rowIndex(seen));
    row.at(column(action)) = estimate;
}
```

Rebuild the existing probe. It still prints zeros because it has not called store yet. Merely defining an operation does not invoke it.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="roll=0\nbank=0"
```

## Observe separate actions and a preserved neighbor

Add two stores before the reads and one neighboring-row query afterwards. The braced observation in value constructs a temporary Observation for the read-only call. It lives long enough for that call; the query retains no reference.

**Edit `explore/q_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/q_probe.cpp
#include <iostream>
#include "learning/QAgent.hpp"
int main() {
    learning::QAgent agent;
    learning::Observation seen{2, 3, 4};
    agent.store(seen, dice::Action::Roll, -0.5);
    agent.store(seen, dice::Action::Bank, 0.25);
    std::cout << "roll=" << agent.value(seen, dice::Action::Roll) << '\n';
    std::cout << "bank=" << agent.value(seen, dice::Action::Bank) << '\n';
    std::cout << "neighbor=" << agent.value({2, 3, 5}, dice::Action::Roll) << '\n';
    return 0;
}
```

Expect roll=-0.5, bank=0.25 and neighbor=0. No correction, reward or training occurs: store replaces exactly the selected number.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="roll=-0.5\nbank=0.25\nneighbor=0"
```

## Ask for the best legal estimate

Declare bestValue in QAgent.hpp. A maximum is the largest candidate value. This query accepts the real Game so legality still comes from Game::legal. It returns a value, not a chosen action; tie-breaking and exploration belong to A23.

**Edit `include/learning/QAgent.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/learning/QAgent.hpp
#ifndef LEARNING_QAGENT_HPP
#define LEARNING_QAGENT_HPP
#include <array>
#include <vector>
#include "learning/Observation.hpp"
namespace learning {
using QRow = std::array<double, 2>;
class QAgent {
private:
    std::vector<QRow> rows_;
public:
    QAgent();
    double bestValue(const dice::Game& game) const;
    void store(const Observation& seen, dice::Action action, double estimate);
    double value(const Observation& seen, dice::Action action) const;
};
}
#endif
```

No caller uses bestValue yet. Keep the storage probe passing while adding this interface.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="roll=-0.5\nbank=0.25\nneighbor=0"
```

## Start from a legal candidate, even if it is negative

Append bestValue. observe rejects finished and opponent-turn games. Roll is always legal at the remaining unfinished agent decisions. Start best at its stored value, then consider Bank only when Game says it is legal. Starting best at zero would invent a candidate when both real estimates are negative.

**Edit `src/learning/QAgent.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/QAgent.cpp
#include "learning/QAgent.hpp"
#include <stdexcept>
namespace {
int column(dice::Action action) {
    if (action == dice::Action::Roll) return 0;
    if (action == dice::Action::Bank) return 1;
    throw std::invalid_argument("unknown action");
}
}
learning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}
double learning::QAgent::value(const Observation& seen, dice::Action action) const {
    return rows_.at(rowIndex(seen)).at(column(action));
}
void learning::QAgent::store(const Observation& seen, dice::Action action, double estimate) {
    QRow& row = rows_.at(rowIndex(seen));
    row.at(column(action)) = estimate;
}
double learning::QAgent::bestValue(const dice::Game& game) const {
    Observation seen = observe(game);
    double best = value(seen, dice::Action::Roll);
    if (game.legal(dice::Action::Bank)) {
        double bank = value(seen, dice::Action::Bank);
        if (bank > best) best = bank;
    }
    return best;
}
```

Keep the storage probe passing. The next step will specifically exercise legality; reading arbitrary cells in a diagnostic is not permission to play their actions.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="roll=-0.5\nbank=0.25\nneighbor=0"
```

## Make an illegal cell tempting on purpose

Add a new Game and demonstration values for its row. Its pot is empty. Before running, predict whether legal best prints -0.5, zero or 0.75, and justify which candidates exist.

**Edit `explore/q_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/q_probe.cpp
#include <iostream>
#include "learning/QAgent.hpp"
int main() {
    learning::QAgent agent;
    learning::Observation seen{2, 3, 4};
    agent.store(seen, dice::Action::Roll, -0.5);
    agent.store(seen, dice::Action::Bank, 0.25);
    std::cout << "roll=" << agent.value(seen, dice::Action::Roll) << '\n';
    std::cout << "bank=" << agent.value(seen, dice::Action::Bank) << '\n';
    std::cout << "neighbor=" << agent.value({2, 3, 5}, dice::Action::Roll) << '\n';
    dice::Game game;
    agent.store({0, 0, 0}, dice::Action::Roll, -0.5);
    agent.store({0, 0, 0}, dice::Action::Bank, 0.75);
    std::cout << "legal best=" << agent.bestValue(game) << '\n';
    return 0;
}
```

| Candidate | Stored estimate | Legal now? | Included? |
|---|---|---|---|
| Roll | -0.5 | yes | yes |
| Bank | 0.75 | no, empty pot | no |

Expect legal best=-0.5. An unused cell can contain a high number without creating a legal action.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="legal best=-0.5"
```

## Try it — Find the copied-row and invented-zero bugs

Temporarily remove & in store, rebuild, and run q_probe. Explain why the written estimates disappear even though compilation succeeds. Restore it. Next start best at 0.0 instead of the Roll estimate: the empty-pot probe must expose the invented candidate. Restore it. Finally try assigning to agent.value(seen, dice::Action::Roll). Read the compiler diagnostic: the returned double is a value, not writable access to the stored cell. Remove the assignment and rebuild.



## Your turn — Audit storage through its public interface

Create tests/q_storage.cpp independently; no body is supplied. Return nonzero at the first mismatch and print storage passed only after all cases pass. Use the public methods; do not expose rows_.

| Case | Required evidence |
|---|---|
| Fresh agent | both columns zero for every admitted observation |
| Store Roll=-0.5, Bank=0.25 at 3,5,2 | both values retained; rows 3,5,3 and 3,6,2 unchanged |
| Copy agent, write 0.75 in the copy | original Roll remains -0.5 |
| New Game, Roll=-0.5, illegal Bank=0.75 | bestValue is -0.5 |
| After Roll 2, estimates -0.5 and -0.25 | bestValue is -0.25, not zero |
| Raise that Roll estimate to 0.5 | bestValue is 0.5 |
| Store with own=12 | invalid_argument; existing values unchanged |
| Query opponent turn, then a finished match | each throws invalid_argument |

These halves and quarters are exactly representable in binary, so direct equality suffices for this storage test. Later computed updates will need a tolerance. The test accepts no terminal input.

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/q_storage.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe
./q_probe
```

```hints
nudge: Separate zero initialization, writes, copies, legality and rejection.
concept: Build game positions through apply. A new game has only Roll; a roll of two admits Bank.
shape: Reuse the three-coordinate loops from A22, then explicit comparisons and rejection flags from A21. Observe the original after mutating a copy.
```

Test your tests: remove & from store, remove the Bank legality guard, and start best at zero, one defect at a time. Each must fail. Restore each before proceeding. Also explain the row/column selection with a different triple and why a const double-returning query does not expose table storage. Recover with q_row.cpp if copy and reference behavior is unclear. Automated checks do not grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/q_storage.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="storage passed"
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/q_storage.cpp src/dice/Game.cpp src/learning/Observation.cpp  -o missing_q" exit=1
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/q_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp src/learning/QAgent.cpp -o q_probe"
run "./q_probe" stdout="legal best=-0.5"
```

## Build the storage milestone with the existing project

In CMakeLists.txt add Observation.cpp and QAgent.cpp to learning_rules, then register q_storage_tests. The existing reward, decision and game tests remain part of the build. The terminal opponent still uses its fixed policy: allocating this table has not trained it.

**Edit `CMakeLists.txt`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cmake file=CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(DiceLab LANGUAGES CXX)
add_library(dice_rules STATIC src/dice/Score.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp)
target_include_directories(dice_rules PUBLIC include)
target_compile_features(dice_rules PUBLIC cxx_std_20)
add_executable(score_demo apps/score_demo.cpp)
target_link_libraries(score_demo PRIVATE dice_rules)
enable_testing()
add_executable(score_contract tests/shared_score.cpp)
target_link_libraries(score_contract PRIVATE dice_rules)
add_test(NAME score_contract COMMAND score_contract)
add_executable(score_boundaries tests/score_boundaries.cpp)
target_link_libraries(score_boundaries PRIVATE dice_rules)
add_test(NAME score_boundaries COMMAND score_boundaries)
add_executable(game_rules tests/game_rules.cpp)
target_link_libraries(game_rules PRIVATE dice_rules)
add_test(NAME game_rules COMMAND game_rules)
add_executable(command_tests tests/commands.cpp)
target_link_libraries(command_tests PRIVATE dice_rules)
add_test(NAME command_tests COMMAND command_tests)
add_executable(dice_tests tests/dice.cpp)
target_link_libraries(dice_tests PRIVATE dice_rules)
add_test(NAME dice_tests COMMAND dice_tests)
add_executable(dice_terminal apps/dice_terminal.cpp)
target_link_libraries(dice_terminal PRIVATE dice_rules)
add_library(learning_rules STATIC src/learning/Reward.cpp src/learning/Decision.cpp src/learning/Observation.cpp src/learning/QAgent.cpp)
target_link_libraries(learning_rules PUBLIC dice_rules)
add_executable(reward_tests tests/rewards.cpp)
target_link_libraries(reward_tests PRIVATE learning_rules)
add_test(NAME reward_tests COMMAND reward_tests)
add_executable(decision_tests tests/decisions.cpp)
target_link_libraries(decision_tests PRIVATE learning_rules)
add_test(NAME decision_tests COMMAND decision_tests)
add_executable(q_storage_tests tests/q_storage.cpp)
target_link_libraries(q_storage_tests PRIVATE learning_rules)
add_test(NAME q_storage_tests COMMAND q_storage_tests)
```

Run configure, build and CTest using the commands below. **Section gate:** with examples closed, decode a new row, explain a rejected observation, trace one stored write and defend a negative legal maximum. Next comes action selection; learning updates and training remain later lessons.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "ctest --test-dir build-dice --output-on-failure" stdout="q_storage_tests"
```

