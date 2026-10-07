# Lesson 1: Knobs and Wrongness

**Goal:** see exactly what "a list of values to tune" means, and what "learning" is, using a problem so small you can check it by eye.

**You will type:** a taxi fare guesser with two knobs, a wrongness score, and a brute-force search. All of it goes in a new file called `learning_lab.py`.

---

## The idea first

A taxi charges a fixed pickup fee plus a price for every kilometre. You don't know either number. You only have records of past rides: how far, and what was paid.

You can build a **guesser**: a tiny machine with two adjustable numbers.

- `base_fee`: the pickup charge
- `price_per_km`: the rate per kilometre

Those two numbers are the **knobs**. Different knob settings give different guesses. Some settings guess well, some guess badly. "Learning" means finding good settings *from the data*, without anyone telling you the true rule.

That is genuinely all of it. Every ML algorithm later in this series is a bigger version of this.

---

## Step 1: The data

Type this at the top of `learning_lab.py`:

```python
rides = [
    (1.0, 5.2),
    (2.5, 8.1),
    (4.0, 10.9),
    (6.0, 15.2),
    (8.5, 19.8),
    (10.0, 23.1),
]
```

**How it's stored:** `rides` is a list. Each item is a *tuple* of two floats: `(distance_km, actual_fare)`. In your visualiser you should see six rows, each with two values. (The real rule I used to invent these was 3.0 + 2.0 × km, plus a little noise, as real data always has. The program doesn't know that.)

Run it. Look at `rides` in the visualiser.

---

## Step 2: The guesser (the knobs live here)

Type below the data:

```python
class FareGuesser:
    def __init__(self, base_fee, price_per_km):
        self.base_fee = base_fee
        self.price_per_km = price_per_km

    def guess(self, distance_km):
        return self.base_fee + self.price_per_km * distance_km
```

**How it works:**

- `__init__(self, base_fee, price_per_km)` is the constructor. It takes two numbers and stores them as attributes on the object. Nothing else is stored.
- **Those two stored attributes are the knobs.** If you could freeze the program and look at its memory, the entire "brain" of this guesser is two floats.
- `guess(self, distance_km)` takes one number and returns one number. It's a formula: fee plus rate times distance.

Now try it. Add:

```python
rough_guesser = FareGuesser(1.0, 1.0)
rough_guesses = []
for distance_km, actual_fare in rides:
    rough_guesses.append((distance_km, rough_guesser.guess(distance_km), actual_fare))
```

Run it and open `rough_guesses` and `rough_guesser` in the visualiser. For the first ride, the guesser says 2.0 and the real fare was 5.2. It's way off, as expected for knob settings picked at random.

---

## Step 3: A score for how wrong it is

To tune knobs we need ONE number that says how bad a setting is. Add this method inside the `FareGuesser` class (indented, below `guess`):

```python
    def wrongness(self, rides):
        total_squared_miss = 0.0
        for distance_km, actual_fare in rides:
            miss = self.guess(distance_km) - actual_fare
            total_squared_miss += miss * miss
        return total_squared_miss / len(rides)
```

**Walk through it with ride 1 and knobs (1.0, 1.0):**

| piece | value |
|---|---|
| guess | 1.0 + 1.0 × 1.0 = 2.0 |
| actual | 5.2 |
| `miss` | 2.0 − 5.2 = **−3.2** |
| `miss * miss` | **10.24** |

It does that for all six rides, adds the squares up, and divides by 6 to get an average.

**Why square the miss?**

1. A miss of −3 (too low) and +3 (too high) would otherwise cancel each other out and look like "perfect". Squares are never negative.
2. Squaring punishes big misses much more than small ones (a miss of 4 costs 16, a miss of 2 costs only 4).

The result is a single number: **0 means perfect, bigger means worse.** This is called the *loss*, *cost* or *error* in textbooks. In this series: **wrongness**.

Test it:

```python
print(rough_guesser.wrongness(rides))
```

---

## Step 4: Compare three knob settings

```python
settings_to_try = [(1.0, 1.0), (3.0, 2.0), (6.0, 0.5)]
wrongness_of_settings = {}
for base_fee, price_per_km in settings_to_try:
    guesser = FareGuesser(base_fee, price_per_km)
    wrongness_of_settings[(base_fee, price_per_km)] = guesser.wrongness(rides)
```

**How it's stored:** a dict whose *keys* are tuples (the knob settings) and whose *values* are wrongness scores. Open `wrongness_of_settings` in your visualiser. One setting should have a score near 0.03 and the other two are far larger. You just did learning by hand: you tried settings and kept the best one.

---

## Step 5: Let the computer try every setting

Add a loop that sweeps a whole grid of knob values:

```python
wrongness_by_knobs = {}
for base_fee_steps in range(0, 13):
    base_fee = base_fee_steps * 0.5
    for rate_steps in range(0, 9):
        price_per_km = rate_steps * 0.5
        guesser = FareGuesser(base_fee, price_per_km)
        wrongness_by_knobs[(base_fee, price_per_km)] = guesser.wrongness(rides)

best_knobs = min(wrongness_by_knobs, key=wrongness_by_knobs.get)
```

**What it does:**

- `range(0, 13)` gives 0..12; multiplying by 0.5 turns that into base fees 0.0, 0.5, ..., 6.0 (13 values). The rate goes 0.0, 0.5, ..., 4.0 (9 values). (We loop over whole numbers and multiply because adding 0.5 repeatedly accumulates tiny floating point errors.)
- The nested loops try all 13 × 9 = **117** combinations.
- `min(thing, key=function)`: `min` normally compares items directly. With `key=`, it calls your function on every item and picks the item with the smallest result. Iterating a dict gives its keys, and `wrongness_by_knobs.get` looks up a key's value. So this asks "which knob setting has the smallest wrongness score?" and returns the setting itself.

**Look at:** `wrongness_by_knobs` (117 entries) and `best_knobs`. You should get `(3.0, 2.0)`.

Congratulations: the program just *learned* the taxi pricing rule from six examples.

---

## The decoder: what the scary symbols mean

You said you see a math symbol and a list of values to tune. Here is the translation table for everything in this lesson:

| In the math | In your code |
|---|---|
| θ (theta), w, "the parameters", "weights" | `base_fee` and `price_per_km`, the knobs |
| f(x; θ), "the model" | `FareGuesser.guess` |
| L(θ), J(θ), "the loss / cost function" | `FareGuesser.wrongness` |
| Σ (sigma, "sum over all examples") | the `for` loop with `total_squared_miss += ...` |
| 1/n | `/ len(rides)` |
| argmin over θ of L(θ), "find the θ that minimises the loss" | `min(wrongness_by_knobs, key=wrongness_by_knobs.get)` |

So "minimise L(θ) over θ" is a fancy way of writing the whole of Step 5.

---

## Guided exploration

**Do this in a copy** so your main file stays clean: save `learning_lab.py` as `learning_lab_explore1.py`.

1. **Finer grid.** Change the loops so the knobs step by 0.1 instead of 0.5. (Hint: loop over `range(0, 61)` and `range(0, 41)` and multiply by 0.1.) Run it. How many entries does `wrongness_by_knobs` have now? Does `best_knobs` change?
2. **The explosion.** Add this at the bottom and run it:

```python
values_per_knob = 13
for number_of_knobs in [2, 5, 10, 20]:
    print(number_of_knobs, "knobs ->", values_per_knob ** number_of_knobs, "combinations")
```

Look at how fast it grows. Real models have millions or billions of knobs. Trying every combination is hopeless. **This is the reason all the clever algorithms exist**: they are smarter ways of nudging.
3. **A different kind of "wrong".** In `wrongness`, replace `miss * miss` with `abs(miss)`. Does the best knob setting change? What does that tell you about how much the choice of score matters?

When you're done, go back to your main `learning_lab.py` and leave the copy alone.

---

## Check yourself (no quiz, just be honest)

You've got the lesson if you can say, in your own words:

- What two things are the "knobs" in this program, and where are they stored?
- What does `wrongness` return, and why is the answer never negative?
- Why did we stop at 117 combinations and what would break if we had 20 knobs?

If any of those is shaky, re-read Steps 2 and 3 while looking at your visualiser. Everything later builds on them.

**Next:** Lesson 2 replaces "try everything" with "feel which direction is downhill".
