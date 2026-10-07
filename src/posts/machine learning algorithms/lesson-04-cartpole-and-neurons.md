# Lesson 4: CartPole and Neurons

**Goal:** understand what CartPole actually is, why the maze's table can't handle it, and what a neuron is: **the knobs-in-a-formula answer to "a table is impossible here"**.

**You will type:** onto the bottom of `learning_lab.py`. `import math` goes at the top beside `import random`.

---

## What CartPole is

A cart sits on a track. A pole is hinged on top of it, balanced upright, and gravity wants it to fall over. Every tiny time step you may do exactly one thing: **push the cart left or push it right.** You win by keeping the pole up for as long as possible. You lose if the pole tilts past about 12 degrees or the cart runs off the end of the track.

At every instant the whole situation is described by four numbers (the **state**):

| state number | meaning |
|---|---|
| `cart_position` | where the cart is on the track |
| `cart_velocity` | how fast the cart is moving |
| `pole_angle` | how far the pole leans (positive = to the right) |
| `pole_angular_velocity` | how fast the pole is falling over |

So in plain terms: **the algorithm looks at four numbers and answers one yes/no question: push right?**

### Why the maze's table won't work

The maze had 13 squares. A table with one row per square was easy. CartPole's squares are *real numbers*: the angle could be 0.01, 0.0100001, 0.01000001... There are infinitely many states, and the agent almost never sees exactly the same one twice. You can't have a table row for each.

Two ways out:

1. **Bucket it.** Chop each number into a few ranges (angle: leaning-left / upright / leaning-right) and keep a table over buckets. Crude, and it explodes as numbers grow.
2. **Use a formula.** Replace the table lookup with a *calculation* from the four state numbers to a decision. The calculation has knobs (**weights**), and learning tunes the weights. Nearby states automatically get similar answers, because a formula is smooth.

Option 2 is where neurons come from.

---

## Step 1: The cart-pole world

This is the physics. **You do not need to understand the formulas inside `step`.** Copy it carefully, treat it as a black box, and focus on the *interface*. Add `import math` at the top of the file first.

```python
class CartPole:
    GRAVITY = 9.8
    CART_MASS = 1.0
    POLE_MASS = 0.1
    TOTAL_MASS = CART_MASS + POLE_MASS
    POLE_HALF_LENGTH = 0.5
    POLE_MASS_TIMES_LENGTH = POLE_MASS * POLE_HALF_LENGTH
    PUSH_STRENGTH = 10.0
    TIME_STEP = 0.02
    TRACK_LIMIT = 2.4
    FALL_ANGLE = 12 * math.pi / 180

    def reset(self):
        self.cart_position = random.uniform(-0.05, 0.05)
        self.cart_velocity = random.uniform(-0.05, 0.05)
        self.pole_angle = random.uniform(-0.05, 0.05)
        self.pole_angular_velocity = random.uniform(-0.05, 0.05)
        return self.state()

    def state(self):
        return [self.cart_position, self.cart_velocity,
                self.pole_angle, self.pole_angular_velocity]

    def step(self, push_right):
        force = self.PUSH_STRENGTH if push_right else -self.PUSH_STRENGTH
        cosine = math.cos(self.pole_angle)
        sine = math.sin(self.pole_angle)
        helper = (force + self.POLE_MASS_TIMES_LENGTH * self.pole_angular_velocity ** 2 * sine) / self.TOTAL_MASS
        pole_acceleration = (self.GRAVITY * sine - cosine * helper) / (
            self.POLE_HALF_LENGTH * (4.0 / 3.0 - self.POLE_MASS * cosine ** 2 / self.TOTAL_MASS))
        cart_acceleration = helper - self.POLE_MASS_TIMES_LENGTH * pole_acceleration * cosine / self.TOTAL_MASS
        self.cart_position += self.TIME_STEP * self.cart_velocity
        self.cart_velocity += self.TIME_STEP * cart_acceleration
        self.pole_angle += self.TIME_STEP * self.pole_angular_velocity
        self.pole_angular_velocity += self.TIME_STEP * pole_acceleration
        fallen = (abs(self.cart_position) > self.TRACK_LIMIT
                  or abs(self.pole_angle) > self.FALL_ANGLE)
        return self.state(), fallen
```

**The interface (this is what matters):**

- `reset()` starts a new attempt with everything almost perfectly balanced (tiny random wobble) and returns the four-number state as a list.
- `step(push_right)` takes `True` (push right) or `False` (push left), advances the world by 0.02 seconds, and returns `(new_state, fallen)`.
- Same shape as the maze's `step`. The state is a *list of four floats* rather than a position tuple.
- The class-level names in capitals (`GRAVITY` ...) are constants shared by every cart-pole. They aren't knobs; they're the laws of this little universe.

Test it by pushing right repeatedly and watching the state:

```python
test_cartpole = CartPole()
test_state = test_cartpole.reset()
states_seen = [test_state]
for tick in range(10):
    test_state, fallen = test_cartpole.step(True)
    states_seen.append(test_state)
```

Open `states_seen` in the visualiser. Watch the cart's velocity grow (always pushing right) and the pole's angle move the *other* way as the cart lurches out from under it.

---

## Step 2: The neuron

```python
class Neuron:
    def __init__(self, weights, bias=0.0):
        self.weights = weights
        self.bias = bias

    def weighted_sum(self, inputs):
        total = self.bias
        for weight, input_value in zip(self.weights, inputs):
            total += weight * input_value
        return total

    def decide_push_right(self, inputs):
        return self.weighted_sum(inputs) > 0
```

**This is a neuron.** Really. Look at what it holds: a list of numbers (one **weight** per input) and one extra number (the **bias**). Those are its knobs, exactly like `base_fee` and `price_per_km` in Lesson 1.

How it computes:

1. `weighted_sum`: multiply each input by its weight, add them all up, add the bias. `zip(self.weights, inputs)` walks the two lists in step, pairing weight 0 with input 0, weight 1 with input 1, and so on. (This is the same shape as the taxi `base_fee + price_per_km * distance`: a sum of knob × input pieces.)
2. `decide_push_right`: if that total is positive, push right; otherwise push left.

So a weight says *how much attention to pay to that input, and in which direction*. A big positive weight on `pole_angle` means "if the pole leans right, that's a strong vote for pushing right". A weight of 0 means "ignore this input".

Try a hand-built brain: pay attention only to the pole's angle.

```python
only_looks_at_angle = Neuron([0.0, 0.0, 1.0, 0.0])
```

Open it in the visualiser. It's literally four weights and a bias. Check its choices by hand: `only_looks_at_angle.weighted_sum([0, 0, 0.1, 0])` is 0.1, positive, so it pushes right when the pole leans right. Sensible!

---

## Step 3: Score a brain

Same idea as `wrongness`, but this time bigger is better: how many ticks did it survive?

```python
def balance_time(neuron, max_steps=200):
    cartpole = CartPole()
    state = cartpole.reset()
    for step_count in range(max_steps):
        state, fallen = cartpole.step(neuron.decide_push_right(state))
        if fallen:
            return step_count + 1
    return max_steps


def average_balance_time(neuron, episodes=5):
    return sum(balance_time(neuron) for _ in range(episodes)) / episodes
```

**Reading it:** run one attempt; each tick, feed the current state into the neuron, push as it says, and stop when the pole falls. 200 is the best possible score here (a cap, so attempts can't run forever). `average_balance_time` repeats it 5 times because every `reset()` has different random wobble, and one lucky run proves little.

Try some brains:

```python
random.seed(3)
zero_brain_score = average_balance_time(Neuron([0.0, 0.0, 0.0, 0.0]))
angle_only_score = average_balance_time(Neuron([0.0, 0.0, 1.0, 0.0]))
angle_and_spin_score = average_balance_time(Neuron([0.0, 0.0, 1.0, 1.0]))
```

Roughly what you'll see:

| brain | score |
|---|---|
| all zeros | about 9 (the weighted sum is 0, never above 0, so it always pushes left and falls fast) |
| angle only | a few dozen |
| angle and spin | 200, nearly perfect |

Look at that last one: a human guess at four numbers is already a good balancer. *"If the pole's leaning or falling to the right, push right"* is the whole trick. The remaining question is how to find good weights automatically, without a human guessing.

---

## Step 4: Learn the weights

The same game as Lessons 1 and 2: knobs, a score, a nudge rule. Our nudge rule this time is the simplest possible one: **try a small random change; keep it only if it scores better.**

```python
def learn_by_random_nudges(rounds, nudge_size=0.3):
    best_weights = [0.0, 0.0, 0.0, 0.0]
    best_score = average_balance_time(Neuron(best_weights))
    history = []
    for round_number in range(rounds):
        candidate_weights = [w + random.uniform(-nudge_size, nudge_size) for w in best_weights]
        candidate_score = average_balance_time(Neuron(candidate_weights))
        if candidate_score > best_score:
            best_weights = candidate_weights
            best_score = candidate_score
        history.append({"round": round_number, "best_score": best_score,
                        "best_weights": list(best_weights)})
    return best_weights, history
```

**How it works:** start with all-zero weights (score about 9). Each round, build a candidate by adding a random amount (between ±0.3) to every weight; score it; if it beat the best so far, adopt it; otherwise throw it away. `history` keeps the best score after each round.

Run it:

```python
random.seed(11)
learned_weights, learn_history = learn_by_random_nudges(150)
final_test_score = average_balance_time(Neuron(learned_weights), episodes=20)
```

**Look at `learn_history`.** The best score starts near 9 and jumps up within the first 15 or so rounds, then sticks at 200 once a good set of weights is found. Look at `learned_weights`: the weights on `pole_angle` and `pole_angular_velocity` should be clearly positive (the same pattern you wrote by hand). The weights on cart position and velocity are small, and their exact values vary between runs. `final_test_score` is measured on 20 fresh attempts the learner never saw, which is the honest test.

You've now seen **three ways to nudge the knobs**:

| lesson | search method | needs |
|---|---|---|
| 1 | try every setting | a small number of knobs |
| 2 | wiggle, follow the slope | a smooth wrongness score |
| 4 | random nudge, keep if better | only a score, nothing else |

---

## So where do neurons "attach"?

You asked how neurons attach to these algorithms. Here is the whole picture in one place.

| | what decides what to do | what the knobs are |
|---|---|---|
| Maze (Lesson 3) | look up a row in a table | every table entry |
| CartPole neuron (Lesson 4) | compute a weighted sum of the state | the weights and bias |

**A neuron is a function with knobs.** A "neural network" is many neurons wired in layers: the outputs of some neurons become the inputs of the next ones. The knobs are all the weights of all the neurons, maybe millions. Training is *exactly* the loop you've written: score the current knobs, nudge them to score better.

The famous "deep reinforcement learning" agents (for example the ones that play video games) are the maze algorithm from Lesson 3 with the table replaced by a neural network. The table lookup `q_table[position][action]` becomes "feed the state into the network and read off a number for each action". Same "better guess" update, but nudging network weights instead of table entries. That's a later lesson in this series.

Why can't we just use random nudges for a million-weight network? It would be hopeless, like Lesson 1's explosion in disguise. We need slopes (Lesson 2) computed for all weights at once (backpropagation). That's the next batch.

---

## The decoder

| In the math | In your code |
|---|---|
| x (input vector), "features" | the 4-number state list |
| w (weights), b (bias) | `Neuron.weights`, `Neuron.bias` |
| w · x + b, "dot product", "pre-activation" | `weighted_sum` |
| "step function" / "threshold activation" | `> 0` in `decide_push_right` |
| "fitness", "return", "reward" (higher is better) | `balance_time` |
| "hill climbing", "random search" | `learn_by_random_nudges` |
| "perceptron" (the original name for this neuron) | `Neuron` |

(Real networks usually swap the harsh `> 0` for a smooth curve like the sigmoid so that slopes exist. That's also next batch.)

---

## Guided exploration

Copy the file as `learning_lab_explore4.py`.

1. **A surprise about nudge size.** Run the learner with the same seed (`random.seed(11)` right before each call) using `nudge_size=0.001`, then `0.3`, then `20.0`. Find the first round where `best_score` hits 200 in each (in the visualiser, or with `next(row["round"] for row in learn_history if row["best_score"] >= 200)`). You'd expect tiny nudges to crawl and huge ones to flail. They don't: the results come out essentially identical. Why? Think about what `decide_push_right` does with the weighted sum: it only asks "is it above 0?". If you multiply *every* weight by 1000, does any decision change? (No.) So only the **direction** of the weights list matters here, not its overall size. This one is specific to a threshold neuron with bias 0; it won't stay true once neurons output smooth values and slopes matter (next batch), where the step size becomes the same headache you saw in Lesson 2.
2. **Noisy scores.** Change `average_balance_time(..., episodes=5)` to `episodes=1` inside the learner and rerun a few times with different seeds. The learner is sometimes fooled by lucky attempts: a weak brain gets a lucky run, is "kept", and blocks better ones. Why does averaging fix that?
3. **Break the neuron.** In `decide_push_right`, change `> 0` to `< 0`. The brain now does the exact opposite. Run `learn_by_random_nudges` again. What sign do the learned angle weights have now? What does that tell you about what a weight *means*?
4. **Hand-pick weights.** Try `Neuron([0.0, 0.0, 0.0, 1.0])` (spin only) and `Neuron([1.0, 1.0, 0.0, 0.0])` (cart only). Which one balances, and why can't the other?

Return to the main file when finished.

---

## Challenge: see the landscape

Lesson 1 showed you a whole dict of scores for every knob combination. Do the same for CartPole, but only for the last two weights.

1. Build a dict `score_by_weights` whose keys are `(angle_weight, spin_weight)` tuples. Let each weight range from −2.0 to 2.0 in steps of 0.5 (9 × 9 = 81 combinations). The first two weights stay 0.0.
2. Fill it with `average_balance_time(...)` for each setting.
3. Find the best key with `max(score_by_weights, key=score_by_weights.get)`.
4. Open the dict in the visualiser. Which region of weights balances well (scores near 200), which region fails fast, and what do the winning cells have in common (think about the signs)?

The solution is in `solutions.md`.

---

## Check yourself

- Why can't CartPole use a lookup table the way the maze does?
- What are the knobs of the CartPole neuron, how many are there, and how does the program change them?
- What's the difference between what a weight of 0 and a big positive weight on `pole_angle` mean?
- In one sentence: what is a neural network, in terms of knobs and a score?

**Next batch:** more neurons wired together; getting slopes for all the weights at once (backprop); and putting a network inside the maze algorithm to learn CartPole properly.
