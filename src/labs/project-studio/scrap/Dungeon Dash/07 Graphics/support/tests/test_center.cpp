#include "minitest.h"
#include "../layout.h"

TEST(CenterTest, ASmallerSquareInTheMiddle) {
    EXPECT_EQ(centerRect(Rect{64, 32, 32, 32}, 16), (Rect{72, 40, 16, 16}));
}

TEST(CenterTest, TheSameSizeChangesNothing) {
    EXPECT_EQ(centerRect(Rect{0, 0, 48, 48}, 48), (Rect{0, 0, 48, 48}));
}

TEST(CenterTest, SizeZeroIsAPoint) {
    EXPECT_EQ(centerRect(Rect{10, 10, 20, 20}, 0), (Rect{20, 20, 0, 0}));
}

TEST(CenterTest, AnOddGapLeansLeftAndUp) {
    EXPECT_EQ(centerRect(Rect{0, 0, 33, 33}, 10), (Rect{11, 11, 10, 10}));
}

TEST(CenterTest, WorksForANonSquareOuterRectangle) {
    EXPECT_EQ(centerRect(Rect{0, 0, 100, 40}, 20), (Rect{40, 10, 20, 20}));
}
