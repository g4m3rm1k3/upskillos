---
title: A06 — Which score did you change?
track: C++ Games — State and Tests
trackOrder: 4.1
runtime: cpp
console: true
---

**Outcome:** Choose between copying a value, mutating the caller, and borrowing read-only.

**Recall before looking at code:** What happens to a function’s local names after it returns?

The scoreboard says 4. Your bank function adds 5, but the scoreboard still says 4. This section explains that bug, then builds toward a score object that protects its own rules. Finish A05 first: you need parameters, return values and conditions. Select the same dice-lab folder for this chapter; chapter folder selections are remembered separately. All files here are C++.

## A parameter gets its own value

Create explore/references.cpp. A **value parameter** is a separate local object initialized from the argument. Draw two boxes, main.score and add.score, each initially containing 4. The += operation changes only the box named inside add.

The return type **void** means the function returns no value. Its job here is attempted mutation: changing stored data. A function reaching its closing brace returns to its caller.

```predict
question: After add returns, what does main print?
choice: score=4
choice: score=9
answer: score=4
explain: The parameter is a copy; main.score was never assigned.
```


**Edit `explore/references.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/references.cpp
#include <iostream>
void add(int score, int amount) {
    score += amount;
}
int main() {
    int score = 4;
    add(score, 5);
    std::cout << "score=" << score << '\n';
    return 0;
}
```

During the call add.score goes from 4 to 9. That local copy ceases to exist when the call finishes. The caller keeps its 4. This is correct C++ executing the wrong design for our intended bank operation.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/references.cpp -o lesson
./lesson
```

Expected output:

```text
score=4
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/references.cpp -o lesson"
run "./lesson" stdout="score=4\n"
```

## Give the function access to the original

Change only int score to int& score in the parameter list. A **reference** is another name for an existing object; **alias** means two names denote that same object. Here & belongs to the type declaration. Draw one box with two labels instead of two boxes. The argument must be a suitable existing integer, not a computed temporary such as 4 + 5.

**Edit `explore/references.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/references.cpp
#include <iostream>
void add(int& score, int amount) {
    score += amount;
}
int main() {
    int score = 4;
    add(score, 5);
    std::cout << "score=" << score << '\n';
    return 0;
}
```

add.score now names main.score. The addition changes the caller to 9. No result is returned: the observable result is mutation. References do not keep a local object alive after its scope ends; never return a reference to a function-local score.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/references.cpp -o lesson
./lesson
```

Expected output:

```text
score=9
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/references.cpp -o lesson"
run "./lesson" stdout="score=9\n"
```

## Borrow for reading

Add read_score before main and call it in the print expression. const int& is a reference through which this function may not change the integer. It accepts a const integer too. The return type is int, so the caller receives a value copy. For a tiny integer a value parameter would usually be simpler; the distinction becomes useful for larger objects.

**Edit `explore/references.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/references.cpp
#include <iostream>
void add(int& score, int amount) {
    score += amount;
}
int read_score(const int& score) {
    return score;
}
int main() {
    int score = 4;
    add(score, 5);
    std::cout << "score=" << read_score(score) << '\n';
    return 0;
}
```

The const promise applies to this access path. It does not freeze every other name for the object. Our add function may still change score before the query.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/references.cpp -o lesson
./lesson
```

Expected output:

```text
score=9
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/references.cpp -o lesson"
run "./lesson" stdout="score=9\n"
```

## Try it — Read the compiler objection

Temporarily put score = 0; inside read_score. Compile and locate the diagnostic about assigning to a read-only reference. Remove that assignment and rebuild. Then call read_score with const int frozen = 7; and print the result. Explain why a read-only query can accept frozen but add(frozen, 2) cannot. Restore the guided version before continuing.



## Your turn — Bank for only the second player

**No solution is shown.** Create `practice/transfer.cpp` yourself. Write transfer with two reference parameters. Given three integers first, second and pot, transfer the pot into second and empty the pot. Preserve first. Inputs are distinct objects with values from 0 to 20, so addition fits int. This is a transfer exercise, not the full game legality rule.

| Input | Required output | Exit status |
|---|---|---|
| 4 7 5 | first=4 second=12 pot=0 | 0 |
| 9 2 0 | first=9 second=2 pot=0 | 0 |
| 1 3 8 | first=1 second=11 pot=0 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/transfer.cpp -o lesson
./lesson
```

```hints
nudge: Track which object each argument names.
concept: Both the score and pot must change in the caller.
shape: Add the pot into the score before assigning zero to the pot.
```


Hide the reference and point to the two aliases during a call. Explain why transfer(first, first) would violate this exercise’s distinct-object precondition. Preconditions are requirements the caller must satisfy; later interfaces will prevent more invalid calls.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/transfer.cpp -o lesson"
run "./lesson" stdin="4 7 5\n" stdout="first=4 second=12 pot=0\n"  without="first=9 second=2 pot=0\n"
run "./lesson" stdin="9 2 0\n" stdout="first=9 second=2 pot=0\n"  without="first=4 second=12 pot=0\n"
run "./lesson" stdin="1 3 8\n" stdout="first=1 second=11 pot=0\n"  without="first=4 second=12 pot=0\n"
```

