from build_common import blocks, fence, join, read, write_answer, write_lesson

b = blocks(read("actor_critic.py"))
tests = read("tests/test_actor_critic.py")
v_heads = join(b["header"], b["ActorCritic"])
v_entropy = join(b["header"], b["ActorCritic"], b["entropy"])
v_adv = join(b["header"], b["ActorCritic"], b["entropy"], b["advantage"])
v_full = join(b["header"], b["ActorCritic"], b["entropy"], b["advantage"], b["a2c_loss"])
assert v_full == read("actor_critic.py"), "blocks must rebuild the file exactly"
write_answer("actor_critic_entropy.py", v_entropy)

lesson = f'''
---
title: 4.3 — Actor and Critic
runtime: python
run: actor_critic.py
---

### The story so far

Lessons 4.1 and 4.2 built **REINFORCE** (`policy.py`): a network that turns CartPole's four numbers into two probabilities, one per push; a move drawn at random from them; and, after each game, a gradient step that makes every move more likely in proportion to the **return** that followed it (the discounted sum of the rewards from that move to the end of the game). It learns, but it wobbles: games reach 500 and then fall back, because one game's returns are a noisy verdict on each move. Lesson 4.2 found that centring and scaling the returns helps the gradient's signal-to-noise ratio. Its average was one number for the whole game, though: it can't say whether *this* position was a good one to be in.

### What this lesson asks

What if, for every position, you had a good estimate of how well things usually go from there? Then each move could be judged against it: did the game go **better or worse than expected** after this move? That estimate is a **value**, V(s), the same idea as Chapter 1's Q-values but for a state rather than a state and a move. A network that learns V(s) is called the **critic**. The policy network that chooses moves is the **actor**. Put them together and you have **actor-critic**, and this lesson builds its pieces: the two-headed network, the measure that keeps it exploring, the "better or worse than expected" number, and the loss that trains both.

### How the pieces fit

```text
                 ┌──> actor head  -> 2 scores -> softmax -> probabilities -> choose a push
obs (4 numbers) ─┤ body (shared)
                 └──> critic head -> 1 number: V(s), how well things usually go from here

after some steps:   advantage = what actually happened - V(s)        (better or worse than expected)
loss = policy part (make good-surprise moves likelier)
     + 0.5 x value part (make V(s) closer to what happened)
     - 0.01 x entropy (a bonus for staying unsure, so it keeps exploring)
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_actor_critic.py** above.

{fence("tests/test_actor_critic.py", tests, provided=True)}

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `heads` | one network gives two scores and one value per observation, and both heads read the same body | two separate networks, which the A2C loss then can't train together |
| `entropy` | a fair coin scores log 2, a certain choice 0, and more equal choices score more | a sign slip that makes the bonus reward certainty, so the agent stops exploring at once |
| `advantage` | the advantage is reward + γ × next value − value, with no future after an ending | adding a future after the pole has fallen, the same mistake lesson 1.3's tests guard against |
| `loss` | the three parts of the loss have the values worked out by hand, and the policy part can't move the critic | forgetting `.detach()`, so the actor's loss drags the critic's estimates around |

```check
file tests/test_actor_critic.py -- Click "Create provided tests/test_actor_critic.py" above.
```

## Two heads, one body

Create `actor_critic.py`:

{fence("actor_critic.py", v_heads)}

- **`class ActorCritic(nn.Module)`** is a network written as a class instead of an `nn.Sequential`, because it has two outputs. Subclassing `nn.Module` is how PyTorch networks are usually written: `__init__` creates the layers, and `forward` says how an input flows through them. Calling `net(obs)` runs `forward`. `super().__init__()` must come first: it sets up the bookkeeping that lets `net.parameters()` find every layer assigned to `self`.
- **The body** is a layer of 64 units with the **tanh** bend, which squashes any number into −1 to 1 (ReLU would work too; tanh is the common choice for small actor-critic networks, and it's what was measured for this chapter).
- **Two heads** read the body's 64 numbers: `actor` gives 2 scores (one per push), `critic` gives 1 number (the value).
- **`.squeeze(-1)`** removes the last dimension when it has size 1: the critic's output for 5 observations has shape (5, 1), and `squeeze(-1)` makes it (5,), one plain number per observation, the same shape as the rewards it will be compared with.

**Why share a body?** Both heads need to understand the same thing, where the cart and pole are heading, so they share the work of computing it. Every gradient step from either head improves the shared understanding. Separate networks also work; sharing is the A3C paper's choice and the usual one.

**`ActorCritic`'s parts, and their shapes**, for a batch of 5 observations:

| piece | shape | what it is |
|---|---|---|
| input `obs` | (5, 4) | five CartPole observations |
| `h = self.body(obs)` | (5, 64) | the shared understanding |
| `self.actor(h)` | (5, 2) | two scores per observation (softmax makes them probabilities, lesson 4.1) |
| `self.critic(h).squeeze(-1)` | (5,) | one value per observation |

```check
run ".venv/Scripts/python -m pytest -q tests/test_actor_critic.py -k heads" label="ActorCritic gives two scores and one value per observation, from one shared body" -- self.body = nn.Sequential(nn.Linear(4, hidden), nn.Tanh()); actor = nn.Linear(hidden, 2); critic = nn.Linear(hidden, 1); forward returns self.actor(h), self.critic(h).squeeze(-1).
```

## Your turn: how unsure is a choice?

**Build, on your own:** `entropy(probs)` in `actor_critic.py`.

The actor can learn to be certain too early: put probability 1 on one push before it has found out whether the other was better, and it never tries the other again. A2C prevents this by paying a small bonus for **staying unsure**. The measure of unsureness is called **entropy**, and it's built from **surprise**:

- If something has probability p and it happens, your surprise is **log(1/p)**. Certain things (p = 1) have surprise log 1 = 0. A 50-50 outcome has surprise log 2 = 0.693. A 1-in-100 outcome has surprise log 100 = 4.6.
- **Entropy is the average surprise**, weighting each outcome by how likely it is: the sum of p × log(1/p) over the outcomes.

Worked through for probabilities [0.9, 0.1]:

```text
outcome 1:  p = 0.9,  surprise log(1/0.9) = 0.105,  weighted 0.9 x 0.105 = 0.095
outcome 2:  p = 0.1,  surprise log(1/0.1) = 2.303,  weighted 0.1 x 2.303 = 0.230
entropy = 0.095 + 0.230 = 0.325
```

An outcome with probability 0 never happens, so it adds nothing; but log(1/0) is infinite, and 0 × infinity is `nan` in Python. So leave zero probabilities out before taking logs: `probs > 0` makes an array of True/False, one per entry, and indexing with it, `probs[probs > 0]`, keeps only the entries where it's True.

Write `entropy(probs)` returning a plain `float`. Convert first with `np.asarray(probs, dtype=float)`, so a list works too.

When you've passed the check, see how entropy behaves, in a scratch file:

```python
from actor_critic import entropy

for probs in ([0.5, 0.5], [0.6, 0.4], [0.9, 0.1], [0.99, 0.01], [1.0, 0.0], [0.25, 0.25, 0.25, 0.25]):
    print(f"{{str(probs):26}} entropy {{entropy(probs):.3f}}")
```

```text
[0.5, 0.5]                 entropy 0.693
[0.6, 0.4]                 entropy 0.673
[0.9, 0.1]                 entropy 0.325
[0.99, 0.01]               entropy 0.056
[1.0, 0.0]                 entropy 0.000
[0.25, 0.25, 0.25, 0.25]   entropy 1.386
```

With two choices, entropy is biggest (log 2) for a fair coin and falls to 0 as the choice becomes certain. With four equal choices it's log 4: more ways to be unsure.

```hints
nudge: Three steps: make an array, keep the positive probabilities, add up p × log(1/p).
concept: `probs = np.asarray(probs, dtype=float)`, `used = probs[probs > 0]`, then `float((used * np.log(1 / used)).sum())`.
answer: Add to `actor_critic.py`:
~~~python
def entropy(probs):
    probs = np.asarray(probs, dtype=float)
    used = probs[probs > 0]
    return float((used * np.log(1 / used)).sum())
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_actor_critic.py -k entropy" label="entropy is the average surprise: log 2 for a fair coin, 0 for a certain choice" -- used = probs[probs > 0]; return float((used * np.log(1 / used)).sum()).
```

## Better or worse than expected

Add `advantage`:

{fence("actor_critic.py", v_adv)}

The **advantage** of a move is how much better things went than the critic expected:

```text
advantage = (reward + γ × V(next state)) − V(this state)
             └─ what happened, estimated ─┘   └ what was expected ┘
```

The bracket is exactly lesson 1.3's **target**: the reward you got, plus the discounted value of where you ended up. Lesson 1.3 nudged a Q-value towards it; here, the gap between the target and V(s) has two jobs:

1. **For the critic**, it's an error: V(s) should move towards the target, just as Chapter 1's table did.
2. **For the actor**, it's a verdict on the move: positive means "this move turned out better than usual from here, do it more"; negative means "do it less".

Worked through with the test's numbers: reward 1, the critic expected V(s) = 5, and the next state is worth V(s′) = 6, with γ = 0.9.

```text
target    = 1 + 0.9 x 6 = 6.4
advantage = 6.4 - 5     = 1.4     better than expected: make this move more likely
```

If the pole fell on this step (`terminated`), there's no next state: target = 1, advantage = 1 − 5 = −4, much worse than expected. After a **truncation** (the 500-step limit) the future still counts, for lesson 1.3's reason: the game was cut off, not lost. The next lesson handles that case.

**`advantage`'s inputs:**

| input | what it is | example |
|---|---|---|
| `reward` | the reward for this move | 1.0 (CartPole pays 1 per step) |
| `value` | the critic's V(s) for the position before the move | 5.0 |
| `next_value` | the critic's V(s′) for the position after it | 6.0 |
| `terminated` | did the game end (the pole fell, or the cart left the track)? | `False` |
| `gamma` | the discount, as in Chapter 1 | 0.99 |
| returns | one number: the advantage | 1.4 |

```check
run ".venv/Scripts/python -m pytest -q tests/test_actor_critic.py -k advantage" label="the advantage is reward plus discounted next value minus value, with no future after an ending"
```

## The A2C loss

Add `a2c_loss`:

{fence("actor_critic.py", v_full)}

One loss trains both heads at once. It has three parts:

| part | formula | what minimising it does |
|---|---|---|
| policy | −mean(log π(action) × advantage) | REINFORCE (lesson 4.1) with the advantage in place of the return: moves that went better than expected get likelier |
| value | mean(advantage²) | the critic's mean squared error (Chapter 3's `mse`): V(s) moves towards what happened |
| entropy | mean(entropy of the probabilities) | **subtracted**, so minimising the loss makes entropy *bigger*: a bonus for staying unsure |

`loss = policy + 0.5 × value − 0.01 × entropy`. The weights 0.5 and 0.01 (`value_coef`, `entropy_coef`) are the usual ones (0.01 for entropy is the A3C paper's; 0.5 is OpenAI Baselines' A2C default), and they're what was measured for this chapter.

- **`returns - values`** is the advantage for each move. `returns` holds each move's target, worked out from the rewards (next lesson), so `returns - values` is target − V(s).
- **`advantages.detach()` in the policy part.** `.detach()` gives the same numbers cut off from the computation graph (lesson 3.4's autograd), so the policy part's slopes flow only into the actor. Without it, minimising the policy part would also push the critic's V(s) around, to make the advantages of likely moves bigger: the critic would be trained to flatter the actor instead of to predict. The value part uses the advantage *with* its graph, because there the critic is meant to learn.
- **`dist.log_prob(actions)`** is the log-probability of each move actually taken (lesson 4.1's `choose`), for a whole batch at once.
- **`.item()`** turns each one-number tensor into a plain float for the report. The loss itself stays a tensor, because `backward` needs it.

Worked through with the test's batch: two observations whose scores are both [0, 0] (so probabilities [0.5, 0.5]), values [1, 2], returns [3, 2], moves [0, 1].

```text
advantages      = [3 - 1, 2 - 2]                        = [2, 0]
policy part     = -(log 0.5 x 2 + log 0.5 x 0) / 2      = 0.693
value part      = (2² + 0²) / 2                         = 2.0
entropy         = entropy([0.5, 0.5])                   = 0.693
loss            = 0.693 + 0.5 x 2.0 - 0.01 x 0.693      = 1.686
```

**`a2c_loss`'s inputs, and what it gives back:**

| | what it is | shape for a batch of n moves |
|---|---|---|
| input `logits` | the actor's two scores for each observation | (n, 2) |
| input `values` | the critic's V(s) for each observation | (n,) |
| input `actions` | the move actually taken each time, 0 or 1 | (n,) |
| input `returns` | each move's target: what actually happened, estimated | (n,) |
| input `value_coef`, `entropy_coef` | how much the value and entropy parts count | 0.5, 0.01 |
| returns | the loss (a tensor, ready for `backward`) and a dictionary of its three parts as floats | |

```check
run ".venv/Scripts/python -m pytest -q tests/test_actor_critic.py -k loss" label="a2c_loss combines the policy, value and entropy parts, and the policy part leaves the critic alone" -- advantages = returns - values; policy = -(log_prob(actions) * advantages.detach()).mean(); value = advantages.pow(2).mean(); loss = policy + value_coef * value - entropy_coef * entropy.
run ".venv/Scripts/python -m pytest -q tests/test_actor_critic.py" label="all lesson 4.3 tests pass"
```

### What you have

Every piece of actor-critic, each tested on numbers you can check by hand: a network with an actor head and a critic head on a shared body, entropy as average surprise, the advantage as "better or worse than expected" (lesson 1.3's target minus the critic's estimate), and the loss that trains both heads at once. Next lesson puts them to work on eight CartPoles at once: that's A2C.
'''
write_lesson("04-03-actor-and-critic.md", lesson)
print("ok")
