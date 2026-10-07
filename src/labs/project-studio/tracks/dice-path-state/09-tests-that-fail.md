---
title: A09 — Make the mistake visible
track: C++ Games — State and Tests
trackOrder: 4.1
runtime: cpp
console: true
---

**Outcome:** Write a test that both accepts correct behavior and rejects a known bug.

**Recall before looking at code:** Why would banking by replacement appear correct when the starting score is zero?

A bank operation that replaces 4 with 5 instead of adding 5 can look plausible on screen. A test must distinguish them. Use A06 references and A08 control flow to build a test executable: a normal C++ program whose exit status reports whether a claim held.

## Start with a failing test

Create tests/score_tests.cpp. A **specification** states the intended behavior: banking adds the amount to the existing score. A **test** sets up an input, runs the operation, and compares the actual result with an independently chosen expected result. != means “not equal.” This implementation is deliberately wrong.

```predict
question: Does this test executable succeed?
choice: No, exit status 1
choice: Yes, exit status 0
answer: No, exit status 1
explain: Replacement produces 5, which is not the specified 9.
```


**Edit `tests/score_tests.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=tests/score_tests.cpp
#include <iostream>
void bank(int& score, int amount) { score = amount; }
int main() {
    int score = 4;
    bank(score, 5);
    if (score != 9) {
        std::cerr << "expected 9, actual " << score << '\n';
        return 1;
    }
    return 0;
}
```

Run g++ -std=c++20 -Wall -Wextra -pedantic tests/score_tests.cpp -o lesson, then ./lesson. Read standard error: expected 9, actual 5. In PowerShell inspect $LASTEXITCODE immediately afterwards; on macOS/Linux use echo $?. It should be 1. The lesson check expects that failure, so its green result means the experiment behaved as predicted.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic tests/score_tests.cpp -o lesson"
run "./lesson" exit=1 stderr="expected 9, actual 5"
```

## Fix the operation, keep the expectation

Change assignment to addition-assignment inside bank. Do not change the expected value to make the test agree with a bug. A **unit test** exercises one small operation in isolation. Keeping this case after the fix makes it a **regression test**, guarding against the bug’s return.

**Edit `tests/score_tests.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=tests/score_tests.cpp
#include <iostream>
void bank(int& score, int amount) { score += amount; }
int main() {
    int score = 4;
    bank(score, 5);
    if (score != 9) {
        std::cerr << "expected 9, actual " << score << '\n';
        return 1;
    }
    return 0;
}
```

The actual value now equals 9, so the failure branch is skipped and main returns 0. Silence with status 0 means this case passed, not that every possible bank operation is correct.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic tests/score_tests.cpp -o lesson
./lesson
```

The program finishes without printing anything.


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic tests/score_tests.cpp -o lesson"
run "./lesson"
```

## An assertion abbreviates a claim

An **assertion** checks a boolean condition and terminates on failure when assertions are enabled. Include `<cassert>` for assert. Replace only the failure branch with assert(score == 9). Keep the call to bank outside the assertion: checking should not be responsible for performing the operation.

**Edit `tests/score_tests.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=tests/score_tests.cpp
#include <iostream>
#include <cassert>
void bank(int& score, int amount) { score += amount; }
int main() {
    int score = 4;
    bank(score, 5);
    assert(score == 9);
    return 0;
}
```

A failing assertion usually prints an expression and location; its exact exit status is platform dependent. Builds defining NDEBUG remove assert checks. We keep explicit comparisons in the independent test so it still detects failure in such a build.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic tests/score_tests.cpp -o lesson
./lesson
```

The program finishes without printing anything.


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic tests/score_tests.cpp -o lesson"
run "./lesson"
```

## Try it — A green result can be meaningless

Put the replacement bug back while using assert. Compile normally, run, and observe failure. Now compile with g++ -std=c++20 -DNDEBUG tests/score_tests.cpp -o lesson and run again: the assertion is disabled, so the broken operation is no longer checked. Restore += and rebuild without -DNDEBUG. A **test runner** starts test programs and interprets their exit statuses; it cannot rescue a program that never checks its result.



## Your turn — Write a test that can reject a result

**No solution is shown.** Create `practice/bank_test.cpp` yourself. Create a small bank function with the specified additive behavior. Your test program reads initial score, amount and expected result, calls bank, then prints PASS and exits 0 only if actual equals expected. Otherwise print FAIL and exit 1. Reject extraction failure with exit 2. Use explicit comparisons, not assert. These modest integer inputs avoid overflow. A deliberately incorrect expected value below verifies that your test can fail.

| Input | Required output | Exit status |
|---|---|---|
| 4 5 9 | PASS | 0 |
| 4 5 5 | FAIL | 1 |
| 7 2 9 | PASS | 0 |
| 0 3 3 | PASS | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/bank_test.cpp -o lesson
./lesson
```

```hints
nudge: Keep the expected result separate from the variable being changed.
concept: A test needs a failing exit path as well as a success path.
shape: Read three values, call bank on the first, compare against the third.
```


Now intentionally replace += with = in your own bank. Run 4 5 9: your test must print FAIL and exit 1. Run 0 3 3: that case passes even with the bug. Explain why testing only a zero initial score misses replacement. Restore +=. The author walkthrough also runs a replacement mutant; your own experiment demonstrates why your expectation matters.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/bank_test.cpp -o lesson"
run "./lesson" stdin="4 5 9\n" stdout="PASS\n" without="FAIL"
run "./lesson" stdin="4 5 5\n" stdout="FAIL\n" exit=1 without="PASS"
run "./lesson" stdin="7 2 9\n" stdout="PASS\n" without="FAIL"
run "./lesson" stdin="0 3 3\n" stdout="PASS\n" without="FAIL"
```

