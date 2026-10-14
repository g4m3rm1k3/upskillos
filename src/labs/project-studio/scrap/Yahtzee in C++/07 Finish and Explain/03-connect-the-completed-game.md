---
title: 7.3 — One rule, three callers
runtime: none
teaches: separation of concerns, accounting, query reuse, reset
experiments: Predict, trace, change, check
---

### The story so far

The completed Scorecard rejects forbidden Joker actions and reports extra bonuses. The menu and player total still need to consume these new answers.

### What this lesson builds

Keep the UI consistent with model legality, account for each bonus once and verify that replay resets owned state.

## Show the actual legal menu {#step-1}

**Build:** update showMenu to distinguish taken, unavailable and legal categories. The turn loop remains the caller of the domain model.

```cpp file=Turn.cpp
#include <iostream>
#include <string>
#include <vector>

#include "Input.h"
#include "Scoring.h"
#include "Terminal.h"
#include "Turn.h"

static void showMenu(const Scorecard& scorecard, const Counts& counts) {
    std::vector<Category> shown = scorecard.preview(counts);
    for (std::size_t i = 0; i < shown.size(); i++) {
        std::cout << "*" << i + 1 << "* " << shown[i].name;
        if (scorecard.isScored(i)) {
            std::cout << ": " << shown[i].score << " (taken)";
        } else if (!scorecard.canRecord(i, counts)) {
            std::cout << " (unavailable under Joker rules)";
        } else {
            std::cout << ": " << shown[i].score;
        }
        std::cout << "\n";
    }
}

bool playTurn(Dice& dice, Scorecard& scorecard, const TurnOptions& options) {
    std::vector<bool> kept(dice.size(), false);
    dice.rollAll();
    if (options.animate) {
        dice.animate(kept);
    }
    int rollsUsed = 1;

    while (true) {
        Counts counts = countFaces(dice);
        if (options.animate) {
            clearScreen();
        }
        std::cout << "Roll " << rollsUsed << " of " << options.maxRolls << "\n";
        dice.draw();
        showMenu(scorecard, counts);

        bool canReroll = rollsUsed < options.maxRolls;
        int lowest = canReroll ? 0 : 1;
        std::string prompt = canReroll ? "Pick a category, or 0 to reroll: " : "Pick a category: ";

        int choice = 0;
        if (!askInt(prompt, lowest, static_cast<int>(scorecard.size()), choice)) {
            return false;
        }

        if (choice == 0) {
            std::cout << "Dice to keep (for example 1 3 5, a for all, Enter for none): ";
            std::string line;
            if (!readLine(line)) {
                return false;
            }
            kept = parseKeepers(line, dice.size());
            if (options.animate) {
                dice.animate(kept);
            } else {
                dice.rollFree(kept);
            }
            rollsUsed++;
        } else {
            std::size_t index = static_cast<std::size_t>(choice) - 1;
            if (scorecard.record(index, counts)) {
                std::cout << "You scored " << scorecard.score(index)
                          << " in " << scorecard.name(index) << "\n";
                return true;
            }
            std::cout << "That category is taken or unavailable under Joker rules.\n";
        }
    }
}
```

**Understand:** preview contains both recorded values and potential values. A negative marker in an untaken category is not a score to show the player. Ask isScored first, then canRecord, then print the potential score.

| State | What the player should see | What record does |
|---|---|---|
| box taken | recorded score and (taken) | rejects |
| empty but forbidden by Joker placement | unavailable under Joker rules | rejects |
| empty and legal | potential points | accepts once |

The rejection message now mentions both causes. The roll counter reports the current state; it is not responsible for enforcing category rules. That is still Scorecard's job.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build game" -- Save the changed source, then read the first compiler diagnostic.
```

## Include every bonus exactly once {#step-2}

**Build:** add the extra-bonus query to Player::finalScore. Keep your summary/reset exercise implementations; this cumulative snapshot includes their reference forms.

```cpp file=Player.cpp
#include <utility>

#include "Player.h"

Player::Player(std::string name) : playerName(std::move(name)) {}

const std::string& Player::name() const {
    return playerName;
}

Scorecard& Player::scorecard() {
    return card;
}

const Scorecard& Player::scorecard() const {
    return card;
}

int Player::finalScore() const {
    return card.total() + card.upperBonus() + card.yahtzeeBonus();
}

std::string Player::summary() const {
    return name() + ": " + std::to_string(finalScore()) + " points";
}

void Player::startNewGame() {
    card = Scorecard();
}
```

**Understand:** total() still means category points. upperBonus() reports the threshold bonus. yahtzeeBonus() reports repeated-Yahtzee points. Player adds each once; it does not repeat their rules.

Trace two turns with five sixes: first record Yahtzee=50, then forced Sixes=30 with extra bonus=100. Category total is 80, upper bonus is 0, final score is 180. Adding 100 to total() as well would produce 280 and double-count the same event.

`card = Scorecard()` assigns a freshly initialized value. The member initializer resets extra points; the category vector resets too; playerName is a different member and stays. Moving a value-owned member can transfer resources but is not a general promise that every move does no copying.

```predict
question: Should every preview category include the extra 100 before record runs?
choice: No — bonus is a separate accounting entry
choice: Yes — every displayed category should include it
answer: No — bonus is a separate accounting entry
explain: Preview is a query and several choices can be displayed. One accepted action earns one bonus.
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build game" -- Save the changed source, then read the first compiler diagnostic.
```

## Check total and replay with a known hand {#total-reset}

**Build:** a small executable that fixes one boundary case. Return 1 is a failed expectation; reaching the final message means every preceding condition held. Read the arranged state before running it.

```cpp file=tests/finish_probe.cpp provided
#include <iostream>
#include "../Scorecard.h"
int main() {
    Scorecard card;
    const Counts sixes = countFaces({6, 6, 6, 6, 6});
    card.record(CategoryId::Yahtzee, sixes);
    card.record(CategoryId::Sixes, sixes);
    if (card.total() + card.upperBonus() + card.yahtzeeBonus() != 180) return 1;
    card = Scorecard();
    if (card.total() != 0 || card.yahtzeeBonus() != 0) return 1;
    std::cout << "probe passed\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_probe.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o probe" label="Build probe" -- Save the changed source, then read the first compiler diagnostic.
run "./probe" stdout="probe passed" label="Observe the result"
```

## Build the full application {#step-3}

Run `g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game`, then `./game --fast --rolls 1`. The practice flag limits a turn to one roll so you can reach the results quickly. Default play uses three.

Use two players and verify the second player's record stays independent. A compiler check establishes type and link correctness; this interaction check establishes menu flow. Neither random play nor a compile can reliably reach the rare Joker case, so keep the controlled-hand tests.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build game" -- Save the changed source, then read the first compiler diagnostic.
```

## Try it — Find double accounting {#step-4}

Temporarily add the extra-bonus query twice in Player::finalScore. The breakdown task's acceptance test below checks that its independently displayed parts match finalScore and will fail. Restore the single addition before finishing.

> **Engineer:** expose useful derived facts through queries and compose them once. Repeating the rule in a formatter gives you two implementations to maintain.

## Read the independent acceptance cases {#acceptance-cases}

**Build:** install this test, then read each input and expected outcome before implementing the function. The test has main; your practice file supplies the requested function. Add an example of your own after these cases pass.

```cpp file=tests/finish_task_03.cpp provided
#include <iostream>
#include "../Player.h"
#include <string>
std::string breakdown(const Player& player);
int main() {
    Player player("Ada");
    if (breakdown(player) != "0 + 0 + 0 = 0") return 1;
    const Counts sixes = countFaces({6, 6, 6, 6, 6});
    player.scorecard().record(CategoryId::Yahtzee, sixes);
    player.scorecard().record(CategoryId::Sixes, sixes);
    if (player.finalScore() != 180 || breakdown(player) != "80 + 0 + 100 = 180") return 1;
    player.startNewGame();
    if (breakdown(player) != "0 + 0 + 0 = 0" || player.name() != "Ada") return 1;
    std::cout << "PASS: independent\n";
    return 0;
}
```

## Your turn — Make the accounting visible {#step-5}

**Build, on your own:** Define std::string breakdown(const Player& player). Return category total, upper bonus, extra bonus and final score in the form `80 + 0 + 100 = 180`. Use existing const queries, no duplicated scoring rules. The result for a fresh player is `0 + 0 + 0 = 0`.

Write practice/breakdown.cpp. Keep the test unchanged. If it fails, identify the first unsatisfied case and trace it by hand before editing.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_task_03.cpp practice/breakdown.cpp Player.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o exercise_result" label="Build exercise_result" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: independent" label="Observe the result"
```

```hints
nudge: The earlier summary exercise already converted a score into text.
concept: std::to_string converts each integer. A const reference borrows the card while preserving its owner.
shape: Join the three query results with " + ", then append " = " and finalScore. Do not mutate the card.
```
