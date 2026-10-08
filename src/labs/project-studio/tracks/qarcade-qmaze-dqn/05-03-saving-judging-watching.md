---
title: 5.3 — Saving, Judging and Watching a Network
runtime: python
run: watch_dqn.py
---

Training the network takes most of a minute, and everything it learned lives in memory until the program ends. Real agents are trained once and used many times, so this lesson saves the trained network to a file, loads it back, judges it with Chapter 3's tools, and draws its policy as arrows, exactly as you did for the table.

Then it asks the question networks were brought in to answer: does this one cope with a maze it hasn't seen?

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_trained.py** above.

```python file=tests/test_trained.py provided
# Tests for trained.py and watch_dqn.py (lesson 5.3).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_trained.py
import numpy as np


def test_saved_file_holds_the_networks_numbers(tmp_path):
    from dqn import DQNAgent
    from trained import save_agent
    path = tmp_path / "net.pt"
    save_agent(DQNAgent(49), path)
    assert path.exists() and path.stat().st_size > 10_000, "5,102 numbers, 4 bytes each"


def test_loaded_agent_gives_the_same_values(tmp_path):
    from dqn import DQNAgent
    from trained import load_agent, save_agent
    path = tmp_path / "net.pt"
    agent = DQNAgent(49, seed=5)
    save_agent(agent, path)
    loaded = load_agent(path)
    obs = np.zeros(49)
    obs[10] = 0.5
    assert np.array_equal(agent.values(obs), loaded.values(obs))


def test_loaded_agent_does_not_explore(tmp_path):
    from dqn import DQNAgent
    from trained import load_agent, save_agent
    path = tmp_path / "net.pt"
    save_agent(DQNAgent(49), path)
    assert load_agent(path).epsilon == 0.0


def test_loaded_agent_is_not_the_same_object(tmp_path):
    from dqn import DQNAgent
    from trained import load_agent, save_agent
    path = tmp_path / "net.pt"
    agent = DQNAgent(49)
    save_agent(agent, path)
    assert load_agent(path).net is not agent.net


def test_arrows_cover_every_free_cell(tmp_path):
    from dqn import DQNAgent
    from qmaze import QMaze
    from seen_maze import SMALL_MAZE
    from watch_dqn import network_arrows
    arrows = network_arrows(DQNAgent(49), SMALL_MAZE)
    assert set(arrows) == set(QMaze(SMALL_MAZE).free_cells) and set(arrows.values()) <= {0, 1, 2, 3}


def test_arrows_window_opens_and_closes(tmp_path):
    from dqn import DQNAgent
    from trained import save_agent
    from watch_dqn import run
    path = tmp_path / "net.pt"
    save_agent(DQNAgent(49), path)
    assert run(max_frames=2, path=path) == 2
```

**`tmp_path`** is new: when a test function has a parameter with this name, pytest creates a fresh, empty folder for that test and passes its path in. Each test can write files there without cluttering your project or interfering with another test, and pytest cleans the folders up afterwards. `tmp_path / "net.pt"` builds a path inside it: `/` joins paths for **`pathlib.Path`** objects, which is what `tmp_path` is.

```check
file tests/test_trained.py -- Click "Create provided tests/test_trained.py" above.
```

## Saving what it learned

Create `trained.py`:

```python file=trained.py
import torch

from dqn import train_dqn
from seen_maze import SMALL_MAZE

PATH = "small_maze_dqn.pt"


def save_agent(agent, path=PATH):
    torch.save(agent.net.state_dict(), path)


if __name__ == "__main__":
    agent, solved_at = train_dqn()
    save_agent(agent)
    print(f"solved at episode {solved_at}; saved to {PATH}")
```

- **`agent.net.state_dict()`** is the network's knowledge as a dictionary: one entry per tensor of knobs (`"0.weight"`, `"0.bias"`, `"1.weight"` for the first PReLU's slope, and so on), named by position in the `Sequential`. It holds numbers only, not the code that uses them.
- **`torch.save(…, path)`** writes it to a file. `.pt` is the usual ending for PyTorch files. 5,102 numbers at 4 bytes each are 20,408 bytes; the file measured 23,983, the rest being the tensors' names, shapes and a little bookkeeping.
- **Saving only the numbers** is deliberate: the file doesn't depend on how `DQNAgent` is written, so you can change the agent's code and still load an old network into it, as long as the layers' shapes match.

Run it once in the terminal, to train and save a network:

```powershell
.venv\Scripts\python trained.py
```

```text
solved at episode 180; saved to small_maze_dqn.pt
```

`small_maze_dqn.pt` appears in the file tree. (Add `*.pt` to `.gitignore` if you'd rather not commit trained networks: they can always be retrained, and big ones are big.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_trained.py -k saved" label="save_agent writes the network's numbers to a file"
file small_maze_dqn.pt -- Run .venv\Scripts\python trained.py once: it trains the network and saves it.
```

## Your turn: loading it back

**Build, on your own:** `load_agent(path=PATH, maze=SMALL_MAZE)` in `trained.py`.

Make a new `DQNAgent` for a maze of this size (`maze.size` inputs) with `epsilon=0.0`, because a loaded agent is for using, not exploring. Then pour the saved numbers into its network: `torch.load(path)` reads the dictionary back, and a network's **`load_state_dict(dictionary)`** copies each tensor in, matched by name. Return the agent.

You'll need `DQNAgent` in the `from dqn import ...` line.

```hints
nudge: Two lines: make an agent with the right size, and load the numbers into its net.
concept: `agent = DQNAgent(maze.size, epsilon=0.0)`, then `agent.net.load_state_dict(torch.load(path))`.
answer: Change the import to `from dqn import DQNAgent, train_dqn`, and add:
~~~python
def load_agent(path=PATH, maze=SMALL_MAZE):
    agent = DQNAgent(maze.size, epsilon=0.0)
    agent.net.load_state_dict(torch.load(path))
    return agent
~~~
The new agent starts with random knobs of its own, and `load_state_dict` overwrites every one. If the shapes didn't match, say a network built for the 10 × 10 maze, it would refuse with an error naming the mismatched tensor.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_trained.py -k loaded" label="load_agent rebuilds an agent with exactly the saved values, not exploring" -- agent = DQNAgent(maze.size, epsilon=0.0); agent.net.load_state_dict(torch.load(path)); return agent.
```

## Watching the network's policy

Create `watch_dqn.py`. It's lesson 3.3's watcher, reading arrows from the loaded network instead of a table:

```python file=watch_dqn.py
import pygame

from dqn import ByCell
from maze_tools import greedy_path
from maze_view import CELL, MARGIN, TEXT, TOP, arrow_points, cell_at, cell_rect, draw_maze, draw_rat
from qmaze import QMaze
from seen_maze import SMALL_MAZE
from trained import load_agent

ARROW = (15, 23, 42)


def network_arrows(agent, maze):
    env = QMaze(maze)
    by_cell = ByCell(agent, maze)
    return {cell: by_cell.act(cell[0] * env.cols + cell[1]) for cell in env.free_cells}


def run(max_frames=None, maze=SMALL_MAZE, path="small_maze_dqn.pt"):
    agent = load_agent(path, maze)
    by_cell = ByCell(agent, maze)
    env = QMaze(maze)
    arrows = network_arrows(agent, maze)
    pygame.init()
    screen = pygame.display.set_mode((2 * MARGIN + env.cols * CELL, TOP + env.rows * CELL + 60))
    pygame.display.set_caption("What the network learned")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    path_cells, reached = greedy_path(by_cell, maze, (0, 0))
    position = 0
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                cell = cell_at(*event.pos, env.rows, env.cols)
                if cell in arrows:
                    path_cells, reached = greedy_path(by_cell, maze, cell)
                    position = 0
        draw_maze(screen, env, set(path_cells[:position + 1]))
        for cell, action in arrows.items():
            pygame.draw.polygon(screen, ARROW, arrow_points(cell_rect(*cell), action))
        draw_rat(screen, path_cells[position])
        if frames % 6 == 0 and position < len(path_cells) - 1:
            position += 1
        steps = len(path_cells) - 1
        result = f"reaches the cheese in {steps} steps" if reached else f"never reaches the cheese ({steps} steps tried)"
        screen.blit(font.render("Click a cell to start there.", True, TEXT), (MARGIN, 16))
        screen.blit(font.render(result, True, TEXT), (MARGIN, TOP + env.rows * CELL + 20))
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

**`network_arrows`** asks the network for its greedy action in every free cell, through `ByCell`, which builds each cell's observation. Everything else is `watch_qmaze.py`. It opens instantly, because nothing is trained: the network is loaded from the file.

Press **Run** and click around the maze. Then judge it properly. Predict first:

```predict
question: From how many of the 33 starts will the network take exactly the shortest route?
answer: 33
tolerance: 0
explain: All 33: no extra moves at all, using lesson 3.3's `extra_steps` against breadth-first search. A table trained on this maze does the same. On a maze this small, both learn the best policy completely.
verify: script network_exact.py
```

```powershell
.venv\Scripts\python -c "from dqn import ByCell; from maze_tools import extra_steps; from seen_maze import SMALL_MAZE; from trained import load_agent; print(extra_steps(ByCell(load_agent(), SMALL_MAZE), SMALL_MAZE))"
```

Now the real test. The network reads the walls, which the table never did. Lesson 3.4 flipped the maze over its diagonal and the table collapsed. Will the network do better?

```predict
question: On the small maze flipped over its diagonal, how will the network do?
choice: Much better than the table: it reads the walls
choice: No better than the table: it learned one maze too
answer: No better than the table: it learned one maze too
explain: The network solves 0 of the 33 flipped starts, and a table trained on the same maze solves 9 (by luck: some arrows happen to work in the flipped maze too). Reading the walls isn't the same as understanding them. This network has only ever seen **one** maze, so nothing in its training told it which of its 49 inputs matter, or how. Any function that fits those observations will do, and the one it found depends on this maze's exact layout. A network generalises to new situations only if its training contained enough **variety** for the general rule to be the simplest fit. Chapter 7 does exactly that, with mazes generated fresh for every episode.
verify: script network_flipped.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_trained.py -k arrows" label="network_arrows reads a greedy action from the network for every free cell, and the window opens"
run ".venv/Scripts/python -m pytest -q tests/test_trained.py" label="all lesson 5.3 tests pass"
```

### What you have

A trained network in a file, a way to load it, and an honest judgement. It's perfect on its own maze, with every route the shortest. It's lost on a new one, because one maze was all it ever saw. Next lesson builds the same agent the tutorial's way, in Keras.
