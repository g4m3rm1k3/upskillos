---
title: A19 — Turn a whole line into a command
track: C++ Games — Build the Project
trackOrder: 4.3
runtime: cpp
console: true
---

**Outcome:** Read complete input lines and translate them into commands without changing game state.

**Recall before looking at code:** Why must a rejected request leave the game unchanged? What does failed input extraction mean?

A player should be able to type roll, bank or quit. Before connecting input to the match, build a small translator you can test without a keyboard. Its contract is deliberately strict: exactly those lowercase words are accepted. Spaces, extra words and capital letters are rejected. Friendly normalization can be a later feature with its own tests. Keep your existing dice-lab folder.

## Keep all the text the player typed

Create explore/command_probe.cpp. A **string** is an owning sequence of characters; std::string comes from the string header and starts empty here. std::getline reads until a newline, stores the preceding characters in line, and consumes that newline without storing it. Unlike cin >> line, it retains spaces. It returns the stream, so the familiar ! test detects failure. End of input means no next line is available; it is not the same as a successfully read empty line.

**Edit `explore/command_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/command_probe.cpp
#include <iostream>
#include <string>
int main() {
    std::string line;
    if (!std::getline(std::cin, line)) {
        std::cout << "end of input\n";
        return 0;
    }
    std::cout << "[" << line << "]\n";
    return 0;
}
```

Compile with g++ -std=c++20 -Wall -Wextra -pedantic explore/command_probe.cpp -o command_probe, then ./command_probe. Type roll now and press Enter: expect [roll now]. Pressing Enter on an empty line prints []. These brackets make otherwise invisible spaces visible. We use line input consistently; mixing >> with getline can leave the previous newline waiting to be read.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/command_probe.cpp -o command_probe"
run "./command_probe" stdin="roll now\n" stdout="[roll now]"
run "./command_probe" stdin="\n" stdout="[]"
run "./command_probe" stdin="" stdout="end of input"
```

## Name the result of interpretation

Create include/dice/Command.hpp. **Parsing** means interpreting text according to a stated grammar; ours is a tiny list of exact words. Command has Quit and Invalid in addition to the two game actions. Quit is an application request, not a game transition. The function borrows a string through const reference: it does not copy or modify the caller’s text.

**Edit `include/dice/Command.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/dice/Command.hpp
#ifndef DICE_COMMAND_HPP
#define DICE_COMMAND_HPP
#include <string>
namespace dice {
enum class Command { Roll, Bank, Quit, Invalid };
Command parseCommand(const std::string& line);
}
#endif
```

Keep Command separate from Action. The game should never need to understand spelling or a request to close the application. This is an **input boundary**: outside text becomes a value the application can examine.

```check
file include/dice/Command.hpp
```

## Translate exact words without side effects

Create src/dice/Command.cpp. String == compares the complete character sequence, not an address. Each successful comparison returns immediately. Falling through all three comparisons returns Invalid. A **pure function** returns a result determined by its inputs without changing outside state: this parser does not read the terminal, roll a die or change a Game.

```predict
question: What should the complete line roll now produce?
choice: Invalid
choice: Roll
answer: Invalid
explain: The entire string must equal roll; an accepted first word does not make the rest valid.
```


**Edit `src/dice/Command.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/dice/Command.cpp
#include "dice/Command.hpp"
dice::Command dice::parseCommand(const std::string& line) {
    if (line == "roll") return Command::Roll;
    if (line == "bank") return Command::Bank;
    if (line == "quit") return Command::Quit;
    return Command::Invalid;
}
```

Compile this source with -c to check it independently: g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/dice/Command.cpp -o command.o. -c produces an object file without linking an executable. It has no main and cannot be run. The next edit supplies a caller and observes behavior.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/dice/Command.cpp -o command.o"
```

## Observe the translated value

Add the header and replace the bracket output with a call and named-result observations. Only this caller prints messages. The parser remains reusable in tests, and these messages are not yet game actions.

**Edit `explore/command_probe.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/command_probe.cpp
#include <iostream>
#include <string>
#include "dice/Command.hpp"
int main() {
    std::string line;
    if (!std::getline(std::cin, line)) {
        std::cout << "end of input\n";
        return 0;
    }
    dice::Command command = dice::parseCommand(line);
    if (command == dice::Command::Roll) std::cout << "roll requested\n";
    if (command == dice::Command::Bank) std::cout << "bank requested\n";
    if (command == dice::Command::Quit) std::cout << "quit requested\n";
    if (command == dice::Command::Invalid) std::cout << "invalid command\n";
    return 0;
}
```

Run g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/command_probe.cpp src/dice/Command.cpp -o command_probe, then ./command_probe. Type bank: expect bank requested. Try roll now: expect invalid command. A recognized bank request can still be illegal for an empty pot; syntax validity and game legality answer different questions.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/command_probe.cpp src/dice/Command.cpp -o command_probe"
run "./command_probe" stdin="bank\n" stdout="bank requested" without="invalid command"
run "./command_probe" stdin="roll now\n" stdout="invalid command" without="roll requested"
```

## Try it — Separate blank input from closed input

Run the probe and press Enter without text: that line is invalid, but reading succeeded. Run again and signal end of input (Ctrl+Z then Enter in a Windows console, or Ctrl+D at an empty Unix terminal prompt): expect end of input. Now try Roll, roll followed by a space, and quit now; all are invalid. Explain why a parser cannot decide whether Bank is legal: its only input is text. Do not add Game state to solve a spelling problem.



## Your turn — Specify the accepted language

Create tests/commands.cpp without a supplied body. Test all three accepted words against their particular Command values. Reject empty text, roll now, Roll, leading and trailing spaces around bank, and an unknown word. Also show that passing a stored string leaves it unchanged. Use direct function calls, not terminal input, and return nonzero on any failed claim. Print commands passed only after every claim holds.

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/commands.cpp src/dice/Command.cpp -o command_tests
./command_tests
```

```hints
nudge: Valid words must map to distinct results; checking only that they are not Invalid is insufficient.
concept: Literal strings can be arguments to the same const-reference interface as a named string.
shape: Compare each returned enum, return a failure status for a mismatch, and reserve the final success print for after all comparisons.
```

Test your tests: temporarily map bank to Roll, then temporarily return Roll for unknown text, one fault at a time. Your freshly compiled tests must reject both. Restore the implementation each time. Explain how an empty line differs from end of input and why neither belongs in Game::apply. These checks exercise examples; they cannot grade your explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/commands.cpp src/dice/Command.cpp -o command_tests"
run "./command_tests" stdout="commands passed"
run "g++ -std=c++20 -Iinclude tests/commands.cpp -o missing_parser" exit=1
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude explore/command_probe.cpp src/dice/Command.cpp -o command_probe"
run "./command_probe" stdin="quit\n" stdout="quit requested"
```

## Run the parser contract with the game contracts

Add Command.cpp to dice_rules and register command_tests. Keeping these small functions in the same library does not make the game depend on terminal input: neither implementation reads cin. Later the application will connect input, random generation and model operations.

**Edit `CMakeLists.txt`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cmake file=CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(DiceLab LANGUAGES CXX)
add_library(dice_rules STATIC src/dice/Score.cpp src/dice/Game.cpp src/dice/Command.cpp)
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
```

Configure, build and run CTest. Look for command_tests as well as game_rules. Keep your parser tests when the full terminal application arrives; interactive play alone is a poor way to repeat boundary cases.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "ctest --test-dir build-dice --output-on-failure" stdout="command_tests"
```

