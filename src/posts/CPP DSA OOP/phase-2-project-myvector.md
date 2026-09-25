# Phase 2 Project: `MyVector` — and Your First Contact with `<fstream>`

*Turn your `IntArray` into a real class with constructor/destructor/copy — this is literally step one of implementing `std::vector` yourself.*
*File-I/O checkpoint: read a CSV of numbers, load it into your `MyVector`, print stats.*

---

## What you're assembling

Nothing in this project is new. Every piece has already been built, separately, across Lessons 2.1 through 2.7. This project's only job is to put them all in one class, under a name that admits what it really is: `MyVector`.

```cpp
#include <iostream>

class MyVector {
private:
    int* data;
    int size;
    int capacity;

public:
    // Default constructor — Lesson 2.3
    MyVector() : data(nullptr), size(0), capacity(0) {}

    // Constructor with initial capacity — Lesson 2.3's overloading
    explicit MyVector(int initialCapacity)
        : data(new int[initialCapacity]), size(0), capacity(initialCapacity) {}

    // Copy constructor — Lesson 2.7, fixes the shallow-copy double-free
    MyVector(const MyVector& other) {
        size = other.size;
        capacity = other.capacity;
        data = new int[capacity];
        for (int i = 0; i < size; i++) {
            data[i] = other.data[i];
        }
    }

    // Copy assignment operator — Lesson 2.7
    MyVector& operator=(const MyVector& other) {
        if (this == &other) return *this;

        delete[] data;

        size = other.size;
        capacity = other.capacity;
        data = new int[capacity];
        for (int i = 0; i < size; i++) {
            data[i] = other.data[i];
        }

        return *this;
    }

    // Move constructor — Lesson 2.7
    MyVector(MyVector&& other) noexcept
        : data(other.data), size(other.size), capacity(other.capacity) {
        other.data = nullptr;
        other.size = 0;
        other.capacity = 0;
    }

    // Move assignment operator — the move counterpart to copy assignment
    MyVector& operator=(MyVector&& other) noexcept {
        if (this == &other) return *this;

        delete[] data;

        data = other.data;
        size = other.size;
        capacity = other.capacity;

        other.data = nullptr;
        other.size = 0;
        other.capacity = 0;

        return *this;
    }

    // Destructor — Lessons 2.3 and 2.5's RAII
    ~MyVector() {
        delete[] data;
    }

    // Core operations — Lesson 1.6, now member functions (Lesson 2.2)
    void pushBack(int value) {
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

    int get(int index) const {
        if (index < 0 || index >= size) {
            std::cerr << "Index out of bounds!" << std::endl;
            return -1;
        }
        return data[index];
    }

    // Operator overloading — a genuine preview of Phase 11, included here because
    // it makes MyVector feel like a real container instead of get()-calls everywhere
    int& operator[](int index) {
        return data[index];   // no bounds check — matches std::vector's own operator[]
    }

    int getSize() const {
        return size;
    }

    int getCapacity() const {
        return capacity;
    }

    bool isEmpty() const {
        return size == 0;
    }
};
```

A few details worth calling out explicitly, since they're new even though the ideas behind them aren't:

- **`explicit` on the single-`int` constructor** prevents C++ from silently treating a plain `int` as a `MyVector` in places you didn't intend (e.g. accidentally passing `5` where a `MyVector` was expected and having it quietly construct a 5-capacity vector instead of raising a type error). This is a small, real safety habit worth adopting now.
- **`const` on `get()`, `getSize()`, `getCapacity()`, and `isEmpty()`** — a member function marked `const` promises the compiler (and, importantly, *other programmers reading your code*) that calling it will never modify the object. This connects Lesson 0.6's `const` directly to member functions for the first time; you'll want this on every "read-only" member function you ever write, because it lets `const MyVector&` parameters elsewhere in your code actually call these functions at all.
- **`operator[]`** overloads the `[]` symbol itself, so `myVec[2]` works exactly like `arr[2]` did for a raw array back in Lesson 1.5 — syntax sugar over `get()`, minus the bounds check, matching how `std::vector::operator[]` genuinely behaves (fast, unchecked) versus `std::vector::at()` (slower, checked — your `get()` plays that role here).

## Try it yourself: exercise the whole class

```cpp
#include <iostream>

int main() {
    MyVector a;
    a.pushBack(1);
    a.pushBack(2);
    a.pushBack(3);

    std::cout << "a: ";
    for (int i = 0; i < a.getSize(); i++) {
        std::cout << a[i] << " ";
    }
    std::cout << std::endl;

    MyVector b = a;             // copy constructor
    b.pushBack(4);
    std::cout << "a.size = " << a.getSize() << ", b.size = " << b.getSize() << std::endl;

    MyVector c;
    c = a;                       // copy assignment
    c[0] = 999;
    std::cout << "a[0] = " << a[0] << ", c[0] = " << c[0] << std::endl;

    MyVector d = std::move(a);   // move constructor
    std::cout << "d.size = " << d.getSize() << ", a.size (after move) = " << a.getSize() << std::endl;

    return 0;
}
```

Predict every printed line before running this — specifically, confirm `a` and `b` stay independent after the copy, that `c[0] = 999` never touches `a[0]`, and that `a` is empty (size `0`) after being moved from. If all of that holds, `MyVector` is genuinely correct — not just "seems to work," but structurally guaranteed correct, the way Lessons 2.3 through 2.7 built it to be.

---

## File-I/O checkpoint: `<fstream>`, first contact

Every lesson so far hardcoded its data. Real programs read from somewhere. This checkpoint has you generate a small data file with a quick Python script (per the curriculum's recurring project thread — Python stays in the loop purely as a data-prep tool from here forward, never as the language being taught), then load that file into your own `MyVector` from C++.

### Step 1: generate test data with Python

```python
# generate_data.py
import random

with open("numbers.csv", "w") as f:
    for _ in range(20):
        f.write(str(random.randint(1, 100)) + "\n")

print("Wrote numbers.csv")
```

Run this once: `python generate_data.py`. You now have a `numbers.csv` with 20 random integers, one per line — real, external, not-hardcoded data for your C++ program to consume.

### Step 2: read it into `MyVector` with `<fstream>`

```cpp
#include <iostream>
#include <fstream>
#include <string>

int main() {
    std::ifstream file("numbers.csv");   // ifstream = "input file stream"

    if (!file.is_open()) {
        std::cerr << "Could not open numbers.csv" << std::endl;
        return 1;
    }

    MyVector numbers;
    std::string line;

    while (std::getline(file, line)) {
        int value = std::stoi(line);   // string-to-int, like Python's int(line)
        numbers.pushBack(value);
    }

    file.close();

    std::cout << "Loaded " << numbers.getSize() << " numbers." << std::endl;

    return 0;
}
```

Read this against what you already know: `std::ifstream` is, structurally, exactly the RAII pattern from Lesson 2.5 — it "acquires" the open file in its constructor and, if you forget the explicit `file.close();` above, releases it automatically in its destructor when `file` goes out of scope anyway. (The explicit `close()` here is included for clarity, not because it's strictly required — try removing it and confirming the program still behaves correctly, purely from the destructor running at the end of `main()`.) `std::getline(file, line)` reads one line at a time — conceptually identical to Python's `for line in f:` — and `std::stoi` ("string to int") is C++'s answer to Python's `int(some_string)`.

### Step 3: compute and print real statistics

```cpp
int main() {
    std::ifstream file("numbers.csv");
    if (!file.is_open()) {
        std::cerr << "Could not open numbers.csv" << std::endl;
        return 1;
    }

    MyVector numbers;
    std::string line;
    while (std::getline(file, line)) {
        numbers.pushBack(std::stoi(line));
    }
    file.close();

    if (numbers.isEmpty()) {
        std::cout << "No data." << std::endl;
        return 0;
    }

    int total = 0;
    int minVal = numbers[0];
    int maxVal = numbers[0];

    for (int i = 0; i < numbers.getSize(); i++) {
        int v = numbers[i];
        total += v;
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
    }

    std::cout << "Count: "   << numbers.getSize() << std::endl;
    std::cout << "Sum: "     << total << std::endl;
    std::cout << "Average: " << (double)total / numbers.getSize() << std::endl;
    std::cout << "Min: "     << minVal << std::endl;
    std::cout << "Max: "     << maxVal << std::endl;

    return 0;
}
```

Compile and run this against your generated `numbers.csv`. Then re-run `python generate_data.py` to get a fresh random file, and re-run your C++ program without recompiling — confirm it picks up the new numbers correctly. This is a small but real taste of the recurring project thread the whole curriculum is built around: Python generates realistic external data, C++ does the actual work.

## Confidence check

1. In the file-reading loop, `numbers` grows via `pushBack` without knowing the file's length ahead of time. Trace, specifically, how many times `pushBack` triggers a reallocation for a 20-line file (hint: this is exactly Lesson 1.6's doubling sequence — `0 → 1 → 2 → 4 → 8 → 16 → 32`). At what count does the final reallocation happen, and how much *unused* capacity does `numbers` end up holding for a 20-element file?
2. `operator[]` has no bounds check, but `get()` does. Deliberately trigger `numbers[100]` on your 20-element vector and observe what happens (undefined behavior, no message) versus calling `numbers.get(100)` (a clean, printed error). Why does `std::vector` — and now your `MyVector` — ship *both* behaviors instead of just the safe one?
3. Why does `std::ifstream` count as an RAII class by this phase's definition, even though it's managing a file handle instead of heap memory? Name the resource being acquired and released, and identify which member functions (that you didn't write, but that exist) are doing the acquiring and releasing.

---

**Phase 2 is complete.** You've built a real, correct, RAII-compliant container from scratch — the actual first step of implementing `std::vector` — and used it to process real external data for the first time.

**Next up: Phase 3 — Complexity, and Your First Real Comparison.** You're about to benchmark `MyVector` against `std::vector` and a Python `list`, doing the same task, and see with real numbers exactly what the standard library bought you over what you just built by hand.
