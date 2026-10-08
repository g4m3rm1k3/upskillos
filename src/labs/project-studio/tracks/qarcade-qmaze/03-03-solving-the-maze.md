---
title: 3.3 — Solving the Maze, and Checking It
runtime: python
run: watch_qmaze.py
---

Last lesson's agent reaches the cheese from all 74 starts. That's what the tutorial's completion check asks, and it's a weak question: a rat that wanders for 150 moves before finding the cheese passes it. The strong question is **does it take the shortest route?** To answer it you need to know the shortest route from every cell, independently of the agent.

This lesson writes the classic algorithm that finds shortest routes, **breadth-first search**, uses it to grade the agent move by move, and then draws everything the agent has learned as an arrow in every cell, so you can see its whole policy at once.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_solve.py** above.

```python file=tests/test_solve.py provided
# Tests for maze_tools.py's search, the arrows in maze_view.py and watch_qmaze.py (lesson 3.3).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_solve.py
import numpy as np
import pygame


def test_shortest_path_in_a_small_maze():
    from maze_tools import shortest_path_length
    maze = np.array([[1, 1, 1], [0, 0, 1], [1, 1, 1]], dtype=float)
    assert shortest_path_length(maze, (0, 0), (2, 2)) == 4
    assert shortest_path_length(maze, (2, 0), (2, 2)) == 2


def test_shortest_path_around_a_wall():
    from maze_tools import shortest_path_length
    maze = np.array([[1, 0, 1], [1, 0, 1], [1, 1, 1]], dtype=float)
    assert shortest_path_length(maze, (0, 0), (0, 2)) == 6


def test_shortest_path_that_does_not_exist():
    from maze_tools import shortest_path_length
    maze = np.array([[1, 0, 1], [0, 0, 1], [1, 1, 1]], dtype=float)
    assert shortest_path_length(maze, (0, 0), (2, 2)) is None


def test_shortest_path_through_the_classic_maze():
    from maze_tools import shortest_path_length
    from qmaze import MAZE
    assert shortest_path_length(MAZE, (0, 0), (9, 9)) == 40


def test_extra_steps_are_zero_for_a_perfect_agent():
    from maze_tools import extra_steps

    class Perfect:
        epsilon = 0.0

        def act(self, state):
            return 2 if state < 2 else 3

    maze = np.array([[1, 1, 1], [0, 0, 1], [0, 0, 1]], dtype=float)
    assert extra_steps(Perfect(), maze) == [0, 0, 0, 0]


def test_extra_steps_skip_starts_that_never_arrive():
    from maze_tools import extra_steps

    class Stuck:
        epsilon = 0.0

        def act(self, state):
            return 0

    maze = np.array([[1, 1, 1], [0, 0, 1], [0, 0, 1]], dtype=float)
    assert extra_steps(Stuck(), maze) == []


def test_extra_steps_of_the_trained_agent_are_small():
    from maze_tools import extra_steps
    from rewards import train_maze
    extra = extra_steps(train_maze())
    assert len(extra) == 74 and sum(extra) / 74 < 1


def test_arrows_point_the_right_way():
    from maze_view import arrow_points, cell_rect
    from qmaze import DOWN, LEFT, RIGHT, UP
    rect = cell_rect(0, 0)
    cx, cy = rect.center
    assert min(x for x, _ in arrow_points(rect, LEFT)) < cx and arrow_points(rect, LEFT)[0][0] < cx
    assert arrow_points(rect, RIGHT)[0][0] > cx
    assert arrow_points(rect, UP)[0][1] < cy
    assert arrow_points(rect, DOWN)[0][1] > cy


def test_arrows_cell_under_the_mouse():
    from maze_view import CELL, MARGIN, TOP, cell_at
    assert cell_at(MARGIN + 3 * CELL + 5, TOP + 2 * CELL + 5, 10, 10) == (2, 3)
    assert cell_at(MARGIN - 5, TOP + 5, 10, 10) is None
    assert cell_at(MARGIN + 5, TOP + 10 * CELL + 5, 10, 10) is None


def test_watch_best_actions_cover_every_free_cell():
    from qmaze import QMaze
    from rewards import train_maze
    from watch_qmaze import best_actions
    env = QMaze()
    best = best_actions(train_maze(episodes=50), env)
    assert set(best) == set(env.free_cells) and set(best.values()) <= {0, 1, 2, 3}


def test_watch_window_opens_and_closes():
    from watch_qmaze import run
    assert run(max_frames=2, episodes=5) == 2
```

The small mazes in the `shortest_path` tests are drawn as rows of numbers. Read the first one as a picture: a free top row, a middle row that's free only on the right, and a free bottom row, so from the top-left to the bottom-right is 2 moves right and 2 down, 4 in all. In `test_extra_steps_are_zero_for_a_perfect_agent`, the stub agent `Perfect` knows that tiny maze: right while in the top row (states 0 and 1), down otherwise.

```check
file tests/test_solve.py -- Click "Create provided tests/test_solve.py" above.
```

## The shortest path, by search

Add breadth-first search to `maze_tools.py`:

```python file=maze_tools.py
from collections import deque

from qmaze import MAZE, MOVES, QMaze


def greedy_path(agent, maze, start, limit=200):
    saved = agent.epsilon
    agent.epsilon = 0.0
    env = QMaze(maze, start=start)
    state, _ = env.reset()
    path = [env.cell]
    reached = False
    for _ in range(limit):
        state, _, terminated, truncated, _ = env.step(agent.act(state))
        path.append(env.cell)
        if terminated:
            reached = True
            break
        if truncated:
            break
    agent.epsilon = saved
    return path, reached


def shortest_path_length(maze, start, target):
    env = QMaze(maze)
    distance = {start: 0}
    queue = deque([start])
    while queue:
        row, col = queue.popleft()
        for d_row, d_col in MOVES.values():
            cell = (row + d_row, col + d_col)
            if env.is_free(*cell) and cell not in distance:
                distance[cell] = distance[(row, col)] + 1
                queue.append(cell)
    return distance.get(target)


def completion(agent, maze=MAZE):
    env = QMaze(maze)
    wins = sum(greedy_path(agent, maze, cell)[1] for cell in env.free_cells)
    return wins, len(env.free_cells)
```

**How breadth-first search works.** It explores outwards from the start in rings, like a ripple:

1. The start is 0 moves away. `distance` records that, and `queue` holds the cells waiting to be explored: just the start.
2. Take the cell at the **front** of the queue. For each of its four neighbours that's free and hasn't been reached before, record it as one move further away than this cell, and add it to the **back** of the queue.
3. Repeat until the queue is empty.

Because the queue is first in, first out, every cell 1 move away is explored before any cell 2 moves away, and so on. So the first time a cell is reached, it's reached by a shortest route, and its distance is final: that's why `cell not in distance` skips cells already found. Traced on the first test maze, from (0, 0):

```text
take (0,0) at 0:  reach (0,1) at 1                      queue: (0,1)
take (0,1) at 1:  reach (0,2) at 2                      queue: (0,2)
take (0,2) at 2:  reach (1,2) at 3                      queue: (1,2)
take (1,2) at 3:  reach (2,2) at 4                      queue: (2,2)
take (2,2) at 4:  reach (2,1) at 5                      queue: (2,1)
take (2,1) at 5:  reach (2,0) at 6                      queue: (2,0)
take (2,0) at 6:  nothing new                           queue: empty
```

(2, 2) is 4 moves away. `distance.get(target)` returns `None` if the target was never reached: a maze with no route.

- **`deque`** (a "double-ended queue", said *deck*) is a list that's fast to take from the front. `popleft()` removes and returns the first item. A plain list's `pop(0)` would work too, but it moves every other item along by one each time.
- BFS is exact and needs no learning: it's an **oracle** for this problem, something that knows the right answer, which is exactly what you want to grade a learner against. That's only possible because you know the maze. The agent didn't: it learned from rewards alone.

```check
run ".venv/Scripts/python -m pytest -q tests/test_solve.py -k shortest" label="shortest_path_length finds the fewest moves, or None when there is no route" -- distance = {start: 0}; queue = deque([start]); take from the front, and give each new free neighbour distance + 1 and a place at the back.
```

## Your turn: how many extra moves?

**Build, on your own:** `extra_steps(agent, maze=MAZE)` in `maze_tools.py`.

For each free cell, play the agent's greedy route (`greedy_path`) and, **if it reaches the cheese**, work out how many moves longer it was than the shortest route (`shortest_path_length`). Return the list of those numbers, one per start that reached the cheese, in the order of `env.free_cells`. A perfect agent gets a list of zeros.

The route's number of **moves** is one less than the number of cells in its path, because the path includes the start: `len(path) - 1`.

```hints
nudge: You need a loop over `QMaze(maze).free_cells`, and two numbers per start that reaches the cheese.
concept: For each cell: `path, reached = greedy_path(agent, maze, cell)`; if reached, append `len(path) - 1 - shortest_path_length(maze, cell, env.target)`.
answer: Add to `maze_tools.py`:
~~~python
def extra_steps(agent, maze=MAZE):
    env = QMaze(maze)
    extra = []
    for cell in env.free_cells:
        path, reached = greedy_path(agent, maze, cell)
        if reached:
            extra.append(len(path) - 1 - shortest_path_length(maze, cell, env.target))
    return extra
~~~
```

```predict
question: For lesson 3.2's classic agent (seed 0), from how many of the 74 starts is the route exactly the shortest one?
answer: 69
tolerance: 3
explain: 69 of 74. The other 5 take a route exactly 2 moves longer than necessary: 10 extra moves in all, 0.14 per start. That's very good, but not perfect, and training ten times longer doesn't fix it (5,000 episodes: still 4 extra moves for seed 0, and seed 2 has 26 extra at 500, 2,000 and 5,000 episodes). See the explanation below.
verify: .venv/Scripts/python -c "from maze_tools import extra_steps; from rewards import train_maze; print(extra_steps(train_maze()).count(0))"
```

**Why aren't all the routes shortest?** A detour of exactly 2 is one step off the best route and one step back. One measurement points at the cause: replace the revisit penalty with the ordinary −0.04 (keeping the −0.75 for walls), and every route that reaches the cheese is the shortest, for 4 of 5 seeds, at both 500 and 5,000 episodes.

The revisit penalty is special: whether a move costs −0.04 or −0.25 depends on **where the rat has been this episode**, and that isn't in the state. The table's state is only the cell. So the same row of the table sometimes sees an action pay −0.04 (first time this way) and sometimes −0.25 (been here before), and it learns an average of the two, which can make a slightly longer route look slightly better. A state that contains everything that affects what happens next has the **Markov property**: the future depends only on the present state, not on how you got there. QMaze with a revisit penalty doesn't have it for a table whose state is the cell.

That isn't the whole story. With only the cheese rewarded, which *is* Markov, a few 2-move detours appear too. So this is an open question you could chase, as a scientist would: form a guess, change one thing, measure. What the measurements already settle is the practical point: **"the state" is a design decision**, and when the reward depends on something the state leaves out, the agent can't learn exactly what you meant. It comes back in a big way in Pac-Man, where which pellets have been eaten is part of the state, or isn't.

```check
run ".venv/Scripts/python -m pytest -q tests/test_solve.py -k extra" label="extra_steps compares each successful route with the shortest one" -- For each free cell whose greedy route reaches the cheese, append len(path) - 1 minus shortest_path_length(maze, cell, env.target).
```

## Arrows

To see the agent's whole policy at once, draw its greedy action in every cell as an arrow. Add two functions to `maze_view.py`:

```python file=maze_view.py
import pygame

from qmaze import DOWN, LEFT, RIGHT, UP

CELL = 44
MARGIN = 20
TOP = 50
WALL_COLOUR = (30, 41, 59)
FLOOR = (148, 163, 184)
VISITED = (100, 116, 139)
CHEESE = (250, 204, 21)
RAT = (244, 114, 182)
TEXT = (226, 232, 240)
BACKGROUND = (15, 23, 42)


def cell_rect(row, col):
    return pygame.Rect(MARGIN + col * CELL, TOP + row * CELL, CELL - 2, CELL - 2)


def cell_at(x, y, rows, cols):
    col = (x - MARGIN) // CELL
    row = (y - TOP) // CELL
    if 0 <= row < rows and 0 <= col < cols:
        return (row, col)
    return None


def arrow_points(rect, action):
    cx, cy = rect.center
    s = CELL // 4
    if action == LEFT:
        return [(cx - s, cy), (cx + s, cy - s), (cx + s, cy + s)]
    if action == RIGHT:
        return [(cx + s, cy), (cx - s, cy - s), (cx - s, cy + s)]
    if action == UP:
        return [(cx, cy - s), (cx - s, cy + s), (cx + s, cy + s)]
    return [(cx, cy + s), (cx - s, cy - s), (cx + s, cy - s)]


def draw_maze(screen, env, visited=()):
    screen.fill(BACKGROUND)
    for row in range(env.rows):
        for col in range(env.cols):
            if env.maze[row, col] == 0:
                colour = WALL_COLOUR
            elif (row, col) in visited:
                colour = VISITED
            else:
                colour = FLOOR
            pygame.draw.rect(screen, colour, cell_rect(row, col))
    pygame.draw.circle(screen, CHEESE, cell_rect(*env.target).center, CELL // 3)


def draw_rat(screen, cell):
    pygame.draw.circle(screen, RAT, cell_rect(*cell).center, CELL // 3)
```

- **`arrow_points(rect, action)`** returns the three corners of a triangle centred in the cell, with its first corner, the point, towards the action's direction. `s` is a quarter of a cell, so the triangle is half a cell across. For LEFT, the point is `s` pixels left of the centre and the other two corners `s` to the right, one above and one below.
- **`cell_at(x, y, rows, cols)`** is `cell_rect` backwards: given a mouse position, which cell is under it? `//` divides and rounds down, so a mouse 3 cells and 5 pixels right of the margin is in column 3. Outside the grid it returns `None`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_solve.py -k arrows" label="arrows point the right way, and cell_at finds the cell under the mouse"
```

## Watch the policy

Create `watch_qmaze.py`:

```python file=watch_qmaze.py
import pygame

from maze_tools import greedy_path
from maze_view import CELL, MARGIN, TEXT, TOP, arrow_points, cell_at, cell_rect, draw_maze, draw_rat
from qmaze import MAZE, QMaze
from rewards import train_maze

ARROW = (15, 23, 42)


def best_actions(agent, env):
    return {cell: int(agent.Q[env.cols * cell[0] + cell[1]].argmax()) for cell in env.free_cells}


def run(max_frames=None, episodes=500, maze=MAZE):
    agent = train_maze(episodes=episodes)
    env = QMaze(maze)
    best = best_actions(agent, env)
    pygame.init()
    screen = pygame.display.set_mode((2 * MARGIN + env.cols * CELL, TOP + env.rows * CELL + 60))
    pygame.display.set_caption("What the agent learned")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    path, reached = greedy_path(agent, maze, (0, 0))
    position = 0
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                cell = cell_at(*event.pos, env.rows, env.cols)
                if cell in best:
                    path, reached = greedy_path(agent, maze, cell)
                    position = 0
        draw_maze(screen, env, set(path[:position + 1]))
        for cell, action in best.items():
            pygame.draw.polygon(screen, ARROW, arrow_points(cell_rect(*cell), action))
        draw_rat(screen, path[position])
        if frames % 6 == 0 and position < len(path) - 1:
            position += 1
        steps = len(path) - 1
        result = f"reaches the cheese in {steps} steps" if reached else f"never reaches the cheese ({steps} steps tried)"
        screen.blit(font.render("Click any cell to start the rat there.", True, TEXT), (MARGIN, 16))
        screen.blit(font.render(f"From {path[0]}: {result}", True, TEXT), (MARGIN, TOP + env.rows * CELL + 20))
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

- **`best_actions`** builds a dictionary from each free cell to the action with the biggest value in its row: the whole policy. `agent.Q[...].argmax()` is used directly, not `greedy`, so a tie always draws the same arrow instead of a random one each time.
- **The rat walks the precomputed path** one cell every 6 frames (`frames % 6 == 0`): 10 cells a second. The path's cells so far are drawn as visited, leaving a trail.
- **`pygame.MOUSEBUTTONDOWN`** is the event for a mouse click; `event.pos` is where, in pixels. A click on a free cell starts a new route from there. Clicks on walls are ignored, because `best` has no walls in it.

Press **Run**. Every arrow is a decision the agent learned from rewards alone, and following the arrows from any cell traces its route. Click a few cells, including the ones far from the cheese. Then look for the 5 starts with a 2-move detour: (0, 8), (2, 8), (7, 3), (7, 4) and (7, 5), for this seed.

```check
run ".venv/Scripts/python -m pytest -q tests/test_solve.py -k watch" label="best_actions covers every free cell, and the window opens and closes"
run ".venv/Scripts/python -m pytest -q tests/test_solve.py" label="all lesson 3.3 tests pass"
```

### What you have

An exact oracle (breadth-first search), a strict grade (extra moves over the shortest route: 0.14 per start for this agent), a picture of the whole policy, and a first look at the Markov property. QMaze is solved with a table. Next lesson finds the one thing that table can't do at all.
