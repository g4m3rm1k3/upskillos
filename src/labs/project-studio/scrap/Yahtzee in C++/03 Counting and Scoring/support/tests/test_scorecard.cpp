#include "minitest.h"
#include "../Scorecard.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(Scorecard, StartsEmpty) {
    Scorecard s;
    EXPECT_EQ(s.size(), 13u);
    EXPECT_EQ(s.total(), 0);
    EXPECT_EQ(s.allScored(), false);
    for (std::size_t i = 0; i < s.size(); i++) {
        EXPECT_EQ(s.isScored(i), false);
    }
    EXPECT_EQ(s.score(0), Scorecard::UNSCORED);
}

TEST(Scorecard, NamesAreInOrder) {
    Scorecard s;
    EXPECT_EQ(s.name(0), "Ones");
    EXPECT_EQ(s.name(5), "Sixes");
    EXPECT_EQ(s.name(11), "Yahtzee");
    EXPECT_EQ(s.name(12), "Chance");
}

TEST(Scorecard, RecordsAScoreOnlyOnce) {
    Scorecard s;
    EXPECT_EQ(s.record(0, hand(1, 1, 3, 4, 1)), true);
    EXPECT_EQ(s.score(0), 3);
    EXPECT_EQ(s.isScored(0), true);
    EXPECT_EQ(s.record(0, hand(1, 1, 1, 1, 1)), false);
    EXPECT_EQ(s.score(0), 3);
}

TEST(Scorecard, RejectsAnIndexThatDoesNotExist) {
    Scorecard s;
    EXPECT_EQ(s.record(13, hand(1, 2, 3, 4, 5)), false);
    EXPECT_EQ(s.record(100, hand(1, 2, 3, 4, 5)), false);
    EXPECT_EQ(s.total(), 0);
}

TEST(Scorecard, TotalAddsOnlyScoredCategories) {
    Scorecard s;
    s.record(12, hand(1, 2, 3, 4, 6));
    s.record(11, hand(2, 2, 2, 2, 2));
    EXPECT_EQ(s.total(), 66);
}

TEST(Scorecard, PreviewShowsPotentialsWithoutChangingTheCard) {
    Scorecard s;
    s.record(0, hand(1, 1, 3, 4, 1));
    std::vector<Category> shown = s.preview(hand(4, 4, 4, 2, 6));
    EXPECT_EQ(shown.size(), 13u);
    EXPECT_EQ(shown[0].score, 3);
    EXPECT_EQ(shown[6].score, 20);
    EXPECT_EQ(shown[12].score, 20);
    EXPECT_EQ(s.isScored(6), false);
    EXPECT_EQ(s.isScored(12), false);
}

TEST(Scorecard, AllScoredAfterThirteenRecords) {
    Scorecard s;
    for (std::size_t i = 0; i < s.size(); i++) {
        s.record(i, hand(1, 2, 3, 4, 5));
    }
    EXPECT_EQ(s.allScored(), true);
}
