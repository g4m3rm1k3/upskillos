---
title: A12 — Inspect the game without rewriting it
track: C++ Games — Objects and Files
trackOrder: 4.2
runtime: cpp
console: true
---

**Outcome:** Expose an independent state snapshot without giving a caller mutation access to the model.

**Recall before looking at code:** Does modifying a copied Player alter the original? Explain using storage, not the variable names.

A display needs the score and pot, but should not gain permission to change the rules’ storage. A07 showed independent copies. Now use that mechanism for a small game model’s public interface. The model below begins in one demonstration position (4, 7, pot 5); it is an interface experiment, not the completed match implementation.

## Compose state from values

Create explore/game_model.cpp. **Composition** means one object contains others: Game contains a GameSnapshot, which contains an array and integers. A **snapshot** is a value representing state at one time. snapshot() returns GameSnapshot by value, so callers receive an independent copy. Its const method declaration allows inspection through a const Game.

**Edit `explore/game_model.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/game_model.cpp
#include <iostream>
#include <array>
struct GameSnapshot {
    std::array<int, 2> scores{4, 7};
    int pot = 5;
    int turn = 0;
};
class Game {
private:
    GameSnapshot state_;
public:
    GameSnapshot snapshot() const { return state_; }
};
int main() {
    const Game game;
    std::cout << "pot=" << game.snapshot().pot << '\n';
    return 0;
}
```

All syntax here combines earlier mechanisms: a struct, private storage, a method and a value return. There is no inheritance relationship between Game and GameSnapshot; containing a value is different from being a specialized kind of that value.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/game_model.cpp -o lesson
./lesson
```

Expected output:

```text
pot=5
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/game_model.cpp -o lesson"
run "./lesson" stdout="pot=5\n"
```

## Change the returned value

Change only main. view is editable, but it belongs to the caller. This interface promises a snapshot copy, not a live view that follows future game changes.

```predict
question: Does view.pot = 99 modify the game?
choice: No
choice: Yes
answer: No
explain: The return type is a value, so view has separate storage.
```


**Edit `explore/game_model.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/game_model.cpp
#include <iostream>
#include <array>
struct GameSnapshot {
    std::array<int, 2> scores{4, 7};
    int pot = 5;
    int turn = 0;
};
class Game {
private:
    GameSnapshot state_;
public:
    GameSnapshot snapshot() const { return state_; }
};
int main() {
    Game game;
    GameSnapshot view = game.snapshot();
    view.pot = 99;
    std::cout << "view=" << view.pot << " game=" << game.snapshot().pot << '\n';
    return 0;
}
```

The caller’s 99 proves the snapshot is mutable. The game’s 5 proves that mutability does not reach the model. Copying this small state costs a few integer copies; that cost buys a simple ownership boundary.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/game_model.cpp -o lesson
./lesson
```

Expected output:

```text
view=99 game=5
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/game_model.cpp -o lesson"
run "./lesson" stdout="view=99 game=5\n"
```

## Let an operation change the model

Add bank to this limited demonstration model. It transfers the pot to the current score, clears the pot and switches between seats 0 and 1 using 1 - turn. No roll operation exists yet, so this model cannot play a match. We will replace the demonstration initialization when integrating complete rules. Keep the snapshot made before banking.

**Edit `explore/game_model.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/game_model.cpp
#include <iostream>
#include <array>
struct GameSnapshot {
    std::array<int, 2> scores{4, 7};
    int pot = 5;
    int turn = 0;
};
class Game {
private:
    GameSnapshot state_;
public:
    GameSnapshot snapshot() const { return state_; }
    bool bank() {
        if (state_.pot <= 0) return false;
        state_.scores.at(state_.turn) += state_.pot;
        state_.pot = 0;
        state_.turn = 1 - state_.turn;
        return true;
    }
};
int main() {
    Game game;
    GameSnapshot view = game.snapshot();
    game.bank();
    std::cout << "view=" << view.pot << " game=" << game.snapshot().pot << '\n';
    return 0;
}
```

The old view remains at pot 5; a fresh snapshot sees pot 0. Neither the display nor a snapshot should decide legality. The operation that owns state performs validation and changes it together.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/game_model.cpp -o lesson
./lesson
```

Expected output:

```text
view=5 game=0
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/game_model.cpp -o lesson"
run "./lesson" stdout="view=5 game=0\n"
```

## Try it — A snapshot does not refresh itself

Print the old and new snapshots’ scores and turn after bank. Expect old score 4 and turn 0, new score 9 and turn 1. Call bank a second time and print its boolean: it must reject the zero pot. Explain why a UI would request another snapshot after each action rather than edit an old one and expect the model to follow.



## Your turn — A match summary with an independent view

**No solution is shown.** Create `practice/match_counter.cpp` yourself. Build MatchCounter with two private win totals starting at zero. record(seat) accepts only 0 or 1, increments that seat and returns true; invalid seats return false without mutation. snapshot() const returns the array by value. Read one seat, call record, get a snapshot and change that copy’s first element to 99. Print acceptance, the two actual totals from a fresh snapshot, and the modified copy’s first value. Only one record call is required, so overflow is outside this exercise.

| Input | Required output | Exit status |
|---|---|---|
| 0 | accepted=1 wins=1,0 view=99 | 0 |
| 1 | accepted=1 wins=0,1 view=99 | 0 |
| -1 | accepted=0 wins=0,0 view=99 | 0 |
| 2 | accepted=0 wins=0,0 view=99 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/match_counter.cpp -o lesson
./lesson
```

```hints
nudge: Check the seat before indexing.
concept: Returning by value separates the caller’s snapshot from private storage.
shape: Record once, take and edit a copy, then query again for actual totals.
```


Explain why returning a mutable reference would be a different contract even if one caller happened to copy it. Compare the objects’ storage and the interface, not just a single printed example.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/match_counter.cpp -o lesson"
run "./lesson" stdin="0\n" stdout="accepted=1 wins=1,0 view=99\n"  without="accepted=1 wins=0,1 view=99\n"
run "./lesson" stdin="1\n" stdout="accepted=1 wins=0,1 view=99\n"  without="accepted=1 wins=1,0 view=99\n"
run "./lesson" stdin="-1\n" stdout="accepted=0 wins=0,0 view=99\n"  without="accepted=1 wins=1,0 view=99\n"
run "./lesson" stdin="2\n" stdout="accepted=0 wins=0,0 view=99\n"  without="accepted=1 wins=1,0 view=99\n"
```

