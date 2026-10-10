#pragma once
// A tiny stand-in for GoogleTest, so the tests need nothing installed but a compiler.
// It has the same TEST, EXPECT_EQ, EXPECT_NE, EXPECT_LT, EXPECT_LE, EXPECT_GT, EXPECT_GE, EXPECT_NEAR,
// EXPECT_DOUBLE_EQ, EXPECT_TRUE, EXPECT_FALSE, ASSERT_EQ, ASSERT_TRUE and ASSERT_FALSE, and prints the same [ RUN ] / [ OK ] / [ FAILED ] lines, which is what Check my work reads. Include it in exactly one .cpp file per test
// program: it contains that program's main().
#include <cmath>
#include <iostream>
#include <type_traits>
#include <vector>

namespace minitest {
// Prints a value in a failure message. An enum (such as Action) can't go to std::cout
// directly, so it is printed as its number; anything else unprintable is described instead.
template <typename T>
auto show(std::ostream& out, const T& value, int) -> decltype(out << value, void()) {
    out << value;
}

template <typename T>
void show(std::ostream& out, const T& value, long) {
    if constexpr (std::is_enum_v<T>) {
        out << "value number " << static_cast<long long>(value);
    } else {
        out << "(a value that can't be printed)";
    }
}

template <typename T>
void show(std::ostream& out, const T& value) {
    show(out, value, 0);
}

struct Test {
    const char* name;
    void (*body)();
};

inline std::vector<Test>& all() {
    static std::vector<Test> tests;
    return tests;
}

inline bool& currentFailed() {
    static bool failed = false;
    return failed;
}

struct Register {
    Register(const char* name, void (*body)()) { all().push_back({name, body}); }
};
}  // namespace minitest

#define TEST(group, name)                                                              \
    static void group##_##name();                                                      \
    static minitest::Register group##_##name##_register(#group "." #name, group##_##name); \
    static void group##_##name()

#define EXPECT_EQ(actual, expected)                                                    \
    do {                                                                               \
        auto actualValue = (actual);                                                   \
        auto expectedValue = (expected);                                               \
        if (!(actualValue == expectedValue)) {                                         \
            std::cout << __FILE__ << ":" << __LINE__ << ": " << #actual << " is ";     \
            minitest::show(std::cout, actualValue);                                    \
            std::cout << ", expected ";                                                \
            minitest::show(std::cout, expectedValue);                                  \
            std::cout << "\n";                                                         \
            minitest::currentFailed() = true;                                          \
        }                                                                              \
    } while (0)

#define EXPECT_NE(actual, unwanted)                                                    \
    do {                                                                               \
        auto actualValue = (actual);                                                   \
        auto unwantedValue = (unwanted);                                               \
        if (actualValue == unwantedValue) {                                            \
            std::cout << __FILE__ << ":" << __LINE__ << ": " << #actual << " is ";     \
            minitest::show(std::cout, actualValue);                                    \
            std::cout << ", expected anything else\n";                                 \
            minitest::currentFailed() = true;                                          \
        }                                                                              \
    } while (0)

// One comparison between two values, such as actual < limit, reported with both values.
#define MINITEST_COMPARE(actual, op, limit, words)                                     \
    do {                                                                               \
        auto actualValue = (actual);                                                   \
        auto limitValue = (limit);                                                     \
        if (!(actualValue op limitValue)) {                                            \
            std::cout << __FILE__ << ":" << __LINE__ << ": " << #actual << " is ";     \
            minitest::show(std::cout, actualValue);                                    \
            std::cout << ", expected " words " ";                                      \
            minitest::show(std::cout, limitValue);                                     \
            std::cout << "\n";                                                         \
            minitest::currentFailed() = true;                                          \
        }                                                                              \
    } while (0)

#define EXPECT_LT(actual, limit) MINITEST_COMPARE(actual, <, limit, "less than")
#define EXPECT_LE(actual, limit) MINITEST_COMPARE(actual, <=, limit, "at most")
#define EXPECT_GT(actual, limit) MINITEST_COMPARE(actual, >, limit, "more than")
#define EXPECT_GE(actual, limit) MINITEST_COMPARE(actual, >=, limit, "at least")

// Decimal numbers are rarely exactly equal after arithmetic, so these allow a small difference.
#define EXPECT_NEAR(actual, expected, tolerance)                                       \
    do {                                                                               \
        double actualValue = (actual);                                                 \
        double expectedValue = (expected);                                             \
        if (!(std::fabs(actualValue - expectedValue) <= (tolerance))) {                \
            std::cout << __FILE__ << ":" << __LINE__ << ": " << #actual << " is "      \
                      << actualValue << ", expected " << expectedValue                 \
                      << " (within " << (tolerance) << ")\n";                          \
            minitest::currentFailed() = true;                                          \
        }                                                                              \
    } while (0)

#define EXPECT_DOUBLE_EQ(actual, expected)                                             \
    do {                                                                               \
        double expectedNumber = (expected);                                            \
        EXPECT_NEAR(actual, expectedNumber, 1e-12 * (1.0 + std::fabs(expectedNumber))); \
    } while (0)

#define EXPECT_TRUE(condition)                                                         \
    do {                                                                               \
        if (!(condition)) {                                                            \
            std::cout << __FILE__ << ":" << __LINE__ << ": " << #condition             \
                      << " is false, expected true\n";                                 \
            minitest::currentFailed() = true;                                          \
        }                                                                              \
    } while (0)

#define EXPECT_FALSE(condition)                                                        \
    do {                                                                               \
        if (condition) {                                                               \
            std::cout << __FILE__ << ":" << __LINE__ << ": " << #condition             \
                      << " is true, expected false\n";                                 \
            minitest::currentFailed() = true;                                          \
        }                                                                              \
    } while (0)

// The ASSERT_ checks are the EXPECT_ checks that also end the test at once when they fail, so
// the lines after them (reading coins[0], say) never run on something that isn't there.
#define ASSERT_EQ(actual, expected)                                                    \
    do {                                                                               \
        EXPECT_EQ(actual, expected);                                                   \
        if (minitest::currentFailed()) return;                                         \
    } while (0)

#define ASSERT_TRUE(condition)                                                         \
    do {                                                                               \
        EXPECT_TRUE(condition);                                                        \
        if (minitest::currentFailed()) return;                                         \
    } while (0)

#define ASSERT_FALSE(condition)                                                        \
    do {                                                                               \
        EXPECT_FALSE(condition);                                                       \
        if (minitest::currentFailed()) return;                                         \
    } while (0)

int main() {
    int failures = 0;
    for (const minitest::Test& test : minitest::all()) {
        std::cout << "[ RUN      ] " << test.name << "\n";
        minitest::currentFailed() = false;
        test.body();
        if (minitest::currentFailed()) {
            std::cout << "[  FAILED  ] " << test.name << "\n";
            ++failures;
        } else {
            std::cout << "[       OK ] " << test.name << "\n";
        }
    }
    std::cout << minitest::all().size() - failures << " of " << minitest::all().size() << " tests passed.\n";
    return failures == 0 ? 0 : 1;
}
