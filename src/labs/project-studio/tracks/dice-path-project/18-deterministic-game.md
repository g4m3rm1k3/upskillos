---
title: A18 — Make the rules independent of the screen
track: C++ Games — Build the Project
trackOrder: 4.3
runtime: cpp
console: true
---

**Outcome:** Implement and test legal game transitions without generating random dice or reading input.

**Recall before looking at code:** What must remain unchanged when a request is rejected, and why must a snapshot be a copy?

The real game model will now bank points, bust, switch players and recognize a win. The same operations will later serve terminal input, graphics and the learning opponent. We supply each die face to the rules so a test can choose the exact outcome. Random generation belongs to a later adapter. Keep the same project folder.

## Describe one position

Create include/dice/Game.hpp. A **state** is the information needed to decide the next legal change: both scores, pot, current seat and winner. winner=-1 means no winner; 0 and 1 identify the seats. **constexpr** declares a compile-time constant here. The target is fixed at twelve in this game; changing it later also changes model compatibility. All container and namespace syntax comes from earlier lessons.

**Edit `include/dice/Game.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/dice/Game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
namespace dice {
constexpr int target = 12;
enum class Action { Roll, Bank };
struct GameSnapshot {
    std::array<int, 2> scores{0, 0};
    int pot = 0;
    int turn = 0;
    int winner = -1;
};
}
#endif
```

Unlike the A12 demonstration position, this state starts a real match with both scores and pot zero. This is the shared value description; the next steps put mutation behind a Game interface.

```check
file include/dice/Game.hpp
```

## Observe the starting state

Create explore/game_probe.cpp. First inspect the value by itself, before introducing a model operation. Compile this caller with -Iinclude so it can find the header.

**Edit `explore/game_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/game_probe.cpp
#include <iostream>
#include "dice/Game.hpp"
int main() {
    dice::GameSnapshot view;
    std::cout << "turn=" << view.turn << " pot=" << view.pot << " winner=" << view.winner << '\n';
    return 0;
}
```

Run g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp -o game_probe, then ./game_probe. Expect turn=0 pot=0 winner=-1. There is no randomness or terminal command parsing involved.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp -o game_probe"
run "./game_probe" stdout="turn=0 pot=0 winner=-1"
```

## Give one object authority over changes

Add Game below the snapshot struct. snapshot returns a value copy as in A12. finished answers whether there is a winner. legal checks the requested action; apply requests a change and returns false on rejection without mutation. face is used only for Roll; callers pass zero for Bank. This explicit interface keeps input, random generation and drawing outside the rules.

**Edit `include/dice/Game.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/dice/Game.hpp
#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
namespace dice {
constexpr int target = 12;
enum class Action { Roll, Bank };
struct GameSnapshot {
    std::array<int, 2> scores{0, 0};
    int pot = 0;
    int turn = 0;
    int winner = -1;
};
class Game {
private:
    GameSnapshot state_;
public:
    GameSnapshot snapshot() const { return state_; }
    bool finished() const;
    bool legal(Action action) const;
    bool apply(Action action, int face);
};
}
#endif
```

A **terminal state** here means a finished match, not the terminal application window. We will define the declared operations in Game.cpp. The private state prevents a renderer or agent from overwriting the pot directly.

```check
file include/dice/Game.hpp
```

## Inspect through the public interface

Replace the direct snapshot construction with a Game and its snapshot query. You have changed who owns the state, not the starting values. snapshot has an inline body in the header; the caller does not yet call methods whose definitions are missing.

**Edit `explore/game_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/game_probe.cpp
#include <iostream>
#include "dice/Game.hpp"
int main() {
    dice::Game game;
    dice::GameSnapshot view = game.snapshot();
    std::cout << "turn=" << view.turn << " pot=" << view.pot << " winner=" << view.winner << '\n';
    return 0;
}
```

Run the same header-only caller command again. Matching output checks that the encapsulated model preserves its starting-state contract.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp -o game_probe"
run "./game_probe" stdout="turn=0 pot=0 winner=-1"
```

## Answer legality before changing anything

Create src/dice/Game.cpp. An unfinished game admits Roll. Bank additionally requires a positive pot. Parentheses make the grouping explicit: the unfinished requirement applies to both actions. These are const queries, so neither may change the position.

```predict
question: Can a finished game with a positive pot accept Bank?
choice: No
choice: Yes
answer: No
explain: finished excludes every action, even when the pot is positive.
```


**Edit `src/dice/Game.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/dice/Game.cpp
#include "dice/Game.hpp"
bool dice::Game::finished() const { return state_.winner != -1; }
bool dice::Game::legal(Action action) const {
    return !finished() && (action == Action::Roll ||
        (action == Action::Bank && state_.pot > 0));
}
```

Compile and run the existing probe with g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe. This verifies the new source compiles and links; the next edit makes the caller exercise its queries.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe"
run "./game_probe" stdout="turn=0 pot=0 winner=-1"
```

## Observe the legal choices at the start

Replace the probe body with query output. A bool prints 1 or 0 through this stream configuration, as in A04. Compare the output with the rules before you move on.

**Edit `explore/game_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/game_probe.cpp
#include <iostream>
#include "dice/Game.hpp"
int main() {
    dice::Game game;
    std::cout << "roll=" << game.legal(dice::Action::Roll) << " bank=" << game.legal(dice::Action::Bank) << " finished=" << game.finished() << '\n';
    return 0;
}
```

Run g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe, then ./game_probe. The game starts unfinished: rolling is available, banking an empty pot is not.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe"
run "./game_probe" stdout="roll=1 bank=0 finished=0"
```

## Implement a roll as a state transition

A **transition** changes one valid state into another. Add apply with the roll behavior first. This temporary slice rejects Bank even when legal; do not treat it as the complete game yet. Reject bad faces before changing anything. A bust discards only the pot and passes the turn. An ordinary roll adds to the pot and immediately checks score plus pot for a win. A winning roll does not pass the turn.

**Edit `src/dice/Game.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/dice/Game.cpp
#include "dice/Game.hpp"
bool dice::Game::finished() const { return state_.winner != -1; }
bool dice::Game::legal(Action action) const {
    return !finished() && (action == Action::Roll ||
        (action == Action::Bank && state_.pot > 0));
}
bool dice::Game::apply(Action action, int face) {
    if (!legal(action)) return false;
    if (action == Action::Bank) return false;
    if (face < 1 || face > 6) return false;
    if (face == 1) {
        state_.pot = 0;
        state_.turn = 1 - state_.turn;
    } else {
        state_.pot += face;
        if (state_.scores.at(state_.turn) + state_.pot >= target)
            state_.winner = state_.turn;
    }
    return true;
}
```

| Request | Change |
|---|---|
| Invalid face | none; return false |
| Face 1 | pot becomes zero; other seat acts next |
| Face 2–6, below target | add face; same seat chooses again |
| Face 2–6, reaches target | add face; record that seat as winner |

Compile the source with the probe. Next we will supply an exact winning sequence.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe"
run "./game_probe" stdout="roll=1 bank=0 finished=0"
```

## Reach the target exactly

Supply two sixes from the zero starting score. These are test inputs, not generated dice. Predict the second transition: pot becomes twelve, winner becomes seat zero, and no later action is legal.

**Edit `explore/game_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/game_probe.cpp
#include <iostream>
#include "dice/Game.hpp"
int main() {
    dice::Game game;
    game.apply(dice::Action::Roll, 6);
    game.apply(dice::Action::Roll, 6);
    dice::GameSnapshot view = game.snapshot();
    std::cout << "pot=" << view.pot << " winner=" << view.winner << " roll=" << game.legal(dice::Action::Roll) << '\n';
    return 0;
}
```

Run g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe, then ./game_probe. Expected pot=12 winner=0 roll=0. The match ends on the roll; a later bank is unnecessary and disallowed.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe"
run "./game_probe" stdout="pot=12 winner=0 roll=0"
```

## Complete banking without rolling a die

Replace the temporary Bank rejection with its transition. The initial legal check already excludes empty pots and finished matches. Add the pot to the current score, clear it, pass the turn and return before any die-face validation. Banking consumes no die face.

**Edit `src/dice/Game.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/dice/Game.cpp
#include "dice/Game.hpp"
bool dice::Game::finished() const { return state_.winner != -1; }
bool dice::Game::legal(Action action) const {
    return !finished() && (action == Action::Roll ||
        (action == Action::Bank && state_.pot > 0));
}
bool dice::Game::apply(Action action, int face) {
    if (!legal(action)) return false;
    if (action == Action::Bank) {
        state_.scores.at(state_.turn) += state_.pot;
        state_.pot = 0;
        state_.turn = 1 - state_.turn;
        return true;
    }
    if (face < 1 || face > 6) return false;
    if (face == 1) {
        state_.pot = 0;
        state_.turn = 1 - state_.turn;
    } else {
        state_.pot += face;
        if (state_.scores.at(state_.turn) + state_.pot >= target)
            state_.winner = state_.turn;
    }
    return true;
}
```

In a reachable unfinished state, score plus pot is below twelve; reaching twelve would already have ended the match on its preceding roll. This is why the bank branch needs no second win rule. Keep the rule in one place rather than inventing inconsistent alternate outcomes.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe"
run "./game_probe" stdout="pot=12 winner=0 roll=0"
```

## Trace a bank followed by the opponent’s bust

Read the four calls as a recorded game fragment: seat zero rolls four and banks; seat one rolls three then busts. Trace the turn and pot after every call. No terminal input is involved, so a future training loop can use exactly the same operations.

**Edit `explore/game_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/game_probe.cpp
#include <iostream>
#include "dice/Game.hpp"
int main() {
    dice::Game game;
    game.apply(dice::Action::Roll, 4);
    game.apply(dice::Action::Bank, 0);
    std::cout << "after bank pot=" << game.snapshot().pot << '\n';
    game.apply(dice::Action::Roll, 3);
    game.apply(dice::Action::Roll, 1);
    dice::GameSnapshot view = game.snapshot();
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1) << " pot=" << view.pot << " turn=" << view.turn << '\n';
    return 0;
}
```

The original banked four survives. The opponent’s pot disappears. The next player is seat zero. Run the probe and compare each field, not just the final sum.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe"
run "./game_probe" stdout="after bank pot=0\nscores=4,0 pot=0 turn=0"
```

## Try it — Keep a rejected move out of the game

Insert a roll with face seven after the first ordinary roll, print its false result, and verify the final valid sequence is unchanged. Then replace the first bank with a second ordinary roll: draw the new turn sequence before running. Restore the probe. Explain why an invalid face and a valid bust must not share the same state change.



## Your turn — Specify the game with tests

Create tests/game_rules.cpp without a supplied body. Use public operations only. Check empty banking, faces zero and seven, bank/reset/pass, bust without losing banked points, an overshooting win for seat zero, an exact win for seat one, and rejected requests after completion preserving the winning pot. Use explicit comparisons and failure statuses. Print rules passed only after all claims hold.

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/game_rules.cpp src/dice/Game.cpp -o game_rules
./game_rules
```

```hints
nudge: Build each position through legal operations rather than assigning a snapshot back into the game.
concept: Test both the returned acceptance and every state field the operation promises to preserve.
shape: Start fresh games for independent cases; one initial bust gives seat one the first scoring turn.
```

**Transfer evidence:** temporarily change >= target to > target, then remove the bank reset, one defect at a time. Your freshly rebuilt tests must reject each. Restore the source after each experiment. A test executable that simply returns zero is not a rules specification.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/game_rules.cpp src/dice/Game.cpp -o game_rules"
run "./game_rules" stdout="rules passed"
run "g++ -std=c++20 -Iinclude tests/game_rules.cpp -o missing_game" exit=1
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/game_probe.cpp src/dice/Game.cpp -o game_probe"
run "./game_probe" stdout="scores=4,0 pot=0 turn=0"
```

## Keep the game and its tests in the build

Add Game.cpp to the existing dice_rules library and register the game_rules test executable. These are the same dependency operations you learned in A17. One library now contains the score exercise and the real game; Game owns its integer state directly because its transitions jointly protect score, pot and turn. It does not need to wrap every integer in a Score.

**Edit `CMakeLists.txt`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cmake file=CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(DiceLab LANGUAGES CXX)
add_library(dice_rules STATIC src/dice/Score.cpp src/dice/Game.cpp)
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
```

Configure and build, then run CTest. Confirm game_rules appears and passes. The next lessons add input and randomness around this tested model. Neither belongs inside Game::apply.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "ctest --test-dir build-dice --output-on-failure" stdout="game_rules"
```

