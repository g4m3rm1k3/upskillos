#include "minitest.h"
#include <string>
#include "../rules.h"

TEST(MessageTest, WonMessage) {
    EXPECT_EQ(endMessage(GameState::Won), "You collected every coin. You win!");
}

TEST(MessageTest, LostMessage) {
    EXPECT_EQ(endMessage(GameState::Lost), "The enemy got you. Game over.");
}

TEST(MessageTest, QuittingMessage) {
    EXPECT_EQ(endMessage(GameState::Playing), "Goodbye!");
}
