#include "minitest.h"
#include <sstream>
#include "../menu.h"

TEST(MenuTest, ReadsEachChoice) {
    std::istringstream one("1");
    std::istringstream two("2");
    std::istringstream three("3");
    EXPECT_EQ(readMenuChoice(one), MenuChoice::Start);
    EXPECT_EQ(readMenuChoice(two), MenuChoice::Quit);
    EXPECT_EQ(readMenuChoice(three), MenuChoice::Help);
}

TEST(MenuTest, OtherKeysAreUnknown) {
    std::istringstream x("x");
    std::istringstream nine("9");
    std::istringstream q("q");
    EXPECT_EQ(readMenuChoice(x), MenuChoice::Unknown);
    EXPECT_EQ(readMenuChoice(nine), MenuChoice::Unknown);
    EXPECT_EQ(readMenuChoice(q), MenuChoice::Unknown);
}

TEST(MenuTest, SkipsWhitespace) {
    std::istringstream in("  \n 1");
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Start);
}

TEST(MenuTest, ReadsOneChoiceAtATime) {
    std::istringstream in("132");
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Start);
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Help);
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Quit);
}

TEST(MenuTest, EndOfInputQuits) {
    std::istringstream in("");
    EXPECT_EQ(readMenuChoice(in), MenuChoice::Quit);
}
