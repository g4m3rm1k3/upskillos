#include "minitest.h"
#include "../Dice.h"

#include <cstdlib>

TEST(DiceTotal, MatchesTheSumOfFaces) {
    std::srand(11);
    Dice d(5);
    for (int round = 0; round < 50; round++) {
        d.rollAll();
        int expected = 0;
        for (std::size_t i = 0; i < d.size(); i++) {
            expected += d.face(i);
        }
        EXPECT_EQ(d.total(), expected);
    }
}

TEST(DiceTotal, WorksForOneDie) {
    Dice one(1);
    EXPECT_EQ(one.total(), one.face(0));
}

TEST(DiceTotal, NoDiceTotalZero) {
    Dice none(0);
    EXPECT_EQ(none.total(), 0);
}
