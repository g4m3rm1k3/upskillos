---
title: 5 — Whose turn is a learning step?
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

The agent banks 4. The opponent then rolls 6, rolls 5 and wins. The agent must receive **-1** for its bank decision, not learn from a state where the opponent controls the next action. **Outcome:** return a transition from one agent decision to its next decision or the end of the game.

`agent action → rules → whole fixed-opponent turn → agent decision or terminal reward`

## Reward an outcome from one player’s perspective

The same win is good for one player and bad for the other. Our learner is always player 0. Compute its reward before introducing an environment wrapper.

```predict
question: Player 1 wins. Should the agent receive +1 because somebody won?
choice: No
choice: Yes
answer: No
explain: Player 1 is the opponent. The reward is -1 from the agent’s fixed perspective.
```

```cpp file=explore_reward.cpp
#include <iostream>
int main() {
    for (int winner : {-1, 0, 1}) {
        double reward = 0.0;
        if (winner == 0) reward = 1.0;
        if (winner == 1) reward = -1.0;
        std::cout << winner << " -> " << reward << '\n';
    }
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_reward.cpp -o explore
./explore
```

Expected output:

```text
-1 -> 0
0 -> 1
1 -> -1
```

### How it works

The range-based for binds winner to each element of the braced list. -1 means unfinished, so neither condition changes reward. Winner 0 changes it to +1; winner 1 changes it to -1. The zero initialization must happen inside the loop, otherwise a previous outcome could leak into the next one.

Reward describes the agent's objective, not the number printed on the die. Adding the die face to reward would teach a different goal: collecting faces rather than winning the match.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_reward.cpp -o explore"
run "./explore" stdout="-1 -> 0\n0 -> 1\n1 -> -1"
```

## Test a decision-to-decision transition

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

The input game must remain unchanged: this time passing `Game` by value is deliberate. The test checks both positive and negative outcomes and ensures every nonterminal successor belongs to the agent.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

Prepare a pot of 4 and ask the agent to bank. Check both the unchanged input game and the returned successor.

**Edit `test_env.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_env.cpp
#include "env.hpp"
#include <cassert>
#include <iostream>
int main() {
    std::mt19937 dice(7);
    Game g; g.pot = 4;
    Transition t = agent_step(g, Action::Bank, dice);
    assert(g.pot == 4 && g.score[0] == 0);
    assert(t.next.score[0] == 4);
    assert(t.done || t.next.turn == 0);
    assert(t.reward == (t.done ? -1.0 : 0.0));
}
```

Passing Game by value is intentional here. The wrapper explores a successor without mutating the caller. If the game is still running, the returned turn must already be 0 again.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_env.cpp "assert(t.reward == (t.done ? -1.0 : 0.0));"
```

## Test rewards for both possible winners

Give both players score 11 and repeat the next decision across seed values. Count observed wins and losses while checking their reward signs.

**Edit `test_env.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_env.cpp
#include "env.hpp"
#include <cassert>
#include <iostream>
int main() {
    std::mt19937 dice(7);
    Game g; g.pot = 4;
    Transition t = agent_step(g, Action::Bank, dice);
    assert(g.pot == 4 && g.score[0] == 0);
    assert(t.next.score[0] == 4);
    assert(t.done || t.next.turn == 0);
    assert(t.reward == (t.done ? -1.0 : 0.0));
    int wins = 0, losses = 0;
    for (unsigned seed = 0; seed < 200; ++seed) {
        std::mt19937 rng(seed);
        Game near; near.score = {11, 11};
        auto result = agent_step(near, Action::Roll, rng);
        if (result.done && result.next.winner == 0) {
            assert(result.reward == 1.0); ++wins;
        }
        if (result.done && result.next.winner == 1) {
            assert(result.reward == -1.0); ++losses;
        }
        assert(result.done || result.next.turn == 0);
    }
    assert(wins > 0 && losses > 0);
    std::cout << "environment ok\n";
}
```

A normal roll wins immediately; a bust may let the opponent win. `wins > 0 && losses > 0` ensures the test really visited both branches, instead of silently skipping one.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_env.cpp "std::cout << \"environment ok\\n\";"
```

## Finish the fixed opponent turn

Create `env.hpp`. A learning step must not stop while the opponent still controls the next action. Add a loop that acts only while the game is unfinished and turn is 1.

**Edit `env.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=env.hpp
#ifndef DICE_ENV_HPP
#define DICE_ENV_HPP
#include "io.hpp"
inline void opponent_turn(Game& g, std::mt19937& dice, int threshold = 4) {
    while (!finished(g) && g.turn == 1) {
        Action action = fixed_action(g, threshold);
        apply(g, action, action == Action::Roll ? roll(dice) : 1);
    }
}
#endif
```

After a safe roll, turn remains 1 so the loop repeats. After banking or busting, pass_turn changes it to 0 and the loop ends. After victory, finished ends the loop even though the turn may still be 1. This is why the condition needs both tests.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ env.hpp"
```

## Name what one learning step returns

Add a Transition struct below the opponent loop. It packages the next game, a numeric reward and a terminal flag. These values describe one decision's consequences.

**Edit `env.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=env.hpp
#ifndef DICE_ENV_HPP
#define DICE_ENV_HPP
#include "io.hpp"
inline void opponent_turn(Game& g, std::mt19937& dice, int threshold = 4) {
    while (!finished(g) && g.turn == 1) {
        Action action = fixed_action(g, threshold);
        apply(g, action, action == Action::Roll ? roll(dice) : 1);
    }
}
struct Transition {
    Game next;
    double reward;
    bool done;
};
#endif
```

`Game next` owns a copy, so the result does not dangle after a local variable goes out of scope. Reward is a double to work with future value estimates. Done is a bool that distinguishes a last outcome from a successor where more decisions remain.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ env.hpp"
```

## Return to the next agent decision

Create `env.hpp`. The agent is always player 0 inside the learning environment; player 1 follows the bank-at-4 rule. `Transition` owns a copied successor plus reward and completion flag. `auto` asks the compiler to infer a variable type from its initializer; it remains statically typed.

```predict
question: After the agent banks, may a nonterminal successor have turn 1?
choice: No
choice: Yes
answer: No
explain: The wrapper plays the opponent until player 0 can choose again. A loss during that turn belongs to the preceding agent action.
```


**Edit `env.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=env.hpp
#ifndef DICE_ENV_HPP
#define DICE_ENV_HPP
#include "io.hpp"
inline void opponent_turn(Game& g, std::mt19937& dice, int threshold = 4) {
    while (!finished(g) && g.turn == 1) {
        Action action = fixed_action(g, threshold);
        apply(g, action, action == Action::Roll ? roll(dice) : 1);
    }
}
struct Transition {
    Game next;
    double reward;
    bool done;
};
inline Transition agent_step(Game g, Action action, std::mt19937& dice) {
    if (g.turn != 0) throw std::invalid_argument("not the agent turn");
    apply(g, action, action == Action::Roll ? roll(dice) : 1);
    opponent_turn(g, dice);
    const bool done = finished(g);
    const double reward = done ? (g.winner == 0 ? 1.0 : -1.0) : 0.0;
    return {g, reward, done};
}
#endif
```

Follow the calls in order: apply the agent move, then finish any intervening opponent turn. Only afterward compute reward. If player 1 wins during that turn, reward is -1 for the preceding agent action. `return {g, reward, done}` initializes the three fields in their declaration order.

Procedure: 1. Apply one agent action. 2. Finish the opponent turn if needed. 3. Detect the winner. 4. Return reward +1, -1, or 0. No intermediate points are rewards: otherwise the agent might prefer scoring to winning. We later use discount 1, so grouping multiple die events into one decision step does not introduce time-discount ambiguity.

A **Markov state** contains enough information to predict future outcomes given an action. Scores and pot suffice against this fixed memoryless opponent. Changing the opponent during training changes the environment; self-play is not automatically the same problem. **Transfer:** a card game with hidden hands would need an observation model; do not give the agent secret cards.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_env.cpp -o test_env"
run "./test_env" stdout="environment ok"
```

## Try it

Reverse both signs in explore_reward.cpp. The code runs, but now the objective belongs to player 1. Explain why copying that reward into the player-0 trainer would teach it to lose. Restore the signs.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Reward from the opponent seat

**No solution is shown.** Create `practice_05.cpp` yourself. Read a winner code: -1 for unfinished, 0 or 1 for the winner. Print reward from player 1’s perspective: 0, -1, or +1. This deliberately reverses the training agent’s perspective. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_05.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 0 | result=-1 |
| -1 | result=0 |
| 1 | result=1 |

```hints
nudge: Name whose reward you are computing.
concept: Reward signs are relative to the chosen player.
shape: Start at zero; use separate branches for the two winners.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_05.cpp -o practice"
run "./practice" stdin="0\n" stdout="result=-1\n" without="result=0\n"
run "./practice" stdin="-1\n" stdout="result=0\n" without="result=-1\n"
run "./practice" stdin="1\n" stdout="result=1\n" without="result=-1\n"
```

