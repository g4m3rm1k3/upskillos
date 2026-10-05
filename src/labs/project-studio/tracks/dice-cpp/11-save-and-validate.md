---
title: 11 — A model that survives closing the terminal
track: C++ for Python Developers — Dice Duel and Q-Learning
trackOrder: 5
runtime: cpp
console: true
---

A table trained for target 12 should not silently load into a target-20 game. **Outcome:** save full-precision values and reject incompatible, truncated or malformed model files.

`table → versioned text file → validated temporary table → returned model`

## Watch a stream lose and preserve digits

A model file contains decimal text. Formatting that is pleasant for a report can throw away information needed to restore the model. Compare default formatting with full-precision output before writing a file.

```predict
question: Does changing output precision change the stored double?
choice: No
choice: Yes
answer: No
explain: The stream changes how it writes characters; the number in memory is unchanged.
```

```cpp file=explore_precision.cpp
#include <iostream>
#include <iomanip>
int main() {
    double value = 0.123456789012345;
    std::cout << value << '\n';
    std::cout << std::setprecision(17) << value << '\n';
}
```

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore_precision.cpp -o explore
./explore
```

Expected output:

```text
0.123457
0.123456789012345
```

### How it works

Default stream precision is six significant digits. The first line rounds the value to 0.123457; those characters cannot reconstruct the original double. setprecision(17) changes later formatting on that stream. Unlike fixed mode in the rate lesson, this setting counts significant digits.

You may see one additional final digit on a different standard library; the check uses the significant prefix. Save model values precisely and choose display rounding separately.

Open this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore_precision.cpp -o explore"
run "./explore" stdout="0.123457\n0.123456789012345"
```

## Test a precise round trip

Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.

The tests type deliberately bad files too. They check exact round-trip values, a wrong header, a truncated model, out-of-range values and trailing garbage.

The implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.

Put a nontrivial decimal and a negative value into row 17, save, then load and compare the entire vector.

**Edit `test_storage.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_storage.cpp
#include "storage.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table(); q[17] = {0.123456789012345, -0.7};
    save_table(q, "test-model.txt");
    assert(load_table("test-model.txt") == q);
}
```

A value such as 0.123456789012345 exposes default stream precision that simple values like 0.5 would not. The saved test model is disposable.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_storage.cpp "assert(load_table(\"test-model.txt\") == q);"
```

## Test malformed models

Loop over a wrong header, a truncated model and an impossible value. Each case writes its own bad file before loading it.

**Edit `test_storage.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_storage.cpp
#include "storage.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table(); q[17] = {0.123456789012345, -0.7};
    save_table(q, "test-model.txt");
    assert(load_table("test-model.txt") == q);
    for (const std::string text : {"wrong 12 4 1728", "DICE_Q_V1 12 4 1728\n0 0",
                                   "DICE_Q_V1 12 4 1728\n99 0"}) {
        { std::ofstream out("bad-model.txt"); out << text; }
        bool rejected = false;
        try { load_table("bad-model.txt"); }
        catch (const std::runtime_error&) { rejected = true; }
        assert(rejected);
    }
}
```

The inner braces destroy the output stream and flush the file before input opens it. A rejection flag checks that every bad file fails explicitly.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_storage.cpp "}"
```

## Test unwanted trailing data

Append garbage to the previously valid file, then require loading to fail. `std::ios::app` means append instead of replacing the old contents.

**Edit `test_storage.cpp`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.

```cpp file=test_storage.cpp
#include "storage.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table(); q[17] = {0.123456789012345, -0.7};
    save_table(q, "test-model.txt");
    assert(load_table("test-model.txt") == q);
    for (const std::string text : {"wrong 12 4 1728", "DICE_Q_V1 12 4 1728\n0 0",
                                   "DICE_Q_V1 12 4 1728\n99 0"}) {
        { std::ofstream out("bad-model.txt"); out << text; }
        bool rejected = false;
        try { load_table("bad-model.txt"); }
        catch (const std::runtime_error&) { rejected = true; }
        assert(rejected);
    }
    { std::ofstream out("test-model.txt", std::ios::app); out << "garbage"; }
    bool rejected = false;
    try { load_table("test-model.txt"); }
    catch (const std::runtime_error&) { rejected = true; }
    assert(rejected);
    std::cout << "storage ok\n";
}
```

The loader must consume exactly its format. Otherwise a stale or concatenated file could appear valid because its beginning happened to look correct.

**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.

```check
contains test_storage.cpp "std::cout << \"storage ok\\n\";"
```

## Write a model identity before its numbers

Create storage.hpp. Start with a writer that opens a file, checks that it opened, writes the version and rule settings, then closes it. It is not yet a complete saved model.

**Edit `storage.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=storage.hpp
#ifndef DICE_STORAGE_HPP
#define DICE_STORAGE_HPP
#include "agent.hpp"
#include <fstream>
#include <iomanip>
inline void save_table(const Table& q, const std::string& path) {
    std::ofstream out(path);
    if (!out) throw std::runtime_error("cannot open model for writing");
    out << "DICE_Q_V1 " << TARGET << " 4 " << STATES << '\n';
    out.close();
    if (!out) throw std::runtime_error("model write failed");
}
#endif
```

The header records DICE_Q_V1, target 12, opponent threshold 4 and the row count. A future loader can reject the wrong game before accepting any values. Check the stream after close so a failed flush is reported too. Opening with ofstream replaces an existing file, so experiments worth keeping need distinct names.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ storage.hpp"
```

## Preserve the table precision

Insert the precision setting and row loop before close. Each line records roll then bank in that order. Keep the header as the first line.

**Edit `storage.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=storage.hpp
#ifndef DICE_STORAGE_HPP
#define DICE_STORAGE_HPP
#include "agent.hpp"
#include <fstream>
#include <iomanip>
inline void save_table(const Table& q, const std::string& path) {
    std::ofstream out(path);
    if (!out) throw std::runtime_error("cannot open model for writing");
    out << "DICE_Q_V1 " << TARGET << " 4 " << STATES << '\n';
    out << std::setprecision(17);
    for (const Row& row : q) out << row[0] << ' ' << row[1] << '\n';
    out.close();
    if (!out) throw std::runtime_error("model write failed");
}
#endif
```

Default formatting keeps too few significant digits for an exact double round trip. Seventeen digits retain the stored value. `const Row&` borrows each row read-only. The newline separates rows for a human reader; the loader will accept any whitespace between numbers.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ storage.hpp"
```

## Read and reject an incompatible header

Add load_table after save_table. Read the version string and three integers. Reject extraction failures and mismatched metadata before allocating a model. This intermediate loader deliberately returns an empty table; do not use it for play yet.

**Edit `storage.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=storage.hpp
#ifndef DICE_STORAGE_HPP
#define DICE_STORAGE_HPP
#include "agent.hpp"
#include <fstream>
#include <iomanip>
inline void save_table(const Table& q, const std::string& path) {
    std::ofstream out(path);
    if (!out) throw std::runtime_error("cannot open model for writing");
    out << "DICE_Q_V1 " << TARGET << " 4 " << STATES << '\n';
    out << std::setprecision(17);
    for (const Row& row : q) out << row[0] << ' ' << row[1] << '\n';
    out.close();
    if (!out) throw std::runtime_error("model write failed");
}
inline Table load_table(const std::string& path) {
    std::ifstream in(path);
    std::string version;
    int target = 0, opponent = 0, states = 0;
    if (!(in >> version >> target >> opponent >> states) ||
        version != "DICE_Q_V1" || target != TARGET || opponent != 4 || states != STATES)
        throw std::runtime_error("incompatible model header");
    return make_table();
}
#endif
```

`in >> version >> target >> opponent >> states` extracts fields in sequence. A malformed or missing field makes the stream false. The surrounding ! catches that failure, while the remaining comparisons catch a readable but incompatible header. Zero initializers keep the local integers defined even if input stops early.

**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ storage.hpp"
```

## Validate every estimate before returning

Create `storage.hpp`. `std::ofstream` opens an output file; `std::ifstream` opens input. Their destructors close resources when scope ends: this is RAII, resource acquisition is initialization. The braces in the test close a file before reading it. We explicitly close the writer in `save_table` so a final flush failure can be reported.

`>>` extracts whitespace-separated fields; a failed extraction makes the stream test false. `std::setprecision(17)` retains enough significant decimal digits to round-trip a double. The model version names our exact rules and encoding; change it if either changes. The header also records the target, fixed training opponent and row count.

```predict
question: Can a half-written model safely become the live Q-table?
choice: No
choice: Yes
answer: No
explain: Load into a new local table, validate every value, then return it only after success.
```


**Edit `storage.hpp`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.

```cpp file=storage.hpp
#ifndef DICE_STORAGE_HPP
#define DICE_STORAGE_HPP
#include "agent.hpp"
#include <fstream>
#include <iomanip>
inline void save_table(const Table& q, const std::string& path) {
    std::ofstream out(path);
    if (!out) throw std::runtime_error("cannot open model for writing");
    out << "DICE_Q_V1 " << TARGET << " 4 " << STATES << '\n';
    out << std::setprecision(17);
    for (const Row& row : q) out << row[0] << ' ' << row[1] << '\n';
    out.close();
    if (!out) throw std::runtime_error("model write failed");
}
inline Table load_table(const std::string& path) {
    std::ifstream in(path);
    std::string version;
    int target = 0, opponent = 0, states = 0;
    if (!(in >> version >> target >> opponent >> states) ||
        version != "DICE_Q_V1" || target != TARGET || opponent != 4 || states != STATES)
        throw std::runtime_error("incompatible model header");
    Table q = make_table();
    for (Row& row : q)
        for (double& value : row)
            if (!(in >> value) || !std::isfinite(value) || value < -1.0 || value > 1.0)
                throw std::runtime_error("invalid model value");
    std::string extra;
    if (in >> extra) throw std::runtime_error("extra model data");
    return q;
}
#endif
```

Replace the empty-table return with nested row/value loops. The mutable double reference puts each extracted number into its destination. Reject failed reads, nonfinite values and estimates outside the agreed reward range. Finally reject an extra token. Only a fully validated local table reaches return.

The [-1,1] validation matches our gamma-1 win/loss rewards, zero initialization and convex updates. A different reward scale needs a different format contract. Never silently treat a failed load as a trained model. **Limit:** saving directly can truncate an existing file on a failed write; choose a new filename to preserve an experiment. Atomic replacement is a useful later extension. **Challenge:** add a training-seed field under a new format version and test rejection of the old version.

**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic test_storage.cpp -o test_storage"
run "./test_storage" stdout="storage ok"
```

## Try it

Set the second output precision to 6 in explore_precision.cpp. Both lines now lose the same digits. Restore 17, then inspect dice-q.txt: its metadata and row order are part of the model contract, not decoration.

Keep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.



## Your turn — Restore one model value

**No solution is shown.** Create `practice_11.cpp` yourself. Read a double in [-1,1]. Put it into the roll column of row 17 of a new table, save to practice-model.txt, load into another table, and print the restored value. Use the storage helpers you typed. Begin the one output line with `result=`, followed by your answer and a newline.

Build with `g++ -std=c++20 -Wall -Wextra -pedantic practice_11.cpp -o practice`, then run `./practice` and type the inputs.

| input | expected output |
|---|---|
| 0.25 | result=0.25 |
| -0.75 | result=-0.75 |

```hints
nudge: Keep row and action column separate.
concept: The output must come from the loaded table.
shape: Allocate, assign row 17 column 0, save, load, then print that loaded cell.
```

The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice_11.cpp -o practice"
run "./practice" stdin="0.25\n" stdout="result=0.25\n" without="result=-0.75\n"
run "./practice" stdin="-0.75\n" stdout="result=-0.75\n" without="result=0.25\n"
```

