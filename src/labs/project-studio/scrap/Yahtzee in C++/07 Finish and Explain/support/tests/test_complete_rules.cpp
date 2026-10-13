#include "minitest.h"
#include "../Scorecard.h"

static Counts five(int face) { return countFaces(std::vector<int>(5, face)); }
static std::size_t at(CategoryId id) { return static_cast<std::size_t>(id); }

TEST(CompleteRules, FirstYahtzeeIsNotABonusOrJoker) {
    Scorecard card;
    EXPECT_EQ(card.record(CategoryId::FullHouse, five(6)), true);
    EXPECT_EQ(card.score(CategoryId::FullHouse), 0);
    EXPECT_EQ(card.record(CategoryId::Yahtzee, five(6)), true);
    EXPECT_EQ(card.score(CategoryId::Yahtzee), 50);
    EXPECT_EQ(card.yahtzeeBonus(), 0);
}
TEST(CompleteRules, ForcedUpperAndRejectedChoiceDoNotAwardTwice) {
    Scorecard card;
    card.record(CategoryId::Yahtzee, five(6));
    EXPECT_EQ(card.canRecord(at(CategoryId::Chance), five(6)), false);
    EXPECT_EQ(card.record(CategoryId::Chance, five(6)), false);
    EXPECT_EQ(card.yahtzeeBonus(), 0);
    EXPECT_EQ(card.bestChoice(five(6)) == CategoryId::Sixes, true);
    EXPECT_EQ(card.record(CategoryId::Sixes, five(6)), true);
    EXPECT_EQ(card.score(CategoryId::Sixes), 30);
    EXPECT_EQ(card.yahtzeeBonus(), 100);
    EXPECT_EQ(card.record(CategoryId::Sixes, five(6)), false);
    EXPECT_EQ(card.yahtzeeBonus(), 100);
}
TEST(CompleteRules, ZeroYahtzeeStillForcesPlacementWithoutBonus) {
    Scorecard card;
    card.record(CategoryId::Yahtzee, countFaces({1, 2, 3, 4, 6}));
    EXPECT_EQ(card.record(CategoryId::Chance, five(2)), false);
    EXPECT_EQ(card.record(CategoryId::Twos, five(2)), true);
    EXPECT_EQ(card.record(CategoryId::LargeStraight, five(2)), true);
    EXPECT_EQ(card.score(CategoryId::LargeStraight), 40);
    EXPECT_EQ(card.yahtzeeBonus(), 0);
}
TEST(CompleteRules, LowerJokersAndUpperFallback) {
    Scorecard card;
    card.record(CategoryId::Yahtzee, five(6));
    card.record(CategoryId::Sixes, five(6));
    const CategoryId lower[] = {CategoryId::ThreeOfAKind, CategoryId::FourOfAKind,
        CategoryId::FullHouse, CategoryId::SmallStraight, CategoryId::LargeStraight, CategoryId::Chance};
    const int points[] = {30, 30, 25, 30, 40, 30};
    for (int i = 0; i < 6; ++i) {
        EXPECT_EQ(card.record(CategoryId::Ones, five(6)), false);
        EXPECT_EQ(card.record(lower[i], five(6)), true);
        EXPECT_EQ(card.score(lower[i]), points[i]);
    }
    EXPECT_EQ(card.record(CategoryId::Ones, five(6)), true);
    EXPECT_EQ(card.score(CategoryId::Ones), 0);
    EXPECT_EQ(card.yahtzeeBonus(), 800);
}
TEST(CompleteRules, PreviewIsReadOnlyAndInvalidIndexIsRejected) {
    Scorecard card;
    card.record(CategoryId::Yahtzee, five(4));
    for (int repeat = 0; repeat < 2; ++repeat) {
        const auto preview = card.preview(five(4));
        EXPECT_EQ(preview[at(CategoryId::Fours)].score, 20);
        EXPECT_EQ(preview[at(CategoryId::Chance)].score, Scorecard::UNSCORED);
        EXPECT_EQ(card.total(), 50);
        EXPECT_EQ(card.yahtzeeBonus(), 0);
    }
    EXPECT_EQ(card.record(999, five(4)), false);
    EXPECT_EQ(card.record(CategoryId::Fours, five(4)), true);
    EXPECT_EQ(card.yahtzeeBonus(), 100);
}
TEST(CompleteRules, UpperBonusBoundaryAndDuplicateStraightFaces) {
    Scorecard below, exact;
    for (int face = 1; face <= 6; ++face) {
        Counts c{};
        c[face] = 3;
        exact.record(static_cast<std::size_t>(face - 1), c);
        if (face == 1) c[face] = 2;
        below.record(static_cast<std::size_t>(face - 1), c);
    }
    EXPECT_EQ(below.upperBonus(), 0);
    EXPECT_EQ(exact.upperBonus(), 35);
    EXPECT_EQ(scoreSmallStraight(countFaces({1, 2, 2, 3, 4})), 30);
    EXPECT_EQ(scoreLargeStraight(countFaces({1, 2, 2, 3, 4})), 0);
    EXPECT_EQ(scoreFullHouse(countFaces({2, 2, 3, 3, 3})), 25);
    EXPECT_EQ(scoreFullHouse(five(2)), 0);
}
TEST(CompleteRules, AllHandsAgreeWithIndependentBasicRules) {
    // Enumerate every ordered hand. The oracle counts directly from the input instead of reading the Counts table.
    for (int encoded = 0; encoded < 7776; ++encoded) {
        int n = encoded;
        std::vector<int> hand;
        for (int i = 0; i < 5; ++i) { hand.push_back(n % 6 + 1); n /= 6; }
        int sum = 0, largest = 0;
        bool pair = false, triple = false;
        for (int face = 1; face <= 6; ++face) {
            int count = 0;
            for (int die : hand) if (die == face) ++count;
            if (count > largest) largest = count;
            if (count == 2) pair = true;
            if (count == 3) triple = true;
            sum += face * count;
        }
        const Counts counts = countFaces(hand);
        EXPECT_EQ(scoreChance(counts), sum);
        EXPECT_EQ(scoreOfAKind(counts, 3), largest >= 3 ? sum : 0);
        EXPECT_EQ(scoreOfAKind(counts, 4), largest >= 4 ? sum : 0);
        EXPECT_EQ(scoreFullHouse(counts), pair && triple ? 25 : 0);
        EXPECT_EQ(scoreYahtzee(counts), largest == 5 ? 50 : 0);
    }
}
