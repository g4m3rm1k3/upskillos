#include "minitest.h"
#include <sstream>
#include "../input.h"

TEST(HelpTest, HKeyIsHelp) {
    EXPECT_EQ(parseAction('h'), Action::Help);
    EXPECT_EQ(parseAction('H'), Action::Help);
}

TEST(HelpTest, OtherKeysAreUnchanged) {
    EXPECT_EQ(parseAction('w'), Action::Up);
    EXPECT_EQ(parseAction('q'), Action::Quit);
    EXPECT_EQ(parseAction('x'), Action::None);
}

TEST(HelpTest, ReadsHelpFromAStream) {
    std::istringstream in("h");
    EXPECT_EQ(readAction(in), Action::Help);
}
