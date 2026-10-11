#include "minitest.h"
#include "../Player.h"

#include <vector>

static Counts hand(int a, int b, int c, int d, int e) {
    return countFaces(std::vector<int>{a, b, c, d, e});
}

TEST(PlayerSummary, ShowsNameAndScore) {
    Player p("Ada");
    p.scorecard().record(12, hand(1, 2, 3, 4, 6));
    p.scorecard().record(11, hand(2, 2, 2, 2, 2));
    EXPECT_EQ(p.summary(), "Ada: 66 points");
}

TEST(PlayerSummary, ANewPlayerHasZeroPoints) {
    Player p("Bo");
    EXPECT_EQ(p.summary(), "Bo: 0 points");
}

TEST(PlayerSummary, WorksOnAConstPlayer) {
    Player p("Cy");
    p.scorecard().record(12, hand(6, 6, 6, 6, 6));
    const Player& view = p;
    EXPECT_EQ(view.summary(), "Cy: 30 points");
}

TEST(PlayerSummary, TheScoreHasNoLeadingZerosOrPadding) {
    Player p("Dee");
    p.scorecard().record(12, hand(1, 1, 1, 1, 1));
    EXPECT_EQ(p.summary(), "Dee: 5 points");
}
