#include "minitest.h"
#include "../Player.h"

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

TEST(Player, KeepsItsName) {
    Player p("Ada");
    EXPECT_EQ(p.name(), "Ada");
    std::string typed = "Grace";
    Player q(typed);
    EXPECT_EQ(q.name(), "Grace");
    EXPECT_EQ(typed, "Grace");
}

TEST(Player, StartsWithAnEmptyScorecard) {
    Player p("Ada");
    EXPECT_EQ(p.finalScore(), 0);
    EXPECT_EQ(p.scorecard().allScored(), false);
    EXPECT_EQ(p.scorecard().size(), 13u);
}

TEST(Player, ScoresGoOntoItsOwnScorecard) {
    Player p("Ada");
    p.scorecard().record(12, hand(1, 2, 3, 4, 6));
    const Player& view = p;
    EXPECT_EQ(view.scorecard().score(12), 16);
    EXPECT_EQ(p.finalScore(), 16);
}

TEST(Player, PlayersDoNotShareScorecards) {
    Player a("A");
    Player b("B");
    a.scorecard().record(12, hand(1, 2, 3, 4, 6));
    EXPECT_EQ(a.scorecard().isScored(12), true);
    EXPECT_EQ(b.scorecard().isScored(12), false);
    EXPECT_EQ(b.finalScore(), 0);
}

TEST(Player, FinalScoreIncludesTheUpperBonus) {
    Player p("Ada");
    for (int face = 1; face <= 6; face++) {
        p.scorecard().record(static_cast<std::size_t>(face - 1), only(face, 3));
    }
    EXPECT_EQ(p.scorecard().total(), 63);
    EXPECT_EQ(p.finalScore(), 98);
}

TEST(Player, CanBeCopiedAndTheCopyIsIndependent) {
    Player a("A");
    a.scorecard().record(12, hand(1, 2, 3, 4, 6));
    Player b = a;
    b.scorecard().record(11, hand(2, 2, 2, 2, 2));
    EXPECT_EQ(a.scorecard().isScored(11), false);
    EXPECT_EQ(b.scorecard().isScored(11), true);
    EXPECT_EQ(b.scorecard().isScored(12), true);
}
