---
title: 9 — Let the opponent learn
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

One game updates a handful of rows. Thousands of games revisit states under different dice outcomes. **Outcome:** train from scratch reproducibly, alternate who starts, and keep a safety cutoff distinct from a game outcome.

`reset → act → transition → update → next state → repeat until winner`

## Make the exploration schedule visible

The trainer will reduce exploration as games accumulate. Before nesting loops, print the schedule at the beginning, midpoint and end of a short run.

```predict
question: Without the double cast, what is 50 / 100?
choice: 0
choice: 0.5
answer: 0
explain: Both operands would be integers, so division discards the fraction.
```

```cpp file=explore_schedule.cpp
#include <iostream>
#include <algorithm>
int main() {
    for (int episode : {0, 50, 99}) {
        double fraction = static_cast<double>(episode) / 100;
        double epsilon = std::max(0.05, 1.0 - fraction);
        std::cout << episode << " " << epsilon << '\n';
    }
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_schedule.cpp -o explore
./explore
```

Expected output:

```text
0 1
50 0.5
99 0.05
```

### How it works

The cast occurs before division: 50 becomes 50.0, so dividing by 100 yields 0.5. Casting after integer division would preserve an already-truncated zero. At episode 99, 1 - 0.99 gives 0.01; max raises it to the 0.05 floor.

The schedule changes how the agent gathers evidence, not how an individual die is rolled. It belongs once per episode outside the decision loop.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_schedule.cpp -o explore"
run "./explore" stdout="0 1\n50 0.5\n99 0.05"
```

## Test reset and reproducibility

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

A same-seed rerun must match exactly on the same build. A different seed should change estimates. Nonzero cells prove learning happened, not that the policy is strong; evaluation is a separate lesson.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

Zero episodes should return a fresh zero table. Two runs with the same seed and episode count should agree on this compiler.

**Edit `test_train.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_train.cpp
#include "train.hpp"
#include <cassert>
#include <iostream>
int main() {
    assert(train(12, 0) == make_table());
    Table first = train(12, 3000);
    assert(first == train(12, 3000));
}
```

This protects the training loop from unseeded randomness and accidental reuse of an old table. It says nothing yet about whether learning happened.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_train.cpp "assert(first == train(12, 3000));"
```

## Test that learning leaves finite evidence

Visit both values in each row, require each to be finite and within the reward bounds, and count changed cells.

**Edit `test_train.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_train.cpp
#include "train.hpp"
#include <cassert>
#include <iostream>
int main() {
    assert(train(12, 0) == make_table());
    Table first = train(12, 3000);
    assert(first == train(12, 3000));
    int nonzero = 0;
    for (const Row& row : first)
        for (double value : row) {
            assert(std::isfinite(value) && value >= -1.0 && value <= 1.0);
            if (value != 0.0) ++nonzero;
        }
    assert(nonzero > 100);
    assert(first != train(13, 3000));
    std::cout << "training ok\n";
}
```

The count detects a trainer that returns zeros. The different-seed comparison detects ignored seeds. Neither proves a strong policy; that requires held-out games.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_train.cpp "std::cout << \"training ok\\n\";"
```

## Own one table for the whole training run

Create train.hpp. Construct the table once, before any episode loop. Construct two seeded engines: one for game dice and one for the policy's random choices. This first version returns the unchanged table.

**Edit `train.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=train.hpp
#ifndef DICE_TRAIN_HPP
#define DICE_TRAIN_HPP
#include "agent.hpp"
inline Table train(unsigned seed, int episodes) {
    Table q = make_table();
    std::mt19937 dice(seed), choices(seed + 100000u);
    return q;
}
#endif
```

A function-local table begins fresh on each call to train, but survives all the episodes inside that call. Putting make_table inside the future episode loop would erase previous experience. Separate engines keep an extra exploration draw from directly consuming a die draw. The different seed offset names a separate stream; it is not a mathematical guarantee of independence.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ train.hpp"
```

## Reset games, not learned values

Add the episode loop. Each pass creates a new Game while retaining the table outside it. Alternate the initial turn with episode % 2, then complete an opening opponent turn if necessary.

**Edit `train.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=train.hpp
#ifndef DICE_TRAIN_HPP
#define DICE_TRAIN_HPP
#include "agent.hpp"
inline Table train(unsigned seed, int episodes) {
    Table q = make_table();
    std::mt19937 dice(seed), choices(seed + 100000u);
    for (int episode = 0; episode < episodes; ++episode) {
        Game g; g.turn = episode % 2;
        opponent_turn(g, dice);
    }
    return q;
}
#endif
```

| episode | initial turn | table | game |
|---|---|---|---|
| 0 | 0 | retained | fresh |
| 1 | 1 | retained | fresh |
| 2 | 0 | retained | fresh |

An opponent can win before the agent ever acts. Such a game contains no agent action to update. We will naturally skip it with the next step's finished check.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ train.hpp"
```

## Schedule exploration using floating-point division

Add fraction and epsilon inside the episode loop. Convert the episode number to double before dividing; otherwise integer division would keep fraction at zero for nearly the entire run.

**Edit `train.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=train.hpp
#ifndef DICE_TRAIN_HPP
#define DICE_TRAIN_HPP
#include "agent.hpp"
inline Table train(unsigned seed, int episodes) {
    Table q = make_table();
    std::mt19937 dice(seed), choices(seed + 100000u);
    for (int episode = 0; episode < episodes; ++episode) {
        Game g; g.turn = episode % 2;
        opponent_turn(g, dice);
        double fraction = static_cast<double>(episode) / std::max(1, episodes);
        double epsilon = std::max(0.05, 1.0 - fraction);
    }
    return q;
}
#endif
```

With 100 episodes: episode 0 gives epsilon 1, episode 50 gives 0.5, and episode 99 is clamped to 0.05. std::max enforces the floor. This is a transparent starting schedule, not a claim that these settings are optimal. At this stage epsilon is unused, so its warning is expected.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ train.hpp"
```

## Learn before advancing to the successor

Create `train.hpp`. `unsigned` is a nonnegative integer type used for seeds. `% 2` alternates the starting player. When the opponent starts and wins without an agent move, no agent decision exists to update. `static_cast<double>` prevents integer division in the exploration schedule.

A range-based `for` in the tests visits each element of a container, like Python `for row in table`. `const Row&` avoids row copies. The function returns the owned vector; C++ can move its storage instead of copying it. No manual allocation or `delete` is needed.

```predict
question: A debugging cutoff is reached with no winner. Should it become a loss reward?
choice: No
choice: Yes
answer: No
explain: A timeout is not a loss under the game rules. This implementation throws and aborts the run so no invented terminal update is made.
```


**Edit `train.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=train.hpp
#ifndef DICE_TRAIN_HPP
#define DICE_TRAIN_HPP
#include "agent.hpp"
inline Table train(unsigned seed, int episodes) {
    Table q = make_table();
    std::mt19937 dice(seed), choices(seed + 100000u);
    for (int episode = 0; episode < episodes; ++episode) {
        Game g; g.turn = episode % 2;
        opponent_turn(g, dice);
        double fraction = static_cast<double>(episode) / std::max(1, episodes);
        double epsilon = std::max(0.05, 1.0 - fraction);
        int decisions = 0;
        while (!finished(g)) {
            if (++decisions > 10000) throw std::runtime_error("episode guard");
            Action action = choose(q, g, epsilon, choices);
            Transition t = agent_step(g, action, dice);
            update(q, g, action, t);
            g = t.next;
        }
    }
    return q;
}
#endif
```

The inner loop has four ordered operations: choose from g, get t from that action, update the cell for g, then replace g with t.next. Moving the last assignment above update would train the wrong state. The guard throws rather than inventing a loss.

We decay epsilon from 1 toward a floor of 0.05. For 100 episodes, halfway gives fraction 0.5 and epsilon 0.5; it is a simple teaching schedule, not a proven optimum. Use 50000 episodes for the final experiment. Tabular learning here needs no GPU.

The guard catches accidental infinite loops. It aborts instead of quietly biasing training. In a time-limited environment, you would explicitly distinguish termination from truncation and decide how to bootstrap. **Common error:** reset `q` inside the episode loop and the agent forgets every game. **Challenge:** log episode, epsilon and visited-cell count every 1000 episodes, using the terminal without changing random draws.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_train.cpp -o test_train"
run "./test_train" stdout="training ok"
```

## Try it

Remove static_cast<double> from explore_schedule.cpp. Observe that the midpoint exploration stays at 1. Restore it, then increase the floor to 0.2 and predict which printed rows change.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — A different exploration floor

**No solution is shown.** Create `practice_09.cpp` yourself. Read episode and total episode count as integers. Inputs satisfy 0 <= episode < total and total > 0. Print max(0.1, 1 - episode/total), with floating-point division. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_09.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 50 100 | result=0.5 |
| 99 100 | result=0.1 |

```hints
nudge: Test the midpoint before the end of the schedule.
concept: Casting must happen before integer division loses the fraction.
shape: Convert episode to double, divide by total, subtract from one, enforce the floor.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_09.cpp -o practice"
run "./practice" stdin="50 100\n" stdout="result=0.5\n" without="result=0.1\n"
run "./practice" stdin="99 100\n" stdout="result=0.1\n" without="result=0.5\n"
```

