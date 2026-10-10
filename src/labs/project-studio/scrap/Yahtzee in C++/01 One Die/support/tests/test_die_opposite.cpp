#include "minitest.h"
#include "../Die.h"

TEST(DieOpposite, OnePairsWithSix) {
    Die one(1);
    Die six(6);
    EXPECT_EQ(one.isOpposite(six), true);
    EXPECT_EQ(six.isOpposite(one), true);
}

TEST(DieOpposite, ADieIsNotOppositeItself) {
    Die three(3);
    Die alsoThree(3);
    EXPECT_EQ(three.isOpposite(alsoThree), false);
}

TEST(DieOpposite, NeighboursAreNotOpposite) {
    Die two(2);
    Die three(3);
    EXPECT_EQ(two.isOpposite(three), false);
}

TEST(DieOpposite, AllPairs) {
    for (int f = 1; f <= 6; f++) {
        Die a(f);
        Die b(7 - f);
        EXPECT_EQ(a.isOpposite(b), true);
    }
}
