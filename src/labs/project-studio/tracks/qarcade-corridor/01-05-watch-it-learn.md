---
title: 1.5 — Watch It Learn
runtime: python
run: watch_corridor.py
---

Numbers in a printed table are one way to see learning. This lesson adds the other: the corridor from lesson 1.1, with an agent instead of you at the keys, and every cell showing what the agent currently believes about it. You can slow it to one step at a time and watch each update land, or speed it up and watch the beliefs settle.

Then you'll use it to answer a question about γ, the discount, with a prediction you can work out exactly beforehand.

### The story so far

You have the corridor (`Corridor`, lesson 1.1), the table and greedy choice (`make_table` and `greedy`, lesson 1.2), the update (`q_update`, lesson 1.3), and a complete agent and training loop (`QAgent` and `run_episode`, lesson 1.4). An agent's whole knowledge is its table, `agent.Q`: five rows (squares) of two scores (left, right).

This lesson draws that table **inside the corridor**: each square shows its two scores, the left move's in the top-left corner and the right move's in the bottom-right. So you can watch `q_update` change one number at a time, as it happens.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_watch.py** above.

```python file=tests/test_watch.py provided
# Tests for watch_corridor.py and discount.py (lesson 1.5).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_watch.py
import numpy as np


def test_advance_takes_one_step_and_learns_from_it():
    from agent import QAgent
    from corridor import START, Corridor
    from watch_corridor import Watcher
    agent = QAgent(5, 2, epsilon=1.0)
    watcher = Watcher(Corridor(), agent)
    watcher.advance()
    assert watcher.state != START or watcher.totals, "the agent moved"
    assert watcher.env.steps in (0, 1)


def test_advance_starts_a_new_episode_after_an_ending():
    from agent import QAgent
    from corridor import LEFT, START, Corridor
    from watch_corridor import Watcher
    agent = QAgent(5, 2, epsilon=0.0)
    agent.Q[START] = [1.0, 0.0]
    watcher = Watcher(Corridor(), agent)
    watcher.advance()
    assert watcher.totals == [0.1], "one step left reaches the coin"
    assert watcher.state == START and watcher.total == 0.0
    assert agent.Q[START, LEFT] < 1.0, "and it learned from that step"


def test_labels_mark_the_better_action():
    from watch_corridor import BEST, OTHER, value_labels
    (left, left_colour), (right, right_colour) = value_labels(np.array([0.1, 0.81]))
    assert left == "<0.10" and right == "0.81>"
    assert (left_colour, right_colour) == (OTHER, BEST)


def test_labels_mark_both_when_tied():
    from watch_corridor import BEST, value_labels
    assert [colour for _, colour in value_labels(np.array([0.0, 0.0]))] == [BEST, BEST]


def test_viewer_window_opens_and_closes():
    from watch_corridor import run
    assert run(max_frames=3) == 3


def test_gamma_far_sighted_goes_for_the_treasure():
    from discount import which_end
    assert which_end(0.9) == "treasure"
    assert which_end(0.35) == "treasure"


def test_gamma_short_sighted_takes_the_coin():
    from discount import which_end
    assert which_end(0.3) == "coin"
    assert which_end(0.1) == "coin"
```

The interesting one is `test_advance_starts_a_new_episode_after_an_ending`. It rigs the table so that the agent, never exploring, must step left from the start, reaching the coin in one step. Then it checks three consequences of that single step: the episode's total (0.1) was recorded, a new episode started on the start cell, and the agent learned from the step: its belief that LEFT is worth 1.0 in cell 1 was nudged down towards the real 0.1.

The two `gamma` tests are the Your turn. Notice how close their numbers are: 0.35 must go for the treasure and 0.3 must take the coin. The last step explains why the line falls between them.

```check
file tests/test_watch.py -- Click "Create provided tests/test_watch.py" above.
```

## One step per frame

`train` from lesson 1.4 plays whole episodes inside one function call: thousands of steps before it returns. A window can't wait that long. It must draw a frame every sixtieth of a second, or it freezes. So the watcher needs the **body** of `run_episode`'s loop as something it can call once per frame, with the episode's progress (where the agent is, the reward so far) kept between calls.

Create `watch_corridor.py`:

```python file=watch_corridor.py
class Watcher:
    def __init__(self, env, agent):
        self.env = env
        self.agent = agent
        self.state, _ = env.reset()
        self.total = 0.0
        self.totals = []

    def advance(self):
        action = self.agent.act(self.state)
        next_state, reward, terminated, truncated, _ = self.env.step(action)
        self.agent.learn(self.state, action, reward, next_state, terminated)
        self.total += reward
        self.state = next_state
        if terminated or truncated:
            self.totals.append(self.total)
            self.total = 0.0
            self.state, _ = self.env.reset()
```

**`Watcher`'s attributes, and what each remembers between calls:**

| attribute | what it holds |
|---|---|
| `self.env` | the corridor being played |
| `self.agent` | the agent playing it |
| `self.state` | the square the agent is on right now, carried from one `advance` to the next |
| `self.total` | the reward collected so far in the current game |
| `self.totals` | a list of the totals of every finished game, newest last |

Line for line, `advance` is one time round `run_episode`'s `while` loop: act, step, learn, add up, move on. The variables `run_episode` kept while it ran (`state`, `total`) are now **attributes**, `self.state` and `self.total`, because they must survive between calls. And instead of returning when the episode ends, it records the total and starts the next episode itself, so the caller never has to think about episode boundaries: it just keeps calling `advance`.

Writing the same loop twice is a deliberate choice here. `run_episode` is the clearest way to say "play one episode", and `Watcher` is the clearest way to say "one step at a time". Chapter 7 meets the same split again, in Pac-Man.

```check
run ".venv/Scripts/python -m pytest -q tests/test_watch.py -k advance" label="advance takes one step, learns from it, and starts a new episode after an ending" -- Act, step, learn, add the reward, move to next_state; if the episode ended, append the total, reset it to 0.0, and reset the environment.
```

## What it believes

Now the window. It reuses `cell_rect` and `draw` from `play_corridor.py`, so the corridor looks exactly as it did when you played it, and adds the agent's two values inside each cell:

```python file=watch_corridor.py
import pygame

from agent import QAgent
from corridor import COIN, TREASURE, Corridor
from play_corridor import cell_rect, draw

WIDTH, HEIGHT = 640, 260
SPEEDS = [1, 4, 16, 64]
EPSILONS = [0.0, 0.1, 0.3, 1.0]
BEST = (94, 234, 212)
OTHER = (148, 163, 184)


class Watcher:
    def __init__(self, env, agent):
        self.env = env
        self.agent = agent
        self.state, _ = env.reset()
        self.total = 0.0
        self.totals = []

    def advance(self):
        action = self.agent.act(self.state)
        next_state, reward, terminated, truncated, _ = self.env.step(action)
        self.agent.learn(self.state, action, reward, next_state, terminated)
        self.total += reward
        self.state = next_state
        if terminated or truncated:
            self.totals.append(self.total)
            self.total = 0.0
            self.state, _ = self.env.reset()


def value_labels(row):
    best = row.max()
    return [(f"<{row[0]:.2f}", BEST if row[0] == best else OTHER),
            (f"{row[1]:.2f}>", BEST if row[1] == best else OTHER)]


def draw_values(screen, font, Q):
    for cell in range(len(Q)):
        if cell in (COIN, TREASURE):
            continue
        rect = cell_rect(cell)
        (left, left_colour), (right, right_colour) = value_labels(Q[cell])
        screen.blit(font.render(left, True, left_colour), (rect.left + 4, rect.top + 4))
        label = font.render(right, True, right_colour)
        screen.blit(label, (rect.right - label.get_width() - 4, rect.bottom - label.get_height() - 4))


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Watch the corridor learn")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    env = Corridor()
    agent = QAgent(env.n_states, env.n_actions, epsilon=0.3)
    watcher = Watcher(env, agent)
    speed = 0
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_UP:
                speed = min(speed + 1, len(SPEEDS) - 1)
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_DOWN:
                speed = max(speed - 1, 0)
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_e:
                agent.epsilon = EPSILONS[(EPSILONS.index(agent.epsilon) + 1) % len(EPSILONS)]
        for _ in range(SPEEDS[speed]):
            watcher.advance()
        last = watcher.totals[-1] if watcher.totals else 0.0
        message = f"episodes {len(watcher.totals)}   last {last:.1f}   epsilon {agent.epsilon} (E)   speed {SPEEDS[speed]} (up/down)"
        draw(screen, font, env, watcher.total, message)
        draw_values(screen, font, agent.Q)
        pygame.display.flip()
        clock.tick(10 if speed == 0 else 60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

- **`value_labels(row)`** turns one row of the table into the two labels drawn in a cell: `<0.10` for LEFT in the top-left corner, `0.81>` for RIGHT in the bottom-right, the arrow showing the direction. The action the agent would pick greedily is drawn in the bright colour (`BEST`), the other in grey. When they tie, both are bright, because either could be picked. `{row[0]:.2f}` shows the value with 2 decimal places.
- **The two end cells show no values.** The agent is never *in* a terminal cell when it chooses, so those rows are never updated and stay 0. Drawing them would only suggest they mean something.
- **Right-aligning a label.** pygame places text by its top-left corner, so to make a label *end* 4 pixels from the cell's right edge, the code measures it first: `label.get_width()` is its width in pixels, and `rect.right - label.get_width() - 4` is where it must start.
- **Speed.** At speed 1 the agent takes one step per frame, at 10 frames a second (`clock.tick(10 if speed == 0 else 60)`), slow enough to read the values change. The up arrow moves through 4, 16 and 64 steps per frame at 60 frames a second, which is up to 3,840 steps a second.
- **E** cycles ε through 0, 0.1, 0.3 and 1, while it runs. **`EPSILONS.index(agent.epsilon)`** finds where the current value is in the list, `+ 1` moves to the next one, and `% len(EPSILONS)` wraps round from the last back to the first (`% 4` turns 4 into 0).

Press **Run** and watch at speed 1. The bright circle is the agent.

```predict
question: The agent starts with an empty table and ε = 0.3. Which value is most likely to become positive first?
choice: Q(1, left), the coin
choice: Q(3, right), the treasure
choice: Q(1, right)
answer: Q(1, left), the coin
explain: With an empty table every choice is a tie, so at first the agent wanders at random, and a random walk from cell 1 reaches the coin, one step away, before the treasure, three steps away, about three times in four. Measured over 200 seeds: Q(1, left) first in 146 of them, Q(3, right) in the other 54. The first step that earns anything is the first to be valued, because only a step that earns a reward, or leads to a cell already valued, can make a value positive.
verify: script first_positive.py
```

Watch long enough at speed 1 and you may see something surprising: Q(1, right) becoming positive **before** the treasure has ever been reached. The agent stepped right to cell 2, then left back to cell 1, then left to the coin. Q(2, left) learned that going back leads to the coin: 0.9 × 0.1 = 0.09. Then Q(1, right) learned that cell 2 is worth 0.09 at best: 0.9 × 0.09 = 0.081. The table always values the best route *it knows about*, and for a while the best route right goes right, back and left. The treasure's value replaces it once found.

Then press the up arrow a few times. The values settle where lesson 1.3 predicted: 0.81, 0.9 and 1.0 on the RIGHT side of cells 1, 2 and 3, all bright, and 0.1, 0.73 and 0.81 on the LEFT. How long that takes depends on luck: this agent (seed 0) needs about 330 episodes at ε = 0.3, and others measured anywhere from 12 to 550. Now close it, run it again and press **E** once, which moves ε from 0.3 to 1: it settles within about 60 episodes, whatever the seed (between 20 and 57 measured), because random exploring tries everything quickly and, as lesson 1.4 showed, Q-learning doesn't need to act well to learn the right values. Finally press **E** once more, to ε = 0, and the "last" reward becomes 1.0 every episode: the agent has learned the corridor.

```check
run ".venv/Scripts/python -m pytest -q tests/test_watch.py -k labels" label="each cell's labels show both values and mark the greedy choice" -- value_labels returns [("<" + left value, colour), (right value + ">", colour)], with BEST for every action equal to row.max().
run ".venv/Scripts/python -m pytest -q tests/test_watch.py -k viewer" label="the watcher window opens and closes"
```

## Your turn: how far ahead to look

**Build, on your own:** an experiment showing what γ decides.

With γ = 0.9 the agent walks past the coin to the treasure. A smaller γ makes later rewards count for less, and at some point the near coin must win. Where?

Work it out first, from what the values settle to. In cell 1:

- **LEFT** reaches the coin at once: worth **0.1**.
- **RIGHT** gets nothing for two steps and then the treasure, 1, discounted once per step after the first: worth **γ × γ × 1 = γ²**.

Where γ² comes from, one square at a time, working back from the treasure. Each score settles where it equals its own target, reward + γ × (best score on the next square) (lesson 1.3):

```text
Q(3, right) = 1 + (nothing after: the game ends)   = 1
Q(2, right) = 0 + γ × Q(3, right) = γ × 1          = γ
Q(1, right) = 0 + γ × Q(2, right) = γ × γ          = γ²
Q(1, left)  = 0.1 + (nothing after)                = 0.1
```

Each square further from the treasure multiplies by γ once more. The agent prefers RIGHT on square 1 when γ² is bigger than 0.1. A loop shows where the switch happens. Put it in a scratch file and run it:

```python
for gamma in (0.9, 0.5, 0.35, 0.32, 0.31, 0.3, 0.1):
    right = gamma * gamma
    choice = "treasure" if right > 0.1 else "coin"
    print(f"gamma {gamma}: right is worth {right:.4f}, left 0.1, so it goes for the {choice}")
```

```text
gamma 0.9: right is worth 0.8100, left 0.1, so it goes for the treasure
gamma 0.5: right is worth 0.2500, left 0.1, so it goes for the treasure
gamma 0.35: right is worth 0.1225, left 0.1, so it goes for the treasure
gamma 0.32: right is worth 0.1024, left 0.1, so it goes for the treasure
gamma 0.31: right is worth 0.0961, left 0.1, so it goes for the coin
gamma 0.3: right is worth 0.0900, left 0.1, so it goes for the coin
gamma 0.1: right is worth 0.0100, left 0.1, so it goes for the coin
```

```predict
question: Below which γ will a trained agent choose the coin? (Two decimal places.)
answer: 0.32
tolerance: 0.02
explain: The agent prefers the treasure while γ² > 0.1, so the line is where γ² = 0.1: γ = √0.1 ≈ 0.316. At γ = 0.35, γ² is 0.1225, a little more than the coin: treasure. At γ = 0.3, γ² is 0.09, a little less: coin. That's why the tests' numbers are so close together. γ is often described as how far ahead the agent looks: rewards k steps away are scaled by γ^k, so with γ = 0.3 a reward three steps away keeps only 0.3³ = 2.7% of its value.
verify: script gamma_line.py
```

Now confirm it with real agents. Create `discount.py` with one function, `which_end(gamma, episodes=1000, seed=0)`, that:

1. makes a `QAgent` for the corridor with that `gamma`, `epsilon=0.3` and that `seed`, and trains it for `episodes` episodes;
2. switches off exploring and plays **one** episode without learning, on a new `Corridor`;
3. returns `"treasure"` or `"coin"` according to the cell where that episode ended (or `"neither"` if it ran out of time).

`explore.py`'s `greedy_finds_treasure` does steps 2 and 3 nearly, so reuse its approach. Give the file an `if __name__ == "__main__":` block that prints the answer for γ = 0.9, 0.5, 0.35, 0.3 and 0.1.

```hints
nudge: After training, the agent must act greedily: what does that mean for `agent.epsilon`?
concept: Set `agent.epsilon = 0.0`, make a fresh `env = Corridor()`, call `run_episode(env, agent, learn=False)`, then look at `env.cell`: COIN or TREASURE.
shape: Imports: QAgent, Corridor with COIN and TREASURE, run_episode and train. Then: make the agent, train, switch off exploring, play one episode, and an if / if / return for the three answers.
answer: `discount.py`:
~~~python
from agent import QAgent
from corridor import COIN, TREASURE, Corridor
from train import run_episode, train


def which_end(gamma, episodes=1000, seed=0):
    agent = QAgent(Corridor.n_states, Corridor.n_actions, gamma=gamma, epsilon=0.3, seed=seed)
    train(Corridor(), agent, episodes)
    agent.epsilon = 0.0
    env = Corridor()
    run_episode(env, agent, learn=False)
    if env.cell == TREASURE:
        return "treasure"
    if env.cell == COIN:
        return "coin"
    return "neither"


if __name__ == "__main__":
    for gamma in (0.9, 0.5, 0.35, 0.3, 0.1):
        print(f"gamma {gamma}: {which_end(gamma)}")
~~~
```

Run it with `.venv\Scripts\python discount.py`:

```text
gamma 0.9: treasure
gamma 0.5: treasure
gamma 0.35: treasure
gamma 0.3: coin
gamma 0.1: coin
```

The agents agree with the arithmetic. (They agreed for each of 20 different seeds, too.) γ isn't a detail of the algorithm: it's part of the **question** you're asking the agent. "Get the most reward" means different things for different γ, and the agent will answer whichever one you asked.

```check
run ".venv/Scripts/python -m pytest -q tests/test_watch.py -k gamma" label="which_end shows the switch between gamma 0.35 and 0.3" -- Train a QAgent(..., gamma=gamma, epsilon=0.3, seed=seed) for episodes, then set epsilon to 0, play one episode with learn=False on a new Corridor, and report env.cell.
run ".venv/Scripts/python -m pytest -q tests/test_watch.py" label="all lesson 1.5 tests pass"
```

### What you've learned in this chapter

Everything Q-learning is, on five cells:

- an environment with Gymnasium's shape: `reset`, and `step` returning `(state, reward, terminated, truncated, info)`;
- a table, `Q[state, action]`, of expected future reward;
- the update: nudge Q(s, a) by α towards r + γ · max Q(s′, ·), or just r when the episode terminated;
- ε-greedy exploring, and why Q-learning still learns the best policy while exploring;
- what α, γ and ε each control, measured.

Chapter 2 puts this same agent, unchanged, on the first school problem, CartPole, where the state isn't a cell number but four measurements of a moving cart.
