---
title: A02 — Make the score a calculation
track: C++ Games — Start Here
trackOrder: 4
runtime: cpp
console: true
---

A real game cannot store every possible scoreboard as a separate message. It stores values and calculates what to print. You will make that change, then investigate a calculation that behaves differently from Python.

## A name holds a value

Create an `explore` folder inside dice-lab for small experiments, then `explore/values.cpp`. These experiments remain separate from the eventual game.

`int score = 4;` creates a named whole-number object and initializes it to four. **Initialization** gives a new object its first value. A **type** determines the kinds of values and operations available. Unlike Python's growing integers, C++ int has a bounded range; our small scores fit.

The single-quoted `'\n'` is one newline character. Chaining `<<` writes the label, then the current value, then the newline.

**Edit `explore/values.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/values.cpp
#include <iostream>
int main() {
    int score = 4;
    std::cout << "score=" << score << '\n';
    return 0;
}
```

The word score inside quotes would be literal text. The unquoted name score reads the object's value. Change the initial value to six, predict, run and restore four.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/values.cpp -o lesson
./lesson
```

Expected output:

```text
score=4
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/values.cpp -o lesson"
run "./lesson" stdout="score=4\n"
```

## Assignment changes an existing value

`score = score + 3` reads the old value on the right, computes a new value and assigns it to the object on the left. It is not a mathematical claim that four equals seven.

```predict
question: After starting at 4 and assigning score + 3, what is stored?
choice: 7
choice: 3
answer: 7
explain: The right-hand calculation uses the old four, then replaces it with seven.
```


**Edit `explore/values.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/values.cpp
#include <iostream>
int main() {
    int score = 4;
    score = score + 3;
    std::cout << "score=" << score << '\n';
    return 0;
}
```

| Operation | Stored score |
|---|---|
| Initialize | 4 |
| Calculate 4 + 3 | still 4 while calculating |
| Assign result | 7 |

`score += 3;` is a shorter addition-assignment spelling for this simple variable. Try it and compare, then keep either correct form.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/values.cpp -o lesson
./lesson
```

Expected output:

```text
score=7
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/values.cpp -o lesson"
run "./lesson" stdout="score=7\n"
```

## Protect a value that should not change

`const int target` creates a whole-number value that this code cannot subsequently assign to. The target stays twelve while the player's score changes. `remaining` receives the result of subtraction; it is not a formula that automatically recalculates later.

**Edit `explore/remaining.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/remaining.cpp
#include <iostream>
int main() {
    const int target = 12;
    int score = 4;
    int remaining = target - score;
    std::cout << "remaining=" << remaining << '\n';
    return 0;
}
```

The order is: initialize target, initialize score, evaluate 12 - 4, initialize remaining with 8, print 8. If you later change score, remaining still holds its earlier result until you explicitly recompute it.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/remaining.cpp -o lesson
./lesson
```

Expected output:

```text
remaining=8
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/remaining.cpp -o lesson"
run "./lesson" stdout="remaining=8\n"
```

## The operands choose the division

A `double` stores an approximation to a real number. Write the following experiment, but commit to the prediction before running it. `3` is an integer literal; `3.0` is a floating-point literal.

```predict
question: What is 3 / 4 when both operands are integers?
choice: 0
choice: 0.75
answer: 0
explain: Integer division discards the fractional part. At least one floating-point operand is needed here.
```


**Edit `explore/division.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/division.cpp
#include <iostream>
int main() {
    int whole = 3 / 4;
    double fraction = 3.0 / 4.0;
    std::cout << "whole=" << whole << '\n';
    std::cout << "fraction=" << fraction << '\n';
    return 0;
}
```

Three divided by four has zero whole units left in its integer result. `3.0 / 4.0` uses floating-point division and yields 0.75. Declaring the destination double does not repair integer division that already happened: `double x = 3 / 4;` stores zero. We avoid dividing by zero.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/division.cpp -o lesson
./lesson
```

Expected output:

```text
whole=0
fraction=0.75
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/division.cpp -o lesson"
run "./lesson" stdout="whole=0\nfraction=0.75\n"
```

## Try it — Predict a stale calculation

In explore/remaining.cpp, assign score = 9 after calculating remaining but before printing. Predict the output, then run: remaining still stores eight. Move the calculation below the assignment and it becomes three. Restore the original experiment.

Try assigning to target and read the compiler error; then remove that assignment. Explain when const prevented a mistake and when execution order caused one.



## Your turn — Calculate a small report

**No solution is shown.** Create `practice/report.cpp` yourself. Create the practice folder. Declare a constant target of 12 and a score of 9; compute the remaining points. Also compute three divided by four as a fraction. Print the labelled results. You have not learned input yet, so this task uses fixed starting data.

**Required output:**

```text
remaining=3
fraction=0.75
```


Build and run using the commands below. This program takes no input and should finish by itself.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/report.cpp -o lesson
./lesson
```

```hints
nudge: Separate the two calculations from the labels you print.
concept: The type of the operands matters before a result is assigned.
shape: Subtract score from target and use a floating-point operand for the ratio.
```


After the check, independently change the score to four and explain why remaining becomes eight. Restore nine for the check. Output checks alone cannot distinguish a calculation from memorized text in this fixed-data exercise; your changed-data experiment is part of completion.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/report.cpp -o lesson"
run "./lesson" stdout="remaining=3\nfraction=0.75\n"
```

