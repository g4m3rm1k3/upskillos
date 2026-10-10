#include "minitest.h"
#include "fakeinput.h"
#include "../Turn.h"

#include <cstdlib>

static TurnOptions quiet() {
    TurnOptions options;
    options.animate = false;
    return options;
}

TEST(Turn, ChanceScoresTheDiceTotal) {
    std::srand(5);
    Dice dice(5);
    Scorecard card;
    FakeInput in("13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.isScored(12), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, BadAnswersAreAskedAgain) {
    std::srand(6);
    Dice dice(5);
    Scorecard card;
    FakeInput in("abc\n99\n-4\n13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, ARerollKeepsTheTurnGoing) {
    std::srand(7);
    Dice dice(5);
    Scorecard card;
    FakeInput in("0\n1 2 3 4 5\n13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, ThreeRollsAreAllowed) {
    std::srand(8);
    Dice dice(5);
    Scorecard card;
    FakeInput in("0\n1 2\n0\n\n13\n");
    EXPECT_EQ(playTurn(dice, card, quiet()), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, RerollsAreLimitedByTheOptions) {
    std::srand(9);
    Dice dice(5);
    Scorecard card;
    TurnOptions options = quiet();
    options.maxRolls = 1;
    FakeInput in("0\n13\n");
    EXPECT_EQ(playTurn(dice, card, options), true);
    EXPECT_EQ(card.score(12), dice.total());
}

TEST(Turn, ACategoryCannotBeScoredTwice) {
    std::srand(10);
    Dice dice(5);
    Scorecard card;
    int first = 0;
    {
        FakeInput in("13\n");
        EXPECT_EQ(playTurn(dice, card, quiet()), true);
        first = card.score(12);
    }
    {
        FakeInput in("13\n7\n");
        EXPECT_EQ(playTurn(dice, card, quiet()), true);
    }
    EXPECT_EQ(card.score(12), first);
    EXPECT_EQ(card.isScored(6), true);
}

TEST(Turn, EndOfInputStopsTheTurn) {
    Dice dice(5);
    Scorecard card;
    FakeInput in("");
    EXPECT_EQ(playTurn(dice, card, quiet()), false);
    EXPECT_EQ(card.total(), 0);
    EXPECT_EQ(card.isScored(12), false);
}
