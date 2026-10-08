---
title: A05 — Write a calculation once
track: C++ Games — Start Here
trackOrder: 4
runtime: cpp
console: true
---

**Outcome:** Put a calculation in a function and use its returned value in a caller.

**Recall before looking at code:** Describe the remaining-points calculation in words before naming its inputs.

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

**Chapter gate:** create a new program without a completed example, read input, handle extraction failure, compute a result in a function and test a boundary. Record one bug you found and why your test exposed it. Continue to State and tests for references, collections and your first class, then Objects and files for construction and shared source files. The complete terminal game and graphics chapters are still being authored.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/can_roll.cpp -o lesson"
run "./lesson" stdin="4 5 12\n" stdout="result=1\n" without="result=0\n"
run "./lesson" stdin="4 8 12\n" stdout="result=0\n" without="result=1\n"
run "./lesson" stdin="5 8 12\n" stdout="result=0\n"
run "./lesson" stdin="1 2 4\n" stdout="result=1\n"
```

## Turn a request into cases {#transfer-plan}

A club needs a booking calculator: each visitor pays 4 credits; a group of at least 3 visitors receives 2 credits off the whole booking. Bookings contain 1 through 6 visitors. Invalid input must fail without quoting a price.

Before writing C++, make an input/expected-result table. Include the smallest booking, both sides of the discount boundary, the largest booking, an out-of-range number and a word. Calculate answers by hand: expectations come from the request, not whatever your program prints.

For 3 visitors the price is 3 × 4 − 2 = 10. The discount is not 2 per visitor. Predict the prices for 2 and 4 visitors before opening the next step.

Write three small jobs: read and validate, calculate, display. Finish one working calculation before adding decorations. This is a tiny backlog: an ordered list of work. Every C++ operation needed has already been taught; no loops or classes are required.



## Your turn — Deliver a booking calculator {#transfer-build}

**No solution is shown.** Create `practice/booking.cpp` yourself. Implement the club request from your table. Put the calculation in a function that returns an integer and does not print. Choose its name and parameters yourself. main reads one integer, rejects values outside 1 through 6 with exit 1 and no price line, otherwise prints price= followed by the result and returns 0. Token extraction is sufficient; whole-line validation comes later. Compare these examples with your predictions before running.

| Input | Required output |
|---|---|
| 1 | price=4 |
| 2 | price=8 |
| 3 | price=10 |
| 4 | price=14 |
| 6 | price=22 |
| 0 | exit=1 without="price=" |
| 7 | exit=1 without="price=" |
| word | exit=1 without="price=" |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/booking.cpp -o lesson
./lesson
```

```hints
nudge: Separate invalid requests from valid requests that receive no discount.
concept: Start with visitors times four; only the threshold branch changes that price.
shape: Return the calculated price from your function; perform input and output in main.
```


Hide the examples and add your own valid case. Trace input through validation, the call, the returned number and output. Deliberately change >= to > in your discount condition. Which case exposes it? Restore the rule. Compiler acceptance does not establish that the price is correct.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/booking.cpp -o lesson"
run "./lesson" stdin="1\n" stdout="price=4\n"
run "./lesson" stdin="2\n" stdout="price=8\n"
run "./lesson" stdin="3\n" stdout="price=10\n"
run "./lesson" stdin="4\n" stdout="price=14\n"
run "./lesson" stdin="6\n" stdout="price=22\n"
run "./lesson" stdin="0\n" exit=1 without="price="
run "./lesson" stdin="7\n" exit=1 without="price="
run "./lesson" stdin="word\n" exit=1 without="price="
```

## Your turn — Respond to a changed request {#transfer-change}

**No solution is shown.** Create `practice/booking.cpp` yourself. The club now supplies the per-visitor rate as a second integer, from 1 through 10. The visitor range and one 2-credit group discount stay the same. Update your existing booking.cpp, keeping calculation separate from input/output. A missing or invalid rate must return 1 without printing a price. Before editing, record which requirement changed, one new case and one old behavior that must survive. Old one-number input is intentionally replaced by two-number input; rate 4 must preserve the old prices.

| Input | Required output |
|---|---|
| 2 4 | price=8 |
| 3 4 | price=10 |
| 4 5 | price=18 |
| 3 1 | price=1 |
| 6 10 | price=58 |
| 2 0 | exit=1 without="price=" |
| 2 11 | exit=1 without="price=" |
| 2 | exit=1 without="price=" |
| 2 word | exit=1 without="price=" |
| 0 4 | exit=1 without="price=" |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/booking.cpp -o lesson
./lesson
```

```hints
nudge: Identify the fixed value that became input, and the unchanged rules.
concept: The calculation needs the new rate; validation must succeed for both inputs.
shape: Pass the rate into the function instead of keeping four inside its multiplication.
```


Review only your changed lines. Explain why both the function definition and its call changed. Rechecking rate 4 is a regression check: it protects behavior that should survive a change. Write three sentences: what you delivered, a mistake a case caught, and what you would do differently next time. After a break, explain the boundary and call without reopening the example. If stuck, revisit A04 decisions or A05 returned values, then retry. This is practice, not a verdict on your ability.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/booking.cpp -o lesson"
run "./lesson" stdin="2 4\n" stdout="price=8\n"
run "./lesson" stdin="3 4\n" stdout="price=10\n"
run "./lesson" stdin="4 5\n" stdout="price=18\n"
run "./lesson" stdin="3 1\n" stdout="price=1\n"
run "./lesson" stdin="6 10\n" stdout="price=58\n"
run "./lesson" stdin="2 0\n" exit=1 without="price="
run "./lesson" stdin="2 11\n" exit=1 without="price="
run "./lesson" stdin="2\n" exit=1 without="price="
run "./lesson" stdin="2 word\n" exit=1 without="price="
run "./lesson" stdin="0 4\n" exit=1 without="price="
```

