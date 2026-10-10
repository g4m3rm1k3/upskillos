---
title: 1.3 — The Update, by Hand
runtime: python
run: trace_updates.py
---

This lesson is the whole of Q-learning's learning rule. It's three lines of code, and you'll build it one idea at a time, then print every number it computes on four short episodes, so that nothing it does is hidden.

### The story so far, in plain words

This lesson continues the project from lessons 1.1 and 1.2. If you haven't done them, or it's been a while, here is everything you need, from the start.

**The world.** A corridor of five squares, numbered 0 to 4. A player starts on square 1. Stepping left from square 1 reaches a small coin on square 0, worth 0.1, and the game ends. Walking right three times reaches a treasure on square 4, worth 1, and the game also ends.

```text
 square:    0       1       2       3       4
           coin   start                  treasure
           +0.1                            +1
```

**The player** is a program we call the **agent**. It starts knowing nothing about the corridor. Its whole job is to find out, by trying, which way to go.

Three words come up constantly, and each is something very simple:

- The **state** is *where the agent is right now*: just the square's number. Standing on square 3, the state is 3.
- An **action** is *a move*. There are only two, so each gets a number: 0 means "step left", 1 means "step right".
- A **reward** is *what the corridor pays for one move*: 0 for landing on an ordinary square, 0.1 for the coin, 1 for the treasure.

**The agent's notebook: the Q-table.** To learn, the agent keeps a score for every move it could make on every square. A score is its current opinion of *how much reward this move leads to, from here until the game ends, if I keep choosing well afterwards*. Five squares × two moves = ten scores, laid out as a grid with a row for each square and a column for each move:

```text
            step left (0)    step right (1)
square 0        0.0              0.0          the coin's square: the game is over here, so it's never used
square 1        0.0              0.0
square 2        0.0              0.0
square 3        0.0              0.0
square 4        0.0              0.0          the treasure's square: never used either
```

At the start every score is 0, because the agent has no opinions yet. Learning means changing these numbers until they're right. Then choosing well is easy: on each square, take the move with the bigger score.

**How this looks in the code** (built in lessons 1.1 and 1.2):

- The state, the action and the square numbers are ordinary whole numbers: `3`, `1`.
- Lesson 1.2 wrote a function in `qtable.py` that **builds** the grid:

  ```python
  def make_table(n_states, n_actions):
      return np.zeros((n_states, n_actions))
  ```

  `np.zeros((5, 2))` comes from NumPy, Python's package for grids of numbers: it makes a grid of 5 rows and 2 columns, every value 0. The pair `(5, 2)` is the grid's **shape**, always written (rows, columns): 5 rows because there are 5 squares, 2 columns because there are 2 moves. The function hands that grid back, but it doesn't **name** it. Whoever calls the function chooses a name for what comes back.
- The grid gets its name where the function is **called**: **`Q = make_table(5, 2)`**. You saw that line first in lesson 1.2's tests (`tests/test_qtable.py`), and this lesson's tests and `trace_updates.py` use it the same way. `Q` is the name Q-learning always uses for this table, the *Q* in Q-learning. (In lesson 1.4 the agent keeps its own grid as `self.Q`.)
- With the grid in `Q`, `Q[3, 1]` reads **one score**: row 3, column 1, "the score for stepping right on square 3". It's a single number, not a list.
- `Q[3]` reads **a whole row**: both scores for square 3, like `[0.0, 0.5]`.

**How many numbers are in the square brackets decides what comes back.** One number picks a **row**, so you get both of that row's values. Two numbers pick a row **and then** a column, which is one cell, so you get one value, like a spreadsheet reference such as "D4". So `Q[state, action]` is always exactly one score: `state` chooses the row (the square the agent is on), and `action` chooses the column (the move).

**The action number does two jobs.** To the corridor, 0 means "step towards square 0" and 1 means "step towards square 4". Those are fixed directions on the map, not relative to anything. To the table, the same number is simply which column to look in. That's why moves are numbered rather than named: the number works directly as a column number.

Try it in the terminal: start Python with `.venv\Scripts\python`, then type:

```python
>>> from qtable import make_table
>>> Q = make_table(5, 2)        # 5 rows (squares) x 2 columns (moves), all 0.0
>>> Q[3, 1] = 0.5               # two numbers: row 3, column 1, one cell
>>> Q[3, 1]                     # two numbers in: one value out
np.float64(0.5)
>>> Q[3]                        # one number in: the whole row out
array([0. , 0.5])
>>> Q[3, 0]                     # the other cell in row 3: stepping left on square 3
np.float64(0.0)
```

(`np.float64(0.5)` is just how NumPy shows one of its numbers: it's 0.5. Type `exit()` to leave Python.)

### The rule

So, in one sentence: **after each move, take the one score for the square the agent was on and the move it just made (in code, `Q[state, action]`), and change that number a little of the way towards a better guess of what that move is really worth.** Only that one score changes; the other nine stay as they are.

Two questions follow, and each has its own step: *how far is "a little of the way"?* and *what is the better guess?*

### How the pieces fit

Here's the whole learning loop. This lesson builds the two boxes in the middle:

```text
the agent is in a cell (the STATE s) and picks a move (the ACTION a)
        |
        v
the corridor answers:  a REWARD r,  the NEXT STATE s',  and whether the episode ENDED
        |
        v
+------------------------------------------------------------------------+
| q_target:  "given what just happened, what is (s, a) really worth?"     |  <- step 3
|            target = r + gamma x (best score in s')   or just r if ended |
+------------------------------------------------------------------------+
| nudge:     move the table's score Q[s, a] a fraction alpha of the way   |  <- step 2
|            from its old value towards that target                       |
+------------------------------------------------------------------------+
        |
        v
the table now believes slightly better things, so the next choice is slightly better
```

`q_update`, the Your turn, is just those two boxes joined together. Every value in the table is learned this way, one step of experience at a time.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_update.py** above.

```python file=tests/test_update.py provided
# Tests for qlearning.py and trace_updates.py (lesson 1.3).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_update.py
import numpy as np
from pytest import approx


def test_nudge_moves_a_fraction_of_the_way():
    from qlearning import nudge
    assert nudge(0.0, 1.0, 0.5) == approx(0.5)
    assert nudge(0.5, 1.0, 0.5) == approx(0.75)
    assert nudge(0.8, 0.0, 0.25) == approx(0.6)


def test_nudge_with_alpha_one_jumps_all_the_way():
    from qlearning import nudge
    assert nudge(0.3, 0.9, 1.0) == approx(0.9)


def test_target_after_an_ending_is_just_the_reward():
    from qlearning import q_target
    assert q_target(1.0, np.array([5.0, 7.0]), True, 0.9) == approx(1.0)


def test_target_adds_the_discounted_best_next_value():
    from qlearning import q_target
    assert q_target(0.0, np.array([0.2, 0.5]), False, 0.9) == approx(0.45)
    assert q_target(-1.0, np.array([3.0, 1.0]), False, 0.5) == approx(0.5)


def test_qupdate_changes_one_cell():
    from qlearning import q_update
    Q = np.zeros((5, 2))
    Q[3] = [0.0, 0.8]
    q_update(Q, 2, 1, 0.0, 3, False, 0.5, 0.9)
    assert Q[2, 1] == approx(0.36), "0 + 0.5 * (0 + 0.9 * 0.8 - 0)"
    assert Q.sum() == approx(0.36 + 0.8), "nothing else changes"


def test_qupdate_at_an_ending_ignores_the_next_row():
    from qlearning import q_update
    Q = np.zeros((5, 2))
    Q[4] = [9.0, 9.0]
    q_update(Q, 3, 1, 1.0, 4, True, 0.5, 0.9)
    assert Q[3, 1] == approx(0.5)


def test_trace_reproduces_the_table_in_the_lesson():
    from corridor import RIGHT
    from trace_updates import trace
    Q, rows = trace([RIGHT, RIGHT, RIGHT], episodes=4)
    assert len(rows) == 12
    assert [round(after, 3) for *_, after in rows[:3]] == [0.0, 0.0, 0.5]
    assert Q[1, 1] == approx(0.253125)
```

**`approx`** is new. Computers store most decimals inexactly: `0.1 + 0.2` is `0.30000000000000004` in Python, because 0.1 has no exact binary form, just as 1/3 has no exact decimal one. So comparing calculated decimals with `==` can fail by a tiny amount. `x == approx(0.36)` is true when `x` is within about a millionth of 0.36 (one part in a million, relative to its size).

**What each group of tests protects against.** A bug in the learning rule doesn't crash anything. The agent just learns the wrong values and quietly behaves badly, which is the hardest kind of bug to find. So each group pins down one thing that must be true:

- **`nudge` tests:** the estimate moves the right **fraction** of the way. A wrong formula could overshoot the target, move away from it, or ignore α.
- **`target` tests:** the guess is built from the right pieces. That means the reward is always counted, the next state's **best** value is counted (not the first, not the average), γ shrinks it, and after an **ending** the next state is ignored completely.
- **`qupdate` tests:** the update changes exactly **one** number in the table, the score of the action just taken, and leaves the other nine alone.
- **`trace` test:** the printed table at the end of this lesson really is what your code computes. The numbers in this lesson aren't just claimed: they're checked.

The comments on `test_qupdate_changes_one_cell` already show the arithmetic you'll be doing: `0 + 0.5 * (0 + 0.9 * 0.8 - 0)`. By the end of this lesson, you'll be able to read every number in it.

```check
file tests/test_update.py -- Click "Create provided tests/test_update.py" above.
```

## A little of the way

Create `qlearning.py`:

```python file=qlearning.py
def nudge(estimate, target, alpha):
    return estimate + alpha * (target - estimate)
```

**The three inputs, and what each is for:**

| name | what it is | in the corridor |
|---|---|---|
| `estimate` | what the table believes now | the current score of one move, like Q(3, right) |
| `target` | a better guess, from the latest experience | built in the next step, by `q_target` |
| `alpha` (α) | how far to move towards the target, as a fraction from 0 to 1. It's called the **step size** or **learning rate** | chosen by us: 0.5 in this lesson |

Two more quantities appear inside the formula, and they're worth naming:

- **the error**, `target - estimate`: how far off the estimate is. It's positive if the estimate is too low, negative if it's too high.
- **the move**, `alpha * (target - estimate)`: the error, scaled down to a fraction of itself.

The new estimate is the old one plus the move.

**This is a recurrence relation.** That's the name for a rule that gives each value from the one before it. Write the estimate after n nudges as E(n), the target as T and the step size as α:

```text
E(n+1) = E(n) + α × (T − E(n))
```

In words: *the next estimate is this estimate, plus a fraction α of the gap between it and the target.* Followed step by step from E(0) = 0 towards T = 1 with α = 0.5, with every quantity written out:

```text
 n   estimate E(n)   error T − E(n)      move α × error         new estimate E(n+1)
 0   0               1 − 0     = 1       0.5 × 1     = 0.5      0     + 0.5    = 0.5
 1   0.5             1 − 0.5   = 0.5     0.5 × 0.5   = 0.25     0.5   + 0.25   = 0.75
 2   0.75            1 − 0.75  = 0.25    0.5 × 0.25  = 0.125    0.75  + 0.125  = 0.875
 3   0.875           1 − 0.875 = 0.125   0.5 × 0.125 = 0.0625   0.875 + 0.0625 = 0.9375
```

Look at the error column: 1, 0.5, 0.25, 0.125. Each nudge leaves exactly (1 − α) of the error behind, here half. So after n nudges the error is (1 − α)ⁿ times what it started as, and the estimate is:

```text
E(n) = T − (T − E(0)) × (1 − α)ⁿ          here:  E(n) = 1 − 0.5ⁿ
```

That **closed form** gives any step without working through the ones before it. It says two things. The estimate gets as close to the target as you like (0.5ⁿ shrinks towards 0), but never quite reaches it. And it never overshoots, because each move is only a fraction of the gap that's left. With a bigger α the gap shrinks faster: with α = 0.9 it's 0.1ⁿ.

Don't take the table's word for it. Once you've created `qlearning.py` with the code above, make a scratch file, `see_nudge.py`, and run it:

```python
from qlearning import nudge

estimate = 0.0
for n in range(1, 6):
    estimate = nudge(estimate, 1.0, 0.5)
    print(n, estimate)
```

The loop is the recurrence: each pass feeds the new `estimate` back into `nudge` for the next one. Change `0.5` to `0.9`, or the target to `-1.0`, and run it again to see how α and T change the path.

```text
1 0.5
2 0.75
3 0.875
4 0.9375
5 0.96875
```

**Why not jump straight to the target?** That's α = 1, and the second test checks it does exactly that. It would be right if every target were the truth. But a target is computed from one experience, and experiences vary: in Chapter 2's CartPole, the same action in nearly the same situation sometimes works and sometimes doesn't. With α = 1 the estimate would be whatever the **last** experience said. With a small α, each experience shifts the estimate a little, so the estimate becomes an **average** of many experiences, with recent ones counting most. This one line is how every method in this series learns, including the neural networks of Chapter 4.

```predict
question: An estimate starts at 0. It's nudged towards a target of 1 with α = 0.5, three times. What is it now?
answer: 0.875
tolerance: 0.001
explain: 0.5, then 0.75, then 0.875, as in the table above. Each nudge halves the remaining error: 1, 0.5, 0.25, 0.125 left. After n nudges the estimate is 1 − 0.5ⁿ, which gets as close to 1 as you like, but never reaches it.
verify: .venv/Scripts/python -c "from qlearning import nudge; e = 0.0; e = nudge(e, 1.0, 0.5); e = nudge(e, 1.0, 0.5); e = nudge(e, 1.0, 0.5); print(e)"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_update.py -k nudge" label="nudge moves the estimate a fraction alpha of the way to the target" -- return estimate + alpha * (target - estimate).
```

## What to aim for

Now the target, the "better guess" that `nudge` moves towards.

Start from what Q(s, a) **means**: *the total reward from here to the end of the episode, if I take action `a` in state `s` and then choose well.* Split that total into two parts:

```text
total from here  =  (the reward for this one step)  +  (everything that comes after it)
```

After one step, the agent knows the first part for certain: it just got it. For the second part it has a guess already sitting in the table. The row for the **next** state holds the scores of every move from there, and "choose well from there" means taking the best of them. So the better guess is:

```text
target = reward  +  γ × (the biggest value in the next state's row)
```

**The four inputs of `q_target`, and why each is needed:**

| input | what it is | why it's needed, and what goes wrong without it |
|---|---|---|
| `reward` | the number the corridor just paid for this step: 0 for floor, 0.1 for the coin, 1 for the treasure | it's the only part of the target that's **certain**, and the only way real information enters the table. Without it, every target would be built from guesses alone, and nothing would ever be learned |
| `next_row` | the table's row for the cell the agent landed in: `Q[next_state]`, an array of **two** scores, one per action (LEFT, RIGHT) | it holds the table's current guess of "everything after this step". It has two entries because there are two actions, and we take the **biggest**, because the target describes choosing *well* from there. Using the wrong row, or the average, would teach the agent about bad play |
| `terminated` | `True` if this step **ended** the episode (the agent reached the coin or the treasure), `False` if it's still going | after an ending there is **no** "after", so the second part must be 0. The terminal cell's row exists in the table, but it's never acted from, so whatever it holds is meaningless. Adding it would invent reward that can't happen |
| `gamma` (γ) | a number from 0 to 1 that we choose: how much a reward one step later is worth, compared with a reward now | it makes the agent prefer sooner rewards, and it controls how far ahead it looks. 0.9 means one step later is worth 0.9, two steps 0.81, three steps 0.729. Lesson 1.5 measures what changes when you choose differently |

**Why `terminated`, but not `truncated`?** The corridor reports two kinds of stopping (lesson 1.1). *Terminated* means the world ended: the agent reached an end cell. *Truncated* means **we** stopped the episode, because it hit the 20-step time limit, while the agent was standing on an ordinary cell with a future ahead of it. For the target, only a real ending means "nothing comes after". A time limit doesn't: if the episode had gone on, the agent could still have walked to the treasure. So the next row still counts after a truncation, and `q_target` only needs to know about terminations. Lesson 1.4's `learn` passes it `terminated` and nothing else.

- **The reward** is the part that's now known for certain.
- **The biggest value in the next row** is the rest of the episode's reward, as estimated *by the table itself*. Using your own estimates to improve your own estimates sounds circular, but it works: the reward part is real, so each update mixes a little truth into the table, and the truth spreads from the cells where rewards happen to their neighbours. The last step of this lesson shows it spreading.
- **γ** (gamma, the **discount**) is a number between 0 and 1 that makes later rewards count for less. With γ = 0.9, a reward one step away is worth 0.9 of its face value, two steps away 0.9 × 0.9 = 0.81, three steps away 0.729. It makes the agent prefer rewards sooner, and it decides how far ahead the agent cares about. Lesson 1.5 measures what happens when it's small.

**After an ending there is no next state**, so there's nothing to add: the target is just the reward. That's what `terminated` tells you. The next row exists in the table, but it belongs to a terminal state that is never acted from, so whatever is stored there must not be used. (A *truncated* episode is different: the world didn't end, it was only cut short, so the next state's value still counts. That's why the corridor reports the two separately.)

Add `q_target`:

```python file=qlearning.py
def nudge(estimate, target, alpha):
    return estimate + alpha * (target - estimate)


def q_target(reward, next_row, terminated, gamma):
    if terminated:
        return reward
    return reward + gamma * next_row.max()
```

`next_row.max()` is NumPy's biggest value in the array, like Python's `max` of a list.

**The tests' examples, read as situations:**

1. `q_target(0.0, [0.2, 0.5], False, 0.9)`. The agent stepped onto plain floor (reward **0**). The episode isn't over (**False**). In the cell it landed in, the table currently scores LEFT at 0.2 and RIGHT at 0.5, so the best move from there is worth **0.5**. That's one step in the future, so it's worth 0.9 of its face value now. Target = 0 + 0.9 × 0.5 = **0.45**: "this step was worth nothing by itself, but it brought me next to something worth 0.5."
2. `q_target(-1.0, [3.0, 1.0], False, 0.5)`. A made-up world where a step costs 1 (reward **−1**), and the next cell's best move is worth **3**. With γ = 0.5, the future counts half. Target = −1 + 0.5 × 3 = **0.5**: the step cost something, but it led somewhere good, and overall it was worth +0.5. (The corridor never pays −1. The test uses a negative reward on purpose, to check that the code adds the reward rather than ignoring it.)
3. `q_target(1.0, [5.0, 7.0], True, 0.9)`. The agent reached the treasure (reward **1**) and the episode **ended** (**True**). The row [5.0, 7.0] belongs to the terminal cell. Nothing happens after an ending, so those numbers must not count, however big they are. Target = **1.0**. The test puts big numbers there deliberately: if your code added them, you'd get 1 + 0.9 × 7 = 7.3, and the test would catch it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_update.py -k target" label="q_target is the reward, plus gamma times the best next value unless the episode ended" -- If terminated, return reward; otherwise return reward + gamma * next_row.max().
```

## Your turn: one update

**Build, on your own:** `q_update`, the Q-learning update itself.

```python
q_update(Q, state, action, reward, next_state, terminated, alpha, gamma)
```

It's given the whole table `Q` and everything about one step of experience: the agent was in `state`, took `action`, got `reward`, landed in `next_state`, and `terminated` says whether that ended the episode. It should:

1. work out the target from the reward and the **next state's row** of the table, using `q_target`, and
2. nudge the one number `Q[state, action]` towards that target by `alpha`, using `nudge`, and store the result back in the table.

It returns nothing. It changes `Q` itself: an array passed to a function is the same array, not a copy, so writing `Q[state, action] = …` inside the function changes the caller's table.

Check yourself against `test_qupdate_changes_one_cell` before running it: Q[2, 1] starts at 0, the reward is 0, the next state is 3 whose row is [0.0, 0.8], α = 0.5, γ = 0.9. The target is 0 + 0.9 × 0.8 = 0.72, and the nudge moves 0 halfway there: 0.36.

```hints
nudge: The next state's row is `Q[next_state]`. Which of your two functions takes a row?
concept: `q_target(reward, Q[next_state], terminated, gamma)` is the target. `nudge(Q[state, action], target, alpha)` is the new value, and assigning it to `Q[state, action]` stores it.
answer: Add to `qlearning.py`:
~~~python
def q_update(Q, state, action, reward, next_state, terminated, alpha, gamma):
    target = q_target(reward, Q[next_state], terminated, gamma)
    Q[state, action] = nudge(Q[state, action], target, alpha)
~~~
Written out in full, that's the formula you'll see in every textbook: Q(s, a) ← Q(s, a) + α · (r + γ · max Q(s′, ·) − Q(s, a)).
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_update.py -k qupdate" label="q_update nudges Q[state, action] towards the target and changes nothing else" -- target = q_target(reward, Q[next_state], terminated, gamma); then Q[state, action] = nudge(Q[state, action], target, alpha).
```

## Watch the values flow back

Now print every update. Create `trace_updates.py`. It plays the corridor by walking right three times, four episodes in a row, and records each step: where it was, what it did, what it got, and the table entry before and after the update.

```python file=trace_updates.py
from corridor import LEFT, RIGHT, Corridor
from qlearning import q_update
from qtable import make_table

ALPHA = 0.5
GAMMA = 0.9
NAMES = {LEFT: "left", RIGHT: "right"}


def trace(moves, episodes):
    env = Corridor()
    Q = make_table(env.n_states, env.n_actions)
    rows = []
    for episode in range(1, episodes + 1):
        state, _ = env.reset()
        for action in moves:
            next_state, reward, terminated, truncated, _ = env.step(action)
            before = Q[state, action]
            q_update(Q, state, action, reward, next_state, terminated, ALPHA, GAMMA)
            rows.append((episode, state, NAMES[action], reward, next_state, before, Q[state, action]))
            state = next_state
            if terminated or truncated:
                break
    return Q, rows


if __name__ == "__main__":
    Q, rows = trace([RIGHT, RIGHT, RIGHT], episodes=4)
    print("episode  state  action  reward  next  Q before  Q after")
    for episode, state, action, reward, next_state, before, after in rows:
        print(f"{episode:7}  {state:5}  {action:>6}  {reward:6.1f}  {next_state:4}  {before:8.3f}  {after:7.3f}")
```

- The moves are fixed (`[RIGHT, RIGHT, RIGHT]`) instead of chosen, so you can follow the learning rule on its own. Choosing actions is next lesson.
- `before = Q[state, action]` reads the number **before** `q_update` changes it. It's a plain number, copied out of the array, so it keeps the old value after the update.
- `state = next_state` is the step that's easy to forget: the place you landed is where the next step starts from.
- In the f-strings, `{episode:7}` pads the number to 7 characters wide, `{reward:6.1f}` shows 1 decimal place in 6 characters, and `{action:>6}` right-aligns the text. They only line the columns up.

Press **Run**:

```text
episode  state  action  reward  next  Q before  Q after
      1      1   right     0.0     2     0.000    0.000
      1      2   right     0.0     3     0.000    0.000
      1      3   right     1.0     4     0.000    0.500
      2      1   right     0.0     2     0.000    0.000
      2      2   right     0.0     3     0.000    0.225
      2      3   right     1.0     4     0.500    0.750
      3      1   right     0.0     2     0.000    0.101
      3      2   right     0.0     3     0.225    0.450
      3      3   right     1.0     4     0.750    0.875
      4      1   right     0.0     2     0.101    0.253
      4      2   right     0.0     3     0.450    0.619
      4      3   right     1.0     4     0.875    0.938
```

Read it one episode at a time:

- **Episode 1.** Steps from cells 1 and 2 earn 0, and the next cell's row is still all zeros, so their targets are 0 and nothing changes. The step from cell 3 reaches the treasure: `terminated`, so the target is just the reward, 1, and Q(3, right) moves halfway: **0.5**. After one episode, the agent knows exactly one thing: right is good *in cell 3*.
- **Episode 2.** From cell 2, the next state is cell 3, whose best value is now 0.5. Target = 0 + 0.9 × 0.5 = 0.45, and Q(2, right) moves halfway: **0.225**. Cell 1 still learns nothing: cell 2's row was all zeros when cell 1's update happened, at the start of this episode. Meanwhile Q(3, right) moves halfway from 0.5 to 1: 0.75.
- **Episode 3.** Now cell 1's next state, cell 2, is worth 0.225: target 0.9 × 0.225 = 0.2025, half of it **0.101**.

The value **flows backwards from the reward, one cell per episode**. Nobody told the agent that cell 1 leads towards the treasure; it worked that out because cell 3's value leaked into cell 2's, and then cell 2's into cell 1's. That's the "using its own estimates" from the target step, doing its job.

Where is it heading? If the agent kept walking right forever, the numbers would settle where target and estimate agree: Q(3, right) at 1, Q(2, right) at 0.9 × 1 = 0.9, Q(1, right) at 0.9 × 0.9 = 0.81. Those are the true values: the treasure, discounted once per step it takes to get there.

```predict
question: After episode 4, what is Q(1, right), to 3 decimal places?
answer: 0.253
tolerance: 0.001
explain: In episode 4, cell 1 is updated first, using cell 2's value from the end of episode 3, which was 0.450. Target = 0 + 0.9 × 0.450 = 0.405. Q(1, right) was 0.101 (0.10125 exactly), so it moves halfway: 0.10125 + 0.5 × (0.405 − 0.10125) = 0.253125. The last row of the printed table shows the same, rounded: 0.253.
verify: .venv/Scripts/python -c "from trace_updates import trace; Q, rows = trace([1, 1, 1], 4); print(round(float(Q[1, 1]), 3))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_update.py -k trace" label="trace_updates reproduces the table in this lesson" -- Read each step's Q value into before, call q_update, and append the row; then move on with state = next_state.
run ".venv/Scripts/python -m pytest -q tests/test_update.py" label="all lesson 1.3 tests pass"
```

### What you have

The whole learning rule, `q_update`, and a trace that shows it working. In these four episodes the moves were chosen for the agent. Next lesson, the agent chooses its own, and runs straight into the coin problem from lesson 1.2.
