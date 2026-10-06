---
title: A04 — Exactly twelve must count
track: C++ Games — Start Here
trackOrder: 4
runtime: cpp
console: true
---

You can read a score. Now decide whether it has reached the target. A game that forgets equality can deny a legitimate win. You will test just below, exactly at and above a boundary, then combine conditions for a legal request.

## Choose one of two paths

`>=` compares two values and produces a boolean result: true or false. It includes equality. `else` provides the alternative when the if condition is false; exactly one of these bodies runs. The short input guard uses the same behavior as last lesson, with a single statement as its body.

```predict
question: At score 12, should score >= 12 choose win?
choice: Yes
choice: No
answer: Yes
explain: At least twelve includes twelve itself. The boundary is part of the rule.
```


**Edit `explore/decisions.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/decisions.cpp
#include <iostream>
int main() {
    int score = 0;
    if (!(std::cin >> score)) return 1;
    if (score >= 12) {
        std::cout << "status=win\n";
    } else {
        std::cout << "status=play\n";
    }
    return 0;
}
```

| Score | score >= 12 | Output |
|---|---|---|
| 11 | false | status=play |
| 12 | true | status=win |
| 13 | true | status=win |

This is a threshold experiment, not the full game state: eventually a roll can win using score plus pot.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/decisions.cpp -o lesson
./lesson
```

Type `12` and press Enter.

Expected output:

```text
status=win
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/decisions.cpp -o lesson"
run "./lesson" stdin="12\n" stdout="status=win\n"
```

## Both conditions must hold

`bool` holds true or false. `&&` means both operands must be true. In this experiment a pot must lie from one through eleven inclusive; it is a range check, not the complete game's legal-action rule. By default the output stream prints booleans as 1 for true and 0 for false.

C++ stops evaluating `&&` as soon as the left side is false, because the combined result is already known. This is called short-circuit evaluation.

**Edit `explore/range.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/range.cpp
#include <iostream>
int main() {
    int pot = 0;
    if (!(std::cin >> pot)) return 1;
    bool positive = pot > 0;
    bool within_limit = pot <= 11;
    bool valid = positive && within_limit;
    std::cout << "valid=" << valid << '\n';
    return 0;
}
```

With pot=5, positive is true and within_limit is true, so valid is true. With pot=0, positive is false; with pot=12, within_limit is false. In both invalid cases valid is false. Read the expression as two separate questions before combining them.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/range.cpp -o lesson
./lesson
```

Type `5` and press Enter.

Expected output:

```text
valid=1
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/range.cpp -o lesson"
run "./lesson" stdin="5\n" stdout="valid=1\n"
```

## Either failure can reject a request

`||` means at least one condition is true. It stops evaluating once its left side is true. Compare an invalid low value OR an invalid high value. `!outside` would invert the result. Do not confuse logical OR with the single vertical bar used for a different operation later.

Equality is written `==`; assignment is written `=`. Never use assignment when you intend a comparison.

**Edit `explore/outside.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/outside.cpp
#include <iostream>
int main() {
    int pot = 0;
    if (!(std::cin >> pot)) return 1;
    bool outside = pot <= 0 || pot > 11;
    std::cout << "outside=" << outside << '\n';
    return 0;
}
```

For pot=12 the low test is false but the high test is true, making outside true. For pot=5 both are false. The two separate programs should report opposite booleans for the same input.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/outside.cpp -o lesson
./lesson
```

Type `12` and press Enter.

Expected output:

```text
outside=1
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/outside.cpp -o lesson"
run "./lesson" stdin="12\n" stdout="outside=1\n"
```

## Try it — Find the smallest failing case

Change >= to > in explore/decisions.cpp and run with 11, 12 and 13. Only twelve exposes the mistake. Restore >=.

Change && to || in explore/range.cpp and try zero and twelve. Explain why at least one condition passes for either input even though neither belongs in the allowed range. Restore &&. These are boundary tests: examples at the point where a decision changes.



## Your turn — Distinguish below, exact and above

**No solution is shown.** Create `practice/classify.cpp` yourself. Read a score and a target, both positive integers. Print exactly one labelled category. You can put another if inside an else, or write `else if`: it tests a second condition only when the first failed. Bad extraction returns 1. The target comes from input, not a hardcoded twelve.

| Input | Required output |
|---|---|
| 11 12 | result=below |
| 12 12 | result=exact |
| 13 12 | result=above |
| 7 7 | result=exact |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/classify.cpp -o lesson
./lesson
```

```hints
nudge: Exactly one output is needed, so connect the alternatives.
concept: Equality is a separate case between less than and greater than.
shape: Read both values, test less than, then equality, with the remaining branch handling greater than.
```


Choose a different target and supply your own just-below, exact and just-above cases. Explain why many ordinary below-target tests would miss an equality bug.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/classify.cpp -o lesson"
run "./lesson" stdin="11 12\n" stdout="result=below\n" without="result=exact"
run "./lesson" stdin="12 12\n" stdout="result=exact\n" without="result=above"
run "./lesson" stdin="13 12\n" stdout="result=above\n" without="result=below"
run "./lesson" stdin="7 7\n" stdout="result=exact\n"
```

