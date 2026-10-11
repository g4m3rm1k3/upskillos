---
title: 4.5 — A3C: Workers That Don't Wait
runtime: python
run: a3c.py
---

### The story so far

Lesson 4.4's `train_a2c` (`a2c.py`) runs 8 CartPoles **in step**: every CartPole takes a step, then the next, and every 5 steps all 40 moves go into one gradient step on one network. `n_step_returns` turns each move's rewards into a target that looks 5 steps ahead and then trusts the critic, `cut_short` keeps the future of games cut off at 500 steps, and `a2c_loss` (`actor_critic.py`) trains the actor and the critic together. It scored 500 on every seed measured, in about 25 seconds.

### What this lesson asks

A2C is actually the simplified version. The original, from DeepMind's 2016 paper *Asynchronous Methods for Deep Reinforcement Learning* (Mnih et al.), is **A3C**: **Asynchronous** Advantage Actor-Critic. Instead of one program stepping 8 CartPoles together, it starts several separate **worker processes**, each with its own CartPole and its own copy of the network. Each worker plays a few steps, works out its own gradient, and pushes it into one **shared** network, without waiting for the others. "Asynchronous" means exactly that: no waiting.

The paper's point was speed on ordinary computers: many CPU cores, each running a worker, no graphics card needed. A year later, OpenAI found that the synchronous version, A2C, did just as well and used the hardware better, and A2C became the usual choice. Your paper is about A2C, so this lesson is here for understanding where it came from, and the difference measured on your own machine.

Running several processes at once is also how the series once froze its author's computer, so this lesson starts with that.

### How the pieces fit

```text
main process:  shared = ActorCritic(); shared.share_memory()        one network, in memory every process can see
               start 2 worker processes, wait for both to finish

each worker, over and over, until 200,000 steps in all:
   local <- copy of shared's numbers           (load_state_dict)
   play up to 5 steps on its own CartPole with local
   n_step_returns, a2c_loss on local -> backward -> clip       (lesson 4.4's pieces, unchanged)
   hand_over: copy local's slopes onto shared's knobs
   optimiser.step() on shared                  (the other worker may be halfway through its own steps: no waiting)
```

```text
A2C (lesson 4.4), one process:        A3C, two processes:
  step 8 CartPoles  ┐                   worker 0: play 5 ── update ── play 5 ── update ── ...
  step 8 CartPoles  │ 5 times            worker 1:   play 5 ── update ── play 5 ── update ── ...
  ...               ┘                    (updates land whenever each worker is ready)
  update (all wait for it)
```

## Before you start processes: don't freeze your computer

Every PyTorch program, by default, uses **as many threads as your processor has cores**: separate streams of work that run at the same time. For one program that's usually fine. For several programs at once it isn't: 6 programs each grabbing every core means 6 times more work than there are cores to do it, and everything on the computer, the mouse included, waits its turn. That's what froze this series' computer once, with 6 training runs started at the same time.

For networks this small, the extra threads barely help anyway. Measured on one A2C run of 60,000 steps:

```text
threads=20  wall   8.3 s  CPU   51.5 s
threads= 1  wall   6.4 s  CPU    6.2 s
```

The default used 20 threads and kept about 6 cores busy for a little speed. One thread did the same work on one core. Two rules follow, and `a3c.py` builds them in:

1. **`torch.set_num_threads(1)` in every process** that trains: the main program and each worker.
2. **A cap on the number of processes.** `MAX_WORKERS = 2`, and `train_a3c` refuses to start more.

And how to check, and stop, a runaway:

- **Task Manager** (Ctrl+Shift+Esc), **Details** tab, sorted by CPU: each worker is a separate `python.exe`. With the rules above, each should use about one core's share: 100% divided by the number of cores (Task Manager's **Performance** tab shows how many; on a processor with 28 logical cores, about 4% each).
- **Ctrl+C** in the terminal stops the program and, with it, its workers. If a worker is left behind, end it in Task Manager, or in PowerShell: `Get-Process python | Stop-Process` (which stops *every* Python program, so close any you want to keep first).

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_a3c.py** above.

```python file=tests/test_a3c.py provided
# Tests for a3c.py (lesson 4.5).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_a3c.py
import pytest
import torch


def test_handover_gives_the_central_network_the_workers_slopes():
    from a3c import hand_over
    from actor_critic import ActorCritic
    local, shared = ActorCritic(), ActorCritic()
    logits, value = local(torch.randn(3, 4))
    (logits.sum() + value.sum()).backward()
    hand_over(local, shared)
    for l, s in zip(local.parameters(), shared.parameters()):
        assert torch.equal(l.grad, s.grad)


def test_handover_copies_rather_than_shares():
    from a3c import hand_over
    from actor_critic import ActorCritic
    local, shared = ActorCritic(), ActorCritic()
    logits, value = local(torch.randn(3, 4))
    (logits.sum() + value.sum()).backward()
    hand_over(local, shared)
    first = next(local.parameters())
    first.grad.zero_()
    assert next(shared.parameters()).grad.abs().sum() > 0, "zeroing the worker's slopes must not zero the central ones"


def test_cap_refuses_more_than_two_workers():
    from a3c import MAX_WORKERS, train_a3c
    assert MAX_WORKERS == 2
    with pytest.raises(ValueError):
        train_a3c(workers=3, total_steps=10)
    with pytest.raises(ValueError):
        train_a3c(workers=0, total_steps=10)


def test_shared_network_learns_from_both_workers():
    from a3c import train_a3c
    from actor_critic import ActorCritic
    torch.manual_seed(0)
    before = [p.detach().clone() for p in ActorCritic().parameters()]
    shared, steps = train_a3c(workers=2, total_steps=400, seed=0)
    assert steps >= 400
    assert any(not torch.equal(a, b) for a, b in zip(before, shared.parameters())), "the workers' steps must reach the shared network"
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `handover` | a worker's slopes land on the shared network's knobs, as copies | shared slopes that change when the worker clears its own for the next round, so updates vanish |
| `cap` | asking for 3 workers, or 0, is refused | a typo like `workers=20` freezing the computer |
| `shared` | two real worker processes run, count their steps, and change the shared network | workers that train their own copies and never touch the shared one, so the main program gets an untrained network back |

```check
file tests/test_a3c.py -- Click "Create provided tests/test_a3c.py" above.
```

## Your turn: handing over the slopes

**Build, on your own:** a new file `a3c.py` with `MAX_WORKERS = 2` and `hand_over(local, shared)`.

A worker computes slopes on its **local** copy of the network: `loss.backward()` fills each local knob's `.grad`. The optimiser, though, steps the **shared** network's knobs. So the slopes have to be moved across: for each pair of matching knobs, set the shared knob's `.grad` to the local knob's.

- `zip(local.parameters(), shared.parameters())` pairs them up in order: both networks are `ActorCritic`s, so their knobs come in the same order with the same shapes.
- **Copy, don't share.** `shared_param.grad = local_param.grad` would make both names point at the *same* tensor. The next time the worker clears its local slopes (`local.zero_grad()`), the shared ones would be cleared too, and if the optimiser hadn't stepped yet, the update would be lost. `.clone()` makes a separate copy with the same numbers.

Start the file with the imports the rest of the lesson needs: `time`, `gymnasium as gym`, `numpy as np`, `torch`, `torch.multiprocessing as mp` (Python's `multiprocessing`, extended by PyTorch to share tensors between processes), `nn` from `torch`, `n_step_returns` and `play_greedy` from `a2c`, and `ActorCritic` and `a2c_loss` from `actor_critic`. The hint's answer shows them.

```hints
nudge: A loop over pairs of knobs, one line inside it.
concept: `for local_param, shared_param in zip(local.parameters(), shared.parameters()):` then `shared_param.grad = local_param.grad.clone()`.
answer: Create `a3c.py`:
~~~python
import time

import gymnasium as gym
import numpy as np
import torch
import torch.multiprocessing as mp
from torch import nn

from a2c import n_step_returns, play_greedy
from actor_critic import ActorCritic, a2c_loss

MAX_WORKERS = 2


def hand_over(local, shared):
    for local_param, shared_param in zip(local.parameters(), shared.parameters()):
        shared_param.grad = local_param.grad.clone()
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_a3c.py -k handover" label="hand_over copies each local slope onto the matching shared knob" -- for local_param, shared_param in zip(local.parameters(), shared.parameters()): shared_param.grad = local_param.grad.clone().
```

## Workers and the shared network

Make `a3c.py` this:

```python file=a3c.py
import time

import gymnasium as gym
import numpy as np
import torch
import torch.multiprocessing as mp
from torch import nn

from a2c import n_step_returns, play_greedy
from actor_critic import ActorCritic, a2c_loss

MAX_WORKERS = 2


def hand_over(local, shared):
    for local_param, shared_param in zip(local.parameters(), shared.parameters()):
        shared_param.grad = local_param.grad.clone()


def worker(rank, shared, counter, total_steps, seed, n_steps, gamma, rate, value_coef, entropy_coef):
    torch.set_num_threads(1)
    torch.manual_seed(seed + rank)
    env = gym.make("CartPole-v1")
    local = ActorCritic()
    optimiser = torch.optim.Adam(shared.parameters(), lr=rate)
    obs, _ = env.reset(seed=seed + rank)
    while counter.value < total_steps:
        local.load_state_dict(shared.state_dict())
        batch_obs, batch_actions, batch_rewards, batch_ended = [], [], [], []
        for _ in range(n_steps):
            with torch.no_grad():
                logits, _ = local(torch.tensor(obs, dtype=torch.float32))
            action = int(torch.distributions.Categorical(logits=logits).sample())
            next_obs, reward, terminated, truncated, _ = env.step(action)
            if truncated:
                with torch.no_grad():
                    reward += gamma * float(local(torch.tensor(next_obs, dtype=torch.float32))[1])
            batch_obs.append(obs)
            batch_actions.append(action)
            batch_rewards.append(reward)
            batch_ended.append(terminated or truncated)
            obs = next_obs
            if terminated or truncated:
                obs, _ = env.reset()
                break
        with counter.get_lock():
            counter.value += len(batch_rewards)
        with torch.no_grad():
            last_value = float(local(torch.tensor(obs, dtype=torch.float32))[1])
        returns = n_step_returns(np.array(batch_rewards), np.array(batch_ended, dtype=float), last_value, gamma)
        logits, values = local(torch.tensor(np.array(batch_obs), dtype=torch.float32))
        loss, _ = a2c_loss(logits, values, torch.tensor(batch_actions),
                           torch.tensor(returns, dtype=torch.float32), value_coef, entropy_coef)
        local.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(local.parameters(), 0.5)
        hand_over(local, shared)
        optimiser.step()


def train_a3c(workers=2, total_steps=200_000, seed=0, n_steps=5, gamma=0.99, rate=0.002,
              value_coef=0.5, entropy_coef=0.01):
    if not 1 <= workers <= MAX_WORKERS:
        raise ValueError(f"workers must be 1 to {MAX_WORKERS}: more processes than that can freeze the computer")
    torch.manual_seed(seed)
    shared = ActorCritic()
    shared.share_memory()
    counter = mp.Value("i", 0)
    args = (shared, counter, total_steps, seed, n_steps, gamma, rate, value_coef, entropy_coef)
    processes = [mp.Process(target=worker, args=(rank, *args)) for rank in range(workers)]
    for process in processes:
        process.start()
    for process in processes:
        process.join()
    return shared, counter.value


if __name__ == "__main__":
    mp.set_start_method("spawn")
    torch.set_num_threads(1)
    start = time.perf_counter()
    net, steps = train_a3c()
    print(f"{steps} steps in {time.perf_counter() - start:.0f} s")
    print("greedy, 20 new games:", play_greedy(net).mean())
```

**`worker`** is lesson 4.4's loop for one CartPole, with three differences:

- **It starts each round by copying the shared network.** `shared.state_dict()` is the network's numbers as a dictionary, one entry per tensor of knobs, and `local.load_state_dict(...)` copies each one into the matching knob of `local`. Meanwhile the other worker may update `shared`, so `local` is always a snapshot from a moment ago.
- **A round stops early if the game ends**, instead of carrying on into the next game: a single CartPole has no other games to fill the batch with.
- **The optimiser steps `shared`.** Each worker makes its own `Adam` over the shared knobs (the paper shared the optimiser's statistics between workers too; separate ones are simpler and work here).

**`train_a3c`** starts the workers:

- **`shared.share_memory()`** moves the network's numbers into memory that other processes can see. Normally each process has its own private memory, and a change in one is invisible to the others.
- **`mp.Value("i", 0)`** is one shared whole number (`"i"` for integer), the total steps so far. Two workers adding to it at the same moment could both read 100, both add 5, and both write 105, losing 5 steps: `with counter.get_lock():` makes each addition finish before the next starts.
- **`mp.Process(target=worker, args=(rank, *args))`** describes a process that will run `worker(rank, ...)`; `.start()` starts it, and `.join()` waits for it to finish. `rank` (0 or 1) gives each worker its own seed, so they don't play identical games.

**Windows starts each process from scratch.** It runs a fresh Python, imports `a3c.py` into it, and then calls `worker`. Two consequences:

1. **`if __name__ == "__main__":` matters here.** Without it, each new process, importing `a3c.py`, would run the training code itself, start its own workers, and so on. The guard means "only in the program you started".
2. **`worker` must be a top-level function** in the file, so the new process can find it by name after importing. `mp.set_start_method("spawn")` says to use this fresh-start method on every system, so the code behaves the same on Windows, Mac and Linux.

**`train_a3c`'s inputs:** `workers` (1 or 2), `total_steps` across all workers (200,000), and the same `seed`, `n_steps`, `gamma`, `rate`, `value_coef` and `entropy_coef` as `train_a2c`. It returns the shared network and the number of steps actually taken (a little over `total_steps`, because a worker finishes its round).

Predict, then run it with `.venv\Scripts\python a3c.py`:

```predict
question: A2C took about 25 seconds for 200,000 steps. How long will A3C with 2 workers take for the same 200,000?
choice: About 12 seconds: two workers, twice as fast
choice: About 25 seconds: the same
choice: Much longer: over a minute
answer: Much longer: over a minute
verify: script a3c_time.py
explain: 79 seconds on the machine this series was written on, and it still reached a greedy score of 500. Two workers on two cores don't make it twice as fast, because each worker asks its network about one CartPole at a time, 200,000 tiny calls in all, while A2C asks about 8 at once, 25,000 bigger calls. A network call costs almost as much for 8 observations as for 1. Starting each worker also means starting a new Python and importing PyTorch, a few seconds each. This is OpenAI's 2017 finding, on your own machine: on one computer, the synchronous version uses the hardware better.
```

```text
200001 steps in 79 s
greedy, 20 new games: 500.0
```

Measured on 3 seeds with an earlier draft of this file: 500, 500 and 500, in 118 to 122 seconds each, while other training ran on the same computer. Alone, this file took 79 seconds. A3C works. It's just slower here than A2C, which does the same learning in lock-step.

```check
run ".venv/Scripts/python -m pytest -q tests/test_a3c.py -k cap" label="train_a3c refuses more than MAX_WORKERS workers"
run ".venv/Scripts/python -m pytest -q tests/test_a3c.py -k shared" label="two worker processes run and update the shared network" -- Each worker copies shared into local, plays up to n_steps, computes the loss on local, hand_over(local, shared), then steps an optimiser over shared.parameters().
run ".venv/Scripts/python -m pytest -q tests/test_a3c.py" label="all lesson 4.5 tests pass"
```

### What you have

A3C as the paper described it: worker processes, each with its own CartPole and its own copy of the network, pushing gradients into a shared network without waiting. You've measured why A2C replaced it on a single computer, and every training process you start from now on uses one thread and a capped number of workers.
