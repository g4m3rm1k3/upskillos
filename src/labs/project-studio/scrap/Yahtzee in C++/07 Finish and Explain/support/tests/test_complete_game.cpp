#include "minitest.h"
#include <sstream>
#include "../Game.h"
#include "../Input.h"
#include "../Ranking.h"

// Scope owns the replacement stream buffers and restores them before they die.
struct Console {
    std::istringstream input;
    std::ostringstream output;
    std::streambuf* oldIn;
    std::streambuf* oldOut;
    explicit Console(const std::string& text) : input(text),
        oldIn(std::cin.rdbuf(input.rdbuf())), oldOut(std::cout.rdbuf(output.rdbuf())) {}
    ~Console() {
        std::cin.rdbuf(oldIn); std::cout.rdbuf(oldOut); std::cin.clear();
    }
};

TEST(CompleteGame, TwoPlayersFinishAndReplayResetsTheirState) {
    std::string input;
    // Finish Yahtzee last, avoiding forced placements in this scripted match.
    const int order[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 12};
    for (int category : order) for (int player = 0; player < 2; ++player)
        input += std::to_string(category) + "\n";
    bool finished;
    std::string transcript;
    std::vector<Player> players;
    players.emplace_back("Ada"); players.emplace_back("Bo");
    Dice dice(5);
    TurnOptions options; options.animate = false; options.maxRolls = 1;
    { Console console(input); finished = playGame(dice, players, options); transcript = console.output.str(); }
    EXPECT_EQ(finished, true);
    EXPECT_EQ(players[0].scorecard().allScored(), true);
    EXPECT_EQ(players[1].scorecard().allScored(), true);
    EXPECT_EQ(transcript.find("Game over.") != std::string::npos, true);
    for (Player& player : players) player.startNewGame();
    EXPECT_EQ(players[0].name(), "Ada");
    EXPECT_EQ(players[0].finalScore(), 0);
    EXPECT_EQ(players[1].scorecard().allScored(), false);
}
TEST(CompleteGame, BonusAppearsInTotalAndResets) {
    Player player("Ada");
    const Counts sixes = countFaces({6, 6, 6, 6, 6});
    player.scorecard().record(CategoryId::Yahtzee, sixes);
    player.scorecard().record(CategoryId::Sixes, sixes);
    EXPECT_EQ(player.finalScore(), 180);
    player.startNewGame();
    EXPECT_EQ(player.scorecard().yahtzeeBonus(), 0);
    EXPECT_EQ(player.finalScore(), 0);
}
TEST(CompleteGame, EofDoesNotFillABoxOrSpin) {
    Dice dice(5); Scorecard card;
    TurnOptions options; options.animate = false;
    bool finished;
    { Console console(""); finished = playTurn(dice, card, options); }
    EXPECT_EQ(finished, false);
    EXPECT_EQ(card.total(), 0);
    EXPECT_EQ(card.isScored(CategoryId::Ones), false);
}
TEST(CompleteGame, InvalidInputAndTakenBoxReprompt) {
    Dice dice(5); Scorecard card;
    card.record(CategoryId::Ones, countFaces({1, 2, 3, 4, 5}));
    TurnOptions options; options.animate = false; options.maxRolls = 1;
    bool finished;
    std::string transcript;
    { Console console("word\n\n99\n1\n2\n");
      finished = playTurn(dice, card, options); transcript = console.output.str(); }
    EXPECT_EQ(finished, true);
    EXPECT_EQ(card.isScored(CategoryId::Twos), true);
    EXPECT_EQ(card.score(CategoryId::Ones), 1);
    EXPECT_EQ(transcript.find("taken or unavailable") != std::string::npos, true);
}
TEST(CompleteGame, ThreeRollLimitAndHeldDice) {
    Dice dice(5); Scorecard card;
    std::vector<int> before;
    for (std::size_t i = 0; i < dice.size(); ++i) before.push_back(dice.face(i));
    dice.rollFree(std::vector<bool>(5, true));
    for (std::size_t i = 0; i < dice.size(); ++i) EXPECT_EQ(dice.face(i), before[i]);
    TurnOptions options; options.animate = false;
    std::string transcript; bool finished;
    { Console console("0\na\n0\na\n0\n13\n");
      finished = playTurn(dice, card, options); transcript = console.output.str(); }
    EXPECT_EQ(finished, true);
    EXPECT_EQ(transcript.find("Roll 3 of 3") != std::string::npos, true);
    EXPECT_EQ(transcript.find("Roll 4") == std::string::npos, true);
    EXPECT_EQ(card.isScored(CategoryId::Chance), true);
}
TEST(CompleteGame, TiesAndEmptyRankingAreSafe) {
    std::vector<Player> players;
    EXPECT_EQ(winnersOf(players).empty(), true);
    players.emplace_back("Ada"); players.emplace_back("Bo");
    const auto winners = winnersOf(players);
    EXPECT_EQ(winners.size(), std::size_t(2));
    EXPECT_EQ(winners[0], &players[0]);
    EXPECT_EQ(winners[1], &players[1]);
    EXPECT_EQ(joinNames(winners), "Ada and Bo");
}
TEST(CompleteGame, ParsingFailurePreservesCallerAndReplayAnswer) {
    int value = 7; bool yes = true;
    EXPECT_EQ(parseInt("3abc", value), false);
    EXPECT_EQ(value, 7);
    EXPECT_EQ(parseYesNo("maybe", yes), false);
    EXPECT_EQ(yes, true);
    { Console console("maybe\nn\n"); EXPECT_EQ(askYesNo("Again?", yes), true); }
    EXPECT_EQ(yes, false);
}
