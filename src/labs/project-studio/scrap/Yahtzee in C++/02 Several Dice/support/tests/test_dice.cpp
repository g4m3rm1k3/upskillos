#include "minitest.h"
#include "../Dice.h"

#include <cstdlib>

TEST(Dice, HoldsRequestedCount) {
    Dice three(3);
    Dice five(5);
    EXPECT_EQ(three.size(), 3u);
    EXPECT_EQ(five.size(), 5u);
}

TEST(Dice, FacesStartInRange) {
    std::srand(7);
    Dice d(5);
    for (std::size_t i = 0; i < d.size(); i++) {
        EXPECT_EQ(d.face(i) >= 1 && d.face(i) <= 6, true);
    }
}

TEST(Dice, RollAllChangesTheDiceThemselves) {
    // With 60 dice, a real roll changes most of them. A roll that only
    // changes copies would change none.
    std::srand(3);
    Dice d(60);
    int before[60];
    for (std::size_t i = 0; i < d.size(); i++) {
        before[i] = d.face(i);
    }
    d.rollAll();
    int changed = 0;
    for (std::size_t i = 0; i < d.size(); i++) {
        if (d.face(i) != before[i]) {
            changed++;
        }
        EXPECT_EQ(d.face(i) >= 1 && d.face(i) <= 6, true);
    }
    EXPECT_EQ(changed > 0, true);
}
