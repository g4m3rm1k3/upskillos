---
title: Connect the completed game — UI, totals and replay
runtime: none
---

Carry the rule change through the menu and player total without duplicating its logic.

## Show the actual legal menu

Replace Turn.cpp with this snapshot. showMenu labels an unavailable Joker choice and record remains the authority: changing the menu must never bypass rule enforcement. This is separation of concerns with a concrete purpose. Turn handles conversation; Scorecard controls legal state transitions.

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

## Include every bonus exactly once

The earlier summary and replay exercises are included in this cumulative reference. Keep your own equivalent implementations. The actual scoring change is the extra `card.yahtzeeBonus()` term in finalScore.

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

Player.h must already declare `std::string summary() const;` and `void startNewGame();` in public from chapter 6. Likewise Input.h/Input.cpp must contain parseYesNo and askYesNo from chapters 4 and 6. A missing declaration is a prerequisite gap, not a reason to include a .cpp file.

`card = Scorecard()` assigns a newly initialized card. Its vector and bonus state reset; playerName stays. Standard containers manage their storage automatically. A move may transfer vector storage, but moving an arbitrary class does not guarantee that no data is copied. The chosen members determine what their moves do.

```predict
question: Should preview include 100 points in every visible Joker category?
choice: No — the bonus is separate and awarded once at commit
choice: Yes — add it to every category and the final total
answer: No — the bonus is separate and awarded once at commit
explain: Category points and extra-Yahtzee bonus are different accounting entries.
```

## Build the full application

Keep Ranking.cpp in sources.txt, as chapter 6 instructed. Compile and play:

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build the complete application"
```

Play `./game --fast --rolls 1` with two players. Finish all boxes, verify final totals and ties, and replay with the same names and fresh cards. A random match is an interaction check; it cannot prove a rare Joker rule. The deterministic rule tests do that.

## Try it — Find double accounting

Temporarily add the extra bonus both in total() and in finalScore(). Follow a repeated Yahtzee on paper: 100 becomes 200. Restore total() to category points only. Name exactly where each of category score, upper bonus and repeated-Yahtzee bonus enters the final total.

## Your turn — Transfer the idea

Extend summary to show category total, upper bonus and Yahtzee bonus separately as well as the final total. Add a test asserting that the displayed parts add up.

```hints
nudge: Keep formatting separate from calculating points.
concept: A const accessor can expose a derived result without permitting mutation.
shape: Use the three scorecard queries; do not recompute the rules in Player or Turn. Test replay resets the extra bonus too.
```
