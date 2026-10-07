---
title: A16 — One rule, two programs
track: C++ Games — Build the Project
trackOrder: 4.3
runtime: cpp
console: true
---

**Outcome:** Build two executables that share one implementation and diagnose a missing definition.

**Recall before looking at code:** What did the header declare, and which source file supplied the method bodies?

The demo can print points=5; the tests can catch a broken bank. In this section both become named build targets, so changing the rule updates every caller. This is the project foundation for the terminal game, trainer and later graphics backends. Select the same dice-lab folder used in A15. Do not start a new folder or retype completed files.

## Resume the working project

Check that include/dice/Score.hpp, src/dice/Score.cpp, apps/score_demo.cpp and tests/shared_score.cpp are your own files from A15. Build the demo and tests separately using the commands below. The demo prints points=5; the tests finish with exit 0. If either fails, recover with A15 before adding more files.

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/score_demo.cpp src/dice/Score.cpp -o score_demo
./score_demo
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/shared_score.cpp src/dice/Score.cpp -o score_tests
./score_tests
```

A **shared implementation** means both programs compile the same source file, not that you copied its text into both entry points. Each executable has exactly one main. Author walkthroughs reconstruct your already-taught A15 files to test this section independently; the app supplies none of them.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/score_demo.cpp src/dice/Score.cpp -o score_demo"
run "./score_demo" stdout="points=5"
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/shared_score.cpp src/dice/Score.cpp -o score_tests"
run "./score_tests"
```

## A caller chooses inputs, not the banking formula

Create apps/score_report.cpp. It requests two banks, then queries the result. Keep the formula in Score.cpp. This caller does not need access to points_.

```predict
question: If Score.cpp changes from addition to replacement, which callers are affected after rebuilding?
choice: Both demo and report
choice: Only the report
answer: Both demo and report
explain: Both link definitions from the same source file.
```


**Edit `apps/score_report.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=apps/score_report.cpp
#include <iostream>
#include "dice/Score.hpp"
int main() {
    dice::Score score;
    score.bank(4);
    score.bank(5);
    std::cout << "points=" << score.points() << '\n';
    return 0;
}
```

Build with g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/score_report.cpp src/dice/Score.cpp -o score_report, then run ./score_report. Expect points=9. The original demo still starts a separate score at zero. Programs do not share live objects merely because they share source.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/score_report.cpp src/dice/Score.cpp -o score_report"
run "./score_report" stdout="points=9"
```

## Try it — Diagnose the phase that failed

First compile the report without Score.cpp: the declarations compile, but linking fails because definitions are missing. Restore the source in the command. Then try compiling both apps/score_demo.cpp and apps/score_report.cpp into one executable: linking reports multiple main definitions. Repair the file list, not the classes. Distinguish an unavailable header, an undefined method and a duplicate entry point in your notes.



## Your turn — Test overshoot and preservation

Create tests/score_boundaries.cpp without viewing an implementation. Verify that amounts 0 and 13 are rejected without changing an initial zero score; banking 11 then 12 is accepted and yields 23; any later request is rejected without changing 23. Use explicit comparisons and nonzero failure statuses. Include the header and compile the shared source rather than defining another Score.

```text
g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/score_boundaries.cpp src/dice/Score.cpp -o score_boundaries
./score_boundaries
```

```hints
nudge: Separate each acceptance claim from its resulting-state claim.
concept: The limit is on a request and the score before that request, not on the resulting sum.
shape: Test rejection, then two accepted requests, then post-limit rejection; return zero only after every claim holds.
```

To test the test, temporarily change the production check points_ >= 12 to points_ > 23 and rerun a freshly compiled test: it must reject the defective implementation. Restore the rule and rebuild. A passing exit alone cannot prove your assertions cover the contract; this deliberate fault is part of the task.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude tests/score_boundaries.cpp src/dice/Score.cpp -o score_boundaries"
run "./score_boundaries"
run "g++ -std=c++20 -Iinclude tests/score_boundaries.cpp -o missing_rules" exit=1
run "g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude apps/score_report.cpp src/dice/Score.cpp -o score_report"
run "./score_report" stdout="points=9"
```

## Record a local milestone after reviewing it

A **working tree** is the files you are editing. Git can record named snapshots called **commits** so you can compare changes and recover earlier work. This is an optional local record in your own dice-lab folder; no hosting account or push is needed. Run git --version first.

If your project is not already a Git repository, run git init from its root. Use git status to inspect changes, and git diff to inspect modifications to tracked files. Untracked files do not appear in ordinary git diff. **Staging** selects what the next commit records: use git add include/dice/Score.hpp src/dice/Score.cpp apps/score_demo.cpp apps/score_report.cpp tests/shared_score.cpp tests/score_boundaries.cpp, then git diff --cached to inspect exactly that selection. Keep generated executables out of it.

Only after reviewing the staged files, optionally run git commit -m "Share tested score rules". Git may request your author name and email; configure those for this project using your chosen identity. The author walkthrough does not commit your repository.

**Ready to move on:** explain why a new executable needs its own main but does not need another banking formula. Build the demo and both tests from source.



