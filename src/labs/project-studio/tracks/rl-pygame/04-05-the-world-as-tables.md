---
title: 4.5 — The World as Tables: a Markov Decision Process
track: Reinforcement Learning in pygame
runtime: python
run: mdp_view.py
---

`grid.py` describes the world as a **procedure**: call `step`, and it works out what happens. That's how an agent experiences the world, one step at a time. But the same rules can be written down all at once, as **tables**: for every state and every action, the probability of landing in each next state, and the reward for getting there. Written that way, the world is called a **Markov decision process**, or MDP. It's the standard mathematical description of a reinforcement learning problem, and the one every textbook and paper uses.

Why bother, when `step` works? Because with the tables in hand you can **compute** the best behaviour, without trial and error. Chapter 5 does exactly that. The tables are also the cleanest way to say precisely what the world is, which is useful when you read the literature, and when you check an environment for bugs.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_mdp.py** above.

```python file=tests/test_mdp.py provided
# Tests for mdp.py and mdp_view.py (lesson 4.5). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_mdp.py
import numpy as np
import pygame
from pytest import approx

from grid import MAPS, GridWorld


def test_outcomes_without_slip_are_certain():
    from mdp import action_outcomes
    assert action_outcomes(GridWorld(MAPS["open"]), 2).tolist() == [0.0, 0.0, 1.0, 0.0]


def test_outcomes_with_slip_use_the_slip_distribution():
    from mdp import action_outcomes
    assert action_outcomes(GridWorld(MAPS["open"], slip=0.2), 3).tolist() == approx([0.1, 0.1, 0.0, 0.8])


def test_tables_have_one_entry_per_state_action_and_next_state():
    from mdp import tables
    env = GridWorld(MAPS["walls"])
    P, R, terminal = tables(env)
    assert P.shape == R.shape == (25, 4, 25)
    assert terminal.shape == (25,) and terminal.dtype == bool


def test_tables_every_row_of_probabilities_adds_to_one():
    from mdp import tables
    P, _, _ = tables(GridWorld(MAPS["walls"], slip=0.3))
    assert np.allclose(P.sum(axis=2), 1.0)


def test_tables_without_slip_each_move_has_one_outcome():
    from mdp import tables
    env = GridWorld(MAPS["walls"])
    P, R, _ = tables(env)
    s = env.state_of((4, 3))
    assert P[s, 3, env.state_of((4, 4))] == 1.0, "right from (4, 3) reaches the goal"
    assert R[s, 3, env.state_of((4, 4))] == 1.0
    assert P[env.state_of((0, 2)), 3, env.state_of((0, 2))] == 1.0, "a wall to the right: stay put"


def test_tables_slips_that_land_on_the_same_cell_add_up():
    from mdp import tables
    env = GridWorld(MAPS["open"], slip=0.2)
    P, _, _ = tables(env)
    corner = env.state_of((0, 0))
    assert P[corner, 0, corner] == approx(0.9), "up hits the edge (0.8), and so does a slide left (0.1)"
    assert P[corner, 0, env.state_of((0, 1))] == approx(0.1), "a slide right"


def test_tables_ending_tiles_and_walls_are_terminal_and_absorbing():
    from mdp import tables
    env = GridWorld(MAPS["walls"])
    P, R, terminal = tables(env)
    for cell in [(4, 4), (3, 3), (0, 3)]:
        s = env.state_of(cell)
        assert terminal[s]
        assert (P[s, :, s] == 1.0).all() and (R[s] == 0).all()
    assert terminal.sum() == 2 + 6, "goal, hole and six walls"


def test_expected_rewards_weight_each_outcome():
    from mdp import expected_rewards, tables
    env = GridWorld(MAPS["walls"], slip=0.2)
    P, R, _ = tables(env)
    s = env.state_of((2, 3))
    assert expected_rewards(P, R)[s, 3] == approx(0.1 * -1.0), "moving right slides down into the hole 10% of the time"
    assert expected_rewards(P, R).shape == (25, 4)


def test_observed_steps_match_the_table():
    from mdp import observed, tables
    env = GridWorld(MAPS["walls"], slip=0.3)
    P, _, _ = tables(env)
    s = env.state_of((2, 3))
    seen = observed(env, s, 3, 6000)
    assert np.allclose(seen, P[s, 3], atol=0.03), f"table {P[s, 3][P[s, 3] > 0]}, observed {seen[seen > 0]}"


def test_inspect_clicks_become_cells():
    from mdp_view import cell_at
    from world_view import CELL
    env = GridWorld(MAPS["walls"])
    assert cell_at(env, (2 * CELL + 5, 1 * CELL + 5)) == (1, 2)
    assert cell_at(env, (env.cols * CELL + 20, 10)) is None, "a click on the side panel is not a cell"


def test_inspect_window_opens_and_closes():
    from mdp_view import run
    assert run(max_frames=2) == 2
```

`test_observed_steps_match_the_table` is the most important test in the file. It builds the tables from the rules, then separately takes 6000 real steps with `env.step`, and demands that both say the same thing. Two independent descriptions of one world that agree are strong evidence both are right.

```check
file tests/test_mdp.py -- Click "Create provided tests/test_mdp.py" above.
```

## What can one action do?

Without slip, an action has exactly one outcome. With slip, it has up to three, each with a probability. Create `mdp.py`:

```python file=mdp.py
import numpy as np

from chance import slip_distribution


def action_outcomes(env, action):
    if env.slip > 0:
        return slip_distribution(action, env.slip)
    probs = np.zeros(env.n_actions)
    probs[action] = 1.0
    return probs
```

`action_outcomes` returns a probability for each action that might *really* happen when you choose `action`: lesson 2.1's `slip_distribution` on ice, or a certain outcome (a 1 in one place, 0 elsewhere) without it. This is the same randomness `GridWorld.step` uses, written out instead of sampled.

```check
run ".venv/Scripts/python -m pytest -q tests/test_mdp.py -k outcomes" label="action_outcomes gives each real action's probability" -- Without slip: zeros with a 1.0 at the chosen action. With slip: slip_distribution(action, env.slip).
```

## The whole world as tables

```python file=mdp.py
import numpy as np

from chance import slip_distribution
from grid import ENDS


def action_outcomes(env, action):
    if env.slip > 0:
        return slip_distribution(action, env.slip)
    probs = np.zeros(env.n_actions)
    probs[action] = 1.0
    return probs


def tables(env):
    n, m = env.n_states, env.n_actions
    P = np.zeros((n, m, n))
    R = np.zeros((n, m, n))
    terminal = np.zeros(n, dtype=bool)
    for state in range(n):
        cell = env.cell_of(state)
        if env.tile(cell) in ENDS + "#":
            terminal[state] = True
            P[state, :, state] = 1.0
            continue
        for action in range(m):
            for actual, p in enumerate(action_outcomes(env, action)):
                if p == 0:
                    continue
                arrival = env.next_cell(cell, actual)
                next_state = env.state_of(arrival)
                P[state, action, next_state] += p
                R[state, action, next_state] = env.rewards.get(env.tile(arrival), env.step_reward)
    return P, R, terminal
```

The three tables:

- **`P[s, a, s2]`**: the probability that taking action `a` in state `s` lands in state `s2`. It's three-dimensional, shape `(states, actions, states)`: for the 5 × 5 map, 25 × 4 × 25 = 2500 numbers. For each `(s, a)`, the row `P[s, a]` is a probability distribution over next states, so it adds up to 1.
- **`R[s, a, s2]`**: the reward for that particular move, which here depends only on the tile arrived on.
- **`terminal[s]`**: whether `s` is a state where nothing more happens.

How `tables` fills them in, for each state and each action:

1. Ask `action_outcomes` which actions might really happen, and how likely each is.
2. For each one, ask `next_cell`, the physics from lesson 4.1, where it leads.
3. Add its probability to `P[s, a, that state]`.

**Why `+=` and not `=`.** Two different real actions can land in the same cell. In the top-left corner, aiming up: up hits the edge and stays (0.8), a slide left also hits the edge and stays (0.1), and a slide right moves (0.1). So staying put has probability 0.8 + 0.1 = 0.9. With `=`, the second would overwrite the first, and the row would add up to 0.2.

```predict
question: On the `open` map with slip 0.2, what's the probability that "up" from the top-left corner leaves you exactly where you were?
answer: 0.9
tolerance: 0.001
explain: Up hits the top edge (0.8). A slide left hits the left edge (0.1). Both stay put, so 0.8 + 0.1 = 0.9. Only a slide right (0.1) moves you. Corners and walls turn many different actions into "stay".
verify: .venv/Scripts/python -c "from grid import GridWorld, MAPS; from mdp import tables; env = GridWorld(MAPS['open'], slip=0.2); P, _, _ = tables(env); print(round(P[0, 0, 0], 3))"
```

**Ending tiles and walls.** The goal and the hole end the episode. In the tables, such a state is **absorbing**: every action leads back to itself (`P[s, :, s] = 1`) with reward 0. Nothing more can be gained or lost there, which is what "the episode has ended" means mathematically. Writing endings this way means the equations in Chapter 5 need no special cases. Walls are never entered, so their rows are never used. They're marked terminal too, just so they have a valid, harmless row.

**The Markov property.** Look at the shape of `P`: the next state depends on the current state and the action, **and on nothing else**. Not on how you got here, nor on what you did two steps ago. That assumption is called the **Markov property**, and it's the "M" in MDP. It's what makes a single table of values per state meaningful: if the past mattered, two visits to the same cell could have different futures, and one number per state couldn't describe both.

```predict
question: Suppose the ice were "sticky": after a slide, the next move slides twice as often. Can this world still be written as tables P[s, a, s2] over the 25 cells?
choice: Yes: just put the higher slip into P
choice: No: the chance of sliding would depend on the previous step, which the cell alone doesn't tell you
answer: No: the chance of sliding would depend on the previous step, which the cell alone doesn't tell you
explain: With sticky ice, two visits to the same cell can have different futures, depending on whether you just slid. The cell number alone isn't Markov. The standard fix is to put what matters into the **state**: "cell (2, 3), just slid" and "cell (2, 3), didn't slide" become two different states, 50 in all, and the tables work again. Choosing a state that contains everything the future depends on is a big part of designing any reinforcement learning problem.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_mdp.py -k tables" label="tables writes the world as P, R and terminal" -- Use += when adding probabilities: different real actions can land on the same cell. Ending tiles and walls are terminal, with P[s, :, s] = 1.
```

## Two descriptions that must agree

```python file=mdp.py
import numpy as np

from chance import slip_distribution
from grid import ENDS


def action_outcomes(env, action):
    if env.slip > 0:
        return slip_distribution(action, env.slip)
    probs = np.zeros(env.n_actions)
    probs[action] = 1.0
    return probs


def tables(env):
    n, m = env.n_states, env.n_actions
    P = np.zeros((n, m, n))
    R = np.zeros((n, m, n))
    terminal = np.zeros(n, dtype=bool)
    for state in range(n):
        cell = env.cell_of(state)
        if env.tile(cell) in ENDS + "#":
            terminal[state] = True
            P[state, :, state] = 1.0
            continue
        for action in range(m):
            for actual, p in enumerate(action_outcomes(env, action)):
                if p == 0:
                    continue
                arrival = env.next_cell(cell, actual)
                next_state = env.state_of(arrival)
                P[state, action, next_state] += p
                R[state, action, next_state] = env.rewards.get(env.tile(arrival), env.step_reward)
    return P, R, terminal


def expected_rewards(P, R):
    return (P * R).sum(axis=2)


def observed(env, state, action, tries, seed=0):
    env.reset(seed=seed)
    counts = np.zeros(env.n_states)
    for _ in range(tries):
        env.cell = env.cell_of(state)
        env.steps = 0
        next_state, *_ = env.step(action)
        counts[next_state] += 1
    return counts / tries
```

- **`expected_rewards(P, R)`** is lesson 2.2's expected value, for every state and action at once. `P * R` multiplies the two tables element by element: each outcome's probability times its reward. `.sum(axis=2)` adds over the next states, the last axis, leaving one number per `(s, a)`. From cell (2, 3) on the `walls` map with slip 0.2, moving right slides down into the hole 10% of the time, so its expected reward is 0.1 × (−1) = −0.1.
- **`observed(env, state, action, tries)`** measures the same distribution the hard way. It puts the agent in the state, takes one real step, and records where it landed, thousands of times, then turns the counts into shares (lesson 2.1).

The test compares the two. If `step` and `tables` ever disagree, by more than random error, one of them has a bug. This is a general technique: **check a fast or clever description against a slow, obvious one** (you met it with `next_states` in lesson 1.2). Here, "obvious" is simply running the environment.

```predict
question: On the `walls` map with slip 0.2, what is the expected reward of moving right from cell (2, 3)?
answer: -0.1
tolerance: 0.001
explain: Right goes to (2, 4), reward 0, 80% of the time. A slide up hits the wall at (1, 3) and stays, reward 0, 10%. A slide down lands in the hole at (3, 3), reward −1, 10%. Expected: 0.8 × 0 + 0.1 × 0 + 0.1 × (−1) = −0.1. That −0.1 is what makes a planner steer away from this move, and it's only visible when the randomness is written down.
verify: .venv/Scripts/python -c "from grid import GridWorld, MAPS; from mdp import tables, expected_rewards; env = GridWorld(MAPS['walls'], slip=0.2); P, R, _ = tables(env); print(round(expected_rewards(P, R)[env.state_of((2, 3)), 3], 3))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_mdp.py -k \"expected or observed\"" label="expected_rewards and observed agree with the tables" -- expected_rewards: multiply P and R element by element, then sum over the next state (axis=2).
```

## See where an action can lead

`mdp_view.py` shows one row of `P` on the map. Click a cell, choose an action with the arrow keys, and every cell it might land in is outlined, with its probability:

```python file=mdp_view.py
import sys

import pygame

from grid import MAPS, GridWorld
from mdp import expected_rewards, tables
from returns import ARROWS
from world_view import BACKGROUND, CELL, cell_rect, draw_panel, draw_world, window_size

HIGHLIGHT = (94, 234, 212)
CHANCE = (192, 132, 252)
KEY_ACTIONS = {pygame.K_UP: 0, pygame.K_DOWN: 1, pygame.K_LEFT: 2, pygame.K_RIGHT: 3}


def cell_at(env, pos):
    row, col = pos[1] // CELL, pos[0] // CELL
    if 0 <= row < env.rows and 0 <= col < env.cols:
        return (row, col)
    return None


def draw(screen, font, env, P, R, chosen, action):
    screen.fill(BACKGROUND)
    draw_world(screen, env)
    state = env.state_of(chosen)
    for next_state, p in enumerate(P[state, action]):
        if p > 0:
            rect = cell_rect(env.cell_of(next_state))
            pygame.draw.rect(screen, CHANCE, rect, 4)
            screen.blit(font.render(f"{p:.0%}", True, CHANCE), (rect.x + 6, rect.y + 6))
    pygame.draw.rect(screen, HIGHLIGHT, cell_rect(chosen), 3)
    lines = [f"from cell {chosen}, action {ARROWS[action]}",
             f"expected reward {expected_rewards(P, R)[state, action]:+.2f}",
             f"slip {env.slip}", "",
             "click a cell", "arrow keys choose the action"]
    draw_panel(screen, font, env, lines)


def run(name="walls", slip=0.2, max_frames=None):
    env = GridWorld(MAPS[name], slip=slip)
    env.reset(seed=0)
    P, R, _ = tables(env)
    pygame.init()
    screen = pygame.display.set_mode(window_size(env))
    pygame.display.set_caption(f"Where can this action lead? ({name}, slip {slip})")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    chosen, action = env.start, 3
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                cell = cell_at(env, event.pos)
                if cell is not None:
                    chosen = cell
            elif event.type == pygame.KEYDOWN and event.key in KEY_ACTIONS:
                action = KEY_ACTIONS[event.key]
        draw(screen, font, env, P, R, chosen, action)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "walls", float(sys.argv[2]) if len(sys.argv) > 2 else 0.2)
```

**Mouse input**, a new mechanic:

- A click produces a `pygame.MOUSEBUTTONDOWN` event, and `event.pos` is the `(x, y)` pixel where it happened, measured from the window's top-left corner, like everything on screen.
- `cell_at` turns the pixel back into a cell: the row is `y // CELL` and the column is `x // CELL`. It's `cell_rect`'s arithmetic run backwards: integer division throws away the position *within* the cell. A click at x = 150 with 72-pixel cells is in column 150 // 72 = 2.
- A click on the side panel is outside the grid, so `cell_at` returns `None`, and the loop ignores it.

`f"{p:.0%}"` formats 0.1 as `10%`: the `%` format multiplies by 100 and adds the sign.

Run it (slip 0.2 by default). Click around the hole, and the corners. Try `.venv\Scripts\python mdp_view.py walls 0.5`, and see how many cells a single action can reach.

The world is now fully described: states, actions, transition probabilities, rewards, endings. Chapter 5 takes these tables and computes, exactly, how good every state is and what the best action is in each.

```check
run ".venv/Scripts/python -m pytest -q tests/test_mdp.py" label="all lesson 4.5 tests pass" -- cell_at: row = y // CELL and col = x // CELL, and None when that's outside the grid.
```
