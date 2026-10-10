#include "minitest.h"
#include <sstream>
#include <string>
#include "../agent.h"

static Level corridor() {
    std::istringstream in("#########\n#@..*...#\n#######E#\n#########\n");
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(GreedyTest, AnEmptyTableJustPicksUp) {
    Env env(corridor());
    QTable q(Env::actionCount());
    EpisodeResult r = runGreedy(env, q);
    EXPECT_FALSE(r.won);
    EXPECT_EQ(r.steps, 17);
    EXPECT_DOUBLE_EQ(r.totalReward, -87.0);
}

TEST(GreedyTest, ATableThatKnowsTheWay) {
    Env env(corridor());
    QTable q(Env::actionCount());
    q.set("h1,1;e7,2;c4,1+;p0", 3, 1.0);
    q.set("h2,1;e7,2;c4,1+;p1", 3, 1.0);
    q.set("h3,1;e7,1;c4,1+;p0", 3, 1.0);
    EpisodeResult r = runGreedy(env, q);
    EXPECT_TRUE(r.won);
    EXPECT_EQ(r.steps, 3);
    EXPECT_DOUBLE_EQ(r.totalReward, 57.0);
}

TEST(GreedyTest, PlayingDoesNotChangeTheTable) {
    Env env(corridor());
    QTable q(Env::actionCount());
    runGreedy(env, q);
    EXPECT_EQ(q.stateCount(), 0);
}

TEST(GreedyTest, TheAgentLearnsTheCorridor) {
    Env env(corridor());
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 5000;
    train(env, q, config);

    EpisodeResult r = runGreedy(env, q);
    EXPECT_TRUE(r.won);
    EXPECT_EQ(r.steps, 3);
    EXPECT_DOUBLE_EQ(r.totalReward, 57.0);
}
