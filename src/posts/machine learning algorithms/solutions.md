# Solutions

Try the challenges properly before reading. If yours looks different but works, that's fine.

---

## Lesson 2 challenge: three knobs

Instead of one copy-pasted slope function per knob, keep the knobs in a **list** and give the slope function the *index* of the knob to wiggle.

```python
rides_with_time = [
    (1.0, 5, 6.0),
    (3.0, 10, 11.0),
    (5.0, 20, 18.0),
    (2.0, 25, 15.5),
    (8.0, 15, 20.5),
    (6.0, 30, 23.5),
]


def wrongness_of_knobs(knobs, rides_with_time):
    base_fee, price_per_km, price_per_minute = knobs
    total_squared_miss = 0.0
    for distance_km, minutes, actual_fare in rides_with_time:
        guess = base_fee + price_per_km * distance_km + price_per_minute * minutes
        total_squared_miss += (guess - actual_fare) ** 2
    return total_squared_miss / len(rides_with_time)


def slope_of_knob(knobs, knob_index, rides_with_time, wiggle=0.0001):
    wrongness_before = wrongness_of_knobs(knobs, rides_with_time)
    wiggled_knobs = list(knobs)
    wiggled_knobs[knob_index] += wiggle
    wrongness_after = wrongness_of_knobs(wiggled_knobs, rides_with_time)
    return (wrongness_after - wrongness_before) / wiggle


def train_three_knobs(learning_rate, steps):
    knobs = [0.0, 0.0, 0.0]
    history = []
    for step_number in range(steps):
        slopes = [slope_of_knob(knobs, index, rides_with_time) for index in range(len(knobs))]
        knobs = [knob - learning_rate * slope for knob, slope in zip(knobs, slopes)]
        history.append({
            "step": step_number,
            "knobs": list(knobs),
            "wrongness": wrongness_of_knobs(knobs, rides_with_time),
        })
    return history


three_knob_history = train_three_knobs(0.001, 20000)
```

**What to expect:** the last entry's knobs are about `[2.5, 1.5, 0.4]` (the rule hidden in the data: pickup 2.5, 1.5 per km, 0.4 per minute) and wrongness near zero. With learning rate 0.01 it explodes, because minutes reach 30, which makes the minute knob very touchy. Try it.

**Why a list:** `wrongness_of_knobs` and `slope_of_knob` work unchanged if you add a fourth knob. Only the formula inside `wrongness_of_knobs` has to know what each knob means. This list of knobs is what other people call the "parameter vector" or "weights".

**Real-world note:** the fact that one knob forces a tiny learning rate for all the others is a classic annoyance. It's why real pipelines *rescale* inputs (for instance, divide minutes by 30) before learning.

---

## Lesson 3 challenge: the trap

Change `MazeWorld.step` by adding one `if` between the goal check and the final return:

```python
    def step(self, position, action_name):
        row_change, column_change = ACTION_MOVES[action_name]
        wanted_position = (position[0] + row_change, position[1] + column_change)
        if not self.is_walkable(wanted_position):
            return position, -1.0, False
        if wanted_position == self.goal_position:
            return wanted_position, 10.0, True
        if self.symbol_at(wanted_position) == "T":
            return wanted_position, -10.0, False
        return wanted_position, -1.0, False
```

Then:

```python
trap_maze = MazeWorld([
    "S...",
    ".#..",
    ".T.#",
    "#..G",
])

random.seed(7)
trap_q_table, trap_steps = train_maze(trap_maze, 400)
show_policy(trap_maze, trap_q_table)
trap_path = follow_policy(trap_maze, trap_q_table)
```

**What to expect:** the trap sits on the left-hand route. From `S`, the arrows go **right** along the top, then down the middle column (the path avoids `(2,1)`): `follow_policy` should give `(0,0), (0,1), (0,2), (1,2), (2,2), (3,2), (3,3)`. The square left of the trap, `(2,0)`, points *up*, away from it. The entries for the move *into* the trap are clearly negative: `trap_q_table[(2, 0)]["right"]`, `trap_q_table[(3, 1)]["up"]` and `trap_q_table[(2, 2)]["left"]` all come out around −4 to −5 in my run, while the other moves from those squares are positive or only mildly negative. (Some arrows may vary between equally good options.)

One thing to notice: the old left-hand route and the new top route were the same length (6 steps). The trap didn't change the distance, it changed the *reward*, and the agent's whole table rearranged around that. Nobody wrote "avoid the trap" anywhere. It's an effect of the knobs being tuned against the reward.

---

## Lesson 4 challenge: the landscape

```python
score_by_weights = {}
for angle_steps in range(-4, 5):
    angle_weight = angle_steps * 0.5
    for spin_steps in range(-4, 5):
        spin_weight = spin_steps * 0.5
        brain = Neuron([0.0, 0.0, angle_weight, spin_weight])
        score_by_weights[(angle_weight, spin_weight)] = average_balance_time(brain)

best_weights_found = max(score_by_weights, key=score_by_weights.get)
```

(`range(-4, 5)` gives −4..4; multiplying by 0.5 gives −2.0..2.0.) Add `random.seed(5)` before it for repeatability.

**What to expect:** your best entry scores 200, and several cells will (in my run, 13 of the 81 hit exactly 200 and a few more were close). Here is the shape of my grid (rows are the angle weight from −2.0 to 2.0, columns are the spin weight from −2.0 to 2.0):

- **Every cell with a spin weight of 0 or less scores about 9 to 10**, a fast failure. The spin weight is the decisive one: if the pole is *falling* rightward, you must push right.
- With a **positive spin weight**, scores climb, and the angle weight decides how well. Angle weights of 0.5 or more with spin weights 0.5 to 1.5 give 200.
- A **negative angle weight** (pushing against the lean) still lets a positive spin weight partly work, but the scores are lower (roughly 25 to 170).

So there's a big forgiving good region, which is why even random nudging found it in about 15 rounds. Exact numbers will differ with your seed, but the pattern (nothing works without a positive spin weight, 200 for both positive) should hold.

(Interesting wrinkle: the spin weight is pulling most of the weight here. The pole's angular velocity already contains the information "which way is it going", which an angle reading alone lacks.)

The takeaway: the landscape for this problem has a big, forgiving good region, which is why even random nudging found it in about 15 rounds. Many real problems have landscapes that are nothing like this friendly, which is why smarter nudging (slopes) matters.
