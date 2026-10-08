---
title: 2.6 — Where Tables Break
runtime: python
run: tables.py
---

The 72-row table balances CartPole reliably, but it does it by **ignoring the cart**: position and velocity each have one slot, so the agent can't tell the middle of the track from the edge. This lesson asks the natural question: what if the table could see more? Give the cart slots, give the angle and spin finer slots, and measure what happens.

The answer is surprising, and it's the reason the rest of this series exists. A bigger table, which in principle can represent a better policy, learns **worse**. You'll measure why, find out exactly how the "almost good" agents fail, and end with what a table fundamentally can't do.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_tables.py** above.

```python file=tests/test_tables.py provided
# Tests for tables.py and endings.py (lesson 2.6).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_tables.py
import numpy as np


def test_visited_counts_rows_that_were_ever_changed():
    from tables import visited
    Q = np.zeros((6, 2))
    Q[1, 0] = 0.5
    Q[4] = [-1.0, 2.0]
    assert visited(Q) == 2


def test_visited_on_an_empty_table_is_zero():
    from tables import visited
    assert visited(np.zeros((72, 2))) == 0


def test_visited_returns_a_plain_int():
    from tables import visited
    assert type(visited(np.ones((3, 2)))) is int


def test_sizes_are_tried_with_their_own_tables():
    from tables import try_size
    scores, seen, seconds = try_size((3, 3, 6, 6), episodes=20, seeds=2)
    assert scores.shape == (2,) and 0 < seen <= 1 and seconds > 0


def test_endings_add_up_to_the_episodes():
    from cartpole_table import train_cartpole
    from endings import endings
    agent, env, _ = train_cartpole(20, seed=0)
    counts = endings(agent, env, episodes=6)
    assert sum(counts.values()) == 6
    assert set(counts) == {"pole fell", "cart left the track", "reached 500"}


def test_endings_find_the_drifting_agent():
    from cartpole_table import train_cartpole
    from endings import endings
    agent, env, _ = train_cartpole(500, seed=7, alpha=0.1)
    assert endings(agent, env)["cart left the track"] == 20
```

The last test trains lesson 2.5's seed-7 agent, the one judged at 192 steps, and makes a specific claim about **how** its episodes end. You'll see why at the end.

```check
file tests/test_tables.py -- Click "Create provided tests/test_tables.py" above.
```

## Your turn: count the rows it used

**Build, on your own:** `visited(Q)` in a new file, `tables.py`.

To understand a table's size, it helps to know how much of it the agent ever **used**. A row the agent has never learned in is still exactly as it started: all zeros. A row it has learned in almost certainly has at least one non-zero value (every CartPole step pays 1, so the first update of a row makes it positive).

`visited(Q)` should return how many rows of `Q` contain at least one non-zero value, as a plain `int`. Two NumPy tools:

- **`Q.any(axis=1)`** asks, for each row, "is any value in it non-zero?", giving one `True` or `False` per row. `axis=1` means "look along the columns, within each row"; `axis=0` would ask the question of each column instead.
- **`np.count_nonzero(array)`** counts how many entries are non-zero, and `True` counts as 1.

Start the file with `import numpy as np`.

```hints
nudge: First turn the table into one True or False per row; then count the Trues.
concept: `Q.any(axis=1)` is one boolean per row; `np.count_nonzero` of that is the number of rows with something in them.
answer: Create `tables.py`:
~~~python
import numpy as np


def visited(Q):
    return int(np.count_nonzero(Q.any(axis=1)))
~~~
For the test's table, rows 1 and 4 hold non-zero values, so `Q.any(axis=1)` is [False, True, False, False, True, False] and the count is 2.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_tables.py -k visited" label="visited counts the rows holding any non-zero value" -- return int(np.count_nonzero(Q.any(axis=1))).
```

## Bigger and smaller tables

Now the experiment. Make `tables.py` this:

```python file=tables.py
import time

import numpy as np

from cartpole_table import train_cartpole
from judge import evaluate

SIZES = [(1, 1, 6, 12), (3, 3, 6, 6), (6, 6, 12, 12), (10, 10, 20, 20)]


def visited(Q):
    return int(np.count_nonzero(Q.any(axis=1)))


def try_size(counts, episodes, seeds=3):
    scores = []
    seen = []
    start = time.perf_counter()
    for seed in range(seeds):
        agent, env, _ = train_cartpole(episodes, seed, alpha=0.2, alpha_end=0.02, counts=counts)
        scores.append(evaluate(agent, env).mean())
        seen.append(visited(agent.Q) / env.n_states)
    return np.array(scores), float(np.mean(seen)), (time.perf_counter() - start) / seeds


if __name__ == "__main__":
    print("bins              states  episodes  greedy scores     visited  seconds per run")
    for counts in SIZES:
        for episodes in (500, 2000):
            scores, seen, seconds = try_size(counts, episodes)
            print(f"{str(counts):16} {int(np.prod(counts)):6}  {episodes:8}  {str(np.round(scores).astype(int).tolist()):17} {seen:6.0%}  {seconds:6.1f}")
```

For each of four slot layouts, from 72 rows to 40,000, it trains 3 agents with lesson 2.5's best schedule, for 500 episodes and again for 2,000, and reports their greedy scores, the fraction of the table they used, and the time per agent. `time.perf_counter()` reads a clock in seconds, so the difference between two readings is how long something took. `{seen:6.0%}` shows a fraction as a percentage.

Run it with `.venv\Scripts\python tables.py`. It takes about five minutes. Predict while it runs:

```predict
question: After only 500 episodes, which table will score best?
choice: 72 rows, (1, 1, 6, 12)
choice: 324 rows, (3, 3, 6, 6)
choice: 5,184 rows, (6, 6, 12, 12)
choice: 40,000 rows, (10, 10, 20, 20)
answer: 72 rows, (1, 1, 6, 12)
explain: The smallest table wins at 500 episodes, and it isn't close: all three agents at 499 or 500, while the 5,184-row table scores 20 to 90 and the 40,000-row table 55 to 69. A big table has to learn every row separately. After 500 episodes the 40,000-row agent has used only about 3% of its table, so almost every situation it meets is one it knows nothing about.
verify: script smallest_wins.py
```

```predict
question: After 2,000 episodes, what percentage of its 40,000 rows will the biggest table have used? (A whole number.)
answer: 5
tolerance: 3
explain: About 5%: roughly 2,000 rows of 40,000, after 2,000 episodes. Most combinations of slots are situations the agent never gets into. With finer slots, every small difference in position, velocity, angle or spin makes a new row, and each needs its own experience before its values mean anything. It still learns: 2,000 episodes take two of its three agents to 390 and 478. But learning is slow, because experience in one row teaches **nothing** about the row next to it.
verify: script biggest_visited.py
```

What it printed on the machine this series was written on:

```text
TABLES_OUTPUT
```

Three things to read in it:

1. **More rows learn more slowly.** At 500 episodes, the order is the reverse of the size: 72 rows best, 40,000 worst. 5,184 rows needed 2,000 episodes to catch up, and 40,000 rows still hadn't.
2. **Bigger tables use less of themselves.** The visited fraction falls from about 60% to 5%. This is the **curse of dimensionality**: each extra number with slots *multiplies* the number of rows. Four numbers with 20 slots each would be 20⁴ = 160,000 rows. A game screen, with thousands of numbers, would need more rows than there are atoms in the universe.
3. **The 324-row table never learns, at any length.** It differs from the 72-row table in two ways at once: it adds cart slots, and it halves the spin's slots from 12 to 6. Measured separately with 5 agents each, neither change alone breaks learning. (1, 1, 6, 6) reached 500 with all five agents after 2,000 episodes, and (3, 3, 6, 12) with four of five after 500. The two together do. That's a lesson about experiments as much as about tables: when two things change at once, a result can't tell you which one mattered.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tables.py -k sizes" label="try_size trains, judges and measures one table layout" -- For each seed: train with counts=counts, score it with evaluate, and record visited(agent.Q) / env.n_states; return the scores, the mean visited fraction and the seconds per run.
```

## Two ways to fail

Look again at the scores that keep appearing: 187, 189, 191, 192, 193. They aren't random. Find out what they are. Create `endings.py`:

```python file=endings.py
from cartpole_table import train_cartpole


def endings(agent, env, episodes=20, seed=1000):
    saved = agent.epsilon
    agent.epsilon = 0.0
    counts = {"pole fell": 0, "cart left the track": 0, "reached 500": 0}
    for i in range(episodes):
        state, _ = env.reset(seed=seed if i == 0 else None)
        while True:
            state, _, terminated, truncated, _ = env.step(agent.act(state))
            if truncated:
                counts["reached 500"] += 1
                break
            if terminated:
                counts["cart left the track" if abs(env.obs[0]) > 2.4 else "pole fell"] += 1
                break
    agent.epsilon = saved
    return counts


if __name__ == "__main__":
    for seed in (0, 7):
        agent, env, _ = train_cartpole(500, seed, alpha=0.1)
        print(f"step 0.1, seed {seed}: {endings(agent, env)}")
```

It plays the agent greedily, like `evaluate`, but instead of counting steps it asks **why** each episode ended. CartPole terminates for two reasons (lesson 2.1): the pole past 12°, or the cart past 2.4 m. `env.obs[0]` is the cart's real position at the moment it ended, which the wrapper kept, so `abs(env.obs[0]) > 2.4` tells the two apart. `abs` is the size of a number without its sign: `abs(-2.5)` is 2.5.

The `__main__` block retrains two of lesson 2.5's agents with step 0.1: seed 0, which scored 500, and seed 7, which scored 192.

```predict
question: How will seed 7's 20 episodes end?
choice: The pole falls, every time
choice: The cart leaves the track, every time
choice: A mixture of both
answer: The cart leaves the track, every time
explain: All 20 end with the cart past the edge, after about 192 steps, and the pole never falls. The agent learned to balance perfectly well. What it didn't learn is to stay on the track, and with this table it **can't**: position has one slot, so to the agent the middle of the track and its edge are the same row. The agents scoring around 190 in the table above fail the same way. They balance while drifting steadily one way, and reach the end of the track after a little under 4 seconds. The same thing ended `lean_and_spin`'s 10 failures in lesson 2.2.
verify: .venv/Scripts/python -c "from cartpole_table import train_cartpole; from endings import endings; a, e, _ = train_cartpole(500, 7, alpha=0.1); c = endings(a, e); print('The cart leaves the track, every time' if c['cart left the track'] == 20 else c)"
```

```text
step 0.1, seed 0: {'pole fell': 0, 'cart left the track': 0, 'reached 500': 20}
step 0.1, seed 7: {'pole fell': 0, 'cart left the track': 20, 'reached 500': 0}
```

So the 72-row table works, and it isn't really solving CartPole. Agents trained with it balance by luck of drift: some happen to learn a balancing style that keeps the cart near the middle, and others learn one that drifts off in 4 seconds. Nothing in their table could tell them which. To fix that they need to see the cart, and seeing the cart with a table means more rows, which, as you measured, means learning far more slowly.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tables.py -k endings" label="endings tells a falling pole from a cart off the track"
run ".venv/Scripts/python -m pytest -q tests/test_tables.py" label="all lesson 2.6 tests pass"
```

## What a table can't do

Here's the root of the problem, in one picture. Two neighbouring rows of the 5,184-row table:

```text
row A:  pole 2° right, spinning right slowly, cart near the middle, still     → learned: push right
row B:  pole 2° right, spinning right slowly, cart near the middle, drifting  → never visited: 0, 0
```

These situations are nearly identical, and the right action is almost certainly the same. A person would generalise at once. The table can't: rows are separate boxes, and learning in one changes nothing in any other. Every row must be learned from its own experience, which is why big tables learn slowly and small tables have to lump very different situations together.

What's needed is something that, having learned row A, would **already have a good guess** for row B, because B's numbers are close to A's. That is: instead of a table that *looks up* a value for a row, a **function** that *computes* a value from the four numbers themselves, so that similar inputs give similar outputs. Then experience anywhere improves the guesses everywhere nearby, and no slots are needed at all. That function is a **neural network**, and it's what Chapter 4 builds, from a single straight line up to PyTorch and Keras. Chapter 6 then comes back to CartPole with the four numbers going straight in.

### What you've learned in this chapter

- CartPole's four numbers, its physics (you wrote it, and it matches Gymnasium's exactly), and how to draw and play it;
- baselines, and that one line (`θ + θ̇ > 0`) nearly solves it;
- turning continuous numbers into a table row: edges, slots and a mixed-radix row number;
- Chapter 1's agent, unchanged, learning CartPole through a wrapper, with ε and α schedules;
- judging honestly: greedy, on new starts, many seeds, mean ± standard error, and asking *why* an agent fails;
- where tables break: more rows learn more slowly, and rows can't generalise.

That's the first school problem, done properly. The next chapter is the second: QMaze.
