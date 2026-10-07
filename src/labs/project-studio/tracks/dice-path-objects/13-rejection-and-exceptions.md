---
title: A13 — A bad request is not a bust
track: C++ Games — Objects and Files
trackOrder: 4.2
runtime: cpp
console: true
---

**Outcome:** Distinguish a rejected request from a legal unfavorable outcome, preserving state on failure.

**Recall before looking at code:** If a function returns false after changing the pot, did it preserve the old state?

A die value of 7 must not erase a pot or pass the turn. A11 introduced exceptions for failed construction; now distinguish malformed requests from legal losing outcomes. Keep the rule operation independent of terminal input so a test can supply the exact die face.

## A result for an expected rejected request

Create explore/errors.cpp. The boolean is a **result code**: it reports whether the operation accepted the face. Rejection returns before mutation. The integer return value from main is also a result code, but for the surrounding process. This exercise only models pot changes, not turn ownership or winning.

**Edit `explore/errors.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/errors.cpp
#include <iostream>
bool apply_roll(int& pot, int face) {
    if (face < 1 || face > 6) return false;
    if (face == 1) pot = 0;
    else pot += face;
    return true;
}
int main() {
    int pot = 5;
    bool accepted = apply_roll(pot, 7);
    std::cout << "accepted=" << accepted << " pot=" << pot << '\n';
    return 0;
}
```

Face 7 is rejected and leaves pot 5. It is not interpreted as a bust. A legal face 1 returns true and resets the pot; acceptance and a favorable outcome are different questions.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/errors.cpp -o lesson
./lesson
```

Expected output:

```text
accepted=0 pot=5
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/errors.cpp -o lesson"
run "./lesson" stdout="accepted=0 pot=5\n"
```

## A legal move can lose points

```predict
question: For face 1, is accepted false because points were lost?
choice: No, the face is legal
choice: Yes, false means a loss
answer: No, the face is legal
explain: The result reports validity, not whether the outcome was favorable.
```


**Edit `explore/errors.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/errors.cpp
#include <iostream>
bool apply_roll(int& pot, int face) {
    if (face < 1 || face > 6) return false;
    if (face == 1) pot = 0;
    else pot += face;
    return true;
}
int main() {
    int pot = 5;
    bool accepted = apply_roll(pot, 1);
    std::cout << "accepted=" << accepted << " pot=" << pot << '\n';
    return 0;
}
```

The legal bust yields accepted=1 and pot=0. Later the game changes the turn too; the learning environment will separately assign a reward. Do not overload one boolean to mean validity, termination and reward.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/errors.cpp -o lesson
./lesson
```

Expected output:

```text
accepted=1 pot=0
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/errors.cpp -o lesson"
run "./lesson" stdout="accepted=1 pot=0\n"
```

## An exception for a violated internal contract

Create explore/required_face.cpp. std::out_of_range is a standard exception for a value outside an admitted range. Here an internal caller promises to supply a valid die face, so a failure means its contract was violated. A boolean can also represent failure; choose and document one convention rather than surprising callers. Neither convention should convert invalid input into a game loss.

**Edit `explore/required_face.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/required_face.cpp
#include <iostream>
#include <stdexcept>
void require_face(int face) {
    if (face < 1 || face > 6) throw std::out_of_range("die face");
}
int main() {
    try {
        require_face(7);
        std::cout << "valid\n";
    } catch (const std::out_of_range& error) {
        std::cout << "rejected " << error.what() << '\n';
    }
    return 0;
}
```

throw leaves require_face, bypasses the rest of the try block and reaches the matching handler. The caller retains responsibility for deciding whether to report, retry or abort. Catching every failure and returning a fake successful game state would hide the defect.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/required_face.cpp -o lesson
./lesson
```

Expected output:

```text
rejected die face
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/required_face.cpp -o lesson"
run "./lesson" stdout="rejected die face\n"
```

## Try it — Preserve before you report

In errors.cpp use face 7 again, but temporarily move pot = 0; before the validity check. Observe accepted=0 pot=0: reporting rejection alone did not protect state. Restore the code. This property—failure leaves the original state intact—is a design guarantee you must implement, not something throw or return automatically supplies.



## Your turn — Validate a candidate before changing the pot

**No solution is shown.** Create `practice/bounded_pot.cpp` yourself. For this independent variant, the starting pot is promised to be from 0 through 20. Faces outside 1 through 6 are rejected. Face 1 is an accepted bust resetting to zero. For other faces, accept only if the new pot is at most 20. On any rejection preserve the old pot. Read pot and face and print the boolean result plus final pot. The cap is an exercise variant, not a change to Dice Duel’s rules.

| Input | Required output | Exit status |
|---|---|---|
| 5 7 | accepted=0 pot=5 | 0 |
| 5 0 | accepted=0 pot=5 | 0 |
| 20 1 | accepted=1 pot=0 | 0 |
| 14 6 | accepted=1 pot=20 | 0 |
| 15 6 | accepted=0 pot=15 | 0 |
| 3 4 | accepted=1 pot=7 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/bounded_pot.cpp -o lesson
./lesson
```

```hints
nudge: Treat validity, bust and cap as separate questions.
concept: Compute or compare a candidate before assigning it.
shape: Reject invalid faces; handle the legal bust; check the sum; only then add.
```


Add a test for your own different starting pot. Explain which failure is a caller error and which is an admitted but unfavorable outcome. The eventual trainer must never award a loss merely because an internal validity check failed.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/bounded_pot.cpp -o lesson"
run "./lesson" stdin="5 7\n" stdout="accepted=0 pot=5\n"  without="accepted=1 pot=0\n"
run "./lesson" stdin="5 0\n" stdout="accepted=0 pot=5\n"  without="accepted=1 pot=0\n"
run "./lesson" stdin="20 1\n" stdout="accepted=1 pot=0\n"  without="accepted=0 pot=5\n"
run "./lesson" stdin="14 6\n" stdout="accepted=1 pot=20\n"  without="accepted=0 pot=5\n"
run "./lesson" stdin="15 6\n" stdout="accepted=0 pot=15\n"  without="accepted=0 pot=5\n"
run "./lesson" stdin="3 4\n" stdout="accepted=1 pot=7\n"  without="accepted=0 pot=5\n"
```

