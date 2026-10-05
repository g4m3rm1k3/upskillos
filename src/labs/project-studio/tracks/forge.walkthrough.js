// What a learner does at each step of the Forge series, for the walkthrough test
// (forge.desktop.test.js). One project folder runs through every forge-* track, so keys are
// "<track>/<lesson file name>#<step title>".
//
// By default a step's file (its ```lang file=... block) is typed in for you. An entry adds:
//   run:   commands the lesson tells the learner to type in the terminal (PowerShell)
//   files: { path: content } the learner writes with no code shown (Your turn, challenges):
//          the reference answer, which must pass the step's checks
//   wrong: wrong answers, tried on a copy of the project before the step; each lists the
//          indexes of the step's checks that must fail ("fails").
//   edit:  [[from, to], ...] applied to the step's own target, written to the step's file.
//   editFiles: { path: [[from, to], ...] } applied to a file as it is in the project now (how a
//          Your turn answer, or a wrong one, changes code the learner already has).

const GREET = `import sys

if len(sys.argv) != 2:
    print("usage: python greet.py NAME")
    sys.exit(2)

name = sys.argv[1]
print(f"Hello, {name}!")
`;

const GREET_ALL = `import sys

names = sys.argv[1:]
if not names:
    print("usage: python greet_all.py NAME...")
    sys.exit(2)

if len(names) == 1:
    together = names[0]
else:
    together = ", ".join(names[:-1]) + " and " + names[-1]
print(f"Hello, {together}!")
`;

const CHECK_SETUP = `import sys

if sys.prefix == sys.base_prefix:
    print("Not in a virtual environment. Run: .venv\\\\Scripts\\\\python check_setup.py")
    sys.exit(1)

v = sys.version_info
version = f"{v.major}.{v.minor}.{v.micro}"

if v < (3, 12):
    print(f"Python 3.12 or newer is needed, not {version}")
    sys.exit(1)

print(f"Setup OK: Python {version} in a virtual environment")
`;

// The 0.2 challenge: every pinned package checked, with requirements.txt found next to the script.
const CHECK_SETUP_ALL = CHECK_SETUP + `
from importlib.metadata import PackageNotFoundError, version as installed
from pathlib import Path

ok = True
for line in (Path(__file__).parent / "requirements.txt").read_text().splitlines():
    if "==" not in line:
        continue
    name, wanted = line.strip().split("==")
    try:
        have = installed(name)
    except PackageNotFoundError:
        have = None
    if have == wanted:
        print(f"{name} {wanted} OK")
    else:
        ok = False
        print(f"{name} is {have}, needs {wanted}: run .venv\\\\Scripts\\\\python -m pip install -r requirements.txt")
if not ok:
    sys.exit(1)
`;

const LEADERBOARD = `import sys

SCORES = {
    "ada": 1250,
    "grace": 980,
    "linus": 1430,
}


def find_score(name):
    for player, score in SCORES.items():
        if player == name.lower():
            return score


def rank(name):
    score = find_score(name)
    better = 0
    for other in SCORES.values():
        if other > score:
            better += 1
    return better + 1


def main():
    if len(sys.argv) != 2:
        print("usage: python leaderboard.py NAME")
        sys.exit(2)
    name = sys.argv[1]
    if find_score(name) is None:
        print(f"No player called {name}")
        sys.exit(1)
    print(f"{name} is ranked {rank(name)} of {len(SCORES)}")


main()
`;

// Lesson 1.1's Your turn: the --test-run block before and after the usage check.
const TEST_RUN_PARSE = `if "--test-run" in args:
    test_frames = int(args[args.index("--test-run") + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"`;
const TEST_RUN_CHECKED = `if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"`;

const PIP_INSTALL ='.venv\\Scripts\\python -m pip install -r requirements.txt';
const L01 = 'forge-tools/00-01-the-terminal-and-your-first-program';
const L02 = 'forge-tools/00-02-a-python-of-its-own';
const L03 = 'forge-tools/00-03-when-it-breaks';
const L11 = 'forge-script/01-01-a-window-and-a-loop';
const L12 = 'forge-script/01-02-saving-your-work-with-git';
const L13 = 'forge-script/01-03-the-paddle';
const CLAMP_BEFORE = '    paddle_x += direction * PADDLE_SPEED * dt\n    paddle.x = round(paddle_x)\n';
const clampTo = (line) => `    paddle_x += direction * PADDLE_SPEED * dt\n${line}    paddle.x = round(paddle_x)\n`;
const CLAMP = clampTo('    paddle_x = max(0, min(paddle_x, WIDTH - paddle.width))\n');

// Moving a finished story under "Done", with its boxes ticked.
function storyDone(title, lines) {
  const todo = `### ${title}\n${lines.join('\n')}\n\n`;
  const done = `### ${title}\n${lines.map((l) => l.replace('- [ ]', '- [x]')).join('\n')}\n\n`;
  return [[todo, ''], ['# Done\n\n', `# Done\n\n${done}`]];
}
const PADDLE_STORY = storyDone('Move the paddle', [
  'As a player, I want to move a paddle with the arrow keys, so that I can get under the ball.',
  '- [ ] Left and right arrows move the paddle at the same speed on any computer.',
  '- [ ] The paddle never leaves the screen.',
]);

const L14 = 'forge-script/01-04-the-ball';
const NAIVE_WALLS = `    if ball_x < 6 or ball_x > WIDTH - 6:
        ball_vx = -ball_vx
    if ball_y < 6:
        ball_vy = -ball_vy
`;
const FIXED_WALLS = `    if ball_x < 6:
        ball_x = 6
        ball_vx = abs(ball_vx)
    if ball_x > WIDTH - 6:
        ball_x = WIDTH - 6
        ball_vx = -abs(ball_vx)
    if ball_y < 6:
        ball_y = 6
        ball_vy = abs(ball_vy)
`;
const BALL_STORIES = [
  ...storyDone('Bounce the ball', [
    "As a player, I want a ball that bounces off the walls and my paddle, so that there's something to keep in play.",
    '- [ ] The ball bounces off the left, right and top walls.',
    '- [ ] The ball bounces up off the paddle, steered by where it hits.',
  ]),
  ...storyDone('Lose a life', [
    'As a player, I want to lose a life when I miss the ball, so that missing matters.',
    '- [ ] Missing the ball costs one of three lives, and the ball comes back.',
  ]),
];

const L15 = 'forge-script/01-05-bricks-score-and-the-end';
const END_STORIES = [
  ...storyDone('Break bricks and score', [
    'As a player, I want to break bricks with the ball, so that I have a goal.',
    '- [ ] A ball that hits a brick removes it, bounces, and scores 10 points.',
    '- [ ] The score and lives are shown on screen.',
  ]),
  ...storyDone('Win or lose', [
    'As a player, I want the game to end when I clear the wall or run out of lives, so that I know how I did.',
    '- [ ] No lives left shows "Game over" and stops play.',
    '- [ ] No bricks left shows "You win!" and stops play.',
  ]),
];

const L16 = "forge-script/01-06-whats-wrong-with-this-script";
const LAST_DONE = '- [x] The close button and Escape both quit.\n';
const debtSection = (items) => `${LAST_DONE}\n# Technical debt\n\n${items.map((i) => `- ${i}\n`).join('')}`;
const DEBT = [
  'The ball\'s starting position and velocity are set twice (lines 44-47 and 119-122): changing the starting speed means changing both.',
  'Brick colours are worked out backwards from the brick\'s y position (line 126), so changing the row spacing crashes the game.',
  'Everything is global: ball_vx is used or changed on 6 lines, so changing the ball\'s movement means reading the whole loop.',
  'The only way to test anything is a whole test run: checking that the game can be won takes 10,000 frames.',
  'The test-run code is mixed into the game code, so the game can\'t be read without it.',
];

const L21 = 'forge-functions/02-01-a-safety-net';
const USAGE_TEST_END = '.startswith("usage: python breakout.py")\n';
const pins = (leftLine, lostLine, leftName = 'test_holding_left_for_a_second_stops_at_the_left_edge') => `${USAGE_TEST_END}

def ${leftName}():
    assert last_line("--test-run", "60", "--hold", "left") == "${leftLine}"


def test_a_lost_game_stays_lost():
    assert last_line("--test-run", "1000", "--hold", "none") == "${lostLine}"
`;
const LEFT_LINE = 'frames=60 paddle_x=0 score=10 lives=3 bricks=39 inside=True';
const LOST_LINE = 'frames=1000 paddle_x=270 score=50 lives=0 bricks=35 inside=False';
const DONE_BEFORE = 'A story is done when every acceptance check under it is ticked and the work is committed.';
const DONE_AFTER = 'A story is done when every acceptance check under it is ticked, `.venv\\Scripts\\python -m pytest` passes, and the work is committed.';

const L22 = 'forge-functions/02-02-name-the-parts';
const PADDLE_FUNCTIONS = `def move_paddle(paddle_x, direction, dt):
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x, paddle_x):
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball_x < middle - 10:
        return -1
    if ball_x > middle + 10:
        return 1
    return 0


def bounce_off_walls(`;
const INLINE_PADDLE = `        elif hold == "auto":
            if ball_x < paddle_x + 40:
                direction = -1
            elif ball_x > paddle_x + 60:
                direction = 1
        paddle_x += direction * PADDLE_SPEED * dt
        paddle_x = clamp(paddle_x, 0, WIDTH - PADDLE_WIDTH)
`;
const CALLED_PADDLE = `        elif hold == "auto":
            direction = autopilot(ball_x, paddle_x)
        paddle_x = move_paddle(paddle_x, direction, dt)
`;
const paddleFunctions = (functions = PADDLE_FUNCTIONS) => ({ 'breakout.py': [['def bounce_off_walls(', functions], [INLINE_PADDLE, CALLED_PADDLE]] });

const L23 = 'forge-functions/02-03-what-import-runs';
const CLAMP_TEST_END = '    assert breakout.clamp(2, 0, 3) == 2\n';
const clampTests = (below = 'breakout.clamp(-5, 0, 3) == 0', above = 'breakout.clamp(9, 0, 3) == 3') => ({
  'tests/test_breakout.py': [[CLAMP_TEST_END, `${CLAMP_TEST_END}

def test_clamp_raises_a_value_below_the_range():
    assert ${below}


def test_clamp_lowers_a_value_above_the_range():
    assert ${above}
`]],
});

const L24 = 'forge-functions/02-04-unit-tests';
const PARSE_BEFORE = `def parse_args(args):
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = None
    if "--test-run" in args:
        i = args.index("--test-run")
        if i + 1 >= len(args) or not args[i + 1].isdigit():
            print("usage: python breakout.py [--test-run FRAMES]")
            sys.exit(2)
        test_frames = int(args[i + 1])
    hold = "none"
    if "--hold" in args:
        hold = args[args.index("--hold") + 1]
    lag_at = None
    if "--lag-at" in args:
        lag_at = int(args[args.index("--lag-at") + 1])
    return test_frames, hold, lag_at
`;
const PARSE_AFTER = `def number_after(args, name):
    if name not in args:
        return None
    i = args.index(name)
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print(USAGE)
        sys.exit(2)
    return int(args[i + 1])


def parse_args(args):
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at
`;
const USAGE_CONSTANTS = 'WALL_LEFT, WALL_TOP = 16, 60\nHOLDS = ["left", "right", "none", "auto"]\nUSAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]]"\n';
const checkedArgs = (parse = PARSE_AFTER) => ({ 'breakout.py': [[PARSE_BEFORE, parse], ['WALL_LEFT, WALL_TOP = 16, 60\n', USAGE_CONSTANTS]] });

const L25 = 'forge-functions/02-05-types-you-can-check';
const SIGNATURES = [
  ['def move_paddle(paddle_x, direction, dt):', 'def move_paddle(paddle_x: float, direction: int, dt: float) -> float:'],
  ['def autopilot(ball_x, paddle_x):', 'def autopilot(ball_x: float, paddle_x: float) -> int:'],
  ['def bounce_off_paddle(ball, paddle, vx, vy):', 'def bounce_off_paddle(ball: pygame.Rect, paddle: pygame.Rect, vx: float, vy: float) -> tuple[float, float]:'],
  ['def make_bricks():', 'def make_bricks() -> list[pygame.Rect]:'],
  ['def brick_colour(brick):', 'def brick_colour(brick: pygame.Rect) -> tuple[int, int, int]:'],
  ['def draw(screen, font, paddle, ball, bricks, score, lives):', 'def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: pygame.Rect,\n         bricks: list[pygame.Rect], score: int, lives: int) -> None:'],
  ['def main(args):', 'def main(args: list[str]) -> None:'],
];
const STRICT_PARAMS = '{ "venvPath": ".", "venv": ".venv", "reportMissingParameterType": "error" }\n';
const DONE_WITH_TYPES = 'A story is done when every acceptance check under it is ticked, `.venv\\Scripts\\python -m pytest` passes, `.venv\\Scripts\\python -m pyright breakout.py` reports no errors, and the work is committed.';
const typedEverything = (signatures = SIGNATURES) => ({
  files: { 'pyrightconfig.json': STRICT_PARAMS },
  editFiles: { 'breakout.py': signatures, 'BACKLOG.md': [[DONE_AFTER, DONE_WITH_TYPES]] },
});

const L26 = 'forge-functions/02-06-randomness-you-can-test';
const OLD_SERVE_TEST = `def test_a_new_ball_starts_in_the_middle_moving_up_and_right():
    assert breakout.start_ball() == (320, 240, 180, -240)
`;
const serveTests = (speedCheck = 'math.isclose(math.hypot(vx, vy), breakout.BALL_SPEED)') => ({
  'tests/test_breakout.py': [
    ['import pygame\n', 'import math\nimport random\n\nimport pygame\n'],
    [OLD_SERVE_TEST, `def test_the_same_seed_serves_the_same_ball():
    assert breakout.start_ball(random.Random(1)) == breakout.start_ball(random.Random(1))


def test_every_serve_starts_in_the_middle_going_up_at_full_speed():
    for seed in range(100):
        x, y, vx, vy = breakout.start_ball(random.Random(seed))
        assert (x, y) == (320, 240)
        assert vy < 0
        assert abs(vx) <= 0.6 * breakout.BALL_SPEED
        assert ${speedCheck}
`],
  ],
});
const SERVE_STORY = '# Done\n\n### Serve in a random direction\nAs a player, I want the ball to start in a different direction each game, so that games aren\'t all the same.\n- [x] Each serve goes upwards at full speed, at a different angle.\n\n';

const L31 = 'forge-classes/03-01-a-ball-that-knows-itself';
const L32 = 'forge-classes/03-02-dataclasses-and-vectors';
const L33 = 'forge-classes/03-03-test-first';
const L34 = 'forge-classes/03-04-choices-rules-and-a-pause-button-for-git';
const L31_ANSWER = [`${L32}#The whole files so far`, `${L32}#The whole test file so far`];
const L32_ANSWER = [`${L33}#The whole files so far`, `${L33}#The argument tests so far`];
const L33_ANSWER = [`${L34}#The whole files so far`, `${L34}#The whole test file so far`];
const BROKEN_HIT_BEFORE = '    def hit(self) -> int:\n        self.hits_left -= 1\n';
const brokenBrick = (hit = '    def hit(self) -> int:\n        if self.hits_left == 0:\n            raise ValueError("this brick is already broken")\n        self.hits_left -= 1\n') => ({
  'breakout.py': [[BROKEN_HIT_BEFORE, hit]],
  'tests/test_breakout.py': [
    ['import pygame\n', 'import pygame\nimport pytest\n'],
    ['    assert brick.current_colour() == (143, 40, 40)\n', `    assert brick.current_colour() == (143, 40, 40)


def test_a_broken_brick_cannot_be_hit_again():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (34, 197, 94))
    brick.hit()
    with pytest.raises(ValueError):
        brick.hit()
    assert brick.hits_left == 0
`],
  ],
});

const L35 = 'forge-classes/03-05-a-game-you-can-hold';
const GAME_TESTS_END = '    assert game.ball.velocity.y == 240\n';
const endTests = (lives = 'assert game.lives == 0') => ({
  'tests/test_game.py': [[GAME_TESTS_END, `${GAME_TESTS_END}

def test_losing_the_last_life_ends_the_game():
    game = breakout.Game(random.Random(0))
    game.lives = 1
    game.ball = breakout.Ball(Vector2(100, breakout.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    ${lives}
    assert not game.playing()
    before = (game.score, game.lives, len(game.bricks))
    game.update(0, 1 / 60)
    assert (game.score, game.lives, len(game.bricks)) == before


def test_breaking_the_last_brick_wins():
    game = breakout.Game(random.Random(0))
    game.bricks = [breakout.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = breakout.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert game.bricks == []
    assert game.score == 10
    assert not game.playing()
`]],
});

const L36 = 'forge-classes/03-06-tidy-code-automatically';
const PLAY_RUN = 'subprocess.run([sys.executable, str(GAME), *args], capture_output=True, text=True)';
const DONE_WITH_RUFF = 'A story is done when every acceptance check under it is ticked, `.venv\\Scripts\\python -m pytest` passes, `.venv\\Scripts\\python -m pyright breakout.py` reports no errors, `.venv\\Scripts\\python -m ruff format --check .` and `.venv\\Scripts\\python -m ruff check .` pass, and the work is committed.';
const lastFinding = (call = PLAY_RUN.replace('text=True)', 'text=True, check=False)')) => ({
  'tests/test_characterisation.py': [[PLAY_RUN, call]],
  'BACKLOG.md': [[DONE_WITH_TYPES, DONE_WITH_RUFF]],
});

const L41 = 'forge-package/04-01-a-package';
const toModel = (rel) => ({ [rel]: [['import breakout\n', 'from breakout import model\n'], ['breakout.', 'model.', 'all']] });
const packageEverything = ({ replay = true, done = true } = {}) => ({
  editFiles: {
    ...toModel('tests/test_game.py'),
    ...(replay ? toModel('replay.py') : {}),
    'tests/test_arguments.py': [
      ['import breakout\nfrom breakout import Hold, Settings\n', 'from breakout import model\nfrom breakout.model import Hold, Settings\n'],
      ['breakout.parse_args', 'model.parse_args', 'all'],
      ['usage: python breakout.py', 'usage: python -m breakout'],
    ],
    ...(done ? { 'BACKLOG.md': [['pyright breakout.py`', 'pyright breakout`']] } : {}),
  },
});

const L42 = 'forge-package/04-02-modules-with-one-job';
const L43 = 'forge-package/04-03-a-real-project';
const L42_ANSWER = [`${L43}#The model so far`, `${L43}#The app so far`, `${L43}#The drawing module so far`, `${L43}#The architecture tests so far`];
const POSITIVE_INT = `def positive_int(text: str) -> int:
    value = int(text)
    if value < 1:
        raise argparse.ArgumentTypeError(f"must be at least 1, not {value}")
    return value


def make_parser() -> argparse.ArgumentParser:`;
const FRAME_TESTS = `

def test_a_negative_frame_count_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "-5"])
    assert stopped.value.code == 2


def test_zero_frames_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "0"])
    assert stopped.value.code == 2
`;
const ARGS_END = '        settings.parse_args(["--test-run", "5", "--seed", "lucky"])\n    assert stopped.value.code == 2\n';
const positiveFrames = (fn = POSITIVE_INT, type = 'positive_int') => ({
  'breakout/settings.py': [
    ['def make_parser() -> argparse.ArgumentParser:', fn],
    ['"--test-run", type=int,', `"--test-run", type=${type},`],
  ],
  'tests/test_arguments.py': [[ARGS_END, ARGS_END + FRAME_TESTS]],
});

const L44 = 'forge-package/04-04-strict-types';
const strictEverywhere = ({ tests = true, done = true } = {}) => ({
  editFiles: {
    'replay.py': [['    events = []\n', '    events: list[str] = []\n']],
    ...(tests ? {
      'tests/test_characterisation.py': [
        ['def play(*args):', 'def play(*args: str) -> subprocess.CompletedProcess[str]:'],
        ['def last_line(*args):', 'def last_line(*args: str) -> str:'],
      ],
      'tests/test_arguments.py': [['(capsys):', '(capsys: pytest.CaptureFixture[str]):']],
    } : {}),
    ...(done ? { 'BACKLOG.md': [['pyright breakout`', 'pyright breakout tests replay.py`']] } : {}),
  },
});

const L45 = 'forge-package/04-05-what-to-test';
const boundaryTests = (inside = 0) => `from pygame import Vector2

from breakout import model


def test_a_ball_resting_exactly_against_the_left_wall_keeps_moving_left():
    ball = model.Ball(Vector2(model.BALL_RADIUS${inside ? ` + ${inside}` : ''}, 100), Vector2(-180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(-180, -240)


def test_a_ball_resting_exactly_against_the_right_wall_keeps_moving_right():
    ball = model.Ball(Vector2(model.WIDTH - model.BALL_RADIUS${inside ? ` - ${inside}` : ''}, 100), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(180, -240)


def test_a_ball_resting_exactly_against_the_top_keeps_moving_up():
    ball = model.Ball(Vector2(100, model.BALL_RADIUS${inside ? ` + ${inside}` : ''}), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(180, -240)
`;

const L46 = 'forge-package/04-06-game-states-on-a-branch';
const STATE_TESTS = `import random

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
`;

const L47 = 'forge-package/04-07-when-branches-disagree';
const TITLE_LINE = '"Breakout: press Space to start"';
const CONFLICT = `<<<<<<< HEAD
    GameState.TITLE: "BREAKOUT - press Space",
=======
    GameState.TITLE: "Press Space to play Breakout",
>>>>>>> title-text
`;
const RESOLVED = '    GameState.TITLE: "BREAKOUT: press Space to play",\n';

const L51 = 'forge-data/05-01-a-level-in-a-file';
const L52 = 'forge-data/05-02-when-the-file-is-wrong';
const L53 = 'forge-data/05-03-a-level-is-more-than-a-wall';
const L53_ERRORS = `import json

import pytest

from breakout import level


def level_text(**changes: object) -> str:
    """A good level's JSON, with these fields changed."""
    return json.dumps({"name": "Test", "lives": 3, "wall": ["BBBBBBBB"], **changes})


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("", "line 1, column 1: not valid JSON: Expecting value"),
        ('["BBBBBBBB"]', "the level: must be a JSON object, { ... }"),
        ('{"name": "Test", "lives": 3}', "wall: is missing"),
        (level_text(speed=2), "speed: isn't part of a level, which has lives, name, wall"),
        (level_text(name=""), "name: must be some text"),
        (level_text(lives=10), "lives: must be a whole number from 1 to 9"),
        (level_text(lives=True), "lives: must be a whole number from 1 to 9"),
        (level_text(wall="BBBBBBBB"), 'wall: must be a list of rows, like ["BBBBBBBB"]'),
        (level_text(wall=["BBBBBBBB"] * 11), "wall: a level has at most 10 rows, and this one has 11"),
        (level_text(wall=["BBBBBBBB", 8]), 'wall, row 2: must be text, like "BBBBBBBB"'),
        (level_text(wall=["BBBBBBB"]), "wall, row 1: a row has 8 places, and this one has 7"),
        (level_text(wall=["BBBBXBBB"]), "wall, row 1, column 5: unknown brick 'X': use T, B or ."),
    ],
)
def test_a_bad_level_is_refused_with_where_and_why(text: str, message: str):
    with pytest.raises(level.LevelError) as refused:
        level.parse_level(text)
    assert str(refused.value) == message
`;
const L54 = 'forge-data/05-04-let-the-types-check-it';
const WHERE_BASIC = '    return ", ".join(str(part) for part in location) or "the level"\n';
const whereAs = (row) => ({
  editFiles: { 'breakout/level.py': [[WHERE_BASIC, `    parts = [f"${row}" if isinstance(part, int) else part for part in location]\n    return ", ".join(parts) or "the level"\n`]] },
});
const L55 = 'forge-data/05-05-settings-the-player-keeps';
const BANANA_CASE = String.raw`            "controls.left: unknown key 'banana': use a letter, or left, right, up, down, space or return",
        ),
`;
const CLASH_CASE = String.raw`        ('[controls]\nleft = "a"\nright = "a"\n', "controls: left and right both use 'a'"),
`;
const PAUSE_FIELD = '    pause: Key = "p"\n';
const EVERY_CLASH = `
    @model_validator(mode="after")
    def no_key_does_two_things(self) -> Self:
        actions: dict[str, str] = {}
        for action, key in self.model_dump().items():
            if key in actions:
                raise ValueError(f"{actions[key]} and {action} both use {key!r}")
            actions[key] = action
        return self
`;
const LEFT_RIGHT_CLASH = `
    @model_validator(mode="after")
    def no_key_does_two_things(self) -> Self:
        if self.left == self.right:
            raise ValueError(f"left and right both use {self.left!r}")
        return self
`;
const clashRule = (rule, { test = true } = {}) => ({
  editFiles: {
    'breakout/config.py': [
      ['from typing import Annotated\n', 'from typing import Annotated, Self\n'],
      ['ConfigDict, Field, ValidationError\n', 'ConfigDict, Field, ValidationError, model_validator\n'],
      [PAUSE_FIELD, PAUSE_FIELD + rule],
    ],
    ...(test ? { 'tests/test_config.py': [[BANANA_CASE, BANANA_CASE + CLASH_CASE]] } : {}),
  },
});
const L56 = 'forge-data/05-06-what-the-tests-dont-touch';
const LAST_CHARACTERISATION = '        == "frames=600 paddle_x=7 score=60 lives=3 bricks=34 inside=True"\n    )\n';
const LEVEL_REFUSAL_TEST = String.raw`

def test_a_level_that_cannot_be_read_stops_the_game_with_exit_code_1(tmp_path: Path):
    missing = tmp_path / "missing.json"
    result = play("--test-run", "5", "--level", str(missing))
    assert result.returncode == 1
    assert result.stderr.startswith(f"breakout: {missing}: ")`;
const CONFIG_REFUSAL_TEST = String.raw`


def test_bad_settings_stop_the_game_with_exit_code_1(tmp_path: Path):
    settings = tmp_path / "settings.toml"
    settings.write_text("speed = 2\n", encoding="utf-8")
    result = play("--test-run", "5", "--config", str(settings))
    assert result.returncode == 1
    assert result.stderr == f"breakout: {settings}: speed: Extra inputs are not permitted\n"
`;
const refusalTests = (...tests) => ({
  editFiles: { 'tests/test_characterisation.py': [[LAST_CHARACTERISATION, LAST_CHARACTERISATION + tests.join('')]] },
});
const L61 = 'forge-saving/06-01-a-score-that-outlives-the-game';
const SAVE_ASDICT = '    path.write_text(json.dumps([asdict(score) for score in scores], indent=2), encoding="utf-8")\n';
const SAVE_ISO = '    data = [{"level": score.level, "points": score.points, "when": score.when.isoformat()} for score in scores]\n    path.write_text(json.dumps(data, indent=2), encoding="utf-8")\n';
const LOAD_UNPACK = '    return [Score(**item) for item in data]\n';
const LOAD_ISO = '    return [Score(item["level"], item["points"], datetime.fromisoformat(item["when"])) for item in data]\n';
const ASDICT_IMPORT = ['from dataclasses import asdict, dataclass\n', 'from dataclasses import dataclass\n'];
const L62 = 'forge-saving/06-02-files-you-didnt-write';
const SCORES_IMPORT = ['from breakout.scores import Score, add_score, best, load_scores\n', 'from breakout.scores import Score, ScoresError, add_score, best, load_scores\n'];
const BEST_LINE = '    best_score = best(load_scores(scores_file), level.name) if scores_file else None\n';
const playOn = (stopSaving = true) => ({
  editFiles: {
    'breakout/app.py': [
      SCORES_IMPORT,
      [BEST_LINE, `    best_score = None
    if scores_file:
        try:
            best_score = best(load_scores(scores_file), level.name)
        except (OSError, ScoresError) as error:
            print(f"breakout: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
${stopSaving ? '            scores_file = None\n' : ''}`],
    ],
  },
});
const L63 = 'forge-saving/06-03-tables';
const SQLITE = '.venv\\Scripts\\python -m sqlite3 practice.db';
const PRACTICE = [
  `${SQLITE} "CREATE TABLE scores (id INTEGER PRIMARY KEY, level TEXT NOT NULL, points INTEGER NOT NULL CHECK (points >= 0), played_at TEXT NOT NULL) STRICT"`,
  `${SQLITE} "INSERT INTO scores (level, points, played_at) VALUES ('Classic', 560, '2026-10-04T15:30:05+00:00')"`,
  `${SQLITE} "INSERT INTO scores (level, points, played_at) VALUES ('Classic', 70, '2026-10-04T15:41:00+00:00')"`,
  `${SQLITE} "INSERT INTO scores (level, points, played_at) VALUES ('Castle', 150, '2026-10-05T09:02:30+00:00')"`,
];
const BEST_STUB = `    raise NotImplementedError("lesson 6.3's Your turn")\n`;
const bestIs = (body) => ({ editFiles: { 'breakout/scores.py': [[BEST_STUB, body]] } });
const BEST_SQL = '    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()\n    return points\n';
const L64 = 'forge-saving/06-04-bobs-castle';
const REPORT_SELECT_F = `        f"SELECT COUNT(*), MAX(points), AVG(points) FROM scores WHERE level = '{level}'"\n    ).fetchone()`;
const REPORT_SELECT_Q = `        "SELECT COUNT(*), MAX(points), AVG(points) FROM scores WHERE level = ?", (level,)\n    ).fetchone()`;
const REPORT_DELETE_F = `        return db.execute(f"DELETE FROM scores WHERE level = '{level}'").rowcount`;
const REPORT_DELETE_Q = `        return db.execute("DELETE FROM scores WHERE level = ?", (level,)).rowcount`;
const TEST_REPORT = `import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from breakout.report import forget, report
from breakout.scores import Score, add_score, load_scores, open_scores

WHEN = datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC)
INJECTION = "x' OR '1'='1"


def scores_for(tmp_path: Path, *levels: str) -> sqlite3.Connection:
    """A new scores database with one 100-point game on each of these levels."""
    db = open_scores(tmp_path / "scores.db")
    for level in levels:
        add_score(db, Score(level, 100, WHEN))
    return db


def test_a_level_with_an_apostrophe_is_reported(tmp_path: Path):
    db = scores_for(tmp_path, "Bob's Castle")
    assert report(db, "Bob's Castle") == "Bob's Castle: 1 played, best 100, average 100"
    db.close()


def test_sql_in_a_level_name_is_only_a_name(tmp_path: Path):
    db = scores_for(tmp_path, "Classic", "Castle")
    assert report(db, INJECTION) == f"{INJECTION}: no scores yet"
    db.close()


def test_forgetting_a_name_with_sql_in_it_deletes_nothing(tmp_path: Path):
    db = scores_for(tmp_path, "Classic", "Castle")
    assert forget(db, INJECTION) == 0
    assert len(load_scores(db)) == 2
    db.close()
`;
const reportFix = ({ select = true, del = true, tests = true } = {}) => ({
  editFiles: {
    'breakout/report.py': [
      ...(select ? [[REPORT_SELECT_F, REPORT_SELECT_Q]] : []),
      ...(del ? [[REPORT_DELETE_F, REPORT_DELETE_Q]] : []),
    ],
  },
  files: tests ? { 'tests/test_report.py': TEST_REPORT } : {},
});
const L65 = 'forge-saving/06-05-setup-that-cleans-up-after-itself';
const GAME_FIXTURES = {
  'tests/conftest.py': `"""Fixtures: setup that any test in this folder can ask for by name."""

import random
import sqlite3
from collections.abc import Iterator
from pathlib import Path

import pytest

from breakout import level, model
from breakout.scores import open_scores


@pytest.fixture
def db(tmp_path: Path) -> Iterator[sqlite3.Connection]:
    """A new, empty scores database, closed after the test however the test ends."""
    connection = open_scores(tmp_path / "scores.db")
    yield connection
    connection.close()


@pytest.fixture
def new_game() -> model.Game:
    """A game of the classic level with seed 0, waiting on the title screen."""
    return model.Game(random.Random(0), level.load_level(level.LEVELS / "classic.json").bricks())


@pytest.fixture
def game(new_game: model.Game) -> model.Game:
    """The same game, started."""
    new_game.start()
    return new_game
`,
  'tests/test_game.py': `import pygame
from pygame import Vector2

from breakout import model


def test_a_new_game_waits_on_the_title_screen(new_game: model.Game):
    assert (new_game.score, new_game.lives, len(new_game.bricks)) == (0, 3, 40)
    assert new_game.state == model.GameState.TITLE


def test_ten_seconds_of_autopilot_matches_the_test_run(game: model.Game):
    for _ in range(600):
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
    assert (game.paddle.rect().x, game.score, game.lives, len(game.bricks)) == (435, 70, 3, 33)


def test_a_missed_ball_costs_a_life_and_a_new_ball_is_served(game: model.Game):
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 2
    assert game.ball.position == Vector2(320, 240)


def test_a_ball_that_hits_a_brick_breaks_it_and_bounces(game: model.Game):
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert (game.score, len(game.bricks)) == (10, 0)
    assert game.ball.velocity.y == 240


def test_losing_the_last_life_ends_the_game(game: model.Game):
    game.lives = 1
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 0
    assert game.state == model.GameState.OVER
    before = (game.score, game.lives, len(game.bricks))
    game.update(0, 1 / 60)
    assert (game.score, game.lives, len(game.bricks)) == before


def test_breaking_the_last_brick_wins(game: model.Game):
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert game.bricks == []
    assert game.score == 10
    assert game.state == model.GameState.WON
`,
  'tests/test_states.py': `from pygame import Vector2

from breakout import model


def test_starting_from_the_title_begins_play(game: model.Game):
    assert game.state == model.GameState.PLAYING


def test_p_pauses_and_p_again_resumes(game: model.Game):
    game.toggle_pause()
    assert game.state == model.GameState.PAUSED
    game.toggle_pause()
    assert game.state == model.GameState.PLAYING


def test_a_paused_game_does_not_move(game: model.Game):
    game.toggle_pause()
    before = Vector2(game.ball.position)
    game.update(0, 1 / 60)
    assert game.ball.position == before


def test_pausing_on_the_title_screen_does_nothing(new_game: model.Game):
    new_game.toggle_pause()
    assert new_game.state == model.GameState.TITLE
`,
};
const L71 = 'forge-records/07-01-who-played';
const CONNECT = '    db = sqlite3.connect(path)\n';
const FK_ON = '    db = sqlite3.connect(path)\n    db.execute("PRAGMA foreign_keys = ON")\n';
const FIXTURE_OPEN = '    connection = open_scores(tmp_path / "scores.db")\n';
const L51_ANSWER = [`${L52}#The basic tests so far`, `${L52}#The level tests so far`];
const MAKE_CASTLE = String.raw`.venv\Scripts\python -c "from pathlib import Path; Path('breakout/levels/castle.txt').write_text('B.BBBB.B\nBBTTTTBB\nBB....BB\n', encoding='utf-8-sig')"`;
const BOM_TEST = String.raw`

def test_a_level_saved_with_a_byte_order_mark_loads(tmp_path: Path):
    path = tmp_path / "castle.txt"
    path.write_text("B.BBBB.B\nBBTTTTBB\nBB....BB\n", encoding="utf-8-sig")
    assert len(level.load_level(path)) == 18
`;
const LAST_LEVEL_TEST = '    assert [brick.colour for brick in bricks] == model.ROW_COLOURS[:2]\n';
const bomFix = ({ code = true, test = true } = {}) => ({
  editFiles: {
    ...(code ? { 'breakout/level.py': [['read_text(encoding="utf-8")', 'read_text(encoding="utf-8-sig")']] } : {}),
    ...(test ? { 'tests/test_level.py': [['import pygame\n', 'from pathlib import Path\n\nimport pygame\n'], [LAST_LEVEL_TEST, LAST_LEVEL_TEST + BOM_TEST]] } : {}),
  },
});

const TWO_STORIES = `### Pause
As a player, I want to pause the game with P, so that I can stop without losing a life.
- [ ] Pressing P stops the ball and paddle; pressing it again continues.

### Faster ball
As a player, I want the ball to speed up as the wall gets smaller, so that the game gets harder as I get better.
- [ ] Every 10 bricks broken, the ball's speed goes up by 10%.

# Done`;

export const WALKTHROUGH = {
  [`${L01}#Look and move`]: { run: ['mkdir scratch'] },
  [`${L01}#Delete from the terminal`]: { run: ['Remove-Item scratch'] },
  [`${L01}#Your first program, from the terminal`]: {
    wrong: [
      { name: 'arguments not printed', files: { 'hello.py': 'print("Hello from Forge!")\n' }, fails: [1] },
    ],
  },
  [`${L01}#How a program says it worked`]: {
    wrong: [
      { name: 'the error is caught, so the program exits with 0', files: { 'oops.py': 'print("before")\ntry:\n    x = 1 / 0\nexcept ZeroDivisionError:\n    print("ZeroDivisionError")\n' }, fails: [0] },
    ],
  },
  [`${L01}#Your turn: a greeting with a usage message`]: {
    files: { 'greet.py': GREET },
    wrong: [
      { name: 'no check: crashes with IndexError when no name is given', files: { 'greet.py': 'import sys\nprint(f"Hello, {sys.argv[1]}!")\n' }, fails: [1, 2] },
      { name: 'usage printed, but the program exits with 0', files: { 'greet.py': GREET.replace('    sys.exit(2)\n', '    sys.exit()\n') }, fails: [1, 2] },
      { name: 'only checks for a missing name, so two names are greeted', files: { 'greet.py': GREET.replace('!= 2', '< 2') }, fails: [2] },
      { name: 'greets the script itself', files: { 'greet.py': GREET.replace('sys.argv[1]', 'sys.argv[0]') }, fails: [0] },
    ],
  },
  [`${L01}#Challenge: greet everyone`]: {
    files: { 'greet_all.py': GREET_ALL },
    wrong: [
      { name: 'commas everywhere, no "and"', files: { 'greet_all.py': GREET_ALL.replace('", ".join(names[:-1]) + " and " + names[-1]', '", ".join(names)') }, fails: [1, 2, 3] },
      { name: '"and" between every name', files: { 'greet_all.py': GREET_ALL.replace('", ".join(names[:-1]) + " and " + names[-1]', '" and ".join(names)') }, fails: [2, 3] },
    ],
  },

  [`${L02}#Make a virtual environment`]: { run: ['python -m venv .venv'] },
  [`${L02}#Pin the packages`]: {
    wrong: [
      { name: 'one equals sign', files: { 'requirements.txt': 'pygame-ce=2.5.8\n' }, fails: [0] },
      { name: 'upstream pygame instead of pygame-ce', files: { 'requirements.txt': 'pygame==2.5.8\n' }, fails: [0] },
    ],
  },
  [`${L02}#Install it`]: { run: [PIP_INSTALL] },
  [`${L02}#Throw it away and rebuild`]: {
    run: ['Remove-Item -Recurse .venv', 'python -m venv .venv', PIP_INSTALL],
  },
  [`${L02}#Your turn: a setup check`]: {
    files: { 'check_setup.py': CHECK_SETUP },
    wrong: [
      { name: 'never checks for the environment', files: { 'check_setup.py': 'import sys\nv = sys.version_info\nprint(f"Setup OK: Python {v.major}.{v.minor}.{v.micro} in a virtual environment")\n' }, fails: [1] },
      { name: 'the comparison the wrong way round', files: { 'check_setup.py': CHECK_SETUP.replace('sys.prefix == sys.base_prefix', 'sys.prefix != sys.base_prefix') }, fails: [0, 1] },
      { name: 'the message is printed, but the exit code is 0', files: { 'check_setup.py': CHECK_SETUP.replace('check_setup.py")\n    sys.exit(1)', 'check_setup.py")\n    sys.exit()') }, fails: [1] },
    ],
  },
  [`${L02}#Challenge: check every pinned package`]: {
    files: { 'check_setup.py': CHECK_SETUP_ALL },
    wrong: [
      { name: 'only the setup line, no package check', files: { 'check_setup.py': CHECK_SETUP }, fails: [0] },
    ],
  },

  [`${L03}#A program that crashes`]: {
    wrong: [
      { name: 'Linus has a score, so nothing crashes', edit: [['"Linus": [],', '"Linus": [500],']], fails: [0] },
    ],
  },
  [`${L03}#Where it broke, and where it's wrong`]: {
    wrong: [
      { name: 'the error silenced in average: Linus gets an average of 0', edit: [['    if not scores:\n        print(f"{name}: no games yet")\n        return\n', ''], ['    return total / len(scores)', '    if not scores:\n        return 0\n    return total / len(scores)']], fails: [0] },
      { name: 'Linus skipped, and everyone after him too', edit: [['        return\n', '        exit()\n'], ['        print(f"{name}: no games yet")\n', '']], fails: [0] },
    ],
  },
  [`${L03}#A crash far from its cause`]: {
    wrong: [
      { name: 'names already compared in lower case: the step\'s bug is missing', edit: [['if player == name:', 'if player == name.lower():']], fails: [1] },
    ],
  },
  [`${L03}#Your turn: bug hunt`]: {
    files: { 'leaderboard.py': LEADERBOARD },
    wrong: [
      { name: 'capitals fixed, but a missing player still crashes', files: { 'leaderboard.py': LEADERBOARD.replace('    if find_score(name) is None:\n        print(f"No player called {name}")\n        sys.exit(1)\n', '') }, fails: [3] },
      { name: 'the printed name is lower-cased too', files: { 'leaderboard.py': LEADERBOARD.replace('    name = sys.argv[1]\n', '    name = sys.argv[1].lower()\n') }, fails: [1, 2] },
      { name: 'the message is printed, but the exit code is 0', files: { 'leaderboard.py': LEADERBOARD.replace('{name}")\n        sys.exit(1)', '{name}")\n        sys.exit()') }, fails: [3] },
      { name: 'None hidden inside rank: Bob is "ranked 4 of 3"', files: { 'leaderboard.py': LEADERBOARD.replace('    if find_score(name) is None:\n        print(f"No player called {name}")\n        sys.exit(1)\n', '').replace('    score = find_score(name)\n', '    score = find_score(name)\n    if score is None:\n        score = 0\n') }, fails: [3] },
      { name: 'the debugging line left in', files: { 'leaderboard.py': LEADERBOARD.replace('    score = find_score(name)\n', '    score = find_score(name)\n    print("DEBUG score =", repr(score))\n') }, fails: [4] },
    ],
  },

  [`${L11}#Stop after that many frames`]: {
    wrong: [
      { name: 'the summary is never printed', edit: [['    print(f"frames={frames}")', '    pass']], fails: [0] },
    ],
  },
  [`${L11}#No window, no waiting`]: {
    wrong: [
      { name: 'a test run still waits for the clock', edit: [['    if test_frames is None:\n        clock.tick(60)\n', '    clock.tick(60)\n']], fails: [0] },
    ],
  },
  [`${L11}#Your turn: a usage message`]: {
    editFiles: { 'breakout.py': [[TEST_RUN_PARSE, TEST_RUN_CHECKED]] },
    wrong: [
      { name: 'no check at all: tracebacks', editFiles: {}, fails: [1, 2] },
      { name: 'only the isdigit check: no number crashes with IndexError', editFiles: { 'breakout.py': [[TEST_RUN_PARSE, TEST_RUN_CHECKED.replace('i + 1 >= len(args) or ', '')]] }, fails: [1] },
      { name: 'the two conditions in the wrong order', editFiles: { 'breakout.py': [[TEST_RUN_PARSE, TEST_RUN_CHECKED.replace('i + 1 >= len(args) or not args[i + 1].isdigit()', 'not args[i + 1].isdigit() or i + 1 >= len(args)')]] }, fails: [1] },
      { name: 'exit code 1 instead of 2', editFiles: { 'breakout.py': [[TEST_RUN_PARSE, TEST_RUN_CHECKED.replace('sys.exit(2)', 'sys.exit(1)')]] }, fails: [1, 2] },
    ],
  },

  [`${L12}#Tell Git who you are`]: {
    run: ['git config --global user.name "Ada Lovelace"', 'git config --global user.email "ada@example.com"', 'git config --global init.defaultBranch main'],
  },
  [`${L12}#A repository`]: { run: ['git init'] },
  [`${L12}#Ignore what's generated`]: {
    wrong: [
      { name: 'venv/ without the dot', files: { '.gitignore': 'venv/\n__pycache__/\n' }, fails: [0] },
    ],
  },
  [`${L12}#The first commit`]: {
    run: ['git add .', 'git commit -m "Start Breakout: a window and a game loop"'],
    wrong: [
      { name: 'staged but not committed', run: ['git add .'], fails: [0] },
    ],
  },
  [`${L12}#A backlog`]: { run: ['git add BACKLOG.md', 'git commit -m "Add the backlog"'] },
  [`${L12}#See a change, then undo it`]: {
    editFiles: { 'breakout.py': [['set_caption("Breakout")', 'set_caption("Breakout!!!")']] },
    run: ['git restore breakout.py'],
    wrong: [
      { name: 'the change kept', editFiles: { 'breakout.py': [['set_caption("Breakout")', 'set_caption("Breakout!!!")']] }, fails: [0, 1] },
    ],
  },
  [`${L12}#Your turn: two stories of your own`]: {
    editFiles: { 'BACKLOG.md': [['# Done', TWO_STORIES]] },
    run: ['git add BACKLOG.md', 'git commit -m "Add two stories: pause and a faster ball"'],
    wrong: [
      { name: 'only one story', editFiles: { 'BACKLOG.md': [['# Done', TWO_STORIES.split('### Faster ball')[0] + '# Done']] }, run: ['git add BACKLOG.md', 'git commit -m "Add a story: pause"'], fails: [0, 1] },
      { name: 'two stories, not committed', editFiles: { 'BACKLOG.md': [['# Done', TWO_STORIES]] }, fails: [1, 2] },
    ],
  },

  [`${L13}#Draw the paddle`]: {
    wrong: [
      { name: 'the paddle left at the top-left corner', edit: [['paddle.midbottom = (WIDTH // 2, HEIGHT - 30)\n', '']], fails: [0] },
    ],
  },
  [`${L13}#A paddle a program can steer`]: {
    wrong: [
      { name: 'left and right swapped', edit: [['elif hold == "left":\n        direction = -1', 'elif hold == "left":\n        direction = 1'], ['elif hold == "right":\n        direction = 1', 'elif hold == "right":\n        direction = -1']], fails: [0, 1] },
      { name: 'speed per frame instead of per second', edit: [['direction * PADDLE_SPEED * dt', 'direction * PADDLE_SPEED']], fails: [0, 1] },
    ],
  },
  [`${L13}#Your turn: keep the paddle on the screen`]: {
    editFiles: { 'breakout.py': [[CLAMP_BEFORE, CLAMP]] },
    wrong: [
      { name: 'no clamp', editFiles: {}, fails: [0, 1] },
      { name: 'clamped to the window width, not the width minus the paddle', editFiles: { 'breakout.py': [[CLAMP_BEFORE, clampTo('    paddle_x = max(0, min(paddle_x, WIDTH))\n')]] }, fails: [1] },
      { name: 'only the left edge clamped', editFiles: { 'breakout.py': [[CLAMP_BEFORE, clampTo('    paddle_x = max(0, paddle_x)\n')]] }, fails: [1] },
    ],
  },
  [`${L13}#Done: commit it`]: {
    editFiles: { 'BACKLOG.md': PADDLE_STORY },
    run: ['git add .', 'git commit -m "Add the paddle: arrow keys, steady speed, stays on screen"'],
    wrong: [
      { name: 'ticked but not committed', editFiles: { 'BACKLOG.md': PADDLE_STORY }, fails: [1, 2] },
      { name: 'committed without ticking the story', run: ['git add .', 'git commit -m "Add the paddle"'], fails: [0] },
    ],
  },

  [`${L14}#A ball that moves`]: {
    wrong: [
      { name: 'the ball never moves', edit: [['    ball_x += ball_vx * dt\n    ball_y += ball_vy * dt\n', '']], fails: [0] },
    ],
  },
  [`${L14}#Is the ball still on screen?`]: {
    wrong: [
      { name: 'the ball never moves', edit: [['    ball_x += ball_vx * dt\n    ball_y += ball_vy * dt\n', '']], fails: [1] },
    ],
  },
  [`${L14}#Bounce off the walls`]: {
    wrong: [
      { name: 'no bounce off the top', edit: [['    if ball_y < 6:\n        ball_vy = -ball_vy\n', '']], fails: [0] },
      { name: 'no bounce off the sides', edit: [['    if ball_x < 6 or ball_x > WIDTH - 6:\n        ball_vx = -ball_vx\n', '']], fails: [0] },
    ],
  },
  [`${L14}#The paddle bounces it`]: {
    wrong: [
      { name: 'no paddle bounce', edit: [['    if ball.colliderect(paddle) and ball_vy > 0:\n        ball_vy = -ball_vy\n', '']], fails: [0] },
    ],
  },
  [`${L14}#Missing the ball costs a life`]: {
    wrong: [
      { name: 'a miss costs a life but the ball never comes back', edit: [['        ball_x = WIDTH / 2\n        ball_y = HEIGHT / 2\n        ball_vx = BALL_SPEED * 0.6\n        ball_vy = -BALL_SPEED * 0.8\n\n    screen', '\n    screen']], fails: [0] },
    ],
  },
  [`${L14}#Your turn: bug hunt — the ball that escapes`]: {
    editFiles: { 'breakout.py': [[NAIVE_WALLS, FIXED_WALLS]] },
    wrong: [
      { name: 'no fix', editFiles: {}, fails: [0, 1, 2] },
      { name: 'only dt limited to 0.05 s', editFiles: { 'breakout.py': [['        dt = clock.tick(60) / 1000\n', '        dt = min(clock.tick(60) / 1000, 0.05)\n'], ['        dt = 0.5\n', '        dt = min(0.5, 0.05)\n']] }, fails: [1] },
      { name: 'only the top wall fixed', editFiles: { 'breakout.py': [[NAIVE_WALLS, '    if ball_x < 6 or ball_x > WIDTH - 6:\n        ball_vx = -ball_vx\n    if ball_y < 6:\n        ball_y = 6\n        ball_vy = abs(ball_vy)\n']] }, fails: [2] },
      { name: 'fixed, but the breakpoint left in', editFiles: { 'breakout.py': [[NAIVE_WALLS, FIXED_WALLS], ['    ball.center = (round(ball_x), round(ball_y))\n', '    ball.center = (round(ball_x), round(ball_y))\n    if ball_y < 0:\n        breakpoint()\n']] }, fails: [4] },
    ],
  },
  [`${L14}#Steer the ball`]: {
    editFiles: { 'BACKLOG.md': BALL_STORIES },
    run: ['git add .', 'git commit -m "Add the ball: walls, paddle bounce with steering, lives"'],
    wrong: [
      { name: "not committed", editFiles: { "BACKLOG.md": BALL_STORIES }, fails: [3, 4] },
    ],
  },

  [`${L15}#A wall of bricks`]: {
    wrong: [
      { name: 'one row only', edit: [['for row in range(5):', 'for row in range(1):']], fails: [0] },
    ],
  },
  [`${L15}#Breaking bricks`]: {
    wrong: [
      { name: 'bricks are hit but never removed', edit: [['        bricks.pop(hit)\n', '']], fails: [0, 1] },
      { name: 'the ball passes through without bouncing', edit: [['        bricks.pop(hit)\n        ball_vy = -ball_vy\n', '        bricks.pop(hit)\n']], fails: [0, 1] },
    ],
  },
  [`${L15}#Your turn: game over, and winning`]: {
    targetOf: `${L15}#Done: commit it`,
    wrong: [
      { name: 'nothing stops the game', editFiles: {}, fails: [0, 1, 3, 4, 5] },
      { name: 'only running out of lives stops it', targetOf: `${L15}#Done: commit it`, editFiles: { 'breakout.py': [['    if lives > 0 and bricks:\n', '    if lives > 0:\n']] }, fails: [3] },
      { name: 'only the paddle stops: the ball keeps breaking bricks', targetOf: `${L15}#Done: commit it`, editFiles: { 'breakout.py': [['    if lives > 0 and bricks:\n', '    if True:\n'], ['        paddle_x += direction * PADDLE_SPEED * dt\n', '        if lives > 0 and bricks:\n            paddle_x += direction * PADDLE_SPEED * dt\n']] }, fails: [0, 1, 2] },
    ],
  },
  [`${L15}#Done: commit it`]: {
    editFiles: { 'BACKLOG.md': END_STORIES },
    run: ['git add .', 'git commit -m "Add bricks, score and the end of the game"'],
    wrong: [
      { name: 'not committed', editFiles: { 'BACKLOG.md': END_STORIES }, fails: [1, 2] },
    ],
  },

  [`${L16}#Try a change`]: {
    editFiles: { 'breakout.py': [['60 + row * 26', '60 + row * 40']] },
    run: ['git restore breakout.py'],
    wrong: [
      { name: 'the experiment left in the file', editFiles: { 'breakout.py': [['60 + row * 26', '60 + row * 40']] }, fails: [0, 1] },
    ],
  },
  [`${L16}#Your turn: write down the debt`]: {
    editFiles: { 'BACKLOG.md': [[LAST_DONE, debtSection(DEBT)]] },
    run: ['git add BACKLOG.md', 'git commit -m "Write down the technical debt in breakout.py"'],
    wrong: [
      { name: 'only three items', editFiles: { 'BACKLOG.md': [[LAST_DONE, debtSection(DEBT.slice(0, 3))]] }, run: ['git add BACKLOG.md', 'git commit -m "Write down the debt"'], fails: [1] },
      { name: 'five items too short to say anything', editFiles: { 'BACKLOG.md': [[LAST_DONE, debtSection(['messy', 'globals', 'duplication', 'magic numbers', 'hard to test'])]] }, run: ['git add BACKLOG.md', 'git commit -m "Write down the debt"'], fails: [1] },
      { name: 'written but not committed', editFiles: { 'BACKLOG.md': [[LAST_DONE, debtSection(DEBT)]] }, fails: [2, 3] },
    ],
  },

  [`${L21}#Install pytest`]: { run: [PIP_INSTALL] },
  [`${L21}#The first test`]: {
    wrong: [
      { name: 'the test file in the project folder, not tests/, so GAME points one folder too high', files: { 'test_characterisation.py': 'from pathlib import Path\nimport subprocess, sys\nGAME = Path(__file__).parent.parent / "breakout.py"\n\ndef test_autopilot_plays_for_ten_seconds():\n    r = subprocess.run([sys.executable, str(GAME), "--test-run", "600", "--hold", "auto"], capture_output=True, text=True)\n    assert r.stdout.strip().splitlines()[-1] == "frames=600 paddle_x=218 score=70 lives=3 bricks=33 inside=True"\n' }, fails: [0] },
    ],
  },
  [`${L21}#Make it fail on purpose`]: {
    editFiles: { 'breakout.py': [['BALL_SPEED = 300', 'BALL_SPEED = 310']] },
    run: ['git restore breakout.py'],
    wrong: [
      { name: 'the faster ball left in', editFiles: { 'breakout.py': [['BALL_SPEED = 300', 'BALL_SPEED = 310']] }, fails: [0, 1] },
    ],
  },
  [`${L21}#Raise the bar for "done"`]: {
    editFiles: { 'BACKLOG.md': [[DONE_BEFORE, DONE_AFTER]] },
    run: ['git add .', 'git commit -m "Add characterisation tests for breakout.py"'],
    wrong: [
      { name: 'committed without changing the definition of done', run: ['git add .', 'git commit -m "Add characterisation tests"'], fails: [0] },
    ],
  },
  [`${L21}#Your turn: two more pins`]: {
    editFiles: { 'tests/test_characterisation.py': [[USAGE_TEST_END, pins(LEFT_LINE, LOST_LINE)]] },
    wrong: [
      { name: 'a guessed expected line', editFiles: { 'tests/test_characterisation.py': [[USAGE_TEST_END, pins(LEFT_LINE.replace('paddle_x=0', 'paddle_x=10'), LOST_LINE)]] }, fails: [0, 2] },
      { name: 'named so pytest never runs it', editFiles: { 'tests/test_characterisation.py': [[USAGE_TEST_END, pins(LEFT_LINE, LOST_LINE, 'check_left_edge')]] }, fails: [0, 2] },
    ],
  },

  [`${L22}#One ball, one place`]: {
    wrong: [
      { name: 'a different starting speed after a miss', edit: [['            lives -= 1\n            ball_x, ball_y, ball_vx, ball_vy = start_ball()\n', '            lives -= 1\n            ball_x, ball_y, ball_vx, ball_vy = WIDTH / 2, HEIGHT / 2, BALL_SPEED * 0.8, -BALL_SPEED * 0.6\n']], fails: [1] },
    ],
  },
  [`${L22}#The paddle bounce in a function`]: {
    wrong: [
      { name: 'the paddle bounce steers from the paddle\'s full width', edit: [['(paddle.width / 2)', 'paddle.width']], fails: [2] },
    ],
  },
  [`${L22}#The wall in a function`]: {
    wrong: [
      { name: 'bricks drawn, but the rows one gap too close', edit: [['            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)\n', '            y = WALL_TOP + row * BRICK_HEIGHT\n']], fails: [2] },
    ],
  },
  [`${L22}#Your turn: the paddle's functions`]: {
    editFiles: paddleFunctions(),
    run: ['git add .', 'git commit -m "Split breakout.py into functions"'],
    wrong: [
      { name: 'the loop still decides inline', editFiles: { 'breakout.py': [['def bounce_off_walls(', PADDLE_FUNCTIONS]] }, fails: [2] },
      { name: 'autopilot steers from the paddle\'s left edge', editFiles: paddleFunctions(PADDLE_FUNCTIONS.replace('middle = paddle_x + PADDLE_WIDTH / 2', 'middle = paddle_x')), fails: [3] },
      { name: 'move_paddle forgets to clamp', editFiles: paddleFunctions(PADDLE_FUNCTIONS.replace('return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)', 'return paddle_x + direction * PADDLE_SPEED * dt')), fails: [3] },
      { name: 'not committed', editFiles: paddleFunctions(), fails: [4, 5] },
    ],
  },

  [`${L23}#The arguments, read by a function`]: { before: ['Remove-Item whoami.py'] },
  [`${L23}#Only when run directly`]: {
    wrong: [
      { name: 'main is called even when the file is imported', edit: [['if __name__ == "__main__":\n    main(sys.argv[1:])', 'main(sys.argv[1:])']], fails: [0] },
    ],
  },
  [`${L23}#Tell pytest where the code is`]: {
    wrong: [
      { name: 'the tests folder on the path instead of the project', files: { 'pytest.ini': '[pytest]\npythonpath = tests\n' }, fails: [1] },
    ],
  },
  [`${L23}#Your turn: pin down clamp`]: {
    editFiles: clampTests(),
    run: ['git add .', 'git commit -m "Move the game into main, and add the first unit tests"'],
    wrong: [
      { name: 'the expected value copied from a broken clamp', editFiles: clampTests('breakout.clamp(-5, 0, 3) == -5'), fails: [0] },
      { name: 'the two tests under other names', editFiles: { 'tests/test_breakout.py': [[CLAMP_TEST_END, `${CLAMP_TEST_END}\n\ndef test_low():\n    assert breakout.clamp(-5, 0, 3) == 0\n`]] }, fails: [0, 1] },
      { name: 'not committed', editFiles: clampTests(), fails: [2, 3] },
    ],
  },

  [`${L24}#Which tests notice?`]: {
    editFiles: { 'breakout.py': [['        y, vy = BALL_RADIUS, abs(vy)\n', '        vy = -vy\n']] },
    run: ['git restore breakout.py'],
    wrong: [
      { name: 'the buggy wall left in', editFiles: { 'breakout.py': [['        y, vy = BALL_RADIUS, abs(vy)\n', '        vy = -vy\n']] }, fails: [0, 1] },
    ],
  },
  [`${L24}#Your turn: bug hunt — the command line`]: {
    editFiles: checkedArgs(),
    wrong: [
      { name: 'nothing fixed', editFiles: {}, fails: [0, 2] },
      { name: '--lag-at checked, --hold still unchecked', editFiles: checkedArgs(PARSE_AFTER.replace('        if i + 1 >= len(args) or args[i + 1] not in HOLDS:\n            print(USAGE)\n            sys.exit(2)\n', '')), fails: [0, 2] },
      { name: 'bad options refused with exit code 1', editFiles: checkedArgs(PARSE_AFTER.replaceAll('sys.exit(2)', 'sys.exit(1)')), fails: [0, 1, 2] },
      { name: 'a hold with nothing after it still crashes', editFiles: checkedArgs(PARSE_AFTER.replace('if i + 1 >= len(args) or args[i + 1] not in HOLDS:', 'if args[i + 1] not in HOLDS:')), fails: [0] },
    ],
  },
  [`${L24}#Done: commit it`]: {
    run: ['git add .', 'git commit -m "Add unit tests, and check every command-line option"'],
    wrong: [
      { name: 'not committed', fails: [1, 2] },
    ],
  },

  [`${L25}#Install a type checker`]: { run: [PIP_INSTALL] },
  [`${L25}#Point it at your Python`]: {
    wrong: [
      { name: 'the environment misnamed, so pygame can\'t be found', files: { 'pyrightconfig.json': '{ "venvPath": ".", "venv": "venv" }\n' }, fails: [1] },
    ],
  },
  [`${L25}#Your turn: type every function`]: {
    ...typedEverything(),
    run: ['git add .', 'git commit -m "Add types to every function"'],
    wrong: [
      { name: 'hints added, but missing ones still allowed', editFiles: { 'breakout.py': SIGNATURES, 'BACKLOG.md': [[DONE_AFTER, DONE_WITH_TYPES]] }, fails: [0] },
      { name: 'draw and main left without hints', ...typedEverything(SIGNATURES.slice(0, 5)), fails: [1] },
      { name: 'the definition of done not updated', files: { 'pyrightconfig.json': STRICT_PARAMS }, editFiles: { 'breakout.py': SIGNATURES }, fails: [4] },
      { name: 'not committed', ...typedEverything(), fails: [5, 6] },
    ],
  },

  [`${L26}#A random serve`]: {
    wrong: [
      { name: 'test runs left unseeded', edit: [['        if seed is None:\n            seed = 0\n', '']], fails: [2] },
    ],
  },
  [`${L26}#Your turn: test the serve`]: {
    editFiles: serveTests(),
    wrong: [
      { name: 'the speed compared with ==', editFiles: serveTests('math.hypot(vx, vy) == breakout.BALL_SPEED'), fails: [1, 3] },
      { name: 'the old test left in', editFiles: { 'tests/test_breakout.py': [...serveTests()['tests/test_breakout.py'].slice(0, 1), [OLD_SERVE_TEST, OLD_SERVE_TEST + '\n\n' + serveTests()['tests/test_breakout.py'][1][1]]] }, fails: [2, 3] },
    ],
  },
  [`${L26}#Done: the end of Chapter 2`]: {
    editFiles: { 'BACKLOG.md': [['# Done\n\n', SERVE_STORY]] },
    run: ['git add .', 'git commit -m "Serve the ball in a random direction, with seeded test runs"'],
    wrong: [
      { name: 'not committed', fails: [2, 3] },
    ],
  },

  [`${L31}#A ball that moves itself`]: {
    wrong: [
      { name: 'move forgets dt', edit: [['        self.x += self.vx * dt\n', '        self.x += self.vx\n']], fails: [0] },
    ],
  },
  [`${L31}#No new ball after the last life`]: {
    wrong: [
      { name: 'a new ball served after the last life', edit: [['                if lives > 0:\n                    ball = serve(rng)\n', '                ball = serve(rng)\n']], fails: [0] },
    ],
  },
  [`${L31}#Your turn: a paddle that knows itself`]: {
    targetOf: L31_ANSWER,
    run: ['git add .', 'git commit -m "Add Ball and Paddle classes"'],
    wrong: [
      { name: 'the paddle\'s top edge at HEIGHT - 30', targetOf: L31_ANSWER, editFiles: { 'breakout.py': [['HEIGHT - 30 - PADDLE_HEIGHT', 'HEIGHT - 30']] }, fails: [3, 4] },
      { name: 'not committed', targetOf: L31_ANSWER, fails: [6, 7] },
    ],
  },
  [`${L32}#The game uses the vectors`]: {
    wrong: [
      { name: 'every serve shares one centre vector', edit: [['def serve(rng: random.Random) -> Ball:', 'CENTRE = Vector2(WIDTH / 2, HEIGHT / 2)\n\n\ndef serve(rng: random.Random) -> Ball:'], ['return Ball(Vector2(WIDTH / 2, HEIGHT / 2),', 'return Ball(CENTRE,']], fails: [1] },
    ],
  },
  [`${L32}#Your turn: settings with names`]: {
    targetOf: L32_ANSWER,
    run: ['git add .', 'git commit -m "Use a frozen dataclass for the settings"'],
    wrong: [
      { name: 'not frozen', targetOf: L32_ANSWER, editFiles: { 'breakout.py': [['@dataclass(frozen=True)', '@dataclass']] }, fails: [0] },
      { name: 'not committed', targetOf: L32_ANSWER, fails: [5, 6] },
    ],
  },
  [`${L33}#Green: just enough`]: { run: ['git add .', 'git commit -m "A brick can take more than one hit"'] },
  [`${L33}#Green: points`]: { run: ['git add .', 'git commit -m "A brick scores its points when it breaks"'] },
  [`${L33}#Re-record the win`]: {
    editFiles: { 'tests/test_characterisation.py': [['frames=10000 paddle_x=183 score=400 lives=3 bricks=0 inside=True', 'frames=10000 paddle_x=371 score=560 lives=3 bricks=0 inside=True']] },
    run: ['git add .', 'git commit -m "Make the top row tough: two hits, 30 points"'],
  },
  [`${L33}#Your turn: cracked bricks look cracked`]: {
    targetOf: L33_ANSWER,
    run: ['git add .', 'git commit -m "Draw cracked bricks darker"'],
    wrong: [
      { name: 'the colour worked out, but never drawn', targetOf: L33_ANSWER, editFiles: { 'breakout.py': [['brick.current_colour(), brick.rect', 'brick.colour, brick.rect']] }, fails: [2] },
      { name: 'cracked colours not rounded down', targetOf: L33_ANSWER, editFiles: { 'breakout.py': [['return int(r * 0.6), int(g * 0.6), int(b * 0.6)', 'return round(r * 0.6), round(g * 0.6), round(b * 0.6)']] }, fails: [1] },
      { name: 'not committed', targetOf: L33_ANSWER, fails: [5, 6] },
    ],
  },
  [`${L34}#Tests speak in choices`]: { run: ['git add .', 'git commit -m "Use an enum for the hold setting"'] },
  [`${L34}#Was it me? \`git stash\``]: {
    run: ['git stash', 'git stash pop', 'git add .', 'git commit -m "Keep the paddle on screen with a read-only property"'],
    wrong: [
      { name: 'stashed and never popped', run: ['git stash'], fails: [0] },
    ],
  },
  [`${L34}#Your turn: a broken brick stays broken`]: {
    editFiles: brokenBrick(),
    run: ['git add .', 'git commit -m "A broken brick refuses to be hit again"'],
    wrong: [
      { name: 'no check: hits_left goes to -1', editFiles: brokenBrick(BROKEN_HIT_BEFORE), fails: [0, 1] },
      { name: 'the check after the change, so a refused hit half-happens', editFiles: brokenBrick('    def hit(self) -> int:\n        self.hits_left -= 1\n        if self.hits_left < 0:\n            raise ValueError("this brick is already broken")\n'), fails: [0] },
      { name: 'not committed', editFiles: brokenBrick(), fails: [4, 5] },
    ],
  },

  [`${L35}#The rules move into the game`]: {
    wrong: [
      { name: 'a missed ball serves a new one even after the last life', edit: [['            if self.lives > 0:\n                self.ball = serve(self.rng)\n', '            self.ball = serve(self.rng)\n']], fails: [1] },
    ],
  },
  [`${L35}#Your turn: the end of a game`]: {
    editFiles: endTests(),
    run: ['git add .', 'git commit -m "Make the game a model: a Game object you can test without a window"'],
    wrong: [
      { name: 'the expected lives copied from a wrong guess', editFiles: endTests('assert game.lives == 1'), fails: [0, 2] },
      { name: 'not committed', editFiles: endTests(), fails: [4, 5] },
    ],
  },

  [`${L36}#Install ruff`]: { run: [PIP_INSTALL] },
  [`${L36}#Format everything`]: {
    run: ['.venv\\Scripts\\python -m ruff format .', 'git add .', 'git commit -m "Format the code with ruff"'],
    wrong: [
      { name: 'committed without formatting', run: ['git add .', 'git commit -m "Add ruff"'], fails: [0, 2] },
    ],
  },
  [`${L36}#What the linter finds`]: {
    // ruff check --fix exits with 1 while a finding remains, as it does for the learner.
    run: ['.venv\\Scripts\\python -m ruff check --fix .', 'git add .', 'git commit -m "Apply ruff\'s automatic fixes"'],
    allowFailure: true,
    wrong: [
      { name: 'the fixes never applied', run: ['git commit --allow-empty -m "Apply ruff\'s automatic fixes"'], fails: [0] },
    ],
  },
  [`${L36}#Your turn: the last finding`]: {
    editFiles: lastFinding(),
    run: ['git add .', 'git commit -m "Make ruff\'s lint pass: an explicit check=False"'],
    wrong: [
      { name: 'check=True: failing programs now raise', editFiles: lastFinding(PLAY_RUN.replace('text=True)', 'text=True, check=True)')), fails: [2, 3] },
      { name: 'the finding silenced instead of decided', editFiles: lastFinding(PLAY_RUN + '  # noqa: PLW1510'), fails: [2] },
      { name: 'not committed', editFiles: lastFinding(), fails: [5, 6] },
    ],
  },

  [`${L41}#A package`]: {
    before: ['mkdir breakout', 'git mv breakout.py breakout/model.py'],
    wrong: [
      { name: 'copied instead of moved', before: ['mkdir breakout', 'Copy-Item breakout.py breakout/model.py'], files: { 'breakout/__init__.py': '"""Breakout: the game built through the Forge series."""\n' }, fails: [2] },
    ],
  },
  [`${L41}#Run it as a module`]: {
    editFiles: { 'breakout/model.py': [['usage: python breakout.py', 'usage: python -m breakout']] },
    wrong: [
      { name: '__main__.py imports from a module that isn\'t there', files: { 'breakout/__main__.py': 'import sys\n\nfrom breakout.game import main\n\nmain(sys.argv[1:])\n' }, editFiles: { 'breakout/model.py': [['usage: python breakout.py', 'usage: python -m breakout']] }, fails: [1] },
    ],
  },
  [`${L41}#Your turn: everything else`]: {
    ...packageEverything(),
    run: ['git add .', 'git commit -m "Make the game a package"'],
    wrong: [
      { name: 'replay.py left behind', ...packageEverything({ replay: false }), fails: [4] },
      { name: 'the definition of done still names breakout.py', ...packageEverything({ done: false }), fails: [5] },
      { name: 'not committed', ...packageEverything(), fails: [6, 7] },
    ],
  },

  [`${L42}#Your turn: one direction only`]: {
    targetOf: L42_ANSWER,
    run: ['git add .', 'git commit -m "Give each job its own modules: settings, model, draw, app"'],
    wrong: [
      { name: 'draw.py still imports from app.py: the circle', targetOf: L42_ANSWER, editFiles: { 'breakout/draw.py': [['from breakout.model import Game\n', 'from breakout.app import main\nfrom breakout.model import Game\n']] }, fails: [0, 3, 4] },
      { name: 'no architecture tests', targetOf: L42_ANSWER.slice(0, 3), fails: [3, 4] },
      { name: 'not committed', targetOf: L42_ANSWER, fails: [7, 8] },
    ],
  },
  [`${L43}#Every tool's settings in one file`]: { run: ['git rm pytest.ini ruff.toml pyrightconfig.json'] },
  [`${L43}#Install the project`]: {
    run: [PIP_INSTALL],
    wrong: [
      // No pip in a wrong answer: its copy shares the real .venv, and an editable install there would
      // point the real environment at the copy. git check-ignore works on a path that doesn't exist yet.
      { name: 'the metadata folder not ignored', files: { '.gitignore': "# Generated: rebuilt from requirements.txt with python -m venv .venv\n.venv/\n\n# Generated: Python's compiled bytecode\n__pycache__/\n" }, fails: [0] },
    ],
  },
  [`${L43}#Your turn: who controls this data?`]: {
    editFiles: positiveFrames(),
    run: ['git add .', 'git commit -m "Check the frame count on the command line"'],
    wrong: [
      { name: 'only the tests: type=int still accepts -5', editFiles: { 'tests/test_arguments.py': [[ARGS_END, ARGS_END + FRAME_TESTS]] }, fails: [0, 1, 3, 4] },
      { name: 'the validator under another name', editFiles: positiveFrames(POSITIVE_INT.replace('def positive_int(', 'def frames('), 'frames'), fails: [2] },
      { name: 'not committed', editFiles: positiveFrames(), fails: [6, 7] },
    ],
  },

  [`${L44}#Your turn: strict everywhere`]: {
    ...strictEverywhere(),
    run: ['git add .', 'git commit -m "Check everything in strict mode"'],
    wrong: [
      { name: 'replay.py fixed, the tests left unchecked', ...strictEverywhere({ tests: false }), fails: [0] },
      { name: 'the definition of done still checks only the package', ...strictEverywhere({ done: false }), fails: [3] },
      { name: 'not committed', ...strictEverywhere(), fails: [4, 5] },
    ],
  },

  [`${L45}#Boundaries`]: {
    editFiles: { 'breakout/model.py': [['self.position.x > WIDTH - BALL_RADIUS:', 'self.position.x >= WIDTH - BALL_RADIUS:']] },
    run: ['git restore breakout/model.py'],
    wrong: [
      { name: 'the experiment left in', editFiles: { 'breakout/model.py': [['self.position.x > WIDTH - BALL_RADIUS:', 'self.position.x >= WIDTH - BALL_RADIUS:']] }, fails: [1] },
    ],
  },
  [`${L45}#Your turn: test the boundaries`]: {
    files: { 'tests/test_boundaries.py': boundaryTests() },
    run: ['Remove-Item review_these_tests.py', 'git add .', 'git commit -m "Test the walls at their boundaries"'],
    wrong: [
      { name: 'one pixel inside each wall: passes, catches nothing', files: { 'tests/test_boundaries.py': boundaryTests(1) }, run: ['Remove-Item review_these_tests.py'], fails: [0] },
      { name: 'the review file kept and committed', files: { 'tests/test_boundaries.py': boundaryTests() }, run: ['git add .', 'git commit -m "Test the walls at their boundaries"'], fails: [4] },
      { name: 'not committed', files: { 'tests/test_boundaries.py': boundaryTests() }, run: ['Remove-Item review_these_tests.py'], fails: [5, 6] },
    ],
  },

  [`${L46}#A branch for the work`]: {
    run: ['git switch -c game-states'],
    wrong: [
      { name: 'still on main', fails: [0] },
    ],
  },
  [`${L46}#The states`]: { run: ['git add breakout/model.py', 'git commit -m "Add game states to the model"'] },
  [`${L46}#Your turn: test the transitions, then merge`]: {
    files: { 'tests/test_states.py': STATE_TESTS },
    run: ['git add .', 'git commit -m "Test the state machine"', 'git switch main', 'git merge game-states', 'git branch -d game-states'],
    wrong: [
      { name: 'committed on the branch, never merged', files: { 'tests/test_states.py': STATE_TESTS }, run: ['git add .', 'git commit -m "Test the state machine"'], fails: [4, 6] },
      { name: 'merged, but the branch name left behind', files: { 'tests/test_states.py': STATE_TESTS }, run: ['git add .', 'git commit -m "Test the state machine"', 'git switch main', 'git merge game-states'], fails: [6] },
    ],
  },
  [`${L47}#Two lines of work`]: {
    editFiles: { 'breakout/draw.py': [[TITLE_LINE, '"Press Space to play Breakout"']] },
    run: ['git switch -c title-text', 'git commit -am "Friendlier title text"'],
  },
  [`${L47}#Meanwhile, on main`]: {
    before: ['git switch main'],
    editFiles: { 'breakout/draw.py': [[TITLE_LINE, '"BREAKOUT - press Space"']] },
    run: ['git commit -am "Shout the game name on the title"'],
  },
  [`${L47}#Merge, and a conflict`]: { run: ['git merge title-text'], allowFailure: true },
  [`${L47}#Your turn: resolve it`]: {
    editFiles: { 'breakout/draw.py': [[CONFLICT, RESOLVED]] },
    run: ['git add breakout/draw.py', 'git commit -m "Merge title-text: keep the shout, and say what Space does"', 'git branch -d title-text'],
    wrong: [
      { name: 'the markers committed as they were', run: ['git add breakout/draw.py', 'git commit -m "Merge title-text"', 'git branch -d title-text'], fails: [0, 1, 2] },
      { name: 'resolved, but the merge never committed', editFiles: { 'breakout/draw.py': [[CONFLICT, RESOLVED]] }, fails: [4, 5, 6] },
    ],
  },
  [`${L51}#Your turn: test the level reader`]: {
    targetOf: L51_ANSWER,
    run: ['git add .', 'git commit -m "Read the wall from a level file"'],
    wrong: [
      { name: 'the old wall tests left in', targetOf: [`${L52}#The level tests so far`], fails: [0, 2] },
      { name: 'not committed', targetOf: L51_ANSWER, fails: [5, 6] },
    ],
  },
  [`${L52}#Your turn: bug hunt — the castle that won't load`]: {
    before: [MAKE_CASTLE],
    ...bomFix(),
    run: ['git add .', 'git commit -m "Accept level files that start with a byte order mark"'],
    wrong: [
      { name: 'the file fixed instead of the game', before: [MAKE_CASTLE, "Set-Content breakout/levels/castle.txt 'B.BBBB.B','BBTTTTBB','BB....BB'"], editFiles: {}, fails: [1, 2] },
      { name: 'the game fixed, but no regression test', before: [MAKE_CASTLE], ...bomFix({ test: false }), fails: [1, 2] },
      { name: 'not committed', before: [MAKE_CASTLE], ...bomFix(), fails: [5, 6] },
    ],
  },
  [`${L53}#A level is a JSON file`]: {
    run: ['Remove-Item breakout\\levels\\classic.txt'],
    wrong: [{ name: 'classic.txt left in place', typeFile: true, fails: [1] }],
  },
  [`${L53}#The castle, as JSON`]: {
    run: ['Remove-Item breakout\\levels\\castle.txt'],
    wrong: [
      { name: 'castle.txt left in place', typeFile: true, fails: [0] },
      { name: 'castle.txt deleted, castle.json never made', run: ['Remove-Item breakout\\levels\\castle.txt'], fails: [1] },
    ],
  },
  [`${L53}#Your turn: every refusal, tested`]: {
    files: { 'tests/test_level_errors.py': L53_ERRORS },
    run: ['git add .', 'git commit -m "Test every way a JSON level is refused"'],
    wrong: [
      { name: 'the old text-level cases left as they were', run: ['git add .', 'git commit -m "JSON levels" --allow-empty'], fails: [0, 1, 2, 3] },
      { name: 'eleven cases: lives of true never tested', files: { 'tests/test_level_errors.py': L53_ERRORS.replace('        (level_text(lives=True), "lives: must be a whole number from 1 to 9"),\n', '') }, run: ['git add .', 'git commit -m "Test JSON level errors"'], fails: [0, 3] },
      { name: 'not committed', files: { 'tests/test_level_errors.py': L53_ERRORS }, fails: [6, 7] },
    ],
  },
  [`${L54}#A dependency the game needs`]: {
    run: ['.venv\\Scripts\\python -m pip install -r requirements.txt'],
  },
  [`${L54}#Your turn: rows a designer can find`]: {
    ...whereAs('row {part + 1}'),
    run: ['git add .', 'git commit -m "Read levels with pydantic, naming rows in its errors"'],
    wrong: [
      { name: 'where still counts from 0', run: ['git add .', 'git commit -m "Read levels with pydantic"'], fails: [1, 2] },
      { name: 'off by one: the first row called row 0', ...whereAs('row {part}'), run: ['git add .', 'git commit -m "pydantic rows"'], fails: [1, 2] },
      { name: 'the tests changed to match the code', editFiles: { 'tests/test_level_errors.py': [['wall, row 2', 'wall, 1', 'all'], ['wall, row 1', 'wall, 0', 'all']] }, run: ['git add .', 'git commit -m "pydantic"'], fails: [0] },
      { name: 'not committed', ...whereAs('row {part + 1}'), fails: [5, 6] },
    ],
  },
  [`${L55}#Your turn: one key, two actions`]: {
    ...clashRule(EVERY_CLASH),
    run: ['git add .', 'git commit -m "Refuse settings that use a key twice"'],
    wrong: [
      { name: 'only left and right compared', ...clashRule(LEFT_RIGHT_CLASH), run: ['git add .', 'git commit -m "A key used twice"'], fails: [0] },
      { name: 'the rule, but no test for it', ...clashRule(EVERY_CLASH, { test: false }), run: ['git add .', 'git commit -m "A key used twice"'], fails: [2, 3] },
      { name: 'not committed', ...clashRule(EVERY_CLASH), fails: [6, 7] },
    ],
  },
  [`${L56}#A tool that measures tests`]: {
    run: ['.venv\\Scripts\\python -m pip install -r requirements.txt'],
  },
  [`${L56}#Your turn: test the refusals`]: {
    ...refusalTests(LEVEL_REFUSAL_TEST, CONFIG_REFUSAL_TEST),
    run: ['git add .', 'git commit -m "Test that bad levels and settings stop the game with exit code 1"'],
    wrong: [
      { name: 'only the level refusal tested', ...refusalTests(LEVEL_REFUSAL_TEST), run: ['git add .', 'git commit -m "Test the exit code"'], fails: [0, 1] },
      { name: 'not committed', ...refusalTests(LEVEL_REFUSAL_TEST, CONFIG_REFUSAL_TEST), fails: [4, 5] },
    ],
  },
  [`${L61}#Your turn: dates that survive the trip`]: {
    editFiles: { 'breakout/scores.py': [ASDICT_IMPORT, [LOAD_UNPACK, LOAD_ISO], [SAVE_ASDICT, SAVE_ISO]] },
    run: ['git add .', 'git commit -m "Save score times as ISO 8601 text"'],
    wrong: [
      {
        name: 'default=str: the crash hidden, not fixed',
        editFiles: { 'breakout/scores.py': [['indent=2)', 'indent=2, default=str)']] },
        run: ['git add .', 'git commit -m "ISO 8601"'],
        fails: [0, 3],
      },
      {
        name: 'saved as ISO 8601, but read back as text',
        editFiles: { 'breakout/scores.py': [ASDICT_IMPORT, [SAVE_ASDICT, SAVE_ISO]] },
        run: ['git add .', 'git commit -m "ISO 8601"'],
        fails: [0, 3],
      },
      { name: 'not committed', editFiles: { 'breakout/scores.py': [ASDICT_IMPORT, [LOAD_UNPACK, LOAD_ISO], [SAVE_ASDICT, SAVE_ISO]] }, fails: [6, 7] },
    ],
  },
  [`${L62}#The shortcut: pickle`]: {
    run: [
      '.venv\\Scripts\\python make_gift.py',
      `.venv\\Scripts\\python -c "import pickle; from pathlib import Path; pickle.loads(Path('gift.pickle').read_bytes())"`,
      'Remove-Item make_gift.py, gift.pickle',
    ],
  },
  [`${L62}#Your turn: play on, and don't make it worse`]: {
    ...playOn(),
    run: ['git add .', `git commit -m "Play on when the scores file can't be read"`],
    wrong: [
      { name: 'nothing caught: the game still crashes', run: ['git add .', 'git commit -m "scores file"'], fails: [0, 1] },
      { name: 'caught, but the broken file is still saved over', ...playOn(false), run: ['git add .', 'git commit -m "scores file"'], fails: [1] },
      { name: 'not committed', ...playOn(), fails: [6, 7] },
    ],
  },
  [`${L63}#SQL, by hand`]: { run: PRACTICE },
  [`${L63}#Your turn: the best score, in SQL`]: {
    ...bestIs(BEST_SQL),
    run: ['git add .', 'git commit -m "Find the best score with SQLite"'],
    wrong: [
      {
        name: 'the row returned, not the number in it',
        ...bestIs('    return db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()\n'),
        run: ['git add .', 'git commit -m "SQLite best"'],
        fails: [0, 3],
      },
      {
        name: '(level) without its comma is not a tuple',
        ...bestIs(BEST_SQL.replace('(level,)', '(level)')),
        run: ['git add .', 'git commit -m "SQLite best"'],
        fails: [0, 3],
      },
      { name: 'not committed', ...bestIs(BEST_SQL), fails: [6, 7] },
    ],
  },
  [`${L64}#When data becomes code`]: {
    run: [
      'Copy-Item scores.db attack.db',
      `.venv\\Scripts\\python -m breakout.report attack.db "x' OR '1'='1"`,
      `.venv\\Scripts\\python -m breakout.report attack.db "x' OR '1'='1" --forget`,
      'Remove-Item attack.db',
    ],
  },
  [`${L64}#Your turn: names are only names`]: {
    ...reportFix(),
    run: ['git add .', 'git commit -m "Pass level names to SQL as parameters, closing the injection"'],
    wrong: [
      { name: 'the report fixed, but forget still injectable', ...reportFix({ del: false }), run: ['git add .', 'git commit -m "injection"'], fails: [2, 3, 4, 5] },
      {
        name: 'apostrophes doubled by hand',
        editFiles: { 'breakout/report.py': [[`'{level}'`, `'{level.replace("'", "''")}'`, 'all']] },
        files: { 'tests/test_report.py': TEST_REPORT },
        run: ['git add .', 'git commit -m "injection"'],
        fails: [3],
      },
      { name: 'fixed, but no tests', ...reportFix({ tests: false }), run: ['git add .', 'git commit -m "injection"'], fails: [4, 5] },
      { name: 'not committed', ...reportFix(), fails: [7, 8] },
    ],
  },
  [`${L65}#Your turn: one game, set up once`]: {
    files: GAME_FIXTURES,
    run: ['git add .', 'git commit -m "Share the game setup between tests with fixtures"'],
    wrong: [
      {
        name: 'fixtures added, but the old helpers still used',
        files: { 'tests/conftest.py': GAME_FIXTURES['tests/conftest.py'] },
        run: ['git add .', 'git commit -m "fixture"'],
        fails: [0, 1, 2, 3],
      },
      { name: 'not committed', files: GAME_FIXTURES, fails: [10, 11] },
    ],
  },
  [`${L71}#The app records who played`]: {
    run: [
      'Remove-Item scores.db -ErrorAction Ignore',
      '.venv\\Scripts\\breakout --test-run 10000 --hold auto --scores scores.db --player Mia',
      '.venv\\Scripts\\breakout --test-run 600 --hold none --scores scores.db',
    ],
  },
  [`${L71}#Your turn: bug hunt — the reference nobody checks`]: {
    editFiles: { 'breakout/scores.py': [[CONNECT, FK_ON]] },
    run: ['git add .', 'git commit -m "Enforce foreign keys on every connection"'],
    wrong: [
      { name: 'nothing changed', run: ['git add .', 'git commit -m "foreign key"'], fails: [0, 1, 2] },
      {
        name: 'switched on in the test fixture only',
        editFiles: { 'tests/conftest.py': [[FIXTURE_OPEN, FIXTURE_OPEN + '    connection.execute("PRAGMA foreign_keys = ON")\n']] },
        run: ['git add .', 'git commit -m "foreign key"'],
        fails: [0],
      },
      { name: 'not committed', editFiles: { 'breakout/scores.py': [[CONNECT, FK_ON]] }, fails: [5, 6] },
    ],
  },
};
