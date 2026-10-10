---
title: 6.3 — Exploring
runtime: none
support: tests/test_choose.cpp, tests/test_epsilon.cpp
---

The table can store what the agent has learned, but a table that is empty always says "pick Up". And a table that is only half full can mislead. If the agent found one coin on the left, it might keep going left forever and never find the better coin on the right.

The agent has to **explore**: now and then it must try an action that doesn't look best. This is the second big idea of Q-learning. The usual rule is called **epsilon-greedy**:

- With a small probability **epsilon** (ε), pick a **random** action. That is **exploring**.
- Otherwise pick the **best** action from the table. That is **exploiting**.

Epsilon is a number between 0 and 1:

| Epsilon | What the agent does                           |
| ------- | --------------------------------------------- |
| 0.0     | Never explores. Always picks the best action. |
| 0.1     | Explores 1 turn in 10.                        |
| 1.0     | Always explores. Every choice is random.      |

A good plan is to start with a big epsilon, so the agent tries everything, and shrink it over time as the table improves. You build that at the end of this lesson.

Click the button that creates the supporting test files before you start.

## Random numbers in C++

C++ has a toolbox for randomness in `<random>`. You need three pieces:

- `std::mt19937 rng(seed);` is a **random number engine**, a machine that makes a long, unpredictable-looking series of numbers. The **seed** is the number it starts from. The same seed gives the same series every time, which makes training repeatable.
- `std::uniform_real_distribution<double> unit(0.0, 1.0);` is a **distribution**. It turns the engine's numbers into a decimal between 0.0 (included) and 1.0 (not included). You use it as `unit(rng)`.
- `std::uniform_int_distribution<int> pick(0, 4);` turns them into a whole number from 0 to 4. **Both ends are included.**

Each time you draw a number, the engine changes. That is why functions that draw must take the engine **by reference** (`std::mt19937&`): they need to change the caller's own engine.

```predict
question: You write std::uniform_int_distribution<int> pick(0, 4); What values can pick(rng) give?
choice: 0, 1, 2, 3 or 4
choice: 0, 1, 2 or 3
choice: 1, 2, 3 or 4
answer: 0, 1, 2, 3 or 4
explain: For a whole-number distribution both ends are included, so five different values are possible. That is the number of actions, which is what we need.
```

## Read the tests

This file is given to you. Read it, don't type it:

```cpp file=tests/test_choose.cpp provided
#include "minitest.h"
#include "../agent.h"

TEST(ChooseTest, ZeroEpsilonAlwaysExploits) {
    QTable q(5);
    q.set("s", 2, 3.0);
    std::mt19937 rng(1);
    for (int i = 0; i < 50; i++) {
        EXPECT_EQ(chooseAction(q, "s", 0.0, rng), 2);
    }
}

TEST(ChooseTest, FullEpsilonStaysInRange) {
    QTable q(5);
    q.set("s", 2, 3.0);
    std::mt19937 rng(7);
    for (int i = 0; i < 200; i++) {
        int a = chooseAction(q, "s", 1.0, rng);
        EXPECT_GE(a, 0);
        EXPECT_LT(a, 5);
    }
}

TEST(ChooseTest, FullEpsilonTriesEveryAction) {
    QTable q(5);
    q.set("s", 2, 3.0);
    std::mt19937 rng(7);
    bool seen[5] = {false, false, false, false, false};
    for (int i = 0; i < 300; i++) {
        seen[chooseAction(q, "s", 1.0, rng)] = true;
    }
    for (int a = 0; a < 5; a++) {
        EXPECT_TRUE(seen[a]);
    }
}

TEST(ChooseTest, TheSameSeedGivesTheSameChoices) {
    QTable q(5);
    std::mt19937 a(42);
    std::mt19937 b(42);
    for (int i = 0; i < 100; i++) {
        EXPECT_EQ(chooseAction(q, "s", 0.5, a), chooseAction(q, "s", 0.5, b));
    }
}

TEST(ChooseTest, HalfEpsilonMixesBothKinds) {
    QTable q(5);
    q.set("s", 4, 1.0);
    std::mt19937 rng(3);
    int best = 0;
    for (int i = 0; i < 1000; i++) {
        if (chooseAction(q, "s", 0.5, rng) == 4) {
            best++;
        }
    }
    EXPECT_GT(best, 500);
    EXPECT_LT(best, 1000);
}
```

- `bool seen[5] = {...};` is a plain array of five `bool`s. `seen[a] = true;` records that action `a` was chosen.
- The last test: half the time the agent exploits and picks action 4. The other half it picks at random, and a random pick is action 4 one time in five. So action 4 comes out about 60% of the time: more than 500 times in 1000, but not all 1000.

## Declare chooseAction

Create `agent.h`. It will grow in the next lesson:

```cpp file=agent.h
#pragma once

#include <random>
#include <string>
#include "qtable.h"

int chooseAction(const QTable& q, const std::string& state, double epsilon, std::mt19937& rng);
```

- The function reads the table, so `q` is a `const` reference.
- The engine is a non-`const` reference, because drawing a number changes it.
- It returns the action as a number from 0 to `actionCount() - 1`.

```check
file agent.h -- Create a file called agent.h in the project folder.
contains agent.h "#pragma once" -- Start the header with #pragma once.
contains agent.h "#include <random>" -- Add #include <random> so std::mt19937 is known.
matches agent.h "int\s+chooseAction\s*\(\s*const\s+QTable\s*&\s*\w+\s*,\s*const\s+std::string\s*&\s*\w+\s*,\s*double\s+\w+\s*,\s*std::mt19937\s*&\s*\w+\s*\)\s*;" -- Declare int chooseAction(const QTable& q, const std::string& state, double epsilon, std::mt19937& rng);
```

## Explore or exploit

Create `agent.cpp`:

```cpp file=agent.cpp
#include "agent.h"

int chooseAction(const QTable& q, const std::string& state, double epsilon, std::mt19937& rng) {
    std::uniform_real_distribution<double> unit(0.0, 1.0);

    if (unit(rng) < epsilon) {
        std::uniform_int_distribution<int> pick(0, q.actionCount() - 1);
        return pick(rng);
    }
    return q.bestAction(state);
}
```

- `unit(rng)` draws a decimal in `[0, 1)`: zero is possible, one is not. The condition `< epsilon` is then true with probability epsilon.
- With `epsilon = 0.0` the condition is never true, so the agent always exploits. With `epsilon = 1.0` it is always true, because the draw is always below 1.
- The random branch picks a number from `0` to `actionCount() - 1`. That includes the best action, so a "random" pick can still be the best one.
- Otherwise the agent asks the table for its favourite.

```predict
question: epsilon is 0.0 and the table's best action in this state is 3. Which action does chooseAction return, however the draw comes out?
answer: 3
explain: A draw is never below 0.0, so the explore branch never runs. The function always returns the table's best action.
tolerance: 0
```

```check
file agent.cpp -- Create a file called agent.cpp in the project folder.
contains agent.cpp "#include \"agent.h\"" -- Include your own header with #include "agent.h".
contains agent.cpp "std::uniform_real_distribution<double>" -- Draw a decimal with std::uniform_real_distribution<double>.
contains agent.cpp "std::uniform_int_distribution<int>" -- Pick a random action with std::uniform_int_distribution<int>.
contains agent.cpp "q.bestAction(state)" -- Otherwise return q.bestAction(state).
run "g++ -std=c++17 -c agent.cpp -o agent.o" label="agent.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_choose.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_choose" label="tests/test_choose.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_choose" label="chooseAction passes its tests" -- A test failed. Read which one. Is the explore test unit(rng) < epsilon? Does the random pick go up to actionCount() - 1?
```

## A schedule for epsilon

Early on the table knows nothing, so the agent should explore a lot. Later it knows more, so it should exploit more. A simple plan lowers epsilon in a **straight line** from a start value to an end value, over the whole training.

If a training has `totalEpisodes` episodes, numbered `0` to `totalEpisodes - 1`, then how far through you are is:

```text
progress = episode / (totalEpisodes - 1)
```

`progress` is `0.0` at the first episode and `1.0` at the last. Epsilon then slides from `start` to `end` in step with it:

```text
epsilon = start + (end - start) * progress
```

For example, with `start = 1.0`, `end = 0.1` and 11 episodes, episode 5 is halfway: `progress = 0.5` and `epsilon = 1.0 + (0.1 - 1.0) * 0.5 = 0.55`.

There is a trap. If **both** numbers in a division are `int`, C++ throws the remainder away:

```cpp
int a = 7 / 2;        // 3, not 3.5
double b = 7.0 / 2;   // 3.5, because one side is a double
double c = static_cast<double>(7) / 2;   // 3.5 as well
```

`episode` and `totalEpisodes` are both `int`, so `episode / (totalEpisodes - 1)` would give `0` for every episode except the last. Convert one side with `static_cast<double>(...)` first, as you did with `static_cast<int>` in lesson 2.1.

```predict
question: What does 1 / 2 give when both numbers are ints?
answer: 0
explain: Integer division throws the remainder away. 1 divided by 2 is 0 remainder 1, so the result is 0.
tolerance: 0
```

## Your turn: shrink epsilon

Write a function in `agent.h` and `agent.cpp`:

```
double epsilonAt(int episode, int totalEpisodes, double start, double end);
```

- It returns `start` at episode `0` and `end` at the last episode, `totalEpisodes - 1`, and slides in a straight line in between.
- If `totalEpisodes` is `1` or less, it returns `start`.
- An episode past the end stays at `end`. An episode below `0` stays at `start`.

The tests are in a given file. Read them, then make them pass:

```cpp file=tests/test_epsilon.cpp provided
#include "minitest.h"
#include "../agent.h"

TEST(EpsilonTest, StartsAtTheStartValue) {
    EXPECT_NEAR(epsilonAt(0, 11, 1.0, 0.1), 1.0, 1e-12);
}

TEST(EpsilonTest, EndsAtTheEndValue) {
    EXPECT_NEAR(epsilonAt(10, 11, 1.0, 0.1), 0.1, 1e-12);
}

TEST(EpsilonTest, HalfwayIsHalfway) {
    EXPECT_NEAR(epsilonAt(5, 11, 1.0, 0.1), 0.55, 1e-12);
}

TEST(EpsilonTest, GoesDownSteadily) {
    for (int i = 1; i <= 10; i++) {
        EXPECT_LT(epsilonAt(i, 11, 1.0, 0.1), epsilonAt(i - 1, 11, 1.0, 0.1));
    }
}

TEST(EpsilonTest, StaysAtTheEndAfterwards) {
    EXPECT_NEAR(epsilonAt(50, 11, 1.0, 0.1), 0.1, 1e-12);
}

TEST(EpsilonTest, OneEpisodeUsesTheStart) {
    EXPECT_NEAR(epsilonAt(0, 1, 0.8, 0.1), 0.8, 1e-12);
}

TEST(EpsilonTest, CanAlsoGoUp) {
    EXPECT_NEAR(epsilonAt(10, 11, 0.1, 0.9), 0.9, 1e-12);
}

TEST(EpsilonTest, IntegerDivisionTrap) {
    EXPECT_NEAR(epsilonAt(1, 3, 1.0, 0.0), 0.5, 1e-12);
}
```

Your changes go in `agent.h` and `agent.cpp`. Don't change the tests.

```check
matches agent.h "double\s+epsilonAt\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*double\s+\w+\s*,\s*double\s+\w+\s*\)\s*;" -- Declare double epsilonAt(int episode, int totalEpisodes, double start, double end); in agent.h.
run "g++ -std=c++17 -c agent.cpp -o agent.o" label="agent.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 tests/test_epsilon.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_epsilon" label="tests/test_epsilon.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_epsilon" label="The epsilon schedule is correct" -- A test failed. Read which one. Is one side of the division converted to a double BEFORE dividing? Do you clamp progress between 0 and 1?
run "g++ -std=c++17 tests/test_choose.cpp game.cpp input.cpp map.cpp player.cpp render.cpp rules.cpp coins.cpp enemy.cpp level.cpp menu.cpp scoreboard.cpp env.cpp qtable.cpp agent.cpp -o test_choose" label="tests/test_choose.cpp builds" -- Fix the compiler errors shown. If a test file is missing, click the button that creates the provided files.
tests "./test_choose" label="chooseAction still passes" -- Your change broke an earlier test.
```

```hints
nudge: Which test fails? If halfway comes out as the start value, look at the division.
concept: Compute progress with static_cast<double>(episode) so the division is done in decimals. Then clamp it so it can't go below 0 or above 1, and slide from start towards end.
shape: Early return for totalEpisodes <= 1. Then progress = static_cast<double>(episode) / (totalEpisodes - 1); two ifs to clamp; return start + (end - start) * progress.
answer: In agent.h, add:
~~~cpp
double epsilonAt(int episode, int totalEpisodes, double start, double end);
~~~
In agent.cpp, add:
~~~cpp
double epsilonAt(int episode, int totalEpisodes, double start, double end) {
    if (totalEpisodes <= 1) {
        return start;
    }

    double progress = static_cast<double>(episode) / (totalEpisodes - 1);
    if (progress > 1.0) {
        progress = 1.0;
    }
    if (progress < 0.0) {
        progress = 0.0;
    }
    return start + (end - start) * progress;
}
~~~
```
