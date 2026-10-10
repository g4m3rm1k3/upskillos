#include "minitest.h"
#include "../Die.h"

#include <cstdlib>

TEST(Die, StartsInRange) {
    std::srand(1);
    for (int i = 0; i < 500; i++) {
        Die d;
        EXPECT_EQ(d.getFace() >= 1 && d.getFace() <= 6, true);
    }
}

TEST(Die, RollStaysInRange) {
    Die d;
    for (int i = 0; i < 500; i++) {
        d.roll();
        EXPECT_EQ(d.getFace() >= 1 && d.getFace() <= 6, true);
    }
}

TEST(Die, TumbleNeverRepeatsOrFlipsToOpposite) {
    Die d;
    for (int i = 0; i < 1000; i++) {
        int before = d.getFace();
        d.tumbleStep();
        int after = d.getFace();
        EXPECT_EQ(after != before, true);
        EXPECT_EQ(after != 7 - before, true);
        EXPECT_EQ(after >= 1 && after <= 6, true);
    }
}

TEST(Die, SameFaceComparesFaces) {
    Die a(3);
    Die b(3);
    Die c(4);
    EXPECT_EQ(a.sameFace(b), true);
    EXPECT_EQ(a.sameFace(c), false);
}

TEST(Die, DrawsEdges) {
    Die d(1);
    EXPECT_EQ(d.line(0), " --- ");
    EXPECT_EQ(d.line(4), " --- ");
}

TEST(Die, DrawsOneAndSix) {
    Die one(1);
    EXPECT_EQ(one.line(2), "| o |");
    Die six(6);
    EXPECT_EQ(six.line(1), "|o o|");
}
