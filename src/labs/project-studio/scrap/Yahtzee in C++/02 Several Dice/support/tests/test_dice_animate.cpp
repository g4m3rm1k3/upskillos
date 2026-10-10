#include "minitest.h"
#include "../Dice.h"

#include <cstdlib>
#include <vector>

TEST(DiceAnimate, HeldDiceNeverChange) {
    std::srand(21);
    Dice d(5);
    std::vector<bool> hold(5, false);
    hold[0] = true;
    hold[2] = true;
    hold[4] = true;

    int before0 = d.face(0);
    int before2 = d.face(2);
    int before4 = d.face(4);

    d.animate(hold);

    EXPECT_EQ(d.face(0), before0);
    EXPECT_EQ(d.face(2), before2);
    EXPECT_EQ(d.face(4), before4);
}

TEST(DiceAnimate, EverythingHeldReturnsImmediately) {
    Dice d(5);
    std::vector<bool> hold(5, true);
    int before[5];
    for (int i = 0; i < 5; i++) {
        before[i] = d.face(i);
    }
    d.animate(hold);
    for (int i = 0; i < 5; i++) {
        EXPECT_EQ(d.face(i), before[i]);
    }
}
