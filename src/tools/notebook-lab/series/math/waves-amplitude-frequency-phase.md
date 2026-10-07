# Waves: amplitude, frequency and phase

The mains supply in a European workshop is "230 volts, 50 hertz", yet the voltage at the socket swings between +325 V and −325 V fifty times a second, and is exactly zero a hundred times a second. A vibrating bearing, a loudspeaker's cone and the current through a motor all trace sine waves too. Describing one takes just three numbers, its **amplitude**, **frequency** and **phase**, and the words engineers use for them (peak, RMS, hertz, lagging current, power factor) all come straight from the mathematics of the sine function. This lesson works with sinusoids as signals: generating and sampling them, measuring their RMS value, comparing phases, adding waves of the same frequency with phasors, hearing beats when frequencies differ slightly, and extracting amplitude and phase from noisy measurements by least squares.

This lesson covers:

- the sinusoid A sin(2πft + φ): amplitude, frequency, period, phase;
- RMS values, and why 230 V means a 325 V peak;
- phase differences, time shifts and the power factor;
- adding sinusoids of one frequency with phasors;
- beats from nearby frequencies;
- measuring amplitude and phase from noisy samples by least squares.

## The sinusoid

::: math
\[ y(t) = A\sin(2\pi f t + \varphi), \qquad T = \frac{1}{f}, \qquad \omega = 2\pi f \]
- $A$: amplitude (peak); $f$: frequency in Hz; $\varphi$: phase at $t = 0$
- sampled at $f_s$ per second, one cycle holds $f_s / f$ samples
In code: `t = np.arange(0, 0.06, 1 / fs)`, then `A * np.sin(2 * math.pi * f * t)`
:::


A sinusoidal signal is

\[ y(t) = A \sin(2\pi f t + \varphi) \]

with **amplitude** A (the peak value), **frequency** f in hertz (cycles per second), **period** T = 1/f, **angular frequency** ω = 2πf in rad/s, and **phase** φ, the angle at t = 0, which shifts the wave in time. This is the rotation of the sine and cosine lesson read against time: a point going round a circle of radius A, f times a second, starting at angle φ.

To work with a signal on a computer it is **sampled**: evaluated at evenly spaced instants, here 10,000 times a second. Predict before running: the mains has a peak of 325 V at 50 Hz. How many samples does one cycle contain, and when does the voltage first cross zero going down?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

fs = 10_000
t = np.arange(0, 0.06, 1 / fs)
A, f = 325.0, 50.0
v = A * np.sin(2 * math.pi * f * t)
print(f"period {1000 / f} ms = {fs // int(f)} samples; ω = {2 * math.pi * f:.1f} rad/s")
down = np.flatnonzero((v[:-1] > 0) & (v[1:] <= 0))
print(f"first downward zero crossing at {t[down[0] + 1] * 1000:.1f} ms; peak {v.max():.1f} V at {t[np.argmax(v)] * 1000:.1f} ms")

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(t * 1000, v)
ax.axhline(A / math.sqrt(2), color="red", linestyle="--", label="230 V (RMS)")
ax.set_xlabel("time (ms)")
ax.set_ylabel("voltage (V)")
ax.legend()
plt.show()
```

```output
period 20.0 ms = 200 samples; ω = 314.2 rad/s
first downward zero crossing at 10.1 ms; peak 325.0 V at 5.0 ms
```

`fs` is the **sampling rate**, samples per second; `np.arange(0, 0.06, 1 / fs)` gives 60 ms of sample times, three cycles.

One cycle lasts 20 ms, 200 samples. The voltage peaks at 325 V at 5 ms, a quarter of a cycle, and crosses zero going down at half a cycle, 10 ms (the first sample below zero is the one at 10.1 ms). The dashed line marks 230 V: the number on the label is not the peak.

## RMS: the effective value

::: math
\[ V_\text{rms} = \sqrt{\overline{v^2}}, \qquad \text{sine: } V_\text{rms} = \frac{A}{\sqrt{2}} \]
- $\sin^2$ averages to $\tfrac{1}{2}$ over a whole cycle
- a square wave's RMS equals its peak; a triangle's is $A/\sqrt{3}$
In code: `rms(x)` is `math.sqrt(np.mean(np.asarray(x) ** 2))`
:::


What makes 325 V peak "230 V"? A heater's power is V²/R, which keeps changing as the voltage swings, so the useful measure is the steady voltage that would deliver the same average power: the **root mean square** (RMS), the square root of the mean of the squares,

\[ V_\text{rms} = \sqrt{\overline{v^2}} \]

For a sinusoid, sin² averages to ½ over a whole cycle (because sin² + cos² = 1 and the two average equally), so V_rms = A/√2: 325/√2 ≈ 230 V. The RMS of other waveforms differs: a square wave's RMS equals its peak. Predict before running: what are the RMS values of a sine, a square and a triangle wave, all with a 1 V peak?

```python type
def rms(x):
    return math.sqrt(np.mean(np.asarray(x) ** 2))

phase = (f * t) % 1
waves = {
    "sine": np.sin(2 * math.pi * f * t),
    "square": np.sign(np.sin(2 * math.pi * f * t)),
    "triangle": 1 - 4 * np.abs(phase - 0.5),
}
for name, w in waves.items():
    print(f"{name:<9} peak {np.abs(w).max():.3f}, RMS {rms(w):.4f}, peak/RMS {np.abs(w).max() / rms(w):.3f}")
print(f"mains RMS from samples: {rms(v):.2f} V (A/√2 = {A / math.sqrt(2):.2f} V)")
print(f"a 26.45 Ω heater: average power {np.mean(v ** 2 / 26.45):.0f} W = V_rms²/R = {rms(v) ** 2 / 26.45:.0f} W")
```

```output
sine      peak 1.000, RMS 0.7071, peak/RMS 1.414
square    peak 1.000, RMS 0.9992, peak/RMS 1.001
triangle  peak 1.000, RMS 0.5774, peak/RMS 1.732
mains RMS from samples: 229.81 V (A/√2 = 229.81 V)
a 26.45 Ω heater: average power 1997 W = V_rms²/R = 1997 W
```

`(f * t) % 1` is the fraction of the cycle completed, which builds the triangle wave; `np.sign(sin)` makes the square wave. The ratio of peak to RMS is the **crest factor**.

The sine's RMS is 0.7071 (1/√2), the square's is 1 (0.9992 here, because the sample at t = 0 is exactly zero) and the triangle's 0.5774 (1/√3). The sampled mains gives 229.81 V, as expected for 325 V peak, and a heater rated 2 kW at 230 V draws its average power of about 1,997 W. Measurements taken over whole cycles get RMS right; over part of a cycle they do not, which is why meters average over many cycles.

## Phase and time shift

::: math
\[ \Delta t = \frac{\Delta\varphi}{2\pi f}, \qquad P = V_\text{rms}\,I_\text{rms}\cos\Delta\varphi \]
- current lagging by $\Delta\varphi$ peaks $\Delta t$ later
- $\cos\Delta\varphi$: the power factor; at $90°$ no average power flows
In code: `np.mean(v * i)` against `230 * I_rms * math.cos(math.radians(lag_deg))`
:::


Two sinusoids of the same frequency can be shifted relative to each other. A phase difference Δφ corresponds to a time shift Δt = Δφ/(2πf): at 50 Hz, a quarter cycle (90°) is 5 ms. In a motor or transformer the current **lags** the voltage: it peaks later. Phase difference has a direct cost. The average power delivered is

\[ P = V_\text{rms} I_\text{rms} \cos\Delta\varphi \]

and cos Δφ is the **power factor**. With current lagging by 90° no average power flows at all, though large currents circulate and heat the cables. Predict before running: a motor draws 10 A RMS lagging the voltage by 37°. What power does it take, and what does the time shift look like?

```python type
I_rms, lag_deg = 10.0, 37.0
i = I_rms * math.sqrt(2) * np.sin(2 * math.pi * f * t - math.radians(lag_deg))
shift_ms = lag_deg / 360 / f * 1000
print(f"phase lag {lag_deg}° = {shift_ms:.2f} ms behind the voltage")
print(f"average power from samples: {np.mean(v * i):.0f} W; formula V_rms I_rms cos φ = {230 * I_rms * math.cos(math.radians(lag_deg)):.0f} W")
print(f"apparent power V_rms I_rms = {rms(v) * rms(i):.0f} VA, power factor {np.mean(v * i) / (rms(v) * rms(i)):.3f}")

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(t * 1000, v, label="voltage (V)")
ax.plot(t * 1000, i * 20, label="current (A × 20)")
ax.set_xlim(0, 40)
ax.set_xlabel("time (ms)")
ax.legend()
plt.show()
```

```output
phase lag 37.0° = 2.06 ms behind the voltage
average power from samples: 1835 W; formula V_rms I_rms cos φ = 1837 W
apparent power V_rms I_rms = 2298 VA, power factor 0.799
```

The current is scaled by 20 on the plot only so the two waves are easy to compare.

The current peaks 2.06 ms after the voltage. The real power is about 1,835 W while the apparent power, the product of the RMS values, is about 2,300 VA: a power factor of 0.80, which is cos 37°. Industrial sites pay penalties for low power factor and correct it with capacitors that shift the current back towards the voltage.

## Adding waves of one frequency: phasors

::: math
\[ \sum_k A_k\sin(\omega t + \varphi_k) = A\sin(\omega t + \varphi), \qquad A\,(\cos\varphi, \sin\varphi) = \sum_k A_k\,(\cos\varphi_k, \sin\varphi_k) \]
- each sinusoid is a phasor: an arrow of length $A_k$ at angle $\varphi_k$
- same frequency: add the arrows as vectors
In code: `total_vec = sum(a * np.array([cos, sin]) ...)`, then `np.hypot` and `math.atan2`
:::


Adding two sinusoids of the **same** frequency always gives another sinusoid of that frequency, with a new amplitude and phase. Finding them by trigonometric identities is painful; the rotation picture makes it easy. Each sinusoid A sin(ωt + φ) is the shadow of a rotating arrow of length A at angle φ, a **phasor**; all rotate together at ω, so their sum is the shadow of the **vector sum** of the arrows, from the vectors lesson. Two vibration sources of equal strength can reinforce each other or cancel completely, depending on their phases. Predict before running: two 3 mm/s vibrations 120° apart, plus a 2 mm/s one at 240°: what is the total?

```python type
components = [(3.0, 0.0), (3.0, 120.0), (2.0, 240.0)]
total_vec = sum(a * np.array([math.cos(math.radians(p)), math.sin(math.radians(p))]) for a, p in components)
amp, ph = np.hypot(*total_vec), math.degrees(math.atan2(total_vec[1], total_vec[0]))
summed = sum(a * np.sin(2 * math.pi * f * t + math.radians(p)) for a, p in components)
predicted = amp * np.sin(2 * math.pi * f * t + math.radians(ph))
print(f"phasor sum: amplitude {amp:.4f}, phase {ph:.2f}°")
print("largest difference between the summed signal and the predicted sinusoid:", f"{np.abs(summed - predicted).max():.1e}")
for p2 in [0, 90, 180]:
    two = 3 * np.sin(2 * math.pi * f * t) + 3 * np.sin(2 * math.pi * f * t + math.radians(p2))
    print(f"two 3 mm/s waves {p2:>3}° apart: amplitude {np.abs(two).max():.3f}")
```

```output
phasor sum: amplitude 1.0000, phase 60.00°
largest difference between the summed signal and the predicted sinusoid: 6.9e-15
two 3 mm/s waves   0° apart: amplitude 6.000
two 3 mm/s waves  90° apart: amplitude 4.243
two 3 mm/s waves 180° apart: amplitude 0.000
```

Each phasor is a 2D vector of length A at angle φ; their sum's length and angle are the amplitude and phase of the summed wave.

The three components add to an amplitude of 1.0 at 60°, smaller than any of them, because they point in different directions. Two equal waves give 6 in phase, 3√2 ≈ 4.24 at 90°, and zero at 180°: complete cancellation, the principle of noise-cancelling headphones and of balancing rotating machinery.

## Beats

::: math
\[ \sin a + \sin b = 2\sin\frac{a + b}{2}\cos\frac{a - b}{2}, \qquad f_\text{beat} = |f_2 - f_1| \]
- a fast wave at the average frequency inside a slow envelope
- envelope $2\,|\cos(\pi(f_2 - f_1)t)|$: loud moments every $1/|f_2 - f_1|$ seconds
In code: `envelope = 2 * np.abs(np.cos(math.pi * (f2 - f1) * tb))`
:::


Waves of slightly **different** frequencies do not settle into one sinusoid. They drift in and out of phase, so their sum swells and fades: **beats**, at a rate equal to the difference of the frequencies. Two machines nominally at the same speed but actually 50.0 Hz and 51.5 Hz make the floor throb 1.5 times a second, a common clue in vibration troubleshooting. Mathematically, sin a + sin b = 2 sin((a + b)/2) cos((a − b)/2): a fast wave at the average frequency, inside a slow envelope. Predict before running: how far apart are the loud moments?

```python type
tb = np.arange(0, 2.0, 1 / fs)
f1, f2 = 50.0, 51.5
beat = np.sin(2 * math.pi * f1 * tb) + np.sin(2 * math.pi * f2 * tb)
envelope = 2 * np.abs(np.cos(math.pi * (f2 - f1) * tb))
peaks = [tb[0]] + [tb[k] for k in range(1, len(tb) - 1) if envelope[k] >= envelope[k - 1] and envelope[k] > envelope[k + 1]]
print(f"envelope maxima at {np.round(peaks, 3)} s -> spacing {np.diff(peaks).mean():.4f} s = 1/{f2 - f1} Hz")
fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(tb, beat, linewidth=0.5)
ax.plot(tb, envelope, "r--")
ax.set_xlabel("time (s)")
plt.show()
```

```output
envelope maxima at [0.    0.667 1.333] s -> spacing 0.6667 s = 1/1.5 Hz
```

The envelope 2|cos(π(f₂ − f₁)t)| is the slow factor of the identity; its maxima are the loud moments.

The loud moments come every 0.667 s, 1/1.5 Hz, matching the frequency difference. The beat rate tells a technician the speed difference between two machines without touching either one.

## Measuring a sinusoid from noisy samples

::: math
\[ A\sin(\omega t + \varphi) = a\sin\omega t + b\cos\omega t, \qquad a = A\cos\varphi, \;\; b = A\sin\varphi \]
- linear in $a$ and $b$, so least squares fits them
- then $A = \sqrt{a^2 + b^2}$ and $\varphi = \operatorname{atan2}(b, a)$
In code: `X = np.column_stack([np.ones_like(ts), sin, cos])`, then `np.linalg.lstsq(X, noisy, rcond=None)`
:::


Given noisy samples of a signal at a known frequency, what are its amplitude and phase? Expanding A sin(ωt + φ) = (A cos φ) sin ωt + (A sin φ) cos ωt shows it is a combination of sin ωt and cos ωt with coefficients a = A cos φ and b = A sin φ. That is **linear** in a and b, so least squares fits them directly with a design matrix of columns [1, sin ωt, cos ωt] (the 1 for any offset), as in the line-fitting lesson; then A = √(a² + b²) and φ = atan2(b, a). Predict before running: from 300 noisy samples of the motor current, how close are the estimates to 14.14 A and −37°?

```python type
rng = np.random.default_rng(38)
ts = np.sort(rng.uniform(0, 0.04, 300))
true = 14.142 * np.sin(2 * math.pi * 50 * ts - math.radians(37)) + 0.3
noisy = true + rng.normal(0, 1.0, ts.size)
X = np.column_stack([np.ones_like(ts), np.sin(2 * math.pi * 50 * ts), np.cos(2 * math.pi * 50 * ts)])
(offset, a, b), *_ = np.linalg.lstsq(X, noisy, rcond=None)
print(f"offset {offset:.3f} A, amplitude {math.hypot(a, b):.3f} A, phase {math.degrees(math.atan2(b, a)):.2f}°")
```

```output
offset 0.298 A, amplitude 14.023 A, phase -36.42°
```

The samples are taken at random times, as from an unsynchronised logger; least squares does not need them evenly spaced.

Despite noise of 1 A on every sample, the fit recovers the amplitude and phase to within a fraction of an ampere and about a degree, and finds the small 0.3 A offset. This is how power analysers and vibration analysers measure magnitude and phase: by fitting, which averages the noise over hundreds of samples.

::: challenge Sinusoids and RMS [easy]
Write `sinusoid(t, amplitude, freq, phase_deg=0.0, offset=0.0)` returning offset + A sin(2πft + φ) for a number or an array of times (φ in degrees). Write `rms(samples)` as a plain float, raising `ValueError` for an empty input. Then write `peak_from_rms(v_rms)`, the peak of a sinusoid with that RMS value, and `time_shift_ms(phase_deg, freq)`, the time shift in milliseconds corresponding to a phase difference at a frequency (raise `ValueError` if the frequency is not positive).

```python starter
def sinusoid(t, amplitude, freq, phase_deg=0.0, offset=0.0):
    return np.zeros_like(np.asarray(t, dtype=float))

def rms(samples):
    return 0.0

def peak_from_rms(v_rms):
    return v_rms

def time_shift_ms(phase_deg, freq):
    return 0.0

print(peak_from_rms(230), time_shift_ms(90, 50))
```

```python solution
def sinusoid(t, amplitude, freq, phase_deg=0.0, offset=0.0):
    return offset + amplitude * np.sin(2 * math.pi * freq * np.asarray(t, dtype=float) + math.radians(phase_deg))

def rms(samples):
    x = np.asarray(samples, dtype=float)
    if x.size == 0:
        raise ValueError("no samples")
    return float(math.sqrt(np.mean(x ** 2)))

def peak_from_rms(v_rms):
    return v_rms * math.sqrt(2)

def time_shift_ms(phase_deg, freq):
    if freq <= 0:
        raise ValueError("frequency must be positive")
    return phase_deg / 360 / freq * 1000

print(peak_from_rms(230), time_shift_ms(90, 50))
```

```python test
for _n in ["sinusoid", "rms", "peak_from_rms", "time_shift_ms"]:
    assert _n in dir(), f"Define {_n}."
_t = np.arange(0, 0.02, 1e-4)
assert np.allclose(sinusoid(_t, 2, 50), 2 * np.sin(2 * math.pi * 50 * _t)) and abs(float(sinusoid(0.005, 1, 50)) - 1) < 1e-12, "Peak at a quarter period."
assert abs(float(sinusoid(0, 3, 50, 90, 1)) - 4) < 1e-12, "A 90° phase starts at the peak; the offset adds."
assert abs(rms(sinusoid(_t, 325, 50)) - 325 / math.sqrt(2)) < 1e-9 and type(rms([1, -1])) is float, "RMS of a whole number of cycles."
assert rms([3, -4, 0, 0]) == 2.5 and rms([5]) == 5.0, "Root of the mean square."
try:
    rms([])
    assert False, "No samples should raise ValueError."
except ValueError:
    pass
assert abs(peak_from_rms(230) - 325.27) < 0.01, "230 V RMS is about 325 V peak."
assert time_shift_ms(90, 50) == 5.0 and abs(time_shift_ms(37, 50) - 2.0556) < 1e-4 and time_shift_ms(360, 60) == 1000 / 60, "Phase to time."
try:
    time_shift_ms(90, 0)
    assert False, "Zero frequency should raise ValueError."
except ValueError:
    pass
"SUCCESS: Amplitude, frequency and phase build the wave; RMS = peak/√2 is the number on the label; a phase is a time shift."
```

Hint: Convert the phase to radians inside `sinusoid`. RMS is the square root of the mean of the squares. A full cycle (360°) lasts 1/f seconds.
:::

::: challenge Fitting amplitude and phase [medium]
Write `fit_sinusoid(t, y, freq)` that fits y ≈ offset + A sin(2πft + φ) by linear least squares with columns [1, sin, cos] (as in the lesson), returning `(offset, amplitude, phase_deg)` as plain floats with the phase in (−180, 180]. Raise `ValueError` if there are fewer than 3 samples, the lengths differ, or the frequency is not positive. Then write `power_factor(t, v, i, freq)`: fit both signals and return cos(φ_v − φ_i), rounded to 4 decimal places, and `real_power(v, i)`: the mean of v × i from the samples, as a plain float.

```python starter
def fit_sinusoid(t, y, freq):
    return (0.0, float(np.max(np.abs(y))), 0.0)

def power_factor(t, v, i, freq):
    return 1.0

def real_power(v, i):
    return 0.0

ts = np.linspace(0, 0.04, 400, endpoint=False)
print(fit_sinusoid(ts, 5 * np.sin(2 * math.pi * 50 * ts + 0.5) + 1, 50))
```

```python solution
def fit_sinusoid(t, y, freq):
    t, y = np.asarray(t, dtype=float), np.asarray(y, dtype=float)
    if len(t) != len(y) or len(t) < 3 or freq <= 0:
        raise ValueError("need at least 3 matching samples and a positive frequency")
    w = 2 * math.pi * freq
    X = np.column_stack([np.ones_like(t), np.sin(w * t), np.cos(w * t)])
    (offset, a, b), *_ = np.linalg.lstsq(X, y, rcond=None)
    phase = math.degrees(math.atan2(b, a))
    if phase <= -180:
        phase += 360
    return (float(offset), float(math.hypot(a, b)), float(phase))

def power_factor(t, v, i, freq):
    _, _, pv = fit_sinusoid(t, v, freq)
    _, _, pi_ = fit_sinusoid(t, i, freq)
    return round(math.cos(math.radians(pv - pi_)), 4)

def real_power(v, i):
    return float(np.mean(np.asarray(v, dtype=float) * np.asarray(i, dtype=float)))

ts = np.linspace(0, 0.04, 400, endpoint=False)
print(fit_sinusoid(ts, 5 * np.sin(2 * math.pi * 50 * ts + 0.5) + 1, 50))
```

```python test
for _n in ["fit_sinusoid", "power_factor", "real_power"]:
    assert _n in dir(), f"Define {_n}."
_t = np.linspace(0, 0.04, 400, endpoint=False)
_o, _a, _p = fit_sinusoid(_t, 5 * np.sin(2 * math.pi * 50 * _t + 0.5) + 1, 50)
assert abs(_o - 1) < 1e-9 and abs(_a - 5) < 1e-9 and abs(_p - math.degrees(0.5)) < 1e-7 and type(_a) is float, f"Got {(_o, _a, _p)}."
_o, _a, _p = fit_sinusoid(_t, 2 * np.sin(2 * math.pi * 50 * _t - math.radians(150)), 50)
assert abs(_p + 150) < 1e-7, "Negative phases."
assert abs(abs(fit_sinusoid(_t, -3 * np.sin(2 * math.pi * 50 * _t), 50)[2]) - 180) < 1e-7, "A sign flip is a 180° phase."
_rng = np.random.default_rng(381)
_tr = np.sort(_rng.uniform(0, 0.1, 500))
_yr = 7 * np.sin(2 * math.pi * 60 * _tr + 1.0) + _rng.normal(0, 0.5, _tr.size)
_o, _a, _p = fit_sinusoid(_tr, _yr, 60)
assert abs(_a - 7) < 0.1 and abs(_p - math.degrees(1.0)) < 1.5, f"Noisy, unevenly spaced samples; got {(_a, _p)}."
for _bad in [([0, 1], [0, 1], 50), ([0, 1, 2], [0, 1], 50), (_t, _t, 0)]:
    try:
        fit_sinusoid(*_bad)
        assert False, "Bad input should raise ValueError."
    except ValueError:
        pass
_v = 325 * np.sin(2 * math.pi * 50 * _t)
_i = 14.142 * np.sin(2 * math.pi * 50 * _t - math.radians(37))
assert power_factor(_t, _v, _i, 50) == round(math.cos(math.radians(37)), 4), "cos 37° ≈ 0.7986."
assert abs(real_power(_v, _i) - 325 / math.sqrt(2) * 10 * math.cos(math.radians(37))) < 1 and type(real_power(_v, _i)) is float, "Mean of v × i."
"SUCCESS: A sinusoid of known frequency is linear in its sine and cosine coefficients, so least squares measures its amplitude and phase through the noise."
```

Hint: Build `X = [1, sin ωt, cos ωt]` and solve with `np.linalg.lstsq`. With coefficients a (sine) and b (cosine), the amplitude is √(a² + b²) and the phase `atan2(b, a)`.
:::

::: challenge Phasor arithmetic [hard]
Write `phasor_sum(components)` for a list of `(amplitude, phase_deg)` sinusoids of the same frequency: return `(amplitude, phase_deg)` of their sum, the amplitude rounded to 6 decimal places and the phase in (−180, 180] rounded to 4 decimal places; if the amplitude rounds to 0, return `(0.0, 0.0)`. Raise `ValueError` for an empty list or a negative amplitude. Then write `cancelling_component(components)`: the single `(amplitude, phase_deg)` that would cancel the sum exactly (same amplitude, opposite phase), in the same format, as used to balance a rotor. Finally write `balance_check(components, freq, t)`: evaluate the sum of all the components **plus** the cancelling one at the times t and return the largest absolute value, as a plain float (it should be tiny).

```python starter
def phasor_sum(components):
    return (sum(a for a, _ in components), 0.0)

def cancelling_component(components):
    return (0.0, 0.0)

def balance_check(components, freq, t):
    return 0.0

print(phasor_sum([(3, 0), (3, 120), (2, 240)]))
```

```python solution
def _wrap(deg):
    d = deg % 360
    return d - 360 if d > 180 else d

def phasor_sum(components):
    if not components or any(a < 0 for a, _ in components):
        raise ValueError("need components with non-negative amplitudes")
    x = sum(a * math.cos(math.radians(p)) for a, p in components)
    y = sum(a * math.sin(math.radians(p)) for a, p in components)
    amp = round(math.hypot(x, y), 6)
    if amp == 0:
        return (0.0, 0.0)
    return (amp, round(_wrap(math.degrees(math.atan2(y, x))), 4))

def cancelling_component(components):
    amp, ph = phasor_sum(components)
    if amp == 0:
        return (0.0, 0.0)
    return (amp, round(_wrap(ph + 180), 4))

def balance_check(components, freq, t):
    t = np.asarray(t, dtype=float)
    total = sum(a * np.sin(2 * math.pi * freq * t + math.radians(p)) for a, p in list(components) + [cancelling_component(components)])
    return float(np.abs(total).max())

print(phasor_sum([(3, 0), (3, 120), (2, 240)]))
```

```python test
for _n in ["phasor_sum", "cancelling_component", "balance_check"]:
    assert _n in dir(), f"Define {_n}."
assert phasor_sum([(3, 0), (3, 120), (2, 240)]) == (1.0, 60.0), f"The lesson's sum; got {phasor_sum([(3, 0), (3, 120), (2, 240)])}."
assert phasor_sum([(3, 0), (3, 90)]) == (round(3 * math.sqrt(2), 6), 45.0) and phasor_sum([(3, 0), (3, 180)]) == (0.0, 0.0), "Quadrature and cancellation."
assert phasor_sum([(1, 170), (1, -170)]) == (round(2 * math.cos(math.radians(10)), 6), 180.0), "Phase wraps to +180."
assert phasor_sum([(5, -30)]) == (5.0, -30.0), "A single component."
for _bad in [[], [(1, 0), (-2, 30)]]:
    try:
        phasor_sum(_bad)
        assert False, f"phasor_sum({_bad}) should raise ValueError."
    except ValueError:
        pass
assert cancelling_component([(3, 0), (3, 120), (2, 240)]) == (1.0, -120.0) and cancelling_component([(4, 0), (4, 180)]) == (0.0, 0.0), "Opposite phase, same size."
_t = np.linspace(0, 0.1, 2001)
_c = [(2.5, 10), (1.2, 200), (0.7, -75)]
_x = sum(_a * np.sin(2 * math.pi * 25 * _t + math.radians(_p)) for _a, _p in _c)
_amp, _ph = phasor_sum(_c)
assert np.abs(_x - _amp * np.sin(2 * math.pi * 25 * _t + math.radians(_ph))).max() < 1e-5, "The sum really is that single sinusoid."
assert balance_check(_c, 25, _t) < 1e-5 and type(balance_check(_c, 25, _t)) is float, "Adding the cancelling component leaves (almost) nothing."
"SUCCESS: Same-frequency waves add like vectors; the opposite vector cancels them, which is exactly how a rotor is balanced."
```

Hint: Convert each component to a vector (A cos φ, A sin φ), add them, and convert back with `hypot` and `atan2`. The cancelling component points the opposite way: add 180° and wrap.
:::

## What you learned

- A sinusoid A sin(2πft + φ) has amplitude, frequency (period 1/f, angular frequency 2πf) and phase; sampling evaluates it at evenly spaced times.
- RMS is the square root of the mean square; for a sine it is the peak divided by √2, so 230 V mains peaks at 325 V.
- A phase difference is a time shift Δφ/(2πf); average power is V_rms I_rms cos Δφ, and cos Δφ is the power factor.
- Sinusoids of one frequency add as phasors (vectors), reinforcing or cancelling; slightly different frequencies beat at their difference frequency.
- Amplitude and phase of a known-frequency signal come from a linear least-squares fit on sin and cos columns, even through heavy noise.

The next lesson builds more complicated waveforms, such as square waves, from sums of sines.
