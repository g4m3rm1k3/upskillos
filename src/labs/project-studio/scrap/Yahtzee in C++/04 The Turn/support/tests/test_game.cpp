#include "minitest.h"
#include "fakeinput.h"
#include "../Game.h"

#include <cstdlib>

static TurnOptions quiet() {
    TurnOptions options;
    options.animate = false;
    return options;
}

TEST(Game, ThirteenTurnsFinishTheGame) {
    std::srand(12);
    Dice dice(5);
    Scorecard card;
    FakeInput in("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n");
    EXPECT_EQ(playGame(dice, card, quiet()), true);
    EXPECT_EQ(card.allScored(), true);
}

TEST(Game, StopsWhenTheInputEnds) {
    std::srand(14);
    Dice dice(5);
    Scorecard card;
    FakeInput in("1\n2\n");
    EXPECT_EQ(playGame(dice, card, quiet()), false);
    EXPECT_EQ(card.allScored(), false);
    EXPECT_EQ(card.isScored(0), true);
    EXPECT_EQ(card.isScored(1), true);
    EXPECT_EQ(card.isScored(2), false);
}
