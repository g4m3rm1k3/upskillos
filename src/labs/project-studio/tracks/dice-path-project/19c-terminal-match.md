---
title: A19c — Play the terminal match
track: C++ Games — Build the Project
trackOrder: 4.3
runtime: cpp
console: true
---

**Outcome:** Connect input, random generation and tested rules into a playable terminal match with a fixed-strategy opponent.

**Recall before looking at code:** Which component parses text, which generates faces, and which alone can change the game state?

This is the playable milestone: you are seat zero, the opponent is seat one, and the first score plus pot to reach twelve wins. You choose roll or bank; the opponent banks at a pot of four or more. It follows a fixed rule and has not learned anything yet. This lesson connects components you already understand. The later Q-learning section will replace the opponent’s decision, not rewrite the game.

## Create the application entry point

Create apps/dice_terminal.cpp. The application owns one Game and one Die for the whole match. It includes interfaces, not .cpp files. Seed 42 deliberately gives repeatable practice in the same build. Real variation between matches can be added later by selecting a seed once at startup.

**Edit `apps/dice_terminal.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/dice_terminal.cpp
#include <iostream>
#include <string>
#include "dice/Game.hpp"
#include "dice/Command.hpp"
#include "dice/Die.hpp"
int main() {
    dice::Game game;
    dice::Die die(42);
    std::cout << "Dice Duel: you=0 opponent=1 target=12\n";
    return 0;
}
```

Compile with g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal, then ./dice_terminal. Expect the game title and immediate exit. This first slice only constructs the dependencies; it is not playable until we add the loop. **Orchestration** means connecting existing operations in the right order, while leaving each rule in its responsible component.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="" stdout="Dice Duel: you=0 opponent=1 target=12"
```

## Present a snapshot without changing it

Add show above main and call it after the title. It borrows a snapshot read-only, then prints both banked scores, the shared turn pot and the current seat. This function is presentation: it must not bank, roll or pass a turn. The continued stream expression spans two lines for readability.

**Edit `apps/dice_terminal.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/dice_terminal.cpp
#include <iostream>
#include <string>
#include "dice/Game.hpp"
#include "dice/Command.hpp"
#include "dice/Die.hpp"
void show(const dice::GameSnapshot& view) {
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
}
int main() {
    dice::Game game;
    dice::Die die(42);
    std::cout << "Dice Duel: you=0 opponent=1 target=12\n";
    show(game.snapshot());
    return 0;
}
```

Compile and run again. Expect scores=0,0 pot=0 turn=0. The same snapshot can later feed a graphical display, so game code needs no terminal formatting.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="" stdout="scores=0,0 pot=0 turn=0"
```

## Keep the session alive until the player leaves

Replace the one-time display with a while loop. while repeats while its condition is true; unlike the earlier counted for loop, this loop has no predetermined number of iterations. A completed game makes the condition false. End of input and Quit use break to leave it. This temporary slice acknowledges other commands but does not apply them yet.

**Edit `apps/dice_terminal.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/dice_terminal.cpp
#include <iostream>
#include <string>
#include "dice/Game.hpp"
#include "dice/Command.hpp"
#include "dice/Die.hpp"
void show(const dice::GameSnapshot& view) {
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
}
int main() {
    dice::Game game;
    dice::Die die(42);
    std::cout << "Dice Duel: you=0 opponent=1 target=12\n";
    std::string line;
    while (!game.finished()) {
        show(game.snapshot());
        std::cout << "roll / bank / quit>\n";
        if (!std::getline(std::cin, line)) break;
        dice::Command command = dice::parseCommand(line);
        if (command == dice::Command::Quit) break;
        std::cout << "command received\n";
    }
    return 0;
}
```

Compile and run. Type roll then quit: the first request is acknowledged, then quit exits cleanly. Closing input also exits. A failed read must break; retrying forever on a closed stream would create a busy loop.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="roll\nquit\n" stdout="command received"
run "./dice_terminal" stdin="" without="command received"
```

## Generate a face only for a legal roll

Add perform above main. Both references borrow the application’s existing objects for mutation. Check legality before requesting a random number. Bank uses zero as an unused face; Roll generates exactly one face. Return the model’s acceptance result. This function connects responsibilities but does not reproduce the bank or bust formula.

```predict
question: Should an empty-pot Bank advance the die?
choice: No
choice: Yes
answer: No
explain: It is rejected before generation, and even a legal Bank needs no face.
```


**Edit `apps/dice_terminal.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/dice_terminal.cpp
#include <iostream>
#include <string>
#include "dice/Game.hpp"
#include "dice/Command.hpp"
#include "dice/Die.hpp"
void show(const dice::GameSnapshot& view) {
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
}
bool perform(dice::Game& game, dice::Die& die, dice::Action action) {
    if (!game.legal(action)) return false;
    int face = 0;
    if (action == dice::Action::Roll) {
        face = die.roll();
        std::cout << "rolled=" << face << '\n';
    }
    return game.apply(action, face);
}
int main() {
    dice::Game game;
    dice::Die die(42);
    std::cout << "Dice Duel: you=0 opponent=1 target=12\n";
    std::string line;
    while (!game.finished()) {
        show(game.snapshot());
        std::cout << "roll / bank / quit>\n";
        if (!std::getline(std::cin, line)) break;
        dice::Command command = dice::parseCommand(line);
        if (command == dice::Command::Quit) break;
        std::cout << "command received\n";
    }
    return 0;
}
```

Compile and run the existing quit case. The helper is defined but not called yet. Its legality guard protects the sequence from invalid requests; checking only after generating would make a replay depend on rejected input.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="quit\n" stdout="scores=0,0 pot=0 turn=0"
```

## Connect human requests to the model

Replace the temporary acknowledgment. Reject Invalid and continue to the next loop iteration, leaving the state untouched. Quit was already handled, so the remaining commands are Roll and Bank. Translate them to Action and call perform. Distinguish unknown command from a recognized action that the position forbids.

**Edit `apps/dice_terminal.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/dice_terminal.cpp
#include <iostream>
#include <string>
#include "dice/Game.hpp"
#include "dice/Command.hpp"
#include "dice/Die.hpp"
void show(const dice::GameSnapshot& view) {
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
}
bool perform(dice::Game& game, dice::Die& die, dice::Action action) {
    if (!game.legal(action)) return false;
    int face = 0;
    if (action == dice::Action::Roll) {
        face = die.roll();
        std::cout << "rolled=" << face << '\n';
    }
    return game.apply(action, face);
}
int main() {
    dice::Game game;
    dice::Die die(42);
    std::cout << "Dice Duel: you=0 opponent=1 target=12\n";
    std::string line;
    while (!game.finished()) {
        show(game.snapshot());
        std::cout << "roll / bank / quit>\n";
        if (!std::getline(std::cin, line)) break;
        dice::Command command = dice::parseCommand(line);
        if (command == dice::Command::Quit) break;
        if (command == dice::Command::Invalid) {
            std::cout << "unknown command\n";
            continue;
        }
        dice::Action action = dice::Action::Roll;
        if (command == dice::Command::Bank) action = dice::Action::Bank;
        if (!perform(game, die, action)) std::cout << "illegal action\n";
    }
    return 0;
}
```

Compile and run. Type bank, wrong, quit: see illegal action, unknown command and an unchanged starting state before each prompt. At this stage both seats still use human input; the next edit gives seat one its policy.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="bank\nwrong\nquit\n" stdout="illegal action"
run "./dice_terminal" stdin="bank\nwrong\nquit\n" stdout="unknown command" without="rolled="
```

## Let a policy choose the opponent’s action

Add opponentAction and the seat-one branch before the human prompt. A **policy** maps an observed state to a choice. This one rolls below a pot of four and banks otherwise. It does not change the snapshot. The application performs one opponent action per loop, then continue returns to the condition: the opponent may act again if it still owns the turn.

**Edit `apps/dice_terminal.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/dice_terminal.cpp
#include <iostream>
#include <string>
#include "dice/Game.hpp"
#include "dice/Command.hpp"
#include "dice/Die.hpp"
void show(const dice::GameSnapshot& view) {
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
}
bool perform(dice::Game& game, dice::Die& die, dice::Action action) {
    if (!game.legal(action)) return false;
    int face = 0;
    if (action == dice::Action::Roll) {
        face = die.roll();
        std::cout << "rolled=" << face << '\n';
    }
    return game.apply(action, face);
}
dice::Action opponentAction(const dice::GameSnapshot& view) {
    if (view.pot >= 4) return dice::Action::Bank;
    return dice::Action::Roll;
}
int main() {
    dice::Game game;
    dice::Die die(42);
    std::cout << "Dice Duel: you=0 opponent=1 target=12\n";
    std::string line;
    while (!game.finished()) {
        show(game.snapshot());
        if (game.snapshot().turn == 1) {
            dice::Action choice = opponentAction(game.snapshot());
            std::cout << "opponent acts\n";
            if (!perform(game, die, choice)) return 2;
            continue;
        }
        std::cout << "roll / bank / quit>\n";
        if (!std::getline(std::cin, line)) break;
        dice::Command command = dice::parseCommand(line);
        if (command == dice::Command::Quit) break;
        if (command == dice::Command::Invalid) {
            std::cout << "unknown command\n";
            continue;
        }
        dice::Action action = dice::Action::Roll;
        if (command == dice::Command::Bank) action = dice::Action::Bank;
        if (!perform(game, die, action)) std::cout << "illegal action\n";
    }
    return 0;
}
```

Compile and play. You type only for seat zero; opponent acts identifies automatic turns. Return status 2 means an internal policy mistake, because this particular rule should never select an illegal action in an unfinished game. Unlike bad human input, retrying that bug forever would hide a defect. No learning or probability estimate is involved in this policy.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="quit\n" stdout="roll / bank / quit>"
```

## Report a win separately from leaving

Add the final report after the loop. A winning roll sets the model’s winner, so the next loop condition stops all further play. A quit or closed input leaves an unfinished model and prints session ended. The final snapshot shows the winning pot even though those points were never banked.

**Edit `apps/dice_terminal.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/dice_terminal.cpp
#include <iostream>
#include <string>
#include "dice/Game.hpp"
#include "dice/Command.hpp"
#include "dice/Die.hpp"
void show(const dice::GameSnapshot& view) {
    std::cout << "scores=" << view.scores.at(0) << "," << view.scores.at(1)
              << " pot=" << view.pot << " turn=" << view.turn << '\n';
}
bool perform(dice::Game& game, dice::Die& die, dice::Action action) {
    if (!game.legal(action)) return false;
    int face = 0;
    if (action == dice::Action::Roll) {
        face = die.roll();
        std::cout << "rolled=" << face << '\n';
    }
    return game.apply(action, face);
}
dice::Action opponentAction(const dice::GameSnapshot& view) {
    if (view.pot >= 4) return dice::Action::Bank;
    return dice::Action::Roll;
}
int main() {
    dice::Game game;
    dice::Die die(42);
    std::cout << "Dice Duel: you=0 opponent=1 target=12\n";
    std::string line;
    while (!game.finished()) {
        show(game.snapshot());
        if (game.snapshot().turn == 1) {
            dice::Action choice = opponentAction(game.snapshot());
            std::cout << "opponent acts\n";
            if (!perform(game, die, choice)) return 2;
            continue;
        }
        std::cout << "roll / bank / quit>\n";
        if (!std::getline(std::cin, line)) break;
        dice::Command command = dice::parseCommand(line);
        if (command == dice::Command::Quit) break;
        if (command == dice::Command::Invalid) {
            std::cout << "unknown command\n";
            continue;
        }
        dice::Action action = dice::Action::Roll;
        if (command == dice::Command::Bank) action = dice::Action::Bank;
        if (!perform(game, die, action)) std::cout << "illegal action\n";
    }
    if (game.finished()) {
        show(game.snapshot());
        std::cout << "winner=" << game.snapshot().winner << '\n';
    } else {
        std::cout << "session ended\n";
    }
    return 0;
}
```

Compile and play to a win. Also try quit immediately and close input immediately: neither should invent a winner. The automated long-input run repeatedly requests Roll until this seeded match finishes; it checks integration, not a universal guarantee that every possible roll sequence ends within a fixed number of turns.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="quit\n" stdout="session ended"
run "./dice_terminal" stdin="roll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\n" stdout="winner=" without="session ended" label="Repeated Roll input finishes this seeded match and reports a winner"
```

## Try it — Locate a bug by responsibility

Change the opponent threshold from four to six, rebuild and play. This changes its choices, not the game rules. Restore four. Then type roll now: the parser should reject it with no rolled message before the next prompt. Trace that path through parseCommand, the Invalid branch, and continue. Finally bank an empty pot: this reaches legality checking but must still generate no face. Recover with A19 for parsing failures, A19b for die behavior or A18 for state transitions.



## Your turn — Count rejected human requests

Edit apps/dice_terminal.cpp without a supplied target. Add a session counter starting at zero. Increment it once for an unknown command or an illegal human action. Do not count Quit, end of input, legal moves or opponent actions. Print rejected=N once when leaving the loop, before the existing outcome report. Keep all existing game behavior.

| Input lines | Required final count |
|---|---|
| quit | rejected=0 |
| wrong, quit | rejected=1 |
| wrong, bank, quit | rejected=2 |
| no input | rejected=0 |

The commas above separate lines; do not type commas. Compile with g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal and run ./dice_terminal for each case.

```hints
nudge: The counter belongs to the session, outside the loop and outside Game.
concept: Increment at rejection branches, not at the top of every iteration.
shape: Initialize once, update in the Invalid branch and failed human perform branch, then report after the loop.
```

Explain why this belongs in the application rather than GameSnapshot: a misspelled word is not part of a game position. With the reference hidden, draw the path from one input line to one legal transition. These examples check counting and basic integration; also replay to completion and explain the policy before moving on to learning algorithms.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/dice_terminal.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp -o dice_terminal"
run "./dice_terminal" stdin="quit\n" stdout="rejected=0" without="winner="
run "./dice_terminal" stdin="wrong\nquit\n" stdout="rejected=1" without="rolled="
run "./dice_terminal" stdin="wrong\nbank\nquit\n" stdout="rejected=2" without="rolled="
run "./dice_terminal" stdin="" stdout="rejected=0" without="winner="
run "./dice_terminal" stdin="roll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\nroll\n" stdout="rejected=0" without="session ended" label="Repeated Roll input finishes this seeded match with zero rejected requests"
```

## Build and share the playable milestone

Add dice_terminal to CMake. This is an application target, not an unattended CTest test: it waits for a person’s input. Keep the separate rule, parser and die tests registered. Build, run all tests, then play ./build-dice/dice_terminal.

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
```

**Milestone review:** add the rules, seed behavior, commands, build instructions and current fixed opponent strategy to your own README. Ask someone to play from those instructions. Record one usability problem and propose a test before changing code. The terminal match is playable, but Q-learning has not been implemented. The next section must first teach observations, rewards and decision boundaries; a trained label cannot substitute for those mechanisms.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "ctest --test-dir build-dice --output-on-failure" stdout="dice_tests"
run "./build-dice/dice_terminal" stdin="quit\n" stdout="rejected=0"
```

