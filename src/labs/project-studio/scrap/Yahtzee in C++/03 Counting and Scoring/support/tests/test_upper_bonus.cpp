#include "minitest.h"
#include "../Scorecard.h"

static Counts only(int face, int count) {
    Counts c{};
    c[face] = count;
    return c;
}

TEST(UpperBonus, NothingScoredMeansNoBonus) {
    Scorecard s;
    EXPECT_EQ(s.upperBonus(), 0);
}

TEST(UpperBonus, SixtyThreeEarnsThirtyFive) {
    Scorecard s;
    for (int face = 1; face <= 6; face++) {
        s.record(static_cast<std::size_t>(face - 1), only(face, 3));
    }
    EXPECT_EQ(s.upperBonus(), 35);
}

TEST(UpperBonus, SixtyTwoEarnsNothing) {
    Scorecard s;
    s.record(0, only(1, 2));
    for (int face = 2; face <= 6; face++) {
        s.record(static_cast<std::size_t>(face - 1), only(face, 3));
    }
    EXPECT_EQ(s.upperBonus(), 0);
}

TEST(UpperBonus, LowerCategoriesDoNotCount) {
    Scorecard s;
    for (int face = 1; face <= 5; face++) {
        s.record(static_cast<std::size_t>(face - 1), only(face, 3));
    }
    s.record(11, only(6, 5));
    s.record(12, only(6, 5));
    EXPECT_EQ(s.upperBonus(), 0);
}
