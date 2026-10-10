#include "minitest.h"
#include "../Scorecard.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

static int expectedFor(CategoryId id, const Counts& c) {
    switch (id) {
        case CategoryId::Ones: return scoreUpper(c, 1);
        case CategoryId::Twos: return scoreUpper(c, 2);
        case CategoryId::Threes: return scoreUpper(c, 3);
        case CategoryId::Fours: return scoreUpper(c, 4);
        case CategoryId::Fives: return scoreUpper(c, 5);
        case CategoryId::Sixes: return scoreUpper(c, 6);
        case CategoryId::ThreeOfAKind: return scoreOfAKind(c, 3);
        case CategoryId::FourOfAKind: return scoreOfAKind(c, 4);
        case CategoryId::FullHouse: return scoreFullHouse(c);
        case CategoryId::SmallStraight: return scoreSmallStraight(c);
        case CategoryId::LargeStraight: return scoreLargeStraight(c);
        case CategoryId::Yahtzee: return scoreYahtzee(c);
        case CategoryId::Chance: return scoreChance(c);
        case CategoryId::Count: return -999;
    }
    return -999;
}

static void checkHand(const Counts& c) {
    Scorecard s;
    std::vector<Category> shown = s.preview(c);
    for (std::size_t i = 0; i < Scorecard::CATEGORY_COUNT; i++) {
        EXPECT_EQ(shown[i].score, expectedFor(static_cast<CategoryId>(i), c));
    }
}

TEST(RuleTable, PreviewMatchesTheRulesForAFullHouse) {
    checkHand(hand(2, 2, 3, 3, 3));
}

TEST(RuleTable, PreviewMatchesTheRulesForAStraight) {
    checkHand(hand(1, 2, 3, 4, 5));
    checkHand(hand(2, 3, 4, 5, 6));
}

TEST(RuleTable, PreviewMatchesTheRulesForYahtzee) {
    checkHand(hand(4, 4, 4, 4, 4));
}

TEST(RuleTable, PreviewMatchesTheRulesForNothingSpecial) {
    checkHand(hand(1, 1, 2, 5, 6));
}

TEST(RuleTable, RecordWritesTheSameScoreThatPreviewShowed) {
    Scorecard s;
    Counts c = hand(5, 5, 5, 2, 2);
    std::vector<Category> shown = s.preview(c);
    for (std::size_t i = 0; i < s.size(); i++) {
        EXPECT_EQ(s.record(i, c), true);
        EXPECT_EQ(s.score(i), shown[i].score);
    }
}
