// Generated author-side answers; never supplied to learner files.
export const WALKTHROUGH = {
  "11-valid-construction#Initialize before the object is used": {
    "wrong": []
  },
  "11-valid-construction#Require a deliberate conversion": {
    "wrong": []
  },
  "11-valid-construction#Reject creation that cannot satisfy the contract": {
    "wrong": []
  },
  "11-valid-construction#Give the failure a caller": {
    "wrong": []
  },
  "11-valid-construction#Try it — Direct construction versus conversion": {
    "wrong": []
  },
  "11-valid-construction#Your turn — Construct a rule configuration": {
    "wrong": [
      {
        "name": "rejects valid boundary",
        "files": {
          "practice/rules.cpp": "#include <iostream>\n#include <stdexcept>\nclass Rules {\nprivate:\n    int target_;\npublic:\n    explicit Rules(int target) : target_(target) {\n        if (target <= 2 || target > 20) throw std::invalid_argument(\"target\");\n    }\n    int target() const { return target_; }\n};\nint main() {\n    int target = 0;\n    if (!(std::cin >> target)) return 2;\n    try {\n        const Rules rules{target};\n        std::cout << \"target=\" << rules.target() << '\\n';\n    } catch (const std::invalid_argument&) {\n        std::cout << \"rejected\\n\";\n    }\n    return 0;\n}"
        },
        "fails": [
          1
        ]
      },
      {
        "name": "ignores upper bound",
        "files": {
          "practice/rules.cpp": "#include <iostream>\n#include <stdexcept>\nclass Rules {\nprivate:\n    int target_;\npublic:\n    explicit Rules(int target) : target_(target) {\n        if (target < 2) throw std::invalid_argument(\"target\");\n    }\n    int target() const { return target_; }\n};\nint main() {\n    int target = 0;\n    if (!(std::cin >> target)) return 2;\n    try {\n        const Rules rules{target};\n        std::cout << \"target=\" << rules.target() << '\\n';\n    } catch (const std::invalid_argument&) {\n        std::cout << \"rejected\\n\";\n    }\n    return 0;\n}"
        },
        "fails": [
          4
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/rules.cpp": "#include <iostream>\nint main() { std::cout << \"target=2\\ntarget=20\\nrejected\\ntarget=12\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/rules.cpp": "#include <iostream>\n#include <stdexcept>\nclass Rules {\nprivate:\n    int target_;\npublic:\n    explicit Rules(int target) : target_(target) {\n        if (target < 2 || target > 20) throw std::invalid_argument(\"target\");\n    }\n    int target() const { return target_; }\n};\nint main() {\n    int target = 0;\n    if (!(std::cin >> target)) return 2;\n    try {\n        const Rules rules{target};\n        std::cout << \"target=\" << rules.target() << '\\n';\n    } catch (const std::invalid_argument&) {\n        std::cout << \"rejected\\n\";\n    }\n    return 0;\n}"
    }
  },
  "12-snapshots#Compose state from values": {
    "wrong": []
  },
  "12-snapshots#Change the returned value": {
    "wrong": []
  },
  "12-snapshots#Let an operation change the model": {
    "wrong": []
  },
  "12-snapshots#Try it — A snapshot does not refresh itself": {
    "wrong": []
  },
  "12-snapshots#Your turn — A match summary with an independent view": {
    "wrong": [
      {
        "name": "records wrong seat",
        "files": {
          "practice/match_counter.cpp": "#include <iostream>\n#include <array>\nclass MatchCounter {\nprivate:\n    std::array<int, 2> wins_{};\npublic:\n    bool record(int seat) {\n        if (seat < 0 || seat > 1) return false;\n        ++wins_.at(0);\n        return true;\n    }\n    std::array<int, 2> snapshot() const { return wins_; }\n};\nint main() {\n    int seat = 0;\n    if (!(std::cin >> seat)) return 1;\n    MatchCounter matches;\n    bool accepted = matches.record(seat);\n    std::array<int, 2> view = matches.snapshot();\n    view.at(0) = 99;\n    std::array<int, 2> actual = matches.snapshot();\n    std::cout << \"accepted=\" << accepted << \" wins=\" << actual.at(0) << \",\" << actual.at(1) << \" view=\" << view.at(0) << '\\n';\n    return 0;\n}"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "mutates before rejecting",
        "files": {
          "practice/match_counter.cpp": "#include <iostream>\n#include <array>\nclass MatchCounter {\nprivate:\n    std::array<int, 2> wins_{};\npublic:\n    bool record(int seat) {\n        if (seat < 0 || seat > 1) { ++wins_.at(0); return false; }\n        ++wins_.at(seat);\n        return true;\n    }\n    std::array<int, 2> snapshot() const { return wins_; }\n};\nint main() {\n    int seat = 0;\n    if (!(std::cin >> seat)) return 1;\n    MatchCounter matches;\n    bool accepted = matches.record(seat);\n    std::array<int, 2> view = matches.snapshot();\n    view.at(0) = 99;\n    std::array<int, 2> actual = matches.snapshot();\n    std::cout << \"accepted=\" << accepted << \" wins=\" << actual.at(0) << \",\" << actual.at(1) << \" view=\" << view.at(0) << '\\n';\n    return 0;\n}"
        },
        "fails": [
          3,
          4
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/match_counter.cpp": "#include <iostream>\nint main() { std::cout << \"accepted=1 wins=1,0 view=99\\naccepted=1 wins=0,1 view=99\\naccepted=0 wins=0,0 view=99\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/match_counter.cpp": "#include <iostream>\n#include <array>\nclass MatchCounter {\nprivate:\n    std::array<int, 2> wins_{};\npublic:\n    bool record(int seat) {\n        if (seat < 0 || seat > 1) return false;\n        ++wins_.at(seat);\n        return true;\n    }\n    std::array<int, 2> snapshot() const { return wins_; }\n};\nint main() {\n    int seat = 0;\n    if (!(std::cin >> seat)) return 1;\n    MatchCounter matches;\n    bool accepted = matches.record(seat);\n    std::array<int, 2> view = matches.snapshot();\n    view.at(0) = 99;\n    std::array<int, 2> actual = matches.snapshot();\n    std::cout << \"accepted=\" << accepted << \" wins=\" << actual.at(0) << \",\" << actual.at(1) << \" view=\" << view.at(0) << '\\n';\n    return 0;\n}"
    }
  },
  "13-rejection-and-exceptions#A result for an expected rejected request": {
    "wrong": []
  },
  "13-rejection-and-exceptions#A legal move can lose points": {
    "wrong": []
  },
  "13-rejection-and-exceptions#An exception for a violated internal contract": {
    "wrong": []
  },
  "13-rejection-and-exceptions#Try it — Preserve before you report": {
    "wrong": []
  },
  "13-rejection-and-exceptions#Your turn — Validate a candidate before changing the pot": {
    "wrong": [
      {
        "name": "damages pot on cap failure",
        "files": {
          "practice/bounded_pot.cpp": "#include <iostream>\nbool add_face(int& pot, int face) {\n    if (face < 1 || face > 6) return false;\n    if (face == 1) { pot = 0; return true; }\n    if (pot + face > 20) { pot += face; return false; }\n    pot += face;\n    return true;\n}\nint main() {\n    int pot = 0, face = 0;\n    if (!(std::cin >> pot >> face)) return 1;\n    bool accepted = add_face(pot, face);\n    std::cout << \"accepted=\" << accepted << \" pot=\" << pot << '\\n';\n    return 0;\n}"
        },
        "fails": [
          5
        ]
      },
      {
        "name": "rejects exact cap",
        "files": {
          "practice/bounded_pot.cpp": "#include <iostream>\nbool add_face(int& pot, int face) {\n    if (face < 1 || face > 6) return false;\n    if (face == 1) { pot = 0; return true; }\n    if (pot + face >= 20) return false;\n    pot += face;\n    return true;\n}\nint main() {\n    int pot = 0, face = 0;\n    if (!(std::cin >> pot >> face)) return 1;\n    bool accepted = add_face(pot, face);\n    std::cout << \"accepted=\" << accepted << \" pot=\" << pot << '\\n';\n    return 0;\n}"
        },
        "fails": [
          4
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/bounded_pot.cpp": "#include <iostream>\nint main() { std::cout << \"accepted=0 pot=5\\naccepted=1 pot=0\\naccepted=1 pot=20\\naccepted=0 pot=15\\naccepted=1 pot=7\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/bounded_pot.cpp": "#include <iostream>\nbool add_face(int& pot, int face) {\n    if (face < 1 || face > 6) return false;\n    if (face == 1) { pot = 0; return true; }\n    if (pot + face > 20) return false;\n    pot += face;\n    return true;\n}\nint main() {\n    int pot = 0, face = 0;\n    if (!(std::cin >> pot >> face)) return 1;\n    bool accepted = add_face(pot, face);\n    std::cout << \"accepted=\" << accepted << \" pot=\" << pot << '\\n';\n    return 0;\n}"
    }
  },
  "14-lifetimes-and-ownership#Observe the end of a lifetime": {
    "wrong": []
  },
  "14-lifetimes-and-ownership#An early return still leaves scopes": {
    "wrong": []
  },
  "14-lifetimes-and-ownership#Try it — Reverse the construction order": {
    "wrong": []
  },
  "14-lifetimes-and-ownership#Your turn — Trace a helper returning to its caller": {
    "wrong": [
      {
        "name": "ignores early return",
        "files": {
          "practice/lifetime_trace.cpp": "#include <iostream>\nstruct Trace {\n    int id;\n    explicit Trace(int value) : id(value) { std::cout << \"begin \" << id << '\\n'; }\n    ~Trace() { std::cout << \"end \" << id << '\\n'; }\n};\nvoid visit(bool early) {\n    Trace local{2};\n    if (early) {}\n    std::cout << \"work\\n\";\n}\nint main() {\n    int early = 0;\n    if (!(std::cin >> early)) return 1;\n    Trace outer{1};\n    visit(early != 0);\n    std::cout << \"back\\n\";\n    return 0;\n}"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "destroys outer too soon",
        "files": {
          "practice/lifetime_trace.cpp": "#include <iostream>\nstruct Trace {\n    int id;\n    explicit Trace(int value) : id(value) { std::cout << \"begin \" << id << '\\n'; }\n    ~Trace() { std::cout << \"end \" << id << '\\n'; }\n};\nvoid visit(bool early) {\n    Trace local{2};\n    if (early) return;\n    std::cout << \"work\\n\";\n}\nint main() {\n    int early = 0;\n    if (!(std::cin >> early)) return 1;\n    { Trace outer{1}; visit(early != 0); }\n    std::cout << \"back\\n\";\n    return 0;\n}"
        },
        "fails": [
          1,
          2
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/lifetime_trace.cpp": "#include <iostream>\nint main() { std::cout << \"begin 1\\nbegin 2\\nwork\\nend 2\\nback\\nend 1\\nbegin 1\\nbegin 2\\nend 2\\nback\\nend 1\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/lifetime_trace.cpp": "#include <iostream>\nstruct Trace {\n    int id;\n    explicit Trace(int value) : id(value) { std::cout << \"begin \" << id << '\\n'; }\n    ~Trace() { std::cout << \"end \" << id << '\\n'; }\n};\nvoid visit(bool early) {\n    Trace local{2};\n    if (early) return;\n    std::cout << \"work\\n\";\n}\nint main() {\n    int early = 0;\n    if (!(std::cin >> early)) return 1;\n    Trace outer{1};\n    visit(early != 0);\n    std::cout << \"back\\n\";\n    return 0;\n}"
    }
  },
  "14b-file-persistence#Open, write, close and check": {
    "wrong": []
  },
  "14b-file-persistence#A different executable reads the file": {
    "wrong": []
  },
  "14b-file-persistence#Try it — Change the data, keep the program": {
    "wrong": []
  },
  "14b-file-persistence#Your turn — Separate saving from loading": {
    "wrong": [
      {
        "name": "reader opens a truncating writer",
        "files": {
          "practice/save_rounds.cpp": "#include <iostream>\n#include <fstream>\n\nint main() {\n    int mode = 0;\n    if (!(std::cin >> mode)) return 1;\n    if (mode == 1) {\n        int rounds = 0;\n        if (!(std::cin >> rounds) || rounds < 0 || rounds > 10) return 1;\n        std::ofstream output{\"practice_rounds.txt\"};\n        if (!output) return 2;\n        output << rounds << '\\n';\n        output.close();\n        if (!output) return 2;\n        std::cout << \"saved\\n\";\n    } else if (mode == 2) {\n        std::ofstream erase{\"practice_rounds.txt\"};\n        erase.close();\n        std::ifstream input{\"practice_rounds.txt\"};\n        int rounds = 0;\n        if (!(input >> rounds) || rounds < 0 || rounds > 10) return 2;\n        std::cout << \"loaded=\" << rounds << '\\n';\n    } else return 1;\n    return 0;\n}"
        },
        "fails": [
          2,
          4,
          6
        ]
      },
      {
        "name": "writes a fixed count",
        "files": {
          "practice/save_rounds.cpp": "#include <iostream>\n#include <fstream>\n\nint main() {\n    int mode = 0;\n    if (!(std::cin >> mode)) return 1;\n    if (mode == 1) {\n        int rounds = 0;\n        if (!(std::cin >> rounds) || rounds < 0 || rounds > 10) return 1;\n        std::ofstream output{\"practice_rounds.txt\"};\n        if (!output) return 2;\n        output << 3 << '\\n';\n        output.close();\n        if (!output) return 2;\n        std::cout << \"saved\\n\";\n    } else if (mode == 2) {\n        std::ifstream input{\"practice_rounds.txt\"};\n        int rounds = 0;\n        if (!(input >> rounds) || rounds < 0 || rounds > 10) return 2;\n        std::cout << \"loaded=\" << rounds << '\\n';\n    } else return 1;\n    return 0;\n}"
        },
        "fails": [
          4,
          6
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/save_rounds.cpp": "#include <iostream>\nint main() { std::cout << \"saved\\nloaded=3\\nloaded=8\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/save_rounds.cpp": "#include <iostream>\n#include <fstream>\n\nint main() {\n    int mode = 0;\n    if (!(std::cin >> mode)) return 1;\n    if (mode == 1) {\n        int rounds = 0;\n        if (!(std::cin >> rounds) || rounds < 0 || rounds > 10) return 1;\n        std::ofstream output{\"practice_rounds.txt\"};\n        if (!output) return 2;\n        output << rounds << '\\n';\n        output.close();\n        if (!output) return 2;\n        std::cout << \"saved\\n\";\n    } else if (mode == 2) {\n        std::ifstream input{\"practice_rounds.txt\"};\n        int rounds = 0;\n        if (!(input >> rounds) || rounds < 0 || rounds > 10) return 2;\n        std::cout << \"loaded=\" << rounds << '\\n';\n    } else return 1;\n    return 0;\n}"
    }
  },
  "14c-borrowed-pointers#An address names a live object": {
    "wrong": []
  },
  "14c-borrowed-pointers#Mutation reaches the pointed-to object": {
    "wrong": []
  },
  "14c-borrowed-pointers#Absence must be checked before access": {
    "wrong": []
  },
  "14c-borrowed-pointers#Try it — Rebind while both objects live": {
    "wrong": []
  },
  "14c-borrowed-pointers#Your turn — Award only a selected player": {
    "wrong": [
      {
        "name": "writes a copied value only",
        "files": {
          "practice/borrowed_award.cpp": "#include <iostream>\nbool award(int* score, int amount) {\n    if (score == nullptr || amount < 1 || amount > 6) return false;\n    int copy = *score; copy += amount;\n    return true;\n}\nint main() {\n    int seat = 0, amount = 0;\n    if (!(std::cin >> seat >> amount)) return 1;\n    int first = 3, second = 7;\n    int* selected = nullptr;\n    if (seat == 1) selected = &first;\n    else if (seat == 2) selected = &second;\n    bool accepted = award(selected, amount);\n    std::cout << \"accepted=\" << accepted << \" first=\" << first << \" second=\" << second << '\\n';\n    return 0;\n}"
        },
        "fails": [
          1,
          2
        ]
      },
      {
        "name": "selects first for both seats",
        "files": {
          "practice/borrowed_award.cpp": "#include <iostream>\nbool award(int* score, int amount) {\n    if (score == nullptr || amount < 1 || amount > 6) return false;\n    *score += amount;\n    return true;\n}\nint main() {\n    int seat = 0, amount = 0;\n    if (!(std::cin >> seat >> amount)) return 1;\n    int first = 3, second = 7;\n    int* selected = nullptr;\n    if (seat == 1) selected = &first;\n    else if (seat == 2) selected = &first;\n    bool accepted = award(selected, amount);\n    std::cout << \"accepted=\" << accepted << \" first=\" << first << \" second=\" << second << '\\n';\n    return 0;\n}"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/borrowed_award.cpp": "#include <iostream>\nint main() { std::cout << \"accepted=1 first=7 second=7\\naccepted=1 first=3 second=10\\naccepted=0 first=3 second=7\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/borrowed_award.cpp": "#include <iostream>\nbool award(int* score, int amount) {\n    if (score == nullptr || amount < 1 || amount > 6) return false;\n    *score += amount;\n    return true;\n}\nint main() {\n    int seat = 0, amount = 0;\n    if (!(std::cin >> seat >> amount)) return 1;\n    int first = 3, second = 7;\n    int* selected = nullptr;\n    if (seat == 1) selected = &first;\n    else if (seat == 2) selected = &second;\n    bool accepted = award(selected, amount);\n    std::cout << \"accepted=\" << accepted << \" first=\" << first << \" second=\" << second << '\\n';\n    return 0;\n}"
    }
  },
  "14d-noncopyable-owners#Observe one acquisition and release": {
    "wrong": []
  },
  "14d-noncopyable-owners#Default copying does not reacquire a resource": {
    "wrong": []
  },
  "14d-noncopyable-owners#Declare both copying operations unavailable": {
    "wrong": []
  },
  "14d-noncopyable-owners#Try it — Verify both restrictions": {
    "wrong": []
  },
  "14d-noncopyable-owners#Your turn — A visit releases on both return paths": {
    "wrong": [
      {
        "name": "cleanup only on normal path",
        "files": {
          "practice/visit.cpp": "#include <iostream>\nclass Visit {\npublic:\n    Visit() { std::cout << \"enter\\n\"; }\n    ~Visit() {}\n    Visit(const Visit&) = delete;\n    Visit& operator=(const Visit&) = delete;\n};\nvoid run_visit(bool early) {\n    Visit owner;\n    if (early) return;\n    std::cout << \"work\\nleave\\n\";\n}\nint main() {\n    int early = 0;\n    if (!(std::cin >> early)) return 1;\n    run_visit(early != 0);\n    std::cout << \"back\\n\";\n    return 0;\n}"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "owner ends after back",
        "files": {
          "practice/visit.cpp": "#include <iostream>\nclass Visit {\npublic:\n    Visit() { std::cout << \"enter\\n\"; }\n    ~Visit() { std::cout << \"leave\\n\"; }\n    Visit(const Visit&) = delete;\n    Visit& operator=(const Visit&) = delete;\n};\nvoid run_visit(bool early) {\n    if (early) return;\n    std::cout << \"work\\n\";\n}\nint main() {\n    int early = 0;\n    if (!(std::cin >> early)) return 1;\n    Visit owner;\n    run_visit(early != 0);\n    std::cout << \"back\\n\";\n    return 0;\n}"
        },
        "fails": [
          1,
          2
        ]
      },
      {
        "name": "prints every example without computing",
        "files": {
          "practice/visit.cpp": "#include <iostream>\nint main() { std::cout << \"enter\\nwork\\nleave\\nback\\nenter\\nleave\\nback\\n\"; return 0; }"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "practice/visit.cpp": "#include <iostream>\nclass Visit {\npublic:\n    Visit() { std::cout << \"enter\\n\"; }\n    ~Visit() { std::cout << \"leave\\n\"; }\n    Visit(const Visit&) = delete;\n    Visit& operator=(const Visit&) = delete;\n};\nvoid run_visit(bool early) {\n    Visit owner;\n    if (early) return;\n    std::cout << \"work\\n\";\n}\nint main() {\n    int early = 0;\n    if (!(std::cin >> early)) return 1;\n    run_visit(early != 0);\n    std::cout << \"back\\n\";\n    return 0;\n}"
    }
  },
  "15-headers-and-sources#Write the interface first": {
    "wrong": []
  },
  "15-headers-and-sources#Prevent a repeated definition": {
    "wrong": []
  },
  "15-headers-and-sources#Give the class a qualified name": {
    "wrong": []
  },
  "15-headers-and-sources#Define the methods in a source file": {
    "wrong": []
  },
  "15-headers-and-sources#Link a caller to the implementation": {
    "wrong": []
  },
  "15-headers-and-sources#Try it — Distinguish compiler and linker failures": {
    "wrong": []
  },
  "15-headers-and-sources#Your turn — Test the shared implementation": {
    "wrong": [
      {
        "name": "test never calls the shared class",
        "files": {
          "tests/shared_score.cpp": "int main() { return 0; }"
        },
        "fails": [
          2
        ]
      },
      {
        "name": "shared implementation replaces instead of adds",
        "files": {
          "tests/shared_score.cpp": "#include \"dice/Score.hpp\"\nint main() {\n    dice::Score first;\n    dice::Score second;\n    if (!first.bank(4) || !first.bank(5)) return 1;\n    if (first.points() != 9 || second.points() != 0) return 2;\n    if (first.bank(-1) || first.points() != 9) return 3;\n    if (!first.bank(3) || first.points() != 12) return 4;\n    if (first.bank(1) || first.points() != 12) return 5;\n    return 0;\n}",
          "src/dice/Score.cpp": "#include \"dice/Score.hpp\"\nint dice::Score::points() const {\n    return points_;\n}\nbool dice::Score::bank(int amount) {\n    if (amount < 1 || amount > 12 || points_ >= 12) return false;\n    points_ = amount;\n    return true;\n}"
        },
        "fails": [
          1
        ]
      }
    ],
    "files": {
      "tests/shared_score.cpp": "#include \"dice/Score.hpp\"\nint main() {\n    dice::Score first;\n    dice::Score second;\n    if (!first.bank(4) || !first.bank(5)) return 1;\n    if (first.points() != 9 || second.points() != 0) return 2;\n    if (first.bank(-1) || first.points() != 9) return 3;\n    if (!first.bank(3) || first.points() != 12) return 4;\n    if (first.bank(1) || first.points() != 12) return 5;\n    return 0;\n}"
    }
  }
};
