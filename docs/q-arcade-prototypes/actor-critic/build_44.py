from build_common import blocks, fence, join, read, write_answer, write_lesson, write_verify

b = blocks(read("a2c.py"))
tests = read("tests/test_a2c.py")
v_returns = join(b["header"], b["n_step_returns"])
v_cut = join(b["header"], b["n_step_returns"], b["cut_short"])
v_envs = join(b["header"], b["n_step_returns"], b["cut_short"], b["make_envs"])
v_full = join(b["header"], b["n_step_returns"], b["cut_short"], b["make_envs"], b["train_a2c"], b["play_greedy"], b["main"])
assert v_full == read("a2c.py"), "blocks must rebuild the file exactly"
write_answer("a2c_returns.py", v_returns)
write_verify("a2c_seed0.py", '''
# Seed 0's greedy score over 20 new games after the default 200,000 steps of A2C.
import torch

from a2c import play_greedy, train_a2c

torch.set_num_threads(1)
net, _ = train_a2c(quiet=True)
print(play_greedy(net).mean())
''')

lesson = f'''
---
title: 4.4 — A2C: Eight CartPoles in Step
runtime: python
run: a2c.py
---

### The story so far

Lesson 4.3 built the parts of actor-critic in `actor_critic.py`: `ActorCritic`, one network with an **actor** head (two scores, which softmax turns into the probability of each push) and a **critic** head (V(s), how well things usually go from this position); `advantage`, how much better a move went than the critic expected; and `a2c_loss(logits, values, actions, returns)`, one loss that makes better-than-expected moves likelier, moves V(s) towards what happened, and pays a small bonus for staying unsure (entropy).

What's missing is the loop that plays CartPole, collects moves, works out each move's target (`returns`), and calls the loss. That loop is A2C.

### What this lesson asks

**A2C** stands for **Advantage Actor-Critic**. It adds two ideas to lesson 4.3's pieces:

1. **Look a few steps ahead, then trust the critic.** REINFORCE waited until the end of a game to know each move's return. A2C plays only 5 steps, then estimates the rest of the game with the critic's V(s). It can learn in the middle of a game, many times per game.
2. **Many games at once.** It runs 8 CartPoles side by side. Every 5 steps it has 8 × 5 = 40 moves from 8 different games, and makes one gradient step from all of them. Moves from different games are much less alike than 40 moves in a row from one game, so the step is steadier (the same reason Chapter 6's replay memory will mix experiences up).

"Synchronous": all 8 CartPoles take a step together, and the update waits for all of them. Lesson 4.5's A3C drops the waiting.

### How the pieces fit

```text
make_envs(8)   8 CartPoles that step together and restart on their own when a game ends

train_a2c, repeated until 200,000 steps:
  ┌ 5 times: actor chooses 8 pushes -> 8 CartPoles step -> keep obs, push, reward, ended
  │          (a game cut off at 500 steps? cut_short adds the critic's estimate of its future)
  ├ critic estimates V(s) for the 8 positions the CartPoles are in now
  ├ n_step_returns: each of the 40 moves' target = its rewards for up to 5 steps + γⁿ × V(s) at the end
  └ a2c_loss on all 40 moves -> backward -> clip -> one optimiser step
  every 20,000 steps: play_greedy on 5 fresh games, so you can watch it learn
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_a2c.py** above.

{fence("tests/test_a2c.py", tests, provided=True)}

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `bootstrap` | targets add up from the end, start from the critic's last estimate, stop at an ending, and work for many CartPoles at once | targets added up forwards, or the critic's estimate carried across the end of a game into the next one |
| `truncated` | a game cut off at 500 steps keeps its future, and the original rewards aren't changed | treating "reached 500" like "fell over": the agent learns that the best states lead to the end, lesson 1.3's warning |
| `envs` | 8 CartPoles run side by side and restart on their own, handing back the last observation of the game that ended | a finished CartPole that's never restarted, so one of the 8 sits doing nothing |
| `training` | training returns a network and a learning curve, repeats exactly with a seed, and balances by 120,000 steps | any bug in the loop at all: this is the test that says the whole thing works |

```check
file tests/test_a2c.py -- Click "Create provided tests/test_a2c.py" above.
```

## Your turn: targets that look 5 steps ahead

**Build, on your own:** `n_step_returns(rewards, ended, last_values, gamma)` in a new file, `a2c.py`.

After 5 steps, each of the 5 moves needs a target: what actually happened after it, estimated. For the move at step t, that's the rewards from t to the end of the 5 steps, discounted, plus the critic's estimate of everything after:

```text
target(4) = r4 + γ x V(last)                  the last move: one real reward, then the critic's estimate
target(3) = r3 + γ x target(4)                one more real reward in front
target(2) = r2 + γ x target(3)
   ...
```

It's lesson 4.1's `discounted_returns`, computed backwards the same way, with one change: the running total starts at the critic's estimate `last_values` instead of 0, because the game didn't end, you just stopped watching. Starting from an estimate instead of the true answer is called **bootstrapping**.

And where a game **ended** at step t (`ended[t]` is 1), nothing after it belongs to this game: the running total restarts at 0 before adding `rewards[t]`. Multiplying by `(1 - ended[t])` does it without an `if`, as Chapter 6's `(1 - ended)` will:

```text
running = rewards[t] + gamma * (1 - ended[t]) * running
```

Worked through with the first test: rewards [1, 1, 1], nothing ended, last value 10, γ = 0.5.

```text
start:  running = 10                       the critic's estimate after the last step
t = 2:  running = 1 + 0.5 x 10  = 6        target(2) = 6
t = 1:  running = 1 + 0.5 x 6   = 4        target(1) = 4
t = 0:  running = 1 + 0.5 x 4   = 3        target(0) = 3
```

With `ended = [0, 1, 0]`: t = 2 gives 6 as before, but at t = 1 the game ended, so `(1 - 1) = 0` wipes the running total: 1 + 0 = 1. Then t = 0: 1 + 0.5 × 1 = 1.5.

**It must work for 8 CartPoles at once.** `rewards` and `ended` will have shape (5, 8): one row per step, one column per CartPole. `last_values` has shape (8,). If `running` starts as an array of 8 numbers, every line of the loop works on all 8 at once (NumPy, lesson 1.2), and `returns[t] = running` fills a whole row. Make the output with `np.zeros(np.shape(rewards))`, so it has the same shape as `rewards` whether that's a list or a 2D array, and start with `running = np.asarray(last_values, dtype=float)`.

**How far ahead is right?** Each extra real step makes the target more truthful but noisier, and gives the critic's estimate less weight. See the balance with a loop:

```python
gamma = 0.99
for n in (1, 5, 20, 100):
    real = sum(gamma ** k for k in range(n))
    print(f"{{n:3}}-step target: {{real:6.2f}} of real reward + {{gamma ** n:.3f}} x the critic's estimate")
```

```text
  1-step target:   1.00 of real reward + 0.990 x the critic's estimate
  5-step target:   4.90 of real reward + 0.951 x the critic's estimate
 20-step target:  18.21 of real reward + 0.818 x the critic's estimate
100-step target:  63.40 of real reward + 0.366 x the critic's estimate
```

A 1-step target is almost all estimate: early on, when the critic knows nothing, it's almost all guess. A whole-game target (REINFORCE's) is all real reward and very noisy. Five steps is A2C's usual compromise; lesson 4.7 measures 1 step against it.

```hints
nudge: Start from your discounted_returns in policy.py. What changes is where the running total starts, and that it must restart wherever a game ended.
concept: `returns = np.zeros(np.shape(rewards))`, `running = np.asarray(last_values, dtype=float)`, then for t from the last step down to 0: `running = rewards[t] + gamma * (1 - ended[t]) * running` and `returns[t] = running`.
answer: Create `a2c.py` (its imports are for the rest of the lesson):
~~~python
{v_returns}
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_a2c.py -k bootstrap" label="n_step_returns adds up from the critic's last estimate, stops at endings, and works for many CartPoles" -- running = np.asarray(last_values, dtype=float); for t in reversed(range(len(rewards))): running = rewards[t] + gamma * (1 - ended[t]) * running; returns[t] = running.
```

## Cut short is not over

Add `cut_short`:

{fence("a2c.py", v_cut)}

CartPole stops every game at 500 steps. That's **truncated**, not **terminated**: the pole was still up, and lesson 1.3 explained why the difference matters. If the 500th step were treated as an ending, the target there would be just its reward, 1, as though the game had been lost, and the critic would learn that the best positions (the ones that last 500 steps) lead nowhere.

The fix: when a game is cut off, add the critic's estimate of the future it would have had, γ × V(last position), to that step's reward. Then that step counts as ended (its game really is over for this rollout: the CartPole restarts). So its target is 1 + γ × V(last position), exactly what it would have been if the game had gone on.

Worked through with the test: rewards [1, 1, 1], the middle CartPole was cut off, and the critic thinks its last position is worth 7, with γ = 0.5: [1, 1 + 0.5 × 7, 1] = [1, 4.5, 1].

- **`np.array(rewards, dtype=float)`** makes a copy, so the caller's rewards aren't changed (the test checks), and it's floats, so adding 3.5 to a reward doesn't get rounded off.
- **`rewards[truncated] += ...`**: `truncated` is an array of True/False, one per CartPole, and indexing with it picks out only the True ones. `final_values` has one number per cut-off CartPole, in the same order.

```check
run ".venv/Scripts/python -m pytest -q tests/test_a2c.py -k truncated" label="cut_short adds the discounted future to games cut off at 500 steps, without changing the original rewards"
```

## Eight CartPoles at once

Add `make_envs`:

{fence("a2c.py", v_envs)}

- **`gym.vector.SyncVectorEnv([...])`** wraps a list of environments into one that steps them all together. You give it a list of **functions that make** an environment (here 8 copies of `lambda: gym.make("CartPole-v1")`), and it calls each once. `reset` returns observations of shape (8, 4); `step(actions)` takes 8 pushes and returns 8 of everything.
- **`lambda: ...`** is a function written in one expression, with no name: `lambda: gym.make("CartPole-v1")` is a function that takes nothing and returns a new CartPole.
- **`autoreset_mode=gym.vector.AutoresetMode.SAME_STEP`**: when one of the 8 games ends, that CartPole restarts at once, in the same `step` call, and the observation you get back for it is the new game's first one. The last observation of the game that ended goes into `info["final_obs"]`. That's what `cut_short` needs: the critic's estimate of the position the game was cut off in, not the new game's start.

Try it in a scratch file in your project folder:

```python
import numpy as np

from a2c import make_envs

envs = make_envs(3)
obs, _ = envs.reset(seed=0)
print(obs.shape)
obs, rewards, terminated, truncated, info = envs.step(np.array([0, 1, 0]))
print(rewards, terminated, truncated)
```

It prints `(3, 4)`, then three rewards of 1.0 and two arrays of three `False`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_a2c.py -k envs" label="make_envs runs CartPoles side by side and restarts finished ones on their own"
```

## Training

Make `a2c.py` this:

{fence("a2c.py", v_full)}

`train_a2c` is the diagram above, in order:

1. **Collect 5 steps from 8 CartPoles.** Under `torch.no_grad()` (choosing moves needs no slopes), the actor's scores for all 8 observations become a `Categorical` distribution (lesson 4.1), and `.sample()` draws 8 pushes. After each step, cut-off games get their future added (`cut_short`), and everything is kept in four lists.
2. **Ask the critic about now.** `last_values`: V(s) for the 8 positions the CartPoles are in after the 5 steps, the starting point for the targets.
3. **Work out the targets.** `n_step_returns` on the 5 × 8 rewards.
4. **One gradient step on all 40 moves.** The network runs once on all 40 observations (shape (5, 8, 4): PyTorch's layers work on the last dimension and keep the others), `a2c_loss` compares, then lesson 3.4's three lines with one addition:
5. **`nn.utils.clip_grad_norm_(net.parameters(), 0.5)`** limits how big one step can be. It measures the size of all the slopes together (the square root of the sum of their squares, the **norm**), and if it's over 0.5, scales every slope down by the same factor so the norm is exactly 0.5. The direction is unchanged; only a rare huge step is shortened. One unlucky batch can't wreck what's been learned.
6. **Report.** Every 20,000 steps, `play_greedy` plays 5 fresh games choosing the most likely push every time, and the score goes into `curve`. Greedy, because the moves chosen at random during training are deliberately unsure (the entropy bonus), so training games understate what the agent knows.

**`train_a2c`'s inputs:**

| input | what it sets | default |
|---|---|---|
| `total_steps` | how many CartPole steps in all (8 CartPoles × steps each) | 200,000 |
| `seed` | makes the run repeatable: the starting network, the CartPoles' starts, every random push | 0 |
| `n_envs` | CartPoles side by side | 8 |
| `n_steps` | steps per update before bootstrapping | 5 |
| `gamma` | the discount | 0.99 |
| `rate` | Adam's learning rate | 0.002 |
| `value_coef`, `entropy_coef` | the loss weights (lesson 4.3) | 0.5, 0.01 |
| `report_every` | steps between greedy checks | 20,000 |
| `quiet` | `True` turns off the printing (tests and experiments) | `False` |
| `net` | a network to train; `None` makes a new `ActorCritic`. Lesson 4.6 hands in a Keras one | `None` |
| returns | the trained network, and `curve`: a list of (steps, greedy score) pairs | |

**Why `rate=0.002`?** It was measured. With an earlier draft of this file, 200,000 steps and 3 seeds each: a rate of 0.0007 (a common default) scored 443, 170 and 254 on 20 greedy games; 0.002 scored 500, 500 and 500, and 5 more seeds all scored 500 too. Looking 16 steps ahead instead of 5 was no better (449, 477, 305).

Predict, then run it with `.venv\\Scripts\\python a2c.py`. It takes about 25 seconds:

```predict
question: After 200,000 steps (25,000 per CartPole), what will seed 0's greedy score be, averaged over 20 new games?
answer: 500
tolerance: 0
explain: 500, the maximum, in every one of the 20 games. Measured on 5 seeds, every one scored 500, and every one was already at 500 from 120,000 steps onwards. Compare REINFORCE on the same kind of check: 2 of 10 seeds finished at 500 (lesson 4.1), and 6 of 10 with the baseline (lesson 4.2).
verify: script a2c_seed0.py
```

```text
  20000 steps: greedy score 156.6  (1 s)
  40000 steps: greedy score 404.2  (4 s)
  60000 steps: greedy score 143.0  (6 s)
  80000 steps: greedy score 132.0  (8 s)
 100000 steps: greedy score 324.8  (11 s)
 120000 steps: greedy score 500.0  (14 s)
 140000 steps: greedy score 500.0  (16 s)
 160000 steps: greedy score 500.0  (19 s)
 180000 steps: greedy score 500.0  (21 s)
 200000 steps: greedy score 500.0  (24 s)
greedy, 20 new games: 500.0
```

The early wobble (404, then 143) is real: every seed measured did something similar, then settled. Measured on seeds 0 to 4:

| seed | greedy score every 20,000 steps | final, 20 games |
|---|---|---|
| 0 | 156, 404, 143, 132, 324, 500, 500, 500, 500, 500 | 500 |
| 1 | 179, 486, 146, 231, 67, 500, 500, 500, 500, 500 | 500 |
| 2 | 260, 104, 120, 161, 467, 500, 500, 500, 500, 500 | 500 |
| 3 | 198, 169, 426, 151, 134, 500, 500, 500, 500, 500 | 500 |
| 4 | 83, 500, 127, 197, 257, 500, 500, 500, 500, 500 | 500 |

```check
run ".venv/Scripts/python -m pytest -q tests/test_a2c.py -k training" label="train_a2c returns a network and a learning curve, repeatably, and balances CartPole by 120,000 steps" -- Collect n_steps of moves from all envs, add cut_short for truncated games, compute n_step_returns from the critic's last values, then a2c_loss, backward, clip_grad_norm_, step.
run ".venv/Scripts/python -m pytest -q tests/test_a2c.py" label="all lesson 4.4 tests pass"
```

### What you have

A2C, working: 8 CartPoles in step, targets that look 5 steps ahead and then trust the critic, cut-off games that keep their future, and one gradient step per 40 moves. It balances CartPole perfectly on every seed measured, in about 25 seconds. Next lesson: the version that came first, A3C, where the CartPoles don't wait for each other, and what it takes to run several processes without freezing your computer.
'''
write_lesson("04-04-a2c-eight-cartpoles-in-step.md", lesson)
print("ok")
