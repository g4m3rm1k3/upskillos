#ifndef MINITEST_H
#define MINITEST_H

// A tiny test helper for this series.
//   TEST(Group, Name) { ... }   defines one test
//   EXPECT_EQ(actual, expected) records a failure when the two differ
// It also supplies main(), so include it in exactly one .cpp file per test program.

#include <iostream>
#include <string>
#include <vector>

namespace minitest {

struct Case {
    std::string group;
    std::string name;
    void (*run)();
};

inline std::vector<Case>& registry() {
    static std::vector<Case> cases;
    return cases;
}

inline int& failuresInCurrentTest() {
    static int count = 0;
    return count;
}

struct Registrar {
    Registrar(const char* group, const char* name, void (*run)()) {
        registry().push_back({group, name, run});
    }
};

}  // namespace minitest

#define TEST(Group, Name)                                                  \
    static void Group##_##Name##_body();                                   \
    static minitest::Registrar Group##_##Name##_registrar(                 \
        #Group, #Name, Group##_##Name##_body);                             \
    static void Group##_##Name##_body()

#define EXPECT_EQ(actual, expected)                                        \
    do {                                                                   \
        auto minitest_a = (actual);                                        \
        auto minitest_e = (expected);                                      \
        if (!(minitest_a == minitest_e)) {                                 \
            ++minitest::failuresInCurrentTest();                           \
            std::cout << "  " << __FILE__ << ":" << __LINE__               \
                      << ": expected " << #actual << " to equal "          \
                      << minitest_e << " but it was " << minitest_a        \
                      << "\n";                                             \
        }                                                                  \
    } while (0)

int main() {
    auto& cases = minitest::registry();
    std::cout << "[==========] Running " << cases.size() << " tests.\n";

    int failedTests = 0;
    for (const auto& c : cases) {
        std::string fullName = c.group + "." + c.name;
        std::cout << "[ RUN      ] " << fullName << "\n";
        minitest::failuresInCurrentTest() = 0;
        c.run();
        if (minitest::failuresInCurrentTest() == 0) {
            std::cout << "[       OK ] " << fullName << "\n";
        } else {
            std::cout << "[  FAILED  ] " << fullName << "\n";
            ++failedTests;
        }
    }

    std::cout << "[==========] " << cases.size() << " tests ran.\n";
    if (failedTests == 0) {
        std::cout << "[  PASSED  ] " << cases.size() << " tests.\n";
        return 0;
    }
    std::cout << "[  FAILED  ] " << failedTests << " tests.\n";
    return 1;
}

#endif
