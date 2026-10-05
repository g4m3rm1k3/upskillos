---
title: 4 — A complete console duel
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
run: play.cpp
---

You type `b` at pot 0. The game should explain the mistake and ask again, not give the bot a turn. **Outcome:** build an interactive game loop that shares its tested rules with a fixed opponent.

`display → read / choose → validate → apply → repeat`

## Follow continue through a loop

Invalid input must skip applying a move, but must not end the game. Isolate that control-flow decision before adding a keyboard to the match.

```predict
question: Does the line after continue print apply 1?
choice: No
choice: Yes
answer: No
explain: continue skips the remaining body for command 1.
```

```cpp file=explore_continue.cpp
#include <iostream>
int main() {
    for (int command = 0; command < 3; ++command) {
        if (command == 1) {
            std::cout << "reject\n";
            continue;
        }
        std::cout << "apply " << command << '\n';
    }
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_continue.cpp -o explore
./explore
```

Expected output:

```text
apply 0
reject
apply 2
```

### How it works

| command | condition | output | reaches apply? |
|---|---|---|---|
| 0 | false | apply 0 | yes |
| 1 | true | reject | no |
| 2 | false | apply 2 | yes |

Continue jumps to this loop's next iteration. In a for loop the increment runs before the condition is tested again. Break would exit the whole loop and lose the final apply 2. Return would exit main entirely. These are three different control-flow decisions.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_continue.cpp -o explore"
run "./explore" stdout="apply 0\nreject\napply 2"
```

## Watch two fixed policies finish a game

Before handling keyboard input, make the computer play both seats. Create `play.cpp`. Initialize one game and one seeded engine, then repeat display, choose and apply until a winner exists.

**Edit `play.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=play.cpp
#include "io.hpp"
#include <iostream>
int main() {
    Game g;
    std::mt19937 dice(42);
    while (!finished(g)) {
        std::cout << "You " << g.score[0] << " Bot " << g.score[1]
                  << " pot " << g.pot << " turn " << g.turn << '\n';
        Action action = fixed_action(g);
        int face = action == Action::Roll ? roll(dice) : 1;
        apply(g, action, face);
    }
}
```

A loop iteration performs one move, not necessarily a whole turn. A roll of 2–6 may leave the same player active. The conditional expression draws a face only for Roll; Bank uses an ignored placeholder 1. Run the program: you should see changing scores and pots, then it exits. If it runs forever, inspect whether apply changes the same Game by reference.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic play.cpp -o stage"
run "./stage" stdout="You 0 Bot 0"
```

## Show the outcome after the loop

Keep the automatic players, but add the final winner message after the loop. The loop stops because finished became true; now the saved winner tells us which message to show.

**Edit `play.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=play.cpp
#include "io.hpp"
#include <iostream>
int main() {
    Game g;
    std::mt19937 dice(42);
    while (!finished(g)) {
        std::cout << "You " << g.score[0] << " Bot " << g.score[1]
                  << " pot " << g.pot << " turn " << g.turn << '\n';
        Action action = fixed_action(g);
        int face = action == Action::Roll ? roll(dice) : 1;
        apply(g, action, face);
    }
    std::cout << (g.winner == 0 ? "You win\n" : "Bot wins\n");
}
```

Putting this output inside the loop would announce an outcome before the game ended. A single final message distinguishes a complete match from an intermediate score. This version still controls both seats automatically.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic play.cpp -o stage"
run "./stage"
```

## Pause for a human line and support quitting

Inside the loop, add an input branch only when turn is 0. For this intermediate version, any line except q means Roll. The next step will parse r and b properly. Also print the chosen move before applying it.

**Edit `play.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=play.cpp
#include "io.hpp"
#include <iostream>
int main() {
    Game g;
    std::mt19937 dice(42);
    while (!finished(g)) {
        std::cout << "You " << g.score[0] << " Bot " << g.score[1]
                  << " pot " << g.pot << " turn " << g.turn << '\n';
        Action action = fixed_action(g);
        if (g.turn == 0) {
            std::cout << "r=roll b=bank q=quit: ";
            std::string line;
            if (!std::getline(std::cin, line) || line == "q") {
                std::cout << "Goodbye\n"; return 0;
            }
            action = Action::Roll;
        }
        int face = action == Action::Roll ? roll(dice) : 1;
        std::cout << (action == Action::Roll ? "roll " : "bank ")
                  << (action == Action::Roll ? face : g.pot) << '\n';
        apply(g, action, face);
    }
    std::cout << (g.winner == 0 ? "You win\n" : "Bot wins\n");
}
```

`std::getline(std::cin, line)` waits for a complete line. If it returns false, input has ended, so exit gracefully. Testing q in the same condition handles deliberate quitting. The branch for player 1 still uses the fixed policy. Run, type any word, then q; this proves the waiting and exit paths independently of parsing.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic play.cpp -o stage"
run "./stage" stdin="q\n" stdout="Goodbye"
```

## Reject bad text and illegal banking

Replace the temporary forced Roll with parse_action and legal. The parser recognizes the command; the rule checks whether that action is allowed in this state. A readable b can still be illegal at pot zero.

**Edit `play.cpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=play.cpp
#include "io.hpp"
#include <iostream>
int main() {
    Game g;
    std::mt19937 dice(42);
    while (!finished(g)) {
        std::cout << "You " << g.score[0] << " Bot " << g.score[1]
                  << " pot " << g.pot << " turn " << g.turn << '\n';
        Action action = fixed_action(g);
        if (g.turn == 0) {
            std::cout << "r=roll b=bank q=quit: ";
            std::string line;
            if (!std::getline(std::cin, line) || line == "q") {
                std::cout << "Goodbye\n"; return 0;
            }
            if (!parse_action(line, action) || !legal(g, action)) {
                std::cout << "Invalid move\n"; continue;
            }
        }
        int face = action == Action::Roll ? roll(dice) : 1;
        std::cout << (action == Action::Roll ? "roll " : "bank ")
                  << (action == Action::Roll ? face : g.pot) << '\n';
        apply(g, action, face);
    }
    std::cout << (g.winner == 0 ? "You win\n" : "Bot wins\n");
}
```

`continue` restarts the while loop before any face is drawn or move applied. Invalid input therefore neither passes the turn nor consumes randomness. Try b, nonsense, then q at the initial prompt: two rejections, no bot turn, then Goodbye.

```text
g++ -std=c++20 -Wall -Wextra -pedantic play.cpp -o play
./play
```

Play several games in the terminal. The seed 42 makes debugging reproducible; changing it changes the sequence. EOF exits gracefully, which also makes automated input tests finite. The automated check types an invalid bank, nonsense, then quit. It proves input recovery, not strategy strength.

**Explain:** why does banking avoid drawing a die? Consuming unused randomness makes traces harder to compare. **Challenge:** add a help command that prints the rules without altering state or consuming randomness.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic play.cpp -o play"
run "./play" stdin="b\nwrong\nq\n" stdout="Invalid move" without="turn 1"
run "./play" stdin="q\n" stdout="Goodbye"
```

## Try it

Replace continue with break in explore_continue.cpp. The final apply 2 disappears. Replace it with return 0 and explain why a function exit is stronger than a loop exit. Restore continue.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Count accepted commands

**No solution is shown.** Create `practice_04.cpp` yourself. Read whole command lines until q or EOF. Count only r and b. Ignore every other line. Print the accepted count once, at the end. This tests parsing, not game legality. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_04.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| r, then wrong, then b, then q | result=2 |
| wrong, then q | result=0 |

```hints
nudge: Keep the counter outside the loop.
concept: A command can parse even when a real game would reject it.
shape: Read lines, stop at q, increment only for the two recognized commands.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_04.cpp -o practice"
run "./practice" stdin="r\nwrong\nb\nq\n" stdout="result=2\n" without="result=0\n"
run "./practice" stdin="wrong\nq\n" stdout="result=0\n" without="result=2\n"
```

