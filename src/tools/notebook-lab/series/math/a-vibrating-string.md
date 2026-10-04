# A vibrating string

Pluck a guitar string and it sounds a note: one pitch, coloured by a mix of higher ones. Tap a tight cable on a bridge or a mast and a ripple runs to the far end and back. Both are the same equation, the **wave equation**. It looks almost like the heat equation of the last lesson, with the same second difference along the string. The one change is that the second derivative in space now drives an **acceleration**, not a rate of change. That single change turns smoothing into vibration. Heat spreads and fades; waves travel, reflect and keep their shape. This lesson derives the equation, simulates it, and uses it to explain musical pitch and tone, and to measure the tension in a cable.

This lesson covers:

- the wave equation, wave speed and the harmonic series of a string;
- simulating it with the leapfrog scheme, and the CFL stability condition;
- travelling waves and reflections, and measuring a cable's tension;
- how the plucking point decides which harmonics sound;
- hearing the harmonics in a spectrum.

## Tension, wave speed and pitch

::: math
\[ \mu\,\frac{\partial^2 y}{\partial t^2} = T\,\frac{\partial^2 y}{\partial x^2} \quad\Longrightarrow\quad \frac{\partial^2 y}{\partial t^2} = c^2\,\frac{\partial^2 y}{\partial x^2}, \qquad c = \sqrt{\frac{T}{\mu}}, \qquad f_n = \frac{n\,c}{2L} \]
- $y(x, t)$: sideways displacement; $T$: tension (N); $\mu$: mass per metre (kg/m); $L$: length between the fixed ends
- $c$: wave speed; $f_n$: the frequencies of the modes, all whole multiples of $f_1$ (the harmonic series)
In code: `c = math.sqrt(T / mu)`, then `n * c / (2 * L)` for each mode
:::

Take a short piece of a tight string, bent into a curve. The tension pulls along the string at each end of the piece. Where the string is curved, the two pulls do not cancel, and their sideways difference is the tension times the change in slope: T ∂²y/∂x² per unit length. Newton's second law for the piece, mass μ per metre times acceleration, gives the wave equation. Its constant c = √(T/μ) has units of speed. It is the speed at which ripples travel along the string, as the third section shows.

A string fixed at both ends can only hold shapes that fit between the ends: sin(nπx/L), whole numbers of half-waves. Each one swings at its own frequency, f_n = nc/(2L): a fundamental and its exact multiples, the **harmonic series** of the building-signals lesson. That is why a string sounds a clear pitch.

Predict before running: the low E string of a guitar is 648 mm long, with 6.2 g of mass per metre, and must sound 82.41 Hz. What tension is needed, and what are its first harmonics?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

L, mu, f_target = 0.648, 0.0062, 82.41
T = mu * (2 * L * f_target) ** 2
c = math.sqrt(T / mu)
print(f"tension {T:.1f} N (about {T / 9.81:.1f} kg weight), wave speed {c:.1f} m/s")
print("harmonics (Hz):", [round(n * c / (2 * L), 2) for n in range(1, 7)])
print(f"tuning: 1% more tension raises the pitch by {100 * (math.sqrt(1.01) - 1):.2f}%")
```

The string needs about 70.7 N, the weight of a 7.2 kg mass, and waves run along it at about 107 m/s. Its harmonics are 82.41, 164.82, 247.23 Hz and so on, exact multiples. Since f ∝ √T, 1% more tension raises the pitch by about 0.5%. Tuning pegs adjust tension; frets shorten L; heavier strings have larger μ and lower notes.

## Leapfrog in time

::: math
\[ \frac{y_i^{k+1} - 2y_i^k + y_i^{k-1}}{\Delta t^2} = c^2\,\frac{y_{i+1}^k - 2y_i^k + y_{i-1}^k}{\Delta x^2} \;\Longrightarrow\; y_i^{k+1} = 2y_i^k - y_i^{k-1} + C^2\big(y_{i+1}^k - 2y_i^k + y_{i-1}^k\big) \]
\[ C = \frac{c\,\Delta t}{\Delta x} \le 1 \quad\text{(the CFL condition)}, \qquad \text{first step from rest: } y_i^1 = y_i^0 + \tfrac{1}{2}C^2\big(y_{i+1}^0 - 2y_i^0 + y_{i-1}^0\big) \]
- $y_i^k$: displacement at point $i$ (spacing $\Delta x$) and time step $k$ (length $\Delta t$)
- the second difference now appears in time as well as in space; each new value needs the two previous time levels
- $C$: the Courant number, how many grid spaces a wave moves in one time step
In code: `leapfrog(y0, C, steps)` keeps `prev` and `cur` and builds `nxt` from both
:::

Replace both second derivatives by second differences. The new displacement then depends on the current one and the one before it: the scheme **leaps** from two time levels to the next, hence "leapfrog". The very first step has no "before". For a string released from rest, a Taylor expansion with zero velocity supplies it: half of a normal step's curvature term.

Stability takes a new form. A wave travels c Δt in one step, and the scheme only lets information move one grid space per step. If the wave would outrun the grid, C > 1, the method cannot keep up and explodes. This is the **CFL condition** (Courant, Friedrichs and Lewy, 1928). Every explicit wave, acoustics and crash simulation obeys it.

Predict before running: the string is plucked 1/5 of the way along and released. After exactly one period, 2L/c, it should be back where it started. How close does the simulation come with C = 1, C = 0.9 and C = 1.02?

```python
def pluck_shape(xq, p, height=0.003):
    return np.where(xq <= p, height * xq / p, height * (L - xq) / (L - p))

def leapfrog(y0, C, steps):
    prev = y0.copy()
    cur = y0.copy()
    cur[1:-1] = y0[1:-1] + 0.5 * C ** 2 * (y0[2:] - 2 * y0[1:-1] + y0[:-2])
    history = [prev.copy(), cur.copy()]
    for _ in range(steps - 1):
        nxt = np.zeros_like(cur)
        nxt[1:-1] = 2 * cur[1:-1] - prev[1:-1] + C ** 2 * (cur[2:] - 2 * cur[1:-1] + cur[:-2])
        prev, cur = cur, nxt
        history.append(cur.copy())
    return np.array(history)

x = np.linspace(0, L, 201)
dx = x[1] - x[0]
y0 = pluck_shape(x, L / 5)
period = 2 * L / c
for C in [1.0, 0.9, 1.02]:
    dt = C * dx / c
    steps = round(period / dt)
    hist = leapfrog(y0, C, steps)
    print(f"C = {C}: {steps} steps of {dt * 1e6:.2f} µs, largest |y| {np.abs(hist).max():.3g} m, "
          f"after one period off by {np.abs(hist[-1] - y0).max():.2g} m")

hist = leapfrog(y0, 1.0, round(period / (dx / c)))
fig, ax = plt.subplots(figsize=(6, 3))
for frac in [0, 0.1, 0.25, 0.4, 0.5]:
    ax.plot(x, hist[round(frac * (len(hist) - 1))] * 1000, label=f"{frac:.2f} period")
ax.set_xlabel("position (m)")
ax.set_ylabel("displacement (mm)")
ax.legend(fontsize=8)
plt.show()
```

With C = 1 the string returns to its starting shape to within 10⁻¹⁷ m, exact up to rounding. For the 1D wave equation, C = 1 is a special "magic" step at which the scheme is exact, for a reason the next section makes clear. With C = 0.9 it is off by about 6 × 10⁻⁵ m, 2% of the 3 mm pluck: the scheme makes high harmonics travel slightly too slowly (**numerical dispersion**), and the sharp corner smears. With C = 1.02, just 2% over the limit, the displacement reaches about 10⁶¹ m. The snapshots show the plucked corner splitting into two corners that run apart. At half a period the shape is the original turned upside down and mirrored.

## Travelling waves and a cable's tension

::: math
\[ y(x, t) = F(x - ct) + G(x + ct), \qquad \text{round trip } t_\text{rt} = \frac{2L}{c} \;\Longrightarrow\; T = \mu c^2 = \mu\left(\frac{2L}{t_\text{rt}}\right)^2 \]
- any shape moving right at speed $c$, plus any shape moving left, solves the wave equation (d'Alembert's solution)
- a fixed end reflects a pulse upside down
In code: a Gaussian bump `pulse` released at rest splits into two halves; `leapfrog(pulse, 1.0, steps)` follows them
:::

Substitute F(x − ct) into the wave equation: both sides become c² F″, so any shape at all, sliding along at speed c, is a solution. That is **d'Alembert's solution**: every motion of an infinite string is one shape travelling right plus another travelling left. A bump released from rest splits into two half-height copies running in opposite directions. At a fixed end the string cannot move, so a reflected copy must cancel the arriving one there: the pulse returns upside down. With C = 1 the leapfrog scheme moves every shape exactly one grid point per step, which is why it was exact above.

This gives a practical way to measure tension in a guy wire or a stay cable without disconnecting anything. Strike it, time the ripple's round trip to the far end and back, and compute c and then T = μc².

Predict before running: a 30 m guy wire weighs 1.2 kg per metre and the ripple returns after 0.4 s. What is the tension? And where are the two halves of a bump struck 5 m from one end, a quarter and a half of the round trip later?

```python
L_cable, mu_cable, t_round = 30.0, 1.2, 0.4
c_cable = 2 * L_cable / t_round
print(f"wave speed {c_cable:.0f} m/s, tension {mu_cable * c_cable ** 2 / 1000:.1f} kN")

xc = np.linspace(0, L_cable, 601)
pulse = 0.05 * np.exp(-((xc - 5.0) / 0.5) ** 2)
steps = round(t_round / ((xc[1] - xc[0]) / c_cable))
trip = leapfrog(pulse, 1.0, steps)
for frac in [0.0, 0.25, 0.5, 1.0]:
    row = trip[round(frac * steps)]
    print(f"{frac:4.2f} of the round trip: highest {row.max():+.3f} m at {xc[np.argmax(row)]:5.2f} m, lowest {row.min():+.3f} m at {xc[np.argmin(row)]:5.2f} m")
print(f"after the full round trip the shape differs from the start by {np.abs(trip[-1] - pulse).max():.1e} m")
```

The ripple travels at 150 m/s, so the tension is 1.2 × 150² = 27 kN. A quarter of the round trip later (0.1 s, 15 m of travel) the right-going half, +0.025 m, is at 20 m. The left-going half has hit the near end and come back inverted, −0.025 m at 10 m. At half the round trip both halves arrive at 25 m, both inverted, and add up to −0.05 m. After the full round trip the bump is back at 5 m, upright, having been flipped twice. In practice the timing is read from an accelerometer on the cable, and the tension follows from one division and one square.

## Where you pluck decides the tone

::: math
\[ y(x, 0) = \sum_{n=1}^{\infty} b_n \sin\frac{n\pi x}{L}, \qquad b_n = \frac{2hL^2}{n^2\pi^2\,p\,(L - p)}\,\sin\frac{n\pi p}{L} \]
\[ y(x, t) = \sum_{n} b_n \sin\frac{n\pi x}{L}\,\cos(2\pi f_n t) \]
- $p$: the plucking point; $h$: the height it is pulled to; the triangle's corner gives $b_n \propto 1/n^2$
- $b_n = 0$ whenever $np/L$ is a whole number: a harmonic with a node at the plucking point is not excited
In code: `b_coef(n, p)` for three plucking points; the mode sum against `leapfrog` at a third of a period
:::

The pluck is a triangle, and like any shape on the string it is a sum of the sine modes, with coefficients by projection. For a triangle they have a closed form. Each mode then swings at its own frequency, so the motion is a sum of standing waves: the same mode picture as for the heated bar, with cosines in time where the bar had decaying exponentials. Nothing decays here, because the wave equation, unlike the heat equation, conserves energy.

The factor sin(nπp/L) is the interesting part. A mode that has a stationary point (a **node**) where the string is plucked cannot be set going by that pluck. Plucking in the middle silences every even harmonic. Plucking near the end excites many harmonics strongly, which is why guitarists play near the bridge for a bright, twangy tone and near the neck for a round, mellow one.

Predict before running: which harmonics vanish when the string is plucked at 1/5 of its length? And does the mode sum agree with the simulation?

```python
def b_coef(n, p, height=0.003):
    return 2 * height * L ** 2 / (n ** 2 * math.pi ** 2 * p * (L - p)) * math.sin(n * math.pi * p / L)

for label, p in [("middle (L/2)", L / 2), ("L/5", L / 5), ("near the bridge (L/10)", L / 10)]:
    rel = [abs(b_coef(n, p)) / abs(b_coef(1, p)) for n in range(1, 13)]
    print(f"{label:<22}", " ".join(f"{v:5.3f}" for v in rel))

C = 0.9
dt = C * dx / c
k = round(period / 3 / dt)
sim = leapfrog(y0, C, k)[-1]
modes = sum(b_coef(n, L / 5) * np.sin(n * math.pi * x / L) * math.cos(n * math.pi * c / L * k * dt) for n in range(1, 400))
print(f"at a third of a period: largest |y| {np.abs(modes).max() * 1000:.3f} mm, simulation differs from the mode sum by {np.abs(sim - modes).max() * 1000:.4f} mm")
```

The rows give each harmonic's amplitude relative to the fundamental. Plucked in the middle, every even harmonic is exactly zero. At L/5 the 5th and 10th vanish. Near the bridge the amplitudes fall away slowly (0.48, 0.29, 0.19, ...), a bright sound. Even this pluck silences the 10th harmonic, which has a node at L/10. The simulation with C = 0.9 matches the 400-mode sum to about 0.017 mm, 1% of the 1.744 mm peak: two completely different methods telling the same story.

## Hearing the harmonics

::: math
\[ y(x_0, t) = \sum_n b_n \sin\frac{n\pi x_0}{L}\,\cos(2\pi f_n t) \;\Longrightarrow\; \text{spectral peaks at } f_n \text{ with heights } \propto \Big|b_n \sin\frac{n\pi x_0}{L}\Big| \]
- a pickup at $x_0$ hears each harmonic weighted by how much that mode moves at $x_0$
- a time step $\Delta t$ means the sampling rate is $1/\Delta t$, far above the highest harmonic of interest
In code: record `cur[pickup]` every step, then `w = np.hanning(signal.size)` and `np.fft.rfft(signal * w)`
:::

An electric guitar's pickup senses the string's motion at one point. Recording the simulated displacement there for half a second and taking its spectrum, as in the seeing-frequencies lesson, shows which harmonics the pluck produced. The time step is about 30 µs, a sampling rate near 33 kHz, so aliasing is not an issue.

Predict before running: with the pickup at 0.09 m from the end, are the 5th and 10th harmonics present in the spectrum?

```python
C = 1.0
dt = C * dx / c
steps = round(0.5 / dt)
pickup = 28
prev = y0.copy()
cur = y0.copy()
cur[1:-1] = y0[1:-1] + 0.5 * C ** 2 * (y0[2:] - 2 * y0[1:-1] + y0[:-2])
signal = [prev[pickup], cur[pickup]]
for _ in range(steps - 1):
    nxt = np.zeros_like(cur)
    nxt[1:-1] = 2 * cur[1:-1] - prev[1:-1] + C ** 2 * (cur[2:] - 2 * cur[1:-1] + cur[:-2])
    prev, cur = cur, nxt
    signal.append(cur[pickup])
signal = np.array(signal)
w = np.hanning(signal.size)
amps = 2 * np.abs(np.fft.rfft(signal * w)) / signal.size / w.mean()
freqs = np.fft.rfftfreq(signal.size, dt)
print(f"pickup at {x[pickup]:.3f} m, sampling rate {1 / dt:.0f} Hz, {signal.size} samples")
for n in range(1, 12):
    j = np.argmin(np.abs(freqs - n * f_target))
    print(f"harmonic {n:>2} near {n * f_target:6.1f} Hz: amplitude {amps[j - 2:j + 3].max() * 1000:.4f} mm")

fig, ax = plt.subplots(figsize=(6, 3))
ax.semilogy(freqs, amps * 1000 + 1e-9)
ax.set_xlim(0, 1000)
ax.set_ylim(1e-5, 10)
ax.set_xlabel("frequency (Hz)")
ax.set_ylabel("amplitude (mm)")
plt.show()
```

The spectrum shows peaks at multiples of 82.4 Hz (each within one 2 Hz frequency bin). The 5th and 10th are missing: they show as 0.0000 mm, in fact below 10⁻⁶ mm, tens of thousands of times weaker than their neighbours. The other harmonics are scaled by how much each mode moves at the pickup. A pickup near the bridge moves little in the low modes, so it hears relatively more of the high ones: another way guitar makers shape tone. Real strings also lose energy and are slightly stiff, which bends the harmonics a little sharp. Adding those effects is a matter of extra terms in the same equation.

::: challenge Strings and their harmonics [easy]
Write `string_frequencies(tension, mu, length, count)`: the first `count` mode frequencies f_n = n c/(2L) with c = √(T/μ), as a list of plain floats. Write `tension_for(f1, length, mu)`: the tension (N) that gives fundamental frequency f1, as a plain float. Then write `cable_tension(length, mu, round_trip)`: the tension from the time (s) a ripple takes to travel to the far end and back. Raise `ValueError` in all three if any physical input (tension, mu, length, f1, round_trip) is not positive, or if count < 1.

```python starter
import math

def string_frequencies(tension, mu, length, count):
    return []

def tension_for(f1, length, mu):
    return 0.0

def cable_tension(length, mu, round_trip):
    return 0.0

print(string_frequencies(70.7, 0.0062, 0.648, 3))
```

```python solution
import math

def string_frequencies(tension, mu, length, count):
    if tension <= 0 or mu <= 0 or length <= 0 or count < 1:
        raise ValueError("inputs must be positive")
    c = math.sqrt(tension / mu)
    return [float(n * c / (2 * length)) for n in range(1, count + 1)]

def tension_for(f1, length, mu):
    if f1 <= 0 or length <= 0 or mu <= 0:
        raise ValueError("inputs must be positive")
    return float(mu * (2 * length * f1) ** 2)

def cable_tension(length, mu, round_trip):
    if length <= 0 or mu <= 0 or round_trip <= 0:
        raise ValueError("inputs must be positive")
    return float(mu * (2 * length / round_trip) ** 2)

print(string_frequencies(70.7, 0.0062, 0.648, 3))
```

```python test
import math
for _n in ["string_frequencies", "tension_for", "cable_tension"]:
    assert _n in dir(), f"Define {_n}."
_f = string_frequencies(100.0, 0.01, 0.5, 4)
assert isinstance(_f, list) and len(_f) == 4 and all(type(_v) is float for _v in _f), "A list of count plain floats."
assert all(abs(_a - _b) < 1e-9 for _a, _b in zip(_f, [100.0, 200.0, 300.0, 400.0])), f"c = 100 m/s on 0.5 m: 100, 200, 300, 400 Hz; got {_f}."
_T = tension_for(82.41, 0.648, 0.0062)
assert type(_T) is float and abs(_T - 70.723) < 1e-2, f"The low E string needs about 70.72 N; got {_T}."
assert abs(string_frequencies(_T, 0.0062, 0.648, 1)[0] - 82.41) < 1e-9, "tension_for and string_frequencies are inverses."
assert abs(tension_for(2 * 82.41, 0.648, 0.0062) / _T - 4) < 1e-12, "An octave higher needs four times the tension."
_C = cable_tension(30.0, 1.2, 0.4)
assert type(_C) is float and abs(_C - 27000.0) < 1e-6, f"30 m, 1.2 kg/m, 0.4 s: 27 kN; got {_C}."
for _call in [lambda: string_frequencies(0, 0.01, 0.5, 2), lambda: string_frequencies(100, 0.01, 0.5, 0), lambda: tension_for(80, -1, 0.01), lambda: cable_tension(30, 1.2, 0)]:
    try:
        _call()
        assert False, "Non-positive inputs (or count < 1) should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Wave speed is the square root of tension over mass per metre, and every pitch and every echo follows from it."
```

Hint: c = √(T/μ) and f_n = nc/(2L). Turning f₁ = c/(2L) round gives T = μ(2Lf₁)². A round trip covers 2L, so c = 2L/t and T = μc².
:::

::: challenge Harmonics from a shape [medium]
Write `sine_coefficients(y, length, n_max)`: given the string's shape sampled at equally spaced points from x = 0 to x = length (both ends included, y a NumPy array or a list), return a NumPy array of b₁ ... b_{n_max} with bₙ = (2/L) ∫₀ᴸ y(x) sin(nπx/L) dx, computed with the trapezoid rule. Raise `ValueError` if there are fewer than 3 samples, length is not positive or n_max < 1. Then write `missing_harmonics(coeffs, rel_tol=1e-3)`: the list of harmonic numbers n (counting from 1, as plain ints) whose |bₙ| is below rel_tol times the largest |bₙ|.

```python starter
import numpy as np

def sine_coefficients(y, length, n_max):
    return np.zeros(n_max)

def missing_harmonics(coeffs, rel_tol=1e-3):
    return []

xs = np.linspace(0, 0.648, 2001)
tri = np.where(xs <= 0.648 / 2, xs, 0.648 - xs)
print(missing_harmonics(sine_coefficients(tri, 0.648, 8)))
```

```python solution
import numpy as np

def sine_coefficients(y, length, n_max):
    y = np.asarray(y, dtype=float)
    if y.size < 3 or length <= 0 or n_max < 1:
        raise ValueError("need 3+ samples, positive length, n_max >= 1")
    xs = np.linspace(0, length, y.size)
    dx = xs[1] - xs[0]
    out = np.zeros(n_max)
    for n in range(1, n_max + 1):
        f = y * np.sin(n * np.pi * xs / length)
        out[n - 1] = 2 / length * dx * (f.sum() - (f[0] + f[-1]) / 2)
    return out

def missing_harmonics(coeffs, rel_tol=1e-3):
    a = np.abs(np.asarray(coeffs, dtype=float))
    return [int(i + 1) for i in range(a.size) if a[i] < rel_tol * a.max()]

xs = np.linspace(0, 0.648, 2001)
tri = np.where(xs <= 0.648 / 2, xs, 0.648 - xs)
print(missing_harmonics(sine_coefficients(tri, 0.648, 8)))
```

```python test
import math
import numpy as np
for _n in ["sine_coefficients", "missing_harmonics"]:
    assert _n in dir(), f"Define {_n}."
_L = 0.648
_xs = np.linspace(0, _L, 2001)
_mix = 2 * np.sin(math.pi * _xs / _L) - 0.5 * np.sin(3 * math.pi * _xs / _L)
_b = np.asarray(sine_coefficients(_mix, _L, 4))
assert _b.shape == (4,) and np.allclose(_b, [2.0, 0.0, -0.5, 0.0], atol=1e-6), f"A sum of sine modes gives back its coefficients; got {_b}."
def _tri(_p, _h=0.003):
    return np.where(_xs <= _p, _h * _xs / _p, _h * (_L - _xs) / (_L - _p))
def _exact(_n, _p, _h=0.003):
    return 2 * _h * _L ** 2 / (_n ** 2 * math.pi ** 2 * _p * (_L - _p)) * math.sin(_n * math.pi * _p / _L)
_c5 = np.asarray(sine_coefficients(_tri(_L / 5), _L, 12))
assert np.allclose(_c5, [_exact(_n, _L / 5) for _n in range(1, 13)], atol=1e-8), "Matches the closed form for a pluck at L/5."
assert missing_harmonics(_c5) == [5, 10], f"Plucked at L/5 the 5th and 10th vanish; got {missing_harmonics(_c5)}."
assert missing_harmonics(sine_coefficients(_tri(_L / 2), _L, 9)) == [2, 4, 6, 8], "Plucked in the middle, every even harmonic vanishes."
_m = missing_harmonics([1.0, 0.0, -0.5, 1e-5])
assert _m == [2, 4] and all(type(_v) is int for _v in _m), f"Plain ints counted from 1; got {_m}."
assert missing_harmonics([1.0, 0.01], rel_tol=0.05) == [2], "rel_tol is relative to the largest coefficient."
assert np.allclose(sine_coefficients(list(_mix), _L, 1), [2.0], atol=1e-6), "Lists work too."
for _bad in [([0.0, 1.0], _L, 3), (_mix, 0.0, 3), (_mix, _L, 0)]:
    try:
        sine_coefficients(*_bad)
        assert False, "Bad input should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Projecting a shape onto sin(nπx/L) measures each harmonic, and a mode with a node at the plucking point is never excited."
```

Hint: Build the x grid with `np.linspace(0, length, len(y))`. For each n, multiply y by sin(nπx/L) and integrate with the trapezoid rule (or `np.trapezoid`), then multiply by 2/L.
:::

::: challenge Simulating the string [hard]
Write `simulate_string(y0, c, length, t_end, courant=0.9)`: the string starts at rest in shape `y0` (a NumPy array sampled from x = 0 to x = length, ends fixed at their values). Use the leapfrog scheme with the special first step y¹ = y⁰ + ½C²(second difference of y⁰). Choose the number of steps as the smallest whole number for which C = c Δt/Δx with Δt = t_end/steps does not exceed `courant`, and return the shape at t_end as a NumPy array; with t_end = 0 return a copy of y0. Raise `ValueError` if courant is not in (0, 1], c or length is not positive, t_end is negative, or there are fewer than 3 points. Do not modify `y0`.

```python starter
import math
import numpy as np

def simulate_string(y0, c, length, t_end, courant=0.9):
    return np.array(y0, dtype=float)

xs = np.linspace(0, 0.648, 201)
y = np.where(xs <= 0.13, 0.003 * xs / 0.13, 0.003 * (0.648 - xs) / (0.648 - 0.13))
print(np.abs(simulate_string(y, 106.8, 0.648, 0.001)).max())
```

```python solution
import math
import numpy as np

def simulate_string(y0, c, length, t_end, courant=0.9):
    y0 = np.array(y0, dtype=float)
    if not 0 < courant <= 1 or c <= 0 or length <= 0 or t_end < 0 or y0.size < 3:
        raise ValueError("bad input")
    if t_end == 0:
        return y0
    dx = length / (y0.size - 1)
    steps = math.ceil(t_end / (courant * dx / c) - 1e-12)
    C2 = (c * (t_end / steps) / dx) ** 2
    prev = y0.copy()
    cur = y0.copy()
    cur[1:-1] = y0[1:-1] + 0.5 * C2 * (y0[2:] - 2 * y0[1:-1] + y0[:-2])
    for _ in range(steps - 1):
        nxt = cur.copy()
        nxt[1:-1] = 2 * cur[1:-1] - prev[1:-1] + C2 * (cur[2:] - 2 * cur[1:-1] + cur[:-2])
        prev, cur = cur, nxt
    return cur

xs = np.linspace(0, 0.648, 201)
y = np.where(xs <= 0.13, 0.003 * xs / 0.13, 0.003 * (0.648 - xs) / (0.648 - 0.13))
print(np.abs(simulate_string(y, 106.8, 0.648, 0.001)).max())
```

```python test
import math
import numpy as np
for _n in ["simulate_string"]:
    assert _n in dir(), f"Define {_n}."
_L, _c = 0.648, 106.8
_xs = np.linspace(0, _L, 201)
_mode = 0.002 * np.sin(2 * math.pi * _xs / _L)
_keep = _mode.copy()
_quarter = 1 / (4 * 2 * _c / (2 * _L))
_y = np.asarray(simulate_string(_mode, _c, _L, _quarter))
assert np.array_equal(_mode, _keep), "Do not modify y0."
assert _y.shape == _mode.shape and np.abs(_y[[0, -1]] - _mode[[0, -1]]).max() < 1e-15, "Same shape, ends held at their starting values."
assert np.abs(_y).max() < 2e-5, f"Mode 2 passes through zero after a quarter of its period; largest |y| {np.abs(_y).max():.2e}."
_half = np.asarray(simulate_string(_mode, _c, _L, 2 * _quarter))
assert np.allclose(_half, -_mode, atol=3e-5), "After half its period, mode 2 is upside down."
_p = _L / 5
_tri = np.where(_xs <= _p, 0.003 * _xs / _p, 0.003 * (_L - _xs) / (_L - _p))
_period = 2 * _L / _c
_t = _period / 3
_ref = sum(2 * 0.003 * _L ** 2 / (_n ** 2 * math.pi ** 2 * _p * (_L - _p)) * math.sin(_n * math.pi * _p / _L) * np.sin(_n * math.pi * _xs / _L) * math.cos(_n * math.pi * _c / _L * _t) for _n in range(1, 400))
_s = np.asarray(simulate_string(_tri, _c, _L, _t))
assert np.abs(_s - _ref).max() < 5e-5, f"Plucked string at a third of a period: within 0.05 mm of the mode sum; off by {np.abs(_s - _ref).max():.2e} m."
_exact_c = np.asarray(simulate_string(_tri, _c, _L, _period, courant=1.0))
assert np.abs(_exact_c - _tri).max() < 1e-12, f"With courant = 1 the scheme is exact: one period later it is back at the start (off by {np.abs(_exact_c - _tri).max():.1e})."
assert np.array_equal(np.asarray(simulate_string(_tri, _c, _L, 0)), _tri), "t_end = 0 returns the start."
_short = np.asarray(simulate_string(np.array([0.0, 1.0, 0.0]), 1.0, 2.0, 0.5))
assert np.allclose(_short, [0.0, 0.75, 0.0]), f"One step from rest at (0, 1, 0) with C = 0.5 is 1 + ½(0.25)(−2) = 0.75 in the middle; got {_short}."
for _bad in [dict(courant=1.2), dict(courant=0), dict(c=0), dict(t_end=-1)]:
    _args = dict(y0=_tri, c=_c, length=_L, t_end=0.001)
    _args.update(_bad)
    try:
        simulate_string(**_args)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Leapfrog with C <= 1 vibrates the string correctly, and at C = 1 it moves every wave exactly one grid space per step."
```

Hint: Δx = length/(number of points − 1). The step limit is courant × Δx/c, so `math.ceil(t_end / limit)` steps; use C² = (cΔt/Δx)² with the actual Δt. Keep two arrays, `prev` and `cur`; the first step uses only y⁰ and half the curvature term.
:::

## What you learned

- Tension acting on a curved string gives the wave equation ∂²y/∂t² = c²∂²y/∂x² with wave speed c = √(T/μ); a string fixed at both ends has modes at f_n = nc/(2L), the harmonic series.
- The leapfrog scheme uses second differences in time and space; it is stable only when the Courant number cΔt/Δx is at most 1, and exact for the 1D wave equation when it equals 1.
- Every solution is a right-moving shape plus a left-moving shape; fixed ends reflect pulses upside down, and a round-trip time measures a cable's tension.
- A pluck is a sum of sine modes, b_n ∝ sin(nπp/L)/n²; harmonics with a node at the plucking point are missing, which shapes the tone.
- A spectrum of the motion at one point shows the harmonics, weighted by how much each mode moves there.

The next lesson is the capstone of the first tour: one machine that heats up, vibrates and is measured, using the tools of every thread so far.
