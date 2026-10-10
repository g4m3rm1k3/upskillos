#include "minitest.h"
#include <string>
#include "../colors.h"

TEST(ColorTest, TheMapColours) {
    EXPECT_EQ(colorFor('#'), (Color{90, 90, 120, 255}));
    EXPECT_EQ(colorFor('.'), (Color{30, 30, 40, 255}));
}

TEST(ColorTest, TheCharacterColours) {
    EXPECT_EQ(colorFor('*'), (Color{255, 200, 0, 255}));
    EXPECT_EQ(colorFor('@'), (Color{80, 200, 120, 255}));
    EXPECT_EQ(colorFor('X'), (Color{130, 130, 130, 255}));
    EXPECT_EQ(colorFor('E'), (Color{220, 60, 60, 255}));
}

TEST(ColorTest, EveryKnownTileLooksDifferent) {
    std::string tiles = "#.*@XE";
    for (std::size_t i = 0; i < tiles.size(); i++) {
        for (std::size_t j = i + 1; j < tiles.size(); j++) {
            EXPECT_FALSE(colorFor(tiles[i]) == colorFor(tiles[j]));
        }
    }
}

TEST(ColorTest, UnknownTilesAreBrightMagenta) {
    EXPECT_EQ(colorFor('Z'), (Color{255, 0, 255, 255}));
    EXPECT_EQ(colorFor('?'), (Color{255, 0, 255, 255}));
}
