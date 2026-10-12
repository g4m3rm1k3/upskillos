// Part 1: the problem. A grid world as data, moves, the agent–environment loop, rewards and the
// return, discounting. Every number a predict block asks for is worked out by `compute` from the
// lab's own engine, and lessons.test.js checks the two agree.
import { GridWorld } from '../engine/gridworld.js'
import { followPath } from '../engine/paths.js'

const G = (rewards, gamma) => rewards.reduce((sum, r, k) => sum + gamma ** k * r, 0)
const pathRewards = (map, moves) => followPath(new GridWorld(map), [...moves].map(ch => 'LURD'.indexOf(ch))).rewards

export const PART1 = {
  id: 'part1', title: 'Part 1 · The problem', lessons: [
    {
      id: 'grid-as-data', number: '1.1', title: 'A grid world as data',
      goal: 'Read a map written as text, find any cell in it, and number every cell with one whole number: the state.',
      builds: [],
      blocks: [
        { h: 'What this lab is about' },
        { md: `**Reinforcement learning** is learning by trial and error. A program, called the **agent**, tries things in a world, gets told after each try how good it was (a number called the **reward**), and slowly works out which choices pay off. Nobody shows it the right answer; it has to find out.

This lab teaches it on **grid worlds**: maps made of square **cells**, like a board game. A rat looks for cheese in a maze and must avoid cats; a hiker walks along a cliff edge; an elf crosses a frozen lake where the ice is slippery. By the end you will have three different learning methods (Q-learning, SARSA and A2C) that work out how to play all of them, and you will understand every line of them.

Before anything can learn, the world has to be something a program can read. That is this lesson.` },
        { h: 'A map is a list of strings' },
        { md: `Every map in this lab is written in \`python/maps.py\` as a Python dictionary. Here is the one called \`"cheese_and_cat"\`:` },
        {
          code: {
            file: 'maps.py', from: 16, to: 29, notes: [
              ['"cheese_and_cat": {', ['`"cheese_and_cat"` is the map\'s name: the key under which this dictionary is stored inside the bigger dictionary `MAPS`. `MAPS["cheese_and_cat"]` gives back everything between the braces.']],
              ['"title"', ['`"title"`: a string, the name the lab shows on screen.']],
              ['"rows": [', ['`"rows"`: a **list** of 4 **strings**. Each string is one row of the grid, top row first. Each character is one cell.']],
              ['"S..."', ['`"S..."`: row 0, the top row. `S` is where the agent starts; `.` is floor it can walk on.']],
              ['".#.X"', ['Row 1. `#` is a wall: the agent can never be in that cell. `X` is a cat.']],
              ['"#..C"', ['Row 3, the bottom row. `C` is the cheese.']],
              ['"step"', ['`"step": -0.04`: a float. The reward for an ordinary move onto floor: a small cost for every step, so that shorter routes are better (lesson 1.4).']],
              ['"cells": {', ['`"cells"`: a dictionary from a cell letter to the rules for entering that cell. Letters not listed (`.` and `S`) are plain floor.']],
              ['"C": {', ['Entering the cheese pays `1.0` and `"end": True` ends the game.']],
              ['"X": {', ['Entering the cat pays `-1.0` and also ends the game.']],
            ],
          },
        },
        { md: `The letters used across all the maps are: \`.\` floor, \`#\` wall, \`S\` start, \`C\` cheese, \`c\` small cheese, \`X\` cat, \`H\` hole in the ice, \`G\` goal, \`K\` cliff. Writing a map as text has a big advantage: you can draw a new world by typing it (Part 5 does exactly that).` },
        { figure: 'MapExplorer', props: { map: 'cheese_and_cat', maps: ['cheese_and_cat', 'corridor', 'qmaze', 'cliff', 'frozen_lake', 'cats_and_cheese'] }, caption: 'Click a cell: the highlighted character in `rows` is that cell. Switch the labels between the state number and (row, col), and try the other maps.' },
        { h: 'Finding a cell: rows[row][col]' },
        { md: `A cell is found with two indexes, **row first, then column**, both counted from 0:

- \`rows[2]\` is the third string, \`"...#"\`.
- \`rows[2][3]\` is the fourth character of that string, \`"#"\`.
- Row 0 is the **top** row and column 0 is the **left** column, so rows grow downwards. (In a maths graph \`y\` grows upwards; on screens and in arrays it is the other way.)

So a cell's position is a pair \`(row, col)\`. In Python that pair is a **tuple**: two values in brackets, like \`(2, 3)\`.` },
        {
          choice: {
            prompt: 'In the Cheese and cat map, what is `rows[1][3]`?',
            options: [
              { text: '`"X"`, the cat', why: 'Row 1 is `".#.X"`; its character at index 3 (the fourth) is `X`.' },
              { text: '`"#"`, a wall', why: 'That is `rows[2][3]`, one row lower. Row 1 is the second string, `".#.X"`.' },
              { text: '`"."`, floor', why: 'Count from 0: indexes 0, 1, 2, 3 of `".#.X"` are `.`, `#`, `.`, `X`.' },
              { text: '`"C"`, the cheese', why: 'The cheese is at `rows[3][3]`, the bottom-right corner.' },
            ],
            answer: 0,
          },
        },
        { h: 'One number per cell: the state' },
        { md: `The agent will need to remember something about **every situation** it can be in: for example, how good each move was from there. The simplest place to keep that is a table with one **row per situation**, and table rows are numbered 0, 1, 2, … So we give every cell a single whole number.

In this lab the situation is just "which cell the agent is in", and that number is called the **state**. (Lesson 2.2 asks when "which cell" is enough to describe a situation and when it isn't.)

The numbering reads the grid like a book: along row 0 from left to right, then row 1, and so on. Why the formula below is right:

- Before row $r$ there are $r$ complete rows, each with $n_\\text{cols}$ cells: $r \\cdot n_\\text{cols}$ cells come first.
- Inside row $r$, the $c$ cells to the left of column $c$ come first.
- So the cell at $(r, c)$ has $r \\cdot n_\\text{cols} + c$ cells before it, and since numbering starts at 0, that count *is* its number.

$$s = r \\cdot n_\\text{cols} + c$$

Going back, divide by the row length: the whole part is the row and the remainder is the column.

$$r = \\lfloor s / n_\\text{cols} \\rfloor, \\qquad c = s \\bmod n_\\text{cols}$$

($\\lfloor x \\rfloor$ means "round down to a whole number"; $\\bmod$ means "the remainder".)` },
        {
          code: {
            file: 'gridworld.py', from: 32, to: 40, notes: [
              ['def to_state', ['A **method**: a function that belongs to the class `GridWorld`. `self` is the map object it is called on, so `self.n_cols` is that map\'s row length. Called as `env.to_state(2, 3)`: Python fills in `self` with `env`.']],
              ['return row * self.n_cols', ['$s = r \\cdot n_\\text{cols} + c$ exactly. Two ints in, one int out: `to_state(2, 3)` on a 4-column map is `2 * 4 + 3 = 11`.']],
              ['return divmod(', ['`divmod(a, b)` is a built-in that gives back the tuple `(a // b, a % b)`: whole-number division and remainder together. `divmod(11, 4)` is `(2, 3)`.']],
              ['row, col = self.to_cell', ['**Tuple unpacking**: the tuple `(2, 3)` is split into two names at once, `row = 2` and `col = 3`.']],
              ['return self.rows[row][col]', ['The cell\'s letter, a one-character string, found with the two indexes.']],
            ],
          },
        },
        {
          mathCode: [
            ['s', 'state', 'the state number of a cell: an `int` from 0 to `n_states - 1`'],
            ['(r, c)', '(row, col)', 'the same cell as a tuple: row from the top, column from the left'],
            ['n_\\text{cols}', 'self.n_cols', 'how many cells in each row: `len(self.rows[0])`'],
            ['r \\cdot n_\\text{cols} + c', 'row * self.n_cols + col', 'to_state'],
            ['(\\lfloor s / n_\\text{cols} \\rfloor,\\ s \\bmod n_\\text{cols})', 'divmod(state, self.n_cols)', 'to_cell'],
          ],
        },
        {
          predict: {
            prompt: 'In Cheese and cat (4 columns), what is the state number of the cell at `(2, 3)`?',
            answer: 11, compute: () => new GridWorld('cheese_and_cat').toState(2, 3),
            explain: '$2 \\cdot 4 + 3 = 11$: two full rows of 4 come before it, then 3 cells in its own row. Click that cell in the figure to see it.',
            misconceptions: [{ answer: 14, feedback: 'That is $3 \\cdot 4 + 2$: row and column swapped. The row comes first: $s = \\text{row} \\cdot n_\\text{cols} + \\text{col}$ with row 2, column 3.' }],
          },
        },
        {
          predict: {
            prompt: 'In the 10 × 10 Classic QMaze, state 47 is in which **row**?',
            answer: 4, compute: () => new GridWorld('qmaze').toCell(47)[0],
            explain: '`divmod(47, 10)` is `(4, 7)`: row 4, column 7. With 10 columns the tens digit is the row and the units digit is the column, which makes the 10 × 10 maze easy to read.',
            misconceptions: [{ answer: 7, feedback: '7 is the column: the remainder of $47 / 10$. The row is the whole part of the division.' }],
          },
        },
        { h: 'The GridWorld class' },
        { md: `\`GridWorld\` is a **class**: a recipe for an object that bundles a map's data with the functions that use it. \`env = GridWorld("cheese_and_cat")\` runs \`__init__\`, which stores everything about that map on \`self\`. (\`env\`, short for environment, is the usual name for the world in reinforcement learning code.)` },
        {
          code: {
            file: 'gridworld.py', fn: '__init__', notes: [
              ['layout = MAPS[name]', ['Looks the map up by name: `layout` is the dictionary you saw above.']],
              ['self.name = name', ['The map\'s name, a string, kept so the lab knows which map this object is.']],
              ['self.rows = layout["rows"]', ['The list of strings, kept on the object: `self.rows[1]` is `".#.X"`.']],
              ['self.n_rows = len(self.rows)', ['`len` of the list: how many strings, so how many rows. 4 here.']],
              ['self.n_cols = len(self.rows[0])', ['`len` of the first string: how many characters, so how many columns. Every row has the same length, so the first one is enough. 4 here.']],
              ['self.n_states = self.n_rows * self.n_cols', ['Every cell gets a number, walls included (no agent ever stands on one, but numbering them keeps the formula simple): $4 \\cdot 4 = 16$ states.']],
              ['self.n_actions = 4', ['Four possible moves: left, up, right, down (next lesson).']],
              ['self.step_reward = layout["step"]', ['The reward for an ordinary move: `-0.04` here.']],
              ['self.bump_reward = layout.get("bump", layout["step"])', ['`dict.get(key, default)` gives the value if the key exists, otherwise the default. This map has no `"bump"` key, so walking into a wall costs the same as a step. Classic QMaze sets `"bump": -0.75`.']],
              ['self.revisit_reward = layout.get("revisit")', ['With no default, `.get` gives `None` when the key is missing. Only Classic QMaze has a revisit reward (lesson 2.2 shows why it is unusual).']],
              ['self.intended = layout.get("intended", 1.0)', ['The probability that a move goes where it was meant to. `1.0` everywhere except on ice (lesson 2.1).']],
              ['self.cells = layout["cells"]', ['The rules for special cells, a dictionary of dictionaries.']],
              ['self.max_steps = layout.get("max_steps", 100)', ['After this many steps a game is cut off (lesson 1.3).']],
              ['self.start = self.find("S")', ['The state number of the start cell, found by searching for the letter `S` (below).']],
              ['self.P = self.build_transitions()', ['The complete table of what every move does from every cell. Lesson 2.1 is all about it.']],
              ['self.rng = random.Random()', ['A random number generator owned by this world, for slippery ice. Lesson 1.3.']],
              ['self.state = self.start', ['Where the agent is now: an `int`.']],
            ],
          },
        },
        {
          code: {
            file: 'gridworld.py', fn: 'find', notes: [
              ['for row in range(self.n_rows)', ['Two nested loops visit every `(row, col)`, top row first, left to right.']],
              ['for col in range(self.n_cols)', ['The inner loop: every column of the current row.']],
              ['if self.rows[row][col] == letter', ['Compares one character with the letter we want.']],
              ['return self.to_state(row, col)', ['`return` leaves the function at once, inside both loops, with the first match turned into a state number.']],
              ['return None', ['Only reached if no cell has that letter: `None` means "not found".']],
            ],
          },
        },
        {
          predict: {
            prompt: 'The Cliff map is 4 rows × 12 columns and its `S` is in the bottom-left corner. What does `env.find("S")` return?',
            answer: 36, compute: () => new GridWorld('cliff').start,
            explain: 'The bottom-left cell is `(3, 0)`, and $3 \\cdot 12 + 0 = 36$. (Gymnasium\'s own CliffWalking also starts in state 36: it numbers cells the same way. Lesson 2.6 compares the two.)',
            misconceptions: [{ answer: 3, feedback: '3 is the row. The state number is $\\text{row} \\cdot n_\\text{cols} + \\text{col} = 3 \\cdot 12 + 0$.' }, { answer: 48, feedback: '48 is `n_states`, the count of cells. Numbers go from 0 to 47.' }],
          },
        },
        {
          choice: {
            prompt: 'Why does the lab number cells with one `int` instead of keeping `(row, col)`?',
            options: [
              { text: 'The agent will keep a table with one row per state, and table rows are indexed 0, 1, 2, …', why: 'Yes. One number per situation means it can be used directly as a row index of a NumPy array, which is what the Q-table in Part 3 is.' },
              { text: 'Python cannot store tuples in a list', why: 'It can: tuples can go in lists and can even be dictionary keys. The reason is the table.' },
              { text: 'A single number makes moving faster', why: '`move` turns the number back into `(row, col)` to move at all, so it isn\'t about speed.' },
              { text: 'The map changes during the game', why: 'Maps never change during a game. The reason is the table with one row per state.' },
            ],
            answer: 0,
          },
        },
        { note: 'A world, to a program, is data: here a list of strings plus a dictionary of rules. Each cell has one number, its **state** $s = r \\cdot n_\\text{cols} + c$, so that anything the agent learns about a cell can be stored in row $s$ of a table.' },
      ],
    },

    {
      id: 'actions-and-moves', number: '1.2', title: 'Actions: what a move does',
      goal: 'Represent the four moves as numbers, and follow `move(state, action)` to the next state and its reward, including walls, endings and the cliff.',
      builds: ['grid-as-data'],
      blocks: [
        { md: `An **action** is a choice the agent makes. On a grid there are four: left, up, right, down. Like states, actions are numbered, because the agent will keep one column per action in its table. The numbering is the one the QMaze tutorial uses:` },
        {
          code: {
            file: 'gridworld.py', from: 5, to: 7, notes: [
              ['LEFT, UP, RIGHT, DOWN = 0, 1, 2, 3', ['Four names for the four action numbers, assigned in one line by tuple unpacking. Capital letters are the Python convention for constants: values that never change. `env.step(RIGHT)` reads better than `env.step(2)`.']],
              ['ACTION_NAMES', ['A list where index = action number: `ACTION_NAMES[2]` is `"right"`. Used for printing.']],
              ['MOVES = [', ['A list of 4 tuples, again indexed by action number. Each tuple is `(d_row, d_col)`: how the row and the column change. `MOVES[UP]` is `(-1, 0)`: up is one row **less** because row 0 is the top. `MOVES[RIGHT]` is `(0, 1)`: one column more.']],
            ],
          },
        },
        { md: `Notice the order: left, up, right, down goes clockwise round the compass. So \`(action + 1) % 4\` is a quarter turn to the right and \`(action - 1) % 4\` a quarter turn to the left. The slippery ice uses exactly that (lesson 2.1).` },
        { h: 'One move, worked out' },
        {
          code: {
            file: 'gridworld.py', fn: 'move', notes: [
              ['row, col = self.to_cell(state)', ['From the state number back to `(row, col)`, two ints.']],
              ['d_row, d_col = MOVES[action]', ['The change for this action, unpacked from its tuple: for DOWN, `d_row = 1`, `d_col = 0`.']],
              ['new_row, new_col = row + d_row', ['Where the move would land. Two additions in one line: the right side builds a tuple, the left side unpacks it.']],
              ['off_grid = not (', ['`True` if the new cell is outside the map. `0 <= new_row < self.n_rows` is a **chained comparison**: true when `new_row` is at least 0 **and** less than `n_rows`.']],
              ['if off_grid or self.rows[new_row][new_col] == "#"', ['Off the map, or into a wall. `or` stops early: if `off_grid` is `True` it never evaluates `self.rows[new_row][new_col]`, which would be an index error off the map.']],
              ['return state, self.bump_reward, False', ['Blocked: the agent stays where it was (`state`), pays the bump reward, and the game goes on (`False`). The function gives back a tuple of three values.']],
              ['new_state = self.to_state(new_row, new_col)', ['The new cell as a state number.']],
              ['rule = self.cells.get(self.letter(new_state))', ['The rules for the letter there, or `None` for plain floor (`.` and `S` aren\'t in `cells`).']],
              ['if rule is None', ['`is None` is the standard way to test for `None`.']],
              ['return new_state, self.step_reward, False', ['Plain floor: move there, pay the step reward, carry on.']],
              ['if rule.get("to_start")', ['The cliff\'s rule has `"to_start": True`. `.get` gives `None` (which counts as false) for every other rule.']],
              ['return self.start, rule["reward"], False', ['Over the cliff: pay `-100` and land back on the start. The game does **not** end: the hiker has to try again.']],
              ['return new_state, rule["reward"], rule.get("end", False)', ['Any other special cell: move there, pay its reward, and end the game if its rule says `"end": True`.']],
            ],
          },
        },
        { figure: 'MoveExplorer', props: { map: 'cheese_and_cat', maps: ['cheese_and_cat', 'qmaze', 'cliff', 'corridor'] }, caption: 'Put the agent anywhere and choose a move: each line of `move` is shown with its values. Try walking into a wall, off the edge, onto the cat and, on the Cliff map, over the cliff.' },
        {
          predict: {
            prompt: 'In Cheese and cat, the agent is in state 4 (row 1, column 0) and moves RIGHT, into the wall at `(1, 1)`. What **next state** does `move(4, RIGHT)` return?',
            answer: 4, compute: () => new GridWorld('cheese_and_cat').move(4, 2)[0],
            explain: 'A wall blocks the move, so the agent stays in state 4 and pays the bump reward (here the same as a step, −0.04).',
            misconceptions: [{ answer: 5, feedback: '5 is the wall\'s own state number. Walls are numbered like every cell, but `move` never puts the agent in one: it returns the old state.' }],
          },
        },
        {
          predict: {
            prompt: 'In Classic QMaze the rat starts at state 0 (top-left). The cell to its right, `(0, 1)`, is a wall. What **reward** does `move(0, RIGHT)` return?',
            answer: -0.75, compute: () => new GridWorld('qmaze').move(0, 2)[1],
            explain: 'Classic QMaze sets `"bump": -0.75`, the QMaze tutorial\'s penalty for an invalid move. It is much bigger than a normal step (−0.04), so bumping into walls is strongly discouraged.',
            misconceptions: [{ answer: -0.04, feedback: 'That is the step reward. This map has its own `"bump"` value, which `bump_reward` uses.' }],
          },
        },
        {
          choice: {
            prompt: 'On the Cliff map the hiker is on the start, state 36, and moves RIGHT, onto a cliff cell. What does `move(36, RIGHT)` return?',
            options: [
              { text: '`(36, -100.0, False)`', why: 'Right: the cliff\'s rule is `to_start`, so the hiker is put back on the start (36) after paying −100, and the game is not over.' },
              { text: '`(37, -100.0, True)`', why: 'The cliff doesn\'t end the game and nobody stays on a cliff cell: `to_start` sends the hiker back to 36.' },
              { text: '`(37, -1.0, False)`', why: '37 is the cliff cell. Entering it pays the cliff\'s reward, −100, and moves the hiker to the start.' },
              { text: '`(36, -1.0, False)`', why: 'The state is right but the reward isn\'t: the cliff\'s rule pays −100.' },
            ],
            answer: 0,
          },
        },
        { md: `The rules, side by side. All rewards are what **entering** a cell pays:

| Map | step | bump | special cells |
|---|---|---|---|
| Tiny corridor | 0 | 0 | cheese +1, ends |
| Cheese and cat | −0.04 | −0.04 | cheese +1, cat −1, both end |
| Classic QMaze | −0.04 | −0.75 | cheese +1 ends; also −0.25 for going back to a cell already visited |
| Cliff | −1 | −1 | cliff −100 and back to start; goal −1, ends |
| Frozen lake | 0 | 0 | hole 0, ends; goal +1, ends; the ice is slippery |
| Cats and cheese | −0.01 | −0.01 | cheese +1, small cheese +0.3, cat −1, all end |

Why so different? Each world says what "good" means in its own way: costs per step, a big punishment, a single prize at the end. Part 3 shows that the same learning code handles all of them.` },
        { note: 'An action is a number 0–3 that indexes `MOVES`. `move(state, action)` gives back a **triple**: where the agent ends up, what it is paid for entering there, and whether the game ends. Walls and edges keep the agent in place; the cliff sends it to the start.' },
      ],
    },

    {
      id: 'agent-environment-loop', number: '1.3', title: 'The agent–environment loop',
      goal: 'Run a whole game with `reset()` and `step()`, read the five values `step` returns, and tell **terminated** from **truncated**.',
      builds: ['actions-and-moves'],
      blocks: [
        { md: `Every reinforcement learning program, from this lab's mazes to robots, is built round the same loop between two parts:

- The **environment** (the world, \`env\`) knows the rules. It says where you are and what each move does.
- The **agent** chooses the moves. It doesn't know the rules; it only sees what happens.

One trip round the loop is a **time step**, numbered $t = 0, 1, 2, \\dots$ At step $t$ the agent is in state $S_t$, chooses action $A_t$, and the environment answers with a reward $R_{t+1}$ and the next state $S_{t+1}$. (The reward gets the index $t+1$ because it arrives *after* the action, together with the next state. This is the textbook convention, from Sutton and Barto's *Reinforcement Learning: An Introduction*.)

One whole game, from the start until it ends, is an **episode**:

$$S_0, A_0, R_1, S_1, A_1, R_2, S_2, \\dots, S_T$$

where $T$ is the step at which it ends.` },
        { h: 'reset() and step()' },
        { md: `\`GridWorld\` has the two methods every Gymnasium environment has. **Gymnasium** is the standard Python library of reinforcement learning worlds; following its contract means the agents you write here would also work there.` },
        {
          code: {
            file: 'gridworld.py', fn: 'reset', notes: [
              ['def reset(self, seed=None)', ['Starts a new episode. `seed=None` is a **default argument**: you may call `reset()` or `reset(seed=7)`.']],
              ['if seed is not None', ['Only re-seed the random number generator when a seed is given. A **seed** makes the "random" numbers come out the same every run, which makes experiments repeatable.']],
              ['self.rng.seed(seed)', ['Restarts the generator from that seed: from here on it produces the same sequence of numbers every time.']],
              ['self.state = self.start', ['Back to the start cell.']],
              ['self.steps = 0', ['Counts moves, for the time limit.']],
              ['self.visited = {self.start}', ['A **set** (unordered, no duplicates) of states visited this episode. Only Classic QMaze\'s revisit rule uses it.']],
              ['return self.state, {}', ['Two values, like Gymnasium: the first state $S_0$, and `info`, an empty dictionary that environments may use for extra details.']],
            ],
          },
        },
        {
          code: {
            file: 'gridworld.py', fn: 'step', notes: [
              ['outcomes = self.P[self.state][action]', ['Looks up, in the transition table, the possible results of this action from here: a list of `(probability, next_state, reward, terminated)` tuples. On every map except the frozen lake there is exactly one, with probability `1.0`. Lesson 2.1 explains the table.']],
              ['u = self.rng.random()', ['A random float between 0 (included) and 1 (not included).']],
              ['for probability, next_state, reward, terminated in outcomes', ['Goes through the outcomes, unpacking each tuple into four names.']],
              ['u -= probability', ['Subtracts each outcome\'s probability until `u` drops below 0: an outcome with probability 0.5 is picked half the time. With one outcome of probability `1.0`, `u - 1.0` is always below 0, so the only outcome is picked: the move is certain.']],
              ['if u < 0:', ['Below 0: this outcome\'s slice contained the random number, so stop here with it.']],
              ['if self.revisit_reward is not None', ['Classic QMaze only: going back to a cell already visited (but not bumping in place) pays the revisit reward instead.']],
              ['reward = self.revisit_reward', ['Replaces the reward this move would normally pay.']],
              ['self.visited.add(next_state)', ['Remembers the cell for that rule.']],
              ['self.state = next_state', ['The world moves on.']],
              ['self.steps += 1', ['One more move this episode.']],
              ['truncated = self.steps >= self.max_steps and not terminated', ['**Truncated**: the game was cut off by the time limit, not ended by the world.']],
              ['return next_state, reward, terminated, truncated, {}', ['The five values Gymnasium\'s `step` returns, in its order: $S_{t+1}$, $R_{t+1}$, whether the world ended the episode, whether the time limit cut it off, and `info`.']],
            ],
          },
        },
        { h: 'Terminated or truncated?' },
        { md: `There are two different ways an episode can stop, and learning code must treat them differently:

- **terminated**: the world itself ended the game: the rat ate the cheese, met a cat, the elf fell in a hole. Nothing comes after; the future is worth exactly 0.
- **truncated**: we stopped watching after \`max_steps\` moves. The world could have carried on: the rat was still in the maze. The future was *not* worth 0; we just didn't see it.

Old code (and the original QMaze tutorial) used one \`done\` flag for both, which quietly teaches the agent that running out of time is the same as a dead end. Part 3 uses \`terminated\` only, which is the fix.` },
        { h: 'Playing a whole episode' },
        { md: `Here is the loop with the simplest possible agent, one that picks every move at random. It is \`python/play.py\`:` },
        {
          code: {
            file: 'play.py', fn: 'play_random', notes: [
              ['env = GridWorld(name)', ['The environment: one map.']],
              ['rng = random.Random(seed)', ['The agent\'s own random number generator, seeded so the same seed gives the same game. It is separate from the world\'s, so the agent\'s choices and the ice\'s slips don\'t disturb each other.']],
              ['state, info = env.reset(seed=seed)', ['$S_0$. `info` is unused but must be unpacked: `reset` returns two values.']],
              ['total = 0.0', ['The sum of the rewards so far.']],
              ['trail = [state]', ['Every state visited, for drawing.']],
              ['done = False', ['Whether the episode is over.']],
              ['while not done', ['One time step per trip round this loop.']],
              ['action = rng.randrange(env.n_actions)', ['$A_t$: `randrange(4)` is a random int from 0 to 3, each equally likely. This line **is** the agent: the only part that chooses. Part 3 replaces it with a learner.']],
              ['next_state, reward, terminated, truncated, info = env.step(action)', ['The environment\'s answer, five values unpacked: $S_{t+1}$, $R_{t+1}$, and the three others.']],
              ['total += reward', ['Adds this step\'s reward.']],
              ['trail.append(next_state)', ['Remembers where the agent went, for drawing its path.']],
              ['state = next_state', ['$S_{t+1}$ becomes the current state: the next trip round the loop is time step $t+1$.']],
              ['done = terminated or truncated', ['Stop for either reason. (For *playing* that\'s right; for *learning* the reason matters, as above.)']],
              ['return total, trail', ['A tuple: the episode\'s total reward and the states visited.']],
            ],
          },
        },
        { figure: 'LoopPlayer', props: { map: 'cheese_and_cat', maps: ['cheese_and_cat', 'corridor', 'qmaze', 'cliff', 'frozen_lake'], seed: 7 }, caption: 'Play the episode yourself with the buttons or the arrow keys, or let the random agent play (same seed as `play_random`, so the same game). Every `step` is logged with its five return values.' },
        { md: `Press **random to the end** on Cheese and cat: with seed 7 the random rat wanders for 46 steps before stumbling onto the cheese, for a total of −0.8. That is what \`play_random()\` returns in Python too. The shortest route takes 6. Learning, in Part 3, is what closes that gap.` },
        {
          predict: {
            prompt: 'On the Tiny corridor (`S...C`, step reward 0, cheese +1), what is the **fewest number of steps** an episode can take?',
            answer: 4, compute: () => new GridWorld('corridor').find('C') - new GridWorld('corridor').start,
            explain: 'The cheese is 4 cells to the right of the start: four RIGHT moves. The last one enters the cheese and returns `terminated=True`.',
            misconceptions: [{ answer: 5, feedback: 'The corridor has 5 cells, but the agent already stands on the first one: 4 moves reach the fifth.' }],
          },
        },
        {
          choice: {
            prompt: 'On the frozen lake the elf has made its 100th move (`max_steps` is 100) and landed on ordinary ice. What does that `step` return for `terminated` and `truncated`?',
            options: [
              { text: '`terminated=False, truncated=True`', why: 'Right. The world didn\'t end the game (ice isn\'t an ending); the time limit cut it off.' },
              { text: '`terminated=True, truncated=False`', why: 'Terminated means the world ended the game: a hole or the goal. Ordinary ice doesn\'t.' },
              { text: '`terminated=True, truncated=True`', why: '`truncated` is defined as `steps >= max_steps and not terminated`: they are never both true here.' },
              { text: '`terminated=False, truncated=False`', why: 'After the 100th move `self.steps` is 100, so `steps >= max_steps` is true.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'play', label: 'Step through play_random() in real Python' } },
        { note: 'The loop is: `state = env.reset()`, then repeat `action = choose(state)`, `next_state, reward, terminated, truncated, info = env.step(action)`, `state = next_state`, until the episode stops. Everything in this lab, including A2C, is this loop plus a better `choose` and a line that learns.' },
      ],
    },

    {
      id: 'rewards-and-return', number: '1.4', title: 'Rewards and the return',
      goal: 'Add up an episode\'s rewards into its **return**, compare paths by their returns, and see how the rewards decide what "best" means.',
      builds: ['agent-environment-loop'],
      blocks: [
        { md: `The agent is never told "go to the cheese". It is only paid, one reward per step. Reinforcement learning rests on one assumption, the **reward hypothesis**: everything we want the agent to do can be expressed as **getting as much reward as possible in total**, not on one step but over the whole episode.

That total is called the **return**. For an episode that ends at step $T$:

$$G_0 = R_1 + R_2 + \\dots + R_T$$

$G_0$ is the return counted from time 0, the start. (Lesson 1.5 counts it from any time $t$.)` },
        { figure: 'ReturnPaths', props: { map: 'cheese_and_cat', gamma: 1, slider: false, paths: [{ name: 'Shortest, along the top', moves: 'RRDDDR' }, { name: 'Shortest, down the side', moves: 'DDRRDR' }, { name: 'A wander', moves: 'RLRRDDDR' }, { name: 'Into the cat', moves: 'RRRD' }] }, caption: 'Four ways to play Cheese and cat. Click a path to see it on the map and its rewards one by one.' },
        {
          predict: {
            prompt: 'What is the return $G_0$ of the shortest path, RIGHT, RIGHT, DOWN, DOWN, DOWN, RIGHT?',
            answer: 0.8, tolerance: 1e-9, compute: () => pathRewards('cheese_and_cat', 'RRDDDR').reduce((a, b) => a + b, 0),
            explain: 'Five moves onto floor at −0.04 each, then the cheese: $5 \\cdot (-0.04) + 1 = 0.8$.',
            misconceptions: [{ answer: 0.76, feedback: 'That counts −0.04 for all 6 moves. The last move enters the cheese, which pays +1 *instead of* the step cost: rewards are for the cell entered.' }],
          },
        },
        {
          predict: {
            prompt: 'And the return of "Into the cat": RIGHT, RIGHT, RIGHT, DOWN?',
            answer: -1.12, tolerance: 1e-9, compute: () => pathRewards('cheese_and_cat', 'RRRD').reduce((a, b) => a + b, 0),
            explain: 'Three floor moves, then the cat: $3 \\cdot (-0.04) - 1 = -1.12$.',
          },
        },
        { h: 'The rewards define the goal' },
        { md: `Compare the two shortest paths: both return 0.8, so to this agent they are equally good. Nothing in the rewards prefers one, and a learner may end up with either.

Now the wander: 8 moves instead of 6, return $7 \\cdot (-0.04) + 1 = 0.72$, a little worse than 0.8. **That is the only reason the agent will learn to hurry:** every extra step costs 0.04. The step cost is part of the problem's definition, not a detail.` },
        {
          choice: {
            prompt: 'Suppose Cheese and cat had `"step": 0` (moves free). How would the shortest path and the wander compare?',
            options: [
              { text: 'Equal: both return exactly 1.0', why: 'Right. With free moves every path that reaches the cheese returns 1. An agent paid like that has no reason to be quick, and may well learn to dawdle.' },
              { text: 'The shortest path is still better', why: 'Better by what? Its return would be $0 + \\dots + 0 + 1 = 1$, and so would the wander\'s. Only the rewards define "better". (Lesson 1.5 shows a second way to prefer short paths: discounting.)' },
              { text: 'The wander is better because it explores more', why: 'The return doesn\'t reward exploring; it only adds up rewards. Both would be 1.' },
            ],
            answer: 0,
          },
        },
        { md: `This is the central skill of applying reinforcement learning: **the agent maximises exactly what you pay it for**, not what you meant. Lesson 3.13 shows real examples of rewards that teach the wrong thing, including a famous one in Classic QMaze.` },
        { note: 'The **return** is the sum of an episode\'s rewards. The agent\'s goal is to make it as large as possible, and "best" means only "largest return": the rewards *are* the definition of the task.' },
      ],
    },

    {
      id: 'discounting', number: '1.5', title: 'Discounting: why sooner is better',
      goal: 'Compute the discounted return $G_t$ forwards and backwards, explain what $\\gamma$ does, and derive the recursion $G_t = R_{t+1} + \\gamma G_{t+1}$.',
      builds: ['rewards-and-return'],
      blocks: [
        { md: `Almost every reinforcement learning method adds up rewards with a **discount**: each reward is multiplied by $\\gamma$ (the Greek letter gamma, a number between 0 and 1) once for every step it lies in the future:

$$G_0 = R_1 + \\gamma R_2 + \\gamma^2 R_3 + \\dots = \\sum_{k=0}^{T-1} \\gamma^k R_{k+1}$$

The $\\sum$ (sigma) means "add up, for $k$ from 0 to $T-1$". In code a $\\sum$ is a \`for\` loop that adds:` },
        {
          code: {
            file: 'returns.py', fn: 'discounted_return', notes: [
              ['G = 0.0', ['The running sum starts at 0.']],
              ['for k, reward in enumerate(rewards)', ['`enumerate` gives each item with its index: `k = 0` with the first reward ($R_1$), `k = 1` with the second, and so on. That is the $k$ of the $\\sum$.']],
              ['G += gamma ** k * reward', ['$\\gamma^k R_{k+1}$, added on. `**` is "to the power of": `0.9 ** 2` is `0.81`.']],
              ['return G', ['$G_0$.']],
            ],
          },
        },
        { h: 'Why discount?' },
        { md: `Three reasons, all of them real:

1. **Sooner is better.** With $\\gamma < 1$ the same cheese is worth less the later it comes, so the agent prefers short routes *even when steps are free*.
2. **Some tasks never end.** A robot that runs forever collects rewards forever. Without a discount the sum can be infinite, and "maximise an infinite number" means nothing. With $\\gamma < 1$ and every reward at most $R_\\text{max}$, the return is at most $R_\\text{max}(1 + \\gamma + \\gamma^2 + \\dots) = \\dfrac{R_\\text{max}}{1 - \\gamma}$. (That is the sum of a **geometric series**: call it $S$; then $S - \\gamma S = 1$, because every other term cancels, so $S = 1 / (1 - \\gamma)$.)
3. **The future is uncertain.** A reward far ahead may never arrive; counting it for less is a sensible hedge.

What $\\gamma$ does:

- $\\gamma = 0$: only the next reward counts. A completely short-sighted agent.
- $\\gamma = 1$: no discount; all rewards count equally (only safe when every episode ends).
- In between, $\\gamma$ sets the horizon: rewards about $1/(1-\\gamma)$ steps away still matter. With $\\gamma = 0.95$, roughly 20 steps.` },
        { figure: 'ReturnPaths', props: { map: 'cheese_and_cat', gamma: 0.9, paths: [{ name: 'Shortest', moves: 'RRDDDR' }, { name: 'A wander', moves: 'RLRRDDDR' }, { name: 'Into the cat', moves: 'RRRD' }] }, caption: 'The same paths, now discounted. Move γ and watch the table of terms: each later reward is multiplied by one more γ.' },
        {
          predict: {
            prompt: 'With $\\gamma = 0.9$, what is $G_0$ for the shortest path (five rewards of −0.04, then +1)? Give 4 decimals.',
            answer: 0.4267, tolerance: 6e-5, compute: () => G(pathRewards('cheese_and_cat', 'RRDDDR'), 0.9),
            explain: '$-0.04(1 + 0.9 + 0.81 + 0.729 + 0.6561) + 0.9^5 \\cdot 1 = -0.04 \\cdot 4.0951 + 0.59049 = 0.426686$. The cheese, 6 steps away, now counts for only 0.59.',
            misconceptions: [{ answer: 0.8, tolerance: 1e-6, feedback: 'That is the undiscounted sum. Multiply the $k$-th reward by $0.9^k$, starting with $k = 0$.' }, { answer: 0.3840, tolerance: 2e-3, feedback: 'That is what you get with every power one too high ($\\gamma^1$ on the first reward). The first reward is not discounted at all: it gets $\\gamma^0 = 1$, and the cheese, the 6th reward, gets $\\gamma^5$.' }],
          },
        },
        {
          predict: {
            prompt: 'A robot gets reward 1 on every step, forever, with $\\gamma = 0.95$. What is its return?',
            answer: 20, tolerance: 1e-6, compute: () => 1 / (1 - 0.95),
            explain: '$1 + 0.95 + 0.95^2 + \\dots = \\dfrac{1}{1 - 0.95} = 20$. An infinite number of rewards, a finite return.',
          },
        },
        { h: 'The return from any step, and the recursion' },
        { md: `The return can be counted from any time $t$, not just the start: it is everything still to come.

$$G_t = R_{t+1} + \\gamma R_{t+2} + \\gamma^2 R_{t+3} + \\dots$$

Take one $\\gamma$ out of every term after the first:

$$G_t = R_{t+1} + \\gamma \\big( R_{t+2} + \\gamma R_{t+3} + \\dots \\big)$$

The bracket is exactly $G_{t+1}$, the return from one step later. So:

$$G_t = R_{t+1} + \\gamma\\, G_{t+1}$$

"The return from here is the next reward, plus the discounted return from the next state." This one line is the foundation of the whole subject: the Bellman equations of Part 2, the targets of Q-learning and SARSA, and A2C's returns are all versions of it.

It also gives a quick way to compute every $G_t$ at once: start at the end, where $G_T = 0$ (nothing comes after), and go backwards.` },
        {
          code: {
            file: 'returns.py', fn: 'all_returns', notes: [
              ['G = 0.0', ['$G_T = 0$: after the last step nothing is left.']],
              ['returns = []', ['The list of every $G_t$, filled from the end.']],
              ['for reward in reversed(rewards)', ['`reversed` goes through the list from the last item to the first: $R_T$, then $R_{T-1}$, …']],
              ['G = reward + gamma * G', ['$G_t = R_{t+1} + \\gamma G_{t+1}$. On the right, `G` still holds $G_{t+1}$; after the assignment it holds $G_t$.']],
              ['returns.insert(0, G)', ['Puts $G_t$ at the **front** of the list, so the finished list is in time order: `returns[0]` is $G_0$.']],
              ['return returns', ['A list of floats, one per step. `returns[0]` equals `discounted_return(rewards, gamma)`, except perhaps in the 16th or 17th digit: the two functions add the same numbers in a different order, and floating-point addition rounds a little differently each time.']],
            ],
          },
        },
        {
          mathCode: [
            ['\\gamma', 'gamma', 'the discount, between 0 and 1'],
            ['R_{t+1}', 'reward', 'the reward that arrives after the action at step $t$'],
            ['G_t', 'G', 'the discounted return from step $t$ on'],
            ['\\sum_k \\gamma^k R_{k+1}', 'for k, reward in enumerate(rewards): G += gamma ** k * reward', 'the forward sum'],
            ['G_t = R_{t+1} + \\gamma G_{t+1}', 'G = reward + gamma * G', 'the backward recursion'],
          ],
        },
        {
          predict: {
            prompt: 'Rewards $R_1, R_2, R_3$ are −0.04, −0.04, +1 and $\\gamma = 0.5$. Work backwards: $G_2 = 1$, then $G_1 = -0.04 + 0.5 \\cdot G_2 = 0.46$. What is $G_0$?',
            answer: 0.19, tolerance: 1e-9, compute: () => G([-0.04, -0.04, 1], 0.5),
            explain: '$G_0 = -0.04 + 0.5 \\cdot 0.46 = 0.19$. Check forwards: $-0.04 - 0.5 \\cdot 0.04 + 0.25 \\cdot 1 = 0.19$.',
          },
        },
        { h: 'Discounting decides between two cheeses' },
        { md: `On the Cats and cheese map there is a small cheese (+0.3) 2 steps from the start, and a big cheese (+1) 10 steps away. Each step costs 0.01. Which is better depends on nothing but $\\gamma$:` },
        { figure: 'GammaCurve', props: { map: 'cats_and_cheese', paths: [{ name: 'Small cheese', moves: 'DD' }, { name: 'Big cheese', moves: 'RRRRRDDDDD' }] }, caption: 'The return of each route as γ goes from 0 to 1. Drag γ: the map shows the route with the larger return.' },
        {
          choice: {
            prompt: 'With $\\gamma = 0.8$, which route has the larger return?',
            options: [
              { text: 'The small cheese', why: 'Right: $-0.01 + 0.8 \\cdot 0.3 = 0.23$, against about $0.09$ for the big one, whose +1 arrives after 10 steps and is multiplied by $0.8^9 \\approx 0.13$.' },
              { text: 'The big cheese', why: 'At $\\gamma = 0.8$ the big cheese\'s +1 is multiplied by $0.8^9 \\approx 0.134$: it\'s worth less than the small cheese\'s $0.8 \\cdot 0.3 = 0.24$. Move the slider to see where they cross.' },
            ],
            answer: 0,
          },
        },
        { md: `So $\\gamma$ is not just a technicality: it is part of saying what you want. A patient agent ($\\gamma$ near 1) walks to the big cheese; an impatient one takes the small cheese now. Lesson 2.5 computes the best route for every $\\gamma$ exactly, and Part 3's learners find it by trial and error.` },
        { note: '$G_t = \\sum_k \\gamma^k R_{t+k+1}$, and its recursive form $G_t = R_{t+1} + \\gamma G_{t+1}$. $\\gamma$ makes sooner rewards worth more, keeps never-ending sums finite, and sets how far ahead the agent cares.' },
      ],
    },
  ],
}
