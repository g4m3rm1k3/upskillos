# Phase 1 Checkpoint Project: Dynamic Arrays, For Real This Time

*Reimplement your Phase-0 mini-projects using dynamic arrays instead of fixed ones.*

---

## The point of this checkpoint

Phase 0's mini-project quietly leaned on `std::vector` and `std::map` — real library containers, doing all their memory management invisibly, exactly like Python. That was fine at the time; you didn't have the tools to do better yet. You do now. This checkpoint forces you to swap that invisible convenience for **your own Lesson 1.6 resizable array** — no `std::vector` allowed anywhere below — so that every push, every grow, every byte of cleanup is something *you* wrote and can account for.

To keep this scoped to what Phase 1 actually gave you, each task below is reshaped to work with an array of `int` — the type your Lesson 1.6 array already supports. That's not a limitation to work around quietly; noticing *why* a generic container would need Phase 10's templates to handle arbitrary types, and working around that gap by hand for now, is itself part of the exercise.

Here's the toolkit you're bringing forward, unchanged, from Lesson 1.6:

```cpp
#include <iostream>
#include <memory>

void pushBack(int*& data, int& size, int& capacity, int value) {
    if (size == capacity) {
        int newCapacity = (capacity == 0) ? 1 : capacity * 2;
        int* newData = new int[newCapacity];
        for (int i = 0; i < size; i++) {
            newData[i] = data[i];
        }
        delete[] data;
        data = newData;
        capacity = newCapacity;
    }
    data[size] = value;
    size++;
}

int get(int* data, int size, int index) {
    if (index < 0 || index >= size) {
        std::cerr << "Index out of bounds!" << std::endl;
        return -1;
    }
    return data[index];
}
```

---

## 1. Temperature Converter → batch mode

Instead of converting one temperature, read an unknown number of them (you don't know the count ahead of time — a genuine reason to need a *resizable* container, not a fixed array) and convert all of them.

**Decide before writing:**
- Where does `pushBack`'s `int*&` requirement (Lesson 1.6) show up here? Trace exactly which variable needs to be passed by reference-to-pointer, and why a plain `int*` parameter would silently fail to work.
- This checkpoint is your first real chance to choose between Lesson 1.4's manual `delete[]` and Lesson 1.7's `unique_ptr` for cleanup. Try it **both ways** — once with manual `delete[]`, once wrapping the final array in a `std::unique_ptr<int[]>` — and notice how much of Lesson 1.4's cleanup discipline simply disappears in the second version.

<details>
<summary>Reference solution (manual delete[] version)</summary>

```cpp
#include <iostream>

void pushBack(int*& data, int& size, int& capacity, int value) {
    if (size == capacity) {
        int newCapacity = (capacity == 0) ? 1 : capacity * 2;
        int* newData = new int[newCapacity];
        for (int i = 0; i < size; i++) newData[i] = data[i];
        delete[] data;
        data = newData;
        capacity = newCapacity;
    }
    data[size] = value;
    size++;
}

int main() {
    int* celsiusValues = nullptr;
    int size = 0, capacity = 0;

    // Simulating "unknown number of readings" — in a real program these
    // might come from a file (Phase 2's file-I/O checkpoint) or user input.
    int readings[] = {0, 20, 37, 100, -40, 15};
    int numReadings = 6;

    for (int i = 0; i < numReadings; i++) {
        pushBack(celsiusValues, size, capacity, readings[i]);
    }

    std::cout << "Converted " << size << " readings (capacity ended at " << capacity << "):" << std::endl;
    for (int i = 0; i < size; i++) {
        int c = celsiusValues[i];
        double f = c * 9.0 / 5.0 + 32;
        std::cout << "  " << c << "C = " << f << "F" << std::endl;
    }

    delete[] celsiusValues;   // don't forget this — Lesson 1.4's discipline, still in force
    return 0;
}
```

</details>

<details>
<summary>Same program, with unique_ptr instead — notice what disappears</summary>

```cpp
#include <iostream>
#include <memory>

int main() {
    int readings[] = {0, 20, 37, 100, -40, 15};
    int numReadings = 6;

    std::unique_ptr<int[]> celsiusValues = std::make_unique<int[]>(numReadings);
    for (int i = 0; i < numReadings; i++) {
        celsiusValues[i] = readings[i];
    }

    for (int i = 0; i < numReadings; i++) {
        int c = celsiusValues[i];
        double f = c * 9.0 / 5.0 + 32;
        std::cout << c << "C = " << f << "F" << std::endl;
    }

    // no delete[] anywhere. Destructor handles it when celsiusValues goes out of scope.
    return 0;
}
```

Notice this version sidesteps the growable-array problem entirely by allocating the exact known size up front — a fair simplification here since the count is known before the loop. It's included specifically so you can compare it against the manual version and feel exactly what `unique_ptr` removed: the entire `delete[]` line, with a guarantee (not just a hope) that cleanup happens.

</details>

---

## 2. FizzBuzz → store results, don't just print them

This time, don't print inside the loop — **store a numeric code for each result in your dynamic array first**, then print everything in a second pass. This forces you to actually use `pushBack` for every single element, not just simulate it.

Use a simple encoding since your array only holds `int`: `0` = print the number itself, `1` = "Fizz", `2` = "Buzz", `3` = "FizzBuzz".

**Decide before writing:** why does storing *codes* rather than the actual strings sidestep a real limitation of your Lesson 1.6 array? (Answer: your array is `int*`-based — it has no way to hold a `std::string` at all without a genuinely different container type, which is exactly what Phase 10's templates exist to let you write *once*, generically, instead of building a separate array type per element type by hand.)

<details>
<summary>Reference solution</summary>

```cpp
#include <iostream>

void pushBack(int*& data, int& size, int& capacity, int value) {
    if (size == capacity) {
        int newCapacity = (capacity == 0) ? 1 : capacity * 2;
        int* newData = new int[newCapacity];
        for (int i = 0; i < size; i++) newData[i] = data[i];
        delete[] data;
        data = newData;
        capacity = newCapacity;
    }
    data[size] = value;
    size++;
}

int main() {
    int* numbers = nullptr;
    int* codes = nullptr;
    int nSize = 0, nCap = 0;
    int cSize = 0, cCap = 0;

    for (int i = 1; i <= 20; i++) {
        pushBack(numbers, nSize, nCap, i);
        if (i % 15 == 0)      pushBack(codes, cSize, cCap, 3);
        else if (i % 3 == 0)  pushBack(codes, cSize, cCap, 1);
        else if (i % 5 == 0)  pushBack(codes, cSize, cCap, 2);
        else                   pushBack(codes, cSize, cCap, 0);
    }

    for (int i = 0; i < nSize; i++) {
        int code = codes[i];
        if (code == 3)      std::cout << "FizzBuzz" << std::endl;
        else if (code == 1) std::cout << "Fizz" << std::endl;
        else if (code == 2) std::cout << "Buzz" << std::endl;
        else                 std::cout << numbers[i] << std::endl;
    }

    delete[] numbers;
    delete[] codes;
    return 0;
}
```

Two separate dynamic arrays, growing independently, each cleaned up separately — a small, deliberate taste of why Phase 2 is about to introduce a `class` that can bundle a pointer, size, and capacity *together* as one unit, so you stop having to track three loose variables per array, doubled here to six.

</details>

---

## 3. Word Counter → numeric statistics only

Skip storing the words themselves for this checkpoint (same reasoning as FizzBuzz — your array can't hold `std::string`). Instead, use your dynamic array to store **the length of each word**, and compute statistics purely from that.

```
"the quick brown fox jumps over the lazy dog"
```

should produce an array of word lengths — `[3, 5, 5, 3, 5, 4, 3, 4, 3]` — built entirely with `pushBack`, then used to compute the total word count, average length, and longest word length.

<details>
<summary>Reference solution</summary>

```cpp
#include <iostream>
#include <sstream>
#include <string>

void pushBack(int*& data, int& size, int& capacity, int value) {
    if (size == capacity) {
        int newCapacity = (capacity == 0) ? 1 : capacity * 2;
        int* newData = new int[newCapacity];
        for (int i = 0; i < size; i++) newData[i] = data[i];
        delete[] data;
        data = newData;
        capacity = newCapacity;
    }
    data[size] = value;
    size++;
}

int main() {
    std::string text = "the quick brown fox jumps over the lazy dog";

    int* lengths = nullptr;
    int size = 0, capacity = 0;

    std::stringstream ss(text);
    std::string word;
    while (ss >> word) {
        pushBack(lengths, size, capacity, static_cast<int>(word.length()));
    }

    int total = 0;
    int longest = 0;
    for (int i = 0; i < size; i++) {
        total += lengths[i];
        if (lengths[i] > longest) longest = lengths[i];
    }

    std::cout << "Word count: " << size << std::endl;
    std::cout << "Average length: " << (double)total / size << std::endl;
    std::cout << "Longest word length: " << longest << std::endl;
    std::cout << "Final array capacity: " << capacity << " (for " << size << " elements)" << std::endl;

    delete[] lengths;
    return 0;
}
```

That last printed line is worth actually looking at: `capacity` will very likely be larger than `size` (probably the next power of 2 up from your word count) — direct, visible proof of the doubling strategy from Lesson 1.6 still in effect, and a first real look at the space/time tradeoff Lesson 3.1 is about to make precise: you're deliberately holding a little more memory than you strictly need, in exchange for `pushBack` staying fast.

</details>

---

## Confidence check

Answer these before moving into Phase 2:

1. In every `pushBack` call above, the first parameter type is `int*&`, not `int*`. Using one of the three tasks above as a concrete example, explain exactly what would go wrong if it were declared as plain `int*` instead — trace it back to Lesson 0.4's pass-by-value rule.
2. Between the manual-`delete[]` and `unique_ptr` versions of the temperature converter, which would you actually reach for in real code, and why? Is there a situation where you'd still prefer the manual version despite `unique_ptr` existing?
3. The FizzBuzz task needed *two* separate dynamic arrays (`numbers` and `codes`) tracked with six loose variables total. Without looking ahead, sketch — in words, not code — what a `class` bundling `data`, `size`, and `capacity` together might look like, and why having *one* of those per array, instead of three loose variables, would make a function like `pushBack` simpler to call.

That third question is not a throwaway — it's the exact motivating question Phase 2 opens with.

---

**Phase 1 is complete.** You've built real, working memory management by hand: manual allocation, a resizable array, and the smart pointers that start automating it away.

**Next up: Phase 2 — What an "Object" Actually Is**, starting with Lesson 2.1 (`struct`). This is where OOP begins — not as an abstract new topic bolted on, but as the direct answer to the exact problem you just hand-wrote your way through three times in a row.
