---
title: 7.1 — Q-learning: One Term Changes
track: Reinforcement Learning in pygame
runtime: python
run: cliff_race.py
---

Everything is in place. You have a world (Chapter 4), the exact answers to check against (Chapter 5), and learners that improve from experience (Chapter 6). Q-learning, the algorithm this series has been heading for, is SARSA with one term changed:

```text
SARSA:        target = r + γ · Q(s', a')            a' = the action the agent will really take next
Q-learning:   target = r + γ · max over a' of Q(s', a')
```

Instead of the value of what the agent *will* do next, Q-learning uses the value of the **best** thing it could do next, whatever it actually does. It's value iteration's Bellman optimality update (lesson 5.2), with the expectation over the tables replaced by a single sampled step. That one change makes Q-learning learn the values of the **optimal** policy, even while it behaves differently, exploring as it goes. Chris Watkins introduced it in 1989, and it's still the core of modern deep reinforcement learning (Chapter 8's last lesson points the way).

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_offpolicy.py** above.

```python file=tests/test_offpolicy.py provided
# Tests for QLearning and ExpectedSarsa in learners.py, and cliff_race.py (lesson 7.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_offpolicy.py
import numpy as np
from pytest import approx


def test_qlearning_target_uses_the_best_next_action():
    from learners import QLearning
    agent = QLearning(3, 4, np.random.default_rng(0), epsilon=1.0, gamma=0.9, step=1.0)
    agent.Q[1] = [1.0, 4.0, 2.0, 3.0]
    agent.learn(0, 3, -1.0, 1, False, False)
    assert agent.Q[0, 3] == approx(-1.0 + 0.9 * 4.0), "the best next value, whatever the agent does next"


def test_qlearning_an_ending_has_no_next_value():
    from learners import QLearning
    agent = QLearning(3, 4, np.random.default_rng(0), step=1.0)
    agent.Q[2] = 50.0
    agent.learn(1, 3, 1.0, 2, True, False)
    assert agent.Q[1, 3] == approx(1.0)


def test_qlearning_a_time_out_still_counts_the_next_value():
    from learners import QLearning
    agent = QLearning(3, 4, np.random.default_rng(0), gamma=1.0, step=1.0)
    agent.Q[1] = [0.0, 6.0, 0.0, 0.0]
    agent.learn(0, 3, 0.0, 1, False, True)
    assert agent.Q[0, 3] == approx(6.0)


def test_qlearning_finds_the_edge_route_on_the_cliff():
    from learners import QLearning
    from training import train
    from watch_cliff import greedy_route, make_cliff
    env = make_cliff()
    agent = QLearning(env.n_states, 4, np.random.default_rng(0), epsilon=0.1, gamma=1.0, step=0.5)
    train(env, agent, 500, seed=0)
    route = greedy_route(make_cliff(), agent.Q)
    assert route is not None and len(route) - 1 == 13, "up, 11 steps along the row above the cliff, down"


def test_expected_policy_is_epsilon_greedy():
    from learners import ExpectedSarsa
    agent = ExpectedSarsa(2, 4, np.random.default_rng(0), epsilon=0.2)
    agent.Q[0] = [0.0, 3.0, 1.0, 2.0]
    assert agent.policy(0) == approx([0.05, 0.85, 0.05, 0.05])
    agent.Q[1] = [5.0, 0.0, 5.0, 0.0]
    assert agent.policy(1) == approx([0.45, 0.05, 0.45, 0.05]), "tied best actions share the greedy part"


def test_expected_target_averages_over_the_policy():
    from learners import ExpectedSarsa
    agent = ExpectedSarsa(3, 4, np.random.default_rng(0), epsilon=0.2, gamma=1.0, step=1.0)
    agent.Q[1] = [0.0, 3.0, 1.0, 2.0]
    agent.learn(0, 3, -1.0, 1, False, False)
    assert agent.Q[0, 3] == approx(-1.0 + 0.85 * 3.0 + 0.05 * (0.0 + 1.0 + 2.0))


def test_expected_with_no_exploration_is_q_learning():
    from learners import ExpectedSarsa, QLearning
    a = ExpectedSarsa(3, 4, np.random.default_rng(0), epsilon=0.0, gamma=0.9, step=1.0)
    b = QLearning(3, 4, np.random.default_rng(0), epsilon=0.0, gamma=0.9, step=1.0)
    for agent in (a, b):
        agent.Q[1] = [1.0, 4.0, 2.0, 3.0]
        agent.learn(0, 3, -1.0, 1, False, False)
    assert a.Q[0, 3] == approx(b.Q[0, 3])


def test_race_play_returns_rewards_and_a_route():
    from cliff_race import EPISODES, play
    from learners import QLearning
    totals, route = play(QLearning, seed=0)
    assert totals.shape == (EPISODES,)
    assert route[0] == (3, 0) and route[-1] == (3, 11)


def test_race_route_points_land_in_cell_centres():
    from cliff_race import MAP_CELL, MAP_LEFT, MAP_TOP, route_points
    assert route_points([(0, 0), (1, 2)], 0) == [(MAP_LEFT + MAP_CELL // 2, MAP_TOP + MAP_CELL // 2),
                                                 (MAP_LEFT + 2 * MAP_CELL + MAP_CELL // 2, MAP_TOP + MAP_CELL + MAP_CELL // 2)]


def test_race_window_opens_and_closes():
    from cliff_race import run
    assert run(max_frames=2) == 2
```

Compare `test_qlearning_target_uses_the_best_next_action` with lesson 6.3's `test_sarsa_follows_exploration_into_its_target`. Same setup, ε = 1, always exploring, and the opposite expectation: SARSA's target follows the random next action, while Q-learning's ignores it and uses the best.

```check
file tests/test_offpolicy.py -- Click "Create provided tests/test_offpolicy.py" above.
```

## Q-learning

Add `QLearning` to `learners.py`:

```python file=learners.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class TabularAgent:
    def __init__(self, n_states, n_actions, rng, epsilon=0.1, gamma=0.9, step=None):
        self.Q = np.zeros((n_states, n_actions))
        self.N = np.zeros((n_states, n_actions), dtype=int)
        self.rng = rng
        self.epsilon = epsilon
        self.gamma = gamma
        self.step = step

    def act(self, state):
        if bernoulli(self.epsilon, self.rng):
            return int(self.rng.integers(self.Q.shape[1]))
        return greedy_action(self.Q[state], self.rng)

    def nudge(self, state, action, target):
        self.N[state, action] += 1
        step = self.step if self.step is not None else 1 / self.N[state, action]
        self.Q[state, action] = update(self.Q[state, action], target, step)


class MonteCarlo(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, action, reward))
        if terminated or truncated:
            G = 0.0
            for s, a, r in reversed(self.episode):
                G = r + self.gamma * G
                self.nudge(s, a, G)
            self.episode = []


class TDPredictor:
    def __init__(self, n_states, n_actions, rng, step=0.1, gamma=1.0, initial=0.5):
        self.V = np.full(n_states, float(initial))
        self.n_actions = n_actions
        self.rng = rng
        self.step = step
        self.gamma = gamma

    def act(self, state):
        return int(self.rng.integers(self.n_actions))

    def learn(self, state, action, reward, next_state, terminated, truncated):
        target = reward if terminated else reward + self.gamma * self.V[next_state]
        self.V[state] = update(self.V[state], target, self.step)


class MCPredictor(TDPredictor):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, reward))
        if terminated or truncated:
            G = 0.0
            for s, r in reversed(self.episode):
                G = r + self.gamma * G
                self.V[s] = update(self.V[s], G, self.step)
            self.episode = []


class Sarsa(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.next_action = None

    def act(self, state):
        if self.next_action is not None:
            action, self.next_action = self.next_action, None
            return action
        return super().act(state)

    def learn(self, state, action, reward, next_state, terminated, truncated):
        if terminated:
            target = reward
        else:
            self.next_action = super().act(next_state)
            target = reward + self.gamma * self.Q[next_state, self.next_action]
        self.nudge(state, action, target)
        if terminated or truncated:
            self.next_action = None


class QLearning(TabularAgent):
    def learn(self, state, action, reward, next_state, terminated, truncated):
        target = reward if terminated else reward + self.gamma * self.Q[next_state].max()
        self.nudge(state, action, target)
```

The whole algorithm is two lines, because `TabularAgent` already does the rest: ε-greedy acting, the table and the step. Spelled out, each step of experience does:

```text
Q(s, a) ← Q(s, a) + α · ( r + γ · max over a' of Q(s', a')  −  Q(s, a) )
```

- **`self.Q[next_state].max()`** is the best estimated value available from the next state: the value of acting optimally from there, as far as the agent currently knows.
- **After an ending**, the target is just the reward, as for SARSA and TD. After a **time-out** it still bootstraps, because the next state has a future. Getting these two right is the single most common source of bugs in Q-learning code, and Chapter 8 shows how Gymnasium reports them.
- No next action is chosen in `learn`, so `act` needs no special case.

**On-policy and off-policy.** The policy an agent follows while learning is its **behaviour policy**; here, ε-greedy. The policy whose values it learns is its **target policy**. For SARSA the two are the same, so it's **on-policy**: it learns how good its own exploring behaviour is. For Q-learning the target policy is the greedy one, because of the max, while the behaviour stays ε-greedy, so it's **off-policy**: it learns about one policy while following another. Off-policy learning is what lets an agent learn the best behaviour from experience generated any way at all: exploration, old data, or even another agent's moves.

```check
run ".venv/Scripts/python -m pytest -q tests/test_offpolicy.py -k qlearning" label="QLearning targets the best next action" -- target = reward if terminated else reward + gamma * Q[next_state].max(); then nudge.
```

## Expected SARSA

There's a third choice between "the next action taken" and "the best next action": **the average over the next actions, weighted by how likely the policy is to take each**. That's **Expected SARSA**:

```python file=learners.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class TabularAgent:
    def __init__(self, n_states, n_actions, rng, epsilon=0.1, gamma=0.9, step=None):
        self.Q = np.zeros((n_states, n_actions))
        self.N = np.zeros((n_states, n_actions), dtype=int)
        self.rng = rng
        self.epsilon = epsilon
        self.gamma = gamma
        self.step = step

    def act(self, state):
        if bernoulli(self.epsilon, self.rng):
            return int(self.rng.integers(self.Q.shape[1]))
        return greedy_action(self.Q[state], self.rng)

    def nudge(self, state, action, target):
        self.N[state, action] += 1
        step = self.step if self.step is not None else 1 / self.N[state, action]
        self.Q[state, action] = update(self.Q[state, action], target, step)


class MonteCarlo(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, action, reward))
        if terminated or truncated:
            G = 0.0
            for s, a, r in reversed(self.episode):
                G = r + self.gamma * G
                self.nudge(s, a, G)
            self.episode = []


class TDPredictor:
    def __init__(self, n_states, n_actions, rng, step=0.1, gamma=1.0, initial=0.5):
        self.V = np.full(n_states, float(initial))
        self.n_actions = n_actions
        self.rng = rng
        self.step = step
        self.gamma = gamma

    def act(self, state):
        return int(self.rng.integers(self.n_actions))

    def learn(self, state, action, reward, next_state, terminated, truncated):
        target = reward if terminated else reward + self.gamma * self.V[next_state]
        self.V[state] = update(self.V[state], target, self.step)


class MCPredictor(TDPredictor):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, reward))
        if terminated or truncated:
            G = 0.0
            for s, r in reversed(self.episode):
                G = r + self.gamma * G
                self.V[s] = update(self.V[s], G, self.step)
            self.episode = []


class Sarsa(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.next_action = None

    def act(self, state):
        if self.next_action is not None:
            action, self.next_action = self.next_action, None
            return action
        return super().act(state)

    def learn(self, state, action, reward, next_state, terminated, truncated):
        if terminated:
            target = reward
        else:
            self.next_action = super().act(next_state)
            target = reward + self.gamma * self.Q[next_state, self.next_action]
        self.nudge(state, action, target)
        if terminated or truncated:
            self.next_action = None


class QLearning(TabularAgent):
    def learn(self, state, action, reward, next_state, terminated, truncated):
        target = reward if terminated else reward + self.gamma * self.Q[next_state].max()
        self.nudge(state, action, target)


class ExpectedSarsa(TabularAgent):
    def policy(self, state):
        row = self.Q[state]
        best = (row == row.max()) / np.sum(row == row.max())
        return (1 - self.epsilon) * best + self.epsilon / len(row)

    def learn(self, state, action, reward, next_state, terminated, truncated):
        expected = np.dot(self.policy(next_state), self.Q[next_state])
        target = reward if terminated else reward + self.gamma * expected
        self.nudge(state, action, target)
```

- **`policy(state)`** writes out ε-greedy as probabilities: each action gets ε / k from exploration, and the best action, or the tied best ones sharing equally, gets the remaining 1 − ε. With ε = 0.2 and a clear best among 4 actions: the best gets 0.8 + 0.05 = 0.85, and each other gets 0.05. `(row == row.max()) / np.sum(row == row.max())` spreads 1 evenly over the tied best: `True` counts as 1, so dividing by the number of ties gives each its share.
- **The target** uses `np.dot(policy, Q[next_state])`: multiply each next action's value by its probability and add them up (a **dot product**, lesson 2.2's expected value). It's what SARSA's target is on average, computed exactly instead of sampled from one random next action.

So Expected SARSA is on-policy like SARSA, but less noisy: one random draw has been removed from every target. With ε = 0 its policy puts all the weight on the best action, and it becomes Q-learning exactly; a test checks that. All three methods are the same update with different targets:

| method | target after a non-ending step | learns the values of |
|---|---|---|
| SARSA | r + γ Q(s', a′) with the a′ actually taken | the ε-greedy behaviour, sampled |
| Expected SARSA | r + γ Σ π(a′ \| s′) Q(s', a′) | the ε-greedy behaviour, averaged |
| Q-learning | r + γ max Q(s', a′) | the greedy policy |

```check
run ".venv/Scripts/python -m pytest -q tests/test_offpolicy.py -k expected" label="ExpectedSarsa targets the policy's average next value" -- policy: epsilon / k for every action, plus (1 - epsilon) shared equally by the best actions. Target: reward + gamma * dot(policy(next_state), Q[next_state]).
```

## Race them on the cliff

```python file=cliff_race.py
import numpy as np
import pygame

from chart import draw_frame, draw_series, smooth
from learners import ExpectedSarsa, QLearning, Sarsa
from training import train
from watch_cliff import greedy_route, make_cliff
from world_view import TILES

WIDTH, HEIGHT = 900, 500
PLOT = pygame.Rect(60, 40, 480, 260)
MAP_CELL, MAP_LEFT, MAP_TOP = 28, 60, 360
EPISODES = 500
TARGET_RUNS = 30
BACKGROUND = (24, 26, 33)
FRAME = (100, 116, 139)
TEXT = (226, 232, 240)
LEARNERS = [
    ("SARSA", (250, 204, 21), Sarsa),
    ("Q-learning", (248, 113, 113), QLearning),
    ("Expected SARSA", (94, 234, 212), ExpectedSarsa),
]


def make_learner(cls, env, seed):
    return cls(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=1.0, step=0.5)


def play(cls, seed):
    env = make_cliff()
    agent = make_learner(cls, env, seed)
    totals = train(env, agent, EPISODES, seed=seed)
    return totals, greedy_route(make_cliff(), agent.Q)


def route_points(route, offset):
    return [(MAP_LEFT + col * MAP_CELL + MAP_CELL // 2 + offset, MAP_TOP + row * MAP_CELL + MAP_CELL // 2 + offset)
            for row, col in route]


def draw_map(screen, routes):
    env = make_cliff()
    for row in range(env.rows):
        for col in range(env.cols):
            rect = pygame.Rect(MAP_LEFT + col * MAP_CELL, MAP_TOP + row * MAP_CELL, MAP_CELL - 1, MAP_CELL - 1)
            pygame.draw.rect(screen, TILES.get(env.tile((row, col)), TILES["."]), rect)
    for i, ((_, colour, _), route) in enumerate(zip(LEARNERS, routes)):
        if route is not None and len(route) > 1:
            pygame.draw.lines(screen, colour, False, route_points(route, (i - 1) * 4), 3)


def draw(screen, font, results):
    screen.fill(BACKGROUND)
    draw_frame(screen, font, PLOT, -100.0, 0.0, FRAME, "reward per episode while learning (smoothed)")
    routes = []
    for row, ((name, colour, _), runs) in enumerate(zip(LEARNERS, results)):
        label = name
        routes.append(runs[-1][1] if runs else None)
        if runs:
            mean = np.mean([totals for totals, _ in runs], axis=0)
            draw_series(screen, PLOT, smooth(mean, 20), colour, -100.0, 0.0)
            route = runs[-1][1]
            steps = "loops" if route is None else f"{len(route) - 1} steps"
            label = f"{name}: {mean[-100:].mean():.1f}, route {steps}"
        screen.blit(font.render(label, True, colour), (PLOT.right + 16, PLOT.top + row * 26))
    draw_map(screen, routes)
    status = f"runs: {len(results[-1])} of {TARGET_RUNS}    each run is {EPISODES} episodes"
    screen.blit(font.render(status, True, TEXT), (PLOT.left, PLOT.bottom + 16))


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("SARSA, Q-learning and Expected SARSA on the cliff")
    font = pygame.font.Font(None, 22)
    clock = pygame.time.Clock()
    results = [[] for _ in LEARNERS]
    turn = 0
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        if len(results[-1]) < TARGET_RUNS:
            which = turn % len(LEARNERS)
            results[which].append(play(LEARNERS[which][2], seed=len(results[which])))
            turn += 1
        draw(screen, font, results)
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

How it works:

- **`play`** trains one learner for 500 episodes on a fresh cliff and returns its reward per episode and its greedy route (lesson 6.3's `greedy_route`). All three use Sutton & Barto's settings: ε = 0.1, step 0.5, γ = 1.
- **Turn by turn.** A run takes about a tenth of a second, so each frame plays just **one** run, for one learner, taking turns (`turn % len(LEARNERS)`). The window stays responsive while 90 runs pile up (lesson 3.2's work spread over frames).
- **The map** draws the three latest greedy routes, each shifted a few pixels (`(i - 1) * 4`: −4, 0, +4) so that overlapping routes stay visible side by side.

Run it, and predict before the first routes appear.

```predict
question: Which learner's greedy route will be the shortest one, right along the cliff edge?
choice: SARSA
choice: Q-learning
choice: Expected SARSA
answer: Q-learning
explain: Q-learning learns the 13-step edge route in all 20 of 20 runs, the optimal path. Its target asks "what if I act **best** from here?", and the best policy never takes a random step, so the cliff beside the route never costs it anything in its estimates. SARSA learns the 17-step top route (lesson 6.3), and Expected SARSA something in between.
verify: .venv/Scripts/python -c "from cliff_race import play; from learners import QLearning; print('Q-learning' if all(len(play(QLearning, s)[1]) - 1 == 13 for s in range(10)) else 'no')"
```

```predict
question: While learning, with exploration on, which learner earns the **least** per episode?
choice: SARSA
choice: Q-learning
choice: Expected SARSA
answer: Q-learning
explain: Q-learning, at about −48 per episode, against about −28 for SARSA and −20 for Expected SARSA. It has learned the best route, the edge, and it walks that edge while still taking a random step 10% of the time, so it keeps falling off. Its estimates describe a careful greedy agent, and its behaviour is a careless exploring one. Learning the optimal policy and behaving well while learning are different goals. Which one matters depends on whether mistakes during learning are real, as for a robot on an actual cliff, or simulated.
verify: script race_worst_online.py
```

```predict
question: How many steps long is Expected SARSA's greedy route?
answer: 15
explain: 15 steps, along the middle row: one row further from the edge than Q-learning, one row nearer than SARSA. Its averaged targets weigh the 10% chance of a random step exactly, while SARSA's sampled ones see that risk with a lot of noise. So it prices the danger of the edge correctly, and it took the 15-step route in every run here, with no looping routes at all.
verify: script race_expected_route.py
```

### Further reading

- Sutton & Barto, chapter 6.5 (Q-learning) and 6.6 (Expected SARSA); Example 6.6 is this cliff, and Figure 6.4 these curves.
- Watkins & Dayan (1992), *Q-learning*, the proof that tabular Q-learning converges to the optimal values, given that every state–action pair keeps being tried and the step size shrinks suitably over time. Lesson 7.3 looks at what that condition means in practice.

```check
run ".venv/Scripts/python -m pytest -q tests/test_offpolicy.py" label="all lesson 7.1 tests pass" -- play: train a fresh learner on make_cliff() for EPISODES, then return its totals and greedy_route on a new cliff.
```
