# Lesson 17 — Memory Through Time: Recurrent Networks

## What you'll learn
- Why feedforward networks and convolutions alike have no way to remember something from arbitrarily far back in a sequence — a convolution's "memory" only ever extends as wide as its kernel.
- The RNN mechanism: a hidden state carried forward from timestep to timestep, updated by the *same* weights reused at every single step in time — a direct parallel to Lesson 16's weights reused at every position in space.
- Backpropagation through time, and the exact same vanishing-gradient mechanism from Lesson 14, now compounding across *timesteps* instead of *layers* — demonstrated with real, measured numbers on this lesson's own network.

## What you'll build
An RNN, trained from scratch via backpropagation through time, that tracks whether a risky event has *ever* occurred anywhere earlier in a sequence — a task with no fixed-size memory requirement, which no convolution with a fixed kernel width can solve in general.

---

## The question

You're watching a sequence of per-second flags: `1` means "risky second," `0` means "normal second." Once a risky second has occurred *anywhere* in the sequence so far, you want the output to become — and stay — `1` from that point forward:

| second | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| input (risky?) | 0 | 0 | 1 | 0 | 0 |
| desired output | 0 | 0 | 1 | 1 | 1 |

The risky event that flips the output could happen at position `0`, or position `19`, or arbitrarily far back — there's no fixed distance you could hardcode. A convolution with any fixed kernel width, from Lesson 16, has a hard structural limit on how far back it can "see."

---

## 1. Predict

If a convolution's kernel is `3` positions wide, and the one risky event happened `10` positions ago, could that convolution, on its own, still know about it at the current position? What property would a network need in order to have truly unlimited memory, reaching all the way back to the start of any sequence, regardless of length?

---

## 2. Try it: a hand-built network that already remembers

Before training anything, here's a working solution, chosen by hand — the same "see the destination first" approach from Lesson 13:

```python
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

Wxh, Whh, bh = 15.0, 15.0, -10.0
Why, by = 15.0, -7.0

def rnn_forward(x_seq, Wxh, Whh, bh, Why, by, h0=0.0):
    h = h0
    hs = [h]
    ys = []
    for x_t in x_seq:
        h = sigmoid(Wxh * x_t + Whh * h + bh)
        y = sigmoid(Why * h + by)
        hs.append(h)
        ys.append(y)
    return ys, hs

x_seq = [0, 0, 1, 0, 0]
ys, hs = rnn_forward(x_seq, Wxh, Whh, bh, Why, by)
print([f"{y:.4f}" for y in ys])
```

### What this code does

- **`Wxh, Whh, bh`** — three numbers governing how the **hidden state** updates: `Wxh` controls how strongly the *current input* affects the new hidden state; `Whh` controls how strongly the *previous* hidden state carries forward; `bh` is a bias. `Why`, `by` are separate weights turning the hidden state into an output.

- **`h = h0`, `hs = [h]`** — the hidden state starts at `0.0` (no memory yet), and every value it takes on gets recorded, starting with this initial value at index `0`.

- **`for x_t in x_seq:`** — the same loop structure processes every timestep, but critically, **`h` is not reset between iterations** — each new `h` is computed using the *previous* `h`, carrying information forward across the entire loop.

- **`h = sigmoid(Wxh * x_t + Whh * h + bh)`** — the **recurrent update**: this is the single most important line in the lesson. Notice `h` appears on *both* sides — the new hidden state depends on the current input *and* the hidden state's own previous value, run through the same weights, every single timestep.

- **`y = sigmoid(Why * h + by)`** — a separate, ordinary output computation from the *current* hidden state — structurally identical to every earlier lesson's `sigmoid(w * x + b)`.

### What happens

With these specific hand-picked weights, the printed outputs come out approximately `[0.001, 0.001, 0.9996, 0.9996, 0.9996]` — matching the target `[0, 0, 1, 1, 1]` closely. **Once the input hits `1` at position `2`, the hidden state jumps close to `1` and *stays* close to `1` for every subsequent step, even though the input itself returns to `0`.** `Whh = 15` is large enough that once `h` is near `1`, the recurrent term `Whh * h` alone (even with `x_t = 0`) is large enough to keep `h` saturated near `1` on the next step — this self-sustaining behavior, entirely from the weights and the recurrence, *is* the network's memory.

---

## 3. Why: the same weights, reused at every timestep — and backward through time

**The mechanism**, stated precisely: `Wxh`, `Whh`, `bh`, `Why`, `by` are **five numbers total**, reused at *every* timestep of *any* length sequence — exactly the parameter-sharing idea from Lesson 16, just shared across **time** instead of across **space**. Training them requires **backpropagation through time (BPTT)**: unroll the sequence, compute the error at each timestep's output, then propagate it backward — not just through the output layer, but *through the recurrence itself*, one timestep earlier at a time.

```python
def rnn_train(x_seq, targets, epochs=3000, learning_rate=0.5, seed=0):
    rng = np.random.RandomState(seed)
    Wxh, Whh, bh = rng.uniform(-1, 1, 3)
    Why, by = rng.uniform(-1, 1, 2)

    for epoch in range(epochs):
        ys, hs = rnn_forward(x_seq, Wxh, Whh, bh, Why, by)

        grad_Wxh = grad_Whh = grad_bh = grad_Why = grad_by = 0.0
        dh_next = 0.0
        for t in reversed(range(len(x_seq))):
            delta_y = ys[t] - targets[t]
            grad_Why += delta_y * hs[t + 1]
            grad_by += delta_y

            dh = delta_y * Why + dh_next
            dh_raw = dh * hs[t + 1] * (1 - hs[t + 1])
            grad_Wxh += dh_raw * x_seq[t]
            grad_Whh += dh_raw * hs[t]
            grad_bh += dh_raw
            dh_next = dh_raw * Whh

        Wxh -= learning_rate * grad_Wxh
        Whh -= learning_rate * grad_Whh
        bh -= learning_rate * grad_bh
        Why -= learning_rate * grad_Why
        by -= learning_rate * grad_by

    return Wxh, Whh, bh, Why, by

trained = rnn_train([0, 0, 1, 0, 0], [0, 0, 1, 1, 1])
ys_trained, _ = rnn_forward([0, 0, 1, 0, 0], *trained)
print([f"{y:.4f}" for y in ys_trained])
```

### Code mechanics

- **`for t in reversed(range(len(x_seq))):`** — BPTT processes timesteps **backward**, from the last to the first — necessary because each earlier timestep's correct gradient depends on information computed at the *later* timesteps first.

- **`delta_y = ys[t] - targets[t]`** — the same sigmoid-plus-log-loss shortcut used since Lesson 2, computed independently at every timestep.

- **`dh = delta_y * Why + dh_next`** — **this line is the genuinely new idea in this lesson.** `hs[t+1]` (this timestep's hidden state, using the earlier list-indexing convention where `hs[0]` is the initial state) influences the *current* timestep's output (`delta_y * Why`) **and** the *next* timestep's hidden state, since `h_t` feeds directly into computing `h_{t+1}`. `dh_next` carries in exactly that second contribution — the gradient that flowed backward from the future. Every hidden state, except the very last one, has **two** reasons to receive blame: its own output, and everything that happened afterward because of it.

- **`dh_raw = dh * hs[t + 1] * (1 - hs[t + 1])`** — multiplying the total incoming blame by the sigmoid derivative at this specific hidden state — exactly the chain-rule pattern from Lesson 13, now applied to a hidden state that's shared across time rather than across layers.

- **`grad_Whh += dh_raw * hs[t]`** — `hs[t]` here is the *previous* hidden state (the one that fed into this timestep's `Whh * h` term) — this measures how much adjusting the recurrent weight would have helped, specifically at this one timestep, and the **`+=`** accumulates that contribution across *every* timestep the recurrence was used at, exactly paralleling Lesson 16's kernel gradients summing across every spatial position a shared kernel touched.

- **`dh_next = dh_raw * Whh`** — the blame is propagated one step further back in time by multiplying through `Whh`, becoming the incoming `dh_next` for the *next* (earlier) iteration of the loop.

### Execution trace (BPTT on a 3-step sequence)

```
forward:  h0 → h1 → h2 → h3, each y_t computed from its own h_t

backward:
  t=2 (last step): dh_next starts at 0 (nothing further in the future)
                    dh = delta_y[2]*Why + 0
                    compute gradients, then set dh_next for t=1

  t=1:              dh = delta_y[1]*Why + dh_next (carried from t=2!)
                    compute gradients, then set dh_next for t=0

  t=0 (first step): dh = delta_y[0]*Why + dh_next (carried from t=1)
                    compute gradients — done
```

### Mental model

```
forward: carry a hidden state forward, timestep by timestep, updated by
    the SAME weights every single time
        ↓
each timestep's output error creates local blame for that timestep's
    hidden state
        ↓
but each hidden state ALSO influenced every later timestep, so blame
    flows backward through the recurrence too, accumulating as it goes
        ↓
every timestep's contribution to Wxh, Whh, bh gets SUMMED together —
    one shared set of weights, blamed by every timestep it was used in
```

---

## 4. Change one thing

Compare Lesson 13's hidden-layer delta to this lesson's — the difference is exactly one added term:

```diff
- delta1 = (delta2 @ W2.T) * (a1 * (1 - a1))     # Lesson 13: only ONE source of blame (the output layer)

+ dh = delta_y * Why + dh_next                    # this lesson: blame from THIS TIMESTEP'S output
+                                                  #     PLUS blame carried in from the FUTURE
+ dh_raw = dh * hs[t + 1] * (1 - hs[t + 1])
```

**What changed:** an extra term, `dh_next`, added before applying the local sigmoid-derivative scaling — accounting for the fact that a hidden state in an RNN has two separate downstream effects (its own output, and the next timestep), whereas a hidden layer in Lesson 13's plain feedforward network only ever had one (the next layer, computed once, with nothing "later" feeding back into it).

**What did not change:** the local chain-rule scaling (`hs[t+1] * (1 - hs[t+1])`), and the general shape of "gradient computed, then propagated one step further back multiplied by the relevant weight" — both are structurally identical to Lesson 13's `delta1` computation.

**Why this single addition is the entire idea of BPTT:** a feedforward network's layers form a simple chain, each with exactly one "next" step. An RNN's hidden states form a chain too — but every one of them (except the very last) has **two** jobs at once: producing this timestep's output, and becoming next timestep's memory. `dh_next` is precisely the bookkeeping needed to make sure both jobs get properly credited (or blamed) during the backward pass.

---

## 5. Put it in the project

```python
test_seq = [0, 1, 0, 0, 0, 0, 0]   # risky event happens once, early, then nothing
test_targets = [0, 1, 1, 1, 1, 1, 1]

ys_test, _ = rnn_forward(test_seq, *trained)
for x_t, target, y in zip(test_seq, test_targets, ys_test):
    print(f"input={x_t}  target={target}  predicted={y:.4f}")
```

Running the trained weights on a sequence they were never trained on directly (different length, different position of the risky event) and seeing the sticky behavior still hold confirms the network learned the underlying *rule* — "once risky, stay risky" — not just the specific training example.

### Why this design: hidden state size

**Problem:** this lesson used a hidden state of size `1` (a single scalar), purely for hand-traceability.

**Available choices:** a larger hidden state (a vector of many hidden units, each with its own `Wxh`, `Whh` row, updated the same recurrent way, analogous to Lesson 13's move from one neuron to several).

**Selected choice:** size `1`, sufficient for a single binary "has this happened yet" fact.

**Cost:** a size-`1` hidden state can only ever remember one bit's worth of information about the entire past — for a task needing to track, say, *multiple* independent conditions simultaneously (has a risky event occurred, *and* separately, has the sequence exceeded some running count), a single scalar hidden state would need to conflate both into one number, likely failing at one or both. A larger hidden state — the norm in real RNNs — gives the network more independent "slots" of memory to work with.

**Revisit condition:** if a task needs to track more than roughly one simple fact about the past at once, hidden size `1` becomes a real bottleneck, not just a simplification.

---

## 6. The trap

**Normal rule:** BPTT should propagate a meaningful gradient signal all the way back to *every* timestep, letting training discover how early events should affect later behavior.

**Apparently reasonable extension** — train on a *longer* version of the same task, expecting the same learning success, just over more steps:

```python
long_seq = [1] + [0] * 19          # risky event ONLY at the very first position
long_targets = [1] * 20             # sticky forever after

ys_long, hs_long = rnn_forward(long_seq, Wxh, Whh, bh, Why, by)

dh_next = 0.0
for t in reversed(range(len(long_seq))):
    delta_y = ys_long[t] - long_targets[t]
    dh = delta_y * Why + dh_next
    dh_raw = dh * hs_long[t + 1] * (1 - hs_long[t + 1])
    dh_next = dh_raw * Whh
    print(f"t={t:>2}  gradient reaching this timestep: {abs(dh_next):.10f}")
```

**Surprising result:** the printed gradient magnitude **shrinks extremely fast** as `t` decreases toward `0` — often to a number indistinguishable from `0.0` in floating point well before `t` reaches the first several timesteps, even though `t=0` (where the risky event actually happened) is *exactly* the timestep whose weights most need correcting if this behavior were being learned from scratch on a sequence this long.

**Exact reason:** once the hidden state saturates near `1` (which this network's large weights deliberately cause, to produce a confident `≈1` output rather than an ambiguous one), `hs[t+1] * (1 - hs[t+1])` — the sigmoid derivative — becomes **tiny**: a value near `0.993` gives a derivative of roughly `0.993 × 0.007 ≈ 0.007`, not `15`'s companion value near its theoretical max of `0.25`. Multiplied by `Whh = 15`, the per-step factor `dh_raw * Whh` works out to *roughly* `0.1` per step, not larger than `1`. Repeating a multiplication by roughly `0.1`, twenty times over, shrinks the signal by a factor of around `10^{-20}` — a number computers cannot meaningfully represent as anything but `0`. **This is the exact same multiplicative-shrinkage mechanism as Lesson 14's vanishing gradients across depth — except here it compounds across time, and a long sequence can very easily be "deeper" (more timesteps) than most networks are layers.**

**Project consequence:** the network in this lesson worked because its weights were chosen **by hand**, not learned via BPTT on a long sequence — and this trap shows exactly why learning them from scratch on a *long* version of this task would be genuinely difficult: the gradient signal telling the network "the event at position 0 matters" becomes numerically negligible long before BPTT's backward pass gets there, even though a hand-built solution to the task trivially exists. This is the single most famous practical limitation of plain RNNs, and it's the direct historical motivation for the architectures covered next.

---

## 7. Under the hood

*(Optional — not required to build or train a simple RNN correctly.)*

**LSTMs** (Long Short-Term Memory networks) and the closely related **GRUs** were specifically designed to fix this exact problem — they introduce **gates**: learned mechanisms that can let a memory value pass through largely unchanged across a timestep, rather than being forced through a saturating `sigmoid` (and its accompanying tiny derivative) every single step. This is conceptually similar to Lesson 14's fix for vanishing gradients across depth (ReLU's derivative of exactly `1` for active neurons, avoiding sigmoid's repeated shrinkage) — except adapted specifically for the recurrent, across-time setting. **Gradient clipping** (capping the gradient's magnitude before applying an update) is a separate, simpler, commonly-used mitigation specifically for the *opposite* failure — exploding gradients, where the per-step multiplier is *larger* than `1` instead of smaller, causing the same repeated-multiplication mechanism to blow up rather than vanish. This lesson's from-scratch RNN implements neither gating nor clipping — a known, deliberate simplification, in the same spirit as earlier lessons flagging early stopping (Lesson 5), stratified folds (Lesson 11), and padding (Lesson 16) as real refinements left for later.

---

## 8. Exercises

- **Predict:** if you reduced `Whh` from `15` to `3` (keeping everything else the same) and reran Section 6's long-sequence gradient trace, would you expect the vanishing effect to be *more* severe, *less* severe, or is it hard to tell without also knowing how it affects `h`'s saturation? Reason through both factors — `Whh`'s size and how saturated `h` becomes — before answering.
- **Modify:** retrain the network (via `rnn_train`) on a slightly longer training sequence, like `[0, 1, 0, 0, 1, 0, 0, 0]` with the corresponding sticky-OR targets, and confirm it still learns weights that generalize to Section 5's test sequence.
- **Break:** in Section 6, change `long_seq` to `[1] + [0] * 5` (a much shorter 6-step version) instead of 20 steps, and compare how much larger the gradient magnitude at `t=0` is compared to the 20-step version — direct, measured evidence that sequence length itself, not just the weights, drives how severe the vanishing effect becomes.
- **Trace:** by hand, using `Whh=15` and a hidden state value of exactly `h=0.5` (the point where sigmoid's derivative is at its true maximum of `0.25`, unlike this lesson's saturated ≈0.99 values), compute the per-step multiplier `Whh * h * (1 - h)`. Is it larger or smaller than `1`? What does that imply about whether gradients would vanish or explode if the network's hidden state stayed near `0.5` instead of saturating?

---

## What to remember

- An RNN reuses one shared set of weights across every timestep of a sequence — exactly Lesson 16's parameter-sharing idea, applied across time instead of space — giving it memory that isn't limited to any fixed window width, unlike a convolution.
- Backpropagation through time adds exactly one new idea beyond Lesson 13's backpropagation: each hidden state (except the last) receives blame from *two* sources — its own output, and everything that happened at every later timestep because of it — summed together via a `dh_next` term carried backward through the loop.
- The same multiplicative shrinkage that caused vanishing gradients across *layers* in Lesson 14 causes vanishing (or, with different weights, exploding) gradients across *timesteps* here — and because sequences can easily be far "deeper" in time than a network is in layers, this is the single most consequential practical limitation of plain RNNs.

## Next lesson

An RNN is forced to compress everything relevant from the past into one evolving hidden state, updated one step at a time — a real bottleneck for long sequences, worsened by exactly the vanishing-gradient problem just demonstrated. What if, instead of forcing all of history through a single evolving memory, a model could look directly back at *any* earlier position in the sequence, whenever it actually needed to, without that information having to survive a long chain of multiplications first? That's the idea behind attention — next.
