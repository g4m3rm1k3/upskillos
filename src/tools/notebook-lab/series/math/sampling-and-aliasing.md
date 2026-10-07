# Sampling and aliasing

In old films, a stagecoach speeds up and its wheels appear to slow, stop, and spin backwards. A strobe light flashed at the right rate makes a spinning fan look frozen, so a technician can read its speed off the dial. A temperature logger that records once a minute sees a heater cycling every 59 seconds as a slow wave with an hour-long period that does not exist. All three are the same effect: **sampling** a signal at discrete instants loses everything that happens between samples, and fast changes masquerade as slow ones. The spectrum lesson introduced aliasing. This lesson makes sampling precise: the sampling theorem and perfect reconstruction, the wagon-wheel and strobe effects, why digital systems filter **before** they downsample, and the second half of digitising a signal, quantisation, which sets how finely each sample is measured.

This lesson covers:

- signed aliasing: apparent frequencies that can run backwards;
- the wagon-wheel effect and the stroboscope;
- the sampling theorem, and rebuilding a signal from its samples;
- downsampling, and why naive decimation aliases noise;
- quantisation: bits, resolution and quantisation noise.

## Apparent frequencies, forwards and backwards

::: math
\[ f_\text{apparent} = f - f_s \cdot \operatorname{round}\!\left(\frac{f}{f_s}\right) \in \left(-\frac{f_s}{2}, \frac{f_s}{2}\right] \]
- $f$, $f + f_s$, $f + 2f_s, \dots$ give identical samples
- a negative apparent frequency looks like rotation backwards
In code: `apparent(f, fs)` computes `f - fs * math.floor(f / fs + 0.5)`
:::


Sampling at rate f_s cannot distinguish a frequency f from f + f_s, f + 2f_s and so on: their samples are identical. For rotation, direction matters, so it is natural to fold f into the interval (−f_s/2, f_s/2]: the **apparent frequency** is f minus the nearest whole multiple of f_s. A negative apparent frequency means apparent rotation **backwards**. This is the signed version of the spectrum lesson's folding. Predict before running: a point on a disc spins at 23 revolutions per second and is photographed at 24 frames per second. Which way does it appear to turn, and how fast?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

def apparent(f, fs):
    a = f - fs * math.floor(f / fs + 0.5)
    return a + fs if a <= -fs / 2 else a

fs = 24.0
for f in [5, 11, 12, 13, 23, 24, 25, 47]:
    a = apparent(f, fs)
    direction = "forwards" if a > 0 else "backwards" if a < 0 else "frozen"
    print(f"true {f:>2} rev/s at {fs:.0f} frames/s -> appears {a:+.0f} rev/s ({direction})")

frames = np.arange(12)
angles = (360 * 23 * frames / fs) % 360
print("angle in successive frames:", np.round(angles).astype(int), "degrees")
```

```output
true  5 rev/s at 24 frames/s -> appears +5 rev/s (forwards)
true 11 rev/s at 24 frames/s -> appears +11 rev/s (forwards)
true 12 rev/s at 24 frames/s -> appears +12 rev/s (forwards)
true 13 rev/s at 24 frames/s -> appears -11 rev/s (backwards)
true 23 rev/s at 24 frames/s -> appears -1 rev/s (backwards)
true 24 rev/s at 24 frames/s -> appears +0 rev/s (frozen)
true 25 rev/s at 24 frames/s -> appears +1 rev/s (forwards)
true 47 rev/s at 24 frames/s -> appears -1 rev/s (backwards)
angle in successive frames: [  0 345 330 315 300 285 270 255 240 225 210 195] degrees
```

Each frame catches the point 345° further round, which looks exactly like 15° backwards.

At 23 rev/s the disc appears to turn backwards at 1 rev/s: each frame it has gone almost a full turn, so it looks as if it moved a little the wrong way. At exactly 24 rev/s it appears frozen, at 25 it creeps forwards at 1 rev/s, and 47 rev/s looks the same as −1. At 12 rev/s, exactly half the frame rate, the direction is ambiguous; the convention here calls it forwards.

## Wagon wheels and strobes

::: math
\[ f_\text{spoke} = S \cdot f_\text{rev}, \qquad f_\text{rev} = \frac{v}{\pi D}, \qquad \text{apparent rotation} = \frac{f_\text{apparent}(S f_\text{rev},\, \text{fps})}{S} \]
- $S$ identical spokes look the same after $1/S$ of a turn
- frozen whenever $S f_\text{rev}$ is a whole multiple of the frame rate
In code: `wheel_apparent_rev_per_s(speed_kmh)` with `rev = speed_kmh / 3.6 / circ`
:::


A wheel with S identical spokes looks the same after 1/S of a turn, so what the camera samples is the **spoke-passing frequency**, S times the rotation rate, not the rotation itself. That is why film wheels misbehave at modest speeds. The same trick is useful: a **stroboscope** flashing at exactly the spoke-passing frequency (or the rotation frequency, for a single mark) freezes the image, and the flash rate then gives the speed. Predict before running: a 12-spoke wheel on a film at 24 frames per second. At what road speeds does it look frozen, and how does it look at 50 km/h?

```python type
spokes, fps, wheel_diameter = 12, 24.0, 0.7
circ = math.pi * wheel_diameter

def wheel_apparent_rev_per_s(speed_kmh):
    rev = speed_kmh / 3.6 / circ
    return apparent(rev * spokes, fps) / spokes

for kmh in [10, 15, 20, 30, 50, 63.33]:
    rev = kmh / 3.6 / circ
    print(f"{kmh:>6} km/h: true {rev:5.2f} rev/s, appears {wheel_apparent_rev_per_s(kmh):+.3f} rev/s")
frozen = [round(n * fps / spokes * circ * 3.6, 2) for n in range(1, 5)]
print("looks frozen at", frozen, "km/h")
```

```output
    10 km/h: true  1.26 rev/s, appears -0.737 rev/s
    15 km/h: true  1.89 rev/s, appears -0.105 rev/s
    20 km/h: true  2.53 rev/s, appears +0.526 rev/s
    30 km/h: true  3.79 rev/s, appears -0.211 rev/s
    50 km/h: true  6.32 rev/s, appears +0.316 rev/s
 63.33 km/h: true  8.00 rev/s, appears -0.001 rev/s
looks frozen at [15.83, 31.67, 47.5, 63.33] km/h
```

The apparent spoke frequency, divided by the number of spokes, is the apparent rotation rate.

The wheel looks frozen whenever the spokes advance exactly one spoke-gap (or a whole number of them) per frame: at about 15.8, 31.7, 47.5 and 63.3 km/h. Just below each of those it seems to roll slowly backwards; at 50 km/h, just above 47.5, it creeps forwards slowly. The real wheel turns 6.3 times a second, but no camera at 24 frames per second can show that.

## The sampling theorem and reconstruction

::: math
\[ x(t) = \sum_n x[n]\,\operatorname{sinc}\big(f_s t - n\big), \qquad \operatorname{sinc}(u) = \frac{\sin \pi u}{\pi u} \]
- exact when the signal has no frequencies at or above $f_s/2$ (the sampling theorem)
- each sinc is 1 at its own sample and 0 at every other one
In code: `reconstruct(samples, fs, t)` sums `samples * np.sinc(fs * t - n)`
:::


Aliasing sounds like a disaster, but the **sampling theorem** (Nyquist, Shannon) gives the precise condition for safety: if a signal contains no frequencies at or above f_s/2, its samples determine it **completely**, including every value between them. The reconstruction formula adds a **sinc** pulse, sinc(x) = sin(πx)/(πx), centred on each sample and scaled by it:

\[ x(t) = \sum_n x[n] \,\text{sinc}\big(f_s (t - n/f_s)\big) \]

Each sinc is 1 at its own sample time and 0 at every other one, so the sum passes through every sample, and between samples it fills in the unique band-limited curve. NumPy's `np.sinc` is exactly this normalised sinc. Predict before running: from 40 samples per second of a signal containing 3 Hz and 11 Hz, how accurately can the value between samples be rebuilt?

```python type
fs = 40.0
n = np.arange(400)
t_s = n / fs
true = lambda t: np.sin(2 * math.pi * 3 * t) + 0.5 * np.cos(2 * math.pi * 11 * t + 0.4)
samples = true(t_s)

def reconstruct(samples, fs, t):
    t = np.atleast_1d(t)
    return (samples[None, :] * np.sinc(fs * t[:, None] - np.arange(len(samples))[None, :])).sum(axis=1)

t_fine = np.linspace(4.0, 6.0, 801)
rebuilt = reconstruct(samples, fs, t_fine)
print(f"largest error between samples (middle of the record): {np.abs(rebuilt - true(t_fine)).max():.4f}")
lin = np.interp(t_fine, t_s, samples)
print(f"straight-line interpolation error: {np.abs(lin - true(t_fine)).max():.4f}")

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(t_fine, true(t_fine), "k", linewidth=0.8, label="true signal")
ax.plot(t_fine, rebuilt, "--", label="sinc reconstruction")
ax.plot(t_s[(t_s >= 4) & (t_s <= 6)], samples[(t_s >= 4) & (t_s <= 6)], "o", markersize=3, label="samples")
ax.set_xlabel("time (s)")
ax.legend(fontsize=8)
plt.show()
```

```output
largest error between samples (middle of the record): 0.0007
straight-line interpolation error: 0.2005
```

The broadcast builds one row per output time and one column per sample, multiplies by the samples and sums. The record is 10 s long and the check uses the middle 2 s, because the formula assumes samples continue forever.

Away from the ends of the record, sinc reconstruction rebuilds the signal between samples with an error of under 0.001, set by the finite length of the record, while straight-line interpolation is off by about 0.2: at 11 Hz there are fewer than four samples per cycle, and joining them with straight lines cuts the peaks. The samples really did contain everything, because both frequencies are below 20 Hz, half the sampling rate.

## Downsampling: filter first

::: math
\[ y[m] = \frac{1}{M}\sum_{j=0}^{M-1} x[mM + j] \qquad (\text{keep 1 rate in } M) \]
- picking every $M$-th sample lets everything above the new Nyquist frequency fold down
- averaging each block first weakens those frequencies
In code: `x[::factor]` against `x[: len(x) // factor * factor].reshape(-1, factor).mean(axis=1)`
:::


Data systems often sample fast and then reduce the rate to save storage: **downsampling** or **decimation**. Keeping every 10th sample of a 1 kHz signal gives 100 Hz, but anything between 50 and 500 Hz in the original then aliases into the new 0–50 Hz band. The fix is to **low-pass filter first**: even simply averaging each block of 10 samples, rather than picking one, reduces the high frequencies before they can fold down. Block averaging is only a weak low-pass filter, though: it removes some frequencies almost completely (multiples of 100 Hz here) but still passes about half the amplitude just above the new Nyquist frequency, which is why real decimators use proper filters. Predict before running: a 2 Hz temperature trend with 470 Hz electrical interference, logged at 1 kHz and reduced to 100 Hz. Where does the interference end up?

```python type
fs, factor = 1000, 10
t = np.arange(0, 2, 1 / fs)
trend = np.sin(2 * math.pi * 2 * t)
x = trend + 0.5 * np.sin(2 * math.pi * 470 * t)

naive = x[::factor]
averaged = x[: len(x) // factor * factor].reshape(-1, factor).mean(axis=1)
t_naive = t[::factor]
t_avg = t[: len(x) // factor * factor].reshape(-1, factor).mean(axis=1)
print(f"470 Hz aliases at 100 Hz sampling to {abs(apparent(470, 100)):.0f} Hz")
print(f"error against the trend: naive {np.abs(naive - np.sin(2 * math.pi * 2 * t_naive)).max():.3f}, block-averaged {np.abs(averaged - np.sin(2 * math.pi * 2 * t_avg)).max():.3f}")
amps = 2 * np.abs(np.fft.rfft(naive)) / len(naive)
freqs = np.fft.rfftfreq(len(naive), 1 / 100)
print("peaks in the naive record (Hz, amplitude):", [(float(freqs[k]), round(float(amps[k]), 3)) for k in range(1, len(amps)) if amps[k] > 0.1])
```

```output
470 Hz aliases at 100 Hz sampling to 30 Hz
error against the trend: naive 0.476, block-averaged 0.040
peaks in the naive record (Hz, amplitude): [(2.0, 1.0), (30.0, 0.5)]
```

`reshape(-1, factor).mean(axis=1)` averages each block of 10 consecutive samples; the time of each block is its centre.

Naive decimation turns the 470 Hz interference into a fake 30 Hz wave of the full 0.5 amplitude, sitting beside the real 2 Hz trend and indistinguishable from a real signal. Averaging blocks of 10 reduces the error from about 0.48 to about 0.04, helped by 470 Hz lying close to one of the averaging's blind spots. A proper digital low-pass filter would do better still; every downsampling routine in signal-processing libraries (such as `scipy.signal.decimate`) filters first.

## Quantisation

::: math
\[ \Delta = \frac{R}{2^N}, \qquad \text{noise RMS} = \frac{\Delta}{\sqrt{12}}, \qquad \text{SNR} \approx 6.02\,N + 1.76 \text{ dB} \]
- $N$: number of bits; $R$: full-scale range
- each extra bit halves the step and adds about 6 dB
In code: `quantise(x, bits, full_scale)` returns `np.round(x / step) * step`
:::


Sampling discretises time; an analogue-to-digital converter (ADC) also discretises each **value**, rounding it to one of 2ᴺ levels for an N-bit converter. Over a full-scale range R the step is Δ = R/2ᴺ. The rounding error is spread evenly over ±Δ/2, so it behaves like added noise with RMS Δ/√12 (the uniform distribution's standard deviation). For a full-scale sine wave, the ratio of signal power to quantisation noise is about 6.02N + 1.76 dB: each extra bit buys 6 dB, a factor of 2 in amplitude. Predict before running: how many bits does a 10 V sensor input need to resolve 1 mV?

```python type
def quantise(x, bits, full_scale):
    step = full_scale / 2 ** bits
    return np.round(x / step) * step

t = np.arange(0, 1, 1 / 10000)
sine = 5 * np.sin(2 * math.pi * 7 * t)
for bits in [8, 12, 16]:
    q = quantise(sine, bits, 10.0)
    err = q - sine
    sqnr = 10 * math.log10(np.mean(sine ** 2) / np.mean(err ** 2))
    print(f"{bits:>2} bits: step {10 / 2 ** bits * 1000:7.3f} mV, error RMS {np.sqrt(np.mean(err ** 2)) * 1000:7.4f} mV (Δ/√12 = {10 / 2 ** bits / math.sqrt(12) * 1000:7.4f}), SQNR {sqnr:5.1f} dB (theory {6.02 * bits + 1.76:5.1f})")
print("bits for a 1 mV step over 10 V:", math.ceil(math.log2(10 / 0.001)))
```

```output
 8 bits: step  39.062 mV, error RMS 11.1560 mV (Δ/√12 = 11.2764), SQNR  50.0 dB (theory  49.9)
12 bits: step   2.441 mV, error RMS  0.7118 mV (Δ/√12 =  0.7048), SQNR  73.9 dB (theory  74.0)
16 bits: step   0.153 mV, error RMS  0.0439 mV (Δ/√12 =  0.0440), SQNR  98.1 dB (theory  98.1)
bits for a 1 mV step over 10 V: 14
```

The input range is ±5 V, 10 V in total, so the sine fills it exactly.

The error RMS matches Δ/√12 and the signal-to-quantisation-noise ratio matches 6.02N + 1.76 dB: 50 dB for 8 bits, 74 dB for 12, 98 dB for 16. A 1 mV step over 10 V needs 14 bits. In practice the sensor's own noise is often larger than the quantisation noise, and extra bits then only record the noise more precisely.

::: challenge Apparent motion [easy]
Write `apparent(f, fs)`: the signed apparent frequency of a tone or rotation at f when sampled at fs, folded into (−fs/2, fs/2] (so exactly +fs/2 is kept as +fs/2, and −fs/2 becomes +fs/2), as a plain float; raise `ValueError` if fs is not positive. Then write `wheel_apparent_rpm(rpm, spokes, fps)`: the apparent rotation speed in rpm (negative means backwards) of a wheel with the given number of identical spokes filmed at `fps` frames per second, rounded to 2 decimal places. Finally write `strobe_rates(rpm, max_rate)`: the flash rates (flashes per second) at or below `max_rate` that freeze a single mark on a shaft turning at `rpm`, which are the rotation frequency divided by 1, 2, 3, ... (a flash every 1, 2, 3, ... turns): return the **first 10** such rates (the largest ones that are at or below `max_rate`), in decreasing order, each rounded to 4 decimal places.

```python starter
def apparent(f, fs):
    return float(f)

def wheel_apparent_rpm(rpm, spokes, fps):
    return float(rpm)

def strobe_rates(rpm, max_rate):
    return []

print(apparent(23, 24), wheel_apparent_rpm(300, 12, 24))
```

```python solution
def apparent(f, fs):
    if fs <= 0:
        raise ValueError("the sampling rate must be positive")
    a = f - fs * math.floor(f / fs + 0.5)
    if a <= -fs / 2:
        a += fs
    return float(a)

def wheel_apparent_rpm(rpm, spokes, fps):
    spoke_rate = rpm / 60 * spokes
    return round(apparent(spoke_rate, fps) / spokes * 60, 2)

def strobe_rates(rpm, max_rate):
    f = rpm / 60
    k = max(1, math.ceil(f / max_rate - 1e-12))
    return [round(f / (k + i), 4) for i in range(10)]

print(apparent(23, 24), wheel_apparent_rpm(300, 12, 24))
```

```python test
for _n in ["apparent", "wheel_apparent_rpm", "strobe_rates"]:
    assert _n in dir(), f"Define {_n}."
assert [apparent(_f, 24) for _f in (5, 23, 24, 25, 47, 12, -12, 36)] == [5.0, -1.0, 0.0, 1.0, -1.0, 12.0, 12.0, 12.0], f"Got {[apparent(_f, 24) for _f in (5, 23, 24, 25, 47, 12, -12, 36)]}."
assert type(apparent(23, 24)) is float, "Plain float."
try:
    apparent(5, 0)
    assert False, "fs = 0 should raise ValueError."
except ValueError:
    pass
assert wheel_apparent_rpm(120, 12, 24) == 0.0 and wheel_apparent_rpm(115, 12, 24) == -5.0 and wheel_apparent_rpm(125, 12, 24) == 5.0, "Frozen at one spoke per frame; slightly slower looks backwards."
assert wheel_apparent_rpm(30, 1, 24) == 30.0, "Slow enough to look right."
_s = strobe_rates(1500, 30)
assert len(_s) == 10 and _s[:4] == [25.0, 12.5, 8.3333, 6.25] and all(_a > _b for _a, _b in zip(_s, _s[1:])), f"The first 10 rates: 25 Hz and its submultiples; got {_s}."
assert strobe_rates(1500, 10)[0] == 8.3333, "Only rates at or below the maximum."
"SUCCESS: Subtract the nearest multiple of the sampling rate and the sign says which way the wheel seems to turn."
```

Hint: The apparent frequency is f − fs × round(f / fs); use `math.floor(f/fs + 0.5)` and adjust so the result is never exactly −fs/2. Spokes multiply the effective frequency, so divide the apparent spoke frequency by the number of spokes.
:::

::: challenge Downsampling and quantisation [medium]
Write `decimate(x, factor, average=True)`: reduce a NumPy array by an integer factor, either by averaging each complete block of `factor` samples (dropping any incomplete final block) or, with `average=False`, by keeping every `factor`-th sample starting with the first. Raise `ValueError` if the factor is less than 1. Write `quantise(x, bits, full_scale)`: round each value to the nearest multiple of the step full_scale / 2^bits, then clip to the range −full_scale/2 to +full_scale/2 − step (an ADC's codes stop one step short of the top). Then write `sqnr_db(x, bits, full_scale)`: 10 log₁₀ of the mean square of x over the mean square of the quantisation error, rounded to 1 decimal place.

```python starter
def decimate(x, factor, average=True):
    return np.asarray(x)[::factor]

def quantise(x, bits, full_scale):
    return np.asarray(x, dtype=float)

def sqnr_db(x, bits, full_scale):
    return 0.0

print(decimate(np.arange(10.0), 3), quantise(np.array([0.26, -0.24]), 2, 2.0))
```

```python solution
def decimate(x, factor, average=True):
    if factor < 1:
        raise ValueError("the factor must be at least 1")
    x = np.asarray(x, dtype=float)
    if not average:
        return x[::factor]
    n = len(x) // factor * factor
    return x[:n].reshape(-1, factor).mean(axis=1)

def quantise(x, bits, full_scale):
    step = full_scale / 2 ** bits
    q = np.round(np.asarray(x, dtype=float) / step) * step
    return np.clip(q, -full_scale / 2, full_scale / 2 - step)

def sqnr_db(x, bits, full_scale):
    x = np.asarray(x, dtype=float)
    err = quantise(x, bits, full_scale) - x
    return round(10 * math.log10(np.mean(x ** 2) / np.mean(err ** 2)), 1)

print(decimate(np.arange(10.0), 3), quantise(np.array([0.26, -0.24]), 2, 2.0))
```

```python test
for _n in ["decimate", "quantise", "sqnr_db"]:
    assert _n in dir(), f"Define {_n}."
assert np.allclose(decimate(np.arange(10.0), 3), [1, 4, 7]) and np.allclose(decimate(np.arange(10.0), 3, average=False), [0, 3, 6, 9]), "Block means (incomplete block dropped), or every third sample."
assert np.allclose(decimate(np.array([1.0, 2.0]), 1), [1, 2]), "A factor of 1 changes nothing."
try:
    decimate(np.arange(5.0), 0)
    assert False, "factor 0 should raise ValueError."
except ValueError:
    pass
_t = np.arange(0, 2, 1 / 1000)
_x = np.sin(2 * np.pi * 2 * _t) + 0.5 * np.sin(2 * np.pi * 470 * _t)
_tn = _t[::10]; _ta = _t[:2000].reshape(-1, 10).mean(axis=1)
assert np.abs(decimate(_x, 10, False) - np.sin(2 * np.pi * 2 * _tn)).max() > 0.45, "Naive decimation keeps the aliased interference."
assert np.abs(decimate(_x, 10) - np.sin(2 * np.pi * 2 * _ta)).max() < 0.1, "Block averaging suppresses it."
assert np.allclose(quantise(np.array([0.26, -0.24, 0.9, -1.2]), 2, 2.0), [0.5, 0.0, 0.5, -1.0]), "Step 0.5; codes run from -1 to +0.5."
_s = 5 * np.sin(2 * np.pi * 7 * np.arange(0, 1, 1 / 10000)) * 0.999
assert abs(sqnr_db(_s, 12, 10.0) - (6.02 * 12 + 1.76)) < 1.0 and abs(sqnr_db(_s, 8, 10.0) - (6.02 * 8 + 1.76)) < 1.0, f"About 6 dB per bit; got {sqnr_db(_s, 12, 10.0)} and {sqnr_db(_s, 8, 10.0)}."
"SUCCESS: Average before you discard samples, and count on about 6 dB of signal-to-noise per bit of the converter."
```

Hint: For block averaging, trim to a whole number of blocks and use `reshape(-1, factor).mean(axis=1)`. Quantise with `np.round(x / step) * step`, then `np.clip`.
:::

::: challenge Rebuilding a signal [hard]
Write `sinc_reconstruct(samples, fs, t)`: the Whittaker–Shannon reconstruction Σ x[n] sinc(fs t − n), with samples taken at times n/fs starting from 0, evaluated at times t (a number or an array), returned as a NumPy array. Use array operations (no Python loop over the samples or times). Raise `ValueError` if fs is not positive or there are no samples. Then write `max_interp_error(f_signal, fs, duration=10.0)`: sample sin(2π f_signal t) at fs for the given duration, reconstruct it at 2,001 evenly spaced times over the middle 20% of the record, and return the largest absolute error, as a plain float. Finally write `is_recoverable(freqs, fs)`: True (a plain bool) when every frequency in the list is strictly below fs/2.

```python starter
def sinc_reconstruct(samples, fs, t):
    return np.interp(np.atleast_1d(t), np.arange(len(samples)) / fs, samples)

def max_interp_error(f_signal, fs, duration=10.0):
    return 1.0

def is_recoverable(freqs, fs):
    return True

print(is_recoverable([3, 11], 40), is_recoverable([3, 21], 40))
```

```python solution
def sinc_reconstruct(samples, fs, t):
    x = np.asarray(samples, dtype=float)
    if fs <= 0 or x.size == 0:
        raise ValueError("need samples and a positive rate")
    t = np.atleast_1d(np.asarray(t, dtype=float))
    return (x[None, :] * np.sinc(fs * t[:, None] - np.arange(x.size)[None, :])).sum(axis=1)

def max_interp_error(f_signal, fs, duration=10.0):
    n = np.arange(int(round(duration * fs)))
    x = np.sin(2 * np.pi * f_signal * n / fs)
    t = np.linspace(0.4 * duration, 0.6 * duration, 2001)
    return float(np.abs(sinc_reconstruct(x, fs, t) - np.sin(2 * np.pi * f_signal * t)).max())

def is_recoverable(freqs, fs):
    return bool(all(f < fs / 2 for f in freqs))

print(is_recoverable([3, 11], 40), is_recoverable([3, 21], 40))
```

```python test
import ast as _ast
for _n in ["sinc_reconstruct", "max_interp_error", "is_recoverable"]:
    assert _n in dir(), f"Define {_n}."
for _node in _ast.walk(_ast.parse(_source)):
    if isinstance(_node, _ast.FunctionDef) and _node.name == "sinc_reconstruct":
        assert not any(isinstance(_x, (_ast.For, _ast.While, _ast.ListComp)) for _x in _ast.walk(_node)), "Use array operations in sinc_reconstruct."
_x = np.array([0.0, 1.0, 0.0, -1.0, 0.5])
assert np.allclose(sinc_reconstruct(_x, 4.0, np.arange(5) / 4.0), _x), "Passes through every sample."
assert isinstance(sinc_reconstruct(_x, 4.0, 0.3), np.ndarray), "Returns an array even for a single time."
for _bad in [(_x, 0, 0.1), (np.array([]), 4.0, 0.1)]:
    try:
        sinc_reconstruct(*_bad)
        assert False, "Bad input should raise ValueError."
    except ValueError:
        pass
_e_ok = max_interp_error(11.0, 40.0)
_e_bad = max_interp_error(27.0, 40.0)
assert _e_ok < 0.05 and type(_e_ok) is float, f"Below Nyquist, reconstruction is accurate; got {_e_ok:.4f}."
assert _e_bad > 0.5, f"Above Nyquist, the samples describe a different (aliased) signal; got {_e_bad:.4f}."
assert max_interp_error(11.0, 40.0, duration=40.0) < _e_ok, "A longer record reduces the end effects."
assert is_recoverable([3, 11], 40) is True and is_recoverable([3, 20], 40) is False and is_recoverable([], 40) is True, "Strictly below fs/2."
"SUCCESS: Below the Nyquist frequency the samples hold the whole signal, and sinc pulses rebuild it between them; above it, they describe an impostor."
```

Hint: Broadcast times against sample indices: `np.sinc(fs * t[:, None] - n[None, :])` has one row per time and one column per sample; multiply by the samples and sum each row.
:::

## What you learned

- Sampling at f_s makes f indistinguishable from f + k f_s; the signed apparent frequency f − f_s × (f/f_s rounded to the nearest whole number) can run backwards.
- Spoked wheels and fans are sampled at their spoke-passing frequency: they freeze when it is a multiple of the frame rate, a fact strobes use to measure speed.
- The sampling theorem: a signal with no content at or above f_s/2 is fully determined by its samples, and sinc interpolation rebuilds it between them.
- Downsampling aliases everything above the new Nyquist frequency; filter (even just block-average) before discarding samples.
- An N-bit ADC rounds to steps of R/2ᴺ, adding noise of RMS Δ/√12; each bit adds about 6 dB of signal-to-noise ratio.

The next lesson turns to the discrete side of mathematics: graphs and networks, from conveyor layouts to delivery routes.
