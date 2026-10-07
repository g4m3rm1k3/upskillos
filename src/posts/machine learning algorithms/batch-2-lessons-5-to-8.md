# Batch 2: Layers, Backprop, and Deep Q (Lessons 5 to 8)

Everything in this file is one paste: four lessons, in order, with the challenge solutions at the very bottom (stop reading at the line that says so until you've tried the challenges).

**Picks up from batch 1.** You have `learning_lab.py` with the taxi guesser (Lessons 1-2), the maze (Lesson 3), and CartPole plus the `Neuron` (Lesson 4). Keep all of it. Everything below is added to the **bottom of the same file**. Make sure `import math` and `import random` are at the top.

**The one idea, restated:** knobs, a score, a nudge. Batch 1 showed the knobs as 2 numbers, a table, or 4 weights. This batch makes the knobs *many neurons wired in layers*, shows how all of their slopes get computed at once, and finally puts such a network inside the maze algorithm to learn CartPole.

| # | Lesson | New idea |
|---|--------|----------|
| 5 | Why One Neuron Isn't Enough | Layers, and why the smooth curve between them matters |
| 6 | Backpropagation: All the Slopes at Once | The chain rule as bookkeeping, checked against wiggling |
| 7 | Any-Size Networks, Train vs Test | A reusable `Layer` and `Network`, and what overfitting is |
| 8 | Deep Q: Swap the Table for a Network | Maze algorithm + network = balance CartPole |

---
---

# Lesson 5: Why One Neuron Isn't Enough

**Goal:** see a task a single neuron *cannot* do, then solve it by wiring neurons into a layer. Nothing is learned yet. You pick the weights by hand so you can see exactly what each neuron contributes. Learning comes in Lesson 6.

## The problem: a pump that runs at both extremes

A water tank has a level between 0.0 (empty) and 1.0 (full). A safety pump must run when the level is **too low (below 0.3) or too high (above 0.7)**, and stay off in the safe middle.

Notice the shape: ON, then OFF, then ON. A single neuron computes `sigmoid(weight × level + bias)`. As the level rises, that value can only go up steadily or down steadily. It can never go up and then come back down. So one neuron can't do it. Let's prove that rather than just claim it.

## Step 1: The smooth squashing curve

In Lesson 4 the neuron made a hard yes/no with `> 0`. That has no slope to follow (it's flat everywhere except a cliff). Neurons in learning networks use a smooth S-shaped curve instead, the **sigmoid**:

```python
def sigmoid(number):
    if number < -60:
        return 0.0
    if number > 60:
        return 1.0
    return 1.0 / (1.0 + math.exp(-number))
```

**What it does:** takes any number and squeezes it into the range 0 to 1. Large positive numbers give nearly 1, large negative numbers give nearly 0, and 0 gives exactly 0.5. The two `if` lines stop `math.exp` from overflowing on extreme inputs.

Try: `sigmoid(0)`, `sigmoid(4)`, `sigmoid(-4)`. You should get 0.5, about 0.982, and about 0.018. Think of it as a *soft* yes/no: instead of "push right or not", it says how strongly.

## Step 2: The data

```python
pump_data = []
for level_step in range(21):
    tank_level = round(level_step * 0.05, 2)
    pump_should_run = 1.0 if (tank_level < 0.3 or tank_level > 0.7) else 0.0
    pump_data.append((tank_level, pump_should_run))
```

**How it's stored:** a list of 21 tuples `(tank_level, correct_answer)`, with levels 0.0, 0.05, ..., 1.0. The `round(..., 2)` removes tiny floating point noise so that exactly 0.3 and 0.7 compare the way you'd expect. Count the answers in your visualiser: 12 ones (levels 0 to 0.25 and 0.75 to 1.0) and 9 zeros.

## Step 3: A single smooth neuron, and a way to score anything

```python
class SmoothNeuron:
    def __init__(self, weight, bias):
        self.weight = weight
        self.bias = bias

    def fire(self, tank_level):
        return sigmoid(self.weight * tank_level + self.bias)


def score_on_data(predict_function, data):
    total_squared_miss = 0.0
    correct_count = 0
    for tank_level, correct_answer in data:
        prediction = predict_function(tank_level)
        total_squared_miss += (prediction - correct_answer) ** 2
        if (prediction > 0.5) == (correct_answer > 0.5):
            correct_count += 1
    return total_squared_miss / len(data), correct_count / len(data)
```

`score_on_data` takes **any function** (here the `fire` method of a neuron, later a whole network's) and a dataset, and returns two numbers: the average squared miss (the wrongness from Lesson 1) and the **accuracy** (the fraction where the prediction landed on the right side of 0.5). Passing a function as an argument is the same trick as passing `key=` to `min` back in Lesson 1.

## Step 4: Prove one neuron can't do it

Try every weight from −20 to 20 and every bias from −10 to 10 (a Lesson 1 style brute force), keeping the best:

```python
best_single = None
for weight_steps in range(-20, 21):
    for bias_steps in range(-20, 21):
        neuron = SmoothNeuron(weight_steps * 1.0, bias_steps * 0.5)
        wrongness, accuracy = score_on_data(neuron.fire, pump_data)
        if best_single is None or wrongness < best_single[0]:
            best_single = (wrongness, accuracy, neuron.weight, neuron.bias)
```

Look at `best_single`. You should see **accuracy 0.571 (12 out of 21) with weight 0.0 and bias 0.5**. The best a single neuron can do is switch its weight off, ignore the level entirely, and always answer "about 0.62, yes-ish". That's exactly "always say pump on", which is right 12 times out of 21. It found nothing better because nothing better exists in this family. That's an impossible-for-one-neuron problem, and it's the reason layers exist.

## Step 5: Two neurons feeding a third

The trick: one neuron can detect "too low", another can detect "too high", and a third can say "yes if either of them fired".

```python
class TinyNetwork:
    def __init__(self, hidden_weights, hidden_biases, output_weights, output_bias):
        self.hidden_weights = hidden_weights
        self.hidden_biases = hidden_biases
        self.output_weights = output_weights
        self.output_bias = output_bias

    def forward(self, tank_level):
        self.last_input = tank_level
        self.last_hidden_outputs = []
        for weight, bias in zip(self.hidden_weights, self.hidden_biases):
            self.last_hidden_outputs.append(sigmoid(weight * tank_level + bias))
        weighted_total = self.output_bias
        for weight, hidden_output in zip(self.output_weights, self.last_hidden_outputs):
            weighted_total += weight * hidden_output
        self.last_output = sigmoid(weighted_total)
        return self.last_output
```

**How it's stored and how it flows:**

- Two lists of hidden knobs: `hidden_weights` and `hidden_biases`, one entry per **hidden neuron**.
- Then the output neuron's knobs: `output_weights` (one per hidden neuron) and one `output_bias`.
- `forward(tank_level)` computes each hidden neuron's value, then feeds *those values* into the output neuron. Hidden values are saved in `self.last_hidden_outputs` so you can inspect them. That saved list is what you'll watch in the visualiser. It's also what backprop will need in Lesson 6.
- Total knobs: 2 + 2 + 2 + 1 = **7**.

Now wire it by hand:

```python
hand_wired = TinyNetwork(
    hidden_weights=[-30.0, 30.0],
    hidden_biases=[8.25, -21.75],
    output_weights=[10.0, 10.0],
    output_bias=-5.0,
)
```

**Why these numbers:**

- A neuron `sigmoid(weight × level + bias)` flips from low to high when `weight × level + bias = 0`, i.e. at level = −bias / weight.
- Hidden neuron 1: weight −30, bias 8.25 flips at level 8.25 / 30 = **0.275**. Its negative weight means it's high *below* that level. So it means "the tank is low". (0.275 is deliberately halfway between the data points 0.25 and 0.3.) The big weight makes the flip sharp.
- Hidden neuron 2: weight +30, bias −21.75 flips at 21.75 / 30 = **0.725**, high *above* it. "The tank is high."
- Output neuron: weights 10 and 10, bias −5. If both hidden values are about 0, the total is −5 and the output is about 0. If either is about 1, the total is about +5 and the output is about 1. That's a soft **OR**.

Score it and inspect it:

```python
hand_wired_scores = score_on_data(hand_wired.forward, pump_data)
hand_wired.forward(0.1)
hidden_at_low_level = list(hand_wired.last_hidden_outputs)
hand_wired.forward(0.5)
hidden_at_middle_level = list(hand_wired.last_hidden_outputs)
```

You should see accuracy **1.0** (all 21 right) and wrongness around 0.004. At level 0.1 the hidden values are about `[0.995, 0.0]` ("low" fired). At level 0.5 they're both about 0.001 (neither fired, pump off). **Every hidden neuron became a little detector for one feature, and the output neuron combined the detectors.** That's the whole idea of a layer.

## Why the curve matters (the part people skip)

Suppose the neurons did no squashing and just output `weight × input + bias`. Then a two-layer network computes: `output = v × (w × x + b) + c = (v × w) × x + (v × b + c)`. That's *just another weight times x plus another bias*, a single neuron again. Stacking straight-line layers always collapses back into one straight line. The bend in the sigmoid (called a **nonlinearity**, or **activation function**) is what lets stacked layers do more than one layer can. Without it, depth buys you nothing.

## The decoder

| In the math | In your code |
|---|---|
| σ(z), "sigmoid", "logistic function" | `sigmoid` |
| "activation function", "nonlinearity" | the `sigmoid(...)` call inside each neuron |
| "hidden layer" | the two neurons whose values aren't the final answer |
| "output layer" | the last neuron |
| "forward pass" | `TinyNetwork.forward` |
| "architecture" or "[1, 2, 1] network" | 1 input, 2 hidden neurons, 1 output |
| "feature detector" | a hidden neuron whose weights make it respond to one pattern |

## Guided exploration

Save a copy as `learning_lab_explore5.py`.

1. **Soften the detectors.** Change the hidden weights from ±30 to ±5 (keep the flip points the same by changing the biases to 5 × 0.275 = 1.375 and 5 × 0.725 = 3.625, with the matching signs). Score it. Wrongness should get worse: the detectors are blurrier, so levels near 0.3 and 0.7 get muddy answers. Steep weights = sharp edges.
2. **Break the OR.** Change `output_bias` from −5 to −15. Now the output only says yes when *both* hidden neurons are on, which never happens. What accuracy do you get, and why? (The pump never turns on, so accuracy equals the fraction of "off" answers, 9/21 = 0.43.)
3. **Remove one detector.** Set the second hidden neuron's output weight to 0. Which half of the problem does the network now fail? Check by looking at the predictions for levels above 0.7.

Return to the main file when done.

## Challenge: wire the opposite

Make a `TinyNetwork` for the **opposite** pump: it should run *only inside the middle band* (levels between about 0.3 and 0.7) and be off otherwise. Create the opposite data with:

```python
band_data = [(level, 1.0 - answer) for level, answer in pump_data]
```

Choose all seven knobs by hand and score it with `score_on_data`. Aim for accuracy 1.0. Hint: you need two detectors again, but this time "above 0.275" and "below 0.725", and the output should be an **AND** (both must be on) instead of an OR. Think about what output bias makes two 10-weight inputs only add up to a "yes" when both are 1. Solution at the bottom.

## Check yourself

- Why couldn't any single neuron beat 57% on the pump data?
- What does each hidden neuron in the hand-wired network "detect"?
- Why does a network with no sigmoid collapse into a single neuron, whatever its depth?

---
---

# Lesson 6: Backpropagation, All the Slopes at Once

**Goal:** make the network *learn* its own weights. Lesson 2's slope-following needs the slope of the wrongness with respect to every knob. Here is how to get all 7 (or 7 million) of them in one backward sweep, and how to check it's right.

## The idea first: slopes multiply along a chain

Say changing knob A by 1 changes B by 3, and changing B by 1 changes C by 2. Then changing A by 1 changes C by 3 × 2 = **6**. Slopes along a chain **multiply**. That's the **chain rule**, and it's the only calculus idea you need.

A network is a long chain: knob → neuron value → next neuron value → output → wrongness. To get a knob's slope, multiply the local slopes along the chain from that knob to the wrongness at the end. Backpropagation simply does this **from the end backward**, saving each product so the earlier knobs reuse it instead of recomputing from scratch. That's why one backward sweep gives *all* the slopes.

## A worked example you can check

One input, one hidden neuron, one output neuron. Knobs: hidden weight `w = 0.5`, hidden bias `b = 0`, output weight `v = 2.0`, output bias `c = −1.0`. Input `x = 1.0`, correct answer `1.0`.

**Forward** (compute left to right):

| quantity | calculation | value |
|---|---|---|
| hidden value `h` | sigmoid(0.5 × 1.0 + 0) | 0.6225 |
| total into output | 2.0 × 0.6225 − 1.0 | 0.2449 |
| prediction `out` | sigmoid(0.2449) | 0.5609 |
| miss | 0.5609 − 1.0 | −0.4391 |
| wrongness (loss) | (−0.4391)² | 0.1928 |

**Backward** (walk right to left, multiplying local slopes):

| step | what we compute | value |
|---|---|---|
| slope of loss w.r.t. prediction | 2 × miss | −0.8781 |
| × slope of sigmoid at the output | out × (1 − out) = 0.2463 | **output signal = −0.2163** |
| slope for output bias `c` | output signal × 1 | **−0.2163** |
| slope for output weight `v` | output signal × `h` | **−0.1346** |
| slope reaching hidden value `h` | output signal × `v` | −0.4326 |
| × slope of sigmoid at hidden | h × (1 − h) = 0.2350 | **hidden signal = −0.1017** |
| slope for hidden bias `b` | hidden signal × 1 | **−0.1017** |
| slope for hidden weight `w` | hidden signal × `x` | **−0.1017** |

(The sigmoid's slope has a neat shortcut: `value × (1 − value)`, using the value you already computed forward.)

**Notice the pattern.** Each neuron gets a **signal** (how much the wrongness cares about that neuron's pre-squash total). Then: a weight's slope = the signal of the neuron it feeds × the value coming in along that weight. A bias's slope = just the signal. And a signal for an earlier neuron = (the later signal × the connecting weight) × the sigmoid slope. That's all backprop is.

## Step 1: Type the backward sweep

Add this to `learning_lab.py` below the Lesson 5 code. It extends exactly the idea above to the whole dataset (summing each example's slopes, then averaging).

First, a helper to build a randomly-initialised network of the same `TinyNetwork` class:

```python
def make_random_network(hidden_count):
    return TinyNetwork(
        [random.uniform(-1, 1) for _ in range(hidden_count)],
        [random.uniform(-1, 1) for _ in range(hidden_count)],
        [random.uniform(-1, 1) for _ in range(hidden_count)],
        random.uniform(-1, 1),
    )
```

Then the sweep:

```python
def loss_and_slopes(network, data):
    hidden_count = len(network.hidden_weights)
    hidden_weight_slopes = [0.0] * hidden_count
    hidden_bias_slopes = [0.0] * hidden_count
    output_weight_slopes = [0.0] * hidden_count
    output_bias_slope = 0.0
    total_loss = 0.0
    for tank_level, correct_answer in data:
        prediction = network.forward(tank_level)
        total_loss += (prediction - correct_answer) ** 2
        output_signal = 2.0 * (prediction - correct_answer) * prediction * (1.0 - prediction)
        output_bias_slope += output_signal
        for index in range(hidden_count):
            hidden_output = network.last_hidden_outputs[index]
            output_weight_slopes[index] += output_signal * hidden_output
            hidden_signal = (output_signal * network.output_weights[index]
                             * hidden_output * (1.0 - hidden_output))
            hidden_weight_slopes[index] += hidden_signal * tank_level
            hidden_bias_slopes[index] += hidden_signal
    count = len(data)
    return (total_loss / count,
            [slope / count for slope in hidden_weight_slopes],
            [slope / count for slope in hidden_bias_slopes],
            [slope / count for slope in output_weight_slopes],
            output_bias_slope / count)
```

**Read it against the table above:**

- It first runs `network.forward(...)` for the example. That fills `last_hidden_outputs`, which the backward pass needs. (This is why `forward` saved them.)
- `output_signal` is the table's "output signal" line: `2 × miss × out × (1 − out)`.
- Each knob's slope is `+=`ed because we're adding up the contribution of every example. The final `/ count` averages them, to match the average-miss loss.
- It returns **five things**: the loss, then four lists of slopes (one per knob group). That's 1 + 2 + 2 + 2 + 1 = 7 slopes.

## Step 2: Prove it's right (the gradient check)

Hand-derived math is easy to get subtly wrong. Fortunately you already own a slow-but-trusted slope source: **wiggling**, from Lesson 2. Compare the two. Add helpers to flatten the knobs into one list, and both slope methods:

```python
def get_flat_knobs(network):
    return (list(network.hidden_weights) + list(network.hidden_biases)
            + list(network.output_weights) + [network.output_bias])


def set_flat_knobs(network, flat_knobs):
    hidden_count = len(network.hidden_weights)
    network.hidden_weights = flat_knobs[0:hidden_count]
    network.hidden_biases = flat_knobs[hidden_count:2 * hidden_count]
    network.output_weights = flat_knobs[2 * hidden_count:3 * hidden_count]
    network.output_bias = flat_knobs[3 * hidden_count]


def flat_slopes_from_backprop(network, data):
    loss, hw, hb, ow, ob = loss_and_slopes(network, data)
    return hw + hb + ow + [ob]


def flat_slopes_by_wiggling(network, data, wiggle=0.00001):
    original_knobs = get_flat_knobs(network)
    base_loss = loss_and_slopes(network, data)[0]
    slopes = []
    for index in range(len(original_knobs)):
        wiggled = list(original_knobs)
        wiggled[index] += wiggle
        set_flat_knobs(network, wiggled)
        slopes.append((loss_and_slopes(network, data)[0] - base_loss) / wiggle)
    set_flat_knobs(network, original_knobs)
    return slopes
```

**How they work:** `get_flat_knobs` lays all 7 knobs in one list in a fixed order (hidden weights, hidden biases, output weights, output bias), and `set_flat_knobs` puts a list back in that same order. The wiggle function re-scores the network once per knob with that knob nudged by 0.00001 and restores the original knobs when done. (`[0]` after `loss_and_slopes(...)` picks out just the loss from the returned tuple.)

Compare them on a random network:

```python
random.seed(4)
check_network = make_random_network(2)
by_backprop = flat_slopes_from_backprop(check_network, pump_data)
by_wiggling = flat_slopes_by_wiggling(check_network, pump_data)
```

Open both lists in your visualiser. **They should agree to about five decimal places** (mine: `[-0.002695, -0.000607, -0.003976, -0.000694, 0.006899, 0.004078, 0.018818]` from backprop against the same values, with the last one off in the sixth decimal, from wiggling). That agreement is how real ML engineers test their backprop code, and it's called a **gradient check**. Backprop is not an approximation of wiggling: it's the exact answer wiggling is trying to measure, and it costs one backward sweep instead of one re-score per knob. With 7 knobs that saves little. With 7 million, it's the difference between possible and impossible.

## Step 3: Train

This is Lesson 2's loop, with `loss_and_slopes` supplying the slopes:

```python
def train_network(network, data, learning_rate, epochs):
    history = []
    for epoch_number in range(epochs):
        loss, hw, hb, ow, ob = loss_and_slopes(network, data)
        flat_knobs = get_flat_knobs(network)
        slopes = hw + hb + ow + [ob]
        set_flat_knobs(network, [knob - learning_rate * slope
                                 for knob, slope in zip(flat_knobs, slopes)])
        if epoch_number % 500 == 0 or epoch_number == epochs - 1:
            history.append({"epoch": epoch_number, "loss": loss,
                            "accuracy": score_on_data(network.forward, data)[1]})
    return history
```

The line starting `set_flat_knobs(...)` is exactly `knob = knob - learning_rate * slope` from Lesson 2, applied to every knob at once with a list comprehension. An **epoch** is one full pass over the data (one set of slopes, one update). `history` records a snapshot every 500 epochs.

Run it:

```python
random.seed(0)
learning_network = make_random_network(2)
learning_history = train_network(learning_network, pump_data, 2.0, 6000)
```

**Look at `learning_history`.** In my run:

| epoch | loss | accuracy |
|---|---|---|
| 0 | 0.247 | 0.57 |
| 2000 | 0.244 | 0.57 |
| 2500 | 0.215 | 0.57 |
| 3000 | 0.048 | 1.0 |
| 5999 | 0.009 | 1.0 |

**This curve is worth staring at.** For about 2,500 epochs it does almost nothing (loss stuck near 0.245, accuracy stuck at "always say yes"). Then it breaks through. A plateau followed by a sudden drop is typical: the network was feeling around a flat patch before the slopes found a way down. Look at `get_flat_knobs(learning_network)`: the network invented its own solution. Mine had hidden weights of about 16 and 13 (both positive), so one hidden neuron became "level is above ~0.3" and the other "level is above ~0.7", and the output neuron combined them in a different way than your hand-wired OR. You didn't tell it any of that.

## The decoder

| In the math | In your code |
|---|---|
| "backpropagation", "reverse-mode autodiff" | `loss_and_slopes` |
| "chain rule" | the multiplications building `output_signal` and `hidden_signal` |
| δ (delta), "error term" | `output_signal`, `hidden_signal` |
| "gradient check" | comparing backprop slopes to wiggled slopes |
| "epoch" | one pass of the `for epoch_number` loop |
| "full-batch gradient descent" | using all the data's slopes for each update |
| σ′(z) = σ(z)(1 − σ(z)) | `prediction * (1.0 - prediction)` |
| "local minimum" / "plateau" | the stuck period (and, with other seeds, getting stuck permanently) |

## Guided exploration

Save a copy as `learning_lab_explore6.py`.

1. **Different luck.** Re-run the training with `random.seed(5)` instead of 0. In my run this seed **never escapes the plateau**: loss stays near 0.245 and accuracy at 0.57 for all 6000 epochs. Same code, different starting knobs, completely different outcome. This is what "initialisation matters" means.
2. **Give it more room.** Repeat with `make_random_network(4)` and `random.seed(5)`. More hidden neurons means more chances that some of them start in a useful place. (The challenge below asks you to measure this properly.)
3. **Too big a learning rate.** Train with `learning_rate=200.0` for 300 epochs and watch the loss in `learning_history`. Compare with Lesson 2's explosion.
4. **Break the check.** In `loss_and_slopes`, delete the `* (1.0 - hidden_output)` factor from `hidden_signal`, then re-run the gradient check. The two slope lists should now disagree badly for the hidden knobs. This is how you find backprop bugs: the check fails and tells you which knobs are off.

Restore the code afterwards.

## Challenge: how much does width help?

For hidden counts 2, 3 and 4, train six networks each (seeds 0 to 5) with learning rate 2.0 and 6000 epochs on `pump_data`. For each, record the final loss and accuracy. How many of the six succeed (accuracy 1.0) at each width? Put the results into a dict keyed by hidden count. Solution at the bottom.

## Check yourself

- Why do slopes *multiply* along the chain, and what is a "signal"?
- Why is backprop exactly equal to wiggling (to rounding), not just close, and why is it still worth having?
- What does the plateau in the training curve tell you about the knobs' starting positions?

---
---

# Lesson 7: Any-Size Networks, and Train vs Test

**Goal:** stop hard-wiring "one input, one output, one hidden layer" and build a reusable `Layer` and `Network` that you can resize with a list like `[2, 6, 1]`. Then meet the central worry of all of ML: a network that scores perfectly on what it's seen but fails on anything new.

## Step 1: Activations as a lookup table

Different layers use different curves. Each curve needs two things: the curve itself and its **slope**. Add this:

```python
ACTIVATIONS = {
    "sigmoid": (sigmoid, lambda output: output * (1.0 - output)),
    "tanh": (math.tanh, lambda output: 1.0 - output * output),
    "relu": (lambda total: max(0.0, total), lambda output: 1.0 if output > 0.0 else 0.0),
    "linear": (lambda total: total, lambda output: 1.0),
}
```

**How it's stored:** a dict from a name to a **tuple of two functions**: the curve, and its slope written in terms of the curve's *output* (so backward needs only the value already computed forward, like the `out × (1 − out)` shortcut in Lesson 6). Quick tour:

- `sigmoid`: squeezes to 0..1 (good for a final yes/no probability).
- `tanh`: like sigmoid but squeezes to −1..1, centred on 0.
- `relu`: "rectified linear unit": passes positive numbers through unchanged, clamps negatives to 0. Surprisingly good in practice, and the modern default for hidden layers.
- `linear`: no bend at all (used on the output when you want an unbounded number).

(`lambda arguments: expression` is Python's one-line unnamed function.)

## Step 2: One layer

```python
class Layer:
    def __init__(self, inputs_count, neurons_count, activation_name):
        self.activation_name = activation_name
        self.activation, self.activation_slope = ACTIVATIONS[activation_name]
        limit = math.sqrt(6.0 / (inputs_count + neurons_count))
        self.weights = [[random.uniform(-limit, limit) for _ in range(inputs_count)]
                        for _ in range(neurons_count)]
        self.biases = [0.0] * neurons_count
        self.reset_slopes()

    def reset_slopes(self):
        self.weight_slopes = [[0.0] * len(row) for row in self.weights]
        self.bias_slopes = [0.0] * len(self.biases)

    def forward(self, inputs):
        self.last_inputs = inputs
        self.last_outputs = []
        for neuron_weights, bias in zip(self.weights, self.biases):
            total = bias
            for weight, input_value in zip(neuron_weights, inputs):
                total += weight * input_value
            self.last_outputs.append(self.activation(total))
        return self.last_outputs

    def backward(self, output_slopes):
        input_slopes = [0.0] * len(self.last_inputs)
        for neuron_index, output_slope in enumerate(output_slopes):
            signal = output_slope * self.activation_slope(self.last_outputs[neuron_index])
            self.bias_slopes[neuron_index] += signal
            neuron_weights = self.weights[neuron_index]
            for input_index, input_value in enumerate(self.last_inputs):
                self.weight_slopes[neuron_index][input_index] += signal * input_value
                input_slopes[input_index] += signal * neuron_weights[input_index]
        return input_slopes

    def apply_slopes(self, learning_rate, example_count):
        for neuron_index in range(len(self.weights)):
            self.biases[neuron_index] -= learning_rate * self.bias_slopes[neuron_index] / example_count
            for input_index in range(len(self.weights[neuron_index])):
                self.weights[neuron_index][input_index] -= (
                    learning_rate * self.weight_slopes[neuron_index][input_index] / example_count)
        self.reset_slopes()
```

**Storage, concretely.** For a layer with 2 inputs and 6 neurons:

- `weights` is a list of 6 lists, each of 2 numbers: `weights[neuron][input]`. (A "matrix", but you can see it as a list of per-neuron weight lists, just like `Neuron.weights` in Lesson 4.)
- `biases` is a list of 6 numbers, one per neuron.
- `weight_slopes` and `bias_slopes` have exactly the same shapes, and hold the slopes **accumulated so far**.

**The three methods, with signatures:**

- `forward(inputs: list) -> list`: for every neuron, weighted sum plus bias, then the activation. It *remembers* its inputs and outputs for the backward pass.
- `backward(output_slopes: list) -> list`: takes "how much does the final loss care about each of my outputs?" and does two jobs. (1) It adds this example's slopes for my own knobs into `weight_slopes` and `bias_slopes` (using the Lesson 6 table: signal × incoming value). (2) It **returns** how much the loss cares about each of my *inputs* (`input_slopes`), which is what the previous layer needs as its `output_slopes`. This hand-off is the "backward" in backpropagation.
- `apply_slopes(learning_rate, example_count)`: Lesson 2's `knob -= learning_rate × slope`, with slopes averaged over the examples, then clears the slope bins.

**The `limit` line:** random starting weights are drawn between ±limit, where limit shrinks as the layer gets wider. It stops the first forward pass from producing wildly big or tiny numbers. (It's a standard recipe called Glorot or Xavier initialisation. Don't worry about the formula; understand the *purpose*.)

## Step 3: A stack of layers

```python
class Network:
    def __init__(self, layer_sizes, hidden_activation, output_activation):
        self.layers = []
        for index in range(len(layer_sizes) - 1):
            is_last = index == len(layer_sizes) - 2
            activation_name = output_activation if is_last else hidden_activation
            self.layers.append(Layer(layer_sizes[index], layer_sizes[index + 1], activation_name))

    def forward(self, inputs):
        values = inputs
        for layer in self.layers:
            values = layer.forward(values)
        return values

    def backward(self, output_slopes):
        slopes = output_slopes
        for layer in reversed(self.layers):
            slopes = layer.backward(slopes)

    def apply_slopes(self, learning_rate, example_count):
        for layer in self.layers:
            layer.apply_slopes(learning_rate, example_count)

    def knob_count(self):
        return sum(len(layer.biases) + sum(len(row) for row in layer.weights)
                   for layer in self.layers)
```

**Read it:** `Network([2, 6, 1], "tanh", "sigmoid")` means 2 inputs, a hidden layer of 6 neurons using tanh, and 1 output neuron using sigmoid. `forward` pushes values through each layer in order. `backward` hands the slopes backward through the layers in **reverse** order (`reversed(...)`). Each layer's returned `input_slopes` becomes the next-earlier layer's `output_slopes`. That loop *is* backpropagation, for any number of layers.

Check the size: `Network([2, 6, 1], "tanh", "sigmoid").knob_count()` should be **25** (6 × 2 weights + 6 biases + 1 × 6 weights + 1 bias).

## Step 4: A harder task, with honest testing

New problem, in two dimensions: given a point `(x, y)` between −1 and 1, is it **inside a circle** of radius about 0.7 (`x² + y² < 0.5`)? No straight line can separate inside from outside.

```python
def make_ring_data(count):
    data = []
    for _ in range(count):
        x_value = random.uniform(-1, 1)
        y_value = random.uniform(-1, 1)
        inside = 1.0 if x_value ** 2 + y_value ** 2 < 0.5 else 0.0
        data.append(([x_value, y_value], inside))
    return data


def train_classifier(network, training_data, epochs, learning_rate):
    history = []
    for epoch_number in range(epochs):
        total_loss = 0.0
        for inputs, correct in training_data:
            prediction = network.forward(inputs)[0]
            total_loss += (prediction - correct) ** 2
            network.backward([2.0 * (prediction - correct)])
        network.apply_slopes(learning_rate, len(training_data))
        if epoch_number % 100 == 0 or epoch_number == epochs - 1:
            history.append({"epoch": epoch_number, "loss": total_loss / len(training_data)})
    return history


def accuracy_of(network, data):
    right = 0
    for inputs, correct in data:
        if (network.forward(inputs)[0] > 0.5) == (correct > 0.5):
            right += 1
    return right / len(data)
```

**What to notice:**

- Each data item is `([x, y], answer)`: the inputs are a *list* now (two numbers).
- In `train_classifier`: for each example, run forward, then call `network.backward([2.0 * (prediction - correct)])`: that single number is the slope of the squared miss with respect to the output (the starting point of the backward chain from Lesson 6's table). Slopes accumulate across all examples; then **one** `apply_slopes` per epoch. It's full-batch gradient descent, the same as Lesson 6.
- `network.forward(inputs)[0]` takes the first (only) output from the returned list.

Now the honest part. Split the data into **training data** (what the network may learn from) and **test data** (never shown during learning, used only to grade):

```python
random.seed(2)
all_data = make_ring_data(200)
training_data = all_data[:150]
test_data = all_data[150:]
ring_network = Network([2, 6, 1], "tanh", "sigmoid")
ring_history = train_classifier(ring_network, training_data, 1500, 1.0)
train_accuracy = accuracy_of(ring_network, training_data)
test_accuracy = accuracy_of(ring_network, test_data)
```

(This takes a couple of seconds.) In my run: loss fell from 0.255 to 0.032, **train accuracy 0.973 and test accuracy 0.94**. Test accuracy is the one that counts: it says how the network does on points it has never seen. The two are close here, which is what you want.

## Step 5: Overfitting, on purpose

Now cheat in the opposite direction: a tiny training set and a huge network.

```python
random.seed(2)
small_training_data = make_ring_data(12)
oversized_network = Network([2, 30, 30, 1], "tanh", "sigmoid")
train_classifier(oversized_network, small_training_data, 1500, 1.0)
small_train_accuracy = accuracy_of(oversized_network, small_training_data)
small_test_accuracy = accuracy_of(oversized_network, test_data)
```

In my run: **train accuracy 1.0, test accuracy 0.56**. With 1,000 or so knobs and only 12 examples, the network found a way to fit every one of them *including their accidents*, without learning the circle. On new points it's close to guessing. This is **overfitting**: it memorised instead of generalising. The warning sign is always the same: **great score on training data, poor score on test data.** That's why test data exists, and why every honest ML report quotes the test number.

## The decoder

| In the math | In your code |
|---|---|
| "MLP" (multi-layer perceptron), "feed-forward network", "dense network" | `Network` |
| "[2, 6, 1]", "layer sizes" | the `layer_sizes` argument |
| W (weight matrix), b (bias vector) | `Layer.weights` (list of lists), `Layer.biases` |
| "ReLU", "tanh" | entries in `ACTIVATIONS` |
| "forward pass" / "backward pass" | `Network.forward` / `Network.backward` |
| "training set / test set", "held-out data" | `training_data` / `test_data` |
| "generalisation" | test accuracy |
| "overfitting" | train score high, test score low |
| "Glorot / Xavier initialisation" | the `limit` formula |

## Guided exploration

Copy to `learning_lab_explore7.py`. Use the same `random.seed(2)` / `make_ring_data(200)` setup each time so the data matches.

1. **How wide?** Train `Network([2, h, 1], "tanh", "sigmoid")` for `h` = 1, 2 and 6 (1500 epochs, rate 1.0) and compare train and test accuracy. In my run: `h=1` gave 0.65 / 0.50, `h=2` gave 0.80 / 0.84, `h=6` gave 0.97 / 0.94. With 1 hidden neuron the network is stuck with a single bend (about as good as a single line), and each extra neuron adds another "line" it can use. Roughly, the 6 hidden neurons draw 6 lines whose combination approximates a circle.
2. **Swap the activation.** Replace `"tanh"` with `"relu"`, then with `"sigmoid"` (same width 6, same everything else). Mine: tanh 0.97 / 0.94, relu 0.95 / 0.94, sigmoid 0.89 / 0.82. The sigmoid hidden layer learns noticeably slower. Sigmoid's slope never exceeds 0.25, so each layer shrinks the backward signal by at least 4 times, and slopes fade as they travel back. (Remember Lesson 6's `out × (1 − out)` factor.) That fading is called the **vanishing gradient** problem, and it's a big reason ReLU took over for hidden layers.
3. **Learning rate.** Try rates 0.05, 1.0, 10.0 and 50.0. In my run 0.05 barely moved (0.65 / 0.50, still at the "guess" level after 1500 epochs), 1.0 worked (0.97 / 0.94), 10.0 worked best (0.97 / 0.98), and 50.0 broke (0.65 / 0.50). Too small crawls; too big overshoots, exactly as in Lesson 2.
4. **Shrink the training set.** Repeat Step 4 but with `training_data = all_data[:30]`. Watch the train/test gap open up.

Return to the main file when done.

## Challenge: the checkerboard

Build a dataset where the answer is `1.0` when exactly one of "x is positive" and "y is positive" is true (opposite corners of the square are the same class). Train `Network([2, 6, 1], "tanh", "sigmoid")` on 150 points and test on 50 fresh points. Before you run it, predict: can a single neuron do it? Why or why not? Then report the train and test accuracy. Solution at the bottom.

## Check yourself

- What does `Layer.backward` return, and who uses it?
- Why do we keep a separate test set, and what does a big gap between the two accuracies mean?
- Why does stacking more hidden layers or neurons not automatically help (see overfitting and the vanishing-gradient note)?

---
---

# Lesson 8: Deep Q, Swapping the Table for a Network

**Goal:** take the maze algorithm from Lesson 3 and replace its table with the `Network` from Lesson 7, then use it to learn CartPole. This is the idea behind deep reinforcement learning (the famous game-playing agents).

## The idea first

Lesson 3's table answered one question: *"in this situation, how good is each move?"* as `q_table[position][move]`. CartPole's situations are four real numbers, so a table is impossible (Lesson 4). A network can answer the *same* question for any four numbers:

```
q_table[position][move]          becomes          online_network.forward(state)[move]
```

The network has one output per move. Its job is to output, for the current state, a number for "push left" and a number for "push right". Pick the larger.

**The update is the same idea as the maze.** After a real step you form the **better guess**:

```
better_guess = reward + discount × (best value the network predicts for the NEXT state)
```

The table version moved the entry a fraction toward `better_guess`. The network version takes **one gradient step** to make its prediction for the move it actually took closer to `better_guess`. Same target, different knobs.

### Three new problems, and the standard fixes

1. **Neighbours move together.** Changing a network's weights changes its answer for *every* state, not just the one you updated. A table entry is isolated; weights aren't. Fix: **learn from a shuffled batch** of past experiences each time, not just the latest one.
2. **Consecutive steps are near-copies.** Step 40 and step 41 of one balance attempt look nearly identical, so learning from them in order over-trains on one moment. Fix: a **replay memory**: store every experience `(state, action, reward, next_state, finished)` and learn from random samples of it.
3. **Moving target.** The better guess uses the network's own predictions, and the network is changing as it learns. It's like trying to hit a target that moves every time you touch the bow. Fix: a **target network**: a frozen copy of the network, used only to compute `better_guess`, and refreshed from the live one every few hundred steps.

We'll also **clip** each prediction error to a safe size so one wild guess can't yank the weights, and **scale the state** so the four inputs all have similar sizes (cart position goes up to 2.4, pole angle up to 0.21; a network trains badly on inputs of wildly different scale).

## Step 1: Small helpers

```python
def scale_state(state):
    return [state[0] / 2.4, state[1] / 2.0, state[2] / 0.21, state[3] / 2.0]


def copy_network_into(source_network, target_network):
    for source_layer, target_layer in zip(source_network.layers, target_network.layers):
        target_layer.weights = [list(row) for row in source_layer.weights]
        target_layer.biases = list(source_layer.biases)


def best_action_index(network, scaled_state):
    action_values = network.forward(scaled_state)
    return 0 if action_values[0] >= action_values[1] else 1
```

- `scale_state(state: list of 4) -> list of 4`: divides each number by roughly its typical maximum, so every input lands around −1 to 1.
- `copy_network_into(source, target)`: copies every weight and bias (copying each row with `list(row)` so the two networks don't secretly share the same lists).
- `best_action_index(network, scaled_state)`: asks the network for its two numbers and returns the index of the larger. Index 0 means push left, 1 means push right, matching the `action == 1` check you'll see below.

## Step 2: The replay memory

```python
class ReplayMemory:
    def __init__(self, capacity):
        self.capacity = capacity
        self.experiences = []
        self.next_slot = 0

    def add(self, state, action, reward, next_state, finished):
        experience = (state, action, reward, next_state, finished)
        if len(self.experiences) < self.capacity:
            self.experiences.append(experience)
        else:
            self.experiences[self.next_slot] = experience
        self.next_slot = (self.next_slot + 1) % self.capacity

    def sample(self, count):
        return random.sample(self.experiences, count)

    def size(self):
        return len(self.experiences)
```

**How it's stored:** a list of 5-item tuples, filled up to `capacity`. After that it overwrites the oldest entry first: `next_slot` is a bookmark that moves forward and wraps around with `% self.capacity` (so slot 4999 is followed by slot 0). `sample(count)` returns `count` random distinct experiences. Open `memory.experiences` in the visualiser later to see the actual stored tuples.

## Step 3: Learn from a batch

```python
def learn_from_batch(online_network, target_network, batch, discount, learning_rate, clip):
    for state, action, reward, next_state, finished in batch:
        if finished:
            better_guess = reward
        else:
            better_guess = reward + discount * max(target_network.forward(next_state))
        predictions = online_network.forward(state)
        gap = predictions[action] - better_guess
        gap = max(-clip, min(clip, gap))
        output_slopes = [0.0, 0.0]
        output_slopes[action] = gap
        online_network.backward(output_slopes)
    online_network.apply_slopes(learning_rate, len(batch))
```

**Line by line:**

- `better_guess` is the Lesson 3 target. If the pole had already fallen, nothing comes after, so it's just the reward. Otherwise add the discounted best value for the next state, **read from the frozen target network**.
- `predictions = online_network.forward(state)` gives both moves' numbers. We only have a real outcome for the one we actually took, so only `predictions[action]` is compared.
- `gap` is `prediction − better_guess`: the Lesson 3 "TD error" with the opposite sign convention. The loss is `(gap)²/2`, whose slope with respect to the prediction is just `gap`. The `max(-clip, min(clip, gap))` pair squeezes it into −1..1.
- `output_slopes` is a list with a 0 for the move we didn't take (so no slope pushes it around) and `gap` for the one we did. Passing that into `online_network.backward(...)` runs Lesson 7's backward sweep.
- After the whole batch, one `apply_slopes` makes a single gradient-descent step on the average slopes.

## Step 4: Scoring, then the full loop

```python
def balance_test(network, episodes=5):
    scores = []
    for _ in range(episodes):
        cartpole = CartPole()
        state = cartpole.reset()
        for step_count in range(200):
            state, fallen = cartpole.step(best_action_index(network, scale_state(state)) == 1)
            if fallen:
                break
        scores.append(step_count + 1)
    return sum(scores) / len(scores)
```

Same scoring as Lesson 4's `balance_time`, but the "brain" is a network, and it always picks the greedy move (no exploring), averaged over 5 attempts.

```python
def train_deep_q(episodes, seed, learning_rate=0.05, discount=0.95, hidden_size=16,
                 batch_size=32, train_every=4, target_every=250, clip=1.0):
    random.seed(seed)
    online_network = Network([4, hidden_size, 2], "tanh", "linear")
    target_network = Network([4, hidden_size, 2], "tanh", "linear")
    copy_network_into(online_network, target_network)
    memory = ReplayMemory(5000)
    cartpole = CartPole()
    total_steps = 0
    progress_log = []
    for episode_number in range(episodes):
        explore_chance = max(0.05, 1.0 - episode_number / (episodes * 0.5))
        state = scale_state(cartpole.reset())
        for step_count in range(200):
            if random.random() < explore_chance:
                action = random.randint(0, 1)
            else:
                action = best_action_index(online_network, state)
            raw_next_state, fallen = cartpole.step(action == 1)
            next_state = scale_state(raw_next_state)
            memory.add(state, action, 1.0, next_state, fallen)
            state = next_state
            total_steps += 1
            if memory.size() >= 500 and total_steps % train_every == 0:
                learn_from_batch(online_network, target_network, memory.sample(batch_size),
                                 discount, learning_rate, clip)
            if total_steps % target_every == 0:
                copy_network_into(online_network, target_network)
            if fallen:
                break
        if (episode_number + 1) % 25 == 0:
            progress_log.append({"episode": episode_number + 1,
                                 "explore_chance": round(explore_chance, 2),
                                 "greedy_score": balance_test(online_network)})
    return online_network, progress_log
```

**Pieces to notice:**

- The network is `[4, 16, 2]` with `"tanh"` hidden and `"linear"` output (Q-values are unbounded numbers, not probabilities): 4 inputs (the scaled state), 16 hidden neurons, 2 outputs (one per move). Knob count: **114**.
- `explore_chance` starts at 1.0 (all random) and decays to 0.05 over the first half of training. The explore-versus-exploit tension from Lesson 3 again.
- **Reward design:** +1 for every step the pole is still up. `fallen` marks the end.
- Training begins only once memory holds 500 experiences, then runs once every 4 steps (`train_every`) on a random batch of 32.
- Every 250 steps (`target_every`) the target network is refreshed from the live network.
- Every 25 episodes it logs a **greedy test** into `progress_log`: a list of dicts, which you'll read in the visualiser.

Run it (about 25 seconds in pure Python for 500 episodes):

```python
trained_network, progress_log = train_deep_q(500, 1)
```

**Look at `progress_log`.** In my run the greedy score stays near **9** (falling immediately) for the first 50 episodes, climbs through 13, 102, 42, 100 by episode 150, reaches ~192 at episode 175, and then stays at or very near the cap of **200** for the rest of training. A fresh 20-attempt test gave 198.7. Note the **wobble** around episode 125 (42 after 102): learning is not a smooth staircase, especially with a network. Real training logs always look jagged.

## What did it actually learn?

Peek inside with two states: pole leaning right, pole leaning left (cart still):

```python
leaning_right_values = trained_network.forward(scale_state([0.0, 0.0, 0.1, 0.0]))
leaning_left_values = trained_network.forward(scale_state([0.0, 0.0, -0.1, 0.0]))
```

Mine: `[19.72, 19.88]` for leaning right (so push right wins) and `[19.62, 19.39]` for leaning left (push left wins). Two things to see:

- **Both numbers are close to 20.** With reward 1 per step and discount 0.95, a state that survives forever is worth 1 + 0.95 + 0.95² + ... = 1 / (1 − 0.95) = **20**. The network has learned "if I do this right, I'll keep collecting reward forever".
- **The decision lives in the tiny gap between the two numbers.** Push toward the lean is worth ~0.2 more. That's the same "push toward where it's falling" rule you hand-built with weights `[0, 0, 1, 1]` in Lesson 4, rediscovered by the network on its own.

## An honest comparison

Lesson 4's neuron found a balancing rule with **4 weights** in about **15 random nudges**. Deep Q used **114 knobs** and about **200 episodes**. For CartPole the simple method wins on cost, because CartPole happens to have a linear solution. Deep Q's value is that it didn't need us to know the right *shape* of the rule in advance (we handed it no "push toward the lean" hint), and the same code scales to problems nobody can hand-design, such as video games with thousands of inputs. Use the simplest thing that works, and know the bigger tool for when it doesn't.

## The decoder

| In the math | In your code |
|---|---|
| Q(s, a; θ), "Q-network" | `online_network.forward(state)[action]` |
| θ⁻ (theta-minus), "target network" | `target_network` |
| y = r + γ max Q(s′, a′; θ⁻) | `better_guess` |
| "experience replay", "replay buffer" | `ReplayMemory` |
| "(s, a, r, s′, done)" tuple | one entry in `memory.experiences` |
| "TD error" | `gap` |
| "Huber loss", "gradient clipping" | the `max(-clip, min(clip, gap))` line |
| "ε-greedy", "ε decay" | `explore_chance` |
| "DQN" (Deep Q-Network) | the whole `train_deep_q` |

## Guided exploration

Copy to `learning_lab_explore8.py`. **Use 300 episodes for every run below** (`train_deep_q(300, 1, ...)`), and compare each with the plain 300-episode baseline, which in my run ends with a greedy score of about 125.

1. **No future.** Set `discount=0.0`. Predict what the network will learn when the better guess ignores the future entirely and every step's reward is the same 1. In my run it never improves (stays at about 9). With no future, every move looks equally good, so there's nothing to prefer. The *future* part of the update is what spreads "falling is coming" back to the moves that caused it, exactly like the leak in Lesson 3.
2. **A tiny network.** Set `hidden_size=2`. In my run it learns, but much more slowly (about 47 at episode 300 against 125). Fewer knobs, less room.
3. **No frozen target.** Set `target_every=1` (the target is refreshed every step, so it's effectively not frozen). In my run, CartPole *still learned* (ending near 193). Don't conclude the target network is pointless: CartPole is forgiving, and the moving-target problem bites on harder tasks. Test what you can see; be wary of what you can't.
4. **Brutal learning rate.** Set `learning_rate=0.5` (ten times bigger). Mine still learned but jerkily (it hit 183, dropped to 42, recovered). Look at the shape of `progress_log`.
5. **One example at a time.** Set `batch_size=1`. Mine worked but noisily. A batch averages out the noise of individual examples.

The lesson from 3, 4 and 5: tricks that look essential in a textbook can be optional on an easy problem, which is why you should always check by experiment. Return to the main file when you're done.

## Challenge: read its mind

Sweep the pole angle from −0.20 to +0.20 in steps of 0.01 (everything else 0.0), and record which move the trained network prefers at each angle. Put the results into a dict `preferred_move_by_angle` (angle → `"left"` or `"right"`). Before running: predict where the flip from left to right happens, and compare with the rule your Lesson 4 neuron used. Then sweep the pole's *spin* (angular velocity) from −1.0 to 1.0 instead and see which way the preference flips. Solution at the bottom.

## Check yourself

- What does the network's output stand for, and how does that match `q_table[position][move]`?
- Why do we need a replay memory, and why a frozen target network?
- Why is each hidden number around 20 for a state that's balancing well?

---
---

# Where you stand after batch 2

You can now read these rows of the **Field Guide** as "I could build the core of that": linear regression, logistic regression, neural networks (MLP), Q-learning (table), deep Q-networks, random search / hill climbing, and (with the earlier series) k-means and decision trees. You understand what the knobs, score and nudge are in all of them, and you've seen backprop and overfitting with your own code.

**Still ahead** (next batches, when you want them): convolutions and sequences (how a network is built for images or text), the attention mechanism and transformers, policy-gradient methods (learn the move probabilities directly), and the knob-free algorithms (KNN, PCA, boosting). Your earlier ML-math series covers CNNs, RNNs and transformers from the math side, and it should read much more easily now.

---
---

# SOLUTIONS (stop here until you've tried the challenges)

---
---

## Lesson 5 challenge: the opposite pump

```python
band_data = [(level, 1.0 - answer) for level, answer in pump_data]

inside_band = TinyNetwork(
    hidden_weights=[30.0, -30.0],
    hidden_biases=[-8.25, 21.75],
    output_weights=[10.0, 10.0],
    output_bias=-15.0,
)
band_scores = score_on_data(inside_band.forward, band_data)
```

Expected: accuracy 1.0, wrongness about 0.004 (identical to the first network, since it's the mirror image).

**How the numbers work:** hidden neuron 1 (weight +30, bias −8.25) flips at 8.25 / 30 = 0.275 and is high *above* it: "level is above 0.275". Hidden neuron 2 (weight −30, bias +21.75) flips at 21.75 / 30 = 0.725 and is high *below* it: "level is below 0.725". The output needs **both**: weights 10 + 10 with bias −15 gives a total of +5 when both fire (output about 1) and −5 when only one does (output about 0). Compare with the OR, where the bias was −5 so one detector alone was enough to reach +5.

---

## Lesson 6 challenge: how much does width help?

```python
width_results = {}
for hidden_count in (2, 3, 4):
    results = []
    for seed in range(6):
        random.seed(seed)
        network = make_random_network(hidden_count)
        history = train_network(network, pump_data, 2.0, 6000)
        results.append({"seed": seed,
                        "loss": round(history[-1]["loss"], 3),
                        "accuracy": history[-1]["accuracy"]})
    width_results[hidden_count] = results
```

**What I got (accuracy 1.0 means success):** with 2 hidden neurons, 5 of 6 seeds succeeded (seed 5 stayed stuck with loss about 0.245 and accuracy 0.571). With 3 hidden neurons, 5 of 6 succeeded (seed 3 stuck). With 4 hidden neurons, **6 of 6** succeeded, all with loss below 0.01. Your counts for 2 and 3 may differ slightly, but the trend should hold: wider networks fail less often, because with more neurons there's a better chance that some of them start in a useful place and give the slopes something to grab. This is one reason very large networks train more reliably than small ones. It's not a guarantee (a stuck network is still possible), and wider isn't free (more knobs to train and more risk of overfitting, which Lesson 7 showed).

---

## Lesson 7 challenge: the checkerboard

```python
random.seed(3)
checker_data = []
for _ in range(200):
    x_value = random.uniform(-1, 1)
    y_value = random.uniform(-1, 1)
    answer = 1.0 if (x_value > 0) != (y_value > 0) else 0.0
    checker_data.append(([x_value, y_value], answer))

checker_training = checker_data[:150]
checker_test = checker_data[150:]
checker_network = Network([2, 6, 1], "tanh", "sigmoid")
train_classifier(checker_network, checker_training, 1500, 1.0)
checker_train_accuracy = accuracy_of(checker_network, checker_training)
checker_test_accuracy = accuracy_of(checker_network, checker_test)
```

**Prediction:** a single neuron can't do it, for the same reason it couldn't do the pump in Lesson 5: its decision boundary is one straight line, and this pattern (top-right and bottom-left are one class, the other two corners are the other class) can't be cut by a single line. You need at least two lines combined, so a hidden layer.

**Result:** in my run, train accuracy **1.0** and test accuracy **1.0**. The pattern is clean and simple enough that 150 points are plenty. (This pattern is the classic "XOR" problem; its inability to be solved by one neuron is a famous moment in the history of the field.) If yours is lower, increase the epochs or retry with a different `random.seed`.

---

## Lesson 8 challenge: read its mind

```python
preferred_move_by_angle = {}
for angle_hundredths in range(-20, 21):
    angle = angle_hundredths * 0.01
    action_values = trained_network.forward(scale_state([0.0, 0.0, angle, 0.0]))
    preferred_move_by_angle[round(angle, 2)] = "left" if action_values[0] >= action_values[1] else "right"

preferred_move_by_spin = {}
for spin_tenths in range(-10, 11):
    spin = spin_tenths * 0.1
    action_values = trained_network.forward(scale_state([0.0, 0.0, 0.0, spin]))
    preferred_move_by_spin[round(spin, 1)] = "left" if action_values[0] >= action_values[1] else "right"
```

**What I got for angle** (using the seed 1, 500-episode network): "left" for every angle from −0.20 up to 0.01, flipping to "right" from 0.02 upward. So the network pushes toward the lean, and the flip is almost exactly at zero (just a hair to the right of it, since the cart and pole are otherwise perfectly still).

**For spin:** with the pole upright, it chose "left" at spins −1.0 and −0.5 and "right" at 0.5 and 1.0, so it pushes toward the direction the pole is *falling*.

**Comparison with Lesson 4:** same rule, "push the way it's leaning or falling", that your hand-built weights `[0, 0, 1, 1]` encoded. The network wasn't told the rule; it discovered the same decision boundary through reward alone. Your exact flip angle may differ a little, but should sit within a hundredth or two of zero, and the direction (lean right → push right) must match.
