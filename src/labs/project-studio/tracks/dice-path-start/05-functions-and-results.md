---
title: A05 — Write a calculation once
track: C++ Games — Start Here
trackOrder: 4
runtime: cpp
console: true
---

A scoreboard needs remaining points for more than one player. Duplicating a calculation gives you several places to fix later. You will name the calculation, call it with different data, and distinguish returning an answer from printing a message.

## A function returns to its caller

Define points_needed above main so the compiler has seen it before a call. `int` before its name is the return type. Inside the parentheses, score and target are **parameters**, local names for the call's inputs. In points_needed(4, 12), four and twelve are the **arguments**, the values you supply. A comma separates them.

A definition describes the work; its body runs when called. `return target - score` sends a value back to the caller.

```predict
question: Does defining points_needed above main immediately subtract anything?
choice: No
choice: Yes
answer: No
explain: Defining describes the operation. Each call supplies values and executes the body.
```


**Edit `explore/functions.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/functions.cpp
#include <iostream>
int points_needed(int score, int target) {
    return target - score;
}
int main() {
    std::cout << "first=" << points_needed(4, 12) << '\n';
    std::cout << "second=" << points_needed(9, 12) << '\n';
    return 0;
}
```

| Call | Local score | Local target | Returned value |
|---|---|---|---|
| points_needed(4, 12) | 4 | 12 | 8 |
| points_needed(9, 12) | 9 | 12 | 3 |

Each call has its own local parameters. Execution pauses in main, runs the function, then resumes where its result is needed. The **call stack** records active calls; a **frame** holds one call's local state. Trace this file in CodeLens if a supported C++ debugger is installed; otherwise follow the table.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/functions.cpp -o lesson
./lesson
```

Expected output:

```text
first=8
second=3
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/functions.cpp -o lesson"
run "./lesson" stdout="first=8\nsecond=3\n"
```

## Returning is not printing

Store a returned value, then multiply it before printing. `*` multiplies numbers. The function did not need to know how the caller planned to use its answer.

A function can print as well, but output is a side effect: an observable action separate from its returned value. Our calculation intentionally only returns.

**Edit `explore/functions.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/functions.cpp
#include <iostream>
int points_needed(int score, int target) {
    return target - score;
}
int main() {
    int missing = points_needed(4, 12);
    std::cout << "double=" << missing * 2 << '\n';
    return 0;
}
```

points_needed returns 8. That value initializes missing. The caller multiplies it by 2, then prints 16. If the function only printed 8, there would be no returned number to use in this expression. Keeping calculation separate from display makes later tests and graphical views possible.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/functions.cpp -o lesson
./lesson
```

Expected output:

```text
double=16
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/functions.cpp -o lesson"
run "./lesson" stdout="double=16\n"
```

## A returned boolean answers a question

Now use a bool return type. `false` and `true` are boolean literals. can_bank answers one question: is the pot positive and the game unfinished? Its parameters are inputs, not the actual game object. This function is a small rule experiment that we can test before building the full game.

```predict
question: With pot 3 but finished true, is banking available?
choice: No
choice: Yes
answer: No
explain: A positive pot is insufficient after the match has ended.
```


**Edit `explore/bank.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/bank.cpp
#include <iostream>
bool can_bank(int pot, bool finished) {
    return pot > 0 && !finished;
}
int main() {
    std::cout << "live=" << can_bank(3, false) << '\n';
    std::cout << "over=" << can_bank(3, true) << '\n';
    return 0;
}
```

For the first call, pot > 0 is true and !finished is true. For the second, !finished is false. Output is 1 then 0. A caller could use the returned boolean as an if condition rather than printing it.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/bank.cpp -o lesson
./lesson
```

Expected output:

```text
live=1
over=0
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/bank.cpp -o lesson"
run "./lesson" stdout="live=1\nover=0\n"
```

## Try it — Follow a local name

In explore/functions.cpp rename the score parameter to banked and change its use in the body. The calls do not change: callers provide values, not the spelling of the parameter name.

Try referring to missing inside points_needed. It was declared inside main and is not visible there. The region in which a name can be used is its **scope**. Restore the working file. You will explore copying and references in the next foundations chapter.



## Your turn — Answer a different rule question

**No solution is shown.** Create `practice/can_roll.cpp` yourself. Write a bool function named can_roll taking score, pot and target as integers. Inputs have score and pot from 0 through 20 and target from 1 through 30. Return true only while score plus pot is below target. In main read the three values and print the function's result with result=. This is a threshold exercise; the complete game will also track whose turn it is.

| Input | Required output |
|---|---|
| 4 5 12 | result=1 |
| 4 8 12 | result=0 |
| 5 8 12 | result=0 |
| 1 2 4 | result=1 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/can_roll.cpp -o lesson
./lesson
```

```hints
nudge: Ask the rule question in the function, not in the output statement.
concept: Reaching the target exactly ends the opportunity to roll.
shape: Return a comparison of the sum against target; call that function with extracted inputs.
```


With your code hidden, trace one call and explain the parameter values, returned value and caller's use of it. The behavioral check does not prove you organized your answer as a function; point to the definition and call yourself.

**Chapter gate:** create a new program without a completed example, read input, handle extraction failure, compute a result in a function and test a boundary. Record one bug you found and why your test exposed it. Later chapters—references, classes, a structured project, the complete game and graphics—are still being authored; this is the end of the new foundations chapter, not the whole path.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/can_roll.cpp -o lesson"
run "./lesson" stdin="4 5 12\n" stdout="result=1\n" without="result=0\n"
run "./lesson" stdin="4 8 12\n" stdout="result=0\n" without="result=1\n"
run "./lesson" stdin="5 8 12\n" stdout="result=0\n"
run "./lesson" stdin="1 2 4\n" stdout="result=1\n"
```

