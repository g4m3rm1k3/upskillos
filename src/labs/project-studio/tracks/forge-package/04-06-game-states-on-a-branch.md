---
title: 4.6 — Game States, on a Branch
runtime: python
run: breakout/__main__.py
---

The game starts the moment the window opens, can't be paused, and ends by checking numbers (`lives > 0 and bricks`). Real games have **states**: a title screen, playing, paused, game over, won, and rules for moving between them. This lesson builds them as a **state machine**, the pattern behind menus, network connections, characters in games and every app with screens.

It's also a bigger change than any so far, touching four files. So it's done the way teams do any change bigger than a few lines: on a **branch** of its own, merged into the main line only when it's finished and every check passes.

## The boundary tests so far

**Build:** make sure `tests/test_boundaries.py` matches the end of lesson 4.5, the reference answer to its Your turn.

```python file=tests/test_boundaries.py
from pygame import Vector2

from breakout import model


def test_a_ball_resting_exactly_against_the_left_wall_keeps_moving_left():
    ball = model.Ball(Vector2(model.BALL_RADIUS, 100), Vector2(-180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(-180, -240)


def test_a_ball_resting_exactly_against_the_right_wall_keeps_moving_right():
    ball = model.Ball(Vector2(model.WIDTH - model.BALL_RADIUS, 100), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(180, -240)


def test_a_ball_resting_exactly_against_the_top_keeps_moving_up():
    ball = model.Ball(Vector2(100, model.BALL_RADIUS), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(180, -240)
```

```check
run ".venv/Scripts/python check_walls.py" stdout="caught 3 of 3"
git-clean -- Commit lesson 4.5's work before starting a branch.
```

## A branch for the work

**Build:** a branch named `game-states`, and switch to it.

```powershell
git switch -c game-states
git branch
```

```text
* game-states
  main
```

**Understand: what a branch is.** Lesson 1.2 showed that history is a chain of commits, each naming its parent. A **branch** is just a name that points at one commit, the latest on that line of work, and moves forward each time you commit on it. `main` has been that name all along. `git switch -c game-states` creates a new name pointing at the **same** commit as `main`, and switches to it, so your next commits move `game-states` forward and leave `main` where it is:

```text
before:           ... ── A ── B          main, game-states (both at B)

after 2 commits:  ... ── A ── B          main
                                 \
                                  C ── D   game-states  ← HEAD
```

`HEAD` (lesson 1.2) is now attached to `game-states`: "the commit I'm on" is "wherever game-states points". `git branch` lists the branches, with `*` beside the current one.

Why bother, working alone? Because `main` stays a line of commits that each work. While the states are half-built, the game is broken; on a branch, that broken state never touches `main`. If the idea turns out badly, `git switch main` and `git branch -D game-states` throw it away whole. And from Chapter 15, when the project is on GitHub, a branch is how a change is reviewed before it joins `main`.

```check
git-branch game-states -- Run git switch -c game-states.
```

## The states

**Build:** the game's states, and the rules for changing between them, in the model.

```python file=breakout/model.py
import math
import random
from dataclasses import dataclass
from enum import Enum

import pygame
from pygame import Vector2

WIDTH, HEIGHT = 640, 480
ROW_COLOURS = [(239, 68, 68), (249, 115, 22), (234, 179, 8), (34, 197, 94), (59, 130, 246)]
PADDLE_SPEED = 420
PADDLE_WIDTH, PADDLE_HEIGHT = 100, 14
BALL_SPEED = 300
BALL_RADIUS = 6
BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP = 70, 20, 6
WALL_LEFT, WALL_TOP = 16, 60


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


@dataclass
class Ball:
    position: Vector2
    velocity: Vector2

    def move(self, dt: float) -> None:
        self.position += self.velocity * dt

    def bounce_off_walls(self) -> None:
        if self.position.x < BALL_RADIUS:
            self.position.x = BALL_RADIUS
            self.velocity.x = abs(self.velocity.x)
        if self.position.x > WIDTH - BALL_RADIUS:
            self.position.x = WIDTH - BALL_RADIUS
            self.velocity.x = -abs(self.velocity.x)
        if self.position.y < BALL_RADIUS:
            self.position.y = BALL_RADIUS
            self.velocity.y = abs(self.velocity.y)

    def rect(self) -> pygame.Rect:
        r = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
        r.center = (round(self.position.x), round(self.position.y))
        return r


def serve(rng: random.Random) -> Ball:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return Ball(Vector2(WIDTH / 2, HEIGHT / 2), Vector2(across, -up) * BALL_SPEED)


class Paddle:
    # Invariant: the whole paddle is always on the screen, 0 <= x <= WIDTH - PADDLE_WIDTH.
    def __init__(self) -> None:
        self._x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    @property
    def x(self) -> float:
        return self._x

    def move(self, direction: int, dt: float) -> None:
        self._x = clamp(self._x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self._x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


def autopilot(ball: Ball, paddle: Paddle) -> int:
    middle = paddle.x + PADDLE_WIDTH / 2
    if ball.position.x < middle - 10:
        return -1
    if ball.position.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: Ball, paddle: pygame.Rect) -> None:
    rect = ball.rect()
    if rect.colliderect(paddle) and ball.velocity.y > 0:
        offset = (rect.centerx - paddle.centerx) / (paddle.width / 2)
        ball.velocity = Vector2(BALL_SPEED * 0.8 * offset, -ball.velocity.y)


@dataclass
class Brick:
    rect: pygame.Rect
    colour: tuple[int, int, int]
    hits_left: int = 1
    points: int = 10
    cracked: bool = False

    def hit(self) -> int:
        if self.hits_left == 0:
            raise ValueError("this brick is already broken")
        self.hits_left -= 1
        self.cracked = True
        if self.hits_left == 0:
            return self.points
        return 0

    def current_colour(self) -> tuple[int, int, int]:
        if not self.cracked:
            return self.colour
        r, g, b = self.colour
        return int(r * 0.6), int(g * 0.6), int(b * 0.6)


def make_bricks() -> list[Brick]:
    bricks: list[Brick] = []
    for row, colour in enumerate(ROW_COLOURS):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
            if row == 0:
                bricks.append(Brick(rect, colour, hits_left=2, points=30))
            else:
                bricks.append(Brick(rect, colour))
    return bricks


def hit_brick(ball: pygame.Rect, bricks: list[Brick]) -> int | None:
    i = ball.collidelist([brick.rect for brick in bricks])
    if i == -1:
        return None
    return i


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"
    WON = "won"


class Game:
    def __init__(self, rng: random.Random) -> None:
        self.rng = rng
        self.paddle = Paddle()
        self.ball = serve(rng)
        self.bricks = make_bricks()
        self.score = 0
        self.lives = 3
        self.state = GameState.TITLE

    def start(self) -> None:
        if self.state == GameState.TITLE:
            self.state = GameState.PLAYING

    def toggle_pause(self) -> None:
        if self.state == GameState.PLAYING:
            self.state = GameState.PAUSED
        elif self.state == GameState.PAUSED:
            self.state = GameState.PLAYING

    def update(self, direction: int, dt: float) -> None:
        if self.state != GameState.PLAYING:
            return
        self.paddle.move(direction, dt)
        self.ball.move(dt)
        self.ball.bounce_off_walls()
        bounce_off_paddle(self.ball, self.paddle.rect())

        hit = hit_brick(self.ball.rect(), self.bricks)
        if hit is not None:
            self.score += self.bricks[hit].hit()
            if self.bricks[hit].hits_left == 0:
                self.bricks.pop(hit)
            self.ball.velocity.y = -self.ball.velocity.y

        if self.ball.rect().top > HEIGHT:
            self.lives -= 1
            if self.lives > 0:
                self.ball = serve(self.rng)

        if self.lives == 0:
            self.state = GameState.OVER
        elif not self.bricks:
            self.state = GameState.WON
```

**Understand: a state machine.**

> **State machine** (finite state machine): a model of something that is always in exactly one of a fixed set of **states**, and moves between them only through defined **transitions**, each triggered by an **event**.

The states are a `GameState` enum (lesson 3.4). The transitions:

| From | Event | To |
|---|---|---|
| `TITLE` | `start()` | `PLAYING` |
| `PLAYING` | `toggle_pause()` | `PAUSED` |
| `PAUSED` | `toggle_pause()` | `PLAYING` |
| `PLAYING` | the last life is lost, in `update` | `OVER` |
| `PLAYING` | the last brick breaks, in `update` | `WON` |

The last two happen at the end of `update`, which checks `if self.lives == 0:` first and `elif not self.bricks:` second. Traced for an unlucky frame where the ball breaks the last brick and is then lost below the screen:

```text
bricks 1 → 0   (the brick breaks)
lives  1 → 0   (the ball is lost)
self.lives == 0   True   →  state = OVER, and the elif is never checked
```

So when both happen in the same frame, it's a loss. That's a choice; checking bricks first would make it a win. What matters is that it's decided in one place, in a fixed order, and a test can pin it down.

Every other combination does nothing: `start()` while playing is ignored, `toggle_pause()` on the title screen is ignored. Those are decisions, not accidents: a key pressed at the wrong moment shouldn't break anything. Drawn as a diagram:

```text
            start()                       last life lost
   TITLE ───────────▶  PLAYING  ───────────────────────────▶  OVER
                        │  ▲  │
         toggle_pause() │  │  │           last brick breaks
                        ▼  │  └────────────────────────────▶  WON
                       PAUSED
            (toggle_pause() again goes back up to PLAYING)
```

`update` now starts with `if self.state != GameState.PLAYING: return`: when paused, on the title screen or after the end, nothing moves, which is what *paused* means. `playing()` is gone: "is the game being played?" is now `game.state == GameState.PLAYING`, a fact stored once, instead of being worked out from `lives` and `bricks` everywhere it's needed.

> **Engineer:** without a state machine, states hide in combinations of variables (`lives > 0 and bricks and not paused and started`), and every new state multiplies the combinations, and the bugs. With one, the current state is one value, the allowed changes are a short list, and "what happens if P is pressed on the game-over screen?" has an answer you can look up and test.

This commit leaves the game tests failing, as the next step shows: they still expect a game that plays without being started. On a branch that's fine for a moment, because `main` still has the working game. Commit the model on the branch:

```powershell
git add breakout/model.py
git commit -m "Add game states to the model"
```

```check
contains breakout/model.py "class GameState(Enum):"
git-branch game-states -- Stay on the game-states branch.
git-message "game states"
```

## The tests meet the title screen

**Build:** the game tests, starting their games.

Run the game tests before changing them:

```text
FAILED tests/test_game.py::test_a_new_game - AttributeError: 'Game' object ha...
FAILED tests/test_game.py::test_ten_seconds_of_autopilot_matches_the_test_run
FAILED tests/test_game.py::test_a_missed_ball_costs_a_life_and_a_new_ball_is_served
...
6 failed in 0.29s
```

All six. A new game now waits on the title screen, so `update` does nothing until it's started, and `playing()` no longer exists. The behaviour changed on purpose: the tests need to start their games.

```python file=tests/test_game.py
import random

import pygame
from pygame import Vector2

from breakout import model


def started_game(seed: int = 0) -> model.Game:
    game = model.Game(random.Random(seed))
    game.start()
    return game


def autopilot_game(seed: int, frames: int) -> model.Game:
    game = started_game(seed)
    for _ in range(frames):
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
    return game


def test_a_new_game_waits_on_the_title_screen():
    game = model.Game(random.Random(0))
    assert (game.score, game.lives, len(game.bricks)) == (0, 3, 40)
    assert game.state == model.GameState.TITLE


def test_ten_seconds_of_autopilot_matches_the_test_run():
    game = autopilot_game(0, 600)
    assert (game.paddle.rect().x, game.score, game.lives, len(game.bricks)) == (435, 70, 3, 33)


def test_a_missed_ball_costs_a_life_and_a_new_ball_is_served():
    game = started_game()
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 2
    assert game.ball.position == Vector2(320, 240)


def test_a_ball_that_hits_a_brick_breaks_it_and_bounces():
    game = started_game()
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert (game.score, len(game.bricks)) == (10, 0)
    assert game.ball.velocity.y == 240


def test_losing_the_last_life_ends_the_game():
    game = started_game()
    game.lives = 1
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 0
    assert game.state == model.GameState.OVER
    before = (game.score, game.lives, len(game.bricks))
    game.update(0, 1 / 60)
    assert (game.score, game.lives, len(game.bricks)) == before


def test_breaking_the_last_brick_wins():
    game = started_game()
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert game.bricks == []
    assert game.score == 10
    assert game.state == model.GameState.WON
```

**Understand.** `started_game()` makes a game and starts it: one helper, used by every test that needs a game in play, so the "how do you get a game going" knowledge is in one place (DRY, lesson 2.2). The first test now pins the new behaviour, *a new game waits on the title screen*, and the end-of-game tests check the state they end in.

```check
run ".venv/Scripts/python -m pytest -q tests/test_game.py" stdout="6 passed"
```

## Keys that change state

**Build:** Space starts (or restarts) the game, P pauses it, and test runs start at once.

```python file=breakout/app.py
import os
import random
import sys

import pygame

from breakout.draw import draw
from breakout.model import HEIGHT, WIDTH, Game, GameState, autopilot
from breakout.settings import Hold, parse_args


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    rng = random.Random(seed)
    game = Game(rng)
    if settings.test_frames is not None:
        game.start()

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    frames = 0
    running = True
    while running:
        if settings.test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == settings.lag_at:
            dt = 0.5
        else:
            dt = 1 / 60

        for event in pygame.event.get():
            if event.type == pygame.QUIT or event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                if game.state in (GameState.OVER, GameState.WON):
                    game = Game(rng)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_p:
                game.toggle_pause()

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                direction -= 1
            if keys[pygame.K_RIGHT]:
                direction += 1
        elif settings.hold == Hold.LEFT:
            direction = -1
        elif settings.hold == Hold.RIGHT:
            direction = 1
        elif settings.hold == Hold.AUTO:
            direction = autopilot(game.ball, game.paddle)
        game.update(direction, dt)

        draw(screen, font, game)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(game.ball.rect())
        print(
            f"frames={frames} paddle_x={game.paddle.rect().x} score={game.score} lives={game.lives} "
            f"bricks={len(game.bricks)} inside={inside}"
        )


def run() -> None:
    main(sys.argv[1:])
```

**Understand.** Two new events in the loop: a `KEYDOWN` whose key is `pygame.K_SPACE`, the Space bar, or `pygame.K_p`, the P key. **Space**: on the game-over or won screen, make a new `Game` first (with the same random generator, so its serves continue the same sequence), then `start()` it; on the title screen, just `start()`. `game.state in (GameState.OVER, GameState.WON)` asks whether the state is one of the two in that tuple: `in` works on any sequence. The random generator is now made once into its own variable, `rng = random.Random(seed)`, instead of directly inside `Game(...)`, precisely so the Space handler can hand the *same* generator to the new game. **P**: `toggle_pause()`. The keyboard only sends **events** to the state machine; the rules about what each event means in each state stay in the model, where they're tested.

A test run calls `game.start()` straight away, so it skips the title screen and every characterisation test still sees exactly the same game.

```check
contains breakout/app.py "game.toggle_pause()"
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="test runs still play exactly the same games"
```

## Words for each state

**Build:** a centred message for every state except playing.

```python file=breakout/draw.py
import pygame

from breakout.model import Game, GameState

BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)
MESSAGES = {
    GameState.TITLE: "Breakout: press Space to start",
    GameState.PAUSED: "Paused: press P to go on",
    GameState.OVER: "Game over: press Space to play again",
    GameState.WON: "You win! Press Space to play again",
}


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game) -> None:
    screen.fill(BACKGROUND)
    for brick in game.bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, game.paddle.rect())
    pygame.draw.ellipse(screen, BALL_COLOUR, game.ball.rect())
    screen.blit(font.render(f"Score {game.score}   Lives {game.lives}", True, TEXT_COLOUR), (16, 16))
    message = MESSAGES.get(game.state)
    if message is not None:
        text = font.render(message, True, TEXT_COLOUR)
        screen.blit(text, text.get_rect(center=screen.get_rect().center))
```

**Understand.** `MESSAGES` is a **dictionary** written out in full: `{key: value, key: value}`, each state paired with its text. `MESSAGES` maps each state to its text. `MESSAGES.get(game.state)` returns the text, or `None` for a state that isn't in the dictionary, `PLAYING`, which shows no message. A dictionary of states to behaviour is a common way to keep a state machine's per-state details in one place, instead of a chain of `if`s.

`font.render(...)` makes the text as a surface, a picture of the words. Every surface has a `get_rect()` method returning a `Rect` the size of the picture, and giving it `center=` places that `Rect` with its centre at a point: here `screen.get_rect().center`, the screen's centre, (320, 240). Blitting the text at that `Rect` puts it exactly in the middle, whatever its length: a 200-pixel message starts at x 220, a 300-pixel one at 170.

Run the game: the title screen waits for Space, P pauses and resumes, and losing or winning offers another game.

```check
contains breakout/draw.py "MESSAGES"
```

## The replay starts its game

**Build:** `replay.py`, starting its game and watching for the end states.

`replay.py` stopped when `game.playing()` became false; that method is gone. It now starts its game with `game.start()` and stops when the state is `OVER` or `WON`. Not `!= PLAYING`: a game that's `PAUSED` or on the `TITLE` screen isn't over, and the replay should only stop at a real ending.

```python file=replay.py
"""Plays a game with the autopilot, without a window, and reports each change of score, lives or bricks."""

import random
import sys

from breakout import model


def play(seed: int, frames: int) -> list[str]:
    game = model.Game(random.Random(seed))
    game.start()
    events: list[str] = []
    for frame in range(frames):
        before = (game.score, game.lives, len(game.bricks))
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
        after = (game.score, game.lives, len(game.bricks))
        if after != before:
            events.append(f"frame {frame}: score {after[0]}, lives {after[1]}, bricks {after[2]}")
        if game.state in (model.GameState.OVER, model.GameState.WON):
            events.append(f"frame {frame}: the game is over")
            break
    return events


if __name__ == "__main__":
    for line in play(int(sys.argv[1]), int(sys.argv[2])):
        print(line)
```

```check
run ".venv/Scripts/python replay.py 0 600" stdout="frame 492: score 70, lives 3, bricks 33"
run ".venv/Scripts/python -m pytest -q" stdout="59 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
```

## Your turn: test the transitions, then merge

**Build, on your own:** tests for the state machine, then bring the branch into `main`.

Write `tests/test_states.py` with these four tests:

| Test name | Checks |
|---|---|
| `test_starting_from_the_title_begins_play` | a new game, after `start()`, is `PLAYING` |
| `test_p_pauses_and_p_again_resumes` | `toggle_pause()` on a playing game makes it `PAUSED`; again, `PLAYING` |
| `test_a_paused_game_does_not_move` | after pausing, an `update` leaves the ball's position unchanged |
| `test_pausing_on_the_title_screen_does_nothing` | `toggle_pause()` on a new game leaves it on `TITLE` |

When all 63 tests pass and every other check is clean, commit them **on the branch**. Then merge the branch into `main`, and delete it:

```powershell
git switch main
git merge game-states
git branch -d game-states
```

Read what `git merge` prints before deleting anything. **Merging** brings the commits of one branch into the branch you're on. Here, `main` hasn't moved since `game-states` was made from it, so there's nothing to combine: Git just moves the `main` name forward to the branch's latest commit, and says `Fast-forward`:

```text
before:   A ── B ── C ── D        main → B,  game-states → D
after:    A ── B ── C ── D        main → D,  game-states → D
```

No new commit is made. Then `git branch -d game-states` deletes only the branch's **name**; its commits are on `main` now. The next lesson meets a merge where both branches have moved.

```hints
nudge: Each test is three or four lines: make a game, do the event(s), check `game.state` (or, for the third, compare the ball's position before and after). Which helper in `test_game.py` already makes a started game?
concept: Copy `started_game` into the new file, or start the game inside each test. For "does not move", copy the ball's position before the update: `before = Vector2(game.ball.position)` makes a **new** `Vector2` with the same components. Without the copy, `before` would be the same object as `game.ball.position` (lesson 3.2's aliasing), and the test would pass even if the ball moved.
shape: `from pygame import Vector2`, `import random`, `from breakout import model`. Four tests: start and check; start, pause, check, pause, check; start, pause, copy position, update, compare; new game, pause, check still `TITLE`. Then `git add .`, `git commit -m "..."`, and the three branch commands.
answer: ~~~python
import random

from pygame import Vector2

from breakout import model


def started_game() -> model.Game:
    game = model.Game(random.Random(0))
    game.start()
    return game


def test_starting_from_the_title_begins_play():
    assert started_game().state == model.GameState.PLAYING


def test_p_pauses_and_p_again_resumes():
    game = started_game()
    game.toggle_pause()
    assert game.state == model.GameState.PAUSED
    game.toggle_pause()
    assert game.state == model.GameState.PLAYING


def test_a_paused_game_does_not_move():
    game = started_game()
    game.toggle_pause()
    before = Vector2(game.ball.position)
    game.update(0, 1 / 60)
    assert game.ball.position == before


def test_pausing_on_the_title_screen_does_nothing():
    game = model.Game(random.Random(0))
    game.toggle_pause()
    assert game.state == model.GameState.TITLE
~~~

When you merge, Git prints `Fast-forward`: `main` hadn't moved since the branch started, so merging just moves the `main` name forward to the branch's latest commit, with no new commit needed. `git branch -d` deletes only the **name**; the commits are now on `main`. (`-d` refuses to delete a branch whose work hasn't been merged anywhere; `-D` deletes it anyway, which is how an abandoned experiment is thrown away.)
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_states.py" stdout="4 passed" label="the four state-machine tests pass"
run ".venv/Scripts/python -m pytest -q" stdout="63 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-branch main -- Switch back with git switch main, then git merge game-states.
git-tracked tests/test_states.py -- Commit the tests on the branch, then merge it into main.
git-no-branch game-states -- Delete the merged branch: git branch -d game-states.
git-clean
```

## What did we actually learn?

- **A state machine**: one current state from a fixed set, changed only by defined transitions, each triggered by an event. Everything else is ignored, on purpose.
- **Events come from outside, rules live in the model**: the keyboard sends `start` and `toggle_pause`; the model decides what they mean.
- **A dictionary keyed by state** keeps per-state details in one place.
- **A branch** is a movable name for a line of commits; `main` stays working while the branch is unfinished.
- **Merging** brings a branch's commits into another; a **fast-forward** merge just moves the name when nothing else has changed. Delete a merged branch's name; its commits stay.
- **Copy a mutable value** before changing what it belongs to, if you want to compare with it afterwards.

State machines look the same in C# and Java: an `enum GameState`, a field holding the current one, and methods (or a `switch`) that decide the transitions. Larger ones use the **State pattern**, one class per state, which Chapter 10's nodes make easy. Git branches work identically in every language's projects: `git switch -c`, commit, merge, delete.
