---
title: A15 — One interface, separate source files
track: C++ Games — Objects and Files
trackOrder: 4.2
runtime: cpp
console: true
---

**Outcome:** Compile separate callers against one class interface and implementation.

**Recall before looking at code:** Which parts of Score must a caller know, and which parts should remain private?

Your first class is understandable in one file, but a game and its tests must share the same implementation. Now split a small Score into a header, a source file and a caller. This is the beginning of the real project layout. All files are learner-typed; no game implementation is supplied.

## Write the interface first

Create include/dice/Score.hpp. A **header** is a file meant to be included by source files. A **declaration** introduces a name and its type; a **definition** supplies its implementation or storage. Keep the already-familiar class layout and private data, but replace the method bodies with declarations ending in semicolons. We have not yet supplied their implementations.

**Edit `include/dice/Score.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/dice/Score.hpp
class Score {
private:
    int points_ = 0;
public:
    int points() const;
    bool bank(int amount);
};
```

This header has no main and cannot run alone. The file check records its presence, not behavior. The later source and caller steps will compile and execute these declarations. Explain which information a caller now knows and which method bodies are still missing.

```check
file include/dice/Score.hpp
```

## Prevent a repeated definition {#include-guard}

One source may reach the same header through two include paths. Without protection it would see the class definition twice. Add an **include guard**, processed before C++ compilation. #ifndef asks whether the marker is not defined; #define sets the marker; #endif ends the conditional block. On a later inclusion the marker already exists, so this block is skipped. The uppercase marker is a convention, not a C++ variable.

**Edit `include/dice/Score.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/dice/Score.hpp
#ifndef DICE_SCORE_HPP
#define DICE_SCORE_HPP
class Score {
private:
    int points_ = 0;
public:
    int points() const;
    bool bank(int amount);
};
#endif
```

Trace a first and second inclusion by hand. The first includes the class definition; the second skips it. A **translation unit** is a source file after preprocessing, including the header text brought in by #include. Each source is processed independently, so the guard does not prevent different callers from seeing the same declarations.

```check
file include/dice/Score.hpp
```

## Give the class a qualified name {#namespace}

Wrap the class in namespace dice. A **namespace** groups names to keep this Score distinct from a Score in another library. Its qualified name is dice::Score, using the same :: scope notation you met in Action::Bank. The namespace changes how callers name the type; it does not create another object or change the stored points.

**Edit `include/dice/Score.hpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=include/dice/Score.hpp
#ifndef DICE_SCORE_HPP
#define DICE_SCORE_HPP
namespace dice {
class Score {
private:
    int points_ = 0;
public:
    int points() const;
    bool bank(int amount);
};
}
#endif
```

Keep the include guard outside the namespace. The source definitions and caller will use dice::Score. The header is now ready to share; the following step supplies the missing method definitions.

```check
file include/dice/Score.hpp
```

## Define the methods in a source file

Create src/dice/Score.cpp. Quoted includes search for project headers. -Iinclude on our compiler command adds the include folder as a search location, so dice/Score.hpp resolves inside it. The qualified name dice::Score::points means “the points method of Score in dice.” Its const must agree with the declaration. The bodies preserve the A10 contract.

**Edit `src/dice/Score.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=src/dice/Score.cpp
#include "dice/Score.hpp"
int dice::Score::points() const {
    return points_;
}
bool dice::Score::bank(int amount) {
    if (amount < 1 || amount > 12 || points_ >= 12) return false;
    points_ += amount;
    return true;
}
```

Compile just this source with g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/dice/Score.cpp -o score.o. **-c** asks for an object file without linking an executable, so no main is needed yet. An **object file** contains compiled code awaiting combination with other code. This check verifies compilation, not the banking behavior.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude -c src/dice/Score.cpp -o score.o"
```

## Link a caller to the implementation

Create apps/score_demo.cpp. apps holds entry points; include holds public declarations; src holds implementations. Those folder names are conventions with responsibilities, not special C++ syntax. This caller includes the header, creates dice::Score and invokes its methods.

The **linker** connects calls to compiled definitions. In this command g++ compiles both .cpp files and invokes the linker to produce one executable. #include makes declarations available; it does not perform Python-style module execution.

**Edit `apps/score_demo.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/score_demo.cpp
#include <iostream>
#include "dice/Score.hpp"
int main() {
    dice::Score score;
    score.bank(5);
    std::cout << "points=" << score.points() << '\n';
    return 0;
}
```

Run g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/score_demo.cpp src/dice/Score.cpp -o lesson, then ./lesson. Expect points=5.

```predict
question: If the command omits Score.cpp, are method declarations enough to link?
choice: No
choice: Yes
answer: No
explain: The caller knows the signatures, but the linker still needs the method definitions.
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/score_demo.cpp src/dice/Score.cpp -o lesson"
run "./lesson" stdout="points=5"
```

## Try it — Distinguish compiler and linker failures

Compile the demo without src/dice/Score.cpp. Expect unresolved/undefined method references at link time. Add the source back. Then temporarily change points() const to points() only in the source definition: expect a declaration mismatch at compile time. Restore const. Do not fix a missing source by including a .cpp file; keep implementation sources explicit in the command. A16 adds a second executable, and A17 makes the build relationships explicit with CMake.



## Your turn — Test the shared implementation

No solution is shown. Create tests/shared_score.cpp, include the same header, and write explicit comparisons with nonzero exit statuses on failure. Verify two independent scores begin at zero, consecutive banks 4 and 5 yield 9, a negative request preserves 9, banking 3 reaches 12, and a later request is rejected without mutation. Use your own failure messages if useful.

Build with g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/shared_score.cpp src/dice/Score.cpp -o score_tests and run ./score_tests. Expect success with no required printed text. Then build and run the original demo again; each executable has its own main but shares Score.cpp.

```hints
nudge: Construct independent objects and check before and after each operation.
concept: An accepted flag and a correct final value are separate claims.
shape: Use early nonzero returns for failed comparisons, then return zero at the end.
```

**Section gate:** draw which source files belong to each executable. Name the declaration, definition, namespace and owner. Explain why a failed bank must leave state unchanged. Manually put the replacement bug (= instead of +=) in Score.cpp and confirm your test fails while the simple zero-start demo may still look right. Restore it and rebuild both. The author checks also verify your test actually references the shared API; a file returning zero without any calls must fail the link-dependency experiment.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/shared_score.cpp src/dice/Score.cpp -o score_tests"
run "./score_tests"
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/shared_score.cpp -o missing_score" exit=1
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/score_demo.cpp src/dice/Score.cpp -o lesson"
run "./lesson" stdout="points=5"
```

