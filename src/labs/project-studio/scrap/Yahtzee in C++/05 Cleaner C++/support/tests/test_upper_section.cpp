#include "minitest.h"
#include "../Scorecard.h"

TEST(UpperSection, TheFirstSixAreUpper) {
    EXPECT_EQ(isUpperSection(CategoryId::Ones), true);
    EXPECT_EQ(isUpperSection(CategoryId::Twos), true);
    EXPECT_EQ(isUpperSection(CategoryId::Threes), true);
    EXPECT_EQ(isUpperSection(CategoryId::Fours), true);
    EXPECT_EQ(isUpperSection(CategoryId::Fives), true);
    EXPECT_EQ(isUpperSection(CategoryId::Sixes), true);
}

TEST(UpperSection, TheRestAreNot) {
    EXPECT_EQ(isUpperSection(CategoryId::ThreeOfAKind), false);
    EXPECT_EQ(isUpperSection(CategoryId::FourOfAKind), false);
    EXPECT_EQ(isUpperSection(CategoryId::FullHouse), false);
    EXPECT_EQ(isUpperSection(CategoryId::SmallStraight), false);
    EXPECT_EQ(isUpperSection(CategoryId::LargeStraight), false);
    EXPECT_EQ(isUpperSection(CategoryId::Yahtzee), false);
    EXPECT_EQ(isUpperSection(CategoryId::Chance), false);
    EXPECT_EQ(isUpperSection(CategoryId::Count), false);
}

TEST(UpperSection, BonusStillCountsOnlyTheUpperBoxes) {
    Scorecard s;
    Counts threes{};
    for (int face = 1; face <= 6; face++) {
        threes.fill(0);
        threes[face] = 3;
        s.record(static_cast<std::size_t>(face - 1), threes);
    }
    EXPECT_EQ(s.upperBonus(), 35);

    Scorecard t;
    Counts five{};
    five[6] = 5;
    t.record(CategoryId::Yahtzee, five);
    t.record(CategoryId::Chance, five);
    EXPECT_EQ(t.upperBonus(), 0);
}
