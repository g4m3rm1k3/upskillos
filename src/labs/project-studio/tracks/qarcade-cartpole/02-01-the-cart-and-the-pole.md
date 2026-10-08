---
title: 2.1 — The Cart and the Pole
track: Q-Arcade — CartPole with a Table
trackOrder: 12.3
runtime: python
run: cartpole_view.py
---

**Starting a new chapter:** if the file tree is empty, click **Choose folder…** and select your `q-arcade` folder again.

**CartPole** is the first school problem, and probably the most famous problem in reinforcement learning. A pole stands on a hinge on top of a cart that runs along a track. Every 0.02 seconds you must push the cart either left or right, with the same force. If the pole tilts more than 12° from upright, or the cart runs off either end of the track, the episode is over. Every step survived earns 1 point, and an episode that reaches 500 steps (10 seconds) is stopped there.

Before any learning, this lesson makes CartPole as transparent as the corridor was. You'll read its four numbers, rebuild one tick of its physics yourself and check it matches Gymnasium's to the last digit, draw it in pygame, and try to balance it with the arrow keys.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_cartpole.py** above.

```python file=tests/test_cartpole.py provided
# Tests for meet_cartpole.py, physics.py and cartpole_view.py (lesson 2.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_cartpole.py
import math

import numpy as np
import pygame
from pytest import approx


def test_meet_reset_gives_four_small_numbers():
    from meet_cartpole import first_steps
    obs, reward, terminated, truncated = first_steps([], seed=0)[0]
    assert obs.shape == (4,)
    assert np.all(np.abs(obs) < 0.05), "every number starts between -0.05 and 0.05"


def test_meet_every_step_pays_one():
    from meet_cartpole import first_steps
    rows = first_steps([1] * 20)
    assert [reward for _, reward, _, _ in rows[1:]] == [1.0] * (len(rows) - 1)


def test_meet_pushing_right_topples_the_pole_left():
    from meet_cartpole import first_steps
    rows = first_steps([1] * 20)
    obs, _, terminated, _ = rows[-1]
    assert terminated is True and len(rows) - 1 == 8
    assert obs[2] < -12 * math.pi / 180, "it fell to the left, past 12 degrees"


def test_tick_matches_gymnasium():
    import gymnasium as gym
    from physics import tick
    env = gym.make("CartPole-v1")
    env.reset(seed=3)
    rng = np.random.default_rng(0)
    for _ in range(200):
        state = tuple(float(v) for v in env.unwrapped.state)
        action = int(rng.integers(2))
        _, _, terminated, truncated, _ = env.step(action)
        assert tick(state, action) == approx(tuple(env.unwrapped.state), abs=1e-12)
        if terminated or truncated:
            env.reset()


def test_tick_moves_by_velocity_times_time():
    from physics import TAU, tick
    x, _, theta, _ = tick((1.0, 2.0, 0.0, 0.5), 1)
    assert x == approx(1.0 + TAU * 2.0)
    assert theta == approx(0.0 + TAU * 0.5)


def test_pixels_put_the_centre_of_the_track_mid_window():
    from cartpole_view import WIDTH, to_pixels
    assert to_pixels(0.0) == WIDTH // 2
    assert to_pixels(2.4) == 560 and to_pixels(-2.4) == 80


def test_tip_of_an_upright_pole_is_straight_above():
    from cartpole_view import pole_tip
    assert pole_tip((100, 200), 0.0) == approx((100, 100))


def test_tip_of_a_flat_pole_is_to_the_side():
    from cartpole_view import pole_tip
    assert pole_tip((100, 200), math.pi / 2) == approx((200, 200))
    assert pole_tip((100, 200), -math.pi / 2) == approx((0, 200))


def test_tip_leans_the_way_the_angle_says():
    from cartpole_view import pole_tip
    x, y = pole_tip((100, 200), 0.2, length=50)
    assert x == approx(100 + 50 * math.sin(0.2)) and y == approx(200 - 50 * math.cos(0.2))


def test_view_keys_push_and_nothing_alternates():
    from cartpole_view import key_action
    assert key_action({pygame.K_LEFT: True, pygame.K_RIGHT: False}, 1) == 0
    assert key_action({pygame.K_LEFT: False, pygame.K_RIGHT: True}, 0) == 1
    assert key_action({pygame.K_LEFT: False, pygame.K_RIGHT: False}, 0) == 1
    assert key_action({pygame.K_LEFT: False, pygame.K_RIGHT: False}, 1) == 0


def test_view_window_opens_and_closes():
    from cartpole_view import run
    assert run(max_frames=2) == 2
```

`test_tick_matches_gymnasium` is the unusual one. It reaches inside Gymnasium's CartPole (`env.unwrapped.state` is the environment's own copy of the four numbers), and for 200 steps checks that **your** physics, given the same state and action, produces the same next state to within 10⁻¹² (`abs=1e-12`): a millionth of a millionth. That's how you'll know you've understood CartPole completely: you can compute it yourself.

```check
file tests/test_cartpole.py -- Click "Create provided tests/test_cartpole.py" above.
```

## Meet CartPole

Create `meet_cartpole.py`:

```python file=meet_cartpole.py
import gymnasium as gym


def first_steps(actions, seed=0):
    env = gym.make("CartPole-v1")
    obs, _ = env.reset(seed=seed)
    rows = [(obs, 0.0, False, False)]
    for action in actions:
        obs, reward, terminated, truncated, _ = env.step(action)
        rows.append((obs, reward, terminated, truncated))
        if terminated or truncated:
            break
    return rows


if __name__ == "__main__":
    print("step  position  velocity     angle      spin  reward  terminated")
    for step, (obs, reward, terminated, truncated) in enumerate(first_steps([1] * 20)):
        x, x_dot, theta, theta_dot = obs
        print(f"{step:4}  {x:+8.3f}  {x_dot:+8.3f}  {theta:+8.3f}  {theta_dot:+8.3f}  {reward:6.1f}  {terminated}")
```

- **`gym.make("CartPole-v1")`** builds the environment from its registered name; `v1` is the version with the 500-step limit. It has exactly the interface your corridor has: `reset(seed=...)` returns `(obs, info)` and `step(action)` returns five values. Action **0 pushes left**, **1 pushes right**.
- **`reset(seed=seed)`** starts the pole almost, but not quite, upright: each of the four numbers is drawn at random between −0.05 and 0.05, and the seed makes the draw repeatable.
- **`obs`** (the *observation*) is a NumPy array of four numbers instead of a cell number. `x, x_dot, theta, theta_dot = obs` unpacks them into four names.
- In the f-string, `{x:+8.3f}` always shows the sign (`+`), with 3 decimals, 8 characters wide.

Press **Run**. It pushes right every step:

```text
step  position  velocity     angle      spin  reward  terminated
   0    +0.014    -0.023    -0.046    -0.048     0.0  False
   1    +0.013    +0.173    -0.047    -0.355     1.0  False
   2    +0.017    +0.368    -0.054    -0.662     1.0  False
   3    +0.024    +0.564    -0.067    -0.971     1.0  False
   4    +0.035    +0.760    -0.087    -1.284     1.0  False
   5    +0.051    +0.956    -0.112    -1.603     1.0  False
   6    +0.070    +1.153    -0.144    -1.928     1.0  False
   7    +0.093    +1.349    -0.183    -2.262     1.0  False
   8    +0.120    +1.545    -0.228    -2.605     1.0  True
```

The four numbers, which together are CartPole's **state**:

| name | meaning | unit | ends the episode when |
|---|---|---|---|
| position `x` | where the cart is; 0 is the middle of the track, positive is right | metres | beyond ±2.4 |
| velocity `ẋ` | how fast the cart moves, positive is rightwards | metres per second | never |
| angle `θ` | the pole's tilt; 0 is upright, positive leans right | radians | beyond ±0.2095 (12°) |
| spin `θ̇` | how fast the angle changes, positive is tipping rightwards | radians per second | never |

A **radian** is the unit `math.sin` and `math.cos` use: a full circle is 2π radians, so 12° is 12 × π / 180 = 0.2095 radians. The dot over a letter is the physicist's shorthand for "how fast this changes".

Every step pays **1.0**, including the one where it falls, because "steps survived" is what's being counted. So an episode's total reward is simply its length.

```predict
question: The cart is pushed RIGHT every step. Which way does the pole fall?
choice: Right, the way it's pushed
choice: Left, away from the push
answer: Left, away from the push
explain: The angle goes −0.046, −0.054, −0.087… down to −0.228 (past −0.2095, so it fell) in 8 steps, and negative is left. Pushing the cart right moves the **bottom** of the pole right, out from under it, while the top, which has inertia, stays where it was. So the pole tips the other way, like a broom balanced on your hand when you move your hand too fast. To make a leaning pole stand up, you must move the cart **under** it: push towards the lean. Lesson 2.2 turns that sentence into a policy.
verify: .venv/Scripts/python -c "from meet_cartpole import first_steps; print('Left, away from the push' if first_steps([1] * 20)[-1][0][2] < -0.2 else 'no')"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py -k meet" label="first_steps plays CartPole and returns each step's observation and reward" -- Start rows with (obs, 0.0, False, False) from reset, append one row per step, and stop after the step that ends the episode.
```

## One tick of physics

How does `step` turn one state into the next? It's about fifteen lines of code inside Gymnasium. Write them yourself in `physics.py`:

```python file=physics.py
import math

GRAVITY = 9.8
MASS_CART = 1.0
MASS_POLE = 0.1
TOTAL_MASS = MASS_CART + MASS_POLE
HALF_LENGTH = 0.5
POLE_MOMENT = MASS_POLE * HALF_LENGTH
FORCE = 10.0
TAU = 0.02


def tick(state, action):
    x, x_dot, theta, theta_dot = state
    force = FORCE if action == 1 else -FORCE
    cos = math.cos(theta)
    sin = math.sin(theta)
    temp = (force + POLE_MOMENT * theta_dot ** 2 * sin) / TOTAL_MASS
    theta_acc = (GRAVITY * sin - cos * temp) / (HALF_LENGTH * (4 / 3 - MASS_POLE * cos ** 2 / TOTAL_MASS))
    x_acc = temp - POLE_MOMENT * theta_acc * cos / TOTAL_MASS
    return (x + TAU * x_dot, x_dot + TAU * x_acc, theta + TAU * theta_dot, theta_dot + TAU * theta_acc)
```

It works in two stages.

**Stage 1: how fast are things speeding up right now?** The three middle lines compute the cart's **acceleration** `x_acc` and the pole's angular acceleration `theta_acc` from Newton's laws for a pole hinged on a cart. (They come from Barto, Sutton and Anderson's 1983 paper, which introduced this problem. You don't need to derive them; you do need to see what each part does.) Traced for the first step above, starting from the `reset(seed=0)` state and pushing right:

- `force` is +10 newtons (right).
- `temp` is the push shared across the total mass of 1.1 kg, plus a tiny outward pull from the pole's spin: (10 + 0.05 × 0.048² × −0.046) / 1.1 = **9.091**.
- `theta_acc`'s top line has two parts. `GRAVITY * sin` = 9.8 × sin(−0.046) = **−0.450**: gravity pulls a leaning pole further the way it already leans (here, left, so negative). `- cos * temp` = −0.999 × 9.091 = **−9.081**: accelerating the cart right tips the pole left, as you just saw. The bottom line, 0.621, is how hard the pole is to rotate (its inertia about the hinge). Together: (−0.450 − 9.081) / 0.621 = **−15.34** radians per second, per second.
- `x_acc` is the cart's acceleration from the push, slightly reduced by the pole swinging the other way: **9.787** metres per second, per second.

**Stage 2: move forward 0.02 seconds.** The return line is **Euler's method**, the simplest way to step a simulation through time: *new position = position + time × velocity*, and *new velocity = velocity + time × acceleration*, each assuming nothing changes during the 0.02 s. So the spin becomes −0.048 + 0.02 × −15.34 = **−0.355**, which is exactly the spin printed in step 1 above. The position uses the **old** velocity: 0.0137 + 0.02 × −0.023 = 0.013, which is why the cart moved slightly left in step 1 despite being pushed right: the push changes the velocity first, and the position only follows on the next tick.

Notice something in stage 1: `GRAVITY * sin` grows as the pole leans. The further it leans, the faster it falls. An upright pole is **unstable**: left alone, any tiny lean grows. That's why CartPole needs constant correction, every 0.02 seconds.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py -k tick" label="your tick matches Gymnasium's CartPole to 12 decimal places" -- Copy each formula exactly: the order of operations matters at 12 decimal places. The position and angle use the OLD velocities; the velocities add TAU times the accelerations.
```

## From metres to pixels

The physics works in metres; the window works in pixels. Start `cartpole_view.py` with the conversion:

```python file=cartpole_view.py
WIDTH, HEIGHT = 640, 320
SCALE = 100
TRACK_Y = 240
POLE_PIXELS = 100


def to_pixels(x):
    return int(WIDTH / 2 + x * SCALE)
```

- `SCALE = 100` pixels per metre. The track runs from −2.4 m to +2.4 m, 4.8 m in all, so it's 480 pixels wide, which fits in the 640-pixel window with 80 pixels to spare on each side.
- `WIDTH / 2` puts 0 metres, the middle of the track, in the middle of the window. So `to_pixels(-2.4)` is 320 − 240 = **80** and `to_pixels(2.4)` is 320 + 240 = **560**.
- `int(...)` because pixel positions are whole numbers.
- `TRACK_Y = 240`: the track is drawn 240 pixels **down** from the top, since screen y grows downwards (lesson 0.2).
- `POLE_PIXELS = 100`: the pole is 1 m long (twice `HALF_LENGTH`), so 100 pixels.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py -k pixels" label="to_pixels maps the track's ends to x = 80 and x = 560"
```

## Your turn: the tip of the pole

**Build, on your own:** `pole_tip(base, theta, length=POLE_PIXELS)` in `cartpole_view.py`.

To draw the pole as a line, you need both ends: the **base**, where it's hinged on top of the cart, and the **tip**. Given the base as an `(x, y)` pixel position and the angle `theta` (0 upright, positive leaning right), return the tip's `(x, y)`.

Draw it on paper first. A pole of length `L` leaning by angle θ:

```text
              tip
              /|
           L / | L·cos θ   (how far up)
            /θ |
      base ---- 
          L·sin θ          (how far across)
```

- Across: `L · sin θ` to the **right** when θ is positive. sin 0 = 0, so an upright pole's tip is straight above its base.
- Up: `L · cos θ`. cos 0 = 1, so an upright pole reaches its full length up.

But on the screen, **up means a smaller y** (lesson 0.2). Check yourself against the tests: base (100, 200), upright, length 100 → tip (100, 100). Lying flat to the right (θ = π/2) → (200, 200).

```hints
nudge: Which of the two coordinates must you subtract from, because screen y grows downwards?
concept: Tip x = base x + length × sin(theta). Tip y = base y − length × cos(theta), minus because "up" is towards y = 0. You need `import math` at the top of the file for math.sin and math.cos.
answer: Add `import math` as the first line of `cartpole_view.py`, and:
~~~python
def pole_tip(base, theta, length=POLE_PIXELS):
    bx, by = base
    return (bx + length * math.sin(theta), by - length * math.cos(theta))
~~~
`bx, by = base` unpacks the pair, as `x, x_dot, theta, theta_dot = obs` unpacks four.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py -k tip" label="pole_tip finds the end of a pole of any angle, with screen y pointing down" -- tip = (bx + length * math.sin(theta), by - length * math.cos(theta)).
```

## Balance it yourself

Now the whole viewer, with keyboard control:

```python file=cartpole_view.py
import math

import gymnasium as gym
import pygame

WIDTH, HEIGHT = 640, 320
SCALE = 100
TRACK_Y = 240
POLE_PIXELS = 100
CART_WIDTH, CART_HEIGHT = 60, 30
BACKGROUND = (24, 26, 33)
TRACK = (100, 116, 139)
CART = (94, 234, 212)
POLE = (250, 204, 21)
TEXT = (226, 232, 240)
NAMES = ("cart position", "cart velocity", "pole angle", "pole spin")


def to_pixels(x):
    return int(WIDTH / 2 + x * SCALE)


def pole_tip(base, theta, length=POLE_PIXELS):
    bx, by = base
    return (bx + length * math.sin(theta), by - length * math.cos(theta))


def key_action(pressed, last):
    if pressed[pygame.K_LEFT]:
        return 0
    if pressed[pygame.K_RIGHT]:
        return 1
    return 1 - last


def draw(screen, font, obs, steps, message):
    screen.fill(BACKGROUND)
    pygame.draw.line(screen, TRACK, (to_pixels(-2.4), TRACK_Y), (to_pixels(2.4), TRACK_Y), 2)
    for edge in (-2.4, 2.4):
        pygame.draw.line(screen, TRACK, (to_pixels(edge), TRACK_Y - 10), (to_pixels(edge), TRACK_Y + 10), 2)
    cart = pygame.Rect(0, 0, CART_WIDTH, CART_HEIGHT)
    cart.center = (to_pixels(obs[0]), TRACK_Y)
    pygame.draw.rect(screen, CART, cart)
    base = (cart.centerx, cart.top)
    pygame.draw.line(screen, POLE, base, pole_tip(base, obs[2]), 6)
    for i, (name, value) in enumerate(zip(NAMES, obs)):
        screen.blit(font.render(f"{name}: {value:+.3f}", True, TEXT), (16, 12 + i * 22))
    screen.blit(font.render(f"steps {steps}", True, TEXT), (WIDTH - 120, 12))
    screen.blit(font.render(message, True, TEXT), (16, HEIGHT - 32))


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("CartPole")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    env = gym.make("CartPole-v1")
    obs, _ = env.reset(seed=0)
    steps = 0
    action = 0
    done = False
    slow = False
    message = "Hold left or right to push. S: slow motion."
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_s:
                slow = not slow
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE and done:
                obs, _ = env.reset()
                steps = 0
                done = False
                message = "Hold left or right to push. S: slow motion."
        if not done:
            action = key_action(pygame.key.get_pressed(), action)
            obs, reward, terminated, truncated, _ = env.step(action)
            steps += 1
            if terminated or truncated:
                done = True
                message = f"{'Balanced to the limit' if truncated else 'Fell'} after {steps} steps. Space starts again."
        draw(screen, font, obs, steps, message)
        pygame.display.flip()
        clock.tick(10 if slow else 50)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

What's new compared with the corridor's game:

- **One environment step per frame, at 50 frames a second.** Each CartPole step is 0.02 seconds of simulated time, and 50 × 0.02 = 1 second, so the pole falls at its real speed. **S** switches to 10 frames a second: slow motion, five times slower.
- **Holding a key, not pressing it.** The corridor moved once per key *press* (a `KEYDOWN` event). Here you push for as long as you *hold* the key, so the code asks every frame which keys are down right now: `pygame.key.get_pressed()` returns something you can index by key, `True` for each key being held.
- **There's no "do nothing" action.** CartPole's only actions are push left and push right: every 0.02 s, one of them happens. When you hold neither key, `key_action` returns `1 - last`, the opposite of the previous push (1 − 0 = 1, 1 − 1 = 0), so the pushes alternate and roughly cancel out.
- **`cart.center = (...)`**: a `Rect` can be positioned by its centre instead of its corner, and `cart.top` and `cart.centerx` then give the top edge and the middle, which is where the pole's base goes.
- **The ending message** distinguishes **terminated** ("Fell") from **truncated** ("Balanced to the limit", at 500 steps). That's the same distinction as the corridor's time limit: at 500 steps the pole hasn't failed, the episode has just been stopped.

Press **Run** and try. Then press **S** and try in slow motion.

```predict
question: Without slow motion, how many steps do you think you'll last, on your best try out of five?
explain: There's no right answer: it was your own estimate, and the point is to compare it with what happened. At full speed the pole gives you very little time: pushed the wrong way it fell in 8 steps, 0.16 seconds, in the first step of this lesson. In slow motion you have five times as long to see the lean and push under it. For comparison, pressing nothing at all (alternating pushes) lasts 20 steps from this start. The next lesson measures a few simple rules over 100 episodes each, and one of them lasts nearly 500.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py -k view" label="key_action pushes with the held key and alternates otherwise; the window opens and closes" -- key_action: K_LEFT held → 0, K_RIGHT held → 1, neither → 1 - last.
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py" label="all lesson 2.1 tests pass"
```

### What you have

CartPole as a fully understood environment: its four numbers and their limits, its physics (yours matches Gymnasium's exactly), and a window to play it in. Next lesson measures how long simple rules last, which tells you what "good" looks like before an agent tries.
