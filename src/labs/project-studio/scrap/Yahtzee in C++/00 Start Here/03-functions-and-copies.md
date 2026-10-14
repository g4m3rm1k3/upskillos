---
title: 0.3 — A rule you can call and test
runtime: cpp
console: true
teaches: functions, parameters, return, local copies, scope
experiments: Predict, trace, change, check
support: tests/pair_points.cpp
---

### The story so far

The loop counts matching faces; your independent facePoints function assigns points to one face. We now name the rule inside the game and follow one call.

### What this lesson builds

Extract Sixes scoring without changing the result, then write a score rule for a different game.

## Extract a rule without creating a header {#step-1}

**Build:** replace the counter with a points accumulator. The rule is still in main.cpp, above its caller.

```cpp file=main.cpp
#include <iostream>

int sixPoints(int face) {
    if (face == 6) return 6;
    return 0;
}

int main() {
    int dice[5] = {3, 1, 6, 6, 2};
    int score = 0;
    for (int i = 0; i < 5; ++i) {
        score += sixPoints(dice[i]);
    }
    std::cout << "Score: " << score << '\n';
    return 0;
}
```

**Understand:** in `int sixPoints(int face)`, the first int is the result type, sixPoints is the name, and int face declares a parameter. A **parameter** is the function's local input name; an **argument** is the value supplied by a call. The body between braces is the definition. A call such as sixPoints(dice[2]) evaluates to the returned integer.

| Expression | Parameter inside call | Return | score after += |
|---|---:|---:|---:|
| sixPoints(dice[0]) | 3 | 0 | 0 |
| sixPoints(dice[1]) | 1 | 0 | 0 |
| sixPoints(dice[2]) | 6 | 6 | 6 |
| sixPoints(dice[3]) | 6 | 6 | 12 |
| sixPoints(dice[4]) | 2 | 0 | 12 |

`score += result` adds result to the current score. return exits sixPoints, then the loop continues. It does not exit main.

> **Engineer:** keep the calculation separate from output. A returned integer can be used by a terminal, a graphical interface or a test without changing the rule.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Score: 12" label="Observe the result"
```

## One call has its own local object {#local-copy}

**Build:** isolate parameter assignment in scratch/copy.cpp. A scratch file has its own main and is compiled on its own; it is not another source of the game executable.

```predict
question: changedCopy assigns 1 to its int parameter. What happens to the caller's die?
choice: It remains 6
choice: It becomes 1
answer: It remains 6
explain: The int parameter is a separate object initialized from the argument value.
```

```cpp file=scratch/copy.cpp
#include <iostream>

int changedCopy(int face) {
    face = 1;
    return face;
}
int main() {
    int die = 6;
    int result = changedCopy(die);
    std::cout << "result=" << result << " die=" << die << '\n';
    return 0;
}
```

**Understand:** main's die exists before the call. Calling changedCopy creates face and initializes it with 6. Assigning face = 1 changes only that local object. return copies the result out; face's lifetime ends. result becomes 1 while die remains 6.

```text
caller                  call
 die [6]  -- copy -->     face [6]
 die [6]                 face [1]
 result [1] <-- return -- face [1] (then ends)
```

This is **pass by value**. **Scope** describes where a name can be used; **lifetime** describes when its object exists. They are related but different concepts.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/copy.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="result=1 die=6" label="Observe the result"
```

## Try it — Return is not print {#step-2}

In sixPoints, temporarily replace return 6 with std::cout << 6. A matching face now prints a six, then reaches return 0. The final score is wrong even though you see sixes on screen. Restore return 6 and rerun the check.

Ask what would happen if the caller assigned `die = changedCopy(die)`: the function still does not mutate die, but the caller chooses to assign the returned value. The next lesson compares that with a helper permitted to change the caller's object directly.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Score: 12" label="Observe the result"
```

## Read the acceptance cases {#acceptance-cases}

**Build:** a test program that calls your code with inputs you do not choose.

Define `int pairPoints(int first, int second)`: matching legal faces score their sum; unequal faces score zero. Cases 3/3 → 6, 2/5 → 0, 6/6 → 12. Write a rule, not a table of these examples.

The test is supplied so you can concentrate on the function. `expect(condition, caseNumber)` exits with status 1 when the condition is false; a comment beside each numbered case says what it checks. The test owns `main`; your practice source must define the requested function without another main. The declaration above the test's main tells its compiler the function's signature; the linker will connect it to your definition. You will study that boundary fully in the header lesson.

Use **Create provided file** here to create the test. Read the first case aloud as input → expected result. The test does not prove every possible input, so add a case of your own after it passes.

```cpp file=tests/pair_points.cpp provided
#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
int pairPoints(int first, int second);
int main() {
    expect(pairPoints(3, 3) == 6, 1); // matching pair
    expect(pairPoints(2, 5) == 0, 2); // unequal pair
    expect(pairPoints(6, 6) == 12, 3); // double six
    expect(pairPoints(1, 1) == 2, 4); // double one
    expect(pairPoints(5, 2) == 0, 5); // argument order
    std::cout << "PASS: pair_points\n";
}
```

```check
file tests/pair_points.cpp
```

## Your turn — A different dice rule {#step-3}

**Build, on your own:** Define `int pairPoints(int first, int second)`: matching legal faces score their sum; unequal faces score zero. Cases 3/3 → 6, 2/5 → 0, 6/6 → 12. Write a rule, not a table of these examples.

Write **practice/pair_points.cpp**. Do not change the supplied test to make it pass. Give this a real attempt before revealing hints. Compile and run the checks. Explain what each case rules out, then add a case of your own.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/pair_points.cpp practice/pair_points.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: pair_points" label="All acceptance cases pass"
```

```hints
nudge: Which branch decides whether any points are earned?
concept: Use the same input → decision → returned result structure as sixPoints.
shape: Compare the two arguments; return their sum only when equal, and zero on the other path.
```
