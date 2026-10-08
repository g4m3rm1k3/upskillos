---
title: A21 — Decide whose success the reward describes
track: C++ Games — Learn from Decisions
trackOrder: 4.4
runtime: cpp
console: true
---

**Outcome:** Define terminal feedback from a named agent’s perspective without confusing reward with banked points.

**Recall before looking at code:** Does a positive expected change in pot prove a higher chance of winning the match?

The fixed opponent can already play. To learn instead, a decision-making component needs feedback tied to an objective. We choose winning the match: +1 for the agent winning, -1 for its opponent winning, and zero while the match is unfinished. Those numbers are our training design, not the number of points banked. This lesson implements feedback only; no values are learned yet.

## Name the learner and the world it acts in

The **agent** is the component selecting actions from observations. The **environment** is what responds: here the game rules, die outcomes and fixed opposing policy. One complete match is an **episode**. The current terminal program demonstrates these responsibilities even though its human player is not a learning algorithm. In training we will let the agent occupy seat zero. A later evaluation can compare perspectives explicitly.

Keep the same project folder from A19c. Confirm the existing game still builds. Author tests reconstruct previously taught files so they can audit this chapter in a fresh folder; the app does not fill in your files.

A **reward** is numeric feedback defining the objective. A legal bust is an ordinary game event, not a compiler error or a rejected request. We give unfinished positions zero reward even after a bust. Learning from delayed outcomes comes later; inventing a point bonus now would change the objective.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="quit\n" stdout="session ended"
```

## Keep feedback separate from the game rules

Create include/learning/Reward.hpp. The learning namespace and folder hold the training interpretation. Game.cpp still decides who won; terminalReward translates that fact for a named agent seat. The const reference borrows the snapshot without changing it. double prepares for later fractional estimates, although these three rewards are exactly -1, 0 and 1.

**Edit `include/learning/Reward.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/learning/Reward.hpp
#ifndef LEARNING_REWARD_HPP
#define LEARNING_REWARD_HPP
#include "dice/Game.hpp"
namespace learning {
double terminalReward(const dice::GameSnapshot& view, int agentSeat);
}
#endif
```

This function accepts winner metadata -1, 0 or 1 and an agent seat 0 or 1. Other metadata is rejected with invalid_argument, whose throw/catch mechanism you learned in A11 and A13. Scores and pot do not determine this reward. A snapshot copied from Game already carries the authoritative winner.

```check
file include/learning/Reward.hpp
```

## Translate the recorded outcome

Create src/learning/Reward.cpp. Validate the seat and winner before interpreting them. -1 means the episode has not ended. Otherwise compare the winning seat with the agent seat, not with the current turn.

```predict
question: Seat one wins. What reward does an agent in seat zero receive?
choice: -1
choice: +1
answer: -1
explain: The winner and the rewarded agent are different seats; this is a loss for that agent.
```


**Edit `src/learning/Reward.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/Reward.cpp
#include "learning/Reward.hpp"
#include <stdexcept>
double learning::terminalReward(const dice::GameSnapshot& view, int agentSeat) {
    if (agentSeat < 0 || agentSeat > 1)
        throw std::invalid_argument("agent seat must be zero or one");
    if (view.winner < -1 || view.winner > 1)
        throw std::invalid_argument("invalid winner");
    if (view.winner == -1) return 0.0;
    if (view.winner == agentSeat) return 1.0;
    return -1.0;
}
```

| Winner metadata | Agent seat | Reward | Meaning |
|---|---|---|---|
| -1 | either | 0 | unfinished |
| 0 | 0 | +1 | agent wins |
| 1 | 0 | -1 | agent loses |
| 1 | 1 | +1 | the other perspective wins |

Compile to an object file with the command below. The function has no main and cannot be launched alone.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/learning/Reward.cpp -o reward.o"
```

## Observe two perspectives on the same outcome

Create explore/reward_probe.cpp. This deliberately constructed snapshot is test data for the reward function; it does not overwrite a live Game. Both calls inspect the same winner, but ask about different agent seats.

**Edit `explore/reward_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/reward_probe.cpp
#include <iostream>
#include "learning/Reward.hpp"
int main() {
    dice::GameSnapshot view;
    view.winner = 1;
    std::cout << "seat0=" << learning::terminalReward(view, 0) << '\n';
    std::cout << "seat1=" << learning::terminalReward(view, 1) << '\n';
    return 0;
}
```

Compile with g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/reward_probe.cpp src/learning/Reward.cpp -o reward_probe and run ./reward_probe. Expect seat0=-1 then seat1=1. Here exact floating-point comparisons with -1.0, 0.0 and 1.0 are safe because these values are exactly representable. Later calculated estimates need a tolerance; do not copy this exact-comparison habit into arbitrary decimal arithmetic.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/reward_probe.cpp src/learning/Reward.cpp -o reward_probe"
run "./reward_probe" stdout="seat0=-1\nseat1=1"
```

## Try it — Change points without changing the objective

Set the probe’s winner to -1 and set one banked score to eight. Both rewards must still be zero. Then keep the scores and set winner to zero: the seat-zero reward becomes +1. Restore the probe. These are isolated metadata tests, not claims that every manually assembled snapshot is reachable. In a real match the Game supplies snapshots. Explain why awarding +8 for banking would teach a different objective from the one specified here.



## Your turn — Test both perspectives

Create tests/rewards.cpp without a supplied body. For each agent seat, check an unfinished game gives zero, its own win gives +1 and the other seat’s win gives -1. Also verify agent seat 2 and winner 2 throw std::invalid_argument. Use a bool flag around a try/catch to record whether rejection happened, then fail if it did not. Print rewards passed only after every check.

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/rewards.cpp src/learning/Reward.cpp -o reward_tests
./reward_tests
```

```hints
nudge: Reuse one snapshot as test data, changing only the outcome metadata between cases.
concept: A caught expected exception is evidence of rejection; an uncaught unexpected exception should fail the test.
shape: Loop over the two agent seats, compare the three outcomes, then test invalid inputs with separate rejection flags.
```

The catch declaration const std::invalid_argument& names the exception type and borrows it read-only. Omitting a variable name is permitted when the handler does not inspect the exception object. Temporarily return +1 for every finished result: your test must reject this defect. Restore the function. Explain which part decides the winner and which part interprets success for an agent.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/rewards.cpp src/learning/Reward.cpp -o reward_tests"
run "./reward_tests" stdout="rewards passed"
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/rewards.cpp -o missing_reward" exit=1
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/reward_probe.cpp src/learning/Reward.cpp -o reward_probe"
run "./reward_probe" stdout="seat0=-1\nseat1=1"
```

## Add a library for the learning interpretation

Append learning_rules and reward_tests to CMakeLists.txt. The new library publicly depends on dice_rules because its interface names game types. It inherits the existing include path and C++20 requirement through that dependency. Consumers link learning_rules; the build follows the dependency graph. The terminal application still links only dice_rules.

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
add_library(learning_rules STATIC src/learning/Reward.cpp)
target_link_libraries(learning_rules PUBLIC dice_rules)
add_executable(reward_tests tests/rewards.cpp)
target_link_libraries(reward_tests PRIVATE learning_rules)
add_test(NAME reward_tests COMMAND reward_tests)
```

Configure, build and run CTest using the checks below. Confirm reward_tests appears. A reward function can be tested without training; a green result does not mean an agent has learned.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "ctest --test-dir build-dice --output-on-failure" stdout="reward_tests"
```

