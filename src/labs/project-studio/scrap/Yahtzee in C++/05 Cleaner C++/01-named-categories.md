---
title: 5.1 — Named Categories
track: Cleaner C++
runtime: none
support: tests/test_category_ids.cpp, tests/test_upper_section.cpp
---

The scorecard works, but it is held together by numbers. Box 12 is Chance because a list of names and a `switch` were written in the same order, and nothing checks that they stay in step. In this lesson each category gets a name the compiler understands, and the compiler warns you when you forget one.

Press this lesson's support button first. It creates two test files.

## Give each category a name

Words first:

- **Enumeration**: a type whose values are a fixed list of named constants. Each name is an **enumerator**.
- **Scoped enumeration** (`enum class`): an enumeration whose enumerators live inside the type's name and never convert to a number or from one by accident.
- **Underlying type**: the integer type an enumeration is stored as. You can choose it with `: type` after the name.

Replace `Scorecard.h` with this.

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
    std::vector<Category> preview(const Counts& counts) const;

private:
    std::vector<Category> categories;
};

#endif
```

New lines:

- `enum class CategoryId : std::size_t {`: a new type named `CategoryId`. Each enumerator gets the next whole number, starting at 0. `Ones` is 0, `Twos` is 1, and `Chance` is 12. `: std::size_t` makes the underlying type `std::size_t`, the same type the vector uses for positions.
- Scoped means the enumerators are written `CategoryId::Chance`, and a bare `Chance` does not exist. A plain `enum` would put `Ones` and `Chance` into the surrounding scope, where they could collide with other names.
- There is no automatic conversion in either direction. `int x = CategoryId::Ones;` does not compile, and neither does `CategoryId id = 3;`. A box can no longer be mixed up with an arbitrary number by accident.
- `Count`: a last enumerator that is not a category. Because the numbering starts at 0, its value is the number of real categories, which is 13. This is a common habit, and it means the count updates itself when a category is added above it.
- `static_cast<std::size_t>(CategoryId::Count)`: the explicit way to turn an enumerator into its number. `CATEGORY_COUNT` is still `constexpr`, so it can be used wherever the compiler needs a constant, such as `static_assert`.
- `const std::string& name(CategoryId id) const;`: a second function with the same name as `name(std::size_t i)`. The compiler picks by argument type. A plain number such as `0` cannot convert to `CategoryId`, so `scorecard.name(0)` still calls the index version. The menu loop needs the index versions because it walks through positions.
- The same pairing is added for `isScored`, `score` and `record`.

## Use the names inside

Words first:

- **`switch` over an enumeration**: when every enumerator has its own `case` and there is no `default`, the compiler can tell you if one is missing.

Replace `Scorecard.cpp` with this.

```cpp file=Scorecard.cpp
#include "Scorecard.h"

static std::size_t indexOf(CategoryId id) {
    return static_cast<std::size_t>(id);
}

static int potentialFor(CategoryId id, const Counts& counts) {
    switch (id) {
        case CategoryId::Ones: return scoreUpper(counts, 1);
        case CategoryId::Twos: return scoreUpper(counts, 2);
        case CategoryId::Threes: return scoreUpper(counts, 3);
        case CategoryId::Fours: return scoreUpper(counts, 4);
        case CategoryId::Fives: return scoreUpper(counts, 5);
        case CategoryId::Sixes: return scoreUpper(counts, 6);
        case CategoryId::ThreeOfAKind: return scoreOfAKind(counts, 3);
        case CategoryId::FourOfAKind: return scoreOfAKind(counts, 4);
        case CategoryId::FullHouse: return scoreFullHouse(counts);
        case CategoryId::SmallStraight: return scoreSmallStraight(counts);
        case CategoryId::LargeStraight: return scoreLargeStraight(counts);
        case CategoryId::Yahtzee: return scoreYahtzee(counts);
        case CategoryId::Chance: return scoreChance(counts);
        case CategoryId::Count: return 0;
    }
    return 0;
}

Scorecard::Scorecard() {
    const char* const names[] = {
        "Ones", "Twos", "Threes", "Fours", "Fives", "Sixes",
        "Three of a kind", "Four of a kind", "Full house",
        "Small straight", "Large straight", "Yahtzee", "Chance",
    };
    static_assert(sizeof(names) / sizeof(names[0]) == CATEGORY_COUNT,
                  "one name is needed for every category");

    categories.reserve(CATEGORY_COUNT);
    for (std::size_t i = 0; i < CATEGORY_COUNT; i++) {
        categories.push_back(Category{names[i], UNSCORED});
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
    categories[i].score = potentialFor(static_cast<CategoryId>(i), counts);
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
    for (std::size_t i = 0; i < 6; i++) {
        if (categories[i].score != UNSCORED) {
            upper += categories[i].score;
        }
    }
    return upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0;
}

std::vector<Category> Scorecard::preview(const Counts& counts) const {
    std::vector<Category> shown = categories;
    for (std::size_t i = 0; i < shown.size(); i++) {
        if (shown[i].score == UNSCORED) {
            shown[i].score = potentialFor(static_cast<CategoryId>(i), counts);
        }
    }
    return shown;
}
```

Line by line, only the new parts:

- `static std::size_t indexOf(CategoryId id)`: the one place that turns a `CategoryId` into a position. `static` keeps it private to this file.
- `static int potentialFor(CategoryId id, ...)`: now takes the enumeration, not a number.
- `switch (id) {` with one `case` per enumerator and **no `default`**: this is on purpose. When you build with `-Wall`, the compiler warns `enumeration value 'Threes' not handled in switch` if someone adds a category and forgets its `case`. Writing a `default:` would silence that warning, so it is left out.
- `case CategoryId::Count: return 0;`: `Count` is not a real category, but it is an enumerator, so the switch is complete only if it is listed.
- `return 0;` after the switch: an enumeration with a fixed underlying type can hold any value of that type, such as `static_cast<CategoryId>(99)`. If that ever arrives, execution leaves the switch, and this line gives a defined result.
- `potentialFor(static_cast<CategoryId>(i), counts)`: turns a position into an enumerator. The conversion from number to enumeration is always explicit. In `record`, the bounds check above it has already guaranteed that `i` is a real position.
- `bool Scorecard::record(CategoryId id, ...) { return record(indexOf(id), counts); }`: the new overloads only convert and hand over to the index version. The logic stays in one place. `CategoryId::Count` becomes 13, which `record` rejects because it is not below `categories.size()`.

```predict
question: You add a 14th enumerator `Bonus` before Count, but forget to add its case in potentialFor. You build with -Wall. What happens?
choice: A compile error stops the build
choice: A warning names the enumerator that is not handled
choice: Nothing at all, the compiler stays silent
answer: A warning names the enumerator that is not handled
explain: A switch over an enumeration without a default is checked by -Wswitch, which -Wall switches on. It reports every enumerator without a case. It is a warning, not an error, so read the build output.
```

```predict
question: Existing code calls `card.record(3, counts)` with a plain number. Which function runs now that a CategoryId overload exists?
choice: record(CategoryId, ...), because 3 means Fours
choice: record(std::size_t, ...), because a number does not convert to CategoryId
choice: Neither: the call is ambiguous and does not compile
answer: record(std::size_t, ...), because a number does not convert to CategoryId
explain: An enum class never converts from an int by itself. Only the size_t overload can accept the 3, so the compiler picks it. This is why the old calls and the old tests kept working.
```

## Check that the game still plays

Build with warnings switched on:

```bash
g++ -std=c++17 -Wall -Wextra main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game
```

- `-Wall`: turns on the compiler's common warnings. The name is a little misleading, because it is not all of them.
- `-Wextra`: turns on a few more. A clean build prints nothing.

```check
run "g++ -std=c++17 -Wall -Wextra main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the game builds with warnings on" -- Read the first message. It names the file and the line.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="the game still plays to the end" -- The index versions of record, name and score are unchanged.
run "g++ -std=c++17 tests/test_category_ids.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_category_ids" label="the category tests build" -- Press the lesson's support button if tests/test_category_ids.cpp is missing.
tests "./test_category_ids" require="CategoryIds.NamesMatchTheIds" label="every id has the right name" -- The names must be listed in the same order as the enumerators.
tests "./test_category_ids" require="CategoryIds.CountIsNotACategory" label="Count is refused" -- record(CategoryId::Count, ...) must return false and change nothing.
```

## Your turn: which boxes are upper?

`upperBonus` still contains the loop `i < 6`, a number that only works because the upper boxes happen to come first. Fix that.

Add a free function `bool isUpperSection(CategoryId id)` to `Scorecard`. Declare it in `Scorecard.h` after the enumeration, and define it in `Scorecard.cpp`. It returns `true` for the six upper categories and `false` for every other enumerator, including `Count`. Write it as a `switch` that lists **every** enumerator and has no `default`. Then change `upperBonus` to loop over all boxes and use `isUpperSection(static_cast<CategoryId>(i))` instead of the number 6. The test file `tests/test_upper_section.cpp` is already in your project.

```check
matches Scorecard.h "bool[ ]+isUpperSection[ ]*[(][ ]*CategoryId" label="Scorecard.h declares isUpperSection" -- Take a CategoryId and return bool.
lacks Scorecard.cpp "i < 6" label="the magic number 6 is gone from upperBonus" -- Loop up to categories.size() and ask isUpperSection about each position.
run "g++ -std=c++17 -Wall -Wextra tests/test_upper_section.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_upper_section" label="the upper-section tests build" -- A free function declared in the header needs a definition in Scorecard.cpp.
tests "./test_upper_section" require="UpperSection.TheRestAreNot" label="the lower boxes are not upper" -- Return false for the seven other enumerators, Count included.
tests "./test_upper_section" require="UpperSection.BonusStillCountsOnlyTheUpperBoxes" label="the bonus still works" -- upperBonus must add only boxes for which isUpperSection is true.
```

```hints
nudge: Which question does the bonus ask about each box, and who should answer it?
concept: A switch that lists every enumerator can group several cases onto one return. Cases that share a body are written one under another with no code between them.
shape: In isUpperSection write six case labels (Ones to Sixes) followed by `return true;`, then the other seven (ThreeOfAKind to Count) followed by `return false;`, then `return false;` after the switch. In upperBonus loop `i` over every box and add its score when the box is upper and scored.
answer: One way to write it:
~~~cpp
// Scorecard.h — after the enum class
bool isUpperSection(CategoryId id);

// Scorecard.cpp
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

// Scorecard.cpp — the loop inside upperBonus
for (std::size_t i = 0; i < categories.size(); i++) {
    if (isUpperSection(static_cast<CategoryId>(i)) && categories[i].score != UNSCORED) {
        upper += categories[i].score;
    }
}
~~~
```
