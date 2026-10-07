---
title: A10 — Let the score protect its rule
track: C++ Games — State and Tests
trackOrder: 4.1
runtime: cpp
console: true
---

**Outcome:** Protect an invariant with private state and a small public interface.

**Recall before looking at code:** Can an ordinary public integer prevent a caller assigning a negative score?

A public Player.score can become -3 even though negative points violate the intended rule. Now build a class whose callers can query points and request a change, but cannot overwrite the stored integer. A07 records and A09 explicit tests are prerequisites. This is a narrow interface exercise; the full game will also check turn ownership and terminal state.

## An integer type cannot express the whole rule

Create explore/score_class.cpp. This legal assignment demonstrates the problem. An **invariant** is a condition an object promises to preserve whenever callers can observe it. Our score should begin at zero and never decrease through banking. The type int permits negative values, so it cannot enforce that promise alone.

**Edit `explore/score_class.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/score_class.cpp
#include <iostream>
struct Score {
    int points = 0;
};
int main() {
    Score score;
    score.points = -3;
    std::cout << score.points << '\n';
    return 0;
}
```

The compiler accepts -3 because it is a valid int. Domain rules are more specific than language types. We need control over the operations that change the data.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/score_class.cpp -o lesson
./lesson
```

Expected output:

```text
-3
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/score_class.cpp -o lesson"
run "./lesson" stdout="-3\n"
```

## Expose a query, keep storage private

A **class** defines a type with data and operations. private: prevents ordinary callers from naming points_. The underscore is just our naming convention. public: exposes the operations below it. points() is a **method**, a function called on an object. const after its parentheses promises not to modify ordinary members through this method. It returns an int copy.

```predict
question: Can main assign first.points_ = -3 now?
choice: No, compilation rejects it
choice: Yes, it remains a public integer
answer: No, compilation rejects it
explain: The storage is private; callers must use the public interface.
```


**Edit `explore/score_class.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/score_class.cpp
#include <iostream>
class Score {
private:
    int points_ = 0;
public:
    int points() const { return points_; }
};
int main() {
    Score first;
    Score second;
    std::cout << first.points() << " " << second.points() << '\n';
    return 0;
}
```

Both objects start at zero independently. struct and class can both have methods and access labels; their default access differs (public for struct, private for class). Explicit labels make our intention clear. Access control is a compiler rule, not protection against malicious machine code.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/score_class.cpp -o lesson
./lesson
```

Expected output:

```text
0 0
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/score_class.cpp -o lesson"
run "./lesson" stdout="0 0\n"
```

## One method owns the mutation

The **public interface** is the set of operations callers may use. Our bank method accepts an amount from 1 through 12 only while stored points are below 12. It returns false without mutation for any rejected request. Accepted requests add the amount and return true. Overshoot is allowed: 11 plus 12 becomes 23. No accepted sequence can exceed 23.

**Encapsulation** means keeping representation and the operations responsible for its rules together behind an interface. The validation branch comes before assignment so rejection preserves state.

**Edit `explore/score_class.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/score_class.cpp
#include <iostream>
class Score {
private:
    int points_ = 0;
public:
    int points() const { return points_; }
    bool bank(int amount) {
        if (amount < 1 || amount > 12 || points_ >= 12) return false;
        points_ += amount;
        return true;
    }
};
int main() {
    Score first;
    Score second;
    std::cout << "accepted=" << first.bank(5) << '\n';
    std::cout << first.points() << " " << second.points() << '\n';
    return 0;
}
```

first.bank(5) checks first’s points_, adds five and returns true. second still has zero. Unlike the A06 function, the method already has access to the object on which it was called; no score reference parameter is needed.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/score_class.cpp -o lesson
./lesson
```

Expected output:

```text
accepted=1
5 0
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/score_class.cpp -o lesson"
run "./lesson" stdout="accepted=1\n5 0\n"
```

## Rejection must preserve the earlier value

Call bank(-3) after the successful bank. Trace the early return: amount < 1 is true, so the addition is never reached. A false return reports a rejected operation, not a lost match.

**Edit `explore/score_class.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/score_class.cpp
#include <iostream>
class Score {
private:
    int points_ = 0;
public:
    int points() const { return points_; }
    bool bank(int amount) {
        if (amount < 1 || amount > 12 || points_ >= 12) return false;
        points_ += amount;
        return true;
    }
};
int main() {
    Score first;
    Score second;
    std::cout << "accepted=" << first.bank(5) << '\n';
    std::cout << "rejected=" << first.bank(-3) << '\n';
    std::cout << first.points() << " " << second.points() << '\n';
    return 0;
}
```

The first score stays five; the second remains zero. Checking the boolean alone would miss a method that returned false after damaging the stored value. Always check state preservation as well.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/score_class.cpp -o lesson
./lesson
```

Expected output:

```text
accepted=1
rejected=0
5 0
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/score_class.cpp -o lesson"
run "./lesson" stdout="accepted=1\nrejected=0\n5 0\n"
```

## Try it — Find the interface boundary

Temporarily assign first.points_ = -3 in main and compile. Read the private-access error, then remove the assignment. Next use const Score frozen; and print frozen.points(). It compiles because the query is const. A call to frozen.bank(1) does not compile: bank mutates the object. Restore the guided version. Explain why returning a mutable reference from points would undermine this interface.



## Your turn — Design a bounded round counter

**No solution is shown.** Create `practice/round_counter.cpp` yourself. Create RoundCounter with private storage initialized to zero. Its public count() const query returns the count; advance() returns true and adds one only below five; reset() sets it to zero. Read attempts from 0 through 10. Advance a first counter that many times, counting successful advances. Keep a second untouched. Copy the first counter, reset the copy and print all counts plus successful advances. Design the method bodies yourself.

| Input | Required output | Exit status |
|---|---|---|
| 0 | first=0 second=0 copy=0 accepted=0 | 0 |
| 3 | first=3 second=0 copy=0 accepted=3 | 0 |
| 5 | first=5 second=0 copy=0 accepted=5 | 0 |
| 8 | first=5 second=0 copy=0 accepted=5 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/round_counter.cpp -o lesson
./lesson
```

```hints
nudge: State the invariant before writing a method: count stays between zero and five.
concept: Check the bound before mutation, and reset the copied object rather than the original.
shape: Separate the const query from the two methods that change private storage.
```


**Section gate:** hide the guided code. Explain an object, a copy, an alias, a method and an invariant using your own counter. Write explicit tests for the fifth advance, rejected sixth advance, reset and independence; identify the bug each would catch. Output checks establish behavior for their cases, not the presence of private storage or understanding. Inspect that design yourself. Keep the same dice-lab folder for the next section, which develops construction, ownership and separate source files.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/round_counter.cpp -o lesson"
run "./lesson" stdin="0\n" stdout="first=0 second=0 copy=0 accepted=0\n"  without="first=3 second=0 copy=0 accepted=3\n"
run "./lesson" stdin="3\n" stdout="first=3 second=0 copy=0 accepted=3\n"  without="first=0 second=0 copy=0 accepted=0\n"
run "./lesson" stdin="5\n" stdout="first=5 second=0 copy=0 accepted=5\n"  without="first=0 second=0 copy=0 accepted=0\n"
run "./lesson" stdin="8\n" stdout="first=5 second=0 copy=0 accepted=5\n"  without="first=0 second=0 copy=0 accepted=0\n"
```

