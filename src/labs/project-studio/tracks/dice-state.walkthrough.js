// Generated author-side answers; never supplied to learner files.
export const WALKTHROUGH = {
  "06-copies-and-references#A parameter gets its own value": {
    "wrong": []
  },
  "06-copies-and-references#Give the function access to the original": {
    "wrong": [
      {
        "name": "plausible incorrect edit",
        "files": {
          "explore/references.cpp": "#include <iostream>\nvoid add(int score, int amount) {\n    score += amount;\n}\nint main() {\n    int score = 4;\n    add(score, 5);\n    std::cout << \"score=\" << score << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "06-copies-and-references#Borrow for reading": {
    "wrong": []
  },
  "06-copies-and-references#Try it — Read the compiler objection": {
    "wrong": []
  },
  "06-copies-and-references#Your turn — Bank for only the second player": {
    "wrong": [
      {
        "name": "changes a copy",
        "files": {
          "practice/transfer.cpp": "#include <iostream>\nvoid transfer(int score, int& pot) {\n    score += pot;\n    pot = 0;\n}\nint main() {\n    int first = 0, second = 0, pot = 0;\n    if (!(std::cin >> first >> second >> pot)) return 1;\n    transfer(second, pot);\n    std::cout << \"first=\" << first << \" second=\" << second << \" pot=\" << pot << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "clears too early",
        "files": {
          "practice/transfer.cpp": "#include <iostream>\nvoid transfer(int& score, int& pot) {\n    pot = 0;\n    score += pot;\n}\nint main() {\n    int first = 0, second = 0, pot = 0;\n    if (!(std::cin >> first >> second >> pot)) return 1;\n    transfer(second, pot);\n    std::cout << \"first=\" << first << \" second=\" << second << \" pot=\" << pot << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/transfer.cpp": "#include <iostream>\nint main() { std::cout << \"first=4 second=12 pot=0\\nfirst=9 second=2 pot=0\\nfirst=1 second=11 pot=0\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/transfer.cpp": "#include <iostream>\nvoid transfer(int& score, int& pot) {\n    score += pot;\n    pot = 0;\n}\nint main() {\n    int first = 0, second = 0, pot = 0;\n    if (!(std::cin >> first >> second >> pot)) return 1;\n    transfer(second, pot);\n    std::cout << \"first=\" << first << \" second=\" << second << \" pot=\" << pot << '\\n';\n    return 0;\n}"
    }
  },
  "07-players-and-collections#Name a record": {
    "wrong": []
  },
  "07-players-and-collections#Copy the record": {
    "wrong": []
  },
  "07-players-and-collections#A collection with exactly two places": {
    "wrong": []
  },
  "07-players-and-collections#A collection that grows": {
    "wrong": []
  },
  "07-players-and-collections#Try it — Diagnose a bad position safely": {
    "wrong": []
  },
  "07-players-and-collections#Your turn — Keep an independent snapshot": {
    "wrong": [
      {
        "name": "aliases original",
        "files": {
          "practice/player_copy.cpp": "#include <iostream>\n#include <array>\nstruct Player {\n    int score = 0;\n};\nint main() {\n    std::array<Player, 2> players{};\n    int gain = 0;\n    if (!(std::cin >> players.at(0).score >> players.at(1).score >> gain)) return 1;\n    Player& copy = players.at(1);\n    copy.score += gain;\n    std::cout << \"first=\" << players.at(0).score << \" second=\" << players.at(1).score << \" copy=\" << copy.score << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "copies wrong player",
        "files": {
          "practice/player_copy.cpp": "#include <iostream>\n#include <array>\nstruct Player {\n    int score = 0;\n};\nint main() {\n    std::array<Player, 2> players{};\n    int gain = 0;\n    if (!(std::cin >> players.at(0).score >> players.at(1).score >> gain)) return 1;\n    Player copy = players.at(0);\n    copy.score += gain;\n    std::cout << \"first=\" << players.at(0).score << \" second=\" << players.at(1).score << \" copy=\" << copy.score << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/player_copy.cpp": "#include <iostream>\nint main() { std::cout << \"first=4 second=7 copy=10\\nfirst=2 second=9 copy=9\\nfirst=8 second=1 copy=7\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/player_copy.cpp": "#include <iostream>\n#include <array>\nstruct Player {\n    int score = 0;\n};\nint main() {\n    std::array<Player, 2> players{};\n    int gain = 0;\n    if (!(std::cin >> players.at(0).score >> players.at(1).score >> gain)) return 1;\n    Player copy = players.at(1);\n    copy.score += gain;\n    std::cout << \"first=\" << players.at(0).score << \" second=\" << players.at(1).score << \" copy=\" << copy.score << '\\n';\n    return 0;\n}"
    }
  },
  "08-actions-and-loops#Name the choices": {
    "wrong": []
  },
  "08-actions-and-loops#Repeat one operation over values": {
    "wrong": []
  },
  "08-actions-and-loops#A bust ends the loop": {
    "wrong": [
      {
        "name": "plausible incorrect edit",
        "files": {
          "explore/turns.cpp": "#include <iostream>\n#include <array>\n\nint main() {\n    std::array<int, 4> rolls{3, 5, 1, 6};\n    int pot = 0;\n    for (int face : rolls) {\n        if (face == 1) {\n            pot = 0;\n            continue;\n        }\n        pot += face;\n        std::cout << \"pot=\" << pot << '\\n';\n    }\n    std::cout << \"final=\" << pot << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "08-actions-and-loops#Skipping is different from stopping": {
    "wrong": []
  },
  "08-actions-and-loops#Try it — Find the accumulator’s lifetime": {
    "wrong": []
  },
  "08-actions-and-loops#Your turn — Stop a recorded turn": {
    "wrong": [
      {
        "name": "continues after bust",
        "files": {
          "practice/recorded_turn.cpp": "#include <iostream>\n\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 0 || count > 20) return 1;\n    int pot = 0;\n    for (int i = 0; i < count; ++i) {\n        int face = 0;\n        if (!(std::cin >> face)) return 1;\n        if (face == 1) { pot = 0; continue; }\n        pot += face;\n    }\n    std::cout << \"pot=\" << pot << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1,
          4
        ]
      },
      {
        "name": "forgets reset",
        "files": {
          "practice/recorded_turn.cpp": "#include <iostream>\n\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 0 || count > 20) return 1;\n    int pot = 0;\n    for (int i = 0; i < count; ++i) {\n        int face = 0;\n        if (!(std::cin >> face)) return 1;\n        if (face == 1) { break; }\n        pot += face;\n    }\n    std::cout << \"pot=\" << pot << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/recorded_turn.cpp": "#include <iostream>\nint main() { std::cout << \"pot=0\\npot=12\\npot=7\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/recorded_turn.cpp": "#include <iostream>\n\nint main() {\n    int count = 0;\n    if (!(std::cin >> count) || count < 0 || count > 20) return 1;\n    int pot = 0;\n    for (int i = 0; i < count; ++i) {\n        int face = 0;\n        if (!(std::cin >> face)) return 1;\n        if (face == 1) { pot = 0; break; }\n        pot += face;\n    }\n    std::cout << \"pot=\" << pot << '\\n';\n    return 0;\n}"
    }
  },
  "09-tests-that-fail#Start with a failing test": {
    "wrong": []
  },
  "09-tests-that-fail#Fix the operation, keep the expectation": {
    "wrong": []
  },
  "09-tests-that-fail#An assertion abbreviates a claim": {
    "wrong": []
  },
  "09-tests-that-fail#Try it — A green result can be meaningless": {
    "wrong": []
  },
  "09-tests-that-fail#Your turn — Write a test that can reject a result": {
    "wrong": [
      {
        "name": "test always succeeds",
        "files": {
          "practice/bank_test.cpp": "#include <iostream>\nvoid bank(int& score, int amount) {\n    score += amount;\n}\nint main() {\n    int initial = 0, amount = 0, expected = 0;\n    if (!(std::cin >> initial >> amount >> expected)) return 2;\n    bank(initial, amount);\n    if (false) { std::cout << \"FAIL\\n\"; return 1; }\n    std::cout << \"PASS\\n\";\n    return 0;\n}"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "replacement bug",
        "files": {
          "practice/bank_test.cpp": "#include <iostream>\nvoid bank(int& score, int amount) {\n    score = amount;\n}\nint main() {\n    int initial = 0, amount = 0, expected = 0;\n    if (!(std::cin >> initial >> amount >> expected)) return 2;\n    bank(initial, amount);\n    if (initial != expected) { std::cout << \"FAIL\\n\"; return 1; }\n    std::cout << \"PASS\\n\";\n    return 0;\n}"
        },
        "fails": [
          1,
          3
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/bank_test.cpp": "#include <iostream>\nint main() { std::cout << \"PASS\\nFAIL\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/bank_test.cpp": "#include <iostream>\nvoid bank(int& score, int amount) {\n    score += amount;\n}\nint main() {\n    int initial = 0, amount = 0, expected = 0;\n    if (!(std::cin >> initial >> amount >> expected)) return 2;\n    bank(initial, amount);\n    if (initial != expected) { std::cout << \"FAIL\\n\"; return 1; }\n    std::cout << \"PASS\\n\";\n    return 0;\n}"
    }
  },
  "10-score-class#An integer type cannot express the whole rule": {
    "wrong": []
  },
  "10-score-class#Expose a query, keep storage private": {
    "wrong": []
  },
  "10-score-class#One method owns the mutation": {
    "wrong": []
  },
  "10-score-class#Rejection must preserve the earlier value": {
    "wrong": [
      {
        "name": "plausible incorrect edit",
        "files": {
          "explore/score_class.cpp": "#include <iostream>\nclass Score {\nprivate:\n    int points_ = 0;\npublic:\n    int points() const { return points_; }\n    bool bank(int amount) {\n        if (amount < 1 || amount > 12 || points_ >= 12) { points_ = 0; return false; }\n        points_ += amount;\n        return true;\n    }\n};\nint main() {\n    Score first;\n    Score second;\n    std::cout << \"accepted=\" << first.bank(5) << '\\n';\n    std::cout << \"rejected=\" << first.bank(-3) << '\\n';\n    std::cout << first.points() << \" \" << second.points() << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "10-score-class#Try it — Find the interface boundary": {
    "wrong": []
  },
  "10-score-class#Your turn — Design a bounded round counter": {
    "wrong": [
      {
        "name": "off-by-one admission",
        "files": {
          "practice/round_counter.cpp": "#include <iostream>\nclass RoundCounter {\nprivate:\n    int count_ = 0;\npublic:\n    int count() const { return count_; }\n    bool advance() {\n        if (count_ > 5) return false;\n        ++count_;\n        return true;\n    }\n    void reset() { count_ = 0; }\n};\nint main() {\n    int attempts = 0;\n    if (!(std::cin >> attempts) || attempts < 0 || attempts > 10) return 1;\n    RoundCounter first;\n    RoundCounter second;\n    int accepted = 0;\n    for (int i = 0; i < attempts; ++i) {\n        if (first.advance()) ++accepted;\n    }\n    RoundCounter copy = first;\n    copy.reset();\n    std::cout << \"first=\" << first.count() << \" second=\" << second.count() << \" copy=\" << copy.count() << \" accepted=\" << accepted << '\\n';\n    return 0;\n}"
        },
        "fails": [
          4
        ]
      },
      {
        "name": "copy is alias",
        "files": {
          "practice/round_counter.cpp": "#include <iostream>\nclass RoundCounter {\nprivate:\n    int count_ = 0;\npublic:\n    int count() const { return count_; }\n    bool advance() {\n        if (count_ >= 5) return false;\n        ++count_;\n        return true;\n    }\n    void reset() { count_ = 0; }\n};\nint main() {\n    int attempts = 0;\n    if (!(std::cin >> attempts) || attempts < 0 || attempts > 10) return 1;\n    RoundCounter first;\n    RoundCounter second;\n    int accepted = 0;\n    for (int i = 0; i < attempts; ++i) {\n        if (first.advance()) ++accepted;\n    }\n    RoundCounter& copy = first;\n    copy.reset();\n    std::cout << \"first=\" << first.count() << \" second=\" << second.count() << \" copy=\" << copy.count() << \" accepted=\" << accepted << '\\n';\n    return 0;\n}"
        },
        "fails": [
          2,
          3
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/round_counter.cpp": "#include <iostream>\nint main() { std::cout << \"first=0 second=0 copy=0 accepted=0\\nfirst=3 second=0 copy=0 accepted=3\\nfirst=5 second=0 copy=0 accepted=5\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/round_counter.cpp": "#include <iostream>\nclass RoundCounter {\nprivate:\n    int count_ = 0;\npublic:\n    int count() const { return count_; }\n    bool advance() {\n        if (count_ >= 5) return false;\n        ++count_;\n        return true;\n    }\n    void reset() { count_ = 0; }\n};\nint main() {\n    int attempts = 0;\n    if (!(std::cin >> attempts) || attempts < 0 || attempts > 10) return 1;\n    RoundCounter first;\n    RoundCounter second;\n    int accepted = 0;\n    for (int i = 0; i < attempts; ++i) {\n        if (first.advance()) ++accepted;\n    }\n    RoundCounter copy = first;\n    copy.reset();\n    std::cout << \"first=\" << first.count() << \" second=\" << second.count() << \" copy=\" << copy.count() << \" accepted=\" << accepted << '\\n';\n    return 0;\n}"
    }
  }
};
