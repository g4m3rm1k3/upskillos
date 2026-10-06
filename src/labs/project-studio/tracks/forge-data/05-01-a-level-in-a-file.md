---
title: 5.1 — A Level in a File
track: Forge — Levels Are Data
trackOrder: 35
runtime: python
run: breakout/__main__.py
---

Every Breakout game has the same wall, because the wall is **code**: two loops in `make_bricks`. A second level would mean a second function; a level made by someone who doesn't program would be impossible. This chapter turns levels into **data**: files the game reads, that anyone can write. That brings the questions every program reading files must answer: where is the file, what's in it, and what if it's wrong?

This lesson does the first part: a level as a plain text file, a function that turns text into bricks, and a game that's *told* its wall instead of building it.

## The drawing module so far

**Build:** make sure `breakout/draw.py` matches the end of lesson 4.7, the reference answer to its Your turn (your title text may differ).

```python file=breakout/draw.py
import pygame

from breakout.model import Game, GameState

BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)
MESSAGES = {
    GameState.TITLE: "BREAKOUT: press Space to play",
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

```check
lacks breakout/draw.py "<<<<<<<"
run ".venv/Scripts/python -m pytest -q" stdout="63 passed"
```

## A level is a text file

**Build:** the classic wall, written as text.

Create the folder `breakout/levels`, and in it `classic.txt`:

```text file=breakout/levels/classic.txt
TTTTTTTT
BBBBBBBB
BBBBBBBB
BBBBBBBB
BBBBBBBB
```

**Understand: the format.** Each line is a row of the wall, top to bottom; each character is one brick position, left to right: `T` is a tough brick (two hits, 30 points), `B` an ordinary one, and `.` (used in later levels) an empty space. Designing a **file format** is choosing exactly this: what the file holds, and what each part means. Plain text was chosen because you can read and edit it in any editor and see the wall's shape at a glance.

**Understand: what a text file really is.** On disk a file is a sequence of **bytes**, numbers from 0 to 255. Ask Python for the raw bytes of this one:

```powershell
.venv\Scripts\python -c "print(open('breakout/levels/classic.txt', 'rb').read()[:20])"
```

```text
b'TTTTTTTT\nBBBBBBBB\nBB'
```

`'rb'` opens it in **binary** mode: bytes, uninterpreted. The `b'...'` is Python's way of showing bytes; `\n` is one byte, number 10, the **newline** that ends each line. An **encoding** is the rule that turns bytes into characters and back. For these letters every common encoding agrees (`T` is byte 84 in all of them), but for anything beyond plain English letters they don't, so a program reading text must say which encoding the file uses. **UTF-8** is the standard: it can encode every character in every language, and it's what this series uses for every file. Windows text files often end lines with two bytes, `\r\n` (carriage return, then newline), instead of one. If your output shows `b'TTTTTTTT\r\nBBBBBBBB\r\n'`, your editor saved Windows line endings (VS Code shows `CRLF` or `LF` in its status bar): nothing is wrong, and the next step shows why it doesn't matter here.

**Encodings, seen.** "Every common encoding agrees on plain letters, and not beyond them" is easy to say; see it. In the REPL, take `é`, a letter outside plain English:

```text
>>> "é".encode("utf-8")
b'\xc3\xa9'
>>> "é".encode("cp1252")
b'\xe9'
>>> b'\xc3\xa9'.decode("cp1252")
'Ã©'
>>> b'\xe9'.decode("utf-8")
Traceback (most recent call last):
  ...
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe9 in position 0: unexpected end of data
```

`.encode` turns text into bytes, `.decode` turns bytes back into text, and each needs an encoding. In UTF-8, `é` is two bytes (`\x` and two hexadecimal digits is how Python shows one byte that isn't a printable letter); in **cp1252**, the old Windows encoding for Western European languages, it's one. Decode UTF-8 bytes with the wrong encoding and you get `Ã©`, garbled text with no error at all (it has a name, **mojibake**); decode cp1252 bytes as UTF-8 and you get an error. Both are why a program reading text must say which encoding it means: guessing gives wrong text, or a crash, depending on the file.

**Opening a file.** The command above used the built-in `open`, which asks the operating system for the file and returns a **file object**, your handle on it; `.read()` returns its contents, and `.close()` gives the handle back. The one-liner never closes it, which is harmless only because the program ends at once. In a real program you write:

```python
with open("breakout/levels/classic.txt", encoding="utf-8") as file:
    text = file.read()
```

Without `'rb'`, `open` reads **text**: it decodes the bytes with the encoding you name. `with` is lesson 2.4's context manager again: the file is closed at the end of the block, even if an error happens inside, and `file.closed` is `True` afterwards.

```check
file breakout/levels/classic.txt
```

## Text into bricks

**Build:** a function that turns a level's text into the list of bricks it describes.

This is `make_bricks`'s double loop, moved here and changed in one way: instead of putting a brick at every position, it reads the character at that position and decides. Create `breakout/level.py`:

```python file=breakout/level.py
import pygame

from breakout.model import BRICK_GAP, BRICK_HEIGHT, BRICK_WIDTH, ROW_COLOURS, WALL_LEFT, WALL_TOP, Brick

def parse_level(text: str) -> list[Brick]:
    bricks: list[Brick] = []
    for row, line in enumerate(text.splitlines()):
        colour = ROW_COLOURS[row % len(ROW_COLOURS)]
        for col, char in enumerate(line):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
            if char == "T":
                bricks.append(Brick(rect, colour, hits_left=2, points=30))
            elif char == "B":
                bricks.append(Brick(rect, colour))
    return bricks

```

**Understand, piece by piece.** `parse_level(text: str) -> list[Brick]` turns text into bricks:

- `text.splitlines()` splits the text into lines, removing the line endings, whichever kind: `\n`, `\r\n` (Windows), `\r`, and a few rarer line-break characters. That's why it doesn't matter how a file's lines end. (`text.split("\n")` would split only on `\n`, and leave a `\r` at the end of every line of a Windows file: a ninth character `parse_level` would treat as a gap.)
- `enumerate` numbers the lines (`row`) and, inside, the characters of each line (`col`): lesson 3.2's numbering loop, nested as in lesson 1.5.
- `ROW_COLOURS[row % len(ROW_COLOURS)]`: `%` is the **remainder** after division, so with 5 colours, rows 0–4 take colours 0–4 and row 5 starts again at colour 0. A level can have more rows than there are colours.
- Each `T` or `B` becomes a `Brick` at the position its row and column give, with lesson 3.3's tough-brick rules for `T`. Any other character, like `.`, makes nothing: a gap.

The `if` and `elif` have no `else`, so a character that's neither `T` nor `B` simply falls through and makes nothing. That's how `.` makes a gap, and, as the next lesson finds, it's also how a typo makes a gap without anyone noticing.

Traced for a one-row level, `"B.B"`:

```text
row 0, colour ROW_COLOURS[0 % 5] = ROW_COLOURS[0]
col 0  'B'  x = 16 + 0 × (70 + 6) = 16     →  a brick at (16, 60)
col 1  '.'  neither T nor B                →  nothing
col 2  'B'  x = 16 + 2 × (70 + 6) = 168    →  a brick at (168, 60)
```

```predict
question: How many bricks does `parse_level("TB.\n..B")` make? (`\n` is the newline between the two rows.)
answer: 3
explain: Row 0 is `TB.`: a tough brick, an ordinary one, and a gap. Row 1 is `..B`: two gaps and one brick. Each `T` or `B` makes one brick, wherever it is: 3 in all, two on the top row and one below.
verify: .venv/Scripts/python -c "from breakout import level; print(len(level.parse_level('TB.\n..B')))"
```

Try it:

```powershell
.venv\Scripts\python -c "from breakout import level; print([brick.rect.x for brick in level.parse_level('B.B')])"
```

```text
[16, 168]
```

```check
contains breakout/level.py "def parse_level(text: str) -> list[Brick]:"
run ".venv/Scripts/python -c \"from breakout import level; print([brick.rect.x for brick in level.parse_level('B.B')])\"" stdout="[16, 168]" label="parse_level turns B.B into two bricks with a gap"
```

## Paths, on their own

**Build:** nothing in the project. Try `pathlib` before the game depends on it.

Lesson 2.1 used `Path(__file__).parent` and `/`. A `Path` can do much more, and this chapter uses most of it. In the REPL, started in your `forge` folder:

```text
>>> from pathlib import Path
>>> p = Path("breakout/levels/classic.txt")
>>> p.name, p.suffix, p.stem
('classic.txt', '.txt', 'classic')
>>> p.parent
WindowsPath('breakout/levels')
>>> p.exists(), p.is_absolute()
(True, False)
>>> Path("nowhere.txt").exists()
False
>>> Path.cwd()
WindowsPath('C:/Users/you/forge')
>>> p.resolve()
WindowsPath('C:/Users/you/forge/breakout/levels/classic.txt')
>>> Path("examples") / ".." / "breakout"
WindowsPath('examples/../breakout')
>>> (Path("examples") / "..").resolve()
WindowsPath('C:/Users/you/forge')
```

(Your folder will differ.) Read it line by line:

- `name` is the last part, `suffix` its ending, `stem` the name without the ending, `parent` everything before it. None of these look at the disk: a `Path` is just a description of a location.
- `exists()` does look: it asks the operating system whether something is there.
- `p` is **relative**: it means "from the current folder" (lesson 0.1's hidden input), and `is_absolute()` says so. `Path.cwd()` is the current working folder, and `resolve()` turns a relative path into the full, **absolute** one, from the drive down. Start Python in another folder and the same `p` resolves somewhere else, where `classic.txt` doesn't exist.
- `..` means "the folder above". `/` keeps it as written; `resolve()` works it out.
- `WindowsPath` is what `Path` becomes on Windows; on macOS and Linux it's `PosixPath`, with the same methods. Forward slashes work on every system.

That third point is why the game must never find its levels from the current folder, as the next step shows.

## Reading the file

**Build:** where the levels are, and a function that reads one from its file.

`parse_level` works on text. Add the folder the levels live in, and a function that reads a file and hands its text to `parse_level`:

```python file=breakout/level.py
from pathlib import Path

import pygame

from breakout.model import BRICK_GAP, BRICK_HEIGHT, BRICK_WIDTH, ROW_COLOURS, WALL_LEFT, WALL_TOP, Brick

LEVELS = Path(__file__).parent / "levels"


def parse_level(text: str) -> list[Brick]:
    bricks: list[Brick] = []
    for row, line in enumerate(text.splitlines()):
        colour = ROW_COLOURS[row % len(ROW_COLOURS)]
        for col, char in enumerate(line):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
            if char == "T":
                bricks.append(Brick(rect, colour, hits_left=2, points=30))
            elif char == "B":
                bricks.append(Brick(rect, colour))
    return bricks


def load_level(path: Path) -> list[Brick]:
    return parse_level(path.read_text(encoding="utf-8"))
```

**Understand.** `LEVELS = Path(__file__).parent / "levels"`: the `levels` folder **next to this module**, found from the module's own location (lesson 2.1's `Path(__file__)`). Not from the current folder: that would be lesson 0.1's hidden input, and the game would only find its levels when started from the right place.

One honest caveat. This works because lesson 4.3 installed the game with `pip install -e .`: an **editable** install runs the code from your project folder, so `breakout/levels/` is right there next to `level.py`. A normal install copies the package somewhere else, and setuptools copies only the files it's told about: Python files, by default, not `.txt` level files. Shipping the game to someone else means listing its data files (setuptools calls them **package data**), which Chapter 54, on exporting a game, does.

`load_level(path)` reads a file and hands the text to `parse_level`. `Path.read_text(encoding="utf-8")` opens the file, decodes its bytes as UTF-8, and returns the text, closing the file again: three steps in one call, the same as the `with open(...)` block from earlier in this lesson.

**Why two functions?** `parse_level` is **pure** (lesson 2.2): text in, bricks out, nothing else touched, so it can be tested with a string written in the test, no file needed. `load_level` does the one thing that touches the outside world, reading a file, and nothing else. Keeping the logic pure and the input and output in thin functions around it is sometimes called **functional core, imperative shell**: the core is easy to test exhaustively, and the shell is so simple it hardly needs it.

The module imports from `model` and nothing else in the game: levels depend on the model, never the other way round.

```check
contains breakout/level.py "def parse_level(text: str) -> list[Brick]:"
run ".venv/Scripts/python -c \"from breakout import level; print(len(level.load_level(level.LEVELS / 'classic.txt')))\"" stdout="40" label="the classic level has 40 bricks"
```

## The game is told its wall

**Build:** `Game` takes its bricks as an argument, and `make_bricks` goes.

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
    def __init__(self, rng: random.Random, bricks: list[Brick]) -> None:
        self.rng = rng
        self.paddle = Paddle()
        self.ball = serve(rng)
        self.bricks = bricks
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

**Understand.** `Game.__init__(self, rng, bricks)` now receives its wall from whoever creates it, the same way it already received its random generator in lesson 2.6. The game doesn't know or care whether the bricks came from a file, a test, or a level editor (Chapter 21). Giving an object what it needs, instead of letting it build what it needs itself, is called **dependency injection**, and it's what makes the object usable in situations its author didn't think of. Picture the alternative: `Game.__init__` calling `load_level` itself. Every test would then need the level file on disk, and a test that wanted a wall of one brick, to check what happens when it breaks, would have to write a level file first. Chapter 9 makes it a habit.

`make_bricks` is deleted: the wall's layout now lives in exactly one place, `classic.txt`. Nothing works yet: the app and every test still create `Game(rng)` without a wall. The next steps fix each.

```check
lacks breakout/model.py "def make_bricks(" -- The wall's layout lives in classic.txt now.
contains breakout/model.py "def __init__(self, rng: random.Random, bricks: list[Brick]) -> None:"
```

## The app loads the level

**Build:** the app loads `classic.txt` and gives the game its wall.

```python file=breakout/app.py
import os
import random
import sys

import pygame

from breakout.draw import draw
from breakout.level import LEVELS, load_level
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
    level = LEVELS / "classic.txt"
    game = Game(rng, load_level(level))
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
                    game = Game(rng, load_level(level))
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

**Understand.** `level` is the path of the level file; `load_level(level)` reads it each time a game is made, at the start and again on Space after the end, so a restarted game gets a fresh wall rather than the broken one.

```powershell
.venv\Scripts\breakout --test-run 600 --hold auto
```

```text
frames=600 paddle_x=435 score=70 lives=3 bricks=33 inside=True
```

Exactly as before: the file describes the same wall the code used to build, and the characterisation tests will confirm it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game plays exactly as before, from a level file"
```

## Tests give their games a wall

**Build:** the game tests, giving every game the classic wall.

```python file=tests/test_game.py
import random

import pygame
from pygame import Vector2

from breakout import level, model


def classic_wall() -> list[model.Brick]:
    return level.load_level(level.LEVELS / "classic.txt")


def started_game(seed: int = 0) -> model.Game:
    game = model.Game(random.Random(seed), classic_wall())
    game.start()
    return game


def autopilot_game(seed: int, frames: int) -> model.Game:
    game = started_game(seed)
    for _ in range(frames):
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
    return game


def test_a_new_game_waits_on_the_title_screen():
    game = model.Game(random.Random(0), classic_wall())
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

**Understand.** `classic_wall()` loads the classic level, and every `model.Game(...)` now passes it. `tests/test_states.py` needs exactly the same helper, which will be a second copy of the same three lines. Duplication in tests is still duplication: Chapter 6 shows how to write your own **fixtures** (lesson 2.4's `capsys` was one of pytest's), pytest's way to share setup between test files, and removes it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_game.py" stdout="6 passed"
```

## …and so do the state tests

**Build:** the state tests, with the same helper.

```python file=tests/test_states.py
import random

from pygame import Vector2

from breakout import level, model


def classic_wall() -> list[model.Brick]:
    return level.load_level(level.LEVELS / "classic.txt")


def started_game() -> model.Game:
    game = model.Game(random.Random(0), classic_wall())
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
    game = model.Game(random.Random(0), classic_wall())
    game.toggle_pause()
    assert game.state == model.GameState.TITLE
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_states.py" stdout="4 passed"
```

## …and the replay

**Build:** `replay.py`, giving its game the classic wall.

```python file=replay.py
"""Plays a game with the autopilot, without a window, and reports each change of score, lives or bricks."""

import random
import sys

from breakout import level, model


def play(seed: int, frames: int) -> list[str]:
    game = model.Game(random.Random(seed), level.load_level(level.LEVELS / "classic.txt"))
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
```

## The architecture knows about levels

**Build:** a rule for the new module: levels depend only on the model.

```python file=tests/test_architecture.py
# Which parts of the game may depend on which. Each check imports one module in a fresh Python,
# because this test process has already imported every module the other tests use.
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def loaded_by(module: str) -> set[str]:
    code = f"import sys, {module}\nfor name in sys.modules:\n    print(name)"
    result = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, check=True)
    return {line for line in result.stdout.splitlines() if line.startswith("breakout")}


def test_settings_depend_on_nothing_else_in_the_game():
    assert loaded_by("breakout.settings") == {"breakout", "breakout.settings"}


def test_the_model_depends_on_nothing_else_in_the_game():
    assert loaded_by("breakout.model") == {"breakout", "breakout.model"}


def test_levels_depend_only_on_the_model():
    assert loaded_by("breakout.level") == {"breakout", "breakout.level", "breakout.model"}


def test_drawing_depends_only_on_the_model():
    assert loaded_by("breakout.draw") == {"breakout", "breakout.draw", "breakout.model"}
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_architecture.py" stdout="4 passed"
```

## Your turn: test the level reader

**Build, on your own:** move the wall tests to where the wall now comes from, and test `parse_level` directly.

`tests/test_breakout.py` still has two tests that call `model.make_bricks()`, which no longer exists: delete them. Then create `tests/test_level.py`:

| Test name | Checks |
|---|---|
| `test_the_classic_level_is_the_old_wall` | `classic.txt` loads as 40 bricks; the first is a tough brick at (16, 60) in the first colour, the last an ordinary one at (548, 164) in the fifth |
| `test_a_dot_leaves_a_gap` | `"B.B"` gives two bricks, at x = 16 and x = 168 |
| `test_a_t_is_a_tough_brick` | `"T"` gives one brick, with 2 hits left and 30 points |
| `test_each_row_takes_the_next_colour` | `"B\nB"` gives two bricks, in the first two colours |

All but the first use `parse_level` with a string written in the test: that's the payoff of the pure core. When all 66 tests pass and every check is clean, commit with a message that mentions **level**.

```hints
nudge: Where does the old `test_the_wall_has_forty_bricks_from_the_top_left` test go? Most of it carries over: what replaces `model.make_bricks()`?
concept: `level.load_level(level.LEVELS / "classic.txt")` gives the same 40 bricks `make_bricks()` did. For the small cases, `level.parse_level("B.B")` is a whole level in a string. A comprehension, `[brick.rect.x for brick in bricks]`, pulls out just the values to compare: 16 for column 0, and 16 + 2 × 76 = 168 for column 2. A list with exactly one item can be unpacked with `(brick,) = level.parse_level("T")`, which also fails loudly if there isn't exactly one.
shape: `import pygame` and `from breakout import level, model`; four tests, each arranging with `load_level` or `parse_level` and asserting with `==`.
answer: ~~~python
import pygame

from breakout import level, model


def test_the_classic_level_is_the_old_wall():
    bricks = level.load_level(level.LEVELS / "classic.txt")
    assert len(bricks) == 40
    assert bricks[0] == model.Brick(pygame.Rect(16, 60, 70, 20), model.ROW_COLOURS[0], hits_left=2, points=30)
    assert bricks[-1] == model.Brick(pygame.Rect(548, 164, 70, 20), model.ROW_COLOURS[4])


def test_a_dot_leaves_a_gap():
    bricks = level.parse_level("B.B")
    assert [brick.rect.x for brick in bricks] == [16, 168]


def test_a_t_is_a_tough_brick():
    (brick,) = level.parse_level("T")
    assert (brick.hits_left, brick.points) == (2, 30)


def test_each_row_takes_the_next_colour():
    bricks = level.parse_level("B\nB")
    assert [brick.colour for brick in bricks] == model.ROW_COLOURS[:2]
~~~

`"B\nB"` is a two-line level written as one string: `\n` inside a string literal is the newline character. `model.ROW_COLOURS[:2]` is a slice, the first two colours. The next lesson's first steps show the whole files.
```

```check
lacks tests/test_breakout.py "make_bricks" -- Delete the two wall tests from test_breakout.py: the wall comes from a level file now.
run ".venv/Scripts/python -m pytest -q tests/test_level.py" stdout="4 passed" label="the four level tests pass"
run ".venv/Scripts/python -m pytest -q" stdout="66 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "level"
git-clean
```

## Challenge: list the levels

**Optional, ★.** Add `breakout --list-levels`: print every level in `LEVELS`, found with `LEVELS.glob("*.txt")` (every path in the folder matching the pattern; `*` means "any name"), sorted, each with its brick count, then exit. A test with `capsys` checks `classic` is listed. On a branch.

## Challenge: a preview in the terminal

**Optional, ★★.** Write `scratch/preview_level.py`, which takes a level file and prints the wall with `█` for B, `▓` for T and a space for `.`. It works in the terminal. Now send its output to a file: `python scratch\preview_level.py breakout\levels\classic.txt > preview.txt`. It crashes with a `UnicodeEncodeError`. Find out why, using this lesson's encodings: what encoding is Python using for the file, and why isn't it UTF-8? Then fix it, with one argument to `open` or with `sys.stdout.reconfigure`.

## Challenge: narrower levels

**Optional, ★★★.** Let a level have fewer than 8 columns, centred on the screen. `parse_level` works out the left edge from the longest row instead of using `WALL_LEFT`. Test it with walls of 4, 6 and 8 columns: the arithmetic is where the bugs hide, so write the expected `x` of the first brick by hand first. On a branch.

## What did we actually learn?

- **Data, not code**: a level as a text file anyone can edit, in a format you designed.
- **Text is bytes plus an encoding**: always say `encoding="utf-8"`; the wrong encoding gives garbled text or a `UnicodeDecodeError`. `splitlines()` handles every kind of line ending.
- **Files**: `open`, a file object, and `with` to close it; `read_text` does all three.
- **Paths** are descriptions of locations: relative to the current folder unless absolute; `resolve()`, `exists()`, `name`, `parent`.
- **Find data from the code's own location** (`Path(__file__).parent`), never the current folder.
- **Functional core, imperative shell**: pure `parse_level` does the work; thin `load_level` touches the file.
- **Dependency injection**: the `Game` is given its wall, so anything can supply one.
- **`%`** wraps a number around a range.

C# reads a file with `File.ReadAllText(path, Encoding.UTF8)` and Java with `Files.readString(path, StandardCharsets.UTF_8)`: both, like Python, let you name the encoding, and both style guides tell you to. Data files that ship with a program are **resources** there (embedded resources in .NET; in Java, files on the **classpath**, the list of folders and archives Java searches for classes and files), the equivalent of a package's data folder here; Chapter 18 builds Forge's own resource system.
