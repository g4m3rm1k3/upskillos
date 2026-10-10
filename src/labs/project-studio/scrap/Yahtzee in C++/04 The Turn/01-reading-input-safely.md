---
title: 4.1 — Reading Input Safely
track: The Turn
runtime: none
support: tests/fakeinput.h, tests/test_input.cpp, tests/test_yesno.cpp
---

A game that crashes or loops forever when someone types `abc` is not finished. In this lesson all keyboard reading moves into one file, `Input`. You meet how C++ input streams fail, how to read whole lines, and how to test code that normally waits for a keyboard.

Press this lesson's support button first. It creates three files in `tests/`.

## Describe the input functions

Words first:

- **Stream**: an object you read characters from (`std::cin`) or write characters to (`std::cout`).
- **Failure state**: a stream remembers when a read went wrong, for example when it expected a number and found a letter. Once it has failed, later reads do nothing until it is cleared.
- **Output parameter**: a non-const reference parameter that the function writes a result into. It lets a function hand back more than the one value it returns.

Create `Input.h`.

```cpp file=Input.h
#ifndef INPUT_H
#define INPUT_H

#include <cstddef>
#include <string>
#include <vector>

std::string trim(const std::string& text);
std::string toLowerCopy(std::string text);
std::vector<bool> parseKeepers(const std::string& line, std::size_t count);
bool parseInt(const std::string& line, int& value);
bool readLine(std::string& line);
bool askInt(const std::string& prompt, int low, int high, int& value);

#endif
```

Line by line:

- `std::string trim(const std::string& text);`: removes spaces, tabs and line-ending characters from both ends. Windows can leave a `\r` at the end of a typed line, and without trimming `"a\r"` would not equal `"a"`.
- `std::string toLowerCopy(std::string text);`: the parameter has **no** `&`. That is deliberate. The caller's string is copied into `text`, the function changes the copy, and returns it. When a function needs its own copy anyway, taking the parameter by value is the simplest way to get one.
- `std::vector<bool> parseKeepers(const std::string& line, std::size_t count);`: turns what the player typed ("1 3 5" or "a") into one true or false per die. It is pure. Nothing is read from the keyboard here, so it can be tested with plain text.
- `bool parseInt(const std::string& line, int& value);`: the `int&` is an output parameter. The function returns `true` or `false` for success and writes the number into the caller's variable only on success.
- `bool readLine(std::string& line);`: reads one line from the keyboard into `line`. It returns `false` when input has ended.
- `bool askInt(const std::string& prompt, int low, int high, int& value);`: asks until the player gives a whole number from `low` to `high`. It returns `false` only if input ends first.

## Define them

Words first:

- **`std::string::npos`**: a constant equal to the largest possible `std::size_t`. String search functions return it to mean "not found".
- **Narrowing / sign conversion**: changing a number's type can change its meaning. An `int` of -1 converted to `std::size_t` becomes a gigantic positive number.

Create `Input.cpp`.

```cpp file=Input.cpp
#include <cctype>
#include <iostream>
#include <sstream>

#include "Input.h"

std::string trim(const std::string& text) {
    const char* whitespace = " \t\r\n";
    std::size_t first = text.find_first_not_of(whitespace);
    if (first == std::string::npos) {
        return "";
    }
    std::size_t last = text.find_last_not_of(whitespace);
    return text.substr(first, last - first + 1);
}

std::string toLowerCopy(std::string text) {
    for (char& c : text) {
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    }
    return text;
}

std::vector<bool> parseKeepers(const std::string& line, std::size_t count) {
    std::vector<bool> kept(count, false);
    std::string cleaned = toLowerCopy(trim(line));

    if (cleaned == "a") {
        kept.assign(count, true);
        return kept;
    }

    std::stringstream numbers(cleaned);
    int number = 0;
    while (numbers >> number) {
        if (number >= 1 && static_cast<std::size_t>(number) <= count) {
            kept[static_cast<std::size_t>(number) - 1] = true;
        }
    }
    return kept;
}

bool parseInt(const std::string& line, int& value) {
    std::stringstream numbers(trim(line));
    int parsed = 0;
    char extra = 0;
    if (!(numbers >> parsed)) {
        return false;
    }
    if (numbers >> extra) {
        return false;
    }
    value = parsed;
    return true;
}

bool readLine(std::string& line) {
    return static_cast<bool>(std::getline(std::cin, line));
}

bool askInt(const std::string& prompt, int low, int high, int& value) {
    while (true) {
        std::cout << prompt;
        std::string line;
        if (!readLine(line)) {
            return false;
        }
        int parsed = 0;
        if (parseInt(line, parsed) && parsed >= low && parsed <= high) {
            value = parsed;
            return true;
        }
        std::cout << "Please type a whole number from " << low << " to " << high << ".\n";
    }
}
```

`trim`:

- `const char* whitespace = " \t\r\n";`: a pointer to a read-only text of the four characters to remove: space, tab, carriage return, newline. The pointer can change, but the characters cannot.
- `text.find_first_not_of(whitespace)`: the position of the first character that is **not** in that set, or `std::string::npos` if there is none.
- `if (first == std::string::npos) { return ""; }`: the text is empty or only whitespace. Returning `""` converts to an empty `std::string`.
- `text.find_last_not_of(whitespace)`: the position of the last character to keep.
- `text.substr(first, last - first + 1)`: a new string that starts at `first` and is `last - first + 1` characters long. Both positions are unsigned and `last >= first`, so the subtraction cannot wrap.

`toLowerCopy`:

- `for (char& c : text)`: `c` is a reference to each character inside the copy, so assigning to `c` changes `text`.
- `std::tolower` takes an `int` that must hold a value of `unsigned char` (or the special value `EOF`). Plain `char` is signed on many systems, so a character with a negative value passed straight in is undefined behavior. The cast `static_cast<unsigned char>(c)` makes the value safe. The result is an `int`, so it is cast back to `char`.

`parseKeepers`:

- `std::vector<bool> kept(count, false);`: `count` entries, all `false`.
- `toLowerCopy(trim(line))`: trims first and lowercases the result, so `" A \r"` becomes `"a"`.
- `kept.assign(count, true);`: replaces the contents with `count` copies of `true`, then returns early.
- `std::stringstream numbers(cleaned);`: lets you pull numbers out of text with `>>`.
- `while (numbers >> number) {`: each `>>` reads the next whole number. If it cannot, the stream enters its failure state and the loop ends. The condition is true only while reads succeed. A word stops it: for `"1 x 3"` only the 1 is read.
- `number >= 1 && static_cast<std::size_t>(number) <= count`: the first test comes first on purpose. A negative `number` is rejected before it is converted. Converted to `std::size_t`, -1 would become huge.
- `kept[static_cast<std::size_t>(number) - 1] = true;`: players count from 1, the vector from 0. The write goes through `std::vector<bool>`'s proxy, which is why `kept[i] = true` works.

`parseInt`:

- `int parsed = 0; char extra = 0;`: both start with a value, since a failed read leaves them unchanged.
- `if (!(numbers >> parsed)) { return false; }`: no whole number at the start means failure.
- `if (numbers >> extra) { return false; }`: reading into a `char` skips spaces and succeeds if anything at all is left. So `"12abc"` and `"3 4"` are rejected.
- `value = parsed;`: written only after both checks pass. On failure the caller's variable is untouched.

`readLine` and `askInt`:

- `std::getline(std::cin, line)` returns the stream itself. `static_cast<bool>(...)` asks "did the last read work?" It is `false` when input has ended (Ctrl+D on macOS and Linux, Ctrl+Z then Enter on Windows) or has failed.
- That check matters. If input ends, every later read fails at once. A loop that ignores it would print its prompt forever.
- `askInt` loops until the answer fits. `parseInt(line, parsed) && parsed >= low && parsed <= high` checks the text, then the range. `&&` stops at the first false part.
- `value = parsed;` is the only write to the caller's variable.

```predict
question: The player types 5 and presses Enter. Your code reads it with `std::cin >> n`. What is left waiting in the input?
choice: Nothing, everything was read
choice: Only the newline from the Enter key
choice: The digit 5 again
answer: Only the newline from the Enter key
explain: The >> operator reads the 5 and stops. The newline stays. A getline right after it would return an empty line immediately. That is why this project reads whole lines with getline and parses them itself.
```

## Try it

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <string>
#include <vector>

#include "Dice.h"
#include "Input.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    dice.draw();

    std::string line;
    std::cout << "Dice to keep (for example 1 3 5, a for all): ";
    if (!readLine(line)) {
        std::cout << "\nNo input.\n";
        return 1;
    }
    std::vector<bool> kept = parseKeepers(line, dice.size());

    std::cout << "Kept:";
    for (std::size_t i = 0; i < kept.size(); i++) {
        if (kept[i]) {
            std::cout << " " << i + 1;
        }
    }
    std::cout << "\n";

    int number = 0;
    if (!askInt("Pick a number from 1 to 13: ", 1, 13, number)) {
        std::cout << "\nNo input.\n";
        return 1;
    }
    std::cout << "Picked " << number << "\n";

    return 0;
}
```

New lines:

- `if (!readLine(line)) { ... return 1; }`: end of input stops the program with exit status 1, which tells the operating system something went wrong.
- `parseKeepers(line, dice.size())`: the list is as long as the number of dice, not a fixed 5.
- `kept[i]` read inside an `if`: reading a `std::vector<bool>` element works as normal.
- `askInt("...", 1, 13, number)`: `number` is passed where `int& value` is expected, so `askInt` writes the answer straight into it.

```bash
g++ -std=c++17 main.cpp Input.cpp Dice.cpp Die.cpp Terminal.cpp -o game
./game
```

```check
file Input.h
file Input.cpp
run "g++ -std=c++17 main.cpp Input.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the input program builds" -- List all five .cpp files in the command.
run "./game" stdin="1 3\n7\n" stdout="Kept: 1 3" label="numbers are parsed into kept dice" -- parseKeepers sets entry number-1 to true.
run "./game" stdin="a\n7\n" stdout="Kept: 1 2 3 4 5" label="a keeps every die" -- Compare the trimmed, lowercased text with "a" before parsing numbers.
run "./game" stdin="\nabc\n99\n13\n" stdout="Picked 13" label="bad answers are asked again" -- askInt must loop until the answer is a whole number in range.
run "./game" stdin="\nabc\n99\n13\n" stdout="Please type a whole number from 1 to 13." label="a bad answer prints a hint" -- Print the hint inside the loop before asking again.
run "./game" stdin="" exit=1 label="the program stops when input ends" -- readLine returns false at the end of input, and main returns 1.
```

## Read the tests

Normally code that reads `std::cin` cannot be tested, because the test would wait for a keyboard. The support button created `tests/fakeinput.h`. It swaps what `std::cin` reads from.

```cpp file=tests/fakeinput.h provided
#ifndef FAKEINPUT_H
#define FAKEINPUT_H

#include <iostream>
#include <sstream>
#include <string>

// While a FakeInput exists, std::cin reads from the text you give it
// instead of from the keyboard. When it goes out of scope, the keyboard
// is put back.
class FakeInput {
private:
    std::istringstream stream;
    std::streambuf* original;

public:
    explicit FakeInput(const std::string& text)
        : stream(text), original(std::cin.rdbuf(stream.rdbuf())) {}

    ~FakeInput() {
        std::cin.rdbuf(original);
    }

    FakeInput(const FakeInput&) = delete;
    FakeInput& operator=(const FakeInput&) = delete;
};

#endif
```

How it works:

- `std::istringstream stream;`: a stream that reads from a string in memory.
- `std::streambuf* original;`: a pointer to the buffer `std::cin` was using. A stream does its reading through a buffer object, and `rdbuf()` gets or replaces it.
- `: stream(text), original(std::cin.rdbuf(stream.rdbuf()))`: the member initializer list. `stream` is built from the text. Then `std::cin.rdbuf(...)` makes `std::cin` use the string's buffer and **returns the previous buffer**, which is saved in `original`. Members are initialized in the order they are declared, and `stream` is declared first, which is why this order is safe.
- `~FakeInput() { std::cin.rdbuf(original); }`: a **destructor**. C++ runs it automatically when the object goes out of scope. It puts the keyboard back. The test cannot forget to, and it still happens if the test ends early. This is the idea called RAII: tie cleaning up to an object's lifetime.
- `FakeInput(const FakeInput&) = delete;`: `= delete` forbids a function from existing. Copying a `FakeInput` would give two objects that both try to restore the keyboard, so copying is turned into a compile error.

A test then reads like this:

```cpp
TEST(Input, AskIntAsksAgainUntilTheAnswerFits) {
    FakeInput in("abc\n99\n0\n7\n");
    int v = -1;
    EXPECT_EQ(askInt("? ", 1, 13, v), true);
    EXPECT_EQ(v, 7);
}
```

`askInt` sees `abc`, then `99`, then `0` (all rejected), and accepts `7`.

```bash
g++ -std=c++17 tests/test_input.cpp Input.cpp -o test_input
./test_input
```

```check
run "g++ -std=c++17 tests/test_input.cpp Input.cpp -o test_input" label="the input tests build" -- Press the lesson's support button if the tests folder is missing files.
tests "./test_input" require="Input.AskIntGivesUpWhenInputEnds" label="the input tests pass" -- askInt must return false when readLine fails, and leave the value alone.
tests "./test_input" require="Input.ParseIntRejectsEverythingElse" label="parseInt rejects bad text" -- Reject trailing characters, and write the value only on success.
```

## Your turn: yes or no

Add `bool parseYesNo(const std::string& line, bool& yes)` to `Input`. It accepts `y` or `yes` (answer true) and `n` or `no` (answer false), in any mix of upper and lower case, with spaces around. It returns `true` when it understood the answer and `false` otherwise. On failure it must leave `yes` unchanged. Declare it in `Input.h` and define it in `Input.cpp`, and use the helpers already there. The test file `tests/test_yesno.cpp` is already in your project.

```check
matches Input.h "bool[ ]+parseYesNo[ ]*[(][ ]*const[ ]+std::string[ ]*&[^,]*,[ ]*bool[ ]*&" label="Input.h declares parseYesNo" -- Take a const std::string& and a bool&, and return bool.
run "g++ -std=c++17 tests/test_yesno.cpp Input.cpp -o test_yesno" label="the yes/no tests build" -- Declare the function in Input.h and define it in Input.cpp.
tests "./test_yesno" require="YesNo.AcceptsYes" label="yes answers are understood" -- Trim and lowercase first, then compare with y and yes.
tests "./test_yesno" require="YesNo.LeavesTheAnswerAloneOnFailure" label="a failed parse leaves the answer alone" -- Write to yes only inside the branches that return true.
```

```hints
nudge: Which two helpers in Input.cpp already clean up the text for you?
concept: trim removes the edges and toLowerCopy removes the case differences. After both, only four exact words matter: y, yes, n and no. The output parameter is written only when you are about to return true.
shape: Declare the function in Input.h. In Input.cpp make `std::string word = toLowerCopy(trim(line));`. If it is y or yes, set `yes = true` and return true. If it is n or no, set `yes = false` and return true. Otherwise return false.
answer: One way to write it:
~~~cpp
// Input.h
bool parseYesNo(const std::string& line, bool& yes);

// Input.cpp
bool parseYesNo(const std::string& line, bool& yes) {
    std::string word = toLowerCopy(trim(line));
    if (word == "y" || word == "yes") {
        yes = true;
        return true;
    }
    if (word == "n" || word == "no") {
        yes = false;
        return true;
    }
    return false;
}
~~~
```
