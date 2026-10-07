# Lesson 2: Feeling the Slope

**Goal:** replace "try every combination" with "ask which way is downhill, take a small step, repeat". This is *gradient descent*, the engine inside almost all of modern ML, and you'll build it without any calculus.

**You will type:** onto the bottom of the same `learning_lab.py` from Lesson 1. Leave Lesson 1's code in place; this lesson reuses `rides` and `FareGuesser`.

---

## The idea first

Imagine standing on a hillside in thick fog. You can't see the valley, but you can feel the ground under your feet: it tilts one way. If you always step a little in the downhill direction, you'll end up at the bottom without ever seeing the map.

In our problem:

- Your position on the hill is the knob setting `(base_fee, price_per_km)`.
- Your height is the **wrongness**. The valley bottom is the best knob setting.
- The tilt of the ground is the **slope**: "if I raise this knob a tiny bit, does wrongness go up or down, and by how much?"

How do we measure the tilt without calculus? **Wiggle the knob and see what happens.**

```
slope = (wrongness after the wiggle - wrongness before) / size of the wiggle
```

A negative slope means "raising this knob makes things better". A positive slope means "raising it makes things worse". A big number means "this knob matters a lot right here".

---

## Step 1: A convenient scoring function

`FareGuesser` needs an object each time. For this lesson it's handier to score knob values directly. Add:

```python
def wrongness_at(base_fee, price_per_km):
    return FareGuesser(base_fee, price_per_km).wrongness(rides)
```

**Signature:** takes two numbers, returns one number (the wrongness). It builds a throwaway guesser, asks it to score itself against `rides`, and returns the result.

Test: `print(wrongness_at(0.0, 0.0))` and `print(wrongness_at(3.0, 2.0))`. The first is large, the second tiny.

---

## Step 2: Feel the slope of each knob

```python
def slope_of_base_fee(base_fee, price_per_km, wiggle=0.0001):
    wrongness_before = wrongness_at(base_fee, price_per_km)
    wrongness_after = wrongness_at(base_fee + wiggle, price_per_km)
    return (wrongness_after - wrongness_before) / wiggle


def slope_of_price_per_km(base_fee, price_per_km, wiggle=0.0001):
    wrongness_before = wrongness_at(base_fee, price_per_km)
    wrongness_after = wrongness_at(base_fee, price_per_km + wiggle)
    return (wrongness_after - wrongness_before) / wiggle
```

**How they work:** each function nudges *one* knob by a tiny amount (0.0001) while keeping the other fixed, re-scores, and divides the change in wrongness by the size of the nudge. `wiggle=0.0001` is a default argument: you can call the function with just two arguments and it fills in 0.0001.

Now look at the slopes at the worst starting point:

```python
slope_of_base_fee_at_start = slope_of_base_fee(0.0, 0.0)
slope_of_price_at_start = slope_of_price_per_km(0.0, 0.0)
```

Open both in your visualiser. You should see roughly **−27** and **−187**.

**Reading them:**

- Both are negative, so raising either knob makes the guesser less wrong. Good: our guesses at 0 are too low.
- The second is about seven times bigger. At this spot the per-km price matters far more than the pickup fee. (Makes sense: rides are 1 to 10 km, so the rate gets multiplied by a bigger number than the base fee.)

---

## Step 3: Follow the slope downhill

The rule for one step is:

```
knob = knob - learning_rate * slope
```

- Minus, because a negative slope should push the knob *up*, and a positive slope should push it *down*. Always opposite to the slope.
- `learning_rate` is how big a step to take. We haven't met this knob before: it's a setting for the *learning process itself* rather than for the guesser, so people call it a **hyperparameter**.

Type the full loop:

```python
def train_by_slopes(start_base_fee, start_price_per_km, learning_rate, steps):
    base_fee = start_base_fee
    price_per_km = start_price_per_km
    history = []
    for step_number in range(steps):
        base_slope = slope_of_base_fee(base_fee, price_per_km)
        rate_slope = slope_of_price_per_km(base_fee, price_per_km)
        base_fee = base_fee - learning_rate * base_slope
        price_per_km = price_per_km - learning_rate * rate_slope
        history.append({
            "step": step_number,
            "base_fee": base_fee,
            "price_per_km": price_per_km,
            "wrongness": wrongness_at(base_fee, price_per_km),
        })
    return history
```

**How it's built:**

- It returns `history`, a list of dicts, one per step. Each dict records the knobs and the wrongness *after* that step. This is what you'll stare at in the visualiser.
- Important detail: both slopes are measured **before** either knob is changed in that step, so the two knobs move together based on the same spot on the hill.

Run it:

```python
history = train_by_slopes(0.0, 0.0, 0.01, 2000)
```

**Look at `history`.** Open the first few entries, a middle one, and the last. You should see:

- step 0: base fee ~0.27, rate ~1.87, wrongness already down from 228 (what `wrongness_at(0.0, 0.0)` gives) to ~12
- later steps: wrongness keeps shrinking, fast at first, then slower and slower (the ground flattens near the valley floor, so slopes get small and steps shrink automatically)
- step 1999: base fee ~3.14, rate ~1.98, wrongness ~0.0195

Notice something: **gradient descent beat the brute-force search.** Lesson 1's best was (3.0, 2.0) with wrongness 0.025. The slope-follower landed on (3.14, 1.98) with 0.0195, because it wasn't limited to a grid of 0.5 steps. The true data has noise in it, so the best fit isn't exactly 3 and 2.

---

## Why this beats trying everything

- Brute force: cost grows as (values per knob) ^ (number of knobs).
- Slope following: each step costs **two scorings per knob** (before and after the wiggle). That grows with the number of knobs, not exponentially.

With a billion knobs the wiggle method is still too slow (a billion wiggles per step). The fix is to compute all the slopes at once with calculus: that's what the **derivative** and **backpropagation** are (a later lesson). They give you the same numbers you just measured by wiggling, only exactly and fast. Nothing mystical: *a derivative is the slope you measured, found by algebra instead of by wiggling.*

---

## The decoder

| In the math | In your code |
|---|---|
| ∂L/∂w, ∇L ("gradient", "partial derivative of the loss") | `slope_of_base_fee`, `slope_of_price_per_km` (the gradient is just the list of all the slopes) |
| η (eta), α (alpha), "learning rate" | `learning_rate` |
| w ← w − η ∂L/∂w | `base_fee = base_fee - learning_rate * base_slope` |
| "gradient descent" | the loop in `train_by_slopes` |
| "converged" | the history rows stop changing |
| "epoch" or "iteration" | one pass of the `for step_number` loop |

---

## Guided exploration

Copy the file as `learning_lab_explore2.py` first.

1. **Too big a step.** Run `train_by_slopes(0.0, 0.0, 0.03, 8)` and print `[round(row["wrongness"]) for row in ...]`. Wrongness should *grow* every step: roughly 420, 770, 1400, 2600, ... The step overshoots the valley, lands higher on the opposite hillside, and gets worse each time. Slopes only describe the ground *right under your feet*, so a big step trusts the tilt too far.
2. **Too small a step.** Run `train_by_slopes(0.0, 0.0, 0.001, 2000)` and look at the last row. Wrongness will be around 0.28 and the knobs still hadn't reached ~3 and ~2. It's heading the right way, just very slowly.
3. **Find the edge.** Try 0.02, 0.025, 0.03. Somewhere around 0.026 it flips from working to exploding. (Why that exact number? It depends on how steeply curved this hill is, which depends on the data. Rides up to 10 km make the rate knob touchy.)
4. **Different start.** Try starting from `(6.0, 4.0)` (too high) and from `(3.0, 2.0)` (already good). Does it still end up in the same place?

Back to the main file when done. This learning-rate trade-off (too big explodes, too small crawls) is the first tuning headache of every real ML project.

---

## Challenge: three knobs

Real fares also depend on time. Here are new rides with `(distance_km, minutes, fare)`:

```python
rides_with_time = [
    (1.0, 5, 6.0),
    (3.0, 10, 11.0),
    (5.0, 20, 18.0),
    (2.0, 25, 15.5),
    (8.0, 15, 20.5),
    (6.0, 30, 23.5),
]
```

Build a learner for **three knobs**: `base_fee`, `price_per_km`, `price_per_minute`. Use the slope-following method from this lesson. It should find the pricing rule hidden in the data (the data has no noise, so the wrongness should head toward 0).

Rules:

- Don't edit the Lesson 1/2 code. Write new functions.
- While you write it, notice what's annoying: if you copy-paste `slope_of_...` once per knob you'll write three nearly identical functions. Think about how you'd avoid that if you had 100 knobs. (This annoyance is the whole motivation for storing knobs in a **list**, which is what real code does.)
- Hint if it explodes: minutes go up to 30, so this problem is touchier than the last. Lower the learning rate (try 0.001) and allow many more steps (20000).

The solution is in `solutions.md`. Try for a good while first.

---

## Check yourself

- If a knob's slope is +5, which way does the update move the knob, and why?
- Why did the history show smaller and smaller changes near the end, even though the learning rate never changed?
- What do we lose by measuring slopes with a wiggle instead of with calculus?

**Next:** Lesson 3 shows that the maze algorithm has the *same* shape, with a grid of numbers as the knobs.
