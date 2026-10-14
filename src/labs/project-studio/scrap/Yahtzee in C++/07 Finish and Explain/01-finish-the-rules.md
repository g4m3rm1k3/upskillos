---
title: 7.1 — Separate a rule question from a state change
runtime: none
track: Finish and Explain
teaches: domain rules, sentinel, const query, state initialization
experiments: Predict, trace, change, check
---

### The story so far

You have a working multiplayer game. Scorecard owns recorded categories; Player derives a total; Turn asks the player what to do. The missing repeated-Yahtzee rules expose why those responsibilities matter.

### What this lesson builds

Model the distinction between a recorded zero and an empty box, then add a read-only bonus query without changing scoring yet.

## Turn the missing rule into cases {#step-1}

**Understand:** a second five-of-a-kind creates two questions: which box may be used, and whether extra bonus points are earned. Do not combine them into one flag.

This follows [Hasbro's bonus and Joker rules](https://hasbro-new.custhelp.com/app/answers/detail/a_id/211/~/i-have-already-rolled-a-yahtzee,-how-do-i-score-it,-if-i-roll-another-one%3F). With Yahtzee already recorded, a new five-of-a-kind forces its upper box if open, otherwise an open lower box, otherwise a zero in another upper box. The extra 100 points require the previous Yahtzee score to be 50. A previously recorded zero still activates Joker placement without the bonus.

| Old Yahtzee box | New hand | Joker placement? | Extra bonus? |
|---|---|---|---:|
| -1 (unscored) | five sixes | no | 0 |
| 0 (scratched) | five sixes | yes | 0 |
| 50 | five sixes | yes | 100 |
| 50 | four sixes and a one | no | 0 |

A **sentinel** is a value reserved for a special state. -1 means unscored; zero is a real recorded result. A truthiness check such as if(score) would confuse those states.

```predict
question: Yahtzee was scratched and Sixes is open. Can five sixes go into Chance?
choice: No — Sixes is required, without an extra bonus
choice: Yes — scratching disables every Joker rule
answer: No — Sixes is required, without an extra bonus
explain: Destination restrictions and bonus eligibility are separate decisions.
```

## Declare the contract before implementing it {#step-2}

**Build:** add one integer of private state and one const accessor. The diff should add only extraYahtzeePoints and yahtzeeBonus; the rest is your existing header, including earlier exercise declarations.

```cpp file=Scorecard.h
#ifndef SCORECARD_H
#define SCORECARD_H

#include <cstddef>
#include <string>
#include <vector>

#include "Scoring.h"

enum class CategoryId : std::size_t {
    Ones,
    Twos,
    Threes,
    Fours,
    Fives,
    Sixes,
    ThreeOfAKind,
    FourOfAKind,
    FullHouse,
    SmallStraight,
    LargeStraight,
    Yahtzee,
    Chance,
    Count
};

bool isUpperSection(CategoryId id);

struct Category {
    std::string name;
    int score;
};

class Scorecard {
public:
    static constexpr int UNSCORED = -1;
    static constexpr std::size_t CATEGORY_COUNT = static_cast<std::size_t>(CategoryId::Count);
    static constexpr int UPPER_BONUS_THRESHOLD = 63;
    static constexpr int UPPER_BONUS_POINTS = 35;

    Scorecard();

    std::size_t size() const;
    const std::string& name(std::size_t i) const;
    const std::string& name(CategoryId id) const;
    bool isScored(std::size_t i) const;
    bool isScored(CategoryId id) const;
    int score(std::size_t i) const;
    int score(CategoryId id) const;
    bool record(std::size_t i, const Counts& counts);
    bool record(CategoryId id, const Counts& counts);
    bool allScored() const;
    int total() const;
    int upperBonus() const;
    int yahtzeeBonus() const;
    CategoryId bestChoice(const Counts& counts) const;
    std::vector<Category> preview(const Counts& counts) const;

private:
    std::vector<Category> categories;
    int extraYahtzeePoints = 0;
};

#endif
```

**Understand:** `= 0` initializes this member on every new scorecard. Keeping it private prevents a UI caller from awarding points directly. `int yahtzeeBonus() const` promises a query through a read-only card. This query reports the total extra bonus, not whether a proposed action would earn one.

A declaration without its definition is a temporary edit checkpoint. The next step provides the definition before we ask anything to link against it.

## Implement one query {#bonus-query}

**Build:** add the one-line accessor. No game rule changes yet.

```cpp file=Scorecard.cpp
#include <functional>

#include "Scorecard.h"

namespace {

struct Rule {
    const char* name;
    std::function<int(const Counts&)> score;
};

const Rule& ruleAt(std::size_t index) {
    static const Rule table[] = {
        {"Ones", [](const Counts& c) { return scoreUpper(c, 1); }},
        {"Twos", [](const Counts& c) { return scoreUpper(c, 2); }},
        {"Threes", [](const Counts& c) { return scoreUpper(c, 3); }},
        {"Fours", [](const Counts& c) { return scoreUpper(c, 4); }},
        {"Fives", [](const Counts& c) { return scoreUpper(c, 5); }},
        {"Sixes", [](const Counts& c) { return scoreUpper(c, 6); }},
        {"Three of a kind", [](const Counts& c) { return scoreOfAKind(c, 3); }},
        {"Four of a kind", [](const Counts& c) { return scoreOfAKind(c, 4); }},
        {"Full house", scoreFullHouse},
        {"Small straight", scoreSmallStraight},
        {"Large straight", scoreLargeStraight},
        {"Yahtzee", scoreYahtzee},
        {"Chance", scoreChance},
    };
    static_assert(sizeof(table) / sizeof(table[0]) == Scorecard::CATEGORY_COUNT,
                  "one rule is needed for every category");
    return table[index];
}

std::size_t indexOf(CategoryId id) {
    return static_cast<std::size_t>(id);
}

}  // namespace

bool isUpperSection(CategoryId id) {
    switch (id) {
        case CategoryId::Ones:
        case CategoryId::Twos:
        case CategoryId::Threes:
        case CategoryId::Fours:
        case CategoryId::Fives:
        case CategoryId::Sixes:
            return true;
        case CategoryId::ThreeOfAKind:
        case CategoryId::FourOfAKind:
        case CategoryId::FullHouse:
        case CategoryId::SmallStraight:
        case CategoryId::LargeStraight:
        case CategoryId::Yahtzee:
        case CategoryId::Chance:
        case CategoryId::Count:
            return false;
    }
    return false;
}

Scorecard::Scorecard() {
    categories.reserve(CATEGORY_COUNT);
    for (std::size_t i = 0; i < CATEGORY_COUNT; i++) {
        categories.push_back(Category{ruleAt(i).name, UNSCORED});
    }
}

std::size_t Scorecard::size() const {
    return categories.size();
}

const std::string& Scorecard::name(std::size_t i) const {
    return categories[i].name;
}

const std::string& Scorecard::name(CategoryId id) const {
    return name(indexOf(id));
}

bool Scorecard::isScored(std::size_t i) const {
    return categories[i].score != UNSCORED;
}

bool Scorecard::isScored(CategoryId id) const {
    return isScored(indexOf(id));
}

int Scorecard::score(std::size_t i) const {
    return categories[i].score;
}

int Scorecard::score(CategoryId id) const {
    return score(indexOf(id));
}

bool Scorecard::record(std::size_t i, const Counts& counts) {
    if (i >= categories.size() || categories[i].score != UNSCORED) {
        return false;
    }
    categories[i].score = ruleAt(i).score(counts);
    return true;
}

bool Scorecard::record(CategoryId id, const Counts& counts) {
    return record(indexOf(id), counts);
}

bool Scorecard::allScored() const {
    for (const Category& c : categories) {
        if (c.score == UNSCORED) {
            return false;
        }
    }
    return true;
}

int Scorecard::total() const {
    int sum = 0;
    for (const Category& c : categories) {
        if (c.score != UNSCORED) {
            sum += c.score;
        }
    }
    return sum;
}

int Scorecard::upperBonus() const {
    int upper = 0;
    for (std::size_t i = 0; i < categories.size(); i++) {
        if (isUpperSection(static_cast<CategoryId>(i)) && categories[i].score != UNSCORED) {
            upper += categories[i].score;
        }
    }
    return upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0;
}

std::vector<Category> Scorecard::preview(const Counts& counts) const {
    std::vector<Category> shown = categories;
    for (std::size_t i = 0; i < shown.size(); i++) {
        if (shown[i].score == UNSCORED) {
            shown[i].score = ruleAt(i).score(counts);
        }
    }
    return shown;
}

CategoryId Scorecard::bestChoice(const Counts& counts) const {
    std::vector<Category> shown = preview(counts);
    CategoryId best = CategoryId::Count;
    int bestScore = -1;
    for (std::size_t i = 0; i < shown.size(); ++i) {
        if (!isScored(i) && shown[i].score > bestScore) {
            best = static_cast<CategoryId>(i);
            bestScore = shown[i].score;
        }
    }
    return best;
}

int Scorecard::yahtzeeBonus() const { return extraYahtzeePoints; }
```

**Understand:** the generated default member initializer gives the query a well-defined zero to return. Copying a scorecard copies its bonus integer along with the category vector. Assigning a freshly constructed card during replay also resets this field.

> **Engineer:** store each independent fact once. The UI can read the bonus, but Scorecard remains the authority that will change it.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build game" -- Save the changed source, then read the first compiler diagnostic.
```

## Check a fresh card through a const view {#fresh-card}

**Build:** a small executable that fixes one boundary case. Return 1 is a failed expectation; reaching the final message means every preceding condition held. Read the arranged state before running it.

```cpp file=tests/finish_probe.cpp provided
#include <iostream>
#include "../Scorecard.h"
int main() {
    const Scorecard card;
    if (card.yahtzeeBonus() != 0) return 1;
    if (card.total() != 0) return 1;
    std::cout << "probe passed\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_probe.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o probe" label="Build probe" -- Save the changed source, then read the first compiler diagnostic.
run "./probe" stdout="probe passed" label="Observe the result"
```

## Try it — Identify an accidental mutation {#step-3}

Try assigning extraYahtzeePoints += 100 inside the const accessor. Compilation rejects changing an ordinary member through a const object. Restore the accessor. Do not remove const to silence the diagnostic: opening a menu repeatedly must not award points repeatedly.

Say which question this test does not answer yet: it proves a fresh query, not any repeated-Yahtzee scoring. We add that behavior in the next lesson.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="Build game" -- Save the changed source, then read the first compiler diagnostic.
```

## Read the independent acceptance cases {#acceptance-cases}

**Build:** install this test, then read each input and expected outcome before implementing the function. The test has main; your practice file supplies the requested function. Add an example of your own after these cases pass.

```cpp file=tests/finish_task_01.cpp provided
#include <iostream>
bool earnsExtra(int savedYahtzeeScore, int largestGroup);
int main() {
    if (earnsExtra(-1, 5) || earnsExtra(0, 5) || earnsExtra(50, 4)) return 1;
    if (!earnsExtra(50, 5)) return 1;
    std::cout << "PASS: independent\n";
    return 0;
}
```

## Your turn — Distinguish scored zero from absence {#step-4}

**Build, on your own:** Define bool earnsExtra(int savedYahtzeeScore, int largestGroup). savedYahtzeeScore is -1, 0 or 50; largestGroup is 1 through 5. Answer whether a newly recorded hand earns the extra bonus. Do not print or mutate game state.

Write practice/earns_extra.cpp. Keep the test unchanged. If it fails, identify the first unsatisfied case and trace it by hand before editing.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_task_01.cpp practice/earns_extra.cpp  -o exercise_result" label="Build exercise_result" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: independent" label="Observe the result"
```

```hints
nudge: Both the old record and the current hand matter.
concept: An empty box, a zero and a fifty are three different states, not a boolean.
shape: Use two equality comparisons joined by &&. Keep the calculation independent of the scorecard.
```
