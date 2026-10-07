---
title: A20 — Count the futures before learning from them
track: C++ Games — Learn from Decisions
trackOrder: 4.4
runtime: cpp
console: true
---

**Outcome:** Enumerate fair-die outcomes and distinguish an expected immediate quantity from the chance of winning a match.

**Recall before looking at code:** Does a fair die have to show every face in six rolls? What does rolling one preserve and discard?

You can now play against a fixed policy. Before teaching an opponent from experience, ask what one decision can lead to. This chapter will build toward action values and Q-learning; its first lesson enumerates six outcomes exactly, without simulation or training. We will distinguish gaining points on the next roll from winning the whole match. Keep the same project folder; these small experiments belong in explore and practice.

## Explore six alternatives, not six consecutive rolls

Start at score zero and pot five. If the next face is one, the pot becomes zero; if it is two, the pot becomes seven. Complete the other four possibilities on paper, then use the explorer. Each row starts from the same position. We do not roll each row in succession.

```figure
name: dice/SixFutures
caption: Exact alternatives for one roll of an assumed fair die. This is enumeration, not a random sample or a trained model.
```

A **probability** describes how likely an outcome is under a model. For an assumed fair die each face has probability 1/6. Six probabilities of 1/6 add to one. This assumption lets us weight all six alternatives equally; no short observed sample can establish it by itself.

## Type an exact outcome table

Create explore/six_futures.cpp. The for loop visits the six possible inputs. after is a new local value each iteration, so a bust in one alternative does not affect the next alternative. We keep pot constant because each row asks the same starting question.

**Edit `explore/six_futures.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/six_futures.cpp
#include <iostream>
int main() {
    int pot = 5;
    for (int face = 1; face <= 6; ++face) {
        int after = pot + face;
        if (face == 1) after = 0;
        std::cout << "face=" << face << " pot=" << after << '\n';
    }
    return 0;
}
```

| Face | Starting pot | Resulting pot | Change |
|---|---|---|---|
| 1 | 5 | 0 | -5 |
| 2 | 5 | 7 | +2 |
| 3 | 5 | 8 | +3 |
| 4 | 5 | 9 | +4 |
| 5 | 5 | 10 | +5 |
| 6 | 5 | 11 | +6 |

This isolated arithmetic restates one rule for analysis; it does not replace Game.cpp in the application. No random engine is needed when all possible inputs fit in a short loop.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/six_futures.cpp -o lesson
./lesson
```

Expected output:

```text
face=1 pot=0
face=2 pot=7
face=3 pot=8
face=4 pot=9
face=5 pot=10
face=6 pot=11
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/six_futures.cpp -o lesson"
run "./lesson" stdout="face=1 pot=0\nface=2 pot=7\nface=3 pot=8\nface=4 pot=9\nface=5 pot=10\nface=6 pot=11"
```

## Average the alternatives with equal weights

Add a total outside the loop, add each resulting pot, then divide after the loop. The six results sum to 45; 45 / 6.0 is 7.5. The decimal denominator selects floating-point division, revisiting A02.

```predict
question: Can the next roll actually leave a pot of 7.5?
choice: No
choice: Yes
answer: No
explain: Each outcome is an integer; an average of alternatives need not itself be a possible outcome.
```


**Edit `explore/six_futures.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/six_futures.cpp
#include <iostream>
int main() {
    int pot = 5;
    int total = 0;
    for (int face = 1; face <= 6; ++face) {
        int after = pot + face;
        if (face == 1) after = 0;
        total += after;
        std::cout << "face=" << face << " pot=" << after << '\n';
    }
    double average = total / 6.0;
    std::cout << "expected pot=" << average << '\n';
    return 0;
}
```

This weighted average is an **expected value**, also called an expectation. With equal probabilities, summing the six outcomes then dividing by six gives the same result as multiplying each by 1/6 and adding. Here the expected pot is 7.5 and the expected immediate change is 7.5 minus 5, or 2.5. Expectation is neither a guaranteed next value nor a promise about one short match.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/six_futures.cpp -o lesson
./lesson
```

Expected output:

```text
expected pot=7.5
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/six_futures.cpp -o lesson"
run "./lesson" stdout="expected pot=7.5"
```

## Try it — Change the quantity you are measuring

Change pot from five to two. Predict every row, their total and the expected pot before running; then restore five. Next calculate change=after-pot inside the loop and total those changes instead. You should obtain an expected change of 2.5 for pot five. A quantity has meaning only with its definition: resulting pot, point change and chance of ultimately winning are different quantities. Positive expected immediate change alone does not establish the best match strategy.



## Your turn — Count immediate winning faces

**No solution is shown.** Create `practice/winning_faces.cpp` yourself. Write winningFaces(int score, int pot), returning how many faces win immediately from an unfinished position. Face one always busts; faces two through six win if score+pot+face reaches twelve. In main, read two integers; reject failed reads, negative values, either value at least twelve or score+pot already at least twelve with exit 1. Only then call your function. Print winning=N and chance=N/6.0 on separate lines. This is the probability of winning on the next Roll, not the entire match. At score four, pot five, the winning faces are 3, 4, 5 and 6.

| Input | Required output | Exit status |
|---|---|---|
| 4 5 | winning=4 / chance=0.666667 | 0 |
| 0 0 | winning=0 / chance=0 | 0 |
| 0 11 | winning=5 / chance=0.833333 | 0 |
| 5 5 | winning=5 / chance=0.833333 | 0 |
| 4 8 | (no required output) | 1 |
| -1 5 | (no required output) | 1 |
| word | (no required output) | 1 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/winning_faces.cpp -o lesson
./lesson
```

```hints
nudge: Count alternatives, not points earned.
concept: The bust face must be excluded even if adding its numeric value would reach the target.
shape: Use a local integer counter, loop from two through six, and compare each resulting total with the target.
```


**Ready to move on:** explain why four winning faces means probability 4/6 only under the fair-die model, why that does not guarantee four wins in six trials, and why we have not yet computed a long-term action value. Change to another unfinished score/pot and check your answer by listing faces before running.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/winning_faces.cpp -o lesson"
run "./lesson" stdin="4 5\n" stdout="winning=4\nchance=0.666667"  without="winning=0\nchance=0"
run "./lesson" stdin="0 0\n" stdout="winning=0\nchance=0"  without="winning=4\nchance=0.666667"
run "./lesson" stdin="0 11\n" stdout="winning=5\nchance=0.833333"  without="winning=4\nchance=0.666667"
run "./lesson" stdin="5 5\n" stdout="winning=5\nchance=0.833333"  without="winning=4\nchance=0.666667"
run "./lesson" stdin="4 8\n" exit=1 without="winning=4\nchance=0.666667"
run "./lesson" stdin="-1 5\n" exit=1 without="winning=4\nchance=0.666667"
run "./lesson" stdin="word\n" exit=1 without="winning=4\nchance=0.666667"
```

