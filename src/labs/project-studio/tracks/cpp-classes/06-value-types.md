---
title: 6 — Value Semantics: Design Your Own Type
track: Classes and Abstraction
runtime: cpp
reference: optional
console: true
---

`Fraction`, `std::string` and `int` behave alike: copy one and you get an independent twin; compare two and you compare what they *mean*. These are **value types**, and C++ is built around them. `Channel` and `Notifier` are different: they're used through references and pointers, and copying one makes little sense.

Most of the classes you write should be value types. This lesson names what makes one good, and then you design one yourself, from requirements and tests alone: the capstone of this track.

## Step 1 — A regular type in ten lines

**This step: create `values/version.cpp`. Build and run it.**

```cpp
struct Version {
    int major = 0;
    int minor = 0;
    int patch = 0;

    auto operator<=>(const Version&) const = default;
};
```

Defaulted `<=>` compares `major`, then `minor`, then `patch`: exactly right for version numbers, where the members really are most significant first. (In lesson 2 the same default was wrong for Fraction, whose value depends on both members together.) Declaring a defaulted `<=>` also gives you a defaulted `==`.

Add an `operator<<` that prints `1.2.3`, and a `main` that:

1. sorts `{1, 10, 0}`, `{1, 2, 3}`, `{2, 0, 0}`, `{1, 2, 10}` and prints them, one per line;
2. copies `Version installed {1, 2, 3}`, changes the copy's `patch` to 4, and prints `installed 1.2.3, copy 1.2.4`;
3. prints `update available: true` if `installed` is less than the newest release.

```text
g++ -std=c++20 -Wall -Wextra values/version.cpp -o values/version
./values/version
```

**Predict:** does `1.2.10` sort before or after `1.10.0`? (Sorting the *strings* would put `1.10.0` first.)

### A regular type

`Version` is what's called a **regular** type, behaving like an `int`:

- it can be **default-constructed** and **copied**, and a copy is **independent**;
- a copy **compares equal** to the original;
- `==` and `<` agree with each other and mean what the value means.

The standard library assumes those properties: `std::sort`, `std::map` and `std::find` all work with Version for free. The rule of zero from the memory track gives you the copying; `= default` gives you the comparisons.

```cpp file=values/version.cpp
// Version numbers as a value type: compare them, sort them, copy them.
#include <algorithm>
#include <compare>
#include <iostream>
#include <vector>

struct Version {
    int major = 0;
    int minor = 0;
    int patch = 0;

    // Compare major, then minor, then patch: exactly what = default does.
    auto operator<=>(const Version&) const = default;
};

std::ostream& operator<<(std::ostream& out, const Version& v)
{
    return out << v.major << '.' << v.minor << '.' << v.patch;
}

int main()
{
    std::vector<Version> releases {{1, 10, 0}, {1, 2, 3}, {2, 0, 0},
                                   {1, 2, 10}};
    std::sort(releases.begin(), releases.end());
    for (const Version& v : releases)
        std::cout << v << '\n';

    Version installed {1, 2, 3};
    Version copy = installed;                 // an independent copy
    copy.patch = 4;
    std::cout << "installed " << installed << ", copy " << copy << '\n';
    std::cout << "update available: " << std::boolalpha
              << (installed < releases.back()) << '\n';
    return 0;
}
```

```check
matches values/version.cpp "operator<=>[^;{]*=\s*default" label="Version's <=> is defaulted"
run "g++ -std=c++20 -Wall -Wextra -Werror values/version.cpp -o values/version"
run "./values/version" stdout="1.2.3\n1.2.10\n1.10.0\n2.0.0" label="releases sort by number, not as text"
run "./values/version" stdout="installed 1.2.3, copy 1.2.4\nupdate available: true" label="the copy is independent"
```

## Step 2 — The project's build file

**This step: create the supplied `money/CMakeLists.txt`.**

A library, `money.cpp`, and its test program. Everything else in this project is yours to design.

```cmake file=money/CMakeLists.txt provided
cmake_minimum_required(VERSION 3.20)
project(money LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Every tests/*_test.cpp file becomes part of the test program.
file(GLOB TEST_SOURCES CONFIGURE_DEPENDS tests/*_test.cpp)
add_executable(money_tests ../testing/test_main.cpp ${TEST_SOURCES} money.cpp)
target_include_directories(money_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/../testing)

if(MSVC)
    target_compile_options(money_tests PRIVATE /W4)
else()
    target_compile_options(money_tests PRIVATE -Wall -Wextra -Wpedantic)
endif()
```

```check
file money/CMakeLists.txt
```

## Step 3 — Requirements

**This step: read the requirements, then create the supplied `money/tests/money_spec_test.cpp` and read it.**

Floating point can't hold `0.10` exactly: `0.1 + 0.2 == 0.3` is false. Money that drifts by a fraction of a cent is a bug report waiting to happen. Design a value type **`Money`** for amounts in one currency:

| Member | Requirement |
|---|---|
| `Money()` | zero |
| `static Money from_cents(long long)` | the only way to make an amount: `Money::from_cents(1234)` is 12.34 |
| `long long cents() const` | the amount in cents |
| `std::string to_string() const` | two decimals: `"12.34"`, `"7.00"`, `"0.05"`, and negatives like `"-0.05"` |
| `+=`, `-=`, `+`, `-` | exact arithmetic; amounts may go below zero |
| `==`, `<=>` | compare amounts, written with `= default` |
| `std::vector<Money> split(int parts) const` | shares that add up to **exactly** the amount, at most one cent apart, larger shares first: 10.00 in 3 is 3.34, 3.33, 3.33. A negative amount splits like a positive one, negated. Fewer than 1 part throws `std::invalid_argument` |
| `operator<<` | prints `to_string()` |

Design questions to settle before you write the header:

- **What do you store?** If the representation is chosen well, defaulted comparisons are automatically correct, as they were for Fraction's `==`.
- **Why `from_cents` instead of a constructor `Money(long long)`?** Would `Money(5)` be five dollars or five cents? A named function makes the unit impossible to misread. A private constructor can still do the work behind it.

```cpp file=money/tests/money_spec_test.cpp provided
// Provided by the lesson: the specification for Money.
#include "studio_test.hpp"

#include <algorithm>
#include <sstream>
#include <stdexcept>
#include <vector>

#include "money.h"

TEST(default_money_is_zero)
{
    Money nothing;
    CHECK_EQ(nothing.cents(), 0);
    CHECK_EQ(nothing.to_string(), "0.00");
}

TEST(made_from_cents)
{
    CHECK_EQ(Money::from_cents(1234).cents(), 1234);
}

TEST(shows_two_decimal_places)
{
    CHECK_EQ(Money::from_cents(1234).to_string(), "12.34");
    CHECK_EQ(Money::from_cents(700).to_string(), "7.00");
    CHECK_EQ(Money::from_cents(5).to_string(), "0.05");
}

TEST(prints_to_a_stream)
{
    std::ostringstream out;
    out << Money::from_cents(250);
    CHECK_EQ(out.str(), "2.50");
}

TEST(adds_and_subtracts)
{
    const Money a = Money::from_cents(1050);
    const Money b = Money::from_cents(275);
    CHECK_EQ(a + b, Money::from_cents(1325));
    CHECK_EQ(a - b, Money::from_cents(775));
    Money total;
    total += a;
    total += b;
    total -= Money::from_cents(25);
    CHECK_EQ(total, Money::from_cents(1300));
}

TEST(compares_by_amount)
{
    CHECK(Money::from_cents(100) == Money::from_cents(100));
    CHECK(Money::from_cents(99) < Money::from_cents(100));
    CHECK(Money::from_cents(100) >= Money::from_cents(99));
    std::vector<Money> prices {Money::from_cents(500), Money::from_cents(20),
                               Money::from_cents(1999)};
    std::sort(prices.begin(), prices.end());
    CHECK_EQ(prices.front(), Money::from_cents(20));
    CHECK_EQ(prices.back(), Money::from_cents(1999));
}

TEST(copies_are_independent)
{
    Money original = Money::from_cents(100);
    Money copy = original;
    copy += Money::from_cents(1);
    CHECK_EQ(original, Money::from_cents(100));
    CHECK_EQ(copy, Money::from_cents(101));
}

TEST(splits_evenly)
{
    const std::vector<Money> shares = Money::from_cents(900).split(3);
    CHECK_EQ(shares.size(), 3u);
    for (const Money& share : shares)
        CHECK_EQ(share, Money::from_cents(300));
}

TEST(split_gives_leftover_cents_to_the_first_shares)
{
    const std::vector<Money> shares = Money::from_cents(1000).split(3);
    CHECK_EQ(shares.size(), 3u);
    CHECK_EQ(shares[0], Money::from_cents(334));
    CHECK_EQ(shares[1], Money::from_cents(333));
    CHECK_EQ(shares[2], Money::from_cents(333));
}

TEST(split_into_no_parts_is_rejected)
{
    CHECK_THROWS(Money::from_cents(100).split(0), std::invalid_argument);
}
```

```check
file money/tests/money_spec_test.cpp
```

## Step 4 — Design the class

**This step: no code is given. Create `money/money.h` declaring `Money` and its free operators.**

Everything you need has appeared in this track: private data, `const` members, a `static` member function, member compound operators with free binary ones, defaulted comparisons, and a free `operator<<`.

Your class must be a `class` with private data, its `<=>` must be `= default`, and it must declare `split(int)` and `from_cents`.

```cpp file=money/money.h
#pragma once

#include <compare>
#include <iosfwd>
#include <string>
#include <vector>

// An amount of money in one currency, stored as a whole number of
// cents so that adding never loses a fraction of a cent. A regular
// value type: copies are independent, and == and <=> compare amounts.
class Money {
public:
    Money() = default;                         // 0.00
    static Money from_cents(long long cents);

    long long cents() const { return cents_; }
    std::string to_string() const;             // "12.34", "-0.05"

    Money& operator+=(const Money& other);
    Money& operator-=(const Money& other);

    // Shares that add up to exactly this amount, larger shares first.
    std::vector<Money> split(int parts) const;

    bool operator==(const Money&) const = default;
    auto operator<=>(const Money&) const = default;

private:
    explicit Money(long long cents) : cents_(cents) {}

    long long cents_ = 0;
};

Money operator+(Money left, const Money& right);
Money operator-(Money left, const Money& right);
std::ostream& operator<<(std::ostream& out, const Money& money);
```

```check
matches money/money.h "class\s+Money\b" label="money.h defines class Money"
matches money/money.h "operator<=>[^;{]*=\s*default" label="<=> is defaulted"
matches money/money.h "static\s+Money\s+from_cents\s*\(" label="declares static Money from_cents(...)"
matches money/money.h "split\s*\(\s*int\b" label="declares split(int)"
```

## Step 5 — Implement it

**This step: create `money/money.cpp`. Then configure, build and run the tests.**

```text
cmake -S money -B money/build -G "MinGW Makefiles"     (Windows)
cmake -S money -B money/build                          (macOS, Linux)
```

```text
cmake --build money/build
./money/build/money_tests
```

For `split`, the integer operators do most of the work: `total / parts` is the size of a small share and `total % parts` is how many shares get one extra cent.

If a test fails and the reason isn't obvious, set a breakpoint in the function it calls (lldb `breakpoint set --name Money::split`, gdb `break Money::split`) and watch the numbers.

```cpp file=money/money.cpp
#include "money.h"

#include <ostream>
#include <stdexcept>

Money Money::from_cents(long long cents)
{
    return Money(cents);
}

std::string Money::to_string() const
{
    // Work with the size of the amount, and put the sign back in front:
    // -5 cents is "-0.05". (cents_ / 100 and cents_ % 100 would give
    // 0 and -5 here, and "0.-5".)
    const long long size = cents_ < 0 ? -cents_ : cents_;
    const long long whole = size / 100;
    const long long rest = size % 100;
    std::string text = cents_ < 0 ? "-" : "";
    text += std::to_string(whole) + '.';
    if (rest < 10)
        text += '0';
    text += std::to_string(rest);
    return text;
}

Money& Money::operator+=(const Money& other)
{
    cents_ += other.cents_;
    return *this;
}

Money& Money::operator-=(const Money& other)
{
    cents_ -= other.cents_;
    return *this;
}

std::vector<Money> Money::split(int parts) const
{
    if (parts < 1)
        throw std::invalid_argument("Money::split: parts must be 1 or more");
    const long long size = cents_ < 0 ? -cents_ : cents_;
    const long long sign = cents_ < 0 ? -1 : 1;
    const long long share = size / parts;
    const long long extra = size % parts;    // the first `extra` shares
                                             // get one more cent
    std::vector<Money> shares;
    for (int i = 0; i < parts; ++i)
        shares.push_back(Money(sign * (share + (i < extra ? 1 : 0))));
    return shares;
}

Money operator+(Money left, const Money& right)
{
    return left += right;
}

Money operator-(Money left, const Money& right)
{
    return left -= right;
}

std::ostream& operator<<(std::ostream& out, const Money& money)
{
    return out << money.to_string();
}
```

```check
file money/build/CMakeCache.txt label="money/build has been configured" -- Run the configure command for your system, from the track folder.
run "cmake --build money/build" -- Define every member and free function declared in money.h.
tests "./money/build/money_tests" require="shows_two_decimal_places split_gives_leftover_cents_to_the_first_shares copies_are_independent" -- to_string pads cents below 10 with a 0. split gives the first total % parts shares one extra cent.
```

## Step 6 — Your own tests

**This step: create `money/tests/money_test.cpp` with at least three tests of your own.**

Before you look at the reviewer's tests, try to break your own class. The requirements mention negative amounts twice. Did the specification test either?

```hints
nudge: Read the requirements table again and look for every place it mentions negative amounts. Which of those did the specification's tests try?
concept: The cases worth testing are the ones where a plausible implementation goes wrong. For `to_string`, that's an amount under one unit: -5 cents has a whole part of 0, and 0 has no sign, so a version that prints the whole part and the cents separately loses the minus. For `split`, it's an amount that doesn't divide evenly, and a negative one.
shape: Work out each expected value by hand from the requirements before you build:
~~~cpp
TEST(small_negative_amount_keeps_its_sign)
{
    CHECK_EQ(Money::from_cents(-5).to_string(), "-0.05");
}
~~~
Then a negative split, for example -10.00 in 3 parts, which the table says splits like 10.00, negated.
```

```cpp file=money/tests/money_test.cpp
// My own tests for Money.
#include "studio_test.hpp"

#include <vector>

#include "money.h"

TEST(split_into_one_part_is_the_whole_amount)
{
    const std::vector<Money> shares = Money::from_cents(1234).split(1);
    CHECK_EQ(shares.size(), 1u);
    CHECK_EQ(shares[0], Money::from_cents(1234));
}

TEST(large_amounts_show_every_digit)
{
    CHECK_EQ(Money::from_cents(123456789).to_string(), "1234567.89");
}

TEST(adding_zero_changes_nothing)
{
    CHECK_EQ(Money::from_cents(42) + Money(), Money::from_cents(42));
}
```

```check
matches money/tests/money_test.cpp "(\bTEST\s*\([\s\S]*){3}" label="money_test.cpp has at least three tests"
run "cmake --build money/build"
tests "./money/build/money_tests"
```

## Step 7 — The reviewer's tests

**This step: create the supplied `money/tests/money_review_test.cpp`, run the tests, and fix `money.cpp` until they all pass.**

The two classic bugs in a money type are both about negative numbers, and both come from C++'s integer division, which **rounds toward zero**:

```text
-5 / 100  is  0     -5 % 100  is  -5     so "0.-5" or "0.0-5"
-1000 / 3 is -333   -1000 % 3 is  -1     so no share gets an extra cent
```

A common fix for both: work with the size of the amount, and put the sign back at the end.

When everything passes, you've designed a regular value type from a specification, and found its edge cases. That's the core skill of class design: decide what promises the type makes, choose a representation that makes them easy to keep, and test the promises, especially at the edges.

**Where next:** the next tracks make types like these generic (`Stack<T>`, templates and concepts), and measure the data structures built from them.

```cpp file=money/tests/money_review_test.cpp provided
// The reviewer's tests for Money. Do not edit them: make them pass.
#include "studio_test.hpp"

#include <stdexcept>
#include <vector>

#include "money.h"

TEST(review_negative_amounts_show_their_sign_once)
{
    CHECK_EQ(Money::from_cents(-5).to_string(), "-0.05");
    CHECK_EQ(Money::from_cents(-1230).to_string(), "-12.30");
    CHECK_EQ(Money::from_cents(-100).to_string(), "-1.00");
}

TEST(review_subtraction_can_go_below_zero)
{
    const Money owed = Money::from_cents(500) - Money::from_cents(750);
    CHECK_EQ(owed.cents(), -250);
    CHECK(owed < Money());
}

TEST(review_negative_amounts_split_like_positive_ones)
{
    const std::vector<Money> shares = Money::from_cents(-1000).split(3);
    CHECK_EQ(shares.size(), 3u);
    CHECK_EQ(shares[0], Money::from_cents(-334));
    CHECK_EQ(shares[1], Money::from_cents(-333));
    CHECK_EQ(shares[2], Money::from_cents(-333));
}

TEST(review_more_parts_than_cents)
{
    const std::vector<Money> shares = Money::from_cents(2).split(5);
    CHECK_EQ(shares.size(), 5u);
    CHECK_EQ(shares[0], Money::from_cents(1));
    CHECK_EQ(shares[1], Money::from_cents(1));
    CHECK_EQ(shares[4], Money());
}

TEST(review_split_shares_always_add_up)
{
    for (long long cents : {0LL, 1LL, 99LL, 1001LL, -7LL, 123457LL}) {
        for (int parts = 1; parts <= 7; ++parts) {
            Money total;
            for (const Money& share : Money::from_cents(cents).split(parts))
                total += share;
            CHECK_EQ(total, Money::from_cents(cents));
        }
    }
}

TEST(review_negative_parts_are_rejected)
{
    CHECK_THROWS(Money::from_cents(100).split(-2), std::invalid_argument);
}
```

```check
file money/tests/money_review_test.cpp
run "cmake --build money/build"
tests "./money/build/money_tests" require="review_negative_amounts_show_their_sign_once review_negative_amounts_split_like_positive_ones review_split_shares_always_add_up" -- Integer / and % round toward zero: work with the absolute amount, then apply the sign.
```
