#include "minitest.h"
#include "../Scoring.h"

#include <vector>

TEST(Highest, AllDifferentGivesOne) {
    EXPECT_EQ(highestFaceCount(countFaces(std::vector<int>{1, 2, 3, 4, 5})), 1);
}

TEST(Highest, PairGivesTwo) {
    EXPECT_EQ(highestFaceCount(countFaces(std::vector<int>{2, 2, 3, 4, 5})), 2);
}

TEST(Highest, FiveOfAKindGivesFive) {
    EXPECT_EQ(highestFaceCount(countFaces(std::vector<int>{6, 6, 6, 6, 6})), 5);
}

TEST(Highest, NoDiceGivesZero) {
    Counts c{};
    EXPECT_EQ(highestFaceCount(c), 0);
}

TEST(Highest, SlotZeroIsIgnored) {
    Counts c{};
    c[0] = 9;
    c[4] = 2;
    EXPECT_EQ(highestFaceCount(c), 2);
}
