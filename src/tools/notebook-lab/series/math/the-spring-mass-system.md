# The spring–mass system

Bolt a pump to a factory floor and its vibration travels through the floor to every machine nearby. Put it on rubber mounts instead and, done right, the floor stays quiet; done wrong, the mounts make the shaking worse. Whether a mount helps or hurts depends entirely on one differential equation, the **damped spring–mass system**, the most important model in vibration engineering. It describes car suspensions, building sway, loudspeaker cones and the needle of an analogue meter. This lesson solves it numerically and reads off its behaviour: the natural frequency, the damping ratio that decides whether it rings or settles, how to measure damping from a recording, the resonance peak under a periodic force, and the design rule that makes vibration mounts work.

This lesson covers:

- the equation m x″ + c x′ + k x = F(t), as a first-order system for `solve_ivp`;
- natural frequency and damping ratio;
- underdamped, critically damped and overdamped motion;
- measuring damping from a decaying recording (the logarithmic decrement);
- forced vibration, frequency response and resonance;
- vibration isolation: transmissibility and choosing a mount.

## The equation and its two numbers

::: math
\[ m x'' + c x' + k x = F(t), \qquad \omega_n = \sqrt{\frac{k}{m}}, \qquad \zeta = \frac{c}{2\sqrt{km}} \]
- as a first-order system: $x' = v$ and $v' = \dfrac{F - cv - kx}{m}$
- $\omega_n$: natural frequency (rad/s); $\zeta$: damping ratio
In code: `rhs(t, s, m, c, k)` returns `[v, (F(t) - c * v - k * x) / m]`; `zeta = c / (2 * math.sqrt(k * m))`
:::


A mass m on a spring of stiffness k, with a damper (rubber's internal friction, a shock absorber) exerting a force proportional to velocity with coefficient c, and an external force F(t), obeys Newton's second law:

\[ m x'' + c x' + k x = F(t) \]

This is a **second-order** ODE. Solvers handle first-order systems, so introduce the velocity v = x′ as a second unknown: the state (x, v) obeys x′ = v and v′ = (F − cv − kx)/m. Dividing the equation by m shows that its behaviour depends on just two numbers:

\[ \omega_n = \sqrt{k/m}, \qquad \zeta = \frac{c}{2\sqrt{km}} \]

the **natural frequency** (the frequency of undamped oscillation, the Newton's-law lesson's spring) and the **damping ratio** ζ (zeta). Predict before running: a 120 kg pump on mounts of total stiffness 4.7 × 10⁵ N/m and damping 1,500 N·s/m, nudged 2 mm and released. Does it oscillate?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp

m, k, c = 120.0, 4.7e5, 1500.0
wn = math.sqrt(k / m)
zeta = c / (2 * math.sqrt(k * m))
print(f"natural frequency {wn:.1f} rad/s = {wn / (2 * math.pi):.2f} Hz, damping ratio {zeta:.3f}")

def rhs(t, s, m, c, k, F=lambda t: 0.0):
    x, v = s
    return [v, (F(t) - c * v - k * x) / m]

t_eval = np.linspace(0, 0.5, 2001)
sol = solve_ivp(rhs, (0, 0.5), [0.002, 0.0], args=(m, c, k), t_eval=t_eval, rtol=1e-9, atol=1e-12)
fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(sol.t, sol.y[0] * 1000)
ax.plot(sol.t, 2 * np.exp(-zeta * wn * sol.t), "--", color="grey", label="envelope 2e^(-ζωn t)")
ax.set_xlabel("time (s)")
ax.set_ylabel("displacement (mm)")
ax.legend()
plt.show()
print(f"after 0.1 s the swing is down to {np.abs(sol.y[0][(sol.t > 0.08) & (sol.t < 0.12)]).max() * 1000:.2f} mm")
```

```output
natural frequency 62.6 rad/s = 9.96 Hz, damping ratio 0.100
after 0.1 s the swing is down to 1.06 mm
```

`args=(m, c, k)` passes the extra parameters through to `rhs`. The dashed envelope e^(−ζωₙt) bounds the decaying oscillation.

The pump rocks at about 10 Hz with a damping ratio of 0.1, so it oscillates, each swing smaller than the last, inside the exponential envelope: after 0.1 s the swing is down to about 1 mm, half the start. A damping ratio of 0.1 is typical of rubber mounts; steel structures are nearer 0.01, and car suspensions about 0.3.

## Underdamped, critical and overdamped

::: math
\[ x(t) \approx x_0\,e^{-\zeta\omega_n t}\cos(\omega_d t), \qquad \omega_d = \omega_n\sqrt{1 - \zeta^2} \;\;(\zeta < 1) \]
- $\zeta < 1$: underdamped, oscillates inside the envelope $e^{-\zeta\omega_n t}$
- $\zeta = 1$: critically damped; $\zeta > 1$: overdamped, creeps back
In code: `cz = z * 2 * math.sqrt(k * m)` for each $\zeta$, solved with `solve_ivp(rhs, ...)`
:::


The damping ratio sorts all behaviour into three cases:

- **underdamped** (ζ < 1): decaying oscillation at the damped frequency ω_d = ωₙ√(1 − ζ²);
- **critically damped** (ζ = 1): returns to rest as fast as possible without overshooting;
- **overdamped** (ζ > 1): returns slowly, with no oscillation, sluggish as damping grows.

Instruments, door closers and suspension systems are designed near critical damping: fast but without wobble. Predict before running: which of these settles within 1% of rest soonest?

```python type
fig, ax = plt.subplots(figsize=(7, 3))
t_eval = np.linspace(0, 0.3, 3001)
for z in [0.1, 0.5, 0.7, 1.0, 2.0]:
    cz = z * 2 * math.sqrt(k * m)
    s = solve_ivp(rhs, (0, 0.3), [0.002, 0.0], args=(m, cz, k), t_eval=t_eval, rtol=1e-9, atol=1e-12)
    outside = np.flatnonzero(np.abs(s.y[0]) > 0.01 * 0.002)
    settled = outside[-1] + 1 < len(s.t)
    ax.plot(s.t, s.y[0] * 1000, label=f"ζ = {z}")
    when = f"after {s.t[outside[-1] + 1] * 1000:.0f} ms" if settled else "not within 0.3 s"
    print(f"ζ = {z}: settles within 1% {when}, lowest point {s.y[0].min() * 1000:+.3f} mm")
ax.axhline(0, color="grey", linewidth=0.5)
ax.set_xlabel("time (s)")
ax.set_ylabel("displacement (mm)")
ax.legend()
plt.show()
```

```output
ζ = 0.1: settles within 1% not within 0.3 s, lowest point -1.458 mm
ζ = 0.5: settles within 1% after 140 ms, lowest point -0.326 mm
ζ = 0.7: settles within 1% after 105 ms, lowest point -0.092 mm
ζ = 1.0: settles within 1% after 106 ms, lowest point +0.000 mm
ζ = 2.0: settles within 1% after 279 ms, lowest point +0.014 mm
```

The settling time is the last moment the displacement is more than 1% of the initial 2 mm, as in the tank lesson.

Light damping (ζ = 0.1) is still ringing after 0.3 s; ζ = 0.5 overshoots below zero and settles in 140 ms; ζ = 0.7 overshoots only slightly (0.09 mm) and settles in 105 ms, as quickly as critical damping (ζ = 1), which settles without overshoot in 106 ms; and heavy damping (ζ = 2) is slow again, creeping back over 279 ms. Anywhere from about 0.7 to 1 gives a quick, clean return.

## Measuring damping from a recording

::: math
\[ \delta = \ln\frac{x_i}{x_{i+1}}, \qquad \zeta = \frac{\delta}{\sqrt{4\pi^2 + \delta^2}} \]
- $x_i$: successive peaks of a decaying recording
- every cycle shrinks the amplitude by the same factor, so $\delta$ is constant
In code: `deltas = np.log(peak_vals[:-1] / peak_vals[1:])`, then `delta = deltas.mean()`
:::


Mass and stiffness can be measured statically, but damping is hard to predict: it comes from material friction, joints and air. It is usually **measured** by a tap test: strike the structure, record the decaying vibration, and compare successive peaks. For an underdamped system, every cycle shrinks the amplitude by the same factor, so the **logarithmic decrement** δ = ln(x_i / x_{i+1}) between successive peaks is constant, and

\[ \zeta = \frac{\delta}{\sqrt{4\pi^2 + \delta^2}} \]

Averaging δ over several cycles reduces the effect of noise. Predict before running: from a noisy recording of the pump, how close does the estimate come to the true ζ = 0.1?

```python type
rng = np.random.default_rng(37)
t_rec = np.linspace(0, 0.4, 4001)
rec = solve_ivp(rhs, (0, 0.4), [0.002, 0.0], args=(m, c, k), t_eval=t_rec, rtol=1e-9, atol=1e-12).y[0]
noisy = rec + rng.normal(0, 2e-6, rec.size)
w = 250
peaks = [i for i in range(w, len(noisy) - w) if noisy[i] == noisy[i - w:i + w + 1].max() and noisy[i] > 1e-4]
peak_vals = noisy[peaks]
deltas = np.log(peak_vals[:-1] / peak_vals[1:])
delta = deltas.mean()
print("peak heights (mm):", np.round(peak_vals * 1000, 3))
print(f"mean log decrement {delta:.4f} -> ζ = {delta / math.sqrt(4 * math.pi ** 2 + delta ** 2):.4f}")
print(f"period between peaks {np.diff(t_rec[peaks]).mean() * 1000:.2f} ms -> damped frequency {1 / np.diff(t_rec[peaks]).mean():.2f} Hz")
```

```output
peak heights (mm): [1.066 0.57  0.305]
mean log decrement 0.6257 -> ζ = 0.0991
period between peaks 102.25 ms -> damped frequency 9.78 Hz
```

A peak is a sample that is the largest within 250 samples (25 ms) on either side, a quarter of a cycle, so that noise wiggles on the slopes are not mistaken for peaks; the threshold ignores the noise once the vibration has died away.

The successive peaks (1.066, 0.570 and 0.305 mm) shrink by the same ratio, about 1.87, each cycle, and the averaged decrement gives ζ ≈ 0.099, close to the true 0.1 despite the noise. The time between peaks gives the damped frequency, about 9.8 Hz against the true 9.91 Hz: with only three peaks, the noise shifts each peak's timing slightly, so the frequency estimate is the rougher of the two. With these two numbers from a single tap, the whole model is known.

## Forced vibration and resonance

::: math
\[ r = \frac{\omega}{\omega_n}, \qquad \frac{X}{F_0/k} = \frac{1}{\sqrt{(1 - r^2)^2 + (2\zeta r)^2}} \]
- $F_0/k$: the static deflection under the force amplitude
- at resonance ($r = 1$) the amplification is $\dfrac{1}{2\zeta}$
In code: `amplification(r, z)`, checked against `solve_ivp` with `F0 * math.sin(w * t)`
:::


A pump with a slightly unbalanced rotor pushes on its mounts with a force F₀ sin(ωt) at its running frequency. After the start-up transient dies away, the mass vibrates at the forcing frequency with a steady amplitude X. With r = ω/ωₙ the **frequency ratio**,

\[ \frac{X}{F_0/k} = \frac{1}{\sqrt{(1 - r^2)^2 + (2\zeta r)^2}} \]

F₀/k is how far the force would push the spring statically. Near r = 1, **resonance**, the amplitude can be many times larger, limited only by damping: about 1/(2ζ) times. Predict before running: for ζ = 0.1, how large is the amplification at resonance, and what happens far above it?

```python type
def amplification(r, z):
    return 1 / np.sqrt((1 - r ** 2) ** 2 + (2 * z * r) ** 2)

F0 = 200.0
for f_hz in [5.0, 9.9, 20.0]:
    w = 2 * math.pi * f_hz
    s = solve_ivp(rhs, (0, 3.0), [0.0, 0.0], args=(m, c, k, lambda t: F0 * math.sin(w * t)), max_step=0.0005, rtol=1e-8, atol=1e-12)
    steady = np.abs(s.y[0][s.t > 2.0]).max()
    print(f"forcing at {f_hz:>4} Hz (r = {w / wn:.2f}): simulated amplitude {steady * 1e6:7.1f} µm, formula {F0 / k * amplification(w / wn, zeta) * 1e6:7.1f} µm")

rs = np.linspace(0, 3, 600)
fig, ax = plt.subplots(figsize=(6, 3))
for z in [0.05, 0.1, 0.3, 0.7]:
    ax.plot(rs, amplification(rs, z), label=f"ζ = {z}")
ax.set_xlabel("frequency ratio r = ω/ωn")
ax.set_ylabel("amplitude / static deflection")
ax.set_ylim(0, 11)
ax.legend()
plt.show()
```

```output
forcing at  5.0 Hz (r = 0.50): simulated amplitude   563.8 µm, formula   563.8 µm
forcing at  9.9 Hz (r = 0.99): simulated amplitude  2139.5 µm, formula  2139.5 µm
forcing at 20.0 Hz (r = 2.01): simulated amplitude   139.1 µm, formula   139.1 µm
```

The simulation runs for 3 s and measures the amplitude only after 2 s, when the start-up transient has decayed.

At resonance the amplitude is about five times the static deflection (1/(2ζ) = 5), and the simulation and formula agree; at 20 Hz, twice the natural frequency, the amplitude drops to about a third of static. The curves show the whole picture: light damping means a tall, sharp resonance peak. A machine must not run near its natural frequency, and if it must pass through it during start-up, damping limits the peak.

## Isolating a vibrating machine

::: math
\[ T = \sqrt{\frac{1 + (2\zeta r)^2}{(1 - r^2)^2 + (2\zeta r)^2}} \]
- transmissibility: force reaching the floor divided by the shaking force
- $T < 1$ only for $r > \sqrt{2}$: isolation needs soft mounts
In code: `transmissibility(r, z)` with `r_now = 2 * math.pi * run_hz / wn`
:::


What reaches the floor is the force through the mounts, spring plus damper. Its ratio to the shaking force is the **transmissibility**

\[ T = \sqrt{\frac{1 + (2\zeta r)^2}{(1 - r^2)^2 + (2\zeta r)^2}} \]

T is greater than 1 (the mounts make things worse) for r < √2, and less than 1 only above r = √2. So isolation requires **soft** mounts: the natural frequency must be well below the running frequency. Damping, oddly, makes isolation slightly worse above √2, although it limits the resonance the machine passes through when starting. Predict before running: the pump runs at 1,450 rpm. With the current mounts, is the floor protected?

```python type
def transmissibility(r, z):
    return np.sqrt((1 + (2 * z * r) ** 2) / ((1 - r ** 2) ** 2 + (2 * z * r) ** 2))

run_hz = 1450 / 60
r_now = 2 * math.pi * run_hz / wn
print(f"running at {run_hz:.2f} Hz, natural {wn / (2 * math.pi):.2f} Hz, r = {r_now:.2f}, transmissibility {transmissibility(r_now, zeta):.3f}")
for target in [0.2, 0.1]:
    r_lo, r_hi = math.sqrt(2) + 1e-9, 50.0
    for _ in range(100):
        r_mid = (r_lo + r_hi) / 2
        if transmissibility(r_mid, zeta) > target:
            r_lo = r_mid
        else:
            r_hi = r_mid
    k_need = m * (2 * math.pi * run_hz / r_hi) ** 2
    print(f"to transmit {target:.0%}: need r ≥ {r_hi:.2f}, mount stiffness ≤ {k_need / 1000:.0f} kN/m (static sag {m * 9.81 / k_need * 1000:.1f} mm)")
```

```output
running at 24.17 Hz, natural 9.96 Hz, r = 2.43, transmissibility 0.226
to transmit 20%: need r ≥ 2.57, mount stiffness ≤ 419 kN/m (static sag 2.8 mm)
to transmit 10%: need r ≥ 3.66, mount stiffness ≤ 207 kN/m (static sag 5.7 mm)
```

Transmissibility falls steadily with r above √2, so bisection finds the r where it equals the target; the stiffness then follows from ωₙ = ω/r and k = mωₙ².

At 24.2 Hz against a natural frequency of 10 Hz, r ≈ 2.4 and only about 23% of the force reaches the floor: the mounts are working. Transmitting 10% would need r ≈ 3.7, softer mounts of about 207 kN/m, which sag about 5.7 mm under the pump's weight. That trade-off, softer mounts isolate better but sag more and let the machine move more, is the daily business of vibration engineering.

::: challenge Mount properties [easy]
Write `mount_properties(m, k, c)` returning a dict with `"wn"` (natural frequency in rad/s), `"fn"` (in Hz), `"zeta"` (damping ratio) and `"kind"`: `"underdamped"`, `"critical"` or `"overdamped"`, treating |ζ − 1| < 1e-9 as critical; and for underdamped systems also `"fd"`, the damped natural frequency in Hz (omit the key otherwise). Numbers are plain floats; raise `ValueError` if m or k is not positive or c is negative. Then write `damping_for(m, k, zeta)`: the damping coefficient c that gives a required damping ratio.

```python starter
def mount_properties(m, k, c):
    return {"wn": 0.0, "fn": 0.0, "zeta": 0.0, "kind": "underdamped"}

def damping_for(m, k, zeta):
    return 0.0

print(mount_properties(120, 4.7e5, 1500))
```

```python solution
def mount_properties(m, k, c):
    if m <= 0 or k <= 0 or c < 0:
        raise ValueError("need m > 0, k > 0 and c >= 0")
    wn = math.sqrt(k / m)
    zeta = c / (2 * math.sqrt(k * m))
    out = {"wn": float(wn), "fn": float(wn / (2 * math.pi)), "zeta": float(zeta)}
    if abs(zeta - 1) < 1e-9:
        out["kind"] = "critical"
    elif zeta < 1:
        out["kind"] = "underdamped"
        out["fd"] = float(wn * math.sqrt(1 - zeta ** 2) / (2 * math.pi))
    else:
        out["kind"] = "overdamped"
    return out

def damping_for(m, k, zeta):
    return 2 * zeta * math.sqrt(k * m)

print(mount_properties(120, 4.7e5, 1500))
```

```python test
for _n in ["mount_properties", "damping_for"]:
    assert _n in dir(), f"Define {_n}."
_p = mount_properties(120, 4.7e5, 1500)
assert abs(_p["wn"] - math.sqrt(4.7e5 / 120)) < 1e-9 and abs(_p["fn"] - _p["wn"] / (2 * math.pi)) < 1e-12, "Natural frequency."
assert abs(_p["zeta"] - 1500 / (2 * math.sqrt(4.7e5 * 120))) < 1e-12 and _p["kind"] == "underdamped", f"Got {_p}."
assert abs(_p["fd"] - _p["fn"] * math.sqrt(1 - _p["zeta"] ** 2)) < 1e-12, "Damped frequency."
assert all(type(_p[_k]) is float for _k in ("wn", "fn", "zeta", "fd")), "Plain floats."
_crit = mount_properties(1, 100, 20)
assert _crit["kind"] == "critical" and "fd" not in _crit, "c = 2√(km) is critical, with no damped frequency."
assert mount_properties(1, 100, 50)["kind"] == "overdamped" and mount_properties(1, 100, 0)["zeta"] == 0.0, "Overdamped and undamped."
for _bad in [(0, 1, 1), (1, 0, 1), (1, 1, -1)]:
    try:
        mount_properties(*_bad)
        assert False, f"mount_properties{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(damping_for(120, 4.7e5, 0.1) - 0.1 * 2 * math.sqrt(4.7e5 * 120)) < 1e-9 and mount_properties(5, 2000, damping_for(5, 2000, 1))["kind"] == "critical", "Damping for a target ratio."
"SUCCESS: Mass, stiffness and damping boil down to two numbers, ωn and ζ, which decide everything the mount does."
```

Hint: ωₙ = √(k/m), ζ = c/(2√(km)), and the damped frequency is ωₙ√(1 − ζ²). Divide by 2π for hertz.
:::

::: challenge Damping from a tap test [medium]
Write `find_peaks(signal, threshold, window)`: the indices i with `window ≤ i ≤ n − 1 − window` where `signal[i]` equals the maximum of `signal[i - window : i + window + 1]` and exceeds `threshold`, as a list of ints in increasing order (a window of about a quarter of the vibration period makes noise wiggles harmless). Then write `damping_from_peaks(times, signal, threshold, window)` returning `(zeta, fd_hz)`: the mean logarithmic decrement over successive peaks converted to ζ, and the damped frequency from the mean time between peaks, both as plain floats rounded to 4 decimal places. Raise `ValueError` if fewer than 2 peaks are found.

```python starter
def find_peaks(signal, threshold, window):
    return []

def damping_from_peaks(times, signal, threshold, window):
    return (0.0, 0.0)

t = np.linspace(0, 1, 2001)
print(damping_from_peaks(t, np.exp(-0.5 * t) * np.cos(2 * math.pi * 10 * t), 0.01, 50))
```

```python solution
def find_peaks(signal, threshold, window):
    s = np.asarray(signal, dtype=float)
    return [int(i) for i in range(window, len(s) - window) if s[i] == s[i - window:i + window + 1].max() and s[i] > threshold]

def damping_from_peaks(times, signal, threshold, window):
    s, t = np.asarray(signal, dtype=float), np.asarray(times, dtype=float)
    p = find_peaks(s, threshold, window)
    if len(p) < 2:
        raise ValueError("need at least two peaks")
    delta = float(np.mean(np.log(s[p][:-1] / s[p][1:])))
    zeta = delta / math.sqrt(4 * math.pi ** 2 + delta ** 2)
    return (round(zeta, 4), round(float(1 / np.mean(np.diff(t[p]))), 4))

t = np.linspace(0, 1, 2001)
print(damping_from_peaks(t, np.exp(-0.5 * t) * np.cos(2 * math.pi * 10 * t), 0.01, 50))
```

```python test
for _n in ["find_peaks", "damping_from_peaks"]:
    assert _n in dir(), f"Define {_n}."
assert find_peaks([0, 3, 1, 4, 2, 2, 5, 0], 0, 1) == [1, 3, 6], f"Got {find_peaks([0, 3, 1, 4, 2, 2, 5, 0], 0, 1)}."
assert find_peaks([0, 3, 1, 4, 2, 2, 5, 0], 0, 2) == [3], "A wider window keeps only the dominant peak in each neighbourhood."
assert find_peaks([0, 3, 1, 4, 1], 3.5, 1) == [3] and find_peaks([5, 4, 3], 0, 1) == [], "Threshold, and no interior peak."
assert all(type(_i) is int for _i in find_peaks(np.array([0.0, 1, 0]), 0, 1)), "Plain ints."
_wn, _z = 2 * math.pi * 10, 0.05
_t = np.linspace(0, 1.5, 15001)
_wd = _wn * math.sqrt(1 - _z ** 2)
_x = np.exp(-_z * _wn * _t) * np.cos(_wd * _t)
_zeta, _fd = damping_from_peaks(_t, _x, 1e-3, 250)
assert abs(_zeta - 0.05) < 0.001 and abs(_fd - _wd / (2 * math.pi)) < 0.01, f"Expected ζ ≈ 0.05 and fd ≈ {_wd / (2 * math.pi):.3f}; got {(_zeta, _fd)}."
_rng = np.random.default_rng(371)
_zn, _ = damping_from_peaks(_t, _x + _rng.normal(0, 1e-3, _x.size), 0.01, 250)
assert abs(_zn - 0.05) < 0.003, f"Small noise barely affects the averaged estimate; got {_zn}."
try:
    damping_from_peaks(_t[:600], _x[:600], 1e-3, 250)
    assert False, "Fewer than two peaks should raise ValueError."
except ValueError:
    pass
"SUCCESS: Successive peaks shrink by a constant ratio; its logarithm gives the damping ratio, and their spacing the damped frequency."
```

Hint: A sample is a peak when it equals the maximum of the slice around it. Collect peak indices, take the logarithms of the ratios of successive peak heights and average them, then ζ = δ/√(4π² + δ²). The damped frequency is 1 / (mean time between peaks).
:::

::: challenge Designing a mount [hard]
Write `amplification(r, zeta)` and `transmissibility(r, zeta)` (the lesson's formulas, working on numbers or arrays). Then write `mount_for(m, run_hz, target, zeta)`: the stiffness k (N/m, rounded to the nearest whole N/m, an int) that makes the transmissibility exactly `target` at the running frequency, choosing the solution with r > √2 by bisection on r over (√2, 100] to a width below 1e-12. Raise `ValueError` unless 0 < target < 1, and also if the target cannot be reached for r ≤ 100. Finally write `static_sag_mm(m, k, g=9.81)`, the mount's deflection under the machine's weight, rounded to 2 decimal places.

```python starter
def amplification(r, zeta):
    return 1.0

def transmissibility(r, zeta):
    return 1.0

def mount_for(m, run_hz, target, zeta):
    return 1

def static_sag_mm(m, k, g=9.81):
    return 0.0

print(mount_for(120, 1450 / 60, 0.1, 0.1))
```

```python solution
def amplification(r, zeta):
    r = np.asarray(r, dtype=float)
    return 1 / np.sqrt((1 - r ** 2) ** 2 + (2 * zeta * r) ** 2)

def transmissibility(r, zeta):
    r = np.asarray(r, dtype=float)
    return np.sqrt((1 + (2 * zeta * r) ** 2) / ((1 - r ** 2) ** 2 + (2 * zeta * r) ** 2))

def mount_for(m, run_hz, target, zeta):
    if not 0 < target < 1:
        raise ValueError("the target must be between 0 and 1")
    lo, hi = math.sqrt(2), 100.0
    if float(transmissibility(hi, zeta)) > target:
        raise ValueError("the target cannot be reached")
    while hi - lo > 1e-12:
        mid = (lo + hi) / 2
        if float(transmissibility(mid, zeta)) > target:
            lo = mid
        else:
            hi = mid
    r = (lo + hi) / 2
    wn = 2 * math.pi * run_hz / r
    return int(round(m * wn ** 2))

def static_sag_mm(m, k, g=9.81):
    return round(m * g / k * 1000, 2)

print(mount_for(120, 1450 / 60, 0.1, 0.1))
```

```python test
for _n in ["amplification", "transmissibility", "mount_for", "static_sag_mm"]:
    assert _n in dir(), f"Define {_n}."
assert abs(float(amplification(1, 0.1)) - 5) < 1e-12 and abs(float(amplification(0, 0.3)) - 1) < 1e-12, "1/(2ζ) at resonance; 1 when static."
assert abs(float(transmissibility(math.sqrt(2), 0.2)) - 1) < 1e-12 and abs(float(transmissibility(math.sqrt(2), 0.01)) - 1) < 1e-12, "T = 1 at r = √2 for any damping."
assert np.allclose(transmissibility(np.array([0.5, 3.0]), 0.1), [math.sqrt((1 + 0.01) / (0.5625 + 0.01)), math.sqrt((1 + 0.36) / (64 + 0.36))]), "Works on arrays."
_k = mount_for(120, 1450 / 60, 0.1, 0.1)
assert type(_k) is int, "Return the stiffness as an int."
_r = 2 * math.pi * 1450 / 60 / math.sqrt(_k / 120)
assert abs(float(transmissibility(_r, 0.1)) - 0.1) < 1e-4, f"At the running speed the mount must transmit 10%; got {float(transmissibility(_r, 0.1)):.5f}."
assert mount_for(120, 1450 / 60, 0.05, 0.1) < _k and mount_for(120, 1450 / 60, 0.1, 0.3) < _k, "Better isolation, or more damping at the same target, needs a softer mount."
for _bad in [(120, 24, 1.0, 0.1), (120, 24, 0, 0.1), (120, 24, 0.0001, 0.6)]:
    try:
        mount_for(*_bad)
        assert False, f"mount_for{_bad} should raise ValueError."
    except ValueError:
        pass
assert static_sag_mm(120, _k) == round(120 * 9.81 / _k * 1000, 2) and static_sag_mm(100, 9810) == 100.0, "Static sag."
"SUCCESS: Isolation needs the natural frequency well below the running speed; bisection on the transmissibility curve sizes the mount."
```

Hint: Above √2 the transmissibility falls as r grows, so bisection keeps the half where it crosses the target. Then ωₙ = 2π run_hz / r and k = m ωₙ².
:::

## What you learned

- The damped spring–mass system m x″ + c x′ + k x = F(t) becomes a first-order system in (x, v) for `solve_ivp`.
- Its behaviour depends on ωₙ = √(k/m) and ζ = c/(2√(km)): underdamped systems ring, critical damping returns fastest without overshoot, overdamped systems creep.
- The logarithmic decrement between successive peaks of a recording gives ζ = δ/√(4π² + δ²); the peak spacing gives the damped frequency.
- Under a periodic force the steady amplitude peaks near resonance, about 1/(2ζ) times the static deflection.
- Mounts isolate only above r = √2: soft mounts with a low natural frequency protect the floor, at the cost of static sag.

The next lesson takes the sine waves of these vibrations as objects in their own right: amplitude, frequency and phase.
