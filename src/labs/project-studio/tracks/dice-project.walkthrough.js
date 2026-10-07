// Generated author-side answers; never supplied to learner files.
export const WALKTHROUGH = {
  "16-two-executables#Resume the working project": {
    "wrong": [],
    "files": {
      "include/dice/Score.hpp": "#ifndef DICE_SCORE_HPP\n#define DICE_SCORE_HPP\nnamespace dice {\nclass Score {\nprivate:\n    int points_ = 0;\npublic:\n    int points() const;\n    bool bank(int amount);\n};\n}\n#endif",
      "src/dice/Score.cpp": "#include \"dice/Score.hpp\"\nint dice::Score::points() const {\n    return points_;\n}\nbool dice::Score::bank(int amount) {\n    if (amount < 1 || amount > 12 || points_ >= 12) return false;\n    points_ += amount;\n    return true;\n}",
      "apps/score_demo.cpp": "#include <iostream>\n#include \"dice/Score.hpp\"\nint main() {\n    dice::Score score;\n    score.bank(5);\n    std::cout << \"points=\" << score.points() << '\\n';\n    return 0;\n}",
      "tests/shared_score.cpp": "#include \"dice/Score.hpp\"\nint main() {\n    dice::Score first;\n    dice::Score second;\n    if (!first.bank(4) || !first.bank(5)) return 1;\n    if (first.points() != 9 || second.points() != 0) return 2;\n    if (first.bank(-1) || first.points() != 9) return 3;\n    if (!first.bank(3) || first.points() != 12) return 4;\n    if (first.bank(1) || first.points() != 12) return 5;\n    return 0;\n}"
    }
  },
  "16-two-executables#A caller chooses inputs, not the banking formula": {
    "wrong": [
      {
        "name": "caller duplicates the wrong rule",
        "files": {
          "apps/score_report.cpp": "#include <iostream>\n#include \"dice/Score.hpp\"\nint main() {\n    dice::Score score;\n    score.bank(4);\n    \n    std::cout << \"points=\" << score.points() << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "16-two-executables#Try it — Diagnose the phase that failed": {
    "wrong": []
  },
  "16-two-executables#Your turn — Test overshoot and preservation": {
    "wrong": [
      {
        "name": "empty test",
        "files": {
          "tests/score_boundaries.cpp": "int main() { return 0; }"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "forbids valid overshoot",
        "files": {
          "tests/score_boundaries.cpp": "#include \"dice/Score.hpp\"\nint main() {\n    dice::Score score;\n    if (score.bank(0) || score.points() != 0) return 1;\n    if (score.bank(13) || score.points() != 0) return 2;\n    if (!score.bank(11) || score.points() != 11) return 3;\n    if (!score.bank(12) || score.points() != 23) return 4;\n    if (score.bank(1) || score.points() != 23) return 5;\n    return 0;\n}",
          "src/dice/Score.cpp": "#include \"dice/Score.hpp\"\nint dice::Score::points() const {\n    return points_;\n}\nbool dice::Score::bank(int amount) {\n    if (amount < 1 || amount > 12 || points_ + amount > 12) return false;\n    points_ += amount;\n    return true;\n}"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "tests/score_boundaries.cpp": "#include \"dice/Score.hpp\"\nint main() {\n    dice::Score score;\n    if (score.bank(0) || score.points() != 0) return 1;\n    if (score.bank(13) || score.points() != 0) return 2;\n    if (!score.bank(11) || score.points() != 11) return 3;\n    if (!score.bank(12) || score.points() != 23) return 4;\n    if (score.bank(1) || score.points() != 23) return 5;\n    return 0;\n}"
    }
  },
  "16-two-executables#Record a local milestone after reviewing it": {
    "wrong": []
  },
  "17-build-dependencies#Check the build tools": {
    "wrong": []
  },
  "17-build-dependencies#Name the project and configure a build directory": {
    "wrong": []
  },
  "17-build-dependencies#Describe a shared library and its requirements": {
    "wrong": []
  },
  "17-build-dependencies#Connect the executable to its dependency": {
    "wrong": []
  },
  "17-build-dependencies#Register a test with the runner": {
    "wrong": []
  },
  "17-build-dependencies#Try it — Remove a dependency requirement": {
    "wrong": []
  },
  "17-build-dependencies#Your turn — Add and run the second test": {
    "wrong": [
      {
        "name": "builds but never registers the new test",
        "files": {
          "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\nproject(DiceLab LANGUAGES CXX)\nadd_library(dice_rules STATIC src/dice/Score.cpp)\ntarget_include_directories(dice_rules PUBLIC include)\ntarget_compile_features(dice_rules PUBLIC cxx_std_20)\nadd_executable(score_demo apps/score_demo.cpp)\ntarget_link_libraries(score_demo PRIVATE dice_rules)\nenable_testing()\nadd_executable(score_contract tests/shared_score.cpp)\ntarget_link_libraries(score_contract PRIVATE dice_rules)\nadd_test(NAME score_contract COMMAND score_contract)\nadd_executable(score_boundaries tests/score_boundaries.cpp)\ntarget_link_libraries(score_boundaries PRIVATE dice_rules)\n"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "does not link shared rules",
        "files": {
          "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\nproject(DiceLab LANGUAGES CXX)\nadd_library(dice_rules STATIC src/dice/Score.cpp)\ntarget_include_directories(dice_rules PUBLIC include)\ntarget_compile_features(dice_rules PUBLIC cxx_std_20)\nadd_executable(score_demo apps/score_demo.cpp)\ntarget_link_libraries(score_demo PRIVATE dice_rules)\nenable_testing()\nadd_executable(score_contract tests/shared_score.cpp)\ntarget_link_libraries(score_contract PRIVATE dice_rules)\nadd_test(NAME score_contract COMMAND score_contract)\nadd_executable(score_boundaries tests/score_boundaries.cpp)\nadd_test(NAME score_boundaries COMMAND score_boundaries)\n"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\nproject(DiceLab LANGUAGES CXX)\nadd_library(dice_rules STATIC src/dice/Score.cpp)\ntarget_include_directories(dice_rules PUBLIC include)\ntarget_compile_features(dice_rules PUBLIC cxx_std_20)\nadd_executable(score_demo apps/score_demo.cpp)\ntarget_link_libraries(score_demo PRIVATE dice_rules)\nenable_testing()\nadd_executable(score_contract tests/shared_score.cpp)\ntarget_link_libraries(score_contract PRIVATE dice_rules)\nadd_test(NAME score_contract COMMAND score_contract)\nadd_executable(score_boundaries tests/score_boundaries.cpp)\ntarget_link_libraries(score_boundaries PRIVATE dice_rules)\nadd_test(NAME score_boundaries COMMAND score_boundaries)\n"
    }
  },
  "18-deterministic-game#Describe one position": {
    "wrong": []
  },
  "18-deterministic-game#Observe the starting state": {
    "wrong": []
  },
  "18-deterministic-game#Give one object authority over changes": {
    "wrong": []
  },
  "18-deterministic-game#Inspect through the public interface": {
    "wrong": []
  },
  "18-deterministic-game#Answer legality before changing anything": {
    "wrong": []
  },
  "18-deterministic-game#Observe the legal choices at the start": {
    "wrong": []
  },
  "18-deterministic-game#Implement a roll as a state transition": {
    "wrong": []
  },
  "18-deterministic-game#Reach the target exactly": {
    "wrong": [
      {
        "name": "requires overshoot instead of equality",
        "files": {
          "src/dice/Game.cpp": "#include \"dice/Game.hpp\"\nbool dice::Game::finished() const { return state_.winner != -1; }\nbool dice::Game::legal(Action action) const {\n    return !finished() && (action == Action::Roll ||\n        (action == Action::Bank && state_.pot > 0));\n}\nbool dice::Game::apply(Action action, int face) {\n    if (!legal(action)) return false;\n    if (action == Action::Bank) return false;\n    if (face < 1 || face > 6) return false;\n    if (face == 1) {\n        state_.pot = 0;\n        state_.turn = 1 - state_.turn;\n    } else {\n        state_.pot += face;\n        if (state_.scores.at(state_.turn) + state_.pot > target)\n            state_.winner = state_.turn;\n    }\n    return true;\n}\n",
          "explore/game_probe.cpp": "#include <iostream>\n#include \"dice/Game.hpp\"\nint main() {\n    dice::Game game;\n    game.apply(dice::Action::Roll, 6);\n    game.apply(dice::Action::Roll, 6);\n    dice::GameSnapshot view = game.snapshot();\n    std::cout << \"pot=\" << view.pot << \" winner=\" << view.winner << \" roll=\" << game.legal(dice::Action::Roll) << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "18-deterministic-game#Complete banking without rolling a die": {
    "wrong": []
  },
  "18-deterministic-game#Trace a bank followed by the opponent’s bust": {
    "wrong": [
      {
        "name": "bank forgets to clear pot",
        "files": {
          "src/dice/Game.cpp": "#include \"dice/Game.hpp\"\nbool dice::Game::finished() const { return state_.winner != -1; }\nbool dice::Game::legal(Action action) const {\n    return !finished() && (action == Action::Roll ||\n        (action == Action::Bank && state_.pot > 0));\n}\nbool dice::Game::apply(Action action, int face) {\n    if (!legal(action)) return false;\n    if (action == Action::Bank) {\n        state_.scores.at(state_.turn) += state_.pot;\n        state_.pot = state_.pot;\n        state_.turn = 1 - state_.turn;\n        return true;\n    }\n    if (face < 1 || face > 6) return false;\n    if (face == 1) {\n        state_.pot = 0;\n        state_.turn = 1 - state_.turn;\n    } else {\n        state_.pot += face;\n        if (state_.scores.at(state_.turn) + state_.pot >= target)\n            state_.winner = state_.turn;\n    }\n    return true;\n}\n",
          "explore/game_probe.cpp": "#include <iostream>\n#include \"dice/Game.hpp\"\nint main() {\n    dice::Game game;\n    game.apply(dice::Action::Roll, 4);\n    game.apply(dice::Action::Bank, 0);\n    std::cout << \"after bank pot=\" << game.snapshot().pot << '\\n';\n    game.apply(dice::Action::Roll, 3);\n    game.apply(dice::Action::Roll, 1);\n    dice::GameSnapshot view = game.snapshot();\n    std::cout << \"scores=\" << view.scores.at(0) << \",\" << view.scores.at(1) << \" pot=\" << view.pot << \" turn=\" << view.turn << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "18-deterministic-game#Try it — Keep a rejected move out of the game": {
    "wrong": []
  },
  "18-deterministic-game#Your turn — Specify the game with tests": {
    "wrong": [
      {
        "name": "empty test prints success",
        "files": {
          "tests/game_rules.cpp": "#include <iostream>\nint main(){ std::cout << \"rules passed\\n\"; }"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "exact win is missed",
        "files": {
          "tests/game_rules.cpp": "#include <iostream>\n#include \"dice/Game.hpp\"\nint main() {\n    dice::Game game;\n    if (game.apply(dice::Action::Bank, 0)) return 1;\n    if (game.apply(dice::Action::Roll, 0) || game.apply(dice::Action::Roll, 7)) return 2;\n    if (game.snapshot().pot != 0 || game.snapshot().turn != 0) return 3;\n    if (!game.apply(dice::Action::Roll, 4) || !game.apply(dice::Action::Bank, 0)) return 4;\n    if (game.snapshot().scores.at(0) != 4 || game.snapshot().pot != 0 || game.snapshot().turn != 1) return 5;\n    game.apply(dice::Action::Roll, 3);\n    game.apply(dice::Action::Roll, 1);\n    if (game.snapshot().pot != 0 || game.snapshot().turn != 0 || game.snapshot().scores.at(0) != 4) return 6;\n    game.apply(dice::Action::Roll, 6);\n    game.apply(dice::Action::Roll, 3);\n    if (!game.finished() || game.snapshot().winner != 0) return 7;\n    if (game.apply(dice::Action::Bank, 0) || game.apply(dice::Action::Roll, 2) || game.snapshot().pot != 9) return 8;\n    dice::Game exact;\n    exact.apply(dice::Action::Roll, 1);\n    exact.apply(dice::Action::Roll, 6);\n    exact.apply(dice::Action::Roll, 6);\n    if (exact.snapshot().winner != 1 || exact.snapshot().turn != 1) return 9;\n    std::cout << \"rules passed\\n\";\n    return 0;\n}",
          "src/dice/Game.cpp": "#include \"dice/Game.hpp\"\nbool dice::Game::finished() const { return state_.winner != -1; }\nbool dice::Game::legal(Action action) const {\n    return !finished() && (action == Action::Roll ||\n        (action == Action::Bank && state_.pot > 0));\n}\nbool dice::Game::apply(Action action, int face) {\n    if (!legal(action)) return false;\n    if (action == Action::Bank) {\n        state_.scores.at(state_.turn) += state_.pot;\n        state_.pot = 0;\n        state_.turn = 1 - state_.turn;\n        return true;\n    }\n    if (face < 1 || face > 6) return false;\n    if (face == 1) {\n        state_.pot = 0;\n        state_.turn = 1 - state_.turn;\n    } else {\n        state_.pot += face;\n        if (state_.scores.at(state_.turn) + state_.pot > target)\n            state_.winner = state_.turn;\n    }\n    return true;\n}\n"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "tests/game_rules.cpp": "#include <iostream>\n#include \"dice/Game.hpp\"\nint main() {\n    dice::Game game;\n    if (game.apply(dice::Action::Bank, 0)) return 1;\n    if (game.apply(dice::Action::Roll, 0) || game.apply(dice::Action::Roll, 7)) return 2;\n    if (game.snapshot().pot != 0 || game.snapshot().turn != 0) return 3;\n    if (!game.apply(dice::Action::Roll, 4) || !game.apply(dice::Action::Bank, 0)) return 4;\n    if (game.snapshot().scores.at(0) != 4 || game.snapshot().pot != 0 || game.snapshot().turn != 1) return 5;\n    game.apply(dice::Action::Roll, 3);\n    game.apply(dice::Action::Roll, 1);\n    if (game.snapshot().pot != 0 || game.snapshot().turn != 0 || game.snapshot().scores.at(0) != 4) return 6;\n    game.apply(dice::Action::Roll, 6);\n    game.apply(dice::Action::Roll, 3);\n    if (!game.finished() || game.snapshot().winner != 0) return 7;\n    if (game.apply(dice::Action::Bank, 0) || game.apply(dice::Action::Roll, 2) || game.snapshot().pot != 9) return 8;\n    dice::Game exact;\n    exact.apply(dice::Action::Roll, 1);\n    exact.apply(dice::Action::Roll, 6);\n    exact.apply(dice::Action::Roll, 6);\n    if (exact.snapshot().winner != 1 || exact.snapshot().turn != 1) return 9;\n    std::cout << \"rules passed\\n\";\n    return 0;\n}"
    }
  },
  "18-deterministic-game#Keep the game and its tests in the build": {
    "wrong": []
  },
  "19-command-lines#Keep all the text the player typed": {
    "wrong": []
  },
  "19-command-lines#Name the result of interpretation": {
    "wrong": []
  },
  "19-command-lines#Translate exact words without side effects": {
    "wrong": []
  },
  "19-command-lines#Observe the translated value": {
    "wrong": [
      {
        "name": "only reads the first word",
        "files": {
          "explore/command_probe.cpp": "#include <iostream>\n#include <string>\n#include \"dice/Command.hpp\"\nint main() {\n    std::string line;\n    if (!(std::cin >> line)) {\n        std::cout << \"end of input\\n\";\n        return 0;\n    }\n    dice::Command command = dice::parseCommand(line);\n    if (command == dice::Command::Roll) std::cout << \"roll requested\\n\";\n    if (command == dice::Command::Bank) std::cout << \"bank requested\\n\";\n    if (command == dice::Command::Quit) std::cout << \"quit requested\\n\";\n    if (command == dice::Command::Invalid) std::cout << \"invalid command\\n\";\n    return 0;\n}"
        },
        "fails": [
          2
        ]
      }
    ]
  },
  "19-command-lines#Try it — Separate blank input from closed input": {
    "wrong": []
  },
  "19-command-lines#Your turn — Specify the accepted language": {
    "wrong": [
      {
        "name": "empty success test",
        "files": {
          "tests/commands.cpp": "#include <iostream>\nint main(){ std::cout << \"commands passed\\n\"; }"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "bank translated into roll",
        "files": {
          "src/dice/Command.cpp": "#include \"dice/Command.hpp\"\ndice::Command dice::parseCommand(const std::string& line) {\n    if (line == \"roll\") return Command::Roll;\n    if (line == \"bank\") return Command::Roll;\n    if (line == \"quit\") return Command::Quit;\n    return Command::Invalid;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "unknown text accepted as roll",
        "files": {
          "src/dice/Command.cpp": "#include \"dice/Command.hpp\"\ndice::Command dice::parseCommand(const std::string& line) {\n    if (line == \"roll\") return Command::Roll;\n    if (line == \"bank\") return Command::Bank;\n    if (line == \"quit\") return Command::Quit;\n    return Command::Roll;\n}"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "tests/commands.cpp": "#include <iostream>\n#include \"dice/Command.hpp\"\nint main() {\n    if (dice::parseCommand(\"roll\") != dice::Command::Roll) return 1;\n    if (dice::parseCommand(\"bank\") != dice::Command::Bank) return 2;\n    if (dice::parseCommand(\"quit\") != dice::Command::Quit) return 3;\n    if (dice::parseCommand(\"\") != dice::Command::Invalid) return 4;\n    if (dice::parseCommand(\"roll now\") != dice::Command::Invalid) return 5;\n    if (dice::parseCommand(\"Roll\") != dice::Command::Invalid) return 6;\n    if (dice::parseCommand(\" bank\") != dice::Command::Invalid) return 7;\n    if (dice::parseCommand(\"bank \") != dice::Command::Invalid) return 8;\n    if (dice::parseCommand(\"help\") != dice::Command::Invalid) return 9;\n    std::string original = \"quit\";\n    dice::parseCommand(original);\n    if (original != \"quit\") return 10;\n    std::cout << \"commands passed\\n\";\n    return 0;\n}"
    }
  },
  "19-command-lines#Run the parser contract with the game contracts": {
    "wrong": []
  },
  "19b-repeatable-dice#Watch an engine advance": {
    "wrong": []
  },
  "19b-repeatable-dice#Map the engine to six equally likely outcomes": {
    "wrong": []
  },
  "19b-repeatable-dice#Give the sequence one owner": {
    "wrong": []
  },
  "19b-repeatable-dice#Initialize the engine before the first roll": {
    "wrong": []
  },
  "19b-repeatable-dice#Advance the existing engine, not a new one": {
    "wrong": []
  },
  "19b-repeatable-dice#Compare two independently owned sequences": {
    "wrong": []
  },
  "19b-repeatable-dice#Try it — Desynchronize a replay": {
    "wrong": []
  },
  "19b-repeatable-dice#Your turn — Reject a constant die": {
    "wrong": [
      {
        "name": "constant legal face",
        "files": {
          "src/dice/Die.cpp": "#include \"dice/Die.hpp\"\ndice::Die::Die(unsigned int seed) : engine_(seed) {}\nint dice::Die::roll() {\n    return 3;\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "out of range face",
        "files": {
          "src/dice/Die.cpp": "#include \"dice/Die.hpp\"\ndice::Die::Die(unsigned int seed) : engine_(seed) {}\nint dice::Die::roll() {\n    return 7;\n}\n"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "empty test reports success",
        "files": {
          "tests/dice.cpp": "#include <iostream>\nint main(){ std::cout << \"dice passed\\n\"; }"
        },
        "fails": [
          2
        ]
      }
    ],
    "files": {
      "tests/dice.cpp": "#include <iostream>\n#include \"dice/Die.hpp\"\nint main() {\n    dice::Die first(91);\n    dice::Die replay(91);\n    int initial = first.roll();\n    if (initial < 1 || initial > 6 || initial != replay.roll()) return 1;\n    bool changed = false;\n    for (int i = 0; i < 1000; ++i) {\n        int face = first.roll();\n        if (face < 1 || face > 6) return 2;\n        if (face != replay.roll()) return 3;\n        if (face != initial) changed = true;\n    }\n    if (!changed) return 4;\n    std::cout << \"dice passed\\n\";\n    return 0;\n}"
    }
  },
  "19b-repeatable-dice#Keep random generation separate from rule testing": {
    "wrong": []
  },
  "19c-terminal-match#Create the application entry point": {
    "wrong": []
  },
  "19c-terminal-match#Present a snapshot without changing it": {
    "wrong": []
  },
  "19c-terminal-match#Keep the session alive until the player leaves": {
    "wrong": []
  },
  "19c-terminal-match#Generate a face only for a legal roll": {
    "wrong": []
  },
  "19c-terminal-match#Connect human requests to the model": {
    "wrong": []
  },
  "19c-terminal-match#Let a policy choose the opponent’s action": {
    "wrong": []
  },
  "19c-terminal-match#Report a win separately from leaving": {
    "wrong": []
  },
  "19c-terminal-match#Try it — Locate a bug by responsibility": {
    "wrong": []
  },
  "19c-terminal-match#Your turn — Count rejected human requests": {
    "wrong": [
      {
        "name": "counts every human line including quit",
        "files": {
          "apps/dice_terminal.cpp": "#include <iostream>\n#include <string>\n#include \"dice/Game.hpp\"\n#include \"dice/Command.hpp\"\n#include \"dice/Die.hpp\"\nvoid show(const dice::GameSnapshot& view) {\n    std::cout << \"scores=\" << view.scores.at(0) << \",\" << view.scores.at(1)\n              << \" pot=\" << view.pot << \" turn=\" << view.turn << '\\n';\n}\nbool perform(dice::Game& game, dice::Die& die, dice::Action action) {\n    if (!game.legal(action)) return false;\n    int face = 0;\n    if (action == dice::Action::Roll) {\n        face = die.roll();\n        std::cout << \"rolled=\" << face << '\\n';\n    }\n    return game.apply(action, face);\n}\ndice::Action opponentAction(const dice::GameSnapshot& view) {\n    if (view.pot >= 4) return dice::Action::Bank;\n    return dice::Action::Roll;\n}\nint main() {\n    dice::Game game;\n    dice::Die die(42);\n    std::cout << \"Dice Duel: you=0 opponent=1 target=12\\n\";\n    int rejected = 0;\n    std::string line;\n    while (!game.finished()) {\n        show(game.snapshot());\n        if (game.snapshot().turn == 1) {\n            dice::Action choice = opponentAction(game.snapshot());\n            std::cout << \"opponent acts\\n\";\n            if (!perform(game, die, choice)) return 2;\n            continue;\n        }\n        std::cout << \"roll / bank / quit>\\n\";\n        if (!std::getline(std::cin, line)) break;\n        ++rejected;\n        dice::Command command = dice::parseCommand(line);\n        if (command == dice::Command::Quit) break;\n        if (command == dice::Command::Invalid) {\n            ++rejected;\n            std::cout << \"unknown command\\n\";\n            continue;\n        }\n        dice::Action action = dice::Action::Roll;\n        if (command == dice::Command::Bank) action = dice::Action::Bank;\n        if (!perform(game, die, action)) {\n            ++rejected;\n            std::cout << \"illegal action\\n\";\n        }\n    }\n    std::cout << \"rejected=\" << rejected << '\\n';\n    if (game.finished()) {\n        show(game.snapshot());\n        std::cout << \"winner=\" << game.snapshot().winner << '\\n';\n    } else {\n        std::cout << \"session ended\\n\";\n    }\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "forgets illegal banking",
        "files": {
          "apps/dice_terminal.cpp": "#include <iostream>\n#include <string>\n#include \"dice/Game.hpp\"\n#include \"dice/Command.hpp\"\n#include \"dice/Die.hpp\"\nvoid show(const dice::GameSnapshot& view) {\n    std::cout << \"scores=\" << view.scores.at(0) << \",\" << view.scores.at(1)\n              << \" pot=\" << view.pot << \" turn=\" << view.turn << '\\n';\n}\nbool perform(dice::Game& game, dice::Die& die, dice::Action action) {\n    if (!game.legal(action)) return false;\n    int face = 0;\n    if (action == dice::Action::Roll) {\n        face = die.roll();\n        std::cout << \"rolled=\" << face << '\\n';\n    }\n    return game.apply(action, face);\n}\ndice::Action opponentAction(const dice::GameSnapshot& view) {\n    if (view.pot >= 4) return dice::Action::Bank;\n    return dice::Action::Roll;\n}\nint main() {\n    dice::Game game;\n    dice::Die die(42);\n    std::cout << \"Dice Duel: you=0 opponent=1 target=12\\n\";\n    int rejected = 0;\n    std::string line;\n    while (!game.finished()) {\n        show(game.snapshot());\n        if (game.snapshot().turn == 1) {\n            dice::Action choice = opponentAction(game.snapshot());\n            std::cout << \"opponent acts\\n\";\n            if (!perform(game, die, choice)) return 2;\n            continue;\n        }\n        std::cout << \"roll / bank / quit>\\n\";\n        if (!std::getline(std::cin, line)) break;\n        dice::Command command = dice::parseCommand(line);\n        if (command == dice::Command::Quit) break;\n        if (command == dice::Command::Invalid) {\n            ++rejected;\n            std::cout << \"unknown command\\n\";\n            continue;\n        }\n        dice::Action action = dice::Action::Roll;\n        if (command == dice::Command::Bank) action = dice::Action::Bank;\n        if (!perform(game, die, action)) {\n            std::cout << \"illegal action\\n\";\n        }\n    }\n    std::cout << \"rejected=\" << rejected << '\\n';\n    if (game.finished()) {\n        show(game.snapshot());\n        std::cout << \"winner=\" << game.snapshot().winner << '\\n';\n    } else {\n        std::cout << \"session ended\\n\";\n    }\n    return 0;\n}"
        },
        "fails": [
          3
        ]
      },
      {
        "name": "hardcodes example count",
        "files": {
          "apps/dice_terminal.cpp": "#include <iostream>\n#include <string>\n#include \"dice/Game.hpp\"\n#include \"dice/Command.hpp\"\n#include \"dice/Die.hpp\"\nvoid show(const dice::GameSnapshot& view) {\n    std::cout << \"scores=\" << view.scores.at(0) << \",\" << view.scores.at(1)\n              << \" pot=\" << view.pot << \" turn=\" << view.turn << '\\n';\n}\nbool perform(dice::Game& game, dice::Die& die, dice::Action action) {\n    if (!game.legal(action)) return false;\n    int face = 0;\n    if (action == dice::Action::Roll) {\n        face = die.roll();\n        std::cout << \"rolled=\" << face << '\\n';\n    }\n    return game.apply(action, face);\n}\ndice::Action opponentAction(const dice::GameSnapshot& view) {\n    if (view.pot >= 4) return dice::Action::Bank;\n    return dice::Action::Roll;\n}\nint main() {\n    dice::Game game;\n    dice::Die die(42);\n    std::cout << \"Dice Duel: you=0 opponent=1 target=12\\n\";\n    int rejected = 0;\n    std::string line;\n    while (!game.finished()) {\n        show(game.snapshot());\n        if (game.snapshot().turn == 1) {\n            dice::Action choice = opponentAction(game.snapshot());\n            std::cout << \"opponent acts\\n\";\n            if (!perform(game, die, choice)) return 2;\n            continue;\n        }\n        std::cout << \"roll / bank / quit>\\n\";\n        if (!std::getline(std::cin, line)) break;\n        dice::Command command = dice::parseCommand(line);\n        if (command == dice::Command::Quit) break;\n        if (command == dice::Command::Invalid) {\n            ++rejected;\n            std::cout << \"unknown command\\n\";\n            continue;\n        }\n        dice::Action action = dice::Action::Roll;\n        if (command == dice::Command::Bank) action = dice::Action::Bank;\n        if (!perform(game, die, action)) {\n            ++rejected;\n            std::cout << \"illegal action\\n\";\n        }\n    }\n    std::cout << \"rejected=\" << 2 << '\\n';\n    if (game.finished()) {\n        show(game.snapshot());\n        std::cout << \"winner=\" << game.snapshot().winner << '\\n';\n    } else {\n        std::cout << \"session ended\\n\";\n    }\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "apps/dice_terminal.cpp": "#include <iostream>\n#include <string>\n#include \"dice/Game.hpp\"\n#include \"dice/Command.hpp\"\n#include \"dice/Die.hpp\"\nvoid show(const dice::GameSnapshot& view) {\n    std::cout << \"scores=\" << view.scores.at(0) << \",\" << view.scores.at(1)\n              << \" pot=\" << view.pot << \" turn=\" << view.turn << '\\n';\n}\nbool perform(dice::Game& game, dice::Die& die, dice::Action action) {\n    if (!game.legal(action)) return false;\n    int face = 0;\n    if (action == dice::Action::Roll) {\n        face = die.roll();\n        std::cout << \"rolled=\" << face << '\\n';\n    }\n    return game.apply(action, face);\n}\ndice::Action opponentAction(const dice::GameSnapshot& view) {\n    if (view.pot >= 4) return dice::Action::Bank;\n    return dice::Action::Roll;\n}\nint main() {\n    dice::Game game;\n    dice::Die die(42);\n    std::cout << \"Dice Duel: you=0 opponent=1 target=12\\n\";\n    int rejected = 0;\n    std::string line;\n    while (!game.finished()) {\n        show(game.snapshot());\n        if (game.snapshot().turn == 1) {\n            dice::Action choice = opponentAction(game.snapshot());\n            std::cout << \"opponent acts\\n\";\n            if (!perform(game, die, choice)) return 2;\n            continue;\n        }\n        std::cout << \"roll / bank / quit>\\n\";\n        if (!std::getline(std::cin, line)) break;\n        dice::Command command = dice::parseCommand(line);\n        if (command == dice::Command::Quit) break;\n        if (command == dice::Command::Invalid) {\n            ++rejected;\n            std::cout << \"unknown command\\n\";\n            continue;\n        }\n        dice::Action action = dice::Action::Roll;\n        if (command == dice::Command::Bank) action = dice::Action::Bank;\n        if (!perform(game, die, action)) {\n            ++rejected;\n            std::cout << \"illegal action\\n\";\n        }\n    }\n    std::cout << \"rejected=\" << rejected << '\\n';\n    if (game.finished()) {\n        show(game.snapshot());\n        std::cout << \"winner=\" << game.snapshot().winner << '\\n';\n    } else {\n        std::cout << \"session ended\\n\";\n    }\n    return 0;\n}"
    }
  },
  "19c-terminal-match#Build and share the playable milestone": {
    "wrong": []
  }
};
