#include "minitest.h"
#include "fakeinput.h"
#include "../Input.h"

#include <string>
#include <vector>

static std::string bits(const std::vector<bool>& v) {
    std::string text;
    for (std::size_t i = 0; i < v.size(); i++) {
        text += v[i] ? '1' : '0';
    }
    return text;
}

TEST(Input, TrimRemovesBothEnds) {
    EXPECT_EQ(trim("  a b \r\n"), "a b");
    EXPECT_EQ(trim("x"), "x");
    EXPECT_EQ(trim("   "), "");
    EXPECT_EQ(trim(""), "");
}

TEST(Input, ToLowerCopyChangesLettersOnly) {
    EXPECT_EQ(toLowerCopy("AbC 12!"), "abc 12!");
}

TEST(Input, ToLowerCopyLeavesTheOriginalAlone) {
    std::string original = "HELLO";
    std::string lowered = toLowerCopy(original);
    EXPECT_EQ(original, "HELLO");
    EXPECT_EQ(lowered, "hello");
}

TEST(Input, KeepersByNumber) {
    EXPECT_EQ(bits(parseKeepers("1 3 5", 5)), "10101");
    EXPECT_EQ(bits(parseKeepers("2", 5)), "01000");
}

TEST(Input, KeepersAll) {
    EXPECT_EQ(bits(parseKeepers("a", 5)), "11111");
    EXPECT_EQ(bits(parseKeepers("A", 5)), "11111");
    EXPECT_EQ(bits(parseKeepers("  a \r", 5)), "11111");
}

TEST(Input, KeepersNone) {
    EXPECT_EQ(bits(parseKeepers("", 5)), "00000");
    EXPECT_EQ(bits(parseKeepers("   ", 5)), "00000");
}

TEST(Input, KeepersIgnoreNumbersOutOfRange) {
    EXPECT_EQ(bits(parseKeepers("0 6 -1 99 2", 5)), "01000");
}

TEST(Input, KeepersStopAtTheFirstWord) {
    EXPECT_EQ(bits(parseKeepers("1 x 3", 5)), "10000");
}

TEST(Input, KeepersFollowTheDiceCount) {
    EXPECT_EQ(bits(parseKeepers("1 6", 6)), "100001");
    EXPECT_EQ(bits(parseKeepers("a", 3)), "111");
}

TEST(Input, ParseIntAcceptsWholeNumbers) {
    int v = 0;
    EXPECT_EQ(parseInt("42", v), true);
    EXPECT_EQ(v, 42);
    EXPECT_EQ(parseInt(" 7 \r", v), true);
    EXPECT_EQ(v, 7);
    EXPECT_EQ(parseInt("-5", v), true);
    EXPECT_EQ(v, -5);
}

TEST(Input, ParseIntRejectsEverythingElse) {
    int v = 99;
    EXPECT_EQ(parseInt("abc", v), false);
    EXPECT_EQ(parseInt("12abc", v), false);
    EXPECT_EQ(parseInt("3 4", v), false);
    EXPECT_EQ(parseInt("", v), false);
    EXPECT_EQ(v, 99);
}

TEST(Input, ReadLineReadsOneLineAtATime) {
    FakeInput in("first\nsecond\n");
    std::string line;
    EXPECT_EQ(readLine(line), true);
    EXPECT_EQ(line, "first");
    EXPECT_EQ(readLine(line), true);
    EXPECT_EQ(line, "second");
    EXPECT_EQ(readLine(line), false);
}

TEST(Input, AskIntAsksAgainUntilTheAnswerFits) {
    FakeInput in("abc\n99\n0\n7\n");
    int v = -1;
    EXPECT_EQ(askInt("? ", 1, 13, v), true);
    EXPECT_EQ(v, 7);
}

TEST(Input, AskIntGivesUpWhenInputEnds) {
    FakeInput in("abc\n");
    int v = -1;
    EXPECT_EQ(askInt("? ", 1, 13, v), false);
    EXPECT_EQ(v, -1);
}
