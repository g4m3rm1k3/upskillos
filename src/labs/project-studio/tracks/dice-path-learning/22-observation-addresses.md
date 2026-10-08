---
title: A22 — Give each observation its own address
track: C++ Games — Learn from Decisions
trackOrder: 4.4
runtime: cpp
console: true
---

**Outcome:** Extract an agent-decision observation and encode it into a checked, reversible table address.

**Recall before looking at code:** Why must an unfinished successor belong to seat zero before the agent chooses again?

With banked scores two and three and pot four, the agent needs estimates for this particular situation. A pot of four alone is not enough: being two points from victory differs from being ten points away. Keep the same learner folder from A21b. We will first describe the decision, then give it a unique place in a table. No training happens in this lesson.

## Choose what the agent observes

An **observation** is the information given to the agent when it chooses. Ours contains own banked score, other banked score and pot, in that order. The agent is still seat zero; own does not mean whichever seat happens to be taking a turn. We accept only unfinished seat-zero decision boundaries from A21b.

```predict
question: Two positions have the same pot but different opponent scores. Should they share a row?
choice: No
choice: Yes
answer: No
explain: The opponent may be one roll from victory in only one position. The same pot does not describe the same decision.
```


Under our fixed rules, independent fair-die model and fixed opponent policy, these numbers describe the situation needed for future decisions. We omit turn because the entry contract fixes it to zero, and winner because finished games have no next choice. A terminal result still has a reward; it does not need an observation for another action. Changing the rules, opponent or agent seat requires reviewing this representation.

## Name the three coordinates

Create include/learning/Observation.hpp. A coordinate is one component of the address we will construct. The struct holds ordinary value members, as in A07. observe borrows a Game and returns a separate description; it cannot change the game.

**Edit `include/learning/Observation.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/learning/Observation.hpp
#ifndef LEARNING_OBSERVATION_HPP
#define LEARNING_OBSERVATION_HPP
#include "dice/Game.hpp"
namespace learning {
struct Observation {
    int own = 0;
    int other = 0;
    int pot = 0;
};
Observation observe(const dice::Game& game);
}
#endif
```

The declaration is a promise, not a runnable implementation. Next define it and build a caller.

```check
file include/learning/Observation.hpp
```

## Enforce the decision boundary before extracting values

Create src/learning/Observation.cpp. First copy the snapshot; then reject finished or opponent-turn games. The return braces initialize own, other and pot in declaration order. Do not silently swap scores on an opponent turn: that would change which agent these estimates describe.

**Edit `src/learning/Observation.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/Observation.cpp
#include "learning/Observation.hpp"
#include <stdexcept>
learning::Observation learning::observe(const dice::Game& game) {
    dice::GameSnapshot view = game.snapshot();
    if (game.finished() || view.turn != 0)
        throw std::invalid_argument("expected an unfinished seat-zero decision");
    return {view.scores.at(0), view.scores.at(1), view.pot};
}
```

Compile this source to an object now. A complete runnable observation follows in the next step.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/learning/Observation.cpp -o observation.o"
```

## Reach a real position through the game rules

Create explore/observation_probe.cpp. Bank two for seat zero, bank three for seat one, then roll four for seat zero. This deliberately uses apply rather than assigning private state. Trace which seat acts at each line before compiling.

**Edit `explore/observation_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/observation_probe.cpp
#include <iostream>
#include "learning/Observation.hpp"
int main() {
    dice::Game game;
    game.apply(dice::Action::Roll, 2);
    game.apply(dice::Action::Bank, 0);
    game.apply(dice::Action::Roll, 3);
    game.apply(dice::Action::Bank, 0);
    game.apply(dice::Action::Roll, 4);
    learning::Observation seen = learning::observe(game);
    std::cout << seen.own << "," << seen.other << "," << seen.pot << '\n';
    return 0;
}
```

Run the two check commands below yourself. Expect 2,3,4. The commas describe separate fields, not one large number. Changing the returned observation cannot change game.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/observation_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp  -o observation_probe"
run "./observation_probe" stdout="2,3,4"
```

## Count slots before writing a formula

Reserve twelve pot slots for each score pair. For own=0, other=0, pots 0 through 11 occupy addresses 0 through 11. The next opponent score starts at 12. Twelve opponent-score groups occupy 144 slots before own advances. An **index encoding** converts these coordinates to one integer address.

| Position | Calculation | Address |
|---|---|---|
| 0,0,0 | (0 × 12 + 0) × 12 + 0 | 0 |
| 0,1,0 | (0 × 12 + 1) × 12 + 0 | 12 |
| 1,0,0 | (1 × 12 + 0) × 12 + 0 | 144 |
| 2,3,4 | (2 × 12 + 3) × 12 + 4 | 328 |

Procedure: validate the coordinates, count complete own-score groups, count complete opponent-score groups, then add the pot offset. The general expression is (own × 12 + other) × 12 + pot. A **collision** means different admitted observations receive the same address. Simply adding the fields collides: 2,3,4 and 3,2,4 would share nine.

The rectangular storage reserves 12 × 12 × 12 slots. Some are unused: own=11, pot=1 would already have won. We reject own+pot at least twelve even when the address fits. A reserved slot is not proof of a valid decision. This table is tied to the game’s fixed target twelve.

## Declare checked addressing

Add rowIndex inside the learning namespace in include/learning/Observation.hpp. It borrows the coordinates and returns an int address; no table is allocated yet.

**Edit `include/learning/Observation.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/learning/Observation.hpp
#ifndef LEARNING_OBSERVATION_HPP
#define LEARNING_OBSERVATION_HPP
#include "dice/Game.hpp"
namespace learning {
struct Observation {
    int own = 0;
    int other = 0;
    int pot = 0;
};
int rowIndex(const Observation& seen);
Observation observe(const dice::Game& game);
}
#endif
```

The previous caller still builds because it does not yet call this new declaration.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/observation_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp  -o observation_probe"
run "./observation_probe" stdout="2,3,4"
```

## Validate before computing an address

Append rowIndex to src/learning/Observation.cpp. First require each coordinate in 0..11, then reject already-winning own+pot. The || operator stops once a condition is true, so the bounded addition happens only after coordinate checks pass. dice::target is the existing fixed constant from Game.hpp.

**Edit `src/learning/Observation.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/learning/Observation.cpp
#include "learning/Observation.hpp"
#include <stdexcept>
learning::Observation learning::observe(const dice::Game& game) {
    dice::GameSnapshot view = game.snapshot();
    if (game.finished() || view.turn != 0)
        throw std::invalid_argument("expected an unfinished seat-zero decision");
    return {view.scores.at(0), view.scores.at(1), view.pot};
}
int learning::rowIndex(const Observation& seen) {
    if (seen.own < 0 || seen.own >= dice::target ||
        seen.other < 0 || seen.other >= dice::target ||
        seen.pot < 0 || seen.pot >= dice::target ||
        seen.own + seen.pot >= dice::target)
        throw std::invalid_argument("invalid decision observation");
    return (seen.own * dice::target + seen.other) * dice::target + seen.pot;
}
```

Compile and run the old probe again. The implementation exists, but the old caller has not exercised indexing yet.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/observation_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp  -o observation_probe"
run "./observation_probe" stdout="2,3,4"
```

## Observe the address of the real position

Add the rowIndex call after printing the three fields. Predict what changing only the pot by one would do to the address, provided the game is still unfinished.

**Edit `explore/observation_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/observation_probe.cpp
#include <iostream>
#include "learning/Observation.hpp"
int main() {
    dice::Game game;
    game.apply(dice::Action::Roll, 2);
    game.apply(dice::Action::Bank, 0);
    game.apply(dice::Action::Roll, 3);
    game.apply(dice::Action::Bank, 0);
    game.apply(dice::Action::Roll, 4);
    learning::Observation seen = learning::observe(game);
    std::cout << seen.own << "," << seen.other << "," << seen.pot << '\n';
    std::cout << "row=" << learning::rowIndex(seen) << '\n';
    return 0;
}
```

Expect row=328. A pot increment adds one; an opponent-score increment adds twelve; an own-score increment adds 144. These different strides prevent field boundaries from overlapping.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/observation_probe.cpp src/dice/Game.cpp src/learning/Observation.cpp  -o observation_probe"
run "./observation_probe" stdout="2,3,4\nrow=328"
```

## Observe failures without reading outside a container

Create explore/observation_errors.cpp. A bust puts the game on seat one. The first try must reject that boundary. The list of bad observations then tests negative, upper-bound and already-winning coordinates. The first explicit Observation names the list element type; later braces initialize more values of that same type. The empty catch body means the expected rejection needs no further work.

**Edit `explore/observation_errors.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/observation_errors.cpp
#include <iostream>
#include <stdexcept>
#include "learning/Observation.hpp"
int main() {
    dice::Game game;
    game.apply(dice::Action::Roll, 1);
    try { learning::observe(game); return 1; }
    catch (const std::invalid_argument&) { std::cout << "boundary rejected\n"; }
    for (learning::Observation bad : {learning::Observation{-1,0,0}, {0,12,0}, {0,0,12}, {11,0,1}}) {
        try { learning::rowIndex(bad); return 2; }
        catch (const std::invalid_argument&) {}
    }
    std::cout << "coordinates rejected\n";
    return 0;
}
```

Each return inside try reports that an expected exception did not happen. Run the checks: expect both rejection messages. No out-of-bounds memory access is performed.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/observation_errors.cpp src/dice/Game.cpp src/learning/Observation.cpp  -o observation_errors"
run "./observation_errors" stdout="boundary rejected\ncoordinates rejected"
```

## Try it — Separate a boundary failure from a coordinate failure

In observation_errors.cpp replace the bust with two rolls of six. observe must reject the finished game too. Then replace the bad-coordinate list with {11,11,0}: it is an admitted observation, so this rejection test should return 2. Explain why that failure means the test expectation is now wrong. Restore the file. In the working probe temporarily misspell rowIndex as rowindex, compile and read the named symbol in the diagnostic; restore its capitalization and rebuild.



## Count complete groups and what remains {#quotient-remainder}

Seventeen counters fill three groups of five and leave two counters. Integer / counts complete groups for these nonnegative inputs. The **remainder operator** % reports what remains after those groups. Create explore/groups.cpp. width must be positive; dividing by zero is not an experiment to run.

```predict
question: With twenty counters and groups of five, what remains?
choice: 0
choice: 5
answer: 0
explain: Four complete groups use all twenty counters.
```


**Edit `explore/groups.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/groups.cpp
#include <iostream>
int main() {
    int items = 17;
    int width = 5;
    int groups = items / width;
    int remainder = items % width;
    std::cout << "groups=" << groups << " remainder=" << remainder << '\n';
    std::cout << "rebuilt=" << groups * width + remainder << '\n';
    return 0;
}
```

Run the commands below. For seventeen expect groups=3 remainder=2 and rebuilt=17. The reconstruction multiplies the group count by its width and adds the leftovers. Change items to 4, 5 and 6; predict both outputs before running. Notice the remainder resets when another complete group fits. Restore seventeen.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/groups.cpp -o groups"
run "./groups" stdout="groups=3 remainder=2\nrebuilt=17"
```

## Undo a small two-coordinate address {#two-coordinate-inverse}

Imagine four rows of three cells, numbered from zero. Row zero contains addresses 0,1,2; row one contains 3,4,5; row two contains 6,7,8. To find address seven, count complete rows of three, then the position left over. Create explore/small_address.cpp. Recovering the inputs of an operation is its **inverse**.

**Edit `explore/small_address.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/small_address.cpp
#include <iostream>
int main() {
    int address = 7;
    int width = 3;
    int row = address / width;
    int column = address % width;
    std::cout << "row=" << row << " column=" << column << '\n';
    std::cout << "rebuilt=" << row * width + column << '\n';
    return 0;
}
```

| Address | Complete rows: / 3 | Position in row: % 3 | Rebuilt |
|---|---|---|---|
| 2 | 0 | 2 | 0 × 3 + 2 = 2 |
| 3 | 1 | 0 | 1 × 3 + 0 = 3 |
| 7 | 2 | 1 | 2 × 3 + 1 = 7 |

Run, then try addresses two and three. The boundary changes both coordinates. For three coordinates, recover one large group first, then split what remains in the same way. Do not memorize 144: explain which two widths multiply to make it.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/small_address.cpp -o small_address"
run "./small_address" stdout="row=2 column=1\nrebuilt=7"
```

## Practice — Transfer the inverse to lockers {#locker-transfer}

Close the previous example. Create practice/locker_address.cpp yourself. A locker cabinet has four racks with five slots each; both coordinates start at zero. Read one integer address. Print rack=N slot=N for addresses 0..19; reject a failed read or anything outside that range with exit 1. For fourteen print rack=2 slot=4; for five print rack=1 slot=0. Choose another boundary case before writing code.

```hints
nudge: Draw the first two racks with their addresses.
concept: Count whole racks, then the slots left over.
shape: The width is five. Reconstruct your input from the two recovered numbers to check your answer.
```

Run the checks below, then your chosen case. If you needed the last hint, repeat with a different cabinet width before moving on. Keep your implementation hidden while explaining why a rack boundary gives slot zero.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude practice/locker_address.cpp -o locker_address"
run "./locker_address" stdin="14\n" stdout="rack=2 slot=4" without="rack=1 slot=0"
run "./locker_address" stdin="5\n" stdout="rack=1 slot=0" without="rack=2 slot=4"
run "./locker_address" stdin="20\n" exit=1
run "./locker_address" stdin="-1\n" exit=1
```

## Trace a nested loop before checking every observation {#nested-round-trip}

Create explore/round_trip.cpp. A **nested loop** is a loop inside another loop. For row zero, the inner loop visits columns zero, one and two. It then ends. Only then does row become one; a fresh inner loop starts at column zero again. This visits (0,0), (0,1), (0,2), (1,0), (1,1), (1,2).

**Edit `explore/round_trip.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/round_trip.cpp
#include <iostream>
int main() {
    int checked = 0;
    for (int row = 0; row < 2; ++row) {
        for (int column = 0; column < 3; ++column) {
            int address = row * 3 + column;
            if (address / 3 != row || address % 3 != column) return 1;
            ++checked;
        }
    }
    std::cout << "checked=" << checked << '\n';
    return 0;
}
```

A **round trip** encodes coordinates and decodes the result back to the originals. Expect checked=6. Replace row * 3 + column with row + column: predict the first pair that fails, run, then restore. A third coordinate adds another inner loop, not another simultaneous increase. In the game, stop pot before own+pot reaches twelve; opponent score does not change that bound.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/round_trip.cpp -o round_trip"
run "./round_trip" stdout="checked=6"
```

## Your turn — Recover coordinates and rule out collisions

Create practice/decode_observation.cpp with no supplied body. Read one integer address. Reject failed extraction, addresses outside 0..1727 and decoded own+pot at least twelve with exit 1. Otherwise print the three coordinates exactly as below and verify rowIndex recovers the original address.

Reuse the quotient/remainder experiments, locker task and nested round-trip trace. Work out the two group widths from the game coordinates; design the inverse yourself before opening a hint.

| Input | Output or exit |
|---|---|
| 328 | own=2 other=3 pot=4 |
| 0 | own=0 other=0 pot=0 |
| 1716 | own=11 other=11 pot=0 |
| 143 | own=0 other=11 pot=11 |
| -1, 1728, 1717, word (separate runs) | exit 1 |

Before success, loop over every own and other from zero through eleven and every pot below twelve minus own. Encode each triple, decode it, and return nonzero if any recovered field differs. This is a round-trip check, not a printed example list.

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude practice/decode_observation.cpp src/dice/Game.cpp src/learning/Observation.cpp  -o decode_observation
./decode_observation
```

```hints
nudge: Start by asking how many complete groups of 144 fit.
concept: Remove the own-score group, then separate opponent groups from pot remainder.
shape: Use integer / for a group count and % to remove complete groups. Nest three loops for the exhaustive check.
```

With the example hidden, decode address 697 and explain each field. Explain why a correct inverse prevents collisions: a single address cannot decode to two different original triples. Temporarily remove other from rowIndex; your exhaustive check must fail even when input is zero. Restore the source. A reviewer must inspect that loop; output checks alone cannot prove exhaustive coverage. If stuck, revisit A07 indexing and A02 integer division.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude practice/decode_observation.cpp src/dice/Game.cpp src/learning/Observation.cpp  -o decode_observation"
run "./decode_observation" stdin="328\n" stdout="own=2 other=3 pot=4" without="own=0 other=0 pot=0"
run "./decode_observation" stdin="0\n" stdout="own=0 other=0 pot=0" without="own=2 other=3 pot=4"
run "./decode_observation" stdin="1716\n" stdout="own=11 other=11 pot=0" without="own=2 other=3 pot=4"
run "./decode_observation" stdin="143\n" stdout="own=0 other=11 pot=11" without="own=2 other=3 pot=4"
run "./decode_observation" stdin="12\n" stdout="own=0 other=1 pot=0" without="own=2 other=3 pot=4"
run "./decode_observation" stdin="-1\n" exit=1
run "./decode_observation" stdin="1728\n" exit=1
run "./decode_observation" stdin="1717\n" exit=1
run "./decode_observation" stdin="word\n" exit=1
```

