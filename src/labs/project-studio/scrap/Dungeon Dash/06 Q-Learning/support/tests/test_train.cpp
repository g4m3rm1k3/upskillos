#include "minitest.h"
#include <sstream>
#include <string>
#include <vector>
#include "../agent.h"

static Level corridor() {
    std::istringstream in("#########\n#@..*...#\n#######E#\n#########\n");
    Level level;
    parseLevel(in, level);
    return level;
}

TEST(TrainTest, OneRewardPerEpisode) {
    Env env(corridor());
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 25;
    std::vector<double> rewards = train(env, q, config);
    EXPECT_EQ(rewards.size(), 25u);
}

TEST(TrainTest, TrainingFillsTheTable) {
    Env env(corridor());
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 25;
    train(env, q, config);
    EXPECT_GT(q.stateCount(), 0);
    EXPECT_TRUE(q.knows("h1,1;e7,2;c4,1+;p0"));
}

TEST(TrainTest, TheSameSeedGivesTheSameTraining) {
    Env env1(corridor());
    Env env2(corridor());
    QTable q1(Env::actionCount());
    QTable q2(Env::actionCount());
    TrainConfig config;
    config.episodes = 40;
    config.seed = 99;
    EXPECT_EQ(train(env1, q1, config), train(env2, q2, config));
    EXPECT_EQ(q1.stateCount(), q2.stateCount());
}

TEST(TrainTest, RewardsStayInTheRealRange) {
    Env env(corridor());
    QTable q(Env::actionCount());
    TrainConfig config;
    config.episodes = 50;
    for (double r : train(env, q, config)) {
        EXPECT_GT(r, -200.0);
        EXPECT_LT(r, 60.0);
    }
}
