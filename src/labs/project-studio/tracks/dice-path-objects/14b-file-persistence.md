---
title: A14b — Save now, read in a later run
track: C++ Games — Objects and Files
trackOrder: 4.2
runtime: cpp
console: true
---

**Outcome:** save an integer to a file, report write failures, and recover the saved value in a separate process. Recall A03: what must you check before using a value extracted from a stream? Recall A14: what happens to local objects when a function returns early?

A future trained opponent needs its learned values to survive program exit. Start with one integer. This lesson changes persistence, not pointer or class-copy rules.

## Open, write, close and check

Create explore/write_rounds.cpp. Include `<fstream>` for file stream types. std::ofstream opens an output file when constructed; this mode **replaces** rounds.txt in your project folder. Use this practice filename, not an existing document. !output checks failure, as !std::cin did for input. << writes data. close finishes and closes the file; checking afterwards can detect write or close failure.

**Edit `explore/write_rounds.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/write_rounds.cpp
#include <iostream>
#include <fstream>

int main() {
    std::ofstream output{"rounds.txt"};
    if (!output) return 1;
    output << 3 << '\n';
    output.close();
    if (!output) return 2;
    std::cout << "saved\n";
    return 0;
}
```

A **resource** needs eventual release: here the open file. The stream is its **owner**, responsible for closing it. Its destructor also closes on scope exit, including early return. **RAII**, Resource Acquisition Is Initialization, is the name for tying ownership to object lifetime. We explicitly close here to inspect failure before claiming success; automatic cleanup alone is not an error report.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/write_rounds.cpp -o lesson
./lesson
```

Expected output:

```text
saved
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/write_rounds.cpp -o lesson"
run "./lesson" stdout="saved\n"
```

## A different executable reads the file

Create explore/read_rounds.cpp. std::ifstream opens an input file. Its extraction operation has the same failure rule you already used with std::cin. This program never sees the writer’s local variables: that earlier process has ended.

```predict
question: Where does this run obtain the saved 3?
choice: From rounds.txt
choice: From the old output variable
answer: From rounds.txt
explain: Process-local objects are gone; the file persists and is opened again.
```


**Edit `explore/read_rounds.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/read_rounds.cpp
#include <iostream>
#include <fstream>

int main() {
    std::ifstream input{"rounds.txt"};
    int rounds = 0;
    if (!(input >> rounds)) return 1;
    std::cout << "loaded=" << rounds << '\n';
    return 0;
}
```

The two commands can run at different times. The filesystem connects them, not shared C++ variables. Do not print rounds unless extraction succeeded.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/read_rounds.cpp -o lesson
./lesson
```

Expected output:

```text
loaded=3
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/read_rounds.cpp -o lesson"
run "./lesson" stdout="loaded=3\n"
```

## Try it — Change the data, keep the program

Open rounds.txt in the editor and change 3 to 9. Run the already compiled reader: it should print loaded=9 without recompiling. Replace the file text with a word and run again: extraction must fail with nonzero exit status. Restore 3. Explain why editing data differs from editing C++ source.



## Your turn — Separate saving from loading

**No solution is shown.** Create `practice/save_rounds.cpp` yourself. Create a program with two modes. Input 1 N saves N, from 0 through 10, into practice_rounds.txt and prints saved. Input 2 loads from that file and prints loaded=N; it receives no N on standard input. Reject invalid commands/values with exit 1 before opening the output file. Return 2 for file failures or invalid stored data. A failed request must preserve an earlier valid save. Run the examples below in order: each row starts a new process. File replacement is intended only for this practice file.

| Input | Required output | Exit status |
|---|---|---|
| 1 3 | saved | 0 |
| 2 | loaded=3 | 0 |
| 1 8 | saved | 0 |
| 2 | loaded=8 | 0 |
| 1 11 | (no required output) | 1 |
| 2 | loaded=8 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/save_rounds.cpp -o lesson
./lesson
```

```hints
nudge: A load run receives only its mode; obtain the count from the file.
concept: Validate a new count before opening the writer, because opening replaces old data.
shape: Give each branch its own stream and failure checks. Do not construct an output stream in the load branch.
```


**Ready to move on:** close and rerun the program in load mode, then edit the saved integer and load again. Explain the owner’s lifetime and the point at which success is reported. This is plain text persistence, not an atomic save or a complete model format. We will teach those extra requirements when the Q table needs them.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/save_rounds.cpp -o lesson"
run "./lesson" stdin="1 3\n" stdout="saved\n"  without="loaded=3\n"
run "./lesson" stdin="2\n" stdout="loaded=3\n"  without="saved\n"
run "./lesson" stdin="1 8\n" stdout="saved\n"  without="loaded=3\n"
run "./lesson" stdin="2\n" stdout="loaded=8\n"  without="saved\n"
run "./lesson" stdin="1 11\n" exit=1 without="saved"
run "./lesson" stdin="2\n" stdout="loaded=8\n"  without="saved\n"
contains practice_rounds.txt "8"
```

