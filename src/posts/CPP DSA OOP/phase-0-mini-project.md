# Phase 0 Mini-Project: Three Scripts, Rewritten in C++

*Confidence check — apply Lessons 0.1 through 0.6 together, for real, before Phase 1 starts.*

---

## Why this exists

Every lesson so far taught you one idea in isolation. This project has no new material in it at all — its only job is to make you *use* static types, explicit pass-by-value vs. pass-by-reference, `const`, and real `{ }` control flow together, on your own, without a worked example walking you through it line by line. If you can do these three comfortably, Phase 0 has done its job and you're ready for memory (Phase 1) — where the stakes start getting real.

Do these in order. Each one leans slightly harder on the lessons than the last.

---

## 1. Temperature Converter

**The Python you're translating:**

```python
def celsius_to_fahrenheit(c):
    return c * 9 / 5 + 32

def fahrenheit_to_celsius(f):
    return (f - 32) * 5 / 9

temp = float(input("Enter a temperature: "))
unit = input("Is this C or F? ").upper()

if unit == "C":
    print(f"{temp}C = {celsius_to_fahrenheit(temp)}F")
elif unit == "F":
    print(f"{temp}F = {fahrenheit_to_celsius(temp)}C")
else:
    print("Unknown unit")
```

**Do this yourself first.** Before looking at the reference below, decide and write down:
- What type should each function's parameter and return value be? (Lesson 0.2)
- Should the parameters be pass-by-value or pass-by-reference? (Lesson 0.4 — think about *why*: these are single numbers, not big objects, so which one actually makes sense here?)
- Where, if anywhere, does `const` belong? (Lesson 0.6)

Then write the full program, compile it with `g++`, and run it against a few values you can check by hand (0°C should give 32°F; 100°C should give 212°F).

<details>
<summary>Reference solution (check yours against this after you've written your own)</summary>

```cpp
#include <iostream>

double celsiusToFahrenheit(double c) {
    return c * 9 / 5 + 32;
}

double fahrenheitToCelsius(double f) {
    return (f - 32) * 5 / 9;
}

int main() {
    double temp;
    char unit;

    std::cout << "Enter a temperature: ";
    std::cin >> temp;
    std::cout << "Is this C or F? ";
    std::cin >> unit;

    if (unit == 'C' || unit == 'c') {
        std::cout << temp << "C = " << celsiusToFahrenheit(temp) << "F" << std::endl;
    } else if (unit == 'F' || unit == 'f') {
        std::cout << temp << "F = " << fahrenheitToCelsius(temp) << "C" << std::endl;
    } else {
        std::cout << "Unknown unit" << std::endl;
    }

    return 0;
}
```

**Why pass-by-value here, no `const&` needed:** a `double` is 8 bytes — smaller than a reference itself would cost on most systems. Passing by reference would buy you nothing and only adds noise. This is worth sitting with: `const T&` from Lesson 0.6 is a tool for *avoiding copies of expensive things* (strings, and later, whole objects) — using it reflexively on primitive types like `int` or `double` is a beginner habit worth breaking now, before Phase 2 gives you real objects worth protecting.

</details>

---

## 2. FizzBuzz

**The Python you're translating:**

```python
def fizzbuzz(n):
    result = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            result.append("FizzBuzz")
        elif i % 3 == 0:
            result.append("Fizz")
        elif i % 5 == 0:
            result.append("Buzz")
        else:
            result.append(str(i))
    return result

for line in fizzbuzz(20):
    print(line)
```

**Decide before writing:**
- The Python version builds and returns a `list` of strings. C++ doesn't have Python's `list` — you have `std::vector<std::string>` (you'll build your *own* version of this from scratch starting Phase 1, but for now, just use the real one from `<vector>`).
- Should `fizzbuzz(n)` take `n` by value or reference? (Same reasoning as above — it's a single `int`.)
- Since this function only *reads* `n` and never modifies it, is there any reason to mark it `const`? Think back to Lesson 0.6's actual point: `const` matters most on *reference* parameters. Does that apply here?

<details>
<summary>Reference solution</summary>

```cpp
#include <iostream>
#include <vector>
#include <string>

std::vector<std::string> fizzbuzz(int n) {
    std::vector<std::string> result;
    for (int i = 1; i <= n; i++) {
        if (i % 15 == 0) {
            result.push_back("FizzBuzz");
        } else if (i % 3 == 0) {
            result.push_back("Fizz");
        } else if (i % 5 == 0) {
            result.push_back("Buzz");
        } else {
            result.push_back(std::to_string(i));
        }
    }
    return result;
}

int main() {
    std::vector<std::string> lines = fizzbuzz(20);
    for (const std::string& line : lines) {
        std::cout << line << std::endl;
    }
    return 0;
}
```

**Notice the range-based for loop:** `for (const std::string& line : lines)`. This *is* a case where `const&` earns its keep — `line` is a `std::string`, not a primitive, so copying it 20 times (once per iteration) would be genuinely wasteful, and the loop only reads each line, never modifies it. Compare this against the `double` parameter above: same keyword, applied only where it actually buys something. That judgment call — not the syntax — is the real skill.

</details>

---

## 3. Word Counter

**The Python you're translating:**

```python
def word_count(text):
    words = text.split()
    return len(words)

def most_common_word(text):
    words = text.lower().split()
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    best = max(counts, key=counts.get)
    return best, counts[best]

text = "the quick brown fox jumps over the lazy dog the fox runs"
print("Word count:", word_count(text))
word, count = most_common_word(text)
print(f"Most common: '{word}' ({count} times)")
```

This one is the real test — it needs a container that maps strings to counts, which is `std::map<std::string, int>` (an ordered map; `std::unordered_map` also works and is closer in spirit to Python's `dict` — either is fine here, and the difference between them is Phase 8's whole subject, so don't worry about which is "correct" yet).

**Decide before writing:**
- `word_count` and `most_common_word` both take a chunk of text to read, never to modify. What should that parameter type and pass-mechanism be? (This is the clearest `const std::string&` case you've hit yet — a potentially large string, read-only, passed into a function. Get this one right and Lesson 0.6 has fully landed.)
- Python's `text.split()` doesn't exist as one call in C++ — you'll need a small loop using a `std::stringstream` (a tool that lets you read words out of a string one at a time, separated by whitespace, similar to how you'd read from a file — a first, small taste of `<fstream>`-style thinking that's coming properly in Phase 2's file-I/O checkpoint).

<details>
<summary>Reference solution</summary>

```cpp
#include <iostream>
#include <sstream>
#include <string>
#include <map>

int wordCount(const std::string& text) {
    std::stringstream ss(text);
    std::string word;
    int count = 0;
    while (ss >> word) {
        count++;
    }
    return count;
}

std::string toLower(const std::string& s) {
    std::string result = s;
    for (char& c : result) {
        c = std::tolower(c);
    }
    return result;
}

int main() {
    std::string text = "the quick brown fox jumps over the lazy dog the fox runs";

    std::cout << "Word count: " << wordCount(text) << std::endl;

    std::string lowered = toLower(text);
    std::stringstream ss(lowered);
    std::string word;
    std::map<std::string, int> counts;

    while (ss >> word) {
        counts[word]++;
    }

    std::string bestWord;
    int bestCount = 0;
    for (const auto& pair : counts) {
        if (pair.second > bestCount) {
            bestWord = pair.first;
            bestCount = pair.second;
        }
    }

    std::cout << "Most common: '" << bestWord << "' (" << bestCount << " times)" << std::endl;

    return 0;
}
```

**Two things worth noticing here, both callbacks:**
- `for (char& c : result)` uses a *non-const* reference — deliberately, because this loop needs to *modify* each character in place (Lesson 0.4's pass-by-reference, applied to loop variables, not just function parameters — the exact same mechanism).
- `counts[word]++` silently creates a new entry with value `0` the first time a word is seen, then increments it — `std::map`'s version of Python's `dict.get(w, 0) + 1` pattern, but built into the `[]` operator itself.

</details>

---

## Confidence check

Before moving on to Phase 1, you should be able to answer these without looking back at the lessons:

1. Why did the temperature converter's parameters *not* need `const&`, while the word counter's did?
2. What would go wrong — be specific — if `fizzbuzz`'s `for (const std::string& line : lines)` were changed to `for (std::string line : lines)` (dropping both `const` and `&`)? (Nothing breaks — but explain, in terms of Lesson 0.3's "boxes," exactly what extra work the program would now be doing on every single iteration.)
3. In the word counter, `toLower` returns a brand-new `std::string` rather than modifying its input in place. Given everything from Lesson 0.6, why was the parameter `const std::string& s` and *not* just `std::string& s`?

If you can answer all three with confidence, you're ready for Phase 1 — where we stop letting the standard library's `std::vector` and `std::string` do the memory management for you, and build a resizable array completely from scratch.

---

**Next up: Phase 1, Lesson 1.1 — The stack vs. the heap** (why Python never made you think about this). This is the real start of the curriculum — everything in Phase 0 was runway.
