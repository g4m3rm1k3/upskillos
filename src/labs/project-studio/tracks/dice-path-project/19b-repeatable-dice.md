---
title: A19b — Roll dice you can reproduce
track: C++ Games — Build the Project
trackOrder: 4.3
runtime: cpp
console: true
---

**Outcome:** Own a random engine in a Die and reproduce a sequence for debugging in the same build.

**Recall before looking at code:** Why did the game rules accept an explicit face instead of generating one internally?

A bug that appears on one surprising roll sequence is easier to investigate when you can replay that sequence. Build a Die that owns its generator. Keep the seed explicit for now. This is game randomness, not cryptography, and it is not a learned opponent. The game model still accepts ordinary integer faces so its rule tests remain independent of randomness.

## Watch an engine advance

Create explore/random_probe.cpp. A **pseudorandom engine** calculates a sequence from internal state. std::mt19937 is a standard-library engine from the random header. The starting value 42 is a **seed**. Calling engine() returns a generated value and advances its state. Parentheses after this object invoke its call operation; the library defines that operation. These large integers are not die faces.

**Edit `explore/random_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/random_probe.cpp
#include <iostream>
#include <random>
int main() {
    std::mt19937 engine(42);
    std::cout << engine() << " " << engine() << '\n';
    return 0;
}
```

Compile with g++ -std=c++20 -Wall -Wextra -pedantic explore/random_probe.cpp -o random_probe and run ./random_probe twice. Each new process constructs the engine with 42, so the two runs repeat the same pair. Within a run, the engine advances between calls. Try a different seed and restore 42. Reconstructing an engine before every roll would restart the sequence rather than continue it.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/random_probe.cpp -o random_probe"
run "./random_probe"
```

## Map the engine to six equally likely outcomes

Replace raw engine output with a **distribution**: a rule that turns engine output into values with a specified probability model. `std::uniform_int_distribution<int>` selects integers from both endpoints, 1 through 6. uniform means each face has the same probability in that model. The angle brackets select the result type, as with the earlier container templates. faces(engine) uses and advances the engine you pass in.

```predict
question: Must six fair rolls contain all six faces?
choice: No
choice: Yes
answer: No
explain: Equal probabilities describe the generation model, not an exact quota for a short sample.
```


**Edit `explore/random_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/random_probe.cpp
#include <iostream>
#include <random>
int main() {
    std::mt19937 engine(42);
    std::uniform_int_distribution<int> faces(1, 6);
    for (int i = 0; i < 6; ++i) {
        std::cout << faces(engine) << " ";
    }
    std::cout << '\n';
    return 0;
}
```

Build and run again. All printed values should be between one and six. Equal probability does not mean one of each in six rolls. A short sequence can repeat or omit faces. The same seed and calls repeat within the same build, but the distribution’s exact sequence can differ between standard-library implementations. Never make portable tests depend on this particular printed sequence.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/random_probe.cpp -o random_probe"
run "./random_probe"
```

## Give the sequence one owner

Create include/dice/Die.hpp. Each Die owns its engine and distribution as members, so their state survives from one roll call to the next. unsigned int is an integer type without negative values. We use it for a seed, not for scores or subtraction. explicit requires deliberate construction, as in A11. roll is not const because generating the next value changes the engine.

**Edit `include/dice/Die.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/dice/Die.hpp
#ifndef DICE_DIE_HPP
#define DICE_DIE_HPP
#include <random>
namespace dice {
class Die {
private:
    std::mt19937 engine_;
    std::uniform_int_distribution<int> faces_{1, 6};
public:
    explicit Die(unsigned int seed);
    int roll();
};
}
#endif
```

The interface exposes only construction and a face-producing operation. Callers do not need to know the engine’s internal representation. Copying a Die copies its current state; it does not create independent entropy. We will keep one Die alive for the entire match.

```check
file include/dice/Die.hpp
```

## Initialize the engine before the first roll

Create src/dice/Die.cpp. The member initializer passes seed to the engine constructor. The distribution already has its member initializer in the header. There is no work in the constructor body. This reuses construction syntax from A11; explain which object each initializer constructs.

**Edit `src/dice/Die.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/dice/Die.cpp
#include "dice/Die.hpp"
dice::Die::Die(unsigned int seed) : engine_(seed) {}
```

Compile the source to an object file. roll is declared but not yet defined; compiling this file is valid, but a caller that uses roll would fail to link until the next edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/dice/Die.cpp -o die.o"
```

## Advance the existing engine, not a new one

Add the roll definition. It uses the two existing members and returns one face. It constructs no local engine and does not seed again. This small method is the adapter between a general random-number facility and the game’s requirement for an integer from one through six.

**Edit `src/dice/Die.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/dice/Die.cpp
#include "dice/Die.hpp"
dice::Die::Die(unsigned int seed) : engine_(seed) {}
int dice::Die::roll() {
    return faces_(engine_);
}
```

Recompile the object. Before writing the caller, trace two calls: the first advances engine_; the second starts from that changed state. Game::apply remains unchanged.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/dice/Die.cpp -o die.o"
```

## Compare two independently owned sequences

Replace the probe with two Dice constructed from the same seed. Advance each exactly once per loop iteration and compare results. The temporary face preserves the first result so the bounds check does not consume another roll. This checks two properties without depending on a particular printed sequence.

**Edit `explore/random_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/random_probe.cpp
#include <iostream>
#include "dice/Die.hpp"
int main() {
    dice::Die first(42);
    dice::Die replay(42);
    for (int i = 0; i < 12; ++i) {
        int face = first.roll();
        if (face != replay.roll()) return 1;
        if (face < 1 || face > 6) return 2;
    }
    std::cout << "replay matched\n";
    return 0;
}
```

Run g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/random_probe.cpp src/dice/Die.cpp -o random_probe, then ./random_probe. Expect replay matched. This alone would also accept a broken die that always returns three. The independent challenge will distinguish that defect; do not mistake repeatability for randomness.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/random_probe.cpp src/dice/Die.cpp -o random_probe"
run "./random_probe" stdout="replay matched"
```

## Try it — Desynchronize a replay

Temporarily add first.roll() before the loop. You have consumed an extra value from only one engine; the comparisons should detect a mismatch in this sample. A single equal pair could occur by chance, so compare a sequence rather than claiming every shifted value must differ. Restore the extra call. Next change both seeds together: repeatability should remain. The seed is only part of a replay recipe; the number and order of calls matter too.



## Your turn — Reject a constant die

Create tests/dice.cpp. Construct two Dice with seed 91. Compare their first roll and the next 1000 rolls in lockstep; require every observed face to be in 1..6 and each pair to match. Track whether any later face differs from the first. Fail if none differs. Print dice passed only after all checks. Do not require specific faces, exact counts, or every adjacent pair to differ.

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/dice.cpp src/dice/Die.cpp -o dice_tests
./dice_tests
```

```hints
nudge: Store each generated face once before making several claims about it.
concept: A bool can remember whether variation has ever been observed; do not reset it on each iteration.
shape: Save the first pair, loop over later pairs, check range and equality, then check the remembered variation after the loop.
```

The variation check is a deterministic smoke test for the chosen seed and build, not a proof of statistical fairness or a universal mathematical property of every finite sample. Temporarily return 3 from Die::roll: your test must fail even though range and replay still pass. Then try returning 7; the bounds check must fail. Restore the implementation. Explain why reseeding inside roll would also defeat variation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/dice.cpp src/dice/Die.cpp -o dice_tests"
run "./dice_tests" stdout="dice passed"
run "g++ -std=c++20 -Iinclude tests/dice.cpp -o missing_die" exit=1
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/random_probe.cpp src/dice/Die.cpp -o random_probe"
run "./random_probe" stdout="replay matched"
```

## Keep random generation separate from rule testing

Add Die.cpp and the dice_tests target to the build. The game tests still supply explicit faces; the dice tests examine generation. A failure now points toward a smaller responsibility than an entire interactive match.

**Edit `CMakeLists.txt`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cmake file=CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(DiceLab LANGUAGES CXX)
add_library(dice_rules STATIC src/dice/Score.cpp src/dice/Game.cpp src/dice/Command.cpp src/dice/Die.cpp)
target_include_directories(dice_rules PUBLIC include)
target_compile_features(dice_rules PUBLIC cxx_std_20)
add_executable(score_demo apps/score_demo.cpp)
target_link_libraries(score_demo PRIVATE dice_rules)
enable_testing()
add_executable(score_contract tests/shared_score.cpp)
target_link_libraries(score_contract PRIVATE dice_rules)
add_test(NAME score_contract COMMAND score_contract)
add_executable(score_boundaries tests/score_boundaries.cpp)
target_link_libraries(score_boundaries PRIVATE dice_rules)
add_test(NAME score_boundaries COMMAND score_boundaries)
add_executable(game_rules tests/game_rules.cpp)
target_link_libraries(game_rules PRIVATE dice_rules)
add_test(NAME game_rules COMMAND game_rules)
add_executable(command_tests tests/commands.cpp)
target_link_libraries(command_tests PRIVATE dice_rules)
add_test(NAME command_tests COMMAND command_tests)
add_executable(dice_tests tests/dice.cpp)
target_link_libraries(dice_tests PRIVATE dice_rules)
add_test(NAME dice_tests COMMAND dice_tests)
```

Configure, build and run CTest. Check dice_tests is listed and passes. Next we can connect the model, parser and die without introducing their mechanisms all at once.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "ctest --test-dir build-dice --output-on-failure" stdout="dice_tests"
```

