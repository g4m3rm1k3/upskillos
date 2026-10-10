#include "minitest.h"
#include "../Dice.h"

#include <cstdlib>
#include <vector>

TEST(DiceFree, HeldDiceKeepTheirFaces) {
    std::srand(13);
    Dice d(60);
    std::vector<bool> hold(60, false);
    int before[60];
    for (std::size_t i = 0; i < d.size(); i++) {
        before[i] = d.face(i);
        hold[i] = (i % 2 == 0);
    }
    d.rollFree(hold);
    for (std::size_t i = 0; i < d.size(); i++) {
        if (hold[i]) {
            EXPECT_EQ(d.face(i), before[i]);
        }
        EXPECT_EQ(d.face(i) >= 1 && d.face(i) <= 6, true);
    }
}

TEST(DiceFree, FreeDiceGetNewFaces) {
    std::srand(17);
    Dice d(60);
    std::vector<bool> hold(60, false);
    int before[60];
    for (std::size_t i = 0; i < d.size(); i++) {
        before[i] = d.face(i);
    }
    d.rollFree(hold);
    int changed = 0;
    for (std::size_t i = 0; i < d.size(); i++) {
        if (d.face(i) != before[i]) {
            changed++;
        }
    }
    EXPECT_EQ(changed > 0, true);
}

TEST(DiceFree, EverythingHeldChangesNothing) {
    Dice d(5);
    std::vector<bool> hold(5, true);
    int before[5];
    for (std::size_t i = 0; i < d.size(); i++) {
        before[i] = d.face(i);
    }
    d.rollFree(hold);
    for (std::size_t i = 0; i < d.size(); i++) {
        EXPECT_EQ(d.face(i), before[i]);
    }
}
