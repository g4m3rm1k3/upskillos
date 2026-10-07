# Ratios, rates and scaling

A drawing at 1 : 20 shows a bracket a twentieth of its real size. A coolant must be mixed at 5% concentrate. A pump moves 12 litres per minute, a second pump 8, and the tank holds 600 litres. A prototype part works at half size, and someone wants to know whether the full-size part will be twice as strong. All of these are about comparing quantities by **ratio**: how many times one is another. Ratios are the simplest mathematics in this series and some of the most used, and the last question above has a surprising answer that explains why giants, bridges and big machines are built differently from small ones.

This lesson covers:

- ratios and proportions, and the difference between direct and inverse proportion;
- rates, and combining rates of things working together;
- scaling: why lengths, areas and volumes scale by k, k² and k³ (the square–cube law);
- normalising: putting quantities on a common scale so they can be compared.

## Ratios and proportion

::: math
\[ \text{direct: } y = k\,x, \qquad \text{inverse: } y = \frac{k}{x} \]
- gear ratio $= \dfrac{N_\text{driver}}{N_\text{driven}}$; here $\dfrac{48}{16} = 3$
- inverse proportion: $n$ machines finish a job in $T_1 / n$ hours
In code: `Fraction(48, 16)` keeps the ratio exact; `hours_on_one / machines` is the inverse proportion
:::


A **ratio** compares two quantities of the same kind by division: a gear with 48 teeth driving one with 16 has a ratio of 48 : 16, which is 3 : 1, so the small gear turns 3 times for each turn of the large one. Two ratios that are equal form a **proportion**, and most "how much do I need" questions are proportions in disguise. Mixing 5% coolant means concentrate : total = 5 : 100, so 12 litres of mixture needs 12 × 5 / 100 = 0.6 litres of concentrate.

Two kinds of proportion behave differently:

- **direct proportion**: one quantity is a constant times the other (y = kx). Doubling x doubles y. Cost is directly proportional to the number of parts.
- **inverse proportion**: the product is constant (xy = k). Doubling x halves y. With twice as many identical machines, a batch takes half the time.

Predict before running: how long does the batch take on 3 machines, and on 5?

```python type
from fractions import Fraction

driver, driven = 48, 16
print("gear ratio", Fraction(driver, driven), "-> the small gear turns", driver / driven, "times per turn of the large one")

batch_hours_on_one = 30
for machines in [1, 2, 3, 5]:
    print(f"{machines} machine(s): {batch_hours_on_one / machines:.1f} h")

target_litres, percent = 12, 5
concentrate = target_litres * percent / 100
print(f"{target_litres} L of {percent}% coolant: {concentrate} L concentrate + {target_litres - concentrate} L water")
```

```output
gear ratio 3 -> the small gear turns 3.0 times per turn of the large one
1 machine(s): 30.0 h
2 machine(s): 15.0 h
3 machine(s): 10.0 h
5 machine(s): 6.0 h
12 L of 5% coolant: 0.6 L concentrate + 11.4 L water
```

`Fraction(48, 16)` reduces the ratio to lowest terms, 3.

Three machines take 10 hours and five take 6: the hours times the machines stay at 30 machine-hours, the constant of inverse proportion. This assumes the work divides perfectly, which real jobs rarely do. Setup time does not shrink with more machines, so the true curve flattens: a first example of a model being only as good as its assumptions.

## Rates, and rates working together

::: math
\[ T_\text{together} = \frac{1}{\dfrac{1}{T_1} + \dfrac{1}{T_2}}, \qquad \bar{v} = \frac{2}{\dfrac{1}{v_1} + \dfrac{1}{v_2}} \]
- rates add: $r = r_1 + r_2$; times do not
- $\bar{v}$: the harmonic mean, the true average speed over equal distances
In code: `tank / sum(pump_rates)`, and the harmonic mean `n / sum(1 / v for v in values)`
:::


A **rate** is a ratio of quantities of **different** kinds, usually per unit time: litres per minute, parts per hour, millimetres per revolution. Rates of things working **together** add: two pumps at 12 and 8 litres per minute together deliver 20. But **times** for a job do not add: if one pump alone fills the tank in 50 minutes and the other in 75, together they do not take 125 minutes, or the average 62.5. Add their **rates** (1/50 + 1/75 of a tank per minute) and invert.

The same trap appears with average speeds. Driving 60 km at 60 km/h and back at 40 km/h does not average 50 km/h. The average speed is total distance over total time, which is the **harmonic mean** of the speeds when the distances are equal. Predict before running: how long do the two pumps take together, and what is the true average speed?

```python type
tank = 600
pump_rates = [12, 8]
times_alone = [tank / r for r in pump_rates]
together = tank / sum(pump_rates)
print("alone:", times_alone, "min; together:", together, "min")
print("wrong guesses: sum", sum(times_alone), " average", sum(times_alone) / 2)

def harmonic_mean(values):
    return len(values) / sum(1 / v for v in values)

out_speed, back_speed, distance = 60, 40, 60
true_average = 2 * distance / (distance / out_speed + distance / back_speed)
print("average speed:", true_average, "km/h  harmonic mean:", round(harmonic_mean([60, 40]), 9), "  arithmetic mean:", (60 + 40) / 2)
```

```output
alone: [50.0, 75.0] min; together: 30.0 min
wrong guesses: sum 125.0  average 62.5
average speed: 48.0 km/h  harmonic mean: 48.0   arithmetic mean: 50.0
```

The harmonic mean is n divided by the sum of reciprocals. It is the right average for rates over equal amounts of work or distance.

Together the pumps take 30 minutes, much less than either alone, as they must. The round trip averages 48 km/h, not 50, because more **time** is spent at the slower speed. Whenever you average rates, ask what is held equal: equal times call for the arithmetic mean, equal amounts of work for the harmonic mean.

## Scaling: the square–cube law

::: math
\[ \text{length} \propto k, \qquad \text{area} \propto k^2, \qquad \text{volume, mass} \propto k^3 \]
- $k$: the scale factor applied in every direction
- self-weight stress $= \dfrac{\text{weight}}{\text{area}} \propto \dfrac{k^3}{k^2} = k$
In code: `length * k`, `area * k ** 2`, `volume * k ** 3`
:::


Scale a part by a factor k in every direction. Every **length** (edges, hole spacings, perimeters) multiplies by k. Every **area** (cross-sections, surfaces, faces) multiplies by k², because area is length times length. Every **volume**, and so every mass of the same material, multiplies by k³.

This is the **square–cube law**, and it has consequences. A beam's strength depends on its cross-section (k²), but its weight grows with its volume (k³), so the stress from its own weight grows like k³ / k² = k. Scale a working bracket up 10 times and the stress from its own weight is 10 times larger. Heat is generated through a volume and lost through a surface, which is why large motors need forced cooling that small ones do not. Predict before running: if a half-scale prototype works, how much heavier and how much more stressed by its own weight is the full-size part?

```python type
def scale_report(k, length=40.0, area=120.0, volume=900.0):
    return {"length": length * k, "area": area * k ** 2, "volume": volume * k ** 3, "self-weight stress factor": k}

for k in [0.5, 1, 2, 10]:
    r = scale_report(k)
    print(f"k = {k:>4}: length {r['length']:>7.1f} mm  area {r['area']:>9.1f} mm^2  volume {r['volume']:>11.1f} mm^3  stress x{r['self-weight stress factor']}")

prototype_mass_g = 85
full_size_mass = prototype_mass_g * 2 ** 3
print(f"half-scale prototype {prototype_mass_g} g -> full size {full_size_mass} g, self-weight stress x2")
```

```output
k =  0.5: length    20.0 mm  area      30.0 mm^2  volume       112.5 mm^3  stress x0.5
k =    1: length    40.0 mm  area     120.0 mm^2  volume       900.0 mm^3  stress x1
k =    2: length    80.0 mm  area     480.0 mm^2  volume      7200.0 mm^3  stress x2
k =   10: length   400.0 mm  area   12000.0 mm^2  volume    900000.0 mm^3  stress x10
half-scale prototype 85 g -> full size 680 g, self-weight stress x2
```

The prototype is half scale, so going to full size is k = 2: 8 times the mass, 4 times the cross-section, twice the stress.

The full-size part weighs 680 g, eight times the prototype, but its cross-sections are only four times larger, so stresses from its own weight double. A part that coped at half size might not at full size, and a scale model that works proves less than it seems. Engineers handle this with dimensionless numbers, the subject of a later lesson, which tell them exactly which quantities must match between a model and the real thing.

## Normalising

::: math
\[ \text{rate per }1000 = 1000 \times \frac{\text{count}}{\text{total}}, \qquad \text{share}_i = \frac{x_i}{\sum_j x_j} \]
- normalising puts quantities of different sizes on a common scale
- shares always add up to 1
In code: `1000 * scrapped / made`, and `e / total` for each share
:::


Comparing quantities of different sizes or units often starts by putting them on a common scale, called **normalising**. Common forms:

- **per unit**: divide by a reference, such as scrap per 1,000 parts, or energy per part, so large and small factories can be compared;
- **share of a total**: divide each value by the sum, giving fractions that add to 1, as with percentages of a budget;
- **min–max scaling**: map a range linearly onto 0 to 1 with (x − min) / (max − min), as dashboards and many algorithms do.

Predict before running: which line has the lowest scrap rate, though it scraps the most parts?

```python type
lines = {"line A": (12_000, 84), "line B": (3_500, 41), "line C": (40_000, 220)}
for name, (made, scrapped) in lines.items():
    print(f"{name}: {scrapped:>3} scrapped of {made:>6,} = {1000 * scrapped / made:.1f} per 1000")

energy = [312, 280, 455, 390]
total = sum(energy)
shares = [round(e / total, 3) for e in energy]
lo, hi = min(energy), max(energy)
print("shares:", shares, "sum", round(sum(shares), 3))
print("min-max scaled:", [round((e - lo) / (hi - lo), 3) for e in energy])
```

```output
line A:  84 scrapped of 12,000 = 7.0 per 1000
line B:  41 scrapped of  3,500 = 11.7 per 1000
line C: 220 scrapped of 40,000 = 5.5 per 1000
shares: [0.217, 0.195, 0.317, 0.271] sum 1.0
min-max scaled: [0.183, 0.0, 1.0, 0.629]
```

Shares add to 1 (up to rounding). Min–max scaling sends the smallest value to 0 and the largest to 1.

Line C scraps the most parts, 220, but at 5.5 per 1,000 it has the **lowest** rate; line B, with only 41 scrapped, has the highest at 11.7 per 1,000. Raw counts mislead whenever the totals differ, and normalising is how fair comparisons are made.

::: challenge Mixing to a concentration [easy]
Write `concentrate_needed(total_litres, percent)`, returning the litres of pure concentrate in `total_litres` of mixture at `percent` strength. Then write `top_up(current_litres, current_percent, target_percent, tank_litres)`, which returns the litres of **pure concentrate** to add to an existing mix so that, after topping up the rest of the tank with water, the tank is full at the target strength. If the existing mix already contains more concentrate than a full tank at the target needs, or the existing mix plus the concentrate to add would not fit in the tank, raise `ValueError`. Round both results to 3 decimal places.

```python starter
def concentrate_needed(total_litres, percent):
    return 0

print(concentrate_needed(12, 5))
```

```python solution
def concentrate_needed(total_litres, percent):
    return round(total_litres * percent / 100, 3)

def top_up(current_litres, current_percent, target_percent, tank_litres):
    have = current_litres * current_percent / 100
    need = tank_litres * target_percent / 100
    if have > need + 1e-12:
        raise ValueError("the existing mix is already too strong for a full tank")
    if current_litres + (need - have) > tank_litres + 1e-12:
        raise ValueError("the concentrate needed does not fit in the tank")
    return round(need - have, 3)

print(concentrate_needed(12, 5), top_up(100, 3, 5, 200))
```

```python test
for _n in ["concentrate_needed", "top_up"]:
    assert _n in dir(), f"Define {_n}."
assert concentrate_needed(12, 5) == 0.6 and concentrate_needed(200, 7.5) == 15.0 and concentrate_needed(0, 5) == 0, "Concentrate is total × percent / 100."
assert top_up(100, 3, 5, 200) == 7.0, "A full 200 L tank at 5% needs 10 L; 100 L at 3% already has 3 L, so add 7 L."
assert top_up(0, 0, 4, 50) == 2.0 and top_up(50, 4, 4, 50) == 0.0, "An empty tank, and a tank already right."
try:
    top_up(150, 10, 5, 200)
    assert False, "15 L of concentrate is more than a full tank at 5% needs (10 L): raise ValueError."
except ValueError:
    pass
for _args in [(195, 0, 5, 200), (250, 1, 2, 200)]:
    try:
        top_up(*_args)
        assert False, f"top_up{_args}: the mix plus the concentrate would not fit in the tank, so raise ValueError."
    except ValueError:
        pass
"SUCCESS: Concentration problems are proportions: concentrate is total times strength, and topping up is the difference between what a full tank needs and what is already there."
```

Hint: Litres of concentrate are `litres * percent / 100`. For the top-up, compare what the full tank needs at the target strength with what the current mix already contains.
:::

::: challenge Scaling a part [medium]
A part's datasheet gives its `length_mm`, `cross_section_mm2`, `volume_mm3` and `mass_kg`. Write `scale_part(part, k)` returning a new dict with the same keys for the part scaled by factor `k` in every direction, values rounded to 4 significant figures (use `float(f"{x:.4g}")`), plus a key `"self_weight_stress_factor"`, how many times larger the stress from its own weight becomes (also rounded the same way). Then write `scale_for_mass(part, target_mass_kg)`, returning the scale factor k (rounded to 4 significant figures) that gives the target mass. Raise `ValueError` for a non-positive `k` or target.

```python starter
def scale_part(part, k):
    return dict(part)

bracket = {"length_mm": 80, "cross_section_mm2": 150, "volume_mm3": 24000, "mass_kg": 0.188}
print(scale_part(bracket, 2))
```

```python solution
def _sig4(x):
    return float(f"{x:.4g}")

def scale_part(part, k):
    if k <= 0:
        raise ValueError("the scale factor must be positive")
    return {
        "length_mm": _sig4(part["length_mm"] * k),
        "cross_section_mm2": _sig4(part["cross_section_mm2"] * k ** 2),
        "volume_mm3": _sig4(part["volume_mm3"] * k ** 3),
        "mass_kg": _sig4(part["mass_kg"] * k ** 3),
        "self_weight_stress_factor": _sig4(k),
    }

def scale_for_mass(part, target_mass_kg):
    if target_mass_kg <= 0:
        raise ValueError("the target mass must be positive")
    return _sig4((target_mass_kg / part["mass_kg"]) ** (1 / 3))

bracket = {"length_mm": 80, "cross_section_mm2": 150, "volume_mm3": 24000, "mass_kg": 0.188}
print(scale_part(bracket, 2), scale_for_mass(bracket, 1.504))
```

```python test
for _n in ["scale_part", "scale_for_mass"]:
    assert _n in dir(), f"Define {_n}."
_b = {"length_mm": 80, "cross_section_mm2": 150, "volume_mm3": 24000, "mass_kg": 0.188}
assert scale_part(_b, 2) == {"length_mm": 160.0, "cross_section_mm2": 600.0, "volume_mm3": 192000.0, "mass_kg": 1.504, "self_weight_stress_factor": 2.0}, f"Got {scale_part(_b, 2)}."
assert scale_part(_b, 0.5)["mass_kg"] == 0.0235 and scale_part(_b, 0.5)["cross_section_mm2"] == 37.5, "Half scale: an eighth of the mass, a quarter of the area."
assert scale_part(_b, 1.1)["volume_mm3"] == 31940.0, "Results are rounded to 4 significant figures."
assert _b["length_mm"] == 80, "Do not change the original part."
assert scale_for_mass(_b, 1.504) == 2.0 and scale_for_mass(_b, 0.188) == 1.0, "Mass grows as k cubed, so k is the cube root of the mass ratio."
for _call in [lambda: scale_part(_b, 0), lambda: scale_part(_b, -1), lambda: scale_for_mass(_b, 0)]:
    try:
        _call()
        assert False, "Non-positive scales and masses should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Lengths scale by k, areas by k², volumes and masses by k³, so the stress a part's own weight causes grows by k: the square–cube law in four lines."
```

Hint: Multiply lengths by `k`, areas by `k ** 2`, volumes and masses by `k ** 3`; the self-weight stress factor is `k`. Inverting the mass relation gives `k = (target / mass) ** (1 / 3)`.
:::

::: challenge Splitting a run in proportion [hard]
A production run of `total` parts must be split between machines in proportion to their rates (parts per hour), so that they all finish at about the same time. Parts are whole, so the exact shares must be rounded, and the rounded shares must still add up to `total`. Write `split_run(total, rates)` using the **largest remainder method**: give each machine the whole-number part of its exact share (`total * rate / sum(rates)`), then hand the parts left over, one each, to the machines with the largest fractional remainders (ties go to the earlier machine in the list). Return the list of counts. Raise `ValueError` if there are no machines or any rate is not positive. Use `Fraction` for the exact shares, so no float rounding can change which machine gets a leftover part.

```python starter
def split_run(total, rates):
    return [round(total * r / sum(rates)) for r in rates]

print(split_run(100, [3, 3, 3]))
```

```python solution
from fractions import Fraction
import math

def split_run(total, rates):
    if not rates or any(r <= 0 for r in rates):
        raise ValueError("need at least one machine, every rate positive")
    rate_sum = sum(Fraction(r) for r in rates)
    exact = [Fraction(total) * Fraction(r) / rate_sum for r in rates]
    counts = [math.floor(e) for e in exact]
    leftover = total - sum(counts)
    order = sorted(range(len(rates)), key=lambda i: (-(exact[i] - counts[i]), i))
    for i in order[:leftover]:
        counts[i] += 1
    return counts

print(split_run(100, [3, 3, 3]), split_run(1000, [12, 8, 5]))
```

```python test
import random as _random
from fractions import Fraction as _F
assert "split_run" in dir(), "Keep the function's name as split_run."
assert split_run(100, [3, 3, 3]) == [34, 33, 33], f"Equal machines: the leftover part goes to the first; got {split_run(100, [3, 3, 3])}."
assert split_run(1000, [12, 8, 5]) == [480, 320, 200], "Exact shares need no rounding."
assert split_run(10, [1, 1, 1, 1, 1, 1, 1]) == [2, 2, 2, 1, 1, 1, 1], "Three leftovers go to the first three of equal machines."
assert split_run(7, [5, 1]) == [6, 1], "5/6 of 7 is 5.83 and 1/6 is 1.17: floors 5 and 1, the leftover goes to the larger remainder."
assert split_run(0, [2, 3]) == [0, 0], "Nothing to split."
_rng = _random.Random(4)
for _ in range(300):
    _rates = [_rng.randint(1, 40) for _ in range(_rng.randint(1, 8))]
    _total = _rng.randint(0, 5000)
    _c = split_run(_total, _rates)
    _s = sum(_rates)
    assert sum(_c) == _total, f"Counts must add up to {_total}; got {sum(_c)} for rates {_rates}."
    assert all(abs(_F(_ci) - _F(_total * _r, _s)) < 1 for _ci, _r in zip(_c, _rates)), f"Each count must be its exact share rounded up or down; got {_c} for {_rates}."
for _bad in [[], [3, 0], [2, -1]]:
    try:
        split_run(10, _bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Exact fractional shares, floors, then leftovers by largest remainder: the counts are as close to proportional as whole numbers allow, and always add up."
```

Hint: Compute the exact shares as `Fraction`s, take `math.floor` of each, and count how many parts are left over. Sort machine indexes by remainder, largest first, breaking ties by index (sort by `(-remainder, index)`), and give one extra part to each of the first `leftover` of them.
:::

## What you learned

- A ratio compares quantities of the same kind; a proportion says two ratios are equal. In direct proportion y = kx; in inverse proportion xy is constant.
- Rates of things working together add, but times do not. Combine rates, then invert. Averaging rates over equal distances or amounts of work needs the harmonic mean.
- Scaling by k multiplies lengths by k, areas by k² and volumes and masses by k³. The square–cube law means stress from a structure's own weight grows with its size.
- Normalising (per unit, shares of a total, min–max) makes quantities of different sizes comparable; raw counts mislead when totals differ.
- Proportional splits of whole items need careful rounding; the largest remainder method keeps the total exact.

The next lesson covers powers, roots and orders of magnitude: writing very large and very small quantities, and estimating answers before computing them.
