// Generated author-side answers; never supplied to learner files.
export const WALKTHROUGH = {
  "20-six-possible-futures#Explore six alternatives, not six consecutive rolls": {
    "wrong": []
  },
  "20-six-possible-futures#Type an exact outcome table": {
    "wrong": []
  },
  "20-six-possible-futures#Average the alternatives with equal weights": {
    "wrong": [
      {
        "name": "plausible incorrect edit",
        "files": {
          "explore/six_futures.cpp": "#include <iostream>\nint main() {\n    int pot = 5;\n    int total = 0;\n    for (int face = 1; face <= 6; ++face) {\n        int after = pot + face;\n        if (face == 1) after = 0;\n        total += after;\n        std::cout << \"face=\" << face << \" pot=\" << after << '\\n';\n    }\n    double average = total / 6;\n    std::cout << \"expected pot=\" << average << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "20-six-possible-futures#Try it — Change the quantity you are measuring": {
    "wrong": []
  },
  "20-six-possible-futures#Your turn — Count immediate winning faces": {
    "wrong": [
      {
        "name": "counts a one as a winning face",
        "files": {
          "practice/winning_faces.cpp": "#include <iostream>\nint winningFaces(int score, int pot) {\n    int winners = 0;\n    for (int face = 1; face <= 6; ++face) {\n        if (score + pot + face >= 12) ++winners;\n    }\n    return winners;\n}\nint main() {\n    int score = 0;\n    int pot = 0;\n    if (!(std::cin >> score >> pot)) return 1;\n    if (score < 0 || pot < 0 || score >= 12 || pot >= 12) return 1;\n    if (score + pot >= 12) return 1;\n    int winners = winningFaces(score, pot);\n    std::cout << \"winning=\" << winners << '\\n';\n    std::cout << \"chance=\" << winners / 6.0 << '\\n';\n    return 0;\n}"
        },
        "fails": [
          3
        ]
      },
      {
        "name": "misses an exact target",
        "files": {
          "practice/winning_faces.cpp": "#include <iostream>\nint winningFaces(int score, int pot) {\n    int winners = 0;\n    for (int face = 2; face <= 6; ++face) {\n        if (score + pot + face > 12) ++winners;\n    }\n    return winners;\n}\nint main() {\n    int score = 0;\n    int pot = 0;\n    if (!(std::cin >> score >> pot)) return 1;\n    if (score < 0 || pot < 0 || score >= 12 || pot >= 12) return 1;\n    if (score + pot >= 12) return 1;\n    int winners = winningFaces(score, pot);\n    std::cout << \"winning=\" << winners << '\\n';\n    std::cout << \"chance=\" << winners / 6.0 << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "integer probability division",
        "files": {
          "practice/winning_faces.cpp": "#include <iostream>\nint winningFaces(int score, int pot) {\n    int winners = 0;\n    for (int face = 2; face <= 6; ++face) {\n        if (score + pot + face >= 12) ++winners;\n    }\n    return winners;\n}\nint main() {\n    int score = 0;\n    int pot = 0;\n    if (!(std::cin >> score >> pot)) return 1;\n    if (score < 0 || pot < 0 || score >= 12 || pot >= 12) return 1;\n    if (score + pot >= 12) return 1;\n    int winners = winningFaces(score, pot);\n    std::cout << \"winning=\" << winners << '\\n';\n    std::cout << \"chance=\" << winners / 6 << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/winning_faces.cpp": "#include <iostream>\nint main() { std::cout << \"winning=4\\nchance=0.666667winning=0\\nchance=0winning=5\\nchance=0.833333\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/winning_faces.cpp": "#include <iostream>\nint winningFaces(int score, int pot) {\n    int winners = 0;\n    for (int face = 2; face <= 6; ++face) {\n        if (score + pot + face >= 12) ++winners;\n    }\n    return winners;\n}\nint main() {\n    int score = 0;\n    int pot = 0;\n    if (!(std::cin >> score >> pot)) return 1;\n    if (score < 0 || pot < 0 || score >= 12 || pot >= 12) return 1;\n    if (score + pot >= 12) return 1;\n    int winners = winningFaces(score, pot);\n    std::cout << \"winning=\" << winners << '\\n';\n    std::cout << \"chance=\" << winners / 6.0 << '\\n';\n    return 0;\n}"
    }
  },
  "21-reward-perspective#Name the learner and the world it acts in": {
    "wrong": [],
    "files": {
      "include/dice/Score.hpp": "#ifndef DICE_SCORE_HPP\n#define DICE_SCORE_HPP\nnamespace dice {\nclass Score {\nprivate:\n    int points_ = 0;\npublic:\n    int points() const;\n    bool bank(int amount);\n};\n}\n#endif",
      "src/dice/Score.cpp": "#include \"dice/Score.hpp\"\nint dice::Score::points() const {\n    return points_;\n}\nbool dice::Score::bank(int amount) {\n    if (amount < 1 || amount > 12 || points_ >= 12) return false;\n    points_ += amount;\n    return true;\n}",
      "apps/score_demo.cpp": "#include <iostream>\n#include \"dice/Score.hpp\"\nint main() {\n    dice::Score score;\n    score.bank(5);\n    std::cout << \"points=\" << score.points() << '\\n';\n    return 0;\n}",
      "tests/shared_score.cpp": "#include \"dice/Score.hpp\"\nint main() {\n    dice::Score first;\n    dice::Score second;\n    if (!first.bank(4) || !first.bank(5)) return 1;\n    if (first.points() != 9 || second.points() != 0) return 2;\n    if (first.bank(-1) || first.points() != 9) return 3;\n    if (!first.bank(3) || first.points() != 12) return 4;\n    if (first.bank(1) || first.points() != 12) return 5;\n    return 0;\n}",
      "apps/score_report.cpp": "#include <iostream>\n#include \"dice/Score.hpp\"\nint main() {\n    dice::Score score;\n    score.bank(4);\n    score.bank(5);\n    std::cout << \"points=\" << score.points() << '\\n';\n    return 0;\n}",
      "tests/score_boundaries.cpp": "#include \"dice/Score.hpp\"\nint main() {\n    dice::Score score;\n    if (score.bank(0) || score.points() != 0) return 1;\n    if (score.bank(13) || score.points() != 0) return 2;\n    if (!score.bank(11) || score.points() != 11) return 3;\n    if (!score.bank(12) || score.points() != 23) return 4;\n    if (score.bank(1) || score.points() != 23) return 5;\n    return 0;\n}",
      "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\nproject(DiceLab LANGUAGES CXX)\nadd_library(dice_rules STATIC src/dice/Score.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp)\ntarget_include_directories(dice_rules PUBLIC include)\ntarget_compile_features(dice_rules PUBLIC cxx_std_20)\nadd_executable(score_demo apps/score_demo.cpp)\ntarget_link_libraries(score_demo PRIVATE dice_rules)\nenable_testing()\nadd_executable(score_contract tests/shared_score.cpp)\ntarget_link_libraries(score_contract PRIVATE dice_rules)\nadd_test(NAME score_contract COMMAND score_contract)\nadd_executable(score_boundaries tests/score_boundaries.cpp)\ntarget_link_libraries(score_boundaries PRIVATE dice_rules)\nadd_test(NAME score_boundaries COMMAND score_boundaries)\nadd_executable(game_rules tests/game_rules.cpp)\ntarget_link_libraries(game_rules PRIVATE dice_rules)\nadd_test(NAME game_rules COMMAND game_rules)\nadd_executable(command_tests tests/commands.cpp)\ntarget_link_libraries(command_tests PRIVATE dice_rules)\nadd_test(NAME command_tests COMMAND command_tests)\nadd_executable(dice_tests tests/dice.cpp)\ntarget_link_libraries(dice_tests PRIVATE dice_rules)\nadd_test(NAME dice_tests COMMAND dice_tests)\nadd_executable(dice_terminal apps/dice_terminal.cpp)\ntarget_link_libraries(dice_terminal PRIVATE dice_rules)",
      "include/dice/Game.hpp": "#ifndef DICE_GAME_HPP\n#define DICE_GAME_HPP\n#include <array>\nnamespace dice {\nconstexpr int target = 12;\nenum class Action { Roll, Bank };\nstruct GameSnapshot {\n    std::array<int, 2> scores{0, 0};\n    int pot = 0;\n    int turn = 0;\n    int winner = -1;\n};\nclass Game {\nprivate:\n    GameSnapshot state_;\npublic:\n    GameSnapshot snapshot() const { return state_; }\n    bool finished() const;\n    bool legal(Action action) const;\n    bool apply(Action action, int face);\n};\n}\n#endif",
      "explore/game_probe.cpp": "#include <iostream>\n#include \"dice/Game.hpp\"\nint main() {\n    dice::Game game;\n    game.apply(dice::Action::Roll, 4);\n    game.apply(dice::Action::Bank, 0);\n    std::cout << \"after bank pot=\" << game.snapshot().pot << '\\n';\n    game.apply(dice::Action::Roll, 3);\n    game.apply(dice::Action::Roll, 1);\n    dice::GameSnapshot view = game.snapshot();\n    std::cout << \"scores=\" << view.scores.at(0) << \",\" << view.scores.at(1) << \" pot=\" << view.pot << \" turn=\" << view.turn << '\\n';\n    return 0;\n}",
      "src/dice/Game.cpp": "#include \"dice/Game.hpp\"\nbool dice::Game::finished() const { return state_.winner != -1; }\nbool dice::Game::legal(Action action) const {\n    return !finished() && (action == Action::Roll ||\n        (action == Action::Bank && state_.pot > 0));\n}\nbool dice::Game::apply(Action action, int face) {\n    if (!legal(action)) return false;\n    if (action == Action::Bank) {\n        state_.scores.at(state_.turn) += state_.pot;\n        state_.pot = 0;\n        state_.turn = 1 - state_.turn;\n        return true;\n    }\n    if (face < 1 || face > 6) return false;\n    if (face == 1) {\n        state_.pot = 0;\n        state_.turn = 1 - state_.turn;\n    } else {\n        state_.pot += face;\n        if (state_.scores.at(state_.turn) + state_.pot >= target)\n            state_.winner = state_.turn;\n    }\n    return true;\n}",
      "tests/game_rules.cpp": "#include <iostream>\n#include \"dice/Game.hpp\"\nint main() {\n    dice::Game game;\n    if (game.apply(dice::Action::Bank, 0)) return 1;\n    if (game.apply(dice::Action::Roll, 0) || game.apply(dice::Action::Roll, 7)) return 2;\n    if (game.snapshot().pot != 0 || game.snapshot().turn != 0) return 3;\n    if (!game.apply(dice::Action::Roll, 4) || !game.apply(dice::Action::Bank, 0)) return 4;\n    if (game.snapshot().scores.at(0) != 4 || game.snapshot().pot != 0 || game.snapshot().turn != 1) return 5;\n    game.apply(dice::Action::Roll, 3);\n    game.apply(dice::Action::Roll, 1);\n    if (game.snapshot().pot != 0 || game.snapshot().turn != 0 || game.snapshot().scores.at(0) != 4) return 6;\n    game.apply(dice::Action::Roll, 6);\n    game.apply(dice::Action::Roll, 3);\n    if (!game.finished() || game.snapshot().winner != 0) return 7;\n    if (game.apply(dice::Action::Bank, 0) || game.apply(dice::Action::Roll, 2) || game.snapshot().pot != 9) return 8;\n    dice::Game exact;\n    exact.apply(dice::Action::Roll, 1);\n    exact.apply(dice::Action::Roll, 6);\n    exact.apply(dice::Action::Roll, 6);\n    if (exact.snapshot().winner != 1 || exact.snapshot().turn != 1) return 9;\n    std::cout << \"rules passed\\n\";\n    return 0;\n}",
      "explore/command_probe.cpp": "#include <iostream>\n#include <string>\n#include \"dice/Command.hpp\"\nint main() {\n    std::string line;\n    if (!std::getline(std::cin, line)) {\n        std::cout << \"end of input\\n\";\n        return 0;\n    }\n    dice::Command command = dice::parseCommand(line);\n    if (command == dice::Command::Roll) std::cout << \"roll requested\\n\";\n    if (command == dice::Command::Bank) std::cout << \"bank requested\\n\";\n    if (command == dice::Command::Quit) std::cout << \"quit requested\\n\";\n    if (command == dice::Command::Invalid) std::cout << \"invalid command\\n\";\n    return 0;\n}",
      "include/dice/Command.hpp": "#ifndef DICE_COMMAND_HPP\n#define DICE_COMMAND_HPP\n#include <string>\nnamespace dice {\nenum class Command { Roll, Bank, Quit, Invalid };\nCommand parseCommand(const std::string& line);\n}\n#endif",
      "src/dice/Command.cpp": "#include \"dice/Command.hpp\"\ndice::Command dice::parseCommand(const std::string& line) {\n    if (line == \"roll\") return Command::Roll;\n    if (line == \"bank\") return Command::Bank;\n    if (line == \"quit\") return Command::Quit;\n    return Command::Invalid;\n}",
      "tests/commands.cpp": "#include <iostream>\n#include \"dice/Command.hpp\"\nint main() {\n    if (dice::parseCommand(\"roll\") != dice::Command::Roll) return 1;\n    if (dice::parseCommand(\"bank\") != dice::Command::Bank) return 2;\n    if (dice::parseCommand(\"quit\") != dice::Command::Quit) return 3;\n    if (dice::parseCommand(\"\") != dice::Command::Invalid) return 4;\n    if (dice::parseCommand(\"roll now\") != dice::Command::Invalid) return 5;\n    if (dice::parseCommand(\"Roll\") != dice::Command::Invalid) return 6;\n    if (dice::parseCommand(\" bank\") != dice::Command::Invalid) return 7;\n    if (dice::parseCommand(\"bank \") != dice::Command::Invalid) return 8;\n    if (dice::parseCommand(\"help\") != dice::Command::Invalid) return 9;\n    std::string original = \"quit\";\n    dice::parseCommand(original);\n    if (original != \"quit\") return 10;\n    std::cout << \"commands passed\\n\";\n    return 0;\n}",
      "explore/random_probe.cpp": "#include <iostream>\n#include \"dice/Die.hpp\"\nint main() {\n    dice::Die first(42);\n    dice::Die replay(42);\n    for (int i = 0; i < 12; ++i) {\n        int face = first.roll();\n        if (face != replay.roll()) return 1;\n        if (face < 1 || face > 6) return 2;\n    }\n    std::cout << \"replay matched\\n\";\n    return 0;\n}",
      "include/dice/Die.hpp": "#ifndef DICE_DIE_HPP\n#define DICE_DIE_HPP\n#include <random>\nnamespace dice {\nclass Die {\nprivate:\n    std::mt19937 engine_;\n    std::uniform_int_distribution<int> faces_{1, 6};\npublic:\n    explicit Die(unsigned int seed);\n    int roll();\n};\n}\n#endif",
      "src/dice/Die.cpp": "#include \"dice/Die.hpp\"\ndice::Die::Die(unsigned int seed) : engine_(seed) {}\nint dice::Die::roll() {\n    return faces_(engine_);\n}",
      "tests/dice.cpp": "#include <iostream>\n#include \"dice/Die.hpp\"\nint main() {\n    dice::Die first(91);\n    dice::Die replay(91);\n    int initial = first.roll();\n    if (initial < 1 || initial > 6 || initial != replay.roll()) return 1;\n    bool changed = false;\n    for (int i = 0; i < 1000; ++i) {\n        int face = first.roll();\n        if (face < 1 || face > 6) return 2;\n        if (face != replay.roll()) return 3;\n        if (face != initial) changed = true;\n    }\n    if (!changed) return 4;\n    std::cout << \"dice passed\\n\";\n    return 0;\n}",
      "apps/dice_terminal.cpp": "#include <iostream>\n#include <string>\n#include \"dice/Game.hpp\"\n#include \"dice/Command.hpp\"\n#include \"dice/Die.hpp\"\nvoid show(const dice::GameSnapshot& view) {\n    std::cout << \"scores=\" << view.scores.at(0) << \",\" << view.scores.at(1)\n              << \" pot=\" << view.pot << \" turn=\" << view.turn << '\\n';\n}\nbool perform(dice::Game& game, dice::Die& die, dice::Action action) {\n    if (!game.legal(action)) return false;\n    int face = 0;\n    if (action == dice::Action::Roll) {\n        face = die.roll();\n        std::cout << \"rolled=\" << face << '\\n';\n    }\n    return game.apply(action, face);\n}\ndice::Action opponentAction(const dice::GameSnapshot& view) {\n    if (view.pot >= 4) return dice::Action::Bank;\n    return dice::Action::Roll;\n}\nint main() {\n    dice::Game game;\n    dice::Die die(42);\n    std::cout << \"Dice Duel: you=0 opponent=1 target=12\\n\";\n    int rejected = 0;\n    std::string line;\n    while (!game.finished()) {\n        show(game.snapshot());\n        if (game.snapshot().turn == 1) {\n            dice::Action choice = opponentAction(game.snapshot());\n            std::cout << \"opponent acts\\n\";\n            if (!perform(game, die, choice)) return 2;\n            continue;\n        }\n        std::cout << \"roll / bank / quit>\\n\";\n        if (!std::getline(std::cin, line)) break;\n        dice::Command command = dice::parseCommand(line);\n        if (command == dice::Command::Quit) break;\n        if (command == dice::Command::Invalid) {\n            ++rejected;\n            std::cout << \"unknown command\\n\";\n            continue;\n        }\n        dice::Action action = dice::Action::Roll;\n        if (command == dice::Command::Bank) action = dice::Action::Bank;\n        if (!perform(game, die, action)) {\n            ++rejected;\n            std::cout << \"illegal action\\n\";\n        }\n    }\n    std::cout << \"rejected=\" << rejected << '\\n';\n    if (game.finished()) {\n        show(game.snapshot());\n        std::cout << \"winner=\" << game.snapshot().winner << '\\n';\n    } else {\n        std::cout << \"session ended\\n\";\n    }\n    return 0;\n}"
    }
  },
  "21-reward-perspective#Keep feedback separate from the game rules": {
    "wrong": []
  },
  "21-reward-perspective#Translate the recorded outcome": {
    "wrong": []
  },
  "21-reward-perspective#Observe two perspectives on the same outcome": {
    "wrong": [
      {
        "name": "rewards the winner regardless of agent perspective",
        "files": {
          "src/learning/Reward.cpp": "#include \"learning/Reward.hpp\"\n#include <stdexcept>\ndouble learning::terminalReward(const dice::GameSnapshot& view, int agentSeat) {\n    if (agentSeat < 0 || agentSeat > 1)\n        throw std::invalid_argument(\"agent seat must be zero or one\");\n    if (view.winner < -1 || view.winner > 1)\n        throw std::invalid_argument(\"invalid winner\");\n    if (view.winner == -1) return 0.0;\n    if (view.winner == agentSeat) return 1.0;\n    return 1.0;\n}\n"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "21-reward-perspective#Try it — Change points without changing the objective": {
    "wrong": []
  },
  "21-reward-perspective#Your turn — Test both perspectives": {
    "wrong": [
      {
        "name": "loss treated as success",
        "files": {
          "src/learning/Reward.cpp": "#include \"learning/Reward.hpp\"\n#include <stdexcept>\ndouble learning::terminalReward(const dice::GameSnapshot& view, int agentSeat) {\n    if (agentSeat < 0 || agentSeat > 1)\n        throw std::invalid_argument(\"agent seat must be zero or one\");\n    if (view.winner < -1 || view.winner > 1)\n        throw std::invalid_argument(\"invalid winner\");\n    if (view.winner == -1) return 0.0;\n    if (view.winner == agentSeat) return 1.0;\n    return 1.0;\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "unfinished result is rewarded",
        "files": {
          "src/learning/Reward.cpp": "#include \"learning/Reward.hpp\"\n#include <stdexcept>\ndouble learning::terminalReward(const dice::GameSnapshot& view, int agentSeat) {\n    if (agentSeat < 0 || agentSeat > 1)\n        throw std::invalid_argument(\"agent seat must be zero or one\");\n    if (view.winner < -1 || view.winner > 1)\n        throw std::invalid_argument(\"invalid winner\");\n    if (view.winner == -1) return 1.0;\n    if (view.winner == agentSeat) return 1.0;\n    return -1.0;\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "empty success test",
        "files": {
          "tests/rewards.cpp": "#include <iostream>\nint main(){ std::cout << \"rewards passed\\n\"; }"
        },
        "fails": [
          2
        ]
      }
    ],
    "files": {
      "tests/rewards.cpp": "#include <iostream>\n#include <stdexcept>\n#include \"learning/Reward.hpp\"\nint main() {\n    dice::GameSnapshot view;\n    for (int seat = 0; seat < 2; ++seat) {\n        view.winner = -1;\n        if (learning::terminalReward(view, seat) != 0.0) return 1;\n        view.winner = seat;\n        if (learning::terminalReward(view, seat) != 1.0) return 2;\n        view.winner = 1 - seat;\n        if (learning::terminalReward(view, seat) != -1.0) return 3;\n    }\n    bool rejected = false;\n    try { learning::terminalReward(view, 2); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 4;\n    view.winner = 2;\n    rejected = false;\n    try { learning::terminalReward(view, 0); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 5;\n    std::cout << \"rewards passed\\n\";\n    return 0;\n}"
    }
  },
  "21-reward-perspective#Add a library for the learning interpretation": {
    "wrong": []
  },
  "21b-decision-boundaries#Trace a decision across the opponent’s turn": {
    "wrong": []
  },
  "21b-decision-boundaries#Describe the result of one agent decision": {
    "wrong": []
  },
  "21b-decision-boundaries#Work on a copy and apply the agent request": {
    "wrong": []
  },
  "21b-decision-boundaries#Observe a retained turn and an unchanged input": {
    "wrong": []
  },
  "21b-decision-boundaries#Include the opponent’s response": {
    "wrong": []
  },
  "21b-decision-boundaries#Reject a script that stops in the wrong place": {
    "wrong": []
  },
  "21b-decision-boundaries#Follow banking through two opponent rolls": {
    "wrong": [
      {
        "name": "returns after agent bank without opponent response",
        "files": {
          "src/learning/Decision.cpp": "#include \"learning/Decision.hpp\"\n#include \"learning/Reward.hpp\"\n#include <stdexcept>\nlearning::DecisionResult learning::advance(const dice::Game& before, dice::Action action,\n    int face, const std::vector<int>& opponentFaces) {\n    if (before.finished() || before.snapshot().turn != 0)\n        throw std::invalid_argument(\"expected an unfinished agent turn\");\n    dice::Game next = before;\n    if (!next.apply(action, face))\n        throw std::invalid_argument(\"illegal agent request\");\n    return {next, terminalReward(next.snapshot(), 0), next.finished()};\n}\n"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "21b-decision-boundaries#Observe a loss caused by the response": {
    "wrong": [
      {
        "name": "rewards the winner instead of the agent",
        "files": {
          "src/learning/Reward.cpp": "#include \"learning/Reward.hpp\"\n#include <stdexcept>\ndouble learning::terminalReward(const dice::GameSnapshot& view, int agentSeat) {\n    if (agentSeat < 0 || agentSeat > 1)\n        throw std::invalid_argument(\"agent seat must be zero or one\");\n    if (view.winner < -1 || view.winner > 1)\n        throw std::invalid_argument(\"invalid winner\");\n    if (view.winner == -1) return 0.0;\n    if (view.winner == agentSeat) return 1.0;\n    return 1.0;\n}\n"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "21b-decision-boundaries#Try it — Distinguish a bust from missing data": {
    "wrong": []
  },
  "21b-decision-boundaries#Your turn — Test the complete decision boundary": {
    "wrong": [
      {
        "name": "stops before the opponent responds",
        "files": {
          "src/learning/Decision.cpp": "#include \"learning/Decision.hpp\"\n#include \"learning/Reward.hpp\"\n#include <stdexcept>\nlearning::DecisionResult learning::advance(const dice::Game& before, dice::Action action,\n    int face, const std::vector<int>& opponentFaces) {\n    if (before.finished() || before.snapshot().turn != 0)\n        throw std::invalid_argument(\"expected an unfinished agent turn\");\n    dice::Game next = before;\n    if (!next.apply(action, face))\n        throw std::invalid_argument(\"illegal agent request\");\n    return {next, terminalReward(next.snapshot(), 0), next.finished()};\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "accepts an unfinished opponent response",
        "files": {
          "src/learning/Decision.cpp": "#include \"learning/Decision.hpp\"\n#include \"learning/Reward.hpp\"\n#include <stdexcept>\nlearning::DecisionResult learning::advance(const dice::Game& before, dice::Action action,\n    int face, const std::vector<int>& opponentFaces) {\n    if (before.finished() || before.snapshot().turn != 0)\n        throw std::invalid_argument(\"expected an unfinished agent turn\");\n    dice::Game next = before;\n    if (!next.apply(action, face))\n        throw std::invalid_argument(\"illegal agent request\");\n    for (int reply : opponentFaces) {\n        if (next.finished() || next.snapshot().turn == 0) break;\n        if (!next.apply(dice::Action::Roll, reply))\n            throw std::invalid_argument(\"invalid opponent face\");\n        if (!next.finished() && next.snapshot().pot >= 4)\n            next.apply(dice::Action::Bank, 0);\n    }\n    return {next, terminalReward(next.snapshot(), 0), next.finished()};\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "mislabels agent loss",
        "files": {
          "src/learning/Reward.cpp": "#include \"learning/Reward.hpp\"\n#include <stdexcept>\ndouble learning::terminalReward(const dice::GameSnapshot& view, int agentSeat) {\n    if (agentSeat < 0 || agentSeat > 1)\n        throw std::invalid_argument(\"agent seat must be zero or one\");\n    if (view.winner < -1 || view.winner > 1)\n        throw std::invalid_argument(\"invalid winner\");\n    if (view.winner == -1) return 0.0;\n    if (view.winner == agentSeat) return 1.0;\n    return 1.0;\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "always-success test",
        "files": {
          "tests/decisions.cpp": "#include <iostream>\nint main(){ std::cout << \"decisions passed\\n\"; }"
        },
        "fails": [
          2
        ]
      }
    ],
    "files": {
      "tests/decisions.cpp": "#include <iostream>\n#include <stdexcept>\n#include \"learning/Decision.hpp\"\nint main() {\n    dice::Game initial;\n    learning::DecisionResult roll = learning::advance(initial, dice::Action::Roll, 4, {});\n    if (roll.done || roll.reward != 0.0 || roll.next.snapshot().pot != 4 || roll.next.snapshot().turn != 0) return 1;\n    if (initial.snapshot().pot != 0 || initial.snapshot().turn != 0) return 2;\n    learning::DecisionResult bank = learning::advance(roll.next, dice::Action::Bank, 0, {2, 2});\n    if (bank.done || bank.reward != 0.0 || bank.next.snapshot().turn != 0) return 3;\n    if (bank.next.snapshot().scores.at(0) != 4 || bank.next.snapshot().scores.at(1) != 4 || bank.next.snapshot().pot != 0) return 4;\n    learning::DecisionResult bust = learning::advance(roll.next, dice::Action::Bank, 0, {1, 7});\n    if (bust.next.snapshot().turn != 0 || bust.next.snapshot().scores.at(1) != 0) return 5;\n    learning::DecisionResult agentBust = learning::advance(roll.next, dice::Action::Roll, 1, {2, 2});\n    if (agentBust.done || agentBust.reward != 0.0 || agentBust.next.snapshot().turn != 0 || agentBust.next.snapshot().scores.at(0) != 0 || agentBust.next.snapshot().scores.at(1) != 4 || agentBust.next.snapshot().pot != 0) return 13;\n    learning::DecisionResult six = learning::advance(initial, dice::Action::Roll, 6, {});\n    learning::DecisionResult win = learning::advance(six.next, dice::Action::Roll, 6, {7});\n    if (!win.done || win.reward != 1.0 || win.next.snapshot().winner != 0) return 6;\n    dice::Game game;\n    for (int round = 0; round < 2; ++round) {\n        learning::DecisionResult gain = learning::advance(game, dice::Action::Roll, 4, {});\n        learning::DecisionResult pass = learning::advance(gain.next, dice::Action::Bank, 0, {4});\n        game = pass.next;\n    }\n    learning::DecisionResult two = learning::advance(game, dice::Action::Roll, 2, {});\n    learning::DecisionResult loss = learning::advance(two.next, dice::Action::Bank, 0, {4});\n    if (!loss.done || loss.reward != -1.0 || loss.next.snapshot().winner != 1) return 7;\n    bool rejected = false;\n    try { learning::advance(roll.next, dice::Action::Bank, 0, {2}); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected || roll.next.snapshot().pot != 4 || roll.next.snapshot().scores.at(0) != 0) return 8;\n    rejected = false;\n    try { learning::advance(roll.next, dice::Action::Bank, 0, {7}); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected || roll.next.snapshot().pot != 4) return 9;\n    rejected = false;\n    try { learning::advance(initial, dice::Action::Bank, 0, {}); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 10;\n    dice::Game opponentTurn;\n    opponentTurn.apply(dice::Action::Roll, 1);\n    rejected = false;\n    try { learning::advance(opponentTurn, dice::Action::Roll, 2, {}); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 11;\n    rejected = false;\n    try { learning::advance(win.next, dice::Action::Roll, 2, {}); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 12;\n    std::cout << \"decisions passed\\n\";\n    return 0;\n}"
    }
  },
  "21b-decision-boundaries#Keep environment behavior in the repeatable build": {
    "wrong": []
  },
  "22-observation-addresses#Choose what the agent observes": {
    "wrong": []
  },
  "22-observation-addresses#Name the three coordinates": {
    "wrong": []
  },
  "22-observation-addresses#Enforce the decision boundary before extracting values": {
    "wrong": []
  },
  "22-observation-addresses#Reach a real position through the game rules": {
    "wrong": []
  },
  "22-observation-addresses#Count slots before writing a formula": {
    "wrong": []
  },
  "22-observation-addresses#Declare checked addressing": {
    "wrong": []
  },
  "22-observation-addresses#Validate before computing an address": {
    "wrong": []
  },
  "22-observation-addresses#Observe the address of the real position": {
    "wrong": []
  },
  "22-observation-addresses#Observe failures without reading outside a container": {
    "wrong": []
  },
  "22-observation-addresses#Try it — Separate a boundary failure from a coordinate failure": {
    "wrong": []
  },
  "22-observation-addresses#Count complete groups and what remains": {
    "wrong": []
  },
  "22-observation-addresses#Undo a small two-coordinate address": {
    "wrong": []
  },
  "22-observation-addresses#Practice — Transfer the inverse to lockers": {
    "wrong": [
      {
        "name": "uses the guided width instead of the requirement",
        "files": {
          "practice/locker_address.cpp": "#include <iostream>\nint main() {\n    int address = 0;\n    if (!(std::cin >> address) || address < 0 || address >= 20) return 1;\n    std::cout << \"rack=\" << address / 3 << \" slot=\" << address % 3 << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "accepts first address outside the cabinet",
        "files": {
          "practice/locker_address.cpp": "#include <iostream>\nint main() {\n    int address = 0;\n    if (!(std::cin >> address) || address < 0 || address > 20) return 1;\n    std::cout << \"rack=\" << address / 5 << \" slot=\" << address % 5 << '\\n';\n    return 0;\n}"
        },
        "fails": [
          3
        ]
      }
    ],
    "files": {
      "practice/locker_address.cpp": "#include <iostream>\nint main() {\n    int address = 0;\n    if (!(std::cin >> address) || address < 0 || address >= 20) return 1;\n    std::cout << \"rack=\" << address / 5 << \" slot=\" << address % 5 << '\\n';\n    return 0;\n}"
    }
  },
  "22-observation-addresses#Trace a nested loop before checking every observation": {
    "wrong": [
      {
        "name": "addition collides across rows",
        "files": {
          "explore/round_trip.cpp": "#include <iostream>\nint main() {\n    int checked = 0;\n    for (int row = 0; row < 2; ++row) {\n        for (int column = 0; column < 3; ++column) {\n            int address = row + column;\n            if (address / 3 != row || address % 3 != column) return 1;\n            ++checked;\n        }\n    }\n    std::cout << \"checked=\" << checked << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "22-observation-addresses#Your turn — Recover coordinates and rule out collisions": {
    "wrong": [
      {
        "name": "swaps decoded players",
        "files": {
          "practice/decode_observation.cpp": "#include <iostream>\n#include \"learning/Observation.hpp\"\nint main() {\n    int address = 0;\n    if (!(std::cin >> address) || address < 0 || address >= 1728) return 1;\n    learning::Observation found{(address / 12) % 12, address / 144, address % 12};\n    if (found.own + found.pot >= 12) return 1;\n    if (learning::rowIndex(found) != address) return 2;\n    std::cout << \"own=\" << found.own << \" other=\" << found.other << \" pot=\" << found.pot << '\\n';\n    for (int own = 0; own < 12; ++own) {\n        for (int other = 0; other < 12; ++other) {\n            for (int pot = 0; pot < 12 - own; ++pot) {\n                int row = learning::rowIndex({own, other, pot});\n                if (row / 144 != own || (row / 12) % 12 != other || row % 12 != pot) return 3;\n            }\n        }\n    }\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "admits reserved winning rows",
        "files": {
          "practice/decode_observation.cpp": "#include <iostream>\n#include \"learning/Observation.hpp\"\nint main() {\n    int address = 0;\n    if (!(std::cin >> address) || address < 0 || address >= 1728) return 1;\n    learning::Observation found{address / 144, (address / 12) % 12, address % 12};\n\n\n    std::cout << \"own=\" << found.own << \" other=\" << found.other << \" pot=\" << found.pot << '\\n';\n    for (int own = 0; own < 12; ++own) {\n        for (int other = 0; other < 12; ++other) {\n            for (int pot = 0; pot < 12 - own; ++pot) {\n                int row = learning::rowIndex({own, other, pot});\n                if (row / 144 != own || (row / 12) % 12 != other || row % 12 != pot) return 3;\n            }\n        }\n    }\n    return 0;\n}"
        },
        "fails": [
          8
        ]
      },
      {
        "name": "colliding encoder caught by exhaustive inverse",
        "files": {
          "practice/decode_observation.cpp": "#include <iostream>\n#include \"learning/Observation.hpp\"\nint main() {\n    int address = 0;\n    if (!(std::cin >> address) || address < 0 || address >= 1728) return 1;\n    learning::Observation found{address / 144, (address / 12) % 12, address % 12};\n    if (found.own + found.pot >= 12) return 1;\n    if (learning::rowIndex(found) != address) return 2;\n    std::cout << \"own=\" << found.own << \" other=\" << found.other << \" pot=\" << found.pot << '\\n';\n    for (int own = 0; own < 12; ++own) {\n        for (int other = 0; other < 12; ++other) {\n            for (int pot = 0; pot < 12 - own; ++pot) {\n                int row = learning::rowIndex({own, other, pot});\n                if (row / 144 != own || (row / 12) % 12 != other || row % 12 != pot) return 3;\n            }\n        }\n    }\n    return 0;\n}",
          "src/learning/Observation.cpp": "#include \"learning/Observation.hpp\"\n#include <stdexcept>\nlearning::Observation learning::observe(const dice::Game& game) {\n    dice::GameSnapshot view = game.snapshot();\n    if (game.finished() || view.turn != 0)\n        throw std::invalid_argument(\"expected an unfinished seat-zero decision\");\n    return {view.scores.at(0), view.scores.at(1), view.pot};\n}\nint learning::rowIndex(const Observation& seen) {\n    if (seen.own < 0 || seen.own >= dice::target ||\n        seen.other < 0 || seen.other >= dice::target ||\n        seen.pot < 0 || seen.pot >= dice::target ||\n        seen.own + seen.pot >= dice::target)\n        throw std::invalid_argument(\"invalid decision observation\");\n    return (seen.own * dice::target + 0) * dice::target + seen.pot;\n}\n"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "prints all examples",
        "files": {
          "practice/decode_observation.cpp": "#include <iostream>\nint main() { std::cout << \"own=2 other=3 pot=4\\nown=0 other=0 pot=0\\n\"; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/decode_observation.cpp": "#include <iostream>\n#include \"learning/Observation.hpp\"\nint main() {\n    int address = 0;\n    if (!(std::cin >> address) || address < 0 || address >= 1728) return 1;\n    learning::Observation found{address / 144, (address / 12) % 12, address % 12};\n    if (found.own + found.pot >= 12) return 1;\n    if (learning::rowIndex(found) != address) return 2;\n    std::cout << \"own=\" << found.own << \" other=\" << found.other << \" pot=\" << found.pot << '\\n';\n    for (int own = 0; own < 12; ++own) {\n        for (int other = 0; other < 12; ++other) {\n            for (int pot = 0; pot < 12 - own; ++pot) {\n                int row = learning::rowIndex({own, other, pot});\n                if (row / 144 != own || (row / 12) % 12 != other || row % 12 != pot) return 3;\n            }\n        }\n    }\n    return 0;\n}"
    }
  },
  "22b-action-value-storage#Give the two numbers a meaning": {
    "wrong": []
  },
  "22b-action-value-storage#Name a concrete row type and copy it": {
    "wrong": []
  },
  "22b-action-value-storage#Use a reference when the stored row must change": {
    "wrong": []
  },
  "22b-action-value-storage#Measure a search before choosing storage": {
    "wrong": []
  },
  "22b-action-value-storage#Compare an address lookup with a scan": {
    "wrong": []
  },
  "22b-action-value-storage#Defend a representation and its boundary": {
    "wrong": []
  },
  "22b-action-value-storage#Build three rows before building the game table": {
    "wrong": []
  },
  "22b-action-value-storage#Translate actions independently of table storage": {
    "wrong": []
  },
  "22b-action-value-storage#Keep a representation helper inside its source file": {
    "wrong": []
  },
  "22b-action-value-storage#Give the table one owner": {
    "wrong": []
  },
  "22b-action-value-storage#Initialize all rows and read one checked cell": {
    "wrong": []
  },
  "22b-action-value-storage#Combine the already-tested row and column selections": {
    "wrong": []
  },
  "22b-action-value-storage#Observe initial estimates": {
    "wrong": []
  },
  "22b-action-value-storage#Declare a deliberate storage operation": {
    "wrong": []
  },
  "22b-action-value-storage#Write the actual row instead of a temporary copy": {
    "wrong": []
  },
  "22b-action-value-storage#Observe separate actions and a preserved neighbor": {
    "wrong": []
  },
  "22b-action-value-storage#Ask for the best legal estimate": {
    "wrong": []
  },
  "22b-action-value-storage#Start from a legal candidate, even if it is negative": {
    "wrong": []
  },
  "22b-action-value-storage#Make an illegal cell tempting on purpose": {
    "wrong": []
  },
  "22b-action-value-storage#Try it — Find the copied-row and invented-zero bugs": {
    "wrong": []
  },
  "22b-action-value-storage#Your turn — Audit storage through its public interface": {
    "wrong": [
      {
        "name": "updates a copy of the row",
        "files": {
          "tests/q_storage.cpp": "#include <iostream>\n#include <stdexcept>\n#include \"learning/QAgent.hpp\"\nint main() {\n    learning::QAgent agent;\n    for (int own = 0; own < 12; ++own)\n        for (int other = 0; other < 12; ++other)\n            for (int pot = 0; pot < 12 - own; ++pot)\n                for (dice::Action action : {dice::Action::Roll, dice::Action::Bank})\n                    if (agent.value({own, other, pot}, action) != 0.0) return 1;\n    learning::Observation first{3, 5, 2};\n    agent.store(first, dice::Action::Roll, -0.5);\n    agent.store(first, dice::Action::Bank, 0.25);\n    if (agent.value(first, dice::Action::Roll) != -0.5 || agent.value(first, dice::Action::Bank) != 0.25) return 2;\n    if (agent.value({3, 5, 3}, dice::Action::Roll) != 0.0 || agent.value({3, 6, 2}, dice::Action::Bank) != 0.0) return 3;\n    learning::QAgent copy = agent;\n    copy.store(first, dice::Action::Roll, 0.75);\n    if (agent.value(first, dice::Action::Roll) != -0.5) return 4;\n    dice::Game game;\n    agent.store({0, 0, 0}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 0}, dice::Action::Bank, 0.75);\n    if (agent.bestValue(game) != -0.5) return 5;\n    game.apply(dice::Action::Roll, 2);\n    agent.store({0, 0, 2}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 2}, dice::Action::Bank, -0.25);\n    if (agent.bestValue(game) != -0.25) return 6;\n    agent.store({0, 0, 2}, dice::Action::Roll, 0.5);\n    if (agent.bestValue(game) != 0.5) return 7;\n    bool rejected = false;\n    try { agent.store({12, 0, 0}, dice::Action::Roll, 0.25); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected || agent.value(first, dice::Action::Roll) != -0.5) return 8;\n    game.apply(dice::Action::Bank, 0);\n    rejected = false;\n    try { agent.bestValue(game); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 9;\n    dice::Game won;\n    won.apply(dice::Action::Roll, 6);\n    won.apply(dice::Action::Roll, 6);\n    rejected = false;\n    try { agent.bestValue(won); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 10;\n    std::cout << \"storage passed\\n\";\n    return 0;\n}",
          "src/learning/QAgent.cpp": "#include \"learning/QAgent.hpp\"\n#include <stdexcept>\nnamespace {\nint column(dice::Action action) {\n    if (action == dice::Action::Roll) return 0;\n    if (action == dice::Action::Bank) return 1;\n    throw std::invalid_argument(\"unknown action\");\n}\n}\nlearning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}\ndouble learning::QAgent::value(const Observation& seen, dice::Action action) const {\n    return rows_.at(rowIndex(seen)).at(column(action));\n}\nvoid learning::QAgent::store(const Observation& seen, dice::Action action, double estimate) {\n    QRow row = rows_.at(rowIndex(seen));\n    row.at(column(action)) = estimate;\n}\ndouble learning::QAgent::bestValue(const dice::Game& game) const {\n    Observation seen = observe(game);\n    double best = value(seen, dice::Action::Roll);\n    if (game.legal(dice::Action::Bank)) {\n        double bank = value(seen, dice::Action::Bank);\n        if (bank > best) best = bank;\n    }\n    return best;\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "maximum includes illegal Bank",
        "files": {
          "tests/q_storage.cpp": "#include <iostream>\n#include <stdexcept>\n#include \"learning/QAgent.hpp\"\nint main() {\n    learning::QAgent agent;\n    for (int own = 0; own < 12; ++own)\n        for (int other = 0; other < 12; ++other)\n            for (int pot = 0; pot < 12 - own; ++pot)\n                for (dice::Action action : {dice::Action::Roll, dice::Action::Bank})\n                    if (agent.value({own, other, pot}, action) != 0.0) return 1;\n    learning::Observation first{3, 5, 2};\n    agent.store(first, dice::Action::Roll, -0.5);\n    agent.store(first, dice::Action::Bank, 0.25);\n    if (agent.value(first, dice::Action::Roll) != -0.5 || agent.value(first, dice::Action::Bank) != 0.25) return 2;\n    if (agent.value({3, 5, 3}, dice::Action::Roll) != 0.0 || agent.value({3, 6, 2}, dice::Action::Bank) != 0.0) return 3;\n    learning::QAgent copy = agent;\n    copy.store(first, dice::Action::Roll, 0.75);\n    if (agent.value(first, dice::Action::Roll) != -0.5) return 4;\n    dice::Game game;\n    agent.store({0, 0, 0}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 0}, dice::Action::Bank, 0.75);\n    if (agent.bestValue(game) != -0.5) return 5;\n    game.apply(dice::Action::Roll, 2);\n    agent.store({0, 0, 2}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 2}, dice::Action::Bank, -0.25);\n    if (agent.bestValue(game) != -0.25) return 6;\n    agent.store({0, 0, 2}, dice::Action::Roll, 0.5);\n    if (agent.bestValue(game) != 0.5) return 7;\n    bool rejected = false;\n    try { agent.store({12, 0, 0}, dice::Action::Roll, 0.25); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected || agent.value(first, dice::Action::Roll) != -0.5) return 8;\n    game.apply(dice::Action::Bank, 0);\n    rejected = false;\n    try { agent.bestValue(game); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 9;\n    dice::Game won;\n    won.apply(dice::Action::Roll, 6);\n    won.apply(dice::Action::Roll, 6);\n    rejected = false;\n    try { agent.bestValue(won); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 10;\n    std::cout << \"storage passed\\n\";\n    return 0;\n}",
          "src/learning/QAgent.cpp": "#include \"learning/QAgent.hpp\"\n#include <stdexcept>\nnamespace {\nint column(dice::Action action) {\n    if (action == dice::Action::Roll) return 0;\n    if (action == dice::Action::Bank) return 1;\n    throw std::invalid_argument(\"unknown action\");\n}\n}\nlearning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}\ndouble learning::QAgent::value(const Observation& seen, dice::Action action) const {\n    return rows_.at(rowIndex(seen)).at(column(action));\n}\nvoid learning::QAgent::store(const Observation& seen, dice::Action action, double estimate) {\n    QRow& row = rows_.at(rowIndex(seen));\n    row.at(column(action)) = estimate;\n}\ndouble learning::QAgent::bestValue(const dice::Game& game) const {\n    Observation seen = observe(game);\n    double best = value(seen, dice::Action::Roll);\n    if (true) {\n        double bank = value(seen, dice::Action::Bank);\n        if (bank > best) best = bank;\n    }\n    return best;\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "maximum invents zero",
        "files": {
          "tests/q_storage.cpp": "#include <iostream>\n#include <stdexcept>\n#include \"learning/QAgent.hpp\"\nint main() {\n    learning::QAgent agent;\n    for (int own = 0; own < 12; ++own)\n        for (int other = 0; other < 12; ++other)\n            for (int pot = 0; pot < 12 - own; ++pot)\n                for (dice::Action action : {dice::Action::Roll, dice::Action::Bank})\n                    if (agent.value({own, other, pot}, action) != 0.0) return 1;\n    learning::Observation first{3, 5, 2};\n    agent.store(first, dice::Action::Roll, -0.5);\n    agent.store(first, dice::Action::Bank, 0.25);\n    if (agent.value(first, dice::Action::Roll) != -0.5 || agent.value(first, dice::Action::Bank) != 0.25) return 2;\n    if (agent.value({3, 5, 3}, dice::Action::Roll) != 0.0 || agent.value({3, 6, 2}, dice::Action::Bank) != 0.0) return 3;\n    learning::QAgent copy = agent;\n    copy.store(first, dice::Action::Roll, 0.75);\n    if (agent.value(first, dice::Action::Roll) != -0.5) return 4;\n    dice::Game game;\n    agent.store({0, 0, 0}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 0}, dice::Action::Bank, 0.75);\n    if (agent.bestValue(game) != -0.5) return 5;\n    game.apply(dice::Action::Roll, 2);\n    agent.store({0, 0, 2}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 2}, dice::Action::Bank, -0.25);\n    if (agent.bestValue(game) != -0.25) return 6;\n    agent.store({0, 0, 2}, dice::Action::Roll, 0.5);\n    if (agent.bestValue(game) != 0.5) return 7;\n    bool rejected = false;\n    try { agent.store({12, 0, 0}, dice::Action::Roll, 0.25); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected || agent.value(first, dice::Action::Roll) != -0.5) return 8;\n    game.apply(dice::Action::Bank, 0);\n    rejected = false;\n    try { agent.bestValue(game); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 9;\n    dice::Game won;\n    won.apply(dice::Action::Roll, 6);\n    won.apply(dice::Action::Roll, 6);\n    rejected = false;\n    try { agent.bestValue(won); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 10;\n    std::cout << \"storage passed\\n\";\n    return 0;\n}",
          "src/learning/QAgent.cpp": "#include \"learning/QAgent.hpp\"\n#include <stdexcept>\nnamespace {\nint column(dice::Action action) {\n    if (action == dice::Action::Roll) return 0;\n    if (action == dice::Action::Bank) return 1;\n    throw std::invalid_argument(\"unknown action\");\n}\n}\nlearning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}\ndouble learning::QAgent::value(const Observation& seen, dice::Action action) const {\n    return rows_.at(rowIndex(seen)).at(column(action));\n}\nvoid learning::QAgent::store(const Observation& seen, dice::Action action, double estimate) {\n    QRow& row = rows_.at(rowIndex(seen));\n    row.at(column(action)) = estimate;\n}\ndouble learning::QAgent::bestValue(const dice::Game& game) const {\n    Observation seen = observe(game);\n    double best = 0.0;\n    if (game.legal(dice::Action::Bank)) {\n        double bank = value(seen, dice::Action::Bank);\n        if (bank > best) best = bank;\n    }\n    return best;\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "always-success test",
        "files": {
          "tests/q_storage.cpp": "#include <iostream>\nint main() { std::cout << \"storage passed\\n\"; }"
        },
        "fails": [
          2
        ]
      }
    ],
    "files": {
      "tests/q_storage.cpp": "#include <iostream>\n#include <stdexcept>\n#include \"learning/QAgent.hpp\"\nint main() {\n    learning::QAgent agent;\n    for (int own = 0; own < 12; ++own)\n        for (int other = 0; other < 12; ++other)\n            for (int pot = 0; pot < 12 - own; ++pot)\n                for (dice::Action action : {dice::Action::Roll, dice::Action::Bank})\n                    if (agent.value({own, other, pot}, action) != 0.0) return 1;\n    learning::Observation first{3, 5, 2};\n    agent.store(first, dice::Action::Roll, -0.5);\n    agent.store(first, dice::Action::Bank, 0.25);\n    if (agent.value(first, dice::Action::Roll) != -0.5 || agent.value(first, dice::Action::Bank) != 0.25) return 2;\n    if (agent.value({3, 5, 3}, dice::Action::Roll) != 0.0 || agent.value({3, 6, 2}, dice::Action::Bank) != 0.0) return 3;\n    learning::QAgent copy = agent;\n    copy.store(first, dice::Action::Roll, 0.75);\n    if (agent.value(first, dice::Action::Roll) != -0.5) return 4;\n    dice::Game game;\n    agent.store({0, 0, 0}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 0}, dice::Action::Bank, 0.75);\n    if (agent.bestValue(game) != -0.5) return 5;\n    game.apply(dice::Action::Roll, 2);\n    agent.store({0, 0, 2}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 2}, dice::Action::Bank, -0.25);\n    if (agent.bestValue(game) != -0.25) return 6;\n    agent.store({0, 0, 2}, dice::Action::Roll, 0.5);\n    if (agent.bestValue(game) != 0.5) return 7;\n    bool rejected = false;\n    try { agent.store({12, 0, 0}, dice::Action::Roll, 0.25); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected || agent.value(first, dice::Action::Roll) != -0.5) return 8;\n    game.apply(dice::Action::Bank, 0);\n    rejected = false;\n    try { agent.bestValue(game); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 9;\n    dice::Game won;\n    won.apply(dice::Action::Roll, 6);\n    won.apply(dice::Action::Roll, 6);\n    rejected = false;\n    try { agent.bestValue(won); }\n    catch (const std::invalid_argument&) { rejected = true; }\n    if (!rejected) return 10;\n    std::cout << \"storage passed\\n\";\n    return 0;\n}"
    }
  },
  "22b-action-value-storage#Build the storage milestone with the existing project": {
    "wrong": []
  },
  "22c-deliver-a-small-change#Turn a request into observable acceptance criteria": {
    "wrong": []
  },
  "22c-deliver-a-small-change#Plan one small delivery and choose a design": {
    "wrong": []
  },
  "22c-deliver-a-small-change#Your turn — Implement the agreed behavior": {
    "wrong": [
      {
        "name": "returns the last free locker",
        "files": {
          "practice/locker_choice.cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 1 || count > 20) return 1;\n    std::vector<int> occupied;\n    for (int i = 0; i < count; ++i) {\n        int value = 0;\n        if (!(std::cin >> value) || (value != 0 && value != 1)) return 1;\n        occupied.push_back(value);\n    }\n    int chosen = -1;\n    for (int i = 0; i < count; ++i) {\n        if (occupied.at(i) == 0) { chosen = i; }\n    }\n    std::cout << \"locker=\" << chosen << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "reports zero when all lockers are full",
        "files": {
          "practice/locker_choice.cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 1 || count > 20) return 1;\n    std::vector<int> occupied;\n    for (int i = 0; i < count; ++i) {\n        int value = 0;\n        if (!(std::cin >> value) || (value != 0 && value != 1)) return 1;\n        occupied.push_back(value);\n    }\n    int chosen = 0;\n    for (int i = 0; i < count; ++i) {\n        if (occupied.at(i) == 0) { chosen = i; break; }\n    }\n    std::cout << \"locker=\" << chosen << '\\n';\n    return 0;\n}"
        },
        "fails": [
          3
        ]
      },
      {
        "name": "ignores invalid occupancy",
        "files": {
          "practice/locker_choice.cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 1 || count > 20) return 1;\n    std::vector<int> occupied;\n    for (int i = 0; i < count; ++i) {\n        int value = 0;\n        if (!(std::cin >> value)) return 1;\n        occupied.push_back(value);\n    }\n    int chosen = -1;\n    for (int i = 0; i < count; ++i) {\n        if (occupied.at(i) == 0) { chosen = i; break; }\n    }\n    std::cout << \"locker=\" << chosen << '\\n';\n    return 0;\n}"
        },
        "fails": [
          7
        ]
      }
    ],
    "files": {
      "practice/locker_choice.cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 1 || count > 20) return 1;\n    std::vector<int> occupied;\n    for (int i = 0; i < count; ++i) {\n        int value = 0;\n        if (!(std::cin >> value) || (value != 0 && value != 1)) return 1;\n        occupied.push_back(value);\n    }\n    int chosen = -1;\n    for (int i = 0; i < count; ++i) {\n        if (occupied.at(i) == 0) { chosen = i; break; }\n    }\n    std::cout << \"locker=\" << chosen << '\\n';\n    return 0;\n}"
    }
  },
  "22c-deliver-a-small-change#Try it — Respond to feedback without losing old behavior": {
    "wrong": [
      {
        "name": "ignores feedback and always returns lowest",
        "files": {
          "practice/locker_choice.cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 1 || count > 20) return 1;\n    std::vector<int> occupied;\n    for (int i = 0; i < count; ++i) {\n        int value = 0;\n        if (!(std::cin >> value) || (value != 0 && value != 1)) return 1;\n        occupied.push_back(value);\n    }\n    int chosen = -1;\n    for (int i = 0; i < count; ++i) {\n        if (occupied.at(i) == 0) { chosen = i; break; }\n    }\n    std::cout << \"locker=\" << chosen << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "selects an occupied preference",
        "files": {
          "practice/locker_choice.cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 1 || count > 20) return 1;\n    std::vector<int> occupied;\n    for (int i = 0; i < count; ++i) {\n        int value = 0;\n        if (!(std::cin >> value) || (value != 0 && value != 1)) return 1;\n        occupied.push_back(value);\n    }\n    int preferred = 0;\n    if (!(std::cin >> preferred) || preferred < 0 || preferred >= count) return 1;\n    int chosen = -1;\n    for (int i = 0; i < count; ++i) {\n        if (occupied.at(i) == 0) { chosen = i; break; }\n    }\n    chosen = preferred;\n    std::cout << \"locker=\" << chosen << '\\n';\n    return 0;\n}"
        },
        "fails": [
          2
        ]
      }
    ],
    "files": {
      "practice/locker_choice.cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 1 || count > 20) return 1;\n    std::vector<int> occupied;\n    for (int i = 0; i < count; ++i) {\n        int value = 0;\n        if (!(std::cin >> value) || (value != 0 && value != 1)) return 1;\n        occupied.push_back(value);\n    }\n    int preferred = 0;\n    if (!(std::cin >> preferred) || preferred < 0 || preferred >= count) return 1;\n    int chosen = -1;\n    for (int i = 0; i < count; ++i) {\n        if (occupied.at(i) == 0) { chosen = i; break; }\n    }\n    if (occupied.at(preferred) == 0) chosen = preferred;\n    std::cout << \"locker=\" << chosen << '\\n';\n    return 0;\n}"
    }
  },
  "22c-deliver-a-small-change#Set up a disposable Git recovery exercise": {
    "wrong": []
  },
  "22c-deliver-a-small-change#Inspect what is selected for the next snapshot": {
    "wrong": []
  },
  "22c-deliver-a-small-change#Compare an unstaged edit with the staged checkpoint": {
    "wrong": []
  },
  "22c-deliver-a-small-change#Recover only the deliberate unstaged mistake": {
    "wrong": []
  },
  "22c-deliver-a-small-change#Review the delivery and choose the next improvement": {
    "wrong": []
  }
};
