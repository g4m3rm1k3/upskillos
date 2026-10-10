#include "minitest.h"
#include "../effects.h"

TEST(OverlayTest, WinningIsGreen) {
    EXPECT_EQ(overlayFor(GameState::Won), (Color{0, 200, 80, 110}));
}

TEST(OverlayTest, LosingIsRed) {
    EXPECT_EQ(overlayFor(GameState::Lost), (Color{200, 0, 0, 140}));
}

TEST(OverlayTest, PlayingHasNoTint) {
    EXPECT_EQ(overlayFor(GameState::Playing), (Color{0, 0, 0, 0}));
}

TEST(OverlayTest, TheTintsAreSeeThrough) {
    EXPECT_LT(overlayFor(GameState::Won).a, 255);
    EXPECT_LT(overlayFor(GameState::Lost).a, 255);
}
