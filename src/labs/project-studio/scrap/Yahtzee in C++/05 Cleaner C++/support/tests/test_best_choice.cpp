#include "minitest.h"
#include "../Scorecard.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(BestChoice, FiveOfAKindPicksYahtzee) {
    Scorecard s;
    EXPECT_EQ(s.bestChoice(hand(6, 6, 6, 6, 6)) == CategoryId::Yahtzee, true);
}

TEST(BestChoice, SkipsBoxesThatAreAlreadyScored) {
    Scorecard s;
    Counts sixes = hand(6, 6, 6, 6, 6);
    s.record(CategoryId::Yahtzee, sixes);
    EXPECT_EQ(s.bestChoice(sixes) == CategoryId::Sixes, true);
}

TEST(BestChoice, TiesGoToTheLowestBox) {
    Scorecard s;
    Counts sixes = hand(6, 6, 6, 6, 6);
    s.record(CategoryId::Yahtzee, sixes);
    CategoryId best = s.bestChoice(sixes);
    EXPECT_EQ(static_cast<std::size_t>(best), 5u);
}

TEST(BestChoice, AStraightPicksTheLargeStraight) {
    Scorecard s;
    EXPECT_EQ(s.bestChoice(hand(1, 2, 3, 4, 5)) == CategoryId::LargeStraight, true);
}

TEST(BestChoice, EvenZeroPointsPicksALegalBox) {
    Scorecard s;
    Counts any = hand(1, 2, 3, 4, 5);
    for (std::size_t i = 0; i < s.size(); i++) {
        if (i != 10 && i != 11) {
            s.record(i, any);
        }
    }
    EXPECT_EQ(s.bestChoice(hand(1, 1, 2, 2, 3)) == CategoryId::LargeStraight, true);
}

TEST(BestChoice, FullCardGivesCount) {
    Scorecard s;
    Counts any = hand(1, 2, 3, 4, 5);
    for (std::size_t i = 0; i < s.size(); i++) {
        s.record(i, any);
    }
    EXPECT_EQ(s.bestChoice(any) == CategoryId::Count, true);
}
