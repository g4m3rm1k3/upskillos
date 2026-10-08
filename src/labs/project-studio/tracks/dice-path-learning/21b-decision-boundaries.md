---
title: A21b — Wait until the agent can choose again
track: C++ Games — Learn from Decisions
trackOrder: 4.4
runtime: cpp
console: true
---

**Outcome:** Advance one agent decision through the fixed opponent’s response to the next agent decision or a finished match.

**Recall before looking at code:** After the agent banks, whose turn is it, and can that opponent win before the agent chooses again?

Our learner controls seat zero. If it rolls a four and keeps the turn, the next decision is immediately available. If it banks or busts, the fixed opponent must respond before the next agent decision. One learning step will include those intervening opponent actions. Build a deterministic version with supplied faces first, so every reward and stopping point can be tested exactly. This is still preparation for Q-learning, not training.

## Trace a decision across the opponent’s turn

A **decision boundary** is a position where the agent can choose its next action, or a finished match where no next choice exists. Consider both banked scores at eight and agent pot two. The agent banks; its score becomes ten. The opponent then rolls four and wins immediately.

```predict
question: Where should this agent transition stop?
choice: After the opponent wins
choice: Immediately after the agent banks
answer: After the opponent wins
explain: The next result must be either another seat-zero decision or a finished episode.
```


The result is a terminal loss for the agent. Trace the intervening positions below.

| Event | Scores | Pot | Turn | Winner |
|---|---|---|---|---|
| Agent decides | 8,8 | 2 | 0 | -1 |
| Agent banks | 10,8 | 0 | 1 | -1 |
| Opponent rolls 4 | 10,8 | 4 | 1 | 1 |

From the agent’s perspective the reward is -1. A later Q update must not ask the losing agent to choose an action in the opponent’s intermediate position. We will count time in agent decisions for this model, rather than counting every intervening die roll as a separate learning step.

## Describe the result of one agent decision

Create include/learning/Decision.hpp. DecisionResult groups the next valid Game, feedback and a done flag. done means the episode ended. Its next member is a Game value, preserving private state through the existing Game interface. The function borrows its input Game read-only and returns a separate result. opponentFaces is a sequence of explicit test inputs, not a random generator.

**Edit `include/learning/Decision.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/learning/Decision.hpp
#ifndef LEARNING_DECISION_HPP
#define LEARNING_DECISION_HPP
#include <vector>
#include "dice/Game.hpp"
namespace learning {
struct DecisionResult {
    dice::Game next;
    double reward = 0.0;
    bool done = false;
};
DecisionResult advance(const dice::Game& before, dice::Action action,
    int face, const std::vector<int>& opponentFaces);
}
#endif
```

The contract requires an unfinished seat-zero turn and a legal action. A roll needs a face in 1..6; banking ignores face as before. Opponent faces are consumed only while seat one is acting, using the same bank-at-four policy as A19c. Unused trailing faces are ignored. If required faces run out or a consumed face is invalid, reject the script without changing the caller’s game. No learning result is fabricated for an incomplete script.

```check
file include/learning/Decision.hpp
```

## Work on a copy and apply the agent request

Create src/learning/Decision.cpp. First check the entry boundary, then copy the game and apply the requested action to that copy. Game has only value members, so its ordinary copy is independent, as in A12. An exception leaves before untouched. The braces in return initialize DecisionResult members in declaration order: next, reward, done.

**Edit `src/learning/Decision.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/Decision.cpp
#include "learning/Decision.hpp"
#include "learning/Reward.hpp"
#include <stdexcept>
learning::DecisionResult learning::advance(const dice::Game& before, dice::Action action,
    int face, const std::vector<int>& opponentFaces) {
    if (before.finished() || before.snapshot().turn != 0)
        throw std::invalid_argument("expected an unfinished agent turn");
    dice::Game next = before;
    if (!next.apply(action, face))
        throw std::invalid_argument("illegal agent request");
    return {next, terminalReward(next.snapshot(), 0), next.finished()};
}
```

This temporary slice returns immediately after the agent action; it is correct only for the retained-turn example in the next step. It does not yet satisfy the full bank/bust contract. Compile to an object with the command below. An unused opponentFaces warning is expected until the response loop is added. Never silence a warning by adding code whose purpose you cannot explain.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/learning/Decision.cpp -o decision.o"
```

## Observe a retained turn and an unchanged input

Create explore/decision_probe.cpp. An empty pair of braces supplies an empty vector of opponent faces. After an ordinary roll below the target, the agent still owns the turn, so no opponent response is needed. moved.next is a separate Game; reading game afterwards demonstrates the original was not replaced.

**Edit `explore/decision_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/decision_probe.cpp
#include <iostream>
#include "learning/Decision.hpp"
int main() {
    dice::Game game;
    learning::DecisionResult moved = learning::advance(game, dice::Action::Roll, 4, {});
    dice::GameSnapshot view = moved.next.snapshot();
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
    std::cout << "reward=" << moved.reward << " done=" << moved.done << '\n';
    std::cout << "original pot=" << game.snapshot().pot << '\n';
    return 0;
}
```

Compile with g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/decision_probe.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe and run ./decision_probe. Expect pot four, turn zero, reward zero, done zero and original pot zero. The result describes what would follow the action. A future training loop must explicitly retain moved.next when it wants to advance its episode.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/decision_probe.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe"
run "./decision_probe" stdout="scores=0,0 pot=4 turn=0\nreward=0 done=0\noriginal pot=0"
```

## Include the opponent’s response

Add the for loop before the return. Stop before consuming another scripted face if the match ended or seat zero has the turn again. Otherwise perform the opponent roll through Game::apply. If that roll has not ended the match and its pot reaches four, bank immediately using the existing rules. The policy chooses actions; Game still owns every state transition.

**Edit `src/learning/Decision.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/Decision.cpp
#include "learning/Decision.hpp"
#include "learning/Reward.hpp"
#include <stdexcept>
learning::DecisionResult learning::advance(const dice::Game& before, dice::Action action,
    int face, const std::vector<int>& opponentFaces) {
    if (before.finished() || before.snapshot().turn != 0)
        throw std::invalid_argument("expected an unfinished agent turn");
    dice::Game next = before;
    if (!next.apply(action, face))
        throw std::invalid_argument("illegal agent request");
    for (int reply : opponentFaces) {
        if (next.finished() || next.snapshot().turn == 0) break;
        if (!next.apply(dice::Action::Roll, reply))
            throw std::invalid_argument("invalid opponent face");
        if (!next.finished() && next.snapshot().pot >= 4)
            next.apply(dice::Action::Bank, 0);
    }
    return {next, terminalReward(next.snapshot(), 0), next.finished()};
}
```

The stop check is before the roll. A bust gives the turn back, so any remaining script entries must be ignored. A winning roll ends the match and must not be followed by a bank. Recompile and run the retained-turn probe: even if responses existed, this case would consume none.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/decision_probe.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe"
run "./decision_probe" stdout="pot=4 turn=0\nreward=0 done=0"
```

## Reject a script that stops in the wrong place

Add the post-loop boundary check. Finishing the vector does not prove the opponent completed its turn: a script containing only face two leaves it choosing again. Throw instead of returning an opponent-turn state as if it were the agent’s next decision. All work was on next, so even a late failure leaves before unchanged.

**Edit `src/learning/Decision.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/Decision.cpp
#include "learning/Decision.hpp"
#include "learning/Reward.hpp"
#include <stdexcept>
learning::DecisionResult learning::advance(const dice::Game& before, dice::Action action,
    int face, const std::vector<int>& opponentFaces) {
    if (before.finished() || before.snapshot().turn != 0)
        throw std::invalid_argument("expected an unfinished agent turn");
    dice::Game next = before;
    if (!next.apply(action, face))
        throw std::invalid_argument("illegal agent request");
    for (int reply : opponentFaces) {
        if (next.finished() || next.snapshot().turn == 0) break;
        if (!next.apply(dice::Action::Roll, reply))
            throw std::invalid_argument("invalid opponent face");
        if (!next.finished() && next.snapshot().pot >= 4)
            next.apply(dice::Action::Bank, 0);
    }
    if (!next.finished() && next.snapshot().turn != 0)
        throw std::invalid_argument("opponent response incomplete");
    return {next, terminalReward(next.snapshot(), 0), next.finished()};
}
```

This is input rejection, not a terminal loss. Do not return reward -1 or done=true for missing test data. We have now completed the deterministic transition contract. The retained-turn probe must still pass.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/decision_probe.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe"
run "./decision_probe" stdout="original pot=0"
```

## Follow banking through two opponent rolls

Change the probe: reach an agent pot of four, then request Bank with responses {2, 2}. The braced values construct a vector for the function call. Trace both responses before running: the first leaves the opponent’s pot at two; the second reaches four and triggers its bank.

**Edit `explore/decision_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/decision_probe.cpp
#include <iostream>
#include "learning/Decision.hpp"
int main() {
    dice::Game game;
    game.apply(dice::Action::Roll, 4);
    learning::DecisionResult moved = learning::advance(game, dice::Action::Bank, 0, {2, 2});
    dice::GameSnapshot view = moved.next.snapshot();
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
    std::cout << "reward=" << moved.reward << " done=" << moved.done << '\n';
    std::cout << "original pot=" << game.snapshot().pot << '\n';
    return 0;
}
```

| Part of this one agent step | Score 0 | Score 1 | Pot | Turn |
|---|---|---|---|---|
| Agent banks | 4 | 0 | 0 | 1 |
| Opponent rolls 2 | 4 | 0 | 2 | 1 |
| Opponent rolls 2 and banks | 4 | 4 | 0 | 0 |

Run the same compile command and ./decision_probe. Expect reward=0 done=0. The input still has its original unbanked pot of four.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/decision_probe.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe"
run "./decision_probe" stdout="scores=4,4 pot=0 turn=0\nreward=0 done=0\noriginal pot=4"
```

## Observe a loss caused by the response

Build the opening trace through legal operations: each loop round banks four for each seat, so two rounds leave both scores at eight. Roll two for seat zero. Now its Bank request lets the opponent win on a four. No private state assignment or invented terminal snapshot is needed.

**Edit `explore/decision_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/decision_probe.cpp
#include <iostream>
#include "learning/Decision.hpp"
int main() {
    dice::Game game;
    for (int round = 0; round < 2; ++round) {
        game.apply(dice::Action::Roll, 4);
        game.apply(dice::Action::Bank, 0);
        game.apply(dice::Action::Roll, 4);
        game.apply(dice::Action::Bank, 0);
    }
    game.apply(dice::Action::Roll, 2);
    learning::DecisionResult moved = learning::advance(game, dice::Action::Bank, 0, {4});
    dice::GameSnapshot view = moved.next.snapshot();
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
    std::cout << "reward=" << moved.reward << " done=" << moved.done << '\n';
    return 0;
}
```

Compile and run. Expect scores=10,8 pot=4 turn=1, reward=-1 done=1. The final turn still names the winning opponent, which is fine: done tells the learning caller there is no next action. Reward is computed only after all intervening moves.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/decision_probe.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe"
run "./decision_probe" stdout="scores=10,8 pot=4 turn=1\nreward=-1 done=1"
```

## Try it — Distinguish a bust from missing data

In the previous bank-at-four probe, replace {2, 2} with {1, 7}: the bust returns control to seat zero, so the trailing invalid face is never consumed. Restore that probe’s starting setup before testing this sequence. Then try {2}: the response is incomplete and must throw. Catch invalid_argument in a small test caller and print the original game’s pot; it must still be four. Reaching the end of a script is not the same as reaching the end of a match. Restore the loss probe when done.



## Your turn — Test the complete decision boundary

Create tests/decisions.cpp without a supplied body. Use the public Game and advance interfaces to test all of the cases below. Print decisions passed only after every claim succeeds. Return nonzero for a mismatch; catch invalid_argument only in cases that expect rejection.

| Case | Required evidence |
|---|---|
| New game, Roll 4, no responses | next pot 4, seat zero, reward 0, done false; original still zero |
| Then Bank with {2, 2} | both scores 4, pot zero, seat zero, unfinished |
| Bank from pot 4 with {1, 7} | bust returns control; trailing 7 ignored |
| Agent busts from pot 4 with responses {2, 2} | agent scores zero, opponent banks four, agent chooses again |
| Agent rolls 6 then 6; trailing response {7} | agent wins, reward +1, done true; unused face ignored |
| Both scores 8, agent pot 2; Bank with {4} | opponent wins, reward -1, done true |
| Bank from pot 4 with {2}, then separately {7} | each rejected; input pot and score preserved |
| Empty bank, opponent-turn entry, finished entry | each rejected, no normal learning result |

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/decisions.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe
./decision_probe
```

```hints
nudge: A successful call returns a new Game; use result.next as the input when continuing a case.
concept: For a rejection, remember the input state before try and inspect the same input after catch.
shape: Separate ordinary return, bust, win, loss and failure cases; check reward and done as well as scores and turn.
```

Test the tests by temporarily returning before the response loop, reversing the loss reward, and removing the incomplete-response guard one at a time. Each defect must fail a relevant case. Restore after each experiment. Explain why advancing from one seat-zero decision to another gives a later Q update a meaningful successor; an arbitrary point during the opponent’s turn would not.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/decisions.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe"
run "./decision_probe" stdout="decisions passed"
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/decisions.cpp src/dice/Game.cpp src/learning/Reward.cpp -o missing_decision" exit=1
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/decision_probe.cpp src/dice/Game.cpp src/learning/Reward.cpp src/learning/Decision.cpp -o decision_probe"
run "./decision_probe" stdout="reward=-1 done=1"
```

## Keep environment behavior in the repeatable build

Add Decision.cpp to learning_rules and register decision_tests. Its link dependency already supplies Game.cpp through dice_rules. The terminal application still builds and plays, and the learning layer now has deterministic checks before any training loop exists.

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
add_library(learning_rules STATIC src/learning/Reward.cpp src/learning/Decision.cpp)
target_link_libraries(learning_rules PUBLIC dice_rules)
add_executable(reward_tests tests/rewards.cpp)
target_link_libraries(reward_tests PRIVATE learning_rules)
add_test(NAME reward_tests COMMAND reward_tests)
add_executable(decision_tests tests/decisions.cpp)
target_link_libraries(decision_tests PRIVATE learning_rules)
add_test(NAME decision_tests COMMAND decision_tests)
```

Configure, build and run CTest; confirm decision_tests and reward_tests pass. **Section gate:** with the reference hidden, trace an ordinary retained turn, a bank followed by a bust and a bank followed by defeat. Name the agent, environment, episode, reward and decision boundary in each. We have built testable transitions, not a trained policy. The next section can represent an observation and store one estimate for each legal choice.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "ctest --test-dir build-dice --output-on-failure" stdout="decision_tests"
```

