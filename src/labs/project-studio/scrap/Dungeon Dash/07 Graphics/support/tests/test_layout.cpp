#include "minitest.h"
#include "../layout.h"

TEST(LayoutTest, TheFirstTileIsAtTheCorner) {
    EXPECT_EQ(tileRect(0, 0, 32), (Rect{0, 0, 32, 32}));
}

TEST(LayoutTest, TilesAreSpacedByTheirSize) {
    EXPECT_EQ(tileRect(3, 2, 32), (Rect{96, 64, 32, 32}));
    EXPECT_EQ(tileRect(1, 1, 48), (Rect{48, 48, 48, 48}));
}

TEST(LayoutTest, NeighboursTouchWithoutOverlapping) {
    Rect a = tileRect(1, 0, 32);
    Rect b = tileRect(2, 0, 32);
    EXPECT_EQ(a.x + a.w, b.x);
}

TEST(LayoutTest, WindowWidthIsAllTheColumns) {
    EXPECT_EQ(windowWidth(10, 32), 320);
    EXPECT_EQ(windowWidth(12, 48), 576);
}

TEST(LayoutTest, WindowHeightIsTheRowsPlusTheHud) {
    EXPECT_EQ(windowHeight(6, 32, 40), 232);
    EXPECT_EQ(windowHeight(7, 48, 0), 336);
}
