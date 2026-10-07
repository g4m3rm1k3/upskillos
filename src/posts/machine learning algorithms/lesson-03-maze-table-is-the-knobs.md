# Lesson 3: The Maze, Where the Table Is the Knobs

**Goal:** understand what the maze algorithm (Q-learning) is really doing, and see that "filling in a grid" is exactly learning with knobs, just with a different kind of knob.

**You will type:** onto the bottom of `learning_lab.py`. This lesson doesn't need the taxi code, but keep it in the file. `import random` goes at the very top of the file.

---

## The idea first

In Lessons 1 and 2 the knobs were two numbers inside a formula. In the maze there is **no formula**. The knobs are a **table**: for every square of the maze and every move you could make from it, one number.

> `q_table[square][move]` = "if I'm standing on this square and make this move, and then play sensibly afterwards, roughly how much total reward will I collect?"

At the start every entry is 0: "I have no idea". Learning is changing those table entries until they're good advice. Once they are, playing is trivial: on each square, pick the move with the biggest number.

So you're right: it's filling up a grid. And that grid isn't a picture *of* the learning. **It is the learning.** (The "Q" stands for "quality" of a move.)

### But what's the "wrongness" with no answer key?

In the taxi problem we had correct fares to compare against. In a maze, nobody tells the agent the right numbers. It has only:

- a **reward** for each step it takes (we'll use −1 for a normal step, to make dawdling costly, and +10 for reaching the goal)

It builds its own "better guess" after each real step:

```
better guess = reward I just got + discount * (best number on the square I landed on)
```

The `discount` (say 0.9) means "things further in the future count a bit less".

Then it nudges the table entry **a fraction of the way toward that better guess**:

```
new entry = old entry + learning_rate * (better guess - old entry)
```

The gap `(better guess - old entry)` is this problem's wrongness. It's measured one step at a time.

### Why does that work at all? A worked example

Take the square just before the goal, say position (3,2), and the move "right" into the goal square (3,3). Reward for entering the goal: +10. Nothing comes after the goal, so:

```
better guess = 10
old entry    = 0
new entry    = 0 + 0.5 * (10 - 0) = 5.0        (using learning_rate = 0.5)
```

That entry now carries real information. Next, from square (2,2), the agent steps "down" to (3,2). Reward −1. The best entry on (3,2) is now 5.0, so:

```
better guess = -1 + 0.9 * 5.0 = 3.5
old entry    = 0
new entry    = 0 + 0.5 * (3.5 - 0) = 1.75
```

Two steps from the goal now has a positive number too. **Information leaks backward from the goal, one square per visit.** After enough trips, every square holds a number reflecting how far from the goal it is. That's the "grid filling up" you noticed.

(Notice it's *guesses improving guesses*: the entry on (3,2) was itself only a rough number when it got used. It still works because the +10 at the goal is real, and every update drags the guesses closer to something consistent with it.)

---

## Step 1: The moves

```python
import random   # put this at the very top of the file if it isn't there yet

ACTION_MOVES = {
    "up": (-1, 0),
    "down": (1, 0),
    "left": (0, -1),
    "right": (0, 1),
}
```

**How it's stored:** a dict from move name to a `(row_change, column_change)` tuple. Rows count downward, so "up" is −1 row. Positions will be `(row, column)` tuples.

---

## Step 2: The maze world

The maze is a list of strings: `S` start, `G` goal, `#` wall, `.` open floor. Type the class:

```python
class MazeWorld:
    def __init__(self, layout):
        self.layout = layout
        self.row_count = len(layout)
        self.column_count = len(layout[0])
        self.start_position = self.find_symbol("S")
        self.goal_position = self.find_symbol("G")

    def find_symbol(self, symbol):
        for row_number, row_text in enumerate(self.layout):
            if symbol in row_text:
                return (row_number, row_text.index(symbol))

    def symbol_at(self, position):
        row_number, column_number = position
        return self.layout[row_number][column_number]

    def is_walkable(self, position):
        row_number, column_number = position
        if row_number < 0 or row_number >= self.row_count:
            return False
        if column_number < 0 or column_number >= self.column_count:
            return False
        return self.symbol_at(position) != "#"

    def step(self, position, action_name):
        row_change, column_change = ACTION_MOVES[action_name]
        wanted_position = (position[0] + row_change, position[1] + column_change)
        if not self.is_walkable(wanted_position):
            return position, -1.0, False
        if wanted_position == self.goal_position:
            return wanted_position, 10.0, True
        return wanted_position, -1.0, False
```

**The important one is `step`.** Its signature: it takes where you are and which move you chose, and returns a 3-tuple `(new_position, reward, finished)`.

- Bumping a wall or the edge: you stay put and still pay −1.
- Reaching the goal: reward +10 and `finished` is `True`.
- Otherwise you move and pay −1.

This `step(...)` shape, "give me a situation and an action, I'll tell you the new situation, the reward and whether the episode ended", is the standard shape of every reinforcement learning environment. CartPole in Lesson 4 has the same one.

Create a maze:

```python
maze = MazeWorld([
    "S...",
    ".#..",
    "...#",
    "#..G",
])
```

Open `maze` in your visualiser and check `start_position` is `(0, 0)` and `goal_position` is `(3, 3)`. Try `maze.step((0, 0), "down")` and `maze.step((0, 0), "up")` and read both results.

---

## Step 3: The empty table (the knobs, all zero)

```python
def make_empty_q_table(maze):
    q_table = {}
    for row_number in range(maze.row_count):
        for column_number in range(maze.column_count):
            position = (row_number, column_number)
            if maze.is_walkable(position):
                q_table[position] = {action_name: 0.0 for action_name in ACTION_MOVES}
    return q_table
```

**How it's stored:** a dict of dicts. The outer key is a position tuple. The value is a small dict from move name to number:

```
q_table[(2, 1)]["right"]      ->  0.0   (so far)
```

Make one and **open it in the visualiser**:

```python
q_table = make_empty_q_table(maze)
```

Count the knobs: there are 13 walkable squares (16 minus 3 walls) and 4 moves each, so **52 numbers**. That's the entire "brain". Keep this view open; it's the most important thing to watch in this lesson.

---

## Step 4: Picking a move

```python
def best_action_for(q_table, position):
    action_values = q_table[position]
    best_value = max(action_values.values())
    best_actions = [name for name, value in action_values.items() if value == best_value]
    return random.choice(best_actions)


def choose_action(q_table, position, explore_chance):
    if random.random() < explore_chance:
        return random.choice(list(ACTION_MOVES))
    return best_action_for(q_table, position)
```

**Step through `best_action_for`:** find the highest number among the square's four, collect *all* moves tied for it (at the start all four tie at 0.0), and pick one of the ties at random.

**Why `choose_action` sometimes ignores the table:** if the agent always did what the table currently says, it might never discover a better route it had written off early. So with probability `explore_chance` (say 0.2) it tries a random move instead. This **explore versus exploit** tension shows up in every learning system.

---

## Step 5: The learning loop

```python
def train_maze(maze, episodes, learning_rate=0.5, discount=0.9,
               explore_chance=0.2, max_steps=100, random_starts=True):
    q_table = make_empty_q_table(maze)
    steps_per_episode = []
    possible_starts = [p for p in q_table if p != maze.goal_position]
    for episode_number in range(episodes):
        if random_starts:
            position = random.choice(possible_starts)
        else:
            position = maze.start_position
        for step_count in range(max_steps):
            action_name = choose_action(q_table, position, explore_chance)
            new_position, reward, finished = maze.step(position, action_name)
            if finished:
                best_next_value = 0.0
            else:
                best_next_value = max(q_table[new_position].values())
            better_guess = reward + discount * best_next_value
            old_value = q_table[position][action_name]
            q_table[position][action_name] = old_value + learning_rate * (better_guess - old_value)
            position = new_position
            if finished:
                break
        steps_per_episode.append(step_count + 1)
    return q_table, steps_per_episode
```

**Line by line, the heart of it:**

- An **episode** is one attempt: place the agent, let it move until it reaches the goal (or runs out of `max_steps`).
- `random_starts=True` drops it on a random walkable square each attempt. That fills in the whole table faster than always starting in the corner.
- The three lines starting at `better_guess` are exactly the formula from the top of this lesson. If the move ended the episode, nothing comes after, so the "best next value" is 0.
- `q_table[position][action_name] = ...` is **the only place knobs change**. Exactly one number in the whole table is edited per step.
- `steps_per_episode` records how many steps each attempt took, so you can see whether the agent is getting better.

Train it:

```python
random.seed(7)
q_table, steps_per_episode = train_maze(maze, 300)
```

(`random.seed(7)` makes the "randomness" repeatable so we can compare runs. Your numbers might still differ slightly from mine.)

**Look at in the visualiser:**

1. `q_table`: no longer zeros. Find the square `(3, 2)`; its `"right"` entry should be near 10.0. Look at `(2, 2)`, `(2, 1)`: smaller numbers the further from the goal. That's the leak.
2. `steps_per_episode`: the first entries are large (tens of steps), the last are small. Random starts mean it doesn't settle on a single number.

---

## Step 6: Read the table as a map

```python
ARROWS = {"up": "^", "down": "v", "left": "<", "right": ">"}


def show_policy(maze, q_table):
    for row_number in range(maze.row_count):
        line = ""
        for column_number in range(maze.column_count):
            position = (row_number, column_number)
            if position == maze.goal_position:
                line += "G"
            elif position not in q_table:
                line += "#"
            else:
                line += ARROWS[best_action_for(q_table, position)]
        print(line)


show_policy(maze, q_table)
```

For every square this prints an arrow for the move with the highest number. Your output should look like this (some squares have two equally good arrows, so yours may differ in those):

```
v>v<
v#v<
>>v#
#>>G
```

Follow the arrows from the top-left. They lead to `G`. **Nobody told it the route.** It came out of 52 numbers being nudged. A *policy* is just "the rule for picking a move on each square", and here the policy is read straight out of the table.

Now watch one actual trip using the greedy rule (no exploring):

```python
def follow_policy(maze, q_table, max_steps=30):
    position = maze.start_position
    path = [position]
    for _ in range(max_steps):
        action_name = best_action_for(q_table, position)
        position, reward, finished = maze.step(position, action_name)
        path.append(position)
        if finished:
            break
    return path


path_taken = follow_policy(maze, q_table)
```

`path_taken` should be 7 positions long (6 moves), the shortest possible. Look at it in the visualiser.

---

## The decoder

| In the math | In your code |
|---|---|
| Q(s, a), "action-value function", "Q-function" | `q_table[position][action_name]` |
| s (state), a (action), r (reward) | `position`, `action_name`, `reward` |
| γ (gamma), "discount factor" | `discount` |
| α (alpha) | `learning_rate` |
| max over a' of Q(s', a') | `max(q_table[new_position].values())` |
| Q(s,a) ← Q(s,a) + α[ r + γ max Q(s',a') − Q(s,a) ] | the three lines from `better_guess` to `q_table[position][action_name] = ...` |
| "TD error" (temporal difference) | `better_guess - old_value` |
| "policy" π(s) | `best_action_for` applied to every square (what `show_policy` draws) |
| "ε-greedy" | `choose_action` |
| "episode" | one pass of the outer `for episode_number` loop |

Compare to Lesson 2's update:

```
knob = knob - learning_rate * slope                       (taxi)
entry = entry + learning_rate * (better_guess - entry)    (maze)
```

Different rule, same spirit: **move the knob a fraction of the way toward "better"**.

---

## Guided exploration

Save a copy: `learning_lab_explore3.py`.

1. **Watch the leak happen.** Run this and look at the output after each stage:

```python
for episode_total in [1, 5, 30, 300]:
    random.seed(7)
    table_so_far, _ = train_maze(maze, episode_total)
    print(episode_total, table_so_far[(3, 2)])
```

After 1 episode only "right" is nonzero. After 30, even the wrong moves have picked up numbers. After 300, "right" is 10 and the others reflect their detours.
2. **No future (discount = 0).** Train with `discount=0.0` and call `show_policy`, then `follow_policy`. With no future, the agent only values the *immediate* reward, which is −1 everywhere except the square next to the goal. Most arrows end up arbitrary, and the follow-the-policy path wanders for ages. Why would a table without any forward-looking information behave that way? Explain it to yourself using the worked example above.
3. **No exploring.** Train with `explore_chance=0.0`. It *still* learns here. Why? Every real step costs −1, so a move it has tried now looks worse than a move it hasn't tried yet (still 0.0). The agent accidentally explores. That's a fluke of this reward design, not a safe rule: with other rewards, no exploring can leave an agent stuck repeating its first habit.
4. **Fixed start.** Train with `random_starts=False` and look at `steps_per_episode`. Now every attempt starts in the same corner, so you see the clean learning curve: long wandering at first, settling to about 6 steps.

Return to the main file when finished.

---

## Challenge: add a trap, predict first

Make a maze with a trap square `T` that gives reward −10 when you step on it (but doesn't end the episode):

```python
trap_maze = MazeWorld([
    "S...",
    ".#..",
    ".T.#",
    "#..G",
])
```

1. **Before running anything**, write down which route you expect the trained agent to take from `S`, and which squares the arrows near the trap should point away from.
2. Edit `MazeWorld.step` so stepping onto a `T` square returns −10.0 as the reward (and `finished` stays `False`).
3. Train on `trap_maze` (400 episodes), call `show_policy` and `follow_policy`.
4. Was your prediction right? Check the `q_table` entries of the squares next to the trap: they should hold noticeably more negative numbers for the move into the trap.

The solution is in `solutions.md`.

---

## Check yourself

- What is the "list of values to tune" in the maze? How many are there here?
- Where in the code is the *only* place those values change?
- Why does the number next to the goal become correct before the number at the start does?
- What was the equivalent of "wrongness" for the maze, given there's no answer key?

**Next:** Lesson 4 faces what happens when a table is impossible, and that's where neurons come in.
