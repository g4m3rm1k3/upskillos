---
title: 1.1 — A Corridor You Can Play
track: Q-Arcade — Q-learning in Five Cells
trackOrder: 12.2
runtime: python
run: play_corridor.py
---

**Starting a new chapter:** every Q-Arcade chapter uses the same `q-arcade` folder, so your files carry straight on. If the file tree is ever empty, click **Choose folder…** and select `q-arcade`.

Reinforcement learning has a small vocabulary, and every word in it names something you'll build in this lesson:

- The **environment** is the world: here, a corridor of five cells.
- The **agent** is whatever makes the decisions. In this lesson, that's you.
- The **state** is what the agent knows about the world right now: which cell you're in.
- An **action** is a choice the agent can make: step left or step right.
- A **reward** is a number the world hands back after each action: 0 for most steps, something more at the ends.
- An **episode** is one game from start to finish.

The corridor:

```text
 cell:    0       1       2       3       4
        coin    start                  treasure
        +0.1                             +1
```

You start in cell 1. One step left reaches a small coin, worth 0.1, and the game ends. Three steps right reach the treasure, worth 1, and the game ends. It's deliberately tiny: small enough that, in two lessons, you can follow every number Q-learning computes by hand. And it already has the problem that makes learning hard: the small reward is **closer**.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_corridor.py** above.

```python file=tests/test_corridor.py provided
# Tests for corridor.py and play_corridor.py (lesson 1.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_corridor.py
import pygame


def test_reset_puts_you_on_the_start_cell():
    from corridor import START, Corridor
    env = Corridor()
    state, info = env.reset()
    assert state == START and env.steps == 0
    assert info == {}, "reset returns (state, info), as Gymnasium does"


def test_moves_go_left_and_right():
    from corridor import LEFT, RIGHT, Corridor
    env = Corridor()
    env.reset()
    assert env.step(RIGHT)[0] == 2
    assert env.step(RIGHT)[0] == 3
    assert env.step(LEFT)[0] == 2


def test_moves_on_plain_floor_pay_nothing_and_go_on():
    from corridor import RIGHT, Corridor
    env = Corridor()
    env.reset()
    _, reward, terminated, truncated, info = env.step(RIGHT)
    assert reward == 0.0 and terminated is False and truncated is False and info == {}


def test_ends_the_coin_pays_a_little():
    from corridor import LEFT, Corridor
    env = Corridor()
    env.reset()
    assert env.step(LEFT)[:3] == (0, 0.1, True)


def test_ends_the_treasure_pays_one():
    from corridor import RIGHT, Corridor
    env = Corridor()
    env.reset()
    env.step(RIGHT)
    env.step(RIGHT)
    assert env.step(RIGHT)[:3] == (4, 1.0, True)


def test_ends_then_a_new_episode_begins():
    from corridor import LEFT, START, Corridor
    env = Corridor()
    env.reset()
    env.step(LEFT)
    assert env.reset()[0] == START and env.steps == 0


def test_timeout_after_max_steps():
    from corridor import LEFT, RIGHT, Corridor
    env = Corridor(max_steps=4)
    env.reset()
    for action in (RIGHT, LEFT, RIGHT):
        assert env.step(action)[3] is False
    _, reward, terminated, truncated, _ = env.step(LEFT)
    assert truncated is True and terminated is False and reward == 0.0


def test_timeout_never_on_a_final_step():
    from corridor import LEFT, Corridor
    env = Corridor(max_steps=1)
    env.reset()
    _, _, terminated, truncated, _ = env.step(LEFT)
    assert terminated is True and truncated is False, "reaching an end is terminated, not truncated"


def test_play_keys_choose_actions():
    from corridor import LEFT, RIGHT
    from play_corridor import key_to_action
    assert key_to_action(pygame.K_LEFT) == LEFT
    assert key_to_action(pygame.K_RIGHT) == RIGHT
    assert key_to_action(pygame.K_a) is None


def test_play_cells_sit_side_by_side():
    from play_corridor import CELL, cell_rect
    assert cell_rect(1).left - cell_rect(0).left == CELL
    assert cell_rect(0).top == cell_rect(4).top


def test_play_window_opens_and_closes():
    from play_corridor import run
    assert run(max_frames=2) == 2
```

Three things to notice before writing any code:

- **`env = Corridor()`** makes one corridor and names it `env`, short for *environment*, the usual name for the world an agent acts in. `Corridor` is a **class**, which you'll write in the next step; the step explains what that means. `env.reset()` and `env.step(RIGHT)` then ask that corridor to start a game and to make a move.
- `env.step(RIGHT)[0]` and `env.step(LEFT)[:3]`: `step` returns several values at once (a **tuple**), and the tests pick out the ones they need. `[0]` is the first, the new state; `[:3]` is the first three, `(state, reward, terminated)`.
- `terminated` and `truncated` are two different ways for an episode to end. The last two `timeout` tests are about the difference, which this lesson explains when you build it.

The test names are grouped by their first word, and each step below checks its own group with `pytest -k <word>`. What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `reset` | a new game starts on the start square, with the step count at 0 | a second game starting where the last one ended |
| `moves` | RIGHT goes up a square, LEFT goes down, and a plain square pays nothing | left and right swapped |
| `ends` | the coin pays 0.1, the treasure 1, and both end the game | an end square that doesn't stop the game |
| `timeout` | a game that runs too long is cut off, and reported differently from reaching an end | a time-out that looks like reaching the coin |
| `play` | the window turns key presses into moves and lays out the squares | the left arrow moving right |

```check
file tests/test_corridor.py -- Click "Create provided tests/test_corridor.py" above.
```

## The state

Create `corridor.py`:

```python file=corridor.py
LEFT, RIGHT = 0, 1
COIN, START, TREASURE = 0, 1, 4


class Corridor:
    n_states = 5
    n_actions = 2

    def __init__(self, max_steps=20):
        self.max_steps = max_steps
        self.cell = START
        self.steps = 0

    def reset(self, seed=None):
        self.cell = START
        self.steps = 0
        return self.cell, {}
```

**What a class is.** So far you've written functions: code that takes values and returns a result, and remembers nothing between calls. A corridor needs to **remember** things between moves: where the player is now, and how many steps it has taken. A **class** bundles that memory together with the functions that use it.

- `class Corridor:` describes what every corridor has and can do. It's a blueprint: no corridor exists yet.
- `env = Corridor()` builds one corridor from the blueprint. That's called an **object** (or **instance**) of the class. You could build several, and each would remember its own position.
- Values stored on the object, written `self.something`, are its **attributes**: here `self.max_steps`, `self.cell` and `self.steps`. They stay there between calls.
- Functions written inside the class are its **methods**: here `__init__` and `reset`. You call them on an object, as `env.reset()`.
- **`self`** is the object a method was called on. When you write `env.reset()`, Python runs `reset` with `self` set to `env`, so `self.cell = START` means "set **this** corridor's cell". Every method has `self` as its first parameter, and you never pass it yourself: Python fills it in.
- **`__init__`** (two underscores each side) is the method Python runs automatically when an object is built. `Corridor()` runs `__init__(self, max_steps=20)`, which sets up the attributes. `Corridor(max_steps=4)`, which one of the tests uses, passes 4 instead of the default 20.

So after `env = Corridor()` and `env.reset()`, the object `env` holds `cell = 1` and `steps = 0`, and every later `env.step(...)` reads and changes those same two numbers.

Now, why the corridor is written the way it is:

- **Actions and cells are numbers.** `LEFT` is 0 and `RIGHT` is 1; the cells are 0 to 4. The names are only there for people reading the code. The numbers matter because, next lesson, the agent stores what it learns in a table with one **row per state** and one **column per action**, and a number is exactly what you need to pick a row or a column.
- **`n_states` and `n_actions`** are written inside the class but outside any method, so they belong to the class itself: `Corridor.n_states` is 5 without making a corridor first. The agent will read them to know how big its table must be.
- **`self.cell` is the whole state.** It's everything the corridor needs to know to decide what happens next, and everything the agent gets to see.
- **`reset` starts an episode** and returns two things: the first state, and an empty dictionary called `info` for extra details. The `seed` argument is accepted and ignored, because nothing in the corridor is random. Both are there because **Gymnasium**, the library every reinforcement-learning tool expects, shapes its environments exactly this way: `reset(seed=...)` returning `(state, info)`. Matching it now means that in Chapter 2 your agent can play Gymnasium's CartPole without changing a line.

```check
run ".venv/Scripts/python -m pytest -q tests/test_corridor.py -k reset" label="reset starts an episode on the start cell" -- reset sets cell to START and steps to 0, then returns (self.cell, {}).
```

## Moving

Add `step`, which takes an action and moves:

```python file=corridor.py
LEFT, RIGHT = 0, 1
COIN, START, TREASURE = 0, 1, 4


class Corridor:
    n_states = 5
    n_actions = 2

    def __init__(self, max_steps=20):
        self.max_steps = max_steps
        self.cell = START
        self.steps = 0

    def reset(self, seed=None):
        self.cell = START
        self.steps = 0
        return self.cell, {}

    def step(self, action):
        if action == RIGHT:
            self.cell += 1
        else:
            self.cell -= 1
        self.steps += 1
        reward = 0.0
        terminated = False
        truncated = False
        return self.cell, reward, terminated, truncated, {}
```

**How `step` works, line by line.** Its one input, `action`, is the move to make: `RIGHT` (1) or `LEFT` (0).

- `if action == RIGHT: self.cell += 1` moves the player one square right. `+= 1` is short for `self.cell = self.cell + 1`: on square 1, it becomes square 2.
- `else: self.cell -= 1` moves left. It uses `else` rather than `elif action == LEFT`, because there are only two actions, so anything that isn't RIGHT is LEFT.
- `self.steps += 1` counts the move, for the time limit you'll add in the Your turn.
- `reward = 0.0`, `terminated = False` and `truncated = False` are what every ordinary move reports. The next step adds the exceptions: the two end squares.
- `return self.cell, reward, terminated, truncated, {}` hands back five values at once. Python packs them into a **tuple**, an unchangeable sequence, and the caller can unpack them into five names in one line: `state, reward, terminated, truncated, info = env.step(RIGHT)`.

`step` returns **five** values, again in Gymnasium's order:

| position | name | meaning |
|---|---|---|
| 0 | `state` | where you are now, after the move |
| 1 | `reward` | what this one action earned |
| 2 | `terminated` | the world reached an ending; nothing comes after this state |
| 3 | `truncated` | the episode was cut off by a time limit; the world itself could have gone on |
| 4 | `info` | extra details (none here) |

The reward is for **this action only**, not a running score. Adding the rewards up is the agent's business; the environment just reports what each step paid.

```check
run ".venv/Scripts/python -m pytest -q tests/test_corridor.py -k moves" label="step moves left and right and returns five values" -- RIGHT adds 1 to self.cell, anything else subtracts 1; count the step; return (self.cell, 0.0, False, False, {}).
```

## The two ends

Now the ends pay out and stop the episode:

```python file=corridor.py
LEFT, RIGHT = 0, 1
COIN, START, TREASURE = 0, 1, 4


class Corridor:
    n_states = 5
    n_actions = 2

    def __init__(self, max_steps=20):
        self.max_steps = max_steps
        self.cell = START
        self.steps = 0

    def reset(self, seed=None):
        self.cell = START
        self.steps = 0
        return self.cell, {}

    def step(self, action):
        if action == RIGHT:
            self.cell += 1
        else:
            self.cell -= 1
        self.steps += 1
        reward = 0.0
        terminated = False
        if self.cell == COIN:
            reward = 0.1
            terminated = True
        elif self.cell == TREASURE:
            reward = 1.0
            terminated = True
        truncated = False
        return self.cell, reward, terminated, truncated, {}
```

Cells 0 and 4 are **terminal states**: once you're in one, the episode is over. Notice that nothing stops `self.cell` going below 0 or above 4. It doesn't need to: an episode always ends on reaching 0 or 4, and the next thing that happens is `reset`, which puts you back on cell 1. (If a program kept calling `step` after an ending, the corridor would happily walk off the end. Gymnasium's environments have the same rule: after `terminated` or `truncated`, call `reset`.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_corridor.py -k ends" label="the coin pays 0.1, the treasure 1, and both end the episode" -- After moving: on COIN, reward 0.1 and terminated True; on TREASURE, reward 1.0 and terminated True.
```

## Your turn: running out of time

**Build, on your own:** end an episode that has gone on too long.

An agent that hasn't learned anything yet moves at random, and a random walk can wander back and forth for a long time. So `Corridor(max_steps=20)` should give up after 20 steps. That's a different kind of ending from reaching the coin, and the difference matters:

- **Terminated:** the world itself ended. The value of what comes next is **zero**, because nothing comes next.
- **Truncated:** *we* stopped the episode, for our own convenience. The world hasn't ended; the agent was just interrupted. If it had been allowed to continue, more reward might have come.

In lesson 1.3 the agent's learning rule treats these two differently, and mixing them up is one of the most common bugs in reinforcement-learning code. So the corridor must report them separately.

Change `step` so that `truncated` is `True` when the episode has now taken `max_steps` steps **and** didn't just end at the coin or the treasure. On the step that reaches an end, it's `terminated` only, even if that was also the last allowed step. The two `timeout` tests say exactly this.

```hints
nudge: `truncated = False` is the line to change. What two things must both be true for it to be True?
concept: Two conditions: the step count has reached the limit (`self.steps >= self.max_steps`), and the episode did not just terminate (`not terminated`). `and` makes a value that's True only when both are.
answer: Replace `truncated = False` with:
~~~python
        truncated = not terminated and self.steps >= self.max_steps
~~~
It comes after the `if`/`elif`, so `terminated` already says whether this step reached an end.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_corridor.py -k timeout" label="truncated after max_steps, but never on a step that ends the episode" -- truncated = not terminated and self.steps >= self.max_steps, after the coin and treasure checks.
```

## Play it yourself

Before an agent learns this corridor, play it. Create `play_corridor.py`:

```python file=play_corridor.py
import pygame

from corridor import COIN, LEFT, RIGHT, TREASURE, Corridor

WIDTH, HEIGHT = 640, 260
CELL = 100
MARGIN = 70
TOP = 60
BACKGROUND = (24, 26, 33)
FLOOR = (51, 65, 85)
GOLD = (250, 204, 21)
TEXT = (226, 232, 240)
PLAYER = (94, 234, 212)


def cell_rect(cell):
    return pygame.Rect(MARGIN + cell * CELL, TOP, CELL - 6, CELL - 6)


def key_to_action(key):
    if key == pygame.K_LEFT:
        return LEFT
    if key == pygame.K_RIGHT:
        return RIGHT
    return None


def draw(screen, font, env, total, message):
    screen.fill(BACKGROUND)
    for cell in range(env.n_states):
        rect = cell_rect(cell)
        pygame.draw.rect(screen, FLOOR, rect)
        if cell == COIN:
            pygame.draw.circle(screen, GOLD, rect.center, 10)
            screen.blit(font.render("coin +0.1", True, TEXT), (rect.left, rect.bottom + 6))
        elif cell == TREASURE:
            pygame.draw.circle(screen, GOLD, rect.center, 28)
            screen.blit(font.render("treasure +1", True, TEXT), (rect.left, rect.bottom + 6))
    pygame.draw.circle(screen, PLAYER, cell_rect(env.cell).center, 18, 4)
    screen.blit(font.render(f"step {env.steps}   reward so far {total:.1f}", True, TEXT), (MARGIN, 20))
    screen.blit(font.render(message, True, TEXT), (MARGIN, TOP + CELL + 50))


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("The corridor")
    font = pygame.font.Font(None, 28)
    clock = pygame.time.Clock()
    env = Corridor()
    env.reset()
    total = 0.0
    done = False
    message = "Left and right arrows move."
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and done and event.key == pygame.K_SPACE:
                env.reset()
                total = 0.0
                done = False
                message = "Left and right arrows move."
            elif event.type == pygame.KEYDOWN and not done:
                action = key_to_action(event.key)
                if action is not None:
                    _, reward, terminated, truncated, _ = env.step(action)
                    total += reward
                    if terminated or truncated:
                        done = True
                        message = f"Episode over: {total:.1f}. Space starts again."
        draw(screen, font, env, total, message)
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

Press **Run** and play a few episodes. Take the coin once, and walk to the treasure once.

How it's put together:

- **The game doesn't contain the rules.** Everything about the world (moving, rewards, endings) lives in `Corridor`. `play_corridor.py` only turns key presses into actions and draws what the corridor reports. That separation is the whole point: in lesson 1.5 an agent replaces your key presses, and the corridor doesn't change at all.
- **`pygame.Rect(left, top, width, height)`** is a rectangle on the screen. `cell_rect(cell)` places cell number `cell` at `MARGIN + cell * CELL` pixels from the left: cell 0 at 70, cell 1 at 170, cell 2 at 270, and so on. Each is `CELL - 6` = 94 pixels wide, which leaves a 6-pixel gap between neighbours. `rect.center` is the middle point, used to place the circles.
- **`font.render(text, True, colour)`** turns text into a small picture (a Surface); `True` smooths its edges. **`screen.blit(picture, (x, y))`** copies that picture onto the screen with its top-left corner at `(x, y)`. All text in pygame is drawn this way.
- **`done`** remembers that the episode is over. Arrow keys are then ignored and only Space works, which calls `reset`, because a finished episode must be reset before the next `step`.
- **`total += reward`** is the running score, kept by the player and not by the corridor, as described above.

Each key press runs the loop that every agent in this series runs: **observe** the state (the drawing), **choose** an action (your key), and the environment **responds** with the next state, a reward and whether it's over.

```predict
question: What's the most reward one episode can earn?
choice: 0.1, by taking the coin at once
choice: 1.0, by walking right three times
choice: 1.1, by taking the coin and then the treasure
answer: 1.0, by walking right three times
explain: The coin ends the episode, so you can't collect both. Three steps right earn 0 + 0 + 1 = 1.0. That's the best, but notice what it costs: three steps with nothing until the last one. One step left pays at once. An agent that learns from rewards has to discover that the far, delayed reward is the better one, and that's exactly what the next lessons build.
verify: .venv/Scripts/python -c "from corridor import RIGHT, Corridor; env = Corridor(); env.reset(); print('1.0, by walking right three times' if sum(env.step(RIGHT)[1] for _ in range(3)) == 1.0 else 'no')"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_corridor.py -k play" label="the game maps keys, lays out the cells and opens its window" -- key_to_action returns LEFT, RIGHT or None; cell_rect places each cell CELL pixels after the one before.
run ".venv/Scripts/python -m pytest -q tests/test_corridor.py" label="all lesson 1.1 tests pass"
```

### What you have

A world with Gymnasium's shape (`reset`, and a `step` that returns five values) and a way to play it. Next lesson: the table where an agent writes down what it learns.
