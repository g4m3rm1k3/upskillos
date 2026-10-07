---
title: A07 — Two players, two objects
track: C++ Games — State and Tests
trackOrder: 4.1
runtime: cpp
console: true
---

**Outcome:** Represent independent players, select an array element and distinguish a value copy from an alias.

**Recall before looking at code:** Draw the difference between two integers with equal values and two names for one integer.

A match needs two independent scores. A06 taught copies and aliases; now give each player a named record and put the records in a fixed-size collection. These experiments prepare the game state, not a new framework.

## Name a record

A **struct** defines a type grouping named data. Player is the type; first and second are **objects**, separate instances of it. score is a **member**, data inside each object. The dot in second.score selects that object’s member. The = 0 supplies the member’s starting value. The semicolon after the closing brace ends the type definition.

```predict
question: Changing second.score also changes first.score?
choice: No
choice: Yes
answer: No
explain: Each Player object has its own score member.
```


**Edit `explore/players.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/players.cpp
#include <iostream>
struct Player {
    int score = 0;
};
int main() {
    Player first;
    Player second;
    second.score = 7;
    std::cout << first.score << " " << second.score << '\n';
    return 0;
}
```

The language knows that score is an integer. It does not know our game’s rules: these public members can still be assigned a negative value. A10 will address that.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/players.cpp -o lesson
./lesson
```

Expected output:

```text
0 7
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/players.cpp -o lesson"
run "./lesson" stdout="0 7\n"
```

## Copy the record

Assign first to second, then change second. For this struct, assignment copies the integer member. It does not connect the objects. Contrast this with Player& second = first;, which would create an alias rather than a second Player.

**Edit `explore/players.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/players.cpp
#include <iostream>
struct Player {
    int score = 0;
};
int main() {
    Player first;
    Player second;
    first.score = 4;
    second = first;
    second.score += 3;
    std::cout << first.score << " " << second.score << '\n';
    return 0;
}
```

After assignment both scores are 4, in separate storage. The final addition makes only second equal 7. A copy provides an independent snapshot of these value members.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/players.cpp -o lesson
./lesson
```

Expected output:

```text
4 7
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/players.cpp -o lesson"
run "./lesson" stdout="4 7\n"
```

## A collection with exactly two places

Create explore/player_array.cpp. #include `<array>` declares std::array. The angle brackets choose a **template’s arguments**: here the element type Player and fixed count 2. A template describes a family of types; `std::array<Player, 2>` is one concrete type. Braces initialize our array and its members.

An **index** selects a position, starting at zero. The valid indices are 0 and 1. .at(1) returns a reference to the second Player, so the following .score assignment changes that stored object.

**Edit `explore/player_array.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/player_array.cpp
#include <iostream>
#include <array>
struct Player {
    int score = 0;
};
int main() {
    std::array<Player, 2> players{};
    players.at(1).score = 7;
    std::cout << players.at(0).score << " " << players.at(1).score << '\n';
    return 0;
}
```

The count stays two throughout this object’s life. .at checks the index; unchecked [index] does not. Access outside the array with [] has undefined behavior, meaning C++ gives no reliable result. We will never execute that as a prediction exercise.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/player_array.cpp -o lesson
./lesson
```

Expected output:

```text
0 7
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/player_array.cpp -o lesson"
run "./lesson" stdout="0 7\n"
```

## A collection that grows

Create explore/history.cpp. A **vector** is a sequence whose size can change. `std::vector<int>` begins empty here. push_back appends one value; size reports the number of elements. Unlike the player array, a history has no fixed number of entries. Include `<vector>` to declare the type.

**Edit `explore/history.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/history.cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> history;
    history.push_back(3);
    history.push_back(5);
    std::cout << "count=" << history.size() << " last=" << history.at(1) << '\n';
    return 0;
}
```

The size goes 0, 1, 2. Appending 5 does not replace the earlier 3. Vector growth can invalidate references into its storage, so do not keep a borrowed element reference across an append; we reacquire elements with at when needed.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/history.cpp -o lesson
./lesson
```

Expected output:

```text
count=2 last=5
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/history.cpp -o lesson"
run "./lesson" stdout="count=2 last=5\n"
```

## Try it — Diagnose a bad position safely

In player_array.cpp change at(1) to at(2), compile and run. Expect the program to terminate with an uncaught out-of-range exception; the exact diagnostic depends on the compiler runtime. An **exception** signals failure and can be handled by a caller, which A13 will teach. This experiment deliberately has no handler. The problem is the index, not insufficient memory. Restore at(1), rebuild and verify 0 7. Do not replace at with [] to hide the error.



## Your turn — Keep an independent snapshot

**No solution is shown.** Create `practice/player_copy.cpp` yourself. Read first score, second score and gain (each 0 through 20). Store the players in `std::array<Player, 2>`. Copy the second Player into a new object, add gain to that copy, then report all three values. Neither original may change.

| Input | Required output | Exit status |
|---|---|---|
| 4 7 3 | first=4 second=7 copy=10 | 0 |
| 2 9 0 | first=2 second=9 copy=9 | 0 |
| 8 1 6 | first=8 second=1 copy=7 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/player_copy.cpp -o lesson
./lesson
```

```hints
nudge: Which declaration creates storage, and which creates an alias?
concept: Player copy stores a value; Player& copy borrows an existing one.
shape: Read the members, initialize a copy from position 1, and mutate only that copy.
```


Explain why this copying behavior is safe for the one-integer record. Do not generalize it to every possible class: ownership types later can deliberately forbid copying.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/player_copy.cpp -o lesson"
run "./lesson" stdin="4 7 3\n" stdout="first=4 second=7 copy=10\n"  without="first=2 second=9 copy=9\n"
run "./lesson" stdin="2 9 0\n" stdout="first=2 second=9 copy=9\n"  without="first=4 second=7 copy=10\n"
run "./lesson" stdin="8 1 6\n" stdout="first=8 second=1 copy=7\n"  without="first=4 second=7 copy=10\n"
```

