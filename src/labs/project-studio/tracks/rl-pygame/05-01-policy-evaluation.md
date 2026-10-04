---
title: 5.1 — Policy Evaluation: How Good Is Every State?
track: Reinforcement Learning in pygame
runtime: python
run: planner_view.py
---

Lesson 4.3 measured how good a policy is by playing it thousands of times and averaging the returns. That works, but it's slow, it's noisy, and it only tells you about the start state. This lesson computes the **value of every state** under a policy, exactly, from the tables of lesson 4.5, with no playing at all.

A state's **value**, written V(s), is the expected return from that state on, if you follow the policy. Values are what an agent is really trying to learn: once you know how good every state is, choosing a good action is easy. You head for better states.

The tool is one equation, the **Bellman expectation equation**, named after Richard Bellman, who introduced this way of thinking in the 1950s. It's lesson 4.3's backwards rule, "a step's return is its reward plus γ times the next step's return", with averages taken over everything random.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_evaluation.py** above.

```python file=tests/test_evaluation.py provided
# Tests for planning.py's policy evaluation and planner_view.py (lesson 5.1). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_evaluation.py
import numpy as np
import pygame
from pytest import approx

from grid import MAPS, GridWorld
from mdp import tables

GAMMA = 0.9
LINE = GridWorld(["S.G"])        # states 0 and 1, then the goal (state 2)


def test_uniform_policy_spreads_every_state_evenly():
    from planning import uniform_policy
    policy = uniform_policy(3, 4)
    assert policy.shape == (3, 4)
    assert np.allclose(policy, 0.25) and np.allclose(policy.sum(axis=1), 1.0)


def test_qvalue_is_reward_plus_discounted_next_value():
    from planning import q_from_v
    P, R, _ = tables(LINE)
    V = np.array([0.3, 0.5, 0.0])
    Q = q_from_v(P, R, V, GAMMA)
    assert Q[1, 3] == approx(1.0 + GAMMA * 0.0), "right from state 1 reaches the goal: reward 1, nothing after"
    assert Q[0, 3] == approx(0.0 + GAMMA * 0.5), "right from state 0: no reward, then state 1's value"
    assert Q[0, 0] == approx(GAMMA * 0.3), "up bumps the edge: stay in state 0"


def test_evaluate_a_policy_that_always_goes_right():
    from planning import evaluate_policy
    P, R, terminal = tables(LINE)
    right = np.zeros((3, 4))
    right[:, 3] = 1.0
    V, _ = evaluate_policy(P, R, terminal, right, GAMMA)
    assert V.tolist() == approx([GAMMA, 1.0, 0.0])


def test_evaluate_matches_the_exact_solution_of_the_bellman_equations():
    from planning import evaluate_policy, uniform_policy
    P, R, terminal = tables(LINE)
    V, _ = evaluate_policy(P, R, terminal, uniform_policy(3, 4), GAMMA)
    # The random policy's two equations, rearranged into A @ [V0, V1] = b and solved exactly:
    #   V0 = 0.9 * (3/4 V0 + 1/4 V1)
    #   V1 = 1/4 * 1 + 0.9 * (1/4 V0 + 1/2 V1)
    A = np.array([[1 - 0.9 * 0.75, -0.9 * 0.25],
                  [-0.9 * 0.25, 1 - 0.9 * 0.5]])
    b = np.array([0.0, 0.25])
    assert V[:2] == approx(np.linalg.solve(A, b))


def test_evaluate_stops_once_nothing_changes():
    from planning import evaluate_policy, uniform_policy
    env = GridWorld(MAPS["walls"])
    P, R, terminal = tables(env)
    V, history = evaluate_policy(P, R, terminal, uniform_policy(25, 4), GAMMA, tolerance=1e-6)
    assert np.abs(history[-1] - history[-2]).max() < 1e-6
    assert np.abs(history[-2] - history[-3]).max() >= 1e-6, "it stops at the first sweep that changes nothing"
    assert (V[terminal] == 0).all()
    assert history[0].tolist() == [0.0] * 25, "the history starts from all zeros"


def test_evaluate_agrees_with_playing_the_policy():
    from agents import RandomAgent
    from planning import evaluate_policy, uniform_policy
    from returns import evaluate
    env = GridWorld(MAPS["walls"], max_steps=100)
    P, R, terminal = tables(env)
    V, _ = evaluate_policy(P, R, terminal, uniform_policy(25, 4), GAMMA)
    mean, error = evaluate(env, RandomAgent(4, np.random.default_rng(1)), 3000, GAMMA, seed=0)
    assert abs(V[0] - mean) < 3 * error, f"computed {V[0]:.4f}, played {mean:.4f} +/- {error:.4f}"


def test_planner_shades_good_and_bad_values():
    from planner_view import COLD, HOT, WARM, shade
    assert shade(1.0) == HOT and shade(0.0) == WARM and shade(-1.0) == COLD
    assert shade(5.0) == HOT, "values beyond the range get the end colour"


def test_planner_draws_a_value_in_its_cell():
    from planner_view import draw_values, shade
    from world_view import cell_rect, window_size
    env = GridWorld(["S.G"])
    pygame.font.init()
    screen = pygame.Surface(window_size(env))
    draw_values(screen, pygame.font.Font(None, 22), env, np.array([0.0, 1.0, 0.0]))
    rect = cell_rect((0, 1))
    assert screen.get_at((rect.right - 5, rect.bottom - 5))[:3] == shade(1.0)


def test_planner_window_opens_and_closes():
    from planner_view import run
    assert run(max_frames=2) == 2
```

Two tests check the method against completely independent answers:

- `test_evaluate_matches_the_exact_solution_of_the_bellman_equations` writes the random policy's equations for a 3-cell world out by hand, as a small system of linear equations, and solves them exactly with `np.linalg.solve`.
- `test_evaluate_agrees_with_playing_the_policy` compares the computed value of S with lesson 4.3's played average. It allows 3 standard errors, because the played average is noisy and the computed value isn't.

```check
file tests/test_evaluation.py -- Click "Create provided tests/test_evaluation.py" above.
```

## Values from one step ahead

Suppose you already knew every state's value V. Then you could work out how good each **action** is in each state, by looking one step ahead:

```text
Q(s, a) = Σ over next states s2 of   P(s, a, s2) × ( R(s, a, s2) + γ · V(s2) )
```

In words: for each place the action might take you, the reward for getting there plus the discounted value of being there, weighted by how likely that place is. This is lesson 4.3's "reward plus γ times what follows", with an expected value (lesson 2.2) over the randomness. These action values are written Q(s, a). They're exactly the numbers a Q-table holds.

Create `planning.py`:

```python file=planning.py
import numpy as np


def uniform_policy(n_states, n_actions):
    return np.full((n_states, n_actions), 1 / n_actions)


def q_from_v(P, R, V, gamma):
    return (P * (R + gamma * V)).sum(axis=2)
```

**How `q_from_v` computes every Q at once.** `P` and `R` have shape `(states, actions, states)`, and `V` has shape `(states,)`, one value per next state. In `R + gamma * V`, broadcasting (lesson 1.2) lines `V` up with the **last** axis, the next state, so each next state's value is added to the reward for reaching it. Multiplying by `P` weights each outcome by its probability, and `.sum(axis=2)` adds over the next states, leaving one number per `(s, a)`.

`uniform_policy` describes the random agent as a table of probabilities: for every state, each of the 4 actions has probability 1/4. From here on a policy is written π(a | s), "the probability of choosing `a` in state `s`", which covers random and certain policies alike: a certain policy just has one 1 in each row.

```predict
question: In the 3-cell world `S.G` with γ = 0.9, suppose V = [0.3, 0.5, 0]. What is Q for moving right from state 0?
answer: 0.45
tolerance: 0.001
explain: Right from state 0 lands in state 1 with certainty, with reward 0. So Q = 0 + 0.9 × V[1] = 0.9 × 0.5 = 0.45. Moving up from state 0 bumps the edge and stays in state 0: Q = 0.9 × 0.3 = 0.27.
verify: .venv/Scripts/python -c "import numpy as np; from grid import GridWorld; from mdp import tables; from planning import q_from_v; P, R, _ = tables(GridWorld(['S.G'])); print(round(q_from_v(P, R, np.array([0.3, 0.5, 0.0]), 0.9)[0, 3], 3))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_evaluation.py -k \"uniform or qvalue\"" label="uniform_policy and q_from_v work" -- q_from_v: (P * (R + gamma * V)).sum(axis=2). Broadcasting lines V up with the next-state axis.
```

## Sweep until nothing changes

A state's value is the average of its action values, weighted by how likely the policy is to choose each:

```text
V(s) = Σ over actions a of   π(a | s) × Q(s, a)
```

That's the **Bellman expectation equation**. But there's a circle: V comes from Q, and Q comes from V. The way out is to **repeat**:

```python file=planning.py
import numpy as np


def uniform_policy(n_states, n_actions):
    return np.full((n_states, n_actions), 1 / n_actions)


def q_from_v(P, R, V, gamma):
    return (P * (R + gamma * V)).sum(axis=2)


def evaluate_policy(P, R, terminal, policy, gamma, tolerance=1e-8, max_sweeps=10_000):
    V = np.zeros(len(P))
    history = [V]
    for _ in range(max_sweeps):
        new = (policy * q_from_v(P, R, V, gamma)).sum(axis=1)
        new[terminal] = 0.0
        change = np.abs(new - V).max()
        V = new
        history.append(V)
        if change < tolerance:
            break
    return V, history
```

How `evaluate_policy` works:

1. Start with every value at 0, a wrong guess.
2. **Sweep:** compute Q from the current V, then a new V from Q, for **every state at once**. `(policy * Q).sum(axis=1)` weights each action's value by its probability and adds across the actions. Terminal states are set back to 0, since nothing happens after the end.
3. Measure how much the values changed: lesson 1.2's biggest change, written inline. If it's tiny, stop. Otherwise sweep again.

`history` keeps every sweep's values, so you can watch the answer form, one sweep at a time.

**Why this ends up at the right answer.** Each sweep, information travels one step further. After sweep 1, the cells next to the goal know there's a +1 nearby. After sweep 2, the cells two steps away know too, discounted once more. Meanwhile any error in the guess gets multiplied by γ on every sweep, because the old values only enter through `gamma * V`. With γ = 0.9, the error shrinks by at least 10% each sweep and never comes back. On the `walls` map, the random policy's values settle within 10⁻⁸ after 114 sweeps.

**Another way to see it.** The Bellman equations for all the states together are a set of linear equations, one per state. For a tiny world you can solve them directly. `test_evaluate_matches_the_exact_solution_of_the_bellman_equations` writes the two equations of `S.G` out and hands them to `np.linalg.solve`. Sweeping is a way of solving the same equations that scales to thousands of states, and needs nothing but the update rule.

```predict
question: With γ = 0.9, what is the value of the start state on the `walls` map for the **random** policy? (Two decimal places; it may be negative.)
answer: -0.02
tolerance: 0.01
explain: About −0.017. Lesson 4.3 measured the random agent's average discounted return as −0.014 to −0.017, by playing. The computed value matches it. A random walker finds the hole, which is close and central, more often than the goal, and the goal's +1 is heavily discounted by the time a random walk gets there.
verify: .venv/Scripts/python -c "from grid import GridWorld, MAPS; from mdp import tables; from planning import evaluate_policy, uniform_policy; env = GridWorld(MAPS['walls']); P, R, T = tables(env); V, _ = evaluate_policy(P, R, T, uniform_policy(25, 4), 0.9); print(round(V[0], 2))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_evaluation.py -k evaluate" label="evaluate_policy sweeps the Bellman equation until it settles" -- Each sweep: new = (policy * q_from_v(P, R, V, gamma)).sum(axis=1), then set terminal states to 0. Stop when the biggest change is below tolerance.
```

## Watch the values spread

`planner_view.py` shows the values sweep by sweep. Each cell is shaded teal for positive and red for negative, with its value written in it:

```python file=planner_view.py
import sys

import pygame

from chart import mix
from grid import ENDS, MAPS, GridWorld
from mdp import tables
from planning import evaluate_policy, uniform_policy
from world_view import BACKGROUND, cell_rect, draw_panel, draw_world, window_size

GAMMA = 0.9
LOW, HIGH = -1.0, 1.0
COLD, WARM, HOT = (127, 29, 29), (30, 41, 59), (45, 212, 191)
TEXT = (226, 232, 240)


def shade(value):
    if value >= 0:
        return mix(WARM, HOT, min(value / HIGH, 1.0))
    return mix(WARM, COLD, min(value / LOW, 1.0))


def draw_values(screen, font, env, V):
    for state in range(env.n_states):
        cell = env.cell_of(state)
        if env.tile(cell) in ENDS + "#":
            continue
        rect = cell_rect(cell)
        pygame.draw.rect(screen, shade(V[state]), rect.inflate(-2, -2))
        screen.blit(font.render(f"{V[state]:+.2f}", True, TEXT), (rect.x + 6, rect.y + 6))


def run(name="walls", slip=0.0, max_frames=None):
    env = GridWorld(MAPS[name], slip=slip)
    P, R, terminal = tables(env)
    V, history = evaluate_policy(P, R, terminal, uniform_policy(env.n_states, env.n_actions), GAMMA)
    pygame.init()
    screen = pygame.display.set_mode(window_size(env))
    pygame.display.set_caption(f"Values of the random policy ({name}, slip {slip})")
    font = pygame.font.Font(None, 22)
    clock = pygame.time.Clock()
    sweep = 0
    playing = False
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_RIGHT:
                sweep = min(sweep + 1, len(history) - 1)
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_LEFT:
                sweep = max(sweep - 1, 0)
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                playing = not playing
        if playing and frames % 6 == 0:
            sweep = min(sweep + 1, len(history) - 1)
        screen.fill(BACKGROUND)
        draw_world(screen, env)
        draw_values(screen, font, env, history[sweep])
        lines = [f"sweep {sweep} of {len(history) - 1}", f"value of S: {history[sweep][env.state_of(env.start)]:+.4f}",
                 f"gamma {GAMMA}", "", "right / left: next / previous sweep", "space: play"]
        draw_panel(screen, font, env, lines)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "walls", float(sys.argv[2]) if len(sys.argv) > 2 else 0.0)
```

How it works:

- **The whole computation happens once**, before the window opens. `evaluate_policy` returns the full `history`, and the arrow keys just choose which sweep to display. Separating computing from showing (lesson 4.2) makes stepping backwards free.
- **`shade`** blends from a neutral colour towards teal for positive values and towards red for negative ones, with lesson 1.1's `mix`, here imported from `chart.py`. `min(…, 1.0)` stops values beyond the range overshooting the end colour.
- `rect.inflate(-2, -2)` shrinks the rectangle by 2 pixels in each direction, leaving the grid lines visible between cells.
- **Playing** advances one sweep every 6 frames, 10 sweeps a second, using `frames % 6 == 0`: the remainder after dividing by 6 is 0 on every sixth frame.

Run it and press the right arrow a few times. Watch the goal's +1 seep outward one cell per sweep, and the hole's −1 spread too. Then play the rest with Space.

```predict
question: Run `.venv\Scripts\python planner_view.py walls 0.5`, with very slippery ice. How will the random policy's value at S change, compared with no slip?
choice: Lower: slipping makes the hole more likely
choice: Higher: slipping helps it reach the goal
choice: Exactly the same
answer: Exactly the same
explain: Exactly −0.0166 either way. The random policy aims each direction 1/4 of the time. With slip, aiming left or right sometimes slides into "up", and aiming up sometimes doesn't happen, but over the four aims each real direction still comes out 1/4 of the time: (1 − s)/4 + (s/2)/4 + (s/2)/4 = 1/4. Randomness added to a uniformly random walker changes nothing. For any policy that *prefers* directions, slip matters a lot, as lesson 4.3's routes showed.
verify: .venv/Scripts/python -c "from grid import GridWorld, MAPS; from mdp import tables; from planning import evaluate_policy, uniform_policy; v = [evaluate_policy(*tables(GridWorld(MAPS['walls'], slip=s)), uniform_policy(25, 4), 0.9)[0][0] for s in (0.0, 0.5)]; print('Exactly the same' if abs(v[0] - v[1]) < 1e-9 else v)"
```

Evaluation answers "how good is this policy?". But the arrows you'd draw from these values, towards the better neighbours, describe a *better* policy than the random one that produced them. Lesson 5.2 follows that idea all the way, to the best policy there is.

```check
run ".venv/Scripts/python -m pytest -q tests/test_evaluation.py" label="all lesson 5.1 tests pass" -- shade: blend from WARM towards HOT for values above 0, and towards COLD for values below 0, by how far the value is towards the end of its range.
```
