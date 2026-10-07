# Q-learning on a maze

An agent starts at the top-left of a small maze with walls, and has to find its way to the goal in the bottom-right. It knows nothing at the start: not where the goal is, not where the walls are. It learns by trying moves and getting rewards. By the end you will have run and understood every piece of tabular Q-learning: the maze, the Q-table, the update rule, the training loop, and ways to inspect and change them.

The whole idea in five sentences:

1. The world is a grid of cells. Each cell is a **state**. In each cell the agent can try four **actions** (up, down, left, right).
2. After every move the world hands back a **reward** (a number): a small penalty for each step, a bigger penalty for bumping a wall, a big prize for reaching the goal.
3. The agent keeps a table, `Q`, with one row per cell and one column per action. The number in `Q[cell, action]` is its current estimate of "how good is it to take this action from this cell, counting everything that comes after".
4. After each move it nudges that one number toward `reward + discount x (best number in the row of the cell I landed in)`.
5. Do this thousands of times, and good news from the goal spreads backward through the table until following the biggest number in each row walks the shortest path.

How to use it: run the cells in order, because later cells use names from earlier ones, and predict each cell's output before you run it. The cell numbers match the Q-maze notebook from your CS 370 work, so you can compare them side by side. Your CS 370 project replaces this table with a neural network (deep Q-learning, with "experience replay"). That's lesson 3 of this series, and everything here is its foundation: the network learns to output the same numbers this table holds.

## Part 1: the maze world

## Cells 1 and 2: imports, and the maze as text

`random` provides random numbers (exploring, tie-breaking). `numpy`, nicknamed `np`, provides arrays for the maze and the Q-table. `deque` is a list that is efficient to take items off the front of; Cell 5 needs it. `matplotlib.pyplot` draws pictures of the table.

```python type
import random
import numpy as np
from collections import deque
import matplotlib.pyplot as plt

SMALL = [
    "S....",
    "##.#.",
    ".....",
    ".####",
    "....G",
]

def load_maze(text):
    global MAZE_TEXT, ROWS, COLS, walls, START, GOAL
    MAZE_TEXT = text
    ROWS = len(text)
    COLS = len(text[0])
    walls = np.zeros((ROWS, COLS), dtype=int)
    for r in range(ROWS):
        for c in range(COLS):
            ch = text[r][c]
            if ch == "#":
                walls[r, c] = 1
            elif ch == "S":
                START = (r, c)
            elif ch == "G":
                GOAL = (r, c)

load_maze(SMALL)
print(walls)
print("start", START, "goal", GOAL, "size", ROWS, "x", COLS)
```

```output
[[0 0 0 0 0]
 [1 1 0 1 0]
 [0 0 0 0 0]
 [0 1 1 1 1]
 [0 0 0 0 0]]
start (0, 0) goal (4, 4) size 5 x 5
```

`SMALL` is a list of five strings, and each string is one row of the maze. Reading it like a picture: `S` is the start, `G` is the goal, `#` is a wall, and `.` is an open cell. The maze is built so the obvious route is blocked. The goal is straight down from the start, but walls force a long detour.

`load_maze(text)` converts the picture into data. `global MAZE_TEXT, ROWS, ...` says that the names listed live outside the function and we want to *assign* them (without `global`, Python would create separate local names that vanish when the function ends). It records the picture, counts the rows (`len(text)`) and columns (`len(text[0])`, the length of the first row), and creates `walls`, a grid of zeros the same size. The double loop visits every `(r, c)` position, reads the character `ch` at row `r` and column `c` (`text[r][c]`: first pick the row string, then the character in it), and does one of three things: a `#` puts a 1 in `walls`; an `S` records `START = (r, c)`; a `G` records `GOAL = (r, c)`.

The output is the `walls` grid. Compare it against the picture: row 1 is `##.#.`, so it shows `[1 1 0 1 0]`. Rows count downward from 0 and columns count rightward from 0, so `(0, 0)` is the top-left and `(4, 4)` the bottom-right. Position `(r, c)` always means *row first, column second*.

The maze has exactly two routes to the goal. A short one goes through the gap at `(1, 2)`, and a longer one goes all the way along the right side and back through `(2, 4)`, `(2, 3)`.

## Cell 3: giving every cell one number

```python type
def state_of(cell):
    return cell[0] * COLS + cell[1]

def cell_of(state):
    return divmod(state, COLS)

print(state_of((0, 0)), state_of((1, 2)), state_of(GOAL))
print(cell_of(7), cell_of(24))
n_states = ROWS * COLS
print(n_states)
```

```output
0 7 24
(1, 2) (4, 4)
25
```

The Q-table needs one row per cell, so each `(row, col)` pair must become a single whole number. `state_of` computes `row * COLS + col`: count the cells left to right and top to bottom, like reading a page. Cell `(1, 2)` is `1 * 5 + 2 = 7`. `cell_of` reverses it with `divmod(state, COLS)`, which returns the quotient and remainder of dividing by 5, and these are the row and the column. The outputs confirm it: `(0, 0)` is state 0, `(1, 2)` is state 7, the goal `(4, 4)` is state 24, and `cell_of(7)` gives back `(1, 2)`. `n_states` is the number of cells (5 x 5 = 25), including wall cells, whose rows will simply never be used.

## Cell 4: the environment: what happens when the agent moves

```python type
ACTIONS = [(-1, 0), (1, 0), (0, -1), (0, 1)]
NAMES = ["up", "down", "left", "right"]

STEP_REWARD = -1
WALL_REWARD = -5
GOAL_REWARD = 10

def step(cell, action):
    d_row, d_col = ACTIONS[action]
    row = cell[0] + d_row
    col = cell[1] + d_col
    if row < 0 or row >= ROWS or col < 0 or col >= COLS or walls[row, col] == 1:
        return cell, WALL_REWARD, False
    if (row, col) == GOAL:
        return (row, col), GOAL_REWARD, True
    return (row, col), STEP_REWARD, False

print(step((0, 0), 3))
print(step((0, 0), 0))
print(step((0, 1), 1))
print(step((4, 3), 3))
```

```output
((0, 1), -1, False)
((0, 0), -5, False)
((0, 1), -5, False)
((4, 4), 10, True)
```

The four actions are numbered 0 to 3 in this order: up, down, left, right. Each `ACTIONS` entry is `(row change, column change)`. Moving "up" is `-1` in the row because row 0 is at the top. `NAMES` is for printing.

The three constants are the **rewards**, and choosing them is how *you* tell the agent what you want. Each ordinary move costs 1 point, so wandering is penalised and short routes are preferred. Bumping into a wall or the outer boundary costs 5 points, so the agent learns not to try impossible moves. Reaching the goal gives +10.

`step(cell, action)` is the **environment's transition function**: given where you are and what you try, what happens? It returns three things: the new cell, the reward, and whether the episode is finished (`done`). First it looks up the action's change and computes the *candidate* position `(row, col)`. Then three cases, checked in order. If the candidate is outside the grid **or** is a wall, the agent does not move: we return the *old* `cell`, the wall reward, and `False`. The bounds are checked first, and Python stops evaluating an `or` chain at the first true part, so `walls[row, col]` is never read with an out-of-range index. If the candidate is the goal, we return it with `GOAL_REWARD` and `True` (the episode ends). Otherwise it is an ordinary move.

The four test lines: `step((0, 0), 3)` is "right" from the start, giving `((0, 1), -1, False)`, a normal move. `step((0, 0), 0)` is "up" from the top-left corner, off the grid, so the agent stays at `(0, 0)` and gets `-5`. `step((0, 1), 1)` is "down" from `(0, 1)` into the wall at `(1, 1)`, so it stays put with `-5`. `step((4, 3), 3)` is "right" into the goal, giving `((4, 4), 10, True)`.

## Cell 5: ground truth: the real shortest path

The learning agent can never see the maze. But *we* can compute the true answer, so that later we can tell whether the agent found the best route.

```python type
def bfs():
    dist = {START: 0}
    queue = deque([START])
    while queue:
        cell = queue.popleft()
        if cell == GOAL:
            return dist[cell]
        for action in range(4):
            nxt, _, _ = step(cell, action)
            if nxt not in dist:
                dist[nxt] = dist[cell] + 1
                queue.append(nxt)
    return None

print(bfs())
```

```output
12
```

This is **breadth-first search** (BFS): explore outward from the start one "ring" of cells at a time, so the first time we reach the goal, it is by a shortest route.

`dist` is a dictionary mapping each cell reached so far to the number of steps it took to get there, starting with the start at 0. `queue` is a waiting line of cells still to explore. The `while queue:` loop continues while the line is non-empty. `queue.popleft()` takes the cell at the front. If it is the goal, return its distance. Otherwise try all four actions with `step`, which also correctly handles walls (a blocked move returns the same cell, which is already in `dist`, so nothing happens). For each *new* neighbour (`nxt not in dist`) we record its distance as one more than the current cell's and add it to the back of the line. Output: **12**. The shortest route is 12 steps. Remember this number. The straight-line "Manhattan" distance from `(0, 0)` to `(4, 4)` is only 8, which is why walls make this problem interesting.

## Part 2: the Q-table

## Cell 6: the table, and its two key operations

```python type
Q = np.zeros((n_states, 4))
print(Q.shape)
print(Q[state_of((0, 0))])
Q[state_of((0, 0)), 3] = -2.5
print(Q[state_of((0, 0))])
print(Q[state_of((0, 0))].max(), Q[state_of((0, 0))].argmax())
```

```output
(25, 4)
[0. 0. 0. 0.]
[ 0.   0.   0.  -2.5]
0.0 0
```

`np.zeros((n_states, 4))` builds a table of 25 rows and 4 columns, all zeros: `Q.shape` prints `(25, 4)`. Row = which cell you are in; column = which action. Zero means "I know nothing yet", not "this is neutral". `Q[state_of((0, 0))]` is row 0, the four numbers for the start cell. The next lines write `-2.5` into the box for "right" (column 3) of the start cell and print the row again: `[0, 0, 0, -2.5]`.

The last line shows the two operations that everything else uses. `.max()` is the **largest number in the row**, which answers "how good is this cell, if I act well from here?" Here it is `0.0`, since the other three are 0 and larger than -2.5. `.argmax()` is the **position of that largest number**, which answers "which action is best?" It prints `0`, the first of the zeros, meaning "up". On an untrained row `argmax` is meaningless: the first tied entry wins.

## Cell 7: two helpers to look at the table

```python type
def show_values(Q):
    values = Q.max(axis=1)
    for r in range(ROWS):
        line = ""
        for c in range(COLS):
            if walls[r, c] == 1:
                line += "  ###  "
            else:
                line += f"{values[state_of((r, c))]:6.1f} "
        print(line)

ARROWS = ["^", "v", "<", ">"]

def show_policy(Q):
    for r in range(ROWS):
        line = ""
        for c in range(COLS):
            s = state_of((r, c))
            if walls[r, c] == 1:
                ch = "#"
            elif (r, c) == GOAL:
                ch = "G"
            elif not Q[s].any():
                ch = "?"
            else:
                ch = ARROWS[int(np.argmax(Q[s]))]
            line += ch + " "
        print(line)

Q = np.zeros((n_states, 4))
show_values(Q)
show_policy(Q)
```

```output
   0.0    0.0    0.0    0.0    0.0
  ###    ###     0.0   ###     0.0
   0.0    0.0    0.0    0.0    0.0
   0.0   ###    ###    ###    ###
   0.0    0.0    0.0    0.0    0.0
? ? ? ? ?
# # ? # ?
? ? ? ? ?
? # # # #
? ? ? ? G
```

These functions only *display* things, but you will use them constantly, because looking at the table is how you understand it. `show_values(Q)` takes the best number in every row (`Q.max(axis=1)`: `axis=1` means "collapse across the columns, once per row", giving 25 numbers) and prints them as a 5 x 5 grid. Walls print as `###`. `f"{value:6.1f} "` formats a number to one decimal place in a field 6 characters wide, so columns line up.

`show_policy(Q)` draws, for every cell, the arrow of the best action: `ARROWS[np.argmax(Q[s])]`, with `#` for walls and `G` for the goal. `elif not Q[s].any()` is true when a row is entirely zero (`.any()` is True if any entry is non-zero), and we print `?` there so we do not draw a meaningless arrow for a cell the agent has never learned about.

On the fresh all-zero table: every value is `0.0` and every cell shows `?`. That is the starting point, a blank page.

## Cell 8: choosing an action (explore or exploit)

```python type
def choose_action(Q, s, epsilon):
    if random.random() < epsilon:
        return random.randrange(4)
    row = Q[s]
    best = np.flatnonzero(row == row.max())
    return int(random.choice(best))

random.seed(0)
Q = np.zeros((n_states, 4))
s = state_of((2, 2))
print([choose_action(Q, s, 0.0) for _ in range(8)])
Q[s, 3] = 5.0
print([choose_action(Q, s, 0.0) for _ in range(8)])
print([choose_action(Q, s, 1.0) for _ in range(8)])
```

```output
[3, 3, 2, 2, 1, 2, 0, 2]
[3, 3, 3, 3, 3, 3, 3, 3]
[0, 3, 0, 2, 2, 0, 1, 1]
```

This is **epsilon-greedy** selection. With probability `epsilon`, ignore the table and pick a random action: **exploring**, which lets the agent discover things it does not yet believe in. Otherwise pick the best action in the row: **exploiting** what it has learned.

`random.random()` returns a number between 0 and 1, so `< epsilon` is true with probability `epsilon`. For the exploit branch, `row == row.max()` produces four True/False values marking which entries equal the maximum, and `np.flatnonzero(...)` turns that into their positions. If several actions tie, `random.choice(best)` picks one of them at random. This matters: plain `argmax` would always pick action 0 (up) on a fresh row, building a bias into the whole run.

Reading the three test lines. With an all-zero row and `epsilon = 0` the choices are a random mix of 0, 1, 2 and 3, because all four tie. After `Q[s, 3] = 5.0`, every choice is `3`: the best action is now unique, so exploiting is deterministic. With `epsilon = 1.0` the choices are random again, ignoring the table completely.

## Part 3: the learning rule, one step at a time

## Cell 9: one update, printed, near the goal

```python type
ALPHA = 0.5
GAMMA = 0.95

def trace_step(Q, cell, action):
    s = state_of(cell)
    next_cell, reward, done = step(cell, action)
    s_next = state_of(next_cell)
    old = Q[s, action]
    best_next = 0.0 if done else Q[s_next].max()
    target = reward + GAMMA * best_next
    new = old + ALPHA * (target - old)
    Q[s, action] = new
    print(f"at {cell} (row {s}) action {NAMES[action]} -> lands {next_cell} (row {s_next}), reward {reward}")
    print(f"   old {old:.3f} | best_next {best_next:.3f} | target {reward} + {GAMMA} * {best_next:.3f} = {target:.3f} | new {new:.3f}")

Q = np.zeros((n_states, 4))
trace_step(Q, (4, 3), 3)
trace_step(Q, (4, 2), 3)
trace_step(Q, (4, 1), 3)
trace_step(Q, (4, 3), 3)
show_values(Q)
```

```output
at (4, 3) (row 23) action right -> lands (4, 4) (row 24), reward 10
   old 0.000 | best_next 0.000 | target 10 + 0.95 * 0.000 = 10.000 | new 5.000
at (4, 2) (row 22) action right -> lands (4, 3) (row 23), reward -1
   old 0.000 | best_next 5.000 | target -1 + 0.95 * 5.000 = 3.750 | new 1.875
at (4, 1) (row 21) action right -> lands (4, 2) (row 22), reward -1
   old 0.000 | best_next 1.875 | target -1 + 0.95 * 1.875 = 0.781 | new 0.391
at (4, 3) (row 23) action right -> lands (4, 4) (row 24), reward 10
   old 5.000 | best_next 0.000 | target 10 + 0.95 * 0.000 = 10.000 | new 7.500
   0.0    0.0    0.0    0.0    0.0
  ###    ###     0.0   ###     0.0
   0.0    0.0    0.0    0.0    0.0
   0.0   ###    ###    ###    ###
   0.0    0.4    1.9    7.5    0.0
```

`ALPHA` (the learning rate) is the fraction of the way we move toward a new estimate: 0.5 means halfway. `GAMMA` (the discount factor) says how much a reward one step further away is worth: 0.95 means 95% of its face value.

`trace_step` performs exactly one Q-learning update and prints every number. Line by line: `s` is the row number of the cell we are in. `step(cell, action)` asks the environment what happens. `old` is the box we are about to change, `Q[s, action]`. `best_next` is the best number in the row of the cell we *landed* in, except that it is `0.0` if the episode ended, because after the goal there is nothing more to earn. `target = reward + GAMMA * best_next` is our new estimate of what this action is worth: what we just got, plus a discounted look at the future. `new = old + ALPHA * (target - old)` moves the old value part of the way toward the target. Finally `Q[s, action] = new` writes **one box**, and nothing else in the table changes.

::: math
\[ Q(s, a) \leftarrow Q(s, a) + \alpha \big[\, r + \gamma \max_{a'} Q(s', a') - Q(s, a) \,\big] \]
- $s, a$: the cell you're in and the action you took; $s'$: the cell you landed in
- $r$: the reward for that move; $\gamma$: the discount (0.95); $\alpha$: the learning rate (0.5)
- $\max_{a'} Q(s', a')$: the best number in the landing cell's row (0 at the goal)
In code: `Q[s, a] += ALPHA * (reward + GAMMA * Q[s_next].max() - Q[s, a])`
:::

We then place the agent by hand and play four updates, all pressing "right" along the bottom row. This is not how training works (the agent normally gets there by exploring), but it isolates the key mechanism:

1. At `(4, 3)`, right, into the goal: reward 10, no future (`best_next` 0). Target 10, so new = `0 + 0.5 x (10 - 0)` = **5.0**.
2. At `(4, 2)`, right, landing on `(4, 3)`: reward -1. `best_next` is the best number in `(4, 3)`'s row, which is now 5.0. Target = `-1 + 0.95 x 5` = 3.75, new = `0.5 x 3.75` = **1.875**.
3. At `(4, 1)`: `best_next` is 1.875, target 0.781, new **0.391**.
4. Back at `(4, 3)` pressing right again: old is 5.0, target 10, new = `5 + 0.5 x 5` = **7.5**.

The value map at the end shows the bottom row `0.0, 0.4, 1.9, 7.5, 0.0`. **That is the ripple.** Step 2's cell had no idea where the goal was; it learned something only because the cell it landed in had already learned. Information flows *backward* from the goal one cell per update. The goal cell itself shows `0.0` because we never leave it, so its row is never updated.

## Cell 10: how the table learns that walls are bad

```python type
Q = np.zeros((n_states, 4))
trace_step(Q, (2, 2), 1)
print(Q[state_of((2, 2))])
trace_step(Q, (2, 2), 1)
print(Q[state_of((2, 2))])
```

```output
at (2, 2) (row 12) action down -> lands (2, 2) (row 12), reward -5
   old 0.000 | best_next 0.000 | target -5 + 0.95 * 0.000 = -5.000 | new -2.500
[ 0.  -2.5  0.   0. ]
at (2, 2) (row 12) action down -> lands (2, 2) (row 12), reward -5
   old -2.500 | best_next 0.000 | target -5 + 0.95 * 0.000 = -5.000 | new -3.750
[ 0.   -3.75  0.    0.  ]
```

Here the agent is at `(2, 2)` and presses "down" twice. Below `(2, 2)` is a wall, so `step` returns the same cell with reward -5. First press: old 0, `best_next` is 0 (the row of `(2, 2)` is all zeros, since we landed where we started), target `-5 + 0 = -5`, new = `0.5 x -5` = **-2.5**. The row printed is `[0, -2.5, 0, 0]`: only the "down" box changed. Second press: old -2.5, target is again -5, new = `-2.5 + 0.5 x (-5 - (-2.5))` = **-3.75**, moving closer to -5.

Why this teaches the agent to avoid walls: the other three boxes in that row are still 0, and 0 is *better* than -3.75, so `argmax` now prefers the actions it has not tried. A bad move gets a negative number, and that makes the untried ones look relatively attractive, so the agent tries them. (This also means that, because the rewards here are negative, a fresh table of zeros quietly encourages exploring. Remember this for Experiment A.)

## Part 4: training

## Cell 11: the full training loop

```python type
def train(episodes, alpha=0.5, gamma=0.95, eps_start=1.0, eps_min=0.05,
          eps_decay=0.99, max_steps=200):
    Q = np.zeros((ROWS * COLS, 4))
    epsilon = eps_start
    history = []
    for episode in range(episodes):
        cell = START
        for t in range(max_steps):
            s = state_of(cell)
            a = choose_action(Q, s, epsilon)
            next_cell, reward, done = step(cell, a)
            s_next = state_of(next_cell)

            best_next = 0.0 if done else Q[s_next].max()
            target = reward + gamma * best_next
            Q[s, a] += alpha * (target - Q[s, a])

            cell = next_cell
            if done:
                break
        epsilon = max(eps_min, epsilon * eps_decay)
        history.append(t + 1)
    return Q, history

random.seed(0)
Q, history = train(300)
print(history[:12])
for i in range(0, 300, 50):
    print("episodes", i, "to", i + 49, ": average steps", round(sum(history[i:i + 50]) / 50, 1))
```

```output
[200, 103, 200, 200, 121, 123, 80, 122, 100, 48, 63, 38]
episodes 0 to 49 : average steps 71.2
episodes 50 to 99 : average steps 23.5
episodes 100 to 149 : average steps 17.7
episodes 150 to 199 : average steps 15.2
episodes 200 to 249 : average steps 13.9
episodes 250 to 299 : average steps 13.0
```

An **episode** is one attempt from the start until reaching the goal or running out of steps. `train` runs many of them. Setup: a fresh zero table, `epsilon` starting at 1.0 (always explore, because we know nothing), and an empty `history` that will record how many steps each episode took.

Outer loop (`for episode in range(episodes)`): each episode begins at `START`. Inner loop (`for t in range(max_steps)`): at most 200 steps, so an agent that wanders aimlessly cannot run forever. Each step does what Cells 8 and 9 did, without the printing: find the row `s`, choose an action with epsilon-greedy, ask `step` what happens, compute `best_next` (0 if finished), compute `target`, and apply the update with `Q[s, a] += alpha * (target - Q[s, a])`. Then `cell = next_cell` moves the agent, and `if done: break` leaves the inner loop when the goal is reached.

After each episode, `epsilon = max(eps_min, epsilon * eps_decay)` shrinks epsilon by 1% (times 0.99) but never below 0.05. So the agent explores a lot early and mostly exploits later. After 300 episodes, `0.99 ** 300` is about 0.05, the floor. `history.append(t + 1)` records the episode's length (`t` counts from 0, so `t + 1` is the number of steps taken; an episode that ran out of time shows 200).

The output: the first twelve episodes took `[200, 103, 200, 200, 121, 123, 80, ...]` steps. Mostly random walking. The block averages fall from **71.2 steps** (episodes 0 to 49) to 23.5, 17.7, 15.2, 13.9 and **13.0** (episodes 250 to 299). They approach the shortest path of 12 but do not reach it exactly, because epsilon never drops below 0.05: about one move in twenty is still random. The table can be perfect while the training episodes still look slightly worse than perfect.

## Cell 12: reading the learned table

```python type
show_values(Q)
print()
show_policy(Q)
```

```output
  -2.9   -2.0   -1.1   -2.0   -2.9
  ###    ###    -0.1   ###    -2.1
   3.2    2.1    1.0   -0.1   -1.1
   4.4   ###    ###    ###    ###
   5.7    7.1    8.5   10.0    0.0

> > v < <
# # v # v
v < < < <
v # # # #
> > > > G
```

Two views of the same table. The value map (best number per cell) rises steadily along the route to the goal: from the start `-2.9, -2.0, -1.1, -0.1`, then down through `1.0`, left along the third row `2.1, 3.2`, down to `4.4, 5.7`, and along the bottom `7.1, 8.5, 10.0`. The goal's neighbour holds 10.0, which is exactly the goal reward.

Check the rule by hand: a cell's value should be `-1 + 0.95 x (value of the next cell on its best route)`. For `(4, 2)`: `-1 + 0.95 x 10.0` = 8.5, and the map shows 8.5. For `(4, 1)`: `-1 + 0.95 x 8.5` = 7.075, shown as 7.1. This is what "converged" means: every number agrees with its neighbour under the update rule, so further updates barely change anything. This agreement condition is the **Bellman equation**, and the second challenge measures how well a table satisfies it.

The arrow map is the **policy**. From the top-left it goes right, right, then down through the gap, down to the third row, left along it, down, then right along the bottom to the goal. The arrows are also sensible in cells the agent rarely visits: `(0, 4)` and `(0, 3)` point left, back toward the gap, rather than into the dead end. The agent did not just memorise one path; it learned what to do from every cell it visited.

## Cell 13: following the policy and comparing with the true shortest path

```python type
def greedy_path(Q, max_len=50):
    cell = START
    path = [cell]
    for _ in range(max_len):
        a = int(np.argmax(Q[state_of(cell)]))
        cell, _, done = step(cell, a)
        path.append(cell)
        if done:
            return path
    return None

def show_path(path):
    on_path = set(path)
    for r in range(ROWS):
        line = ""
        for c in range(COLS):
            if walls[r, c] == 1:
                ch = "#"
            elif (r, c) == START:
                ch = "S"
            elif (r, c) == GOAL:
                ch = "G"
            elif (r, c) in on_path:
                ch = "*"
            else:
                ch = "."
            line += ch + " "
        print(line)

path = greedy_path(Q)
print(path)
print("learned path length:", len(path) - 1, " shortest possible:", bfs())
show_path(path)
```

```output
[(0, 0), (0, 1), (0, 2), (1, 2), (2, 2), (2, 1), (2, 0), (3, 0), (4, 0), (4, 1), (4, 2), (4, 3), (4, 4)]
learned path length: 12  shortest possible: 12
S * * . .
# # * # .
* * * . .
* # # # #
* * * * G
```

`greedy_path` starts at `START` and repeatedly takes the best action in the current cell (`np.argmax`, no randomness at all), recording each cell visited, until the goal is reached. `max_len=50` is a safety limit: a badly trained table can loop forever (for example two cells pointing at each other), and in that case the function returns `None` instead of hanging. `show_path` prints the maze with `*` marking the route.

The output: the path is 13 cells, so **12 steps**, exactly equal to the BFS answer from Cell 5. The learned route uses the shortcut through `(1, 2)` rather than the long way around.

## Cell 14: extending train, and watching the ripple spread

```python type
def train(episodes, alpha=0.5, gamma=0.95, eps_start=1.0, eps_min=0.05,
          eps_decay=0.99, max_steps=200, Q=None, bonus=None, stop_when_optimal=False):
    if Q is None:
        Q = np.zeros((ROWS * COLS, 4))
    shortest = bfs()
    epsilon = eps_start
    history = []
    for episode in range(episodes):
        cell = START
        for t in range(max_steps):
            s = state_of(cell)
            a = choose_action(Q, s, epsilon)
            next_cell, reward, done = step(cell, a)
            if bonus is not None:
                reward += bonus(cell, next_cell)
            s_next = state_of(next_cell)

            best_next = 0.0 if done else Q[s_next].max()
            target = reward + gamma * best_next
            Q[s, a] += alpha * (target - Q[s, a])

            cell = next_cell
            if done:
                break
        epsilon = max(eps_min, epsilon * eps_decay)
        history.append(t + 1)
        if stop_when_optimal:
            p = greedy_path(Q)
            if p is not None and len(p) - 1 == shortest:
                break
    return Q, history

random.seed(0)
Q = np.zeros((n_states, 4))
for total in (1, 5, 20, 100):
    random.seed(total)
    train(total, Q=Q, eps_start=0.3, eps_decay=1.0)
    print("after another", total, "episodes")
    show_values(Q)
    print()
```

```output
after another 1 episodes
  -2.2   -2.1   -2.0   -2.0   -1.8
  ###    ###    -1.9   ###    -1.2
  -1.6   -1.8   -1.8   -1.8   -1.6
  -1.2   ###    ###    ###    ###
  -0.9   -0.8    0.0    5.0    0.0

after another 5 episodes
  -5.2   -5.0   -4.7   -4.5   -4.4
  ###    ###    -4.3   ###    -4.4
  -3.2   -3.5   -3.9   -4.1   -3.8
  -1.9   ###    ###    ###    ###
   0.4    4.1    7.8    9.8    0.0

after another 20 episodes
  -4.1   -2.6   -1.3   -4.1   -5.9
  ###    ###    -0.2   ###    -5.7
   3.2    2.0    0.9   -2.7   -5.6
   4.4   ###    ###    ###    ###
   5.7    7.1    8.5   10.0    0.0

after another 100 episodes
  -2.9   -2.0   -1.1   -2.0   -5.9
  ###    ###    -0.1   ###    -5.7
   3.2    2.1    1.0   -0.1   -5.6
   4.4   ###    ###    ###    ###
   5.7    7.1    8.5   10.0    0.0
```

First, we rewrite `train` with three optional extras. Each has a default that reproduces the old behaviour, so nothing you did before changes. `Q=None` means "start with a fresh table" as before, but if you pass an existing table, training *continues* it. `bonus=None` is a hook for an extra reward added on each step (used in the experiments). `stop_when_optimal=False` can be switched on to stop as soon as the table's greedy path equals the true shortest path (from `bfs()`), which lets us measure *how fast* different settings learn. We also replaced `n_states` with `ROWS * COLS` so `train` works on any maze, not just the first.

The loop then trains the *same* table in stages, printing the value map after 1, 5, 20 and 100 more episodes (`epsilon` is held at 0.3 by `eps_decay=1.0`). Since `Q` is modified in place, each call continues from the previous one. Reading the four maps:

- **After 1 episode:** the cell beside the goal, `(4, 3)`, already holds `5.0`. The bottom-row cells `(4, 1)` and `(4, 0)` hold `-0.8` and `-0.9`, and elsewhere the values are small negatives from the wandering (and `(4, 2)` is still `0.0`, because the agent has not yet tried that cell's move toward the goal).
- **After 5 more:** the bottom row reads `0.4, 4.1, 7.8, 9.8`: the goal's value is spreading backward along it.
- **After 20 more:** the bottom row (`5.7, 7.1, 8.5, 10.0`) and the left column (`3.2, 4.4`) are essentially their final values from Cell 12. The wave has travelled along the whole route.
- **After 100 more:** the top row near the start is now `-2.9, -2.0, -1.1`, the same as Cell 12. The cells in the dead-end region on the right (`-5.9`, `-5.7`, `-5.6`) are still *stale*: they hold bad numbers from early bumping. A box is only updated when the agent visits it, and with so little time spent in that dead end they have not caught up yet.

## Cell 14b: the ripple as pictures

The same four stages, as colour maps: brighter means a higher value. Watch the bright region grow backward from the goal.

```python type
Q_wave = np.zeros((n_states, 4))
fig, axes = plt.subplots(1, 4, figsize=(12, 3.2))
for ax, total in zip(axes, (1, 5, 20, 100)):
    random.seed(total)
    train(total, Q=Q_wave, eps_start=0.3, eps_decay=1.0)
    values = np.ma.masked_where(walls == 1, Q_wave.max(axis=1).reshape(ROWS, COLS))
    ax.imshow(values, cmap="viridis", vmin=-6, vmax=10)
    ax.set_title(f"after another {total}")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.text(GOAL[1], GOAL[0], "G", ha="center", va="center", color="white")
    ax.text(START[1], START[0], "S", ha="center", va="center", color="white")
plt.show()
```

It repeats Cell 14's training with the same seeds, on a fresh table called `Q_wave`, so the pictures show exactly the four maps printed above. `.reshape(ROWS, COLS)` turns the 25 best-values back into a 5 x 5 grid. `np.ma.masked_where(walls == 1, ...)` hides the walls, so they show as blank. `vmin=-6, vmax=10` fixes the colour scale, so the same colour means the same value in all four pictures: without it, each picture would stretch its own colours and you couldn't compare them.

The main lesson: learning is a wave that moves backward from the goal, and the table is only correct where the wave has passed.

## Cell 15: saving the table

```python type
random.seed(0)
Q, history = train(300)
print(Q.shape)
np.save("q_maze.npy", Q)
loaded = np.load("q_maze.npy")
print(loaded.shape, (loaded == Q).all())
print(loaded[state_of((0, 0))])
```

```output
(25, 4)
(25, 4) True
[-7.78919737 -7.78919737 -7.78919739 -2.93599723]
```

We retrain with the same seed as Cell 11 (so `Q` is the learned table again) and save it. `np.save("q_maze.npy", Q)` writes the array to a file, and `np.load` reads it back. `(loaded == Q).all()` compares every entry and is `True`, so nothing was lost. (In this browser notebook the file lives in temporary memory and disappears when you close the page. In Jupyter on your computer it's a real file next to the notebook, which the pygame track's table viewer can load to draw the learned colours and arrows.) Wall cells' rows were never updated, so they are all zeros, and `argmax` of zeros is 0: a viewer that draws every row's arrow will draw an "up" arrow inside the walls. That is harmless.

The last line prints the start cell's row. Up, down and left from `(0, 0)` all hit boundaries or a wall, so all three read about `-7.79`, and "right" reads `-2.94`. Check the first: a bump gives -5 and leaves you in the same cell, so its value should be about `-5 + 0.95 x (best number in that cell's row)` = `-5 + 0.95 x (-2.94)` = -7.79. The table obeys the rule exactly, also for the bad moves.

## Cell 16: a picture of the learned table

```python type
def plot_policy(Q):
    values = Q.max(axis=1).reshape(ROWS, COLS)
    shown = np.ma.masked_where(walls == 1, values)
    plt.figure(figsize=(5, 5))
    plt.imshow(shown, cmap="viridis")
    for r in range(ROWS):
        for c in range(COLS):
            s = state_of((r, c))
            if walls[r, c] == 1:
                plt.text(c, r, "#", ha="center", va="center", color="white")
            elif (r, c) == GOAL:
                plt.text(c, r, "G", ha="center", va="center", color="white", fontsize=14)
            elif Q[s].any():
                d_row, d_col = ACTIONS[int(np.argmax(Q[s]))]
                plt.arrow(c - d_col * 0.2, r - d_row * 0.2, d_col * 0.4, d_row * 0.4,
                          head_width=0.15, color="white")
    plt.xticks(range(COLS))
    plt.yticks(range(ROWS))
    plt.colorbar(label="best Q in the cell")
    plt.show()

plot_policy(Q)
```

`values` is the best number per cell reshaped to a 5 x 5 grid. `np.ma.masked_where(walls == 1, values)` hides the wall cells so they are not coloured. `plt.imshow` paints the grid with colours by value (brighter means better). Then each cell gets an overlay: a `#` on walls, a `G` on the goal, and for visited cells an arrow drawn with `plt.arrow(x, y, dx, dy)`. Matplotlib's x is the *column* and y is the *row*, so the arrow's direction is the action's column change and row change. `plt.colorbar` adds the colour key. The picture shows the colours brightening along the route to the goal, with the arrows following it.

## Part 5: a close relative: SARSA

## Cell 17: SARSA, Q-learning with one line changed

```python type
def train_sarsa(episodes, alpha=0.5, gamma=0.95, eps_start=1.0, eps_min=0.05,
                eps_decay=0.99, max_steps=200, Q=None, bonus=None, stop_when_optimal=False):
    if Q is None:
        Q = np.zeros((ROWS * COLS, 4))
    shortest = bfs()
    epsilon = eps_start
    history = []
    for episode in range(episodes):
        cell = START
        s = state_of(cell)
        a = choose_action(Q, s, epsilon)
        for t in range(max_steps):
            next_cell, reward, done = step(cell, a)
            if bonus is not None:
                reward += bonus(cell, next_cell)
            s_next = state_of(next_cell)
            a_next = choose_action(Q, s_next, epsilon)

            next_value = 0.0 if done else Q[s_next, a_next]
            target = reward + gamma * next_value
            Q[s, a] += alpha * (target - Q[s, a])

            cell, s, a = next_cell, s_next, a_next
            if done:
                break
        epsilon = max(eps_min, epsilon * eps_decay)
        history.append(t + 1)
        if stop_when_optimal:
            p = greedy_path(Q)
            if p is not None and len(p) - 1 == shortest:
                break
    return Q, history

random.seed(0)
Q_sarsa, hist_sarsa = train_sarsa(300)
show_policy(Q_sarsa)
print("learned path length:", len(greedy_path(Q_sarsa)) - 1)
```

```output
> > v < <
# # v # v
v < < < <
v # # # #
> > > > G
learned path length: 12
```

The function looks almost identical to `train`; the difference is when and how the next action is chosen. Q-learning's target uses the **best** value in the next row (`Q[s_next].max()`), whatever the agent will actually do there. SARSA picks the *actual* next action first (`a_next = choose_action(...)`), and its target uses that action's value (`Q[s_next, a_next]`). Then it carries that same action into the next step (`cell, s, a = next_cell, s_next, a_next`) so the action it evaluated is the action it takes. The name comes from the sequence it uses: State, Action, Reward, State, Action.

This makes the two methods answer different questions. Q-learning is **off-policy**: it learns the value of the *best possible* play even while exploring. SARSA is **on-policy**: it learns the value of the policy it is *actually following*, random exploring moves included. Where exploring is dangerous (the classic example is walking along a cliff edge) SARSA learns a safer, longer path, and Q-learning learns the shortest, riskiest one. In this maze there is no cliff, and the learned policy is the same: the output shows the same arrows and a path length of **12**.

## Part 6: experiments

Now we break and tune things on purpose. The rule is: **change one thing, predict the result in writing, then run the cell**. Each result is described under the cell after it, so you can predict before you scroll.

## Cell 18: a helper that measures how fast a setting learns, and the baseline

```python type
def experiment(label, trainer=None, seeds=range(5), episodes=2000,
               rewards=None, maze=None, **settings):
    global STEP_REWARD, WALL_REWARD, GOAL_REWARD
    trainer = trainer or train
    saved_rewards = (STEP_REWARD, WALL_REWARD, GOAL_REWARD)
    saved_maze = MAZE_TEXT
    try:
        if rewards is not None:
            STEP_REWARD, WALL_REWARD, GOAL_REWARD = rewards
        if maze is not None:
            load_maze(maze)
        shortest = bfs()
        solved_at = []
        costs = []
        for seed in seeds:
            random.seed(seed)
            Q_run, hist = trainer(episodes, stop_when_optimal=True, **settings)
            path = greedy_path(Q_run)
            ok = path is not None and len(path) - 1 == shortest
            solved_at.append(len(hist) if ok else None)
            costs.append(sum(hist))
    finally:
        STEP_REWARD, WALL_REWARD, GOAL_REWARD = saved_rewards
        load_maze(saved_maze)
    good = [x for x in solved_at if x is not None]
    mean_solved = round(sum(good) / len(good), 1) if good else None
    print(f"{label:24s} episodes to find shortest path: {solved_at}  mean {mean_solved}  "
          f"avg total steps {round(sum(costs) / len(costs))}")

experiment("baseline")
```

```output
baseline                 episodes to find shortest path: [5, 6, 8, 7, 7]  mean 6.6  avg total steps 1128
```

`experiment` trains the agent from scratch five times (seeds 0 to 4) with whatever settings you give it, and reports two measurements. **Episodes to find the shortest path:** after every episode the trainer checks whether the table's greedy path is already the true shortest (that is what `stop_when_optimal=True` does) and stops as soon as it is; the number of episodes it took is recorded, or `None` if the episodes ran out first. **Avg total steps:** the total number of moves made during learning, a measure of how *costly* the learning was. Lower is better on both.

The inputs: `label` is text to print; `trainer` is which learning function to use (`train` by default, or `train_sarsa`), and functions can be passed around like any other value. `rewards` temporarily overrides the three reward constants, and `maze` temporarily loads a different maze. `**settings` collects any other named settings (such as `alpha=0.1`) and passes them straight on to the trainer. The `global` line permits changing the reward constants, and the `try ... finally` block guarantees they and the maze are restored afterwards even if something crashes, so one experiment can never contaminate the next. `f"{label:24s}"` pads the label to 24 characters so the rows line up.

Running five seeds and showing all five results is what makes these experiments trustworthy: you can see the spread, and trust a difference only when it's bigger than that.

The baseline: the shortest path is found after `[5, 6, 8, 7, 7]` episodes (mean **6.6**) at a total cost of about **1128** steps. Only about seven episodes are needed, even though in Cell 11 the *average steps per episode* took 300 episodes to fall to 13. Those are different questions: the table becomes correct quickly, while the *behaviour* stays noisy for much longer because epsilon is still high.

## Cell 19: a bigger maze, and two "distance hint" bonuses

```python type
BIG = [
    "S.......",
    "#######.",
    "........",
    ".#######",
    "........",
    "#######.",
    "........",
    ".......G",
]

def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def naive_bonus(cell, next_cell):
    before = manhattan(cell, GOAL)
    after = manhattan(next_cell, GOAL)
    if after < before:
        return 1
    if after > before:
        return -1
    return 0

def potential_bonus(cell, next_cell):
    return 0.95 * (-manhattan(next_cell, GOAL)) - (-manhattan(cell, GOAL))

load_maze(BIG)
print(ROWS, COLS, bfs())
load_maze(SMALL)
print(ROWS, COLS, bfs())
```

```output
8 8 28
5 5 12
```

`BIG` is an 8 x 8 snake-shaped maze whose shortest route is 28 steps (the output `8 8 28`; the second line `5 5 12` confirms we switched back to the small maze). `manhattan(a, b)` is the grid distance `|row difference| + |column difference|`, ignoring walls. The two functions are **reward shaping**: extra reward added on top of the environment's reward to hint at progress, which can help when reward only arrives at the goal. `naive_bonus` gives +1 for a move that gets closer to the goal in Manhattan distance, -1 for one that gets farther, 0 otherwise. `potential_bonus` is the more careful version: it gives `0.95 x phi(next) - phi(cell)`, where `phi` is "minus the distance to the goal". The `GAMMA` (0.95) appears in it deliberately. A known result in reinforcement learning (Ng, Harada and Russell, 1999) says that this particular form of bonus **cannot change which policy is best**, it only changes how fast it's found, whereas the naive version has no such guarantee.

## Experiment A: no exploring

Predict first: with `epsilon = 0`, the agent always takes the best-looking action. Will it ever find the goal?

```python type
experiment("no exploring", eps_start=0.0, eps_min=0.0)
```

```output
no exploring             episodes to find shortest path: [10, 13, 10, 12, 14]  mean 11.8  avg total steps 489
```

The result: `[10, 13, 10, 12, 14]`, mean 11.8, avg total steps 489.

It works. It needs more episodes (11.8 versus 6.6), but its total cost is much lower (489 versus 1128 steps), because it never wastes moves on random choices. The reason is the sign of the rewards. Here every move gives a *negative* reward, so any box the agent has tried drops below 0 while untried boxes still sit at 0, and `argmax` keeps picking untried ones. The table of zeros acts as built-in curiosity (this trick is called **optimistic initialisation**). In the next lesson, CartPole, every reward is positive, so the first action tried beats all the untried zeros and the agent locks onto it, and epsilon = 0 fails completely. **Whether epsilon = 0 works depends on your rewards.** Do not rely on it in general: Experiment G shows it is slower on the bigger maze.

## Experiment B: the learning rate alpha

Predict first: `alpha = 0.01` and `alpha = 1.0` (replace the old value completely). Which is slower? Is 1.0 unstable?

```python type
experiment("alpha=0.01", alpha=0.01)
experiment("alpha=0.1", alpha=0.1)
experiment("alpha=1.0", alpha=1.0)
```

```output
alpha=0.01               episodes to find shortest path: [142, 213, 7, 105, 226]  mean 138.6  avg total steps 11611
alpha=0.1                episodes to find shortest path: [18, 8, 7, 19, 17]  mean 13.8  avg total steps 2086
alpha=1.0                episodes to find shortest path: [8, 6, 11, 7, 7]  mean 7.8  avg total steps 1298
```

The results: `alpha=0.01` `[142, 213, 7, 105, 226]`, mean 138.6, 11611 steps; `alpha=0.1` `[18, 8, 7, 19, 17]`, mean 13.8, 2086 steps; `alpha=1.0` `[8, 6, 11, 7, 7]`, mean 7.8, 1298 steps.

A tiny alpha is about 20 times slower than the baseline's 0.5 (138.6 versus 6.6 episodes, and about ten times more steps). Each update moves the box only 1% of the way, so good news from the goal takes many visits to propagate. (One seed got lucky at 7 episodes; five runs show the spread.) Alpha 0.1 is in between. And **alpha = 1.0 works fine**, about as fast as the baseline. The reason is worth understanding. In this maze the world is *deterministic* and every cell has its own row: pressing "right" from a given cell always gives the same reward and the same next cell. So the newest sample is always exactly right, and replacing the old value loses nothing. In CartPole (next lesson) the buckets blur different real situations together, so each new sample is noisy, and alpha = 1 keeps throwing away the average: there it fails. A small alpha is a defence against noise; with no noise you do not need it.

## Experiment C: the discount factor gamma

Predict first: `gamma = 0` means only the immediate reward counts. Try 0, 0.1, 0.5 and 0.99. (`gamma = 0` can't solve the maze, so it gets only 300 episodes per seed, to save time.)

```python type
experiment("gamma=0.0", gamma=0.0, episodes=300)
experiment("gamma=0.1", gamma=0.1)
experiment("gamma=0.5", gamma=0.5)
experiment("gamma=0.99", gamma=0.99)
```

```output
gamma=0.0                episodes to find shortest path: [None, None, None, None, None]  mean None  avg total steps 44045
gamma=0.1                episodes to find shortest path: [11, 8, 12, 7, 14]  mean 10.4  avg total steps 1690
gamma=0.5                episodes to find shortest path: [8, 7, 8, 7, 8]  mean 7.6  avg total steps 1309
gamma=0.99               episodes to find shortest path: [5, 6, 8, 7, 7]  mean 6.6  avg total steps 1128
```

The results: `gamma=0.0` `[None, None, None, None, None]`, 44045 steps; `gamma=0.1` mean 10.4; `gamma=0.5` mean 7.6; `gamma=0.99` mean 6.6.

With `gamma = 0` the update target is `reward + 0 x best_next`, which is just the reward. Only the cell next to the goal ever learns anything (+10); no other cell hears about it, so the ripple from Cell 9 never happens and the shortest path is never found (`None`; 44,045 steps over 300 episodes is about 147 per episode, mostly wandering until the 200-step limit). Any gamma above zero lets the information travel: even 0.1 works, slightly slower, because what matters is that numbers get larger *toward* the goal, and a heavily discounted signal still points the right way. Here gamma barely matters once it is above about 0.5: every step has an explicit cost and the goal is certain, so even a faint signal ranks the actions correctly.

## Experiment D: the reward numbers themselves

Predict first: (1) a wall bump costs 0 instead of -5; (2) a wall bump costs only -1 (same as a normal step); (3) normal steps cost 0; (4) the goal pays 100 instead of 10.

```python type
experiment("wall bump costs 0", rewards=(-1, 0, 10), episodes=300)
experiment("wall bump costs -1", rewards=(-1, -1, 10))
experiment("steps cost 0", rewards=(0, -5, 10))
experiment("goal pays 100", rewards=(-1, -5, 100))
```

```output
wall bump costs 0        episodes to find shortest path: [None, None, None, None, None]  mean None  avg total steps 47410
wall bump costs -1       episodes to find shortest path: [9, 9, 10, 7, 9]  mean 8.8  avg total steps 1492
steps cost 0             episodes to find shortest path: [14, 20, 7, 12, 9]  mean 12.4  avg total steps 2088
goal pays 100            episodes to find shortest path: [5, 6, 8, 7, 7]  mean 6.6  avg total steps 1128
```

The results: bump costs 0 `[None, None, None, None, None]`, 47410 steps; bump costs -1 `[9, 9, 10, 7, 9]`, mean 8.8; steps cost 0 `[14, 20, 7, 12, 9]`, mean 12.4; goal pays 100 `[5, 6, 8, 7, 7]`, mean 6.6, the same as the baseline.

The tuple is `(step, wall, goal)`, the three reward constants, temporarily replaced. **Bump costs 0** is a disaster: it never finds the path, and 47,410 steps over 300 episodes means about 158 steps per episode, often hitting the 200-step limit. The agent is doing exactly what the rewards say: a move costs -1 but bumping into a wall (staying still) costs 0, so *standing still beats moving*. It learned to push into walls. **The agent maximises the reward you give it, not what you meant.** This kind of mistake is the most common bug in reinforcement-learning projects. Bump cost -1 (same as a step) is enough to fix it; the larger -5 just makes it faster. With **step cost 0** the agent still finds the shortest path (more slowly), because of discounting: a goal reached sooner is worth more (`0.95` raised to a smaller power). **Goal pays 100** gives numbers identical to the baseline, so in this maze the size of the prize did not change which actions look best.

## Experiment E: distance hints (reward shaping)

Predict first: does adding a Manhattan-distance bonus help? On the small maze? On the big one? Could the naive version mislead the agent in the big maze, where the correct route sometimes moves *away* from the goal?

```python type
experiment("naive bonus", bonus=naive_bonus)
experiment("potential bonus", bonus=potential_bonus)
experiment("BIG maze", maze=BIG)
experiment("BIG, naive bonus", maze=BIG, bonus=naive_bonus)
experiment("BIG, potential bonus", maze=BIG, bonus=potential_bonus)
```

```output
naive bonus              episodes to find shortest path: [7, 6, 7, 8, 7]  mean 7.0  avg total steps 1187
potential bonus          episodes to find shortest path: [7, 5, 6, 8, 7]  mean 6.6  avg total steps 1147
BIG maze                 episodes to find shortest path: [27, 22, 29, 21, 22]  mean 24.2  avg total steps 4350
BIG, naive bonus         episodes to find shortest path: [18, 18, 17, 19, 19]  mean 18.2  avg total steps 3500
BIG, potential bonus     episodes to find shortest path: [21, 17, 15, 17, 20]  mean 18.0  avg total steps 3404
```

The results: on the small maze, naive bonus mean 7.0 and potential bonus mean 6.6, no different from the baseline. On the big maze: no bonus `[27, 22, 29, 21, 22]`, mean 24.2, 4350 steps; naive `[18, 18, 17, 19, 19]`, mean 18.2, 3500 steps; potential `[21, 17, 15, 17, 20]`, mean 18.0, 3404 steps.

The small maze is already learned in about seven episodes, so there is nothing to speed up: a hint only helps where learning is slow. The big maze takes about 24 episodes unaided, and the hints cut that to about 18 (roughly 25% fewer episodes and steps). The ranges barely overlap (15 to 21 against 21 to 29), so this is more than luck. Both versions still found the true 28-step route, so in *this* maze the naive bonus did not mislead the agent, even though the route moves away from the goal in places. Only two mazes were tested, so don't conclude that the naive bonus is safe: the potential-based version is the one with the guarantee. And the gains are modest: the agent can learn this maze perfectly well without hints.

## Experiment F: SARSA versus Q-learning

Predict first: which learns the shortest path faster?

```python type
experiment("SARSA", trainer=train_sarsa)
experiment("BIG, SARSA", maze=BIG, trainer=train_sarsa)
```

```output
SARSA                    episodes to find shortest path: [23, 8, 11, 8, 12]  mean 12.4  avg total steps 1964
BIG, SARSA               episodes to find shortest path: [30, 29, 36, 41, 36]  mean 34.4  avg total steps 6193
```

The results: SARSA `[23, 8, 11, 8, 12]`, mean 12.4; BIG with SARSA `[30, 29, 36, 41, 36]`, mean 34.4, 6193 steps.

SARSA is slower in both mazes (12.4 versus 6.6 episodes on the small one, 34.4 versus 24.2 on the big one). It learns the value of *its own* exploring behaviour, random slips and all, rather than of perfect play, so its numbers are blurred by its own mistakes while epsilon is high. Both eventually give the same route. SARSA's advantage appears in environments where an exploring slip is expensive (a cliff), which this maze does not have.

## Experiment G: the exploration schedule

Predict first: on the big maze, what if the agent never explores, or explores for much longer (`eps_decay=0.999`, which shrinks epsilon ten times more slowly)?

```python type
experiment("BIG, no exploring", maze=BIG, eps_start=0.0, eps_min=0.0)
experiment("BIG, slower decay", maze=BIG, eps_decay=0.999)
```

```output
BIG, no exploring        episodes to find shortest path: [29, 32, 35, 37, 34]  mean 33.4  avg total steps 2005
BIG, slower decay        episodes to find shortest path: [79, 59, 45, 46, 52]  mean 56.2  avg total steps 11139
```

The results: no exploring `[29, 32, 35, 37, 34]`, mean 33.4, 2005 steps; slower decay `[79, 59, 45, 46, 52]`, mean 56.2, 11139 steps.

Compare with the big-maze baseline of 24.2 episodes and 4350 steps. No exploring is slower in episodes (33.4) but cheapest in total steps (2005): again the optimistic zeros doing the exploring for free. Exploring *too long* is the worst option: 56 episodes and over 11,000 steps. A likely reason, consistent with the numbers though not proven by them: while epsilon is near 1, nearly every move is random, and a random walk rarely makes it along a 28-step snake within 200 steps, so the agent keeps timing out before it learns where the goal is. The best exploration schedule is neither the most nor the least. It depends on the maze and the rewards.

::: challenge What the start cell is worth [easy]
The learned value of the start cell, `Q[state_of(START)].max()`, is about -2.94. Where does that number come from? It should be the **discounted return** of the shortest path: the rewards collected along the 12 steps, each multiplied by `GAMMA` raised to the number of steps before it. Write `episode_return(rewards, gamma)` that returns `rewards[0] + gamma * rewards[1] + gamma**2 * rewards[2] + ...`, then compute the shortest path's return in `start_value`: 11 ordinary steps (-1 each), then the step into the goal (+10).

```python starter
def episode_return(rewards, gamma):
    return sum(rewards)

start_value = episode_return([-1] * 11 + [10], GAMMA)
print(start_value, Q[state_of(START)].max())
```

```python solution
def episode_return(rewards, gamma):
    return sum(r * gamma ** t for t, r in enumerate(rewards))

start_value = episode_return([-1] * 11 + [10], GAMMA)
print(start_value, Q[state_of(START)].max())
```

```python test
assert "episode_return" in dir(), "Keep the function's name as episode_return."
assert abs(episode_return([1, 1, 1], 0.5) - 1.75) < 1e-9, "With gamma 0.5, rewards [1, 1, 1] are worth 1 + 0.5 + 0.25 = 1.75: the first reward isn't discounted at all."
assert abs(episode_return([5], 0.9) - 5) < 1e-9, "A single reward, collected now, is worth its face value."
assert "start_value" in dir(), "Store the shortest path's return in start_value."
assert abs(start_value - Q[state_of(START)].max()) < 1e-6, f"start_value is {start_value:.4f}, but the table says {Q[state_of(START)].max():.4f}. Use 11 rewards of -1 and then 10, with GAMMA."
f"SUCCESS: {start_value:.6f}, and the table holds {Q[state_of(START)].max():.6f}. A Q-value IS the discounted return of playing well from there, which is why the learned table and this hand calculation agree to six decimal places."
```

Hint: `enumerate(rewards)` gives `(0, first), (1, second), ...`, so `sum(r * gamma ** t for t, r in enumerate(rewards))` discounts each reward by its position.
:::

::: challenge Has the route converged? [medium]
Cell 12 said a converged table satisfies the Bellman equation: each value equals `reward + GAMMA * (best value of the cell you land in)`, with no future term when the move reaches the goal. Write `route_error(Q, path)`: for every cell on `path` except the last, take the table's best action there, work out that target with `step`, and return the **largest** difference between `Q[s, a]` and its target. A trained table scores almost 0; a half-trained one doesn't.

```python starter
def route_error(Q, path):
    return 0.0

print(route_error(Q, greedy_path(Q)))
```

```python solution
def route_error(Q, path):
    worst = 0.0
    for cell, nxt in zip(path, path[1:]):
        s = state_of(cell)
        a = int(np.argmax(Q[s]))
        _, reward, done = step(cell, a)
        target = reward + (0.0 if done else GAMMA * Q[state_of(nxt)].max())
        worst = max(worst, abs(Q[s, a] - target))
    return worst

print(route_error(Q, greedy_path(Q)))
```

```python test
import random as _random
assert "route_error" in dir(), "Keep the function's name as route_error."
_random.seed(0)
_Q300, _ = train(300)
_e = route_error(_Q300, greedy_path(_Q300))
assert _e < 1e-6, f"A table trained for 300 episodes is converged along its route, so the error should be about 0; got {_e}. Check that the target is reward + GAMMA * (best value of the NEXT cell), with no future term at the goal."
_random.seed(0)
_Q5, _ = train(5)
_e5 = route_error(_Q5, greedy_path(_Q5))
assert abs(_e5 - 4.625) < 1e-6, f"After only 5 episodes, the largest error along the route is 4.625; got {_e5}. Remember to use each cell's BEST action (argmax), and return the largest absolute difference."
"SUCCESS: about 0 for the trained table, 4.625 after 5 episodes. Along the route the table has converged, even though the rarely visited dead end (Cell 14) still holds stale numbers."
```

Hint: `zip(path, path[1:])` pairs each cell with the next one. For each pair, `a = int(np.argmax(Q[s]))`, then `step(cell, a)` gives the reward and whether it reached the goal; the target uses `Q[state_of(nxt)].max()` unless `done`. Keep the biggest `abs(Q[s, a] - target)`.
:::

## What you should now be able to explain

Cover the answers and say each one out loud.

1. **What does `Q[s, a]` mean?** The agent's current estimate of the total discounted future reward from taking action `a` in cell `s` and then playing well. (The first challenge showed this literally.)
2. **Which lines are the learning, and how much of the table changes per step?** `target = reward + gamma * best_next` and `Q[s, a] += alpha * (target - Q[s, a])`. Exactly one box.
3. **Why is `best_next` zero at the goal?** The episode is over, so nothing more can be earned after it. Without this the table would treat the goal as a place with endless future reward.
4. **Why does information spread backward?** A cell's target contains the best value of the cell it lands in. If that cell has learned something, this cell learns it on its next visit, and so on, one cell per visit.
5. **What do alpha, gamma and epsilon do?** Alpha: how far to move toward each new estimate. Gamma: how much the future is worth compared to now. Epsilon: how often to try a random action.
6. **Why did a wall bump costing 0 break the agent?** Staying still scored better than moving, so it learned to stay still. Rewards define the goal literally.
7. **How does Q-learning differ from SARSA?** Q-learning's target uses the best next action; SARSA's uses the action actually chosen next (including random exploring moves).
8. **Why can a perfect table produce imperfect episodes?** Epsilon never reaches zero during training, so some moves stay random. Judge the table by following the greedy path, not by the training episodes.
9. **How do you know the learner is right?** Compare the greedy path length with a trusted answer, here the BFS in Cell 5.

## Debugging checklist

- **Table is all zeros after training:** the update line is not running, you are printing a different `Q` than the one you trained, or the rewards are all zero.
- **The agent never reaches the goal:** check that `step` returns `done = True` at the goal, that `max_steps` is large enough, and that epsilon is not stuck near 1.
- **`greedy_path` returns `None` (loops):** train longer, check that gamma is above 0, and check that the wall bump costs *more* than a normal step.
- **`IndexError` on the table:** the Q-table has the wrong number of rows for the current maze. It must be `ROWS * COLS` rows.
- **Your numbers differ from these:** a `random.seed(...)` line is missing, or cells ran out of order. (Unlike CartPole, the maze has no trigonometry, so Jupyter on your computer prints exactly the same numbers as this notebook.)

## Your own experiments

These are real unknowns: change one thing each and predict first.

1. Write a third maze with two *different-length* routes, and a dead end that looks promising. Does the agent find the shorter one?
2. Make the maze larger (12 x 12). How do the episodes needed grow? Does shaping help more?
3. Add a small penalty for revisiting a cell. Does it still find the shortest path?
4. Move the goal or the start. Does a trained table still work? (Think about what the table knows.)
5. Make some moves randomly fail 20% of the time (the agent slips sideways). Which of alpha = 0.1 and alpha = 1.0 now works better, and why?

Next lesson: CartPole, where the state isn't a cell number but four continuous measurements, and the table starts to struggle.
