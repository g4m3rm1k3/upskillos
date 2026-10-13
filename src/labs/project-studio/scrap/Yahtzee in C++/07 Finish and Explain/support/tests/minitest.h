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

// Remembers the last character the program wrote to std::cout. A test of code that prints a
// prompt such as "? " leaves the line unfinished, and the [ OK ] marker must start a line of its
// own for Check my work to read it.
class LastCharBuf : public std::streambuf {
public:
    explicit LastCharBuf(std::streambuf* target) : inner(target) {}
    char last = '\n';

protected:
    int overflow(int c) override {
        if (c != traits_type::eof()) {
            last = static_cast<char>(c);
        }
        return inner->sputc(static_cast<char>(c));
    }
    std::streamsize xsputn(const char* text, std::streamsize n) override {
        if (n > 0) {
            last = text[n - 1];
        }
        return inner->sputn(text, n);
    }
    int sync() override { return inner->pubsync(); }

public:
    std::streambuf* target() const { return inner; }

private:
    std::streambuf* inner;
};

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
    minitest::LastCharBuf tracker(std::cout.rdbuf());
    std::cout.rdbuf(&tracker);
    auto& cases = minitest::registry();
    std::cout << "[==========] Running " << cases.size() << " tests.\n";

    int failedTests = 0;
    for (const auto& c : cases) {
        std::string fullName = c.group + "." + c.name;
        std::cout << "[ RUN      ] " << fullName << "\n";
        minitest::failuresInCurrentTest() = 0;
        c.run();
        if (tracker.last != '\n') {
            std::cout << "\n";
        }
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
        std::cout.rdbuf(tracker.target());
        return 0;
    }
    std::cout << "[  FAILED  ] " << failedTests << " tests.\n";
    std::cout.rdbuf(tracker.target());
    return 1;
}

#endif
