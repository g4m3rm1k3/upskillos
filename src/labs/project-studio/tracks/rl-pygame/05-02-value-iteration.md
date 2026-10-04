---
title: 5.2 — Value Iteration: Computing the Best Policy
track: Reinforcement Learning in pygame
runtime: python
run: planner_view.py
---

Lesson 5.1 answered "how good is *this* policy?". This lesson answers the question that matters: **what is the best possible policy, and how good is it?** You'll compute both, exactly, for any map and any slip, in a few dozen sweeps.

It takes one change to lesson 5.1's equation. Instead of *averaging* the actions' values by how likely a policy is to choose them, take the **best** one. That gives the **Bellman optimality equation**, and repeating it gives **value iteration**, one of the oldest and most important algorithms in reinforcement learning. Q-learning, in Chapter 7, is value iteration done from experience instead of from tables.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_best.py** above.

```python file=tests/test_best.py provided
# Tests for value iteration, greedy policies and the finished planner_view.py (lesson 5.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_best.py
import numpy as np
import pygame
from pytest import approx

from grid import MAPS, GridWorld
from mdp import tables

GAMMA = 0.9


def solved(slip=0.0):
    from planning import value_iteration
    env = GridWorld(MAPS["walls"], slip=slip)
    P, R, terminal = tables(env)
    V, history = value_iteration(P, R, terminal, GAMMA)
    return env, P, R, terminal, V, history


def test_greedy_policy_picks_the_best_action():
    from planning import greedy_policy
    Q = np.array([[0.0, 2.0, 1.0, -1.0]])
    assert greedy_policy(Q).tolist() == [[0.0, 1.0, 0.0, 0.0]]


def test_greedy_policy_splits_ties_evenly():
    from planning import greedy_policy
    Q = np.array([[3.0, 0.0, 3.0, 1.0],
                  [0.0, 0.0, 0.0, 0.0]])
    assert greedy_policy(Q).tolist() == [[0.5, 0.0, 0.5, 0.0], [0.25, 0.25, 0.25, 0.25]]


def test_optimal_value_of_s_without_slip_is_the_shortest_route():
    *_, V, _ = solved()
    assert V[0] == approx(GAMMA ** 7), "8 steps to the goal: the +1 is discounted 7 times"


def test_optimal_values_spread_one_cell_per_sweep():
    *_, history = solved()
    assert history[1][GridWorld(MAPS["walls"]).state_of((4, 3))] == approx(1.0), "after 1 sweep, the cell beside the goal"
    assert history[7][0] == 0.0, "the start is 8 steps away: still nothing after 7 sweeps"
    assert history[8][0] == approx(GAMMA ** 7)


def test_optimal_values_satisfy_the_bellman_optimality_equation():
    from planning import q_from_v
    env, P, R, terminal, V, _ = solved(slip=0.2)
    best = q_from_v(P, R, V, GAMMA).max(axis=1)
    best[terminal] = 0.0
    assert np.allclose(V, best, atol=1e-7)


def test_optimal_is_at_least_as_good_as_random_everywhere():
    from planning import evaluate_policy, uniform_policy
    env, P, R, terminal, V, _ = solved(slip=0.2)
    random_V, _ = evaluate_policy(P, R, terminal, uniform_policy(25, 4), GAMMA)
    assert (V >= random_V - 1e-9).all()


def test_optimal_acting_greedily_earns_the_optimal_values():
    from planning import evaluate_policy, greedy_policy, q_from_v
    env, P, R, terminal, V, _ = solved(slip=0.2)
    policy = greedy_policy(q_from_v(P, R, V, GAMMA))
    V_policy, _ = evaluate_policy(P, R, terminal, policy, GAMMA)
    assert np.allclose(V_policy, V, atol=1e-6), "acting greedily on the optimal values achieves them"


def test_solver_returns_a_history_for_each_mode():
    from planner_view import solve
    env = GridWorld(MAPS["walls"])
    for mode in ("random", "optimal"):
        P, R, history = solve(env, mode)
        assert P.shape == (25, 4, 25) and history[0].tolist() == [0.0] * 25
    assert len(solve(env, "optimal")[2]) < len(solve(env, "random")[2])


def test_solver_draws_arrows_only_where_the_policy_chooses():
    from planner_view import ARROW, draw_policy
    from world_view import CELL, cell_rect, window_size
    env = GridWorld(["S..G"])
    screen = pygame.Surface(window_size(env))
    policy = np.zeros((4, 4))
    policy[:, 3] = 1.0                       # right everywhere
    policy[1] = 0.25                         # except a cell where every action ties
    draw_policy(screen, env, policy)
    first, second = cell_rect((0, 0)).center, cell_rect((0, 1)).center
    assert screen.get_at((first[0] + CELL // 4, first[1]))[:3] == ARROW
    assert screen.get_at((second[0] + CELL // 4, second[1]))[:3] != ARROW, "no arrows where all four tie"


def test_solver_window_opens_and_closes():
    from planner_view import run
    assert run(max_frames=2) == 2
    assert run(mode="random", max_frames=2) == 2
```

`test_optimal_values_spread_one_cell_per_sweep` makes a precise claim you'll see in the window: on a map with no slip, the start, 8 steps from the goal, has value 0 after 7 sweeps and its final value after 8. `test_optimal_acting_greedily_earns_the_optimal_values` checks the whole point of the lesson: acting greedily on the computed values really achieves them.

```check
file tests/test_best.py -- Click "Create provided tests/test_best.py" above.
```

## Better arrows from any values

Given action values Q, the **greedy policy** picks the best action in each state. When several tie, it splits its probability evenly between them, so a tie stays visible instead of being hidden by `argmax` (lesson 1.2's lesson, again):

```python file=planning.py
import numpy as np

from qtable import advantages


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


def greedy_policy(Q):
    best = (advantages(Q) == 0).astype(float)
    return best / best.sum(axis=1, keepdims=True)
```

How `greedy_policy` builds a probability table:

1. `advantages(Q) == 0` marks every best action with `True` (lesson 1.2), and `.astype(float)` turns `True`/`False` into 1.0/0.0.
2. Dividing each row by its own total (`keepdims` again) makes each row add up to 1: one best action gets 1.0, two tied ones get 0.5 each, and four ties get 0.25 each.

**Why greedy arrows improve a policy.** Take the random policy's values from lesson 5.1, and in each state choose the action that leads to the best expected value. The new policy is at least as good as the random one in **every** state, and better in some. This is the **policy improvement theorem**, and the reason is simple. In each state, the greedy action does at least as well as the average action, which is what the old policy got. And it keeps doing so in every state that follows. You'll see it in the window: the arrows drawn on the *random* policy's values already head for the goal and away from the hole.

```check
run ".venv/Scripts/python -m pytest -q tests/test_best.py -k greedy" label="greedy_policy puts its probability on the best actions" -- Mark the best actions with advantages(Q) == 0, turn them into floats, and divide each row by its total.
```

## Value iteration

Improve the arrows after every sweep, instead of waiting for a policy's values to settle. In the update, that means replacing lesson 5.1's average over the policy with the maximum over actions:

```text
evaluation (5.1):   V(s) ← Σ_a π(a | s) · Q(s, a)
value iteration:    V(s) ← max over a of  Q(s, a)
```

```python file=planning.py
import numpy as np

from qtable import advantages


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


def value_iteration(P, R, terminal, gamma, tolerance=1e-8, max_sweeps=10_000):
    V = np.zeros(len(P))
    history = [V]
    for _ in range(max_sweeps):
        new = q_from_v(P, R, V, gamma).max(axis=1)
        new[terminal] = 0.0
        change = np.abs(new - V).max()
        V = new
        history.append(V)
        if change < tolerance:
            break
    return V, history


def greedy_policy(Q):
    best = (advantages(Q) == 0).astype(float)
    return best / best.sum(axis=1, keepdims=True)
```

`value_iteration` is `evaluate_policy` with one line changed: `.max(axis=1)` takes the best action's value in each state, instead of the policy's weighted average. Everything else, the terminal states, the stopping rule and the history, is the same.

**What the values become.** When the sweeps stop changing anything, the values satisfy

```text
V*(s) = max over a of  Σ_s2  P(s, a, s2) · ( R(s, a, s2) + γ · V*(s2) )
```

That's the **Bellman optimality equation**. Its solution, V*, is the **optimal value function**: the best expected return achievable from each state, by any policy at all. It converges for the same reason as before: any error is multiplied by γ every sweep. The greedy policy on V* is an **optimal policy**, and the last test checks that it really earns V* everywhere.

```predict
question: On the `walls` map without slip, the start is 8 steps from the goal. After how many sweeps does the start's value first reach its final value?
answer: 8
explain: After sweep 1, only the cells next to the goal know about it. Each sweep, the +1 travels one cell further back, discounted once more. The start, 8 steps away, gets 0.9⁷ ≈ 0.478 at sweep 8, and sweep 9 changes nothing, so value iteration stops. In a deterministic world, value iteration needs about as many sweeps as the longest shortest path.
verify: .venv/Scripts/python -c "from grid import GridWorld, MAPS; from mdp import tables; from planning import value_iteration; P, R, T = tables(GridWorld(MAPS['walls'])); V, h = value_iteration(P, R, T, 0.9); print(next(i for i, v in enumerate(h) if abs(v[0] - 0.9 ** 7) < 1e-12))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_best.py -k optimal" label="value_iteration finds the optimal values" -- value_iteration is evaluate_policy with the weighted average replaced by q_from_v(P, R, V, gamma).max(axis=1).
```

## Plan in the window

The finished `planner_view.py` shows the values, plus the greedy arrows for whatever sweep is on screen. Two keys switch what's being computed: **O** flips between the random policy's values and the optimal ones, and **S** turns the ice on and off.

```python file=planner_view.py
import sys

import numpy as np
import pygame

from chart import mix
from grid import ENDS, MAPS, GridWorld
from mdp import tables
from planning import evaluate_policy, greedy_policy, q_from_v, uniform_policy, value_iteration
from qtable import ACTIONS
from world_view import BACKGROUND, CELL, cell_rect, draw_panel, draw_world, window_size

GAMMA = 0.9
LOW, HIGH = -1.0, 1.0
COLD, WARM, HOT = (127, 29, 29), (30, 41, 59), (45, 212, 191)
TEXT = (226, 232, 240)
ARROW = (241, 245, 249)
MODES = {"random": "values of the random policy", "optimal": "value iteration: the best values"}


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


def draw_policy(screen, env, policy):
    for state in range(env.n_states):
        cell = env.cell_of(state)
        if env.tile(cell) in ENDS + "#" or (policy[state] > 0).all():
            continue
        centre = cell_rect(cell).center
        for action in np.flatnonzero(policy[state] > 0):
            d_row, d_col = ACTIONS[action]
            tip = (centre[0] + d_col * CELL // 3, centre[1] + d_row * CELL // 3)
            pygame.draw.line(screen, ARROW, centre, tip, 3)
            pygame.draw.circle(screen, ARROW, tip, 4)


def solve(env, mode):
    P, R, terminal = tables(env)
    if mode == "random":
        _, history = evaluate_policy(P, R, terminal, uniform_policy(env.n_states, env.n_actions), GAMMA)
    else:
        _, history = value_iteration(P, R, terminal, GAMMA)
    return P, R, history


def run(name="walls", mode="optimal", max_frames=None):
    slip = 0.0
    env = GridWorld(MAPS[name], slip=slip)
    P, R, history = solve(env, mode)
    pygame.init()
    screen = pygame.display.set_mode(window_size(env))
    pygame.display.set_caption(f"Planning on {name}")
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
            elif event.type == pygame.KEYDOWN and event.key in (pygame.K_o, pygame.K_s):
                if event.key == pygame.K_o:
                    mode = "random" if mode == "optimal" else "optimal"
                else:
                    slip = 0.2 if slip == 0.0 else 0.0
                env = GridWorld(MAPS[name], slip=slip)
                P, R, history = solve(env, mode)
                sweep = 0
        if playing and frames % 6 == 0:
            sweep = min(sweep + 1, len(history) - 1)
        V = history[sweep]
        screen.fill(BACKGROUND)
        draw_world(screen, env)
        draw_values(screen, font, env, V)
        draw_policy(screen, env, greedy_policy(q_from_v(P, R, V, GAMMA)))
        lines = [MODES[mode], f"slip {slip}", f"sweep {sweep} of {len(history) - 1}",
                 f"value of S: {V[env.state_of(env.start)]:+.4f}", "",
                 "right / left: sweeps   space: play", "O: random / optimal", "S: slip on / off"]
        draw_panel(screen, font, env, lines)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "walls")
```

What changed from lesson 5.1:

- **`solve`** builds the tables and runs either `evaluate_policy` with the random policy or `value_iteration`, so one window shows both methods.
- **`draw_policy`** draws an arrow for every action the policy chooses, and skips cells where all four tie (`(policy[state] > 0).all()`), such as the all-zero start of sweep 0.
- **Arrows every frame** come from `greedy_policy(q_from_v(P, R, V, GAMMA))` on the values currently on screen, so you see the policy *those values* recommend.
- Pressing O or S rebuilds the environment and the tables and starts again from sweep 0. The window shows exactly what the new world implies.

Run it, step through the sweeps, and watch the arrows form. Press **O** to see the random policy's values, and notice that their greedy arrows already avoid the hole.

```predict
question: Press **S** for slip 0.2. Lesson 4.3's hand-drawn bottom route scored about +0.30. What will value iteration say the best possible value of S is?
choice: Much better: well above +0.40
choice: About the same: about +0.30
choice: Worse than the bottom route
answer: About the same: about +0.30
explain: +0.3014. Your hand-drawn bottom route was already within noise of optimal. Value iteration doesn't beat a good human plan here; it *certifies* it. It also finds the same move you made by instinct, turning back towards S from the middle of the top row, and it would do the same for a map too big to reason about by hand. It can never be worse than a hand-drawn route: the optimum is at least as good as every policy.
verify: .venv/Scripts/python -c "from grid import GridWorld, MAPS; from mdp import tables; from planning import value_iteration; P, R, T = tables(GridWorld(MAPS['walls'], slip=0.2)); V, _ = value_iteration(P, R, T, 0.9); print('About the same: about +0.30' if abs(V[0] - 0.302) < 0.01 else V[0])"
```

```predict
question: With slip 0.2, which way does the arrow in cell (0, 1) point, just right of S?
choice: right, towards the top route
choice: left, back towards S
choice: down
answer: left, back towards S
explain: Left. Without slip, (0, 1) points right: the top route is as short as any. With slip, the top route passes the hole twice, so from (0, 1) the safer plan is to step back to S and take the bottom route, even though that's a longer way round. Its Q-values: left 0.265, right 0.241. A tiny cost in steps buys a big cut in risk. The best action depends on the whole future, not on the next step.
verify: .venv/Scripts/python -c "from grid import GridWorld, MAPS; from mdp import tables; from planning import value_iteration, q_from_v; env = GridWorld(MAPS['walls'], slip=0.2); P, R, T = tables(env); V, _ = value_iteration(P, R, T, 0.9); print(['up', 'down', 'left, back towards S', 'right, towards the top route'][q_from_v(P, R, V, 0.9)[env.state_of((0, 1))].argmax()])"
```

### What planning needs, and what comes next

Value iteration is exact and fast, but it needs two things that real problems rarely give you:

- **A model.** It reads `P` and `R` directly. A robot, a game opponent or a market doesn't hand you its transition probabilities. You can only act and see what happens.
- **A small number of states.** Each sweep touches every state and action. A 5 × 5 grid has 25 states. A board game has more states than there are atoms in the universe. Bellman called this the **curse of dimensionality**.

Chapter 6 removes the first requirement: learn values **from experience alone**, by playing episodes, without ever seeing `P`. Chapter 8 shows where the second one bites, on CartPole.

**Generalized policy iteration.** Look at what value iteration does: it *evaluates* (estimates values) and *improves* (acts greedily on them), over and over, until the two agree. Every method in the rest of this series does the same two things, interleaved in different ways. Sutton and Barto call the pattern **generalized policy iteration**, and once you see it, Monte Carlo, SARSA and Q-learning are variations on one theme.

### Further reading

- Sutton & Barto, chapter 4, "Dynamic programming": policy evaluation, policy improvement, **policy iteration** (alternate full evaluation with full improvement; it often needs fewer, more expensive rounds), value iteration, and asynchronous updates, which update states one at a time, in place.
- Bellman, *Dynamic Programming* (1957), where the optimality equation comes from.

```check
run ".venv/Scripts/python -m pytest -q tests/test_best.py tests/test_evaluation.py" label="all lesson 5.1 and 5.2 tests pass" -- draw_policy: skip walls, endings and cells where every action ties; otherwise draw an arrow for each action with probability above 0.
```
