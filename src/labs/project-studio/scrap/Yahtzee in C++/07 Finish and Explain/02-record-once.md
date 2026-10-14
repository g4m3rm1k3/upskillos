---
title: 7.2 — Validate, calculate, then record once
runtime: none
teaches: preconditions, short-circuiting, query-command separation, transactional mutation
experiments: Predict, trace, change, check
support: tests/test_complete_rules.cpp, tests/minitest.h
---

### The story so far

A const accessor now reports bonus state. The real scoring command still has the original behavior. We will teach each rule branch with a controlled hand before combining them.

### What this lesson builds

Enforce Joker destinations, calculate special points, and award a bonus only when one legal action is recorded.

## Read validation before mutation {#step-1}

**Understand:** the public action is record(index, counts). It must either accept one complete action or leave the card unchanged. Work in this order:

1. Check whether the destination is legal.
2. Calculate its points from the old card and current hand.
3. Decide bonus eligibility from the old card.
4. Write one category and, if eligible, one bonus.

For a card with Yahtzee=50 and Sixes empty, five sixes can go into Sixes. Trying Chance first must neither fill Chance nor award 100. Otherwise repeated rejected input becomes a way to earn points.

Counts passed by gameplay represent exactly five legal dice. Index getters require an index below size; canRecord establishes that precondition before it calls a getter.

```predict
question: If record writes the first Yahtzee score before checking bonus eligibility, what can go wrong?
choice: The first Yahtzee can incorrectly earn an extra 100
choice: Nothing — order cannot change a score
answer: The first Yahtzee can incorrectly earn an extra 100
explain: Eligibility must inspect the previous box. An empty box becoming 50 during this action is not a previous Yahtzee.
```

## Name the rule helpers {#rule-contract}

**Build:** add public canRecord and private isJoker/pointsFor declarations. These are questions, so they are const. Private pointsFor will assume its caller has already validated the destination.

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
    bool canRecord(std::size_t i, const Counts& counts) const;
    CategoryId bestChoice(const Counts& counts) const;
    std::vector<Category> preview(const Counts& counts) const;

private:
    std::vector<Category> categories;
    int extraYahtzeePoints = 0;
    bool isJoker(const Counts& counts) const;
    int pointsFor(std::size_t i, const Counts& counts) const;
};

#endif
```

## First require the matching upper box {#forced-upper}

**Build:** implement the first destination branch, leaving the remaining lower-section rules for the next step.

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

bool Scorecard::isJoker(const Counts& counts) const {
    return highestFaceCount(counts) == 5 && isScored(CategoryId::Yahtzee);
}


bool Scorecard::canRecord(std::size_t i, const Counts& counts) const {
    if (i >= size() || isScored(i)) return false;
    if (!isJoker(counts)) return true;
    int face = 1;
    while (face <= 6 && counts[face] != 5) ++face;
    const std::size_t upper = static_cast<std::size_t>(face - 1);
    if (!isScored(upper)) return i == upper;
    return true;
}

int Scorecard::pointsFor(std::size_t i, const Counts& counts) const {
    return ruleAt(i).score(counts);
}
```

**Understand:** i >= size() is evaluated first. || short-circuits, so an invalid index never reaches isScored(i). isJoker distinguishes an already recorded Yahtzee from an empty box. The while loop locates the face whose count is five; face-1 maps face six to index five, the Sixes box.

| Old box | Hand | Destination | First branch answer |
|---|---|---|---|
| Yahtzee empty | five sixes | Chance | legal ordinary choice |
| Yahtzee 50, Sixes open | five sixes | Sixes | legal |
| Yahtzee 50, Sixes open | five sixes | Chance | illegal |

We have not changed record yet, so only the query has this new behavior. The probe below calls the query explicitly.

## Probe the forced destination {#probe-upper}

**Build:** a small executable that fixes one boundary case. Return 1 is a failed expectation; reaching the final message means every preceding condition held. Read the arranged state before running it.

```cpp file=tests/finish_probe.cpp provided
#include <iostream>
#include "../Scorecard.h"
int main() {
    Scorecard card;
    Counts sixes = countFaces({6, 6, 6, 6, 6});
    if (!card.record(CategoryId::Yahtzee, sixes)) return 1;
    if (!card.canRecord(5, sixes) || card.canRecord(12, sixes)) return 1;
    if (card.canRecord(999, sixes)) return 1;
    std::cout << "probe passed\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_probe.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o probe" label="Build probe" -- Save the changed source, then read the first compiler diagnostic.
run "./probe" stdout="probe passed" label="Observe the result"
```

## Then choose lower, then upper fallback {#remaining-destinations}

**Build:** finish canRecord and pointsFor. The diff extends the previous branch rather than changing the command yet.

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

bool Scorecard::isJoker(const Counts& counts) const {
    return highestFaceCount(counts) == 5 && isScored(CategoryId::Yahtzee);
}

bool Scorecard::canRecord(std::size_t i, const Counts& counts) const {
    if (i >= size() || isScored(i)) return false;
    if (!isJoker(counts)) return true;

    int face = 1;
    while (face <= 6 && counts[face] != 5) ++face;
    const std::size_t upper = static_cast<std::size_t>(face - 1);
    if (!isScored(upper)) return i == upper;

    bool lowerOpen = false;
    for (std::size_t j = 6; j < size(); ++j) {
        if (!isScored(j)) lowerOpen = true;
    }
    return lowerOpen ? i >= 6 : i < 6;
}

int Scorecard::pointsFor(std::size_t i, const Counts& counts) const {
    if (isJoker(counts)) {
        if (i == indexOf(CategoryId::FullHouse)) return FULL_HOUSE_POINTS;
        if (i == indexOf(CategoryId::SmallStraight)) return SMALL_STRAIGHT_POINTS;
        if (i == indexOf(CategoryId::LargeStraight)) return LARGE_STRAIGHT_POINTS;
    }
    return ruleAt(i).score(counts);
}
```

**Understand:** if the matching upper box is taken, the loop asks whether any lower box remains open. When one does, only a lower destination is legal. Otherwise another upper box may be scratched. The initial guard has already rejected taken boxes, so the final comparison only chooses the section.

For a Joker in a legal lower box, full house returns 25 and the two straights return 30/40. The ordinary table still handles kinds and Chance as a dice sum. An upper fallback naturally scores zero because its face differs from the five matching dice.

| Sixes box | Any lower open? | Legal destinations for a repeated six-Yahtzee |
|---|---|---|
| open | either | Sixes only |
| taken | yes | untaken lower boxes |
| taken | no | other untaken upper boxes, for zero |

## Probe the lower-section boundary {#probe-lower}

**Build:** a small executable that fixes one boundary case. Return 1 is a failed expectation; reaching the final message means every preceding condition held. Read the arranged state before running it.

```cpp file=tests/finish_probe.cpp provided
#include <iostream>
#include "../Scorecard.h"
int main() {
    Scorecard card;
    Counts sixes = countFaces({6, 6, 6, 6, 6});
    card.record(CategoryId::Yahtzee, sixes);
    card.record(CategoryId::Sixes, sixes);
    if (!card.canRecord(8, sixes) || card.canRecord(0, sixes)) return 1;
    std::cout << "probe passed\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_probe.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o probe" label="Build probe" -- Save the changed source, then read the first compiler diagnostic.
run "./probe" stdout="probe passed" label="Observe the result"
```

## Commit one accepted action {#commit-action}

**Build:** replace only record's index overload. The named-category overload still delegates to it.

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
    if (!canRecord(i, counts)) return false;
    const bool earnsBonus = isJoker(counts) && score(CategoryId::Yahtzee) == 50;
    categories[i].score = pointsFor(i, counts);
    if (earnsBonus) extraYahtzeePoints += 100;
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

bool Scorecard::isJoker(const Counts& counts) const {
    return highestFaceCount(counts) == 5 && isScored(CategoryId::Yahtzee);
}

bool Scorecard::canRecord(std::size_t i, const Counts& counts) const {
    if (i >= size() || isScored(i)) return false;
    if (!isJoker(counts)) return true;

    int face = 1;
    while (face <= 6 && counts[face] != 5) ++face;
    const std::size_t upper = static_cast<std::size_t>(face - 1);
    if (!isScored(upper)) return i == upper;

    bool lowerOpen = false;
    for (std::size_t j = 6; j < size(); ++j) {
        if (!isScored(j)) lowerOpen = true;
    }
    return lowerOpen ? i >= 6 : i < 6;
}

int Scorecard::pointsFor(std::size_t i, const Counts& counts) const {
    if (isJoker(counts)) {
        if (i == indexOf(CategoryId::FullHouse)) return FULL_HOUSE_POINTS;
        if (i == indexOf(CategoryId::SmallStraight)) return SMALL_STRAIGHT_POINTS;
        if (i == indexOf(CategoryId::LargeStraight)) return LARGE_STRAIGHT_POINTS;
    }
    return ruleAt(i).score(counts);
}
```

**Understand:** rejection happens before either member changes. earnsBonus is calculated while the old record still exists. Only then do we write category points and increase bonus state. This is a small **transaction**: validation and mutation form one accepted action, with no partial state on a rejected request.

Trace an attempted Chance followed by Sixes: old bonus 0 → reject Chance → still 0 → accept Sixes → 100. Repeating the already taken Sixes choice must leave it at 100.

## Probe rejection and acceptance {#probe-commit}

**Build:** a small executable that fixes one boundary case. Return 1 is a failed expectation; reaching the final message means every preceding condition held. Read the arranged state before running it.

```cpp file=tests/finish_probe.cpp provided
#include <iostream>
#include "../Scorecard.h"
int main() {
    Scorecard card;
    Counts sixes = countFaces({6, 6, 6, 6, 6});
    card.record(CategoryId::Yahtzee, sixes);
    if (card.yahtzeeBonus() != 0) return 1;
    if (card.record(CategoryId::Chance, sixes) || card.yahtzeeBonus() != 0) return 1;
    if (!card.record(CategoryId::Sixes, sixes) || card.yahtzeeBonus() != 100) return 1;
    if (card.record(CategoryId::Sixes, sixes) || card.yahtzeeBonus() != 100) return 1;
    std::cout << "probe passed\n";
    return 0;
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_probe.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o probe" label="Build probe" -- Save the changed source, then read the first compiler diagnostic.
run "./probe" stdout="probe passed" label="Observe the result"
```

## Make previews agree without changing state {#preview-legality}

**Build:** have preview and bestChoice consult canRecord. This final snapshot also brings the helpers together near record; the behavior change is in those two queries.

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


bool Scorecard::isJoker(const Counts& counts) const {
    return highestFaceCount(counts) == 5 && isScored(CategoryId::Yahtzee);
}

bool Scorecard::canRecord(std::size_t i, const Counts& counts) const {
    if (i >= size() || isScored(i)) return false;
    if (!isJoker(counts)) return true;

    int face = 1;
    while (face <= 6 && counts[face] != 5) ++face;
    const std::size_t upper = static_cast<std::size_t>(face - 1);
    if (!isScored(upper)) return i == upper;

    bool lowerOpen = false;
    for (std::size_t j = 6; j < size(); ++j) {
        if (!isScored(j)) lowerOpen = true;
    }
    return lowerOpen ? i >= 6 : i < 6;
}

int Scorecard::pointsFor(std::size_t i, const Counts& counts) const {
    if (isJoker(counts)) {
        if (i == indexOf(CategoryId::FullHouse)) return FULL_HOUSE_POINTS;
        if (i == indexOf(CategoryId::SmallStraight)) return SMALL_STRAIGHT_POINTS;
        if (i == indexOf(CategoryId::LargeStraight)) return LARGE_STRAIGHT_POINTS;
    }
    return ruleAt(i).score(counts);
}

int Scorecard::yahtzeeBonus() const { return extraYahtzeePoints; }

bool Scorecard::record(std::size_t i, const Counts& counts) {
    if (!canRecord(i, counts)) return false;
    const bool earnsBonus = isJoker(counts) && score(CategoryId::Yahtzee) == 50;
    categories[i].score = pointsFor(i, counts);
    if (earnsBonus) extraYahtzeePoints += 100;
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
            shown[i].score = canRecord(i, counts) ? pointsFor(i, counts) : UNSCORED;
        }
    }
    return shown;
}

CategoryId Scorecard::bestChoice(const Counts& counts) const {
    std::vector<Category> shown = preview(counts);
    CategoryId best = CategoryId::Count;
    int bestScore = -1;
    for (std::size_t i = 0; i < shown.size(); ++i) {
        if (canRecord(i, counts) && shown[i].score > bestScore) {
            best = static_cast<CategoryId>(i);
            bestScore = shown[i].score;
        }
    }
    return best;
}
```

**Understand:** preview returns a copy of the categories. For an empty destination that cannot be used now, it leaves UNSCORED (-1) as a marker; the next lesson gives that marker a clear menu label. Repeated previews must not consume a box or award a bonus. bestChoice ignores forbidden destinations, even if their nominal points would be higher.

> **Engineer:** the display and a hint system should ask the same domain rule as the committing action. Duplicating legality rules in three places creates disagreement.

## Test the decision boundaries {#step-2}

Use the support button to install test_complete_rules.cpp and minitest.h. The suite builds controlled hands so every run reaches the rare boundary. Match each named case to the decision table before running it.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/test_complete_rules.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_complete_rules" label="Build test_complete_rules" -- Save the changed source, then read the first compiler diagnostic.
tests "./test_complete_rules" require="CompleteRules.ForcedUpperAndRejectedChoiceDoNotAwardTwice" label="Complete rules and no duplicate bonus"
```

## Try it — Reject the wrong implementation {#step-3}

Move extraYahtzeePoints += 100 before the canRecord guard temporarily. The rejected-choice test fails because a failed action changes state. Restore the guarded version and run the suite again. Explain why a UI that hides the forbidden category cannot substitute for enforcing legality inside record.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/test_complete_rules.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_complete_rules" label="Build test_complete_rules" -- Save the changed source, then read the first compiler diagnostic.
tests "./test_complete_rules" require="CompleteRules.PreviewIsReadOnlyAndInvalidIndexIsRejected"
```

## Read the independent acceptance cases {#acceptance-cases}

**Build:** install this test, then read each input and expected outcome before implementing the function. The test has main; your practice file supplies the requested function. Add an example of your own after these cases pass.

```cpp file=tests/finish_task_02.cpp provided
#include <iostream>
#include "../Scorecard.h"
int legalChoices(const Scorecard& card, const Counts& hand);
int main() {
    Scorecard card; const Counts sixes = countFaces({6, 6, 6, 6, 6});
    if (legalChoices(card, sixes) != static_cast<int>(card.size())) return 1;
    card.record(CategoryId::Yahtzee, sixes);
    if (legalChoices(card, sixes) != 1 || card.yahtzeeBonus() != 0) return 1;
    card.record(CategoryId::Sixes, sixes);
    if (legalChoices(card, sixes) != 6 || card.yahtzeeBonus() != 100) return 1;
    std::cout << "PASS: independent\n";
    return 0;
}
```

## Your turn — Count legal choices without changing the card {#step-4}

**Build, on your own:** Define int legalChoices(const Scorecard& card, const Counts& hand). Count every legal destination by calling the public query. A fresh card has all categories available; a repeat Yahtzee with its matching upper box open has exactly one.

Write practice/legal_choices.cpp. Keep the test unchanged. If it fails, identify the first unsatisfied case and trace it by hand before editing.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/finish_task_02.cpp practice/legal_choices.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o exercise_result" label="Build exercise_result" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: independent" label="Observe the result"
```

```hints
nudge: Reuse the authoritative query rather than inspecting scores yourself.
concept: Empty and legal are no longer interchangeable under Joker placement.
shape: Loop below size(), count canRecord answers, and return the total without calling record.
```
