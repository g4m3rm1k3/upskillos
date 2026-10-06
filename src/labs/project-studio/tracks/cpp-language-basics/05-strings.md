---
title: 5 — Text: Building a Word Counter
track: C++ Foundations — Thinking in Types
runtime: cpp
reference: optional
console: true
---

Most real programs deal with text: names, commands, files, messages. This lesson builds `words`, a small cousin of the Unix `wc` tool, on top of a tested library of text functions.

The project is `words/`. Like the calculator, it has a library (`text.h` and `text.cpp`), a program (`main.cpp`), and a test program built from `tests/`. Each step brings a test file that describes a function, and you make the tests pass. That's how a lot of professional work feels: the specification arrives as tests.

## Step 1 — The project's build file

**This step: create the supplied `words/CMakeLists.txt`.**

It has the same shape as the calculator's: a program, `words`, and a test program, `text_tests`, both using `text.cpp`.

```cmake file=words/CMakeLists.txt provided
cmake_minimum_required(VERSION 3.20)
project(words LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(words main.cpp text.cpp)

# Every tests/*_test.cpp file becomes part of the test program.
file(GLOB TEST_SOURCES CONFIGURE_DEPENDS tests/*_test.cpp)
add_executable(text_tests ../testing/test_main.cpp ${TEST_SOURCES} text.cpp)
target_include_directories(text_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/../testing)

foreach(target words text_tests)
    if(MSVC)
        target_compile_options(${target} PRIVATE /W4)
    else()
        target_compile_options(${target} PRIVATE -Wall -Wextra -Wpedantic)
    endif()
endforeach()
```

```check
file words/CMakeLists.txt
```

## Step 2 — The library's interface

**This step: create the supplied `words/text.h` and read the three declarations.**

```cpp file=words/text.h provided
#pragma once

#include <string>
#include <vector>

// Returns a copy of text with every letter in lower case.
std::string to_lower(const std::string& text);

// Splits text into words. A word is a run of letters and digits; everything else separates words.
std::vector<std::string> split_words(const std::string& text);

// True if text reads the same backwards, ignoring case and anything that isn't a letter or digit.
bool is_palindrome(const std::string& text);
```

- `const std::string& text` means "give me access to the caller's string, **without copying it**, and I promise not to change it". It's the standard way to pass anything bigger than a number into a function that only reads it. You'll study references properly in lesson 7.
- `std::vector<std::string>` is a growable list of strings. You'll study `std::vector` in lesson 6; here you only need `push_back` (append) and `size()`.

```check
file words/text.h
```

## Step 3 — A placeholder main

**This step: create the supplied `words/main.cpp`.**

CMake refuses to configure a target whose source files don't exist, so `main.cpp` starts as a placeholder. You'll write the real program in step 8.

```cpp file=words/main.cpp provided
#include <iostream>

#include "text.h"

int main()
{
    // You will write the word counter here in step 8.
    return 0;
}
```

```check
file words/main.cpp
```

## Step 4 — The specification for to_lower

**This step: create the supplied `words/tests/to_lower_test.cpp` and read it.**

Four tests describe `to_lower`. Notice the last one: it checks that `to_lower` **doesn't change its argument**, which is exactly the promise `const std::string&` makes.

```cpp file=words/tests/to_lower_test.cpp provided
// Provided by the lesson.
#include "studio_test.hpp"

#include "text.h"

TEST(to_lower_changes_capitals)
{
    CHECK_EQ(to_lower("Hello World"), std::string("hello world"));
}

TEST(to_lower_leaves_other_characters_alone)
{
    CHECK_EQ(to_lower("C++ 20!"), std::string("c++ 20!"));
}

TEST(to_lower_of_empty_string_is_empty)
{
    CHECK_EQ(to_lower(""), std::string(""));
}

TEST(to_lower_does_not_modify_its_argument)
{
    const std::string original = "ABC";
    to_lower(original);
    CHECK_EQ(original, std::string("ABC"));
}
```

```check
file words/tests/to_lower_test.cpp
```

## Step 5 — Characters, one at a time

**This step: create `words/text.cpp` with `to_lower`, then configure, build and run the tests.**

A `std::string` is a sequence of `char`s, and a **range-based for loop** visits each one:

```cpp
for (char c : text) {        // c is a COPY of each character in turn
    std::cout << c;
}

for (char& c : result) {     // c REFERS to each character: assigning to c changes result
    c = '*';
}
```

The `<cctype>` header has character helpers: `std::tolower`, `std::toupper`, `std::isalpha`, `std::isdigit`, `std::isalnum`, `std::isspace`. They have a historical trap: give them an `unsigned char`, or characters outside plain ASCII cause undefined behaviour. The careful spelling is:

```cpp
c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
```

Plan: make a copy (`std::string result = text;`), change the copy's characters, return the copy.

```text
cmake -S words -B words/build -G "MinGW Makefiles"     (Windows)
cmake -S words -B words/build                          (macOS, Linux)
cmake --build words/build --target text_tests
./words/build/text_tests
```

```cpp file=words/text.cpp
#include "text.h"

#include <cctype>

std::string to_lower(const std::string& text)
{
    std::string result = text;
    for (char& c : result)
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return result;
}
```

```check
file words/build/CMakeCache.txt label="words/build has been configured" -- Run the configure command for your system, from the track folder.
run "cmake --build words/build --target text_tests" -- Is to_lower defined exactly as declared in text.h?
tests "./words/build/text_tests" require="to_lower_changes_capitals to_lower_does_not_modify_its_argument" -- Loop with char& so assigning changes the copy. Change a copy of the text, not the text itself.
```

## Step 6 — The specification for split_words

**This step: create the supplied `words/tests/split_words_test.cpp` and read it.**

The rule: a word is a run of letters and digits (`std::isalnum`). Everything else (spaces, punctuation, tabs, newlines) separates words. So `"Hello, world!"` gives `{"Hello", "world"}`, and `"C++20"` gives `{"C", "20"}`. Find each rule in the tests.

```cpp file=words/tests/split_words_test.cpp provided
// Provided by the lesson.
#include "studio_test.hpp"

#include "text.h"

TEST(split_words_on_spaces_and_punctuation)
{
    const std::vector<std::string> words = split_words("Hello, world!");
    CHECK_EQ(words.size(), 2u);
    CHECK_EQ(words[0], std::string("Hello"));
    CHECK_EQ(words[1], std::string("world"));
}

TEST(split_words_ignores_repeated_separators)
{
    const std::vector<std::string> words = split_words("  one   two\tthree\n");
    CHECK_EQ(words.size(), 3u);
    CHECK_EQ(words[2], std::string("three"));
}

TEST(split_words_of_empty_text_is_empty)
{
    CHECK(split_words("").empty());
    CHECK(split_words(" ,.; ").empty());
}

TEST(split_words_keeps_digits)
{
    const std::vector<std::string> words = split_words("C++20 has 3 new things");
    CHECK_EQ(words.size(), 6u);
    CHECK_EQ(words[1], std::string("20"));
}
```

```check
file words/tests/split_words_test.cpp
```

## Step 7 — Splitting text into words

**This step: add `split_words` to `words/text.cpp` so the tests pass.**

Plan before you type:

- Keep a `std::string current` for the word being built.
- For each character: if it's a letter or digit, append it (`current += c;`). Otherwise, if `current` isn't empty, a word just ended: `words.push_back(current);` then `current.clear();`.
- **Predict:** with that plan, what happens to the last word in `"one two"`? The tests check it.

```cpp file=words/text.cpp
#include "text.h"

#include <cctype>

std::string to_lower(const std::string& text)
{
    std::string result = text;
    for (char& c : result)
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return result;
}

std::vector<std::string> split_words(const std::string& text)
{
    std::vector<std::string> words;
    std::string current;
    for (char c : text) {
        if (std::isalnum(static_cast<unsigned char>(c))) {
            current += c;
        } else if (!current.empty()) {
            words.push_back(current);
            current.clear();
        }
    }
    if (!current.empty())
        words.push_back(current);
    return words;
}
```

```check
run "cmake --build words/build --target text_tests"
tests "./words/build/text_tests" require="split_words_on_spaces_and_punctuation split_words_ignores_repeated_separators split_words_keeps_digits" -- Only push a word when current is not empty. After the loop, current may still hold the last word.
```

## Step 8 — A command-line word counter

**This step: write `words/main.cpp` so it counts lines, words and characters in its input.**

Read the input **a line at a time**:

```cpp
std::string line;
while (std::getline(std::cin, line)) {
    // line holds one line, without its newline
}
```

- `std::cin >> word` would skip every space and newline, so you couldn't count lines. `std::getline` reads everything up to the next newline.
- Characters are counted per line **without** the newline: `line.size()`.
- Words per line: `split_words(line).size()`.

For the input

```text
Hello world
C++ is fun
```

print

```text
lines: 2
words: 5
characters: 21
```

Try it on a real file: `Get-Content words/CMakeLists.txt | ./words/build/words` (PowerShell) or `./words/build/words < words/CMakeLists.txt` (macOS, Linux).

```cpp file=words/main.cpp
#include <iostream>
#include <string>

#include "text.h"

int main()
{
    std::size_t lines = 0;
    std::size_t words = 0;
    std::size_t characters = 0;
    std::string line;
    while (std::getline(std::cin, line)) {
        ++lines;
        characters += line.size();
        words += split_words(line).size();
    }
    std::cout << "lines: " << lines << '\n';
    std::cout << "words: " << words << '\n';
    std::cout << "characters: " << characters << '\n';
    return 0;
}
```

```check
run "cmake --build words/build --target words"
run "./words/build/words" stdin="Hello world\nC++ is fun\n" stdout="lines: 2\nwords: 5\ncharacters: 21" -- Count line.size() per line, and split_words(line).size() words.
run "./words/build/words" stdin="" stdout="lines: 0\nwords: 0\ncharacters: 0"
run "./words/build/words" stdin="one\n\n  two three  \n" stdout="lines: 3\nwords: 3\ncharacters: 16" -- An empty line is still a line.
```

## Step 9 — Predict: single quotes, double quotes

**This step: predict, then experiment. No file changes.**

You've written `'\n'`, `"lines: "`, `'a'` and `"Hello"`. The quotes aren't decoration: they make different types.

**Predict:** what do these print?

```cpp
std::cout << 'a' + 1 << '\n';
std::cout << std::string("a") + "b" << '\n';
```

### What happens

The first prints `98`. `'a'` is a `char`: one byte holding a **number** (97 in ASCII), and `'a' + 1` is integer arithmetic. That's why `std::tolower` can work on characters at all.

The second prints `ab`. `"a"` is a **string literal**: a fixed array of characters ending with a hidden `'\0'`. It becomes a `std::string` only when converted, here by `std::string("a")`, and `std::string` knows how to `+`. Two raw literals can't be added: `"Hello, " + "world"` doesn't compile.

## Step 10 — Challenge: palindromes

**This step: no code is given. Add `is_palindrome` to `words/text.cpp`.**

It's declared in `text.h`: true if the text reads the same forwards and backwards, **ignoring case and anything that isn't a letter or digit**. `"A man, a plan, a canal: Panama!"` is a palindrome.

A plan, if you want one: build a cleaned-up string of just the lower-cased letters and digits, then compare it with itself from both ends, moving inwards.

Careful with `std::size_t`: it's unsigned, so `j - 1` when `j` is 0 wraps round to an enormous number instead of becoming -1.

```cpp file=words/text.cpp
#include "text.h"

#include <cctype>

std::string to_lower(const std::string& text)
{
    std::string result = text;
    for (char& c : result)
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return result;
}

std::vector<std::string> split_words(const std::string& text)
{
    std::vector<std::string> words;
    std::string current;
    for (char c : text) {
        if (std::isalnum(static_cast<unsigned char>(c))) {
            current += c;
        } else if (!current.empty()) {
            words.push_back(current);
            current.clear();
        }
    }
    if (!current.empty())
        words.push_back(current);
    return words;
}

bool is_palindrome(const std::string& text)
{
    std::string letters;
    for (char c : text) {
        if (std::isalnum(static_cast<unsigned char>(c)))
            letters += static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    }
    std::size_t i = 0;
    std::size_t j = letters.size();
    while (i + 1 < j) {
        if (letters[i] != letters[j - 1])
            return false;
        ++i;
        --j;
    }
    return true;
}
```

```check
contains words/text.cpp "is_palindrome"
run "cmake --build words/build --target text_tests" -- The definition must match text.h: bool is_palindrome(const std::string& text)
```

## Step 11 — Your own tests

**This step: create `words/tests/palindrome_test.cpp` with at least three tests.**

Decide which inputs matter, and test them. Then run them.

```hints
nudge: Before writing any test, list the kinds of text `is_palindrome` has to handle. The requirement names three things it must ignore or treat specially.
concept: A useful test checks one thing, and its expected answer comes from the requirement, not from running your code. Good inputs sit where a mistake would show: a plain palindrome, a near miss that isn't one, capitals, punctuation and spaces, digits, and odd and even lengths.
shape: One `TEST(name)` per idea, each with a `CHECK` that states the expected answer:
~~~cpp
TEST(ignores_punctuation_and_spaces)
{
    CHECK(is_palindrome("Was it a car, or a cat I saw?"));
}
~~~
Include at least one `CHECK(!is_palindrome(...))`: a test where every answer is `true` would also pass for a function that always returns `true`.
```

```cpp file=words/tests/palindrome_test.cpp
#include "studio_test.hpp"

#include "text.h"

TEST(palindrome_word)
{
    CHECK(is_palindrome("racecar"));
}

TEST(not_a_palindrome)
{
    CHECK(!is_palindrome("rocket"));
}

TEST(palindrome_with_mixed_case)
{
    CHECK(is_palindrome("Noon"));
}
```

```check
matches words/tests/palindrome_test.cpp "(\bTEST\s*\([\s\S]*){3}" label="palindrome_test.cpp has at least three tests"
run "cmake --build words/build --target text_tests"
tests "./words/build/text_tests"
```

## Step 12 — The reviewer's tests

**This step: create the supplied `words/tests/palindrome_review_test.cpp`, run the tests, and fix `is_palindrome` if any fail.**

Click **Create provided words/tests/palindrome_review_test.cpp** above. If a reviewer's test fails, find the input your own tests missed, and fix `text.cpp`, not the reviewer's test.

```cpp file=words/tests/palindrome_review_test.cpp provided
// The reviewer's tests for is_palindrome. Do not edit them: make them pass.
#include "studio_test.hpp"

#include "text.h"

TEST(review_simple_palindromes)
{
    CHECK(is_palindrome("level"));
    CHECK(is_palindrome("abba"));
    CHECK(!is_palindrome("abc"));
}

TEST(review_ignores_case_and_punctuation)
{
    CHECK(is_palindrome("A man, a plan, a canal: Panama!"));
    CHECK(is_palindrome("Was it a car or a cat I saw?"));
    CHECK(!is_palindrome("Hello, world"));
}

TEST(review_edge_cases)
{
    CHECK(is_palindrome(""));
    CHECK(is_palindrome("x"));
    CHECK(is_palindrome("!!"));
    CHECK(!is_palindrome("ab"));
    CHECK(is_palindrome("12321"));
}
```

```check
file words/tests/palindrome_review_test.cpp
run "cmake --build words/build --target text_tests"
tests "./words/build/text_tests" require="review_ignores_case_and_punctuation review_edge_cases" -- Compare only letters and digits, lower-cased. Empty text, one character, and text with no letters at all are all palindromes.
```
