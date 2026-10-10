#include "minitest.h"
#include "../Scorecard.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(CategoryIds, CountMatchesTheCard) {
    Scorecard s;
    EXPECT_EQ(static_cast<std::size_t>(CategoryId::Count), 13u);
    EXPECT_EQ(Scorecard::CATEGORY_COUNT, 13u);
    EXPECT_EQ(s.size(), static_cast<std::size_t>(CategoryId::Count));
}

TEST(CategoryIds, NamesMatchTheIds) {
    Scorecard s;
    EXPECT_EQ(s.name(CategoryId::Ones), "Ones");
    EXPECT_EQ(s.name(CategoryId::Sixes), "Sixes");
    EXPECT_EQ(s.name(CategoryId::ThreeOfAKind), "Three of a kind");
    EXPECT_EQ(s.name(CategoryId::FourOfAKind), "Four of a kind");
    EXPECT_EQ(s.name(CategoryId::FullHouse), "Full house");
    EXPECT_EQ(s.name(CategoryId::SmallStraight), "Small straight");
    EXPECT_EQ(s.name(CategoryId::LargeStraight), "Large straight");
    EXPECT_EQ(s.name(CategoryId::Yahtzee), "Yahtzee");
    EXPECT_EQ(s.name(CategoryId::Chance), "Chance");
}

TEST(CategoryIds, RecordByIdAndByIndexAgree) {
    Scorecard s;
    EXPECT_EQ(s.record(CategoryId::Chance, hand(1, 2, 3, 4, 6)), true);
    EXPECT_EQ(s.score(12), 16);
    EXPECT_EQ(s.score(CategoryId::Chance), 16);
    EXPECT_EQ(s.isScored(CategoryId::Chance), true);
    EXPECT_EQ(s.isScored(CategoryId::Yahtzee), false);
}

TEST(CategoryIds, CountIsNotACategory) {
    Scorecard s;
    EXPECT_EQ(s.record(CategoryId::Count, hand(1, 2, 3, 4, 5)), false);
    EXPECT_EQ(s.total(), 0);
}

TEST(CategoryIds, EachIdScoresItsOwnRule) {
    Scorecard s;
    Counts sixes = hand(6, 6, 6, 6, 6);
    s.record(CategoryId::Yahtzee, sixes);
    s.record(CategoryId::Sixes, sixes);
    s.record(CategoryId::Ones, sixes);
    EXPECT_EQ(s.score(CategoryId::Yahtzee), 50);
    EXPECT_EQ(s.score(CategoryId::Sixes), 30);
    EXPECT_EQ(s.score(CategoryId::Ones), 0);
}
