---
title: Finish the rules — model legal actions
runtime: none
track: Finish and Explain
---

Prerequisite: finish chapters 1–6, including their independent tasks. The final chapter completes the existing multi-file game rather than starting a different project.

## Turn the missing rule into cases

Your game can already finish, but it lacks repeated-Yahtzee scoring. This completion follows [Hasbro's bonus and Joker rules](https://hasbro-new.custhelp.com/app/answers/detail/a_id/211/~/i-have-already-rolled-a-yahtzee,-how-do-i-score-it,-if-i-roll-another-one%3F).

If the Yahtzee box already holds 50, another five-of-a-kind earns 100 extra points when recorded. A scratched Yahtzee box activates Joker placement without that bonus. An empty Yahtzee box does neither. Under Joker placement, use the matching upper box if open; otherwise choose an open lower box. Only when neither is available may you scratch a remaining upper box. Full house and straights receive their fixed values under Joker placement.

Do not award a bonus during preview or on a rejected choice. The rule belongs to Scorecard, which owns the record. Player computes the final total; Turn presents choices. This is a reason for classes and modules: there should be one authoritative place that accepts or rejects a scoring action.

```predict
question: Five sixes appear after Yahtzee was scratched. Sixes is open. Can you choose Chance?
choice: No — Sixes is required, with no 100-point bonus
choice: Yes — a scratched Yahtzee disables all Joker rules
answer: No — Sixes is required, with no 100-point bonus
explain: Bonus eligibility and Joker placement are separate questions.
```

## Declare the contract before implementing it

Keep the existing public methods. Add canRecord, yahtzeeBonus, and the private helpers shown below. The full header includes earlier exercise declarations isUpperSection and bestChoice. If those are missing in your project, finish the named-categories and table-of-rules exercises first.

`canRecord` and `pointsFor` are const queries: they must not change the card. `record` will perform the mutation only after validation. `extraYahtzeePoints = 0` initializes new cards, including cards assigned during replay. Private helpers keep rule details out of callers. `total()` continues to mean category points, so existing callers are not silently charged a bonus twice.

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

Do not build the final application halfway through this change: the new declarations still need definitions. Continue immediately to the next lesson. This is an interface checkpoint, not yet a working program.

## Try it — Identify an accidental mutation

On paper put `extraYahtzeePoints += 100;` inside preview, which is const. The compiler would reject it. Removing const would hide the design error: repeatedly opening a menu would award points repeatedly. Keep queries const and commit changes only in record.

## Your turn — Transfer the idea

Write a decision table before implementing: empty/zero/50 Yahtzee box crossed with open/taken matching upper box. For a taken upper box add cases with and without lower space. Mark legal destinations and bonuses.

```hints
nudge: There are two decisions: eligibility and amount.
concept: A zero is a recorded score, not the UNSCORED sentinel.
shape: Trace sixes against Sixes, Chance and Ones. Include a rejected destination and verify that its bonus must remain unchanged.
```
