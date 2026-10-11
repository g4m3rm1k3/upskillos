#include "minitest.h"
#include "../Ranking.h"

#include <string>
#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

static Counts only(int face, int count) {
    Counts c{};
    c[face] = count;
    return c;
}

// Chance scores the total of the dice, so a hand with the wanted total
// gives the player exactly that many points.
static void give(Player& p, int points) {
    if (points == 5) {
        p.scorecard().record(12, hand(1, 1, 1, 1, 1));
    } else if (points == 16) {
        p.scorecard().record(12, hand(1, 2, 3, 4, 6));
    } else if (points == 20) {
        p.scorecard().record(12, hand(4, 4, 4, 4, 4));
    } else if (points == 30) {
        p.scorecard().record(12, hand(6, 6, 6, 6, 6));
    }
}

static std::vector<Player> table(int a, int b, int c) {
    std::vector<Player> players;
    players.emplace_back("Ann");
    players.emplace_back("Bo");
    players.emplace_back("Cy");
    give(players[0], a);
    give(players[1], b);
    give(players[2], c);
    return players;
}

TEST(Ranking, HighestScoreComesFirst) {
    std::vector<Player> players = table(16, 30, 5);
    std::vector<const Player*> order = rankPlayers(players);
    EXPECT_EQ(order.size(), 3u);
    EXPECT_EQ(order[0]->name(), "Bo");
    EXPECT_EQ(order[1]->name(), "Ann");
    EXPECT_EQ(order[2]->name(), "Cy");
}

TEST(Ranking, TiesKeepTheSeatingOrder) {
    std::vector<Player> players = table(16, 16, 30);
    std::vector<const Player*> order = rankPlayers(players);
    EXPECT_EQ(order[0]->name(), "Cy");
    EXPECT_EQ(order[1]->name(), "Ann");
    EXPECT_EQ(order[2]->name(), "Bo");

    std::vector<Player> equal = table(20, 20, 20);
    std::vector<const Player*> same = rankPlayers(equal);
    EXPECT_EQ(same[0]->name(), "Ann");
    EXPECT_EQ(same[1]->name(), "Bo");
    EXPECT_EQ(same[2]->name(), "Cy");
}

TEST(Ranking, TheRankingPointsAtTheRealPlayers) {
    std::vector<Player> players = table(16, 30, 5);
    std::vector<const Player*> order = rankPlayers(players);
    EXPECT_EQ(order[0] == &players[1], true);
    EXPECT_EQ(players[0].name(), "Ann");
    EXPECT_EQ(players[1].name(), "Bo");
    EXPECT_EQ(players[2].name(), "Cy");
}

TEST(Ranking, TheUpperBonusCountsTowardsTheRanking) {
    std::vector<Player> players;
    players.emplace_back("Ann");
    players.emplace_back("Bo");
    for (int face = 1; face <= 6; face++) {
        players[0].scorecard().record(static_cast<std::size_t>(face - 1), only(face, 3));
    }
    players[1].scorecard().record(12, hand(6, 6, 6, 6, 6));
    players[1].scorecard().record(11, hand(6, 6, 6, 6, 6));
    EXPECT_EQ(players[0].scorecard().total(), 63);
    EXPECT_EQ(players[1].scorecard().total(), 80);
    std::vector<const Player*> order = rankPlayers(players);
    EXPECT_EQ(order[0]->name(), "Ann");
}

TEST(Winners, TheHighestScoreWins) {
    std::vector<Player> players = table(16, 30, 5);
    std::vector<const Player*> winners = winnersOf(players);
    EXPECT_EQ(winners.size(), 1u);
    EXPECT_EQ(winners[0]->name(), "Bo");
}

TEST(Winners, ATieForFirstGivesEveryoneWhoTied) {
    std::vector<Player> players = table(30, 16, 30);
    std::vector<const Player*> winners = winnersOf(players);
    EXPECT_EQ(winners.size(), 2u);
    EXPECT_EQ(winners[0]->name(), "Ann");
    EXPECT_EQ(winners[1]->name(), "Cy");
}

TEST(Winners, EveryoneTyingMeansEveryoneWins) {
    std::vector<Player> players = table(20, 20, 20);
    EXPECT_EQ(winnersOf(players).size(), 3u);
}

TEST(Winners, NoPlayersMeansNoWinners) {
    std::vector<Player> none;
    EXPECT_EQ(rankPlayers(none).size(), 0u);
    EXPECT_EQ(winnersOf(none).size(), 0u);
}

TEST(NewGame, KeepsTheNameAndClearsTheCard) {
    Player p("Ann");
    give(p, 30);
    EXPECT_EQ(p.finalScore(), 30);
    p.startNewGame();
    EXPECT_EQ(p.name(), "Ann");
    EXPECT_EQ(p.finalScore(), 0);
    EXPECT_EQ(p.scorecard().isScored(12), false);
    EXPECT_EQ(p.scorecard().size(), 13u);
}
