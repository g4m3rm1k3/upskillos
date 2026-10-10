---
title: 5.2 — A Table of Rules
runtime: none
support: tests/test_rule_table.cpp, tests/test_best_choice.cpp
---

Early in this series you tried to keep the scoring functions in a list and loop over them, and it did not work: the functions took different arguments, and a C++ list needs one signature. Lambdas fix that. In this lesson the names and the rules move into one table, and the `switch` and the separate list of names disappear.

Press this lesson's support button first. It creates two test files.

## One table, one place

Words first:

- **Lambda**: a small function written in the middle of other code, with no name: `[](int x) { return x * 2; }`.
- **Capture list**: the square brackets at the start of a lambda. They list the outside variables the lambda may use. `[]` means none.
- **`std::function<R(Args)>`**: a standard type that can hold any callable thing (a function, a lambda) that takes `Args` and returns `R`. You call it like a function.
- **Anonymous namespace**: `namespace { ... }` makes everything inside visible only to the current `.cpp` file.

Replace `Scorecard.cpp` with this. It includes the `isUpperSection` function you wrote in the last lesson.

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
```

Line by line, only the new parts:

- `#include <functional>`: declares `std::function`.
- `namespace { ... }`: an anonymous namespace. Everything inside is private to this file, and that includes **types**. The keyword `static` cannot be put on a `struct`. If two `.cpp` files each defined a different `struct Rule`, the program would break in a way the compiler does not report. An anonymous namespace rules that out. `indexOf` moved inside it, so it no longer needs `static`.
- `struct Rule { const char* name; std::function<int(const Counts&)> score; };`: one row of the table. `name` points at the category's text. `score` holds anything that can be called with a `const Counts&` and returns an `int`. You call it like a function: `rule.score(counts)`. A `std::function` stores its callable behind a layer that hides the exact type, which costs a little time per call. Here the cost does not matter.
- `static const Rule table[] = { ... };` inside `ruleAt`: a variable inside a function that is marked `static` is built **once**, the first time the function runs, and then lives until the program ends. A table at file level would be built when the program starts, in an order across files that C++ does not fix. A `Scorecard` made in another file before the table existed would read garbage. Building on first use avoids that. Since C++11 this build is also safe if two threads arrive at once.
- `[](const Counts& c) { return scoreUpper(c, 1); }`: a lambda. `[]` is the capture list, empty here because the lambda uses nothing from outside. `(const Counts& c)` is its parameter list. `{ return ...; }` is its body. The return type is worked out from the `return`, which is `int`. This lambda is the fix for the problem from lesson 3.1: `scoreUpper` needs two arguments but every row of the table must take one, so the lambda fills in the face and presents one argument to the table.
- `{"Full house", scoreFullHouse}`: no lambda is needed here. `scoreFullHouse` already takes one `const Counts&` and returns an `int`, so the function name converts to a `std::function` directly.
- `static_assert(...)`: the same compile-time guard as before, now covering names and rules together. A missing row stops the build.
- `return table[index];`: not checked. It is only reached with an index below 13, because the constructor's loop, `record` and `preview` all guarantee that.
- `Category{ruleAt(i).name, UNSCORED}`: the constructor reads the name from the table. There is no second list of names to keep in step.
- `ruleAt(i).score(counts)`: finds row `i` and calls its function. This replaces the whole `potentialFor` switch. Name and rule for one category now sit on the same line.

The order of the rows still has to match the order of the enumerators in `CategoryId`. The tests below check that.

## What a lambda remembers

Words first:

- **Capture by value**: `[x]` copies `x` into the lambda at the moment the lambda is created.
- **Capture by reference**: `[&x]` lets the lambda use the original `x`. It is only safe while that original still exists.

```cpp
int bonus = 10;
auto addBonus = [bonus](int x) { return x + bonus; };
bonus = 99;
std::cout << addBonus(1) << "\n";
```

- `auto addBonus = ...`: every lambda has its own unnamed type, so `auto` is the way to hold one in a variable.
- `[bonus]` copies the 10 into the lambda when it is created. Changing `bonus` afterwards does not change the copy.

```predict
question: What does the code above print?
choice: 11
choice: 100
choice: It does not compile
answer: 11
explain: The capture [bonus] copied 10 when addBonus was created, so addBonus(1) is 1 + 10. With [&bonus] the lambda would use the original variable and print 100. A reference capture is dangerous if the lambda is kept after the variable is gone.
```

## Read the tests

The support button created `tests/test_rule_table.cpp`. Its job is to catch a row in the wrong place:

```cpp
static void checkHand(const Counts& c) {
    Scorecard s;
    std::vector<Category> shown = s.preview(c);
    for (std::size_t i = 0; i < Scorecard::CATEGORY_COUNT; i++) {
        EXPECT_EQ(shown[i].score, expectedFor(static_cast<CategoryId>(i), c));
    }
}
```

- `expectedFor` is a helper inside the test file. It calls the scoring functions directly, using a `switch` over `CategoryId`.
- For several hands, every row of the table must give the same number as the direct call. If the rows for Fours and Fives were swapped, a hand with different counts of those faces would fail.

```check
run "g++ -std=c++17 -Wall -Wextra main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the game builds with warnings on" -- The struct Rule and ruleAt must be inside the anonymous namespace.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="the game still plays to the end" -- record and preview must call ruleAt(i).score(counts).
run "g++ -std=c++17 -Wall -Wextra tests/test_rule_table.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_rule_table" label="the rule table tests build" -- Press the lesson's support button if tests/test_rule_table.cpp is missing.
tests "./test_rule_table" require="RuleTable.PreviewMatchesTheRulesForAFullHouse" label="the rows are in the right order" -- Every row must sit at the position of its CategoryId.
tests "./test_rule_table" require="RuleTable.RecordWritesTheSameScoreThatPreviewShowed" label="record agrees with preview" -- Both must call the same row of the table.
lacks Scorecard.cpp "potentialFor" label="the old switch is gone" -- Replace every call to potentialFor with ruleAt(i).score(counts).
```

## Your turn: the best box

Add `CategoryId bestChoice(const Counts& counts) const` to `Scorecard`. It returns the unscored box that would score the most points for these counts. If several boxes tie, it returns the one with the lowest position. If every box is already scored, it returns `CategoryId::Count`. Declare it in `Scorecard.h` and define it in `Scorecard.cpp`. The test file `tests/test_best_choice.cpp` is already in your project. Use `preview`. You do not need to call any rule directly.

```check
matches Scorecard.h "CategoryId[ ]+bestChoice[ ]*[(][ ]*const[ ]+Counts[ ]*&[^)]*[)][ ]*const" label="Scorecard.h declares bestChoice as const" -- It changes nothing, so it ends with const.
run "g++ -std=c++17 -Wall -Wextra tests/test_best_choice.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_best_choice" label="the best-choice tests build" -- Declare the function in Scorecard.h and define it in Scorecard.cpp.
tests "./test_best_choice" require="BestChoice.SkipsBoxesThatAreAlreadyScored" label="scored boxes are skipped" -- Preview shows real scores for scored boxes. Check isScored before comparing.
tests "./test_best_choice" require="BestChoice.TiesGoToTheLowestBox" label="ties go to the lowest box" -- Replace the best only when a score is strictly larger.
tests "./test_best_choice" require="BestChoice.EvenZeroPointsPicksALegalBox" label="a box worth zero is still a legal choice" -- Start the best score below zero so that a score of 0 still counts.
tests "./test_best_choice" require="BestChoice.FullCardGivesCount" label="a full card gives Count" -- Start with best set to CategoryId::Count and never change it if nothing qualifies.
```

```hints
nudge: What do you need to remember while you walk through the 13 boxes one after another?
concept: Keep two variables: the best category so far and its score. Start the score at -1, which is below any real score, and start the category at `CategoryId::Count` as the "nothing yet" answer. Use `>` and not `>=` so that an earlier box wins a tie.
shape: Call `preview(counts)`. Loop over every position. Skip it if `isScored(i)`. Otherwise, if its previewed score is bigger than the best so far, remember that score and `static_cast<CategoryId>(i)`. Return the best category.
answer: One way to write it:
~~~cpp
// Scorecard.h — inside the public: section
CategoryId bestChoice(const Counts& counts) const;

// Scorecard.cpp
CategoryId Scorecard::bestChoice(const Counts& counts) const {
    std::vector<Category> shown = preview(counts);
    CategoryId best = CategoryId::Count;
    int bestScore = -1;
    for (std::size_t i = 0; i < shown.size(); i++) {
        if (!isScored(i) && shown[i].score > bestScore) {
            bestScore = shown[i].score;
            best = static_cast<CategoryId>(i);
        }
    }
    return best;
}
~~~
```
