#include "minitest.h"
#include "fakeinput.h"
#include "../Game.h"

#include <cstdlib>
#include <string>
#include <vector>

static TurnOptions quiet() {
    TurnOptions options;
    options.animate = false;
    return options;
}

static std::string interleaved(int players) {
    std::string text;
    for (int box = 1; box <= 13; box++) {
        for (int p = 0; p < players; p++) {
            text += std::to_string(box) + "\n";
        }
    }
    return text;
}

TEST(Players, ReadsACountAndNames) {
    FakeInput in("2\nAnn\nBo\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players.size(), 2u);
    EXPECT_EQ(players[0].name(), "Ann");
    EXPECT_EQ(players[1].name(), "Bo");
}

TEST(Players, AnEmptyNameBecomesPlayerNumber) {
    FakeInput in("3\nAnn\n\n   \n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players[1].name(), "Player 2");
    EXPECT_EQ(players[2].name(), "Player 3");
}

TEST(Players, NamesAreTrimmed) {
    FakeInput in("1\n   Ann Lee  \r\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players[0].name(), "Ann Lee");
}

TEST(Players, TheCountIsAskedAgainUntilItFits) {
    FakeInput in("0\n9\nabc\n3\nA\nB\nC\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), true);
    EXPECT_EQ(players.size(), 3u);
}

TEST(Players, MissingNamesStopTheSetup) {
    FakeInput in("2\nAnn\n");
    std::vector<Player> players;
    EXPECT_EQ(readPlayers(players), false);
}

TEST(Players, TwoPlayersFinishAThirteenRoundGame) {
    std::srand(21);
    Dice dice(5);
    std::vector<Player> players;
    players.emplace_back("Ann");
    players.emplace_back("Bo");
    FakeInput in(interleaved(2));
    EXPECT_EQ(playGame(dice, players, quiet()), true);
    EXPECT_EQ(players[0].scorecard().allScored(), true);
    EXPECT_EQ(players[1].scorecard().allScored(), true);
}

TEST(Players, PlayersTakeTurnsInOrder) {
    std::srand(22);
    Dice dice(5);
    std::vector<Player> players;
    players.emplace_back("Ann");
    players.emplace_back("Bo");
    FakeInput in("13\n12\n");
    EXPECT_EQ(playGame(dice, players, quiet()), false);
    EXPECT_EQ(players[0].scorecard().isScored(12), true);
    EXPECT_EQ(players[1].scorecard().isScored(11), true);
    EXPECT_EQ(players[0].scorecard().isScored(11), false);
    EXPECT_EQ(players[1].scorecard().isScored(12), false);
}

TEST(Players, ThreePlayersAlsoRotate) {
    std::srand(23);
    Dice dice(5);
    std::vector<Player> players;
    players.emplace_back("A");
    players.emplace_back("B");
    players.emplace_back("C");
    FakeInput in(interleaved(3));
    EXPECT_EQ(playGame(dice, players, quiet()), true);
    for (const Player& p : players) {
        EXPECT_EQ(p.scorecard().allScored(), true);
    }
}

TEST(Players, AFinishedPlayerIsSkipped) {
    std::srand(24);
    Dice dice(5);
    std::vector<Player> players;
    players.emplace_back("Ann");
    players.emplace_back("Bo");
    Counts any = countFaces(std::vector<int>{1, 2, 3, 4, 5});
    for (std::size_t i = 0; i < 13; i++) {
        players[0].scorecard().record(i, any);
    }
    FakeInput in("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n");
    EXPECT_EQ(playGame(dice, players, quiet()), true);
    EXPECT_EQ(players[1].scorecard().allScored(), true);
}
