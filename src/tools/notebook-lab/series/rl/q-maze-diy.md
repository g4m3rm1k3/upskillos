# Q-maze, typed by hand: from numpy to Q-learning, planning and a neural network

This lesson is built so that you **type everything**. Each step shows its code, fully commented, in a grey box. Under the box is an empty editor where *you* type it in and run it, and the notebook then checks your output against the expected output.

**What you will build:** a small maze with walls, and an agent that starts knowing nothing and teaches itself the shortest route to the goal. You will write the maze, the Q-table, the update rule and the training loop. Then, in Part E, you will see the same problem solved three more ways: by exact calculation (value iteration), by "imagining" extra experience (Dyna-Q), and with a **neural network trained from scratch in numpy** using replay memory and a target network, which is the machinery behind deep Q-learning.

I assume no data-science background. Every piece of Python and numpy is explained the first time it appears, and a cheat sheet and glossary are at the end.

**Note on your assignment.** I do not know exactly what your assignment's "qmaze" asks for. If it uses a plain table (a grid of numbers), Parts A to D are the core. If it uses a neural network with experience replay (as many online "maze with Keras" tutorials do), Part E is the core. Both are here, so read the assignment against the map below and note anything it asks for that is not covered.

## How to use this lesson

**The loop for every step:**
1. Read why the step exists, then read the code shown in the grey box. Every line carries a comment.
2. Type it into the empty editor under the box, comments included (they are short explanations you will be glad of later). Don't copy and paste: typing is slow on purpose, because it is how the code ends up in your head and not just on your screen.
3. Before you run, predict what it will print. The expected output sits under your cell, folded shut, so you can predict first and only then look.
4. Run the cell (the Run button, or `Shift+Enter`). The notebook compares your output with the expected output line by line. A tick means they match; otherwise it shows the first line that differs, which almost always points straight at a typo.
5. Read "What every line does" and what the output means, then do the "Try this yourself" bit: press "+ Add cell" and experiment there. Predict the answer *before* running.

**Setup.** None: numpy runs right here in the browser. To run the same code on your own computer you need Python 3.9 or newer and `numpy` (`pip install numpy`).

**Cells share memory.** Names created in one cell exist in later ones, so run the steps **in order**. If things behave strangely, press "↺ Reset variables" and run your cells again from the top.

**If your output does not match,** check: (1) typos, especially brackets and commas; (2) indentation (Python uses the spaces at the start of a line to mean "this belongs inside the thing above"); (3) a skipped or reordered step; (4) a missing `random.seed(...)` line. Cells with randomness start by setting a seed, so your numbers should match exactly. Differences in the 15th decimal place are harmless.

**Errors are normal.** `NameError` usually means you skipped an earlier step; `SyntaxError` means a typo. Read the last line of the error first.

## The map of this lesson

- **Part A: the toolkit.** The numpy and Python you need, introduced as needed. (Steps 1 to 3)
- **Part B: the maze world.** The maze, how cells become row numbers, what a move does, and a way to compute the true shortest path so we can check our learner. (Steps 4 to 7)
- **Part C: Q-learning.** The return, the Q-table, one update by hand, the training loop, and watching the learned values spread backward from the goal. (Steps 8 to 15)
- **Part D: experiments.** Breaking the learner on purpose to see why each piece matters. (Step 16)
- **Part E: beyond.** Value iteration, Dyna-Q, and a neural-network Q-function with replay memory. (Steps 17 to 23)

## Part A: the toolkit

A small slice of numpy and Python does nearly everything in this project. We learn exactly that slice.

## Step 1: Arrays: a grid of numbers

**Why we need this.** A maze is a grid, so it fits a numpy **array**: a block of numbers, all of one type, that you can look into and do arithmetic on all at once. The walls, and later the Q-table, are arrays.

```python type
import numpy as np                        # numpy: fast arrays of numbers (nickname np)

walls = np.array([[0, 0, 1],
                  [0, 1, 0],
                  [0, 0, 0]])             # a 3x3 array: 1 = wall, 0 = open

print(walls.shape)                        # (rows, columns)
print(walls[1, 1])                        # row 1, column 1 -> 1
walls[2, 2] = 1                           # assign into one position
print(walls)
print(walls.sum())                        # how many walls: add everything up
print(walls[0])                           # the whole of row 0
print(walls[:, 2])                        # ":" = every row, so this is column 2
print(walls[(1, 1)])                      # a tuple works as an index too
print(walls == 1)                         # True/False for every position
print(walls.reshape(-1))                  # flatten to one long row of 9 numbers
```

```output
(3, 3)
1
[[0 0 1]
 [0 1 0]
 [0 0 1]]
3
[0 0 1]
[1 0 1]
1
[[False False  True]
 [False  True False]
 [False False  True]]
[0 0 1 0 1 0 0 0 1]
```

**What every line does.**

- `import numpy as np` loads numpy under the nickname `np`.
- The nested list `[[0, 0, 1], [0, 1, 0], [0, 0, 0]]` has three inner lists; `np.array(...)` turns each into a **row**. So this is a 3-row, 3-column array. We use `1` for wall and `0` for open.
- `walls.shape` is `(rows, columns)`.
- `walls[1, 1]` means row 1, column 1. **Counting starts at 0**, so row 0 is the top row.
- `walls[2, 2] = 1` changes one position (assignment). A single `=` stores; a double `==` asks "is it equal?".
- `walls.sum()` adds every number. Since walls are 1s, that counts the walls.
- `walls[0]` is the whole of row 0. `walls[:, 2]` means "every row (`:` means all), column 2", so a whole column.
- `walls[(1, 1)]` uses the tuple `(1, 1)` as an index, which means the same as `walls[1, 1]`. We will use tuples as cell positions.
- `walls == 1` compares every item with 1 and gives a True/False array (a **mask**).
- `walls.reshape(-1)` flattens the grid into one long row (the `-1` means "work out the length yourself").

`(3, 3)` is the shape, and `1` is the item at row 1, column 1. After setting the bottom-right to 1, the array holds three walls, and `walls.sum()` is `3`. Row 0 is `[0 0 1]`, and column 2 is `[1 0 1]`. The mask shows `True` exactly where the 1s are. The flattened array reads the grid left to right, top to bottom: `[0 0 1 0 1 0 0 0 1]`.

**Try this yourself.** Predict, then check: `walls[1:, :2]` (rows from 1 on, the first two columns) and `walls.sum(axis=0)` (we will meet `axis` in the next step).

## Step 2: Axes, max, argmax, any, and one-hot vectors

**Why we need this.** Two operations are at the centre of Q-learning: **max** (the best number in a row) and **argmax** (the *position* of the best number, which names the best action). With a 2D table you must understand `axis`.

```python type
table = np.array([[0.0, -2.5, 0.0, 4.0],
                  [1.0,  1.0, 0.5, 0.0]])  # 2 "cells" x 4 "actions"

print(table.max(axis=1))                  # axis=1: best number in each ROW -> [4. 1.]
print(table.argmax(axis=1))               # POSITION of the best number in each row -> [3 0]
print(table[1] == table[1].max())         # which entries equal the row's maximum?
print(np.flatnonzero(table[1] == table[1].max()))   # the positions of those entries
print(table[0].any(), np.zeros(3).any())  # .any(): is at least one entry non-zero?
print(np.zeros((3, 4)).shape)             # a fresh all-zero table
print(np.eye(3))                          # identity matrix: 1s on the diagonal, 0 elsewhere
print(np.eye(3)[1])                       # row 1 of it: a "one-hot" vector [0, 1, 0]
```

```output
[4. 1.]
[3 0]
[ True  True False False]
[0 1]
True False
(3, 4)
[[1. 0. 0.]
 [0. 1. 0.]
 [0. 0. 1.]]
[0. 1. 0.]
```

**What every line does.**

- The array `table` has 2 rows ("cells") and 4 columns ("actions"), like a tiny Q-table.
- `axis=1` means "work along each row, collapsing the columns", giving **one answer per row**. (`axis=0` would give one answer per column.) Memory aid: the axis you name is the one that disappears from the shape.
- `table.max(axis=1)` is the best number in each row: `[4. 1.]`. `table.argmax(axis=1)` is the *position* of the best number in each row: `[3 0]`.
- `table[1] == table[1].max()` marks which entries of row 1 equal that row's maximum (several can tie). `np.flatnonzero(mask)` returns the **positions** where the mask is True. We use this to pick randomly among tied-best actions.
- `.any()` is True if at least one entry is non-zero. We use it to detect a row that has never been touched.
- `np.zeros((3, 4))` makes a 3x4 array of zeros, the shape of a fresh table.
- `np.eye(3)` is the **identity matrix**: 1s on the diagonal. Each of its rows has a single 1 and the rest 0s. A vector like `[0, 1, 0]` is called **one-hot**: it "switches on" one position. We will use it to tell a neural network which cell the agent is in.

`[4. 1.]` and `[3 0]`: the best per row and where it sits. `[ True True False False]` marks row 1's two tied maximums (positions 0 and 1), and `[0 1]` lists those positions. `True False` shows that the first row has a non-zero entry and the zero array does not. `(3, 4)` is the shape. The identity matrix prints as three rows each with one 1, and `np.eye(3)[1]` is `[0. 1. 0.]`, a one-hot vector for item 1.

**Try this yourself.** Predict: what does `table.max(axis=0)` give? (One answer per column.)

## Step 3: Random numbers, tuples, dictionaries, deque and global

**Why we need this.** A grab-bag of Python tools used later. Randomness drives exploring; a **dictionary** and a **deque** are used by the shortest-path check; `global` lets a function change a name defined outside it.

```python type
import random
from collections import deque             # a list that is fast to take items off the front of

random.seed(42)
print(random.random())                    # decimal between 0 and 1
print(random.randrange(4))                # whole number 0, 1, 2 or 3
print(random.choice([10, 20, 30]))        # one item picked at random

def add(x, y):                            # a function: inputs x and y, result handed back
    return x + y

cell = (1, 2)                             # a tuple: a fixed pair
row, col = cell                           # unpacking
print(add(row, col))

distance = {(0, 0): 0}                    # a dictionary: look things up by key
distance[(0, 1)] = 1                      # add an entry
print((0, 1) in distance, (5, 5) in distance)   # "in" asks whether a key exists
print(distance[(0, 1)])

line = deque([(0, 0)])                    # a waiting line holding one item
line.append((0, 1))                       # join at the back
print(line.popleft())                     # take from the front -> (0, 0)
print(len(line))

counter = 0
def bump():
    global counter                        # "global" lets a function CHANGE an outside name
    counter += 1
bump(); bump()
print(counter)
```

```output
0.6394267984578837
0
30
3
True False
1
(0, 0)
1
2
```

**What every line does.**

- `random.seed(42)` fixes the starting point of the random sequence, so results repeat. `random.random()` gives a decimal between 0 and 1; `random.randrange(4)` gives a whole number 0 to 3; `random.choice([...])` picks an item.
- `def add(x, y): return x + y` defines a function: a named recipe with inputs and a returned result. The indented line belongs to it.
- `cell = (1, 2)` is a **tuple**, a fixed pair. `row, col = cell` **unpacks** it into two names.
- `distance = {(0, 0): 0}` is a **dictionary**: a set of key-to-value pairs, looked up by key. `distance[(0, 1)] = 1` adds an entry. `(0, 1) in distance` asks whether that key exists. Tuples can be keys; lists cannot.
- `deque([(0, 0)])` is a waiting line. `.append(x)` joins at the back, `.popleft()` takes from the front (fast, unlike a list's `pop(0)`). `len(line)` counts the items.
- `global counter` inside `bump()` lets the function *change* the outside variable. Without it, `counter += 1` would fail, because Python would treat `counter` as a new name inside the function.

`0.6394267984578837` is the famous first number of seed 42 (the next two depend on the Python version, so small differences there are fine). `3` is `add(1, 2)`. `True False` answers the two `in` questions. `1` is `distance[(0, 1)]`. `(0, 0)` is the first item taken from the front of the line (the one that joined first), and `1` item remains. `2` is the counter after two calls.

## Part B: the maze world

An **environment** is the part of the system that, given where you are and what you try, tells you what happens. The agent will live inside it, and never see how it works. We build it ourselves.

## Step 4: Describing the maze as text, and loading it

**Why we need this.** It is easiest to *draw* a maze as text and have code convert the drawing into data. Each string is one row. This also lets us load a different maze later by passing different text.

```python type
SMALL = [
    "S....",                              # S = start
    "##.#.",                              # # = wall
    ".....",                              # . = open
    ".####",                              # G = goal
    "....G",
]

def load_maze(text):
    global MAZE_TEXT, ROWS, COLS, walls, START, GOAL      # these names live outside the function
    MAZE_TEXT = text
    ROWS = len(text)                      # number of strings = number of rows
    COLS = len(text[0])                   # length of the first string = number of columns
    walls = np.zeros((ROWS, COLS), dtype=int)
    for r in range(ROWS):
        for c in range(COLS):
            ch = text[r][c]               # character at row r, column c
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

**What every line does.**

- `SMALL` is a list of 5 strings. `S` = start, `G` = goal, `#` = wall, `.` = open. The goal is straight below the start, but walls force a long detour.
- `def load_maze(text):` converts the drawing to data. `global MAZE_TEXT, ROWS, ...` lists names living outside the function that we want to **assign**; without `global`, the assignments would create separate local names that vanish when the function ends.
- `len(text)` is the number of strings, i.e. rows. `len(text[0])` is the length of the first string, i.e. columns.
- `np.zeros((ROWS, COLS), dtype=int)` makes a grid of whole-number zeros, same size as the maze.
- The two nested `for` loops visit every row `r` and column `c`. `text[r][c]` first picks the string for row `r`, then the character at position `c`.
- A `#` puts a 1 in `walls`. An `S` or `G` records `START` or `GOAL` as a `(row, column)` tuple. A `.` needs no action.
- `load_maze(SMALL)` runs it, and the `print`s show the result.

The `walls` array matches the picture: row 1 is `##.#.`, so it prints `[1 1 0 1 0]`. Rows count downward from 0 and columns rightward from 0, so `(0, 0)` is the top-left and `(4, 4)` the bottom-right. **A position is always (row, column), row first.** There are two routes to the goal: a short one through the gap at `(1, 2)`, and a longer one around the right side and back through `(2, 4)` and `(2, 3)`.

**Try this yourself.** Add a `#` somewhere to a copy of `SMALL` and call `load_maze` on it. Does the `walls` array change where you expect? (Remember to run `load_maze(SMALL)` again afterwards.)

## Step 5: Giving every cell a single number

**Why we need this.** The Q-table needs one row per cell, so each `(row, col)` pair must become one whole number. We number the cells the way you read a page: left to right, top to bottom.

```python type
def state_of(cell):
    return cell[0] * COLS + cell[1]       # count cells left to right, top to bottom

def cell_of(state):
    return divmod(state, COLS)            # divmod(a, b) -> (a // b, a % b): quotient, remainder

print(state_of((0, 0)), state_of((1, 2)), state_of(GOAL))
print(cell_of(7), cell_of(24))
print(divmod(17, 5))                      # 17 = 3 x 5 + 2  -> (3, 2)
n_states = ROWS * COLS
print(n_states)
```

```output
0 7 24
(1, 2) (4, 4)
(3, 2)
25
```

**What every line does.**

- `state_of(cell)` computes `row * COLS + col`. For `(1, 2)` in a 5-wide maze: `1 x 5 + 2 = 7`: skip one full row of 5, then 2 more.
- `cell_of(state)` reverses it with `divmod(state, COLS)`. `divmod(a, b)` returns the quotient and the remainder of `a / b` together: for 7 and 5 that is `(1, 2)`, which are the row and column.
- The third `print` shows `divmod(17, 5)` on its own: `17 = 3 x 5 + 2`, so `(3, 2)`.
- `n_states = ROWS * COLS` is the number of cells (25), wall cells included. Their rows will simply never be used.

`0 7 24`: the start is state 0, `(1, 2)` is state 7, and the goal `(4, 4)` is state 24. `cell_of(7)` gives back `(1, 2)` and `cell_of(24)` gives `(4, 4)`. `(3, 2)` is the quotient and remainder of 17 divided by 5. `25` is the total.

**Try this yourself.** By hand: what is `state_of((3, 0))`? And `cell_of(13)`? (Answers: 15, and `(2, 3)`.)

## Step 6: What happens when the agent moves

**Why we need this.** This is the **environment's transition function**: given where you are and what you try, it returns what happens: the new position, a reward, and whether the episode is over. Choosing the reward numbers is how *you* tell the agent what you want.

```python type
ACTIONS = [(-1, 0), (1, 0), (0, -1), (0, 1)]    # up, down, left, right as (row change, col change)
NAMES = ["up", "down", "left", "right"]

STEP_REWARD = -1                          # every ordinary move costs 1
WALL_REWARD = -5                          # bumping a wall or the edge costs 5
GOAL_REWARD = 10                          # reaching the goal pays 10

def step(cell, action):
    d_row, d_col = ACTIONS[action]
    row = cell[0] + d_row                 # where the move WOULD put us
    col = cell[1] + d_col
    if row < 0 or row >= ROWS or col < 0 or col >= COLS or walls[row, col] == 1:
        return cell, WALL_REWARD, False   # blocked: stay where we are
    if (row, col) == GOAL:
        return (row, col), GOAL_REWARD, True     # done = True ends the episode
    return (row, col), STEP_REWARD, False

print(step((0, 0), 3))                    # right from the start: a normal move
print(step((0, 0), 0))                    # up from the top-left corner: off the grid
print(step((0, 1), 1))                    # down into the wall at (1, 1)
print(step((4, 3), 3))                    # right into the goal
```

```output
((0, 1), -1, False)
((0, 0), -5, False)
((0, 1), -5, False)
((4, 4), 10, True)
```

**What every line does.**

- `ACTIONS` lists the four moves as `(row change, column change)`. Up is `-1` in the row, because row 0 is at the top. Their numbers (0 to 3) are the column positions in the Q-table.
- The three reward constants: every ordinary move costs 1 (so dawdling is penalised), bumping a wall or the edge costs 5 (so the agent learns not to try impossible moves), reaching the goal pays 10.
- `step(cell, action)`: unpack the action's change, then compute the *candidate* position `(row, col)`.
- If the candidate is outside the grid (`row < 0 or row >= ROWS or col < 0 or col >= COLS`) **or** is a wall (`walls[row, col] == 1`), the agent stays where it is: we return the *old* `cell`, the wall penalty, and `False` (not finished). The bounds are tested first, and Python stops evaluating an `or` chain at the first true part, so `walls[row, col]` is never read with an out-of-range index.
- If the candidate is the goal, return it with the goal reward and `True` (episode finished).
- Otherwise it is an ordinary move.
- The function returns **three** values at once (a tuple); callers unpack them: `next_cell, reward, done = step(...)`.

Right from the start gives `((0, 1), -1, False)`: a normal move. Up from the top-left corner is off the grid, so the agent stays at `(0, 0)` and gets `-5`. Down from `(0, 1)` runs into the wall at `(1, 1)`: stays at `(0, 1)`, `-5`. Right from `(4, 3)` enters the goal: `((4, 4), 10, True)`.

## Step 7: The true shortest path (only for checking our work)

**Why we need this.** The learning agent never sees the maze. But *we* can compute the true answer, so we can later tell whether the agent found the best route. The method is **breadth-first search** (BFS): explore outward from the start one ring of cells at a time. The first time you reach the goal, it is by a shortest route.

```python type
def bfs():
    dist = {START: 0}                     # steps needed to reach each cell found so far
    queue = deque([START])                # cells waiting to be explored
    while queue:                          # while the line is not empty
        cell = queue.popleft()            # take the cell at the front
        if cell == GOAL:
            return dist[cell]
        for action in range(4):
            nxt, _, _ = step(cell, action)    # "_" = a value we do not need
            if nxt not in dist:           # a cell we have not reached before
                dist[nxt] = dist[cell] + 1
                queue.append(nxt)         # explore it later
    return None

print(bfs())
```

```output
12
```

**What every line does.**

- `dist` is a dictionary from each cell found so far to the number of steps needed to reach it. The start is 0 steps away.
- `queue` is a `deque` (a waiting line) of cells still to explore.
- `while queue:` repeats while the line is non-empty. `queue.popleft()` takes the cell at the front.
- If it is the goal, return its distance. Because we explore the closest cells first, this is the shortest.
- Otherwise try all four actions with `step`. `nxt, _, _ = step(...)` unpacks three values but keeps only the first (`_` is a throwaway name for values we do not need). A blocked move returns the same cell, which is already in `dist`, so nothing happens.
- For each *new* neighbour (`nxt not in dist`) we record its distance as one more than the current cell's, and add it to the back of the line.

`12`: the shortest route is 12 steps. Remember this number. The straight-line "Manhattan" distance from `(0, 0)` to `(4, 4)` is only `4 + 4 = 8`; the walls make the true route longer, which is why this maze is interesting.

## Part C: Q-learning

First what the agent is trying to maximise, then the table, then the rule that fills it in.

## Step 8: The return: what the agent is really maximising

**Why we need this.** The agent does not care only about the next reward; it cares about the *total from now on*, with later rewards counted slightly less (the **discount factor**, gamma). That total is the **return**. Here we compute the return of the best route by hand, because later the learned table must agree with it.

```python type
rewards = [-1] * 11 + [10]                # the best route: 11 ordinary steps, then the goal step
gamma = 0.95
total = 0.0
for k, r in enumerate(rewards):           # k = 0, 1, 2, ... ; r = that step's reward
    total += (gamma ** k) * r             # a reward k steps away is worth gamma**k of its value
print(round(total, 3))
```

```output
-2.936
```

**What every line does.**

- The best route takes 12 steps: eleven ordinary steps costing -1 each, then the final step into the goal paying +10. `[-1] * 11 + [10]` builds that list of 12 rewards (`*` repeats the list, `+` joins two lists).
- `gamma = 0.95`.
- `enumerate(rewards)` hands out pairs: the position `k` (0, 1, 2, ...) and the reward `r`.
- `total += (gamma ** k) * r` adds each reward, multiplied by `gamma` raised to the power `k`: a reward `k` steps in the future is worth `0.95 ** k` of its face value. `+=` means "add to what is already there".
- `round(total, 3)` rounds for display.

`-2.936`. The eleven penalties add up to about `-8.62` once discounted, and the goal prize `10 x 0.95**11 = 5.69` cancels about two-thirds of that damage. Hold on to **-2.936**: it is the true value of starting at the start and walking the best route. Q-learning will rediscover this exact number without anyone telling it. A very useful way to read any Q-value: *it is the discounted return of the best plan from that situation.*

**Try this yourself.** Change `gamma` to `0.5`. What do you predict, and why is the goal's prize now almost worthless from the start cell?

## Step 9: The Q-table, and two ways to look at it

**Why we need this.** **Q(s, a)** is the agent's estimate of the return from taking action `a` in cell `s` and playing well afterwards. We store it in an array: one row per cell, one column per action. Two display helpers let us *see* the table, which is how you understand it.

```python type
Q = np.zeros((n_states, 4))               # 25 rows (cells) x 4 columns (actions)

def show_values(Q):
    values = Q.max(axis=1)                # best number in each row: 25 numbers
    for r in range(ROWS):
        line = ""
        for c in range(COLS):
            if walls[r, c] == 1:
                line += "  ###  "
            else:
                line += f"{values[state_of((r, c))]:6.1f} "    # 6 wide, 1 decimal
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
            elif not Q[s].any():          # row is all zeros: nothing learned yet
                ch = "?"
            else:
                ch = ARROWS[int(np.argmax(Q[s]))]
            line += ch + " "
        print(line)

print(Q.shape)
show_values(Q)
show_policy(Q)
```

```output
(25, 4)
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

**What every line does.**

- `np.zeros((n_states, 4))` makes 25 rows and 4 columns of 0.0. Zero means "I know nothing yet".
- `show_values`: `Q.max(axis=1)` takes the best number in each row (25 numbers), the "how good is it to be here?" map. The loops print it as a 5x5 grid; walls print as `###`. The f-string `{value:6.1f}` formats a decimal 6 characters wide with 1 decimal place.
- `show_policy`: for each cell, draw an arrow for its best action: `ARROWS[int(np.argmax(Q[s]))]` looks up the arrow for the position of the best number. Walls print `#`, the goal prints `G`.
- `elif not Q[s].any():` prints `?` when a row is entirely zero. `argmax` of an all-zero row would give "up" meaninglessly, so we avoid drawing a misleading arrow for cells the agent has never learned about.

`(25, 4)`: 25 rows, 4 columns. The value map is all `0.0` and the policy map is all `?` (with `#` for walls and `G` for the goal). This is the starting point, a blank page.

## Step 10: Choosing an action: explore or exploit

**Why we need this.** If the agent always did what looks best now, it would never find out whether something untried is better. So with probability **epsilon** it acts randomly (**explores**), otherwise it takes the best-known action (**exploits**). This is *epsilon-greedy*.

```python type
def choose_action(Q, s, epsilon):
    if random.random() < epsilon:         # explore with probability epsilon
        return random.randrange(4)
    row = Q[s]
    best = np.flatnonzero(row == row.max())    # positions of all tied-best actions
    return int(random.choice(best))       # pick one of them at random

random.seed(0)
Q = np.zeros((n_states, 4))
s = state_of((2, 2))
print([choose_action(Q, s, 0.0) for _ in range(8)])    # all tied: a random mix
Q[s, 3] = 5.0
print([choose_action(Q, s, 0.0) for _ in range(8)])    # one clear best: always action 3
print([choose_action(Q, s, 1.0) for _ in range(8)])    # always explore
```

```output
[3, 3, 2, 2, 1, 2, 0, 2]
[3, 3, 3, 3, 3, 3, 3, 3]
[0, 3, 0, 2, 2, 0, 1, 1]
```

**What every line does.**

- `random.random() < epsilon` is true with probability `epsilon` (0.1 means 10% of the time); then return a random action 0 to 3.
- `row = Q[s]` is this cell's four numbers.
- `row == row.max()` is a True/False array marking which entries equal the biggest (several can tie). `np.flatnonzero(...)` turns that into their positions.
- `random.choice(best)` picks one of the tied actions at random. Plain `argmax` would always pick action 0 on a tie, building a hidden bias (and every untrained row is a four-way tie).
- `int(...)` converts numpy's integer type to a plain Python one.
- The tests use `epsilon` 0.0 (never explore), then 1.0 (always explore).

With an all-zero row, all four actions tie, so the choices are a mix of 0, 1, 2 and 3. After `Q[s, 3] = 5.0`, action 3 is the unique best, so every choice is `3`. With `epsilon = 1.0` the table is ignored and the choices are random again.

## Step 11: One update, printed: the ripple from the goal

**Why we need this.** This is the whole of Q-learning. `trace_step` performs one update and prints every number, so you can see exactly what it does. Then we play four updates by hand along the bottom row.

```python type
ALPHA = 0.5                               # learning rate
GAMMA = 0.95                              # discount factor

def trace_step(Q, cell, action):
    s = state_of(cell)
    next_cell, reward, done = step(cell, action)
    s_next = state_of(next_cell)
    old = Q[s, action]                    # the one box we will change
    best_next = 0.0 if done else Q[s_next].max()    # best belief about where we landed
    target = reward + GAMMA * best_next   # what the box should be, given what we saw
    new = old + ALPHA * (target - old)    # move ALPHA of the way toward it
    Q[s, action] = new                    # the ONLY write to the table
    print(f"at {cell} (row {s}) action {NAMES[action]} -> lands {next_cell} (row {s_next}), reward {reward}")
    print(f"   old {old:.3f} | best_next {best_next:.3f} | target {reward} + {GAMMA} * {best_next:.3f} = {target:.3f} | new {new:.3f}")

Q = np.zeros((n_states, 4))
trace_step(Q, (4, 3), 3)                  # right, into the goal
trace_step(Q, (4, 2), 3)                  # right, onto the cell we just updated
trace_step(Q, (4, 1), 3)
trace_step(Q, (4, 3), 3)                  # the goal step again
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

**What every line does.**

- `ALPHA` (learning rate): how far we move toward a new estimate; 0.5 is halfway. `GAMMA`: the discount factor from Step 8.
- `s` is the row number of the cell we are in. `step(...)` asks the environment what happens.
- `old = Q[s, action]` is the one box we are about to change.
- `best_next` is the best number in the row of the cell we *landed in*, except `0.0` if the episode ended (nothing can be earned after the goal). **Key point:** `old` comes from the row we *left*; `best_next` from the row we *arrived at*.
- `target = reward + GAMMA * best_next`: what we got now, plus a discounted look at what we expect next. It is our new opinion of what the box should hold.
- `new = old + ALPHA * (target - old)`: move part of the way from the old belief toward the target. `target - old` is the *error*.
- `Q[s, action] = new` writes **one box**. Nothing else in the table changes.
- The four calls place the agent by hand next to the goal (this is not how training works, but it isolates the mechanism).

Read the four updates in order. (1) At `(4, 3)`, right, into the goal: reward 10, no future. Target 10, new `0.5 x 10 =` **5.0**. (2) At `(4, 2)`, right, landing on `(4, 3)`: reward -1; `best_next` is now **5.0** (what step 1 just learned). Target `-1 + 0.95 x 5 = 3.75`; new `0.5 x 3.75 =` **1.875**. (3) At `(4, 1)`: `best_next` 1.875, target 0.781, new **0.391**. (4) Back at `(4, 3)` to the goal again: old 5.0, target 10, new `5 + 0.5 x 5 =` **7.5**. The value map's bottom row is `0.0 0.4 1.9 7.5 0.0`. **That is the ripple.** Step 2's cell had no idea where the goal was; it learned only because the cell it landed in had already learned. Good news flows *backward* from the goal, one cell per update. The goal cell itself stays `0.0`, because we never leave it, so its row is never updated.

**Try this yourself.** Predict the new value if you now run `trace_step(Q, (4, 2), 3)` a second time. (old 1.875, best_next 7.5, target `-1 + 0.95 x 7.5 = 6.125`, new `1.875 + 0.5 x (6.125 - 1.875) = 4.0`.)

## Step 12: How the table learns that walls are bad

**Why we need this.** The same update handles bad news just as well as good news. We press "down" from `(2, 2)`, where there is a wall below, twice.

```python type
Q = np.zeros((n_states, 4))
trace_step(Q, (2, 2), 1)                  # "down" from (2, 2): into a wall
print(Q[state_of((2, 2))])
trace_step(Q, (2, 2), 1)                  # the same bump again
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

**What every line does.**

- A new zero table, then `trace_step` on action 1 (down) from `(2, 2)`. The environment returns the *same* cell with reward -5 (the wall penalty), so `s_next` equals `s`.
- `best_next` is the best of that cell's row, which is still all zeros, so 0.
- The `print(Q[...])` lines show the whole row for that cell after each update.

First press: old 0, target `-5 + 0 = -5`, new `0.5 x -5 =` **-2.5**. The row is `[0, -2.5, 0, 0]`: only the "down" box changed. Second press: old -2.5, target again -5, new `-2.5 + 0.5 x (-5 + 2.5) =` **-3.75**, creeping toward -5. **Why this teaches the agent to avoid walls:** the three other boxes are still 0, and 0 is *better* than -3.75, so `argmax` now prefers the untried actions. Bad news pushes the agent toward alternatives. (Notice that because every real reward here is negative, a fresh table of zeros quietly encourages exploring: untried boxes look better than tried ones. Experiment 1 returns to this.)

## Step 13: The training loop

**Why we need this.** One **episode** is one attempt from the start to the goal (or a step limit). `train` runs many of them, applying the update thousands of times, while epsilon shrinks so the agent explores a lot early and exploits later.

```python type
def train(episodes, alpha=0.5, gamma=0.95, eps_start=1.0, eps_min=0.05,
          eps_decay=0.99, max_steps=200, Q=None, stop_when_optimal=False):
    if Q is None:                         # no table given: start a fresh one
        Q = np.zeros((ROWS * COLS, 4))
    shortest = bfs()
    epsilon = eps_start
    history = []                          # steps taken in each episode
    for episode in range(episodes):
        cell = START
        for t in range(max_steps):
            s = state_of(cell)
            a = choose_action(Q, s, epsilon)
            next_cell, reward, done = step(cell, a)
            s_next = state_of(next_cell)

            best_next = 0.0 if done else Q[s_next].max()
            target = reward + gamma * best_next
            Q[s, a] += alpha * (target - Q[s, a])     # the whole algorithm

            cell = next_cell
            if done:
                break
        epsilon = max(eps_min, epsilon * eps_decay)   # explore a little less each episode
        history.append(t + 1)
        if stop_when_optimal:             # used by the experiments later
            p = greedy_path(Q)
            if p is not None and len(p) - 1 == shortest:
                break
    return Q, history

def greedy_path(Q, max_len=50):
    cell = START
    path = [cell]
    for _ in range(max_len):
        a = int(np.argmax(Q[state_of(cell)]))
        cell, _, done = step(cell, a)
        path.append(cell)
        if done:
            return path
    return None                           # never reached the goal (a loop)

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

**What every line does.**

- The inputs have default values, so `train(300)` works. `Q=None` means "start a fresh table", but if you pass an existing table training continues it (used in Step 15). `stop_when_optimal` is for the experiments: when true, training stops as soon as the table's greedy path equals the true shortest.
- Setup: `shortest = bfs()` is the true answer; `epsilon` starts at 1.0 (always explore); `history` will record the steps in each episode.
- Outer loop: one pass per episode, starting at `START`. Inner loop `for t in range(max_steps)`: at most 200 steps, so a wandering agent cannot run forever.
- Each step: row `s`, choose an action, ask `step`, find `s_next`, compute `best_next` (0 if done), `target`, and apply `Q[s, a] += alpha * (target - Q[s, a])`. That one line is the algorithm.
- `cell = next_cell` moves the agent; `if done: break` leaves the inner loop at the goal.
- After each episode, `max(eps_min, epsilon * eps_decay)` shrinks epsilon by 1% but never below 0.05. `history.append(t + 1)` records the number of steps (`t` starts at 0, so `t + 1` is the count; a timed-out episode shows 200).
- `greedy_path` follows the best action from the start, with no randomness, until the goal. `max_len=50` stops it looping forever on a badly trained table; it returns `None` then.
- The last loop prints the average episode length in blocks of 50 episodes.

The first twelve episodes took `[200, 103, 200, 200, 121, ...]` steps: mostly random wandering (200 means it timed out). The block averages then fall from **71.2** steps to 23.5, 17.7, 15.2, 13.9 and **13.0**. They approach the shortest path of 12 but do not reach it, because epsilon never drops below 0.05, so about one move in twenty is still random. **A perfect table can still produce imperfect episodes.**

## Step 14: Reading the learned table

**Why we need this.** Now look at what the agent learned: the value map, the arrow map, the path it follows, and one very important number.

```python type
show_values(Q)
print()
show_policy(Q)

path = greedy_path(Q)
print(path)
print("learned path length:", len(path) - 1, " shortest possible:", bfs())
print("Q at start, best action:", round(Q[state_of(START)].max(), 3))
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
[(0, 0), (0, 1), (0, 2), (1, 2), (2, 2), (2, 1), (2, 0), (3, 0), (4, 0), (4, 1), (4, 2), (4, 3), (4, 4)]
learned path length: 12  shortest possible: 12
Q at start, best action: -2.936
```

**What every line does.**

- `show_values(Q)` prints the best value per cell; `show_policy(Q)` the arrow of the best action.
- `greedy_path(Q)` follows the policy from the start and returns the list of cells visited. `len(path) - 1` is the number of steps (13 cells make 12 steps).
- The last line prints the best value in the start cell's row.

The values rise steadily along the route: `-2.9, -2.0, -1.1, -0.1` down through the gap, then `1.0, 2.1, 3.2, 4.4, 5.7, 7.1, 8.5, 10.0` to the goal. **Check the rule by hand:** a cell's value should be `-1 + 0.95 x (value of the next cell on its best route)`. For `(4, 2)`: `-1 + 0.95 x 10.0 = 8.5` ✓. For `(4, 1)`: `-1 + 0.95 x 8.5 = 7.075` ✓ (shown as 7.1). When every number agrees with its neighbour like this, the table has **converged** (this self-consistency is called the Bellman equation). The arrows lead from every visited cell back to the route: the dead-end cells `(0, 3)` and `(0, 4)` point left, away from the dead end. The path has length **12**, equal to the BFS answer. And the final line prints **-2.936**, *exactly the number you computed by hand in Step 8*. The agent was never told about discounting or routes; its table converged to the true value of the best plan.

## Step 15: Watching the wave spread

**Why we need this.** Learning is a wave moving backward from the goal. To see it, we train the *same* table in stages and print it after each.

```python type
Q = np.zeros((n_states, 4))
for total in (1, 5, 20, 100):
    random.seed(total)
    train(total, Q=Q, eps_start=0.3, eps_decay=1.0)      # keep training the SAME table
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

**What every line does.**

- A fresh table, then for each of `1, 5, 20, 100` we run `train(total, Q=Q, ...)`. Because we pass `Q=Q`, training continues the table, and since numpy arrays are changed in place, `Q` keeps the progress.
- `eps_start=0.3, eps_decay=1.0` holds epsilon constant at 0.3 (multiplying by 1.0 changes nothing).
- A new seed each time keeps each stage repeatable.

**After 1 episode:** the cell beside the goal, `(4, 3)`, already holds `5.0`; the bottom row elsewhere is small negative numbers (`(4, 2)` is still `0.0`). **After 5 more:** the bottom row reads `0.4, 4.1, 7.8, 9.8`; the goal's value is spreading backward along it. **After 20 more:** the bottom row and left column are essentially their final values from Step 14. **After 100 more:** the top row near the start is `-2.9, -2.0, -1.1`, final. The cells in the dead end on the right (`-5.9`, `-5.7`, `-5.6`) are still *stale*: a box is only updated when the agent visits it, and with epsilon 0.3 it spends little time there. **The table is correct only where the wave has passed.**

## Part D: experiments

**Change one thing, write down a prediction, then run.** Each line reports: how many episodes it took before the table's greedy path equalled the true shortest path (for 5 different random seeds, with `None` meaning it never managed it in 2000 episodes), the mean of those, and the average total number of moves made while learning (a measure of how costly the learning was).

## Step 16: A helper that measures how fast a setting learns

**Why we need this.** To compare settings fairly we need a measurement. This helper trains the agent from scratch with 5 different seeds and reports how many episodes it took for the table to produce the true shortest path.

```python type
def experiment(label, trainer=None, seeds=range(5), episodes=2000, rewards=None, **settings):
    global STEP_REWARD, WALL_REWARD, GOAL_REWARD
    trainer = trainer or train
    saved = (STEP_REWARD, WALL_REWARD, GOAL_REWARD)
    try:
        if rewards is not None:
            STEP_REWARD, WALL_REWARD, GOAL_REWARD = rewards
        shortest = bfs()
        solved_at, costs = [], []
        for seed in seeds:
            random.seed(seed)
            Q_run, hist = trainer(episodes, stop_when_optimal=True, **settings)
            path = greedy_path(Q_run)
            ok = path is not None and len(path) - 1 == shortest
            solved_at.append(len(hist) if ok else None)
            costs.append(sum(hist))
    finally:
        STEP_REWARD, WALL_REWARD, GOAL_REWARD = saved
    good = [x for x in solved_at if x is not None]
    mean_solved = round(sum(good) / len(good), 1) if good else None
    print(f"{label:22s} episodes to shortest path: {solved_at}  mean {mean_solved}  avg total steps {round(sum(costs) / len(costs))}")

experiment("baseline")
experiment("no exploring", eps_start=0.0, eps_min=0.0)
experiment("alpha=0.01", alpha=0.01)
experiment("gamma=0.0", gamma=0.0, episodes=300)
experiment("wall bump costs 0", episodes=300, rewards=(-1, 0, 10))
```

```output
baseline               episodes to shortest path: [5, 6, 8, 7, 7]  mean 6.6  avg total steps 1128
no exploring           episodes to shortest path: [10, 13, 10, 12, 14]  mean 11.8  avg total steps 489
alpha=0.01             episodes to shortest path: [142, 213, 7, 105, 226]  mean 138.6  avg total steps 11611
gamma=0.0              episodes to shortest path: [None, None, None, None, None]  mean None  avg total steps 44045
wall bump costs 0      episodes to shortest path: [None, None, None, None, None]  mean None  avg total steps 47410
```

**What every line does.**

- `trainer=None` lets us pass in a different learning function later (functions can be passed around like any value); `trainer or train` falls back to `train` when none is given.
- `rewards` temporarily overrides the three reward constants. `global ...` allows the function to change those outside names, and `saved` remembers the originals.
- `try: ... finally:` guarantees the code under `finally` runs **even if something crashes**, so the rewards are always restored and one experiment cannot contaminate the next.
- For each seed: `random.seed(seed)`, train with `stop_when_optimal=True`, then check that the learned path really is the shortest. If so we record how many episodes were used (`len(hist)`), otherwise `None`. `costs` records total moves made.
- `**settings` collects extra named inputs (like `alpha=0.01`) and passes them on to the trainer.
- The final f-string prints a row: `{label:22s}` pads the label so the rows line up.
- Five experiments follow: the baseline, no exploring, a tiny alpha, gamma zero, and a wall bump that costs nothing. The last two never find the path, so they would play every one of their episodes; `episodes=300` stops them sooner, which is plenty to show that they fail and keeps the cell to a few seconds.

**Baseline:** the shortest path is found after `[5, 6, 8, 7, 7]` episodes, about **6.6** on average, for about 1128 moves. (Only about seven episodes, even though Step 13's average episode length took 300 episodes to settle near 13. Those are different questions: the *table* becomes right quickly, while the *behaviour* stays noisy because epsilon is still high.)

**No exploring: 11.8 episodes, but only 489 moves.** Slower to find the path, but much cheaper, because it never wastes moves on random choices. It works only because the rewards here are *negative*: tried boxes drop below 0 while untried ones sit at 0, so the agent keeps trying untried actions on its own (this is called optimistic initialisation). In CartPole all the rewards were positive, and `epsilon = 0` made the agent get stuck.

**Alpha 0.01: 138.6 episodes**, twenty times slower, since each update moves a box only 1% of the way.

**Gamma 0: never.** With `gamma = 0` the target is just the reward, so only the cell next to the goal learns anything; no information ripples backward and the path is never found.

**Wall bump costs 0: never.** The total of about 47,000 moves over 300 episodes means about 160 moves per episode, most of them running into the 200-move limit. A normal move costs -1 but bumping a wall costs 0, so *standing still beats moving*, and the agent learned to push into walls. **The agent maximises the reward you give it, not what you meant.** This is the most common bug in reinforcement-learning projects.

**Try this yourself.** Predict, then run, one more: `experiment("alpha=1.0", alpha=1.0)`. In CartPole this failed. Will it here? (It works, about as fast as the baseline, because this maze is deterministic and every cell has its own row, so the newest sample is always exactly right.)

## Part E: beyond a table that learns by trial and error

Q-learning is one way to find the numbers in the table. Here are three others, and each one teaches you something about Q-learning itself.

## Step 17: Value iteration: computing the answer directly

**Why we need this.** We have been *learning* the table by trial and error. But the maze is small and we know exactly how it behaves, so we can compute the table directly. This method is **value iteration**. It "cheats" by consulting the environment's rules, which a real learner would not be allowed to do, but it gives us the perfect answer to compare against.

```python type
def value_iteration(gamma=0.95, max_sweeps=200):
    Q = np.zeros((ROWS * COLS, 4))
    for sweep in range(max_sweeps):
        biggest_change = 0.0
        for s in range(ROWS * COLS):
            cell = cell_of(s)
            if walls[cell] == 1 or cell == GOAL:   # nothing to compute in walls or the goal
                continue
            for a in range(4):
                next_cell, reward, done = step(cell, a)     # we ASK the environment: cheating!
                best_next = 0.0 if done else Q[state_of(next_cell)].max()
                new = reward + gamma * best_next            # no alpha: write the full answer
                biggest_change = max(biggest_change, abs(new - Q[s, a]))
                Q[s, a] = new
        if biggest_change < 1e-9:         # nothing changed any more: finished
            return Q, sweep + 1
    return Q, max_sweeps

Q_exact, sweeps = value_iteration()
print("sweeps needed:", sweeps)
show_values(Q_exact)
print()
show_policy(Q_exact)
print(round(Q_exact[state_of(START)].max(), 3), "vs the return computed by hand in M5")
```

```output
sweeps needed: 12
  -2.9   -2.0   -1.1   -2.0   -2.9
  ###    ###    -0.1   ###    -2.0
   3.2    2.1    1.0   -0.1   -1.1
   4.4   ###    ###    ###    ###
   5.7    7.1    8.5   10.0    0.0

> > v < v
# # v # v
v < < < <
v # # # #
> > > > G
-2.936 vs the return computed by hand in M5
```

**What every line does.**

- The table starts at zeros. One **sweep** visits every cell and recomputes all four boxes: `new = reward + gamma * best_next`. There is no `alpha`: we write the full new value, since we are not averaging noisy samples.
- `if walls[cell] == 1 or cell == GOAL: continue` skips walls and the goal (`walls[cell]` works because a tuple can index an array). `continue` jumps to the next pass of the loop.
- `step(cell, a)` asks the environment what each action does, which is the cheat: the learning agent never gets to ask "what would happen if...?" without actually doing it.
- `biggest_change` tracks the largest change in the sweep. When it falls below `1e-9` (a tiny number, 0.000000001) nothing is changing any more, and we stop. We return the table and the number of sweeps used.
- The last line compares the start cell's best value with the number computed by hand in Step 8.

**12 sweeps** gave the exact table. (Information travels one cell per sweep, and the farthest cell is 12 steps from the goal.) The value map is the same as the learned one on the route: `-2.9, -2.0, -1.1, ..., 10.0`. The start's best value prints **-2.936**: the *same number three ways*: computed by hand (Step 8), found by value iteration, and learned by Q-learning (Step 14). One small difference in the arrows: at `(0, 4)` value iteration points down while the learned table pointed left. That is not an error: both routes from there cost the same, so it is an exact tie and `argmax` simply picks the first. **Q-learning is a way of solving the same equations by sampling, when you are not allowed to look at the rules.**

## Step 18: How close did the learner get?

**Why we need this.** Now we can measure the learner against the exact answer.

```python type
random.seed(0)
Q_learned, _ = train(300)

visited = Q_learned != 0                  # True where the agent ever updated the box
gap = np.abs(Q_learned - Q_exact)         # difference, box by box
print("boxes the agent updated:", visited.sum(), "of", visited.size)
print("biggest gap on those boxes:", round(gap[visited].max(), 3))
print("average gap on those boxes:", round(gap[visited].mean(), 3))
print(np.round(Q_learned[state_of(START)], 2))
print(np.round(Q_exact[state_of(START)], 2))
```

```output
boxes the agent updated: 68 of 100
biggest gap on those boxes: 3.088
average gap on those boxes: 0.162
[-7.79 -7.79 -7.79 -2.94]
[-7.79 -7.79 -7.79 -2.94]
```

**What every line does.**

- We train the learner again (300 episodes, seed 0) to get `Q_learned`.
- `visited = Q_learned != 0` marks the boxes the agent ever updated (`!=` means "not equal"). `visited.sum()` counts the True values (True counts as 1).
- `np.abs(...)` takes absolute values, so `gap` is the box-by-box difference between learned and exact.
- `gap[visited]` selects only the gaps at the visited boxes: indexing an array with a mask picks the True positions. We print the largest and the average.
- The last two lines print the start cell's row from both tables.

The agent updated 68 of the 100 boxes. The **biggest gap is 3.088** but the **average gap is only 0.162**: most boxes are nearly exact and a few rarely visited ones are stale (like the dead-end cells in Step 15). The start cell's row is **identical** in both tables (`-7.79 -7.79 -7.79 -2.94`). Look at the first three numbers: up, down and left from the start all bump into something, and a bump gives -5 then continues at the start's value: `-5 + 0.95 x (-2.94) = -7.79`. The table obeys the rule even for the bad moves.

## Step 19: Dyna-Q: learning from imagined experience

**Why we need this.** In Q-learning every real move is used for one update, then forgotten. **Dyna-Q** remembers what happened (a *model* of the world: "from this cell, this action gave that reward and led there") and, after each real move, replays several remembered moves as extra updates. It is like thinking about past experiences instead of just moving on.

```python type
def train_dyna(episodes, planning_steps=10, alpha=0.5, gamma=0.95, eps_start=1.0,
               eps_min=0.05, eps_decay=0.99, max_steps=200, stop_when_optimal=False):
    Q = np.zeros((ROWS * COLS, 4))
    model = {}                            # remembers: (state, action) -> (reward, next state, done)
    shortest = bfs()
    epsilon = eps_start
    history = []
    for episode in range(episodes):
        cell = START
        for t in range(max_steps):
            s = state_of(cell)
            a = choose_action(Q, s, epsilon)
            next_cell, reward, done = step(cell, a)
            s_next = state_of(next_cell)

            best_next = 0.0 if done else Q[s_next].max()          # 1) the normal real update
            Q[s, a] += alpha * (reward + gamma * best_next - Q[s, a])

            model[(s, a)] = (reward, s_next, done)                # 2) remember what happened

            for _ in range(planning_steps):                       # 3) replay remembered moves
                ps, pa = random.choice(list(model.keys()))
                pr, ps_next, pdone = model[(ps, pa)]
                pbest = 0.0 if pdone else Q[ps_next].max()
                Q[ps, pa] += alpha * (pr + gamma * pbest - Q[ps, pa])

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

experiment("no planning (plain)", trainer=train_dyna, planning_steps=0)
experiment("planning_steps=5", trainer=train_dyna, planning_steps=5)
experiment("planning_steps=20", trainer=train_dyna, planning_steps=20)
```

```output
no planning (plain)    episodes to shortest path: [5, 6, 8, 7, 7]  mean 6.6  avg total steps 1128
planning_steps=5       episodes to shortest path: [4, 3, 3, 7, 3]  mean 4.0  avg total steps 668
planning_steps=20      episodes to shortest path: [3, 6, 3, 4, 2]  mean 3.6  avg total steps 622
```

**What every line does.**

- `model = {}` is an empty dictionary: it will map `(state, action)` to `(reward, next state, done)`.
- Each real step: the usual update (labelled 1), then `model[(s, a)] = (...)` stores what happened (labelled 2). Because this maze is deterministic, one stored memory per box is enough.
- Part 3 repeats `planning_steps` times: `random.choice(list(model.keys()))` picks a remembered `(state, action)` at random; we read what happened then and apply the same update rule to it, using the *current* table. `list(model.keys())` converts the dictionary's keys to a list so `choice` can pick one.
- Everything else is as in `train`. The three experiment lines use the helper from Step 16: no planning (which should match the plain learner), 5 planning updates per real move, and 20.

With `planning_steps=0` it reproduces the baseline exactly (6.6 episodes, 1128 moves), a good check that the code is correct. With 5 planning updates it needs **4.0 episodes and 668 moves**, and with 20 it needs **3.6 episodes and 622 moves**. Remembered experience is being squeezed for extra information. The trade-off is computation: each real move now costs up to 21 updates. Remembering transitions is exact only in a deterministic world; in a random one you would store averages.

## Step 20: Numpy for neural networks: matrices, broadcasting, fancy indexing

**Why we need this.** A neural network is, at heart, a few matrix multiplications with simple functions between them. Before building one, we need five more numpy tools.

```python type
A_ = np.array([[1, 2],
               [3, 4],
               [5, 6]])                   # shape (3, 2)
B_ = np.array([[1, 0, 2, 1],
               [0, 1, 1, 3]])             # shape (2, 4)

print((A_ @ B_).shape)                    # @ is matrix multiplication: (3,2) @ (2,4) -> (3,4)
print(A_ @ B_)
print(A_.T)                               # .T flips rows and columns (transpose)

bias = np.array([10, 20])
print(A_ + bias)                          # "broadcasting": the 2 numbers are added to EVERY row

table = np.array([[5., 6., 7., 8.],
                  [1., 2., 3., 4.],
                  [9., 8., 7., 6.]])
rows = np.arange(3)                       # [0 1 2]
cols = np.array([2, 0, 3])
print(table[rows, cols])                  # pairs up: table[0,2], table[1,0], table[2,3]
print(np.maximum(0, np.array([-2, 3, -1, 5])))   # item-by-item max(0, x): negatives become 0
print(np.zeros_like(table).shape)         # zeros with the same shape as another array
print(np.random.randn(2, 3).shape)        # random numbers from a bell curve, in a 2x3 array

copied = table.copy()                     # a real, separate copy
copied[0, 0] = 99
print(table[0, 0], copied[0, 0])
```

```output
(3, 4)
[[ 1  2  4  7]
 [ 3  4 10 15]
 [ 5  6 16 23]]
[[1 3 5]
 [2 4 6]]
[[11 22]
 [13 24]
 [15 26]]
[7. 1. 6.]
[0 3 0 5]
(3, 4)
(2, 3)
5.0 99.0
```

**What every line does.**

- `A_ @ B_` is **matrix multiplication**. A `(3, 2)` array times a `(2, 4)` array gives a `(3, 4)` array: the inner sizes (2 and 2) must match, and disappear. Each output item is a row of `A_` multiplied pairwise with a column of `B_` and summed. Top-left: `1x1 + 2x0 = 1`.
- `A_.T` is the **transpose**: rows become columns.
- `A_ + bias` adds a 2-number array to a `(3, 2)` array. This is **broadcasting**: numpy adds `bias` to every row, because the sizes line up. We use it to add a bias to every item in a batch.
- `table[rows, cols]` with two arrays picks pairs: `table[0, 2]`, `table[1, 0]`, `table[2, 3]`. This **fancy indexing** is how we pick "the Q value of the action actually taken" for each item of a batch. `np.arange(3)` is `[0 1 2]`.
- `np.maximum(0, x)` replaces every negative number with 0: this is the **ReLU** function, the simple nonlinearity networks use.
- `np.zeros_like(table)` makes zeros with another array's shape. `np.random.randn(2, 3)` makes random numbers from a bell curve (most near 0).
- `.copy()` makes a real, separate copy. Without it, `copied = table` would be the *same* array under two names.

`(3, 4)`, then the product: top-left `1`, top-right `7` (row `[1, 2]` against column `[1, 3]`: `1 + 6 = 7`). The transpose is `[[1 3 5] [2 4 6]]`. Adding the bias gives `[[11 22] [13 24] [15 26]]`: 10 added to column 0 and 20 to column 1 in every row. The fancy index gives `[7. 1. 6.]`. `np.maximum` turns `[-2, 3, -1, 5]` into `[0 3 0 5]`. The copy test prints `5.0 99.0`: changing the copy left the original alone.

**Try this yourself.** By hand: what is `A_ @ B_`'s item in row 2, column 3? (Row `[5, 6]` against column `[1, 3]`: `5 + 18 = 23`. The output shows 23.)

## Step 21: A neural network that outputs Q values

**Why we need this.** Replace the table with a function. Give the network a description of the cell; it outputs four numbers, the Q values for the four actions. Training will adjust the network's internal numbers (its **weights**) so those outputs match what a table would hold. Our network has two layers.

```python type
np.random.seed(0)
random.seed(0)

N_IN, N_HIDDEN, N_OUT = ROWS * COLS, 32, 4
W1 = np.random.randn(N_IN, N_HIDDEN) * 0.3      # layer 1 weights: 25 x 32
b1 = np.zeros(N_HIDDEN)                          # layer 1 biases
W2 = np.random.randn(N_HIDDEN, N_OUT) * 0.3     # layer 2 weights: 32 x 4
b2 = np.zeros(N_OUT)

def forward(X):
    z1 = X @ W1 + b1                      # @ is matrix multiplication
    h = np.maximum(0, z1)                 # ReLU: negative numbers become 0
    q = h @ W2 + b2                       # 4 outputs per input: the Q values
    return z1, h, q

x = np.eye(N_IN)[state_of((4, 3))]        # one-hot input for cell (4, 3)
print(x.shape, x.sum(), int(np.argmax(x)))
_, _, q = forward(x.reshape(1, -1))       # a batch containing one input
print(q.shape)
print(np.round(q, 3))                     # untrained: small meaningless numbers
```

```output
(25,) 1.0 23
(1, 4)
[[-0.33  -0.06   0.116  0.063]]
```

**What every line does.**

- **One-hot input:** `np.eye(N_IN)[state_of((4, 3))]` is a 25-long vector with a single 1 at position 23 and 0s elsewhere. It says "the agent is in cell 23".
- **Layer 1:** `W1` is a `(25, 32)` array of weights; `X @ W1 + b1` produces 32 numbers (`b1` is a bias, a number added to each). Think of each of the 32 as a "neuron" computing a weighted sum of the input plus a bias.
- **ReLU:** `np.maximum(0, z1)` zeroes the negative numbers. Without a nonlinearity like this, two layers would collapse into one and the network could only represent straight-line relationships.
- **Layer 2:** `h @ W2 + b2` turns the 32 hidden numbers into 4 outputs: the Q values.
- `np.random.randn(...) * 0.3` starts the weights as small random numbers. `np.zeros` starts the biases at 0. (If all weights started equal, all neurons would learn the same thing.)
- `forward(X)` takes a *batch* (one row per input) and returns the intermediate values and the output. `x.reshape(1, -1)` makes a batch of one.
- The prints: the input's shape and sum, which position holds the 1, and the network's raw output for it.

`(25,) 1.0 23`: a 25-long vector, one 1, at position 23. The output has shape `(1, 4)`: a batch of one input, four Q values. Because the weights are random and untrained, the numbers (`-0.33, -0.06, 0.116, 0.063`) are meaningless. Training must change them. Note that **with a one-hot input, this network is a table in disguise**: each cell's row of the input selects its own slice of the weights. The point is that everything else (loss, gradients, replay memory, target network) is identical to what you would use when the input is richer, such as raw CartPole numbers or an image, where the network *can* generalise between similar inputs and a table cannot.

## Step 22: Teaching the network: loss and gradients

**Why we need this.** Training means: measure how wrong the output is (the **loss**), work out how each weight affected that error (the **gradient**), and nudge each weight a little in the direction that reduces it (**gradient descent**). Working out the gradients layer by layer, backward, is called **backpropagation**. We write it explicitly so nothing is magic.

```python type
def gradient_step(X, A, Y, lr):
    global W1, b1, W2, b2
    z1, h, q = forward(X)
    B = len(A)
    rows = np.arange(B)
    pred = q[rows, A]                     # the Q value of the action actually taken, per sample
    error = pred - Y                      # prediction minus target
    loss = np.mean(error ** 2)

    dq = np.zeros_like(q)                 # gradient of the loss with respect to the outputs
    dq[rows, A] = 2 * error / B           # only the taken action's output gets a gradient
    dW2 = h.T @ dq
    db2 = dq.sum(axis=0)
    dh = dq @ W2.T                        # push the gradient back through layer 2
    dz1 = dh * (z1 > 0)                   # ReLU passes gradient only where z1 was positive
    dW1 = X.T @ dz1
    db1 = dz1.sum(axis=0)

    W1 -= lr * dW1                        # step downhill
    b1 -= lr * db1
    W2 -= lr * dW2
    b2 -= lr * db2
    return loss

# test: teach the network that action 3 from cell (4, 3) is worth 10
X = np.eye(N_IN)[[state_of((4, 3))]]
A = np.array([3])
Y = np.array([10.0])
for i in range(6):
    loss = gradient_step(X, A, Y, lr=0.01)
    print(i, round(loss, 4), round(forward(X)[2][0, 3], 3))
```

```output
0 98.7426 1.047
1 80.1499 1.975
2 64.4026 3.04
3 48.4371 4.312
4 32.352 5.716
5 18.352 7.082
```

**What every line does.**

- The inputs: a batch of states `X`, the actions taken `A`, and the **targets** `Y` we want those actions' Q values to be (in Q-learning, `reward + gamma x best next`).
- `pred = q[rows, A]` picks, for each item in the batch, the output for the action actually taken (fancy indexing). `error = pred - Y`. `loss = np.mean(error ** 2)` is the mean squared error: the average of the squared errors.
- **Backward pass.** The loss is `mean(error^2)`, so its derivative with respect to a prediction is `2 x error / B` (B = batch size). Only the taken action's output affected the loss, so `dq` is zero everywhere else: `np.zeros_like(q)` then `dq[rows, A] = 2 * error / B`.
- `dW2 = h.T @ dq` and `db2 = dq.sum(axis=0)` are the gradients for layer 2 (how much each weight changes the loss).
- `dh = dq @ W2.T` sends the gradient back to the hidden layer. `dz1 = dh * (z1 > 0)`: the ReLU only passed values where `z1` was positive, so the gradient only flows there (`z1 > 0` is a True/False mask, which multiplies as 1 or 0).
- `dW1 = X.T @ dz1` and `db1` finish layer 1.
- `W1 -= lr * dW1` and so on: **step downhill**. `lr` (the learning rate) says how big a step. `global` lets the function change the weights defined outside.
- The test: teach the network that action 3 from cell `(4, 3)` should be worth 10, for six steps, printing the loss and the current prediction.

The loss starts at **98.7**. That is `(10 - 0.063)^2`, the squared gap between the target 10 and the untrained output `0.063` you saw in Step 21. After each gradient step the loss falls (`98.7, 80.1, 64.4, 48.4, 32.4, 18.4`) and the prediction climbs toward the target (`1.05, 1.98, 3.04, ..., 7.08`). That is learning. Why `lr=0.01`? Larger steps overshoot: with `0.05`, the loss bounced up and down instead of falling steadily. Choosing the learning rate is a trade-off here too.

**Try this yourself.** Raise `lr` to `0.05` for the test loop and run it. What happens to the loss? Why?

## Step 23: Deep Q-learning in miniature: replay memory and a target network

**Why we need this.** Now put it together: Q-learning where the Q function is the network. Two ideas make this stable, and both are in every deep Q-learning program.

**Replay memory:** store every experience `(state, action, reward, next state, done)` and train on a *random handful* of old ones each step, instead of only the latest. Consecutive experiences are strongly related, and training on them in order makes the network chase its own tail; random sampling breaks that, and each experience is reused many times.

**Target network:** the targets `reward + gamma x best next` are computed from the network itself, so every update moves its own targets. To steady this, targets come from a *frozen copy* of the weights that is refreshed only every `target_every` steps.

```python type
np.random.seed(0)
random.seed(0)
W1 = np.random.randn(N_IN, N_HIDDEN) * 0.3
b1 = np.zeros(N_HIDDEN)
W2 = np.random.randn(N_HIDDEN, N_OUT) * 0.3
b2 = np.zeros(N_OUT)

def network_table():
    return forward(np.eye(N_IN))[2]       # feed every one-hot state: a 25 x 4 table of outputs

def train_network(episodes, lr=0.02, gamma=0.95, eps_start=1.0, eps_min=0.05,
                  eps_decay=0.99, batch_size=32, target_every=50, max_steps=200):
    global W1, b1, W2, b2
    memory = deque(maxlen=2000)           # replay memory: forgets the oldest when full
    epsilon = eps_start
    steps_taken = 0
    old_weights = None
    history = []
    for episode in range(episodes):
        cell = START
        for t in range(max_steps):
            s = state_of(cell)
            if random.random() < epsilon:
                a = random.randrange(4)
            else:
                a = int(np.argmax(forward(np.eye(N_IN)[[s]])[2][0]))
            next_cell, reward, done = step(cell, a)
            s_next = state_of(next_cell)
            memory.append((s, a, reward, s_next, done))      # store the experience
            steps_taken += 1

            if steps_taken % target_every == 1:              # refresh the frozen "target" copy
                old_weights = (W1.copy(), b1.copy(), W2.copy(), b2.copy())

            if len(memory) >= batch_size:
                batch = random.sample(memory, batch_size)    # a random handful of old experiences
                S_ = np.array([m[0] for m in batch])
                A_ = np.array([m[1] for m in batch])
                R_ = np.array([m[2] for m in batch], dtype=float)
                N_ = np.array([m[3] for m in batch])
                D_ = np.array([m[4] for m in batch], dtype=float)

                tw1, tb1, tw2, tb2 = old_weights             # targets come from the frozen copy
                q_next = np.maximum(0, np.eye(N_IN)[N_] @ tw1 + tb1) @ tw2 + tb2
                targets = R_ + gamma * q_next.max(axis=1) * (1 - D_)
                gradient_step(np.eye(N_IN)[S_], A_, targets, lr)

            cell = next_cell
            if done:
                break
        epsilon = max(eps_min, epsilon * eps_decay)
        history.append(t + 1)
    return history

history_nn = train_network(400)
print([round(sum(history_nn[i:i + 50]) / 50, 1) for i in range(0, 400, 50)])
Q_net = network_table()
show_values(Q_net)
show_policy(Q_net)
path = greedy_path(Q_net)
print("network's path length:", None if path is None else len(path) - 1, " shortest:", bfs())
```

```output
[85.1, 24.0, 17.5, 14.6, 13.6, 13.0, 12.6, 12.7]
  -2.9   -2.0   -1.1   -2.0   -2.9
  ###    ###    -0.1   ###    -2.0
   3.2    2.1    1.0   -0.1   -1.1
   4.4   ###    ###    ###    ###
   5.7    7.1    8.5   10.0   -0.2
> > v < v
# # v # v
v < < < <
v # # # #
> > > > G
network's path length: 12  shortest: 12
```

**What every line does.**

- `network_table()` feeds all 25 one-hot states through the network at once: `np.eye(N_IN)` is the whole identity matrix, i.e. all 25 states as a batch. The output is a `(25, 4)` array: the network's own Q-table, so we can reuse `show_values`, `show_policy` and `greedy_path` on it.
- `memory = deque(maxlen=2000)` is a list that automatically drops the oldest item when full.
- Each step: choose an action (epsilon-greedy, using the network's output for the current state), call the environment, and `memory.append(...)` the experience.
- `if steps_taken % target_every == 1:` refreshes the frozen copy (`%` is the remainder after division; `.copy()` makes separate copies of the arrays).
- Once the memory holds a batch, `random.sample(memory, batch_size)` draws that many random experiences. The list comprehensions rebuild them as arrays of states, actions, rewards, next states and done flags (`1.0` for done, else `0.0`).
- **Targets:** `q_next` is the *frozen* network's outputs for the next states. `targets = R_ + gamma * q_next.max(axis=1) * (1 - D_)`: the reward plus the discounted best next value, with `(1 - D_)` zeroing the future when the episode ended (this is the same "no future after the goal" rule).
- `gradient_step(...)` from Step 22 then moves the weights toward those targets.
- The output: average steps per episode in blocks of 50, then the network's value map and arrows, then the path length.

This takes about 15 to 30 seconds. The average episode length falls: `85.1, 24.0, 17.5, 14.6, 13.6, 13.0, 12.6, 12.7`, matching the table method's curve. The network's value map is **the same map** as the exact table (`-2.9, -2.0, -1.1, -0.1 ... 5.7, 7.1, 8.5, 10.0`), and the greedy path has length **12**, equal to the true shortest. (The goal cell shows `-0.2`: the network was never trained on the goal's row because nothing is learned from standing on the goal, so that output is leftover random noise. Ignore it.)

**What you have just built is the structure of deep Q-learning:** environment, replay memory, a network predicting Q values, targets from a frozen copy, gradient descent on the squared error. Frameworks like Keras or PyTorch compute the gradients for you and offer bigger layers, but the loop is the one you typed. For CartPole you would change only the input to the four raw state numbers and the output to two, with no buckets needed.

Honest caveat: with a one-hot input, the network does no better than the table, and it is slower. The payoff comes when inputs are rich and similar inputs should get similar answers, which is where tables become impossible.

**Try this yourself.** Change `target_every=50` to `target_every=1` (a new frozen copy every step, which is no freezing at all) and `hidden` or `lr`. Does training still converge? Make a prediction first.

## Where the wider field goes from here

- **Tabular Q-learning**: A table of values by trial and error (in this notebook: Steps 9 to 16)
- **Value iteration / dynamic programming**: The same table, by direct calculation (needs the rules) (in this notebook: Step 17)
- **Dyna-Q (planning)**: The table, plus a model used for extra imagined updates (in this notebook: Step 19)
- **Deep Q-learning (DQN)**: The Q function as a neural network, with replay memory and target network (in this notebook: Steps 20 to 23)
- **Policy gradient, actor-critic, PPO**: A policy network directly, with or without a value function (in this notebook: A natural next step)

**Good next reading (free):** *Reinforcement Learning: An Introduction* by Sutton and Barto (the standard textbook, available free online) for tabular methods, planning (Dyna) and the maths; OpenAI's "Spinning Up in Deep RL" guide; the Gymnasium documentation. The companion **CartPole DIY** notebook uses these same ideas on a continuous problem and ends with a method that solves it using four numbers.

**Ideas for your own project:**
1. Load a bigger or randomly generated maze with `load_maze` and see how the number of episodes needed grows.
2. Make moves random: with 20% probability the agent slips to a random neighbouring direction. Which of `alpha = 0.1` and `alpha = 1.0` works better now, and why?
3. Add a penalty for revisiting a cell. Does the agent still find the shortest path?
4. Give the network coordinates `(row / 5, col / 5)` as input instead of a one-hot vector. Does it still learn? Does it generalise between neighbouring cells?
5. Replace Dyna's random planning with *prioritised* planning: replay the transitions with the biggest recent error first.

## Cheat sheet: the numpy and Python you used

- `np.array([[...], [...]])`: make a 2D array from nested lists
- `a.shape`, `a.reshape(r, c)`: size in each dimension; same items, new shape
- `a[2, 1]`, `a[(2, 1)]`, `a[1]`, `a[:, 0]`: one item; a whole row; a whole column
- `np.zeros((r, c))`, `np.zeros_like(a)`: arrays of zeros
- `np.eye(n)`: identity matrix; its rows are one-hot vectors
- `a.max(axis=1)`, `a.argmax(axis=1)`: best value / its position, per row
- `a == a.max()`, `np.flatnonzero(mask)`: which entries tie; their positions
- `a.any()`: is any entry non-zero?
- `a.sum()`, `a.sum(axis=0)`, `np.mean(a)`: totals and averages
- `a @ b`, `a.T`: matrix multiplication; transpose
- `a + bias`: broadcasting: add to every row
- `a[rows, cols]`: pick one item per (row, col) pair
- `np.maximum(0, a)`: ReLU: negatives become 0
- `np.abs(a)`: absolute values
- `a.copy()`: a separate copy
- `random.seed(n)`, `random.random()`, `random.choice(x)`: repeatable randomness
- `np.random.randn(r, c)`: bell-curve random numbers
- `{k: v}`, `k in d`: dictionary; does a key exist?
- `deque`, `.append`, `.popleft()`: a waiting line
- `global name`: let a function change an outside name
- `try: ... finally: ...`: cleanup that runs even after an error
- `f"{x:6.1f}"`: print x 6 wide with 1 decimal

## Glossary

- **Environment:** the world; given a state and action, returns the next state and a reward.
- **State:** where the agent is (here: a cell).
- **Action:** a choice (up, down, left, right).
- **Reward:** the immediate score after an action.
- **Episode:** one attempt, from the start to the goal (or a step limit).
- **Policy:** a rule from state to action.
- **Return:** total future reward, with later rewards discounted.
- **Gamma:** the discount factor, 0 to 1.
- **Q(s, a):** the estimated return of taking `a` in `s` and then playing well.
- **Alpha:** the learning rate: how far each update moves toward its target.
- **Epsilon:** the probability of acting randomly.
- **On/off-policy:** whether the update evaluates the behaviour actually followed (SARSA) or the best behaviour (Q-learning).
- **Bellman equation:** the self-consistency condition a converged Q-table satisfies: value = reward + gamma x best next value.
- **Replay memory / target network / loss / gradient:** the pieces of deep Q-learning from Steps 22 and 23.

## Check yourself

Say each answer out loud before reading it.

1. **What does `Q[s, a]` mean?** The estimated discounted return from taking `a` in `s` and then playing well.
2. **Which lines are the learning, and how many boxes change per step?** `target = reward + gamma * best_next` and `Q[s, a] += alpha * (target - Q[s, a])`. Exactly one box.
3. **Why is `best_next` zero at the goal?** The episode is over, so nothing more can be earned.
4. **Why does information spread backward from the goal?** A cell's target includes the best value of the cell it lands in. If that cell has learned something, this cell learns it on its next visit.
5. **Why did a wall bump costing 0 break the agent?** Standing still scored better than moving, so it learned to stand still. Rewards define the goal literally.
6. **Why did `epsilon = 0` still work here, but not in CartPole?** Here every reward is negative, so tried boxes fall below the untried zeros. In CartPole all rewards were positive.
7. **How is value iteration different from Q-learning?** It computes the table from the known rules, with sweeps; Q-learning samples experience and needs no rules.
8. **Why does a deep Q-learning program need replay memory and a target network?** Consecutive experiences are correlated, and targets computed from the network being trained keep moving; random sampling and a frozen copy steady both.
9. **How do you know the learner is right?** Compare against a trusted answer: here the BFS shortest path and the exact table from value iteration.
