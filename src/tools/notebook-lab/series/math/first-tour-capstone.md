# Capstone: simulate a machine

A 40 kg pump motor sits on four rubber mounts. The maintenance team has three complaints: the motor runs hot on an overload cycle, the floor hums, and the belt drive goes out of alignment as the day wears on. These are not three separate problems. Losses heat the motor; heat softens the rubber; softer rubber lets the motor sag and changes how much vibration reaches the floor. This lesson works through the whole machine with tools from every thread of the first tour: fitting a model to measurements, a differential equation and its time constant, a spectrum, the spring–mass equations, and a probability estimate by simulation. It ends with a design decision backed by numbers.

This lesson covers:

- fitting a warm-up curve to find a thermal time constant;
- simulating temperature over an overload duty cycle;
- reading a vibration spectrum to find the imbalance force;
- coupling heat and vibration: mounts that soften as they warm;
- choosing a mount stiffness, and checking it against manufacturing scatter.

## Fitting the warm-up curve

::: math
\[ T(t) \approx a + b\,\big(1 - e^{-t/\tau}\big), \qquad \min_{\tau}\;\min_{a, b}\;\sum_i \Big(T_i - a - b\,\big(1 - e^{-t_i/\tau}\big)\Big)^2 \]
- $a$: the starting (ambient) temperature; $b$: the rise; $a + b$: the final temperature; $\tau$: the time constant
- for a fixed $\tau$ the model is linear in $a$ and $b$, so least squares solves it exactly; only $\tau$ needs a search
In code: for each `tau`, `np.linalg.lstsq` on the columns `1` and `1 - exp(-t / tau)`; keep the smallest error
:::

A temperature logger on the motor frame recorded a warm-up at rated load: a reading every 2 minutes for 2 hours. A body heated steadily while losing heat in proportion to its excess temperature approaches its final temperature exponentially (the exponential lesson). The model has three unknowns, but it is non-linear only in τ. For any fixed τ, the columns 1 and 1 − e^(−t/τ) form a design matrix and the fitting-a-line lesson's least squares finds a and b. So scan τ on a fine grid, fit the other two for each, and keep the τ with the smallest error. This is called **separable least squares**: search over the non-linear parameter, solve exactly for the linear ones.

Predict before running: from 61 noisy readings, how well can the time constant and the final temperature be recovered?

```python
import math
import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp

rng = np.random.default_rng(54)
t_min = np.arange(0, 121, 2.0)
T_log = 22 + 58 * (1 - np.exp(-t_min / 25)) + rng.normal(0, 0.5, t_min.size)

best = None
for tau_try in np.arange(5, 60.001, 0.05):
    X = np.column_stack([np.ones_like(t_min), 1 - np.exp(-t_min / tau_try)])
    coef, *_ = np.linalg.lstsq(X, T_log, rcond=None)
    sse = ((T_log - X @ coef) ** 2).sum()
    if best is None or sse < best[0]:
        best = (sse, tau_try, coef)
sse, tau, (T_amb, rise) = best
print(f"time constant {tau:.2f} min, ambient {T_amb:.2f} °C, rise {rise:.2f} K, final {T_amb + rise:.2f} °C")
print(f"rms residual {math.sqrt(sse / t_min.size):.2f} °C")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(t_min, T_log, ".", label="logged")
ax.plot(t_min, T_amb + rise * (1 - np.exp(-t_min / tau)), label="fitted")
ax.set_xlabel("minutes")
ax.set_ylabel("°C")
ax.legend(fontsize=8)
plt.show()
```

The fit gives τ ≈ 24.95 min and a final temperature of 79.94 °C, against the 25 min and 80 °C used to make the data. The rms residual, 0.49 °C, matches the 0.5 °C logger noise: the model explains everything except the noise. Two hours of logging pinned down a number that would otherwise need the motor's mass, materials and airflow.

## The overload duty cycle

::: math
\[ C\,\frac{dT}{dt} = P(t) - \frac{T - T_\text{amb}}{R}, \qquad R = \frac{\Delta T_\text{rated}}{P_\text{rated}}, \qquad C = \frac{\tau}{R} \]
- $P(t)$: heat generated (losses, W); $R$: thermal resistance to the room (K/W); $C$: heat capacity (J/K); $\tau = RC$
- losses scale with the square of the load current: 150% load gives $1.5^2 = 2.25$ times the losses
In code: `heat_rhs(t, T)` with the duty-cycle `losses(t)`, solved by `solve_ivp`
:::

The fitted curve is the solution of a first-order law, the cooling law with a heat source. Equating the two forms gives the motor's thermal resistance R and heat capacity C from the rated losses (1.2 kW here) and the fitted rise and τ. With the model in hand, any load pattern can be tried without risking the motor.

The plant wants to run an overload cycle: every hour, 20 minutes at 150% load, then 40 minutes at rated load. The frame must stay below 120 °C. The average loss is 1.2 kW × (2.25 × ⅓ + ⅔) = 1.7 kW. That is below the 2.7 kW of a continuous overload, but averages can hide peaks.

Predict before running: does the frame stay below 120 °C once the cycle has settled into its repeating pattern?

```python
P_rated = 1200.0
R = rise / P_rated
C = tau * 60 / R

def losses(t_s):
    return P_rated * (2.25 if (t_s / 60) % 60 < 20 else 1.0)

def heat_rhs(t, T):
    return [(losses(t) - (T[0] - T_amb) / R) / C]

sol = solve_ivp(heat_rhs, (0, 8 * 3600), [T_amb], max_step=20, dense_output=True)
ts = np.linspace(0, 8 * 3600, 2881)
T_motor = sol.sol(ts)[0]
last = ts >= 7 * 3600
print(f"R = {R:.4f} K/W, C = {C / 1000:.1f} kJ/K")
print(f"in the 8th hour: between {T_motor[last].min():.1f} and {T_motor[last].max():.1f} °C")
print(f"equilibrium for the average loss {T_amb + R * 1700:.1f} °C; for continuous overload {T_amb + R * 2.25 * P_rated:.1f} °C")
print(f"time above 120 °C in the 8th hour: {(T_motor[last] > 120).mean() * 60:.1f} min")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(ts / 3600, T_motor)
ax.axhline(120, color="red", linestyle="--")
ax.set_xlabel("hours")
ax.set_ylabel("frame °C")
plt.show()
```

After about two hours the temperature settles into a sawtooth between about 88.6 °C and 123.8 °C. It peaks at the end of each overload period, and spends about 5 minutes of every hour above the 120 °C limit, even though the average-loss equilibrium is only 104 °C. With a 25-minute time constant, a 20-minute overload is long enough to climb well above the average. The fix is either shorter overload bursts (the motor's heat capacity then smooths them) or more cooling. The sawtooth itself is what the next section has to cope with.

## Reading the vibration spectrum

::: math
\[ |X_1| = \frac{|A_1|}{\omega^2}, \qquad F_0 = |X_1|\,k\,\sqrt{(1 - r^2)^2 + (2\zeta r)^2}, \qquad U = \frac{F_0}{\omega^2} \]
- $A_1$: acceleration amplitude at running speed (1×); $\omega = 2\pi f_\text{run}$; $X_1$: displacement amplitude
- $r = \omega/\omega_n$, $\omega_n = \sqrt{k/m}$: the spring–mass amplification read backwards gives the shaking force $F_0$
- $U$: the rotor's unbalance (mass × offset), since an offset mass produces $F_0 = U\omega^2$
In code: a Hann-windowed `np.fft.rfft` of the accelerometer, the 1× peak `a1`, then `F0` and `U`
:::

An accelerometer on the motor feet records 4 seconds at 2 kHz. The spectrum separates its causes, as in the seeing-frequencies lesson. 1× running speed (1480 rpm, 24.67 Hz) means imbalance, 2× means misalignment, and 100 Hz is the electrical hum at twice the supply frequency. The 1× acceleration converts to displacement by dividing by ω², because a sinusoid's acceleration is −ω² times its displacement. The spring–mass lesson's amplification formula, read backwards, then gives the force the rotor produces. The mounts are 100 kN/m in total, with damping ratio 0.08.

Predict before running: which peaks stand out above the noise, and is the rotor's unbalance acceptable? (A common balance grade allows about 600 g·mm for this rotor.)

```python
m, k20, zeta = 40.0, 1.0e5, 0.08
f_run = 1480 / 60
omega = 2 * math.pi * f_run
fs, duration = 2000, 4.0
tv = np.arange(0, duration, 1 / fs)
acc = (0.9 * np.sin(omega * tv) + 0.25 * np.sin(2 * omega * tv + 1) + 0.15 * np.sin(2 * math.pi * 100 * tv)
       + rng.normal(0, 0.6, tv.size))
w = np.hanning(tv.size)
amp = 2 * np.abs(np.fft.rfft(acc * w)) / tv.size / w.mean()
freqs = np.fft.rfftfreq(tv.size, 1 / fs)
order = np.argsort(amp)[::-1]
found = []
for j in order:
    if all(abs(freqs[j] - f) > 3 for f in found):
        found.append(freqs[j])
        print(f"peak at {freqs[j]:6.2f} Hz ({freqs[j] / f_run:4.2f}× running speed), {amp[j]:.3f} m/s²")
    if len(found) == 4:
        break

j1 = np.argmin(np.abs(freqs - f_run))
a1 = amp[j1 - 2:j1 + 3].max()
X1 = a1 / omega ** 2
wn = math.sqrt(k20 / m)
r_run = omega / wn
F0 = X1 * k20 * math.sqrt((1 - r_run ** 2) ** 2 + (2 * zeta * r_run) ** 2)
print(f"1×: {a1:.3f} m/s², displacement {X1 * 1e6:.1f} µm; natural frequency {wn / (2 * math.pi):.2f} Hz, r = {r_run:.2f}")
print(f"shaking force {F0:.1f} N, unbalance {F0 / omega ** 2 * 1e6:.0f} g·mm")
```

Three peaks stand out: 1× at 24.75 Hz (the nearest 0.25 Hz bin to 24.67 Hz), 2× at 49.25 Hz and the 100 Hz hum. The fourth-largest "peak" is only noise, at 0.05 m/s². The 1× peak reads 0.838 m/s², a little under the true 0.9 because the tone falls between two frequency bins. That is a 35 µm vibration. The motor runs well above its 7.96 Hz natural frequency (r ≈ 3.1), where its own inertia does most of the resisting, so this small motion corresponds to a shaking force of about 30 N: an unbalance near 1,250 g·mm, about twice the allowance. The rotor needs balancing, and the spectrum said so without stopping the machine.

## Heat meets vibration

::: math
\[ k(T) = k_{20}\,\big(1 - \beta\,(T - 20)\big), \qquad \text{sag} = \frac{mg}{k(T)}, \qquad \text{TR} = \sqrt{\frac{1 + (2\zeta r)^2}{(1 - r^2)^2 + (2\zeta r)^2}}, \quad r = \frac{\omega}{\sqrt{k(T)/m}} \]
- $\beta = 0.003$ per K: the rubber loses 0.3% of its stiffness per degree
- the sag sets the belt alignment; the transmissibility TR is the fraction of the shaking force reaching the floor
In code: `k_of(T_motor)` along the whole duty-cycle simulation, then `sag` and `trans(r, zeta)` at every instant
:::

Rubber softens as it warms, and the mounts sit right under the hot frame (assume they follow its temperature). Softer mounts let the motor sit lower, which shifts the belt alignment; the drive tolerates up to 6 mm of sag. Softer mounts also lower the natural frequency, which helps isolation. Feeding the temperature from the duty-cycle simulation into the mount model shows both effects through the day.

Predict before running: on the overload cycle, does the sag stay within 6 mm? And does warming make the floor vibration better or worse?

```python
beta = 0.003

def k_of(T):
    return k20 * (1 - beta * (T - 20))

def trans(r, z):
    return np.sqrt((1 + (2 * z * r) ** 2) / ((1 - r ** 2) ** 2 + (2 * z * r) ** 2))

sag_mm = m * 9.81 / k_of(T_motor) * 1000
tr = trans(omega / np.sqrt(k_of(T_motor) / m), zeta)
print(f"sag: {sag_mm[0]:.2f} mm cold, up to {sag_mm.max():.2f} mm at the hottest")
print(f"transmissibility: {tr[0]:.3f} cold, down to {tr.min():.3f} hot")
print(f"force reaching the floor at 1×: {F0 * tr[0]:.1f} N cold, {F0 * tr.min():.1f} N hot")

fig, (a1x, a2x) = plt.subplots(1, 2, figsize=(10, 3))
a1x.plot(ts / 3600, sag_mm)
a1x.axhline(6, color="red", linestyle="--")
a1x.set_title("sag (mm)")
a2x.plot(ts / 3600, tr)
a2x.set_title("transmissibility")
for a in (a1x, a2x):
    a.set_xlabel("hours")
plt.show()
```

The sag grows from 3.95 mm cold to 5.70 mm at the hottest moment of the cycle: inside the 6 mm limit, but with little margin. The transmissibility improves as the rubber warms, from 0.129 to 0.090: the hot motor passes about 2.7 N of its 30 N shaking force to the floor, the cold one 3.9 N. The two goals pull in opposite directions. Stiffer mounts hold alignment but transmit more vibration; softer ones isolate better but sag more. That conflict calls for an optimisation.

## Choosing the mount, with scatter

::: math
\[ k_\text{min} = \frac{mg}{s_\text{max}\,\big(1 - \beta(T_\text{hot} - 20)\big)}, \qquad k_\text{max}: \;\text{TR}\big(r(k_\text{max})\big) = \text{TR}_\text{max} \text{ at } 20\ °\text{C}, \qquad k_\text{min} \le k_{20} \le k_\text{max} \]
\[ P(\text{fail}) \approx \frac{1}{N}\,\#\big\{\,j : k_{20}(1 + \varepsilon_j) \notin [k_\text{min}, k_\text{max}]\,\big\}, \qquad \varepsilon_j \sim \mathcal{N}(0, \sigma^2) \]
- the hot sag sets a minimum stiffness; the cold transmissibility (limit 0.15) sets a maximum
- real mounts vary: stiffness scatter of $\sigma$ = 8% is typical for rubber
In code: a grid of `ks` tested against both limits, then a Monte Carlo of `k_choice * rng.normal(1, sd, N)`
:::

Each requirement turns into a bound on the cold stiffness k₂₀. Sag at the hottest temperature must stay below 6 mm, which needs enough stiffness. Transmissibility when cold, the stiffest state, must stay below 0.15, which limits the stiffness. Any k₂₀ between the bounds meets both requirements on paper. But catalogue mounts are made to a tolerance, so a design choice should be judged by the fraction of real mounts that would fail: a probability, estimated by simulation as in the probability lessons.

Predict before running: how wide is the allowed window, and how many mounts fail if the nominal stiffness sits in its middle?

```python
T_hot = T_motor.max()
ks = np.linspace(4e4, 4e5, 3601)
ok = (m * 9.81 / (ks * (1 - beta * (T_hot - 20))) <= 0.006) & (trans(omega / np.sqrt(ks / m), zeta) <= 0.15)
k_lo, k_hi = ks[ok].min(), ks[ok].max()
print(f"allowed cold stiffness: {k_lo / 1000:.1f} to {k_hi / 1000:.1f} kN/m (±{100 * (k_hi - k_lo) / (k_hi + k_lo):.1f}% about the middle)")

def fail_rate(k_choice, sd, n=100_000):
    sample = k_choice * rng.normal(1, sd, n)
    bad = (m * 9.81 / (sample * (1 - beta * (T_hot - 20))) > 0.006) | (trans(omega / np.sqrt(sample / m), zeta) > 0.15)
    return bad.mean()

k_mid = (k_lo + k_hi) / 2
for sd in [0.08, 0.05, 0.03]:
    print(f"stiffness scatter {sd:.0%}: failures {fail_rate(k_lo, sd):5.1%} at the low edge, {fail_rate(k_mid, sd):5.1%} in the middle")
```

The window runs from 95.0 to 115.3 kN/m, only about ±9.7% around its middle. With the usual 8% scatter, even a nominal stiffness in the middle fails about 23% of the time (choosing an edge fails about half the time). With 5% scatter the middle fails roughly 5%, and with 3% about 0.1%. So the numbers give the decision: either buy mounts graded to about ±3% (pre-sorted by stiffness, at a price), or widen the window by attacking a cause. Balancing the rotor halves the shaking force, so the transmissibility limit could relax. Shortening the overload bursts lowers the peak temperature and the hot sag. Each option can be tested by changing one line above, which is the real payoff of building the model.

::: challenge Fitting a warm-up curve [easy]
Write `fit_warmup(t, T, taus)`: for each candidate time constant in `taus`, fit T ≈ a + b(1 − e^(−t/τ)) by linear least squares (design matrix with columns 1 and 1 − e^(−t/τ)), and return `(tau, a, b)` for the candidate with the smallest sum of squared residuals, as three plain floats. Raise `ValueError` if t and T have different lengths, there are fewer than 3 points, or `taus` is empty or contains a non-positive value.

```python starter
import numpy as np

def fit_warmup(t, T, taus):
    return (1.0, 0.0, 0.0)

t = np.arange(0, 121, 2.0)
print(fit_warmup(t, 22 + 58 * (1 - np.exp(-t / 25)), np.arange(5, 60.01, 0.5)))
```

```python solution
import numpy as np

def fit_warmup(t, T, taus):
    t = np.asarray(t, dtype=float)
    T = np.asarray(T, dtype=float)
    taus = list(taus)
    if t.size != T.size or t.size < 3:
        raise ValueError("need matching t and T with at least 3 points")
    if not taus or min(taus) <= 0:
        raise ValueError("taus must be non-empty and positive")
    best = None
    for tau in taus:
        X = np.column_stack([np.ones_like(t), 1 - np.exp(-t / tau)])
        coef, *_ = np.linalg.lstsq(X, T, rcond=None)
        sse = float(((T - X @ coef) ** 2).sum())
        if best is None or sse < best[0]:
            best = (sse, float(tau), float(coef[0]), float(coef[1]))
    return best[1], best[2], best[3]

t = np.arange(0, 121, 2.0)
print(fit_warmup(t, 22 + 58 * (1 - np.exp(-t / 25)), np.arange(5, 60.01, 0.5)))
```

```python test
import numpy as np
for _n in ["fit_warmup"]:
    assert _n in dir(), f"Define {_n}."
_t = np.arange(0, 121, 2.0)
_r = fit_warmup(_t, 22 + 58 * (1 - np.exp(-_t / 25)), np.arange(5, 60.01, 0.5))
assert len(_r) == 3 and all(type(_v) is float for _v in _r), "Return three plain floats."
assert abs(_r[0] - 25.0) < 1e-9 and abs(_r[1] - 22.0) < 1e-6 and abs(_r[2] - 58.0) < 1e-6, f"Exact data on the grid: (25, 22, 58); got {_r}."
_g = np.random.default_rng(7)
_noisy = 15 + 40 * (1 - np.exp(-_t / 12)) + _g.normal(0, 0.3, _t.size)
_f = fit_warmup(_t, _noisy, np.arange(2, 40.001, 0.1))
assert abs(_f[0] - 12) < 0.5 and abs(_f[1] - 15) < 0.5 and abs(_f[2] - 40) < 0.5, f"Noisy data: close to (12, 15, 40); got {_f}."
_f2 = fit_warmup(list(_t), list(_noisy), [10.0, 12.0, 30.0])
assert _f2[0] == 12.0, "Picks the candidate with the smallest squared error from a short list."
for _bad in [(_t, _noisy[:-1], [10.0]), (_t[:2], _noisy[:2], [10.0]), (_t, _noisy, []), (_t, _noisy, [10.0, 0.0])]:
    try:
        fit_warmup(*_bad)
        assert False, "Bad input should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Search the one non-linear parameter, solve the linear ones exactly: separable least squares recovers the motor's time constant."
```

Hint: Inside a loop over τ, build `np.column_stack([np.ones_like(t), 1 - np.exp(-t / tau)])`, solve with `np.linalg.lstsq(X, T, rcond=None)`, compute the squared error, and remember the best (error, τ, a, b).
:::

::: challenge The thermal model [medium]
Write `simulate_temperature(R, C, T_amb, power, t_end, dt)`: integrate C dT/dt = P(t) − (T − T_amb)/R from T(0) = T_amb with Euler steps of length dt, where `power` is a function of time (seconds) returning watts. Return `(times, temps)` as NumPy arrays including t = 0, with the number of steps `round(t_end / dt)`. Raise `ValueError` if R, C, dt or t_end is not positive, or if dt ≥ RC (Euler would be inaccurate or unstable). Then write `time_above(times, temps, limit, start=0.0)`: the total time (s) at or after `start` during which the temperature is above `limit`, counting each step whose **starting** temperature is above the limit as dt of time above, as a plain float.

```python starter
import numpy as np

def simulate_temperature(R, C, T_amb, power, t_end, dt):
    return np.array([0.0]), np.array([T_amb])

def time_above(times, temps, limit, start=0.0):
    return 0.0

ts, Ts = simulate_temperature(0.048, 31000.0, 22.0, lambda t: 1200.0, 7200, 10)
print(Ts[-1])
```

```python solution
import numpy as np

def simulate_temperature(R, C, T_amb, power, t_end, dt):
    if R <= 0 or C <= 0 or dt <= 0 or t_end <= 0:
        raise ValueError("R, C, dt and t_end must be positive")
    if dt >= R * C:
        raise ValueError("dt must be smaller than the time constant RC")
    n = round(t_end / dt)
    times = np.arange(n + 1) * dt
    temps = np.empty(n + 1)
    temps[0] = T_amb
    for i in range(n):
        T = temps[i]
        temps[i + 1] = T + dt * (power(times[i]) - (T - T_amb) / R) / C
    return times, temps

def time_above(times, temps, limit, start=0.0):
    times = np.asarray(times, dtype=float)
    temps = np.asarray(temps, dtype=float)
    dts = np.diff(times)
    mask = (temps[:-1] > limit) & (times[:-1] >= start)
    return float(dts[mask].sum())

ts, Ts = simulate_temperature(0.048, 31000.0, 22.0, lambda t: 1200.0, 7200, 10)
print(Ts[-1])
```

```python test
import math
import numpy as np
for _n in ["simulate_temperature", "time_above"]:
    assert _n in dir(), f"Define {_n}."
_R, _C = 0.048, 31000.0
_ts, _Ts = simulate_temperature(_R, _C, 22.0, lambda t: 1200.0, 7200, 5)
_ts, _Ts = np.asarray(_ts), np.asarray(_Ts)
assert _ts.shape == _Ts.shape == (1441,) and _ts[0] == 0 and abs(_ts[-1] - 7200) < 1e-9 and _Ts[0] == 22.0, "1440 steps of 5 s, starting at T_amb."
_exact = 22 + 1200 * _R * (1 - np.exp(-_ts / (_R * _C)))
assert np.abs(_Ts - _exact).max() < 0.2, f"Constant power: within 0.2 K of the exact exponential; off by {np.abs(_Ts - _exact).max():.3f}."
_ts2, _Ts2 = simulate_temperature(_R, _C, 22.0, lambda t: 1200.0, 7200, 60)
assert np.abs(np.asarray(_Ts2) - (22 + 1200 * _R * (1 - np.exp(-np.asarray(_ts2) / (_R * _C))))).max() > np.abs(_Ts - _exact).max(), "Bigger steps, bigger Euler error."
_ts3, _Ts3 = simulate_temperature(_R, _C, 22.0, lambda t: 2700.0 if (t / 60) % 60 < 20 else 1200.0, 8 * 3600, 10)
_late = np.asarray(_Ts3)[np.asarray(_ts3) >= 7 * 3600]
assert 120 < _late.max() < 128 and 85 < _late.min() < 92, f"The overload cycle settles into a sawtooth near 89-124 °C; got {_late.min():.1f}-{_late.max():.1f}."
for _bad in [dict(R=0), dict(dt=0), dict(dt=2000), dict(t_end=-5)]:
    _args = dict(R=_R, C=_C, T_amb=22.0, power=lambda t: 1000.0, t_end=600, dt=10)
    _args.update(_bad)
    try:
        simulate_temperature(**_args)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_tt = [0.0, 10.0, 20.0, 30.0, 40.0]
_TT = [100.0, 130.0, 125.0, 110.0, 140.0]
_a = time_above(_tt, _TT, 120.0)
assert type(_a) is float and _a == 20.0, f"Steps starting at 130 and 125 are above 120: 20 s; got {_a}."
assert time_above(_tt, _TT, 120.0, start=15.0) == 10.0, "Only steps starting at or after `start`."
assert time_above(_tt, _TT, 200.0) == 0.0, "Never above."
"SUCCESS: A first-order thermal model, stepped through the duty cycle, shows the peaks that the average hides."
```

Hint: Store the times as `np.arange(n + 1) * dt`. Each Euler step adds dt × (P − (T − T_amb)/R)/C. For `time_above`, take `np.diff(times)` and add up the intervals whose starting temperature is above the limit and whose start time is at least `start`.
:::

::: challenge Choosing a mount [hard]
Write `mount_window(m, f_run, zeta, T_hot, beta, sag_max, tr_max)`: the range of cold (20 °C) stiffness k₂₀ in N/m that keeps the sag mg/k(T_hot) at most `sag_max` (metres, g = 9.81) with k(T) = k₂₀(1 − β(T − 20)), and keeps the cold transmissibility TR(r) = √((1 + (2ζr)²)/((1 − r²)² + (2ζr)²)), r = 2πf_run/√(k₂₀/m), at most `tr_max`. Return `(k_min, k_max)` as plain floats. For k_max, find the frequency ratio r* > √2 where TR(r*) = tr_max by bisection (TR decreases for r > √2) to a relative accuracy of 1e-12, then k_max = m(2πf_run/r*)². Raise `ValueError` if `tr_max` is not between 0 and 1, if β(T_hot − 20) ≥ 1, or if the window is empty (k_min > k_max).

Then write `failure_probability(k_nominal, rel_sd, k_min, k_max, n=200_000, seed=0)`: draw n stiffnesses k_nominal × (1 + ε) with ε normal with standard deviation `rel_sd` (use `np.random.default_rng(seed)`), and return the fraction outside [k_min, k_max] as a plain float.

```python starter
import math
import numpy as np

def mount_window(m, f_run, zeta, T_hot, beta, sag_max, tr_max):
    return (0.0, 0.0)

def failure_probability(k_nominal, rel_sd, k_min, k_max, n=200_000, seed=0):
    return 0.0

print(mount_window(40.0, 1480 / 60, 0.08, 123.8, 0.003, 0.006, 0.15))
```

```python solution
import math
import numpy as np

def _tr(r, z):
    return math.sqrt((1 + (2 * z * r) ** 2) / ((1 - r * r) ** 2 + (2 * z * r) ** 2))

def mount_window(m, f_run, zeta, T_hot, beta, sag_max, tr_max):
    if not 0 < tr_max < 1:
        raise ValueError("tr_max must be between 0 and 1")
    soft = 1 - beta * (T_hot - 20)
    if soft <= 0:
        raise ValueError("the mount would lose all stiffness")
    k_min = m * 9.81 / (sag_max * soft)
    lo, hi = math.sqrt(2), 2.0
    while _tr(hi, zeta) > tr_max:
        hi *= 2
    while hi - lo > 1e-12 * hi:
        mid = (lo + hi) / 2
        if _tr(mid, zeta) > tr_max:
            lo = mid
        else:
            hi = mid
    r_star = (lo + hi) / 2
    k_max = m * (2 * math.pi * f_run / r_star) ** 2
    if k_min > k_max:
        raise ValueError("no stiffness meets both limits")
    return float(k_min), float(k_max)

def failure_probability(k_nominal, rel_sd, k_min, k_max, n=200_000, seed=0):
    rng = np.random.default_rng(seed)
    k = k_nominal * (1 + rng.normal(0, rel_sd, n))
    return float(((k < k_min) | (k > k_max)).mean())

print(mount_window(40.0, 1480 / 60, 0.08, 123.8, 0.003, 0.006, 0.15))
```

```python test
import math
import numpy as np
for _n in ["mount_window", "failure_probability"]:
    assert _n in dir(), f"Define {_n}."
_w = mount_window(40.0, 1480 / 60, 0.08, 123.8, 0.003, 0.006, 0.15)
assert len(_w) == 2 and all(type(_v) is float for _v in _w), "Return two plain floats."
assert abs(_w[0] - 40 * 9.81 / (0.006 * (1 - 0.003 * 103.8))) < 1e-6, f"k_min comes from the hot sag; got {_w[0]:.1f}."
_om = 2 * math.pi * 1480 / 60
_rk = _om / math.sqrt(_w[1] / 40)
_trk = math.sqrt((1 + (0.16 * _rk) ** 2) / ((1 - _rk ** 2) ** 2 + (0.16 * _rk) ** 2))
assert abs(_trk - 0.15) < 1e-9 and _rk > math.sqrt(2), f"At k_max the cold transmissibility is exactly 0.15; got {_trk}."
assert 115000 < _w[1] < 115600, f"k_max is about 115.3 kN/m; got {_w[1]:.0f}."
_w2 = mount_window(40.0, 1480 / 60, 0.08, 20.0, 0.003, 0.006, 0.3)
assert _w2[1] > _w[1] and _w2[0] < _w[0], "A looser vibration limit and a cool motor widen the window on both sides."
for _bad in [dict(tr_max=1.2), dict(tr_max=0.0), dict(beta=0.02), dict(sag_max=0.002)]:
    _args = dict(m=40.0, f_run=1480 / 60, zeta=0.08, T_hot=123.8, beta=0.003, sag_max=0.006, tr_max=0.15)
    _args.update(_bad)
    try:
        mount_window(**_args)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_mid = sum(_w) / 2
_p8 = failure_probability(_mid, 0.08, *_w)
assert type(_p8) is float and 0.20 < _p8 < 0.26, f"8% scatter in the middle fails about 23% of the time; got {_p8}."
assert failure_probability(_mid, 0.08, *_w, seed=0) == _p8, "The same seed gives the same answer."
assert failure_probability(_mid, 0.03, *_w) < 0.01 and abs(failure_probability(_w[0], 0.08, *_w) - 0.5) < 0.02, "3% scatter rarely fails; the edge fails about half the time."
assert failure_probability(_mid, 0.0, *_w, n=10) == 0.0, "No scatter, no failures in the window."
"SUCCESS: Requirements become stiffness bounds, and a Monte Carlo over manufacturing scatter turns a paper design into a failure rate."
```

Hint: k_min is mg divided by sag_max times the hot softening factor. For k_max, bracket r between √2 and a value where TR is already below tr_max (double it until it is), then bisect: keep the half where TR crosses tr_max. Convert r* back with k = m(ω/r*)².
:::

## What you learned

- Separable least squares fits a model that is non-linear in one parameter: search that parameter, and solve for the linear ones exactly at each step.
- A fitted time constant and rated losses give a thermal model C dT/dt = P − (T − T_amb)/R, and a simulation of a duty cycle shows peaks that the average hides.
- A vibration spectrum separates causes by frequency; the 1× peak, divided by ω² and passed backwards through the spring–mass amplification, gives the rotor's unbalance.
- Physical effects couple: heating softens rubber mounts, increasing sag but improving isolation, so the stiffness must lie in a window.
- Requirements become bounds on a design variable, and a Monte Carlo simulation of manufacturing scatter turns the window into a failure probability, the number a design decision needs.

That completes the first tour: quantities, functions, vectors, matrices, rates and accumulation, probability, optimisation, differential equations, signals and PDEs have each appeared once, at work on real problems. The deepening blocks now return to each thread in turn, starting with exact arithmetic, and add the definitions, derivations and methods that the first tour only previewed.
