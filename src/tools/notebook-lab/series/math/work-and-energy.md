# Work and energy

Lifting a pallet onto a shelf, compressing a spring in a press, stopping a moving vehicle: each transfers **energy**, and each can be analysed without following the motion moment by moment. That is the great advantage of energy methods. Newton's law, simulated in the previous lessons, tracks how things move; energy bookkeeping answers "how fast at the bottom?", "how far to stop?" and "how big a motor?" with a single balance. The link between force and energy is **work**, force multiplied by distance, which for a varying force becomes an integral: the accumulation of the previous lesson in a physical setting.

This lesson covers:

- work done by a constant force, and the role of the angle between force and motion;
- work by a varying force as an integral, for springs and measured force curves;
- kinetic energy and the work–energy theorem;
- potential energy and conservation of energy;
- power, efficiency and sizing a motor.

## Work by a constant force

::: math
\[ W = F\,d\cos\theta = \mathbf{F} \cdot \mathbf{d} = F_x d_x + F_y d_y, \qquad W_\text{lift} = m g h \]
- $\theta$: angle between force and motion; only the component along the motion does work
- $\theta = 90°$ gives $W = 0$; a force against the motion does negative work
In code: `force_vec = F * np.array([math.cos(th), math.sin(th)])`, dotted with the displacement
:::


A constant force F that moves its point of application a distance d in the direction of the force does **work** W = F d, measured in joules (1 J = 1 N·m). If the force acts at an angle θ to the motion, only its component along the motion does work: W = F d cos θ. A force perpendicular to the motion does no work at all; a force against the motion does negative work, taking energy away.

In vector form this is the **dot product** of force and displacement, F · d = F_x d_x + F_y d_y, which equals |F||d| cos θ, the projection idea from the vectors lessons. Lifting a mass m through a height h against gravity takes W = m g h. Predict before running: pulling a 60 kg crate 12 m along the floor with a 150 N force on a rope angled 30° above horizontal, how much work does the rope do, and how much would it do pulling horizontally?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

g = 9.81
F, d = 150.0, 12.0
for angle in [0, 30, 60, 90]:
    th = math.radians(angle)
    force_vec = F * np.array([math.cos(th), math.sin(th)])
    disp_vec = np.array([d, 0.0])
    print(f"rope at {angle:>2}°: work F·d = {force_vec @ disp_vec:8.1f} J  (F d cos θ = {F * d * math.cos(th):8.1f} J)")
print(f"lifting 60 kg onto a 1.5 m shelf: m g h = {60 * g * 1.5:.0f} J")
```

```output
rope at  0°: work F·d =   1800.0 J  (F d cos θ =   1800.0 J)
rope at 30°: work F·d =   1558.8 J  (F d cos θ =   1558.8 J)
rope at 60°: work F·d =    900.0 J  (F d cos θ =    900.0 J)
rope at 90°: work F·d =      0.0 J  (F d cos θ =      0.0 J)
lifting 60 kg onto a 1.5 m shelf: m g h = 883 J
```

`force_vec @ disp_vec` is the dot product of two NumPy vectors.

Pulling horizontally the rope does 1,800 J; at 30° it does 1,559 J, because the upward part of the pull does nothing to move the crate along (though it does reduce the floor's friction, which is why ropes are angled). At 90° the work is zero (up to rounding). Lifting the crate onto a 1.5 m shelf takes 883 J, whatever route it takes up, a hint of the potential energy to come.

## Work by a varying force

::: math
\[ W = \int_{x_1}^{x_2} F(x)\,dx, \qquad \text{linear spring: } \int_0^x k s\,ds = \tfrac{1}{2} k x^2 \]
- the work is the area under the force–displacement curve
- measured data: integrate with the trapezoid rule
In code: `np.trapezoid(force_n, x_m)` against `0.5 * k_start * x_m[-1] ** 2`
:::


When the force changes along the way, split the path into short pieces, treat the force as constant on each, and add up F Δx: the same Riemann sum as before. In the limit,

\[ W = \int_{x_1}^{x_2} F(x)\,dx \]

the area under the force–displacement graph. A spring obeying Hooke's law needs force F = kx to hold it compressed by x, so compressing it from 0 to x takes W = ∫₀ˣ ks ds = ½kx²: stored as **elastic potential energy**.

Real springs, rubber mounts and gas struts are rarely perfectly linear, so engineers measure the force at several displacements and integrate the data. Predict before running: for this measured die spring, how does the work to compress it 20 mm compare with the linear formula using the stiffness at the start?

```python type
x_mm = np.array([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20], dtype=float)
force_n = np.array([0, 212, 430, 655, 890, 1138, 1402, 1686, 1993, 2330, 2702], dtype=float)
x_m = x_mm / 1000
work_data = np.trapezoid(force_n, x_m)
k_start = force_n[1] / x_m[1]
print(f"work from the measured curve: {work_data:.2f} J")
print(f"linear spring with the initial stiffness {k_start / 1000:.0f} N/mm: ½kx² = {0.5 * k_start * x_m[-1] ** 2:.2f} J")

fig, ax = plt.subplots(figsize=(6, 3))
ax.fill_between(x_mm, force_n, alpha=0.3, label=f"work = {work_data:.1f} J")
ax.plot(x_mm, force_n, "o-")
ax.plot(x_mm, k_start * x_m, "--", label="linear, initial stiffness")
ax.set_xlabel("compression (mm)")
ax.set_ylabel("force (N)")
ax.legend()
plt.show()
```

```output
work from the measured curve: 24.17 J
linear spring with the initial stiffness 106 N/mm: ½kx² = 21.20 J
```

The displacements are converted to metres so that newtons times metres gives joules.

The measured spring stiffens as it compresses (the curve bends upward), so the work, 24.2 J, is more than the 21.2 J the linear formula predicts with the initial stiffness. The shaded area is the work, and the trapezoid rule computes it straight from the measurements.

## Kinetic energy and the work–energy theorem

::: math
\[ W_\text{net} = \tfrac{1}{2} m v_2^2 - \tfrac{1}{2} m v_1^2, \qquad s = \frac{\tfrac{1}{2} m v^2}{F_b} \]
- work–energy theorem: net work changes the kinetic energy
- braking removes $F_b\,s$ of kinetic energy, so stopping distance grows with $v^2$
In code: `ke = 0.5 * m_car * v ** 2`, then `ke / F_brake`
:::


A mass m moving at speed v carries **kinetic energy** ½mv². The **work–energy theorem** says the net work done on an object equals its change in kinetic energy:

\[ W_\text{net} = \tfrac{1}{2} m v_2^2 - \tfrac{1}{2} m v_1^2 \]

It follows from F = ma: integrating m (dv/dt) along the path, with dx = v dt, gives ∫ m v dv = ½m(v₂² − v₁²). Braking is negative work: a constant braking force F_b over a distance s removes F_b s of kinetic energy, so the stopping distance is s = ½mv²/F_b, the v²/(2d) of the motion lesson rediscovered without any time variable. Predict before running: a 1,500 kg car at 50 km/h and at 100 km/h, with 9 kN of braking force: how far to stop, and how much heat goes into the brakes?

```python type
m_car, F_brake = 1500.0, 9000.0
for kmh in [50, 100]:
    v = kmh / 3.6
    ke = 0.5 * m_car * v ** 2
    print(f"{kmh:>3} km/h: kinetic energy {ke / 1000:6.1f} kJ, stops in {ke / F_brake:5.1f} m, brakes absorb {ke / 1000:.1f} kJ")
```

```output
 50 km/h: kinetic energy  144.7 kJ, stops in  16.1 m, brakes absorb 144.7 kJ
100 km/h: kinetic energy  578.7 kJ, stops in  64.3 m, brakes absorb 578.7 kJ
```

Twice the speed means four times the kinetic energy: 145 kJ at 50 km/h against 579 kJ at 100 km/h, so four times the stopping distance (16.1 m against 64.3 m, ignoring reaction time) and four times the heat in the brakes. Kinetic energy, not speed, is what the brakes have to destroy.

## Conservation of energy

::: math
\[ \tfrac{1}{2} m v^2 = m g h \qquad\Longrightarrow\qquad v = \sqrt{2 g h} \]
- with only gravity doing work, kinetic plus potential energy stays constant
- the shape of the chute does not matter, only the drop $h$
In code: `math.sqrt(2 * g * h)` against `slide()`, which steps along the curve with $g\sin\alpha$
:::


For forces like gravity and springs, the work depends only on where the object starts and ends, not on the path: lifting 883 J onto the shelf by any route stores 883 J. Such forces have a **potential energy**: m g h for gravity near the ground, ½kx² for a spring. When only these forces do work, the total mechanical energy, kinetic plus potential, stays constant. Friction and drag are different: they turn mechanical energy into heat.

Conservation answers questions that would otherwise need a simulation. A part sliding down a frictionless chute from height h reaches the bottom with ½mv² = mgh, so v = √(2gh), whatever the shape of the chute. Predict before running: does a simulation of a part on a curved chute agree?

```python type
def chute_height(x):
    return 2.0 * (1 - x / 3) ** 2

def slide(dt=1e-4):
    x, s_speed = 0.0, 0.0
    while x < 3.0:
        slope = (chute_height(x + 1e-6) - chute_height(x - 1e-6)) / 2e-6
        angle = math.atan(-slope)
        s_speed += g * math.sin(angle) * dt
        x += s_speed * math.cos(angle) * dt
    return s_speed

print(f"simulated speed at the bottom: {slide():.3f} m/s")
print(f"energy conservation √(2gh): {math.sqrt(2 * g * 2.0):.3f} m/s")
```

```output
simulated speed at the bottom: 6.264 m/s
energy conservation √(2gh): 6.264 m/s
```

The simulation follows the part along the curved chute: the component of gravity along the surface, g sin(angle), speeds it up, and the horizontal progress is the speed times cos(angle).

Both give about 6.26 m/s for the 2 m drop. The simulation needed a curve, a slope, a time step and a loop; conservation needed one line. The trade-off is that energy gives the speed at a place, not the time to get there.

## Power and efficiency

::: math
\[ P = \frac{dW}{dt} = F\,v, \qquad \eta = \frac{P_\text{out}}{P_\text{in}}, \qquad P_\text{in} = \frac{P_\text{out}}{\eta} \]
- power in watts: $1\ \text{W} = 1\ \text{J/s}$; efficiency $\eta < 1$
- lost power: $P_\text{in} - P_\text{out}$, turned into heat
In code: `useful_power = m_load * g * height / seconds`, then `useful_power / efficiency`
:::


**Power** is the rate of doing work, P = dW/dt, in watts (1 W = 1 J/s). For a constant force moving at speed v, P = F v. Real machines lose some energy to friction and heat, so the **efficiency** η = useful power out / power in is below 1, and the input power must be larger: P_in = P_out / η. Predict before running: a hoist lifts 500 kg by 8 m in 20 s through a gearbox and motor with a combined efficiency of 72%. What motor power is needed?

```python type
m_load, height, seconds, efficiency = 500.0, 8.0, 20.0, 0.72
useful_energy = m_load * g * height
useful_power = useful_energy / seconds
print(f"useful work {useful_energy / 1000:.1f} kJ, useful power {useful_power / 1000:.2f} kW")
print(f"input power needed {useful_power / efficiency / 1000:.2f} kW; lost as heat {(useful_power / efficiency - useful_power) / 1000:.2f} kW")
print(f"lifting speed {height / seconds} m/s, so P = F v = {m_load * g * height / seconds / 1000:.2f} kW")
```

```output
useful work 39.2 kJ, useful power 1.96 kW
input power needed 2.73 kW; lost as heat 0.76 kW
lifting speed 0.4 m/s, so P = F v = 1.96 kW
```

The hoist does 39.2 kJ of useful work in 20 s, 1.96 kW of useful power, and the motor must supply 2.73 kW, of which 0.76 kW warms the gearbox and motor. A real design would pick the next standard motor size up (3 kW) and allow for acceleration at the start of the lift.

::: challenge Work and power [easy]
Write `work(force, displacement)` for force and displacement given as 2D or 3D vectors (lists or arrays), returning their dot product as a plain float; raise `ValueError` if the lengths differ. Write `lift_work(mass, height, g=9.81)`. Then write `motor_power(mass, height, seconds, efficiency, g=9.81)`, the input power in watts needed to lift the mass through the height in the given time, rounded to 1 decimal place; raise `ValueError` unless 0 < efficiency ≤ 1 and seconds > 0.

```python starter
def work(force, displacement):
    return 0.0

def lift_work(mass, height, g=9.81):
    return 0.0

def motor_power(mass, height, seconds, efficiency, g=9.81):
    return 0.0

print(motor_power(500, 8, 20, 0.72))
```

```python solution
def work(force, displacement):
    if len(force) != len(displacement):
        raise ValueError("force and displacement must have the same dimension")
    return float(sum(f * d for f, d in zip(force, displacement)))

def lift_work(mass, height, g=9.81):
    return mass * g * height

def motor_power(mass, height, seconds, efficiency, g=9.81):
    if not 0 < efficiency <= 1 or seconds <= 0:
        raise ValueError("need 0 < efficiency <= 1 and a positive time")
    return round(lift_work(mass, height, g) / seconds / efficiency, 1)

print(motor_power(500, 8, 20, 0.72))
```

```python test
for _n in ["work", "lift_work", "motor_power"]:
    assert _n in dir(), f"Define {_n}."
assert work([150, 0], [12, 0]) == 1800.0 and abs(work([150 * math.cos(math.pi / 6), 75], [12, 0]) - 1558.85) < 0.01, "Only the component along the motion works."
assert work([0, 10, 0], [5, 0, 0]) == 0.0 and work([-20, 0], [3, 0]) == -60.0 and type(work([1, 2], [3, 4])) is float, "Perpendicular gives 0; opposing gives negative work; return a float."
try:
    work([1, 2], [1, 2, 3])
    assert False, "Mismatched dimensions should raise ValueError."
except ValueError:
    pass
assert abs(lift_work(60, 1.5) - 882.9) < 1e-9, "m g h."
assert motor_power(500, 8, 20, 0.72) == 2725.0 and motor_power(100, 10, 9.81, 1.0) == 1000.0, f"Got {motor_power(500, 8, 20, 0.72)}."
for _bad in [(500, 8, 20, 0), (500, 8, 20, 1.2), (500, 8, 0, 0.8)]:
    try:
        motor_power(*_bad)
        assert False, f"motor_power{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Work is force dotted with displacement; power is work per second, scaled up by the losses."
```

Hint: The dot product is `sum(f * d for f, d in zip(force, displacement))`. Input power is the useful work divided by the time, divided by the efficiency.
:::

::: challenge Characterising a spring [medium]
A test rig records displacements (metres) and forces (newtons) for a spring. Write `work_from_data(xs, forces)`, the trapezoid-rule work between the first and last displacement, as a float. Write `fit_stiffness(xs, forces)`: the least-squares stiffness k for a line **through the origin**, F = kx, which minimises Σ(Fᵢ − k xᵢ)² and works out to k = Σxᵢ Fᵢ / Σxᵢ², rounded to 1 decimal place; raise `ValueError` if all x are 0. Then write `nonlinearity_energy(xs, forces)`: the percentage by which the measured work exceeds (positive) or falls short of (negative) the work of the fitted linear spring, ½ k x_last² (using the unrounded k) over the same range, assuming the data start at x = 0; round to 2 decimal places. (For the stiffening die spring this comes out negative: a least-squares line through the origin is pulled up by the large, stiff end of the data, so it overestimates the energy over the whole range. Compare the lesson, which used the initial stiffness instead.)

```python starter
def work_from_data(xs, forces):
    return 0.0

def fit_stiffness(xs, forces):
    return 0.0

def nonlinearity_energy(xs, forces):
    return 0.0

xs = np.array([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) / 1000
fs = np.array([0, 212, 430, 655, 890, 1138, 1402, 1686, 1993, 2330, 2702], dtype=float)
print(work_from_data(xs, fs), fit_stiffness(xs, fs))
```

```python solution
def work_from_data(xs, forces):
    xs, forces = np.asarray(xs, dtype=float), np.asarray(forces, dtype=float)
    return float((np.diff(xs) * (forces[:-1] + forces[1:]) / 2).sum())

def _k(xs, forces):
    xs, forces = np.asarray(xs, dtype=float), np.asarray(forces, dtype=float)
    sxx = (xs ** 2).sum()
    if sxx == 0:
        raise ValueError("the displacements are all zero")
    return float((xs * forces).sum() / sxx)

def fit_stiffness(xs, forces):
    return round(_k(xs, forces), 1)

def nonlinearity_energy(xs, forces):
    k = _k(xs, forces)
    linear = 0.5 * k * float(np.asarray(xs, dtype=float)[-1]) ** 2
    return round((work_from_data(xs, forces) / linear - 1) * 100, 2)

xs = np.array([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) / 1000
fs = np.array([0, 212, 430, 655, 890, 1138, 1402, 1686, 1993, 2330, 2702], dtype=float)
print(work_from_data(xs, fs), fit_stiffness(xs, fs))
```

```python test
for _n in ["work_from_data", "fit_stiffness", "nonlinearity_energy"]:
    assert _n in dir(), f"Define {_n}."
_xs = np.array([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) / 1000
_fs = np.array([0, 212, 430, 655, 890, 1138, 1402, 1686, 1993, 2330, 2702], dtype=float)
assert abs(work_from_data(_xs, _fs) - 24.174) < 1e-9, f"Got {work_from_data(_xs, _fs)}."
assert type(work_from_data(_xs, _fs)) is float, "Return a plain Python float (wrap the NumPy result with float(...))."
assert abs(work_from_data([0, 0.1, 0.2], [0, 50, 100]) - 10.0) < 1e-12, "A linear spring: ½ k x² = ½ × 500 × 0.04."
assert fit_stiffness([0, 0.1, 0.2], [0, 50, 100]) == 500.0, "Exact linear data."
assert fit_stiffness(_xs, _fs) == 125240.3, f"Got {fit_stiffness(_xs, _fs)}."
assert fit_stiffness([1, 2, 3], [2, 5, 5]) == round((2 + 10 + 15) / 14, 1), "Least squares through the origin."
try:
    fit_stiffness([0, 0], [1, 2])
    assert False, "All-zero displacements should raise ValueError."
except ValueError:
    pass
assert nonlinearity_energy([0, 0.1, 0.2], [0, 50, 100]) == 0.0, "A linear spring has no excess."
assert nonlinearity_energy(_xs, _fs) == -3.49, f"Got {nonlinearity_energy(_xs, _fs)}."
"SUCCESS: The area under the measured curve is the energy; a fitted stiffness summarises it, and the difference shows how far from linear the spring is."
```

Hint: The trapezoid work is the sum of `diff(x) × average force`. For the fit, minimise Σ(F − kx)²: setting its derivative with respect to k to zero gives k = Σ x F / Σ x².
:::

::: challenge Stopping on a slope [hard]
A vehicle of mass m moving at speed v₀ brakes with a constant force `F_brake` on a slope of `slope_deg` degrees (positive means downhill, so gravity helps it along). Gravity's component along the slope, m g sin θ, does positive work downhill. Write `stopping_distance(m, v0, F_brake, slope_deg, g=9.81)` from the work–energy theorem, rounded to 2 decimal places; raise `ValueError` if the brakes cannot stop it (F_brake ≤ m g sin θ while moving downhill) or any of m, F_brake is not positive. Then write `speed_profile(m, v0, force, distance, n=1000)`, where `force(x)` gives the net force along the motion at position x (negative slows the vehicle): use the cumulative trapezoid rule on `n` equal steps to compute the work done up to each point and return `(xs, speeds)` as NumPy arrays (length n + 1), with speed √(v₀² + 2W/m). If the kinetic energy would become negative, the vehicle has stopped: set the speed to 0 from the first such point onwards. Finally `stop_position(m, v0, force, distance, n=1000)`: the first x at which the speed is 0, linearly interpolated using v² (which varies smoothly) between the last positive point and the first zero point, rounded to 3 decimal places, or `None` if it never stops within the distance.

```python starter
def stopping_distance(m, v0, F_brake, slope_deg, g=9.81):
    return 0.5 * m * v0 ** 2 / F_brake

def speed_profile(m, v0, force, distance, n=1000):
    xs = np.linspace(0, distance, n + 1)
    return xs, np.full(n + 1, float(v0))

def stop_position(m, v0, force, distance, n=1000):
    return None

print(stopping_distance(1500, 100 / 3.6, 9000, 0))
```

```python solution
def stopping_distance(m, v0, F_brake, slope_deg, g=9.81):
    if m <= 0 or F_brake <= 0:
        raise ValueError("mass and braking force must be positive")
    net = F_brake - m * g * math.sin(math.radians(slope_deg))
    if net <= 0:
        raise ValueError("the brakes cannot stop the vehicle on this slope")
    return round(0.5 * m * v0 ** 2 / net, 2)

def _profile(m, v0, force, distance, n):
    xs = np.linspace(0, distance, n + 1)
    fs = np.array([force(x) for x in xs], dtype=float)
    work = np.concatenate(([0.0], np.cumsum(np.diff(xs) * (fs[:-1] + fs[1:]) / 2)))
    return xs, v0 ** 2 + 2 * work / m

def speed_profile(m, v0, force, distance, n=1000):
    xs, v2 = _profile(m, v0, force, distance, n)
    stopped = np.flatnonzero(v2 <= 0)
    if stopped.size:
        v2[stopped[0]:] = 0.0
    return xs, np.sqrt(v2)

def stop_position(m, v0, force, distance, n=1000):
    xs, v2 = _profile(m, v0, force, distance, n)
    zero = np.flatnonzero(v2 <= 0)
    if zero.size == 0:
        return None
    i = int(zero[0])
    if i == 0:
        return 0.0
    a, b = v2[i - 1], v2[i]
    return round(float(xs[i - 1] + (xs[i] - xs[i - 1]) * a / (a - b)), 3)

print(stopping_distance(1500, 100 / 3.6, 9000, 0))
```

```python test
for _n in ["stopping_distance", "speed_profile", "stop_position"]:
    assert _n in dir(), f"Define {_n}."
assert stopping_distance(1500, 100 / 3.6, 9000, 0) == 64.3, "The lesson's car on the flat."
assert stopping_distance(1500, 100 / 3.6, 9000, 5) == 74.99 and stopping_distance(1500, 100 / 3.6, 9000, -5) == 56.28, "Downhill takes longer, uphill less."
for _bad in [(1500, 20, 1000, 10), (0, 20, 9000, 0), (1500, 20, 0, 0)]:
    try:
        stopping_distance(*_bad)
        assert False, f"stopping_distance{_bad} should raise ValueError."
    except ValueError:
        pass
_xs, _vs = speed_profile(1500, 20, lambda x: -6000.0, 100)
assert len(_xs) == 1001 and len(_vs) == 1001 and _vs[0] == 20, "Arrays of n + 1 points starting at v0."
assert abs(_vs[np.argmin(np.abs(_xs - 20))] - math.sqrt(400 - 2 * 6000 * 20 / 1500)) < 1e-9, "Speed from the work done so far."
assert _vs[-1] == 0.0 and np.all(_vs[_xs >= 50.01] == 0), "Once stopped, the speed stays 0."
assert abs(stop_position(1500, 20, lambda x: -6000.0, 100) - 50.0) < 1e-6, "Constant braking: stops at ½ m v² / F = 50 m."
assert stop_position(1500, 20, lambda x: -100.0, 100) is None, "Gentle braking does not stop it within 100 m."
_soft = lambda x: -200.0 * x
_stop = stop_position(1500, 20, _soft, 100)
assert abs(_stop - math.sqrt(1500 * 400 / 200)) < 0.01, f"Braking that grows with distance: ½ m v² = 100 x², so x = √(m v² / 200) ≈ 54.77; got {_stop}."
"SUCCESS: Work done along the path tracks the kinetic energy point by point, so the speed and the stopping point follow without any time stepping."
```

Hint: For the slope, the net decelerating force is F_brake − m g sin θ. For the profile, evaluate the force at every point, accumulate the trapezoid work, and convert with v² = v₀² + 2W/m. The kinetic energy (and so v²) varies smoothly through the stop, so interpolate v² between the last positive value and the first non-positive one to find where it crosses zero.
:::

## What you learned

- Work is force times distance along the motion, W = F · d = F d cos θ; perpendicular forces do none, opposing forces do negative work. Lifting takes m g h.
- A varying force does work W = ∫F dx, the area under the force–displacement curve; a spring stores ½kx², and measured curves integrate with the trapezoid rule.
- Kinetic energy is ½mv², and net work equals its change; braking distance is ½mv²/F, growing with v².
- With gravity and springs only, kinetic plus potential energy is conserved: v = √(2gh) at the bottom of any frictionless drop.
- Power is the rate of work, P = Fv; input power is output power divided by efficiency.

The next lesson studies exponential growth and decay, the pattern behind cooling, discharge and compound interest.
