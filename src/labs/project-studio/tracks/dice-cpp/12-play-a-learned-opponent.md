---
title: 12 — Play against what you trained
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
run: duel.cpp
---

You now have separate rules, a terminal interface, a learning algorithm, evaluation and storage. **Outcome:** train a saved opponent and play it with visible action values, without retraining during a match.

`trainer → dice-q.txt → frozen agent + human input → shared rules`

## Mask an unavailable action in the display

A displayed Q-value can suggest an action the player cannot legally take. Before integrating the model, print the legal choices for empty and nonempty pots.

```predict
question: If the UI hides Bank at pot zero, can the rules stop checking legality?
choice: No
choice: Yes
answer: No
explain: Other callers, tests and training can invoke the rules without using the UI.
```

```cpp file=explore_display.cpp
#include <iostream>
int main() {
    for (int pot : {0, 3}) {
        std::cout << "pot " << pot << " roll";
        if (pot > 0) std::cout << " bank";
        std::cout << '\n';
    }
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_display.cpp -o explore
./explore
```

Expected output:

```text
pot 0 roll
pot 3 roll bank
```

### How it works

Roll is printed unconditionally because both example states are live. Bank is printed only when pot is positive. The newline belongs after that branch so each state occupies one line. This is a UI reflection of the rule, not a substitute for enforcing legality in choose and apply.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_display.cpp -o explore"
run "./explore" stdout="pot 0 roll\npot 3 roll bank"
```

## Train a model file

Create `learn.cpp`. `std::exception` is the common base of our standard exceptions. `error.what()` describes the failure. `std::cerr` prints an error stream; return 1 signals failure to the shell and automated checks. Run this before compiling the final duel. It overwrites `dice-q.txt`; rename an earlier experiment first if you want to keep it.

**Edit `learn.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=learn.cpp
#include "train.hpp"
#include "storage.hpp"
#include <iostream>
int main() {
    try {
        Table q = train(101, 50000);
        save_table(q, "dice-q.txt");
        std::cout << "Saved dice-q.txt\n";
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n'; return 1;
    }
}
```

The try block performs three operations in order: train, save, report success. If either of the first two throws, control jumps to catch and the success message is skipped. `const std::exception&` handles these standard error types without copying the exception. `what()` supplies its description. `std::cerr` is the error stream, separate from normal output, and return 1 lets a script detect failure.

Compile and run using the checks below. A saved file proves the workflow completed, not that it beats a human. The preceding evaluation lesson is how you assess it.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic learn.cpp -o learn"
run "./learn" stdout="Saved dice-q.txt"
file dice-q.txt
```

## Load the saved table before starting a match

Create duel.cpp. First do only model loading and print its row count. Keep the table const. If the file is absent or invalid, report the error and stop rather than silently substituting an untrained table.

**Edit `duel.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=duel.cpp
#include "storage.hpp"
#include <iostream>
int main() {
    try {
        const Table q = load_table("dice-q.txt");
        std::cout << "Loaded " << q.size() << " rows\n";
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n'; return 1;
    }
}
```

This isolates persistence from gameplay. Run learn first to create dice-q.txt, then build and run duel. A successful load prints Loaded followed by the expected row count. The catch block uses the same exit-code contract as learn.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic duel.cpp -o stage"
run "./stage" stdout="Loaded"
```

## Run the familiar match loop beside the loaded model

Replace the row-count print with the same display/choose/apply loop you built for play.cpp. For this intermediate run, fixed policies still control both seats. Start player 1 so the human will take the first turn when input is added next.

**Edit `duel.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=duel.cpp
#include "storage.hpp"
#include <iostream>
int main() {
    try {
        const Table q = load_table("dice-q.txt");
        Game g; g.turn = 1;
        std::mt19937 dice(std::random_device{}()), choices(123);
        while (!finished(g)) {
            std::cout << "Agent " << g.score[0] << " You " << g.score[1]
                      << " pot " << g.pot << " turn " << g.turn << '\n';
            Action action = fixed_action(g);
            int face = action == Action::Roll ? roll(dice) : 1;
            apply(g, action, face);
        }
        std::cout << (g.winner == 0 ? "Agent wins\n" : "You win\n");
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n'; return 1;
    }
}
```

The loaded table stays available outside the loop but does not choose actions yet. This lets you check state initialization, turn switching and final output separately from model selection. Run it: one match completes and prints its winner. The two engines will serve different roles once choose is connected.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic duel.cpp -o stage"
run "./stage" stdout="Agent 0 You 0"
```

## Connect the human to player one

Add the turn loop. Human is player 1 now, matching the agent-as-player-0 convention. Begin with a fixed bot and let any non-q line roll; command validation returns in the next step.

**Edit `duel.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=duel.cpp
#include "storage.hpp"
#include <iostream>
int main() {
    try {
        const Table q = load_table("dice-q.txt");
        Game g; g.turn = 1;
        std::mt19937 dice(std::random_device{}()), choices(123);
        while (!finished(g)) {
            std::cout << "Agent " << g.score[0] << " You " << g.score[1]
                      << " pot " << g.pot << " turn " << g.turn << '\n';
            Action action = Action::Roll;
            if (g.turn == 1) {
                std::cout << "r=roll b=bank q=quit: ";
                std::string line;
                if (!std::getline(std::cin, line) || line == "q") {
                    std::cout << "Goodbye\n"; return 0;
                }
            } else {
                action = fixed_action(g);
            }
            int face = action == Action::Roll ? roll(dice) : 1;
            apply(g, action, face);
        }
        std::cout << (g.winner == 0 ? "Agent wins\n" : "You win\n");
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n'; return 1;
    }
}
```

Action starts as Roll each iteration, so the human branch does not use an uninitialized enum. The seeded choices engine will be used when we connect the model. random_device initializes varied live dice; use a fixed seed instead when reproducing a bug. EOF and q exit without taking another move.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic duel.cpp -o stage"
run "./stage" stdin="q\n" stdout="Goodbye"
```

## Restore command validation and move reporting

Add parsing, legality checks and the move report, just as in the earlier terminal game. Keep these controls working before changing the bot policy.

**Edit `duel.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=duel.cpp
#include "storage.hpp"
#include <iostream>
int main() {
    try {
        const Table q = load_table("dice-q.txt");
        Game g; g.turn = 1;
        std::mt19937 dice(std::random_device{}()), choices(123);
        while (!finished(g)) {
            std::cout << "Agent " << g.score[0] << " You " << g.score[1]
                      << " pot " << g.pot << " turn " << g.turn << '\n';
            Action action = Action::Roll;
            if (g.turn == 1) {
                std::cout << "r=roll b=bank q=quit: ";
                std::string line;
                if (!std::getline(std::cin, line) || line == "q") {
                    std::cout << "Goodbye\n"; return 0;
                }
                if (!parse_action(line, action) || !legal(g, action)) {
                    std::cout << "Invalid move\n"; continue;
                }
            } else {
                action = fixed_action(g);
            }
            int face = action == Action::Roll ? roll(dice) : 1;
            std::cout << (action == Action::Roll ? "roll " : "bank ")
                      << (action == Action::Roll ? face : g.pot) << '\n';
            apply(g, action, face);
        }
        std::cout << (g.winner == 0 ? "Agent wins\n" : "You win\n");
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n'; return 1;
    }
}
```

A bad command must continue before the die draw. The report reads the pot before apply clears it on banking. Try b at the initial prompt: it is invalid and the human keeps the turn. Then q should still exit cleanly.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic duel.cpp -o stage"
run "./stage" stdin="b\nq\n" stdout="Invalid move"
```

## Let the table choose the bot action

Create `duel.cpp`. Human is now player 1, agent is player 0, matching training. The human starts. `std::random_device{}()` seeds varied live dice; tests keep deterministic seeds. It is not used as a cryptographic guarantee. The learned table is `const`; no update function is called while playing.

```predict
question: The model learned against bank-at-4. Must its displayed values be accurate against your strategy?
choice: No
choice: Yes
answer: No
explain: A human can change the opponent distribution. Values are estimates for the training environment, not universal win probabilities.
```


**Edit `duel.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=duel.cpp
#include "storage.hpp"
#include <iostream>
int main() {
    try {
        const Table q = load_table("dice-q.txt");
        Game g; g.turn = 1;
        std::mt19937 dice(std::random_device{}()), choices(123);
        while (!finished(g)) {
            std::cout << "Agent " << g.score[0] << " You " << g.score[1]
                      << " pot " << g.pot << " turn " << g.turn << '\n';
            Action action = Action::Roll;
            if (g.turn == 1) {
                std::cout << "r=roll b=bank q=quit: ";
                std::string line;
                if (!std::getline(std::cin, line) || line == "q") {
                    std::cout << "Goodbye\n"; return 0;
                }
                if (!parse_action(line, action) || !legal(g, action)) {
                    std::cout << "Invalid move\n"; continue;
                }
            } else {
                const Row& row = q.at(state_id(g));
                std::cout << "Q roll " << row[0];
                if (g.pot > 0) std::cout << " bank " << row[1];
                std::cout << '\n';
                action = choose(q, g, 0.0, choices);
            }
            int face = action == Action::Roll ? roll(dice) : 1;
            std::cout << (action == Action::Roll ? "roll " : "bank ")
                      << (action == Action::Roll ? face : g.pot) << '\n';
            apply(g, action, face);
        }
        std::cout << (g.winner == 0 ? "Agent wins\n" : "You win\n");
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n'; return 1;
    }
}
```

Replace only the fixed bot branch. Read and display the current Q-row, omit the illegal bank value at pot zero, then choose with epsilon zero. The input, rules and output flow are unchanged. There is no update during play, so you are testing the saved policy.

```text
g++ -std=c++20 -Wall -Wextra -pedantic duel.cpp -o duel
./duel
```

Play in the terminal, then explain one agent move from its displayed values. At pot zero only roll is legal; the interface omits the bank value. For a reproducible bug report replace the live seed with 42, record inputs, and rebuild.

**Mastery check:** explain value versus reference using `agent_step` and `apply`; trace a bust; calculate a terminal update; distinguish a training score from evaluation; identify why playing a human is a distribution shift. If you cannot, revisit that lesson before adding graphics.

**Capstone, without copying:** add a bank-at-6 opponent experiment and write an honest comparison across fresh seeds. Then add a terminal replay mode that accepts recorded faces and actions. Replays must pass through `apply` and reject illegal moves. Keep model-format changes explicit.

**Next project: SDL3.** Build a small graphical dice/card game after this course: window lifetime with RAII, event handling, drawing scores/dice, a nonblocking input/update/render loop, then reuse these tested rules and frozen policy. SDL is a multimedia library, not the game rules. Never run the full training loop inside a render frame. SDL lessons are planned, not implemented here. [SDL3 documentation](https://wiki.libsdl.org/SDL3/FrontPage). For the learning algorithm, consult Sutton and Barto, *Reinforcement Learning: An Introduction*, section 6.5, [the authors' book site](http://incompleteideas.net/book/the-book-2nd.html).

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic duel.cpp -o duel"
run "./duel" stdin="b\nnonsense\nq\n" stdout="Invalid move" without="turn 0"
run "./duel" stdin="q\n" stdout="Goodbye"
```

## Try it

Change pot > 0 to pot >= 0 in explore_display.cpp. Bank incorrectly appears at an empty pot. Explain why the display, selector and rule function all need consistent legality before restoring the comparison.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Choose from a frozen row legally

**No solution is shown.** Create `practice_12.cpp` yourself. Read pot, roll value and bank value. If pot is zero, print roll. Otherwise print the action with the larger value; for this deterministic exercise break ties by choosing roll. Do not change the model or draw random numbers. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_12.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 0 -0.4 99 | result=roll |
| 3 -0.4 0.7 | result=bank |

```hints
nudge: Apply legality before ranking the values.
concept: An unavailable action is excluded even if its stored value is huge.
shape: Force roll for an empty pot; otherwise compare the two estimates.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_12.cpp -o practice"
run "./practice" stdin="0 -0.4 99\n" stdout="result=roll\n" without="result=bank\n"
run "./practice" stdin="3 -0.4 0.7\n" stdout="result=bank\n" without="result=roll\n"
```

