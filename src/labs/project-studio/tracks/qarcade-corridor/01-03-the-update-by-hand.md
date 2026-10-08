---
title: 1.3 — The Update, by Hand
runtime: python
run: trace_updates.py
---

This lesson is the whole of Q-learning's learning rule. It's three lines of code, and you'll build it one idea at a time, then print every number it computes on four short episodes, so that nothing it does is hidden.

The rule, in one sentence: **after each step, move the score of the action you just took a little of the way towards a better guess of what that action is really worth.** Two questions follow, and each has its own step: *how far is "a little of the way"?* and *what is the better guess?*

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

The comments on `test_qupdate_changes_one_cell` already show the arithmetic you'll be doing: `0 + 0.5 * (0 + 0.9 * 0.8 - 0)`. By the end of this lesson, you'll be able to read it.

```check
file tests/test_update.py -- Click "Create provided tests/test_update.py" above.
```

## A little of the way

Create `qlearning.py`:

```python file=qlearning.py
def nudge(estimate, target, alpha):
    return estimate + alpha * (target - estimate)
```

`target - estimate` is how wrong the estimate is: the **error**. `nudge` moves the estimate by a fraction `alpha` (the Greek letter α, called the **step size** or **learning rate**) of that error. With α = 0.5 it moves halfway to the target. Followed three times towards a target of 1:

```text
estimate 0       error 1       moves 0.5 × 1     = 0.5     →  0.5
estimate 0.5     error 0.5     moves 0.5 × 0.5   = 0.25    →  0.75
estimate 0.75    error 0.25    moves 0.5 × 0.25  = 0.125   →  0.875
```

The estimate approaches the target and never overshoots it: each move is a fraction of what's left.

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

Now the target. Q(s, a) means "the total reward from here on, if I take `a` and then choose well". After taking `a`, the agent has learned two things: the **reward** it just got, and the **next state** it landed in. And the table already holds a guess of how good the next state is: the biggest number in its row, because "choose well from there" means taking the best action there. So a better guess of Q(s, a) is:

```text
target = reward  +  γ × (the biggest value in the next state's row)
```

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

Working the tests' two examples: `q_target(0.0, [0.2, 0.5], False, 0.9)` is 0 + 0.9 × 0.5 = 0.45. `q_target(-1.0, [3.0, 1.0], False, 0.5)` is −1 + 0.5 × 3 = 0.5. And `q_target(1.0, [5.0, 7.0], True, 0.9)` is 1.0: the 5 and 7 are ignored because the episode ended.

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
