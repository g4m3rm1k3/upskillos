#include "minitest.h"
#include <sstream>
#include <string>
#include "../qtable.h"

TEST(QIoTest, SavesASortedTextTable) {
    QTable q(5);
    q.set("s2", 4, -2.25);
    q.set("s2", 0, 1.5);
    q.set("s1", 3, 2.0);
    std::ostringstream out;
    q.save(out);
    EXPECT_EQ(out.str(), "actions 5\ns1 0 0 0 2 0\ns2 1.5 0 0 0 -2.25\n");
}

TEST(QIoTest, AnEmptyTableSavesOnlyTheHeader) {
    QTable q(5);
    std::ostringstream out;
    q.save(out);
    EXPECT_EQ(out.str(), "actions 5\n");
}

TEST(QIoTest, LoadRestoresEveryValue) {
    QTable q(5);
    q.set("h1,1;e7,2;c4,1+;p0", 3, 0.1);
    q.set("h2,1;e7,2;c4,1+;p1", 0, -12.375);
    std::ostringstream out;
    q.save(out);

    QTable copy(5);
    std::istringstream in(out.str());
    EXPECT_TRUE(copy.load(in));
    EXPECT_EQ(copy.stateCount(), 2);
    EXPECT_DOUBLE_EQ(copy.get("h1,1;e7,2;c4,1+;p0", 3), 0.1);
    EXPECT_DOUBLE_EQ(copy.get("h2,1;e7,2;c4,1+;p1", 0), -12.375);
    EXPECT_DOUBLE_EQ(copy.get("h2,1;e7,2;c4,1+;p1", 4), 0.0);
}

TEST(QIoTest, LoadReplacesWhatWasThere) {
    QTable q(5);
    q.set("new", 1, 2.0);
    std::ostringstream out;
    q.save(out);

    QTable copy(5);
    copy.set("old", 0, 9.0);
    std::istringstream in(out.str());
    EXPECT_TRUE(copy.load(in));
    EXPECT_FALSE(copy.knows("old"));
    EXPECT_TRUE(copy.knows("new"));
}

TEST(QIoTest, WrongActionCountFails) {
    QTable q(5);
    q.set("a", 0, 1.0);
    std::ostringstream out;
    q.save(out);

    QTable other(4);
    std::istringstream in(out.str());
    EXPECT_FALSE(other.load(in));
}

TEST(QIoTest, GarbageFails) {
    QTable q(5);
    std::istringstream words("hello world");
    EXPECT_FALSE(q.load(words));
    std::istringstream shortRow("actions 5\ns1 1 2 3\n");
    EXPECT_FALSE(q.load(shortRow));
}

TEST(QIoTest, AFailedLoadKeepsTheOldTable) {
    QTable q(5);
    q.set("keep", 0, 9.0);
    std::istringstream in("actions 5\ns1 1 2 3\n");
    EXPECT_FALSE(q.load(in));
    EXPECT_DOUBLE_EQ(q.get("keep", 0), 9.0);
}
