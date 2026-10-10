#include "minitest.h"
#include "../Dice.h"

#include <vector>

TEST(AnimateResult, ReturnsFalseWhenEverythingIsHeld) {
    Dice d(5);
    std::vector<bool> hold(5, true);
    EXPECT_EQ(d.animate(hold), false);
}

TEST(AnimateResult, ReturnsTrueWhenSomethingMoves) {
    Dice d(5);
    std::vector<bool> hold(5, false);
    EXPECT_EQ(d.animate(hold), true);
}
