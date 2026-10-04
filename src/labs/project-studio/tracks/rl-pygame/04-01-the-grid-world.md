---
title: 4.1 — The Grid World as an Environment
track: Reinforcement Learning in pygame
runtime: python
run: world_view.py
---

Bandits had actions and rewards but no **states**: the room was the same after every pull. Now the world has a layout, and where you are decides what your actions do. A move that's safe in one cell walks you into a hole in another. This is the full reinforcement learning problem: an **agent** in an **environment**, repeating a loop:

```text
the agent sees a state  →  chooses an action  →  the environment moves to a new state
                                                    and hands back a reward
```

In this lesson you build the environment, a grid world with walls, holes and a goal, as a class with exactly the interface that **Gymnasium**, the standard library of reinforcement learning environments, uses: `reset()` starts an episode, and `step(action)` returns five things. Getting that contract right now means that in Chapter 8 your agents run on Gymnasium's own environments unchanged, and Gymnasium's documentation will read like something you already know.

Then you'll play it with the arrow keys, as the agent would.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_world.py** above.

```python file=tests/test_world.py provided
# Tests for grid.py and world_view.py (lesson 4.1). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_world.py
import numpy as np
import pygame
import pytest

from grid import MAPS, GridWorld


def test_map_has_its_size_and_start():
    env = GridWorld(MAPS["walls"])
    assert (env.rows, env.cols) == (5, 5)
    assert env.n_states == 25 and env.n_actions == 4
    assert env.start == (0, 0)
    assert env.tile((3, 3)) == "H" and env.tile((4, 4)) == "G" and env.tile((0, 3)) == "#"


def test_map_find_reports_the_first_matching_tile():
    env = GridWorld(["..S", "G.."])
    assert env.find("S") == (0, 2)
    assert env.find("G") == (1, 0)


def test_map_rows_must_match():
    with pytest.raises(ValueError):
        GridWorld(["S..", "..G."])


def test_map_needs_a_start():
    with pytest.raises(ValueError):
        GridWorld(["...", "..G"])


def test_move_states_number_cells_along_rows():
    env = GridWorld(["S..", "...", "..G"])
    assert env.state_of((1, 2)) == 5
    assert env.cell_of(5) == (1, 2)
    for state in range(env.n_states):
        assert env.state_of(env.cell_of(state)) == state


def test_move_one_cell():
    env = GridWorld(MAPS["open"])
    assert env.next_cell((2, 2), 3) == (2, 3)
    assert env.next_cell((2, 2), 0) == (1, 2)


def test_move_edges_and_walls_keep_you_in_place():
    env = GridWorld(MAPS["walls"])
    assert env.next_cell((0, 0), 0) == (0, 0), "the top edge"
    assert env.next_cell((0, 2), 3) == (0, 2), "(0, 3) is a wall"
    assert env.next_cell((2, 0), 3) == (2, 0), "(2, 1) is a wall"
    assert env.next_cell((2, 2), 3) == (2, 3)


def test_step_reset_returns_the_start_state_and_empty_info():
    env = GridWorld(MAPS["walls"])
    env.cell, env.steps = (3, 4), 7
    state, info = env.reset()
    assert state == 0 and info == {}
    assert env.cell == (0, 0) and env.steps == 0


def test_step_returns_the_five_part_result():
    env = GridWorld(MAPS["open"])
    env.reset()
    state, reward, terminated, truncated, info = env.step(3)
    assert state == 1 and reward == 0.0
    assert terminated is False and truncated is False
    assert info == {"slid": False}


def test_step_goal_ends_the_episode_with_reward_one():
    env = GridWorld(MAPS["open"])
    env.reset()
    env.cell = (4, 3)
    state, reward, terminated, truncated, _ = env.step(3)
    assert (state, reward, terminated, truncated) == (24, 1.0, True, False)


def test_step_hole_ends_the_episode_with_reward_minus_one():
    env = GridWorld(MAPS["walls"])
    env.reset()
    env.cell = (2, 3)
    _, reward, terminated, _, _ = env.step(1)
    assert reward == -1.0 and terminated is True


def test_step_time_runs_out_after_max_steps():
    env = GridWorld(MAPS["open"], max_steps=3)
    env.reset()
    results = [env.step(0)[3] for _ in range(3)]
    assert results == [False, False, True], "truncated on the 3rd step, not before"


def test_step_never_both_terminated_and_truncated():
    env = GridWorld(MAPS["open"], max_steps=1)
    env.reset()
    env.cell = (4, 3)
    _, _, terminated, truncated, _ = env.step(3)
    assert terminated is True and truncated is False, "reaching the goal on the last step is an ending, not a time-out"


def test_step_step_reward_and_custom_rewards():
    env = GridWorld(["S.G"], step_reward=-0.1, rewards={"G": 5.0})
    env.reset()
    assert env.step(3)[1] == -0.1
    assert env.step(3)[1] == 5.0


def test_step_slip_with_the_same_seed_repeats_exactly():
    a, b = GridWorld(MAPS["open"], slip=0.5), GridWorld(MAPS["open"], slip=0.5)
    a.reset(seed=3)
    b.reset(seed=3)
    assert [a.step(3)[0] for _ in range(20)] == [b.step(3)[0] for _ in range(20)]


def test_step_slip_slides_sideways_about_slip_of_the_time():
    env = GridWorld(MAPS["open"], slip=0.3)
    env.reset(seed=0)
    slid = []
    for _ in range(4000):
        env.cell = (2, 2)
        state, _, _, _, info = env.step(3)
        slid.append(info["slid"])
        assert state in (env.state_of((2, 3)), env.state_of((1, 2)), env.state_of((3, 2)))
    assert abs(np.mean(slid) - 0.3) < 0.03


def test_view_cells_become_screen_rectangles():
    import world_view
    rect = world_view.cell_rect((1, 2))
    assert (rect.x, rect.y) == (2 * world_view.CELL, 1 * world_view.CELL)


def test_view_draws_tiles_and_the_player():
    import world_view
    env = GridWorld(MAPS["walls"])
    env.reset()
    screen = pygame.Surface(world_view.window_size(env))
    world_view.draw_world(screen, env)
    goal = world_view.cell_rect((4, 4))
    assert screen.get_at((goal.x + 5, goal.y + 5))[:3] == world_view.TILES["G"]
    assert screen.get_at(world_view.cell_rect((0, 0)).center)[:3] == world_view.PLAYER


def test_view_ending_messages():
    import world_view
    assert world_view.ending("G", False) == "reached the goal"
    assert world_view.ending("H", False) == "fell in a hole"
    assert world_view.ending(".", True) == "out of time"


def test_view_window_opens_and_closes():
    import world_view
    assert world_view.play(max_frames=2) == 2
```

The `step` tests say a lot about the contract. Read `test_step_never_both_terminated_and_truncated` in particular: reaching the goal on the very last allowed step counts as *reaching the goal*, not as running out of time. The step "The episode contract" explains why that difference matters to a learning agent.

`pytest.raises(ValueError)` is a **context manager**, used with `with`: the test passes only if the code inside the `with` block raises that exception. It's how you test that bad input is rejected.

```check
file tests/test_world.py -- Click "Create provided tests/test_world.py" above.
```

## The map

A map is a list of strings, one per row, one character per cell, which is easy to read and easy to edit:

```text
S..#.      S  start        .  floor
.#.#.      #  wall         H  hole: the episode ends, reward −1
.#...      G  goal: the episode ends, reward +1
.##H.
....G
```

Create `grid.py`:

```python file=grid.py
import numpy as np

from qtable import ACTIONS

# What arriving on a tile pays. Every other tile pays the step reward.
REWARDS = {"G": 1.0, "H": -1.0}
ENDS = "GH"          # tiles that end an episode

MAPS = {
    "open": ["S....",
             ".....",
             ".....",
             ".....",
             "....G"],
    "walls": ["S..#.",
              ".#.#.",
              ".#...",
              ".##H.",
              "....G"],
    "lake": ["S...",
             ".H.H",
             "...H",
             "H..G"],
}


class GridWorld:
    def __init__(self, layout, slip=0.0, max_steps=100, step_reward=0.0, rewards=None):
        if len({len(row) for row in layout}) != 1:
            raise ValueError("every row of the map must be the same length")
        self.layout = list(layout)
        self.rows, self.cols = len(layout), len(layout[0])
        self.slip = slip
        self.max_steps = max_steps
        self.step_reward = step_reward
        self.rewards = REWARDS if rewards is None else rewards
        self.start = self.find("S")
        self.rng = np.random.default_rng()
        self.cell = self.start
        self.steps = 0

    @property
    def n_states(self):
        return self.rows * self.cols

    @property
    def n_actions(self):
        return len(ACTIONS)

    def find(self, tile):
        for row, line in enumerate(self.layout):
            col = line.find(tile)
            if col >= 0:
                return (row, col)
        raise ValueError(f"the map has no {tile!r} tile")

    def tile(self, cell):
        return self.layout[cell[0]][cell[1]]
```

How it works:

- **`self.layout[row][col]`** reads one character: the list gives the row (a string), and the string gives the character. `tile(cell)` wraps that, so the rest of the code says what it means.
- **Checking the map.** `{len(row) for row in layout}` is a **set comprehension**: the set of all row lengths. A set keeps only distinct values, so if every row is equally long, the set has exactly one element. Anything else means a ragged map, and `raise ValueError(...)` stops right there with a message, instead of letting a typo cause a strange bug many steps later. Failing early and loudly is a habit worth having.
- **`find`** searches each row with `str.find`, which returns the position of the first match or −1 if there's none. `{tile!r}` in the message uses `repr`, so the tile appears with quotes, `'S'`. A missing start raises an error too.
- **`REWARDS` and `ENDS`** describe the rules as data: arriving on `G` pays +1 and arriving on `H` pays −1, and both end the episode. Any other tile pays `step_reward`, which is 0 by default. `rewards=None` lets a map use its own rewards, and `REWARDS if rewards is None else rewards` falls back to the standard ones.
- **`self.rng = np.random.default_rng()`** with no seed asks the operating system for fresh random bits, so every run differs, until someone asks for a seed (next steps).
- **`MAPS`** keeps a few named layouts. `"lake"` is the same layout as Gymnasium's 4 × 4 FrozenLake, which you'll meet in Chapter 8.

```check
run ".venv/Scripts/python -m pytest -q tests/test_world.py -k map" label="GridWorld reads and checks its map" -- Raise ValueError when the rows differ in length (a set of the row lengths should have one element) or when there's no S.
```

## Moving around

Add state numbers and movement:

```python file=grid.py
import numpy as np

from qtable import ACTIONS

# What arriving on a tile pays. Every other tile pays the step reward.
REWARDS = {"G": 1.0, "H": -1.0}
ENDS = "GH"          # tiles that end an episode

MAPS = {
    "open": ["S....",
             ".....",
             ".....",
             ".....",
             "....G"],
    "walls": ["S..#.",
              ".#.#.",
              ".#...",
              ".##H.",
              "....G"],
    "lake": ["S...",
             ".H.H",
             "...H",
             "H..G"],
}


class GridWorld:
    def __init__(self, layout, slip=0.0, max_steps=100, step_reward=0.0, rewards=None):
        if len({len(row) for row in layout}) != 1:
            raise ValueError("every row of the map must be the same length")
        self.layout = list(layout)
        self.rows, self.cols = len(layout), len(layout[0])
        self.slip = slip
        self.max_steps = max_steps
        self.step_reward = step_reward
        self.rewards = REWARDS if rewards is None else rewards
        self.start = self.find("S")
        self.rng = np.random.default_rng()
        self.cell = self.start
        self.steps = 0

    @property
    def n_states(self):
        return self.rows * self.cols

    @property
    def n_actions(self):
        return len(ACTIONS)

    def find(self, tile):
        for row, line in enumerate(self.layout):
            col = line.find(tile)
            if col >= 0:
                return (row, col)
        raise ValueError(f"the map has no {tile!r} tile")

    def tile(self, cell):
        return self.layout[cell[0]][cell[1]]

    def state_of(self, cell):
        return cell[0] * self.cols + cell[1]

    def cell_of(self, state):
        return divmod(state, self.cols)

    def next_cell(self, cell, action):
        row = cell[0] + ACTIONS[action][0]
        col = cell[1] + ACTIONS[action][1]
        if not (0 <= row < self.rows and 0 <= col < self.cols):
            return cell
        if self.tile((row, col)) == "#":
            return cell
        return (row, col)
```

- `state_of` and `cell_of` are lesson 1.1's numbering, now methods, since the number of columns belongs to the map.
- **`next_cell(cell, action)`** is the world's **physics**: where an action leads from a cell, with no randomness. It works out the cell one step away, then keeps you where you are if that's off the grid or a wall. Bumping into a wall is like bumping into an edge: you stay put, and it still costs a step.

Why a separate function for this? A slippery floor changes *which* action really happens, not *where* an action leads. Keeping "where does this lead" in its own function means the slip can be added in one place (next step), and in lesson 4.5 you'll call `next_cell` directly to write down the world's complete rules as tables.

```check
run ".venv/Scripts/python -m pytest -q tests/test_world.py -k move" label="state numbers and next_cell work" -- next_cell: compute the neighbouring cell, then return the original cell if the neighbour is off the grid or a "#".
```

## The episode contract: reset and step

Now the two methods every environment has:

```python file=grid.py
import numpy as np

from chance import sample, slip_distribution
from qtable import ACTIONS

# What arriving on a tile pays. Every other tile pays the step reward.
REWARDS = {"G": 1.0, "H": -1.0}
ENDS = "GH"          # tiles that end an episode

MAPS = {
    "open": ["S....",
             ".....",
             ".....",
             ".....",
             "....G"],
    "walls": ["S..#.",
              ".#.#.",
              ".#...",
              ".##H.",
              "....G"],
    "lake": ["S...",
             ".H.H",
             "...H",
             "H..G"],
}


class GridWorld:
    def __init__(self, layout, slip=0.0, max_steps=100, step_reward=0.0, rewards=None):
        if len({len(row) for row in layout}) != 1:
            raise ValueError("every row of the map must be the same length")
        self.layout = list(layout)
        self.rows, self.cols = len(layout), len(layout[0])
        self.slip = slip
        self.max_steps = max_steps
        self.step_reward = step_reward
        self.rewards = REWARDS if rewards is None else rewards
        self.start = self.find("S")
        self.rng = np.random.default_rng()
        self.cell = self.start
        self.steps = 0

    @property
    def n_states(self):
        return self.rows * self.cols

    @property
    def n_actions(self):
        return len(ACTIONS)

    def find(self, tile):
        for row, line in enumerate(self.layout):
            col = line.find(tile)
            if col >= 0:
                return (row, col)
        raise ValueError(f"the map has no {tile!r} tile")

    def tile(self, cell):
        return self.layout[cell[0]][cell[1]]

    def state_of(self, cell):
        return cell[0] * self.cols + cell[1]

    def cell_of(self, state):
        return divmod(state, self.cols)

    def next_cell(self, cell, action):
        row = cell[0] + ACTIONS[action][0]
        col = cell[1] + ACTIONS[action][1]
        if not (0 <= row < self.rows and 0 <= col < self.cols):
            return cell
        if self.tile((row, col)) == "#":
            return cell
        return (row, col)

    def reset(self, seed=None):
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        self.cell = self.start
        self.steps = 0
        return self.state_of(self.cell), {}

    def step(self, action):
        actual = action
        if self.slip > 0:
            actual = sample(slip_distribution(action, self.slip), self.rng)
        self.cell = self.next_cell(self.cell, actual)
        self.steps += 1
        tile = self.tile(self.cell)
        reward = self.rewards.get(tile, self.step_reward)
        terminated = tile in ENDS
        truncated = not terminated and self.steps >= self.max_steps
        return self.state_of(self.cell), reward, terminated, truncated, {"slid": actual != action}
```

**`reset(seed=None)`** starts a new **episode**, one attempt from the start until it ends. It puts the agent back on `S`, zeroes the step counter, and returns `(state, info)`: the starting state and a dictionary of extra information, empty here. If you pass a seed, it also makes a new generator from it, so everything random from then on is reproducible. Gymnasium does exactly the same: you seed an environment when you reset it.

**`step(action)`** moves the world forward by one action and returns five things, in this order:

| returned | meaning | here |
|---|---|---|
| `state` | what the agent observes next | the new cell's state number |
| `reward` | the number the agent is trying to collect | +1 on G, −1 on H, otherwise `step_reward` |
| `terminated` | the episode ended **because of the task itself** | arrived on G or H |
| `truncated` | the episode was cut off **for an outside reason** | `max_steps` used up, without terminating |
| `info` | extra information for people, not for learning | did the agent slide? |

How a step happens:

1. **Slip.** If the floor is slippery, `sample(slip_distribution(action, self.slip), self.rng)` from lesson 2.1 decides which action *really* happens. Otherwise it's the chosen one.
2. **Move.** `next_cell` applies the physics to the action that really happened.
3. **Count.** `self.steps += 1`.
4. **Reward and ending.** Both depend on the tile just arrived on: `self.rewards.get(tile, self.step_reward)` looks the tile up, and uses the step reward for any tile not in the dictionary.

**Why `terminated` and `truncated` are kept apart.** Both stop the episode, but they mean different things, and a learning agent must treat them differently:

- **terminated**: the agent reached a state where the future really is over. Falling in the hole means there's nothing more to collect, and the value of what comes next is exactly 0.
- **truncated**: the experiment ran out of time. The agent was standing on an ordinary floor tile, from which more reward was still possible. We just stopped watching.

If an agent treated a time-out as an ending, it would learn that the cells where time happened to run out are worthless, which is wrong and spoils its estimates. Chapter 7 handles this in Q-learning's update rule, and Chapter 8 shows how Gymnasium reports it. That's why `truncated = not terminated and ...`: reaching the goal on the last allowed step is an ending, not a time-out.

```check
run ".venv/Scripts/python -m pytest -q tests/test_world.py -k step" label="reset and step follow the episode contract" -- terminated is "arrived on a tile in ENDS"; truncated is "not terminated, and steps has reached max_steps".
```

## Play it

`world_view.py` draws the world and lets you be the agent:

```python file=world_view.py
import sys

import pygame

from grid import MAPS, GridWorld

CELL = 72
PANEL = 250
TILES = {".": (30, 41, 59), "S": (30, 41, 59), "#": (100, 116, 139), "H": (8, 12, 20), "G": (250, 204, 21)}
LINE = (51, 65, 85)
PLAYER = (94, 234, 212)
BACKGROUND = (24, 26, 33)
TEXT = (226, 232, 240)
HINT = (148, 163, 184)
KEY_ACTIONS = {pygame.K_UP: 0, pygame.K_DOWN: 1, pygame.K_LEFT: 2, pygame.K_RIGHT: 3}


def window_size(env):
    return (env.cols * CELL + PANEL, max(env.rows * CELL, 320))


def cell_rect(cell):
    return pygame.Rect(cell[1] * CELL, cell[0] * CELL, CELL, CELL)


def draw_world(screen, env):
    for row in range(env.rows):
        for col in range(env.cols):
            rect = cell_rect((row, col))
            pygame.draw.rect(screen, TILES.get(env.tile((row, col)), TILES["."]), rect)
            pygame.draw.rect(screen, LINE, rect, 1)
    pygame.draw.circle(screen, PLAYER, cell_rect(env.cell).center, CELL // 3)


def draw_panel(screen, font, env, lines):
    left = env.cols * CELL + 16
    for row, text in enumerate(lines):
        screen.blit(font.render(text, True, TEXT if text else HINT), (left, 16 + row * 24))


def ending(tile, truncated):
    if truncated:
        return "out of time"
    return {"G": "reached the goal", "H": "fell in a hole"}.get(tile)


def play(name="walls", slip=0.0, max_steps=50, max_frames=None, seed=0):
    env = GridWorld(MAPS[name], slip=slip, max_steps=max_steps)
    state, _ = env.reset(seed=seed)
    pygame.init()
    screen = pygame.display.set_mode(window_size(env))
    pygame.display.set_caption(f"Grid world: {name}")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    total, last, message = 0.0, None, None
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key in KEY_ACTIONS and message is None:
                state, last, terminated, truncated, info = env.step(KEY_ACTIONS[event.key])
                total += last
                if terminated or truncated:
                    message = ending(env.tile(env.cell), truncated)
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                state, _ = env.reset()
                total, last, message = 0.0, None, None
        screen.fill(BACKGROUND)
        draw_world(screen, env)
        lines = [f"state {state}", f"step {env.steps} of {env.max_steps}",
                 f"last reward {last}", f"total reward {total:+.1f}", "",
                 message or "", "arrows move   R reset"]
        draw_panel(screen, font, env, lines)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    play(sys.argv[1] if len(sys.argv) > 1 else "walls", slip=float(sys.argv[2]) if len(sys.argv) > 2 else 0.0)
```

How it works:

- **`TILES`** maps each map character to a colour, and `TILES.get(tile, TILES["."])` falls back to floor for anything unknown. The player is a circle at the centre of its cell's rectangle: `rect.center` is a `(x, y)` pair worked out by `pygame.Rect`.
- **`window_size`** sizes the window to the map, plus a panel on the right for text. `max(..., 320)` keeps very short maps tall enough for the text.
- **Once an episode ends, arrow keys are ignored** (`and message is None`) until you press R. The environment would accept more steps, but they'd be meaningless: an episode that has ended is over. Real environments behave the same way, and Gymnasium warns if you call `step` after an episode has ended.
- **`ending`** turns the end of an episode into words, from the tile you stopped on and whether time ran out. A dictionary's `.get` returns `None` for any other tile, which shows no message.
- **The command line.** `sys.argv[1]` picks the map, and `sys.argv[2]`, converted with `float`, sets the slip. **Run** uses the defaults: the `walls` map, no slip.

Run it and reach the goal.

```predict
question: On the `walls` map, what is the fewest number of steps from S to G?
answer: 8
explain: Two routes tie at 8: down the left column and along the bottom, or along the top, down the middle and round the hole. Any shortest route needs 4 steps down and 4 right, and here the walls happen not to force a detour. Some maps do. When an agent learns this map with a discount (lesson 4.3), "short" will start to matter.
verify: script shortest_walls.py
```

Now make the floor slippery. In the terminal:

```text
.venv\Scripts\python world_view.py walls 0.3
```

```predict
question: With slip 0.3, play a few episodes. How often do you fall in the hole, and which route feels safer?
explain: Each move slides sideways 30% of the time, 15% to each side. A move is risky when one of its two sideways cells is the hole at (3, 3). Along the **bottom** route only one move is: aiming right from (4, 3), a slide up lands in the hole. (Aiming right from (4, 2), a slide up hits the wall at (3, 2) and does no harm.) The **top** route has two: right from (2, 3) can slide down into it, and down from (3, 4) can slide left into it. So the bottom route is safer, and both are the same length. Weighing risks like this from the rules is exactly what the planning methods of Chapter 5 do for you.
```

You just did by hand what an agent must learn: from each state, pick actions that reach the goal and avoid the holes, under uncertainty. Lesson 4.2 hands the controls to programs instead, and builds the viewer you'll watch them in.

```check
run ".venv/Scripts/python -m pytest -q tests/test_world.py" label="all lesson 4.1 tests pass" -- draw_world must draw every tile in its TILES colour, then the player circle in its cell.
```
