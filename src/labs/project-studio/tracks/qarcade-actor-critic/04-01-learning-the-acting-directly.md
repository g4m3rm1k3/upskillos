---
title: 4.1 — Learning the Acting Directly
track: Q-Arcade — Actor-Critic on CartPole
trackOrder: 12.5
runtime: python
run: policy.py
---

**Starting a new chapter:** every Q-Arcade chapter uses the same `q-arcade` folder, so your files carry straight on. If the file tree is ever empty, click **Choose folder…** and select `q-arcade`.

### The story so far

Chapters 1 and 2 taught an agent to act by learning **what each move is worth**. It kept a table of scores, one row per situation and one column per move, picked the move with the biggest score, and after every move nudged that score towards a better guess. On CartPole it needed the four numbers squashed into 72 rows first, and then it balanced the pole every time (lesson 2.5: 499.9 ± 0.1). Lesson 2.6 showed where that stops working: finer rows multiply until most are never visited.

Chapter 3 built the replacement for a table: a **network**, a function with knobs that computes its answers from the numbers directly, trained by **gradient descent** (step every knob a little in the direction that lowers a loss). In PyTorch a training step is four lines: `zero_grad`, compute the loss, `backward`, `step`.

### This chapter: actor-critic, and A2C

This chapter puts a network on CartPole a different way. Instead of learning what each move is *worth* and acting on that, the network learns **how likely to make each move**: it learns the acting directly. Adding a second part that judges how well things are going gives **actor-critic**, and its standard form, **A2C**, is the method in your paper. The chapter builds it one idea at a time:

| lesson | the idea |
|---|---|
| 4.1 | a network that outputs probabilities, and REINFORCE, the simplest way to train it |
| 4.2 | a baseline, which makes REINFORCE's learning less noisy, measured |
| 4.3 | the critic, the advantage and the entropy bonus: the pieces of actor-critic |
| 4.4 | A2C: eight CartPoles in step |
| 4.5 | A3C, the asynchronous original, and running several processes safely |
| 4.6 | A2C in Keras |
| 4.7 | an experiment you can write up: seeds, error bars, a results table and a plot |

### What this lesson asks

```text
Chapters 1-2 (values)                         this chapter (a policy)
  table row -> scores: what each move is worth  network -> probabilities: how likely to make each move
  act: take the biggest (plus ε exploring)      act: draw a move at random, by those probabilities
  learn: move a score towards its target        learn: after a game, make the moves that led to long games likelier
```

A function from situations to (probabilities of) moves is called a **policy**, written π (the Greek letter pi, for policy). Learning it directly has two attractions. Exploring is built in: a move with probability 0.3 gets tried about 3 times in 10, with no separate ε. And the network's job is simpler to say: not "estimate the future exactly", just "do more of what worked".

This lesson builds the policy network and the oldest way to train it, **REINFORCE** (Williams, 1992).

### How the pieces fit

```text
make_policy()                 a network: CartPole's 4 numbers in, 2 scores out
probabilities(net, obs)       scores -> softmax -> 2 probabilities that add up to 1
choose(net, obs)              draw a push by those probabilities; also return log(its probability)
discounted_returns(rewards)   after a game: for every move, the discounted sum of the rewards from it to the end
reinforce()                   play a game with choose -> returns -> loss = -sum(log prob x return) -> one gradient step
greedy_lengths(net)           judge it: 20 new games, always the likeliest push (lesson 2.5's way)
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_policy.py** above.

```python file=tests/test_policy.py provided
# Tests for policy.py (lesson 4.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_policy.py
import numpy as np
import torch
from pytest import approx


def three_to_one_net():
    from policy import make_policy
    net = make_policy()
    with torch.no_grad():
        net[-1].weight.zero_()
        net[-1].bias[:] = torch.tensor([0.0, float(np.log(3.0))])
    return net


def test_probs_are_two_numbers_that_add_up_to_one():
    from policy import make_policy, probabilities
    torch.manual_seed(0)
    p = probabilities(make_policy(), np.zeros(4))
    assert p.shape == (2,) and p.sum() == approx(1.0) and (p > 0).all()


def test_probs_follow_the_scores():
    from policy import probabilities
    assert probabilities(three_to_one_net(), np.zeros(4)) == approx([0.25, 0.75]), "scores 0 and log 3: odds of 1 to 3"


def test_returns_add_up_from_the_end():
    from policy import discounted_returns
    assert discounted_returns([1.0, 1.0, 1.0], 0.5) == approx([1.75, 1.5, 1.0])
    assert discounted_returns([1.0, 1.0, 1.0], 1.0) == approx([3.0, 2.0, 1.0])


def test_returns_of_a_reward_only_at_the_end():
    from policy import discounted_returns
    assert discounted_returns([0.0, 0.0, 10.0], 0.9) == approx([8.1, 9.0, 10.0])


def test_returns_are_an_array_of_the_same_length():
    from policy import discounted_returns
    out = discounted_returns([1.0] * 5, 0.99)
    assert isinstance(out, np.ndarray) and out.shape == (5,)


def test_choose_follows_the_probabilities():
    from policy import choose
    net = three_to_one_net()
    torch.manual_seed(0)
    rights = sum(choose(net, np.zeros(4))[0] for _ in range(4000))
    assert rights / 4000 == approx(0.75, abs=0.03), "action 1 should be chosen 3 times in 4"


def test_choose_gives_an_int_and_the_log_of_its_probability():
    from policy import choose
    action, log_prob = choose(three_to_one_net(), np.zeros(4))
    assert type(action) is int and log_prob.item() == approx(np.log([0.25, 0.75][action]), abs=1e-6)


def test_choose_log_probability_carries_slopes():
    from policy import choose, make_policy
    net = make_policy()
    _, log_prob = choose(net, np.zeros(4))
    log_prob.backward()
    assert any(p.grad is not None and p.grad.abs().sum() > 0 for p in net.parameters())


def test_reinforce_gives_a_network_and_episode_lengths():
    from policy import reinforce
    net, lengths = reinforce(episodes=5)
    assert isinstance(net, torch.nn.Module) and len(lengths) == 5 and min(lengths) >= 8


def test_reinforce_is_repeatable_with_a_seed():
    from policy import reinforce
    assert reinforce(episodes=5, seed=3)[1] == reinforce(episodes=5, seed=3)[1]


def test_reinforce_learns_to_balance():
    from policy import greedy_lengths, reinforce
    net, lengths = reinforce(episodes=120)
    assert np.mean(lengths[-20:]) > 3 * np.mean(lengths[:20]), "the games should get much longer"
    assert greedy_lengths(net, episodes=3).shape == (3,)
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `probs` | the network's answer is two positive numbers adding up to 1, and scores of 0 and log 3 give 1 in 4 against 3 in 4 | returning the raw scores, which can be negative and don't add up to 1 |
| `returns` | returns add up from the end, discounted, as an array the same length as the rewards | adding up from the start, so the first move gets credit for nothing |
| `choose` | moves are drawn in the right proportions, as plain ints, with the log of their probability, and that log carries slopes | always taking the likeliest push, which never explores |
| `reinforce` | training returns a network and the length of every game, repeats exactly with a seed, and makes the games much longer | a sign slip that trains the agent to *drop* the pole as fast as possible |

`three_to_one_net()` builds a policy whose answer is known in advance: it zeroes the last layer's weights, so the input makes no difference, and sets its biases to 0 and log 3, so the scores are always [0, log 3]. Softmax turns those into [0.25, 0.75], as the next step shows.

```check
file tests/test_policy.py -- Click "Create provided tests/test_policy.py" above.
```

## A network that gives probabilities

Create `policy.py`:

```python file=policy.py
import gymnasium as gym
import numpy as np
import torch
from torch import nn


def make_policy(hidden=64):
    return nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))


def probabilities(net, obs):
    with torch.no_grad():
        return torch.softmax(net(torch.tensor(obs, dtype=torch.float32)), dim=-1).numpy()
```

- **`make_policy`** is Chapter 3's kind of network: 4 inputs (CartPole's numbers), 64 hidden units with the **tanh** bend (it squashes any number into −1 to 1; lesson 4.3 uses it again), and 2 outputs, one **score** per push. A score can be any number.
- **`probabilities`** turns the two scores into probabilities with **softmax**.

**Softmax, stepped through.** Take e to the power of each score (e ≈ 2.718; `exp` for short), then divide each by their total:

```text
scores           [0, log 3]
exp              [e⁰, e^(log 3)]  = [1, 3]       exp undoes log, and any number to the power 0 is 1
divide by 4      [1/4, 3/4]       = [0.25, 0.75]
```

Exponentials are always positive, and dividing by the total makes them add up to 1, so any scores at all become valid probabilities. A bigger score means a bigger share. See it with a loop, in a scratch file:

```python
import math

for scores in ([0.0, 0.0], [1.0, 0.0], [2.0, 0.0], [5.0, 5.0], [0.0, math.log(3)]):
    e = [math.exp(s) for s in scores]
    print(f"scores {str([round(s, 3) for s in scores]):14} exp {str([round(x, 3) for x in e]):18} probabilities {[round(x / sum(e), 3) for x in e]}")
```

```text
scores [0.0, 0.0]     exp [1.0, 1.0]         probabilities [0.5, 0.5]
scores [1.0, 0.0]     exp [2.718, 1.0]       probabilities [0.731, 0.269]
scores [2.0, 0.0]     exp [7.389, 1.0]       probabilities [0.881, 0.119]
scores [5.0, 5.0]     exp [148.413, 148.413] probabilities [0.5, 0.5]
scores [0.0, 1.099]   exp [1.0, 3.0]         probabilities [0.25, 0.75]
```

Only the **difference** between the scores matters: [5, 5] gives the same 50-50 as [0, 0]. A difference of 1 is about 73-27, a difference of 2 about 88-12.

- **`torch.softmax(..., dim=-1)`** does this across the last dimension (the two scores). **`torch.no_grad()`** because this function is only for looking: no slopes needed. **`.numpy()`** hands back an ordinary array.

```check
run ".venv/Scripts/python -m pytest -q tests/test_policy.py -k probs" label="probabilities turns the network's two scores into two probabilities that add up to 1" -- with torch.no_grad(): return torch.softmax(net(torch.tensor(obs, dtype=torch.float32)), dim=-1).numpy().
```

## Your turn: what each move led to

**Build, on your own:** `discounted_returns(rewards, gamma)` in `policy.py`.

REINFORCE judges each move by what came **after** it: the rewards from that move to the end of the game, each discounted by γ once per step of delay (Chapter 1's discount). That sum is the move's **return**, written G:

```text
G(t) = r(t) + γ x r(t+1) + γ² x r(t+2) + ... + γ^(last - t) x r(last)
```

Adding that up separately for every move would repeat the same work over and over. Notice that each return contains the next one:

```text
G(t) = r(t) + γ x G(t+1)                and after the last move there's nothing: G(last) = r(last)
```

That's a **recurrence relation** (lesson 1.3), and it means the returns can be computed in one pass **backwards**: start at the last move with a running total of 0, and at each step going back, `running = rewards[t] + gamma * running`, then store it as `returns[t]`.

Worked through with the first test: rewards [1, 1, 1], γ = 0.5.

```text
start:  running = 0
t = 2:  running = 1 + 0.5 x 0     = 1        returns[2] = 1
t = 1:  running = 1 + 0.5 x 1     = 1.5      returns[1] = 1.5
t = 0:  running = 1 + 0.5 x 1.5   = 1.75     returns[0] = 1.75
```

The first move gets the most credit, because the most reward followed it. In CartPole every step pays 1, so a move's return is lesson 2.4's **geometric series**: about 1 / (1 − γ) = 100 for an early move in a long game with γ = 0.99, and just 1 for the move that let the pole fall.

Return a NumPy array: make it first with `np.zeros(len(rewards))`. `reversed(range(len(rewards)))` counts t = last, …, 1, 0.

```hints
nudge: You need a running total that starts at 0, a loop that goes backwards, and an array to store each step's total.
concept: `returns = np.zeros(len(rewards))`, `running = 0.0`, then `for t in reversed(range(len(rewards))):` with `running = rewards[t] + gamma * running` and `returns[t] = running`.
answer: Add to `policy.py`:
~~~python
def discounted_returns(rewards, gamma):
    returns = np.zeros(len(rewards))
    running = 0.0
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * running
        returns[t] = running
    return returns
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_policy.py -k returns" label="discounted_returns adds the rewards up backwards, discounted, into an array" -- running = 0.0; for t in reversed(range(len(rewards))): running = rewards[t] + gamma * running; returns[t] = running.
```

## Choosing by chance

Add `choose`, between `probabilities` and your `discounted_returns`:

```python file=policy.py
import gymnasium as gym
import numpy as np
import torch
from torch import nn


def make_policy(hidden=64):
    return nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))


def probabilities(net, obs):
    with torch.no_grad():
        return torch.softmax(net(torch.tensor(obs, dtype=torch.float32)), dim=-1).numpy()


def choose(net, obs):
    dist = torch.distributions.Categorical(logits=net(torch.tensor(obs, dtype=torch.float32)))
    action = dist.sample()
    return int(action), dist.log_prob(action)


def discounted_returns(rewards, gamma):
    returns = np.zeros(len(rewards))
    running = 0.0
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * running
        returns[t] = running
    return returns
```

- **`torch.distributions.Categorical(logits=...)`** is PyTorch's "pick one of these, with these chances". Given the scores (in machine learning, raw scores before softmax are called **logits**), it applies softmax itself.
- **`dist.sample()`** draws one move. With probabilities [0.25, 0.75] it gives 1 about three times in four (the first `choose` test counts 4,000 draws).
- **`dist.log_prob(action)`** is log(probability of the move it drew), *with* the computation graph attached, so a gradient step can change it. That's why `choose` doesn't use `no_grad`.

**Why the log?** Training will push up the probability of moves that led to long games. Pushing up log π(move) does the same thing as pushing up π(move) (log grows whenever its input grows), but its slope has a very simple form. For two moves with probabilities p₀ and p₁, the slope of log p₁ is **1 − p₁** with respect to move 1's score, and **−p₀** with respect to move 0's. So the push on a move's score is big when the move was unlikely and small when it was already likely: it automatically spends the effort where it's needed. Check the slopes by nudging, as in lesson 3.2:

```python
import math

def probs(s0, s1):
    e0, e1 = math.exp(s0), math.exp(s1)
    return e0 / (e0 + e1), e1 / (e0 + e1)

s0, s1 = 0.0, math.log(3)
p0, p1 = probs(s0, s1)
h = 1e-6
for name, (d0, d1) in {"score 0": (h, 0.0), "score 1": (0.0, h)}.items():
    q0, q1 = probs(s0 + d0, s1 + d1)
    print(f"nudge {name}: log p(push 1) changes at {(math.log(q1) - math.log(p1)) / h:+.4f}")
print(f"formula: for score 1, 1 - p1 = {1 - p1:+.4f};  for score 0, -p0 = {-p0:+.4f}")
```

```text
nudge score 0: log p(push 1) changes at -0.2500
nudge score 1: log p(push 1) changes at +0.2500
formula: for score 1, 1 - p1 = +0.2500;  for score 0, -p0 = -0.2500
```

Raising move 1's score makes it likelier; raising move 0's makes move 1 less likely. PyTorch's autograd works this out for every knob in the network (lesson 3.4).

```check
run ".venv/Scripts/python -m pytest -q tests/test_policy.py -k choose" label="choose draws pushes by their probabilities and returns the log of the chosen one's probability, with slopes attached" -- dist = torch.distributions.Categorical(logits=net(...)); action = dist.sample(); return int(action), dist.log_prob(action).
```

## REINFORCE

Make `policy.py` this:

```python file=policy.py
import gymnasium as gym
import numpy as np
import torch
from torch import nn


def make_policy(hidden=64):
    return nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))


def probabilities(net, obs):
    with torch.no_grad():
        return torch.softmax(net(torch.tensor(obs, dtype=torch.float32)), dim=-1).numpy()


def choose(net, obs):
    dist = torch.distributions.Categorical(logits=net(torch.tensor(obs, dtype=torch.float32)))
    action = dist.sample()
    return int(action), dist.log_prob(action)


def discounted_returns(rewards, gamma):
    returns = np.zeros(len(rewards))
    running = 0.0
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * running
        returns[t] = running
    return returns


def reinforce(episodes=300, seed=0, gamma=0.99, rate=0.01):
    torch.manual_seed(seed)
    env = gym.make("CartPole-v1")
    net = make_policy()
    optimiser = torch.optim.Adam(net.parameters(), lr=rate)
    lengths = []
    obs, _ = env.reset(seed=seed)
    for episode in range(episodes):
        if episode > 0:
            obs, _ = env.reset()
        log_probs, rewards = [], []
        while True:
            action, log_prob = choose(net, obs)
            obs, reward, terminated, truncated, _ = env.step(action)
            log_probs.append(log_prob)
            rewards.append(reward)
            if terminated or truncated:
                break
        returns = discounted_returns(rewards, gamma)
        loss = -(torch.stack(log_probs) * torch.tensor(returns, dtype=torch.float32)).sum()
        optimiser.zero_grad()
        loss.backward()
        optimiser.step()
        lengths.append(len(rewards))
    return net, lengths


def greedy_lengths(net, episodes=20, seed=1000):
    env = gym.make("CartPole-v1")
    lengths = []
    for i in range(episodes):
        obs, _ = env.reset(seed=seed + i)
        steps = 0
        while True:
            action = int(probabilities(net, obs).argmax())
            obs, _, terminated, truncated, _ = env.step(action)
            steps += 1
            if terminated or truncated:
                break
        lengths.append(steps)
    return np.array(lengths)


if __name__ == "__main__":
    torch.set_num_threads(1)
    net, lengths = reinforce()
    for start in range(0, len(lengths), 25):
        print(f"episodes {start + 1:3}-{start + 25:3}: average length {np.mean(lengths[start:start + 25]):6.1f}")
    print("greedy, 20 new games:", greedy_lengths(net).mean())
```

**REINFORCE**, one game at a time:

1. **Play a whole game** with `choose`, keeping every move's log-probability and every reward.
2. **Work out every move's return** with `discounted_returns`.
3. **The loss: `-(log_probs × returns).sum()`.** Each move contributes log π(move) × G. Making that bigger pushes up the probability of each move, and pushes harder for moves followed by a big return. The optimiser goes **downhill**, and we want this sum to go **up**, so the loss is its negative: going downhill on −x is going uphill on x.
4. **One gradient step** (lesson 3.4's lines, with Adam, lesson 3.5).

Every move in the game is pushed up: in CartPole every return is positive. Moves followed by long survival are pushed up much more (G near 100) than moves just before the pole fell (G near 1). Over many games, that difference is what teaches it.

- **`torch.stack(log_probs)`** turns the list of one-number tensors into one tensor, keeping the graph, so the loss can be differentiated with respect to every move's probability at once.
- **`greedy_lengths`** judges the trained policy the way lesson 2.5 judged the table: 20 new games, seeds 1000 to 1019 (different from training), always taking the likeliest push.
- **`reinforce`'s inputs:** `episodes` (games to train on, 300), `seed` (makes the run repeatable), `gamma` (0.99) and `rate` (Adam's learning rate, 0.01). It returns the trained network and a list of every game's length.

Run it with `.venv\Scripts\python policy.py`. It takes about half a minute:

```text
episodes   1- 25: average length   26.4
episodes  26- 50: average length   30.8
episodes  51- 75: average length   87.1
episodes  76-100: average length  164.3
episodes 101-125: average length  232.1
episodes 126-150: average length   63.8
episodes 151-175: average length   88.1
episodes 176-200: average length   99.6
episodes 201-225: average length  123.2
episodes 226-250: average length  119.4
episodes 251-275: average length  313.0
episodes 276-300: average length  340.2
greedy, 20 new games: 496.5
```

Predict before you look closely at those numbers:

```predict
question: Seed 0 first reaches a 500-step game around episode 100. Will its games stay at 500 from then on?
choice: Yes: it stays
choice: No: it falls back
answer: No: it falls back
explain: It falls back. Its games averaged 232 steps over episodes 101 to 125, then 64 over episodes 126 to 150, and took until episode 250 to recover. Its final greedy score, 496.5, happens to be nearly perfect, but on another seed the same code ends at 9. Reaching 500 once is not the same as having learned to stay there.
verify: script reinforce_seed0.py
```

**Measured on 10 seeds** (greedy score: the average of 20 new games, each at most 500):

| seed | greedy score | first 500-step game, at episode |
|---|---|---|
| 0 | 496 | 98 |
| 1 | 500 | 195 |
| 2 | 123 | never |
| 3 | 265 | 135 |
| 4 | 69 | never |
| 5 | 9 | never |
| 6 | 74 | never |
| 7 | 9 | never |
| 8 | 500 | 240 |
| 9 | 234 | 90 |

Two seeds finished at 500 and one at 496; three ended between 120 and 270, two near 70, and two at 9 (the pole falls almost at once). The average is 228 ± 65 (standard error, lesson 2.5). Each run took 2 to 34 seconds: failed runs are quick, because their games are short.

Why? Each update is based on **one game**. A game's returns are a noisy verdict on its moves: a good move followed by bad luck gets little credit, and a bad move followed by good luck gets a lot. Every move in a long game gets pushed up, the bad ones included. One unlucky update can undo many good ones, and a policy that has become nearly certain can't easily find its way back, because it hardly ever tries anything else. The next lesson tackles the noise.

```check
run ".venv/Scripts/python -m pytest -q tests/test_policy.py -k reinforce" label="reinforce trains the policy from whole games, repeatably, and the games get much longer"
run ".venv/Scripts/python -m pytest -q tests/test_policy.py" label="all lesson 4.1 tests pass"
```

### What you have

A policy network, moves drawn by chance from its probabilities, returns computed backwards, and REINFORCE: after each game, make every move more likely in proportion to what followed it. It learns to balance, sometimes perfectly, and it's unreliable. That unreliability is what the rest of this chapter fixes, one idea at a time.
