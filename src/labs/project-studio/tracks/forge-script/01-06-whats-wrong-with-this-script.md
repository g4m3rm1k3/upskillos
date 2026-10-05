---
title: 1.6 — What's Wrong with This Script?
runtime: python
run: breakout.py
---

Breakout works. Every story in the backlog is done, and the game is fun to play. So is the code good?

**Working** is only the first thing code has to be. Most of what happens to code after it first works is **change**: a new feature, a fix, a different screen size, someone else reading it. Code is good or bad mostly by how easy it is to change correctly. This lesson measures that, with evidence from your own file, and turns what it finds into the to-do list for the next few chapters.

This is the most important lesson of the chapter, and it has very little code in it.

## Try a change

**Build:** nothing to keep. Make one small change, and watch what happens.

The bricks feel cramped. Spread the rows out: in the line that builds the wall, change `60 + row * 26` to `60 + row * 40`, so each row is 40 pixels below the last instead of 26. Change nothing else.

```predict
question: What will happen when you run the game?
choice: The rows are further apart, and everything else is the same
choice: The rows are further apart, but some have the wrong colours
choice: The game crashes
answer: The game crashes
explain: The colour of each brick is worked out *backwards from its y position*, with `(brick.y - 60) // 26`, which assumes the rows are 26 apart. The bottom row is now at y = 60 + 4 × 40 = 220, and (220 − 60) // 26 = 160 // 26 = 6, but `ROW_COLOURS` has only 5 colours, at indexes 0 to 4. So drawing the first frame raises `IndexError: list index out of range`. Read the traceback: the crash is in the *drawing* code, on a line you didn't touch, and the cause is the line you did.
```

Run it to see. Then put the file back the way it was, without retyping anything:

```powershell
git restore breakout.py
```

**Understand.** Two lines of the program both "know" how far apart the rows are. One builds the wall with that spacing, and the other relies on it to work out colours. Nothing in the code says the two must agree, so changing one breaks the other, far away. When a change in one place requires a matching change somewhere else that nothing points you to, the two places are **coupled**.

> **Coupling**: how much one part of a program depends on the details of another part. Tightly coupled parts can't be changed, understood or tested separately.

The fix isn't to remember. In the next chapters, things like the row will be stored *with* the brick (a brick will know its own row), so nothing has to be worked out backwards.

```check
contains breakout.py "60 + row * 26" -- Put the file back with git restore breakout.py.
git-clean
```

## Measure the script

**Build:** evidence. Run these in the terminal and note the answers.

How long is it?

```powershell
(Get-Content breakout.py).Count
```

```text
143
```

`Get-Content` reads a file as a list of lines, and `.Count` counts them.

Where is the ball's sideways velocity used or changed?

```powershell
Select-String -Path breakout.py -Pattern "ball_vx"
```

`Select-String` prints every line containing the pattern, with its line number: 6 lines, from the top of the file to the middle of the loop. Try `ball_x` (10 lines) and `lives` (6).

How many decisions does the main loop make, and how deeply nested are they?

```powershell
Select-String -Path breakout.py -Pattern "^\s+if "
```

This pattern is a **regular expression**, a small language for describing text: `^` means "the start of a line", `\s+` means "one or more spaces", and then the literal `if ` with its space. So it matches lines that start with indentation followed by `if `, which are the `if` statements, and not lines that merely contain the letters "if" somewhere.

16 lines, and 15 of them are inside the loop (the first is the argument check at the top). The deepest code is four levels in: the `while`, then three `if`s inside each other.

**Understand: what those numbers mean.**

- **143 lines in one loop, with no names for its parts.** To understand "how does the ball bounce off the paddle?" you have to find the right 5 lines among 143. A function called `bounce_off_paddle` would say where it is and what it does.
- **Every variable is global**: created at the top level, and readable and changeable from anywhere in the file. `ball_vx` is used or changed on 6 lines (assigned a new value on 5 of them). To know what it might be at any moment, you have to read all of them, and anything you add later might change it too.
- **One loop does five jobs**: handling input, moving the paddle, physics, scoring, drawing. And a sixth that isn't part of the game at all: the test-run machinery (`test_frames` appears on 6 lines, and the autopilot lives inside the paddle code).

> **Engineer:** there's a name for code in this state, that started simple and grew by adding a bit more to the same place until no part can be changed without understanding all of it: a **big ball of mud**. Almost every program becomes one if nothing stops it, and it doesn't take bad programmers, only small additions without structure. Every chapter from here on adds a piece of structure that resists it, and you'll know exactly which problem each piece solves, because you'll have listed them yourself.

## The full list

**Build:** nothing. Read the list, and check each item against your own file.

Here is what's wrong with `breakout.py`, with the evidence for each:

1. **No parts with names.** Everything is one 143-line script. The code for "the ball bounces off the paddle" can't be found by name, read on its own, reused, or run on its own.
2. **Everything is global.** Any line can change any variable (`ball_vx` is used or changed on 6 lines), so understanding one line means understanding all of them.
3. **Duplication.** The ball's starting position and velocity are written twice: before the loop, and again after a miss (lines 46 and 121 both say `ball_vx = BALL_SPEED * 0.6`). Change one, forget the other, and the ball behaves differently after the first miss.
4. **Unexplained numbers.** `6` (the ball's radius) appears in the wall code six times; `50` is half the paddle's width; `76` and `26` are brick spacings; `40` and `60` in the autopilot. Numbers written directly into code like this are called **magic numbers**: nobody reading the code knows what they mean, and changing the ball's size means finding every 6 that is the radius and none of the 6s that aren't.
5. **Hidden coupling.** Brick colours depend on the spacing formula (the crash above).
6. **Only testable as a whole.** The only way to check anything is to run the entire game for thousands of frames and look at five numbers at the end. "Does the ball bounce off the left wall?" can't be asked directly; checking that you can win takes 10,000 frames.
7. **Test machinery mixed into the game.** `test_frames`, `hold`, `lag_at` and the autopilot are tangled through the game's own code. The game can't be read without reading them.
8. **Arguments handled by hand, and half-handled.** `--test-run` is checked; `--hold sideways` is silently ignored (try it), and `--lag-at` with no number crashes with an `IndexError`.
9. **Deep nesting.** The deepest lines are four levels in: the `while`, then three `if`s inside each other. Each level is one more condition to hold in your head.
10. **Known simplifications**, which are fine for now but must be written down so they aren't forgotten: the ball always bounces vertically off bricks, even from the side; steering changes the ball's speed; a very slow frame can still move the ball through a brick or the paddle without touching it.

None of these stops the game working. All of them make the next change harder, riskier or slower than it needs to be.

> **Technical debt**: the extra cost every future change pays because of shortcuts taken earlier. Like money owed, a little is fine, even useful, if it buys speed when speed matters. It has to be written down and paid back before the interest (the slowdown on every change) grows too large.

## Your turn: write down the debt

**Build, on your own:** a *Technical debt* section in the backlog.

Add a section at the end of `BACKLOG.md`, headed `# Technical debt`, listing **at least five** items from this lesson, one per line, each starting with `- `. For each, write it in your own words, and say:

- **what** the problem is, with the evidence (a line number, a count, or the command that shows it);
- **why it matters**: which future change it makes harder.

Then commit it with a message that mentions **debt**.

Writing it in your own words is the point: when Chapter 2 fixes an item, you'll tick it off and be able to say what changed and why.

```hints
nudge: Pick the five items from the list that you'd find most annoying if you had to change the game tomorrow. For each, can you point to a line or a count in your own file?
concept: A debt item is useful when someone else could act on it: it names the problem, shows where it is, and says what it gets in the way of. "Code is messy" can't be acted on; "the ball's starting velocity is set on two lines (46 and 121), so changing the starting speed means changing both" can.
shape: A `# Technical debt` heading at the end of the file, then five or more lines starting with `- `, each one problem, its evidence, and the change it makes harder. Then `git add BACKLOG.md` and `git commit -m "..."` with "debt" in the message.
answer: ~~~markdown
# Technical debt

- The ball's starting position and velocity are set twice (lines 44–47 and 119–122): changing the starting speed means changing both, and forgetting one makes the ball behave differently after a miss.
- Brick colours are worked out backwards from the brick's y position (line 126), so changing the row spacing crashes the game: spacing 40 gives row 6 of 5.
- Everything is global: ball_vx is used or changed on 6 lines, so understanding or changing the ball's movement means reading the whole loop.
- The only way to test anything is a whole test run: checking that the game can be won takes 10,000 frames, and "does the ball bounce off the left wall" can't be checked on its own.
- The test-run code (test_frames, hold, lag_at, the autopilot) is mixed into the game code, on at least 6 lines, so the game can't be read without it.
- --hold sideways is silently ignored, and --lag-at with no number crashes with IndexError: only --test-run is checked.
- Magic numbers: the ball's radius 6 is written six times in the wall code, so changing the ball's size means finding every one.
~~~

~~~powershell
git add BACKLOG.md
git commit -m "Write down the technical debt in breakout.py"
~~~

Your line numbers may differ slightly from these if your file isn't exactly the lesson's.
```

```check
contains BACKLOG.md "# Technical debt" -- Add a section headed # Technical debt at the end of BACKLOG.md.
matches BACKLOG.md "# Technical debt[\s\S]*?(\n- [^\n]{20,}[\s\S]*?){5}" label="it lists at least five items, each a real sentence" -- Five or more lines starting with "- " under the heading, each describing a problem and why it matters.
git-message "debt" -- Commit with a message that mentions debt.
git-clean
```

## Challenge: pause

**Optional, ★★.** Build the *Pause* story from your backlog, if you wrote one (or write it now): **P** pauses the game, P again continues, and "Paused" is shown while paused. There's no automatic check.

As you build it, notice *where* the code has to go, and how many existing lines you have to read and understand first. Is there one obvious place for "paused", or does it have to be threaded through the loop next to `lives > 0 and bricks`? Write down what you notice under *Technical debt*. Chapter 4 builds pausing properly, with **game states**, and you'll be able to compare.

## What did we actually learn? (Chapter 1)

This chapter built a complete game, and on the way:

- **The game loop**: events, update, draw, show, at a steady 60 frames a second, with movement scaled by `dt` so it's the same on any computer.
- **State and drawing kept apart**, so that ending or pausing the game means stopping the update and nothing else.
- **Git**: small commits, readable history, undo for anything committed, and `.gitignore` for what's generated.
- **A backlog** of user stories, each done when its acceptance criteria are true and the work is committed.
- **A debugger** and a method, used on a real bug that only appeared when one frame was slow.
- **What makes code hard to change**, measured on your own code: no named parts, global state, duplication, magic numbers, coupling, and checks that can only test the whole thing.

That last list is the plan for what comes next. **Chapter 2** splits the script into **functions**, small named parts with clear inputs and outputs, and tests each one directly, so "does the ball bounce off the left wall?" becomes a question that takes a thousandth of a second to answer. Several items of your technical debt will be ticked off by the end of it.

None of this is specific to games or to Python. A web server written as one long function, a data-processing script that grew for a year, a C# class with 3,000 lines: the same list applies, with the same evidence, and the same fixes, which are what the rest of this series teaches.
