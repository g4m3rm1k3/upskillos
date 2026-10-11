#include "minitest.h"
#include "../Ranking.h"

#include <string>
#include <vector>

static std::vector<const Player*> pointersTo(const std::vector<Player>& players, std::size_t count) {
    std::vector<const Player*> list;
    for (std::size_t i = 0; i < count; i++) {
        list.push_back(&players[i]);
    }
    return list;
}

TEST(JoinNames, NobodyGivesAnEmptyText) {
    std::vector<const Player*> none;
    EXPECT_EQ(joinNames(none), "");
}

TEST(JoinNames, OneNameStandsAlone) {
    std::vector<Player> players;
    players.emplace_back("Ann");
    EXPECT_EQ(joinNames(pointersTo(players, 1)), "Ann");
}

TEST(JoinNames, TwoNamesUseAnd) {
    std::vector<Player> players;
    players.emplace_back("Ann");
    players.emplace_back("Bo");
    EXPECT_EQ(joinNames(pointersTo(players, 2)), "Ann and Bo");
}

TEST(JoinNames, ThreeNamesUseCommasThenAnd) {
    std::vector<Player> players;
    players.emplace_back("Ann");
    players.emplace_back("Bo");
    players.emplace_back("Cy");
    EXPECT_EQ(joinNames(pointersTo(players, 3)), "Ann, Bo and Cy");
}

TEST(JoinNames, FourNamesKeepTheirOrder) {
    std::vector<Player> players;
    players.emplace_back("A");
    players.emplace_back("B");
    players.emplace_back("C");
    players.emplace_back("D");
    EXPECT_EQ(joinNames(pointersTo(players, 4)), "A, B, C and D");
}

TEST(JoinNames, NamesWithSpacesAreKeptWhole) {
    std::vector<Player> players;
    players.emplace_back("Ann Lee");
    players.emplace_back("Bo Ng");
    EXPECT_EQ(joinNames(pointersTo(players, 2)), "Ann Lee and Bo Ng");
}
