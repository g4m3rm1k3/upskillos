#include "minitest.h"
#include <sstream>
#include "../input.h"

TEST(ReadTest, ReadsOneKey) {
    std::istringstream in("w");
    EXPECT_EQ(readAction(in), Action::Up);
}

TEST(ReadTest, SkipsWhitespace) {
    std::istringstream in("  \n d");
    EXPECT_EQ(readAction(in), Action::Right);
}

TEST(ReadTest, ReadsKeysOneAtATime) {
    std::istringstream in("wasd");
    EXPECT_EQ(readAction(in), Action::Up);
    EXPECT_EQ(readAction(in), Action::Left);
    EXPECT_EQ(readAction(in), Action::Down);
    EXPECT_EQ(readAction(in), Action::Right);
}

TEST(ReadTest, EndOfInputQuits) {
    std::istringstream in("");
    EXPECT_EQ(readAction(in), Action::Quit);
}
