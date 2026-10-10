#include "minitest.h"
#include "../rules.h"

TEST(StateTest, PlayingAtTheStart) {
    Player p(1, 1);
    Coins c;
    EXPECT_EQ(checkState(p, c), GameState::Playing);
}

TEST(StateTest, LostAtZeroHealth) {
    Player p(1, 1);
    Coins c;
    p.takeDamage(10);
    EXPECT_EQ(checkState(p, c), GameState::Lost);
}

TEST(StateTest, StillPlayingAtOneHealth) {
    Player p(1, 1);
    Coins c;
    p.takeDamage(9);
    EXPECT_EQ(checkState(p, c), GameState::Playing);
}

TEST(StateTest, WonWhenNoCoinsAreLeft) {
    Player p(1, 1);
    Coins c;
    c.collectAt(2, 1);
    c.collectAt(7, 1);
    c.collectAt(1, 3);
    c.collectAt(5, 4);
    c.collectAt(8, 4);
    EXPECT_EQ(checkState(p, c), GameState::Won);
}

TEST(StateTest, FourCoinsAreNotEnough) {
    Player p(1, 1);
    Coins c;
    c.collectAt(2, 1);
    c.collectAt(7, 1);
    c.collectAt(1, 3);
    c.collectAt(5, 4);
    EXPECT_EQ(checkState(p, c), GameState::Playing);
}

TEST(StateTest, LosingBeatsWinning) {
    Player p(1, 1);
    Coins c;
    c.collectAt(2, 1);
    c.collectAt(7, 1);
    c.collectAt(1, 3);
    c.collectAt(5, 4);
    c.collectAt(8, 4);
    p.takeDamage(10);
    EXPECT_EQ(checkState(p, c), GameState::Lost);
}
