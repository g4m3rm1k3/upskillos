---
title: A22c — Take a small request through design, tests and feedback
track: C++ Games — Learn from Decisions
trackOrder: 4.4
runtime: cpp
console: true
---

**Outcome:** Turn a small request into an independently designed, tested change, then review feedback and recover an unstaged Git edit.

**Recall before looking at code:** What can a passing example fail to tell you? Why might direct addressing be wasteful?

A colleague asks for a locker suggestion tool. This is a different problem from Dice Duel: no game classes or finished solution are supplied. Use what you learned about loops, containers, validation and tests to decide how to build it. Keep the game working. This consolidation lesson practices a small development cycle before adding another learning algorithm.

## Turn a request into observable acceptance criteria

Request: “Suggest the lowest-numbered free locker.” Ask what free means, how lockers are numbered and what happens when none are free. For this exercise the agreed answers are: IDs start at zero; zero means free, one means occupied; return -1 if all are occupied. There are one through twenty lockers. Bad or incomplete input must fail before printing a suggestion.

An **acceptance criterion** is an observable condition a completed change must satisfy. “The code is good” is too vague. “With occupancies 1,0,1,0 the result is locker 1” can be checked.

```predict
question: May the program return the first free locker before validating later input?
choice: No
choice: Yes
answer: No
explain: A later invalid or missing occupancy must reject the entire request.
```


Write your own examples before coding: an ordinary choice, the first and last positions, a full set and invalid input after an earlier free slot. Name the mistake each example detects. This is test design: choosing evidence from requirements, rather than copying a supplied test body.

## Plan one small delivery and choose a design

A **backlog** is an ordered list of possible work. Write three items: validate the request, select a free locker, improve the display. Deliver the first two together because an unchecked suggestion is incomplete; defer display work. **Work in progress** is work started but unfinished. Keep one small change in progress until it passes its acceptance cases.

Choose a representation: a vector of all occupancy values, or a streaming scan that remembers a candidate but waits until validation finishes. Draw the variables and write the selection procedure in plain English. Do you need a class? A function or one small program is enough unless you can name state or a rule the class should own.

Before implementation, predict worst-case work as the locker count grows. Both candidates must read every input for validation. A vector retains all values; a streaming solution can retain only a candidate and validation state. Record your choice and one reason against it. The author reference is just one choice and is not the required design.

## Your turn — Implement the agreed behavior

Create practice/locker_choice.cpp without a supplied body. Input begins with the number of lockers, then exactly that many occupancy integers. Validate the agreed bounds and values. Print locker=N on success, using the lowest free ID or -1 when full; return zero. Return 1 without a suggestion on failed extraction, invalid count or invalid occupancy. Extra tokens after the required values are outside this first interface; do not claim strict whole-line validation.

| Input | Required result |
|---|---|
| 4 1 0 1 0 | locker=1 |
| 3 0 1 1 | locker=0 |
| 2 1 1 | locker=-1 |
| 4 1 1 1 0 | locker=3 |
| 0; 21; 2 1 7; 3 0 1 (separate runs) | exit 1 |

Choose your own variables, functions and storage. Run your independently written cases as well as these examples. Use the compile command and ./locker_choice below; type one complete input per run.

```hints
nudge: Separate reading a complete valid request from reporting success.
concept: Remember the first candidate; later free lockers must not replace it.
shape: An absent candidate needs a distinct value. Do not print until all required input has been validated.
```

Explain the worst-case number of values read and stored by your implementation. A reviewer should inspect the design note and your additional cases: passing the displayed cases does not grade those. Close the examples and explain your algorithm using a different occupancy sequence.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/locker_choice.cpp -o locker_choice"
run "./locker_choice" stdin="4 1 0 1 0\n" stdout="locker=1" without="locker=0"
run "./locker_choice" stdin="3 0 1 1\n" stdout="locker=0" without="locker=1"
run "./locker_choice" stdin="2 1 1\n" stdout="locker=-1" without="locker=1"
run "./locker_choice" stdin="4 1 1 1 0\n" stdout="locker=3" without="locker=1"
run "./locker_choice" stdin="0\n" exit=1
run "./locker_choice" stdin="21\n" exit=1
run "./locker_choice" stdin="2 1 7\n" exit=1
run "./locker_choice" stdin="3 0 1\n" exit=1
```

## Try it — Respond to feedback without losing old behavior

The colleague tries the tool and says: “I sometimes want a particular locker. Prefer it if free; otherwise keep the old lowest-free rule.” This is **feedback** that changes the next small delivery. Add one preferred ID after the occupancy values. Reject a failed read or an ID outside 0..count-1. Write cases before editing: preferred free, preferred occupied with another free, all occupied and out-of-range preference.

Change your own implementation without a supplied diff. For 4 1 0 1 0 3 expect locker=3; with preference 2 expect locker=1; for 2 1 1 0 expect locker=-1. Explain whether your earlier storage choice helped or whether you need to revise it.

```hints
nudge: A preference changes priority, not whether an occupied locker is available.
concept: Preserve the original fallback until you know whether the preferred locker is free.
shape: Validate the preference before using it as an index; a valid preference may still be occupied.
```

Re-run the old cases with an appropriate preference appended. This is regression checking across a changed input interface. **Iteration** means making a small usable change, checking feedback and adjusting the next plan. That feedback loop is the agile practice here; simply dividing a fixed tutorial into steps would not establish it.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/locker_choice.cpp -o locker_choice"
run "./locker_choice" stdin="4 1 0 1 0 3\n" stdout="locker=3" without="locker=1"
run "./locker_choice" stdin="4 1 0 1 0 2\n" stdout="locker=1" without="locker=3"
run "./locker_choice" stdin="2 1 1 0\n" stdout="locker=-1"
run "./locker_choice" stdin="2 0 0 2\n" exit=1
```

## Set up a disposable Git recovery exercise

Use a new review-sandbox subfolder inside your learner project for this exercise only. If that name already contains your work, choose another empty location and adjust the commands. Create review-sandbox/checkpoint.cpp. We will practice recovering a deliberately changed demonstration file, not discard your game or locker solution. git --version must succeed; if Git is unavailable, install it through the setup guidance before claiming this exercise complete.

**Edit `review-sandbox/checkpoint.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=review-sandbox/checkpoint.cpp
#include <iostream>
int main() {
    std::cout << "reviewed checkpoint\n";
    return 0;
}
```

Compile and run, then git init review-sandbox. The nested .git belongs only to this disposable exercise. Do not stage this sandbox into a parent repository. No account, remote, commit or push is used here.

```check
run "git --version"
run "g++ -std=c++20 -Wall -Wextra -pedantic review-sandbox/checkpoint.cpp -o review_checkpoint"
run "./review_checkpoint" stdout="reviewed checkpoint"
run "git init review-sandbox"
```

## Inspect what is selected for the next snapshot

Run git -C review-sandbox status --short. -C tells Git which repository folder to use. The new file is untracked, so ordinary git diff will not show it. Run git -C review-sandbox add checkpoint.cpp to stage this file, then git -C review-sandbox diff --cached -- checkpoint.cpp. The -- ends options and introduces the path.

The **index**, or staging area, holds the content selected for a future commit. It is separate from the working file. Staging is not committing, and it does not save a durable history entry.

Expect the staged comparison to contain reviewed checkpoint. Inspect the entire small file before accepting that selection. In real work, avoid staging executables, secrets and unrelated changes.

```check
run "git -C review-sandbox add checkpoint.cpp"
run "git -C review-sandbox diff --cached -- checkpoint.cpp" stdout="reviewed checkpoint"
```

## Compare an unstaged edit with the staged checkpoint

Change only the printed message in review-sandbox/checkpoint.cpp. Predict which comparison will contain the new message: git diff or git diff --cached. Then inspect both. This is a controlled mistake with a known earlier copy in the index.

**Edit `review-sandbox/checkpoint.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=review-sandbox/checkpoint.cpp
#include <iostream>
int main() {
    std::cout << "temporary mistake\n";
    return 0;
}
```

Ordinary diff compares the working file with the index and shows the new message. The cached comparison still shows the staged checkpoint. These are two different comparisons, not contradictory reports.

```check
run "git -C review-sandbox diff -- checkpoint.cpp" stdout="temporary mistake"
run "git -C review-sandbox diff --cached -- checkpoint.cpp" stdout="reviewed checkpoint" without="temporary mistake"
```

## Recover only the deliberate unstaged mistake

After verifying this is the disposable file and that its staged contents are the version you want, run git -C review-sandbox restore --worktree -- checkpoint.cpp. This replaces that working file from the index and discards its unstaged edit. It cannot recover arbitrary untracked files or mistakes that were never saved elsewhere. Never use it on wanted changes.

Compile the recovered file and run it. Then inspect git diff again: it must be empty for that path. The staged file still exists in the index; this exercise created no commit.

Explain where Git obtained the replacement. If you say “the last commit,” revisit the index experiment: this repository has no commit. For lasting history use the reviewed commit workflow from A16 in your own project. Branching, merge conflicts and team review require the later dedicated Git workshop; this one exercise does not claim those skills.

```check
run "git -C review-sandbox restore --worktree -- checkpoint.cpp"
run "g++ -std=c++20 -Wall -Wextra -pedantic review-sandbox/checkpoint.cpp -o review_checkpoint"
run "./review_checkpoint" stdout="reviewed checkpoint" without="temporary mistake"
run "git -C review-sandbox diff --exit-code -- checkpoint.cpp"
```

## Review the delivery and choose the next improvement

Write a short review note for your locker tool: request, acceptance examples, representation choice, one bug caught by a test, feedback received and the resulting change. A **retrospective** asks what helped the work and what you would change next time. Name one improvement to your process, not just another feature. Move only the completed acceptance criteria to done; leave display polish in the backlog.

Before continuing, hide the tutorial and explain your solution to someone else. Ask them to supply a different occupancy sequence or an ambiguous requirement. Record what you had to clarify. Return after a break and add one boundary test without being told which source line to edit.

Section gate: working code, derived test examples, a defended design, a feedback revision and a demonstrated recovery are separate pieces of evidence. Compiler checks verify behavior; a reviewer evaluates your reasoning. A23 can follow this consolidation, but the wider DSA, architecture and collaborative Git strands remain tracked work.

