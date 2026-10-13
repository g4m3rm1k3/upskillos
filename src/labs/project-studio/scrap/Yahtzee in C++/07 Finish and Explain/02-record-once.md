---
title: Record once — const queries and one mutation
runtime: none
support: tests/test_complete_rules.cpp, tests/minitest.h
---

Implement the new Scorecard contract, then test Joker placement separately from bonus points.

## Read validation before mutation

Use valid Counts values built by countFaces from five legal dice. Scoring helpers also accept artificial counts in some old unit tests, but gameplay always has five dice. canRecord checks the index before indexing; `||` short-circuits, so an invalid index cannot reach isScored. Other index getters retain their caller precondition: pass an index below size().

Trace the helpers in order before applying the full snapshot:

1. isJoker asks whether five dice match and the Yahtzee box is already recorded.
2. canRecord rejects a taken box, then enforces the forced destination.
3. pointsFor calculates a legal choice's points, including special straight/full-house values.
4. record validates, computes eligibility from the old card, writes one score and awards at most one bonus.

The private pointsFor helper assumes a legal destination; callers establish that first. When only upper boxes remain, the matching box is already taken, so a different face's upper score is naturally zero.

```predict
question: Why calculate earnsBonus before assigning the new score?
choice: Recording the first Yahtzee must not count as an extra Yahtzee
choice: It makes no difference
answer: Recording the first Yahtzee must not count as an extra Yahtzee
explain: The decision must inspect the pre-action state. Otherwise the first recorded 50 can accidentally award 100 too.
```

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

The unchanged rule table stays in this snapshot so the step is directly buildable. Focus the diff on the new helpers, record, preview and bestChoice. preview uses UNSCORED (-1) for an unavailable empty choice; the next lesson labels that condition rather than showing -1 to a player. It still returns a copy. bestChoice now considers legal destinations only and returns Count when none exist. Its greedy choice is a hint, not an optimal strategy.

## Test the decision boundaries

Use this lesson's support button to install tests/test_complete_rules.cpp and tests/minitest.h. The tests build controlled hands; no random seed is needed. Read each expected result and match it to your decision table.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/test_complete_rules.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_complete_rules" label="Build rule tests"
run "./test_complete_rules" stdout="PASS" label="Rule behavior passes"
```

## Try it — Reject the wrong implementation

Temporarily move bonus addition above the canRecord guard. The rejected-choice test must fail because a forbidden choice changes points. Restore the correct order and rerun. Then remove the isScored condition in isJoker: the first-Yahtzee test must catch treating an unrecorded box as a Joker. Restore it.

## Your turn — Transfer the idea

Add an independent regression for two consecutive previews before recording a repeat Yahtzee. Assert that scores and bonus stay unchanged until one successful record. Also test an out-of-range index.

```hints
nudge: Queries must not spend or award anything.
concept: State before and after a query should be equal.
shape: Save total and yahtzeeBonus, call preview twice, compare both. Record one legal action and expect exactly 100 extra points, not 200.
```
