# CartPole and Q-learning

A pole is hinged on top of a cart. Every tick (0.02 s) you choose one of two actions: push the cart left or push it right. If the pole tilts past 12 degrees, or the cart leaves the track (more than 2.4 m from the centre), you fail. You earn +1 reward for every tick you survive, and 500 ticks counts as a win. The goal is to learn *which push to choose in which situation*, from nothing but that reward.

This lesson builds CartPole from its physics, draws it so you can see what's happening, solves it once by hand with a rule, and then teaches a Q-table to do it by itself. It finishes with experiments that change one setting at a time, and with an honest look at how much of reinforcement learning is luck.

How to use it: run the cells in order, because later cells use names defined in earlier ones. Before each cell, predict what it will print. Cells that use randomness start with `random.seed(...)`, so in this notebook you'll see exactly the numbers the explanations describe. (In Python on your own computer some later numbers come out differently, and the section *Why desktop numbers differ* explains why that's expected.) The cell numbers match the CartPole notebook from your CS 370 work, so you can compare the two side by side.

## Cells 1 and 2: imports, and the constants of the world

`math` provides `sin`, `cos` and `pi`, which the physics needs. `random` provides random numbers: the starting wobble, random exploring, and tie-breaking. `numpy` (nicknamed `np`) provides arrays, which will hold the Q-table.

```python
import math
import random
import numpy as np

GRAVITY = 9.8
MASS_CART = 1.0
MASS_POLE = 0.1
TOTAL_MASS = MASS_CART + MASS_POLE
HALF_POLE = 0.5
POLE_MASS_LEN = MASS_POLE * HALF_POLE
FORCE = 10.0
TAU = 0.02
X_LIMIT = 2.4
THETA_LIMIT = 12 * math.pi / 180
MAX_STEPS = 500

print(TOTAL_MASS)
print(POLE_MASS_LEN)
print(THETA_LIMIT)
```

Each line creates a name holding one number that never changes (capital letters are the convention for that). `GRAVITY` is 9.8 metres per second squared, the acceleration pulling the pole down. The cart weighs 1.0 kg and the pole 0.1 kg. `TOTAL_MASS` adds them (1.1), because when you push the cart you also move the pole. `HALF_POLE` is 0.5 m: physics uses the distance from the hinge to the pole's centre of mass, which is half the pole's length. `POLE_MASS_LEN` multiplies pole mass by that distance (0.1 x 0.5 = 0.05), a combination that shows up in several equations later, so it is computed once. `FORCE` is the size of each push in newtons. `TAU` is how much time passes per tick, 0.02 seconds, so there are 50 ticks per simulated second. `X_LIMIT` is the track edge. `THETA_LIMIT` converts 12 degrees to **radians**, the angle unit `math.sin` and `math.cos` expect. A full circle is 360 degrees or 2π radians, so multiply by π/180. The printed 0.2094 is 12 degrees in radians. `MAX_STEPS` is the 500-tick win condition.

## Cell 3: the state

```python
state = [0.0, 0.0, 0.05, 0.0]
x, x_dot, theta, theta_dot = state
print("position  ", x)
print("velocity  ", x_dot)
print("angle     ", theta)
print("ang. speed", theta_dot)
```

The **state** is everything you need to know to predict what happens next. For CartPole it is exactly four numbers in a list. `x` is where the cart is (0 is the centre, positive is right). `x_dot` is how fast the cart is moving (the dot means "rate of change", so it is the rate of change of `x`). `theta` is the pole's angle in radians (0 is straight up, positive is leaning right). `theta_dot` is how fast the angle is changing, the pole's spin. The second line is *unpacking*: it takes the four list entries in order and puts them into four separate names. This state is a cart at rest in the centre with the pole leaning slightly right (0.05 rad is about 3 degrees).

Compare this with the maze in the previous lesson, where a state was one of 25 cells. Here a state is a point in four-dimensional space, and the numbers are *continuous* (any decimal is possible). That difference is what makes this problem harder, and Cell 11 deals with it.

## Cell 4: starting a new episode

```python
def reset():
    return [random.uniform(-0.05, 0.05) for _ in range(4)]

random.seed(1)
print(reset())
print(reset())
```

`def reset():` defines a function that needs no input. `random.uniform(-0.05, 0.05)` gives a random decimal anywhere between those two bounds with equal chance. The `[... for _ in range(4)]` part is a list comprehension: it repeats the expression four times and collects the results in a list (the `_` is a throwaway loop variable, since we do not need the counter). So `reset()` returns a list of four small random numbers: a nearly balanced pole and a nearly still cart. An **episode** is one attempt from `reset()` until failure or 500 ticks. `random.seed(1)` fixes the random sequence so everyone gets the same two states. Each call gives a different state, because the random generator advances.

## Cell 5: the physics, one piece at a time

This is the heart of the environment. We do it once by hand before wrapping it in a function.

```python
state = [0.0, 0.0, 0.05, 0.0]
action = 1

x, x_dot, theta, theta_dot = state
force = FORCE if action == 1 else -FORCE
sin_t = math.sin(theta)
cos_t = math.cos(theta)
print("force", force)
print("sin, cos", sin_t, cos_t)

temp = (force + POLE_MASS_LEN * theta_dot ** 2 * sin_t) / TOTAL_MASS
print("temp", temp)

theta_acc = (GRAVITY * sin_t - cos_t * temp) / (
    HALF_POLE * (4.0 / 3.0 - MASS_POLE * cos_t ** 2 / TOTAL_MASS))
print("theta_acc", theta_acc)

x_acc = temp - POLE_MASS_LEN * theta_acc * cos_t / TOTAL_MASS
print("x_acc", x_acc)

new_state = [x + TAU * x_dot,
             x_dot + TAU * x_acc,
             theta + TAU * theta_dot,
             theta_dot + TAU * theta_acc]
print(new_state)
```

Line by line:

`action = 1` means push right (0 means push left). Those are the only two actions, so the Q-table will have two columns.

`force = FORCE if action == 1 else -FORCE` is a one-line if/else. If the action is 1 the force is +10, otherwise -10. The sign is the direction.

`sin_t` and `cos_t` are the sine and cosine of the pole angle. They appear because gravity pulls straight down but the pole can only rotate, so only the sideways part of gravity matters, and that part is `sin(theta)`. For small angles `sin(theta)` is nearly `theta` itself (0.04998 vs 0.05), and `cos(theta)` is nearly 1.

`temp` is an intermediate quantity: the cart's acceleration if the pole were not pushing back. It is the push `force`, plus a term for the pole's spin flinging weight outward (`POLE_MASS_LEN * theta_dot**2 * sin_t`, zero here because `theta_dot` is 0), divided by `TOTAL_MASS`. This is Newton's F = m a rearranged to a = F / m. Pushing with 10 N on 1.1 kg gives 9.09 m/s².

`theta_acc` is the pole's **angular acceleration** (how quickly its spin changes). The top, `GRAVITY * sin_t - cos_t * temp`, is the competition between two effects: gravity tipping the pole over (positive, pulls toward leaning right) and the cart accelerating underneath it (pushing right makes the pole lag behind and lean left). The bottom is the pole's effective inertia (how hard it is to start rotating). The result is -13.8: negative, so pushing right makes the pole start tipping *left*, the opposite of what intuition about the cart might suggest. This is exactly why balancing is tricky.

`x_acc` is the cart's real acceleration: `temp` corrected for the pole's reaction on the cart. Here `theta_acc` is negative (the pole is tipping left), so the subtracted term is negative and the correction *adds* to the cart's acceleration: 9.09 + 0.63 = 9.72 m/s².

The last block is **Euler integration**, and it is the one idea you need for all simulation: *new value = old value + (time step) x (rate of change)*. If a car is at 100 m going 20 m/s, then after 0.02 s it is at 100 + 0.02 x 20 = 100.4 m. Position changes by velocity, velocity changes by acceleration, angle changes by spin, and spin changes by angular acceleration. Four lines, one per state number. Position stays 0.0 because velocity was 0. Velocity became 0.02 x 9.72 = 0.194. Angle stayed 0.05 because spin was 0. Spin became 0.02 x -13.82 = -0.276. The state after one tick is therefore a cart starting to roll right while the pole starts to rotate left.

## Cell 6: wrap it in a function and test both actions

```python
def step(state, action):
    x, x_dot, theta, theta_dot = state
    force = FORCE if action == 1 else -FORCE
    sin_t = math.sin(theta)
    cos_t = math.cos(theta)
    temp = (force + POLE_MASS_LEN * theta_dot ** 2 * sin_t) / TOTAL_MASS
    theta_acc = (GRAVITY * sin_t - cos_t * temp) / (
        HALF_POLE * (4.0 / 3.0 - MASS_POLE * cos_t ** 2 / TOTAL_MASS))
    x_acc = temp - POLE_MASS_LEN * theta_acc * cos_t / TOTAL_MASS
    return [x + TAU * x_dot,
            x_dot + TAU * x_acc,
            theta + TAU * theta_dot,
            theta_dot + TAU * theta_acc]

start = [0.0, 0.0, 0.0, 0.0]
print("push left :", step(start, 0))
print("push right:", step(start, 1))
```

The function is Cell 5 with the printing removed. It takes a state and an action and returns the next state. This is the **environment's transition function**, the same job `step` did in the maze. Starting perfectly upright and still, push left: the cart picks up velocity -0.195 (moving left) and the pole picks up spin +0.293 (starting to lean right). Push right and everything flips sign. The mirror-image results are a good sanity check: the physics is symmetric. And notice the pole always tips *opposite* to the push. To catch a pole that is falling right, you must push right so the cart goes under it. That is the strategy a good policy must discover.

## Cell 7: watching the pole fall

Predict: if you push left ten times in a row from perfectly upright, which way does the pole lean, and does it lean at a steady rate?

```python
state = [0.0, 0.0, 0.0, 0.0]
for tick in range(1, 11):
    state = step(state, 0)
    print(tick, "x =", round(state[0], 4), " theta =", round(state[2], 4))
```

Pushing left ten times in a row, feeding each new state into the next `step`. `range(1, 11)` counts 1 through 10. `round(value, 4)` trims to four decimals. At tick 1 nothing seems to have moved, because position and angle only change by velocity and spin, which started at 0 (they change from tick 2). The angle growth is not steady: 0.0059, 0.0176, 0.0352, 0.0587... the increases get bigger every tick. A leaning pole falls faster the further it leans. At tick 9 the angle is 0.2152, past the limit 0.2094, so a real episode would have ended there. A pole left alone falls in under a fifth of a second of simulated time, so the controller must react constantly.

## Cell 7b: seeing it

Numbers are hard to picture. This cell draws the cart and pole from a state: the grey line is the track, the blue box the cart, the orange line the pole. It then draws the ten pushes from Cell 7 as a strip of frames, like a comic.

```python
import matplotlib.pyplot as plt

POLE_LEN = 2 * HALF_POLE

def draw(ax, state, title=""):
    x, _, theta, _ = state
    ax.plot([-X_LIMIT, X_LIMIT], [0, 0], color="gray", linewidth=1)
    ax.plot([-X_LIMIT, -X_LIMIT], [0, 0.15], color="red", linewidth=2)
    ax.plot([X_LIMIT, X_LIMIT], [0, 0.15], color="red", linewidth=2)
    ax.add_patch(plt.Rectangle((x - 0.25, 0), 0.5, 0.2, color="tab:blue"))
    hinge_y = 0.2
    tip_x = x + POLE_LEN * math.sin(theta)
    tip_y = hinge_y + POLE_LEN * math.cos(theta)
    ax.plot([x, tip_x], [hinge_y, tip_y], color="tab:orange", linewidth=4)
    ax.set_xlim(-X_LIMIT - 0.2, X_LIMIT + 0.2)
    ax.set_ylim(-0.1, 1.3)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(title, fontsize=8)

def filmstrip(states, ticks):
    fig, axes = plt.subplots(len(ticks), 1, figsize=(6, 1.3 * len(ticks)))
    for ax, t in zip(axes, ticks):
        draw(ax, states[t], f"tick {t}: {math.degrees(states[t][2]):.1f} deg")
    plt.show()

state = [0.0, 0.0, 0.0, 0.0]
states = [state]
for tick in range(10):
    state = step(state, 0)
    states.append(state)
filmstrip(states, [0, 2, 4, 6, 8, 10])
```

How the drawing works: the pole is a line from the **hinge** (the top-centre of the cart, at height 0.2) to the **tip**. The angle `theta` is measured from straight up, so the tip is `POLE_LEN * sin(theta)` to the side and `POLE_LEN * cos(theta)` above the hinge: at `theta = 0`, sin is 0 and cos is 1, so the pole points straight up. The two short red marks are the track's ends, at ±2.4 m. `plt.subplots(n, 1)` stacks `n` plots one above the other, and `zip(axes, ticks)` pairs each plot with the tick it shows. `set_aspect("equal")` makes a metre the same length across and up, so the angle you see is the real angle.

Now you can see the strange physics from Cell 6: the pole tips *right*, faster and faster, while the cart creeps left (only 0.18 m in ten ticks, so it barely seems to move). By tick 10 the pole is past 15 degrees, well beyond the 12-degree limit.

## Cell 8: when does the episode end?

```python
def is_done(state):
    return abs(state[0]) > X_LIMIT or abs(state[2]) > THETA_LIMIT

print(is_done([0.0, 0.0, 0.0, 0.0]))
print(is_done([0.0, 0.0, 0.25, 0.0]))
print(is_done([2.5, 0.0, 0.0, 0.0]))
```

`state[0]` is `x` and `state[2]` is `theta` (lists count from 0). `abs` removes the sign, so the limit applies to both sides. The function returns True if the cart is past the track edge *or* the pole is past 12 degrees. The three tests: upright centre is fine (False), angle 0.25 rad is past the limit (True), and x = 2.5 is off the track (True). The 500-tick win is handled separately by `MAX_STEPS`.

## Cell 9: a full episode with a random policy

```python
def run_episode(policy):
    state = reset()
    steps = 0
    while not is_done(state) and steps < MAX_STEPS:
        action = policy(state)
        state = step(state, action)
        steps += 1
    return steps

def random_policy(state):
    return random.randrange(2)

random.seed(0)
scores = [run_episode(random_policy) for _ in range(10)]
print(scores)
print(sum(scores) / len(scores))
```

A **policy** is any function that takes a state and returns an action. This is the key vocabulary word of reinforcement learning. `run_episode` takes a policy as an input (functions can be passed around like any value). It starts from `reset()`, then repeats: ask the policy for an action, apply `step`, count one more tick. The `while` condition says keep going as long as we have not failed *and* have not reached 500. It returns the tick count. Since reward is +1 per tick, **the number of ticks is the total reward**, and that is our score. `random.randrange(2)` returns 0 or 1 with equal chance: a policy that ignores the state completely. Ten random episodes survive about 30 ticks on average (0.6 seconds). That is our baseline. Learning has succeeded if we beat it.

## Cell 10: a hand-written policy to compare

```python
def rule_policy(state):
    return 1 if state[3] > 0 else 0

random.seed(0)
scores = [run_episode(rule_policy) for _ in range(10)]
print(scores)
print(sum(scores) / len(scores))
```

`state[3]` is `theta_dot`, the pole's spin. The rule: if the pole is rotating rightward, push right; otherwise push left. That moves the cart under the falling pole. This single if-statement beats random by 7x (about 220 vs 30). It is not perfect since it ignores the angle and the cart's position, so it eventually drifts off the track or lets the pole lean too far. (The third challenge asks you to write a better rule.)

Why this matters: a human wrote that rule using physics insight. **Reinforcement learning is about getting the agent to find a rule like this by itself**, from nothing but the reward signal. The Q-table will be the memory in which it stores what it learns.

## Cell 11: the problem with a table, and the fix

A Q-table needs a row for every state. The maze had 25. Here the state is four *continuous* numbers, so there are infinitely many possible states, and a table cannot hold infinitely many rows. The fix is **discretization**: chop each number's range into a few buckets (bins) and say two states in the same buckets count as the same state.

```python
LOW  = np.array([-X_LIMIT, -3.0, -THETA_LIMIT, -3.5])
HIGH = np.array([ X_LIMIT,  3.0,  THETA_LIMIT,  3.5])
BINS = np.array([3, 3, 6, 6])

def discretize(state):
    ratio = (np.array(state) - LOW) / (HIGH - LOW)
    index = (ratio * BINS).astype(int)
    index = np.clip(index, 0, BINS - 1)
    return tuple(int(i) for i in index)

print(discretize([0.0, 0.0, 0.0, 0.0]))
print(discretize([-2.0, 0.0, 0.0, 0.0]))
print(discretize([0.0, 0.0, 0.1, -1.0]))
print(discretize([0.0, 0.0, 5.0, 0.0]))
```

`LOW` and `HIGH` are the smallest and largest value we care about for each of the four numbers, in order (position, velocity, angle, spin). Position and angle use the failure limits. For velocity and spin, ±3.0 and ±3.5 cover almost everything that happens before failure. `BINS` says how many buckets each number gets: 3 for position, 3 for velocity, 6 for angle, 6 for spin. More buckets on angle and spin because they matter most for balancing. Total distinct states: 3 x 3 x 6 x 6 = 324.

Inside `discretize`:

1. `np.array(state) - LOW` turns the list into an array and subtracts, element by element, each number's minimum. Now each number is measured from the bottom of its range.
2. Dividing by `HIGH - LOW` (the width of each range) produces `ratio`: 0.0 means the very bottom of the range, 1.0 the very top, 0.5 the middle.
3. `ratio * BINS` stretches that to the bucket scale. A ratio of 0.5 with 6 bins is 3.0, meaning "boundary of bucket 3".
4. `.astype(int)` chops off the decimals, so 4.43 becomes bucket 4.
5. `np.clip(index, 0, BINS - 1)` forces each bucket number to stay between 0 and (bins minus 1). Without this, a value at or past the top, or outside the range, would give a bucket number that does not exist.
6. The last line turns the array into a tuple of plain Python integers, which can be used as an address into the table.

Reading the tests: a perfectly still, upright, centred cart lands in the middle buckets `(1, 1, 3, 3)`. Position -2.0 is in the left bucket 0. Angle 0.1 and spin -1.0 land in buckets 4 and 2. Angle 5.0 is far out of range, but `clip` puts it in the last bucket, 5, instead of crashing.

## Cell 12: seeing the arithmetic inside discretize

```python
ratio = (np.array([0.0, 0.0, 0.1, -1.0]) - LOW) / (HIGH - LOW)
print(ratio)
print(ratio * BINS)
print((ratio * BINS).astype(int))
```

The same steps, printed. Check the third number by hand. Angle is 0.1, `LOW` is -0.2094 and `HIGH` is +0.2094. So (0.1 - (-0.2094)) / (0.2094 - (-0.2094)) = 0.3094 / 0.4189 = 0.7387, matching the output. Times 6 bins is 4.43, and cutting off the decimals gives bucket 4. Position 0.0 sits at ratio 0.5, the exact middle, times 3 gives 1.5, which becomes bucket 1 (the middle of three buckets 0, 1, 2).

## Cell 13: the Q-table itself

```python
Q = np.zeros(tuple(BINS) + (2,))
print(Q.shape)
print(Q.size)

s = discretize([0.0, 0.0, 0.1, -1.0])
print(Q[s])
Q[s + (1,)] = 5.0
print(Q[s])
print(Q[s].max(), Q[s].argmax())
```

`tuple(BINS)` is `(3, 3, 6, 6)`, and `+ (2,)` appends one more dimension of size 2 (one slot per action). `np.zeros` builds an array of that shape filled with 0.0. It is a 5-dimensional block: four dimensions pick the state, the last picks the action. It holds 3 x 3 x 6 x 6 x 2 = 648 numbers, the printed `Q.size`. In the maze the table was a flat 25 x 4 sheet. This is the same idea with four "row coordinates" instead of one row number.

`Q[s]` with `s = (1, 1, 4, 2)` selects four of the five coordinates and leaves the action coordinate open, so you get the 2-number row for that state: `[0. 0.]` (value of push-left, value of push-right). `s + (1,)` extends the state address with action 1, addressing a single box, and we set that box to 5.0. Now the row reads `[0. 5.]`. `.max()` is the best value in the row (5.0) and `.argmax()` is the *position* of the best value (1, push right). These are the same two operations as in the maze: max answers "how good is this situation?", argmax answers "which action is best?"

## Cell 14: choosing actions (exploration vs exploitation)

```python
def choose_action(Q, s, epsilon):
    if random.random() < epsilon:
        return random.randrange(2)
    row = Q[s]
    if row[0] == row[1]:
        return random.randrange(2)
    return int(np.argmax(row))

random.seed(0)
Q = np.zeros(tuple(BINS) + (2,))
s = (1, 1, 3, 3)
print([choose_action(Q, s, 0.0) for _ in range(10)])
Q[s + (1,)] = 5.0
print([choose_action(Q, s, 0.0) for _ in range(10)])
print([choose_action(Q, s, 0.5) for _ in range(10)])
```

This is **epsilon-greedy**. `random.random()` gives a decimal in [0, 1). If it is below `epsilon`, we ignore the table and act randomly, which is **exploring**: it lets the agent try actions it currently thinks are bad, in case it is wrong. Otherwise we **exploit** by taking the best-known action, `argmax` of the row. The tie check handles an untrained row `[0, 0]`: `argmax` would always return the first index, so the agent would always push left on untrained states, which is a hidden bias. Breaking ties randomly is fairer.

The three tests: with an all-zero table and epsilon 0 the choices are a random mix (a tie every time). After setting push-right to 5.0, epsilon 0 gives ten 1s (always exploit). With epsilon 0.5, about half the choices are random, so occasional 0s sneak in (two of ten here).

## Cell 15: one Q-learning update, by hand

```python
ALPHA = 0.2
GAMMA = 0.99

Q = np.zeros(tuple(BINS) + (2,))
s_next = (1, 1, 3, 3)
Q[s_next + (0,)] = 10.0
Q[s_next + (1,)] = 20.0

s = (1, 1, 3, 2)
a = 1
reward = 1

old = Q[s + (a,)]
best_next = Q[s_next].max()
target = reward + GAMMA * best_next
new = old + ALPHA * (target - old)
print(old, best_next, target, new)

Q[s + (a,)] = new
print(Q[s])
```

This is the entire learning algorithm, the same three lines as in the maze. We stage a situation: the state we will land in already has known values 10 and 20. We are in state `s`, took action 1, got reward 1 (one tick survived).

`old` is the current box value (0.0, we know nothing yet). `best_next` is the best number in the row of the state we landed in (20.0): "if I play well from there, I expect about 20 more". `target = reward + GAMMA * best_next` = 1 + 0.99 x 20 = 20.8: what this action *should* be worth, given what we just saw. **Gamma (the discount factor)** is how much future reward is worth compared to immediate reward. At 0.99 a reward one step ahead counts for 99% of its face value, and rewards far ahead fade slowly. `new = old + ALPHA * (target - old)` moves the old guess 20% of the way toward the target: 0 + 0.2 x (20.8 - 0) = 4.16. **Alpha (the learning rate)** is that fraction. Small alpha learns slowly but smoothly, large alpha learns fast but jumps around. Only one box changed: the row went from `[0, 0]` to `[0, 4.16]`.

## Cell 16: the training loop

```python
def train(episodes, alpha=0.2, gamma=0.99, eps_start=1.0, eps_min=0.01, eps_decay=0.999):
    Q = np.zeros(tuple(BINS) + (2,))
    epsilon = eps_start
    history = []
    for episode in range(episodes):
        state = reset()
        s = discretize(state)
        steps = 0
        while True:
            a = choose_action(Q, s, epsilon)
            state = step(state, a)
            steps += 1
            failed = is_done(state)
            s_next = discretize(state)

            reward = 1
            best_next = 0.0 if failed else Q[s_next].max()
            target = reward + gamma * best_next
            Q[s + (a,)] += alpha * (target - Q[s + (a,)])

            s = s_next
            if failed or steps >= MAX_STEPS:
                break
        epsilon = max(eps_min, epsilon * eps_decay)
        history.append(steps)
    return Q, history

random.seed(0)
Q, history = train(300)
print(history[:10])
print(sum(history[:100]) / 100, sum(history[200:300]) / 100)
```

The function's inputs have default values (`alpha=0.2`, etc.), so you can call `train(300)` and override any of them by name. Setup: a fresh all-zero table, `epsilon` starting at 1.0 (always explore at first, since the table knows nothing), and an empty list `history` to record how long each episode lasted.

Outer loop, once per episode: `reset()` gives a start state, and `discretize` turns it into the table address `s`. Inner loop, once per tick:

1. `choose_action` picks an action using the current `s` and `epsilon`.
2. `step` applies it. The environment gives the new continuous state.
3. `failed = is_done(state)` asks whether that ended the episode. `s_next` is the table address of the new state.
4. The reward is 1 for surviving. `best_next` is the best value in the next state's row, **except when we failed**: then it is 0, because after failure there is no future to count. This is the "terminal state" rule from the maze, and it is what makes failing *look worse* than surviving. A failing action's target is only 1, while a surviving action's target is 1 + 0.99 x (something positive). Over many repeats the table learns which situations lead to failure.
5. `+=` applies the update from Cell 15 in one line (`Q[x] += alpha * (target - Q[x])` means the same as `Q[x] = Q[x] + alpha * (target - Q[x])`).
6. `s = s_next` moves on. The loop breaks when we fail or hit 500 ticks.

After each episode, `epsilon * eps_decay` shrinks epsilon by 0.1% (multiplying by 0.999), and `max(eps_min, ...)` stops it going below 0.01. So the agent explores a lot early and mostly exploits later. `history.append(steps)` records the episode length.

The output: 300 episodes is too few to see much. Early episodes last 11 to 36 ticks (basically random), and the average over episodes 0 to 99 is 23.6, versus 26.2 for 200 to 299. Learning has barely begun, which is normal.

## Cell 17: the real training run

This cell runs 4000 episodes and takes 10 to 25 seconds. The notebook can't do anything else while it runs, so wait for the output.

```python
random.seed(0)
Q, history = train(4000)
for i in range(0, 4000, 500):
    print("episodes", i, "to", i + 499, ": average", round(sum(history[i:i+500]) / 500, 1))
print("table entries changed:", np.count_nonzero(Q), "of", Q.size)
```

`range(0, 4000, 500)` counts 0, 500, 1000, ... 3500 (the third number is the step size). `history[i:i+500]` is a slice: the 500 entries from position `i` up to but not including `i+500`. We average each block of 500 episodes. **This is the learning curve**: survival climbs from 29 ticks (random level) to 339, more than 11 times longer, using only reward feedback and a 648-number table. Nobody told it the physics or the rule from Cell 10.

Why does it take longer to run as it improves? Each tick is one call to `step`, `discretize` and the update, so the time is proportional to the total number of ticks, and later episodes last ten times longer than early ones.

`np.count_nonzero(Q)` counts how many boxes were ever updated: 373 of 648. The rest are state/action combinations never visited, such as being far off the track with the pole spinning wildly, which a decent policy avoids. These averages include random exploring moves (epsilon was still about 0.02 at the end), so they understate what the table knows.

## Cell 18: test the learned policy with no exploration

```python
def greedy_policy(state):
    return int(np.argmax(Q[discretize(state)]))

random.seed(5)
scores = [run_episode(greedy_policy) for _ in range(20)]
print(scores)
print(sum(scores) / len(scores))
```

The learned policy is just the table in use: discretize the current state, look up its row, take the best action (`argmax`, no randomness at all). It is a policy function like `random_policy` and `rule_policy`, so `run_episode` accepts it unchanged.

Twenty test episodes average about 100 ticks: more than three times the random baseline (30), but well *below* the hand-written rule (220), and well below the 339 the agent reached during the last block of training. That surprises most people. Two things explain it. First, a 324-bucket table is a coarse picture: every state in a bucket gets the same action, even when the right push differs inside the bucket. Second, the last training episodes and these test episodes start from different random states, and this table happens to cope worse with these. The experiments below show that the result of one training run is mostly luck, and how to measure fairly.

## Cell 18b: watching three policies

Here is what the three policies actually do over one episode each: the pole's angle and the cart's position at every tick, with the failure limits as dashed lines.

```python
def record_episode(policy):
    state = reset()
    states = [state]
    while not is_done(state) and len(states) <= MAX_STEPS:
        state = step(state, policy(state))
        states.append(state)
    return states

random.seed(5)
runs = {
    "random": record_episode(random_policy),
    "rule": record_episode(rule_policy),
    "learned": record_episode(greedy_policy),
}

fig, (top, bottom) = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
for name, states in runs.items():
    top.plot([math.degrees(s[2]) for s in states], label=f"{name} ({len(states) - 1} ticks)")
    bottom.plot([s[0] for s in states])
for limit in (-12, 12):
    top.axhline(limit, color="gray", linestyle="--", linewidth=1)
for limit in (-X_LIMIT, X_LIMIT):
    bottom.axhline(limit, color="gray", linestyle="--", linewidth=1)
top.set_ylabel("pole angle (deg)")
bottom.set_ylabel("cart position (m)")
bottom.set_xlabel("tick")
top.legend(fontsize=8)
plt.show()
```

`record_episode` is `run_episode` that keeps every state instead of only counting them. `plt.subplots(2, 1, sharex=True)` stacks two plots that share the tick axis, and `axhline` draws a horizontal line across a plot.

Read the picture, not just the tick counts. The random policy lets the pole fall within 13 ticks. The rule holds the angle steady, a few degrees left of upright; the learned table keeps it inside ±12 degrees too, but wobbles back and forth as it corrects. Neither falls. Now look at the bottom plot: in both, the cart **drifts** steadily toward one edge, and reaching the edge is what ends both episodes, at about 175 ticks. Neither the rule (which looks only at the spin) nor this table (with only 3 coarse position buckets) does anything about the drift. Now look at the learned episode as frames:

```python
learned = runs["learned"]
filmstrip(learned, [round(i * (len(learned) - 1) / 5) for i in range(6)])
```

Six frames spread evenly over the episode: `round(i * (len(learned) - 1) / 5)` for `i` from 0 to 5 gives the first tick, the last tick, and four evenly spaced in between. The pole stays within a few degrees of upright in every frame, while the cart slides right until it reaches the red mark at the end of the track.

## Cell 19: the learning curve

```python
window = 100
smooth = [sum(history[i:i+window]) / window for i in range(0, len(history) - window)]
plt.figure(figsize=(8, 3))
plt.plot(smooth)
plt.xlabel("episode")
plt.ylabel("average ticks survived")
plt.show()
```

For every starting position `i`, it averages the next 100 episodes and stores that, producing a smoothed line (raw episode lengths jump around too much to read). You should see a noisy line that rises from about 30 at the left to over 300 at the right.

## What you just built, in one paragraph

CartPole is a loop. The **state** (4 numbers) goes into a **policy**, which returns an **action** (0 or 1). The **environment** (`step`) uses physics to produce the next state, and gives a **reward** (+1 per tick). Q-learning improves the policy by keeping a table of how good each action is in each situation, and nudging one box per tick toward `reward + gamma * (best value of the next situation)`. Because CartPole's states are continuous, we first **discretized** them into buckets so the table has finitely many rows. Epsilon-greedy exploring early, then exploiting later, is what lets the table fill with useful numbers.

## Experiments: change one thing, predict, run, compare

You now have a working learner. Experiments are how you find out *why* it works, by breaking it on purpose. The rule: **change exactly one thing, and write your prediction down before you run the cell.**

There's a trap first. Cell 18 showed that one training run can be misleading. Here is how misleading: the same settings, trained with seeds 0, 1 and 2 and then tested greedily, score 265, 33 and 63. Same code, same settings; only the luck of the random starting states and exploring moves changed. Comparing two settings by one run each is like comparing two dice by rolling each once.

So the helper below trains **three times**, with seeds 0, 1 and 2, tests each table greedily on the same 30 episodes, and prints all three scores and their mean. To keep each cell to between 3 and 30 seconds, it trains for 2000 episodes rather than 4000. Trust a difference only when it's bigger than the spread between seeds.

```python
def experiment(label, bins=(3, 3, 6, 6), episodes=2000, seeds=(0, 1, 2), **settings):
    global BINS
    saved_bins = BINS
    BINS = np.array(bins)
    scores = []
    try:
        for seed in seeds:
            random.seed(seed)
            Q_local, hist = train(episodes, **settings)

            def policy(state):
                return int(np.argmax(Q_local[discretize(state)]))

            random.seed(99)
            test = [run_episode(policy) for _ in range(30)]
            scores.append(round(sum(test) / len(test)))
    finally:
        BINS = saved_bins
    print(f"{label:20s} greedy test per seed {scores}   mean {round(sum(scores) / len(scores))}")

experiment("baseline")
```

How the helper works. It takes a `label` (text to print) and settings with default values: the number of buckets for each state number, how many episodes to train, and which seeds to use. `**settings` is a catch-all: any *extra* named inputs you pass, such as `alpha=0.02` or `gamma=0.5`, are collected into a dictionary called `settings`, and `train(episodes, **settings)` unpacks that dictionary back into named inputs, so the helper passes them straight through to `train` without needing to know what they are.

`discretize` and `train` both read the global name `BINS`. To try a different bucket layout we must change that global, and `global BINS` is what permits a function to reassign a name that lives outside it. `saved_bins = BINS` remembers the original. The `try: ... finally:` block guarantees that the line under `finally` runs *even if something inside crashes*, so `BINS` is always restored and a failed experiment cannot silently corrupt the next one.

For each seed, `train` returns a brand-new table, named `Q_local` so it never overwrites the `Q` from Cell 17. `def policy(state)` defines a function *inside* the loop; it can see `Q_local` from around it. `random.seed(99)` gives every table the same 30-episode exam. In the f-string, `{label:20s}` pads the label to 20 characters, so the results of different experiments line up.

The baseline prints `[265, 33, 63]`, mean 120. Keep that spread in mind for every comparison below.

## Experiment A: exploration

Predict first: what happens if the agent *never* explores (`epsilon = 0`)? What if it keeps exploring 30% of the time forever? And what if epsilon shrinks twice as fast (`eps_decay=0.998`)?

```python
experiment("no exploring", eps_start=0.0, eps_min=0.0)
experiment("eps_min=0.3", eps_min=0.3)
experiment("eps_decay=0.998", eps_decay=0.998)
```

The results, which you'll see too: no exploring scores `[12, 14, 9]`; `eps_min=0.3` scores `[162, 139, 128]`; `eps_decay=0.998` scores `[291, 324, 107]`, mean 241. This cell takes about 50 seconds.

**No exploring** is worse than random (30), on every seed. Follow the code to see why. Every box starts at 0. In an unseen state both boxes tie, so the agent picks randomly. Whichever it picks, the update gives that box a *positive* number (the target is at least 1, because the reward is +1). The untried action's box is still 0. From then on, `argmax` always prefers the tried action, because 0.2 beats 0. So in each state the agent locks onto whichever action it happened to try first and repeats it forever, with no way to discover that the other was better. Random exploring is what lets a box that *looks* good be challenged. It is not optional.

**Exploring 30% forever** scores about the same as the baseline on average, but look at the spread: 128 to 162, against the baseline's 33 to 265. Constant exploring keeps the agent visiting more situations, so every seed's table ends up reasonable. During training, though, 30% of moves are random, so the training episodes themselves stay short. The lesson: **a training score measures learning plus exploring; only a greedy test measures what was learned**.

**Faster decay** is the best result here. Why? With the default `eps_decay=0.999`, epsilon after 2000 episodes is 0.999 to the power 2000, about 0.135: the agent is still acting randomly 13% of the time, so its late episodes keep getting cut short and the table near the balanced states learns less. With 0.998, epsilon reaches the floor of 0.01 by about episode 2300 and is down to 0.02 by episode 2000. **An exploration schedule has to fit the training budget**: decay that's right for 4000 episodes is too slow for 2000.

## Experiment B: the learning rate alpha

Predict first: `alpha = 0.02` (ten times smaller than 0.2) and `alpha = 1.0` (replace the old value completely each time). Which learns more slowly? Which is unstable?

```python
experiment("alpha=0.02", alpha=0.02)
experiment("alpha=1.0", alpha=1.0)
```

`alpha=0.02` scores `[92, 167, 153]`, mean 137; `alpha=1.0` scores `[15, 16, 28]`, mean 20. About 35 seconds.

**A tiny alpha** is within the baseline's spread: from three runs, you can't say it's better or worse. That's a real finding, not a failure of the experiment. Some settings simply matter less than you'd expect.

**alpha = 1** fails on every seed. The update `new = old + 1 * (target - old)` simplifies to `new = target`: the old value is thrown away every time. Because several different real situations share one bucket, the same box keeps receiving different targets, and it just swings to whatever the latest one was. It never averages them, so it never settles. A learning rate below 1 is what turns a stream of noisy targets into an average.

## Experiment C: the discount factor gamma

Predict first: gamma controls how much future reward counts. Try `0.5` and `0.9`. (Work out `0.5 ** 10` and `0.9 ** 10`: that is how much a reward 10 ticks ahead is worth to each.)

```python
experiment("gamma=0.5", gamma=0.5)
experiment("gamma=0.9", gamma=0.9)
```

`gamma=0.5` scores `[154, 91, 163]`, mean 136; `gamma=0.9` scores `[125, 26, 291]`, mean 147. About 30 seconds.

Both are within the baseline's spread, which is a surprise worth thinking about. A rough rule of thumb is that the agent "looks ahead" about `1 / (1 - gamma)` ticks: 2 ticks for gamma 0.5, 10 for 0.9, 100 for 0.99. In CartPole, staying upright *now* is almost always what keeps you alive in a few ticks, so even a 2-tick horizon learns a reasonable balancing reflex. What a short horizon can't learn is to avoid the slow drift toward the track edge, a failure that develops over hundreds of ticks. With these coarse position buckets, the long horizon can't learn it either, so here the difference doesn't show. In a maze, where the goal can be many steps away, gamma matters far more.

## Experiment D: what the agent is allowed to see

Predict first: `bins=(1, 1, 1, 1)` means one bucket per number, so the table has a single row. `bins=(1, 1, 6, 1)` shows only the pole angle. `bins=(1, 1, 6, 12)` ignores position and velocity but sees the spin finely. Which will be best?

```python
experiment("one bucket (blind)", bins=(1, 1, 1, 1))
experiment("angle only", bins=(1, 1, 6, 1))
experiment("angle + spin only", bins=(1, 1, 6, 12))
```

Blind scores `[9, 9, 9]`; angle only `[35, 18, 22]`; angle + spin `[173, 186, 31]`, mean 130. About 35 seconds.

**Blind**: with one row, every situation looks identical, so the agent can only learn a single fixed behaviour (such as "always push the same way"), and that fails in 9 ticks. A table can only be as smart as the distinctions its rows allow.

**Angle only** is barely better than random. A pole at angle 0.05 that is rotating *away* from upright needs a very different push from one at angle 0.05 that is already swinging back, and without the spin number (`theta_dot`) the two look identical.

**Angle and spin**, with only 72 rows, does about as well as the full 324-row table, and two of its three seeds are better than two of the baseline's. Fewer rows means each row is visited far more often, so the table fills in faster. More detail is not automatically better: more rows also means slower filling. But the seed-2 table scores 31: luck again.

## Why desktop numbers differ

If you run the original notebook in Jupyter on your computer, Cells 1 to 16 print exactly the numbers here, but from Cell 17 on yours differ, sometimes a lot: Cell 18's average was 242 when that notebook was written, 79 in Python on Windows, and 100 here.

The seed fixes the random numbers, so the difference isn't randomness. It's the physics. `math.sin` and `math.cos` are computed by the system's maths library, and different systems (Windows, Linux, and the WebAssembly Python this notebook uses) may round the very last digit differently. CartPole is **chaotic**: a difference of 0.0000000000000001 in the angle grows a little every tick, and after a few hundred ticks it's big enough to put one state in a different bucket. From then on the whole training run takes a different path. All three results are correct runs of the same algorithm. This notebook runs the same WebAssembly Python for everyone, so its numbers match the text.

The lesson for your coursework: a single reinforcement-learning result is one sample from a wide distribution. Report several seeds, and the spread, not one number.

::: challenge The CartPole update [easy]
Write `q_update(Q, s, a, reward, s_next, failed, alpha, gamma)`. It applies one Q-learning update to the box `Q[s + (a,)]` in place, using a target of `reward` alone when `failed` is true, and `reward + gamma * (best value in the row of s_next)` otherwise, and returns the box's new value. `s` and `s_next` are bucket tuples like `(1, 1, 3, 2)`, as in Cell 15.

```python starter
def q_update(Q, s, a, reward, s_next, failed, alpha, gamma):
    return 0.0

Q_try = np.zeros((3, 3, 6, 6, 2))
Q_try[(1, 1, 3, 3)] = [10.0, 20.0]
print(q_update(Q_try, (1, 1, 3, 2), 1, 1, (1, 1, 3, 3), False, 0.2, 0.99))
```

```python solution
def q_update(Q, s, a, reward, s_next, failed, alpha, gamma):
    best_next = 0.0 if failed else Q[s_next].max()
    target = reward + gamma * best_next
    Q[s + (a,)] += alpha * (target - Q[s + (a,)])
    return Q[s + (a,)]

Q_try = np.zeros((3, 3, 6, 6, 2))
Q_try[(1, 1, 3, 3)] = [10.0, 20.0]
print(q_update(Q_try, (1, 1, 3, 2), 1, 1, (1, 1, 3, 3), False, 0.2, 0.99))
```

```python test
import numpy as _np
assert "q_update" in dir(), "Keep the function's name as q_update."
_Q = _np.zeros((3, 3, 6, 6, 2))
_Q[(1, 1, 3, 3)] = [10.0, 20.0]
_v = q_update(_Q, (1, 1, 3, 2), 1, 1, (1, 1, 3, 3), False, 0.2, 0.99)
assert _v is not None and abs(float(_v) - 4.16) < 1e-9, f"From 0, with target 1 + 0.99 x 20 = 20.8 and alpha 0.2, the new value is 4.16; got {_v}."
assert abs(_Q[(1, 1, 3, 2, 1)] - 4.16) < 1e-9, "Update the box in Q itself (Q[s + (a,)] += ...), not a copy."
assert _Q[(1, 1, 3, 2, 0)] == 0.0, "Only the box for the action taken should change."
_v = q_update(_Q, (1, 1, 3, 2), 0, 1, (1, 1, 3, 3), True, 0.2, 0.99)
assert abs(float(_v) - 0.2) < 1e-9, f"When failed, the target is the reward alone (1), so 0 moves to 0.2; got {_v}. After failure there is no future to count."
"SUCCESS: that's the whole learning rule, with the terminal-state case."
```

Hint: copy the three lines from Cell 16's loop (`best_next`, `target`, the `+=` update), using the function's parameters instead of the loop's names, then `return Q[s + (a,)]`.
:::

::: challenge One number into a bucket [medium]
`discretize` does four numbers at once with NumPy. Write `bucket(value, low, high, bins)` that does the same for **one** number, with plain Python: it returns the bucket index from 0 to `bins - 1`, and values at or beyond the ends of the range go into the first or last bucket.

```python starter
def bucket(value, low, high, bins):
    return int((value - low) / (high - low) * bins)

print(bucket(0.1, -THETA_LIMIT, THETA_LIMIT, 6))
print(bucket(5.0, -THETA_LIMIT, THETA_LIMIT, 6))
```

```python solution
def bucket(value, low, high, bins):
    index = int((value - low) / (high - low) * bins)
    return min(max(index, 0), bins - 1)

print(bucket(0.1, -THETA_LIMIT, THETA_LIMIT, 6))
print(bucket(5.0, -THETA_LIMIT, THETA_LIMIT, 6))
```

```python test
assert "bucket" in dir(), "Keep the function's name as bucket."
assert bucket(0.1, -THETA_LIMIT, THETA_LIMIT, 6) == 4, "Angle 0.1 has ratio 0.7387; times 6 is 4.43, so bucket 4 (Cell 12)."
assert bucket(0.0, -X_LIMIT, X_LIMIT, 3) == 1, "The exact middle of 3 buckets is bucket 1."
assert bucket(5.0, -THETA_LIMIT, THETA_LIMIT, 6) == 5, f"A value far above the range must go in the last bucket, 5; got {bucket(5.0, -THETA_LIMIT, THETA_LIMIT, 6)}. That's what np.clip did."
assert bucket(THETA_LIMIT, -THETA_LIMIT, THETA_LIMIT, 6) == 5, "A value exactly at the top gives ratio 1.0 and index 6, which doesn't exist: clip it to 5."
assert bucket(-9.0, -X_LIMIT, X_LIMIT, 3) == 0, "A value far below the range must go in bucket 0."
assert all(bucket(v, LOW[i], HIGH[i], BINS[i]) == discretize([0.3, -1.2, 0.05, 2.0])[i] for i, v in enumerate([0.3, -1.2, 0.05, 2.0])), "For values inside the range, bucket must agree with discretize."
"SUCCESS: min and max do for one number what np.clip did for four."
```

Hint: the starter computes the right index inside the range. Clamp it with `min(max(index, 0), bins - 1)`: `max` lifts anything below 0 up to 0, and `min` lowers anything above `bins - 1` down to it.
:::

::: challenge A better rule [medium]
The hand-written rule in Cell 10 looks only at the spin, and lasts about 200 ticks. Write `better_policy(state)`, a rule with no table and no learning, that survives **at least 450 ticks on average** over 20 episodes. Use what you've seen: the pole tips opposite to the push, and Cell 18b showed what makes a balancing rule fail.

```python starter
def better_policy(state):
    x, x_dot, theta, theta_dot = state
    return 1 if theta_dot > 0 else 0

random.seed(7)
print(sum(run_episode(better_policy) for _ in range(20)) / 20)
```

```python solution
def better_policy(state):
    x, x_dot, theta, theta_dot = state
    return 1 if theta + 0.5 * theta_dot > 0 else 0

random.seed(7)
print(sum(run_episode(better_policy) for _ in range(20)) / 20)
```

```python test
import random as _random
assert "better_policy" in dir(), "Keep the function's name as better_policy."
_random.seed(7)
_scores = [run_episode(better_policy) for _ in range(20)]
_avg = sum(_scores) / len(_scores)
assert _avg >= 450, f"Your rule averages {_avg:.0f} ticks; it needs 450. Push toward where the pole is going: combine where it leans (theta) with where it's heading (theta_dot)."
f"SUCCESS: {_avg:.0f} ticks on average, with one line and no learning. Hand-written control can be very good when you understand the physics; learning matters when you don't."
```

Hint: the spin-only rule reacts only to where the pole is *going*. A pole that's leaning right but momentarily spinning left still needs catching. Push right when `theta + k * theta_dot` is positive, for some `k` between 0 and 1: that's a guess at where the angle will be shortly. Try a few values of `k`.
:::

## Your own experiments

These are real unknowns: change one thing each and predict first. Each `experiment` call takes 10 to 30 seconds.

1. `bins=(1, 3, 6, 12)`: add velocity back to the angle-and-spin table. Does it help or hurt?
2. `experiment("4000 episodes", episodes=4000)`: does the full training budget, with the default decay, beat `eps_decay=0.998` at 2000?
3. `alpha=0.1` and `alpha=0.5`: where between the tested values does the best alpha sit, given the spread?
4. Change the reward in `train` so a failing tick gives `reward = -10` instead of `+1`. Does the agent learn to avoid failure faster?

## What to take away

Four ideas explain every result above. **Exploration** is required, because without it the agent locks onto the first thing it tries, and the exploration **schedule** has to fit the training budget. **Alpha** trades speed against stability, and 1 never settles. **Gamma** sets how far ahead the agent can see. And the **state representation** limits what the agent can ever learn, because a table cannot separate situations that share a row. Over all of them sits the fifth: one run is one sample, so compare settings over several seeds.

A table also hits a wall: to see position and velocity finely as well, you'd need thousands of rows, each visited too rarely to learn. The next lessons replace the table with a small neural network that **generalises** between similar states, the step from Q-learning to deep Q-learning that your coursework's Keras models take.
