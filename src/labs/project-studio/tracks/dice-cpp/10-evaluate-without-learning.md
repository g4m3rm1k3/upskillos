---
title: 10 — Is it better, or just lucky?
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

A policy that wins 1200 of 2000 games has win rate 0.6. Its approximate sampling standard error is `sqrt(0.6 * 0.4 / 2000)`, about 0.011. **Outcome:** compare a frozen learner to a baseline on held-out randomness and disclose what that comparison cannot prove.

`training seeds → frozen table → unseen evaluation seeds → baseline and uncertainty`

## Separate a rate from its uncertainty

Winning 1200 of 2000 games gives a rate of 0.6. We also need a sense of how much the rate might vary with another sample. Compute an approximate standard error for repeated independent win/loss trials.

```figure
name: dice/RateUncertainty
caption: Change one setting and follow the calculation. Then implement the same arithmetic in C++.
```

First explore the controls. The figure illustrates the calculation; your own executable below is what you will build and check.

```predict
question: Does this standard error measure variation between training seeds?
choice: No
choice: Yes
answer: No
explain: It describes game sampling for one frozen policy; training variability requires separately trained policies.
```

```cpp file=explore_rate.cpp
#include <iostream>
#include <cmath>
#include <iomanip>
int main() {
    double wins = 1200, games = 2000;
    double rate = wins / games;
    double se = std::sqrt(rate * (1.0 - rate) / games);
    std::cout << rate << '\n';
    std::cout << std::fixed << std::setprecision(3) << se << '\n';
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_rate.cpp -o explore
./explore
```

Expected output:

```text
0.6
0.011
```

### How it works

The quantity rate * (1-rate) is 0.24. Dividing by 2000 gives 0.00012; its square root is about 0.010954. fixed with setprecision(3) displays three decimal places, giving 0.011, without rounding the stored se.

Increasing the game count by four reduces this standard error by about half. This approximation does not include variability between separately trained models. Alternating starters also calls for care: you can compute separate rates by starting seat.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_rate.cpp -o explore"
run "./explore" stdout="0.6\n0.011"
```

## Test that evaluation cannot train

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

Evaluation must leave every Q-cell unchanged. The symmetric fixed-versus-fixed matchup is a smoke test for a roughly balanced starting schedule, not a pass threshold for machine learning.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

Copy the trained table before evaluating. Compare every cell afterward, then repeat the same evaluation seed.

**Edit `test_eval.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_eval.cpp
#include "evaluate.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = train(9, 3000), before = q;
    double rate = evaluate(q, 900009, 500);
    assert(rate >= 0.0 && rate <= 1.0 && q == before);
    assert(rate == evaluate(q, 900009, 500));
}
```

The score must be in [0,1], the table must be unchanged, and rerunning must agree. Those are three independent properties, not three ways to measure strength.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_eval.cpp "assert(rate == evaluate(q, 900009, 500));"
```

## Test a baseline and invalid sample size

The fixed policy plays itself with alternating starters. A broad 40–60% range catches gross score or seat bugs. Also require zero games to throw.

**Edit `test_eval.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_eval.cpp
#include "evaluate.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = train(9, 3000), before = q;
    double rate = evaluate(q, 900009, 500);
    assert(rate >= 0.0 && rate <= 1.0 && q == before);
    assert(rate == evaluate(q, 900009, 500));
    double baseline = evaluate(q, 900009, 2000, false);
    assert(baseline > 0.4 && baseline < 0.6);
    bool rejected = false;
    try { evaluate(q, 1, 0); }
    catch (const std::invalid_argument&) { rejected = true; }
    assert(rejected);
    std::cout << "evaluation ok\n";
}
```

Division by zero is not a meaningful experiment. The rejection flag proves the API explains invalid input instead of returning an unusable number.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_eval.cpp "std::cout << \"evaluation ok\\n\";"
```

## Create a read-only experiment

Create evaluate.hpp with a const reference to the model and an explicit positive game count. Seed evaluation separately from training. This first version returns zero while we build the match loop.

**Edit `evaluate.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=evaluate.hpp
#ifndef DICE_EVALUATE_HPP
#define DICE_EVALUATE_HPP
#include "train.hpp"
inline double evaluate(const Table& q, unsigned seed, int games,
                       bool learned = true, int opponent_threshold = 4) {
    if (games <= 0) throw std::invalid_argument("positive games required");
    std::mt19937 dice(seed), choices(seed + 100000u);
    int wins = 0;
    return 0.0;
}
#endif
```

Const prevents accidental table writes through q. Reject games <= 0 before any division. The learned flag will choose between policies later, and opponent_threshold lets us test a changed opponent. The unused-variable warnings disappear as the experiment is assembled.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ evaluate.hpp"
```

## Measure the fixed policy before the learned one

Add the match loop with fixed_action controlling player 0. Player 1 also uses the fixed policy by default. Alternate starting players, complete every match, then increment wins only for player 0.

**Edit `evaluate.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=evaluate.hpp
#ifndef DICE_EVALUATE_HPP
#define DICE_EVALUATE_HPP
#include "train.hpp"
inline double evaluate(const Table& q, unsigned seed, int games,
                       bool learned = true, int opponent_threshold = 4) {
    if (games <= 0) throw std::invalid_argument("positive games required");
    std::mt19937 dice(seed), choices(seed + 100000u);
    int wins = 0;
    for (int episode = 0; episode < games; ++episode) {
        Game g; g.turn = episode % 2;
        int decisions = 0;
        while (!finished(g)) {
            if (++decisions > 10000) throw std::runtime_error("evaluation guard");
            if (g.turn == 1) { opponent_turn(g, dice, opponent_threshold); continue; }
            Action action = fixed_action(g);
            apply(g, action, action == Action::Roll ? roll(dice) : 1);
        }
        wins += g.winner == 0;
    }
    return static_cast<double>(wins) / games;
}
#endif
```

`wins += g.winner == 0` adds 1 when the comparison is true and 0 otherwise. Convert wins to double before division. A record of 3 wins in 5 games must produce 0.6, not integer zero. Opponent turns and agent moves use the same rules as the playable game, preventing evaluation on a different game by accident.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ evaluate.hpp"
```

## Switch policies without changing the experiment

Create `evaluate.hpp`. A `const Table&` enforces read-only evaluation through this interface. Epsilon zero removes exploratory actions, but equal best actions still use random tie-breaking. Alternate the starting player so first-move advantage does not masquerade as learning.

```predict
question: A learned policy wins during training with epsilon 0.5. Is that its greedy evaluation score?
choice: No
choice: Yes
answer: No
explain: Training includes exploratory actions and changes the table. Evaluation freezes both the table and the exploration setting.
```


**Edit `evaluate.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=evaluate.hpp
#ifndef DICE_EVALUATE_HPP
#define DICE_EVALUATE_HPP
#include "train.hpp"
inline double evaluate(const Table& q, unsigned seed, int games,
                       bool learned = true, int opponent_threshold = 4) {
    if (games <= 0) throw std::invalid_argument("positive games required");
    std::mt19937 dice(seed), choices(seed + 100000u);
    int wins = 0;
    for (int episode = 0; episode < games; ++episode) {
        Game g; g.turn = episode % 2;
        int decisions = 0;
        while (!finished(g)) {
            if (++decisions > 10000) throw std::runtime_error("evaluation guard");
            if (g.turn == 1) { opponent_turn(g, dice, opponent_threshold); continue; }
            Action action = learned ? choose(q, g, 0.0, choices) : fixed_action(g);
            apply(g, action, action == Action::Roll ? roll(dice) : 1);
        }
        wins += g.winner == 0;
    }
    return static_cast<double>(wins) / games;
}
#endif
```

Replace just the action-selection line. The learned branch uses choose with epsilon 0; the baseline branch retains fixed_action. Everything else stays the same. Never call update here: the experiment must measure a frozen policy.

Procedure: 1. Freeze the table. 2. Use new seeds. 3. Alternate starters. 4. Count complete-game wins. 5. Compare to the fixed policy under the same evaluation protocol. The bank-at-7 opponent is a distribution shift; do not tune against its reported test scores and still call them held out.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_eval.cpp -o test_eval"
run "./test_eval" stdout="evaluation ok"
```

## Repeat an experiment for independent training seeds

Create experiment.cpp. The braced list gives the loop three explicit seeds. Train a fresh table for each seed and evaluate the fixed-policy baseline on held-out dice.

**Edit `experiment.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=experiment.cpp
#include "evaluate.hpp"
#include <iostream>
int main() {
    for (unsigned seed : {101u, 202u, 303u}) {
        Table q = train(seed, 50000);
        double baseline = evaluate(q, 900000u + seed, 2000, false);
        std::cout << "seed " << seed << " baseline " << baseline << '\n';
    }
}
```

The u suffix marks each seed literal as unsigned. Each printed line records which run produced that score; without the seed, a result is harder to reproduce. Run the program now. Its baseline scores should vary, even though the policy is unchanged.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic experiment.cpp -o stage"
run "./stage" stdout="seed 303 baseline"
```

## Report sampling error and an opponent change

Create `experiment.cpp`. The range loop uses three independent training seeds. Build with the command below and run `./experiment`. Write down all printed rows, compiler version, episode count and opponent rule. There is no promised win percentage.

The standard error measures game-sampling variability for one frozen policy; it does not measure variation between training runs. Report that spread separately. Games alternate starters, so the pooled Bernoulli formula is an approximation; stratify by starter for a more careful analysis.

**Edit `experiment.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=experiment.cpp
#include "evaluate.hpp"
#include <iostream>
int main() {
    for (unsigned seed : {101u, 202u, 303u}) {
        Table q = train(seed, 50000);
        double baseline = evaluate(q, 900000u + seed, 2000, false);
        double learned = evaluate(q, 900000u + seed, 2000);
        double changed = evaluate(q, 950000u + seed, 2000, true, 7);
        double se = std::sqrt(learned * (1.0 - learned) / 2000.0);
        std::cout << "seed " << seed << " baseline " << baseline
                  << " learned " << learned << " approximate_se " << se
                  << " bank7 " << changed << '\n';
    }
}
```

Add the learned score, approximate standard error and bank-at-7 score before printing them. `std::sqrt` computes a square root; the arithmetic inside is p times (1-p), divided by the sample size. Keep all rows, including disappointing runs.

Interpretation task: compare learned minus baseline for every seed, rather than choosing the nicest run. A rough interval is rate plus/minus twice the printed standard error; it is not a rigorous interval for a difference between two policies. Shared seed numbers do not make trajectories identical because policies consume different numbers of dice.

**Detect a bad claim:** “Our agent is optimal because it won one game.” Reject it: no optimality proof or reference solution was computed. **Transfer:** compare performance on bank-at-7, but do not claim competence against every human or self-play opponent. Tune on separate development seeds, then run untouched test seeds once.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic experiment.cpp -o experiment"
run "./experiment" stdout="seed 303 baseline"
```

## Try it

In explore_rate.cpp multiply both wins and games by four. The rate stays 0.6 and the standard error roughly halves. Then change only wins: this changes the rate, so it is a different comparison. Restore the original values.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Report a win rate

**No solution is shown.** Create `practice_10.cpp` yourself. Read wins and games as integers, with 0 <= wins <= games and games > 0. Print the win rate as a real number without rounding it to a whole percentage. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_10.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 3 5 | result=0.6 |
| 1 4 | result=0.25 |

```hints
nudge: A fraction needs floating-point division.
concept: Converting the result after integer division is too late.
shape: Read both integers and convert wins before dividing.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_10.cpp -o practice"
run "./practice" stdin="3 5\n" stdout="result=0.6\n" without="result=0.25\n"
run "./practice" stdin="1 4\n" stdout="result=0.25\n" without="result=0.6\n"
```

