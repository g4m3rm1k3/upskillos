#include "minitest.h"
#include "../Scoring.h"

#include <cstdlib>
#include <vector>

TEST(Counting, CountsEachFace) {
    Counts c = countFaces(std::vector<int>{3, 3, 5, 6, 1});
    EXPECT_EQ(c[1], 1);
    EXPECT_EQ(c[2], 0);
    EXPECT_EQ(c[3], 2);
    EXPECT_EQ(c[4], 0);
    EXPECT_EQ(c[5], 1);
    EXPECT_EQ(c[6], 1);
}

TEST(Counting, SlotZeroStaysZero) {
    Counts c = countFaces(std::vector<int>{1, 2, 3, 4, 5});
    EXPECT_EQ(c[0], 0);
}

TEST(Counting, IgnoresImpossibleFaces) {
    Counts c = countFaces(std::vector<int>{0, 7, -2, 4, 100});
    int counted = 0;
    for (int i = 0; i < 7; i++) {
        counted += c[i];
    }
    EXPECT_EQ(c[4], 1);
    EXPECT_EQ(counted, 1);
}

TEST(Counting, NoDiceMeansAllZero) {
    Counts c = countFaces(std::vector<int>{});
    for (int i = 0; i < 7; i++) {
        EXPECT_EQ(c[i], 0);
    }
}

TEST(Counting, SumFromCountsAddsTheFaces) {
    Counts c = countFaces(std::vector<int>{2, 2, 6, 6, 6});
    EXPECT_EQ(sumFromCounts(c), 22);
}

TEST(Counting, DiceOverloadMatchesTheVectorOverload) {
    std::srand(4);
    Dice d(5);
    std::vector<int> faces;
    for (std::size_t i = 0; i < d.size(); i++) {
        faces.push_back(d.face(i));
    }
    Counts fromDice = countFaces(d);
    Counts fromVector = countFaces(faces);
    for (int i = 0; i < 7; i++) {
        EXPECT_EQ(fromDice[i], fromVector[i]);
    }
}
