#include "minitest.h"
#include "fakeinput.h"
#include "../Game.h"

#include <vector>

TEST(UniqueNames, DifferentNamesAreAccepted) {
    FakeInput in("2\nAnn\nBo\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players[0].name(), "Ann");
    EXPECT_EQ(players[1].name(), "Bo");
}

TEST(UniqueNames, ARepeatedNameIsAskedAgain) {
    FakeInput in("2\nAnn\nAnn\nBo\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players.size(), 2u);
    EXPECT_EQ(players[1].name(), "Bo");
}

TEST(UniqueNames, CapitalLettersDoNotMakeANameNew) {
    FakeInput in("2\nAnn\nANN\nann\nBo\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players[0].name(), "Ann");
    EXPECT_EQ(players[1].name(), "Bo");
}

TEST(UniqueNames, TheDefaultNameCanClashToo) {
    FakeInput in("2\nPlayer 2\n\nZed\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players[0].name(), "Player 2");
    EXPECT_EQ(players[1].name(), "Zed");
}

TEST(UniqueNames, InputEndingWhileAskingAgainStopsTheSetup) {
    FakeInput in("2\nAnn\nann\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), false);
}

TEST(UniqueNames, TheRestOfTheNamesStillWork) {
    FakeInput in("3\nAnn\nBo\nbo\nCy\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players.size(), 3u);
    EXPECT_EQ(players[2].name(), "Cy");
}
