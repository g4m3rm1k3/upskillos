---
title: 3.1 — Counting Faces
track: Counting and Scoring
runtime: none
support: tests/test_counting.cpp, tests/test_highest_count.cpp
---

Almost every Yahtzee category starts with the same question: how many dice show each face? Three of a kind asks whether any face appears three times. A full house asks for one face that appears three times and another that appears twice. In this lesson you build one table of counts that every scoring rule will read. You also meet `std::array`, the fixed-size container that replaces C's raw arrays.

Press this lesson's support button first. It creates two test files in `tests/`.

## Describe the table

Words first:

- **`std::array<T, N>`**: a standard library type that holds exactly `N` values of type `T`, stored side by side. The size is part of the type, so `std::array<int, 7>` and `std::array<int, 6>` are different types.
- **Type alias**: a second name for a type that already exists. `using Counts = std::array<int, 7>;` makes `Counts` mean exactly that type. No new type is created.
- **Overloading**: two functions may share a name if their parameter types differ. You met this in lesson 1.3.

Create `Scoring.h`.

```cpp file=Scoring.h
#ifndef SCORING_H
#define SCORING_H

#include <array>
#include <vector>

#include "Dice.h"

using Counts = std::array<int, 7>;

Counts countFaces(const std::vector<int>& faces);
Counts countFaces(const Dice& dice);
int sumFromCounts(const Counts& counts);

#endif
```

Line by line:

- `#ifndef SCORING_H` / `#define SCORING_H` / `#endif`: the include guard from lesson 1.2, with a name that no other header uses.
- `#include <array>`: declares `std::array`. `#include <vector>` declares `std::vector`, which one of the functions below uses. `#include "Dice.h"` is there because the second `countFaces` takes a `Dice`.
- `using Counts = std::array<int, 7>;`: `Counts` is seven `int` values. Slot 0 is never used. Slots 1 to 6 are the faces, so `counts[3]` is the number of dice showing a 3. That is why there are seven slots and not six.
- Unlike a raw array (`int a[7]`), a `std::array` can be copied with `=`, passed to a function by value, and returned from a function. It also knows its own size (`counts.size()` is 7).
- `Counts countFaces(const std::vector<int>& faces);`: reads a list of face values and returns the table. This version exists so the code can be tested with chosen faces. A `Dice` rolls at random, so a test could never know which faces it holds.
- `Counts countFaces(const Dice& dice);`: the same name with a different parameter type. The compiler chooses between the two by looking at the argument. A `Dice` can never be mistaken for a `std::vector<int>`, and `Dice`'s constructor is `explicit`, so a bare number cannot silently turn into a `Dice` either.
- `const std::vector<int>&` and `const Dice&`: references that cannot be used to change the object. Nothing is copied, and the function promises to only read.
- `int sumFromCounts(const Counts& counts);`: adds up the value of all the dice, using only the table. Scoring rules will need the total often.

## Fill the table

Words first:

- **Value initialization**: writing `{}` after a variable's name, as in `Counts counts{};`, sets every number inside it to 0.
- **Copy elision**: the compiler may build a returned object directly in the caller's variable, so nothing is copied at all.

Create `Scoring.cpp`.

```cpp file=Scoring.cpp
#include "Scoring.h"

Counts countFaces(const std::vector<int>& faces) {
    Counts counts{};
    for (int face : faces) {
        if (face >= 1 && face <= 6) {
            counts[face]++;
        }
    }
    return counts;
}

Counts countFaces(const Dice& dice) {
    std::vector<int> faces;
    for (std::size_t i = 0; i < dice.size(); i++) {
        faces.push_back(dice.face(i));
    }
    return countFaces(faces);
}

int sumFromCounts(const Counts& counts) {
    int total = 0;
    for (int face = 1; face <= 6; face++) {
        total += face * counts[face];
    }
    return total;
}
```

Line by line:

- `Counts countFaces(const std::vector<int>& faces) {`: the signature matches the header exactly.
- `Counts counts{};`: a local variable. A local `std::array<int, 7>` with no initializer holds leftover bytes, the same rule as a local `int dice[5]`. The empty braces set all seven numbers to 0, so the loop below starts counting from zero.
- `for (int face : faces) {`: a range-based for. `int face` is a copy of each element. That is fine for an `int`, which is tiny. For a large type you would write `const auto&` to avoid copies.
- `if (face >= 1 && face <= 6) {`: a guard. `counts[face]` on a `std::array` is **not** bounds-checked. A face of 9 would write outside the array, which is undefined behavior. Faces outside 1 to 6 are skipped instead.
- `counts[face]++;`: adds 1 to that slot.
- `return counts;`: returns the table by value. In practice the compiler builds it directly in the caller's variable. Even if it were copied, seven `int`s are cheap.
- `std::vector<int> faces;`: an empty list. `faces.push_back(...)` adds one value to its end, and the vector grows as needed.
- `dice.size()` and `dice.face(i)`: the public functions of `Dice`. The class keeps its dice private, so these are the only way to read them.
- `return countFaces(faces);`: `faces` is a `std::vector<int>`, so the first overload runs. The Dice version does no counting of its own.
- `total += face * counts[face];`: a face value times how many dice show it. Faces 2, 2, 6, 6, 6 give `2*2 + 6*3 = 22`.

```predict
question: You change `Counts counts{};` to `Counts counts;` and rebuild. Which statement is true?
choice: counts always starts at 0 anyway
choice: The compiler refuses to build it
choice: The starting values are not defined, so the program may work or print nonsense
answer: The starting values are not defined, so the program may work or print nonsense
explain: Only global and static variables are zeroed automatically. A local std::array of ints holds whatever was in that memory before, and the language says nothing about it. The compiler does not refuse, which is why the empty braces matter.
```

## Print the table

```cpp file=main.cpp
#include <cstdlib>
#include <ctime>
#include <iostream>

#include "Dice.h"
#include "Scoring.h"

int main() {
    std::srand(static_cast<unsigned>(std::time(nullptr)));

    Dice dice(5);
    dice.draw();

    Counts counts = countFaces(dice);
    for (int face = 1; face <= 6; face++) {
        std::cout << "Face " << face << ": " << counts[face] << "\n";
    }
    std::cout << "Total: " << sumFromCounts(counts) << "\n";

    return 0;
}
```

New lines:

- `Counts counts = countFaces(dice);`: `dice` is a `Dice`, so the second overload runs. The returned table goes into `counts`.
- `counts[face]`: the number of dice showing that face. The loop starts at 1 because slot 0 is unused.
- `sumFromCounts(counts)`: the total of the five dice.

Build and run it. The command now lists five `.cpp` files:

```bash
g++ -std=c++17 main.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game
./game
```

```check
file Scoring.h
file Scoring.cpp
run "g++ -std=c++17 main.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o game" label="the counting program builds" -- List all five .cpp files in the command.
run "./game" stdout="Face 6:" label="a count is printed for every face" -- Loop from 1 to 6 and print the count of each face.
run "./game" stdout="Total:" label="the total is printed" -- Print sumFromCounts(counts) after the loop.
```

## Read the tests

The support button created `tests/test_counting.cpp`. One test shows the idea:

```cpp
TEST(Counting, CountsEachFace) {
    Counts c = countFaces(std::vector<int>{3, 3, 5, 6, 1});
    EXPECT_EQ(c[1], 1);
    EXPECT_EQ(c[3], 2);
    EXPECT_EQ(c[6], 1);
}
```

- `std::vector<int>{3, 3, 5, 6, 1}`: builds a list of five chosen faces. The braces list the values. This calls the first overload and needs no dice at all.
- Because the faces are chosen, the expected counts are known. A test with random dice could not say what the answer should be.
- Other tests check that slot 0 stays 0 and that impossible faces such as 0, 7 or -2 are ignored.

The test program links `Dice.cpp`, `Die.cpp` and `Terminal.cpp` too, because `Scoring.cpp` calls into `Dice`.

```bash
g++ -std=c++17 tests/test_counting.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_counting
./test_counting
```

```check
run "g++ -std=c++17 tests/test_counting.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_counting" label="the counting tests build" -- Press the lesson's support button if tests/test_counting.cpp is missing.
tests "./test_counting" require="Counting.IgnoresImpossibleFaces" label="the counting tests pass" -- A face outside 1 to 6 must never touch the table.
```

## Your turn: the biggest count

Add `int highestFaceCount(const Counts& counts)` to the project. It returns the largest number in slots 1 to 6, which is how many dice show the most common face. Declare it in `Scoring.h` and define it in `Scoring.cpp`. Slot 0 must be ignored. The test file `tests/test_highest_count.cpp` is already in your project. The next lesson uses this function.

```check
matches Scoring.h "int[ ]+highestFaceCount[ ]*[(][ ]*const[ ]+Counts[ ]*&" label="Scoring.h declares highestFaceCount" -- Take a const Counts& and return an int.
run "g++ -std=c++17 tests/test_highest_count.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp -o test_highest_count" label="the highest-count tests build" -- The declaration and the definition must match exactly.
tests "./test_highest_count" require="Highest.SlotZeroIsIgnored" label="the highest-count tests pass" -- Start the loop at face 1. Slot 0 is never a face.
```

```hints
nudge: What do you need to remember while you look at all six counts one after another?
concept: A "largest so far" variable starts at 0 and is replaced whenever a count is bigger than it. The counts you care about are in slots 1 to 6.
shape: Declare the function in Scoring.h. In Scoring.cpp start `int highest = 0;`, loop `face` from 1 to 6, and update `highest` when `counts[face]` is larger. Return it.
answer: One way to write it:
~~~cpp
// Scoring.h
int highestFaceCount(const Counts& counts);

// Scoring.cpp
int highestFaceCount(const Counts& counts) {
    int highest = 0;
    for (int face = 1; face <= 6; face++) {
        if (counts[face] > highest) {
            highest = counts[face];
        }
    }
    return highest;
}
~~~
```
