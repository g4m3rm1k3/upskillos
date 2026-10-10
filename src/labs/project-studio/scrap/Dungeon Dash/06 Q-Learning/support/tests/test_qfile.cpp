#include "minitest.h"
#include <cstdio>
#include <fstream>
#include <string>
#include "../qtable.h"

TEST(QFileTest, RoundTripThroughAFile) {
    const std::string path = "qtable_test_tmp.txt";

    QTable q(5);
    q.set("a;b", 2, 3.5);
    q.set("c", 0, -1.0);
    EXPECT_TRUE(saveQTableFile(q, path));

    QTable loaded(5);
    EXPECT_TRUE(loadQTableFile(loaded, path));
    EXPECT_DOUBLE_EQ(loaded.get("a;b", 2), 3.5);
    EXPECT_DOUBLE_EQ(loaded.get("c", 0), -1.0);
    EXPECT_EQ(loaded.stateCount(), 2);

    std::remove(path.c_str());
}

TEST(QFileTest, MissingFileFailsToLoad) {
    QTable q(5);
    q.set("keep", 1, 2.0);
    EXPECT_FALSE(loadQTableFile(q, "no/such/folder/q.txt"));
    EXPECT_DOUBLE_EQ(q.get("keep", 1), 2.0);
}

TEST(QFileTest, ImpossiblePathFailsToSave) {
    QTable q(5);
    EXPECT_FALSE(saveQTableFile(q, "no/such/folder/q.txt"));
}

TEST(QFileTest, BadFileContentsFailToLoad) {
    const std::string path = "qtable_bad_tmp.txt";
    {
        std::ofstream file(path);
        file << "this is not a table\n";
    }

    QTable q(5);
    q.set("keep", 1, 2.0);
    EXPECT_FALSE(loadQTableFile(q, path));
    EXPECT_DOUBLE_EQ(q.get("keep", 1), 2.0);

    std::remove(path.c_str());
}
