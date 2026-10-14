---
title: 0.1 — Values, statements and your first build
runtime: cpp
console: true
teaches: int, initialization, assignment, output, compilation
experiments: Predict, trace, change, check
support: tests/remaining.cpp
---

### The story so far

ready.cpp proved the compiler starts. Now we work in main.cpp, the file that will grow into the first game.

### What this lesson builds

Calculate a score from two known faces, rebuild after an edit, and explain why a stored result does not update itself.

## A program can say nothing {#entry-point}

**Build:** create main.cpp with this entry function.

```cpp file=main.cpp
int main() {
    return 0;
}
```
`int` means the function returns a whole number. `main` is the entry point. `()` gives this version no named parameters. Braces enclose its body. `return 0;` ends the function with success; it does not print zero. The semicolon ends the statement.

Run the two commands separately: `g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson`, then `./lesson`. No output is the expected result. `-o` names the executable; the warning flags ask the compiler to report suspicious code.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" label="Observe the result"
```

## Make a result you can predict {#step-1}

**Build:** keep the entry point; add two values and an output line. We use fixed faces so we can reason without random variation.

```predict
question: first is 6 and second is 2. What value is stored in total?
choice: 8
choice: 62
answer: 8
explain: Both operands are ints. + adds their values; it does not join text.
```

```cpp file=main.cpp
#include <iostream>

int main() {
    int first = 6;
    int second = 2;
    int total = first + second;
    std::cout << "Total: " << total << '\n';
    return 0;
}
```

**Understand:** `int first = 6` creates an integer object named first and initializes it to 6. `first + second` reads their current values, adds them, and initializes a separate total object. `#include <iostream>` supplies standard output declarations. `std::` chooses a name in the standard-library namespace. `cout <<` sends values to the output stream. Chaining << sends several values; `'\n'` is a newline character.

| Statement just executed | first | second | total |
|---|---:|---:|---:|
| int first = 6 | 6 | not created | not created |
| int second = 2 | 6 | 2 | not created |
| int total = first + second | 6 | 2 | 8 |

Compile, then run. Expect `Total: 8`. The compiler checks language rules; the run check checks this output. Neither establishes that a future scoring rule is correct.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Total: 8" label="Observe the result"
```

## A stored answer is not a formula {#stored-answer}

**Build:** assign a new value to first after computing total.

```cpp file=main.cpp
#include <iostream>

int main() {
    int first = 6;
    int second = 2;
    int total = first + second;
    first = 3;
    std::cout << "Total: " << total << '\n';
    return 0;
}
```

**Understand:** initialization creates an object; assignment changes an existing object. Here first becomes 3 but total still holds 8. There is no ongoing connection between the names. Draw three boxes; change only first's box on the assignment.

To update total, execute `total = first + second;` after the change. Unlike a spreadsheet formula, a C++ expression is evaluated when execution reaches it.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Total: 8" label="Observe the result"
```

## Try it — Find the first diagnostic {#step-2}

Remove the semicolon after `first = 3` and compile. The first diagnostic may point at the following output line: the cause can be just before the highlighted location. Restore the semicolon and build successfully.

Now change 3 to 4 but run ./lesson before recompiling. You are still running the old executable. Rebuild and explain why this particular output still stays 8 even after rebuilding: total was calculated earlier. Restore 3 so the next step starts from the shown state.

> **Engineer:** distinguish three questions: did the source save, did the build succeed, and did the program calculate the right thing?

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic main.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="Total: 8" label="Observe the result"
```

## Give a calculation a name {#named-calculation}

**Build:** try one named calculation in scratch/needed.cpp before writing your own.

```cpp file=scratch/needed.cpp
#include <iostream>
int doublePoints(int points) {
    return points + points;
}
int main() {
    std::cout << doublePoints(4) << '\n';
    return 0;
}
```

**Understand:** int before doublePoints declares the result type. int points names an input parameter. Calling doublePoints(4) supplies 4 for that parameter; return sends 8 back to the call site, where cout prints it. The function definition appears before its caller so its name and signature are known. This is the same return idea as main, but the caller uses the result rather than treating it as an exit status. Lesson 0.3 will trace calls and local copies in more depth.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/needed.cpp -o lesson" label="Build lesson" -- Save the changed source, then read the first compiler diagnostic.
run "./lesson" stdout="8" label="Observe the result"
```

## Read the acceptance cases {#acceptance-cases}

**Build:** a test program that calls your code with inputs you do not choose.

Define `int remaining(int score, int target)`. Return target minus score, allowing a negative answer when the score exceeds the target. Examples: 8/12 → 4, 12/12 → 0, 15/12 → -3.

Read the test vocabulary before the supplied code: `==` compares two values (unlike assignment with `=`); the result has type `bool`, whose values are `true` and `false`. `void` means expect returns no value. `if (!condition)` runs its braced body only when condition is false: `!` means logical not. `std::cerr` is the error-output stream. `std::exit(1)`, declared by cstdlib, ends the entire program with failure status 1. The integer caseNumber identifies which expectation failed. Text after `//` is a comment for readers and has no runtime effect. For example, remaining(8, 12) is 4, so `4 == 4` is true and the failure body is skipped.

The test is supplied so you can concentrate on the function. `expect(condition, caseNumber)` exits with status 1 when the condition is false; a comment beside each numbered case says what it checks. The test owns `main`; your practice source must define the requested function without another main. The declaration above the test's main tells its compiler the function's signature; the linker will connect it to your definition. You will study that boundary fully in the header lesson.

Use **Create provided file** here to create the test. Read the first case aloud as input → expected result. The test does not prove every possible input, so add a case of your own after it passes.

```cpp file=tests/remaining.cpp provided
#include <iostream>
#include <cstdlib>

void expect(bool condition, int caseNumber) {
    if (!condition) { std::cerr << "FAIL: " << caseNumber << '\n'; std::exit(1); }
}
int remaining(int score, int target);
int main() {
    expect(remaining(8, 12) == 4, 1); // below target
    expect(remaining(12, 12) == 0, 2); // exact target
    expect(remaining(15, 12) == -3, 3); // over target
    expect(remaining(2, 9) == 7, 4); // target is an input
    std::cout << "PASS: remaining\n";
}
```

```check
file tests/remaining.cpp
```

## Your turn — Calculate the remaining score {#step-3}

**Build, on your own:** Define `int remaining(int score, int target)`. Return target minus score, allowing a negative answer when the score exceeds the target. Examples: 8/12 → 4, 12/12 → 0, 15/12 → -3.

Write **practice/remaining.cpp**. Do not change the supplied test to make it pass. Give this a real attempt before revealing hints. Compile and run the checks. Explain what each case rules out, then add a case of your own.

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic tests/remaining.cpp practice/remaining.cpp -o exercise_result" label="Build practice" -- Save the changed source, then read the first compiler diagnostic.
run "./exercise_result" stdout="PASS: remaining" label="All acceptance cases pass"
```

```hints
nudge: Start with the difference between the two input values.
concept: A return expression sends a calculated integer back to the caller; it does not print it.
shape: Write int remaining(int score, int target) with a body returning the difference, and no main in this file.
```
