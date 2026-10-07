---
title: A11 — Begin with a valid object
track: C++ Games — Objects and Files
trackOrder: 4.2
runtime: cpp
console: true
---

**Outcome:** Construct a valid object or report that construction failed.

**Recall before looking at code:** What must be true about an object before a caller can safely use its methods?

A10 protected changes after creation. Now a saved score needs to begin at a chosen value without allowing an invalid starting state. Continue in the same dice-lab folder. You need classes, private members, const methods and explicit test comparisons from the preceding section.

## Initialize before the object is used

Create explore/construction.cpp. A **constructor** runs when an object is created. It has the class name and no return type, not even void. Score{4} passes 4 as initial. The colon begins the **member initializer list**: points_(initial) initializes storage before the empty constructor body runs. This first slice assumes initial is valid; we add rejection next.

**Edit `explore/construction.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/construction.cpp
#include <iostream>
class Score {
private:
    int points_;
public:
    Score(int initial) : points_(initial) {}
    int points() const { return points_; }
};
int main() {
    Score score{4};
    std::cout << "points=" << score.points() << '\n';
    return 0;
}
```

Creation is an operation with arguments, just as a method call has arguments. A constructor establishes the starting state; it does not create a second object and return it. A member initializer is initialization, not a later assignment into an already initialized member.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/construction.cpp -o lesson
./lesson
```

Expected output:

```text
points=4
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/construction.cpp -o lesson"
run "./lesson" stdout="points=4\n"
```

## Require a deliberate conversion {#explicit-construction}

Add **explicit** before the one-argument constructor. It prevents C++ from silently converting an integer into a Score where a Score is expected. Direct construction with Score{4} remains allowed. This is a compile-time conversion rule, separate from checking whether four is a valid starting value.

**Edit `explore/construction.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/construction.cpp
#include <iostream>
class Score {
private:
    int points_;
public:
    explicit Score(int initial) : points_(initial) {}
    int points() const { return points_; }
};
int main() {
    Score score{4};
    std::cout << "points=" << score.points() << '\n';
    return 0;
}
```

Keep the ordinary brace construction and run again: points=4 is unchanged. Temporarily try Score score = 4; instead and read the compiler error, then restore the braces. The small keyword changes which calls are admitted, not the stored value.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/construction.cpp -o lesson
./lesson
```

Expected output:

```text
points=4
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/construction.cpp -o lesson"
run "./lesson" stdout="points=4\n"
```

## Reject creation that cannot satisfy the contract

The starting score contract is 0 through 23, matching the A10 exercise’s reachable bound. A constructor cannot return false. **throw** instead signals an exception and leaves the operation without completing it. Include `<stdexcept>` for std::invalid_argument, a standard error type carrying an explanation. Its parentheses construct an error object containing the quoted message.

```predict
question: Does Score{-1} finish creating a usable Score?
choice: No
choice: Yes, but points is negative
answer: No
explain: Throwing prevents successful construction. The caller must handle the failure or the program terminates.
```


**Edit `explore/construction.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/construction.cpp
#include <iostream>
#include <stdexcept>
class Score {
private:
    int points_;
public:
    explicit Score(int initial) : points_(initial) {
        if (initial < 0 || initial > 23) {
            throw std::invalid_argument("initial score outside 0..23");
        }
    }
    int points() const { return points_; }
};
int main() {
    Score score{4};
    std::cout << "points=" << score.points() << '\n';
    return 0;
}
```

Although the member is initialized before the body checks it, a rejected Score never finishes construction and is never handed to its caller as a usable object. This differs from constructing an invalid object and asking every caller to remember to repair it.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/construction.cpp -o lesson
./lesson
```

Expected output:

```text
points=4
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/construction.cpp -o lesson"
run "./lesson" stdout="points=4\n"
```

## Give the failure a caller

A **try block** surrounds operations whose exceptions this caller intends to handle. A following **catch** names a matching error type. const std::invalid_argument& error borrows that error read-only during the handler. what() is its method returning the explanatory text. We introduce this minimum exception path now because constructors need it; A13 compares exceptions with ordinary rejected requests.

**Edit `explore/construction.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/construction.cpp
#include <iostream>
#include <stdexcept>
class Score {
private:
    int points_;
public:
    explicit Score(int initial) : points_(initial) {
        if (initial < 0 || initial > 23) {
            throw std::invalid_argument("initial score outside 0..23");
        }
    }
    int points() const { return points_; }
};
int main() {
    try {
        Score score{-1};
        std::cout << "points=" << score.points() << '\n';
    } catch (const std::invalid_argument& error) {
        std::cout << "rejected: " << error.what() << '\n';
    }
    return 0;
}
```

Score{-1} throws, so the next print in the try block is skipped. Control enters catch and prints the explanation. After the handler, main returns normally. Handling a rejected creation does not mean the object was created successfully.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/construction.cpp -o lesson
./lesson
```

Expected output:

```text
rejected: initial score outside 0..23
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/construction.cpp -o lesson"
run "./lesson" stdout="rejected: initial score outside 0..23\n"
```

## Try it — Direct construction versus conversion

With the valid value 4, replace Score score{4}; (or the current -1 construction) with Score score = 4;. Compile and observe the error caused by explicit. Restore direct brace construction. Then try 0, 23, -1 and 24 and record accepted versus rejected. Do not remove validation just to make an input compile; these are runtime value checks, different from the explicit conversion restriction.



## Your turn — Construct a rule configuration

**No solution is shown.** Create `practice/rules.cpp` yourself. Create Rules with an explicit one-integer constructor, private target storage and a const target() query. Accept targets 2 through 20, inclusive. Throw std::invalid_argument on anything else. Read one integer and attempt construction inside try. Print target=N on success or rejected in the matching handler. An unused catch parameter may omit its name, keeping only const std::invalid_argument&. This creates a configuration value; it does not yet change Dice Duel’s fixed target.

| Input | Required output | Exit status |
|---|---|---|
| 2 | target=2 | 0 |
| 20 | target=20 | 0 |
| 1 | rejected | 0 |
| 21 | rejected | 0 |
| 12 | target=12 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/rules.cpp -o lesson
./lesson
```

```hints
nudge: A constructor has no returned success flag.
concept: Reject outside the closed interval before construction finishes.
shape: Initialize the member, check both bounds, and catch the specified error around creation.
```


Explain why the query must be const when rules is const. Demonstrate that rejected input prints no target value. A real model loader will later validate an entire candidate before replacing a working model.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/rules.cpp -o lesson"
run "./lesson" stdin="2\n" stdout="target=2\n"  without="target=20\n"
run "./lesson" stdin="20\n" stdout="target=20\n"  without="target=2\n"
run "./lesson" stdin="1\n" stdout="rejected\n"  without="target=2\n"
run "./lesson" stdin="21\n" stdout="rejected\n"  without="target=2\n"
run "./lesson" stdin="12\n" stdout="target=12\n"  without="target=2\n"
```

