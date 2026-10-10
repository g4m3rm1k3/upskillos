#include "minitest.h"
#include <sstream>
#include <string>
#include "../level.h"

TEST(CommentTest, CommentLinesAreSkipped) {
    std::istringstream in("; my first level\n#####\n#@.*#\n; the middle\n#.E.#\n#####\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    ASSERT_EQ(level.rows.size(), 4u);
    EXPECT_EQ(level.rows[1], "#...#");
    EXPECT_EQ(level.hero.y, 1);
    EXPECT_EQ(level.enemy.y, 2);
}

TEST(CommentTest, ASemicolonInsideARowIsNotAComment) {
    std::istringstream in("#####\n#@;*#\n#.E.#\n#####\n");
    Level level;
    EXPECT_FALSE(parseLevel(in, level));
    EXPECT_EQ(level.error, "unknown tile");
}

TEST(CommentTest, CommentsWithWindowsLineEndings) {
    std::istringstream in("; note\r\n#####\r\n#@.*#\r\n#.E.#\r\n#####\r\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    EXPECT_EQ(level.rows.size(), 4u);
}

TEST(CommentTest, OnlyCommentsIsAnEmptyLevel) {
    std::istringstream in("; nothing here\n");
    Level level;
    EXPECT_FALSE(parseLevel(in, level));
    EXPECT_EQ(level.error, "empty level");
}

TEST(CommentTest, ALongCommentDoesNotBreakTheWidthCheck) {
    std::istringstream in("#####\n; a much longer comment than the rows\n#@.*#\n#.E.#\n#####\n");
    Level level;
    EXPECT_TRUE(parseLevel(in, level));
    EXPECT_EQ(level.rows.size(), 4u);
}
